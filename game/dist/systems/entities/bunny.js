// Bunny system for 3D Demo - Refactored to use shared utilities

// Entity list
const bunnyList = getEntityList('bunnies') || [];

// System registration
const BunnySystem = createEntitySystem('bunny', 'bunnies', initBunnies, updateBunnies);

// Create a single bunny visual entity
function createBunny(id, x, z) {
    const group = new THREE.Group();

    // Materials
    const colors = [0xFFFFFF, 0xDCDCDC, 0xD2B48C, 0xA9A9A9];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const bunnyMaterial = new THREE.MeshLambertMaterial({ color: color });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.4, 6, 6);
    const body = new THREE.Mesh(bodyGeo, bunnyMaterial);
    body.scale.set(1, 0.8, 1.2);
    body.position.y = 0.4;
    group.add(body);

    // Head group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.7, 0.5);
    group.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.25, 6, 6);
    const head = new THREE.Mesh(headGeo, bunnyMaterial);
    headGroup.add(head);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.15, 0.05, 0.2);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.15, 0.05, 0.2);
    headGroup.add(rightEye);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.1, 0.6, 0.05);
    const leftEar = new THREE.Mesh(earGeo, bunnyMaterial);
    leftEar.position.set(0.1, 0.4, 0);
    leftEar.rotation.x = -0.2;
    leftEar.rotation.z = 0.2;
    headGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, bunnyMaterial);
    rightEar.position.set(-0.1, 0.4, 0);
    rightEar.rotation.x = -0.2;
    rightEar.rotation.z = -0.2;
    headGroup.add(rightEar);

    // Tail
    const tailGeo = new THREE.SphereGeometry(0.15, 4, 4);
    const tail = new THREE.Mesh(tailGeo, bunnyMaterial);
    tail.position.set(0, 0.3, -0.6);
    group.add(tail);

    // Initial placement
    const config = getConfigSafe('bunny') || { heightOffset: 0.4 };
    const terrainY = getTerrainHeight(x, z);
    const y = terrainY + (config.heightOffset || 0.4);
    group.position.set(x, y, z);

    // Random scale
    const scale = 0.8 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, {
        ears: [leftEar, rightEar],
        hopPhase: 0
    });
}

function initBunnies() {
    // Bunny system ready - animal-spawner.js handles spawning
}

function updateBunnyState(serverData) {
    handleServerStateUpdate(serverData, bunnyList, createBunny, (bunny, data) => {
        const config = ENTITY_CONFIG.bunny;
        const terrainY = getTerrainHeight(data.x, data.z);
        bunny.targetPos.set(data.x, terrainY + config.heightOffset, data.z);
        bunny.state = data.state;
    });
}

function updateBunnies(delta) {
    const config = getConfigSafe('bunny');
    if (!config) return;

    const time = getAnimTime();

    bunnyList.forEach(bunny => {
        // Local/spawned bunny behavior
        if (isLocalEntity(bunny)) {
            updateEntityTimers(bunny, delta);

            // Try flee first, then wander
            if (!handleFleeBehavior(bunny, config.flee, config.heightOffset, 'HOP')) {
                handleHopWanderBehavior(bunny, config.wander, config.heightOffset);
            }
        }

        // Get terrain height
        const currentTerrainY = getTerrainHeight(bunny.group.position.x, bunny.group.position.z);
        const baseHeight = currentTerrainY + config.heightOffset;

        // Movement and animation
        if (bunny.state === 'HOP') {
            const speed = getMovementSpeed('bunny', bunny.state, bunny.isFleeing);
            moveEntityTowardTarget(bunny, speed, delta, config.collisionRadius, false);

            // Hop animation
            const hopFreq = bunny.isFleeing ? config.animation.hopFrequencyFlee : config.animation.hopFrequency;
            const hopOffset = animateHop(bunny, baseHeight, delta, hopFreq, config.animation.hopHeight);
            bunny.group.position.y = Math.max(baseHeight + hopOffset, currentTerrainY + 0.2);

            // Face movement direction
            rotateEntityTowardTarget(bunny, delta, config.animation.rotationSpeed);
        } else {
            // Idle - stay on ground, twitch ears
            bunny.group.position.y = Math.max(baseHeight, currentTerrainY + 0.2);
            animateEarTwitch(bunny.ears, time, config.animation.earTwitchSpeed, config.animation.earTwitchAmplitude);
        }
    });
}

// Export globals
exportEntityGlobals('Bunny', {
    initBunnies, updateBunnies, updateBunnyState,
    BunnySystem, bunnyList, createBunny
});
