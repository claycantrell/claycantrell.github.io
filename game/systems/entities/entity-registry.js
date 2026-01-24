// Entity Registry - Central registration for all entity types
// Makes it easy to add new entities without modifying core game code

// Registry of all entity types
const entityRegistry = {};

// Register an entity type
// @param type - unique identifier (e.g., 'deer', 'bunny', 'npc')
// @param config - object with init and update functions
function registerEntity(type, config) {
    if (entityRegistry[type]) {
        console.warn(`Entity type '${type}' is already registered, overwriting`);
    }

    entityRegistry[type] = {
        init: config.init || (() => {}),
        update: config.update || (() => {}),
        getCount: config.getCount || (() => 0),
        enabled: config.enabled !== false
    };

    if (typeof gameLog === 'function') gameLog(`Registered entity type: ${type}`);
}

// Initialize all registered entities
function initAllEntities() {
    for (const type in entityRegistry) {
        const entity = entityRegistry[type];

        // Check if entity is enabled in config
        const isEnabled = typeof CONFIG !== 'undefined'
            ? CONFIG.get(`entities.${type}.enabled`, true)
            : true;
        if (!isEnabled) {
            if (typeof gameLog === 'function') gameLog(`Entity '${type}' disabled by config`);
            continue;
        }

        if (entity.enabled && typeof entity.init === 'function') {
            try {
                entity.init();
                if (typeof gameLog === 'function') gameLog(`Initialized entity: ${type}`);
            } catch (e) {
                console.error(`Failed to initialize entity '${type}':`, e);
            }
        }
    }
}

// Update all registered entities (call from game loop)
function updateAllEntities(delta) {
    for (const type in entityRegistry) {
        const entity = entityRegistry[type];

        if (entity.enabled && typeof entity.update === 'function') {
            try {
                entity.update(delta);
            } catch (e) {
                console.error(`Failed to update entity '${type}':`, e);
            }
        }
    }
}

// Get list of registered entity types
function getRegisteredEntities() {
    return Object.keys(entityRegistry);
}

// Check if an entity type is registered
function isEntityRegistered(type) {
    return type in entityRegistry;
}

// Get entity count for a specific type
function getEntityCount(type) {
    if (entityRegistry[type] && typeof entityRegistry[type].getCount === 'function') {
        return entityRegistry[type].getCount();
    }
    return 0;
}

// Self-register existing entities when this script loads
// This keeps existing code working while adding registry support

// Register NPC
if (typeof initNPC === 'function' && typeof updateNPC === 'function') {
    registerEntity('npc', {
        init: initNPC,
        update: updateNPC,
        getCount: () => (typeof npc !== 'undefined' && npc) ? 1 : 0
    });
}

// Register Deer
if (typeof initDeer === 'function' && typeof updateDeer === 'function') {
    registerEntity('deer', {
        init: initDeer,
        update: updateDeer,
        getCount: () => typeof deerList !== 'undefined' ? deerList.length : 0
    });
}

// Register Bunnies
if (typeof initBunnies === 'function' && typeof updateBunnies === 'function') {
    registerEntity('bunnies', {
        init: initBunnies,
        update: updateBunnies,
        getCount: () => typeof bunnyList !== 'undefined' ? bunnyList.length : 0
    });
}

// Register Birds
if (typeof initBirds === 'function' && typeof updateBirds === 'function') {
    registerEntity('birds', {
        init: initBirds,
        update: updateBirds,
        getCount: () => typeof birdList !== 'undefined' ? birdList.length : 0
    });
}

// Register Frogs
if (typeof initFrogs === 'function' && typeof updateFrogs === 'function') {
    registerEntity('frogs', {
        init: initFrogs,
        update: updateFrogs,
        getCount: () => typeof frogList !== 'undefined' ? frogList.length : 0
    });
}

// Register Penguins
if (typeof initPenguins === 'function' && typeof updatePenguins === 'function') {
    registerEntity('penguins', {
        init: initPenguins,
        update: updatePenguins,
        getCount: () => typeof penguinList !== 'undefined' ? penguinList.length : 0
    });
}

// Register Pandas
if (typeof initPandas === 'function' && typeof updatePandas === 'function') {
    registerEntity('pandas', {
        init: initPandas,
        update: updatePandas,
        getCount: () => typeof pandaList !== 'undefined' ? pandaList.length : 0
    });
}

// Register Crabs
if (typeof initCrabs === 'function' && typeof updateCrabs === 'function') {
    registerEntity('crabs', {
        init: initCrabs,
        update: updateCrabs,
        getCount: () => typeof crabList !== 'undefined' ? crabList.length : 0
    });
}

// Register Butterflies
if (typeof initButterflies === 'function' && typeof updateButterflies === 'function') {
    registerEntity('butterflies', {
        init: initButterflies,
        update: updateButterflies,
        getCount: () => typeof butterflyList !== 'undefined' ? butterflyList.length : 0
    });
}

// Register Salamanders
if (typeof initSalamanders === 'function' && typeof updateSalamanders === 'function') {
    registerEntity('salamanders', {
        init: initSalamanders,
        update: updateSalamanders,
        getCount: () => typeof salamanderList !== 'undefined' ? salamanderList.length : 0
    });
}

if (typeof gameLog === 'function') gameLog('Entity registry loaded, registered types:', getRegisteredEntities());

// Make available globally (if not already)
if (typeof window.entityRegistry === "undefined") {
    window.entityRegistry = entityRegistry;
}
