# Exact Line-by-Line Changes Reference

## File: src/game/world.js

### Change 1: Enemy Guard Spawn Independence
**Location**: Lines 442-448  
**Type**: Logic fix

**Before**:
```javascript
  } else if (site.owner === 'teamA' || site.owner === 'teamB' || site.owner === 'teamC') {
    // For AI teams, check how many guard slots PLAYER has unlocked
    const slotData = state.slotSystem?.guards || [];
    maxGuardsAllowed = slotData.filter(s => s.unlocked).length;
    console.log('[spawnGuardsForSite] Enemy team - limited by player slots:', maxGuardsAllowed);
```

**After**:
```javascript
  } else if (site.owner === 'teamA' || site.owner === 'teamB' || site.owner === 'teamC') {
    // AI team (non-base flags): INDEPENDENT - always allow 5 guards (NOT limited by player slots)
    // NOTE: Enemy teams should NOT be limited by player progression
    maxGuardsAllowed = 5;
    console.log(`[spawnGuardsForSite] ${site.owner} flag - INDEPENDENT guards (5 allowed, not limited by player slots)`);
```

---

## File: src/game/ui.js

### Change 1: Add Level Tab Skill Points Display Column
**Location**: Lines 420-436  
**Type**: UI HTML modification

**Before**:
```html
              <!-- Level Info Grid (2-column: Level, Stat Points) -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0;">
                <div style="font-size:18px; font-weight:bold;">Lv.<div id="levelTabCurrentLevel" style="font-size:20px; color:#ffff00;">1</div></div>
                <div style="font-size:18px; font-weight:bold;">Stat Pts<div id="levelTabStatPoints" style="font-size:20px; color:#00cc00;">0</div></div>
              </div>
```

**After**:
```html
              <!-- Level Info Grid (3-column: Level, Stat Points, Skill Points) -->
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin:10px 0;">
                <div style="font-size:18px; font-weight:bold;">Lv.<div id="levelTabCurrentLevel" style="font-size:20px; color:#ffff00;">1</div></div>
                <div style="font-size:18px; font-weight:bold;">Stat Pts<div id="levelTabStatPoints" style="font-size:20px; color:#00cc00;">0</div></div>
                <div style="font-size:18px; font-weight:bold;">Skill Pts<div id="levelTabSkillPoints" style="font-size:20px; font-weight:bold; color:#b56cff;">0</div></div>
              </div>
```

### Change 2: Add Element Reference to UI Object
**Location**: Line 1731  
**Type**: Object property addition

**Before**:
```javascript
    levelTabCurrentLevel:$('levelTabCurrentLevel'), levelTabStatPoints:$('levelTabStatPoints'),
```

**After**:
```javascript
    levelTabCurrentLevel:$('levelTabCurrentLevel'), levelTabStatPoints:$('levelTabStatPoints'), levelTabSkillPoints:$('levelTabSkillPoints'),
```

### Change 3: Add Skill Points Display in renderLevel()
**Location**: Line 5794  
**Type**: Display update addition

**Before**:
```javascript
      if(ui.levelTabCurrentLevel) ui.levelTabCurrentLevel.textContent = state.progression?.level || 0;
      if(ui.levelTabStatPoints) ui.levelTabStatPoints.textContent = state.progression?.statPoints || 0;
```

**After**:
```javascript
      if(ui.levelTabCurrentLevel) ui.levelTabCurrentLevel.textContent = state.progression?.level || 0;
      if(ui.levelTabStatPoints) ui.levelTabStatPoints.textContent = state.progression?.statPoints || 0;
      if(ui.levelTabSkillPoints) ui.levelTabSkillPoints.textContent = state.progression?.skillPoints || 0;
```

---

## File: src/game/game.js

### Change 1: Add Level Tab Sync to unlockSlot() - Part A
**Location**: Lines 484 (logging gate)  
**Type**: Conditional logging gate

**Before**:
```javascript
      console.log(`✅ Unlocked ${slotId}! (${state.progression.skillPoints} SP remaining)`);
```

**After**:
```javascript
      if(state.debugLog) console.log(`✅ Unlocked ${slotId}! (${state.progression.skillPoints} SP remaining)`);
```

### Change 2: Add Level Tab Sync to unlockSlot() - Part B
**Location**: Lines 490-491 (insert after mirror to AI)  
**Type**: Level tab sync addition

**Before**:
```javascript
      // Mirror to AI teams instantly
      mirrorSlotToAI(state, slotId, 'unlock');
      
      // If guard slot and player owns any flags, spawn guards
```

**After**:
```javascript
      // Mirror to AI teams instantly
      mirrorSlotToAI(state, slotId, 'unlock');
      
      // Update level tab skill points display
      if(state.ui && state.ui.levelTabSkillPoints) {
        state.ui.levelTabSkillPoints.textContent = state.progression.skillPoints || 0;
      }
      
      // If guard slot and player owns any flags, spawn guards
```

### Change 3: Add Conditional Gate to Guard Spawn Notification
**Location**: Line 498  
**Type**: Conditional logging gate

**Before**:
```javascript
          console.log(`🛡️ Guard slot unlocked! Spawning guards at ${playerFlags.length} player-owned flags...`);
```

**After**:
```javascript
          if(state.debugLog) console.log(`🛡️ Guard slot unlocked! Spawning guards at ${playerFlags.length} player-owned flags...`);
```

### Change 4: Add Level Tab Sync to upgradeSlot()
**Location**: Lines 541-542 (insert at end of upgradeSlot function)  
**Type**: Level tab sync addition

**Before**:
```javascript
      // Update UI if available
      if (state.ui && state.ui.renderSlotTab) {
        state.ui.renderSlotTab();
      }
      
      return true;
    },
```

**After**:
```javascript
      // Update level tab skill points display
      if(state.ui && state.ui.levelTabSkillPoints) {
        state.ui.levelTabSkillPoints.textContent = state.progression.skillPoints || 0;
      }
      
      // Update UI if available
      if (state.ui && state.ui.renderSlotTab) {
        state.ui.renderSlotTab();
      }
      
      return true;
    },
```

### Change 5: Add Conditional Gate to Upgrade Success Log
**Location**: Line 538  
**Type**: Conditional logging gate

**Before**:
```javascript
      console.log(`✅ Upgraded ${slotId} to level ${slot.level}! (${state.progression.skillPoints} SP remaining)`);
```

**After**:
```javascript
      if(state.debugLog) console.log(`✅ Upgraded ${slotId} to level ${slot.level}! (${state.progression.skillPoints} SP remaining)`);
```

### Change 6: Add Conditional Gate to assignLoadout Success Log
**Location**: Line 592  
**Type**: Conditional logging gate

**Before**:
```javascript
      slot.loadoutId = loadoutId;
      console.log(`✅ Assigned ${loadout.name} to ${slotId}`);
```

**After**:
```javascript
      slot.loadoutId = loadoutId;
      if(state.debugLog) console.log(`✅ Assigned ${loadout.name} to ${slotId}`);
```

### Change 7: Add Conditional Gates to Debug Unlock Command - Part A
**Location**: Line 676  
**Type**: Conditional logging gate

**Before**:
```javascript
        console.log(`💎 Added ${needed} SP for unlocking (total: ${state.progression.skillPoints})`);
```

**After**:
```javascript
        if(state.debugLog) console.log(`💎 Added ${needed} SP for unlocking (total: ${state.progression.skillPoints})`);
```

### Change 8: Add Conditional Gates to Debug Unlock Command - Part B
**Location**: Line 687  
**Type**: Conditional logging gate

**Before**:
```javascript
      console.log(`✅ Unlocked ${unlocked} slots! All 15 slots now available.`);
```

**After**:
```javascript
      if(state.debugLog) console.log(`✅ Unlocked ${unlocked} slots! All 15 slots now available.`);
```

### Change 9: Add Conditional Gate to Guard Respawn Log (killFriendly)
**Location**: Line 6371  
**Type**: Conditional logging gate

**Before**:
```javascript
        console.log(`[GUARD] ${f.name} at ${site.name} died. Respawning in 30s.`);
```

**After**:
```javascript
        if(state.debugLog) console.log(`[GUARD] ${f.name} at ${site.name} died. Respawning in 30s.`);
```

---

## File: orb-rpg/src/game/game.js

### Synchronized Changes (identical to main src/game/game.js)

**Change 1**: Add level tab sync to unlockSlot() (lines 481-491)  
**Change 2**: Gate unlock success log (line 484)  
**Change 3**: Gate guard spawn notification (line 501)  
**Change 4**: Add level tab sync to upgradeSlot() (lines 541-542)  
**Change 5**: Gate upgrade success log (line 538)  
**Change 6**: Gate assignLoadout success log (line 592)  
**Change 7**: Gate debug unlock SP log (line 676)  
**Change 8**: Gate debug unlock completion log (line 687)  
**Change 9**: Gate guard respawn log (line 6528)  

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Files Modified | 5 |
| HTML/Template Changes | 1 |
| JavaScript Logic Changes | 1 |
| Object Reference Additions | 1 |
| Display Update Additions | 1 |
| Level Tab Sync Additions | 2 |
| Conditional Logging Gates | 9 |
| **Total Changes** | **16** |

---

## Verification Command

To verify all changes are in place, search for these markers in the source files:

```javascript
// Search for: "levelTabSkillPoints" - Should appear 3x in ui.js, multiple in game.js
// Search for: "if(state.debugLog) console.log" - Should appear 9x total
// Search for: "INDEPENDENT guards (5 allowed" - Should appear 1x in world.js
// Search for: "Update level tab skill points display" - Should appear 2x in game.js
```

---

## Deployment Note

All changes are backward compatible and do not require database migrations or user actions. Changes are purely:
- Visual (UI element additions)
- Performance (conditional logging)
- Logic (correct enemy guard spawning)

Safe to deploy immediately after testing.

