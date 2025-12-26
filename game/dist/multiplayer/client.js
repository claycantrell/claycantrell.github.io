// Multiplayer client - handles WebSocket connection and player updates

let socket = null;
let playerId = null;
let isConnected = false;
let updateThrottle = 66; // Send updates every ~66ms (15fps)
let lastUpdateTime = 0;
let reconnectAttempts = 0;
let lastErrorTime = 0;

// Determine WebSocket URL based on environment (uses CONFIG if available)
function getDefaultWebSocketUrl() {
    // Use centralized CONFIG if available
    if (typeof CONFIG !== 'undefined' && CONFIG.api && CONFIG.api.websocket) {
        return CONFIG.api.websocket;
    }
    // Fallback
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
        return 'ws://localhost:8080';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
}

// Initialize multiplayer connection
function initMultiplayer(serverUrl = null) {
    serverUrl = serverUrl || getDefaultWebSocketUrl();
    try {
        // Close existing connection if any
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            socket.close();
        }

        // Remove trailing slash if present
        serverUrl = serverUrl.replace(/\/$/, '');
        
        socket = new WebSocket(serverUrl);

        socket.onopen = () => {
            if (typeof gameLog === 'function') gameLog('Connected to multiplayer server');
            isConnected = true;
            reconnectAttempts = 0;

            // Send current map ID to server
            const currentMapId = typeof getCurrentMapId === 'function' ? getCurrentMapId() : 'grasslands';
            socket.send(JSON.stringify({
                type: 'setMap',
                mapId: currentMapId
            }));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleServerMessage(data);
            } catch (error) {
                console.error('Error parsing server message:', error, event.data);
            }
        };

        socket.onclose = () => {
            if (isConnected && typeof gameLog === 'function') {
                gameLog('Disconnected from multiplayer server');
            }
            isConnected = false;
            
            // Try to reconnect after 3 seconds (only if we were connected before)
            if (reconnectAttempts < 10) { // Limit reconnect attempts
                reconnectAttempts++;
                setTimeout(() => {
                    if (!isConnected) {
                        initMultiplayer(serverUrl);
                    }
                }, 3000);
            } else {
                // After 10 failed attempts, give up silently
                // Game continues in single-player mode
                lastErrorTime = Date.now();
            }
        };

        socket.onerror = () => {
            // Silently fail - game continues in single-player mode
            isConnected = false;
        };
    } catch (error) {
        // Continue without multiplayer - game still works
        isConnected = false;
    }
}

// Handle messages from server
function handleServerMessage(data) {
    switch (data.type) {
        case 'connected':
            playerId = data.id;
            
            // Set world seed for deterministic randomness
            if (data.worldSeed && typeof setWorldSeed === 'function') {
                setWorldSeed(data.worldSeed);
            }
            
            // Check if we are the host (server should ideally send this)
            // If data.isHost is present, set it
            if (data.isHost) {
                isAnimalHost = true;
            } else if (data.playerCount === 1) {
                // Fallback: if we are the only player, we are host
                isAnimalHost = true;
            } else {
                isAnimalHost = false;
            }
            
            // Set character spawn position from server
            if (data.spawnPosition && data.spawnRotation && character) {
                character.position.set(
                    data.spawnPosition.x,
                    data.spawnPosition.y,
                    data.spawnPosition.z
                );
                character.rotation.y = data.spawnRotation.y;
            }
            
            // Initialize other players that already exist
            if (data.allPlayers) {
                data.allPlayers.forEach(player => {
                    if (player.id !== playerId) {
                        addOtherPlayer(player.id, player.position, player.rotation);
                    }
                });
            }
            
            // Initialize existing built objects
            if (data.builtObjects && typeof placeObject === 'function') {
                data.builtObjects.forEach(obj => {
                    placeObject(obj);
                });
            }
            break;

        case 'playerJoined':
            // Another player joined - they'll send their position in first update
            if (typeof addSystemMessage === 'function') {
                addSystemMessage('A player joined the game');
            }
            break;

        case 'playerUpdate':
            updateOtherPlayer(data.id, data.position, data.rotation);
            break;

        case 'playerLeft':
            removeOtherPlayer(data.id);
            if (typeof addSystemMessage === 'function') {
                addSystemMessage('A player left the game');
            }
            break;

        case 'chat':
            // Handle incoming chat message
            if (typeof addChatMessage === 'function') {
                const isOwnMessage = data.playerId === playerId;
                // Skip our own messages - we already showed them optimistically
                if (!isOwnMessage) {
                    addChatMessage(data.playerName || 'Player', data.message, false);
                }
            }
            break;

        case 'timeSync':
             // Sync time with server if message received
             if (typeof setServerTime === 'function') {
                 setServerTime(data.serverTimestamp);
             }
             break;

        case 'animalUpdate':
             // Deprecated: old client-to-client updates
             break;
             
        case 'builtObjects':
             // Handle bulk sync of built objects for current map
             if (data.objects && Array.isArray(data.objects) && typeof placeObject === 'function') {
                 data.objects.forEach(obj => {
                     placeObject(obj);
                 });
             }
             break;

        case 'playersOnMap':
             // Handle list of players on this map (when joining/switching maps)
             // First clear any existing other players (they're on a different map)
             if (typeof otherPlayers !== 'undefined') {
                 otherPlayers.forEach((player, id) => {
                     removeOtherPlayer(id);
                 });
             }
             // Add players on this map
             if (data.players && Array.isArray(data.players)) {
                 data.players.forEach(player => {
                     addOtherPlayer(player.id, player.position, player.rotation);
                 });
             }
             break;

        case 'objectBuilt':
             // Handle object built or removed by another player
             if (typeof placeObject === 'function') {
                 // For removals, always process (we didn't do it locally)
                 // For placements, skip if we're the owner (we already placed it)
                 if (data.object.action === 'remove' || data.object.ownerId !== playerId) {
                     placeObject(data.object);
                 }
             }
             break;

        case 'worldState':
             // Handle authoritative world state from server
             if (typeof handleAnimalUpdate === 'function') {
                 handleAnimalUpdate(data);
            }
            break;
    }
}

// Send player position/rotation update to server
function sendPlayerUpdate() {
    if (!isConnected || !socket || !playerId || !character) {
        return;
    }

    const now = performance.now();
    if (now - lastUpdateTime < updateThrottle) {
        return; // Throttle updates
    }
    lastUpdateTime = now;

    const position = {
        x: character.position.x,
        y: character.position.y,
        z: character.position.z
    };

    const rotation = {
        y: character.rotation.y
    };

    socket.send(JSON.stringify({
        type: 'update',
        id: playerId,
        position: position,
        rotation: rotation
    }));
}

// Call this from game loop to send updates
function updateMultiplayer() {
    if (isConnected) {
        sendPlayerUpdate();
    }
}

// Send chat message to server
function sendChatToServer(message) {
    if (!isConnected || !socket || !playerId) {
        if (typeof addSystemMessage === 'function') {
            addSystemMessage('Not connected to server - chat unavailable');
        }
        return false;
    }

    if (socket.readyState !== WebSocket.OPEN) {
        if (typeof addSystemMessage === 'function') {
            addSystemMessage('Connection not ready - please wait');
        }
        return false;
    }

    try {
        const chatData = {
            type: 'chat',
            id: playerId,
            message: message
        };
        socket.send(JSON.stringify(chatData));
        return true;
    } catch (error) {
        if (typeof addSystemMessage === 'function') {
            addSystemMessage('Error sending message');
        }
        return false;
    }
}

// Send build event to server
function sendBuildToServer(buildData) {
    if (!isConnected || !socket || !playerId) {
        return false;
    }

    try {
        const data = {
            type: 'build',
            id: playerId,
            data: buildData
        };
        socket.send(JSON.stringify(data));
        return true;
    } catch (error) {
        return false;
    }
}


// Make available globally
window.initMultiplayer = initMultiplayer;
window.sendPlayerUpdate = sendPlayerUpdate;
window.updateMultiplayer = updateMultiplayer;
window.sendChatToServer = sendChatToServer;
window.sendBuildToServer = sendBuildToServer;
