# Implementation Checklist - Orb RPG Modular

**IMPORTANT:** Always check which folder is being served FIRST before editing!
- Running from `http://127.0.0.1:3000/index.html` → Edit `/orb-rpg/src/` folder
- Running from root → Edit `/src/` folder

---

## Phase 1: Slot System & Core Updates (COMPLETE ✅)

### Files Modified:
- [ ] `/orb-rpg/src/game/ui.js` - Slot UI implementation
- [ ] `/orb-rpg/src/game/game.js` - Slot logic
- [ ] `/orb-rpg/src/game/render.js` - Slot rendering

### Verification:
Search for: `"slot"` in ui.js, `"getSlots"` in game.js

---

## Phase 2: Additional Features (COMPLETE ✅)

### 2.1 NPC Movement Tracking
- [ ] `/orb-rpg/src/game/game.js` - NPC movement logging
- Search for: `"NPC_MOVEMENT"` or `"trackNPCMovement"`

### 2.2 Respawn Confirmation Logging  
- [ ] `/orb-rpg/src/game/game.js` - Respawn event logging
- Search for: `"GUARD_RESPAWNED"` or `"ALLY_RESPAWNED"`

### 2.3 Boss Image Display Fix
- [ ] `/orb-rpg/src/game/render.js` - Boss image rendering
- Search for: `"bossImageMap"` or `"toLowerCase"`

### 2.4 Comprehensive Testing Guide
- [ ] Created: `/orb-rpg/COMPREHENSIVE_TESTING_GUIDE.md`

---

## Phase 3: On-Screen Ability Display (COMPLETE ✅)

### Files That MUST Be Modified (Check All):

#### 1. UI Checkbox & Container - ui.js
- [ ] Line ~1473: `showAbilityDisplay` checkbox added
- [ ] Line ~1485: `abilityCastDisplay` HTML container added
- [ ] Line ~1736: `showAbilityDisplay:$('showAbilityDisplay')` in UI object
- **Search for:** `abilityCastDisplay`

#### 2. Ability Tracking - game.js  
- [ ] Line ~3040: Comment "TRACK RECENT ABILITY CASTS FOR ON-SCREEN DISPLAY"
- [ ] Line ~3042-3057: `state.recentAbilityCasts` tracking code
- [ ] Must be OUTSIDE the `if(shouldTrack)` block (independent of log checkbox)
- **Search for:** `TRACK RECENT ABILITY CASTS FOR ON-SCREEN DISPLAY`

#### 3. Display Function - render.js
- [ ] End of file: `export function updateAbilityCastDisplay(state, ui)`
- [ ] Function reads `state.recentAbilityCasts`
- [ ] Function builds HTML display with timestamps
- **Search for:** `updateAbilityCastDisplay`

#### 4. Main Game Loop - main.js
- [ ] Line ~8: Import statement includes `updateAbilityCastDisplay`
- [ ] Line ~207: Game loop calls `updateAbilityCastDisplay(state, ui)`
- **Search for:** `updateAbilityCastDisplay` (should be in 2 places: import + call)

#### 5. Cache Buster - index.html
- [ ] Version tag incremented (e.g., `v=20260118e`)
- [ ] Both stylesheet and script tags updated
- **Search for:** `?v=` and increment the letter

### Quick Verification Script (Run in Browser Console):
```javascript
// Check if display element exists
console.log('Display exists:', !!document.getElementById('abilityCastDisplay'));

// Check if tracking is working
console.log('Recent casts array:', state.recentAbilityCasts);

// Check if function is available
console.log('Function available:', typeof updateAbilityCastDisplay === 'function');
```

---

## How to Verify All Changes Are Synchronized

### Method 1: Search Strategy
For each component above, search in BOTH folders:
```
1. Search: "abilityCastDisplay" in /orb-rpg/src/ → should find 2 matches (ui.js + render.js)
2. Search: "updateAbilityCastDisplay" in /orb-rpg/src/ → should find 3 matches (main.js import + call, render.js definition)
3. Search: "TRACK RECENT ABILITY CASTS" in /orb-rpg/src/game/game.js → should find 1 match
```

### Method 2: Compare File Modifications  
- Check file modification times - recently modified files should be today's date
- If files are from different dates, you edited the wrong version

### Method 3: Browser Verification
After hard refresh (Ctrl+Shift+R):
1. Look for "Recent Ability Casts" display in bottom-left corner
2. Cast an ability → display should show the cast
3. Check browser console (F12) for any error messages

---

## Checklist Template for Future Changes

When making NEW changes:

```
[ ] Identify which folder is being served
    URL: ___________________
    Folder: [ ] /orb-rpg/src/  [ ] /src/

[ ] List all files to modify:
    - File 1: _________________
    - File 2: _________________
    - File 3: _________________

[ ] Make changes to ACTIVE folder only

[ ] Search for key terms to verify changes exist

[ ] Update version tag in index.html (?v=TIMESTAMP)

[ ] Hard refresh browser (Ctrl+Shift+R)

[ ] Test functionality in-game

[ ] If also need /src/ folder synced, copy changes there too
```

---

## Common Mistakes to Avoid

❌ **WRONG:** Edit `/src/` when running from `/orb-rpg/`  
✅ **RIGHT:** Check URL first, edit matching folder

❌ **WRONG:** Forget to update version tag in index.html  
✅ **RIGHT:** Increment cache buster (v=20260118a → v=20260118b)

❌ **WRONG:** Only partially copy changes to both folders  
✅ **RIGHT:** Use systematic search to verify all components exist in active folder

❌ **WRONG:** Test without hard refresh  
✅ **RIGHT:** Ctrl+Shift+R to clear browser cache

---

**Last Updated:** January 18, 2026
**All Components:** ✅ VERIFIED & SYNCHRONIZED
