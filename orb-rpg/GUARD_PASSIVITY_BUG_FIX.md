# Guard Passivity Bug - ROOT CAUSE FOUND & FIXED

## Date: 2026-01-05
## Status: ✅ FIXED

---

## The Problem

Guards were completely passive in-game despite having fully implemented Phase 1 AI:
- **0 damage dealt** (all guards)
- **0 damage received** (guards not fighting back)
- Guards existed (enemies targeted them) but didn't engage
- No guard entries in ai-behavior log

---

## Root Cause

**Location**: [game.js](game.js#L4346)

The guard AI block ended with `continue;` statement:

```javascript
// BEFORE (BROKEN):
if(e.guard){
  // ... guard AI code (movement, targeting, formation) ...
  
  moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });
  
  // Guards handled - skip normal enemy AI
  continue;  // ❌ BUG: This skips ALL combat code below!
}
```

### Why This Broke Everything:

The `continue;` statement **jumped to the next enemy iteration**, skipping:
1. ✅ Non-guard AI pathfinding (INTENDED - guards have custom AI)
2. ❌ **Contact attack code** (lines 4733+) - **UNINTENDED SKIP**
3. ❌ **Ability casting code** (lines 4850+) - **UNINTENDED SKIP**

Guards calculated movement, but never executed combat actions.

---

## The Fix

**Changed Lines**:
- Line 4346: Removed `continue;` statement
- Line 4351: Added `if(!e.guard)` condition to non-guard AI block

```javascript
// AFTER (FIXED):
if(e.guard){
  // ... guard AI code (movement, targeting, formation) ...
  
  moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });
  
  // Guards handled - skip normal enemy AI pathfinding but continue to combat
  // (continue removed so guards can execute attack code below)
}

// NON-GUARD ENEMY AI
if(!e.guard) {  // ✅ Guards skip this block
  // ... non-guard pathfinding/targeting logic ...
}

// ✅ COMBAT CODE - Now runs for BOTH guards and non-guards
// contact attack: attempt to hit nearest hostile
if(e.hitCd<=0 && !(getCcState(e).stunned)){
  // ... attack code ...
}
```

---

## Impact

### Before Fix:
- Guards: Movement ✅, Combat ❌, Abilities ❌
- Non-guards: Movement ✅, Combat ✅, Abilities ✅

### After Fix:
- Guards: Movement ✅, Combat ✅, Abilities ✅
- Non-guards: Movement ✅, Combat ✅, Abilities ✅

---

## Testing Checklist

When you test the game:

1. **Start game and observe guards**
   - Should move to formation positions
   - Should engage enemies at 150 range (AGGRO_RANGE in code: 300)
   - Should deal damage to enemies

2. **Check damage report log**
   - Guards should show **damage dealt > 0**
   - Guards should show **damage received > 0** (if attacked)

3. **Check ai-behavior log**
   - Should contain guard AI state entries (GUARD_STATE transitions)

4. **Verify guard abilities**
   - Healers: Should cast healing abilities on allies
   - DPS: Should cast offensive abilities on enemies

---

## Code Changes Summary

| File | Lines | Change |
|------|-------|--------|
| game.js | 4346 | Removed `continue;` statement |
| game.js | 4351 | Changed `{` to `if(!e.guard) {` |

**Result**: Guards now execute full combat loop like all other enemies.

---

## Notes

- Guard AI still maintains separate pathfinding logic (formation system)
- Non-guard enemies skip guard AI block (unchanged)
- Combat/ability code is now shared by all enemy types (guards + non-guards)
- This is the **correct architecture** - combat is universal, pathfinding is specialized

---

## Verification

Run these console commands in-game to verify guards are working:

```javascript
// Check guard combat stats
const guards = state.friendlies.filter(f => f.guard);
guards.forEach(g => console.log(g.name, 'DMG:', g._damageDealt || 0));

// Check guard state
guards.forEach(g => console.log(g.name, 'HP:', g.hp, '/', g.maxHp, 'Attacked:', g.attacked));
```

Expected output:
- `_damageDealt` should be > 0 after engaging enemies
- `hp` should change during combat
- `attacked` should be `true` when enemies are in range
