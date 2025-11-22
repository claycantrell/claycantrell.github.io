// Core Three.js setup and initialization
// Global variables accessible across all modules
let scene, camera, renderer;
let character;
let moveForward = false,
    moveBackward = false,
    rotateLeft = false,
    rotateRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const portals = [];
const objects = [];

// Notification element
const notification = document.getElementById('notification');
let notificationTimeout;

// Font Loader for retro text
let font;

// Audio elements (will be initialized in audio.js)
let audio, listener, audioLoader;
let isAudioPlaying = false;
const audioIcon = document.getElementById('audio-icon');

// Instructional Message Elements
const instructionMessage = document.getElementById('instruction-message');
const instructionsParagraph = document.getElementById('instructions');

// Pixelation Effect Variables
let pixelRatio;

if (/Mobi|Android/i.test(navigator.userAgent)) {
    // On mobile devices
    pixelRatio = 0.09;
} else {
    // On other devices
    pixelRatio = 0.25;
}

// Flag to prevent multiple fades
let portalActivated = false;

// Function to set instructions based on device
function setInstructions() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
        instructionsParagraph.innerHTML = `
            Touch edges of screen to rotate right or left.<br>
            Touch bottom and top of screen to move<br>
            forward and backward.
        `;
    } else {
        instructionsParagraph.innerHTML = `
            Use Arrow Keys or WASD to move and rotate.
        `;
    }
}

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x191970); // Midnight blue background
    scene.fog = new THREE.Fog(0x000000, 50, 200); // Linear fog with black color

    // Camera setup
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.imageRendering = 'pixelated';
    renderer.setPixelRatio(window.devicePixelRatio * pixelRatio);
    document.body.appendChild(renderer.domElement);

    // Ground with Flat Shading
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x004d00, flatShading: true });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Character setup
    character = createCharacter();
    character.position.set(-180, 1, -180);
    character.rotation.y = Math.PI / 4;
    scene.add(character);

    // Create Portals
    createPortals();

    // Create more complex trees
    createMoreComplexTrees();

    // Initialize audio (audio.js will handle setup)
    initAudio();

    // Initialize controls
    initControls();

    // Initialize UI
    initUI();
}

// Load Retro Font and start the game
const loader = new THREE.FontLoader();
loader.load('https://threejs.org/examples/fonts/droid/droid_sans_mono_regular.typeface.json', function (loadedFont) {
    font = loadedFont;
    // Instructions are set before initialization
    setInstructions();
    init();
    // Start the animation loop
    animate();
    // After 3 seconds, fade out the instructional message
    setTimeout(() => {
        instructionMessage.style.opacity = '0';
    }, 3000);
});

