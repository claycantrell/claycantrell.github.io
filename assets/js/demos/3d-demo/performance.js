// Performance optimizations for retro/low-end hardware emulation
// This file contains performance settings and optimizations

// Performance configuration
const PERFORMANCE = {
    // Tree count - increased for larger map
    treeCount: 700,
    
    // Reduce tree detail (keeping some optimizations but restoring foliage layers)
    treeDetail: {
        trunkSegments: 4,      // Was 8 (kept reduced for performance)
        sphereSegments: 4,      // Was 6x6 (kept reduced for performance)
        coneSegments: 4,        // Was 5 (kept reduced for performance)
        foliageLayers: 3       // Restored to 3 layers
    },
    
    // Character detail - restored to original
    characterDetail: {
        bodySegments: 6,        // Restored to 6
        headSegments: 6,        // Restored to 6x6
        hatSegments: 4          // Restored to 4
    },
    
    // Portal optimizations
    portalDetail: {
        frameSegments: 1,       // Box is already low-poly
        disableText: false      // Can disable text for even lower load
    },
    
    // Rendering optimizations
    rendering: {
        maxDrawDistance: 300,   // Increased draw distance for larger map
        frustumCulling: true,   // Only render visible objects
        materialSharing: true,  // Share materials to reduce draw calls
        lodEnabled: true,       // Enable Level of Detail (2D sprites for distant trees)
        lodDistance: 80,        // Distance threshold: beyond this, use 2D sprites
        lodUpdateInterval: 500  // Update LOD every 500ms (not every frame for performance)
    }
};

// Initialize shared materials (reuse instead of creating new ones)
// sharedMaterials is declared globally in core.js
function initSharedMaterials() {
    sharedMaterials.trunk = new THREE.MeshBasicMaterial({ 
        color: 0x8B4513, 
        flatShading: true 
    });
    sharedMaterials.foliage1 = new THREE.MeshBasicMaterial({ 
        color: 0x006400, 
        flatShading: true 
    });
    sharedMaterials.foliage2 = new THREE.MeshBasicMaterial({ 
        color: 0x008000, 
        flatShading: true 
    });
    sharedMaterials.foliage3 = new THREE.MeshBasicMaterial({ 
        color: 0x228B22, 
        flatShading: true 
    });
    // New Autumn Oak Materials
    sharedMaterials.oakTrunk = new THREE.MeshBasicMaterial({
        color: 0x4A3728, // Darker wood
        flatShading: true
    });
    sharedMaterials.oakFoliage1 = new THREE.MeshBasicMaterial({
        color: 0x004d00, // Dark Green
        flatShading: true
    });
    sharedMaterials.oakFoliage2 = new THREE.MeshBasicMaterial({
        color: 0x006400, // Slightly lighter Dark Green
        flatShading: true
    });
    sharedMaterials.oakFoliage3 = new THREE.MeshBasicMaterial({
        color: 0x2E8B57, // Sea Green (darkish)
        flatShading: true 
    });
    sharedMaterials.ground = new THREE.MeshBasicMaterial({ 
        color: 0x004d00, 
        flatShading: true 
    });
}

// Check if object is in camera frustum (simple distance check)
function isInView(object, camera) {
    if (!PERFORMANCE.rendering.frustumCulling) return true;
    
    const distance = camera.position.distanceTo(object.position);
    return distance < PERFORMANCE.rendering.maxDrawDistance;
}

