// Core Three.js setup and initialization
// Global variables accessible across all modules
let scene, camera, renderer;
let character;

// Shared materials (declared here, initialized in performance.js)
let sharedMaterials = {};
let moveForward = false,
    moveBackward = false,
    rotateLeft = false,
    rotateRight = false,
    isFlying = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const portals = [];
const objects = [];

// Notification element
const notification = document.getElementById('notification');
let notificationTimeout;

// Font Loader for retro text
let font;

// Audio elements (will be initialized in audio.js)
let audio, listener, audioLoader;
let isAudioPlaying = false;
const audioIcon = document.getElementById('audio-icon');

// Flag to indicate when terrain is ready
var isTerrainReady = false;

// Tree data for LOD system (Level of Detail - 2D sprites for distant trees)
let treeData = [];

// Instructional Message Elements
const instructionMessage = document.getElementById('instruction-message');
const instructionsParagraph = document.getElementById('instructions');

// Pixelation Effect Variables
let pixelRatio;

if (/Mobi|Android/i.test(navigator.userAgent)) {
    // On mobile devices
    pixelRatio = 0.09;
} else {
    // On other devices
    pixelRatio = 0.25;
}

// Flag to prevent multiple fades
let portalActivated = false;

// Function to set instructions based on device
function setInstructions() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        instructionsParagraph.innerHTML = `
            Touch edges of screen to rotate right or left.<br>
            Touch bottom and top of screen to move<br>
            forward and backward.
        `;
    } else {
        instructionsParagraph.innerHTML = `
            Use Arrow Keys or WASD to move and rotate.
        `;
    }
}

// Global flag to track when terrain is ready
// isTerrainReady declared at top of file

function init() {
    // Wait for all required functions to be available
    if (typeof createCharacter !== 'function' ||
        typeof createHillyGround !== 'function' ||
        typeof createPortals !== 'function' ||
        typeof createMoreComplexTrees !== 'function' ||
        typeof initDeer !== 'function') {
        console.log('Waiting for dependencies to load...');
        setTimeout(init, 100); // Try again in 100ms
        return;
    }

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x191970); // Black background for infinite dark void
    // Fog adds overhead - can disable for even lower load
    // Exponential fog to fade into darkness seamlessly
    // Initial fog density
    const minFogDensity = 0.008;
    const maxFogDensity = 0.034;
    const fogCycleDuration = 2 * 60 * 1000; // 2 minutes in milliseconds
    
    scene.fog = new THREE.FogExp2(0x000000, minFogDensity); // Black exponential fog

    // Start fog density transition loop
    const fogStartTime = Date.now();
    
    // Add fog update to animation loop via a hook or interval
    // Since we can't easily modify the main loop from here without restructuring,
    // we'll use a setInterval to update the fog density independently
    // 30 FPS update for fog is plenty smooth
    setInterval(() => {
        const elapsedTime = Date.now() - fogStartTime;
        // Calculate phase (0 to 1) within the cycle
        // Use sine wave to oscillate between min and max
        // (elapsedTime / fogCycleDuration) * Math.PI * 2 -> full cycle 0->1->0 every 2 mins?
        // No, user wants transition *between* them every 2 minutes. 
        // Assuming they mean a full cycle (min -> max -> min) or just oscillation.
        // Let's do a smooth sine wave oscillation with a 2 minute period.
        
        const phase = (Math.sin((elapsedTime / fogCycleDuration) * Math.PI * 2) + 1) / 2; // Normalize to 0-1
        const currentDensity = minFogDensity + (maxFogDensity - minFogDensity) * phase;
        
        if (scene && scene.fog) {
            scene.fog.density = currentDensity;

            // Interpolate background color (Sky)
            // Phase 1 (max density/foggy) -> Midnight Blue (0x191970)
            // Phase 0 (min density/clear) -> Light Blue (0x87CEEB)
            // Note: User requested Midnight Blue at foggiest.
            
            // Midnight Blue RGB: (25, 25, 112)
            // Light Blue RGB: (135, 206, 235)
            
            // Interpolate based on phase (0 to 1)
            // When phase is 1 (foggiest), we want Midnight Blue (25, 25, 112)
            // When phase is 0 (clearest), we want Light Blue (135, 206, 235)
            
            const r = (135 + (25 - 135) * phase) / 255;
            const g = (206 + (25 - 206) * phase) / 255;
            const b = (235 + (112 - 235) * phase) / 255;
            
            // ONLY update the background color, NOT the fog color
            scene.background.setRGB(r, g, b);
        }
    }, 33);

    // Disable automatic matrix updates for static objects (performance)
    scene.autoUpdate = true; // Keep true for now, but can optimize further

    // Camera setup
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );

    // Renderer setup - Optimized for low-end hardware
    renderer = new THREE.WebGLRenderer({ 
        antialias: false,
        powerPreference: "low-power", // Prefer battery saving
        precision: "lowp" // Lower precision shaders (if supported)
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.imageRendering = 'pixelated';
    // 90s games ran at lower resolution - cap pixel ratio for retro feel
    renderer.setPixelRatio(Math.min(1, window.devicePixelRatio * pixelRatio));
    
    // Disable expensive features
    renderer.shadowMap.enabled = false; // No shadows
    renderer.sortObjects = false; // Disable sorting for performance
    
    document.body.appendChild(renderer.domElement);

    // Initialize shared materials
    initSharedMaterials();

    // Ground with Flat Shading - now generated with hills
    createHillyGround();

    // Character setup - position will be set by multiplayer spawn or default
    character = createCharacter();
    // Default spawn position (used if multiplayer not available)
    const spawnHeight = getTerrainHeightAt(-50, -50) + 1.0;
    character.position.set(-50, spawnHeight, -50);
    character.rotation.y = Math.PI / 4;
    scene.add(character);

    // Create Portals (place them on the terrain)
    createPortals();

    // Create more complex trees
    createMoreComplexTrees();
    
    // Initialize NPC, ensuring it spawns on the new terrain
    initNPC();

    // Initialize Deer Herd
    initDeer();

    // Initialize audio (audio.js will handle setup)
    initAudio();

    // Initialize controls
    initControls();

    // Initialize UI
    initUI();

    // Initialize other player assets (for multiplayer)
    if (typeof initOtherPlayerAssets === 'function') {
        initOtherPlayerAssets();
    }

    // Initialize multiplayer (optional - game works without it)
    // Change server URL to your production WebSocket server
    const serverUrl = window.location.hostname === 'localhost' 
        ? 'ws://localhost:8080' 
        : 'wss://your-server.com'; // Use wss:// for production
    initMultiplayer(serverUrl);
}

// Load Retro Font and start the game
// Wait for FontLoader to be available (loaded as ES6 module)
function startGame() {
    if (!window.THREE || !window.THREE.FontLoader) {
        // Wait for modules to load
        window.addEventListener('threeModulesLoaded', startGame, { once: true });
        return;
    }
    
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/droid/droid_sans_mono_regular.typeface.json', function (loadedFont) {
        font = loadedFont;
        // Instructions are set before initialization
        setInstructions();
        init();
        // Start the animation loop
        animate();
        // After 3 seconds, fade out the instructional message
        setTimeout(() => {
            instructionMessage.style.opacity = '0';
        }, 3000);
    });
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}

