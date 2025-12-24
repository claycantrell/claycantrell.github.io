// UI elements and interactions

// Initialize UI
function initUI() {
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
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    notification.textContent = message;
    notification.style.opacity = '1';
    notificationTimeout = setTimeout(() => {
        notification.style.opacity = '0';
    }, 2000);
}

// Fade out function - navigates to the other map
function fadeOutToWhite() {
    const overlay = document.getElementById('white-overlay');
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

