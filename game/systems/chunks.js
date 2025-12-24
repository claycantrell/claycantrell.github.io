// Chunk-based terrain system for large worlds
// Only loads terrain chunks near the player for performance

// Chunk configuration
const CHUNK_CONFIG = {
    size: 512,              // Size of each chunk in world units
    segments: 48,           // Geometry segments per chunk
    renderDistance: 6,      // How many chunks to render in each direction
    updateInterval: 300,    // How often to check for chunk updates (ms)
    unloadDistance: 8       // Chunks beyond this distance are unloaded
};

// Chunk storage
const loadedChunks = new Map();  // Key: "x,z" -> { mesh, data, lastAccess }
let chunkUpdateTimer = null;
let lastPlayerChunk = { x: null, z: null };

// Get chunk coordinates from world position
function worldToChunk(x, z) {
    return {
        x: Math.floor(x / CHUNK_CONFIG.size),
        z: Math.floor(z / CHUNK_CONFIG.size)
    };
}

// Get chunk key string
function chunkKey(cx, cz) {
    return `${cx},${cz}`;
}

// Get world bounds for a chunk
function getChunkBounds(cx, cz) {
    const size = CHUNK_CONFIG.size;
    return {
        minX: cx * size,
        maxX: (cx + 1) * size,
        minZ: cz * size,
        maxZ: (cz + 1) * size,
        centerX: (cx + 0.5) * size,
        centerZ: (cz + 0.5) * size
    };
}

// Generate terrain data for a chunk
function generateChunkData(cx, cz) {
    const bounds = getChunkBounds(cx, cz);
    const segments = CHUNK_CONFIG.segments;
    const size = CHUNK_CONFIG.size;

    const heightmap = [];
    const biomeData = [];
    let hasWater = false;

    for (let z = 0; z <= segments; z++) {
        heightmap[z] = [];
        biomeData[z] = [];

        for (let x = 0; x <= segments; x++) {
            // Convert to world coordinates
            const worldX = bounds.minX + (x / segments) * size;
            const worldZ = bounds.minZ + (z / segments) * size;

            // Calculate terrain at this point (uses existing terrain system)
            const data = calculateTerrainHeight(worldX, worldZ);

            // Check for rivers and apply carving
            let height = data.height;
            let isWaterPoint = false;
            let waterType = null;

            if (typeof isRiver === 'function' && isRiver(worldX, worldZ, data.climate)) {
                // Carve river into terrain
                if (typeof applyRiverCarving === 'function') {
                    height = applyRiverCarving(worldX, worldZ, height);
                }
                isWaterPoint = true;
                waterType = 'river';
                hasWater = true;
            }

            // Check for lakes (low areas)
            const waterConfig = typeof getWaterConfig === 'function' ? getWaterConfig() : { seaLevel: -5 };
            if (height < waterConfig.seaLevel) {
                isWaterPoint = true;
                waterType = 'lake';
                hasWater = true;
            }

            heightmap[z][x] = height;
            biomeData[z][x] = {
                height: height,
                climate: data.climate,
                biome: data.biome,
                isWater: isWaterPoint,
                waterType: waterType
            };
        }
    }

    return { heightmap, biomeData, bounds, hasWater };
}

// Create mesh for a chunk
function createChunkMesh(cx, cz, chunkData) {
    const size = CHUNK_CONFIG.size;
    const segments = CHUNK_CONFIG.segments;
    const bounds = chunkData.bounds;

    // Create geometry
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const vertices = geometry.attributes.position.array;
    const vertexCount = (segments + 1) * (segments + 1);

    // Create vertex colors
    const colors = new Float32Array(vertexCount * 3);

    // Water colors
    const riverColor = new THREE.Color(0x2980b9);
    const lakeColor = new THREE.Color(0x1a5f7a);
    const shallowColor = new THREE.Color(0x5dade2);

    // Apply heights and colors
    for (let i = 0; i < vertices.length; i += 3) {
        const vertexIndex = i / 3;
        const x = vertexIndex % (segments + 1);
        const z = Math.floor(vertexIndex / (segments + 1));

        // Set height
        vertices[i + 2] = chunkData.heightmap[z][x];

        // Set color from biome or water
        const data = chunkData.biomeData[z][x];
        let color;

        if (data.isWater) {
            // Water coloring based on type and depth
            if (data.waterType === 'river') {
                color = riverColor;
            } else {
                // Lake - depth based color
                const waterConfig = typeof getWaterConfig === 'function' ? getWaterConfig() : { seaLevel: -5 };
                const depth = waterConfig.seaLevel - data.height;
                if (depth < 2) {
                    color = shallowColor;
                } else if (depth < 6) {
                    color = riverColor;
                } else {
                    color = lakeColor;
                }
            }
        } else if (data.biome) {
            color = new THREE.Color(data.biome.color);
        } else {
            color = new THREE.Color(0x4a7c4e);
        }

        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Create material
    const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        flatShading: true
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;

    // Position chunk in world
    mesh.position.set(bounds.centerX, 0, bounds.centerZ);

    return mesh;
}

// Load a chunk
function loadChunk(cx, cz) {
    const key = chunkKey(cx, cz);

    // Already loaded?
    if (loadedChunks.has(key)) {
        loadedChunks.get(key).lastAccess = Date.now();
        return;
    }

    // Generate chunk data
    const chunkData = generateChunkData(cx, cz);

    // Create terrain mesh
    const mesh = createChunkMesh(cx, cz, chunkData);

    // Add to scene
    scene.add(mesh);

    // Create water plane if chunk has water
    let waterMesh = null;
    if (chunkData.hasWater && typeof createChunkWaterPlane === 'function') {
        waterMesh = createChunkWaterPlane(cx, cz, CHUNK_CONFIG.size);
        scene.add(waterMesh);
    }

    // Store in map
    loadedChunks.set(key, {
        mesh,
        waterMesh,
        data: chunkData,
        cx,
        cz,
        lastAccess: Date.now()
    });
}

// Unload a chunk
function unloadChunk(key) {
    const chunk = loadedChunks.get(key);
    if (!chunk) return;

    // Remove terrain mesh from scene
    scene.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
    chunk.mesh.material.dispose();

    // Remove water mesh if exists
    if (chunk.waterMesh) {
        scene.remove(chunk.waterMesh);
        chunk.waterMesh.geometry.dispose();
        chunk.waterMesh.material.dispose();
    }

    // Remove from map
    loadedChunks.delete(key);
}

// Update loaded chunks based on player position
function updateChunks(playerX, playerZ) {
    const playerChunk = worldToChunk(playerX, playerZ);

    // Skip if player hasn't moved to a new chunk
    if (playerChunk.x === lastPlayerChunk.x && playerChunk.z === lastPlayerChunk.z) {
        return;
    }

    lastPlayerChunk = playerChunk;

    const renderDist = CHUNK_CONFIG.renderDistance;
    const unloadDist = CHUNK_CONFIG.unloadDistance;

    // Load chunks within render distance
    for (let dz = -renderDist; dz <= renderDist; dz++) {
        for (let dx = -renderDist; dx <= renderDist; dx++) {
            const cx = playerChunk.x + dx;
            const cz = playerChunk.z + dz;
            loadChunk(cx, cz);
        }
    }

    // Unload chunks beyond unload distance
    const chunksToUnload = [];
    for (const [key, chunk] of loadedChunks) {
        const dx = Math.abs(chunk.cx - playerChunk.x);
        const dz = Math.abs(chunk.cz - playerChunk.z);

        if (dx > unloadDist || dz > unloadDist) {
            chunksToUnload.push(key);
        }
    }

    for (const key of chunksToUnload) {
        unloadChunk(key);
    }
}

// Get terrain height at world position (works with chunks)
function getChunkTerrainHeightAt(x, z) {
    const chunk = worldToChunk(x, z);
    const key = chunkKey(chunk.x, chunk.z);
    const chunkData = loadedChunks.get(key);

    if (!chunkData) {
        // Chunk not loaded - calculate directly
        const data = calculateTerrainHeight(x, z);
        return data.height;
    }

    // Interpolate within chunk
    const bounds = chunkData.data.bounds;
    const segments = CHUNK_CONFIG.segments;

    // Convert to local chunk coordinates (0 to segments)
    const localX = ((x - bounds.minX) / CHUNK_CONFIG.size) * segments;
    const localZ = ((z - bounds.minZ) / CHUNK_CONFIG.size) * segments;

    // Bilinear interpolation
    const x0 = Math.floor(localX);
    const z0 = Math.floor(localZ);
    const x1 = Math.min(segments, x0 + 1);
    const z1 = Math.min(segments, z0 + 1);

    const dx = localX - x0;
    const dz = localZ - z0;

    const h00 = chunkData.data.heightmap[z0]?.[x0] ?? 0;
    const h10 = chunkData.data.heightmap[z0]?.[x1] ?? h00;
    const h01 = chunkData.data.heightmap[z1]?.[x0] ?? h00;
    const h11 = chunkData.data.heightmap[z1]?.[x1] ?? h00;

    const h0 = h00 * (1 - dx) + h10 * dx;
    const h1 = h01 * (1 - dx) + h11 * dx;

    return h0 * (1 - dz) + h1 * dz;
}

// Get biome data at world position
function getChunkBiomeAt(x, z) {
    const chunk = worldToChunk(x, z);
    const key = chunkKey(chunk.x, chunk.z);
    const chunkData = loadedChunks.get(key);

    if (!chunkData) {
        // Calculate directly if chunk not loaded
        if (typeof getClimateAt === 'function' && typeof getBiomeAt === 'function') {
            const climate = getClimateAt(x, z);
            return getBiomeAt(climate);
        }
        return null;
    }

    // Get from chunk data
    const bounds = chunkData.data.bounds;
    const segments = CHUNK_CONFIG.segments;

    const localX = Math.round(((x - bounds.minX) / CHUNK_CONFIG.size) * segments);
    const localZ = Math.round(((z - bounds.minZ) / CHUNK_CONFIG.size) * segments);

    const clampedX = Math.max(0, Math.min(segments, localX));
    const clampedZ = Math.max(0, Math.min(segments, localZ));

    return chunkData.data.biomeData[clampedZ]?.[clampedX]?.biome || null;
}

// Start chunk update loop
function startChunkUpdates() {
    if (chunkUpdateTimer) return;

    chunkUpdateTimer = setInterval(() => {
        if (typeof character !== 'undefined' && character) {
            updateChunks(character.position.x, character.position.z);
        }
    }, CHUNK_CONFIG.updateInterval);
}

// Stop chunk updates
function stopChunkUpdates() {
    if (chunkUpdateTimer) {
        clearInterval(chunkUpdateTimer);
        chunkUpdateTimer = null;
    }
}

// Initialize chunk system
function initChunkSystem(config = {}) {
    // Apply config overrides
    if (config.chunkSize) CHUNK_CONFIG.size = config.chunkSize;
    if (config.chunkSegments) CHUNK_CONFIG.segments = config.chunkSegments;
    if (config.renderDistance) CHUNK_CONFIG.renderDistance = config.renderDistance;
    if (config.unloadDistance) CHUNK_CONFIG.unloadDistance = config.unloadDistance;

    console.log(`Chunk system initialized: ${CHUNK_CONFIG.size}x${CHUNK_CONFIG.size} chunks, render distance: ${CHUNK_CONFIG.renderDistance}`);

    // Start update loop
    startChunkUpdates();
}

// Get total loaded chunk count
function getLoadedChunkCount() {
    return loadedChunks.size;
}

// Force reload all chunks (e.g., after config change)
function reloadAllChunks() {
    // Unload all
    for (const key of loadedChunks.keys()) {
        unloadChunk(key);
    }

    // Reset player chunk to force reload
    lastPlayerChunk = { x: null, z: null };

    // Trigger immediate update
    if (typeof character !== 'undefined' && character) {
        updateChunks(character.position.x, character.position.z);
    }
}

// Make available globally
window.initChunkSystem = initChunkSystem;
window.updateChunks = updateChunks;
window.getChunkKey = getChunkKey;
