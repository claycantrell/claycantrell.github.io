// Water system - lakes and rivers
// Lakes form in low-lying areas, rivers flow through the terrain

// Water configuration
const WATER_CONFIG = {
    seaLevel: -5,              // Height below which water appears (lakes)
    riverWidth: 8,             // Base width of rivers
    riverDepth: 3,             // How deep rivers cut into terrain
    riverNoiseScale: 0.002,    // Scale for river path noise
    riverThreshold: 0.85,      // Higher = thinner rivers
    lakeColor: 0x1a5f7a,       // Deep blue for lakes
    riverColor: 0x2980b9,      // Lighter blue for rivers
    shallowColor: 0x5dade2,    // Light blue for shallow water
    waterOpacity: 0.85
};

// River noise generator
let riverNoise = null;
let riverNoise2 = null;  // Second layer for more complex patterns

// Initialize water system
function initWaterSystem(seed) {
    riverNoise = new SimplexNoise(seed + '_river');
    riverNoise2 = new SimplexNoise(seed + '_river2');
    console.log('Water system initialized');
}

// Check if a point is in a river - DISABLED
function isRiver(x, z, climate) {
    return false; // Rivers disabled
}

// Get river influence at a point (0-1, higher = more river-like)
function getRiverInfluence(x, z, climate) {
    if (!riverNoise) return 0;

    // Get climate if not provided
    if (!climate && typeof getClimateAt === 'function') {
        climate = getClimateAt(x, z);
    }

    // No rivers on mountains or highlands
    if (climate && (climate.erosion < -0.2 || climate.continentalness > 0.5)) {
        return 0;
    }

    const scale1 = WATER_CONFIG.riverNoiseScale;
    const scale2 = WATER_CONFIG.riverNoiseScale * 2.5;

    const noise1 = riverNoise.noise2D(x * scale1, z * scale1);
    const noise2 = riverNoise2.noise2D(x * scale2 + 500, z * scale2 + 500) * 0.3;

    const combined = Math.abs(noise1 + noise2);
    const threshold = 1 - WATER_CONFIG.riverThreshold;

    if (combined < threshold) {
        // Inside river - return 1 at center, fade to edges
        return 1 - (combined / threshold);
    }

    return 0;
}

// Check if a point is a lake (below sea level and not too mountainous)
function isLake(x, z, terrainHeight, climate) {
    // Below sea level = lake
    if (terrainHeight < WATER_CONFIG.seaLevel) {
        return true;
    }

    // Also check for low continentalness (coastal/ocean areas)
    if (climate && climate.continentalness < -0.6) {
        return true;
    }

    return false;
}

// Get water color based on depth and type
function getWaterColor(terrainHeight, isRiverPoint) {
    if (isRiverPoint) {
        return WATER_CONFIG.riverColor;
    }

    // Depth-based color for lakes
    const depth = WATER_CONFIG.seaLevel - terrainHeight;

    if (depth < 2) {
        return WATER_CONFIG.shallowColor;  // Shallow
    } else if (depth < 8) {
        return WATER_CONFIG.riverColor;    // Medium
    } else {
        return WATER_CONFIG.lakeColor;     // Deep
    }
}

// Modify terrain height for rivers (carve into terrain)
function applyRiverCarving(x, z, originalHeight) {
    const riverInfluence = getRiverInfluence(x, z);

    if (riverInfluence > 0) {
        // Carve river bed - deeper at center
        const carveDepth = WATER_CONFIG.riverDepth * riverInfluence;
        return originalHeight - carveDepth;
    }

    return originalHeight;
}

// Check if point is water (lake or river)
function isWater(x, z, terrainHeight, climate) {
    // Check river first
    if (isRiver(x, z)) {
        return { isWater: true, type: 'river' };
    }

    // Check lake
    if (isLake(x, z, terrainHeight, climate)) {
        return { isWater: true, type: 'lake' };
    }

    return { isWater: false, type: null };
}

// Create water plane for a chunk (called by chunk system)
function createChunkWaterPlane(cx, cz, chunkSize) {
    const geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, 1, 1);

    const material = new THREE.MeshBasicMaterial({
        color: WATER_CONFIG.lakeColor,
        transparent: true,
        opacity: WATER_CONFIG.waterOpacity,
        side: THREE.DoubleSide
    });

    const waterPlane = new THREE.Mesh(geometry, material);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = WATER_CONFIG.seaLevel;

    // Position at chunk center
    const centerX = (cx + 0.5) * chunkSize;
    const centerZ = (cz + 0.5) * chunkSize;
    waterPlane.position.x = centerX;
    waterPlane.position.z = centerZ;

    return waterPlane;
}

// Get water config for external use
function getWaterConfig() {
    return WATER_CONFIG;
}

// Update water config
function setWaterConfig(config) {
    Object.assign(WATER_CONFIG, config);
}

// Make available globally
window.initWater = initWater;
window.createWaterForChunk = createWaterForChunk;
window.isWaterAt = isWaterAt;
window.getWaterHeight = getWaterHeight;
window.setWaterConfig = setWaterConfig;
