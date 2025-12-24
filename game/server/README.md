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

## Security & Hosting

### ⚠️ CRITICAL SECURITY NOTES

- **Never commit `.env` files** containing real API keys to version control
- **Never expose OpenAI API keys** in client-side code or public repositories
- **Use HTTPS in production** to encrypt WebSocket and API traffic
- **Rate limiting is enabled** to prevent API abuse, but monitor usage

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your OpenAI API key

# Start server
source .env && npm start
```

### Production Deployment

For production hosting:

1. **Environment Variables:**
   ```bash
   # On your server, set environment variables securely
   export OPENAI_API_KEY=your-production-key-here
   export PORT=8080
   ```

2. **Process Management with PM2:**
   ```bash
   npm install -g pm2
   pm2 start multiplayer-server.js --name "3d-demo-server"
   pm2 save
   pm2 startup
   ```

3. **SSL/TLS Setup (REQUIRED for production):**
   - Use a reverse proxy like nginx or Caddy
   - Configure SSL certificates (Let's Encrypt recommended)
   - Update WebSocket URLs to use `wss://` instead of `ws://`

4. **Firewall Configuration:**
   - Only expose necessary ports (80, 443 for web, 8080 for WebSocket if not proxied)
   - Consider IP-based restrictions for API access

5. **Monitoring:**
   - Monitor server logs for rate limit violations
   - Set up alerts for server crashes or high resource usage
   - Track OpenAI API usage and costs

### Recommended Hosting Options

#### 🚀 **Railway (Easiest - Recommended)**

**Railway is perfect for your setup because it:**
- Supports WebSocket connections natively
- Handles environment variables securely
- Provides automatic SSL certificates
- Has a global CDN
- Costs ~$5/month

**Quick Deploy Steps:**

1. **Sign up at [railway.app](https://railway.app)** (use GitHub login)

2. **Deploy from GitHub:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects it's a Node.js app

3. **Set Environment Variables:**
   - Go to your project dashboard
   - Variables tab → Add Variable
   - Key: `OPENAI_API_KEY`
   - Value: `your-actual-openai-api-key-here`

4. **Deploy:**
   - Railway automatically deploys when you push to main branch
   - Get your domain (e.g., `your-app.up.railway.app`)

5. **Update your static site:**
   - If hosting static files separately (recommended), deploy HTML/CSS/JS to Vercel/Netlify
   - Your Railway app only needs to handle WebSocket + API requests

**That's it!** Your app will be live with secure API keys.

#### 📦 **Recommended Architecture: Separate Static + API**

For better performance and scalability:

1. **Deploy static files** (HTML/CSS/JS) to Vercel/Netlify (~$0/month free tier)
2. **Deploy API server** to Railway/Render (~$5/month)

**Benefits:**
- Static files load instantly from CDN
- API server only handles WebSocket + OpenAI requests
- Better caching and performance
- Cheaper overall

**Vercel + Railway Setup:**
```bash
# 1. Static files on Vercel (vercel.com)
vercel --prod  # Deploy HTML/CSS/JS

# 2. API on Railway (railway.app)
# Follow Railway steps above, but remove static file serving from server
```

#### 🔥 **Render (Good Alternative)**
```bash
# 1. Connect GitHub repo to Render
# 2. Choose "Web Service" from Docker/Node
# 3. Set environment variables in dashboard:
#    OPENAI_API_KEY = your-key-here
# 4. Deploy automatically on git push
```

#### 🏗️ **DigitalOcean App Platform**
- Web-based setup
- Environment variables in dashboard
- Automatic SSL
- $12/month for basic plan

#### ☁️ **AWS EC2 + CloudFlare**
For more control:
```bash
# On your EC2 instance:
export OPENAI_API_KEY=your-key-here
npm start

# Use CloudFlare for SSL termination
```

### Deployment Steps

1. **Choose a hosting platform** (Railway recommended)

2. **Set environment variables:**
   ```bash
   OPENAI_API_KEY=your-actual-openai-api-key
   PORT=8080  # Usually set automatically by platform
   ```

3. **Deploy your code:**
   - Push to GitHub
   - Connect repository to hosting platform
   - Platform auto-deploys on push

4. **Update client connection URLs:**
   ```javascript
   // In your client code (core.js or multiplayer.js)
   const SERVER_URL = process.env.NODE_ENV === 'production'
     ? 'wss://your-app-name.railway.app'
     : 'ws://localhost:8080';
   ```

5. **Test the deployment:**
   - Visit your hosted static site
   - Check browser console for WebSocket connection
   - Test chat functionality

### Cost Considerations

- **OpenAI API:** ~$0.002 per 1K tokens (varies by model)
- **Hosting:** $5-15/month depending on platform
- **WebSocket connections:** Scale with concurrent users
- **Monitor usage** to avoid surprise bills

### Troubleshooting

- **WebSocket won't connect:** Check if platform supports WebSockets
- **API returns 503:** OpenAI key not set in environment
- **CORS errors:** Platform may need CORS configuration
- **Rate limits:** OpenAI has usage limits - monitor and upgrade if needed

## Environment Variables

**OPTIONAL: OpenAI API Key for Chat Features**

The server runs without an OpenAI API key, but chat features will be disabled. **NEVER** hardcode API keys in your code.

### Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your OpenAI API key:**
   ```bash
   # Get your key from: https://platform.openai.com/api-keys
   OPENAI_API_KEY=your-actual-openai-api-key-here
   ```

3. **Load the environment and start the server:**
   ```bash
   # Linux/Mac
   source .env && npm start

   # Windows
   # Use a tool like cross-env or set environment variables manually
   ```

### Optional Configuration

```bash
PORT=8080 node multiplayer-server.js
```

## Testing

Open multiple browser tabs/windows to `http://localhost:8080/` and you should see other players as green characters moving around.

