// Centralized Entity Configuration
// All entity behavior values in one place for easy tuning

// World scale: 2.5 units = 1 metre. The models agree: the knight is ~4.4 units
// tall (1.75 m), a horse ~4.3 at the withers (1.6 m), a deer ~3.3 at the
// shoulder, a cow ~3 at the back. Speeds below are real-world m/s converted
// with mps(), so animals and the player's horse move at true relative speeds.
const UNITS_PER_METER = 2.5;
function mps(metersPerSecond) {
    return metersPerSecond * UNITS_PER_METER;
}

const ENTITY_CONFIG = {
    // Bunny (cottontail): short hops, explosive zig-zag sprints in short bursts
    bunny: {
        count: 20,
        speed: mps(2.5),        // Casual hopping
        fleeSpeed: mps(14),     // Sprint when scared (real top ~13-16 m/s)
        collisionRadius: 0.4,
        heightOffset: 0.4,
        flee: {
            detectRadius: 12,
            panicRadius: 5,
            duration: 2,
            distance: 30,       // ~1-1.5 s burst at flee speed
            panicBonus: 20
        },
        wander: {
            minDistance: 3,
            maxDistance: 11,
            idleDuration: { min: 0.5, max: 2.0 },
            moveDuration: { min: 2, max: 4 }
        },
        animation: {
            hopLength: mps(1.0),        // Ground covered per hop; hop rate = speed / hopLength
            hopLengthFlee: mps(3.0),
            hopHeight: 0.9,
            rotationSpeed: 8,
            earTwitchSpeed: 3,
            earTwitchAmplitude: 0.1
        }
    },

    // Deer (white-tailed): walks, bounds about, and bolts faster than a ridden horse
    deer: {
        count: 18,
        speed: mps(6),          // Unhurried bounding while wandering
        walkSpeed: mps(1.5),    // Casual walking
        fleeSpeed: mps(14),     // Bolting (real top ~13-18 m/s); just beats the player's gallop
        collisionRadius: 0.8,
        heightOffset: 0,
        flee: {
            detectRadius: 15,
            panicRadius: 6,
            duration: 3,
            distance: 60,       // ~2-2.5 s of running at flee speed
            panicBonus: 30
        },
        wander: {
            minDistance: 15,
            maxDistance: 40,
            idleDuration: { min: 2, max: 6 },
            moveDuration: { min: 4, max: 10 }
        },
        animation: {
            // Leg cycle rate follows movement speed (legCycleRate) so hooves don't skate
            legLength: 1.8,
            legSwing: 0.5,
            runLegSwing: 0.7,
            fleeLegSwing: 0.8,
            rotationSpeed: 3
        }
    },

    // Wild horse configuration (herds on plains, grassland, meadow, savanna)
    horse: {
        speed: mps(7),          // Canter
        walkSpeed: mps(1.8),    // Grazing amble
        fleeSpeed: mps(14),     // Riderless gallop when spooked (a little faster than a ridden horse)
        collisionRadius: 1.2,
        heightOffset: 0,
        flee: {
            detectRadius: 14,
            panicRadius: 6,
            duration: 3,
            distance: 80,       // ~2.5-3 s of galloping
            panicBonus: 30
        },
        wander: {
            minDistance: 8,
            maxDistance: 25,
            idleDuration: { min: 3, max: 8 },
            moveDuration: { min: 3, max: 7 }
        },
        animation: {
            legLength: 2.9,
            legSwing: 0.45,
            runLegSwing: 0.55,
            fleeLegSwing: 0.8,
            rotationSpeed: 2.5
        }
    },

    // Cow: domesticated and unafraid. Ambles, and at most trots slowly out of the way
    cow: {
        count: 12,
        speed: mps(1.1),        // Walk
        fleeSpeed: mps(2.5),    // Slow trot away when crowded; never a sprint
        collisionRadius: 1.0,
        heightOffset: 0,
        flee: {
            detectRadius: 4,
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
            chance: 0.4,
            duration: 5
        },
        animation: {
            legLength: 1.6,
            legSwing: 0.4,
            fleeLegSwing: 0.5,
            rotationSpeed: 2,
            tailSwish: { walk: { speed: 2, amplitude: 0.3 }, graze: { speed: 1.5, amplitude: 0.2 }, idle: { speed: 0.5, amplitude: 0.15 } }
        }
    },

    // Bird configuration
    // Small songbird: cruises ~10 m/s, flushes at ~18 m/s
    bird: {
        count: 30,
        speed: mps(10),
        fleeSpeed: mps(18),
        collisionRadius: 0.3,
        heightOffset: 0,
        flee: {
            detectRadius: 20,
            panicRadius: 8,
            duration: 4,
            distance: 40,
            fleeHeight: 15
        },
        flight: {
            minHeight: 8,
            maxHeight: 25,
            circleRadius: { min: 10, max: 30 },
            speedVariation: 0.2     // Each bird cruises within +/-20% of speed
        },
        animation: {
            wingSpeed: 15,          // At cruise speed; scales with flight speed
            wingAmplitude: 0.8
        }
    },

    // Frog configuration (Swamp biome)
    frog: {
        count: 25,
        speed: mps(1.0),        // Short hops
        fleeSpeed: mps(3.0),    // Leaping away
        collisionRadius: 0.3,
        heightOffset: 0.15,
        flee: {
            detectRadius: 8,
            panicRadius: 4,
            duration: 1.5,
            distance: 15,
            panicBonus: 10
        },
        wander: {
            minDistance: 2,
            maxDistance: 8,
            idleDuration: { min: 1, max: 3 },
            moveDuration: { min: 1.5, max: 3.5 }
        },
        animation: {
            hopLength: mps(0.5),
            hopLengthFlee: mps(1.0),
            hopHeight: 0.6,
            rotationSpeed: 10
        }
    },

    // Penguin configuration (Ice Spikes biome)
    penguin: {
        count: 15,
        speed: mps(0.8),        // Waddle
        fleeSpeed: mps(2.0),    // Hurried waddle
        collisionRadius: 0.5,
        heightOffset: 0,
        flee: {
            detectRadius: 10,
            panicRadius: 4,
            duration: 2,
            distance: 12,
            panicBonus: 8
        },
        wander: {
            minDistance: 3,
            maxDistance: 12,
            idleDuration: { min: 2, max: 5 },
            moveDuration: { min: 3, max: 6 }
        },
        animation: {
            rotationSpeed: 4
        }
    },

    // Panda configuration (Bamboo Jungle biome)
    panda: {
        count: 12,
        speed: mps(0.8),        // Lumbering walk
        fleeSpeed: mps(2.5),    // Shuffling trot away (pandas rarely run)
        collisionRadius: 0.9,
        heightOffset: 0,
        flee: {
            detectRadius: 8,
            panicRadius: 3,
            duration: 2,
            distance: 15,
            panicBonus: 8
        },
        wander: {
            minDistance: 5,
            maxDistance: 20,
            idleDuration: { min: 3, max: 8 },
            moveDuration: { min: 2, max: 5 }
        },
        animation: {
            legLength: 0.6,     // Legs pivot at their middle
            legSwing: 0.4,
            rotationSpeed: 2.5
        }
    },

    // Crab configuration (Mangrove Swamp biome)
    crab: {
        count: 20,
        speed: mps(0.5),        // Sideways scuttle
        fleeSpeed: mps(2.0),    // Dash for cover
        collisionRadius: 0.3,
        heightOffset: 0.1,
        flee: {
            detectRadius: 6,
            panicRadius: 3,
            duration: 1.5,
            distance: 10,
            panicBonus: 8
        },
        wander: {
            minDistance: 2,
            maxDistance: 10,
            idleDuration: { min: 1, max: 4 },
            moveDuration: { min: 2, max: 4 }
        },
        animation: {
            rotationSpeed: 8
        }
    },

    // Butterfly configuration (Cherry Grove biome)
    butterfly: {
        count: 35,
        speed: mps(2.0),        // Reference only: flight is a lerp drift that already averages ~2 m/s
        collisionRadius: 0.2,
        heightOffset: 0,
        flee: {
            detectRadius: 12,
            panicRadius: 6,
            duration: 2,
            distance: 20,
            fleeHeight: 8
        },
        animation: {
            wingSpeed: 20,
            wingAmplitude: 0.6
        }
    },

    // Salamander configuration (Volcanic Peaks biome)
    salamander: {
        count: 10,
        speed: mps(0.3),        // Slow crawl
        fleeSpeed: mps(1.0),    // Scurry
        collisionRadius: 0.4,
        heightOffset: 0.15,
        flee: {
            detectRadius: 10,
            panicRadius: 4,
            duration: 2,
            distance: 15,
            panicBonus: 10
        },
        wander: {
            minDistance: 3,
            maxDistance: 12,
            idleDuration: { min: 2, max: 5 },
            moveDuration: { min: 2, max: 5 }
        },
        animation: {
            rotationSpeed: 6
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
    const speeds = { bunny: mps(2.5), deer: mps(6), cow: mps(1.1), bird: mps(10) };
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
window.UNITS_PER_METER = UNITS_PER_METER;
window.mps = mps;
window.getEntityConfig = getEntityConfig;
window.getEntityCount = getEntityCount;
window.getEntitySpeed = getEntitySpeed;
window.getFleeConfig = getFleeConfig;
window.getWanderConfig = getWanderConfig;
