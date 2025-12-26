// Shared Entity Behaviors
// Common flee, wander, and movement patterns for all entities

/**
 * Calculate distance to player (2D, ignoring Y)
 * @param {THREE.Vector3} entityPos - Entity position
 * @returns {number} Distance to player, or Infinity if no player
 */
function getDistanceToPlayer(entityPos) {
    // Try window.character first (getter from core.js), then GAME.character
    let playerPos = null;
    if (typeof character !== 'undefined' && character) {
        playerPos = character.position;
    } else if (typeof GAME !== 'undefined' && GAME.character) {
        playerPos = GAME.character.position;
    }
    if (!playerPos) return Infinity;

    const dx = entityPos.x - playerPos.x;
    const dz = entityPos.z - playerPos.z;
    return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculate 2D distance between two positions
 * @param {THREE.Vector3} pos1 - First position
 * @param {THREE.Vector3} pos2 - Second position
 * @returns {number} 2D distance (ignoring Y)
 */
function getDistance2D(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculate flee target position (away from player)
 * @param {THREE.Vector3} entityPos - Current entity position
 * @param {number} fleeDistance - How far to flee
 * @param {number} bonusDistance - Extra distance when panicking (default 0)
 * @returns {Object} { x, z, angle } - New target position and facing angle
 */
function calculateFleeTarget(entityPos, fleeDistance, bonusDistance = 0) {
    // Try window.character first (getter from core.js), then GAME.character
    let playerPos = null;
    if (typeof character !== 'undefined' && character) {
        playerPos = character.position;
    } else if (typeof GAME !== 'undefined' && GAME.character) {
        playerPos = GAME.character.position;
    }
    if (!playerPos) return null;

    const fleeAngle = Math.atan2(
        entityPos.x - playerPos.x,
        entityPos.z - playerPos.z
    );

    const totalDistance = fleeDistance + bonusDistance;
    const newX = entityPos.x + Math.sin(fleeAngle) * totalDistance;
    const newZ = entityPos.z + Math.cos(fleeAngle) * totalDistance;

    return {
        x: newX,
        z: newZ,
        angle: fleeAngle
    };
}

/**
 * Calculate wander target position
 * @param {THREE.Vector3} entityPos - Current entity position
 * @param {number} currentRotation - Current Y rotation
 * @param {number} minDistance - Minimum wander distance
 * @param {number} maxDistance - Maximum wander distance
 * @param {number} angleSpread - How much to vary from current direction (radians)
 * @returns {Object} { x, z, angle } - New target position and facing angle
 */
function calculateWanderTarget(entityPos, currentRotation, minDistance, maxDistance, angleSpread = Math.PI) {
    const wanderDist = minDistance + Math.random() * (maxDistance - minDistance);
    const angle = currentRotation + (Math.random() - 0.5) * angleSpread;

    const newX = entityPos.x + Math.sin(angle) * wanderDist;
    const newZ = entityPos.z + Math.cos(angle) * wanderDist;

    // Calculate angle to face new target
    const targetAngle = Math.atan2(newX - entityPos.x, newZ - entityPos.z);

    return {
        x: newX,
        z: newZ,
        angle: targetAngle
    };
}

/**
 * Smoothly rotate entity toward target angle
 * @param {number} currentRotation - Current Y rotation
 * @param {number} targetRotation - Target Y rotation
 * @param {number} delta - Time delta
 * @param {number} speed - Rotation speed multiplier (default 3)
 * @returns {number} New rotation value
 */
function smoothRotateToward(currentRotation, targetRotation, delta, speed = 3) {
    let rotDiff = targetRotation - currentRotation;

    // Normalize to -PI to PI
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;

    return currentRotation + rotDiff * delta * speed;
}

/**
 * Move entity toward target with collision detection
 * @param {THREE.Group} group - Entity group to move
 * @param {THREE.Vector3} targetPos - Target position
 * @param {number} speed - Movement speed
 * @param {number} delta - Time delta
 * @param {number} collisionRadius - Entity collision radius
 * @returns {boolean} True if moved, false if blocked or arrived
 */
function moveTowardTarget(group, targetPos, speed, delta, collisionRadius = 0.5) {
    const dir = new THREE.Vector3().subVectors(targetPos, group.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.5) {
        return false; // Arrived at target
    }

    dir.normalize().multiplyScalar(speed * delta);

    const newX = group.position.x + dir.x;
    const newZ = group.position.z + dir.z;

    // Check for block collision
    if (typeof checkBlockCollision === 'function') {
        const collidingBlock = checkBlockCollision(newX, newZ, group.position.y, collisionRadius);

        if (collidingBlock) {
            // Try alternative path
            if (typeof findAlternativePath === 'function') {
                const altPath = findAlternativePath(group.position, collidingBlock, speed, delta, collisionRadius);
                if (altPath) {
                    group.position.x = altPath.x;
                    group.position.z = altPath.z;
                    return true;
                }
            }
            return false; // Blocked
        }
    }

    // Path is clear
    group.position.add(dir);
    return true;
}

/**
 * Add entity to scene with fallback
 * @param {THREE.Object3D} object - Object to add to scene
 */
function addToScene(object) {
    if (typeof GAME !== 'undefined' && GAME.scene) {
        GAME.scene.add(object);
    } else if (typeof scene !== 'undefined') {
        scene.add(object);
    } else {
        console.warn('Scene not available for adding object');
    }
}

/**
 * Enable shadows on all meshes in a group
 * @param {THREE.Group} group - Group to enable shadows on
 */
function enableShadows(group) {
    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}

// Make available globally
window.getDistanceToPlayer = getDistanceToPlayer;
window.getDistance2D = getDistance2D;
window.calculateFleeTarget = calculateFleeTarget;
window.calculateWanderTarget = calculateWanderTarget;
window.smoothRotateToward = smoothRotateToward;
window.moveTowardTarget = moveTowardTarget;
window.addToScene = addToScene;
window.enableShadows = enableShadows;
