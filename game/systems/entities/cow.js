// Cow system for 3D Demo (Client-Side Rendering Only)
// Based on deer system - stockier body, Holstein coloring, docile behavior
// Uses Systems registry pattern and shared utilities

// CowSystem - manages cow rendering and animation
const CowSystem = {
    init() {
        initCows();
    },

    update(delta) {
        updateCows(delta);
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('cows', CowSystem);
}

// Use GAME namespace for centralized entity storage
const cowList = (typeof GAME !== 'undefined' && GAME.world?.entities)
    ? GAME.world.entities.cows
    : [];

// Create a single cow visual entity
function createCow(id, x, z) {
    const group = new THREE.Group();

    // Holstein cow colors (black and white) or brown
    const isHolstein = Math.random() < 0.7;
    const mainColor = isHolstein ? 0xFFFFFF : 0x8B4513;
    const spotColor = 0x1a1a1a;
    const bellyColor = 0xF5DEB3;

    const cowMaterial = new THREE.MeshLambertMaterial({ color: mainColor });
    const spotMaterial = new THREE.MeshLambertMaterial({ color: spotColor });
    const bellyMaterial = new THREE.MeshLambertMaterial({ color: bellyColor });
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
    const hoofMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });

    // --- Body ---
    const bodyGeo = new THREE.CylinderGeometry(1.0, 1.1, 2.8, 8);
    const body = new THREE.Mesh(bodyGeo, cowMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 2.0;
    group.add(body);

    // --- Spots ---
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

    // --- Neck ---
    const neckGeo = new THREE.CylinderGeometry(0.45, 0.6, 1.2, 6);
    const neck = new THREE.Mesh(neckGeo, cowMaterial);
    neck.position.set(0, 2.6, 1.2);
    neck.rotation.x = -Math.PI / 5;
    group.add(neck);

    // --- Head Group ---
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

    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
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

    // --- Legs ---
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

    // --- Udder ---
    if (Math.random() < 0.6) {
        const udderGeo = new THREE.SphereGeometry(0.3, 6, 6);
        const udderMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
        const udder = new THREE.Mesh(udderGeo, udderMaterial);
        udder.position.set(0, 1.2, -0.5);
        udder.scale.set(1, 0.7, 1);
        group.add(udder);
    }

    // --- Tail ---
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

    // Random scale variation
    const scale = 0.9 + Math.random() * 0.2;
    group.scale.set(scale, scale, scale);

    // Enable shadows
    enableShadows(group);

    // Add to scene
    addToScene(group);

    return {
        id: id,
        group: group,
        headGroup: headGroup,
        legs: legs,
        tail: tail,
        targetPos: new THREE.Vector3(x, y, z),
        targetRot: Math.random() * Math.PI * 2,
        state: 'IDLE',
        wanderTimer: Math.random() * 3,
        grazeTimer: 0
    };
}

// Init called by main game
function initCows() {
    // Cow system ready - animal-spawner.js handles spawning
}

// Called by animal-sync.js when server sends snapshot
function updateCowState(serverData) {
    serverData.forEach(data => {
        let cow = cowList.find(c => c.id === data.id);

        if (!cow) {
            cow = createCow(data.id, data.x, data.z);
            cowList.push(cow);
        }

        const y = getTerrainHeight(data.x, data.z);
        cow.targetPos.set(data.x, y, data.z);
        cow.targetRot = data.ry;
        cow.state = data.state;
    });
}

// Render Loop
function updateCows(delta) {
    const time = Date.now() * 0.001;

    // Defensive: ensure config exists
    if (typeof ENTITY_CONFIG === 'undefined' || !ENTITY_CONFIG.cow) {
        console.warn('ENTITY_CONFIG.cow not available');
        return;
    }

    const config = ENTITY_CONFIG.cow;
    const fleeConfig = config.flee;
    const wanderConfig = config.wander;
    const grazeConfig = config.graze;
    const animConfig = config.animation;

    cowList.forEach(cow => {
        // Local/spawned cow behavior
        if (cow.id.startsWith('local_') || cow.id.startsWith('spawned_')) {
            cow.wanderTimer = (cow.wanderTimer || 0) - delta;
            cow.fleeTimer = (cow.fleeTimer || 0) - delta;
            cow.grazeTimer = (cow.grazeTimer || 0) - delta;

            const distToPlayer = getDistanceToPlayer(cow.group.position);
            const distToTarget = getDistance2D(cow.group.position, cow.targetPos);

            // Flee behavior - only when player is VERY close
            if (distToPlayer < fleeConfig.detectRadius && cow.fleeTimer <= 0) {
                const fleeTarget = calculateFleeTarget(cow.group.position, fleeConfig.distance);

                if (fleeTarget) {
                    const newY = getTerrainHeight(fleeTarget.x, fleeTarget.z);
                    cow.targetPos.set(fleeTarget.x, newY, fleeTarget.z);
                    cow.targetRot = fleeTarget.angle;
                    cow.state = 'WALK';
                    cow.fleeTimer = fleeConfig.duration;
                    cow.wanderTimer = fleeConfig.duration + 1;
                    cow.grazeTimer = 0;
                }
            }
            // Grazing behavior
            else if (cow.state === 'GRAZE' && cow.grazeTimer > 0) {
                // Keep grazing
            }
            // Normal wander behavior
            else if (cow.fleeTimer <= 0) {
                if (cow.wanderTimer <= 0 || distToTarget < 1) {
                    const action = Math.random();

                    if (action < grazeConfig.chance) {
                        cow.state = 'GRAZE';
                        cow.grazeTimer = grazeConfig.duration * (0.5 + Math.random());
                        cow.wanderTimer = cow.grazeTimer + 1;
                    } else if (action < 0.7) {
                        const wanderTarget = calculateWanderTarget(
                            cow.group.position,
                            cow.group.rotation.y,
                            wanderConfig.minDistance,
                            wanderConfig.maxDistance
                        );

                        const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                        cow.targetPos.set(wanderTarget.x, newY, wanderTarget.z);
                        cow.targetRot = wanderTarget.angle;
                        cow.state = 'WALK';
                        cow.wanderTimer = wanderConfig.moveDuration.min +
                            Math.random() * (wanderConfig.moveDuration.max - wanderConfig.moveDuration.min);
                    } else {
                        cow.state = 'IDLE';
                        cow.wanderTimer = wanderConfig.idleDuration.min +
                            Math.random() * (wanderConfig.idleDuration.max - wanderConfig.idleDuration.min);
                    }
                }
            }
        }

        // Movement
        const moveSpeed = cow.state === 'WALK' ? getEntitySpeed('cow') : 0;

        if (moveSpeed > 0) {
            const dir = new THREE.Vector3().subVectors(cow.targetPos, cow.group.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 0.5) {
                dir.normalize().multiplyScalar(moveSpeed * delta);

                // Check for block collisions
                const newX = cow.group.position.x + dir.x;
                const newZ = cow.group.position.z + dir.z;

                const collidingBlock = checkBlockCollision(newX, newZ, cow.group.position.y, config.collisionRadius);

                if (collidingBlock) {
                    const altPath = findAlternativePath(cow.group.position, collidingBlock, moveSpeed, delta, config.collisionRadius);
                    if (altPath) {
                        cow.group.position.x = altPath.x;
                        cow.group.position.z = altPath.z;
                    }
                } else {
                    cow.group.position.add(dir);
                }
            }

            // Follow terrain
            cow.group.position.y = getTerrainHeight(cow.group.position.x, cow.group.position.z);
        }

        // Rotation
        if (cow.state === 'WALK') {
            cow.group.rotation.y = smoothRotateToward(
                cow.group.rotation.y,
                cow.targetRot,
                delta,
                animConfig.rotationSpeed
            );
        }

        // Animations
        if (cow.state === 'WALK') {
            const cycle = time * animConfig.legSpeed;
            cow.legs[0].rotation.x = Math.sin(cycle) * animConfig.legSwing;
            cow.legs[3].rotation.x = Math.sin(cycle) * animConfig.legSwing;
            cow.legs[1].rotation.x = Math.sin(cycle + Math.PI) * animConfig.legSwing;
            cow.legs[2].rotation.x = Math.sin(cycle + Math.PI) * animConfig.legSwing;
            cow.tail.rotation.z = Math.sin(time * 2) * 0.3;
        } else if (cow.state === 'GRAZE') {
            cow.headGroup.rotation.x = 0.4 + Math.sin(time * 2) * 0.1;
            cow.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, delta * 3));
            cow.tail.rotation.z = Math.sin(time * 1.5) * 0.2;
        } else {
            cow.headGroup.rotation.x = THREE.MathUtils.lerp(cow.headGroup.rotation.x, 0, delta * 2);
            cow.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, delta * 3));
            cow.tail.rotation.z = Math.sin(time * 0.5) * 0.15;
        }
    });
}

// Make available globally
window.initCows = initCows;
window.updateCows = updateCows;
window.updateCowState = updateCowState;
window.CowSystem = CowSystem;
window.createCow = createCow;
window.cowList = cowList;
