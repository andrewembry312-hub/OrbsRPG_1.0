# Loadout System Design Document

## Overview
The loadout system defines all fighter builds in the game. Each loadout is a complete fighter "class" with equipment, abilities, and AI behavior.

## Current State
- **24 Total Loadouts**: 8 DPS + 8 Tank + 8 Healer (plus 2 guard-specific)
- **All loadouts have**: ID, name, image, description, class, role, unlockLevel, weapon, armor (optional), abilities (5 slots)
- **⚠️ ISSUE**: Most loadouts have simplified text combos instead of proper AI-readable combo objects

## Required Structure

### Complete Loadout Template
```javascript
{
  id: 'warrior_fire_dps',                    // Unique identifier
  name: 'Blaze the Inferno',                 // Display name in UI
  fighterImage: 'placeholder_blaze.png',     // 60x60px portrait
  description: 'Fire warrior with burn DoTs',// Tooltip description
  class: 'warrior',                          // Character class
  role: 'dps',                               // Combat role (dps/tank/healer)
  unlockLevel: 5,                            // Progression gating
  
  weapon: {
    weaponType: 'Greatsword',
    buffs: { atk: 8 }
  },
  
  armor: {                                   // OPTIONAL - for future rarity system
    helm: { armorType: 'Heavy', buffs: { def: 2 } },
    chest: { armorType: 'Heavy', buffs: { def: 4, hp: 20 } },
    shoulders: { armorType: 'Medium', buffs: { def: 1 } },
    hands: { armorType: 'Light', buffs: { atk: 1 } },
    belt: { armorType: 'Medium', buffs: { def: 1 } },
    legs: { armorType: 'Heavy', buffs: { def: 3 } },
    feet: { armorType: 'Medium', buffs: { agi: 1 } },
    neck: { armorType: 'Accessory', buffs: { hp: 15 } },
    accessory1: { armorType: 'Accessory', buffs: { atk: 2 } },
    accessory2: { armorType: 'Accessory', buffs: { critChance: 0.03 } }
  },
  
  abilities: ['slash', 'cleave', 'slash', 'slash', 'cleave'],  // 5 ability slots
  
  combo: {                                   // ⚠️ CRITICAL - AI behavior
    loadoutId: 'warrior_fire_dps',           // Must match id above
    coordinationMode: 'individual',          // or 'ball_group' for guards
    
    burstPhase: {
      duration: 2.0,                         // Seconds of burst window
      sequence: [
        { ability: 'cleave', weaveAfter: true },
        { ability: 'slash', weaveAfter: true }
      ],
      targeting: 'normal'                    // 'normal', 'focus', 'aoe'
    },
    
    kitePhase: {
      duration: 2.5,                         // Recovery period
      allowedAbilities: ['slash'],           // Cheap filler abilities
      purpose: 'Mana recovery, cooldown wait'
    },
    
    sustainPhase: {
      useAbilities: ['slash', 'cleave'],     // Rotation during sustain
      exitCondition: 'burst_ready',          // When to return to burst
      purpose: 'Maintain pressure until burst window'
    }
  }
}
```

## Combo Object Explained

### Why It's Critical
The combo object is NOT just documentation - it's **executable AI behavior**. The AI system reads this structure to determine:
- When to burst (high damage window)
- When to kite/recover (mana/cooldown management)
- What to spam during sustain phase
- How to coordinate with teammates (guards only)

### coordinationMode
- `'individual'`: Solo AI, makes own decisions
- `'ball_group'`: Coordinates with team (guards use this)

### burstPhase
- **duration**: How long the burst window lasts (seconds)
- **sequence**: Exact ability order during burst
  - `weaveAfter: true` - Animation cancel after this ability
  - `weaveAfter: false` - Let ability fully cast
- **targeting**: 
  - `'normal'` - Standard target priority
  - `'focus'` - All focus same target (guards)
  - `'aoe'` - Prioritize AoE positioning

### kitePhase
- **duration**: How long to kite/recover
- **allowedAbilities**: Only use these cheap abilities
- **purpose**: (Documentation only)

### sustainPhase
- **useAbilities**: Rotation abilities during sustain
- **exitCondition**: 
  - `'burst_ready'` - Return to burst when cooldowns up
  - `'heal_needed'` - Healers trigger on ally HP < 70%
- **purpose**: (Documentation only)

## Fighter Card Rarity System (Future)

### Planned Design
- **Base Loadouts**: 8+ per role (what we have now)
- **Fighter Cards**: Drop from enemies with rarity (Common → Legendary)
- **Card Purpose**: Determines gear quality when spawned

### How It Works
1. Player unlocks "Ragnar the Cleaver" loadout (DPS)
2. Assigns it to guard_dps_1 slot (level 5 slot)
3. Initially spawns with **Common** gear (default)
4. Player finds **Legendary Ragnar Card** as drop
5. Can equip Legendary version to guard_dps_1 slot
6. Ragnar now spawns with Legendary weapon + armor

### Benefits
- Base loadouts define abilities/combo (never change)
- Cards add progression layer (gear quality)
- Old cards still useful (equip to other slots)
- Clean separation: Loadout = Abilities, Card = Gear

## Adding New Loadouts

### Step-by-Step Guide
1. Open `src/game/loadout-registry.js`
2. Find the role section (DPS/TANK/HEALER)
3. Copy an existing loadout from that role
4. Change the `id`: Use pattern like `mage_lightning_advanced`
5. Update `name`: Give cool fighter identity
6. Update `fighterImage`: placeholder_<name>.png
7. Modify `abilities`: Pick 5 abilities matching theme
8. **IMPORTANT**: Update combo object:
   - Change `loadoutId` to match new `id`
   - Update ability names in `burstPhase.sequence`
   - Update ability names in `kitePhase.allowedAbilities`
   - Update ability names in `sustainPhase.useAbilities`
9. Set `unlockLevel`: Space out progression (1-5 early, 6-15 mid, 16+ late)
10. Save file - system auto-detects!

### Example: Adding "Shadow Assassin" DPS
```javascript
rogue_shadow_assassin: {
  id: 'rogue_shadow_assassin',
  name: 'Vex the Shadow',
  fighterImage: 'placeholder_vex_shadow.png',
  description: 'Stealthy assassin with critical strikes',
  class: 'rogue',
  role: 'dps',
  unlockLevel: 12,
  
  weapon: { weaponType: 'Dagger', buffs: { atk: 10, critChance: 0.10 } },
  
  // Armor optional - can copy from any DPS loadout
  armor: { ... },
  
  abilities: ['slash', 'slash', 'slash', 'cleave', 'slash'],  // Fast attacks
  
  combo: {
    loadoutId: 'rogue_shadow_assassin',
    coordinationMode: 'individual',
    
    burstPhase: {
      duration: 1.5,  // Quick burst
      sequence: [
        { ability: 'slash', weaveAfter: true },
        { ability: 'slash', weaveAfter: true },
        { ability: 'cleave', weaveAfter: true }  // Execute
      ],
      targeting: 'normal'
    },
    
    kitePhase: {
      duration: 2.0,
      allowedAbilities: ['slash'],
      purpose: 'Reposition for next burst'
    },
    
    sustainPhase: {
      useAbilities: ['slash'],
      exitCondition: 'burst_ready',
      purpose: 'Fast slash spam'
    }
  }
},
```

## Current Loadouts (24 total)

### DPS (8 fighters)
1. warrior_melee_basic - Ragnar the Cleaver (Greatsword berserker) ✅ COMBO FIXED
2. mage_destruction_basic - Ember the Pyromancer (Fire mage) ⚠️ TEXT COMBO
3. warrior_magic_advanced - Kaelen Stormbreaker (Lightning spellblade) ⚠️ TEXT COMBO
4. rogue_shadow_basic - Vex Shadowblade (Assassin) ⚠️ TEXT COMBO
5. warrior_axe_fury - Grom Ironfist (Axe warrior) ⚠️ TEXT COMBO
6. mage_frost_control - Frost the Frozen (Ice mage) ⚠️ TEXT COMBO
7. ranger_bow_sniper - Lyra Swiftarrow (Archer) ⚠️ TEXT COMBO
8. battlemage_arcane - Theron the Arcane (Arcane battlemage) ⚠️ TEXT COMBO

### Tank (8 fighters)
1. knight_basic - Aldric the Stalwart (Classic knight) ⚠️ TEXT COMBO
2. warden_advanced - Gareth Ironwall (Heavy warden) ⚠️ TEXT COMBO
3. paladin_holy - Seraphina Lightbringer (Holy paladin) ⚠️ TEXT COMBO
4. guardian_stone - Boulder the Unbreakable (Stone guardian) ⚠️ TEXT COMBO
5. sentinel_defensive - Marcus the Sentinel (Defensive specialist) ⚠️ TEXT COMBO
6. berserker_tank - Drogan Bloodrage (Rage tank) ⚠️ TEXT COMBO
7. crusader_holy - Thaddeus the Just (Holy crusader) ⚠️ TEXT COMBO
8. fortress_immovable - Titan the Fortress (Maximum defense) ⚠️ TEXT COMBO

### Healer (8 fighters)
1. mage_healer_basic - Aria the Lightweaver (Light burst healer) ⚠️ TEXT COMBO
2. priest_basic - Father Benedict (Holy priest) ⚠️ TEXT COMBO
3. shaman_nature - Willow Earthsong (Nature shaman) ⚠️ TEXT COMBO
4. oracle_divine - Celeste the Oracle (Divine shielder) ⚠️ TEXT COMBO
5. druid_restoration - Rowan Greenleaf (Restoration druid) ⚠️ TEXT COMBO
6. cleric_war - Morgana Battlepriest (War cleric hybrid) ⚠️ TEXT COMBO
7. templar_holy - Seran Dawnbringer (Holy templar) ⚠️ TEXT COMBO
8. mystic_ethereal - Luna Starwhisper (Ethereal mystic) ⚠️ TEXT COMBO

### Guards (2 specialized)
1. guard_warrior_dps - Guard Fighter ✅ COMBO OK
2. guard_mage_healer - Guard Medic ✅ COMBO OK

## Next Steps
1. **PRIORITY**: Convert all 23 text combos to proper combo objects
2. Add armor sets to all loadouts (for future rarity system)
3. Improve fighter names to match abilities better
4. Test all loadouts in-game

## Notes
- System supports unlimited loadouts per role
- Helper functions auto-filter by role/level
- Fighter card UI displays all available options
- No hard-coded limits anywhere in the system
