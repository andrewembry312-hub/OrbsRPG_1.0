# AI Role System - CONSOLIDATED

**Last Updated**: January 18, 2026  
**Status**: ✅ UNIFIED DOCUMENTATION

This document consolidates all AI priority information into a single source of truth. All other AI documentation files are archived.

---

## 🎯 ROLE PRIORITIES (Unified Standard)

All units across all teams use the same role-based priorities. Roles are: **TANK**, **DPS**, **HEALER**.

### 🛡️ TANK Priority

**Purpose**: Frontline defender. Pushes objectives, protects squishy units, absorbs damage.

**Movement Priority**:
1. **Attack Walls (Combat)** - Push objectives even during combat
2. **Peel for Healers** - Protect nearby healers from threats (within 100 units)
3. **Attack Enemy** - Engage hostiles when no walls/healers need help
4. **Attack Walls (Safe)** - Push objectives when safe
5. **Capture Objectives** - Only when area is completely clear
6. **Maintain Position** - Fallback/idle behavior

**Key Behavior**: Tanks are aggressively anchored. They maintain position and attack walls even with enemies nearby, creating coordinated siege gameplay.

**Location**: game.js lines 3530-3586 (friendly TANK) + 4303-4350 (enemy TANK)

---

### ⚔️ DPS Priority

**Purpose**: Threat eliminator. Kill enemies first, then help objectives.

**Movement Priority**:
1. **Attack Enemy** - Eliminate hostiles (primary focus)
2. **Attack Walls (Safe)** - Only when enemies are cleared
3. **Attack Creature** - Engage neutral creatures if no enemies nearby
4. **Capture Objectives** - Only when area is clear
5. **Maintain Position** - Fallback/idle behavior

**Key Behavior**: DPS units are combat-focused. They ignore objectives to clear threats, providing cover for teammates.

**Location**: game.js lines 3588-3613 (friendly DPS) + general enemy logic (enemies naturally focus player/friendlies before objectives)

---

### 💚 HEALER Priority

**Purpose**: Support anchor. Sustains allies, enables healing uptimes, never solos.

**Movement Priority**:
1. **Support Position** (Stay with allies, within 120 units) - PRIMARY
2. **Attack Enemy** (Only when safe: within 80 units of allies) - Secondary
3. **Capture Objectives** (Only when very safe: no threats + near allies) - Tertiary
4. **Maintain Position** - Fallback/idle behavior

**Key Behavior**: Healers NEVER push walls alone. They maintain proximity to the group for healing range. Only attack when protected by nearby allies.

**Location**: game.js lines 3615-3679 (friendly HEALER) + general support positioning for mage enemies

---

## 📊 ABILITY CASTING PRIORITIES (By Role)

### TANK Ability Casting
1. **Peel for Healer** - Cast defense/CC abilities on self if healer threatened (within 140 units)
2. **Burst CC on Focus** - During burst macro, apply hard CC
3. Fallback: Auto-cast available abilities in-role

### DPS Ability Casting
1. **Maintain Buffs** - Keep self-buffs active (recast when <3s remaining)
2. **Damage Rotation** - Cast damage abilities prioritized by cost (cheapest first = more spam)

### HEALER Ability Casting
1. **Emergency Save** - Heal critical allies (HP < 40%) first
2. **AoE Stabilize** - Group heal if 3+ allies damaged (HP < 75%)
3. **Pre-Burst Mitigation** - Shield team during burst macro
4. **Support Auras** - Maintain buffs/shields on allies

---

## 🔍 DOCUMENTED BEHAVIORS

### Guard Units (Special Units at Outposts)
- **Composition**: 2 Healers (MAGE) + 3 DPS (WARRIOR) per 5-guard group
- **Position**: Pentagon formation around flag
- **Update Cycle**: Same AI as friendly/enemy units, uses same role priorities
- **Spawning**: 5 guards per outpost when captured, respawn via `respawnGuardsForSlot()`
- **Death**: 30-second respawn timer at home site

**Guard-Specific Behavior**:
- Guards are treated as `guard=true` units with `guardRole` set
- Follow formation anchors tied to their home site
- Leash to dungeon/site center: destroy if player leaves (800 unit range for dungeons)
- Inherit loadouts and abilities from MAGE/WARRIOR archetypes

### Group Members (Recruited Allies)
- **Behavior**: Same as guard units but follow player as anchor
- **Respawn**: 8 seconds at nearest player-owned flag
- **Formation**: Dynamic role-based offsets (tank forward, healer back with spread)

### Enemy Team Units
- **Initial Spawn**: 10 fighters per enemy team at game start via `seedTeamForces()`
- **Behavior**: Same role-based priorities + outpost focus when assigned
- **Special**: Tank enemies attack walls even during combat (coordinated siege)

---

## ⚠️ KNOWN ISSUES (Documented in Code)

### Healer Thrashing
Healers constantly recalculate "allied cluster center" every frame. Small movements trigger decision changes.
- **Impact**: Excessive AI decision logging
- **Workaround**: Added decision hysteresis to reduce spam
- **Fix**: Use cached cluster center, update only every 0.5s

### Tank Oscillation
Tanks oscillate between `attack_walls_combat` and `wander` when enemies at 1.5x aggro boundary (300-330 units).
- **Impact**: Rapid decision changes on frame-by-frame distance fluctuation
- **Cause**: Distance changes 10-20 units per frame
- **Fix**: Use hysteresis on range decisions (e.g., require 30-unit buffer)

### DPS Decision Flipping
DPS units flip between `attack_enemy` and `attack_walls_safe` at aggro range boundary (220 units).
- **Impact**: Erratic movement patterns
- **Cause**: Same distance oscillation as tank issue
- **Fix**: Add decision hysteresis with 20-unit buffer

---

## 📝 LOG EVENTS FOR AUDIT TRAIL

The system now logs comprehensive AI decision data:

### Guard Events
- `GUARD_SPAWNED`: Guard unit created at outpost
- `GUARD_DIED`: Guard unit killed, respawn timer started
- `GUARD_RESPAWNED`: Guard unit returned from respawn

### Friendly Events
- `ALLY_DIED`: Group member killed, respawn scheduled
- `ALLY_SPAWNED`: Group member created
- `ALLY_MOVEMENT`: Unit movement tracking (10% sample rate)

### Combat Events
- `WALL_DAMAGE`: Wall side damaged, attacker list included
- `WALL_DESTROYED`: Wall side destroyed completely
- `FLAG_CAPTURED`: Flag ownership changed
- `FLAG_RECAPTURED`: Flag recaptured from enemy team

---

## 🔗 RELATED SYSTEMS

- **Guard Loadouts**: [SLOT_SYSTEM_GUIDE.md](SLOT_SYSTEM_GUIDE.md) - Guards use unlocked slot loadouts
- **Ability Mechanics**: [ABILITY_MECHANICS.md](ABILITY_MECHANICS.md) - Detailed ability behavior
- **Formation System**: Guards use pentagon positioning with role-based offsets
- **Logging System**: [GAME_EVENT_LOGGING.md](GAME_EVENT_LOGGING.md) - Comprehensive event tracking

---

## ✅ VERIFICATION CHECKLIST

- [x] Friendly units use role priorities
- [x] Enemy units use role priorities
- [x] Guard units use role priorities
- [x] Ability casting follows documented order
- [x] Logging tracks guard spawn/death/respawn
- [x] Logging tracks ally spawn/death/respawn
- [x] Logging tracks movement (sampled)
- [x] Logging tracks wall damage and destruction
- [x] Documentation consolidated into single source

---

**Source of Truth**: This document (AI_ROLE_SYSTEM.md)
**Supersedes**: AI_PRIORITY_SYSTEM_EXPLAINED.md (archived), ROLE_BASED_AI_UPDATE.md (archived)
