# Multiplayer Scaling - 10 Players Support

## Current Status: ✅ Supports 10 Players

The multiplayer system is designed to handle 10+ players efficiently.

## Optimizations for 10 Players

### 1. **Shared Geometries & Materials**
- **Before**: Each player created 3 new geometries + 3 new materials
- **After**: All players share the same geometries and materials
- **Result**: 10 players = 3 geometries + 3 materials (not 30+30)

### 2. **Network Efficiency**
- Updates throttled to 15fps per player
- Only sends position (x, y, z) and rotation (y)
- Small JSON payloads (~50 bytes per update)
- **10 players × 15 updates/sec = 150 messages/sec** (manageable)

### 3. **Rendering Performance**
- Each other player = 3 meshes (body, head, hat)
- 10 players = 30 additional meshes
- Using low-poly geometries (optimized in performance.js)
- **Total**: ~33 meshes (1 you + 10 others × 3) - very lightweight

### 4. **Server Capacity**
- Default limit: 20 players (safety limit)
- Easily supports 10 players
- Uses efficient Map data structure
- Automatic cleanup of stale players

## Performance at 10 Players

### Network Bandwidth
- **Per player**: ~750 bytes/sec (15 updates × 50 bytes)
- **10 players**: ~7.5 KB/sec per client (very low)
- **Server**: Broadcasts to all, but WebSocket is efficient

### CPU/GPU Load
- **Rendering**: 10 additional low-poly characters
- **Interpolation**: Smooth movement for all players
- **Memory**: Shared geometries = minimal overhead

### Server Load
- **Connections**: 10 WebSocket connections
- **Messages**: ~150 messages/sec total
- **Memory**: ~10KB per player (very low)

## Testing with 10 Players

1. **Start server**: `cd server && npm start`
2. **Open 10 browser tabs/windows** to your demo
3. **Move around** - all should see each other
4. **Check performance**: Should run smoothly

## Scaling Beyond 10 Players

The system can handle more, but consider:

### For 20+ Players:
- Increase `MAX_PLAYERS` in `server/multiplayer-server.js`
- Consider reducing update rate: `updateThrottle = 100` (10fps)
- Add distance-based culling (only update nearby players)

### For 50+ Players:
- Implement spatial partitioning
- Only send updates for players within render distance
- Use binary protocol instead of JSON
- Consider dedicated game server

## Current Limits

- **Server**: 20 players (configurable)
- **Client**: No hard limit (browser-dependent)
- **Recommended**: 10-15 players for best performance

## Monitoring

Check server logs for:
```
Player connected: player_... (5/20)
Player connected: player_... (10/20)
```

This shows current player count vs. maximum.

