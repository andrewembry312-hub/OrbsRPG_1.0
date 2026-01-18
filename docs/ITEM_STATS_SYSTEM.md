# Item Stats System - How Rarities Work

## Rarity Tiers & Multipliers

The game uses a tier-based system where higher rarities get stat multipliers:

| Rarity   | Key      | Tier | Stat Multiplier | Extra Stats | Resistances | Elemental Effects |
|----------|----------|------|-----------------|-------------|-------------|-------------------|
| Common   | `common` | 0    | **1.0x**        | 0           | 0           | 0                 |
| Uncommon | `uncommon` | 1  | **1.25x**       | 1-3         | 0           | 0                 |
| Rare     | `rare`   | 2    | **1.5x**        | 1-3         | 1           | 1                 |
| Epic     | `epic`   | 3    | **1.75x**       | 1-4         | 1           | 1                 |
| Legendary| `legend` | 4    | **2.0x**        | 1-5         | 1-2         | 1-2               |

### Important: Rarity Key is 'legend' NOT 'legendary'
The internal rarity key for legendary items is **`'legend'`** (defined in `rarity.js`). Using `'legendary'` will cause items to get Common-tier stats!

## How Item Stats Are Calculated

### 1. Base Stats
Each item type has base stats defined in templates:

**Weapons** (from `makeWeapon` function):
- Destruction Staff: `atk: 3+t*1.6, maxMana: 14+t*6, manaRegen: 0.8+t*0.45`
- Healing Staff: `maxMana: 16+t*7, manaRegen: 1.1+t*0.55, cdr: 0.04+t*0.008`
- Axe: `atk: 4+t*3, critChance: 0.02+t*0.01`
- Sword: `atk: 3+t*2.4, speed: 4+t*2`
- Dagger: `atk: 2.4+t*1.6, speed: 6+t*2.2, critChance: 0.03+t*0.012`
- Greatsword: `atk: 5+t*3.5, def: 2+t*1.4, speed: -4`

**Armor** (varies by slot and random pool selection)
- Each slot has 3 variants (e.g., helm: Mind Helm, Guard Helm, Hunter Hood)
- Stats use `scaled(baseValue, tier, multiplier)` function

### 2. Extra Random Stats
Higher rarities get additional random stats:

```javascript
// From rarityAffixRules()
uncommon: 1-3 extra stats at 0.55x scale
rare:     1-3 extra stats at 0.75x scale
epic:     1-4 extra stats at 0.95x scale
legend:   1-5 extra stats at 1.25x scale
```

### 3. Item Level Scaling
All stats are then scaled by item level:

```javascript
function scaleStatForItemLevel(baseStat, itemLevel, rarity) {
  const levelMult = 1 + (itemLevel - 1) * 0.12;  // +12% per level
  const rarityMult = 1 + rarityTier(rarity) * 0.25; // +25% per tier
  return baseStat * levelMult * rarityMult;
}
```

### Example Calculation

**Epic Sword (Level 1):**
- Base ATK: `3 + 3*2.4 = 10.2`
- Rarity Tier: 3
- Level Multiplier: `1 + (1-1)*0.12 = 1.0`
- Rarity Multiplier: `1 + 3*0.25 = 1.75`
- **Final ATK: 10.2 × 1.0 × 1.75 = 17.85** → rounded to **18**

**Legendary Sword (Level 1):**
- Base ATK: `3 + 4*2.4 = 12.6`
- Rarity Tier: 4
- Level Multiplier: `1 + (1-1)*0.12 = 1.0`
- Rarity Multiplier: `1 + 4*0.25 = 2.0`
- **Final ATK: 12.6 × 1.0 × 2.0 = 25.2** → rounded to **25**

**Legendary Sword (Level 10):**
- Base ATK: `12.6` (same)
- Level Multiplier: `1 + (10-1)*0.12 = 2.08`
- Rarity Multiplier: `2.0`
- **Final ATK: 12.6 × 2.08 × 2.0 = 52.42** → rounded to **52**

## Why Legendary Was Weaker

### The Bug
The console command `giveAllItems()` used:
```javascript
{key:'legendary', name:'Legendary', color:'var(--legendary)'}
```

But the actual rarity system uses:
```javascript
{key:'legend', name:'Legendary', color:cssVar('--legend')}
```

### What Happened
1. `rarityTier()` looks up the rarity key in the RARITIES array
2. When it couldn't find 'legendary', it returned `-1`
3. `Math.max(0, -1)` converted this to `0`
4. **Legendary items got tier 0 (Common) stats!**
5. Rarity multiplier: `1 + 0*0.25 = 1.0x` instead of `2.0x`

### The Fix
Changed console command to use correct key:
```javascript
{key:'legend', name:'Legendary', color:'var(--legend)'}
```

Now legendary items correctly get:
- **2.0x stat multiplier** (highest in game)
- **1-5 extra random stats** (most of any rarity)
- **1-2 elemental effects** (fire/poison/ice/lightning/bleed)
- **1-2 resistance bonuses** (elemental damage reduction)

## Stat Progression Example

**Destruction Staff Attack Power** (Level 1, no random stats):

| Rarity    | Base Formula | Calculation        | Final ATK |
|-----------|--------------|-------------------|-----------|
| Common    | 3 + 0×1.6    | 3.0 × 1.0 × 1.0   | **3**     |
| Uncommon  | 3 + 1×1.6    | 4.6 × 1.0 × 1.25  | **6**     |
| Rare      | 3 + 2×1.6    | 6.2 × 1.0 × 1.5   | **9**     |
| Epic      | 3 + 3×1.6    | 7.8 × 1.0 × 1.75  | **14**    |
| Legendary | 3 + 4×1.6    | 9.4 × 1.0 × 2.0   | **19**    |

Plus legendary gets 1-5 extra random stats that could add even more ATK!

## Testing Commands

```javascript
// Get one of each weapon at each rarity (now with correct stats!)
giveAllItems()

// Create specific legendary item
const sword = state._itemGen.makeWeapon('Sword', {key:'legend', name:'Legendary', color:'var(--legend)'}, 1)
state.inventory.push(sword)
state.ui.updateInventory()

// Compare stats
console.log('Epic:', state.inventory.find(i => i.rarity.key === 'epic' && i.weaponType === 'Sword'))
console.log('Legend:', state.inventory.find(i => i.rarity.key === 'legend' && i.weaponType === 'Sword'))
```

## Additional Bonuses

### Elemental Effects (Rare+)
- Fire → Burn DoT
- Poison → Poison DoT
- Ice → Freeze (slow)
- Lightning → Shock
- Bleed → Bleed DoT

Proc chance scales with rarity:
- Rare: ~0.75x scale
- Epic: ~0.95x scale
- Legendary: ~1.25x scale

### Resistances (Rare+)
- Fire/Ice/Lightning/Poison/Bleed resistance
- Base: 10% resist before scaling
- Legendary can roll 1-2 resist types

---

**Last Updated:** January 5, 2026
**Fixed:** Legendary rarity key bug causing incorrect stat calculations
