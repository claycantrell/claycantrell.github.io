// Penguin system for 3D Demo - Ice Spikes biome animal

// Entity list
const penguinList = getEntityList('penguins') || [];

// System registration
const PenguinSystem = createEntitySystem('penguin', 'penguins', initPenguins, updatePenguins);

// Create a single penguin visual entity
function createPenguin(id, x, z) {
    const group = new THREE.Group();

    // Materials
    const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const orangeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFA500 });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // Body (black back, white belly)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8);
    const body = new THREE.Mesh(bodyGeo, blackMaterial);
    body.position.y = 0.4;
    group.add(body);

    // White belly
    const bellyGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.7, 8);
    const belly = new THREE.Mesh(bellyGeo, whiteMaterial);
    belly.position.set(0, 0.4, 0.1);
    group.add(belly);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeo, blackMaterial);
    head.position.y = 0.9;
    group.add(head);

    // White face
    const faceGeo = new THREE.CircleGeometry(0.15, 8);
    const face = new THREE.Mesh(faceGeo, whiteMaterial);
    face.position.set(0, 0.9, 0.15);
    face.rotation.y = Math.PI;
    group.add(face);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.08, 0.92, 0.16);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.08, 0.92, 0.16);
    group.add(rightEye);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.05, 0.15, 4);
    const beak = new THREE.Mesh(beakGeo, orangeMaterial);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.85, 0.2);
    group.add(beak);

    // Flippers (wings)
    const flipperGeo = new THREE.BoxGeometry(0.08, 0.4, 0.15);
    const leftFlipper = new THREE.Mesh(flipperGeo, blackMaterial);
    leftFlipper.position.set(0.35, 0.5, 0);
    leftFlipper.rotation.z = -0.3;
    group.add(leftFlipper);
    const rightFlipper = new THREE.Mesh(flipperGeo, blackMaterial);
    rightFlipper.position.set(-0.35, 0.5, 0);
    rightFlipper.rotation.z = 0.3;
    group.add(rightFlipper);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.15, 0.05, 0.2);
    const leftFoot = new THREE.Mesh(footGeo, orangeMaterial);
    leftFoot.position.set(0.12, 0.02, 0.1);
    group.add(leftFoot);
    const rightFoot = new THREE.Mesh(footGeo, orangeMaterial);
    rightFoot.position.set(-0.12, 0.02, 0.1);
    group.add(rightFoot);

    // Initial placement
    const config = getConfigSafe('penguin') || { heightOffset: 0 };
    const terrainY = getTerrainHeight(x, z);
    const y = terrainY + (config.heightOffset || 0);
    group.position.set(x, y, z);

    // Random scale
    const scale = 0.9 + Math.random() * 0.2;
    group.scale.set(scale, scale, scale);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, {
        flippers: [leftFlipper, rightFlipper]
    });
}

function initPenguins() {
    // Penguin system ready - animal-spawner.js handles spawning
}

function updatePenguinState(serverData) {
    handleServerStateUpdate(serverData, penguinList, createPenguin, (penguin, data) => {
        const y = getTerrainHeight(data.x, data.z);
        penguin.targetPos.set(data.x, y, data.z);
        penguin.targetRot = data.ry;
        penguin.state = data.state;
    });
}

function updatePenguins(delta) {
    const config = getConfigSafe('penguin');
    if (!config) return;

    const time = getAnimTime(3);

    penguinList.forEach(penguin => {
        // Local/spawned penguin behavior
        if (isLocalEntity(penguin)) {
            updateEntityTimers(penguin, delta);

            // Flee behavior
            if (handleFleeBehavior(penguin, config.flee, 0, 'WADDLE')) {
                // Fleeing handled
            } else if (penguin.fleeTimer <= 0) {
                // Wander
                const distToTarget = getDistance2D(penguin.group.position, penguin.targetPos);

                if (penguin.wanderTimer <= 0 || distToTarget < 1) {
                    const wanderTarget = calculateWanderTarget(
                        penguin.group.position,
                        penguin.group.rotation.y,
                        config.wander.minDistance,
                        config.wander.maxDistance
                    );

                    const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                    penguin.targetPos.set(wanderTarget.x, newY, wanderTarget.z);
                    penguin.targetRot = wanderTarget.angle;

                    // Random state selection
                    penguin.state = Math.random() < 0.5 ? 'WADDLE' : 'IDLE';

                    penguin.wanderTimer = penguin.state === 'IDLE'
                        ? config.wander.idleDuration.min + Math.random() * (config.wander.idleDuration.max - config.wander.idleDuration.min)
                        : config.wander.moveDuration.min + Math.random() * (config.wander.moveDuration.max - config.wander.moveDuration.min);
                }
            }
        }

        // Movement
        const moveSpeed = getMovementSpeed('penguin', penguin.state);
        if (moveSpeed > 0) {
            moveEntityTowardTarget(penguin, moveSpeed, delta, config.collisionRadius);
        }

        // Rotation
        if (penguin.state === 'WADDLE') {
            rotateEntityTowardTarget(penguin, delta, config.animation.rotationSpeed);
            // Waddle animation - rock side to side
            if (penguin.flippers && penguin.flippers.length >= 2) {
                const waddle = Math.sin(time * 8) * 0.2;
                penguin.group.rotation.z = waddle;
            }
        } else {
            penguin.group.rotation.z = 0;
        }
    });
}

// Export globals
exportEntityGlobals('Penguin', {
    initPenguins, updatePenguins, updatePenguinState,
    PenguinSystem, penguinList, createPenguin
});
