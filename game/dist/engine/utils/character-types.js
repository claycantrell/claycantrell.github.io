// Character Types - Factory for different character models
// Supports animated knight and simple test character

// Character type registry
const CHARACTER_TYPES = {
    test: createTestCharacter,
    knight: createKnightCharacter
};

// Default character type
const DEFAULT_CHARACTER_TYPE = 'knight';

// ============================================
// TEST CHARACTER (simple cylinder/sphere)
// ============================================

function createTestCharacter() {
    const group = new THREE.Group();
    group.userData.characterType = 'test';
    group.userData.isAnimated = false;

    // Body - Red cylinder
    const bodySegments = typeof PERFORMANCE !== 'undefined' ? PERFORMANCE.characterDetail.bodySegments : 8;
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, bodySegments);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Head - Yellow sphere
    const headSegments = typeof PERFORMANCE !== 'undefined' ? PERFORMANCE.characterDetail.headSegments : 8;
    const headGeometry = new THREE.SphereGeometry(0.5, headSegments, headSegments);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFF00 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.castShadow = true;
    head.receiveShadow = true;
    head.position.y = 1.5;
    group.add(head);

    // Hat - Blue cone
    const hatSegments = typeof PERFORMANCE !== 'undefined' ? PERFORMANCE.characterDetail.hatSegments : 8;
    const hatGeometry = new THREE.ConeGeometry(0.6, 1, hatSegments);
    const hatMaterial = new THREE.MeshLambertMaterial({ color: 0x0000FF });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.castShadow = true;
    hat.receiveShadow = true;
    hat.position.y = 2.3;
    group.add(hat);

    group.position.y = 1;

    // No animated parts for test character
    GAME.characterParts = null;

    return group;
}

// ============================================
// KNIGHT CHARACTER (animated, dark iron armor)
// ============================================

// Knight color palette
const KNIGHT_COLORS = {
    armor: 0x2a2a2a,        // Dark iron
    armorLight: 0x3a3a3a,   // Lighter iron (highlights)
    armorDark: 0x1a1a1a,    // Near black (visor, details)
    swordBlade: 0x888888,   // Steel
    swordHilt: 0x4a3728,    // Dark wood
    shieldFace: 0x2a2a2a,   // Iron
    shieldEmblem: 0x8B0000  // Dark red
};

function createKnightCharacter() {
    const group = new THREE.Group();
    group.userData.characterType = 'knight';
    group.userData.isAnimated = true;

    // PS2-style low poly segments (6-8 sides for that angular look)
    const SEG = 6;

    // Materials with flat shading for PS2 look
    const armorMat = new THREE.MeshLambertMaterial({ color: KNIGHT_COLORS.armor, flatShading: true });
    const armorLightMat = new THREE.MeshLambertMaterial({ color: KNIGHT_COLORS.armorLight, flatShading: true });
    const armorDarkMat = new THREE.MeshLambertMaterial({ color: KNIGHT_COLORS.armorDark, flatShading: true });
    const swordBladeMat = new THREE.MeshLambertMaterial({ color: KNIGHT_COLORS.swordBlade, flatShading: true });
    const swordHiltMat = new THREE.MeshLambertMaterial({ color: KNIGHT_COLORS.swordHilt, flatShading: true });
    const shieldMat = new THREE.MeshLambertMaterial({ color: KNIGHT_COLORS.shieldFace, flatShading: true });
    const emblemMat = new THREE.MeshLambertMaterial({ color: KNIGHT_COLORS.shieldEmblem, flatShading: true });

    // ---- TORSO ---- (tapered cylinder - wider at shoulders)
    const torsoGeo = new THREE.CylinderGeometry(0.5, 0.4, 1.5, SEG);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.position.y = 2.25;
    group.add(torso);

    // Chest plate (angular wedge shape using cone)
    const chestPlateGeo = new THREE.ConeGeometry(0.35, 0.5, 4);
    const chestPlate = new THREE.Mesh(chestPlateGeo, armorLightMat);
    chestPlate.castShadow = true;
    chestPlate.receiveShadow = true;
    chestPlate.rotation.x = Math.PI / 2;
    chestPlate.rotation.z = Math.PI / 4;
    chestPlate.position.set(0, 0.15, 0.35);
    torso.add(chestPlate);

    // Shoulder pauldrons (half spheres)
    const pauldronGeo = new THREE.SphereGeometry(0.25, SEG, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const leftPauldron = new THREE.Mesh(pauldronGeo, armorLightMat);
    leftPauldron.castShadow = true;
    leftPauldron.position.set(0.55, 0.6, 0);
    leftPauldron.rotation.z = -Math.PI / 6;
    torso.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(pauldronGeo, armorLightMat);
    rightPauldron.castShadow = true;
    rightPauldron.position.set(-0.55, 0.6, 0);
    rightPauldron.rotation.z = Math.PI / 6;
    torso.add(rightPauldron);

    // ---- HEAD/HELMET ---- (angular dome + pointed visor)
    const headGroup = new THREE.Group();
    headGroup.position.y = 3.35;
    group.add(headGroup);

    // Helmet base (octagonal cylinder)
    const helmetGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.7, 8);
    const helmet = new THREE.Mesh(helmetGeo, armorMat);
    helmet.castShadow = true;
    helmet.receiveShadow = true;
    headGroup.add(helmet);

    // Helmet top (low-poly dome)
    const helmetTopGeo = new THREE.SphereGeometry(0.35, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmetTop = new THREE.Mesh(helmetTopGeo, armorMat);
    helmetTop.castShadow = true;
    helmetTop.position.y = 0.35;
    headGroup.add(helmetTop);

    // Visor (angular wedge)
    const visorGeo = new THREE.ConeGeometry(0.2, 0.35, 4);
    const visor = new THREE.Mesh(visorGeo, armorDarkMat);
    visor.castShadow = true;
    visor.receiveShadow = true;
    visor.rotation.x = Math.PI / 2;
    visor.rotation.z = Math.PI / 4;
    visor.position.set(0, 0, 0.35);
    headGroup.add(visor);

    // Helmet crest (thin triangular fin)
    const crestGeo = new THREE.ConeGeometry(0.08, 0.5, 4);
    const crest = new THREE.Mesh(crestGeo, armorLightMat);
    crest.castShadow = true;
    crest.receiveShadow = true;
    crest.position.set(0, 0.6, 0);
    headGroup.add(crest);

    // ---- LEFT ARM (with shield) ----
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(0.7, 2.6, 0);
    group.add(leftArmGroup);

    // Upper arm (tapered cylinder)
    const upperArmGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.7, SEG);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, armorMat);
    leftUpperArm.castShadow = true;
    leftUpperArm.receiveShadow = true;
    leftUpperArm.position.y = -0.35;
    leftArmGroup.add(leftUpperArm);

    // Elbow (small sphere joint)
    const elbowGeo = new THREE.SphereGeometry(0.13, SEG, SEG);
    const leftElbow = new THREE.Mesh(elbowGeo, armorDarkMat);
    leftElbow.castShadow = true;
    leftElbow.position.y = -0.7;
    leftArmGroup.add(leftElbow);

    // Lower arm (tapered cylinder)
    const lowerArmGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.6, SEG);
    const leftLowerArm = new THREE.Mesh(lowerArmGeo, armorLightMat);
    leftLowerArm.castShadow = true;
    leftLowerArm.receiveShadow = true;
    leftLowerArm.position.y = -1.05;
    leftArmGroup.add(leftLowerArm);

    // Shield (kite shield shape - cone + cylinder combo)
    const shieldTopGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 6);
    const shieldTop = new THREE.Mesh(shieldTopGeo, shieldMat);
    shieldTop.castShadow = true;
    shieldTop.receiveShadow = true;
    shieldTop.rotation.x = Math.PI / 2;
    shieldTop.position.set(0.2, -0.9, 0.1);
    leftArmGroup.add(shieldTop);

    const shieldBottomGeo = new THREE.ConeGeometry(0.35, 0.5, 6);
    const shieldBottom = new THREE.Mesh(shieldBottomGeo, shieldMat);
    shieldBottom.castShadow = true;
    shieldBottom.receiveShadow = true;
    shieldBottom.rotation.x = Math.PI / 2;
    shieldBottom.position.set(0.2, -1.15, 0.1);
    leftArmGroup.add(shieldBottom);

    // Shield emblem (small cone as boss)
    const emblemGeo = new THREE.ConeGeometry(0.1, 0.15, 6);
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.castShadow = true;
    emblem.rotation.x = -Math.PI / 2;
    emblem.position.set(0.2, -0.95, 0.2);
    leftArmGroup.add(emblem);

    // Store shield reference for animation
    const shield = shieldTop;

    // ---- RIGHT ARM (with sword) ----
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(-0.7, 2.6, 0);
    group.add(rightArmGroup);

    // Upper arm
    const rightUpperArm = new THREE.Mesh(upperArmGeo, armorMat);
    rightUpperArm.castShadow = true;
    rightUpperArm.receiveShadow = true;
    rightUpperArm.position.y = -0.35;
    rightArmGroup.add(rightUpperArm);

    // Elbow
    const rightElbow = new THREE.Mesh(elbowGeo, armorDarkMat);
    rightElbow.castShadow = true;
    rightElbow.position.y = -0.7;
    rightArmGroup.add(rightElbow);

    // Lower arm
    const rightLowerArm = new THREE.Mesh(lowerArmGeo, armorLightMat);
    rightLowerArm.castShadow = true;
    rightLowerArm.receiveShadow = true;
    rightLowerArm.position.y = -1.05;
    rightArmGroup.add(rightLowerArm);

    // Sword group
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -1.35, 0.15);
    swordGroup.rotation.x = -0.3;
    rightArmGroup.add(swordGroup);

    // Sword hilt (small cylinder)
    const hiltGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.3, SEG);
    const hilt = new THREE.Mesh(hiltGeo, swordHiltMat);
    hilt.castShadow = true;
    swordGroup.add(hilt);

    // Sword pommel (sphere)
    const pommelGeo = new THREE.SphereGeometry(0.06, SEG, SEG);
    const pommel = new THREE.Mesh(pommelGeo, swordBladeMat);
    pommel.castShadow = true;
    pommel.position.y = -0.18;
    swordGroup.add(pommel);

    // Sword guard (flattened octahedron look)
    const guardGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4);
    const guard = new THREE.Mesh(guardGeo, swordBladeMat);
    guard.castShadow = true;
    guard.rotation.z = Math.PI / 2;
    guard.position.y = 0.18;
    swordGroup.add(guard);

    // Sword blade (elongated cone for that angular look)
    const bladeGeo = new THREE.ConeGeometry(0.06, 1.1, 4);
    const blade = new THREE.Mesh(bladeGeo, swordBladeMat);
    blade.castShadow = true;
    blade.receiveShadow = true;
    blade.position.y = 0.75;
    swordGroup.add(blade);

    // ---- LEFT LEG ----
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(0.25, 1.45, 0);
    group.add(leftLegGroup);

    // Upper leg (tapered cylinder)
    const upperLegGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.8, SEG);
    const leftUpperLeg = new THREE.Mesh(upperLegGeo, armorMat);
    leftUpperLeg.castShadow = true;
    leftUpperLeg.receiveShadow = true;
    leftUpperLeg.position.y = -0.4;
    leftLegGroup.add(leftUpperLeg);

    // Knee (sphere joint)
    const kneeGeo = new THREE.SphereGeometry(0.14, SEG, SEG);
    const leftKnee = new THREE.Mesh(kneeGeo, armorDarkMat);
    leftKnee.castShadow = true;
    leftKnee.position.y = -0.8;
    leftLegGroup.add(leftKnee);

    // Lower leg (tapered cylinder)
    const lowerLegGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.7, SEG);
    const leftLowerLeg = new THREE.Mesh(lowerLegGeo, armorLightMat);
    leftLowerLeg.castShadow = true;
    leftLowerLeg.receiveShadow = true;
    leftLowerLeg.position.y = -1.2;
    leftLegGroup.add(leftLowerLeg);

    // Foot (angular wedge)
    const footGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
    const leftFoot = new THREE.Mesh(footGeo, armorDarkMat);
    leftFoot.castShadow = true;
    leftFoot.receiveShadow = true;
    leftFoot.rotation.x = Math.PI / 2;
    leftFoot.rotation.z = Math.PI / 4;
    leftFoot.position.set(0, -1.6, 0.1);
    leftLegGroup.add(leftFoot);

    // ---- RIGHT LEG ----
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(-0.25, 1.45, 0);
    group.add(rightLegGroup);

    // Upper leg
    const rightUpperLeg = new THREE.Mesh(upperLegGeo, armorMat);
    rightUpperLeg.castShadow = true;
    rightUpperLeg.receiveShadow = true;
    rightUpperLeg.position.y = -0.4;
    rightLegGroup.add(rightUpperLeg);

    // Knee
    const rightKnee = new THREE.Mesh(kneeGeo, armorDarkMat);
    rightKnee.castShadow = true;
    rightKnee.position.y = -0.8;
    rightLegGroup.add(rightKnee);

    // Lower leg
    const rightLowerLeg = new THREE.Mesh(lowerLegGeo, armorLightMat);
    rightLowerLeg.castShadow = true;
    rightLowerLeg.receiveShadow = true;
    rightLowerLeg.position.y = -1.2;
    rightLegGroup.add(rightLowerLeg);

    // Foot
    const rightFoot = new THREE.Mesh(footGeo, armorDarkMat);
    rightFoot.castShadow = true;
    rightFoot.receiveShadow = true;
    rightFoot.rotation.x = Math.PI / 2;
    rightFoot.rotation.z = Math.PI / 4;
    rightFoot.position.set(0, -1.6, 0.1);
    rightLegGroup.add(rightFoot);

    // Position the whole character
    group.position.y = 1.6;

    // Store references for animation
    GAME.characterParts = {
        torso: torso,
        torsoBaseY: torso.position.y,
        head: headGroup,
        leftArm: leftArmGroup,
        rightArm: rightArmGroup,
        leftLeg: leftLegGroup,
        rightLeg: rightLegGroup,
        sword: swordGroup,
        shield: shield
    };

    return group;
}

// ============================================
// HORSE MODEL (wild horses and the player's mount)
// ============================================

// Coat and mane colors
const HORSE_COATS = [
    { name: 'bay', coat: 0x7A4A2A, mane: 0x1E1612, socks: 0x1E1612 },
    { name: 'chestnut', coat: 0x8E4A22, mane: 0x5A2A12, socks: 0x8E4A22 },
    { name: 'black', coat: 0x2A2624, mane: 0x141210, socks: 0x2A2624 },
    { name: 'grey', coat: 0x8C8A86, mane: 0x4A4846, socks: 0x6A6864 },
    { name: 'white', coat: 0xDAD6CE, mane: 0xBCB6AA, socks: 0xDAD6CE },
    { name: 'palomino', coat: 0xC9A35A, mane: 0xF0E6C8, socks: 0xC9A35A }
];

// A horse at real proportions next to the 4.5-unit (1.8 m) rider: ~4 units at
// the shoulder, ~5 long. Hooves at y = 0, facing +z. Legs are groups pivoting
// at the shoulder/hip, ordered [front left, front right, back left, back right].
function createHorseModel(coatDef, { saddle = false } = {}) {
    const c = coatDef || HORSE_COATS[0];
    const flat = color => new THREE.MeshLambertMaterial({ color, flatShading: true });
    const coatMat = flat(c.coat), maneMat = flat(c.mane), sockMat = flat(c.socks);
    const hoofMat = flat(0x2A2420), muzzleMat = flat(0x3A302A);

    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);

    // Barrel, chest and rump
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 3.6, 8), coatMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 3.3, 0);
    body.add(barrel);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), coatMat);
    chest.position.set(0, 3.35, 1.7);
    body.add(chest);
    const rump = new THREE.Mesh(new THREE.SphereGeometry(1.05, 8, 6), coatMat);
    rump.position.set(0, 3.45, -1.7);
    body.add(rump);

    // Neck (pivots at the withers) and head
    const neck = new THREE.Group();
    neck.position.set(0, 3.9, 1.9);
    neck.rotation.x = -0.75;
    body.add(neck);
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 2.4, 7), coatMat);
    neckMesh.position.y = 1.1;
    neck.add(neckMesh);
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.35), maneMat);
    mane.position.set(0, 1.15, -0.5);
    neck.add(mane);
    const head = new THREE.Group();
    head.position.set(0, 2.3, 0);
    head.rotation.x = 1.6;
    neck.add(head);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.7), coatMat);
    skull.position.set(0, 0, 0.7);
    head.add(skull);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.5), muzzleMat);
    muzzle.position.set(0, -0.05, 1.6);
    head.add(muzzle);
    for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), coatMat);
        ear.position.set(side * 0.2, 0.5, 0.05);
        head.add(ear);
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.12), flat(0x0A0808));
        eye.position.set(side * 0.31, 0.12, 0.55);
        head.add(eye);
    }

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 2.2, 6), maneMat);
    tail.position.set(0, 2.6, -2.75);
    tail.rotation.x = -0.35;
    body.add(tail);

    // Legs: upper, lower, hoof
    const legs = [];
    for (const [lx, lz] of [[0.55, 1.6], [-0.55, 1.6], [0.55, -1.6], [-0.55, -1.6]]) {
        const leg = new THREE.Group();
        leg.position.set(lx, 2.9, lz);
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 1.5, 6), coatMat);
        upper.position.y = -0.75;
        leg.add(upper);
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 1.2, 6), sockMat);
        lower.position.y = -2.05;
        leg.add(lower);
        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.25, 6), hoofMat);
        hoof.position.y = -2.78;
        leg.add(hoof);
        group.add(leg);
        legs.push(leg);
    }

    if (saddle) {
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 1.8), flat(0x6A1E1E));
        blanket.position.set(0, 4.32, 0.2);
        body.add(blanket);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.4), flat(0x4A2E1A));
        seat.position.set(0, 4.5, 0.2);
        body.add(seat);
        const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.25), flat(0x4A2E1A));
        pommel.position.set(0, 4.75, 0.85);
        body.add(pommel);
    }

    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { group, body, bodyBaseY: body.position.y, neck, neckBaseRot: neck.rotation.x, head, tail, legs };
}

// Height of the saddle seat above the hooves
const HORSE_SADDLE_HEIGHT = 4.65;

// Put a rider on a saddled horse. The character group's origin sits 1 unit
// above the ground (the rider's feet), so the horse goes 1 unit down and the
// rider is lifted until the hips sit on the saddle.
function mountCharacter(char) {
    const hipY = 1.45; // Knight hip joint height (leg groups)
    const lift = (HORSE_SADDLE_HEIGHT - 1.0) - hipY;
    char.children.slice().forEach(child => { child.position.y += lift; });

    const horse = createHorseModel(HORSE_COATS[0], { saddle: true });
    horse.group.position.y = -1.0;
    char.add(horse.group);
    char.userData.mount = horse;
    char.userData.riderLift = lift;

    // Animation parts belong to this character: remember the mount there too
    const parts = typeof GAME !== 'undefined' ? GAME.characterParts : null;
    if (parts && parts.torso && parts.torso.parent === char) {
        parts.mount = horse;
        parts.torsoBaseY += lift;
    }
    return char;
}

// ============================================
// CHARACTER FACTORY & SWITCHING
// ============================================

/**
 * Create a character of the specified type
 * @param {string} type - Character type ('knight', 'test')
 * @returns {THREE.Group} Character group
 */
function createCharacterOfType(type) {
    const createFn = CHARACTER_TYPES[type] || CHARACTER_TYPES[DEFAULT_CHARACTER_TYPE];
    const char = createFn();

    // For now every character rides a horse
    if (char.userData.characterType === 'knight') {
        mountCharacter(char);
    }

    // Add to objects for collision detection
    if (typeof GAME !== 'undefined' && GAME.world) {
        GAME.world.objects.push(char);
    }

    return char;
}

/**
 * Dispose of a character (cleanup geometry/materials)
 * @param {THREE.Group} char - Character to dispose
 */
function disposeCharacter(char) {
    if (!char) return;

    // Remove from objects array
    if (typeof GAME !== 'undefined' && GAME.world && GAME.world.objects) {
        const idx = GAME.world.objects.indexOf(char);
        if (idx !== -1) {
            GAME.world.objects.splice(idx, 1);
        }
    }

    // Dispose all geometry and materials
    char.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

/**
 * Switch to a different character type
 * @param {string} type - Character type ('knight', 'test')
 */
function switchCharacterType(type) {
    if (!CHARACTER_TYPES[type]) {
        console.warn(`Unknown character type: ${type}`);
        return;
    }

    if (!GAME.character || !GAME.scene) {
        console.warn('Cannot switch character: game not initialized');
        return;
    }

    // Store current position and rotation
    const pos = GAME.character.position.clone();
    const rotY = GAME.character.rotation.y;

    // Remove old character
    GAME.scene.remove(GAME.character);
    disposeCharacter(GAME.character);

    // Create new character
    GAME.character = createCharacterOfType(type);
    GAME.character.position.copy(pos);
    GAME.character.rotation.y = rotY;
    GAME.scene.add(GAME.character);

    // Update character type in GAME
    GAME.characterType = type;

    // Update global reference
    window.character = GAME.character;

    if (typeof gameLog === 'function') {
        gameLog(`Switched to ${type} character`);
    }
}

/**
 * Get list of available character types
 * @returns {string[]} Array of type names
 */
function getCharacterTypes() {
    return Object.keys(CHARACTER_TYPES);
}

// Make available globally
window.createTestCharacter = createTestCharacter;
window.createKnightCharacter = createKnightCharacter;
window.createCharacterOfType = createCharacterOfType;
window.disposeCharacter = disposeCharacter;
window.switchCharacterType = switchCharacterType;
window.getCharacterTypes = getCharacterTypes;
window.createHorseModel = createHorseModel;
window.mountCharacter = mountCharacter;
window.HORSE_COATS = HORSE_COATS;
window.CHARACTER_TYPES = CHARACTER_TYPES;
window.DEFAULT_CHARACTER_TYPE = DEFAULT_CHARACTER_TYPE;
