// Shrub system - biome-specific ground vegetation with LOD
// LOD: Close = 3D models, Distant = 2D sprites (billboards)
// Uses Systems registry pattern for organized update loop

// ShrubSystem - manages shrub creation, LOD, and billboard updates
const ShrubSystem = {
    init() {
        // Shrubs are created after terrain via createShrubs()
    },

    update(delta) {
        // Update billboard rotation to face camera
        if (typeof updateShrubBillboards === 'function') {
            updateShrubBillboards();
        }
    },

    // Throttled LOD update (called separately for performance)
    updateLOD() {
        if (typeof updateShrubLOD === 'function') {
            updateShrubLOD();
        }
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('shrubs', ShrubSystem);
}

// Shrub type definitions per biome
const SHRUB_TYPES = {
    // === HOT BIOMES ===
    desert: {
        density: 1.0,
        types: [
            { name: 'cactus', color: 0x2d5a27, height: 3, width: 1.5, weight: 0.4 },
            { name: 'desertBush', color: 0x8b7355, height: 1.5, width: 2, weight: 0.4 },
            { name: 'deadBush', color: 0x6b4423, height: 1, width: 1.5, weight: 0.2 }
        ]
    },
    badlands: {
        density: 1.0,
        types: [
            { name: 'deadBush', color: 0x8b6914, height: 1, width: 1.5, weight: 0.5 },
            { name: 'rock', color: 0xcd853f, height: 1.5, width: 2, weight: 0.3 },
            { name: 'smallRock', color: 0xb8860b, height: 0.8, width: 1.2, weight: 0.2 }
        ]
    },
    jungle: {
        density: 1.0,
        types: [
            { name: 'fern', color: 0x228b22, height: 2, width: 2.5, weight: 0.4 },
            { name: 'tropicalPlant', color: 0x32cd32, height: 2.5, width: 2, weight: 0.3 },
            { name: 'largeFern', color: 0x006400, height: 3, width: 3, weight: 0.3 }
        ]
    },

    // === WARM BIOMES ===
    grassland: {
        density: 1.0,
        types: [
            { name: 'grassClump', color: 0x9acd32, height: 1, width: 1.5, weight: 0.5 },
            { name: 'smallBush', color: 0x6b8e23, height: 1.5, width: 2, weight: 0.3 },
            { name: 'wildflower', color: 0xadff2f, height: 0.8, width: 1, weight: 0.2 }
        ]
    },
    savanna: {
        density: 1.0,
        types: [
            { name: 'tallGrass', color: 0xbdb76b, height: 1.5, width: 1, weight: 0.5 },
            { name: 'dryBush', color: 0x8b7355, height: 1.2, width: 1.8, weight: 0.3 },
            { name: 'deadBush', color: 0xa0522d, height: 0.8, width: 1.2, weight: 0.2 }
        ]
    },
    warmForest: {
        density: 1.0,
        types: [
            { name: 'fern', color: 0x32cd32, height: 1.5, width: 2, weight: 0.4 },
            { name: 'bush', color: 0x228b22, height: 2, width: 2.5, weight: 0.35 },
            { name: 'wildflower', color: 0x7DB37D, height: 0.8, width: 1, weight: 0.25 }
        ]
    },

    // === TEMPERATE BIOMES ===
    plains: {
        density: 1.0,
        types: [
            { name: 'grassClump', color: 0x7cba3d, height: 1.2, width: 1.5, weight: 0.5 },
            { name: 'bush', color: 0x556b2f, height: 1.8, width: 2.2, weight: 0.3 },
            { name: 'tallGrass', color: 0x6b8e23, height: 1.5, width: 1, weight: 0.2 }
        ]
    },
    meadow: {
        density: 1.0,
        types: [
            { name: 'wildflower', color: 0x7DB37D, height: 0.8, width: 1, weight: 0.4 },
            { name: 'grassClump', color: 0x7cba3d, height: 1, width: 1.5, weight: 0.35 },
            { name: 'smallBush', color: 0x6b8e23, height: 1.2, width: 1.5, weight: 0.25 }
        ]
    },
    forest: {
        density: 1.0,
        types: [
            { name: 'fern', color: 0x228b22, height: 1.5, width: 2, weight: 0.4 },
            { name: 'berryBush', color: 0x2e8b57, height: 2, width: 2.5, weight: 0.3 },
            { name: 'forestFloor', color: 0x355e3b, height: 0.8, width: 2, weight: 0.3 }
        ]
    },
    highlands: {
        density: 1.0,
        types: [
            { name: 'rock', color: 0x696969, height: 1.5, width: 2, weight: 0.3 },
            { name: 'alpineShrub', color: 0x556b2f, height: 1.2, width: 1.8, weight: 0.35 },
            { name: 'grassClump', color: 0x5a6e4a, height: 1, width: 1.5, weight: 0.35 }
        ]
    },
    mountains: {
        density: 1.0,
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
        density: 1.0,
        types: [
            { name: 'grassClump', color: 0x5d7052, height: 1, width: 1.5, weight: 0.5 },
            { name: 'coldBush', color: 0x4a5d23, height: 1.2, width: 1.8, weight: 0.3 },
            { name: 'moss', color: 0x556b2f, height: 0.4, width: 1.5, weight: 0.2 }
        ]
    },
    coldForest: {
        density: 1.0,
        types: [
            { name: 'fern', color: 0x355e3b, height: 1.2, width: 1.8, weight: 0.35 },
            { name: 'moss', color: 0x4a5d23, height: 0.5, width: 2, weight: 0.35 },
            { name: 'coldBush', color: 0x3d5c3d, height: 1.5, width: 2, weight: 0.3 }
        ]
    },
    taiga: {
        density: 1.0,
        types: [
            { name: 'lowPine', color: 0x2f4f4f, height: 1.5, width: 2, weight: 0.4 },
            { name: 'moss', color: 0x4a5d23, height: 0.5, width: 2, weight: 0.3 },
            { name: 'coldBush', color: 0x3d5c3d, height: 1.2, width: 1.8, weight: 0.3 }
        ]
    },

    // === FROZEN BIOMES ===
    tundra: {
        density: 1.0,
        types: [
            { name: 'lichen', color: 0x708090, height: 0.3, width: 1.5, weight: 0.5 },
            { name: 'arcticMoss', color: 0x6b7b6b, height: 0.4, width: 2, weight: 0.3 },
            { name: 'stuntedShrub', color: 0x556b2f, height: 0.8, width: 1.2, weight: 0.2 }
        ]
    },
    snowySlopes: {
        density: 1.0,
        types: [
            { name: 'rock', color: 0x909098, height: 1.5, width: 2, weight: 0.4 },
            { name: 'smallRock', color: 0xa0a0a8, height: 0.8, width: 1.2, weight: 0.35 },
            { name: 'snowLichen', color: 0xb0c4de, height: 0.2, width: 1, weight: 0.25 }
        ]
    },
    snowyPeaks: {
        density: 1.0,
        types: [
            { name: 'boulder', color: 0x808890, height: 5, width: 6, weight: 0.3 },
            { name: 'rock', color: 0x909098, height: 2.5, width: 3.5, weight: 0.35 },
            { name: 'smallRock', color: 0xa0a0a8, height: 1.2, width: 2, weight: 0.25 },
            { name: 'snowLichen', color: 0xb0c4de, height: 0.2, width: 1, weight: 0.1 }
        ]
    },

    // === COASTAL BIOMES ===
    beach: {
        density: 1.0,
        types: [
            { name: 'beachGrass', color: 0xbdb76b, height: 1, width: 1.2, weight: 0.6 },
            { name: 'driftwood', color: 0x8b7355, height: 0.5, width: 2, weight: 0.2 },
            { name: 'seaOats', color: 0xc2b280, height: 1.5, width: 0.8, weight: 0.2 }
        ]
    },
    stonyShore: {
        density: 1.0,
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
    maxShrubs: 8000,
    maxAttempts: 16000,
    minDistanceFromCenter: 20,
    radius: 3000,  // Match tree radius for full coverage
    minSpacing: 4,
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
    // Enable shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Shape starts at y=0, no offset needed
    spriteGroup.add(mesh);

    // Position in world
    spriteGroup.position.set(x, terrainHeight, z);
    spriteGroup.userData.isShrub = true;
    spriteGroup.userData.shrubType = shrubType.name;

    return spriteGroup;
}

// Create a 3D shrub model for close-up viewing
function create3DShrub(x, z, shrubType, terrainHeight) {
    const shrubGroup = new THREE.Group();

    // Color with variation
    const color = new THREE.Color(shrubType.color);
    const variation = 0.15;
    color.r = Math.max(0, Math.min(1, color.r + (Math.random() - 0.5) * variation));
    color.g = Math.max(0, Math.min(1, color.g + (Math.random() - 0.5) * variation));
    color.b = Math.max(0, Math.min(1, color.b + (Math.random() - 0.5) * variation));

    const material = new THREE.MeshLambertMaterial({ color: color });

    // Scale with randomness
    const scale = 1.5 + Math.random() * 1.0;
    const height = shrubType.height * scale;
    const width = shrubType.width * scale;

    // Create 3D geometry based on shrub type
    if (shrubType.name === 'boulder' || shrubType.name === 'rock' || shrubType.name === 'smallRock') {
        // Irregular rock - use dodecahedron with random scale
        const radius = Math.max(width, height) / 2;
        const geometry = new THREE.DodecahedronGeometry(radius, 0);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(
            0.8 + Math.random() * 0.4,
            0.6 + Math.random() * 0.3,
            0.8 + Math.random() * 0.4
        );
        mesh.position.y = height / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        shrubGroup.add(mesh);

    } else if (shrubType.name === 'cactus') {
        // Cylindrical cactus
        const geometry = new THREE.CylinderGeometry(width * 0.3, width * 0.35, height, 6);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        shrubGroup.add(mesh);

    } else if (shrubType.name.includes('grass') || shrubType.name === 'seaOats' || shrubType.name === 'tallGrass') {
        // Multiple thin blades
        const blades = 5 + Math.floor(Math.random() * 3);
        for (let i = 0; i < blades; i++) {
            const bladeGeom = new THREE.PlaneGeometry(width / blades, height);
            const blade = new THREE.Mesh(bladeGeom, material);
            blade.position.y = height / 2;
            const angle = (i / blades) * Math.PI * 2;
            blade.rotation.y = angle;
            blade.castShadow = true;
            blade.receiveShadow = true;
            shrubGroup.add(blade);
        }

    } else if (shrubType.name.includes('fern') || shrubType.name === 'tropicalPlant') {
        // Crossed planes in X pattern for ferns
        const planeGeom = new THREE.PlaneGeometry(width, height);
        const plane1 = new THREE.Mesh(planeGeom, material);
        const plane2 = new THREE.Mesh(planeGeom, material);
        plane1.position.y = height / 2;
        plane2.position.y = height / 2;
        plane2.rotation.y = Math.PI / 2;
        plane1.castShadow = true;
        plane2.castShadow = true;
        plane1.receiveShadow = true;
        plane2.receiveShadow = true;
        shrubGroup.add(plane1);
        shrubGroup.add(plane2);

    } else if (shrubType.name.includes('moss') || shrubType.name.includes('lichen')) {
        // Flat disc for moss/lichen
        const geometry = new THREE.CylinderGeometry(width / 2, width / 2, height, 8, 1);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height / 2;
        mesh.scale.y = 0.3; // Make it flat
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        shrubGroup.add(mesh);

    } else {
        // Default bush - sphere
        const geometry = new THREE.SphereGeometry(Math.max(width, height) / 2, 6, 6);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(width / height, 1, width / height);
        mesh.position.y = height / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        shrubGroup.add(mesh);
    }

    // Position in world
    shrubGroup.position.set(x, terrainHeight, z);
    shrubGroup.userData.isShrub = true;
    shrubGroup.userData.shrubType = shrubType.name;

    return shrubGroup;
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
    // Creating biome-specific shrubs

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

        // Random position - use square root distribution for uniform area coverage
        // This ensures equal density at all distances from center, not just equal probability per distance
        const angle = Math.random() * Math.PI * 2;
        // Square root distribution: sqrt(random) ensures uniform area distribution
        const randomFactor = Math.sqrt(Math.random()); // 0 to 1, but weighted toward 1
        const distance = minDistFromCenter + randomFactor * (radius - minDistFromCenter);
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

        // LOD: Create 3D or sprite based on distance from character
        const lodDistance = (typeof PERFORMANCE !== 'undefined' && PERFORMANCE.rendering)
            ? PERFORMANCE.rendering.lodDistance
            : 50;
        const charPos = (typeof character !== 'undefined' && character)
            ? character.position
            : new THREE.Vector3(0, 0, 0);
        const position = new THREE.Vector3(x, terrainHeight, z);
        const distFromChar = position.distanceTo(charPos);

        let shrubGroup3D = null;
        let shrubSprite = null;
        let is3D = distFromChar < lodDistance;

        if (is3D) {
            // Create 3D model for close shrubs
            shrubGroup3D = create3DShrub(x, z, shrubType, terrainHeight);
            shrubGroup.add(shrubGroup3D);
        } else {
            // Create 2D sprite for distant shrubs
            shrubSprite = createShrubSprite(x, z, shrubType, terrainHeight);
            shrubGroup.add(shrubSprite);
        }

        // Track
        addToHash(x, z);
        shrubData.push({
            position: position,
            group: shrubGroup3D,
            sprite: shrubSprite,
            is3D: is3D,
            biome: biomeId,
            type: shrubType.name,
            shrubType: shrubType  // Store type definition for LOD switching
        });

        biomeCounts[biomeId] = (biomeCounts[biomeId] || 0) + 1;
        placedCount++;
    }

    scene.add(shrubGroup);

    // Shrubs placed
}

// Update LOD based on distance from character
function updateShrubLOD() {
    if (!character || !shrubGroup) return;
    if (typeof PERFORMANCE === 'undefined' || !PERFORMANCE.rendering.lodEnabled) return;

    const lodDistance = PERFORMANCE.rendering.lodDistance;
    const charPos = character.position;

    for (let i = 0; i < shrubData.length; i++) {
        const shrub = shrubData[i];
        const dist = shrub.position.distanceTo(charPos);
        const shouldBe3D = dist < lodDistance;

        if (shouldBe3D !== shrub.is3D) {
            if (shouldBe3D) {
                // Switch sprite -> 3D
                if (shrub.sprite) {
                    shrubGroup.remove(shrub.sprite);
                    shrub.sprite.traverse(obj => {
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    shrub.sprite = null;
                }
                if (!shrub.group) {
                    shrub.group = create3DShrub(
                        shrub.position.x,
                        shrub.position.z,
                        shrub.shrubType,
                        shrub.position.y
                    );
                    shrubGroup.add(shrub.group);
                }
                shrub.is3D = true;
            } else {
                // Switch 3D -> sprite
                if (shrub.group) {
                    shrubGroup.remove(shrub.group);
                    shrub.group.traverse(obj => {
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    shrub.group = null;
                }
                if (!shrub.sprite) {
                    shrub.sprite = createShrubSprite(
                        shrub.position.x,
                        shrub.position.z,
                        shrub.shrubType,
                        shrub.position.y
                    );
                    shrubGroup.add(shrub.sprite);
                }
                shrub.is3D = false;
            }
        }
    }
}

// Update shrub billboards to face camera
function updateShrubBillboards() {
    if (!camera || !shrubGroup) return;

    const camX = camera.position.x;
    const camZ = camera.position.z;

    for (let i = 0; i < shrubData.length; i++) {
        const shrub = shrubData[i];
        // Only update sprites, not 3D models
        if (shrub.sprite && !shrub.is3D) {
            const dx = camX - shrub.sprite.position.x;
            const dz = camZ - shrub.sprite.position.z;
            shrub.sprite.rotation.y = Math.atan2(dx, dz);
        }
    }
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

// Make available globally
window.createShrubs = createShrubs;
window.updateShrubBillboards = updateShrubBillboards;
window.updateShrubLOD = updateShrubLOD;
window.getShrubConfig = getShrubConfig;

// Expose shrubData for terraforming vegetation updates
window.getShrubData = () => shrubData;
