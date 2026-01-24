// Salamander system for 3D Demo - Volcanic Peaks biome animal

const salamanderList = getEntityList('salamanders') || [];
const SalamanderSystem = createEntitySystem('salamander', 'salamanders', initSalamanders, updateSalamanders);

function createSalamander(id, x, z) {
    const group = new THREE.Group();

    // Fire-resistant colors (red/orange/black)
    const colors = [0xFF4500, 0xFF6347, 0xDC143C, 0x8B0000];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const salamanderMaterial = new THREE.MeshLambertMaterial({ color: color });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });

    // Body (elongated)
    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8);
    const body = new THREE.Mesh(bodyGeo, salamanderMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.15;
    group.add(body);

    // Head
    const headGeo = new THREE.ConeGeometry(0.12, 0.2, 8);
    const head = new THREE.Mesh(headGeo, salamanderMaterial);
    head.rotation.x = -Math.PI / 2;
    head.position.set(0, 0.15, 0.5);
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.08, 0.18, 0.55);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.08, 0.18, 0.55);
    group.add(rightEye);

    // Tail
    const tailGeo = new THREE.ConeGeometry(0.1, 0.4, 6);
    const tail = new THREE.Mesh(tailGeo, salamanderMaterial);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0.12, -0.5);
    group.add(tail);

    // Legs (small)
    const legGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.15, 6);
    const legs = [];

    function createLeg(lx, lz) {
        const legMesh = new THREE.Mesh(legGeo, salamanderMaterial);
        legMesh.position.set(lx, 0.08, lz);
        group.add(legMesh);
        return legMesh;
    }

    legs.push(createLeg(0.12, 0.2));
    legs.push(createLeg(-0.12, 0.2));
    legs.push(createLeg(0.12, -0.2));
    legs.push(createLeg(-0.12, -0.2));

    const config = getConfigSafe('salamander') || { heightOffset: 0.15 };
    const terrainY = getTerrainHeight(x, z);
    const y = terrainY + config.heightOffset;
    group.position.set(x, y, z);

    const scale = 0.7 + Math.random() * 0.6;
    group.scale.set(scale, scale, scale);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, { legs: legs });
}

function initSalamanders() {}

function updateSalamanderState(serverData) {
    handleServerStateUpdate(serverData, salamanderList, createSalamander, (salamander, data) => {
        const config = ENTITY_CONFIG.salamander;
        const terrainY = getTerrainHeight(data.x, data.z);
        salamander.targetPos.set(data.x, terrainY + config.heightOffset, data.z);
        salamander.state = data.state;
    });
}

function updateSalamanders(delta) {
    const config = getConfigSafe('salamander');
    if (!config) return;

    salamanderList.forEach(salamander => {
        if (isLocalEntity(salamander)) {
            updateEntityTimers(salamander, delta);

            if (!handleFleeBehavior(salamander, config.flee, config.heightOffset, 'CRAWL')) {
                const distToTarget = getDistance2D(salamander.group.position, salamander.targetPos);

                if (salamander.wanderTimer <= 0 || distToTarget < 1.5) {
                    const wanderTarget = calculateWanderTarget(
                        salamander.group.position,
                        salamander.group.rotation.y,
                        config.wander.minDistance,
                        config.wander.maxDistance
                    );

                    const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                    salamander.targetPos.set(wanderTarget.x, newY + config.heightOffset, wanderTarget.z);
                    salamander.targetRot = wanderTarget.angle;
                    salamander.state = Math.random() < 0.6 ? 'IDLE' : 'CRAWL';

                    salamander.wanderTimer = salamander.state === 'IDLE'
                        ? config.wander.idleDuration.min + Math.random() * (config.wander.idleDuration.max - config.wander.idleDuration.min)
                        : config.wander.moveDuration.min + Math.random() * (config.wander.moveDuration.max - config.wander.moveDuration.min);
                }
            }
        }

        const moveSpeed = getMovementSpeed('salamander', salamander.state);
        if (moveSpeed > 0) {
            moveEntityTowardTarget(salamander, moveSpeed, delta, config.collisionRadius);
        }

        if (salamander.state === 'CRAWL') {
            rotateEntityTowardTarget(salamander, delta, config.animation.rotationSpeed);
        }
    });
}

exportEntityGlobals('Salamander', {
    initSalamanders, updateSalamanders, updateSalamanderState,
    SalamanderSystem, salamanderList, createSalamander
});
