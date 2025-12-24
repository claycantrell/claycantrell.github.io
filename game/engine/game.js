// Main game loop and game logic
// Uses Systems registry for organized update loop

// LOD update throttling
let lastLODUpdate = 0;

// Main animation loop
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const delta = (currentTime - prevTime) / 1000;

    // Implement frame rate control (20 FPS => 50ms per frame)
    const desiredFPS = 20;
    const frameInterval = 1000 / desiredFPS;
    if (currentTime - prevTime < frameInterval) {
        return;
    }

    prevTime = currentTime;

    // Update all registered systems in order
    // This replaces individual function calls with a unified update loop
    if (typeof Systems !== 'undefined') {
        Systems.updateAll(delta);
    }

    // Tree LOD updates (throttled separately for performance)
    if (PERFORMANCE.rendering.lodEnabled) {
        if (currentTime - lastLODUpdate > PERFORMANCE.rendering.lodUpdateInterval) {
            if (typeof updateTreeLOD === 'function') updateTreeLOD();
            lastLODUpdate = currentTime;
        }
        // Shrub billboards (not in Systems yet)
        if (typeof updateShrubBillboards === 'function') {
            updateShrubBillboards();
        }
    }

    // Portal interaction and label animation (will be moved to PortalSystem later)
    portals.forEach(portalObj => {
        const portal = portalObj.group;
        const distance = character.position.distanceTo(portal.position);

        if (distance < 5) {
            showNotification(`Portal to ${portalObj.name} Triggered`);

            const primaryColors = [0xFF0000, 0x00FF00, 0x0000FF];
            const randomColor = primaryColors[Math.floor(Math.random() * primaryColors.length)];
            portalObj.innerPortal.material.color.setHex(randomColor);

            if (!portalActivated) {
                portalActivated = true;
                fadeOutToWhite();
            }
        } else {
            portalObj.innerPortal.material.color.setHex(0xFFFFFF);
        }

        if (portalObj.labelMesh) {
            const frame = Math.floor(currentTime / 100);
            portalObj.labelMesh.position.y =
                portalObj.labelStartY + Math.sin(frame * 0.2 + portalObj.group.position.x) * 0.2;
        }
    });

    // Render
    if (camera && scene) {
        renderer.render(scene, camera);
    }
}

// Make available globally
window.animate = animate;

