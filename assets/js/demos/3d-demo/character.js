// Character creation and movement logic

// Function to create character
function createCharacter() {
    const group = new THREE.Group();

    // Body with Flat Shading - Reduced segments for lower poly count
    const bodySegments = PERFORMANCE.characterDetail.bodySegments;
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, bodySegments);
    const bodyMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        flatShading: true
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Head with Flat Shading - Reduced segments
    const headSegments = PERFORMANCE.characterDetail.headSegments;
    const headGeometry = new THREE.SphereGeometry(0.5, headSegments, headSegments);
    const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        flatShading: true
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    group.add(head);

    // Cone Hat with Flat Shading - Reduced segments
    const hatSegments = PERFORMANCE.characterDetail.hatSegments;
    const hatGeometry = new THREE.ConeGeometry(0.6, 1, hatSegments);
    const hatMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF, flatShading: true });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 2.3;
    group.add(hat);

    group.position.y = 1;

    // Add to objects for collision detection
    objects.push(group);

    return group;
}

// Character movement calculations (called from game.js)
function updateCharacterMovement(delta) {
    // Movement calculations
    velocity.x = 0;
    velocity.z = 0;
    const rotationSpeed = 2.0;
    const moveSpeed = 20.0;

    // Rotate character
    if (rotateLeft) {
        character.rotation.y += rotationSpeed * delta;
    }
    if (rotateRight) {
        character.rotation.y -= rotationSpeed * delta;
    }

    // Move character forward/backward
    if (moveForward) {
        velocity.z = -moveSpeed * delta;
    }
    if (moveBackward) {
        velocity.z = moveSpeed * delta;
    }

    // Calculate movement direction
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(character.quaternion);
    forward.normalize();

    const moveX = forward.x * velocity.z;
    const moveZ = forward.z * velocity.z;

    // Update character's position based on movement
    character.position.x += moveX;
    character.position.z += moveZ;

    // Collision with ground boundaries
    const boundary = 100;
    character.position.x = Math.max(-boundary, Math.min(boundary, character.position.x));
    character.position.z = Math.max(-boundary, Math.min(boundary, character.position.z));

    // Camera follows character and rotates with character's view
    // Original camera setup: closer to character, looking at fixed height
    const cameraOffset = new THREE.Vector3(0, 7, -15);
    cameraOffset.applyQuaternion(character.quaternion);
    camera.position.copy(character.position).add(cameraOffset);
    camera.lookAt(character.position.x, 7, character.position.z);
}

