// Climate system - Minecraft-style multi-noise climate parameters
// Uses 5 noise functions to determine biome placement

// Climate noise generators (initialized with map seed)
const climateNoises = {
    temperature: null,
    humidity: null,
    continentalness: null,
    erosion: null,
    weirdness: null
};

// Climate configuration (can be overridden by map config)
// Smaller scales = larger biome regions
let climateConfig = {
    temperatureScale: 0.0004,
    humidityScale: 0.0005,
    continentalnessScale: 0.0003,
    erosionScale: 0.0006,
    weirdnessScale: 0.001,
    // Offsets allow maps to shift the climate (e.g., +0.3 makes it warmer)
    temperatureOffset: 0,
    humidityOffset: 0
};

// Initialize climate noise generators with map seed
function initClimateNoises(seed) {
    // Each parameter gets a unique seed derived from the base seed
    climateNoises.temperature = new SimplexNoise(seed + '_temperature');
    climateNoises.humidity = new SimplexNoise(seed + '_humidity');
    climateNoises.continentalness = new SimplexNoise(seed + '_continentalness');
    climateNoises.erosion = new SimplexNoise(seed + '_erosion');
    climateNoises.weirdness = new SimplexNoise(seed + '_weirdness');

    console.log(`Climate system initialized with seed: ${seed}`);
}

// Apply climate config from map (optional overrides)
function applyClimateConfig(config) {
    if (!config) return;

    if (config.temperatureScale) climateConfig.temperatureScale = config.temperatureScale;
    if (config.humidityScale) climateConfig.humidityScale = config.humidityScale;
    if (config.continentalnessScale) climateConfig.continentalnessScale = config.continentalnessScale;
    if (config.erosionScale) climateConfig.erosionScale = config.erosionScale;
    if (config.weirdnessScale) climateConfig.weirdnessScale = config.weirdnessScale;
    if (config.temperatureOffset !== undefined) climateConfig.temperatureOffset = config.temperatureOffset;
    if (config.humidityOffset !== undefined) climateConfig.humidityOffset = config.humidityOffset;
}

// Sample noise with octaves for smoother, more natural patterns
function sampleOctaveNoise(noiseFunc, x, z, scale, octaves) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        total += noiseFunc.noise2D(x * scale * frequency, z * scale * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= 0.5; // Persistence
        frequency *= 2.0; // Lacunarity
    }

    return total / maxValue; // Normalize to -1 to 1
}

// Get all climate parameters at a world position
function getClimateAt(x, z) {
    if (!climateNoises.temperature) {
        console.warn('Climate system not initialized');
        return {
            temperature: 0,
            humidity: 0,
            continentalness: 0,
            erosion: 0,
            weirdness: 0
        };
    }

    // Sample each climate parameter with different scales
    // Larger scales = larger biome regions
    const temperature = sampleOctaveNoise(
        climateNoises.temperature, x, z,
        climateConfig.temperatureScale, 2
    ) + climateConfig.temperatureOffset;

    const humidity = sampleOctaveNoise(
        climateNoises.humidity, x, z,
        climateConfig.humidityScale, 2
    ) + climateConfig.humidityOffset;

    // Continentalness uses more octaves for complex coastlines
    const continentalness = sampleOctaveNoise(
        climateNoises.continentalness, x, z,
        climateConfig.continentalnessScale, 3
    );

    // Erosion determines flat vs mountainous
    const erosion = sampleOctaveNoise(
        climateNoises.erosion, x, z,
        climateConfig.erosionScale, 2
    );

    // Weirdness for unusual biome variants (single octave for sharp transitions)
    const weirdness = sampleOctaveNoise(
        climateNoises.weirdness, x, z,
        climateConfig.weirdnessScale, 1
    );

    return {
        temperature: clampValue(temperature, -1, 1),
        humidity: clampValue(humidity, -1, 1),
        continentalness: clampValue(continentalness, -1, 1),
        erosion: clampValue(erosion, -1, 1),
        weirdness: clampValue(weirdness, -1, 1)
    };
}

// Clamp value to range
function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Calculate height modifier based on erosion and continentalness
// This shapes the terrain independently of biome surface features
function getHeightModifier(climate) {
    // Erosion: high = flat plains, low = dramatic mountains
    // Convert from [-1, 1] to height multiplier using smooth spline-like curve
    // Low erosion (-1) = 5x height (mountains), High erosion (1) = 0.2x height (plains)
    // Use smoothstep for gradual transitions (no sudden bumps)
    const erosionNorm = (climate.erosion + 1) / 2; // 0 to 1

    // Significantly boost mountain height (low erosion)
    let erosionFactor;
    if (erosionNorm < 0.2) {
        // Very low erosion = mountain peaks - dramatic height boost
        erosionFactor = 3.0 + (0.2 - erosionNorm) * 10; // 3 to 5x height
    } else if (erosionNorm < 0.4) {
        // Low erosion = highlands - good elevation
        const t = (erosionNorm - 0.2) / 0.2;
        erosionFactor = 1.5 + (1 - t) * 1.5; // 1.5 to 3x
    } else {
        // Normal to high erosion - flat to moderate
        erosionFactor = 0.2 + (1 - erosionNorm) * (1 - erosionNorm) * 1.3; // 0.2 to 1.5x
    }

    // Continentalness: low = ocean/coast (flatten), high = inland (amplify)
    // Use smooth interpolation to avoid bumpy transitions
    let continentFactor = 1.0;
    const cont = climate.continentalness;

    if (cont < -0.5) {
        // Deep ocean/beach - very flat
        continentFactor = 0.1;
    } else if (cont < -0.2) {
        // Coast - smooth transition from flat
        const t = (cont + 0.5) / 0.3; // 0 to 1
        continentFactor = 0.1 + t * t * 0.3; // Smooth rise
    } else if (cont < 0.3) {
        // Near coast/lowlands - moderate
        const t = (cont + 0.2) / 0.5;
        continentFactor = 0.4 + t * 0.5;
    } else if (cont < 0.6) {
        // Inland - normal
        continentFactor = 0.9 + (cont - 0.3) * 0.5;
    } else {
        // Deep inland highlands - amplified for dramatic mountains
        const t = (cont - 0.6) / 0.4;
        continentFactor = 1.1 + t * t * 1.0; // Quadratic rise
    }

    return erosionFactor * continentFactor;
}

// Get base height offset based on continentalness
// Creates ocean basins and elevated inland plateaus
// Uses smooth interpolation for natural terrain flow
function getBaseHeightOffset(climate) {
    const cont = climate.continentalness;
    const erosion = climate.erosion;

    // Base offset from continentalness
    let offset = 0;

    if (cont < -0.5) {
        // Ocean basin - well below sea level
        offset = -15;
    } else if (cont < -0.2) {
        // Coast/beach - smooth transition from ocean
        const t = (cont + 0.5) / 0.3;
        offset = -15 + t * 12; // -15 to -3
    } else if (cont < 0.3) {
        // Lowlands - near sea level
        const t = (cont + 0.2) / 0.5;
        offset = -3 + t * 8; // -3 to 5
    } else if (cont < 0.6) {
        // Midlands
        const t = (cont - 0.3) / 0.3;
        offset = 5 + t * 15; // 5 to 20
    } else {
        // Highlands - dramatic elevation
        const t = (cont - 0.6) / 0.4;
        offset = 20 + t * t * 40; // 20 to 60 (quadratic for dramatic peaks)
    }

    // Erosion modifies base height (low erosion = peaks preserved, high = worn down)
    // Mountains should be dramatically higher than surrounding terrain
    if (erosion < -0.6) {
        // Mountain biome (very low erosion) - dramatic height boost
        const peakIntensity = (-0.6 - erosion) / 0.4; // 0 to 1
        const peakBonus = 80 + peakIntensity * peakIntensity * 120; // 80 to 200 extra
        offset += peakBonus;
    } else if (erosion < -0.3) {
        // Highland areas - moderate height boost
        const t = (-0.3 - erosion) / 0.3; // 0 to 1
        const highlandBonus = t * t * 80; // Up to 80 extra
        offset += highlandBonus;
    } else if (erosion < 0 && cont > 0.2) {
        // Slightly elevated inland areas
        const t = -erosion / 0.3; // 0 to 1
        offset += t * 20; // Up to 20 extra
    }

    return offset;
}

// Make available globally
window.initClimate = initClimate;
window.getClimateAt = getClimateAt;
