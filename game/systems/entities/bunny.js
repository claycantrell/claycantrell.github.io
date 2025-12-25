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
    // Bunnies need to be positioned above terrain (body radius is ~0.4)
    const terrainY = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    const y = terrainY + 0.4; // Offset above terrain for bunny body
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

    // Add to scene (check both GAME.scene and global scene)
    if (typeof GAME !== 'undefined' && GAME.scene) {
        GAME.scene.add(group);
    } else if (typeof scene !== 'undefined') {
        scene.add(group);
    } else {
        console.warn('Bunny: scene not available, trying to use GAME.scene');
        // Try one more time after a brief delay in case scene isn't ready yet
        setTimeout(() => {
            if (typeof GAME !== 'undefined' && GAME.scene) {
                GAME.scene.add(group);
            }
        }, 100);
    }
    
    return {
        id: id,
        group: group,
        ears: [leftEar, rightEar],
        targetPos: new THREE.Vector3(x, y, z),
        state: 'IDLE',
        hopPhase: 0, // Initialize hop phase
        wanderTimer: 0, // Start wandering immediately
        fleeTimer: 0
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
            const terrainY = getTerrainHeightAt(data.x, data.z);
            bunny.targetPos.set(data.x, terrainY + 0.4, data.z); // Offset above terrain
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

// Check if a position collides with blocks (shared helper)
function checkBlockCollision(testX, testZ, testY, animalRadius = 0.4) {
    if (!GAME || !GAME.world?.objects) return null;
    
    const BLOCK_SIZE = 2; // Match building.js GRID_SIZE
    const BLOCK_HALF = BLOCK_SIZE / 2;
    
    for (const obj of GAME.world.objects) {
        if (!obj || !obj.userData?.isBlock || obj.userData.noCollision) continue;
        
        const blockTop = obj.position.y + BLOCK_HALF;
        const blockBottom = obj.position.y - BLOCK_HALF;
        
        // Skip if animal is on top of block or well below it
        if (testY >= blockTop - 0.2 || testY + 0.8 < blockBottom) continue;
        
        // Check horizontal overlap (AABB collision)
        const dx = Math.abs(testX - obj.position.x);
        const dz = Math.abs(testZ - obj.position.z);
        
        if (dx < BLOCK_HALF + animalRadius && dz < BLOCK_HALF + animalRadius) {
            return obj; // Return the colliding block
        }
    }
    return null;
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

            // Calculate 2D distance to target (consistent with movement check)
            const dx2 = bunny.targetPos.x - bunny.group.position.x;
            const dz2 = bunny.targetPos.z - bunny.group.position.z;
            const distToTarget2D = Math.sqrt(dx2 * dx2 + dz2 * dz2);

            // Flee behavior - player too close!
            if (distToPlayer < BUNNY_FLEE.detectRadius) {
                // Only pick new flee target if not already fleeing OR reached current target
                if (bunny.fleeTimer <= 0 || distToTarget2D < 0.5) {
                    // Hop away from player
                    const fleeAngle = Math.atan2(
                        bunny.group.position.x - playerPos.x,
                        bunny.group.position.z - playerPos.z
                    );
                    const fleeDist = BUNNY_FLEE.fleeDistance + (distToPlayer < BUNNY_FLEE.fleeRadius ? 15 : 0);
                    const newX = bunny.group.position.x + Math.sin(fleeAngle) * fleeDist;
                    const newZ = bunny.group.position.z + Math.cos(fleeAngle) * fleeDist;
                    const terrainY = typeof getTerrainHeightAt === 'function'
                        ? getTerrainHeightAt(newX, newZ) : 0;
                    bunny.targetPos.set(newX, terrainY + 0.4, newZ);
                    bunny.targetRot = fleeAngle;
                    bunny.state = 'HOP';
                    bunny.fleeTimer = BUNNY_FLEE.fleeDuration;
                    bunny.wanderTimer = BUNNY_FLEE.fleeDuration + 1;
                    bunny.isFleeing = true;
                }
            }
            // Normal wander behavior (only if not fleeing)
            else if (bunny.fleeTimer <= 0) {
                bunny.isFleeing = false;

                // Reached destination or timer expired
                if (bunny.wanderTimer <= 0 || distToTarget2D < 0.5) {
                    if (bunny.state === 'HOP') {
                        // Just finished hopping, rest a bit
                        bunny.state = 'IDLE';
                        bunny.wanderTimer = 0.5 + Math.random() * 1.5;
                    } else {
                        // Pick new hop destination
                        const hopDist = 3 + Math.random() * 8;
                        const angle = bunny.group.rotation.y + (Math.random() - 0.5) * Math.PI;
                        const newX = bunny.group.position.x + Math.sin(angle) * hopDist;
                        const newZ = bunny.group.position.z + Math.cos(angle) * hopDist;
                        const terrainY = typeof getTerrainHeightAt === 'function'
                            ? getTerrainHeightAt(newX, newZ) : 0;
                        bunny.targetPos.set(newX, terrainY + 0.4, newZ);
                        bunny.targetRot = Math.atan2(newX - bunny.group.position.x, newZ - bunny.group.position.z);
                        bunny.state = 'HOP';
                        bunny.hopPhase = Math.random() * Math.PI * 2;
                        bunny.wanderTimer = 2 + Math.random() * 2;
                    }
                }
            }
            // Currently fleeing but not close to player - just keep hopping to target
            else {
                bunny.isFleeing = true;
            }
        }

        // Get terrain height at current position (update every frame for accuracy)
        const currentTerrainY = typeof getTerrainHeightAt === 'function'
            ? getTerrainHeightAt(bunny.group.position.x, bunny.group.position.z) : 0;
        const baseHeight = currentTerrainY + 0.4; // Base height above terrain

        // Movement
        if (bunny.state === 'HOP') {
            // Move toward target (uses config speed, faster when fleeing)
            const baseSpeed = getBunnySpeed();
            const hopSpeed = bunny.isFleeing ? baseSpeed * 1.5 : baseSpeed;
            const dir = new THREE.Vector3().subVectors(bunny.targetPos, bunny.group.position);
            dir.y = 0;
            const dist = dir.length();
            
            // Only hop if actually moving toward target
            if (dist > 0.5) {
                // Move forward
                dir.normalize().multiplyScalar(hopSpeed * delta);
                
                // Check for block collisions before moving
                const newX = bunny.group.position.x + dir.x;
                const newZ = bunny.group.position.z + dir.z;
                const animalY = bunny.group.position.y;
                
                const collidingBlock = checkBlockCollision(newX, newZ, animalY, 0.4);
                
                if (collidingBlock) {
                    // Blocked! Try to find alternative path - move perpendicular to block
                    const blockDir = new THREE.Vector3(newX - collidingBlock.position.x, 0, newZ - collidingBlock.position.z).normalize();
                    const perpDir = new THREE.Vector3(-blockDir.z, 0, blockDir.x);
                    const altX = bunny.group.position.x + perpDir.x * hopSpeed * delta;
                    const altZ = bunny.group.position.z + perpDir.z * hopSpeed * delta;
                    
                    // Check if alternative path is clear
                    if (!checkBlockCollision(altX, altZ, animalY, 0.4)) {
                        bunny.group.position.x = altX;
                        bunny.group.position.z = altZ;
                    }
                    // If alternative is also blocked, don't move (bunny stops)
                } else {
                    // Path is clear, move normally
                    bunny.group.position.add(dir);
                }
                
                // Recalculate terrain height after movement
                const newTerrainY = typeof getTerrainHeightAt === 'function'
                    ? getTerrainHeightAt(bunny.group.position.x, bunny.group.position.z) : 0;
                const newBaseHeight = newTerrainY + 0.4;
                
                // Hop arc - BIG hops with proper timing
                if (bunny.hopPhase === undefined) {
                    bunny.hopPhase = 0;
                }
                
                // Slower hop frequency for distinct hops (not continuous bobbing)
                const hopFreq = bunny.isFleeing ? 3.5 : 2.5;
                bunny.hopPhase += delta * hopFreq;
                
                // Keep hopPhase in reasonable range to prevent overflow
                if (bunny.hopPhase > Math.PI * 10) {
                    bunny.hopPhase = bunny.hopPhase % (Math.PI * 2);
                }
                
                // Create distinct hop arcs - BIG hops when phase is in the "air" part (0 to PI)
                const normalizedPhase = bunny.hopPhase % (Math.PI * 2);
                let hopHeight = 0;
                
                if (normalizedPhase < Math.PI) {
                    // In the air - create a BIG parabolic arc
                    // Use sin for smooth arc, peak at PI/2
                    hopHeight = Math.sin(normalizedPhase) * 0.9; // BIG hops (was 0.3)
                }
                // When normalizedPhase >= PI, bunny is on ground (hopHeight = 0)
                
                // Ensure bunny never goes below terrain
                bunny.group.position.y = Math.max(newBaseHeight + hopHeight, newTerrainY + 0.2);
            } else {
                // Reached destination - stay on ground, no hopping
                bunny.group.position.y = Math.max(baseHeight, currentTerrainY + 0.2);
            }

            // Face movement direction
            let rotDiff = (bunny.targetRot || 0) - bunny.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            bunny.group.rotation.y += rotDiff * delta * 8;
        } else {
            // Idle - stay on ground (ensure above terrain)
            bunny.group.position.y = Math.max(baseHeight, currentTerrainY + 0.2);

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
