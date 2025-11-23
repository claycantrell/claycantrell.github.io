// NPC system - wandering NPC that stops and stares at player

let npc = null;
let npcState = 'wandering'; // 'wandering' or 'staring'
let npcWanderTarget = null;
let npcWanderSpeed = 5.0;
let npcDetectionDistance = 15.0; // Distance at which NPC stops and stares
let npcLeaveDistance = 20.0; // Distance at which NPC resumes wandering
let npcWanderRadius = 100.0; // How far NPC can wander from spawn (entire map)
let npcSpawnPosition = new THREE.Vector3(0, 0, 0);
let npcHasGreeted = false; // Track if NPC has greeted player
let npcIsNearby = false; // Track if player is near NPC

// Create NPC (purple version of player character)
function createNPC(spawnX = 0, spawnZ = 0) {
    const group = new THREE.Group();

    // Body with Flat Shading - Same as player but purple
    const bodySegments = PERFORMANCE.characterDetail.bodySegments;
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, bodySegments);
    const bodyMaterial = new THREE.MeshBasicMaterial({
        color: 0x8000FF, // Purple color
        flatShading: true
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Head with Flat Shading - Yellow (like player)
    const headSegments = PERFORMANCE.characterDetail.headSegments;
    const headGeometry = new THREE.SphereGeometry(0.5, headSegments, headSegments);
    const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00, // Yellow (like player)
        flatShading: true
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    group.add(head);

    // Cone Hat with Flat Shading - Purple
    const hatSegments = PERFORMANCE.characterDetail.hatSegments;
    const hatGeometry = new THREE.ConeGeometry(0.6, 1, hatSegments);
    const hatMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x8000FF, // Purple
        flatShading: true 
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
    objects.push(group);

    return group;
}

// Initialize NPC
function initNPC() {
    // Spawn NPC near the welcome doors (portals are at radius ~19.5)
    // Spawn within a decent range of portals but can wander anywhere
    const portalRadius = 19.5;
    const spawnRadius = portalRadius + 10 + Math.random() * 20; // 10-30 units from portal circle
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnX = Math.cos(spawnAngle) * spawnRadius;
    const spawnZ = Math.sin(spawnAngle) * spawnRadius;
    npc = createNPC(spawnX, spawnZ);
}

// Update NPC behavior
function updateNPC(delta) {
    if (!npc || !character) return;

    const distanceToPlayer = npc.position.distanceTo(character.position);

    if (npcState === 'wandering') {
        // Check if player is close enough to trigger stare
        if (distanceToPlayer < npcDetectionDistance) {
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
                        // Wander anywhere on map (up to boundary)
                        const boundary = 90; // Match character boundary
                        targetX = (Math.random() - 0.5) * boundary * 2;
                        targetZ = (Math.random() - 0.5) * boundary * 2;
                    }
                    
                    npcWanderTarget.set(targetX, 1, targetZ);
                } else {
                    // Move toward target
                    const direction = new THREE.Vector3();
                    direction.subVectors(npcWanderTarget, npc.position);
                    direction.y = 0;
                    direction.normalize();
                    
                    // Move NPC
                    npc.position.x += direction.x * npcWanderSpeed * delta;
                    npc.position.z += direction.z * npcWanderSpeed * delta;
                    
                    // Rotate NPC to face movement direction
                    if (direction.length() > 0.1) {
                        const angle = Math.atan2(direction.x, direction.z);
                        npc.rotation.y = angle;
                    }
                }
            }
        }
    } else if (npcState === 'staring') {
        // Check if player has left
        if (distanceToPlayer > npcLeaveDistance) {
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
                const boundary = 90;
                targetX = (Math.random() - 0.5) * boundary * 2;
                targetZ = (Math.random() - 0.5) * boundary * 2;
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

