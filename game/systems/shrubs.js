// Shrub system - biome-specific sprite-based ground vegetation
// Shrubs are 2D billboards that always face the camera

// Shrub type definitions per biome
const SHRUB_TYPES = {
    // === HOT BIOMES ===
    desert: {
        density: 0.08,
        types: [
            { name: 'cactus', color: 0x2d5a27, height: 3, width: 1.5, weight: 0.4 },
            { name: 'desertBush', color: 0x8b7355, height: 1.5, width: 2, weight: 0.4 },
            { name: 'deadBush', color: 0x6b4423, height: 1, width: 1.5, weight: 0.2 }
        ]
    },
    badlands: {
        density: 0.05,
        types: [
            { name: 'deadBush', color: 0x8b6914, height: 1, width: 1.5, weight: 0.5 },
            { name: 'rock', color: 0xcd853f, height: 1.5, width: 2, weight: 0.3 },
            { name: 'smallRock', color: 0xb8860b, height: 0.8, width: 1.2, weight: 0.2 }
        ]
    },
    jungle: {
        density: 0.7,
        types: [
            { name: 'fern', color: 0x228b22, height: 2, width: 2.5, weight: 0.4 },
            { name: 'tropicalPlant', color: 0x32cd32, height: 2.5, width: 2, weight: 0.3 },
            { name: 'largeFern', color: 0x006400, height: 3, width: 3, weight: 0.3 }
        ]
    },

    // === WARM BIOMES ===
    grassland: {
        density: 0.25,
        types: [
            { name: 'grassClump', color: 0x9acd32, height: 1, width: 1.5, weight: 0.5 },
            { name: 'smallBush', color: 0x6b8e23, height: 1.5, width: 2, weight: 0.3 },
            { name: 'wildflower', color: 0xadff2f, height: 0.8, width: 1, weight: 0.2 }
        ]
    },
    savanna: {
        density: 0.12,
        types: [
            { name: 'tallGrass', color: 0xbdb76b, height: 1.5, width: 1, weight: 0.5 },
            { name: 'dryBush', color: 0x8b7355, height: 1.2, width: 1.8, weight: 0.3 },
            { name: 'deadBush', color: 0xa0522d, height: 0.8, width: 1.2, weight: 0.2 }
        ]
    },
    warmForest: {
        density: 0.55,
        types: [
            { name: 'fern', color: 0x32cd32, height: 1.5, width: 2, weight: 0.4 },
            { name: 'bush', color: 0x228b22, height: 2, width: 2.5, weight: 0.35 },
            { name: 'wildflower', color: 0x90ee90, height: 0.8, width: 1, weight: 0.25 }
        ]
    },

    // === TEMPERATE BIOMES ===
    plains: {
        density: 0.3,
        types: [
            { name: 'grassClump', color: 0x7cba3d, height: 1.2, width: 1.5, weight: 0.5 },
            { name: 'bush', color: 0x556b2f, height: 1.8, width: 2.2, weight: 0.3 },
            { name: 'tallGrass', color: 0x6b8e23, height: 1.5, width: 1, weight: 0.2 }
        ]
    },
    meadow: {
        density: 0.35,
        types: [
            { name: 'wildflower', color: 0x90ee90, height: 0.8, width: 1, weight: 0.4 },
            { name: 'grassClump', color: 0x7cba3d, height: 1, width: 1.5, weight: 0.35 },
            { name: 'smallBush', color: 0x6b8e23, height: 1.2, width: 1.5, weight: 0.25 }
        ]
    },
    forest: {
        density: 0.5,
        types: [
            { name: 'fern', color: 0x228b22, height: 1.5, width: 2, weight: 0.4 },
            { name: 'berryBush', color: 0x2e8b57, height: 2, width: 2.5, weight: 0.3 },
            { name: 'forestFloor', color: 0x355e3b, height: 0.8, width: 2, weight: 0.3 }
        ]
    },
    highlands: {
        density: 0.2,
        types: [
            { name: 'rock', color: 0x696969, height: 1.5, width: 2, weight: 0.3 },
            { name: 'alpineShrub', color: 0x556b2f, height: 1.2, width: 1.8, weight: 0.35 },
            { name: 'grassClump', color: 0x5a6e4a, height: 1, width: 1.5, weight: 0.35 }
        ]
    },
    mountains: {
        density: 0.35,
        types: [
            { name: 'boulder', color: 0x606060, height: 4, width: 5, weight: 0.25 },
            { name: 'rock', color: 0x707070, height: 2, width: 3, weight: 0.3 },
            { name: 'smallRock', color: 0x808080, height: 1, width: 1.5, weight: 0.25 },
            { name: 'alpineShrub', color: 0x556b2f, height: 1, width: 1.5, weight: 0.1 },
            { name: 'rockMoss', color: 0x6b7b6b, height: 0.3, width: 1.5, weight: 0.1 }
        ]
    },

    // === COLD BIOMES ===
    coldPlains: {
        density: 0.2,
        types: [
            { name: 'grassClump', color: 0x5d7052, height: 1, width: 1.5, weight: 0.5 },
            { name: 'coldBush', color: 0x4a5d23, height: 1.2, width: 1.8, weight: 0.3 },
            { name: 'moss', color: 0x556b2f, height: 0.4, width: 1.5, weight: 0.2 }
        ]
    },
    coldForest: {
        density: 0.4,
        types: [
            { name: 'fern', color: 0x355e3b, height: 1.2, width: 1.8, weight: 0.35 },
            { name: 'moss', color: 0x4a5d23, height: 0.5, width: 2, weight: 0.35 },
            { name: 'coldBush', color: 0x3d5c3d, height: 1.5, width: 2, weight: 0.3 }
        ]
    },
    taiga: {
        density: 0.35,
        types: [
            { name: 'lowPine', color: 0x2f4f4f, height: 1.5, width: 2, weight: 0.4 },
            { name: 'moss', color: 0x4a5d23, height: 0.5, width: 2, weight: 0.3 },
            { name: 'coldBush', color: 0x3d5c3d, height: 1.2, width: 1.8, weight: 0.3 }
        ]
    },

    // === FROZEN BIOMES ===
    tundra: {
        density: 0.1,
        types: [
            { name: 'lichen', color: 0x708090, height: 0.3, width: 1.5, weight: 0.5 },
            { name: 'arcticMoss', color: 0x6b7b6b, height: 0.4, width: 2, weight: 0.3 },
            { name: 'stuntedShrub', color: 0x556b2f, height: 0.8, width: 1.2, weight: 0.2 }
        ]
    },
    snowySlopes: {
        density: 0.15,
        types: [
            { name: 'rock', color: 0x909098, height: 1.5, width: 2, weight: 0.4 },
            { name: 'smallRock', color: 0xa0a0a8, height: 0.8, width: 1.2, weight: 0.35 },
            { name: 'snowLichen', color: 0xb0c4de, height: 0.2, width: 1, weight: 0.25 }
        ]
    },
    snowyPeaks: {
        density: 0.25,
        types: [
            { name: 'boulder', color: 0x808890, height: 5, width: 6, weight: 0.3 },
            { name: 'rock', color: 0x909098, height: 2.5, width: 3.5, weight: 0.35 },
            { name: 'smallRock', color: 0xa0a0a8, height: 1.2, width: 2, weight: 0.25 },
            { name: 'snowLichen', color: 0xb0c4de, height: 0.2, width: 1, weight: 0.1 }
        ]
    },

    // === COASTAL BIOMES ===
    beach: {
        density: 0.15,
        types: [
            { name: 'beachGrass', color: 0xbdb76b, height: 1, width: 1.2, weight: 0.6 },
            { name: 'driftwood', color: 0x8b7355, height: 0.5, width: 2, weight: 0.2 },
            { name: 'seaOats', color: 0xc2b280, height: 1.5, width: 0.8, weight: 0.2 }
        ]
    },
    stonyShore: {
        density: 0.3,
        types: [
            { name: 'rock', color: 0x696969, height: 1.5, width: 2, weight: 0.4 },
            { name: 'smallRock', color: 0x808080, height: 0.8, width: 1.2, weight: 0.4 },
            { name: 'seaweed', color: 0x2e8b57, height: 0.5, width: 1, weight: 0.2 }
        ]
    }
};

// Shrub storage
let shrubData = [];
let shrubGroup = null;

// Configuration - large radius to match tree coverage
const SHRUB_CONFIG = {
    maxShrubs: 3000,
    maxAttempts: 6000,
    minDistanceFromCenter: 25,
    radius: 3000,  // Match tree radius for full coverage
    minSpacing: 6,
    updateDistance: 150
};

// Create a single shrub sprite
function createShrubSprite(x, z, shrubType, terrainHeight) {
    const spriteGroup = new THREE.Group();

    // Create the shrub shape based on type
    let shape;
    const color = new THREE.Color(shrubType.color);

    // Add slight color variation
    const variation = 0.15;
    color.r = Math.max(0, Math.min(1, color.r + (Math.random() - 0.5) * variation));
    color.g = Math.max(0, Math.min(1, color.g + (Math.random() - 0.5) * variation));
    color.b = Math.max(0, Math.min(1, color.b + (Math.random() - 0.5) * variation));

    const material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide
    });

    // Scale with slight randomness - make shrubs bigger and more visible
    const scale = 1.5 + Math.random() * 1.0;
    const height = shrubType.height * scale;
    const width = shrubType.width * scale;

    // Create shape based on shrub type
    if (shrubType.name === 'boulder' || shrubType.name === 'rock' || shrubType.name === 'smallRock') {
        // Irregular rock/boulder shape - jagged polygon
        shape = new THREE.Shape();
        const points = 7 + Math.floor(Math.random() * 4); // 7-10 points
        const angleStep = (Math.PI * 2) / points;

        for (let i = 0; i <= points; i++) {
            const angle = i * angleStep - Math.PI / 2; // Start from bottom
            // Vary radius for irregular shape
            const radiusX = (width / 2) * (0.7 + Math.random() * 0.5);
            const radiusY = (height / 2) * (0.6 + Math.random() * 0.6);
            const px = Math.cos(angle) * radiusX;
            const py = Math.sin(angle) * radiusY + height / 2;

            if (i === 0) {
                shape.moveTo(px, Math.max(0, py));
            } else {
                shape.lineTo(px, Math.max(0, py));
            }
        }
    } else if (shrubType.name === 'cactus') {
        // Tall vertical cactus shape
        shape = new THREE.Shape();
        shape.moveTo(0, height);
        shape.lineTo(width * 0.3, height * 0.7);
        shape.lineTo(width * 0.3, 0);
        shape.lineTo(-width * 0.3, 0);
        shape.lineTo(-width * 0.3, height * 0.7);
        shape.lineTo(0, height);
    } else if (shrubType.name.includes('grass') || shrubType.name === 'seaOats' || shrubType.name === 'tallGrass') {
        // Spiky grass clump
        shape = new THREE.Shape();
        const spikes = 5;
        shape.moveTo(-width / 2, 0);
        for (let i = 0; i < spikes; i++) {
            const xBase = -width / 2 + (width / spikes) * i;
            const xTip = xBase + width / spikes / 2;
            const tipHeight = height * (0.7 + Math.random() * 0.3);
            shape.lineTo(xBase, 0);
            shape.lineTo(xTip, tipHeight);
        }
        shape.lineTo(width / 2, 0);
        shape.lineTo(-width / 2, 0);
    } else if (shrubType.name.includes('fern') || shrubType.name === 'tropicalPlant') {
        // Fern/tropical - fan shape
        shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.quadraticCurveTo(-width * 0.8, height * 0.3, -width / 2, height);
        shape.lineTo(0, height * 0.6);
        shape.lineTo(width / 2, height);
        shape.quadraticCurveTo(width * 0.8, height * 0.3, 0, 0);
    } else if (shrubType.name.includes('moss') || shrubType.name.includes('lichen')) {
        // Low, flat moss/lichen
        shape = new THREE.Shape();
        const segments = 6;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI;
            const r = width / 2 * (0.8 + Math.random() * 0.2);
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * height;
            if (i === 0) shape.moveTo(px, py);
            else shape.lineTo(px, py);
        }
        shape.lineTo(-width / 2, 0);
    } else {
        // Default bush - rounded blob
        shape = new THREE.Shape();
        shape.moveTo(-width / 2, 0);
        shape.quadraticCurveTo(-width / 2, height, 0, height);
        shape.quadraticCurveTo(width / 2, height, width / 2, 0);
        shape.lineTo(-width / 2, 0);
    }

    const geometry = new THREE.ShapeGeometry(shape);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height / 2;
    spriteGroup.add(mesh);

    // Position in world
    spriteGroup.position.set(x, terrainHeight, z);
    spriteGroup.userData.isShrub = true;
    spriteGroup.userData.shrubType = shrubType.name;

    return spriteGroup;
}

// Select a shrub type based on weights
function selectShrubType(types) {
    const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const type of types) {
        random -= type.weight;
        if (random <= 0) return type;
    }
    return types[0];
}

// Create shrubs for the terrain
function createShrubs() {
    console.log('Creating biome-specific shrubs...');

    shrubData = [];
    shrubGroup = new THREE.Group();
    shrubGroup.name = 'shrubs';

    const maxAttempts = SHRUB_CONFIG.maxAttempts;
    const maxShrubs = SHRUB_CONFIG.maxShrubs;
    const minDistFromCenter = SHRUB_CONFIG.minDistanceFromCenter;
    const radius = SHRUB_CONFIG.radius;
    const minSpacing = SHRUB_CONFIG.minSpacing;

    // Spatial hash for collision detection
    const cellSize = minSpacing;
    const spatialHash = {};

    function hashKey(x, z) {
        return `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
    }

    function checkOverlap(x, z) {
        const cx = Math.floor(x / cellSize);
        const cz = Math.floor(z / cellSize);

        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const key = `${cx + dx},${cz + dz}`;
                const cell = spatialHash[key];
                if (cell) {
                    for (const shrub of cell) {
                        const dist = Math.sqrt(Math.pow(x - shrub.x, 2) + Math.pow(z - shrub.z, 2));
                        if (dist < minSpacing) return true;
                    }
                }
            }
        }
        return false;
    }

    function addToHash(x, z) {
        const key = hashKey(x, z);
        if (!spatialHash[key]) spatialHash[key] = [];
        spatialHash[key].push({ x, z });
    }

    let placedCount = 0;
    let attempts = 0;
    const biomeCounts = {};

    while (placedCount < maxShrubs && attempts < maxAttempts) {
        attempts++;

        // Random position
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistFromCenter + Math.random() * (radius - minDistFromCenter);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        // Check spacing
        if (checkOverlap(x, z)) continue;

        // Get terrain data
        let terrainHeight = 0;
        let biome = null;

        if (typeof calculateTerrainHeight === 'function') {
            const data = calculateTerrainHeight(x, z);
            terrainHeight = data.height;

            // Skip water areas
            if (terrainHeight < -5) continue;

            // Skip coastal areas
            if (data.climate && data.climate.continentalness < -0.4) continue;

            biome = data.biome;
        }

        // Get biome-specific shrub config
        const biomeId = biome ? biome.id : 'grassland';
        const shrubConfig = SHRUB_TYPES[biomeId] || SHRUB_TYPES.grassland;

        // Check density - skip based on biome density
        if (Math.random() > shrubConfig.density) continue;

        // Select shrub type
        const shrubType = selectShrubType(shrubConfig.types);

        // Create the shrub
        const shrub = createShrubSprite(x, z, shrubType, terrainHeight);
        shrubGroup.add(shrub);

        // Track
        addToHash(x, z);
        shrubData.push({
            position: new THREE.Vector3(x, terrainHeight, z),
            sprite: shrub,
            biome: biomeId,
            type: shrubType.name
        });

        biomeCounts[biomeId] = (biomeCounts[biomeId] || 0) + 1;
        placedCount++;
    }

    scene.add(shrubGroup);

    console.log(`Placed ${placedCount} shrubs in ${attempts} attempts`);
    console.log('Shrubs by biome:', biomeCounts);
}

// Update shrub billboards to face camera
function updateShrubBillboards() {
    if (!camera || !shrubGroup) return;

    shrubData.forEach(shrub => {
        if (shrub.sprite) {
            const direction = new THREE.Vector3();
            direction.subVectors(camera.position, shrub.sprite.position);
            direction.y = 0;
            direction.normalize();

            const angle = Math.atan2(direction.x, direction.z);
            shrub.sprite.rotation.y = angle;
        }
    });
}

// Clean up shrubs
function disposeShrubs() {
    if (shrubGroup) {
        scene.remove(shrubGroup);
        shrubGroup.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
        shrubGroup = null;
    }
    shrubData = [];
}

// Get shrub config for external use
function getShrubConfig() {
    return SHRUB_CONFIG;
}
