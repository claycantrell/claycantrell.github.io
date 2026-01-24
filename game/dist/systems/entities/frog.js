// Frog system for 3D Demo - Swamp biome animal

// Entity list
const frogList = getEntityList('frogs') || [];

// System registration
const FrogSystem = createEntitySystem('frog', 'frogs', initFrogs, updateFrogs);

// Create a single frog visual entity
function createFrog(id, x, z) {
    const group = new THREE.Group();

    // Materials - various frog colors
    const colors = [0x228B22, 0x32CD32, 0x3CB371, 0x556B2F];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const frogMaterial = new THREE.MeshLambertMaterial({ color: color });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
    const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // Body (flattened sphere)
    const bodyGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const body = new THREE.Mesh(bodyGeo, frogMaterial);
    body.scale.set(1, 0.6, 1.3);
    body.position.y = 0.15;
    group.add(body);

    // Head (part of body, just eyes on top)
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.12, 0.25, 0.15);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.12, 0.25, 0.15);
    group.add(rightEye);

    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.03, 4, 4);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
    leftPupil.position.set(0, 0, 0.05);
    leftEye.add(leftPupil);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
    rightPupil.position.set(0, 0, 0.05);
    rightEye.add(rightPupil);

    // Legs (small)
    const legGeo = new THREE.BoxGeometry(0.08, 0.08, 0.15);
    const frontLeftLeg = new THREE.Mesh(legGeo, frogMaterial);
    frontLeftLeg.position.set(0.15, 0.04, 0.15);
    group.add(frontLeftLeg);
    const frontRightLeg = new THREE.Mesh(legGeo, frogMaterial);
    frontRightLeg.position.set(-0.15, 0.04, 0.15);
    group.add(frontRightLeg);

    // Back legs (larger for hopping)
    const backLegGeo = new THREE.BoxGeometry(0.1, 0.08, 0.25);
    const backLeftLeg = new THREE.Mesh(backLegGeo, frogMaterial);
    backLeftLeg.position.set(0.2, 0.04, -0.15);
    group.add(backLeftLeg);
    const backRightLeg = new THREE.Mesh(backLegGeo, frogMaterial);
    backRightLeg.position.set(-0.2, 0.04, -0.15);
    group.add(backRightLeg);

    // Initial placement
    const config = getConfigSafe('frog') || { heightOffset: 0.15 };
    const terrainY = getTerrainHeight(x, z);
    const y = terrainY + (config.heightOffset || 0.15);
    group.position.set(x, y, z);

    // Random scale
    const scale = 0.7 + Math.random() * 0.6;
    group.scale.set(scale, scale, scale);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, {
        hopPhase: 0
    });
}

function initFrogs() {
    // Frog system ready - animal-spawner.js handles spawning
}

function updateFrogState(serverData) {
    handleServerStateUpdate(serverData, frogList, createFrog, (frog, data) => {
        const config = ENTITY_CONFIG.frog;
        const terrainY = getTerrainHeight(data.x, data.z);
        frog.targetPos.set(data.x, terrainY + config.heightOffset, data.z);
        frog.state = data.state;
    });
}

function updateFrogs(delta) {
    const config = getConfigSafe('frog');
    if (!config) return;

    frogList.forEach(frog => {
        // Local/spawned frog behavior
        if (isLocalEntity(frog)) {
            updateEntityTimers(frog, delta);

            // Try flee first, then wander
            if (!handleFleeBehavior(frog, config.flee, config.heightOffset, 'HOP')) {
                handleHopWanderBehavior(frog, config.wander, config.heightOffset);
            }
        }

        // Get terrain height
        const currentTerrainY = getTerrainHeight(frog.group.position.x, frog.group.position.z);
        const baseHeight = currentTerrainY + config.heightOffset;

        // Movement and animation
        if (frog.state === 'HOP') {
            const speed = getMovementSpeed('frog', frog.state, frog.isFleeing);
            moveEntityTowardTarget(frog, speed, delta, config.collisionRadius, false);

            // Hop animation
            const hopFreq = frog.isFleeing ? config.animation.hopFrequencyFlee : config.animation.hopFrequency;
            const hopOffset = animateHop(frog, baseHeight, delta, hopFreq, config.animation.hopHeight);
            frog.group.position.y = Math.max(baseHeight + hopOffset, currentTerrainY + 0.1);

            // Face movement direction
            rotateEntityTowardTarget(frog, delta, config.animation.rotationSpeed);
        } else {
            // Idle - stay on ground
            frog.group.position.y = Math.max(baseHeight, currentTerrainY + 0.1);
        }
    });
}

// Export globals
exportEntityGlobals('Frog', {
    initFrogs, updateFrogs, updateFrogState,
    FrogSystem, frogList, createFrog
});
