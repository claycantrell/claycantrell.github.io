// World/environment creation (portals, trees, ground)

// Terrain generation using Simplex Noise - Minecraft/Runescape style
const simplex = new SimplexNoise('skyrim'); // Use a seed for consistent terrain
const terrainSize = 800;
const terrainSegments = 200;
let terrainHeightmap = null; // 2D array storing height at each grid point

// Smoothstep function for blending
function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
}

function getTerrainHeightAt(x, z) {
    // Convert world coordinates to heightmap grid coordinates
    const gridX = (x + terrainSize/2) / (terrainSize / terrainSegments);
    const gridZ = (z + terrainSize/2) / (terrainSize / terrainSegments);

    // Get integer and fractional parts for bilinear interpolation
    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(terrainSegments, x0 + 1);
    const z1 = Math.min(terrainSegments, z0 + 1);
    
    // Fraction of the way across the grid cell (0.0 to 1.0)
    const dx = Math.max(0, Math.min(1, gridX - x0));
    const dz = Math.max(0, Math.min(1, gridZ - z0));

    // Clamp to valid grid bounds
    const clampedX0 = Math.max(0, Math.min(terrainSegments, x0));
    const clampedZ0 = Math.max(0, Math.min(terrainSegments, z0));
    const clampedX1 = Math.max(0, Math.min(terrainSegments, x1));
    const clampedZ1 = Math.max(0, Math.min(terrainSegments, z1));

    // Ensure heightmap is loaded
    if (!terrainHeightmap) return 0;

    // Get heights of the four corners
    // Handle edge cases where indices might be out of bounds (though clamping should prevent this)
    const h00 = terrainHeightmap[clampedZ0] && terrainHeightmap[clampedZ0][clampedX0] !== undefined ? terrainHeightmap[clampedZ0][clampedX0] : 0;
    const h10 = terrainHeightmap[clampedZ0] && terrainHeightmap[clampedZ0][clampedX1] !== undefined ? terrainHeightmap[clampedZ0][clampedX1] : h00;
    const h01 = terrainHeightmap[clampedZ1] && terrainHeightmap[clampedZ1][clampedX0] !== undefined ? terrainHeightmap[clampedZ1][clampedX0] : h00;
    const h11 = terrainHeightmap[clampedZ1] && terrainHeightmap[clampedZ1][clampedX1] !== undefined ? terrainHeightmap[clampedZ1][clampedX1] : h00;

    // Bilinear interpolation
    // First interpolate along X axis
    const h0 = h00 * (1 - dx) + h10 * dx;
    const h1 = h01 * (1 - dx) + h11 * dx;
    
    // Then interpolate along Z axis
    return h0 * (1 - dz) + h1 * dz;
}

function calculateTerrainHeight(x, z) {
    const scale = 0.02;
    const octaves = 4;
    const persistence = 0.5;
    const lacunarity = 2.0;

    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        total += simplex.noise2D(x * frequency * scale, z * frequency * scale) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    const hillHeight = 4;
    let height = (total / maxValue) * hillHeight;

    const plateauRadius = 30;
    const distanceToCenter = Math.sqrt(x * x + z * z);
    
    // Create plateau at center
    if (distanceToCenter < plateauRadius) {
        const blendFactor = smoothstep(0, 1, distanceToCenter / plateauRadius);
        height *= blendFactor;
    }
    
    // Mountain generation for distant terrain
    const mountainStartRadius = 110; // Start raising terrain outside playable area
    if (distanceToCenter > mountainStartRadius) {
        // Calculate transition factor (0 at boundary, increases outwards)
        // Transition region over 150 units
        const transition = Math.min(1, Math.max(0, (distanceToCenter - mountainStartRadius) / 150));
        
        // Add large scale mountain noise
        const mountainScale = 0.01;
        // Use different offset to avoid correlation with ground detail
        const mountainNoise = simplex.noise2D(x * mountainScale + 1000, z * mountainScale + 1000);
        
        // Map -1..1 to 0..1 roughly, but we want mountains to go up
        // Height increase: up to 120 units
        const mountainHeight = (mountainNoise * 0.5 + 0.5) * 120 * transition; 
        
        // Blend it in
        height += mountainHeight;
    }

    return height;
}

function createHillyGround() {
    // Precompute heightmap for entire terrain (like Minecraft chunks)
    terrainHeightmap = [];
    for (let z = 0; z <= terrainSegments; z++) {
        terrainHeightmap[z] = [];
        for (let x = 0; x <= terrainSegments; x++) {
            // Convert grid coordinates to world coordinates
            const worldX = (x / terrainSegments - 0.5) * terrainSize;
            const worldZ = (z / terrainSegments - 0.5) * terrainSize;
            terrainHeightmap[z][x] = calculateTerrainHeight(worldX, worldZ);
        }
    }

    // Create terrain geometry using the precomputed heightmap
    const groundGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);

    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const vertexIndex = i / 3;
        const x = vertexIndex % (terrainSegments + 1);
        const z = Math.floor(vertexIndex / (terrainSegments + 1));

        vertices[i + 2] = terrainHeightmap[z][x]; // Set Y height from heightmap
    }

    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    const ground = new THREE.Mesh(groundGeometry, sharedMaterials.ground);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // Expose ground mesh globally for raycasting/building
    window.groundMesh = ground;

    // Signal that terrain is ready globally
    isTerrainReady = true;
    if (typeof window !== 'undefined') {
        window.isTerrainReady = true;
    }
}


// Function to create portals
function createPortals() {
    const portalNames = ['WELCOME', 'WELCOME', 'WELCOME', 'WELCOME', 'WELCOME', 'WELCOME'];
    const radius = 19.5;
    const angleIncrement = (Math.PI * 2) / 6;
    const portalColors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x8B00FF];

    for (let i = 0; i < 6; i++) {
        const angle = angleIncrement * i;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = getTerrainHeightAt(x, z); // Portals are now placed on the flat plateau

        const portalGroup = new THREE.Group();

        // Portal Frame with Flat Shading
        const frameGeometry = new THREE.BoxGeometry(5.2, 10.4, 0.65);
        const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, flatShading: true });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.y = 4;
        portalGroup.add(frame);

        // Inner Portal with Flat Shading
        const innerGeometry = new THREE.PlaneGeometry(4.55, 9.75);
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: portalColors[i],
            flatShading: true
        });
        const innerPortal = new THREE.Mesh(innerGeometry, innerMaterial);
        innerPortal.position.y = 4;
        innerPortal.position.z = 0.35;
        portalGroup.add(innerPortal);

        portalGroup.position.set(x, y + 1.0, z); // Add 1.0 to prevent z-fighting with ground
        portalGroup.rotation.y = -angle;

        // Calculate angle to face outward
        portalGroup.lookAt(0, 0, 0);
        portalGroup.rotateY(Math.PI);

        // Add label with Retro Font
        if (font) {
            const textGeometry = new THREE.TextGeometry(portalNames[i], {
                font: font,
                size: 1.04,
                depth: 0.1, // Extrusion depth (was using wrong parameter name 'height')
                bevelEnabled: false, // Disable bevel to keep it flat
                bevelThickness: 0,
                bevelSize: 0,
                curveSegments: 4, // Reduce curve segments for performance
            });
            const textMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                side: THREE.DoubleSide // Render both sides for flat text
            });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);

            // Center the text
            textGeometry.computeBoundingBox();
            const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
            textMesh.position.set(-textWidth / 2, 11.7, 0);
            textMesh.rotation.y = 0;

            portalGroup.add(textMesh);

            // Add floating animation to the label
            portals.push({
                group: portalGroup,
                name: portalNames[i],
                innerPortal: innerPortal,
                labelMesh: textMesh,
                labelStartY: textMesh.position.y,
            });
        } else {
            portals.push({
                group: portalGroup,
                name: portalNames[i],
                innerPortal: innerPortal,
            });
        }

        scene.add(portalGroup);
        // Add to objects for collision detection
        objects.push(portalGroup);
    }
}

// Tree data for LOD management is declared globally in core.js

// Function to create a single 3D tree
function create3DTree(x, z, detail, isOak = false) { // The y-pos will be set by the Group
    const tree = new THREE.Group();
    
    // Choose materials based on tree type
    const trunkMaterial = isOak ? sharedMaterials.oakTrunk : sharedMaterials.trunk;
    const foliageColors = isOak ? 
        [sharedMaterials.oakFoliage1, sharedMaterials.oakFoliage2, sharedMaterials.oakFoliage3] : 
        [sharedMaterials.foliage1, sharedMaterials.foliage2, sharedMaterials.foliage3];
    
    // Trunk - Hexagonal base (6 segments)
    const trunkHeight = 25 + Math.random() * 10;
    
    if (isOak) {
        // Oak Tree: Stout trunk, rounded canopy using Icosahedrons
        const trunkRadiusTop = 1.5;
        const trunkRadiusBottom = 2.0;
        // Shorter trunk for oak
        const oakTrunkHeight = 15 + Math.random() * 5;
        
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, oakTrunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = oakTrunkHeight / 2;
        tree.add(trunk);
        
        // Foliage: Large rounded clusters (Icosahedrons)
        // Create 2 overlapping clusters for a cloud-like shape
        for (let j = 0; j < 2; j++) {
            const radius = 10 - j * 2;
            const foliageGeometry = new THREE.IcosahedronGeometry(radius, 0); // Low poly sphere
            const foliage = new THREE.Mesh(foliageGeometry, foliageColors[j]);
            // Position at top of trunk, slightly offset
            foliage.position.y = oakTrunkHeight + 2 + j * 3;
            foliage.position.x = (Math.random() - 0.5) * 3;
            foliage.position.z = (Math.random() - 0.5) * 3;
            // Flatten slightly to look like a canopy
            foliage.scale.set(1.5, 0.8, 1.5);
            tree.add(foliage);
        }
        
        // Set height relative to base
        tree.userData.treeHeight = oakTrunkHeight + 15; 
    } else {
        // Pine Tree: Tall trunk, conical layers
        const trunkRadiusTop = 1;
        const trunkRadiusBottom = 1.5;
        
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    tree.add(trunk);

    // Foliage - Reduced layers and segments
    let foliageHeight = trunkHeight;
    const foliageLayers = detail.foliageLayers;

    for (let j = 0; j < foliageLayers; j++) {
            // Use 6 segments for hexagonal leaves (honeycomb style)
            const radiusBase = 6 - j; 
            const foliageGeometry = new THREE.ConeGeometry(radiusBase, 9, 6); // 6 segments = hexagon
        const foliage = new THREE.Mesh(foliageGeometry, foliageColors[j]);
        foliage.position.y = foliageHeight + 1;
        tree.add(foliage);
        foliageHeight += 4;
        }
        
        // Set height relative to base
        tree.userData.treeHeight = trunkHeight + 14; 
    }

    tree.position.set(x, 0, z); // Set base position, parent group will have y-pos
    tree.userData.isTree = true;
    
    console.log(`Tree created at (${x}, ${z}) with height ${tree.userData.treeHeight}, total objects: ${objects.length}`);

    return tree;
}

// Function to create a 2D billboard sprite for distant trees
// This creates a simplified 2D representation that matches the 3D tree structure
function create2DSprite(x, z, isOak = false) {
    const spriteGroup = new THREE.Group();
    
    // Choose colors based on tree type
    const trunkColor = isOak ? 0x4A3728 : 0x8B4513;
    const foliageColors = isOak ? [0x004d00, 0x006400, 0x2E8B57] : [0x006400, 0x008000, 0x228B22];
    
    // Match exact 3D tree dimensions
    const trunkHeight = isOak ? (15 + Math.random() * 5) : (25 + Math.random() * 10);
    
    // Create trunk - cylinder is radius 1 at top, 1.5 at bottom
    // Represent as trapezoid shape (wider at bottom)
    const trunkMaterial = new THREE.MeshBasicMaterial({
        color: trunkColor, // Brown trunk color (matching sharedMaterials.trunk)
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create trunk as a shape (trapezoid - wider at bottom)
    const trunkShape = new THREE.Shape();
    const topWidth = isOak ? 1.5 : 1; // Top radius
    const bottomWidth = isOak ? 2.0 : 1.5; // Bottom radius
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
        // Oak Sprite: Draw a large circle/ellipse for the canopy
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: foliageColors[0], // Use main autumn color
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        // Draw circle approximation (octagon)
        const foliageShape = new THREE.Shape();
        const radius = 12;
        const segments = 8;
        
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const px = Math.cos(theta) * radius * 1.2; // Slightly wider
            const py = Math.sin(theta) * radius * 0.8; // Slightly squashed
            if (i === 0) foliageShape.moveTo(px, py);
            else foliageShape.lineTo(px, py);
        }
        
        const foliageGeometry = new THREE.ShapeGeometry(foliageShape);
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = trunkHeight + 8;
        spriteGroup.add(foliage);
        
    } else {
        // Pine Sprite: Create foliage layers (matching 3D tree structure with 3 layers)
    let foliageY = trunkHeight;
    
    // Create 3 foliage layers (cones represented as triangles)
    for (let j = 0; j < 3; j++) {
        const coneRadius = 6 - j; // Decreasing radius per layer (6, 5, 4) matching 3D
        const coneHeight = 9; // Height of each cone layer
        
        const foliageMaterial = new THREE.MeshBasicMaterial({
            color: foliageColors[j],
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        
        // Create triangle shape for cone (point at top, wide at bottom)
        const foliageShape = new THREE.Shape();
        foliageShape.moveTo(0, coneHeight / 2); // Top point
        foliageShape.lineTo(coneRadius, -coneHeight / 2); // Bottom right
        foliageShape.lineTo(-coneRadius, -coneHeight / 2); // Bottom left
        foliageShape.lineTo(0, coneHeight / 2); // Back to top
        
        const foliageGeometry = new THREE.ShapeGeometry(foliageShape);
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = foliageY + 1; // Match 3D positioning
        spriteGroup.add(foliage);
        
        foliageY += 4; // Stack layers (matching 3D tree spacing)
        }
    }
    
    spriteGroup.position.set(x, 0, z);
    
    // Mark as sprite for easy identification
    spriteGroup.userData.isSprite = true;
    
    return spriteGroup;
}

// Function to create more complex trees (optimized for performance with LOD)
function createMoreComplexTrees() {
    // Initialize shared materials if not already done
    if (!sharedMaterials.trunk) {
        initSharedMaterials();
    }

    const treeCount = PERFORMANCE.treeCount;
    const treeRadius = 380; // Increased radius to place trees on the extended terrain
    const minDistanceFromCenter = 35; // Keep trees outside the flattened portal area
    const detail = PERFORMANCE.treeDetail;
    const lodDistance = PERFORMANCE.rendering.lodDistance;

    // Clear existing tree data
    treeData = [];

    for (let i = 0; i < treeCount; i++) {
        // Distribute trees in a circular area, avoiding the center
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistanceFromCenter + Math.random() * (treeRadius - minDistanceFromCenter);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Check for overlap with existing trees to prevent z-fighting/clipping
        let overlap = false;
        const minSpacing = 15; // Minimum distance between trees
        
        for (let j = 0; j < treeData.length; j++) {
            const otherTree = treeData[j];
            const dist = Math.sqrt(Math.pow(x - otherTree.position.x, 2) + Math.pow(z - otherTree.position.z, 2));
            if (dist < minSpacing) {
                overlap = true;
                break;
            }
        }
        
        if (overlap) {
            i--; // Try again
            continue;
        }
        
        // Set tree's y position based on terrain height
        const y = getTerrainHeightAt(x, z);

        const position = new THREE.Vector3(x, y, z);

        // Calculate distance from character (or origin if character not ready)
        const charPos = character ? character.position : new THREE.Vector3(0, 0, 0);
        const distFromChar = position.distanceTo(charPos);

        let treeGroup, sprite;
        let is3D = distFromChar < lodDistance;
        
        // Determine tree type: 10% chance for Autumn Oak, 90% for Standard Pine
        // We'll store the type in userData to maintain consistency during LOD switches
        const isOak = Math.random() < 0.1; // Sparsely populate (10%)

        if (is3D) {
            // Create full 3D tree
            treeGroup = create3DTree(x, z, detail, isOak);
            treeGroup.position.y = y; 
            scene.add(treeGroup);
            objects.push(treeGroup);

            // Manually update treeData with the absolute height
            treeGroup.userData.absoluteTreeHeight = y + treeGroup.userData.treeHeight;
        } else {
            // Create 2D sprite for distant trees
            sprite = create2DSprite(x, z, isOak);
            // Ensure sprite is positioned correctly on the heightmap
            sprite.position.y = y; 
            scene.add(sprite);
        }

        // Store tree data for LOD updates
        treeData.push({
            position: position,
            group: treeGroup,
            sprite: sprite,
            is3D: is3D,
            isOak: isOak // Store type
        });
    }
}

// Update LOD based on distance from character
function updateTreeLOD() {
    if (!PERFORMANCE.rendering.lodEnabled || !character) return;
    
    const lodDistance = PERFORMANCE.rendering.lodDistance;
    const charPos = character.position;

    treeData.forEach((tree, index) => {
        const distance = tree.position.distanceTo(charPos);
        const shouldBe3D = distance < lodDistance;

        // Only update if LOD state needs to change
        if (shouldBe3D !== tree.is3D) {
            if (shouldBe3D) {
                // Switch from 2D to 3D
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
                // Switch from 3D to 2D
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
                    // Critical fix: Set the Y position for the sprite!
                    const y = getTerrainHeightAt(tree.position.x, tree.position.z);
                    tree.sprite.position.y = y;
                    scene.add(tree.sprite);
                }
                tree.is3D = false;
            }
        }

    });
}

// Update sprite billboards to face camera (called every frame)
function updateSpriteBillboards() {
    if (!camera || !character) return;
    
    treeData.forEach((tree) => {
        if (tree.sprite && !tree.is3D) {
            // Make sprite always face the camera (billboard effect)
            // Calculate direction from sprite to camera
            const direction = new THREE.Vector3();
            direction.subVectors(camera.position, tree.sprite.position);
            direction.y = 0; // Keep sprite vertical (don't tilt up/down)
            direction.normalize();
            
            // Calculate rotation to face camera
            const angle = Math.atan2(direction.x, direction.z);
            tree.sprite.rotation.y = angle;
        }
    });
}

