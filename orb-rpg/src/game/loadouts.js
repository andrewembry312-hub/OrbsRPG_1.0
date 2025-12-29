// Common rarity definition for loadouts
const COMMON_RARITY = { key:'common', tier: 1, name: 'Common', color: '#c8c8c8' };

export const META_LOADOUTS = {
  DPS: {
    weapon: { kind:'weapon', slot:'weapon', weaponType:'Destruction Staff', rarity:COMMON_RARITY, name:'Common Destruction Staff', buffs:{atk:4, maxMana:12, manaRegen:0.9} },
    abilities: ['arc_bolt','chain_light','piercing_lance','mage_arcane_missiles','cleave']
  },
  HEALER: {
    weapon: { kind:'weapon', slot:'weapon', weaponType:'Healing Staff', rarity:COMMON_RARITY, name:'Common Healing Staff', buffs:{atk:2, maxMana:18, manaRegen:1.4} },
    abilities: ['heal_burst','mage_divine_touch','cleanse_wave','mage_sacred_ground','ward_barrier']
  },
  TANK: {
    weapon: { kind:'weapon', slot:'weapon', weaponType:'Axe', rarity:COMMON_RARITY, name:'Common Axe', buffs:{atk:6, def:4, maxHp:20} },
    abilities: ['knight_taunt','knight_shield_wall','warcry','cleave','tank_anchor']
  }
};
