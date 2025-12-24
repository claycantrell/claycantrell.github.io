// Tree system - 3D trees, 2D sprites, and LOD management
// Biome-aware with multiple tree variants based on pine and oak

// Tree variant definitions - all based on pine (conifer) or oak (deciduous) templates
const TREE_VARIANTS = {
    // === CONIFER TYPES (based on pine) ===
    pine: {
        base: 'pine',
        trunkColor: 0x8B4513,
        foliageColors: [0x006400, 0x008000, 0x228B22],
        trunkHeight: [25, 35],      // min, max
        trunkRadius: [1.0, 1.5],    // top, bottom
        foliageLayers: 3,
        foliageRadius: 6,
        coneHeight: 9
    },
    spruce: {
        base: 'pine',
        trunkColor: 0x5D4037,
        foliageColors: [0x1B4D3E, 0x2E5A4C, 0x3D6B5A],  // Darker, blue-green
        trunkHeight: [30, 45],      // Taller
        trunkRadius: [0.8, 1.3],    // Thinner
        foliageLayers: 4,           // More layers
        foliageRadius: 5,           // Narrower
        coneHeight: 8
    },
    snowyPine: {
        base: 'pine',
        trunkColor: 0x6D5D4D,
        foliageColors: [0x4A6B5A, 0x5A7B6A, 0x8BA89A],  // Frosted look
        trunkHeight: [20, 30],      // Shorter, stunted
        trunkRadius: [1.0, 1.4],
        foliageLayers: 3,
        foliageRadius: 5,
        coneHeight: 7
    },
    deadwood: {
        base: 'pine',
        trunkColor: 0x4A4A4A,
        foliageColors: [0x3D3D3D, 0x4A4A4A, 0x5A5A5A],  // Gray, dead
        trunkHeight: [15, 25],
        trunkRadius: [0.8, 1.2],
        foliageLayers: 2,           // Sparse
        foliageRadius: 4,
        coneHeight: 6
    },

    // === DECIDUOUS TYPES (based on oak) ===
    oak: {
        base: 'oak',
        trunkColor: 0x4A3728,
        foliageColors: [0x004D00, 0x006400, 0x2E8B57],
        trunkHeight: [15, 20],
        trunkRadius: [1.5, 2.0],
        foliageRadius: 10,
        foliageLayers: 2
    },
    birch: {
        base: 'oak',
        trunkColor: 0xD4C9B0,       // White bark
        foliageColors: [0x6B8E23, 0x7BA428, 0x8FBC3F],  // Lighter green
        trunkHeight: [18, 25],      // Taller, thinner
        trunkRadius: [1.0, 1.3],
        foliageRadius: 8,
        foliageLayers: 2
    },
    acacia: {
        base: 'oak',
        trunkColor: 0x6B4423,
        foliageColors: [0x556B2F, 0x6B8E23, 0x808000],  // Yellow-green
        trunkHeight: [12, 18],
        trunkRadius: [1.2, 1.8],
        foliageRadius: 14,          // Wide, flat canopy
        foliageLayers: 1,           // Single flat layer
        flatTop: true
    },
    jungleTree: {
        base: 'oak',
        trunkColor: 0x3D2817,       // Dark bark
        foliageColors: [0x006400, 0x228B22, 0x32CD32],  // Vibrant green
        trunkHeight: [25, 35],      // Very tall
        trunkRadius: [2.0, 3.0],    // Thick
        foliageRadius: 12,
        foliageLayers: 3            // Dense canopy
    },
    palm: {
        base: 'palm',               // Special type
        trunkColor: 0x8B7355,
        foliageColors: [0x228B22, 0x2E8B57, 0x3CB371],
        trunkHeight: [20, 30],
        trunkRadius: [0.8, 1.0],
        fronds: 6                   // Number of palm fronds
    }
};

// Biome to tree type mapping
const BIOME_TREES = {
    // Frozen
    snowyPeaks: { types: { snowyPine: 1.0 }, density: 0.0 },
    snowySlopes: { types: { snowyPine: 0.7, spruce: 0.3 }, density: 0.05 },
    tundra: { types: { deadwood: 0.6, snowyPine: 0.4 }, density: 0.02 },
    taiga: { types: { spruce: 0.8, snowyPine: 0.2 }, density: 0.65 },

    // Cold
    coldForest: { types: { spruce: 0.5, birch: 0.3, pine: 0.2 }, density: 0.7 },
    coldPlains: { types: { birch: 0.5, spruce: 0.3, pine: 0.2 }, density: 0.15 },

    // Temperate
    mountains: { types: { spruce: 0.7, pine: 0.3 }, density: 0.08 },
    highlands: { types: { pine: 0.5, spruce: 0.3, oak: 0.2 }, density: 0.2 },
    forest: { types: { oak: 0.5, birch: 0.3, pine: 0.2 }, density: 0.85 },
    plains: { types: { oak: 0.6, birch: 0.4 }, density: 0.12 },
    meadow: { types: { birch: 0.6, oak: 0.4 }, density: 0.08 },

    // Warm
    grassland: { types: { oak: 0.5, acacia: 0.5 }, density: 0.1 },
    savanna: { types: { acacia: 0.9, oak: 0.1 }, density: 0.15 },
    warmForest: { types: { oak: 0.6, jungleTree: 0.4 }, density: 0.75 },

    // Hot
    desert: { types: { palm: 0.8, deadwood: 0.2 }, density: 0.03 },
    badlands: { types: { deadwood: 1.0 }, density: 0.01 },
    jungle: { types: { jungleTree: 0.7, palm: 0.3 }, density: 0.95 },

    // Coastal
    beach: { types: { palm: 1.0 }, density: 0.0 },
    stonyShore: { types: {}, density: 0.0 }
};

// Get tree config values from map config, with fallbacks
function getTreeSettings() {
    const config = typeof getTreeConfig === 'function' ? getTreeConfig() : {};
    return {
        maxAttempts: config.maxAttempts || 3000,
        targetCount: config.count || PERFORMANCE.treeCount || 800,
        radius: config.radius || 400,
        exclusionRadius: config.exclusionRadius || 35,
        minSpacing: config.minSpacing || 12,
        useBiomes: config.useBiomes !== false
    };
}

// Select tree type based on biome weights
function selectBiomeTreeType(biomeId) {
    const biomeConfig = BIOME_TREES[biomeId] || BIOME_TREES.plains;
    const types = biomeConfig.types;

    if (!types || Object.keys(types).length === 0) return null;

    const entries = Object.entries(types);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (const [type, weight] of entries) {
        random -= weight;
        if (random <= 0) return type;
    }
    return entries[0][0];
}

// Create a single 3D tree with variant support
function create3DTree(x, z, detail, variantName = 'pine') {
    const tree = new THREE.Group();
    const variant = TREE_VARIANTS[variantName] || TREE_VARIANTS.pine;

    // Create materials for this variant
    const trunkMaterial = new THREE.MeshBasicMaterial({ color: variant.trunkColor });
    const foliageMaterials = variant.foliageColors.map(c => new THREE.MeshBasicMaterial({ color: c }));

    // Calculate random height within variant range
    const heightRange = variant.trunkHeight;
    const trunkHeight = heightRange[0] + Math.random() * (heightRange[1] - heightRange[0]);
    const radiusRange = variant.trunkRadius;

    if (variant.base === 'palm') {
        // Palm tree - trunk with fronds drooping from top
        const trunkGeometry = new THREE.CylinderGeometry(radiusRange[0], radiusRange[1], trunkHeight, 8);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        tree.add(trunk);

        // Add palm fronds - drooping outward from center
        const frondCount = variant.fronds || 6;
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2;
            const frondGeom = new THREE.ConeGeometry(2, 10, 4);
            const frond = new THREE.Mesh(frondGeom, foliageMaterials[i % foliageMaterials.length]);

            // Position at top of trunk, offset outward
            frond.position.y = trunkHeight;
            frond.position.x = Math.cos(angle) * 2;
            frond.position.z = Math.sin(angle) * 2;

            // Rotate to droop outward - first rotate around Z to tilt, then Y to face outward
            frond.rotation.order = 'YXZ';
            frond.rotation.y = angle;
            frond.rotation.z = Math.PI / 4;  // Tilt outward
            tree.add(frond);
        }
        tree.userData.treeHeight = trunkHeight + 6;

    } else if (variant.base === 'oak') {
        // Deciduous tree - trunk with blob foliage
        const trunkGeometry = new THREE.CylinderGeometry(radiusRange[0], radiusRange[1], trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        tree.add(trunk);

        const layers = variant.foliageLayers || 2;
        const baseRadius = variant.foliageRadius || 10;

        if (variant.flatTop) {
            // Acacia-style flat canopy
            const canopyGeom = new THREE.CylinderGeometry(baseRadius, baseRadius * 0.8, 4, 8);
            const canopy = new THREE.Mesh(canopyGeom, foliageMaterials[0]);
            canopy.position.y = trunkHeight + 2;
            tree.add(canopy);
            tree.userData.treeHeight = trunkHeight + 6;
        } else {
            // Standard blob foliage
            for (let j = 0; j < layers; j++) {
                const radius = baseRadius - j * 2;
                const foliageGeometry = new THREE.IcosahedronGeometry(radius, 0);
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterials[j % foliageMaterials.length]);
                foliage.position.y = trunkHeight + 2 + j * 3;
                foliage.position.x = (Math.random() - 0.5) * 3;
                foliage.position.z = (Math.random() - 0.5) * 3;
                foliage.scale.set(1.5, 0.8, 1.5);
                tree.add(foliage);
            }
            tree.userData.treeHeight = trunkHeight + baseRadius + 5;
        }

    } else {
        // Conifer tree - trunk with cone layers
        const trunkGeometry = new THREE.CylinderGeometry(radiusRange[0], radiusRange[1], trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        tree.add(trunk);

        let foliageHeight = trunkHeight;
        const layers = variant.foliageLayers || 3;
        const baseRadius = variant.foliageRadius || 6;
        const coneHeight = variant.coneHeight || 9;

        for (let j = 0; j < layers; j++) {
            const radiusBase = baseRadius - j * (baseRadius / layers);
            const foliageGeometry = new THREE.ConeGeometry(radiusBase, coneHeight, 6);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterials[j % foliageMaterials.length]);
            foliage.position.y = foliageHeight + 1;
            tree.add(foliage);
            foliageHeight += coneHeight * 0.45;
        }

        tree.userData.treeHeight = trunkHeight + layers * coneHeight * 0.5;
    }

    tree.position.set(x, 0, z);
    tree.userData.isTree = true;
    tree.userData.variant = variantName;

    return tree;
}

// Create a 2D billboard sprite for distant trees with variant support
function create2DSprite(x, z, variantName = 'pine') {
    const spriteGroup = new THREE.Group();
    const variant = TREE_VARIANTS[variantName] || TREE_VARIANTS.pine;

    const heightRange = variant.trunkHeight;
    const trunkHeight = heightRange[0] + Math.random() * (heightRange[1] - heightRange[0]);
    const radiusRange = variant.trunkRadius;

    const trunkMaterial = new THREE.MeshBasicMaterial({
        color: variant.trunkColor,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    // Draw trunk
    const trunkShape = new THREE.Shape();
    const topWidth = radiusRange[0];
    const bottomWidth = radiusRange[1];
    trunkShape.moveTo(-topWidth, trunkHeight / 2);
    trunkShape.lineTo(topWidth, trunkHeight / 2);
    trunkShape.lineTo(bottomWidth, -trunkHeight / 2);
    trunkShape.lineTo(-bottomWidth, -trunkHeight / 2);
    trunkShape.lineTo(-topWidth, trunkHeight / 2);

    const trunkGeometry = new THREE.ShapeGeometry(trunkShape);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    spriteGroup.add(trunk);

    if (variant.base === 'palm') {
        // Palm fronds as drooping leaves from top of trunk
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: variant.foliageColors[0],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        // Draw several fronds drooping down from center
        const frondShape = new THREE.Shape();
        // Left frond
        frondShape.moveTo(0, trunkHeight);
        frondShape.quadraticCurveTo(-8, trunkHeight + 4, -10, trunkHeight - 2);
        frondShape.lineTo(-8, trunkHeight - 1);
        frondShape.quadraticCurveTo(-6, trunkHeight + 2, 0, trunkHeight);
        // Right frond
        frondShape.moveTo(0, trunkHeight);
        frondShape.quadraticCurveTo(8, trunkHeight + 4, 10, trunkHeight - 2);
        frondShape.lineTo(8, trunkHeight - 1);
        frondShape.quadraticCurveTo(6, trunkHeight + 2, 0, trunkHeight);
        // Top fronds
        frondShape.moveTo(0, trunkHeight);
        frondShape.lineTo(-3, trunkHeight + 8);
        frondShape.lineTo(0, trunkHeight + 6);
        frondShape.lineTo(3, trunkHeight + 8);
        frondShape.lineTo(0, trunkHeight);

        const frondGeom = new THREE.ShapeGeometry(frondShape);
        const frond = new THREE.Mesh(frondGeom, foliageMaterial);
        spriteGroup.add(frond);

    } else if (variant.base === 'oak') {
        // Deciduous - blob/oval shape
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: variant.foliageColors[0],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const radius = variant.foliageRadius || 10;
        const foliageShape = new THREE.Shape();
        const segments = 8;

        if (variant.flatTop) {
            // Flat acacia-style
            foliageShape.moveTo(-radius * 1.5, trunkHeight);
            foliageShape.lineTo(-radius * 1.5, trunkHeight + 4);
            foliageShape.lineTo(radius * 1.5, trunkHeight + 4);
            foliageShape.lineTo(radius * 1.5, trunkHeight);
            foliageShape.lineTo(-radius * 1.5, trunkHeight);
        } else {
            // Blob shape
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const px = Math.cos(theta) * radius * 1.2;
                const py = Math.sin(theta) * radius * 0.8;
                if (i === 0) foliageShape.moveTo(px, py + trunkHeight + radius * 0.8);
                else foliageShape.lineTo(px, py + trunkHeight + radius * 0.8);
            }
        }

        const foliageGeometry = new THREE.ShapeGeometry(foliageShape);
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        spriteGroup.add(foliage);

    } else {
        // Conifer - stacked triangles
        let foliageY = trunkHeight;
        const layers = variant.foliageLayers || 3;
        const baseRadius = variant.foliageRadius || 6;
        const coneHeight = variant.coneHeight || 9;

        for (let j = 0; j < layers; j++) {
            const coneRadius = baseRadius - j * (baseRadius / layers);

            const foliageMaterial = new THREE.MeshBasicMaterial({
                color: variant.foliageColors[j % variant.foliageColors.length],
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide
            });

            const foliageShape = new THREE.Shape();
            foliageShape.moveTo(0, coneHeight / 2);
            foliageShape.lineTo(coneRadius, -coneHeight / 2);
            foliageShape.lineTo(-coneRadius, -coneHeight / 2);
            foliageShape.lineTo(0, coneHeight / 2);

            const foliageGeometry = new THREE.ShapeGeometry(foliageShape);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = foliageY + 1;
            spriteGroup.add(foliage);

            foliageY += coneHeight * 0.45;
        }
    }

    spriteGroup.position.set(x, 0, z);
    spriteGroup.userData.isSprite = true;
    spriteGroup.userData.variant = variantName;

    return spriteGroup;
}

// Create trees with LOD support - biome-aware with variants
function createMoreComplexTrees() {
    if (!sharedMaterials.trunk) {
        initSharedMaterials();
    }

    const treeSettings = getTreeSettings();
    const maxAttempts = treeSettings.maxAttempts;
    const targetCount = treeSettings.targetCount;
    const treeRadius = treeSettings.radius;
    const minDistanceFromCenter = treeSettings.exclusionRadius;
    const minSpacing = treeSettings.minSpacing;
    const useBiomes = treeSettings.useBiomes && typeof calculateTerrainHeight === 'function';

    const detail = PERFORMANCE.treeDetail;
    const lodDistance = PERFORMANCE.rendering.lodDistance;

    treeData = [];
    let placedCount = 0;
    let attempts = 0;
    let skippedByDensity = 0;

    console.log(`Creating trees (target: ${targetCount}, radius: ${treeRadius}, biomes: ${useBiomes})`);

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
                const cell = spatialHash[`${cx + dx},${cz + dz}`];
                if (cell) {
                    for (const tree of cell) {
                        const dist = Math.sqrt(Math.pow(x - tree.x, 2) + Math.pow(z - tree.z, 2));
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

    while (placedCount < targetCount && attempts < maxAttempts) {
        attempts++;

        const angle = Math.random() * Math.PI * 2;
        const distance = minDistanceFromCenter + Math.random() * (treeRadius - minDistanceFromCenter);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        if (checkOverlap(x, z)) continue;

        // Get terrain data
        let terrainHeight = 0;
        let climate = null;
        let biome = null;

        if (typeof calculateTerrainHeight === 'function') {
            const heightData = calculateTerrainHeight(x, z);
            terrainHeight = heightData.height;
            climate = heightData.climate;
            biome = heightData.biome;
        }

        // Skip water areas
        if (typeof isRiver === 'function' && isRiver(x, z)) continue;
        if (terrainHeight < -5) continue;
        if (climate && climate.continentalness < -0.4) continue;

        // Get biome-specific tree config
        const biomeId = biome ? biome.id : 'plains';
        const biomeTreeConfig = BIOME_TREES[biomeId] || BIOME_TREES.plains;

        // Check density
        if (Math.random() > biomeTreeConfig.density) {
            skippedByDensity++;
            continue;
        }

        // Select tree variant for this biome
        const treeVariant = selectBiomeTreeType(biomeId);
        if (!treeVariant) continue;

        const y = terrainHeight;
        const position = new THREE.Vector3(x, y, z);
        const charPos = character ? character.position : new THREE.Vector3(0, 0, 0);
        const distFromChar = position.distanceTo(charPos);

        let treeGroup, sprite;
        let is3D = distFromChar < lodDistance;

        if (is3D) {
            treeGroup = create3DTree(x, z, detail, treeVariant);
            treeGroup.position.y = y;
            scene.add(treeGroup);
            objects.push(treeGroup);
            treeGroup.userData.absoluteTreeHeight = y + treeGroup.userData.treeHeight;
        } else {
            sprite = create2DSprite(x, z, treeVariant);
            sprite.position.y = y;
            scene.add(sprite);
        }

        addToHash(x, z);

        treeData.push({
            position: position,
            group: treeGroup,
            sprite: sprite,
            is3D: is3D,
            variant: treeVariant,
            biome: biomeId
        });

        placedCount++;
    }

    // Log results
    const variantCounts = {};
    const biomeCounts = {};
    treeData.forEach(t => {
        variantCounts[t.variant] = (variantCounts[t.variant] || 0) + 1;
        biomeCounts[t.biome] = (biomeCounts[t.biome] || 0) + 1;
    });

    console.log(`Placed ${placedCount} trees in ${attempts} attempts (${skippedByDensity} skipped by density)`);
    console.log('Trees by variant:', variantCounts);
    console.log('Trees by biome:', biomeCounts);
}

// Update LOD based on distance from character
function updateTreeLOD() {
    if (!PERFORMANCE.rendering.lodEnabled || !character) return;

    const lodDistance = PERFORMANCE.rendering.lodDistance;
    const charPos = character.position;

    treeData.forEach((tree) => {
        const distance = tree.position.distanceTo(charPos);
        const shouldBe3D = distance < lodDistance;

        if (shouldBe3D !== tree.is3D) {
            if (shouldBe3D) {
                if (tree.sprite) {
                    scene.remove(tree.sprite);
                    tree.sprite = null;
                }
                if (!tree.group) {
                    tree.group = create3DTree(tree.position.x, tree.position.z, PERFORMANCE.treeDetail, tree.variant);
                    tree.group.position.y = getTerrainHeightAt(tree.position.x, tree.position.z);
                    tree.group.userData.absoluteTreeHeight = tree.group.position.y + tree.group.userData.treeHeight;
                    scene.add(tree.group);
                    objects.push(tree.group);
                }
                tree.is3D = true;
            } else {
                if (tree.group) {
                    scene.remove(tree.group);
                    const groupIndex = objects.indexOf(tree.group);
                    if (groupIndex > -1) {
                        objects.splice(groupIndex, 1);
                    }
                    tree.group = null;
                }
                if (!tree.sprite) {
                    tree.sprite = create2DSprite(tree.position.x, tree.position.z, tree.variant);
                    const y = getTerrainHeightAt(tree.position.x, tree.position.z);
                    tree.sprite.position.y = y;
                    scene.add(tree.sprite);
                }
                tree.is3D = false;
            }
        }
    });
}

// Update sprite billboards to face camera
function updateSpriteBillboards() {
    if (!camera || !character) return;

    treeData.forEach((tree) => {
        if (tree.sprite && !tree.is3D) {
            const direction = new THREE.Vector3();
            direction.subVectors(camera.position, tree.sprite.position);
            direction.y = 0;
            direction.normalize();

            const angle = Math.atan2(direction.x, direction.z);
            tree.sprite.rotation.y = angle;
        }
    });
}

// Make available globally
window.createMoreComplexTrees = createMoreComplexTrees;
window.updateTreeLOD = updateTreeLOD;
window.updateSpriteBillboards = updateSpriteBillboards;
