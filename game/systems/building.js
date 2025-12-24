// Build System for placing objects
// Allows players to place low-poly structures like Minecraft but with non-blocky shapes

let isBuildMode = false;
let buildGhost = null;
let buildRaycaster = new THREE.Raycaster();
let buildMouse = new THREE.Vector2();
let buildType = 0; // 0: Stone, 1: Pillar, 2: Crystal
const BUILD_TYPES = ['Stone', 'Pillar', 'Crystal'];
let buildRotation = 0;

function initBuildSystem() {
    // Create UI overlay for build mode (hidden by default)
    const buildUI = document.createElement('div');
    buildUI.id = 'build-ui';
    buildUI.style.position = 'absolute';
    buildUI.style.bottom = '80px'; // Above the controls/chat
    buildUI.style.right = '20px';
    buildUI.style.color = '#fff';
    buildUI.style.fontFamily = '"Courier New", Courier, monospace';
    buildUI.style.fontSize = '14px';
    buildUI.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    buildUI.style.padding = '10px';
    buildUI.style.border = '2px solid #fff';
    buildUI.style.display = 'none';
    buildUI.style.pointerEvents = 'none'; // Let clicks pass through
    buildUI.innerHTML = `
        <div style="font-weight:bold; margin-bottom:5px; color:#ffff00">BUILD MODE [B]</div>
        <div>Left Click: Place Object</div>
        <div>R: Rotate Object</div>
        <div>Hover over existing objects to stack!</div>
        <div>1: Stone (Low Poly)</div>
        <div>2: Pillar (Cylinder)</div>
        <div>3: Crystal (Shard)</div>
        <div id="current-build-type" style="margin-top:5px; color:#00ff00">Selected: Stone</div>
    `;
    document.body.appendChild(buildUI);

    // Create ghost object material
    const ghostMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        wireframe: true
    });

    // Create initial ghost
    updateGhostGeometry();
    
    // Listen for events
    document.addEventListener('mousemove', onBuildMouseMove, false);
    document.addEventListener('mousedown', onBuildMouseDown, false);
    document.addEventListener('keydown', onBuildKeyDown, false);
}

function toggleBuildMode() {
    isBuildMode = !isBuildMode;
    const ui = document.getElementById('build-ui');
    
    if (isBuildMode) {
        ui.style.display = 'block';
        if (buildGhost) buildGhost.visible = true;
        showNotification("Build Mode ENABLED");
    } else {
        ui.style.display = 'none';
        if (buildGhost) buildGhost.visible = false;
        showNotification("Build Mode DISABLED");
    }
}

function updateGhostGeometry() {
    if (buildGhost) {
        scene.remove(buildGhost);
    }

    let geometry;
    const color = new THREE.Color();

    switch(buildType) {
        case 0: // Stone
            geometry = new THREE.DodecahedronGeometry(1.5, 0); // Low poly sphere/rock
            color.setHex(0x888888);
            break;
        case 1: // Pillar
            geometry = new THREE.CylinderGeometry(0.8, 1, 4, 6); // Hexagonal pillar
            color.setHex(0xaaaaaa);
            break;
        case 2: // Crystal
            geometry = new THREE.ConeGeometry(0.8, 3, 4); // Pyramid/shard
            color.setHex(0x00ffff);
            break;
    }

    const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        wireframe: true
    });

    buildGhost = new THREE.Mesh(geometry, material);
    buildGhost.visible = isBuildMode;
    scene.add(buildGhost);
    
    // Update UI text
    const typeLabel = document.getElementById('current-build-type');
    if (typeLabel) {
        typeLabel.textContent = `Selected: ${BUILD_TYPES[buildType]}`;
    }
}

function onBuildKeyDown(event) {
    // Ignore if typing in chat
    const chatInput = document.getElementById('chat-input');
    if (chatInput && document.activeElement === chatInput) return;

    if (event.code === 'KeyB') {
        toggleBuildMode();
    }

    if (!isBuildMode) return;

    switch(event.key) {
        case '1':
            buildType = 0;
            updateGhostGeometry();
            break;
        case '2':
            buildType = 1;
            updateGhostGeometry();
            break;
        case '3':
            buildType = 2;
            updateGhostGeometry();
            break;
        case 'r':
        case 'R':
            buildRotation += Math.PI / 4;
            if (buildGhost) buildGhost.rotation.y = buildRotation;
            break;
    }
}

function onBuildMouseMove(event) {
    if (!isBuildMode) return;

    // Calculate mouse position in normalized device coordinates
    buildMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    buildMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    updateGhostPosition();
}

function updateGhostPosition() {
    if (!buildGhost || !camera) return;

    buildRaycaster.setFromCamera(buildMouse, camera);

    // Collect all terrain meshes (single groundMesh or chunk meshes)
    const intersectObjects = [];

    // Check for single-mesh terrain
    if (window.groundMesh) {
        intersectObjects.push(window.groundMesh);
    }

    // Check for chunked terrain
    if (typeof loadedChunks !== 'undefined') {
        for (const chunk of loadedChunks.values()) {
            if (chunk.mesh) {
                intersectObjects.push(chunk.mesh);
            }
        }
    }

    // Add all placed objects to intersection check
    if (typeof objects !== 'undefined') {
        objects.forEach(obj => {
            if (obj.isMesh && obj.visible && obj !== buildGhost) {
                intersectObjects.push(obj);
            }
        });
    }

    if (intersectObjects.length === 0) return;

    // Intersect with ground AND placed objects
    const intersects = buildRaycaster.intersectObjects(intersectObjects);

    if (intersects.length > 0) {
        const intersection = intersects[0];
        const point = intersection.point;
        const normal = intersection.face.normal;

        let position = point.clone();

        // Check if we hit terrain (groundMesh or chunk)
        const isGround = intersection.object === window.groundMesh ||
            (typeof loadedChunks !== 'undefined' &&
             [...loadedChunks.values()].some(c => c.mesh === intersection.object));

        if (isGround) {
            // Hitting ground - adjust height based on object type
            let yOffset = 0;
            switch(buildType) {
                case 0: yOffset = 1.5; break; // Stone radius
                case 1: yOffset = 2.0; break; // Pillar half height
                case 2: yOffset = 1.5; break; // Crystal half height
            }
            position.y += yOffset;
        } else {
            // Hitting another object - stack based on normal
            let offsetDistance = 0;
            switch(buildType) {
                case 0: offsetDistance = 1.4; break;
                case 1: offsetDistance = 2.0; break;
                case 2: offsetDistance = 1.5; break;
            }
            position.add(normal.clone().multiplyScalar(offsetDistance));
        }

        buildGhost.position.copy(position);
        buildGhost.rotation.y = buildRotation;
    }
}

function onBuildMouseDown(event) {
    if (!isBuildMode || event.button !== 0) return; // Only left click
    
    // Prevent placing if clicking on UI (though pointer-events: none handles most)
    
    placeObject();
}

// Place object function - can be called locally or from network
function placeObject(networkData = null) {
    // If networkData is provided, use it. Otherwise use local buildGhost state.
    
    let position, rotationY, type, colorHex, rotationX = 0, rotationZ = 0;
    
    if (networkData) {
        // Network placement
        position = new THREE.Vector3(networkData.x, networkData.y, networkData.z);
        rotationY = networkData.ry;
        rotationX = networkData.rx || 0;
        rotationZ = networkData.rz || 0;
        type = networkData.type;
        colorHex = networkData.color;
    } else {
        // Local placement
        if (!buildGhost || !buildGhost.visible) return;
        
        position = buildGhost.position.clone();
        rotationY = buildRotation;
        type = buildType;
        
        // Use HSL for guaranteed color visibility
        const hue = Math.floor(Math.random() * 360); 
        const saturation = 60 + Math.floor(Math.random() * 30); 
        const lightness = 70 + Math.floor(Math.random() * 20); 
        
        const color = new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        colorHex = color.getHex();
        
        // Add random slight variation to rotation/scale for organic feel (except pillar height)
        if (type === 0) {
            rotationX = Math.random() * Math.PI;
            rotationZ = Math.random() * Math.PI;
        }
    }

    let geometry;
    let material;
    
    switch(type) {
        case 0: // Stone
            geometry = new THREE.DodecahedronGeometry(1.5, 0);
            material = new THREE.MeshLambertMaterial({ // Use Lambert for better color + simple shading
                color: colorHex
            });
            break;
        case 1: // Pillar
            geometry = new THREE.CylinderGeometry(0.8, 1, 4, 6);
            material = new THREE.MeshLambertMaterial({ 
                color: colorHex
            });
            break;
        case 2: // Crystal
            geometry = new THREE.ConeGeometry(0.8, 3, 4);
            material = new THREE.MeshPhongMaterial({ // Phong for shininess on crystals
                color: colorHex,
                emissive: colorHex,
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.9,
                shininess: 100
            });
            break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.y = rotationY;
    mesh.rotation.x = rotationX;
    mesh.rotation.z = rotationZ;

    scene.add(mesh);
    
    // Important: Add to objects array for collision detection
    if (typeof objects !== 'undefined') {
        objects.push(mesh);
    } else if (window.objects) {
        window.objects.push(mesh);
    }
    
    // If this was a local placement, send to server
    if (!networkData && typeof sendBuildToServer === 'function') {
        sendBuildToServer({
            type: type,
            x: position.x,
            y: position.y,
            z: position.z,
            ry: rotationY,
            rx: rotationX,
            rz: rotationZ,
            color: colorHex
        });
    }
}

