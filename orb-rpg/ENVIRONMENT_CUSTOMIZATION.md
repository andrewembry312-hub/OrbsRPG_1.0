# Environment Customization Guide

## Quick Start: Adjusting Spawn Density

### Increase Visual Clutter (More Decorations)
**File**: `src/game/game.js` → `spawnEnvironmentalDecorations()` function

**Current values**:
```javascript
const decorTypes = [
  { name: 'tree', chance: 0.04, variants: 3 },
  { name: 'rock', chance: 0.03, variants: 2 },
  { name: 'bush', chance: 0.05, variants: 2 },
  { name: 'building', chance: 0.008, variants: 2 }
];
```

**To increase by 50%** (denser forest):
```javascript
const decorTypes = [
  { name: 'tree', chance: 0.06, variants: 3 },      // 4% → 6%
  { name: 'rock', chance: 0.045, variants: 2 },     // 3% → 4.5%
  { name: 'bush', chance: 0.075, variants: 2 },     // 5% → 7.5%
  { name: 'building', chance: 0.012, variants: 2 }  // 0.8% → 1.2%
];
```

**To decrease by 50%** (sparse landscape):
```javascript
const decorTypes = [
  { name: 'tree', chance: 0.02, variants: 3 },      // 4% → 2%
  { name: 'rock', chance: 0.015, variants: 2 },     // 3% → 1.5%
  { name: 'bush', chance: 0.025, variants: 2 },     // 5% → 2.5%
  { name: 'building', chance: 0.004, variants: 2 }  // 0.8% → 0.4%
];
```

## Changing Decoration Colors

### Example: Make Trees Darker
**File**: `src/game/render.js` → `drawEnvironmentalDecoration()` function

**Find the tree drawer**:
```javascript
tree: () => {
  ctx.fillStyle = '#5d4e37';  // Trunk color
  ctx.fillRect(dec.x - 6, dec.y - 4, 12, 12);
  ctx.fillStyle = '#4a7c34';  // Dark foliage ← CHANGE THIS
  ctx.beginPath();
  ctx.arc(dec.x, dec.y - 14, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a9c44';  // Light foliage ← AND THIS
  ctx.beginPath();
  ctx.arc(dec.x - 4, dec.y - 16, 8, 0, Math.PI * 2);
  ctx.fill();
}
```

**Modify colors**:
```javascript
tree: () => {
  ctx.fillStyle = '#3d2d17';  // Darker trunk
  ctx.fillRect(dec.x - 6, dec.y - 4, 12, 12);
  ctx.fillStyle = '#2d5c24';  // Much darker green
  ctx.beginPath();
  ctx.arc(dec.x, dec.y - 14, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d6c34';  // Darker highlight
  ctx.beginPath();
  ctx.arc(dec.x - 4, dec.y - 16, 8, 0, Math.PI * 2);
  ctx.fill();
}
```

### Color Palette Reference

**Forest Colors**:
- Dark green: #2d5c24, #3d6c34, #4a7c34
- Light green: #5a9c44, #6aac54, #7abc64
- Trunk brown: #3d2d17, #5d4e37, #6d5e47

**Stone Colors**:
- Dark grey: #6b5d4b, #7b6d5b, #8b7d6b
- Light grey: #9b8d7b, #a0967a, #b0a68a

**Bush Colors**:
- Dark: #5b7e2f, #6b8e3f, #7b9e4f
- Light: #7da844, #8db854, #9dc864

**Building Colors**:
- Wood: #6b5637, #7b6647, #8b7657, #9b8667
- Stone: #7a7a7a, #8a8a8a, #9a9a9a
- Window: #2a3a5a, #3a4a6a, #4a5a7a

## Adjusting Parallax Effect

### Increase Depth Perception
**File**: `src/game/render.js` → Parallax factor in background section

**Current**:
```javascript
const parallaxFactor = 0.7; // Background moves at 70% camera speed
```

**For more depth** (more difference between foreground/background):
```javascript
const parallaxFactor = 0.5; // Much slower background movement
```

**For less depth** (background moves more with camera):
```javascript
const parallaxFactor = 0.85; // Nearly matches camera speed
```

### Adjust Parallax Layer Opacity

**Current**:
```javascript
// Distant forest treeline
ctx.fillStyle = 'rgba(60, 120, 50, 0.15)';  // ← Change 0.15

// Cloud/haze effects
ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'; // ← Change 0.04
```

**More visible parallax layers** (stronger depth):
```javascript
ctx.fillStyle = 'rgba(60, 120, 50, 0.25)';  // Darker forest overlay
ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'; // More visible clouds
```

**Subtle parallax** (less obvious depth):
```javascript
ctx.fillStyle = 'rgba(60, 120, 50, 0.08)';  // Barely visible forest
ctx.fillStyle = 'rgba(255, 255, 255, 0.02)'; // Almost invisible clouds
```

## Changing Decoration Transparency

### Make Decorations More Opaque
**File**: `src/game/render.js` → `drawEnvironmentalDecoration()` function

**Current**:
```javascript
ctx.globalAlpha = 0.85; // Semi-transparent
```

**More visible** (less transparent):
```javascript
ctx.globalAlpha = 0.95; // Nearly solid
```

**More transparent**:
```javascript
ctx.globalAlpha = 0.6; // Very faded
```

## Adjusting Spawn Exclusion Zone

### Make Decorations Appear Closer to Base
**File**: `src/game/game.js` → In spawnEnvironmentalDecorations()

**Current** (avoids 150 units from home):
```javascript
const hb = playerHome(state);
if(Math.hypot(x - hb.x, y - hb.y) < 150) continue;
```

**Tighter exclusion** (only near immediate base):
```javascript
if(Math.hypot(x - hb.x, y - hb.y) < 50) continue; // 50 unit radius
```

**Larger exclusion** (keeps decorations far away):
```javascript
if(Math.hypot(x - hb.x, y - hb.y) < 250) continue; // 250 unit radius
```

## Adding New Decoration Types

### Example: Add Pine Trees

**Step 1: Add to decorTypes array** (game.js):
```javascript
const decorTypes = [
  { name: 'tree', chance: 0.04, variants: 3 },
  { name: 'pine', chance: 0.02, variants: 2 },    // NEW
  { name: 'rock', chance: 0.03, variants: 2 },
  // ... rest
];
```

**Step 2: Add sprite index mapping** (game.js):
```javascript
function calculateSpriteIndex(type, variant){
  const spriteMap = {
    'tree': { base: 0, width: 32, height: 32 },
    'pine': { base: 150, width: 32, height: 32 }, // NEW
    'rock': { base: 100, width: 32, height: 32 },
    // ... rest
  };
  // ... rest
}
```

**Step 3: Add drawing function** (render.js):
```javascript
const types = {
  tree: () => { /* existing */ },
  pine: () => {
    // Narrow, tall conifer shape
    ctx.fillStyle = '#2d5024'; // Dark green
    ctx.beginPath();
    ctx.moveTo(dec.x, dec.y - 18);
    ctx.lineTo(dec.x - 8, dec.y - 4);
    ctx.lineTo(dec.x - 5, dec.y - 6);
    ctx.lineTo(dec.x - 12, dec.y + 4);
    ctx.lineTo(dec.x + 12, dec.y + 4);
    ctx.lineTo(dec.x + 5, dec.y - 6);
    ctx.lineTo(dec.x + 8, dec.y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d4e37'; // Trunk
    ctx.fillRect(dec.x - 4, dec.y + 4, 8, 8);
  },
  rock: () => { /* existing */ },
  // ... rest
};
```

## Seasonal Variations

### Spring/Summer (Current)
- Green foliage: #4a7c34 → #6aac54
- Bright buildings: #8b6f47
- Active decorations (all spawned)

### Autumn Theme
```javascript
tree: () => {
  ctx.fillStyle = '#8B4513';  // Orange-brown trunk
  ctx.fillRect(dec.x - 6, dec.y - 4, 12, 12);
  ctx.fillStyle = '#CD853F';  // Orange foliage
  ctx.beginPath();
  ctx.arc(dec.x, dec.y - 14, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#DAA520';  // Golden highlight
  ctx.beginPath();
  ctx.arc(dec.x - 4, dec.y - 16, 8, 0, Math.PI * 2);
  ctx.fill();
}
```

### Winter Theme
```javascript
tree: () => {
  ctx.fillStyle = '#5d4e37';  // Dark trunk
  ctx.fillRect(dec.x - 6, dec.y - 4, 12, 12);
  ctx.fillStyle = '#F0F8FF';  // Snow-covered
  ctx.beginPath();
  ctx.arc(dec.x, dec.y - 14, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';  // Pure white highlight
  ctx.beginPath();
  ctx.arc(dec.x - 4, dec.y - 16, 8, 0, Math.PI * 2);
  ctx.fill();
}
```

## Performance Tuning

### If Game Feels Slow
1. **Reduce decoration count**:
   - Decrease all `chance` values by 50%
   
2. **Disable parallax layers** (game.js):
   ```javascript
   // Comment out parallax rendering
   // ctx.fillStyle = 'rgba(60, 120, 50, 0.15)';
   // ctx.fillRect(bgX, bgY, 2000, 2000);
   ```

3. **Simplify decoration shapes** (render.js):
   - Replace `ctx.arc()` with `ctx.fillRect()`
   - Use fewer draw commands per type

### If You Want More Detail
1. **Increase variant count**:
   ```javascript
   { name: 'tree', chance: 0.04, variants: 6 }, // Was 3
   ```

2. **Add more complex drawing**:
   - Use `ctx.lineTo()` for angular shapes
   - Layer multiple shapes for detail

## Testing Your Changes

1. **Make one change**
2. **Reload game** (F5 or restart server)
3. **Observe the effect** (move around world)
4. **Verify no console errors** (F12 → Console tab)
5. **Adjust if needed**

## Debug: View Spawn Grid

To visualize the spawn grid, add this to `spawnEnvironmentalDecorations()`:
```javascript
// Debug: Draw grid cells (remove in production)
if(Math.random() < 0.1){ // Sample 10% of cells
  state.decorations.push({
    type: 'rock',
    variant: 0,
    x: gx + gridSize/2,
    y: gy + gridSize/2,
    depth: 50,
    parallaxFactor: 0.7,
    spriteIndex: calculateSpriteIndex('rock', 0)
  });
}
```

## Cheat Sheet: Quick Edits

| Change | File | Line | Value |
|--------|------|------|-------|
| Tree density | game.js | ~1777 | chance: 0.04 |
| Rock color | render.js | ~689 | #8b7d6b |
| Parallax speed | render.js | ~80 | 0.7 |
| Opacity | render.js | ~671 | 0.85 |
| Exclusion zone | game.js | ~1803 | 150 |
| Cloud opacity | render.js | ~87 | 0.04 |

## Common Issues & Solutions

### **Decorations Not Appearing**
- Check console (F12) for errors
- Verify `state.decorations` is initialized
- Ensure spawnEnvironmentalDecorations() is called in initGame()

### **Too Many Decorations (Performance Lag)**
- Reduce all chance values
- Example: Change 0.05 to 0.02

### **Decorations Look Wrong**
- Check ctx.globalAlpha value (should be near 1 after restore)
- Verify color hex codes are valid (6 digits or valid CSS)
- Test with simpler shapes first

### **Parallax Not Visible**
- Increase opacity values (0.15 → 0.25)
- Decrease parallaxFactor (0.7 → 0.5)
- Check if game.inDungeon is true (disables parallax)

---

**For more detailed information**, see [ENVIRONMENT_ASSETS.md](ENVIRONMENT_ASSETS.md)
