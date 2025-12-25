// NPC system - wandering NPC that stops and stares at player
// Uses Systems registry pattern for organized update loop

// NPCSystem - manages NPC creation and behavior
const NPCSystem = {
    init() {
        initNPC();
    },

    update(delta) {
        updateNPC(delta);
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('npc', NPCSystem);
}

let npc = null;
let npcState = 'wandering'; // 'wandering' or 'staring'
let npcWanderTarget = null;
let npcSpawnPosition = new THREE.Vector3(0, 0, 0);
let npcHasGreeted = false; // Track if NPC has greeted player
let npcIsNearby = false; // Track if player is near NPC

// Get NPC config values from config with fallbacks
function getNPCConfig() {
    if (typeof CONFIG === 'undefined') {
        return {
            enabled: true, speed: 5.0, detectionDistance: 15.0,
            leaveDistance: 20.0, wanderRadius: 100.0,
            spawnRadius: { min: 29.5, max: 49.5 }
        };
    }
    return {
        enabled: CONFIG.get('entities.npc.enabled', true),
        speed: CONFIG.get('entities.npc.speed', 5.0),
        detectionDistance: CONFIG.get('entities.npc.detectionDistance', 15.0),
        leaveDistance: CONFIG.get('entities.npc.leaveDistance', 20.0),
        wanderRadius: CONFIG.get('entities.npc.wanderRadius', 100.0),
        spawnRadius: {
            min: CONFIG.get('entities.npc.spawnRadius.min', 29.5),
            max: CONFIG.get('entities.npc.spawnRadius.max', 49.5)
        }
    };
}

// Create NPC (purple version of player character)
function createNPC(spawnX = 0, spawnZ = 0) {
    const group = new THREE.Group();

    // Body with Flat Shading - Same as player but purple
    const bodySegments = PERFORMANCE.characterDetail.bodySegments;
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, bodySegments);
    const bodyMaterial = new THREE.MeshBasicMaterial({
        color: 0x8000FF // Purple color
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Head with Flat Shading - Yellow (like player)
    const headSegments = PERFORMANCE.characterDetail.headSegments;
    const headGeometry = new THREE.SphereGeometry(0.5, headSegments, headSegments);
    const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00 // Yellow (like player)
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    group.add(head);

    // Cone Hat with Flat Shading - Purple
    const hatSegments = PERFORMANCE.characterDetail.hatSegments;
    const hatGeometry = new THREE.ConeGeometry(0.6, 1, hatSegments);
    const hatMaterial = new THREE.MeshBasicMaterial({
        color: 0x8000FF // Purple
    });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 2.3;
    group.add(hat);

    group.position.set(spawnX, 1, spawnZ);
    npcSpawnPosition.set(spawnX, 1, spawnZ);
    
    // Set initial wander target
    npcWanderTarget = new THREE.Vector3(
        spawnX + (Math.random() - 0.5) * 20,
        1,
        spawnZ + (Math.random() - 0.5) * 20
    );

    scene.add(group);
    GAME.world.objects.push(group);

    return group;
}

// Initialize NPC
function initNPC() {
    const config = getNPCConfig();

    // Check if NPC is enabled for this map
    if (!config.enabled) {
        if (typeof gameLog === 'function') gameLog("NPC disabled for this map");
        return;
    }

    // Use seeded random for consistent spawn
    const seedOffset = 9999;
    const spawnRadius = config.spawnRadius.min + seededRandom(seedOffset) * (config.spawnRadius.max - config.spawnRadius.min);
    const spawnAngle = seededRandom(seedOffset + 1) * Math.PI * 2;

    const spawnX = Math.cos(spawnAngle) * spawnRadius;
    const spawnZ = Math.sin(spawnAngle) * spawnRadius;
    npc = createNPC(spawnX, spawnZ);

    // Sync to GAME namespace
    syncNPCToGameNamespace();

    if (typeof gameLog === 'function') gameLog(`NPC spawned at radius ${spawnRadius.toFixed(1)}`);
}

// Update NPC behavior
function updateNPC(delta) {
    const config = getNPCConfig();

    // If we are NOT the host and multiplayer is active, skip update logic (let sync handle it)
    // Check global isAnimalHost flag from animal-sync.js
    if (typeof isAnimalHost !== 'undefined' && !isAnimalHost && typeof isConnected !== 'undefined' && isConnected) {
        // Update distance/nearby status for CHAT even if movement is synced
        // This allows non-hosts to interact with Scribe chat
        const dist = npc.position.distanceTo(character.position);
        npcIsNearby = dist < config.detectionDistance;
        
        if (npcIsNearby && !npcHasGreeted && typeof addChatMessage === 'function') {
             const greetings = [
                'Hail, traveler! I am a wandering scribe of the elder days. What tidings dost thou bring?',
                'Greetings, wayfarer! I am a scribe who wandereth these lands. Speak, and I shall hear thy words.',
                'Well met, stranger! I am a scribe of old, keeper of tales. What wouldst thou share with me?',
                'Hark! A traveler approacheth. I am a wandering scribe. What news dost thou bear?'
            ];
            const greeting = greetings[Math.floor(Math.random() * greetings.length)];
            addChatMessage('Wandering Scribe', greeting, false);
            npcHasGreeted = true;
        }
        // Reset greeted if far away
        if (dist > config.leaveDistance) {
            npcHasGreeted = false;
            npcIsNearby = false;
        }
        return;
    }

    if (!npc || !character || !isTerrainReady) return; // Also wait for terrain

    const distanceToPlayer = npc.position.distanceTo(character.position);

    if (npcState === 'wandering') {
        // Check if player is close enough to trigger stare
        if (distanceToPlayer < config.detectionDistance) {
            npcState = 'staring';
            npcIsNearby = true;
            // Stop moving immediately
            npcWanderTarget = null;
            
            // Send greeting message if haven't greeted yet
            if (!npcHasGreeted && typeof addChatMessage === 'function') {
                const greetings = [
                    'Hail, traveler! I am a wandering scribe of the elder days. What tidings dost thou bring?',
                    'Greetings, wayfarer! I am a scribe who wandereth these lands. Speak, and I shall hear thy words.',
                    'Well met, stranger! I am a scribe of old, keeper of tales. What wouldst thou share with me?',
                    'Hark! A traveler approacheth. I am a wandering scribe. What news dost thou bear?'
                ];
                const greeting = greetings[Math.floor(Math.random() * greetings.length)];
                addChatMessage('Wandering Scribe', greeting, false);
                npcHasGreeted = true;
            }
        } else {
            npcIsNearby = false;
            // Continue wandering
            if (npcWanderTarget) {
                const distanceToTarget = npc.position.distanceTo(npcWanderTarget);
                
                if (distanceToTarget < 2.0) {
                    // Reached target, pick new random target anywhere on map
                    // Prefer staying near portal area but can go anywhere
                    const preferNearPortals = Math.random() < 0.7; // 70% chance to stay near portals
                    let targetX, targetZ;
                    
                    if (preferNearPortals) {
                        // Wander near portal area (radius ~50 from center)
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.random() * 50 + 10;
                        targetX = Math.cos(angle) * distance;
                        targetZ = Math.sin(angle) * distance;
                    } else {
                        // Wander nearby (relative to current position)
                        const wanderRange = 300;
                        targetX = npc.position.x + (Math.random() - 0.5) * wanderRange;
                        targetZ = npc.position.z + (Math.random() - 0.5) * wanderRange;
                    }
                    
                    npcWanderTarget.set(targetX, 1, targetZ);
                } else {
                    // Move toward target
                    const direction = new THREE.Vector3().subVectors(npcWanderTarget, npc.position).normalize();
                    npc.position.addScaledVector(direction, config.speed * delta);

                    // Update NPC height to follow terrain
                    const terrainHeight = getTerrainHeightAt(npc.position.x, npc.position.z);
                    npc.position.y = terrainHeight + 1.0;

                    // Rotate to face wander target
                    const targetAngle = Math.atan2(direction.x, direction.z);
                    npc.rotation.y = targetAngle;
                }
            }
        }
    } else if (npcState === 'staring') {
        // Check if player has left
        if (distanceToPlayer > config.leaveDistance) {
            npcState = 'wandering';
            npcIsNearby = false;
            npcHasGreeted = false; // Reset greeting for next encounter
            // Clear conversation history when player leaves
            if (typeof clearNPCConversationHistory === 'function') {
                clearNPCConversationHistory();
            }
            // Pick new wander target (prefer near portal area)
            const preferNearPortals = Math.random() < 0.7;
            let targetX, targetZ;
            
            if (preferNearPortals) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 50 + 10;
                targetX = Math.cos(angle) * distance;
                targetZ = Math.sin(angle) * distance;
            } else {
                const wanderRange = 300;
                targetX = npc.position.x + (Math.random() - 0.5) * wanderRange;
                targetZ = npc.position.z + (Math.random() - 0.5) * wanderRange;
            }
            
            npcWanderTarget = new THREE.Vector3(targetX, 1, targetZ);
        } else {
            npcIsNearby = true;
            // Stare at player - rotate to face player
            const direction = new THREE.Vector3();
            direction.subVectors(character.position, npc.position);
            direction.y = 0;
            direction.normalize();
            
            if (direction.length() > 0.1) {
                const angle = Math.atan2(direction.x, direction.z);
                npc.rotation.y = angle;
            }
        }
    }
}

// Check if player is near NPC (for chat system)
function isPlayerNearNPC() {
    return npcIsNearby;
}

// Sync local NPC state to GAME namespace
function syncNPCToGameNamespace() {
    if (typeof GAME !== 'undefined' && GAME.npc) {
        GAME.npc.entity = npc;
        GAME.npc.state = npcState;
        GAME.npc.target = npcWanderTarget;
        GAME.npc.spawnPosition = npcSpawnPosition;
        GAME.npc.hasGreeted = npcHasGreeted;
        GAME.npc.isNearby = npcIsNearby;
    }
    if (typeof GAME !== 'undefined' && GAME.world?.entities) {
        GAME.world.entities.npc = npc;
    }
}

// Make available globally
window.initNPC = initNPC;
window.updateNPC = updateNPC;
window.isPlayerNearNPC = isPlayerNearNPC;
window.syncNPCToGameNamespace = syncNPCToGameNamespace;
window.NPCSystem = NPCSystem;
