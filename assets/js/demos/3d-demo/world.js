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

// Function to create more complex trees
function createMoreComplexTrees() {
    const treeCount = 500;
    const treeRadius = 1000;
    const minDistanceFromCenter = 30;

    for (let i = 0; i < treeCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistanceFromCenter + Math.random() * (treeRadius - minDistanceFromCenter);
        const x = distance * Math.cos(angle);
        const z = distance * Math.sin(angle);

        const tree = new THREE.Group();

        // Trunk
        const trunkHeight = 25 + Math.random() * 10;
        const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, trunkHeight, 8);
        const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        tree.add(trunk);

        // Foliage - Multiple Layers of Leaves
        const foliageColors = [0x006400, 0x008000, 0x228B22];
        let foliageHeight = trunkHeight;

        for (let j = 0; j < 3; j++) {
            const foliageGeometry = new THREE.ConeGeometry(6 - j, 9, 5);
            const foliageMaterial = new THREE.MeshBasicMaterial({ color: foliageColors[j], flatShading: true });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.position.y = foliageHeight + 1;
            tree.add(foliage);
            foliageHeight += 4;
        }

        tree.position.set(x, 0, z);
        scene.add(tree);
        objects.push(tree);
    }
}

