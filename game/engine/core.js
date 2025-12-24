// Core Three.js setup and initialization
// Global variables accessible across all modules
let scene, camera, renderer;
let character;

// Lighting references for day/night cycle
let ambientLight, directionalLight, sunMesh, moonMesh;

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

    // Start day/night cycle loop
    // Use the shared time system for synchronization
    // 30 FPS update is smooth enough for atmospheric changes
    setInterval(() => {
        // Use shared phase calculation (0 = day, 1 = night)
        let phase;
        if (typeof getDayNightPhase === 'function') {
            phase = getDayNightPhase();
        } else {
             // Fallback if time-sync.js not loaded
             const elapsedTime = Date.now();
             const rawPhase = (elapsedTime % fogCycleDuration) / fogCycleDuration;
             const adjustedPhase = Math.pow(rawPhase, 0.8);
             phase = (Math.sin(adjustedPhase * Math.PI * 2) + 1) / 2;
        }

        if (!scene) return;

        // === FOG DENSITY ===
        const currentDensity = minFogDensity + (maxFogDensity - minFogDensity) * phase;
        if (scene.fog) {
            scene.fog.density = currentDensity;
        }

        // === SKY COLOR ===
        // Day (phase 0): Bright Sky Blue (0, 191, 255)
        // Night (phase 1): Midnight Blue (25, 25, 112)
        const skyR = (0 + (25 - 0) * phase) / 255;
        const skyG = (191 + (25 - 191) * phase) / 255;
        const skyB = (255 + (112 - 255) * phase) / 255;
        scene.background.setRGB(skyR, skyG, skyB);

        // === AMBIENT LIGHT ===
        // Day: brighter (0.7), Night: dimmer (0.15)
        if (ambientLight) {
            const ambientDay = 0.7;
            const ambientNight = 0.15;
            ambientLight.intensity = ambientDay + (ambientNight - ambientDay) * phase;
        }

        // === DIRECTIONAL LIGHT (SUN/MOON) ===
        if (directionalLight) {
            // Intensity: Day (1.2) -> Night (0.2)
            const sunIntensity = 1.2;
            const moonIntensity = 0.2;
            directionalLight.intensity = sunIntensity + (moonIntensity - sunIntensity) * phase;

            // Color transition:
            // Day (phase 0-0.3): Warm white (255, 250, 230)
            // Sunset/rise (phase 0.3-0.5): Orange-pink (255, 150, 100)
            // Night (phase 0.5-1): Cool blue-white (180, 200, 255)
            let lightR, lightG, lightB;
            if (phase < 0.3) {
                // Daytime - warm white
                lightR = 255; lightG = 250; lightB = 230;
            } else if (phase < 0.5) {
                // Sunset transition (0.3 -> 0.5)
                const t = (phase - 0.3) / 0.2;
                lightR = 255;
                lightG = 250 - (250 - 150) * t;
                lightB = 230 - (230 - 100) * t;
            } else if (phase < 0.7) {
                // Dusk to night transition (0.5 -> 0.7)
                const t = (phase - 0.5) / 0.2;
                lightR = 255 - (255 - 180) * t;
                lightG = 150 + (200 - 150) * t;
                lightB = 100 + (255 - 100) * t;
            } else {
                // Night - cool moonlight
                lightR = 180; lightG = 200; lightB = 255;
            }
            directionalLight.color.setRGB(lightR / 255, lightG / 255, lightB / 255);

            // === SUN/MOON POSITION ===
            // Sun/moon at far distance, always follow camera so unreachable
            if (!camera) return;
            const camPos = camera.position;

            // Push to near camera far clip (900 of 1000) so unreachable
            const orbitDistance = 900;

            // Time of day angle
            // phase 0 = noon (sun at zenith), phase 0.5 = midnight (sun below)
            const timeAngle = phase * Math.PI * 2;
            const sunAngle = Math.PI / 2 - timeAngle;

            // Sun: circular arc in sky, always same distance from camera
            const sunDirX = Math.cos(sunAngle) * 0.7; // Horizontal component
            const sunDirY = Math.sin(sunAngle);        // Vertical component
            const sunDirZ = Math.cos(sunAngle) * 0.3; // Slight depth

            if (sunMesh) {
                sunMesh.position.set(
                    camPos.x + sunDirX * orbitDistance,
                    camPos.y + sunDirY * orbitDistance,
                    camPos.z + sunDirZ * orbitDistance
                );
                sunMesh.visible = sunDirY > -0.1;
            }

            // Moon: opposite side of sun
            const moonAngle = sunAngle + Math.PI;
            const moonDirX = Math.cos(moonAngle) * 0.7;
            const moonDirY = Math.sin(moonAngle);
            const moonDirZ = Math.cos(moonAngle) * 0.3;

            if (moonMesh) {
                moonMesh.position.set(
                    camPos.x + moonDirX * orbitDistance,
                    camPos.y + moonDirY * orbitDistance,
                    camPos.z + moonDirZ * orbitDistance
                );
                moonMesh.visible = moonDirY > -0.1;
            }

            // Directional light follows whichever is higher (sun or moon)
            if (sunDirY > moonDirY) {
                directionalLight.position.set(sunDirX * 100, Math.max(sunDirY * 100, 50), sunDirZ * 100);
            } else {
                directionalLight.position.set(moonDirX * 100, Math.max(moonDirY * 100, 50), moonDirZ * 100);
            }
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
    ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
    scene.add(ambientLight);

    // Add directional light (sun/moon) (config-driven)
    const directionalIntensity = renderConfig.directionalLight?.intensity ?? 1.0;
    const directionalColor = renderConfig.directionalLight?.color || '#ffffff';
    const directionalPos = renderConfig.directionalLight?.position || { x: 50, y: 100, z: 50 };
    directionalLight = new THREE.DirectionalLight(directionalColor, directionalIntensity);
    directionalLight.position.set(directionalPos.x, directionalPos.y, directionalPos.z);
    scene.add(directionalLight);

    // Create visual sun (yellow glowing sphere at distance 900)
    const sunGeometry = new THREE.SphereGeometry(40, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);

    // Create visual moon (pale blue sphere, starts hidden)
    const moonGeometry = new THREE.SphereGeometry(25, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xCCDDFF });
    moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.visible = false;
    scene.add(moonMesh);

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

    // Create biome-specific shrubs
    if (typeof createShrubs === 'function') {
        createShrubs();
    }
    
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

