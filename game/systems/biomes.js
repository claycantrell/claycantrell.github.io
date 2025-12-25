// Biome registry - Minecraft-style multi-noise biome selection
// Uses 6D parameter space with closest-match algorithm
// Based on Minecraft 1.18+ world generation

// Minecraft's exact parameter level breakpoints
const PARAM_LEVELS = {
    // Temperature: 5 levels (frozen -> hot)
    temperature: [-1.0, -0.45, -0.15, 0.2, 0.55, 1.0],
    // Humidity: 5 levels (arid -> wet)
    humidity: [-1.0, -0.35, -0.1, 0.1, 0.3, 1.0],
    // Continentalness: 7 zones (ocean -> far inland)
    continentalness: [-1.2, -1.05, -0.455, -0.19, -0.11, 0.03, 0.3, 1.0],
    // Erosion: 7 levels (peaks -> flat)
    erosion: [-1.0, -0.78, -0.375, -0.2225, 0.05, 0.45, 0.55, 1.0]
};

// Biome definitions with 6D parameter targets
// Each biome specifies ideal parameter values (center of its region)
const BIOMES = {
    // === FROZEN BIOMES (temp level 0: -1.0 to -0.45) ===
    snowyPeaks: {
        id: 'snowyPeaks',
        name: 'Snowy Peaks',
        params: { temp: -0.7, humid: 0, cont: 0.4, erosion: -0.9, weird: 0 },
        color: 0xE8E8E8,
        textureType: 'snow',
        vegetation: { density: 0.0, types: {} },
        entities: { deer: 0, bunny: 0, bird: 0.3 }
    },
    snowySlopes: {
        id: 'snowySlopes',
        name: 'Snowy Slopes',
        params: { temp: -0.7, humid: 0, cont: 0.3, erosion: -0.5, weird: 0 },
        color: 0xDCDCDC,
        textureType: 'snow',
        vegetation: { density: 0.05, types: { pine: 1.0 } },
        entities: { deer: 0.2, bunny: 0.1, bird: 0.3 }
    },
    tundra: {
        id: 'tundra',
        name: 'Tundra',
        params: { temp: -0.7, humid: -0.5, cont: 0.1, erosion: 0.3, weird: 0 },
        color: 0x708090,
        textureType: 'snow',
        vegetation: { density: 0.02, types: { pine: 1.0 } },
        entities: { deer: 0.3, bunny: 0.1, bird: 0.1 }
    },
    taiga: {
        id: 'taiga',
        name: 'Taiga',
        params: { temp: -0.7, humid: 0.5, cont: 0.15, erosion: 0.2, weird: 0 },
        color: 0x2F4F4F,
        textureType: 'snow',
        vegetation: { density: 0.65, types: { pine: 1.0 } },
        entities: { deer: 0.8, bunny: 0.3, bird: 0.4 }
    },

    // === COLD BIOMES (temp level 1: -0.45 to -0.15) ===
    coldForest: {
        id: 'coldForest',
        name: 'Cold Forest',
        params: { temp: -0.3, humid: 0.4, cont: 0.15, erosion: 0.1, weird: 0 },
        color: 0x355E3B,
        textureType: 'grass',
        vegetation: { density: 0.7, types: { pine: 0.8, oak: 0.2 } },
        entities: { deer: 1.0, bunny: 0.5, bird: 0.6 }
    },
    coldPlains: {
        id: 'coldPlains',
        name: 'Cold Plains',
        params: { temp: -0.3, humid: -0.2, cont: 0.1, erosion: 0.5, weird: 0 },
        color: 0x5D7052,
        textureType: 'grass',
        vegetation: { density: 0.15, types: { pine: 0.7, oak: 0.3 } },
        entities: { deer: 0.8, bunny: 0.6, bird: 0.5 }
    },

    // === TEMPERATE BIOMES (temp level 2: -0.15 to 0.2) ===
    mountains: {
        id: 'mountains',
        name: 'Mountains',
        params: { temp: 0, humid: 0, cont: 0.5, erosion: -0.85, weird: 0 },
        color: 0x696969,
        textureType: 'rock',
        vegetation: { density: 0.08, types: { pine: 1.0 } },
        entities: { deer: 0.2, bunny: 0.1, bird: 0.8 }
    },
    highlands: {
        id: 'highlands',
        name: 'Highlands',
        params: { temp: 0, humid: 0, cont: 0.4, erosion: -0.5, weird: 0 },
        color: 0x5A6E4A,
        textureType: 'grass',
        vegetation: { density: 0.2, types: { pine: 0.6, oak: 0.4 } },
        entities: { deer: 0.6, bunny: 0.4, bird: 0.7 }
    },
    forest: {
        id: 'forest',
        name: 'Forest',
        params: { temp: 0, humid: 0.6, cont: 0.15, erosion: 0.15, weird: 0 },
        color: 0x1A5C1A,
        textureType: 'grass',
        vegetation: { density: 0.85, types: { oak: 0.6, pine: 0.4 } },
        entities: { deer: 1.5, bunny: 0.8, bird: 1.2 }
    },
    plains: {
        id: 'plains',
        name: 'Plains',
        params: { temp: 0, humid: 0, cont: 0.1, erosion: 0.5, weird: 0 },
        color: 0x7CBA3D,
        textureType: 'grass',
        vegetation: { density: 0.12, types: { oak: 0.5, pine: 0.5 } },
        entities: { deer: 1.0, cow: 1.2, bunny: 1.0, bird: 0.8 }
    },
    meadow: {
        id: 'meadow',
        name: 'Meadow',
        params: { temp: 0, humid: 0.2, cont: 0.2, erosion: 0.3, weird: 0 },
        color: 0x7DB37D,
        textureType: 'grass',
        vegetation: { density: 0.08, types: { oak: 0.8, pine: 0.2 } },
        entities: { deer: 0.8, cow: 1.5, bunny: 1.2, bird: 1.0 }
    },

    // === WARM BIOMES (temp level 3: 0.2 to 0.55) ===
    grassland: {
        id: 'grassland',
        name: 'Grassland',
        params: { temp: 0.4, humid: -0.2, cont: 0.1, erosion: 0.6, weird: 0 },
        color: 0x9ACD32,
        textureType: 'grass',
        vegetation: { density: 0.1, types: { oak: 0.7, pine: 0.3 } },
        entities: { deer: 1.0, cow: 1.5, bunny: 1.0, bird: 0.8 }
    },
    savanna: {
        id: 'savanna',
        name: 'Savanna',
        params: { temp: 0.4, humid: -0.5, cont: 0.15, erosion: 0.4, weird: 0 },
        color: 0xBDB76B,
        textureType: 'dirt',
        vegetation: { density: 0.15, types: { oak: 1.0 } },
        entities: { deer: 0.6, bunny: 0.4, bird: 0.6 }
    },
    warmForest: {
        id: 'warmForest',
        name: 'Warm Forest',
        params: { temp: 0.4, humid: 0.5, cont: 0.15, erosion: 0.2, weird: 0 },
        color: 0x2E7D32,
        textureType: 'grass',
        vegetation: { density: 0.75, types: { oak: 0.9, pine: 0.1 } },
        entities: { deer: 1.2, bunny: 0.6, bird: 1.0 }
    },

    // === HOT BIOMES (temp level 4: 0.55 to 1.0) ===
    desert: {
        id: 'desert',
        name: 'Desert',
        params: { temp: 0.8, humid: -0.7, cont: 0.2, erosion: 0.5, weird: 0 },
        color: 0xC2B280,
        textureType: 'sand',
        vegetation: { density: 0.03, types: { oak: 1.0 } },
        entities: { deer: 0, bunny: 0.2, bird: 0.3 }
    },
    badlands: {
        id: 'badlands',
        name: 'Badlands',
        params: { temp: 0.8, humid: -0.6, cont: 0.3, erosion: 0.1, weird: 0 },
        color: 0xCD853F,
        textureType: 'dirt',
        vegetation: { density: 0.01, types: {} },
        entities: { deer: 0, bunny: 0.1, bird: 0.2 }
    },
    jungle: {
        id: 'jungle',
        name: 'Jungle',
        params: { temp: 0.8, humid: 0.7, cont: 0.15, erosion: 0.3, weird: 0 },
        color: 0x006400,
        textureType: 'mud',
        vegetation: { density: 0.95, types: { oak: 1.0 } },
        entities: { deer: 0.3, bunny: 0.2, bird: 2.0 }
    },

    // === COASTAL BIOMES (low continentalness) ===
    beach: {
        id: 'beach',
        name: 'Beach',
        params: { temp: 0.3, humid: 0, cont: -0.15, erosion: 0.6, weird: 0 },
        color: 0xF4D03F,
        textureType: 'sand',
        vegetation: { density: 0.0, types: {} },
        entities: { deer: 0, bunny: 0, bird: 0.5 }
    },
    stonyShore: {
        id: 'stonyShore',
        name: 'Stony Shore',
        params: { temp: 0, humid: 0, cont: -0.15, erosion: -0.3, weird: 0 },
        color: 0x808080,
        textureType: 'rock',
        vegetation: { density: 0.0, types: {} },
        entities: { deer: 0, bunny: 0, bird: 0.4 }
    }
};

// Calculate squared distance in 6D parameter space
// This is the core of Minecraft's biome selection
function calculateParameterDistance(climate, biomeParams) {
    const tempDist = Math.pow(climate.temperature - biomeParams.temp, 2);
    const humidDist = Math.pow(climate.humidity - biomeParams.humid, 2);
    const contDist = Math.pow(climate.continentalness - biomeParams.cont, 2);
    const erosionDist = Math.pow(climate.erosion - biomeParams.erosion, 2);
    const weirdDist = Math.pow((climate.weirdness || 0) - (biomeParams.weird || 0), 2);

    // Weight the parameters (continentalness and erosion are most important for terrain)
    return tempDist * 1.0 +
           humidDist * 1.0 +
           contDist * 2.0 +
           erosionDist * 2.0 +
           weirdDist * 0.5;
}

// Get the biome at a given climate point using closest-match in 6D space
function getBiomeAt(climate) {
    let bestBiome = BIOMES.plains;
    let bestDistance = Infinity;

    // Find the biome with the smallest parameter distance
    for (const biome of Object.values(BIOMES)) {
        const distance = calculateParameterDistance(climate, biome.params);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestBiome = biome;
        }
    }

    return bestBiome;
}

// Get biome by ID
function getBiomeById(id) {
    return BIOMES[id] || BIOMES.plains;
}

// Get all available biome IDs
function getAllBiomeIds() {
    return Object.keys(BIOMES);
}

// Blend two biome colors based on a factor (0-1)
function blendBiomeColors(biome1, biome2, factor) {
    const c1 = new THREE.Color(biome1.color);
    const c2 = new THREE.Color(biome2.color);
    return c1.lerp(c2, factor);
}

// Select a tree type based on biome vegetation weights
function selectTreeType(vegetationTypes) {
    if (!vegetationTypes || Object.keys(vegetationTypes).length === 0) {
        return null;
    }

    const types = Object.entries(vegetationTypes);
    const totalWeight = types.reduce((sum, [, weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (const [type, weight] of types) {
        random -= weight;
        if (random <= 0) {
            return type;
        }
    }

    return types[0][0];
}

// Check if a position should have vegetation based on biome density
function shouldPlaceVegetation(biome) {
    return Math.random() < biome.vegetation.density;
}

// Get the parameter level for a value (for debugging/display)
function getParameterLevel(paramName, value) {
    const levels = PARAM_LEVELS[paramName];
    if (!levels) return 0;

    for (let i = 0; i < levels.length - 1; i++) {
        if (value >= levels[i] && value < levels[i + 1]) {
            return i;
        }
    }
    return levels.length - 2;
}

// Make available globally
window.getBiomeAt = getBiomeAt;
window.BIOMES = BIOMES;
