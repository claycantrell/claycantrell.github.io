// Animal Synchronization (Client-Side)
// Receives World State from Server -> Updates Local Entities
// Uses Systems registry pattern for organized update loop

// AnimalSyncSystem - handles server-side animal state updates
const AnimalSyncSystem = {
    init() {
        // Socket handlers are set up in client.js
    },

    update(delta) {
        // Animal state is received via socket, no per-frame update needed
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('animalSync', AnimalSyncSystem);
}

function handleAnimalUpdate(data) {
    if (data.type === 'worldState') {
        // Update Deer
        if (typeof updateDeerState === 'function' && data.deer) {
            updateDeerState(data.deer);
        }

        // Update Cows
        if (typeof updateCowState === 'function' && data.cows) {
            updateCowState(data.cows);
        }

        // Update Bunnies
        if (typeof updateBunnyState === 'function' && data.bunnies) {
            updateBunnyState(data.bunnies);
        }

        // Update Birds
        if (typeof updateBirdState === 'function' && data.birds) {
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

// Make available globally
window.handleAnimalUpdate = handleAnimalUpdate;
window.AnimalSyncSystem = AnimalSyncSystem;
