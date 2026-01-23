# Fighter Card Reveal Feature - Design Notes

## Current Implementation (TO BE REMOVED)
Located in: `src/game/ui.js` - `ui.showFighterCardReveal()` function

### What It Does:
1. Shows cycling animation for 2 seconds with random card images from inventory
2. Level number displayed above the cycling cards
3. After 2 seconds, shows final card reveal (90x120px)
4. Auto-hides after additional 2 seconds
5. Triggered on level up event

### To Restore Later:
- Enable: `ui.showFighterCardReveal(card)` call in `game.js` level up handler
- Currently disabled/removed to start fresh with new design
- Keep the function in code but don't call it during level up

---

## Desired Future Design:
- Random images cycling for 2 seconds
- Large random image display after cycling (full size, impressive reveal)
- Smooth transitions between cycling and final reveal
- Consider sound effects and animations
- Make it feel like a loot box opening moment
