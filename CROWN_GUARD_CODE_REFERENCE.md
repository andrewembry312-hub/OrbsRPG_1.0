# Crown Guard System - Code Reference

## Key Code Snippets

### 1. Loadout Type Definition (game.js ~line 14150)

```javascript
const CROWN_GUARD_LOADOUTS = {
  'tank': {
    loadoutId: 'crown_guard_tank',
    role: 'TANK',
    class: 'warrior',
    name: 'Guard Leader',
    legendary: true,
    priority: 1,  // Highest priority - shield the crown
    abilities: ['guardian_shield', 'last_stand'],
    stats: { hpMult: 1.5, defMult: 1.3, spd: 0.9 }
  },
  'healer': {
    loadoutId: 'crown_guard_healer',
    role: 'HEALER',
    class: 'mage',
    name: 'Archmage',
    legendary: true,
    priority: 2,  // High priority - keep guards alive
    abilities: ['heal_team', 'barrier'],
    stats: { hpMult: 0.9, manaMult: 1.4, spd: 0.95 }
  },
  'dps1': {
    loadoutId: 'crown_guard_dps1',
    role: 'DPS',
    class: 'warrior',
    name: 'Guard Knight',
    legendary: true,
    priority: 3,
    abilities: ['slash', 'power_strike'],
    stats: { dmgMult: 1.3, spd: 1.1 }
  },
  'dps2': {
    loadoutId: 'crown_guard_dps2',
    role: 'DPS',
    class: 'mage',
    name: 'Battle Mage',
    legendary: true,
    priority: 3,
    abilities: ['fireball', 'chain_lightning'],
    stats: { dmgMult: 1.25, manaMult: 1.2, spd: 1.05 }
  },
  'dps3': {
    loadoutId: 'crown_guard_dps3',
    role: 'DPS',
    class: 'warrior',
    name: 'Guard Captain',
    legendary: true,
    priority: 3,
    abilities: ['slash', 'whirlwind'],
    stats: { dmgMult: 1.35, spd: 1.15 }
  }
};
```

### 2. Guard Spawn with Loadouts (game.js ~line 14210)

```javascript
function spawnCrownGuards(state, base, team){
  console.log(`[CROWN GUARDS] Spawning 5 elite guards for ${team} at base`);
  
  if(!state.emperor.crownGuards) state.emperor.crownGuards = {};
  if(!state.emperor.crownGuards[team]) state.emperor.crownGuards[team] = [];
  
  const offset = base.r + 100;
  const loadoutKeys = ['tank', 'healer', 'dps1', 'dps2', 'dps3'];
  
  for(let i = 0; i < 5; i++){
    // Pentagon formation around crown
    const angle = (i * 72 * Math.PI / 180) - (Math.PI / 2);
    const x = base.x + Math.cos(angle) * offset;
    const y = base.y + Math.sin(angle) * offset;
    
    const loadoutKey = loadoutKeys[i];
    const loadout = CROWN_GUARD_LOADOUTS[loadoutKey];
    const crown = state.emperor.crowns?.[team];
    
    // Blue orb elite guard with fighter card images
    const guard = {
      x, y, 
      r: 40,  // Boss size (2x normal creature)
      maxHp: 200,   // Elite guards have significant HP
      hp: 200,
      speed: 3,
      contactDmg: 25,
      hitCd: 0,
      xp: 50,
      attacked: false,
      guard: true,
      crownGuard: true,  // Flag to identify crown guards
      team: team,
      variant: loadout.class,
      guardRole: loadout.role,
      guardName: loadout.name,
      level: 7,  // Stronger than regular enemies
      guardIndex: i,
      respawnT: 0,
      respawnTimer: 5,  // 5 second respawn timer
      _spawnX: x,
      _spawnY: y,
      name: `${loadout.name} (Elite)`,
      
      // === BLUE ORB WITH BLACK BORDER ===
      color: '#3498db',        // Blue orb color
      borderColor: '#000000',  // Black border
      borderWidth: 3,          // Thick black border
      
      // === FIGHTER CARD LOADOUT SYSTEM ===
      loadoutType: loadoutKey,           // Which loadout type
      loadoutId: loadout.loadoutId,      // Unique loadout ID
      npcLoadoutId: loadout.loadoutId,   // For NPC ability system
      npcLoadoutLocked: true,            // Can't change loadout
      
      // === LEGENDARY FIGHTER CARD IMAGES ===
      img: loadout.class === 'warrior' ? 'fighter_warrior' : 'fighter_mage',
      imgPath: `assets/fighter player cards/${loadout.class === 'warrior' ? 'warrior' : 'mage'}.png`,
      scale: 1.3,  // Slightly larger rendering for legendary status
      
      // === CROWN PROTECTION AI ===
      crownGuardLoadout: loadout,      // Full loadout data for abilities/stats
      crownTeam: team,                 // Which team's crown to protect
      crownId: crown?._id,             // The crown entity ID
      crownSiteId: base.id,            // The base site where crown spawns
      guardPriority: loadout.priority, // 1=tank/highest, 2=healer, 3=dps
      guardMode: 'protect',            // Modes: 'protect', 'chase', 'patrol'
      lastCrownX: crown?.x || base.x + 26, // Last seen crown position
      lastCrownY: crown?.y || base.y,
      crownChaseRange: 500,            // Chase crown if beyond this distance
      crownFollowRange: 150,           // Stay within this distance of crown
      crownFormationIndex: i,          // Position in pentagon around crown
      
      // === DO NOT SET ===
      spawnTargetSiteId: null,         // Don't target any outposts
      homeSiteId: null                 // Not defending a base!
    };
    
    ensureEntityId(state, guard);
    
    // Apply stats based on class AND loadout multipliers
    if(state._npcUtils?.applyClassToUnit) {
      state._npcUtils.applyClassToUnit(guard, loadout.class);
    }
    // Apply loadout-specific stat multipliers
    if(loadout.stats) {
      if(loadout.stats.hpMult) guard.maxHp *= loadout.stats.hpMult;
      if(loadout.stats.dmgMult) guard.contactDmg *= loadout.stats.dmgMult;
      if(loadout.stats.defMult) guard.def = (guard.def || 2) * loadout.stats.defMult;
      if(loadout.stats.spd) guard.speed *= loadout.stats.spd;
    }
    guard.hp = guard.maxHp;
    
    // Initialize abilities from loadout
    if(state._npcUtils?.npcInitAbilities) {
      state._npcUtils.npcInitAbilities(guard, { state, source: 'spawnCrownGuards' });
    }
    
    state.enemies.push(guard);
    state.emperor.crownGuards[team].push(guard._id);
    console.log(`[CROWN GUARDS] Spawned ${loadout.name} (Elite) for ${team} - Loadout: ${loadoutKey}, Priority: ${loadout.priority}, GuardMode: protect, CrownSite: ${base.id}`);
  }
}
```

### 3. Priority-Based AI (game.js ~line 14325)

```javascript
function updateCrownGuardAI(state, dt) {
  if (!isEmperorActive(state)) return;
  if (!state.emperor.crownGuards) return;
  
  const teams = ['teamA', 'teamB', 'teamC'];
  
  for (const team of teams) {
    const crown = state.emperor.crowns?.[team];
    const guardIds = state.emperor.crownGuards[team] || [];
    
    if (!crown) continue;
    
    // Determine current crown position
    let crownX = crown.x;
    let crownY = crown.y;
    
    // Update each guard
    for (const guardId of guardIds) {
      const guard = state.enemies.find(e => e._id === guardId);
      if (!guard || guard.hp <= 0) continue;
      
      // Update last known crown position
      guard.lastCrownX = crownX;
      guard.lastCrownY = crownY;
      
      // Calculate distance to crown
      const distToCrown = Math.hypot(guard.x - crownX, guard.y - crownY);
      
      // PRIORITY BASED ON LOADOUT
      const priority = guard.guardPriority || 3;
      
      if (priority === 1) {
        // TANK: Stay closest to crown, block threats
        guard.crownFollowRange = 80;  // Tighter formation
        guard.targetX = crownX;
        guard.targetY = crownY;
        guard.guardMode = 'protect';
        
        // Look for nearby enemies to intercept
        const nearbyEnemies = state.enemies.filter(e => {
          if(e._id === guard._id || e.team === team || e.hp <= 0) return false;
          const d = Math.hypot(e.x - crownX, e.y - crownY);
          return d < 200;  // Enemies within 200 units of crown
        });
        
        if(nearbyEnemies.length > 0) {
          // Move toward nearest threat to intercept
          const threat = nearbyEnemies[0];
          guard.targetX = threat.x;
          guard.targetY = threat.y;
        }
      } 
      else if (priority === 2) {
        // HEALER: Stay mid-range from crown, heal nearby guards
        guard.crownFollowRange = 120;
        
        // Check if any guards are hurt
        const hurtGuards = guardIds
          .map(gid => state.enemies.find(e => e._id === gid))
          .filter(g => g && g.hp < g.maxHp * 0.75);
        
        if(hurtGuards.length > 0) {
          // Move toward hurt guard to heal
          const toHeal = hurtGuards[0];
          guard.targetX = toHeal.x;
          guard.targetY = toHeal.y;
          guard.guardMode = 'heal';
        } else {
          // Position between crown and threats
          guard.targetX = crownX;
          guard.targetY = crownY;
          guard.guardMode = 'protect';
        }
      } 
      else {
        // DPS: Aggressive positioning, hunt threats
        guard.crownFollowRange = 150;
        
        // Look for enemies to attack
        const enemies = state.enemies.filter(e => {
          if(e._id === guard._id || e.team === team || e.hp <= 0) return false;
          return Math.hypot(e.x - crownX, e.y - crownY) < 300;
        });
        
        if(enemies.length > 0) {
          // Attack nearest enemy
          const target = enemies[0];
          guard.targetX = target.x;
          guard.targetY = target.y;
          guard.guardMode = 'attack';
        } else {
          // Maintain formation around crown
          const formationAngle = (guard.crownFormationIndex * 72 * Math.PI / 180) - (Math.PI / 2);
          const formationDist = 90;  // Formation radius
          guard.targetX = crownX + Math.cos(formationAngle) * formationDist;
          guard.targetY = crownY + Math.sin(formationAngle) * formationDist;
          guard.guardMode = 'protect';
        }
      }
      
      // CHASE BEHAVIOR: If crown is far from spawn site, chase it
      if(distToCrown > guard.crownChaseRange) {
        guard.guardMode = 'chase';
      }
      
      // Check if guard is too far from crown, return to it
      if(distToCrown > guard.crownFollowRange * 2) {
        guard.targetX = crownX;
        guard.targetY = crownY;
      }
    }
  }
}
```

### 4. Rendering with Blue Orb (render.js)

```javascript
for(const e of state.enemies){
  if(activeDungeon && e.dungeonId !== activeDungeon) continue;
  
  // Boss enemies have doubled orb size
  const orbRadius = e.boss ? ((e.r||18) * 2) : (e.r||18);
  const orbPadding = e.boss ? 4 : 2;
  
  // draw orb (custom color for crown guards, team-colored, or orange for bosses)
  let ec = null;
  if(e.crownGuard) {
    // Crown guards are BLUE regardless of team
    ec = e.color || '#3498db';
  } else if(e.boss) {
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
  
  // Border color (black for crown guards, black for bosses)
  if(e.crownGuard || e.boss){
    ctx.strokeStyle = e.borderColor || '#000000';
    ctx.lineWidth = e.borderWidth || (e.boss ? 6 : 3);
    ctx.beginPath(); ctx.arc(e.x, e.y, orbRadius + orbPadding, 0, Math.PI*2); ctx.stroke();
  }
  
  // For crown guards with fighter card images, draw image overlay
  if(e.crownGuard && e.imgPath){
    const img = loadCachedImage(state, e.imgPath);
    if(img){
      const iconSize = orbRadius * 1.8;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(e.x, e.y, orbRadius - 2, 0, Math.PI*2);
      ctx.clip();
      ctx.drawImage(img, e.x - iconSize/2, e.y - iconSize/2, iconSize, iconSize);
      ctx.restore();
    }
  }
  
  // ... rest of rendering
}
```

### 5. Console Debug Commands (game.js end)

```javascript
window.getCrownGuardStatus = function() {
  const state = window.state;
  if (!state?.emperor?.crownGuards) {
    console.log('❌ Crown guards not initialized');
    return;
  }
  
  const teams = ['teamA', 'teamB', 'teamC'];
  console.log('═══════════════════════════════════════');
  console.log('👑 CROWN GUARD STATUS');
  console.log('═══════════════════════════════════════');
  
  for (const team of teams) {
    const guardIds = state.emperor.crownGuards[team] || [];
    const crown = state.emperor.crowns?.[team];
    
    console.log(`\n🛡️ ${team.toUpperCase()} Team Guards:`);
    if (!crown) {
      console.log('  ❌ Crown not found');
      continue;
    }
    
    console.log(`  👑 Crown: (${crown.x.toFixed(0)}, ${crown.y.toFixed(0)})`);
    console.log(`  Guards: ${guardIds.length}/5`);
    
    for (const guardId of guardIds) {
      const guard = state.enemies.find(e => e._id === guardId);
      if (!guard) continue;
      
      const dist = Math.hypot(guard.x - crown.x, guard.y - crown.y);
      const loadout = guard.crownGuardLoadout;
      const priorityName = {1: 'TANK', 2: 'HEALER', 3: 'DPS'}[guard.guardPriority];
      const hp = `${guard.hp.toFixed(0)}/${guard.maxHp.toFixed(0)}`;
      
      console.log(
        `  ✓ [${priorityName}] ${loadout?.name} | HP: ${hp} | ` +
        `Dist to Crown: ${dist.toFixed(0)} | Mode: ${guard.guardMode}`
      );
    }
  }
};
```

---

## Property Mapping

### Guard Properties Explained

| Property | Type | Purpose |
|----------|------|---------|
| `crownGuard` | boolean | Marks as crown guard (used in rendering) |
| `crownTeam` | string | Which team's crown (teamA/B/C) |
| `crownId` | string | The crown entity ID to protect |
| `crownSiteId` | string | The base site ID where crown spawns |
| `loadoutType` | string | Which loadout type (tank/healer/dps1/dps2/dps3) |
| `loadoutId` | string | Unique loadout ID for abilities |
| `guardPriority` | number | 1=tank, 2=healer, 3=dps |
| `crownFormationIndex` | number | Position in pentagon (0-4) |
| `guardMode` | string | Current behavior (protect/chase/heal/attack) |
| `crownChaseRange` | number | Distance before chasing crown (500px) |
| `crownFollowRange` | number | Formation follow distance (80-150px) |
| `lastCrownX/Y` | number | Last known crown position |
| `crownGuardLoadout` | object | Full loadout data with stats |
| `homeSiteId` | null | MUST be null (not defending base) |
| `spawnTargetSiteId` | null | MUST be null (not targeting site) |

---

**Status**: ✅ Code Complete  
**Date**: 2026-01-25
