// Animal Synchronization (Client-Side)
// Receives World State from Server -> Updates Local Entities

function handleAnimalUpdate(data) {
    if (data.type === 'worldState') {
        // Update Deer
        if (typeof updateDeerState === 'function') {
            updateDeerState(data.deer);
        }
        
        // Update Bunnies
        if (typeof updateBunnyState === 'function') {
            updateBunnyState(data.bunnies);
        }
        
        // Update Birds
        if (typeof updateBirdState === 'function') {
            updateBirdState(data.birds);
        }

        // Update NPC
        if (typeof npc !== 'undefined' && data.npc) {
            npc.position.x = data.npc.x;
            npc.position.z = data.npc.z;
            if (typeof getTerrainHeightAt === 'function') {
                 npc.position.y = getTerrainHeightAt(data.npc.x, data.npc.z) + 1.0;
            }
        }
    }
}

// Deprecated functions (keeping empty to prevent errors if called)
function packAnimalData() { return []; }
function sendAnimalUpdates() {}
