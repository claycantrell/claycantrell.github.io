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
            
            // Determine host status (simplified logic)
            // Ideally server tells us if we are host or gives us a list
            // For now, assume not host until told otherwise, OR check if we are first
            // But we don't have that info yet.
            // Let's rely on server sending 'host: true' in 'connected' message if we want to be robust
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
            
            // Set world seed for deterministic randomness
            if (data.worldSeed && typeof setWorldSeed === 'function') {
                setWorldSeed(data.worldSeed);
            }
            
            // Check if we are the host (server should ideally send this)
            // If data.isHost is present, set it
            if (data.isHost) {
                isAnimalHost = true;
                console.log("You are the animal host.");
            } else if (data.playerCount === 1) {
                // Fallback: if we are the only player, we are host
                isAnimalHost = true;
                console.log("Only player connected. You are the animal host.");
            } else {
                isAnimalHost = false;
                console.log("Joined existing game. Waiting for animal updates.");
            }
            
            // Set character spawn position from server
            if (data.spawnPosition && data.spawnRotation && character) {
                character.position.set(
                    data.spawnPosition.x,
                    data.spawnPosition.y,
                    data.spawnPosition.z
                );
                character.rotation.y = data.spawnRotation.y;
                console.log(`Spawned at (${data.spawnPosition.x}, ${data.spawnPosition.z})`);
            }
            
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
            } else {
                console.error('addChatMessage function not available');
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
        console.warn('Cannot send chat: not connected to server');
        if (typeof addSystemMessage === 'function') {
            addSystemMessage('Not connected to server - chat unavailable');
        }
        return false;
    }

    if (socket.readyState !== WebSocket.OPEN) {
        console.warn('Socket not open, readyState:', socket.readyState);
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
        console.log('Chat sent:', message);
        return true;
    } catch (error) {
        console.error('Error sending chat message:', error);
        if (typeof addSystemMessage === 'function') {
            addSystemMessage('Error sending message: ' + error.message);
        }
        return false;
    }
}

