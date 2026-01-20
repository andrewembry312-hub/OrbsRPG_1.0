# AI Behavior Design Audit & Implementation Review

**Date:** January 19, 2026  
**Scope:** Guard Groups, Non-Guard Fighters, Creatures  
**Status:** STARTING COMPREHENSIVE REVIEW  
**Total Todos:** 24 (organized in 6 batches)

---
## 📖 CRITICAL READING MATERIAL

Before starting audits, read this investigation guide:
- **[IDLE_INVESTIGATION_GUIDE.md](IDLE_INVESTIGATION_GUIDE.md)** - Comprehensive approach to finding idle/frozen unit bugs
  - Speed bug investigation
  - State machine traps
  - Pathfinding stalls
  - Targeting stalls
  - Cooldown/recovery locks
  - Enhancement opportunities (design-compliant)

---
## 🔴 CRITICAL FINDINGS FROM LOGS

### Session Data (1/19/2026, 10:14:05 PM)
- **Game Time:** 330 seconds (~5.5 minutes)
- **Player Level:** 4
- **Total Debug Events:** 27,315
- **Console Errors:** 0 ✅
- **Player Damage Dealt:** 1,274
- **Total Combat Events:** 101

### MAJOR ISSUES IDENTIFIED

#### Issue #1: Enemy Attacks Out of Range (CRITICAL)
- **Count:** 100+ events logged
- **Pattern:** Enemies constantly attacking from 700-2000+ units away
- **Required Range:** 28-31 units
- **Actual Distances:** 428-2020 units
- **Impact:** NO ACTUAL DAMAGE (all blocked by shields/distance)
- **Root Cause:** Pathfinding broken or targeting broken

#### Issue #2: Enemies Deal Minimal/Zero Damage (CRITICAL)
- **Damage Report:** 40+ enemies with 0 damage dealt
- **Only 6 enemies dealing damage:** warrior (100, 91, 64), mage (75, 60), warden (56)
- **34 enemies:** dealing 0 damage
- **Pattern:** Long out-of-range gaps → enemies never reach player
- **Player Takes:** Only shield damage (no health damage in session)

#### Issue #3: AI Behavior Showing Gaps (IMPORTANT)
- **AI Behavior Log:** Only 32 events in 330 seconds
- **Cast Priority:** Warriors showing "cast-prio" (17 times)
- **Low Activity:** Wardens (4 events), Knights (3 events), Mages (2 events)
- **Missing:** No movement logs, no positioning logs, no target selection logs
- **Conclusion:** AI either not running or not logging properly

---

## 🔴 IDLE INVESTIGATION FOCUS

**Critical Audit Priority:** Units appearing idle when they should be active combat.

## What to Look For:

### Speed Bugs (Highest Priority)
- ⚠️ Speed set to 0 when should be 110-140 (follow/sprint)
- ⚠️ Speed calculations returning wrong values
- ⚠️ Speed cap logic preventing correct speed
- ⚠️ Speed transition delays (0→30→60→110→140 should be smooth)
- ⚠️ Movement lockouts preventing speed increases

### Idle State Traps
- ⚠️ Units stuck in IDLE_DEFENSE when should be ACTIVE
- ⚠️ State transitions blocked by failed conditions
- ⚠️ Commitment timers preventing action (1.0s too long?)
- ⚠️ Cooldown lockouts after abilities (recovery lockout issues)
- ⚠️ Mana/stamina checks preventing ability use

### Pathfinding Stalls
- ⚠️ moveWithAvoidance() returning [x,y] that equals current position
- ⚠️ Angular sampling not finding valid paths
- ⚠️ Obstacle detection too aggressive (treating valid areas as blocked)
- ⚠️ Destination unreachable → movement command fails silently

### Target/Decision Stalls
- ⚠️ Target acquisition failing (nearestEnemyTo returns null)
- ⚠️ Distance checks killing engagements prematurely
- ⚠️ Retargeting loops preventing commitment
- ⚠️ Priority scoring broken (all priorities equal)

### Movement Command Issues
- ⚠️ move() called but ignores command (speed=0 override)
- ⚠️ moveWithAvoidance() silently failing
- ⚠️ Animation/sprite not updating (looks frozen)
- ⚠️ No error logging when movement fails

## Enhancement Suggestions (Design-Compliant):

### Speed System
- ✅ Add speed transition logging to detect stuck values
- ✅ Validate speed doesn't drop to 0 unexpectedly
- ✅ Check speed calculation formulas for precision errors
- ✅ Consider faster state machine transitions (smoother aggro)

### State Machine
- ✅ Add state entry/exit logging
- ✅ Validate state conditions aren't contradictory
- ✅ Check commitment timer durations (1.0s may be too long for fluid combat)
- ✅ Consider faster threat detection (0.75s return delay appropriate?)

### Pathfinding
- ✅ Log pathfinding failures (debug "STUCK" conditions)
- ✅ Validate obstacle list (too many obstacles?)
- ✅ Check angular sampling resolution (360° at 15° = 24 samples)
- ✅ Add fallback behavior if destination unreachable

### AI Behavior
- ✅ Log all target selection attempts (identify null returns)
- ✅ Log state transitions with reasons (why stuck in IDLE?)
- ✅ Log ability casting attempts (why no ability logs?)
- ✅ Add "idle timeout" alert if unit doesn't move for 2+ seconds

---

# 🎯 AUDIT STRUCTURE

This is organized into **6 batches** for manageable review:

1. **BATCH 1:** Guard Group Design vs Implementation
2. **BATCH 2:** Non-Guard Fighter Design vs Implementation  
3. **BATCH 3:** Creature Design vs Implementation
4. **BATCH 4:** Shared Systems (Pathfinding, Targeting, Speed)
5. **BATCH 5:** Combat & Ability Systems
6. **BATCH 6:** Performance & Edge Cases

---

# BATCH 1: GUARD GROUP DESIGN AUDIT

## Design Documents to Review
- [AI_PRIORITY_SYSTEM_EXPLAINED.md](../docs/AI_PRIORITY_SYSTEM_EXPLAINED.md)
- [AI_ROLE_SYSTEM.md](../docs/AI_ROLE_SYSTEM.md)
- [GUARD_AI_VERIFICATION.md](../docs/GUARD_AI_VERIFICATION.md)
- [GUARD_PASSIVITY_BUG_FIX.md](../docs/GUARD_PASSIVITY_BUG_FIX.md)

## TODO 1.1: Review Guard Formation System Design
**Status:** NOT STARTED  
**Expected:** Guards should form 5-slot formation (2 healers, 3 DPS)  
**Verification:** Check src/game/game.js lines 5280-5450 (Guard ball group AI)  
**Discrepancies to Check:**
- [ ] Formation slots properly assigned to 5 positions
- [ ] Healers maintain 110-190 unit range from DPS
- [ ] DPS forms front line at 25 unit offset from flag
- [ ] Guards return to post when leash exceeded (320 units)
- [ ] Speed progression: 0→30→110→140 working

**Idle Investigation:**
- [ ] **Speed Bug:** Are guards stuck at speed 0 when should be 110+?
- [ ] **Pathfinding:** Do guards reach objective or stop halfway?
- [ ] **State Trap:** Are guards stuck in IDLE_DEFENSE when aggro detected?
- [ ] **Destination:** Do formation slots calculate correctly or cause stuck movement?

**Enhancement Ideas (Design-Compliant):**
- Consider faster state transitions (0.5s instead of 0.75s return delay)
- Add logging: "Guard speed changing to X" for each transition
- Validate formation slot positions not overlapping

**Evidence Needed:** 
- Guard position logs from debug log
- Guard state transitions (IDLE/ACTIVE/RETURN)
- Guard spacing verification

---

## TODO 1.2: Review Guard State Machine (IDLE/ACTIVE/RETURN)
**Status:** NOT STARTED  
**Expected:** 3-state machine with clean transitions  
**Implementation:** src/game/game.js lines 5620-5700  
**Verify State Flow:**
- [ ] IDLE_DEFENSE: Guards at slots, speed=0, waiting
- [ ] ACTIVE_DEFENSE: Guards chasing threat, speed=110-140
- [ ] RETURN_TO_POST: Guards returning to slots, speed=110
- [ ] State duration timers (0.75s no-threat to return to IDLE)
- [ ] Commitment timers preventing thrashing

**Idle Investigation (CRITICAL):**
- [ ] **State Trap:** Guards stuck in IDLE_DEFENSE despite player nearby?
- [ ] **Aggro Detection:** Threat detection working (aggro range 280u)?
- [ ] **Speed Reset:** Speed going to 0 on state change when should stay 110+?
- [ ] **Commitment Timer:** Is 1.0s timer causing guards to not commit to chase?
- [ ] **Transition Condition:** What blocks transition from IDLE→ACTIVE? (check all conditions)

**Enhancement Ideas (Design-Compliant):**
- Add detailed logging: "Guard state change: IDLE_DEFENSE → ACTIVE_DEFENSE (reason: player in range)"
- Consider reducing commitment timer from 1.0s to 0.5s for snappier response
- Log why state transitions fail (e.g., "cannot transition: threat_detected=false")

**Issue from Logs:** Guards appear to never reach ACTIVE_DEFENSE

---

## TODO 1.3: Review Guard Aggro & Threat Detection
**Status:** NOT STARTED  
**Expected Design:** 
- Aggro Range: 280 units
- Defense Zone: 150 units
- Pre-fight buffs trigger at aggro range
  
**Current Issue:** Enemies logged 100+ out-of-range attacks  
**Check:** 
- [ ] Guard aggro range calculation
- [ ] Guard priority targeting system
- [ ] Threat assessment (targetPriority values)
- [ ] Pre-fight buff triggers

---

## TODO 1.4: Review Guard Speed Enforcement (Fixed, Verify)
**Status:** VERIFY ONLY  
**Fix Applied:** Speed cap at 140 units/sec  
**Check:**
- [ ] Guard speed values in logs (should max at 140)
- [ ] No 145+ speed spikes visible
- [ ] Speed cap code lines 5745-5752 working

---

## TODO 1.5: Review Guard-Player Collision (Fixed, Verify)
**Status:** VERIFY ONLY  
**Fix Applied:** 40-unit minimum separation  
**Check:**
- [ ] Guards maintaining distance from player
- [ ] No stacking visible in session
- [ ] Collision code lines 5633-5645 executing

---

# BATCH 2: NON-GUARD FIGHTER DESIGN AUDIT

## Design Documents to Review
- [AI_BEHAVIOR_TRACKING.md](../docs/AI_BEHAVIOR_TRACKING.md)
- [AI_PRIORITY_SYSTEM_EXPLAINED.md](../docs/AI_PRIORITY_SYSTEM_EXPLAINED.md)
- [ROLE_BASED_AI_UPDATE.md](../docs/ROLE_BASED_AI_UPDATE.md)

## TODO 2.1: Review Non-Guard Fighter Roles
**Status:** NOT STARTED  
**Expected Roles:**
- Warrior: Tank, 110u speed, focus aggro
- Mage: Support, 80u speed, stay back
- Warden: Tank variant, 90u speed
- Knight: Burst, 120u speed
  
**Current Issue:** All roles showing 0 damage or minimal damage  

**Idle Investigation:**
- [ ] **Speed Bug:** Are mages stuck at 80u speed but logging 0 movement?
- [ ] **Role Not Assigned:** Are fighters showing wrong role (affecting speed)?
- [ ] **Speed Override:** Is role speed overridden by another system to 0?
- [ ] **Ability Disabled:** Are certain roles unable to cast (appearing passive)?

**Check:**
- [ ] Role detection system (lines ~6500+)
- [ ] Speed defaults per role
- [ ] Role-specific ability assignment
- [ ] Skill rotation vs random combat

**Enhancement Ideas:**
- Log: "Fighter detected as [role], setting base speed [X]"
- Validate role doesn't override speed to 0
- Add role-specific movement behaviors (mages kite at 80u, warriors charge at 110u)

---

## TODO 2.2: Review Non-Guard Fighter Targeting
**Status:** NOT STARTED  
**Expected:**
- Priority: Player > Friendlies > Objectives
- Range: 220 units base aggro
- Retargeting: 1.5s commitment timer
  
**Current Issue:** 40+ fighters with 0 damage = never reaching targets  
**Check:**
- [ ] Target acquisition code
- [ ] Retargeting thresholds
- [ ] Focus priority calculation

---

## TODO 2.3: Review Non-Guard Fighter Positioning
**Status:** NOT STARTED  
**Expected:**
- Warriors: Aggressive positioning (50-70u from target)
- Mages: Kiting positioning (100-130u from target)
- Wardens: Tanking position (30-50u from target)
  
**Current Issue:** Fighters 400-700+ units away, never engaging  

**Idle Investigation:**
- [ ] **Destination Bug:** Is destination calculated as 1000+ units away?
- [ ] **Pathfinding Stall:** Do fighters stop halfway to target?
- [ ] **Speed Drop:** Does speed go to 0 during positioning phase?
- [ ] **Repositioning Loop:** Do fighters constantly recalculate position (never commit)?

**Check:**
- [ ] Positioning logic per role
- [ ] Pathfinding to targets
- [ ] Obstacle avoidance
- [ ] Movement actually reaching destination

**Enhancement Ideas:**
- Log: "Positioning: [role] moving to [X,Y] at [speed]"
- Add "stuck detection" if unit near destination but speed = 0
- Validate role-specific positioning distances (warriors 70u vs mages 120u)

---

## TODO 2.4: Review Non-Guard Ability System
**Status:** NOT STARTED  
**Expected:**
- Abilities per role (warrior has 3, mage has 3, etc.)
- Cooldown management (baseline 1-3 seconds)
- Mana consumption and regen
  
**Current Issue:** AI Behavior log shows "cast-prio" but no actual ability logs  
**Check:**
- [ ] Ability assignment logic
- [ ] Cooldown tracking
- [ ] Mana checks before casting
- [ ] Ability targeting

---

## TODO 2.5: Review Non-Guard Fighter Movement
**Status:** NOT STARTED  
**Expected:**
- Max speed 110-120 units/sec
- Chase distance 260u from home
- Return if 280+ units from home
  
**Current Issue:** Fighters never closing to melee range  
**Check:**
- [ ] moveWithAvoidance() function
- [ ] Pathfinding obstacles
- [ ] Speed calculations
- [ ] Leash enforcement

---

# BATCH 3: CREATURE DESIGN AUDIT

## Design Documents to Review
- [CREATURE_LOGGING_UPDATE.md](../docs/CREATURE_LOGGING_UPDATE.md)

## TODO 3.1: Review Creature Types & Stats
**Status:** NOT STARTED  
**Expected Creatures:**
- Goblin: 50 HP, 75 speed, 7 dmg, 90 aggro
- Bear: 140 HP, 65 speed, 12 dmg, 110 aggro
- Wolf: 55 HP, 95 speed, 8 dmg, 120 aggro
- Orc: 70 HP, 70 speed, 9 dmg, 100 aggro
- Skeleton: 60 HP, 70 speed, 8 dmg, 80 aggro
- Troll: 100 HP, 60 speed, 11 dmg, 100 aggro
  
**Verify:**
- [ ] Correct base stats for each type
- [ ] Level scaling (8% per level)
- [ ] Rarity distribution
- [ ] Boss multipliers (3× HP, 1.5× damage)

---

## TODO 3.2: Review Creature Formation System
**Status:** NOT STARTED  
**Expected:**
- Formation spawning (tanks front, damage middle, support rear)
- Formation anchor positioning
- Leash distance 300u from anchor
  
**Recent Fix:** Creatures now attack immediately (attacked=true)  
**Verify:**
- [ ] Formation positions calculated correctly
- [ ] Creatures spawn at correct offsets
- [ ] Anchor system working

---

## TODO 3.3: Review Creature Attack Behavior
**Status:** PARTIALLY FIXED (verify)  
**Fix Applied:** Set attacked=true on spawn  

**Idle Investigation:**
- [ ] **Attack Cooldown Trap:** Is 0.40s cooldown causing creatures to appear idle between attacks?
- [ ] **Ability Activation:** After attacked=true, do creatures actually cast abilities?
- [ ] **Speed During Attack:** Does speed drop to 0 during attack animation?
- [ ] **Post-Attack Stall:** After attacking, do creatures move again or freeze?

**Verify:**
- [ ] Creatures attacking immediately (no idle phase)
- [ ] Attack cooldown working (0.40s default)
- [ ] Hit range correct (12+14+4 = 30 units)
- [ ] Damage scaling with level
- [ ] Creatures move between attacks

**Enhancement Ideas:**
- Log: "Creature attacking: [type] → [target] (cooldown: [Xs])"
- Validate post-attack recovery doesn't stall movement
- Add "attack animation speed" to prevent freeze appearance

---

## TODO 3.4: Review Creature Loot & XP
**Status:** NOT STARTED  
**Expected:**
- Goblin: 15 XP
- Bear: 40 XP
- Wolf: 20 XP
- Orc: 25 XP
- Loot: 55% drop rate
- XP: Level scaling (8% per level)
  
**Verify:**
- [ ] XP awarded on creature death
- [ ] Loot items generated at correct rarity
- [ ] Level scaling applied
- [ ] Rarity scaling working

---

## TODO 3.5: Review Boss Mechanics
**Status:** NOT STARTED  
**Expected:**
- Boss abilities from BOSS_PROFILES
- 3× HP multiplier
- 1.5× damage multiplier
- Boss intro delay (3 seconds)
  
**Recent Fix:** Boss attacks immediately after spawn  
**Verify:**
- [ ] Boss abilities loading correctly
- [ ] Boss damage scaling applied
- [ ] Boss abilities triggering

---

# BATCH 4: SHARED SYSTEMS AUDIT

## Design Documents to Review
- [COMBAT_SYSTEMS_UPDATE.md](../docs/COMBAT_SYSTEMS_UPDATE.md)

## TODO 4.1: Review Pathfinding System
**Status:** CRITICAL (major issue in logs)  
**Expected:**
- moveWithAvoidance() handles obstacles
- Player collision detection
- Unit-to-unit avoidance
- Angular sampling for path finding
  
**Current Issue:** Enemies not reaching player (400-2000u away)  

**Idle Investigation (CRITICAL):**
- [ ] **Speed Bug:** Does moveWithAvoidance() override speed to 0?
- [ ] **Silent Failure:** Does moveWithAvoidance() return position unchanged (stuck)?
- [ ] **Obstacle Trap:** Are obstacles blocking valid paths (too aggressive)?
- [ ] **Destination:** Is unreachable destination returned, causing halt?
- [ ] **Angular Sampling:** Are all 24 directions tried, or does sampling fail early?
- [ ] **Log Output:** Add "moveWithAvoidance() called: [x,y] → [newX, newY]" logging

**Verify:**
- [ ] moveWithAvoidance() implementation
- [ ] Obstacle list (trees, mountains, walls)
- [ ] Destination calculation
- [ ] Angular sampling working
- [ ] Return value validation (movement actually happens)

**Enhancement Ideas (Design-Compliant):**
- Add "stuck detection" - if position unchanged 2+ seconds, log "UNIT_STUCK"
- Log obstacle count being checked (how many obstacles?
- Add fallback: if 24 angles fail, use direct path (trade safety for movement)
- Log distance to destination vs actual distance traveled

**Evidence:** Debug log shows 100+ out-of-range attempts

---

## TODO 4.2: Review Target Selection System
**Status:** CRITICAL (related to pathfinding issue)  
**Expected:**
- nearestEnemyTo() finds closest target
- Distance check against aggro range
- Priority scoring (player > friendlies > guards)
  
**Current Issue:** Targets selected but never reached  

**Idle Investigation (CRITICAL):**
- [ ] **Null Target:** Does nearestEnemyTo() return null (causing idle)?
- [ ] **Distance Kill:** Distance check rejecting valid targets?
- [ ] **Commit Failure:** Priority scoring all returning same value?
- [ ] **Retargeting Loop:** Rapidly switching targets instead of committing?
- [ ] **Range Check Bug:** Is aggro range calculation wrong (distance * 0.5 bug)?

**Verify:**
- [ ] Target priority calculation
- [ ] Range checks before engagement
- [ ] Retargeting logic
- [ ] Target persistence (stick with one target long enough)

**Enhancement Ideas (Design-Compliant):**
- Log: "Target selected: [name] at distance [X] (valid: [true/false])"
- Add retargeting cooldown: 1.5s before reconsidering other targets
- Log priority scores: "Priority: player=100, friendly=50, guard=10 → selected=[winner]"

**Evidence:** 40+ fighters with 0 damage = targets never engaged

## TODO 4.3: Review Combat Range System
**Status:** CRITICAL (core issue)  
**Expected:**
- Melee range: 30 units
- Ranged range: varies by weapon
- Distance calculated: dist = hypot(dx, dy)
  
**Current Issue:** Log shows 1552u distance vs 30u required  

**Idle Investigation (CRITICAL):**
- [ ] **Speed Zero:** When out of range, is speed set to 0 (unit appears idle)?
- [ ] **Silent Fail:** When attack fails, does unit stop moving (no fallback)?
- [ ] **Range Calculation:** Is distance calculation correct or off by 10x?
- [ ] **Range Check:** Is range validation too strict (30u should be 35u)?
- [ ] **Movement Lockout:** After failed attack, does unit freeze instead of retry?

**Verify:**
- [ ] Distance calculation correct
- [ ] Range checks before attacking
- [ ] Hit collision detection
- [ ] Movement continues after attack fail

**Enhancement Ideas (Design-Compliant):**
- Log: "Attack attempt: dist=[X] vs range=[Y] → [HIT/MISS]"
- If attack fails due to range, automatically move closer (don't idle)
- Add "range buffer" (allow 5u buffer for network lag/timing)
- Log failed attacks with reason

**Evidence:** Log shows pattern of "ENEMY_ATTACK_OUT_OF_RANGE" 100+ times = units idling at wrong distance

---

## TODO 4.4: Review Speed System (Fixed, Verify)
**Status:** VERIFY ONLY  
**Fix Applied:** Speed cap at 140  
**Base Speeds:**
- Idle: 0
- Gentle drift: 30
- Fine-tune: 60
- Follow: 110
- Sprint: 140
  
**Idle Investigation (Speed Bug Focus):**
- [ ] **Speed Not Increasing:** Is speed stuck at 0 or 30 when should be 110?
- [ ] **Speed Precision:** Speed calculation returning float precision errors?
- [ ] **Speed Cap Override:** Is 140 cap being applied incorrectly (capping at 30)?
- [ ] **State-Speed Mismatch:** Is state ACTIVE_DEFENSE but speed still 0?
- [ ] **Speed Transitions:** Do speeds progress smoothly or jump erratically?

**Verify:**
- [ ] Speed cap working (140 max)
- [ ] Speed progression correct
- [ ] No overflow possible
- [ ] Speed matches expected AI state

**Enhancement Ideas (Design-Compliant):**
- Add logging every frame: "Unit speed: [current] (state=[state])"
- Validate speed matches state (if ACTIVE then speed >= 110)
- Log speed changes: "Speed changing 0 → 110"
- Add speed "smoothing" if transitions look jerky

---

## TODO 4.5: Review Movement Priority
**Status:** NOT STARTED  
**Expected:**
- Movement commits prevent rapid retargeting
- Formations move as groups
- Leash prevents overpursuit
  
**Current Issue:** May be related to pathfinding failure  

**Idle Investigation:**
- [ ] **Commitment Trap:** Is 1.0s commitment timer too long, causing "frozen" appearance?
- [ ] **Leash Lockout:** When near leash limit, do units stop moving (prevent overpursuit)?
- [ ] **Formation Stall:** Does formation moving as group cause units to wait (appear idle)?
- [ ] **Movement Command:** Is moveWithAvoidance() being called, or skipped?

**Verify:**
- [ ] Commitment timers (1.0s for movement)
- [ ] Leash implementation
- [ ] Group coherence
- [ ] Movement commands being sent

**Enhancement Ideas (Design-Compliant):**
- Consider 0.5s commitment timer instead of 1.0s (faster response time)
- Log: "Unit committed to [target] for [Xs] (leash distance [X])"
- Add logging for formation movements (syncing to group)
- Log when leash prevents movement

---

# BATCH 5: COMBAT & ABILITY SYSTEMS

## Design Documents to Review
- [ABILITY_MECHANICS.md](../docs/ABILITY_MECHANICS.md)

## TODO 5.1: Review Ability Cooldowns
**Status:** NOT STARTED  
**Current Issue:** AI Behavior log shows cast-prio but no ability logs  
**Expected:**
- Cooldown baseline: 1-3 seconds per role
- Recovery lockout prevents spam
- Mana checks before casting
  
**Idle Investigation:**
- [ ] **Cooldown Lock:** Is cooldown preventing ability casting (ability "locked")?
- [ ] **Recovery Lockout Trap:** Does recovery lockout (0.5s?) cause speed drop to 0?
- [ ] **Mana Check:** Is mana check failing, preventing ability cast?
- [ ] **Cast Animation Stall:** During ability animation, does speed go to 0?

**Verify:**
- [ ] Ability cooldown tracking
- [ ] Cooldown reset on use
- [ ] Mana deduction working
- [ ] Movement doesn't stop during ability casting

**Enhancement Ideas:**
- Log: "Attempting ability: [name] (cooldown ready: [true/false], mana: [X]/[Y])"
- Add "movement during casting" so units appear active
- Validate recovery lockout doesn't exceed 0.5s (prevent appearance of lag)

---

## TODO 5.2: Review Ability Damage Scaling
**Status:** NOT STARTED  
**Expected:**
- Abilities scale with level (8% per level)
- Critical hits possible (crit chance + damage)
- Weapon types affect available abilities
  
**Current Issue:** Damage dealt is minimal (0-100 from 40+ enemies)  
**Verify:**
- [ ] Damage calculation formula
- [ ] Level scaling applied
- [ ] Weapon requirements checked

---

## TODO 5.3: Review Buff/Debuff System
**Status:** NOT STARTED  
**Expected:**
- Buffs: ward_barrier, radiant_aura, etc.
- Debuffs: poison, stun, root, slow
- Duration tracking
- Effect application and removal
  
**Verify:**
- [ ] Buff trigger conditions
- [ ] Duration management
- [ ] Stat modifications

---

## TODO 5.4: Review Shield System
**Status:** NOT STARTED  
**Current Session:** Player took shield-only damage (no health loss)  
**Expected:**
- Shield generation from abilities
- Shield cap = maxHP
- Damage absorption priority (shield > health)
  
**Verify:**
- [ ] Shield calculation
- [ ] Shield cap enforcement
- [ ] Shield regeneration

---

## TODO 5.5: Review Healing System
**Status:** NOT STARTED  
**Expected:**
- Healer abilities (heal target, area heal)
- Healing scaling with INT stat
- Healing cap = target maxHP
  
**Verify:**
- [ ] Healing trigger conditions
- [ ] Healing amount calculation
- [ ] Target selection for heals

---

# BATCH 6: PERFORMANCE & EDGE CASES

## TODO 6.1: Review Guard Respawn System
**Status:** NOT STARTED  
**Expected:**
- Guards respawn 30s after death
- Respawn at flag location
- Respawn at squad size cap (5 total)
  
**Verify:**
- [ ] Respawn timer tracking
- [ ] Respawn location calculation
- [ ] Squad size cap enforcement

---

## TODO 6.2: Review Guard Buff System
**Status:** NOT STARTED  
**Expected:**
- Pre-fight buffs at aggro range (healers get ward + aura)
- Buffs trigger once per engagement
- Buff duration until engagement ends
  
**Verify:**
- [ ] Pre-fight buff trigger conditions
- [ ] Buff assignment (healers only)
- [ ] Buff removal on disengage

---

## TODO 6.3: Review Friendly AI Integration
**Status:** NOT STARTED  
**Expected:**
- Player group members follow player
- Friendlies maintain formation
- Friendlies target same enemies as player
  
**Verify:**
- [ ] Formation slot calculation
- [ ] Target acquisition from player
- [ ] Movement following player

---

## TODO 6.4: Review Emperor Power System
**Status:** NOT STARTED  
**Expected:**
- Emperor power: 3× HP/Mana/Stamina, 50% CDR
- Granted when controlling all flags
- Removed when losing any flag
- Fully heals when granted
  
**Verify:**
- [ ] Flag control tracking
- [ ] Emperor power application
- [ ] Power removal on flag loss

---

## TODO 6.5: Review Logging & Debug Systems
**Status:** IN PROGRESS (identified gaps)  
**Current State:**
- AI Behavior: 32 events in 330s (should be 100+)
- Missing movement logs
- Missing target selection logs
  
**Issue:** Either logging is incomplete or AI is not executing  
**Verify:**
- [ ] All AI decisions being logged
- [ ] Log frequency appropriate
- [ ] Missing log events identified

---

## TODO 6.6: Discrepancy Inventory Creation
**Status:** IN PROGRESS  
**Purpose:** Master list of all design vs implementation gaps  
**Track:** Created as AUDIT_DISCREPANCIES.md  
**Include:**
- [ ] All inconsistencies found
- [ ] Severity (Critical/Important/Minor)
- [ ] Fix recommendations
- [ ] Verification steps

---

# 📊 AUDIT TRACKING MATRIX

| Batch | Scope | Todos | Status | Priority |
|-------|-------|-------|--------|----------|
| **1** | Guard Groups | 5 | NOT STARTED | HIGH |
| **2** | Non-Guard Fighters | 5 | NOT STARTED | CRITICAL |
| **3** | Creatures | 5 | PARTIAL | HIGH |
| **4** | Shared Systems | 5 | PARTIAL | CRITICAL |
| **5** | Combat & Abilities | 5 | NOT STARTED | HIGH |
| **6** | Performance & Edge Cases | 6 | IN PROGRESS | MEDIUM |

**Total Todos:** 31  
**Completed:** 0  
**In Progress:** 6  
**Not Started:** 25  

---

# 🎯 CURRENT CRITICAL FINDINGS

From log analysis (1/19/2026):

### Finding #1: Enemies Never Reach Player
- **Evidence:** 100+ "ENEMY_ATTACK_OUT_OF_RANGE" events
- **Pattern:** Distances 400-2020 units, required 28-31 units
- **Impact:** No meaningful combat
- **Root Cause:** Pathfinding or targeting broken
- **Severity:** 🔴 CRITICAL

### Finding #2: 40+ Enemies Deal Zero Damage
- **Evidence:** Damage report shows 40+ enemies with 0 damage
- **Pattern:** Never reach melee range or abilities never trigger
- **Impact:** Enemies ineffective
- **Root Cause:** Combined pathfinding + ability system issue
- **Severity:** 🔴 CRITICAL

### Finding #3: AI Behavior Logging Incomplete
- **Evidence:** Only 32 AI events in 330 seconds (should be 100+)
- **Pattern:** Missing movement, positioning, target selection logs
- **Impact:** Cannot verify AI is actually running
- **Root Cause:** Logging gaps or AI execution gaps
- **Severity:** 🟡 IMPORTANT

---

# ⚠️ NEXT STEPS

1. **Review Batch 1-3 in detail** with source code
2. **Cross-reference logs** against design docs
3. **Document each discrepancy** in AUDIT_DISCREPANCIES.md
4. **Prioritize fixes** by severity (critical first)
5. **Implement fixes** one batch at a time
6. **Test fixes** with new logs
7. **Verify design compliance** in follow-up sessions

---

**Audit Started:** January 19, 2026  
**Status:** PHASE 1 - PLANNING & LOG REVIEW COMPLETE  
**Next Phase:** BATCH 1 DETAILED REVIEW  

