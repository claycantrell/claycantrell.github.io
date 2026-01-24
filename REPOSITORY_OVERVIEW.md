# Repository Overview: claycantrell

## Summary

This is a personal portfolio and game development repository containing multiple projects:

1. **Graceful World** - A fully-featured 3D sandbox game
2. **Portfolio Landing Page** - Interactive physics demonstrations
3. **Gas Town Design Specifications** - UI/UX design documentation

## Main Projects

### 1. Graceful World (3D Sandbox Game)

**Location:** `/game/`

**Description:** A browser-based 3D sandbox game inspired by Minecraft, built entirely with Three.js.

**Key Features:**
- Procedural terrain generation with biomes and caves
- Minecraft-style block building (8 block types including light-emitting torches)
- Real-time terrain sculpting (terraforming)
- Wildlife AI with 9 animal types (deer, bunny, bird, cow, butterfly, crab, frog, panda, penguin) featuring behavioral states
- NPC chat powered by OpenAI integration
- Optional WebSocket-based multiplayer
- Day/night cycle (4-minute loop)
- First-person and third-person camera modes
- Map switching via portals

**Technical Stack:**
- Three.js (3D rendering engine)
- Vite (build tool)
- Simplex noise for procedural generation
- WebSocket for multiplayer
- Node.js server for multiplayer coordination

**Current Status:** Alpha - playable with core features implemented

**Documentation:** Comprehensive README.md with:
- Quick start guide
- Project structure explanation
- Controls reference
- Developer workflow
- API documentation
- Troubleshooting guide

### 2. Portfolio Landing Page

**Location:** `/pages/home.html`

**Description:** Personal portfolio page featuring interactive physics demonstrations.

**Features:**
- MatterJS physics simulations
- p5.js graphics
- Interactive magnets and beads
- Links to professional profiles (LinkedIn, GitHub, YouTube)
- Resume download
- Navigation to 3D game

**Technologies:**
- MatterJS (physics engine)
- p5.js (creative coding library)
- Materialize CSS (UI framework)

### 3. Gas Town Design Specifications

**Location:** `/docs/` and `/game/docs/`

**Description:** Design documentation for a Mad Max-inspired UI theme.

**Includes:**
- `/docs/MAD_MAX_THEME_SPEC.md` - Color palette and typography specifications
  - Color scheme: Rust, Fire, Oil, Brass, Metal
  - Typography: Share Tech Mono (primary), Russo One (display)
  - Accessibility guidelines
- `/game/docs/WAR_RIG_CONVOY_SPEC.md` - Animation specifications for convoy system
- `/game/docs/GASTOWN_SPRITE_SPECS.md` - Sprite specifications for Gas Town buildings

## Repository Structure

```
claycantrell/
├── game/                    # Main 3D sandbox game
│   ├── src/                 # Game source code (main.js bootstrapper)
│   ├── engine/              # Core game engine (11 modules)
│   ├── systems/             # Game systems (terrain, character, entities, caves, etc.)
│   ├── multiplayer/         # Networking code
│   ├── server/              # Node.js multiplayer server
│   ├── maps/                # World configurations
│   ├── assets/              # Game assets (audio)
│   ├── docs/                # Game-specific documentation (8+ guides)
│   └── package.json         # Game dependencies
├── pages/                   # Portfolio pages
│   └── home.html           # Main landing page
├── assets/                  # Shared assets
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript demos
│   ├── documents/          # PDFs (resume)
│   └── media/              # Images
├── templates/              # PHP templates
│   ├── header.php
│   └── footer.php
├── docs/                   # Root-level design specifications
│   └── MAD_MAX_THEME_SPEC.md
├── hue.js                  # Utility: hue picker function
└── .gitignore

```

## Utility Files

### hue.js

**Purpose:** Simple utility function for generating random HSL colors within a hue range.

**Function:** `huePicker(startingHue, hueRangeNum)`
- Returns a random HSL color string within the specified hue range
- Used for dynamic color generation in demos

## Technologies Used

### Game (Graceful World)
- **Three.js** ^0.160.0 - 3D graphics engine
- **Vite** ^5.0.0 - Build tool and dev server
- **Terser** ^5.44.1 - JavaScript minifier
- **vite-plugin-static-copy** - Asset copying

### Portfolio Page
- **p5.js** 1.4.0 - Creative coding library
- **MatterJS** 0.17.1 - 2D physics engine
- **Materialize CSS** 1.0.0 - Material design framework

### Server
- **WebSocket** - Real-time multiplayer communication
- **OpenAI API** - NPC conversational AI (optional)

## Getting Started

### Running the 3D Game

```bash
cd game
npm install
npm run dev
# Open http://localhost:3001
```

### Running with Multiplayer

```bash
# Terminal 1: Game client
cd game
npm run dev

# Terminal 2: Multiplayer server
cd game/server
npm install
npm start
```

### Viewing Portfolio Page

Simply open `pages/home.html` in a web browser.

## Recent Development Activity

Based on git history, recent work includes:
- Gas Town building sprite specifications
- War rig convoy animation specifications
- Mad Max theme UI design
- Fly mode improvements (floor clipping fixes, speed adjustments)
- Biome-specific animal spawning
- Sprite LOD system for shrubs
- Tree variants for new biomes

## Requirements

### For 3D Game
- Node.js 18+
- npm 9+
- Modern browser with WebGL 2.0 support
- GPU with WebGL support

### For Portfolio Page
- Modern web browser
- No build process required

## License

License not yet specified in the repository.

## Third-Party Dependencies

All major dependencies are MIT licensed:
- Three.js
- Vite
- p5.js
- MatterJS
- ws (WebSocket library)

## Author

Clay Cantrell
- GitHub: https://github.com/claycantrell
- LinkedIn: https://www.linkedin.com/in/clay-cantrell-808676202/
- YouTube: https://www.youtube.com/watch?v=CJ8ynwcnMAU

## Project Purpose

This repository serves multiple purposes:
1. **Portfolio showcase** - Demonstrates game development and interactive programming skills
2. **Active game development** - Ongoing development of Graceful World sandbox game
3. **Design documentation** - Specifications for related projects (Gas Town UI theme)
4. **Experimental playground** - Physics simulations and creative coding experiments
