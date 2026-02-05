# Fighter Card System - Complete Inventory & Combo Variations

## Current Status: 24+ FIGHTERS CONFIRMED

**System Architecture**:
- ✅ Card Collection System (Tab 9)
- ✅ Slot Assignment (Tab 8) - 5 Guards + 10 Allies
- ✅ Fighter Card Inventory Display with [EQUIPPED] badges
- ✅ Card Rarity System (Common, Uncommon, Rare, Epic, Legendary)
- ✅ Fighter Preview with stats and abilities
- ✅ Level-up card generation

---

## ALL FIGHTER CARDS (LOADOUTS)

### DPS FIGHTERS (8 total)

| ID | Name | Class | Image | Unlock | Description |
|---|---|---|---|---|---|
| `warrior_melee_basic` | Ragnar the Cleaver | Warrior | Ragnar the Cleaver.png | Lvl 1 | Greatsword berserker with AoE cleaves |
| `mage_destruction_basic` | Ember the Pyromancer | Mage | Ember the Pyromancer.png | Lvl 1 | Fire mage with chain lightning |
| `warrior_magic_advanced` | Kaelen Stormbreaker | Warrior | Kaelen Stormbreaker.png | Lvl 1 | Spellblade with lightning magic |
| `rogue_shadow_basic` | Vex Shadowblade | Rogue | Vex Shadowblade.png | Lvl 1 | Dagger assassin with crits |
| `warrior_axe_fury` | Grom Ironfist | Warrior | Grom Ironfist.png | Lvl 1 | Axe berserker with fury |
| `mage_frost_control` | Frost the Cryomancer | Mage | Frost the Cryomancer.png | Lvl 1 | Ice mage with crowd control |
| `ranger_bow_sniper` | Lyra Swiftarrow | Ranger | Lyra Swiftarrow.png | Lvl 1 | Precision ranger with volleys |
| `battlemage_arcane` | Theron the Arcanist | Mage | Theron the Arcanist.png | Lvl 1 | Arcane battlemage balanced |

### TANK FIGHTERS (8+ total)

| ID | Name | Class | Image | Unlock | Description |
|---|---|---|---|---|---|
| `knight_basic` | Aldric the Stalwart | Knight | Aldric the Stalwart.png | Lvl 1 | Classic knight with shield |
| (And 7+ more tank variants) | | | | | |

### HEALER FIGHTERS (8+ total)

| ID | Name | Class | Image | Unlock | Description |
|---|---|---|---|---|---|
| `mage_healer_basic` | Aria the Lightweaver | Mage | (Placeholder) | Lvl 1 | Light burst healer |
| `priest_basic` | Father Benedict | Priest | Father Benedict.png | Lvl 1 | Holy priest |
| (And 6+ more healer variants) | | | | | |

---

## COMBO SYSTEM - HOW AI CHOOSES ABILITIES

Each fighter has a **3-phase combo strategy**:

### Phase 1: BURST PHASE (Offensive Window)
```javascript
burstPhase: {
  duration: 2.0,              // Seconds the burst lasts
  sequence: [                 // Order of abilities to cast
    { ability: 'warrior_cleave', weaveAfter: true },
    { ability: 'cleave', weaveAfter: true }
  ],
  targeting: 'normal'         // Targeting strategy
}
```

**Purpose**: Deal maximum damage when abilities are off-cooldown

### Phase 2: KITE PHASE (Survival Window)
```javascript
kitePhase: {
  duration: 2.5,              // How long to kite
  allowedAbilities: ['slash'],  // Low-cost abilities only
  purpose: 'Mana recovery, cooldown wait'
}
```

**Purpose**: Recover resources while waiting for burst to reset

### Phase 3: SUSTAIN PHASE (Default Window)
```javascript
sustainPhase: {
  useAbilities: ['slash', 'cleave'],  // Rotation to use
  exitCondition: 'burst_ready',       // When to go back to burst
  purpose: 'Maintain pressure until burst'
}
```

**Purpose**: Steady damage output between burst windows

---

## ABILITY POOL (All fighters use these)

### DPS Abilities
- `slash` - Basic melee attack
- `cleave` - AoE cleave attack
- `warrior_cleave` - Enhanced cleave
- `warrior_berserk` - High damage mode
- `warrior_fortitude` - Damage reduction
- `warrior_life_leech` - Healing on hit
- `arc_bolt` - Ranged magic
- `chain_light` - Bouncing chain damage
- `piercing_lance` - Piercing attack
- `meteor_slam` - AoE ground effect
- `gravity_well` - CC + damage
- `mage_time_warp` - Time manipulation
- `mage_arcane_missiles` - Rapid spell

### Tank Abilities
- `shield_bash` - Stun + taunt
- `block` - Damage reduction
- `knight_hold_ground` - Immovable defense
- `knight_retaliate` - Damage return
- `warcry` - Team buff

### Healer Abilities
- `heal` - Direct healing
- `mage_heal` - Spell healing
- `priest_blessing` - Buff + heal
- `shield_spell` - Absorb shield
- `druid_rejuvenation` - HoT

---

## EQUIPMENT STATS & MULTIPLIERS

Each fighter has **10 equipment slots**:
1. Helm (head armor)
2. Chest (body armor)
3. Shoulders
4. Hands (gloves)
5. Belt
6. Legs (pants)
7. Feet (boots)
8. Neck (accessory)
9. Accessory 1 (ring/trinket)
10. Accessory 2 (ring/trinket)

**Equipment provides bonuses**:
- `def` - Armor/defense
- `hp` - Health points
- `atk` - Attack power
- `int` - Intelligence (mana)
- `str` - Strength
- `agi` - Agility (speed)
- `manaRegen` - Mana per second
- `critChance` - Critical strike chance

---

## RARITY & STAR SYSTEM

| Rarity | Stars | Base Rating | Unlock Level | Appearance |
|--------|-------|------------|--------------|-----------|
| Common | ⭐ | 1 | Lvl 1 | Gray border |
| Uncommon | ⭐⭐ | 2 | Lvl 3 | Green border |
| Rare | ⭐⭐⭐ | 3 | Lvl 5 | Cyan border |
| Epic | ⭐⭐⭐⭐ | 4 | Lvl 7 | Magenta border |
| Legendary | ⭐⭐⭐⭐⭐ | 5 | Lvl 10+ | Orange border |

**Stat Multipliers**:
- Common: 1.0x
- Uncommon: 1.3x
- Rare: 1.7x
- Epic: 2.2x
- Legendary: 3.0x

---

## HOW TO ADD A NEW FIGHTER

**Step 1**: Create new loadout in `src/game/loadout-registry.js`:

```javascript
my_new_fighter: {
  id: 'my_new_fighter',
  name: 'Cool Fighter Name',
  fighterImage: 'Cool Fighter Name.png',  // Must exist in assets/
  description: 'Brief flavor text',
  class: 'warrior|mage|knight|etc',
  role: 'dps|tank|healer|flex',
  unlockLevel: 1,  // When it becomes available
  
  weapon: { weaponType: 'Weapon Type', buffs: { atk: 8 } },
  
  armor: {
    helm: { armorType: 'Heavy', buffs: { def: 4 } },
    chest: { armorType: 'Heavy', buffs: { def: 6, hp: 30 } },
    // ... 8 more slots ...
  },
  
  abilities: ['ability1', 'ability2', 'ability3', 'ability4', 'ability5'],
  
  combo: {
    loadoutId: 'my_new_fighter',
    coordinationMode: 'individual',
    burstPhase: { duration: 2.0, sequence: [...], targeting: 'normal' },
    kitePhase: { duration: 2.5, allowedAbilities: [...], purpose: '...' },
    sustainPhase: { useAbilities: [...], exitCondition: 'burst_ready', purpose: '...' }
  }
}
```

**Step 2**: Create fighter portrait image:
- File: `assets/fighter player cards/Cool Fighter Name.png`
- Size: 60×80 pixels (portrait style)

**Step 3**: Test in console:
```javascript
LOADOUT_TEST.viewAll()  // Should show new fighter
```

---

## CARD GENERATION MECHANICS

When player levels up or triggers card spin:

```javascript
generateFighterCard(playerLevel, cardId) {
  // 1. Pick random loadout (weighted by level)
  const loadout = getAvailableLoadout(playerLevel);
  
  // 2. Determine rarity (weighted by level)
  // Level 1: 90% common, 10% uncommon
  // Level 10: 50% common, 30% uncommon, 15% rare, 5% epic
  // Level 20+: 5% legendary possible
  const rarity = selectRarity(playerLevel);
  
  // 3. Generate random level (±2 from player)
  const cardLevel = playerLevel + rand(-2, 2);
  
  // 4. Calculate stats from rarity
  const stats = {
    hp: baseHp * rarity.multiplier * (1 + cardLevel*0.12),
    atk: baseAtk * rarity.multiplier * (1 + cardLevel*0.15),
    // etc...
  };
  
  // 5. Create card object
  return {
    id: `card_${cardId}`,
    loadoutId: loadout.id,
    loadoutBaseId: loadout.id,
    name: loadout.name,
    role: loadout.role,
    level: cardLevel,
    rarity: rarity,
    rating: rarity.stars,
    fighterImage: loadout.fighterImage,
    stats: stats
  };
}
```

---

## RECOMMENDED NEXT STEPS

### Phase 1: Expand Fighter Roster (IMMEDIATE)
- [ ] Add 5-10 more unique fighter designs
- [ ] Create portraits for each (60×80px PNG)
- [ ] Test card generation at various levels
- [ ] Verify combo behavior for each fighter

### Phase 2: Advanced Mechanics (SOON)
- [ ] Boss-specific drops (Zone 1 boss drops zone 1 fighters, etc.)
- [ ] Card leveling system (level cards beyond base level)
- [ ] Star evolution (combine 3⭐ cards → 4⭐ card)
- [ ] Synergy bonuses (2+ cards from same faction = buff)

### Phase 3: UI Polish (LATER)
- [ ] Animated card reveal on level-up (re-enable `showFighterCardReveal`)
- [ ] Collection tracker showing which fighters owned
- [ ] Fighter Library tab showing all available fighters
- [ ] Card sorting/filtering by name/rarity/role

---

## TESTING COMMANDS

```javascript
// View all loadouts
LOADOUT_TEST.viewAll()

// Give one of each rarity
LOADOUT_TEST.spawnRandomAllRarities()

// Set all cards to legendary
LOADOUT_TEST.setAllRarity('legendary')

// Test a specific fighter
LOADOUT_TEST.testImages('warrior_melee_basic')

// Reset to common
LOADOUT_TEST.resetAll()

// Trigger free card roll (like leveling up)
triggerFreeCardRoll()

// Give 10 common cards (development)
giveCommonCards()
```

---

**System Version**: 2026-02-04  
**Last Updated**: Complete inventory audit  
**Status**: ✅ Ready for expansion
