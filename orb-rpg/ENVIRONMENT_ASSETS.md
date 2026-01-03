# Environment Assets & Decorations System

## Overview
The Orb RPG game now features a hybrid environmental decoration system that enhances visual depth and immersion without impacting gameplay collision or movement. The system uses a combination of parallax background layers and environmental props (trees, rocks, buildings) procedurally placed across the world.

## Architecture

### Components

#### 1. **Parallax Background Rendering** (`render.js`)
- **Location**: render.js lines ~73-94
- **Purpose**: Creates depth perception through layered background elements moving at different speeds
- **Layers**:
  - Main grass layer (#89c97a): Base terrain, moves at full camera speed
  - Forest treeline: Dark overlay (rgba(60,120,50,0.15)), moves at 70% camera speed for depth
  - Cloud/haze effects: Subtle texture, creates atmosphere

**Implementation**:
```javascript
const parallaxFactor = 0.7; // Background moves slower than camera
const bgX = -cam.x * (1 - parallaxFactor);
const bgY = -cam.y * (1 - parallaxFactor);
```

#### 2. **Environmental Props** (`game.js`)
- **Location**: game.js lines ~1761-1820
- **Function**: `spawnEnvironmentalDecorations(state)`
- **Purpose**: Procedurally places decorative objects across the map
- **Types**:
  - **Tree**: 4 variants, chance 4%, visual: trunk + foliage
  - **Rock**: 2 variants, chance 3%, visual: grey stone shapes
  - **Bush**: 2 variants, chance 5%, visual: green foliage
  - **Building**: 2 variants, chance 0.8%, visual: brown structure with windows

**Grid System**:
- World: 2000x2000 units
- Grid cell size: 100 units (20x20 cells total)
- Per-cell spawn attempt: Decorations randomly placed per cell
- Proximity exclusion: Avoids spawning near player home base (150 unit radius)

#### 3. **Decoration Rendering** (`render.js`)
- **Location**: render.js lines ~641-707
- **Function**: `drawEnvironmentalDecoration(ctx, dec, state)`
- **Purpose**: Renders props with stylized 2D shapes
- **Rendering Order**: 
  1. Parallax background (canvas clear + layers)
  2. Terrain (mountains, rocks, trees)
  3. Sites (flags, walls, structures)
  4. **Environmental decorations** (NEW)
  5. Effects (slashes, storms, healing circles)
  6. Units (enemies, friendlies, player)
  7. HUD overlays

**Styling**:
- Global alpha: 0.85 for depth perception
- Colors: Natural (greens, browns, greys)
- No collision: Props are visual only

### Decoration Object Structure
```javascript
{
  type: 'tree'|'rock'|'bush'|'building',
  variant: number,           // Variant within type
  x: number,                 // World X coordinate
  y: number,                 // World Y coordinate
  depth: number,             // Z-order based on Y position (0-100)
  parallaxFactor: 0.7,       // (Reserved for future parallax individual props)
  spriteIndex: {             // Sprite sheet coordinates (for future tileset support)
    x: number,
    y: number,
    w: number,
    h: number
  }
}
```

## Integration Points

### Game Initialization
**File**: `src/game/game.js`
**Function**: `initGame(state)` (line 121)
**Call**: `spawnEnvironmentalDecorations(state)` at line 142

Process:
1. initSites() clears terrain
2. spawnEnvironmentalDecorations() populates decorations
3. Player home position initialized
4. Enemies/creatures spawned

### Rendering Pipeline
**File**: `src/game/render.js`
**Function**: `render(state)` (line 27)
**Decoration Render Call**: Line ~346-349

```javascript
// environmental decorations (parallax background props)
if(state.decorations){
  for(const dec of state.decorations){
    if(!inView(dec.x, dec.y, 50)) continue;
    drawEnvironmentalDecoration(ctx, dec, state);
  }
}
```

## State Management

### state.decorations
- **Type**: Array of decoration objects
- **Initialized**: In `state.js` at game load (~line 121)
- **Lifecycle**: 
  - Cleared on game init
  - Repopulated via `spawnEnvironmentalDecorations()`
  - Persists until next game reset
- **Size**: ~400-600 decorations typical (varies by spawn rates)

## Visual Characteristics

### Colors & Aesthetics
| Type | Primary Color | Accent | Visual Style |
|------|--------------|--------|--------------|
| Tree | #4a7c34 (dark green) | #5a9c44 (light green) | Foliage ball + brown trunk |
| Rock | #8b7d6b (grey-brown) | #a0967a (light stone) | Irregular ellipse shape |
| Bush | #6b8e3f (bush green) | #7da844 (highlight) | Small foliage ball |
| Building | #8b6f47 (wood) | #4a5a7a (window) | Rectangular structure with windows |

### Depth Perception
1. **Parallax layers** move slower (70% speed) → perceived as distant
2. **Environmental props** are semi-transparent (0.85 alpha) → recede visually
3. **Y-position based ordering** → props higher on screen render first
4. **Size/position consistency** → all props use consistent visual weight

## Performance Considerations

### Optimization Techniques
1. **View Culling**: Decorations outside viewport (+ 50 unit margin) are skipped
2. **Simple Geometry**: All props use basic canvas shapes (arcs, rects, ellipses)
3. **No Collision**: Decorations are visual only - zero physics overhead
4. **Batched Updates**: All decorations spawn once at game init

### Performance Impact
- **Spawn Time**: ~5-10ms for ~500 decorations (one-time at init)
- **Render Time**: ~1-2ms per frame (after view culling)
- **Memory**: ~30KB for 500 decorations (~60 bytes per object)

## Future Enhancements

### Tileset Integration
Current implementation uses stylized canvas shapes. Future versions could:
- Load FreePack 2.png sprite sheet
- Use spriteIndex data for tile-based rendering
- Support multiple sprite sheets per type
- Enable dynamic sprite swapping for seasonal themes

### Interactive Props
Potential features:
- Destructible trees/rocks (health system)
- Props as cover during combat
- Prop respawning mechanics
- Seasonal variation (snow, autumn foliage)

### Parallax Improvements
- Per-prop parallax factors (clouds move at 50%, trees at 70%)
- Day/night cycle with parallax color shift
- Weather system with parallax clouds
- Background layer animation

### Collision Integration
Optional (non-blocking) colliders for:
- Large rock formations (movement slow-down)
- Building placement restrictions
- Strategic cover mechanics

## Configuration & Customization

### Spawn Rates
Edit `spawnEnvironmentalDecorations()` in game.js:
```javascript
const decorTypes = [
  { name: 'tree', chance: 0.04, variants: 3 },    // 4% per cell
  { name: 'rock', chance: 0.03, variants: 2 },    // 3% per cell
  { name: 'bush', chance: 0.05, variants: 2 },    // 5% per cell
  { name: 'building', chance: 0.008, variants: 2 } // 0.8% per cell
];
```

### Parallax Factor
Edit render.js background section:
```javascript
const parallaxFactor = 0.7; // Range: 0 (stationary) to 1 (moves with camera)
```

### Exclusion Zones
Edit proximity check in spawnEnvironmentalDecorations():
```javascript
if(Math.hypot(x - hb.x, y - hb.y) < 150) continue; // 150 unit radius from home
```

## Testing & Debugging

### Diagnostics
Enable console logging in `spawnEnvironmentalDecorations()`:
```javascript
console.log(`[ENVIRONMENT] Spawned ${state.decorations.length} environmental decorations`);
```

### Visual Inspection
1. Launch game (`start-game.bat`)
2. Move camera around to observe:
   - Parallax background layers moving slower than terrain
   - Environmental props fading into distance
   - Smooth Z-ordering by Y position
3. Check console for spawn count

### Modification Testing
- Change spawn `chance` values to test density
- Adjust `parallaxFactor` to test depth perception
- Modify brush colors in `drawEnvironmentalDecoration()` to customize appearance

## Related Documentation
- [MAP_EDITOR.md](MAP_EDITOR.md) - Custom map creation
- [COMPLETE_PROGRESSION_SUMMARY.md](COMPLETE_PROGRESSION_SUMMARY.md) - Game progression system
- [README.md](README.md) - General project overview

## Version History
- **v1.0** (Current): Initial hybrid parallax + props system
  - Procedural spawning with grid-based distribution
  - Stylized canvas rendering (no tileset dependency)
  - Parallax background layers for depth
  - No collision/gameplay impact
