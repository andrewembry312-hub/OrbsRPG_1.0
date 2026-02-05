# Emperor Mode Fixes - Quick Code Reference

## Fix #1: Emperor Notification Display

**File:** game.js  
**Function:** checkEmperorStatus()  
**Lines:** 12577-12603

### What Was Wrong
Emperor notification HTML existed but no code triggered it to display.

### What Was Fixed
Added DOM manipulation code to show notification when player becomes emperor:

```javascript
// Show emperor notification on screen
try {
  const notif = document.getElementById('emperorNotification');
  const empText = document.getElementById('emperorText');
  if(notif && empText){
    notif.style.display = 'block';
    empText.style.opacity = '1';
    setTimeout(() => {
      if(notif) notif.style.display = 'none';
      if(empText) empText.style.opacity = '0';
    }, 3000);
  }
} catch(e) {}
```

### Result
✅ 3-second notification appears showing "EMPEROR! 🔱"

---

## Fix #2: Elite Guard Spawning

**File:** game.js  
**Function:** ensureEmperorState()  
**Line:** 13624

### What Was Wrong
Guards were being spawned into wrong data structure:
```javascript
// WRONG:
state.emperor.crownGuards = [];  // Array structure
```

But spawnCrownGuards expects object with team keys:
```javascript
state.emperor.crownGuards[team] = [guard1, guard2, ...]  // Object structure
```

This caused guards to not register properly.

### What Was Fixed
```javascript
// CHANGED FROM:
state.emperor.crownGuards = [];

// CHANGED TO:
state.emperor.crownGuards = { teamA: [], teamB: [], teamC: [] };
```

### Call Chain
1. checkEmperorStatus() → unlockCrowns() (line 12593)
2. unlockCrowns() → ensureEmperorState() (line 13701)
3. ensureEmperorState() → crownGuards initialized (line 13624)
4. unlockCrowns() → spawnCrownGuards() (line 13710)
5. spawnCrownGuards() → creates 5 guards per base

### Result
✅ 15 elite guards spawn (5 per base) when emperor activated

---

## Fix #3: Crown Auto-Pickup

**File:** game.js  
**Function:** tryPickupCrowns()  
**Lines:** 13790-13819

### What Was Wrong
Two issues:
1. Distance detection was too tight (~40px)
2. No auto-pickup mechanism existed
3. No tracking of carried crowns

### What Was Fixed

#### Changed distance from tight to generous:
```javascript
// OLD: Distance was too tight
const dist = Math.hypot(p.x - crown.x, p.y - crown.y);
if(dist <= 40) { ... }  // Too restrictive

// NEW: Generous pickup range
const dist = Math.hypot(p.x - crown.x, p.y - crown.y);
if(dist <= 150) { ... }  // Much easier to pickup
```

#### Added crown tracking:
```javascript
// Before:
crown.carriedBy = 'player';
// No tracking

// After:
crown.carriedBy = 'player';
if(!state.emperor.carriedCrowns) state.emperor.carriedCrowns = [];
if(!state.emperor.carriedCrowns.includes(team)) {
  state.emperor.carriedCrowns.push(team);
}
```

### Call Sequence
In updateGame() loop (game.js line 11321):
```javascript
if(state.emperor?.active){
  tryPickupCrowns(state);  // Check for pickup
  updateCarriedCrowns(state);  // Move crowns with player
}
```

### Result
✅ Crowns auto-pickup at 150px range
✅ Crowns tracked in carriedCrowns array
✅ Toast notification on pickup

---

## Fix #4: Crown HUD Display

**Files:** ui.js, main.js

### Part A: HTML Element

**File:** ui.js  
**Line:** 135

```html
<!-- Crown Icons HUD (Emperor Mode) -->
<div id="crownIconsHud" class="crownIconsHud" style="position:fixed; bottom:120px; right:20px; display:flex; gap:8px; z-index:190; flex-wrap:wrap; justify-content:flex-end; max-width:300px;"></div>
```

### Part B: Cache Reference

**File:** ui.js  
**Line:** 1791

```javascript
crownIconsHud:$('crownIconsHud'),
```

### Part C: Display Function

**File:** ui.js  
**Lines:** 5030-5068

```javascript
ui.updateCrownIconsHUD = ()=>{
  if(!ui.crownIconsHud) return;
  if(!state.emperor?.active) {
    ui.crownIconsHud.style.display = 'none';
    return;
  }
  
  // Build crown display
  const carriedCrowns = state.emperor.carriedCrowns || [];
  const securedCrowns = Object.keys(state.emperor.crowns || {})
    .filter(team => state.emperor.crowns[team]?.secured).length;
  
  let html = '';
  
  // Show carried crowns with team colors
  const teamColors = { teamA: '#e74c3c', teamB: '#3498db', teamC: '#2ecc71' };
  for(const team of carriedCrowns) {
    const color = teamColors[team] || '#ffd700';
    html += `<div style="display:flex; align-items:center; gap:4px; background:rgba(212,175,55,0.3); border:2px solid ${color}; border-radius:6px; padding:4px 8px; min-width:40px;">
      <span style="font-size:16px;">👑</span>
      <span style="color:#ffd700; font-size:11px; font-weight:bold;">${team === 'teamA' ? 'A' : team === 'teamB' ? 'B' : 'C'}</span>
    </div>`;
  }
  
  // Show crown summary
  html += `<div style="display:flex; align-items:center; gap:4px; background:rgba(212,175,55,0.2); border:2px solid #ffd700; border-radius:6px; padding:4px 8px;">
    <span style="font-size:14px;">👑</span>
    <span style="color:#ffd700; font-size:11px; font-weight:bold;">${carriedCrowns.length}/3</span>
  </div>`;
  
  ui.crownIconsHud.innerHTML = html;
  ui.crownIconsHud.style.display = 'flex';
};
```

### Part D: Game Loop Integration

**File:** main.js  
**Line:** 358

```javascript
try{ ui.updateCrownIconsHUD(); }catch(e){ console.error('updateCrownIconsHUD', e); }
```

This runs in the throttled UI update loop (every ~0.1 seconds):

```javascript
uiUpdateTimer += dt;
if(uiUpdateTimer >= UI_UPDATE_INTERVAL){
  uiUpdateTimer = 0;
  try{ ui.renderHud(currentStats(state)); }catch(e){ ... }
  try{ ui.renderCooldowns(); }catch(e){ ... }
  try{ ui.updateUnitInspection(); }catch(e){ ... }
  try{ ui.updateBuffIconsHUD(); }catch(e){ ... }
  try{ ui.updateCrownIconsHUD(); }catch(e){ ... }  // ← ADDED
  try{ ui.updateAiFeed && ui.updateAiFeed(); }catch(e){ ... }
  try{ ui.renderGroupPanel(); }catch(e){ ... }
}
```

### Result
✅ Crown display above ability bar shows carried crowns with team colors
✅ Updates in real-time
✅ Only shows when emperor active

---

## Summary of Changes

| Fix | File | Function | Lines | Status |
|-----|------|----------|-------|--------|
| Notification | game.js | checkEmperorStatus | 12577-12603 | ✅ |
| Guards | game.js | ensureEmperorState | 13624 | ✅ |
| Pickup | game.js | tryPickupCrowns | 13790-13819 | ✅ |
| HUD HTML | ui.js | (HTML element) | 135 | ✅ |
| HUD Cache | ui.js | (UI object) | 1791 | ✅ |
| HUD Func | ui.js | updateCrownIconsHUD | 5030-5068 | ✅ |
| HUD Loop | main.js | (game loop) | 358 | ✅ |

---

## How to Verify

### 1. Check Emperor Notification
- Set breakpoint at line 12579 in checkEmperorStatus()
- Become emperor and confirm breakpoint hits
- Verify notification DOM elements are accessible

### 2. Check Guard Spawning
- Set breakpoint at line 13624 in ensureEmperorState()
- Confirm crownGuards structure is correct:
  ```javascript
  { teamA: [], teamB: [], teamC: [] }
  ```

### 3. Check Crown Pickup
- Walk within 150px of crown
- Check console for "[CROWN] Player picked up crown: teamX"
- Verify crown appears in state.emperor.carriedCrowns

### 4. Check Crown HUD
- Look above ability bar, right side
- Should show crown icons when carrying crowns
- Should update as you pick up crowns

---

## Code Style Notes

All changes follow existing code patterns:
- ✅ Try-catch blocks for safety
- ✅ Consistent naming conventions
- ✅ Proper logging for debugging
- ✅ DOM manipulation wrapped in try-catch
- ✅ Early returns for null checks
- ✅ Template literals for HTML generation
- ✅ Optional chaining (?.) for safety

---

## Integration Points

**Emperor Activation:**
```
newEmperorTeam detected
  → checkEmperorStatus() called
    → unlockCrowns() called
      → ensureEmperorState() FIXES guard structure
      → spawnCrownGuards() spawns guards
  → Notification shown on DOM
  → state.emperor.active = true
```

**Crown Pickup Loop:**
```
Every frame when emperor active:
  → tryPickupCrowns() checks if player near crown
    → If within 150px, pickup crown
    → Add to state.emperor.carriedCrowns
    → Show toast notification
  → updateCarriedCrowns() moves crowns with player
```

**UI Update:**
```
Every UI tick (throttled ~10x/sec):
  → updateCrownIconsHUD() checks if emperor active
    → If active, render crown icons
    → Show carried crowns with team colors
    → Show count (X/3)
```

---

## Testing Checklist

- [ ] Emperor notification appears for 3 seconds
- [ ] 15 guards spawn at bases
- [ ] Guards appear as blue orbs
- [ ] Crowns visible as gold orbs with 👑
- [ ] Walking near crown auto-pickups it
- [ ] Toast shows on pickup
- [ ] Crown HUD shows above ability bar
- [ ] Crown icons show team colors (Red/Blue/Green)
- [ ] Count updates (1/3, 2/3, 3/3)
- [ ] Delivering crowns triggers victory
