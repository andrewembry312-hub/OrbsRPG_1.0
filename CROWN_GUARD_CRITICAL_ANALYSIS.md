# Crown Guard System - Critical Analysis & Root Cause (5-Why)

**Status**: DESIGN VS REALITY MISMATCH IDENTIFIED  
**Priority**: CRITICAL - System not functioning as intended  

---

## Problem Statement

Crown guards are **still leashed to base** and **not following crown** when carried by player, despite:
- `spawnTargetSiteId: null` (set to not target outposts)
- `homeSiteId: null` (set to not defend base)
- AI code setting `guard.targetX = crownX` when crown is carried

---

## 5-Why Root Cause Analysis

### Why 1: Guards Don't Follow Crown
**Symptom**: Crown is picked up by player, guards stay at base instead of chasing.

**Root Cause**: AI is setting target position correctly (`guard.targetX = crownX`), BUT the guard movement system is not actually moving guards to the target.

---

### Why 2: AI Sets Target But Guards Don't Move
**Symptom**: `targetX` and `targetY` are being set in updateCrownGuardAI(), but nothing happens.

**Hypothesis**: 
- The guard's general movement system (that normally moves guards toward targetX/Y) is **NOT USING** these crown guard properties
- OR there's a separate movement limiter that checks `homeSiteId` before allowing movement
- OR the guard update order is wrong (movement happens before AI update)

---

### Why 3: Movement System Ignores Crown Guard Properties
**Symptom**: Guards have `crownFollowRange`, `targetX`, `targetY` set, but move elsewhere.

**Root Cause Possibilities**:
1. **Separateenemy movement function** that doesn't know about crown guards
2. **spawnTargetSiteId/homeSiteId still being checked** somewhere we haven't found
3. **Guard update() function** not calling the updateCrownGuardAI() BEFORE movement happens
4. **Different movement routine** for guards vs regular enemies

---

### Why 4: Guards Return to Base After AI Sets Chase Target
**Symptom**: Even when AI explicitly sets `guard.targetX = crownX`, guards still get pulled back.

**Most Likely**: There's a **second system** (possibly in main game loop or enemy update) that:
```javascript
// SOMEWHERE IN CODE (not in updateCrownGuardAI):
if (enemy.homeSiteId) {
  // Force guard back to base
  enemy.targetX = homeSiteLocation.x;
  enemy.targetY = homeSiteLocation.y;
}
```

This would **OVERRIDE** whatever updateCrownGuardAI() sets!

---

### Why 5: System Design Has Fundamental Flaw
**Core Issue**: The AI behavior system (updateCrownGuardAI) is completely **DISCONNECTED** from the actual movement system.

**Two Separate Systems**:
1. **updateCrownGuardAI()** → Sets intentions (targetX/Y, guardMode, abilityRotation)
2. **enemyMovement system** → Actually moves guards (ignores crown guard data, uses other properties)

**These don't talk to each other!**

---

## Current Architecture Issues

### Issue 1: Missing Crown Guard Flag
The guard spawn sets properties like:
```javascript
crownGuard: true,      // Rendering flag
crownFollowRange: 500, // AI intention
crownId: crown._id,    // Crown tracking
```

But the **main movement system probably checks**:
```javascript
if (e.guard && e.homeSiteId) {
  // This is a guard defending a site
  // Pull back to site
}
```

**Missing**: A check like `if (e.crownGuard && e.crownFollowRange > currentDist) { allowChase(); }`

---

### Issue 2: No Crown Possession Logic
**Missing System**: When crown is dropped, there's no mechanism for:
1. Guards to detect it as dropped
2. Priority 2 guards to pick it up
3. Guards to carry it back to base
4. Crown to stay with "carrier" guard

**Current State**: Crown just sits there, guards reset but don't recover it

---

### Issue 3: No Crown Tracking on Minimap
**Missing**: Visual indicator on minimap showing:
- Crown location (static when at base)
- Crown location (moving with player when carried)
- Crown location (dropped on ground)

---

### Issue 4: No Crown State Indicators
**Missing**: On-screen UI showing:
- Crown PICKED UP by player (teamA)
- Crown DROPPED at location X
- Crown RETURNED to base (teamA)
- Crown SECURED by player team

---

## Design Intent vs Current State

### INTENDED Behavior (Your Request):
```
PRIORITY 1: Protect Crown at Home Base
  IF crown at base:
    ✓ Guards defend formation around crown
    ✓ Kill enemies near crown
  
  IF crown carried by player:
    ✓ Guards chase player
    ✓ DPS bursts and damages player
    ✓ Player dies → Crown drops at death location
    
  IF crown dropped:
    ✓ Guards detect it's dropped
    ✓ Priority 2 guards pick it up
    ✓ Carrier guard runs to base
    ✓ Crown is returned/secured

PRIORITY 2: Return Crown to Base (If Dropped)
  IF guard carries crown:
    ✓ Guard walks/runs toward own base
    ✓ Crown follows with carrier
    ✓ Reaches base → Crown secured
```

### ACTUAL Behavior (Now):
```
Guards spawn → Stay at base
Crown at base → Guards maintain formation (works)
Player picks up crown → Guards stay at base ✗
Crown dropped → Guards reset, don't pick it up ✗
Crown never returns → System breaks ✗
```

---

## Root Cause Summary

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Guards leashed | `homeSiteId` checked in separate movement system | Cannot leave base |
| Ignore targetX/Y | Movement system doesn't use crown guard properties | Overrides AI decisions |
| No crown recovery | No logic for guards to pick up dropped crown | Crown lost if dropped |
| No minimap display | Crown object not rendered on minimap | Cannot see crown movement |
| No state indicators | No UI system tracking crown events | No feedback to player |
| Missing kill-and-drop | Crown doesn't drop when player dies | No recovery mechanic |

---

## Code Locations to Investigate

1. **Find main enemy movement function**
   - Search for where `e.x` and `e.y` are updated based on `e.targetX` and `e.targetY`
   - Check if `homeSiteId` is referenced there
   - Look for guard-specific movement logic

2. **Find where `homeSiteId` is enforced**
   - Search for `if (e.guard && e.homeSiteId)`
   - Check for distance-based leashing (e.g., "if too far from home, pull back")
   - Look for site-based movement constraints

3. **Find game loop order**
   - Check if updateCrownGuardAI() runs BEFORE or AFTER enemy movement
   - If it runs AFTER, then movement overrides AI decisions

4. **Find loot drop system**
   - Search for where player death drops loot
   - Crown should drop like loot when player dies

---

## What Needs to Change

### Immediate Fixes:
1. **Remove homeSiteId blocking** from crown guards (make them exception)
2. **Make AI targetX/Y override** site-based movement for crown guards
3. **Implement crown drop** when player dies (crown → loot at death location)
4. **Add crown pickup logic** for guards (priority 2 only)
5. **Add crown carrier movement** (guard carries crown back to base)

### UI Additions:
6. **Minimap crown indicators** (show crown on map)
7. **Crown state messages** (picked up, dropped, returned, secured)
8. **Guard status display** (which guard is carrying crown, where is it going)

### System Redesign:
9. **Crown possession system** (crown has owner entity, moves with carrier)
10. **Guard-to-base routing** (guards navigate back to base efficiently)
11. **Crown secure condition** (crown reaches base center → secured)

---

## Next Steps

1. ✅ **Identify movement system** - Find where guards actually move
2. ✅ **Find homeSiteId enforcer** - Locate the code blocking movement
3. ✅ **Create exception for crown guards** - Allow them to leave base
4. ✅ **Implement crown drop on player death** - Crown becomes loot
5. ✅ **Implement guard pickup mechanic** - Guards can pick up crown
6. ✅ **Implement crown return logic** - Guards carry it back to base
7. ✅ **Add minimap rendering** - Show crown position
8. ✅ **Add state indicators** - UI feedback for crown events

---

## Design Philosophy Reset

The system needs to shift from:
- **"Guards defend base"** → **"Guards defend and recover crown"**
- **Passive protection** → **Active recovery system**
- **AI-only** → **AI + external pickup/carry logic**

Crown guards should be a **raid group mechanic**, not just base defenders.

