# AI Audit Master Index

**Session Date:** January 19, 2026  
**Purpose:** Comprehensive AI behavior audit with focus on idle/frozen unit investigation  
**Status:** AUDIT MATERIALS READY

---

## 📚 AUDIT DOCUMENTS (Read in Order)

### START HERE 👇

#### 1. 📄 [AUDIT_SESSION_PREP.md](AUDIT_SESSION_PREP.md) ⭐ READ FIRST
**Quick overview of the entire audit**
- What's ready for you
- Strategy for the audit session
- Quick start checklist
- Code navigation guide
- Success metrics

#### 2. 📄 [IDLE_INVESTIGATION_GUIDE.md](IDLE_INVESTIGATION_GUIDE.md) ⭐ CRITICAL READING
**Detailed guide to finding idle bugs**
- Speed bug investigation (step-by-step)
- State machine traps (common patterns)
- Pathfinding stalls (diagnostic approach)
- Targeting stalls (how targets fail)
- Cooldown & recovery locks
- Logging strategy (what to log)
- Design-compliant enhancement ideas
- Investigation workflow

#### 3. 📄 [BATCH_OVERVIEW.md](BATCH_OVERVIEW.md)
**Visual dependency graph and audit order**
- Batch dependency map
- Recommended audit order (Phases 1-4)
- Idle bug patterns reference
- Success indicators
- Code section cheatsheet

#### 4. 📄 [AI_DESIGN_AUDIT_PLAN.md](AI_DESIGN_AUDIT_PLAN.md)
**Main audit plan with 31 todos**
- 6 batches with 5-6 todos each
- Each todo has:
  - Idle investigation questions
  - Enhancement ideas (design-compliant)
  - Evidence from logs
  - Verification checkpoints
- Critical findings summary
- Audit tracking matrix

---

## 🎯 QUICK REFERENCE

### CRITICAL FINDINGS FROM LOGS

#### Issue 1: Units Can't Attack (CRITICAL) 🔴
- **Pattern:** ENEMY_ATTACK_OUT_OF_RANGE (100+ events)
- **Root Cause:** Pathfinding broken OR combat range check broken
- **Evidence:** Units at 400-2000+ distance, required 28-31 distance
- **Impact:** 40+ enemies dealing 0 damage
- **Fix Location:** BATCH 4.1 (Pathfinding) or 4.3 (Combat Range)

#### Issue 2: AI Logging Incomplete (IMPORTANT) 🟡
- **Pattern:** Only 32 AI events in 330 seconds
- **Should Be:** 100+ events (one per second)
- **Missing:** Movement, positioning, target selection logs
- **Impact:** Can't verify AI actually running
- **Fix Location:** BATCH 6.5 (Logging & Debug Systems)

#### Issue 3: Player Shield Invulnerable (VERIFY) 🟡
- **Pattern:** 101 combat events, ALL "SHIELD ONLY"
- **Possible:** Design intent (shield very powerful) or bug
- **Impact:** Player never takes damage
- **Check:** BATCH 5.4 (Shield System)

---

## 📊 AUDIT STRUCTURE

### PHASE 1: PATHFINDING (FIX ROOT CAUSE)
- **BATCH 4** - Shared Systems (5 todos)
  - 4.1 Pathfinding System ⚠️ MOST CRITICAL
  - 4.2 Target Selection
  - 4.3 Combat Range
  - 4.4 Speed System (verify)
  - 4.5 Movement Priority

### PHASE 2: UNIT SYSTEMS (APPLY FIXES)
- **BATCH 1** - Guard Groups (5 todos)
- **BATCH 2** - Non-Guard Fighters (5 todos)
- **BATCH 3** - Creatures (5 todos)

### PHASE 3: COMBAT MECHANICS
- **BATCH 5** - Combat & Abilities (5 todos)
- **BATCH 6.1-6.3** - Respawn, Buffs, Friendly AI

### PHASE 4: CLEANUP
- **BATCH 6.5-6.6** - Logging, Discrepancy Inventory
- **Test Session** - Run game, collect new logs

---

## 🔍 IDLE BUG INVESTIGATION

### Common Idle Patterns

```
Pattern 1: Speed Bug
├─ Symptom: Unit standing still, not moving
├─ Root Cause: Speed stuck at 0 when should be 110-140
├─ Search: BATCH 4.4
└─ Fix: Speed calculation bug

Pattern 2: State Trap
├─ Symptom: Unit in IDLE when should be ACTIVE
├─ Root Cause: State transition blocked
├─ Search: BATCH 1.2, BATCH 2 states
└─ Fix: Unblock transition conditions

Pattern 3: Pathfinding Stall
├─ Symptom: Unit far from target, not moving
├─ Root Cause: moveWithAvoidance() returns current position
├─ Search: BATCH 4.1
└─ Fix: Add fallback movement

Pattern 4: Target Stall
├─ Symptom: No target logs, unit idle
├─ Root Cause: nearestEnemyTo() returns null or retargets constantly
├─ Search: BATCH 4.2
└─ Fix: Target persistence, null handling

Pattern 5: Cooldown Lock
├─ Symptom: Unit frozen between attacks
├─ Root Cause: Recovery lockout too long OR speed = 0
├─ Search: BATCH 5.1
└─ Fix: Reduce lockout to 0.3-0.5s

Pattern 6: Range Check Kill
├─ Symptom: Constant out-of-range attacks
├─ Root Cause: Range check too strict or distance calc wrong
├─ Search: BATCH 4.3
└─ Fix: Add buffer (30u → 35u)
```

---

## 💡 ENHANCEMENT PHILOSOPHY

### ✅ OK to Do (Design-Compliant)
- Add logging (no gameplay change)
- Fix speed calculation bugs
- Optimize state transitions (faster response, same outcome)
- Add pathfinding fallbacks
- Reduce commitment timers (0.75s → 0.5s)
- Add distance buffers (30u → 35u)

### ❌ Don't Do (Design Intent)
- Remove threat detection
- Change basic speed values (0/30/60/110/140)
- Remove commitment timers entirely
- Break formation system
- Remove aggro/leash mechanics

---

## 📍 CODE SECTIONS

### Critical Files
- **src/game/game.js** - All AI logic

### Critical Sections
```
Pathfinding:       lines ~3100-3200 (BATCH 4.1)
Targeting:         lines ~3300-3400 (BATCH 4.2)
Combat Range:      lines ~8000-8050 (BATCH 4.3)
Speed System:      lines ~4000-4100 (BATCH 4.4)
Guard AI:          lines ~5280-5750 (BATCH 1)
Fighter AI:        lines ~6500-7200 (BATCH 2)
Creature AI:       lines ~9000-9250 (BATCH 3)
Combat/Abilities:  lines ~8500-8800 (BATCH 5)
Music (Fixed):     lines 9137-9154 ✅
```

---

## ✨ TOOLS & RESOURCES

### Available Console Commands
- `window.xpDebug` - View XP progression details
- `giveAllItems()` - Add all items for testing
- `giveAllBuffs()` - Add all buffs
- `state.debugLog` - Access debug log
- `state.combatLog` - Access combat log
- `state.damageReport` - Access damage report

See [CONSOLE_COMMANDS.md](CONSOLE_COMMANDS.md) for full list.

---

## 🎬 QUICK START

1. **Read** [AUDIT_SESSION_PREP.md](AUDIT_SESSION_PREP.md) (5 min)
2. **Read** [IDLE_INVESTIGATION_GUIDE.md](IDLE_INVESTIGATION_GUIDE.md) (10 min)
3. **Review** [BATCH_OVERVIEW.md](BATCH_OVERVIEW.md) (5 min)
4. **Start** BATCH 4.1 (Pathfinding) with logs open
5. **Document** findings using todo list
6. **Implement** fixes one batch at a time
7. **Test** with new logs after each phase

---

## 📈 SUCCESS CRITERIA

### Before Audit
```
🔴 Out of Range: 100+ | 🔴 Zero Damage: 40+ | 🔴 AI Events: 32
```

### After Phase 1
```
🟡 Out of Range: <50 | 🟡 Zero Damage: 20+ | 🟡 AI Events: 50+
```

### After Phase 2
```
🟢 Out of Range: <10 | 🟢 Zero Damage: <5 | 🟢 AI Events: 100+
```

### After Phase 3
```
✅ Out of Range: ~0 | ✅ Zero Damage: 0 | ✅ AI Events: 150+
```

---

## 📋 AUDIT TODO STRUCTURE

```
31 Total Todos (in manage_todo_list)

Batch 1: Guard Groups (5 todos)
  ☐ 1.1 Formation System Design
  ☐ 1.2 State Machine (IDLE/ACTIVE/RETURN)
  ☐ 1.3 Aggro & Threat Detection
  ☐ 1.4 Speed Enforcement (verify)
  ☐ 1.5 Guard-Player Collision (verify)

Batch 2: Non-Guard Fighters (5 todos)
  ☐ 2.1 Fighter Roles
  ☐ 2.2 Fighter Targeting
  ☐ 2.3 Fighter Positioning
  ☐ 2.4 Ability System
  ☐ 2.5 Fighter Movement

Batch 3: Creatures (5 todos)
  ☐ 3.1 Creature Types & Stats
  ☐ 3.2 Creature Formation System
  ☐ 3.3 Attack Behavior (verify)
  ☐ 3.4 Creature Loot & XP
  ☐ 3.5 Boss Mechanics

Batch 4: Shared Systems (5 todos) ⚠️ START HERE
  ☐ 4.1 Pathfinding System (CRITICAL)
  ☐ 4.2 Target Selection System (CRITICAL)
  ☐ 4.3 Combat Range System (CRITICAL)
  ☐ 4.4 Speed System (verify)
  ☐ 4.5 Movement Priority

Batch 5: Combat & Abilities (5 todos)
  ☐ 5.1 Ability Cooldowns
  ☐ 5.2 Ability Damage Scaling
  ☐ 5.3 Buff/Debuff System
  ☐ 5.4 Shield System
  ☐ 5.5 Healing System

Batch 6: Performance & Edge Cases (6 todos)
  ☐ 6.1 Guard Respawn System
  ☐ 6.2 Guard Buff System
  ☐ 6.3 Friendly AI Integration
  ☐ 6.4 Emperor Power System
  ☐ 6.5 Logging & Debug Systems
  ☐ 6.6 Discrepancy Inventory Creation
```

---

## 🎓 Key Concepts

### Speed Progression (Design Intent)
- **IDLE_DEFENSE:** speed = 0 (units at rest)
- **ACTIVE_DEFENSE:** speed = 30 (gentle movement)
- **ACTIVE_DEFENSE (target):** speed = 60 (closing distance)
- **ACTIVE_DEFENSE (chase):** speed = 110 (pursuit)
- **SPRINT:** speed = 140 (max speed, hard cap ✅ VERIFIED)

### State Machine (Design Intent)
- **IDLE_DEFENSE:** Waiting at position, speed = 0
- **ACTIVE_DEFENSE:** Engaged with target, speed >= 110
- **RETURN_TO_POST:** Going back to home, speed = 110
- Transitions prevented by commitment timers (prevent thrashing)

### Pathfinding (Design Intent)
- moveWithAvoidance() navigates around obstacles
- Angular sampling tries multiple directions
- If stuck, fallback to simpler pathfinding
- Never should return unchanged position (indicates failure)

---

**You're fully prepared. Time to audit! 🚀**

