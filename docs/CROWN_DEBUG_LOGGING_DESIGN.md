# Crown System Debug Logging Design Document

## Overview

A comprehensive logging system for the Crown System that captures all crown-related events during gameplay, enabling real-time debugging and analysis of crown mechanics.

---

## Architecture

### Core Components

**1. Crown Debug System** (`src/game/crown-debug.js`)
- Central state management: `state.crownDebug`
- Maintains event array (last 500 events)
- Logging functions check `enabled` flag before running
- Zero overhead when disabled (single null check per function)

**2. UI Checkbox Integration** (`src/game/ui.js`)
- Located in: Settings → Debug Logs → Guard Performance Options
- Checkbox ID: `enableCrownDebugLog`
- Real-time sync in game loop (updates every frame)
- Download capability integrated with "Download All Enabled Logs" button

**3. Game Code Integration** (`src/game/game.js`)
- Logging calls added at key crown events
- Synchronization hook in `updateGame()` to sync checkbox state

---

## Event Types & Logging Locations

### 1. Crown Pickup
**When:** Player gets within 48 units of a dropped crown
**Where:** `game.js` line 10885 (in crown pickup logic)
**Function:** `logCrownPickup(state, team, x, y)`
**Logged Data:**
- Team (teamA, teamB, teamC)
- Position (x, y)
- Timestamp
- Event type: "pickup"

### 2. Crown Drop
**When:** Player dies while carrying a crown
**Where:** `game.js` line 14972 (in `dropCarriedCrowns()`)
**Function:** `logCrownDrop(state, team, x, y)`
**Logged Data:**
- Team
- Drop position (where player died)
- Timestamp
- Event type: "drop"

### 3. Crown Secured
**When:** Player brings crown to their base and approaches within secure radius
**Where:** `game.js` line 14947 (in crown securing logic)
**Function:** `logCrownSecured(state, team, baseX, baseY)`
**Logged Data:**
- Team
- Base position (destination)
- Timestamp
- Event type: "secured"

### 4. Crown Carrier Status
**When:** Player respawns while still carrying crown
**Where:** `game.js` line 7703 (in `respawn()`)
**Function:** `logCrownCarrierStatus(state, team, carrying, x, y)`
**Logged Data:**
- Team
- Carrying status (true/false)
- Position (respawn location)
- Timestamp

---

## Data Flow

```
Crown Event Happens
    ↓
Game Code Calls Logging Function
    ↓
Logging Function Checks: state.crownDebug.enabled?
    ├─ YES → Add event to state.crownDebug.events array
    └─ NO → Return immediately (zero overhead)
    ↓
User Downloads Log
    ↓
exportCrownDebugLog(state) Creates .txt File
    ↓
Browser Downloads: crown-debug-[timestamp].txt
```

---

## Logging Functions (crown-debug.js)

### Initialization
```javascript
initCrownDebugSystem(state)
- Called in: game.js initGame() at startup
- Creates: state.crownDebug with enabled flag and events array
- Runs once per game
```

### Event Logging
```javascript
logCrownPickup(state, team, x, y)
logCrownDrop(state, team, x, y)
logCrownSecured(state, team, x, y)
logCrownCarrierStatus(state, team, carrying, x, y)
```

### Control
```javascript
enableCrownDebug(state, on)
- Toggles state.crownDebug.enabled
- Can be called from console or UI checkbox
```

### Export
```javascript
exportCrownDebugLog(state)
- Creates formatted .txt file
- Groups events by type
- Includes summary statistics
- Downloads automatically
```

---

## User Interface

### Checkbox Location
Settings Menu → Debug Logs → Guard Performance Options → "Crown System Debug Log"

### States
- **Enabled (checked):** All crown events captured in real-time
- **Disabled (unchecked):** No logging overhead, system still works

### Download
1. Play game (crown events auto-captured)
2. Open Settings → Debug Logs
3. Check "Crown System Debug Log" checkbox
4. Click "Download All Enabled Logs" button
5. Browser downloads: `crown-debug-1769383111539.txt`

---

## Log Output Format

```
Crown System Debug Log
======================================================================
Generated: 1/25/2026, 11:18:31 PM
Game Time: 45.2s
Total Events: 7
Status: ENABLED

--- pickup (2) ---
[45.20s] Player: player Crown: teamA Pos: (466, 440) Details: picked up
[127.50s] Player: player Crown: teamB Pos: (500, 460) Details: picked up

--- drop (1) ---
[180.10s] Player: player Crown: teamA Pos: (665, 1280) Details: dropped at death

--- secured (1) ---
[195.30s] Player: player Crown: teamB Pos: (440, 2677) Details: secured at base

--- carrier_status (3) ---
[200.00s] Player: player Crown: teamB Carrying: true Pos: (440, 2677)
[205.00s] Player: player Crown: teamA Carrying: false Pos: (440, 2677)
[210.00s] Player: player Crown: teamC Carrying: true Pos: (466, 440)

======================================================================
End of Crown Debug Log
```

---

## Performance Characteristics

### When Enabled
- ~1-2 JSON objects per crown event
- Max 500 events stored (auto-purge oldest)
- Negligible CPU impact (~0.01ms per check)

### When Disabled
- Single null check per function: `if (!state.crownDebug?.enabled) return;`
- **Zero overhead** - functions exit immediately
- No memory allocation

---

## Future Enhancements (Phase 2)

### Guard Crown Behavior Logging
- `logGuardChaseStart(state, guardId, crownTeam)`
- `logGuardChaseEnd(state, guardId, reason)`
- `logGuardForcedTarget(state, guardId, targetType, targetId)`
- `logGuardAbilityTarget(state, guardId, abilityId, targetId)`

### HP Audit Integration
- Link crown carrier status to player HP changes
- Detect unexplained HP jumps during crown carry
- Track shield changes

### Crown Guard Analytics
- Aggregate which guards engage with crowns
- Track guard death/respawn in relation to crown events
- Analyze guard escort effectiveness

---

# Phase 2: Enhanced 4-Layer Architecture (v2)

Based on playtesting feedback and log analysis, the system has been enhanced with **4 intentional layers** to catch root causes without flooding logs with noise.

## Design Intent

Every log should answer **"why did this happen?"** not just **"this happened."**

The system targets two critical failure patterns observed in logs:
1. **Leader election thrashing** - guards switching leaders every tick (hidden by flat logs)
2. **Actions with missing targets** - guards casting with `targetId: undefined` (no visibility into why)

---

## Layer A: Crown State Timeline (What Happened)

**Events**: CROWN_SPAWNED, CROWN_PICKUP_ATTEMPT, CROWN_PICKED_UP, CROWN_DROPPED, CROWN_RESET, CROWN_CAPTURED, CROWN_CARRIER_CHANGED, CROWN_INVALID_STATE

Each event includes:
```javascript
{
  time: gameTime,
  crownId: string,
  team: 'teamA' | 'teamB' | 'teamC',
  pos: { x, y },
  carrierId: entityId | null,
  carrierType: 'player' | 'guard' | 'enemy' | null,
  velocity: { x, y } | null,
  reason: string,
  matchId, tick, gameTime  // correlation IDs
}
```

**How to read it**: Like a story. "Crown A spawned → Player attempted pickup → Crown A picked up → Player died → Crown A dropped → Guard picked up → Crown A reset (timeout)"

If crown shows PICKED_UP but never DROPPED when player dies, you found a bug.

---

## Layer B: Guard State Machine & Actions (Why Guards Act)

**State Transitions**: IDLE → ACQUIRE_TARGET → CHASE → ENGAGE → ESCORT → RETURN_HOME → STUCK_RECOVERY/ABORT

**Key Events**:
- `GUARD_STATE_CHANGE`: When guard transitions states
  - Includes: `prevState`, `newState`, `reason`, `timeInPrevState`, `targetId`
  - Example: "Guard_42: CHASE → STUCK_RECOVERY (stuck 3s, no progress toward carrier)"

- `ACTION_BLOCKED`: When guard intends action but can't execute
  - Includes: `intendedAction`, `blockedReason` ('cooldown', 'stunned', 'out-of-range', 'line-of-sight-blocked', 'target-invalid')
  - Example: "Guard_42 blocked from attack: out-of-range"

- `ACTION_RESOLVED`: Final outcome of guard action
  - Includes: `action`, `resolvedTargetId`, `failureReason`
  - Example: "Guard_42 attack FAILED: target-died" OR "Guard_42 attack resolved to target guard_carrier"

**Diagnostic patterns**:
- **Stuck**: Guard stays in CHASE for 30+ seconds → STUCK_RECOVERY (pathfinding issue or distance calc wrong)
- **Thrashing**: Guard ACQUIRE → CHASE → ABORT [repeats every tick] (leader unstable, see Layer C)
- **No-op actions**: Guard ENGAGE → ACTION_BLOCKED [repeats 5 times] → ABORT (distance calculation broken)

---

## Layer C: Target Scoring & Leader Election (Why Decisions Made)

**Key Events**:

`LEADER_ELECTED`: When guard ball leader changes
```javascript
{
  ballId: string,
  prevLeaderId: entityId | null,
  newLeaderId: entityId,
  reason: string,  // "distance-best", "threat-active", "tied-score", "rotation-timer"
  holdDuration: number,  // Ticks before next election (prevents thrashing)
  topCandidates: [
    {
      id, name, score,
      components: { distanceScore, threatScore, objectiveScore }
    },
    // ... top 3
  ],
  scoreBoard: string  // Human readable: "Guard_A(1.2) [dist:1.2 threat:0 obj:0] | Guard_B(0.9) ..."
}
```

`TARGET_SCORED`: When guard chooses a target
```javascript
{
  guardId,
  winner: {
    id, name,
    type: 'crown' | 'carrier' | 'enemy' | 'escort-point',
    score: 9.2,
    components: { distanceWeight, threatWeight, objectiveWeight }
  },
  filtered: [
    { id, name, filterReason: 'stunned' },
    { id, name, filterReason: 'line-of-sight-blocked' }
  ]
}
```

**Diagnostic patterns**:
- **Thrashing**: Leader elected EVERY TICK (holdDuration = 0), topCandidates show tied scores → Add "hold leader X ticks" rule
- **Wrong target**: TARGET_SCORED shows dead/stunned guard as winner, valid targets filtered out → Check filter logic (e.g., "stunned check inverted")
- **Oscillation**: prevLeaderId/newLeaderId flip between same two guards → Confirm holdDuration > 0

---

## Layer D: Coordinate Anomaly Detection (When Math is Wrong)

**Strategy**: Default silent. Only log when suspicious.

**Thresholds**:
- Distance > 2000 units (map is ~2400x2400)
- Ratio near 4.0 (4x scale mismatch) or 0.25 (reverse)
- NaN/undefined coordinates
- Crown logic aborts due to "too far" or coordinate validation fails

**Event**:
```javascript
{
  type: 'COORD_ANOMALY',
  entityType: 'guard' | 'crown' | 'carrier',
  entityPos: { x, y },
  targetPos: { x, y },
  distance: 2145.3,
  ratioX: 4.02,     // entity.x / target.x
  ratioY: 0.98,
  verdict: 'HUGE_DISTANCE' | 'SCALE_NEAR_4X' | 'SCALE_NEAR_0.25' | 'NaN_VALUES' | 'RATIO_OFF',
  reason: string,   // Context: "evaluating crown pickup range", "scoring targets"
}
```

**Key advantage**: Zero spam when coordinates are fine. Only see Layer D logs when actual math is broken.

---

## Correlation System

Every event includes:
```javascript
{
  matchId: 'match_1738922400000_abc123def',  // Unique per session
  tick: 127,                                  // Frame number
  gameTime: 42.5,                            // Seconds
  entityId: 'guard_42' | 'crown_A' | null    // What this is about
}
```

**Why it matters**: Join crown logs with ability usage logs. "Guard cast fireball at tick 127" + "Crown scoring chose guard at tick 127" = direct cause.

---

## No-Op / Failure Reason Tracking

Explicit events for when systems **fail to act**:

- `NO_CROWN_TARGET`: reason = 'crownMissing' | 'carrierUnknown' | 'crownInSafeZone'
- `NO_VALID_SITE`: reason = 'sitesEmpty' | 'wrongTeam' | 'coordsInvalid'
- `PATH_FAIL`: reason = 'noPath' | 'stuck' | 'unreachable'
- `ACTION_BLOCKED`: reason = 'cooldown' | 'stunned' | 'leashExceeded'

**Why**: Without explicit no-ops, "nothing happened" is unactionable. With them, you immediately know if it's a data problem, logic problem, or expected behavior.

---

## Integration Checklist

**Layer A (Crown Events)** - Already implemented:
- ✅ `logCrownPickup()` - Crown pickup logic
- ✅ `logCrownDrop()` - Death handler
- ✅ `logCrownSecured()` - Base approach
- ✅ `logCrownCarrierStatus()` - Respawn handler

**Layer B (Guard State Machine)** - New, to be integrated:
- `logGuardStateTransition(guard, fromState, toState, reason, targetId)` - Whenever state changes
- `logActionBlocked(guard, intendedAction, blockedReason, targetId)` - Before action attempts
- `logActionResolution(guard, action, resolvedTargetId, failureReason)` - After action resolves

**Layer C (Target Scoring)** - New, to be integrated:
- `logLeaderElection(ballId, prevLeaderId, newLeaderId, topCandidates, reason, holdDuration)` - Leader selection logic
- `logTargetScored(guard, candidates)` - Guard target selection

**Layer D (Coordinate Validation)** - New, auto-called:
- `logCoordinateAnomaly(entityId, entityType, samplePos, targetPos, distance, ratioX, ratioY, reason)` - Distance checks

**No-Op Tracking** - New, to be integrated:
- `logNoCrownTarget(team, reason)` - When crown not found
- `logNoValidSite(reason)` - When site invalid
- `logPathFail(entityId, reason)` - When pathfinding fails

---

## Implementation Status

**v2 Enhancement Summary**:
- ✅ Correlation system implemented (matchId + tick tracking)
- ✅ Event buffer increased to 1000 events (from 500)
- ✅ All Layer B/C/D logging functions added to `crown-debug.js`
- ✅ Helper function `getCorrelationContext()` for adding IDs to all events
- ⏳ Integration calls needed in:
  - Guard state machine (ACQUIRE_TARGET → CHASE → ENGAGE transitions)
  - Target scoring logic (leader election + target selection)
  - Action failure points (attack/heal/taunt/move blocks)

---

## Summary

The Crown Debug Logging system now provides comprehensive visibility with:
- **4 intentional layers** capturing what/why/how/when
- **Real-time checkbox control** (no reload needed)
- **Zero performance impact** when disabled
- **Downloadable logs** for analysis
- **Correlation IDs** linking events across systems
- **Explicit no-op tracking** for failure diagnostics
- [x] Checkbox syncs with game loop
- [x] Log file downloads with correct format
- [x] Events capture crown pickup
- [x] Events capture crown drop on death
- [x] Events capture crown secured at base
- [x] Events capture respawn with crown
- [ ] Test with multiple crowns simultaneously
- [ ] Test rapid pickup/drop sequences
- [ ] Verify log file size with 500 events

---

## Known Limitations

1. **Event Array Size:** Max 500 events (prevents unbounded memory growth)
2. **File Format:** Text only (JSON planned for Phase 2)
3. **Real-time Console:** Not live-streamed (only available at download)
4. **Guard Events:** Not yet integrated (Phase 2)

---

## Console Commands (Developer Use)

```javascript
// Enable logging from console
enableCrownDebug(window.state, true);

// Disable logging
enableCrownDebug(window.state, false);

// Get current report
getCrownDebugReport(window.state);

// Clear all events
clearCrownDebugLog(window.state);

// Manual export
exportCrownDebugLog(window.state);
```

---

## Integration Points

| Location | Function | Purpose |
|----------|----------|---------|
| `initGame()` | `initCrownDebugSystem()` | System initialization |
| `updateGame()` | `enableCrownDebug()` | Checkbox sync |
| Crown pickup logic | `logCrownPickup()` | Event capture |
| Death handler | `logCrownDrop()` | Event capture |
| Base approach | `logCrownSecured()` | Event capture |
| Respawn handler | `logCrownCarrierStatus()` | Event capture |
| UI button | `exportCrownDebugLog()` | File download |

---

## Summary

The Crown Debug Logging system provides comprehensive visibility into crown mechanics with:
- **4 core event types** capturing the full crown lifecycle
- **Real-time checkbox control** (no reload needed)
- **Zero performance impact** when disabled
- **Downloadable logs** for analysis
- **Future-proof architecture** for Phase 2 enhancements
