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

/**
 * SCRIPT LOADING ORDER REQUIREMENTS
 * ==================================
 * Scripts are loaded sequentially to ensure dependencies are available.
 * The order is critical - changing it may break the game.
 *
 * LAYER 1: Core Framework (must load first)
 * - namespace.js: GAME namespace - all other scripts depend on this
 * - systems.js: Systems registry for update loop
 * - config.js: CONFIG object for centralized configuration
 * - performance.js: PERFORMANCE config and shared materials
 * - utils/random.js: Seeded random for consistent world generation
 * - map-loader.js: Map configuration loading
 *
 * LAYER 2: World Systems (depend on Layer 1)
 * - character.js: Player character (needs GAME, CONFIG)
 * - climate.js, biomes.js: World generation data
 * - water.js, chunks.js, terrain.js: Terrain generation
 * - trees.js, shrubs.js: Vegetation (needs terrain)
 * - portals.js: Portal system
 *
 * LAYER 3: Entity Systems (depend on terrain being defined)
 * - entities/*.js: NPCs and animals
 * - entity-registry.js: Entity management
 *
 * LAYER 4: Multiplayer (can run independently)
 * - player-utils.js, time-sync.js, sync.js: Network utilities
 *
 * LAYER 5: UI & Input (needs core systems)
 * - input.js, audio.js, ui.js: User interaction
 * - chat.js: Chat system
 * - client.js, other-players.js: Multiplayer rendering
 * - building.js: Block building system
 * - map-menu.js: Map selection UI
 *
 * LAYER 6: Initialization (must load last)
 * - core.js: Three.js setup, scene init (depends on ALL above)
 * - game.js: Animation loop (depends on core.js)
 */
const scripts = [
    // Layer 1: Core Framework
    '../engine/namespace.js',      // GAME namespace (load first)
    '../engine/systems.js',        // Systems registry
    '../engine/config.js',         // Centralized configuration
    '../engine/performance.js',    // Performance config
    '../engine/utils/random.js',   // Seeded random
    '../maps/map-loader.js',       // Map configuration

    // Layer 2: World Systems
    '../systems/character.js',
    '../systems/climate.js',
    '../systems/biomes.js',
    '../systems/water.js',
    '../systems/chunks.js',
    '../systems/terrain.js',
    '../systems/trees.js',
    '../systems/shrubs.js',
    '../systems/portals.js',

    // Layer 3: Entity Systems
    '../systems/entities/npc.js',
    '../systems/entities/deer.js',
    '../systems/entities/bunny.js',
    '../systems/entities/bird.js',
    '../systems/entities/entity-registry.js',

    // Layer 4: Multiplayer
    '../multiplayer/player-utils.js',
    '../multiplayer/time-sync.js',
    '../multiplayer/sync.js',

    // Layer 5: UI & Input
    '../engine/input.js',
    '../engine/audio.js',
    '../engine/ui.js',
    '../systems/chat.js',
    '../multiplayer/client.js',
    '../multiplayer/other-players.js',
    '../systems/building.js',
    '../maps/map-menu.js',

    // Layer 6: Initialization (must be last)
    '../engine/core.js',           // Three.js setup
    '../engine/game.js'            // Animation loop
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
