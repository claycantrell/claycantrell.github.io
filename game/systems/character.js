// Character creation and movement logic

// Get character config values from map config, with fallbacks
function getCharacterSettings() {
    // getCharacterConfig is defined in map-loader.js (character movement settings)
    const config = typeof getCharacterConfig === 'function' ? getCharacterConfig() : {};
    // getSpawnConfig is defined in map-loader.js (spawn position - root level in config)
    const spawnConfig = typeof getSpawnConfig === 'function' ? getSpawnConfig() : {};
    // getTerrainConfig is defined in map-loader.js (boundary is in terrain config)
    const terrainConfig = typeof getTerrainConfig === 'function' ? getTerrainConfig() : {};

    // For chunked terrain, use half the world size as boundary (or terrain size / 2)
    const worldSize = terrainConfig.size || 50000;
    const defaultBoundary = worldSize / 2;

    return {
        moveSpeed: config.moveSpeed ?? 20.0,
        flySpeed: config.flySpeed ?? 15.0,
        rotationSpeed: config.rotationSpeed ?? 2.0,
        gravity: config.gravity ?? 25.0,
        boundary: terrainConfig.boundary ?? defaultBoundary,
        spawn: {
            position: {
                x: spawnConfig.position?.x ?? 0,
                z: spawnConfig.position?.z ?? 0
            },
            rotation: spawnConfig.rotation ?? 0
        }
    };
}

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

// Initialize character position from config (call after terrain is ready)
function initCharacterSpawn(charGroup) {
    const charConfig = getCharacterSettings();
    const spawnX = charConfig.spawn.position.x;
    const spawnZ = charConfig.spawn.position.z;

    // Get terrain height at spawn point
    const spawnY = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(spawnX, spawnZ) + 1 : 1;

    charGroup.position.set(spawnX, spawnY, spawnZ);
    charGroup.rotation.y = charConfig.spawn.rotation;

    console.log(`Character spawned at (${spawnX}, ${spawnY.toFixed(2)}, ${spawnZ}) rotation: ${charConfig.spawn.rotation}`);
}

// Character movement calculations (called from game.js) - Raycasting-based terrain following
function updateCharacterMovement(delta) {
    if (!isTerrainReady) return; // Do not run movement logic until terrain is ready

    // Get movement parameters from config
    const charConfig = getCharacterSettings();
    const rotationSpeed = charConfig.rotationSpeed;
    const moveSpeed = charConfig.moveSpeed;
    const flySpeed = charConfig.flySpeed;
    const gravity = charConfig.gravity;

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

    // Boundary check using config value
    const boundary = charConfig.boundary;
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

