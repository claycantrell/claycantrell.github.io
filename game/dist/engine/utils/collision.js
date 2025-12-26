// Shared Block Collision Detection
// Used by all entity systems for consistent collision behavior

const BLOCK_SIZE = 2; // Match building.js GRID_SIZE
const BLOCK_HALF = BLOCK_SIZE / 2;

/**
 * Check if a position collides with any placed blocks
 * @param {number} testX - X position to test
 * @param {number} testZ - Z position to test
 * @param {number} testY - Y position to test
 * @param {number} radius - Collision radius of the entity (default 0.5)
 * @param {number} height - Height of the entity for vertical checks (default 1.5)
 * @returns {Object|null} The colliding block object, or null if no collision
 */
function checkBlockCollision(testX, testZ, testY, radius = 0.5, height = 1.5) {
    if (typeof GAME === 'undefined' || !GAME.world?.objects) return null;

    for (const obj of GAME.world.objects) {
        if (!obj || !obj.userData?.isBlock || obj.userData.noCollision) continue;

        const blockTop = obj.position.y + BLOCK_HALF;
        const blockBottom = obj.position.y - BLOCK_HALF;

        // Skip if entity is on top of block or well below it
        if (testY >= blockTop - 0.3 || testY + height < blockBottom) continue;

        // Check horizontal overlap (AABB collision)
        const dx = Math.abs(testX - obj.position.x);
        const dz = Math.abs(testZ - obj.position.z);

        if (dx < BLOCK_HALF + radius && dz < BLOCK_HALF + radius) {
            return obj; // Return the colliding block
        }
    }
    return null;
}

/**
 * Try to find an alternative movement direction when blocked
 * @param {THREE.Vector3} currentPos - Current position
 * @param {Object} collidingBlock - The block we're colliding with
 * @param {number} speed - Movement speed
 * @param {number} delta - Time delta
 * @param {number} radius - Entity collision radius
 * @returns {Object|null} Alternative position {x, z} or null if no path
 */
function findAlternativePath(currentPos, collidingBlock, speed, delta, radius = 0.5) {
    // Move perpendicular to block
    const blockDir = new THREE.Vector3(
        currentPos.x - collidingBlock.position.x,
        0,
        currentPos.z - collidingBlock.position.z
    ).normalize();

    const perpDir = new THREE.Vector3(-blockDir.z, 0, blockDir.x);
    const altX = currentPos.x + perpDir.x * speed * delta;
    const altZ = currentPos.z + perpDir.z * speed * delta;

    // Check if alternative path is clear
    if (!checkBlockCollision(altX, altZ, currentPos.y, radius)) {
        return { x: altX, z: altZ };
    }

    // Try opposite perpendicular direction
    const altX2 = currentPos.x - perpDir.x * speed * delta;
    const altZ2 = currentPos.z - perpDir.z * speed * delta;

    if (!checkBlockCollision(altX2, altZ2, currentPos.y, radius)) {
        return { x: altX2, z: altZ2 };
    }

    return null; // Completely blocked
}

// Make available globally
window.checkBlockCollision = checkBlockCollision;
window.findAlternativePath = findAlternativePath;
