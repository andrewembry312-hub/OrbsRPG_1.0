# Bulletproof Integration Guide

This replaces the assumptions with verified implementations.

---

## Before You Start

✅ **hp-audit.js** exports:
- `initHpAuditSystem(state)` - initialize
- `auditHpChange(target, delta, reason, source, state, isDirect)` - core
- `auditHeal(target, amount, abilityId, state, sourceId)` - convenience
- `auditDamage(target, amount, reason, state, sourceId)` - convenience
- `auditSetHp(target, newHp, reason, state)` - direct set
- `enableHpAudit(state, on)` - toggle from console (self-initializing)
- `detectUntrackedHpChange(entity)` - guard to catch untracked changes

✅ **crown-debug.js** exports:
- `initCrownDebugSystem(state)` - initialize
- `logCrownPickup(state, team, playerKey)`
- `logCrownDrop(state, team, reason)`
- `logCrownSecured(state, team, baseName)`
- `logGuardChaseStart(state, guard, team)`
- `logGuardChaseEnd(state, guard, team, reason)`
- `logGuardForcedTarget(state, guard, target, team)`
- `logGuardAbilityTarget(state, guard, ability, targetChosen, wasForced)`
- `enableCrownDebug(state, on)` - toggle from console (self-initializing)
- `getCrownDebugReport(state)` - get report
- `exportCrownDebugLog(state)` - export

✅ **All imports in game.js** - ready to use

---

## Phase 2: Wire HP Audit (After Phase 1 Proves Coordinates OK)

### Step 1: Initialize in game state setup

Find where `initGame()` or game state initialization happens. Add:

```javascript
function initGame(state) {
  // ... existing init code ...
  
  // Initialize audit systems
  initHpAuditSystem(state);
  initCrownDebugSystem(state);
}
```

### Step 2: Find HP change locations (Brutal Truth)

HP changes are **scattered**. You need to find all of them:

```bash
# In your codebase, search for these patterns:
.hp +=
.hp -=
.hp =
target.hp =
entity.hp +=
```

You'll find them in:
- Damage application functions
- Heal application functions
- Level-up stat rebuilds
- Effect applications
- Respawn logic
- Buff/debuff ticks

### Step 3: Replace the most critical 3-4 places first

**DON'T** replace all 20 at once. Do the hottest paths first:

#### Pattern 1: Damage (most common)
```javascript
// BEFORE:
target.hp -= damageAmount;

// AFTER:
auditDamage(state, target, damageAmount, 'fire_damage', sourceEntity?.id);
```

#### Pattern 2: Heal (most noticeable)
```javascript
// BEFORE:
target.hp += healAmount;

// AFTER:
auditHeal(state, target, healAmount, 'heal_burst', sourceEntity?.id);
```

#### Pattern 3: Stat rebuild (catches "mystery" HP)
```javascript
// BEFORE:
target.hp = Math.min(target.hp, target.maxHp);

// AFTER:
auditSetHp(state, target, Math.min(target.hp, target.maxHp), 'stat_rebuild');
```

#### Pattern 4: Respawn (always a set)
```javascript
// BEFORE:
entity.hp = entity.maxHp;

// AFTER:
auditSetHp(state, entity, entity.maxHp, 'respawn');
```

### Step 4: Add the HP change guard to detect untracked changes

This is critical. It catches HP changes happening outside your audit pipeline:

Find your main game loop (the one that ticks every frame). Add this:

```javascript
function updateGame(state) {
  // ... existing update code ...
  
  // If HP audit is enabled, detect untracked changes
  if (state.hpAudit?.enabled) {
    for (const e of state.enemies || []) {
      detectUntrackedHpChange(e);
    }
    for (const allied of state.allies || []) {
      detectUntrackedHpChange(allied);
    }
    if (state.player) {
      detectUntrackedHpChange(state.player);
    }
  }
}
```

This will **immediately** tell you if something is changing HP outside the audit pipeline (which is where your 1808 mystery HP is coming from).

### Step 5: Test Phase 2

```javascript
// From console:
enableHpAudit(state, true);

// Play for 10 seconds

// Check the log:
getHpAuditLog(state);

// Look for:
// - summary.phantomChanges > 0  → Found untracked HP changes
// - summary.largeJumps array    → List of mystery HP jumps with reasons
```

---

## Phase 3: Wire Crown Debug (After Phase 2 Validates HP is Clean)

All four logging functions are already exported. You just need to call them at the right places.

### Step 1: Find 4 call sites

#### Site A: Crown Pickup
Find where `crown.carriedBy = 'player'` or `crown.carriedBy = playerKey` is set:

```javascript
// RIGHT AFTER the assignment:
logCrownPickup(state, team, playerKey);
```

#### Site B: Crown Drop
Find where `crown.carriedBy = null` or `crown.carriedBy = undefined`:

```javascript
// RIGHT AFTER:
logCrownDrop(state, team, 'death');  // or 'manually_dropped'
```

#### Site C: Guard Chase Detection
Find the block where `e._isChasingCrown = true` is set:

```javascript
if (crownCarriedByPlayer) {
  e._isChasingCrown = true;
  e._crownForcedTarget = isDps ? state.player : null;
  
  // RIGHT HERE:
  logGuardChaseStart(state, e, crownTeam);
}
```

#### Site D: Ability Override
Find the block in npcUpdateAbilities where forced target is applied:

```javascript
if (isDps && u._crownForcedTarget && forcedAlive) {
  target = u._crownForcedTarget;
  bestD = Math.hypot((target.x||0)-u.x, (target.y||0)-u.y);
  
  // RIGHT HERE:
  logGuardAbilityTarget(state, u, 'forced_override', target, true);
}
```

### Step 2: Test Phase 3

```javascript
// From console:
enableCrownDebug(state, true);

// Pick up crown
// Hold it for 5 seconds
// Drop it

// Check the log:
getCrownDebugReport(state);

// Look for:
// - totalEvents > 5           → System is logging
// - eventTypes includes PICKUP, CHASE, ABILITY → All steps firing
// - If eventTypes is missing any → That's where the break is
```

---

## Gotcha Prevention Checklist

### HP Audit

- [ ] You called `initHpAuditSystem(state)` in game init
- [ ] You replaced at least 3 HP change locations with audit calls
- [ ] You added the `detectUntrackedHpChange()` loop in main update
- [ ] You tested by enabling and checking for `phantomChanges` and `largeJumps`
- [ ] **The 1808 mystery HP now shows up in largeJumps with its reason code**

### Crown Debug

- [ ] You called `initCrownDebugSystem(state)` in game init
- [ ] You added all 4 log calls at the right locations (pickup, drop, chase, ability)
- [ ] You tested by enabling and checking `eventTypes` includes all four
- [ ] You can screenshot the `getCrownDebugReport()` showing events
- [ ] **If any eventTypes are missing, that's the broken step**

### Console Toggles (Self-Initializing)

Instead of `state._hpAudit.enabled = true;` (which throws if not initialized), use:

```javascript
// From console:
enableHpAudit(state, true);     // ✅ Safe - initializes if needed
enableCrownDebug(state, true);  // ✅ Safe - initializes if needed

// Turn off:
enableHpAudit(state, false);
enableCrownDebug(state, false);
```

---

## What Success Looks Like

### After Phase 2 (HP Audit)

Console output:
```
[HP AUDIT] Enabled - all HP changes will be tracked
```

Then after 10 seconds:
```
getHpAuditLog(state)
// Shows:
{
  enabled: true,
  events: [ ...400+ events... ],
  summary: {
    totalHeals: 1450,
    totalDamage: 2890,
    phantomChanges: 1,
    largeJumps: [
      { delta: 1808, reason: 'SET', id: 'player', t: 45.234 }
    ]
  }
}
```

**This tells you:** The 1808 HP jump happened at game time 45.234 due to a direct SET. The reason code shows which code path did it. ✅

### After Phase 3 (Crown Debug)

Console output:
```
[CROWN DEBUG] Enabled - crown events will be logged
```

Then after picking up and dropping crown:
```
getCrownDebugReport(state)
// Shows:
{
  enabled: true,
  events: [
    { t: 10.234, type: 'CROWN_PICKUP', detail: 'Player picked up Crown red', data: {...} },
    { t: 10.245, type: 'GUARD_CHASE_START', detail: 'Guard started chasing crown', data: {...} },
    { t: 10.256, type: 'GUARD_ABILITY_TARGET', detail: 'Guard targeted forced player', data: {...} },
    { t: 15.789, type: 'CROWN_DROP', detail: 'Crown red dropped (death)', data: {...} }
  ],
  summary: {
    totalEvents: 4,
    eventTypes: ['CROWN_PICKUP', 'GUARD_CHASE_START', 'GUARD_ABILITY_TARGET', 'CROWN_DROP']
  }
}
```

**This tells you:** All four steps fired in order. ✅

---

## If Something's Missing

### No HP events showing

- Did you initialize? Check: `state.hpAudit.enabled` should be true
- Did you replace any HP changes? Check: Run test and look for events
- If zero events: No HP changes were audited—check your replacements were in hot paths

### No Crown events showing

- Did you initialize? Check: `state.crownDebug.enabled` should be true
- Did you call the log functions? Check: Did you add all 4 calls?
- If partial (only PICKUP, no CHASE): That's your smoking gun—chase detection isn't firing

---

## Why This Order Matters

1. **Phase 1 (Coordinates)** - Must be true, blocks everything
2. **Phase 2 (HP)** - Validates combat isn't fundamentally broken
3. **Phase 3 (Crown)** - Validates specific system works

If Phase 3 shows no crown events, but Phase 1 coordinates are good and Phase 2 HP audit is clean, then the crown system code logic is the issue, not the underlying systems.

Each phase isolates one layer. That's how you find the real bug.

