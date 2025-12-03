// Character creation and movement logic

// Function to create character
function createCharacter() {
    const group = new THREE.Group();

    // Body with Flat Shading - Reduced segments for lower poly count
    const bodySegments = PERFORMANCE.characterDetail.bodySegments;
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, bodySegments);
    const bodyMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Head with Flat Shading - Reduced segments
    const headSegments = PERFORMANCE.characterDetail.headSegments;
    const headGeometry = new THREE.SphereGeometry(0.5, headSegments, headSegments);
    const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    group.add(head);

    // Cone Hat with Flat Shading - Reduced segments
    const hatSegments = PERFORMANCE.characterDetail.hatSegments;
    const hatGeometry = new THREE.ConeGeometry(0.6, 1, hatSegments);
    const hatMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 2.3;
    group.add(hat);

    group.position.y = 1;

    // Add to objects for collision detection
    objects.push(group);

    return group;
}

// Character movement calculations (called from game.js)
// Character movement calculations (called from game.js) - Raycasting-based terrain following
function updateCharacterMovement(delta) {
    if (!isTerrainReady) return; // Do not run movement logic until terrain is ready

    // Movement parameters
    const rotationSpeed = 2.0;
    const moveSpeed = 20.0;
    const flySpeed = 15.0;
    const gravity = 25.0;

    // Handle rotation
    if (rotateLeft) {
        character.rotation.y += rotationSpeed * delta;
    }
    if (rotateRight) {
        character.rotation.y -= rotationSpeed * delta;
    }

    // Calculate horizontal movement
    let moveX = 0;
    let moveZ = 0;
    if (moveForward) {
        moveZ = -moveSpeed * delta;
    }
    if (moveBackward) {
        moveZ = moveSpeed * delta;
    }

    // Apply character rotation to movement
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(character.quaternion);
    moveX = forward.x * moveZ;
    moveZ = forward.z * moveZ;

    // Move character horizontally first
    character.position.x += moveX;
    character.position.z += moveZ;

    // Check for collision with objects
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        
        // Skip ground plane and portals
        if (obj.geometry && obj.geometry.type === 'PlaneGeometry') continue;
        // Also check if it's a build object (MeshStandardMaterial)
        
        // Simple bounding box/distance check
        const dist = character.position.distanceTo(obj.position);
        
        // If it's a build object (approximate radius check)
        if (dist < 3.0) { // Collision radius
            // Simple push-back
            const dir = new THREE.Vector3().subVectors(character.position, obj.position).normalize();
            character.position.add(dir.multiplyScalar(0.5));
        }
    }

    // Use heightmap to find exact ground height (much faster and reliable than raycasting)
    let groundY = 0;
    if (typeof getTerrainHeightAt === 'function') {
        groundY = getTerrainHeightAt(character.position.x, character.position.z);
    }

    // Check for tree landing
    let onTree = false;
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (obj && obj.userData.isTree) {
            const treeTop = obj.userData.absoluteTreeHeight || (obj.position.y + 40);
            const dx = character.position.x - obj.position.x;
            const dz = character.position.z - obj.position.z;

            if (Math.sqrt(dx * dx + dz * dz) < 3.5 && character.position.y >= treeTop - 1 && character.position.y <= treeTop + 2) {
                groundY = treeTop;
                onTree = true;
                break;
            }
        }
    }

    // Target Y position (1 unit above ground/tree)
    const targetY = groundY + 1.0;

    // Handle vertical movement
    if (isFlying) {
        character.position.y += flySpeed * delta;
    } else {
        // Smoothly approach target height
        const heightDiff = targetY - character.position.y;

        if (Math.abs(heightDiff) > 0.01) {
            if (heightDiff > 0) {
                // Going up (climbing slope)
                character.position.y += Math.min(heightDiff, moveSpeed * delta * 1.5);
            } else {
                // Going down (falling or descending)
                character.position.y += Math.max(heightDiff, -gravity * delta);
            }
        } else {
            // Close enough - snap to target
            character.position.y = targetY;
        }
    }

    // Boundary check
    const boundary = 120;
    character.position.x = Math.max(-boundary, Math.min(boundary, character.position.x));
    character.position.z = Math.max(-boundary, Math.min(boundary, character.position.z));

    // Camera follows character
    // To show more sky (move character lower on screen), we need to look ABOVE the character
    // Increasing the Y value in lookAt will tilt the camera UP, pushing the character DOWN on screen
    const cameraOffset = new THREE.Vector3(0, 7, -15);
    cameraOffset.applyQuaternion(character.quaternion);
    camera.position.copy(character.position).add(cameraOffset);
    // Previously: lookAt(..., y + 1, ...)
    // Now: lookAt(..., y + 5, ...) to look higher up, shifting character down
    camera.lookAt(character.position.x, character.position.y + 5, character.position.z);
}

