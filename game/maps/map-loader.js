// Map Loader - Loads and manages map configurations
// This module handles loading map configs and provides them to game systems

// Current loaded map configuration
let currentMapConfig = null;
let currentMapId = null;

// Available maps registry
const AVAILABLE_MAPS = [
    { id: 'grasslands', name: 'Grasslands', path: 'maps/grasslands/config.json' },
    { id: 'desert', name: 'Scorching Dunes', path: 'maps/desert/config.json' }
];

// Get list of available maps
function getAvailableMaps() {
    return AVAILABLE_MAPS;
}

// Load a map configuration by ID
async function loadMap(mapId) {
    const mapEntry = AVAILABLE_MAPS.find(m => m.id === mapId);
    if (!mapEntry) {
        console.error(`Map not found: ${mapId}`);
        return null;
    }

    try {
        const response = await fetch(mapEntry.path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const config = await response.json();

        currentMapConfig = config;
        currentMapId = mapId;

        console.log(`Loaded map: ${config.name}`);
        return config;
    } catch (error) {
        console.error(`Failed to load map ${mapId}:`, error);
        return null;
    }
}

// Get the current map configuration
function getMapConfig() {
    return currentMapConfig;
}

// Get the current map ID
function getCurrentMapId() {
    return currentMapId;
}

// Get a specific config section with defaults
function getTerrainConfig() {
    return currentMapConfig?.terrain || {};
}

function getSpawnConfig() {
    return currentMapConfig?.spawn || { position: { x: 0, z: 0 }, rotation: 0 };
}

function getPortalConfig() {
    return {
        portals: currentMapConfig?.portals || [],
        radius: currentMapConfig?.portalRadius || 19.5
    };
}

function getTreeConfig() {
    return currentMapConfig?.trees || { count: 500, radius: 300 };
}

function getEntityConfig() {
    return currentMapConfig?.entities || {};
}

function getCharacterConfig() {
    return currentMapConfig?.character || {
        moveSpeed: 20.0,
        rotationSpeed: 2.0,
        flySpeed: 15.0,
        gravity: 25.0,
        collisionRadius: 3.0
    };
}

function getRenderingConfig() {
    return currentMapConfig?.rendering || {};
}

function getAudioConfig() {
    return currentMapConfig?.audio || {};
}

// Check if a map is loaded
function isMapLoaded() {
    return currentMapConfig !== null;
}

// Clear current map (for switching maps)
function unloadMap() {
    currentMapConfig = null;
    currentMapId = null;
}

// Make available globally
window.getAvailableMaps = getAvailableMaps;
window.loadMap = loadMap;
window.getMapConfig = getMapConfig;
window.getCurrentMapId = getCurrentMapId;
window.getTerrainConfig = getTerrainConfig;
window.getSpawnConfig = getSpawnConfig;
window.getPortalConfig = getPortalConfig;
window.getTreeConfig = getTreeConfig;
window.getEntityConfig = getEntityConfig;
window.getCharacterConfig = getCharacterConfig;
window.getRenderingConfig = getRenderingConfig;
window.getAudioConfig = getAudioConfig;
window.isMapLoaded = isMapLoaded;
window.unloadMap = unloadMap;
