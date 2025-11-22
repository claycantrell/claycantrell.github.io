# Multiplayer Quick Start Guide

## What You Get

A lightweight multiplayer system where multiple people can walk around the 3D demo together. Other players appear as **green characters** (your character is red).

## Setup (5 minutes)

### 1. Install Server Dependencies

```bash
cd server
npm install
```

### 2. Start the Server

```bash
npm start
```

You should see: `Multiplayer server running on ws://localhost:8080`

### 3. Test It

1. Keep the server running
2. Open `http://localhost:8000/pages/3d-demo.html` in multiple browser tabs/windows
3. Move around - you should see other players as green characters!

## How It Works

- **Server**: Simple WebSocket server (Node.js + `ws` library)
- **Client**: Automatically connects when page loads
- **Data**: Only sends position/rotation (~15 updates/second per player)
- **Graceful**: Game works fine without server (single-player mode)

## Production Deployment

### Option 1: Simple Hosting (Heroku, Railway, etc.)

1. Deploy the `server/` folder
2. Update `core.js` line ~108 with your server URL:
   ```javascript
   const serverUrl = 'wss://your-server.herokuapp.com';
   ```

### Option 2: VPS/Cloud Server

1. Upload `server/` folder
2. Install Node.js and run: `npm install && npm start`
3. Use PM2 for process management: `pm2 start multiplayer-server.js`
4. Set up nginx reverse proxy for WebSocket support

### Option 3: Serverless (Advanced)

For serverless, you'd need to use services like:
- **Ably** (WebSocket as a service)
- **Pusher** (real-time messaging)
- **AWS API Gateway** + Lambda (more complex)

## Configuration

### Change Update Rate

In `multiplayer.js`, line 6:
```javascript
let updateThrottle = 66; // Lower = more updates (default: 66ms = ~15fps)
```

### Change Player Colors

In `other-players.js`, line 10:
```javascript
color: 0x00FF00, // Change this hex color
```

### Change Server Port

In `server/multiplayer-server.js`, line 6:
```javascript
const wss = new WebSocket.Server({ port: 8080 });
```

## Troubleshooting

**"Connection failed"**
- Make sure server is running: `cd server && npm start`
- Check browser console for errors
- Verify WebSocket URL matches server

**Players not appearing**
- Check browser console for errors
- Verify WebSocket connection is established
- Make sure multiple tabs/windows are open

**Laggy movement**
- Reduce update rate (increase `updateThrottle`)
- Check server CPU/memory usage
- Consider reducing number of players

## Features

✅ Real-time position/rotation sync  
✅ Smooth interpolation between updates  
✅ Auto-reconnect on disconnect  
✅ Graceful degradation (works without server)  
✅ Player join/leave notifications  
✅ Stale player cleanup  

## Next Steps

- Add player names/IDs above characters
- Add chat functionality
- Add collision detection between players
- Add player count display
- Add different player colors/avatars

