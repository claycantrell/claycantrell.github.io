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
        typeof initDeer !== 'function' ||
        typeof initBunnies !== 'function' ||
        typeof initBirds !== 'function') {
        console.log('Waiting for dependencies to load...');
        setTimeout(init, 100); // Try again in 100ms
        return;
    }

    // Get rendering config from map
    const renderConfig = typeof getRenderingConfig === 'function' ? getRenderingConfig() : {};
    const backgroundColor = renderConfig.backgroundColor || '#191970';
    const fogColor = renderConfig.fogColor || '#000000';
    const baseFogDensity = renderConfig.fogDensity || 0.003;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    // Fog adds overhead - can disable for even lower load
    // Exponential fog to fade into darkness seamlessly
    // Initial fog density - extended range for brighter times
    const minFogDensity = baseFogDensity;
    const maxFogDensity = baseFogDensity * 11; // Scale max fog based on config
    const fogCycleDuration = 4 * 60 * 1000; // 4 minutes in milliseconds (twice as long)

    scene.fog = new THREE.FogExp2(fogColor, minFogDensity);

    // Start fog density transition loop
    // Use the shared time system for synchronization
    
    // Add fog update to animation loop via a hook or interval
    // Since we can't easily modify the main loop from here without restructuring,
    // we'll use a setInterval to update the fog density independently
    // 30 FPS update for fog is plenty smooth
    setInterval(() => {
        // Use shared phase calculation
        let phase;
        if (typeof getDayNightPhase === 'function') {
            phase = getDayNightPhase();
        } else {
             // Fallback if time-sync.js not loaded - use same smooth asymmetric calculation
             const elapsedTime = Date.now() - fogStartTime;
             const rawPhase = (elapsedTime % fogCycleDuration) / fogCycleDuration;

             // Same asymmetric calculation as time-sync.js
             const adjustedPhase = Math.pow(rawPhase, 0.8);
             phase = (Math.sin(adjustedPhase * Math.PI * 2) + 1) / 2;
        }

        const currentDensity = minFogDensity + (maxFogDensity - minFogDensity) * phase;
        
        if (scene && scene.fog) {
            scene.fog.density = currentDensity;

            // Interpolate background color (Sky)
            // Phase 1 (max density/foggy) -> Midnight Blue (0x191970)
            // Phase 0 (min density/clear) -> Bright Sky Blue (0x00BFFF) - brighter than Light Blue
            // Note: User requested Midnight Blue at foggiest, and brighter times than current max.

            // Midnight Blue RGB: (25, 25, 112)
            // Bright Sky Blue RGB: (0, 191, 255) - brighter and more vibrant than Light Blue (135, 206, 235)

            // Interpolate based on phase (0 to 1)
            // When phase is 1 (foggiest), we want Midnight Blue (25, 25, 112)
            // When phase is 0 (clearest), we want Bright Sky Blue (0, 191, 255)

            const r = (0 + (25 - 0) * phase) / 255;
            const g = (191 + (25 - 191) * phase) / 255;
            const b = (255 + (112 - 255) * phase) / 255;
            
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

    // Add ambient light for general illumination (config-driven)
    const ambientIntensity = renderConfig.ambientLight?.intensity ?? 0.5;
    const ambientColor = renderConfig.ambientLight?.color || '#ffffff';
    const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
    scene.add(ambientLight);

    // Add directional light (sun/moon) (config-driven)
    const directionalIntensity = renderConfig.directionalLight?.intensity ?? 1.0;
    const directionalColor = renderConfig.directionalLight?.color || '#ffffff';
    const directionalPos = renderConfig.directionalLight?.position || { x: 50, y: 100, z: 50 };
    const directionalLight = new THREE.DirectionalLight(directionalColor, directionalIntensity);
    directionalLight.position.set(directionalPos.x, directionalPos.y, directionalPos.z);
    scene.add(directionalLight);

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

    // Character setup - position will be set from map config or multiplayer
    character = createCharacter();
    scene.add(character);

    // Initialize spawn position from config (uses character.js config)
    if (typeof initCharacterSpawn === 'function') {
        initCharacterSpawn(character);
    } else {
        // Fallback to default spawn if function not available
        const spawnHeight = getTerrainHeightAt(-50, -50) + 1.0;
        character.position.set(-50, spawnHeight, -50);
        character.rotation.y = Math.PI / 4;
    }

    // Create Portals (place them on the terrain)
    createPortals();

    // Create more complex trees
    createMoreComplexTrees();
    
    // Initialize NPC, ensuring it spawns on the new terrain
    initNPC();

    // Initialize Deer Herd
    initDeer();

    // Initialize Bunnies
    initBunnies();

    // Initialize Birds
    initBirds();

    // Initialize audio (audio.js will handle setup)
    initAudio();

    // Initialize controls
    initControls();

    // Initialize UI
    initUI();

    // Initialize Build System
    if (typeof initBuildSystem === 'function') {
        initBuildSystem();
    }

    // Initialize other player assets (for multiplayer)
    if (typeof initOtherPlayerAssets === 'function') {
        initOtherPlayerAssets();
    }

    // Initialize multiplayer (optional - game works without it)
    // Auto-detect server URL based on current domain
    let serverUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
        serverUrl = 'ws://localhost:8080';
    } else {
        // For production: use same domain but WebSocket protocol
        // Railway, Render, etc. will proxy WebSocket connections
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        serverUrl = `${protocol}//${window.location.host}`;
    }
    console.log('Connecting to multiplayer server at:', serverUrl);
    initMultiplayer(serverUrl);
}

// Load Retro Font and start the game
// Wait for FontLoader to be available (loaded as ES6 module)
async function startGame() {
    if (!window.THREE || !window.THREE.FontLoader) {
        // Wait for modules to load
        window.addEventListener('threeModulesLoaded', startGame, { once: true });
        return;
    }

    // Load map configuration first
    const mapId = getMapIdFromUrl() || 'grasslands';
    console.log('Loading map:', mapId);

    if (typeof loadMap === 'function') {
        const config = await loadMap(mapId);
        if (!config) {
            console.error('Failed to load map config, using defaults');
        } else {
            console.log('Map loaded:', config.name);
        }
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

// Get map ID from URL query parameter
function getMapIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('map');
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}

