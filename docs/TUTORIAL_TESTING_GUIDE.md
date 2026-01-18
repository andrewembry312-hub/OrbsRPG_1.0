# Tutorial System Testing Guide

## Quick Start

The tutorial system is now integrated into main.js and will initialize automatically when you start a new game.

### Test Checklist

#### Initial Setup
- [ ] Open game in browser
- [ ] Create new game (should see **welcome** tutorial)
- [ ] Complete welcome tutorial by clicking Next through all steps
- [ ] Tutorial modal should disappear when closed
- [ ] Game should pause while tutorial is active

#### Auto-Trigger Testing

Each trigger can be tested by performing the action in-game. The tutorial should automatically appear.

**Tier 1: Game Basics**
- [ ] **welcome** - Appears on game start (priority trigger)
- [ ] **movement** - Should queue after welcome completes
- [ ] **uiNavigation** - Should queue to teach UI elements

**Tier 2: Combat System**
- [ ] **combatBasics** - Move near an enemy (should trigger when combat starts)
- [ ] **abilityIntro** - Cast an ability in combat
- [ ] **abilitySlots** - Open inventory and check ability slots panel

**Tier 3: Loot & Inventory**
- [ ] **lootSystem** - Kill an enemy to drop loot (should trigger when items appear)
- [ ] **inventory** - Fill inventory completely (should warn about space)

**Tier 4: Equipment System**
- [ ] **equipmentSystem** - Pick up equipment item (any weapon or armor)

**Tier 5: Progression**
- [ ] **progressionSystem** - Level up your character (reach next level)

**Tier 6: Groups**
- [ ] **groupSystem** - Recruit an NPC companion
- [ ] **abilityAssignment** - Add member to group and assign abilities

**Tier 7: Buffs/Debuffs**
- [ ] **buffsDebuffs** - Get hit by enemy that applies a buff or debuff

**Tier 8: Outposts**
- [ ] **outpostSystem** - Enter an outpost area

**Tier 9: Dungeons**
- [ ] **dungeonIntro** - Enter a dungeon

**Tier 10: Trading**
- [ ] **market** - Enter a market area with merchants

**Tier 11: Guards**
- [ ] **guardSystem** - Unlock guard system (at specific level or event)

**Tier 12: Advanced**
- [ ] **combatTactics** - Engage in 10+ combat encounters
- [ ] **farmingGuide** - Play for 1+ hour

## Debug Commands

Use these in the browser console to test tutorials:

### Show Specific Tutorial
```javascript
// Show welcome tutorial immediately
state.tutorial.queueTutorial('welcome', true);

// Show combat basics
state.tutorial.queueTutorial('combatBasics', true);

// Show any tutorial by ID
state.tutorial.queueTutorial('groupSystem', true);
```

### Check Tutorial Status
```javascript
// See current tutorial state
console.log(state.tutorial.currentTutorial);
console.log(state.tutorial.currentStep);
console.log(state.tutorial.isTutorialActive());

// See all registered triggers
console.log(state.tutorialTriggers);

// Check if tutorials enabled
console.log(state.tutorial.enabled);
```

### Reset Tutorial Progress
```javascript
// Clear all completed tutorials
state.tutorial.resetProgress();

// Clear localStorage
localStorage.removeItem('orb_tutorial_completed');
localStorage.removeItem('orb_tutorial_disabled');
localStorage.removeItem('orb_tutorial_progress');
```

### Enable Debug Mode
```javascript
// Log all trigger checks
state.tutorial.debug = true;
state.tutorialTriggers.debug = true;
```

### Test Trigger Conditions
```javascript
// Simulate conditions for testing
state.hasEncounteredEnemy = true;
state.hasUsedAbility = true;
state.hasSeenLoot = true;
state.hasLeveledUp = true;
state.hasRecruitedNPC = true;
state.hasReachedOutpost = true;
state.hasReachedDungeon = true;

// Force a trigger check
state.tutorial.checkTriggers();
```

## Expected Behavior

### Tutorial Modal
- Appears as gold-bordered overlay on black background
- Centered on screen with max 800px width
- Title in large gold text
- Content description in white text
- Previous/Skip/Next buttons at bottom
- Progress bar showing current step
- Tips section with helpful hints
- Image (if available) with gold border

### Navigation
- **Next Button**: Advances to next step or closes if on last step
- **Previous Button**: Goes to previous step (disabled on first step)
- **Skip Button**: Red button to dismiss tutorial entirely
- **Close Button**: X button to close modal

### Game State
- Game should **pause** when tutorial shows
- All game updates should **stop** (movement, combat, UI updates)
- HUD should still **render** so player can see stats
- Pressing keys should **not** affect game
- Game should **resume** when tutorial closes

### Persistence
- Completed tutorials saved to `localStorage`
- Key: `orb_tutorial_completed` (array of tutorial IDs)
- Disabled tutorials saved to `localStorage`
- Key: `orb_tutorial_disabled` (boolean)
- Progress loaded on game load
- Progress saves on each completion

## Troubleshooting

### Tutorial not showing on game start
1. Check browser console for errors
2. Verify tutorial system initialized: `console.log(state.tutorial)`
3. Check if tutorials disabled: `state.tutorial.enabled`
4. Re-enable: `state.tutorial.enable()`

### Wrong tutorial showing
1. Check tutorial queue: `console.log(state.tutorial.queue)`
2. Check current tutorial: `console.log(state.tutorial.currentTutorial)`
3. Manually show: `state.tutorial.queueTutorial('welcome', true)`

### Modal not appearing
1. Check CSS loaded: `document.querySelector('#tutorial-styles')`
2. Check if tutorial active: `state.tutorial.isTutorialActive()`
3. Check z-index conflicts (tutorial uses z-index 9999)

### Game not pausing
1. Check pause status: `console.log(state.gamePaused)`
2. Check pause reason: `console.log(state.pauseReason)`
3. Verify loop respects pause: Check `startGameLoop()` in main.js

### Triggers not firing
1. Enable debug: `state.tutorialTriggers.debug = true`
2. Check game state has required properties:
   - `state.player` (exists)
   - `state.enemies` (array)
   - `state.friendlies` (array)
   - `state.sites` (array for outposts)
   - `state.dungeons` (array)
3. Check trigger helper methods in tutorialTriggers.js
4. Manually trigger: `state.tutorial.checkTriggers()`

### Images not showing
1. Tutorial images use paths like: `assets/tutorial/basics/welcome.png`
2. Create placeholder images or set image paths in tutorialContent.js
3. Missing images won't crash - they just won't display

## Performance Notes

- Tutorial checks run every 100ms (not every frame)
- Modal is hidden not deleted when closed
- Only active step content is in DOM
- localStorage operations are throttled

## Next Steps After Testing

1. **Create Image Assets**
   - Screenshots of game UI for each tutorial
   - Store in `assets/tutorial/` subdirectories
   - Update image paths in tutorialContent.js

2. **Adjust Trigger Conditions**
   - Fine-tune when tutorials appear
   - Edit helper methods in tutorialTriggers.js
   - Test with different playstyles

3. **Customize Content**
   - Update text based on game testing
   - Add game-specific tips
   - Adjust difficulty progression

4. **Monitor Analytics**
   - Track which tutorials players complete
   - Track which triggers fire most often
   - Identify confusing mechanics

## Console Commands Reference

| Command | Purpose |
|---------|---------|
| `state.tutorial.queueTutorial(id, true)` | Show tutorial immediately |
| `state.tutorial.enable()` | Turn on tutorials |
| `state.tutorial.disable()` | Turn off tutorials |
| `state.tutorial.resetProgress()` | Clear completion history |
| `state.tutorial.isTutorialActive()` | Check if modal showing |
| `state.tutorial.nextStep()` | Go to next step |
| `state.tutorial.closeTutorial()` | Close modal |
| `state.tutorialTriggers.debug = true` | Enable debug logging |
| `localStorage.clear()` | Clear all data (including tutorials) |

