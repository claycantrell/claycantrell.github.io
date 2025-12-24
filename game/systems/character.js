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

    // Block collision constants
    const BLOCK_SIZE = 2; // Must match GRID_SIZE in building.js
    const BLOCK_HALF = BLOCK_SIZE / 2;
    const CHAR_RADIUS = 0.6; // Character collision radius

    // Helper function to check if a position collides with any block
    function collidesWithBlock(testX, testZ, charY) {
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || !obj.userData.isBlock) continue;

            const blockTop = obj.position.y + BLOCK_HALF;
            const blockBottom = obj.position.y - BLOCK_HALF;

            // Skip if character is on top of this block
            if (charY >= blockTop - 0.3) continue;

            // Skip if character is below this block
            if (charY + 2 < blockBottom) continue;

            // Check horizontal overlap (AABB collision)
            const dx = Math.abs(testX - obj.position.x);
            const dz = Math.abs(testZ - obj.position.z);

            if (dx < BLOCK_HALF + CHAR_RADIUS && dz < BLOCK_HALF + CHAR_RADIUS) {
                return obj; // Return the colliding block
            }
        }
        return null;
    }

    // Try to move, but check for collisions
    const newX = character.position.x + moveX;
    const newZ = character.position.z + moveZ;

    // Check X movement separately from Z movement (allows sliding along walls)
    const collideX = collidesWithBlock(newX, character.position.z, character.position.y);
    const collideZ = collidesWithBlock(character.position.x, newZ, character.position.y);

    if (!collideX) {
        character.position.x = newX;
    }
    if (!collideZ) {
        character.position.z = newZ;
    }

    // Use heightmap to find exact ground height (much faster and reliable than raycasting)
    let groundY = 0;
    if (typeof getTerrainHeightAt === 'function') {
        groundY = getTerrainHeightAt(character.position.x, character.position.z);
    }

    // Check for block landing (Minecraft-style blocks)
    let onBlock = false;

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (obj && obj.userData.isBlock) {
            const blockTop = obj.position.y + BLOCK_HALF;
            const dx = Math.abs(character.position.x - obj.position.x);
            const dz = Math.abs(character.position.z - obj.position.z);

            // Check if character is within block's horizontal bounds
            if (dx < BLOCK_HALF + 0.3 && dz < BLOCK_HALF + 0.3) {
                // Check if character is above the block (within landing range)
                if (character.position.y >= blockTop - 0.5 && character.position.y <= blockTop + 3) {
                    // Only use this block if it's higher than current ground
                    if (blockTop > groundY) {
                        groundY = blockTop;
                        onBlock = true;
                    }
                }
            }
        }
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

    // Camera mode handling
    if (isFirstPerson) {
        // First-person: camera at character's eye level, looking forward
        character.visible = false; // Hide character model in first person

        // Position camera at head height
        const eyeHeight = 1.8;
        camera.position.set(
            character.position.x,
            character.position.y + eyeHeight,
            character.position.z
        );

        // Look in the direction the character is facing
        const lookDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(character.quaternion);
        camera.lookAt(
            character.position.x + lookDirection.x * 10,
            character.position.y + eyeHeight,
            character.position.z + lookDirection.z * 10
        );
    } else {
        // Third-person: camera follows behind character
        character.visible = true; // Show character model

        const cameraOffset = new THREE.Vector3(0, 7, -15);
        cameraOffset.applyQuaternion(character.quaternion);
        camera.position.copy(character.position).add(cameraOffset);
        camera.lookAt(character.position.x, character.position.y + 5, character.position.z);
    }
}

