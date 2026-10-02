// Water system - oceans, lakes and rivers
// The sea sits at one global level. Rivers and lakes sit on the land: their
// water surface follows the land's large-scale height (the smooth continent
// shape, without hills or ridges) and slopes gently down to the coast, so a
// river only cuts a few units into its floodplain and an upland lake is a lake,
// not a pit dug down to sea level. Every terrain point carries a waterLevel;
// it is water there when the ground is below it. Each chunk gets a water
// surface mesh covering only its underwater cells, shaded by depth with foam.

// Water configuration
const WATER_CONFIG = {
    seaLevel: -5,              // The water surface everywhere
    riverNoiseScale: 0.0011,   // Lower = longer, wider-spaced rivers
    riverWidth: 0.03,          // Channel half-width in noise units (~15-20 world units)
    riverValley: 0.16,         // Valley half-width in noise units (wide, gentle banks)
    riverDepth: 3.5,           // Channel bed depth below sea level
    bankHeight: 1.2,           // Valley floor height above sea level
    riverSurfaceDrop: 2,       // River surface sits this far below the land's base level
    lakeSurfaceDrop: 1.5,      // Lake surface likewise
    riverSpawnClear: 260,      // No rivers or lakes within this distance of spawn
    oceanStart: -0.2,          // Continentalness where the coast starts dropping
    oceanFull: -0.34,          // ...and where it is fully sea floor
    oceanDeep: -0.6,           // Deepest ocean
    lakeScale: 0.0007,         // Large inland lakes
    lakeThreshold: 0.52,
    pondScale: 0.004,          // Small ponds
    pondThreshold: 0.72,
    lakeMaxRelief: 30,         // Lakes and ponds form where the land is within this of their surface
    shallowColor: 0x4FB3BF,
    deepColor: 0x14506E,
    foamColor: 0xE8F4F2,
    swimDepth: 2.2             // Deeper than this, characters/animals swim
};

// River noise generators
let riverNoise = null;
let riverNoise2 = null;
let riverWarp = null;
let lakeNoise = null;

function initWaterSystem(seed) {
    riverNoise = new SimplexNoise(seed + '_river');
    riverNoise2 = new SimplexNoise(seed + '_river2');
    riverWarp = new SimplexNoise(seed + '_riverwarp');
    lakeNoise = new SimplexNoise(seed + '_lake');
}

function waterSmoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

// River shape at a point: valley (0-1) pulls land down to the banks, channel
// (0-1) cuts below sea level. Warped ridged noise gives meandering lines.
function getRiverShape(x, z, relief = 0) {
    if (!riverNoise) return { valley: 0, channel: 0 };
    const s = WATER_CONFIG.riverNoiseScale;
    const wx = x + riverWarp.noise2D(x * s * 2, z * s * 2) * 120;
    const wz = z + riverWarp.noise2D(x * s * 2 + 400, z * s * 2 + 400) * 120;
    const n = riverNoise.noise2D(wx * s, wz * s) + riverNoise2.noise2D(wx * s * 3 + 50, wz * s * 3 + 50) * 0.12;
    const d = Math.abs(n);
    return {
        // Wider valley where it cuts through higher ground (banks stay ~1:3 or gentler)
        valley: 1 - waterSmoothstep(WATER_CONFIG.riverWidth, WATER_CONFIG.riverValley + Math.min(0.3, relief * 0.005), d),
        channel: 1 - waterSmoothstep(WATER_CONFIG.riverWidth * 0.55, WATER_CONFIG.riverWidth, d)
    };
}

// Lakes and ponds: lower the land into basins whose surface sits at the
// land's base level. Returns { height, waterLevel }.
function applyWaterBodies(x, z, height, baseLevel, mountainous) {
    const sea = WATER_CONFIG.seaLevel;
    if (!lakeNoise) return { height, waterLevel: sea };
    const surface = Math.max(sea, baseLevel - WATER_CONFIG.lakeSurfaceDrop);

    const lowland = 1 - waterSmoothstep(WATER_CONFIG.lakeMaxRelief * 0.6, WATER_CONFIG.lakeMaxRelief, height - surface);
    const notMountain = 1 - waterSmoothstep(0.25, 0.5, mountainous || 0);
    const clear = waterSmoothstep(WATER_CONFIG.riverSpawnClear * 0.6, WATER_CONFIG.riverSpawnClear, Math.sqrt(x * x + z * z));
    const allowed = lowland * notMountain * clear;
    if (allowed <= 0) return { height, waterLevel: sea };

    const lake = waterSmoothstep(WATER_CONFIG.lakeThreshold, WATER_CONFIG.lakeThreshold + 0.12,
        lakeNoise.noise2D(x * WATER_CONFIG.lakeScale + 900, z * WATER_CONFIG.lakeScale + 900));
    const pond = waterSmoothstep(WATER_CONFIG.pondThreshold, WATER_CONFIG.pondThreshold + 0.1,
        lakeNoise.noise2D(x * WATER_CONFIG.pondScale - 300, z * WATER_CONFIG.pondScale - 300));
    const basin = Math.max(lake, pond * 0.8) * allowed;
    if (basin <= 0) return { height, waterLevel: sea };

    const bed = surface - 1 - 6 * basin;
    let h = height;
    if (h > bed) h = h + (bed - h) * Math.min(1, basin * 1.6);
    return { height: h, waterLevel: surface };
}

// Carve a river into a terrain height. Returns { height, river, waterLevel }
// where river is the channel strength (0 = no river).
function getRiverCarve(x, z, height, baseLevel, mountainous, waterLevel) {
    const riverSurface = Math.max(WATER_CONFIG.seaLevel, baseLevel - WATER_CONFIG.riverSurfaceDrop);
    const shape = getRiverShape(x, z, Math.max(0, height - riverSurface));
    if (shape.valley <= 0) return { height, river: 0, waterLevel };

    // Rivers run through lowland and upland valleys, not through mountain ranges,
    // and stay clear of spawn
    const distFromSpawn = Math.sqrt(x * x + z * z);
    const strength = (1 - waterSmoothstep(0.25, 0.55, mountainous || 0)) *
        waterSmoothstep(WATER_CONFIG.riverSpawnClear * 0.6, WATER_CONFIG.riverSpawnClear, distFromSpawn);
    if (strength <= 0) return { height, river: 0, waterLevel };

    const surface = Math.max(WATER_CONFIG.seaLevel, baseLevel - WATER_CONFIG.riverSurfaceDrop);
    const bank = surface + WATER_CONFIG.bankHeight;
    const bed = surface - WATER_CONFIG.riverDepth;

    // Only ever lower the land: a wide floodplain down to the banks, then the channel
    let h = height;
    if (h > bank) h = h + (bank - h) * shape.valley * strength;
    if (h > bed) h = h + (bed - h) * shape.channel * strength;
    return {
        height: h,
        river: shape.channel * strength,
        // Inside the valley the water level is the river's
        waterLevel: shape.valley * strength > 0.05 ? surface : waterLevel
    };
}

// Compatibility: is this point inside a river channel
function isRiver(x, z) {
    if (typeof calculateTerrainHeight !== 'function') return false;
    return (calculateTerrainHeight(x, z).river || 0) > 0.5;
}

function getRiverInfluence(x, z) {
    return getRiverShape(x, z).channel;
}

// Rivers are carved in calculateTerrainHeight; kept for old callers
function applyRiverCarving(x, z, originalHeight) {
    return originalHeight;
}

function isLake(x, z, terrainHeight) {
    return terrainHeight < getWaterLevelAt(x, z);
}

// Water surface height at a point, or null if the ground is above water
function getWaterSurfaceAt(x, z, groundHeight) {
    const h = groundHeight !== undefined ? groundHeight
        : (typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0);
    const level = getWaterLevelAt(x, z);
    return h < level ? level : null;
}

// Water level at a point: the rendered chunk's level grid when loaded,
// otherwise computed from the terrain function
function getWaterLevelAt(x, z) {
    if (typeof getChunkWaterLevelAt === 'function') {
        const level = getChunkWaterLevelAt(x, z);
        if (level !== null) return level;
    }
    if (typeof calculateTerrainHeight === 'function') {
        const level = calculateTerrainHeight(x, z).waterLevel;
        if (level !== undefined) return level;
    }
    return WATER_CONFIG.seaLevel;
}

// Low land just above the water line (lake shores, river banks, coasts)
function isShoreHeight(height, band = 2.5, waterLevel = WATER_CONFIG.seaLevel) {
    return height >= waterLevel && height < waterLevel + band;
}

// What grows and lives at the water's edge here: 'cold', 'arid' (oasis),
// 'tropical' or 'temperate'
function getShoreClass(climate, height) {
    if (!climate) return 'temperate';
    const t = typeof getEffectiveTemperature === 'function' ? getEffectiveTemperature(climate, height) : climate.temperature;
    if (t < -0.3) return 'cold';
    if (t > 0.5 && climate.humidity > 0.2) return 'tropical';
    if (climate.humidity < -0.25 && t > 0.1) return 'arid';
    return 'temperate';
}

// Biomes that are already shore biomes keep their own planting
const SHORE_BIOMES = new Set(['beach', 'stonyShore', 'mangroveSwamp', 'swamp']);

// Water depth at a point (0 on land)
function getWaterDepthAt(x, z) {
    const h = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    return Math.max(0, getWaterLevelAt(x, z) - h);
}

function isWater(x, z, terrainHeight) {
    if (terrainHeight < getWaterLevelAt(x, z)) return { isWater: true, type: 'lake' };
    return { isWater: false, type: null };
}

function getWaterColor() {
    return WATER_CONFIG.deepColor;
}

// ============================================================================
// Water surface rendering
// ============================================================================

let waterMaterial = null;

function getWaterMaterial() {
    if (waterMaterial) return waterMaterial;

    waterMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        specular: 0x8899aa,
        shininess: 80,
        transparent: true,
        depthWrite: false
    });

    // Depth-based color/opacity, shore foam and animated ripples
    waterMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        shader.uniforms.shallowColor = { value: new THREE.Color(WATER_CONFIG.shallowColor) };
        shader.uniforms.deepColor = { value: new THREE.Color(WATER_CONFIG.deepColor) };
        shader.uniforms.foamColor = { value: new THREE.Color(WATER_CONFIG.foamColor) };

        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
            attribute float waterDepth;
            uniform float time;
            varying float vWaterDepth;
            varying vec2 vWaterPos;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
            vWaterDepth = waterDepth;
            vWaterPos = position.xz;
            transformed.y += sin(time * 1.3 + position.x * 0.15) * cos(time * 1.1 + position.z * 0.12) * 0.12 * clamp(waterDepth, 0.0, 1.0);`);

        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
            uniform float time;
            uniform vec3 shallowColor;
            uniform vec3 deepColor;
            uniform vec3 foamColor;
            varying float vWaterDepth;
            varying vec2 vWaterPos;`)
            .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
            float depthT = smoothstep(0.0, 7.0, vWaterDepth);
            vec3 waterCol = mix(shallowColor, deepColor, depthT);
            float ripple = sin(vWaterPos.x * 0.35 + time * 1.7) * sin(vWaterPos.y * 0.31 - time * 1.3);
            float foamLine = 0.45 + 0.2 * sin(time * 1.5 + vWaterPos.x * 0.2 + vWaterPos.y * 0.17);
            float foam = (1.0 - smoothstep(0.1, foamLine, vWaterDepth)) * (0.6 + 0.4 * ripple);
            waterCol = mix(waterCol, foamColor, clamp(foam, 0.0, 1.0) * 0.8);
            waterCol *= 1.0 + ripple * 0.05;
            vec4 diffuseColor = vec4(waterCol, mix(0.6, 0.9, depthT) + foam * 0.2);`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            normal = normalize(normal + vec3(
                sin(vWaterPos.x * 0.6 + time * 2.1) * 0.06 + sin(vWaterPos.y * 1.3 - time * 1.4) * 0.03,
                0.0,
                cos(vWaterPos.y * 0.55 - time * 1.8) * 0.06 + cos(vWaterPos.x * 1.1 + time * 1.6) * 0.03));`);

        waterMaterial.userData.shader = shader;
    };
    return waterMaterial;
}

// Water surface for a chunk: one quad per underwater grid cell, in world space
function createChunkWaterMesh(cx, cz, chunkData) {
    const segments = CHUNK_CONFIG.segments;
    const size = CHUNK_CONFIG.size;
    const b = chunkData.bounds;
    const step = size / segments;
    const sea = WATER_CONFIG.seaLevel;
    const hm = chunkData.heightmap;

    const bd = chunkData.biomeData;
    const levelAt = (gx, gz) => (bd[gz][gx].waterLevel ?? sea);
    const positions = [];
    const depths = [];
    let cellLevel = sea;
    // Corners inside a river/lake keep their own level so the surface slopes
    // smoothly along the river; corners outside it follow the cell
    const pushVertex = (gx, gz) => {
        const own = levelAt(gx, gz);
        const y = Math.abs(own - cellLevel) < 3 ? own : cellLevel;
        positions.push(b.minX + gx * step, y, b.minZ + gz * step);
        depths.push(y - hm[gz][gx]);
    };

    for (let z = 0; z < segments; z++) {
        for (let x = 0; x < segments; x++) {
            // Flat quad at the highest level among the cell's wet corners
            cellLevel = -Infinity;
            for (const [gx, gz] of [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]]) {
                const level = levelAt(gx, gz);
                if (hm[gz][gx] < level && level > cellLevel) cellLevel = level;
            }
            if (cellLevel === -Infinity) continue;
            // Two triangles, counter-clockwise seen from above
            pushVertex(x, z); pushVertex(x, z + 1); pushVertex(x + 1, z);
            pushVertex(x + 1, z); pushVertex(x, z + 1); pushVertex(x + 1, z + 1);
        }
    }
    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('waterDepth', new THREE.Float32BufferAttribute(depths, 1));
    const normals = new Float32Array(positions.length);
    for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, getWaterMaterial());
    mesh.name = `water_${cx},${cz}`;
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    return mesh;
}

// Old name kept for callers
function createChunkWaterPlane(cx, cz, chunkSize, chunkData) {
    return chunkData ? createChunkWaterMesh(cx, cz, chunkData) : null;
}

// Rebuild water for loaded chunks touching a world-space box (after terraforming)
function updateWaterInBounds(minX, maxX, minZ, maxZ) {
    if (typeof loadedChunks === 'undefined') return;
    const size = CHUNK_CONFIG.size;
    loadedChunks.forEach(chunk => {
        const b = chunk.data.bounds;
        if (b.maxX < minX || b.minX > maxX || b.maxZ < minZ || b.minZ > maxZ) return;
        if (chunk.waterMesh) {
            scene.remove(chunk.waterMesh);
            chunk.waterMesh.geometry.dispose();
            chunk.waterMesh = null;
        }
        const mesh = createChunkWaterMesh(chunk.cx, chunk.cz, chunk.data);
        if (mesh) {
            scene.add(mesh);
            chunk.waterMesh = mesh;
        }
        chunk.data.hasWater = !!mesh;
    });
}

// Animate water
const WaterSystem = {
    init() {},
    update(delta) {
        if (waterMaterial && waterMaterial.userData.shader) {
            waterMaterial.userData.shader.uniforms.time.value += delta;
        }
    }
};
if (typeof Systems !== 'undefined') {
    Systems.register('water', WaterSystem);
}

function getWaterConfig() {
    return WATER_CONFIG;
}

function setWaterConfig(config) {
    Object.assign(WATER_CONFIG, config);
}

// Make available globally
window.initWaterSystem = initWaterSystem;
window.isWater = isWater;
window.isLake = isLake;
window.isRiver = isRiver;
window.getRiverInfluence = getRiverInfluence;
window.getRiverCarve = getRiverCarve;
window.applyWaterBodies = applyWaterBodies;
window.applyRiverCarving = applyRiverCarving;
window.getWaterColor = getWaterColor;
window.getWaterSurfaceAt = getWaterSurfaceAt;
window.getWaterDepthAt = getWaterDepthAt;
window.isShoreHeight = isShoreHeight;
window.getWaterLevelAt = getWaterLevelAt;
window.getShoreClass = getShoreClass;
window.SHORE_BIOMES = SHORE_BIOMES;
window.createChunkWaterMesh = createChunkWaterMesh;
window.createChunkWaterPlane = createChunkWaterPlane;
window.updateWaterInBounds = updateWaterInBounds;
window.getWaterConfig = getWaterConfig;
window.setWaterConfig = setWaterConfig;
