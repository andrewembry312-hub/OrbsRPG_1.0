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
