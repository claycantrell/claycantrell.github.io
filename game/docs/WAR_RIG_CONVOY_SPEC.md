# War Rig Convoy Animation Specification

## Overview

War rigs are autonomous convoy vehicles that travel between player-built structures, NPC settlements, and portal locations. They follow predefined or procedurally-generated routes, creating a living, dynamic world with supply chains and trade routes visible to players.

This document defines the animation system for war rig convoys, including movement patterns, visual effects (dust trails and glow), and performance considerations.

---

## 1. Convoy Types

War rigs come in three types, each with distinct visual and behavioral characteristics:

| Type | Description | Visual Style | Use Case |
|------|-------------|--------------|----------|
| **Supply Runner** | Fast, lightly-armored cargo transport | Small chassis, minimal glow | Short-distance supply routes between nearby buildings |
| **Heavy Hauler** | Slow, heavily-armored freight carrier | Large chassis, medium glow | Long-distance bulk cargo transport |
| **Scout Rig** | Ultra-fast reconnaissance vehicle | Sleek design, bright glow trail | Exploration and rapid message delivery |

---

## 2. Movement Speed Parameters

All speeds are measured in units per second, where 1 unit ≈ 1 meter in game world.

### Base Speed Table

| Convoy Type | Base Speed | Sprint Speed | Turn Rate | Acceleration | Deceleration |
|-------------|------------|--------------|-----------|--------------|--------------|
| Supply Runner | 18 units/s | 28 units/s | 2.0 rad/s | 12 units/s² | 15 units/s² |
| Heavy Hauler | 10 units/s | 14 units/s | 0.8 rad/s | 6 units/s² | 8 units/s² |
| Scout Rig | 32 units/s | 45 units/s | 3.5 rad/s | 20 units/s² | 25 units/s² |

### Speed Modifiers by Terrain

| Terrain Type | Speed Multiplier | Notes |
|--------------|------------------|-------|
| Flat grassland | 1.0× | Default speed |
| Desert sand | 0.85× | Slight drag from loose terrain |
| Rocky/mountain | 0.65× | Rough terrain slowdown |
| Water (shallow) | 0.40× | Significant resistance |
| Snow/ice | 0.90× | Slight slip, but mostly hard-packed |
| Player-built roads | 1.25× | Bonus for infrastructure |

### Speed States

Convoys transition between speed states based on distance to destination and obstacles:

| State | Speed % | Trigger Condition |
|-------|---------|-------------------|
| Cruising | 100% base | Open route, >100 units from destination |
| Approaching | 70% base | 30-100 units from destination |
| Arriving | 40% base | <30 units from destination |
| Sprinting | Sprint speed | Fleeing from threat or urgent delivery |
| Stopped | 0% | At destination or blocked by obstacle |

---

## 3. Dust Trail Visual Effects

Dust trails are particle effects that follow war rigs, intensity based on speed and terrain.

### Dust Particle Parameters

| Parameter | Supply Runner | Heavy Hauler | Scout Rig | Units |
|-----------|---------------|--------------|-----------|-------|
| Particle spawn rate | 15/s | 25/s | 30/s | particles per second |
| Particle lifetime | 2.0s | 3.0s | 1.5s | seconds |
| Particle size (start) | 0.8 | 1.2 | 0.6 | units |
| Particle size (end) | 2.0 | 3.5 | 1.8 | units (growth over lifetime) |
| Vertical spread | 1.5 | 2.0 | 1.2 | units (random Y offset) |
| Horizontal spread | 1.0 | 1.5 | 0.8 | units (random XZ offset) |
| Opacity (start) | 0.6 | 0.7 | 0.5 | alpha value (0-1) |
| Opacity (end) | 0.0 | 0.0 | 0.0 | alpha value (fade to transparent) |

### Dust Colors by Terrain

| Terrain Type | Color (RGB Hex) | Intensity Multiplier |
|--------------|-----------------|---------------------|
| Grassland | `#D4C5A0` (tan-beige) | 0.8× |
| Desert | `#E0C9A6` (sandy tan) | 1.2× |
| Rocky | `#A89F91` (gray-brown) | 1.0× |
| Snow | `#F0F0F0` (white) | 0.6× |
| Dirt path | `#8B7355` (brown) | 1.0× |

### Dust Behavior States

| Speed Range | Spawn Rate Multiplier | Notes |
|-------------|----------------------|-------|
| 0-5 units/s | 0.1× | Minimal dust when nearly stopped |
| 5-15 units/s | 0.5× | Light dust trail |
| 15-25 units/s | 1.0× | Normal dust emission |
| 25-35 units/s | 1.5× | Heavy dust cloud |
| 35+ units/s | 2.0× | Maximum dust (scout rigs only) |

---

## 4. Glow Effects

War rigs emit dynamic glow from engine exhausts, headlights, and cargo bays. Glow intensity reflects speed and operational state.

### Glow Light Sources

Each war rig has multiple point lights:

| Light Position | Supply Runner | Heavy Hauler | Scout Rig |
|----------------|---------------|--------------|-----------|
| **Front headlights** | 2 lights | 4 lights | 2 lights |
| Color | `#FFE4B5` | `#FFE4B5` | `#4DD0E1` |
| Intensity | 20 | 30 | 35 |
| Distance | 40 units | 50 units | 60 units |
| **Engine exhaust** | 1 light | 2 lights | 1 light |
| Color | `#FF6B35` | `#FF4500` | `#00E5FF` |
| Intensity | 15 | 25 | 40 |
| Distance | 25 units | 35 units | 50 units |
| **Cargo glow** | 1 light | 1 light | 0 lights |
| Color | `#FFD700` | `#FFD700` | — |
| Intensity | 10 | 15 | — |
| Distance | 20 units | 30 units | — |

### Glow Intensity Modulation

Lights pulse and flicker based on operational state:

| State | Intensity Multiplier | Pulse Pattern |
|-------|---------------------|---------------|
| Stopped | 0.3× | Slow pulse (0.5 Hz) |
| Idle/Arriving | 0.6× | Steady with subtle flicker |
| Cruising | 1.0× | Steady glow |
| Sprinting | 1.4× | Fast pulse (2 Hz), bright |
| Damaged | 0.4× | Erratic flicker (random) |

### Glow Trail Effect

Scout rigs leave a temporary glowing trail in the air:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Trail length | 20 units | Distance behind rig |
| Trail segments | 15 | Number of trail points |
| Trail lifetime | 1.5 seconds | Fade duration |
| Trail color | `#00E5FF` (cyan) | Matches engine glow |
| Trail opacity (start) | 0.8 | Alpha at spawn |
| Trail opacity (end) | 0.0 | Fade to transparent |
| Trail width | 0.5 units | Ribbon width |

---

## 5. Route Pathfinding

Convoys follow waypoint-based routes with dynamic obstacle avoidance.

### Waypoint System

| Parameter | Value | Description |
|-----------|-------|-------------|
| Waypoint radius | 5 units | Distance to "reach" waypoint |
| Look-ahead distance | 20 units | Distance for obstacle detection |
| Max waypoints per route | 50 | Route complexity limit |
| Reroute check interval | 2.0 seconds | How often to recalculate if blocked |

### Route Generation

Routes are generated using A* pathfinding with terrain cost weighting:

| Terrain Cost Factor | Multiplier | Impact |
|---------------------|------------|--------|
| Flat terrain | 1.0× | Preferred path |
| Steep slope (>30°) | 3.0× | Avoid unless necessary |
| Water crossing | 5.0× | Strongly avoid |
| Player structures | 0.5× | Prefer roads/buildings |
| Out of bounds | ∞ | Cannot path through |

---

## 6. Convoy Spawn and Lifecycle

### Spawn Conditions

| Parameter | Value | Notes |
|-----------|-------|-------|
| Min buildings required | 2 | Need origin and destination |
| Spawn distance from player | >100 units | Avoid spawning in view |
| Max active convoys | 20 | Performance limit |
| Spawn interval | 30-120 seconds | Random between min/max |

### Convoy Lifecycle States

| State | Duration | Behavior |
|-------|----------|----------|
| **Spawning** | 1 second | Fade in, engine start sound |
| **Traveling** | Variable | Active pathfinding and movement |
| **Unloading** | 5-10 seconds | Stopped at destination, cargo lights active |
| **Despawning** | 1 second | Fade out after delivery |

### Cargo Delivery Events

When a convoy reaches its destination:

| Event | Effect |
|-------|--------|
| Resource transfer | Destination building receives cargo (if gameplay system exists) |
| Sound effect | Engine shutdown sound, cargo unload sounds |
| Visual feedback | Dust cloud from braking, cargo bay glow increases then fades |
| XP reward | Player earns points if they built the destination |

---

## 7. Performance Optimization

### LOD (Level of Detail) System

To maintain performance with multiple active convoys:

| Distance from Player | Visual Quality | Performance Impact |
|---------------------|----------------|-------------------|
| 0-50 units | **Full detail** | High polygon mesh, all lights, full dust |
| 50-150 units | **Medium detail** | Simplified mesh, reduced lights (50%), reduced dust (50%) |
| 150-300 units | **Low detail** | Billboard sprite, single light, no dust |
| 300+ units | **Culled** | Not rendered (position updated in background) |

### Particle Limits

| Setting | Max Particles | Notes |
|---------|---------------|-------|
| High quality | 2000 | All effects enabled |
| Medium quality | 1000 | Reduced spawn rates |
| Low quality | 500 | Minimal dust trails |
| Performance mode | 0 | Dust disabled, lights only |

---

## 8. Audio Specifications

### Engine Sounds

| Convoy Type | Base Pitch | Volume | Loop Duration |
|-------------|------------|--------|---------------|
| Supply Runner | 1.0× | 0.6 | 2.5s |
| Heavy Hauler | 0.7× | 0.8 | 3.0s |
| Scout Rig | 1.3× | 0.5 | 2.0s |

### Sound Falloff

| Distance | Volume Multiplier |
|----------|------------------|
| 0-20 units | 1.0× (full) |
| 20-50 units | 0.6× |
| 50-100 units | 0.3× |
| 100+ units | 0.0× (silent) |

---

## 9. Integration Points

### Systems to Implement

1. **ConvoyManager** (`systems/convoy.js`)
   - Spawn/despawn logic
   - Active convoy tracking
   - Route assignment

2. **ConvoyEntity** (`systems/entities/convoy.js`)
   - Individual convoy behavior
   - Physics and movement
   - State machine (spawning, traveling, unloading, despawning)

3. **ConvoyEffects** (`systems/convoy-effects.js`)
   - Dust particle system
   - Glow light management
   - Trail rendering (scout rigs)

4. **ConvoyPathfinding** (`engine/utils/convoy-pathfinding.js`)
   - A* route calculation
   - Waypoint navigation
   - Obstacle avoidance

### Configuration

Add to map config files (`maps/*/config.json`):

```json
{
  "convoys": {
    "enabled": true,
    "spawnInterval": [30, 120],
    "maxActive": 20,
    "types": {
      "supplyRunner": { "enabled": true, "weight": 50 },
      "heavyHauler": { "enabled": true, "weight": 30 },
      "scoutRig": { "enabled": true, "weight": 20 }
    },
    "effects": {
      "dustQuality": "high",
      "glowEnabled": true,
      "audioEnabled": true
    }
  }
}
```

---

## 10. Testing Checklist

### Visual Testing

- [ ] Supply runners spawn and travel between buildings
- [ ] Heavy haulers move slower and emit more dust
- [ ] Scout rigs move fast with cyan glow trails
- [ ] Dust color matches terrain type
- [ ] Glow lights illuminate nearby terrain
- [ ] Convoys slow down when approaching destination
- [ ] Convoys despawn after delivery

### Performance Testing

- [ ] 20 active convoys maintain 20 FPS target
- [ ] LOD system activates at correct distances
- [ ] Particle counts stay within limits
- [ ] No memory leaks over 10-minute session

### Audio Testing

- [ ] Engine sounds play based on convoy type
- [ ] Volume falls off with distance correctly
- [ ] No audio clipping with multiple convoys

---

## 11. Future Enhancements

Potential expansions to the convoy system:

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Player interaction** | Players can attack/defend convoys | High |
| **Cargo variety** | Different cargo types with visual representation | Medium |
| **Weather effects** | Convoys slow in rain/snow, dust behaves differently | Medium |
| **Convoy formation** | Multiple rigs traveling together in formation | High |
| **Dynamic pricing** | Cargo value fluctuates based on supply/demand | High |
| **Bandit AI** | NPC enemies that attack convoys | High |
| **Convoy upgrades** | Players can modify rig speed, armor, capacity | Medium |

---

## 12. Reference Implementation Notes

### Entity Creation Example

```javascript
// Pseudo-code for convoy entity
function createConvoyRig(type, startPos, endPos) {
  const config = CONVOY_CONFIGS[type];
  const group = new THREE.Group();

  // Chassis mesh
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2, 6),
    new THREE.MeshLambertMaterial({
      color: config.chassisColor,
      flatShading: true
    })
  );
  group.add(chassis);

  // Add lights
  config.lights.forEach(lightSpec => {
    const light = new THREE.PointLight(
      lightSpec.color,
      lightSpec.intensity,
      lightSpec.distance
    );
    light.position.copy(lightSpec.position);
    group.add(light);
  });

  // Add dust emitter
  const dustEmitter = createDustEmitter(config.dustParams);
  group.add(dustEmitter);

  return {
    mesh: group,
    position: startPos.clone(),
    destination: endPos.clone(),
    speed: config.baseSpeed,
    state: 'spawning',
    dustEmitter: dustEmitter
  };
}
```

### Animation Loop Example

```javascript
// Pseudo-code for convoy update
function updateConvoy(convoy, delta) {
  if (convoy.state === 'traveling') {
    // Move toward waypoint
    const direction = new THREE.Vector3()
      .subVectors(convoy.currentWaypoint, convoy.position)
      .normalize();

    const speed = convoy.speed * getTerrainMultiplier(convoy.position);
    convoy.position.addScaledVector(direction, speed * delta);

    // Update dust emission based on speed
    convoy.dustEmitter.rate = convoy.dustParams.baseRate * (speed / convoy.baseSpeed);

    // Update glow intensity
    const glowMultiplier = getGlowMultiplier(convoy.state);
    convoy.lights.forEach(light => {
      light.intensity = light.baseIntensity * glowMultiplier;
    });
  }
}
```

---

## Document Version

- **Version:** 1.0.0
- **Last Updated:** 2026-01-23
- **Author:** Polecat AI
- **Status:** Specification approved, pending implementation
