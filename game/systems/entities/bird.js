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

// Init called by main game - spawner handles actual spawning
function initBirds() {
    // Bird system ready - animal-spawner.js handles spawning
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

// Flee behavior for birds
const BIRD_FLEE = {
    detectRadius: 20,    // Fly away when player this close
    fleeDistance: 40,    // How far to move circle center
    fleeHeight: 15       // Extra height when fleeing
};

// Get bird speed from config
function getBirdSpeed() {
    return typeof CONFIG !== 'undefined' ? CONFIG.get('entities.birds.speed', 12.0) : 12.0;
}

function updateBirds(delta) {
    const time = Date.now() * 0.001;
    const playerPos = typeof character !== 'undefined' && character ? character.position : null;

    birdList.forEach(bird => {
        // Local/spawned bird flying behavior
        if (bird.id.startsWith('local_') || bird.id.startsWith('spawned_')) {
            // Initialize flight pattern
            if (!bird.circleCenter) {
                bird.circleCenter = bird.group.position.clone();
                bird.circleCenter.y = 0;
                bird.circleRadius = 20 + Math.random() * 40;
                // Speed based on config
                const baseSpeed = getBirdSpeed();
                bird.circleSpeed = (baseSpeed / 30) + Math.random() * 0.2;
                bird.flyHeight = 12 + Math.random() * 25;
                bird.flyPhase = Math.random() * Math.PI * 2;
                bird.fleeTimer = 0;
            }

            bird.fleeTimer = (bird.fleeTimer || 0) - delta;

            // Check distance to player (horizontal only)
            let distToPlayer = Infinity;
            if (playerPos) {
                const dx = bird.circleCenter.x - playerPos.x;
                const dz = bird.circleCenter.z - playerPos.z;
                distToPlayer = Math.sqrt(dx * dx + dz * dz);
            }

            // Flee behavior - player too close to circle center
            if (distToPlayer < BIRD_FLEE.detectRadius && bird.fleeTimer <= 0) {
                // Move circle center away from player
                const fleeAngle = Math.atan2(
                    bird.circleCenter.x - playerPos.x,
                    bird.circleCenter.z - playerPos.z
                );
                bird.circleCenter.x += Math.cos(fleeAngle) * BIRD_FLEE.fleeDistance;
                bird.circleCenter.z += Math.sin(fleeAngle) * BIRD_FLEE.fleeDistance;
                bird.flyHeight += BIRD_FLEE.fleeHeight; // Fly higher
                bird.circleSpeed = 0.6; // Speed up
                bird.fleeTimer = 3; // Don't flee again for 3 seconds
            }

            // Gradually return to normal height
            if (bird.flyHeight > 35 && bird.fleeTimer <= 0) {
                bird.flyHeight -= delta * 2;
            }

            bird.flyPhase += delta * bird.circleSpeed;

            // Circular flight path
            const newX = bird.circleCenter.x + Math.cos(bird.flyPhase) * bird.circleRadius;
            const newZ = bird.circleCenter.z + Math.sin(bird.flyPhase) * bird.circleRadius;
            const groundY = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(newX, newZ) : 0;

            // Gentle altitude variation
            const altVariation = Math.sin(bird.flyPhase * 2) * 3;
            bird.targetPos.set(newX, groundY + bird.flyHeight + altVariation, newZ);

            // Occasionally drift to new area (when not fleeing)
            if (Math.random() < 0.002 && bird.fleeTimer <= 0) {
                bird.circleCenter.x += (Math.random() - 0.5) * 60;
                bird.circleCenter.z += (Math.random() - 0.5) * 60;
            }
        }

        // Smooth movement
        bird.group.position.lerp(bird.targetPos, delta * 3);

        // Face movement direction with banking
        const moveDir = new THREE.Vector3().subVectors(bird.targetPos, bird.group.position);
        if (moveDir.lengthSq() > 0.01) {
            const targetAngle = Math.atan2(moveDir.x, moveDir.z);
            let rotDiff = targetAngle - bird.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            bird.group.rotation.y += rotDiff * delta * 3;
            bird.group.rotation.z = -rotDiff * 0.3; // Bank into turns
        }

        // Wing flapping animation
        const flapSpeed = 12;
        bird.leftWing.rotation.z = Math.sin(time * flapSpeed) * 0.6;
        bird.rightWing.rotation.z = Math.PI - Math.sin(time * flapSpeed) * 0.6;
    });
}


// Make available globally
window.initBirds = initBirds;
window.updateBirds = updateBirds;
window.updateBirdState = updateBirdState;
window.BirdSystem = BirdSystem;
