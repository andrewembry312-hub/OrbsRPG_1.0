// ═══════════════════════════════════════════════════════════════════════════════
// LOADOUT REGISTRY - Central definition for all fighter loadouts + AI combos
// ═══════════════════════════════════════════════════════════════════════════════
// 
// WHAT IS THIS FILE?
// This is the SINGLE SOURCE OF TRUTH for all fighter builds (allies, guards, enemies).
// Each loadout defines a complete fighter: equipment, abilities, combo plan, and progression.
//
// STRUCTURE OF A LOADOUT:
// {
//   id: 'unique_identifier',              // Must be unique
//   name: 'Fighter Display Name',         // Shown in UI
//   fighterImage: 'image_path.png',       // Portrait (60x60px)
//   description: 'Brief description',     // Tooltip flavor text
//   class: 'warrior/mage/knight/etc',     // Fighter class
//   role: 'dps/tank/healer',              // Combat role (determines slot compatibility)
//   unlockLevel: 1-50,                    // When this fighter becomes available
//   
//   weapon: { weaponType: '...', buffs: {...} },    // Main weapon
//   armor: { helm: {...}, chest: {...}, ... },      // 10 armor pieces (optional, for future)
//   
//   abilities: ['ability1', 'ability2', ...],       // 5 ability slots
//   
//   combo: {                              // AI behavior (CRITICAL - don't simplify!)
//     loadoutId: 'matches_id_above',
//     coordinationMode: 'individual/ball_group',
//     burstPhase: { duration, sequence, targeting },
//     kitePhase: { duration, allowedAbilities, purpose },
//     sustainPhase: { useAbilities, exitCondition, purpose }
//   }
// }
//
// HOW TO ADD A NEW LOADOUT:
// 1. Find the role section you want (DPS/TANK/HEALER)
// 2. Copy an existing loadout from that role (use Ctrl+C/Ctrl+V)
// 3. Change the ID: Use pattern like mage_fire_advanced, warrior_axe_berserker, etc.
// 4. Update name: Give the fighter a cool identity ("Blaze the Inferno", "Thorn Shieldbreaker")
// 5. Update fighterImage: Use placeholder_<name>.png (real images added later)
// 6. Modify abilities: Pick 5 abilities that match the fighter's theme
// 7. Adjust combo object: Keep the structure, change ability names in sequences
// 8. Set unlockLevel: Space them out (early game: 1-5, mid: 6-15, late: 16+)
// 9. Save file - system auto-detects and shows it in the fighter card UI!
//
// FUTURE-PROOFING:
// - armor object is included but optional (for fighter card rarity system later)
// - System handles any number of loadouts per role
// - Helper functions auto-filter by role/level
// - No hard-coded limits anywhere

export const LOADOUT_REGISTRY = {
  
  // ═════════════════════════════════════════════════════════════════════════════
  // DPS LOADOUTS - High damage, offensive builds (8+ fighters)
  // ═════════════════════════════════════════════════════════════════════════════
  
  warrior_melee_basic: {
    id: 'warrior_melee_basic',
    name: 'Ragnar the Cleaver',
    fighterImage: 'Ragnar the Cleaver.png',
    description: 'Greatsword berserker specializing in devastating AoE cleaves',
    class: 'warrior',
    role: 'dps',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Great Sword', buffs: { atk: 8 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { def: 2 } },
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
    
    abilities: ['slash', 'warrior_cleave', 'cleave', 'warrior_berserk', 'warrior_fortitude'],
    
    combo: {
      loadoutId: 'warrior_melee_basic',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 2.0,
        sequence: [
          { ability: 'warrior_cleave', weaveAfter: true },
          { ability: 'cleave', weaveAfter: true }
        ],
        targeting: 'normal'
      },
      
      kitePhase: {
        duration: 2.5,
        allowedAbilities: ['slash'],
        purpose: 'Mana recovery, cooldown wait'
      },
      
      sustainPhase: {
        useAbilities: ['slash', 'cleave'],
        exitCondition: 'burst_ready',
        purpose: 'Maintain pressure until burst window'
      }
    }
  },
  
  mage_destruction_basic: {
    id: 'mage_destruction_basic',
    name: 'Ember the Pyromancer',
    fighterImage: 'Ember the Pyromancer.png',
    description: 'Fire mage with explosive AoE and chain lightning',
    class: 'mage',
    role: 'dps',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 6, manaRegen: 2 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 2 } },
      chest: { armorType: 'Light', buffs: { int: 3, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 1 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.04 } }
    },
    
    abilities: ['arc_bolt', 'chain_light', 'piercing_lance', 'meteor_slam', 'gravity_well'],
    
    combo: {
      loadoutId: 'mage_destruction_basic',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 2.0,
        sequence: [
          { ability: 'chain_light', weaveAfter: true },
          { ability: 'piercing_lance', weaveAfter: true }
        ],
        targeting: 'normal'
      },
      
      kitePhase: {
        duration: 2.5,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Mana recovery with cheap Arc Bolt'
      },
      
      sustainPhase: {
        useAbilities: ['arc_bolt', 'chain_light'],
        exitCondition: 'burst_ready',
        purpose: 'Spam Arc Bolt and Chain Light rotation'
      }
    }
  },
  
  warrior_magic_advanced: {
    id: 'warrior_magic_advanced',
    name: 'Kaelen Stormbreaker',
    fighterImage: 'Kaelen Stormbreaker.png',
    description: 'Spellblade wielding lightning magic and melee prowess',
    class: 'warrior',
    role: 'dps',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 7, manaRegen: 1 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { int: 1, def: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 3, hp: 15 } },
      shoulders: { armorType: 'Medium', buffs: { def: 1 } },
      hands: { armorType: 'Medium', buffs: { atk: 1 } },
      belt: { armorType: 'Medium', buffs: { hp: 10 } },
      legs: { armorType: 'Heavy', buffs: { def: 2 } },
      feet: { armorType: 'Medium', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 15 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.03 } }
    },
    
    abilities: ['slash', 'warrior_cleave', 'cleave', 'warrior_berserk', 'warrior_fortitude'],
    
    combo: {
      loadoutId: 'warrior_magic_advanced',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 2.2,
        sequence: [
          { ability: 'chain_light', weaveAfter: true },
          { ability: 'piercing_lance', weaveAfter: true }
        ],
        targeting: 'normal'
      },
      
      kitePhase: {
        duration: 2.0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Ranged kiting with staff'
      },
      
      sustainPhase: {
        useAbilities: ['arc_bolt', 'chain_light'],
        exitCondition: 'burst_ready',
        purpose: 'Balanced magic rotation'
      }
    }
  },
  
  rogue_shadow_basic: {
    id: 'rogue_shadow_basic',
    name: 'Vex Shadowblade',
    fighterImage: 'Vex Shadowblade.png',
    description: 'Dagger assassin with rapid critical strikes',
    class: 'warrior',
    role: 'dps',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Dagger', buffs: { atk: 7, agi: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { agi: 2 } },
      chest: { armorType: 'Light', buffs: { agi: 3, def: 1 } },
      shoulders: { armorType: 'Light', buffs: { agi: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 2 } },
      belt: { armorType: 'Light', buffs: { agi: 1 } },
      legs: { armorType: 'Light', buffs: { agi: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 2 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.05 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.05 } }
    },
    
    abilities: ['slash', 'cleave', 'shoulder_charge', 'blade_storm', 'leap_strike'],
    
    combo: {
      loadoutId: 'rogue_shadow_basic',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.5,
        sequence: [
          { ability: 'slash', weaveAfter: true },
          { ability: 'slash', weaveAfter: true },
          { ability: 'cleave', weaveAfter: true }
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
  
  warrior_axe_fury: {
    id: 'warrior_axe_fury',
    name: 'Grom Ironfist',
    fighterImage: 'Grom Ironfist.png',
    description: 'Axe berserker with relentless cleaving fury',
    class: 'warrior',
    role: 'dps',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Axe', buffs: { atk: 9 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { str: 2 } },
      chest: { armorType: 'Heavy', buffs: { def: 3, hp: 20 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 2 } },
      hands: { armorType: 'Medium', buffs: { atk: 2 } },
      belt: { armorType: 'Heavy', buffs: { def: 1 } },
      legs: { armorType: 'Heavy', buffs: { def: 2 } },
      feet: { armorType: 'Medium', buffs: { str: 1 } },
      neck: { armorType: 'Accessory', buffs: { hp: 15 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.03 } }
    },
    
    abilities: ['slash', 'warrior_cleave', 'cleave', 'warrior_life_leech', 'warcry'],
    
    combo: {
      loadoutId: 'warrior_axe_fury',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 2.0,
        sequence: [
          { ability: 'warrior_cleave', weaveAfter: true },
          { ability: 'cleave', weaveAfter: true }
        ],
        targeting: 'normal'
      },
      
      kitePhase: {
        duration: 2.5,
        allowedAbilities: ['slash'],
        purpose: 'Cooldown recovery'
      },
      
      sustainPhase: {
        useAbilities: ['slash', 'cleave'],
        exitCondition: 'burst_ready',
        purpose: 'Slash and cleave rotation'
      }
    }
  },
  
  mage_frost_control: {
    id: 'mage_frost_control',
    name: 'Frost the Cryomancer',
    fighterImage: 'Frost the Cryomancer.png',
    description: 'Ice mage with piercing frost lances and crowd control',
    class: 'mage',
    role: 'dps',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 6, manaRegen: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 2 } },
      chest: { armorType: 'Light', buffs: { int: 3, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 1 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.04 } }
    },
    
    abilities: ['arc_bolt', 'chain_light', 'gravity_well', 'mage_time_warp', 'mage_arcane_missiles'],
    
    combo: {
      loadoutId: 'mage_frost_control',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.8,
        sequence: [
          { ability: 'piercing_lance', weaveAfter: true },
          { ability: 'chain_light', weaveAfter: true }
        ],
        targeting: 'normal'
      },
      
      kitePhase: {
        duration: 2.5,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Frost control with Arc Bolt'
      },
      
      sustainPhase: {
        useAbilities: ['arc_bolt', 'chain_light'],
        exitCondition: 'burst_ready',
        purpose: 'Arc Bolt spam rotation'
      }
    }
  },
  
  ranger_bow_sniper: {
    id: 'ranger_bow_sniper',
    name: 'Lyra Swiftarrow',
    fighterImage: 'Lyra Swiftarrow.png',
    description: 'Precision ranger with rapid-fire volleys',
    class: 'warrior',
    role: 'dps',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Great Sword', buffs: { atk: 7, agi: 2 } },
    armor: {
      helm: { armorType: 'Light', buffs: { agi: 2 } },
      chest: { armorType: 'Medium', buffs: { agi: 2, def: 2 } },
      shoulders: { armorType: 'Light', buffs: { agi: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 2 } },
      belt: { armorType: 'Light', buffs: { agi: 1 } },
      legs: { armorType: 'Medium', buffs: { agi: 1, def: 1 } },
      feet: { armorType: 'Light', buffs: { agi: 2 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.05 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.05 } }
    },
    
    abilities: ['arc_bolt', 'piercing_lance', 'chain_light', 'gravity_well', 'meteor_slam'],
    
    combo: {
      loadoutId: 'ranger_bow_sniper',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.8,
        sequence: [
          { ability: 'slash', weaveAfter: true },
          { ability: 'slash', weaveAfter: true },
          { ability: 'cleave', weaveAfter: true }
        ],
        targeting: 'normal'
      },
      
      kitePhase: {
        duration: 2.0,
        allowedAbilities: ['slash'],
        purpose: 'Maintain distance with rapid shots'
      },
      
      sustainPhase: {
        useAbilities: ['slash'],
        exitCondition: 'burst_ready',
        purpose: 'Slash spam'
      }
    }
  },
  
  battlemage_arcane: {
    id: 'battlemage_arcane',
    name: 'Theron the Arcanist',
    fighterImage: 'Theron the Arcanist.png',
    description: 'Arcane battlemage with balanced spell rotation',
    class: 'mage',
    role: 'dps',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 8, manaRegen: 2 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 2 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.04 } }
    },
    
    abilities: ['slash', 'cleave', 'arc_bolt', 'chain_light', 'meteor_slam'],
    
    combo: {
      loadoutId: 'battlemage_arcane',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 2.2,
        sequence: [
          { ability: 'chain_light', weaveAfter: true },
          { ability: 'piercing_lance', weaveAfter: true }
        ],
        targeting: 'normal'
      },
      
      kitePhase: {
        duration: 2.0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Mana efficient filler'
      },
      
      sustainPhase: {
        useAbilities: ['arc_bolt', 'chain_light'],
        exitCondition: 'burst_ready',
        purpose: 'Balanced arcane rotation'
      }
    }
  },
  
  // ═════════════════════════════════════════════════════════════════════════════
  // TANK LOADOUTS - Defensive builds with crowd control (8+ fighters)
  // ═════════════════════════════════════════════════════════════════════════════
  
  knight_basic: {
    id: 'knight_basic',
    name: 'Aldric the Stalwart',
    fighterImage: 'Aldric the Stalwart.png',
    description: 'Classic knight with shield wall and taunt control',
    class: 'knight',
    role: 'tank',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Sword', buffs: { atk: 5, def: 3 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 4 } },
      chest: { armorType: 'Heavy', buffs: { def: 6, hp: 30 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 3 } },
      hands: { armorType: 'Heavy', buffs: { def: 2 } },
      belt: { armorType: 'Heavy', buffs: { hp: 20 } },
      legs: { armorType: 'Heavy', buffs: { def: 4 } },
      feet: { armorType: 'Heavy', buffs: { def: 2 } },
      neck: { armorType: 'Accessory', buffs: { hp: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 20 } }
    },
    
    abilities: ['knight_taunt', 'knight_shield_wall', 'slash', 'knight_rally', 'tank_iron_skin'],
    
    combo: {
      loadoutId: 'knight_basic',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.5,
        sequence: [
          { ability: 'knight_taunt', weaveAfter: false },
          { ability: 'knight_shield_wall', weaveAfter: false }
        ],
        targeting: 'focus'
      },
      
      kitePhase: {
        duration: 2.0,
        allowedAbilities: ['slash'],
        purpose: 'Maintain threat with light attacks'
      },
      
      sustainPhase: {
        useAbilities: ['slash'],
        exitCondition: 'burst_ready',
        purpose: 'Hold position and maintain aggro'
      }
    }
  },
  
  warden_advanced: {
    id: 'warden_advanced',
    name: 'Gareth Ironwall',
    fighterImage: 'Gareth Ironwall.png',
    description: 'Heavy warden with anchor roots and iron skin defense',
    class: 'warden',
    role: 'tank',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Great Sword', buffs: { atk: 6, def: 5 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5 } },
      chest: { armorType: 'Heavy', buffs: { def: 7, hp: 35 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 25 } },
      legs: { armorType: 'Heavy', buffs: { def: 5 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 25 } }
    },
    
    abilities: ['tank_anchor', 'tank_iron_skin', 'slash', 'tank_bodyguard', 'tank_seismic_wave'],
    
    combo: {
      loadoutId: 'warden_advanced',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.8,
        sequence: [
          { ability: 'tank_anchor', weaveAfter: false },
          { ability: 'tank_iron_skin', weaveAfter: false }
        ],
        targeting: 'aoe'
      },
      
      kitePhase: {
        duration: 2.5,
        allowedAbilities: ['slash'],
        purpose: 'Cooldown recovery while tanking'
      },
      
      sustainPhase: {
        useAbilities: ['slash'],
        exitCondition: 'burst_ready',
        purpose: 'Sustained tanking with high armor'
      }
    }
  },
  
  paladin_holy: {
    id: 'paladin_holy',
    name: 'Seraphina Lightbringer',
    fighterImage: 'Seraphina Lightbringer.png',
    description: 'Holy paladin with self-healing and protective shields',
    class: 'knight',
    role: 'tank',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Sword', buffs: { atk: 5, def: 4 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 4, int: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 5, hp: 25, manaRegen: 1 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 3 } },
      hands: { armorType: 'Medium', buffs: { def: 2 } },
      belt: { armorType: 'Heavy', buffs: { hp: 20 } },
      legs: { armorType: 'Heavy', buffs: { def: 4 } },
      feet: { armorType: 'Medium', buffs: { def: 2 } },
      neck: { armorType: 'Accessory', buffs: { hp: 20, mana: 15 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 20 } }
    },
    
    abilities: ['knight_taunt', 'heal_burst', 'slash', 'knight_shield_wall', 'ward_barrier'],
    
    combo: {
      loadoutId: 'paladin_holy',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.5,
        sequence: [
          { ability: 'knight_taunt', weaveAfter: false },
          { ability: 'knight_shield_wall', weaveAfter: false }
        ],
        targeting: 'focus'
      },
      
      kitePhase: {
        duration: 2.0,
        allowedAbilities: ['slash', 'heal_burst'],
        purpose: 'Self-heal when needed'
      },
      
      sustainPhase: {
        useAbilities: ['slash'],
        exitCondition: 'burst_ready',
        purpose: 'Tanking with self-sustain'
      }
    }
  },
  
  guardian_stone: {
    id: 'guardian_stone',
    name: 'Boulder the Unbreakable',
    fighterImage: 'Boulder the Unbreakable.png',
    description: 'Stone guardian with massive health and immovable defense',
    class: 'knight',
    role: 'tank',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Great Sword', buffs: { atk: 5, def: 6 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 6 } },
      chest: { armorType: 'Heavy', buffs: { def: 8, hp: 40 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 5 } },
      hands: { armorType: 'Heavy', buffs: { def: 4 } },
      belt: { armorType: 'Heavy', buffs: { hp: 30 } },
      legs: { armorType: 'Heavy', buffs: { def: 6 } },
      feet: { armorType: 'Heavy', buffs: { def: 4 } },
      neck: { armorType: 'Accessory', buffs: { hp: 35 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 5 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 30 } }
    },
    
    abilities: ['tank_anchor', 'slash', 'tank_iron_skin', 'tank_ground_slam', 'tank_seismic_wave'],
    
    combo: {
      loadoutId: 'guardian_stone',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.8,
        sequence: [
          { ability: 'tank_anchor', weaveAfter: false },
          { ability: 'tank_iron_skin', weaveAfter: false }
        ],
        targeting: 'aoe'
      },
      
      kitePhase: {
        duration: 2.5,
        allowedAbilities: ['slash'],
        purpose: 'Minimal movement, maximum defense'
      },
      
      sustainPhase: {
        useAbilities: ['slash'],
        exitCondition: 'burst_ready',
        purpose: 'Immovable object playstyle'
      }
    }
  },
  
  sentinel_defensive: {
    id: 'sentinel_defensive',
    name: 'Marcus the Sentinel',
    fighterImage: 'Marcus the Sentinel.png',
    description: 'Defensive sentinel specializing in damage reduction',
    class: 'knight',
    role: 'tank',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Sword', buffs: { atk: 4, def: 5 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5 } },
      chest: { armorType: 'Heavy', buffs: { def: 6, hp: 30 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 25 } },
      legs: { armorType: 'Heavy', buffs: { def: 5 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 25 } }
    },
    
    abilities: ['knight_shield_wall', 'knight_taunt', 'slash', 'knight_rally', 'knight_justice_strike'],
    
    combo: {
      loadoutId: 'sentinel_defensive',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.5,
        sequence: [
          { ability: 'knight_shield_wall', weaveAfter: false },
          { ability: 'knight_taunt', weaveAfter: false }
        ],
        targeting: 'focus'
      },
      
      kitePhase: {
        duration: 2.0,
        allowedAbilities: ['slash'],
        purpose: 'Shield wall uptime focus'
      },
      
      sustainPhase: {
        useAbilities: ['slash'],
        exitCondition: 'burst_ready',
        purpose: 'Defensive stance rotation'
      }
    }
  },
  
  berserker_tank: {
    id: 'berserker_tank',
    name: 'Drogan Bloodrage',
    fighterImage: 'Drogan Bloodrage.png',
    description: 'Rage-fueled berserker tank with aggressive cleaves',
    class: 'warrior',
    role: 'tank',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Axe', buffs: { atk: 7, def: 4 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 4, str: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 5, hp: 25, atk: 2 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 3 } },
      hands: { armorType: 'Medium', buffs: { def: 2, atk: 1 } },
      belt: { armorType: 'Heavy', buffs: { hp: 20 } },
      legs: { armorType: 'Heavy', buffs: { def: 4 } },
      feet: { armorType: 'Medium', buffs: { def: 2 } },
      neck: { armorType: 'Accessory', buffs: { hp: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 2, def: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 20 } }
    },
    
    abilities: ['slash', 'tank_anchor', 'cleave', 'tank_iron_skin', 'warrior_berserk'],
    
    combo: {
      loadoutId: 'berserker_tank',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 2.0,
        sequence: [
          { ability: 'tank_anchor', weaveAfter: false },
          { ability: 'cleave', weaveAfter: true },
          { ability: 'slash', weaveAfter: true }
        ],
        targeting: 'aoe'
      },
      
      kitePhase: {
        duration: 2.0,
        allowedAbilities: ['slash'],
        purpose: 'Aggressive positioning'
      },
      
      sustainPhase: {
        useAbilities: ['slash', 'tank_iron_skin'],
        exitCondition: 'burst_ready',
        purpose: 'Offensive tank rotation'
      }
    }
  },
  
  crusader_holy: {
    id: 'crusader_holy',
    name: 'Thaddeus the Just',
    fighterImage: 'Thaddeus the Just.png',
    description: 'Holy crusader with layered defensive cooldowns',
    class: 'knight',
    role: 'tank',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Sword', buffs: { atk: 5, def: 5 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5 } },
      chest: { armorType: 'Heavy', buffs: { def: 6, hp: 30 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 25 } },
      legs: { armorType: 'Heavy', buffs: { def: 5 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 25 } }
    },
    
    abilities: ['knight_taunt', 'knight_shield_wall', 'slash', 'tank_iron_skin', 'knight_banner'],
    
    combo: {
      loadoutId: 'crusader_holy',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 1.5,
        sequence: [
          { ability: 'knight_taunt', weaveAfter: false },
          { ability: 'knight_shield_wall', weaveAfter: false }
        ],
        targeting: 'focus'
      },
      
      kitePhase: {
        duration: 2.0,
        allowedAbilities: ['slash'],
        purpose: 'Cooldown staggering'
      },
      
      sustainPhase: {
        useAbilities: ['slash'],
        exitCondition: 'burst_ready',
        purpose: 'Double defensive cooldown rotation'
      }
    }
  },
  
  fortress_immovable: {
    id: 'fortress_immovable',
    name: 'Titan the Fortress',
    fighterImage: 'Titan the Fortress.png',
    description: 'Ultimate fortress with maximum defense stacking',
    class: 'warden',
    role: 'tank',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Great Sword', buffs: { atk: 4, def: 7 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 7 } },
      chest: { armorType: 'Heavy', buffs: { def: 9, hp: 45 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 6 } },
      hands: { armorType: 'Heavy', buffs: { def: 5 } },
      belt: { armorType: 'Heavy', buffs: { hp: 35 } },
      legs: { armorType: 'Heavy', buffs: { def: 7 } },
      feet: { armorType: 'Heavy', buffs: { def: 5 } },
      neck: { armorType: 'Accessory', buffs: { hp: 40 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 6 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 35 } }
    },
    
    abilities: ['tank_iron_skin', 'tank_anchor', 'slash', 'tank_bodyguard', 'tank_ground_slam'],
    
    combo: {
      loadoutId: 'fortress_immovable',
      coordinationMode: 'individual',
      
      burstPhase: {
        duration: 2.0,
        sequence: [
          { ability: 'tank_iron_skin', weaveAfter: false },
          { ability: 'tank_anchor', weaveAfter: false }
        ],
        targeting: 'aoe'
      },
      
      kitePhase: {
        duration: 2.5,
        allowedAbilities: ['slash'],
        purpose: 'Never move, maximum mitigation'
      },
      
      sustainPhase: {
        useAbilities: ['slash'],
        exitCondition: 'burst_ready',
        purpose: 'Continuous defensive cycle'
      }
    }
  },
  
  // ═════════════════════════════════════════════════════════════════════════════
  // HEALER LOADOUTS - Support builds with healing and shields (8+ fighters)
  // ═════════════════════════════════════════════════════════════════════════════
  
  mage_healer_basic: {
    id: 'mage_healer_basic',
    name: 'Aria the Lightweaver',
    fighterImage: 'Aria the Lightweaver.png',
    description: 'Light mage with reactive burst healing',
    class: 'mage',
    role: 'healer',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 2 } },
      chest: { armorType: 'Light', buffs: { int: 3, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    
    abilities: ['heal_burst', 'arc_bolt', 'mage_divine_touch', 'ward_barrier', 'cleanse_wave'],
    
    combo: {
      loadoutId: 'mage_healer_basic',
      coordinationMode: 'reactive',
      
      burstPhase: {
        duration: 0,
        sequence: [],
        targeting: 'allies'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Filler damage when no healing needed'
      },
      
      sustainPhase: {
        useAbilities: ['arc_bolt'],
        exitCondition: 'heal_needed',
        purpose: 'Reactive healing - cast heal_burst when allies drop below 70% HP'
      }
    }
  },
  
  priest_basic: {
    id: 'priest_basic',
    name: 'Father Benedict',
    fighterImage: 'Father Benedict.png',
    description: 'Holy priest with emergency triple heal burst',
    class: 'mage',
    role: 'healer',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 2 } },
      chest: { armorType: 'Light', buffs: { int: 3, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    
    abilities: ['heal_burst', 'arc_bolt', 'mage_divine_touch', 'ward_barrier', 'cleanse_wave'],
    
    combo: {
      loadoutId: 'priest_basic',
      coordinationMode: 'reactive',
      
      burstPhase: {
        duration: 0,
        sequence: [],
        targeting: 'allies'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Light damage filler'
      },
      
      sustainPhase: {
        useAbilities: ['heal_burst', 'arc_bolt'],
        exitCondition: 'heal_needed',
        purpose: 'Triple heal burst for emergencies'
      }
    }
  },
  
  shaman_nature: {
    id: 'shaman_nature',
    name: 'Willow Earthsong',
    fighterImage: 'Willow Earthsong.png',
    description: 'Nature shaman with radiant aura shields',
    class: 'mage',
    role: 'healer',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 2 } },
      chest: { armorType: 'Medium', buffs: { int: 2, def: 2, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Medium', buffs: { int: 1, def: 1 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    
    abilities: ['heal_burst', 'renewal_field', 'arc_bolt', 'ward_barrier', 'mage_radiant_aura'],
    
    combo: {
      loadoutId: 'shaman_nature',
      coordinationMode: 'reactive',
      
      burstPhase: {
        duration: 1.0,
        sequence: [
          { ability: 'mage_radiant_aura', weaveAfter: false }
        ],
        targeting: 'allies'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Damage filler'
      },
      
      sustainPhase: {
        useAbilities: ['heal_burst', 'arc_bolt'],
        exitCondition: 'heal_needed',
        purpose: 'Radiant Aura shields → Reactive healing'
      }
    }
  },
  
  oracle_divine: {
    id: 'oracle_divine',
    name: 'Celeste the Oracle',
    fighterImage: 'Celeste the Oracle.png',
    description: 'Divine oracle with preventive ward barriers',
    class: 'mage',
    role: 'healer',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 5 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 3 } }
    },
    
    abilities: ['ward_barrier', 'heal_burst', 'mage_radiant_aura', 'arc_bolt', 'beacon_of_light'],
    
    combo: {
      loadoutId: 'oracle_divine',
      coordinationMode: 'reactive',
      
      burstPhase: {
        duration: 1.5,
        sequence: [
          { ability: 'ward_barrier', weaveAfter: false },
          { ability: 'mage_radiant_aura', weaveAfter: false }
        ],
        targeting: 'allies'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Damage when safe'
      },
      
      sustainPhase: {
        useAbilities: ['heal_burst', 'arc_bolt'],
        exitCondition: 'heal_needed',
        purpose: 'Preventive shields → Reactive heals'
      }
    }
  },
  
  druid_restoration: {
    id: 'druid_restoration',
    name: 'Rowan Greenleaf',
    fighterImage: 'Rowan Greenleaf.png',
    description: 'Restoration druid with nature healing magic',
    class: 'warden',
    role: 'healer',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 2 } },
      chest: { armorType: 'Light', buffs: { int: 3, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    
    abilities: ['heal_burst', 'renewal_field', 'arc_bolt', 'ward_barrier', 'cleanse_wave'],
    
    combo: {
      loadoutId: 'druid_restoration',
      coordinationMode: 'reactive',
      
      burstPhase: {
        duration: 1.0,
        sequence: [
          { ability: 'mage_radiant_aura', weaveAfter: false }
        ],
        targeting: 'allies'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Nature damage'
      },
      
      sustainPhase: {
        useAbilities: ['heal_burst'],
        exitCondition: 'heal_needed',
        purpose: 'Double heal burst → Radiant aura → Sustain'
      }
    }
  },
  
  cleric_war: {
    id: 'cleric_war',
    name: 'Morgana Battlepriest',
    fighterImage: 'Morgana Battlepriest.png',
    description: 'War cleric blending healing with offensive lightning',
    class: 'mage',
    role: 'healer',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 2 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { int: 2, def: 1 } },
      chest: { armorType: 'Medium', buffs: { int: 3, def: 2, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1, atk: 1 } },
      belt: { armorType: 'Medium', buffs: { int: 1, hp: 10 } },
      legs: { armorType: 'Medium', buffs: { int: 1, def: 1 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 1, atk: 1 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    
    abilities: ['heal_burst', 'arc_bolt', 'chain_light', 'ward_barrier', 'piercing_lance'],
    
    combo: {
      loadoutId: 'cleric_war',
      coordinationMode: 'reactive',
      
      burstPhase: {
        duration: 1.5,
        sequence: [
          { ability: 'chain_light', weaveAfter: true }
        ],
        targeting: 'normal'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Offensive damage'
      },
      
      sustainPhase: {
        useAbilities: ['heal_burst', 'arc_bolt'],
        exitCondition: 'heal_needed',
        purpose: 'Hybrid heal/damage rotation'
      }
    }
  },
  
  templar_holy: {
    id: 'templar_holy',
    name: 'Seran Dawnbringer',
    fighterImage: 'Seran Dawnbringer.png',
    description: 'Holy templar with group-wide protective shields',
    class: 'knight',
    role: 'healer',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 2 } },
      chest: { armorType: 'Medium', buffs: { int: 3, def: 2, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Medium', buffs: { int: 1, def: 1 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    
    abilities: ['mage_radiant_aura', 'heal_burst', 'ward_barrier', 'arc_bolt', 'mage_sacred_ground'],
    
    combo: {
      loadoutId: 'templar_holy',
      coordinationMode: 'reactive',
      
      burstPhase: {
        duration: 1.5,
        sequence: [
          { ability: 'mage_radiant_aura', weaveAfter: false },
          { ability: 'ward_barrier', weaveAfter: false }
        ],
        targeting: 'allies'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Light damage'
      },
      
      sustainPhase: {
        useAbilities: ['heal_burst'],
        exitCondition: 'heal_needed',
        purpose: 'Group shields → Reactive healing'
      }
    }
  },
  
  mystic_ethereal: {
    id: 'mystic_ethereal',
    name: 'Luna Starwhisper',
    fighterImage: 'luna starwhisper.png',
    description: 'Ethereal mystic with mana-efficient quad healing',
    class: 'mage',
    role: 'healer',
    unlockLevel: 1,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 6 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 2 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 3 } }
    },
    
    abilities: ['heal_burst', 'arc_bolt', 'mage_divine_touch', 'ward_barrier', 'cleanse_wave'],
    
    combo: {
      loadoutId: 'mystic_ethereal',
      coordinationMode: 'reactive',
      
      burstPhase: {
        duration: 0,
        sequence: [],
        targeting: 'allies'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Minimal damage, heal focus'
      },
      
      sustainPhase: {
        useAbilities: ['heal_burst'],
        exitCondition: 'heal_needed',
        purpose: 'Quad heal burst spam rotation'
      }
    }
  },
  
  // ═════════════════════════════════════════════════════════════════════════════
  // SHADOW GUILD FACTION — Assassins, poisoners, and stealth specialists
  // ═════════════════════════════════════════════════════════════════════════════

  shadow_assassin: {
    id: 'shadow_assassin',
    name: 'Shade the Phantom',
    fighterImage: 'placeholder_shadow_assassin.png',
    description: 'Ghost-like assassin who strikes from the shadows with devastating crit bursts',
    class: 'warrior',
    role: 'dps',
    faction: 'shadow_guild',
    unlockLevel: 5,
    weapon: { weaponType: 'Dagger', buffs: { atk: 9, agi: 4 } },
    armor: {
      helm: { armorType: 'Light', buffs: { agi: 3 } },
      chest: { armorType: 'Light', buffs: { agi: 4, def: 1 } },
      shoulders: { armorType: 'Light', buffs: { agi: 2 } },
      hands: { armorType: 'Light', buffs: { atk: 3 } },
      belt: { armorType: 'Light', buffs: { agi: 2 } },
      legs: { armorType: 'Light', buffs: { agi: 3 } },
      feet: { armorType: 'Light', buffs: { agi: 3 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.08 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.06 } }
    },
    abilities: ['slash', 'blade_storm', 'arcane_shadow_veil', 'leap_strike', 'assault_rapid_strikes'],
    combo: {
      loadoutId: 'shadow_assassin',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'arcane_shadow_veil', weaveAfter: false }, { ability: 'blade_storm', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Reposition for ambush' },
      sustainPhase: { useAbilities: ['slash', 'leap_strike'], exitCondition: 'burst_ready', purpose: 'Fast slash spam with gap closers' }
    }
  },

  shadow_poisoner: {
    id: 'shadow_poisoner',
    name: 'Nyx Venomblade',
    fighterImage: 'placeholder_shadow_poisoner.png',
    description: 'Toxic assassin who coats blades in lethal venom, melting enemies with DoTs',
    class: 'warrior',
    role: 'dps',
    faction: 'shadow_guild',
    unlockLevel: 10,
    weapon: { weaponType: 'Dagger', buffs: { atk: 8, agi: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { agi: 2 } },
      chest: { armorType: 'Light', buffs: { agi: 3, def: 1 } },
      shoulders: { armorType: 'Light', buffs: { agi: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 2 } },
      belt: { armorType: 'Light', buffs: { agi: 1 } },
      legs: { armorType: 'Light', buffs: { agi: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 2 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.05 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { agi: 2 } }
    },
    abilities: ['blade_storm', 'slash', 'warrior_cleave', 'leap_strike', 'assault_bloodlust'],
    combo: {
      loadoutId: 'shadow_poisoner',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.2, sequence: [{ ability: 'assault_bloodlust', weaveAfter: false }, { ability: 'blade_storm', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Let poisons tick while repositioning' },
      sustainPhase: { useAbilities: ['slash', 'warrior_cleave'], exitCondition: 'burst_ready', purpose: 'Maintain bleed pressure' }
    }
  },

  shadow_executioner: {
    id: 'shadow_executioner',
    name: 'Kael Deathwhisper',
    fighterImage: 'placeholder_shadow_executioner.png',
    description: 'Ruthless executioner who stacks damage debuffs before delivering the killing blow',
    class: 'warrior',
    role: 'dps',
    faction: 'shadow_guild',
    unlockLevel: 15,
    weapon: { weaponType: 'Axe', buffs: { atk: 10, agi: 2 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { agi: 2, str: 1 } },
      chest: { armorType: 'Medium', buffs: { agi: 3, def: 2 } },
      shoulders: { armorType: 'Light', buffs: { agi: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 3 } },
      belt: { armorType: 'Medium', buffs: { agi: 1 } },
      legs: { armorType: 'Medium', buffs: { agi: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 2 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.06 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.05 } }
    },
    abilities: ['warrior_cleave', 'cleave', 'slash', 'assault_fortune', 'warrior_berserk'],
    combo: {
      loadoutId: 'shadow_executioner',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'assault_fortune', weaveAfter: false }, { ability: 'warrior_cleave', weaveAfter: true }, { ability: 'cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Build up for execute window' },
      sustainPhase: { useAbilities: ['slash', 'cleave'], exitCondition: 'burst_ready', purpose: 'Stack debuffs before burst' }
    }
  },

  shadow_nightblade: {
    id: 'shadow_nightblade',
    name: 'Raven Nightstrike',
    fighterImage: 'placeholder_shadow_nightblade.png',
    description: 'Dual-wielding nightblade who weaves between enemies with blinding speed',
    class: 'warrior',
    role: 'dps',
    faction: 'shadow_guild',
    unlockLevel: 20,
    weapon: { weaponType: 'Dagger', buffs: { atk: 8, agi: 5 } },
    armor: {
      helm: { armorType: 'Light', buffs: { agi: 3 } },
      chest: { armorType: 'Light', buffs: { agi: 4 } },
      shoulders: { armorType: 'Light', buffs: { agi: 2 } },
      hands: { armorType: 'Light', buffs: { atk: 3, agi: 1 } },
      belt: { armorType: 'Light', buffs: { agi: 2 } },
      legs: { armorType: 'Light', buffs: { agi: 3 } },
      feet: { armorType: 'Light', buffs: { agi: 4 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.07 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.07 } }
    },
    abilities: ['slash', 'leap_strike', 'arcane_swiftness', 'blade_storm', 'assault_rampage'],
    combo: {
      loadoutId: 'shadow_nightblade',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.8, sequence: [{ ability: 'assault_rampage', weaveAfter: false }, { ability: 'leap_strike', weaveAfter: true }, { ability: 'blade_storm', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 1.5, allowedAbilities: ['slash'], purpose: 'Lightning-fast repositioning' },
      sustainPhase: { useAbilities: ['slash'], exitCondition: 'burst_ready', purpose: 'Relentless slash pressure' }
    }
  },

  shadow_shroud_healer: {
    id: 'shadow_shroud_healer',
    name: 'Eclipse Shadowmend',
    fighterImage: 'placeholder_shadow_shroud_healer.png',
    description: 'Dark healer who mends wounds from the shadows using forbidden arts',
    class: 'mage',
    role: 'healer',
    faction: 'shadow_guild',
    unlockLevel: 12,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 2 } },
      chest: { armorType: 'Light', buffs: { int: 3, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 2 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    abilities: ['heal_burst', 'arcane_shadow_veil', 'ward_barrier', 'resto_vampiric_aura', 'arc_bolt'],
    combo: {
      loadoutId: 'shadow_shroud_healer',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.0, sequence: [{ ability: 'arcane_shadow_veil', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Shadow damage filler' },
      sustainPhase: { useAbilities: ['heal_burst', 'arc_bolt'], exitCondition: 'heal_needed', purpose: 'Stealth heal + vampiric sustain' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // ELEMENTAL ORDER FACTION — Masters of the primal elements
  // ═════════════════════════════════════════════════════════════════════════════

  fire_elementalist: {
    id: 'fire_elementalist',
    name: 'Ignis the Infernal',
    fighterImage: 'placeholder_fire_elementalist.png',
    description: 'Living flame who incinerates enemies with devastating fire magic',
    class: 'mage',
    role: 'dps',
    faction: 'elemental_order',
    unlockLevel: 5,
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 8, manaRegen: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { atk: 2 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.05 } }
    },
    abilities: ['meteor_slam', 'arc_bolt', 'piercing_lance', 'arcane_power_surge', 'gravity_well'],
    combo: {
      loadoutId: 'fire_elementalist',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.5, sequence: [{ ability: 'arcane_power_surge', weaveAfter: false }, { ability: 'meteor_slam', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.5, allowedAbilities: ['arc_bolt'], purpose: 'Rain fire from distance' },
      sustainPhase: { useAbilities: ['arc_bolt', 'piercing_lance'], exitCondition: 'burst_ready', purpose: 'Continuous fire barrage' }
    }
  },

  storm_caller: {
    id: 'storm_caller',
    name: 'Tempest Stormborn',
    fighterImage: 'placeholder_storm_caller.png',
    description: 'Hurricane mage who chains lightning through entire enemy formations',
    class: 'mage',
    role: 'dps',
    faction: 'elemental_order',
    unlockLevel: 10,
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 7, manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 2 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 2 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.04 } }
    },
    abilities: ['chain_light', 'arc_bolt', 'gravity_well', 'mage_time_warp', 'assault_battle_cry'],
    combo: {
      loadoutId: 'storm_caller',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'mage_time_warp', weaveAfter: false }, { ability: 'chain_light', weaveAfter: true }, { ability: 'gravity_well', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.5, allowedAbilities: ['arc_bolt'], purpose: 'Arc bolts between storms' },
      sustainPhase: { useAbilities: ['arc_bolt', 'chain_light'], exitCondition: 'burst_ready', purpose: 'Unending lightning chains' }
    }
  },

  void_mage: {
    id: 'void_mage',
    name: 'Void the Nihilist',
    fighterImage: 'placeholder_void_mage.png',
    description: 'Void sorcerer who tears reality apart with gravity and dark energy',
    class: 'mage',
    role: 'dps',
    faction: 'elemental_order',
    unlockLevel: 20,
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 9, manaRegen: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 4 } },
      chest: { armorType: 'Light', buffs: { int: 5, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { atk: 3 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 2 } },
      legs: { armorType: 'Light', buffs: { int: 3 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 35 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.06 } }
    },
    abilities: ['gravity_well', 'meteor_slam', 'chain_light', 'arcane_concentration', 'mage_arcane_missiles'],
    combo: {
      loadoutId: 'void_mage',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.5, sequence: [{ ability: 'arcane_concentration', weaveAfter: false }, { ability: 'gravity_well', weaveAfter: true }, { ability: 'meteor_slam', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['mage_arcane_missiles'], purpose: 'Arcane missiles while wells collapse' },
      sustainPhase: { useAbilities: ['chain_light', 'mage_arcane_missiles'], exitCondition: 'burst_ready', purpose: 'Void energy sustained bombardment' }
    }
  },

  frost_warden: {
    id: 'frost_warden',
    name: 'Glacius Frostbound',
    fighterImage: 'placeholder_frost_warden.png',
    description: 'Ice warden who freezes enemies solid while shielding allies in glacial armor',
    class: 'warden',
    role: 'tank',
    faction: 'elemental_order',
    unlockLevel: 15,
    weapon: { weaponType: 'Great Sword', buffs: { atk: 5, def: 6 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5, int: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 7, hp: 35 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 25 } },
      legs: { armorType: 'Heavy', buffs: { def: 5 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 25 } }
    },
    abilities: ['tank_anchor', 'tank_iron_skin', 'slash', 'tank_ground_slam', 'support_iron_resolve'],
    combo: {
      loadoutId: 'frost_warden',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.8, sequence: [{ ability: 'support_iron_resolve', weaveAfter: false }, { ability: 'tank_anchor', weaveAfter: false }], targeting: 'aoe' },
      kitePhase: { duration: 2.5, allowedAbilities: ['slash'], purpose: 'Glacial stance — immovable' },
      sustainPhase: { useAbilities: ['slash', 'tank_iron_skin'], exitCondition: 'burst_ready', purpose: 'Freeze and fortify cycle' }
    }
  },

  elemental_sage_healer: {
    id: 'elemental_sage_healer',
    name: 'Prism the Elementalist',
    fighterImage: 'placeholder_elemental_sage_healer.png',
    description: 'Elemental sage who channels primal energy to mend wounds and restore mana',
    class: 'mage',
    role: 'healer',
    faction: 'elemental_order',
    unlockLevel: 8,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 5 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 2 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    abilities: ['heal_burst', 'resto_mana_flow', 'renewal_field', 'ward_barrier', 'arc_bolt'],
    combo: {
      loadoutId: 'elemental_sage_healer',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.0, sequence: [{ ability: 'resto_mana_flow', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Elemental filler damage' },
      sustainPhase: { useAbilities: ['heal_burst', 'arc_bolt'], exitCondition: 'heal_needed', purpose: 'Mana restoration + reactive healing' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // IRON LEGION FACTION — Berserkers, gladiators, and warlords
  // ═════════════════════════════════════════════════════════════════════════════

  iron_berserker: {
    id: 'iron_berserker',
    name: 'Bjorn Ironjaw',
    fighterImage: 'placeholder_iron_berserker.png',
    description: 'Unstoppable berserker who grows stronger with every hit taken',
    class: 'warrior',
    role: 'dps',
    faction: 'iron_legion',
    unlockLevel: 5,
    weapon: { weaponType: 'Axe', buffs: { atk: 11 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { str: 3 } },
      chest: { armorType: 'Heavy', buffs: { def: 4, hp: 25 } },
      shoulders: { armorType: 'Heavy', buffs: { str: 2 } },
      hands: { armorType: 'Medium', buffs: { atk: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 15 } },
      legs: { armorType: 'Heavy', buffs: { def: 3 } },
      feet: { armorType: 'Medium', buffs: { str: 1 } },
      neck: { armorType: 'Accessory', buffs: { hp: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.04 } }
    },
    abilities: ['warrior_berserk', 'warrior_cleave', 'cleave', 'slash', 'assault_rampage'],
    combo: {
      loadoutId: 'iron_berserker',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.2, sequence: [{ ability: 'warrior_berserk', weaveAfter: false }, { ability: 'assault_rampage', weaveAfter: false }, { ability: 'warrior_cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Rage recovery' },
      sustainPhase: { useAbilities: ['slash', 'cleave'], exitCondition: 'burst_ready', purpose: 'Relentless berserker pressure' }
    }
  },

  iron_gladiator: {
    id: 'iron_gladiator',
    name: 'Rex Gladius',
    fighterImage: 'placeholder_iron_gladiator.png',
    description: 'Arena champion who fights with calculated precision and crowd-pleasing combos',
    class: 'warrior',
    role: 'dps',
    faction: 'iron_legion',
    unlockLevel: 10,
    weapon: { weaponType: 'Sword', buffs: { atk: 8, def: 2 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { str: 2, def: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 3, hp: 20, atk: 1 } },
      shoulders: { armorType: 'Medium', buffs: { str: 1 } },
      hands: { armorType: 'Medium', buffs: { atk: 2 } },
      belt: { armorType: 'Medium', buffs: { hp: 10 } },
      legs: { armorType: 'Heavy', buffs: { def: 2, str: 1 } },
      feet: { armorType: 'Medium', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.05 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 15 } }
    },
    abilities: ['slash', 'cleave', 'shoulder_charge', 'assault_battle_cry', 'warrior_life_leech'],
    combo: {
      loadoutId: 'iron_gladiator',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'assault_battle_cry', weaveAfter: false }, { ability: 'shoulder_charge', weaveAfter: true }, { ability: 'cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Arena repositioning' },
      sustainPhase: { useAbilities: ['slash', 'warrior_life_leech'], exitCondition: 'burst_ready', purpose: 'Calculated strikes with self-sustain' }
    }
  },

  iron_warlord: {
    id: 'iron_warlord',
    name: 'Zara Warbringer',
    fighterImage: 'placeholder_iron_warlord.png',
    description: 'Battle-hardened warlord who commands through devastating warcries and AoE destruction',
    class: 'warrior',
    role: 'dps',
    faction: 'iron_legion',
    unlockLevel: 15,
    weapon: { weaponType: 'Great Sword', buffs: { atk: 10 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { str: 3 } },
      chest: { armorType: 'Heavy', buffs: { def: 4, hp: 20, str: 1 } },
      shoulders: { armorType: 'Heavy', buffs: { str: 2 } },
      hands: { armorType: 'Heavy', buffs: { atk: 2 } },
      belt: { armorType: 'Heavy', buffs: { hp: 15 } },
      legs: { armorType: 'Heavy', buffs: { def: 3 } },
      feet: { armorType: 'Heavy', buffs: { str: 1 } },
      neck: { armorType: 'Accessory', buffs: { hp: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.04 } }
    },
    abilities: ['warcry', 'warrior_cleave', 'cleave', 'slash', 'assault_bloodlust'],
    combo: {
      loadoutId: 'iron_warlord',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'warcry', weaveAfter: false }, { ability: 'assault_bloodlust', weaveAfter: false }, { ability: 'warrior_cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.5, allowedAbilities: ['slash'], purpose: 'Rally troops' },
      sustainPhase: { useAbilities: ['slash', 'cleave'], exitCondition: 'burst_ready', purpose: 'Warlord sustained offense' }
    }
  },

  iron_bulwark: {
    id: 'iron_bulwark',
    name: 'Anvil the Immovable',
    fighterImage: 'placeholder_iron_bulwark.png',
    description: 'Living fortress who shrugs off damage and protects the entire legion',
    class: 'knight',
    role: 'tank',
    faction: 'iron_legion',
    unlockLevel: 8,
    weapon: { weaponType: 'Sword', buffs: { atk: 4, def: 6 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 6 } },
      chest: { armorType: 'Heavy', buffs: { def: 8, hp: 40 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 5 } },
      hands: { armorType: 'Heavy', buffs: { def: 4 } },
      belt: { armorType: 'Heavy', buffs: { hp: 30 } },
      legs: { armorType: 'Heavy', buffs: { def: 6 } },
      feet: { armorType: 'Heavy', buffs: { def: 4 } },
      neck: { armorType: 'Accessory', buffs: { hp: 35 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 5 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 30 } }
    },
    abilities: ['knight_shield_wall', 'knight_taunt', 'slash', 'support_fortify', 'tank_iron_skin'],
    combo: {
      loadoutId: 'iron_bulwark',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'support_fortify', weaveAfter: false }, { ability: 'knight_shield_wall', weaveAfter: false }], targeting: 'focus' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Hold the line' },
      sustainPhase: { useAbilities: ['slash', 'knight_taunt'], exitCondition: 'burst_ready', purpose: 'Iron wall defense rotation' }
    }
  },

  iron_warpriest: {
    id: 'iron_warpriest',
    name: 'Ferrum Steelheart',
    fighterImage: 'placeholder_iron_warpriest.png',
    description: 'Armored healer who fights on the frontline, mending wounds between hammer swings',
    class: 'mage',
    role: 'healer',
    faction: 'iron_legion',
    unlockLevel: 12,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 3 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { int: 1, def: 2 } },
      chest: { armorType: 'Heavy', buffs: { int: 2, def: 3, hp: 20 } },
      shoulders: { armorType: 'Medium', buffs: { int: 1, def: 1 } },
      hands: { armorType: 'Medium', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Heavy', buffs: { hp: 15 } },
      legs: { armorType: 'Heavy', buffs: { def: 2, int: 1 } },
      feet: { armorType: 'Medium', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { def: 2 } }
    },
    abilities: ['heal_burst', 'resto_vitality', 'ward_barrier', 'arc_bolt', 'support_enduring_spirit'],
    combo: {
      loadoutId: 'iron_warpriest',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.0, sequence: [{ ability: 'resto_vitality', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Frontline damage' },
      sustainPhase: { useAbilities: ['heal_burst', 'arc_bolt'], exitCondition: 'heal_needed', purpose: 'Battle-hardened healing with vitality buffs' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // NATURE'S KEEPERS FACTION — Druids, beast masters, and forest guardians
  // ═════════════════════════════════════════════════════════════════════════════

  nature_guardian: {
    id: 'nature_guardian',
    name: 'Oakhart the Ancient',
    fighterImage: 'placeholder_nature_guardian.png',
    description: 'Ancient treant guardian with deep roots and impenetrable bark armor',
    class: 'warden',
    role: 'tank',
    faction: 'natures_keepers',
    unlockLevel: 5,
    weapon: { weaponType: 'Great Sword', buffs: { atk: 5, def: 6 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5 } },
      chest: { armorType: 'Heavy', buffs: { def: 7, hp: 40 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 30 } },
      legs: { armorType: 'Heavy', buffs: { def: 5 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 5 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 25 } }
    },
    abilities: ['tank_anchor', 'tank_iron_skin', 'slash', 'support_defensive_stance', 'tank_seismic_wave'],
    combo: {
      loadoutId: 'nature_guardian',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.8, sequence: [{ ability: 'support_defensive_stance', weaveAfter: false }, { ability: 'tank_anchor', weaveAfter: false }], targeting: 'aoe' },
      kitePhase: { duration: 2.5, allowedAbilities: ['slash'], purpose: 'Rooted defense — never retreat' },
      sustainPhase: { useAbilities: ['slash', 'tank_iron_skin'], exitCondition: 'burst_ready', purpose: 'Living wall of bark and root' }
    }
  },

  beast_warden: {
    id: 'beast_warden',
    name: 'Fenris Wolfclaw',
    fighterImage: 'placeholder_beast_warden.png',
    description: 'Feral beast warden who channels wolf spirits to protect and attack',
    class: 'warrior',
    role: 'dps',
    faction: 'natures_keepers',
    unlockLevel: 8,
    weapon: { weaponType: 'Axe', buffs: { atk: 9, agi: 2 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { agi: 2, str: 1 } },
      chest: { armorType: 'Medium', buffs: { agi: 3, def: 2 } },
      shoulders: { armorType: 'Medium', buffs: { agi: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 2, agi: 1 } },
      belt: { armorType: 'Medium', buffs: { hp: 10 } },
      legs: { armorType: 'Medium', buffs: { agi: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 3 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.06 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { agi: 2 } }
    },
    abilities: ['slash', 'leap_strike', 'warrior_cleave', 'assault_rapid_strikes', 'warcry'],
    combo: {
      loadoutId: 'beast_warden',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'assault_rapid_strikes', weaveAfter: false }, { ability: 'leap_strike', weaveAfter: true }, { ability: 'warrior_cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Circle like a wolf' },
      sustainPhase: { useAbilities: ['slash'], exitCondition: 'burst_ready', purpose: 'Feral slash frenzy' }
    }
  },

  thorn_sentinel: {
    id: 'thorn_sentinel',
    name: 'Briar Thornshield',
    fighterImage: 'placeholder_thorn_sentinel.png',
    description: 'Living bramble fortress that punishes melee attackers with thorny retaliation',
    class: 'warden',
    role: 'tank',
    faction: 'natures_keepers',
    unlockLevel: 12,
    weapon: { weaponType: 'Great Sword', buffs: { atk: 5, def: 5 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5 } },
      chest: { armorType: 'Heavy', buffs: { def: 6, hp: 35 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 25 } },
      legs: { armorType: 'Heavy', buffs: { def: 5 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 20 } }
    },
    abilities: ['tank_iron_skin', 'tank_bodyguard', 'slash', 'tank_ground_slam', 'support_fortify'],
    combo: {
      loadoutId: 'thorn_sentinel',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.8, sequence: [{ ability: 'support_fortify', weaveAfter: false }, { ability: 'tank_bodyguard', weaveAfter: false }], targeting: 'aoe' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Thorn retaliation aura' },
      sustainPhase: { useAbilities: ['slash', 'tank_iron_skin'], exitCondition: 'burst_ready', purpose: 'Thorny defense with bodyguard' }
    }
  },

  grove_tender: {
    id: 'grove_tender',
    name: 'Gaia Lifetender',
    fighterImage: 'placeholder_grove_tender.png',
    description: 'Ancient grove healer who channels the heartbeat of the forest to restore all life',
    class: 'mage',
    role: 'healer',
    faction: 'natures_keepers',
    unlockLevel: 10,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 5 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 2 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    abilities: ['heal_burst', 'renewal_field', 'resto_rejuvenation', 'resto_vitality', 'arc_bolt'],
    combo: {
      loadoutId: 'grove_tender',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'resto_rejuvenation', weaveAfter: false }, { ability: 'renewal_field', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Nature damage filler' },
      sustainPhase: { useAbilities: ['heal_burst'], exitCondition: 'heal_needed', purpose: 'HoT stacking + burst healing' }
    }
  },

  spirit_walker: {
    id: 'spirit_walker',
    name: 'Totem Spiritwalker',
    fighterImage: 'placeholder_spirit_walker.png',
    description: 'Spiritual shaman who bridges the living and spirit worlds to channel ancient healing',
    class: 'mage',
    role: 'healer',
    faction: 'natures_keepers',
    unlockLevel: 18,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { int: 2, def: 1 } },
      chest: { armorType: 'Medium', buffs: { int: 3, def: 2, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Medium', buffs: { int: 1, hp: 10 } },
      legs: { armorType: 'Medium', buffs: { int: 1, def: 1 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    abilities: ['heal_burst', 'beacon_of_light', 'resto_spiritual_attunement', 'ward_barrier', 'mage_sacred_ground'],
    combo: {
      loadoutId: 'spirit_walker',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'resto_spiritual_attunement', weaveAfter: false }, { ability: 'beacon_of_light', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Spirit bolts' },
      sustainPhase: { useAbilities: ['heal_burst'], exitCondition: 'heal_needed', purpose: 'Beacon placement + burst healing' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // HOLY ORDER FACTION — Paladins, divine champions, and holy avengers
  // ═════════════════════════════════════════════════════════════════════════════

  divine_champion: {
    id: 'divine_champion',
    name: 'Aurelius the Radiant',
    fighterImage: 'placeholder_divine_champion.png',
    description: 'Radiant champion encased in divine light, impervious to darkness',
    class: 'knight',
    role: 'tank',
    faction: 'holy_order',
    unlockLevel: 10,
    weapon: { weaponType: 'Sword', buffs: { atk: 5, def: 5 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5, int: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 7, hp: 35 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 25 } },
      legs: { armorType: 'Heavy', buffs: { def: 5 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { mana: 15 } }
    },
    abilities: ['knight_taunt', 'knight_shield_wall', 'slash', 'support_divine_protection', 'knight_rally'],
    combo: {
      loadoutId: 'divine_champion',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'support_divine_protection', weaveAfter: false }, { ability: 'knight_taunt', weaveAfter: false }], targeting: 'focus' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Divine judgment strikes' },
      sustainPhase: { useAbilities: ['slash', 'knight_shield_wall'], exitCondition: 'burst_ready', purpose: 'Holy defense rotation' }
    }
  },

  holy_avenger: {
    id: 'holy_avenger',
    name: 'Solaris Sunward',
    fighterImage: 'placeholder_holy_avenger.png',
    description: 'Sun-blessed avenger who smites enemies with righteous fury while shielding allies',
    class: 'knight',
    role: 'dps',
    faction: 'holy_order',
    unlockLevel: 15,
    weapon: { weaponType: 'Sword', buffs: { atk: 8, def: 2 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { str: 2, int: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 4, hp: 20, atk: 1 } },
      shoulders: { armorType: 'Heavy', buffs: { str: 1 } },
      hands: { armorType: 'Medium', buffs: { atk: 2 } },
      belt: { armorType: 'Heavy', buffs: { hp: 15 } },
      legs: { armorType: 'Heavy', buffs: { def: 3 } },
      feet: { armorType: 'Medium', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.05 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 15 } }
    },
    abilities: ['knight_justice_strike', 'slash', 'cleave', 'knight_banner', 'assault_battle_cry'],
    combo: {
      loadoutId: 'holy_avenger',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'assault_battle_cry', weaveAfter: false }, { ability: 'knight_justice_strike', weaveAfter: true }, { ability: 'cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Sunlight judgment' },
      sustainPhase: { useAbilities: ['slash', 'knight_justice_strike'], exitCondition: 'burst_ready', purpose: 'Righteous fury rotation' }
    }
  },

  faith_guardian: {
    id: 'faith_guardian',
    name: 'Mira Faithkeeper',
    fighterImage: 'placeholder_faith_guardian.png',
    description: 'Devout temple guardian who weaves barriers of pure faith around her allies',
    class: 'knight',
    role: 'tank',
    faction: 'holy_order',
    unlockLevel: 20,
    weapon: { weaponType: 'Sword', buffs: { atk: 4, def: 6 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 6 } },
      chest: { armorType: 'Heavy', buffs: { def: 8, hp: 40 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 5 } },
      hands: { armorType: 'Heavy', buffs: { def: 4 } },
      belt: { armorType: 'Heavy', buffs: { hp: 30 } },
      legs: { armorType: 'Heavy', buffs: { def: 6 } },
      feet: { armorType: 'Heavy', buffs: { def: 4 } },
      neck: { armorType: 'Accessory', buffs: { hp: 35 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 5 } },
      accessory2: { armorType: 'Accessory', buffs: { mana: 15 } }
    },
    abilities: ['knight_shield_wall', 'knight_banner', 'slash', 'tank_bodyguard', 'support_divine_protection'],
    combo: {
      loadoutId: 'faith_guardian',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.8, sequence: [{ ability: 'knight_shield_wall', weaveAfter: false }, { ability: 'tank_bodyguard', weaveAfter: false }], targeting: 'focus' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Barrier of faith' },
      sustainPhase: { useAbilities: ['slash', 'knight_banner'], exitCondition: 'burst_ready', purpose: 'Layered protection cycle' }
    }
  },

  dawn_priest: {
    id: 'dawn_priest',
    name: 'Aurora Dawnlight',
    fighterImage: 'placeholder_dawn_priest.png',
    description: 'Dawn priestess who channels first light to heal and empower allies',
    class: 'mage',
    role: 'healer',
    faction: 'holy_order',
    unlockLevel: 8,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 5 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    abilities: ['heal_burst', 'mage_radiant_aura', 'beacon_of_light', 'mage_divine_touch', 'arc_bolt'],
    combo: {
      loadoutId: 'dawn_priest',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'mage_radiant_aura', weaveAfter: false }, { ability: 'beacon_of_light', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Dawn light damage' },
      sustainPhase: { useAbilities: ['heal_burst', 'mage_divine_touch'], exitCondition: 'heal_needed', purpose: 'Radiant aura + beacon + burst healing' }
    }
  },

  holy_inquisitor: {
    id: 'holy_inquisitor',
    name: 'Justicar Valorheim',
    fighterImage: 'placeholder_holy_inquisitor.png',
    description: 'Holy inquisitor who purges corruption with sacred fire and righteous cleaves',
    class: 'warrior',
    role: 'dps',
    faction: 'holy_order',
    unlockLevel: 25,
    weapon: { weaponType: 'Great Sword', buffs: { atk: 9, def: 1 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { str: 2, int: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 4, hp: 25, atk: 1 } },
      shoulders: { armorType: 'Heavy', buffs: { str: 2 } },
      hands: { armorType: 'Medium', buffs: { atk: 2 } },
      belt: { armorType: 'Heavy', buffs: { hp: 15 } },
      legs: { armorType: 'Heavy', buffs: { def: 3 } },
      feet: { armorType: 'Medium', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.06 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 15 } }
    },
    abilities: ['warrior_cleave', 'cleave', 'slash', 'warrior_fortitude', 'assault_fortune'],
    combo: {
      loadoutId: 'holy_inquisitor',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'assault_fortune', weaveAfter: false }, { ability: 'warrior_cleave', weaveAfter: true }, { ability: 'cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Judgment positioning' },
      sustainPhase: { useAbilities: ['slash', 'cleave'], exitCondition: 'burst_ready', purpose: 'Holy inquisition cleave rotation' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // ARCANE ACADEMY FACTION — Scholars, chronomancers, and enchantresses
  // ═════════════════════════════════════════════════════════════════════════════

  chrono_mage: {
    id: 'chrono_mage',
    name: 'Chronos Timekeeper',
    fighterImage: 'placeholder_chrono_mage.png',
    description: 'Time manipulator who bends the flow of combat, resetting cooldowns for devastating combos',
    class: 'mage',
    role: 'dps',
    faction: 'arcane_academy',
    unlockLevel: 15,
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 7, manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 2 } },
      legs: { armorType: 'Light', buffs: { int: 3 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.05 } }
    },
    abilities: ['mage_time_warp', 'mage_arcane_missiles', 'chain_light', 'arc_bolt', 'arcane_concentration'],
    combo: {
      loadoutId: 'chrono_mage',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.5, sequence: [{ ability: 'mage_time_warp', weaveAfter: false }, { ability: 'mage_arcane_missiles', weaveAfter: true }, { ability: 'chain_light', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['arc_bolt'], purpose: 'Time dilation recovery' },
      sustainPhase: { useAbilities: ['arc_bolt', 'mage_arcane_missiles'], exitCondition: 'burst_ready', purpose: 'CDR-powered rapid rotation' }
    }
  },

  arcane_scholar: {
    id: 'arcane_scholar',
    name: 'Sylva Runeweaver',
    fighterImage: 'placeholder_arcane_scholar.png',
    description: 'Brilliant runeweaver who inscribes arcane power into devastating spell combinations',
    class: 'mage',
    role: 'dps',
    faction: 'arcane_academy',
    unlockLevel: 10,
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 7, manaRegen: 3 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { atk: 2 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.05 } }
    },
    abilities: ['arcane_power_surge', 'mage_arcane_missiles', 'piercing_lance', 'arc_bolt', 'chain_light'],
    combo: {
      loadoutId: 'arcane_scholar',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'arcane_power_surge', weaveAfter: false }, { ability: 'mage_arcane_missiles', weaveAfter: true }, { ability: 'piercing_lance', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['arc_bolt'], purpose: 'Arcane study distance' },
      sustainPhase: { useAbilities: ['arc_bolt', 'chain_light'], exitCondition: 'burst_ready', purpose: 'Runic spell rotation' }
    }
  },

  enchantress: {
    id: 'enchantress',
    name: 'Elara Spellsinger',
    fighterImage: 'placeholder_enchantress.png',
    description: 'Musical enchantress who weaves healing songs and protective melodies',
    class: 'mage',
    role: 'healer',
    faction: 'arcane_academy',
    unlockLevel: 12,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 5 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 2 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 3 } }
    },
    abilities: ['heal_burst', 'arcane_mental_clarity', 'renewal_field', 'ward_barrier', 'mage_radiant_aura'],
    combo: {
      loadoutId: 'enchantress',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'mage_radiant_aura', weaveAfter: false }, { ability: 'arcane_mental_clarity', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Songbird damage' },
      sustainPhase: { useAbilities: ['heal_burst'], exitCondition: 'heal_needed', purpose: 'Melody of healing with CC immunity' }
    }
  },

  spell_knight: {
    id: 'spell_knight',
    name: 'Riven Spellsword',
    fighterImage: 'placeholder_spell_knight.png',
    description: 'Magical knight who infuses blade strikes with raw arcane energy',
    class: 'knight',
    role: 'dps',
    faction: 'arcane_academy',
    unlockLevel: 18,
    weapon: { weaponType: 'Sword', buffs: { atk: 7, def: 2, manaRegen: 1 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { int: 2, def: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 3, hp: 20, int: 1 } },
      shoulders: { armorType: 'Medium', buffs: { int: 1, def: 1 } },
      hands: { armorType: 'Medium', buffs: { atk: 2, int: 1 } },
      belt: { armorType: 'Medium', buffs: { hp: 10, manaRegen: 1 } },
      legs: { armorType: 'Heavy', buffs: { def: 2, int: 1 } },
      feet: { armorType: 'Medium', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 20 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.05 } }
    },
    abilities: ['knight_justice_strike', 'slash', 'arcane_power_surge', 'chain_light', 'cleave'],
    combo: {
      loadoutId: 'spell_knight',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'arcane_power_surge', weaveAfter: false }, { ability: 'knight_justice_strike', weaveAfter: true }, { ability: 'chain_light', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Arcane blade charging' },
      sustainPhase: { useAbilities: ['slash', 'cleave'], exitCondition: 'burst_ready', purpose: 'Spell-infused melee rotation' }
    }
  },

  ward_master: {
    id: 'ward_master',
    name: 'Bastion Wardkeeper',
    fighterImage: 'placeholder_ward_master.png',
    description: 'Master of protective wards who layers impenetrable magical barriers',
    class: 'knight',
    role: 'tank',
    faction: 'arcane_academy',
    unlockLevel: 22,
    weapon: { weaponType: 'Sword', buffs: { atk: 4, def: 5, manaRegen: 1 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5, int: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 7, hp: 35, manaRegen: 1 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 25, manaRegen: 1 } },
      legs: { armorType: 'Heavy', buffs: { def: 5 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 30, mana: 15 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 25 } }
    },
    abilities: ['knight_shield_wall', 'knight_taunt', 'slash', 'support_fortify', 'support_defensive_stance'],
    combo: {
      loadoutId: 'ward_master',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.8, sequence: [{ ability: 'support_fortify', weaveAfter: false }, { ability: 'knight_shield_wall', weaveAfter: false }], targeting: 'focus' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Ward maintenance' },
      sustainPhase: { useAbilities: ['slash', 'knight_taunt'], exitCondition: 'burst_ready', purpose: 'Triple-layered ward rotation' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // BLOOD COVENANT FACTION — Dark healers, vampiric priests, and life-stealers
  // ═════════════════════════════════════════════════════════════════════════════

  blood_priest: {
    id: 'blood_priest',
    name: 'Crimson the Bloodpriest',
    fighterImage: 'placeholder_blood_priest.png',
    description: 'Dark priest who heals allies by draining the life force from enemies',
    class: 'mage',
    role: 'healer',
    faction: 'blood_covenant',
    unlockLevel: 10,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 3, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 2 } }
    },
    abilities: ['heal_burst', 'resto_vampiric_aura', 'ward_barrier', 'arc_bolt', 'cleanse_wave'],
    combo: {
      loadoutId: 'blood_priest',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.0, sequence: [{ ability: 'resto_vampiric_aura', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Dark bolt damage for lifesteal' },
      sustainPhase: { useAbilities: ['heal_burst', 'arc_bolt'], exitCondition: 'heal_needed', purpose: 'Vampiric healing through damage' }
    }
  },

  necro_mender: {
    id: 'necro_mender',
    name: 'Mortis Soulbinder',
    fighterImage: 'placeholder_necro_mender.png',
    description: 'Necromantic healer who binds souls to the living, refusing to let allies fall',
    class: 'mage',
    role: 'healer',
    faction: 'blood_covenant',
    unlockLevel: 15,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 5 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 3 } },
      chest: { armorType: 'Light', buffs: { int: 4, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 2 } },
      belt: { armorType: 'Light', buffs: { int: 1 } },
      legs: { armorType: 'Light', buffs: { int: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 3 } }
    },
    abilities: ['heal_burst', 'mage_divine_touch', 'ward_barrier', 'resto_rejuvenation', 'resto_vitality'],
    combo: {
      loadoutId: 'necro_mender',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'resto_vitality', weaveAfter: false }, { ability: 'ward_barrier', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Soul energy filler' },
      sustainPhase: { useAbilities: ['heal_burst', 'mage_divine_touch'], exitCondition: 'heal_needed', purpose: 'Soul binding + emergency heals' }
    }
  },

  dark_oracle: {
    id: 'dark_oracle',
    name: 'Vesper Darkhollow',
    fighterImage: 'placeholder_dark_oracle.png',
    description: 'Forbidden oracle who reads the threads of fate to prevent death before it strikes',
    class: 'mage',
    role: 'healer',
    faction: 'blood_covenant',
    unlockLevel: 25,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 6 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 4 } },
      chest: { armorType: 'Light', buffs: { int: 5, manaRegen: 3 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 2 } },
      belt: { armorType: 'Light', buffs: { int: 2 } },
      legs: { armorType: 'Light', buffs: { int: 3 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 35 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 3 } }
    },
    abilities: ['ward_barrier', 'heal_burst', 'mage_radiant_aura', 'beacon_of_light', 'support_divine_protection'],
    combo: {
      loadoutId: 'dark_oracle',
      coordinationMode: 'reactive',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'ward_barrier', weaveAfter: false }, { ability: 'mage_radiant_aura', weaveAfter: false }, { ability: 'beacon_of_light', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Fate-reading filler' },
      sustainPhase: { useAbilities: ['heal_burst'], exitCondition: 'heal_needed', purpose: 'Triple prevention layer → emergency healing' }
    }
  },

  blood_knight: {
    id: 'blood_knight',
    name: 'Vane Bloodsworn',
    fighterImage: 'placeholder_blood_knight.png',
    description: 'Vampiric knight who sustains through enemy blood, nearly unkillable in melee',
    class: 'knight',
    role: 'tank',
    faction: 'blood_covenant',
    unlockLevel: 18,
    weapon: { weaponType: 'Sword', buffs: { atk: 6, def: 4 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 4, str: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 6, hp: 30 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 3 } },
      hands: { armorType: 'Heavy', buffs: { def: 2, atk: 1 } },
      belt: { armorType: 'Heavy', buffs: { hp: 25 } },
      legs: { armorType: 'Heavy', buffs: { def: 4 } },
      feet: { armorType: 'Heavy', buffs: { def: 2 } },
      neck: { armorType: 'Accessory', buffs: { hp: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 20 } }
    },
    abilities: ['knight_taunt', 'knight_shield_wall', 'slash', 'warrior_life_leech', 'tank_iron_skin'],
    combo: {
      loadoutId: 'blood_knight',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'knight_taunt', weaveAfter: false }, { ability: 'tank_iron_skin', weaveAfter: false }], targeting: 'focus' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash', 'warrior_life_leech'], purpose: 'Blood drain sustain' },
      sustainPhase: { useAbilities: ['slash', 'warrior_life_leech'], exitCondition: 'burst_ready', purpose: 'Vampiric tanking with life leech' }
    }
  },

  blood_reaver: {
    id: 'blood_reaver',
    name: 'Sanguine Reaverblade',
    fighterImage: 'placeholder_blood_reaver.png',
    description: 'Blood-mad reaver who sacrifices defense for overwhelming lifesteal damage',
    class: 'warrior',
    role: 'dps',
    faction: 'blood_covenant',
    unlockLevel: 22,
    weapon: { weaponType: 'Axe', buffs: { atk: 11 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { str: 2 } },
      chest: { armorType: 'Medium', buffs: { str: 3, def: 1, hp: 15 } },
      shoulders: { armorType: 'Light', buffs: { str: 1 } },
      hands: { armorType: 'Light', buffs: { atk: 3 } },
      belt: { armorType: 'Medium', buffs: { hp: 10 } },
      legs: { armorType: 'Medium', buffs: { str: 2 } },
      feet: { armorType: 'Light', buffs: { agi: 2 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.07 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.05 } }
    },
    abilities: ['warrior_life_leech', 'warrior_cleave', 'slash', 'assault_rampage', 'blade_storm'],
    combo: {
      loadoutId: 'blood_reaver',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.2, sequence: [{ ability: 'assault_rampage', weaveAfter: false }, { ability: 'blade_storm', weaveAfter: true }, { ability: 'warrior_cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash', 'warrior_life_leech'], purpose: 'Blood drain recovery' },
      sustainPhase: { useAbilities: ['slash', 'warrior_life_leech'], exitCondition: 'burst_ready', purpose: 'Lifesteal sustain between bursts' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // DAWN SENTINELS FACTION — Elite defenders and phalanx specialists
  // ═════════════════════════════════════════════════════════════════════════════

  bastion_defender: {
    id: 'bastion_defender',
    name: 'Rampart the Bastion',
    fighterImage: 'placeholder_bastion_defender.png',
    description: 'Legendary bastion whose shields never break, absorbing damage for the entire team',
    class: 'knight',
    role: 'tank',
    faction: 'dawn_sentinels',
    unlockLevel: 10,
    weapon: { weaponType: 'Sword', buffs: { atk: 4, def: 6 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 6 } },
      chest: { armorType: 'Heavy', buffs: { def: 9, hp: 45 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 5 } },
      hands: { armorType: 'Heavy', buffs: { def: 4 } },
      belt: { armorType: 'Heavy', buffs: { hp: 35 } },
      legs: { armorType: 'Heavy', buffs: { def: 7 } },
      feet: { armorType: 'Heavy', buffs: { def: 4 } },
      neck: { armorType: 'Accessory', buffs: { hp: 40 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 6 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 35 } }
    },
    abilities: ['knight_shield_wall', 'knight_taunt', 'slash', 'support_fortify', 'tank_bodyguard'],
    combo: {
      loadoutId: 'bastion_defender',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'support_fortify', weaveAfter: false }, { ability: 'knight_shield_wall', weaveAfter: false }], targeting: 'focus' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Bastion stance' },
      sustainPhase: { useAbilities: ['slash', 'knight_taunt'], exitCondition: 'burst_ready', purpose: 'Unbreakable defense cycle' }
    }
  },

  aegis_maiden: {
    id: 'aegis_maiden',
    name: 'Aegis Shieldmaiden',
    fighterImage: 'placeholder_aegis_maiden.png',
    description: 'Shield-bearing warrior maiden who reflects damage back at attackers',
    class: 'knight',
    role: 'tank',
    faction: 'dawn_sentinels',
    unlockLevel: 15,
    weapon: { weaponType: 'Sword', buffs: { atk: 5, def: 5 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 5 } },
      chest: { armorType: 'Heavy', buffs: { def: 7, hp: 35 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 4 } },
      hands: { armorType: 'Heavy', buffs: { def: 3 } },
      belt: { armorType: 'Heavy', buffs: { hp: 30 } },
      legs: { armorType: 'Heavy', buffs: { def: 6 } },
      feet: { armorType: 'Heavy', buffs: { def: 3 } },
      neck: { armorType: 'Accessory', buffs: { hp: 30 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 5 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 25 } }
    },
    abilities: ['knight_shield_wall', 'knight_taunt', 'slash', 'support_iron_resolve', 'knight_rally'],
    combo: {
      loadoutId: 'aegis_maiden',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'support_iron_resolve', weaveAfter: false }, { ability: 'knight_shield_wall', weaveAfter: false }], targeting: 'focus' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Shield reflection stance' },
      sustainPhase: { useAbilities: ['slash', 'knight_taunt'], exitCondition: 'burst_ready', purpose: 'Iron resolve + CC immune rotation' }
    }
  },

  phalanx_captain: {
    id: 'phalanx_captain',
    name: 'Leonus Phalanx',
    fighterImage: 'placeholder_phalanx_captain.png',
    description: 'Disciplined phalanx captain who coordinates defensive formations for maximum coverage',
    class: 'warden',
    role: 'tank',
    faction: 'dawn_sentinels',
    unlockLevel: 20,
    weapon: { weaponType: 'Great Sword', buffs: { atk: 5, def: 6 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 6 } },
      chest: { armorType: 'Heavy', buffs: { def: 8, hp: 40 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 5 } },
      hands: { armorType: 'Heavy', buffs: { def: 4 } },
      belt: { armorType: 'Heavy', buffs: { hp: 30 } },
      legs: { armorType: 'Heavy', buffs: { def: 6 } },
      feet: { armorType: 'Heavy', buffs: { def: 4 } },
      neck: { armorType: 'Accessory', buffs: { hp: 35 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 5 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 30 } }
    },
    abilities: ['tank_anchor', 'tank_bodyguard', 'slash', 'support_defensive_stance', 'tank_seismic_wave'],
    combo: {
      loadoutId: 'phalanx_captain',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'support_defensive_stance', weaveAfter: false }, { ability: 'tank_anchor', weaveAfter: false }, { ability: 'tank_bodyguard', weaveAfter: false }], targeting: 'aoe' },
      kitePhase: { duration: 2.5, allowedAbilities: ['slash'], purpose: 'Formation hold' },
      sustainPhase: { useAbilities: ['slash'], exitCondition: 'burst_ready', purpose: 'Phalanx formation defense' }
    }
  },

  sentinel_medic: {
    id: 'sentinel_medic',
    name: 'Haven the Protector',
    fighterImage: 'placeholder_sentinel_medic.png',
    description: 'Battlefield medic who keeps the sentinel line alive with rapid triage healing',
    class: 'mage',
    role: 'healer',
    faction: 'dawn_sentinels',
    unlockLevel: 12,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Medium', buffs: { int: 2, def: 1 } },
      chest: { armorType: 'Medium', buffs: { int: 3, def: 2, manaRegen: 1 } },
      shoulders: { armorType: 'Light', buffs: { int: 1 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 1 } },
      belt: { armorType: 'Medium', buffs: { int: 1, hp: 10 } },
      legs: { armorType: 'Medium', buffs: { int: 1, def: 1 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 25 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 2 } },
      accessory2: { armorType: 'Accessory', buffs: { def: 2 } }
    },
    abilities: ['heal_burst', 'ward_barrier', 'resto_rejuvenation', 'support_enduring_spirit', 'arc_bolt'],
    combo: {
      loadoutId: 'sentinel_medic',
      coordinationMode: 'reactive',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'support_enduring_spirit', weaveAfter: false }, { ability: 'ward_barrier', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Medic-fire' },
      sustainPhase: { useAbilities: ['heal_burst', 'arc_bolt'], exitCondition: 'heal_needed', purpose: 'Triage healing with endurance buffs' }
    }
  },

  dawn_vanguard: {
    id: 'dawn_vanguard',
    name: 'Valor the Unyielding',
    fighterImage: 'placeholder_dawn_vanguard.png',
    description: 'Unstoppable vanguard who leads every charge, inspiring allies through sheer bravery',
    class: 'warrior',
    role: 'dps',
    faction: 'dawn_sentinels',
    unlockLevel: 18,
    weapon: { weaponType: 'Great Sword', buffs: { atk: 9, def: 1 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { str: 2, def: 1 } },
      chest: { armorType: 'Heavy', buffs: { def: 4, hp: 25, atk: 1 } },
      shoulders: { armorType: 'Heavy', buffs: { str: 2 } },
      hands: { armorType: 'Medium', buffs: { atk: 2 } },
      belt: { armorType: 'Heavy', buffs: { hp: 15 } },
      legs: { armorType: 'Heavy', buffs: { def: 3 } },
      feet: { armorType: 'Medium', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { critChance: 0.05 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 3 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 15 } }
    },
    abilities: ['shoulder_charge', 'warrior_cleave', 'slash', 'warcry', 'assault_battle_cry'],
    combo: {
      loadoutId: 'dawn_vanguard',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'assault_battle_cry', weaveAfter: false }, { ability: 'shoulder_charge', weaveAfter: true }, { ability: 'warrior_cleave', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash'], purpose: 'Rally formation' },
      sustainPhase: { useAbilities: ['slash', 'warcry'], exitCondition: 'burst_ready', purpose: 'Vanguard charge rotation' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // LEGENDARY FIGHTERS — Rare endgame fighters with unique power
  // ═════════════════════════════════════════════════════════════════════════════

  archmage_supreme: {
    id: 'archmage_supreme',
    name: 'Zephyr the Archmage',
    fighterImage: 'placeholder_archmage_supreme.png',
    description: 'Supreme archmage whose mastery over time, space, and arcane energy is unmatched',
    class: 'mage',
    role: 'dps',
    faction: 'legendary',
    unlockLevel: 30,
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 10, manaRegen: 5 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 5 } },
      chest: { armorType: 'Light', buffs: { int: 6, manaRegen: 3 } },
      shoulders: { armorType: 'Light', buffs: { int: 3 } },
      hands: { armorType: 'Light', buffs: { atk: 3, manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 2 } },
      legs: { armorType: 'Light', buffs: { int: 4 } },
      feet: { armorType: 'Light', buffs: { agi: 2 } },
      neck: { armorType: 'Accessory', buffs: { mana: 40 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 5 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.08 } }
    },
    abilities: ['mage_time_warp', 'meteor_slam', 'mage_arcane_missiles', 'gravity_well', 'arcane_concentration'],
    combo: {
      loadoutId: 'archmage_supreme',
      coordinationMode: 'individual',
      burstPhase: { duration: 3.0, sequence: [{ ability: 'mage_time_warp', weaveAfter: false }, { ability: 'arcane_concentration', weaveAfter: false }, { ability: 'gravity_well', weaveAfter: true }, { ability: 'meteor_slam', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.0, allowedAbilities: ['mage_arcane_missiles'], purpose: 'Arcane supremacy filler' },
      sustainPhase: { useAbilities: ['mage_arcane_missiles', 'gravity_well'], exitCondition: 'burst_ready', purpose: 'Time-warped spell barrage' }
    }
  },

  warlord_supreme: {
    id: 'warlord_supreme',
    name: 'Imperator Maximus',
    fighterImage: 'placeholder_warlord_supreme.png',
    description: 'Legendary warlord whose defense is matched only by his ability to command armies',
    class: 'warden',
    role: 'tank',
    faction: 'legendary',
    unlockLevel: 35,
    weapon: { weaponType: 'Great Sword', buffs: { atk: 6, def: 8 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 8 } },
      chest: { armorType: 'Heavy', buffs: { def: 10, hp: 50 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 7 } },
      hands: { armorType: 'Heavy', buffs: { def: 6 } },
      belt: { armorType: 'Heavy', buffs: { hp: 40 } },
      legs: { armorType: 'Heavy', buffs: { def: 8 } },
      feet: { armorType: 'Heavy', buffs: { def: 5 } },
      neck: { armorType: 'Accessory', buffs: { hp: 45 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 7 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 40 } }
    },
    abilities: ['tank_anchor', 'tank_iron_skin', 'slash', 'tank_bodyguard', 'support_divine_protection'],
    combo: {
      loadoutId: 'warlord_supreme',
      coordinationMode: 'individual',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'support_divine_protection', weaveAfter: false }, { ability: 'tank_anchor', weaveAfter: false }, { ability: 'tank_iron_skin', weaveAfter: false }], targeting: 'aoe' },
      kitePhase: { duration: 2.5, allowedAbilities: ['slash'], purpose: 'Impenetrable stance' },
      sustainPhase: { useAbilities: ['slash', 'tank_bodyguard'], exitCondition: 'burst_ready', purpose: 'Supreme defense layering' }
    }
  },

  high_priestess: {
    id: 'high_priestess',
    name: 'Serenity the Chosen',
    fighterImage: 'placeholder_high_priestess.png',
    description: 'Chosen high priestess whose healing power can resurrect hope itself',
    class: 'mage',
    role: 'healer',
    faction: 'legendary',
    unlockLevel: 30,
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 7 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 5 } },
      chest: { armorType: 'Light', buffs: { int: 6, manaRegen: 3 } },
      shoulders: { armorType: 'Light', buffs: { int: 3 } },
      hands: { armorType: 'Light', buffs: { manaRegen: 3 } },
      belt: { armorType: 'Light', buffs: { int: 2 } },
      legs: { armorType: 'Light', buffs: { int: 3 } },
      feet: { armorType: 'Light', buffs: { agi: 1 } },
      neck: { armorType: 'Accessory', buffs: { mana: 40 } },
      accessory1: { armorType: 'Accessory', buffs: { manaRegen: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { int: 4 } }
    },
    abilities: ['heal_burst', 'mage_divine_touch', 'mage_sacred_ground', 'beacon_of_light', 'mage_radiant_aura'],
    combo: {
      loadoutId: 'high_priestess',
      coordinationMode: 'reactive',
      burstPhase: { duration: 2.0, sequence: [{ ability: 'mage_radiant_aura', weaveAfter: false }, { ability: 'beacon_of_light', weaveAfter: false }, { ability: 'mage_sacred_ground', weaveAfter: false }], targeting: 'allies' },
      kitePhase: { duration: 0, allowedAbilities: ['arc_bolt'], purpose: 'Sacred light filler' },
      sustainPhase: { useAbilities: ['heal_burst', 'mage_divine_touch'], exitCondition: 'heal_needed', purpose: 'Triple healing layer supreme rotation' }
    }
  },

  death_knight: {
    id: 'death_knight',
    name: 'Morthos Dreadlord',
    fighterImage: 'placeholder_death_knight.png',
    description: 'Undying death knight who draws power from the fallen, growing stronger as battle rages',
    class: 'knight',
    role: 'tank',
    faction: 'legendary',
    unlockLevel: 35,
    weapon: { weaponType: 'Sword', buffs: { atk: 7, def: 5 } },
    armor: {
      helm: { armorType: 'Heavy', buffs: { def: 6, str: 2 } },
      chest: { armorType: 'Heavy', buffs: { def: 8, hp: 40, atk: 2 } },
      shoulders: { armorType: 'Heavy', buffs: { def: 5 } },
      hands: { armorType: 'Heavy', buffs: { def: 4, atk: 1 } },
      belt: { armorType: 'Heavy', buffs: { hp: 30 } },
      legs: { armorType: 'Heavy', buffs: { def: 6 } },
      feet: { armorType: 'Heavy', buffs: { def: 4 } },
      neck: { armorType: 'Accessory', buffs: { hp: 35 } },
      accessory1: { armorType: 'Accessory', buffs: { def: 5 } },
      accessory2: { armorType: 'Accessory', buffs: { hp: 30 } }
    },
    abilities: ['knight_taunt', 'tank_iron_skin', 'slash', 'warrior_life_leech', 'resto_vampiric_aura'],
    combo: {
      loadoutId: 'death_knight',
      coordinationMode: 'individual',
      burstPhase: { duration: 1.5, sequence: [{ ability: 'resto_vampiric_aura', weaveAfter: false }, { ability: 'knight_taunt', weaveAfter: false }, { ability: 'tank_iron_skin', weaveAfter: false }], targeting: 'focus' },
      kitePhase: { duration: 2.0, allowedAbilities: ['slash', 'warrior_life_leech'], purpose: 'Death drain recovery' },
      sustainPhase: { useAbilities: ['slash', 'warrior_life_leech'], exitCondition: 'burst_ready', purpose: 'Vampiric tank with lifesteal' }
    }
  },

  battle_sage: {
    id: 'battle_sage',
    name: 'Enigma the Absolute',
    fighterImage: 'placeholder_battle_sage.png',
    description: 'Mysterious battle sage who has mastered every discipline, adapting to any situation',
    class: 'mage',
    role: 'dps',
    faction: 'legendary',
    unlockLevel: 40,
    weapon: { weaponType: 'Destruction Staff', buffs: { atk: 9, manaRegen: 4 } },
    armor: {
      helm: { armorType: 'Light', buffs: { int: 4 } },
      chest: { armorType: 'Medium', buffs: { int: 4, def: 2, manaRegen: 2 } },
      shoulders: { armorType: 'Light', buffs: { int: 2 } },
      hands: { armorType: 'Light', buffs: { atk: 2, manaRegen: 1 } },
      belt: { armorType: 'Light', buffs: { manaRegen: 2 } },
      legs: { armorType: 'Medium', buffs: { int: 2, def: 1 } },
      feet: { armorType: 'Light', buffs: { agi: 2 } },
      neck: { armorType: 'Accessory', buffs: { mana: 35 } },
      accessory1: { armorType: 'Accessory', buffs: { atk: 4 } },
      accessory2: { armorType: 'Accessory', buffs: { critChance: 0.07 } }
    },
    abilities: ['mage_time_warp', 'gravity_well', 'chain_light', 'arcane_power_surge', 'meteor_slam'],
    combo: {
      loadoutId: 'battle_sage',
      coordinationMode: 'individual',
      burstPhase: { duration: 3.0, sequence: [{ ability: 'mage_time_warp', weaveAfter: false }, { ability: 'arcane_power_surge', weaveAfter: false }, { ability: 'gravity_well', weaveAfter: true }, { ability: 'chain_light', weaveAfter: true }], targeting: 'normal' },
      kitePhase: { duration: 2.5, allowedAbilities: ['chain_light'], purpose: 'Absolute knowledge' },
      sustainPhase: { useAbilities: ['chain_light', 'gravity_well'], exitCondition: 'burst_ready', purpose: 'Masters every spell rotation' }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // GUARD LOADOUTS - Special formation-based builds for guards only
  // ═════════════════════════════════════════════════════════════════════════════
  
  guard_warrior_dps: {
    id: 'guard_warrior_dps',
    name: 'Guard Fighter',
    description: 'Guard DPS with coordinated AoE burst combo',
    class: 'warrior',
    role: 'dps',
    unlockLevel: 10, // Guards unlock at level 10
    guardOnly: true, // Only usable by guards
    
    weapon: { weaponType: 'Great Sword', buffs: { atk: 10 } },
    
    abilities: ['gravity_well', 'meteor_slam', 'shoulder_charge', 'slash', 'blade_storm'],
    
    combo: {
      loadoutId: 'guard_warrior_dps',
      coordinationMode: 'ball_group', // Guards use ball group tactics
      
      burstPhase: {
        duration: 2.5,
        sequence: [
          { ability: 'gravity_well', weaveAfter: false }, // Pull enemies together
          { ability: 'meteor_slam', weaveAfter: true }, // AoE burst at focus position
          { ability: 'shoulder_charge', weaveAfter: true } // Follow-up charge
        ],
        targeting: 'focus' // All guards target same focus position
      },
      
      kitePhase: {
        duration: 3.0,
        allowedAbilities: ['slash'],
        purpose: 'Regroup and align for next coordinated burst'
      },
      
      sustainPhase: {
        useAbilities: ['slash', 'cleave'],
        exitCondition: 'burst_ready',
        purpose: 'Maintain pressure while waiting for burst window'
      }
    }
  },
  
  guard_mage_healer: {
    id: 'guard_mage_healer',
    name: 'Guard Medic',
    description: 'Guard healer with pre-fight shields and reactive healing',
    class: 'mage',
    role: 'healer',
    unlockLevel: 10,
    guardOnly: true,
    
    weapon: { weaponType: 'Healing Staff', buffs: { manaRegen: 4 } },
    
    abilities: ['ward_barrier', 'mage_radiant_aura', 'heal_burst', 'arc_bolt', 'beacon_of_light'],
    
    combo: {
      loadoutId: 'guard_mage_healer',
      coordinationMode: 'ball_group',
      
      burstPhase: {
        duration: 0, // Reactive healer - no offensive burst
        sequence: [
          { ability: 'ward_barrier', weaveAfter: false }, // Pre-fight shields
          { ability: 'mage_radiant_aura', weaveAfter: false } // AoE shields
        ],
        targeting: 'allies'
      },
      
      kitePhase: {
        duration: 0,
        allowedAbilities: ['arc_bolt'],
        purpose: 'Light damage filler'
      },
      
      sustainPhase: {
        useAbilities: ['heal_burst'], // Reactive heals
        exitCondition: 'heal_needed',
        purpose: 'Heal ball group when HP drops below threshold'
      }
    }
  }
  
};

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get all loadouts available at a specific level
 * @param {number} playerLevel - Current player level
 * @param {boolean} includeGuardLoadouts - Whether to include guard-only loadouts
 * @returns {Array} Array of loadout objects
 */
export function getAvailableLoadouts(playerLevel, includeGuardLoadouts = false) {
  return Object.values(LOADOUT_REGISTRY).filter(loadout => {
    const levelOk = loadout.unlockLevel <= playerLevel;
    const guardOk = includeGuardLoadouts || !loadout.guardOnly;
    return levelOk && guardOk;
  });
}

/**
 * Get loadouts by role
 * @param {string} role - 'dps', 'tank', or 'healer'
 * @param {number} playerLevel - Current player level
 * @returns {Array} Array of loadout objects for that role
 */
export function getLoadoutsByRole(role, playerLevel) {
  return getAvailableLoadouts(playerLevel).filter(l => l.role === role);
}

/**
 * Get a specific loadout by ID
 * @param {string} loadoutId - The loadout ID
 * @returns {Object|null} Loadout object or null if not found
 */
export function getLoadout(loadoutId) {
  return LOADOUT_REGISTRY[loadoutId] || null;
}

/**
 * Apply loadout to a unit (ally or enemy)
 * @param {Object} unit - The unit to apply loadout to
 * @param {string} loadoutId - The loadout ID to apply
 */
export function applyLoadout(unit, loadoutId) {
  const loadout = getLoadout(loadoutId);
  if (!loadout) {
    console.warn(`Loadout ${loadoutId} not found`);
    return;
  }
  
  // Set class
  unit.variant = loadout.class;
  unit.role = loadout.role.toUpperCase();
  
  // Set equipment
  if (!unit.equipment) unit.equipment = {};
  unit.equipment.weapon = structuredClone(loadout.weapon);
  unit.weaponType = loadout.weapon.weaponType;
  
  // Set abilities
  unit.npcAbilities = [...loadout.abilities];
  if (!Array.isArray(unit.npcCd) || unit.npcCd.length !== 5) {
    unit.npcCd = [0, 0, 0, 0, 0];
  }
  
  // Set combo plan
  unit.npcComboPlan = loadout.combo;
  unit.npcComboState = 'sustain';
  unit.npcComboPhaseStartedAt = 0;
  unit.npcLastLightAttackAt = 0;
  
  // Store loadout reference
  unit.loadoutId = loadoutId;
  unit.npcLoadoutLocked = true; // Prevent ability reinit from overwriting
}

/**
 * Get loadout selection UI data for dropdown/grid
 * @param {number} playerLevel - Current player level
 * @param {string} filterRole - Optional role filter ('dps', 'tank', 'healer')
 * @returns {Array} Array of {id, name, description, role, locked} objects
 */
export function getLoadoutUIData(playerLevel, filterRole = null) {
  const allLoadouts = Object.values(LOADOUT_REGISTRY);
  
  return allLoadouts
    .filter(l => !l.guardOnly) // Exclude guard loadouts from ally selection
    .filter(l => !filterRole || l.role === filterRole)
    .map(l => ({
      id: l.id,
      name: l.name,
      description: l.description,
      role: l.role,
      class: l.class,
      unlockLevel: l.unlockLevel,
      locked: l.unlockLevel > playerLevel,
      weapon: l.weapon.weaponType,
      abilities: l.abilities.slice(0, 3) // Show first 3 abilities as preview
    }))
    .sort((a, b) => {
      // Sort by unlock level, then by role
      if (a.unlockLevel !== b.unlockLevel) return a.unlockLevel - b.unlockLevel;
      return a.role.localeCompare(b.role);
    });
}
