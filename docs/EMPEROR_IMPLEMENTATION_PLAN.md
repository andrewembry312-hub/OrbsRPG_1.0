# Emperor Mode - Implementation Plan & Code Changes Reference

## Summary
This document details EXACT code changes needed to implement Emperor Mode. It identifies:
- What code already exists (no changes needed)
- What code needs fixing (small changes)
- What new code needs creating (new systems)
- Integration points (where to connect systems)

---

## Phase 1: Critical Bug Fix (HIGHEST PRIORITY)

### Issue: Emperor Loses on ANY Flag Capture
**Current Behavior**: Emperor is lost when player loses ANY flag (has 3-4 flags left)
**Required Behavior**: Emperor should only be lost when player reaches 0 flags (loses ALL)
**Severity**: CRITICAL - Game is unplayable without this fix

### Code Location
**File**: `src/game/game.js`
**Functions**: `checkEmperorStatus()` (line 12162) and `checkEmperorVictory()` (line 12206)

### Current Code (Lines 12162-12230)
```javascript
function checkEmperorStatus(state) {
  if (!state.sites) return;
  
  let playerFlags = 0;
  let totalFlags = 0;
  
  for (let key in state.sites) {
    let site = state.sites[key];
    if (site.type === 'flag') {
      totalFlags++;
      if (site.owner === 'player') {
        playerFlags++;
      }
    }
  }
  
  // Check if player should become Emperor
  if(playerFlags === totalFlags && totalFlags > 0) {
    if(!state.emperorTeam) {
      state.emperorTeam = 'player';
      addEmperorEffect(state);
      spawnZoneBoss(state);
      
      showGameToast('EMPEROR MODE ACTIVATED!', 'emperor');
      state.gameLog.push(`${getCurrentGameTime()}: Emperor mode activated!`);
    }
  }
}

function checkEmperorVictory(state) {
  if(state.emperorTeam === 'player') {
    // BUG IS HERE - This removes Emperor on ANY flag loss
    let playerFlagCount = 0;
    for(let site of Object.values(state.sites)) {
      if(site.type === 'flag' && site.owner === 'player') {
        playerFlagCount++;
      }
    }
    
    // WRONG: This triggers when player has 3+ flags (totalFlags-1)
    if(playerFlagCount < totalFlags) {  // BUG LINE
      state.emperorTeam = null;
      removeEmperorEffect(state);
      // ... additional logic
    }
  }
}
```

### Proposed Fix
```javascript
function checkEmperorVictory(state) {
  if(state.emperorTeam === 'player') {
    let playerFlagCount = 0;
    let totalFlags = 0;
    
    for(let site of Object.values(state.sites)) {
      if(site.type === 'flag') {
        totalFlags++;
        if(site.owner === 'player') {
          playerFlagCount++;
        }
      }
    }
    
    // FIX: Only lose Emperor at 0 flags
    if(playerFlagCount === 0) {
      state.emperorTeam = null;
      removeEmperorEffect(state);
      state.gameLog.push(`${getCurrentGameTime()}: Emperor status lost!`);
      showGameToast('Emperor status lost...', 'warning');
      
      // When Emperor lost, dethrone all systems
      handleDethronement(state);
    }
  }
}
```

### New Function Required
```javascript
function handleDethronement(state) {
  // This function will be expanded in Phase 5 to handle:
  // - Crown return to bases
  // - Base destruction reset
  // - Crown Guard despawn
  // - Emperor Boss despawn
  // - AI mode reset to normal
  // - All buffs removal
  
  // For now, just the basics:
  if(state.emperorTeam) {
    state.emperorTeam = null;
  }
}
```

**Estimated Risk**: LOW
**Dependencies**: None (standalone fix)
**Testing Required**: 
- Start Emperor mode
- Lose 1 flag → should still be Emperor
- Lose 2 flags → should still be Emperor
- Lose 3 flags → should still be Emperor
- Lose all 4 flags → SHOULD LOSE Emperor ✓

---

## Phase 2: State & Infrastructure Setup

### 2.1 Add Emperor Mode State Variables

**File**: `src/game/state.js` (where state is initialized)

**Add to state object**:
```javascript
// Emperor Mode System
gameMode: 'normal',          // 'normal' or 'emperor'
emperorPhase: null,          // null, 'crowns', 'bases', 'boss'
crowns: {},                  // crowns system
crownGuards: [],             // crown guard groups
empBoss: null,               // emperor boss entity
basesDestroyed: {
  teamA: false,
  teamB: false,
  teamC: false
}
```

### 2.2 Initialize Emperor State

**File**: `src/game/game.js` (in initializeGameState or similar)

```javascript
// Initialize Emperor system
function initializeEmperorSystem(state) {
  state.gameMode = 'normal';
  state.emperorPhase = null;
  state.crowns = {
    teamA: { locked: true, carriedBy: null, atPlayerBase: false },
    teamB: { locked: true, carriedBy: null, atPlayerBase: false },
    teamC: { locked: true, carriedBy: null, atPlayerBase: false }
  };
  state.crownGuards = [];
  state.empBoss = null;
  state.basesDestroyed = { teamA: false, teamB: false, teamC: false };
}
```

**Estimated Risk**: LOW
**Dependencies**: None (data structure setup only)

---

## Phase 3: Crown System Implementation

### 3.1 Crown Entity Structure & Spawning

**File**: `src/game/game.js` (new functions)

```javascript
// Initialize crowns at game start
function spawnCrowns(state) {
  // Get home base positions for each team
  const teamBases = {
    teamA: findSiteByKey(state, 'teamA_base'),
    teamB: findSiteByKey(state, 'teamB_base'),
    teamC: findSiteByKey(state, 'teamC_base')
  };
  
  for(let team of ['teamA', 'teamB', 'teamC']) {
    let base = teamBases[team];
    if(base) {
      let crown = {
        id: `crown_${team}`,
        type: 'crown',
        team: team,
        x: base.x + 20,
        y: base.y,
        locked: true,
        carriedBy: null,
        atPlayerBase: false,
        visible: true,
        size: 40,
        icon: 'crown'
      };
      
      state.entities.push(crown);
      state.crowns[team] = crown;
    }
  }
}

// Unlock crowns when Emperor achieved
function unlockCrowns(state) {
  for(let crown of Object.values(state.crowns)) {
    if(crown && !crown.atPlayerBase) {
      crown.locked = false;
    }
  }
}

// Check if crown can be picked up
function checkCrownPickup(state) {
  if(state.playerFlags === 0) return; // Can't carry crown with no flags
  
  let player = state.player;
  for(let crown of Object.values(state.crowns)) {
    if(crown && !crown.locked && !crown.carriedBy && !crown.atPlayerBase) {
      let distance = Math.hypot(player.x - crown.x, player.y - crown.y);
      if(distance < 40) {
        // Pick up crown
        crown.carriedBy = 'player';
        showGameToast(`Crown of ${crown.team} acquired!`, 'success');
      }
    }
  }
}

// Move crown with player
function updateCarriedCrowns(state) {
  if(!state.playerFlags) return; // Can't carry without flags
  
  let player = state.player;
  let crownOffset = 0;
  
  for(let crown of Object.values(state.crowns)) {
    if(crown && crown.carriedBy === 'player') {
      crown.x = player.x + 30 + (crownOffset * 30);
      crown.y = player.y - 30;
      crownOffset++;
    }
  }
}

// Drop crown on player death
function dropCrownsOnDeath(state) {
  for(let crown of Object.values(state.crowns)) {
    if(crown && crown.carriedBy === 'player' && !crown.atPlayerBase) {
      // Return to team base
      let teamBase = findSiteByKey(state, `${crown.team}_base`);
      crown.x = teamBase.x + 20;
      crown.y = teamBase.y;
      crown.carriedBy = null;
    }
  }
}

// Check if crown is at player base
function checkCrownSecuring(state) {
  let playerBase = findSiteByKey(state, 'player_base');
  if(!playerBase) return;
  
  for(let crown of Object.values(state.crowns)) {
    if(crown && crown.carriedBy === 'player') {
      let distance = Math.hypot(playerBase.x - crown.x, playerBase.y - crown.y);
      if(distance < 60) {
        // Secure crown
        crown.carriedBy = null;
        crown.atPlayerBase = true;
        crown.x = playerBase.x - 20 - (countSecuredCrowns(state) * 40);
        crown.y = playerBase.y;
        
        showGameToast(`Crown ${Object.keys(state.crowns).indexOf(Object.entries(state.crowns).find(e => e[1] === crown)[0]) + 1}/3 secured!`, 'success');
        
        // Check if base destruction should unlock
        checkBaseDestructionUnlock(state);
      }
    }
  }
}

function countSecuredCrowns(state) {
  return Object.values(state.crowns).filter(c => c && c.atPlayerBase).length;
}
```

### 3.2 Crown Rendering

**File**: `src/game/render.js` (in render entities section)

```javascript
// In renderEntities or similar:
for(let entity of state.entities) {
  if(entity.type === 'crown') {
    renderCrown(entity, ctx);
  }
}

function renderCrown(crown, ctx) {
  // Yellow background
  ctx.fillStyle = crown.locked ? '#888888' : '#FFD700';
  ctx.beginPath();
  ctx.arc(crown.x, crown.y, crown.size, 0, Math.PI * 2);
  ctx.fill();
  
  // Crown symbol
  ctx.fillStyle = crown.locked ? '#444444' : '#FF8C00';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♛', crown.x, crown.y);
  
  // Lock indicator
  if(crown.locked) {
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(crown.x, crown.y, crown.size + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
}
```

### 3.3 Call Crown Functions in Game Loop

**File**: `src/game/game.js` (in updateGame or updateEntities)

```javascript
function updateGame(state, deltaTime) {
  // ... existing code ...
  
  if(state.gameMode === 'emperor') {
    checkCrownPickup(state);
    updateCarriedCrowns(state);
    checkCrownSecuring(state);
  }
  
  // ... rest of game update ...
}

function handlePlayerDeath(state) {
  // ... existing death handling ...
  
  // Drop crowns on death
  dropCrownsOnDeath(state);
  
  // ... rest of death handling ...
}
```

**Estimated Risk**: LOW (isolated system)
**Dependencies**: Requires Phase 1 fix + Phase 2 state setup
**Testing Required**:
- Crowns spawn at bases (locked)
- Crowns unlock on Emperor achievement
- Player can pick up unlocked crown
- Crown follows player
- Crown returns on player death
- Crown secures at player base

---

## Phase 4: Crown Guard System

### 4.1 Crown Guard Entity & Spawning

**File**: `src/game/game.js` (new functions)

```javascript
// Spawn crown guards when Emperor achieved
function spawnCrownGuards(state) {
  state.crownGuards = [];
  
  for(let team of ['teamA', 'teamB', 'teamC']) {
    let base = findSiteByKey(state, `${team}_base`);
    if(base) {
      let guardGroup = {
        id: `crownGuard_${team}`,
        type: 'crownGuard',
        team: team,
        homeBase: { x: base.x, y: base.y },
        guardingCrown: `crown_${team}`,
        creatures: [],  // Will contain 5 creatures
        respawnTimer: 0,
        dead: false,
        spawnGuardCreatures: function(state) {
          // Create 5 blue orb creatures
          for(let i = 0; i < 5; i++) {
            let guard = {
              id: `${this.id}_guard_${i}`,
              type: 'creature',
              isGuard: true,
              team: team,
              x: this.homeBase.x + Math.random() * 100 - 50,
              y: this.homeBase.y + Math.random() * 100 - 50,
              hp: 150,
              maxHp: 150,
              contactDmg: 15,
              size: 2,  // 2x size like world boss
              icon: 'fighter_card_blue',  // Use fighter card images
              speed: 3.5,
              attackRange: 40,
              lastAttackTime: 0,
              guardGroup: this.id
            };
            
            this.creatures.push(guard.id);
            state.creatures.push(guard);
          }
        }
      };
      
      state.crownGuards.push(guardGroup);
      guardGroup.spawnGuardCreatures(state);
    }
  }
}

// Guard behavior
function updateCrownGuards(state) {
  for(let guardGroup of state.crownGuards) {
    // Check respawn timer
    if(guardGroup.dead) {
      guardGroup.respawnTimer -= 1000 / 60;  // deltaTime equivalent
      if(guardGroup.respawnTimer <= 0) {
        guardGroup.dead = false;
        guardGroup.spawnGuardCreatures(state);
      }
      continue;
    }
    
    // Guards target player aggressively
    let player = state.player;
    for(let creatureId of guardGroup.creatures) {
      let guard = state.creatures.find(c => c.id === creatureId);
      if(guard && guard.hp > 0) {
        // Chase player
        let dx = player.x - guard.x;
        let dy = player.y - guard.y;
        let distance = Math.hypot(dx, dy);
        
        guard.targetX = player.x;
        guard.targetY = player.y;
        
        // Attack if in range
        if(distance < guard.attackRange && 
           Date.now() - guard.lastAttackTime > 1000) {
          damagePlayer(state, guard.contactDmg);
          guard.lastAttackTime = Date.now();
        }
      }
    }
  }
}

// Destroy guards on Emperor loss
function destroyAllCrownGuards(state) {
  for(let guardGroup of state.crownGuards) {
    for(let creatureId of guardGroup.creatures) {
      let guard = state.creatures.find(c => c.id === creatureId);
      if(guard) {
        guard.hp = 0;
      }
    }
    guardGroup.creatures = [];
    guardGroup.dead = true;
  }
}
```

### 4.2 Crown Guard AI Integration

**File**: `src/game/game.js` (modify existing updateCreatures)

```javascript
// In updateCreatures or creature AI section:
function updateCreatureAI(creature, state) {
  if(creature.isGuard) {
    // Guards target player + allies
    // Already handled in updateCrownGuards above
    return;
  }
  
  // ... existing creature AI ...
}
```

**Estimated Risk**: MEDIUM (affects creature AI)
**Dependencies**: Phase 2-3 complete
**Testing Required**:
- Guards spawn at bases on Emperor achievement
- Guards chase player aggressively
- Guards attack player
- Guards respawn after 5 seconds when killed
- Guards disappear on Emperor loss

---

## Phase 5: Base Destruction System

### 5.1 Base Destructibility

**File**: `src/game/game.js` (add to site initialization)

```javascript
// Initialize base destruction tracking
function initializeBaseDestruction(state) {
  for(let key in state.sites) {
    let site = state.sites[key];
    if(site.type === 'base') {
      site.destroyed = false;
      site.destructible = false;  // Becomes true as crowns are secured
      site.destructionHP = 100;
      site.maxDestructionHP = 100;
    }
  }
}

// Unlock base destruction when crown secured
function checkBaseDestructionUnlock(state) {
  let securedCount = countSecuredCrowns(state);
  let baseTeams = ['teamA', 'teamB', 'teamC'];
  
  for(let i = 0; i < securedCount; i++) {
    let teamBase = state.sites[`${baseTeams[i]}_base`];
    if(teamBase) {
      teamBase.destructible = true;
    }
  }
}

// Damage base when player attacks it
function updateBaseDestruction(state) {
  let playerAttackRange = state.player.attackRange + 50;  // Extended range
  
  for(let key in state.sites) {
    let site = state.sites[key];
    if(site.type === 'base' && site.destructible && !site.destroyed) {
      let distance = Math.hypot(state.player.x - site.x, state.player.y - site.y);
      
      // Check if player is attacking this base
      if(distance < playerAttackRange && state.playerIsAttacking) {
        site.destructionHP -= 5;  // Damage per frame
        
        if(site.destructionHP <= 0) {
          site.destroyed = true;
          let teamName = key.replace('_base', '');
          state.basesDestroyed[teamName] = true;
          
          showGameToast(`${teamName} base destroyed!`, 'success');
          state.gameLog.push(`${getCurrentGameTime()}: ${teamName} base destroyed!`);
          
          // Check if all bases destroyed
          checkAllBasesDestroyed(state);
        }
      }
    }
  }
}

// Check if all bases destroyed
function checkAllBasesDestroyed(state) {
  let allDestroyed = state.basesDestroyed.teamA && 
                     state.basesDestroyed.teamB && 
                     state.basesDestroyed.teamC;
  
  if(allDestroyed) {
    state.emperorPhase = 'boss';
    spawnEmperorBoss(state);
  }
}

// Reset bases on Emperor loss
function resetBaseDestruction(state) {
  for(let key in state.sites) {
    let site = state.sites[key];
    if(site.type === 'base') {
      site.destroyed = false;
      site.destructible = false;
      site.destructionHP = 100;
      site.maxDestructionHP = 100;
    }
  }
  state.basesDestroyed = { teamA: false, teamB: false, teamC: false };
}
```

### 5.2 Base Rendering

**File**: `src/game/render.js` (modify base rendering)

```javascript
// Modify base rendering to show destruction state:
function renderBase(site, ctx) {
  // ... existing base rendering ...
  
  if(site.destructible && !site.destroyed) {
    // Show destructibility indicator
    ctx.fillStyle = '#FF6666';
    ctx.fillRect(site.x - site.size - 10, site.y - site.size - 30, 
                 (site.destructionHP / site.maxDestructionHP) * (site.size * 2 + 20), 10);
  } else if(site.destroyed) {
    // Show destroyed state
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#333333';
    ctx.fillRect(site.x - site.size, site.y - site.size, site.size * 2, site.size * 2);
    ctx.globalAlpha = 1;
  }
}
```

**Estimated Risk**: LOW-MEDIUM (affects base rendering/interaction)
**Dependencies**: Phase 1-4 complete
**Testing Required**:
- Bases initially not destructible
- First crown secured → teamA base becomes destructible
- Player can damage destructible base
- Base is destroyed when HP reaches 0
- Team cannot respawn from destroyed base
- Bases reset on Emperor loss

---

## Phase 6: Emperor AI Module

### 6.1 Emperor AI Mode Switching

**File**: `src/game/game.js` (modify in checkEmperorStatus)

```javascript
// When Emperor achieved
function activateEmperorMode(state) {
  state.gameMode = 'emperor';
  state.emperorPhase = 'crowns';
}

// When Emperor lost
function deactivateEmperorMode(state) {
  state.gameMode = 'normal';
  state.emperorPhase = null;
}
```

### 6.2 Modify Enemy Targeting

**File**: `src/game/game.js` (modify existing shouldAttackTeam)

```javascript
// Original shouldAttackTeam function modified:
function shouldAttackTeam(attackerTeam, targetTeam, state) {
  // Emperor mode uses different logic
  if(state.gameMode === 'emperor') {
    return applyEmperorAIRules(attackerTeam, targetTeam);
  }
  
  // Normal mode logic (existing)
  return applyNormalAIRules(attackerTeam, targetTeam);
}

// New function: Emperor AI rules
function applyEmperorAIRules(attackerTeam, targetTeam) {
  // All non-emperor teams (A/B/C) target player
  // All teams ignore each other
  // Only player is real target
  
  if(attackerTeam === 'player') {
    return true;  // Player targets anyone
  }
  
  if(targetTeam === 'player') {
    return true;  // All teams target player
  }
  
  if(targetTeam === 'empBoss') {
    return false;  // Nobody attacks emperor boss (only player does)
  }
  
  return false;  // Teams don't fight each other in emperor mode
}

// Existing function: Normal AI rules
function applyNormalAIRules(attackerTeam, targetTeam) {
  // Existing logic for normal mode
  // (keep current implementation)
}
```

### 6.3 Enemy Unit Type Differentiation

**File**: `src/game/game.js` (modify creature AI)

```javascript
// Modify updateEnemyAI to check Emperor mode
function updateEnemyAI(enemy, state) {
  if(state.gameMode === 'emperor') {
    // Only DPS units (fighters, rangers) target player
    // Tank units (knights, paladins) don't spawn
    
    if(enemy.unitType === 'tank') {
      // Tanks only capture flags
      enemy.targetX = findNearestFlag(state, enemy).x;
      enemy.targetY = findNearestFlag(state, enemy).y;
    } else {
      // DPS/Support target player
      enemy.targetX = state.player.x;
      enemy.targetY = state.player.y;
    }
  } else {
    // Normal mode logic
    // (keep existing)
  }
}
```

**Estimated Risk**: HIGH (affects all team combat)
**Dependencies**: Phase 1-5 complete
**Testing Required**:
- Normal mode: Teams attack each other (unchanged)
- Emperor mode: All teams target player only
- Emperor mode: Teams don't fight each other
- Tanks stop spawning in Emperor mode (or just don't attack)
- Guards target player aggressively
- Boss only targets player + allies

---

## Phase 7: Emperor Boss System

### 7.1 Boss Entity & Spawning

**File**: `src/game/game.js` (new functions)

```javascript
// Spawn Emperor Boss when all bases destroyed
function spawnEmperorBoss(state) {
  let playerBase = findSiteByKey(state, 'player_base');
  let spawnX = playerBase.x + 200;
  let spawnY = playerBase.y + 200;
  
  let empBoss = {
    id: 'emperorBoss',
    type: 'creature',
    boss: true,
    isEmperorBoss: true,
    team: 'boss',
    x: spawnX,
    y: spawnY,
    size: 2,  // 2x multiplier
    hp: 520 * state.zoneLevel * 10,  // x10 HP
    maxHp: 520 * state.zoneLevel * 10,
    contactDmg: calculateBossDamage(state),
    attackRange: 50,
    speed: 2.5,
    
    // Ability system
    abilities: generateEmperorBossAbilities(state),
    abilityPoolIndex: 0,
    abilityCooldown: 0,
    comboState: null,
    
    // Wave spawning
    spawnWaves: {
      nextWaveTime: Date.now() + 3000,
      maxCreaturesActive: 30,
      spawnDelay: 3000,
      waveSize: 5,
      spawnPoints: generateBossSpawnPoints(spawnX, spawnY)
    },
    
    // Guard groups
    guardGroups: [],
    
    // Targeting
    targetX: state.player.x,
    targetY: state.player.y,
    lastAttackTime: Date.now()
  };
  
  state.empBoss = empBoss;
  state.creatures.push(empBoss);
  
  // Spawn initial guard waves
  spawnEmperorBossGuards(empBoss, state);
  
  // Notification
  showGameToast('EMPEROR BOSS SPAWNED!', 'emperor');
  state.gameLog.push(`${getCurrentGameTime()}: Emperor Boss has entered the arena!`);
}

// Generate random abilities (attack only, no heals)
function generateEmperorBossAbilities(state) {
  let attackAbilities = [
    // Filter player abilities to attack-only
    // (no heals, no buffs)
  ];
  
  // Pick 3-4 random abilities
  return attackAbilities.sort(() => Math.random() - 0.5).slice(0, 4);
}

// Generate spawn points around boss
function generateBossSpawnPoints(bossX, bossY) {
  return [
    { x: bossX + 150, y: bossY },
    { x: bossX - 150, y: bossY },
    { x: bossX, y: bossY + 150 },
    { x: bossX, y: bossY - 150 },
    { x: bossX + 100, y: bossY + 100 },
    { x: bossX - 100, y: bossY - 100 }
  ];
}

// Spawn initial guards
function spawnEmperorBossGuards(boss, state) {
  for(let i = 0; i < 2; i++) {
    let spawnPoint = boss.spawnWaves.spawnPoints[i];
    for(let j = 0; j < 5; j++) {
      let guard = {
        id: `empBossGuard_${i}_${j}`,
        type: 'creature',
        isGuard: true,
        team: 'boss',
        x: spawnPoint.x + Math.random() * 30 - 15,
        y: spawnPoint.y + Math.random() * 30 - 15,
        hp: 100,
        maxHp: 100,
        contactDmg: 10,
        size: 1.5,
        icon: 'fighter_card_blue',
        speed: 3,
        guardGroup: `boss_guard_${i}`,
        targetX: state.player.x,
        targetY: state.player.y
      };
      
      state.creatures.push(guard);
      boss.guardGroups.push(guard.id);
    }
  }
}
```

### 7.2 Boss Wave Spawning System

**File**: `src/game/game.js` (new functions)

```javascript
// Manage boss support waves
function updateEmperorBossWaves(state) {
  if(!state.empBoss) return;
  
  let boss = state.empBoss;
  let now = Date.now();
  
  // Check if it's time to spawn next wave
  if(now >= boss.spawnWaves.nextWaveTime) {
    // Count current creatures
    let activeCount = 0;
    for(let creatureId of boss.guardGroups) {
      let creature = state.creatures.find(c => c.id === creatureId);
      if(creature && creature.hp > 0) {
        activeCount++;
      }
    }
    
    // Spawn wave if under cap
    if(activeCount < boss.spawnWaves.maxCreaturesActive) {
      spawnEmperorBossWave(boss, state);
      boss.spawnWaves.nextWaveTime = now + boss.spawnWaves.spawnDelay;
    }
  }
}

// Spawn a single wave
function spawnEmperorBossWave(boss, state) {
  let spawnPoint = boss.spawnWaves.spawnPoints[
    Math.floor(Math.random() * boss.spawnWaves.spawnPoints.length)
  ];
  
  for(let i = 0; i < boss.spawnWaves.waveSize; i++) {
    let creature = {
      id: `empBossCreature_${Date.now()}_${i}`,
      type: 'creature',
      team: 'boss',
      x: spawnPoint.x + Math.random() * 40 - 20,
      y: spawnPoint.y + Math.random() * 40 - 20,
      hp: 50,
      maxHp: 50,
      contactDmg: 8,
      size: 0.8,
      icon: 'fighter_card_blue',
      speed: 2.5,
      attackRange: 30,
      targetX: state.player.x,
      targetY: state.player.y
    };
    
    state.creatures.push(creature);
    boss.guardGroups.push(creature.id);
  }
}

// Boss ability use
function updateEmperorBossAbilities(state) {
  if(!state.empBoss) return;
  
  let boss = state.empBoss;
  let now = Date.now();
  
  // Reduce cooldown
  if(boss.abilityCooldown > 0) {
    boss.abilityCooldown -= 100;  // 100ms per tick
  }
  
  // Use ability if cooldown ready
  if(boss.abilityCooldown <= 0 && boss.abilities.length > 0) {
    let ability = boss.abilities[boss.abilityPoolIndex % boss.abilities.length];
    
    // Use ability at player
    useAbilityAtTarget(boss, ability, state.player, state);
    
    boss.abilityPoolIndex++;
    boss.abilityCooldown = ability.cooldown * 1000;  // Convert to ms
  }
}
```

### 7.3 Boss Health Bar Display

**File**: `src/game/ui.js` (add new function)

```javascript
// Draw Emperor boss health bar
function drawEmperorBossHealthBar(empBoss, ctx, canvasWidth) {
  if(!empBoss) return;
  
  let barWidth = 500;
  let barHeight = 30;
  let x = (canvasWidth - barWidth) / 2;
  let y = 20;
  
  // Background
  ctx.fillStyle = '#222222';
  ctx.fillRect(x, y, barWidth, barHeight);
  
  // Health bar
  let healthPercent = Math.max(0, empBoss.hp / empBoss.maxHp);
  ctx.fillStyle = '#FF3333';
  ctx.fillRect(x + 2, y + 2, (barWidth - 4) * healthPercent, barHeight - 4);
  
  // Border
  ctx.strokeStyle = '#FF6666';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);
  
  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`EMPEROR BOSS: ${Math.ceil(empBoss.hp)} / ${empBoss.maxHp}`, 
               canvasWidth / 2, y + barHeight / 2);
}

// Call in main render loop
function render(state, ctx, canvas) {
  // ... existing render code ...
  
  if(state.empBoss) {
    drawEmperorBossHealthBar(state.empBoss, ctx, canvas.width);
  }
  
  // ... rest of render ...
}
```

### 7.4 Boss Victory Detection

**File**: `src/game/game.js` (new function)

```javascript
// Check if Emperor boss defeated
function checkEmperorBossDeath(state) {
  if(!state.empBoss || state.empBoss.hp > 0) return;
  
  // Boss defeated!
  state.empBoss = null;
  state.gameMode = 'normal';
  state.emperorPhase = null;
  
  showGameToast('VICTORY! Emperor defeated!', 'victory');
  state.gameLog.push(`${getCurrentGameTime()}: Emperor Boss defeated! Campaign complete!`);
  
  // Calculate victory score
  calculateCampaignVictoryScore(state);
  
  // Show victory screen
  showCampaignVictoryScreen(state);
}
```

**Estimated Risk**: HIGH (complex new system)
**Dependencies**: Phase 1-6 complete
**Testing Required**:
- Boss spawns after all bases destroyed
- Boss has large health bar
- Boss spawns guards
- Boss spawns creature waves
- Waves respect 30-creature cap
- Waves spawn every 3 seconds
- Boss abilities work (attack only)
- Defeating boss triggers victory
- Boss destroyed on Emperor loss

---

## Phase 8: Integration & Game Loop Updates

### 8.1 Main Game Loop Integration

**File**: `src/game/game.js` (in updateGame function)

```javascript
function updateGame(state, deltaTime) {
  // ... existing updates ...
  
  // Emperor system updates (only when Emperor mode active)
  if(state.gameMode === 'emperor') {
    checkCrownPickup(state);
    updateCarriedCrowns(state);
    checkCrownSecuring(state);
    
    updateCrownGuards(state);
    
    updateBaseDestruction(state);
    
    if(state.empBoss) {
      updateEmperorBossWaves(state);
      updateEmperorBossAbilities(state);
      checkEmperorBossDeath(state);
    }
  }
  
  // Always check emperor status
  checkEmperorStatus(state);
  checkEmperorVictory(state);
  
  // ... rest of game update ...
}
```

### 8.2 Update handleDethronement Function

**File**: `src/game/game.js` (expand dethronement)

```javascript
function handleDethronement(state) {
  // Reset all Emperor systems
  
  // Crowns
  for(let crown of Object.values(state.crowns)) {
    if(crown) {
      crown.locked = true;
      crown.carriedBy = null;
      crown.atPlayerBase = false;
      
      // Return to base
      let teamBase = findSiteByKey(state, `${crown.team}_base`);
      crown.x = teamBase.x + 20;
      crown.y = teamBase.y;
    }
  }
  
  // Crown Guards
  destroyAllCrownGuards(state);
  state.crownGuards = [];
  
  // Bases
  resetBaseDestruction(state);
  
  // Boss
  if(state.empBoss) {
    state.empBoss = null;
  }
  
  // Game mode
  deactivateEmperorMode(state);
  
  // UI notification
  showGameToast('Emperor status lost!', 'warning');
  state.gameLog.push(`${getCurrentGameTime()}: All Emperor systems reset.`);
}
```

### 8.3 Campaign Reset

**File**: `src/game/game.js` (in resetGame or similar)

```javascript
function resetGame(state) {
  // ... existing reset code ...
  
  // Reset Emperor system
  state.gameMode = 'normal';
  state.emperorPhase = null;
  state.crowns = {
    teamA: { locked: true, carriedBy: null, atPlayerBase: false },
    teamB: { locked: true, carriedBy: null, atPlayerBase: false },
    teamC: { locked: true, carriedBy: null, atPlayerBase: false }
  };
  state.crownGuards = [];
  state.empBoss = null;
  state.basesDestroyed = { teamA: false, teamB: false, teamC: false };
  
  // ... rest of reset code ...
}
```

**Estimated Risk**: LOW (integration only)
**Dependencies**: All previous phases complete

---

## Summary of Changes

| Phase | Component | Type | Risk | Lines |
|-------|-----------|------|------|-------|
| 1 | Emperor Loss Fix | BUG FIX | LOW | 10 |
| 2 | State Setup | NEW | LOW | 20 |
| 3 | Crown System | NEW | LOW | 150 |
| 4 | Crown Guards | NEW | MEDIUM | 120 |
| 5 | Base Destruction | NEW | LOW-MEDIUM | 100 |
| 6 | Emperor AI | MODIFY | HIGH | 50 |
| 7 | Boss System | NEW | HIGH | 200 |
| 8 | Integration | NEW | LOW | 100 |
| | **TOTAL** | | | **750** |

---

## Testing Checklist

- [ ] Normal gameplay unaffected (all 3 teams play independently)
- [ ] Emperor detection works (need ALL flags)
- [ ] Emperor loss fixed (only at 0 flags)
- [ ] Crowns spawn at game start (locked)
- [ ] Crowns unlock on Emperor achievement
- [ ] Player can pick up/carry crowns
- [ ] Crowns return on player death
- [ ] Crowns secure at player base
- [ ] Crown Guards spawn on Emperor achievement
- [ ] Guards chase player aggressively
- [ ] Guards respawn after 5 seconds
- [ ] First crown → teamA base destructible
- [ ] Second crown → teamB base destructible
- [ ] Third crown → teamC base destructible
- [ ] Bases can be damaged and destroyed
- [ ] Team can't respawn from destroyed base
- [ ] All teams target player in Emperor mode
- [ ] Teams don't fight each other in Emperor mode
- [ ] Boss spawns after all bases destroyed
- [ ] Boss has large health bar
- [ ] Boss spawns creature waves
- [ ] Waves cap at 30 creatures
- [ ] Boss uses attack abilities only
- [ ] Defeating boss triggers victory
- [ ] Emperor loss destroys everything
- [ ] All systems reset on campaign reset

---

## Critical Points for User Review

**Before we proceed, please verify:**

1. ✅ Do you want Crowns to ALWAYS spawn at start (locked), or only appear after Emperor achievement?
   - I assumed: Always spawn at start, locked until Emperor
   
2. ✅ Should Crown Guards respawn indefinitely?
   - I assumed: Yes, always respawn at base every 5 seconds
   
3. ✅ Should destroyed bases prevent respawning immediately?
   - I assumed: Yes, destroyed base = team can't respawn there anymore
   
4. ✅ Should attacking guards/boss be affected by Emperor loss?
   - I assumed: Yes, all disappear immediately if Emperor lost
   
5. ✅ What's the boss difficulty vs. player level? Should it be tunable?
   - I assumed: x10 HP multiplier, standard damage scaling, may need tuning

**Any changes needed before implementation?**

