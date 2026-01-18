#!/usr/bin/env python3
"""
Generate a world JS file from a PNG map image
Usage: python generateWorldFile.py assets/maps/MainWorldTest.png
"""

import sys
import json
from pathlib import Path
from PIL import Image
import random

def generate_world_file(image_path):
    try:
        img = Image.open(image_path)
        pixels = img.load()
        img_width, img_height = img.size
        
        trees = []
        mountains = []
        mountain_circles = []
        water_circles = []
        
        # Parse image pixels
        for y in range(img_height):
            for x in range(img_width):
                pixel = pixels[x, y]
                
                # Handle different image modes
                if isinstance(pixel, tuple):
                    r, g, b = pixel[0], pixel[1], pixel[2]
                    a = pixel[3] if len(pixel) > 3 else 255
                else:
                    continue
                
                if a < 128:
                    continue
                
                # Black = Mountain
                if r < 50 and g < 50 and b < 50:
                    peaks = []
                    for j in range(2):
                        ox = (random.random() - 0.5) * 40
                        oy = (random.random() - 0.5) * 40
                        pr = 20 + random.random() * 20
                        peak = {"x": x + ox, "y": y + oy, "r": pr}
                        peaks.append(peak)
                        mountain_circles.append(peak)
                    mountains.append({"x": x, "y": y, "peaks": peaks})
                
                # Blue = Water
                elif r < 50 and g < 50 and b > 200:
                    cr = 12 + random.random() * 20
                    water_circles.append({"x": x, "y": y, "r": cr})
                
                # Gray = Trees
                elif r > 100 and g > 100 and b > 100 and abs(r-g) < 30 and abs(g-b) < 30:
                    trees.append({"x": x, "y": y, "r": 10})
        
        # Generate sites
        sites = []
        corner_pad = min(140, min(img_width, img_height) // 4)
        
        sites.append({
            "id": "player_base",
            "name": "Player Base",
            "x": corner_pad,
            "y": img_height - corner_pad,
            "r": 92,
            "owner": "player",
            "prog": 1
        })
        sites.append({
            "id": "team_a_base",
            "name": "Red Base",
            "x": corner_pad,
            "y": corner_pad,
            "r": 92,
            "owner": "teamA",
            "prog": 1
        })
        sites.append({
            "id": "team_b_base",
            "name": "Yellow Base",
            "x": img_width - corner_pad,
            "y": corner_pad,
            "r": 92,
            "owner": "teamB",
            "prog": 1
        })
        sites.append({
            "id": "team_c_base",
            "name": "Blue Base",
            "x": img_width - corner_pad,
            "y": img_height - corner_pad,
            "r": 92,
            "owner": "teamC",
            "prog": 1
        })
        
        # Add flags
        FLAG_COUNT = 6
        for i in range(FLAG_COUNT):
            ok = False
            tries = 0
            while not ok and tries < 120:
                x = random.random() * (img_width - 240) + 120
                y = random.random() * (img_height - 240) + 120
                ok = True
                for b in sites:
                    dist = ((b["x"] - x) ** 2 + (b["y"] - y) ** 2) ** 0.5
                    if dist < 220:
                        ok = False
                        break
                tries += 1
            
            if ok:
                sites.append({
                    "id": f"site_{i}",
                    "name": f"Flag {i+1}",
                    "x": x,
                    "y": y,
                    "r": 74,
                    "owner": None,
                    "prog": 0
                })
        
        # Add walls and respawn data
        for s in sites:
            s["guardRespawns"] = []
            s["spawnActive"] = False
            s["underAttack"] = False
            s["_justCaptured"] = False
            s["_prevOwner"] = s["owner"]
            
            if s["id"].endswith("_base"):
                base_r = s["r"] + 28
                sides = []
                for i in range(4):
                    sides.append({
                        "hp": 100,
                        "maxHp": 100,
                        "destroyed": False,
                        "lastDamaged": -9999
                    })
                s["wall"] = {
                    "r": base_r,
                    "thickness": 14,
                    "gateSide": random.randint(0, 3),
                    "sides": sides,
                    "cornerR": 10,
                    "repairCooldown": 5.0
                }
                s["wall"]["gateOpen"] = False
        
        # Generate JavaScript file
        output = f"""// Generated world data from {Path(image_path).name}
export const generatedWorld = {{
  mapWidth: {img_width},
  mapHeight: {img_height},
  trees: {json.dumps(trees)},
  mountains: {json.dumps(mountains)},
  mountainCircles: {json.dumps(mountain_circles)},
  waterCircles: {json.dumps(water_circles)},
  sites: {json.dumps(sites)}
}};
"""
        
        # Save to file
        output_path = str(image_path).replace('.png', '.world.js').replace('.PNG', '.world.js')
        with open(output_path, 'w') as f:
            f.write(output)
        
        print(f"✓ Generated {output_path}")
        print(f"  - {len(trees)} trees")
        print(f"  - {len(mountains)} mountain clusters")
        print(f"  - {len(water_circles)} water tiles")
        print(f"  - {len(sites)} sites (4 bases + {len(sites)-4} flags)")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generateWorldFile.py <path/to/map.png>")
        sys.exit(1)
    
    generate_world_file(sys.argv[1])
