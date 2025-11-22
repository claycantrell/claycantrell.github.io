// Multiplayer client - handles WebSocket connection and player updates

let socket = null;
let playerId = null;
let isConnected = false;
let updateThrottle = 66; // Send updates every ~66ms (15fps)
let lastUpdateTime = 0;
let reconnectAttempts = 0;
let lastErrorTime = 0;

// Initialize multiplayer connection
function initMultiplayer(serverUrl = 'ws://localhost:8080') {
    try {
        // Close existing connection if any
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            socket.close();
        }

        // Remove trailing slash if present
        serverUrl = serverUrl.replace(/\/$/, '');
        
        socket = new WebSocket(serverUrl);

        socket.onopen = () => {
            console.log('✅ Connected to multiplayer server');
            isConnected = true;
            reconnectAttempts = 0;
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        };

        socket.onclose = () => {
            if (isConnected) {
                console.log('Disconnected from multiplayer server');
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
                // After 10 failed attempts, give up and log once
                const now = Date.now();
                if (now - lastErrorTime > 30000) { // Only log every 30 seconds
                    console.warn('⚠️ Multiplayer server unavailable. Playing in single-player mode.');
                    lastErrorTime = now;
                }
            }
        };

        socket.onerror = (error) => {
            // Only log error once per 10 seconds to avoid spam
            const now = Date.now();
            if (now - lastErrorTime > 10000) {
                console.warn('⚠️ Multiplayer server not available. Playing in single-player mode.');
                lastErrorTime = now;
            }
            isConnected = false;
        };
    } catch (error) {
        // Only log once
        const now = Date.now();
        if (now - lastErrorTime > 10000) {
            console.warn('⚠️ Multiplayer not available:', error.message);
            lastErrorTime = now;
        }
        // Continue without multiplayer - game still works
    }
}

// Handle messages from server
function handleServerMessage(data) {
    switch (data.type) {
        case 'connected':
            playerId = data.id;
            // Initialize other players that already exist
            if (data.allPlayers) {
                data.allPlayers.forEach(player => {
                    if (player.id !== playerId) {
                        addOtherPlayer(player.id, player.position, player.rotation);
                    }
                });
            }
            break;

        case 'playerJoined':
            // Another player joined - they'll send their position in first update
            break;

        case 'playerUpdate':
            updateOtherPlayer(data.id, data.position, data.rotation);
            break;

        case 'playerLeft':
            removeOtherPlayer(data.id);
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

