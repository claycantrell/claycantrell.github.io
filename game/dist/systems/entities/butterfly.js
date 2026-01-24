// Butterfly system for 3D Demo - Cherry Grove biome animal

const butterflyList = getEntityList('butterflies') || [];
const ButterflySystem = createEntitySystem('butterfly', 'butterflies', initButterflies, updateButterflies);

function createButterfly(id, x, z) {
    const group = new THREE.Group();

    // Random colorful wings
    const colors = [0xFFB7C5, 0xFF69B4, 0xFFA500, 0xFFFF00, 0x00CED1];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const wingMaterial = new THREE.MeshLambertMaterial({ color: color });
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    // Body (thin cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6);
    const body = new THREE.Mesh(bodyGeo, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Wings
    const wingGeo = new THREE.CircleGeometry(0.15, 6);
    const leftWing = new THREE.Mesh(wingGeo, wingMaterial);
    leftWing.position.set(0.12, 0.05, 0);
    leftWing.rotation.y = Math.PI / 4;
    group.add(leftWing);
    const rightWing = new THREE.Mesh(wingGeo, wingMaterial);
    rightWing.position.set(-0.12, 0.05, 0);
    rightWing.rotation.y = -Math.PI / 4;
    group.add(rightWing);

    const y = getTerrainHeight(x, z);
    group.position.set(x, y + 5, z);  // Flies in the air

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y + 5, z, {
        leftWing: leftWing,
        rightWing: rightWing,
        flyHeight: 3 + Math.random() * 4,
        flyPhase: Math.random() * Math.PI * 2
    });
}

function initButterflies() {}

function updateButterflyState(serverData) {
    handleServerStateUpdate(serverData, butterflyList, createButterfly, (butterfly, data) => {
        butterfly.targetPos.set(data.x, data.y, data.z);
        butterfly.state = data.state;
    });
}

function updateButterflies(delta) {
    const config = getConfigSafe('butterfly');
    if (!config) return;

    const time = getAnimTime();

    butterflyList.forEach(butterfly => {
        if (isLocalEntity(butterfly)) {
            butterfly.flyPhase += delta * 2;

            // Gentle floating movement
            const groundY = getTerrainHeight(butterfly.group.position.x, butterfly.group.position.z);
            const targetY = groundY + butterfly.flyHeight + Math.sin(butterfly.flyPhase * 2) * 2;

            // Drift slowly
            if (Math.random() < 0.01) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 5 + Math.random() * 10;
                butterfly.targetPos.x += Math.cos(angle) * dist;
                butterfly.targetPos.z += Math.sin(angle) * dist;
            }

            butterfly.targetPos.y = targetY;
        }

        // Smooth movement
        butterfly.group.position.lerp(butterfly.targetPos, delta * 1.5);

        // Wing flapping
        if (butterfly.leftWing && butterfly.rightWing) {
            animateWings(butterfly.leftWing, butterfly.rightWing, time,
                config.animation.wingSpeed, config.animation.wingAmplitude);
        }
    });
}

exportEntityGlobals('Butterfly', {
    initButterflies, updateButterflies, updateButterflyState,
    ButterflySystem, butterflyList, createButterfly
});
