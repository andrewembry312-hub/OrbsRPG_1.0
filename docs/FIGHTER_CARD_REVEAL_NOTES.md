# Fighter Card Reveal Feature - Design Notes

## Current Status: DORMANT (Code exists, not called during level-up)

**Location:** `src/game/ui.js` line 2447 - `ui.showFighterCardReveal()` function  
**Current Usage:** Function defined but NOT called (disabled intentionally)  
**Purpose:** Display celebratory animation when player receives a fighter card

---

## Current Implementation Details

### Function Signature
```javascript
ui.showFighterCardReveal = (card) => {
  // Creates modal UI with cycling card images
  // Plays animation sequence with smooth transitions
}
```

### What It Does
1. **Cycling Phase** (0-2 seconds): Shows random card images cycling from inventory
   - Displays level number above cards
   - Smooth fade transitions between images
   - Creates anticipation/loot-box feeling
2. **Final Reveal** (2-4 seconds): Shows final card at full size (90x120px)
   - The actual awarded card displayed
   - Impressive visual highlight
3. **Auto-Hide** (4+ seconds): Modal fades away
   - Returns to normal gameplay
   - Card has already been added to inventory

### Current Level-Up Flow
When player levels up (`awardXP()` function, line ~2116):
- ✅ Generates fighter card via `generateFighterCard()`
- ✅ Adds to inventory via `addFighterCard()`
- ✅ Plays level-up sound
- ✅ Displays notification toast
- ❌ **Does NOT call** `showFighterCardReveal()` (function exists but unused)
- ✅ Updates Cards tab UI

---

## Why It's Disabled

The feature was disabled to focus on core gameplay. The functionality still works but is intentionally not invoked during level-up to keep UI clean and focused.

---

## To Re-Enable in Future

Add one line to `game.js` in the `awardXP()` function (after card is created):

```javascript
// In awardXP(), around line 2117 (where showLevelUp is called)
if (state.ui && state.ui.showFighterCardReveal && newCard) {
  state.ui.showFighterCardReveal(newCard);  // ← Add this line
}
```

---

## Desired Future Enhancements (When Re-enabled)

1. **Sound Effects**: Add "reveal whoosh" sound during cycling phase
2. **Particle Effects**: Glowing particles around final card
3. **Star Animation**: Animate 5-star rating appearance
4. **Rarity-based Styling**: Gold glow for legendary, purple for epic
5. **Confetti**: Brief confetti animation on final reveal

---

## Related Code

**Fighter Card Generation**: `generateFighterCard()` in `fighter-cards.js`  
**Card Inventory Management**: `addFighterCard()` in `game.js`  
**Level-Up Handler**: `awardXP()` in `game.js` lines 2050-2120  
**Victory Reward System**: `showVictoryRewardUI()` in `game.js` (uses similar modal pattern)
