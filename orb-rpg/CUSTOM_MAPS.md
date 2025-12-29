# Custom Maps - Quick Start Guide

## Problem Fixed ✓
- **Mountain collision**: Enemies and players can no longer pass through mountains
- Mountains are now checked against `mountainCircles` instead of empty `m.r`
- Water collision also now properly blocks movement

## Creating Custom Maps

### Option 1: Using Python Script (Easiest)

```bash
python3 generate_map.py
```

This creates `sample_map.png` with:
- Mountain ranges in all 4 corners
- Lakes scattered around
- A river through the center
- Random trees for obstacles

Then move it to: `assets/maps/sample_map.png`

### Option 2: Paint Your Own Map

Use GIMP, Photoshop, or any image editor. Create a PNG image and use these colors:

**Color Reference:**
```
🟫 Black   (0,0,0)        → Mountains (blocked)
🔵 Blue    (0,0,255)      → Water (blocked)
⚫ Gray    (128,128,128)   → Trees (blocked)
🟢 Green   (0,128,0)      → Grass (passable)
⚪ Other colors           → Passable
```

**Recommended Size:** 1440x900 pixels or larger

### Option 3: Using Drawing Tools

Python example to create a custom map:

```python
from PIL import Image

img = Image.new('RGB', (1440, 900), (0, 128, 0))  # Green base
pixels = img.load()

# Draw mountains
for x in range(100, 200):
    for y in range(100, 200):
        pixels[x, y] = (0, 0, 0)  # Black

# Draw water
for x in range(600, 700):
    for y in range(400, 500):
        pixels[x, y] = (0, 0, 255)  # Blue

img.save('my_map.png')
```

## Loading Maps in Your Game

### Method 1: Via Game Code

Add this to `src/game/game.js` in the `initGame()` function:

```javascript
import { loadMapFromImage } from "./world.js";

export async function initGame(state){
  try {
    // Load custom map (optional)
    // await loadMapFromImage(state, 'assets/maps/your_map.png');
    
    // Or use procedural generation (default)
    initSites(state);
    // ... rest of init
  } catch(err) {
    console.error('Game init failed:', err);
  }
}
```

### Method 2: Via Browser Console

Once the game is running, open Developer Tools (F12) and run:

```javascript
loadCustomMap('assets/maps/your_map.png')
```

The game will reload with the new map!

## Map Structure

When you load a map image, the system:

1. **Reads pixel colors** from the image
2. **Converts to terrain:**
   - Black pixels → Mountain collision objects
   - Blue pixels → Water collision objects
   - Gray pixels → Tree objects
   - Other → Passable terrain

3. **Automatically places:**
   - 4 team bases in the corners
   - 6 neutral capture flags in safe areas
   - Walls around all bases

## Important Notes

✓ **Bases are placed automatically** - You don't need to mark them in the image

✓ **Image size = World size** - 1440x900 image = 1440x900 world units

✓ **Transparent pixels are ignored** - Use transparent areas in PNG for any custom editing

✓ **Terrain is exact** - Each pixel is 1 world unit of collision

✓ **Scalable** - Create maps as large as you want (but performance may vary)

## Sharing Maps

Share your map as a PNG file! Others can use it with:

```javascript
await loadMapFromImage(state, 'path/to/your/map.png')
```

## Tips for Good Maps

1. **Clear paths** - Leave corridors between mountains/water for movement
2. **Balanced** - Keep all 4 corners similar difficulty
3. **Varied** - Mix mountains, water, and trees for interesting gameplay
4. **Readable** - Use the color codes consistently
5. **Tested** - Load and test before sharing

## File Organization

```
orb-rpg/
  assets/
    maps/
      sample_map.png          ← Put custom maps here
      your_custom_map.png
  generate_map.py             ← Script to generate maps
  MAP_EDITOR.md               ← Full map editor docs
```

## Troubleshooting

**Map won't load?**
- Check console (F12) for errors
- Ensure image is PNG format
- Verify file path is correct
- Check CORS if loading from different domain

**Terrain not blocking?**
- Make sure colors are exact (use color picker)
- Check that image isn't compressed (use lossless PNG)
- Verify pixel colors match the guide above

**Bases or flags in bad spots?**
- Edit image to clear those areas
- Regenerate with Python script
- Manually place bases in code after loading

Enjoy creating! 🎮
