// Crab system for 3D Demo - Mangrove Swamp biome animal

const crabList = getEntityList('crabs') || [];
const CrabSystem = createEntitySystem('crab', 'crabs', initCrabs, updateCrabs);

function createCrab(id, x, z) {
    const group = new THREE.Group();
    const crabMaterial = new THREE.MeshLambertMaterial({ color: 0xFF4500 });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.2, 0.3);
    const body = new THREE.Mesh(bodyGeo, crabMaterial);
    body.position.y = 0.1;
    group.add(body);

    // Claws
    const clawGeo = new THREE.BoxGeometry(0.15, 0.1, 0.1);
    const leftClaw = new THREE.Mesh(clawGeo, crabMaterial);
    leftClaw.position.set(0.25, 0.12, 0.2);
    group.add(leftClaw);
    const rightClaw = new THREE.Mesh(clawGeo, crabMaterial);
    rightClaw.position.set(-0.25, 0.12, 0.2);
    group.add(rightClaw);

    // Eye stalks
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.12, 0.25, 0.1);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.12, 0.25, 0.1);
    group.add(rightEye);

    const config = getConfigSafe('crab') || { heightOffset: 0.1 };
    const terrainY = getTerrainHeight(x, z);
    const y = terrainY + config.heightOffset;
    group.position.set(x, y, z);

    const scale = 0.8 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, { claws: [leftClaw, rightClaw] });
}

function initCrabs() {}

function updateCrabState(serverData) {
    handleServerStateUpdate(serverData, crabList, createCrab, (crab, data) => {
        const config = ENTITY_CONFIG.crab;
        const terrainY = getTerrainHeight(data.x, data.z);
        crab.targetPos.set(data.x, terrainY + config.heightOffset, data.z);
        crab.state = data.state;
    });
}

function updateCrabs(delta) {
    const config = getConfigSafe('crab');
    if (!config) return;

    crabList.forEach(crab => {
        if (isLocalEntity(crab)) {
            updateEntityTimers(crab, delta);

            if (!handleFleeBehavior(crab, config.flee, config.heightOffset, 'SCUTTLE')) {
                const distToTarget = getDistance2D(crab.group.position, crab.targetPos);

                if (crab.wanderTimer <= 0 || distToTarget < 1) {
                    const wanderTarget = calculateWanderTarget(
                        crab.group.position,
                        crab.group.rotation.y,
                        config.wander.minDistance,
                        config.wander.maxDistance
                    );

                    const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                    crab.targetPos.set(wanderTarget.x, newY + config.heightOffset, wanderTarget.z);
                    crab.targetRot = wanderTarget.angle;
                    crab.state = Math.random() < 0.5 ? 'SCUTTLE' : 'IDLE';

                    crab.wanderTimer = crab.state === 'IDLE'
                        ? config.wander.idleDuration.min + Math.random() * (config.wander.idleDuration.max - config.wander.idleDuration.min)
                        : config.wander.moveDuration.min + Math.random() * (config.wander.moveDuration.max - config.wander.moveDuration.min);
                }
            }
        }

        const moveSpeed = getMovementSpeed('crab', crab.state);
        if (moveSpeed > 0) {
            moveEntityTowardTarget(crab, moveSpeed, delta, config.collisionRadius);
        }

        if (crab.state === 'SCUTTLE') {
            rotateEntityTowardTarget(crab, delta, config.animation.rotationSpeed);
        }
    });
}

exportEntityGlobals('Crab', {
    initCrabs, updateCrabs, updateCrabState,
    CrabSystem, crabList, createCrab
});
