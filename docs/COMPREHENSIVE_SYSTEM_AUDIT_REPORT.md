# Comprehensive System Audit Report

**Report Date:** Current Session  
**Focus Areas:** Music System, Creature Behaviors, Guard System, Collision Detection, Loot/XP

---

## Executive Summary

This audit identified **4 critical issues** and **1 verification needed** across core game systems:

1. **🔴 CRITICAL: Creatures not attacking in dungeons** - Attack initialization broken at spawn
2. **🔴 CRITICAL: Guard speed exceeds caps** - Speed values can reach 145+ vs max 140
3. **🔴 CRITICAL: Guards stacking on player** - Formation slot collision failing
4. **🟡 IMPORTANT: Music transition overlap** - Boss/dungeon/world music not cleanly switching
5. **🟢 VERIFICATION: Creature loot & XP** - System appears correct but untested

---

## Issue #1: Creatures Not Attacking in Dungeons 🔴 CRITICAL

### Symptom
When dungeon starts after boss intro, creatures spawn but don't engage player - they stand idle or wander.

### Root Cause Analysis

**Location:** `src/game/game.js` lines 9032-9160 (spawnDungeonEnemies)

The attack behavior chain is **BROKEN** at spawn:

```javascript
// Line 9119 - spawnCreatureAt() creates creature
const creature = spawnCreatureAt(state, x, y, creatureType);

// Line 9130-9137 - Dungeon-specific properties set
if(creature){
  creature.dungeonId = dungeon.id;
  creature.guardRole = comp.role;
  creature.dungeonCenter = { x: cx, y: cy };
  creature.dungeonAnchor = { x: x, y: y };
  creature.formationIndex = comp.formationIndex;
  // BUT: attacked flag NOT initialized to true!
  // BUT: formation state NOT set!
}
```

**In spawnCreatureAt()** (line 4292):
```javascript
// These are initialized but creature might not be ready to attack
attacked: false,  // ← PROBLEM: Set to false on spawn
hitCd: 0,
target: null,
```

**In updateCreatures()** (line 11427+):
```javascript
// Attack logic depends on aggro distance check
if(!state.player.dead){
  const d = Math.hypot(state.player.x - c.x, state.player.y - c.y);
  if(d < nearestD && d <= agro_dist){ // ← Uses agro_dist property
    nearestD = d;
    nearest = state.player;
  }
}

// Then targets if attacked=true OR nearest target found
if(nearest && (c.attacked || nearest)){
  c.target = nearest;
  c.attacked = true;
}
```

### The Chain Breaks Because:

1. **Creature spawns with `attacked: false`** (line 4310)
2. **Formation-based dungeons don't trigger attack state** at spawn
3. **Dungeon creatures might have wrong aggro_range** - Formation positioning may be far enough that aggro check fails initially
4. **Boss abilities not copied correctly** - Line 9168 shows `boss.abilities = dungeon.savedGroup.boss.profile.abilities` but abilities might not initialize `npcAbilities` properly

### Evidence

**Expected Behavior (World Creatures):**
- spawnCreatureAt() creates creature with `attacked: false`
- updateCreatures() on each frame checks aggro_dist
- First frame within range: creature sets `target`, becomes `attacked = true`

**Actual Dungeon Behavior:**
- spawnCreatureAt() creates creature with `attacked: false`
- Creatures spawn in formation at calculated offsets
- Formation positioning may place creatures just outside initial aggro range
- **No trigger to force `attacked = true` on spawn**
- Boss intro 3-second delay means first aggro check happens late
- Creatures stand idle, waiting for player to come within aggro_dist

### Impact
- Dungeons feel empty/passive
- Players can walk through creature lines without engagement
- Boss doesn't actively defend formation
- Combat difficulty drops

### Fix Required
1. **Force `attacked: true` on dungeon creature spawn** OR
2. **Set aggro_dist to larger value for dungeon creatures** OR  
3. **Add formation detection trigger** to automatically aggro all formation members when one is attacked

---

## Issue #2: Guard Speed Exceeds Speed Caps 🔴 CRITICAL

### Symptom
Guards appear to move faster than documented speed limits, making them hard to kite away.

### Root Cause Analysis

**Speed Cap Documentation (Intended):**
- Idle: 0
- Drift: 30
- Fine-tune: 60
- Follow: 110  
- Sprint: 140 (max)

**Actual Guard Speed Assignment** (src/game/game.js lines 5620-5680):

```javascript
// ACTIVE_DEFENSE STATE - DPS Guards
if(a._guardState === 'ACTIVE_DEFENSE' && priorityTarget){
  // ... (line 5660+)
  const kiteUntil = (a._guardKiteUntil || 0);
  if(kiteUntil > now){
    // POST-BURST KITE WINDOW
    if(targetDist < 110){
      a.speed = 145;  // ← EXCEEDS CAP (140)!
    } else {
      a.speed = (distFromSlot > 14) ? 130 : 55;
    }
  } else {
    a.speed = 130;
    // ...
  }
}
```

### The Problem

1. **Line 5664: `a.speed = 145`** during post-burst kite
   - This is 5 units above documented max of 140
   - No enforcement mechanism prevents this

2. **Line 5660: `a.speed = 145`** during emergency retreat
   - Set without any cap check
   - Designed to catch fleeing players but breaks speed contract

3. **No speed cap enforcement anywhere in AI**
   - Guards can set any `a.speed` value they want
   - Movement system (`moveWithAvoidance()`) doesn't cap speeds
   - No validation in update loop

### Why This Breaks Balance

- **Design Intent**: Speed 140 is "burst catch-up" maximum
- **Actual Implementation**: Guards have no upper bound
- **Player Impact**: Can't reliably kite guards beyond speed 140
- **Game Feel**: Guards feel overpowered, unreliable to escape

### Impact
- Guards catch players who should be able to escape at speed >140
- Formation retreat to slot too fast (110 set but executes faster)
- Post-burst kite window (145 speed) makes burst combos ineffective
- Ball group looks unrealistic - guards zip around erratically

### Fix Required
1. **Add hard speed cap check** in movement execution
2. **Cap all speeds at 140** before passing to moveWithAvoidance()
3. **Recalculate burst kite speeds** to stay within cap

---

## Issue #3: Guards Stacking on Player 🔴 CRITICAL

### Symptom
Multiple guards occupy same space as player, making player invisible and creating unfair collision.

### Root Cause Analysis

**Formation Slot System** (line 5380-5410):

```javascript
// Guard formation slots defined relative to spawn point
if(a.guardRole === 'HEALER'){
  const healerIndex = healerGuards.indexOf(a);
  if(healerIndex === 0) a._formationSlot = { offsetX: -35, offsetY: -45 }; // Rear-left
  else if(healerIndex === 1) a._formationSlot = { offsetX: 35, offsetY: -45 }; // Rear-right
  else a._formationSlot = { offsetX: 0, offsetY: -45 }; // Rear-center fallback
} else {
  const dpsIndex = dpsGuards.indexOf(a);
  if(dpsIndex === 0) a._formationSlot = { offsetX: 0, offsetY: 25 };    // Front-center (LEADER)
  else if(dpsIndex === 1) a._formationSlot = { offsetX: -30, offsetY: 15 }; // Front-left
  else if(dpsIndex === 2) a._formationSlot = { offsetX: 30, offsetY: 15 };  // Front-right
  else a._formationSlot = { offsetX: 0, offsetY: 0 }; // Center fallback
}
```

**Deadband System** (line 5415):
```javascript
const distFromSlot = Math.hypot(a.x - slotX, a.y - slotY);
// Deadband check happens in state transitions (line 5599):
if(distFromSlot > 25){
  // Not at slot yet
}
```

### The Problem

1. **Slots are anchored to spawn position**, not relative to enemies/player
   - DPS slot #0: offset (0, 25) from spawn
   - This places guard AT spawn + 25 up
   - If player is near spawn, guard stacks directly on player

2. **Healer optimal range (110-190) has 80-unit comfort zone**
   - Line 5639 healer positioning:
   ```javascript
   const HEALER_MIN_DIST = 110;
   const HEALER_MAX_DIST = 190;
   const HEALER_OPTIMAL = 140;
   ```
   - If target (player) is at spawn, healer tries to maintain 110-190 distance
   - But DPS guards are AT spawn fighting
   - Healer gets confused about positioning

3. **No collision detection between guards and player**
   - moveWithAvoidance() handles unit-to-unit avoidance
   - But formation slot system FORCES guards to specific coordinates
   - Guard will pathfind TO slot position, potentially running through player

4. **25-unit deadband is too tight**
   - Deadband only prevents oscillation when close
   - Doesn't create proper separation distance
   - 25u is 2x guard radius (12u) but 1/10th of proper combat distance

### Why Guards Stack

**Scenario:**
1. Player at flag spawn point (x=100, y=100)
2. Guard spawn at same point
3. Front-center DPS slot = (100, 125) = front of guard
4. Guard moves to slot (100, 125) = directly in front of player
5. Guard reaches slot, stays there (deadband satisfied)
6. Other guards converge on same area to attack player
7. Result: 5 guards + 1 player in ~50-pixel radius

### Impact
- Player becomes invisible (occluded by guards)
- Can't see own abilities/health
- Unfair damage concentration
- Guards collision pushing player around
- Looks broken/amateur

### Fix Required
1. **Add minimum separation enforcement** between guards and player
2. **Detect guard-player collision** and push them apart
3. **Increase healer distance enforcement** to ensure they don't converge
4. **Dynamic slot adjustment** when player approaches flag

---

## Issue #4: Music Transition Overlap 🟡 IMPORTANT

### Symptom
Boss music, dungeon music, and world music sometimes play simultaneously or don't cleanly transition.

### Root Cause Analysis

**Music Flow** (src/game/game.js lines 280-300 init, 9119+ transitions):

```javascript
// Initialization
state.sounds = {
  gameNonCombatMusic: new Audio('sounds/game-music-calm.mp3'),
  gameCombatMusic: new Audio('sounds/game-music-combat.mp3'),
  emperorAttackMusic: new Audio('sounds/emperor-attack.mp3'),
  dungeonMusic: new Audio('sounds/dungeon-music.mp3'),
  bossIntro: new Audio('sounds/boss-intro.mp3')
};
```

**Dungeon Entry Flow** (lines 9109-9125):

```javascript
// Show boss intro screen FIRST
showBossIntro(state, dungeon.savedGroup.boss.icon, dungeon.name, 
              dungeon.savedGroup.boss.profile, () => {
  // CALLBACK: 3-second delay, then:
  
  // Start dungeon music
  if(state.sounds?.dungeonMusic){
    if(state.sounds.gameNonCombatMusic && !state.sounds.gameNonCombatMusic.paused) 
      state.sounds.gameNonCombatMusic.pause();  // ← Pause world music
    if(state.sounds.gameCombatMusic && !state.sounds.gameCombatMusic.paused) 
      state.sounds.gameCombatMusic.pause();    // ← Pause combat music
    state.sounds.dungeonMusic.currentTime = 0;
    state.sounds.dungeonMusic.play().catch(e => console.warn('Dungeon music failed:', e));
  }
  
  // Spawn creatures...
});
```

### The Problems

1. **Boss intro sound never explicitly stopped**
   - bossIntro plays during 3-second intro delay
   - Line 9119+ starts dungeonMusic without stopping bossIntro
   - Both tracks may play together briefly

2. **World music pause timing uncertain**
   - `showBossIntro()` is async/delayed
   - World music might still be fading/playing when dungeon music starts
   - No fade-out delay, immediate pause

3. **Combat music not properly stopped**
   - Line 11123 switches between tracks based on combat state
   - If player was in combat before entering dungeon, gameCombatMusic might still be partially playing
   - 3-second delay means it has time to restart

4. **Emperor music not handled in dungeon entry**
   - If emperor is in combat during dungeon entry, emperorAttackMusic might be playing
   - Not explicitly stopped anywhere

5. **No crossfade, just hard pause/play**
   - Results in audible clicks/pops
   - Sounds unprofessional
   - Can't mute other tracks during boss intro

### Impact
- Audio confusion when entering dungeons
- Multiple music tracks audible simultaneously
- Boss intro sound continues under dungeon music
- Player gets disoriented by audio landscape

### Fix Required
1. **Explicitly stop bossIntro** when dungeonMusic starts
2. **Stop all active music tracks** before starting new one
3. **Add volume fade-out** before switching tracks (0.5s fade)
4. **Handle emperor music** in dungeon transitions

---

## Issue #5: Creature Loot & XP System 🟢 VERIFICATION NEEDED

### Status
System appears correctly implemented but **untested in current session**.

### Documentation Found

**Creature XP System** (src/game/game.js line 4311):
```javascript
xp: eT.xp  // XP value from creature template
```

**CREATURE_TYPES Definition** (lines 4233-4240):
```javascript
{ key:'goblin',  name:'Goblin',  color:'#3d7a2d', r:11, hp:50,  speed:75,  dmg:7,  agro:90,  xp:15 },
{ key:'orc',     name:'Orc',     color:'#8b5a35', r:12, hp:70,  speed:70,  dmg:9,  agro:100, xp:25 },
{ key:'wolf',    name:'Wolf',    color:'#888',    r:11, hp:55,  speed:95,  dmg:8,  agro:120, xp:20 },
{ key:'bear',    name:'Bear',    color:'#8b5a35', r:16, hp:140, speed:65,  dmg:12, agro:110, xp:40 },
```

**Level Scaling** (lines 4281-4287):
```javascript
// Apply level scaling to creature stats (8% per level, same as player)
const levelMult = 1 + (creatureLevel - 1) * 0.08;
const scaledHp = Math.round(type.hp * levelMult);
const scaledDmg = Math.round(type.dmg * levelMult);
// NOTE: XP not explicitly scaled but creature level set
```

**Loot System** (Referenced in docs but not found in spawnCreatureAt):
- Need to verify loot drop system exists and triggers on creature death

### What Should Be Verified
- [ ] Creature XP awarded to player on kill
- [ ] XP scales with creature level appropriately
- [ ] Loot drops on creature death
- [ ] Rarity distribution correct
- [ ] Item level scaling works for creature drops

### Concerns
1. **XP scaling unclear** - creatures have level but xp value not explicitly scaled
2. **Loot drop trigger missing** - no loot generation code visible in creature spawn
3. **Boss loot** - special boss drops not documented

---

## System Architecture Review

### Guard AI Overall Assessment: SOPHISTICATED BUT BUGGY

**What's Well-Designed:**
- Formation slot system (prevents all guards from converging on one point)
- Guard ball group coordination (shared focus targeting with leader election)
- State machine (IDLE_DEFENSE, ACTIVE_DEFENSE, RETURN_TO_POST)
- Role differentiation (healers vs DPS with different behaviors)
- Pre-fight buffs trigger at aggro range

**What's Broken:**
- Speed enforcement (145 exceeds 140 cap)
- Collision prevention between guards and player
- Healer optimal range creates convergence zone
- Formation slots not adjusted for player proximity

### Creature AI Overall Assessment: BASIC BUT INCOMPLETE

**What Works:**
- Creature templates with varied stats
- Level scaling (8% per level)
- Aggro distance system
- Pack mechanics (multiple creatures work together)

**What's Broken:**
- Dungeon creatures don't auto-aggro on spawn
- Boss abilities may not initialize properly
- Loot system not visible/verifiable

### Music System Overall Assessment: CORRECT DESIGN, EXECUTION ISSUES

**What Works:**
- Separate tracks for different contexts
- Combat/non-combat distinction
- Dungeon override
- Boss intro delay system

**What's Broken:**
- No cleanup of previous tracks
- Timing issues in transitions
- No audio crossfade

---

## Recommendations (Priority Order)

### 🔴 CRITICAL (Fix First)

**1. Fix Creature Attack Initialization** (15 min)
- **What**: Force dungeon creatures to aggro on spawn
- **Where**: Line 9130-9137 in spawnDungeonEnemies()
- **Solution**: Set `creature.attacked = true` for all dungeon creatures

**2. Fix Guard Speed Cap** (10 min)
- **What**: Cap all guard speeds at 140 max
- **Where**: Line 5664 and before moveWithAvoidance() call
- **Solution**: Add `a.speed = Math.min(a.speed, 140)` before movement

**3. Fix Guard Stacking** (20 min)
- **What**: Prevent guards from occupying same space as player
- **Where**: Formation slot system and movement execution
- **Solution**: Add collision detection and push-apart, or increase minimum distance enforcement

### 🟡 IMPORTANT (Fix Second)

**4. Fix Music Transitions** (20 min)
- **What**: Explicitly stop all tracks before starting new ones
- **Where**: Dungeon entry and exit functions
- **Solution**: Add audio cleanup routine, implement crossfade

### 🟢 VERIFY (Fix Last)

**5. Verify Loot & XP** (30 min testing)
- **What**: Confirm loot drops and XP awards work correctly
- **Where**: Need to test in-game
- **Solution**: Run dungeon, kill creatures, verify drops and XP gained

---

## Code Locations Summary

| Issue | File | Lines | Severity |
|-------|------|-------|----------|
| Creature attacks | game.js | 9032-9160 | 🔴 |
| Guard speed | game.js | 5664, 5660 | 🔴 |
| Guard stacking | game.js | 5380-5410 | 🔴 |
| Music overlap | game.js | 280-300, 9109-9125 | 🟡 |
| Loot/XP | game.js | 4233-4311 | 🟢 |

---

## Next Steps

1. **Run diagnostic tests** in each affected system
2. **Create fix PR** with speed cap enforcement
3. **Test guard behavior** with fixes
4. **Verify creature aggro** in dungeon
5. **Test music transitions** for clean switching
6. **Document final fixes** with before/after

