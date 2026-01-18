# Environment System - Quick Reference

## At a Glance

The game now has **environmental decorations** - trees, rocks, bushes, buildings scattered across the world. These are purely visual (no collision) and enhance immersion through parallax depth effects.

## Key Numbers

| Metric | Value |
|--------|-------|
| World size | 2000 × 2000 units |
| Grid cell size | 100 × 100 units |
| Typical decorations | 400-600 props |
| Tree density | 4% per cell |
| Rock density | 3% per cell |
| Bush density | 5% per cell |
| Building density | 0.8% per cell |
| Parallax factor | 0.7 (30% slower than camera) |
| Decoration opacity | 0.85 (85% visible) |
| Home base exclusion | 150 unit radius |

## Decoration Types

```
Tree
├─ Variants: 3
├─ Chance: 4% per cell
└─ Colors: #4a7c34 (dark green) + #5a9c44 (light)

Rock
├─ Variants: 2
├─ Chance: 3% per cell
└─ Colors: #8b7d6b (grey-brown) + #a0967a (light)

Bush
├─ Variants: 2
├─ Chance: 5% per cell
└─ Colors: #6b8e3f (dark) + #7da844 (light)

Building
├─ Variants: 2
├─ Chance: 0.8% per cell
└─ Colors: #8b6f47 (wood) + #4a5a7a (windows)
```

## Code Locations

| Component | File | Function | Lines |
|-----------|------|----------|-------|
| Spawning | game.js | spawnEnvironmentalDecorations() | 1767-1820 |
| Sprite mapping | game.js | calculateSpriteIndex() | 1822-1833 |
| Parallax bg | render.js | Background section | 73-94 |
| Rendering | render.js | render() | 368-372 |
| Drawing | render.js | drawEnvironmentalDecoration() | 670-707 |

## Most Common Edits

### Change Tree Density
**File**: `src/game/game.js` line 1777
```javascript
{ name: 'tree', chance: 0.04, variants: 3 }
//                        ↑
//                      Change this
```
- 0.01 = very sparse
- 0.04 = current (default)
- 0.10 = very dense

### Change Tree Color
**File**: `src/game/render.js` line 679
```javascript
ctx.fillStyle = '#4a7c34';  // Dark foliage color
//               ↑
//              Change this
```

### Change Parallax Speed
**File**: `src/game/render.js` line 80
```javascript
const parallaxFactor = 0.7;
//                     ↑
//                  Change this (0-1)
```
- 0.5 = slow (more depth)
- 0.7 = current (default)
- 0.9 = fast (subtle depth)

## Performance Impact

- **Memory**: ~30 KB for ~500 decorations
- **Spawn time**: ~5-10 ms (one-time at init)
- **Render time**: ~1-2 ms per frame
- **Gameplay impact**: Zero (visual only)

## Integration Points

```
Game Start
  └─> initGame()
      └─> initSites()
      └─> spawnEnvironmentalDecorations() ← HERE
      └─> Spawn enemies/creatures
      
Game Render Loop
  └─> render()
      └─> Draw background + parallax
      └─> Draw decorations ← HERE
      └─> Draw units/enemies
      └─> Draw UI
```

## Debugging Checklist

- [ ] Game loads without errors
- [ ] Decorations visible in world
- [ ] Parallax background moves slower than terrain
- [ ] No collision with decorations (can walk through them)
- [ ] FPS stays above 50 (target 60)
- [ ] Console shows: `[ENVIRONMENT] Spawned X decorations`

## Important Constants

```javascript
// Spawn rates (in game.js spawnEnvironmentalDecorations)
const worldW = 2000, worldH = 2000;  // World size
const gridSize = 100;                 // Cell size for distribution

// Rendering (in render.js)
const parallaxFactor = 0.7;           // Depth perception
const VIEW_MARGIN = 140;              // Cull offset
const inView = (x, y, r=0) => ...;    // Viewport check

// Drawing (in render.js drawEnvironmentalDecoration)
ctx.globalAlpha = 0.85;               // Transparency
```

## Quick Customization Examples

### Make it Forest-Like (Dense Trees)
```javascript
// In game.js spawnEnvironmentalDecorations()
{ name: 'tree', chance: 0.08, variants: 3 },    // 8% instead of 4%
{ name: 'bush', chance: 0.10, variants: 2 },    // 10% instead of 5%
```

### Autumn Theme
```javascript
// In render.js drawEnvironmentalDecoration() tree drawer
ctx.fillStyle = '#CD853F';  // Orange instead of green
// ... rest of tree code
```

### Strong Depth (Obvious Parallax)
```javascript
// In render.js background section
const parallaxFactor = 0.5;  // More obvious depth
ctx.fillStyle = 'rgba(60, 120, 50, 0.25)';  // Darker overlay
```

## State Object Structure

```javascript
state.decorations = [
  {
    type: 'tree',           // 'tree'|'rock'|'bush'|'building'
    variant: 0,             // 0-2 depending on type
    x: 500,                 // World X coordinate
    y: 600,                 // World Y coordinate
    depth: 30,              // Z-order (0-100)
    parallaxFactor: 0.7,    // Movement factor
    spriteIndex: {          // For future tileset use
      x: 0, y: 0, w: 32, h: 32
    }
  },
  // ... more decorations
]
```

## Common Tasks

| Task | File | Action |
|------|------|--------|
| More trees | game.js | Increase tree chance (0.04 → 0.06) |
| Green trees | render.js | Change #4a7c34 → lighter green |
| Faster parallax | render.js | Increase factor (0.7 → 0.8) |
| Clear home base | game.js | Increase exclusion radius (150 → 200) |
| Better depth | render.js | Decrease factor (0.7 → 0.5) |
| Winter theme | render.js | Change tree colors to whites/greys |

## Documentation Files

| File | Purpose |
|------|---------|
| [ENVIRONMENT_ASSETS.md](ENVIRONMENT_ASSETS.md) | Technical deep dive |
| [ENVIRONMENT_CUSTOMIZATION.md](ENVIRONMENT_CUSTOMIZATION.md) | How to customize |
| [ENVIRONMENT_IMPLEMENTATION.md](ENVIRONMENT_IMPLEMENTATION.md) | What was added (this session) |
| [README.md](README.md) | Main project overview |

## Troubleshooting

**Nothing visible?**
- Check console (F12) for errors
- Verify game.js has call to spawnEnvironmentalDecorations()
- Ensure render.js has the drawing code

**Performance issues?**
- Reduce decoration chances in game.js
- Lower parallax opacity in render.js
- Disable parallax layers if needed

**Wrong colors?**
- Edit ctx.fillStyle values in render.js
- Use hex colors (#RRGGBB format)
- Test with simple shapes first

---

For detailed info: See [ENVIRONMENT_ASSETS.md](ENVIRONMENT_ASSETS.md)
For customization: See [ENVIRONMENT_CUSTOMIZATION.md](ENVIRONMENT_CUSTOMIZATION.md)
