// Animal Behaviors - Shared flee, wander, and movement logic for all animals
// Consolidates duplicated behavior patterns from entity files

/**
 * Update entity timers (call at start of update loop)
 * @param {Object} entity - Entity with wanderTimer, fleeTimer
 * @param {number} delta - Time delta
 */
function updateEntityTimers(entity, delta) {
    entity.wanderTimer = (entity.wanderTimer || 0) - delta;
    entity.fleeTimer = (entity.fleeTimer || 0) - delta;
    if (entity.grazeTimer !== undefined) {
        entity.grazeTimer = (entity.grazeTimer || 0) - delta;
    }
}

/**
 * Handle flee behavior when player is too close
 * @param {Object} entity - Entity object with group, targetPos, state
 * @param {Object} fleeConfig - Flee config (detectRadius, panicRadius, distance, panicBonus, duration)
 * @param {number} heightOffset - Height offset above terrain (default 0)
 * @param {string} fleeState - State to set when fleeing (default 'RUN')
 * @returns {boolean} True if fleeing was triggered
 */
function handleFleeBehavior(entity, fleeConfig, heightOffset = 0, fleeState = 'RUN') {
    const distToPlayer = getDistanceToPlayer(entity.group.position);

    if (distToPlayer < fleeConfig.detectRadius) {
        // Calculate panic bonus if very close
        const panicBonus = distToPlayer < fleeConfig.panicRadius ? (fleeConfig.panicBonus || 0) : 0;
        const fleeTarget = calculateFleeTarget(entity.group.position, fleeConfig.distance, panicBonus);

        if (fleeTarget) {
            const terrainY = getTerrainHeight(fleeTarget.x, fleeTarget.z);
            entity.targetPos.set(fleeTarget.x, terrainY + heightOffset, fleeTarget.z);
            entity.targetRot = fleeTarget.angle;
            entity.state = fleeState;
            entity.fleeTimer = fleeConfig.duration;
            entity.wanderTimer = fleeConfig.duration + 1;
            entity.isFleeing = true;
            return true;
        }
    }

    return false;
}

/**
 * Handle wander behavior when not fleeing
 * @param {Object} entity - Entity object
 * @param {Object} wanderConfig - Wander config (minDistance, maxDistance, idleDuration, moveDuration)
 * @param {number} heightOffset - Height offset above terrain
 * @param {string} moveState - State when moving (default 'WALK')
 * @param {string} idleState - State when idle (default 'IDLE')
 * @returns {boolean} True if new wander target was set
 */
function handleWanderBehavior(entity, wanderConfig, heightOffset = 0, moveState = 'WALK', idleState = 'IDLE') {
    if (entity.fleeTimer > 0) {
        return false; // Still fleeing
    }

    entity.isFleeing = false;
    const distToTarget = getDistance2D(entity.group.position, entity.targetPos);

    if (entity.wanderTimer <= 0 || distToTarget < 1) {
        // Decide: idle or move?
        if (entity.state === moveState || Math.random() < 0.5) {
            // Set new wander target
            const wanderTarget = calculateWanderTarget(
                entity.group.position,
                entity.group.rotation.y,
                wanderConfig.minDistance,
                wanderConfig.maxDistance
            );

            const terrainY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
            entity.targetPos.set(wanderTarget.x, terrainY + heightOffset, wanderTarget.z);
            entity.targetRot = wanderTarget.angle;
            entity.state = moveState;
            entity.wanderTimer = wanderConfig.moveDuration.min +
                Math.random() * (wanderConfig.moveDuration.max - wanderConfig.moveDuration.min);
            return true;
        } else {
            // Go idle
            entity.state = idleState;
            entity.wanderTimer = wanderConfig.idleDuration.min +
                Math.random() * (wanderConfig.idleDuration.max - wanderConfig.idleDuration.min);
            return false;
        }
    }

    return false;
}

/**
 * Handle bunny-specific hopping wander (alternates HOP -> IDLE)
 * @param {Object} entity - Bunny entity
 * @param {Object} wanderConfig - Wander config
 * @param {number} heightOffset - Height offset
 * @returns {boolean} True if new target was set
 */
function handleHopWanderBehavior(entity, wanderConfig, heightOffset = 0) {
    if (entity.fleeTimer > 0) {
        entity.isFleeing = true;
        return false;
    }

    entity.isFleeing = false;
    const distToTarget = getDistance2D(entity.group.position, entity.targetPos);

    if (entity.wanderTimer <= 0 || distToTarget < 0.5) {
        if (entity.state === 'HOP') {
            // Was hopping, now idle
            entity.state = 'IDLE';
            entity.wanderTimer = wanderConfig.idleDuration.min +
                Math.random() * (wanderConfig.idleDuration.max - wanderConfig.idleDuration.min);
            return false;
        } else {
            // Was idle, now hop
            const wanderTarget = calculateWanderTarget(
                entity.group.position,
                entity.group.rotation.y,
                wanderConfig.minDistance,
                wanderConfig.maxDistance
            );

            const terrainY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
            entity.targetPos.set(wanderTarget.x, terrainY + heightOffset, wanderTarget.z);
            entity.targetRot = wanderTarget.angle;
            entity.state = 'HOP';
            entity.hopPhase = Math.random() * Math.PI * 2;
            entity.wanderTimer = wanderConfig.moveDuration.min +
                Math.random() * (wanderConfig.moveDuration.max - wanderConfig.moveDuration.min);
            return true;
        }
    }

    return false;
}

/**
 * Move entity toward target with collision detection
 * @param {Object} entity - Entity with group, targetPos
 * @param {number} speed - Movement speed
 * @param {number} delta - Time delta
 * @param {number} collisionRadius - Collision radius
 * @param {boolean} followTerrain - Whether to follow terrain height (default true)
 * @returns {boolean} True if entity moved
 */
function moveEntityTowardTarget(entity, speed, delta, collisionRadius, followTerrain = true) {
    if (speed <= 0) return false;

    const dir = new THREE.Vector3().subVectors(entity.targetPos, entity.group.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.5) return false; // Arrived

    dir.normalize().multiplyScalar(speed * delta);

    const newX = entity.group.position.x + dir.x;
    const newZ = entity.group.position.z + dir.z;

    // Check for block collisions
    if (typeof checkBlockCollision === 'function') {
        const collidingBlock = checkBlockCollision(newX, newZ, entity.group.position.y, collisionRadius);

        if (collidingBlock) {
            if (typeof findAlternativePath === 'function') {
                const altPath = findAlternativePath(entity.group.position, collidingBlock, speed, delta, collisionRadius);
                if (altPath) {
                    entity.group.position.x = altPath.x;
                    entity.group.position.z = altPath.z;
                    if (followTerrain) {
                        entity.group.position.y = getTerrainHeight(entity.group.position.x, entity.group.position.z);
                    }
                    return true;
                }
            }
            return false; // Blocked
        }
    }

    // Move freely
    entity.group.position.add(dir);

    if (followTerrain) {
        entity.group.position.y = getTerrainHeight(entity.group.position.x, entity.group.position.z);
    }

    return true;
}

/**
 * Rotate entity toward target rotation
 * @param {Object} entity - Entity with group, targetRot
 * @param {number} delta - Time delta
 * @param {number} rotationSpeed - Rotation speed
 */
function rotateEntityTowardTarget(entity, delta, rotationSpeed) {
    entity.group.rotation.y = smoothRotateToward(
        entity.group.rotation.y,
        entity.targetRot || 0,
        delta,
        rotationSpeed
    );
}

/**
 * Get movement speed for entity based on state
 * @param {string} entityType - Entity type (bunny, deer, cow, bird)
 * @param {string} state - Current state
 * @param {boolean} isFleeing - Whether entity is fleeing
 * @returns {number} Movement speed
 */
function getMovementSpeed(entityType, state, isFleeing = false) {
    // Get speeds from ENTITY_CONFIG - single source of truth
    const config = typeof ENTITY_CONFIG !== 'undefined' ? ENTITY_CONFIG[entityType] : null;

    if (!config) {
        // Fallback if config not loaded
        return state === 'IDLE' ? 0 : 10.0;
    }

    switch (entityType) {
        case 'bunny':
            if (state !== 'HOP') return 0;
            return isFleeing ? (config.fleeSpeed || 17.0) : (config.speed || 8.0);

        case 'deer':
            if (state === 'RUN') return config.speed || 18.0;
            if (state === 'WALK') return config.walkSpeed || 6.0;
            return 0;

        case 'cow':
            if (state === 'WALK') return config.speed || 5.0;
            return 0;

        case 'bird':
            return config.speed || 12.0;

        default:
            return state === 'IDLE' ? 0 : (config.speed || 10.0);
    }
}

// Make available globally
window.updateEntityTimers = updateEntityTimers;
window.handleFleeBehavior = handleFleeBehavior;
window.handleWanderBehavior = handleWanderBehavior;
window.handleHopWanderBehavior = handleHopWanderBehavior;
window.moveEntityTowardTarget = moveEntityTowardTarget;
window.rotateEntityTowardTarget = rotateEntityTowardTarget;
window.getMovementSpeed = getMovementSpeed;
