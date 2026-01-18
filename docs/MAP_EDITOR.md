# Custom Map Editor Guide

## Quick Start

You can create custom maps for Orb RPG using a simple image file. Each pixel color represents different terrain:

### Color Codes:
- **Black (0,0,0)**: Mountains (impassable)
- **Blue (0,0,255)**: Water (impassable, slows movement)
- **Gray (128,128,128)**: Trees (impassable)
- **Green (0,128,0)**: Grass (passable, default terrain)
- **Transparent/Other**: Ignored (treated as passable)

### Map Size:
- Image dimensions set the world size (1 pixel = 1 world unit)
- Recommended: 1440x900 pixels minimum (3x standard resolution)
- Larger maps = bigger worlds

## Creating a Map in GIMP or Photoshop:

1. **Create new image** (e.g., 1440x900 pixels)
2. **Use colors to paint terrain:**
   - Black brush: Draw mountains
   - Blue brush: Draw water patches
   - Gray brush: Draw trees
   - Green/white: Leave as passable terrain
3. **Export as PNG** to `assets/maps/your_map_name.png`

## Using Custom Maps in Code:

Add this to `src/main.js` after character selection or in `src/game/game.js`:

```javascript
import { loadMapFromImage } from "./game/world.js";

// In your initialization code:
try {
  await loadMapFromImage(state, 'assets/maps/your_map_name.png');
  console.log('Custom map loaded successfully');
} catch(err) {
  console.error('Failed to load map:', err);
  initSites(state); // Fallback to procedural map
}
```

## Simple Map Example:

Create a `simple_map.png` with Python (PIL/Pillow):

```python
from PIL import Image

# Create 1440x900 map
map_img = Image.new('RGB', (1440, 900), color=(0, 128, 0))  # Green grass base
pixels = map_img.load()

# Add some mountains in corners
for x in range(100, 200):
    for y in range(100, 200):
        pixels[x, y] = (0, 0, 0)  # Black mountains

# Add water in center
for x in range(600, 800):
    for y in range(350, 550):
        pixels[x, y] = (0, 0, 255)  # Blue water

# Add trees randomly
import random
for _ in range(200):
    x = random.randint(0, 1439)
    y = random.randint(0, 899)
    pixels[x, y] = (128, 128, 128)  # Gray trees

map_img.save('simple_map.png')
```

## In-Game Integration:

After calling `loadMapFromImage()`:
- Bases are placed in the 4 corners automatically
- Flags spawn in passable areas away from bases
- Enemies/players cannot pass through mountains, water, or trees
- All existing gameplay mechanics work with custom maps

## Tips:

- **Varied terrain**: Mix mountains, water, and trees for interesting maps
- **Balanced bases**: Keep each base corner free of obstacles
- **Flag placement**: Ensure there's passable terrain between bases for flags
- **File size**: Keep images relatively small (< 5MB) for fast loading
- **Testing**: Use GIMP's grid feature to plan your map

## Advanced: Map Editor UI

To add an in-game map editor UI, you could:
1. Create a canvas overlay for drawing
2. Save the canvas as an image
3. Use `loadMapFromImage()` to load the result

This is left as a future enhancement!
