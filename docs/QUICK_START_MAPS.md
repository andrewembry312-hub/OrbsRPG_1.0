# Quick Start: Custom Maps

## The Problem (Now Fixed)
- ✗ Enemies walked through mountains
- ✗ Players walked through water
- ✓ Now fixed! Collision detection works properly

## The Solution: Create Custom Maps

### 30 Second Start

1. **Open terminal and run:**
   ```bash
   python3 generate_map.py
   ```
   Creates `sample_map.png`

2. **Move the file:**
   ```bash
   mv sample_map.png assets/maps/
   ```

3. **Load in game (Console - F12):**
   ```javascript
   loadCustomMap('assets/maps/sample_map.png')
   ```

**Done!** The game reloads with your custom map.

---

## Make Your Own Map

### Simple Way: Paint It

1. Open GIMP or Photoshop
2. Create image (1440x900 recommended)
3. Paint terrain:
   - **Black** = Mountains (blocked)
   - **Blue** = Water (blocked)
   - **Gray** = Trees (blocked)
   - **Green** = Grass (passable)
4. Save as PNG → `assets/maps/your_map.png`
5. Load: `loadCustomMap('assets/maps/your_map.png')`

### Code Way: Write Python

```python
from PIL import Image

# Create map
img = Image.new('RGB', (1440, 900), (0, 128, 0))
pixels = img.load()

# Add mountains
for x in range(100, 200):
    for y in range(100, 200):
        pixels[x, y] = (0, 0, 0)  # Black

# Add water
for x in range(600, 700):
    for y in range(400, 500):
        pixels[x, y] = (0, 0, 255)  # Blue

img.save('my_map.png')
```

---

## Map Colors Reference

| What | Color | RGB |
|------|-------|-----|
| Mountains | 🟫 Black | (0, 0, 0) |
| Water | 🔵 Blue | (0, 0, 255) |
| Trees | ⚫ Gray | (128, 128, 128) |
| Grass | 🟢 Green | (0, 128, 0) |
| Other | Any | Passable |

---

## Full Documentation

- `CUSTOM_MAPS.md` - Complete guide
- `MAP_EDITOR.md` - Advanced editing
- `UPDATES.md` - What changed
- `assets/maps/README.md` - Maps folder info

---

## Common Questions

**Q: Can I make my map huge?**
A: Yes! Larger images = larger worlds. Just be aware of performance.

**Q: How do I share my map?**
A: Just send the PNG file. Others load it with `loadCustomMap()`

**Q: Can I use different colors?**
A: Use the exact RGB values for terrain to work. Other colors are passable.

**Q: Do I need to place bases?**
A: No! Bases auto-place in corners. You just paint terrain.

**Q: What if my map breaks?**
A: Check the console (F12) for errors. Make sure image is PNG format.

---

Enjoy! 🎮
