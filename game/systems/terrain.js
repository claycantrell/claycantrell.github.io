// Terrain generation system - heightmap, biomes, and ground mesh creation
// Now integrates with climate.js and biomes.js for Minecraft-style generation
// Supports chunk-based rendering for large worlds

// Terrain state - initialized from config
let simplex = null;
let terrainSize = 6000; // Large world - actual rendering handled by chunks
let terrainSegments = 180; // Only used for non-chunked mode
let terrainHeightmap = null;
let terrainData = null; // Only used for non-chunked mode
let terrainConfig = null;
let useChunks = true; // Enable chunk-based terrain by default

// Initialize terrain from map config
function initTerrainConfig() {
    const config = typeof getTerrainConfig === 'function' ? getTerrainConfig() : {};
    terrainConfig = {
        size: config.size || 20000,          // Huge world (chunks handle rendering)
        segments: config.segments || 180,    // Only for non-chunked mode
        seed: config.seed || 'skyrim',
        useChunks: config.useChunks !== false, // Default to chunked mode
        chunks: {
            size: config.chunks?.size || 512,
            segments: config.chunks?.segments || 48,
            renderDistance: config.chunks?.renderDistance || 6,
            unloadDistance: config.chunks?.unloadDistance || 8
        },
        noise: {
            scale: config.noise?.scale || 0.008,
            octaves: config.noise?.octaves || 3,
            persistence: config.noise?.persistence || 0.5,
            lacunarity: config.noise?.lacunarity || 2.0
        },
        elevation: {
            hillHeight: config.elevation?.hillHeight || 25,
            plateauRadius: config.elevation?.plateauRadius || 60,
            mountainStartRadius: config.elevation?.mountainStartRadius || 400,
            mountainHeight: config.elevation?.mountainHeight || 200
        },
        climate: config.climate || {},
        color: config.color // Now optional - vertex colors will be used instead
    };

    useChunks = terrainConfig.useChunks;
    terrainSize = terrainConfig.size;
    terrainSegments = terrainConfig.segments;
    simplex = new SimplexNoise(terrainConfig.seed);

    // Initialize climate system with the same seed
    if (typeof initClimateNoises === 'function') {
        initClimateNoises(terrainConfig.seed);
    }

    // Apply any climate config overrides
    if (typeof applyClimateConfig === 'function' && terrainConfig.climate) {
        applyClimateConfig(terrainConfig.climate);
    }

    // Initialize water system
    if (typeof initWaterSystem === 'function') {
        initWaterSystem(terrainConfig.seed);
    }

    // Initialize cave system
    if (typeof initCaveSystem === 'function') {
        initCaveSystem(terrainConfig.seed);
    }

    return terrainConfig;
}

// Smoothstep function for blending
function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
}

// ============================================================================
// BIOME-SPECIFIC TERRAIN FEATURES
// Each biome gets unique topological characteristics
// ============================================================================

// Desert: Rolling dunes oriented NE-SW (simulating wind-formed barchan dunes)
function applyDunes(baseHeight, x, z) {
    // Primary dune waves - large rolling dunes oriented at 45 degrees
    const angle = Math.PI / 4; // 45 degrees (NE-SW orientation)
    const rotatedX = x * Math.cos(angle) + z * Math.sin(angle);
    const rotatedZ = -x * Math.sin(angle) + z * Math.cos(angle);

    // Main dune ridges (large wavelength)
    const duneScale = 0.015;
    const mainDune = Math.sin(rotatedX * duneScale) * 12;

    // Secondary smaller dunes perpendicular
    const secondaryScale = 0.04;
    const secondaryDune = Math.sin(rotatedZ * secondaryScale) * 4;

    // Small ripples on dune surfaces
    const rippleScale = 0.12;
    const ripples = simplex.noise2D(x * rippleScale, z * rippleScale) * 1.5;

    // Combine: main dunes + cross-dunes + ripples
    const duneHeight = mainDune + secondaryDune * 0.5 + ripples;

    // Dunes should only add height, not subtract (sand piles up)
    return baseHeight + Math.max(0, duneHeight + 6);
}

// Mountains: Cliffs, crags, and rocky outcrops
function applyCliffs(baseHeight, x, z, climate) {
    // High-frequency noise for rocky crags
    const cragScale = 0.02;
    const cragNoise = simplex.noise2D(x * cragScale + 500, z * cragScale + 500);

    // Create sharp ridges using absolute value (ridged noise)
    const ridgeScale = 0.004;
    const ridgeNoise = Math.abs(simplex.noise2D(x * ridgeScale, z * ridgeScale));

    // Cliff bands - horizontal ledges at certain elevations
    const bandFrequency = 0.02;
    const bandNoise = simplex.noise2D(x * bandFrequency, z * bandFrequency);
    const cliffBand = Math.sin(baseHeight * 0.15 + bandNoise * 2) * 0.5 + 0.5;

    // Sharpen terrain based on erosion (lower erosion = sharper features)
    const erosionFactor = climate ? (1 - climate.erosion) * 0.5 + 0.5 : 1;

    // Combine: rocky crags + ridges + cliff ledges
    const cliffHeight = (cragNoise * 8 + ridgeNoise * 15 + cliffBand * 5) * erosionFactor;

    // Add vertical cliff faces using step function
    const stepHeight = Math.floor(baseHeight / 25) * 25;
    const stepBlend = smoothstep(0, 5, Math.abs(baseHeight - stepHeight));

    return baseHeight + cliffHeight + (1 - stepBlend) * 8;
}

// Badlands: Mesas, canyons, and striated layers
function applyMesas(baseHeight, x, z) {
    // Canyon carving - deep valleys
    const canyonScale = 0.006;
    const canyonNoise = Math.abs(simplex.noise2D(x * canyonScale + 200, z * canyonScale + 200));
    const canyon = canyonNoise < 0.15 ? -14 * (1 - canyonNoise / 0.15) : 0;

    // Mesa plateaus - quantized heights for flat-topped mesas
    const mesaHeight = baseHeight + canyon;
    const layerHeight = 20;
    const quantizedHeight = Math.floor(mesaHeight / layerHeight) * layerHeight;

    // Soft transition at layer edges
    const layerBlend = smoothstep(0, 3, Math.abs(mesaHeight - quantizedHeight));
    const finalHeight = quantizedHeight + layerBlend * (mesaHeight - quantizedHeight);

    // Add subtle striations (horizontal lines)
    const striationScale = 0.3;
    const striation = Math.sin(finalHeight * striationScale) * 0.5;

    return finalHeight + striation;
}

// Tundra: Flat permafrost with thermokarst pools and polygonal ground
function applyPermafrost(baseHeight, x, z) {
    const flattenedHeight = baseHeight;

    // Polygonal ground pattern (characteristic of permafrost)
    const polyScale = 0.008;
    const polyNoise = simplex.noise2D(x * polyScale, z * polyScale);
    const polygon = Math.abs(polyNoise) * 3;

    // Thermokarst depressions (lakes form in thawed permafrost)
    const poolScale = 0.008;
    const poolNoise = simplex.noise2D(x * poolScale + 100, z * poolScale + 100);
    const pool = poolNoise < -0.3 ? (poolNoise + 0.3) * 15 : 0; // Depressions below threshold

    // Low mounds (pingos)
    const pingoScale = 0.004;
    const pingoNoise = simplex.noise2D(x * pingoScale + 300, z * pingoScale + 300);
    const pingo = pingoNoise > 0.6 ? (pingoNoise - 0.6) * 25 : 0;

    return flattenedHeight + polygon + pool + pingo;
}

// Taiga: Boggy lowlands with wetland pools and hummocks
function applyBoggyTerrain(baseHeight, x, z) {
    const softenedHeight = baseHeight;

    // Many small depressions for wetland pools
    const poolScale = 0.01;
    const poolNoise = simplex.noise2D(x * poolScale, z * poolScale);
    const pool = poolNoise < -0.2 ? (poolNoise + 0.2) * 8 : 0;

    // Hummocks - raised mossy mounds between pools
    const hummockScale = 0.06;
    const hummockNoise = simplex.noise2D(x * hummockScale + 50, z * hummockScale + 50);
    const hummock = hummockNoise > 0.3 ? (hummockNoise - 0.3) * 6 : 0;

    // Gentle undulating base
    const undulateScale = 0.01;
    const undulation = simplex.noise2D(x * undulateScale, z * undulateScale) * 4;

    return softenedHeight + pool + hummock + undulation;
}

// Jungle: Steep ravines and terraced hillsides
function applyRavines(baseHeight, x, z) {
    const amplifiedHeight = baseHeight;

    // Deep ravine carving using inverted ridge noise
    const ravineScale = 0.007;
    const ravineNoise = Math.abs(simplex.noise2D(x * ravineScale, z * ravineScale));
    const ravine = ravineNoise < 0.12 ? -12 * (1 - ravineNoise / 0.12) : 0;

    // Terraced hillsides (like rice paddies or erosion patterns)
    const terraceHeight = 15;
    const terraceNoise = simplex.noise2D(x * 0.01, z * 0.01) * 5;
    const rawTerrace = amplifiedHeight + ravine + terraceNoise;
    const terraced = Math.floor(rawTerrace / terraceHeight) * terraceHeight;
    const terraceBlend = smoothstep(0, 4, Math.abs(rawTerrace - terraced));

    // Steep valley walls
    const valleyScale = 0.005;
    const valleyNoise = simplex.noise2D(x * valleyScale + 400, z * valleyScale + 400);
    const valley = valleyNoise < -0.4 ? (valleyNoise + 0.4) * 30 : 0;

    return terraced + terraceBlend * (rawTerrace - terraced) + valley;
}

// Snowy Peaks: Craggy alpine with cirques and sharp ridges
function applyCraggyAlpine(baseHeight, x, z) {
    // Sharp, jagged peaks using ridged noise
    const jaggedScale = 0.008;
    const jaggedNoise = 1 - Math.abs(simplex.noise2D(x * jaggedScale, z * jaggedScale));
    const jagged = jaggedNoise * jaggedNoise * 20; // Square for sharper peaks

    // Cirque-like bowl features (glacial erosion)
    const cirqueScale = 0.005;
    const cirqueNoise = simplex.noise2D(x * cirqueScale + 600, z * cirqueScale + 600);
    const cirque = cirqueNoise > 0.5 ? -(cirqueNoise - 0.5) * 40 : 0;

    // Asymmetric slopes - steep on one side, gradual on other
    const asymScale = 0.003;
    const asymNoise = simplex.noise2D(x * asymScale, z * asymScale);
    const asymmetry = asymNoise * 15;

    // Rocky outcrops
    const outcroppScale = 0.08;
    const outcrop = simplex.noise2D(x * outcroppScale + 700, z * outcroppScale + 700) * 5;

    return baseHeight + jagged + cirque + asymmetry + outcrop;
}

// Forest: Gentle rolling hills with occasional small ravines
function applyRollingHills(baseHeight, x, z) {
    // Gentle, rounded hill shapes
    const hillScale = 0.003;
    const hillNoise = simplex.noise2D(x * hillScale, z * hillScale);
    const hills = hillNoise * hillNoise * Math.sign(hillNoise) * 10; // Softer peaks

    // Occasional small ravines (streams)
    const ravineScale = 0.005;
    const ravineNoise = Math.abs(simplex.noise2D(x * ravineScale + 800, z * ravineScale + 800));
    const smallRavine = ravineNoise < 0.08 ? -8 * (1 - ravineNoise / 0.08) : 0;

    return baseHeight + hills + smallRavine;
}

// Plains/Grassland/Meadow: Very gentle undulations
function applyGentleUndulations(baseHeight, x, z) {
    // Very low amplitude, wide rolling features
    const undulateScale = 0.004;
    const undulation = simplex.noise2D(x * undulateScale, z * undulateScale) * 5;

    // Occasional small hillocks
    const hillockScale = 0.005;
    const hillockNoise = simplex.noise2D(x * hillockScale + 900, z * hillockScale + 900);
    const hillock = hillockNoise > 0.6 ? (hillockNoise - 0.6) * 12 : 0;

    return baseHeight + undulation * 0.6 + hillock;
}

// Beach: Nearly flat with gentle slope and minor ripples
function applyBeachTerrain(baseHeight, x, z) {
    // Flatten toward a gentle strand just above the water
    const strand = -3.5;
    const flatHeight = strand + (baseHeight - strand) * 0.5;

    // Minor sand ripples near water
    const rippleScale = 0.1;
    const ripples = simplex.noise2D(x * rippleScale, z * rippleScale) * 0.3;

    return flatHeight + ripples;
}

// Savanna: Mostly flat with occasional kopjes (isolated rock outcrops)
function applyKopjes(baseHeight, x, z) {
    const flatHeight = baseHeight;

    // Gentle rolling savanna
    const rollScale = 0.006;
    const roll = simplex.noise2D(x * rollScale, z * rollScale) * 2;

    // Kopjes - isolated granite outcrops
    const kopjeScale = 0.003;
    const kopjeNoise = simplex.noise2D(x * kopjeScale + 1000, z * kopjeScale + 1000);
    // Very sparse but tall when they occur
    const kopje = kopjeNoise > 0.7 ? Math.pow(kopjeNoise - 0.7, 2) * 500 : 0;

    return flatHeight + roll + kopje;
}

// Highlands: Elevated rolling terrain with rocky areas
function applyHighlands(baseHeight, x, z) {
    // Moderate rolling terrain
    const rollScale = 0.004;
    const roll = simplex.noise2D(x * rollScale, z * rollScale) * 8;

    // Rocky patches
    const rockyScale = 0.04;
    const rockyNoise = simplex.noise2D(x * rockyScale + 1100, z * rockyScale + 1100);
    const rocky = rockyNoise > 0.4 ? (rockyNoise - 0.4) * 10 : 0;

    return baseHeight + roll + rocky;
}

// Master function to apply biome-specific terrain features
function applyBiomeFeatures(baseHeight, x, z, biome, climate) {
    if (!biome) return baseHeight;

    switch (biome.id) {
        // Hot/dry biomes
        case 'desert':
            return applyDunes(baseHeight, x, z);
        case 'badlands':
            return applyMesas(baseHeight, x, z);
        case 'savanna':
            return applyKopjes(baseHeight, x, z);

        // Mountain biomes
        case 'mountains':
            return applyCliffs(baseHeight, x, z, climate);
        case 'snowyPeaks':
            return applyCraggyAlpine(baseHeight, x, z);
        case 'snowySlopes':
            return applyCliffs(baseHeight, x, z, climate);
        case 'highlands':
            return applyHighlands(baseHeight, x, z);

        // Cold/wet biomes
        case 'tundra':
            return applyPermafrost(baseHeight, x, z);
        case 'taiga':
            return applyBoggyTerrain(baseHeight, x, z);

        // Tropical biomes
        case 'jungle':
            return applyRavines(baseHeight, x, z);

        // Forest biomes
        case 'forest':
        case 'coldForest':
        case 'warmForest':
            return applyRollingHills(baseHeight, x, z);

        // Flat biomes
        case 'plains':
        case 'grassland':
        case 'meadow':
        case 'coldPlains':
            return applyGentleUndulations(baseHeight, x, z);

        // Coastal biomes
        case 'beach':
            return applyBeachTerrain(baseHeight, x, z);
        case 'stonyShore':
            return baseHeight + (applyCliffs(baseHeight, x, z, climate) - baseHeight) * 0.35; // Smaller cliffs

        default:
            return baseHeight;
    }
}

// Get terrain height at world coordinates (with bilinear interpolation)
function getTerrainHeightAt(x, z) {
    // Use chunk system if enabled
    if (useChunks && typeof getChunkTerrainHeightAt === 'function') {
        return getChunkTerrainHeightAt(x, z);
    }

    // Fallback to single-mesh heightmap
    // Convert world coordinates to heightmap grid coordinates
    const gridX = (x + terrainSize/2) / (terrainSize / terrainSegments);
    const gridZ = (z + terrainSize/2) / (terrainSize / terrainSegments);

    // Get integer and fractional parts for bilinear interpolation
    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(terrainSegments, x0 + 1);
    const z1 = Math.min(terrainSegments, z0 + 1);

    // Fraction of the way across the grid cell (0.0 to 1.0)
    const dx = Math.max(0, Math.min(1, gridX - x0));
    const dz = Math.max(0, Math.min(1, gridZ - z0));

    // Clamp to valid grid bounds
    const clampedX0 = Math.max(0, Math.min(terrainSegments, x0));
    const clampedZ0 = Math.max(0, Math.min(terrainSegments, z0));
    const clampedX1 = Math.max(0, Math.min(terrainSegments, x1));
    const clampedZ1 = Math.max(0, Math.min(terrainSegments, z1));

    // Ensure heightmap is loaded
    if (!terrainHeightmap) return 0;

    // Get heights of the four corners
    const h00 = terrainHeightmap[clampedZ0]?.[clampedX0] ?? 0;
    const h10 = terrainHeightmap[clampedZ0]?.[clampedX1] ?? h00;
    const h01 = terrainHeightmap[clampedZ1]?.[clampedX0] ?? h00;
    const h11 = terrainHeightmap[clampedZ1]?.[clampedX1] ?? h00;

    // Bilinear interpolation
    const h0 = h00 * (1 - dx) + h10 * dx;
    const h1 = h01 * (1 - dx) + h11 * dx;

    return h0 * (1 - dz) + h1 * dz;
}

// Get biome data at world coordinates (uses cached terrainData)
function getTerrainDataAt(x, z) {
    // Use chunk system if enabled
    if (useChunks && typeof getChunkBiomeAt === 'function') {
        const biome = getChunkBiomeAt(x, z);
        if (biome) {
            return { biome };
        }
    }

    // Fallback to single-mesh terrainData
    if (!terrainData) return null;

    // Convert world to grid coordinates
    const gridX = Math.round((x + terrainSize/2) / (terrainSize / terrainSegments));
    const gridZ = Math.round((z + terrainSize/2) / (terrainSize / terrainSegments));

    // Clamp to valid bounds
    const clampedX = Math.max(0, Math.min(terrainSegments, gridX));
    const clampedZ = Math.max(0, Math.min(terrainSegments, gridZ));

    return terrainData[clampedZ]?.[clampedX] || null;
}

// Calculate base terrain height (original noise-based method)
function calculateBaseHeight(x, z) {
    const cfg = terrainConfig || {};
    const noise = cfg.noise || {};
    const elev = cfg.elevation || {};

    const scale = noise.scale || 0.02;
    const octaves = noise.octaves || 4;
    const persistence = noise.persistence || 0.5;
    const lacunarity = noise.lacunarity || 2.0;

    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        total += simplex.noise2D(x * frequency * scale, z * frequency * scale) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    const hillHeight = elev.hillHeight || 4;
    return (total / maxValue) * hillHeight;
}

// Calculate terrain height with climate influence
// Piecewise-linear spline: points are [input, output] sorted by input
function terrainSpline(points, v) {
    if (v <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
        if (v <= points[i][0]) {
            const [x0, y0] = points[i - 1], [x1, y1] = points[i];
            const t = (v - x0) / (x1 - x0);
            return y0 + (y1 - y0) * t * t * (3 - 2 * t);
        }
    }
    return points[points.length - 1][1];
}

// Scale: the player is 4.5 units tall (Minecraft's 1.8 blocks), so 1 block ~ 2.5 units.
// Minecraft sea level is Y=62 with plains ~0-15 blocks above it, interior
// uplands ~40-60, and mountain peaks ~100-190 blocks up (Y=160-256).

// Base land height from continentalness: deep ocean -> shelf -> coast -> lowlands -> interior uplands
// (sea level is -5)
const CONTINENT_SPLINE = [
    [-1.0, -60], [-0.45, -40], [-0.3, -20], [-0.2, -8], [-0.13, -3],
    [-0.05, 2], [0.1, 10], [0.3, 30], [0.55, 60], [1.0, 110]
];

let ridgeSimplex = null;

// Calculate terrain height with climate influence. Terrain shape comes from
// climate (continentalness = how far inland, erosion = how rugged, weirdness =
// peaks and valleys); the biome is then chosen from climate AND the resulting
// elevation, so mountains are cold and rocky, coasts sandy, lowlands green.
function calculateTerrainHeight(x, z) {
    const cfg = terrainConfig || {};
    const elev = cfg.elevation || {};

    let climate = null;
    let biome = null;
    let blendBiome = null;
    let blendWeight = 0;
    let height = 0;

    const distanceToCenter = Math.sqrt(x * x + z * z);

    if (typeof getClimateAt === 'function') {
        climate = { ...getClimateAt(x, z) };

        // Keep spawn on gentle dry land
        const spawnLand = 1 - smoothstep(300, 900, distanceToCenter);
        climate.continentalness = Math.min(1, climate.continentalness + 0.35 * spawnLand);

        const c = climate.continentalness, e = climate.erosion, w = climate.weirdness || 0;
        const rugged = 1 - smoothstep(-0.4, 0.6, e);     // 1 = rugged, 0 = flat
        const inland = smoothstep(-0.2, 0.05, c);

        // 1. Continental base
        height = terrainSpline(CONTINENT_SPLINE, c);

        // 2. Hills: bigger where the land is rugged, nearly flat where it is eroded
        // Hills: wide and rolling (sampled at 1/4 frequency: ~500/250/125-unit
        // wavelengths), bigger where the land is rugged, nearly flat where eroded
        height += (calculateBaseHeight(x * 0.25, z * 0.25) / Math.max(1, elev.hillHeight || 25)) * (4 + 46 * rugged) * inland;

        // 3. Mountain ranges: long ridges, only inland where erosion is low
        if (!ridgeSimplex) ridgeSimplex = new SimplexNoise((cfg.seed || 'seed') + '_ridges');
        const mountainous = smoothstep(0.2, -0.4, e) * smoothstep(-0.1, 0.25, c) * (1 - spawnLand);
        if (mountainous > 0) {
            const r1 = 1 - Math.abs(ridgeSimplex.noise2D(x * 0.0007, z * 0.0007));
            const r2 = 1 - Math.abs(ridgeSimplex.noise2D(x * 0.0021 + 300, z * 0.0021 + 300));
            const ridge = Math.pow(r1, 1.8);
            const peaks = ridge * 0.8 + ridge * r2 * r2 * 0.35;
            height += peaks * (elev.mountainHeight || 480) * mountainous;
        }

        // 4. Peaks and valleys (Minecraft's folded weirdness) for upland variety
        const pv = 1 - Math.abs(3 * Math.abs(w) - 2);
        height += pv * 20 * inland * rugged;

        // Biome from climate + elevation, plus the neighbor biome to blend toward
        if (typeof getBiomeBlendAt === 'function') {
            ({ biome, blendBiome, blendWeight } = getBiomeBlendAt(climate, height));
        } else if (typeof getBiomeAt === 'function') {
            biome = getBiomeAt(climate, height);
        }

        // Biome surface detail (dunes, mesas, crags...), blended at borders
        const ownHeight = applyBiomeFeatures(height, x, z, biome, climate);
        height = blendWeight > 0.001
            ? ownHeight + (applyBiomeFeatures(height, x, z, blendBiome, climate) - ownHeight) * blendWeight
            : ownHeight;
    } else {
        height = calculateBaseHeight(x, z);
    }

    // Flatten the spawn plateau
    const plateauRadius = elev.plateauRadius || 30;
    if (distanceToCenter < plateauRadius) {
        const blendFactor = smoothstep(0, 1, distanceToCenter / plateauRadius);
        height = 2 + (height - 2) * blendFactor;
    }

    // Lakes and ponds, then river valleys, last so they cut through everything
    if (typeof applyWaterBodies === 'function') {
        height = applyWaterBodies(x, z, height, climate);
    }
    let river = 0;
    if (typeof getRiverCarve === 'function') {
        ({ height, river } = getRiverCarve(x, z, height));
    }

    return { height, climate, biome, blendBiome, blendWeight, river };
}

// Create terrain mesh with biome-colored vertices
function createHillyGround() {
    // Initialize terrain config from map
    initTerrainConfig();

    if (typeof gameLog === 'function') gameLog(`Terrain: ${terrainSize}x${terrainSize}, chunks: ${useChunks}`);
    const startTime = performance.now();

    if (useChunks) {
        // Use chunk-based terrain for large worlds
        createChunkedTerrain();
    } else {
        // Use single-mesh terrain for smaller worlds
        createSingleMeshTerrain();
    }

    const genTime = performance.now() - startTime;
    if (typeof gameLog === 'function') gameLog(`Terrain initialized in ${genTime.toFixed(1)}ms`);
}

// Create chunk-based terrain (for large worlds)
function createChunkedTerrain() {
    // Initialize chunk system with config
    if (typeof initChunkSystem === 'function') {
        initChunkSystem({
            chunkSize: terrainConfig.chunks.size,
            chunkSegments: terrainConfig.chunks.segments,
            renderDistance: terrainConfig.chunks.renderDistance,
            unloadDistance: terrainConfig.chunks.unloadDistance
        });
    }

    // Signal terrain is ready
    isTerrainReady = true;
    if (typeof window !== 'undefined') {
        window.isTerrainReady = true;
    }

    // Load initial chunks around spawn
    if (typeof updateChunks === 'function') {
        updateChunks(0, 0);
    }

    // Chunked terrain ready
}

// Create single-mesh terrain (for smaller worlds, legacy mode)
function createSingleMeshTerrain() {
    // Precompute terrain data (height + climate + biome) for entire terrain
    terrainHeightmap = [];
    terrainData = [];

    for (let z = 0; z <= terrainSegments; z++) {
        terrainHeightmap[z] = [];
        terrainData[z] = [];

        for (let x = 0; x <= terrainSegments; x++) {
            const worldX = (x / terrainSegments - 0.5) * terrainSize;
            const worldZ = (z / terrainSegments - 0.5) * terrainSize;

            const data = calculateTerrainHeight(worldX, worldZ);

            terrainHeightmap[z][x] = data.height;
            terrainData[z][x] = {
                height: data.height,
                climate: data.climate,
                biome: data.biome
            };
        }
    }

    // Create terrain geometry
    const groundGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);

    const vertices = groundGeometry.attributes.position.array;
    const vertexCount = (terrainSegments + 1) * (terrainSegments + 1);

    // Create vertex colors array
    const colors = new Float32Array(vertexCount * 3);

    // Apply heights and colors to vertices
    for (let i = 0; i < vertices.length; i += 3) {
        const vertexIndex = i / 3;
        const x = vertexIndex % (terrainSegments + 1);
        const z = Math.floor(vertexIndex / (terrainSegments + 1));

        // Set height
        vertices[i + 2] = terrainHeightmap[z][x];

        // Set color from biome
        const data = terrainData[z][x];
        let color;

        if (data.biome) {
            color = new THREE.Color(data.biome.color);
        } else if (terrainConfig.color) {
            // Fallback to config color if no biome system
            color = new THREE.Color(terrainConfig.color);
        } else {
            color = new THREE.Color(0x4a7c4e); // Default green
        }

        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }

    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    groundGeometry.computeVertexNormals();

    // Create material with vertex colors - use Lambert for shadows
    const groundMaterial = new THREE.MeshLambertMaterial({
        vertexColors: true
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = true;    // Terrain casts shadows (mountains)
    ground.receiveShadow = true; // Terrain receives shadows
    scene.add(ground);

    // Expose ground mesh globally for raycasting/building
    window.groundMesh = ground;

    // Signal that terrain is ready globally
    isTerrainReady = true;
    if (typeof window !== 'undefined') {
        window.isTerrainReady = true;
    }

    // Log biome distribution
    const biomeCounts = {};
    for (let z = 0; z <= terrainSegments; z++) {
        for (let x = 0; x <= terrainSegments; x++) {
            const biome = terrainData[z][x].biome;
            if (biome) {
                biomeCounts[biome.id] = (biomeCounts[biome.id] || 0) + 1;
            }
        }
    }

    // Single-mesh terrain created
}

// Make available globally
window.getTerrainHeightAt = getTerrainHeightAt;
window.getTerrainDataAt = getTerrainDataAt;
window.createHillyGround = createHillyGround;
window.initTerrainConfig = initTerrainConfig;
