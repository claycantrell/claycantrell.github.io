// Wild horse system - herds that graze, amble and gallop off when startled
// Model comes from createHorseModel (engine/utils/character-types.js), shared
// with the player's mount

// Entity list
const horseList = getEntityList('horses') || [];

// System registration
const HorseSystem = createEntitySystem('horse', 'horses', initHorses, updateHorses);

// Create a single wild horse with a random coat
function createHorse(id, x, z) {
    const coat = HORSE_COATS[Math.floor(Math.random() * HORSE_COATS.length)];
    const model = createHorseModel(coat);
    const group = model.group;

    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);
    group.rotation.y = Math.random() * Math.PI * 2;

    enableShadows(group);
    addToScene(group);

    return createEntityObject(id, group, x, y, z, {
        legs: model.legs,
        neck: model.neck,
        neckBaseRot: model.neckBaseRot
    });
}

function initHorses() {
    // Horse system ready - animal-spawner.js handles spawning
}

function updateHorseState(serverData) {
    handleServerStateUpdate(serverData, horseList, createHorse, (horse, data) => {
        const y = getTerrainHeight(data.x, data.z);
        horse.targetPos.set(data.x, y, data.z);
        horse.targetRot = data.ry;
        horse.state = data.state;
    });
}

function updateHorses(delta) {
    const config = getConfigSafe('horse');
    if (!config) return;

    const time = getAnimTime(5);

    horseList.forEach(horse => {
        if (isLocalEntity(horse)) {
            updateEntityTimers(horse, delta);

            if (handleFleeBehavior(horse, config.flee, 0, 'RUN')) {
                // Galloping away
            } else if (horse.fleeTimer <= 0) {
                const distToTarget = getDistance2D(horse.group.position, horse.targetPos);
                if (horse.wanderTimer <= 0 || distToTarget < 2) {
                    const wanderTarget = calculateWanderTarget(
                        horse.group.position,
                        horse.group.rotation.y,
                        config.wander.minDistance,
                        config.wander.maxDistance
                    );
                    const newY = getTerrainHeight(wanderTarget.x, wanderTarget.z);
                    horse.targetPos.set(wanderTarget.x, newY, wanderTarget.z);
                    horse.targetRot = wanderTarget.angle;

                    // Mostly grazing and ambling, sometimes a short canter
                    const rand = Math.random();
                    if (rand < 0.1) horse.state = 'RUN';
                    else if (rand < 0.55) horse.state = 'WALK';
                    else horse.state = 'IDLE';

                    horse.wanderTimer = horse.state === 'IDLE'
                        ? config.wander.idleDuration.min + Math.random() * (config.wander.idleDuration.max - config.wander.idleDuration.min)
                        : config.wander.moveDuration.min + Math.random() * (config.wander.moveDuration.max - config.wander.moveDuration.min);
                }
            }
        }

        const fleeing = horse.fleeTimer > 0;
        const moveSpeed = getMovementSpeed('horse', horse.state, fleeing);
        if (moveSpeed > 0) {
            moveEntityTowardTarget(horse, moveSpeed, delta, config.collisionRadius);
        }

        if (horse.state === 'WALK' || horse.state === 'RUN') {
            rotateEntityTowardTarget(horse, delta, config.animation.rotationSpeed);
            // Walk, canter or gallop: cycle rate follows movement speed so hooves don't skate
            const anim = config.animation;
            const running = horse.state === 'RUN';
            const swing = !running ? anim.legSwing : (fleeing ? anim.fleeLegSwing : anim.runLegSwing);
            const flight = !running ? 1 : (fleeing ? 2 : 1.6);
            animateQuadrupedLegs(horse.legs, time, legCycleRate(moveSpeed, anim.legLength, swing, 5, flight), swing);
            horse.neck.rotation.x = horse.neckBaseRot;
        } else {
            resetLegsToNeutral(horse.legs, delta);
            // Head down to graze while standing
            horse.neck.rotation.x += ((horse.neckBaseRot + 1.1) - horse.neck.rotation.x) * Math.min(1, delta * 1.5);
        }
    });
}

// Export globals
exportEntityGlobals('Horse', {
    initHorses, updateHorses, updateHorseState,
    HorseSystem, horseList, createHorse
});
