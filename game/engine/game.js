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

    // Render
    if (GAME.camera && GAME.scene) {
        GAME.renderer.render(GAME.scene, GAME.camera);
    }
}

// Make available globally
window.animate = animate;

