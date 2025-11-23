// Bunny system for 3D Demo
// Handles creation, animation, and behavior of bunnies

let bunnyList = [];
const BUNNY_COUNT = 20; // Lots of bunnies!

// Create a single bunny entity
function createBunny(x, z) {
    const group = new THREE.Group();
    
    // Materials - Randomize coat slightly
    const colors = [0xFFFFFF, 0xDCDCDC, 0xD2B48C, 0xA9A9A9]; // White, Gainsboro, Tan, DarkGray
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const bunnyMaterial = new THREE.MeshBasicMaterial({ color: color, flatShading: true });
    const earInnerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFC0CB, flatShading: true }); // Pink
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, flatShading: true });

    // --- Body ---
    // Main body: Sphere scaled to be oval
    const bodyGeo = new THREE.SphereGeometry(0.4, 6, 6);
    const body = new THREE.Mesh(bodyGeo, bunnyMaterial);
    body.scale.set(1, 0.8, 1.2); // Flatten and lengthen
    body.position.y = 0.4;
    group.add(body);

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.7, 0.5);
    group.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.25, 6, 6);
    const head = new THREE.Mesh(headGeo, bunnyMaterial);
    headGroup.add(head);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.15, 0.05, 0.2);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.15, 0.05, 0.2);
    headGroup.add(rightEye);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.1, 0.6, 0.05);
    
    const leftEar = new THREE.Mesh(earGeo, bunnyMaterial);
    leftEar.position.set(0.1, 0.4, 0);
    leftEar.rotation.x = -0.2;
    leftEar.rotation.z = 0.2;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, bunnyMaterial);
    rightEar.position.set(-0.1, 0.4, 0);
    rightEar.rotation.x = -0.2;
    rightEar.rotation.z = -0.2;
    headGroup.add(rightEar);

    // --- Tail ---
    const tailGeo = new THREE.SphereGeometry(0.15, 4, 4);
    const tail = new THREE.Mesh(tailGeo, bunnyMaterial);
    tail.position.set(0, 0.3, -0.6);
    group.add(tail);

    // Initial placement
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y, z);

    // Random scale for variety (babies vs adults)
    const scale = 0.8 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);

    scene.add(group);
    objects.push(group);

    return {
        group: group,
        headGroup: headGroup,
        ears: [leftEar, rightEar],
        state: 'IDLE', // IDLE, HOP_PREPARE, HOP_AIR, HOP_LAND
        timer: Math.random() * 5,
        hopVelocity: new THREE.Vector3(),
        targetDir: new THREE.Vector3(0, 0, 1),
        hopHeight: 0,
        baseY: y, // Store base terrain height
        id: Math.random()
    };
}

// Initialize the bunnies
function initBunnies() {
    if (typeof getTerrainHeightAt !== 'function') {
        setTimeout(initBunnies, 100);
        return;
    }

    const spawnRadius = 300;
    for (let i = 0; i < BUNNY_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * spawnRadius;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        
        bunnyList.push(createBunny(x, z));
    }
    console.log(`Spawned ${BUNNY_COUNT} bunnies.`);
}

// Update bunny loop
function updateBunnies(delta) {
    if (!character || bunnyList.length === 0) return;

    const playerPos = character.position;
    const time = Date.now() * 0.001;

    bunnyList.forEach(bunny => {
        bunny.timer -= delta;
        const distToPlayer = bunny.group.position.distanceTo(playerPos);

        // Get terrain height at current X, Z
        let terrainY = 0;
        if (typeof getTerrainHeightAt === 'function') {
            terrainY = getTerrainHeightAt(bunny.group.position.x, bunny.group.position.z);
        }

        // Flee behavior
        // Increase detection distance significantly (from 35 to 60)
        // Make them flee BEFORE player gets close
        // Only flee if player is moving
        const isPlayerMoving = (typeof moveForward !== 'undefined' && moveForward) || 
                               (typeof moveBackward !== 'undefined' && moveBackward) || 
                               (typeof isFlying !== 'undefined' && isFlying);

        const isFleeing = distToPlayer < 60 && isPlayerMoving;

        // State Machine
        if (bunny.state === 'IDLE') {
            // Snap to ground
            bunny.group.position.y = terrainY;
            
            // Idle animation: Twitch ears or nose
            bunny.ears[0].rotation.z = 0.2 + Math.sin(time * 20) * 0.05;
            bunny.ears[1].rotation.z = -0.2 - Math.sin(time * 20 + 1) * 0.05;

            if (bunny.timer <= 0 || isFleeing) {
                // Prepare to hop
                bunny.state = 'HOP_PREPARE';
                bunny.timer = isFleeing ? 0.02 : 0.1; // Almost instant reaction
                
                // Determine direction
                if (isFleeing) {
                    // Run away!
                    const fleeDir = new THREE.Vector3().subVectors(bunny.group.position, playerPos).normalize();
                    // Add randomness
                    fleeDir.x += (Math.random() - 0.5) * 0.5;
                    fleeDir.z += (Math.random() - 0.5) * 0.5;
                    fleeDir.normalize();
                    bunny.targetDir.copy(fleeDir);
                } else {
                    // Random hop
                    const angle = (Math.random() - 0.5) * Math.PI; // Turn up to 90 deg
                    bunny.targetDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                }
                
                // Rotate to face direction
                const targetRotation = Math.atan2(bunny.targetDir.x, bunny.targetDir.z);
                bunny.group.rotation.y = targetRotation;
            }
        } 
        else if (bunny.state === 'HOP_PREPARE') {
            // Squash animation
            bunny.group.scale.set(1.2, 0.8, 1.2); // Squash down
            bunny.group.position.y = terrainY - 0.1; // Sink slightly
            
            if (bunny.timer <= 0) {
                // Launch!
                bunny.state = 'HOP_AIR';
                bunny.group.scale.set(0.9, 1.1, 0.9); // Stretch
                
                // Increase flee speed significantly (was 18.0 -> 28.0)
                const speed = isFleeing ? 28.0 : 4.0;
                bunny.hopVelocity.copy(bunny.targetDir).multiplyScalar(speed);
                // Higher jump when fleeing to cover more ground
                bunny.hopVelocity.y = isFleeing ? 15.0 : 8.0; 
            }
        }
        else if (bunny.state === 'HOP_AIR') {
            // Physics
            bunny.hopVelocity.y -= 25.0 * delta; // Gravity
            
            // Move
            bunny.group.position.x += bunny.hopVelocity.x * delta;
            bunny.group.position.z += bunny.hopVelocity.z * delta;
            bunny.group.position.y += bunny.hopVelocity.y * delta;
            
            // Check landing
            // Need to check against CURRENT terrain height, not old one
            // We updated terrainY at start of loop for current pos, but we moved X/Z
            if (typeof getTerrainHeightAt === 'function') {
                const newTerrainY = getTerrainHeightAt(bunny.group.position.x, bunny.group.position.z);
                
                if (bunny.group.position.y <= newTerrainY) {
                    // Landed
                    bunny.group.position.y = newTerrainY;
                    bunny.state = 'HOP_LAND';
                    bunny.timer = 0.15; // Recovery time
                    bunny.group.scale.set(1.1, 0.9, 1.1); // Squash on impact
                }
            }
        }
        else if (bunny.state === 'HOP_LAND') {
            // Recover scale
            if (bunny.timer <= 0) {
                bunny.state = 'IDLE';
                // Extremely quick recovery if fleeing to chain jumps (was 0.05 -> 0.02)
                bunny.timer = isFleeing ? 0.02 : (1 + Math.random() * 3); 
                bunny.group.scale.set(1, 1, 1); // Reset scale
            } else {
                // Lerp back to normal scale
                const t = 1 - (bunny.timer / 0.15);
                bunny.group.scale.lerp(new THREE.Vector3(1, 1, 1), t * delta * 10);
            }
        }
    });
}

