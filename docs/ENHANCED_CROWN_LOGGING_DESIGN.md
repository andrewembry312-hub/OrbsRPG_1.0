# Enhanced Crown Debug Logging - Design & Implementation

## Overview

Added comprehensive logging to catch crown coordinate space and linkage issues instantly, rather than discovering them through gameplay. The logging system enforces the principle: **"If the crown is in the wrong place, the log will prove it before you play."**

---

## Four New Event Types

### 1. **CROWN_SPAWNED** (On Emperor activation)

**When:** Each crown spawns (3 events, one per team, at emperor match start)

**What it logs:**
```javascript
{
  team: 'teamA',
  crownId: 'crown_123',
  crownRaw: { x: 450.5, y: 320.2, r: 18 },
  baseId: 'site_base_a',
  baseName: 'Red Base',
  basePos: { x: 450, y: 320 },
  distanceFromBase: 0.8,  // Should be ~0, means distance check worked
  sourceCollections: {
    crown: 'state.emperor.crowns[team]',
    base: 'findTeamBaseSite(state, team)'
  }
}
```

**Why:** Proves:
- Crown spawned at correct coordinates
- Base lookup succeeded and found correct site
- Distance calculation works (should be ~0 or <1px)
- Crown and base are talking the same coordinate space

**Red flags to watch:**
- `distanceFromBase: 1800` → coordinate mismatch
- `baseId: null` → base not found (broken site mapping)
- `crownRaw.x/y` doesn't match `basePos` → spawn position wrong

---

### 2. **BASE_ASSIGNMENT_SNAPSHOT** (Once per match)

**When:** Immediately after emperor activation (3 crowns and bases assigned)

**What it logs:**
```javascript
{
  assignments: [
    {
      team: 'teamA',
      baseId: 'site_base_a',
      baseName: 'Red Base',
      basePos: { x: 450, y: 320 },
      crownId: 'crown_123',
      crownPresent: true,
      distanceSpawned: 0.8
    },
    // ... same for teamB, teamC
  ],
  sitesTotal: 10,
  sitesInGameSpace: 7,  // Should be > 0 and reasonable
  crownsTotal: 3,
  sourceCollections: {
    bases: 'state.sites',
    crowns: 'state.emperor.crowns'
  }
}
```

**Why:** One-shot snapshot that proves:
- All 3 teams have bases
- All 3 crowns exist
- Team-to-base mapping is correct
- Sites in game space vs stale sites

**Red flags:**
- `sitesInGameSpace: 0` → all sites in wrong coordinate space
- `crownsTotal: 0` → spawn failed
- `baseId: null` for any team → team has no base

---

### 3. **CROWN_PICKUP_ATTEMPT** (Every frame player is within 150px)

**When:** Player approaches crown (call happens at 150px range)

**What it logs:**
```javascript
{
  team: 'teamA',
  crownId: 'crown_123',
  playerPos: { x: 600, y: 450 },
  crownPos: { x: 450, y: 320 },
  distance: 187.3,  // Actual calculated distance
  pickupRadius: 150,
  withinRange: false,  // True if distance <= radius
  eligibility: {
    isEmperorActive: true,
    playerCarryingMax: false,
    crownCarriedBy: null,
    crownLocked: false,
    canPickup: true
  }
}
```

**Why:** Instant diagnosis of:
- Distance calculation (if distance doesn't match visual position, coords are wrong)
- Eligibility (is emperor active? is crown locked? etc.)
- Attempt history (when did player get close? how many times?)

**Red flags:**
- `distance: 1800` but player looks 100px away → coordinate mismatch
- `withinRange: false` but distance shows 40px → calculation bug
- `canPickup: false` with reason → explains why pickup blocked

---

### 4. **CROWN_PICKUP_BLOCKED** (When pickup fails for any reason)

**When:** Player is within range but pickup didn't happen

**What it logs:**
```javascript
{
  team: 'teamA',
  crownId: 'crown_123',
  playerPos: { x: 600, y: 450 },
  crownPos: { x: 450, y: 320 },
  distance: 187.3,
  blockedReason: 'OUT_OF_RANGE',  // or 'EMPEROR_INACTIVE', 'ALREADY_CARRYING', 'LOCKED', etc.
  crownState: {
    carriedBy: null,
    secured: false
  }
}
```

**Why:** Explains every case where pickup didn't happen

---

### 5. **COORD_SANITY_SNAPSHOT** (Optional, on failed pickup)

**When:** Pickup fails and distance looks wrong

**What it logs:**
```javascript
{
  playerWorldPos: { x: 600, y: 450 },
  crownWorldPos: { x: 450, y: 320 },
  distanceCalculated: 187.3,
  context: 'Pickup failed, distance seems wrong',
  sourceCollections: {
    player: 'state.player',
    crown: 'state.emperor.crowns[team]'
  }
}
```

**Why:** Lets you verify calculated distance matches visual distance

---

## Validation: carriedCrowns Array Integrity

**When:** Every 30 ticks in debug mode (if enabled)

**What it checks:**
1. Every crown with `carriedBy === 'player'` must be in `state.emperor.carriedCrowns`
2. Every team in `carriedCrowns` array must have `carriedBy === 'player'`

**If mismatch found:**
- Logs `CROWN_CARRY_DESYNC` event with all mismatches
- Auto-fixes array: rebuilds it from crown objects
- Logs `CROWN_CARRY_REBUILT` showing what was fixed

**Why:** Prevents the array from drifting and becoming phantom HUD state

---

## How to Use the Logs

### Scenario 1: "Crown never picks up"

**Check logs in order:**

1. **CROWN_SPAWNED** - Did crown spawn at base?
   - If `distanceFromBase: 1800` → **coordinate space mismatch** (your bug)
   - If `baseId: null` → **base not found** (team->base linkage broken)

2. **BASE_ASSIGNMENT_SNAPSHOT** - Are all teams assigned?
   - If any `baseId: null` → check `sitesInGameSpace`
   - If `sitesInGameSpace: 0` → **all sites in stale coordinate space** (the smoking gun)

3. **CROWN_PICKUP_ATTEMPT** - Does player get close?
   - If logs exist → player gets in range
   - If `distance: 1800` but player looks close → **coordinate calc bug**
   - If no logs → player never gets within 150px

4. **CROWN_PICKUP_BLOCKED** - Why was pickup blocked?
   - Shows exact reason: `EMPEROR_INACTIVE`, `ALREADY_CARRYING`, `LOCKED`, etc.

### Scenario 2: "Crown is in wrong spot on screen"

1. **CROWN_SPAWNED** - Where did it spawn?
   - Compare `crownRaw.x/y` with `basePos` 
   - If different → spawn position wrong

2. **COORD_SANITY_SNAPSHOT** - Does distance match visuals?
   - Calculate visual distance (pixels on screen)
   - Compare with logged `distanceCalculated`
   - If mismatch → **camera math or scale problem**

### Scenario 3: "HUD shows I'm carrying crowns but I'm not"

1. **CROWN_CARRY_DESYNC** - Array is out of sync
   - Shows what crowns are marked as carried
   - Shows what actually has `carriedBy === 'player'`
   - Auto-fixes and logs `CROWN_CARRY_REBUILT`

---

## Implementation Details

### New Functions in crown-debug.js

```javascript
// Spawn logging (with base lookup)
export function logCrownSpawned(state, team, crownId, crown, base)

// One-time base snapshot
export function logBaseAssignmentSnapshot(state)

// Pickup attempt (call at 150px range)
export function logCrownPickupAttempt(state, team, crown, player, distance, pickupRadius)

// Pickup failure (call when in range but didn't pick up)
export function logCrownPickupBlocked(state, team, crown, player, distance, reason)

// Coordinate verification
export function logCoordSanitySnapshot(state, player, crown, distCalc, context)

// Array validation (call periodically, auto-fixes if needed)
export function validateCarriedCrownsArray(state)
```

### Calls Added to game.js

1. **spawnCrowns()** - Call `logCrownSpawned(state, team, crown.id, crown, base)` after creating crown
2. **Emperor activation** - Call `logBaseAssignmentSnapshot(state)` after `unlockCrowns()`
3. **tryPickupCrowns()** - Call `logCrownPickupAttempt()` when `dist <= 150px`, and `logCrownPickupBlocked()` on failure
4. **updateGame()** - Call `validateCarriedCrownsArray()` every 30 ticks in debug mode

---

## Key Design Principle

**Source of truth for carriedCrowns:**
- The **crown objects** are the source of truth (`crown.carriedBy === 'player'`)
- The **array** is a cache for performance
- Validation rebuilds the array from crown objects if they diverge
- Log both the desync AND the fix (so you see what went wrong)

---

## Export and Analysis

When you export the crown debug log, you get:
- All spawn events (prove coordinate space health)
- Base assignment snapshot (prove team->base mapping)
- All pickup attempts (prove distance calculations)
- All pickup blocks (prove why pickup failed)
- Validation events (prove array stayed honest)

Then you can grep for:
- `"distance": 1800` → coordinate mismatch
- `"baseId": null` → missing base
- `"withinRange": false` → range check failing
- `"COORD_SANITY_SNAPSHOT"` → verify distance vs visuals
- `"CROWN_CARRY_DESYNC"` → array got out of sync

---

## Testing

To test the logging:

1. **Enable crown debug** in UI (checkbox on options)
2. **Play emperor mode** 
3. **Walk near a crown** - should see CROWN_PICKUP_ATTEMPT events
4. **Pick up crown** - should see successful pickup in log
5. **Export log** from debug panel
6. **Search for red flags** in exported JSON

If crown never picks up:
- Search for `CROWN_SPAWNED` → check distance from base
- Search for `BASE_ASSIGNMENT_SNAPSHOT` → check all teams assigned
- Search for `CROWN_PICKUP_ATTEMPT` → check if player gets in range
- Search for `CROWN_PICKUP_BLOCKED` → check why blocked
- Search for distance `1800` → check for coordinate mismatch

---

## Performance Note

**No performance hit when debug is disabled.**

All logging functions check `if (!state.crownDebug || !state.crownDebug.enabled) return;` at the top, so:
- Disabled = zero CPU cost
- Validation runs every 30 ticks only (not every frame)
- Event object creation only when enabled

When enabled, creates ~50-100 log events per crown pickup attempt, which is fine for debugging.
