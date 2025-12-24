// Core Three.js setup and initialization
// All state is now stored in GAME namespace (see namespace.js)

// Cache DOM elements immediately (for instructions only - other DOM caching in ui.js)
const instructionMessage = document.getElementById('instruction-message');
const instructionsParagraph = document.getElementById('instructions');

// Pixelation Effect Variables
const pixelRatio = /Mobi|Android/i.test(navigator.userAgent) ? 0.12 : 0.32;

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
    // Wait for all required functions to be available
    if (typeof createCharacter !== 'function' ||
        typeof createHillyGround !== 'function' ||
        typeof createPortals !== 'function' ||
        typeof createMoreComplexTrees !== 'function' ||
        typeof initDeer !== 'function' ||
        typeof initBunnies !== 'function' ||
        typeof initBirds !== 'function') {
        // Waiting for dependencies to load
        setTimeout(init, 100); // Try again in 100ms
        return;
    }

    // Get rendering config from map
    const renderConfig = typeof getRenderingConfig === 'function' ? getRenderingConfig() : {};
    const backgroundColor = renderConfig.backgroundColor || '#191970';
    const fogColor = renderConfig.fogColor || '#000000';
    const baseFogDensity = renderConfig.fogDensity || 0.003;

    // Scene setup
    GAME.scene = new THREE.Scene();
    GAME.scene.background = new THREE.Color(backgroundColor);
    // Fog adds overhead - can disable for even lower load
    // Exponential fog to fade into darkness seamlessly
    // Initial fog density - extended range for brighter times
    const minFogDensity = baseFogDensity;
    const maxFogDensity = baseFogDensity * 11; // Scale max fog based on config
    const fogCycleDuration = 4 * 60 * 1000; // 4 minutes in milliseconds (twice as long)

    GAME.scene.fog = new THREE.FogExp2(fogColor, minFogDensity);

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

        if (!GAME.scene) return;

        // === FOG DENSITY ===
        const currentDensity = minFogDensity + (maxFogDensity - minFogDensity) * phase;
        if (GAME.scene.fog) {
            GAME.scene.fog.density = currentDensity;
        }

        // === SKY COLOR ===
        // Day (phase 0): Bright Sky Blue (0, 191, 255)
        // Night (phase 1): Midnight Blue (25, 25, 112)
        const skyR = (0 + (25 - 0) * phase) / 255;
        const skyG = (191 + (25 - 191) * phase) / 255;
        const skyB = (255 + (112 - 255) * phase) / 255;
        GAME.scene.background.setRGB(skyR, skyG, skyB);

        // === AMBIENT LIGHT ===
        // Day: brighter (0.7), Night: dimmer (0.15)
        if (GAME.lighting.ambient) {
            const ambientDay = 0.7;
            const ambientNight = 0.15;
            GAME.lighting.ambient.intensity = ambientDay + (ambientNight - ambientDay) * phase;
        }

        // === DIRECTIONAL LIGHT (SUN/MOON) ===
        if (GAME.lighting.directional) {
            // Intensity: Day (1.2) -> Night (0.2)
            const sunIntensity = 1.2;
            const moonIntensity = 0.2;
            GAME.lighting.directional.intensity = sunIntensity + (moonIntensity - sunIntensity) * phase;

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
            GAME.lighting.directional.color.setRGB(lightR / 255, lightG / 255, lightB / 255);

            // === SUN/MOON POSITION ===
            // Sun/moon at far distance, always follow camera so unreachable
            if (!GAME.camera) return;
            const camPos = GAME.camera.position;

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

            if (GAME.lighting.sun) {
                GAME.lighting.sun.position.set(
                    camPos.x + sunDirX * orbitDistance,
                    camPos.y + sunDirY * orbitDistance,
                    camPos.z + sunDirZ * orbitDistance
                );
                GAME.lighting.sun.visible = sunDirY > -0.1;
            }

            // Moon: opposite side of sun
            const moonAngle = sunAngle + Math.PI;
            const moonDirX = Math.cos(moonAngle) * 0.7;
            const moonDirY = Math.sin(moonAngle);
            const moonDirZ = Math.cos(moonAngle) * 0.3;

            if (GAME.lighting.moon) {
                GAME.lighting.moon.position.set(
                    camPos.x + moonDirX * orbitDistance,
                    camPos.y + moonDirY * orbitDistance,
                    camPos.z + moonDirZ * orbitDistance
                );
                GAME.lighting.moon.visible = moonDirY > -0.1;
            }

            // Directional light follows whichever is higher (sun or moon)
            if (sunDirY > moonDirY) {
                GAME.lighting.directional.position.set(sunDirX * 100, Math.max(sunDirY * 100, 50), sunDirZ * 100);
            } else {
                GAME.lighting.directional.position.set(moonDirX * 100, Math.max(moonDirY * 100, 50), moonDirZ * 100);
            }
        }
    }, 33);

    // Disable automatic matrix updates for static objects (performance)
    GAME.scene.autoUpdate = true; // Keep true for now, but can optimize further

    // Camera setup
    GAME.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );

    // Add ambient light for general illumination (config-driven)
    const ambientIntensity = renderConfig.ambientLight?.intensity ?? 0.5;
    const ambientColor = renderConfig.ambientLight?.color || '#ffffff';
    GAME.lighting.ambient = new THREE.AmbientLight(ambientColor, ambientIntensity);
    GAME.scene.add(GAME.lighting.ambient);

    // Add directional light (sun/moon) (config-driven)
    const directionalIntensity = renderConfig.directionalLight?.intensity ?? 1.0;
    const directionalColor = renderConfig.directionalLight?.color || '#ffffff';
    const directionalPos = renderConfig.directionalLight?.position || { x: 50, y: 100, z: 50 };
    GAME.lighting.directional = new THREE.DirectionalLight(directionalColor, directionalIntensity);
    GAME.lighting.directional.position.set(directionalPos.x, directionalPos.y, directionalPos.z);
    GAME.scene.add(GAME.lighting.directional);

    // Create visual sun (yellow glowing sphere at distance 900)
    const sunGeometry = new THREE.SphereGeometry(40, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
    GAME.lighting.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    GAME.scene.add(GAME.lighting.sun);

    // Create visual moon (pale blue sphere, starts hidden)
    const moonGeometry = new THREE.SphereGeometry(25, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xCCDDFF });
    GAME.lighting.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    GAME.lighting.moon.visible = false;
    GAME.scene.add(GAME.lighting.moon);

    // Renderer setup - Optimized for low-end hardware
    GAME.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "low-power", // Prefer battery saving
        precision: "lowp" // Lower precision shaders (if supported)
    });
    GAME.renderer.setSize(window.innerWidth, window.innerHeight);
    GAME.renderer.domElement.style.imageRendering = 'pixelated';
    // 90s games ran at lower resolution - cap pixel ratio for retro feel
    GAME.renderer.setPixelRatio(Math.min(1, window.devicePixelRatio * pixelRatio));

    // Disable expensive features
    GAME.renderer.shadowMap.enabled = false; // No shadows
    GAME.renderer.sortObjects = false; // Disable sorting for performance

    document.body.appendChild(GAME.renderer.domElement);

    // Initialize physics velocity
    GAME.physics.velocity = new THREE.Vector3();

    // Initialize shared materials
    initSharedMaterials();

    // Ground with Flat Shading - now generated with hills
    createHillyGround();

    // Character setup - position will be set from map config or multiplayer
    GAME.character = createCharacter();
    GAME.scene.add(GAME.character);

    // Initialize spawn position from config (uses character.js config)
    if (typeof initCharacterSpawn === 'function') {
        initCharacterSpawn(GAME.character);
    } else {
        // Fallback to default spawn if function not available
        const spawnHeight = getTerrainHeightAt(-50, -50) + 1.0;
        GAME.character.position.set(-50, spawnHeight, -50);
        GAME.character.rotation.y = Math.PI / 4;
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
    if (typeof gameLog === 'function') gameLog('Connecting to multiplayer server');
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
    if (typeof gameLog === 'function') gameLog('Loading map:', mapId);

    try {
        if (typeof loadMap === 'function') {
            const config = await loadMap(mapId);
            if (!config) {
                console.error('Failed to load map config, using defaults');
            } else {
                if (typeof gameLog === 'function') gameLog('Map loaded:', config.name);
            }
        }
    } catch (error) {
        console.error('Error loading map:', error);
        if (typeof GAME !== 'undefined' && GAME.error) {
            GAME.error.log('mapLoader', error);
        }
    }

    const loader = new THREE.FontLoader();
    loader.load(
        'https://threejs.org/examples/fonts/droid/droid_sans_mono_regular.typeface.json',
        // Success callback
        function (loadedFont) {
            GAME.resources.font = loadedFont;
            // Instructions are set before initialization
            setInstructions();
            init();
            // Start the animation loop
            animate();
            // After 3 seconds, fade out the instructional message
            setTimeout(() => {
                instructionMessage.style.opacity = '0';
            }, 3000);
        },
        // Progress callback (optional)
        undefined,
        // Error callback
        function (error) {
            console.error('Failed to load font:', error);
            if (typeof GAME !== 'undefined' && GAME.error) {
                GAME.error.log('fontLoader', error);
            }
            // Continue without font - portals won't have labels
            setInstructions();
            init();
            animate();
            setTimeout(() => {
                instructionMessage.style.opacity = '0';
            }, 3000);
        }
    );
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

// Backward compatibility - expose GAME namespace properties on window
// Other modules can access via window.scene or GAME.scene
Object.defineProperties(window, {
    'scene': { get: () => GAME.scene, set: (v) => GAME.scene = v },
    'camera': { get: () => GAME.camera, set: (v) => GAME.camera = v },
    'renderer': { get: () => GAME.renderer, set: (v) => GAME.renderer = v },
    'character': { get: () => GAME.character, set: (v) => GAME.character = v },
    'font': { get: () => GAME.resources.font, set: (v) => GAME.resources.font = v },
    'portals': { get: () => GAME.world.portals },
    'objects': { get: () => GAME.world.objects },
    'treeData': { get: () => GAME.world.treeData },
    'velocity': { get: () => GAME.physics.velocity },
    'moveForward': { get: () => GAME.input.moveForward, set: (v) => GAME.input.moveForward = v },
    'moveBackward': { get: () => GAME.input.moveBackward, set: (v) => GAME.input.moveBackward = v },
    'rotateLeft': { get: () => GAME.input.rotateLeft, set: (v) => GAME.input.rotateLeft = v },
    'rotateRight': { get: () => GAME.input.rotateRight, set: (v) => GAME.input.rotateRight = v },
    'isFlying': { get: () => GAME.input.isFlying, set: (v) => GAME.input.isFlying = v },
    'isFirstPerson': { get: () => GAME.state.isFirstPerson, set: (v) => GAME.state.isFirstPerson = v },
    'isTerrainReady': { get: () => GAME.state.isTerrainReady, set: (v) => GAME.state.isTerrainReady = v },
    'portalActivated': { get: () => GAME.state.portalActivated, set: (v) => GAME.state.portalActivated = v },
    'prevTime': { get: () => GAME.time.prevTime, set: (v) => GAME.time.prevTime = v },
    'ambientLight': { get: () => GAME.lighting.ambient, set: (v) => GAME.lighting.ambient = v },
    'directionalLight': { get: () => GAME.lighting.directional, set: (v) => GAME.lighting.directional = v },
    'sunMesh': { get: () => GAME.lighting.sun, set: (v) => GAME.lighting.sun = v },
    'moonMesh': { get: () => GAME.lighting.moon, set: (v) => GAME.lighting.moon = v }
});

window.init = init;
window.startGame = startGame;
window.getMapIdFromUrl = getMapIdFromUrl;

