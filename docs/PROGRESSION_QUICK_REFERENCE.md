# Progression System - Quick Reference

## Core Functions

### Player XP & Leveling
```javascript
import { xpForNext } from "./progression.js";

// Get XP needed for next level
const xpNeeded = xpForNext(currentLevel);

// Progression data
state.progression.level    // Current level (1-50)
state.progression.xp       // Current XP toward next level
state.progression.statPoints // Available stat points to allocate
state.progression.spends   // { vit: X, int: Y, str: Z, def: A, agi: B }
```

### Item Generation
```javascript
import { calculateItemLevel, scaleStatForItemLevel } from "./leveling.js";

// Generate loot-appropriate item level
const itemLevel = calculateItemLevel(playerLevel, variance = 2);

// Scale stats for item
const scaledStat = scaleStatForItemLevel(baseStat, itemLevel, rarity);
```

### Enemy Scaling
```javascript
import { getZoneForPosition, scaleEnemyForLevel } from "./leveling.js";

// Determine zone from position
const zone = getZoneForPosition(x, y, mapWidth, mapHeight);

// Scale enemy stats
const scaledStats = scaleEnemyForLevel(baseStats, level, classModifiers);
```

### Ally Scaling
```javascript
import { scaleAllyToPlayerLevel } from "./leveling.js";

// Scale ally to match player power
const allyStats = scaleAllyToPlayerLevel(baseStats, playerLevel, classModifiers);
```

---

## Item Level Ranges

### By Player Level
- Level 1: Items 1-3
- Level 10: Items 8-12
- Level 25: Items 23-27
- Level 50: Items 48-50

### Rarity Impact
| Rarity | Stat Multiplier |
|--------|-----------------|
| Common | 1.0x |
| Uncommon | 1.3x |
| Rare | 1.7x |
| Epic | 2.2x |
| Legendary | 3.0x |

---

## Zone Configuration

### Definition
```javascript
ZONES = {
  starter: { min: 1, max: 10 },
  lowland: { min: 8, max: 20 },
  midland: { min: 18, max: 32 },
  highland: { min: 30, max: 42 },
  endgame: { min: 40, max: 50 }
}
```

### Enemy Scaling in Zones
```
Enemy_Level = Avg(Zone) + (Player - Avg(Zone)) × 0.3
```

Example: Zone avg 25, Player 35
```
Enemy = 25 + (35-25) × 0.3 = 28
```

---

## Stat Growth Per Level

### Player Base Stats (+8% per level)
```
newStat = oldStat × (1 + (level - 1) × 0.08)
```

### Enemy Stats (+15% per level)
```
newStat = oldStat × (1 + (level - 1) × 0.15)
```

### Ally Stats (+12% × 0.85 per level = +10.2%)
```
newStat = oldStat × (1 + (level - 1) × 0.12 × 0.85)
```

### Item Stats (+12% per level)
```
newStat = baseStat × (1 + (level - 1) × 0.12) × rarityMult
```

---

## Level-Up Rewards

### Stat Points
- Always +2 per level
- Total available at 50: ~98 points

### Gold Bonuses
- Every 5 levels: Level × 25 gold
- Total bonus gold at 50: ~500 gold

### Stat Point Values
```javascript
{
  vit: { hp: 14, hpRegen: 0.10 },
  int: { mana: 12, manaRegen: 0.18, cdr: 0.006 },
  str: { atk: 1.1, critMult: 0.02 },
  def: { def: 1.1 },
  agi: { speed: 6, stam: 8, stamRegen: 1.2 }
}
```

---

## XP Formula

```javascript
xpForNextLevel(level) = floor(100 × level^1.8)
```

| Level | XP Required |
|-------|------------|
| 1→2 | 100 |
| 10→11 | 1,000 |
| 25→26 | 10,000 |
| 50 | ∞ |

---

## Common Tasks

### Check if player meets item requirement
```javascript
const meetsRequirement = playerLevel >= itemLevel;
```

### Generate level-scaled loot
```javascript
const itemLevel = Math.max(1, playerLevel + randi(-2, 2));
const item = makeWeapon(kind, rarity, itemLevel);
```

### Get current player stats
```javascript
import { currentStats } from "./game.js";
const stats = currentStats(state);
// stats.maxHp, stats.atk, stats.def, etc.
```

### Apply item buffs
```javascript
if(it.buffs){
  for(const [key, val] of Object.entries(it.buffs)){
    stats[key] = (stats[key] ?? 0) + val;
  }
}
```

### Calculate enemy XP reward
```javascript
const xpReward = 10 × Math.pow(enemyLevel, 1.5);
```

---

## Performance Tips

1. **Cache XP values** - Calculate once at level-up
2. **Batch item generation** - Generate multiple items together
3. **Use zone cache** - Cache zone lookup results
4. **Defer scaling** - Only recalc stats when needed (level-up, equip change)

---

## Debugging

### Check enemy level assignment
```javascript
console.log('Enemy level:', e.level, 'Zone avg:', zoneAvg, 'Player level:', playerLevel);
```

### Verify item scaling
```javascript
console.log('Base stat:', baseStat, 'Item level:', itemLevel, 'Scaled:', scaleStatForItemLevel(baseStat, itemLevel, rarity));
```

### Monitor XP progression
```javascript
console.log('XP:', state.progression.xp, '/', xpForNext(state.progression.level));
```

### Check stat calculations
```javascript
console.log('Stats:', currentStats(state));
```

---

## Configuration

Edit [leveling.js](leveling.js) to customize:

```javascript
// Max level
export const LEVEL_CONFIG = { MAX_LEVEL: 50 }

// Item variance
ITEM_LEVEL_VARIANCE: 2

// Zone ranges
ZONES: { ... }

// Growth rates
const growthRate = 1.15; // 15% per level
```

---

## Related Files

- [leveling.js](src/game/leveling.js) - All scaling logic
- [progression.js](src/game/progression.js) - XP formulas
- [game.js](src/game/game.js) - Enemy/item spawn logic
- [ui.js](src/game/ui.js) - UI display logic
- [LEVELING_GUIDE.md](LEVELING_GUIDE.md) - Player guide
- [PROGRESSION_IMPLEMENTATION.md](PROGRESSION_IMPLEMENTATION.md) - Technical details

---

**Last Updated:** December 31, 2025
