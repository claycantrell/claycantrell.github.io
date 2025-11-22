// Input handling (keyboard and touch controls)

// Function to handle key down events for character movement
function onKeyDown(event) {
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
    }
}

// Function to handle key up events to stop character movement
function onKeyUp(event) {
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

    // Touch event listeners
    // Bottom Control => Move Backward
    controlZones.bottom.addEventListener('touchstart', function (event) {
        event.preventDefault();
        moveBackward = true;
    }, { passive: false });
    controlZones.bottom.addEventListener('touchend', function (event) {
        event.preventDefault();
        moveBackward = false;
    }, { passive: false });

    // Top Control => Move Forward
    controlZones.top.addEventListener('touchstart', function (event) {
        event.preventDefault();
        moveForward = true;
    }, { passive: false });
    controlZones.top.addEventListener('touchend', function (event) {
        event.preventDefault();
        moveForward = false;
    }, { passive: false });

    // Left Control => Rotate Left
    controlZones.left.addEventListener('touchstart', function (event) {
        event.preventDefault();
        rotateLeft = true;
    }, { passive: false });
    controlZones.left.addEventListener('touchend', function (event) {
        event.preventDefault();
        rotateLeft = false;
    }, { passive: false });

    // Right Control => Rotate Right
    controlZones.right.addEventListener('touchstart', function (event) {
        event.preventDefault();
        rotateRight = true;
    }, { passive: false });
    controlZones.right.addEventListener('touchend', function (event) {
        event.preventDefault();
        rotateRight = false;
    }, { passive: false });
}

// Initialize controls
function initControls() {
    // Event Listeners for user interactions
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('resize', onWindowResize, false);

    // Touch Controls for Mobile Only
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        createTouchControls();
    }
}

