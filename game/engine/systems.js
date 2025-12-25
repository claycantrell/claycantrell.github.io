// Systems Registry - manages all game systems with consistent update loop

const Systems = {
    // Registered systems
    _registry: {},

    // Update order (systems are called in this order each frame)
    _updateOrder: [
        'character',
        'multiplayer',
        'chunks',
        'trees',
        'shrubs',
        'animalSpawner',
        'npc',
        'deer',
        'bunnies',
        'birds',
        'animalSync',
        'portals',
        'building'
    ],

    // Register a system
    register(name, system) {
        this._registry[name] = system;
        if (typeof gameLog === 'function') gameLog(`System registered: ${name}`);
    },

    // Get a system by name
    get(name) {
        return this._registry[name];
    },

    // Check if a system exists
    has(name) {
        return name in this._registry;
    },

    // Initialize all registered systems
    initAll() {
        for (const name of Object.keys(this._registry)) {
            const sys = this._registry[name];
            if (sys && typeof sys.init === 'function') {
                try {
                    sys.init();
                } catch (e) {
                    console.error(`Failed to init system ${name}:`, e);
                }
            }
        }
    },

    // Update all systems in order
    updateAll(delta) {
        for (const name of this._updateOrder) {
            const sys = this._registry[name];
            if (sys && typeof sys.update === 'function') {
                try {
                    sys.update(delta);
                } catch (e) {
                    // Use GAME.error if available, fallback to console
                    if (typeof GAME !== 'undefined' && GAME.error) {
                        GAME.error.log(name, e);
                    } else {
                        console.error(`Error in system ${name}:`, e);
                    }
                }
            }
        }
    },

    // Enable/disable a system
    setEnabled(name, enabled) {
        const sys = this._registry[name];
        if (sys) {
            sys.enabled = enabled;
        }
    },

    // List all registered systems
    list() {
        return Object.keys(this._registry);
    }
};

// Make available globally
window.Systems = Systems;
