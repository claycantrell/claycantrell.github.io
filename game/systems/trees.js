// Tree system - 3D trees, 2D sprites, and LOD management
// Now biome-aware: vegetation density and types vary by biome

// Get tree config values from map config, with fallbacks
function getTreeSettings() {
    const config = typeof getTreeConfig === 'function' ? getTreeConfig() : {};
    return {
        // Max attempts to place trees (increased for biome-based placement)
        maxAttempts: config.maxAttempts || 2000,
        // Target tree count (actual may be less due to biome density)
        targetCount: config.count || PERFORMANCE.treeCount || 700,
        radius: config.radius || 380,
        exclusionRadius: config.exclusionRadius || 35,
        minSpacing: config.minSpacing || 12,
        // Fallback weights when biome system not available
        types: {
            pine: { weight: config.types?.pine?.weight ?? 0.9 },
            oak: { weight: config.types?.oak?.weight ?? 0.1 }
        },
        // Use biome system if available
        useBiomes: config.useBiomes !== false
    };
}

// Create a single 3D tree
function create3DTree(x, z, detail, isOak = false) {
    const tree = new THREE.Group();

    const trunkMaterial = isOak ? sharedMaterials.oakTrunk : sharedMaterials.trunk;
    const foliageColors = isOak ?
        [sharedMaterials.oakFoliage1, sharedMaterials.oakFoliage2, sharedMaterials.oakFoliage3] :
        [sharedMaterials.foliage1, sharedMaterials.foliage2, sharedMaterials.foliage3];

    const trunkHeight = 25 + Math.random() * 10;

    if (isOak) {
        // Oak Tree
        const trunkRadiusTop = 1.5;
        const trunkRadiusBottom = 2.0;
        const oakTrunkHeight = 15 + Math.random() * 5;

        const trunkGeometry = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, oakTrunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = oakTrunkHeight / 2;
        tree.add(trunk);

        for (let j = 0; j < 2; j++) {
            const radius = 10 - j * 2;
            const foliageGeometry = new THREE.IcosahedronGeometry(radius, 0);
            const foliage = new THREE.Mesh(foliageGeometry, foliageColors[j]);
            foliage.position.y = oakTrunkHeight + 2 + j * 3;
            foliage.position.x = (Math.random() - 0.5) * 3;
            foliage.position.z = (Math.random() - 0.5) * 3;
            foliage.scale.set(1.5, 0.8, 1.5);
            tree.add(foliage);
        }

        tree.userData.treeHeight = oakTrunkHeight + 15;
    } else {
        // Pine Tree
        const trunkRadiusTop = 1;
        const trunkRadiusBottom = 1.5;

        const trunkGeometry = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        tree.add(trunk);

        let foliageHeight = trunkHeight;
        const foliageLayers = detail.foliageLayers;

        for (let j = 0; j < foliageLayers; j++) {
            const radiusBase = 6 - j;
            const foliageGeometry = new THREE.ConeGeometry(radiusBase, 9, 6);
            const foliage = new THREE.Mesh(foliageGeometry, foliageColors[j]);
            foliage.position.y = foliageHeight + 1;
            tree.add(foliage);
            foliageHeight += 4;
        }

        tree.userData.treeHeight = trunkHeight + 14;
    }

    tree.position.set(x, 0, z);
    tree.userData.isTree = true;

    return tree;
}

// Create a 2D billboard sprite for distant trees
function create2DSprite(x, z, isOak = false) {
    const spriteGroup = new THREE.Group();

    const trunkColor = isOak ? 0x4A3728 : 0x8B4513;
    const foliageColors = isOak ? [0x004d00, 0x006400, 0x2E8B57] : [0x006400, 0x008000, 0x228B22];
    const trunkHeight = isOak ? (15 + Math.random() * 5) : (25 + Math.random() * 10);

    const trunkMaterial = new THREE.MeshBasicMaterial({
        color: trunkColor,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    const trunkShape = new THREE.Shape();
    const topWidth = isOak ? 1.5 : 1;
    const bottomWidth = isOak ? 2.0 : 1.5;
    trunkShape.moveTo(-topWidth, trunkHeight / 2);
    trunkShape.lineTo(topWidth, trunkHeight / 2);
    trunkShape.lineTo(bottomWidth, -trunkHeight / 2);
    trunkShape.lineTo(-bottomWidth, -trunkHeight / 2);
    trunkShape.lineTo(-topWidth, trunkHeight / 2);

    const trunkGeometry = new THREE.ShapeGeometry(trunkShape);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    spriteGroup.add(trunk);

    if (isOak) {
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: foliageColors[0],
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const foliageShape = new THREE.Shape();
        const radius = 12;
        const segments = 8;

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const px = Math.cos(theta) * radius * 1.2;
            const py = Math.sin(theta) * radius * 0.8;
            if (i === 0) foliageShape.moveTo(px, py);
            else foliageShape.lineTo(px, py);
        }

        const foliageGeometry = new THREE.ShapeGeometry(foliageShape);
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = trunkHeight + 8;
        spriteGroup.add(foliage);
    } else {
        let foliageY = trunkHeight;

        for (let j = 0; j < 3; j++) {
            const coneRadius = 6 - j;
            const coneHeight = 9;

            const foliageMaterial = new THREE.MeshBasicMaterial({
                color: foliageColors[j],
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

            foliageY += 4;
        }
    }

    spriteGroup.position.set(x, 0, z);
    spriteGroup.userData.isSprite = true;

    return spriteGroup;
}

// Create trees with LOD support - now biome-aware
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
    const useBiomes = treeSettings.useBiomes && typeof getTerrainDataAt === 'function';

    // Fallback weights for when biome system isn't available
    const fallbackOakWeight = treeSettings.types.oak.weight;

    const detail = PERFORMANCE.treeDetail;
    const lodDistance = PERFORMANCE.rendering.lodDistance;

    treeData = [];
    let placedCount = 0;
    let attempts = 0;
    let skippedByDensity = 0;

    console.log(`Creating trees (target: ${targetCount}, radius: ${treeRadius}, biomes: ${useBiomes})`);

    // Use a spatial hash for O(1) collision detection
    const cellSize = minSpacing;
    const spatialHash = {};

    function hashKey(x, z) {
        const cx = Math.floor(x / cellSize);
        const cz = Math.floor(z / cellSize);
        return `${cx},${cz}`;
    }

    function checkOverlap(x, z) {
        const cx = Math.floor(x / cellSize);
        const cz = Math.floor(z / cellSize);

        // Check 3x3 neighborhood
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const key = `${cx + dx},${cz + dz}`;
                const cell = spatialHash[key];
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

        // Random position in ring around center
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistanceFromCenter + Math.random() * (treeRadius - minDistanceFromCenter);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;

        // Check for overlap using spatial hash
        if (checkOverlap(x, z)) {
            continue;
        }

        // Get biome data at this position
        let biome = null;
        let treeType = 'pine'; // Default

        if (useBiomes) {
            const data = getTerrainDataAt(x, z);
            if (data && data.biome) {
                biome = data.biome;

                // Check vegetation density - skip if random > density
                if (Math.random() > biome.vegetation.density) {
                    skippedByDensity++;
                    continue;
                }

                // Select tree type based on biome vegetation types
                if (typeof selectTreeType === 'function') {
                    const selectedType = selectTreeType(biome.vegetation.types);
                    if (!selectedType) {
                        // No valid tree types for this biome
                        continue;
                    }
                    treeType = selectedType;
                }
            }
        } else {
            // Fallback: use config weights
            treeType = Math.random() < fallbackOakWeight ? 'oak' : 'pine';
        }

        const isOak = treeType === 'oak';

        // Get terrain height
        const y = getTerrainHeightAt(x, z);
        const position = new THREE.Vector3(x, y, z);
        const charPos = character ? character.position : new THREE.Vector3(0, 0, 0);
        const distFromChar = position.distanceTo(charPos);

        let treeGroup, sprite;
        let is3D = distFromChar < lodDistance;

        if (is3D) {
            treeGroup = create3DTree(x, z, detail, isOak);
            treeGroup.position.y = y;
            scene.add(treeGroup);
            objects.push(treeGroup);
            treeGroup.userData.absoluteTreeHeight = y + treeGroup.userData.treeHeight;
        } else {
            sprite = create2DSprite(x, z, isOak);
            sprite.position.y = y;
            scene.add(sprite);
        }

        // Add to spatial hash
        addToHash(x, z);

        treeData.push({
            position: position,
            group: treeGroup,
            sprite: sprite,
            is3D: is3D,
            isOak: isOak,
            biome: biome ? biome.id : null
        });

        placedCount++;
    }

    // Log results
    const biomeTreeCounts = {};
    treeData.forEach(t => {
        const b = t.biome || 'unknown';
        biomeTreeCounts[b] = (biomeTreeCounts[b] || 0) + 1;
    });

    console.log(`Placed ${placedCount} trees in ${attempts} attempts (${skippedByDensity} skipped by density)`);
    console.log('Trees by biome:', biomeTreeCounts);
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
                    tree.group = create3DTree(tree.position.x, tree.position.z, PERFORMANCE.treeDetail, tree.isOak);
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
                    tree.sprite = create2DSprite(tree.position.x, tree.position.z, tree.isOak);
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
