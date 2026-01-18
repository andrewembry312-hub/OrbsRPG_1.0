# Custom Maps Directory

Place your custom map PNG files here.

## Quick Start

1. **Generate a sample map:**
   ```bash
   python3 ../generate_map.py
   ```
   This creates `sample_map.png`

2. **Move it here:**
   ```bash
   mv sample_map.png assets/maps/
   ```

3. **Load it in your game:**
   
   In browser console (F12):
   ```javascript
   loadCustomMap('assets/maps/sample_map.png')
   ```
   
   Or in code:
   ```javascript
   import { loadMapFromImage } from "./game/world.js";
   await loadMapFromImage(state, 'assets/maps/sample_map.png');
   ```

## File Format

- **Type:** PNG (lossless)
- **Size:** Recommended 1440x900 or larger
- **Colors:** See CUSTOM_MAPS.md for color codes

## Example Colors

```
Background Green:    rgb(0, 128, 0)
Mountains (Black):   rgb(0, 0, 0)
Water (Blue):        rgb(0, 0, 255)
Trees (Gray):        rgb(128, 128, 128)
```

## See Also

- `../CUSTOM_MAPS.md` - Full documentation
- `../generate_map.py` - Python map generator script
- `../MAP_EDITOR.md` - Advanced map editing guide
