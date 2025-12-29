#!/usr/bin/env node
/**
 * Generate a world JS file from a PNG map image
 * Usage: node generateWorldFile.js assets/maps/MainWorldTest.png
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function generateWorldFile(imagePath) {
  try {
    const img = await loadImage(imagePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    const mapWidth = img.width;
    const mapHeight = img.height;
    const trees = [];
    const mountains = [];
    const mountainCircles = [];
    const waterCircles = [];

    // Parse image pixels
    for(let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if(a < 128) continue;
      
      const idx = i / 4;
      const x = idx % img.width;
      const y = Math.floor(idx / img.width);

      // Black = Mountain
      if(r < 50 && g < 50 && b < 50) {
        const peaks = [];
        for(let j = 0; j < 2; j++) {
          const ox = (Math.random() - 0.5) * 40;
          const oy = (Math.random() - 0.5) * 40;
          const pr = 20 + Math.random() * 20;
          peaks.push({x: x + ox, y: y + oy, r: pr});
          mountainCircles.push({x: x + ox, y: y + oy, r: pr});
        }
        mountains.push({x, y, peaks});
      }
      // Blue = Water
      else if(r < 50 && g < 50 && b > 200) {
        const cr = 12 + Math.random() * 20;
        waterCircles.push({x, y, r: cr});
      }
      // Gray = Trees
      else if(r > 100 && g > 100 && b > 100 && Math.abs(r-g) < 30 && Math.abs(g-b) < 30) {
        trees.push({x, y, r: 10});
      }
    }

    // Generate sites
    const sites = [];
    const cornerPad = Math.min(140, Math.min(mapWidth, mapHeight) / 4);
    
    sites.push({ id:'player_base', name:'Player Base', x: cornerPad, y: mapHeight - cornerPad, r: 92, owner: 'player', prog: 1 });
    sites.push({ id:'team_a_base', name:'Red Base', x: cornerPad, y: cornerPad, r: 92, owner: 'teamA', prog: 1 });
    sites.push({ id:'team_b_base', name:'Yellow Base', x: mapWidth - cornerPad, y: cornerPad, r: 92, owner: 'teamB', prog: 1 });
    sites.push({ id:'team_c_base', name:'Blue Base', x: mapWidth - cornerPad, y: mapHeight - cornerPad, r: 92, owner: 'teamC', prog: 1 });

    const FLAG_COUNT = 6;
    for(let i = 0; i < FLAG_COUNT; i++) {
      let x, y, ok = false, tries = 0;
      while(!ok && tries < 120) {
        x = Math.random() * (mapWidth - 240) + 120;
        y = Math.random() * (mapHeight - 240) + 120;
        ok = true;
        for(const b of sites) {
          if(Math.hypot(b.x - x, b.y - y) < 220) {
            ok = false;
            break;
          }
        }
        tries++;
      }
      if(ok) sites.push({ id:`site_${i}`, name:`Flag ${i+1}`, x, y, r: 74, owner: null, prog: 0 });
    }

    // Add walls to bases
    for(const s of sites) {
      s.guardRespawns = [];
      s.spawnActive = false;
      s.underAttack = false;
      s._justCaptured = false;
      s._prevOwner = s.owner;
      
      if(s.id.endsWith('_base')) {
        const baseR = s.r + 28;
        const sides = [];
        for(let i = 0; i < 4; i++) {
          sides.push({ hp: 100, maxHp: 100, destroyed: false, lastDamaged: -9999 });
        }
        s.wall = {
          r: baseR,
          thickness: 14,
          gateSide: Math.floor(Math.random() * 4),
          sides: sides,
          cornerR: 10,
          repairCooldown: 5.0
        };
        s.wall.gateOpen = false;
      }
    }

    // Generate the JavaScript code
    const output = `// Generated world data from ${path.basename(imagePath)}
export const generatedWorld = {
  mapWidth: ${mapWidth},
  mapHeight: ${mapHeight},
  trees: ${JSON.stringify(trees)},
  mountains: ${JSON.stringify(mountains)},
  mountainCircles: ${JSON.stringify(mountainCircles)},
  waterCircles: ${JSON.stringify(waterCircles)},
  sites: ${JSON.stringify(sites)}
};
`;

    // Save to file
    const outputPath = imagePath.replace(/\.png$/i, '.world.js');
    fs.writeFileSync(outputPath, output);
    console.log(`✓ Generated ${outputPath}`);
    console.log(`  - ${trees.length} trees`);
    console.log(`  - ${mountains.length} mountain clusters`);
    console.log(`  - ${waterCircles.length} water tiles`);
    console.log(`  - ${sites.length} sites (4 bases + 6 flags)`);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

const imagePath = process.argv[2];
if(!imagePath) {
  console.error('Usage: node generateWorldFile.js <path/to/map.png>');
  process.exit(1);
}

generateWorldFile(imagePath);
