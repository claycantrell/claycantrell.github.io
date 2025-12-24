// UI elements and interactions

// Initialize UI
function initUI() {
    // Exit Button -> Home
    document.getElementById('exit-button').addEventListener('click', () => {
        window.location.href = '/pages/home.html';
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

// Fade out function
function fadeOutToWhite() {
    const overlay = document.getElementById('white-overlay');
    overlay.style.opacity = '1';  // start fading in
    // After the transition, redirect to home.html
    setTimeout(() => {
        window.location.href = '/pages/home.html';
    }, 2000);
}

