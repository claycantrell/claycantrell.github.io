// Lightweight WebSocket server for 3D demo multiplayer
// Run with: node server/multiplayer-server.js

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const url = require('url');

// OpenAI API proxy with IP-based rate limiting
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// IP-based rate limiting
const ipRateLimits = new Map(); // IP -> { requests: [timestamps], lastCleanup: timestamp }
const RATE_LIMIT = {
    requestsPerMinute: 30,
    requestsPerHour: 200,
    cleanupInterval: 60000 // Clean up old data every minute
};

// Clean up old rate limit data periodically
setInterval(() => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    ipRateLimits.forEach((data, ip) => {
        // Remove requests older than 1 hour
        data.requests = data.requests.filter(timestamp => timestamp > oneHourAgo);
        
        // Remove IP if no recent requests
        if (data.requests.length === 0) {
            ipRateLimits.delete(ip);
        }
    });
}, RATE_LIMIT.cleanupInterval);

// Check IP rate limit
function checkIPRateLimit(ip) {
    // Bypass rate limiting for localhost (testing)
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost' || ip.startsWith('127.') || ip.startsWith('::ffff:127.')) {
        return { allowed: true, bypassed: true };
    }
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);
    
    if (!ipRateLimits.has(ip)) {
        ipRateLimits.set(ip, { requests: [] });
    }
    
    const data = ipRateLimits.get(ip);
    
    // Clean old requests
    data.requests = data.requests.filter(timestamp => timestamp > oneHourAgo);
    
    // Count requests in last minute
    const requestsLastMinute = data.requests.filter(timestamp => timestamp > oneMinuteAgo).length;
    
    // Count requests in last hour
    const requestsLastHour = data.requests.length;
    
    // Check limits
    if (requestsLastMinute >= RATE_LIMIT.requestsPerMinute) {
        const timeUntilNext = Math.ceil((data.requests[data.requests.length - requestsLastMinute] + 60000 - now) / 1000);
        return {
            allowed: false,
            reason: 'minute',
            retryAfter: timeUntilNext
        };
    }
    
    if (requestsLastHour >= RATE_LIMIT.requestsPerHour) {
        const timeUntilNext = Math.ceil((data.requests[0] + (60 * 60 * 1000) - now) / 1000 / 60);
        return {
            allowed: false,
            reason: 'hour',
            retryAfter: timeUntilNext
        };
    }
    
    // Request allowed - record it
    data.requests.push(now);
    
    return { allowed: true };
}

// Get client IP address
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           'unknown';
}

// Create HTTP server to handle API proxy and WebSocket
const server = http.createServer((req, res) => {
    // Debug logging
    console.log(`[HTTP] ${req.method} ${req.url}`);
    
    // Handle OPTIONS preflight requests FIRST (before any other logic)
    // This must handle ALL OPTIONS requests, not just /api/chat
    if (req.method === 'OPTIONS') {
        console.log('[HTTP] Handling OPTIONS preflight request');
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400' // Cache preflight for 24 hours
        });
        res.end();
        return;
    }
    
    // Handle OpenAI API proxy endpoint
    if (req.url === '/api/chat' && req.method === 'POST') {
        // Set CORS headers for API endpoint
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        const clientIP = getClientIP(req);
        
        // Check rate limit
        const rateLimitCheck = checkIPRateLimit(clientIP);
        if (!rateLimitCheck.allowed) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: {
                    message: rateLimitCheck.reason === 'minute' 
                        ? `Rate limit exceeded. Please wait ${rateLimitCheck.retryAfter} seconds.`
                        : `Hourly rate limit exceeded. Please wait ${rateLimitCheck.retryAfter} minutes.`,
                    type: 'rate_limit_error'
                }
            }));
            return;
        }
        
        // Collect request body
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                
                // Forward request to OpenAI
                const options = {
                    hostname: 'api.openai.com',
                    port: 443,
                    path: '/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    }
                };
                
                const openaiReq = https.request(options, (openaiRes) => {
                    let responseData = '';
                    
                    openaiRes.on('data', (chunk) => {
                        responseData += chunk.toString();
                    });
                    
                    openaiRes.on('end', () => {
                        res.writeHead(openaiRes.statusCode, {
                            'Content-Type': 'application/json'
                        });
                        res.end(responseData);
                    });
                });
                
                openaiReq.on('error', (error) => {
                    console.error('OpenAI API error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: {
                            message: 'Internal server error',
                            type: 'server_error'
                        }
                    }));
                });
                
                openaiReq.write(JSON.stringify(requestData));
                openaiReq.end();
                
            } catch (error) {
                console.error('Error parsing request:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: {
                        message: 'Invalid request',
                        type: 'invalid_request'
                    }
                }));
            }
        });
        
        return;
    }
    
    // For WebSocket upgrade requests, let the WebSocket server handle them
    // Check if this is a WebSocket upgrade request
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        // Let WebSocket server handle it - don't respond here
        return;
    }
    
    // Reject other HTTP requests (WebSocket-only for non-API endpoints)
    res.writeHead(426, { 
        'Upgrade': 'websocket',
        'Access-Control-Allow-Origin': '*'
    });
    res.end('This server only accepts WebSocket connections and /api/chat POST requests');
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
    // Adjust spawn height to terrain
    spawn.y = getTerrainHeightAt(spawn.x, spawn.z) + 1.0;
    return spawn;
}

// Start server
server.listen(8080, () => {
    console.log('Multiplayer server running on ws://localhost:8080');
    console.log('OpenAI API proxy available at http://localhost:8080/api/chat');
    console.log(`Maximum players: ${MAX_PLAYERS}`);
    console.log(`Spawn points: ${SPAWN_POINTS.length}`);
    if (process.env.OPENAI_API_KEY) {
        console.log('✅ Using OPENAI_API_KEY from environment variable');
    } else {
        console.warn('⚠️  WARNING: OPENAI_API_KEY not set in environment, using hardcoded key');
        console.log('   To set it: export OPENAI_API_KEY=your-key-here');
    }
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

