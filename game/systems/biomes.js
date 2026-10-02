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
        params: { temp: -0.45, humid: 0, cont: 0.4, erosion: -0.45, weird: 0 },
        elevation: [330, 999], // Height band (sea level -5)
        color: 0xF2F5F8,
        colorAlt: 0xD5DEE8, // Patch color, mixed in by low-frequency noise
        textureType: 'snow',
        vegetation: { density: 0.0, types: {} },
        entities: { birds: 0.3 }
    },
    iceSpikes: {
        id: 'iceSpikes',
        name: 'Ice Spikes',
        params: { temp: -0.55, humid: -0.1, cont: 0.3, erosion: 0.2, weird: 0.65 },
        elevation: [-4, 90], // Height band (sea level -5)
        color: 0xCFE6EF,
        colorAlt: 0xA4CCDD, // Patch color, mixed in by low-frequency noise
        textureType: 'snow',
        vegetation: { density: 0.0, types: {} },
        entities: { penguins: 1.2, birds: 0.2 }
    },
    snowySlopes: {
        id: 'snowySlopes',
        name: 'Snowy Slopes',
        params: { temp: -0.4, humid: 0.1, cont: 0.3, erosion: -0.3, weird: 0 },
        elevation: [220, 480], // Height band (sea level -5)
        color: 0xE4E9EE,
        colorAlt: 0xBCC5CD, // Patch color, mixed in by low-frequency noise
        textureType: 'snow',
        vegetation: { density: 0.05, types: { pine: 1.0 } },
        entities: { bunnies: 0.4, birds: 0.4, deer: 0.2 }
    },
    tundra: {
        id: 'tundra',
        name: 'Tundra',
        params: { temp: -0.5, humid: -0.3, cont: 0.1, erosion: 0.3, weird: 0 },
        elevation: [-4, 110], // Height band (sea level -5)
        color: 0x8C9886,
        colorAlt: 0xB9BEB2, // Patch color, mixed in by low-frequency noise
        textureType: 'snow',
        vegetation: { density: 0.02, types: { pine: 1.0 } },
        entities: { deer: 0.7, bunnies: 0.7, birds: 0.3, penguins: 0.2 }
    },
    taiga: {
        id: 'taiga',
        name: 'Taiga',
        params: { temp: -0.45, humid: 0.25, cont: 0.15, erosion: 0.1, weird: 0 },
        elevation: [-4, 180], // Height band (sea level -5)
        color: 0x3D5A47,
        colorAlt: 0x66775A, // Patch color, mixed in by low-frequency noise
        textureType: 'snow',
        vegetation: { density: 0.65, types: { pine: 1.0 } },
        entities: { deer: 1.0, bunnies: 0.5, birds: 0.6 }
    },

    // === COLD BIOMES (temp level 1: -0.45 to -0.15) ===
    coldForest: {
        id: 'coldForest',
        name: 'Cold Forest',
        params: { temp: -0.2, humid: 0.25, cont: 0.15, erosion: 0.0, weird: 0 },
        elevation: [-2, 160], // Height band (sea level -5)
        color: 0x3E6543,
        colorAlt: 0x587349, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.7, types: { pine: 0.8, oak: 0.2 } },
        entities: { deer: 1.2, bunnies: 0.6, birds: 0.8, butterflies: 0.2 }
    },
    coldPlains: {
        id: 'coldPlains',
        name: 'Cold Plains',
        params: { temp: -0.2, humid: -0.25, cont: 0.1, erosion: 0.35, weird: 0 },
        elevation: [-3, 80], // Height band (sea level -5)
        color: 0x6D8158,
        colorAlt: 0x8E9469, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.15, types: { pine: 0.7, oak: 0.3 } },
        entities: { deer: 0.6, bunnies: 1.0, cows: 0.4, birds: 0.5 }
    },

    // === TEMPERATE BIOMES (temp level 2: -0.15 to 0.2) ===
    mountains: {
        id: 'mountains',
        name: 'Mountains',
        params: { temp: -0.1, humid: 0, cont: 0.5, erosion: -0.5, weird: 0 },
        elevation: [150, 400], // Height band (sea level -5)
        color: 0x77736B,
        colorAlt: 0x5B5852, // Patch color, mixed in by low-frequency noise
        textureType: 'rock',
        vegetation: { density: 0.08, types: { pine: 1.0 } },
        entities: { birds: 1.0, deer: 0.3 }
    },
    highlands: {
        id: 'highlands',
        name: 'Highlands',
        params: { temp: 0, humid: 0, cont: 0.4, erosion: -0.25, weird: 0 },
        elevation: [45, 220], // Height band (sea level -5)
        color: 0x667C4B,
        colorAlt: 0x8A8758, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.2, types: { pine: 0.6, oak: 0.4 } },
        entities: { deer: 0.6, cows: 0.6, bunnies: 0.5, birds: 0.7, butterflies: 0.3 }
    },
    forest: {
        id: 'forest',
        name: 'Forest',
        params: { temp: 0.05, humid: 0.35, cont: 0.15, erosion: 0.05, weird: 0 },
        elevation: [-2, 140], // Height band (sea level -5)
        color: 0x2E6A2A,
        colorAlt: 0x4A7530, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.85, types: { oak: 0.6, pine: 0.4 } },
        entities: { deer: 1.4, bunnies: 0.7, birds: 1.2, butterflies: 0.4, frogs: 0.2 }
    },
    plains: {
        id: 'plains',
        name: 'Plains',
        params: { temp: 0.05, humid: -0.1, cont: 0.1, erosion: 0.4, weird: 0 },
        elevation: [-3, 60], // Height band (sea level -5)
        color: 0x7EA745,
        colorAlt: 0xA6AF58, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.12, types: { oak: 0.5, pine: 0.5 } },
        entities: { cows: 1.5, bunnies: 1.0, deer: 0.5, birds: 0.7, butterflies: 0.5 }
    },
    meadow: {
        id: 'meadow',
        name: 'Meadow',
        params: { temp: 0.05, humid: 0.15, cont: 0.2, erosion: 0.2, weird: 0 },
        elevation: [15, 180], // Height band (sea level -5)
        color: 0x78B25C,
        colorAlt: 0xA2C46C, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.08, types: { oak: 0.8, pine: 0.2 } },
        entities: { butterflies: 1.5, bunnies: 1.2, cows: 0.8, deer: 0.4, birds: 0.8 }
    },
    cherryGrove: {
        id: 'cherryGrove',
        name: 'Cherry Grove',
        params: { temp: 0.1, humid: 0.3, cont: 0.25, erosion: 0.0, weird: 0.6 },
        elevation: [25, 180], // Height band (sea level -5)
        color: 0x86B06A,
        colorAlt: 0xE6B3C6, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.75, types: { oak: 0.1, pine: 0 } },
        entities: { butterflies: 2.0, birds: 1.2, bunnies: 0.6 }
    },
    mushroomFields: {
        id: 'mushroomFields',
        name: 'Mushroom Fields',
        params: { temp: 0.05, humid: 0.4, cont: 0.4, erosion: 0.3, weird: -0.7 },
        elevation: [-4, 25], // Height band (sea level -5)
        color: 0x8B7D8E,
        colorAlt: 0x6C5B77, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.4, types: {} },
        entities: { cows: 0.6, frogs: 0.3 }
    },

    // === WARM BIOMES (temp level 3: 0.2 to 0.55) ===
    grassland: {
        id: 'grassland',
        name: 'Grassland',
        params: { temp: 0.3, humid: -0.15, cont: 0.1, erosion: 0.35, weird: 0 },
        elevation: [-3, 70], // Height band (sea level -5)
        color: 0x97AF49,
        colorAlt: 0xBDB663, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.1, types: { oak: 0.7, pine: 0.3 } },
        entities: { cows: 1.2, bunnies: 0.8, deer: 0.4, birds: 0.6, butterflies: 0.6 }
    },
    savanna: {
        id: 'savanna',
        name: 'Savanna',
        params: { temp: 0.4, humid: -0.35, cont: 0.15, erosion: 0.25, weird: 0 },
        elevation: [-3, 110], // Height band (sea level -5)
        color: 0xB7A659,
        colorAlt: 0x9C8B47, // Patch color, mixed in by low-frequency noise
        textureType: 'dirt',
        vegetation: { density: 0.15, types: { oak: 1.0 } },
        entities: { deer: 0.5, birds: 0.6, cows: 0.3 }
    },
    warmForest: {
        id: 'warmForest',
        name: 'Warm Forest',
        params: { temp: 0.3, humid: 0.3, cont: 0.15, erosion: 0.05, weird: 0 },
        elevation: [-2, 120], // Height band (sea level -5)
        color: 0x3C792D,
        colorAlt: 0x5A8935, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.75, types: { oak: 0.9, pine: 0.1 } },
        entities: { deer: 1.0, birds: 1.2, butterflies: 0.6, frogs: 0.3 }
    },

    // === HOT BIOMES (temp level 4: 0.55 to 1.0) ===
    desert: {
        id: 'desert',
        name: 'Desert',
        params: { temp: 0.5, humid: -0.5, cont: 0.2, erosion: 0.3, weird: 0 },
        elevation: [-3, 110], // Height band (sea level -5)
        color: 0xD8C28E,
        colorAlt: 0xC6A26B, // Patch color, mixed in by low-frequency noise
        textureType: 'sand',
        vegetation: { density: 0.03, types: { oak: 1.0 } },
        entities: { bunnies: 0.2, birds: 0.2, salamanders: 0.3 }
    },
    badlands: {
        id: 'badlands',
        name: 'Badlands',
        params: { temp: 0.45, humid: -0.4, cont: 0.3, erosion: -0.3, weird: 0 },
        elevation: [15, 220], // Height band (sea level -5)
        color: 0xB4643A,
        colorAlt: 0xD38E5C, // Patch color, mixed in by low-frequency noise
        textureType: 'dirt',
        vegetation: { density: 0.01, types: {} },
        entities: { salamanders: 0.4, birds: 0.3 }
    },
    jungle: {
        id: 'jungle',
        name: 'Jungle',
        params: { temp: 0.5, humid: 0.45, cont: 0.15, erosion: 0.05, weird: 0 },
        elevation: [-3, 140], // Height band (sea level -5)
        color: 0x1E6A24,
        colorAlt: 0x307C1D, // Patch color, mixed in by low-frequency noise
        textureType: 'mud',
        vegetation: { density: 0.95, types: { oak: 1.0 } },
        entities: { birds: 2.0, frogs: 1.0, butterflies: 1.0, pandas: 0.2 }
    },
    bambooJungle: {
        id: 'bambooJungle',
        name: 'Bamboo Jungle',
        params: { temp: 0.45, humid: 0.45, cont: 0.15, erosion: 0.1, weird: 0.6 },
        elevation: [-2, 120], // Height band (sea level -5)
        color: 0x3D892D,
        colorAlt: 0x5E9A3A, // Patch color, mixed in by low-frequency noise
        textureType: 'grass',
        vegetation: { density: 0.85, types: { oak: 0.2 } },
        entities: { pandas: 1.5, birds: 1.0, butterflies: 0.4 }
    },
    swamp: {
        id: 'swamp',
        name: 'Swamp',
        params: { temp: 0.2, humid: 0.45, cont: -0.05, erosion: 0.45, weird: 0 },
        elevation: [-6, 6], // Height band (sea level -5)
        color: 0x4A5A2C,
        colorAlt: 0x37472E, // Patch color, mixed in by low-frequency noise
        textureType: 'mud',
        vegetation: { density: 0.6, types: { oak: 0.7 } },
        entities: { frogs: 2.5, birds: 0.8, salamanders: 0.5 }
    },
    mangroveSwamp: {
        id: 'mangroveSwamp',
        name: 'Mangrove Swamp',
        params: { temp: 0.5, humid: 0.45, cont: -0.2, erosion: 0.4, weird: 0 },
        elevation: [-7, 3], // Height band (sea level -5)
        color: 0x3F4A26,
        colorAlt: 0x5B5A3A, // Patch color, mixed in by low-frequency noise
        textureType: 'mud',
        vegetation: { density: 0.7, types: { oak: 0.1 } },
        entities: { crabs: 1.5, frogs: 1.0, birds: 1.0 }
    },
    volcanicPeaks: {
        id: 'volcanicPeaks',
        name: 'Volcanic Peaks',
        params: { temp: 0.4, humid: -0.3, cont: 0.6, erosion: -0.5, weird: 0.65 },
        elevation: [150, 999], // Height band (sea level -5)
        color: 0x3A3133,
        colorAlt: 0x7A2C1B, // Patch color, mixed in by low-frequency noise
        textureType: 'rock',
        vegetation: { density: 0.05, types: {} },
        entities: { salamanders: 1.2, birds: 0.2 }
    },

    // === COASTAL BIOMES (low continentalness) ===
    beach: {
        id: 'beach',
        name: 'Beach',
        params: { temp: 0.15, humid: 0, cont: -0.15, erosion: 0.3, weird: 0 },
        elevation: [-7, 0], // Height band (sea level -5)
        color: 0xE2D2A0,
        colorAlt: 0xCDB884, // Patch color, mixed in by low-frequency noise
        textureType: 'sand',
        vegetation: { density: 0.0, types: {} },
        entities: { crabs: 2.0, birds: 0.8 }
    },
    stonyShore: {
        id: 'stonyShore',
        name: 'Stony Shore',
        params: { temp: -0.35, humid: 0, cont: -0.15, erosion: -0.2, weird: 0 },
        elevation: [-7, 4], // Height band (sea level -5)
        color: 0x7C7C77,
        colorAlt: 0x9A968C, // Patch color, mixed in by low-frequency noise
        textureType: 'rock',
        vegetation: { density: 0.0, types: {} },
        entities: { crabs: 0.8, birds: 0.6, penguins: 0.3 }
    }
};

// Temperature falls with altitude (~ a real lapse rate): high ground is colder
function getEffectiveTemperature(climate, height) {
    return climate.temperature - Math.max(0, height - 30) * 0.003;
}

// Squared distance in climate space plus a penalty for being outside the
// biome's elevation band. Height comes first in a real landscape: beaches and
// mangroves at the waterline, swamps in flat wet lowlands, forests and plains
// below the hills, highlands and alpine meadows above, then rock and snow.
function calculateParameterDistance(climate, biomeParams, height, elevation) {
    const temp = height === undefined ? climate.temperature : getEffectiveTemperature(climate, height);
    const tempDist = Math.pow(temp - biomeParams.temp, 2);
    const humidDist = Math.pow(climate.humidity - biomeParams.humid, 2);
    const contDist = Math.pow(climate.continentalness - biomeParams.cont, 2);
    const erosionDist = Math.pow(climate.erosion - biomeParams.erosion, 2);
    const weirdDist = Math.pow((climate.weirdness || 0) - (biomeParams.weird || 0), 2);

    let elevationDist = 0;
    if (height !== undefined && elevation) {
        if (height < elevation[0]) elevationDist = Math.pow((elevation[0] - height) / 20, 2);
        else if (height > elevation[1]) elevationDist = Math.pow((height - elevation[1]) / 20, 2);
    }

    return tempDist * 1.5 +
           humidDist * 1.2 +
           contDist * 0.4 +
           erosionDist * 0.6 +
           weirdDist * 0.5 +
           elevationDist * 3.0;
}

// Get the biome at a given climate point using closest-match in 6D space
function getBiomeAt(climate, height) {
    let bestBiome = BIOMES.plains;
    let bestDistance = Infinity;

    // Find the biome with the smallest parameter distance
    for (const biome of Object.values(BIOMES)) {
        const distance = calculateParameterDistance(climate, biome.params, height, biome.elevation);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestBiome = biome;
        }
    }

    return bestBiome;
}

// Get the two closest biomes and how much of the second to blend in.
// weight is 0 deep inside a biome and 0.5 exactly on the border.
const BIOME_BLEND_WIDTH = 0.25;
function getBiomeBlendAt(climate, height) {
    let best = BIOMES.plains, second = BIOMES.plains;
    let bestDist = Infinity, secondDist = Infinity;

    for (const biome of Object.values(BIOMES)) {
        const distance = calculateParameterDistance(climate, biome.params, height, biome.elevation);
        if (distance < bestDist) {
            second = best; secondDist = bestDist;
            best = biome; bestDist = distance;
        } else if (distance < secondDist) {
            second = biome; secondDist = distance;
        }
    }

    const t = (secondDist - bestDist) / (secondDist + bestDist + 1e-6);
    const x = Math.min(1, t / BIOME_BLEND_WIDTH);
    const weight = 0.5 * (1 - x * x * (3 - 2 * x));
    return { biome: best, blendBiome: second, blendWeight: weight };
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
window.getBiomeBlendAt = getBiomeBlendAt;
window.getEffectiveTemperature = getEffectiveTemperature;
window.BIOMES = BIOMES;
