// Main game loop and game logic
// Uses Systems registry for organized update loop
// All state accessed via GAME namespace

// Frame rate control state
let reducedFrameRateEnabled = true; // Default to reduced frame rate (retro feel)
const REDUCED_FPS_INTERVAL = 50; // 20 FPS (50ms per frame) for game logic
let lastGameLogicUpdate = 0; // Track last game logic update separately

// Shadow update throttling (exposed globally so it can be adjusted via commands)
let lastShadowUpdate = 0;
window.shadowUpdateInterval = 50; // Update shadows every 50ms (20 times per second)

// Track time for smooth updates
let lastSmoothUpdateTime = 0;

// Update character movement and camera at full FPS for smooth controls
// This runs every frame regardless of game logic throttling
function updatePlayerSmooth(currentTime) {
    if (!GAME.camera || !GAME.character) return;

    // Calculate delta for smooth movement
    const delta = lastSmoothUpdateTime > 0 ? (currentTime - lastSmoothUpdateTime) / 1000 : 0.016;
    lastSmoothUpdateTime = currentTime;

    // Update character movement at full FPS (smooth walking/running)
    if (typeof updateCharacterMovement === 'function') {
        updateCharacterMovement(delta);
    }

    const character = GAME.character;
    const camera = GAME.camera;
    const isFirstPerson = GAME.state.isFirstPerson;

    // Get camera angles from mouse look
    const cameraYaw = typeof getCameraYaw === 'function' ? getCameraYaw() : 0;
    const cameraPitch = typeof getCameraPitch === 'function' ? getCameraPitch() : 0;

    if (isFirstPerson) {
        // First-person: camera at character's eye level, mouse controls view
        const eyeHeight = 3.5;
        camera.position.set(
            character.position.x,
            character.position.y + eyeHeight,
            character.position.z
        );

        // Calculate look direction from yaw and pitch
        const lookDir = new THREE.Vector3(
            Math.sin(cameraYaw) * Math.cos(cameraPitch),
            Math.sin(cameraPitch),
            Math.cos(cameraYaw) * Math.cos(cameraPitch)
        );

        camera.lookAt(
            camera.position.x + lookDir.x,
            camera.position.y + lookDir.y,
            camera.position.z + lookDir.z
        );
    } else {
        // Third-person: camera orbits around character based on mouse
        const cameraDistance = 15;
        const cameraHeight = 7;

        const camX = character.position.x - Math.sin(cameraYaw) * cameraDistance * Math.cos(cameraPitch);
        const camY = character.position.y + cameraHeight - Math.sin(cameraPitch) * cameraDistance;
        const camZ = character.position.z - Math.cos(cameraYaw) * cameraDistance * Math.cos(cameraPitch);

        camera.position.set(camX, camY, camZ);
        camera.lookAt(character.position.x, character.position.y + 5, character.position.z);
    }
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();

    // Always update player movement and camera at full FPS for smooth controls
    updatePlayerSmooth(currentTime);

    // Check if we should update game logic (throttled at 20 FPS for retro feel)
    const shouldUpdateGameLogic = !reducedFrameRateEnabled ||
        (currentTime - lastGameLogicUpdate >= REDUCED_FPS_INTERVAL);

    if (shouldUpdateGameLogic) {
        const delta = (currentTime - GAME.time.prevTime) / 1000;
        GAME.time.prevTime = currentTime;
        lastGameLogicUpdate = currentTime;

        // Update all registered systems in order (movement, animations, etc.)
        if (typeof Systems !== 'undefined') {
            Systems.updateAll(delta);
        }

        // Tree and Shrub LOD updates (throttled separately for performance)
        if (PERFORMANCE.rendering.lodEnabled) {
            if (currentTime - GAME.time.lastLODUpdate > PERFORMANCE.rendering.lodUpdateInterval) {
                if (typeof updateTreeLOD === 'function') updateTreeLOD();
                if (typeof updateShrubLOD === 'function') updateShrubLOD();
                GAME.time.lastLODUpdate = currentTime;
            }
        }

        // Update shadow camera and shadow map together on throttled interval
        // This keeps floor shadows and object shadows in sync (Minecraft-style stepping)
        const shouldUpdateShadows = currentTime - lastShadowUpdate > window.shadowUpdateInterval;

        if (shouldUpdateShadows && GAME.lighting && GAME.lighting.directional && GAME.lighting.directional.shadow && GAME.character) {
            const shadowCamera = GAME.lighting.directional.shadow.camera;
            const playerPos = GAME.character.position;
            const sunDirection = GAME.lighting.directional.userData.sunDirection;

            if (sunDirection) {
                // Position shadow camera in the direction opposite to the sun
                const shadowCameraDistance = 500;
                const shadowCameraHeight = 200;

                const shadowCamX = playerPos.x - sunDirection.x * shadowCameraDistance;
                const shadowCamY = playerPos.y + shadowCameraHeight;
                const shadowCamZ = playerPos.z - sunDirection.z * shadowCameraDistance;

                shadowCamera.position.set(shadowCamX, shadowCamY, shadowCamZ);
                shadowCamera.lookAt(playerPos.x, playerPos.y, playerPos.z);

                // Adjust shadow camera bounds based on sun angle
                const sunHeight = Math.max(sunDirection.y, 0.1);
                const baseBounds = 200;
                const angleMultiplier = 1 / sunHeight;

                shadowCamera.left = -baseBounds * angleMultiplier;
                shadowCamera.right = baseBounds * angleMultiplier;
                shadowCamera.top = baseBounds * angleMultiplier;
                shadowCamera.bottom = -baseBounds * angleMultiplier;

                shadowCamera.updateProjectionMatrix();
            } else {
                // Fallback: position above player looking down
                shadowCamera.position.set(playerPos.x, playerPos.y + 100, playerPos.z);
                shadowCamera.lookAt(playerPos.x, playerPos.y, playerPos.z);
                shadowCamera.updateProjectionMatrix();
            }

            // Trigger shadow map update
            GAME.renderer.shadowMap.needsUpdate = true;
            lastShadowUpdate = currentTime;
        }
    }

    // Always render at full FPS for smooth camera
    if (GAME.camera && GAME.scene) {
        GAME.renderer.render(GAME.scene, GAME.camera);
    }
}

// Toggle retro mode (choppy objects at 20 FPS, smooth camera/movement)
function toggleReducedFrameRate() {
    reducedFrameRateEnabled = !reducedFrameRateEnabled;
    GAME.rendering = GAME.rendering || {};
    GAME.rendering.reducedFrameRateEnabled = reducedFrameRateEnabled;
    if (typeof showNotification === 'function') {
        showNotification(reducedFrameRateEnabled ? 'Retro Mode: ON' : 'Retro Mode: OFF');
    }
    return reducedFrameRateEnabled;
}

// Make available globally
window.animate = animate;
window.toggleReducedFrameRate = toggleReducedFrameRate;

// Auto-start animation loop if game is already initialized
if (typeof GAME !== 'undefined' && GAME.scene && GAME.camera && GAME.renderer) {
    animate();
}

