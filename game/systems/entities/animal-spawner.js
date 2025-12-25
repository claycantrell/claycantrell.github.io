// Animal Spawner System - Minecraft-style chunk-based spawning
// Animals spawn 24-128 blocks from player, despawn beyond 128 blocks

const SPAWN_CONFIG = {
    minDistance: 24,        // Don't spawn closer than this
    maxDistance: 128,       // Don't spawn farther than this
    despawnDistance: 128,   // Instant despawn beyond this
    gradualDespawnDist: 64, // Start random despawn chance here
    spawnCheckInterval: 2,  // Seconds between spawn attempts
    despawnCheckInterval: 1, // Seconds between despawn checks

    // Mob caps (max alive at once)
    caps: {
        deer: 12,
        bunnies: 15,
        birds: 20
    },

    // Spawn chances per check (0-1)
    spawnChance: {
        deer: 0.15,
        bunnies: 0.25,
        birds: 0.20
    },

    // Group spawn sizes
    groupSize: {
        deer: { min: 2, max: 4 },
        bunnies: { min: 1, max: 3 },
        birds: { min: 3, max: 6 }
    }
};

let spawnTimer = 0;
let despawnTimer = 0;

// Get player position
function getPlayerPos() {
    if (typeof character !== 'undefined' && character) {
        return character.position;
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

// Pick random spawn position in valid range (24-128 blocks from player)
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

// Check if spawn position is valid (not in water, etc.)
function isValidSpawnPosition(x, z) {
    // Check if in water
    if (typeof getChunkBiomeAt === 'function') {
        const biome = getChunkBiomeAt(x, z);
        if (biome && biome.id === 'ocean') return false;
    }
    return true;
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
    }

    // Check cap
    if (currentCount >= cap) return;

    // Random chance to spawn
    if (Math.random() > chance) return;

    // Get spawn position
    const pos = getSpawnPosition();
    if (!pos) return;
    if (!isValidSpawnPosition(pos.x, pos.z)) return;

    // Spawn a group
    const count = groupSize.min + Math.floor(Math.random() * (groupSize.max - groupSize.min + 1));
    const spawnCount = Math.min(count, cap - currentCount);

    for (let i = 0; i < spawnCount; i++) {
        // Offset slightly for group
        const offsetX = pos.x + (Math.random() - 0.5) * 10;
        const offsetZ = pos.z + (Math.random() - 0.5) * 10;
        const id = `spawned_${type}_${Date.now()}_${i}`;

        if (createFn) {
            const entity = createFn(id, offsetX, offsetZ);
            list.push(entity);
        }
    }
}

// Despawn animals too far from player
function despawnFarAnimals(type) {
    let list;

    switch (type) {
        case 'deer':
            list = typeof deerList !== 'undefined' ? deerList : [];
            break;
        case 'bunnies':
            list = typeof bunnyList !== 'undefined' ? bunnyList : [];
            break;
        case 'birds':
            list = typeof birdList !== 'undefined' ? birdList : [];
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
        trySpawnAnimals('bunnies');
        trySpawnAnimals('birds');
    }

    // Despawn check
    despawnTimer += delta;
    if (despawnTimer >= SPAWN_CONFIG.despawnCheckInterval) {
        despawnTimer = 0;
        despawnFarAnimals('deer');
        despawnFarAnimals('bunnies');
        despawnFarAnimals('birds');
    }
}

// Initialize spawner (clears old animals, starts fresh)
function initAnimalSpawner() {
    // Clear existing local/spawned animals
    const lists = [
        typeof deerList !== 'undefined' ? deerList : [],
        typeof bunnyList !== 'undefined' ? bunnyList : [],
        typeof birdList !== 'undefined' ? birdList : []
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
