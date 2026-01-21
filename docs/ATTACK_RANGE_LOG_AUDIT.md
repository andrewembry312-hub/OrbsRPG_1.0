# Attack Range Logging Audit: Root Cause Analysis

**Date:** January 19, 2026  
**Session:** 1768878845799 (330s gameplay)  
**Issue:** 100+ ENEMY_ATTACK_OUT_OF_RANGE events at 400-2000+ distance  
**Hypothesis:** Logging bug (distance calculated to wrong target) vs real AI bug

---

## STEP 1: LOCATE THE ATTACK LOGGING CODE

**File:** `src/game/game.js`  
**Lines:** 7197-7210 (ENEMY_ATTACK_OUT_OF_RANGE log)

### Current Log Code

```javascript
} else {
  // Log when target is out of melee range
  if(state.debugLog && Math.random() < 0.01){
    state.debugLog.push({
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'ENEMY_ATTACK_OUT_OF_RANGE',
      attacker: e.name || e.variant,
      target: bestTarget.name || bestTarget.variant || bestType,
      distance: Math.round(bestD),
      requiredRange: Math.round(hitDist),
      inWater: e.inWater
    });
  }
}
```

### What's Being Logged

- ✅ `attacker` - Enemy variant (warrior, mage, etc.)
- ✅ `target` - Best target's name/variant
- ✅ `distance` - Distance to bestTarget (`bestD`)
- ✅ `requiredRange` - Calculated hit distance

### What's NOT Logged (Critical Gaps)

- ❌ `targetType` - What kind of target (player/friendly/creature/enemy)
- ❌ `targetId` - Unique ID of the target
- ❌ `attackerId` - Which specific enemy (if multiples of same type)
- ❌ `distToPlayer` - Distance to player (for comparison)
- ❌ `bestTargetPos` - Position of the actual target
- ❌ Why it failed - Missing reason string

---

## STEP 2: CONFIRM TARGET SELECTION & CALCULATION

**File:** `src/game/game.js`  
**Lines:** 7115-7138 (Target selection loop)

### Target Selection Loop (EXACT CODE)

```javascript
if(e.hitCd<=0 && !(getCcState(e).stunned)){
  let bestTarget = null, bestD = Infinity, bestType = null;
  
  // player
  if(!state.player.dead){ 
    const d=Math.hypot(state.player.x - e.x, state.player.y - e.y); 
    if(d < bestD){ bestD = d; bestTarget = state.player; bestType='player'; } 
  }
  
  // friendlies
  for(const f of state.friendlies){ 
    if(f.respawnT>0) continue; 
    const d=Math.hypot(f.x - e.x, f.y - e.y); 
    if(d < bestD){ bestD = d; bestTarget = f; bestType='friendly'; } 
  }
  
  // other-team enemies
  for(const other of state.enemies){ 
    if(other===e) continue; 
    if(!other.team || !e.team) continue; 
    if(other.team === e.team) continue; 
    if(!shouldAttackTeam(e.team, other.team, state)) continue; 
    const d=Math.hypot(other.x - e.x, other.y - e.y); 
    if(d < bestD){ bestD = d; bestTarget = other; bestType='enemy'; } 
  }
  
  // hostile creatures
  const creatureArray = state.inDungeon ? state.dungeonCreatures : state.creatures;
  for(const c of creatureArray){
    if(!c.attacked) continue;
    const tgt = c.target;
    const hostile = tgt===state.player || state.friendlies.includes(tgt) || tgt===e;
    if(!hostile) continue;
    const d = Math.hypot(c.x - e.x, c.y - e.y);
    if(d < bestD){ bestD = d; bestTarget = c; bestType='creature'; }
  }
```

### Truth Table: What Can Enemies Attack?

| Target Type | Can Hit? | Proof Location | Attack Function |
|-------------|----------|----------------|-----------------|
| **Player** | ✅ YES | Line 7118-7120 | applyDamageToPlayer() |
| **Friendly NPC** | ✅ YES | Line 7121-7124 | applyShieldedDamage() |
| **Other Enemy** | ✅ YES | Line 7125-7131 | applyDamageToEnemy() |
| **Creature** | ✅ YES | Line 7132-7138 | applyDamageToCreature() |

**Conclusion:** Enemies CAN attack player, friendlies, other enemies, and creatures. The distance calculation (`bestD`) is to whichever is **closest**, not always the player.

---

## STEP 3: SMOKING GUN FROM ACTUAL LOGS

Look at these lines from debug-log-1768878845811.txt:

```
[319.63s]  ENEMY_ATTACK_OUT_OF_RANGE | attacker:"mage", target:"Shadow", distance:31, requiredRange:28
[319.75s]  ENEMY_ATTACK_OUT_OF_RANGE | attacker:"mage", target:"Snarl", distance:31, requiredRange:28
```

**Analysis:**
- `target: "Shadow"` and `target: "Snarl"` are NAMED entities (friendlies or creatures)
- Distance 31 vs range 28 = **ACTUALLY IN RANGE** (but logged as out-of-range!)
- This suggests these are hitting, not missing

Compare with:
```
[319.17s]  ENEMY_ATTACK_OUT_OF_RANGE | attacker:"mage", target:"mage", distance:428, requiredRange:31
[319.20s]  ENEMY_ATTACK_OUT_OF_RANGE | attacker:"mage", target:"mage", distance:1504, requiredRange:30
```

**Pattern:** When attacking other enemies (type="mage", "warrior", etc.), distances are 400-2000+ units. These are attacking OTHER TEAM ENEMIES from far away, not the player!

---

## STEP 4: EFFECT LOG MISSING TARGETID

**File:** `effect-log-1768878845828.txt`

```
Missing targetId: 503

Top missing-targetId samples (all at t=0.00):
  ?:knight_shield_wall_shield target=?:?
  ?:warrior_fortitude_shield target=?:?
  ?:tank_anchor_shield target=?:?
```

**Root Cause:** Pre-fight buffs (shields) applied at game start (t=0) have no targetId recorded. These are likely applied to SELF, but the logging doesn't capture it.

**Impact:** Not related to combat range issue - this is a separate initialization problem.

---

## DIAGNOSIS

### Root Cause

**HYBRID BUG:**

1. **Logging Gap (PRIMARY):** ENEMY_ATTACK_OUT_OF_RANGE doesn't distinguish targetType
   - Enemies attacking other enemies from 1000+ units logged as "out of range"
   - But log doesn't say "attacking other enemy" vs "attacking player"
   - Makes it look like massive combat bug when it might be intended enemy-vs-enemy hostility

2. **Real AI Issue (SECONDARY):** Enemies attacking other enemies from far away suggests
   - Enemy-vs-enemy pathfinding also broken (same as player-targeting)
   - OR enemies are prioritizing distant enemies over closer player/friendlies
   - OR enemy targeting is selecting wrong team

3. **Effect Log Gap:** 503 effects missing targetId (unrelated to attack range issue)
   - Pre-fight shield buffs apply but don't log target
   - Not causing damage/combat failure

---

## MINIMAL FIXES

### FIX 1: Enhanced Attack Range Logging (Lines 7197-7210)

**Replace:**
```javascript
} else {
  // Log when target is out of melee range
  if(state.debugLog && Math.random() < 0.01){
    state.debugLog.push({
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'ENEMY_ATTACK_OUT_OF_RANGE',
      attacker: e.name || e.variant,
      target: bestTarget.name || bestTarget.variant || bestType,
      distance: Math.round(bestD),
      requiredRange: Math.round(hitDist),
      inWater: e.inWater
    });
  }
}
```

**With:**
```javascript
} else {
  // Log when target is out of melee range
  if(state.debugLog && Math.random() < 0.01){
    state.debugLog.push({
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'ENEMY_ATTACK_OUT_OF_RANGE',
      attackerId: e.id || e.name,
      attacker: e.name || e.variant,
      targetId: bestTarget.id || 'none',
      target: bestTarget.name || bestTarget.variant || bestType,
      targetType: bestType,
      distance: Math.round(bestD),
      distToPlayer: state.player.dead ? Infinity : Math.round(Math.hypot(state.player.x - e.x, state.player.y - e.y)),
      requiredRange: Math.round(hitDist),
      inWater: e.inWater,
      reason: 'range_fail'
    });
  }
}
```

**Why:** Now we can see:
- If attacking "enemy" type from 1000u away (expected behavior?)
- Distance to actual target vs distance to player (tells us targeting priority)

---

### FIX 2: Add ENEMY_ATTACK_LANDED Log (Lines 7150-7155, add after successful attack)

**Add new log in the successful attack block (when `bestD <= hitDist`):**

```javascript
if(bestD <= hitDist && !e.inWater){
  e.hitCd = 0.65;
  e.attacked = true;
  
  // NEW: Log successful attack landing
  if(state.debugLog && Math.random() < 0.05){
    state.debugLog.push({
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'ENEMY_ATTACK_LANDED',
      attackerId: e.id || e.name,
      attacker: e.name || e.variant,
      targetId: bestTarget.id || 'none',
      target: bestTarget.name || bestTarget.variant || bestType,
      targetType: bestType,
      distance: Math.round(bestD),
      damage: e.contactDmg,
      targetHP: Math.round(bestTarget.hp || 0)
    });
  }
  
  // Existing damage code...
```

**Why:** Tells us what actually landed vs what failed. If we see 100 out-of-range logs but 0 landed logs, pathfinding is broken. If we see landed logs, attacks ARE working.

---

### FIX 3: Add MOVE_STUCK Log for Attack Movement (Lines 7105-7112, after moveWithAvoidance)

**Find this code:**
```javascript
const cc = getCcState(e);
// move towards target using avoidance helper
if(e.speed > 0){
  const slowFactor = (e.inWater ? 0.45 : 1.0) * ((cc.rooted||cc.stunned) ? 0 : Math.max(0, 1 + cc.speedMod));
  if(slowFactor>0) moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });
}
```

**Add after moveWithAvoidance:**
```javascript
if(e.speed > 0){
  const slowFactor = (e.inWater ? 0.45 : 1.0) * ((cc.rooted||cc.stunned) ? 0 : Math.max(0, 1 + cc.speedMod));
  if(slowFactor>0){
    const oldPos = {x: e.x, y: e.y};
    moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });
    
    // NEW: Log if unit didn't move when it should
    if(slowFactor > 0 && e.speed > 30 && oldPos.x === e.x && oldPos.y === e.y && Math.random() < 0.005){
      state.debugLog.push({
        time: (state.campaign?.time || 0).toFixed(2),
        type: 'MOVE_STUCK',
        unitId: e.id || e.name,
        unit: e.name || e.variant,
        distToTarget: tx && ty ? Math.round(Math.hypot(tx - e.x, ty - e.y)) : 0,
        targetPos: {x: Math.round(tx), y: Math.round(ty)},
        currentPos: {x: Math.round(e.x), y: Math.round(e.y)},
        speed: e.speed,
        slowFactor: slowFactor.toFixed(2)
      });
    }
  }
}
```

**Why:** If moveWithAvoidance isn't moving units even with speed > 30, pathfinding is broken.

---

## EXPECTED RESULTS AFTER FIXES

### If It's a Logging Bug

**In new debug log you should see:**

```
[t=100s] ENEMY_ATTACK_OUT_OF_RANGE | attackerId:warrior_5, targetId:mage_2, 
         targetType:enemy, distance:1504, distToPlayer:150, reason:range_fail

[t=100s] ENEMY_ATTACK_OUT_OF_RANGE | attackerId:warrior_3, targetId:Hero, 
         targetType:player, distance:428, distToPlayer:428, reason:range_fail

[t=100s] ENEMY_ATTACK_LANDED | attackerId:mage_1, targetId:Shadow, 
         targetType:friendly, distance:28, damage:15
```

**Interpretation:**
- Most out-of-range are attacking OTHER ENEMIES (not player)
- Actual player attacks show distToPlayer ≈ distance (confirms we're tracking player correctly)
- ENEMY_ATTACK_LANDED shows some attacks DO hit at close range

**Conclusion:** Logging bug. Enemies attacking each other at distance is expected behavior, not a combat failure.

---

### If It's a Real AI Bug

**In new debug log you should see:**

```
[t=100s] MOVE_STUCK | unitId:warrior_5, distToTarget:1504, speed:110, 
         currentPos:[100,100], targetPos:[1500,100]

[t=100s] ENEMY_ATTACK_OUT_OF_RANGE | attackerId:warrior_5, targetId:player, 
         targetType:player, distance:1504, distToPlayer:1504, reason:range_fail

[t=100s] ENEMY_ATTACK_LANDED | (NONE - no attacks landing)
```

**Interpretation:**
- MOVE_STUCK shows pathfinding isn't working (unit trying to reach target but frozen)
- ENEMY_ATTACK_OUT_OF_RANGE shows distance to player ≈ 1504 (really is far)
- No ENEMY_ATTACK_LANDED = attacks never land from distance

**Conclusion:** Real AI bug. Pathfinding broken, units can't reach targets. Fix priority: BATCH 4.1 (Pathfinding).

---

## CODE CHANGES SUMMARY

### Change 1: Enhanced ENEMY_ATTACK_OUT_OF_RANGE Log
- **File:** `src/game/game.js`
- **Lines:** 7197-7210
- **Add fields:** attackerId, targetId, targetType, distToPlayer, reason
- **Time:** 5 min

### Change 2: Add ENEMY_ATTACK_LANDED Log
- **File:** `src/game/game.js`
- **Lines:** ~7150 (in successful attack block)
- **New log:** 15 lines of code
- **Time:** 10 min

### Change 3: Add MOVE_STUCK Log
- **File:** `src/game/game.js`
- **Lines:** ~7110 (after moveWithAvoidance call)
- **New log:** 12 lines of code
- **Time:** 10 min

**Total changes:** ~45 lines of logging code  
**Total time:** ~25 minutes  
**Risk level:** ZERO (logging only, no behavior changes)

---

## VALIDATION CHECKLIST

After applying fixes, run a new 5-minute session and check:

- [ ] ENEMY_ATTACK_OUT_OF_RANGE now shows targetType (enemy/player/friendly/creature)
- [ ] ENEMY_ATTACK_OUT_OF_RANGE shows distToPlayer in same log
- [ ] Can distinguish player attacks (distToPlayer ≈ distance) vs other-enemy attacks
- [ ] ENEMY_ATTACK_LANDED logs appear (how many attacks actually land?)
- [ ] MOVE_STUCK logs appear if pathfinding stuck (frequency?)
- [ ] Compare damage report with landed attacks (# landed ≈ total damage dealt?)

---

## HYPOTHESIS CONFIRMATION

**If mostly attacking enemy-type targets from 1000+ units:**
→ Logging bug. Enemy-vs-enemy combat at range is expected. Focus on why player damage is low (shield mechanic).

**If attacking player from 1000+ units and NO landed attacks:**
→ Real AI bug. Pathfinding broken. Fix BATCH 4.1 first.

**If attacks landing but distance doesn't match:**
→ Distance calculation bug (possible position lag, hitbox mismatch).

---

**Ready to implement? Confirm which fixes you want applied first.**

