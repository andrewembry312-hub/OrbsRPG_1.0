# Sneaky Bugs & Root Causes - Final Analysis

## Fixed This Session ✅

### 1. _isChasingCrown Flag Never Clears
**Status**: ✅ FIXED
**Location**: [game.js](game.js#L6957-L6978)
**Problem**: Flag was set to `true` but never reset, causing guards to become permanently unleashed
**Fix Applied**:
```javascript
// Reset flag based on current reality - NOT a one-time toggle
e._isChasingCrown = false; // Default: not chasing

if(!priorityTarget && e.crownTeam){
  const crown = state.emperor?.crowns?.[e.crownTeam];
  if(crown && crown.carriedBy === 'player'){
    // ... set up chase ...
    e._isChasingCrown = true; // Set ONLY if actively chasing RIGHT NOW
  }
}
```
**Why This Matters**: Without resetting each frame, a guard that chased a crown carrier would ignore leash constraints forever, even after the crown was dropped or secured.

---

### 2. Crown Sync Lookup Has ID Type Mismatch
**Status**: ✅ FIXED
**Location**: [game.js](game.js#L11318-L11350)
**Problem**: Guard ID might be number or string, comparison fails silently
**Fix Applied**:
```javascript
const carrierId = String(crown.carriedBy);  // Normalize to string
const guardCarrier = state.enemies.find(e => String(e._id) === carrierId);
```
**Why This Matters**: If IDs are mixed types, guard carrier lookup returns `undefined`, crown doesn't follow guard, appears stuck on minimap.

---

### 3. Defensive carriedBy Trap
**Status**: ✅ FIXED
**Location**: [game.js](game.js#L11345-L11348)
**Problem**: Could accidentally set `crown.carriedBy = true`, breaking all status logic
**Fix Applied**:
```javascript
// SAFETY CHECK: carriedBy should NEVER be true - only 'player', guardId, or null
if(crown.carriedBy === true){
  console.warn(`[CROWN ERROR] crown.carriedBy is true (invalid), resetting to null`);
  crown.carriedBy = null;
}
```
**Why This Matters**: Prevents accidental data shape corruption that would cause minimap status to permanently show "RETURNING"

---

### 4. Player ID Normalization
**Status**: ✅ FIXED
**Location**: [game.js](game.js#L14844-14850)
**Problem**: dropCarriedCrowns checked `crown.carriedBy === 'player'` but player might be stored as player.id
**Fix Applied**:
```javascript
const playerKey = state.player?.id || state.player?._id || 'player';
const isPlayerCarrying = crown.carriedBy === 'player' || crown.carriedBy === playerKey;

if(isPlayerCarrying && !crown.secured){
  crown.carriedBy = null;
  crown.secured = false; // Force OFF on death (defensive)
  crown.x = state.player.x;  // Drop at death location
  crown.y = state.player.y;
}
```
**Why This Matters**: If crown was set to player.id somewhere, death-drop would never trigger, crown would stay "carried" forever.

---

### 5. Player Pickup Clears Secured
**Status**: ✅ FIXED
**Location**: [game.js](game.js#L10814-10818)
**Problem**: Pickup didn't clear `crown.secured` flag, could prevent re-pickup
**Fix Applied**:
```javascript
if(distSq <= 48*48){
  crown.carriedBy = 'player';  // Literal string for consistency
  crown.secured = false;        // Explicitly clear secured on pickup
  crown.lastTouchedTime = state.gameTime || 0;
}
```
**Why This Matters**: Prevents "crown appears dropped but can't pick it up" bug caused by stale secured flag.

---

### 6. Enhanced Death Logging
**Status**: ✅ FIXED
**Location**: [game.js](game.js#L7586-7606)
**Problem**: Silent death - no way to verify crown actually dropped
**Fix Applied**:
```javascript
console.log('[DIE] Player died at ('+((state.player.x|0))+','+((state.player.y|0))+')');
dropCarriedCrowns(state, true);

// Log crown state AFTER drop for verification
if(state.emperor?.crowns){
  const snap = Object.entries(state.emperor.crowns).map(([t,c]) =>
    `${t}:{by:${c.carriedBy},sec:${!!c.secured},x:${(c.x|0)},y:${(c.y|0)}}`
  ).join(' ');
  console.log('[DEATH DROP RESULT]', snap);
  state.ui?.toast?.(`<span class="info"><b>DEATH DROP:</b> ${snap}</span>`);
}
```
**Why This Matters**: Immediately visible if drop actually happened - no guessing from minimap behavior.

---

## Critical Architecture Issue Discovered ⚠️

### Guard Movement System Uses `tx/ty`, NOT `targetX/targetY`

**Location**: Guard AI state machine ([game.js](game.js#L7150-7200))

**The Problem**:
- Crown recovery sets: `nearestHealer.targetX = crown.x; nearestHealer.targetY = crown.y;`
- But movement execution uses: `moveWithAvoidance(e, tx, ty, state, dt, { slowFactor })`
- These are DIFFERENT variables
- Guard never actually moves toward crown

**Current Code Flow**:
```javascript
// In updateCrownGuardAI (crown recovery logic)
nearestHealer.targetX = crown.x;  // SET THIS
nearestHealer.targetY = crown.y;  // SET THIS

// In updateEnemies (movement execution)
let tx, ty;  // Different variables!
// ... sets tx/ty from state machine, not targetX/Y ...
moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });  // Uses tx/ty, ignores targetX/Y
```

**Impact**:
- Guard detects crown is >60px away
- Code sets `targetX/Y` to crown location
- Movement system ignores those fields
- Guard sits idle, never approaches crown
- Crown never gets picked up or returned

**Why This Happened**:
Two separate AI systems:
1. **Crown Guard AI** (`updateCrownGuardAI`) - sets `targetX/Y`
2. **Enemy Guard State Machine** (`updateEnemies`) - uses `tx/ty` from state decisions

They never communicated, causing the "guards sit there doing nothing" bug.

**How to Fix** (not done yet, needs game design decision):
Option A: Make `tx/ty` read from `targetX/Y` if set by crown system
Option B: Integrate crown recovery into the state machine as a proper guard state
Option C: Have crown system set a flag like `guardMode = 'retrieve'` that the state machine reads

---

## Game Design Rules (User-Defined)

These are the clear rules needed to make Emperor Mode work:

### Without Emperor Status:
- [ ] Players can ONLY pick up their own team's crown
- [ ] Enemy home bases invulnerable (infinite HP walls or disabled)
- [ ] Crowns cannot be stolen

### When Emperor Activated:
- [ ] All player home bases spawn damageable walls
- [ ] Enemy home bases become attackable (walls spawn with HP)
- [ ] Guards can attempt raids to recapture crowns

### Crown Carry Rules:
- [ ] Player can only carry ONE crown at a time
- [ ] To steal enemy crown: must destroy their wall first, THEN pick up crown
- [ ] Bring crown to own base to "secure" it (crown.secured = true)

### Home Base Capture:
- [ ] Can only capture if: attacking team has enemy crown at own base + enemy wall is down
- [ ] Capture is a timed channel (5-10 sec) to allow contestation

### Respawn Rules:
- [ ] If your home base captured: respawn only at controlled outposts
- [ ] If you control no outposts: "downed" until outpost recapture
- [ ] Can respawn at home base if you recapture it

### Win Condition:
- [ ] Capture all 3 enemy crowns + all 3 enemy home bases
- [ ] Then unlock endgame boss

---

## What's Still Broken (Not Fixed)

### Critical Game Logic Missing
1. **Base walls don't exist** - No damageable walls at home bases
2. **No wall health states** - Walls should be `vulnerable | down | regenerating`
3. **No capture mechanics** - Can't actually capture home bases
4. **No respawn gating** - Player still respawns everywhere even if base captured
5. **No outpost control states** - Outposts not tracked as "controlled by team"

### Guard Behavior Issues
1. **Guard retrieve mode broken** - Uses wrong movement variables (tx/ty vs targetX/targetY)
2. **Elite guards don't burst** - Abilities locked to "attack" state, not "chase" state
3. **Recapture system missing** - No logic for guards to raid enemy bases

---

## Summary

**What was fixed:**
- Leash exemption permanent bug (flag never cleared)
- Silent crown drop failure (type mismatch in syncing)
- ID normalization issues (player.id vs 'player' literal)
- Death logging for verification

**What was discovered but NOT fixed:**
- **ROOT CAUSE OF "GUARDS SIT IDLE" BUG**: Guard crown recovery sets `targetX/Y` but movement system uses `tx/ty` (different variables)
- Game design rules need implementation (walls, capture, respawn gating, outpost control)

**Estimated Impact**:
- Fixes applied: ~30% confidence the system now feels "real"
- Missing architecture fix: ~60% chance guards still won't move toward dropped crowns
- Missing game design: 100% incomplete - needs full implementation of walls/capture/respawn system to feel like a real game mode

**Next Session Should**:
1. Fix the tx/ty mismatch (CRITICAL for guard movement)
2. Implement base walls with health states
3. Add respawn gating logic
4. Test crown pickup/drop/return flow end-to-end
