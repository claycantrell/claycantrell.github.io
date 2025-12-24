# Local Multiplayer Setup - Quick Guide

## ✅ Server is Running!

The multiplayer server should now be running on `ws://localhost:8080`

## Test It Now

1. **Open your demo** in a browser:
   ```
   http://localhost:8080/
   ```

2. **Open the same page in another browser tab/window**

3. **Move around** - you should see:
   - Your character: **Red** (original)
   - Other players: **Green** (other tabs/windows)

## How to Start/Stop Server

### Start Server:
```bash
cd server
npm start
```

Or in background:
```bash
cd server
node multiplayer-server.js &
```

### Stop Server:
Press `Ctrl+C` in the terminal where it's running, or:
```bash
pkill -f multiplayer-server.js
```

## Verify It's Working

1. **Check browser console** (F12) - you should see:
   - `Connected to multiplayer server`
   - No WebSocket errors

2. **Check server terminal** - you should see:
   - `Multiplayer server running on ws://localhost:8080`
   - `Player connected: player_...` messages

## Troubleshooting

**"Connection failed" or no other players:**
- Make sure server is running: `cd server && npm start`
- Check browser console for errors
- Verify you're using `localhost` (not 127.0.0.1 or IP address)

**Server won't start:**
- Make sure port 8080 is not in use: `lsof -i :8080`
- Install dependencies: `cd server && npm install`

**Players not appearing:**
- Open multiple tabs/windows (not just refresh)
- Check browser console for connection messages
- Make sure both tabs are on the same page

## What's Happening

- **Server**: Running on port 8080, handling WebSocket connections
- **Client**: Automatically connects when page loads (if server available)
- **Updates**: Position/rotation sent ~15 times per second
- **Rendering**: Other players appear as green characters with smooth movement

## Next Steps

Once it's working locally, you can:
- Deploy server to production (Heroku, Railway, etc.)
- Update `core.js` line 113 with production WebSocket URL
- Add player names, chat, or other features!

