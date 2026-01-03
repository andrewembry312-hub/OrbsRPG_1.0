// Common rarity definition for loadouts
const COMMON_RARITY = { key:'common', tier: 1, name: 'Common', color: '#c8c8c8' };

export const META_LOADOUTS = {
  // MAGE -> HEALER role
  mage: {
    weapon: { kind:'weapon', slot:'weapon', weaponType:'Healing Staff', rarity:COMMON_RARITY, name:'Common Healing Staff', buffs:{atk:2, maxMana:18, manaRegen:1.4} },
    abilities: ['heal_burst','mage_divine_touch','cleanse_wave','mage_radiant_aura','ward_barrier']
  },
  
  // WARRIOR -> DPS role (randomly uses Destruction Staff OR Melee)
  warrior: {
    weapons: [
      { kind:'weapon', slot:'weapon', weaponType:'Destruction Staff', rarity:COMMON_RARITY, name:'Common Destruction Staff', buffs:{atk:4, maxMana:12, manaRegen:0.9} },
      { kind:'weapon', slot:'weapon', weaponType:'Sword', rarity:COMMON_RARITY, name:'Common Sword', buffs:{atk:6, speed:2} },
      { kind:'weapon', slot:'weapon', weaponType:'Axe', rarity:COMMON_RARITY, name:'Common Axe', buffs:{atk:7, speed:-1} },
      { kind:'weapon', slot:'weapon', weaponType:'Dagger', rarity:COMMON_RARITY, name:'Common Dagger', buffs:{atk:4, speed:5, critChance:0.05} },
      { kind:'weapon', slot:'weapon', weaponType:'Greatsword', rarity:COMMON_RARITY, name:'Common Greatsword', buffs:{atk:9, speed:-3} }
    ],
    abilitiesMagic: ['arc_bolt','piercing_lance','chain_light','warrior_fortitude','mage_radiant_aura'], // 3 attacks + 2 buffs for staff
    abilitiesMelee: ['slash','cleave','warrior_cleave','warrior_fortitude','warrior_life_leech'] // 3 attacks + 2 buffs for melee
  },
  
  // KNIGHT -> TANK role (can use any weapon, preferably sword/axe for thematic fit)
  knight: {
    weapons: [
      { kind:'weapon', slot:'weapon', weaponType:'Sword', rarity:COMMON_RARITY, name:'Common Sword', buffs:{atk:6, def:3, maxHp:15} },
      { kind:'weapon', slot:'weapon', weaponType:'Axe', rarity:COMMON_RARITY, name:'Common Axe', buffs:{atk:7, def:2, maxHp:12} },
      { kind:'weapon', slot:'weapon', weaponType:'Greatsword', rarity:COMMON_RARITY, name:'Common Greatsword', buffs:{atk:8, def:2, maxHp:10} }
    ],
    abilities: ['knight_shield_wall','knight_taunt','knight_rally','warcry','heal_burst'] // All buffs/heals for tank role
  },
  
  // TANK -> TANK role (can use any weapon)
  warden: {
    weapons: [
      { kind:'weapon', slot:'weapon', weaponType:'Axe', rarity:COMMON_RARITY, name:'Common Axe', buffs:{atk:6, def:4, maxHp:20} },
      { kind:'weapon', slot:'weapon', weaponType:'Sword', rarity:COMMON_RARITY, name:'Common Sword', buffs:{atk:5, def:5, maxHp:18} },
      { kind:'weapon', slot:'weapon', weaponType:'Greatsword', rarity:COMMON_RARITY, name:'Common Greatsword', buffs:{atk:8, def:3, maxHp:15} }
    ],
    abilities: ['tank_iron_skin','tank_anchor','tank_bodyguard','ward_barrier','heal_burst'] // All buffs/heals for tank role
  },
  
  // Legacy DPS/HEALER/TANK keys for backward compatibility (player might use these)
  DPS: {
    weapon: { kind:'weapon', slot:'weapon', weaponType:'Destruction Staff', rarity:COMMON_RARITY, name:'Common Destruction Staff', buffs:{atk:4, maxMana:12, manaRegen:0.9} },
    abilities: ['arc_bolt','chain_light','piercing_lance','mage_arcane_missiles','cleave']
  },
  HEALER: {
    weapon: { kind:'weapon', slot:'weapon', weaponType:'Healing Staff', rarity:COMMON_RARITY, name:'Common Healing Staff', buffs:{atk:2, maxMana:18, manaRegen:1.4} },
    abilities: ['heal_burst','mage_divine_touch','cleanse_wave','mage_sacred_ground','ward_barrier']
  },
  WARDEN: {
    weapon: { kind:'weapon', slot:'weapon', weaponType:'Axe', rarity:COMMON_RARITY, name:'Common Axe', buffs:{atk:6, def:4, maxHp:20} },
    abilities: ['knight_taunt','knight_shield_wall','warcry','cleave','tank_anchor']
  }
};

