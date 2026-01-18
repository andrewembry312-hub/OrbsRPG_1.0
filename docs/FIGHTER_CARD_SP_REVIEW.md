# Fighter Card System & Skill Points (SP) Review

## 1. SKILL POINTS (SP) SYSTEM - INTENT & USAGE

### ✅ What Are SP and How They Work?

**Definition**: Skill Points (SP) are the primary currency for unlocking and upgrading combat slots.

**Earning Mechanism**:
- Player gains **1 SP per level** gained in progression
- Tracked in: `state.progression.skillPoints` (spendable)
- Also tracked: `state.progression.totalSkillPoints` (lifetime total, never decreases)
- Earned at each level-up (handled in leveling.js line 1879-1880)

**Level-Up Event**:
```javascript
// src/game/game.js line 1879-1880
if(newLevel > oldLevel){
  state.progression.skillPoints += 1;      // Add 1 SP to spendable pool
  state.progression.totalSkillPoints += 1; // Add to lifetime total
}
```

---

### 💎 SP Spending Costs

| Action | Cost | Scaling | Notes |
|--------|------|---------|-------|
| **Unlock Slot** | 1 SP | Flat | One-time cost to unlock a combat slot |
| **Upgrade Slot Lvl 0→1** | 1 SP | Linear | Formula: `1 + Math.ceil(level * 0.1)` |
| **Upgrade Slot Lvl 5→6** | 2 SP | Increases | Each level costs more |
| **Upgrade Slot Lvl 10→11** | 2 SP | Caps at 3 | Eventually hits ceiling |

**Cost Formula**:
```javascript
// src/game/game.js lines 522-528
const baseCost = 1;
const scalingCost = Math.ceil(slot.level * 0.1);
const totalCost = baseCost + scalingCost;
// Example: level 5 slot = 1 + ceil(5*0.1) = 2 SP to upgrade
```

---

### 🎯 Slot Progression System

**15 Total Slots** (5 Guard + 10 Ally):
- **Guard Slots** (5): Tank, DPS×2, Support, Flex
- **Ally Slots** (10): Various roles & specializations

**Each Slot Has**:
- `unlocked`: Boolean (true = can use, false = locked)
- `level`: 0-∞ (power progression)
- `loadoutId`: Assigned fighter/loadout

**Progression Path**:
1. **Unlock** (1 SP) → slot becomes available
2. **Assign Loadout** (Free) → choose which fighter
3. **Upgrade Level** (1-3 SP) → increase fighter power

---

### 📊 Zone Tier System (Fighter Unlock Levels)

Fighters in loadout-registry.js have `unlockLevel` field:
- **Level 1**: Common fighters available (8+ loadouts)
- **Level 3-5**: Uncommon fighters unlock
- **Level 7+**: Rare/Epic/Legendary fighters unlock

**Example Loadouts**:
```javascript
guardian_stone: { unlockLevel: 1, name: 'Boulder the Unbreakable', rarity: 'common' }
warrior_magic_advanced: { unlockLevel: 1, name: 'Kaelen Stormbreaker', rarity: 'uncommon' }
```

**Intent**: Player progression gated by:
- ✅ Slot unlocks (SP cost)
- ✅ Fighter availability (level gates)
- ❌ Fighter power (only slot level matters currently)

---

### 🔄 Fighter Card Collection System - CURRENT STATE

**What's Missing**:
- ❌ No rarity progression (all fighters are static rarities)
- ❌ No fighter card drops/collection
- ❌ No way to get stronger versions of fighters
- ❌ No card leveling (fighters don't gain XP)

**Recommended Approach**:
- Phase 1 (NOW): All fighters available once unlocked level-wise
- Phase 2 (LATER): Add boss drops for rare/epic/legendary cards
- Phase 3 (FUTURE): Add card leveling or star upgrade system

---

## 2. BOSS DUNGEON IMAGE CONNECTIONS - VERIFICATION

### ✅ Boss Icon Files (All Present)
- ✓ Archmage.PNG
- ✓ Balrogath.PNG
- ✓ Bloodfang.PNG
- ✓ Gorothar.PNG
- ✓ Malakir.PNG
- ✓ Tarrasque.PNG
- ✓ Venom Queen.PNG
- ✓ Vorrak.PNG
- ✓ Zalthor.PNG

### 🔗 Boss Icon Mapping

**Location**: `src/game/render.js` lines 78-115

**Load Function**:
```javascript
function loadBossIcons(){
  Promise.all([
    loadImage('assets/boss icons/Archmage.PNG'),
    loadImage('assets/boss icons/Balrogath.PNG'),
    // ... etc
  ]).then(([archmage, balrogath, ...]) => {
    bossIcons.archmage = archmage;    // Load to bossIcons object
    bossIcons.balrogath = balrogath;
    // ... etc
    bossIcons.loaded = true;
  });
}
```

**Usage in Rendering** (lines 851-862):
```javascript
// In render() function - draws boss icons in orbs
if(e.boss && bossIcons.loaded && e.bossIcon){
  const bossImg = bossIcons[e.bossIcon];  // Lookup: e.bossIcon = 'archmage', 'balrogath', etc
  if(bossImg){
    ctx.drawImage(bossImg, x, y, size, size);  // Draw in circular orb
  }
}
```

### ✅ Connection Status

| Boss ID | Icon File | Icon Property | Status |
|---------|-----------|---------------|--------|
| archmage | Archmage.PNG | bossIcons.archmage | ✓ Working |
| balrogath | Balrogath.PNG | bossIcons.balrogath | ✓ Working |
| bloodfang | Bloodfang.PNG | bossIcons.bloodfang | ✓ Working |
| gorothar | Gorothar.PNG | bossIcons.gorothar | ✓ Working |
| malakir | Malakir.PNG | bossIcons.malakir | ✓ Working |
| tarrasque | Tarrasque.PNG | bossIcons.tarrasque | ✓ Working |
| venomQueen | Venom Queen.PNG | bossIcons.venomQueen | ✓ Working |
| vorrak | Vorrak.PNG | bossIcons.vorrak | ✓ Working |
| zalthor | Zalthor.PNG | bossIcons.zalthor | ✓ Working |

**Note**: Icon names use camelCase (e.g., `venomQueen`) but files use spaces (e.g., `Venom Queen.PNG`). Conversion handled in `getAssetPath()` which normalizes paths.

---

## 3. DUNGEON SYSTEM - ONE-TIME PLAY & MULTI-CLICK PREVENTION

### Current State

**Location**: `src/game/game.js` lines 9080-9515

**Current Issues**:
1. ❌ Dungeons can be entered multiple times after cleared (cleared flag exists but not enforced consistently)
2. ❌ Players can click multiple dungeons simultaneously (no interaction lock)
3. ❌ No cooldown/delay between entering dungeons

**Current Code** (Line 9511-9515):
```javascript
if(state.dungeons){
  for(const d of state.dungeons){ 
    const dd = Math.hypot(state.player.x-d.x, state.player.y-d.y); 
    if(dd <= Math.max(72, d.r+20) && !d.cleared){  // ← Checks !d.cleared but not fully enforced
      enterDungeon(state, d); 
      interacted = true; 
      break; 
    } 
  }
}
```

### Planned Improvements

**Fix 1: Enforce One-Time Playable Dungeons**
- Add state flag: `state._dungeonActiveLock` to prevent rapid re-entry
- Mark dungeon as cleared after boss defeat
- Only allow entry if `!d.cleared` AND nearby

**Fix 2: Prevent Multiple Simultaneous Dungeons**
- Add state flag: `state._dungeonInteracting` to track active interaction
- Lock out additional dungeon clicks while one is being entered
- Clear lock after dungeon fully initialized (100ms delay)

**Fix 3: Improve UI Feedback**
- Show "cleared" indicator on dungeon mini-map
- Display "Dungeon already cleared" toast if player tries re-entry
- Add cooldown timer if rapid clicks attempted

---

## 4. IMPLEMENTATION SUMMARY

### Files to Modify
1. **src/game/game.js** - Add interaction lock & improve dungeon entry validation
2. **src/game/render.js** - Show cleared dungeon visually on minimap

### Changes Needed

**In `handleHotkeys()` function** (Line 9511):
- Add `state._dungeonInteracting` lock before entering
- Prevent entry if already cleared
- Add delay before allowing next dungeon interaction

**In `enterDungeon()` function** (Line 9080):
- Mark dungeon as cleared when boss spawned
- Set temporary interaction lock
- Clear lock after initialization

---

## Summary

### ✅ SP Points System - WORKING AS INTENDED
- Players earn 1 SP per level (infinite progression)
- Costs: 1 SP unlock, 1-3 SP per upgrade level
- Intended to gate combat slot progression
- Recommended: Consider adding fighter card drops later (Phase 2)

### ✅ Boss Dungeon Images - ALL CONNECTED
- All 9 boss icons present and properly mapped
- Icon loading system working
- No missing file connections

### ⚠️ Dungeon System - NEEDS FIXES
- Currently allows repeat clearing
- No lock preventing simultaneous dungeon entry
- Implement one-time play enforcement
- Add multi-click prevention

---

*Review Date: January 18, 2026*
