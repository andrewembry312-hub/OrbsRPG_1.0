# Emperor Mode Phase 3-4 Quick Reference

## What Was Added (Session 4)

### Phase 2: Boss Spawn Timing ⏰
```javascript
// BEFORE: Boss spawned immediately
checkEmperorStatus(state) {
  if (!state.zoneConfig.bossActive) {
    spawnZoneBoss(state);  // ❌ REMOVED
  }
}

// AFTER: Boss deferred to checkAllBasesDestroyed()
checkAllBasesDestroyed(state) {
  // 1. Check if all 3 crowns captured
  if (carriedCrowns.length < 3) return false;
  
  // 2. Check if all 3 bases destroyed
  if (!allBasesDestroyed) return false;
  
  // 3. Spawn boss
  spawnZoneBoss(state);
  return true;
}
```

### Phase 3: Base Destruction Prerequisite 🏰
```javascript
// Before bases can be destroyed, BOTH must be true:
1. Player must have carriedCrowns.length === 3
2. Player must have destroyed all other bases

// Implementation: checkAllBasesDestroyed() guards both conditions
function checkAllBasesDestroyed(state) {
  const carriedCrowns = state.emperor.carriedCrowns || [];
  
  // ❌ GATE: Haven't captured all crowns yet
  if (carriedCrowns.length < 3) {
    return false;  // Bases cannot be destroyed
  }
  
  // ✅ THEN: Check if bases actually destroyed
  const allDestroyed = enemyBases.every(base => !base || base.hp <= 0);
  
  if (allDestroyed) {
    spawnZoneBoss(state);  // All conditions met - spawn boss
    return true;
  }
}
```

### Phase 4: Victory Screen Clickable Previews 🎨
```javascript
// BEFORE: Victory screen showed basic card/item list
showVictoryRewardUI(state, onComplete) {
  // Show cards and items in simple list
  // No click interaction
}

// AFTER: Cards and items are clickable with large previews
showVictoryRewardUI(state, onComplete) {
  // Cards now have:
  // - cardEl.onclick = () => showLargeCardPreview(card, state)
  // - Hover glow effect
  
  // Items now have:
  // - itemEl.onclick = () => showLargeItemPreview(item, state)
  // - Hover glow effect
}

// New functions added:
showLargeCardPreview(card, state) {
  // Modal with:
  // - Large fighter image (⚔️ or ✨)
  // - Card name, class, rating
  // - Stats: HP, DMG, DEF, Level
  // - Gold (#ffd700) border and glow
}

showLargeItemPreview(item, state) {
  // Modal with:
  // - Large item image (⚔️ 🛡️ 👑 etc)
  // - Item name, type, rarity
  // - Stats: DMG, DEF, Value, Rarity
  // - Green (#00ff00) border and glow
}
```

## Files Modified

| File | Location | Change |
|------|----------|--------|
| game.js | Line 12605-12610 | Removed boss spawn from checkEmperorStatus |
| game.js | Line 11209 | Added checkAllBasesDestroyed() call to game loop |
| game.js | Line 12770-12805 | Added checkAllBasesDestroyed() function |
| game.js | Line 12260-12360 | Updated victory screen cards/items to be clickable |
| game.js | Line 12494-12690 | Added showLargeCardPreview() and showLargeItemPreview() |
| index.html | Line 8, 17 | Updated cache buster: 20260125c → 20260125d |

## Game Flow Sequence

```
EMPEROR ACTIVATED
↓
Crown Guards Spawn (boss-sized, named, fighter cards)
↓
Player Captures Crowns (auto-pickup at 150px)
↓
Crowns Added to carriedCrowns Array
↓
Player Destroys Enemy Bases
  ↳ checkAllBasesDestroyed() checks prerequisites:
    - All 3 crowns in carriedCrowns? ✅
    - All 3 bases destroyed? ✅
↓
Zone Boss Spawns
↓
Player Defeats Boss
↓
Victory Screen Shows
  ✓ Click fighters → See large preview
  ✓ Click items → See large preview
↓
Player Accepts Rewards
↓
Zone Complete!
```

## Key Constants

### Crown Guard Stats
- Size (r): 40 (was 24)
- HP: 200 (was 120)
- Level: 7 (was 5)
- Speed: 3 (was 0)
- Damage: 25 (was 15)
- XP Reward: 50 (was 15)
- Respawn: 8s (was 5s)

### Team Colors
- Team A (Red): #e74c3c
- Team B (Blue): #3498db
- Team C (Green): #2ecc71

### Crown Guard Loadout
```javascript
const composition = [
  { class: 'warrior', name: 'Guard Leader', role: 'TANK' },
  { class: 'mage', name: 'Archmage', role: 'HEALER' },
  { class: 'warrior', name: 'Guard Knight', role: 'DPS' },
  { class: 'mage', name: 'Battle Mage', role: 'DPS' },
  { class: 'warrior', name: 'Guard Captain', role: 'DPS' }
];
```

## State Tracking

### Critical State Variables
```javascript
state.emperorTeam              // 'player', 'teamA', 'teamB', 'teamC', or null
state.emperor.carriedCrowns    // Array of team names ['teamA', 'teamB', 'teamC']
state.zoneConfig.bossActive    // true when boss is spawned
state.zoneConfig.zoneComplete  // true when boss defeated
```

### Prerequisites Check
```javascript
// All prerequisites for boss spawn:
1. isEmperorActive(state) === true
2. state.emperor.carriedCrowns.length === 3
3. Enemy bases all have hp <= 0
4. state.zoneConfig.bossActive === false
5. state.zoneConfig.zoneComplete === false
```

## Testing Checklist

- [ ] Crown guards appear at all 3 enemy bases
- [ ] Guards are boss-sized (visibly larger than normal enemies)
- [ ] Guard names visible: "Guard Leader", "Archmage", etc.
- [ ] Guards have team colors (Red/Blue/Green)
- [ ] Crowns spawn near each base
- [ ] Crowns auto-pickup within 150px
- [ ] Console shows crowns added to carriedCrowns
- [ ] Boss does NOT spawn when emperor becomes active
- [ ] Boss ONLY spawns after all bases destroyed
- [ ] Cannot destroy bases until all 3 crowns captured
- [ ] Victory screen shows after boss defeat
- [ ] Can click fighter cards for large preview
- [ ] Can click items for large preview
- [ ] Previews show correct stats and images
- [ ] Close button on previews works
- [ ] Click outside preview to close works

## Debug Commands (Browser Console)

```javascript
// Check emperor status
console.log(state.emperorTeam);

// Check carried crowns
console.log(state.emperor.carriedCrowns);

// Check boss status
console.log(state.zoneConfig.bossActive);

// Check base HP
state.sites.filter(s => ['teamA_base', 'teamB_base', 'teamC_base'].includes(s.id))
  .forEach(b => console.log(`${b.id}: HP=${b.hp}`));

// Force spawn boss (if testing)
spawnZoneBoss(state);

// Force add crown (if testing)
state.emperor.carriedCrowns.push('teamA');
```

## Cache Clearing

If changes not visible:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache for this site
- Version bumped to 20260125d

---

**Status**: All 4 phases complete and integrated! ✅

