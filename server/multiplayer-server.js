// Lightweight WebSocket server for 3D demo multiplayer
// Run with: node server/multiplayer-server.js

const WebSocket = require('ws');
const http = require('http');

// Create HTTP server to handle non-WebSocket requests
const server = http.createServer((req, res) => {
    // Reject HTTP requests - this is a WebSocket-only server
    res.writeHead(426, { 'Upgrade': 'websocket' });
    res.end('This server only accepts WebSocket connections');
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ 
    server: server,
    path: '/' // Accept connections on root path
});

const players = new Map(); // id -> {position, rotation, lastUpdate}
const MAX_PLAYERS = 20; // Maximum players (safety limit, easily supports 10)

// Spawn points - spread players around the map in a circle
const SPAWN_POINTS = [
    { x: -50, z: -50, rotation: Math.PI / 4 },      // Southwest
    { x: 50, z: -50, rotation: 3 * Math.PI / 4 },   // Southeast
    { x: 50, z: 50, rotation: -3 * Math.PI / 4 },   // Northeast
    { x: -50, z: 50, rotation: -Math.PI / 4 },      // Northwest
    { x: 0, z: -70, rotation: Math.PI / 2 },        // South
    { x: 70, z: 0, rotation: Math.PI },             // East
    { x: 0, z: 70, rotation: -Math.PI / 2 },        // North
    { x: -70, z: 0, rotation: 0 },                  // West
    { x: -30, z: -30, rotation: Math.PI / 4 },     // Inner SW
    { x: 30, z: -30, rotation: 3 * Math.PI / 4 },  // Inner SE
    { x: 30, z: 30, rotation: -3 * Math.PI / 4 },   // Inner NE
    { x: -30, z: 30, rotation: -Math.PI / 4 },     // Inner NW
    { x: -80, z: -80, rotation: Math.PI / 4 },     // Outer SW
    { x: 80, z: -80, rotation: 3 * Math.PI / 4 },  // Outer SE
    { x: 80, z: 80, rotation: -3 * Math.PI / 4 },  // Outer NE
    { x: -80, z: 80, rotation: -Math.PI / 4 },     // Outer NW
    { x: 0, z: -50, rotation: Math.PI / 2 },       // Mid South
    { x: 50, z: 0, rotation: Math.PI },             // Mid East
    { x: 0, z: 50, rotation: -Math.PI / 2 },        // Mid North
    { x: -50, z: 0, rotation: 0 }                    // Mid West
];

let nextSpawnIndex = 0; // Round-robin spawn point assignment

// Get next spawn point
function getNextSpawnPoint() {
    const spawn = SPAWN_POINTS[nextSpawnIndex % SPAWN_POINTS.length];
    nextSpawnIndex++;
    return spawn;
}

// Start server
server.listen(8080, () => {
    console.log('Multiplayer server running on ws://localhost:8080');
    console.log(`Maximum players: ${MAX_PLAYERS}`);
    console.log(`Spawn points: ${SPAWN_POINTS.length}`);
});

wss.on('connection', (ws) => {
    // Check player limit
    if (players.size >= MAX_PLAYERS) {
        console.log(`Player limit reached (${MAX_PLAYERS}), rejecting connection`);
        ws.close(1008, 'Server at capacity');
        return;
    }
    
    // Generate unique player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get spawn point for new player
    const spawnPoint = getNextSpawnPoint();
    const initialPosition = {
        x: spawnPoint.x,
        y: 1, // Character height
        z: spawnPoint.z
    };
    const initialRotation = {
        y: spawnPoint.rotation
    };
    
    // Store player with initial position
    players.set(playerId, {
        position: initialPosition,
        rotation: initialRotation,
        lastUpdate: Date.now()
    });
    
    console.log(`Player connected: ${playerId} (${players.size}/${MAX_PLAYERS}) at (${spawnPoint.x}, ${spawnPoint.z})`);

    // Send player their ID, spawn position, and all existing players
    ws.send(JSON.stringify({
        type: 'connected',
        id: playerId,
        spawnPosition: initialPosition,
        spawnRotation: initialRotation,
        allPlayers: Array.from(players.entries()).map(([id, data]) => ({
            id,
            position: data.position,
            rotation: data.rotation
        }))
    }));

    // Broadcast new player to all others
    broadcastToOthers(ws, {
        type: 'playerJoined',
        id: playerId
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'update') {
                // Update player data
                players.set(playerId, {
                    position: data.position,
                    rotation: data.rotation,
                    lastUpdate: Date.now()
                });

                // Broadcast to all other players
                broadcastToOthers(ws, {
                    type: 'playerUpdate',
                    id: playerId,
                    position: data.position,
                    rotation: data.rotation
                });
            } else if (data.type === 'chat') {
                // Broadcast chat message to all players (including sender)
                const playerName = `Player ${playerId.substr(7, 6)}`; // Shortened ID for display
                
                const chatMessage = {
                    type: 'chat',
                    playerId: playerId,
                    playerName: playerName,
                    message: data.message
                };
                
                // Count clients before broadcast
                let clientCount = 0;
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        clientCount++;
                    }
                });
                
                // Broadcast to all clients
                let sentCount = 0;
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        try {
                            client.send(JSON.stringify(chatMessage));
                            sentCount++;
                        } catch (error) {
                            console.error(`Error sending chat to client:`, error);
                        }
                    }
                });
                
                console.log(`💬 Chat from ${playerName}: "${data.message}" → ${sentCount}/${clientCount} clients`);
            }
        } catch (error) {
            console.error('Error parsing message from', playerId, ':', error, 'Raw message:', message.toString());
        }
    });

    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);
        players.delete(playerId);

        // Broadcast player left to all others
        broadcastToOthers(ws, {
            type: 'playerLeft',
            id: playerId
        });
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${playerId}:`, error);
    });
});

function broadcastToOthers(sender, message) {
    wss.clients.forEach((client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function broadcastToAll(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Cleanup disconnected players (safety check)
setInterval(() => {
    const now = Date.now();
    const timeout = 30000; // 30 seconds
    players.forEach((data, id) => {
        if (now - data.lastUpdate > timeout) {
            console.log(`Removing stale player: ${id}`);
            players.delete(id);
        }
    });
}, 10000); // Check every 10 seconds

