// Bird system for 3D Demo - Refactored to use shared utilities

// Entity list
const birdList = getEntityList('birds') || [];

// System registration
const BirdSystem = createEntitySystem('bird', 'birds', initBirds, updateBirds);

// Create a single bird visual entity
function createBird(id, x, z) {
    const group = new THREE.Group();

    // Materials - random color
    const r = Math.random();
    let color;
    if (r < 0.80) color = 0x111111;
    else if (r < 0.95) color = 0x0000FF;
    else color = 0xFF0000;

    const birdMaterial = new THREE.MeshLambertMaterial({ color: color });
    const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xFFA500 });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // Body
    const bodyGeo = new THREE.ConeGeometry(0.15, 0.4, 6);
    const body = new THREE.Mesh(bodyGeo, birdMaterial);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Head
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

    // Wings
    const wingGeo = new THREE.BoxGeometry(0.4, 0.02, 0.2);
    wingGeo.translate(0.2, 0, 0);
    const leftWing = new THREE.Mesh(wingGeo, birdMaterial);
    leftWing.position.set(0.05, 0.05, 0);
    group.add(leftWing);
    const rightWing = new THREE.Mesh(wingGeo, birdMaterial);
    rightWing.position.set(-0.05, 0.05, 0);
    rightWing.rotation.z = Math.PI;
    group.add(rightWing);

    // Tail
    const tailGeo = new THREE.BoxGeometry(0.2, 0.02, 0.3);
    const tail = new THREE.Mesh(tailGeo, birdMaterial);
    tail.position.set(0, 0, -0.3);
    group.add(tail);

    // Initial placement (high in the sky)
    const y = getTerrainHeight(x, z);
    group.position.set(x, y + 10, z);

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y + 10, z, {
        leftWing: leftWing,
        rightWing: rightWing,
        state: 'FLYING'
    });
}

function initBirds() {
    // Bird system ready - animal-spawner.js handles spawning
}

function updateBirdState(serverData) {
    handleServerStateUpdate(serverData, birdList, createBird, (bird, data) => {
        bird.targetPos.set(data.x, data.y, data.z);
        bird.state = data.state;
    });
}

function updateBirds(delta) {
    const config = getConfigSafe('bird');
    if (!config) return;

    const time = getAnimTime();
    const flightConfig = config.flight;
    const fleeConfig = config.flee;
    const animConfig = config.animation;

    birdList.forEach(bird => {
        // Local/spawned bird flying behavior
        if (isLocalEntity(bird)) {
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

            // Check distance to player (from circle center)
            const playerPos = typeof character !== 'undefined' && character ? character.position : null;
            let distToPlayer = Infinity;
            if (playerPos) {
                const dx = bird.circleCenter.x - playerPos.x;
                const dz = bird.circleCenter.z - playerPos.z;
                distToPlayer = Math.sqrt(dx * dx + dz * dz);
            }

            // Flee behavior - fly away and higher
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
        const dx = bird.targetPos.x - bird.group.position.x;
        const dy = bird.targetPos.y - bird.group.position.y;
        const dz = bird.targetPos.z - bird.group.position.z;
        if (dx * dx + dy * dy + dz * dz > 0.01) {
            const targetAngle = Math.atan2(dx, dz);
            bird.group.rotation.y = smoothRotateToward(bird.group.rotation.y, targetAngle, delta, 3);
            applyBanking(bird.group, targetAngle, bird.group.rotation.y);
        }

        // Wing flapping animation
        animateWings(bird.leftWing, bird.rightWing, time, animConfig.wingSpeed, animConfig.wingAmplitude);
    });
}

// Export globals
exportEntityGlobals('Bird', {
    initBirds, updateBirds, updateBirdState,
    BirdSystem, birdList, createBird
});
