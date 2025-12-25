// Cow system for 3D Demo (Client-Side Rendering Only)
// Based on deer system - stockier body, Holstein coloring, docile behavior
// Uses Systems registry pattern for organized update loop

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

// Use GAME namespace for centralized entity storage with fallback
const cowList = (typeof GAME !== 'undefined' && GAME.world?.entities)
    ? GAME.world.entities.cows
    : [];

// Get cow count from config
function getCowCount() {
    return typeof CONFIG !== 'undefined'
        ? CONFIG.get('entities.cows.count', 12)
        : 12;
}

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
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 }); // Pink nose
    const hoofMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });

    // --- Body (stockier than deer) ---
    const bodyGeo = new THREE.CylinderGeometry(1.0, 1.1, 2.8, 8);
    const body = new THREE.Mesh(bodyGeo, cowMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 2.0;
    group.add(body);

    // --- Spots (for Holstein cows) ---
    if (isHolstein) {
        const spotGeo = new THREE.SphereGeometry(0.4, 6, 6);
        const numSpots = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numSpots; i++) {
            const spot = new THREE.Mesh(spotGeo, spotMaterial);
            const angle = Math.random() * Math.PI * 2;
            const yOffset = (Math.random() - 0.5) * 1.5;
            spot.position.set(
                Math.cos(angle) * 0.9,
                2.0 + yOffset,
                Math.sin(angle) * 1.2
            );
            spot.scale.set(0.8 + Math.random() * 0.5, 0.6, 0.8 + Math.random() * 0.5);
            group.add(spot);
        }
    }

    // --- Neck (thicker than deer) ---
    const neckGeo = new THREE.CylinderGeometry(0.45, 0.6, 1.2, 6);
    const neck = new THREE.Mesh(neckGeo, cowMaterial);
    neck.position.set(0, 2.6, 1.2);
    neck.rotation.x = -Math.PI / 5;
    group.add(neck);

    // --- Head Group ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 3.0, 1.6);
    group.add(headGroup);

    // Head (boxier than deer)
    const headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.9);
    const head = new THREE.Mesh(headGeo, cowMaterial);
    headGroup.add(head);

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
    const snout = new THREE.Mesh(snoutGeo, bellyMaterial);
    snout.position.set(0, -0.1, 0.5);
    headGroup.add(snout);

    // Pink nose
    const noseGeo = new THREE.BoxGeometry(0.35, 0.25, 0.1);
    const nose = new THREE.Mesh(noseGeo, noseMaterial);
    nose.position.set(0, -0.1, 0.72);
    headGroup.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.25, 0.1, 0.3);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.25, 0.1, 0.3);
    headGroup.add(rightEye);

    // Floppy ears
    const earGeo = new THREE.BoxGeometry(0.3, 0.15, 0.2);
    const leftEar = new THREE.Mesh(earGeo, cowMaterial);
    leftEar.position.set(0.4, 0.1, 0);
    leftEar.rotation.z = -0.5;
    headGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, cowMaterial);
    rightEar.position.set(-0.4, 0.1, 0);
    rightEar.rotation.z = 0.5;
    headGroup.add(rightEar);

    // Horns (small, curved)
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

    // --- Legs (shorter and thicker than deer) ---
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

    // --- Udder (for female cows, ~60%) ---
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

    // Tail tuft
    const tuftGeo = new THREE.SphereGeometry(0.1, 4, 4);
    const tuftMaterial = new THREE.MeshLambertMaterial({ color: isHolstein ? 0x1a1a1a : 0x654321 });
    const tuft = new THREE.Mesh(tuftGeo, tuftMaterial);
    tuft.position.set(0, 1.2, -1.8);
    group.add(tuft);

    // Initial placement
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y, z);

    // Random scale variation
    const scale = 0.9 + Math.random() * 0.2;
    group.scale.set(scale, scale, scale);

    // Enable shadows on all meshes
    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Add to scene
    if (typeof GAME !== 'undefined' && GAME.scene) {
        GAME.scene.add(group);
    } else if (typeof scene !== 'undefined') {
        scene.add(group);
    }

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

// Init called by main game - spawner handles actual spawning
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

        if (typeof getTerrainHeightAt === 'function') {
            const y = getTerrainHeightAt(data.x, data.z);
            cow.targetPos.set(data.x, y, data.z);
        }
        cow.targetRot = data.ry;
        cow.state = data.state;
    });
}

// Cow behavior config - cows are docile, don't flee easily
const COW_BEHAVIOR = {
    fleeRadius: 4,       // Only flee when player VERY close
    fleeDuration: 2,     // Short flee duration
    fleeDistance: 10,    // Don't run far
    grazeChance: 0.4,    // 40% chance to graze instead of walk
    grazeDuration: 5     // Graze for 5 seconds
};

// Get cow speed from config
function getCowSpeed() {
    return typeof CONFIG !== 'undefined' ? CONFIG.get('entities.cows.speed', 3.0) : 3.0;
}

// Render Loop
function updateCows(delta) {
    const time = Date.now() * 0.001;
    const playerPos = typeof character !== 'undefined' && character ? character.position : null;

    cowList.forEach(cow => {
        // Local/spawned cow behavior
        if (cow.id.startsWith('local_') || cow.id.startsWith('spawned_')) {
            cow.wanderTimer = (cow.wanderTimer || 0) - delta;
            cow.fleeTimer = (cow.fleeTimer || 0) - delta;
            cow.grazeTimer = (cow.grazeTimer || 0) - delta;

            // Check distance to player
            let distToPlayer = Infinity;
            if (playerPos) {
                const dx = cow.group.position.x - playerPos.x;
                const dz = cow.group.position.z - playerPos.z;
                distToPlayer = Math.sqrt(dx * dx + dz * dz);
            }

            // Calculate 2D distance to target
            const dx2 = cow.targetPos.x - cow.group.position.x;
            const dz2 = cow.targetPos.z - cow.group.position.z;
            const distToTarget = Math.sqrt(dx2 * dx2 + dz2 * dz2);

            // Flee behavior - only when player is VERY close
            if (distToPlayer < COW_BEHAVIOR.fleeRadius && cow.fleeTimer <= 0) {
                const fleeAngle = Math.atan2(
                    cow.group.position.x - playerPos.x,
                    cow.group.position.z - playerPos.z
                );
                const newX = cow.group.position.x + Math.sin(fleeAngle) * COW_BEHAVIOR.fleeDistance;
                const newZ = cow.group.position.z + Math.cos(fleeAngle) * COW_BEHAVIOR.fleeDistance;
                const newY = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(newX, newZ) : 0;
                cow.targetPos.set(newX, newY, newZ);
                cow.targetRot = fleeAngle;
                cow.state = 'WALK'; // Cows don't really run, they trot away
                cow.fleeTimer = COW_BEHAVIOR.fleeDuration;
                cow.wanderTimer = COW_BEHAVIOR.fleeDuration + 1;
                cow.grazeTimer = 0;
            }
            // Grazing behavior
            else if (cow.state === 'GRAZE' && cow.grazeTimer > 0) {
                // Keep grazing, don't change state
            }
            // Normal wander behavior
            else if (cow.fleeTimer <= 0) {
                if (cow.wanderTimer <= 0 || distToTarget < 1) {
                    // Decide what to do next
                    const action = Math.random();

                    if (action < COW_BEHAVIOR.grazeChance) {
                        // Start grazing
                        cow.state = 'GRAZE';
                        cow.grazeTimer = COW_BEHAVIOR.grazeDuration * (0.5 + Math.random());
                        cow.wanderTimer = cow.grazeTimer + 1;
                    } else if (action < 0.7) {
                        // Walk to new spot
                        const wanderDist = 5 + Math.random() * 15;
                        const angle = cow.group.rotation.y + (Math.random() - 0.5) * Math.PI;
                        const newX = cow.group.position.x + Math.sin(angle) * wanderDist;
                        const newZ = cow.group.position.z + Math.cos(angle) * wanderDist;
                        const newY = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(newX, newZ) : 0;
                        cow.targetPos.set(newX, newY, newZ);
                        cow.targetRot = Math.atan2(newX - cow.group.position.x, newZ - cow.group.position.z);
                        cow.state = 'WALK';
                        cow.wanderTimer = 4 + Math.random() * 6;
                    } else {
                        // Stand idle
                        cow.state = 'IDLE';
                        cow.wanderTimer = 2 + Math.random() * 4;
                    }
                }
            }
        }

        // Movement
        const baseSpeed = getCowSpeed();
        const moveSpeed = cow.state === 'WALK' ? baseSpeed : 0;

        if (moveSpeed > 0) {
            const dir = new THREE.Vector3().subVectors(cow.targetPos, cow.group.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 0.5) {
                dir.normalize().multiplyScalar(moveSpeed * delta);
                cow.group.position.add(dir);
            }

            // Follow terrain
            const terrainY = typeof getTerrainHeightAt === 'function'
                ? getTerrainHeightAt(cow.group.position.x, cow.group.position.z) : 0;
            cow.group.position.y = terrainY;
        }

        // Rotation (slow turn)
        if (cow.state === 'WALK') {
            let rotDiff = cow.targetRot - cow.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            cow.group.rotation.y += rotDiff * delta * 2;
        }

        // Animations
        if (cow.state === 'WALK') {
            // Faster leg animation for snappier movement
            const legSpeed = 13; // Increased from 6 to 10 for quicker leg animation
            const cycle = time * legSpeed;
            cow.legs[0].rotation.x = Math.sin(cycle) * 0.3;
            cow.legs[3].rotation.x = Math.sin(cycle) * 0.3;
            cow.legs[1].rotation.x = Math.sin(cycle + Math.PI) * 0.3;
            cow.legs[2].rotation.x = Math.sin(cycle + Math.PI) * 0.3;

            // Tail swish while walking
            cow.tail.rotation.z = Math.sin(time * 2) * 0.3;
        } else if (cow.state === 'GRAZE') {
            // Head bobbing down for grazing
            cow.headGroup.rotation.x = 0.4 + Math.sin(time * 2) * 0.1;
            cow.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, delta * 3));

            // Occasional tail swish
            cow.tail.rotation.z = Math.sin(time * 1.5) * 0.2;
        } else {
            // Idle - reset head, occasional tail swish
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
