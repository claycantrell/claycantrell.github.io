// Bunny system for 3D Demo (Client-Side Rendering Only)
// Receives state from server, updates visual models.
// Uses Systems registry pattern and shared utilities

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

// Use GAME namespace for centralized entity storage
const bunnyList = (typeof GAME !== 'undefined' && GAME.world?.entities)
    ? GAME.world.entities.bunnies
    : [];

// Create a single bunny visual entity
function createBunny(id, x, z) {
    const group = new THREE.Group();

    // Materials - use Lambert for shadows
    const colors = [0xFFFFFF, 0xDCDCDC, 0xD2B48C, 0xA9A9A9];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const bunnyMaterial = new THREE.MeshLambertMaterial({ color: color });
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

    // Get config with fallback
    const config = (typeof ENTITY_CONFIG !== 'undefined' && ENTITY_CONFIG.bunny) ? ENTITY_CONFIG.bunny : { heightOffset: 0.4 };
    const heightOffset = config.heightOffset || 0.4;

    // Initial placement
    const terrainY = getTerrainHeight(x, z);
    const y = terrainY + heightOffset;
    group.position.set(x, y, z);
    const scale = 0.8 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);

    // Enable shadows
    enableShadows(group);

    // Add to scene
    addToScene(group);

    return {
        id: id,
        group: group,
        ears: [leftEar, rightEar],
        targetPos: new THREE.Vector3(x, y, z),
        state: 'IDLE',
        hopPhase: 0,
        wanderTimer: 0,
        fleeTimer: 0
    };
}

// Init called by main game
function initBunnies() {
    // Bunny system ready - animal-spawner.js handles spawning
}

// Called by animal-sync.js
function updateBunnyState(serverData) {
    const config = ENTITY_CONFIG.bunny;

    serverData.forEach(data => {
        let bunny = bunnyList.find(b => b.id === data.id);
        if (!bunny) {
            bunny = createBunny(data.id, data.x, data.z);
            bunnyList.push(bunny);
        }

        const terrainY = getTerrainHeight(data.x, data.z);
        bunny.targetPos.set(data.x, terrainY + config.heightOffset, data.z);
        bunny.state = data.state;
    });
}

// Render Loop
function updateBunnies(delta) {
    const time = Date.now() * 0.001;

    // Defensive: ensure config exists
    if (typeof ENTITY_CONFIG === 'undefined' || !ENTITY_CONFIG.bunny) {
        console.warn('ENTITY_CONFIG.bunny not available');
        return;
    }

    const config = ENTITY_CONFIG.bunny;
    const fleeConfig = config.flee;
    const wanderConfig = config.wander;
    const animConfig = config.animation;

    bunnyList.forEach(bunny => {
        // Local/spawned bunny behavior
        if (bunny.id.startsWith('local_') || bunny.id.startsWith('spawned_')) {
            bunny.wanderTimer = (bunny.wanderTimer || 0) - delta;
            bunny.fleeTimer = (bunny.fleeTimer || 0) - delta;

            // Check distance to player using shared utility
            const distToPlayer = getDistanceToPlayer(bunny.group.position);
            const distToTarget2D = getDistance2D(bunny.group.position, bunny.targetPos);

            // Flee behavior - player too close!
            if (distToPlayer < fleeConfig.detectRadius) {
                if (bunny.fleeTimer <= 0 || distToTarget2D < 0.5) {
                    const panicBonus = distToPlayer < fleeConfig.panicRadius ? fleeConfig.panicBonus : 0;
                    const fleeTarget = calculateFleeTarget(bunny.group.position, fleeConfig.distance, panicBonus);

                    if (fleeTarget) {
                        const terrainY = getTerrainHeight(fleeTarget.x, fleeTarget.z);
                        bunny.targetPos.set(fleeTarget.x, terrainY + config.heightOffset, fleeTarget.z);
                        bunny.targetRot = fleeTarget.angle;
                        bunny.state = 'HOP';
                        bunny.fleeTimer = fleeConfig.duration;
                        bunny.wanderTimer = fleeConfig.duration + 1;
                        bunny.isFleeing = true;
                    }
                }
            }
            // Normal wander behavior
            else if (bunny.fleeTimer <= 0) {
                bunny.isFleeing = false;

                if (bunny.wanderTimer <= 0 || distToTarget2D < 0.5) {
                    if (bunny.state === 'HOP') {
                        bunny.state = 'IDLE';
                        bunny.wanderTimer = wanderConfig.idleDuration.min +
                            Math.random() * (wanderConfig.idleDuration.max - wanderConfig.idleDuration.min);
                    } else {
                        const wanderTarget = calculateWanderTarget(
                            bunny.group.position,
                            bunny.group.rotation.y,
                            wanderConfig.minDistance,
                            wanderConfig.maxDistance
                        );

                        const terrainY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                        bunny.targetPos.set(wanderTarget.x, terrainY + config.heightOffset, wanderTarget.z);
                        bunny.targetRot = wanderTarget.angle;
                        bunny.state = 'HOP';
                        bunny.hopPhase = Math.random() * Math.PI * 2;
                        bunny.wanderTimer = wanderConfig.moveDuration.min +
                            Math.random() * (wanderConfig.moveDuration.max - wanderConfig.moveDuration.min);
                    }
                }
            } else {
                bunny.isFleeing = true;
            }
        }

        // Get terrain height at current position
        const currentTerrainY = getTerrainHeight(bunny.group.position.x, bunny.group.position.z);
        const baseHeight = currentTerrainY + config.heightOffset;

        // Movement
        if (bunny.state === 'HOP') {
            const baseSpeed = getEntitySpeed('bunny');
            const hopSpeed = bunny.isFleeing ? baseSpeed * 1.5 : baseSpeed;
            const dir = new THREE.Vector3().subVectors(bunny.targetPos, bunny.group.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist > 0.5) {
                dir.normalize().multiplyScalar(hopSpeed * delta);

                // Check for block collisions
                const newX = bunny.group.position.x + dir.x;
                const newZ = bunny.group.position.z + dir.z;

                const collidingBlock = checkBlockCollision(newX, newZ, bunny.group.position.y, config.collisionRadius);

                if (collidingBlock) {
                    const altPath = findAlternativePath(bunny.group.position, collidingBlock, hopSpeed, delta, config.collisionRadius);
                    if (altPath) {
                        bunny.group.position.x = altPath.x;
                        bunny.group.position.z = altPath.z;
                    }
                } else {
                    bunny.group.position.add(dir);
                }

                // Recalculate terrain height after movement
                const newTerrainY = getTerrainHeight(bunny.group.position.x, bunny.group.position.z);
                const newBaseHeight = newTerrainY + config.heightOffset;

                // Hop arc
                if (bunny.hopPhase === undefined) bunny.hopPhase = 0;

                const hopFreq = bunny.isFleeing ? animConfig.hopFrequencyFlee : animConfig.hopFrequency;
                bunny.hopPhase += delta * hopFreq;

                if (bunny.hopPhase > Math.PI * 10) {
                    bunny.hopPhase = bunny.hopPhase % (Math.PI * 2);
                }

                const normalizedPhase = bunny.hopPhase % (Math.PI * 2);
                let hopHeight = 0;

                if (normalizedPhase < Math.PI) {
                    hopHeight = Math.sin(normalizedPhase) * animConfig.hopHeight;
                }

                bunny.group.position.y = Math.max(newBaseHeight + hopHeight, newTerrainY + 0.2);
            } else {
                bunny.group.position.y = Math.max(baseHeight, currentTerrainY + 0.2);
            }

            // Face movement direction
            bunny.group.rotation.y = smoothRotateToward(
                bunny.group.rotation.y,
                bunny.targetRot || 0,
                delta,
                animConfig.rotationSpeed
            );
        } else {
            // Idle
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
window.bunnyList = bunnyList;
window.createBunny = createBunny;
