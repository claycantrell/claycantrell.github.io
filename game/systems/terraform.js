// Terraforming System - Modify terrain height
// T to toggle, Left click raise, Right click lower, Scroll for brush size

let isTerraformMode = false;

const TerraformSystem = {
    init() {
        initTerraformSystem();
    },
    update(delta) {
        if (isTerraformMode) {
            updateTerraformPreview();
            // Continuous terraforming while mouse held
            if (terraformMouseHeld !== 0) {
                const hitPoint = getTerraformHitPoint();
                if (hitPoint) {
                    if (terraformMode === 'raise') {
                        const strength = terraformMouseHeld === 1 ? terraformStrength : -terraformStrength;
                        modifyTerrain(hitPoint.x, hitPoint.z, strength);
                    } else if (terraformMode === 'flatten') {
                        flattenTerrain(hitPoint.x, hitPoint.y, hitPoint.z);
                    } else if (terraformMode === 'smooth') {
                        smoothTerrain(hitPoint.x, hitPoint.z);
                    }
                }
            }
        }
    }
};

if (typeof Systems !== 'undefined') {
    Systems.register('terraform', TerraformSystem);
}
let terraformBrushSize = 3;
let terraformStrength = 0.5; // Reduced for continuous application
let terraformPreview = null;
let terraformRaycaster = new THREE.Raycaster();
let terraformMouseHeld = 0; // 0 = none, 1 = primary action, 2 = secondary (lower)
let terraformShiftHeld = false;
let terraformMode = 'raise'; // 'raise', 'flatten', 'smooth'
const terraformModes = ['raise', 'flatten', 'smooth'];

// Store terrain modifications: "chunkX,chunkZ" -> Map of "localX,localZ" -> heightDelta
const terrainMods = new Map();

function initTerraformSystem() {
    console.log('Terraform system initializing...');

    // Create UI
    const terraformUI = document.createElement('div');
    terraformUI.id = 'terraform-ui';
    terraformUI.style.cssText = `
        position: absolute;
        bottom: 80px;
        left: 20px;
        color: #fff;
        font-family: "Courier New", monospace;
        font-size: 14px;
        background: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border: 2px solid #8B4513;
        display: none;
        pointer-events: none;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'font-weight:bold; margin-bottom:5px; color:#8B4513';
    header.textContent = 'TERRAFORM MODE [T]';
    terraformUI.appendChild(header);

    const modeInfo = document.createElement('div');
    modeInfo.id = 'terraform-mode-info';
    modeInfo.style.cssText = 'margin-bottom:5px; color:#FFD700';
    modeInfo.textContent = `Mode: RAISE [F to cycle]`;
    terraformUI.appendChild(modeInfo);

    const instructions = [
        'Click/Hold: Apply brush',
        'Shift+Click: Lower (raise mode)',
        'Scroll: Brush size'
    ];
    instructions.forEach(text => {
        const div = document.createElement('div');
        div.textContent = text;
        terraformUI.appendChild(div);
    });

    const brushInfo = document.createElement('div');
    brushInfo.id = 'terraform-brush-info';
    brushInfo.style.cssText = 'margin-top:5px; color:#8B4513';
    brushInfo.textContent = `Brush: ${terraformBrushSize}`;
    terraformUI.appendChild(brushInfo);

    document.body.appendChild(terraformUI);

    // Create preview circle (delay until scene is ready)
    function createPreview() {
        if (typeof scene === 'undefined' || !scene) {
            setTimeout(createPreview, 100);
            return;
        }
        const previewGeom = new THREE.RingGeometry(2, 3, 32);
        const previewMat = new THREE.MeshBasicMaterial({
            color: 0x8B4513,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        terraformPreview = new THREE.Mesh(previewGeom, previewMat);
        terraformPreview.rotation.x = -Math.PI / 2;
        terraformPreview.visible = false;
        scene.add(terraformPreview);
    }
    createPreview();

    // Event listeners
    document.addEventListener('keydown', onTerraformKeyDown);
    document.addEventListener('keyup', onTerraformKeyUp);
    document.addEventListener('mousedown', onTerraformMouseDown);
    document.addEventListener('mouseup', onTerraformMouseUp);
    document.addEventListener('wheel', onTerraformScroll);
    document.addEventListener('contextmenu', (e) => {
        if (isTerraformMode) e.preventDefault();
    });
}

function toggleTerraformMode() {
    isTerraformMode = !isTerraformMode;
    const ui = document.getElementById('terraform-ui');

    if (isTerraformMode) {
        // Turn off build mode if on
        if (typeof isBuildMode !== 'undefined' && isBuildMode) {
            toggleBuildMode();
        }
        ui.style.display = 'block';
        if (terraformPreview) terraformPreview.visible = true;
        showNotification("Terraform Mode ON - Click to raise, Shift+Click to lower");
    } else {
        ui.style.display = 'none';
        if (terraformPreview) terraformPreview.visible = false;
        terraformMouseHeld = 0; // Reset mouse state
        showNotification("Terraform Mode OFF");
    }
}

function onTerraformKeyDown(event) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput && document.activeElement === chatInput) return;

    if (event.code === 'KeyT') {
        toggleTerraformMode();
    }
    if (event.code === 'KeyF' && isTerraformMode) {
        cycleTerraformBrushMode();
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        terraformShiftHeld = true;
    }
}

function cycleTerraformBrushMode() {
    const currentIndex = terraformModes.indexOf(terraformMode);
    const nextIndex = (currentIndex + 1) % terraformModes.length;
    terraformMode = terraformModes[nextIndex];

    const modeInfo = document.getElementById('terraform-mode-info');
    if (modeInfo) {
        modeInfo.textContent = `Mode: ${terraformMode.toUpperCase()} [F to cycle]`;
    }
    showNotification(`Terraform: ${terraformMode.toUpperCase()} mode`);
}

function onTerraformKeyUp(event) {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        terraformShiftHeld = false;
    }
}

function onTerraformScroll(event) {
    if (!isTerraformMode) return;

    if (event.deltaY > 0) {
        terraformBrushSize = Math.max(1, terraformBrushSize - 1);
    } else {
        terraformBrushSize = Math.min(10, terraformBrushSize + 1);
    }

    updateBrushPreview();

    const info = document.getElementById('terraform-brush-info');
    if (info) info.textContent = `Brush: ${terraformBrushSize}`;
}

function updateBrushPreview() {
    if (!terraformPreview) return;

    // Update preview ring size
    terraformPreview.geometry.dispose();
    const radius = terraformBrushSize * 2; // Match brush radius in world units
    const inner = radius * 0.8;
    const outer = radius;
    terraformPreview.geometry = new THREE.RingGeometry(inner, outer, 32);
}

function updateTerraformPreview() {
    if (!terraformPreview || !camera) return;

    const hitPoint = getTerraformHitPoint();
    if (hitPoint) {
        terraformPreview.position.set(hitPoint.x, hitPoint.y + 0.1, hitPoint.z);
        terraformPreview.visible = true;
    } else {
        terraformPreview.visible = false;
    }
}

function getTerraformHitPoint() {
    // Cast ray from camera or character depending on view mode
    if (!isFirstPerson && typeof character !== 'undefined' && character) {
        const cameraYaw = typeof getCameraYaw === 'function' ? getCameraYaw() : 0;
        const cameraPitch = typeof getCameraPitch === 'function' ? getCameraPitch() : 0;

        const rayStart = new THREE.Vector3(
            character.position.x,
            character.position.y + 4,
            character.position.z
        );

        const rayDir = new THREE.Vector3(
            Math.sin(cameraYaw) * Math.cos(cameraPitch),
            Math.sin(cameraPitch),
            Math.cos(cameraYaw) * Math.cos(cameraPitch)
        ).normalize();

        terraformRaycaster.set(rayStart, rayDir);
    } else {
        terraformRaycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    }

    // Collect terrain meshes
    const terrainMeshes = [];
    if (typeof loadedChunks !== 'undefined') {
        for (const chunk of loadedChunks.values()) {
            if (chunk.mesh) terrainMeshes.push(chunk.mesh);
        }
    }

    if (terrainMeshes.length === 0) return null;

    const intersects = terraformRaycaster.intersectObjects(terrainMeshes);
    if (intersects.length > 0) {
        return intersects[0].point;
    }
    return null;
}

function onTerraformMouseDown(event) {
    if (!isTerraformMode) return;

    if (event.button === 0) {
        // Left click - check shift for raise/lower
        if (event.shiftKey || terraformShiftHeld) {
            terraformMouseHeld = 2; // Lower
        } else {
            terraformMouseHeld = 1; // Raise
        }
    } else if (event.button === 2) {
        // Right click - lower
        terraformMouseHeld = 2;
    }
}

function onTerraformMouseUp(event) {
    if (event.button === 0 || event.button === 2) {
        terraformMouseHeld = 0;
    }
}

function modifyTerrain(worldX, worldZ, heightDelta) {
    if (typeof loadedChunks === 'undefined') return;

    // Find affected chunks and modify their geometry
    const chunkSize = typeof CHUNK_CONFIG !== 'undefined' ? CHUNK_CONFIG.size : 512;
    const brushRadius = terraformBrushSize * 2; // Simple radius in world units

    for (const [key, chunk] of loadedChunks) {
        const bounds = chunk.data.bounds;

        // Check if brush overlaps this chunk
        if (worldX + brushRadius < bounds.minX || worldX - brushRadius > bounds.maxX ||
            worldZ + brushRadius < bounds.minZ || worldZ - brushRadius > bounds.maxZ) {
            continue;
        }

        modifyChunkTerrain(chunk, worldX, worldZ, brushRadius, heightDelta);
    }
}

function modifyChunkTerrain(chunk, worldX, worldZ, brushRadius, heightDelta) {
    const mesh = chunk.mesh;
    if (!mesh) return;

    const geometry = mesh.geometry;
    const positions = geometry.attributes.position.array;
    const segments = typeof CHUNK_CONFIG !== 'undefined' ? CHUNK_CONFIG.segments : 48;
    const bounds = chunk.data.bounds;
    const size = typeof CHUNK_CONFIG !== 'undefined' ? CHUNK_CONFIG.size : 512;

    let modified = false;

    for (let i = 0; i < positions.length; i += 3) {
        const vertexIndex = i / 3;
        const localX = vertexIndex % (segments + 1);
        const localZ = Math.floor(vertexIndex / (segments + 1));

        // Convert to world coordinates
        const vWorldX = bounds.minX + (localX / segments) * size;
        const vWorldZ = bounds.minZ + (localZ / segments) * size;

        // Check distance from brush center
        const dx = vWorldX - worldX;
        const dz = vWorldZ - worldZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < brushRadius) {
            // Smooth falloff
            const falloff = 1 - (dist / brushRadius);
            const smoothFalloff = falloff * falloff * (3 - 2 * falloff); // Smoothstep

            // Modify height (Z in plane geometry before rotation)
            positions[i + 2] += heightDelta * smoothFalloff;

            // Also update heightmap data
            if (chunk.data.heightmap[localZ]) {
                chunk.data.heightmap[localZ][localX] += heightDelta * smoothFalloff;
            }

            modified = true;
        }
    }

    if (modified) {
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        // Recalculate slope attribute
        const normals = geometry.attributes.normal.array;
        const slopes = geometry.attributes.slope.array;
        for (let i = 0; i < slopes.length; i++) {
            const ny = Math.abs(normals[i * 3 + 2]);
            slopes[i] = 1.0 - ny;
        }
        geometry.attributes.slope.needsUpdate = true;
    }
}

// Flatten terrain to target height
function flattenTerrain(worldX, targetY, worldZ) {
    if (typeof loadedChunks === 'undefined') return;

    const brushRadius = terraformBrushSize * 2;

    for (const [key, chunk] of loadedChunks) {
        const bounds = chunk.data.bounds;

        if (worldX + brushRadius < bounds.minX || worldX - brushRadius > bounds.maxX ||
            worldZ + brushRadius < bounds.minZ || worldZ - brushRadius > bounds.maxZ) {
            continue;
        }

        flattenChunkTerrain(chunk, worldX, worldZ, brushRadius, targetY);
    }
}

function flattenChunkTerrain(chunk, worldX, worldZ, brushRadius, targetY) {
    const mesh = chunk.mesh;
    if (!mesh) return;

    const geometry = mesh.geometry;
    const positions = geometry.attributes.position.array;
    const segments = typeof CHUNK_CONFIG !== 'undefined' ? CHUNK_CONFIG.segments : 48;
    const bounds = chunk.data.bounds;
    const size = typeof CHUNK_CONFIG !== 'undefined' ? CHUNK_CONFIG.size : 512;

    let modified = false;

    for (let i = 0; i < positions.length; i += 3) {
        const vertexIndex = i / 3;
        const localX = vertexIndex % (segments + 1);
        const localZ = Math.floor(vertexIndex / (segments + 1));

        const vWorldX = bounds.minX + (localX / segments) * size;
        const vWorldZ = bounds.minZ + (localZ / segments) * size;

        const dx = vWorldX - worldX;
        const dz = vWorldZ - worldZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < brushRadius) {
            const falloff = 1 - (dist / brushRadius);
            const smoothFalloff = falloff * falloff * (3 - 2 * falloff);

            // Move toward target height
            const currentHeight = positions[i + 2];
            const diff = targetY - currentHeight;
            positions[i + 2] += diff * smoothFalloff * 0.1; // Gradual flatten

            if (chunk.data.heightmap[localZ]) {
                chunk.data.heightmap[localZ][localX] = positions[i + 2];
            }

            modified = true;
        }
    }

    if (modified) {
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const normals = geometry.attributes.normal.array;
        const slopes = geometry.attributes.slope.array;
        for (let i = 0; i < slopes.length; i++) {
            const ny = Math.abs(normals[i * 3 + 2]);
            slopes[i] = 1.0 - ny;
        }
        geometry.attributes.slope.needsUpdate = true;
    }
}

// Smooth terrain by averaging nearby heights
function smoothTerrain(worldX, worldZ) {
    if (typeof loadedChunks === 'undefined') return;

    const brushRadius = terraformBrushSize * 2;

    for (const [key, chunk] of loadedChunks) {
        const bounds = chunk.data.bounds;

        if (worldX + brushRadius < bounds.minX || worldX - brushRadius > bounds.maxX ||
            worldZ + brushRadius < bounds.minZ || worldZ - brushRadius > bounds.maxZ) {
            continue;
        }

        smoothChunkTerrain(chunk, worldX, worldZ, brushRadius);
    }
}

function smoothChunkTerrain(chunk, worldX, worldZ, brushRadius) {
    const mesh = chunk.mesh;
    if (!mesh) return;

    const geometry = mesh.geometry;
    const positions = geometry.attributes.position.array;
    const segments = typeof CHUNK_CONFIG !== 'undefined' ? CHUNK_CONFIG.segments : 48;
    const bounds = chunk.data.bounds;
    const size = typeof CHUNK_CONFIG !== 'undefined' ? CHUNK_CONFIG.size : 512;

    // First pass: calculate average heights for each vertex
    const newHeights = new Float32Array(positions.length / 3);
    let modified = false;

    for (let i = 0; i < positions.length; i += 3) {
        const vertexIndex = i / 3;
        const localX = vertexIndex % (segments + 1);
        const localZ = Math.floor(vertexIndex / (segments + 1));

        const vWorldX = bounds.minX + (localX / segments) * size;
        const vWorldZ = bounds.minZ + (localZ / segments) * size;

        const dx = vWorldX - worldX;
        const dz = vWorldZ - worldZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < brushRadius) {
            // Average with neighbors
            let sum = positions[i + 2];
            let count = 1;

            // Check 4 neighbors
            const neighbors = [
                [localX - 1, localZ],
                [localX + 1, localZ],
                [localX, localZ - 1],
                [localX, localZ + 1]
            ];

            for (const [nx, nz] of neighbors) {
                if (nx >= 0 && nx <= segments && nz >= 0 && nz <= segments) {
                    const neighborIndex = (nz * (segments + 1) + nx) * 3;
                    if (neighborIndex >= 0 && neighborIndex < positions.length) {
                        sum += positions[neighborIndex + 2];
                        count++;
                    }
                }
            }

            const avgHeight = sum / count;
            const falloff = 1 - (dist / brushRadius);
            const smoothFalloff = falloff * falloff * (3 - 2 * falloff);

            newHeights[vertexIndex] = positions[i + 2] + (avgHeight - positions[i + 2]) * smoothFalloff * 0.3;
            modified = true;
        } else {
            newHeights[vertexIndex] = positions[i + 2];
        }
    }

    // Second pass: apply new heights
    if (modified) {
        for (let i = 0; i < positions.length; i += 3) {
            const vertexIndex = i / 3;
            const localX = vertexIndex % (segments + 1);
            const localZ = Math.floor(vertexIndex / (segments + 1));

            positions[i + 2] = newHeights[vertexIndex];

            if (chunk.data.heightmap[localZ]) {
                chunk.data.heightmap[localZ][localX] = newHeights[vertexIndex];
            }
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const normals = geometry.attributes.normal.array;
        const slopes = geometry.attributes.slope.array;
        for (let i = 0; i < slopes.length; i++) {
            const ny = Math.abs(normals[i * 3 + 2]);
            slopes[i] = 1.0 - ny;
        }
        geometry.attributes.slope.needsUpdate = true;
    }
}

// Make available globally
Object.defineProperty(window, 'isTerraformMode', {
    get: () => isTerraformMode,
    set: (v) => { isTerraformMode = v; }
});
window.toggleTerraformMode = toggleTerraformMode;
window.initTerraformSystem = initTerraformSystem;
