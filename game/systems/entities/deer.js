// Deer system for 3D Demo (Client-Side Rendering Only)
// Receives state from server, updates visual models.

let deerList = [];

// Get deer count from map config, fallback to default
function getDeerCount() {
    const config = typeof getEntityConfig === 'function' ? getEntityConfig() : {};
    return config.deer?.count || 18;
}

// Create a single deer visual entity
function createDeer(id, x, z) {
    const group = new THREE.Group();
    
    // Materials
    const coatColor = 0x8B4513; // SaddleBrown
    const bellyColor = 0xD2B48C; // Tan
    
    const deerMaterial = new THREE.MeshBasicMaterial({ color: coatColor });
    const bellyMaterial = new THREE.MeshBasicMaterial({ color: bellyColor });
    const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const antlerMaterial = new THREE.MeshBasicMaterial({ color: 0xEEE8AA }); 

    // --- Body ---
    const bodyGeo = new THREE.CylinderGeometry(0.7, 0.8, 2.5, 7);
    const body = new THREE.Mesh(bodyGeo, deerMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 2.5;
    group.add(body);

    // --- Neck ---
    const neckGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.5, 6);
    const neck = new THREE.Mesh(neckGeo, deerMaterial);
    neck.position.set(0, 3.4, 1.0);
    neck.rotation.x = -Math.PI / 4;
    group.add(neck);

    // --- Head Group ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 4.0, 1.4);
    group.add(headGroup);

    const headGeo = new THREE.ConeGeometry(0.35, 1.2, 6);
    const head = new THREE.Mesh(headGeo, bellyMaterial);
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.3;
    headGroup.add(head);

    const noseGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const nose = new THREE.Mesh(noseGeo, noseMaterial);
    nose.position.set(0, 0, 0.9);
    headGroup.add(nose);

    // Antlers (Visual only, random for now, ideally server sends gender)
    if (Math.random() < 0.5) {
        const antlerGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2);
        const leftAntler = new THREE.Mesh(antlerGeo, antlerMaterial);
        leftAntler.position.set(0.3, 0.6, -0.2);
        leftAntler.rotation.z = -0.5;
        leftAntler.rotation.x = -0.2;
        headGroup.add(leftAntler);
        const rightAntler = new THREE.Mesh(antlerGeo, antlerMaterial);
        rightAntler.position.set(-0.3, 0.6, -0.2);
        rightAntler.rotation.z = 0.5;
        rightAntler.rotation.x = -0.2;
        headGroup.add(rightAntler);
    } else {
        const earGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
        const leftEar = new THREE.Mesh(earGeo, deerMaterial);
        leftEar.position.set(0.3, 0.3, -0.2);
        leftEar.rotation.z = -0.8;
        headGroup.add(leftEar);
        const rightEar = new THREE.Mesh(earGeo, deerMaterial);
        rightEar.position.set(-0.3, 0.3, -0.2);
        rightEar.rotation.z = 0.8;
        headGroup.add(rightEar);
    }

    // --- Legs ---
    const legGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.8, 5);
    const legs = [];
    function createLeg(lx, lz) {
        const legGroup = new THREE.Group();
        legGroup.position.set(lx, 2.5, lz);
        const legMesh = new THREE.Mesh(legGeo, deerMaterial);
        legMesh.position.y = -0.9;
        legGroup.add(legMesh);
        group.add(legGroup);
        return legGroup;
    }
    legs.push(createLeg(0.4, 0.9));
    legs.push(createLeg(-0.4, 0.9));
    legs.push(createLeg(0.4, -0.9));
    legs.push(createLeg(-0.4, -0.9));

    const tailGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const tail = new THREE.Mesh(tailGeo, new THREE.MeshBasicMaterial({color: 0xFFFFFF}));
    tail.position.set(0, 2.8, -1.3);
    tail.rotation.x = 0.8;
    group.add(tail);

    // Initial placement (will be overridden by server)
    const y = typeof getTerrainHeightAt === 'function' ? getTerrainHeightAt(x, z) : 0;
    group.position.set(x, y, z);

    scene.add(group);
    
    return {
        id: id,
        group: group,
        headGroup: headGroup,
        legs: legs,
        targetPos: new THREE.Vector3(x, y, z),
        targetRot: 0
    };
}

// Init called by main game, but we wait for server updates to create entities
function initDeer() {
    // No-op, we create on network update
    console.log("Deer system initialized, waiting for server state...");
}

// Called by animal-sync.js when server sends snapshot
function updateDeerState(serverData) {
    serverData.forEach(data => {
        let deer = deerList.find(d => d.id === data.id);
        
        if (!deer) {
            // New deer, create it
            deer = createDeer(data.id, data.x, data.z);
            deerList.push(deer);
        }
        
        // Update Target for interpolation
        if (typeof getTerrainHeightAt === 'function') {
            const y = getTerrainHeightAt(data.x, data.z);
            deer.targetPos.set(data.x, y, data.z);
        }
        deer.targetRot = data.ry;
        deer.state = data.state; // Store state for animation
    });
}

// Render Loop - Interpolate to target
function updateDeer(delta) {
    const time = Date.now() * 0.005;

    deerList.forEach(deer => {
        // Smooth Move
        deer.group.position.lerp(deer.targetPos, delta * 5);
        
        // Smooth Rotate
        // Simple lerp for rotation (could be improved)
        let rotDiff = deer.targetRot - deer.group.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        deer.group.rotation.y += rotDiff * delta * 5;

        // Animations based on State (Visual only)
        if (deer.state === 'WALK' || deer.state === 'RUN') {
            const legSpeed = deer.state === 'RUN' ? 25 : 10;
            const cycle = time * legSpeed;
            deer.legs[0].rotation.x = Math.sin(cycle) * 0.6;
            deer.legs[3].rotation.x = Math.sin(cycle) * 0.6;
            deer.legs[1].rotation.x = Math.sin(cycle + Math.PI) * 0.6;
            deer.legs[2].rotation.x = Math.sin(cycle + Math.PI) * 0.6;
        } else {
             deer.legs.forEach(leg => leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, delta * 5));
        }
    });
}

