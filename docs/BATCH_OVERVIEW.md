# Audit Batch Overview & Dependencies

```
AUDIT BATCHES DEPENDENCY GRAPH
================================

BATCH 4: SHARED SYSTEMS (CRITICAL PATH)
├─ 4.1: Pathfinding System [BLOCKS: All units]
├─ 4.2: Target Selection [DEPENDS ON: 4.1]
├─ 4.3: Combat Range [DEPENDS ON: 4.1, 4.2]
├─ 4.4: Speed System [VERIFY ONLY - already fixed]
└─ 4.5: Movement Priority [DEPENDS ON: 4.1]

           ↓ These all depend on Batch 4 working ↓

BATCH 1: GUARD GROUPS
├─ 1.1: Formation System [DEPENDS ON: 4.1, 4.4]
├─ 1.2: State Machine [DEPENDS ON: 4.4]
├─ 1.3: Aggro Detection [DEPENDS ON: 4.2]
├─ 1.4: Speed Enforcement [VERIFY ONLY]
└─ 1.5: Collision Detection [VERIFY ONLY]

BATCH 2: NON-GUARD FIGHTERS
├─ 2.1: Fighter Roles [DEPENDS ON: 4.4]
├─ 2.2: Fighter Targeting [DEPENDS ON: 4.2]
├─ 2.3: Fighter Positioning [DEPENDS ON: 4.1]
├─ 2.4: Ability System [DEPENDS ON: 4.5]
└─ 2.5: Fighter Movement [DEPENDS ON: 4.1, 4.4]

BATCH 3: CREATURES
├─ 3.1: Creature Stats [INDEPENDENT]
├─ 3.2: Formation System [DEPENDS ON: 4.1]
├─ 3.3: Attack Behavior [VERIFY ONLY - already fixed]
├─ 3.4: Loot & XP [INDEPENDENT]
└─ 3.5: Boss Mechanics [INDEPENDENT]

BATCH 5: COMBAT & ABILITIES
├─ 5.1: Cooldowns [INDEPENDENT]
├─ 5.2: Damage Scaling [INDEPENDENT]
├─ 5.3: Buff/Debuff [INDEPENDENT]
├─ 5.4: Shield System [INDEPENDENT]
└─ 5.5: Healing System [INDEPENDENT]

BATCH 6: PERFORMANCE & EDGE CASES
├─ 6.1: Guard Respawn [DEPENDS ON: 1.x]
├─ 6.2: Guard Buffs [DEPENDS ON: 1.x]
├─ 6.3: Friendly AI [DEPENDS ON: 2.x]
├─ 6.4: Emperor Power [INDEPENDENT]
├─ 6.5: Logging [INDEPENDENT]
└─ 6.6: Discrepancy Inventory [ALL DEPEND ON: 1-5]
```

---

## 🎯 RECOMMENDED AUDIT ORDER

### Phase 1: CRITICAL PATH (Fix the Pathfinding Issue)
1. **BATCH 4.1** - Pathfinding System ⚠️ MOST CRITICAL
2. **BATCH 4.2** - Target Selection System
3. **BATCH 4.3** - Combat Range System
4. **BATCH 4.4** - Speed System (verify only)
5. **BATCH 4.5** - Movement Priority

**Why First:** These are the ROOT CAUSE of "ENEMY_ATTACK_OUT_OF_RANGE" spam. Fixing these will unlock all other systems.

### Phase 2: UNIT-SPECIFIC SYSTEMS (Apply pathfinding fix to units)
6. **BATCH 1** - Guard Groups (with pathfinding fix)
7. **BATCH 2** - Non-Guard Fighters (with pathfinding fix)
8. **BATCH 3** - Creatures (with pathfinding fix)

**Why Second:** Now that pathfinding works, verify each unit type behaves correctly.

### Phase 3: COMBAT MECHANICS (Damage & Abilities)
9. **BATCH 5** - Combat & Abilities
10. **BATCH 6.1-6.3** - Respawn, Buffs, Friendly AI

**Why Last:** These work better once units are actually moving and fighting.

### Phase 4: CLEANUP
11. **BATCH 6.5** - Logging improvements
12. **BATCH 6.6** - Discrepancy inventory
13. **Test Session** - Run game with all fixes, collect new logs

---

## 📊 IDLE BUG PATTERNS

### Pattern 1: Speed Bug
**Looks Like:** Unit standing still, not moving  
**Root Cause:** Speed = 0 when should be 110-140  
**Search:** BATCH 4.4  
**Fix:** Find speed calculation, verify it's not stuck at 0

### Pattern 2: State Trap  
**Looks Like:** Unit in wrong state despite having target  
**Root Cause:** State machine blocked (IDLE when should be ACTIVE)  
**Search:** BATCH 1.2, BATCH 2 states  
**Fix:** Verify state transition conditions not contradictory

### Pattern 3: Pathfinding Stall
**Looks Like:** Unit far from target, not moving closer  
**Root Cause:** moveWithAvoidance() returns current position unchanged  
**Search:** BATCH 4.1  
**Fix:** Add fallback movement if stuck >2 seconds

### Pattern 4: Target Stall
**Looks Like:** No target logs, unit idle  
**Root Cause:** nearestEnemyTo() returns null or constant retargeting  
**Search:** BATCH 4.2  
**Fix:** Add target persistence timer, handle null case

### Pattern 5: Cooldown Lock
**Looks Like:** Unit frozen between attacks  
**Root Cause:** Recovery lockout too long (>1 second) or speed set to 0  
**Search:** BATCH 5.1  
**Fix:** Reduce recovery lockout to 0.3-0.5s, allow movement during cooldown

### Pattern 6: Range Check Kill
**Looks Like:** Units far from target, constantly attacking out-of-range  
**Root Cause:** Range check too strict (30u exact) or distance calculation wrong  
**Search:** BATCH 4.3  
**Fix:** Add buffer (30u → 35u), verify distance calc is correct

---

## ✅ SUCCESS INDICATORS

### Before Audit
```
🔴 ENEMY_ATTACK_OUT_OF_RANGE: 100+ events
🔴 Enemies with 0 damage: 40+ units  
🔴 AI behavior events: 32 (gap!)
🔴 Combat effectiveness: 0%
```

### After Phase 1 (Pathfinding Fixed)
```
🟡 ENEMY_ATTACK_OUT_OF_RANGE: 50+ events (improving)
🟡 Enemies with 0 damage: 20+ units
🟡 AI behavior events: 50+ (more data)
🟡 Combat effectiveness: 30%
```

### After Phase 2 (Units Behaving)
```
🟢 ENEMY_ATTACK_OUT_OF_RANGE: <10 events (rare)
🟢 Enemies with 0 damage: <5 units
🟢 AI behavior events: 100+ (comprehensive)
🟢 Combat effectiveness: 70%+
```

### After Phase 3 (Combat Mechanics)
```
✅ ENEMY_ATTACK_OUT_OF_RANGE: ~0 events
✅ Enemies with 0 damage: 0 units
✅ AI behavior events: 150+ (full logging)
✅ Combat effectiveness: 90%+ (engaging!)
```

---

## 📍 CODE SECTION CHEATSHEET

```
File: src/game/game.js

Pathfinding (BATCH 4.1):
  moveWithAvoidance() ........... ~line 3100
  moveWithAvoidance logic ....... ~line 3120-3180

Targeting (BATCH 4.2):
  nearestEnemyTo() ............. ~line 3300
  target selection ............. ~line 3320-3380

Combat Range (BATCH 4.3):
  attack hit range check ........ ~line 8000-8050
  distance calculation .......... ~line 3500-3550

Speed System (BATCH 4.4):
  speed = 0/30/60/110/140 ....... ~line 4000-4100
  speed cap at 140 ✅ FIXED .... ~line 5745-5752

Guard State Machine (BATCH 1.2):
  IDLE_DEFENSE logic ............ ~line 5620-5650
  ACTIVE_DEFENSE logic .......... ~line 5650-5680
  RETURN_TO_POST logic .......... ~line 5680-5700

Guard Formation (BATCH 1.1):
  formation positioning ......... ~line 5280-5350
  formation slots ............... ~line 5350-5450

Fighter AI (BATCH 2):
  role detection ................ ~line 6500-6600
  targeting priority ............ ~line 6800-6900
  movement ...................... ~line 7100-7200

Creature AI (BATCH 3):
  creature spawning ............. ~line 9080-9150
  creature attack ✅ FIXED ...... ~line 9136, 9176 (attacked=true)
  creature stats ................ ~line 9000-9080

Music (BATCH 6):
  music cleanup ✅ FIXED ........ ~line 9137-9154
```

---

## 📖 KEY REFERENCES

1. **IDLE_INVESTIGATION_GUIDE.md** - Read before starting any batch
2. **AI_DESIGN_AUDIT_PLAN.md** - Main audit plan with 31 todos
3. **AUDIT_SESSION_PREP.md** - Session prep and strategy

---

**Remember:** Focus on finding idle-causing bugs while keeping the design intent intact. Fix pathfinding first (BATCH 4) - it's the bottleneck!

