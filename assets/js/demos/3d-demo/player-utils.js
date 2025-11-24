// Utility to get all active players (local + remote) for animal AI
function getAllPlayers() {
    const players = [];
    
    // 1. Add local character
    if (character) {
        // Calculate velocity or movement flag for local player
        const isMoving = (typeof moveForward !== 'undefined' && moveForward) || 
                         (typeof moveBackward !== 'undefined' && moveBackward) || 
                         (typeof isFlying !== 'undefined' && isFlying);
        
        players.push({
            position: character.position,
            isMoving: isMoving
        });
    }

    // 2. Add remote players
    if (typeof window.otherPlayers !== 'undefined') {
        window.otherPlayers.forEach((player) => {
            // Estimate if moving based on distance to target or recent update?
            // interpolateOtherPlayers updates mesh.position towards targetPosition
            // If mesh is moving towards target, they are moving.
            
            const distToTarget = player.mesh.position.distanceTo(player.targetPosition);
            // If interpolating, they are moving. If snapped, they might be still.
            // Also check time since last update to ensure they aren't stale
            const timeSinceUpdate = (performance.now() - player.lastUpdate) / 1000;
            const isMoving = distToTarget > 0.1 && timeSinceUpdate < 1.0;
            
            players.push({
                position: player.mesh.position,
                isMoving: isMoving
            });
        });
    }

    return players;
}

