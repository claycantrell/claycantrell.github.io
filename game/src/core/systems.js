// Systems registry - manages all game systems
const Systems = {
    // Registered systems
    _systems: {},

    // System update order
    _updateOrder: [
        'character',
        'multiplayer',
        'trees',
        'shrubs',
        'npc',
        'deer',
        'bunnies',
        'birds',
        'animalSync',
        'portals'
    ],

    // Register a system
    register(name, system) {
        this._systems[name] = system;
        console.log(`System registered: ${name}`);
    },

    // Get a system
    get(name) {
        return this._systems[name];
    },

    // Initialize all systems
    initAll() {
        for (const name of Object.keys(this._systems)) {
            const sys = this._systems[name];
            if (sys && typeof sys.init === 'function') {
                sys.init();
            }
        }
    },

    // Update all systems in order
    updateAll(delta) {
        for (const name of this._updateOrder) {
            const sys = this._systems[name];
            if (sys && typeof sys.update === 'function') {
                sys.update(delta);
            }
        }
    }
};

export default Systems;
