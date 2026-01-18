# MMO-Style Leveling & Progression System

## Overview

The Orb RPG now features a comprehensive leveling and progression system inspired by industry-leading MMORPGs like **The Elder Scrolls Online (ESO)** and **World of Warcraft (WoW)**. This guide explains how the system works and how it affects gameplay.

---

## Core Progression System

### Player Leveling

**Max Level:** 50

**XP Curve:** Smoothly exponential curve (~1.8x scaling)
- Level 1→2: ~100 XP
- Level 10→11: ~1,000 XP  
- Level 25→26: ~10,000 XP
- Level 50: ~500,000+ XP (infinite)

**Level-Up Rewards:**
- **+2 Stat Points** (every level) - Allocate to Vitality, Intelligence, Strength, Defense, or Agility
- **+Gold Bonus** (every 5 levels) - Scaling gold rewards
- **Milestones:**
  - Level 10: New zones unlocked
  - Level 25: Elite content unlocked
  - Level 50: Maximum level reached

### Base Stat Growth

As you level up, your base stats automatically increase by 8% per level:

| Stat | Base (L1) | Level 10 | Level 25 | Level 50 |
|------|-----------|----------|----------|----------|
| Max HP | 120 | 229 | 347 | 526 |
| Max Mana | 70 | 134 | 203 | 308 |
| Max Stamina | 100 | 191 | 290 | 440 |
| ATK | 6 | 11 | 17 | 26 |
| DEF | 2 | 4 | 6 | 9 |

---

## Item Level System

### What is Item Level?

**Item Level** represents the power level of equipment. It determines:
- **Base stat values** on the item
- **Rarity scaling** effectiveness
- **Visual quality indicators**

### How Loot Scales

**Loot drops ±2 levels from your current level**, ensuring:
- Items are always relevant to your progression
- No useless low-level drops at high levels
- Variety and discovery mechanics stay fresh

**Example:**
- At Level 15 → Items drop at levels 13-17
- At Level 40 → Items drop at levels 38-42

### Item Level Display

Hover over any item to see:
```
📊 Item Level: 15
```

- **Blue color** (4a9eff): Item is appropriate for your level
- **Red color** (ff6b6b): Item is too high level (level requirement not met)

### Stat Scaling Formula

Stats scale with both **Item Level** and **Rarity**:

```
Scaled Stat = Base Stat × (1 + (ItemLevel - 1) × 0.12) × (1 + Rarity × 0.25)
```

**Rarity Multipliers:**
- Common: 1.0x
- Uncommon: 1.3x
- Rare: 1.7x
- Epic: 2.2x
- Legendary: 3.0x

**Examples (ATK stat):**
| Item Type | Level 1 | Level 10 | Level 25 | Level 50 |
|-----------|---------|----------|----------|----------|
| Common Sword | 3 | 3 | 3 | 3 |
| Legendary Sword | 9 | 11 | 13 | 17 |

---

## Zone-Based Enemy Scaling

### Zone Levels

Enemies spawn at different power levels based on **map zones**:

| Zone | Level Range | Difficulty |
|------|-------------|------------|
| **Starter** | 1-10 | Tutorial/Starting area |
| **Lowland** | 8-20 | Early game content |
| **Midland** | 18-32 | Mid-game dungeons |
| **Highland** | 30-42 | Late-game challenges |
| **Endgame** | 40-50 | Maximum difficulty |

### Dynamic Difficulty

Enemies scale toward your level:
- **30% of player's level advantage** affects enemy spawn level
- Prevents trivializing early areas at high level
- Ensures challenges remain meaningful

**Example:**
- Zone Average: Level 15
- Your Level: 25
- Enemy Spawn Level: 15 + (25-15) × 0.3 = **18**

### Enemy XP Rewards

XP from enemies scales with their level:

```
XP = 10 × Enemy_Level^1.5
```

| Enemy Level | XP Reward |
|-------------|-----------|
| 1 | 10 |
| 10 | 32 |
| 25 | 97 |
| 50 | 353 |

---

## Ally/Companion Scaling

### How Allies Grow

Your recruited allies scale with your level:
- **85% of player power level** (slightly weaker than player)
- All stats scale automatically - no manual leveling needed
- Always stay relevant in combat

**Ally Stat Growth:**

```
Ally Stat = Base Stat × (1 + (PlayerLevel - 1) × 0.12 × 0.85) × ClassModifier
```

### Class-Based Modifiers

Allies maintain class-specific stat scaling:

| Class | HP Mod | DMG Mod | Speed Mod |
|-------|--------|---------|-----------|
| Mage | 0.9x | 0.95x | 1.06x |
| Warrior | 1.15x | 1.10x | 1.0x |
| Knight | 1.45x | 1.0x | 0.86x |
| Tank | 1.85x | 0.85x | 0.72x |

---

## Stat Point Allocation

### Stat Point Cap

You gain 2 stat points per level:
- Total points available at level 50: ~98 points
- Allocate freely - no permanent penalties

### Stat Point Values

| Stat | Per Point |
|------|-----------|
| **Vitality** | +14 Max HP, +0.10 HP Regen |
| **Intelligence** | +12 Max Mana, +0.18 Mana Regen, +0.006 CDR |
| **Strength** | +1.1 ATK, +0.02 Crit Mult |
| **Defense** | +1.1 DEF |
| **Agility** | +6 Speed, +8 Max Stam, +1.2 Stam Regen |

---

## Power Progression

### Total Power Growth

From level 1 to 50, your total power increases roughly:

```
Power ≈ Level^1.8
```

This creates:
- **Slow early game** (1-15): Mastering mechanics
- **Acceleration** (15-35): Meaningful progression
- **Plateau** (35-50): Fine-tuning and optimization

### Gear vs. Level

**Contribution to Power:**
- **40%** - Level and base stats
- **35%** - Equipment and items
- **25%** - Stat point allocation and passive skills

This means:
- Gear remains important at all levels
- High-level gear can't carry low-level players
- Balanced progression for casual and hardcore players

---

## Loot Progression

### Loot Quality Distribution

When items drop, rarity is determined by weight:

| Rarity | Weight | Frequency |
|--------|--------|-----------|
| Common | 60 | ~60% |
| Uncommon | 25 | ~25% |
| Rare | 10 | ~10% |
| Epic | 4 | ~4% |
| Legendary | 1 | ~1% |

### Affix System

**Higher rarity items get more stats:**

| Rarity | Stat Rolls | Effect Rolls |
|--------|-----------|--------------|
| Common | 0 | 0 |
| Uncommon | 1-3 | 0 |
| Rare | 1-3 | 1 |
| Epic | 1-4 | 1 |
| Legendary | 1-5 | 1-2 |

---

## Progression Milestones

### Content Gates

**Level 1-10:** Tutorial & starter zones
- Simple enemies, basic gear
- Focus: Learning mechanics

**Level 10-25:** Mid-game expansion
- New zones unlock
- Advanced enemy types
- Rarer gear drops

**Level 25-40:** Late-game challenges
- Elite content available
- Epic+ gear becomes common
- Player vs Player (planned)

**Level 40-50:** Endgame mastery
- Maximum difficulty zones
- Legendary gear focus
- Seasonal challenges (planned)

### Catch-Up Mechanics

**If you fall behind:**
1. **Loot scales to your level** - No level 50 gear for level 20 players
2. **XP scales to content** - Killing tougher enemies grants more XP
3. **Allies scale automatically** - No need to re-gear companions

---

## Comparison to Other Systems

### ESO-Style Elements (Inherited)
✓ Zones have level ranges, not level requirements
✓ Champions/prestige system at max level (planned)
✓ Stat points allocation
✓ Dynamic difficulty scaling

### WoW-Style Elements (Inherited)
✓ Item levels with stat scaling
✓ Rarity-based power distribution
✓ Companion/pet scaling
✓ Milestone rewards every 5-10 levels

### Unique Features
✓ **Zone-based leveling** - 5 distinct difficulty tiers
✓ **Smooth stat scaling** - No sudden power spikes
✓ **Catch-up loot** - Always relevant drops
✓ **Companion parity** - Allies stay useful at all levels

---

## Tips & Strategies

### Early Game (Levels 1-15)
- Don't hoard gear - vendor/discard frequently
- Keep 2-3 set variations for different zones
- Focus on learning mechanics over optimal gear

### Mid Game (Levels 15-35)
- Start seeking specific item types
- Use stat points to specialize
- Experiment with different classes

### Late Game (Levels 35-50)
- Chase epic/legendary drops
- Optimize stat distribution for build
- Farm challenging zones for better loot

### Gold Management
- Loot 3-12 gold per kill (average)
- Services cost 100-1000+ gold
- Every 5 levels you gain bonus gold

---

## Technical Details

### XP Calculation

```javascript
xpForNextLevel(level) = floor(100 × level^1.8)
```

### Level Scaling Formula

```javascript
statBonus = 1 + (level - 1) × 0.08
```

### Item Stat Variance

```javascript
itemLevel = playerLevel + random(-2, 2)
scaledStat = baseStat × (1 + (itemLevel - 1) × 0.12) × rarityMult
```

---

## FAQ

**Q: Can I respec my stat points?**
A: Currently no, but this feature is planned.

**Q: Do I need to keep up with gear?**
A: No - loot automatically scales to your level.

**Q: Are max-level players overpowered?**
A: No - dynamic difficulty ensures challenges scale with you.

**Q: When do allies level up?**
A: Automatically, when you level up - no action required.

**Q: What happens at level 50?**
A: Max level reached. Champion system planned for prestige progression.

---

**Last Updated:** December 2025
**System Version:** 2.0 (MMO-Style Progression)
