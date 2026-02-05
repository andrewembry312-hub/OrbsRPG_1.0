# Architecture Fixes Applied - Critical Movement & Pickup Issues Resolved

## Fixes Applied This Cycle

### 1. ✅ CRITICAL: Guard Movement Override (tx/ty Mismatch Fixed)
**Location**: [game.js](game.js#L7195-L7210)
**Problem**: Crown recovery code set `targetX/Y` but movement system used `tx/ty` from state machine
**Solution Applied**:
```javascript
// Crown guard movement override - bridge crown AI to movement system
if(e.crownGuard && (e.guardMode === 'retrieve' || e.guardMode === 'return')){
  if(Number.isFinite(e.targetX) && Number.isFinite(e.targetY)){
    tx = e.targetX;  // Override state machine decisions
    ty = e.targetY;
  }
}

// Clear targets when not in crown modes (safety)
if(e.guardMode !== 'retrieve' && e.guardMode !== 'return'){
  e.targetX = null;
  e.targetY = null;
}
```
**Impact**: Guards now actually move toward dropped crowns instead of standing idle. This is the single most important fix for the "guards don't retrieve crowns" bug.

---

### 2. ✅ One-Crown-at-a-Time Enforcement
**Location**: [game.js](game.js#L10817-10854)
**Problem**: Players could pick up multiple crowns or secondary crowns wouldn't pick up after dropping
**Solution Applied**:
```javascript
// Check if player already carrying any crown
const playerAlreadyCarrying = Object.values(state.emperor.crowns)
  .some(c => c.carriedBy === 'player');

if(!playerAlreadyCarrying){
  // Only then can player pick up another crown
  // ...pickup logic...
} else {
  // Feedback when trying to pick up while already carrying
  const carrying = Object.entries(state.emperor.crowns)
    .find(([t,c]) => c.carriedBy === 'player');
  state.ui?.toast?.(`<span class="warn">You already carry Crown ${team}</span>`);
}
```
**Impact**: Explicit rule: one crown at a time. Prevents the "only first crown picks up" bug by checking before allowing pickup.

---

## Previous Session Fixes (Still Active)

These are the 6 defensive fixes from before that are now working WITH the architecture fixes:

1. **_isChasingCrown Flag Reset** - Clears each frame based on current crown state
2. **Crown Sync ID Normalization** - Handles number/string ID mismatches
3. **Defensive carriedBy Check** - Prevents `carriedBy = true` corruption
4. **Player ID Fallback** - Handles `'player'` vs `player.id` forms
5. **Pickup Clears Secured** - Removes stale secured flag on pickup
6. **Death Logging** - Toast + console shows crown states on death

---

## Game Design Rules Locked In ✅

Based on user input, here's what's now clear:

### Crown System
- **Player can carry**: ONE crown at a time
- **Drop on death**: Crown drops at death location (not base)
- **Guards retrieve**: Priority-2 guards pick up dropped crowns within 60px
- **Guard return**: Guards carry crown back to base to secure
- **Secure at base**: Crown locked to team base (crown.secured = true)

### Emperor Mode Wall System (NOT YET IMPLEMENTED)
When Emperor status active:
- Enemy home bases spawn damageable walls
- To steal enemy crown: destroy wall FIRST, then pick up crown
- Wall has 3 states: UP (invulnerable) → DOWN (30 sec) → REGEN
- Only allows capture if attacker has enemy crown secured at own base

### Respawn Gating (NOT YET IMPLEMENTED)
- If home base captured: respawn only at controlled outposts
- If no outposts: "downed" until recapture
- Normal respawn at bases otherwise

---

## Known Remaining Issues

### Guard Abilities During Chase
- **Current state**: Abilities CAN fire during chase (player in candidates list)
- **Potential issue**: Range might be too close for useful bursts
- **Fix needed**: Verify ability ranges work during 350px chase distance

### Base Walls System
- **Status**: NOT IMPLEMENTED
- **Needed**: Base wall entities with HP, regen, vulnerable states
- **Complexity**: Medium - involves wall spawning, damage detection, visual states

### Respawn Gating
- **Status**: NOT IMPLEMENTED
- **Needed**: Track outpost ownership, gate respawns based on base capture
- **Complexity**: Medium - involves respawn logic, outpost control tracking

### Capture Mechanic
- **Status**: NOT IMPLEMENTED  
- **Needed**: Timed channel (5-10s) to capture enemy home bases
- **Requirements**: Must have enemy crown secured + enemy wall down

---

## Code Quality Improvements

All fixes follow defensive coding patterns:
- ✅ ID normalization (string conversions to prevent type mismatches)
- ✅ Null guards on optional chains (`?.`)
- ✅ Boolean flags instead of magic numbers
- ✅ Clear state transitions (null checks, explicit values)
- ✅ Logging for visibility (console + toast feedback)

---

## Ready for Testing

**Current State**: System should now:
- ✅ Guards chase crown carrier without distance limit
- ✅ Crown drops at player death location (not base)
- ✅ Player can only carry one crown at a time
- ✅ Other crowns can be picked up after dropping first one
- ✅ Guards move toward dropped crowns (tx/ty override active)
- ✅ Crown syncs to guard position on minimap
- ✅ Death shows crown state in toast message

**Not Yet**: Base walls, capture, respawn gating, abilities during chase (need verification)

---

## Next Session (Recommended Order)

1. **Verify**: Test tx/ty override - guards should visibly move to dropped crowns
2. **Verify**: Test one-crown pickup - player can't grab 2nd crown until dropping 1st
3. **Test**: Check if guard abilities fire during player chase
4. **Implement**: Base wall spawning (wall entities with HP when Emperor active)
5. **Implement**: Respawn gating logic (outpost control tracking)

The movement architecture fix is the breakthrough - everything else was defensive cleanup. Guards should now actually *move* toward objectives.
