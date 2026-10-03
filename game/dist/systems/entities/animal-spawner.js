// Animal Spawner - Minecraft (Java Edition) passive mob spawning
//
// Scale: the player is 4.5 units tall (1.8 blocks), so 1 block = 2.5 units and
// a Minecraft chunk (16 blocks) is 40 units.
//
// 1. World-generation spawning (where most animals come from): for every
//    Minecraft-sized chunk, loop "while random < biome creature probability"
//    (0.1, 0.07 snowy plains/ice spikes, 0.03 badlands), each time spawning a
//    pack: one weighted entry from the biome's list, a random center in the
//    chunk, members spread +-5 blocks (triangular). Packs are seeded per chunk,
//    so every player gets the same animals in the same places.
// 2. Periodic spawning: one cycle every 20 s, at most 3 pack attempts, only
//    while fewer than 10 animals are within 128 blocks, never within 24 blocks
//    of the player.
// 3. No despawning: passive animals persist. Packs are created when the player
//    comes within entity range and remember where they were when the player
//    leaves; they go away only when their terrain chunk unloads.
//
// Deer, cows, bunnies and birds are owned by the server (shared between
// players): world-gen packs are sent with a pack id so the server creates each
// pack once. The other species are simulated locally.

const BLOCK = 2.5;

const SPAWN_CONFIG = {
    mcChunk: 16 * BLOCK,            // 40 units
    packSpread: 5 * BLOCK,          // +-5 blocks
    periodicInterval: 20,           // seconds (400 ticks)
    periodicPacks: 3,
    mobCap: 10,
    mobCapRadius: 128 * BLOCK,      // 320 units
    minPlayerDistance: 24 * BLOCK,  // 60 units
    entityRange: 300,               // Create local packs within this distance...
    entityForget: 360,              // ...and put them away beyond this
    serverRequestRange: 400,        // Hand server-owned packs to the server within this distance
    updateInterval: 1
};

// Minecraft creature spawn lists translated to our species:
//   sheep/pig/cow/mooshroom -> cows, chicken/parrot -> birds,
//   horse/donkey/llama/goat/wolf/fox/camel -> deer, rabbit -> bunnies,
//   turtle -> crabs, polar bear -> penguins, armadillo -> salamanders,
//   frog -> frogs, panda -> pandas. Wild horses follow Minecraft's horse
//   entries (plains 5, savanna 1-2, meadow donkeys) alongside the deer.
// Butterflies stand in for bees, which Minecraft spawns from nests on trees in
// plains, meadows, flower forests and cherry groves rather than from these lists.
// Entries: [species, weight, minGroup, maxGroup]
const STANDARD = [['cows', 30, 4, 4], ['birds', 10, 4, 4]]; // sheep 12 + pig 10 + cow 8, chicken 10
const MC_SPAWNS = {
    plains:         { p: 0.1,  list: [...STANDARD, ['deer', 6, 2, 6], ['horses', 5, 2, 6], ['butterflies', 2, 2, 4]] },
    grassland:      { p: 0.1,  list: [...STANDARD, ['deer', 6, 2, 6], ['horses', 5, 2, 6], ['butterflies', 2, 2, 4]] },
    coldPlains:     { p: 0.1,  list: [...STANDARD, ['deer', 6, 2, 6], ['horses', 5, 2, 6]] },
    meadow:         { p: 0.1,  list: [['bunnies', 2, 2, 6], ['cows', 2, 4, 4], ['deer', 1, 1, 2], ['horses', 1, 1, 2], ['butterflies', 2, 2, 4]] },
    cherryGrove:    { p: 0.1,  list: [['cows', 3, 1, 4], ['bunnies', 2, 2, 6], ['butterflies', 4, 2, 4]] },
    forest:         { p: 0.1,  list: [...STANDARD, ['deer', 5, 4, 4], ['butterflies', 1, 2, 4]] },
    warmForest:     { p: 0.1,  list: [...STANDARD, ['deer', 5, 4, 4], ['butterflies', 1, 2, 4]] },
    coldForest:     { p: 0.1,  list: [...STANDARD, ['deer', 16, 2, 4], ['bunnies', 4, 2, 3]] },
    taiga:          { p: 0.1,  list: [...STANDARD, ['deer', 16, 2, 4], ['bunnies', 4, 2, 3]] },
    tundra:         { p: 0.07, list: [['bunnies', 10, 2, 3], ['penguins', 1, 1, 2]] },
    iceSpikes:      { p: 0.07, list: [['bunnies', 10, 2, 3], ['penguins', 1, 1, 2]] },
    snowySlopes:    { p: 0.1,  list: [['bunnies', 4, 2, 3], ['deer', 5, 1, 3]] },
    snowyPeaks:     { p: 0.1,  list: [['deer', 5, 1, 3]] },
    mountains:      { p: 0.1,  list: [...STANDARD, ['deer', 5, 4, 6]] },
    highlands:      { p: 0.1,  list: [...STANDARD, ['deer', 5, 4, 6]] },
    savanna:        { p: 0.1,  list: [...STANDARD, ['deer', 2, 2, 6], ['horses', 2, 2, 6], ['salamanders', 10, 2, 3]] },
    desert:         { p: 0.1,  list: [['bunnies', 12, 2, 3], ['deer', 1, 1, 1]] },
    badlands:       { p: 0.03, list: [['salamanders', 6, 1, 2]] },
    jungle:         { p: 0.1,  list: [['birds', 60, 1, 4], ['cows', 30, 4, 4], ['pandas', 1, 1, 2]] },
    bambooJungle:   { p: 0.1,  list: [['pandas', 80, 1, 2], ['birds', 60, 1, 4], ['cows', 30, 4, 4]] },
    swamp:          { p: 0.1,  list: [...STANDARD, ['frogs', 10, 2, 5]] },
    mangroveSwamp:  { p: 0.1,  list: [['frogs', 10, 2, 5]] },
    mushroomFields: { p: 0.1,  list: [['cows', 8, 4, 8]] },
    beach:          { p: 0.1,  list: [['crabs', 1, 2, 5]] },
    stonyShore:     { p: 0.1,  list: [] },
    volcanicPeaks:  { p: 0.05, list: [['salamanders', 1, 1, 3]] } // not in Minecraft
};

const SPECIES = {
    deer:        { list: () => typeof deerList !== 'undefined' ? deerList : null, create: () => typeof createDeer === 'function' ? createDeer : null },
    horses:      { list: () => typeof horseList !== 'undefined' ? horseList : null, create: () => typeof createHorse === 'function' ? createHorse : null },
    cows:        { list: () => typeof cowList !== 'undefined' ? cowList : null, create: () => typeof createCow === 'function' ? createCow : null },
    bunnies:     { list: () => typeof bunnyList !== 'undefined' ? bunnyList : null, create: () => typeof createBunny === 'function' ? createBunny : null },
    birds:       { list: () => typeof birdList !== 'undefined' ? birdList : null, create: () => typeof createBird === 'function' ? createBird : null },
    frogs:       { list: () => typeof frogList !== 'undefined' ? frogList : null, create: () => typeof createFrog === 'function' ? createFrog : null },
    penguins:    { list: () => typeof penguinList !== 'undefined' ? penguinList : null, create: () => typeof createPenguin === 'function' ? createPenguin : null },
    pandas:      { list: () => typeof pandaList !== 'undefined' ? pandaList : null, create: () => typeof createPanda === 'function' ? createPanda : null },
    crabs:       { list: () => typeof crabList !== 'undefined' ? crabList : null, create: () => typeof createCrab === 'function' ? createCrab : null },
    butterflies: { list: () => typeof butterflyList !== 'undefined' ? butterflyList : null, create: () => typeof createButterfly === 'function' ? createButterfly : null },
    salamanders: { list: () => typeof salamanderList !== 'undefined' ? salamanderList : null, create: () => typeof createSalamander === 'function' ? createSalamander : null }
};

const SERVER_SPECIES = new Set(['deer', 'cows', 'bunnies', 'birds']);

// Builds made before horses existed don't list horse.js in their script list:
// load it here if it isn't already loaded
if (typeof createHorse === 'undefined' && typeof document !== 'undefined') {
    const horseScript = document.createElement('script');
    horseScript.src = './systems/entities/horse.js';
    document.body.appendChild(horseScript);
}

const chunkAnimals = new Map(); // terrain chunk key -> { packs: [pack] }
let periodicTimer = 0;
let updateTimer = 0;
let periodicPackCounter = 0;

function getPlayerPos() {
    if (typeof character !== 'undefined' && character) return character.position;
    if (typeof GAME !== 'undefined' && GAME.character) return GAME.character.position;
    return null;
}

function makeAnimalRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function animalChunkSeed(cx, cz) {
    let h = 2166136261;
    for (const n of [cx, cz, 0xa41]) {
        h = Math.imul(h ^ (n & 0xffff), 16777619);
        h = Math.imul(h ^ (n >>> 16), 16777619);
    }
    return h >>> 0;
}

function pickSpawnEntry(list, r) {
    let total = 0;
    for (const e of list) total += e[1];
    let roll = r() * total;
    for (const e of list) {
        roll -= e[1];
        if (roll <= 0) return e;
    }
    return list[0];
}

// Can an animal stand here: dry, not a cliff
function isSpawnableGround(x, z) {
    if (typeof getTerrainHeightAt !== 'function') return true;
    const h = getTerrainHeightAt(x, z);
    const level = typeof getWaterLevelAt === 'function' ? getWaterLevelAt(x, z) : -5;
    if (h < level + 0.5) return false;
    const dx = getTerrainHeightAt(x + 2, z) - getTerrainHeightAt(x - 2, z);
    const dz = getTerrainHeightAt(x, z + 2) - getTerrainHeightAt(x, z - 2);
    return Math.sqrt(dx * dx + dz * dz) / 4 < 1.2;
}

// Build one pack around a center: group size from the entry, members spread
// +-5 blocks with a triangular distribution, each on spawnable ground
function buildPack(entry, cx, cz, r) {
    const size = entry[2] + Math.floor(r() * (entry[3] - entry[2] + 1));
    const members = [];
    for (let i = 0; i < size; i++) {
        const x = cx + (r() - r()) * SPAWN_CONFIG.packSpread;
        const z = cz + (r() - r()) * SPAWN_CONFIG.packSpread;
        if (isSpawnableGround(x, z)) members.push({ x, z });
    }
    return members;
}

// 1. World-generation spawning for a newly loaded terrain chunk
function addChunkAnimals(cx, cz, chunkData) {
    if (!Number.isFinite(cx) || !Number.isFinite(cz)) return;
    const key = `${cx},${cz}`;
    if (chunkAnimals.has(key)) return;

    const r = makeAnimalRng(animalChunkSeed(cx, cz));
    const size = CHUNK_CONFIG.size, segments = CHUNK_CONFIG.segments, step = size / segments;
    const b = chunkData.bounds;
    const cells = Math.round(size / SPAWN_CONFIG.mcChunk);
    const cell = size / cells;
    const packs = [];

    for (let gz = 0; gz < cells; gz++) {
        for (let gx = 0; gx < cells; gx++) {
            const midX = b.minX + (gx + 0.5) * cell, midZ = b.minZ + (gz + 0.5) * cell;
            const data = chunkData.biomeData[Math.round((midZ - b.minZ) / step)][Math.round((midX - b.minX) / step)];
            const table = data && data.biome ? MC_SPAWNS[data.biome.id] : null;
            if (!table || table.list.length === 0) continue;

            let n = 0;
            while (r() < table.p && n++ < 8) {
                const entry = pickSpawnEntry(table.list, r);
                const pcx = b.minX + (gx + r()) * cell, pcz = b.minZ + (gz + r()) * cell;
                const members = buildPack(entry, pcx, pcz, r);
                if (members.length === 0) continue;
                packs.push({
                    id: `p${cx}_${cz}_${packs.length}`,
                    species: entry[0],
                    x: pcx, z: pcz,
                    members,
                    entities: null,
                    requested: false
                });
            }
        }
    }
    chunkAnimals.set(key, { packs });
}

function removePackEntities(pack) {
    if (!pack.entities) return;
    const list = SPECIES[pack.species].list();
    // Remember where they wandered to
    pack.members = pack.entities.filter(e => e && e.group).map(e => ({ x: e.group.position.x, z: e.group.position.z }));
    for (const e of pack.entities) {
        if (!e || !e.group) continue;
        if (typeof scene !== 'undefined') scene.remove(e.group);
        e.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        if (list) {
            const i = list.indexOf(e);
            if (i > -1) list.splice(i, 1);
        }
    }
    pack.entities = null;
}

function createPackEntities(pack) {
    const list = SPECIES[pack.species].list();
    const create = SPECIES[pack.species].create();
    if (!list || !create) return;
    pack.entities = pack.members.map((m, i) => {
        const entity = create(`spawned_${pack.id}_${i}`, m.x, m.z);
        list.push(entity);
        return entity;
    });
}

// Terrain chunk unloaded: its animals go with it
function removeChunkAnimals(key) {
    const chunk = chunkAnimals.get(key);
    if (!chunk) return;
    chunk.packs.forEach(removePackEntities);
    chunkAnimals.delete(key);
}

function isServerOwned(species) {
    return SERVER_SPECIES.has(species) && typeof isMultiplayerConnected === 'function' && isMultiplayerConnected();
}

// Create/put away packs as the player moves; hand server-owned packs to the server
function updatePacks(player) {
    chunkAnimals.forEach(chunk => {
        for (const pack of chunk.packs) {
            const d = Math.hypot(pack.x - player.x, pack.z - player.z);
            if (isServerOwned(pack.species)) {
                if (!pack.requested && d < SPAWN_CONFIG.serverRequestRange) {
                    pack.requested = sendAnimalSpawnRequest(pack.species, pack.members, pack.id);
                }
                continue;
            }
            if (!pack.entities && d < SPAWN_CONFIG.entityRange) createPackEntities(pack);
            else if (pack.entities && d > SPAWN_CONFIG.entityForget) removePackEntities(pack);
        }
    });
}

// Animals within the mob-cap range of the player (all species, local and server)
function countNearbyAnimals(player) {
    let n = 0;
    const r2 = SPAWN_CONFIG.mobCapRadius * SPAWN_CONFIG.mobCapRadius;
    for (const s of Object.values(SPECIES)) {
        const list = s.list();
        if (!list) continue;
        for (const e of list) {
            if (!e || !e.group) continue;
            const dx = e.group.position.x - player.x, dz = e.group.position.z - player.z;
            if (dx * dx + dz * dz <= r2) n++;
        }
    }
    return n;
}

// 2. Periodic spawning: up to 3 packs while under the mob cap
function periodicSpawn(player) {
    if (countNearbyAnimals(player) >= SPAWN_CONFIG.mobCap) return;

    for (let attempt = 0; attempt < SPAWN_CONFIG.periodicPacks; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = SPAWN_CONFIG.minPlayerDistance + Math.random() * (SPAWN_CONFIG.mobCapRadius - SPAWN_CONFIG.minPlayerDistance);
        const x = player.x + Math.cos(angle) * dist, z = player.z + Math.sin(angle) * dist;
        const biome = typeof getChunkBiomeAt === 'function' ? getChunkBiomeAt(x, z) : null;
        const table = biome ? MC_SPAWNS[biome.id] : null;
        if (!table || table.list.length === 0 || !isSpawnableGround(x, z)) continue;

        const entry = pickSpawnEntry(table.list, Math.random);
        const members = buildPack(entry, x, z, Math.random)
            .filter(m => Math.hypot(m.x - player.x, m.z - player.z) >= SPAWN_CONFIG.minPlayerDistance);
        if (members.length === 0) continue;

        const pack = { id: `q${Date.now()}_${periodicPackCounter++}`, species: entry[0], x, z, members, entities: null, requested: false };
        if (isServerOwned(pack.species)) {
            pack.requested = sendAnimalSpawnRequest(pack.species, members);
            continue;
        }
        // Local periodic spawns persist with the terrain chunk they spawned in
        const tc = typeof worldToChunk === 'function' ? worldToChunk(x, z) : null;
        const chunk = tc ? chunkAnimals.get(`${tc.x},${tc.z}`) : null;
        if (!chunk) continue;
        chunk.packs.push(pack);
        createPackEntities(pack);
    }
}

function updateAnimalSpawner(delta) {
    const player = getPlayerPos();
    if (!player || !Number.isFinite(player.x)) return;

    updateTimer += delta;
    if (updateTimer >= SPAWN_CONFIG.updateInterval) {
        updateTimer = 0;
        updatePacks(player);
    }

    periodicTimer += delta;
    if (periodicTimer >= SPAWN_CONFIG.periodicInterval) {
        periodicTimer = 0;
        periodicSpawn(player);
    }
}

// Plant packs for chunks that loaded before the spawner started
function initAnimalSpawner() {
    if (typeof loadedChunks !== 'undefined') {
        loadedChunks.forEach(chunk => addChunkAnimals(chunk.cx, chunk.cz, chunk.data));
    }
    if (typeof gameLog === 'function') gameLog('Animal spawner initialized');
}

// Register with Systems if available
if (typeof Systems !== 'undefined') {
    Systems.register('animalSpawner', {
        init: initAnimalSpawner,
        update: updateAnimalSpawner
    });
}

// Make available globally
window.initAnimalSpawner = initAnimalSpawner;
window.updateAnimalSpawner = updateAnimalSpawner;
window.addChunkAnimals = addChunkAnimals;
window.removeChunkAnimals = removeChunkAnimals;
window.SPAWN_CONFIG = SPAWN_CONFIG;
window.MC_SPAWNS = MC_SPAWNS;
