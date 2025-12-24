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

// Function to get current fog/day-night phase (0.0 to 1.0)
// Modified to have longer days and shorter nights using a smooth function
function getDayNightPhase() {
    const time = getSharedTime();
    // Use a fixed epoch so everyone is on same cycle
    const rawPhase = (time % FOG_CYCLE_DURATION) / FOG_CYCLE_DURATION;

    // Use a modified sine wave that's asymmetric
    // This creates a smoother transition but spends more time in lower values (day)
    // The power function makes the transition asymmetric
    const adjustedPhase = Math.pow(rawPhase, 0.8); // Power < 1 makes it spend more time at lower values

    // Apply sine wave to the adjusted phase for smooth transitions
    const phase = (Math.sin(adjustedPhase * Math.PI * 2) + 1) / 2;

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


// Make available globally
window.getDayNightPhase = getDayNightPhase;
window.getServerTime = getServerTime;
