// Deer system for 3D Demo (Client-Side Rendering Only)
// Receives state from server, updates visual models.
// Uses Systems registry pattern for organized update loop

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

// Use GAME namespace for centralized entity storage with fallback
const deerList = (typeof GAME !== 'undefined' && GAME.world?.entities)
    ? GAME.world.entities.deer
    : [];

// Get deer count from config
function getDeerCount() {
    return typeof CONFIG !== 'undefined'
        ? CONFIG.get('entities.deer.count', 18)
        : 18;
}

// Create a single deer visual entity
function createDeer(id, x, z) {
    const group = new THREE.Group();
    
    // Materials - use Lambert for shadows
    const coatColor = 0x8B4513; // SaddleBrown
    const bellyColor = 0xD2B48C; // Tan
    
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

    // Antlers (Visual only, random for now, ideally server sends gender)
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

    const tailGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const tail = new THREE.Mesh(tailGeo, tailMaterial);
    tail.position.set(0, 2.8, -1.3);
    tail.rotation.x = 0.8;
    group.add(tail);

    // Initial placement (will be overridden by server)
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y, z);

    // Enable shadows on all meshes
    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(group);
    
    return {
        id: id,
        group: group,
        headGroup: headGroup,
        legs: legs,
        targetPos: new THREE.Vector3(x, y, z),
        targetRot: 0
    };
}

// Init called by main game - spawner handles actual spawning
function initDeer() {
    // Deer system ready - animal-spawner.js handles spawning
}

// Called by animal-sync.js when server sends snapshot
function updateDeerState(serverData) {
    serverData.forEach(data => {
        let deer = deerList.find(d => d.id === data.id);
        
        if (!deer) {
            // New deer, create it
            deer = createDeer(data.id, data.x, data.z);
            deerList.push(deer);
        }
        
        // Update Target for interpolation
        if (typeof getTerrainHeightAt === 'function') {
            const y = getTerrainHeightAt(data.x, data.z);
            deer.targetPos.set(data.x, y, data.z);
        }
        deer.targetRot = data.ry;
        deer.state = data.state; // Store state for animation
    });
}

// Flee behavior config
const DEER_FLEE = {
    detectRadius: 15,    // Start fleeing when player this close
    fleeRadius: 6,       // Panic flee when player this close
    fleeDuration: 3,     // How long to keep running
    fleeDistance: 30     // How far to run
};

// Get deer speed from config
function getDeerSpeed() {
    return typeof CONFIG !== 'undefined' ? CONFIG.get('entities.deer.speed', 8.0) : 8.0;
}

// Render Loop - Interpolate to target
function updateDeer(delta) {
    const time = Date.now() * 0.005;
    const playerPos = typeof character !== 'undefined' && character ? character.position : null;

    deerList.forEach(deer => {
        // Local/spawned deer wander behavior
        if (deer.id.startsWith('local_') || deer.id.startsWith('spawned_')) {
            deer.wanderTimer = (deer.wanderTimer || 0) - delta;
            deer.fleeTimer = (deer.fleeTimer || 0) - delta;

            // Check distance to player
            let distToPlayer = Infinity;
            if (playerPos) {
                const dx = deer.group.position.x - playerPos.x;
                const dz = deer.group.position.z - playerPos.z;
                distToPlayer = Math.sqrt(dx * dx + dz * dz);
            }

            // Flee behavior - player too close!
            if (distToPlayer < DEER_FLEE.detectRadius) {
                // Run away from player
                const fleeAngle = Math.atan2(
                    deer.group.position.x - playerPos.x,
                    deer.group.position.z - playerPos.z
                );
                const fleeDist = DEER_FLEE.fleeDistance + (distToPlayer < DEER_FLEE.fleeRadius ? 20 : 0);
                const newX = deer.group.position.x + Math.cos(fleeAngle) * fleeDist;
                const newZ = deer.group.position.z + Math.sin(fleeAngle) * fleeDist;
                const newY = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(newX, newZ) : 0;
                deer.targetPos.set(newX, newY, newZ);
                deer.targetRot = fleeAngle;
                deer.state = 'RUN';
                deer.fleeTimer = DEER_FLEE.fleeDuration;
                deer.wanderTimer = DEER_FLEE.fleeDuration + 1;
            }
            // Normal wander behavior (only if not fleeing)
            else if (deer.fleeTimer <= 0) {
                const distToTarget = deer.group.position.distanceTo(deer.targetPos);

                if (deer.wanderTimer <= 0 || distToTarget < 2) {
                    // Pick new random destination
                    const wanderDist = 15 + Math.random() * 25;
                    const angle = deer.group.rotation.y + (Math.random() - 0.5) * Math.PI;
                    const newX = deer.group.position.x + Math.cos(angle) * wanderDist;
                    const newZ = deer.group.position.z + Math.sin(angle) * wanderDist;
                    const newY = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(newX, newZ) : 0;
                    deer.targetPos.set(newX, newY, newZ);
                    deer.targetRot = Math.atan2(newX - deer.group.position.x, newZ - deer.group.position.z);
                    deer.state = Math.random() < 0.2 ? 'RUN' : (Math.random() < 0.5 ? 'WALK' : 'IDLE');
                    deer.wanderTimer = deer.state === 'IDLE' ? (2 + Math.random() * 4) : (4 + Math.random() * 6);
                }
            }
        }

        // Movement speed based on state (uses config speed)
        const baseSpeed = getDeerSpeed();
        const moveSpeed = deer.state === 'RUN' ? baseSpeed : (deer.state === 'WALK' ? baseSpeed * 0.4 : 0);

        if (moveSpeed > 0) {
            // Move toward target at fixed speed
            const dir = new THREE.Vector3().subVectors(deer.targetPos, deer.group.position);
            dir.y = 0; // Only horizontal movement
            const dist = dir.length();
            if (dist > 0.5) {
                dir.normalize().multiplyScalar(moveSpeed * delta);
                deer.group.position.add(dir);
            }
            // Update Y to follow terrain
            const terrainY = typeof getTerrainHeightAt === 'function'
                ? getTerrainHeightAt(deer.group.position.x, deer.group.position.z) : 0;
            deer.group.position.y = terrainY;
        }

        // Smooth Rotate toward movement direction
        if (deer.state === 'WALK' || deer.state === 'RUN') {
            let rotDiff = deer.targetRot - deer.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            deer.group.rotation.y += rotDiff * delta * 3;
        }

        // Animations based on State
        if (deer.state === 'WALK' || deer.state === 'RUN') {
            const legSpeed = deer.state === 'RUN' ? 20 : 8;
            const cycle = time * legSpeed;
            deer.legs[0].rotation.x = Math.sin(cycle) * 0.5;
            deer.legs[3].rotation.x = Math.sin(cycle) * 0.5;
            deer.legs[1].rotation.x = Math.sin(cycle + Math.PI) * 0.5;
            deer.legs[2].rotation.x = Math.sin(cycle + Math.PI) * 0.5;
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
