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

    return terrainConfig;
}

// Smoothstep function for blending
function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
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
function calculateTerrainHeight(x, z) {
    const cfg = terrainConfig || {};
    const elev = cfg.elevation || {};

    // Get base height from noise
    let height = calculateBaseHeight(x, z);

    // Get climate data at this position
    let climate = null;
    let biome = null;

    if (typeof getClimateAt === 'function') {
        climate = getClimateAt(x, z);

        // Apply climate-based height modifiers
        if (typeof getHeightModifier === 'function') {
            const modifier = getHeightModifier(climate);
            height *= modifier;
        }

        // Apply base height offset (ocean basins, elevated inland)
        if (typeof getBaseHeightOffset === 'function') {
            height += getBaseHeightOffset(climate);
        }

        // Get biome for this climate
        if (typeof getBiomeAt === 'function') {
            biome = getBiomeAt(climate);
        }
    }

    // Apply plateau at center (spawn area)
    const plateauRadius = elev.plateauRadius || 30;
    const distanceToCenter = Math.sqrt(x * x + z * z);

    if (distanceToCenter < plateauRadius) {
        const blendFactor = smoothstep(0, 1, distanceToCenter / plateauRadius);
        height *= blendFactor;
    }

    // Mountain generation for distant terrain (smooth, not bumpy)
    const mountainStartRadius = elev.mountainStartRadius || 300;
    if (distanceToCenter > mountainStartRadius) {
        // Only add mountains if erosion is low (mountainous)
        const erosionAllows = !climate || climate.erosion < 0.3;

        if (erosionAllows) {
            // Use very low frequency noise for smooth mountain shapes
            const mountainScale = 0.0015; // Very smooth - large mountain shapes
            const mountainNoise = simplex.noise2D(x * mountainScale + 1000, z * mountainScale + 1000);

            // Smooth transition from terrain to mountains using cubic ease
            const rawTransition = Math.min(1, Math.max(0, (distanceToCenter - mountainStartRadius) / 200));
            const transition = rawTransition * rawTransition * (3 - 2 * rawTransition); // Smoothstep

            // Scale mountain height by inverse erosion (low erosion = tall mountains)
            let mountainMultiplier = 1.0;
            if (climate) {
                const erosionFactor = (1 - climate.erosion) / 2; // 0 to 1, higher when erosion is low
                mountainMultiplier = 0.3 + erosionFactor * erosionFactor * 0.7; // Smooth curve
            }

            // Use absolute noise value for ridge-like mountains (not valleys)
            const ridgeNoise = Math.abs(mountainNoise);
            const mountainHeight = ridgeNoise * (elev.mountainHeight || 250) * transition * mountainMultiplier;
            height += mountainHeight;
        }
    }

    return { height, climate, biome };
}

// Create terrain mesh with biome-colored vertices
function createHillyGround() {
    // Initialize terrain config from map
    initTerrainConfig();

    console.log(`Initializing terrain: ${terrainSize}x${terrainSize} world, chunks: ${useChunks}`);
    const startTime = performance.now();

    if (useChunks) {
        // Use chunk-based terrain for large worlds
        createChunkedTerrain();
    } else {
        // Use single-mesh terrain for smaller worlds
        createSingleMeshTerrain();
    }

    const genTime = performance.now() - startTime;
    console.log(`Terrain initialized in ${genTime.toFixed(1)}ms`);
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

    console.log(`Chunked terrain ready: ${terrainSize}x${terrainSize} world, ${terrainConfig.chunks.size}x${terrainConfig.chunks.size} chunks`);
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

    // Create material with vertex colors
    const groundMaterial = new THREE.MeshBasicMaterial({
        vertexColors: true,
        flatShading: true
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
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

    console.log(`Single-mesh terrain created: ${terrainSize}x${terrainSize}, seed: ${terrainConfig.seed}`);
    console.log('Biome distribution:', biomeCounts);
}

// Make available globally
window.getTerrainHeightAt = getTerrainHeightAt;
window.getTerrainDataAt = getTerrainDataAt;
window.createHillyGround = createHillyGround;
window.initTerrainConfig = initTerrainConfig;
