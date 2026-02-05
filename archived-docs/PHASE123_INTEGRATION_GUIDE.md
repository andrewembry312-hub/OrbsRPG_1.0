# Phase 1, 2, 3 Integration Guide

## What You Have Now

Three diagnostic/audit systems ready to use:

- **coordinate-sanity.js**: Proves/disproves coordinate space mismatch
- **hp-audit.js**: Central pipeline for every HP change (already created)
- **crown-debug.js**: Toggleable logging for crown behavior (already created)

---

## PHASE 1 (RIGHT NOW): Prove the Coordinate Bug

**Action**: Run these two commands in your browser console while the game is running:

```javascript
// Paste this and run immediately
(()=>{
  const result = { 
    sanity: debugCoordSanity(state), 
    ranges: debugCoordRanges(state) 
  };
  console.table(result.sanity);
  console.table(result.ranges);
  return result;
})()
```

**Screenshot the output.** This tells us:

- **If `dEF` is 3000+**: Coordinates are in different spaces ✅ MISMATCH CONFIRMED
- **If `dEF` is reasonable** (30–500): Maybe not a coordinate issue, might be distance calculation itself
- **If ranges differ a lot** (enemies 0–5000, flags 0–1000): Which pipeline is wrong

**This is the blocker.** Until we know which space is wrong, everything else is guessing.

---

## PHASE 2: Wire HP Audit (One Place First)

The `hp-audit.js` module is already created. You need to:

### Step 1: Import it in game.js

At the top of game.js:
```javascript
import { auditHpDelta, auditHeal, auditDamage, auditHpSet, getHpAuditLog } from './hp-audit.js';
```

### Step 2: Find the lowest-level HP application function

This is the function that applies damage/heal to an entity. Look for something like:

```javascript
function applyDamage(target, amount) {
  target.hp -= amount;  // ← Find this line (or similar)
}

function applyHeal(target, amount) {
  target.hp += amount;  // ← Find this line (or similar)
}
```

Or, if HP changes are scattered, find the **single most common place** where `target.hp +=` or `target.hp -=` happens.

### Step 3: Replace with audit wrapper

**BEFORE:**
```javascript
target.hp -= 25;  // damage
target.hp += 50;  // heal
```

**AFTER:**
```javascript
auditDamage(state, target, 25, { sourceId: 'ability_name', reason: 'meteor' });
auditHeal(state, target, 50, { sourceId: 'healer_id', reason: 'heal_burst' });
```

### Step 4: Test from console

Turn on auditing:
```javascript
state._hpAudit.enabled = true;
```

Run a fight for 10 seconds.

Check the log:
```javascript
getHpAuditLog(state)
```

**What you're looking for**: The `summary.largeJumps` array. If it shows jumps like `1808`, that's where the mystery HP comes from, and the `reason` field tells you which code path did it.

---

## PHASE 3: Wire Crown Debug (Four Call Sites)

The `crown-debug.js` module is ready. You need to:

### Step 1: Import it

```javascript
import { logCrownState, logGuardCrownChase, logGuardAbilityTarget, getCrownDebugLog } from './crown-debug.js';
```

### Step 2: Add four logging calls

**Location A: Crown Pickup**
Find where crown is picked up (`carriedBy = 'player'` or assigned):
```javascript
// Right after you set carriedBy:
logCrownState(state, 'PICKUP');
```

**Location B: Crown Drop**
Find where crown is dropped (on death, or dropped by player):
```javascript
// Right after you clear carriedBy:
logCrownState(state, 'DROP');
```

**Location C: Guard Chase Detection (in updateEnemies)**
Find the block that checks if `e.crownTeam` and sets `e._isChasingCrown = true`:
```javascript
if (crownCarriedByPlayer) {
  e._isChasingCrown = true;
  e._crownForcedTarget = isDps ? state.player : null;
  
  // RIGHT HERE:
  logGuardCrownChase(state, e, 'CHASE_ACTIVATED');
}
```

**Location D: Ability Targeting (in npcUpdateAbilities)**
Find the block where you override `target` for forced crown targeting:
```javascript
// After your forced override block runs:
if (isDps && u._crownForcedTarget && forcedAlive) {
  target = u._crownForcedTarget;
  bestD = Math.hypot((target.x||0)-u.x, (target.y||0)-u.y);
  
  // RIGHT HERE:
  logGuardAbilityTarget(state, u, target, bestD, { overrideApplied: true });
}
```

### Step 3: Test from console

Turn on crown debug:
```javascript
state._crownDebug.enabled = true;
```

Pick up crown. Watch console.

Get the full log:
```javascript
getCrownDebugLog(state)
```

**What you're looking for**:
- `CROWN_STATE` events show `isPlayer: true` when you're carrying
- `GUARD_CHASE` events show `chasing: true, forced: true` when guards detect you
- `GUARD_ABILITY` events show `isForcedTarget: true` when guards target you

If any of these are missing or false, that's your smoking gun.

---

## How to Use (Quick Reference)

**Turn on coordinate diagnostics:**
```javascript
// Paste into console once:
const coordDiag = (() => {
  if (window.debugCoordSanity) {
    return { sanity: debugCoordSanity(state), ranges: debugCoordRanges(state) };
  }
  console.warn('coordinate-sanity.js not imported yet');
})();
console.table(coordDiag.sanity);
console.table(coordDiag.ranges);
```

**Turn on HP audit:**
```javascript
state._hpAudit.enabled = true;
// Play for 10 seconds
// Then:
console.table(getHpAuditLog(state).summary);
```

**Turn on crown debug:**
```javascript
state._crownDebug.enabled = true;
// Pick up crown, hold it, drop it
// Then:
console.table(getCrownDebugLog(state).summary);
getCrownDebugLog(state).events.slice(-20);  // Last 20 events
```

---

## What to Report Back

Once you've run **Phase 1** (coordinate diagnostics), paste this:

```javascript
debugCoordSanity(state)
debugCoordRanges(state)
```

Output both as tables/objects. That tells us **exactly** what's wrong, and then Phase 2 and 3 make sense for validating the fixes.

---

## Why This Order

1. **Coordinates must be fixed first** — All distance-based logic (AI targeting, ability range, pathfinding) depends on correct distances
2. **HP audit second** — Once coordinates are fixed, we can confirm healing/damage is working
3. **Crown debug last** — Once HP is right, we can validate crown system is actually firing

If coordinates are wrong, the crown system will look broken even if it's wired correctly (distances all wrong, abilities out of range, etc.).

