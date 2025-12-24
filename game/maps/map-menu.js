// Map Menu - In-game UI for selecting maps
// Press 'M' to open/close the map selection menu

let mapMenuVisible = false;
let mapMenuElement = null;

// Initialize the map menu
function initMapMenu() {
    createMapMenuUI();
    setupMapMenuControls();
}

// Create the map menu UI
function createMapMenuUI() {
    // Create container
    mapMenuElement = document.createElement('div');
    mapMenuElement.id = 'map-menu';
    mapMenuElement.innerHTML = `
        <div class="map-menu-overlay"></div>
        <div class="map-menu-container">
            <h2>Select Map</h2>
            <div class="map-menu-list" id="map-list"></div>
            <div class="map-menu-footer">
                <button id="map-menu-close">Close (M)</button>
            </div>
        </div>
    `;
    mapMenuElement.style.display = 'none';
    document.body.appendChild(mapMenuElement);

    // Add styles - matching game's retro wooden theme
    const style = document.createElement('style');
    style.textContent = `
        #map-menu {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            font-family: 'Press Start 2P', cursive;
        }

        .map-menu-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
        }

        .map-menu-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(139, 69, 19, 0.95);
            border: 4px solid #8B4513;
            border-radius: 10px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);
            padding: 20px;
            min-width: 300px;
            max-width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            color: #F5DEB3;
        }

        .map-menu-container h2 {
            margin: 0 0 20px 0;
            text-align: center;
            color: #F5DEB3;
            font-size: 18px;
        }

        .map-menu-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .map-item {
            display: flex;
            align-items: center;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid #8B4513;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .map-item:hover {
            background: rgba(0, 0, 0, 0.5);
            border-color: #A0522D;
        }

        .map-item.current {
            background: rgba(0, 0, 0, 0.4);
            border-color: #A0522D;
        }

        .map-item.current::after {
            content: '(Current)';
            margin-left: auto;
            color: #FFFF00;
            font-size: 10px;
        }

        .map-thumbnail {
            width: 60px;
            height: 60px;
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid #8B4513;
            border-radius: 5px;
            margin-right: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            overflow: hidden;
        }

        .map-thumb-container {
            position: relative;
            width: 100%;
            height: 100%;
        }

        .map-thumb-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .map-thumb-icon {
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 16px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }

        .map-info h3 {
            margin: 0 0 5px 0;
            font-size: 12px;
            color: #FFFF00;
        }

        .map-info p {
            margin: 0;
            font-size: 10px;
            color: #F5DEB3;
            opacity: 0.8;
        }

        .map-menu-footer {
            margin-top: 20px;
            text-align: center;
        }

        #map-menu-close {
            padding: 12px 24px;
            background-color: rgba(139, 69, 19, 0.95);
            border: 3px solid #8B4513;
            border-radius: 8px;
            color: #F5DEB3;
            cursor: pointer;
            font-family: 'Press Start 2P', cursive;
            font-size: 12px;
            transition: background-color 0.2s;
        }

        #map-menu-close:hover {
            background-color: rgba(139, 69, 19, 1);
            border-color: #A0522D;
        }

        /* Scrollbar styling */
        .map-menu-container::-webkit-scrollbar {
            width: 8px;
        }

        .map-menu-container::-webkit-scrollbar-track {
            background: rgba(139, 69, 19, 0.3);
        }

        .map-menu-container::-webkit-scrollbar-thumb {
            background: #8B4513;
            border-radius: 4px;
        }

        .map-menu-container::-webkit-scrollbar-thumb:hover {
            background: #A0522D;
        }

        @media (max-width: 480px) {
            .map-menu-container h2 {
                font-size: 14px;
            }
            .map-info h3 {
                font-size: 10px;
            }
            .map-info p {
                font-size: 8px;
            }
            #map-menu-close {
                font-size: 10px;
                padding: 10px 20px;
            }
        }
    `;
    document.head.appendChild(style);

    // Close button handler
    document.getElementById('map-menu-close').addEventListener('click', hideMapMenu);

    // Overlay click to close
    mapMenuElement.querySelector('.map-menu-overlay').addEventListener('click', hideMapMenu);
}

// Populate the map list
function populateMapList() {
    const listElement = document.getElementById('map-list');
    const maps = getAvailableMaps();
    const currentId = getCurrentMapId();

    listElement.innerHTML = '';

    maps.forEach(map => {
        const item = document.createElement('div');
        item.className = 'map-item' + (map.id === currentId ? ' current' : '');
        item.innerHTML = `
            <div class="map-thumbnail">${getMapThumbnail(map.id)}</div>
            <div class="map-info">
                <h3>${map.name}</h3>
                <p>Click to load this map</p>
            </div>
        `;

        if (map.id !== currentId) {
            item.addEventListener('click', () => selectMap(map.id));
        }

        listElement.appendChild(item);
    });
}

// Get thumbnail for map - uses terrain color to generate a styled preview
function getMapThumbnail(mapId) {
    // Map-specific colors and features
    const mapStyles = {
        'grasslands': { color: '#004d00', icon: '🌿', hills: true },
        'forest': { color: '#006400', icon: '🌲', hills: true },
        'desert': { color: '#C2B280', icon: '🏜️', dunes: true },
        'snow': { color: '#E8E8E8', icon: '❄️', hills: true },
        'beach': { color: '#F4D03F', icon: '🏖️', waves: true },
        'cave': { color: '#2F2F2F', icon: '🕳️', rocks: true },
        'volcano': { color: '#8B0000', icon: '🌋', lava: true }
    };

    const style = mapStyles[mapId] || { color: '#4a7c4e', icon: '🗺️', hills: true };

    // Generate SVG terrain preview
    const svg = generateTerrainSVG(style);
    return `<div class="map-thumb-container">
        <img src="data:image/svg+xml,${encodeURIComponent(svg)}" alt="${mapId}">
        <span class="map-thumb-icon">${style.icon}</span>
    </div>`;
}

// Generate SVG terrain preview based on map style
function generateTerrainSVG(style) {
    let terrainPath = '';

    if (style.dunes) {
        // Desert dunes - smooth waves
        terrainPath = `<path d="M0 35 Q12 25 25 35 Q38 45 50 35 L50 50 L0 50 Z" fill="${style.color}"/>
                       <path d="M0 40 Q15 30 30 40 Q45 50 50 40 L50 50 L0 50 Z" fill="${adjustColor(style.color, -15)}" opacity="0.7"/>`;
    } else if (style.waves) {
        // Beach with water
        terrainPath = `<rect x="0" y="0" width="50" height="30" fill="#4A90D9"/>
                       <path d="M0 30 L50 30 L50 50 L0 50 Z" fill="${style.color}"/>
                       <path d="M0 28 Q12 25 25 28 Q38 31 50 28" stroke="#6BB3E0" stroke-width="2" fill="none"/>`;
    } else if (style.rocks) {
        // Cave with rocks
        terrainPath = `<rect x="0" y="0" width="50" height="50" fill="#1a1a1a"/>
                       <polygon points="5,50 15,35 25,50" fill="${style.color}"/>
                       <polygon points="20,50 35,30 50,50" fill="${adjustColor(style.color, 20)}"/>`;
    } else if (style.lava) {
        // Volcano with lava
        terrainPath = `<polygon points="0,50 25,15 50,50" fill="${style.color}"/>
                       <polygon points="22,20 25,15 28,20 25,25" fill="#FF4500"/>
                       <rect x="0" y="45" width="50" height="5" fill="#FF6600" opacity="0.6"/>`;
    } else {
        // Default hills
        terrainPath = `<path d="M0 40 Q10 30 20 35 Q30 40 40 32 Q50 25 50 35 L50 50 L0 50 Z" fill="${style.color}"/>
                       <path d="M0 45 Q15 38 30 42 Q45 46 50 42 L50 50 L0 50 Z" fill="${adjustColor(style.color, -20)}" opacity="0.5"/>`;
    }

    // Sky color based on terrain
    let skyColor = '#87CEEB'; // Default blue sky
    if (style.color === '#2F2F2F') skyColor = '#1a1a1a'; // Cave
    if (style.color === '#8B0000') skyColor = '#4A0000'; // Volcano

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
        <rect x="0" y="0" width="50" height="50" fill="${skyColor}"/>
        ${terrainPath}
    </svg>`;
}

// Adjust color brightness
function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

// Legacy function for simple icon fallback
function getMapIcon(mapId) {
    const icons = {
        'grasslands': '🌿',
        'forest': '🌲',
        'desert': '🏜️',
        'snow': '❄️',
        'beach': '🏖️',
        'cave': '🕳️',
        'volcano': '🌋'
    };
    return icons[mapId] || '🗺️';
}

// Select and load a map
async function selectMap(mapId) {
    showNotification('Loading map...');
    hideMapMenu();

    // In a full implementation, this would:
    // 1. Clear the current scene
    // 2. Load the new map config
    // 3. Regenerate the world
    // 4. Reset the player position

    const config = await loadMap(mapId);
    if (config) {
        // Reload the page with the map parameter
        // Preserve the current pathname to stay in the game directory
        const currentPath = window.location.pathname;
        window.location.href = `${currentPath}?map=${mapId}`;
    } else {
        showNotification('Failed to load map');
    }
}

// Show the map menu
function showMapMenu() {
    if (!mapMenuElement) return;

    populateMapList();
    mapMenuElement.style.display = 'block';
    mapMenuVisible = true;

    // Disable game controls
    if (typeof disableControls === 'function') {
        disableControls();
    }
}

// Hide the map menu
function hideMapMenu() {
    if (!mapMenuElement) return;

    mapMenuElement.style.display = 'none';
    mapMenuVisible = false;

    // Re-enable game controls
    if (typeof enableControls === 'function') {
        enableControls();
    }
}

// Toggle map menu
function toggleMapMenu() {
    if (mapMenuVisible) {
        hideMapMenu();
    } else {
        showMapMenu();
    }
}

// Setup keyboard controls for map menu
function setupMapMenuControls() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'm' || e.key === 'M') {
            // Don't toggle if typing in chat
            if (document.activeElement.tagName === 'INPUT') return;
            toggleMapMenu();
        }

        if (e.key === 'Escape' && mapMenuVisible) {
            hideMapMenu();
        }
    });
}

// Check if map menu is visible
function isMapMenuVisible() {
    return mapMenuVisible;
}

// Make available globally
window.initMapMenu = initMapMenu;
window.toggleMapMenu = toggleMapMenu;
window.isMapMenuVisible = isMapMenuVisible;
