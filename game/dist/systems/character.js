// Character creation and movement logic
// Uses Systems registry pattern for organized update loop

// CharacterSystem - manages player character creation and movement
const CharacterSystem = {
    settings: null,

    init() {
        // Character is created in core.js, we just need to initialize spawn
        // This will be called when terrain is ready
    },

    update(delta) {
        updateCharacterMovement(delta);
    },

    getSettings() {
        if (!this.settings) {
            this.settings = getCharacterSettings();
        }
        return this.settings;
    },

    refreshSettings() {
        this.settings = null;
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('character', CharacterSystem);
}

// Get character config values with fallbacks
function getCharacterSettings() {
    const useConfig = typeof CONFIG !== 'undefined';

    // For chunked terrain, use half the world size as boundary
    const worldSize = useConfig ? CONFIG.get('terrain.size', 50000) : 50000;
    const defaultBoundary = worldSize / 2;

    return {
        moveSpeed: useConfig ? CONFIG.get('character.moveSpeed', 12.0) : 12.0,
        flySpeed: useConfig ? CONFIG.get('character.flySpeed', 10.0) : 10.0,
        rotationSpeed: useConfig ? CONFIG.get('character.rotationSpeed', 2.0) : 2.0,
        gravity: useConfig ? CONFIG.get('character.gravity', 25.0) : 25.0,
        boundary: useConfig ? CONFIG.get('terrain.boundary', defaultBoundary) : defaultBoundary,
        spawn: {
            position: {
                x: useConfig ? CONFIG.get('spawn.position.x', 0) : 0,
                z: useConfig ? CONFIG.get('spawn.position.z', 0) : 0
            },
            rotation: useConfig ? CONFIG.get('spawn.rotation', 0) : 0
        }
    };
}

// Function to create character
function createCharacter() {
    const group = new THREE.Group();

    // Body with Flat Shading - Reduced segments for lower poly count
    const bodySegments = PERFORMANCE.characterDetail.bodySegments;
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, bodySegments);
    const bodyMaterial = new THREE.MeshLambertMaterial({
        color: 0xFF0000
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Head with Flat Shading - Reduced segments
    const headSegments = PERFORMANCE.characterDetail.headSegments;
    const headGeometry = new THREE.SphereGeometry(0.5, headSegments, headSegments);
    const headMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFFF00
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.receiveShadow = true;
    head.position.y = 1.5;
    group.add(head);

    // Cone Hat with Flat Shading - Reduced segments
    const hatSegments = PERFORMANCE.characterDetail.hatSegments;
    const hatGeometry = new THREE.ConeGeometry(0.6, 1, hatSegments);
    const hatMaterial = new THREE.MeshLambertMaterial({ color: 0x0000FF });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.castShadow = true;
    hat.receiveShadow = true;
    hat.position.y = 2.3;
    group.add(hat);

    group.position.y = 1;

    // Add to objects for collision detection
    GAME.world.objects.push(group);

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

    if (typeof gameLog === 'function') gameLog(`Character spawned at (${spawnX}, ${spawnY.toFixed(2)}, ${spawnZ})`);
}

// Jump state
let verticalVelocity = 0;
let isOnGround = true;
const JUMP_FORCE = 12;

// Character movement calculations (called from game.js) - Minecraft-style controls
function updateCharacterMovement(delta) {
    if (!isTerrainReady) return; // Do not run movement logic until terrain is ready

    // Get movement parameters from config
    const charConfig = getCharacterSettings();
    let moveSpeed = charConfig.moveSpeed;
    const flySpeed = charConfig.flySpeed;
    const gravity = charConfig.gravity;

    // Sprint multiplier
    if (isSprinting) {
        moveSpeed *= 1.5;
    }

    // Get camera yaw for movement direction (Minecraft-style)
    const yaw = typeof getCameraYaw === 'function' ? getCameraYaw() : character.rotation.y;

    // Calculate movement direction based on camera yaw
    let moveX = 0;
    let moveZ = 0;

    // Forward/backward movement (in camera direction)
    if (moveForward) {
        moveX += Math.sin(yaw) * moveSpeed * delta;
        moveZ += Math.cos(yaw) * moveSpeed * delta;
    }
    if (moveBackward) {
        moveX -= Math.sin(yaw) * moveSpeed * delta;
        moveZ -= Math.cos(yaw) * moveSpeed * delta;
    }

    // Strafe movement (perpendicular to camera direction)
    if (strafeLeft) {
        moveX += Math.sin(yaw + Math.PI / 2) * moveSpeed * delta;
        moveZ += Math.cos(yaw + Math.PI / 2) * moveSpeed * delta;
    }
    if (strafeRight) {
        moveX += Math.sin(yaw - Math.PI / 2) * moveSpeed * delta;
        moveZ += Math.cos(yaw - Math.PI / 2) * moveSpeed * delta;
    }

    // Update character rotation to face movement direction (smooth turn)
    if (moveX !== 0 || moveZ !== 0) {
        const targetRotation = Math.atan2(moveX, moveZ);
        // Smooth rotation interpolation
        let rotDiff = targetRotation - character.rotation.y;
        // Normalize to -PI to PI
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        character.rotation.y += rotDiff * Math.min(1, delta * 10);
    }

    // Block collision constants
    const BLOCK_SIZE = 2; // Must match GRID_SIZE in building.js
    const BLOCK_HALF = BLOCK_SIZE / 2;
    const CHAR_RADIUS = 0.6; // Character collision radius

    // Helper function to check if a position collides with any block
    function collidesWithBlock(testX, testZ, charY) {
        for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            if (!obj || !obj.userData.isBlock || obj.userData.noCollision) continue;

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

    // Get terrain height
    let groundY = 0;
    if (typeof getTerrainHeightAt === 'function') {
        groundY = getTerrainHeightAt(character.position.x, character.position.z);
    }

    // Check for block landing (Minecraft-style blocks)
    let onBlock = false;

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (obj && obj.userData.isBlock && !obj.userData.noCollision) {
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

    // Check if on ground
    isOnGround = character.position.y <= targetY + 0.1;

    // Handle jumping (Minecraft-style)
    if (isJumping && isOnGround) {
        verticalVelocity = JUMP_FORCE;
        isOnGround = false;
    }

    // Apply gravity and vertical velocity
    if (!isOnGround || verticalVelocity > 0) {
        verticalVelocity -= gravity * delta;
        character.position.y += verticalVelocity * delta;

        // Land on ground
        if (character.position.y <= targetY) {
            character.position.y = targetY;
            verticalVelocity = 0;
            isOnGround = true;
        }
    } else {
        // On ground - follow terrain
        const heightDiff = targetY - character.position.y;
        if (Math.abs(heightDiff) > 0.01) {
            if (heightDiff > 0) {
                // Going up (climbing slope)
                character.position.y += Math.min(heightDiff, moveSpeed * delta * 1.5);
            } else {
                // Going down
                character.position.y = targetY;
            }
        }
    }

    // Boundary check using config value
    const boundary = charConfig.boundary;
    character.position.x = Math.max(-boundary, Math.min(boundary, character.position.x));
    character.position.z = Math.max(-boundary, Math.min(boundary, character.position.z));

    // Get camera angles from mouse look
    const cameraYaw = typeof getCameraYaw === 'function' ? getCameraYaw() : 0;
    const cameraPitch = typeof getCameraPitch === 'function' ? getCameraPitch() : 0;

    // Camera mode handling
    if (isFirstPerson) {
        // First-person: camera at character's eye level, mouse controls view
        character.visible = false;

        const eyeHeight = 2.5; // Higher eye level for better view
        camera.position.set(
            character.position.x,
            character.position.y + eyeHeight,
            character.position.z
        );

        // Calculate look direction from yaw and pitch
        const lookDir = new THREE.Vector3(
            Math.sin(cameraYaw) * Math.cos(cameraPitch),
            Math.sin(cameraPitch),
            Math.cos(cameraYaw) * Math.cos(cameraPitch)
        );

        camera.lookAt(
            camera.position.x + lookDir.x,
            camera.position.y + lookDir.y,
            camera.position.z + lookDir.z
        );
    } else {
        // Third-person: camera orbits around character based on mouse
        character.visible = true;

        const cameraDistance = 15;
        const cameraHeight = 7;

        const camX = character.position.x - Math.sin(cameraYaw) * cameraDistance * Math.cos(cameraPitch);
        const camY = character.position.y + cameraHeight - Math.sin(cameraPitch) * cameraDistance;
        const camZ = character.position.z - Math.cos(cameraYaw) * cameraDistance * Math.cos(cameraPitch);

        camera.position.set(camX, camY, camZ);
        camera.lookAt(character.position.x, character.position.y + 2, character.position.z);
    }
}


// Make available globally
window.createCharacter = createCharacter;
window.initCharacterSpawn = initCharacterSpawn;
window.updateCharacterMovement = updateCharacterMovement;
window.CharacterSystem = CharacterSystem;
