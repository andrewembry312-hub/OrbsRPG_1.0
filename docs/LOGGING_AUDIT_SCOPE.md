# Attack Range Logging Audit: What It Does & Doesn't Address

**Date:** January 19, 2026  
**Issue:** Do the 3 logging fixes address all AI concerns?  
**Answer:** NO - They address attack range visibility but NOT broader AI system issues

---

## ✅ WHAT THE LOGGING FIXES ADDRESS

### Fix 1: Enhanced ENEMY_ATTACK_OUT_OF_RANGE Log
**Addresses:** Attack range calculation accuracy

**Shows:**
- Whether attacks are vs player/friendlies/enemies/creatures
- Distance to actual target vs distance to player
- Frequency of "out of range" attempts per enemy type

**Reveals:**
- If logging bug (most attacks are on other enemies, not player)
- If distance calculation wrong (off by 100+ units)
- If target selection prioritizing wrong targets

**Does NOT fix:** Pathfinding, state machines, team coordination

---

### Fix 2: ENEMY_ATTACK_LANDED Log
**Addresses:** Combat success tracking

**Shows:**
- How many attacks actually HIT (not just attempted)
- Damage dealt vs landed
- Success rate: (landed / out-of-range) ratio

**Reveals:**
- If pathfinding is actually broken (low landed ratio)
- If distance calculation wrong (landed but distance shows 1000u)
- If combat mechanics working (landed log should match damage report)

**Does NOT fix:** Pathfinding, movement, distance calculation

---

### Fix 3: MOVE_STUCK Log
**Addresses:** Pathfinding detection

**Shows:**
- When units try to move but don't
- Speed > 0 but position unchanged
- How often pathfinding fails per unit

**Reveals:**
- If pathfinding is broken (high MOVE_STUCK frequency)
- If obstacle detection too aggressive
- If destination unreachable causing silent failures

**Does NOT fix:** Pathfinding logic, obstacle detection, speed system

---

## ❌ WHAT THE LOGGING FIXES DO NOT ADDRESS

### Issue #1: Guard Team Coordination (CRITICAL)
**Question:** When one guard sees threat, do ALL 5 guards activate as a unit?

**What it depends on:**
- Guard squad behavior (should broadcast threat to all members)
- Guard state machine (IDLE_DEFENSE → ACTIVE_DEFENSE transition)
- Shared aggro detection system

**Logging fixes cannot answer:** Whether guards are coordinating at all
- Fixes only show attack attempts, not state transitions
- Fixes don't log squad-level events (threat broadcast)
- Fixes don't show guard positions/formation

**Needs investigation:**
- [ ] Check if guard squad aggro is broadcasting (src/game/game.js lines 5600-5650)
- [ ] Log when ONE guard detects threat: "Guard A aggro detected → broadcast to squad"
- [ ] Log when squad goes ACTIVE: "Squad in ACTIVE_DEFENSE, all 5 members responding"
- [ ] Compare timings: if all 5 guards activate within 1 frame = coordinated

**Log needed:** GUARD_SQUAD_AGGRO event when threat detected

---

### Issue #2: Guard State Machine Traps (CRITICAL)
**Question:** Are guards stuck in IDLE_DEFENSE when player is nearby?

**What it depends on:**
- State entry/exit conditions
- Commitment timers (1.0s lockouts)
- Threat detection conditions

**Logging fixes cannot answer:** Why guards aren't transitioning states
- Fixes only show attack attempts from current state
- Fixes don't log state changes or state duration
- Fixes don't show failed transition conditions

**Needs investigation:**
- [ ] Log every state change: "Guard IDLE_DEFENSE → ACTIVE_DEFENSE (reason: threat_distance < 280)"
- [ ] Log failed transitions: "Cannot transition to ACTIVE_DEFENSE (commitment timer active)"
- [ ] Log state duration: "Guard spent 5.2 seconds in IDLE_DEFENSE"
- [ ] Log transition conditions: "threat_detected=true, threat_distance=250, can_attack=false"

**Log needed:** GUARD_STATE_CHANGE event with reason & duration

---

### Issue #3: Speed System (CRITICAL)
**Question:** Are guards stuck at speed 0 when should be 110+?

**What it depends on:**
- Speed calculation formula
- State-based speed caps
- Movement lockout conditions

**Logging fixes cannot answer:** Why units aren't moving
- Fixes only show if moveWithAvoidance is stuck
- Fixes don't show speed values being used
- Fixes don't log speed transitions

**Needs investigation:**
- [ ] Log every speed change: "Guard speed: 0 → 30 (state: ACTIVE_DEFENSE)"
- [ ] Log speed calculations: "speed_calc: base=110, cc_mod=1.0, water_mod=1.0 → final=110"
- [ ] Log speed lockouts: "Speed locked at 0 due to [condition]"
- [ ] Compare speed logs with movement success

**Log needed:** UNIT_SPEED_CHANGE event with calculation details

---

### Issue #4: Guard Formation Positioning (IMPORTANT)
**Question:** Are guards maintaining 5-slot formation with correct spacing?

**What it depends on:**
- Formation slot calculation
- Healer range maintenance (110-190u from DPS)
- Position anchoring to flag/current position

**Logging fixes cannot answer:** Guard positions or formation
- Fixes only show attack attempts
- Fixes don't log position updates
- Fixes don't show formation slot assignments

**Needs investigation:**
- [ ] Log guard positions: "[Guard A] at (100, 200), role=DPS, slot=0"
- [ ] Log healer ranges: "[Healer B] distance_to_DPS=150u (target_range: 110-190u)"
- [ ] Log formation slot changes: "Guard slot reassigned: 0 → 2"
- [ ] Verify 5 guards = 5 formation slots

**Log needed:** GUARD_POSITION_UPDATE event with slot info

---

### Issue #5: Creature AI (SEPARATE SYSTEM)
**Question:** Do creatures behave differently than guards/fighters?

**What it depends on:**
- Creature decision-making (separate from guardAI)
- Creature combat triggers
- Creature state machine (if any)

**Logging fixes cannot answer:** Creature behavior
- Fixes only show combat attempts from creatures that attack
- Fixes assume creature.target tracking works
- Fixes don't address creature idle/spawn/wander logic

**Needs investigation:**
- [ ] Do creatures have state machine like guards?
- [ ] When does creature.attacked flag set to true?
- [ ] What triggers creature hostility?
- [ ] Do creatures move toward targets or wander?

**Log needed:** CREATURE_STATE_CHANGE, CREATURE_TARGET_ACQUIRED events

---

### Issue #6: Ability Casting System (SEPARATE)
**Question:** Why only 2 mage ability logs in 330 seconds?

**What it depends on:**
- Ability availability checks (cooldown, mana, positioning)
- Ability trigger conditions
- Ability target selection

**Logging fixes cannot answer:** Why abilities aren't casting
- Fixes show combat damage (melee only)
- Fixes don't log ability attempts/failures
- Fixes don't show ability cooldowns/mana

**Needs investigation:**
- [ ] Log ability cast attempts: "Mage attempting fireball (mana=50/100, cooldown=0.2s)"
- [ ] Log ability failures: "Cannot cast: mana insufficient (45 < 50 required)"
- [ ] Log successful casts: "Fireball cast at [target], damage=60"
- [ ] Compare ability logs with combat report

**Log needed:** ABILITY_CAST_ATTEMPT, ABILITY_CAST_FAILED events

---

### Issue #7: Target Selection System (SHARED)
**Question:** Are enemies selecting correct targets or missing priority?

**What it depends on:**
- nearestEnemyTo() function
- Priority scoring (combat priority system)
- Team detection logic

**Logging fixes can partially help:** The enhanced log shows targetType
- IF most attacks are on wrong target type (e.g., other enemies not player)
- THEN target selection might be broken

**But cannot fully answer:** Why targets are selected
- Doesn't show priority scores
- Doesn't show target candidates considered
- Doesn't show team check results

**Needs investigation (if logging shows wrong targets):**
- [ ] Log target selection: "Mage selecting targets: Player(dist=400), Shadow(dist=50)"
- [ ] Log priority scores: "Player(priority=8), Shadow(priority=6) → selecting Shadow"
- [ ] Log team check: "Checking if can attack Shadow: team=friendly → YES"
- [ ] Identify priority scoring bug if wrong target always picked

**Log needed:** TARGET_SELECTION_ATTEMPT event with candidates & scores

---

## 🎯 INVESTIGATION PRIORITY

### After Implementing 3 Logging Fixes, You'll Need To:

**TIER 1 - CRITICAL (blocks all combat)**
1. **Guard Team Coordination** - Do 5 guards activate together? (GUARD_SQUAD_AGGRO log)
2. **Guard State Machine** - Are guards stuck in IDLE_DEFENSE? (GUARD_STATE_CHANGE log)
3. **Speed System** - Units stuck at 0 speed? (UNIT_SPEED_CHANGE log)

**TIER 2 - IMPORTANT (affects combat quality)**
4. **Guard Formation** - Correct 5-slot positioning? (GUARD_POSITION_UPDATE log)
5. **Target Selection** - Right priority scoring? (TARGET_SELECTION_ATTEMPT log)
6. **Ability Casting** - Why 0 ability logs? (ABILITY_CAST_ATTEMPT log)

**TIER 3 - SEPARATE SYSTEMS (different investigation)**
7. **Creature AI** - Different behavior entirely (CREATURE_STATE_CHANGE log)

---

## EXPECTED OUTCOMES

### After 3 Attack Range Logging Fixes:

**Scenario A: It's a Logging Bug**
```
ENEMY_ATTACK_OUT_OF_RANGE | targetType: enemy (90%), player (10%)
ENEMY_ATTACK_LANDED | 15-20 attacks/min landing at close range
MOVE_STUCK | 0-2 logs/min (pathfinding mostly OK)
```
**Conclusion:** Enemies attacking each other at distance is expected. Focus on:
- Why player damage still low (shield mechanic overpowered?)
- Guard team coordination (doing they work together?)
- Why abilities not casting

**Scenario B: It's a Pathfinding Bug**
```
ENEMY_ATTACK_OUT_OF_RANGE | targetType: player (100%), distance: 1000-2000u
ENEMY_ATTACK_LANDED | <5 attacks/min landing (low success rate)
MOVE_STUCK | 50-100 logs/min (units frozen)
```
**Conclusion:** Pathfinding broken. Fix priority:
1. TIER 1: Implement GUARD_STATE_CHANGE + UNIT_SPEED_CHANGE logs (diagnose state/speed issues)
2. TIER 1: Implement GUARD_SQUAD_AGGRO log (ensure guards coordinate)
3. Fix pathfinding system

**Scenario C: It's a State Machine Bug**
```
ENEMY_ATTACK_OUT_OF_RANGE | targetType: mixed, distances: varied
ENEMY_ATTACK_LANDED | some landed, some failed
MOVE_STUCK | moderate frequency
```
**Conclusion:** Units can move but aren't committing to combat. Fix priority:
1. TIER 1: Implement GUARD_STATE_CHANGE log (diagnose state transitions)
2. TIER 2: Implement TARGET_SELECTION_ATTEMPT log (check priority)
3. Fix state machine conditions or commitment timers

---

## NEXT STEPS

### Phase 1: Implement 3 Attack Range Logging Fixes (25 min)
- Enhanced ENEMY_ATTACK_OUT_OF_RANGE
- ENEMY_ATTACK_LANDED
- MOVE_STUCK

### Phase 2: Run 5-min Test Session (5 min)
- Collect new debug logs
- Analyze scenarios (A/B/C above)
- Determine which AI system is broken

### Phase 3: Implement Diagnostic Logs Based on Scenario (30-60 min)
- If Scenario A: GUARD_SQUAD_AGGRO + ABILITY_CAST_ATTEMPT logs
- If Scenario B: UNIT_SPEED_CHANGE + MOVE_STUCK (enhanced) + pathfinding trace
- If Scenario C: GUARD_STATE_CHANGE + TARGET_SELECTION_ATTEMPT logs

### Phase 4: Run 5-min Test Session #2 (5 min)
- Analyze new logs
- Confirm root cause
- Plan fixes

### Phase 5: Implement Root Cause Fix (1-3 hours)
- Varies by which system is broken
- Likely: State machine, speed cap, or pathfinding

---

## SUMMARY

**TL;DR:** The 3 logging fixes diagnose ONE problem (attack range/pathfinding visibility) but reveal whether you need TIER 1, TIER 2, or TIER 3 logging next. They don't directly fix any AI issue, but they tell you which AI system is broken.

**Not recommended:** Just applying the fixes and hoping. Must analyze results and follow up with phase 3 logs.

**Estimated total time:** 2-3 hours (logging + testing + diagnosis)

