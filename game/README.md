# Graceful World

A browser-based 3D sandbox game with procedural terrain, block building, terraforming, and wildlife — inspired by Minecraft and built entirely in Three.js.

![Status: Alpha](https://img.shields.io/badge/status-alpha-orange)

---

## 1. What This Project Is

**One-sentence pitch:** A retro-styled 3D sandbox where you explore procedural worlds, build with blocks, terraform the land, and interact with wildlife and NPCs.

### Core Pillars
- **Procedural Worlds** — Simplex noise terrain with biomes, trees, and chunk streaming
- **Block Building** — Minecraft-style grid placement with 8 block types including light-emitting torches
- **Terraforming** — Real-time terrain sculpting (raise, lower, flatten, smooth)
- **Wildlife AI** — Deer, bunnies, birds, and cows with behavioral states
- **NPC Chat** — AI-powered conversations via OpenAI integration
- **Optional Multiplayer** — WebSocket-based, gracefully degrades to single-player

### Current Status: Alpha
**What's playable today:**
- Full movement (walk, sprint, jump, fly in build mode)
- First-person and third-person camera
- Block placement and removal
- Terrain deformation
- Day/night cycle (4-minute loop)
- Animal spawning and AI behaviors
- Map switching via portals
- Chat with NPCs
- Multiplayer position sync

### Roadmap (Next Milestones)
1. Inventory system
2. Crafting recipes
3. Block persistence (save/load)
4. More biomes (snow, swamp, caves)
5. Sound effects for actions

---

## 2. Quick Start

### Requirements
| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Browser | Chrome, Firefox, Edge (WebGL required) |
| GPU | Any with WebGL 2.0 support |

### Clone & Run

```bash
# Clone the repository
git clone https://github.com/your-username/claycantrell.github.io.git
cd claycantrell.github.io/game

# Install dependencies
npm install

# Start development server
npm run dev
```

### Expected Output
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: http://192.168.x.x:3001/
```

Open `http://localhost:3001` in your browser. You should see:
1. A loading screen with progress bar
2. The game world with terrain, trees, and sky
3. A red/yellow character you control

### Common First-Run Fixes

| Problem | Solution |
|---------|----------|
| Black screen | Check browser console for WebGL errors. Update GPU drivers. |
| "Module not found" | Delete `node_modules` and run `npm install` again |
| No mouse look | Click the game canvas to enable pointer lock |
| No audio | Click anywhere first (browser autoplay policy) |

---

## 3. Project Structure

```
game/
├── src/
│   └── main.js           # Bootstrapper — loads all scripts in dependency order
├── engine/               # Core game engine
│   ├── namespace.js      # GAME object — single source of truth for all state
│   ├── config.js         # CONFIG object — hierarchical settings (map overrides defaults)
│   ├── systems.js        # Systems registry — update loop management
│   ├── core.js           # Three.js scene, lighting, day/night cycle
│   ├── game.js           # Main animation loop, frame rate control
│   ├── input.js          # Keyboard, mouse, touch, pointer lock
│   ├── audio.js          # Three.js AudioListener, background music
│   ├── ui.js             # Notifications, loading screen, buttons
│   ├── performance.js    # Rendering quality settings
│   └── utils/            # Shared utilities
│       ├── collision.js      # Collision detection
│       ├── terrain.js        # Terrain height lookups (cached)
│       ├── behaviors.js      # Shared entity behaviors
│       ├── entity-factory.js # Boilerplate for entity systems
│       └── entity-config.js  # Entity type configurations
├── systems/              # Game systems (each registers with Systems)
│   ├── terrain.js        # Heightmap generation with Simplex noise
│   ├── chunks.js         # Chunk loading/unloading based on player position
│   ├── sky.js            # Procedural gradient sky with clouds
│   ├── trees.js          # Tree placement and LOD (3D → billboard)
│   ├── shrubs.js         # Ground vegetation
│   ├── water.js          # Water plane at sea level
│   ├── biomes.js         # Biome definitions
│   ├── climate.js        # Temperature/humidity for biome selection
│   ├── character.js      # Player model, movement, physics
│   ├── building.js       # Block placement system
│   ├── terraform.js      # Terrain deformation tools
│   ├── portals.js        # Map transition portals
│   ├── chat.js           # Chat UI and NPC AI integration
│   └── entities/         # AI entities
│       ├── entity-registry.js  # Central entity management
│       ├── npc.js              # NPC with conversation
│       ├── deer.js             # Deer with herd/flee behavior
│       ├── cow.js              # Passive cows
│       ├── bunny.js            # Hopping bunnies
│       ├── bird.js             # Flying birds
│       └── animal-spawner.js   # Spawns animals around player
├── multiplayer/          # Networking (optional)
│   ├── client.js         # WebSocket client, position sync
│   ├── other-players.js  # Render remote players
│   ├── sync.js           # State synchronization
│   └── time-sync.js      # Day/night sync across clients
├── server/               # Node.js multiplayer server
│   ├── multiplayer-server.js  # WebSocket + static file server
│   └── package.json
├── maps/                 # World configurations
│   ├── grasslands/config.json  # Default map
│   ├── desert/config.json      # Desert variant
│   ├── _template/              # Template for new maps
│   ├── map-loader.js           # Loads map configs
│   └── map-menu.js             # In-game map selector
├── assets/audio/         # Sound files
├── css/game.css          # UI styling
├── docs/                 # Extended documentation
├── dist/                 # Production build output (generated)
├── index.html            # Production entry (redirects to dist/)
├── index-dev.html        # Development entry
├── vite.config.js        # Build configuration
└── package.json
```

---

## 4. Build & Test

### Build Configurations

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload (CSS only) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

### Running Tests
```bash
# No automated tests yet — manual testing only
# See "Testing Checklist" section below
```

### With Multiplayer Server
```bash
# Terminal 1: Game client
npm run dev

# Terminal 2: Multiplayer server
cd server
npm install
npm start
# WebSocket server runs on ws://localhost:8080
```

---

## 5. Controls

### Movement
| Key | Action |
|-----|--------|
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Strafe left |
| `D` / `→` | Strafe right |
| `Space` | Jump |
| `Shift` | Sprint (1.5x speed) |
| Mouse | Look around (after clicking to lock) |

### Modes & UI
| Key | Action |
|-----|--------|
| `V` | Toggle first-person / third-person |
| `B` | Toggle build mode |
| `T` | Toggle terraform mode |
| `M` | Open map selection |
| `Enter` | Open chat |
| `Esc` | Release mouse lock |
| `1-6` | Pixelation quality levels |

### Build Mode (`B`)
| Input | Action |
|-------|--------|
| Left click | Place block |
| Right click | Remove block |
| `1-8` | Select block type |
| Scroll | Cycle block types |

**Block Types:** Dirt, Stone, Wood, Brick, Glass, Gold, Grass, Torch (emits light)

### Terraform Mode (`T`)
| Input | Action |
|-------|--------|
| Left click | Raise terrain |
| Shift + Left click | Lower terrain |
| Scroll | Adjust brush size (1-10) |

### Dev/Debug Hotkeys
| Key | Action |
|-----|--------|
| `1-6` | Pixelation level (1=retro, 6=off) |
| Browser console: `Systems.list()` | List all systems |
| Browser console: `GAME.character.position.set(x,y,z)` | Teleport |

---

## 6. Technical Deep Dives

### World Generation

**Coordinate System:**
```
Y = UP (vertical)
X = LEFT/RIGHT
Z = FORWARD/BACK

1 unit ≈ 1 meter
```

**Key Measurements:**
| Object | Size |
|--------|------|
| Player height | ~3 units |
| Block size | 2×2×2 units |
| Tree height | 15-30 units |
| Chunk size | 512×512 units |
| World size | 50,000×50,000 units (default) |
| Render distance | 6 chunks |

**Terrain Pipeline:**
```
Simplex Noise (3 octaves, scale 0.008)
    ↓
Heightmap (0-200 units elevation)
    ↓
Chunk Meshes (512×512, 48 segments each)
    ↓
Vertex Coloring (height-based: sand → grass → rock → snow)
    ↓
Biome Features (trees, shrubs based on climate)
```

**Files:**
- [terrain.js](systems/terrain.js) — Noise generation, heightmap
- [chunks.js](systems/chunks.js) — Chunk loading/unloading
- [biomes.js](systems/biomes.js) — Biome definitions
- [climate.js](systems/climate.js) — Temperature/humidity noise

### Block System

Blocks are defined in [building.js](systems/building.js):

```javascript
const BLOCK_TYPES = [
    { name: 'Dirt',  color: 0x8B4513, emissive: false },
    { name: 'Stone', color: 0x808080, emissive: false },
    { name: 'Wood',  color: 0xDEB887, emissive: false },
    { name: 'Brick', color: 0xB22222, emissive: false },
    { name: 'Glass', color: 0x87CEEB, transparent: true },
    { name: 'Gold',  color: 0xFFD700, emissive: true },
    { name: 'Grass', color: 0x228B22, emissive: false },
    { name: 'Torch', color: 0xFF6600, emissive: true, isTorch: true,
      lightColor: 0xFFAA44, lightIntensity: 30, lightDistance: 60 }
];
```

**Block Properties:**
- `color` — Hex color value
- `emissive` — Glows without light source
- `transparent` — See-through (glass)
- `isTorch` — Creates a point light when placed

**Grid:** Blocks snap to a 2-unit grid. Shared geometry is reused for performance.

### Lighting

**Day/Night Cycle:** 4-minute loop controlled in [core.js](engine/core.js)

| Phase | Time | Description |
|-------|------|-------------|
| 0.0-0.15 | Morning | Light blue sky, warm light |
| 0.15-0.35 | Midday | Deep blue sky, white light |
| 0.35-0.45 | Afternoon | Warm blue, slightly orange |
| 0.45-0.55 | Sunset | Orange → red → purple gradient |
| 0.55-0.65 | Dusk | Deep rose, fading light |
| 0.65-0.85 | Night | Dark blue, moonlight |
| 0.85-0.95 | Dawn | Warm orange, sunrise |

**Light Sources:**
- Ambient light (brightness varies with phase)
- Directional light (sun/moon, position orbits)
- Point lights (torches, 30-unit radius)

**Performance:** Shadow maps update every 50ms, not every frame.

### Multiplayer

**Authority Model:** Client-authoritative with server broadcast
- Each client controls its own position
- Server broadcasts positions to all clients on same map
- No collision between players

**Protocol:** JSON over WebSocket
```javascript
// Client → Server
{ type: 'move', x, y, z, ry }

// Server → Client
{ type: 'playerUpdate', id, x, y, z, ry }
{ type: 'playerJoined', id }
{ type: 'playerLeft', id }
```

**Sync Rate:** 15 FPS (66ms intervals)

**Files:**
- [multiplayer/client.js](multiplayer/client.js) — WebSocket client
- [multiplayer/other-players.js](multiplayer/other-players.js) — Render remote players
- [server/multiplayer-server.js](server/multiplayer-server.js) — Server

---

## 7. Developer Workflow

### Code Reading Order (New Developers)

1. **[namespace.js](engine/namespace.js)** — The `GAME` object holds ALL state
2. **[systems.js](engine/systems.js)** — How systems register and update
3. **[config.js](engine/config.js)** — Configuration hierarchy
4. **[main.js](src/main.js)** — Script loading order (6 layers)
5. **[core.js](engine/core.js)** — Scene setup, day/night
6. **[character.js](systems/character.js)** — Player example
7. **[deer.js](systems/entities/deer.js)** — Entity example

### Coding Standards

- **No globals** — All state in `GAME` namespace
- **Systems pattern** — Each system has `init()` and `update(delta)`
- **Config-driven** — Magic numbers live in `CONFIG` or map configs
- **Flat materials** — Use `MeshLambertMaterial` with flat shading for retro look

### Adding Content

#### Add a Block Type
Edit [building.js](systems/building.js):
```javascript
// Add to BLOCK_TYPES array
{ name: 'Ice', color: 0xADD8E6, transparent: true, emissive: false }
```

#### Add an Entity Type
1. Create `systems/entities/wolf.js`
2. Use factory pattern:
```javascript
const wolfList = getEntityList('wolves') || [];
const WolfSystem = createEntitySystem('wolf', 'wolves', initWolf, updateWolf);

function createWolf(id, x, z) {
    const group = new THREE.Group();
    // ... build mesh
    return createEntityObject(id, group, x, y, z, { /* extras */ });
}
```
3. Add to [namespace.js](engine/namespace.js): `GAME.world.entities.wolves = []`
4. Add config to [entity-config.js](engine/utils/entity-config.js)
5. Register in [entity-registry.js](systems/entities/entity-registry.js)
6. Add to loading in [main.js](src/main.js)

#### Add a System
1. Create `systems/weather.js`
2. Implement pattern:
```javascript
const WeatherSystem = {
    init() { /* setup */ },
    update(delta) { /* per-frame */ }
};
Systems.register('weather', WeatherSystem);
```
3. Add to `_updateOrder` in [systems.js](engine/systems.js)
4. Add to loading in [main.js](src/main.js)

### Debugging

**Browser Console Commands:**
```javascript
// List all systems
Systems.list()

// Check entity counts
GAME.world.entities.deer.length

// Teleport player
GAME.character.position.set(0, 100, 0)

// Check day/night phase (0 = noon, 0.5 = midnight)
getDayNightPhase()

// Disable a system
Systems.setEnabled('birds', false)

// Check if production
CONFIG.env.isProduction
```

**Recommended:** Install [Three.js Developer Tools](https://chrome.google.com/webstore/detail/threejs-developer-tools/) browser extension.

### Performance Budget

| Metric | Target |
|--------|--------|
| Frame rate | 20 FPS (retro style) |
| Trees | < 5000 |
| Active entities | < 200 |
| Chunk render distance | 6 chunks |
| Memory | < 500MB |

---

## 8. Asset Pipeline

### Audio
- **Format:** MP3
- **Location:** `assets/audio/`
- **Configuration:** In map config:
```json
{
    "audio": {
        "background": "assets/audio/ambient.mp3",
        "volume": 0.5,
        "loop": true
    }
}
```

### Textures
This engine uses **procedural textures** (vertex colors, canvas-generated sprites).

To add a file-based texture:
```javascript
const loader = new THREE.TextureLoader();
const texture = loader.load('assets/textures/stone.png');
const material = new THREE.MeshLambertMaterial({ map: texture });
```

### Models
The engine uses **procedural geometry** (primitives composed in code). No external model files currently.

---

## 9. Configuration

### Environment Detection
[config.js](engine/config.js) auto-detects environment:
```javascript
CONFIG.env.isProduction  // true if not localhost
CONFIG.env.wsBaseUrl     // WebSocket server URL
CONFIG.env.enableLogging // false in production
```

### Map Configuration
Each map has a `config.json`:
```json
{
    "terrain": {
        "size": 50000,
        "seed": "grasslands-v1",
        "noiseParams": { "scale": 0.008, "octaves": 3, "persistence": 0.5 }
    },
    "spawn": { "position": [0, 10, 0], "rotation": [0, 0, 0] },
    "character": { "moveSpeed": 28, "gravity": 25 },
    "trees": { "count": 3000, "radius": 300 },
    "entities": {
        "deer": { "enabled": true, "count": 80 },
        "birds": { "enabled": true, "count": 120 }
    },
    "portals": [
        { "name": "desert", "angle": 45, "color": "#FFD700" }
    ]
}
```

### Server Environment
Create `server/.env`:
```bash
OPENAI_API_KEY=sk-...  # Optional, for NPC chat
PORT=8080              # WebSocket port
```

**Never commit `.env` files.** Add to `.gitignore`.

---

## 10. Troubleshooting

### Top Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Black screen | WebGL not supported | Update browser/drivers, try Chrome |
| White screen | Script loading failed | Check console for errors, verify npm install |
| No mouse control | Pointer lock not activated | Click the canvas |
| Jerky movement | Low frame rate | Reduce tree count, increase pixelation |
| "GAME is undefined" | Script load order wrong | Check main.js loading layers |
| Entities stuck | Wandered off terrain | Reduce wander distance in entity config |
| No sound | Autoplay blocked | Click anywhere to unlock audio context |
| Multiplayer won't connect | Server not running | Run `cd server && npm start` |

### Platform Notes

**macOS:**
- Safari: Pointer lock may require multiple clicks
- Use Chrome for best experience

**Linux:**
- Ensure WebGL is enabled in browser
- Check GPU drivers if black screen

**Mobile:**
- Touch controls enabled (touch screen edges to rotate)
- No pointer lock (expected)
- Shadows disabled for performance

---

## 11. Testing Checklist

### Manual Testing
- [ ] Player spawns and can move (WASD)
- [ ] Jump works (Space)
- [ ] Sprint works (Shift)
- [ ] Mouse look works (after click)
- [ ] First/third person toggle (V)
- [ ] Build mode places blocks (B, left click)
- [ ] Build mode removes blocks (right click)
- [ ] Terraform raises/lowers terrain (T)
- [ ] Day/night cycle progresses
- [ ] Animals spawn and move
- [ ] Map switching works (M or portal)
- [ ] Chat opens (Enter)
- [ ] Audio plays and mutes

### Multiplayer Testing
```bash
# Start both servers
npm run dev          # Terminal 1
cd server && npm start  # Terminal 2

# Open two browser tabs to localhost:3001
# Both players should see each other as green characters
```

---

## 12. Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Follow existing patterns (Systems, GAME namespace)
4. Test using the checklist above
5. Submit a pull request

### Bug Reports
Include:
- Browser and version
- Console errors (screenshot)
- Steps to reproduce
- World seed (if relevant)

---

## 13. License

**License not yet specified.** Contact repository owner for usage rights.

### Third-Party
- [Three.js](https://threejs.org/) — MIT License
- [Vite](https://vitejs.dev/) — MIT License
- [ws](https://github.com/websockets/ws) — MIT License

---

## 14. Documentation Links

| Document | Description |
|----------|-------------|
| [docs/game-modules.md](docs/game-modules.md) | Module dependency overview |
| [docs/MULTIPLAYER_QUICKSTART.md](docs/MULTIPLAYER_QUICKSTART.md) | 5-minute multiplayer setup |
| [docs/MULTIPLAYER_PLAN.md](docs/MULTIPLAYER_PLAN.md) | Multiplayer architecture |
| [docs/MULTIPLAYER_SCALING.md](docs/MULTIPLAYER_SCALING.md) | Scaling strategies |
| [docs/PERFORMANCE_OPTIMIZATIONS.md](docs/PERFORMANCE_OPTIMIZATIONS.md) | Performance details |
| [docs/LOCAL_MULTIPLAYER_SETUP.md](docs/LOCAL_MULTIPLAYER_SETUP.md) | LAN testing |
