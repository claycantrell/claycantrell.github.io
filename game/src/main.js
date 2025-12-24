// Main entry point - loads existing game with modern module system
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { SimplexNoise as ThreeSimplexNoise } from 'three/addons/math/SimplexNoise.js';

// Create seeded random number generator from string
function seededRandom(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return {
        random() {
            h = Math.imul(h ^ h >>> 16, 2246822507);
            h = Math.imul(h ^ h >>> 13, 3266489909);
            return ((h ^= h >>> 16) >>> 0) / 4294967296;
        }
    };
}

// Wrapper to make Three.js SimplexNoise work with string seeds and old API
class SimplexNoise extends ThreeSimplexNoise {
    constructor(seed) {
        if (typeof seed === 'string') {
            super(seededRandom(seed));
        } else {
            super(seed);
        }
    }
    // Alias for old API compatibility (Three.js uses noise(), old lib used noise2D())
    noise2D(x, y) {
        return this.noise(x, y);
    }
}

// Make libraries available globally (for existing code compatibility)
// Spread into new object to make it mutable, preserving all THREE exports
window.THREE = { ...THREE, FontLoader, TextGeometry };
window.SimplexNoise = SimplexNoise;

// Signal modules loaded
window.THREE_MODULES_LOADED = true;
window.dispatchEvent(new Event('threeModulesLoaded'));

// Dynamically load existing game scripts in order (matches original index.html)
const scripts = [
    '../engine/namespace.js',      // GAME namespace (load first)
    '../engine/systems.js',        // Systems registry
    '../engine/performance.js',
    '../engine/utils/random.js',
    '../maps/map-loader.js',
    '../systems/character.js',
    '../systems/climate.js',
    '../systems/biomes.js',
    '../systems/water.js',
    '../systems/chunks.js',
    '../systems/terrain.js',
    '../systems/trees.js',
    '../systems/shrubs.js',
    '../systems/portals.js',
    '../systems/entities/npc.js',
    '../systems/entities/deer.js',
    '../systems/entities/bunny.js',
    '../systems/entities/bird.js',
    '../systems/entities/entity-registry.js',
    '../multiplayer/player-utils.js',
    '../multiplayer/time-sync.js',
    '../multiplayer/sync.js',
    '../engine/input.js',
    '../engine/audio.js',
    '../engine/ui.js',
    '../systems/chat.js',
    '../multiplayer/client.js',
    '../multiplayer/other-players.js',
    '../systems/building.js',
    '../maps/map-menu.js',
    '../engine/core.js',  // core.js must be AFTER audio, input, ui
    '../engine/game.js'
];

async function loadScripts() {
    for (const src of scripts) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    console.log('All game scripts loaded');
}

loadScripts();
