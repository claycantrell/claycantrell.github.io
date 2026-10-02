// Animal Spawner System - Minecraft-style chunk-based spawning
// Animals spawn 60-150 units from player, despawn beyond 180 units

const SPAWN_CONFIG = {
    minDistance: 60,        // Don't spawn closer than this (outside player view)
    maxDistance: 150,       // Don't spawn farther than this
    despawnDistance: 180,   // Instant despawn beyond this
    gradualDespawnDist: 120, // Start random despawn chance here
    spawnCheckInterval: 2,  // Seconds between spawn attempts
    despawnCheckInterval: 1, // Seconds between despawn checks

    // Mob caps (max alive at once)
    caps: {
        deer: 12,
        cows: 10,
        bunnies: 15,
        birds: 20,
        frogs: 10,
        penguins: 8,
        pandas: 6,
        crabs: 12,
        butterflies: 15,
        salamanders: 8
    },

    // Spawn chances per check (0-1)
    spawnChance: {
        deer: 0.15,
        cows: 0.12,
        bunnies: 0.25,
        birds: 0.20,
        frogs: 0.18,
        penguins: 0.12,
        pandas: 0.10,
        crabs: 0.15,
        butterflies: 0.20,
        salamanders: 0.12
    },

    // Group spawn sizes
    groupSize: {
        deer: { min: 2, max: 4 },
        cows: { min: 2, max: 5 },
        bunnies: { min: 1, max: 3 },
        birds: { min: 3, max: 6 },
        frogs: { min: 2, max: 4 },
        penguins: { min: 3, max: 6 },
        pandas: { min: 1, max: 2 },
        crabs: { min: 2, max: 5 },
        butterflies: { min: 3, max: 7 },
        salamanders: { min: 1, max: 3 }
    }
};

let spawnTimer = 0;
let despawnTimer = 0;

// Get player position
function getPlayerPos() {
    // Try window.character first (getter from core.js)
    if (typeof character !== 'undefined' && character) {
        return character.position;
    }
    // Fallback to GAME.character
    if (typeof GAME !== 'undefined' && GAME.character) {
        return GAME.character.position;
    }
    return null;
}

// Get distance from player
function distanceFromPlayer(x, z) {
    const player = getPlayerPos();
    if (!player) return Infinity;
    const dx = x - player.x;
    const dz = z - player.z;
    return Math.sqrt(dx * dx + dz * dz);
}

// Pick random spawn position in valid range (60-150 units from player's current position)
function getSpawnPosition() {
    const player = getPlayerPos();
    if (!player) return null;

    const minDist = SPAWN_CONFIG.minDistance;
    const maxDist = SPAWN_CONFIG.maxDistance;

    // Random angle
    const angle = Math.random() * Math.PI * 2;
    // Random distance in valid range
    const dist = minDist + Math.random() * (maxDist - minDist);

    const x = player.x + Math.cos(angle) * dist;
    const z = player.z + Math.sin(angle) * dist;
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;

    return { x, y, z };
}

// Animals that only live at the water's edge
const SHORE_ANIMALS = new Set(['frogs', 'crabs']);

// How likely this animal is here (0 = never): the biome's own rate, adjusted
// for habitat - frogs and crabs need water nearby, and frogs live by any
// temperate or tropical lake or river even outside wetland biomes
function getHabitatRate(animalType, x, z, groundY) {
    if (typeof getChunkBiomeAt !== 'function') return 1;
    const biome = getChunkBiomeAt(x, z);
    if (!biome) return 1;

    let rate = (biome.entities && biome.entities[animalType]) || 0;
    if (SHORE_ANIMALS.has(animalType) && typeof isShoreHeight === 'function') {
        if (!isShoreHeight(groundY, 4)) return 0;
        if (animalType === 'frogs') {
            const climate = typeof getClimateAt === 'function' ? getClimateAt(x, z) : null;
            const shore = getShoreClass(climate, groundY);
            if (shore === 'temperate' || shore === 'tropical') rate = Math.max(rate, 1.2);
        }
    }
    return rate;
}

// Check if spawn position is valid for given animal type
function isValidSpawnPosition(x, z, animalType, groundY) {
    return getHabitatRate(animalType, x, z, groundY) > 0;
}

// Spawn animals of a type
function trySpawnAnimals(type) {
    const cap = SPAWN_CONFIG.caps[type];
    const chance = SPAWN_CONFIG.spawnChance[type];
    const groupSize = SPAWN_CONFIG.groupSize[type];

    // Get current count
    let currentCount = 0;
    let list, createFn;

    switch (type) {
        case 'deer':
            list = typeof deerList !== 'undefined' ? deerList : [];
            createFn = typeof createDeer === 'function' ? createDeer : null;
            currentCount = list.length;
            break;
        case 'cows':
            list = typeof cowList !== 'undefined' ? cowList : [];
            createFn = typeof createCow === 'function' ? createCow : null;
            currentCount = list.length;
            break;
        case 'bunnies':
            list = typeof bunnyList !== 'undefined' ? bunnyList : [];
            createFn = typeof createBunny === 'function' ? createBunny : null;
            currentCount = list.length;
            break;
        case 'birds':
            list = typeof birdList !== 'undefined' ? birdList : [];
            createFn = typeof createBird === 'function' ? createBird : null;
            currentCount = list.length;
            break;
        case 'frogs':
            list = typeof frogList !== 'undefined' ? frogList : [];
            createFn = typeof createFrog === 'function' ? createFrog : null;
            currentCount = list.length;
            break;
        case 'penguins':
            list = typeof penguinList !== 'undefined' ? penguinList : [];
            createFn = typeof createPenguin === 'function' ? createPenguin : null;
            currentCount = list.length;
            break;
        case 'pandas':
            list = typeof pandaList !== 'undefined' ? pandaList : [];
            createFn = typeof createPanda === 'function' ? createPanda : null;
            currentCount = list.length;
            break;
        case 'crabs':
            list = typeof crabList !== 'undefined' ? crabList : [];
            createFn = typeof createCrab === 'function' ? createCrab : null;
            currentCount = list.length;
            break;
        case 'butterflies':
            list = typeof butterflyList !== 'undefined' ? butterflyList : [];
            createFn = typeof createButterfly === 'function' ? createButterfly : null;
            currentCount = list.length;
            break;
        case 'salamanders':
            list = typeof salamanderList !== 'undefined' ? salamanderList : [];
            createFn = typeof createSalamander === 'function' ? createSalamander : null;
            currentCount = list.length;
            break;
    }

    // Only count animals near the player - far-away server animals must not
    // fill the cap and block spawning wherever the player is
    currentCount = list.filter(e => e && e.group &&
        distanceFromPlayer(e.group.position.x, e.group.position.z) <= SPAWN_CONFIG.despawnDistance).length;

    // Check cap
    if (currentCount >= cap) return;

    // Get spawn position
    const pos = getSpawnPosition();
    if (!pos) return;
    if (!isValidSpawnPosition(pos.x, pos.z, type, pos.y)) return;
    // No spawning in lakes, rivers or the sea
    if (typeof getWaterConfig === 'function' && pos.y < getWaterConfig().seaLevel + 0.5) return;

    // Adjust spawn chance by habitat (e.g., 2.0 doubles the chance)
    const adjustedChance = chance * getHabitatRate(type, pos.x, pos.z, pos.y);

    // Random chance to spawn (with biome-adjusted rate)
    if (Math.random() > Math.min(adjustedChance, 1.0)) return;

    // Spawn a group
    const count = groupSize.min + Math.floor(Math.random() * (groupSize.max - groupSize.min + 1));
    const spawnCount = Math.min(count, cap - currentCount);

    const positions = [];
    for (let i = 0; i < spawnCount; i++) {
        // Offset slightly for group
        positions.push({
            x: pos.x + (Math.random() - 0.5) * 10,
            z: pos.z + (Math.random() - 0.5) * 10
        });
    }

    // In multiplayer the server owns these animals so every player sees the same ones
    if (typeof sendAnimalSpawnRequest === 'function' && sendAnimalSpawnRequest(type, positions)) return;

    positions.forEach((p, i) => {
        const id = `spawned_${type}_${Date.now()}_${i}`;
        if (createFn) {
            const entity = createFn(id, p.x, p.z);
            list.push(entity);
        }
    });
}

// Despawn animals too far from player
function despawnFarAnimals(type) {
    let list;

    switch (type) {
        case 'deer':
            list = typeof deerList !== 'undefined' ? deerList : [];
            break;
        case 'cows':
            list = typeof cowList !== 'undefined' ? cowList : [];
            break;
        case 'bunnies':
            list = typeof bunnyList !== 'undefined' ? bunnyList : [];
            break;
        case 'birds':
            list = typeof birdList !== 'undefined' ? birdList : [];
            break;
        case 'frogs':
            list = typeof frogList !== 'undefined' ? frogList : [];
            break;
        case 'penguins':
            list = typeof penguinList !== 'undefined' ? penguinList : [];
            break;
        case 'pandas':
            list = typeof pandaList !== 'undefined' ? pandaList : [];
            break;
        case 'crabs':
            list = typeof crabList !== 'undefined' ? crabList : [];
            break;
        case 'butterflies':
            list = typeof butterflyList !== 'undefined' ? butterflyList : [];
            break;
        case 'salamanders':
            list = typeof salamanderList !== 'undefined' ? salamanderList : [];
            break;
    }

    // Check each entity
    for (let i = list.length - 1; i >= 0; i--) {
        const entity = list[i];
        if (!entity || !entity.group) continue;

        // Skip server-controlled entities
        if (!entity.id.startsWith('local_') && !entity.id.startsWith('spawned_')) continue;

        const dist = distanceFromPlayer(entity.group.position.x, entity.group.position.z);

        // Instant despawn if too far
        if (dist > SPAWN_CONFIG.despawnDistance) {
            removeAnimal(entity, list, i);
            continue;
        }

        // Gradual despawn chance if moderately far
        if (dist > SPAWN_CONFIG.gradualDespawnDist) {
            // 1/400 chance per check (~1/800 per tick like Minecraft)
            if (Math.random() < 0.0025) {
                removeAnimal(entity, list, i);
            }
        }
    }
}

// Remove an animal from scene and list
function removeAnimal(entity, list, index) {
    if (entity.group && typeof scene !== 'undefined') {
        scene.remove(entity.group);
        // Dispose geometry/materials
        entity.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
    list.splice(index, 1);
}

// Main update function - called from game loop
function updateAnimalSpawner(delta) {
    // Spawn check
    spawnTimer += delta;
    if (spawnTimer >= SPAWN_CONFIG.spawnCheckInterval) {
        spawnTimer = 0;
        trySpawnAnimals('deer');
        trySpawnAnimals('cows');
        trySpawnAnimals('bunnies');
        trySpawnAnimals('birds');
        trySpawnAnimals('frogs');
        trySpawnAnimals('penguins');
        trySpawnAnimals('pandas');
        trySpawnAnimals('crabs');
        trySpawnAnimals('butterflies');
        trySpawnAnimals('salamanders');
    }

    // Despawn check
    despawnTimer += delta;
    if (despawnTimer >= SPAWN_CONFIG.despawnCheckInterval) {
        despawnTimer = 0;
        despawnFarAnimals('deer');
        despawnFarAnimals('cows');
        despawnFarAnimals('bunnies');
        despawnFarAnimals('birds');
        despawnFarAnimals('frogs');
        despawnFarAnimals('penguins');
        despawnFarAnimals('pandas');
        despawnFarAnimals('crabs');
        despawnFarAnimals('butterflies');
        despawnFarAnimals('salamanders');
    }
}

// Initialize spawner (clears old animals, starts fresh)
function initAnimalSpawner() {
    // Clear existing local/spawned animals
    const lists = [
        typeof deerList !== 'undefined' ? deerList : [],
        typeof cowList !== 'undefined' ? cowList : [],
        typeof bunnyList !== 'undefined' ? bunnyList : [],
        typeof birdList !== 'undefined' ? birdList : [],
        typeof frogList !== 'undefined' ? frogList : [],
        typeof penguinList !== 'undefined' ? penguinList : [],
        typeof pandaList !== 'undefined' ? pandaList : [],
        typeof crabList !== 'undefined' ? crabList : [],
        typeof butterflyList !== 'undefined' ? butterflyList : [],
        typeof salamanderList !== 'undefined' ? salamanderList : []
    ];

    lists.forEach(list => {
        for (let i = list.length - 1; i >= 0; i--) {
            const entity = list[i];
            if (entity.id.startsWith('local_') || entity.id.startsWith('spawned_')) {
                removeAnimal(entity, list, i);
            }
        }
    });

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
window.SPAWN_CONFIG = SPAWN_CONFIG;
