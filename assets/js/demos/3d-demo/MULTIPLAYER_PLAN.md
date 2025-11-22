# Multiplayer Implementation Plan

## Architecture

**Lightweight Approach:**
- **Server**: Simple Node.js WebSocket server using `ws` library (lighter than Socket.io)
- **Client**: WebSocket client that sends/receives player updates
- **Data**: Only send position (x, y, z) and rotation (y) - minimal bandwidth
- **Sync**: Throttle updates to ~10-15 updates per second per player

## File Structure

```
server/
  └── multiplayer-server.js    (Simple WebSocket server)

assets/js/demos/3d-demo/
  ├── multiplayer.js           (Client-side multiplayer logic)
  └── other-players.js         (Rendering other players)
```

## Data Flow

1. **Player Joins**: Client connects → Server assigns ID → Broadcasts to others
2. **Player Moves**: Client sends position/rotation → Server broadcasts to all others
3. **Player Leaves**: Client disconnects → Server removes from list → Broadcasts to others

## Message Types

```javascript
// Client → Server
{ type: 'join', id: 'player123', position: {x, y, z}, rotation: {y} }
{ type: 'update', id: 'player123', position: {x, y, z}, rotation: {y} }

// Server → Client
{ type: 'playerJoined', id: 'player123', position: {x, y, z}, rotation: {y} }
{ type: 'playerUpdate', id: 'player123', position: {x, y, z}, rotation: {y} }
{ type: 'playerLeft', id: 'player123' }
{ type: 'allPlayers', players: [{id, position, rotation}, ...] }
```

## Implementation Steps

1. Create simple WebSocket server
2. Add multiplayer.js client module
3. Add other-players.js for rendering
4. Integrate into existing game loop
5. Add player name/color differentiation

## Optimization

- **Throttling**: Only send updates every ~66ms (15fps)
- **Interpolation**: Smooth other players' movement between updates
- **Culling**: Only update visible players
- **Compression**: Use binary format if needed (not necessary for small scale)

