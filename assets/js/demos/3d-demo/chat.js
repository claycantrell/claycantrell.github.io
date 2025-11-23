// Chat system - RuneScape style chat log

let chatOpen = false;
let chatBox, chatToggle, chatMessages, chatInput; // Will be initialized when DOM is ready
const MAX_MESSAGES = 100; // Limit chat history

// Text-to-speech setup (Stephen Hawking style)
let speechSynthesis = window.speechSynthesis;
let speechVoice = null;

// OpenAI API configuration
const OPENAI_API_KEY = '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';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Convert message to medieval language and sanitize
async function convertToMedieval(message, isConversingWithNPC = false) {
    try {
        let systemPrompt = 'You are a mischievous translator converting modern English to Middle English (Chaucer-era, not Shakespeare). Take the user\'s message and translate it into authentic Middle English. IMPORTANT: Translate in first person - if the user says "my name is John", translate as "mine name is John" (first person), NOT "thy name is John" (second person). Preserve the user\'s perspective - they are speaking about themselves. Keep the meaning, but be playful and mischievous in the translation - add a bit of wit, humor, or playful medieval flair. Do not expand or elaborate unnecessarily.\n\nOnly filter truly inappropriate content (explicit sexual content, hate speech, extreme violence). Mild insults, playful banter, and medieval-appropriate language like "fool", "knave", etc. are acceptable. Translate the message unless it contains truly offensive material.\n\nReturn only the Middle English translation in first person. Keep it brief and mischievous. Add no modern note, no framing, no apology.';
        
        // If conversing with NPC, add context that this is a conversation
        if (isConversingWithNPC) {
            systemPrompt = 'You are a wandering scribe of the elder days, skilled in Middle English tongue. A traveler hath spoken to thee in Middle English. Respond to their message as the scribe would, in authentic Middle English — Chaucer-era in flavor. Be mischievous and playful in thy responses - add wit, humor, or playful medieval flair. Keep responses SHORT and concise. Answer their question or respond to their statement naturally, as a mischievous scribe who chronicles tales.\n\nOnly filter truly inappropriate content (explicit sexual content, hate speech, extreme violence). Mild insults, playful banter, and medieval-appropriate language are acceptable. Respond to the message unless it contains truly offensive material.\n\nReturn only the Middle English response from the scribe. Keep it brief and mischievous. Add no modern note, no framing, no apology. Do not translate or convert the message - it is already in Middle English. Simply respond to it as the scribe.';
        }
        
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // GPT-5 Nano - fastest, cheapest version
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 80, // Shorter responses
                temperature: 0.9
            })
        });

        if (!response.ok) {
            // Get detailed error message from API
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || errorMessage;
                console.error('OpenAI API error details:', errorData);
            } catch (e) {
                // If we can't parse error, use status code
            }
            throw new Error(`OpenAI API error: ${errorMessage}`);
        }

        const data = await response.json();
        const medievalMessage = data.choices[0].message.content.trim();
        
        // If empty or just whitespace, return original (or empty if was inappropriate)
        return medievalMessage || '';
    } catch (error) {
        console.error('Error converting to medieval:', error);
        // Fallback: return original message if API fails
        return message;
    }
}

// Initialize TTS voice (robotic/synthetic voice)
function initTTS() {
    if (!speechSynthesis) {
        console.warn('Speech synthesis not supported');
        return;
    }
    
    // Wait for voices to load
    const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        
        // Try to find older/retro voices (80s/90s style)
        // Priority order: older-sounding voices first
        const oldVoiceNames = [
            'microsoft david',      // Windows - older male voice
            'microsoft mark',        // Windows - older male voice  
            'microsoft zira',       // Windows - robotic female
            'karen',                // macOS - older Australian voice
            'victoria',             // macOS - older voice
            'daniel',               // macOS - older British voice
            'alex',                 // macOS - older voice
            'samantha',             // macOS - older voice
            'novox',                // Some systems - retro voice
            'klatt',                // Old synthesizer name
            'dectalk',              // DECtalk synthesizer
            'robot',                // Generic robot voice
            'synthetic'             // Generic synthetic
        ];
        
        // Try to find voices matching old/retro names
        speechVoice = voices.find(voice => {
            const name = voice.name.toLowerCase();
            return oldVoiceNames.some(oldName => name.includes(oldName));
        });
        
        // If no old voice found, prefer male voices (often sound older/robotic)
        if (!speechVoice) {
            speechVoice = voices.find(voice => 
                voice.name.toLowerCase().includes('david') ||
                voice.name.toLowerCase().includes('mark') ||
                voice.name.toLowerCase().includes('daniel') ||
                voice.name.toLowerCase().includes('male')
            );
        }
        
        // Last resort: use first available voice
        if (!speechVoice && voices.length > 0) {
            speechVoice = voices[0];
        }
        
        // Configure voice settings for robotic/Hawking-like sound
        if (speechVoice) {
            console.log('Using TTS voice:', speechVoice.name);
        }
    };
    
    // Load voices (some browsers need this)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices(); // Try immediately
}

// Initialize chat (Safari-compatible - gets elements when called)
function initChat() {
    // Get DOM elements (Safari needs this to happen after DOM is ready)
    chatBox = document.getElementById('chat-box');
    chatToggle = document.getElementById('chat-toggle');
    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    
    // Safety check for Safari
    if (!chatBox || !chatToggle || !chatMessages || !chatInput) {
        console.error('Chat elements not found - retrying...');
        setTimeout(initChat, 100);
        return;
    }
    
    // Toggle chat open/close
    chatToggle.addEventListener('click', () => {
        toggleChat();
    });

    // Handle Enter key to send message (Safari-compatible)
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            sendChatMessage();
        }
    });

    // Auto-focus input when chat opens
    chatToggle.addEventListener('click', () => {
        if (chatOpen) {
            setTimeout(() => {
                if (chatInput) {
                    chatInput.focus();
                }
            }, 100);
        }
    });

    // Add welcome message (medieval style)
    addSystemMessage('Hark! Welcome, good traveler. Type thy message and press Enter to speak with thy fellow adventurers.');
    
    // Initialize text-to-speech
    initTTS();
}

// Toggle chat open/closed
function toggleChat() {
    if (!chatBox || !chatToggle || !chatInput) return; // Safety check
    
    chatOpen = !chatOpen;
    if (chatOpen) {
        chatBox.classList.remove('chat-closed');
        chatBox.classList.add('chat-open');
        chatToggle.textContent = 'Close';
    } else {
        chatBox.classList.remove('chat-open');
        chatBox.classList.add('chat-closed');
        chatToggle.textContent = 'Chat';
        chatInput.blur();
    }
}

// Send chat message
async function sendChatMessage() {
    if (!chatInput || !chatMessages) {
        console.error('Chat elements not available');
        return; // Safety check for Safari
    }
    
    const originalMessage = chatInput.value.trim();
    if (originalMessage.length === 0) {
        return;
    }

    // Clear input first
    chatInput.value = '';
    
    // Check if player is near NPC (conversing with scribe)
    const isNearNPC = typeof isPlayerNearNPC === 'function' && isPlayerNearNPC();
    
    // Show "converting..." message
    const convertingMsg = addSystemMessage(isNearNPC ? 'The scribe listeneth...' : 'Converting to medieval tongue...');

    // ALWAYS convert player's message with isConversingWithNPC = false (just translate, don't respond)
    // The NPC response will be handled separately
    const medievalMessage = await convertToMedieval(originalMessage, false);
    
    // Remove converting message
    if (convertingMsg && convertingMsg.parentNode) {
        convertingMsg.parentNode.removeChild(convertingMsg);
    }
    
    // If message was completely filtered out, show error
    if (!medievalMessage || medievalMessage.length === 0) {
        addSystemMessage('Thy message was deemed unworthy and hath been cast aside.');
        return;
    }

        // If conversing with NPC, get NPC response
        if (isNearNPC) {
            // Show player's message (but don't speak yet - we'll control when)
            if (typeof playerId !== 'undefined' && playerId) {
                const playerName = `Player ${playerId.substr(7, 6)}`;
                addChatMessage(playerName, medievalMessage, true, false); // Don't speak yet
            } else {
                addChatMessage('You', medievalMessage, true, false); // Don't speak yet
            }
            
            // Get NPC response - pass the medieval version of player's message to scribe
            // The scribe should respond to what the player said in medieval language
            const npcResponse = await convertToMedieval(medievalMessage, true);
            if (npcResponse && npcResponse.length > 0) {
                // Speak player's message first, then when done, show and speak NPC response
                speakMessage(medievalMessage, true, () => {
                    // Player's message finished speaking, now show and speak NPC response
                    addChatMessage('Wandering Scribe', npcResponse, false, true);
                });
            } else {
                // If no NPC response, just speak player's message
                speakMessage(medievalMessage, true);
            }
        } else {
        // Normal multiplayer chat
        // Send medieval version to server via multiplayer
        if (typeof sendChatToServer === 'function') {
            const sent = sendChatToServer(medievalMessage);
            if (sent) {
                // Show own message immediately in chat (optimistic update)
                if (typeof playerId !== 'undefined' && playerId) {
                    const playerName = `Player ${playerId.substr(7, 6)}`;
                    addChatMessage(playerName, medievalMessage, true);
                } else {
                    // Fallback if playerId not available yet
                    addChatMessage('You', medievalMessage, true);
                }
            } else {
                console.warn('Failed to send chat message to server');
            }
            // If sendChatToServer returns false, it already showed an error message
        } else {
            // Fallback: show error if multiplayer not available
            addSystemMessage('Chat unavailable - multiplayer not loaded');
            console.error('sendChatToServer function not available');
        }
    }
}

// Track if TTS is currently speaking
let isTTSSpeaking = false;
let ttsQueue = []; // Queue for messages waiting to be spoken

// Speak message using text-to-speech (Stephen Hawking style)
function speakMessage(message, isOwnMessage = false, onComplete = null) {
    if (!speechSynthesis || !speechVoice) {
        if (onComplete) onComplete();
        return;
    }
    
    // If already speaking, queue this message
    if (isTTSSpeaking) {
        ttsQueue.push({ message, isOwnMessage, onComplete });
        return;
    }
    
    // Mark as speaking
    isTTSSpeaking = true;
    
    // Create utterance with robotic settings
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.voice = speechVoice;
    utterance.rate = 0.8; // Slightly slower (Hawking's voice was slower)
    utterance.pitch = 0.5; // Lower pitch (more robotic)
    utterance.volume = 0.7; // Moderate volume
    
    // When speech ends, process next in queue
    utterance.onend = () => {
        isTTSSpeaking = false;
        if (onComplete) onComplete();
        
        // Process next message in queue
        if (ttsQueue.length > 0) {
            const next = ttsQueue.shift();
            speakMessage(next.message, next.isOwnMessage, next.onComplete);
        }
    };
    
    // Handle errors
    utterance.onerror = () => {
        isTTSSpeaking = false;
        if (onComplete) onComplete();
        
        // Process next in queue even on error
        if (ttsQueue.length > 0) {
            const next = ttsQueue.shift();
            speakMessage(next.message, next.isOwnMessage, next.onComplete);
        }
    };
    
    // Speak the message
    speechSynthesis.speak(utterance);
}

// Add message to chat log
function addChatMessage(playerName, message, isOwnMessage = false, shouldSpeak = true) {
    if (!chatMessages) return; // Safety check for Safari
    
    // Speak only the message (not the player name) using TTS (Stephen Hawking style)
    if (shouldSpeak) {
        speakMessage(message, isOwnMessage);
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = playerName + ': ';
    
    const textSpan = document.createElement('span');
    textSpan.className = 'message-text';
    textSpan.textContent = message;
    
    messageDiv.appendChild(nameSpan);
    messageDiv.appendChild(textSpan);
    
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom (Safari-compatible)
    setTimeout(() => {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }, 0);
    
    // Limit message history
    while (chatMessages.children.length > MAX_MESSAGES) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
    
    // Auto-open chat if closed and it's not your own message
    if (!chatOpen && !isOwnMessage) {
        toggleChat();
        // Auto-close after 3 seconds
        setTimeout(() => {
            if (chatOpen) {
                toggleChat();
            }
        }, 3000);
    }
}

// Add system message
function addSystemMessage(message) {
    if (!chatMessages) return null; // Safety check for Safari
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    
    const systemSpan = document.createElement('span');
    systemSpan.className = 'system-message';
    systemSpan.textContent = message;
    
    messageDiv.appendChild(systemSpan);
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom (Safari-compatible)
    setTimeout(() => {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }, 0);
    
    // Limit message history
    while (chatMessages.children.length > MAX_MESSAGES) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
    
    // Return the message div so it can be removed if needed
    return messageDiv;
}

