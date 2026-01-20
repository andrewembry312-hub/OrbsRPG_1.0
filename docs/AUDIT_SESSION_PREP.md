# AI Audit Session Preparation Summary

**Date:** January 19, 2026 10:30 PM  
**Session Focus:** Comprehensive AI behavior audit with idle/frozen unit investigation  
**Approach:** Find design discrepancies while looking for bugs causing idle behavior

---

## 📋 What's Ready for You

### 1. **Main Audit Plan**
📄 [AI_DESIGN_AUDIT_PLAN.md](AI_DESIGN_AUDIT_PLAN.md)
- 31 structured todos organized in 6 batches
- Each todo has specific code sections to review
- Idle investigation questions added to each todo
- Enhancement suggestions (design-compliant)

### 2. **Idle Bug Investigation Guide**
📄 [IDLE_INVESTIGATION_GUIDE.md](IDLE_INVESTIGATION_GUIDE.md)
- **Speed bugs:** How to find speed stuck at wrong value
- **State traps:** How units get stuck in idle states
- **Pathfinding stalls:** When movement fails silently
- **Targeting stalls:** Why units don't find targets
- **Cooldown locks:** Recovery timers causing freezing
- **Logging strategy:** What to log to catch idle bugs
- **Design-compliant improvements:** How to enhance without breaking design

### 3. **Todo Tracking**
31 todos organized in batches:
- **Batch 1:** Guard Groups (5 todos)
- **Batch 2:** Non-Guard Fighters (5 todos)
- **Batch 3:** Creatures (5 todos)
- **Batch 4:** Shared Systems - PATHFINDING (5 todos) ⚠️ CRITICAL
- **Batch 5:** Combat & Abilities (5 todos)
- **Batch 6:** Performance & Edge Cases (6 todos)

### 4. **Critical Context from Logs**

#### Issue #1: ENEMY_ATTACK_OUT_OF_RANGE Spam 🔴 CRITICAL
- **Frequency:** 100+ events in 330s gameplay
- **Pattern:** Units attempting attacks from 400-2020 units away
- **Required Range:** 28-31 units
- **Impact:** No real combat (all attacks fail, 0 damage from 40+ units)
- **Likely Cause:** Pathfinding not moving units to target, or combat range check broken

#### Issue #2: AI Logging Incomplete 🟡 IMPORTANT
- **Current:** Only 32 AI events in 330 seconds
- **Should be:** 100+ events (one per second at least)
- **Missing:** Movement logs, positioning logs, target selection logs
- **Impact:** Can't verify if AI is actually running

#### Issue #3: All Player Damage Blocked by Shield
- **Pattern:** 101 combat events, ALL "SHIELD ONLY"
- **Impact:** Player never takes damage despite 330s combat
- **Note:** May be correct design (shield is powerful), needs verification

---

## 🎯 Audit Strategy

### Before You Start

1. **Read IDLE_INVESTIGATION_GUIDE.md first**
   - Understand what to look for
   - Know the common bug patterns
   - Have logging strategy ready

2. **Review logs with idle hypothesis**
   - Look for units stuck at dist > 100u from player
   - Look for speed values in debug log (0, 30, 60, 110, 140)
   - Look for missing movement commands

### During Audit

1. **Start with BATCH 4.1 (Pathfinding)** - It's the CRITICAL path
   - This likely fixes ENEMY_ATTACK_OUT_OF_RANGE issue
   - Affects all units (guards, fighters, creatures)

2. **Then BATCH 4.2 & 4.3 (Target Selection & Combat Range)**
   - Related to pathfinding issue
   - May be distance calculation bug

3. **Then BATCH 1 & 2 (Guard Groups & Non-Guard Fighters)**
   - Look for speed bugs
   - Look for state traps
   - Look for commitment timer issues

4. **Then BATCH 3 (Creatures)**
   - Verify attack initialization fix (attacked=true)
   - Look for pathfinding issues (same as other units)

5. **Document findings as you go**
   - Use DISCREPANCY format: Issue | Design Intent | Current Implementation | Fix
   - Note if it's idle-related

### Enhancement Philosophy

**Goal:** Fix bugs AND improve feel without breaking design

✅ **OK to do:**
- Add logging (no gameplay change)
- Fix speed calculation bugs
- Optimize state transitions (faster response, same outcome)
- Add pathfinding fallbacks
- Reduce commitment timers (0.75s → 0.5s)
- Add distance buffers (30u → 35u)

❌ **Don't do:**
- Remove threat detection
- Change basic speed values
- Remove formation system
- Break design intent

---

## 📍 Code Navigation

### Main AI Code: src/game/game.js

**Guard AI:**
- Formation & positioning: lines 5280-5450
- State machine (IDLE/ACTIVE/RETURN): lines 5620-5700
- Speed enforcement: lines 5745-5752 ✅ FIXED
- Collision detection: lines 5633-5645 ✅ FIXED

**Non-Guard Fighter AI:**
- Role detection & setup: lines ~6500+
- Targeting system: lines ~6800+
- Movement & pathfinding: lines ~7100+

**Creature AI:**
- Creature types & stats: lines ~9000+
- Formation spawning: lines ~9100+
- Attack initialization: lines 9136, 9176 ✅ FIXED (attacked=true)
- Boss mechanics: lines ~9200+

**Shared Systems:**
- moveWithAvoidance(): lines ~3000-3200 (pathfinding)
- nearestEnemyTo(): lines ~3300-3400 (targeting)
- Speed calculations: lines ~3500-3600

**Music System:**
- Music transitions: lines 9137-9154 ✅ FIXED

---

## 🧪 Testing Strategy

After each fix, verify:
1. **Behavior:** Do units actually move/attack now?
2. **Logs:** Do appropriate logs appear?
3. **Damage:** Do enemies deal more damage?
4. **Performance:** Does FPS stay stable?

---

## 📊 Success Metrics

### Current State (Broken)
- ENEMY_ATTACK_OUT_OF_RANGE: 100+ events
- Enemies dealing 0 damage: 40+ units
- AI events: 32 (incomplete)
- Combat effectiveness: ~0%

### Target State (Fixed)
- ENEMY_ATTACK_OUT_OF_RANGE: <10 events (rare edge cases)
- Enemies dealing 0 damage: <5 units (rare failures)
- AI events: 100+ (comprehensive logging)
- Combat effectiveness: >80% (engaging combat)

---

## ⚡ Quick Start Checklist

- [ ] Read IDLE_INVESTIGATION_GUIDE.md
- [ ] Review AI_DESIGN_AUDIT_PLAN.md structure
- [ ] Open src/game/game.js in editor
- [ ] Have logs open (debug-log-1768878845811.txt)
- [ ] Start with BATCH 4.1 (Pathfinding) investigation
- [ ] Add logging as you investigate
- [ ] Test fixes with new game session + logs
- [ ] Document discrepancies found
- [ ] Move to next batch

---

## 📝 Investigation Template

Use this for each todo:

```markdown
## TODO [X.Y]: [Title]

**Status:** IN PROGRESS

### Findings
- Speed stuck at: [VALUE]
- State transitions: [OBSERVATION]
- Pathfinding failures: [COUNT]
- Logging gaps: [WHAT'S MISSING]

### Root Cause
[Likely cause identified]

### Recommendation
[Fix suggestion, design-compliant]

### Code to Change
File: [PATH]
Lines: [X-Y]
Current: [CODE]
Fixed: [CODE]

### Testing Strategy
[How to verify fix works]
```

---

## 🎬 Example Session

### Scenario: Investigating Pathfinding (BATCH 4.1)

1. **Read IDLE_INVESTIGATION_GUIDE.md** (pathfinding section)
2. **Look at debug log** for ENEMY_ATTACK_OUT_OF_RANGE pattern
3. **Open src/game/game.js** to moveWithAvoidance() function
4. **Check:** Is moveWithAvoidance() returning current position unchanged?
5. **Add logging:** `console.log('moveWithAvoidance result:', newPos, 'dist moved:', distance);`
6. **Test with new game + logs** to see if units move
7. **Document finding:** Issue | Design Intent | Implementation | Fix
8. **Implement fix** if needed
9. **Move to BATCH 4.2** (Targeting)

---

## ✨ You're Ready!

Everything is set up. The audit plan is structured, the idle investigation guide is detailed, and the critical context from logs is documented.

**Focus on:** Finding and fixing idle-causing bugs while respecting design intent.

**Primary Hypothesis:** Pathfinding is broken (units can't reach targets), which causes all the downstream issues (combat range failures, no damage, etc.).

Good luck! 🎯

