# AI Behavior Tracking System

## Overview
Comprehensive AI behavior tracking has been implemented to debug AI decision loops, target thrashing, stuck detection, and behavior changes.

## What's Being Tracked

### 1. **Decision Changes**
- Tracks when AI units change their current action/decision
- Examples: `attack_enemy` → `capture_objective` → `return_base`
- Detects **decision thrashing** (changing decisions too frequently)
- Warning threshold: >20 decision changes with <10s between warnings

### 2. **Target Changes**
- Tracks when AI units switch combat targets
- Records target name, HP, distance, and priority
- Detects **target thrashing** (switching targets too frequently)
- Warning threshold: >15 target changes with <10s between warnings

### 3. **Behavior Changes**
- Tracks changes between Aggressive ↔ Neutral behavior modes
- Shows old and new behavior states
- Triggered by player input in Unit Inspect Panel

### 4. **Position Loop Detection (Stuck Detection)**
- Checks AI position every ~2 seconds
- Tracks last 10 positions with movement distance
- Detects **stuck loops**: Average movement <30 units over 10 seconds
- Warns when AI is trying to move but not making progress

### 5. **Combat Engagement/Disengagement**
- Tracks when AI enters combat
- Tracks when AI leaves combat
- Records target, distance, and priority values

### 6. **Priority Shifts**
- Tracks changes in targeting priority
- Shows when AI switches from flags → enemies → players

## How to Use

### In-Game Console
```javascript
// Download AI behavior log
window.downloadAIBehaviorLog()
```

### Settings Menu
1. Open ESC menu → Settings
2. Scroll to "Download Logs" section
3. Check "AI Behavior Tracking" checkbox
4. Click "Download All Selected Logs"

## Log Output Format

The log groups events by unit for easy analysis:

```
================================================== Warden Irene (friendly) ==================================================
Total Events: 47
Role: WARDEN
Team: player

[42.50s]   DECISION_CHANGE → attack_walls (target: Team A Flag, dist: 125)
[43.20s]   TARGET_CHANGE → Knight (HP: 850, dist: 95)
[43.20s]   COMBAT_ENGAGE → Knight (HP: 850, dist: 95, priority: 80)
[45.10s]   DECISION_CHANGE → attack_enemy (target: Knight, dist: 75)
[47.30s]   POSITION_CHECK ⚠️ STUCK_LOOP_DETECTED (3 stuck warnings) (avg movement: 22.4)
[50.00s]   DECISION_CHANGE → capture_objective (target: Team B Flag, dist: 180) ⚠️ DECISION_THRASHING (24 changes)
```

## Warnings Explained

### ⚠️ DECISION_THRASHING
- AI is changing decisions very frequently (>20 times)
- Indicates: Indecisive AI stuck between multiple valid actions
- Common causes: Equal priority targets, pathfinding issues, combat interruptions

### ⚠️ TARGET_THRASHING
- AI is switching combat targets very frequently (>15 times)
- Indicates: Confused targeting logic or equal priority targets
- Common causes: Multiple enemies at same priority, target death loops

### ⚠️ STUCK_LOOP_DETECTED
- AI is barely moving (<30 units average) over 10 seconds while trying to move
- Indicates: Pathfinding failure, environment collision, or unit collision
- Common causes: Decorative objects blocking path, unit stacking, wall collision

## Current Environment Collision Handling

### Stuck Detection System (game.js lines 2700-2800)
```
1. Normal movement: AI tries 9 sample angles to find clear path
2. If ALL angles blocked for >0.25s: Try jitter nudge (random offset)
3. If stuck for >2s: IGNORE environment collision (trees, rocks, decorations)
4. If stuck for >4s: Auto-revert (re-enable collisions)
```

### Known Issues
- **Decorative objects** (decorativeCircles) can trap AI
- Stuck detection works but may not be aggressive enough
- 2-second threshold means AI can appear "stuck" for noticeable time

### Potential Improvements
1. **Reduce stuck threshold**: 2s → 1s for faster escape
2. **Add pathfinding**: A* or flow field to route around obstacles
3. **Add repulsion force**: Push units away from decorations when stuck
4. **Smart jitter**: Bias jitter away from obstacle center
5. **Teleport escape**: After 3s stuck, small teleport (20-30 units) toward goal

## Combat Logging Verification

Combat logging IS implemented and working (game.js lines 1098-1125):
- Player damage: Logs to `state.combatLog`
- Enemy attacks: Line 4595 `applyDamageToPlayer()`
- Shield damage: Separate entries for shield-only damage

### If You See No Combat Logs:
1. **Check if combat is happening**: Look for damage numbers, HP changes
2. **Verify log initialization**: `state.combatLog` array exists
3. **Download logs**: Use `window.downloadCombatLog()` console command
4. **Check sample rate**: Some logs use 1-5% sampling to reduce spam

## Console Commands

```javascript
// Download specific logs
window.downloadPlayerLog()      // Player events: damage, healing, buffs
window.downloadCombatLog()      // Combat events: all damage/healing
window.downloadDebugLog()       // Debug diagnostics: calculations, mechanics
window.downloadAIBehaviorLog()  // AI behavior: decisions, targets, stuck detection

// Check log status
state.aiBehaviorLog.length      // Number of AI behavior events logged
state.combatLog.length          // Number of combat events logged
```

## Integration Points

### Guard AI (game.js ~3215-3280)
- Tracks target changes when guard selects priority target
- Logs combat engagement with priority and distance

### Non-Guard AI (game.js ~3680-3720)
- Tracks decision changes after role-based logic
- Tracks position loops every ~2s

### UI Behavior Buttons (ui.js ~3270-3310)
- Can track behavior changes when player clicks Aggressive/Neutral
- (Currently not implemented - would need to import logAIBehavior)

## Performance Impact
- Minimal: Only significant changes are logged
- Max 500 events stored (auto-trim old events)
- Position checks are sampled every 2 seconds
- No impact when logs are disabled

## Next Steps for Debugging
1. **Play for 2-3 minutes** to generate AI behavior data
2. **Download AI Behavior Log** via console or settings
3. **Search for warnings**: Look for STUCK_LOOP, DECISION_THRASHING, TARGET_THRASHING
4. **Identify problematic units**: See which AI units have most warnings
5. **Check position history**: If stuck, see if unit is oscillating or truly frozen
6. **Cross-reference with combat log**: Verify damage is being dealt during engagements

## Example Debug Session
```javascript
// 1. Check if logs are accumulating
state.aiBehaviorLog.length  // Should grow during gameplay

// 2. View recent events
state.aiBehaviorLog.slice(-10)  // Last 10 events

// 3. Find stuck units
state.aiBehaviorLog.filter(e => e.warning === 'STUCK_LOOP_DETECTED')

// 4. Download for detailed analysis
window.downloadAIBehaviorLog()
```
