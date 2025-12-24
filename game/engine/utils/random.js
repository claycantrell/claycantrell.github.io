// Seeded Random Number Generator (LCG)
// Used for deterministic entity spawning across all clients

let worldSeed = 123456; // Default seed, updated by server

function setWorldSeed(seed) {
    worldSeed = seed;
    console.log(`World seed set to: ${worldSeed}`);
}

// Linear Congruential Generator
function seededRandom(seedOffset = 0) {
    // Simple LCG parameters (glibc)
    const a = 1103515245;
    const c = 12345;
    const m = 2147483648;
    
    // Use worldSeed mixed with offset
    let state = (worldSeed + seedOffset) >>> 0; // Ensure unsigned 32-bit
    state = (a * state + c) % m;
    
    return state / m;
}

// Helper for range
function seededRandomRange(min, max, seedOffset) {
    return min + seededRandom(seedOffset) * (max - min);
}

// Make available globally
window.setWorldSeed = setWorldSeed;
window.seededRandom = seededRandom;
window.seededRandomRange = seededRandomRange;

