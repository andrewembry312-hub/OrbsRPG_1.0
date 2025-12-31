// ========================================
// MMO-Style Leveling & Scaling System
// Based on ESO and WoW best practices
// ========================================

export const LEVEL_CONFIG = {
  MAX_LEVEL: 50,
  ITEM_LEVEL_VARIANCE: 2, // Loot can drop ±2 levels from player
  
  // Zone level ranges (ESO-style level scaling by area)
  ZONES: {
    starter: { min: 1, max: 10 },    // Tutorial/starting area
    lowland: { min: 8, max: 20 },    // Early game zones
    midland: { min: 18, max: 32 },   // Mid game zones
    highland: { min: 30, max: 42 },  // Late game zones
    endgame: { min: 40, max: 50 }    // Endgame content
  }
};

// ========================================
// XP CURVE - ESO/WoW Style
// ========================================
// Smooth exponential curve that slows down at higher levels
// Formula: base × level^1.8 (similar to ESO's curve)
export function xpForNextLevel(level) {
  if (level >= LEVEL_CONFIG.MAX_LEVEL) return 999999; // Max level reached
  const baseXP = 100;
  const exponent = 1.8;
  return Math.floor(baseXP * Math.pow(level, exponent));
}

// ========================================
// STAT SCALING - Power Curve
// ========================================
// Similar to WoW's stat budgets per level
// Stats scale smoothly to prevent sudden power spikes
export function getStatBudgetForLevel(level) {
  const baseBudget = 10; // Level 1 baseline
  const growthRate = 1.15; // 15% increase per level (tuned for balance)
  return Math.floor(baseBudget * Math.pow(growthRate, level - 1));
}

// ========================================
// ITEM LEVEL SYSTEM
// ========================================
// Items have minimum level requirements
// Stats scale with item level × rarity multiplier
export function calculateItemLevel(playerLevel, variance = LEVEL_CONFIG.ITEM_LEVEL_VARIANCE) {
  const offset = Math.floor(Math.random() * (variance * 2 + 1)) - variance;
  const itemLevel = Math.max(1, Math.min(LEVEL_CONFIG.MAX_LEVEL, playerLevel + offset));
  return itemLevel;
}

// Get base stat value for item at given level
// This ensures items scale predictably with level
export function getItemStatValueForLevel(level, statType, rarity) {
  const rarityMult = getRarityMultiplier(rarity);
  const levelBudget = getStatBudgetForLevel(level);
  
  // Different stats have different weights (like WoW's stat budgets)
  const statWeights = {
    atk: 0.15,
    def: 0.12,
    maxHp: 0.30,
    maxMana: 0.25,
    maxStam: 0.20,
    speed: 0.18,
    critChance: 0.005, // percentage per level
    critMult: 0.008,
    manaRegen: 0.06,
    hpRegen: 0.04,
    stamRegen: 0.10,
    cdr: 0.004,
    lifesteal: 0.003,
    shieldGain: 0.08,
    blockEff: 0.004,
    goldFind: 0.002
  };
  
  const weight = statWeights[statType] || 0.1;
  const baseValue = levelBudget * weight * rarityMult;
  
  return baseValue;
}

// Rarity multipliers (ESO-style quality tiers)
export function getRarityMultiplier(rarity) {
  const rarityKey = typeof rarity === 'string' ? rarity : rarity?.key;
  const multipliers = {
    common: 1.0,
    uncommon: 1.3,
    rare: 1.7,
    epic: 2.2,
    legend: 3.0
  };
  return multipliers[rarityKey] || 1.0;
}

// ========================================
// ENEMY SCALING SYSTEM
// ========================================
// Enemies scale based on zone level ranges
// Like ESO: enemies match zone level, not player level directly
export function getEnemyLevelForZone(zoneKey, additionalLevels = 0) {
  const zone = LEVEL_CONFIG.ZONES[zoneKey] || LEVEL_CONFIG.ZONES.starter;
  const baseLevel = Math.floor((zone.min + zone.max) / 2); // Average of zone range
  return Math.min(LEVEL_CONFIG.MAX_LEVEL, baseLevel + additionalLevels);
}

// Get zone key based on map position (you'll need to configure this based on your map layout)
export function getZoneForPosition(x, y, mapWidth, mapHeight) {
  // Simple quadrant-based zones (customize based on your map design)
  // This is a placeholder - adjust to your actual map layout
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;
  const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
  const maxDist = Math.sqrt(Math.pow(mapWidth / 2, 2) + Math.pow(mapHeight / 2, 2));
  const normalizedDist = distFromCenter / maxDist;
  
  // Closer to center = starter zone, further out = higher level
  if (normalizedDist < 0.25) return 'starter';
  if (normalizedDist < 0.45) return 'lowland';
  if (normalizedDist < 0.65) return 'midland';
  if (normalizedDist < 0.85) return 'highland';
  return 'endgame';
}

// Calculate enemy stats based on level (WoW-style scaling)
export function scaleEnemyForLevel(baseStats, level, classModifiers = {}) {
  const levelMult = 1 + (level - 1) * 0.15; // 15% per level
  
  // Apply class modifiers (mage, warrior, tank, etc.)
  const classMods = {
    hp: classModifiers.hp || 1.0,
    dmg: classModifiers.dmg || 1.0,
    speed: classModifiers.speed || 1.0
  };
  
  return {
    maxHp: Math.round((baseStats.maxHp || 50) * levelMult * classMods.hp),
    contactDmg: Math.round((baseStats.contactDmg || 10) * levelMult * classMods.dmg),
    speed: Math.round((baseStats.speed || 90) * classMods.speed),
    xp: Math.floor(10 * Math.pow(level, 1.5)) // XP reward scales with level
  };
}

// ========================================
// ALLY SCALING SYSTEM
// ========================================
// Allies scale with player level to stay relevant (ESO companion system)
export function scaleAllyToPlayerLevel(baseStats, playerLevel, classModifiers = {}) {
  // Allies are slightly weaker than player but scale with them
  const allyMult = 0.85; // 85% of player power level
  const levelMult = 1 + (playerLevel - 1) * 0.12 * allyMult;
  
  const classMods = {
    hp: classModifiers.hp || 1.0,
    dmg: classModifiers.dmg || 1.0,
    speed: classModifiers.speed || 1.0
  };
  
  return {
    maxHp: Math.round((baseStats.maxHp || 100) * levelMult * classMods.hp),
    contactDmg: Math.round((baseStats.contactDmg || 8) * levelMult * classMods.dmg),
    atk: Math.round((baseStats.atk || 5) * levelMult * classMods.dmg),
    def: Math.round((baseStats.def || 2) * levelMult),
    speed: Math.round((baseStats.speed || 100) * classMods.speed)
  };
}

// ========================================
// LOOT LEVEL CALCULATION
// ========================================
// Determine what level loot should drop based on context
export function calculateLootLevel(playerLevel, enemyLevel = null) {
  // If enemy has a level, base it on enemy (with variance)
  if (enemyLevel) {
    const avgLevel = Math.floor((playerLevel + enemyLevel) / 2);
    return calculateItemLevel(avgLevel, 1);
  }
  // Otherwise base on player level
  return calculateItemLevel(playerLevel);
}

// ========================================
// LEVEL REQUIREMENT CHECK
// ========================================
// Check if player meets level requirement for item (WoW-style)
export function meetsLevelRequirement(playerLevel, itemLevel) {
  return playerLevel >= itemLevel;
}

// Get display color for item based on level requirement
export function getItemLevelColor(playerLevel, itemLevel) {
  if (itemLevel > playerLevel + 5) return '#ff4444'; // Red - way too high
  if (itemLevel > playerLevel) return '#ffaa44';     // Orange - slightly too high
  if (itemLevel === playerLevel) return '#44ff44';   // Green - perfect match
  if (itemLevel >= playerLevel - 5) return '#888888'; // Gray - slightly low
  return '#666666';                                   // Dark gray - obsolete
}

// ========================================
// PLAYER STAT GROWTH
// ========================================
// Calculate base player stats at a given level
export function getPlayerBaseStatsForLevel(level) {
  const levelMult = 1 + (level - 1) * 0.08; // 8% growth per level
  
  return {
    maxHp: Math.round(120 * levelMult),
    maxMana: Math.round(70 * levelMult),
    maxStam: Math.round(100 * levelMult),
    hpRegen: Math.round((1.4 * levelMult) * 10) / 10,
    manaRegen: Math.round((3.0 * levelMult) * 10) / 10,
    stamRegen: Math.round(18 * levelMult),
    atk: Math.round(6 * levelMult),
    def: Math.round(2 * levelMult),
    speed: 145, // Speed doesn't scale with level (controlled via items)
    sprintMult: 1.45,
    critChance: 0.08,
    critMult: 1.7,
    cdr: 0,
    blockBase: 0.50,
    blockCap: 0.80,
    blockStamDrain: 10,
    sprintStamDrain: 26
  };
}

// ========================================
// PROGRESSION REWARDS
// ========================================
// Rewards for leveling up (stat points, unlocks, etc.)
export function getLevelUpRewards(newLevel) {
  const rewards = {
    statPoints: 2, // Always 2 stat points per level
    skillPoint: false,
    goldBonus: 0,
    message: ''
  };
  
  // Every 5 levels: bonus skill point
  if (newLevel % 5 === 0) {
    rewards.skillPoint = true;
    rewards.message = 'Skill point awarded!';
  }
  
  // Every 10 levels: gold bonus
  if (newLevel % 10 === 0) {
    rewards.goldBonus = newLevel * 50;
    rewards.message += (rewards.message ? ' ' : '') + `${rewards.goldBonus} gold bonus!`;
  }
  
  // Milestone rewards
  if (newLevel === 10) rewards.message = 'Tutorial complete! New zones unlocked.';
  if (newLevel === 25) rewards.message = 'Veteran dungeons unlocked!';
  if (newLevel === 50) rewards.message = 'MAX LEVEL! Champion system unlocked!';
  
  return rewards;
}

export default {
  LEVEL_CONFIG,
  xpForNextLevel,
  getStatBudgetForLevel,
  calculateItemLevel,
  getItemStatValueForLevel,
  getRarityMultiplier,
  getEnemyLevelForZone,
  getZoneForPosition,
  scaleEnemyForLevel,
  scaleAllyToPlayerLevel,
  calculateLootLevel,
  meetsLevelRequirement,
  getItemLevelColor,
  getPlayerBaseStatsForLevel,
  getLevelUpRewards
};
