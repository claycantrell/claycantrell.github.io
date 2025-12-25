// Bunny system for 3D Demo (Client-Side Rendering Only)
// Receives state from server, updates visual models.
// Uses Systems registry pattern for organized update loop

// BunnySystem - manages bunny rendering and animation
const BunnySystem = {
    init() {
        initBunnies();
    },

    update(delta) {
        updateBunnies(delta);
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('bunnies', BunnySystem);
}

// Use GAME namespace for centralized entity storage with fallback
const bunnyList = (typeof GAME !== 'undefined' && GAME.world?.entities)
    ? GAME.world.entities.bunnies
    : [];

// Get bunny count from config
function getBunnyCount() {
    return typeof CONFIG !== 'undefined'
        ? CONFIG.get('entities.bunnies.count', 20)
        : 20;
}

// Create a single bunny visual entity
function createBunny(id, x, z) {
    const group = new THREE.Group();
    
    // Materials - use Lambert for shadows
    const colors = [0xFFFFFF, 0xDCDCDC, 0xD2B48C, 0xA9A9A9]; 
    const color = colors[Math.floor(Math.random() * colors.length)];
    const bunnyMaterial = new THREE.MeshLambertMaterial({ color: color });
    const earInnerMaterial = new THREE.MeshLambertMaterial({ color: 0xFFC0CB }); 
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // --- Body ---
    const bodyGeo = new THREE.SphereGeometry(0.4, 6, 6);
    const body = new THREE.Mesh(bodyGeo, bunnyMaterial);
    body.scale.set(1, 0.8, 1.2); 
    body.position.y = 0.4;
    group.add(body);

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.7, 0.5);
    group.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.25, 6, 6);
    const head = new THREE.Mesh(headGeo, bunnyMaterial);
    headGroup.add(head);

    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.15, 0.05, 0.2);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.15, 0.05, 0.2);
    headGroup.add(rightEye);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.1, 0.6, 0.05);
    const leftEar = new THREE.Mesh(earGeo, bunnyMaterial);
    leftEar.position.set(0.1, 0.4, 0);
    leftEar.rotation.x = -0.2;
    leftEar.rotation.z = 0.2;
    headGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, bunnyMaterial);
    rightEar.position.set(-0.1, 0.4, 0);
    rightEar.rotation.x = -0.2;
    rightEar.rotation.z = -0.2;
    headGroup.add(rightEar);

    // --- Tail ---
    const tailGeo = new THREE.SphereGeometry(0.15, 4, 4);
    const tail = new THREE.Mesh(tailGeo, bunnyMaterial);
    tail.position.set(0, 0.3, -0.6);
    group.add(tail);

    // Initial placement (server will update)
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y, z);
    const scale = 0.8 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);

    // Enable shadows on all meshes
    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(group);
    
    return {
        id: id,
        group: group,
        ears: [leftEar, rightEar],
        targetPos: new THREE.Vector3(x, y, z),
        state: 'IDLE'
    };
}

// Init called by main game - spawner handles actual spawning
function initBunnies() {
    // Bunny system ready - animal-spawner.js handles spawning
}

// Called by animal-sync.js
function updateBunnyState(serverData) {
    serverData.forEach(data => {
        let bunny = bunnyList.find(b => b.id === data.id);
        if (!bunny) {
            bunny = createBunny(data.id, data.x, data.z);
            bunnyList.push(bunny);
        }
        
        if (typeof getTerrainHeightAt === 'function') {
            const y = getTerrainHeightAt(data.x, data.z);
            bunny.targetPos.set(data.x, y, data.z);
        }
        bunny.state = data.state;
    });
}

// Flee behavior config - bunnies are more skittish
const BUNNY_FLEE = {
    detectRadius: 12,    // Start fleeing when player this close
    fleeRadius: 5,       // Panic flee when player this close
    fleeDuration: 2,     // How long to keep hopping away
    fleeDistance: 20     // How far to flee
};

// Get bunny speed from config
function getBunnySpeed() {
    return typeof CONFIG !== 'undefined' ? CONFIG.get('entities.bunnies.speed', 6.0) : 6.0;
}

// Render Loop
function updateBunnies(delta) {
    const time = Date.now() * 0.001;
    const playerPos = typeof character !== 'undefined' && character ? character.position : null;

    bunnyList.forEach(bunny => {
        // Local/spawned bunny wander behavior
        if (bunny.id.startsWith('local_') || bunny.id.startsWith('spawned_')) {
            bunny.wanderTimer = (bunny.wanderTimer || 0) - delta;
            bunny.fleeTimer = (bunny.fleeTimer || 0) - delta;

            // Check distance to player
            let distToPlayer = Infinity;
            if (playerPos) {
                const dx = bunny.group.position.x - playerPos.x;
                const dz = bunny.group.position.z - playerPos.z;
                distToPlayer = Math.sqrt(dx * dx + dz * dz);
            }

            // Flee behavior - player too close!
            if (distToPlayer < BUNNY_FLEE.detectRadius) {
                // Hop away from player
                const fleeAngle = Math.atan2(
                    bunny.group.position.x - playerPos.x,
                    bunny.group.position.z - playerPos.z
                );
                const fleeDist = BUNNY_FLEE.fleeDistance + (distToPlayer < BUNNY_FLEE.fleeRadius ? 15 : 0);
                const newX = bunny.group.position.x + Math.cos(fleeAngle) * fleeDist;
                const newZ = bunny.group.position.z + Math.sin(fleeAngle) * fleeDist;
                bunny.targetPos.set(newX, 0, newZ);
                bunny.targetRot = fleeAngle;
                bunny.state = 'HOP';
                bunny.hopPhase = bunny.hopPhase || 0;
                bunny.fleeTimer = BUNNY_FLEE.fleeDuration;
                bunny.wanderTimer = BUNNY_FLEE.fleeDuration + 1;
                bunny.isFleeing = true;
            }
            // Normal wander behavior (only if not fleeing)
            else if (bunny.fleeTimer <= 0) {
                bunny.isFleeing = false;
                const distToTarget = bunny.group.position.distanceTo(bunny.targetPos);

                // Reached destination or timer expired
                if (bunny.wanderTimer <= 0 || distToTarget < 0.3) {
                    if (bunny.state === 'HOP') {
                        // Just finished hopping, rest a bit
                        bunny.state = 'IDLE';
                        bunny.wanderTimer = 1 + Math.random() * 3;
                    } else {
                        // Pick new hop destination
                        const hopDist = 3 + Math.random() * 8;
                        const angle = bunny.group.rotation.y + (Math.random() - 0.5) * Math.PI;
                        const newX = bunny.group.position.x + Math.cos(angle) * hopDist;
                        const newZ = bunny.group.position.z + Math.sin(angle) * hopDist;
                        bunny.targetPos.set(newX, 0, newZ);
                        bunny.targetRot = Math.atan2(newX - bunny.group.position.x, newZ - bunny.group.position.z);
                        bunny.state = 'HOP';
                        bunny.hopPhase = 0;
                        bunny.wanderTimer = 2;
                    }
                }
            }
        }

        // Get terrain height at current position
        const terrainY = typeof getTerrainHeightAt === 'function'
            ? getTerrainHeightAt(bunny.group.position.x, bunny.group.position.z) : 0;

        // Movement
        if (bunny.state === 'HOP') {
            // Move toward target (uses config speed, faster when fleeing)
            const baseSpeed = getBunnySpeed();
            const hopSpeed = bunny.isFleeing ? baseSpeed * 1.5 : baseSpeed;
            const dir = new THREE.Vector3().subVectors(bunny.targetPos, bunny.group.position);
            dir.y = 0;
            const dist = dir.length();
            if (dist > 0.3) {
                dir.normalize().multiplyScalar(hopSpeed * delta);
                bunny.group.position.add(dir);
            }

            // Hop arc (faster hops when fleeing)
            const hopFreq = bunny.isFleeing ? 12 : 8;
            bunny.hopPhase = (bunny.hopPhase || 0) + delta * hopFreq;
            const hopHeight = Math.sin(bunny.hopPhase) * 0.4;
            bunny.group.position.y = terrainY + Math.max(0, hopHeight);

            // Face movement direction
            let rotDiff = (bunny.targetRot || 0) - bunny.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            bunny.group.rotation.y += rotDiff * delta * 8;
        } else {
            // Idle - stay on ground
            bunny.group.position.y = terrainY;

            // Ear twitch
            bunny.ears[0].rotation.z = 0.2 + Math.sin(time * 3) * 0.1;
            bunny.ears[1].rotation.z = -0.2 - Math.sin(time * 3 + 1) * 0.1;
        }
    });
}


// Make available globally
window.initBunnies = initBunnies;
window.updateBunnies = updateBunnies;
window.updateBunnyState = updateBunnyState;
window.BunnySystem = BunnySystem;
