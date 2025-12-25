// Cow system for 3D Demo - Refactored to use shared utilities

// Entity list
const cowList = getEntityList('cows') || [];

// System registration
const CowSystem = createEntitySystem('cow', 'cows', initCows, updateCows);

// Create a single cow visual entity
function createCow(id, x, z) {
    const group = new THREE.Group();

    // Holstein cow colors (black and white) or brown
    const isHolstein = Math.random() < 0.7;
    const mainColor = isHolstein ? 0xFFFFFF : 0x8B4513;

    const cowMaterial = new THREE.MeshLambertMaterial({ color: mainColor });
    const spotMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const bellyMaterial = new THREE.MeshLambertMaterial({ color: 0xF5DEB3 });
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
    const hoofMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

    // Body
    const bodyGeo = new THREE.CylinderGeometry(1.0, 1.1, 2.8, 8);
    const body = new THREE.Mesh(bodyGeo, cowMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 2.0;
    group.add(body);

    // Spots
    if (isHolstein) {
        const spotGeo = new THREE.SphereGeometry(0.4, 6, 6);
        const numSpots = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numSpots; i++) {
            const spot = new THREE.Mesh(spotGeo, spotMaterial);
            const angle = Math.random() * Math.PI * 2;
            const yOffset = (Math.random() - 0.5) * 1.5;
            spot.position.set(Math.cos(angle) * 0.9, 2.0 + yOffset, Math.sin(angle) * 1.2);
            spot.scale.set(0.8 + Math.random() * 0.5, 0.6, 0.8 + Math.random() * 0.5);
            group.add(spot);
        }
    }

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.45, 0.6, 1.2, 6);
    const neck = new THREE.Mesh(neckGeo, cowMaterial);
    neck.position.set(0, 2.6, 1.2);
    neck.rotation.x = -Math.PI / 5;
    group.add(neck);

    // Head group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 3.0, 1.6);
    group.add(headGroup);

    const headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.9);
    const head = new THREE.Mesh(headGeo, cowMaterial);
    headGroup.add(head);

    const snoutGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
    const snout = new THREE.Mesh(snoutGeo, bellyMaterial);
    snout.position.set(0, -0.1, 0.5);
    headGroup.add(snout);

    const noseGeo = new THREE.BoxGeometry(0.35, 0.25, 0.1);
    const nose = new THREE.Mesh(noseGeo, noseMaterial);
    nose.position.set(0, -0.1, 0.72);
    headGroup.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.25, 0.1, 0.3);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.25, 0.1, 0.3);
    headGroup.add(rightEye);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.3, 0.15, 0.2);
    const leftEar = new THREE.Mesh(earGeo, cowMaterial);
    leftEar.position.set(0.4, 0.1, 0);
    leftEar.rotation.z = -0.5;
    headGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, cowMaterial);
    rightEar.position.set(-0.4, 0.1, 0);
    rightEar.rotation.z = 0.5;
    headGroup.add(rightEar);

    // Horns
    const hornGeo = new THREE.ConeGeometry(0.06, 0.3, 6);
    const hornMaterial = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });
    const leftHorn = new THREE.Mesh(hornGeo, hornMaterial);
    leftHorn.position.set(0.25, 0.35, -0.1);
    leftHorn.rotation.z = -0.4;
    leftHorn.rotation.x = -0.2;
    headGroup.add(leftHorn);
    const rightHorn = new THREE.Mesh(hornGeo, hornMaterial);
    rightHorn.position.set(-0.25, 0.35, -0.1);
    rightHorn.rotation.z = 0.4;
    rightHorn.rotation.x = -0.2;
    headGroup.add(rightHorn);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.18, 0.15, 1.4, 6);
    const hoofGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.2, 6);
    const legs = [];

    function createLeg(lx, lz) {
        const legGroup = new THREE.Group();
        legGroup.position.set(lx, 2.0, lz);
        const legMesh = new THREE.Mesh(legGeo, cowMaterial);
        legMesh.position.y = -0.7;
        legGroup.add(legMesh);
        const hoof = new THREE.Mesh(hoofGeo, hoofMaterial);
        hoof.position.y = -1.5;
        legGroup.add(hoof);
        group.add(legGroup);
        return legGroup;
    }

    legs.push(createLeg(0.5, 1.0));
    legs.push(createLeg(-0.5, 1.0));
    legs.push(createLeg(0.5, -1.0));
    legs.push(createLeg(-0.5, -1.0));

    // Udder
    if (Math.random() < 0.6) {
        const udderGeo = new THREE.SphereGeometry(0.3, 6, 6);
        const udderMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
        const udder = new THREE.Mesh(udderGeo, udderMaterial);
        udder.position.set(0, 1.2, -0.5);
        udder.scale.set(1, 0.7, 1);
        group.add(udder);
    }

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.05, 0.03, 1.2, 4);
    const tail = new THREE.Mesh(tailGeo, cowMaterial);
    tail.position.set(0, 1.8, -1.5);
    tail.rotation.x = 0.3;
    group.add(tail);

    const tuftGeo = new THREE.SphereGeometry(0.1, 4, 4);
    const tuftMaterial = new THREE.MeshLambertMaterial({ color: isHolstein ? 0x1a1a1a : 0x654321 });
    const tuft = new THREE.Mesh(tuftGeo, tuftMaterial);
    tuft.position.set(0, 1.2, -1.8);
    group.add(tuft);

    // Initial placement
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    // Random scale
    const scale = 0.9 + Math.random() * 0.2;
    group.scale.set(scale, scale, scale);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, {
        headGroup: headGroup,
        legs: legs,
        tail: tail,
        grazeTimer: 0
    });
}

function initCows() {
    // Cow system ready - animal-spawner.js handles spawning
}

function updateCowState(serverData) {
    handleServerStateUpdate(serverData, cowList, createCow, (cow, data) => {
        const y = getTerrainHeight(data.x, data.z);
        cow.targetPos.set(data.x, y, data.z);
        cow.targetRot = data.ry;
        cow.state = data.state;
    });
}

function updateCows(delta) {
    const config = getConfigSafe('cow');
    if (!config) return;

    const time = getAnimTime();

    cowList.forEach(cow => {
        // Local/spawned cow behavior
        if (isLocalEntity(cow)) {
            updateEntityTimers(cow, delta);

            const distToTarget = getDistance2D(cow.group.position, cow.targetPos);

            // Flee behavior (cows only flee when very close)
            if (handleFleeBehavior(cow, config.flee, 0, 'WALK')) {
                cow.grazeTimer = 0;
            }
            // Grazing behavior
            else if (cow.state === 'GRAZE' && cow.grazeTimer > 0) {
                // Keep grazing
            }
            // Normal wander/graze behavior
            else if (cow.fleeTimer <= 0) {
                if (cow.wanderTimer <= 0 || distToTarget < 1) {
                    const action = Math.random();

                    if (action < config.graze.chance) {
                        // Start grazing
                        cow.state = 'GRAZE';
                        cow.grazeTimer = config.graze.duration * (0.5 + Math.random());
                        cow.wanderTimer = cow.grazeTimer + 1;
                    } else if (action < 0.7) {
                        // Walk somewhere
                        const wanderTarget = calculateWanderTarget(
                            cow.group.position,
                            cow.group.rotation.y,
                            config.wander.minDistance,
                            config.wander.maxDistance
                        );

                        const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                        cow.targetPos.set(wanderTarget.x, newY, wanderTarget.z);
                        cow.targetRot = wanderTarget.angle;
                        cow.state = 'WALK';
                        cow.wanderTimer = config.wander.moveDuration.min +
                            Math.random() * (config.wander.moveDuration.max - config.wander.moveDuration.min);
                    } else {
                        // Idle
                        cow.state = 'IDLE';
                        cow.wanderTimer = config.wander.idleDuration.min +
                            Math.random() * (config.wander.idleDuration.max - config.wander.idleDuration.min);
                    }
                }
            }
        }

        // Movement
        const speed = getMovementSpeed('cow', cow.state);
        if (speed > 0) {
            moveEntityTowardTarget(cow, speed, delta, config.collisionRadius);
        }

        // Rotation
        if (cow.state === 'WALK') {
            rotateEntityTowardTarget(cow, delta, config.animation.rotationSpeed);
        }

        // Animations - from config
        const tailAnim = config.animation.tailSwish;
        if (cow.state === 'WALK') {
            animateQuadrupedLegs(cow.legs, time, config.animation.legSpeed, config.animation.legSwing);
            animateTailSwish(cow.tail, time, tailAnim.walk.speed, tailAnim.walk.amplitude);
        } else if (cow.state === 'GRAZE') {
            animateGrazing(cow.headGroup, time);
            resetLegsToNeutral(cow.legs, delta);
            animateTailSwish(cow.tail, time, tailAnim.graze.speed, tailAnim.graze.amplitude);
        } else {
            resetHeadToNeutral(cow.headGroup, delta);
            resetLegsToNeutral(cow.legs, delta);
            animateTailSwish(cow.tail, time, tailAnim.idle.speed, tailAnim.idle.amplitude);
        }
    });
}

// Export globals
exportEntityGlobals('Cow', {
    initCows, updateCows, updateCowState,
    CowSystem, cowList, createCow
});
