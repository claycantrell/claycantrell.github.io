// Chat system - RuneScape style chat log

let chatOpen = false;
let chatBox, chatToggle, chatMessages, chatInput; // Will be initialized when DOM is ready
const MAX_MESSAGES = 100; // Limit chat history

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

    // Add welcome message
    addSystemMessage('Welcome! Type a message and press Enter to chat.');
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
function sendChatMessage() {
    if (!chatInput || !chatMessages) {
        console.error('Chat elements not available');
        return; // Safety check for Safari
    }
    
    const message = chatInput.value.trim();
    if (message.length === 0) {
        return;
    }

    // Clear input first
    chatInput.value = '';

    // Send to server via multiplayer
    if (typeof sendChatToServer === 'function') {
        const sent = sendChatToServer(message);
        if (sent) {
            // Show own message immediately in chat (optimistic update)
            if (typeof playerId !== 'undefined' && playerId) {
                const playerName = `Player ${playerId.substr(7, 6)}`;
                addChatMessage(playerName, message, true);
            } else {
                // Fallback if playerId not available yet
                addChatMessage('You', message, true);
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

// Add message to chat log
function addChatMessage(playerName, message, isOwnMessage = false) {
    if (!chatMessages) return; // Safety check for Safari
    
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
    if (!chatMessages) return; // Safety check for Safari
    
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
}

