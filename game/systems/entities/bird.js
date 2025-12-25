// Bird system for 3D Demo (Client-Side Rendering Only)
// Receives state from server, updates visual models.
// Uses Systems registry pattern and shared utilities

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

// Use GAME namespace for centralized entity storage
const birdList = (typeof GAME !== 'undefined' && GAME.world?.entities)
    ? GAME.world.entities.birds
    : [];

// Create a single bird visual entity
function createBird(id, x, z) {
    const group = new THREE.Group();

    // Materials
    const r = Math.random();
    let color;
    if (r < 0.80) color = 0x111111;
    else if (r < 0.95) color = 0x0000FF;
    else color = 0xFF0000;

    const birdMaterial = new THREE.MeshLambertMaterial({ color: color });
    const wingMaterial = new THREE.MeshLambertMaterial({ color: color });
    const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xFFA500 });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

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

    // Initial placement
    const y = getTerrainHeight(x, z);
    group.position.set(x, y + 10, z);

    // Enable shadows
    enableShadows(group);

    // Add to scene
    addToScene(group);

    return {
        id: id,
        group: group,
        leftWing: leftWing,
        rightWing: rightWing,
        targetPos: new THREE.Vector3(x, y + 10, z),
        state: 'FLYING'
    };
}

// Init called by main game
function initBirds() {
    // Bird system ready - animal-spawner.js handles spawning
}

// Called by animal-sync.js
function updateBirdState(serverData) {
    serverData.forEach(data => {
        let bird = birdList.find(b => b.id === data.id);
        if (!bird) {
            bird = createBird(data.id, data.x, data.z);
            birdList.push(bird);
        }

        bird.targetPos.set(data.x, data.y, data.z);
        bird.state = data.state;
    });
}

// Render Loop
function updateBirds(delta) {
    const time = Date.now() * 0.001;

    // Defensive: ensure config exists
    if (typeof ENTITY_CONFIG === 'undefined' || !ENTITY_CONFIG.bird) {
        console.warn('ENTITY_CONFIG.bird not available');
        return;
    }

    const config = ENTITY_CONFIG.bird;
    const fleeConfig = config.flee;
    const flightConfig = config.flight;
    const animConfig = config.animation;

    birdList.forEach(bird => {
        // Local/spawned bird flying behavior
        if (bird.id.startsWith('local_') || bird.id.startsWith('spawned_')) {
            // Initialize flight pattern
            if (!bird.circleCenter) {
                bird.circleCenter = bird.group.position.clone();
                bird.circleCenter.y = 0;
                bird.circleRadius = flightConfig.circleRadius.min +
                    Math.random() * (flightConfig.circleRadius.max - flightConfig.circleRadius.min);
                bird.circleSpeed = flightConfig.circleSpeed.min +
                    Math.random() * (flightConfig.circleSpeed.max - flightConfig.circleSpeed.min);
                bird.flyHeight = flightConfig.minHeight +
                    Math.random() * (flightConfig.maxHeight - flightConfig.minHeight);
                bird.flyPhase = Math.random() * Math.PI * 2;
                bird.fleeTimer = 0;
            }

            bird.fleeTimer = (bird.fleeTimer || 0) - delta;

            // Check distance to player (horizontal only, from circle center)
            const playerPos = typeof character !== 'undefined' && character ? character.position : null;
            let distToPlayer = Infinity;
            if (playerPos) {
                const dx = bird.circleCenter.x - playerPos.x;
                const dz = bird.circleCenter.z - playerPos.z;
                distToPlayer = Math.sqrt(dx * dx + dz * dz);
            }

            // Flee behavior
            if (distToPlayer < fleeConfig.detectRadius && bird.fleeTimer <= 0 && playerPos) {
                const fleeAngle = Math.atan2(
                    bird.circleCenter.x - playerPos.x,
                    bird.circleCenter.z - playerPos.z
                );
                bird.circleCenter.x += Math.cos(fleeAngle) * fleeConfig.distance;
                bird.circleCenter.z += Math.sin(fleeAngle) * fleeConfig.distance;
                bird.flyHeight += fleeConfig.fleeHeight;
                bird.circleSpeed = flightConfig.circleSpeed.max;
                bird.fleeTimer = fleeConfig.duration;
            }

            // Gradually return to normal height
            if (bird.flyHeight > flightConfig.maxHeight + 10 && bird.fleeTimer <= 0) {
                bird.flyHeight -= delta * 2;
            }

            bird.flyPhase += delta * bird.circleSpeed;

            // Circular flight path
            const newX = bird.circleCenter.x + Math.cos(bird.flyPhase) * bird.circleRadius;
            const newZ = bird.circleCenter.z + Math.sin(bird.flyPhase) * bird.circleRadius;
            const groundY = getTerrainHeight(newX, newZ);

            // Gentle altitude variation
            const altVariation = Math.sin(bird.flyPhase * 2) * 3;
            bird.targetPos.set(newX, groundY + bird.flyHeight + altVariation, newZ);

            // Occasionally drift to new area
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
            bird.group.rotation.y = smoothRotateToward(bird.group.rotation.y, targetAngle, delta, 3);
            let rotDiff = targetAngle - bird.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            bird.group.rotation.z = -rotDiff * 0.3; // Bank into turns
        }

        // Wing flapping animation
        bird.leftWing.rotation.z = Math.sin(time * animConfig.wingSpeed) * animConfig.wingAmplitude;
        bird.rightWing.rotation.z = Math.PI - Math.sin(time * animConfig.wingSpeed) * animConfig.wingAmplitude;
    });
}

// Make available globally
window.initBirds = initBirds;
window.updateBirds = updateBirds;
window.updateBirdState = updateBirdState;
window.BirdSystem = BirdSystem;
window.birdList = birdList;
window.createBird = createBird;
