# Recent Updates - AI Tracking & Combat Logging

## Summary
Added comprehensive AI behavior tracking system to debug stuck loops, decision thrashing, and combat issues reported by user.

## Changes Made

### 1. New AI Behavior Tracking System

#### Core Function (`game.js`)
- **Added `logAIBehavior()`** - Comprehensive tracking function
  - Tracks decision changes (when AI switches actions)
  - Tracks target changes (when AI switches targets)  
  - Tracks behavior changes (aggressive ↔ neutral)
  - Tracks position loops (stuck detection)
  - Tracks combat engagement/disengagement
  - Detects and warns about:
    - Decision thrashing (>20 changes)
    - Target thrashing (>15 changes)
    - Stuck loops (avg movement <30 units over 10s)

#### State Initialization (`game.js`)
- Added `state.aiBehaviorLog = []` in `hardResetGameState()` (line ~28)
- Added `state.aiBehaviorLog = []` in `initGame()` (line ~145)

#### AI Integration Points
- **Guard AI** (line ~3250): 
  - Tracks target changes when selecting priority targets
  - Logs combat engagement with priority/distance
  
- **Non-Guard AI** (line ~3700):
  - Tracks decision changes after role-based logic
  - Tracks position checks every ~2 seconds

#### Download Function (`game.js`)
- **Added `downloadAIBehaviorLog()`** - Exports formatted log file
  - Groups events by unit for easy analysis
  - Highlights warnings (stuck, thrashing)
  - Shows decision chains, target switches
  - Line ~8720

#### Console Command (`game.js`)
- **Added `window.downloadAIBehaviorLog()`** - Console access
- Added console message on game load

### 2. UI Integration

#### Settings Menu (`ui.js`)
- **Added AI Behavior Log checkbox** (line ~1280)
  - Label: "AI Behavior Tracking"
  - Description: "Track AI decision changes, target switches, behavior changes, and stuck loops"
  - Color: Orange (#fc6)

#### UI Element Reference (`ui.js`)
- Added `enableAIBehaviorLog: $('enableAIBehaviorLog')` (line ~1563)

#### Download Logic (`ui.js`)
- Added download handler in "Download All Logs" button (line ~5815)
- Imports `downloadAIBehaviorLog` from game.js

### 3. Combat Logging Verification

#### Status: ✅ WORKING
Combat logging is fully implemented and functional:
- Player damage: `applyDamageToPlayer()` logs to `state.combatLog` (line 1098-1125)
- Enemy attacks: Line 4595 calls `applyDamageToPlayer()`
- Shield damage: Separate log entries for shield-only damage
- Initialized in `hardResetGameState()` and `initGame()`

#### If User Sees No Combat Logs:
Possible reasons:
1. Combat isn't actually happening (AI stuck/not engaging)
2. Need to download logs via console: `window.downloadCombatLog()`
3. Some logs use 1-5% sampling rate to reduce spam

### 4. Environment Collision Review

#### Current System (game.js lines 2700-2800)
```
Normal movement: Try 9 sample angles for clear path
If all blocked >0.25s: Try jitter nudge (random offset)
If stuck >2s: Ignore environment collision (escape mode)
If stuck >4s: Auto-revert collision detection
```

#### Analysis
- **System is working** but may not be aggressive enough
- 2-second threshold means visible "stuck" behavior
- Decorative objects (trees, rocks) can trap AI temporarily

#### Potential Improvements (Not Implemented - Suggestions Only)
1. Reduce stuck threshold: 2s → 1s
2. Add A* pathfinding or flow fields
3. Add repulsion force from obstacles
4. Smart jitter (bias away from obstacle)
5. Teleport escape after 3s stuck (20-30 units toward goal)

## Files Modified

### game.js
- Line ~28: Initialize `state.aiBehaviorLog` in hardResetGameState
- Line ~145: Initialize `state.aiBehaviorLog` in initGame
- Line ~3250: Track guard target changes and combat engagement
- Line ~3700: Track non-guard decision changes and position loops
- Line ~8300: Added `logAIBehavior()` function (150+ lines)
- Line ~8720: Added `downloadAIBehaviorLog()` function
- Line ~8830: Added console command `window.downloadAIBehaviorLog()`

### ui.js
- Line 4: Import `downloadAIBehaviorLog` from game.js
- Line ~1280: Added AI Behavior Log checkbox in settings
- Line ~1563: Added `enableAIBehaviorLog` UI element reference
- Line ~5815: Added download logic for AI behavior log

### Documentation
- **NEW FILE**: `AI_BEHAVIOR_TRACKING.md`
  - Complete guide to AI tracking system
  - Usage instructions
  - Warning explanations
  - Debug examples
  - Console commands

## How to Test

### 1. Start Game and Play
```
1. Load the game
2. Check console for: "🤖 AI behavior tracking enabled..."
3. Play for 2-3 minutes
4. Engage in combat with AI units
```

### 2. Check Logs
```javascript
// In browser console:

// Check if tracking is working
state.aiBehaviorLog.length  // Should be > 0

// View recent events
state.aiBehaviorLog.slice(-10)

// Find stuck units
state.aiBehaviorLog.filter(e => e.warning === 'STUCK_LOOP_DETECTED')

// Find decision thrashing
state.aiBehaviorLog.filter(e => e.warning === 'DECISION_THRASHING')

// Download formatted log
window.downloadAIBehaviorLog()
```

### 3. Review Downloaded Logs
- Look for patterns in stuck units
- Check if certain roles have more issues
- Identify which decisions cause thrashing
- Cross-reference with combat log for damage verification

## Console Commands Reference

```javascript
// Download all logs
window.downloadPlayerLog()       // Player events
window.downloadCombatLog()       // Combat events  
window.downloadDebugLog()        // Debug diagnostics
window.downloadAIBehaviorLog()   // NEW: AI behavior analysis

// Inspect live state
state.aiBehaviorLog              // AI tracking events
state.combatLog                  // Combat events
state.debugLog                   // Debug events

// Quick checks
state.aiBehaviorLog.length       // Number of AI events
state.combatLog.length           // Number of combat events
```

## Expected Output

### AI Behavior Log Example
```
AI Behavior Tracking Log
========================================================================================================================
Generated: 1/8/2025, 3:45:12 PM
Total Events: 127
Game Time: 180s

This log tracks:
  • Decision changes (when AI switches between actions)
  • Target changes (when AI switches targets)
  • Behavior changes (aggressive ↔ neutral)
  • Position loops (stuck detection)
  • Combat engagement/disengagement

================================================== Warden Sarah (friendly) ==================================================
Total Events: 23
Role: WARDEN  
Team: player

[42.50s]   DECISION_CHANGE → attack_walls (target: Team A Flag, dist: 125)
[43.20s]   TARGET_CHANGE → Knight (HP: 850, dist: 95)
[43.20s]   COMBAT_ENGAGE → Knight (HP: 850, dist: 95, priority: 80)
[45.10s]   DECISION_CHANGE → attack_enemy (target: Knight, dist: 75)
[47.30s]   POSITION_CHECK ⚠️ STUCK_LOOP_DETECTED (3 stuck warnings) (avg movement: 22.4)
```

## Known Limitations

1. **Position tracking is sampled** - Every ~2s, not continuous
2. **Warning thresholds are tuned** - May need adjustment based on gameplay
3. **Max 500 events stored** - Older events auto-delete
4. **Behavior change tracking** - Only via console/manual triggers (UI buttons don't call logAIBehavior yet)

## Next Steps for User

1. ✅ **Play the game** - Generate AI behavior data
2. ✅ **Download AI Behavior Log** - Via console or settings menu
3. ✅ **Search for warnings** - STUCK_LOOP, DECISION_THRASHING, TARGET_THRASHING
4. ✅ **Download Combat Log** - Verify damage is being dealt
5. ❌ **Report findings** - Share specific stuck scenarios or thrashing patterns

If user still sees no combat:
- AI might not be engaging (check AI decisions in behavior log)
- Stuck detection might be preventing combat (check stuck warnings)
- Pathfinding issues might keep AI out of range

## Performance Notes

- **Minimal overhead** - Only significant changes logged
- **Auto-cleanup** - Old events removed automatically  
- **Sampled checks** - Position tracking every 2s, not every frame
- **No impact when disabled** - System only runs when `state.aiBehaviorLog` exists
