import { clamp, rand } from "../engine/util.js";
// Note: applyClassToUnit and npcInitAbilities are passed as parameters to avoid circular dependencies

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
  for(const s of state.sites){ 
    s.guardRespawns = []; 
    s.spawnActive = false; 
    s.underAttack = false; 
    s._justCaptured = false; 
    s._prevOwner = s.owner;
    // Add health properties for flags (not bases)
    if(s.id && s.id.startsWith('site_')){
      s.maxHealth = 500;
      s.health = s.maxHealth;
      s.damageState = 'undamaged'; // 'undamaged', 'damaged', 'destroyed'
      s._underAttackNotified = false;
    }
  }
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

  // decorative objects with collision (winter trees, ponds, rock formations, crystals)
  state.decorativeCircles = [];
  
  // Winter trees - solid collision
  const DECO_TREE_COUNT = 15;
  for(let i = 0; i < DECO_TREE_COUNT; i++){
    let tx, ty, ok = false, tries = 0;
    while(!ok && tries < 160){
      tx = offsetX + Math.random() * (playWidth - 240) + 120;
      ty = offsetY + Math.random() * (playHeight - 240) + 120;
      ok = true;
      for(const b of state.sites){ if(Math.hypot(b.x - tx, b.y - ty) < 200) { ok = false; break; } }
      for(const rc of state.rockCircles){ if(Math.hypot(rc.x - tx, rc.y - ty) < 120) { ok = false; break; } }
      tries++;
    }
    if(ok) state.decorativeCircles.push({x: tx, y: ty, r: 24, type: 'tree'});
  }
  
  // Ponds - solid collision
  const DECO_POND_COUNT = 4;
  for(let i = 0; i < DECO_POND_COUNT; i++){
    let px, py, ok = false, tries = 0;
    while(!ok && tries < 160){
      px = offsetX + Math.random() * (playWidth - 280) + 140;
      py = offsetY + Math.random() * (playHeight - 280) + 140;
      ok = true;
      for(const b of state.sites){ if(Math.hypot(b.x - px, b.y - py) < 220) { ok = false; break; } }
      for(const rc of state.rockCircles){ if(Math.hypot(rc.x - px, rc.y - py) < 140) { ok = false; break; } }
      for(const dc of state.decorativeCircles){ if(Math.hypot(dc.x - px, dc.y - py) < 140) { ok = false; break; } }
      tries++;
    }
    if(ok) state.decorativeCircles.push({x: px, y: py, r: 96, type: 'pond', textureVariant: Math.floor(Math.random() * 4)});
  }
  
  // Additional rock formations - solid collision
  const DECO_ROCK_COUNT = 2;
  for(let i = 0; i < DECO_ROCK_COUNT; i++){
    let rockx, rocky, ok = false, tries = 0;
    while(!ok && tries < 160){
      rockx = offsetX + Math.random() * (playWidth - 240) + 120;
      rocky = offsetY + Math.random() * (playHeight - 240) + 120;
      ok = true;
      for(const b of state.sites){ if(Math.hypot(b.x - rockx, b.y - rocky) < 200) { ok = false; break; } }
      for(const rc of state.rockCircles){ if(Math.hypot(rc.x - rockx, rc.y - rocky) < 140) { ok = false; break; } }
      for(const dc of state.decorativeCircles){ if(Math.hypot(dc.x - rockx, dc.y - rocky) < 140) { ok = false; break; } }
      tries++;
    }
    if(ok) state.decorativeCircles.push({x: rockx, y: rocky, r: 40, type: 'rocks', textureVariant: Math.floor(Math.random() * 2)});
  }
  
  // Crystals - solid collision
  const DECO_CRYSTAL_COUNT = 14;
  for(let i = 0; i < DECO_CRYSTAL_COUNT; i++){
    let cx, cy, ok = false, tries = 0;
    while(!ok && tries < 160){
      cx = offsetX + Math.random() * (playWidth - 240) + 120;
      cy = offsetY + Math.random() * (playHeight - 240) + 120;
      ok = true;
      for(const b of state.sites){ if(Math.hypot(b.x - cx, b.y - cy) < 200) { ok = false; break; } }
      for(const rc of state.rockCircles){ if(Math.hypot(rc.x - cx, rc.y - cy) < 120) { ok = false; break; } }
      for(const dc of state.decorativeCircles){ if(Math.hypot(dc.x - cx, dc.y - cy) < 120) { ok = false; break; } }
      tries++;
    }
    if(ok) state.decorativeCircles.push({x: cx, y: cy, r: 22, type: 'crystal'});
  }

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

// Destroy all guards at a site (called when flag is captured)
function destroyAllGuardsAtSite(state, site, previousOwner){
  // Remove friendly guards
  const friendlyGuardsToRemove = state.friendlies.filter(f => f.guard && f.homeSiteId === site.id);
  for(const guard of friendlyGuardsToRemove){
    const idx = state.friendlies.indexOf(guard);
    if(idx >= 0) state.friendlies.splice(idx, 1);
  }
  
  // Remove enemy guards
  const enemyGuardsToRemove = state.enemies.filter(e => e.guard && e.homeSiteId === site.id);
  for(const guard of enemyGuardsToRemove){
    const idx = state.enemies.indexOf(guard);
    if(idx >= 0) state.enemies.splice(idx, 1);
  }
  
  console.log(`[destroyAllGuardsAtSite] Destroyed ${friendlyGuardsToRemove.length + enemyGuardsToRemove.length} guards at ${site.id}`);
}

// Assign gear to guard based on rarity tier
function assignGuardGear(guard, rarityKey){
  const RARITIES = {
    common: { key:'common', tier: 1, name: 'Common', color: '#c8c8c8' },
    uncommon: { key:'uncommon', tier: 2, name: 'Uncommon', color: '#8fd' },
    rare: { key:'rare', tier: 3, name: 'Rare', color: '#9cf' },
    epic: { key:'epic', tier: 4, name: 'Epic', color: '#c9f' },
    legendary: { key:'legend', tier: 5, name: 'Legendary', color: '#f9c' }
  };
  
  const rarity = RARITIES[rarityKey] || RARITIES.common;
  
  // Equipment is already assigned by npcInitAbilities, just update rarity
  if(guard.equipment && guard.equipment.weapon){
    guard.equipment.weapon.rarity = rarity;
  }
  
  console.log(`[assignGuardGear] Assigned ${rarity.name} gear to ${guard.name}`);
}

// Spawn simple guard objects around a site. Guards are pushed into state.enemies
// as static defenders until aggroed. Each guard has `guard:true` and `homeSiteId`.
export function spawnGuardsForSite(state, site, count=5){
  console.log('[spawnGuardsForSite] Called for site:', site.id, 'owner:', site.owner, 'requestCount:', count);
  
  // Get utility functions from state (injected by game.js to avoid circular imports)
  const applyClassToUnit = state._npcUtils?.applyClassToUnit;
  const npcInitAbilities = state._npcUtils?.npcInitAbilities;
  
  // Enforce a hard cap of 5 guards per site
  const currentGuards = state.friendlies.filter(f=>f.guard && f.homeSiteId===site.id && f.respawnT<=0).length + (site.guardRespawns?.length||0);
  const remaining = Math.max(0, 5 - currentGuards);
  console.log('[spawnGuardsForSite] currentGuards:', currentGuards, 'remaining:', remaining);
  
  if(remaining<=0) {
    console.log('[spawnGuardsForSite] No slots remaining, returning');
    return;
  }
  count = Math.min(count, remaining);
  // Initialize site guard progression tracking
  if(!site.guardProgression){
    site.guardProgression = {
      timeHeld: 0, // Total time flag has been held by current owner
      gearRarity: 'common', // Current gear rarity
      lastUpgrade: 0, // Time of last gear upgrade
      levels: [1, 1, 1, 1, 1] // Individual guard levels
    };
  }
  
  // ensure fixed guard positions are created for the site (star/pentagon formation)
  if(!site._guardPositions){
    site._guardPositions = [];
    const offset = site.r + 70; // Distance from flag center (increased for better spacing)
    // 5 guards in a perfect pentagon formation around the flag
    // Pentagon: 5 points, each separated by 72 degrees (360/5)
    for(let i = 0; i < 5; i++){
      // Starting from top (-90 degrees), rotating clockwise
      const angle = (i * 72 * Math.PI / 180) - (Math.PI / 2);
      site._guardPositions.push({
        x: site.x + Math.cos(angle) * offset,
        y: site.y + Math.sin(angle) * offset
      });
    }
  }

  // Coordinated guard composition: 2 Healers (mage) + 3 DPS (warrior)
  const GUARD_COMPOSITION = ['mage', 'mage', 'warrior', 'warrior', 'warrior'];
  
  // spawn from fixed positions with defined roles
  let spawned=0;
  for(let pi=0; pi<site._guardPositions.length && spawned<count; pi++){
    const pos = site._guardPositions[pi];
    // check occupancy by guard at this position
    const occEnemy = state.enemies.find(e=>e.guard && e.homeSiteId===site.id && Math.hypot(e.x-pos.x,e.y-pos.y)<=8);
    const occFriendly = state.friendlies.find(f=>f.guard && f.homeSiteId===site.id && Math.hypot(f.x-pos.x,f.y-pos.y)<=8);
    if(occEnemy || occFriendly) continue;
    const x = pos.x, y = pos.y;
    
    // Get variant from composition
    const v = GUARD_COMPOSITION[pi] || 'warrior';
    const isHealer = (v === 'mage');
    
    // Get guard level from progression (defaults to 1)
    const guardLevel = site.guardProgression?.levels?.[pi] || 1;
    
    // Base guard stats (level 1 baseline)
    const guardObj = { 
      x, y, r:13, maxHp:50, hp:50, speed:0, contactDmg:10, hitCd:0, xp:8, 
      attacked:false, guard:true, homeSiteId:site.id, team: site.owner,
      guardFlagId: site.id,
      guardRole: isHealer ? 'HEALER' : 'DPS',
      level: guardLevel,
      guardIndex: pi // Track which guard this is (0-4)
    };
    
    if(site.owner === 'player'){
      const friendlyGuard = {
        id: `f_${Date.now()}_${Math.floor(Math.random()*100000)}`,
        name: `${v.charAt(0).toUpperCase()+v.slice(1)} Guard ${spawned+1}`,
        x:guardObj.x, y:guardObj.y, r:12, hp:guardObj.hp, maxHp:guardObj.maxHp, speed:0,
        dmg:10, hitCd:0, siteId:site.id, respawnT:0, guard:true, homeSiteId:site.id,
        guardFlagId: site.id,
        _spawnX:guardObj.x, _spawnY:guardObj.y, attacked:false, variant: v,
        behavior: 'guard', buffs:[], dots:[], level: guardLevel,
        guardRole: guardObj.guardRole,
        guardFormation: true, // Enable coordinated group behavior
        guardIndex: pi
      };
      // Force weapon for guards: warriors get Destruction Staff, mages get Healing Staff
      if (v === 'warrior') {
        friendlyGuard.weaponType = 'Destruction Staff';
        if (friendlyGuard.weapons) friendlyGuard.weapons = [friendlyGuard.weapons.find(w => w.weaponType === 'Destruction Staff')];
      } else if (v === 'mage') {
        friendlyGuard.weaponType = 'Healing Staff';
        if (friendlyGuard.weapons) friendlyGuard.weapons = [friendlyGuard.weapons.find(w => w.weaponType === 'Healing Staff')];
      }
      // Apply class stats and initialize abilities with weapon
      if(applyClassToUnit) applyClassToUnit(friendlyGuard, v);
      if(npcInitAbilities) npcInitAbilities(friendlyGuard, { state, source: 'spawnGuardsForSite' });
      
      // Apply gear based on site progression
      assignGuardGear(friendlyGuard, site.guardProgression?.gearRarity || 'common');
      
      state.friendlies.push(friendlyGuard);
      console.log('[spawnGuardsForSite] Spawned friendly guard:', friendlyGuard.name, `L${guardLevel}`, friendlyGuard.guardRole, 'at', friendlyGuard.x, friendlyGuard.y);
    } else {
      // Enemy guards with composition and level
      guardObj.variant = v;
      guardObj.team = site.owner;
      guardObj.guard = true;
      guardObj.homeSiteId = site.id;
      guardObj.guardFormation = true;
      guardObj.guardIndex = pi;
      guardObj._spawnX = guardObj.x; // Set spawn position for return behavior
      guardObj._spawnY = guardObj.y; // Set spawn position for return behavior
      // Force weapon for guards: warriors get Destruction Staff, mages get Healing Staff
      if (v === 'warrior') {
        guardObj.weaponType = 'Destruction Staff';
        if (guardObj.weapons) guardObj.weapons = [guardObj.weapons.find(w => w.weaponType === 'Destruction Staff')];
      } else if (v === 'mage') {
        guardObj.weaponType = 'Healing Staff';
        if (guardObj.weapons) guardObj.weapons = [guardObj.weapons.find(w => w.weaponType === 'Healing Staff')];
      }
      if(applyClassToUnit) applyClassToUnit(guardObj, v);
      if(npcInitAbilities) npcInitAbilities(guardObj, { state, source: 'spawnGuardsForSite' });
      // Guards start stationary but AI will set speed when needed
      guardObj.speed = 0;
      
      state.enemies.push(guardObj);
      console.log('[spawnGuardsForSite] Spawned enemy guard:', v, `L${guardLevel}`, guardObj.guardRole, 'HP:', guardObj.maxHp, 'at', guardObj.x, guardObj.y);
    }
    spawned++;
  }
  console.log('[spawnGuardsForSite] Total spawned:', spawned, 'composition:', GUARD_COMPOSITION.slice(0, spawned));
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

// Count units of each team within a site
export function countUnitsAtSite(state, site, dist){
  const counts = { player: 0, teams: {} };
  
  // Count player
  if(!state.player.dead && Math.hypot(state.player.x-site.x, state.player.y-site.y) <= dist){
    counts.player++;
  }
  
  // Count friendlies (player team)
  for(const a of state.friendlies){
    if(a.respawnT>0) continue;
    if(Math.hypot(a.x-site.x, a.y-site.y) <= dist){
      counts.player++;
    }
  }
  
  // Count enemies by team
  for(const e of state.enemies){
    if(Math.hypot(e.x-site.x, e.y-site.y) <= dist){
      const team = e.team || 'teamA';
      counts.teams[team] = (counts.teams[team] || 0) + 1;
    }
  }
  
  return counts;
}

// Determine which team has the most units at a site
export function getDominantTeam(counts){
  let maxCount = counts.player;
  let dominant = maxCount > 0 ? 'player' : null;
  
  for(const [team, count] of Object.entries(counts.teams)){
    if(count > maxCount){
      maxCount = count;
      dominant = team;
    }
  }
  
  return { team: dominant, count: maxCount };
}

export function updateCapture(state, dt){
  for(const s of state.sites){
    s.underAttack = s.underAttack || false;
    // Only flags (site_*) are capturable. Bases are safe and cannot be captured.
    if(s.id && s.id.endsWith && s.id.endsWith('_base')){ s.underAttack = false; continue; }

    // Count units of each team at this site
    const counts = countUnitsAtSite(state, s, s.r*0.90);
    const dominant = getDominantTeam(counts);
    const contestedByMultipleTeams = (counts.player > 0 ? 1 : 0) + Object.keys(counts.teams).length > 1;
    
    // If multiple teams are contesting, no one can capture (stalemate)
    if(contestedByMultipleTeams){
      s.underAttack = true;
      // Progress decays slightly during contests
      s.prog = clamp(s.prog - dt*0.05, 0, 1);
      if(s._captureTeam && s._captureTeam !== dominant.team){
        delete s._captureTeam;
      }
      continue;
    }
    
    // No units contesting
    if(!dominant.team){
      s.underAttack = false;
      // Only decay progress for neutral flags or if currently being captured
      if(s.owner === null || s._captureTeam){
        s.prog = clamp(s.prog - dt*0.08, 0, 1);
        if(s.prog <= 0) delete s._captureTeam;
      }
      // Owned flags stay owned with full progress when uncontested
      continue;
    }
    
    // Single team is contesting the flag
    const capturingTeam = dominant.team;
    
    // If site is already owned by this team, reinforce progress
    if(s.owner === capturingTeam){
      s.underAttack = false;
      s.prog = clamp(s.prog + dt*0.12, 0, 1);
      delete s._captureTeam;
      continue;
    }
    
    // Team is capturing enemy or neutral flag
    s.underAttack = true;
    
    // PREVENT CAPTURE: If flag has health > 0, don't allow capture (must destroy collision first)
    if(s.owner && s.health > 0){
      continue;
    }
    
    // If a different team begins capturing, reset progress
    if(s._captureTeam && s._captureTeam !== capturingTeam){
      s.prog = 0;
    }
    s._captureTeam = capturingTeam;
    
    // Capture speed based on number of units (more units = faster capture)
    const captureSpeed = 0.15 + (Math.min(dominant.count, 5) * 0.03);
    
    if(s.owner === null){
      // Capturing neutral flag
      s.prog = clamp(s.prog + dt*captureSpeed, 0, 1);
    } else {
      // Capturing enemy flag (reverse progress first)
      s.prog = clamp(s.prog - dt*captureSpeed, 0, 1);
    }
    
    // Check if capture is complete
    if(s.prog >= 1 && s.owner === null){
      // Neutral flag captured
      const previousOwner = s.owner;
      s.owner = capturingTeam;
      s._justCaptured = capturingTeam;
      
      // Log flag capture event
      if(state.debugLog){
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'FLAG_CAPTURED',
          flag: s.name || s.id,
          previousOwner: previousOwner || 'neutral',
          newOwner: capturingTeam,
          playerUnits: dominant.count
        });
      }
      
      // DESTROY all guards from previous owner and reset progression
      destroyAllGuardsAtSite(state, s, previousOwner);
      s.guardProgression = {
        timeHeld: 0,
        gearRarity: 'common',
        lastUpgrade: 0,
        levels: [1, 1, 1, 1, 1]
      };
      
      // Reset health to full when captured
      s.health = s.maxHealth || 500;
      s.damageState = 'undamaged';
      s._underAttackNotified = false;
      
      const msg = capturingTeam === 'player'
        ? `<b>${s.name}</b> captured! Friendlies will spawn to defend.`
        : `<span class="neg"><b>${s.name}</b> was captured by ${capturingTeam}.</span>`;
      state.ui.toast(msg);
      if(typeof spawnGuardsForSite === 'function') spawnGuardsForSite(state, s);
      if(s.id && s.id.startsWith && s.id.startsWith('site_')){
        const baseR = s.r + 18;
        const sides = [];
        for(let i=0;i<4;i++) sides.push({ hp: 200, maxHp: 200, destroyed: false, lastDamaged: -9999 });
        s.wall = { r: baseR, thickness: 10, gateSide: Math.floor(Math.random()*4), sides: sides, cornerR: 8, repairCooldown: 5.0 };
        s.wall.gateOpen = false;
      }
      delete s._captureTeam;
    } else if(s.prog <= 0 && s.owner !== null){
      // Enemy flag flipped
      const previousOwner = s.owner;
      s.owner = capturingTeam;
      s._justCaptured = capturingTeam;
      s.prog = 1; // Set to full once captured
      
      // Log flag recapture event
      if(state.debugLog){
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'FLAG_RECAPTURED',
          flag: s.name || s.id,
          previousOwner,
          newOwner: capturingTeam,
          playerUnits: dominant.count
        });
      }
      
      // DESTROY all guards from previous owner and reset progression
      destroyAllGuardsAtSite(state, s, previousOwner);
      s.guardProgression = {
        timeHeld: 0,
        gearRarity: 'common',
        lastUpgrade: 0,
        levels: [1, 1, 1, 1, 1]
      };
      
      // Reset health to full when captured
      s.health = s.maxHealth || 500;
      s.damageState = 'undamaged';
      s._underAttackNotified = false;
      
      const msg = capturingTeam === 'player'
        ? `<b>${s.name}</b> captured! Friendlies will spawn to defend.`
        : `<span class="neg"><b>${s.name}</b> was recaptured by ${capturingTeam}.</span>`;
      state.ui.toast(msg);
      if(typeof spawnGuardsForSite === 'function') spawnGuardsForSite(state, s);
      if(s.id && s.id.startsWith && s.id.startsWith('site_')){
        const baseR = s.r + 18;
        const sides = [];
        for(let i=0;i<4;i++) sides.push({ hp: 200, maxHp: 200, destroyed: false, lastDamaged: -9999 });
        s.wall = { r: baseR, thickness: 10, gateSide: Math.floor(Math.random()*4), sides: sides, cornerR: 8, repairCooldown: 5.0 };
        s.wall.gateOpen = false;
      }
      delete s._captureTeam;
    }
  }
}

// Update wall damage from proximity contact
export function updateWallDamage(state, dt){
  const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));
  
  for(const s of state.sites){
    // Only process sites with walls
    if(!s.wall || !s.wall.sides) continue;
    
    // Process each wall side (Top=0, Right=1, Bottom=2, Left=3)
    for(let sideIdx = 0; sideIdx < 4; sideIdx++){
      const side = s.wall.sides[sideIdx];
      if(!side || side.destroyed) continue;
      
      // Calculate wall side position
      const midAng = (sideIdx + 0.5) * (Math.PI/2);
      const wallX = s.x + Math.cos(midAng) * s.wall.r * 0.92;
      const wallY = s.y + Math.sin(midAng) * s.wall.r * 0.92;
      const wallRange = s.wall.thickness + 20; // Contact range for damaging wall
      
      let attackers = [];
      
      // Check enemies attacking this wall side
      for(const e of state.enemies){
        if(!e || e.dead || e.hp <= 0) continue;
        if(s.owner === e.team) continue; // Don't attack own walls
        const dist = Math.hypot(e.x - wallX, e.y - wallY);
        if(dist <= wallRange){
          attackers.push({ dmg: e.contactDmg || 10, unit: e });
        }
      }
      
      // Check friendlies attacking this wall side
      for(const f of state.friendlies){
        if(!f || f.respawnT > 0 || f.dead || f.hp <= 0) continue;
        if(s.owner === 'player') continue; // Don't attack own walls
        const dist = Math.hypot(f.x - wallX, f.y - wallY);
        if(dist <= wallRange){
          attackers.push({ dmg: f.contactDmg || f.dmg || 10, unit: f });
        }
      }
      
      // Check player attacking this wall side
      if(state.player && !state.player.dead && state.player.hp > 0 && s.owner !== 'player'){
        const dist = Math.hypot(state.player.x - wallX, state.player.y - wallY);
        if(dist <= wallRange){
          const st = state.currentStats || {atk: 10};
          attackers.push({ dmg: st.atk || 10, unit: state.player });
        }
      }
      
      // Apply damage from all attackers
      if(attackers.length > 0){
        // 8 damage per second per attacker (balanced for siege)
        const totalDamage = attackers.length * 8 * dt;
        const oldHp = side.hp;
        side.hp = Math.max(0, side.hp - totalDamage);
        side.lastDamaged = Date.now();
        
        // Update site damage state based on wall health (for visual effects and fire sounds)
        const wallHealthPct = side.hp / side.maxHp;
        if(wallHealthPct <= 0.70 && s.damageState === 'undamaged'){
          s.damageState = 'damaged';
          s._lastDamageTime = Date.now(); // Track damage time for fire sounds
        }
        
        // Log wall damage periodically (5% sample for performance)
        if(state.debugLog && Math.random() < 0.05){
          const sideNames = ['North', 'East', 'South', 'West'];
          
          // Build attacker details with roles
          const attackerDetails = attackers.map(a => {
            const u = a.unit;
            if(!u) return 'unknown';
            
            // Determine unit type and role
            let unitType = 'unknown';
            let role = 'UNKNOWN';
            
            if(u === state.player){
              unitType = 'player';
              role = 'PLAYER';
            } else if(state.enemies.includes(u)){
              unitType = 'enemy';
              role = (u.role || (u.variant === 'mage' ? 'HEALER' : (u.variant === 'warden' || u.variant === 'knight' ? 'TANK' : 'DPS'))).toUpperCase();
            } else if(state.friendlies.includes(u)){
              unitType = 'friendly';
              role = (u.role || (u.variant === 'mage' ? 'HEALER' : (u.variant === 'warden' || u.variant === 'knight' ? 'TANK' : 'DPS'))).toUpperCase();
            }
            
            const name = u.name || u.variant || 'unknown';
            return `${name}(${role})`;
          });
          
          // Count roles
          const roleCounts = {};
          attackers.forEach(a => {
            const u = a.unit;
            if(!u) return;
            const role = (u === state.player ? 'PLAYER' : 
                         (u.role || (u.variant === 'mage' ? 'HEALER' : 
                                    (u.variant === 'warden' || u.variant === 'knight' ? 'TANK' : 'DPS')))).toUpperCase();
            roleCounts[role] = (roleCounts[role] || 0) + 1;
          });
          
          state.debugLog.push({
            time: (state.campaign?.time || 0).toFixed(2),
            type: 'WALL_DAMAGE',
            site: s.name || s.id,
            side: sideNames[sideIdx],
            attackers: attackers.length,
            attackerList: attackerDetails.join(', '),
            roleCounts: roleCounts,
            damage: Math.round(totalDamage * 100) / 100,
            hpBefore: Math.round(oldHp),
            hpAfter: Math.round(side.hp),
            hpPercent: Math.round((side.hp / side.maxHp) * 100)
          });
        }
        
        // Destroy wall side when HP reaches 0
        if(side.hp <= 0 && !side.destroyed){
          side.destroyed = true;
          side.hp = 0;
          const sideNames = ['North', 'East', 'South', 'West'];
          const msg = `<span class="neg">${sideNames[sideIdx]} wall destroyed at <b>${s.name || s.id}</b>!</span>`;
          if(state.ui) state.ui.toast(msg);
          
          // Log wall destruction
          if(state.debugLog){
            // Build detailed attacker info for destruction event
            const destroyerDetails = attackers.map(a => {
              const u = a.unit;
              if(!u) return 'unknown';
              
              let unitType = 'unknown';
              let role = 'UNKNOWN';
              
              if(u === state.player){
                unitType = 'player';
                role = 'PLAYER';
              } else if(state.enemies.includes(u)){
                unitType = 'enemy';
                role = (u.role || (u.variant === 'mage' ? 'HEALER' : (u.variant === 'warden' || u.variant === 'knight' ? 'TANK' : 'DPS'))).toUpperCase();
              } else if(state.friendlies.includes(u)){
                unitType = 'friendly';
                role = (u.role || (u.variant === 'mage' ? 'HEALER' : (u.variant === 'warden' || u.variant === 'knight' ? 'TANK' : 'DPS'))).toUpperCase();
              }
              
              return `${u.name || u.variant || 'unknown'}(${role},${unitType})`;
            });
            
            // Count roles for destruction
            const destroyerRoles = {};
            attackers.forEach(a => {
              const u = a.unit;
              if(!u) return;
              const role = (u === state.player ? 'PLAYER' : 
                           (u.role || (u.variant === 'mage' ? 'HEALER' : 
                                      (u.variant === 'warden' || u.variant === 'knight' ? 'TANK' : 'DPS')))).toUpperCase();
              destroyerRoles[role] = (destroyerRoles[role] || 0) + 1;
            });
            
            state.debugLog.push({
              time: (state.campaign?.time || 0).toFixed(2),
              type: 'WALL_DESTROYED',
              site: s.name || s.id,
              side: sideNames[sideIdx],
              attackers: attackers.length,
              destroyerList: destroyerDetails.join(', '),
              destroyerRoles: destroyerRoles,
              remainingWalls: s.wall.sides.filter(ws => ws && !ws.destroyed).length
            });
          }
        }
      }
    }
  }
}

// Update flag health and damage states
export function updateFlagHealth(state, dt){
  for(const s of state.sites){
    // Only process capturable flags
    if(!s.id || !s.id.startsWith('site_')) continue;
    if(!s.owner || !s.health) continue;
    
    // Check if enemies are near the flag
    const nearbyEnemies = [];
    for(const e of state.enemies){
      if(!e || e.dead || e.hp <= 0) continue;
      const dist = Math.hypot(e.x - s.x, e.y - s.y);
      if(dist <= s.r + 80){ // Increased from +30 to +80 so they can damage from further away
        // Check if this enemy is hostile to the flag owner
        const enemyTeam = e.team || 'teamA';
        if(enemyTeam !== s.owner){
          nearbyEnemies.push(e);
        }
      }
    }
    
    // Check if allies are attacking the flag
    const nearbyAllies = [];
    for(const f of state.friendlies){
      if(!f || f.respawnT > 0 || f.dead || f.hp <= 0) continue;
      const dist = Math.hypot(f.x - s.x, f.y - s.y);
      if(dist <= s.r + 80){ // Increased from +30 to +80
        // Check if this friendly is attacking an enemy flag
        const friendlyTeam = f.team === 'player' ? 'player' : null;
        if(friendlyTeam === 'player' && s.owner !== 'player'){
          nearbyAllies.push(f);
        }
      }
    }
    
    // Check if player is attacking the flag (can damage enemy flags)
    let playerAttacking = false;
    if(state.player && !state.player.dead && state.player.hp > 0){
      const playerDist = Math.hypot(state.player.x - s.x, state.player.y - s.y);
      if(playerDist <= s.r + 80 && s.owner !== 'player'){
        playerAttacking = true;
      }
    }
    
    // Total attackers dealing damage to flag health
    const totalAttackers = nearbyEnemies.length + nearbyAllies.length + (playerAttacking ? 1 : 0);
    if(totalAttackers > 0){
      const damagePerSecond = totalAttackers * 8; // 8 damage per attacker per second
      s.health = clamp(s.health - damagePerSecond * dt, 0, s.maxHealth);
      s._lastDamageTime = Date.now(); // Track when last damaged
      
      // Update damage state based on health percentage
      const healthPct = s.health / s.maxHealth;
      const oldState = s.damageState;
      
      if(s.health <= 0){
        s.damageState = 'destroyed';
        // When destroyed, remove owner and allow capture
        if(oldState !== 'destroyed'){
          s.owner = null;
          s.prog = 0;
          delete s._captureTeam;
          const msg = `<span class="neg"><b>${s.name}</b> has been destroyed!</span>`;
          state.ui?.toast(msg);
          // Remove collision when destroyed
          s.health = 0;
        }
      } else if(healthPct <= 0.70){
        if(oldState !== 'damaged'){
          s.damageState = 'damaged';
          // Notify once when flag reaches 70% health
          if(!s._underAttackNotified){
            s._underAttackNotified = true;
            const teamName = s.owner === 'player' ? 'Your' : (s.owner === 'teamA' ? 'Red' : (s.owner === 'teamB' ? 'Yellow' : 'Blue'));
            // Find which flag number this is (1-6)
            let flagIndex = 1;
            for(let i = 0; i < state.sites.length; i++){
              if(state.sites[i] === s) flagIndex = i + 1;
            }
            const garrisonKey = `garrisonFlag${Math.min(flagIndex, 6)}`; // Map to 1-6
            const keyBind = state.binds?.[garrisonKey] || 'unbound';
            const keyLabel = keyBind !== 'unbound' ? keyBind.replace('Key', '').replace('Digit', '') : 'unbound';
            const msg = `<span class="neg">⚠️ ${teamName} ${s.name} is under attack!</span><br/><span style="font-size:11px; margin-top:4px;">Press <b>${keyLabel}</b> to assign allies to defend.</span>`;
            state.ui?.toast(msg);
          }
        }
      } else {
        s.damageState = 'undamaged';
      }
    } else {
      // No enemies nearby - regenerate health
      const timeSinceLastDamage = (Date.now() - (s._lastDamageTime || 0)) / 1000;
      const regenDelay = 5.0; // 5 seconds before regeneration starts
      
      if(timeSinceLastDamage >= regenDelay && s.health < s.maxHealth){
        const regenPerSecond = 10; // Regenerate 10 HP per second
        s.health = clamp(s.health + regenPerSecond * dt, 0, s.maxHealth);
        
        // Update damage state based on current health
        const healthPct = s.health / s.maxHealth;
        if(healthPct > 0.70){
          s.damageState = 'undamaged';
          s._underAttackNotified = false; // Reset notification flag when healed
        } else if(healthPct > 0){
          s.damageState = 'damaged';
        }
      }
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