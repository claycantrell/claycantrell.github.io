// Chat system - RuneScape style chat log

let chatOpen = false;
let chatBox, chatToggle, chatMessages, chatInput; // Will be initialized when DOM is ready
const MAX_MESSAGES = 100; // Limit chat history

// Conversation history for NPC (stores recent messages for context)
let npcConversationHistory = [];
const MAX_NPC_HISTORY = 10; // Keep last 10 messages (5 exchanges) for context

// Clear NPC conversation history (called when player leaves NPC area)
function clearNPCConversationHistory() {
    npcConversationHistory = [];
}

// Rate limiting for GPT API calls
const RATE_LIMIT = {
    requestsPerMinute: 30,      // Max 30 requests per minute (more generous)
    requestsPerHour: 200,        // Max 200 requests per hour (more generous)
    windowSizeMinutes: 1,        // 1 minute sliding window
    windowSizeHours: 1            // 1 hour sliding window
};

// Generate a simple browser fingerprint (makes it harder to bypass by switching browsers)
function generateBrowserFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvasHash: canvas.toDataURL().substring(0, 50) // Simple hash
    };
    
    // Create a simple hash from fingerprint
    const hash = btoa(JSON.stringify(fingerprint)).substring(0, 16);
    return hash;
}

// Get or create browser fingerprint ID
function getBrowserFingerprint() {
    let fingerprint = localStorage.getItem('browser_fingerprint');
    if (!fingerprint) {
        fingerprint = generateBrowserFingerprint();
        localStorage.setItem('browser_fingerprint', fingerprint);
    }
    return fingerprint;
}

// Rate limit tracking (stored in localStorage with fingerprint - persists across sessions)
function getRateLimitData() {
    const fingerprint = getBrowserFingerprint();
    const stored = localStorage.getItem(`gpt_rate_limit_${fingerprint}`);
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        requests: [], // Array of timestamps
        lastWarning: null,
        fingerprint: fingerprint
    };
}

function saveRateLimitData(data) {
    const fingerprint = getBrowserFingerprint();
    localStorage.setItem(`gpt_rate_limit_${fingerprint}`, JSON.stringify(data));
}

// Check if request is allowed (sophisticated sliding window rate limiting)
function checkRateLimit() {
    const now = Date.now();
    const data = getRateLimitData();
    
    // Clean old requests outside the time windows
    const oneHourAgo = now - (RATE_LIMIT.windowSizeHours * 60 * 60 * 1000);
    const oneMinuteAgo = now - (RATE_LIMIT.windowSizeMinutes * 60 * 1000);
    
    // Remove requests older than 1 hour
    data.requests = data.requests.filter(timestamp => timestamp > oneHourAgo);
    
    // Count requests in last minute
    const requestsLastMinute = data.requests.filter(timestamp => timestamp > oneMinuteAgo).length;
    
    // Count requests in last hour
    const requestsLastHour = data.requests.length;
    
    // Check limits
    if (requestsLastMinute >= RATE_LIMIT.requestsPerMinute) {
        const timeUntilNext = Math.ceil((data.requests[data.requests.length - requestsLastMinute] + (RATE_LIMIT.windowSizeMinutes * 60 * 1000) - now) / 1000);
        return {
            allowed: false,
            reason: 'minute',
            retryAfter: timeUntilNext,
            message: `Thou hast sent too many messages. Please wait ${timeUntilNext} second${timeUntilNext !== 1 ? 's' : ''} before trying again.`
        };
    }
    
    if (requestsLastHour >= RATE_LIMIT.requestsPerHour) {
        const timeUntilNext = Math.ceil((data.requests[0] + (RATE_LIMIT.windowSizeHours * 60 * 60 * 1000) - now) / 1000 / 60);
        return {
            allowed: false,
            reason: 'hour',
            retryAfter: timeUntilNext,
            message: `Thou hast exceeded the hourly message limit. Please wait ${timeUntilNext} minute${timeUntilNext !== 1 ? 's' : ''} before trying again.`
        };
    }
    
    // Request allowed - record it
    data.requests.push(now);
    saveRateLimitData(data);
    
    return { allowed: true };
}

// Text-to-speech setup (Stephen Hawking style)
let speechSynthesis = window.speechSynthesis;
let speechVoice = null;

// OpenAI API configuration - uses centralized CONFIG
// API key is hidden on server, rate limiting is IP-based
function getApiUrl(endpoint) {
    if (typeof CONFIG !== 'undefined' && CONFIG.api) {
        return CONFIG.api[endpoint];
    }
    // Fallback if CONFIG not loaded yet
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocal ? 'http://localhost:8080' : `${window.location.protocol}//${window.location.host}`;
    return `${base}/api/${endpoint}`;
}

// Session token for API authentication
let sessionToken = null;

// Fetch session token from server
async function getSessionToken() {
    if (sessionToken) return sessionToken;

    try {
        const response = await fetch(getApiUrl('token'));
        if (response.ok) {
            const data = await response.json();
            sessionToken = data.token;
            return sessionToken;
        }
    } catch (error) {
        // Silently fail - chat may not work but game continues
    }
    return null;
}

// Convert message to medieval language and sanitize
async function convertToMedieval(message, isConversingWithNPC = false) {
    try {
        let systemPrompt = 'You are a translator converting modern English to archaic Old English/Early Middle English (similar to Beowulf or very early Chaucer). Take the user\'s message and translate it into this ancient, formal, and archaic tongue. Use words like "thou", "thee", "thy", "hath", "dost", "art", "verily", "anon", "hither", "thither", "whence".\n\nIMPORTANT: Translate in first person - if the user says "my name is John", translate as "mine name is John" (first person), NOT "thy name is John" (second person). Preserve the user\'s perspective - they are speaking about themselves. Keep the meaning clear but use very archaic vocabulary and sentence structure.\n\nIf the message contains truly inappropriate content (explicit sexual content, hate speech, extreme violence), return ONLY an empty string. Do not comment on it, do not explain why, do not say anything about the content being inappropriate. Just return an empty string. Mild insults and playful banter are acceptable and should be translated into archaic insults (e.g., "base-born cur", "villain").\n\nReturn only the archaic translation in first person. Keep it brief. Add no modern note, no framing, no apology. If the content is inappropriate, return nothing (empty string).';
        
        // Build messages array - include conversation history if talking to NPC
        const messages = [
            {
                role: 'system',
                content: systemPrompt
            }
        ];
        
        // If conversing with NPC, add context that this is a conversation and include history
        if (isConversingWithNPC) {
            systemPrompt = 'You are a mischevious ancient scribe of the elder days, speaking in a very archaic Old English/Early Middle English tongue (pre-Chaucer). A traveler hath spoken to thee. Respond to their message as the scribe would, in this ancient and formal tongue. Use words like "thou", "thee", "thy", "hath", "dost", "art", "verily", "anon".\n\nKeep responses SHORT, cryptic, wise, and mischevious. Answer their question or respond to their statement naturally, as an ancient keeper of forgotten lore. Remember the context of your recent conversation with this traveler.\n\nIf the message contains truly inappropriate content (explicit sexual content, hate speech, extreme violence), return ONLY an empty string. Do not comment on it, do not explain why, do not say anything about the content being inappropriate. Just return an empty string. Mild insults are acceptable and should be met with dignified silence or a wise rebuke.\n\nReturn only the ancient response from the scribe. Keep it brief. Add no modern note, no framing, no apology. Do not translate or convert the message - simply respond to it as the ancient scribe. If the content is inappropriate, return nothing (empty string).';
            
            // Update system prompt
            messages[0].content = systemPrompt;
            
            // Add conversation history (last MAX_NPC_HISTORY messages)
            // History alternates: user message, assistant response, user message, etc.
            if (npcConversationHistory.length > 0) {
                // Add recent conversation history before the current message
                const recentHistory = npcConversationHistory.slice(-MAX_NPC_HISTORY);
                messages.push(...recentHistory);
            }
        }
        
        // Add current message
        messages.push({
            role: 'user',
            content: message
        });

        // Get session token for authentication
        const token = await getSessionToken();
        if (!token) {
            throw new Error('Could not get session token');
        }

        const response = await fetch(getApiUrl('chat'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-Token': token
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: messages,
                max_tokens: 80,
                temperature: 0.9
            })
        });

        if (!response.ok) {
            // Get detailed error message from API
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || errorMessage;

                // Handle rate limit and auth errors
                if (response.status === 429 || response.status === 401) {
                    throw new Error(errorMessage);
                }
            } catch (e) {
                if (e.message && !e.message.startsWith('HTTP')) {
                    throw e;
                }
            }
            throw new Error(`API error: ${errorMessage}`);
        }

        const data = await response.json();
        const medievalMessage = data.choices[0].message.content.trim();
        
        // If empty or just whitespace, return original (or empty if was inappropriate)
        return medievalMessage || '';
    } catch (error) {
        // Fallback: return original message if API fails
        return message;
    }
}

// Initialize TTS voice (robotic/synthetic voice)
function initTTS() {
    if (!speechSynthesis) {
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
        
        // Voice is ready
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

// Shadow state tracking
let shadowsEnabled = true;
const originalMaterials = new WeakMap(); // Store original materials

// Toggle shadow mapping
function toggleShadows() {
    if (!GAME || !GAME.renderer || !GAME.lighting || !GAME.lighting.directional) {
        addSystemMessage('Shadow system not initialized.');
        return;
    }
    
    shadowsEnabled = !shadowsEnabled;
    
    // Toggle renderer shadow mapping
    GAME.renderer.shadowMap.enabled = shadowsEnabled;
    
    // Toggle directional light shadow casting
    GAME.lighting.directional.castShadow = shadowsEnabled;
    
    // Toggle shadows and materials on all objects in scene
    GAME.scene.traverse((object) => {
        if (object.isMesh && object.material) {
            const isTerrain = object.userData?.isTerrain || 
                            object.userData?.isChunk ||
                            (object.material && object.material.vertexColors);
            
            if (shadowsEnabled) {
                // Enable shadows - restore Lambert materials
                if (originalMaterials.has(object)) {
                    const originalMat = originalMaterials.get(object);
                    object.material = originalMat;
                    originalMaterials.delete(object);
                }
                
                if (isTerrain) {
                    object.receiveShadow = true;
                } else {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            } else {
                // Disable shadows - switch to Basic materials (no lighting response)
                if (!originalMaterials.has(object)) {
                    originalMaterials.set(object, object.material);
                }
                
                const currentMat = object.material;
                let basicMat;
                
                if (currentMat.vertexColors) {
                    // Terrain/chunks - preserve vertex colors
                    basicMat = new THREE.MeshBasicMaterial({
                        vertexColors: true
                    });
                } else {
                    // Other objects - preserve color and side property (for shrubs)
                    basicMat = new THREE.MeshBasicMaterial({
                        color: currentMat.color || 0xffffff,
                        side: currentMat.side !== undefined ? currentMat.side : THREE.FrontSide
                    });
                }
                
                object.material = basicMat;
                object.castShadow = false;
                object.receiveShadow = false;
            }
        }
    });
    
    addSystemMessage(`Shadows ${shadowsEnabled ? 'enabled' : 'disabled'}.`);
}

// Shadow quality settings
const SHADOW_TYPES = [
    { type: THREE.BasicShadowMap, name: 'Basic (sharpest)' },
    { type: THREE.PCFShadowMap, name: 'PCF (sharp)' },
    { type: THREE.PCFSoftShadowMap, name: 'PCF Soft (smooth)' }
];
let currentShadowTypeIndex = 0; // Default to Basic (sharpest)

const SHADOW_RESOLUTIONS = [2048, 1024, 4096];
let currentShadowResIndex = 0; // Default to 2048

// Cycle shadow map type
function cycleShadowType() {
    if (!GAME || !GAME.renderer) {
        addSystemMessage('Renderer not initialized.');
        return;
    }

    currentShadowTypeIndex = (currentShadowTypeIndex + 1) % SHADOW_TYPES.length;
    const shadowType = SHADOW_TYPES[currentShadowTypeIndex];
    GAME.renderer.shadowMap.type = shadowType.type;
    GAME.renderer.shadowMap.needsUpdate = true;

    // Need to update all materials for shadow type change to take effect
    GAME.scene.traverse((object) => {
        if (object.isMesh && object.material) {
            object.material.needsUpdate = true;
        }
    });

    addSystemMessage(`Shadow type: ${shadowType.name}`);
}

// Cycle shadow map resolution
function cycleShadowResolution() {
    if (!GAME || !GAME.lighting || !GAME.lighting.directional) {
        addSystemMessage('Lighting not initialized.');
        return;
    }

    currentShadowResIndex = (currentShadowResIndex + 1) % SHADOW_RESOLUTIONS.length;
    const res = SHADOW_RESOLUTIONS[currentShadowResIndex];

    GAME.lighting.directional.shadow.mapSize.width = res;
    GAME.lighting.directional.shadow.mapSize.height = res;

    // Force shadow map to regenerate
    if (GAME.lighting.directional.shadow.map) {
        GAME.lighting.directional.shadow.map.dispose();
        GAME.lighting.directional.shadow.map = null;
    }

    addSystemMessage(`Shadow resolution: ${res}x${res}`);
}

// Shadow update rate options (in ms)
const SHADOW_RATES = [
    { interval: 50, name: '20/sec' },
    { interval: 100, name: '10/sec' },
    { interval: 33, name: '30/sec' }
];
let currentShadowRateIndex = 0; // Default to 50ms (20/sec)

// Cycle shadow update rate
function cycleShadowRate() {
    currentShadowRateIndex = (currentShadowRateIndex + 1) % SHADOW_RATES.length;
    const rate = SHADOW_RATES[currentShadowRateIndex];

    // Update the interval in game.js (it's a window global)
    window.shadowUpdateInterval = rate.interval;

    addSystemMessage(`Shadow update rate: ${rate.name}`);
}

// Handle chat commands (slash commands)
function handleChatCommand(command) {
    const cmd = command.toLowerCase().trim();
    const args = cmd.split(' ').slice(1);
    const baseCmd = cmd.split(' ')[0];

    switch (baseCmd) {
        case '/help':
            addSystemMessage('=== COMMANDS ===');
            addSystemMessage('/help - Show this help');
            addSystemMessage('/pos - Show current position');
            addSystemMessage('/shadows - Toggle shadow mapping');
            addSystemMessage('/shadowtype - Cycle shadow quality (Basic/PCF/Soft)');
            addSystemMessage('/shadowres - Cycle shadow resolution (1024/2048/4096)');
            addSystemMessage('/shadowrate - Cycle shadow update rate (5/2/1 per sec)');
            addSystemMessage('/pixelation - Toggle pixelation effect');
            addSystemMessage('/fps - Toggle reduced frame rate (20 FPS)');
            return true;

        case '/pos':
            if (typeof character !== 'undefined' && character) {
                const x = character.position.x.toFixed(0);
                const y = character.position.y.toFixed(0);
                const z = character.position.z.toFixed(0);
                addSystemMessage(`Position: X=${x}, Y=${y}, Z=${z}`);
            } else {
                addSystemMessage('Character not loaded.');
            }
            return true;

        case '/shadows':
            toggleShadows();
            return true;

        case '/shadowtype':
            cycleShadowType();
            return true;

        case '/shadowres':
            cycleShadowResolution();
            return true;

        case '/shadowrate':
            cycleShadowRate();
            return true;

        case '/pixelation':
            if (typeof togglePixelation === 'function') {
                const enabled = togglePixelation();
                addSystemMessage(`Pixelation ${enabled ? 'enabled' : 'disabled'}.`);
            } else {
                addSystemMessage('Pixelation system not available.');
            }
            return true;

        case '/fps':
            if (typeof toggleReducedFrameRate === 'function') {
                const enabled = toggleReducedFrameRate();
                addSystemMessage(`Reduced frame rate ${enabled ? 'enabled (20 FPS)' : 'disabled (full FPS)'}.`);
            } else {
                addSystemMessage('Frame rate system not available.');
            }
            return true;

        default:
            if (cmd.startsWith('/')) {
                addSystemMessage(`Unknown command: ${baseCmd}. Type /help for commands.`);
                return true;
            }
            return false;
    }
}

// Send chat message
async function sendChatMessage() {
    if (!chatInput || !chatMessages) {
        return; // Safety check for Safari
    }

    const originalMessage = chatInput.value.trim();
    if (originalMessage.length === 0) {
        return;
    }

    // Clear input first
    chatInput.value = '';

    // Check for commands first
    if (originalMessage.startsWith('/')) {
        handleChatCommand(originalMessage);
        return;
    }
    
    // Check rate limit before processing
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
        addSystemMessage(rateLimitCheck.message);
        return;
    }
    
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
            
            // Add player's message to conversation history
            npcConversationHistory.push({
                role: 'user',
                content: medievalMessage
            });
            
            // Trim history if it exceeds max size
            if (npcConversationHistory.length > MAX_NPC_HISTORY) {
                npcConversationHistory = npcConversationHistory.slice(-MAX_NPC_HISTORY);
            }
            
            // Get NPC response - pass the medieval version of player's message to scribe
            // The scribe should respond to what the player said in medieval language
            // Check rate limit again for NPC response (counts as separate API call)
            const npcRateLimitCheck = checkRateLimit();
            let npcResponse = null;
            if (npcRateLimitCheck.allowed) {
                npcResponse = await convertToMedieval(medievalMessage, true);
            } else {
                // If rate limited, still show player message but skip NPC response
                addSystemMessage('The scribe is too busy to respond at this moment. Try again shortly.');
            }
            if (npcResponse && npcResponse.length > 0) {
                // Add NPC response to conversation history
                npcConversationHistory.push({
                    role: 'assistant',
                    content: npcResponse
                });
                
                // Trim history if it exceeds max size
                if (npcConversationHistory.length > MAX_NPC_HISTORY) {
                    npcConversationHistory = npcConversationHistory.slice(-MAX_NPC_HISTORY);
                }
                
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
            }
            // If sendChatToServer returns false, it already showed an error message
        } else {
            // Fallback: show error if multiplayer not available
            addSystemMessage('Chat unavailable - multiplayer not loaded');
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


// Make available globally
window.initChat = initChat;
window.addChatMessage = addChatMessage;
