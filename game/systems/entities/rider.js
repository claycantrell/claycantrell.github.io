// Native riders - small groups on horseback that roam open country.
// They sometimes stop to watch the player from a distance, but whenever the
// player gets close they gallop away - faster than the player can ride, so
// they can never be caught.
// Horse model comes from createHorseModel (engine/utils/character-types.js)

const RIDER_CONFIG = {
    walkSpeed: 7,           // Ambling across the plains
    canterSpeed: 16,
    fleeSpeed: 64,          // Faster than the player's gallop (54)
    fleeRadius: 120,        // Closer than this: always run
    safeRadius: 420,        // Stop running once this far away
    watchMin: 140,          // Will stop and watch from this far...
    watchMax: 280,          // ...out to this far
    watchChance: 0.35,      // Per check while in watching range
    watchDuration: { min: 5, max: 12 },
    watchCooldown: 15,
    wanderDistance: { min: 40, max: 120 },
    rotationSpeed: 3
};

const SKIN_TONES = [0x8D5A3B, 0x7A4A30, 0x9C6644, 0x6E422A];
const BUCKSKIN = [0xB08A5A, 0xA07848, 0xC09A68];

// Entity list
const riderList = getEntityList('riders') || [];

// System registration
const RiderSystem = createEntitySystem('rider', 'riders', initRiders, updateRiders);

// A rider sitting on a horse with a woven blanket
function createRiderModel() {
    const flat = color => new THREE.MeshLambertMaterial({ color, flatShading: true });
    const pick = list => list[Math.floor(Math.random() * list.length)];
    const horse = createHorseModel(pick(HORSE_COATS));

    // Woven blanket instead of a saddle
    const blanket = new THREE.Group();
    blanket.position.set(0, 4.32, 0.15);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.14, 1.9), flat(pick([0x8A2A1E, 0x2A5A6A, 0x6A4A1E])));
    blanket.add(base);
    for (const [z, c] of [[-0.6, 0xE0C080], [0, 0x1E1A16], [0.6, 0xE0C080]]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.17, 0.15, 0.16), flat(c));
        stripe.position.z = z;
        blanket.add(stripe);
    }
    horse.body.add(blanket);

    // Rider, hips on the blanket
    const rider = new THREE.Group();
    rider.position.set(0, 4.45, 0.1);
    horse.body.add(rider);
    const skin = flat(pick(SKIN_TONES));
    const tunic = flat(pick(BUCKSKIN));
    const leggings = flat(0x5A3E26);
    const hair = flat(0x15110F);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 1.4, 7), tunic);
    torso.position.y = 0.8;
    rider.add(torso);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 7), flat(0x3A2416));
    belt.position.y = 0.2;
    rider.add(belt);

    const head = new THREE.Group();
    head.position.y = 1.85;
    rider.add(head);
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 6), skin));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    cap.position.y = 0.04;
    head.add(cap);
    for (const side of [-1, 1]) {
        const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 1.0, 5), hair);
        braid.position.set(side * 0.3, -0.45, 0.12);
        head.add(braid);
    }

    // Arms forward to the reins
    for (const side of [-1, 1]) {
        const arm = new THREE.Group();
        arm.position.set(side * 0.5, 1.35, 0);
        arm.rotation.x = -0.9;
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.9, 5), tunic);
        sleeve.position.y = -0.45;
        arm.add(sleeve);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), skin);
        hand.position.y = -0.95;
        arm.add(hand);
        rider.add(arm);
    }

    // Legs astride the horse
    for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.3, 0.1, 0);
        leg.rotation.set(-1.0, 0, side * 0.55);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 1.5, 5), leggings);
        thigh.position.y = -0.75;
        leg.add(thigh);
        const moccasin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.4), flat(0x7A5A3A));
        moccasin.position.set(0, -1.55, 0.1);
        leg.add(moccasin);
        rider.add(leg);
    }

    horse.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { horse, riderHead: head };
}

function createRider(id, x, z) {
    const model = createRiderModel();
    const group = model.horse.group;
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    addToScene(group);

    return createEntityObject(id, group, x, y, z, {
        horse: model.horse,
        riderHead: model.riderHead,
        state: 'WANDER',
        speed: 0,
        watchTimer: 0,
        watchCooldown: Math.random() * RIDER_CONFIG.watchCooldown,
        decideTimer: 0
    });
}

function initRiders() {
    // Rider system ready - animal-spawner.js handles spawning
}

function pickRiderWanderTarget(rider) {
    const p = rider.group.position;
    const a = Math.random() * Math.PI * 2;
    const d = RIDER_CONFIG.wanderDistance.min + Math.random() * (RIDER_CONFIG.wanderDistance.max - RIDER_CONFIG.wanderDistance.min);
    const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    rider.targetPos.set(x, getTerrainHeight(x, z), z);
    rider.targetRot = Math.atan2(x - p.x, z - p.z);
    rider.speed = Math.random() < 0.3 ? RIDER_CONFIG.canterSpeed : RIDER_CONFIG.walkSpeed;
}

function updateRiders(delta) {
    const player = typeof character !== 'undefined' && character ? character.position : null;
    if (!player) return;
    const time = getAnimTime(5);

    riderList.forEach(rider => {
        if (!rider.group || !isLocalEntity(rider)) return;
        const pos = rider.group.position;
        const dx = pos.x - player.x, dz = pos.z - player.z;
        const dist = Math.hypot(dx, dz);
        rider.watchCooldown -= delta;
        rider.decideTimer -= delta;

        // Too close: always gallop straight away from the player
        if (dist < RIDER_CONFIG.fleeRadius) rider.state = 'FLEE';

        if (rider.state === 'FLEE') {
            const ax = dx / (dist || 1), az = dz / (dist || 1);
            rider.targetPos.set(pos.x + ax * 80, 0, pos.z + az * 80);
            rider.targetRot = Math.atan2(ax, az);
            rider.speed = RIDER_CONFIG.fleeSpeed;
            if (dist > RIDER_CONFIG.safeRadius) {
                rider.state = 'WANDER';
                rider.watchCooldown = RIDER_CONFIG.watchCooldown;
                pickRiderWanderTarget(rider);
            }
        } else if (rider.state === 'WATCH') {
            // Stand still and watch the player
            rider.speed = 0;
            rider.targetRot = Math.atan2(-dx, -dz);
            rider.watchTimer -= delta;
            if (rider.watchTimer <= 0 || dist > RIDER_CONFIG.watchMax * 1.3) {
                rider.state = 'WANDER';
                rider.watchCooldown = RIDER_CONFIG.watchCooldown;
                pickRiderWanderTarget(rider);
            }
        } else {
            // Wander; sometimes stop to watch a player at a distance
            if (rider.decideTimer <= 0) {
                rider.decideTimer = 2;
                if (rider.watchCooldown <= 0 && dist > RIDER_CONFIG.watchMin && dist < RIDER_CONFIG.watchMax &&
                    Math.random() < RIDER_CONFIG.watchChance) {
                    rider.state = 'WATCH';
                    rider.watchTimer = RIDER_CONFIG.watchDuration.min +
                        Math.random() * (RIDER_CONFIG.watchDuration.max - RIDER_CONFIG.watchDuration.min);
                }
            }
            if (rider.state === 'WANDER' && (rider.speed === 0 || getDistance2D(pos, rider.targetPos) < 3)) {
                pickRiderWanderTarget(rider);
            }
        }

        if (rider.speed > 0) moveEntityTowardTarget(rider, rider.speed, delta, 1.2);
        rotateEntityTowardTarget(rider, delta, rider.state === 'FLEE' ? 8 : RIDER_CONFIG.rotationSpeed);

        // Horse gait follows speed; rider's head turns toward the player while watching
        const horse = rider.horse;
        if (rider.speed > 0) {
            const gallop = rider.speed > 30;
            animateQuadrupedLegs(horse.legs, time, gallop ? 14 : (rider.speed > 10 ? 10 : 6), gallop ? 0.8 : 0.5);
            horse.body.position.y = horse.bodyBaseY + Math.abs(Math.sin(time * (gallop ? 14 : 8))) * (gallop ? 0.22 : 0.08);
            horse.neck.rotation.x = horse.neckBaseRot;
        } else {
            resetLegsToNeutral(horse.legs, delta);
            horse.body.position.y = horse.bodyBaseY;
            horse.neck.rotation.x = horse.neckBaseRot + Math.sin(time * 0.6) * 0.04;
        }
        rider.riderHead.rotation.y = rider.state === 'WATCH' ? Math.sin(time * 0.3) * 0.15 : 0;
    });
}

// Export globals
exportEntityGlobals('Rider', {
    initRiders, updateRiders, RiderSystem, riderList, createRider
});
