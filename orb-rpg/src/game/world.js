import { clamp, rand } from "../engine/util.js";

// Expose map loading to global scope for easy access from console
window.loadCustomMap = function(imageUrl){
  const state = window._gameState; // Assumes game state is attached to window
  if(!state){ console.error('Game state not found. Make sure _gameState is set.'); return; }
  // Delay the dynamic import to avoid race conditions
  Promise.resolve().then(() => import('./world.js')).then(m => m.loadMapFromImage(state, imageUrl)).then(()=>{
    console.log('✓ Map loaded. Restart the game to see changes.');
    location.reload();
  }).catch(e => console.error('Map load failed:', e));
};

export function initSites(state){
  const { canvas } = state.engine;
  // create a larger world (3x screen) with an out-of-bounds border
  const BORDER_SIZE = 300; // out-of-bounds area around playable map
  const playableWidth = canvas.width * 3;
  const playableHeight = canvas.height * 3;
  state.mapWidth = playableWidth + (BORDER_SIZE * 2);
  state.mapHeight = playableHeight + (BORDER_SIZE * 2);
  // Store playable bounds for collision checking
  state.playableBounds = {
    minX: BORDER_SIZE,
    minY: BORDER_SIZE,
    maxX: BORDER_SIZE + playableWidth,
    maxY: BORDER_SIZE + playableHeight
  };
  state.sites.length=0;
  const pad=140;
  // player base bottom-left, teamA top-left, teamB top-right (offset by border)
  const offsetX = state.playableBounds.minX;
  const offsetY = state.playableBounds.minY;
  const playWidth = state.playableBounds.maxX - state.playableBounds.minX;
  const playHeight = state.playableBounds.maxY - state.playableBounds.minY;
  state.sites.push({ id:'player_base', name:'Player Base', x:offsetX+pad, y:offsetY+playHeight-pad, r:92, owner:'player', prog:1 });
  state.sites.push({ id:'team_a_base', name:'Red Base', x:offsetX+pad, y:offsetY+pad, r:92, owner:'teamA', prog:1 });
  state.sites.push({ id:'team_b_base', name:'Yellow Base', x:offsetX+playWidth-pad, y:offsetY+pad, r:92, owner:'teamB', prog:1 });
  // third AI team (teamC) bottom-right corner - use Blue team
  state.sites.push({ id:'team_c_base', name:'Blue Base', x:offsetX+playWidth-pad, y:offsetY+playHeight-pad, r:92, owner:'teamC', prog:1 });

  // generate random flags across the map (avoid near bases, stay in playable area)
  const FLAG_COUNT = 6;
  for(let i=0;i<FLAG_COUNT;i++){
    let x,y,ok=false,tries=0;
    while(!ok && tries<120){
      x = offsetX + Math.random()*(playWidth-240) + 120;
      y = offsetY + Math.random()*(playHeight-240) + 120;
      ok = true;
      for(const b of state.sites){ if(Math.hypot(b.x-x,b.y-y) < 220) { ok=false; break; } }
      tries++;
    }
    state.sites.push({ id:`site_${i}`, name:`Flag ${i+1}`, x,y, r:74, owner: null, prog:0 });
  }

  // per-site guard respawn timers (array of seconds remaining), spawn flags and attack state
  for(const s of state.sites){ s.guardRespawns = []; s.spawnActive = false; s.underAttack = false; s._justCaptured = false; s._prevOwner = s.owner; }
  // generate simple terrain features: trees and mountains
  state.trees = [];
  state.mountains = [];
  state.waters = [];
  state.lakes = [];
  state.rivers = [];
  state.waterCircles = [];
  state.mountainCircles = [];
  // border-only visuals kept out of collision checks for perf
  state.borderTrees = [];
  state.borderMountains = [];

  // Fill out-of-bounds border with dense trees and mountains
  const BORDER_DENSITY = 25; // spacing between obstacles

  // Top and bottom borders
  for(let x = 0; x < state.mapWidth; x += BORDER_DENSITY){
    // Top border
    for(let y = 0; y < state.playableBounds.minY; y += BORDER_DENSITY){
      if(Math.random() > 0.5){
        state.borderTrees.push({x: x + Math.random()*BORDER_DENSITY, y: y + Math.random()*BORDER_DENSITY, r:12});
      } else {
        const mx = x + Math.random()*BORDER_DENSITY;
        const my = y + Math.random()*BORDER_DENSITY;
        const peaks = [{x:mx, y:my, r:35}];
        state.borderMountains.push({x:mx, y:my, peaks});
      }
    }
    // Bottom border
    for(let y = state.playableBounds.maxY; y < state.mapHeight; y += BORDER_DENSITY){
      if(Math.random() > 0.5){
        state.borderTrees.push({x: x + Math.random()*BORDER_DENSITY, y: y + Math.random()*BORDER_DENSITY, r:12});
      } else {
        const mx = x + Math.random()*BORDER_DENSITY;
        const my = y + Math.random()*BORDER_DENSITY;
        const peaks = [{x:mx, y:my, r:35}];
        state.borderMountains.push({x:mx, y:my, peaks});
      }
    }
  }

  // Left and right borders
  for(let y = 0; y < state.mapHeight; y += BORDER_DENSITY){
    // Left border
    for(let x = 0; x < state.playableBounds.minX; x += BORDER_DENSITY){
      if(Math.random() > 0.5){
        state.borderTrees.push({x: x + Math.random()*BORDER_DENSITY, y: y + Math.random()*BORDER_DENSITY, r:12});
      } else {
        const mx = x + Math.random()*BORDER_DENSITY;
        const my = y + Math.random()*BORDER_DENSITY;
        const peaks = [{x:mx, y:my, r:35}];
        state.borderMountains.push({x:mx, y:my, peaks});
      }
    }
    // Right border
    for(let x = state.playableBounds.maxX; x < state.mapWidth; x += BORDER_DENSITY){
      if(Math.random() > 0.5){
        state.borderTrees.push({x: x + Math.random()*BORDER_DENSITY, y: y + Math.random()*BORDER_DENSITY, r:12});
      } else {
        const mx = x + Math.random()*BORDER_DENSITY;
        const my = y + Math.random()*BORDER_DENSITY;
        const peaks = [{x:mx, y:my, r:35}];
        state.borderMountains.push({x:mx, y:my, peaks});
      }
    }
  }

  // base scatter (only in playable area)
  const TREE_COUNT = Math.floor((playWidth*playHeight)/(60000));
  for(let i=0;i<TREE_COUNT;i++){
    let ok=false, tx,ty,tries=0;
    while(!ok && tries<200){
      tx = offsetX + Math.random()*(playWidth-80)+40;
      ty = offsetY + Math.random()*(playHeight-80)+40;
      ok=true;
      for(const b of state.sites){ if(Math.hypot(b.x-tx,b.y-ty) < 120) { ok=false; break; } }
      tries++;
    }
    if(ok) state.trees.push({x:tx,y:ty,r:12});
  }
  // clustered groves for denser forests
  const CLUSTERS = 16;
  for(let c=0;c<CLUSTERS;c++){
    const cx = offsetX + Math.random()*(playWidth-200)+100;
    const cy = offsetY + Math.random()*(playHeight-200)+100;
    let nearBase=false;
    for(const b of state.sites){ if(Math.hypot(b.x-cx,b.y-cy) < 200){ nearBase=true; break; } }
    if(nearBase) continue;
    const treesInCluster = 8 + Math.floor(Math.random()*10);
    for(let t=0;t<treesInCluster;t++){
      const ang = Math.random()*Math.PI*2;
      const dist = 18 + Math.random()*42;
      const tx = cx + Math.cos(ang)*dist;
      const ty = cy + Math.sin(ang)*dist;
      if(tx<offsetX+30 || ty<offsetY+30 || tx>offsetX+playWidth-30 || ty>offsetY+playHeight-30) continue;
      state.trees.push({x:tx,y:ty,r:12});
    }
  }
  // mountains: clustered brown triangles + collision circles
  state.mountains = [];
  state.mountainCircles = [];
  const MOUNT_COUNT = 8;
  for(let i=0;i<MOUNT_COUNT;i++){
    let ok=false, mx,my,tries=0;
    while(!ok && tries<220){
      mx = offsetX + Math.random()*(playWidth-240) + 120;
      my = offsetY + Math.random()*(playHeight-240) + 120;
      ok=true;
      for(const b of state.sites){ if(Math.hypot(b.x-mx,b.y-my) < 180) { ok=false; break; } }
      tries++;
    }
    if(!ok) continue;
    const peaks = [];
    const clusterSize = 3 + Math.floor(Math.random()*4);
    for(let p=0;p<clusterSize;p++){
      const ang = Math.random()*Math.PI*2;
      const dist = 20 + Math.random()*60;
      const px = mx + Math.cos(ang)*dist;
      const py = my + Math.sin(ang)*dist;
      const pr = 28 + Math.random()*36;
      peaks.push({x:px,y:py,r:pr});
      state.mountainCircles.push({x:px,y:py,r:pr});
    }
    // add a central blocker to close gaps between peaks
    const clusterR = 65 + Math.random()*25;
    state.mountainCircles.push({x:mx,y:my,r:clusterR});
    state.mountains.push({x:mx,y:my,peaks});
  }

  // rock formations: grey ovals with subtle shading
  state.rocks = [];
  state.rockCircles = [];
  const ROCK_FORMATIONS = 14;
  for(let i=0;i<ROCK_FORMATIONS;i++){
    const rx = offsetX + Math.random()*(playWidth-200)+100;
    const ry = offsetY + Math.random()*(playHeight-200)+100;
    let nearBase=false;
    for(const b of state.sites){ if(Math.hypot(b.x-rx,b.y-ry) < 180){ nearBase=true; break; } }
    if(nearBase) continue;
    const pieces = 3 + Math.floor(Math.random()*4);
    for(let p=0;p<pieces;p++){
      const ang = Math.random()*Math.PI*2;
      const dist = Math.random()*36;
      const cx = rx + Math.cos(ang)*dist;
      const cy = ry + Math.sin(ang)*dist;
      const r = 10 + Math.random()*22;
      state.rocks.push({x:cx,y:cy,r,rx:r*1.2,ry:r*0.8});
      // slightly larger collision radius to match trees' solidity
      state.rockCircles.push({x:cx,y:cy,r:r*1.1});
    }
  }

  // lakes: create some irregular lakes made from overlapping circles
  const LAKE_COUNT = 5;
  for(let i=0;i<LAKE_COUNT;i++){
    let ok=false, lx,ly,tries=0;
    while(!ok && tries<220){
      lx = offsetX + Math.random()*(playWidth-240) + 120;
      ly = offsetY + Math.random()*(playHeight-240) + 120;
      ok=true;
      for(const b of state.sites){ if(Math.hypot(b.x-lx,b.y-ly) < 220) { ok=false; break; } }
      tries++;
    }
    if(!ok) continue;
    const circles = [];
    const parts = 4 + Math.floor(Math.random()*8);
    const baseR = 24 + Math.random()*80;
    for(let j=0;j<parts;j++){
      const a = Math.random()*Math.PI*2;
      const d = Math.random()*baseR*0.7;
      const cx = lx + Math.cos(a)*d;
      const cy = ly + Math.sin(a)*d;
      const cr = Math.max(12, baseR * (0.4 + Math.random()*0.9));
      circles.push({x:cx,y:cy,r:cr});
      state.waterCircles.push({x:cx,y:cy,r:cr});
    }
    state.lakes.push({x:lx,y:ly,circles:circles});
  }

  // rivers temporarily disabled
  state.rivers = [];

  // small dungeon entrances scattered around the map (click/press F to enter)
  state.dungeons = [];
  const DUNGEON_COUNT = 4;
  for(let di=0; di<DUNGEON_COUNT; di++){
    let dx,dy,ok=false,tries=0;
    while(!ok && tries<160){
      dx = offsetX + Math.random()*(playWidth-240) + 120;
      dy = offsetY + Math.random()*(playHeight-240) + 120;
      ok = true;
      for(const b of state.sites){ if(Math.hypot(b.x-dx,b.y-dy) < 220) { ok=false; break; } }
      tries++;
    }
    if(ok) state.dungeons.push({ id: `dungeon_${di}`, name: `Dungeon ${di+1}`, x: dx, y: dy, r: 40, cleared: false });
  }
}

export function playerHome(state){ return state.sites.find(s=>s.id==='player_base'); }
export function getHomeForTeam(state, team){ return state.sites.find(s=>s.id.endsWith('_base') && s.owner===team); }

export function getFriendlyFlags(state){
  return state.sites.filter(s => s.owner==='player' && s.id.startsWith('site_'));
}
export function getFlagsForTeam(state, team){
  return state.sites.filter(s => s.owner===team && s.id.startsWith('site_'));
}
export function getNonPlayerFlags(state){
  return state.sites.filter(s => s.owner && s.owner!=='player' && s.id.startsWith('site_'));
}

export function findNearestEnemyTeamAtSite(state, site, dist){
  let best=null, bestD=Infinity;
  for(const e of state.enemies){
    const d=Math.hypot(e.x-site.x,e.y-site.y);
    if(d<bestD && d<=dist){ bestD=d; best=e; }
  }
  return best? best.team : null;
}

// Spawn simple guard objects around a site. Guards are pushed into state.enemies
// as static defenders until aggroed. Each guard has `guard:true` and `homeSiteId`.
export function spawnGuardsForSite(state, site, count=4){
  // Enforce a hard cap of 4 guards per site
  const currentGuards = state.friendlies.filter(f=>f.guard && f.siteId===site.id && f.respawnT<=0).length + (site.guardRespawns?.length||0);
  const remaining = Math.max(0, 4 - currentGuards);
  if(remaining<=0) return;
  count = Math.min(count, remaining);
  // ensure fixed guard positions are created for the site
  if(!site._guardPositions){
    site._guardPositions = [];
    const total = Math.max(4, count);
    const angStep = (Math.PI*2)/total;
    for(let i=0;i<total;i++){
      const ang = i*angStep + (Math.random()*0.18-0.09);
      const dist = site.r + 28;
      const gx = site.x + Math.cos(ang)*dist;
      const gy = site.y + Math.sin(ang)*dist;
      site._guardPositions.push({x:gx,y:gy});
    }
  }

  // spawn from fixed positions; only spawn into free slots
  let spawned=0;
  for(let pi=0; pi<site._guardPositions.length && spawned<count; pi++){
    const pos = site._guardPositions[pi];
    // check occupancy by enemy or friendly with same homeSiteId
    const occEnemy = state.enemies.find(e=>e.homeSiteId===site.id && Math.hypot(e.x-pos.x,e.y-pos.y)<=8);
    const occFriendly = state.friendlies.find(f=>f.siteId===site.id && Math.hypot(f.x-pos.x,f.y-pos.y)<=8);
    if(occEnemy || occFriendly) continue;
    const x = pos.x, y = pos.y;
    // basic guard stats (aligned with enemyTemplate scale in game.js)
    const guardObj = { x,y, r:13, maxHp:36, hp:36, speed:0, contactDmg:12, hitCd:0, xp:6, attacked:false, guard:true, homeSiteId:site.id, team: site.owner };
    if(site.owner === 'player'){
      const VARS = ['warrior','mage','knight','tank'];
      const v = VARS[Math.floor(Math.random()*VARS.length)];
      state.friendlies.push({
        id: `f_${Date.now()}_${Math.floor(Math.random()*100000)}`,
        name: `${v.charAt(0).toUpperCase()+v.slice(1)} ${Math.floor(Math.random()*999)+1}`,
        x:guardObj.x, y:guardObj.y, r:12, hp:guardObj.hp, maxHp:guardObj.maxHp, speed:0,
        dmg:12, hitCd:0, siteId:site.id, respawnT:0, guard:true, homeSiteId:site.id,
        _spawnX:guardObj.x, _spawnY:guardObj.y, attacked:false, variant: v,
        behavior: 'neutral', buffs:[], dots:[]
      });
    } else {
      // enemy guards use a guard/knight visual
      guardObj.variant = 'knight';
      state.enemies.push(guardObj);
    }
    spawned++;
  }
}

export function enemiesNearSite(state, site, dist){
  for(const e of state.enemies){
    if(Math.hypot(e.x-site.x,e.y-site.y) <= dist) return true;
  }
  return false;
}
export function friendliesNearSite(state, site, dist){
  for(const a of state.friendlies){
    if(a.respawnT>0) continue;
    if(Math.hypot(a.x-site.x,a.y-site.y) <= dist) return true;
  }
  return false;
}

export function updateCapture(state, dt){
  const { player } = state;
  for(const s of state.sites){
    s.underAttack = s.underAttack || false;
    // Only flags (site_*) are capturable. Bases are safe and cannot be captured.
    if(s.id && s.id.endsWith && s.id.endsWith('_base')){ s.underAttack = false; continue; }

    const playerInside = !player.dead && Math.hypot(player.x-s.x, player.y-s.y) <= s.r;
    const enemiesClose = enemiesNearSite(state, s, s.r*1.15);

    // If site is not player-owned and player is contesting it
    if(s.owner!=='player' && playerInside && !enemiesClose){
      s.prog = clamp(s.prog + dt*0.24, 0, 1);
      s.underAttack = true;
      if(s.prog >= 1){
        s.owner='player';
        s._justCaptured = 'player';
        state.ui.toast(`<b>${s.name}</b> captured! Friendlies will spawn to defend.`);
        // spawn friendlies/guards immediately when player captures
        if(typeof spawnGuardsForSite === 'function') spawnGuardsForSite(state, s);
        // add defensive walls around captured flag site (smaller than base walls)
        if(s.id && s.id.startsWith && s.id.startsWith('site_')){
          const baseR = s.r + 18;
          const sides = [];
          for(let i=0;i<4;i++) sides.push({ hp: 60, maxHp: 60, destroyed: false, lastDamaged: -9999 });
          s.wall = { r: baseR, thickness: 10, gateSide: Math.floor(Math.random()*4), sides: sides, cornerR: 8, repairCooldown: 5.0 };
          s.wall.gateOpen = false;
        }
      }
    } else if(s.owner==='player'){
      s.underAttack = false;
      const enemyInside = enemiesNearSite(state, s, s.r*0.90);
      const allyInside = friendliesNearSite(state, s, s.r*0.90);
      if(enemyInside && !playerInside && !allyInside){
        s.prog = clamp(s.prog - dt*0.18, 0, 1);
        if(s.prog <= 0){
          // determine which enemy team is capturing
          const team = findNearestEnemyTeamAtSite(state, s, s.r*1.15) || 'teamA';
          s.owner = team;
          s._justCaptured = team;
          state.ui.toast(`<span class="neg"><b>${s.name}</b> was recaptured by ${team}.</span>`);
          // spawn guards when a site becomes controlled by a team
          if(typeof spawnGuardsForSite === 'function') spawnGuardsForSite(state, s);
          // (re)create defensive walls for the new owner when site is recaptured
          if(s.id && s.id.startsWith && s.id.startsWith('site_')){
            const baseR = s.r + 18;
            const sides = [];
            for(let i=0;i<4;i++) sides.push({ hp: 60, maxHp: 60, destroyed: false, lastDamaged: -9999 });
            s.wall = { r: baseR, thickness: 10, gateSide: Math.floor(Math.random()*4), sides: sides, cornerR: 8, repairCooldown: 5.0 };
            s.wall.gateOpen = false;
          }
        }
        } else {
        if(playerInside || allyInside) s.prog = clamp(s.prog + dt*0.12, 0, 1);
      }
    }

    // Allow enemy teams to capture neutral (owner === null) sites when uncontested.
    // Use s.prog as a neutral capture progress and s._captureTeam to track which team is progressing.
    if(s.owner === null){
      const allyInside = friendliesNearSite(state, s, s.r*0.90);
      const enemyTeam = findNearestEnemyTeamAtSite(state, s, s.r*0.90);
      if(enemyTeam && !playerInside && !allyInside){
        // if a different team begins capturing, reset progress
        if(s._captureTeam && s._captureTeam !== enemyTeam) s.prog = 0;
        s._captureTeam = enemyTeam;
        s.underAttack = true;
        s.prog = clamp(s.prog + dt*0.18, 0, 1);
        if(s.prog >= 1){
          s.owner = enemyTeam;
          s._justCaptured = enemyTeam;
          state.ui.toast(`<span class=\"neg\"><b>${s.name}</b> was captured by ${enemyTeam}.</span>`);
          if(typeof spawnGuardsForSite === 'function') spawnGuardsForSite(state, s);
          // create defensive walls for the new owner when a neutral site is captured
          if(s.id && s.id.startsWith && s.id.startsWith('site_')){
            const baseR = s.r + 18;
            const sides = [];
            for(let i=0;i<4;i++) sides.push({ hp: 60, maxHp: 60, destroyed: false, lastDamaged: -9999 });
            s.wall = { r: baseR, thickness: 10, gateSide: Math.floor(Math.random()*4), sides: sides, cornerR: 8, repairCooldown: 5.0 };
            s.wall.gateOpen = false;
          }
        }
      } else {
        // decay neutral capture progress when uncontested or player nearby
        s.prog = clamp(s.prog - dt*0.04, 0, 1);
        if(s.prog <= 0) delete s._captureTeam;
      }
    }

    if(!playerInside){
      if(s.owner && s.owner!=='player') s.prog = clamp(s.prog - dt*0.04, 0, 1);
      if(s.owner==='player') s.prog = clamp(s.prog + dt*0.03, 0, 1);
    }
  }
}
// Load terrain from an image-based map
// Image color guide:
// - Black (0,0,0): Mountain
// - Blue (0,0,255): Water
// - Green (0,128,0): Grass (passable)
// - Gray (128,128,128): Tree
// Scale: each pixel = 1 world unit
export function loadMapFromImage(state, imageUrl){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    // Don't set crossOrigin - local files don't need it
    img.onload = ()=>{
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;

        // Clear existing terrain
        state.mapWidth = img.width;
        state.mapHeight = img.height;
        state.trees = [];
        state.mountains = [];
        state.mountainCircles = [];
        state.rocks = [];
        state.rockCircles = [];
        state.waterCircles = [];
        state.lakes = [];
        state.rivers = [];
        state.borderTrees = [];
        state.borderMountains = [];

      // Parse image pixels
      for(let i=0; i<data.length; i+=4){
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if(a < 128) continue; // skip transparent
        const idx = i/4;
        const x = idx % img.width;
        const y = Math.floor(idx / img.width);

        // Black = Mountain (peaks)
        if(r<50 && g<50 && b<50){
          // cluster mountains: add peaks at this location
          const peaks = [];
          for(let j=0; j<2; j++){
            const ox = (Math.random()-0.5)*40;
            const oy = (Math.random()-0.5)*40;
            const pr = 20 + Math.random()*20;
            peaks.push({x: x+ox, y: y+oy, r: pr});
            state.mountainCircles.push({x: x+ox, y: y+oy, r: pr});
          }
          state.mountains.push({x, y, peaks});
        }
        // Blue = Water (lakes/rivers)
        else if(r<50 && g<50 && b>200){
          const cr = 12 + Math.random()*20;
          state.waterCircles.push({x, y, r: cr});
        }
        // Gray = Tree
        else if(r>100 && g>100 && b>100 && Math.abs(r-g)<30 && Math.abs(g-b)<30){
          state.trees.push({x, y, r: 10});
        }
      }

      // Ensure bases are placed even on non-grass terrain
      const { canvas: gameCanvas } = state.engine;
      state.mapWidth = Math.max(state.mapWidth, gameCanvas.width * 3);
      state.mapHeight = Math.max(state.mapHeight, gameCanvas.height * 3);

      // Clear and reinit sites on the image map
      state.sites.length = 0;
      const pad = 140;
      const cornerPad = Math.min(pad, Math.min(state.mapWidth, state.mapHeight)/4);
      state.sites.push({ id:'player_base', name:'Player Base', x:cornerPad, y:state.mapHeight-cornerPad, r:92, owner:'player', prog:1 });
      state.sites.push({ id:'team_a_base', name:'Red Base', x:cornerPad, y:cornerPad, r:92, owner:'teamA', prog:1 });
      state.sites.push({ id:'team_b_base', name:'Yellow Base', x:state.mapWidth-cornerPad, y:cornerPad, r:92, owner:'teamB', prog:1 });
      state.sites.push({ id:'team_c_base', name:'Blue Base', x:state.mapWidth-cornerPad, y:state.mapHeight-cornerPad, r:92, owner:'teamC', prog:1 });

      // Add flags in the middle regions
      const FLAG_COUNT = 6;
      for(let i=0; i<FLAG_COUNT; i++){
        let x, y, ok=false, tries=0;
        while(!ok && tries<120){
          x = Math.random()*(state.mapWidth-240)+120;
          y = Math.random()*(state.mapHeight-240)+120;
          ok = true;
          for(const b of state.sites){ if(Math.hypot(b.x-x, b.y-y) < 220){ ok=false; break; } }
          tries++;
        }
        if(ok) state.sites.push({ id:`site_${i}`, name:`Flag ${i+1}`, x, y, r:74, owner: null, prog:0 });
      }

      // Initialize respawn queues for all sites
      for(const s of state.sites){ 
        s.guardRespawns = []; 
        s.spawnActive = false; 
        s.underAttack = false; 
        s._justCaptured = false; 
        s._prevOwner = s.owner;
      }

      resolve(state);
      } catch(err) {
        reject(err);
      }
    };
    img.onerror = ()=> reject(new Error(`Failed to load map image: ${imageUrl}`));
    img.src = imageUrl;
  });
}