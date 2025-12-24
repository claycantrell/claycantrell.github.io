// Biome registry - defines all biomes and their climate parameters
// Inspired by Minecraft's multi-parameter biome selection

const BIOMES = {
    // Hot + Dry = Desert
    desert: {
        id: 'desert',
        name: 'Desert',
        climate: {
            temp: [0.55, 1.0],      // Hot
            humid: [-1.0, -0.35]    // Dry
        },
        color: 0xC2B280,            // Sandy tan
        vegetation: {
            density: 0.03,          // Very sparse
            types: { oak: 1.0 }     // Palm-like trees (using oak model)
        },
        entities: { deer: 0, bunny: 0.2, bird: 0.3 }
    },

    // Hot + Wet = Jungle
    jungle: {
        id: 'jungle',
        name: 'Jungle',
        climate: {
            temp: [0.55, 1.0],      // Hot
            humid: [0.3, 1.0]       // Wet
        },
        color: 0x228B22,            // Forest green
        vegetation: {
            density: 0.95,          // Very dense
            types: { oak: 1.0 }     // Broad-leaf trees
        },
        entities: { deer: 0.3, bunny: 0.2, bird: 2.0 }
    },

    // Moderate temp + Dry = Savanna/Grassland
    grassland: {
        id: 'grassland',
        name: 'Grassland',
        climate: {
            temp: [-0.15, 0.55],    // Moderate
            humid: [-1.0, -0.1]     // Dry to moderate
        },
        color: 0x7CBA3D,            // Light green grass
        vegetation: {
            density: 0.15,          // Sparse trees, mostly grass
            types: { oak: 0.7, pine: 0.3 }
        },
        entities: { deer: 1.0, bunny: 1.0, bird: 0.8 }
    },

    // Moderate temp + Moderate humidity = Plains
    plains: {
        id: 'plains',
        name: 'Plains',
        climate: {
            temp: [-0.45, 0.2],     // Cool to moderate
            humid: [-0.35, 0.1]     // Moderate
        },
        color: 0x4a7c4e,            // Medium green
        vegetation: {
            density: 0.25,
            types: { oak: 0.4, pine: 0.6 }
        },
        entities: { deer: 1.2, bunny: 1.0, bird: 1.0 }
    },

    // Moderate temp + Wet = Forest
    forest: {
        id: 'forest',
        name: 'Forest',
        climate: {
            temp: [-0.15, 0.55],    // Moderate
            humid: [0.1, 1.0]       // Wet
        },
        color: 0x228B22,            // Forest green
        vegetation: {
            density: 0.85,          // Dense
            types: { oak: 0.6, pine: 0.4 }
        },
        entities: { deer: 1.5, bunny: 0.8, bird: 1.2 }
    },

    // Cold + Wet = Taiga (snowy forest)
    taiga: {
        id: 'taiga',
        name: 'Taiga',
        climate: {
            temp: [-1.0, -0.15],    // Cold
            humid: [0.0, 1.0]       // Moderate to wet
        },
        color: 0x2F4F4F,            // Dark slate gray-green
        vegetation: {
            density: 0.65,          // Moderately dense
            types: { pine: 1.0 }    // Only pine/spruce
        },
        entities: { deer: 0.8, bunny: 0.3, bird: 0.4 }
    },

    // Cold + Dry = Tundra
    tundra: {
        id: 'tundra',
        name: 'Tundra',
        climate: {
            temp: [-1.0, -0.45],    // Very cold
            humid: [-1.0, 0.0]      // Dry
        },
        color: 0x708090,            // Slate gray
        vegetation: {
            density: 0.02,          // Almost none
            types: { pine: 1.0 }    // Rare stunted pines
        },
        entities: { deer: 0.3, bunny: 0.1, bird: 0.1 }
    },

    // Coastal areas (based on continentalness, not temp/humid)
    beach: {
        id: 'beach',
        name: 'Beach',
        climate: {
            temp: [-0.5, 1.0],      // Any temperature
            humid: [-1.0, 1.0],     // Any humidity
            cont: [-1.0, -0.45]     // Low continentalness (coastal)
        },
        color: 0xF4D03F,            // Sandy yellow
        vegetation: {
            density: 0.0,           // No trees on beach
            types: {}
        },
        entities: { deer: 0, bunny: 0, bird: 0.5 }
    },

    // Mountains (based on low erosion)
    mountains: {
        id: 'mountains',
        name: 'Mountains',
        climate: {
            temp: [-1.0, 0.5],      // Cool to cold
            humid: [-1.0, 1.0],     // Any humidity
            erosion: [-1.0, -0.6]   // Low erosion = mountainous
        },
        color: 0x696969,            // Dim gray (rocky)
        vegetation: {
            density: 0.08,          // Sparse
            types: { pine: 1.0 }    // Only hardy pines
        },
        entities: { deer: 0.2, bunny: 0.1, bird: 0.8 }
    },

    // Snowy peaks (cold + low erosion)
    snowyPeaks: {
        id: 'snowyPeaks',
        name: 'Snowy Peaks',
        climate: {
            temp: [-1.0, -0.3],     // Cold
            humid: [-1.0, 1.0],     // Any
            erosion: [-1.0, -0.7]   // Very low erosion
        },
        color: 0xE8E8E8,            // Near white (snow)
        vegetation: {
            density: 0.0,           // No trees
            types: {}
        },
        entities: { deer: 0, bunny: 0, bird: 0.3 }
    }
};

// Calculate how well a climate matches a biome's target range
function calculateBiomeScore(climate, biomeClimate) {
    let score = 0;

    // Temperature match
    if (biomeClimate.temp) {
        const tempScore = calculateRangeScore(climate.temperature, biomeClimate.temp);
        score += tempScore * 2; // Temperature is weighted heavily
    }

    // Humidity match
    if (biomeClimate.humid) {
        const humidScore = calculateRangeScore(climate.humidity, biomeClimate.humid);
        score += humidScore * 2;
    }

    // Continentalness match (if specified)
    if (biomeClimate.cont) {
        const contScore = calculateRangeScore(climate.continentalness, biomeClimate.cont);
        score += contScore * 3; // Coastal is very specific
    }

    // Erosion match (if specified)
    if (biomeClimate.erosion) {
        const erosionScore = calculateRangeScore(climate.erosion, biomeClimate.erosion);
        score += erosionScore * 3; // Mountains are very specific
    }

    return score;
}

// Calculate how close a value is to a target range
// Returns 0 if in range, positive distance if outside
function calculateRangeScore(value, range) {
    const [min, max] = range;
    if (value >= min && value <= max) {
        return 0; // Perfect match
    }
    // Distance from nearest edge
    if (value < min) return min - value;
    return value - max;
}

// Get the biome at a given climate point
function getBiomeAt(climate) {
    let bestBiome = BIOMES.plains; // Default fallback
    let bestScore = Infinity;

    // Priority check for special biomes (beach, mountains)
    // These override temperature/humidity-based biomes

    // Check for beach (low continentalness)
    if (climate.continentalness < -0.45) {
        // Warm beaches only
        if (climate.temperature > -0.3) {
            return BIOMES.beach;
        }
    }

    // Check for snowy peaks first (cold + low erosion)
    if (climate.temperature < -0.3 && climate.erosion < -0.7) {
        return BIOMES.snowyPeaks;
    }

    // Check for mountains (low erosion)
    if (climate.erosion < -0.6) {
        return BIOMES.mountains;
    }

    // Standard biome selection based on temperature and humidity
    for (const [id, biome] of Object.entries(BIOMES)) {
        // Skip special biomes in general search
        if (['beach', 'mountains', 'snowyPeaks'].includes(id)) continue;

        const score = calculateBiomeScore(climate, biome.climate);
        if (score < bestScore) {
            bestScore = score;
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

    return types[0][0]; // Fallback to first type
}

// Check if a position should have vegetation based on biome density
function shouldPlaceVegetation(biome) {
    return Math.random() < biome.vegetation.density;
}
