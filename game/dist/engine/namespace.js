// GAME namespace - central container for all game state
// This replaces scattered global variables with organized namespaces

const GAME = {
    // THREE.js core objects
    scene: null,
    camera: null,
    renderer: null,

    // Player
    character: null,

    // Lighting
    lighting: {
        ambient: null,
        directional: null,
        sun: null,
        moon: null
    },

    // World data
    world: {
        portals: [],
        objects: [],
        treeData: [],
        groundMesh: null,
        // Entity lists (populated by entity systems)
        entities: {
            deer: [],
            cows: [],
            bunnies: [],
            birds: [],
            npc: null
        }
    },

    // Resources
    resources: {
        font: null,
        sharedMaterials: {}
    },

    // Audio
    audio: {
        sound: null,
        listener: null,
        loader: null,
        isPlaying: false
    },

    // Input state (Minecraft-style controls)
    input: {
        moveForward: false,
        moveBackward: false,
        strafeLeft: false,
        strafeRight: false,
        isJumping: false,
        isSprinting: false,
        activeKeys: new Set()
    },

    // Game state flags
    state: {
        isFirstPerson: false,
        isTerrainReady: false,
        portalActivated: false,
        isBuildMode: false
    },

    // Timing
    time: {
        prevTime: performance.now(),
        delta: 0,
        lastLODUpdate: 0
    },

    // Physics
    physics: {
        velocity: null  // Will be THREE.Vector3
    },

    // Config (from performance.js)
    config: null,  // Will reference PERFORMANCE

    // Multiplayer
    multiplayer: {
        socket: null,
        playerId: null,
        isConnected: false,
        otherPlayers: new Map()  // id -> {mesh, targetPosition, targetRotation, lastUpdate}
    },

    // DOM elements cache
    dom: {
        notification: null,
        audioIcon: null,
        instructionMessage: null,
        chatInput: null,
        chatMessages: null
    },

    // Chat system state
    chat: {
        open: false,
        history: [],
        npcConversation: []
    },

    // NPC state
    npc: {
        entity: null,
        state: 'wandering',
        target: null,
        spawnPosition: null,
        hasGreeted: false,
        isNearby: false
    },

    // Building system state
    building: {
        mode: false,
        selectedBlock: null,
        placedBlocks: []
    },

    // Chunk system state
    chunks: {
        loaded: new Map(),
        updateTimer: 0,
        lastPlayerChunk: null
    },

    // Terrain state
    terrain: {
        simplex: null,
        heightmap: null,
        config: null,
        size: 50000,
        segments: 256,
        data: null
    },

    // Error handling utility
    error: {
        log(system, error, level = 'error') {
            const msg = `[${system}] ${error.message || error}`;
            console[level](msg);
            if (level === 'error' && typeof showNotification === 'function') {
                showNotification(`Error in ${system}`);
            }
        },

        wrap(system, fn) {
            return (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    this.log(system, e);
                }
            };
        }
    }
};

// Make available globally
window.GAME = GAME;
