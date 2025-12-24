// Global game namespace - contains all shared state
const GAME = {
    // THREE.js core objects
    scene: null,
    camera: null,
    renderer: null,

    // Character
    character: null,

    // Lighting
    ambientLight: null,
    directionalLight: null,
    sunMesh: null,
    moonMesh: null,

    // Shared materials
    sharedMaterials: {},

    // World objects
    portals: [],
    objects: [],

    // Resources
    font: null,

    // Audio
    audio: null,
    listener: null,
    audioLoader: null,
    isAudioPlaying: false,

    // Tree data for LOD
    treeData: [],

    // Timing
    prevTime: performance.now(),
    velocity: null, // Will be set to THREE.Vector3

    // Pixel ratio
    pixelRatio: /Mobi|Android/i.test(navigator.userAgent) ? 0.12 : 0.32,

    // State flags
    state: {
        isFlying: false,
        isFirstPerson: false,
        portalActivated: false,
        isTerrainReady: false
    },

    // Input state
    input: {
        moveForward: false,
        moveBackward: false,
        rotateLeft: false,
        rotateRight: false
    },

    // DOM elements
    dom: {
        notification: null,
        audioIcon: null,
        instructionMessage: null,
        instructionsParagraph: null
    },

    // Notification timeout
    notificationTimeout: null
};

export default GAME;
