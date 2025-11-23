// Deer system for 3D Demo
// Handles creation, animation, and behavior of deer entities

let deerList = [];
const DEER_COUNT = 12; // Number of deer to spawn

// Create a single deer entity
function createDeer(x, z) {
    const group = new THREE.Group();
    
    // Materials
    const coatColor = 0x8B4513; // SaddleBrown
    const bellyColor = 0xD2B48C; // Tan
    
    const deerMaterial = new THREE.MeshBasicMaterial({ color: coatColor, flatShading: true });
    const bellyMaterial = new THREE.MeshBasicMaterial({ color: bellyColor, flatShading: true });
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, flatShading: true });
    const antlerMaterial = new THREE.MeshBasicMaterial({ color: 0xEEE8AA, flatShading: true }); // PaleGoldenrod

    // --- Body ---
    // Main body: Horizontal cylinder along Z axis
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.8, 2.5, 7);
    const body = new THREE.Mesh(bodyGeo, deerMaterial);
    body.rotation.x = Math.PI / 2; // Align along Z
    body.position.y = 2.5;
    group.add(body);

    // --- Neck ---
    const neckGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.5, 6);
    const neck = new THREE.Mesh(neckGeo, deerMaterial);
    // Position at front (Z+), angled up
    neck.position.set(0, 3.4, 1.0);
    neck.rotation.x = -Math.PI / 4; // Angle back slightly
    group.add(neck);

    // --- Head Group (for animation) ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 4.0, 1.4);
    group.add(headGroup);

    // Head Mesh
    const headGeo = new THREE.ConeGeometry(0.35, 1.2, 6);
    const head = new THREE.Mesh(headGeo, bellyMaterial);
    head.rotation.x = Math.PI / 2; // Point forward (Z+)
    head.position.z = 0.3;
    headGroup.add(head);

    // Nose
    const noseGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const nose = new THREE.Mesh(noseGeo, noseMaterial);
    nose.position.set(0, 0, 0.9);
    headGroup.add(nose);

    // Antlers (Bucks only? Let's make 50% bucks)
    const isBuck = Math.random() < 0.5;
    if (isBuck) {
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
        // Ears for Does
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
    // Need pivot groups for animation
    const legGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.8, 5);
    const legs = [];

    // Helper to create leg
    function createLeg(x, z) {
        const legGroup = new THREE.Group();
        legGroup.position.set(x, 2.5, z);
        const legMesh = new THREE.Mesh(legGeo, deerMaterial);
        legMesh.position.y = -0.9; // Offset so pivot is at top
        legGroup.add(legMesh);
        group.add(legGroup);
        return legGroup;
    }

    // Front Left
    legs.push(createLeg(0.4, 0.9));
    // Front Right
    legs.push(createLeg(-0.4, 0.9));
    // Back Left
    legs.push(createLeg(0.4, -0.9));
    // Back Right
    legs.push(createLeg(-0.4, -0.9));

    // --- Tail ---
    const tailGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const tail = new THREE.Mesh(tailGeo, new THREE.MeshBasicMaterial({color: 0xFFFFFF})); // White tail
    tail.position.set(0, 2.8, -1.3);
    tail.rotation.x = 0.8; // Stick up slightly
    group.add(tail);

    // Initial placement
    // Use getTerrainHeightAt from world.js
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y, z);

    scene.add(group);
    objects.push(group); // Add to objects list for possible collision logic if needed

    return {
        group: group,
        headGroup: headGroup,
        legs: legs,
        state: 'IDLE', // IDLE, GRAZE, WALK, RUN
        timer: Math.random() * 5,
        targetDir: new THREE.Vector3(0, 0, 1),
        speed: 0,
        id: Math.random() // Unique ID
    };
}

// Initialize the herd
function initDeer() {
    if (typeof getTerrainHeightAt !== 'function') {
        console.warn("Terrain not ready for deer yet, retrying...");
        setTimeout(initDeer, 100);
        return;
    }

    const spawnRadius = 300; // Spread them out
    for (let i = 0; i < DEER_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * spawnRadius; // Don't spawn right at center
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        
        deerList.push(createDeer(x, z));
    }
    console.log(`Spawned ${DEER_COUNT} deer.`);
}

// Update deer loop (animation & behavior)
function updateDeer(delta) {
    if (!character || deerList.length === 0) return;

    const playerPos = character.position;
    const time = Date.now() * 0.005; // Time factor for animation

    deerList.forEach(deer => {
        deer.timer -= delta;
        const distToPlayer = deer.group.position.distanceTo(playerPos);

        // --- Behavior State Machine ---
        
        // Flee State overrides everything
        // Only flee if player is moving (moveForward, moveBackward, or flying)
        const isPlayerMoving = (typeof moveForward !== 'undefined' && moveForward) || 
                               (typeof moveBackward !== 'undefined' && moveBackward) || 
                               (typeof isFlying !== 'undefined' && isFlying);

        if (distToPlayer < 35 && isPlayerMoving) {
            deer.state = 'RUN';
            deer.timer = 2.0; // Run for at least 2 seconds
        }

        if (deer.state === 'RUN') {
            deer.speed = 18.0; // Fast!
            
            // Calculate flee direction (away from player)
            const fleeDir = new THREE.Vector3().subVectors(deer.group.position, playerPos).normalize();
            
            // Add slight randomness/wobble
            fleeDir.x += Math.sin(time * 10) * 0.2;
            fleeDir.z += Math.cos(time * 10) * 0.2;
            fleeDir.normalize();
            
            deer.targetDir.copy(fleeDir);
            
            // Stop running if far enough
            if (distToPlayer > 60 && deer.timer <= 0) {
                deer.state = 'IDLE';
                deer.timer = 2 + Math.random();
            }
        }
        else if (deer.state === 'IDLE') {
            deer.speed = 0;
            if (deer.timer <= 0) {
                // Pick new state
                const r = Math.random();
                if (r < 0.3) {
                    deer.state = 'GRAZE';
                    deer.timer = 3 + Math.random() * 4;
                } else {
                    deer.state = 'WALK';
                    deer.timer = 4 + Math.random() * 6;
                    // Pick random wander direction
                    const angle = Math.random() * Math.PI * 2;
                    deer.targetDir.set(Math.cos(angle), 0, Math.sin(angle));
                }
            }
        }
        else if (deer.state === 'GRAZE') {
            deer.speed = 0;
            if (deer.timer <= 0) {
                deer.state = 'IDLE';
                deer.timer = 1 + Math.random();
            }
        }
        else if (deer.state === 'WALK') {
            deer.speed = 3.5; // Casual walk
            if (deer.timer <= 0) {
                deer.state = 'IDLE';
                deer.timer = 2 + Math.random() * 3;
            }
            
            // Boundary Check: Turn back if too far
            const distFromCenter = Math.sqrt(deer.group.position.x**2 + deer.group.position.z**2);
            if (distFromCenter > 350) {
                // Steer back to center
                const toCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), deer.group.position).normalize();
                deer.targetDir.lerp(toCenter, 0.05); // Gradually turn
            }
        }

        // --- Movement Implementation ---
        if (deer.speed > 0) {
            // Calculate next position
            const moveVec = deer.targetDir.clone().multiplyScalar(deer.speed * delta);
            deer.group.position.add(moveVec);
            
            // Smooth rotation to face target
            const targetRotation = Math.atan2(deer.targetDir.x, deer.targetDir.z);
            let rotDiff = targetRotation - deer.group.rotation.y;
            
            // Normalize angle
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            
            deer.group.rotation.y += rotDiff * 5 * delta; // Turn speed
        }

        // Terrain Following
        if (typeof getTerrainHeightAt === 'function') {
            const y = getTerrainHeightAt(deer.group.position.x, deer.group.position.z);
            deer.group.position.y = y;
        }

        // --- Animations ---
        const legSpeed = deer.state === 'RUN' ? 25 : 10;
        
        if (deer.speed > 0.1) {
            // Walk/Run Cycle
            // Diagonal pairs: FL + BR, FR + BL
            const cycle = time * legSpeed;
            
            deer.legs[0].rotation.x = Math.sin(cycle) * 0.6; // FL
            deer.legs[3].rotation.x = Math.sin(cycle) * 0.6; // BR matches FL
            
            deer.legs[1].rotation.x = Math.sin(cycle + Math.PI) * 0.6; // FR
            deer.legs[2].rotation.x = Math.sin(cycle + Math.PI) * 0.6; // BL matches FR
            
            // Head bob
            deer.headGroup.rotation.x = Math.sin(cycle * 2) * 0.05;
        } else {
            // Idle/Graze Animations
            // Reset legs smoothly
            deer.legs.forEach(leg => {
                leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, delta * 5);
            });

            if (deer.state === 'GRAZE') {
                // Lower head
                deer.headGroup.rotation.x = THREE.MathUtils.lerp(deer.headGroup.rotation.x, Math.PI / 3.5, delta * 3);
            } else {
                // Look around randomly
                const lookTarget = Math.sin(time * 0.5) * 0.2;
                deer.headGroup.rotation.x = THREE.MathUtils.lerp(deer.headGroup.rotation.x, lookTarget, delta * 2);
                // Maybe turn head side to side?
                deer.headGroup.rotation.y = Math.sin(time * 0.3) * 0.3;
            }
        }
    });
}

