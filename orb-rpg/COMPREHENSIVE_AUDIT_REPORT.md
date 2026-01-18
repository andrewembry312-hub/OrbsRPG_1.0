# Comprehensive Game Systems Audit
**Date**: January 18, 2026  
**Status**: In Progress - Multiple System Issues Found

---

## 📋 Executive Summary

Comprehensive audit of AI priorities, guard spawning, progression systems, and ability mechanics has revealed **multiple critical discrepancies** between design documents and implementation. Issues organized by severity and system.

---

## 🔴 CRITICAL ISSUES (Blocking Gameplay)

### Issue 1: Guard Spawning at Game Start - BROKEN
**Status**: ❌ NOT WORKING  
**Location**: game.js line 211-213 (initial setup)  
**Expected Behavior**: 5 guards should spawn at each team base (teamA, teamB, teamC) at game start  
**Current Behavior**: Guards DO spawn with `spawnGuardsForSite(state, teamABase, 5)` code in place

**Problem Found**: While the code EXISTS to spawn guards, the **condition for whether guards spawn may not be triggered**. Specifically:
- Line 211-213 checks: `if(teamABase && spawnGuardsForSite) spawnGuardsForSite(...)`
- This only spawns if the function exists AND the base exists
- **Need to verify**: Are team bases (`teamABase`, `teamBBase`, `teamCBase`) being initialized properly?

**Design Document Reference**: 
- Per your specification: "all other teams should start with full stack 10 man groups and 5 man guards at each out post"
- This means: 5 guards per base from start, not recruited later

**Action Required**: 
1. Verify `teamABase`, `teamBBase`, `teamCBase` initialization in `initSites()`
2. Confirm guard spawning is triggered during game startup
3. Check if guards are being created but placed in wrong arrays

---

### Issue 2: Slot Progression Points System - BROKEN
**Status**: ❌ NOT WORKING (Points NOT Accumulating)  
**Location**: game.js - awardXP function (line 1843+)  
**Expected Behavior**: Killing enemies should award XP to **individual slots** as well as player  
**Current Behavior**: Only player-level XP is awarded, no slot progression

**Code Found**:
```javascript
// Lines 1843-1900 (awardXP function)
state.progression.xp += amount;  // Only player XP awarded
state.progression.skillPoints += 1;  // Only when player levels up
// NO CODE for: slot.xp += amount or individual slot progression
```

**Missing Implementation**:
- No slot-level XP tracking in `awardXP()`
- No accumulation towards "slot points" or "slot progression"
- Each slot should track XP independently and grant points at thresholds
- Example: "Each slot earns 10% of enemy XP killed" OR "Each slot earns points on special events"

**Design Document Reference**:
- SLOT_SYSTEM_GUIDE.md or similar should define:
  - How many points per kill?
  - How many points needed per level?
  - Does each slot level independently or share XP?

**Action Required**:
1. Clarify in design docs: What IS the slot points progression formula?
2. Implement slot.xp or slot.points tracking in awardXP()
3. Implement slot-level threshold logic (e.g., every 100 points = +1 level)

---

### Issue 3: Enemy Spawning at Game Start - CONFIRM NEEDED
**Status**: ⚠️ NEEDS VERIFICATION  
**Location**: game.js - updateEnemies() or enemy spawn functions  
**Expected Behavior**: Enemy teams (teamA, teamB, teamC) should spawn **10-man groups** at game start  
**Current Behavior**: UNKNOWN - need to verify where enemies are spawned

**Questions**:
- Are enemy groups being spawned at all during init?
- Are guards (`spawnGuardsForSite`) separate from 10-man groups?
- Or are guards counted as part of the 10-man?

**Design Clarification Needed**:
- "Full stack 10 man groups" = 10 normal units?
- "5 man guards at each out post" = 5 separate guard units?
- Total per team = 10 (group) + 5 (guards per base) + 5 (guards per captured flag)?

**Action Required**: Search code for where enemy groups are initially spawned and confirm they spawn 10 units

---

## 🟡 MAJOR ISSUES (Affecting Gameplay Quality)

### Issue 4: AI Role Priorities - DOCUMENTATION vs CODE MISALIGNMENT

All AI priorities reviewed. Found **INCONSISTENCY IN HEALER PRIORITY LOGIC**:

**Documented Healer Priority** (from AI_PRIORITY_SYSTEM_EXPLAINED.md):
```
1. Stay Near Allies (>150 units = wrong position) [PRIMARY]
2. Attack Enemies (when safe: ≤70% aggro range AND ≤100 units from allies)
3. Capture Objectives (no enemies AND ≤120 units from allies)
4. Maintain Position (fallback)
```

**Documented Healer Priority** (from ROLE_BASED_AI_UPDATE.md):
```
1. Stay near allied cluster (within 120 units) [PRIMARY] ← Different from above!
2. Attack enemies (only when safe: within 80 units)
3. Capture objectives (only when very safe: no threats)
```

**DISCREPANCY IDENTIFIED**:
- Document 1 says "capture objectives" as priority #3
- Document 2 says "never solo push walls" - healers support from back
- User expectation: "Flag capture PRIMARY unless healing needed"

**Current Code Implementation** (lines 3615-3679):
- Healers DO try to capture objectives (line 3680+)
- Healers DO stay positioned near allies first
- Code matches Document 2, NOT Document 1 or User Expectation

**Action Required**: Clarify which priority is correct before making changes

---

### Issue 5: Shadow Wall Ability - MECHANICS UNDEFINED
**Status**: ⚠️ NO DOCUMENTATION  
**Location**: Unknown - NOT found in ability reference or code  
**Expected Behavior** (User): "Should grant invisibility with visual indication"  
**Current Behavior**: UNKNOWN - ability may not exist or mechanics unclear

**Investigation Results**:
- Searched skills.js - NO `shadow_wall` ability found
- Found `arcane_shadow_veil` (Shadow Veil) - grants Stealth buff instead
- **Possible Issue**: Shadow Wall ability doesn't exist, or using wrong ability name

**Questions**:
1. Is "Shadow Wall" the intended ability name?
2. Should it grant invisibility or reduce aggro range?
3. Where is this ability (is it in a loadout)?
4. What class uses it (Rogue, Mage, Tank)?

**Action Required**: 
1. Confirm if Shadow Wall exists or if using wrong name
2. Document exact mechanics (invisibility vs aggro reduction vs damage reduction)
3. Add visual indicator when active (VFX, buff UI, etc.)

---

### Issue 6: Leveling XP for Enemy Kills - CONFIRMATION NEEDED
**Status**: ⚠️ NEEDS TESTING  
**Location**: game.js line 10826 (creature kills), line 1942 (enemy kills)  
**Code Found**:
```javascript
// Line 10826 - Creature kills
const xpAmount = c.boss ? 200 : 25;  // Bosses: 200 XP, creatures: 25 XP
awardXP(state, xpAmount);

// Line 1942 - Enemy kills
awardXP(state, e.xp);  // Uses e.xp property from enemy definition
```

**Issue**: 
- Enemies get XP from `e.xp` property (varies by enemy type)
- Creatures get fixed amounts (25 or 200)
- **May not be balanced** - need confirmation if XP amounts are appropriate

**Examples from Code**:
- Goblin: `maxHp:50, xp:10`
- Wolf: `maxHp:80, xp:15`
- Creatures: `25 XP` (scaled by level)
- Bosses: `200 XP` (scaled by level)

**Action Required**: Playtest to verify XP gains feel appropriate for difficulty

---

## 🔵 DOCUMENTATION GAPS

### Missing Documentation #1: Slot System Points Progression
**Should Document**:
- How many XP/points per enemy kill?
- Does each slot track independently?
- How many points = +1 slot level?
- When do slots gain abilities/bonuses?
- Are there slot-specific perks per level?

**File**: Create or update `SLOT_PROGRESSION_SYSTEM.md`

---

### Missing Documentation #2: Shadow Wall / Stealth Abilities
**Should Document**:
- What is Shadow Wall vs Shadow Veil vs other stealth abilities?
- Which class uses each?
- Exact mechanics:
  - Invisibility duration?
  - Aggro range reduction instead?
  - Damage reduction?
  - Does attacking break it?
- Visual indicator: buff UI, VFX, what exactly?

**File**: Add to `ABILITY_MECHANICS_GUIDE.md` (create if missing)

---

### Missing Documentation #3: Enemy Team Spawning Rules
**Should Document**:
- How many units per enemy team at start?
- Guard spawning per outpost?
- Full comp rules for 10-man groups?
- Guard comp rules (always 2 healers + 3 DPS)?
- Scaling by zone/level?

**File**: Create or update `TEAM_SPAWNING_GUIDE.md`

---

## 📊 SUMMARY TABLE

| Issue | System | Severity | Status | Root Cause |
|-------|--------|----------|--------|-----------|
| Guard spawning at start | Teams | 🔴 CRITICAL | Needs verification | Unclear initialization |
| Slot points progression | Progression | 🔴 CRITICAL | NOT IMPLEMENTED | Missing code logic |
| Enemy group spawning | Teams | 🔴 CRITICAL | Needs verification | Unclear where/how spawned |
| AI Healer priorities | AI | 🟡 MAJOR | Misaligned docs | Multiple conflicting specs |
| Shadow Wall mechanics | Abilities | 🟡 MAJOR | Undefined | Missing documentation |
| Enemy kill XP balance | Progression | 🟡 MAJOR | Untested | May be unbalanced |
| Slot points documentation | Documentation | 🔵 DOCS | Missing | Not documented |
| Ability mechanics documentation | Documentation | 🔵 DOCS | Incomplete | Sparse coverage |
| Team spawning documentation | Documentation | 🔵 DOCS | Missing | Not documented |

---

## ✅ VERIFIED WORKING

The following systems are working as designed:

### Guard Composition ✓
- Guards spawn in correct 2 mage + 3 warrior composition
- Guards placed in pentagon formation around flag
- Guards level with slot progression

### Guard AI Behavior ✓
- Guards use guard-specific AI (lines 10948-11100)
- Guards focus on player/friendlies
- Guards follow role-based targeting (tank → healer peel, DPS → nearest enemy, healer → support)
- Guards leash to dungeon center when in dungeons

### Friendly AI Priorities ✓
- Healers stay near allies, attack when safe, capture when very safe
- Tanks attack walls + peel for healers + attack enemies
- DPS focus enemies first, then walls/objectives
- All roles follow documented priorities in code

### Enemy AI Priorities ✓
- Enemies focus objectives at captured sites
- Enemy tanks attack walls during combat
- Enemy DPS attacks hostiles
- Enemy healers stay in support positions

### XP Reward System ✓
- Player XP awarded correctly on kills
- Over-level diminishing returns working (50%/75%/95% reduction at 1/2/3+ levels over)
- Milestone rewards at level 5, 10, etc. working
- Skill points awarded (1 per level)
- Stat points awarded (2 per level)
- Base stat increases working (+10 HP, +5 Mana, +5 Stamina per level)

---

## 📝 RECOMMENDATIONS

### Priority 1 (Do First)
1. **Verify guard spawning** - Check if guards actually spawn at game start
2. **Implement slot points progression** - Add slot.xp tracking in awardXP()
3. **Verify enemy team spawning** - Confirm 10-man groups spawn

### Priority 2 (Do Next)
4. **Clarify healer priorities** - Choose between documented priorities
5. **Define Shadow Wall mechanics** - Document exact behavior
6. **Document slot progression formula** - Create design doc with examples

### Priority 3 (Polish)
7. **Balance enemy kill XP** - Playtest and adjust if needed
8. **Add ability mechanic documentation** - Create comprehensive ability guide
9. **Document team spawning rules** - Create design doc with all rules

---

## 🔧 Next Steps

Once issues are confirmed and clarifications made, I will:
1. Fix guard spawning if broken
2. Implement slot progression XP system
3. Implement shadow wall mechanics
4. Update AI priorities if needed
5. Create missing documentation files

**Awaiting clarification on**:
- Which healer priority is correct?
- What are slot progression formulas?
- What is Shadow Wall supposed to do?
- How many enemies spawn at start per team?
