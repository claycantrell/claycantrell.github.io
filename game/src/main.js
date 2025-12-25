// Main entry point - loads existing game with modern module system
import * as THREE from 'three';
import { SimplexNoise as ThreeSimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// ============================================================================
// PRODUCTION CONFIG
// ============================================================================
const IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const SCRIPT_LOAD_TIMEOUT = 10000; // 10 second timeout per script

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================
window.onerror = function(message, source, lineno, colno, error) {
    if (IS_PRODUCTION) {
        // In production, show user-friendly message
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = 'An error occurred. Please refresh the page.';
            notification.style.display = 'block';
        }
    }
    // Always log to console for debugging
    console.error('Global error:', { message, source, lineno, colno, error });
    return false; // Don't suppress the error
};

window.onunhandledrejection = function(event) {
    if (IS_PRODUCTION) {
        console.error('Unhandled promise rejection:', event.reason);
    } else {
        console.error('Unhandled promise rejection:', event.reason);
    }
};

// Production-safe logging
window.gameLog = IS_PRODUCTION
    ? () => {} // No-op in production
    : console.log.bind(console);

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
    '../engine/utils/entity-config.js', // Entity configuration
    '../engine/utils/collision.js',     // Shared collision detection
    '../engine/utils/terrain.js',       // Cached terrain lookups
    '../engine/utils/behaviors.js',     // Shared entity behaviors
    '../engine/utils/entity-factory.js', // Entity system boilerplate
    '../engine/utils/animal-behaviors.js', // Animal flee/wander logic
    '../engine/utils/animation-utils.js', // Animation utilities
    '../maps/map-loader.js',       // Map configuration

    // Layer 2: World Systems
    '../systems/character.js',
    '../systems/climate.js',
    '../systems/sky.js',          // Beautiful sky with clouds
    '../systems/biomes.js',
    '../engine/utils/ground-textures.js', // Procedural terrain textures
    '../systems/water.js',
    '../systems/chunks.js',
    '../systems/terrain.js',
    '../systems/trees.js',
    '../systems/shrubs.js',
    '../systems/portals.js',

    // Layer 3: Entity Systems
    '../systems/entities/npc.js',
    '../systems/entities/deer.js',
    '../systems/entities/cow.js',
    '../systems/entities/bunny.js',
    '../systems/entities/bird.js',
    '../systems/entities/entity-registry.js',
    '../systems/entities/animal-spawner.js',

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
    '../systems/terraform.js',
    '../maps/map-menu.js',

    // Layer 6: Initialization (must be last)
    '../engine/core.js',           // Three.js setup
    '../engine/game.js'            // Animation loop
];

// Loading screen elements
const loadingBar = document.getElementById('loading-bar');
const loadingPercent = document.getElementById('loading-percent');
const loadingStatus = document.getElementById('loading-status');
const loadingScreen = document.getElementById('loading-screen');

// Update loading progress
function updateLoadingProgress(percent, status) {
    if (loadingBar) loadingBar.style.width = `${percent}%`;
    if (loadingPercent) loadingPercent.textContent = `${Math.round(percent)}%`;
    if (loadingStatus) loadingStatus.textContent = status;
}

// Hide loading screen
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

// Expose functions globally for core.js to call
window.hideLoadingScreen = hideLoadingScreen;
window.updateLoadingProgress = updateLoadingProgress;

// Load a single script with timeout
function loadScriptWithTimeout(src, timeout = SCRIPT_LOAD_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;

        const timeoutId = setTimeout(() => {
            reject(new Error(`Script load timeout: ${src}`));
        }, timeout);

        script.onload = () => {
            clearTimeout(timeoutId);
            resolve();
        };

        script.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error(`Failed to load script: ${src}`));
        };

        document.body.appendChild(script);
    });
}

// Get friendly name for script status
function getScriptName(src) {
    const filename = src.split('/').pop().replace('.js', '');
    const names = {
        'namespace': 'Core systems',
        'systems': 'Game systems',
        'config': 'Configuration',
        'performance': 'Performance settings',
        'random': 'World generation',
        'entity-config': 'Entity configuration',
        'collision': 'Collision utilities',
        'terrain': 'Terrain utilities',
        'behaviors': 'Entity behaviors',
        'map-loader': 'Map loader',
        'character': 'Character system',
        'climate': 'Climate system',
        'biomes': 'Biome data',
        'ground-textures': 'Ground textures',
        'water': 'Water system',
        'caves': 'Cave generation',
        'chunks': 'Terrain chunks',
        'terrain': 'Terrain generation',
        'trees': 'Tree generation',
        'shrubs': 'Vegetation',
        'portals': 'Portal system',
        'npc': 'NPC system',
        'deer': 'Wildlife (deer)',
        'bunny': 'Wildlife (bunnies)',
        'bird': 'Wildlife (birds)',
        'entity-registry': 'Entity registry',
        'animal-spawner': 'Animal spawner',
        'player-utils': 'Multiplayer utilities',
        'time-sync': 'Time synchronization',
        'sync': 'Network sync',
        'input': 'Input controls',
        'audio': 'Audio system',
        'ui': 'User interface',
        'chat': 'Chat system',
        'client': 'Network client',
        'other-players': 'Multiplayer rendering',
        'building': 'Building system',
        'terraform': 'Terraforming',
        'map-menu': 'Map selection',
        'core': 'Initializing world',
        'game': 'Starting game'
    };
    return names[filename] || filename;
}

async function loadScripts() {
    const totalScripts = scripts.length;

    try {
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i];
            const scriptName = getScriptName(src);

            // Update status before loading
            updateLoadingProgress((i / totalScripts) * 90, scriptName);

            await loadScriptWithTimeout(src);
        }

        updateLoadingProgress(95, 'Finalizing');
        gameLog('All game scripts loaded');
    } catch (error) {
        console.error('Script loading failed:', error);
        updateLoadingProgress(0, 'Error loading game');

        // Show user-friendly error
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = 'Failed to load game. Please refresh the page.';
            notification.style.display = 'block';
            notification.style.background = 'rgba(200, 0, 0, 0.8)';
        }
    }
}

loadScripts();
