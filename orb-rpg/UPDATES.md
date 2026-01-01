# Orb RPG - Updates Summary

## Issues Fixed ✓

### 1. Mountain & Water Collision (FIXED)
**Problem:** Enemies and players could walk through mountains and water

**Solution:** 
- Fixed collision detection to check `state.mountainCircles` instead of `m.r` 
- Added water collision checking with `state.waterCircles`
- Both terrain types now properly block entity movement

**File:** `src/game/game.js` - `moveWithAvoidance()` function

---

## New Feature: Custom Maps 🗺️

### Quick Start (3 Steps)

**Step 1: Generate a sample map**
```bash
python3 generate_map.py
```

**Step 2: Place it in the game**
```bash
# Move sample_map.png to:
assets/maps/sample_map.png
```

**Step 3: Load it**

Open browser console (F12) and run:
```javascript
loadCustomMap('assets/maps/sample_map.png')
```

The game will reload with your custom map!

---

### Create Your Own Map

**Option A: Using Python (Easiest)**
- Run: `python3 generate_map.py`
- Edit the script to customize mountains, water, trees
- Output: `sample_map.png`

**Option B: Paint Your Map**
- Use GIMP, Photoshop, or any image editor
- Paint colors:
  - **Black (0,0,0)** = Mountains (blocked)
  - **Blue (0,0,255)** = Water (blocked)
  - **Gray (128,128,128)** = Trees (blocked)
  - **Green (0,128,0)** = Grass (passable)
- Save as PNG to `assets/maps/`

**Option C: Write Code**
```python
from PIL import Image
img = Image.new('RGB', (1440, 900), (0, 128, 0))  # Green
pixels = img.load()
# Paint your terrain:
for x in range(100, 200):
    for y in range(100, 200):
        pixels[x, y] = (0, 0, 0)  # Black mountains
img.save('my_map.png')
```

---

## Technical Details

### Map Loading Function

**Location:** `src/game/world.js`

```javascript
export async function loadMapFromImage(state, imageUrl)
```

**What it does:**
1. Loads PNG image from URL
2. Parses pixel colors
3. Creates terrain objects (mountains, water, trees)
4. Places bases in corners and flags in safe areas
5. Sets up walls and respawn queues

### Global Console Helper

```javascript
window.loadCustomMap(imageUrl)  // Reload game with new map
```

Automatically available in browser console during gameplay.

### Map Properties

- **World Size:** Image dimensions (1440x900 = 1440x900 units)
- **Terrain:**
  - Mountain clusters from black pixels
  - Water collision from blue pixels
  - Tree objects from gray pixels
  - Passable terrain everywhere else
- **Bases:** Auto-placed in corners
- **Flags:** Auto-placed in passable areas
- **Walls:** Auto-created around bases

---

## Files Added/Modified

### New Files
- `CUSTOM_MAPS.md` - Custom map documentation
- `MAP_EDITOR.md` - Advanced map editing guide
- `generate_map.py` - Python script to generate sample maps
- `assets/maps/` - Directory for custom map files
- `assets/maps/README.md` - Quick reference

### Modified Files
- `src/game/game.js` - Fixed collision detection
- `src/game/world.js` - Added `loadMapFromImage()` function
- `src/game/state.js` - Exposed global `_gameState` for console access

---

## Usage Examples

### In Game Code
```javascript
import { loadMapFromImage } from "./game/world.js";

// During initialization:
try {
  await loadMapFromImage(state, 'assets/maps/my_map.png');
  console.log('Map loaded!');
} catch(err) {
  console.error('Map load failed:', err);
  initSites(state); // Fallback to procedural
}
```

### In Browser Console
```javascript
// Load a map and reload game
loadCustomMap('assets/maps/sample_map.png')

// List available maps
// Just place PNG files in assets/maps/
```

---

## Map Size Recommendations

- **Minimum:** 1024x768 pixels
- **Recommended:** 1440x900 or 1920x1080
- **Large:** 2880x1800 or bigger
- **Performance:** Larger maps may have slight performance impact

Adjust based on your target device!

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Map won't load | Check console (F12) for errors. Verify image is PNG and path is correct |
| Terrain not blocking | Use exact color values: Black (0,0,0), Blue (0,0,255), Gray (128,128,128) |
| Bases/flags in bad spots | Edit image to clear those areas or regenerate |
| Performance issues | Reduce map size or optimize terrain density |
| Can't access console | Press F12, go to Console tab |

---

## Sharing Your Maps

Share your custom map PNG files with others! They can use it with:

```javascript
loadCustomMap('path/to/your/map.png')
```

Or place in `assets/maps/` and it's ready to use!

---

## Next Steps / Future Enhancements

- [ ] In-game map editor UI
- [ ] Map preview tool
- [ ] Difficulty selector based on terrain
- [ ] Co-op map sharing platform
- [ ] Tileset system for more detailed terrain
- [ ] Performance optimization for very large maps

---

## Latest Update: Debug Logging System 📊

### What's New
Implemented a comprehensive game logging system for debugging critical issues like guard spawning and active effects display problems.

**Location:** ESC → Options → "Auto-save game log (debug)"

### How to Use

1. **Enable Logging**
   - Open Options menu during gameplay
   - Check "Auto-save game log (debug)"
   - Click "Apply Options"

2. **Download Log**
   - Go back to Options
   - Click "Download Game Log" button
   - Browser downloads a JSON file with all events

3. **Analyze**
   - Open downloaded file in text editor
   - Review event timeline with timestamps
   - Share with developers for bug investigation

### Key Features
- ✅ Auto-saves every 30 seconds to browser storage
- ✅ Tracks flag captures, guard spawns, emperor changes, group actions
- ✅ Zero performance impact when disabled
- ✅ Session IDs for tracking multiple tests
- ✅ Exports as JSON for easy analysis

### Files Modified
- `src/game/game.js` - Added logging functions
- `src/game/ui.js` - Added UI controls
- `src/game/state.js` - Added logging state
- `src/main.js` - Added auto-save timer

See [LOGGING_SYSTEM.md](LOGGING_SYSTEM.md) for detailed documentation.

---

**Version:** 2.0 with Custom Maps + Debug Logging
**Updated:** January 15, 2025
