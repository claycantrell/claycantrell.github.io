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
        const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, flatShading: true });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.y = 4;
        portalGroup.add(frame);

        // Inner Portal
        const innerGeometry = new THREE.PlaneGeometry(4.55, 9.75);
        const portalColor = portal.color || '#FF0000';
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: portalColor,
            flatShading: true
        });
        const innerPortal = new THREE.Mesh(innerGeometry, innerMaterial);
        innerPortal.position.y = 4;
        innerPortal.position.z = 0.35;
        portalGroup.add(innerPortal);

        portalGroup.position.set(x, y + 1.0, z);
        portalGroup.rotation.y = -angle;

        // Face outward
        portalGroup.lookAt(0, 0, 0);
        portalGroup.rotateY(Math.PI);

        // Get portal name from config
        const portalName = portal.name || 'PORTAL';

        // Add label with Retro Font
        if (font) {
            const textGeometry = new THREE.TextGeometry(portalName, {
                font: font,
                size: 1.04,
                depth: 0.1,
                bevelEnabled: false,
                bevelThickness: 0,
                bevelSize: 0,
                curveSegments: 4,
            });
            const textMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                side: THREE.DoubleSide
            });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);

            // Center the text
            textGeometry.computeBoundingBox();
            const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
            textMesh.position.set(-textWidth / 2, 11.7, 0);
            textMesh.rotation.y = 0;

            portalGroup.add(textMesh);

            portals.push({
                group: portalGroup,
                name: portalName,
                innerPortal: innerPortal,
                labelMesh: textMesh,
                labelStartY: textMesh.position.y,
            });
        } else {
            portals.push({
                group: portalGroup,
                name: portalName,
                innerPortal: innerPortal,
            });
        }

        scene.add(portalGroup);
        objects.push(portalGroup);
    }
}

// Make available globally
window.createPortals = createPortals;
window.PortalSystem = PortalSystem;
