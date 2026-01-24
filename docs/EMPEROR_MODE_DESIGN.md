# Emperor Mode - Complete Design Document

## Overview
Emperor Mode is an endgame progression system that transforms the game from 3-way team competition into a player-vs-all challenge with multiple phases.

---

## Current Implementation Status

### ✅ EXISTING (Already Implemented)
1. **Emperor Detection** (game.js:12162)
   - `checkEmperorStatus(state)` monitors flag control
   - Player becomes Emperor when controlling ALL flags
   - Flags tracked via `state.sites` with `owner` property
   
2. **Emperor Buff** (game.js, ui.js)
   - `addEmperorEffect(state)` applies buffs (+3x resources, +50% CDR)
   - `removeEmperorEffect(state)` removes buffs
   - Visual indicator in UI
   
3. **Zone Boss Spawn** (game.js:12036)
   - `spawnZoneBoss(state)` spawns when Emperor achieved
   - Boss scales to zone level
   - Uses standard enemy scaling (5x HP, 2x damage)

4. **Team Alliance System** (game.js:6619)
   - `shouldAttackTeam()` determines if teams should fight
   - When Emperor active: all non-emperor teams ally against emperor

### ⚠️ BUGS/ISSUES (Need Fixing)
1. **Emperor Loss Condition is BROKEN**
   - Currently: Emperor lost when ANY flag is captured (line 12213)
   - Should be: Emperor lost when player reaches 0 flags
   - Current code has logic at line 12217 but `checkEmperorStatus` removes emperor too early
   
2. **Boss Spawn Timing**
   - Boss currently spawns immediately on Emperor achievement
   - Should wait until all bases destroyed (NEW SYSTEM)
   
3. **No Crown System**
   - Crowns don't exist yet (NEW SYSTEM)
   
4. **No Base Destruction**
   - Can't destroy enemy bases (NEW SYSTEM)
   
5. **Enemy AI Not Emperor-Aware**
   - All enemies target based on generic logic
   - Should have special Emperor-mode behavior (NEW SYSTEM)

---

## NEW SYSTEMS TO BUILD

### 1. Crown System

#### Crown Entity Structure
```javascript
{
  id: 'crown_teamA',              // unique ID
  team: 'teamA',                  // which team it belongs to
  homeBase: { x, y },            // team base location
  x, y,                          // current position
  locked: true,                  // can't collect until Emperor
  carriedBy: null,               // player ID if being carried
  visible: true,                 // always visible
  icon: 'crown',                 // placeholder asset
  size: 40,                      // rendering size
  atPlayerBase: false            // is it secured?
}
```

#### Crown Lifecycle
1. **Spawn at game start** at each team base (locked)
2. **Unlock when Emperor achieved** (visual change)
3. **Can be collected** by walking over it
4. **Carried** in player inventory (no other item can be picked up)
5. **Return on death** if player dies while carrying
6. **Secured at player base** when player reaches home base
7. **Return on Emperor loss** if Emperor status lost

### 2. Crown Guard System

#### Guard Group Structure
```javascript
{
  id: 'crownGuard_teamA',
  team: 'teamA',
  homeBase: { x, y },
  guardingCrown: 'crown_teamA',
  creatures: [5 entities],        // 5-person group
  respawnTimer: 0,               // 5 second respawn
  dead: false
}
```

#### Guard Behavior
- **Spawn at home base** when crowns unlock
- **Aggressively chase player** (always, not just on crown pickup)
- **Target priority**: Player > Player allies > anything else
- **Size**: 2x regular creature (same as world boss)
- **Appearance**: Blue using fighter card images
- **Respawn**: After 5 seconds at home base
- **Destroy immediately**: If Emperor status lost

### 3. Base Destruction System

#### Base State Extension
```javascript
// Add to each site with type 'base'
base.destroyed = false;           // can be destroyed
base.capturedCrown = null;        // which crown unlocked this base
base.destructionThreshold = 100;  // HP before destructible
```

#### Destruction Mechanics
- **Unlock trigger**: One crown secured at player base
- **Activation sequence**: 
  - Crown 1 secured → teamA base destructible
  - Crown 2 secured → teamB base destructible
  - Crown 3 secured → teamC base destructible
- **Destruction method**: Damage base until destroyed
- **Effect**: Team cannot respawn from destroyed base
- **Respawn**: If Emperor lost, bases respawn

### 4. Emperor AI Module System

#### Mode Switching
```javascript
state.gameMode = 'normal' | 'emperor';  // Add to state

// In updateEnemies, updateCreatures:
if(state.gameMode === 'emperor') {
  applyEmperorAIRules(enemy);
} else {
  applyNormalAIRules(enemy);
}
```

#### Emperor Mode AI Rules

**Tank Units** (all teams):
- Only capture flags, ignore player
- Don't spawn during Emperor phase

**DPS/Support Units** (all teams):
- **HARD TARGET** player and player allies ONLY
- Ignore each other (even from same team)
- Chase player aggressively
- Can be healed by team healers (still in teams)

**Boss** (Emperor boss only):
- Target ONLY player and player allies
- Never attacks teams A/B/C
- Never gets attacked by teams A/B/C

**Crown Guards**:
- Chase player aggressively
- Attack player + allies
- Can't damage player allies (can push/block only)

### 5. Emperor Boss System

#### Emperor Boss Entity Structure
```javascript
{
  id: 'emperorBoss',
  boss: true,
  isEmperorBoss: true,           // distinguish from dungeon/world bosses
  phase: 'spawning' | 'combat',
  size: 2,                       // 2x multiplier vs normal
  maxHp: 520 * levelMult * 10,  // x10 HP
  hp: ...,
  contactDmg: bossDmg,
  abilities: [],                 // randomized from player ability pool
  abilityCooldown: 0,
  abilities: {
    available: [],               // attack abilities only
    cooldowns: {},
    comboState: null             // combo system tracking
  },
  guardGroups: [],               // boss guards
  spawnWaves: {
    nextWaveTime: 0,
    maxCreaturesActive: 30,
    spawnDelay: 3000,            // 3 seconds between waves
    waveSize: 5,
    spawnPoints: []              // 4-6 spawn locations around boss
  }
}
```

#### Boss Spawn Conditions
- **Trigger**: All 3 bases destroyed + all crowns secured
- **Location**: Center of map (or near player when spawned)
- **Initial guards**: 2-3 guard groups of 5 blue orbs
- **Health bar**: Large display at top of screen

#### Boss Support System
- **Max creatures**: 30 combined (guards + creatures)
- **Spawn waves**: Every 3+ seconds
- **Wave size**: 5 at a time
- **Multiple spawn points**: 4-6 locations around boss (distance-based)
- **Types**: Blue orbs (fighter card images) + regular creatures
- **Respawn**: 5 seconds after death
- **Destruction**: Immediately if Emperor lost

#### Boss Ability System
- **Pool**: All player attack abilities (no heals/buffs)
- **Randomization**: Pick 3-4 random at spawn
- **Rotation**: Use combo system for ability selection
- **Cooldowns**: Respect cooldown mechanics
- **Cannot heal**: No healing effects allowed

---

## Phase Progression

### Phase 0: Normal Gameplay
```
Playing CTF with 3 teams
- Teams capture flags normally
- World boss spawns randomly
- Standard team-vs-team combat
```

### Phase 1: Emperor Achievement
```
Trigger: Player controls ALL flags

Events:
1. Emperor buff applied to player
2. 3 crowns UNLOCK at team bases
3. Crown Guards spawn (3 groups of 5)
4. AI switches to Emperor mode
5. Toast notification

State:
- state.gameMode = 'emperor'
- state.emperorTeam = 'player'
- state.crowns[].locked = false
- Tanks stop spawning
- DPS focuses on player
```

### Phase 2: Crown Collection
```
Trigger: Emperor achieved

Objectives:
1. Collect crown from teamA base (fight Crown Guards)
2. Collect crown from teamB base (fight Crown Guards)
3. Collect crown from teamC base (fight Crown Guards)
4. Bring each crown back to player base
5. Secure all 3 crowns

Progress:
- First crown → teamA base becomes destructible
- Second crown → teamB base becomes destructible
- Third crown → teamC base becomes destructible
```

### Phase 3: Base Destruction
```
Trigger: Each crown secured

Objectives:
1. Damage teamA base until destroyed (no more respawns)
2. Damage teamB base until destroyed (no more respawns)
3. Damage teamC base until destroyed (no more respawns)

Progress:
- As bases destroyed, enemy team power decreases
- Crown Guards still spawn and protect
- Boss not yet active
```

### Phase 4: Boss Battle
```
Trigger: All 3 bases destroyed + all crowns secured

Events:
1. Boss spawns at map center
2. Large health bar appears
3. Boss guards spawn (blue orbs)
4. Creature waves begin spawning
5. Dramatic notification

Objective:
- Defeat Emperor Boss

Victory:
- Boss defeated → Campaign victory
- Score calculated based on time/efficiency
```

### Loss Condition: Dethronement
```
Trigger: Player reaches 0 flags (loses ALL flags)

Events:
1. Emperor status lost
2. Emperor buff removed
3. All crowns return to team bases (unlocked)
4. All bases respawn (destructible state reset)
5. Crown Guards despawn
6. Emperor Boss despawns
7. All guards/creatures destroyed
8. AI switches back to normal mode
9. Toast notification

Result:
- Back to normal 3-way CTF
- Teams A/B/C play normally again
- Can attempt Emperor run again
```

---

## Code Location Map

### Files to Modify
1. **game.js**
   - Fix `checkEmperorStatus()` (line 12162) - emperor loss condition
   - Add `emperorAIModule.js` or inline Emperor AI rules
   - Add Crown system functions
   - Add Base destruction system
   - Modify `updateEnemies()` to use Emperor AI when active
   - Modify `spawnZoneBoss()` to spawn Emperor boss instead

2. **ui.js**
   - Add Crown display UI (top of screen when secured)
   - Add Boss health bar (large display)
   - Modify toast notifications for Emperor events
   - Add Crown pickup/drop mechanics UI

3. **render.js**
   - Add Crown rendering (locked/unlocked states)
   - Add Crown Guard rendering (blue orbs)
   - Add Emperor Boss rendering (2x size, distinctive look)
   - Add Boss health bar rendering

4. **state.js**
   - Add `state.gameMode` (normal | emperor)
   - Add `state.crowns[]` array
   - Add `state.emperorPhase` tracking
   - Add `state.basesDestroyed` tracking
   - Add `state.emperorBoss` entity

### New Module (Optional)
```
src/game/modules/emperorMode.js
- emperorAIManagedEnemy()
- crownGuardBehavior()
- baseDestructionLogic()
- crownCarryingLogic()
```

---

## Risk Assessment

### Low Risk Changes
- Crown spawn/rendering (isolated system)
- Crown Guard behavior (localized to guards only)
- Base destruction logic (doesn't affect normal gameplay)
- Crown display UI (additive only)

### Medium Risk Changes
- Emperor AI module (affects all enemy targeting)
- Game mode switching (new state, potential conflicts)
- Boss behavior changes (affects zone boss)

### High Risk Changes
- `checkEmperorStatus()` fix (timing affects when Emperor lost/gained)
- `shouldAttackTeam()` modifications (affects all team combat)
- `updateEnemies()` refactor (core gameplay loop)

---

## Implementation Plan

### Step 1: Foundation
- [ ] Add `state.gameMode` and game mode constants
- [ ] Create Crown entity structure
- [ ] Add Crowns to state initialization

### Step 2: Emperor Detection Fix
- [ ] Fix `checkEmperorStatus()` to not remove Emperor at -1 flags
- [ ] Keep Emperor persistent while holding 1+ flags
- [ ] Only lose at 0 flags

### Step 3: Crown System
- [ ] Implement Crown spawning at game start (locked)
- [ ] Implement Crown unlock on Emperor achievement
- [ ] Implement Crown pickup/carrying mechanics
- [ ] Implement Crown drop on player death (return to base)
- [ ] Implement Crown securing at player base
- [ ] Add Crown display UI

### Step 4: Emperor AI Module
- [ ] Create AI mode switching system
- [ ] Implement Emperor-mode targeting rules
- [ ] Separate tank behavior (flag capture only)
- [ ] Separate DPS behavior (player focus)
- [ ] Implement Crown Guard targeting

### Step 5: Crown Guard System
- [ ] Implement Crown Guard spawning
- [ ] Implement Guard respawning (5 sec)
- [ ] Implement Guard aggressive chasing
- [ ] Implement Guard destruction on Emperor loss
- [ ] Add Guard rendering (blue orbs)

### Step 6: Base Destruction
- [ ] Add destructible state to bases
- [ ] Implement destruction threshold
- [ ] Implement destruction effects (no respawn)
- [ ] Implement respawn on Emperor loss
- [ ] Add destruction UI indicators

### Step 7: Boss System Overhaul
- [ ] Create Emperor Boss entity structure
- [ ] Implement boss spawning AFTER bases destroyed
- [ ] Implement boss ability pool (attack only)
- [ ] Implement creature/guard wave spawning
- [ ] Implement spawn point system
- [ ] Implement respawn wave limits (30 max)
- [ ] Add boss health bar UI
- [ ] Add boss destruction handling

### Step 8: Testing & Balancing
- [ ] Test Emperor achievement
- [ ] Test dethronement edge cases
- [ ] Test Crown carrying mechanics
- [ ] Test Crown Guard behavior
- [ ] Test Boss spawning & combat
- [ ] Balance boss difficulty
- [ ] Verify non-Emperor gameplay unaffected

---

## Key Safeguards

1. **Mode Isolation**: All Emperor-specific code gated by `state.gameMode === 'emperor'`
2. **Rollback System**: Dethronement restores all systems to normal
3. **Testing Checkpoints**: Test each phase in isolation before integration
4. **State Reset**: Clear all Emperor state on campaign reset
5. **Backwards Compatibility**: Non-Emperor gameplay unchanged

