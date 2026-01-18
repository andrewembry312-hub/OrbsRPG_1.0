# Game Logging System

## Overview
Implemented a continuous game logging system that captures important gameplay events and persists them to browser storage for debugging. The system is designed to help identify and track bugs like guard spawning inconsistencies and active effects display issues.

## Features

### 1. Automatic Logging
- **Continuous Capture**: Events are logged in real-time during gameplay
- **Auto-Save**: Game logs automatically save to browser localStorage every 30 seconds
- **Session Tracking**: Each game session has a unique session ID based on start time
- **Event Limit**: Keeps last 500 events in memory to prevent memory bloat

### 2. User Controls

#### Options Menu
Located in ESC → Options, new option added:
- **"Auto-save game log (debug)"** - Checkbox to enable/disable logging
  - When enabled, gameplay events are automatically captured
  - Logs save every 30 seconds in background

#### Debug Section
New Debug section in Options with:
- **"Download Game Log"** button - Exports current session log as JSON file
  - File format: `orb-rpg-log_YYYY-MM-DD_HH-mm-ss.json`
  - Contains all events with timestamps since session start
  - Perfect for sharing with developers for bug investigation

### 3. Logged Events
The logging system tracks:
- Flag captures and ownership changes
- Guard spawning (already has console logging)
- Emperor status changes
- Group member garrison actions
- Active effects applied/removed
- Errors and state issues
- Performance timing

### 4. Technical Details

#### State Structure
Added to `state.gameLog`:
```javascript
{
  enabled: false,          // Toggle via options
  events: [],             // Array of logged events
  startTime: 0,           // Session start timestamp
  lastSaveTime: 0         // Last auto-save timestamp
}
```

#### Event Structure
Each logged event contains:
```javascript
{
  timestamp: 1234,        // Milliseconds since session start
  type: 'event_type',     // What happened (e.g., 'flag_captured')
  data: {}                // Event-specific data
}
```

#### Storage
- **In-Memory**: Current session logs stored in `state.gameLog.events`
- **Browser Storage**: Periodically saved to localStorage as `gameLog_<sessionId>`
- **Download**: Can export entire session log as JSON for analysis

### 5. How to Use

#### Enabling Logging
1. During gameplay, press ESC to open menu
2. Click "Options"
3. Check "Auto-save game log (debug)"
4. Click "Apply Options"
5. Return to game - logging is now active

#### Downloading Logs
1. Press ESC → Options
2. Click "Download Game Log" button
3. Browser will download JSON file with all events
4. Send file to developers for analysis

#### Storage Persistence
- Logs auto-save every 30 seconds to browser localStorage
- Can be retrieved later even if page is closed
- Named with session ID for easy tracking

## Debugging Benefits

### Guard Spawning Issues
The system logs:
- When spawnGuardsForSite() is called
- Guard count and occupation checks
- Guard positions and equipment assignment
- Helps identify timing issues with inconsistent spawning

### Active Effects Display
When effects are logged, we can correlate:
- When buffs are added to state
- When effects rendering updates
- Timing gaps that might explain display issues
- Can identify if effects exist but aren't being rendered

### Performance Monitoring
Logs can reveal:
- Spike patterns in gameplay
- When certain actions cause lag
- Performance correlation with specific events

## Implementation Files Modified

### src/game/state.js
- Added `gameLog` object initialization (lines 133-140)

### src/game/game.js
- Added logging functions (lines 5606-5660):
  - `addGameLogEvent(state, eventType, data)` - Log an event
  - `initGameLogging(state)` - Initialize logging system
  - `saveGameLogToStorage(state)` - Save to localStorage
  - `downloadGameLog(state)` - Export as JSON file
  - `clearGameLog(state)` - Clear current session logs

### src/game/ui.js
- Added checkbox in Options menu (line 1191)
- Added Download Log button (lines 1221-1226)
- Added element references (line 1467-1468, 1465)
- Added checkbox sync to UI (line 2754)
- Added button handler (lines 5095-5106)

### src/main.js
- Added imports for logging functions (line 6)
- Initialize logging on game loop start (lines 75-77)
- Auto-save timer every 30 seconds (lines 85-93)

## Example Log Output

When downloaded, logs look like:
```json
{
  "generatedAt": "2024-01-15T14:30:45.123Z",
  "sessionStartTime": "2024-01-15T14:15:00.000Z",
  "totalEvents": 247,
  "events": [
    {
      "timestamp": 1250,
      "type": "guard_spawned",
      "data": {
        "siteId": "site_0",
        "guardCount": 5,
        "variant": "warrior"
      }
    },
    {
      "timestamp": 8500,
      "type": "flag_captured",
      "data": {
        "siteId": "site_1",
        "capturedBy": "player",
        "previousOwner": null
      }
    }
  ]
}
```

## Future Enhancement Opportunities

1. **Real-time Log Viewer**: In-game panel showing recent events
2. **Filtering**: Filter logs by event type or time range
3. **Analytics**: Automatic pattern detection for bugs
4. **Remote Logging**: Send logs to server for analysis
5. **Performance Profiling**: Track frame times and bottlenecks
6. **Error Tracking**: Catch and log runtime errors automatically

## Notes for Testing

- Enable logging BEFORE reproducing bugs
- Run for at least 30 seconds so logs auto-save
- Download log and examine timeline of events
- Look for timing gaps or missing events
- Share logs when reporting complex bugs

The logging system is non-invasive - disabling it has zero performance impact. Leave it on during testing for maximum debugging capability.
