# Known Bugs & Issues Tracker

This document tracks active bugs that need investigation and fixing.

---

## 🔴 CRITICAL BUGS

### 1. Friendly Guards Not Spawning Consistently After Flag Capture

**Status**: Active  
**Priority**: High  
**Affects**: Flag defense mechanics, gameplay balance

**Description**:
When player captures a flag, friendly guards sometimes fail to spawn immediately. Spawning is inconsistent - guards may appear after a delay or sometimes not at all. Enemy guards always spawn correctly when enemy teams capture flags.

**Expected Behavior**:
- Player captures flag → Toast message "Captured! Friendlies will spawn to defend"
- 5 guards (2 Healers + 3 DPS) spawn immediately in pentagon formation around flag
- Guards should be visible and defending within 1 frame of capture

**Actual Behavior**:
- Guards spawn inconsistently
- Sometimes no guards spawn
- Sometimes guards spawn after a delay
- Enemy guards work perfectly

**Code Location**:
- [src/game/world.js](src/game/world.js) lines 320-440: `spawnGuardsForSite()`
- [src/game/world.js](src/game/world.js) lines 580, 609: Calls to `spawnGuardsForSite()` on capture

**Recent Fixes Attempted**:
- Fixed `siteId` vs `homeSiteId` property mismatch (line 328, 372)
- Fixed occupancy check to only check guards (line 371)
- Fixed weapon assignment in `assignNpcEquipment()`

**Debug Steps**:
1. Open console and watch for `[spawnGuardsForSite]` logs
2. Capture a flag and check:
   - "Called for site" log
   - "currentGuards" count
   - "Total spawned" count
   - Check if guards appear in `state.friendlies` array
3. Check if `state._npcUtils` is properly set

**Possible Causes**:
- Race condition in spawn timing
- `state._npcUtils` not initialized when spawn is called
- Guard count logic still incorrect
- Position collision detection too aggressive
- Function being called before site data is fully updated

---

### 2. Active Effects Not Displaying During Gameplay

**Status**: Active  
**Priority**: High  
**Affects**: Player visibility of buffs/debuffs, Emperor mechanic feedback

**Description**:
Active effects icons and information do not appear in real-time during gameplay. This includes:
- Player buffs (including Emperor Power buff 🔱)
- Player debuffs/DoTs
- Passive effects
- All active effects should show but are not syncing/updating

**Expected Behavior**:
- Active effects appear in 3 locations:
  1. **HUD** (buffIconsHud) - Above ability bar on main screen
  2. **Level Tab** - Effect icons with timers
  3. **Level Tab** - levelEffectsList detailed list
- Emperor buff (🔱) should show with "∞" timer and gold styling
- All buffs/debuffs update in real-time as they are applied/removed

**Actual Behavior**:
- Effects added to `state.player.buffs` array correctly (confirmed via debug)
- `buildActiveEffectIcons()` not being called or not returning expected data
- `buffIconsHud.innerHTML` and `levelEffectsList.innerHTML` not updating
- Emperor buffs apply (stats work) but don't show visually

**Code Location**:
- [src/game/ui.js](src/game/ui.js) lines 3304-3327: `buildActiveEffectIcons()`
- [src/game/ui.js](src/game/ui.js) lines 3329-3336: `updateBuffIconsHUD()`
- [src/game/ui.js](src/game/ui.js) lines 4708-4799: Level tab effects rendering
- [src/game/game.js](src/game/game.js) line 5357-5383: `addEmperorEffect()` - adds buff and calls UI updates

**Debug Output** (from testEmperorBuff):
```
✓ Emperor buff added to state.player.buffs
❌ buildActiveEffectIcons is not a function! (scope issue)
✓ buffIconsHud element exists
✓ After update: HTML shows emperor buff added to innerHTML
```

**Findings**:
- Buff IS in state.player.buffs array ✓
- DOM elements exist ✓
- HTML IS being set after UI update ✓
- But effects still not visible during normal gameplay ✗

**Possible Causes**:
- UI update functions not being called during gameplay loop
- `renderHud()` not calling `updateBuffIconsHUD()` regularly
- Buff data format incorrect during actual gameplay vs test
- CSS hiding the elements (z-index, display, visibility)
- Game loop not triggering UI updates frequently enough
- State reference issues (stale state vs live state)

**Next Steps**:
1. Add logging to game loop to confirm `updateBuffIconsHUD()` is called
2. Check if `renderHud()` is being called every frame
3. Verify buff format in `state.player.buffs` during actual gameplay
4. Check CSS for buffIconsHud and levelEffectsList visibility
5. Compare working test scenario vs live gameplay scenario

---

## 🟡 MEDIUM PRIORITY

### 3. Group Member Loadout Loading
**Status**: Recently Added  
**Priority**: Medium

**Description**: Feature added to load player's saved ability loadouts to group members. Needs testing to confirm it works properly.

**Location**: [src/game/ui.js](src/game/ui.js) - `ui._loadGroupMemberLoadout()`

---

## 🟢 RESOLVED

### ~~Guard Weapon Assignment~~
**Status**: Fixed  
**Fixed In**: Session 2026-01-01

**Issue**: Warriors and other multi-weapon classes weren't getting weapons assigned.  
**Fix**: Modified `assignNpcEquipment()` to check if weapon already exists and handle `loadout.weapons` array properly.

---

## Testing Checklist

When testing fixes, verify:

**Friendly Guard Spawning**:
- [ ] Capture neutral flag → 5 guards spawn immediately
- [ ] Capture enemy flag → old guards destroyed, 5 new guards spawn immediately  
- [ ] Guards have weapons equipped
- [ ] Guards have correct composition (2 Healer Mages, 1 Warrior, 1 Knight, 1 Tank)
- [ ] Guards defend flag area

**Active Effects Display**:
- [ ] Apply skill buff → shows in HUD above abilities
- [ ] Apply skill buff → shows in Level tab effects list
- [ ] Take damage → DoT/debuff shows with timer
- [ ] Become Emperor → 🔱 icon shows in all 3 locations
- [ ] Lose Emperor → 🔱 icon disappears
- [ ] Passive equipment effects show in Level tab
- [ ] Effects update in real-time (timers count down)

---

## Debug Commands

```javascript
// Check friendly guards at a site
state.friendlies.filter(f => f.guard && f.homeSiteId === 'site_1')

// Check player buffs
state.player.buffs

// Test emperor buff (toggle on/off)
testEmperorBuff()

// Check if UI update functions exist
typeof updateBuffIconsHUD
typeof buildActiveEffectIcons

// Force UI update
updateBuffIconsHUD()
renderLevel()
renderHud()

// Check buff icons HTML
document.getElementById('buffIconsHud').innerHTML

// Check state reference
window._gameState === state
```

---

**Last Updated**: 2026-01-01  
**Active Bugs**: 2  
**Resolved**: 1
