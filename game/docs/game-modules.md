# 3D Demo - Standalone Module

This is a standalone 3D interactive demo/game built with Three.js. The entire demo is self-contained and can be easily extracted from the main project.

## File Structure

```
game/
├── index.html         (Entry point)
├── css/
│   └── 3d-demo.css    (Game styles)
├── js/
│   ├── README.md      (this file)
│   ├── core.js        (Scene setup, initialization, global variables)
│   ├── character.js   (Character creation and movement)
│   ├── world.js       (Environment: portals, trees, ground)
│   ├── controls.js    (Input handling: keyboard + touch)
│   ├── audio.js       (Audio management)
│   ├── ui.js          (UI elements: notifications, instructions)
│   └── game.js        (Main game loop and portal logic)
├── assets/
│   └── audio/
│       └── background.mp3
├── server/            (Multiplayer server)
└── docs/              (Documentation)
```

## Dependencies

- **Three.js r128** (loaded from CDN)
- **FontLoader** (Three.js example)
- **TextGeometry** (Three.js example)
- **CSS**: `../css/3d-demo.css`
- **Audio**: `../assets/audio/background.mp3`

## Load Order

Scripts must be loaded in this specific order:

1. Three.js libraries (CDN)
2. `core.js` - Sets up globals and initializes
3. `character.js` - Character creation
4. `world.js` - Environment creation
5. `controls.js` - Input setup
6. `audio.js` - Audio setup
7. `ui.js` - UI setup
8. `game.js` - Starts the game loop

## Global Variables (from core.js)

These are accessible across all modules:

- `scene`, `camera`, `renderer` - Three.js core objects
- `character` - The player character
- `portals[]` - Array of portal objects
- `objects[]` - Array of collision objects
- `moveForward`, `moveBackward`, `rotateLeft`, `rotateRight` - Movement flags
- `font` - Loaded font for text rendering
- `audio`, `listener`, `audioLoader` - Audio system
- `pixelRatio` - Device-specific pixel ratio

## Multiplayer Support

The demo includes optional lightweight multiplayer support:

1. **Server**: Simple WebSocket server in `server/multiplayer-server.js`
2. **Client**: `multiplayer.js` and `other-players.js` handle connections and rendering
3. **Setup**: See `MULTIPLAYER_PLAN.md` for details

To enable multiplayer:
- Start the server: `cd server && npm install && npm start`
- The client automatically connects (works without server too - graceful degradation)

## How to Extract

The game is already self-contained in the `game/` directory. To use it standalone:

1. Copy the entire `game/` folder to your project
2. Ensure Three.js CDN links are still valid
3. (Optional) Set up the multiplayer server: `cd game/server && npm install && npm start`

## Future Expansion

Easy to add new features:

- **enemies.js** - Enemy AI and behavior
- **items.js** - Collectible items
- **collision.js** - Advanced collision detection
- **effects.js** - Visual effects and particles
- **levels.js** - Level management system
- **config.js** - Game configuration/constants

