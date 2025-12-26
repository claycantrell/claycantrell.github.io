// Entity Factory - Eliminates boilerplate in entity system files
// Provides common patterns for system registration, list management, state updates

/**
 * Create an entity system with standard boilerplate
 * @param {string} type - Entity type name (e.g., 'bunny', 'deer')
 * @param {string} pluralType - Plural form for registration (e.g., 'bunnies', 'deer')
 * @param {Function} initFn - Init function
 * @param {Function} updateFn - Update function
 * @returns {Object} System object
 */
function createEntitySystem(type, pluralType, initFn, updateFn) {
    const system = {
        init: initFn,
        update: updateFn
    };

    // Register with Systems registry if available
    if (typeof Systems !== 'undefined') {
        Systems.register(pluralType, system);
    }

    return system;
}

/**
 * Get or create entity list from GAME namespace
 * @param {string} pluralType - Plural entity type (e.g., 'bunnies', 'deer')
 * @returns {Array} Entity list
 */
function getEntityList(pluralType) {
    if (typeof GAME !== 'undefined' && GAME.world?.entities?.[pluralType]) {
        return GAME.world.entities[pluralType];
    }
    return [];
}

/**
 * Handle server state updates for entities
 * @param {Array} serverData - Server data array
 * @param {Array} entityList - Local entity list
 * @param {Function} createFn - Function to create new entity
 * @param {Function} updateFn - Function to update existing entity (optional)
 */
function handleServerStateUpdate(serverData, entityList, createFn, updateFn) {
    serverData.forEach(data => {
        let entity = entityList.find(e => e.id === data.id);

        if (!entity) {
            entity = createFn(data.id, data.x, data.z);
            entityList.push(entity);
        }

        if (updateFn) {
            updateFn(entity, data);
        }
    });
}

/**
 * Check if entity config is available
 * @param {string} type - Entity type
 * @returns {boolean} True if config exists
 */
function hasEntityConfig(type) {
    return typeof ENTITY_CONFIG !== 'undefined' && ENTITY_CONFIG[type];
}

/**
 * Get entity config with warning if missing
 * @param {string} type - Entity type
 * @returns {Object|null} Config object or null
 */
function getConfigSafe(type) {
    if (!hasEntityConfig(type)) {
        console.warn(`ENTITY_CONFIG.${type} not available`);
        return null;
    }
    return ENTITY_CONFIG[type];
}

/**
 * Check if entity is locally controlled (spawned or local)
 * @param {Object} entity - Entity with id property
 * @returns {boolean} True if locally controlled
 */
function isLocalEntity(entity) {
    return entity.id.startsWith('local_') || entity.id.startsWith('spawned_');
}

/**
 * Export entity functions to window
 * @param {string} type - Entity type (capitalized, e.g., 'Bunny')
 * @param {Object} exports - Object with functions to export
 */
function exportEntityGlobals(type, exports) {
    Object.entries(exports).forEach(([key, value]) => {
        window[key] = value;
    });
}

/**
 * Standard entity return object factory
 * @param {string} id - Entity ID
 * @param {THREE.Group} group - Entity group
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @param {Object} extras - Additional properties
 * @returns {Object} Entity object
 */
function createEntityObject(id, group, x, y, z, extras = {}) {
    return {
        id: id,
        group: group,
        targetPos: new THREE.Vector3(x, y, z),
        targetRot: Math.random() * Math.PI * 2,
        state: 'IDLE',
        wanderTimer: Math.random() * 3,
        fleeTimer: 0,
        ...extras
    };
}

// Make available globally
window.createEntitySystem = createEntitySystem;
window.getEntityList = getEntityList;
window.handleServerStateUpdate = handleServerStateUpdate;
window.hasEntityConfig = hasEntityConfig;
window.getConfigSafe = getConfigSafe;
window.isLocalEntity = isLocalEntity;
window.exportEntityGlobals = exportEntityGlobals;
window.createEntityObject = createEntityObject;
