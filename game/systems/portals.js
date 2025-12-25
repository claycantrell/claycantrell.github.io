// Portal system - creates portal gates around the map center
// Uses Systems registry pattern for organized update loop

// PortalSystem - manages portal creation and interaction
const PortalSystem = {
    init() {
        // Portals are created after font is loaded, called from core.js
    },

    update(delta) {
        // Skip if no character or portals
        if (!GAME.character || !GAME.world.portals) return;

        const currentTime = performance.now();

        GAME.world.portals.forEach(portalObj => {
            const distance = GAME.character.position.distanceTo(portalObj.group.position);

            if (distance < 5) {
                showNotification(`Portal to ${portalObj.name} Triggered`);

                const colors = [0xFF0000, 0x00FF00, 0x0000FF];
                portalObj.innerPortal.material.color.setHex(colors[Math.floor(Math.random() * 3)]);

                if (!GAME.state.portalActivated) {
                    GAME.state.portalActivated = true;
                    if (typeof fadeOutToWhite === 'function') {
                        fadeOutToWhite();
                    }
                }
            } else {
                portalObj.innerPortal.material.color.setHex(0xFFFFFF);
            }

            // Animate label floating
            if (portalObj.labelMesh) {
                const frame = Math.floor(currentTime / 100);
                portalObj.labelMesh.position.y =
                    portalObj.labelStartY + Math.sin(frame * 0.2 + portalObj.group.position.x) * 0.2;
            }
        });
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('portals', PortalSystem);
}

function createPortals() {
    // Clear existing portals to prevent duplicates
    if (GAME.world.portals && GAME.world.portals.length > 0) {
        GAME.world.portals.forEach(portalObj => {
            if (portalObj.group && portalObj.group.parent) {
                portalObj.group.parent.remove(portalObj.group);
            }
            if (portalObj.group && GAME.scene) {
                GAME.scene.remove(portalObj.group);
            }
        });
        GAME.world.portals = [];
    }

    // Get portal config from map
    const portalConfig = typeof getPortalConfig === 'function' ? getPortalConfig() : {};
    const configPortals = portalConfig.portals || [];
    const radius = portalConfig.radius || 19.5;

    // Use config portals if available, otherwise use defaults
    const portalData = configPortals.length > 0 ? configPortals : [
        { name: 'WELCOME', angle: 0, color: '#FF0000' },
        { name: 'WELCOME', angle: 60, color: '#FF7F00' },
        { name: 'WELCOME', angle: 120, color: '#FFFF00' },
        { name: 'WELCOME', angle: 180, color: '#00FF00' },
        { name: 'WELCOME', angle: 240, color: '#0000FF' },
        { name: 'WELCOME', angle: 300, color: '#8B00FF' }
    ];

    for (let i = 0; i < portalData.length; i++) {
        const portal = portalData[i];
        const angle = (portal.angle || 0) * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = getTerrainHeightAt(x, z);

        const portalGroup = new THREE.Group();

        // Portal Frame
        const frameGeometry = new THREE.BoxGeometry(5.2, 10.4, 0.65);
        const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.y = 4;
        portalGroup.add(frame);

        // Inner Portal
        const innerGeometry = new THREE.PlaneGeometry(4.55, 9.75);
        const portalColor = portal.color || '#FF0000';
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: portalColor
        });
        const innerPortal = new THREE.Mesh(innerGeometry, innerMaterial);
        innerPortal.position.y = 4;
        innerPortal.position.z = 0.35;
        portalGroup.add(innerPortal);

        portalGroup.position.set(x, y + 1.0, z);

        // Get portal name from config
        const portalName = portal.name || 'PORTAL';

        // Add label with Retro Font using TextGeometry
        const loadedFont = GAME.resources.font;
        if (loadedFont) {
            const textGeometry = new THREE.TextGeometry(portalName, {
                font: loadedFont,
                size: 1.04,
                depth: 0.1,
                bevelEnabled: false,
                bevelThickness: 0,
                bevelSize: 0,
                curveSegments: 4,
            });
            
            textGeometry.computeBoundingBox();
            const bb = textGeometry.boundingBox;
            const textWidth = bb.max.x - bb.min.x;
            const textHeight = bb.max.y - bb.min.y;
            
            // Debug: Log geometry info
            console.log(`Text "${portalName}": width=${textWidth.toFixed(2)}, height=${textHeight.toFixed(2)}, ratio=${(textWidth/textHeight).toFixed(2)}`);
            console.log(`Bounding box: min=(${bb.min.x.toFixed(2)}, ${bb.min.y.toFixed(2)}, ${bb.min.z.toFixed(2)}), max=(${bb.max.x.toFixed(2)}, ${bb.max.y.toFixed(2)}, ${bb.max.z.toFixed(2)})`);
            
            // Check for corrupted geometry - inspect vertices
            const positions = textGeometry.attributes.position;
            if (positions) {
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;
                let minZ = Infinity, maxZ = -Infinity;
                
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const y = positions.getY(i);
                    const z = positions.getZ(i);
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                    minZ = Math.min(minZ, z);
                    maxZ = Math.max(maxZ, z);
                }
                
                console.log(`Vertex bounds: X[${minX.toFixed(2)}, ${maxX.toFixed(2)}], Y[${minY.toFixed(2)}, ${maxY.toFixed(2)}], Z[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);
                
                // Fix corrupted geometry
                const expectedMaxWidth = portalName.length * 1.5;
                const expectedDepth = 0.1; // Should match depth parameter
                let needsFix = false;
                
                // Fix Z depth if it's way too large
                if (maxZ - minZ > expectedDepth * 10) {
                    console.warn(`Fixing Z depth: ${(maxZ - minZ).toFixed(2)} -> ${expectedDepth}`);
                    const zScaleFactor = expectedDepth / (maxZ - minZ);
                    
                    // Scale all Z coordinates
                    for (let i = 0; i < positions.count; i++) {
                        const z = positions.getZ(i);
                        positions.setZ(i, z * zScaleFactor);
                    }
                    needsFix = true;
                }
                
                // Fix X width if it's way too large
                if (maxX - minX > expectedMaxWidth * 10) {
                    console.warn(`Fixing X width: ${(maxX - minX).toFixed(2)} -> ${expectedMaxWidth}`);
                    const xScaleFactor = expectedMaxWidth / (maxX - minX);
                    
                    // Scale all X coordinates
                    for (let i = 0; i < positions.count; i++) {
                        const x = positions.getX(i);
                        positions.setX(i, x * xScaleFactor);
                    }
                    needsFix = true;
                }
                
                if (needsFix) {
                    positions.needsUpdate = true;
                    textGeometry.computeBoundingBox();
                }
            }
            
            const textMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                side: THREE.DoubleSide
            });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            
            // Recompute bounding box after potential fixes
            textGeometry.computeBoundingBox();
            const finalBb = textGeometry.boundingBox;
            const textCenterX = (finalBb.min.x + finalBb.max.x) / 2;
            const textCenterY = (finalBb.min.y + finalBb.max.y) / 2;
            
            textMesh.position.set(-textCenterX, 11.7 - textCenterY, 0);
            portalGroup.add(textMesh);

            GAME.world.portals.push({
                group: portalGroup,
                name: portalName,
                innerPortal: innerPortal,
                labelMesh: textMesh,
                labelStartY: 11.7,
            });
        } else {
            GAME.world.portals.push({
                group: portalGroup,
                name: portalName,
                innerPortal: innerPortal,
            });
        }

        // Face outward from center
        portalGroup.lookAt(0, portalGroup.position.y, 0);
        portalGroup.rotateY(Math.PI);

        GAME.scene.add(portalGroup);
        GAME.world.objects.push(portalGroup);
    }
}

// Make available globally
window.createPortals = createPortals;
window.PortalSystem = PortalSystem;
