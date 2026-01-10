/**
 * Loadout Spawner - Apply fighter loadout data to spawned units
 * Connects the slot system UI to actual in-game units
 */

import { LOADOUTS } from './loadout-registry.js';
import { ABILITIES } from './skills.js';

/**
 * Apply a loadout's equipment, stats, and abilities to a unit
 * @param {Object} unit - The unit to modify (friendly or enemy)
 * @param {string} loadoutId - ID from LOADOUTS registry
 * @param {number} level - Slot level (1+)
 * @param {string} rarity - Override rarity (optional, uses loadout's base rarity if not provided)
 */
export function applyLoadoutToUnit(unit, loadoutId, level = 1, rarity = null) {
  const loadout = LOADOUTS[loadoutId];
  if (!loadout) {
    console.error('[LOADOUT SPAWNER] Invalid loadoutId:', loadoutId);
    return;
  }
  
  console.log('[LOADOUT SPAWNER] Applying loadout:', loadoutId, 'Level:', level, 'to unit:', unit.name);
  
  // Use loadout's base rarity or override
  const finalRarity = rarity || loadout.rarity || 'common';
  const rarityMults = { 
    common: 1, 
    uncommon: 1.2, 
    rare: 1.5, 
    epic: 2, 
    legendary: 3 
  };
  const rarityMult = rarityMults[finalRarity] || 1;
  
  // Set name and metadata
  unit.name = loadout.name || unit.name;
  unit.loadoutId = loadoutId;
  unit.rarity = finalRarity;
  unit.loadoutLevel = level;
  
  // Apply weapon
  if (loadout.weapon) {
    unit.weaponType = loadout.weapon.weaponType;
    const atkBonus = Math.floor((loadout.weapon.buffs?.atk || 0) * rarityMult);
    unit.atk = (unit.atk || 0) + atkBonus;
    
    console.log('[LOADOUT SPAWNER] Applied weapon:', unit.weaponType, '+' + atkBonus, 'ATK');
  }
  
  // Apply armor (sum all buffs from all pieces)
  if (loadout.armor) {
    let totalHp = 0, totalMana = 0, totalAtk = 0, totalDef = 0;
    let totalSpeed = 0, totalCritChance = 0, totalCdr = 0;
    
    for (const slotName of Object.keys(loadout.armor)) {
      const piece = loadout.armor[slotName];
      if (piece && piece.buffs) {
        for (const stat of Object.keys(piece.buffs)) {
          const baseValue = piece.buffs[stat];
          const value = Math.floor(baseValue * rarityMult);
          
          if (stat === 'maxHp') totalHp += value;
          else if (stat === 'maxMana') totalMana += value;
          else if (stat === 'atk') totalAtk += value;
          else if (stat === 'def') totalDef += value;
          else if (stat === 'speed') totalSpeed += value;
          else if (stat === 'critChance') totalCritChance += value;
          else if (stat === 'cdr') totalCdr += value;
        }
      }
    }
    
    // Apply totals
    if (totalHp > 0) unit.maxHp = (unit.maxHp || 0) + totalHp;
    if (totalMana > 0) unit.maxMana = (unit.maxMana || 0) + totalMana;
    if (totalAtk > 0) unit.atk = (unit.atk || 0) + totalAtk;
    if (totalDef > 0) unit.def = (unit.def || 0) + totalDef;
    if (totalSpeed > 0) unit.speed = (unit.speed || 0) + totalSpeed;
    if (totalCritChance > 0) unit.critChance = (unit.critChance || 0) + totalCritChance;
    if (totalCdr > 0) unit.cdr = (unit.cdr || 0) + totalCdr;
    
    console.log('[LOADOUT SPAWNER] Applied armor:', {
      hp: totalHp, mana: totalMana, atk: totalAtk, def: totalDef, 
      speed: totalSpeed, crit: totalCritChance, cdr: totalCdr
    });
  }
  
  // Scale by level (10% per level above 1)
  const levelMult = 1 + (level - 1) * 0.1;
  unit.maxHp = Math.floor(unit.maxHp * levelMult);
  if (unit.maxMana) unit.maxMana = Math.floor(unit.maxMana * levelMult);
  if (unit.atk) unit.atk = Math.floor(unit.atk * levelMult);
  if (unit.def) unit.def = Math.floor(unit.def * levelMult);
  
  console.log('[LOADOUT SPAWNER] Applied level scaling:', levelMult + 'x', 
    '→ HP:', unit.maxHp, 'ATK:', unit.atk, 'DEF:', unit.def);
  
  // Set current HP/Mana to max
  unit.hp = unit.maxHp;
  if (unit.maxMana) unit.mana = unit.maxMana;
  
  // Apply abilities
  if (loadout.abilities && loadout.abilities.length > 0) {
    // Store ability IDs for later initialization
    unit.abilityIds = [...loadout.abilities];
    console.log('[LOADOUT SPAWNER] Assigned abilities:', unit.abilityIds);
    // Note: npcInitAbilities will convert these IDs to skill objects
  }
  
  // Store loadout reference for respawning
  unit._loadoutData = {
    loadoutId,
    level,
    rarity: finalRarity
  };
  
  console.log('[LOADOUT SPAWNER] Final unit stats:', {
    name: unit.name,
    hp: unit.hp + '/' + unit.maxHp,
    atk: unit.atk,
    def: unit.def,
    weapon: unit.weaponType,
    abilities: unit.abilityIds?.length || 0
  });
}

/**
 * Get display info for a loadout (for UI tooltips)
 */
export function getLoadoutDisplayInfo(loadoutId, level = 1, rarity = null) {
  const loadout = LOADOUTS[loadoutId];
  if (!loadout) return null;
  
  const finalRarity = rarity || loadout.rarity || 'common';
  const rarityMults = { common: 1, uncommon: 1.2, rare: 1.5, epic: 2, legendary: 3 };
  const rarityMult = rarityMults[finalRarity] || 1;
  const levelMult = 1 + (level - 1) * 0.1;
  
  // Calculate total stats
  let totalHp = 0, totalMana = 0, totalAtk = 0, totalDef = 0;
  
  if (loadout.weapon?.buffs) {
    totalAtk += (loadout.weapon.buffs.atk || 0);
  }
  
  if (loadout.armor) {
    for (const piece of Object.values(loadout.armor)) {
      if (piece?.buffs) {
        totalHp += (piece.buffs.maxHp || 0);
        totalMana += (piece.buffs.maxMana || 0);
        totalAtk += (piece.buffs.atk || 0);
        totalDef += (piece.buffs.def || 0);
      }
    }
  }
  
  // Apply multipliers
  totalHp = Math.floor(totalHp * rarityMult * levelMult);
  totalMana = Math.floor(totalMana * rarityMult * levelMult);
  totalAtk = Math.floor(totalAtk * rarityMult * levelMult);
  totalDef = Math.floor(totalDef * rarityMult * levelMult);
  
  return {
    name: loadout.name,
    rarity: finalRarity,
    level,
    weapon: loadout.weapon?.weaponType,
    abilities: loadout.abilities || [],
    stats: {
      hp: totalHp,
      mana: totalMana,
      atk: totalAtk,
      def: totalDef
    }
  };
}
