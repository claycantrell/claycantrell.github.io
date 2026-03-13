// Input handling (keyboard, mouse, and touch controls)
// Minecraft-style controls: WASD + mouse look

// Mouse look state
let isPointerLocked = false;
let mouseSensitivity = 0.002;
let cameraYaw = 0;    // Horizontal rotation
let cameraPitch = 0;  // Vertical rotation (clamped)

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
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyF', 'KeyV'].includes(event.code)) {
        event.preventDefault();
    }

    // Track active key
    activeKeys.add(event.code);

    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            strafeLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            strafeRight = true;
            break;
        case 'Space':
            isJumping = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = true;
            break;
        case 'KeyV':
            // Toggle first-person view
            isFirstPerson = !isFirstPerson;
            if (typeof showNotification === 'function') {
                showNotification(isFirstPerson ? 'First Person Mode' : 'Third Person Mode');
            }
            // Update crosshair visibility (hide in third person)
            if (typeof updateCrosshairVisibility === 'function') {
                updateCrosshairVisibility();
            }
            break;
        case 'KeyF':
            // Toggle fly mode
            window.isFlying = !window.isFlying;
            if (typeof showNotification === 'function') {
                showNotification(window.isFlying ? 'Fly Mode Enabled - Hold Space to Ascend' : 'Fly Mode Disabled');
            }
            break;
        case 'Enter':
            // Open chat
            if (typeof toggleChat === 'function') {
                toggleChat();
                // Focus the input after opening
                setTimeout(() => {
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput) chatInput.focus();
                }, 50);
            }
            break;
    }
}

// Function to handle key up events to stop character movement
function onKeyUp(event) {
    // We intentionally process keyup events even if chat is focused
    // This ensures that if the user was holding a movement key and then focused chat,
    // releasing the key will stop the movement (preventing stuck keys).

    // Remove from active keys
    activeKeys.delete(event.code);

    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            strafeLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            strafeRight = false;
            break;
        case 'Space':
            isJumping = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = false;
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
// Dual joystick: left = move, right = look/rotate
function createTouchControls() {
    // Prevent default touch behavior on the canvas
    document.body.style.touchAction = 'none';

    // --- Left Joystick (Movement) ---
    const leftStick = document.createElement('div');
    leftStick.id = 'joystick-left';
    leftStick.style.cssText = 'position:fixed;bottom:20px;left:20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);z-index:45;touch-action:none;';
    const leftKnob = document.createElement('div');
    leftKnob.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,0.4);';
    leftStick.appendChild(leftKnob);
    document.body.appendChild(leftStick);

    // --- Right side is just the right half of the screen for look ---
    // No visible joystick — just drag to look

    let leftTouchId = null;
    let leftCenter = { x: 0, y: 0 };
    const JOYSTICK_RADIUS = 50;
    const DEAD_ZONE = 10;

    let rightTouchId = null;
    let rightLastPos = { x: 0, y: 0 };
    const LOOK_SENSITIVITY = 0.004;

    function handleTouchStart(e) {
        // Don't intercept touches on UI elements (chat, buttons)
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'button' || tag === 'input' || tag === 'a' || e.target.closest('#chat-container')) {
            return;
        }

        for (const touch of e.changedTouches) {
            // Check if touch landed on the joystick element
            const rect = leftStick.getBoundingClientRect();
            const onJoystick = touch.clientX >= rect.left && touch.clientX <= rect.right &&
                               touch.clientY >= rect.top && touch.clientY <= rect.bottom;

            if (onJoystick && leftTouchId === null) {
                // Joystick touch
                leftTouchId = touch.identifier;
                leftCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                activeKeys.add('TouchJoystick');
                e.preventDefault();
            } else if (!onJoystick && rightTouchId === null) {
                // Anywhere else — camera look
                rightTouchId = touch.identifier;
                rightLastPos = { x: touch.clientX, y: touch.clientY };
                activeKeys.add('TouchLook');
                e.preventDefault();
            }
        }
    }

    function handleTouchMove(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === leftTouchId) {
                // Movement joystick
                let dx = touch.clientX - leftCenter.x;
                let dy = touch.clientY - leftCenter.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Clamp to radius
                if (dist > JOYSTICK_RADIUS) {
                    dx = (dx / dist) * JOYSTICK_RADIUS;
                    dy = (dy / dist) * JOYSTICK_RADIUS;
                }

                // Move knob visually
                leftKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

                // Apply dead zone
                if (dist < DEAD_ZONE) {
                    moveForward = false;
                    moveBackward = false;
                    strafeLeft = false;
                    strafeRight = false;
                } else {
                    // Normalize
                    const nx = dx / JOYSTICK_RADIUS;
                    const ny = dy / JOYSTICK_RADIUS;

                    moveForward = ny < -0.3;
                    moveBackward = ny > 0.3;
                    strafeLeft = nx < -0.3;
                    strafeRight = nx > 0.3;
                    isSprinting = dist > JOYSTICK_RADIUS * 0.85;
                }
                e.preventDefault();

            } else if (touch.identifier === rightTouchId) {
                // Camera look
                const dx = touch.clientX - rightLastPos.x;
                const dy = touch.clientY - rightLastPos.y;

                cameraYaw -= dx * LOOK_SENSITIVITY;
                cameraPitch -= dy * LOOK_SENSITIVITY;
                cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraPitch));

                rightLastPos = { x: touch.clientX, y: touch.clientY };
                e.preventDefault();
            }
        }
    }

    function handleTouchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === leftTouchId) {
                leftTouchId = null;
                leftKnob.style.transform = 'translate(-50%, -50%)';
                moveForward = false;
                moveBackward = false;
                strafeLeft = false;
                strafeRight = false;
                isSprinting = false;
                activeKeys.delete('TouchJoystick');
            } else if (touch.identifier === rightTouchId) {
                rightTouchId = null;
                activeKeys.delete('TouchLook');
            }
        }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}

// Track active keys to prevent stuck controls
const activeKeys = new Set();

// Function to reset all movement flags (safety mechanism)
function resetMovementFlags() {
    moveForward = false;
    moveBackward = false;
    strafeLeft = false;
    strafeRight = false;
    isJumping = false;
    isSprinting = false;
    // Note: isFirstPerson is NOT reset - it's a view preference, not a movement state
    activeKeys.clear();
}

// Mouse look handlers
function onMouseMove(event) {
    if (!isPointerLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    cameraYaw -= movementX * mouseSensitivity;
    cameraPitch -= movementY * mouseSensitivity;

    // Clamp pitch to prevent camera flipping
    cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraPitch));
}

function onPointerLockChange() {
    isPointerLocked = document.pointerLockElement === document.body ||
                      document.pointerLockElement === renderer.domElement;
}

function requestPointerLock() {
    const element = renderer ? renderer.domElement : document.body;
    element.requestPointerLock();
}

function onCanvasClick(event) {
    // Only lock pointer if not clicking on UI elements
    const chatInput = document.getElementById('chat-input');
    if (document.activeElement === chatInput) return;

    // Don't lock pointer if already locked
    if (document.pointerLockElement) return;

    requestPointerLock();
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

    // Mouse look controls (Minecraft-style)
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('pointerlockchange', onPointerLockChange, false);

    // Click to capture mouse
    if (typeof renderer !== 'undefined' && renderer.domElement) {
        renderer.domElement.addEventListener('click', onCanvasClick, false);
    } else {
        document.body.addEventListener('click', onCanvasClick, false);
    }

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
        if ((moveForward || moveBackward || strafeLeft || strafeRight) && activeKeys.size === 0) {
            // Only reset if we haven't received a key event in a while
            // This prevents false positives during normal gameplay
            resetMovementFlags();
        }
    }, 1000); // Check every second
}

// Make available globally
window.initControls = initControls;
window.resetMovementFlags = resetMovementFlags;
window.activeKeys = activeKeys;

// Expose mouse look state for character movement
window.getCameraYaw = () => cameraYaw;
window.getCameraPitch = () => cameraPitch;
window.isPointerLocked = () => isPointerLocked;
window.setCameraYaw = (yaw) => { cameraYaw = yaw; };

// Movement flags (need to be global for character.js)
window.strafeLeft = false;
window.strafeRight = false;
window.isJumping = false;
window.isSprinting = false;
window.isFlying = false;

