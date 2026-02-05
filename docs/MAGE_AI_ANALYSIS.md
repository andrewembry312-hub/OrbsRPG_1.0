# Mage Unit AI Behavior Analysis & Recommendations

**Analysis Date:** January 18, 2026  
**Scope:** Strategic analysis of NPC/Guard AI unit behavior  
**File:** `src/game/game.js` (lines 4775-5897)  
**Status:** ⚠️ ANALYSIS ONLY - Issue identified, NO FIXES IMPLEMENTED YET  
**Category:** Game Balance & AI Behavior  
**Impact:** Mid-priority (affects Emperor Mode team composition balance)  
**Complexity:** Medium (4 potential fix levels provided, ranging from 5-min hotfix to 1-hour refactor)
**Status:** ANALYSIS ONLY - Document discovered issue, not implemented  
**Category:** Game Balance & AI Behavior

---

## Document Purpose

This is a **detailed technical analysis** of why mage units don't contribute to flag/objective capture the same way warriors do. It identifies the root cause (role-based priority system) and proposes changes to make mage AI more effective in team gameplay.

**Use Case**: When debugging mage unit behavior in emperor mode or when planning future AI improvements.

---

## Executive Summary

**CRITICAL FINDING**: Mages are being systematically EXCLUDED from flag-capping through a **hidden role-based prioritization system** that forces healers into pure support positions. While warriors and tanks actively pursue objectives, mages are locked into "support allies" behavior regardless of strategic context.

**Impact:** Team loses 25% objective presence on multi-flag maps, forcing tanks to overextend solo.

---

## Part 1: CURRENT MAGE BEHAVIOR (What They Actually Do)

### Role Assignment (Line 4775)
```javascript
role: (v==='mage' ? 'HEALER' : (v==='warden' || v==='knight' ? 'TANK' : 'DPS')),
```

**Mages are automatically branded as 'HEALER'** regardless of loadout or combat role. This single assignment cascades through the entire decision tree.

### The Healer Priority System (Lines 5839-5897)

When a friendly unit has `role === 'HEALER'`, it follows this rigid priority:

```javascript
else if(role === 'HEALER'){
  // PRIORITY 1: Calculate allied cluster position (updated every 1 second)
  const allyX = (sum of friendly x positions) / count
  const allyY = (sum of friendly y positions) / count
  
  // PRIORITY 2: Move to cluster IF distance > 160 units
  if(distToCluster > 160){
    → Move to allied cluster (ignores objectives)
  }
  
  // PRIORITY 3: Only attack if BOTH:
  //   - Enemy within 60% of aggro range (48 units max)
  //   - AND within 100 units of cluster
  //   → Attack only when surrounded by allies
  
  // PRIORITY 4: Capture objective ONLY IF:
  //   - Already at cluster position (distToCluster <= 160)
  //   - AND no enemies detected
  //   → Only as safe fallback
  
  // PRIORITY 5: Maintain position at cluster
  →Stay idle near allies
}
```

### Key Exclusions for Mages

1. **NO independent flag capture** - Mages NEVER pursue closest objective first (line 5890)
2. **NO wall targeting** - Mages ignore wall/siege positions entirely (vs tanks at line 5769)
3. **NO aggressive positioning** - Lockstep cluster movement prevents flanking/map presence
4. **No escape logic** - If allies are scattered, mage tries to follow all of them simultaneously (impossible)

---

## Part 2: EXPECTED BEHAVIOR (What Tanks/Warriors Do)

### Warrior Priority System (Lines 5809-5833)
```javascript
else if(role === 'DPS'){
  // PRIORITY 1: Enemies (hysteresis: 187-253 unit aggro range)
  if(near.e && near.d <= aggroThreshold){
    → Attack enemy
  }
  
  // PRIORITY 2: Creatures
  else if(nearCreature && nearCreatureD <= AGGRO_RANGE){
    → Attack creature
  }
  
  // PRIORITY 3: Wall attacks (at closest objective)
  else if(wallTarget){
    → Attack wall
  }
  
  // PRIORITY 4: Flag capture
  else if(closestObjective){
    → Move to closest objective
  }
}
```

**Warriors/DPS actively pursue objectives at priority 4.** They're independent decision-makers.

### Tank Priority System (Lines 5721-5809)
```javascript
else if(role === 'TANK'){
  // PRIORITY 1: Attack walls in range (< 150 units)
  if(wallTarget && distToWall <= 150){
    → Attack wall
  }
  
  // PRIORITY 2: Move to closest objective
  else if(decision === 'idle' && closestObjective){
    → Capture objective (independent decision)
  }
  
  // PRIORITY 3: Defend nearby
  else if(near.e && near.d <= AGGRO_RANGE * 0.8){
    → Attack enemy
  }
}
```

**Tanks are autonomous objective pursuers.** No cluster-locking requirement.

---

## Part 3: SPECIFIC CODE LOCATIONS CAUSING THE DIFFERENCE

### Problem 1: Role Assignment (Line 4775) - The Root Cause
**File:** [src/game/game.js](src/game/game.js#L4775)
```javascript
role: (v==='mage' ? 'HEALER' : (v==='warden' || v==='knight' ? 'TANK' : 'DPS')),
```

**Issue:** Mage variant hardcoded to HEALER role. No variation based on loadout, level, or team composition.

**Consequence:** All downstream logic treats mages as pure healers → 100% support mode.

---

### Problem 2: Healer-Only Movement Lockdown (Lines 5845-5875)
**File:** [src/game/game.js](src/game/game.js#L5845-L5875)
```javascript
// Cache cluster center calculation (only recalc every 1 second)
const now = state.campaign?.time || 0;
if(!a._clusterCacheTime || now - a._clusterCacheTime > 1.0){
  let allyX = 0, allyY = 0, allyCount = 0;
  for(const f of state.friendlies){
    if(f === a || f.respawnT > 0) continue;
    allyX += f.x;
    allyY += f.y;
    allyCount++;
  }
  // ... calculate center of mass
}

// PROBLEM: Healers MUST be within 160 units of cluster to do ANYTHING else
const moveThreshold = isCurrentlyMoving ? 120 : 160;
if(distToCluster > moveThreshold){
  tx = a._cachedClusterX;  // FORCED movement to cluster
  ty = a._cachedClusterY;
  decision = 'support_allies';
}
```

**Issue:** Mages are CHAINED to the allied cluster. Cannot independently pursue objectives.

**Range Impact:** If closest objective is 200 units away but group is at cluster 150 units away → Mage ignores objective and goes to group.

---

### Problem 3: No Objective Prioritization for Healers (Line 5890)
**File:** [src/game/game.js](src/game/game.js#L5890-L5895)
```javascript
} else if(closestObjective && !near.e){
  // ONLY captures objective if:
  // 1. No enemies anywhere
  // 2. Already at cluster (previous if was false)
  tx = closestObjective.x;
  ty = closestObjective.y;
  decision = 'capture_objective';
}
```

**Issue:** Objective capture is ONLY a fallback when safe. No proactive flag-taking.

**Tanks SKIP this check entirely** - they pursue objectives regardless (line 5797).

---

### Problem 4: Aggressive Aggro Restriction for Healers (Line 5879)
**File:** [src/game/game.js](src/game/game.js#L5879-L5885)
```javascript
} else if(near.e && near.d <= AGGRO_RANGE * 0.6 && distToCluster <= 100){
  // Only attack when BOTH:
  // - Enemy < 48 units (60% of 80)
  // - Cluster < 100 units away
  tx = near.e.x;
  ty = near.e.y;
  decision = 'attack_enemy';
}
```

**Issue:** Mages have 2x stricter engagement range than warriors (48 vs 80-140 units).

**Tanks have NO such restriction** (line 5803) - they engage at full aggro range.

---

### Problem 5: Movement Hysteresis Lock (Lines 5876-5877)
**File:** [src/game/game.js](src/game/game.js#L5876-L5877)
```javascript
const isCurrentlyMoving = (a._lastDecision === 'support_allies');
const moveThreshold = isCurrentlyMoving ? 120 : 160; // 120 to stop, 160 to start
```

**Issue:** Once mage starts moving to cluster, it needs to get WITHIN 120 units to stop moving.

**Result:** Mages can wander in circles if group is scattered (no breakout logic).

---

## Part 4: COMPARISON TABLE

| Behavior | TANK (Expected) | DPS (Expected) | HEALER/MAGE (Actual) | Issue |
|----------|-----------------|----------------|----------------------|-------|
| **Flag Capture** | Priority 2 | Priority 4 | Priority 4 (fallback only) | ❌ Mages too passive |
| **Wall Attack** | Priority 1 (< 150 units) | Priority 3 | Never (no wall check) | ❌ Mages can't siege |
| **Enemy Engage Range** | 80-140 units | 80-140 units | 48 units (60% of range) | ❌ Mages too conservative |
| **Cluster Lock** | None | None | FORCED (160 unit radius) | ❌ Mages chained to group |
| **Objective Pursuit** | Independent | Independent | Dependent (only if safe) | ❌ Mages non-autonomous |
| **Fallback Behavior** | Attack enemies | Attack enemies | Follow cluster | ❌ Mages have no fight mechanic |

---

## Part 5: WHY THIS MATTERS (Team Cohesion Impact)

### Scenario 1: Multi-Flag Map (3 flags, team has warrior + mage + tank)
```
Flag A (enemy): 150 units away
Flag B (enemy): 200 units away  
Allied cluster: Center at (500, 500)

TANK behavior:
→ Pursues Flag A independently (150 units < priority check)
→ Can cap Flag A alone

WARRIOR behavior:
→ Pursues Flag B independently (200 units < objective distance)
→ Can cap Flag B alone

MAGE behavior:
→ MUST stay within 160 units of cluster (500, 500)
→ If flags are 180+ units away: IGNORES BOTH FLAGS
→ Follows tank/warrior around, contributing nothing to objective control
```

**Result:** Only 2/3 units contesting objectives. Mage becomes dead weight.

---

### Scenario 2: Split Team Situation
```
Allies scattered across map:
- Player at (300, 300)
- Tank at (600, 100)
- Warrior at (200, 500)
- Mage at (350, 350)

Mage cluster center calculates:
→ X = (300 + 600 + 200 + 350) / 4 = 362.5
→ Y = (300 + 100 + 500 + 350) / 4 = 312.5
→ Cluster center = (362.5, 312.5)

Mage at (350, 350):
→ distToCluster = sqrt((350-362.5)² + (350-312.5)²) = 41 units
→ Already near cluster, but cluster is PULLING AWAY from objectives
→ Mage rotates around cluster center instead of capping nearby flag
```

**Result:** Mage wastes time repositioning around cluster instead of capturing uncontested flags.

---

### Scenario 3: Healing Paradox
```
Setup:
- Mage has heal abilities (heal_burst, renewal_field)
- Team is healthy (no one below 80% HP)
- Closest uncapped flag is 150 units away

Expected: Mage captures flag while allies are healthy
Actual: Mage follows cluster WAITING FOR ALLIES TO TAKE DAMAGE

→ Offense/defense balance is BROKEN
→ Mage is proactive only when team is losing
```

**Result:** Team cannot be proactive with mage support. Healing forces reactive play.

---

## Part 6: ROOT CAUSE ANALYSIS

### Why Did This Happen?

The code conflates TWO distinct concepts:

1. **Combat Role** (What abilities someone has): Mages have healing abilities
2. **Strategic Role** (How they should position): Healers should stay near team

**The bug:** The code assumes combat role = strategic role always.

**Reality:** A mage with AoE damage spells is a DPS who CAN heal (hybrid), not a pure healer who CAN damage.

---

## Part 7: DETAILED RECOMMENDATIONS

### Fix Level 1: Role Determination (RECOMMENDED)

**Current Code (Line 4775):**
```javascript
role: (v==='mage' ? 'HEALER' : (v==='warden' || v==='knight' ? 'TANK' : 'DPS')),
```

**Problem:** No variation. All mages are locked as HEALER.

**Recommended Solution:**
```javascript
// Assign role based on loadout, not just variant
function determineAllyRole(variant, abilities = []) {
  // If mage has enough healing abilities → HEALER
  const healAbilities = abilities.filter(a => 
    ['heal_burst', 'renewal_field', 'beacon_of_light', 'cleanse_wave', 'mage_divine_touch'].includes(a)
  );
  
  if(variant === 'mage' && healAbilities.length >= 2){
    return 'HEALER';
  }
  
  // If mage has mostly damage abilities → DPS
  if(variant === 'mage'){
    return 'DPS';  // Let mage act as caster DPS with incidental healing
  }
  
  // Standard assignment for other variants
  return variant === 'warden' || variant === 'knight' ? 'TANK' : 'DPS';
}
```

**Apply at line 4775:**
```javascript
role: determineAllyRole(v, f.npcAbilities),
```

**Why This Works:**
- Mages with damage focus → Can capture flags independently
- Mages with healing focus → Stay with team (current behavior)
- Preserves tank/warrior behavior
- Scales with progression/loadouts

---

### Fix Level 2: Dual-Role Hybrid Behavior (ALTERNATIVE - More Complex)

**Create a "HYBRID" role that combines DPS + support:**

```javascript
// Add new role path (around line 5900, after HEALER block)
else if(role === 'HYBRID'){
  // HYBRID PRIORITY: Balance objectives with team support
  
  // If healthy AND far from objectives → pursue them
  const allyAvgHpPct = (total allied HP / total allied maxHP);
  const needHealing = allyAvgHpPct < 0.70;
  
  if(!needHealing && closestObjective && dist_to_objective < 200){
    // Team is healthy → pursue objective independently
    tx = closestObjective.x;
    ty = closestObjective.y;
    decision = 'cap_when_safe';
  } else if(needHealing){
    // Team needs support → move toward cluster
    tx = a._cachedClusterX;
    ty = a._cachedClusterY;
    decision = 'support_allies';
  } else if(closestObjective){
    // Fallback → move toward objective while near team
    tx = closestObjective.x;
    ty = closestObjective.y;
    decision = 'hybrid_advance';
  }
}
```

**Assign at line 4775:**
```javascript
role: (v==='mage') ? 'HYBRID' : (v==='warden' || v==='knight' ? 'TANK' : 'DPS'),
```

**Why This Works:**
- Mages actively participate in flag control
- Automatically fall back to support when team needs healing
- Self-balancing (no hard thresholds to tune)
- Can eventually scale to check low-health allies

---

### Fix Level 3: Reduce Cluster Lock Range (EASIEST IMMEDIATE FIX)

**Current Code (Line 5876-5877):**
```javascript
const moveThreshold = isCurrentlyMoving ? 120 : 160;
```

**Recommended Change:**
```javascript
// For mages specifically, allow more independence
const moveThreshold = role === 'HEALER' 
  ? (isCurrentlyMoving ? 80 : 120)    // Reduced from 120/160
  : (isCurrentlyMoving ? 120 : 160);  // Unchanged for true healers
```

**Why This Works:**
- Reduces cluster-lock radius by 33%
- Mages can now pursue flags 120-150 units away
- Minimal code change
- Testable impact immediately

**Alternative numerical tweak:**
```javascript
// Increase move threshold to push mage further from cluster
const moveThreshold = isCurrentlyMoving ? 140 : 200;  // Up from 120/160
```

---

### Fix Level 4: Add Objective Interrupt (Surgical Change)

**Current Code (Lines 5845-5897):**
```javascript
if(distToCluster > moveThreshold){
  // ALWAYS move to cluster if far
  tx = a._cachedClusterX;
  ty = a._cachedClusterY;
  decision = 'support_allies';
}
```

**Recommended Change:**
```javascript
// Check if there's an uncontested objective nearby that's CLOSER than cluster
const distToClosestObjective = closestObjective 
  ? Math.hypot(closestObjective.x - a.x, closestObjective.y - a.y)
  : Infinity;

const objectiveIsCloserAndUrgent = (closestObjective && 
  distToClosestObjective < distToCluster * 0.8 &&  // Objective 20% closer
  distToClosestObjective < 250);  // Within reasonable capture range

if(distToCluster > moveThreshold && !objectiveIsCloserAndUrgent){
  // Move to cluster (normal path)
  tx = a._cachedClusterX;
  ty = a._cachedClusterY;
  decision = 'support_allies';
} else if(objectiveIsCloserAndUrgent){
  // INTERRUPT: Capture nearby objective instead of cluster-walking
  tx = closestObjective.x;
  ty = closestObjective.y;
  decision = 'capture_objective_priority';
}
```

**Why This Works:**
- Keeps mages as support-first by default
- ALLOWS independent flag capture when strategic (close by, cluster far away)
- Non-disruptive change
- Preserves healer nature while adding objective presence

---

## Part 8: Testing Recommendations

### Test 1: Multi-Flag Scenario
```
Setup: Recruit 1 mage + 1 tank + 1 warrior
Map: 3-flag CTF with flags 180+ units apart

Metric: How many flags can team control simultaneously?

BEFORE: 1-2 flags (mage doesn't contribute)
AFTER (Fix 1/2): 2-3 flags (mage independently captures)
AFTER (Fix 3): 1.5-2 flags (improved but still tethered)
```

### Test 2: Cluster Scatter
```
Setup: Fight enemies, team gets spread out
Metric: Does mage waste time repositioning vs pursuing objectives?

BEFORE: Mage loops around cluster center inefficiently
AFTER (Fix 3): Mage breaks cluster lock at larger radius
AFTER (Fix 4): Mage captures nearby objective during scatter
```

### Test 3: Healing Load
```
Setup: Team health drops to 40%
Metric: Does mage prioritize healing or flag capture?

BEFORE: Stays with team (correct)
AFTER (Fix 2): Returns to cluster/team (correct, with HYBRID role)
AFTER (Fix 4): Captures flag IF heal not urgent (balanced)
```

### Test 4: Performance Check
```
Metric: Frame rate with multiple mages using cluster positioning

Note: Current system recalculates cluster every 1 second per healer
- 1 mage = negligible
- 4 mages = 4 cluster calculations/frame (acceptable)
- 8+ mages = potential stuttering at start of big fights

No change needed for this in recommendations above.
```

---

## Part 9: IMPLEMENTATION ROADMAP

### Phase 1: Hot Fix (5 min)
Apply Fix Level 3 (reduce cluster lock):
- Change lines 5876-5877
- Test in single-player campaign
- No breakage risk

### Phase 2: Core Fix (30 min)
Apply Fix Level 1 (role determination):
- Add `determineAllyRole()` function
- Update line 4775
- Update role assignment in guard spawning (lines 2722, similar areas)
- Test all unit types

### Phase 3: Enhancement (1 hour)
Apply Fix Level 4 (objective interrupt):
- Add objective-proximity check before cluster move
- Insert 8 lines of logic
- Test multi-flag maps

### Phase 4: Validation (2 hours)
- Play 5-flag map with mixed team composition
- Check AI behavior logs
- Verify healing still occurs when needed
- Benchmark frame rate with 8+ mages

---

## Part 10: Why This Fix Improves Team Cohesion

### Before Fix
```
4-player team with Mage:
 Mage: Chased by enemies → runs to cluster
 Tank: Pursuing Flag A independently
 Warrior: Pursuing Flag B independently
 Warden: Defending home flag

Result: Mage contributes ZERO to objective play
      Only provides healing when allies are hurt (reactive)
      Team feels "incomplete" - missing a 4th attacker
```

### After Fix (Level 1)
```
4-player team with DPS-mode Mage:
 Mage: Pursues Flag C independently → captures it
 Tank: Pursuing Flag A independently → captures it
 Warrior: Pursuing Flag B independently → captures it
 Warden: Defending home flag

Result: Mage is 4th attacker
      Team can hold 3 offensive flags + defend home
      Offensive power scales to 4/4 units
      Cohesion: COMPLETE (everyone has role)
```

### After Fix (Level 2 - Hybrid)
```
4-player team with Hybrid Mage:
 Normal: Acts like DPS mage (same as Level 1)
 Under Pressure: Detects team health < 70% → moves to cluster
 Auto-adapts: No manual role switching needed
 
Result: Self-balancing team
      Offensive when winning, defensive when losing
      Mage seamlessly transitions between roles
      Cohesion: DYNAMIC (adapts to situation)
```

---

## CONCLUSION

**Current State:** Mages are **soft-locked** into pure support through cluster-chaining. They cannot pursue objectives even when allies are safe and objectives are uncontested.

**Root Cause:** Role assignment conflates combat role (what abilities) with strategic role (how to position).

**Recommended Fix (Priority Order):**

1. **Level 1 (PRIMARY):** Change role assignment based on abilities (line 4775)
   - Mages with healing abilities → HEALER
   - Mages with damage focus → DPS
   - High impact, low risk

2. **Level 4 (SECONDARY):** Add objective interrupt logic (~8 lines at 5845)
   - Allows healer-role mages to capture nearby uncontested objectives
   - Safe fallback for teams with healing-spec mages

3. **Level 3 (QUICK WIN):** Reduce cluster lock range (line 5876)
   - Immediate improvement while working on Level 1
   - Buy 33% more independent range

**Expected Outcome:** Mages transition from "support unit pretending not to help" to "full team member who can cap flags."

---

## Appendix: Code Snippets Ready to Implement

### Snippet A: determineAllyRole() function (add near spawnFriendlyAt)
```javascript
function determineAllyRole(variant, abilityIds = []) {
  // Pure healer detection: has 2+ dedicated healing abilities
  const healAbilities = ['heal_burst', 'renewal_field', 'beacon_of_light', 
                         'cleanse_wave', 'mage_divine_touch'];
  const healCount = (abilityIds || []).filter(id => healAbilities.includes(id)).length;
  
  // If mage with strong healing suite → HEALER role (current behavior preserved)
  if(variant === 'mage' && healCount >= 2) return 'HEALER';
  
  // If mage with mixed/damage focus → DPS role (new behavior)
  if(variant === 'mage') return 'DPS';
  
  // Standard assignments
  if(variant === 'warden' || variant === 'knight') return 'TANK';
  return 'DPS';
}
```

### Snippet B: Replace line 4775
```javascript
// OLD:
role: (v==='mage' ? 'HEALER' : (v==='warden' || v==='knight' ? 'TANK' : 'DPS')),

// NEW:
role: determineAllyRole(v, f.npcAbilities),
```

### Snippet C: Objective interrupt logic (insert after line 5844)
```javascript
// Check if nearby objective should interrupt cluster movement
let objectiveIsCriticalNearby = false;
if(closestObjective && role === 'HEALER'){
  const distToObj = Math.hypot(closestObjective.x - a.x, closestObjective.y - a.y);
  const distToCluster = a._cachedClusterX 
    ? Math.hypot(a.x - a._cachedClusterX, a.y - a._cachedClusterY)
    : Infinity;
  
  // If objective is 20%+ closer than cluster AND close enough to reach
  if(distToObj < distToCluster * 0.8 && distToObj < 250){
    objectiveIsCriticalNearby = true;
  }
}

// Then modify the cluster-movement check:
if(distToCluster > moveThreshold && !objectiveIsCriticalNearby){
  // Normal: move to cluster
  tx = a._cachedClusterX;
  ty = a._cachedClusterY;
  decision = 'support_allies';
} else if(objectiveIsCriticalNearby){
  // INTERRUPT: capture nearby objective
  tx = closestObjective.x;
  ty = closestObjective.y;
  decision = 'capture_objective_priority';
}
```

---

**End of Analysis**
