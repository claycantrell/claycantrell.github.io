// Deer system for 3D Demo (Client-Side Rendering Only)
// Receives state from server, updates visual models.
// Uses Systems registry pattern and shared utilities

// DeerSystem - manages deer rendering and animation
const DeerSystem = {
    init() {
        initDeer();
    },

    update(delta) {
        updateDeer(delta);
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('deer', DeerSystem);
}

// Use GAME namespace for centralized entity storage
const deerList = (typeof GAME !== 'undefined' && GAME.world?.entities)
    ? GAME.world.entities.deer
    : [];

// Create a single deer visual entity
function createDeer(id, x, z) {
    const group = new THREE.Group();

    // Materials
    const coatColor = 0x8B4513;
    const bellyColor = 0xD2B48C;

    const deerMaterial = new THREE.MeshLambertMaterial({ color: coatColor });
    const bellyMaterial = new THREE.MeshLambertMaterial({ color: bellyColor });
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const antlerMaterial = new THREE.MeshLambertMaterial({ color: 0xEEE8AA });
    const tailMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });

    // --- Body ---
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.8, 2.5, 7);
    const body = new THREE.Mesh(bodyGeo, deerMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 2.5;
    group.add(body);

    // --- Neck ---
    const neckGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.5, 6);
    const neck = new THREE.Mesh(neckGeo, deerMaterial);
    neck.position.set(0, 3.4, 1.0);
    neck.rotation.x = -Math.PI / 4;
    group.add(neck);

    // --- Head Group ---
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

    // --- Legs ---
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

    // --- Tail ---
    const tailGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const tail = new THREE.Mesh(tailGeo, tailMaterial);
    tail.position.set(0, 2.8, -1.3);
    tail.rotation.x = 0.8;
    group.add(tail);

    // Initial placement
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    // Enable shadows
    enableShadows(group);

    // Add to scene
    addToScene(group);

    return {
        id: id,
        group: group,
        headGroup: headGroup,
        legs: legs,
        targetPos: new THREE.Vector3(x, y, z),
        targetRot: 0
    };
}

// Init called by main game
function initDeer() {
    // Deer system ready - animal-spawner.js handles spawning
}

// Called by animal-sync.js when server sends snapshot
function updateDeerState(serverData) {
    serverData.forEach(data => {
        let deer = deerList.find(d => d.id === data.id);

        if (!deer) {
            deer = createDeer(data.id, data.x, data.z);
            deerList.push(deer);
        }

        const y = getTerrainHeight(data.x, data.z);
        deer.targetPos.set(data.x, y, data.z);
        deer.targetRot = data.ry;
        deer.state = data.state;
    });
}

// Render Loop
function updateDeer(delta) {
    const time = Date.now() * 0.005;

    // Defensive: ensure config exists
    if (typeof ENTITY_CONFIG === 'undefined' || !ENTITY_CONFIG.deer) {
        console.warn('ENTITY_CONFIG.deer not available');
        return;
    }

    const config = ENTITY_CONFIG.deer;
    const fleeConfig = config.flee;
    const wanderConfig = config.wander;
    const animConfig = config.animation;

    deerList.forEach(deer => {
        // Local/spawned deer wander behavior
        if (deer.id.startsWith('local_') || deer.id.startsWith('spawned_')) {
            deer.wanderTimer = (deer.wanderTimer || 0) - delta;
            deer.fleeTimer = (deer.fleeTimer || 0) - delta;

            const distToPlayer = getDistanceToPlayer(deer.group.position);

            // Flee behavior
            if (distToPlayer < fleeConfig.detectRadius) {
                const panicBonus = distToPlayer < fleeConfig.panicRadius ? fleeConfig.panicBonus : 0;
                const fleeTarget = calculateFleeTarget(deer.group.position, fleeConfig.distance, panicBonus);

                if (fleeTarget) {
                    const newY = getTerrainHeight(fleeTarget.x, fleeTarget.z);
                    deer.targetPos.set(fleeTarget.x, newY, fleeTarget.z);
                    deer.targetRot = fleeTarget.angle;
                    deer.state = 'RUN';
                    deer.fleeTimer = fleeConfig.duration;
                    deer.wanderTimer = fleeConfig.duration + 1;
                }
            }
            // Normal wander behavior
            else if (deer.fleeTimer <= 0) {
                const distToTarget = getDistance2D(deer.group.position, deer.targetPos);

                if (deer.wanderTimer <= 0 || distToTarget < 2) {
                    const wanderTarget = calculateWanderTarget(
                        deer.group.position,
                        deer.group.rotation.y,
                        wanderConfig.minDistance,
                        wanderConfig.maxDistance
                    );

                    const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                    deer.targetPos.set(wanderTarget.x, newY, wanderTarget.z);
                    deer.targetRot = wanderTarget.angle;

                    const rand = Math.random();
                    if (rand < 0.2) {
                        deer.state = 'RUN';
                    } else if (rand < 0.6) {
                        deer.state = 'WALK';
                    } else {
                        deer.state = 'IDLE';
                    }

                    deer.wanderTimer = deer.state === 'IDLE'
                        ? wanderConfig.idleDuration.min + Math.random() * (wanderConfig.idleDuration.max - wanderConfig.idleDuration.min)
                        : wanderConfig.moveDuration.min + Math.random() * (wanderConfig.moveDuration.max - wanderConfig.moveDuration.min);
                }
            }
        }

        // Movement speed based on state
        const baseSpeed = getEntitySpeed('deer');
        const moveSpeed = deer.state === 'RUN' ? baseSpeed : (deer.state === 'WALK' ? baseSpeed * 0.4 : 0);

        if (moveSpeed > 0) {
            const dir = new THREE.Vector3().subVectors(deer.targetPos, deer.group.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 0.5) {
                dir.normalize().multiplyScalar(moveSpeed * delta);

                // Check for block collisions
                const newX = deer.group.position.x + dir.x;
                const newZ = deer.group.position.z + dir.z;

                const collidingBlock = checkBlockCollision(newX, newZ, deer.group.position.y, config.collisionRadius);

                if (collidingBlock) {
                    const altPath = findAlternativePath(deer.group.position, collidingBlock, moveSpeed, delta, config.collisionRadius);
                    if (altPath) {
                        deer.group.position.x = altPath.x;
                        deer.group.position.z = altPath.z;
                    }
                } else {
                    deer.group.position.add(dir);
                }
            }

            // Update Y to follow terrain
            deer.group.position.y = getTerrainHeight(deer.group.position.x, deer.group.position.z);
        }

        // Smooth rotation
        if (deer.state === 'WALK' || deer.state === 'RUN') {
            deer.group.rotation.y = smoothRotateToward(
                deer.group.rotation.y,
                deer.targetRot,
                delta,
                animConfig.rotationSpeed
            );
        }

        // Animations based on state
        if (deer.state === 'WALK' || deer.state === 'RUN') {
            const legSpeed = deer.state === 'RUN' ? animConfig.runLegSpeed : animConfig.walkLegSpeed;
            const cycle = time * legSpeed;
            deer.legs[0].rotation.x = Math.sin(cycle) * animConfig.legSwing;
            deer.legs[3].rotation.x = Math.sin(cycle) * animConfig.legSwing;
            deer.legs[1].rotation.x = Math.sin(cycle + Math.PI) * animConfig.legSwing;
            deer.legs[2].rotation.x = Math.sin(cycle + Math.PI) * animConfig.legSwing;
        } else {
            deer.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, delta * 3));
        }
    });
}

// Make available globally
window.initDeer = initDeer;
window.updateDeer = updateDeer;
window.updateDeerState = updateDeerState;
window.DeerSystem = DeerSystem;
window.deerList = deerList;
window.createDeer = createDeer;
