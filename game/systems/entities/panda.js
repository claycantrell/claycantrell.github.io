// Panda system for 3D Demo - Bamboo Jungle biome animal

// Entity list
const pandaList = getEntityList('pandas') || [];

// System registration
const PandaSystem = createEntitySystem('panda', 'pandas', initPandas, updatePandas);

// Create a single panda visual entity
function createPanda(id, x, z) {
    const group = new THREE.Group();

    // Materials
    const whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // Body (white with black patches)
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.5, 8);
    const body = new THREE.Mesh(bodyGeo, whiteMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 1.5;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const head = new THREE.Mesh(headGeo, whiteMaterial);
    head.position.set(0, 2.2, 0.6);
    group.add(head);

    // Black ears
    const earGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const leftEar = new THREE.Mesh(earGeo, blackMaterial);
    leftEar.position.set(0.25, 2.5, 0.4);
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, blackMaterial);
    rightEar.position.set(-0.25, 2.5, 0.4);
    group.add(rightEar);

    // Black eye patches
    const eyePatchGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const leftEyePatch = new THREE.Mesh(eyePatchGeo, blackMaterial);
    leftEyePatch.position.set(0.15, 2.2, 0.9);
    group.add(leftEyePatch);
    const rightEyePatch = new THREE.Mesh(eyePatchGeo, blackMaterial);
    rightEyePatch.position.set(-0.15, 2.2, 0.9);
    group.add(rightEyePatch);

    // Black legs
    const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 1.2, 6);
    const legs = [];

    function createLeg(lx, lz) {
        const legMesh = new THREE.Mesh(legGeo, blackMaterial);
        legMesh.position.set(lx, 0.6, lz);
        group.add(legMesh);
        return legMesh;
    }

    legs.push(createLeg(0.35, 0.5));
    legs.push(createLeg(-0.35, 0.5));
    legs.push(createLeg(0.35, -0.5));
    legs.push(createLeg(-0.35, -0.5));

    // Initial placement
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, {
        legs: legs
    });
}

function initPandas() {
    // Panda system ready - animal-spawner.js handles spawning
}

function updatePandaState(serverData) {
    handleServerStateUpdate(serverData, pandaList, createPanda, (panda, data) => {
        const y = getTerrainHeight(data.x, data.z);
        panda.targetPos.set(data.x, y, data.z);
        panda.targetRot = data.ry;
        panda.state = data.state;
    });
}

function updatePandas(delta) {
    const config = getConfigSafe('panda');
    if (!config) return;

    const time = getAnimTime(5);

    pandaList.forEach(panda => {
        // Local/spawned panda behavior (similar to deer but slower)
        if (isLocalEntity(panda)) {
            updateEntityTimers(panda, delta);

            if (handleFleeBehavior(panda, config.flee, 0, 'WALK')) {
                // Fleeing handled
            } else if (panda.fleeTimer <= 0) {
                const distToTarget = getDistance2D(panda.group.position, panda.targetPos);

                if (panda.wanderTimer <= 0 || distToTarget < 2) {
                    const wanderTarget = calculateWanderTarget(
                        panda.group.position,
                        panda.group.rotation.y,
                        config.wander.minDistance,
                        config.wander.maxDistance
                    );

                    const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                    panda.targetPos.set(wanderTarget.x, newY, wanderTarget.z);
                    panda.targetRot = wanderTarget.angle;

                    // Pandas are lazy - mostly idle
                    panda.state = Math.random() < 0.7 ? 'IDLE' : 'WALK';

                    panda.wanderTimer = panda.state === 'IDLE'
                        ? config.wander.idleDuration.min + Math.random() * (config.wander.idleDuration.max - config.wander.idleDuration.min)
                        : config.wander.moveDuration.min + Math.random() * (config.wander.moveDuration.max - config.wander.moveDuration.min);
                }
            }
        }

        // Movement
        const moveSpeed = getMovementSpeed('panda', panda.state);
        if (moveSpeed > 0) {
            moveEntityTowardTarget(panda, moveSpeed, delta, config.collisionRadius);
        }

        // Rotation
        if (panda.state === 'WALK') {
            rotateEntityTowardTarget(panda, delta, config.animation.rotationSpeed);
        }

        // Leg animation
        if (panda.state === 'WALK' && panda.legs) {
            animateQuadrupedLegs(panda.legs, time, config.animation.walkLegSpeed, config.animation.legSwing);
        } else if (panda.legs) {
            resetLegsToNeutral(panda.legs, delta);
        }
    });
}

// Export globals
exportEntityGlobals('Panda', {
    initPandas, updatePandas, updatePandaState,
    PandaSystem, pandaList, createPanda
});
