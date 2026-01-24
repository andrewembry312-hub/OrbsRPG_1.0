# Emperor Mode - Patch-Proof Design Spec

## Key Design Principles

1. **Single Source of Truth**: Crowns live ONLY in `state.creatures` as entity objects. No duplicate state metadata.
2. **DeltaTime Everything**: All timers use actual deltaTime (ms), not frame assumptions or Date.now().
3. **Generalized Emperor**: Any team can become emperor. Code doesn't assume player-only.
4. **Minimal AI Rewrite**: Use target scoring override, not global rule changes.
5. **Fit Existing Structure**: Uses only `state.sites` and `state.creatures` (no new arrays).

---

## State Structure

### Add to hardResetGameState() in game.js

```javascript
// Emperor Mode
state.emperor = {
  active: false,                    // Is emperor mode running?
  team: null,                        // 'player' | 'teamA' | 'teamB' | 'teamC' | null
  phase: null,                       // null | 'crowns' | 'bases' | 'boss'
  
  // Crown tracking (stores creature entity IDs only)
  crowns: {
    teamA: null,
    teamB: null,
    teamC: null
  },
  
  // What is being carried
  crownCarry: {
    teamA: false,
    teamB: false,
    teamC: false
  },
  
  // What is secured at emperor's home
  crownsSecured: {
    teamA: false,
    teamB: false,
    teamC: false
  },
  
  // Base destruction state
  basesDestroyed: {
    teamA: false,
    teamB: false,
    teamC: false
  },
  
  // Boss reference
  bossId: null,
  
  // Timers for crown guards (use deltaTime)
  crownGuardTimers: {
    teamA: { dead: false, respawnT: 0 },
    teamB: { dead: false, respawnT: 0 },
    teamC: { dead: false, respawnT: 0 }
  }
};

// Debug logging
state.gameLog = state.gameLog || [];
```

---

## Crown Entity Model

### Crown as Creature Type

Crowns are NOT special. They're creatures with a profile:

```javascript
// Crown entity (lives in state.creatures)
crown = {
  _id: 'crown_teamA_123',       // unique id
  type: 'crown',                 // entity type
  team: 'teamA',                 // which team this crown belongs to
  x, y,                          // position
  hp: 100,                       // yes, crown has health (can't damage/destroy)
  maxHp: 100,
  
  // Crown state flags
  locked: true,                  // can't pick up while locked
  carriedBy: null,               // null | 'player' | 'teamA' (if another team carries)
  secured: false,                // true = at emperor home, immobile
  
  // Rendering
  size: 40,
  iconColor: '#FFD700',          // locked: gray, unlocked: gold
  
  // Physics (no collision, no pathing)
  noCollide: true,
  
  // When locked, stays at base
  lockX: null,
  lockY: null
};
```

### Why This Works

- ✅ Only one copy of crown data
- ✅ Uses existing creature update loop
- ✅ Can reference by _id from state.emperor.crowns.teamA
- ✅ No "find the crown by digging through metadata" nonsense
- ✅ Reset just clears state.emperor.crowns, creatures cleanup is automatic

---

## Crown Guard Model

### Guards as Creature Type (Not Special)

Crown guards are NOT a separate system. They're creatures with a profile:

```javascript
// Crown guard (lives in state.creatures)
guard = {
  _id: 'guard_teamA_1_123',
  type: 'creature',
  team: 'teamA',
  
  // Profile marker
  aiTag: 'CROWN_GUARD',          // Use existing AI with this tag
  
  // Home base reference
  homeSiteId: 'team_a_base',     // Your actual site id
  homeX: null,                    // Filled on spawn
  homeY: null,
  
  // Behavior
  leash: 350,                     // How far before return to home
  aggressive: true,
  ignoreObjectives: true,
  
  // Combat
  hp: 150,
  maxHp: 150,
  contactDmg: 15,
  size: 2,
  speed: 3.5,
  
  // Respawn state
  respawnT: 0,                    // deltaTime countdown (ms)
  respawnHomeX: null,
  respawnHomeY: null,
  
  // Link to guard group
  guardGroupTeam: 'teamA'
};
```

### Why This Works

- ✅ Uses your existing creature AI loop
- ✅ Gets all combat behavior "for free"
- ✅ Any AI improvements automatically help guards
- ✅ Respawn logic is just "spawn with respawnT set"
- ✅ Reset: just mark `hp = 0` and let creature cleanup run

---

## Crown Guard Spawning & Respawn

### When Emperor Activated

```javascript
function spawnCrownGuards(state) {
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const base = state.sites.find(s => s.id === `team_${team.split('team')[1].toLowerCase()}_base`);
    if(!base) continue;
    
    // Spawn 5 guards per team
    for(let i = 0; i < 5; i++) {
      const guard = createCreature(state, {
        team: team,
        aiTag: 'CROWN_GUARD',
        homeSiteId: base.id,
        homeX: base.x,
        homeY: base.y,
        hp: 150,
        maxHp: 150,
        contactDmg: 15,
        size: 2,
        speed: 3.5,
        leash: 350,
        aggressive: true,
        // Spawn around base
        x: base.x + rand(-80, 80),
        y: base.y + rand(-80, 80)
      });
      
      // Tag for later reference
      state.emperor.crownGuardTimers[team].guardIds = state.emperor.crownGuardTimers[team].guardIds || [];
      state.emperor.crownGuardTimers[team].guardIds.push(guard._id);
    }
  }
}
```

### Update Crown Guards (In main updateGame loop)

```javascript
function updateCrownGuards(state, dt) {
  if(!state.emperor.active) return;
  
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const guardState = state.emperor.crownGuardTimers[team];
    
    // If dead, count down respawn timer
    if(guardState.dead) {
      guardState.respawnT -= dt;
      if(guardState.respawnT <= 0) {
        guardState.dead = false;
        spawnCrownGuards(state);  // Respawn this team's guards
      }
      continue;
    }
    
    // Guards are alive, but check if all dead
    const guardIds = guardState.guardIds || [];
    const aliveCount = guardIds.filter(id => {
      const g = state.creatures.find(c => c._id === id);
      return g && g.hp > 0;
    }).length;
    
    if(aliveCount === 0) {
      guardState.dead = true;
      guardState.respawnT = 5000;  // 5 second respawn timer (in ms)
    }
  }
}
```

### Existing Creature AI Hook (Modify updateEnemyAI)

In your existing `updateEnemyAI` function, add this check at start:

```javascript
function updateEnemyAI(enemy, state, dt) {
  // Crown guards target player/player-allies only
  if(state.emperor.active && enemy.aiTag === 'CROWN_GUARD') {
    // Heavy targeting bias
    const playerDist = distance(enemy, state.player);
    
    if(playerDist < 500) {  // Within range, chase
      enemy.targetX = state.player.x;
      enemy.targetY = state.player.y;
      return;  // Skip normal AI
    }
    
    // If player out of range, return home
    enemy.targetX = enemy.homeX;
    enemy.targetY = enemy.homeY;
    return;
  }
  
  // ... rest of normal AI ...
}
```

---

## Crown System

### Spawn Crowns at Game Start

```javascript
function spawnCrowns(state) {
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const base = state.sites.find(s => s.id === `team_${team.split('team')[1].toLowerCase()}_base`);
    if(!base) continue;
    
    const crown = createCreature(state, {
      type: 'crown',
      team: team,
      
      locked: true,
      carriedBy: null,
      secured: false,
      
      // Position at base (locked)
      x: base.x + 20,
      y: base.y,
      
      hp: 100,
      maxHp: 100,
      size: 40,
      noCollide: true,
      
      // Visual state
      iconColor: '#888888'  // gray when locked
    });
    
    state.emperor.crowns[team] = crown._id;
  }
}
```

### Unlock Crowns When Emperor Activated

```javascript
function unlockCrowns(state) {
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const crownId = state.emperor.crowns[team];
    const crown = crownId ? state.creatures.find(c => c._id === crownId) : null;
    
    if(crown && !crown.secured) {
      crown.locked = false;
      crown.iconColor = '#FFD700';  // gold when unlocked
    }
  }
}
```

### Crown Pickup (In game update loop)

```javascript
function updateCrownPickup(state, dt) {
  if(!state.emperor.active) return;
  
  const playerTeam = state.emperor.team;
  const playerHome = state.sites.find(s => s.owner === playerTeam && s.type === 'home');
  
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const crownId = state.emperor.crowns[team];
    const crown = crownId ? state.creatures.find(c => c._id === crownId) : null;
    
    if(!crown) continue;
    if(crown.locked || crown.carriedBy || crown.secured) continue;
    
    // Check if player can pick up
    const dist = distance(state.player, crown);
    if(dist < 50) {
      crown.carriedBy = playerTeam;
      state.emperor.crownCarry[team] = true;
      
      console.log(`[CROWN] ${playerTeam} picked up ${team} crown`);
    }
  }
}
```

### Crown Following (In game update loop)

```javascript
function updateCarriedCrowns(state, dt) {
  if(!state.emperor.active) return;
  
  const playerTeam = state.emperor.team;
  let offset = 0;
  
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const crownId = state.emperor.crowns[team];
    const crown = crownId ? state.creatures.find(c => c._id === crownId) : null;
    
    if(!crown || crown.carriedBy !== playerTeam) continue;
    
    // Follow player with offset
    crown.x = state.player.x + 30 + (offset * 35);
    crown.y = state.player.y - 35;
    offset++;
  }
}
```

### Crown Securing (In game update loop)

```javascript
function updateCrownSecuring(state, dt) {
  if(!state.emperor.active) return;
  
  const playerTeam = state.emperor.team;
  const playerHome = state.sites.find(s => s.owner === playerTeam && s.type === 'home');
  if(!playerHome) return;
  
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const crownId = state.emperor.crowns[team];
    const crown = crownId ? state.creatures.find(c => c._id === crownId) : null;
    
    if(!crown || crown.carriedBy !== playerTeam) continue;
    if(crown.secured) continue;
    
    const dist = distance(playerHome, crown);
    if(dist < 80) {
      // Secure the crown
      crown.secured = true;
      crown.carriedBy = null;
      state.emperor.crownCarry[team] = false;
      state.emperor.crownsSecured[team] = true;
      
      // Position at home (don't move)
      crown.x = playerHome.x - 20 - (countSecuredCrowns(state) * 45);
      crown.y = playerHome.y;
      crown.locked = true;  // Can't be picked up once secured
      
      console.log(`[CROWN] ${team} crown secured! (${countSecuredCrowns(state)}/3)`);
      
      // Check if bases should unlock
      unlockBasesForDestructibility(state);
    }
  }
}

function countSecuredCrowns(state) {
  return Object.values(state.emperor.crownsSecured).filter(v => v).length;
}
```

### Crown Drop on Emperor Death

```javascript
function handleEmperorDeath(state) {
  if(!state.emperor.active) return;
  
  const playerTeam = state.emperor.team;
  
  // Drop all crowns carried
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const crownId = state.emperor.crowns[team];
    const crown = crownId ? state.creatures.find(c => c._id === crownId) : null;
    
    if(!crown) continue;
    if(crown.carriedBy === playerTeam && !crown.secured) {
      // Return to team base
      const teamBase = state.sites.find(s => s.owner === team && s.type === 'home');
      if(teamBase) {
        crown.x = teamBase.x + 20;
        crown.y = teamBase.y;
        crown.carriedBy = null;
        state.emperor.crownCarry[team] = false;
      }
    }
  }
}
```

---

## Base Destruction System

### Base Initialization

In your existing base setup code, add:

```javascript
function initializeBaseDestruction(state) {
  for(let site of state.sites) {
    if(site.type === 'home') {
      site.destructible = false;  // Becomes true as crowns secure
      site.destructionHp = 100;
      site.maxDestructionHp = 100;
    }
  }
}
```

### Unlock Base Destruction

```javascript
function unlockBasesForDestructibility(state) {
  const securedCount = countSecuredCrowns(state);
  const teamOrder = ['teamA', 'teamB', 'teamC'];
  
  // First crown secured → teamA destructible
  // Second crown secured → teamB destructible
  // Third crown secured → teamC destructible
  for(let i = 0; i < securedCount; i++) {
    const team = teamOrder[i];
    const base = state.sites.find(s => s.owner === team && s.type === 'home');
    if(base && !state.emperor.basesDestroyed[team]) {
      base.destructible = true;
      console.log(`[BASE] ${team} base is now destructible`);
    }
  }
}
```

### Damage Base (When Player Attacks)

In your player attack resolution code, add check:

```javascript
function applyPlayerAttackDamage(state, damage, targetPos) {
  const playerTeam = state.emperor.team;
  
  // Check if attacking a destructible base
  for(let site of state.sites) {
    if(!site.destructible || state.emperor.basesDestroyed[site.owner]) continue;
    
    const dist = distance(state.player, site);
    if(dist < 120) {  // Attack range
      // Damage the base (use DPS rate)
      const baseDamagePerSecond = 20;
      site.destructionHp -= baseDamagePerSecond * (state.dt / 1000);
      
      if(site.destructionHp <= 0) {
        // Base destroyed
        state.emperor.basesDestroyed[site.owner] = true;
        site.destructible = false;
        
        console.log(`[BASE] ${site.owner} base DESTROYED!`);
        
        // Check if all bases destroyed
        if(checkAllBasesDestroyed(state)) {
          spawnEmperorBoss(state);
        }
      }
    }
  }
}
```

### Reset Bases on Dethronement

```javascript
function resetBaseDestruction(state) {
  for(let site of state.sites) {
    if(site.type === 'home') {
      site.destructible = false;
      site.destructionHp = 100;
      site.maxDestructionHp = 100;
    }
  }
  
  state.emperor.basesDestroyed = { teamA: false, teamB: false, teamC: false };
}
```

---

## Emperor Boss System

### Boss Spawning

```javascript
function spawnEmperorBoss(state) {
  const playerTeam = state.emperor.team;
  const playerHome = state.sites.find(s => s.owner === playerTeam && s.type === 'home');
  
  const spawnDist = 250;
  const angle = Math.random() * Math.PI * 2;
  
  const boss = createCreature(state, {
    type: 'creature',
    team: 'boss',
    aiTag: 'EMPEROR_BOSS',
    boss: true,
    
    // Size and stats
    size: 2,
    hp: 520 * state.zoneLevel * 10,  // x10 HP
    maxHp: 520 * state.zoneLevel * 10,
    contactDmg: calculateBossDamage(state),
    speed: 2.5,
    attackRange: 50,
    
    // Spawn at distance from player home
    x: playerHome.x + Math.cos(angle) * spawnDist,
    y: playerHome.y + Math.sin(angle) * spawnDist,
    
    // Boss abilities (pick attack-only)
    bossAbilities: generateEmperorBossAbilities(state),
    abilityIndex: 0,
    abilityCooldown: 0,
    
    // Wave spawning
    spawnWaves: {
      nextWaveT: 3000,    // deltaTime-based (ms)
      maxActive: 30,
      spawnDelayT: 3000,
      waveSize: 5
    }
  });
  
  state.emperor.bossId = boss._id;
  state.emperor.phase = 'boss';
  
  // Spawn initial guard waves
  spawnEmperorBossGuards(boss, state);
  
  console.log('[BOSS] Emperor Boss spawned!');
}
```

### Boss Wave Updates (In main update loop)

```javascript
function updateEmperorBossWaves(state, dt) {
  if(!state.emperor.bossId) return;
  
  const boss = state.creatures.find(c => c._id === state.emperor.bossId);
  if(!boss) return;
  
  // Countdown to next wave
  boss.spawnWaves.nextWaveT -= dt;
  
  if(boss.spawnWaves.nextWaveT <= 0) {
    // Count active creatures
    const active = state.creatures.filter(c => c.team === 'boss' && c.hp > 0).length;
    
    if(active < boss.spawnWaves.maxActive) {
      spawnEmperorBossWave(boss, state);
      boss.spawnWaves.nextWaveT = boss.spawnWaves.spawnDelayT;
    }
  }
}

function spawnEmperorBossWave(boss, state) {
  // Pick random spawn point around boss
  const angle = Math.random() * Math.PI * 2;
  const dist = 150;
  const spawnX = boss.x + Math.cos(angle) * dist;
  const spawnY = boss.y + Math.sin(angle) * dist;
  
  // Spawn 5 creatures
  for(let i = 0; i < boss.spawnWaves.waveSize; i++) {
    const creature = createCreature(state, {
      team: 'boss',
      aiTag: 'BOSS_CREATURE',
      x: spawnX + rand(-30, 30),
      y: spawnY + rand(-30, 30),
      hp: 50,
      maxHp: 50,
      contactDmg: 8,
      size: 0.8,
      speed: 2.5
    });
  }
}
```

### Boss Abilities (In existing ability logic)

Modify where boss uses abilities:

```javascript
function updateBossAbilities(boss, state, dt) {
  if(boss.aiTag !== 'EMPEROR_BOSS') return;
  
  // Cooldown management (deltaTime-based)
  boss.abilityCooldown -= dt;
  
  if(boss.abilityCooldown <= 0 && boss.bossAbilities.length > 0) {
    const ability = boss.bossAbilities[boss.abilityIndex % boss.bossAbilities.length];
    
    // Use ability at player
    const target = state.emperor.team === 'player' ? state.player : 
                   state.sites.find(s => s.owner === state.emperor.team);
    
    if(target) {
      useAbilityAt(boss, ability, target, state);
      boss.abilityIndex++;
      boss.abilityCooldown = ability.cooldown * 1000;  // ms
    }
  }
}
```

### Boss Death

```javascript
function checkEmperorBossDeath(state) {
  if(!state.emperor.bossId) return;
  
  const boss = state.creatures.find(c => c._id === state.emperor.bossId);
  if(!boss || boss.hp > 0) return;
  
  // Boss defeated!
  state.emperor.bossId = null;
  
  console.log('[BOSS] Emperor Boss defeated - VICTORY!');
  
  // Show victory screen
  triggerCampaignVictory(state);
}
```

---

## Emperor Activation & Deactivation

### Activation Trigger (When Player Gets All Flags)

```javascript
function checkEmperorActivation(state) {
  if(state.emperor.active) return;  // Already active
  
  const playerFlagCount = state.sites.filter(s => s.owner === 'player' && s.type === 'flag').length;
  const totalFlagCount = state.sites.filter(s => s.type === 'flag').length;
  
  if(playerFlagCount === totalFlagCount && totalFlagCount > 0) {
    activateEmperorMode(state, 'player');
  }
}

function activateEmperorMode(state, team) {
  if(state.emperor.active) return;
  
  state.emperor.active = true;
  state.emperor.team = team;
  state.emperor.phase = 'crowns';
  
  // Apply buff
  applyEmperorBuff(state);
  
  // Initialize crowns and guards
  spawnCrowns(state);
  unlockCrowns(state);
  spawnCrownGuards(state);
  
  console.log(`[EMPEROR] ${team} has become Emperor!`);
}
```

### Deactivation Trigger (When Emperor Reaches 0 Flags)

```javascript
function checkEmperorDeactivation(state) {
  if(!state.emperor.active || !state.emperor.team) return;
  
  const team = state.emperor.team;
  const teamFlagCount = state.sites.filter(s => s.owner === team && s.type === 'flag').length;
  
  // Only lose when at 0 flags
  if(teamFlagCount === 0) {
    deactivateEmperorMode(state);
  }
}

function deactivateEmperorMode(state) {
  if(!state.emperor.active) return;
  
  console.log('[EMPEROR] Emperor status lost!');
  
  // Remove buff
  removeEmperorBuff(state);
  
  // Reset crowns
  const playerTeam = state.emperor.team;
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const crownId = state.emperor.crowns[team];
    const crown = crownId ? state.creatures.find(c => c._id === crownId) : null;
    
    if(crown) {
      // Return to base and lock
      const base = state.sites.find(s => s.owner === team && s.type === 'home');
      if(base) {
        crown.x = base.x + 20;
        crown.y = base.y;
        crown.locked = true;
        crown.carriedBy = null;
        crown.secured = false;
      }
    }
  }
  
  // Kill crown guards
  for(let team of ['teamA', 'teamB', 'teamC']) {
    const guardState = state.emperor.crownGuardTimers[team];
    const guardIds = guardState.guardIds || [];
    
    for(let gId of guardIds) {
      const guard = state.creatures.find(c => c._id === gId);
      if(guard) guard.hp = 0;
    }
    
    guardState.guardIds = [];
    guardState.dead = false;
    guardState.respawnT = 0;
  }
  
  // Kill boss if exists
  if(state.emperor.bossId) {
    const boss = state.creatures.find(c => c._id === state.emperor.bossId);
    if(boss) {
      // Kill all boss creatures
      for(let c of state.creatures.filter(c => c.team === 'boss')) {
        c.hp = 0;
      }
      state.emperor.bossId = null;
    }
  }
  
  // Reset base destruction
  resetBaseDestruction(state);
  
  // Clear all emperor state
  state.emperor.active = false;
  state.emperor.team = null;
  state.emperor.phase = null;
  state.emperor.crownCarry = { teamA: false, teamB: false, teamC: false };
  state.emperor.crownsSecured = { teamA: false, teamB: false, teamC: false };
}
```

---

## Emperor AI (Target Scoring Approach)

### In your existing AI targetSelection code:

DON'T rewrite `shouldAttackTeam`. Instead, modify target scoring:

```javascript
function scoreAttackTarget(attacker, target, state) {
  if(!state.emperor.active) {
    // Normal mode: use existing scoring
    return normalTargetScore(attacker, target, state);
  }
  
  // Emperor mode: overwhelm target selection toward emperor team
  let score = 0;
  
  const emperorTeam = state.emperor.team;
  
  if(target.team === emperorTeam || target === state.player) {
    score += 1000;  // Emperor is only real target
  } else if(isPlayerAlly(target, state)) {
    score += 400;   // Allies are secondary
  } else if(target.team === attacker.team) {
    score -= 500;   // Strongly avoid own team
  } else {
    score -= 200;   // Other teams unimportant
  }
  
  // Add normal factors (distance, etc)
  score -= distance(attacker, target) / 5;
  
  return score;
}
```

This keeps your existing team rules intact but just biases targeting.

---

## Game Loop Integration

In your main `updateGame(state, dt)` function:

```javascript
function updateGame(state, dt) {
  // ... existing updates ...
  
  // Emperor system (only when active)
  if(state.emperor && state.emperor.active) {
    checkCrownPickup(state, dt);
    updateCarriedCrowns(state, dt);
    updateCrownSecuring(state, dt);
    updateCrownGuards(state, dt);
    updateBaseDestruction(state, dt);
    updateEmperorBossWaves(state, dt);
  }
  
  // Check emperor status every frame
  checkEmperorActivation(state);
  checkEmperorDeactivation(state);
  checkEmperorBossDeath(state);
  
  // ... rest of update ...
}
```

---

## Reset & Cleanup

In your hardResetGameState:

```javascript
// At the end of hardResetGameState, add:

// Reset Emperor Mode
state.emperor = {
  active: false,
  team: null,
  phase: null,
  crowns: { teamA: null, teamB: null, teamC: null },
  crownCarry: { teamA: false, teamB: false, teamC: false },
  crownsSecured: { teamA: false, teamB: false, teamC: false },
  basesDestroyed: { teamA: false, teamB: false, teamC: false },
  bossId: null,
  crownGuardTimers: {
    teamA: { dead: false, respawnT: 0, guardIds: [] },
    teamB: { dead: false, respawnT: 0, guardIds: [] },
    teamC: { dead: false, respawnT: 0, guardIds: [] }
  }
};

// Clean up emperor creatures on reset
state.creatures = state.creatures.filter(c => 
  c.type !== 'crown' && 
  c.aiTag !== 'CROWN_GUARD' && 
  c.aiTag !== 'EMPEROR_BOSS' &&
  c.team !== 'boss'
);
```

---

## Key Decisions (Locked In)

✅ **Single Source of Truth**: Crowns stored only in state.creatures, referenced by _id in state.emperor.crowns

✅ **DeltaTime Throughout**: All timers use dt (milliseconds), no frame assumptions

✅ **Generalized Emperor**: Any team can be emperor, code doesn't assume player-only

✅ **Minimal AI Rewrite**: Use target scoring bias, NOT global shouldAttackTeam rewrite

✅ **Existing Structure**: Uses only state.sites and state.creatures, no new arrays

✅ **Crown Guards as Creatures**: Use aiTag='CROWN_GUARD' to identify, leverage existing AI

✅ **Respawn Logic**: Managed by respawnT timer, respawns entire group when all dead

✅ **Base Damage**: Uses DPS rate (20 hp/sec) multiplied by dt, not per-frame

✅ **Crowns Spawn at Start**: Always visible (locked) from game start

✅ **Dethronement Wipes All**: One function handles complete reset

---

## Testing Path (Use This Order)

1. ✅ Create state.emperor structure
2. ✅ Test emperor activation (player gets all flags)
3. ✅ Test crown spawning and unlocking
4. ✅ Test crown pickup/carry
5. ✅ Test crown securing at home
6. ✅ Test crown guards spawning
7. ✅ Test crown guard respawn
8. ✅ Test base destructibility unlock
9. ✅ Test base destruction
10. ✅ Test Emperor boss spawning
11. ✅ Test boss wave spawning (30 creature cap)
12. ✅ Test emperor deactivation (lose all flags)
13. ✅ Test all systems reset on dethronement
14. ✅ Test non-emperor gameplay unaffected

---

## Notes for Implementation

- Every timer should subtract dt, not use Date.now() or frame counts
- Use `state.dt` if available, otherwise calculate `dt = currentTime - lastFrameTime`
- When spawning creatures, use createCreature() to ensure _id assignment
- All console.log calls prefixed with [EMPEROR], [CROWN], [BOSS], [BASE] for easy log filtering
- Boss abilities should come from your existing ability pool, filtered to attack-only
- Guard respawn is group-based (all 5 respawn together), not individual

