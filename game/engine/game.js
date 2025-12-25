// Main game loop and game logic
// Uses Systems registry for organized update loop
// All state accessed via GAME namespace

// Main animation loop
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = (currentTime - GAME.time.prevTime) / 1000;

    // Implement frame rate control (20 FPS => 50ms per frame)
    if (currentTime - GAME.time.prevTime < 50) {
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

    // Update shadow camera to follow sun's position and direction (Minecraft-style)
    if (GAME.lighting && GAME.lighting.directional && GAME.lighting.directional.shadow && GAME.character) {
        const shadowCamera = GAME.lighting.directional.shadow.camera;
        const playerPos = GAME.character.position;
        const sunDirection = GAME.lighting.directional.userData.sunDirection;
        
        if (sunDirection) {
            // Position shadow camera in the direction opposite to the sun
            // This makes the camera look at the scene from the sun's perspective
            const shadowCameraDistance = 500; // Distance from player to shadow camera
            const shadowCameraHeight = 200; // Height above ground for shadow map
            
            // Calculate shadow camera position based on sun direction
            // The camera should be positioned opposite to where the sun is coming from
            const shadowCamX = playerPos.x - sunDirection.x * shadowCameraDistance;
            const shadowCamY = playerPos.y + shadowCameraHeight;
            const shadowCamZ = playerPos.z - sunDirection.z * shadowCameraDistance;
            
            shadowCamera.position.set(shadowCamX, shadowCamY, shadowCamZ);
            
            // Look at the player position (or slightly below for ground shadows)
            shadowCamera.lookAt(playerPos.x, playerPos.y, playerPos.z);
            
            // Adjust shadow camera bounds based on sun angle
            // When sun is low (sunset/sunrise), shadows are longer, so we need wider bounds
            const sunHeight = Math.max(sunDirection.y, 0.1); // Clamp to avoid division by zero
            const baseBounds = 200;
            const angleMultiplier = 1 / sunHeight; // Lower sun = wider bounds
            
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
    }

    // Render
    if (GAME.camera && GAME.scene) {
        GAME.renderer.render(GAME.scene, GAME.camera);
    }
}

// Make available globally
window.animate = animate;

// Auto-start animation loop if game is already initialized
if (typeof GAME !== 'undefined' && GAME.scene && GAME.camera && GAME.renderer) {
    animate();
}

