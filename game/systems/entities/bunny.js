// Bunny system for 3D Demo (Client-Side Rendering Only)
// Receives state from server, updates visual models.

let bunnyList = [];

// Get bunny count from map config, fallback to default
function getBunnyCount() {
    const config = typeof getEntityConfig === 'function' ? getEntityConfig() : {};
    return config.bunnies?.count || 20;
}

// Create a single bunny visual entity
function createBunny(id, x, z) {
    const group = new THREE.Group();
    
    // Materials
    const colors = [0xFFFFFF, 0xDCDCDC, 0xD2B48C, 0xA9A9A9]; 
    const color = colors[Math.floor(Math.random() * colors.length)];
    const bunnyMaterial = new THREE.MeshBasicMaterial({ color: color });
    const earInnerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFC0CB }); 
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    // --- Body ---
    const bodyGeo = new THREE.SphereGeometry(0.4, 6, 6);
    const body = new THREE.Mesh(bodyGeo, bunnyMaterial);
    body.scale.set(1, 0.8, 1.2); 
    body.position.y = 0.4;
    group.add(body);

    // --- Head ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.7, 0.5);
    group.add(headGroup);

    const headGeo = new THREE.SphereGeometry(0.25, 6, 6);
    const head = new THREE.Mesh(headGeo, bunnyMaterial);
    headGroup.add(head);

    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(0.15, 0.05, 0.2);
    headGroup.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-0.15, 0.05, 0.2);
    headGroup.add(rightEye);

    // Ears
    const earGeo = new THREE.BoxGeometry(0.1, 0.6, 0.05);
    const leftEar = new THREE.Mesh(earGeo, bunnyMaterial);
    leftEar.position.set(0.1, 0.4, 0);
    leftEar.rotation.x = -0.2;
    leftEar.rotation.z = 0.2;
    headGroup.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, bunnyMaterial);
    rightEar.position.set(-0.1, 0.4, 0);
    rightEar.rotation.x = -0.2;
    rightEar.rotation.z = -0.2;
    headGroup.add(rightEar);

    // --- Tail ---
    const tailGeo = new THREE.SphereGeometry(0.15, 4, 4);
    const tail = new THREE.Mesh(tailGeo, bunnyMaterial);
    tail.position.set(0, 0.3, -0.6);
    group.add(tail);

    // Initial placement (server will update)
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y, z);
    const scale = 0.8 + Math.random() * 0.4;
    group.scale.set(scale, scale, scale);

    scene.add(group);
    
    return {
        id: id,
        group: group,
        ears: [leftEar, rightEar],
        targetPos: new THREE.Vector3(x, y, z),
        state: 'IDLE'
    };
}

// Init called by main game, waiting for server
function initBunnies() {
    console.log("Bunny system initialized, waiting for server state...");
}

// Called by animal-sync.js
function updateBunnyState(serverData) {
    serverData.forEach(data => {
        let bunny = bunnyList.find(b => b.id === data.id);
        if (!bunny) {
            bunny = createBunny(data.id, data.x, data.z);
            bunnyList.push(bunny);
        }
        
        if (typeof getTerrainHeightAt === 'function') {
            const y = getTerrainHeightAt(data.x, data.z);
            bunny.targetPos.set(data.x, y, data.z);
        }
        bunny.state = data.state;
    });
}

// Render Loop
function updateBunnies(delta) {
    const time = Date.now() * 0.001;
    
    bunnyList.forEach(bunny => {
        // Interpolate Position
        bunny.group.position.lerp(bunny.targetPos, delta * 10);
        
        // Simple Look Rotation (face movement direction)
        const moveDir = new THREE.Vector3().subVectors(bunny.targetPos, bunny.group.position);
        if (moveDir.lengthSq() > 0.001) {
            const angle = Math.atan2(moveDir.x, moveDir.z);
            let rotDiff = angle - bunny.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            bunny.group.rotation.y += rotDiff * delta * 10;
        }

        // Animations
        if (bunny.state === 'HOP') {
             // Squash/Stretch or Hop arc visual (simplified)
             bunny.group.position.y += Math.sin(time * 20) * 0.2; // Visual hop
        } else {
            // Idle ear twitch
            bunny.ears[0].rotation.z = 0.2 + Math.sin(time * 20) * 0.05;
            bunny.ears[1].rotation.z = -0.2 - Math.sin(time * 20 + 1) * 0.05;
        }
    });
}

