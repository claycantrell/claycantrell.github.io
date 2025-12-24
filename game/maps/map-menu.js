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

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        #map-menu {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            font-family: Arial, sans-serif;
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
            background: rgba(25, 25, 112, 0.95);
            border: 2px solid #4a7c4e;
            border-radius: 10px;
            padding: 20px;
            min-width: 300px;
            max-width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
        }

        .map-menu-container h2 {
            margin: 0 0 20px 0;
            text-align: center;
            color: #4a7c4e;
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
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .map-item:hover {
            background: rgba(74, 124, 78, 0.4);
            border-color: #4a7c4e;
        }

        .map-item.current {
            background: rgba(74, 124, 78, 0.3);
            border-color: #4a7c4e;
        }

        .map-item.current::after {
            content: '(Current)';
            margin-left: auto;
            color: #4a7c4e;
            font-size: 12px;
        }

        .map-thumbnail {
            width: 60px;
            height: 60px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            margin-right: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }

        .map-info h3 {
            margin: 0 0 5px 0;
            font-size: 16px;
        }

        .map-info p {
            margin: 0;
            font-size: 12px;
            opacity: 0.7;
        }

        .map-menu-footer {
            margin-top: 20px;
            text-align: center;
        }

        #map-menu-close {
            padding: 10px 30px;
            background: #4a7c4e;
            border: none;
            border-radius: 5px;
            color: white;
            cursor: pointer;
            font-size: 14px;
        }

        #map-menu-close:hover {
            background: #5a9c5e;
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
            <div class="map-thumbnail">${getMapIcon(map.id)}</div>
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

// Get icon for map (placeholder until thumbnails are added)
function getMapIcon(mapId) {
    const icons = {
        'grasslands': '🌿',
        'forest': '🌲',
        'desert': '🏜️',
        'snow': '❄️',
        'beach': '🏖️'
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
        // For now, just reload the page with the map parameter
        // Later this can be replaced with dynamic map switching
        window.location.href = `?map=${mapId}`;
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
