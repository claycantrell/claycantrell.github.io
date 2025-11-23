// Main game loop and game logic

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

    // Update character movement
    updateCharacterMovement(delta);

    // Update multiplayer (send position, receive others, interpolate)
    updateMultiplayer();
    interpolateOtherPlayers(delta);

    // Update tree LOD (throttled for performance)
    if (PERFORMANCE.rendering.lodEnabled) {
        // Update LOD state (which trees are 3D vs 2D) - throttled
        if (currentTime - lastLODUpdate > PERFORMANCE.rendering.lodUpdateInterval) {
            updateTreeLOD();
            lastLODUpdate = currentTime;
        }
        // Update sprite billboard rotation every frame (cheap operation)
        updateSpriteBillboards();
    }

    // Update NPC behavior
    updateNPC(delta);

    // Portal interaction and label animation
    portals.forEach(portalObj => {
        const portal = portalObj.group;
        const distance = character.position.distanceTo(portal.position);

        if (distance < 5) {
            // Show notification if close to portal
            showNotification(`Portal to ${portalObj.name} Triggered`);

            // Visual effect: Change portal color for interaction
            const primaryColors = [0xFF0000, 0x00FF00, 0x0000FF];
            const randomColor = primaryColors[Math.floor(Math.random() * primaryColors.length)];
            portalObj.innerPortal.material.color.setHex(randomColor);

            // Trigger fade out to white (only once)
            if (!portalActivated) {
                portalActivated = true;
                fadeOutToWhite();
            }
        } else {
            // Restore default color if not near portal
            portalObj.innerPortal.material.color.setHex(0xFFFFFF);
        }

        // Floating label animation (more choppy, less smooth - 90s style)
        if (portalObj.labelMesh) {
            // Use frame-based animation instead of smooth sine wave
            const frame = Math.floor(currentTime / 100); // Update every 100ms (choppier)
            portalObj.labelMesh.position.y =
                portalObj.labelStartY + Math.sin(frame * 0.2 + portalObj.group.position.x) * 0.2;
        }
    });

    // Only render if camera is valid (performance check)
    if (camera && scene) {
        renderer.render(scene, camera);
    }
}

