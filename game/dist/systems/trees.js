// Tree system - 3D trees, 2D sprites, and LOD management
// Biome-aware with multiple tree variants based on pine and oak
// Uses Systems registry pattern for organized update loop

// TreeSystem - manages tree creation, LOD, and billboard updates
const TreeSystem = {
    init() {
        // Trees are created after terrain is ready, called from core.js
    },

    update(delta) {
        // LOD updates are throttled in the game loop for performance
        // This is called every frame for billboard rotation
        updateSpriteBillboards();
    },

    // Throttled LOD update (called separately for performance)
    updateLOD() {
        updateTreeLOD();
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('trees', TreeSystem);
}

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
        fronds: 12                  // Number of palm fronds (increased to match sprite fullness)
    },

    // === NEW BIOME VARIANTS ===
    cherry: {
        base: 'oak',
        trunkColor: 0x3D2817,       // Dark brown bark
        foliageColors: [0xFFB7C5, 0xFFC0CB, 0xFF69B4],  // Pink cherry blossoms
        trunkHeight: [15, 22],
        trunkRadius: [1.2, 1.8],
        foliageRadius: 9,
        foliageLayers: 3            // Full, rounded canopy
    },
    mangrove: {
        base: 'mangrove',           // Special type with roots
        trunkColor: 0x4A3C2A,       // Dark muddy brown
        foliageColors: [0x2F4F2F, 0x3A5F3A, 0x556B2F],  // Dark green
        trunkHeight: [12, 18],      // Shorter, stocky
        trunkRadius: [1.0, 1.5],
        foliageRadius: 8,
        foliageLayers: 2,
        rootHeight: 4               // Exposed roots above water/ground
    },
    bamboo: {
        base: 'bamboo',             // Special type
        trunkColor: 0x6B8E23,       // Green bamboo color
        foliageColors: [0x228B22, 0x32CD32, 0x7CFC00],  // Bright green leaves
        trunkHeight: [35, 50],      // Very tall
        trunkRadius: [0.4, 0.5],    // Very thin
        segments: 8,                // Bamboo segments
        topFoliageRadius: 3         // Small leafy top
    },
    giantMushroom: {
        base: 'mushroom',           // Special type
        trunkColor: 0xE8D5C4,       // Cream/tan stem
        foliageColors: [0x8B0000, 0xA52A2A, 0xB22222],  // Red mushroom cap
        trunkHeight: [15, 25],
        trunkRadius: [2.0, 2.5],    // Thick stem
        capRadius: 12,              // Large cap
        capHeight: 6
    },
    charred: {
        base: 'pine',
        trunkColor: 0x1C1C1C,       // Charred black
        foliageColors: [0x2F2F2F, 0x3D3D3D, 0x4A4A4A],  // Dark ash gray
        trunkHeight: [18, 28],
        trunkRadius: [0.9, 1.3],
        foliageLayers: 2,           // Sparse, dead branches
        foliageRadius: 4,
        coneHeight: 7
    },
    swampTree: {
        base: 'oak',
        trunkColor: 0x3D3D2A,       // Dark grayish-brown
        foliageColors: [0x4F6F4F, 0x556B2F, 0x6B8E23],  // Mossy dark green
        trunkHeight: [20, 30],      // Tall, drooping
        trunkRadius: [1.8, 2.5],    // Thick, gnarled
        foliageRadius: 11,
        foliageLayers: 2
    }
};

// Biome to tree type mapping
const BIOME_TREES = {
    // Frozen
    snowyPeaks: { types: { snowyPine: 1.0 }, density: 0.0 },
    snowySlopes: { types: { snowyPine: 0.7, spruce: 0.3 }, density: 0.05 },
    tundra: { types: { deadwood: 0.6, snowyPine: 0.4 }, density: 0.02 },
    taiga: { types: { spruce: 0.8, snowyPine: 0.2 }, density: 0.65 },
    iceSpikes: { types: { snowyPine: 0.6, spruce: 0.4 }, density: 0.03 },

    // Cold
    coldForest: { types: { spruce: 0.5, birch: 0.3, pine: 0.2 }, density: 0.7 },
    coldPlains: { types: { birch: 0.5, spruce: 0.3, pine: 0.2 }, density: 0.15 },

    // Temperate
    mountains: { types: { spruce: 0.7, pine: 0.3 }, density: 0.08 },
    highlands: { types: { pine: 0.5, spruce: 0.3, oak: 0.2 }, density: 0.2 },
    forest: { types: { oak: 0.5, birch: 0.3, pine: 0.2 }, density: 0.85 },
    plains: { types: { oak: 0.6, birch: 0.4 }, density: 0.12 },
    meadow: { types: { birch: 0.6, oak: 0.4 }, density: 0.08 },
    cherryGrove: { types: { cherry: 0.9, birch: 0.1 }, density: 0.75 },

    // Warm
    grassland: { types: { oak: 0.5, acacia: 0.5 }, density: 0.1 },
    savanna: { types: { acacia: 0.9, oak: 0.1 }, density: 0.15 },
    warmForest: { types: { oak: 0.6, jungleTree: 0.4 }, density: 0.75 },

    // Hot
    desert: { types: { palm: 0.8, deadwood: 0.2 }, density: 0.03 },
    badlands: { types: { deadwood: 1.0 }, density: 0.01 },
    jungle: { types: { jungleTree: 0.7, palm: 0.3 }, density: 0.95 },
    bambooJungle: { types: { bamboo: 0.8, jungleTree: 0.2 }, density: 0.85 },
    volcanicPeaks: { types: { charred: 0.7, deadwood: 0.3 }, density: 0.05 },

    // Coastal & Wetlands
    beach: { types: { palm: 1.0 }, density: 0.0 },
    stonyShore: { types: {}, density: 0.0 },
    swamp: { types: { swampTree: 0.7, oak: 0.3 }, density: 0.6 },
    mangroveSwamp: { types: { mangrove: 0.9, swampTree: 0.1 }, density: 0.7 },

    // Special
    mushroomFields: { types: { giantMushroom: 1.0 }, density: 0.4 }
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

    // Create materials for this variant - use Lambert with flatShading for PS2-style visible polygons
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: variant.trunkColor, flatShading: true });
    const foliageMaterials = variant.foliageColors.map(c => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));

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

        // Add palm fronds - triangular leaves extending outward from top center
        // Fronds are flat triangles that start from a central point and extend outward, drooping down
        const frondCount = variant.fronds || 6;
        for (let i = 0; i < frondCount; i++) {
            const angle = (i / frondCount) * Math.PI * 2;
            
            // Create a flat triangular frond (triangle shape)
            const frondLength = 8 + Math.random() * 4; // Varying lengths 8-12
            const frondWidth = 1.5 + Math.random() * 0.5; // Varying widths 1.5-2
            const frondShape = new THREE.Shape();
            frondShape.moveTo(0, 0); // Start at center point
            frondShape.lineTo(-frondWidth / 2, frondLength); // Left edge
            frondShape.lineTo(frondWidth / 2, frondLength); // Right edge
            frondShape.lineTo(0, 0); // Back to center
            
            const frondGeom = new THREE.ShapeGeometry(frondShape);
            const frondMaterial = foliageMaterials[i % foliageMaterials.length].clone();
            frondMaterial.side = THREE.DoubleSide; // Make visible from both sides
            const frond = new THREE.Mesh(frondGeom, frondMaterial);
            frond.castShadow = true;
            frond.receiveShadow = true;

            // Position at top center of trunk (all fronds start from same point)
            frond.position.y = trunkHeight;
            frond.position.x = 0;
            frond.position.z = 0;

            // Rotate to extend outward and droop downward
            // Frond shape is in XY plane (Y is length, X is width)
            // We want it to extend outward horizontally and droop down
            frond.rotation.order = 'YXZ';
            frond.rotation.y = angle; // Rotate around Y to face outward direction (each frond different)
            
            // Varying droop angles - some droop more than others
            const droopVariation = (Math.random() - 0.5) * Math.PI / 3; // ±30° variation
            frond.rotation.x = -Math.PI / 2 - Math.PI / 6 + droopVariation; // Horizontal then droop down with variation
            
            tree.add(frond);
        }
        tree.userData.treeHeight = trunkHeight + 6;

    } else if (variant.base === 'mangrove') {
        // Mangrove tree - trunk with exposed root system
        const trunkGeometry = new THREE.CylinderGeometry(radiusRange[0], radiusRange[1], trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.position.y = trunkHeight / 2 + (variant.rootHeight || 4);
        tree.add(trunk);

        // Add visible arching roots from base
        const rootCount = 4;
        const rootHeight = variant.rootHeight || 4;
        for (let i = 0; i < rootCount; i++) {
            const angle = (i / rootCount) * Math.PI * 2;
            const rootCurve = new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(0, rootHeight, 0), // Start at trunk base
                new THREE.Vector3(Math.cos(angle) * 3, rootHeight / 2, Math.sin(angle) * 3), // Arc out
                new THREE.Vector3(Math.cos(angle) * 4, 0, Math.sin(angle) * 4) // End at ground
            );
            const rootGeometry = new THREE.TubeGeometry(rootCurve, 8, 0.4, 4, false);
            const root = new THREE.Mesh(rootGeometry, trunkMaterial);
            root.castShadow = true;
            root.receiveShadow = true;
            tree.add(root);
        }

        // Add canopy foliage on top
        const layers = variant.foliageLayers || 2;
        const baseRadius = variant.foliageRadius || 8;
        for (let j = 0; j < layers; j++) {
            const radius = baseRadius - j * 2;
            const foliageGeometry = new THREE.IcosahedronGeometry(radius, 0);
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterials[j % foliageMaterials.length]);
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            foliage.position.y = trunkHeight + rootHeight + 2 + j * 3;
            foliage.position.x = (Math.random() - 0.5) * 3;
            foliage.position.z = (Math.random() - 0.5) * 3;
            foliage.scale.set(1.5, 0.8, 1.5);
            tree.add(foliage);
        }
        tree.userData.treeHeight = trunkHeight + rootHeight + baseRadius + 5;

    } else if (variant.base === 'bamboo') {
        // Bamboo - tall segmented stalk with small leafy top
        const segments = variant.segments || 8;
        const segmentHeight = trunkHeight / segments;

        for (let i = 0; i < segments; i++) {
            const segmentGeometry = new THREE.CylinderGeometry(radiusRange[0], radiusRange[1], segmentHeight * 0.85, 8);
            const segment = new THREE.Mesh(segmentGeometry, trunkMaterial);
            segment.castShadow = true;
            segment.receiveShadow = true;
            segment.position.y = i * segmentHeight + segmentHeight / 2;
            tree.add(segment);

            // Add ring at segment joint
            const ringGeometry = new THREE.TorusGeometry(radiusRange[1] * 1.1, 0.15, 4, 8);
            const ringMaterial = new THREE.MeshLambertMaterial({ color: 0x4A5F23, flatShading: true });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.y = i * segmentHeight;
            ring.rotation.x = Math.PI / 2;
            tree.add(ring);
        }

        // Small leafy top
        const topFoliageRadius = variant.topFoliageRadius || 3;
        const topFoliage = new THREE.IcosahedronGeometry(topFoliageRadius, 0);
        const foliage = new THREE.Mesh(topFoliage, foliageMaterials[0]);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        foliage.position.y = trunkHeight + topFoliageRadius;
        foliage.scale.set(1.5, 0.6, 1.5);
        tree.add(foliage);

        tree.userData.treeHeight = trunkHeight + topFoliageRadius * 2;

    } else if (variant.base === 'mushroom') {
        // Giant mushroom - thick stem with large cap
        const stemGeometry = new THREE.CylinderGeometry(radiusRange[0], radiusRange[1], trunkHeight, 8);
        const stem = new THREE.Mesh(stemGeometry, trunkMaterial);
        stem.castShadow = true;
        stem.receiveShadow = true;
        stem.position.y = trunkHeight / 2;
        tree.add(stem);

        // Mushroom cap - flat cylinder with rounded top
        const capRadius = variant.capRadius || 12;
        const capHeight = variant.capHeight || 6;
        const capGeometry = new THREE.CylinderGeometry(capRadius * 0.9, capRadius, capHeight, 12);
        const cap = new THREE.Mesh(capGeometry, foliageMaterials[0]);
        cap.castShadow = true;
        cap.receiveShadow = true;
        cap.position.y = trunkHeight + capHeight / 2;
        tree.add(cap);

        // Add spots on cap (optional decorative touch)
        const spotCount = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < spotCount; i++) {
            const spotRadius = 0.8 + Math.random() * 1.2;
            const spotGeometry = new THREE.SphereGeometry(spotRadius, 6, 6);
            const spotMaterial = new THREE.MeshLambertMaterial({
                color: 0xFFFFCC,
                flatShading: true
            });
            const spot = new THREE.Mesh(spotGeometry, spotMaterial);
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * capRadius * 0.7;
            spot.position.x = Math.cos(angle) * distance;
            spot.position.y = trunkHeight + capHeight - spotRadius * 0.3;
            spot.position.z = Math.sin(angle) * distance;
            tree.add(spot);
        }

        tree.userData.treeHeight = trunkHeight + capHeight;

    } else if (variant.base === 'oak') {
        // Deciduous tree - trunk with blob foliage
        const trunkGeometry = new THREE.CylinderGeometry(radiusRange[0], radiusRange[1], trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
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
                foliage.castShadow = true;
                foliage.receiveShadow = true;
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
        trunk.castShadow = true;
        trunk.receiveShadow = true;
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

    // Enable shadows on all meshes in the tree
    tree.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

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

    } else if (variant.base === 'mangrove') {
        // Mangrove sprite - trunk with visible roots and canopy
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: variant.foliageColors[0],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const rootHeight = variant.rootHeight || 4;

        // Draw arching roots
        const rootShape = new THREE.Shape();
        rootShape.moveTo(-4, 0);
        rootShape.quadraticCurveTo(-3, rootHeight / 2, -1, rootHeight);
        rootShape.lineTo(1, rootHeight);
        rootShape.quadraticCurveTo(3, rootHeight / 2, 4, 0);
        rootShape.lineTo(3.5, 0);
        rootShape.quadraticCurveTo(2.5, rootHeight / 2, 0.5, rootHeight);
        rootShape.lineTo(-0.5, rootHeight);
        rootShape.quadraticCurveTo(-2.5, rootHeight / 2, -3.5, 0);

        const rootGeom = new THREE.ShapeGeometry(rootShape);
        const rootMesh = new THREE.Mesh(rootGeom, trunkMaterial);
        spriteGroup.add(rootMesh);

        // Canopy blob on top
        const radius = variant.foliageRadius || 8;
        const foliageShape = new THREE.Shape();
        const segments = 8;
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const px = Math.cos(theta) * radius * 1.2;
            const py = Math.sin(theta) * radius * 0.8;
            if (i === 0) foliageShape.moveTo(px, py + trunkHeight + rootHeight + radius * 0.8);
            else foliageShape.lineTo(px, py + trunkHeight + rootHeight + radius * 0.8);
        }
        const foliageGeometry = new THREE.ShapeGeometry(foliageShape);
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        spriteGroup.add(foliage);

    } else if (variant.base === 'bamboo') {
        // Bamboo sprite - tall thin stalk with segments and small top
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: variant.foliageColors[0],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        // Draw segmented trunk (vertical lines for segments)
        const segments = variant.segments || 8;
        const segmentHeight = trunkHeight / segments;

        // Main stalk outline
        const bambooShape = new THREE.Shape();
        bambooShape.moveTo(-topWidth * 0.6, 0);
        bambooShape.lineTo(-topWidth * 0.6, trunkHeight);
        bambooShape.lineTo(topWidth * 0.6, trunkHeight);
        bambooShape.lineTo(topWidth * 0.6, 0);
        bambooShape.lineTo(-topWidth * 0.6, 0);

        const bambooGeom = new THREE.ShapeGeometry(bambooShape);
        const bambooMesh = new THREE.Mesh(bambooGeom, trunkMaterial);
        spriteGroup.add(bambooMesh);

        // Add segment lines
        const segmentMaterial = new THREE.MeshBasicMaterial({
            color: 0x4A5F23,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        for (let i = 1; i < segments; i++) {
            const lineShape = new THREE.Shape();
            const y = i * segmentHeight;
            lineShape.moveTo(-topWidth * 0.8, y);
            lineShape.lineTo(topWidth * 0.8, y);
            lineShape.lineTo(topWidth * 0.8, y + 0.3);
            lineShape.lineTo(-topWidth * 0.8, y + 0.3);
            const lineGeom = new THREE.ShapeGeometry(lineShape);
            const line = new THREE.Mesh(lineGeom, segmentMaterial);
            spriteGroup.add(line);
        }

        // Small leafy top
        const topRadius = variant.topFoliageRadius || 3;
        const topShape = new THREE.Shape();
        topShape.moveTo(0, trunkHeight + topRadius * 1.5);
        topShape.lineTo(-topRadius, trunkHeight);
        topShape.lineTo(topRadius, trunkHeight);
        topShape.lineTo(0, trunkHeight + topRadius * 1.5);

        const topGeom = new THREE.ShapeGeometry(topShape);
        const topMesh = new THREE.Mesh(topGeom, foliageMaterial);
        spriteGroup.add(topMesh);

    } else if (variant.base === 'mushroom') {
        // Giant mushroom sprite - stem with flat cap
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: variant.foliageColors[0],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const capRadius = variant.capRadius || 12;
        const capHeight = variant.capHeight || 6;

        // Mushroom cap (wide oval/dome)
        const capShape = new THREE.Shape();
        capShape.moveTo(-capRadius, trunkHeight);
        capShape.quadraticCurveTo(-capRadius, trunkHeight + capHeight, 0, trunkHeight + capHeight);
        capShape.quadraticCurveTo(capRadius, trunkHeight + capHeight, capRadius, trunkHeight);
        capShape.lineTo(capRadius * 0.8, trunkHeight);
        capShape.quadraticCurveTo(capRadius * 0.8, trunkHeight + capHeight * 0.7, 0, trunkHeight + capHeight * 0.7);
        capShape.quadraticCurveTo(-capRadius * 0.8, trunkHeight + capHeight * 0.7, -capRadius * 0.8, trunkHeight);
        capShape.lineTo(-capRadius, trunkHeight);

        const capGeom = new THREE.ShapeGeometry(capShape);
        const cap = new THREE.Mesh(capGeom, foliageMaterial);
        spriteGroup.add(cap);

        // Add some spots
        const spotMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFCC,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        for (let i = 0; i < 4; i++) {
            const spotRadius = 0.8 + Math.random() * 0.8;
            const spotX = (Math.random() - 0.5) * capRadius * 1.2;
            const spotY = trunkHeight + capHeight * 0.6 + Math.random() * capHeight * 0.3;

            const spotShape = new THREE.Shape();
            const segments = 6;
            for (let j = 0; j <= segments; j++) {
                const theta = (j / segments) * Math.PI * 2;
                const px = spotX + Math.cos(theta) * spotRadius;
                const py = spotY + Math.sin(theta) * spotRadius;
                if (j === 0) spotShape.moveTo(px, py);
                else spotShape.lineTo(px, py);
            }
            const spotGeom = new THREE.ShapeGeometry(spotShape);
            const spot = new THREE.Mesh(spotGeom, spotMaterial);
            spriteGroup.add(spot);
        }

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

    // Creating trees

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
            GAME.world.objects.push(treeGroup);
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

    // Trees placed
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
                    GAME.world.objects.push(tree.group);
                }
                tree.is3D = true;
            } else {
                if (tree.group) {
                    scene.remove(tree.group);
                    const groupIndex = GAME.world.objects.indexOf(tree.group);
                    if (groupIndex > -1) {
                        GAME.world.objects.splice(groupIndex, 1);
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

// Reusable vector for billboard calculations - no allocations in hot loop
const _billboardDir = new THREE.Vector3();

// Update sprite billboards to face camera
function updateSpriteBillboards() {
    if (!camera || !character) return;

    const camX = camera.position.x;
    const camZ = camera.position.z;

    for (let i = 0; i < treeData.length; i++) {
        const tree = treeData[i];
        if (tree.sprite && !tree.is3D) {
            // Direct math instead of vector operations
            const dx = camX - tree.sprite.position.x;
            const dz = camZ - tree.sprite.position.z;
            tree.sprite.rotation.y = Math.atan2(dx, dz);
        }
    }
}

// Make available globally
window.createMoreComplexTrees = createMoreComplexTrees;
window.updateTreeLOD = updateTreeLOD;
window.updateSpriteBillboards = updateSpriteBillboards;
window.TreeSystem = TreeSystem;

// Expose treeData for terraforming vegetation updates
window.getTreeData = () => treeData;
