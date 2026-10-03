// Chunk-based terrain system for large worlds
// Only loads terrain chunks near the player for performance
// Uses Systems registry pattern for organized update loop

// ChunkSystem - manages terrain chunk loading/unloading
const ChunkSystem = {
    init() {
        // Chunks are initialized when terrain is created
    },

    update(delta) {
        // Chunk updates are handled by updateChunks() called separately
        // to allow for throttling
        if (typeof updateChunks === 'function') {
            updateChunks();
        }
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('chunks', ChunkSystem);
}

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

            // Rivers are already carved into the height; anything below sea level is water
            const height = data.height;
            const waterConfig = typeof getWaterConfig === 'function' ? getWaterConfig() : { seaLevel: -5 };
            const waterLevel = data.waterLevel ?? waterConfig.seaLevel;
            const isWaterPoint = height < waterLevel;
            const waterType = isWaterPoint ? ((data.river || 0) > 0.3 ? 'river' : 'lake') : null;
            if (isWaterPoint) hasWater = true;

            heightmap[z][x] = height;
            biomeData[z][x] = {
                height: height,
                climate: data.climate,
                biome: data.biome,
                blendBiome: data.blendBiome,
                blendWeight: data.blendWeight || 0,
                isWater: isWaterPoint,
                waterLevel: waterLevel,
                inRiver: (data.river || 0) > 0.3,
                waterType: waterType
            };
        }
    }

    // Water can't stand higher than the lowest point it could spill over -
    // checked across chunk borders so one body of water has one level
    const chunkData = { cx, cz, heightmap, biomeData, bounds, hasWater };
    chunkData.hasWater = containChunkWater(chunkData, true);
    return chunkData;
}

// Grid vertex at local index (x, z) of a chunk, reaching into the neighbouring
// loaded chunk for indices just outside this one (-1 or segments+1)
function chunkVertexAt(data, x, z) {
    const n = data.heightmap.length, seg = n - 1;
    if (x >= 0 && z >= 0 && x < n && z < n) return { h: data.heightmap[z][x], d: data.biomeData[z][x] };
    let cx = data.cx, cz = data.cz, xx = x, zz = z;
    if (x < 0) { cx--; xx = x + seg; } else if (x >= n) { cx++; xx = x - seg; }
    if (z < 0) { cz--; zz = z + seg; } else if (z >= n) { cz++; zz = z - seg; }
    const nb = loadedChunks.get(chunkKey(cx, cz));
    if (!nb || zz < 0 || xx < 0 || zz >= n || xx >= n) return null;
    return { h: nb.data.heightmap[zz][xx], d: nb.data.biomeData[zz][xx] };
}

// Cap every raised (river/lake) water level by its neighbours: water at a
// level L would spill onto a neighbour whose ground and water are both lower,
// so L <= max(neighbour ground, neighbour water level) - except along a river
// channel, whose surface slopes downstream. Repeated until stable, a lake with
// a gap in its rim drains to the gap's height. Neighbours in adjacent loaded
// chunks count too.
function relaxWaterLevels(data) {
    const sea = typeof getWaterConfig === 'function' ? getWaterConfig().seaLevel : -5;
    const n = data.heightmap.length;
    let changedAny = false, changed = true;
    for (let iter = 0; changed && iter < 200; iter++) {
        changed = false;
        for (let z = 0; z < n; z++) {
            for (let x = 0; x < n; x++) {
                const d = data.biomeData[z][x];
                if (d.waterLevel <= sea + 0.01) continue;
                let cap = d.waterLevel;
                for (let dz = -1; dz <= 1; dz++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dz === 0) continue;
                        const nb = chunkVertexAt(data, x + dx, z + dz);
                        if (!nb) continue;
                        // Rivers flow downhill: their surface may slope along the channel
                        // (only between river points that both hold water)
                        if (d.inRiver && nb.d.inRiver && nb.h < nb.d.waterLevel) continue;
                        const spill = Math.max(nb.h, nb.d.waterLevel);
                        if (spill < cap) cap = spill;
                    }
                }
                if (cap < d.waterLevel - 0.01) {
                    d.waterLevel = Math.max(sea, cap);
                    changed = changedAny = true;
                }
            }
        }
    }
    return changedAny;
}

// Border vertices exist in two to four chunks: give every copy one level (the
// lowest). Returns the neighbouring chunks whose levels were lowered.
function syncWaterBorders(data) {
    const n = data.heightmap.length, seg = n - 1;
    const lowered = new Set();
    const share = (x, z, ncx, ncz, nx, nz) => {
        const nb = loadedChunks.get(chunkKey(ncx, ncz));
        if (!nb) return;
        const a = data.biomeData[z][x], bd = nb.data.biomeData[nz][nx];
        const level = Math.min(a.waterLevel, bd.waterLevel);
        a.waterLevel = level;
        if (bd.waterLevel > level + 0.01) { bd.waterLevel = level; lowered.add(nb); }
    };
    for (let i = 0; i < n; i++) {
        share(0, i, data.cx - 1, data.cz, seg, i);
        share(seg, i, data.cx + 1, data.cz, 0, i);
        share(i, 0, data.cx, data.cz - 1, i, seg);
        share(i, seg, data.cx, data.cz + 1, i, 0);
    }
    for (const [x, z, dx, dz] of [[0, 0, -1, -1], [seg, 0, 1, -1], [0, seg, -1, 1], [seg, seg, 1, 1]]) {
        share(x, z, data.cx + dx, data.cz + dz, x === 0 ? seg : 0, z === 0 ? seg : 0);
    }
    return lowered;
}

function updateWaterFlags(data) {
    let hasWater = false;
    for (let z = 0; z < data.heightmap.length; z++) {
        for (let x = 0; x < data.heightmap.length; x++) {
            const d = data.biomeData[z][x];
            d.isWater = data.heightmap[z][x] < d.waterLevel;
            if (!d.isWater) d.waterType = null;
            else hasWater = true;
        }
    }
    data.hasWater = hasWater;
    return hasWater;
}

// Contain this chunk's water, agree border levels with loaded neighbours and,
// if that lowered a neighbour, settle and redraw the neighbour's water too.
function containChunkWater(data, propagate) {
    relaxWaterLevels(data);
    let lowered = syncWaterBorders(data);
    if (propagate) {
        // Spread level drops chunk to chunk until every border agrees
        const touched = new Set(lowered);
        const queue = [...lowered];
        for (let guard = 0; queue.length && guard < 64; guard++) {
            const nb = queue.shift();
            relaxWaterLevels(nb.data);
            for (const next of syncWaterBorders(nb.data)) {
                if (next.data === data) continue;
                if (!touched.has(next)) touched.add(next);
                queue.push(next);
            }
            updateWaterFlags(nb.data);
        }
        if (touched.size) { relaxWaterLevels(data); syncWaterBorders(data); }
        lowered = touched;
    }
    const hasWater = updateWaterFlags(data);
    if (propagate && typeof rebuildChunkWaterMesh === 'function') {
        // Redraw neighbours whose levels changed or whose shared edge has water,
        // so both sides of the border draw the same surface
        const seg = data.heightmap.length - 1;
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const nb = loadedChunks.get(chunkKey(data.cx + dx, data.cz + dz));
            if (!nb) continue;
            let edgeWet = lowered.has(nb);
            for (let i = 0; i <= seg && !edgeWet; i++) {
                const x = dx < 0 ? 0 : dx > 0 ? seg : i, z = dz < 0 ? 0 : dz > 0 ? seg : i;
                const d = data.biomeData[z][x];
                if (d.isWater) edgeWet = true;
                if (dx && dz) break; // Corner neighbour: just the corner point
            }
            if (edgeWet || nb.data.hasWater) rebuildChunkWaterMesh(nb);
        }
    }
    return hasWater;
}

// Create mesh for a chunk
// --- Ground look ---
// Biomes fade into their neighbor near borders, break up into noise patches of
// a second color, badlands get terracotta strata, and high ground gets a
// temperature-dependent snowline.
const HOT_BIOMES = new Set(['desert', 'badlands', 'savanna', 'jungle', 'bambooJungle',
    'volcanicPeaks', 'mangroveSwamp', 'beach']);
const _altColor = new THREE.Color();
const _blendColor = new THREE.Color();
const _snowColor = new THREE.Color(0xF4F7FA);

function biomeGroundColor(biome, worldX, worldZ, height, out) {
    out.setHex(biome.color);
    if (biome.colorAlt !== undefined) {
        const n = simplex.noise2D(worldX * 0.012 + 300, worldZ * 0.012 + 300) * 0.65 +
                  simplex.noise2D(worldX * 0.05 + 700, worldZ * 0.05 + 700) * 0.35;
        out.lerp(_altColor.setHex(biome.colorAlt), smoothstep(-0.1, 0.5, n) * 0.75);
    }
    if (biome.id === 'badlands') {
        const band = Math.sin(height * 0.35) * 0.06 + Math.sin(height * 0.9 + 1.3) * 0.03;
        out.offsetHSL(0, 0, band);
    }
    return out;
}

function getSnowCover(data, worldX, worldZ) {
    if (!data.climate || !data.biome || HOT_BIOMES.has(data.biome.id)) return 0;
    const snowline = 250 + data.climate.temperature * 150;
    const jitter = simplex.noise2D(worldX * 0.03 + 900, worldZ * 0.03 + 900) * 10;
    return smoothstep(snowline, snowline + 25, data.height + jitter);
}

// Shore (0-1): sandy band just above the water line and on the bed below it
function getShoreAmount(height, waterLevel) {
    return smoothstep(waterLevel + 1.8, waterLevel + 0.3, height);
}

// Seabed darkness (0-1) with depth below the water line
function getSeabedAmount(height, waterLevel) {
    return smoothstep(waterLevel, waterLevel - 9, height);
}

const _sandColor = new THREE.Color(0xCDBA8C);
const _seabedColor = new THREE.Color(0x4E4C3C);

function getGroundColor(data, worldX, worldZ, snow, out) {
    biomeGroundColor(data.biome, worldX, worldZ, data.height, out);
    if (data.blendBiome && data.blendWeight > 0.001) {
        out.lerp(biomeGroundColor(data.blendBiome, worldX, worldZ, data.height, _blendColor), data.blendWeight);
    }
    out.offsetHSL(0, 0, simplex.noise2D(worldX * 0.11 + 50, worldZ * 0.11 + 50) * 0.035);
    if (snow > 0) out.lerp(_snowColor, snow);
    // Sandy shores and a seabed that darkens with depth (the water surface adds the blue)
    const level = data.waterLevel ?? -5;
    out.lerp(_sandColor, getShoreAmount(data.height, level) * 0.75);
    out.lerp(_seabedColor, getSeabedAmount(data.height, level) * 0.8);
    return out;
}

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

    // Cave colors
    const caveFloorColor = new THREE.Color(0x2a2a2a);

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

        // Cave entrance gets dark floor color
        if (data.isCaveEntrance) {
            color = caveFloorColor;
        } else if (data.biome) {
            const worldX = bounds.minX + (x / segments) * size;
            const worldZ = bounds.minZ + (z / segments) * size;
            data.snow = getSnowCover(data, worldX, worldZ);
            color = getGroundColor(data, worldX, worldZ, data.snow, new THREE.Color());
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

    // Add UV coordinates for texture tiling (world-space)
    const uvs = new Float32Array(vertexCount * 2);
    const textureScale = 0.05; // How often texture repeats
    for (let i = 0; i < vertexCount; i++) {
        const x = i % (segments + 1);
        const z = Math.floor(i / (segments + 1));
        const worldX = bounds.minX + (x / segments) * size;
        const worldZ = bounds.minZ + (z / segments) * size;
        uvs[i * 2] = worldX * textureScale;
        uvs[i * 2 + 1] = worldZ * textureScale;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    // Calculate slope per vertex and store as attribute for shader
    const normals = geometry.attributes.normal.array;
    const slopes = new Float32Array(vertexCount);
    // Per-vertex texture weights (grass, dirt, sand | snow, rock, mud) so borders
    // blend textures - interpolating a single texture index produced stripes of
    // unrelated textures between biomes
    const texWeightsA = new Float32Array(vertexCount * 3);
    const texWeightsB = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
        // Slope is based on how much the normal points up (y component after rotation)
        // Normal Y in plane geometry = Z after rotation
        const ny = Math.abs(normals[i * 3 + 2]); // Z component = up after -90deg X rotation
        slopes[i] = 1.0 - ny; // 0 = flat, 1 = vertical

        // Get biome texture index from biome data
        const x = i % (segments + 1);
        const z = Math.floor(i / (segments + 1));
        const data = chunkData.biomeData[z][x];
        const weights = [0, 0, 0, 0, 0, 0];
        const blend = data.blendBiome ? data.blendWeight : 0;
        const snow = data.snow || 0;
        const ownTex = getTextureIndex(data.biome?.textureType || 'grass');
        weights[ownTex] += (1 - blend) * (1 - snow);
        if (blend > 0) weights[getTextureIndex(data.blendBiome.textureType || 'grass')] += blend * (1 - snow);
        weights[3] += snow;
        // Shores and lake beds turn to sand, deep beds to mud
        const level = data.waterLevel ?? -5;
        const shore = getShoreAmount(data.height ?? 0, level), seabed = getSeabedAmount(data.height ?? 0, level);
        if (shore > 0) {
            for (let w = 0; w < 6; w++) weights[w] *= 1 - shore;
            weights[2] += shore * (1 - seabed);
            weights[5] += shore * seabed;
        }
        texWeightsA.set(weights.slice(0, 3), i * 3);
        texWeightsB.set(weights.slice(3, 6), i * 3);
    }
    geometry.setAttribute('slope', new THREE.BufferAttribute(slopes, 1));
    geometry.setAttribute('texWeightsA', new THREE.BufferAttribute(texWeightsA, 3));
    geometry.setAttribute('texWeightsB', new THREE.BufferAttribute(texWeightsB, 3));

    // Create material - use textured if available, otherwise fallback to Lambert
    let material;
    if (typeof areGroundTexturesReady === 'function' && areGroundTexturesReady()) {
        const atlas = getGroundTextureAtlas();
        material = createTerrainShaderMaterial(atlas);
    } else {
        // Fallback to simple Lambert
        material = new THREE.MeshLambertMaterial({
            vertexColors: true
        });
    }

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = true;    // Chunks cast shadows (mountains)
    mesh.receiveShadow = true; // Chunks receive shadows

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
    if (chunkData.hasWater && typeof createChunkWaterMesh === 'function') {
        waterMesh = createChunkWaterMesh(cx, cz, chunkData);
        if (waterMesh) scene.add(waterMesh);
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

    // Plant this chunk's trees and ground vegetation
    if (typeof addChunkTrees === 'function') {
        addChunkTrees(cx, cz, chunkData);
    }
    if (typeof addChunkShrubs === 'function') {
        addChunkShrubs(cx, cz, chunkData);
    }
    if (typeof addChunkAnimals === 'function') {
        addChunkAnimals(cx, cz, chunkData);
    }
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
        chunk.waterMesh.geometry.dispose(); // Material is shared
    }

    // Remove this chunk's trees and ground vegetation
    if (typeof removeChunkTrees === 'function') {
        removeChunkTrees(key);
    }
    if (typeof removeChunkShrubs === 'function') {
        removeChunkShrubs(key);
    }
    if (typeof removeChunkAnimals === 'function') {
        removeChunkAnimals(key);
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

// Water level at world position from a loaded chunk (bilinear), or null
function getChunkWaterLevelAt(x, z) {
    const chunk = worldToChunk(x, z);
    const chunkData = loadedChunks.get(chunkKey(chunk.x, chunk.z));
    if (!chunkData) return null;
    const segments = CHUNK_CONFIG.segments, b = chunkData.data.bounds, bd = chunkData.data.biomeData;
    const lx = Math.max(0, Math.min(segments - 1e-6, ((x - b.minX) / CHUNK_CONFIG.size) * segments));
    const lz = Math.max(0, Math.min(segments - 1e-6, ((z - b.minZ) / CHUNK_CONFIG.size) * segments));
    const x0 = Math.floor(lx), z0 = Math.floor(lz), dx = lx - x0, dz = lz - z0;
    const l = (gx, gz) => bd[gz][gx].waterLevel ?? -5;
    return (l(x0, z0) * (1 - dx) + l(x0 + 1, z0) * dx) * (1 - dz) + (l(x0, z0 + 1) * (1 - dx) + l(x0 + 1, z0 + 1) * dx) * dz;
}

// Get biome data at world position
function getChunkBiomeAt(x, z) {
    const chunk = worldToChunk(x, z);
    const key = chunkKey(chunk.x, chunk.z);
    const chunkData = loadedChunks.get(key);

    if (!chunkData) {
        // Calculate directly if chunk not loaded
        if (typeof calculateTerrainHeight === 'function') {
            return calculateTerrainHeight(x, z).biome;
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

    if (typeof gameLog === 'function') gameLog(`Chunk system initialized: ${CHUNK_CONFIG.size}x${CHUNK_CONFIG.size} chunks`);

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
window.chunkKey = chunkKey;
