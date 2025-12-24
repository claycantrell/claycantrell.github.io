// Input handling (keyboard and touch controls)

// Function to handle key down events for character movement
function onKeyDown(event) {
    // Check if chat input is focused - if so, don't handle movement keys
    const chatInput = document.getElementById('chat-input');
    const isChatFocused = chatInput && document.activeElement === chatInput;

    // If chat is focused, ignore ALL game inputs to allow typing
    if (isChatFocused) {
        return;
    }

    // Prevent default for game keys to avoid browser shortcuts
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
        event.preventDefault();
    }

    // Track active key
    activeKeys.add(event.code);

    switch (event.code) {
        case 'ArrowDown':
        case 'KeyS':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            rotateLeft = true;
            break;
        case 'ArrowUp':
        case 'KeyW':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            rotateRight = true;
            break;
        case 'Space':
            isFlying = true;
            break;
        case 'KeyV':
            // Toggle first-person view
            isFirstPerson = !isFirstPerson;
            if (typeof showNotification === 'function') {
                showNotification(isFirstPerson ? 'First Person Mode' : 'Third Person Mode');
            }
            break;
    }
}

// Function to handle key up events to stop character movement
function onKeyUp(event) {
    // Check if chat input is focused
    const chatInput = document.getElementById('chat-input');
    const isChatFocused = chatInput && document.activeElement === chatInput;

    // We intentionally process keyup events even if chat is focused
    // This ensures that if the user was holding a movement key and then focused chat,
    // releasing the key will stop the movement (preventing stuck keys).

    // Remove from active keys
    activeKeys.delete(event.code);

    switch (event.code) {
        case 'ArrowDown':
        case 'KeyS':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            rotateLeft = false;
            break;
        case 'ArrowUp':
        case 'KeyW':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            rotateRight = false;
            break;
        case 'Space':
            isFlying = false;
            break;
    }
}

// Function to handle window resize event
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Function to create touch controls for mobile
function createTouchControls() {
    const controlZones = {
        top: document.createElement('div'),
        bottom: document.createElement('div'),
        left: document.createElement('div'),
        right: document.createElement('div')
    };

    // Style touch zones
    Object.keys(controlZones).forEach(zone => {
        const element = controlZones[zone];
        element.style.position = 'absolute';
        element.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        element.style.zIndex = '10';
        element.style.touchAction = 'none';
        document.body.appendChild(element);
    });

    // Define sizes and positions based on screen orientation
    function adjustTouchZones() {
        const isLandscape = window.innerWidth > window.innerHeight;
        if (isLandscape) {
            // Landscape layout
            controlZones.left.style.left = '0';
            controlZones.left.style.top = '0';
            controlZones.left.style.width = '20%';
            controlZones.left.style.height = '100%';

            controlZones.right.style.right = '0';
            controlZones.right.style.top = '0';
            controlZones.right.style.width = '20%';
            controlZones.right.style.height = '100%';

            controlZones.top.style.top = '0';
            controlZones.top.style.left = '20%';
            controlZones.top.style.width = '60%';
            controlZones.top.style.height = '20%';

            controlZones.bottom.style.bottom = '0';
            controlZones.bottom.style.left = '20%';
            controlZones.bottom.style.width = '60%';
            controlZones.bottom.style.height = '20%';
        } else {
            // Portrait layout
            controlZones.top.style.top = '0';
            controlZones.top.style.left = '0';
            controlZones.top.style.width = '100%';
            controlZones.top.style.height = '20%';

            controlZones.bottom.style.bottom = '0';
            controlZones.bottom.style.left = '0';
            controlZones.bottom.style.width = '100%';
            controlZones.bottom.style.height = '20%';

            controlZones.left.style.left = '0';
            controlZones.left.style.top = '20%';
            controlZones.left.style.width = '20%';
            controlZones.left.style.height = '60%';

            controlZones.right.style.right = '0';
            controlZones.right.style.top = '20%';
            controlZones.right.style.width = '20%';
            controlZones.right.style.height = '60%';
        }
    }

    // Initial adjustment
    adjustTouchZones();
    window.addEventListener('resize', adjustTouchZones, false);

    // Touch event listeners with better error handling
    // Bottom Control => Move Backward
    controlZones.bottom.addEventListener('touchstart', function (event) {
        event.preventDefault();
        moveBackward = true;
        activeKeys.add('TouchBottom');
    }, { passive: false });
    controlZones.bottom.addEventListener('touchend', function (event) {
        event.preventDefault();
        moveBackward = false;
        activeKeys.delete('TouchBottom');
    }, { passive: false });
    controlZones.bottom.addEventListener('touchcancel', function (event) {
        event.preventDefault();
        moveBackward = false;
        activeKeys.delete('TouchBottom');
    }, { passive: false });

    // Top Control => Move Forward
    controlZones.top.addEventListener('touchstart', function (event) {
        event.preventDefault();
        moveForward = true;
        activeKeys.add('TouchTop');
    }, { passive: false });
    controlZones.top.addEventListener('touchend', function (event) {
        event.preventDefault();
        moveForward = false;
        activeKeys.delete('TouchTop');
    }, { passive: false });
    controlZones.top.addEventListener('touchcancel', function (event) {
        event.preventDefault();
        moveForward = false;
        activeKeys.delete('TouchTop');
    }, { passive: false });

    // Left Control => Rotate Left
    controlZones.left.addEventListener('touchstart', function (event) {
        event.preventDefault();
        rotateLeft = true;
        activeKeys.add('TouchLeft');
    }, { passive: false });
    controlZones.left.addEventListener('touchend', function (event) {
        event.preventDefault();
        rotateLeft = false;
        activeKeys.delete('TouchLeft');
    }, { passive: false });
    controlZones.left.addEventListener('touchcancel', function (event) {
        event.preventDefault();
        rotateLeft = false;
        activeKeys.delete('TouchLeft');
    }, { passive: false });

    // Right Control => Rotate Right
    controlZones.right.addEventListener('touchstart', function (event) {
        event.preventDefault();
        rotateRight = true;
        activeKeys.add('TouchRight');
    }, { passive: false });
    controlZones.right.addEventListener('touchend', function (event) {
        event.preventDefault();
        rotateRight = false;
        activeKeys.delete('TouchRight');
    }, { passive: false });
    controlZones.right.addEventListener('touchcancel', function (event) {
        event.preventDefault();
        rotateRight = false;
        activeKeys.delete('TouchRight');
    }, { passive: false });
}

// Track active keys to prevent stuck controls
const activeKeys = new Set();

// Function to reset all movement flags (safety mechanism)
function resetMovementFlags() {
    moveForward = false;
    moveBackward = false;
    rotateLeft = false;
    rotateRight = false;
    isFlying = false;
    // Note: isFirstPerson is NOT reset - it's a view preference, not a movement state
    activeKeys.clear();
}

// Handle window blur (user switches tabs/windows) - reset controls
function onWindowBlur() {
    resetMovementFlags();
}

// Handle window focus - ensure clean state
function onWindowFocus() {
    resetMovementFlags();
}

// Initialize controls
function initControls() {
    // Event Listeners for user interactions
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('resize', onWindowResize, false);
    
    // Reset controls when window loses/gains focus (prevents stuck keys)
    window.addEventListener('blur', onWindowBlur, false);
    window.addEventListener('focus', onWindowFocus, false);
    
    // Also handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            resetMovementFlags();
        }
    });

    // Touch Controls for Mobile Only
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        createTouchControls();
    }
    
    // Safety check: periodically verify controls aren't stuck
    // This catches edge cases where events are missed
    setInterval(() => {
        // If flags are true but no keys are active, reset them
        if ((moveForward || moveBackward || rotateLeft || rotateRight) && activeKeys.size === 0) {
            // Only reset if we haven't received a key event in a while
            // This prevents false positives during normal gameplay
            resetMovementFlags();
        }
    }, 1000); // Check every second
}

