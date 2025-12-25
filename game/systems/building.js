// Minecraft-style Grid Building System
// Place blocks on a 2-unit grid for LEGO-like building
// Uses Systems registry pattern for organized update loop

// BuildingSystem - manages block placement and removal
const BuildingSystem = {
    init() {
        initBuildSystem();
    },

    update(delta) {
        // Building mode updates ghost position via mouse events
        // No per-frame update needed
    }
};

// Register with Systems registry
if (typeof Systems !== 'undefined') {
    Systems.register('building', BuildingSystem);
}

const GRID_SIZE = 2; // Size of each block
let isBuildMode = false;
let buildGhost = null;
let buildRaycaster = new THREE.Raycaster();
let buildMouse = new THREE.Vector2();
let buildType = 0;
let placedBlocks = new Map(); // Grid position -> mesh

// Block types with colors
const BLOCK_TYPES = [
    { name: 'Dirt', color: 0x8B4513, emissive: false },
    { name: 'Stone', color: 0x808080, emissive: false },
    { name: 'Wood', color: 0xDEB887, emissive: false },
    { name: 'Brick', color: 0xB22222, emissive: false },
    { name: 'Glass', color: 0x87CEEB, emissive: false, transparent: true },
    { name: 'Gold', color: 0xFFD700, emissive: true },
    { name: 'Grass', color: 0x228B22, emissive: false },
    { name: 'Torch', color: 0xFF6600, emissive: true, isTorch: true, lightColor: 0xFFAA44, lightIntensity: 30, lightDistance: 60 }
];

// Torch sprite texture (generated once)
let torchSpriteMaterial = null;

// Shared block geometry (reuse for performance)
let sharedBlockGeometry = null;

function initBuildSystem() {
    // Create shared geometry
    sharedBlockGeometry = new THREE.BoxGeometry(GRID_SIZE * 0.95, GRID_SIZE * 0.95, GRID_SIZE * 0.95);

    // Create torch sprite texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Draw stick
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(28, 50, 8, 78);

    // Draw flame glow
    const gradient = ctx.createRadialGradient(32, 35, 0, 32, 35, 30);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.9)');
    gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 70);

    // Draw flame core
    ctx.fillStyle = '#FFFF88';
    ctx.beginPath();
    ctx.ellipse(32, 40, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    const torchTexture = new THREE.CanvasTexture(canvas);
    torchSpriteMaterial = new THREE.SpriteMaterial({
        map: torchTexture,
        transparent: true,
        depthWrite: false
    });

    // Create UI overlay
    const buildUI = document.createElement('div');
    buildUI.id = 'build-ui';
    buildUI.style.cssText = `
        position: absolute;
        bottom: 80px;
        right: 20px;
        color: #fff;
        font-family: "Courier New", monospace;
        font-size: 14px;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border: 2px solid #fff;
        display: none;
        pointer-events: none;
    `;

    // Build UI safely without innerHTML (XSS prevention)
    const header = document.createElement('div');
    header.style.cssText = 'font-weight:bold; margin-bottom:5px; color:#ffff00';
    header.textContent = 'BUILD MODE [B]';
    buildUI.appendChild(header);

    const instructions = [
        'Left Click: Place Block',
        'Right Click: Remove Block',
        'Scroll: Change Block'
    ];
    instructions.forEach(text => {
        const div = document.createElement('div');
        div.textContent = text;
        buildUI.appendChild(div);
    });

    // Block type list
    BLOCK_TYPES.forEach((b, i) => {
        const div = document.createElement('div');
        div.textContent = `${i + 1}: ${b.name}`;
        buildUI.appendChild(div);
    });

    const currentType = document.createElement('div');
    currentType.id = 'current-build-type';
    currentType.style.cssText = 'margin-top:5px; color:#00ff00';
    currentType.textContent = `Selected: ${BLOCK_TYPES[0].name}`;
    buildUI.appendChild(currentType);

    const gridPos = document.createElement('div');
    gridPos.id = 'grid-pos';
    gridPos.style.color = '#aaa';
    buildUI.appendChild(gridPos);

    document.body.appendChild(buildUI);

    // Create ghost block
    updateGhostGeometry();

    // Event listeners
    document.addEventListener('mousemove', onBuildMouseMove, false);
    document.addEventListener('mousedown', onBuildMouseDown, false);
    document.addEventListener('keydown', onBuildKeyDown, false);
    document.addEventListener('wheel', onBuildScroll, false);
    document.addEventListener('contextmenu', (e) => {
        if (isBuildMode) e.preventDefault();
    });
}

// Snap world position to grid
function snapToGrid(x, y, z) {
    return {
        x: Math.round(x / GRID_SIZE) * GRID_SIZE,
        y: Math.round(y / GRID_SIZE) * GRID_SIZE,
        z: Math.round(z / GRID_SIZE) * GRID_SIZE
    };
}

// Get grid key for position
function gridKey(x, y, z) {
    const snapped = snapToGrid(x, y, z);
    return `${snapped.x},${snapped.y},${snapped.z}`;
}

function toggleBuildMode() {
    isBuildMode = !isBuildMode;
    const ui = document.getElementById('build-ui');

    if (isBuildMode) {
        ui.style.display = 'block';
        if (buildGhost) buildGhost.visible = true;
        showNotification("Build Mode ON - Left click to place, Right click to remove");
    } else {
        ui.style.display = 'none';
        if (buildGhost) buildGhost.visible = false;
        showNotification("Build Mode OFF");
    }
}

function updateGhostGeometry() {
    if (buildGhost) {
        scene.remove(buildGhost);
    }

    const blockDef = BLOCK_TYPES[buildType];
    const material = new THREE.MeshBasicMaterial({
        color: blockDef.color,
        transparent: true,
        opacity: 0.5,
        wireframe: true
    });

    // Use sprite for torch, mesh for blocks
    if (blockDef.isTorch && torchSpriteMaterial) {
        const ghostMat = torchSpriteMaterial.clone();
        ghostMat.opacity = 0.5;
        buildGhost = new THREE.Sprite(ghostMat);
        buildGhost.scale.set(1.5, 3, 1);
    } else {
        buildGhost = new THREE.Mesh(sharedBlockGeometry || new THREE.BoxGeometry(GRID_SIZE * 0.95, GRID_SIZE * 0.95, GRID_SIZE * 0.95), material);
    }

    buildGhost.visible = isBuildMode;
    scene.add(buildGhost);

    // Update UI
    const typeLabel = document.getElementById('current-build-type');
    if (typeLabel) {
        typeLabel.textContent = `Selected: ${blockDef.name}`;
    }
}

function onBuildKeyDown(event) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput && document.activeElement === chatInput) return;

    if (event.code === 'KeyB') {
        toggleBuildMode();
        return;
    }

    if (!isBuildMode) return;

    // Number keys 1-7 for block types
    const num = parseInt(event.key);
    if (num >= 1 && num <= BLOCK_TYPES.length) {
        buildType = num - 1;
        updateGhostGeometry();
    }
}

function onBuildScroll(event) {
    if (!isBuildMode) return;

    if (event.deltaY > 0) {
        buildType = (buildType + 1) % BLOCK_TYPES.length;
    } else {
        buildType = (buildType - 1 + BLOCK_TYPES.length) % BLOCK_TYPES.length;
    }
    updateGhostGeometry();
}

function onBuildMouseMove(event) {
    if (!isBuildMode) return;

    buildMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    buildMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    updateGhostPosition();
}

function updateGhostPosition() {
    if (!buildGhost || !camera) return;

    buildRaycaster.setFromCamera(buildMouse, camera);

    // Collect intersectable objects
    const intersectObjects = [];

    // Terrain
    if (window.groundMesh) {
        intersectObjects.push(window.groundMesh);
    }
    if (typeof loadedChunks !== 'undefined') {
        for (const chunk of loadedChunks.values()) {
            if (chunk.mesh) intersectObjects.push(chunk.mesh);
        }
    }

    // Placed blocks (meshes and sprites)
    placedBlocks.forEach((block) => {
        if (block !== buildGhost) {
            intersectObjects.push(block);
        }
    });

    // Also check global objects array
    if (typeof GAME !== 'undefined' && GAME.world?.objects) {
        GAME.world.objects.forEach(obj => {
            if (obj.visible && obj !== buildGhost && obj.userData?.isBlock) {
                intersectObjects.push(obj);
            }
        });
    }

    if (intersectObjects.length === 0) return;

    const intersects = buildRaycaster.intersectObjects(intersectObjects);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const point = hit.point;
        const normal = hit.face.normal;

        let gridPos;

        // Check if we hit a block or terrain
        const hitObject = hit.object;
        const hitBlock = hitObject.userData && hitObject.userData.isBlock;

        if (hitBlock) {
            // Hit a block - place adjacent to it based on face normal
            const blockPos = hitObject.position;
            gridPos = {
                x: blockPos.x + normal.x * GRID_SIZE,
                y: blockPos.y + normal.y * GRID_SIZE,
                z: blockPos.z + normal.z * GRID_SIZE
            };
        } else {
            // Hit terrain - snap to grid, place on top
            gridPos = snapToGrid(point.x, point.y + GRID_SIZE / 2, point.z);
        }

        buildGhost.position.set(gridPos.x, gridPos.y, gridPos.z);

        // Update grid position display
        const gridPosLabel = document.getElementById('grid-pos');
        if (gridPosLabel) {
            gridPosLabel.textContent = `Grid: ${gridPos.x}, ${gridPos.y}, ${gridPos.z}`;
        }
    }
}

function onBuildMouseDown(event) {
    if (!isBuildMode) return;

    if (event.button === 0) {
        // Left click - place block
        placeBlock();
    } else if (event.button === 2) {
        // Right click - remove block
        removeBlock();
    }
}

function placeBlock(networkData = null) {
    let position, type, colorHex;

    if (networkData) {
        position = new THREE.Vector3(networkData.x, networkData.y, networkData.z);
        type = (typeof networkData.type === 'number') ? networkData.type : 0;
        type = Math.max(0, Math.min(type, BLOCK_TYPES.length - 1)); // Clamp to valid range
        colorHex = networkData.color || BLOCK_TYPES[type].color;
    } else {
        if (!buildGhost || !buildGhost.visible) return;

        position = buildGhost.position.clone();
        type = buildType;
        colorHex = BLOCK_TYPES[type].color;
    }

    // Check if position already occupied
    const key = gridKey(position.x, position.y, position.z);
    if (placedBlocks.has(key)) {
        return; // Already a block here
    }

    const blockDef = BLOCK_TYPES[type];
    if (!blockDef) {
        console.error('Invalid block type:', type);
        return;
    }

    let mesh;

    // Handle torch placement specially - use sprite for performance
    if (blockDef.isTorch) {
        mesh = new THREE.Sprite(torchSpriteMaterial.clone());
        mesh.scale.set(1.5, 3, 1);
        mesh.userData.noCollision = true; // Don't block movement

        // Add PointLight for illumination - use linear decay for wider coverage
        const torchLight = new THREE.PointLight(
            blockDef.lightColor || 0xFFAA44,
            blockDef.lightIntensity || 30,
            blockDef.lightDistance || 60,
            1  // Linear decay (default 2 is quadratic, falls off too fast)
        );
        mesh.userData.torchLight = torchLight;
        // Light is separate from sprite, add to scene at same position
        mesh.userData.lightNeedsAdd = true;
    } else {
        // Create material based on block type
        let material;
        if (blockDef.transparent) {
            material = new THREE.MeshLambertMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.6
            });
        } else if (blockDef.emissive) {
            material = new THREE.MeshLambertMaterial({
                color: colorHex,
                emissive: colorHex,
                emissiveIntensity: 0.3
            });
        } else {
            material = new THREE.MeshLambertMaterial({
                color: colorHex
            });
        }

        mesh = new THREE.Mesh(sharedBlockGeometry, material);
    }

    mesh.position.copy(position);
    mesh.userData.isBlock = true;
    mesh.userData.blockType = type;
    mesh.userData.gridKey = key;

    scene.add(mesh);
    placedBlocks.set(key, mesh);

    // Add torch light to scene at same position
    if (mesh.userData.lightNeedsAdd && mesh.userData.torchLight) {
        mesh.userData.torchLight.position.copy(position);
        mesh.userData.torchLight.position.y += 0.5;
        scene.add(mesh.userData.torchLight);
        delete mesh.userData.lightNeedsAdd;
    }

    // Add to objects array
    if (typeof GAME !== 'undefined' && GAME.world?.objects) {
        GAME.world.objects.push(mesh);
    }

    // Send to server
    if (!networkData && typeof sendBuildToServer === 'function') {
        sendBuildToServer({
            action: 'place',
            type: type,
            x: position.x,
            y: position.y,
            z: position.z,
            color: colorHex
        });
    }
}

function removeBlock() {
    if (!camera) return;

    buildRaycaster.setFromCamera(buildMouse, camera);

    // Collect all blocks (meshes and sprites)
    const blockObjects = Array.from(placedBlocks.values());

    const intersects = buildRaycaster.intersectObjects(blockObjects);

    if (intersects.length > 0) {
        const hit = intersects[0];
        const mesh = hit.object;
        const key = mesh.userData.gridKey;

        if (key && placedBlocks.has(key)) {
            scene.remove(mesh);
            placedBlocks.delete(key);

            // Remove torch light if present
            if (mesh.userData.torchLight) {
                scene.remove(mesh.userData.torchLight);
                mesh.userData.torchLight.dispose && mesh.userData.torchLight.dispose();
            }

            // Remove from objects array
            if (typeof GAME !== 'undefined' && GAME.world?.objects) {
                const idx = GAME.world.objects.indexOf(mesh);
                if (idx > -1) GAME.world.objects.splice(idx, 1);
            }

            // Dispose material
            if (mesh.material) {
                mesh.material.dispose();
            }

            // Send to server
            if (typeof sendBuildToServer === 'function') {
                const pos = mesh.position;
                sendBuildToServer({
                    action: 'remove',
                    x: pos.x,
                    y: pos.y,
                    z: pos.z
                });
            }
        }
    }
}

// Handle network placement (called from client.js)
function placeObject(networkData) {
    // Ensure scene is ready
    if (typeof scene === 'undefined' || !scene) {
        setTimeout(() => placeObject(networkData), 100);
        return;
    }

    // Initialize shared geometry if needed
    if (!sharedBlockGeometry) {
        sharedBlockGeometry = new THREE.BoxGeometry(GRID_SIZE * 0.95, GRID_SIZE * 0.95, GRID_SIZE * 0.95);
    }
    if (!torchSpriteMaterial) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(28, 50, 8, 78);
        const gradient = ctx.createRadialGradient(32, 35, 0, 32, 35, 30);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.9)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 70);
        ctx.fillStyle = '#FFFF88';
        ctx.beginPath();
        ctx.ellipse(32, 40, 8, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        const torchTexture = new THREE.CanvasTexture(canvas);
        torchSpriteMaterial = new THREE.SpriteMaterial({ map: torchTexture, transparent: true, depthWrite: false });
    }

    if (networkData.action === 'remove') {
        // Remove block at position
        const key = gridKey(networkData.x, networkData.y, networkData.z);
        if (placedBlocks.has(key)) {
            const mesh = placedBlocks.get(key);
            scene.remove(mesh);
            placedBlocks.delete(key);

            // Remove torch light if present
            if (mesh.userData.torchLight) {
                scene.remove(mesh.userData.torchLight);
            }

            if (typeof GAME !== 'undefined' && GAME.world?.objects) {
                const idx = GAME.world.objects.indexOf(mesh);
                if (idx > -1) GAME.world.objects.splice(idx, 1);
            }
            if (mesh.material) {
                mesh.material.dispose();
            }
        }
    } else {
        // Place block - snap to grid for compatibility with old data
        const snapped = snapToGrid(networkData.x, networkData.y, networkData.z);
        const blockType = (typeof networkData.type === 'number') ? networkData.type : 0;
        const safeType = Math.max(0, Math.min(blockType, BLOCK_TYPES.length - 1));

        const gridData = {
            x: snapped.x,
            y: snapped.y,
            z: snapped.z,
            type: safeType,
            color: networkData.color || BLOCK_TYPES[safeType].color
        };
        placeBlock(gridData);
    }
}

// Make available globally
window.initBuildSystem = initBuildSystem;
window.placeBlock = placeBlock;
window.placeObject = placeObject;
window.removeBlock = removeBlock;
