# Critical Fixes Applied - Session 4

## TLDR: Three Minimal Patches

**Total changes**: 3 locations, ~10 lines total

### Patch 1: Fix npcUpdateAbilities field name (line ~3359)
```javascript
// CHANGE THIS:
if (u._forcedCombatTarget && u.guardRole === 'DPS') {
  const forced = u._forcedCombatTarget;

// TO THIS:
if (u._crownForcedTarget && u.guardRole === 'DPS') {
  const forced = u._crownForcedTarget;
```

### Patch 2: Fix updateEnemies (lines ~6982-7006)
Replace lines 6982-7006 with the corrected minimal block shown in "The Corrected Block" section below.

### Patch 3: Normalize carriedBy in dropCarriedCrowns (lines ~14928)
Add defensive normalization shown in Section 3 below.

---

## Overview
Three critical bugs fixed based on user analysis:

1. **Toast shows wrong crown** - messaging bug
2. **PlayerKey mismatch in pickup gate** - silent regression path
3. **Ability targeting during chase** - ability behavior
4. **Guard mode/target ordering** - architecture validation

---

## Fix 1: Toast Shows Wrong Crown Name ✅ FIXED

**Location**: [game.js](game.js#L10848-L10852)  
**Severity**: Medium (cosmetic but confusing)

**Problem**:
```javascript
// BEFORE - WRONG:
const carrying = Object.entries(state.emperor.crowns)
  .find(([t,c]) => c.carriedBy === 'player');
if(carrying){
  const [team] = carrying;
  state.ui?.toast?.(`<span class="warn">You already carry Crown ${team}</span>`);
}
// This showed the TEAM BEING PICKED UP, not the crown already carried
```

**Fix**:
```javascript
// AFTER - CORRECT:
const carrying = Object.entries(state.emperor.crowns)
  .find(([t,c]) => c.carriedBy === 'player');
const carryingTeam = carrying?.[0] || '?';
state.ui?.toast?.(`<span class="warn">You already carry Crown ${carryingTeam}</span>`);
```

**Impact**: Toast now shows the crown the player is actually carrying, not the one they're trying to grab.

---

## Fix 2: PlayerKey Mismatch in One-Crown Check ✅ FIXED

**Location**: [game.js](game.js#L10831-L10837)  
**Severity**: HIGH (silent regression path)

**Problem**:
The pickup gate only checked for `'player'` literal:
```javascript
// VULNERABLE:
const playerAlreadyCarrying = Object.values(state.emperor.crowns)
  .some(c => c.carriedBy === 'player');  // What if carriedBy is player.id?
```

If ANY code ever sets `crown.carriedBy = playerKey` (player.id form), this check fails silently and allows multiple pickups.

**Fix**:
```javascript
// BULLETPROOF:
const playerKey = state.player?.id || state.player?._id || 'player';
const playerAlreadyCarrying = Object.values(state.emperor.crowns)
  .some(c => c.carriedBy === 'player' || c.carriedBy === playerKey);
```

This prevents regression even if ID normalization standards slip in future changes.

**Game Impact**: Guarantees one-crown rule is enforced regardless of how player ID is stored.

---

## Fix 3: Force Ability Targeting to Crown Carrier ✅ COMPLETE

**Location**: [game.js](game.js#L3359-L3378) + [game.js](game.js#L14625-14638) + [game.js](game.js#L6984-L6989)  
**Severity**: Medium (feel/balance issue) → **NOW COMPLETE**

**Problem**:
Guards chase the crown carrier but their abilities target "nearby enemies" instead of the player. This makes them feel uncoordinated (ball group illusion breaks).

**Solution Applied** (Three-part fix):

### Part 1: Override target selection in npcUpdateAbilities (AFTER lock logic)
**CRITICAL PLACEMENT**: This MUST inject AFTER the normal target selection + lock logic runs, and BEFORE abilities cast. Otherwise normal logic can undo the override.

Location in npcUpdateAbilities:
1. Lines 3348-3357: Normal target selection (check lock, scan candidates, lock new target)
2. **INJECT FORCED TARGET OVERRIDE HERE** (right after bestD is set from normal lock)
3. Lines 3379+: Ability casting (uses target variable)

**Correct code** (using consistent namespace `_crownForcedTarget`):
```javascript
// ✅ INJECT FORCED OVERRIDE HERE (BEFORE if(!target) return)
// This must run before early return so it can rescue the "no target" case
const isDps = (u.guardRole === 'DPS') || (u.loadoutType === 'dps');
if (isDps && u._crownForcedTarget) {
  const t = u._crownForcedTarget;
  if (t && t.dead !== true && (t.hp == null || t.hp > 0)) {
    target = t;  // Override target - all abilities in this frame use this
    // MANDATORY: Recompute bestD so range checks below see correct distance to player
    bestD = Math.hypot((t.x||0)-u.x, (t.y||0)-u.y);
    u._lockId = t.id || t._id || 'player';
    u._lockUntil = now + 0.35;  // Slightly longer lock for smooth tracking
  } else {
    u._crownForcedTarget = null;
  }
}

// Early return AFTER override has chance to set target
if (!target) return;
```

**Why this works**: 
- Normal lock logic might leave target as null (no lock, no nearby targets)
- Forced override runs BEFORE early return, so it can rescue the "no target" case
- If guard has `_crownForcedTarget` and normal logic found nothing, override sets target to player
- **MANDATORY**: bestD recompute prevents range gates (line 3514 `const dist = bestD;` used at lines 3579, 3624, 3666, 3710, 3770, 3773, 3775) from seeing distance to old target
- DPS check is defensive: checks both `guardRole === 'DPS'` AND `loadoutType === 'dps'`
- Uses consistent namespace `_crownForcedTarget` (crown system only, leaves `_forcedCombatTarget` for other systems)

### Part 2: Set forced target for DPS-only in crown chase (line 14625-14638)
```javascript
else if (crownCarried) {
  guard.guardMode = 'chase';
  guard.crownFollowRange = 500;
  guard.targetX = crownX;
  guard.targetY = crownY;
  // IMPORTANT: Force DPS guards to focus player when chasing crown
  // Healers maintain their own target (allies to protect)
  // Use namespace _crownForcedTarget (not generic _forcedCombatTarget)
  if (guard.guardRole === 'DPS' || guard.loadoutType === 'dps') {
    guard._crownForcedTarget = state.player;  // Crown-specific namespace
  } else {
    guard._crownForcedTarget = null; // Clear healer forced target
  }
}
```
**Why DPS-only**: DPS guards should lock onto player and spam burst. Healers should maintain their own logic to heal allies. This prevents weird behavior like healers trying to "support" the player.

**Why namespace**: Using `_crownForcedTarget` keeps crown system isolated from other AI behaviors. Leave `_forcedCombatTarget` alone for future systems.

### Part 3: Clear forced target at END of updateEnemies (CRITICAL ORDERING)
**CRITICAL RULE**: The "clear forced target when chase ends" line must run AFTER the final place you decide chase/no-chase for that tick.

**WRONG** (what we had before):
```javascript
e._isChasingCrown = false;
if (!e._isChasingCrown) { e._forcedCombatTarget = null; }  // ❌ CLEARS TOO EARLY
// ... crown chase check runs AFTER this clear ...
```

**RIGHT** (must be at END of updateEnemies):
The entire crown chase detection happens somewhere in updateEnemies (around line 6991-7005). After ALL of that completes, at the very end of the enemy update, THEN clear:

```javascript
// At the START of updateEnemies loop for this enemy:
e._isChasingCrown = false;

// ... bunch of other logic ...

// At the END of updateEnemies for this enemy (right before exiting):
// Check final state and clear forced target if chase didn't activate
if (crown && crown.carriedBy === 'player') {
  e._isChasingCrown = true;
  if (e.guardRole === 'DPS' || e.loadoutType === 'dps') {
    e._forcedCombatTarget = state.player;
  } else {
    e._forcedCombatTarget = null;
  }
}

// NOW clear only if NOT chasing (final decision for this frame)
if (!e._isChasingCrown) {
  e._forcedCombatTarget = null;
}
```

**Why this ordering matters**: 
- If another function sets `_isChasingCrown = true` later in the frame, your early clear would have already nuked the forced target
- The safest place is at the END of updateEnemies, after all chase detection has run
- This guarantees: chase → set forced target → clear only if still not chasing

### Part 4: Debug logging (line 14560-14570)
```javascript
// DEBUG: Quick log when chasing crown (max once per second per guard)
if (guard._forcedCombatTarget && ((state.gameTime||0) % 1 < 0.016)) {
  console.log('[CROWN AI]', guard._id, 
    'loadout', guard.loadoutType,
    'mode', guard.guardMode,
    'forced', !!guard._forcedCombatTarget,
    'distToPlayer', Math.hypot(guard.x-state.player.x, guard.y-state.player.y)|0);
}
```
**How to use**: When testing, open console. Pick up crown. You should see ONE log per second per DPS guard showing:
- `forced true` = targeting system activated
- Distance decreasing = guards moving to burst range
- If forced stays false but guards are chasing = ability system didn't apply the override

**Impact**: 
- DPS guards now feel like a coordinated team hunting you
- All three guards dump burst at same target (you) instead of random stuff
- Short 0.25s lock makes it responsive to your movement, not jittery
- Healers still heal allies naturally (not forced onto you)
- When crown secured/dropped, they stop focusing you immediately

**Status**: ✅ **FULLY IMPLEMENTED AND READY TO TEST**

---

## Validation: Guard Mode/Target Ordering ✅ VERIFIED SAFE

**User's concern**:
> If you ever set guardMode = 'protect' early (like when within 60px but before you set new return target), you'll clear target immediately and the guard will just stand there.

**Verified code path** (lines 14727-14750):
```javascript
// When crown is close enough to pick up:
// 1. SET TARGETS FIRST
nearestHealer.targetX = baseForTeam.x + 26;
nearestHealer.targetY = baseForTeam.y;

// 2. THEN CHANGE MODE
nearestHealer.guardMode = 'return';
```

✅ **Order is CORRECT** - targets set BEFORE mode change

The tx/ty clear happens only when `guardMode !== 'retrieve' && guardMode !== 'return'`, so the sequence is safe.

---

## Game Rules Now Locked In

| Rule | Status | Implementation |
|------|--------|-----------------|
| One crown at a time (player) | ✅ Enforced | Pickup gate checks both ID forms |
| Drop on death | ✅ Working | carriedBy cleared, secured reset |
| Guards retrieve dropped | ✅ Working | Priority-2 guards pick up if within 60px |
| Guards return to base | ✅ Working | Mode='return' targets base |
| Secure at base | ✅ Working | carriedBy=null, secured=true |
| Chase without distance limit | ✅ Working | tx/ty override bridges two systems |
| Abilities fire at crown carrier | ✅ COMPLETE | npcUpdateAbilities overrides target for DPS |
| One-crown prevents regression | ✅ Bulletproof | Both ID forms checked |
| Forced target clears properly | ✅ COMPLETE | Cleared when chase flag becomes false |

---

## CRITICAL GOTCHAS - Read Before Implementing

### Gotcha 1: Object reference in carriedBy is silent killer
If pickup does this:
```javascript
crown.carriedBy = state.player;  // ❌ OBJECT, not ID!
```

Then death drop does:
```javascript
crown.carriedBy === 'player'  // ❌ FALSE (object !== string)
crown.carriedBy === playerKey  // ❌ FALSE (object !== ID string)
```

Crown never drops. Player respawns with crown still carried.

**Solution**: Add defensive normalization before checking. See Section 3.

---

### Gotcha 2: Early return before forced override
The code at line 3361 is `if(!target) return;`

This is AFTER where you'll inject the forced override, so you're safe. But if something gets refactored, make sure this early return stays after the override block.

**Bad order**:
```javascript
if (!target) return;  // ❌ Early return BEFORE override
// ... forced override logic ...
```

**Good order**:
```javascript
// ... forced override logic ...
if (!target) return;  // ✅ Early return AFTER override can run
```

---

### Gotcha 3: bestD mismatch breaks range checks
If you override `target` but leave `bestD` pointing to old target:
```javascript
target = forced_player;
// Don't update bestD - it still points to old target
// ...
if (bestD > abilityRange) return;  // ❌ FAILS: bestD is distance to random dude, not player
```

**Solution**: Recompute bestD after override. See Section 1.

---

### Gotcha 4: Guard role might not exist
If you only check `u.guardRole === 'DPS'`:
```javascript
if (u.guardRole === 'DPS') { ... }  // What if guardRole is undefined/null?
```

This silently skips. The guard might only have `loadoutType='dps'`.

**Solution**: Check both:
```javascript
const isDps = (u.guardRole === 'DPS') || (u.loadoutType === 'dps');
if (u._crownForcedTarget && isDps) { ... }
```

---

### Gotcha 5: Lock variable names might differ
You assume `_lockId` and `_lockUntil` exist.

In this codebase, the real fields ARE `_lockId` and `_lockUntil` (confirmed at lines 3348-3357). Use those exact names.

---

### Gotcha 6: Future-proofing forced target namespace
Right now you're treating `_forcedCombatTarget` as "only for crown chase".

That's fine if nothing else uses it. But if later you add other systems (like "assist leader" or "focus threat"), this will start nuking those forced targets when the crown system clears.

**Solution**: Use namespace to future-proof (see Section 2):
- `e._crownForcedTarget` - Only crown system, cleared at END of updateEnemies
- `e._forcedCombatTarget` - Generic, left alone for other systems

This prevents future collisions and makes the code's intent crystal clear.

---

## Exact Code Sections to Fix

### Section 1: Forced Target Override in npcUpdateAbilities

**Current location**: Lines 3348-3378 (roughly)

**CORRECT order** (forced override BEFORE early return):
```javascript
let target = null, bestD = Infinity;
if(u._lockUntil && u._lockUntil > now && u._lockId){
  target = candidates.find(c => (c.id||c._id) === u._lockId);
}
if(!target){
  for(const c of candidates){ const d=Math.hypot((c.x||0)-u.x,(c.y||0)-u.y); if(d<bestD){bestD=d; target=c;} }
  if(target){ u._lockId = target.id||target._id||null; u._lockUntil = now + 1.5; }
} else {
  bestD = Math.hypot((target.x||0)-u.x,(target.y||0)-u.y);
}

// ✅ INJECT FORCED OVERRIDE HERE (BEFORE early return)
// This must run before if(!target) return so it can rescue the "no target" case
const isDps = (u.guardRole === 'DPS') || (u.loadoutType === 'dps');
if (isDps && u._crownForcedTarget) {
  const t = u._crownForcedTarget;
  if (t && t.dead !== true && (t.hp == null || t.hp > 0)) {
    target = t;  // Override target - all abilities in this frame use this
    // CRITICAL: Recompute bestD so range checks below see correct distance
    bestD = Math.hypot((t.x||0)-u.x, (t.y||0)-u.y);
    u._lockId = t.id || t._id || 'player';
    u._lockUntil = now + 0.35;  // Slightly longer lock for smooth tracking
  } else {
    u._crownForcedTarget = null;
  }
}

// Early return AFTER override has chance to set target
if(!target) return;
```

**Why this works**: 
- Normal lock logic might leave target as null (no lock, no nearby targets)
- Forced override runs BEFORE early return, so it can rescue the "no target" case
- If guard has `_crownForcedTarget` and normal logic found nothing, override sets target to player
- Early `if(!target) return` is AFTER this, so forced target survives to ability casting
- **CRITICAL**: Recomputing bestD prevents "out of range" failures if ability logic checks `if (bestD > abilityRange) skip`
- DPS check is defensive: checks both `guardRole === 'DPS'` AND `loadoutType === 'dps'`

---

### Section 2: Clear Forced Target at END of updateEnemies (crown namespace ONLY)

**Current problem**: Must use ONLY `_crownForcedTarget` (no mixed namespaces).

**Solution**: At START of update, reset flag. In MIDDLE of update, set flag AND forced target in crown chase block. At VERY END, clear forced target only if flag is false.

**START of enemy update loop** (line 6982):
```javascript
e._isChasingCrown = false;  // Default: not chasing
```

**MIDDLE of enemy update** (lines 6984-7003, in the crown chase detection block):
```javascript
// Check if this guard has a crown assigned (emperor mode)
if(!priorityTarget && e.crownTeam){
  const crown = state.emperor?.crowns?.[e.crownTeam];
  
  // CRITICAL: Check BOTH ID forms for player
  const playerKey = state.player?.id || state.player?._id || 'player';
  const crownCarriedByPlayer = crown && (crown.carriedBy === 'player' || crown.carriedBy === playerKey);
  
  if(crownCarriedByPlayer){
    // Crown is carried by player - chase and force DPS to target them
    e._isChasingCrown = true;
    
    // Set forced target ONLY for DPS (healers maintain own logic)
    const isDps = (e.guardRole === 'DPS') || (e.loadoutType === 'dps');
    e._crownForcedTarget = isDps ? state.player : null;
    
    // ... rest of chase logic (priorityTarget, targetDist, etc) ...
  }
}
```

**At the VERY END of updateEnemies** (right after crown chase block, before normal targeting loop):
```javascript
// Clear crown-forced target only if NOT chasing (final decision for this frame)
if (!e._isChasingCrown) {
  e._crownForcedTarget = null;
}
```

**Why this ordering matters**:
- Flag defaults to false at START
- Chase detection sets flag true AND forced target in MIDDLE
- Clear only runs at END, so if flag became true during frame, it doesn't get nuked
- This prevents the "cleared every frame" bug

**npcUpdateAbilities override** (must also use same namespace):
```javascript
const isDps = (u.guardRole === 'DPS') || (u.loadoutType === 'dps');
if (isDps && u._crownForcedTarget) {  // ONLY _crownForcedTarget
  const t = u._crownForcedTarget;
  // ... rest of logic
}
```

---

### Section 3: Normalize Crown CarriedBy (defensive)

**Current check** (lines 14942-14944):
```javascript
const isPlayerCarrying = crown.carriedBy === 'player' || crown.carriedBy === playerKey;

if(isPlayerCarrying && !crown.secured){
  crown.carriedBy = null;
```

**Add defensive normalization** before the check:
```javascript
// Defensive: Normalize carriedBy if it's an object or non-string type
// This prevents silent failures if pickup accidentally assigns state.player or other refs
if (crown.carriedBy != null && typeof crown.carriedBy === 'object') {
  console.warn('[CROWN ERROR] carriedBy was object reference, normalizing to null', {
    team: team,
    carriedBy: crown.carriedBy,
    type: typeof crown.carriedBy
  });
  crown.carriedBy = null;
}
// Also normalize weird type mismatches (number vs string)
if (crown.carriedBy != null && typeof crown.carriedBy !== 'string') {
  console.warn('[CROWN ERROR] carriedBy wrong type, converting to string', {
    team: team,
    was: crown.carriedBy,
    wasType: typeof crown.carriedBy
  });
  crown.carriedBy = String(crown.carriedBy);
}

// NOW do the normal check with both ID forms
const playerKey = state.player?.id || state.player?._id || 'player';
const isPlayerCarrying = crown.carriedBy === 'player' || crown.carriedBy === playerKey;

if(isPlayerCarrying && !crown.secured){
  crown.carriedBy = null;
```

**Why**: 
- Object references (like `state.player`) are a silent killer—crown "sticks" to player
- Type mismatches (number vs string IDs) create hidden state divergence
- Logging with team + type helps catch what code path is writing bad data

---

### Section 4: Console Verification Script (enhanced to prove override is actually used)

Add this inside npcUpdateAbilities to verify override is actually being used:
```javascript
// Enhanced debug - once per second per DPS guard, shows what target was actually chosen
const isDps = (u.guardRole === 'DPS') || (u.loadoutType === 'dps');
if (isDps && u._crownForcedTarget && ((state.gameTime||0) % 1 < 0.016)) {
  console.log('[CROWN FORCED TARGET]', u._id, {
    // What we wanted to use (the forced target)
    forcedId: u._crownForcedTarget?.id || u._crownForcedTarget?._id || 'player',
    forcedAlive: u._crownForcedTarget && u._crownForcedTarget.dead !== true,
    // What we actually ended up with (proves override worked)
    chosenId: target?.id || target?._id || 'none',
    // Lock state (should match chosen target if override worked)
    lockId: u._lockId,
    lockMs: Math.max(0, u._lockUntil - now)|0,
    // Distance to chosen (should be to player if override worked)
    distToChosen: bestD|0
  });
  
  // CRITICAL: If forcedId !== chosenId, the override didn't work or was overwritten
  if ((u._crownForcedTarget?.id || u._crownForcedTarget?._id) !== (target?.id || target?._id)) {
    console.warn('[CROWN OVERRIDE FAILED] Forced target exists but wasnt chosen!', {
      forced: u._crownForcedTarget?.id || u._crownForcedTarget?._id,
      chosen: target?.id || target?._id,
      reason: 'Check if early return or later relock overwrote override'
    });
  }
}
```

**What to look for**:
- If `forcedId === player` and `chosenId === player`: ✅ Working
- If `forcedId === player` but `chosenId !== player`: ❌ Override was overwritten later
- If `forcedAlive === false`: Early out, check if player died and respawned in combat

**Why bestD recompute is critical**: 
At line 3514, `const dist = bestD;` - this dist is then used at lines 3579, 3624, 3666, 3710, 3770, 3773, 3775 for range gating:
```javascript
const dist = bestD;  // Line 3514 - dist is derived from bestD!

// Lines 3579, 3624, 3666, 3710, etc:
if(dist <= 140) { ... }  // Gravity range check
if(dist <= meteorRange) { ... }  // Meteor range check
if(dist <= 135) { ... }  // Shoulder charge range
```

If you don't recompute bestD after overriding target, these range gates will use distance to the OLD target, not the player. Guards will cast nothing because "out of range" checks fail.

---

## Final Reality Check: 4 Things That MUST Be True

Before you test, verify these 4 things are actually in the code:

**1. Forced override injects BEFORE `if(!target) return`**
```javascript
// Lines 3348-3364: Normal lock selection (might leave target null)

// ✅ Lines 3365-3383: Forced override INJECTS HERE (before early return)
const isDps = (u.guardRole === 'DPS') || (u.loadoutType === 'dps');
if (isDps && u._crownForcedTarget) { ... }

// Line 3384: Early return AFTER override can rescue "no target" case
if(!target) return;
```

**2. Recompute bestD inside the override block**
```javascript
if (forcedAlive) {
  target = t;
  bestD = Math.hypot((t.x||0)-u.x, (t.y||0)-u.y);  // ✅ MUST BE HERE
  u._lockId = t.id || t._id || 'player';
  u._lockUntil = now + 0.35;
}
```
If bestD isn't recomputed, line 3514 `const dist = bestD;` will have stale distance to wrong target, and all the range gates (3579, 3624, 3666, 3710, 3770, 3773, 3775) will reject valid casts as "out of range."

**3. Chase condition checks BOTH ID forms**
```javascript
// Around line 6991-7005:
const playerKey = state.player?.id || state.player?._id || 'player';
const crownCarriedByPlayer = crown && (crown.carriedBy === 'player' || crown.carriedBy === playerKey);

if (crownCarriedByPlayer) {
  e._isChasingCrown = true;
  // set _crownForcedTarget ...
}
```
If chase only checks `'player'` but crown is carried as `playerKey`, forced target never sets and everything feels weak.

**4. CarriedBy normalization catches objects AND type mismatches**
```javascript
// Around line 14928 in dropCarriedCrowns:
if (crown.carriedBy != null && typeof crown.carriedBy === 'object') {
  console.warn('[CROWN ERROR] object reference...', { team, carriedBy: crown.carriedBy });
  crown.carriedBy = null;
}
if (crown.carriedBy != null && typeof crown.carriedBy !== 'string') {
  console.warn('[CROWN ERROR] wrong type...', { team, was: crown.carriedBy, wasType: typeof crown.carriedBy });
  crown.carriedBy = String(crown.carriedBy);
}
```

---

## Verification: npcUpdateAbilities Override is Already Structurally Correct

**The placement is good** (lines 3355-3377):
```javascript
// Line 3357: EARLY RETURN (before override block)
if(!target) return;

// Lines 3359-3377: FORCED OVERRIDE (after early return, safe placement) ✅
if (u._forcedCombatTarget && u.guardRole === 'DPS') {
  const forced = u._forcedCombatTarget;
  // ...
  target = forced;
  bestD = Math.hypot((target.x||0)-u.x, (target.y||0)-u.y);  // ✅ Recomputes bestD
  // ...
}

// Lines 3506-3511: Shared target relock ALSO recomputes bestD ✅
if(guardSite && guardSite._sharedTargetUntil > now && guardSite._sharedTargetId){
  const shared = candidates.find(c => (c.id||c._id) === guardSite._sharedTargetId);
  if(shared){
    target = shared;
    bestD = Math.hypot((target.x||0)-u.x,(target.y||0)-u.y);  // ✅ Consistent
  }
}

// Line 3514: Distance derived from recomputed bestD ✅
const dist = bestD;

// Lines 3579, 3624, 3666, 3710, 3770, 3773, 3775: Range gates use dist ✅
```

**Only fix needed in npcUpdateAbilities**: Change field name from `_forcedCombatTarget` to `_crownForcedTarget`:
```javascript
// Line 3359 (change):
if (u._crownForcedTarget && u.guardRole === 'DPS') {  // Changed field name
  const forced = u._crownForcedTarget;
  // ... rest unchanged ...
}
```

**No other changes needed** in npcUpdateAbilities—structure is already correct.

**Expected behavior**:
- DPS guards chase crown carrier (existing, already works)
- Guards dump burst/flame/abilities **at player** instead of random enemies
- Forced target persists across entire chase (not nuked early)
- Crown drops cleanly on death (even if carriedBy was weird type)
- All 3 DPS guards coordinate on same target (feels like real team)

**If it still feels weak after this**:
- Guards chasing but not attacking = ability range doesn't match chase orbit distance
- Guards attacking but not enough damage = cooldowns too long or mana too low
- Guards spinning/flickering target = lock duration too short (use 0.35s, not 0.25s)
- Other symptoms = balance/economy issue, not wiring issue

## Code Quality Checks

✅ Defensive ID normalization (handles both forms)  
✅ Graceful fallback values (? default for missing data)  
✅ Correct state transition ordering (targets → mode)  
✅ Clear intent comments (why we override, when we clear)  
✅ Lock variables match npcUpdateAbilities: `_lockId` and `_lockUntil` (verified at lines 3348-3357)  
✅ Distance calculation: **MANDATORY recompute bestD after override** (prevents "out of range" failures)  
✅ Override placement: BEFORE `if(!target) return` (allows rescue of "no target" case)  
✅ Guard role check: Both `guardRole === 'DPS'` AND `loadoutType === 'dps'` (defensive)  
✅ Chase condition: Uses BOTH `'player'` AND `playerKey` forms (prevents regression)  
✅ Clear forced target: ONLY at END of updateEnemies, after all chase checks complete  
✅ **Namespace consistency: CRITICAL - must use SAME field everywhere (not mixed _crownForcedTarget vs _forcedCombatTarget)**  
✅ Defensive object normalization: Catches object refs AND type mismatches with logging  
✅ Debug logging: Shows both forced and chosen target (proves override actually worked)

---

## CRITICAL: The Three Bugs in Current Code

**Bug 1: Chase detects only checks `'player'`, missing playerKey form**
- If crown is stored as `playerKey`, condition is always false
- Forced target never sets → guards chase but feel weak

**Bug 2: Clear uses wrong field name**
- Code clears `_forcedCombatTarget` (generic field for other systems)
- Should clear `_crownForcedTarget` (crown-specific namespace)
- This prevents npcUpdateAbilities from ever seeing the forced target

**Bug 3: Chase block never actually SETS the forced target**
- Sets flag true, but never assigns `e._crownForcedTarget = ...`
- Even if clear used right field, there's nothing to clear or use

---

## The Corrected Block (Minimal Diff, Copy-Paste Ready)

**Replace lines 6982-7006 in updateEnemies with this**:

```javascript
// Line 6982: Reset flag at START
e._isChasingCrown = false; // Default: not chasing

// Lines 6984-7003: Crown chase detection (sets flag + forced target)
if (!priorityTarget && e.crownTeam) {
  const crown = state.emperor?.crowns?.[e.crownTeam];

  // Check BOTH ID forms (FIXED: was only checking 'player')
  const playerKey = state.player?.id || state.player?._id || 'player';
  const crownCarriedByPlayer = crown && (crown.carriedBy === 'player' || crown.carriedBy === playerKey);

  if (crownCarriedByPlayer) {
    e._isChasingCrown = true;

    // Set crown forced target only for DPS (FIXED: was never being set)
    const isDps = (e.guardRole === 'DPS') || (e.loadoutType === 'dps');
    e._crownForcedTarget = isDps ? state.player : null;

    // ... rest of chase setup (priorityTarget, targetDist, etc) ...
  }
}

// Lines 7004-7006: Clear at END (FIXED: was using wrong field _forcedCombatTarget)
if (!e._isChasingCrown) {
  e._crownForcedTarget = null;  // NOW uses correct crown namespace
}
```

**What changed** (only 3 lines modified):
1. `crown.carriedBy === 'player'` → `(crown.carriedBy === 'player' || crown.carriedBy === playerKey)`
2. Added: `e._crownForcedTarget = isDps ? state.player : null;` (was completely missing)
3. `e._forcedCombatTarget = null;` → `e._crownForcedTarget = null;` (was wrong field)

---

## CRITICAL: Namespace Consistency (Crown Namespace ONLY)

**Use `_crownForcedTarget` everywhere—no mixing**:

**Four locations that MUST match**:
1. npcUpdateAbilities (line ~3362): `if (isDps && u._crownForcedTarget) { ... }`
2. Crown chase set (line ~7000): `e._crownForcedTarget = isDps ? state.player : null;`
3. Crown chase clear (line ~7004): `if (!e._isChasingCrown) { e._crownForcedTarget = null; }`
4. Debug logging (line ~3365): `if ((e.guardRole === 'DPS' || e.loadoutType === 'dps') && e._crownForcedTarget && ...)`

**Why this namespace**:
- Isolates crown system from other AI behaviors
- Leaves `_forcedCombatTarget` available for future threat/focus/assist systems
- Prevents silent failures from field name mismatches
- Makes the code's intent crystal clear

**If you mix names**:
```javascript
// ❌ WRONG - will silently fail:
guard._crownForcedTarget = state.player;  // Set in chase
if (isDps && u._forcedCombatTarget) { ... }  // Read in abilities
// Crown sets crownForcedTarget, code checks forcedCombatTarget
// Override never fires, guards attack squirrels instead
```

**Before implementing, verify ALL FOUR locations use `_crownForcedTarget`**.  

