// Lightweight WebSocket server for 3D demo multiplayer
// Run with: node server/multiplayer-server.js

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// OpenAI API proxy with IP-based rate limiting
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// API Authentication - Generate session tokens for clients
const sessionTokens = new Map(); // token -> { ip, created, lastUsed }
const SESSION_TOKEN_LIFETIME = 3600000; // 1 hour

// Generate a secure session token
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Validate session token
function validateSessionToken(token, ip) {
    if (!token) return false;

    const session = sessionTokens.get(token);
    if (!session) return false;

    // Check if expired
    const now = Date.now();
    if (now - session.created > SESSION_TOKEN_LIFETIME) {
        sessionTokens.delete(token);
        return false;
    }

    // Update last used
    session.lastUsed = now;
    return true;
}

// Clean up expired tokens periodically
setInterval(() => {
    const now = Date.now();
    sessionTokens.forEach((session, token) => {
        if (now - session.created > SESSION_TOKEN_LIFETIME) {
            sessionTokens.delete(token);
        }
    });
}, 300000); // Every 5 minutes

// IP-based rate limiting
const ipRateLimits = new Map(); // IP -> { requests: [timestamps], lastCleanup: timestamp }
const RATE_LIMIT = {
    requestsPerMinute: 30,
    requestsPerHour: 200,
    cleanupInterval: 60000 // Clean up old data every minute
};

// Static file serving
function serveStaticFile(req, res) {
    // Get the file path from the URL, stripping query parameters
    let filePath = req.url.split('?')[0];

    // Default to game index for root requests
    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }

    // Normalize: strip leading slashes so path.join stays within project root
    // e.g. "/pages/home.html" -> "pages/home.html"
    filePath = filePath.replace(/^\/+/, '');

    // Remove leading slash and construct full path
    // Since we're in server/ directory, go up one level to find static files
    const fullPath = path.join(__dirname, '..', filePath);

    // Check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        // Get file extension for content type
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        }[ext] || 'text/plain';

        // Read and serve the file
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Server error');
                return;
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
}

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
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
            'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
            'Access-Control-Max-Age': '86400' // Cache preflight for 24 hours
        });
        res.end();
        return;
    }
    
    // Serve static files for GET requests
    if (req.method === 'GET') {
        // API endpoint to get session token (required for chat API)
        if (req.url === '/api/token') {
            const clientIP = getClientIP(req);
            const token = generateSessionToken();
            const now = Date.now();

            // Store token with IP binding
            sessionTokens.set(token, {
                ip: clientIP,
                created: now,
                lastUsed: now
            });

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ token }));
            return;
        }

        serveStaticFile(req, res);
        return;
    }

    // Handle OpenAI API proxy endpoint
    if (req.url === '/api/chat' && req.method === 'POST') {
        // Set CORS headers for API endpoint
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Token');
        const clientIP = getClientIP(req);

        // Validate session token (required for API access)
        const sessionToken = req.headers['x-session-token'];
        if (!validateSessionToken(sessionToken, clientIP)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: {
                    message: 'Invalid or missing session token. Please refresh the page.',
                    type: 'auth_error'
                }
            }));
            return;
        }

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

        // Check if API key is available
        if (!OPENAI_API_KEY) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: {
                    message: 'Chat features are currently disabled. Please contact the administrator to enable OpenAI integration.',
                    type: 'chat_disabled'
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
    
    // Reject other HTTP methods (only GET, POST for API, and WebSocket upgrades allowed)
    res.writeHead(405, {
        'Allow': 'GET, POST',
        'Access-Control-Allow-Origin': '*'
    });
    res.end('Method not allowed. Use GET for static files or POST for /api/chat');
});

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ 
    server: server,
    path: '/' // Accept connections on root path
});

const players = new Map(); // id -> {position, rotation, lastUpdate}
const MAX_PLAYERS = 20; // Maximum players (safety limit, easily supports 10)

// --- Server-Authoritative Entity State ---
const ENTITIES = {
    deer: [],
    cows: [],
    bunnies: [],
    birds: [],
    npc: {
        id: 'scribe',
        x: 10, z: 10,
        targetX: 10, targetZ: 10,
        state: 'IDLE',
        timer: 0
    },
    builtObjects: {} // Map of mapId -> Array of { id, type, x, y, z, rx, ry, rz, color }
};

// Seeded Random Helper
let currentSeed = 12345;
function seededRandom() {
    const a = 1103515245;
    const c = 12345;
    const m = 2**31;
    currentSeed = (a * currentSeed + c) % m;
    return currentSeed / m;
}

// Simple water check - mirrors client-side logic
// Water exists where continentalness is very low (coastal/ocean areas)
const SEA_LEVEL = -5;

// Simple 2D noise for server-side checks (doesn't need to match client exactly)
function simpleNoise2D(x, z, scale, seed) {
    const nx = x * scale + seed;
    const nz = z * scale + seed * 1.5;
    return Math.sin(nx * 1.27 + nz * 0.83) * Math.cos(nz * 1.13 + nx * 0.97);
}

// Check if position is likely in water (approximate)
function isWaterPosition(x, z) {
    // Check continentalness - low values = coastal/ocean = water
    const continentalness = simpleNoise2D(x, z, 0.0003, 1000);
    if (continentalness < -0.4) {
        return true; // Coastal/ocean area
    }
    return false;
}

// Get valid land position (retries if in water)
function getValidLandPosition(minDist, maxDist, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        const angle = seededRandom() * Math.PI * 2;
        const dist = minDist + seededRandom() * (maxDist - minDist);
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        if (!isWaterPosition(x, z)) {
            return { x, z };
        }
    }
    // Fallback to last position even if water
    const angle = seededRandom() * Math.PI * 2;
    const dist = minDist + seededRandom() * (maxDist - minDist);
    return { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist };
}

// Initialize Entities
function initServerEntities() {
    console.log("Initializing server-side entities...");

    // Deer - spawn on land only
    for (let i = 0; i < 18; i++) {
        const pos = getValidLandPosition(60, 360);
        ENTITIES.deer.push({
            id: `deer_${i}`,
            x: pos.x,
            z: pos.z,
            state: 'IDLE',
            timer: seededRandom() * 5,
            targetDir: { x: 0, z: 1 },
            speed: 0
        });
    }

    // Cows - spawn on land, prefer open areas (grassland)
    for (let i = 0; i < 12; i++) {
        const pos = getValidLandPosition(50, 350);
        ENTITIES.cows.push({
            id: `cow_${i}`,
            x: pos.x,
            z: pos.z,
            state: 'IDLE',
            timer: seededRandom() * 5,
            targetDir: { x: 0, z: 1 },
            speed: 0
        });
    }

    // Bunnies - spawn on land only
    for (let i = 0; i < 20; i++) {
        const pos = getValidLandPosition(40, 340);
        ENTITIES.bunnies.push({
            id: `bunny_${i}`,
            x: pos.x,
            z: pos.z,
            state: 'IDLE',
            timer: seededRandom() * 5,
            targetDir: { x: 0, z: 1 },
            speed: 0,
            hopVelocityY: 0
        });
    }

    // Birds - can fly over water, no check needed
    for (let i = 0; i < 30; i++) {
        const angle = seededRandom() * Math.PI * 2;
        const dist = seededRandom() * 300;
        ENTITIES.birds.push({
            id: `bird_${i}`,
            x: Math.cos(angle) * dist,
            z: Math.sin(angle) * dist,
            y: 20,
            state: 'FLYING',
            timer: seededRandom() * 5,
            targetPos: { x: 0, y: 30, z: 0 },
            speed: 8 + seededRandom() * 4
        });
    }

    console.log(`Initialized ${ENTITIES.deer.length} deer, ${ENTITIES.cows.length} cows, ${ENTITIES.bunnies.length} bunnies, ${ENTITIES.birds.length} birds.`);
}

initServerEntities();

// Server Game Loop (20 TPS)
setInterval(() => {
    const delta = 0.05; // 50ms
    
    // Update Deer
    ENTITIES.deer.forEach(deer => {
        deer.timer -= delta;
        
        // Check for player threats
        let isThreat = false;
        let fleeSource = null;
        let nearestDist = Infinity;

        players.forEach(player => {
            const dx = deer.x - player.position.x;
            const dz = deer.z - player.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < nearestDist) {
                nearestDist = dist;
                if (dist < 35) { // 35 unit detection range
                     // Assume moving if position changed recently (simple heuristic)
                     isThreat = true;
                     fleeSource = player.position;
                }
            }
        });

        // Flee State overrides everything
        if (isThreat) {
            deer.state = 'RUN';
            deer.timer = 2.0; 
        }

        if (deer.state === 'RUN') {
             // ... existing run logic ...
             deer.speed = 18.0;
             if (fleeSource) {
                 // Vector away from player
                 const dx = deer.x - fleeSource.x;
                 const dz = deer.z - fleeSource.z;
                 const len = Math.sqrt(dx*dx + dz*dz);
                 if (len > 0) {
                     deer.targetDir.x = dx / len;
                     deer.targetDir.z = dz / len;
                 }
             }
             
             const newX = deer.x + deer.targetDir.x * deer.speed * delta;
             const newZ = deer.z + deer.targetDir.z * deer.speed * delta;
             // Only move if not going into water
             if (!isWaterPosition(newX, newZ)) {
                 deer.x = newX;
                 deer.z = newZ;
             } else {
                 // Turn around if hitting water
                 deer.targetDir.x = -deer.targetDir.x;
                 deer.targetDir.z = -deer.targetDir.z;
             }

             if (nearestDist > 60 && deer.timer <= 0) {
                 deer.state = 'IDLE';
                 deer.timer = 2;
             }
        }
        else if (deer.state === 'IDLE') {
            if (deer.timer <= 0) {
                if (Math.random() < 0.3) {
                    deer.state = 'GRAZE';
                    deer.timer = 3 + Math.random() * 4;
                } else {
                    deer.state = 'WALK';
                    deer.timer = 4 + Math.random() * 6;
                    const angle = Math.random() * Math.PI * 2;
                    deer.targetDir = { x: Math.cos(angle), z: Math.sin(angle) };
                }
            }
        } else if (deer.state === 'WALK') {
            const newX = deer.x + deer.targetDir.x * 3.5 * delta;
            const newZ = deer.z + deer.targetDir.z * 3.5 * delta;
            if (!isWaterPosition(newX, newZ)) {
                deer.x = newX;
                deer.z = newZ;
            } else {
                deer.targetDir.x = -deer.targetDir.x;
                deer.targetDir.z = -deer.targetDir.z;
            }
            if (deer.timer <= 0) {
                deer.state = 'IDLE';
                deer.timer = 2 + Math.random() * 3;
            }
        } else if (deer.state === 'GRAZE') {
            if (deer.timer <= 0) {
                deer.state = 'IDLE';
                deer.timer = 1 + Math.random();
            }
        }
    });

    // Update Cows (docile, slow, mostly graze)
    ENTITIES.cows.forEach(cow => {
        cow.timer -= delta;

        // Threat check - cows only flee when player is VERY close
        let isThreat = false;
        let fleeSource = null;
        players.forEach(player => {
            const dx = cow.x - player.position.x;
            const dz = cow.z - player.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 5) { // Only 5 units - very close
                isThreat = true;
                fleeSource = player.position;
            }
        });

        if (isThreat && cow.state !== 'WALK') {
            // Trot away slowly (cows don't run)
            cow.state = 'WALK';
            cow.timer = 2.0;
            if (fleeSource) {
                const dx = cow.x - fleeSource.x;
                const dz = cow.z - fleeSource.z;
                const len = Math.sqrt(dx * dx + dz * dz);
                if (len > 0) {
                    cow.targetDir.x = dx / len;
                    cow.targetDir.z = dz / len;
                }
            }
        } else if (cow.state === 'IDLE') {
            if (cow.timer <= 0) {
                const action = Math.random();
                if (action < 0.4) {
                    cow.state = 'GRAZE';
                    cow.timer = 4 + Math.random() * 5;
                } else if (action < 0.7) {
                    cow.state = 'WALK';
                    cow.timer = 3 + Math.random() * 4;
                    const angle = Math.random() * Math.PI * 2;
                    cow.targetDir = { x: Math.cos(angle), z: Math.sin(angle) };
                } else {
                    cow.timer = 2 + Math.random() * 3;
                }
            }
        } else if (cow.state === 'WALK') {
            // Slow movement (speed 3)
            const newX = cow.x + cow.targetDir.x * 3.0 * delta;
            const newZ = cow.z + cow.targetDir.z * 3.0 * delta;
            if (!isWaterPosition(newX, newZ)) {
                cow.x = newX;
                cow.z = newZ;
            } else {
                cow.targetDir.x = -cow.targetDir.x;
                cow.targetDir.z = -cow.targetDir.z;
            }
            if (cow.timer <= 0) {
                cow.state = 'IDLE';
                cow.timer = 1 + Math.random() * 2;
            }
        } else if (cow.state === 'GRAZE') {
            if (cow.timer <= 0) {
                cow.state = 'IDLE';
                cow.timer = 1 + Math.random();
            }
        }
    });

    // Update Bunnies
    ENTITIES.bunnies.forEach(bunny => {
        bunny.timer -= delta;
        
        // Threat Check
        let isThreat = false;
        let fleeSource = null;
        players.forEach(player => {
            const dx = bunny.x - player.position.x;
            const dz = bunny.z - player.position.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            if (dist < 60) { // Large detection radius
                isThreat = true;
                fleeSource = player.position;
            }
        });

        if (bunny.state === 'IDLE') {
            if (bunny.timer <= 0 || isThreat) {
                bunny.state = 'HOP';
                bunny.timer = isThreat ? 0.2 : 0.5; // Fast hop if fleeing
                
                if (isThreat && fleeSource) {
                     // Hop away
                     const dx = bunny.x - fleeSource.x;
                     const dz = bunny.z - fleeSource.z;
                     const len = Math.sqrt(dx*dx + dz*dz);
                     if (len > 0) {
                         // Add some jitter so they don't run in straight lines
                         bunny.targetDir.x = (dx / len) + (Math.random() - 0.5);
                         bunny.targetDir.z = (dz / len) + (Math.random() - 0.5);
                     }
                } else {
                    const angle = (Math.random() - 0.5) * Math.PI;
                    bunny.targetDir = { 
                        x: Math.cos(angle) * bunny.targetDir.x - Math.sin(angle) * bunny.targetDir.z,
                        z: Math.sin(angle) * bunny.targetDir.x + Math.cos(angle) * bunny.targetDir.z
                    };
                }
            }
        } else if (bunny.state === 'HOP') {
            const speed = isThreat ? 15.0 : 4.0;
            const newX = bunny.x + bunny.targetDir.x * speed * delta;
            const newZ = bunny.z + bunny.targetDir.z * speed * delta;

            // Only move if not going into water
            if (!isWaterPosition(newX, newZ)) {
                bunny.x = newX;
                bunny.z = newZ;
            } else {
                // Turn around if hitting water
                bunny.targetDir.x = -bunny.targetDir.x;
                bunny.targetDir.z = -bunny.targetDir.z;
            }

            if (bunny.timer <= 0) {
                bunny.state = 'IDLE';
                bunny.timer = isThreat ? 0.1 : (1 + Math.random() * 3);
            }
        }
    });
    
    // Update Birds
    ENTITIES.birds.forEach(bird => {
        // ... (bird logic)
        const speed = bird.speed * delta;
        const dx = bird.targetPos.x - bird.x;
        const dz = bird.targetPos.z - bird.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist > 1) {
            bird.x += (dx / dist) * speed;
            bird.z += (dz / dist) * speed;
        } else {
            const angle = Math.random() * Math.PI * 2;
            const d = Math.random() * 300;
            bird.targetPos.x = Math.cos(angle) * d;
            bird.targetPos.z = Math.sin(angle) * d;
        }
    });

    // Update NPC (Scribe)
    const npc = ENTITIES.npc;
    
    // Check nearest player for "Staring" state
    let nearestPlayerDist = Infinity;
    let nearestPlayerPos = null;
    
    players.forEach(player => {
        const dx = npc.x - player.position.x;
        const dz = npc.z - player.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < nearestPlayerDist) {
            nearestPlayerDist = dist;
            nearestPlayerPos = player.position;
        }
    });

    if (npc.state === 'IDLE') { // Using IDLE as 'wandering'
        // Stare if player is close
        if (nearestPlayerDist < 15.0) {
            npc.state = 'STARING';
        } else {
            // Wander logic
            if (!npc.targetX || !npc.targetZ) {
                // Pick initial target
                const angle = Math.random() * Math.PI * 2;
                const d = Math.random() * 50 + 10;
                npc.targetX = Math.cos(angle) * d;
                npc.targetZ = Math.sin(angle) * d;
            }

            const dx = npc.targetX - npc.x;
            const dz = npc.targetZ - npc.z;
            const dist = Math.sqrt(dx*dx + dz*dz);
            
            if (dist < 2.0) {
                // Pick new target
                const angle = Math.random() * Math.PI * 2;
                const d = Math.random() * 50 + 10; // Stay relatively central
                npc.targetX = Math.cos(angle) * d;
                npc.targetZ = Math.sin(angle) * d;
            } else {
                // Move
                const speed = 5.0; // Walk speed
                const dirX = dx / dist;
                const dirZ = dz / dist;
                npc.x += dirX * speed * delta;
                npc.z += dirZ * speed * delta;
                
                // Face target
                // Note: The client uses 'ry' from server, so we must calculate it here
                // However, the current snapshot logic for NPC doesn't send 'ry' explicitly derived from movement
                // We need to update the snapshot logic below to include ry or update ENTITIES.npc property
                // For simplicity, let's assume client calculates rotation from position delta if needed,
                // BUT the snapshot sends `ry: parseFloat(npc.rotation.y.toFixed(2))` from CLIENT originally.
                // Now server must send it.
                // Let's add an 'ry' property to npc entity
                if (!npc.ry) npc.ry = 0;
                npc.ry = Math.atan2(dirX, dirZ);
            }
        }
    } else if (npc.state === 'STARING') {
        if (nearestPlayerDist > 20.0) {
            npc.state = 'IDLE'; // Resume wandering
        } else {
            // Face player
            if (nearestPlayerPos) {
                 const dx = nearestPlayerPos.x - npc.x;
                 const dz = nearestPlayerPos.z - npc.z;
                 npc.ry = Math.atan2(dx, dz);
            }
        }
    }

    // Broadcast Snapshot
    const snapshot = {
        type: 'worldState',
        deer: ENTITIES.deer.map(d => ({ id: d.id, x: d.x, z: d.z, state: d.state, ry: Math.atan2(d.targetDir.x, d.targetDir.z) })),
        cows: ENTITIES.cows.map(c => ({ id: c.id, x: c.x, z: c.z, state: c.state, ry: Math.atan2(c.targetDir.x, c.targetDir.z) })),
        bunnies: ENTITIES.bunnies.map(b => ({ id: b.id, x: b.x, z: b.z, state: b.state })),
        birds: ENTITIES.birds.map(b => ({ id: b.id, x: b.x, z: b.z, y: b.y, state: b.state })),
        npc: { 
            x: npc.x, 
            z: npc.z, 
            ry: npc.ry || 0, // Send rotation
            state: npc.state === 'STARING' ? 'staring' : 'wandering' // Map back to client expected strings
        } 
    };
    
    broadcastToAll(snapshot);

}, 50); // 20 times per second


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
    // Adjust spawn height to terrain - Server doesn't know terrain, so spawn high and let client physics handle it
    spawn.y = 30.0; 
    return spawn;
}

// Start server
server.listen(8080, () => {
    // Show appropriate URLs based on environment
    const isProduction = !!process.env.RENDER_EXTERNAL_URL;
    const baseUrl = isProduction
        ? `https://${process.env.RENDER_EXTERNAL_URL.replace('https://', '')}`
        : 'http://localhost:8080';

    console.log(`Server running on ${baseUrl}`);
    console.log(`WebSocket multiplayer: ${baseUrl.replace('http', 'ws')}`);
    console.log(`OpenAI API proxy: ${baseUrl}/api/chat`);
    console.log(`Static files served from: ${baseUrl}`);
    console.log(`Maximum players: ${MAX_PLAYERS}`);
    console.log(`Spawn points: ${SPAWN_POINTS.length}`);
    if (process.env.OPENAI_API_KEY) {
        console.log('✅ Using OPENAI_API_KEY from environment variable');
    } else {
        console.log('⚠️  No OPENAI_API_KEY set - chat features will be disabled');
        console.log('   To enable chat: export OPENAI_API_KEY=your-key-here');
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
    ws.playerId = playerId; // Store on websocket for map filtering

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
    
    // Store player with initial position and map
    players.set(playerId, {
        position: initialPosition,
        rotation: initialRotation,
        lastUpdate: Date.now(),
        mapId: 'grasslands' // Default, updated when client sends setMap
    });
    
    console.log(`Player connected: ${playerId} (${players.size}/${MAX_PLAYERS}) at (${spawnPoint.x}, ${spawnPoint.z})`);

    // Send player their ID, spawn position, and all existing players
    ws.send(JSON.stringify({
        type: 'connected',
        id: playerId,
        spawnPosition: initialPosition,
        spawnRotation: initialRotation,
        playerCount: players.size, // Let client know how many players
        isHost: false, // DEPRECATED: Server is now host
        worldSeed: 123456, // Shared seed for deterministic randomness
        builtObjects: [], // Will be sent after client sends setMap with their mapId
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

    // Broadcast time sync periodically
    // Note: we now start this globally at server start
    // if (players.size === 1) { ... } 

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'setMap') {
                // Player is telling us which map they're on
                const newMapId = data.mapId || 'grasslands';
                const player = players.get(playerId);
                const oldMapId = player ? player.mapId : null;

                // Update player's map
                if (player) {
                    player.mapId = newMapId;
                    players.set(playerId, player);
                }

                // If changing maps, notify old map that player left
                if (oldMapId && oldMapId !== newMapId) {
                    broadcastToSameMap(ws, oldMapId, {
                        type: 'playerLeft',
                        id: playerId
                    });
                }

                // Initialize map's build array if needed
                if (!ENTITIES.builtObjects[newMapId]) {
                    ENTITIES.builtObjects[newMapId] = [];
                }

                // Send existing built objects for this map
                ws.send(JSON.stringify({
                    type: 'builtObjects',
                    objects: ENTITIES.builtObjects[newMapId] || []
                }));

                // Send list of players already on this map
                const playersOnMap = [];
                players.forEach((pdata, pid) => {
                    if (pid !== playerId && pdata.mapId === newMapId) {
                        playersOnMap.push({
                            id: pid,
                            position: pdata.position,
                            rotation: pdata.rotation
                        });
                    }
                });

                if (playersOnMap.length > 0) {
                    ws.send(JSON.stringify({
                        type: 'playersOnMap',
                        players: playersOnMap
                    }));
                }

                console.log(`Player ${playerId} joined map: ${newMapId}`);
            }
            else if (data.type === 'update') {
                // ... existing update logic ...
                const player = players.get(playerId);
                const mapId = player ? player.mapId : 'grasslands';
                players.set(playerId, {
                    position: data.position,
                    rotation: data.rotation,
                    lastUpdate: Date.now(),
                    mapId: mapId
                });

                // Broadcast to players on the same map only
                broadcastToSameMap(ws, mapId, {
                    type: 'playerUpdate',
                    id: playerId,
                    position: data.position,
                    rotation: data.rotation
                });
            } 
            else if (data.type === 'chat') {
                // ... existing chat logic ...
                const playerName = `Player ${playerId.substr(7, 6)}`;
                
                const chatMessage = {
                    type: 'chat',
                    playerId: playerId,
                    playerName: playerName,
                    message: data.message
                };
                
                // Broadcast to ALL clients (including sender to confirm receipt)
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(chatMessage));
                    }
                });
            }
            else if (data.type === 'build') {
                // Handle build events (place or remove)
                const buildData = data.data;
                const player = players.get(playerId);
                const mapId = player ? player.mapId : 'grasslands';

                // Initialize map's build array if needed
                if (!ENTITIES.builtObjects[mapId]) {
                    ENTITIES.builtObjects[mapId] = [];
                }

                if (buildData.action === 'remove') {
                    // Remove block at position
                    const removeX = buildData.x;
                    const removeY = buildData.y;
                    const removeZ = buildData.z;

                    // Find and remove matching object
                    const idx = ENTITIES.builtObjects[mapId].findIndex(obj =>
                        obj.x === removeX && obj.y === removeY && obj.z === removeZ
                    );

                    if (idx !== -1) {
                        ENTITIES.builtObjects[mapId].splice(idx, 1);
                    }

                    // Broadcast removal to players on same map
                    broadcastToSameMap(null, mapId, {
                        type: 'objectBuilt',
                        object: {
                            action: 'remove',
                            x: removeX,
                            y: removeY,
                            z: removeZ
                        }
                    });
                } else {
                    // Place block
                    const objectId = `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const newObject = {
                        id: objectId,
                        type: buildData.type,
                        x: buildData.x,
                        y: buildData.y,
                        z: buildData.z,
                        color: buildData.color,
                        ownerId: playerId,
                        mapId: mapId
                    };

                    // Store in map-specific array
                    ENTITIES.builtObjects[mapId].push(newObject);

                    // Limit total objects per map to prevent server crash
                    if (ENTITIES.builtObjects[mapId].length > 500) {
                        ENTITIES.builtObjects[mapId].shift(); // Remove oldest
                    }

                    // Broadcast to players on same map (excluding sender, they already placed it)
                    broadcastToSameMap(ws, mapId, {
                        type: 'objectBuilt',
                        object: newObject
                    });
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);

        // Get player's map before deleting
        const player = players.get(playerId);
        const mapId = player ? player.mapId : 'grasslands';

        players.delete(playerId);

        // Broadcast player left to players on same map only
        broadcastToSameMap(ws, mapId, {
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

// Broadcast to other players on the same map only
function broadcastToSameMap(sender, senderMapId, message) {
    wss.clients.forEach((client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            // Check if this client is on the same map
            const clientPlayerId = client.playerId;
            if (clientPlayerId) {
                const clientData = players.get(clientPlayerId);
                if (clientData && clientData.mapId === senderMapId) {
                    client.send(JSON.stringify(message));
                }
            }
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

// Time Sync Loop
let timeSyncInterval = null;
function startTimeSync() {
    if (timeSyncInterval) return;
    
    // Immediate broadcast
    broadcastToAll({
        type: 'timeSync',
        serverTimestamp: Date.now()
    });

    timeSyncInterval = setInterval(() => {
        broadcastToAll({
            type: 'timeSync',
            serverTimestamp: Date.now()
        });
    }, 10000); // Sync every 10 seconds
}

// Start time sync immediately on server start
startTimeSync();

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
