# Slot System Status & Implementation Notes

## ✅ COMPLETED UI IMPROVEMENTS

### 1. Level Badge Display
- **Slot Tab Fighter Cards**: Gold circle badge in top-left corner shows fighter level
- **Loadout Picker Cards**: Gold circle badge in top-left corner shows level (currently hardcoded to 1)
- Badge styling: Dark background (#1a1a1a), gold border (#d4af37), bold gold text

### 2. Necklace Image Fix
- **Fixed**: Slot name is `neck` but file is `necklace`
- Now properly mapping: `neck` → `necklace` when generating image paths
- Files use format: `Common necklace.png`, `Rare necklace.png`, etc.

### 3. Removed Redundant Buttons
- Removed "📋 Details" button from both slot tab and loadout picker
- **Only way to view preview**: Click fighter image directly
- Cleaner UI, less cluttered interface

---

## ⚠️ CRITICAL ISSUES IDENTIFIED

### 1. **Slots Don't Actually Spawn Fighter Loadouts**
**Current State**: 
- Slots store `loadoutId` (e.g., "vanguard", "berserker")
- When guards spawn, they use hardcoded "warrior" or "mage" variants
- **The loadout data is completely ignored during spawn**

**Location**: `src/game/world.js` lines 480-550
```javascript
// Current code spawns generic guards
const v = variants[pi % variants.length]; // 'warrior' or 'mage'
friendlyGuard.variant = v; // Generic class, not loadout
```

**What Needs to Happen**:
```javascript
// Should look up slot's loadoutId
const slot = slotData[guardIndex];
if (slot && slot.loadoutId) {
  const loadout = LOADOUTS[slot.loadoutId];
  // Apply loadout's weapon, armor, abilities, stats to friendlyGuard
  applyLoadoutToUnit(friendlyGuard, loadout, slot.level);
}
```

**Required Changes**:
1. Import LOADOUTS registry into world.js
2. Create `applyLoadoutToUnit(unit, loadout, level)` function
3. Apply weapon from `loadout.weapon`
4. Apply armor from `loadout.armor`
5. Apply abilities from `loadout.abilities`
6. Scale stats by `slot.level` and `loadout.rarity` multipliers
7. Set unit name to loadout name

---

### 2. **Tooltip Data is Blank/Zero**
**Current State**:
- Fighter card tooltips show "Level 0"
- Ability descriptions are blank
- Stats show incorrect values

**Root Cause**: 
- Loadout picker is showing level as hardcoded "1"
- Slot level is stored in `slot.level` but may not be passed to UI correctly
- Abilities may not be looking up ABILITIES registry correctly

**Fix Needed**:
1. Pass actual `slot.level` to loadout picker
2. Ensure ABILITIES registry is available when rendering tooltips
3. Add null checks for ability data

---

### 3. **No Progression/Drop System for Fighter Cards**

**Current State**:
- Fighter cards are static in LOADOUTS registry
- No way to level them up or get higher rarity versions
- Slots have levels but they don't affect fighter power

**What Needs to Exist**:

#### Option A: Loot Drop System
```javascript
// When enemy dies
if (Math.random() < 0.05) { // 5% drop rate
  const rarityRoll = rollRarity(); // common/uncommon/rare/epic/legendary
  const loadoutRoll = randomLoadout(); // Random from registry
  state.player.fighterCards.push({
    id: generateId(),
    loadoutId: loadoutRoll,
    rarity: rarityRoll, // Overrides base rarity
    level: 1,
    acquired: Date.now()
  });
}
```

#### Option B: Upgrade System
```javascript
// Spend resources to upgrade equipped fighter
function upgradeFighterCard(slotId) {
  const slot = findSlot(slotId);
  const cost = calculateUpgradeCost(slot.level, slot.rarity);
  
  if (canAfford(cost)) {
    slot.level++;
    // Stats scale: baseStats * (1 + level * 0.1) * rarityMult
  }
}
```

#### Option C: Gacha/Pack System
```javascript
// Buy fighter packs with gold/premium currency
function openFighterPack(packType) {
  const pack = PACKS[packType]; // Common/Rare/Epic pack
  const results = [];
  
  for (let i = 0; i < pack.count; i++) {
    const rarity = rollFromPool(pack.rarityWeights);
    const loadout = randomLoadout();
    results.push({ loadoutId: loadout, rarity, level: 1 });
  }
  
  return results; // Show pack opening animation
}
```

---

## 📋 RECOMMENDED IMPLEMENTATION PLAN

### Phase 1: Make Slots Spawn Actual Fighters (HIGH PRIORITY)
1. Create `src/game/loadout-spawner.js`
2. Export function `applyLoadoutToUnit(unit, loadout, level, rarity)`
3. Modify `world.js` spawnGuardsForSite to use loadout data
4. Test that slotted fighters spawn with correct gear/abilities

### Phase 2: Fix UI Tooltips
1. Pass slot data to tooltips correctly
2. Ensure ABILITIES registry is available
3. Show accurate level, stats, ability info

### Phase 3: Implement Progression System
1. **Simplest**: Slot levels increase fighter power (linear scaling)
2. **Medium**: Fighter card drops from combat (collection system)
3. **Complex**: Full gacha system with packs, duplicates, fusion

---

## 🎮 CURRENT GAME LOOP

**What Works**:
1. Unlock slots with Skill Points (1 SP per unlock)
2. Upgrade slots with Skill Points (cost scales with level)
3. Assign loadouts to slots from picker
4. UI shows correct fighter images, names, equipment previews
5. Fighter preview modal works (click image to open)

**What Doesn't Work**:
1. **Spawned guards are generic, not the assigned fighter**
2. Tooltips show placeholder/incorrect data
3. No way to get better fighters (stuck with base loadouts)
4. Slot levels exist but don't affect spawned units
5. Rarity exists but doesn't multiply stats during spawn

---

## 💡 QUICK WINS TO PRIORITIZE

1. **Fix Spawning** (30 min) - Make slots actually use loadout data
2. **Fix Tooltips** (10 min) - Pass correct slot.level to UI
3. **Add Stat Scaling** (15 min) - Multiply stats by level + rarity
4. **Test Full Loop** (15 min) - Verify fighter spawns, fights, dies, respawns correctly

**Total Time**: ~1.5 hours to get core system fully functional

---

## 📝 CODE SNIPPETS FOR QUICK IMPLEMENTATION

### Loadout Spawner (New File)
```javascript
// src/game/loadout-spawner.js
import { LOADOUTS } from './loadout-registry.js';
import { ABILITIES } from './skills.js';

export function applyLoadoutToUnit(unit, loadoutId, level = 1, rarity = null) {
  const loadout = LOADOUTS[loadoutId];
  if (!loadout) {
    console.error('[LOADOUT SPAWNER] Invalid loadoutId:', loadoutId);
    return;
  }
  
  // Use loadout's base rarity or override
  const finalRarity = rarity || loadout.rarity || 'common';
  const rarityMults = { common: 1, uncommon: 1.2, rare: 1.5, epic: 2, legendary: 3 };
  const mult = rarityMults[finalRarity] || 1;
  
  // Set name
  unit.name = loadout.name || unit.name;
  unit.loadoutId = loadoutId;
  unit.rarity = finalRarity;
  
  // Apply weapon
  if (loadout.weapon) {
    unit.weaponType = loadout.weapon.weaponType;
    const atkBonus = Math.floor((loadout.weapon.buffs?.atk || 0) * mult);
    unit.atk = (unit.atk || 0) + atkBonus;
  }
  
  // Apply armor (sum all buffs)
  if (loadout.armor) {
    for (const slot of Object.keys(loadout.armor)) {
      const piece = loadout.armor[slot];
      if (piece && piece.buffs) {
        for (const stat of Object.keys(piece.buffs)) {
          const value = Math.floor(piece.buffs[stat] * mult);
          if (stat === 'maxHp') unit.maxHp += value;
          else if (stat === 'maxMana') unit.maxMana += value;
          else if (stat === 'atk') unit.atk += value;
          else if (stat === 'def') unit.def += value;
          // ... other stats
        }
      }
    }
  }
  
  // Scale by level (10% per level)
  const levelMult = 1 + (level - 1) * 0.1;
  unit.maxHp = Math.floor(unit.maxHp * levelMult);
  unit.maxMana = Math.floor((unit.maxMana || 0) * levelMult);
  unit.atk = Math.floor((unit.atk || 0) * levelMult);
  unit.def = Math.floor((unit.def || 0) * levelMult);
  
  // Set HP to max
  unit.hp = unit.maxHp;
  unit.mana = unit.maxMana || 0;
  
  // Apply abilities
  if (loadout.abilities && loadout.abilities.length > 0) {
    unit.abilityIds = [...loadout.abilities];
    // npcInitAbilities will handle converting IDs to skill objects
  }
}
```

### Modify world.js Spawning
```javascript
// In spawnGuardsForSite, replace applyClassToUnit with:
import { applyLoadoutToUnit } from './loadout-spawner.js';

// Find the slot data for this guard
const slotIndex = spawned; // 0-4 for each guard position
const guardSlot = slotData[slotIndex];

if (guardSlot && guardSlot.loadoutId) {
  // Use loadout system
  applyLoadoutToUnit(friendlyGuard, guardSlot.loadoutId, guardSlot.level);
} else {
  // Fallback to old system
  if(applyClassToUnit) applyClassToUnit(friendlyGuard, v);
}
```

---

## 🔧 TESTING CHECKLIST

- [ ] Unlock a guard slot
- [ ] Assign a loadout (e.g., "vanguard")
- [ ] Go to player base
- [ ] Verify guard spawns with correct name
- [ ] Verify guard has correct weapon (e.g., Greatsword)
- [ ] Verify guard has correct abilities (check ability icons above HP bar)
- [ ] Check guard stats match loadout + slot level
- [ ] Upgrade slot to level 2
- [ ] Verify next spawn has higher stats
- [ ] Test all 26 loadouts
- [ ] Test all rarities (common → legendary)

---

## 📈 FUTURE ENHANCEMENTS

1. **Fighter Card Collection UI** - Dedicated tab showing all acquired cards
2. **Card Fusion System** - Combine duplicates to level up
3. **Card Trading** - Trade with NPCs or other players
4. **Prestige System** - Reset slots for permanent bonuses
5. **Loadout Customization** - Mix abilities from multiple cards
6. **Card Sets** - Bonuses for equipping multiple cards from same "set"

---

*Document created: Based on code analysis and user requirements*
*Last updated: After UI improvements (level badge, necklace fix, button removal)*
