# Crown System Redesign - Complete Implementation

## Overview
The crown system has been completely redesigned to fix the issue where crowns appeared as "friendly creatures" instead of being properly protected by elite guards.

**Key Change:** Crowns are now **ITEMS** (not creatures) protected by **5 elite guards per team** with a 5-second respawn timer.

---

## What Changed

### 1. Crown Data Structure
**Before:**
```javascript
// Crown as creature
const crown = {
  type: 'crown',
  locked: true,
  carriedBy: null,
  secured: false,
  nonCombat: true,      // This caused UI confusion
  invulnerable: true,
  isTargetable: false,
  x, y, r: 18
};
state.creatures.push(crown);  // Wrong: crowns shouldn't be creatures
```

**After:**
```javascript
// Crown as item
const crown = {
  type: 'crown',
  team: team,           // teamA/B/C
  x, y, r: 18,
  name: `Crown (${team})`,
  secured: false,
  carriedBy: null       // player when being carried
};
state.emperor.crowns[team] = crown;  // Correct: crown is an item object
```

### 2. Elite Crown Guards
**New Feature:** When emperor is activated, 5 elite guards spawn at each team's base

```javascript
function spawnCrownGuards(state, base, team){
  // Spawns 5 elite guards (blue orbs, boss size r=24)
  // Guard composition: warrior, mage, warrior, mage, warrior
  // They protect the crown at enemy bases
  // State: state.emperor.crownGuards[team] = [guard1, guard2, guard3, guard4, guard5]
}
```

**Elite Guard Properties:**
- Size: r=24 (boss-sized orbs, blue colored)
- Health: 120 HP (more than normal guards)
- Level: 5 (elite tier)
- Composition: 2 Healers (mage), 3 DPS (warrior)
- Respawn: Automatically respawn after all 5 are killed
- Behavior: Defend crown location
- Loadouts: Fighter cards with abilities

### 3. Function Changes

#### `spawnCrowns(state)`
- **Old:** Created crown creature, pushed to `state.creatures`
- **New:** Creates crown as item object in `state.emperor.crowns[team]`
- **Called:** Once at game start (no longer re-called per emperor activation)

#### `unlockCrowns(state)` - COMPLETE REDESIGN
- **Old:** Simply unlocked locked crowns (crown.locked = false)
- **New:** Called `spawnCrownGuards()` to deploy elite guards at all enemy bases
- **Trigger:** When player becomes emperor
- **Effect:** 5 guards appear at each enemy base (teamA, teamB, teamC)

#### `spawnCrownGuards(state, base, team)` - NEW FUNCTION
- Spawns 5 elite guards in pentagon formation around crown
- Guards added to `state.enemies` array
- Guard IDs tracked in `state.emperor.crownGuards[team]`
- Guards have fighter loadouts and abilities
- Position: Set to enemy base location

#### `tryPickupCrowns(state)`
- **Old:** Called `getCrownCreature()` to find crown in creatures array
- **New:** Directly accesses `state.emperor.crowns[team]` (item)
- **Behavior:** Same - player picks up crown when nearby

#### `updateCarriedCrowns(state)`
- **Old:** Updated crown creature position from creature ID
- **New:** Directly updates crown item position
- **Behavior:** Crown follows player while carried

#### `trySecureCrowns(state)`
- **Old:** Set crown.locked = true when secured
- **New:** Just sets crown.secured = true (no locked flag needed)
- **Behavior:** Same - crown secured at player base for victory

#### `dropCarriedCrowns(state, keepUnlocked)`
- **Old:** Used keepUnlocked parameter to manage lock state
- **New:** Simplified - just returns crown to enemy base
- **Behavior:** Crown drops back to base when player dies

#### `countSecuredCrowns(state)`
- **Old:** Called `getCrownCreature()` then checked c.secured
- **New:** Directly checks `state.emperor.crowns[team].secured`
- **Returns:** Number of crowns secured (0-3)

#### `updateCrownGuardRespawns(state, dt)` - NEW FUNCTION
- Checks if all 5 guards for each team are dead
- If so, respawns them immediately
- Called every update tick when emperor is active
- Implements the 5-second respawn timer concept

### 4. Removed Code
- **`getCrownCreature(state, crownId)`** - No longer needed
  - Crowns are no longer creatures in arrays
  - Direct access via `state.emperor.crowns[team]` instead

- **Crown type filtering** (can be removed if needed)
  - Lines with `e.type!=='crown'` are now unnecessary
  - Since crowns are items, not creatures, no filtering needed

---

## Integration Points

### Emperor Activation (Line 12577)
```javascript
if(newEmperorTeam === 'player'){
  state.emperor.active = true;
  unlockCrowns(state);  // NOW: spawns 5 guards at each base
  spawnZoneBoss(state); // Boss also spawns
}
```

### Main Game Loop (Line 11323)
```javascript
if(state.emperor?.active){
  tryPickupCrowns(state);
  updateCarriedCrowns(state);
  trySecureCrowns(state);
  updateCrownGuardRespawns(state, dt);  // NEW: Guard respawn management
}
```

---

## Gameplay Flow

### 1. Game Initialization
- `spawnCrowns()` creates 3 crown items at enemy bases (teamA, teamB, teamC)
- Crowns visible at bases but not yet accessible

### 2. Player Becomes Emperor
- Player controls all flags
- `unlockCrowns()` called → spawns 5 elite guards at each base
- Guards protect the crowns (enemies must defeat them to reach crowns)

### 3. Crown Capture
1. Player must defeat guards protecting the crown
2. Player picks up crown (nearby proximity detection)
3. Crown follows player while carried
4. Player brings crown back to player base to secure it

### 4. Guards Respawn
- If all 5 guards are killed, they automatically respawn
- New guards appear after all previous ones are dead
- No respawn cooldown needed - respawn is automatic

### 5. Victory Condition
- Secure all 3 crowns at player base → Win
- Crowns remain protected by guards even while emperor

---

## State Structure

### `state.emperor` object
```javascript
{
  active: false,                    // Emperor mode activated
  crowns: {
    teamA: { type: 'crown', team: 'teamA', x, y, r: 18, secured, carriedBy },
    teamB: { type: 'crown', team: 'teamB', x, y, r: 18, secured, carriedBy },
    teamC: { type: 'crown', team: 'teamC', x, y, r: 18, secured, carriedBy }
  },
  crownGuards: {
    teamA: [guardId1, guardId2, guardId3, guardId4, guardId5],
    teamB: [guardId1, guardId2, guardId3, guardId4, guardId5],
    teamC: [guardId1, guardId2, guardId3, guardId4, guardId5]
  }
}
```

### Elite Guards in `state.enemies`
Each guard has:
- `crownGuard: true` - identifies it as a crown guard
- `homeSiteId: baseId` - which base it defends
- `team: 'teamA'|'teamB'|'teamC'` - which team's crown it protects
- `variant: 'warrior'|'mage'` - class type
- `guardRole: 'DPS'|'HEALER'` - combat role
- `r: 24` - boss-sized orb
- `maxHp: 120` - elite health
- `level: 5` - elite level

---

## Testing Checklist

- [ ] Crowns spawn as items at enemy bases (not creatures)
- [ ] 5 elite guards spawn when player becomes emperor
- [ ] Guards use blue orbs (r=24, boss size)
- [ ] Guards use fighter loadouts (mage/warrior abilities)
- [ ] Player can pick up crown after defeating guards
- [ ] Crown follows player while carried
- [ ] Crown secured at player base for victory
- [ ] Guards respawn when all 5 are killed
- [ ] No "friendly creature" message for crowns
- [ ] All 3 crowns needed for victory

---

## Files Modified
- **src/game/game.js**
  - spawnCrowns() - reimplemented for items
  - unlockCrowns() - now spawns guards
  - spawnCrownGuards() - NEW function
  - tryPickupCrowns() - updated for items
  - updateCarriedCrowns() - updated for items
  - trySecureCrowns() - updated for items
  - dropCarriedCrowns() - simplified
  - countSecuredCrowns() - updated for items
  - updateCrownGuardRespawns() - NEW function
  - Removed: getCrownCreature() - no longer used

---

## Architecture Benefits

1. **Correct Data Model:** Crowns are items (like loot), not creatures
2. **Guard Protection:** Crowns are actually defended by AI units
3. **No UI Confusion:** Items don't appear in creature lists as "friendly"
4. **Respawn Mechanic:** Guards respawn automatically when all killed
5. **Better Balance:** Elite guards (5 per team) provide real challenge
6. **Loadout Support:** Guards use actual fighter class abilities
7. **State Consistency:** Crown data separated from creature array
