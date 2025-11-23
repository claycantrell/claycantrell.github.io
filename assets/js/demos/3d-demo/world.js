// World/environment creation (portals, trees, ground)

// Function to create portals
function createPortals() {
    const portalNames = ['WELCOME', 'WELCOME', 'WELCOME', 'WELCOME', 'WELCOME', 'WELCOME'];
    const radius = 19.5;
    const angleIncrement = (Math.PI * 2) / 6;
    const portalColors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x8B00FF];

    for (let i = 0; i < 6; i++) {
        const angle = angleIncrement * i;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        const position = new THREE.Vector3(x, 0, z);

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

        portalGroup.position.copy(position);

        // Calculate angle to face outward
        portalGroup.lookAt(0, 0, 0);
        portalGroup.rotateY(Math.PI);

        // Add label with Retro Font
        if (font) {
            const textGeometry = new THREE.TextGeometry(portalNames[i], {
                font: font,
                size: 1.04,
                height: 0.1,
            });
            const textMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                flatShading: true
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
function create3DTree(x, z, detail) {
    const tree = new THREE.Group();
    
    // Trunk - Reduced segments
    const trunkHeight = 25 + Math.random() * 10;
    const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, trunkHeight, detail.trunkSegments);
    const trunk = new THREE.Mesh(trunkGeometry, sharedMaterials.trunk);
    trunk.position.y = trunkHeight / 2;
    tree.add(trunk);

    // Foliage - Reduced layers and segments
    const foliageColors = [sharedMaterials.foliage1, sharedMaterials.foliage2, sharedMaterials.foliage3];
    let foliageHeight = trunkHeight;
    const foliageLayers = detail.foliageLayers;

    for (let j = 0; j < foliageLayers; j++) {
        const foliageGeometry = new THREE.ConeGeometry(6 - j, 9, detail.coneSegments);
        const foliage = new THREE.Mesh(foliageGeometry, foliageColors[j]);
        foliage.position.y = foliageHeight + 1;
        tree.add(foliage);
        foliageHeight += 4;
    }

    tree.position.set(x, 0, z);
    return tree;
}

// Function to create a 2D billboard sprite for distant trees
// This creates a simplified 2D representation that matches the 3D tree structure
function create2DSprite(x, z) {
    const spriteGroup = new THREE.Group();
    
    // Match exact 3D tree dimensions
    const trunkHeight = 25 + Math.random() * 10; // Match 3D tree variation
    
    // Create trunk - cylinder is radius 1 at top, 1.5 at bottom
    // Represent as trapezoid shape (wider at bottom)
    const trunkMaterial = new THREE.MeshBasicMaterial({
        color: 0x8B4513, // Brown trunk color (matching sharedMaterials.trunk)
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create trunk as a shape (trapezoid - wider at bottom)
    const trunkShape = new THREE.Shape();
    const topWidth = 1; // Top radius
    const bottomWidth = 1.5; // Bottom radius
    trunkShape.moveTo(-topWidth, trunkHeight / 2);
    trunkShape.lineTo(topWidth, trunkHeight / 2);
    trunkShape.lineTo(bottomWidth, -trunkHeight / 2);
    trunkShape.lineTo(-bottomWidth, -trunkHeight / 2);
    trunkShape.lineTo(-topWidth, trunkHeight / 2);
    
    const trunkGeometry = new THREE.ShapeGeometry(trunkShape);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    spriteGroup.add(trunk);
    
    // Create foliage layers (matching 3D tree structure with 3 layers)
    const foliageColors = [0x006400, 0x008000, 0x228B22]; // Match sharedMaterials foliage colors
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
    const treeRadius = 1000;
    const minDistanceFromCenter = 30;
    const detail = PERFORMANCE.treeDetail;
    const lodDistance = PERFORMANCE.rendering.lodDistance;

    // Clear existing tree data
    treeData = [];

    for (let i = 0; i < treeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistanceFromCenter + Math.random() * (treeRadius - minDistanceFromCenter);
        const x = distance * Math.cos(angle);
        const z = distance * Math.sin(angle);

        const position = new THREE.Vector3(x, 0, z);
        
        // Calculate distance from character (or origin if character not ready)
        const charPos = character ? character.position : new THREE.Vector3(0, 0, 0);
        const distFromChar = position.distanceTo(charPos);

        let treeGroup, sprite;
        let is3D = distFromChar < lodDistance;

        if (is3D) {
            // Create full 3D tree
            treeGroup = create3DTree(x, z, detail);
            scene.add(treeGroup);
            objects.push(treeGroup);
        } else {
            // Create 2D sprite for distant trees
            sprite = create2DSprite(x, z);
            scene.add(sprite);
        }

        // Store tree data for LOD updates
        treeData.push({
            position: position,
            group: treeGroup,
            sprite: sprite,
            is3D: is3D
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
                    tree.group = create3DTree(tree.position.x, tree.position.z, PERFORMANCE.treeDetail);
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
                    tree.sprite = create2DSprite(tree.position.x, tree.position.z);
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

