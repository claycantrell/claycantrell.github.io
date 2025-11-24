// Time synchronization system
// Syncs local game time with server time to ensure consistent day/night cycles

let serverTimeOffset = 0;
const FOG_CYCLE_DURATION = 2 * 60 * 1000; // 2 minutes

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

// Function to get current fog/day-night phase (0.0 to 1.0)
function getDayNightPhase() {
    const time = getSharedTime();
    // Use a fixed epoch so everyone is on same cycle
    // (time / duration) % 1.0 gives a value 0..1
    const rawPhase = (time % FOG_CYCLE_DURATION) / FOG_CYCLE_DURATION;
    
    // We want oscillation: 0 -> 1 -> 0
    // sin((rawPhase * PI * 2) + PI/2) -> starts at 1, goes to -1, back to 1?
    // Let's use the existing formula: (sin(time * factor) + 1) / 2
    
    // (time / FOG_CYCLE_DURATION) * Math.PI * 2 gives 0..2PI over the duration
    const phase = (Math.sin((time / FOG_CYCLE_DURATION) * Math.PI * 2) + 1) / 2;
    return phase;
}

// If connected to multiplayer, we can sync the offset
function setServerTime(serverTimestamp) {
    const now = Date.now();
    // Offset = ServerTime - LocalTime
    // This is a naive sync (doesn't account for latency), but good enough for day/night
    serverTimeOffset = serverTimestamp - now;
    console.log(`Time synchronized. Offset: ${serverTimeOffset}ms`);
}

