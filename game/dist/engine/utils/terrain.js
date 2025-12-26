// Terrain Height Utilities
// Provides cached terrain height lookups to reduce per-frame calculations

// Cache for terrain heights - invalidates after maxAge ms
const terrainHeightCache = new Map();
const CACHE_MAX_AGE = 200; // Cache valid for 200ms
const CACHE_GRID_SIZE = 2; // Round positions to this grid for cache keys

/**
 * Get terrain height at position with caching
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {boolean} useCache - Whether to use cache (default true)
 * @returns {number} Terrain height at position
 */
function getTerrainHeight(x, z, useCache = true) {
    // Fall back to raw function if it doesn't exist
    if (typeof getTerrainHeightAt !== 'function') {
        return 0;
    }

    if (!useCache) {
        return getTerrainHeightAt(x, z);
    }

    // Round to grid for cache key (reduces cache misses for nearby positions)
    const gridX = Math.round(x / CACHE_GRID_SIZE) * CACHE_GRID_SIZE;
    const gridZ = Math.round(z / CACHE_GRID_SIZE) * CACHE_GRID_SIZE;
    const key = `${gridX},${gridZ}`;

    const now = Date.now();
    const cached = terrainHeightCache.get(key);

    if (cached && now - cached.time < CACHE_MAX_AGE) {
        return cached.height;
    }

    // Cache miss - calculate and store
    const height = getTerrainHeightAt(x, z);
    terrainHeightCache.set(key, { height, time: now });

    // Cleanup old entries periodically (every 100 new entries)
    if (terrainHeightCache.size > 500) {
        cleanupCache(now);
    }

    return height;
}

/**
 * Remove stale cache entries
 */
function cleanupCache(now) {
    for (const [key, value] of terrainHeightCache.entries()) {
        if (now - value.time > CACHE_MAX_AGE * 2) {
            terrainHeightCache.delete(key);
        }
    }
}

/**
 * Clear the entire terrain cache (call when terrain changes)
 */
function clearTerrainCache() {
    terrainHeightCache.clear();
}

/**
 * Get terrain height with entity offset
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {number} offset - Height offset above terrain (default 0)
 * @returns {number} Terrain height plus offset
 */
function getTerrainHeightWithOffset(x, z, offset = 0) {
    return getTerrainHeight(x, z) + offset;
}

// Make available globally
window.getTerrainHeight = getTerrainHeight;
window.getTerrainHeightWithOffset = getTerrainHeightWithOffset;
window.clearTerrainCache = clearTerrainCache;
