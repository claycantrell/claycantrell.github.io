// Bird system for 3D Demo (Client-Side Rendering Only)
// Receives state from server, updates visual models.
// Uses Systems registry pattern for organized update loop

// BirdSystem - manages bird rendering and animation
const BirdSystem = {
    init() {
        initBirds();
    },

    update(delta) {
        updateBirds(delta);
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('birds', BirdSystem);
}

// Use GAME namespace for centralized entity storage with fallback
const birdList = (typeof GAME !== 'undefined' && GAME.world?.entities)
    ? GAME.world.entities.birds
    : [];

// Get bird count from config
function getBirdCount() {
    return typeof CONFIG !== 'undefined'
        ? CONFIG.get('entities.birds.count', 30)
        : 30;
} 

// Create a single bird visual entity
function createBird(id, x, z) {
    const group = new THREE.Group();
    
    // Materials
    const r = Math.random();
    let color;
    if (r < 0.80) color = 0x111111; // Black
    else if (r < 0.95) color = 0x0000FF; // Blue
    else color = 0xFF0000; // Red
    
    const birdMaterial = new THREE.MeshBasicMaterial({ color: color });
    const wingMaterial = new THREE.MeshBasicMaterial({ color: color });
    const beakMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA500 }); 
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    // --- Body ---
    const bodyGeo = new THREE.ConeGeometry(0.15, 0.4, 6);
    const body = new THREE.Mesh(bodyGeo, birdMaterial);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // --- Head ---
    const headGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const head = new THREE.Mesh(headGeo, birdMaterial);
    head.position.set(0, 0.1, 0.2); 
    group.add(head);

    const beakGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
    const beak = new THREE.Mesh(beakGeo, beakMaterial);
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0, 0.15);
    head.add(beak);

    const eyeGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.08, 0.05, 0.05);
    head.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.08, 0.05, 0.05);
    head.add(rightEye);

    // --- Wings ---
    const wingGeo = new THREE.BoxGeometry(0.4, 0.02, 0.2);
    wingGeo.translate(0.2, 0, 0); 
    const leftWing = new THREE.Mesh(wingGeo, wingMaterial);
    leftWing.position.set(0.05, 0.05, 0);
    group.add(leftWing);
    const rightWing = new THREE.Mesh(wingGeo, wingMaterial);
    rightWing.position.set(-0.05, 0.05, 0);
    rightWing.rotation.z = Math.PI; 
    group.add(rightWing);

    // --- Tail ---
    const tailGeo = new THREE.BoxGeometry(0.2, 0.02, 0.3);
    const tail = new THREE.Mesh(tailGeo, birdMaterial);
    tail.position.set(0, 0, -0.3);
    group.add(tail);

    // Initial placement (server will update)
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y + 10, z);

    scene.add(group);
    
    return {
        id: id,
        group: group,
        leftWing: leftWing,
        rightWing: rightWing,
        targetPos: new THREE.Vector3(x, y + 10, z),
        state: 'FLYING'
    };
}

function initBirds() {
    // Bird system initialized, waiting for server state
}

function updateBirdState(serverData) {
    serverData.forEach(data => {
        let bird = birdList.find(b => b.id === data.id);
        if (!bird) {
            bird = createBird(data.id, data.x, data.z);
            birdList.push(bird);
        }
        
        bird.targetPos.set(data.x, data.y, data.z); // Birds send Y from server
        bird.state = data.state;
    });
}

function updateBirds(delta) {
    const time = Date.now() * 0.001;

    birdList.forEach(bird => {
        // Interpolate
        bird.group.position.lerp(bird.targetPos, delta * 5);
        
        // Face Direction
        const moveDir = new THREE.Vector3().subVectors(bird.targetPos, bird.group.position);
        if (moveDir.lengthSq() > 0.001) {
             bird.group.rotation.y = Math.atan2(moveDir.x, moveDir.z);
             bird.group.rotation.z = -moveDir.x * 0.5; // Bank
        }

        // Animation
        const flapSpeed = 15;
        bird.leftWing.rotation.z = Math.sin(time * flapSpeed) * 0.5;
        bird.rightWing.rotation.z = Math.PI - Math.sin(time * flapSpeed) * 0.5;
        bird.group.position.y += Math.sin(time * 20) * 0.02; // Bob
    });
}


// Make available globally
window.initBirds = initBirds;
window.updateBirds = updateBirds;
window.updateBirdState = updateBirdState;
window.BirdSystem = BirdSystem;
