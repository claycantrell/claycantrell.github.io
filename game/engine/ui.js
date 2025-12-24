// UI elements and interactions

// Cached DOM elements
let notificationEl = null;
let audioIconEl = null;
let whiteOverlayEl = null;
let notificationTimeout = null;

// Cache DOM elements (called once at startup)
function cacheDOMElements() {
    notificationEl = document.getElementById('notification');
    audioIconEl = document.getElementById('audio-icon');
    whiteOverlayEl = document.getElementById('white-overlay');

    // Also store in GAME.dom if available
    if (typeof GAME !== 'undefined' && GAME.dom) {
        GAME.dom.notification = notificationEl;
        GAME.dom.audioIcon = audioIconEl;
        GAME.dom.instructionMessage = document.getElementById('instruction-message');
        GAME.dom.chatInput = document.getElementById('chat-input');
        GAME.dom.chatMessages = document.getElementById('chat-messages');
    }
}

// Initialize UI
function initUI() {
    // Cache DOM elements first
    cacheDOMElements();
    // Exit Button -> Home (relative path for GitHub Pages compatibility)
    document.getElementById('exit-button').addEventListener('click', () => {
        window.location.href = '../pages/home.html';
    });

    // Map Button -> Open map menu
    const mapButton = document.getElementById('map-button');
    if (mapButton) {
        mapButton.addEventListener('click', () => {
            if (typeof toggleMapMenu === 'function') {
                toggleMapMenu();
            }
        });
    }

    // Initialize map menu
    if (typeof initMapMenu === 'function') {
        initMapMenu();
    }

    // Initialize chat system
    if (typeof initChat === 'function') {
        initChat();
    }
}

// Function to show notifications on screen
function showNotification(message) {
    // Use cached element or fall back to getElementById
    const el = notificationEl || document.getElementById('notification');
    if (!el) return;

    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    el.textContent = message;
    el.style.opacity = '1';
    notificationTimeout = setTimeout(() => {
        el.style.opacity = '0';
    }, 2000);
}

// Fade out function - navigates to the other map
function fadeOutToWhite() {
    const overlay = whiteOverlayEl || document.getElementById('white-overlay');
    overlay.style.opacity = '1';  // start fading in

    // Get current map from URL or fallback to grasslands
    const urlParams = new URLSearchParams(window.location.search);
    const currentMap = urlParams.get('map') || 'grasslands';

    // Switch to the other map
    const targetMap = currentMap === 'desert' ? 'grasslands' : 'desert';

    // After the transition, redirect to the other map
    setTimeout(() => {
        window.location.href = window.location.pathname + '?map=' + targetMap;
    }, 2000);
}

// Make available globally
window.initUI = initUI;
window.showNotification = showNotification;
window.fadeOutToWhite = fadeOutToWhite;

