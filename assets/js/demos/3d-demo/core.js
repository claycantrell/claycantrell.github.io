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

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x191970); // Midnight blue background
    // Fog adds overhead - can disable for even lower load
    scene.fog = new THREE.Fog(0x000000, 50, 200); // Linear fog with black color
    
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

    // Ground with Flat Shading - Use shared material
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const ground = new THREE.Mesh(groundGeometry, sharedMaterials.ground);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Character setup - position will be set by multiplayer spawn or default
    character = createCharacter();
    // Default spawn position (used if multiplayer not available)
    character.position.set(-50, 1, -50);
    character.rotation.y = Math.PI / 4;
    scene.add(character);

    // Create Portals
    createPortals();

    // Create more complex trees
    createMoreComplexTrees();

    // Initialize NPC
    initNPC();

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

