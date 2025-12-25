// Cave generation system - Perlin Worm method (like Minecraft)
// Worms snake through terrain carving connected tunnels
// Only ENTRANCES appear on surface where worms intersect terrain height

let wormNoise = null;
let wormNoise2 = null;

// Worm configuration
const WORM_CONFIG = {
    chunkSpawnChance: 0.4,      // 40% of chunks spawn a worm origin
    maxWormsPerChunk: 3,        // Max worms that can start in one chunk
    wormLength: 150,            // Segments per worm
    segmentLength: 10,          // Distance between segments (wider spacing)
    baseRadius: 15,             // LARGE tunnel radius
    radiusVariation: 8,         // Varies 7-23 units wide
    branchChance: 0.06,         // Chance to branch per segment
    maxBranches: 4,             // Max branches per worm
    checkRadius: 6,             // Check worms from chunks within this radius
    minDepth: -60,              // Deepest caves go
    maxDepth: 5,                // Worms can reach above surface level
    verticalBias: 0.5,          // Vertical movement allowed
    surfaceGate: {
        yStart: 15,
        yFull: 30,
        entranceThreshold: 1.0
    }
};

// Simple hash function for chunk coordinates
function hashChunk(cx, cz) {
    let h = cx * 374761393 + cz * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return h ^ (h >> 16);
}

// Seeded random from hash
function seededRandom(seed) {
    let s = seed;
    return function() {
        s = Math.imul(s ^ (s >>> 16), 2246822507);
        s = Math.imul(s ^ (s >>> 13), 3266489909);
        return ((s ^= s >>> 16) >>> 0) / 4294967296;
    };
}

function initCaveSystem(seed) {
    wormNoise = new SimplexNoise(seed + '_worm1');
    wormNoise2 = new SimplexNoise(seed + '_worm2');
}

// Height gate function - reduces cave probability near surface
// Returns 0 near surface, 1 deep underground
function heightGate(y) {
    const { yStart, yFull } = WORM_CONFIG.surfaceGate;
    if (y >= yFull) return 0;
    if (y <= yStart) return 1;
    return (yFull - y) / (yFull - yStart);
}

// Clamp utility
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// Get worm origins for a specific chunk (deterministic based on coordinates)
function getChunkWormOrigins(cx, cz, chunkSize) {
    const hash = hashChunk(cx, cz);
    const rng = seededRandom(hash);

    const worms = [];

    // Check if this chunk spawns worms
    if (rng() < WORM_CONFIG.chunkSpawnChance) {
        const count = Math.floor(rng() * WORM_CONFIG.maxWormsPerChunk) + 1;

        for (let i = 0; i < count; i++) {
            // Start worms at varied depths, some near surface
            // 30% chance to start near surface for easier entrance creation
            const nearSurface = rng() < 0.3;
            const startY = nearSurface
                ? -5 - rng() * 15  // -5 to -20 (near surface)
                : -20 - rng() * 30; // -20 to -50 (deeper)

            worms.push({
                x: cx * chunkSize + rng() * chunkSize,
                y: startY,
                z: cz * chunkSize + rng() * chunkSize,
                seed: hash + i * 12345
            });
        }
    }

    return worms;
}

// Trace a worm's path through 3D space
// Returns array of {x, y, z, radius} segments
function traceWorm(origin, maxLength = WORM_CONFIG.wormLength) {
    if (!wormNoise) return [];

    const path = [];
    const rng = seededRandom(origin.seed);

    let x = origin.x;
    let y = origin.y;
    let z = origin.z;

    // Initial random direction
    let dx = rng() - 0.5;
    let dy = (rng() - 0.5) * WORM_CONFIG.verticalBias;
    let dz = rng() - 0.5;

    // Normalize direction
    let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    dx /= len; dy /= len; dz /= len;

    for (let i = 0; i < maxLength; i++) {
        // Vary radius along worm using sine wave + noise
        const radiusNoise = wormNoise.noise2D(x * 0.05, z * 0.05) * 0.5;
        const radius = Math.max(2,
            WORM_CONFIG.baseRadius +
            Math.sin(i * 0.15) * WORM_CONFIG.radiusVariation +
            radiusNoise * WORM_CONFIG.radiusVariation
        );

        path.push({ x, y, z, radius });

        // Update direction using noise (the "snaking" behavior)
        const noiseScale = 0.02;
        const noiseX = wormNoise.noise2D(x * noiseScale, z * noiseScale + y * noiseScale * 0.5);
        const noiseZ = wormNoise2.noise2D(x * noiseScale + 100, z * noiseScale);
        const noiseY = wormNoise.noise2D(y * noiseScale, x * noiseScale * 0.3 + z * noiseScale * 0.3);

        // Blend current direction with noise-based direction
        const blendFactor = 0.25; // How quickly direction changes
        dx = dx * (1 - blendFactor) + noiseX * blendFactor;
        dy = dy * (1 - blendFactor) + noiseY * blendFactor * WORM_CONFIG.verticalBias;
        dz = dz * (1 - blendFactor) + noiseZ * blendFactor;

        // Worms undulate up and down - creates natural cave systems
        // Strong undulation brings worms to surface periodically
        const undulation = Math.sin(i * 0.06) * 0.25;
        dy += undulation;

        // Occasionally surge upward to create entrances
        if (i % 25 === 0 && rng() < 0.4) {
            dy += 0.3; // Surge toward surface
        }

        // Keep within bounds but allow surface breaches
        if (y > 10) {
            dy -= 0.2; // Push back down if too high above ground
        }
        if (y < WORM_CONFIG.minDepth) {
            dy += 0.2; // Push up if too deep
        }

        // Renormalize direction
        len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 0) {
            dx /= len; dy /= len; dz /= len;
        }

        // Move to next segment
        x += dx * WORM_CONFIG.segmentLength;
        y += dy * WORM_CONFIG.segmentLength;
        z += dz * WORM_CONFIG.segmentLength;
    }

    return path;
}

// Trace a worm with branches
function traceWormWithBranches(origin) {
    const mainPath = traceWorm(origin);
    const allPaths = [mainPath];

    const rng = seededRandom(origin.seed + 999);
    let branchCount = 0;

    // Check for branches along main path
    for (let i = 20; i < mainPath.length - 20 && branchCount < WORM_CONFIG.maxBranches; i++) {
        if (rng() < WORM_CONFIG.branchChance) {
            const branchOrigin = {
                x: mainPath[i].x,
                y: mainPath[i].y,
                z: mainPath[i].z,
                seed: origin.seed + i * 7777
            };
            const branchPath = traceWorm(branchOrigin, Math.floor(WORM_CONFIG.wormLength * 0.6));
            allPaths.push(branchPath);
            branchCount++;
        }
    }

    return allPaths;
}

// Find cave entrances for a chunk by checking where worms intersect surface
// This is called during chunk generation
function findCaveEntrances(cx, cz, chunkSize, getTerrainHeight) {
    const entrances = [];
    const chunkMinX = cx * chunkSize;
    const chunkMaxX = (cx + 1) * chunkSize;
    const chunkMinZ = cz * chunkSize;
    const chunkMaxZ = (cz + 1) * chunkSize;

    // Check worms from nearby chunks
    for (let dcx = -WORM_CONFIG.checkRadius; dcx <= WORM_CONFIG.checkRadius; dcx++) {
        for (let dcz = -WORM_CONFIG.checkRadius; dcz <= WORM_CONFIG.checkRadius; dcz++) {
            const ncx = cx + dcx;
            const ncz = cz + dcz;

            const wormOrigins = getChunkWormOrigins(ncx, ncz, chunkSize);

            for (const origin of wormOrigins) {
                const allPaths = traceWormWithBranches(origin);

                for (const path of allPaths) {
                    // Find where this worm intersects our chunk's surface
                    for (let i = 0; i < path.length; i++) {
                        const seg = path[i];

                        // Check if segment is in our chunk bounds (with some margin for radius)
                        if (seg.x >= chunkMinX - seg.radius && seg.x < chunkMaxX + seg.radius &&
                            seg.z >= chunkMinZ - seg.radius && seg.z < chunkMaxZ + seg.radius) {

                            // Get terrain height at this point
                            const terrainY = getTerrainHeight(seg.x, seg.z);

                            // Check if worm intersects or comes close to surface
                            // distToSurface > 0 means worm is below surface
                            // distToSurface < 0 means worm pokes above surface
                            const distToSurface = terrainY - seg.y;

                            // Create entrance if worm is within range of surface
                            // distToSurface > 0 means worm is below terrain
                            if (distToSurface > -seg.radius && distToSurface < seg.radius * 4) {
                                // Calculate how deep to carve to reach the worm
                                // We need to carve from terrain surface down to worm center
                                const carveDepth = Math.max(seg.radius * 2, distToSurface + seg.radius);

                                entrances.push({
                                    x: seg.x,
                                    z: seg.z,
                                    radius: seg.radius * 1.5, // Wider entrance
                                    depth: carveDepth, // Carve all the way to worm
                                    wormY: seg.y
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Merge nearby entrances to avoid duplicates
    return mergeEntrances(entrances);
}

// Merge overlapping entrances
function mergeEntrances(entrances) {
    if (entrances.length <= 1) return entrances;

    const merged = [];
    const used = new Set();

    for (let i = 0; i < entrances.length; i++) {
        if (used.has(i)) continue;

        const e1 = entrances[i];
        let bestEntrance = { ...e1 };

        // Find overlapping entrances
        for (let j = i + 1; j < entrances.length; j++) {
            if (used.has(j)) continue;

            const e2 = entrances[j];
            const dist = Math.sqrt((e1.x - e2.x) ** 2 + (e1.z - e2.z) ** 2);

            if (dist < e1.radius + e2.radius) {
                // Merge: take larger radius, average position
                used.add(j);
                if (e2.radius > bestEntrance.radius) {
                    bestEntrance.x = (bestEntrance.x + e2.x) / 2;
                    bestEntrance.z = (bestEntrance.z + e2.z) / 2;
                    bestEntrance.radius = Math.max(bestEntrance.radius, e2.radius);
                    bestEntrance.depth = Math.max(bestEntrance.depth, e2.depth);
                }
            }
        }

        merged.push(bestEntrance);
    }

    return merged;
}

// Get entrance depth at a world position (for terrain carving)
// Returns depth to carve (0 if not in an entrance)
function getEntranceDepthAt(worldX, worldZ, entrances) {
    if (!entrances || entrances.length === 0) return 0;

    let maxDepth = 0;

    for (const entrance of entrances) {
        const dx = worldX - entrance.x;
        const dz = worldZ - entrance.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < entrance.radius) {
            // Bowl-shaped depression
            const normalizedDist = dist / entrance.radius;
            const bowlShape = 1 - normalizedDist * normalizedDist;
            const depth = bowlShape * entrance.depth;
            maxDepth = Math.max(maxDepth, depth);
        }
    }

    return maxDepth;
}

// Check if a 3D point is inside a cave (for future underground exploration)
function isCaveAt(x, y, z) {
    if (!wormNoise) return false;

    // Determine which chunk this point is in
    const chunkSize = 512; // Should match CHUNK_CONFIG.size
    const cx = Math.floor(x / chunkSize);
    const cz = Math.floor(z / chunkSize);

    // Check worms from nearby chunks
    for (let dcx = -WORM_CONFIG.checkRadius; dcx <= WORM_CONFIG.checkRadius; dcx++) {
        for (let dcz = -WORM_CONFIG.checkRadius; dcz <= WORM_CONFIG.checkRadius; dcz++) {
            const ncx = cx + dcx;
            const ncz = cz + dcz;

            const wormOrigins = getChunkWormOrigins(ncx, ncz, chunkSize);

            for (const origin of wormOrigins) {
                const allPaths = traceWormWithBranches(origin);

                for (const path of allPaths) {
                    for (const seg of path) {
                        const dist = Math.sqrt(
                            (x - seg.x) ** 2 +
                            (y - seg.y) ** 2 +
                            (z - seg.z) ** 2
                        );

                        if (dist < seg.radius) {
                            return true;
                        }
                    }
                }
            }
        }
    }

    return false;
}

// Legacy function for compatibility - now returns null (use findCaveEntrances instead)
function getCaveEntrance(chunkX, chunkZ, chunkSize) {
    // This is now handled by findCaveEntrances which is called in chunks.js
    // Return null to disable old per-chunk entrance system
    return null;
}

// Legacy - kept for API compatibility but unused
function getEntranceDepth(worldX, worldZ, entrance) {
    if (!entrance) return 0;
    const dx = worldX - entrance.x;
    const dz = worldZ - entrance.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist >= entrance.radius) return 0;
    const normalizedDist = dist / entrance.radius;
    return (1 - normalizedDist * normalizedDist) * entrance.depth;
}

// ============================================================================
// CAVE TUNNEL MESHES - Creates actual walkable cave tunnels
// ============================================================================
let caveTunnelMeshes = [];
let debugMeshes = [];

// Create actual cave tunnel geometry that player can walk through
function createCaveTunnels(cx, cz, chunkSize) {
    const tunnels = [];

    // Check worms from nearby chunks
    for (let dcx = -WORM_CONFIG.checkRadius; dcx <= WORM_CONFIG.checkRadius; dcx++) {
        for (let dcz = -WORM_CONFIG.checkRadius; dcz <= WORM_CONFIG.checkRadius; dcz++) {
            const ncx = cx + dcx;
            const ncz = cz + dcz;

            const wormOrigins = getChunkWormOrigins(ncx, ncz, chunkSize);

            for (const origin of wormOrigins) {
                const allPaths = traceWormWithBranches(origin);

                for (const path of allPaths) {
                    // Find segments that are underground in this chunk
                    const chunkMinX = cx * chunkSize;
                    const chunkMaxX = (cx + 1) * chunkSize;
                    const chunkMinZ = cz * chunkSize;
                    const chunkMaxZ = (cz + 1) * chunkSize;

                    const undergroundPoints = [];

                    for (const seg of path) {
                        // Check if in chunk bounds
                        if (seg.x >= chunkMinX - 20 && seg.x < chunkMaxX + 20 &&
                            seg.z >= chunkMinZ - 20 && seg.z < chunkMaxZ + 20) {

                            // Get terrain height
                            if (typeof calculateTerrainHeight === 'function') {
                                const data = calculateTerrainHeight(seg.x, seg.z);
                                // Only include segments that are underground
                                if (seg.y < data.height - 2) {
                                    undergroundPoints.push({
                                        point: new THREE.Vector3(seg.x, seg.y, seg.z),
                                        radius: seg.radius
                                    });
                                }
                            }
                        }
                    }

                    // Create tunnel mesh if we have enough points
                    if (undergroundPoints.length >= 3) {
                        tunnels.push(undergroundPoints);
                    }
                }
            }
        }
    }

    return tunnels;
}

// Build tunnel mesh from points (floor and ceiling)
function buildTunnelMesh(tunnelPoints) {
    if (tunnelPoints.length < 3) return null;

    const points = tunnelPoints.map(t => t.point);
    const avgRadius = tunnelPoints.reduce((sum, t) => sum + t.radius, 0) / tunnelPoints.length;

    // Create tube geometry for the tunnel
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeom = new THREE.TubeGeometry(curve, tunnelPoints.length * 2, avgRadius, 8, false);

    // Dark cave material
    const material = new THREE.MeshBasicMaterial({
        color: 0x1a1a1a,
        side: THREE.BackSide // Render inside of tube
    });

    return new THREE.Mesh(tubeGeom, material);
}

// Show cave debug - creates visible floor path you can walk on
function showCaveDebug(radius = 3) {
    hideCaveDebug();

    if (!wormNoise) {
        console.log('Cave system not initialized');
        return;
    }

    const playerX = typeof character !== 'undefined' ? character.position.x : 0;
    const playerZ = typeof character !== 'undefined' ? character.position.z : 0;
    const chunkSize = 512;
    const playerCX = Math.floor(playerX / chunkSize);
    const playerCZ = Math.floor(playerZ / chunkSize);

    console.log(`Creating cave floors around chunk (${playerCX}, ${playerCZ})...`);

    // Floor material - visible walkable path
    const floorMaterial = new THREE.MeshBasicMaterial({
        color: 0x4a4a4a,
        side: THREE.DoubleSide
    });

    // Ceiling material
    const ceilingMaterial = new THREE.MeshBasicMaterial({
        color: 0x2a2a2a,
        side: THREE.DoubleSide
    });

    // Wall material (for visual reference)
    const wallMaterial = new THREE.MeshBasicMaterial({
        color: 0x3a3a3a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
    });

    let tunnelCount = 0;

    for (let dcx = -radius; dcx <= radius; dcx++) {
        for (let dcz = -radius; dcz <= radius; dcz++) {
            const cx = playerCX + dcx;
            const cz = playerCZ + dcz;

            const wormOrigins = getChunkWormOrigins(cx, cz, chunkSize);

            for (const origin of wormOrigins) {
                const allPaths = traceWormWithBranches(origin);

                for (const path of allPaths) {
                    if (path.length < 3) continue;

                    // Create floor and ceiling segments along the tunnel (no walls blocking)
                    for (let i = 0; i < path.length; i += 2) {
                        const seg = path[i];
                        const r = seg.radius;

                        // Floor circle
                        const floorGeom = new THREE.CircleGeometry(r, 12);
                        const floorMesh = new THREE.Mesh(floorGeom, floorMaterial);
                        floorMesh.rotation.x = -Math.PI / 2;
                        floorMesh.position.set(seg.x, seg.y - r * 0.8, seg.z);
                        scene.add(floorMesh);
                        caveTunnelMeshes.push(floorMesh);

                        // Ceiling circle
                        const ceilGeom = new THREE.CircleGeometry(r, 12);
                        const ceilMesh = new THREE.Mesh(ceilGeom, ceilingMaterial);
                        ceilMesh.rotation.x = Math.PI / 2;
                        ceilMesh.position.set(seg.x, seg.y + r * 0.8, seg.z);
                        scene.add(ceilMesh);
                        caveTunnelMeshes.push(ceilMesh);
                    }

                    tunnelCount++;
                }
            }
        }
    }

    console.log(`Created ${tunnelCount} cave tunnels (floor + ceiling, no walls)`);
    console.log('Use /entercave to teleport inside, /hideground to see');
}

function hideCaveDebug() {
    for (const mesh of debugMeshes) {
        scene.remove(mesh);
        mesh.geometry.dispose();
    }
    debugMeshes = [];

    for (const mesh of caveTunnelMeshes) {
        scene.remove(mesh);
        mesh.geometry.dispose();
    }
    caveTunnelMeshes = [];

    console.log('Cave visualization removed');
}

// Toggle terrain visibility to see underground
function hideGround() {
    for (const [key, chunk] of loadedChunks) {
        if (chunk.mesh) chunk.mesh.visible = false;
        if (chunk.waterMesh) chunk.waterMesh.visible = false;
    }
    console.log('Terrain hidden. Call showGround() to restore.');
}

function showGround() {
    for (const [key, chunk] of loadedChunks) {
        if (chunk.mesh) chunk.mesh.visible = true;
        if (chunk.waterMesh) chunk.waterMesh.visible = true;
    }
    console.log('Terrain visible.');
}

// Teleport INSIDE a cave tunnel (not just to entrance)
function enterCave() {
    if (!wormNoise || typeof character === 'undefined') {
        console.log('Cannot enter cave - system not ready');
        return;
    }

    const playerX = character.position.x;
    const playerZ = character.position.z;
    const chunkSize = 512;
    const playerCX = Math.floor(playerX / chunkSize);
    const playerCZ = Math.floor(playerZ / chunkSize);

    // Find a cave segment to teleport into
    for (let dcx = -3; dcx <= 3; dcx++) {
        for (let dcz = -3; dcz <= 3; dcz++) {
            const cx = playerCX + dcx;
            const cz = playerCZ + dcz;

            const wormOrigins = getChunkWormOrigins(cx, cz, chunkSize);

            for (const origin of wormOrigins) {
                const allPaths = traceWormWithBranches(origin);

                for (const path of allPaths) {
                    // Find a segment that's underground
                    for (const seg of path) {
                        if (typeof calculateTerrainHeight === 'function') {
                            const data = calculateTerrainHeight(seg.x, seg.z);
                            // Must be underground
                            if (seg.y < data.height - 5) {
                                // Teleport into this cave segment
                                const floorY = seg.y - seg.radius * 0.5;
                                character.position.set(seg.x, floorY + 2, seg.z);
                                console.log(`Teleported inside cave at (${seg.x.toFixed(0)}, ${floorY.toFixed(0)}, ${seg.z.toFixed(0)})`);
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    console.log('No underground cave found nearby.');
}

// Teleport to nearest cave entrance
function teleportToCave() {
    if (!wormNoise || typeof character === 'undefined') {
        console.log('Cannot teleport - cave system or character not ready');
        return;
    }

    const playerX = character.position.x;
    const playerZ = character.position.z;
    const chunkSize = 512;
    const playerCX = Math.floor(playerX / chunkSize);
    const playerCZ = Math.floor(playerZ / chunkSize);

    let nearestEntrance = null;
    let nearestDist = Infinity;

    // Search chunks around player
    for (let dcx = -5; dcx <= 5; dcx++) {
        for (let dcz = -5; dcz <= 5; dcz++) {
            const cx = playerCX + dcx;
            const cz = playerCZ + dcz;

            const entrances = findCaveEntrances(cx, cz, chunkSize, (x, z) => {
                const data = calculateTerrainHeight(x, z);
                return data.height;
            });

            for (const entrance of entrances) {
                const dist = Math.sqrt((entrance.x - playerX) ** 2 + (entrance.z - playerZ) ** 2);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEntrance = entrance;
                }
            }
        }
    }

    if (nearestEntrance) {
        const terrainData = calculateTerrainHeight(nearestEntrance.x, nearestEntrance.z);
        character.position.set(nearestEntrance.x, terrainData.height + 5, nearestEntrance.z);
        console.log(`Teleported to cave entrance at (${nearestEntrance.x.toFixed(0)}, ${nearestEntrance.z.toFixed(0)})`);
    } else {
        console.log('No cave entrances found nearby. Try moving to a different area.');
    }
}

// Get cave floor height at position (for character to walk on)
// Returns { inCave: boolean, floorY: number }
function getCaveFloorAt(x, y, z) {
    if (!wormNoise) return { inCave: false, floorY: null };

    const chunkSize = 512;
    const cx = Math.floor(x / chunkSize);
    const cz = Math.floor(z / chunkSize);

    let closestCaveFloor = null;
    let inCave = false;

    // Check worms from nearby chunks
    for (let dcx = -2; dcx <= 2; dcx++) {
        for (let dcz = -2; dcz <= 2; dcz++) {
            const ncx = cx + dcx;
            const ncz = cz + dcz;

            const wormOrigins = getChunkWormOrigins(ncx, ncz, chunkSize);

            for (const origin of wormOrigins) {
                const allPaths = traceWormWithBranches(origin);

                for (const path of allPaths) {
                    for (const seg of path) {
                        // Check horizontal distance
                        const dx = x - seg.x;
                        const dz = z - seg.z;
                        const horizontalDist = Math.sqrt(dx * dx + dz * dz);

                        // If within tunnel radius horizontally
                        if (horizontalDist < seg.radius) {
                            // Check if player Y is within tunnel vertically
                            const tunnelTop = seg.y + seg.radius;
                            const tunnelBottom = seg.y - seg.radius;

                            if (y >= tunnelBottom - 2 && y <= tunnelTop + 5) {
                                inCave = true;
                                const floorY = seg.y - seg.radius * 0.7;

                                if (closestCaveFloor === null || floorY > closestCaveFloor) {
                                    closestCaveFloor = floorY;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return { inCave, floorY: closestCaveFloor };
}

// Expose globally
window.initCaveSystem = initCaveSystem;
window.findCaveEntrances = findCaveEntrances;
window.getEntranceDepthAt = getEntranceDepthAt;
window.isCaveAt = isCaveAt;
window.getCaveEntrance = getCaveEntrance;
window.getEntranceDepth = getEntranceDepth;
window.getCaveFloorAt = getCaveFloorAt;
window.WORM_CONFIG = WORM_CONFIG;
window.showCaveDebug = showCaveDebug;
window.hideCaveDebug = hideCaveDebug;
window.hideGround = hideGround;
window.showGround = showGround;
window.teleportToCave = teleportToCave;
window.enterCave = enterCave;
