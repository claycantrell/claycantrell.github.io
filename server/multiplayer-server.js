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

// Start server
server.listen(8080, () => {
    console.log('Multiplayer server running on ws://localhost:8080');
});

wss.on('connection', (ws) => {
    // Generate unique player ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Player connected: ${playerId}`);

    // Send player their ID and all existing players
    ws.send(JSON.stringify({
        type: 'connected',
        id: playerId,
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
            }
        } catch (error) {
            console.error('Error parsing message:', error);
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

