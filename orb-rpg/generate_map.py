#!/usr/bin/env python3
"""
Simple map generator for Orb RPG
Creates a custom map image using Python PIL/Pillow

Usage:
  python3 generate_map.py
  
This will create 'sample_map.png' in the current directory.
Place it in assets/maps/ and load it using:
  await loadMapFromImage(state, 'assets/maps/sample_map.png');
"""

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("PIL not installed. Install with: pip install Pillow")
    exit(1)

import random

def create_sample_map(width=1440, height=900, filename='sample_map.png'):
    """Create a sample map with mountains, water, and trees"""
    
    # Create base green map
    img = Image.new('RGB', (width, height), color=(0, 128, 0))
    pixels = img.load()
    draw = ImageDraw.Draw(img)
    
    # Add mountain ranges (black regions)
    # Top-left mountain range
    for x in range(80, 240):
        for y in range(60, 220):
            if random.random() < 0.3:
                pixels[x, y] = (0, 0, 0)
    
    # Top-right mountain range
    for x in range(width-240, width-80):
        for y in range(60, 220):
            if random.random() < 0.3:
                pixels[x, y] = (0, 0, 0)
    
    # Bottom-left mountain range
    for x in range(80, 240):
        for y in range(height-220, height-60):
            if random.random() < 0.3:
                pixels[x, y] = (0, 0, 0)
    
    # Bottom-right mountain range
    for x in range(width-240, width-80):
        for y in range(height-220, height-60):
            if random.random() < 0.3:
                pixels[x, y] = (0, 0, 0)
    
    # Add lakes (blue regions)
    lakes = [
        (300, 200, 120),     # Center-top lake
        (200, height-300, 100),  # Bottom-left lake
        (width-300, height-300, 140),  # Bottom-right lake
    ]
    
    for cx, cy, radius in lakes:
        for x in range(max(0, cx-radius), min(width, cx+radius)):
            for y in range(max(0, cy-radius), min(height, cy+radius)):
                dist = ((x-cx)**2 + (y-cy)**2)**0.5
                if dist < radius:
                    pixels[x, y] = (0, 0, 255)
    
    # Add scattered trees (gray)
    tree_count = 300
    for _ in range(tree_count):
        x = random.randint(0, width-1)
        y = random.randint(0, height-1)
        
        # Don't place trees on mountains or water
        if pixels[x, y] == (0, 0, 0) or pixels[x, y] == (0, 0, 255):
            continue
        
        pixels[x, y] = (128, 128, 128)
    
    # Add a river connecting lakes (blue)
    # River from top to bottom through center
    river_x = width // 2
    for y in range(0, height):
        for x in range(max(0, river_x-15), min(width, river_x+15)):
            if random.random() < 0.7:  # Some variation
                if pixels[x, y] != (0, 0, 0):  # Don't overwrite mountains
                    pixels[x, y] = (0, 0, 255)
    
    img.save(filename)
    print(f"✓ Map created: {filename} ({width}x{height})")
    print(f"  - Mountains (black) in corners")
    print(f"  - Lakes (blue) scattered throughout")
    print(f"  - River (blue) through center")
    print(f"  - Trees (gray) randomly placed")
    print(f"\nTo use this map:")
    print(f"  1. Move {filename} to assets/maps/")
    print(f"  2. In your game initialization code, add:")
    print(f"     await loadMapFromImage(state, 'assets/maps/{filename}');")

if __name__ == '__main__':
    create_sample_map()
