# Tutorial System Implementation Guide

## Overview
The tutorial system consists of 4 core modules:

1. **tutorialEngine.js** - Core state management and tutorial flow
2. **tutorialContent.js** - All tutorial content (12 tiers × 3-5 steps each)
3. **tutorialTriggers.js** - Auto-detection of critical game moments
4. **tutorialUI.js** - Modal UI rendering with gold/black theme

## File Structure
```
src/tutorial/
├── tutorialEngine.js      (400 lines)
├── tutorialContent.js     (900 lines)
├── tutorialTriggers.js    (400 lines)
├── tutorialUI.js          (600 lines)
├── tutorialSystem.js      (integration)
└── IMPLEMENTATION.md      (this file)
```

## Tutorial Tiers (Progression Path)

### Tier 1: Game Basics
- **welcome** - Introduction to the game
- **movement** - How to move the character
- **uiNavigation** - Understanding the UI

### Tier 2: Combat System
- **combatBasics** - How combat works
- **abilityIntro** - Using abilities in combat
- **abilitySlots** - Setting up ability slots

### Tier 3: Loot & Inventory
- **lootSystem** - Understanding loot and rarity
- **inventory** - Managing inventory

### Tier 4: Equipment System
- **equipmentSystem** - Equipping gear and comparing items

### Tier 5: Progression
- **progressionSystem** - Leveling up and stat allocation

### Tier 6: Groups
- **groupSystem** - Recruiting and managing NPCs
- **abilityAssignment** - Assigning abilities to group members

### Tier 7: Status Effects
- **buffsDebuffs** - Understanding buffs and debuffs

### Tier 8: Outposts
- **outpostSystem** - Capturing and defending outposts

### Tier 9: Dungeons
- **dungeonIntro** - Entering dungeons

### Tier 10: Trading
- **market** - Buying/selling at markets

### Tier 11: Guards
- **guardSystem** - Deploying and managing guards

### Tier 12: Advanced Topics
- **combatTactics** - Advanced combat strategies
- **farmingGuide** - Efficient resource gathering

## Auto-Triggers

Tutorials automatically appear at these critical moments:

| Trigger | Tutorial | Condition |
|---------|----------|-----------|
| game_start | welcome | Game initialized |
| first_enemy_encounter | combatBasics | Enemy within range |
| first_ability_use | abilityIntro | Ability cast by player |
| first_loot_drop | lootSystem | Items on ground |
| inventory_opening | abilitySlots | Inventory opened |
| inventory_full | inventory | No inventory space |
| first_equipment_pickup | equipmentSystem | Equipment item acquired |
| first_level_up | progressionSystem | Player reaches new level |
| npc_recruitment | groupSystem | NPC recruited |
| member_in_group | abilityAssignment | Member added to group |
| first_buff_applied | buffsDebuffs | Status effect applied |
| outpost_area_reached | outpostSystem | Enter outpost area |
| dungeon_reached | dungeonIntro | Enter dungeon |
| market_reached | market | Enter merchant area |
| guard_slot_unlocked | guardSystem | Guard unlocks |
| combat_tactics_hint | combatTactics | 10+ combat encounters |
| farming_efficiency | farmingGuide | 1+ hour playtime |

## Integration Steps

### Step 1: Import in main.js
```javascript
import { initializeTutorialSystem } from './tutorial/tutorialSystem.js';
```

### Step 2: Initialize after game setup
```javascript
const { tutorial, ui, triggers } = initializeTutorialSystem(state, game);
```

### Step 3: Add to game loop
```javascript
function gameLoop(now) {
  // ... existing game update code ...
  
  // Update tutorial triggers
  if (state.tutorialUpdate) {
    state.tutorialUpdate(now);
  }
  
  // ... rest of game loop ...
}
```

### Step 4: Skip game updates during tutorials
```javascript
function update(delta) {
  // Don't update game while tutorial active
  if (state.tutorial && state.tutorial.isTutorialActive()) {
    return;
  }
  
  // Normal game update
  // ...
}
```

### Step 5: Track game events
Add these calls at appropriate points in game.js:

```javascript
// When combat starts
state.hasEncounteredEnemy = true;

// When ability cast
state.hasUsedAbility = true;

// When loot drops
state.hasSeenLoot = true;

// When NPC recruited
state.hasRecruitedNPC = true;

// When player levels up
state.hasLeveledUp = true;

// When entering outpost area
state.hasReachedOutpost = true;

// When guard slot unlocks
state.guardSlotUnlocked = true;

// When entering dungeon
state.hasReachedDungeon = true;
```

## Customization

### Add New Tutorial
1. Add entry to `TUTORIAL_CONTENT` in tutorialContent.js
2. Add trigger to `TRIGGER_MAPPING` 
3. Add trigger helper method to TutorialTriggers if needed

### Change UI Theme
Edit the colors in `tutorialUI.js` createStyles():
- Gold: `#FFD700`
- Black: `rgba(0, 0, 0, 0.95)`
- Gold shadow: `0 0 20px rgba(255, 215, 0, 0.5)`

### Adjust Trigger Conditions
Edit helper methods in TutorialTriggers class:
- `hasEnemiesNearby()` - Distance threshold
- `shouldShowCombatTips()` - Combat count threshold
- `hasBeenPlayingLong()` - Playtime threshold

### Add Tutorial Images
Place images in:
```
assets/tutorial/
├── basics/
├── combat/
├── loot/
├── equipment/
├── progression/
├── groups/
├── buffs/
├── outposts/
├── dungeons/
├── market/
└── guards/
```

Update image paths in tutorialContent.js

## Testing

### Enable Debug Mode
```javascript
state.tutorial.debug = true; // Log all triggers
```

### Show Specific Tutorial
```javascript
state.tutorial.queueTutorial('combatBasics', true); // Priority
```

### Reset Completion
```javascript
state.tutorial.resetProgress(); // Clear localStorage
```

### Check Trigger Status
```javascript
console.log(state.tutorial.triggers); // Active triggers
```

## Performance Notes

- Trigger checks run every 100ms (configurable in tutorialTriggers.js)
- Tutorial modal is hidden when not active (not removed from DOM)
- Only active step content is rendered
- localStorage saves only on completion changes

## Troubleshooting

### Tutorial won't show
1. Check if tutorials enabled: `state.tutorial.enabled`
2. Verify trigger condition in game state
3. Check browser console for errors

### Wrong tutorial appearing
1. Verify trigger priority in tutorialContent.js
2. Check if previous tutorial was completed
3. Review TRIGGER_MAPPING conditions

### UI not displaying correctly
1. Check CSS animations loaded: `document.querySelector('#tutorial-styles')`
2. Verify modal z-index doesn't conflict (9999 is set)
3. Check screen resolution for responsive design

## API Reference

### TutorialEngine
- `initialize()` - Set up first-time tutorials
- `queueTutorial(id, priority)` - Add tutorial to queue
- `showTutorial(id)` - Display tutorial immediately
- `nextStep()` - Next step in tutorial
- `previousStep()` - Previous step
- `closeTutorial()` - Close active tutorial
- `checkTriggers()` - Check all registered triggers
- `enable() / disable()` - Toggle tutorials
- `isTutorialActive()` - Check if tutorial showing
- `saveProgress() / loadProgress()` - Persistence

### TutorialUI
- `initialize()` - Set up UI elements
- `showTutorial(tutorial, step)` - Render tutorial
- `updateProgress(current, total)` - Update progress bar
- `nextStep() / previousStep()` - Navigate steps
- `closeTutorial()` - Hide tutorial

### TutorialTriggers
- `registerAllTriggers()` - Register default triggers
- `registerTrigger(id, condition)` - Add custom trigger
- `update(now)` - Check all triggers
- Various helper methods for game state detection

## Storage

Tutorials use localStorage with keys:
- `orb_tutorial_completed` - Completed tutorial IDs
- `orb_tutorial_disabled` - If tutorials disabled
- `orb_tutorial_progress` - Current step in active tutorial

Data persists across browser sessions.
