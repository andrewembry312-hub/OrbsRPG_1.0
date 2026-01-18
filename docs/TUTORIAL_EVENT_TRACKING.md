# Game Event Tracking for Tutorials

To enable tutorial auto-triggers to fire, you need to add tracking calls at key points in your game code. This document shows where to add them.

## Events to Track

Add these flag-setting calls at the locations in your game.js file where these events occur:

### 1. First Enemy Encounter

**Location:** In `updateGame()` or where combat starts
**Action:** When an enemy gets within combat range or combat begins

```javascript
// In game.js, in updateGame() or combat startup
if (!state.hasEncounteredEnemy && state.enemies && state.enemies.length > 0) {
  state.hasEncounteredEnemy = true;
}
```

**Where to add:** Search for where enemies are detected or combat starts

---

### 2. First Ability Use

**Location:** In ability casting code
**Action:** When player casts any ability for the first time

```javascript
// In game.js, in castAbility() or ability execution
if (!state.hasUsedAbility) {
  state.hasUsedAbility = true;
}
```

**Where to add:** Near the end of ability casting logic, after ability executes

---

### 3. First Loot Drop

**Location:** In item drop code
**Action:** When loot spawns on the ground

```javascript
// In game.js, in dropLoot() or item generation
if (!state.hasSeenLoot && game.itemDrops && game.itemDrops.length > 0) {
  state.hasSeenLoot = true;
}
```

**Where to add:** When items are added to the game world/itemDrops array

---

### 4. First Equipment Pickup

**Location:** In item pickup code
**Action:** When player picks up equipment (weapon or armor)

```javascript
// In game.js, in pickupItem() or similar
if (!state.hasPickedUpEquipment && item && (item.kind === 'weapon' || item.kind === 'armor')) {
  state.hasPickedUpEquipment = true;
}
```

**Where to add:** In item pickup handler, after verifying it's equipment

---

### 5. First Level Up

**Location:** In player leveling code
**Action:** When player gains a level

```javascript
// In game.js, where player leveling happens (around line 1900+)
if (!state.hasLeveledUp && newLevel > oldLevel) {
  state.hasLeveledUp = true;
}
```

**Where to add:** Near line ~1916-1920 where `showLevelUp()` is called

**Current Code:**
```javascript
const msg = `<b>Level up!</b> Level <b>${newLevel}</b>...`;
if (state.ui && state.ui.showLevelUp) {
  state.ui.showLevelUp(newLevel);
}
```

**Add after this:**
```javascript
// Track for tutorial
if (!state.hasLeveledUp) {
  state.hasLeveledUp = true;
}
```

---

### 6. First NPC Recruitment

**Location:** In recruitment code
**Action:** When player recruits an NPC companion

```javascript
// In game.js, in recruitment handler (search for "recruit")
if (!state.hasRecruitedNPC) {
  state.hasRecruitedNPC = true;
}
```

**Where to add:** In `recruitAlly()` or similar recruitment function

---

### 7. Member Added to Group

**Location:** In group assignment code
**Action:** When NPC is added to active group

```javascript
// In game.js, when group member is assigned
if (!state.hasAddedMemberToGroup && state.group && state.group.length > 0) {
  state.hasAddedMemberToGroup = true;
}
```

**Where to add:** In group assignment logic in UI or game.js

---

### 8. First Buff Applied

**Location:** In buff application code
**Action:** When any buff is applied to player

```javascript
// In game.js, in applyBuffTo() function (around line 1700-1800)
if (!state.hasReceivedBuff) {
  state.hasReceivedBuff = true;
}
```

**Where to add:** At the end of buff application, before return statement

**Current Code Example:**
```javascript
function applyBuffTo(unit, buffId, force=false) {
  // ... buff logic ...
  
  // Add this at the end:
  if (unit === state.player && !state.hasReceivedBuff) {
    state.hasReceivedBuff = true;
  }
}
```

---

### 9. Outpost Area Reached

**Location:** In location checking code
**Action:** When player enters outpost area

```javascript
// In game.js, in update or location detection
if (!state.hasReachedOutpost && state.currentLocation && state.currentLocation.type === 'outpost') {
  state.hasReachedOutpost = true;
}
```

**Alternative:** Check for proximity to outposts

```javascript
if (!state.hasReachedOutpost && state.sites) {
  const nearOutpost = state.sites.some(site => 
    site && site.type === 'outpost' && 
    distance(state.player, site) < INTERACTION_RANGE
  );
  if (nearOutpost) state.hasReachedOutpost = true;
}
```

---

### 10. Dungeon Reached

**Location:** In location checking code
**Action:** When player enters dungeon area

```javascript
// In game.js, in update or location detection
if (!state.hasReachedDungeon && state.currentLocation && state.currentLocation.type === 'dungeon') {
  state.hasReachedDungeon = true;
}
```

**Alternative:** Check for proximity to dungeons

```javascript
if (!state.hasReachedDungeon && state.dungeons) {
  const nearDungeon = state.dungeons.some(dungeon => 
    dungeon && distance(state.player, dungeon) < INTERACTION_RANGE
  );
  if (nearDungeon) state.hasReachedDungeon = true;
}
```

---

### 11. Guard System Unlock

**Location:** In unlock/progression code
**Action:** When guard slot unlocks (usually at specific level)

```javascript
// In game.js, where guard slots unlock (search for "guard")
if (!state.guardSlotUnlocked) {
  state.guardSlotUnlocked = true;
}
```

**Where to add:** In guard unlock logic, likely in progression or leveling

---

## Optional: Call Tutorial Check After Events

After setting any of these flags, optionally call tutorial trigger check:

```javascript
// After setting any flag above:
if (state.tutorial) {
  state.tutorial.checkTriggers();
}
```

This forces an immediate check rather than waiting for the next 100ms check cycle. Only needed if you want instant responses.

---

## Summary of Flags

| Flag | Event | Trigger |
|------|-------|---------|
| `hasEncounteredEnemy` | Combat starts | combatBasics |
| `hasUsedAbility` | Ability cast | abilityIntro |
| `hasSeenLoot` | Items drop | lootSystem |
| `hasPickedUpEquipment` | Equipment picked up | equipmentSystem |
| `hasLeveledUp` | Player levels up | progressionSystem |
| `hasRecruitedNPC` | NPC recruited | groupSystem |
| `hasAddedMemberToGroup` | Member added to group | abilityAssignment |
| `hasReceivedBuff` | Buff applied | buffsDebuffs |
| `hasReachedOutpost` | In outpost area | outpostSystem |
| `hasReachedDungeon` | In dungeon area | dungeonIntro |
| `guardSlotUnlocked` | Guard unlocks | guardSystem |

## Testing After Adding Events

1. **Check flag is set:**
   ```javascript
   console.log(state.hasEncounteredEnemy); // Should be true after combat
   ```

2. **Check trigger fires:**
   ```javascript
   state.tutorialTriggers.debug = true; // Enable debug logging
   // Now perform action - check console for "Trigger fired" message
   ```

3. **Force tutorial:**
   ```javascript
   state.tutorial.queueTutorial('combatBasics', true);
   ```

4. **Verify persistence:**
   ```javascript
   // Reload page - completed tutorials should not reappear
   ```

## Advanced: Custom Triggers

You can also add custom triggers in tutorialTriggers.js:

```javascript
registerTrigger('my_event', () => {
  // Return true when condition is met
  return someCondition;
}, 'myTutorial');
```

Then add to TRIGGER_MAPPING in tutorialContent.js:

```javascript
my_event: 'myTutorial',
```

