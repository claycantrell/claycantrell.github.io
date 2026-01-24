# Gas Town Building Sprite Specifications

Retro city builder style sprite specifications for Gas Town organizational buildings.

## Design Philosophy

These specifications follow the existing retro 3D sandbox aesthetic:
- Low-poly geometric construction
- Flat shading with simple color palettes
- Distinctive silhouettes for instant recognition
- Procedurally generated from basic Three.js primitives

## Color Palette

Gas Town buildings use an industrial/steampunk color scheme:

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Brass | `0xB5A642` | Accents, trim, mechanical details |
| Steel Gray | `0x71797E` | Structural elements, framework |
| Industrial Red | `0xC1440E` | Emergency/important markers |
| Coal Black | `0x2B2D2F` | Shadows, depth, machinery |
| Steam White | `0xE8E8E8` | Highlights, steam effects |
| Copper | `0xB87333` | Pipes, fittings, decorative |
| Dark Iron | `0x3B3C36` | Heavy machinery, foundations |

---

## 1. Mayor Building

**Function**: Central coordination hub, strategic planning center

### Dimensions
- **Base**: 64x64 pixels (4x4 blocks)
- **Height**: 96 pixels (6 blocks)
- **Roof**: Peaked dome, 32 pixels tall

### Key Features
- Central tower with observation deck at top
- Four corner pillars (8x8 pixels each)
- Grand entrance archway (24 pixels wide, 32 pixels tall)
- Clocktower spire rising from center
- Brass trim around windows and edges

### Color Scheme
- **Base structure**: Steel Gray (`0x71797E`)
- **Roof/dome**: Brass (`0xB5A642`)
- **Pillars**: Dark Iron (`0x3B3C36`)
- **Entrance accent**: Industrial Red (`0xC1440E`)
- **Clock face**: Steam White (`0xE8E8E8`)
- **Trim details**: Copper (`0xB87333`)

### Distinctive Elements
- Rotating clock hands (animated, optional)
- Flag at spire top (Industrial Red)
- Four symmetrical window arrays (2x3 each side)
- Balcony railing at observation level (Brass)

### Construction Notes
```javascript
// Base: BoxGeometry(4, 6, 4) - Steel Gray
// Pillars: 4x CylinderGeometry(0.5, 0.5, 6) - Dark Iron
// Dome: SphereGeometry(2, 8, 4, hemiUp=true) - Brass
// Spire: CylinderGeometry(0.2, 0.3, 2) - Brass
// Clock: CircleGeometry(0.8) on face - Steam White
```

---

## 2. Deacon Building

**Function**: Guidance and knowledge repository, agent training center

### Dimensions
- **Base**: 48x48 pixels (3x3 blocks)
- **Height**: 80 pixels (5 blocks)
- **Roof**: Flat with crenellations

### Key Features
- Library tower aesthetic with tall narrow windows
- Book-spine facade pattern on walls
- Spiral staircase visible through side window
- Rooftop bell or beacon
- Arched doorway with inscribed lintel

### Color Scheme
- **Base structure**: Dark Iron (`0x3B3C36`)
- **Roof crenellations**: Steel Gray (`0x71797E`)
- **Window frames**: Brass (`0xB5A642`)
- **Door**: Copper (`0xB87333`)
- **Beacon/bell**: Steam White (`0xE8E8E8`)
- **Book spines (facade)**: Alternating Copper/Brass

### Distinctive Elements
- Tall thin windows (4 pixels wide, 20 pixels tall) arranged vertically
- Book-spine texture pattern on front wall (8-12 vertical stripes)
- Beacon light on roof (glowing effect)
- Inscribed symbols above door (geometric patterns)
- Corner buttresses for gothic feel

### Construction Notes
```javascript
// Base: BoxGeometry(3, 5, 3) - Dark Iron
// Windows: 6x BoxGeometry(0.1, 1.2, 0.1) - cutouts with Brass frames
// Buttresses: 4x BoxGeometry(0.3, 5, 0.3) at corners - Steel Gray
// Beacon: SphereGeometry(0.3) - Steam White with emissive material
// Crenellations: Pattern of CubeGeometry(0.4, 0.4, 0.4) - Steel Gray
```

---

## 3. Witness Building

**Function**: Monitoring and health oversight, agent status tracking

### Dimensions
- **Base**: 40x40 pixels (2.5x2.5 blocks)
- **Height**: 72 pixels (4.5 blocks)
- **Roof**: Flat observation platform

### Key Features
- Open observation platform at top with railings
- Multiple small windows (surveillance aesthetic)
- Antenna or sensor array on roof
- Asymmetric design (one side has external staircase)
- Signal lights/indicators on corners

### Color Scheme
- **Base structure**: Steel Gray (`0x71797E`)
- **Platform railings**: Brass (`0xB5A642`)
- **Antenna**: Copper (`0xB87333`)
- **Windows**: Coal Black (`0x2B2D2F`) glass
- **Signal lights**: Industrial Red (`0xC1440E`) / Steam White (`0xE8E8E8`)
- **Staircase**: Dark Iron (`0x3B3C36`)

### Distinctive Elements
- Four corner signal lights (blinking animation)
- External staircase on one side (zigzag pattern)
- Multiple small windows (4x4 pixels each) in irregular pattern
- Sensor array (multiple thin cylinders) on roof
- Open platform with safety railings

### Construction Notes
```javascript
// Base: BoxGeometry(2.5, 4.5, 2.5) - Steel Gray
// Platform: BoxGeometry(3, 0.2, 3) on top - Steel Gray
// Railings: 12x CylinderGeometry(0.05, 0.05, 1.2) - Brass
// Stairs: 6x BoxGeometry(0.8, 0.1, 0.4) stepped - Dark Iron
// Antenna: 3-5x CylinderGeometry(0.05, 0.05, 1.5) - Copper
// Signal lights: 4x SphereGeometry(0.15) at corners - Red/White emissive
```

---

## 4. Polecats Building

**Function**: Worker housing and dispatch center, agent spawn point

### Dimensions
- **Base**: 80x48 pixels (5x3 blocks)
- **Height**: 56 pixels (3.5 blocks)
- **Roof**: Angled shed roof

### Key Features
- Long rectangular barracks style
- Multiple identical doorways (worker entrance/exit)
- Row of small windows along top
- Industrial sliding doors at ends
- Smokestacks or ventilation on roof

### Color Scheme
- **Base structure**: Dark Iron (`0x3B3C36`)
- **Roof**: Coal Black (`0x2B2D2F`)
- **Doors**: Steel Gray (`0x71797E`)
- **Window shutters**: Brass (`0xB5A642`)
- **Smokestacks**: Copper (`0xB87333`)
- **Trim**: Industrial Red (`0xC1440E`)

### Distinctive Elements
- 5 identical doorways (evenly spaced, 8 pixels wide)
- Row of 8 small windows (6x6 pixels) below roofline
- 2 smokestacks emitting steam particles
- Sliding door tracks (painted Industrial Red)
- Tool racks or equipment visible near doors

### Construction Notes
```javascript
// Base: BoxGeometry(5, 3.5, 3) - Dark Iron
// Roof: Custom geometry (slanted) - Coal Black
// Doors: 5x BoxGeometry(0.4, 0.8, 0.05) - Steel Gray
// Windows: 8x BoxGeometry(0.3, 0.3, 0.05) - Brass frames
// Smokestacks: 2x CylinderGeometry(0.2, 0.2, 1) - Copper
// Steam particles: ParticleSystem (white, rising)
```

---

## 5. Refinery Building

**Function**: Work processing and merge queue, completion verification

### Dimensions
- **Base**: 64x80 pixels (4x5 blocks)
- **Height**: 88 pixels (5.5 blocks)
- **Roof**: Multi-level industrial platform

### Key Features
- Multi-tier industrial complex
- Large conveyor or pipeline system
- Processing towers at different heights
- Steam/smoke emissions
- Loading bay with mechanical arms

### Color Scheme
- **Base structure**: Dark Iron (`0x3B3C36`)
- **Processing towers**: Steel Gray (`0x71797E`)
- **Conveyors/pipes**: Copper (`0xB87333`)
- **Mechanical arms**: Brass (`0xB5A642`)
- **Steam outlets**: Steam White (`0xE8E8E8`)
- **Warning stripes**: Industrial Red (`0xC1440E`) / Coal Black (`0x2B2D2F`)

### Distinctive Elements
- Three processing towers (varying heights: 3, 4.5, 5.5 blocks)
- Pipeline network connecting towers (visible pipes)
- Conveyor system running from entrance to towers
- Mechanical crane/arm at loading bay
- Steam vents with particle effects
- Warning stripe patterns on dangerous areas

### Construction Notes
```javascript
// Main building: BoxGeometry(4, 3, 5) - Dark Iron
// Towers: 3x CylinderGeometry(0.6, 0.6, heights) - Steel Gray
// Pipes: Multiple CylinderGeometry(0.15, 0.15, lengths) - Copper
// Conveyor: BoxGeometry(0.4, 0.1, 3) with scrolling texture - Steel Gray
// Mechanical arm: Multiple BoxGeometry + CylinderGeometry joints - Brass
// Steam vents: 4-6x ParticleSystem - Steam White
// Warning stripes: Diagonal BoxGeometry pattern - Red/Black
```

---

## Implementation Guidelines

### Scale Reference
- 1 block unit = 16 pixels
- Buildings sized relative to existing player character (1x2x1 blocks)
- Maintain proportions for isometric city builder view

### Animation Recommendations
- **Mayor**: Rotating clock hands (1 rotation per 60 seconds)
- **Deacon**: Pulsing beacon light (1-2 second cycle)
- **Witness**: Blinking corner signals (random intervals)
- **Polecats**: Rising steam from smokestacks
- **Refinery**: Steam vents, conveyor movement, mechanical arm motion

### Lighting
All buildings should use:
- Flat shading (consistent with existing style)
- Ambient light only (no dynamic shadows)
- Emissive materials for lights/indicators
- Optional particle systems for steam/smoke

### LOD Considerations
For performance with multiple buildings:
- **LOD 0** (near): Full geometry with animations
- **LOD 1** (medium): Simplified geometry, essential animations only
- **LOD 2** (far): Basic box shape with primary color

### File Organization
Suggested placement in codebase:
```
game/
  systems/
    buildings/
      gastown/
        mayor.js
        deacon.js
        witness.js
        polecats.js
        refinery.js
      gastown-config.js  // Color palette and shared constants
```

---

## Comparison Matrix

| Building | Width | Depth | Height | Blocks | Primary Color | Distinctive Feature |
|----------|-------|-------|--------|--------|---------------|---------------------|
| Mayor | 64px | 64px | 96px | 4x4x6 | Steel Gray | Clock tower with dome |
| Deacon | 48px | 48px | 80px | 3x3x5 | Dark Iron | Library tower with beacon |
| Witness | 40px | 40px | 72px | 2.5x2.5x4.5 | Steel Gray | Observation platform |
| Polecats | 80px | 48px | 56px | 5x3x3.5 | Dark Iron | Barracks with smokestacks |
| Refinery | 64px | 80px | 88px | 4x5x5.5 | Dark Iron | Multi-tower industrial complex |

---

## Visual Hierarchy

Buildings arranged by prominence:
1. **Mayor** - Tallest, most ornate, central landmark
2. **Refinery** - Largest footprint, complex structure
3. **Deacon** - Tall but narrow, distinctive beacon
4. **Polecats** - Long and low, worker-scale
5. **Witness** - Smallest but elevated platform for sightlines

This creates natural visual flow from administrative (Mayor) → processing (Refinery) → guidance (Deacon) → workers (Polecats) with oversight (Witness) positioned for observation.

---

## Technical Notes

### Material Configuration
```javascript
const gastownMaterials = {
  brass: new THREE.MeshLambertMaterial({
    color: 0xB5A642,
    flatShading: true
  }),
  steelGray: new THREE.MeshLambertMaterial({
    color: 0x71797E,
    flatShading: true
  }),
  industrialRed: new THREE.MeshLambertMaterial({
    color: 0xC1440E,
    flatShading: true
  }),
  // ... etc
};
```

### Collision Bounds
All buildings should have simplified box collision:
```javascript
// Example for Mayor building
const mayorCollision = new THREE.Box3(
  new THREE.Vector3(-2, 0, -2),  // min (half width/depth)
  new THREE.Vector3(2, 6, 2)      // max (half width/depth, height)
);
```

### Placement Grid
Buildings snap to 2-unit grid (consistent with existing block placement):
```javascript
position.x = Math.round(position.x / 2) * 2;
position.z = Math.round(position.z / 2) * 2;
position.y = 0; // Ground level
```

---

*Specifications v1.0 - Created for Gas Town integration into retro city builder*
