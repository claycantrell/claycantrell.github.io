// Core Three.js setup and initialization
// All state is now stored in GAME namespace (see namespace.js)

// Cache DOM elements immediately (for instructions only - other DOM caching in ui.js)
const instructionMessage = document.getElementById('instruction-message');
const instructionsParagraph = document.getElementById('instructions');

// Pixelation Effect Variables
const pixelationLevels = [0.17, 0.25, 0.35, 0.5, 0.75, 1.0]; // Low to high quality
const pixelationLabels = ['Retro', 'Low', 'Medium', 'High', 'Ultra', 'Off'];
let pixelationLevelIndex = 0; // Default to Retro for all devices
let originalPixelRatio = 1; // Store original pixel ratio

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
    const maxFogDensity = baseFogDensity * 4; // Reduced from 11x - less fog at night
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
        // Now handled by sky.js SkySystem with gradient dome and clouds
        // Only update fog color to match horizon
        if (GAME.scene.fog) {
            // Fog color matches horizon for seamless blend
            let fogR, fogG, fogB;
            if (phase < 0.4) {
                // Day - light blue fog
                fogR = 150; fogG = 200; fogB = 255;
            } else if (phase < 0.5) {
                // Sunset - warm fog (day blue to warm orange)
                const t = (phase - 0.4) / 0.1;
                fogR = 150 + t * 105; // 150 -> 255
                fogG = 200 - t * 100; // 200 -> 100
                fogB = 255 - t * 175; // 255 -> 80
            } else if (phase < 0.6) {
                // Dusk - quick transition to dark (avoid purple)
                const t = (phase - 0.5) / 0.1;
                // Go through dark quickly - drop red fast
                fogR = 255 - t * 250; // 255 -> 5
                fogG = 100 - t * 95;  // 100 -> 5
                fogB = 80 - t * 65;   // 80 -> 15
            } else {
                // Night - very dark fog (nearly black)
                fogR = 5; fogG = 5; fogB = 15;
            }
            GAME.scene.fog.color.setRGB(fogR / 255, fogG / 255, fogB / 255);
        }

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

                // Sun color changes during sunset/sunrise
                if (phase > 0.4 && phase < 0.6) {
                    // Sunset - deep orange/red sun
                    GAME.lighting.sun.material.color.setRGB(1.0, 0.4, 0.1);
                    if (GAME.lighting.sun.children[0]) {
                        GAME.lighting.sun.children[0].material.color.setRGB(1.0, 0.3, 0.0);
                        GAME.lighting.sun.children[0].material.opacity = 0.5;
                    }
                } else if (phase > 0.9 || phase < 0.1) {
                    // Sunrise - warm orange
                    GAME.lighting.sun.material.color.setRGB(1.0, 0.6, 0.3);
                    if (GAME.lighting.sun.children[0]) {
                        GAME.lighting.sun.children[0].material.color.setRGB(1.0, 0.5, 0.2);
                        GAME.lighting.sun.children[0].material.opacity = 0.4;
                    }
                } else {
                    // Normal daytime - bright yellow-white
                    GAME.lighting.sun.material.color.setRGB(1.0, 0.95, 0.6);
                    if (GAME.lighting.sun.children[0]) {
                        GAME.lighting.sun.children[0].material.color.setRGB(1.0, 0.9, 0.5);
                        GAME.lighting.sun.children[0].material.opacity = 0.3;
                    }
                }
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
            // Store sun direction for shadow camera updates
            let lightDirX, lightDirY, lightDirZ;
            if (sunDirY > moonDirY) {
                lightDirX = sunDirX;
                lightDirY = sunDirY;
                lightDirZ = sunDirZ;
                // Position directional light far away in sun's direction
                const lightDistance = 1000; // Far enough to simulate parallel rays
                GAME.lighting.directional.position.set(
                    lightDirX * lightDistance,
                    Math.max(lightDirY * lightDistance, 50), // Keep minimum height
                    lightDirZ * lightDistance
                );
            } else {
                lightDirX = moonDirX;
                lightDirY = moonDirY;
                lightDirZ = moonDirZ;
                // Position directional light far away in moon's direction
                const lightDistance = 1000;
                GAME.lighting.directional.position.set(
                    lightDirX * lightDistance,
                    Math.max(lightDirY * lightDistance, 50),
                    lightDirZ * lightDistance
                );
            }
            
            // Store sun direction for shadow camera updates
            GAME.lighting.directional.userData.sunDirection = new THREE.Vector3(lightDirX, lightDirY, lightDirZ);
            
            // Update directional light target to point at ground (for proper shadow casting)
            if (GAME.camera && GAME.lighting.directional.target) {
                const camPos = GAME.camera.position;
                // Point light at ground near camera/player
                GAME.lighting.directional.target.position.set(camPos.x, 0, camPos.z);
                GAME.lighting.directional.target.updateMatrixWorld();
            }
        }

        // Update terrain shader lighting uniforms
        if (typeof updateTerrainLighting === 'function') {
            updateTerrainLighting();
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
    
    // Enable shadow casting
    GAME.lighting.directional.castShadow = true;
    GAME.lighting.directional.shadow.mapSize.width = 2048;
    GAME.lighting.directional.shadow.mapSize.height = 2048;
    GAME.lighting.directional.shadow.camera.near = 0.5;
    GAME.lighting.directional.shadow.camera.far = 1000;
    // Larger bounds to cover more terrain
    GAME.lighting.directional.shadow.camera.left = -200;
    GAME.lighting.directional.shadow.camera.right = 200;
    GAME.lighting.directional.shadow.camera.top = 200;
    GAME.lighting.directional.shadow.camera.bottom = -200;
    GAME.lighting.directional.shadow.bias = -0.0005;
    GAME.lighting.directional.shadow.normalBias = 0.03; // Balance between acne and peter panning
    
    // Add directional light and its target to scene (target needed for proper light direction)
    GAME.scene.add(GAME.lighting.directional);
    GAME.scene.add(GAME.lighting.directional.target);

    // Create visual sun (bright glowing sphere at distance 900)
    const sunGeometry = new THREE.SphereGeometry(50, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFEE88,
        transparent: true,
        opacity: 1.0
    });
    GAME.lighting.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    GAME.scene.add(GAME.lighting.sun);

    // Add sun glow (larger transparent sphere)
    const sunGlowGeometry = new THREE.SphereGeometry(80, 16, 16);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFDD66,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    GAME.lighting.sun.add(sunGlow);

    // Create visual moon (pale sphere, starts hidden)
    const moonGeometry = new THREE.SphereGeometry(30, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xEEEEFF });
    GAME.lighting.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    GAME.lighting.moon.visible = false;
    GAME.scene.add(GAME.lighting.moon);

    // Initialize sky system (clouds, gradient dome, stars)
    if (typeof initSky === 'function') {
        initSky();
    }

    // Renderer setup - Optimized for low-end hardware
    GAME.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "low-power", // Prefer battery saving
        precision: "lowp" // Lower precision shaders (if supported)
    });
    GAME.renderer.setSize(window.innerWidth, window.innerHeight);
    // Store original pixel ratio
    originalPixelRatio = Math.min(1, window.devicePixelRatio);
    // Set initial pixelation state
    GAME.renderer.domElement.style.imageRendering = 'pixelated';
    // Apply initial pixelation level
    const initialPixelRatio = pixelationLevels[pixelationLevelIndex];
    GAME.renderer.setPixelRatio(Math.min(1, window.devicePixelRatio * initialPixelRatio));

    // Store pixelation state in GAME namespace for easy access
    GAME.rendering = GAME.rendering || {};
    GAME.rendering.pixelationLevel = pixelationLevelIndex;
    GAME.rendering.pixelationLabel = pixelationLabels[pixelationLevelIndex];
    GAME.rendering.reducedFrameRateEnabled = true; // Default to reduced frame rate

    // Enable shadow mapping
    GAME.renderer.shadowMap.enabled = true;
    GAME.renderer.shadowMap.type = THREE.BasicShadowMap; // Sharpest shadow edges
    GAME.renderer.shadowMap.autoUpdate = false; // Manual update for performance
    GAME.renderer.sortObjects = false; // Disable sorting for performance

    document.body.appendChild(GAME.renderer.domElement);

    // Initialize physics velocity
    GAME.physics.velocity = new THREE.Vector3();

    // Initialize shared materials
    initSharedMaterials();

    // Initialize procedural ground textures
    if (typeof initGroundTextures === 'function') {
        initGroundTextures();
    }

    // Ground with Flat Shading - now generated with hills
    createHillyGround();

    // Character setup - position will be set from map config or multiplayer
    // Use character type from GAME namespace (default: 'knight')
    GAME.character = typeof createCharacterOfType === 'function'
        ? createCharacterOfType(GAME.characterType || 'knight')
        : createCharacter();  // Fallback to old function
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

    // Initialize Animal Spawner (Minecraft-style chunk spawning)
    if (typeof initAnimalSpawner === 'function') {
        initAnimalSpawner();
    }

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

    // Initialize Terraform System
    if (typeof initTerraformSystem === 'function') {
        initTerraformSystem();
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

    // Update loading progress
    if (typeof updateLoadingProgress === 'function') {
        updateLoadingProgress(96, 'Loading map config');
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

    // Update loading progress
    if (typeof updateLoadingProgress === 'function') {
        updateLoadingProgress(98, 'Loading fonts');
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
            if (typeof animate === 'function') {
                animate();
            } else {
                console.warn('animate function not yet loaded, will start after game.js loads');
            }
            // Hide loading screen and fade out instructions
            if (typeof updateLoadingProgress === 'function') {
                updateLoadingProgress(100, 'Ready!');
            }
            setTimeout(() => {
                if (typeof hideLoadingScreen === 'function') {
                    hideLoadingScreen();
                }
            }, 300);
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
            if (typeof animate === 'function') {
                animate();
            } else {
                console.warn('animate function not yet loaded, will start after game.js loads');
            }
            // Hide loading screen and fade out instructions
            if (typeof updateLoadingProgress === 'function') {
                updateLoadingProgress(100, 'Ready!');
            }
            setTimeout(() => {
                if (typeof hideLoadingScreen === 'function') {
                    hideLoadingScreen();
                }
            }, 300);
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
    'strafeLeft': { get: () => GAME.input.strafeLeft, set: (v) => GAME.input.strafeLeft = v },
    'strafeRight': { get: () => GAME.input.strafeRight, set: (v) => GAME.input.strafeRight = v },
    'isJumping': { get: () => GAME.input.isJumping, set: (v) => GAME.input.isJumping = v },
    'isSprinting': { get: () => GAME.input.isSprinting, set: (v) => GAME.input.isSprinting = v },
    'isFirstPerson': { get: () => GAME.state.isFirstPerson, set: (v) => GAME.state.isFirstPerson = v },
    'isTerrainReady': { get: () => GAME.state.isTerrainReady, set: (v) => GAME.state.isTerrainReady = v },
    'portalActivated': { get: () => GAME.state.portalActivated, set: (v) => GAME.state.portalActivated = v },
    'prevTime': { get: () => GAME.time.prevTime, set: (v) => GAME.time.prevTime = v },
    'ambientLight': { get: () => GAME.lighting.ambient, set: (v) => GAME.lighting.ambient = v },
    'directionalLight': { get: () => GAME.lighting.directional, set: (v) => GAME.lighting.directional = v },
    'sunMesh': { get: () => GAME.lighting.sun, set: (v) => GAME.lighting.sun = v },
    'moonMesh': { get: () => GAME.lighting.moon, set: (v) => GAME.lighting.moon = v }
});

// Cycle through pixelation levels (P key)
function cyclePixelation() {
    if (!GAME || !GAME.renderer) {
        return null;
    }

    // Cycle to next level
    pixelationLevelIndex = (pixelationLevelIndex + 1) % pixelationLevels.length;
    applyPixelationLevel(pixelationLevelIndex);

    // Show notification
    if (typeof showNotification === 'function') {
        showNotification(`Graphics: ${pixelationLabels[pixelationLevelIndex]}`);
    }

    return pixelationLabels[pixelationLevelIndex];
}

// Set specific pixelation level (0-5)
function setPixelation(levelIndex) {
    if (!GAME || !GAME.renderer) {
        return null;
    }

    if (levelIndex < 0 || levelIndex >= pixelationLevels.length) {
        return null;
    }

    pixelationLevelIndex = levelIndex;
    applyPixelationLevel(levelIndex);

    return pixelationLabels[levelIndex];
}

// Apply pixelation level
function applyPixelationLevel(levelIndex) {
    const ratio = pixelationLevels[levelIndex];

    GAME.rendering = GAME.rendering || {};
    GAME.rendering.pixelationLevel = levelIndex;
    GAME.rendering.pixelationLabel = pixelationLabels[levelIndex];

    if (ratio >= 1.0) {
        // Full quality - no pixelation
        GAME.renderer.domElement.style.imageRendering = 'auto';
        GAME.renderer.setPixelRatio(originalPixelRatio);
    } else {
        // Apply pixelation
        GAME.renderer.domElement.style.imageRendering = 'pixelated';
        GAME.renderer.setPixelRatio(Math.min(1, window.devicePixelRatio * ratio));
    }
}

// Legacy toggle function (cycles through levels)
function togglePixelation() {
    return cyclePixelation();
}

window.init = init;
window.startGame = startGame;
window.getMapIdFromUrl = getMapIdFromUrl;
window.togglePixelation = togglePixelation;
window.cyclePixelation = cyclePixelation;
window.setPixelation = setPixelation;

