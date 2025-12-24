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
        groundMesh: null
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

    // Input state
    input: {
        moveForward: false,
        moveBackward: false,
        rotateLeft: false,
        rotateRight: false,
        isFlying: false,
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
        otherPlayers: new Map()
    },

    // DOM elements cache
    dom: {
        notification: null,
        audioIcon: null,
        instructionMessage: null,
        chatInput: null,
        chatMessages: null
    }
};

// Make available globally
window.GAME = GAME;
