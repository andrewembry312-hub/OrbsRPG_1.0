# AI Priority System Explained

**Last Updated:** January 5, 2026

This document explains the AI decision-making priorities for each role (HEALER, TANK, DPS) across different unit types (friendly allies, enemy units, guards).

---

## 🔵 FRIENDLY ALLIES (Player's Team - Non-Guards)

These are the units in your party that follow you around the map. They use **ability casting priorities** and **movement/decision priorities** separately.

### 🩹 HEALER Priority (Friendly)

**Ability Casting Priority** (lines 2013-2050):
1. **Emergency Save** (HP < 40%)
   - Cast `mage_divine_touch` OR `heal_burst` on lowest ally
   - Returns immediately after cast
   
2. **AoE Stabilize** (3+ allies < 75% HP within 160 units)
   - Cast `heal_burst` OR `beacon_of_light` on self (AoE)
   - Returns immediately after cast
   
3. **Pre-Burst Mitigation** (party.macroState === 'burst')
   - Cast `ward_barrier` on self
   - Returns immediately after cast

**Movement/Decision Priority** (lines 3615-3679):
1. **Stay Near Allies** (>150 units from allied cluster center)
   - Decision: `support_position`
   - Target: Allied cluster center with jitter offset (prevents stacking)
   - Jitter: 25-45 units based on healer ID (unique positioning)
   
2. **Attack Enemies** (when safe: enemy ≤70% aggro range AND ≤100 units from allies)
   - Decision: `attack_enemy_safe`
   - Target: Nearest enemy
   - Only engages when positioned safely near allies
   
3. **Capture Objectives** (no enemies nearby AND ≤120 units from allies)
   - Decision: `capture_objective`
   - Target: Nearest uncaptured/enemy flag
   
4. **Maintain Position** (fallback)
   - Decision: `maintain_position`
   - Target: Stay at allied cluster center with jitter

**⚠️ PROBLEM:** Healers are constantly recalculating "allied cluster center" every frame. If allies move even slightly, the healer's target position changes, triggering a `decision_change` log entry. This causes **thrashing**.

---

### 🛡️ TANK Priority (Friendly)

**Ability Casting Priority** (lines 2053-2063):
1. **Peel for Healer** (enemy within 140 units of healer)
   - Cast `knight_taunt` OR `warcry` OR `knight_shield_wall` on self
   - Returns immediately after cast
   
2. **Burst CC on Focus** (party.macroState === 'burst' AND focus target exists)
   - Cast `knight_taunt` OR `warcry` on self
   - Returns immediately after cast

**Movement/Decision Priority** (lines 3530-3586):
1. **Attack Walls (Combat Push)** (walls intact AND enemy nearby within 1.5x aggro range)
   - Decision: `attack_walls_combat`
   - Target: Nearest wall side
   - **Purpose:** Push objectives even during combat
   
2. **Peel for Healers** (healer exists AND enemy within 100 units of healer)
   - Decision: `peel_healer`
   - Target: Enemy threatening healer
   
3. **Attack Enemy** (enemy within aggro range, no healer threat)
   - Decision: `attack_enemy`
   - Target: Nearest enemy
   
4. **Attack Walls (Safe)** (no enemies, walls intact)
   - Decision: `attack_walls`
   - Target: Nearest wall side
   
5. **Capture Objective** (no walls, no enemies)
   - Decision: `capture_objective`
   - Target: Nearest uncaptured/enemy flag

**⚠️ PROBLEM:** Tanks oscillate between `attack_walls_combat` and `wander` when enemies are right at the edge of 1.5x aggro range (300-330 units). As enemy distance fluctuates by 10-20 units per frame, the tank switches decisions constantly.

---

### ⚔️ DPS Priority (Friendly)

**Ability Casting Priority** (lines 2065-2160):
1. **Maintain Buffs** (buff timer < 3s remaining)
   - Cast any buff/shield ability (e.g., `warrior_fortitude`)
   - Sets buff timer to 12s
   - Returns immediately after cast
   
2. **Damage Rotation** (no buffs needed)
   - Selects all damage abilities with cooldown === 0 and sufficient mana
   - **Sorts by cost** (uses low-cost abilities more frequently)
   - Casts cheapest available damage ability
   - Returns immediately after cast

**Movement/Decision Priority** (lines 3588-3613):
1. **Attack Enemy** (enemy within aggro range)
   - Decision: `attack_enemy`
   - Target: Nearest enemy
   
2. **Attack Creature** (creature within aggro range, no enemies)
   - Decision: `attack_creature`
   - Target: Nearest creature
   
3. **Attack Walls (Safe)** (no enemies, walls intact)
   - Decision: `attack_walls_safe`
   - Target: Nearest wall side
   
4. **Capture Objective** (no enemies, no walls)
   - Decision: `capture_objective`
   - Target: Nearest uncaptured/enemy flag

**⚠️ PROBLEM:** DPS units oscillate between `attack_enemy` and `attack_walls_safe` when enemies are right at aggro range boundary (220 units). Small position changes cause decision flips.

---

## 🔴 ENEMY UNITS (AI Opponents - Non-Guards)

Enemy AI uses the same ability priorities as friendly units but has different movement logic.

### Enemy Movement Logic (lines 4246-4500):

**Outpost Focus** (if spawned at/targeting an enemy-controlled flag):
- **Tank Role Override** (lines 4303-4350):
  - **Priority 1:** Attack intact wall sides even if enemies present
  - **Priority 2:** Normal outpost focus (move toward flag)
  - **Purpose:** Tanks prioritize objective walls over enemy engagement
  
- **All Other Roles:**
  - Move toward spawn target flag
  - Attack walls when in range
  - Ignore nearby enemies until outpost is destroyed

**Normal Aggro** (no outpost focus):
1. Find nearest hostile (player, friendly units, or enemy team units)
2. If hostile within aggro distance (220 units):
   - Move toward hostile
   - Attack when in range
3. If no hostile in range:
   - Return to home position
   - Idle when home

**⚠️ PROBLEM:** Enemy tanks attacking walls use exact wall position as target. When walls are destroyed, they instantly switch to next wall or different target, causing rapid decision changes.

---

## 🏰 GUARD AI (Flag Defenders - Both Teams)

Guards are NPCs that spawn at captured flags to defend them. They use **ball group tactics** for coordinated defense.

### Guard Target Priority System

**Priority Scoring** (lines 3227-3257 for friendly guards, 4126-4176 for enemy guards):

| Situation | Priority Score | Description |
|-----------|----------------|-------------|
| **Inside flag radius** | 100 | Enemy contesting the flag capture point |
| **Inner defense zone** | 80 | Enemy within flag radius + 80 units |
| **Aggro range** | 60 | Enemy within 220 units (aggressive defense) |
| **Attacking guards** | +50 | Bonus if enemy is attacking this guard or allies |

**Leash Radius:** 280 units from spawn - won't chase beyond this

---

### 🛡️ TANK Guards (Ball Group DPS)

**Behavior** (lines 3530-3586 for friendly, similar for enemy):
- **Speed:** 140 (fast and aggressive)
- **Ball Group Formation:** Move 75% toward target, 25% toward ball center
- **Solo Mode:** Move directly at target
- **Return Behavior:** When no targets, return to spawn at speed 110

**⚠️ PROBLEM:** Ball group formula constantly recalculates ball center. If ANY allied guard moves, ALL guards recalculate target position, causing cascading decision changes.

---

### 🩹 HEALER Guards (Support)

**Behavior** (lines 4189-4210 for enemy guards):
- **Speed:** 100 (moderate, maintains distance)
- **Optimal Distance:** 120 units from target
- **Positioning Logic:**
  1. If >60 units from ball center → move toward center
  2. If >150 units from target → move toward target (60% target, 40% ball center)
  3. If <90 units from target → back up toward ball center
  4. If 90-150 units → minimal movement (speed 30)

**⚠️ PROBLEM:** Healer guards have 4 different movement states with tight distance thresholds (60, 90, 120, 150). Small position changes (10-20 units per frame) cause constant recalculation and decision changes.

---

### ⚔️ DPS Guards

Same as TANK guards but labeled DPS role. Uses identical ball group tactics.

---

## 🔥 ROOT CAUSES OF DECISION THRASHING

### 1. **Distance Threshold Sensitivity**
```javascript
// Example from Tank priority (line 3536)
if(wallTarget && near.e && near.d <= AGGRO_RANGE * 1.5){  // 330 units
  decision = 'attack_walls_combat';
} else if(near.e && near.d <= AGGRO_RANGE){  // 220 units
  decision = 'attack_enemy';
}
```

**Problem:** Enemy at 325 units triggers `attack_walls_combat`. Enemy moves to 335 units → switches to `attack_enemy`. Then back to 325 → switches back. **Oscillation every 0.5s.**

### 2. **Dynamic Target Recalculation**
```javascript
// Healer allied cluster center (lines 3622-3635)
let allyX = 0, allyY = 0, allyCount = 0;
for(const f of state.friendlies){
  allyX += f.x;  // Recalculated EVERY FRAME
  allyY += f.y;
}
```

**Problem:** Even 1-pixel ally movement changes cluster center, changing healer target position, triggering decision change log.

### 3. **Ball Group Center Recalculation**
```javascript
// Guard ball group (lines 4115-4123)
let ballCenterX = e.x, ballCenterY = e.y;
for(const ally of allies){
  totalX += ally.x;  // Recalculated EVERY FRAME
  totalY += ally.y;
}
ballCenterX = totalX / (allies.length + 1);
```

**Problem:** When ANY guard moves, ALL guards recalculate ball center, ALL guards update target position, ALL guards log decision changes.

### 4. **0.5s Hysteresis Too Short**
```javascript
// Decision change throttle (line 8454)
const timeSinceLastChange = now - (lastDecisionTime[unitKey] || 0);
const canChange = timeSinceLastChange >= 0.5;
```

**Problem:** Units oscillating due to #1-3 above will trigger changes every 0.5s instead of every 0.02s. Still logs 120+ changes in 60s session.

---

## 💡 RECOMMENDED FIXES

### Fix 1: Add Dead Zones to Distance Checks
```javascript
// Instead of exact threshold
if(near.d <= AGGRO_RANGE * 1.5)

// Use hysteresis bands
const isCurrentlyAttackingWalls = decision === 'attack_walls_combat';
const threshold = isCurrentlyAttackingWalls ? AGGRO_RANGE * 1.6 : AGGRO_RANGE * 1.4;
if(near.d <= threshold)
```

This creates a 44-unit "sticky zone" where decision doesn't flip.

### Fix 2: Throttle Dynamic Calculations
```javascript
// Only recalculate cluster center every 0.5s
if(!a._clusterCalcTime || now - a._clusterCalcTime > 0.5){
  a._clusterX = calculateClusterCenter();
  a._clusterY = ...;
  a._clusterCalcTime = now;
}
tx = a._clusterX;  // Use cached value
```

### Fix 3: Increase Hysteresis to 1.0s
```javascript
const canChange = timeSinceLastChange >= 1.0;
```

Prevents rapid flip-flopping while still allowing adaptation.

### Fix 4: Add "Commit Duration" to Decisions
```javascript
// When making a decision, commit to it for minimum time
if(decision !== a._lastDecision){
  a._decisionCommitUntil = now + 2.0;  // 2 second commitment
}

// Only allow change if commit expired
if(now >= a._decisionCommitUntil){
  // Can change decision
}
```

Forces units to "see through" their decisions instead of constantly re-evaluating.

---

## 📊 DECISION LOOP EXAMPLES FROM LOGS

### Knight 525 Loop (87 changes in 67s):
```
[105.43s] attack_walls_combat (Flag 6, dist:21)
[105.96s] wander (dist:86)               ← Enemy moved slightly beyond threshold
[106.55s] attack_walls (Flag 6, dist:25) ← Enemy back in range but no combat tag
[107.08s] wander (dist:84)               ← Same oscillation
[107.74s] attack_walls_combat (dist:20)  ← Pattern repeats every 0.5-0.6s
```

**Root Cause:** Enemy at ~220-330 unit boundary, tank switching between attack_walls_combat, attack_walls, and wander based on enemy proximity fluctuations.

---

**Next Steps:** Implement Fixes 1-4 above to stabilize AI decisions.
