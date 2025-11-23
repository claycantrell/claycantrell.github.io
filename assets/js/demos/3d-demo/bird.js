// Bird system for 3D Demo
// Handles creation, animation, and behavior of birds

let birdList = [];
const BIRD_COUNT = 30; // Flock size

// Create a single bird entity
function createBird(x, z) {
    const group = new THREE.Group();
    
    // Materials - Specific distribution
    // 80% Black, 15% Blue, 5% Red
    const r = Math.random();
    let color;
    if (r < 0.80) {
        color = 0x111111; // Black (not pure black to show shading)
    } else if (r < 0.95) {
        color = 0x0000FF; // Blue
    } else {
        color = 0xFF0000; // Red
    }
    
    const birdMaterial = new THREE.MeshBasicMaterial({ color: color, flatShading: true });
    const wingMaterial = new THREE.MeshBasicMaterial({ color: color, flatShading: true });
    const beakMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA500, flatShading: true }); // Orange beak
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, flatShading: true });

    // --- Body ---
    const bodyGeo = new THREE.ConeGeometry(0.15, 0.4, 6);
    const body = new THREE.Mesh(bodyGeo, birdMaterial);
    body.rotation.x = Math.PI / 2; // Point forward
    group.add(body);

    // --- Head ---
    const headGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const head = new THREE.Mesh(headGeo, birdMaterial);
    head.position.set(0, 0.1, 0.2); // Up and forward
    group.add(head);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
    const beak = new THREE.Mesh(beakGeo, beakMaterial);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0, 0.15);
    head.add(beak);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.08, 0.05, 0.05);
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.08, 0.05, 0.05);
    head.add(rightEye);

    // --- Wings ---
    const wingGeo = new THREE.BoxGeometry(0.4, 0.02, 0.2);
    // Move pivot to shoulder
    wingGeo.translate(0.2, 0, 0); 

    // Left Wing
    const leftWing = new THREE.Mesh(wingGeo, wingMaterial);
    leftWing.position.set(0.05, 0.05, 0);
    group.add(leftWing);

    // Right Wing (mirrored)
    const rightWing = new THREE.Mesh(wingGeo, wingMaterial);
    rightWing.position.set(-0.05, 0.05, 0);
    rightWing.rotation.z = Math.PI; // Flip
    group.add(rightWing);

    // --- Tail ---
    const tailGeo = new THREE.BoxGeometry(0.2, 0.02, 0.3);
    const tail = new THREE.Mesh(tailGeo, birdMaterial);
    tail.position.set(0, 0, -0.3);
    group.add(tail);

    // Initial placement (random)
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y + 10, z); // Start in air

    scene.add(group);
    objects.push(group);

    return {
        group: group,
        leftWing: leftWing,
        rightWing: rightWing,
        state: 'FLYING', // IDLE_GROUND, IDLE_TREE, FLYING, TAKEOFF, LANDING
        targetPos: new THREE.Vector3(),
        timer: Math.random() * 5,
        speed: 8 + Math.random() * 4,
        id: Math.random()
    };
}

// Initialize the flock
function initBirds() {
    if (typeof getTerrainHeightAt !== 'function') {
        setTimeout(initBirds, 100);
        return;
    }

    const spawnRadius = 300;
    for (let i = 0; i < BIRD_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * spawnRadius;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        
        const bird = createBird(x, z);
        pickNewTarget(bird); // Start with a target
        birdList.push(bird);
    }
    console.log(`Spawned ${BIRD_COUNT} birds.`);
}

function pickNewTarget(bird) {
    // 70% chance to land on tree (increased from 50%), 15% ground, 15% random air point
    const r = Math.random();
    
    if (r < 0.7 && treeData.length > 0) {
        // Pick a random tree
        const tree = treeData[Math.floor(Math.random() * treeData.length)];
        
        // Target top of tree
        // Estimate tree height (Pine: ~25-35, Oak: ~15-20)
        // If userData.treeHeight is set, use it
        // Note: treeData stores simple objects, but tree.group might be null if it's a sprite.
        // tree.position is always valid.
        
        let height = 20;
        if (tree.isOak) height = 15;
        else height = 30;
        
        // Add random offset
        bird.targetPos.set(
            tree.position.x + (Math.random() - 0.5) * 5,
            tree.position.y + height + 2, 
            tree.position.z + (Math.random() - 0.5) * 5
        );
        bird.targetState = 'IDLE_TREE';
    } 
    else if (r < 0.85) { // 0.7 to 0.85 = 15% Ground
        // Ground target
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 300;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = getTerrainHeightAt(x, z);
        
        bird.targetPos.set(x, y, z);
        bird.targetState = 'IDLE_GROUND';
    } 
    else {
        // Air target (fly through)
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 300;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        const y = getTerrainHeightAt(x, z) + 15 + Math.random() * 20;
        
        bird.targetPos.set(x, y, z);
        bird.targetState = 'FLYING'; // Just keep flying
    }
}

// Update bird loop
function updateBirds(delta) {
    if (!character || birdList.length === 0) return;

    const time = Date.now() * 0.001;

    birdList.forEach(bird => {
        // Animation
        if (bird.state === 'FLYING' || bird.state === 'TAKEOFF' || bird.state === 'LANDING') {
            // Flap wings
            const flapSpeed = bird.state === 'TAKEOFF' ? 25 : 15;
            bird.leftWing.rotation.z = Math.sin(time * flapSpeed) * 0.5;
            bird.rightWing.rotation.z = Math.PI - Math.sin(time * flapSpeed) * 0.5;
            
            // Bob body
            bird.group.position.y += Math.sin(time * 20) * 0.02;
        } else {
            // Idle wings folded
            bird.leftWing.rotation.z = 0.2;
            bird.rightWing.rotation.z = Math.PI - 0.2;
        }

        // Behavior State Machine
        if (bird.state === 'IDLE_GROUND' || bird.state === 'IDLE_TREE') {
            bird.timer -= delta;
            
            // Randomly peck or look around
            if (Math.random() < 0.05) {
                bird.group.rotation.y += (Math.random() - 0.5) * 1.0;
            }
            
            // Takeoff when timer ends or if player is too close
            const distToPlayer = bird.group.position.distanceTo(character.position);
            if (bird.timer <= 0 || (distToPlayer < 10 && (moveForward || moveBackward || isFlying))) {
                bird.state = 'TAKEOFF';
                pickNewTarget(bird);
                bird.timer = 0; // Reset timer
                
                // If fleeing, ensure target is away from player
                if (distToPlayer < 10) {
                    const fleeDir = new THREE.Vector3().subVectors(bird.group.position, character.position).normalize();
                    bird.targetPos.add(fleeDir.multiplyScalar(50));
                }
            }
        }
        else if (bird.state === 'TAKEOFF') {
            // Move up rapidly
            bird.group.position.y += 10 * delta;
            
            // Move towards target
            const dir = new THREE.Vector3().subVectors(bird.targetPos, bird.group.position).normalize();
            bird.group.position.add(dir.multiplyScalar(bird.speed * delta));
            
            // Face target
            const targetRotation = Math.atan2(dir.x, dir.z);
            bird.group.rotation.y = targetRotation; // Instant turn for arcade feel
            
            // Transition to flying once high enough
            if (bird.group.position.y > getTerrainHeightAt(bird.group.position.x, bird.group.position.z) + 5) {
                bird.state = 'FLYING';
            }
        }
        else if (bird.state === 'FLYING') {
            const dist = bird.group.position.distanceTo(bird.targetPos);
            
            if (dist < 5) {
                // Near target
                if (bird.targetState === 'FLYING') {
                    // Just a waypoint, pick new one
                    pickNewTarget(bird);
                } else {
                    bird.state = 'LANDING';
                }
            }
            
            // Move towards target
            const dir = new THREE.Vector3().subVectors(bird.targetPos, bird.group.position).normalize();
            bird.group.position.add(dir.multiplyScalar(bird.speed * delta));
            
            // Banking effect
            bird.group.rotation.y = Math.atan2(dir.x, dir.z);
            bird.group.rotation.z = -dir.x * 0.5; // Slight bank
        }
        else if (bird.state === 'LANDING') {
            const dist = bird.group.position.distanceTo(bird.targetPos);
            
            // Lerp to target
            const dir = new THREE.Vector3().subVectors(bird.targetPos, bird.group.position).normalize();
            bird.group.position.add(dir.multiplyScalar(bird.speed * 0.5 * delta)); // Slow down
            
            // Face target
            bird.group.rotation.y = Math.atan2(dir.x, dir.z);
            bird.group.rotation.z = 0; // Level out
            
            if (dist < 0.5) {
                bird.state = bird.targetState;
                bird.timer = 2 + Math.random() * 5; // Rest for a while
            }
        }
    });
}

