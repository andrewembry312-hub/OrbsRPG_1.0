# Testing with the Debug Logging System

## Quick Start: Test Guard Spawning Bugs

### Setup (30 seconds)
1. **Start a new game**
   - Choose a hero
   - Wait for game to load

2. **Enable logging**
   - Press ESC
   - Click "Options"
   - Check "Auto-save game log (debug)"
   - Click "Apply Options"
   - Return to game

### Test Scenario 1: Guard Spawning Inconsistency

**Objective:** Capture a flag and verify guards spawn consistently

**Steps:**
1. Move to a neutral flag (purple circle)
2. Stand on it for 5-10 seconds until captured
3. Notice if guards spawn immediately or with delay
4. Capture 2-3 different flags
5. Note any inconsistencies

**What to watch for:**
- Guards appearing after 1-2 seconds? ✅
- Guards appearing after 5+ seconds? ⚠️ BUG
- Guards not appearing at all? 🔴 BUG
- Only 1-2 guards instead of 5? ⚠️ PARTIAL BUG

### Test Scenario 2: Active Effects Display

**Objective:** Verify Emperor buff displays correctly

**Steps:**
1. Enable logging (as above)
2. Have an Emperor in your group
3. Right-click on Emperor to apply the Emperor skill
4. Watch for buff icon appearing in HUD (top-left corner)
5. Switch between heroes to test effect sync

**What to watch for:**
- Buff icon appears immediately? ✅
- Buff icon appears after delay? ⚠️ TIMING ISSUE
- Buff icon never appears but Emperor is active? 🔴 RENDERING BUG
- Buff icon shows wrong duration? ⚠️ SYNC ISSUE

### Collecting the Log

**When to download:**
- After 1-2 minutes of play
- After reproducing the bug
- At least 30 seconds have passed (ensures auto-save)

**How to download:**
1. Press ESC
2. Click "Options"
3. Click "Download Game Log" button
4. File saves as: `orb-rpg-log_YYYY-MM-DD_HH-mm-ss.json`

## Understanding the Log File

### Open in Any Text Editor
```
Windows: Right-click → Open With → Notepad
Mac: Double-click → Open With → TextEdit
Linux: cat orb-rpg-log_*.json | less
```

### Key Sections to Check

**1. Timeline of Events**
```json
{
  "timestamp": 5000,           // 5 seconds into session
  "type": "flag_captured",
  "data": { "siteId": "site_0" }
}
```

**2. Guard Spawning Events**
```json
{
  "timestamp": 5100,
  "type": "guard_spawned",
  "data": { "count": 5, "siteId": "site_0" }
}
```

**3. Timing Analysis**
Look for gaps:
- Flag captured at 5000ms
- Guards spawned at 5100ms = **100ms delay** ✅ GOOD
- Guards spawned at 8500ms = **3500ms delay** 🔴 BUG!

## Scenarios to Test

### Scenario A: Multiple Flag Captures
**Test:** Do all captures spawn guards consistently?
1. Capture Flag 1 → Watch spawn time
2. Capture Flag 2 → Watch spawn time  
3. Capture Flag 3 → Watch spawn time
4. Download log → Compare timestamps

**Expected Result:** All within 100-500ms of capture

### Scenario B: Heavy Combat Load
**Test:** Do effects sync under heavy action?
1. Enable logging
2. Spawn multiple guards
3. Fight enemies near flags
4. Check if buffs update in real-time
5. Download log → Look for effect timing gaps

**Expected Result:** Effects appear within 1 frame (16ms)

### Scenario C: Group Member Actions
**Test:** Do garrison assignments work smoothly?
1. Assign group member to defend a flag
2. Move to different area
3. Watch group member behavior
4. Capture flag near them
5. Download log → Check garrison vs group priority

**Expected Result:** Group member ignores group formation, defends flag

## Interpreting Common Patterns

### Pattern: Long Gaps Between Events
**Indicates:** Potential timing issue or game loop lag
**Action:** Note the timestamp and what was happening

### Pattern: Missing Events
**Indicates:** Guard spawn might have failed silently
**Action:** Cross-reference with in-game observations

### Pattern: Duplicate Events  
**Indicates:** Event triggered multiple times unexpectedly
**Action:** May cause cascading issues (double spawns, etc.)

### Pattern: Out-of-Order Events
**Indicates:** Asynchronous timing issue
**Action:** May explain effect sync problems

## Sharing Logs with Developers

### What to Include

1. **The log file** (`orb-rpg-log_*.json`)
2. **Description of what you did** (e.g., "Captured 3 flags quickly")
3. **What went wrong** (e.g., "Guards didn't spawn on flag 2")
4. **When it happened** (e.g., "At 45 seconds into session")
5. **Screenshots** (optional, but helpful)

### Email Template
```
Subject: Guard Spawning Bug Report - Debug Log Attached

Description:
Captured flags and noticed guards don't always spawn immediately.

Steps to Reproduce:
1. Start new game
2. Move to flag
3. Stand on flag to capture
4. Wait for guards to spawn

Expected: Guards appear in 1-2 seconds
Actual: Guards appear after 5+ seconds (or not at all)

Attached log shows this happening around 45 seconds into session.
```

## Tips for Better Debugging

### 1. Isolate Variables
- Test ONE thing at a time
- Don't mix flag captures with combat

### 2. Repeat Tests
- Bugs might be intermittent
- Run same scenario 3x to see pattern

### 3. Use Timestamps
- Note when you start test
- Download log at exact moment of bug
- Compare in-game time to log events

### 4. Clear Cache (If Still Buggy)
```javascript
// In browser console:
localStorage.removeItem('orb_rpg_mod_state');
location.reload();
```

### 5. Compare Logs
- Save multiple logs from different test runs
- Compare timestamps between "working" and "broken" scenarios
- Look for consistent differences

## Performance Impact

**Logging System Impact:**
- 📊 With Logging Enabled: +0-1% overhead
- ⚡ With Logging Disabled: No impact at all

**Storage Impact:**
- Browser Storage: ~50KB per 30-minute session
- Download File: ~100KB-300KB per session

**Performance Check:**
If you notice FPS drops:
1. Disable logging (uncheck option)
2. Reload page
3. Compare FPS
4. If same lag → Not logging issue
5. If FPS improves → Report the log before it happened

## Troubleshooting

### Q: Log file is empty
**A:** Logging wasn't enabled. Check if "Auto-save game log" was checked.

### Q: Can't find downloaded file
**A:** Check browser's Downloads folder. File named `orb-rpg-log_*.json`

### Q: Want to test without UI changes?
**A:** Open browser console (F12) and run:
```javascript
const state = window._gameState;
state.gameLog.enabled = true;
console.log('Logging enabled:', state.gameLog);
```

### Q: How to view logs from previous sessions?
**A:** In browser console:
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith('gameLog_'))
  .forEach(k => console.log(k, JSON.parse(localStorage[k])));
```

---

**Happy debugging!** The more detailed logs you provide, the faster we can fix issues. 🚀
