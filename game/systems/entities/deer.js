// Deer system for 3D Demo - Refactored to use shared utilities

// Entity list
const deerList = getEntityList('deer') || [];

// System registration
const DeerSystem = createEntitySystem('deer', 'deer', initDeer, updateDeer);

// Create a single deer visual entity
function createDeer(id, x, z) {
    const group = new THREE.Group();

    // Materials
    const deerMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const bellyMaterial = new THREE.MeshLambertMaterial({ color: 0xD2B48C });
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const antlerMaterial = new THREE.MeshLambertMaterial({ color: 0xEEE8AA });
    const tailMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.8, 2.5, 7);
    const body = new THREE.Mesh(bodyGeo, deerMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 2.5;
    group.add(body);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.5, 6);
    const neck = new THREE.Mesh(neckGeo, deerMaterial);
    neck.position.set(0, 3.4, 1.0);
    neck.rotation.x = -Math.PI / 4;
    group.add(neck);

    // Head group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 4.0, 1.4);
    group.add(headGroup);

    const headGeo = new THREE.ConeGeometry(0.35, 1.2, 6);
    const head = new THREE.Mesh(headGeo, bellyMaterial);
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.3;
    headGroup.add(head);

    const noseGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const nose = new THREE.Mesh(noseGeo, noseMaterial);
    nose.position.set(0, 0, 0.9);
    headGroup.add(nose);

    // Antlers or ears
    if (Math.random() < 0.5) {
        const antlerGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2);
        const leftAntler = new THREE.Mesh(antlerGeo, antlerMaterial);
        leftAntler.position.set(0.3, 0.6, -0.2);
        leftAntler.rotation.z = -0.5;
        leftAntler.rotation.x = -0.2;
        headGroup.add(leftAntler);
        const rightAntler = new THREE.Mesh(antlerGeo, antlerMaterial);
        rightAntler.position.set(-0.3, 0.6, -0.2);
        rightAntler.rotation.z = 0.5;
        rightAntler.rotation.x = -0.2;
        headGroup.add(rightAntler);
    } else {
        const earGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
        const leftEar = new THREE.Mesh(earGeo, deerMaterial);
        leftEar.position.set(0.3, 0.3, -0.2);
        leftEar.rotation.z = -0.8;
        headGroup.add(leftEar);
        const rightEar = new THREE.Mesh(earGeo, deerMaterial);
        rightEar.position.set(-0.3, 0.3, -0.2);
        rightEar.rotation.z = 0.8;
        headGroup.add(rightEar);
    }

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.8, 5);
    const legs = [];

    function createLeg(lx, lz) {
        const legGroup = new THREE.Group();
        legGroup.position.set(lx, 2.5, lz);
        const legMesh = new THREE.Mesh(legGeo, deerMaterial);
        legMesh.position.y = -0.9;
        legGroup.add(legMesh);
        group.add(legGroup);
        return legGroup;
    }

    legs.push(createLeg(0.4, 0.9));
    legs.push(createLeg(-0.4, 0.9));
    legs.push(createLeg(0.4, -0.9));
    legs.push(createLeg(-0.4, -0.9));

    // Tail
    const tailGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const tail = new THREE.Mesh(tailGeo, tailMaterial);
    tail.position.set(0, 2.8, -1.3);
    tail.rotation.x = 0.8;
    group.add(tail);

    // Initial placement
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, {
        headGroup: headGroup,
        legs: legs
    });
}

function initDeer() {
    // Deer system ready - animal-spawner.js handles spawning
}

function updateDeerState(serverData) {
    handleServerStateUpdate(serverData, deerList, createDeer, (deer, data) => {
        const y = getTerrainHeight(data.x, data.z);
        deer.targetPos.set(data.x, y, data.z);
        deer.targetRot = data.ry;
        deer.state = data.state;
    });
}

function updateDeer(delta) {
    const config = getConfigSafe('deer');
    if (!config) return;

    const time = getAnimTime(5);

    deerList.forEach(deer => {
        // Local/spawned deer behavior
        if (isLocalEntity(deer)) {
            updateEntityTimers(deer, delta);

            // Flee behavior
            if (handleFleeBehavior(deer, config.flee, 0, 'RUN')) {
                // Fleeing handled
            } else if (deer.fleeTimer <= 0) {
                // Wander with random state selection
                const distToTarget = getDistance2D(deer.group.position, deer.targetPos);

                if (deer.wanderTimer <= 0 || distToTarget < 2) {
                    const wanderTarget = calculateWanderTarget(
                        deer.group.position,
                        deer.group.rotation.y,
                        config.wander.minDistance,
                        config.wander.maxDistance
                    );

                    const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                    deer.targetPos.set(wanderTarget.x, newY, wanderTarget.z);
                    deer.targetRot = wanderTarget.angle;

                    // Random state selection
                    const rand = Math.random();
                    if (rand < 0.2) deer.state = 'RUN';
                    else if (rand < 0.6) deer.state = 'WALK';
                    else deer.state = 'IDLE';

                    deer.wanderTimer = deer.state === 'IDLE'
                        ? config.wander.idleDuration.min + Math.random() * (config.wander.idleDuration.max - config.wander.idleDuration.min)
                        : config.wander.moveDuration.min + Math.random() * (config.wander.moveDuration.max - config.wander.moveDuration.min);
                }
            }
        }

        // Movement - uses ENTITY_CONFIG values via getMovementSpeed
        const moveSpeed = getMovementSpeed('deer', deer.state);
        if (moveSpeed > 0) {
            moveEntityTowardTarget(deer, moveSpeed, delta, config.collisionRadius);
        }

        // Rotation
        if (deer.state === 'WALK' || deer.state === 'RUN') {
            rotateEntityTowardTarget(deer, delta, config.animation.rotationSpeed);
        }

        // Leg animation - from config
        if (deer.state === 'WALK' || deer.state === 'RUN') {
            const legSpeed = deer.state === 'RUN' ? config.animation.runLegSpeed : config.animation.walkLegSpeed;
            animateQuadrupedLegs(deer.legs, time, legSpeed, config.animation.legSwing);
        } else {
            resetLegsToNeutral(deer.legs, delta);
        }
    });
}

// Export globals
exportEntityGlobals('Deer', {
    initDeer, updateDeer, updateDeerState,
    DeerSystem, deerList, createDeer
});
