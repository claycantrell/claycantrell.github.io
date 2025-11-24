// Rendering and managing other players in the scene

window.otherPlayers = new Map(); // id -> {mesh, group}
// Alias for local use if needed, though window.otherPlayers is clearer
const otherPlayers = window.otherPlayers; 

// Shared geometries for other players (reuse to save memory)
let sharedOtherPlayerGeometries = null;
let sharedOtherPlayerMaterials = null;

// Initialize shared geometries and materials
function initOtherPlayerAssets() {
    if (sharedOtherPlayerGeometries) return; // Already initialized
    
    const detail = PERFORMANCE.characterDetail;
    
    // Create shared geometries (reused for all other players)
    sharedOtherPlayerGeometries = {
        body: new THREE.CylinderGeometry(0.5, 0.5, 2, detail.bodySegments),
        head: new THREE.SphereGeometry(0.5, detail.headSegments, detail.headSegments),
        hat: new THREE.ConeGeometry(0.6, 1, detail.hatSegments)
    };
    
    // Create shared materials (reused for all other players)
    sharedOtherPlayerMaterials = {
        body: new THREE.MeshBasicMaterial({
            color: 0x00FF00, // Green for other players
            flatShading: true
        }),
        head: new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            flatShading: true
        }),
        hat: new THREE.MeshBasicMaterial({ 
            color: 0x0000FF, 
            flatShading: true 
        })
    };
}

// Create a visual representation of another player (optimized)
function createOtherPlayerMesh() {
    // Initialize shared assets if needed
    initOtherPlayerAssets();
    
    const group = new THREE.Group();

    // Body - use shared geometry and material
    const body = new THREE.Mesh(
        sharedOtherPlayerGeometries.body,
        sharedOtherPlayerMaterials.body
    );
    group.add(body);

    // Head - use shared geometry and material
    const head = new THREE.Mesh(
        sharedOtherPlayerGeometries.head,
        sharedOtherPlayerMaterials.head
    );
    head.position.y = 1.5;
    group.add(head);

    // Hat - use shared geometry and material
    const hat = new THREE.Mesh(
        sharedOtherPlayerGeometries.hat,
        sharedOtherPlayerMaterials.hat
    );
    hat.position.y = 2.3;
    group.add(hat);

    group.position.y = 1;
    return group;
}

// Add another player to the scene
function addOtherPlayer(id, position, rotation) {
    if (otherPlayers.has(id)) {
        return; // Already exists
    }

    const playerMesh = createOtherPlayerMesh();
    playerMesh.position.set(position.x, position.y, position.z);
    playerMesh.rotation.y = rotation.y;
    
    scene.add(playerMesh);
    otherPlayers.set(id, {
        mesh: playerMesh,
        targetPosition: new THREE.Vector3(position.x, position.y, position.z),
        targetRotation: rotation.y,
        lastUpdate: performance.now()
    });
}

// Update another player's position/rotation (with interpolation)
function updateOtherPlayer(id, position, rotation) {
    if (!otherPlayers.has(id)) {
        // Player doesn't exist yet, add them
        addOtherPlayer(id, position, rotation);
        return;
    }

    const player = otherPlayers.get(id);
    
    // Store target position/rotation for interpolation
    player.targetPosition.set(position.x, position.y, position.z);
    player.targetRotation = rotation.y;
    player.lastUpdate = performance.now();
}

// Remove a player from the scene
function removeOtherPlayer(id) {
    if (otherPlayers.has(id)) {
        const player = otherPlayers.get(id);
        scene.remove(player.mesh);
        // Don't dispose geometries/materials - they're shared!
        // Just remove the mesh
        otherPlayers.delete(id);
    }
}

// Interpolate other players' positions (call from game loop)
// 90s style: Less smooth, more direct movement (snappier)
function interpolateOtherPlayers(delta) {
    const interpolationSpeed = 25.0; // Faster, less smooth (more 90s-like)
    
    otherPlayers.forEach((player, id) => {
        const mesh = player.mesh;
        const target = player.targetPosition;
        
        // More direct movement (less smooth interpolation)
        const distance = mesh.position.distanceTo(target);
        if (distance > 0.1) {
            // Move directly toward target (snappier, less smooth)
            mesh.position.lerp(target, Math.min(1.0, interpolationSpeed * delta));
        } else {
            // Snap to position if very close (90s games did this)
            mesh.position.copy(target);
        }
        
        // Snappier rotation (less smooth)
        const rotationDiff = player.targetRotation - mesh.rotation.y;
        let normalizedDiff = rotationDiff;
        if (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
        if (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
        
        // More direct rotation (snap if close enough)
        if (Math.abs(normalizedDiff) < 0.1) {
            mesh.rotation.y = player.targetRotation;
        } else {
            mesh.rotation.y += normalizedDiff * interpolationSpeed * delta;
        }
        
        // Remove stale players (no updates for 5 seconds)
        const timeSinceUpdate = (performance.now() - player.lastUpdate) / 1000;
        if (timeSinceUpdate > 5) {
            removeOtherPlayer(id);
        }
    });
}

