import { clamp, cssVar } from "../engine/util.js";

// Pre-load grass textures
const grassTextures = {
  grass1: null,
  grass2: null,
  winterTree: null,
  purpleCrystal: null,
  waterPond: null,
  pond1: null,
  pond2: null,
  pond3: null,
  rocks1: null,
  rocks2: null,
  loaded: false,
  loading: false,
  patches: [] // Store static patch positions
};

// Pre-load boss icons
const bossIcons = {
  archmage: null,
  balrogath: null,
  bloodfang: null,
  gorothar: null,
  malakir: null,
  tarrasque: null,
  venomQueen: null,
  vorrak: null,
  zalthor: null,
  loaded: false,
  loading: false,
  iconNames: ['archmage', 'balrogath', 'bloodfang', 'gorothar', 'malakir', 'tarrasque', 'venomQueen', 'vorrak', 'zalthor']
};

function loadBossIcons(){
  if(bossIcons.loading || bossIcons.loaded) return;
  bossIcons.loading = true;
  
  const loadImage = (path) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load boss icon: ${path}`);
        resolve(null);
      };
      img.crossOrigin = 'anonymous';
      img.src = path;
    });
  };
  
  Promise.all([
    loadImage('assets/boss icons/Archmage.PNG'),
    loadImage('assets/boss icons/Balrogath.PNG'),
    loadImage('assets/boss icons/Bloodfang.PNG'),
    loadImage('assets/boss icons/Gorothar.PNG'),
    loadImage('assets/boss icons/Malakir.PNG'),
    loadImage('assets/boss icons/Tarrasque.PNG'),
    loadImage('assets/boss icons/Venom Queen.PNG'),
    loadImage('assets/boss icons/Vorrak.PNG'),
    loadImage('assets/boss icons/Zalthor.PNG')
  ]).then(([archmage, balrogath, bloodfang, gorothar, malakir, tarrasque, venomQueen, vorrak, zalthor]) => {
    if(archmage) bossIcons.archmage = archmage;
    if(balrogath) bossIcons.balrogath = balrogath;
    if(bloodfang) bossIcons.bloodfang = bloodfang;
    if(gorothar) bossIcons.gorothar = gorothar;
    if(malakir) bossIcons.malakir = malakir;
    if(tarrasque) bossIcons.tarrasque = tarrasque;
    if(venomQueen) bossIcons.venomQueen = venomQueen;
    if(vorrak) bossIcons.vorrak = vorrak;
    if(zalthor) bossIcons.zalthor = zalthor;
    bossIcons.loaded = true;
    
    console.log('[Boss Icons] Loaded successfully');
  });
}

// Load boss icons on module import
loadBossIcons();

function loadGrassTextures(){
  if(grassTextures.loading || grassTextures.loaded) return;
  grassTextures.loading = true;
  
  const loadImage = (path) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load grass texture: ${path}`);
        resolve(null);
      };
      img.crossOrigin = 'anonymous';
      img.src = path;
    });
  };
  
  Promise.all([
    loadImage('assets/Environment/grass.png'),
    loadImage('assets/Environment/grass 2.png'),
    loadImage('assets/Environment/winter tree.png'),
    loadImage('assets/Environment/purple chrystal.png'),
    loadImage('assets/Environment/water pond.png'),
    loadImage('assets/Environment/pond 1.png'),
    loadImage('assets/Environment/pond 2.png'),
    loadImage('assets/Environment/pond 3.png'),
    loadImage('assets/Environment/rocks 1.png'),
    loadImage('assets/Environment/rocks 2.png')
  ]).then(([img1, img2, tree, crystal, waterPond, pond1, pond2, pond3, rocks1, rocks2]) => {
    if(img1) grassTextures.grass1 = img1;
    if(img2) grassTextures.grass2 = img2;
    if(tree) grassTextures.winterTree = tree;
    if(crystal) grassTextures.purpleCrystal = crystal;
    if(waterPond) grassTextures.waterPond = waterPond;
    if(pond1) grassTextures.pond1 = pond1;
    if(pond2) grassTextures.pond2 = pond2;
    if(pond3) grassTextures.pond3 = pond3;
    if(rocks1) grassTextures.rocks1 = rocks1;
    if(rocks2) grassTextures.rocks2 = rocks2;
    grassTextures.loaded = true;
    
    // Generate static patch positions once
    grassTextures.patches = [];
    for(let i = 0; i < 150; i++){
      grassTextures.patches.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: 80 + Math.random() * 150,
        isGrass1: Math.random() > 0.5
      });
    }
    
    // Add winter trees
    for(let i = 0; i < 15; i++){
      grassTextures.patches.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: 100 + Math.random() * 80,
        isTree: true
      });
    }
    
    // Add one of each special environment decoration
    const ponds = [grassTextures.waterPond, grassTextures.pond1, grassTextures.pond2, grassTextures.pond3];
    const rocks = [grassTextures.rocks1, grassTextures.rocks2];
    
    ponds.forEach((pond, idx) => {
      if(pond) {
        grassTextures.patches.push({
          x: Math.random() * 2000,
          y: Math.random() * 2000,
          size: 150 + Math.random() * 100,
          isPond: true,
          pondImg: pond
        });
      }
    });
    
    rocks.forEach((rock, idx) => {
      if(rock) {
        grassTextures.patches.push({
          x: Math.random() * 2000,
          y: Math.random() * 2000,
          size: 120 + Math.random() * 80,
          isRocks: true,
          rocksImg: rock
        });
      }
    });
    
    console.log('[Grass Textures] Loaded successfully');
  });
}

// Load textures on module import
loadGrassTextures();
import { LOOT_TTL, ACTION_LABELS } from "./constants.js";
import { currentStats, getInteractionPrompt } from "./game.js";
import { BUFF_REGISTRY, DOT_REGISTRY } from "./skills.js";

// central team color mapping used by all render helpers
export function teamColor(t){
  if(!t) return null;
  if(t === 'player') return cssVar('--player');
  if(t === 'teamA') return '#c84b4b';
  if(t === 'teamB') return '#e6d44b';
  if(t === 'teamC') return '#4b6bc8';
  return cssVar('--enemy');
}

// lightweight image cache loader (stores on state._imgCache)
function loadCachedImage(state, path){
  if(!state) return null;
  state._imgCache = state._imgCache || {};
  if(!path) return null;
  const existing = state._imgCache[path];
  if(existing) return (existing.complete && existing.naturalWidth>0) ? existing : null;
  const img = new Image();
  img.src = path;
  state._imgCache[path] = img;
  return (img.complete && img.naturalWidth>0) ? img : null;
}

export function render(state){
  try{ if(!state._renderStarted){ console.log('render() running'); state._renderStarted = true; } }catch(e){}
  const { ctx, canvas } = state.engine;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // camera transform
  const cam = state.camera || { x: canvas.width/2, y: canvas.height/2, zoom: 1 };
  const viewW = canvas.width / (cam.zoom || 1);
  const viewH = canvas.height / (cam.zoom || 1);
  const VIEW_MARGIN = 140; // buffer to avoid pop-in near screen edge
  const view = {
    minX: cam.x - viewW/2 - VIEW_MARGIN,
    maxX: cam.x + viewW/2 + VIEW_MARGIN,
    minY: cam.y - viewH/2 - VIEW_MARGIN,
    maxY: cam.y + viewH/2 + VIEW_MARGIN
  };
  const inView = (x, y, r=0) => (x >= view.minX - r && x <= view.maxX + r && y >= view.minY - r && y <= view.maxY + r);
  ctx.save();
  const tx = -cam.x + canvas.width/2;
  const ty = -cam.y + canvas.height/2;
  ctx.translate(tx, ty);
  ctx.scale(cam.zoom, cam.zoom);

  // note: use module-level `teamColor` helper

  const FRIENDLY_FALLBACK = '#4b6bc8';

  // fallback: if state.inDungeon was not set for some reason but dungeon enemies exist,
  // treat that dungeon as active for rendering purposes so visuals appear correctly.
  const _anyDungeonEnemy = (state.enemies || []).find(e => e && e.dungeonId);
  const activeDungeon = state.inDungeon || (_anyDungeonEnemy ? _anyDungeonEnemy.dungeonId : false);

  // draw background (grass) or dungeon interior
  if(activeDungeon){
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,state.mapWidth || canvas.width, state.mapHeight || canvas.height);
    // cave floor / walls
    ctx.fillStyle='#5C3A21';
    ctx.beginPath(); ctx.arc(state.player.x, state.player.y, 220, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.12;
    for(let i=0;i<18;i++){ const ang=i*(Math.PI*2/18); ctx.beginPath(); ctx.arc(state.player.x + Math.cos(ang)*160 + (Math.random()*24-12), state.player.y + Math.sin(ang)*100 + (Math.random()*18-9), 18 + Math.random()*10, 0, Math.PI*2); ctx.fill(); }
    ctx.globalAlpha=1;
  } else {
    // Draw grass base color
    ctx.fillStyle = '#89c97a';
    ctx.fillRect(0,0,state.mapWidth || canvas.width, state.mapHeight || canvas.height);
    
    // Draw decorative objects using their collision circles for accurate positioning
    if(grassTextures.loaded && state.decorativeCircles && state.decorativeCircles.length > 0){
      ctx.globalAlpha = 0.7;
      
      for(let dc of state.decorativeCircles){
        let texture = null;
        let size = dc.r * 6; // 3x larger than before
        
        // Select texture based on type
        if(dc.type === 'tree' && grassTextures.winterTree){
          texture = grassTextures.winterTree;
        } else if(dc.type === 'pond'){
          const ponds = [grassTextures.waterPond, grassTextures.pond1, grassTextures.pond2, grassTextures.pond3];
          const variant = dc.textureVariant !== undefined ? dc.textureVariant : 0;
          texture = ponds[variant % ponds.length];
          ctx.globalAlpha = 0.65;
        } else if(dc.type === 'rocks'){
          const rockTextures = [grassTextures.rocks1, grassTextures.rocks2];
          const variant = dc.textureVariant !== undefined ? dc.textureVariant : 0;
          texture = rockTextures[variant % rockTextures.length];
          ctx.globalAlpha = 0.6;
        } else if(dc.type === 'crystal' && grassTextures.purpleCrystal){
          texture = grassTextures.purpleCrystal;
          ctx.globalAlpha = 0.75;
        }
        
        if(texture){
          try{
            ctx.drawImage(texture, dc.x - size/2, dc.y - size/2, size, size);
          }catch(e){}
        }
      }
      ctx.globalAlpha = 1;
    }
    
    // Also draw grass patches for ground texture
    if(grassTextures.loaded && grassTextures.patches.length > 0){
      ctx.globalAlpha = 0.5;
      
      for(let patch of grassTextures.patches){
        const texture = patch.isGrass1 ? grassTextures.grass1 : grassTextures.grass2;
        if(texture){
          try{
            ctx.drawImage(texture, patch.x, patch.y, patch.size, patch.size);
          }catch(e){}
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // draw mountains (clustered peaks) with simple view culling
  const drawMountains = (list) => {
    if(!list) return;
    for(const m of list){
      const cx = m.x ?? (m.peaks && m.peaks[0]?.x) ?? 0;
      const cy = m.y ?? (m.peaks && m.peaks[0]?.y) ?? 0;
      if(!inView(cx, cy, 120)) continue;
      for(const p of (m.peaks||[])){
        ctx.fillStyle='rgba(100,80,60,0.98)';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.r*0.7);
        ctx.lineTo(p.x - p.r, p.y + p.r*0.4);
        ctx.lineTo(p.x + p.r, p.y + p.r*0.4);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.10)';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - p.r*0.7); ctx.lineTo(p.x - p.r*0.25, p.y - p.r*0.25); ctx.lineTo(p.x + p.r*0.25, p.y - p.r*0.25); ctx.closePath(); ctx.fill();
      }
    }
  };
  drawMountains(state.mountains);
  drawMountains(state.borderMountains);

  // draw rock formations (purple crystals)
  if(state.rocks){
    for(const r of state.rocks){
      if(!inView(r.x, r.y, r.r + 28)) continue;
      if(grassTextures.purpleCrystal){
        try{
          const size = r.r * 2.2;
          ctx.drawImage(grassTextures.purpleCrystal, r.x - size/2, r.y - size/2, size, size);
        }catch(e){}
      } else {
        // fallback to grey circles if image not loaded
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.scale(r.rx/r.r, r.ry/r.r);
        ctx.fillStyle='rgba(150,150,150,0.9)';
        ctx.beginPath(); ctx.arc(0,0,r.r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.arc(-r.r*0.25, -r.r*0.25, r.r*0.4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.rx, r.ry, 0, 0, Math.PI*2); ctx.stroke();
      }
    }
  }

  // draw lakes (overlapping circles create natural blobs)
  if(state.lakes && state.lakes.length){
    for(const lake of state.lakes){
      const lx = lake.x ?? (lake.circles && lake.circles[0]?.x) ?? 0;
      const ly = lake.y ?? (lake.circles && lake.circles[0]?.y) ?? 0;
      if(!inView(lx, ly, 220)) continue;
      ctx.globalAlpha=0.9;
      ctx.fillStyle='rgba(70,130,200,0.72)';
      for(const c of lake.circles){ ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1;
      // Border removed - single water color only
      // ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=2;
      // for(const c of lake.circles){ ctx.beginPath(); ctx.arc(c.x,c.y,Math.max(6,c.r-6),0,Math.PI*2); ctx.stroke(); }
    }
  }

  // rivers temporarily disabled

  // draw trees (cull off-screen to reduce draw load)
  const drawTrees = (list) => {
    if(!list) return;
    for(const t of list){
      if(!inView(t.x, t.y, t.r + 18)) continue;
      ctx.fillStyle='rgba(88,56,22,1)';
      ctx.fillRect(t.x-3, t.y, 6, 8);
      ctx.fillStyle='rgba(28,120,40,0.95)';
      ctx.beginPath(); ctx.arc(t.x, t.y-6, t.r, 0, Math.PI*2); ctx.fill();
    }
  };
  drawTrees(state.trees);
  drawTrees(state.borderTrees);

  // sites
  for(const s of state.sites) drawSite(ctx, s, state);

  // draw dungeon entrances with circular image display
  if(state.dungeons){
    for(const d of state.dungeons){
      const dungeonImg = loadCachedImage(state, 'assets/structure/Dungeon Entrance.png');
      if(dungeonImg){
        try{
          // Draw circular clipping mask
          ctx.save();
          const radius = 24;
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius, 0, Math.PI*2);
          ctx.clip();
          
          // Draw dungeon entrance image to fill the circle
          const imgSize = radius * 2.2;
          ctx.drawImage(dungeonImg, d.x - imgSize/2, d.y - imgSize/2, imgSize, imgSize);
          ctx.restore();
          
          // Add border ring (dimmed if cleared)
          const borderColor = d.cleared ? 'rgba(80,60,40,0.5)' : 'rgba(139,90,43,0.9)';
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius, 0, Math.PI*2);
          ctx.stroke();
        }catch(e){
          // Fallback to triangle if image fails
          const color = d.cleared ? 'rgba(80,60,40,0.6)' : '#8B5A2B';
          drawTriangle(ctx, d.x, d.y - 6, 10, color);
        }
      } else {
        // Fallback to triangle while image loads
        const color = d.cleared ? 'rgba(80,60,40,0.6)' : '#8B5A2B';
        drawTriangle(ctx, d.x, d.y - 6, 10, color);
      }
      
      // Draw dungeon name label
      ctx.fillStyle='rgba(255,255,255,.9)';
      ctx.font='12px system-ui';
      ctx.fillText(d.name, d.x - ctx.measureText(d.name).width/2, d.y + 34);
    }
  }

  // draw solid square walls around sites
  for(const s of state.sites){
    if(!s.wall) continue;
    const halfW = s.wall.r;
    const thickness = s.wall.thickness || 12;
    
    ctx.fillStyle = 'rgba(60,50,40,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(100,80,60,0.8)';
    
    // Draw 4 solid walls: top, right, bottom, left
    // Top wall
    ctx.fillRect(s.x - halfW, s.y - halfW - thickness, halfW*2, thickness);
    ctx.strokeRect(s.x - halfW, s.y - halfW - thickness, halfW*2, thickness);
    
    // Right wall
    ctx.fillRect(s.x + halfW, s.y - halfW, thickness, halfW*2);
    ctx.strokeRect(s.x + halfW, s.y - halfW, thickness, halfW*2);
    
    // Bottom wall
    ctx.fillRect(s.x - halfW, s.y + halfW, halfW*2, thickness);
    ctx.strokeRect(s.x - halfW, s.y + halfW, halfW*2, thickness);
    
    // Left wall
    ctx.fillRect(s.x - halfW - thickness, s.y - halfW, thickness, halfW*2);
    ctx.strokeRect(s.x - halfW - thickness, s.y - halfW, thickness, halfW*2);
    
    // Draw corner towers
    const cornerR = 6;
    ctx.fillStyle = 'rgba(80,65,50,0.95)';
    ctx.beginPath(); ctx.arc(s.x - halfW, s.y - halfW, cornerR, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + halfW, s.y - halfW, cornerR, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x - halfW, s.y + halfW, cornerR, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + halfW, s.y + halfW, cornerR, 0, Math.PI*2); ctx.fill();
    
    // Draw small HP indicators for each wall
    const walls = [
      {x: s.x, y: s.y - halfW - thickness/2, label: 'T'},  // Top
      {x: s.x + halfW + thickness/2, y: s.y, label: 'R'},   // Right
      {x: s.x, y: s.y + halfW + thickness/2, label: 'B'},   // Bottom
      {x: s.x - halfW - thickness/2, y: s.y, label: 'L'}    // Left
    ];
    
    for(let i = 0; i < 4; i++){
      const side = s.wall.sides && s.wall.sides[i];
      if(!side) continue;
      const pct = side.hp / side.maxHp;
      const w = 5, h = 16;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(walls[i].x - w/2, walls[i].y - h/2, w, h);
      ctx.fillStyle = pct > 0.6 ? '#4caf50' : (pct > 0.25 ? '#ffc107' : '#f44336');
      ctx.fillRect(walls[i].x - w/2, walls[i].y - h/2 + (1-pct)*h, w, pct*h);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(walls[i].x - w/2, walls[i].y - h/2, w, h);
    }
  }

  // aim line
  if(state.options.showAim && !state.player.dead){
    // compute a small world-space aim segment pointing toward the mouse
    const cam2 = state.camera || { x:0, y:0, zoom:1 };
    const c = state.engine.canvas;
    const wmX = (state.input.mouse.x - c.width/2) / (cam2.zoom||1) + cam2.x;
    const wmY = (state.input.mouse.y - c.height/2) / (cam2.zoom||1) + cam2.y;
    const dx = wmX - state.player.x, dy = wmY - state.player.y;
    const dist = Math.hypot(dx,dy) || 1;
    const len = Math.min(36, dist); // short line length
    const ex = state.player.x + (dx/dist)*len;
    const ey = state.player.y + (dy/dist)*len;
    ctx.globalAlpha=0.9;
    ctx.strokeStyle='rgba(122,162,255,.95)';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(state.player.x, state.player.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.globalAlpha=1;
  }

  // wells
  for(const w of state.effects.wells){
    const isHostile = w.isHostile || false;
    const wColor = isHostile ? '#e55959' : (w.color || '#9b7bff');
    const strokeColor = isHostile ? 'rgba(229, 89, 89, .65)' : 'rgba(186,150,255,.45)';
    ctx.globalAlpha=0.22;
    ctx.fillStyle=wColor;
    ctx.beginPath(); ctx.arc(w.x,w.y,w.r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.strokeStyle=strokeColor;
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(w.x,w.y,w.r*0.92,0,Math.PI*2); ctx.stroke();
  }

  // heals (yellow expanding circle cues)
  if(state.effects && state.effects.heals){
    for(const h of state.effects.heals){
      const ttl = h._ttl || (h._ttl = Math.max(0.001, h.t || 1));
      const life = clamp(h.t/ttl, 0, 1);
      const baseR = (h.beacon?.r || 34);
      const r = baseR * (0.9 + (1 - life) * 0.35);
      const cx = h.beacon?.x ?? (h.targets && h.targets[0]?.x) ?? state.player.x;
      const cy = h.beacon?.y ?? (h.targets && h.targets[0]?.y) ?? state.player.y;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#ffd760';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255, 215, 96, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r*0.82, 0, Math.PI*2); ctx.stroke();
    }
  }

  // slashes (melee visuals for all units) - damage area indicators
  if(state.effects && state.effects.slashes){
    for(const s of state.effects.slashes){
      const originX = s.x !== undefined ? s.x : state.player.x;
      const originY = s.y !== undefined ? s.y : state.player.y;
      const ang = (typeof s.dir === 'number')
        ? s.dir
        : (()=>{
            const wm = state.input && state.input.mouse ? state.input.mouse : { x: originX+1, y: originY };
            return Math.atan2(wm.y-originY, wm.x-originX);
          })();
      const t = Math.max(0, Math.min(1, s.t/0.12));
      // Draw filled damage area
      ctx.globalAlpha = 0.25 * t;
      ctx.fillStyle = s.color || 'rgba(155,123,255,0.5)';
      ctx.beginPath(); ctx.arc(originX, originY, s.range, ang - s.arc/2, ang + s.arc/2); ctx.fill();
      // Draw outline for clarity
      ctx.globalAlpha = 0.7 * t;
      ctx.strokeStyle = s.color || 'rgba(255,255,255,0.9)'; 
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(originX, originY, s.range, ang - s.arc/2, ang + s.arc/2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // storms (spinning damage auras)
  if(state.effects && state.effects.storms){
    for(const s of state.effects.storms){
      const life = Math.max(0, Math.min(1, s.t/(s.t + 0.1)));
      ctx.globalAlpha = 0.35 * life;
      ctx.fillStyle = '#9b7bff';
      ctx.beginPath(); ctx.arc(state.player.x, state.player.y, s.r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(155, 123, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(state.player.x, state.player.y, s.r*0.9, 0, Math.PI*2); ctx.stroke();
    }
  }

  // flashes (ability impact visuals) - includes ground AoE indicators
  if(state.effects && state.effects.flashes){
    for(const f of state.effects.flashes){
      const alpha = Math.max(0, Math.min(1, f.life/0.8));
      ctx.globalAlpha = 0.25 * alpha;
      ctx.fillStyle = f.color || '#b68cff';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.0 - alpha*0.2), 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = f.color ? 'rgba(255,255,255,'+ (0.45*alpha) +')' : 'rgba(182,140,255,'+ (0.6*alpha) +')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.0 - alpha*0.2), 0, Math.PI*2); ctx.stroke();
    }
  }

  // leap strike and ground AoE indicators
  if(state.effects && state.effects.leapIndicators){
    for(const li of state.effects.leapIndicators){
      const alpha = Math.max(0, Math.min(1, (li.life || 0.5) / 0.5));
      ctx.globalAlpha = 0.3 * alpha;
      ctx.fillStyle = '#9b7bff';
      ctx.beginPath(); ctx.arc(li.x, li.y, li.r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.6 * alpha;
      ctx.strokeStyle = 'rgba(155, 123, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(li.x, li.y, li.r, 0, Math.PI*2); ctx.stroke();
    }
  }

  // loot
  for(const l of state.loot){
    const alpha=clamp(l.timeLeft/LOOT_TTL,0.15,1);
    ctx.globalAlpha=alpha;
    drawTriangle(ctx, l.x,l.y,12,l.item.rarity.color||'#fff');
    ctx.globalAlpha=1;
  }

  // enemies
  for(const e of state.enemies){
    if(activeDungeon && e.dungeonId !== activeDungeon) continue;
    // Boss enemies have doubled orb size
    const orbRadius = e.boss ? ((e.r||18) * 2) : (e.r||18);
    const orbPadding = e.boss ? 4 : 2;
    
    // draw orb (team-colored or orange for bosses)
    let ec = null;
    if(e.boss) {
      ec = '#ff8c00'; // Orange for bosses
    } else if(e.team) {
      ec = teamColor(e.team);
    } else {
      ec = '#9b6b4b';
    }
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = ec;
    ctx.beginPath(); ctx.arc(e.x, e.y, orbRadius + orbPadding, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    
    // Thick black border for boss orbs
    if(e.boss){
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(e.x, e.y, orbRadius + orbPadding, 0, Math.PI*2); ctx.stroke();
    }
    
    // For bosses with boss icons, draw icon overlay instead of variant sprite
    if(e.boss && bossIcons.loaded && e.bossIcon){
      const bossImg = bossIcons[e.bossIcon];
      if(bossImg){
        // Fit boss icon inside the orb
        const iconSize = orbRadius * 1.6;
        ctx.save();
        ctx.globalAlpha = 1;
        // Draw circular clipping mask for boss icon
        ctx.beginPath();
        ctx.arc(e.x, e.y, orbRadius - 2, 0, Math.PI*2);
        ctx.clip();
        ctx.drawImage(bossImg, e.x - iconSize/2, e.y - iconSize/2, iconSize, iconSize);
        ctx.restore();
      }
    } else {
      // Regular enemies use variant sprite
      // Note: warden class uses tank.svg sprite
      const variantName = e.variant || (e.boss ? 'warden' : (e.knight ? 'knight' : null));
      const spriteFile = (variantName==='warden') ? 'tank' : variantName;
      const path = spriteFile ? `assets/char/${spriteFile}.svg` : null;
      const img = path ? loadCachedImage(state, path) : null;
      if(img){
        const size = Math.max(16, Math.floor((e.r||18)*1.6));
        ctx.drawImage(img, e.x - size/2, e.y - size/2, size, size);
      }
    }
    
    // HP bar (adjusted for boss size)
    const hpBarY = e.y - orbRadius - (e.boss ? 22 : 18);
    const hpBarWidth = e.boss ? 50 : 34;
    drawHpBar(ctx, e.x, hpBarY, hpBarWidth, 6, Math.max(0, (e.hp||0)/(e.maxHp||1)), e.level, true);
    
    // Boss name label
    if(e.boss && e.name){
      ctx.font = 'bold 13px system-ui';
      ctx.fillStyle = 'rgba(255,215,0,0.95)';
      ctx.textAlign = 'center';
      const nameY = e.y - orbRadius - (e.boss ? 26 : 18);
      ctx.fillText(e.name, e.x, nameY);
    }
    
    // draw block indicator (blue ring when actively blocking - guards only)
    if(e.blocking && e.stam > 0){
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle='#6ec0ff';
      ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(e.x, e.y, orbRadius + 14, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // draw shield indicator (cyan shield ring for enemy shields - different from block ring)
    if(e.shield && e.shield > 0){
      const shieldRatio = Math.min(1, e.shield / (e.maxShield || 100));
      ctx.globalAlpha = 0.5 + 0.3*shieldRatio;
      ctx.strokeStyle = '#80e5ff'; // Lighter cyan to distinguish from block
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, orbRadius + 8, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawDebuffBadges(ctx, e.x, e.y - orbRadius - (e.boss ? 34 : 28), collectDebuffBadges(e));
  }

  // creatures (neutral wildlife)
  if(state.creatures){
    for(const c of state.creatures){
      // Skip creatures that don't match current context (dungeon vs world)
      // If in dungeon: only render creatures with matching dungeonId
      // If in world: only render creatures without dungeonId
      if(activeDungeon){
        if(c.dungeonId !== activeDungeon) continue;
      } else {
        if(c.dungeonId) continue;
      }
      
      // Boss creatures have doubled orb size (r=48 instead of 24)
      const orbRadius = c.boss ? ((c.r||12) * 2) : (c.r||12);
      const orbPadding = c.boss ? 4 : 2;
      
      // base orb
      const col = c.boss ? '#ff8c00' : (c.color || '#6ab06a'); // Orange for boss
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(c.x, c.y, orbRadius + orbPadding, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      
      // Thick black border for boss orbs
      if(c.boss){
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(c.x, c.y, orbRadius + orbPadding, 0, Math.PI*2); ctx.stroke();
      }
      
      // For bosses, draw boss icon overlay instead of creature variant
      if(c.boss && bossIcons.loaded && c.bossIcon){
        const bossImg = bossIcons[c.bossIcon];
        if(bossImg){
          // Fit boss icon inside the orb (slightly smaller than orb diameter)
          const iconSize = orbRadius * 1.6;
          ctx.save();
          ctx.globalAlpha = 1;
          // Draw circular clipping mask for boss icon
          ctx.beginPath();
          ctx.arc(c.x, c.y, orbRadius - 2, 0, Math.PI*2);
          ctx.clip();
          ctx.drawImage(bossImg, c.x - iconSize/2, c.y - iconSize/2, iconSize, iconSize);
          ctx.restore();
        }
      } else if(!c.boss) {
        // Regular creatures use variant image
        const path = c.variant ? `assets/char/${c.variant}.svg` : null;
        const img = path ? loadCachedImage(state, path) : null;
        if(img){
          const size = Math.max(18, Math.floor((c.r||12)*1.8));
          ctx.drawImage(img, c.x - size/2, c.y - size/2, size, size);
        }
      }
      
      // HP bar (adjusted position for boss size)
      const hpBarY = c.y - orbRadius - (c.boss ? 20 : 16);
      const hpBarWidth = c.boss ? 40 : 26;
      drawHpBar(ctx, c.x, hpBarY, hpBarWidth, 5, Math.max(0, (c.hp||0)/(c.maxHp||1)), c.level);
      
      // name label (adjusted position for boss size)
      if(c.name){
        ctx.font = c.boss ? 'bold 13px system-ui' : '11px system-ui';
        ctx.fillStyle = c.boss ? 'rgba(255,215,0,0.95)' : 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        const nameY = c.y - orbRadius - (c.boss ? 24 : 20);
        ctx.fillText(c.name, c.x, nameY);
      }
    }
  }

  // friendlies
  for(const a of state.friendlies){
    // In dungeons, only show group members; in overworld, hide all friendlies
    if(activeDungeon){
      const isGroupMember = state.group && state.group.members && state.group.members.includes(a.id);
      if(!isGroupMember) continue;
    }
    if(a.respawnT>0) continue;
    // draw orb first (match player color for all player friendlies)
    const fcol = teamColor('player');
    ctx.globalAlpha = 0.92; ctx.fillStyle = fcol; ctx.beginPath(); ctx.arc(a.x,a.y,a.r+2,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
    // draw variant image on top
    const v = a.variant || 'warrior';
    const p = `assets/char/${v}.svg`;
    const im = loadCachedImage(state, p);
    if(im){ const sz = Math.max(14, Math.floor(a.r*1.6)); ctx.drawImage(im, a.x - sz/2, a.y - sz/2, sz, sz); }
    drawHpBar(ctx, a.x, a.y-a.r-16, 28, 5, a.hp/a.maxHp, a.level);
    // draw shield indicator (orange shield ring)
    if(a.shield && a.shield > 0){
      const shieldRatio = Math.min(1, a.shield / (a.maxShield || 100));
      ctx.globalAlpha = 0.4 + 0.3*shieldRatio;
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r+8, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // projectiles
  for(const p of state.projectiles){
    let pcol = p.color;
    if(!pcol){
      if(p.fromPlayer) pcol = teamColor('player');
      else if(p.team) pcol = teamColor(p.team);
      else pcol = '#e55959';
    }
    ctx.fillStyle = pcol;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  }

  // bolt visuals
  if(state.effects && state.effects.bolts){
    for(const b of state.effects.bolts){
      ctx.globalAlpha = Math.max(0, Math.min(1, b.life));
      ctx.fillStyle = '#bfe8ff';
      ctx.beginPath(); ctx.arc(b.x, b.y, 6*b.life, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // player
  if(state.player.dead) ctx.globalAlpha=0.35;
  // draw shield ring (orange shield indicator)
  if(state.player.shield>0){
    const st = currentStats(state);
    const shieldRatio = Math.min(1, state.player.shield / (state.player.maxShield || st.maxHp));
    ctx.globalAlpha = 0.4 + 0.3*shieldRatio;
    ctx.strokeStyle='#ffb347';
    ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(state.player.x,state.player.y,state.player.r+8,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // draw block indicator (blue ring when actively blocking)
  if(state.input.mouse.rDown && !state.player.dead){
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle='#6ec0ff';
    ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(state.player.x,state.player.y,state.player.r+14,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // draw player orb
  const pOrb = cssVar('--player');
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = pOrb;
  ctx.beginPath(); ctx.arc(state.player.x,state.player.y,state.player.r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#000'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(state.player.x,state.player.y,state.player.r,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=1;
  // draw class image in the center of the player orb
  const pClass = state.player.class || 'warrior';
  const pPath = `assets/char/${pClass}.svg`;
  const pImg = loadCachedImage(state, pPath);
  if(pImg){
    const size = Math.max(16, Math.floor(state.player.r * 1.4));
    ctx.drawImage(pImg, state.player.x - size/2, state.player.y - size/2, size, size);
  }
  // draw gold crown emoji above player orb
  ctx.save();
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = 0.95;
  ctx.fillText('👑', state.player.x, state.player.y - state.player.r - 18);
  ctx.restore();
  ctx.globalAlpha=1;

  // heavy charge ring
  if(state.input.mouse.lDown && !state.player.dead){
    const t=clamp(state.input.mouse.lHeldMs/380,0,1);
    ctx.strokeStyle = t>=1 ? cssVar('--legend') : 'rgba(255,255,255,.35)';
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.arc(state.player.x,state.player.y,state.player.r+12,-Math.PI/2,-Math.PI/2+Math.PI*2*t);
    ctx.stroke();
  }
  ctx.restore();

  // HUD updates (screen-space)
  if(state.ui){
    if(state.uiHidden){ state.ui.toggleHud(false); state.ui._renderBottomBar(); }
    else { state.ui.toggleHud(true); state.ui.renderHud(currentStats(state)); }
  }

  // floating damage numbers
  if(state.effects && state.effects.damageNums && state.effects.damageNums.length){
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    for(const d of state.effects.damageNums){
      const a = Math.max(0, Math.min(1, d.life));
      ctx.globalAlpha = a;
      ctx.fillStyle = d.crit ? '#ffd27a' : '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      ctx.strokeText(String(d.amt), d.x, d.y);
      ctx.fillText(String(d.amt), d.x, d.y);
    }
    ctx.restore();
  }

  // Interaction prompt (e.g., "Press F to Open Marketplace")  
  if(state.player && !state.player.dead){
    const prompt = getInteractionPrompt(state);
    
    // Main interaction prompt - centered on screen
    if(prompt && !state.inMenu && !state.showInventory && !state.showSkills && !state.showLevel && !state.showMarketplace && !state.showBaseActions && !state.showGarrison){
      const interactKey = state.binds?.interact || 'KeyF';
      const displayKey = interactKey.replace('Key', '').replace('Digit', '').replace('Left', '').replace('Right', '');
      
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0); // Reset transform for screen-space rendering
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const text = `Press ${displayKey} ${prompt.text}`;
      const x = canvas.width / 2;
      const y = canvas.height / 2;
      
      // Text with black stroke border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(text, x, y);
      
      // White fill
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x, y);
      
      ctx.restore();
    }
  }

  // minimap
  drawMiniMap(ctx, canvas, state);

  // full map overlay
  if(state.mapOpen) drawFullMap(ctx, canvas, state);
}

function collectDebuffBadges(entity){
  const badges = [];
  if(entity?.buffs){
    for(const b of entity.buffs){
      const meta = BUFF_REGISTRY?.[b.id];
      if(!meta || !meta.debuff) continue;
      const stats = meta.stats || {};
      const ttl = Math.max(0, (b.t ?? meta.duration ?? 0)).toFixed(1);
      let icon = '⛔';
      let color = '#f88';
      if(stats.stunned) { icon='⚡'; color='#ff7d7d'; }
      else if(stats.rooted) { icon='🌿'; color='#a0e471'; }
      else if(stats.silenced) { icon='🔇'; color='#b8a0ff'; }
      else if(typeof stats.speed === 'number' && stats.speed < 0) { icon='🐢'; color='#7aa2ff'; }
      badges.push({ icon, color, ttl });
    }
  }
  if(entity?.dots){
    for(const d of entity.dots){
      const meta = DOT_REGISTRY?.[d.id];
      const ttl = Math.max(0, d.t || meta?.duration || 0).toFixed(1);
      const icon = (d.id||'').includes('burn') ? '🔥' : '🩸';
      badges.push({ icon, color:'#ff9a8a', ttl });
    }
  }
  return badges.slice(0,4);
}

function drawDebuffBadges(ctx, x, y, badges){
  if(!badges || !badges.length) return;
  ctx.save();
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const gap = 4;
  const badgeW = 26;
  const totalW = badges.length*badgeW + (badges.length-1)*gap;
  let cx = x - totalW/2;
  for(const b of badges){
    const w = badgeW;
    const h = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(cx, y - h/2, w, h, 6); else ctx.rect(cx, y - h/2, w, h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
    ctx.fillStyle = b.color || '#fff';
    ctx.fillText(b.icon, cx + 4, y);
    ctx.fillStyle = '#e8eeff';
    ctx.fillText(b.ttl, cx + 14, y);
    cx += w + gap;
  }
  ctx.restore();
}

function drawGrid(ctx, canvas){
  const step=44;
  ctx.globalAlpha=0.12;
  ctx.strokeStyle='#7aa2ff';
  ctx.lineWidth=1;
  for(let x=0;x<canvas.width;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  for(let y=0;y<canvas.height;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
  ctx.globalAlpha=1;
}

function drawTriangle(ctx,x,y,size,color){
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(x,y-size);
  ctx.lineTo(x-size*0.9,y+size*0.9);
  ctx.lineTo(x+size*0.9,y+size*0.9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.25)';
  ctx.lineWidth=2;
  ctx.stroke();
}

function drawHpBar(ctx, x,y,w,h,pct,level,isEnemy){
  const p=clamp(pct,0,1);
  
  // If level is provided, draw level circle at the start
  let barStartX = x - w/2;
  if(level !== undefined && level !== null){
    const circleR = h + 2; // Circle radius slightly larger than bar height
    const circleX = barStartX - circleR - 2; // Position to the left of bar
    const circleY = y + h/2; // Center vertically with bar
    
    // Circle background with appropriate color
    ctx.fillStyle = isEnemy ? '#ff0000' : '#d4af37';
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI*2);
    ctx.fill();
    
    // Border with appropriate color
    ctx.strokeStyle = isEnemy ? '#ff4444' : '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Level text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(level.toString(), circleX, circleY);
  }
  
  // Outline with appropriate color - red for enemies, gold for others
  ctx.strokeStyle = isEnemy ? '#ff0000' : '#d4af37';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x-w/2, y, w, h);
  
  // Background
  ctx.fillStyle='rgba(0,0,0,.45)';
  ctx.fillRect(x-w/2,y,w,h);
  
  // Health fill
  ctx.fillStyle='#7dff9b';
  ctx.fillRect(x-w/2,y,w*p,h);
}

function drawSite(ctx, s, state){
  const isBase = s.id.endsWith('_base');
  const ownerColor = s.owner ? (teamColor(s.owner) || cssVar('--enemy')) : cssVar('--enemy');
  if(isBase){
    // Draw home base image in circular crop
    let imageDrawn = false;
    try{
      const homeBaseImg = loadCachedImage(state, 'assets/structure/Home Base.png');
      if(homeBaseImg){
        // Save context for circular clipping
        ctx.save();
        // Create circular clip path
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r + 18, 0, Math.PI * 2);
        ctx.clip();
        // Draw the home base image to fill the circle
        const imgSize = (s.r + 18) * 2;
        ctx.drawImage(homeBaseImg, s.x - imgSize/2, s.y - imgSize/2, imgSize, imgSize);
        ctx.restore();
        imageDrawn = true;
      }
    }catch(e){}
    
    // If image failed, draw castle emoji as fallback
    if(!imageDrawn){
      // Draw castle emoji 🏰
      ctx.font = `${s.r * 1.6}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText('🏰', s.x, s.y);
      ctx.shadowBlur = 0;
    }
    
    // draw a colored ring around the base
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 5;
    ctx.beginPath(); 
    ctx.arc(s.x, s.y, s.r+18, 0, Math.PI*2); 
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = ownerColor;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.stroke();
    // draw flag image for flag sites, with a small colored accent behind it
    try{
      const img = loadCachedImage(state, 'assets/structure/castle_flag.svg');
      if(img){ const sz = Math.min(s.r*0.8, 48); ctx.drawImage(img, s.x - sz/2, s.y - sz/2 - 6, sz, sz); }
      // small colored halo
      ctx.globalAlpha = 0.9; ctx.fillStyle = ownerColor; ctx.beginPath(); ctx.arc(s.x, s.y + s.r*0.6, 6, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
    }catch(e){}
  }

  if(!isBase){
    const prog=clamp(s.prog,0,1);
    
    // Determine which flag image to show based on owner and damage state
    let flagImage = null;
    if(!s.owner || (s.health !== undefined && s.health <= 0)){
      // Uncaptured flag (no owner or destroyed)
      flagImage = 'assets/structure/Uncaptured Flag.png';
    } else if(s.damageState === 'damaged'){
      // Damaged captured flag (70% health or below)
      flagImage = 'assets/structure/Damaged Outpost.png';
    } else if(s.owner && prog >= 1){
      // Fully captured healthy flag (show for all teams, not just player)
      flagImage = 'assets/structure/Captured Flag Outpost.png';
    }
    
    // Draw the appropriate flag image in circular crop
    if(flagImage){
      try{
        const img = loadCachedImage(state, flagImage);
        if(img){
          // Save context for circular clipping
          ctx.save();
          // Create circular clip path
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r + 10, 0, Math.PI * 2);
          ctx.clip();
          // Draw the flag image to fill the circle
          const imgSize = (s.r + 10) * 2;
          ctx.drawImage(img, s.x - imgSize/2, s.y - imgSize/2, imgSize, imgSize);
          ctx.restore();
        }
      }catch(e){}
    } else {
      // Fallback rendering for partially captured flags or when image unavailable
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = ownerColor;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
      ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.stroke();
      // draw flag image for flag sites, with a small colored accent behind it
      try{
        const img = loadCachedImage(state, 'assets/structure/castle_flag.svg');
        if(img){ const sz = Math.min(s.r*0.8, 48); ctx.drawImage(img, s.x - sz/2, s.y - sz/2 - 6, sz, sz); }
        // small colored halo
        ctx.globalAlpha = 0.9; ctx.fillStyle = ownerColor; ctx.beginPath(); ctx.arc(s.x, s.y + s.r*0.6, 6, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
      }catch(e){}
    }
    
    // Draw progress ring
    ctx.strokeStyle=ownerColor;
    ctx.lineWidth=5;
    ctx.beginPath();
    ctx.arc(s.x,s.y,s.r+10, -Math.PI/2, -Math.PI/2 + Math.PI*2*prog);
    ctx.stroke();
    
    // Draw circular health ring for captured flags
    if(s.owner && s.health >= 0 && s.maxHealth > 0){
      const healthPct = s.health / s.maxHealth;
      // Orange ring with lineWidth of 4, slightly larger radius than progress ring
      ctx.strokeStyle = '#ff9933';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r + 20, -Math.PI/2, -Math.PI/2 + Math.PI*2*healthPct);
      ctx.stroke();
    }
  }

  ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.font='12px system-ui';
  ctx.fillText(s.name, s.x - ctx.measureText(s.name).width/2, s.y + 4);
}

function drawMiniMap(ctx, canvas, state){
  const mw=200, mh=120; const pad=10;
  const x=canvas.width-mw-pad, y=pad;
  // Gold border
  ctx.strokeStyle='#d4af37';
  ctx.lineWidth=3;
  ctx.strokeRect(x-2,y-2,mw+4,mh+4);
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(x-2,y-2,mw+4,mh+4);
  ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(x,y,mw,mh);
  const mapW = state.mapWidth || canvas.width; const mapH = state.mapHeight || canvas.height;
  const scale = Math.min(mw/mapW, mh/mapH);
  // background
  ctx.fillStyle='#446b3e'; ctx.fillRect(x,y,mw,mh);
  // draw sites
  for(const s of state.sites){ 
    if(!s.id.startsWith('site_') && !s.id.endsWith('_base')) continue; 
    const sx = x + (s.x/mapW)*mw; 
    const sy = y + (s.y/mapH)*mh; 
    const isBase = s.id.endsWith('_base');
    const siteColor = (s.owner ? (teamColor(s.owner) || '#888888') : '#888888');
    
    // Draw emoji for bases and outposts
    if(isBase){
      // Castle for bases 🏰
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Team-colored border
      ctx.strokeStyle = siteColor;
      ctx.lineWidth = 2;
      ctx.fillStyle = siteColor;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); 
      ctx.arc(sx, sy, 7, 0, Math.PI*2); 
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); 
      ctx.arc(sx, sy, 7, 0, Math.PI*2); 
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.fillText('🏰', sx, sy);
      
      // Label for base
      ctx.font = '8px system-ui';
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(sx - 20, sy + 10, 40, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(s.id.replace('_', ' '), sx, sy + 16);
    } else {
      // Flag for outposts 🚩
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Team-colored border
      ctx.strokeStyle = siteColor;
      ctx.lineWidth = 1.5;
      ctx.fillStyle = siteColor;
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); 
      ctx.arc(sx, sy, 5, 0, Math.PI*2); 
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); 
      ctx.arc(sx, sy, 5, 0, Math.PI*2); 
      ctx.stroke();
      
      ctx.fillStyle = siteColor;
      ctx.fillText('🚩', sx, sy);
      
      // No label on minimap for flags (too cluttered)
    }
  }
  // player arrow (pointing in movement direction)
  const px = x + (state.player.x/mapW)*mw; const py = y + (state.player.y/mapH)*mh;
  const playerAngle = Math.atan2(state.player.vy || 0, state.player.vx || 0) || 0;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(playerAngle);
  ctx.fillStyle = cssVar('--player');
  ctx.beginPath();
  // Arrow shape: point at (5,0), back corners at (-3,3) and (-3,-3)
  ctx.moveTo(5, 0);
  ctx.lineTo(-3, 3);
  ctx.lineTo(-3, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();
  // friendly dots
  if(state.friendlies){
    for(const f of state.friendlies){
      if(f.dead) continue;
      const fx = x + (f.x/mapW)*mw; const fy = y + (f.y/mapH)*mh;
      ctx.fillStyle = '#4a9eff'; ctx.beginPath(); ctx.arc(fx,fy,2.5,0,Math.PI*2); ctx.fill();
    }
  }
  // dungeon icons
  if(state.dungeons){
    for(const d of state.dungeons){ 
      const dx = x + (d.x/mapW)*mw; 
      const dy = y + (d.y/mapH)*mh; 
      
      // Icon background
      ctx.fillStyle = d.cleared ? 'rgba(80,60,40,0.5)' : 'rgba(139,90,43,0.5)';
      ctx.beginPath(); 
      ctx.arc(dx, dy, 5, 0, Math.PI*2); 
      ctx.fill();
      ctx.strokeStyle = d.cleared ? '#8B7355' : '#FF6B35';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); 
      ctx.arc(dx, dy, 5, 0, Math.PI*2); 
      ctx.stroke();
      
      // Dungeon icon
      ctx.font = '9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = d.cleared ? '#A0826D' : '#FFD700';
      ctx.fillText(d.cleared ? '🗡️' : '⚔️', dx, dy);
      
      // Label
      ctx.font = '7px system-ui';
      const label = d.name || `Lvl ${d.level || '?'}`;
      const labelWidth = ctx.measureText(label).width + 6;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(dx - labelWidth/2, dy + 7, labelWidth, 10);
      ctx.fillStyle = d.cleared ? '#A0A0A0' : '#FFD700';
      ctx.fillText(label, dx, dy + 12);
    }
  }
}

function drawFullMap(ctx, canvas, state){
  const w = Math.min(canvas.width*0.9, state.mapWidth*0.6);
  const h = Math.min(canvas.height*0.9, state.mapHeight*0.6);
  const x = (canvas.width-w)/2, y = (canvas.height-h)/2;
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  // Gold border around map
  ctx.strokeStyle='#d4af37';
  ctx.lineWidth=4;
  ctx.strokeRect(x-2,y-2,w+4,h+4);
  ctx.fillStyle='#062'; ctx.fillRect(x,y,w,h);
  const mapW = state.mapWidth||canvas.width, mapH = state.mapHeight||canvas.height;
  const scale = Math.min(w/mapW, h/mapH);
  // draw sites and detect hover for fast-travel
  const mouse = state.input && state.input.mouse ? state.input.mouse : { x: -9999, y: -9999 };
  let hoverSite = null;
  let hoverDist = 99999;
  for(const s of state.sites){
    const sx = x + s.x*scale; const sy = y + s.y*scale;
    const isBase = s.id && s.id.endsWith('_base');
    const siteColor = (s.owner ? (teamColor(s.owner) || '#888888') : '#888888');
    
    if(isBase){
      // Castle for bases 🏰
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Team-colored border
      ctx.strokeStyle = siteColor;
      ctx.lineWidth = 3;
      ctx.fillStyle = siteColor;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); 
      ctx.arc(sx, sy, 12, 0, Math.PI*2); 
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); 
      ctx.arc(sx, sy, 12, 0, Math.PI*2); 
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.fillText('🏰', sx, sy);
      
      // Label for base
      ctx.font = 'bold 12px system-ui';
      const baseLabel = s.id.replace('_', ' ').toUpperCase();
      const baseLabelWidth = ctx.measureText(baseLabel).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(sx - baseLabelWidth/2, sy + 18, baseLabelWidth, 16);
      ctx.fillStyle = siteColor;
      ctx.fillText(baseLabel, sx, sy + 26);
    } else {
      // Flag for outposts 🚩
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Team-colored border
      ctx.strokeStyle = siteColor;
      ctx.lineWidth = 2;
      ctx.fillStyle = siteColor;
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); 
      ctx.arc(sx, sy, 9, 0, Math.PI*2); 
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); 
      ctx.arc(sx, sy, 9, 0, Math.PI*2); 
      ctx.stroke();
      
      ctx.fillStyle = siteColor;
      ctx.fillText('🚩', sx, sy);
      
      // Label for flag (use the site's actual name like "Flag 1", "Flag 2", etc.)
      ctx.font = 'bold 11px system-ui';
      const flagLabel = s.name || s.id;
      const outpostLabelWidth = ctx.measureText(flagLabel).width + 6;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(sx - outpostLabelWidth/2, sy + 14, outpostLabelWidth, 14);
      ctx.fillStyle = siteColor;
      ctx.fillText(flagLabel, sx, sy + 21);
    }
    
    // only consider clickable player-owned sites
    if(s.owner==='player'){
      const dx = mouse.x - sx, dy = mouse.y - sy; const d = Math.sqrt(dx*dx+dy*dy);
      if(d < 12 && d < hoverDist){ hoverDist = d; hoverSite = { site: s, sx, sy }; }
    }
  }
  // player arrow (pointing in movement direction)
  const px = x + state.player.x*scale; const py = y + state.player.y*scale;
  const playerAngle = Math.atan2(state.player.vy || 0, state.player.vx || 0) || 0;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(playerAngle);
  ctx.fillStyle = cssVar('--player');
  ctx.beginPath();
  // Arrow shape: point at (8,0), back corners at (-5,5) and (-5,-5)
  ctx.moveTo(8, 0);
  ctx.lineTo(-5, 5);
  ctx.lineTo(-5, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  // friendly dots
  if(state.friendlies){
    for(const f of state.friendlies){
      if(f.dead) continue;
      const fx = x + f.x*scale; const fy = y + f.y*scale;
      ctx.fillStyle = '#4a9eff'; ctx.beginPath(); ctx.arc(fx,fy,5,0,Math.PI*2); ctx.fill();
    }
  }
  // if hovering a player-owned site, highlight and show label
  if(hoverSite){
    ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(hoverSite.sx, hoverSite.sy, 12, 0, Math.PI*2); ctx.stroke();
    // draw small label near cursor
    const label = 'Fast travel';
    const lx = Math.min(canvas.width - 110, Math.max(10, mouse.x + 12));
    const ly = Math.max(24, mouse.y - 10);
    ctx.font='13px system-ui';
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(lx-6, ly-16, ctx.measureText(label).width+14, 22);
    ctx.fillStyle='rgba(255,255,255,0.98)'; ctx.fillText(label, lx+1, ly);
  }
  // instructions
  ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='14px system-ui'; ctx.fillText('Press M to close map. +/- to zoom. Arrow keys to pan.', x+8, y+h-12);
  // draw dungeons on full map
  if(state.dungeons){ 
    for(const d of state.dungeons){ 
      const dx = x + d.x*scale; 
      const dy = y + d.y*scale; 
      
      // Icon background
      ctx.fillStyle = d.cleared ? 'rgba(80,60,40,0.5)' : 'rgba(139,90,43,0.5)';
      ctx.beginPath(); 
      ctx.arc(dx, dy, 10, 0, Math.PI*2); 
      ctx.fill();
      ctx.strokeStyle = d.cleared ? '#8B7355' : '#FF6B35';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); 
      ctx.arc(dx, dy, 10, 0, Math.PI*2); 
      ctx.stroke();
      
      // Dungeon icon
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = d.cleared ? '#A0826D' : '#FFD700';
      ctx.fillText(d.cleared ? '🗡️' : '⚔️', dx, dy);
      
      // Label
      ctx.font = 'bold 11px system-ui';
      const label = d.name || `DUNGEON LVL ${d.level || '?'}`;
      const labelWidth = ctx.measureText(label).width + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(dx - labelWidth/2, dy + 16, labelWidth, 15);
      ctx.fillStyle = d.cleared ? '#A0A0A0' : '#FFD700';
      ctx.fillText(label, dx, dy + 23);
    } 
  }
}
