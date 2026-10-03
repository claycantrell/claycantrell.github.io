// Time synchronization system
// Syncs local game time with server time to ensure consistent day/night cycles

let serverTimeOffset = 0;
const FOG_CYCLE_DURATION = 4 * 60 * 1000; // 4 minutes (twice as long)

// Function to calculate shared game time
function getSharedTime() {
    // Current timestamp + offset from server
    // For now, we'll just use Date.now() but in a real multiplayer setup, 
    // we would adjust this based on a server timestamp received on connection.
    // To make it roughly synced without a server for now, we can rely on the fact 
    // that Date.now() is UTC based and fairly consistent across machines.
    
    // In a real implementation with a server:
    // sharedTime = Date.now() + serverTimeOffset;
    return Date.now() + serverTimeOffset;
}

// The sun is up for this fraction of each cycle (Minecraft: ~60-65%)
const DAY_FRACTION = 0.65;

// Sun angle for the current time: 0 at sunrise, pi/2 at noon, pi at sunset,
// pi..2pi below the horizon. Sun height = sin(angle). The day half of the
// circle takes DAY_FRACTION of the cycle, the night half the rest.
function getSunAngle() {
    const raw = (getSharedTime() % FOG_CYCLE_DURATION) / FOG_CYCLE_DURATION;
    if (raw < DAY_FRACTION) return (raw / DAY_FRACTION) * Math.PI;
    return Math.PI + ((raw - DAY_FRACTION) / (1 - DAY_FRACTION)) * Math.PI;
}

// Darkness phase (0 = noon .. 0.5 = sun on the horizon .. 1 = midnight),
// derived from the sun so sky, fog and light always match where the sun is
function getDayNightPhase() {
    return (1 - Math.sin(getSunAngle())) / 2;
}

// Time of day such that the sun's angle is -2pi * dayTime (used by core.js)
function getDayTime() {
    const t = -getSunAngle() / (Math.PI * 2);
    return ((t % 1) + 1) % 1;
}

// If connected to multiplayer, we can sync the offset
function setServerTime(serverTimestamp) {
    const now = Date.now();
    // Offset = ServerTime - LocalTime
    // This is a naive sync (doesn't account for latency), but good enough for day/night
    serverTimeOffset = serverTimestamp - now;
}


// Make available globally
window.getDayNightPhase = getDayNightPhase;
window.getDayTime = getDayTime;
window.getSunAngle = getSunAngle;
window.setServerTime = setServerTime;
window.getSharedTime = getSharedTime;
