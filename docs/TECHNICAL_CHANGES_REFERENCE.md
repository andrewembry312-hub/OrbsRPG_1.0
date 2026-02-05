# Technical Changes Reference

**Purpose:** Detailed code-level documentation of gameplay fixes  
**Scope:** 4 fixes applied in version 20260123a  
**Date:** January 23, 2026  
**Status:** ✅ IMPLEMENTED AND DEPLOYED  
**Use When:** Reviewing code changes, understanding implementation details, or reverting changes

## Change Log - January 23, 2026 (v20260123a)

---

## FILE: src/game/game.js

### CHANGE 1: Enemy Collision Reversed
**Location:** Lines 10903-10930  
**Section:** PLAYER-ENEMY COLLISION PREVENTION

**Before:**
```javascript
// Gentle push player away from enemy (VERY light - only if overlapping)
const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
const pushForce = (MIN_PLAYER_ENEMY_DIST - playerEnemyDist) * 0.15;
state.player.x += Math.cos(angle) * pushForce;
state.player.y += Math.sin(angle) * pushForce;
```

**After:**
```javascript
// Push enemy away from player (reverse angle)
const angle = Math.atan2(enemy.y - state.player.y, enemy.x - state.player.x);
const pushForce = (MIN_PLAYER_ENEMY_DIST - playerEnemyDist) * 0.3;
enemy.x += Math.cos(angle) * pushForce;
enemy.y += Math.sin(angle) * pushForce;
```

**Changes:**
- Angle calculation reversed (enemy direction instead of player direction)
- Push applied to enemy position instead of player position
- Push force increased to 0.3 (from 0.15) for better separation
- Min distance decreased to 40 (from 45)
- Added comment: "NO ENEMIES CAN PUSH THE PLAYER"

---

### CHANGE 2: Enhanced Card Reward Logging
**Location:** Lines 2054-2087  
**Section:** awardXP() function - Level Up Handler

**Before:**
```javascript
const newCard = generateFighterCard(newLevel, state.fighterCardInventory.nextCardId++);
if (newCard) {
  addFighterCard(state, newCard);
  console.log('[FighterCards] Awarded:', newCard.name, newCard.rarity, '★'.repeat(newCard.rating));
}

const msg = `<b>Level up!</b> Level <b>${newLevel}</b> (+2 stat points)${bonusMsg ? '<br>' + bonusMsg : ''}`;
```

**After:**
```javascript
const newCard = generateFighterCard(newLevel, state.fighterCardInventory.nextCardId++);
if (newCard) {
  addFighterCard(state, newCard);
  console.log('[FighterCards] ✅ Card Awarded:', newCard.name, `(${newCard.rarity})`, '★'.repeat(newCard.rating), '- Total cards:', state.fighterCardInventory.cards.length);
} else {
  console.warn('[FighterCards] ⚠️ Failed to generate card at level', newLevel);
}

const msg = `<b>Level up!</b> Level <b>${newLevel}</b> (+2 stat points)${bonusMsg ? '<br>' + bonusMsg : ''}${newCard ? `<br><span style="color:#d4af37;">📮 Fighter Card Received!</span>` : ''}`;
```

**Added:**
- Success emoji (✅) in console log
- Rarity shown in parentheses for clarity
- Total card count displayed in console
- Failure warning for card generation errors
- UI toast includes "📮 Fighter Card Received!" in gold color
- New code block (lines 2076-2078):
  ```javascript
  // Update fighter cards tab if visible
  if (state.ui && state.ui.renderFighterCards) {
    state.ui.renderFighterCards();
  }
  ```

---

## FILE: src/game/ui.js

### CHANGE 1: Tooltip Auto-Close and Timeout
**Location:** Lines 2630-2685  
**Function:** ui._showCardTooltip() and ui._hideCardTooltip()

**Key Additions:**
```javascript
// Clear any existing hide timeout
if(ui._cardTooltipTimeout) clearTimeout(ui._cardTooltipTimeout);
// Auto-hide after 8 seconds if mouse hasn't moved
ui._cardTooltipTimeout = setTimeout(() => {
  if(tooltip) tooltip.style.display = 'none';
}, 8000);
```

And in hide function:
```javascript
// Clear timeout
if(ui._cardTooltipTimeout) clearTimeout(ui._cardTooltipTimeout);
```

**What Changed:**
- Tooltips now auto-hide after 8 seconds of inactivity
- Timeout is cleared when tooltip is manually hidden
- Prevents lingering tooltips from bugging the UI
- No more "tooltip stuck on screen" issues

---

### CHANGE 2: Added Mouseleave Event Handler
**Location:** Lines 8238-8254  
**Section:** Fighter card grid rendering in loadout picker

**Added Event:**
```javascript
cardEl.addEventListener('mouseleave', () => ui._hideCardTooltip());
```

**What This Does:**
- Tooltip hides immediately when mouse leaves the card
- Works in conjunction with mouseout event
- Ensures clean tooltip cleanup on UI transitions
- Added `powerRating` field to cardStatData for consistency:
  ```javascript
  rating: card.rating || 0
  ```

---

### CHANGE 3: Clear Slot Button and Function
**Location:** Lines 7999-8050  
**Sections:** Slot rendering UI + UI action functions

**Added Button HTML:**
```javascript
${loadoutData ? `<button class="secondary" style="padding:6px 10px; font-size:11px; background:#5a3a3a; border-color:#a55;" 
  onclick="ui._clearSlot('${slot.id}')" title="Remove fighter from slot">
  ✕ Clear
</button>` : ''}
```

**Added Function:**
```javascript
// Clear slot action - remove fighter assignment
ui._clearSlot = (slotId) => {
  const slot = (state.slotSystem?.guards || []).find(s => s.id === slotId) ||
               (state.slotSystem?.allies || []).find(s => s.id === slotId);
  if (slot) {
    slot.loadoutId = null;
    slot.level = 0;
    ui.renderSlotTab();
    ui.toast('✅ Slot cleared!');
  }
};
```

**Features:**
- Button only shows if fighter is assigned (`${loadoutData ? ... : ''}`)
- Red/dark styling (#5a3a3a, #a55) indicates destructive action
- Clears both loadoutId and level
- Shows success toast message
- Re-renders slot tab to update UI immediately

---

## FILE: index.html

### Version Bump
**Changed:** Cache buster version
```html
<!-- BEFORE -->
<link rel="stylesheet" href="./style.css?v=20260122d">
<script type="module" src="src/main.js?v=20260122d"></script>

<!-- AFTER -->
<link rel="stylesheet" href="./style.css?v=20260123a">
<script type="module" src="src/main.js?v=20260123a"></script>
```

**Purpose:** Forces browser to reload all files fresh (no cache)

---

## Testing Command Examples

### Console Commands (F12 to open)
```javascript
// Check if cards are being generated
console.log('Total cards:', state.fighterCardInventory.cards.length);

// View latest card
console.log(state.fighterCardInventory.cards[state.fighterCardInventory.cards.length - 1]);

// Check enemy collision distance
console.log('Player-enemy distance:', Math.hypot(state.player.x - state.enemies[0].x, state.player.y - state.enemies[0].y));

// Test tooltip timeout
console.log('Tooltip timeout ID:', window.ui._cardTooltipTimeout);
```

---

## Affected Systems
- ✅ Physics/Collision System (enemy movement)
- ✅ UI Rendering (tooltips, slot management)
- ✅ Progression System (card rewards display)
- ✅ Cache Management (version bump)

## Non-Affected Systems
- ❌ Combat damage calculations
- ❌ Ability system
- ❌ Guard AI behavior (except collision)
- ❌ Loot drops
- ❌ Item management

---

## Potential Issues to Watch
1. **Tooltip timeout:** If set too short, tooltips disappear before user reads them
2. **Enemy collision:** If push force too high, enemies might get stuck on boundaries
3. **Clear slot:** No confirmation dialog - button press immediately clears

## Future Improvements
1. Add confirmation dialog before clearing slot ("Are you sure?")
2. Make tooltip timeout adjustable in settings
3. Add visual feedback when enemy is pushed
4. Log card drops to analytics/progression tracking
