# Multiplayer Server

Lightweight WebSocket server for the 3D demo multiplayer functionality.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

## Configuration

The server runs on port 8080 by default. To change this, edit `multiplayer-server.js`:

```javascript
const wss = new WebSocket.Server({ port: 8080 });
```

## Production Deployment

For production, you'll want to:

1. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start multiplayer-server.js
```

2. Set up a reverse proxy (nginx) to handle WebSocket connections

3. Use `wss://` (secure WebSocket) with SSL certificate

4. Update the client connection URL in `core.js` to your production server

## Environment Variables

You can use environment variables for configuration:

```bash
PORT=8080 node multiplayer-server.js
```

## Testing

Open multiple browser tabs/windows to `http://localhost:8000/pages/3d-demo.html` and you should see other players as green characters moving around.

