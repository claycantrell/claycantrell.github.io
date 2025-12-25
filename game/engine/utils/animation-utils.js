// Animation Utils - Shared animation patterns for entities
// Consolidates time-based animation logic

/**
 * Get current animation time (seconds)
 * @param {number} scale - Time scale multiplier (default 1)
 * @returns {number} Current time in seconds
 */
function getAnimTime(scale = 1) {
    return Date.now() * 0.001 * scale;
}

/**
 * Animate quadruped legs (4-legged walk/run cycle)
 * @param {Array} legs - Array of 4 leg groups [frontLeft, frontRight, backLeft, backRight]
 * @param {number} time - Animation time
 * @param {number} speed - Leg swing speed
 * @param {number} amplitude - Swing amplitude (radians)
 */
function animateQuadrupedLegs(legs, time, speed, amplitude) {
    if (!legs || legs.length < 4) return;

    const cycle = time * speed;

    // Diagonal pairs move together (trot gait)
    legs[0].rotation.x = Math.sin(cycle) * amplitude;           // Front left
    legs[3].rotation.x = Math.sin(cycle) * amplitude;           // Back right
    legs[1].rotation.x = Math.sin(cycle + Math.PI) * amplitude; // Front right
    legs[2].rotation.x = Math.sin(cycle + Math.PI) * amplitude; // Back left
}

/**
 * Reset legs to neutral position (smoothly)
 * @param {Array} legs - Array of leg groups
 * @param {number} delta - Time delta
 * @param {number} lerpSpeed - Lerp speed (default 3)
 */
function resetLegsToNeutral(legs, delta, lerpSpeed = 3) {
    if (!legs) return;

    legs.forEach(leg => {
        leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, 0, delta * lerpSpeed);
    });
}

/**
 * Animate bird wings
 * @param {THREE.Object3D} leftWing - Left wing mesh
 * @param {THREE.Object3D} rightWing - Right wing mesh
 * @param {number} time - Animation time
 * @param {number} speed - Wing flap speed
 * @param {number} amplitude - Wing amplitude (radians)
 */
function animateWings(leftWing, rightWing, time, speed, amplitude) {
    if (!leftWing || !rightWing) return;

    const flap = Math.sin(time * speed) * amplitude;
    leftWing.rotation.z = flap;
    rightWing.rotation.z = Math.PI - flap;
}

/**
 * Animate tail swish
 * @param {THREE.Object3D} tail - Tail mesh
 * @param {number} time - Animation time
 * @param {number} speed - Swish speed
 * @param {number} amplitude - Swish amplitude (radians)
 */
function animateTailSwish(tail, time, speed, amplitude) {
    if (!tail) return;

    tail.rotation.z = Math.sin(time * speed) * amplitude;
}

/**
 * Animate ear twitch
 * @param {Array} ears - Array of ear meshes [left, right]
 * @param {number} time - Animation time
 * @param {number} speed - Twitch speed
 * @param {number} amplitude - Twitch amplitude
 * @param {number} baseAngle - Base rotation angle
 */
function animateEarTwitch(ears, time, speed, amplitude, baseAngle = 0.2) {
    if (!ears || ears.length < 2) return;

    ears[0].rotation.z = baseAngle + Math.sin(time * speed) * amplitude;
    ears[1].rotation.z = -baseAngle - Math.sin(time * speed + 1) * amplitude;
}

/**
 * Animate hopping motion (bunny-style)
 * @param {Object} entity - Entity with group, hopPhase
 * @param {number} baseHeight - Base Y position
 * @param {number} delta - Time delta
 * @param {number} hopFrequency - Hop frequency
 * @param {number} hopHeight - Maximum hop height
 * @returns {number} Current hop height offset
 */
function animateHop(entity, baseHeight, delta, hopFrequency, hopHeight) {
    if (entity.hopPhase === undefined) entity.hopPhase = 0;

    entity.hopPhase += delta * hopFrequency;

    // Keep phase in reasonable bounds
    if (entity.hopPhase > Math.PI * 10) {
        entity.hopPhase = entity.hopPhase % (Math.PI * 2);
    }

    const normalizedPhase = entity.hopPhase % (Math.PI * 2);
    let hopOffset = 0;

    // Only hop during first half of cycle
    if (normalizedPhase < Math.PI) {
        hopOffset = Math.sin(normalizedPhase) * hopHeight;
    }

    return hopOffset;
}

/**
 * Animate grazing head bob
 * @param {THREE.Object3D} headGroup - Head group
 * @param {number} time - Animation time
 * @param {number} baseAngle - Base head angle (radians)
 * @param {number} bobAmplitude - Bob amplitude
 * @param {number} bobSpeed - Bob speed
 */
function animateGrazing(headGroup, time, baseAngle = 0.4, bobAmplitude = 0.1, bobSpeed = 2) {
    if (!headGroup) return;

    headGroup.rotation.x = baseAngle + Math.sin(time * bobSpeed) * bobAmplitude;
}

/**
 * Reset head to neutral position (smoothly)
 * @param {THREE.Object3D} headGroup - Head group
 * @param {number} delta - Time delta
 * @param {number} lerpSpeed - Lerp speed (default 2)
 */
function resetHeadToNeutral(headGroup, delta, lerpSpeed = 2) {
    if (!headGroup) return;

    headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, 0, delta * lerpSpeed);
}

/**
 * Apply banking to entity (for flying/turning)
 * @param {THREE.Object3D} group - Entity group
 * @param {number} targetAngle - Target Y rotation
 * @param {number} currentAngle - Current Y rotation
 * @param {number} bankMultiplier - How much to bank into turns (default 0.3)
 */
function applyBanking(group, targetAngle, currentAngle, bankMultiplier = 0.3) {
    let rotDiff = targetAngle - currentAngle;

    // Normalize to -PI to PI
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;

    group.rotation.z = -rotDiff * bankMultiplier;
}

// Make available globally
window.getAnimTime = getAnimTime;
window.animateQuadrupedLegs = animateQuadrupedLegs;
window.resetLegsToNeutral = resetLegsToNeutral;
window.animateWings = animateWings;
window.animateTailSwish = animateTailSwish;
window.animateEarTwitch = animateEarTwitch;
window.animateHop = animateHop;
window.animateGrazing = animateGrazing;
window.resetHeadToNeutral = resetHeadToNeutral;
window.applyBanking = applyBanking;
