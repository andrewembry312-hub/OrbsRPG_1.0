# Three-Phase Diagnostic Plan - Ready to Execute

## Status

You now have **everything needed** to unblock the coordinate mystery and validate the crown system in actual gameplay.

---

## What You Have

### Files Created
- ✅ **coordinate-sanity.js** - Proves/disproves coordinate space mismatch
- ✅ **hp-audit.js** - Central pipeline for every HP change
- ✅ **crown-debug.js** - Toggleable logging for crown behavior

### Files Updated
- ✅ **game.js** - Imports added for all three systems

### Documentation
- ✅ **PHASE1_QUICK_START.md** - Standalone console commands (run right now)
- ✅ **PHASE123_INTEGRATION_GUIDE.md** - Where to add calls in game.js
- ✅ **DIAGNOSTIC_CHEAT_SHEET.md** - Copy-paste functions and expected outputs

---

## The Three-Phase Plan

### Phase 1: Prove the Coordinate Bug (2 minutes)

**What**: Run a console diagnostic to see if entities and flags are in different coordinate spaces.

**Why**: This is the blocker. If coordinates are wrong, all distance-based logic (AI, abilities, ranges) is broken.

**How**: 
1. Start the game
2. Open browser console
3. Paste the code from **PHASE1_QUICK_START.md**
4. Screenshot the output

**Proof you'll get**:
- If `dEF < 500` → Coordinates are fine, move to Phase 2
- If `dEF > 1000` → Mismatch! The ranges table tells us which space is wrong

### Phase 2: Wire HP Audit (10 minutes)

**What**: Replace scattered `target.hp +=` statements with tracked `auditHeal()` / `auditDamage()` calls.

**Why**: The 1808 HP jump in logs is untraced. Once everything goes through the audit, the source becomes visible.

**How**:
1. Find the lowest-level HP application function(s)
2. Replace 3-4 key places with audit wrappers
3. Turn on auditing from console
4. Play for 10 seconds
5. Check the log for the mysterious HP jump

**Proof you'll get**:
- `summary.largeJumps: []` → No mystery HP (clean!)
- `summary.largeJumps: [{ delta: 1808, reason: '...' }]` → Found the source!

### Phase 3: Wire Crown Debug (15 minutes)

**What**: Add 4 logging calls at crown pickup, drop, chase, and ability casting.

**Why**: Can't validate the 5 crown fixes are actually firing without seeing crown events.

**How**:
1. Import the crown-debug module (already added to game.js)
2. Add `logCrownState()` calls in pickup/drop logic
3. Add `logGuardCrownChase()` call in chase detection
4. Add `logGuardAbilityTarget()` call in ability override
5. Turn on crown debug from console
6. Pick up crown, hold for 5 seconds, drop
7. Check the events log

**Proof you'll get**:
- `stateChanges: 2, chaseEvents: 3, abilityEvents: 8` → System working!
- `chaseEvents: 0, abilityEvents: 0` → Chase/override not firing (debugging needed)

---

## Priority Order (Why This Matters)

1. **Phase 1 must happen first** — If coordinates are wrong, everything else looks broken even if it's wired correctly
2. **Phase 2 second** — Once coordinates are proven, you can validate healing/damage isn't phantom
3. **Phase 3 last** — Once HP is clean, you can prove crown system is working

---

## What Happens After Each Phase

### After Phase 1
- If coordinates good → "Great, that's not the issue, let's check HP tracking"
- If coordinates bad → "This pipeline is in wrong space: X. Here's how to fix it"

### After Phase 2
- If no phantom HP → "HP system is clean, those 1808 units were accounted for"
- If phantom HP found → "Here's the code path causing it, here's why it's wrong"

### After Phase 3
- If all events logging → "Crown system is wired correctly, fixes are firing"
- If no events logging → "Chase/override block isn't reaching, here's why"

---

## Right Now

**DO THIS**:
1. Open game
2. Paste the code from **PHASE1_QUICK_START.md** into console
3. Screenshot the output
4. Paste here: "Here's what I got: ..."

That one action unlocks everything else. The output tells us exactly what's wrong and how to fix it.

---

## FAQ

**Q: Do I need to modify game.js before Phase 1?**
No. Phase 1 is 100% standalone console commands. No code changes needed.

**Q: What if coordinates look fine?**
Then Phase 2 (HP audit) becomes the priority. The mystery 1808 HP jump is still real and worth tracking.

**Q: Can I skip to Phase 3?**
Not recommended. Phase 1 tells us if distance-based logic is even viable. Phase 3 (crown system) depends on Phase 1 being resolved.

**Q: How long does all three phases take?**
- Phase 1: 2 minutes (one console paste)
- Phase 2: 10 minutes (4-5 code replacements, test)
- Phase 3: 15 minutes (add 4 log calls, test)
- Total: ~30 minutes to complete validation

**Q: What if Phase 1 shows a mismatch?**
I'll tell you exactly which pipeline is wrong (enemy spawning vs flag init vs movement integration vs camera leak) and how to fix it. Could be 1-line fix, could be scope issue—the ranges table shows which.

---

## Trust Factor

I'm **not claiming** to see your code anymore. I'm asking you to run console diagnostics that **you** can see and screenshot. Then I can give specific fixes based on your actual data, not my claimed verifications.

The diagnostics are:
- ✅ Minimal (standalone functions, no dependencies)
- ✅ Non-destructive (read-only, don't modify game state)
- ✅ Immediate (run once, get answer in 10 seconds)
- ✅ Verifiable (you can screenshot the output)

---

## Next Action

**Run Phase 1 right now.** Paste from PHASE1_QUICK_START.md, screenshot, report back.

Everything else depends on that one data point.
