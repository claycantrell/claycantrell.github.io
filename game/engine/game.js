// Main game loop and game logic
// Uses Systems registry for organized update loop
// All state accessed via GAME namespace

// Frame rate control state
let reducedFrameRateEnabled = true; // Default to reduced frame rate (retro feel)
const REDUCED_FPS_INTERVAL = 50; // 20 FPS (50ms per frame)
const FULL_FPS_INTERVAL = 0; // Unlimited (use requestAnimationFrame's native rate)

// Shadow update throttling (exposed globally so it can be adjusted via commands)
let lastShadowUpdate = 0;
window.shadowUpdateInterval = 50; // Update shadows every 50ms (20 times per second)

// Main animation loop
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = (currentTime - GAME.time.prevTime) / 1000;

    // Implement frame rate control (20 FPS => 50ms per frame) if enabled
    const frameInterval = reducedFrameRateEnabled ? REDUCED_FPS_INTERVAL : FULL_FPS_INTERVAL;
    if (frameInterval > 0 && currentTime - GAME.time.prevTime < frameInterval) {
        return;
    }

    GAME.time.prevTime = currentTime;

    // Update all registered systems in order
    if (typeof Systems !== 'undefined') {
        Systems.updateAll(delta);
    }

    // Tree LOD updates (throttled separately for performance)
    if (PERFORMANCE.rendering.lodEnabled) {
        if (currentTime - GAME.time.lastLODUpdate > PERFORMANCE.rendering.lodUpdateInterval) {
            if (typeof updateTreeLOD === 'function') updateTreeLOD();
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

    // Render
    if (GAME.camera && GAME.scene) {
        GAME.renderer.render(GAME.scene, GAME.camera);
    }
}

// Toggle reduced frame rate
function toggleReducedFrameRate() {
    reducedFrameRateEnabled = !reducedFrameRateEnabled;
    GAME.rendering = GAME.rendering || {};
    GAME.rendering.reducedFrameRateEnabled = reducedFrameRateEnabled;
    return reducedFrameRateEnabled;
}

// Make available globally
window.animate = animate;
window.toggleReducedFrameRate = toggleReducedFrameRate;

// Auto-start animation loop if game is already initialized
if (typeof GAME !== 'undefined' && GAME.scene && GAME.camera && GAME.renderer) {
    animate();
}

