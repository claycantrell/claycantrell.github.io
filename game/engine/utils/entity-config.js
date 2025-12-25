// Centralized Entity Configuration
// All entity behavior values in one place for easy tuning

const ENTITY_CONFIG = {
    // Bunny configuration
    bunny: {
        count: 20,
        speed: 6.0,
        collisionRadius: 0.4,
        heightOffset: 0.4, // Above terrain
        flee: {
            detectRadius: 12,    // Start fleeing when player this close
            panicRadius: 5,      // Panic flee when player this close
            duration: 2,         // How long to keep fleeing
            distance: 20,        // How far to flee
            panicBonus: 15       // Extra distance when panicking
        },
        wander: {
            minDistance: 3,
            maxDistance: 11,
            idleDuration: { min: 0.5, max: 2.0 },
            moveDuration: { min: 2, max: 4 }
        },
        animation: {
            hopFrequency: 2.5,
            hopFrequencyFlee: 3.5,
            hopHeight: 0.9,
            rotationSpeed: 8
        }
    },

    // Deer configuration
    deer: {
        count: 18,
        speed: 8.0,
        collisionRadius: 0.8,
        heightOffset: 0,
        flee: {
            detectRadius: 15,
            panicRadius: 6,
            duration: 3,
            distance: 30,
            panicBonus: 20
        },
        wander: {
            minDistance: 15,
            maxDistance: 40,
            idleDuration: { min: 2, max: 6 },
            moveDuration: { min: 4, max: 10 }
        },
        animation: {
            walkLegSpeed: 8,
            runLegSpeed: 20,
            legSwing: 0.5,
            rotationSpeed: 3
        }
    },

    // Cow configuration
    cow: {
        count: 12,
        speed: 3.0,
        collisionRadius: 1.0,
        heightOffset: 0,
        flee: {
            detectRadius: 4,     // Only flee when player VERY close
            panicRadius: 2,
            duration: 2,
            distance: 10,
            panicBonus: 5
        },
        wander: {
            minDistance: 5,
            maxDistance: 20,
            idleDuration: { min: 2, max: 6 },
            moveDuration: { min: 4, max: 10 }
        },
        graze: {
            chance: 0.4,         // 40% chance to graze instead of walk
            duration: 5
        },
        animation: {
            legSpeed: 13,
            legSwing: 0.3,
            rotationSpeed: 2
        }
    },

    // Bird configuration
    bird: {
        count: 30,
        speed: 12.0,
        collisionRadius: 0.3,
        heightOffset: 0,
        flee: {
            detectRadius: 20,
            panicRadius: 8,
            duration: 4,
            distance: 40,
            fleeHeight: 15       // How high to fly when fleeing
        },
        flight: {
            minHeight: 8,
            maxHeight: 25,
            circleRadius: { min: 10, max: 30 },
            circleSpeed: { min: 0.3, max: 0.8 }
        },
        animation: {
            wingSpeed: 15,
            wingAmplitude: 0.8
        }
    }
};

/**
 * Get entity config value with fallback to CONFIG system
 * @param {string} entityType - Entity type (bunny, deer, cow, bird)
 * @param {string} path - Dot-notation path to config value
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Config value
 */
function getEntityConfig(entityType, path, defaultValue) {
    // First try the centralized config
    const entityConfig = ENTITY_CONFIG[entityType];
    if (entityConfig) {
        const parts = path.split('.');
        let value = entityConfig;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                value = undefined;
                break;
            }
        }
        if (value !== undefined) {
            return value;
        }
    }

    // Fall back to CONFIG system if available
    if (typeof CONFIG !== 'undefined') {
        const configPath = `entities.${entityType}.${path}`;
        return CONFIG.get(configPath, defaultValue);
    }

    return defaultValue;
}

/**
 * Get entity count
 */
function getEntityCount(entityType) {
    return getEntityConfig(entityType, 'count', 10);
}

/**
 * Get entity speed
 */
function getEntitySpeed(entityType) {
    // Direct access with fallback - more reliable than path parsing
    const speeds = { bunny: 6.0, deer: 8.0, cow: 3.0, bird: 12.0 };
    if (typeof ENTITY_CONFIG !== 'undefined' && ENTITY_CONFIG[entityType]?.speed) {
        return ENTITY_CONFIG[entityType].speed;
    }
    return speeds[entityType] || 5.0;
}

/**
 * Get flee config for entity
 */
function getFleeConfig(entityType) {
    return ENTITY_CONFIG[entityType]?.flee || {
        detectRadius: 10,
        panicRadius: 5,
        duration: 2,
        distance: 15,
        panicBonus: 10
    };
}

/**
 * Get wander config for entity
 */
function getWanderConfig(entityType) {
    return ENTITY_CONFIG[entityType]?.wander || {
        minDistance: 5,
        maxDistance: 20,
        idleDuration: { min: 1, max: 3 },
        moveDuration: { min: 2, max: 5 }
    };
}

// Make available globally
window.ENTITY_CONFIG = ENTITY_CONFIG;
window.getEntityConfig = getEntityConfig;
window.getEntityCount = getEntityCount;
window.getEntitySpeed = getEntitySpeed;
window.getFleeConfig = getFleeConfig;
window.getWanderConfig = getWanderConfig;
