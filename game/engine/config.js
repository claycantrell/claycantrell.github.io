// Centralized Configuration System
// Provides unified access to all game configuration with defaults
// Works with map-loader for per-map overrides

// Environment detection
const IS_PRODUCTION = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const IS_SECURE = window.location.protocol === 'https:';

const CONFIG = {
    // Environment settings
    env: {
        isProduction: IS_PRODUCTION,
        isSecure: IS_SECURE,
        // API endpoints - auto-configured based on environment
        apiBaseUrl: IS_PRODUCTION
            ? `${window.location.protocol}//${window.location.host}`
            : 'http://localhost:8080',
        wsBaseUrl: IS_PRODUCTION
            ? `${IS_SECURE ? 'wss:' : 'ws:'}//${window.location.host}`
            : 'ws://localhost:8080',
        // Feature flags
        enableLogging: !IS_PRODUCTION,
        enableDebugMode: !IS_PRODUCTION
    },

    // API endpoints (derived from env)
    get api() {
        return {
            chat: `${this.env.apiBaseUrl}/api/chat`,
            token: `${this.env.apiBaseUrl}/api/token`,
            websocket: this.env.wsBaseUrl
        };
    },

    // Default values for all configurable settings
    defaults: {
        character: {
            moveSpeed: 20.0,
            flySpeed: 80.0,
            rotationSpeed: 2.0,
            gravity: 25.0,
            collisionRadius: 3.0
        },
        terrain: {
            size: 50000,
            segments: 256,
            chunkSize: 512,
            chunkSegments: 48,
            renderDistance: 6,
            unloadDistance: 8
        },
        entities: {
            deer: { count: 18, enabled: true, speed: 20.0 },
            bunnies: { count: 20, enabled: true, speed: 20.0 },
            birds: { count: 30, enabled: true, speed: 12.0 },
            npc: { enabled: true, speed: 5.0 }
        },
        trees: {
            count: 3000,
            radius: 300
        },
        rendering: {
            lodEnabled: true,
            lodDistance: 200,
            lodUpdateInterval: 350,
            maxDrawDistance: 1200,
            frustumCulling: true
        },
        water: {
            seaLevel: -5
        },
        spawn: {
            position: { x: 0, z: 0 },
            rotation: 0
        }
    },

    // Get config value with path notation (e.g., 'character.moveSpeed')
    // Checks map config first, then falls back to defaults
    get(path, fallback) {
        // Try map config first
        if (typeof getMapConfig === 'function') {
            const mapConfig = getMapConfig();
            const mapValue = this._getPath(mapConfig, path);
            if (mapValue !== undefined) return mapValue;
        }

        // Fall back to defaults
        const defaultValue = this._getPath(this.defaults, path);
        if (defaultValue !== undefined) return defaultValue;

        // Use provided fallback
        return fallback;
    },

    // Get entire section (e.g., 'character' returns full character config)
    getSection(section) {
        const result = { ...this.defaults[section] };

        // Override with map config if available
        if (typeof getMapConfig === 'function') {
            const mapConfig = getMapConfig();
            if (mapConfig && mapConfig[section]) {
                Object.assign(result, mapConfig[section]);
            }
        }

        return result;
    },

    // Internal: get nested path from object
    _getPath(obj, path) {
        if (!obj || !path) return undefined;
        return path.split('.').reduce((o, k) => o?.[k], obj);
    },

    // Check if a feature is enabled
    isEnabled(feature) {
        return this.get(`entities.${feature}.enabled`, false);
    },

    // Get entity count
    getEntityCount(entityType) {
        return this.get(`entities.${entityType}.count`, 0);
    }
};

// Make available globally
window.CONFIG = CONFIG;
