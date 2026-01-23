// ═══════════════════════════════════════════════════════════════════════════════
// FIGHTER CARD SYSTEM - Card generation, collection, and management
// ═══════════════════════════════════════════════════════════════════════════════

import { rand, randi } from "../engine/util.js";
import { LOADOUT_REGISTRY } from "./loadout-registry.js";
import { getPlayerBaseStatsForLevel, getRarityMultiplier } from "./leveling.js";

// Fighter roles that can be randomly assigned
const FIGHTER_ROLES = ['dps', 'tank', 'healer', 'flex'];

// Card rarity tiers
export const CARD_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// Rarity probability at each player level (weighted distribution)
const RARITY_WEIGHTS = {
  common: { common: 50, uncommon: 35, rare: 10, epic: 4, legendary: 1 },
  uncommon: { common: 35, uncommon: 40, rare: 20, epic: 4, legendary: 1 },
  rare: { common: 20, uncommon: 35, rare: 35, epic: 8, legendary: 2 },
  epic: { common: 10, uncommon: 20, rare: 40, epic: 25, legendary: 5 },
  legendary: { common: 5, uncommon: 10, rare: 30, epic: 40, legendary: 15 }
};

// Get rarity weight table based on player level
function getRarityWeights(playerLevel) {
  if (playerLevel <= 10) return RARITY_WEIGHTS.common;
  if (playerLevel <= 20) return RARITY_WEIGHTS.uncommon;
  if (playerLevel <= 30) return RARITY_WEIGHTS.rare;
  if (playerLevel <= 40) return RARITY_WEIGHTS.epic;
  return RARITY_WEIGHTS.legendary;
}

// Weighted random selection
function weightedRandom(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = randi(1, total);
  for (const [key, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0];
}

// Get all loadouts available at or below player level
function getAvailableLoadouts(playerLevel) {
  const loadouts = LOADOUT_REGISTRY;
  if (!loadouts) {
    console.warn('[FighterCards] LOADOUT_REGISTRY is undefined');
    return [];
  }
  return Object.values(loadouts).filter(l => !l.unlockLevel || l.unlockLevel <= playerLevel);
}

// Generate random stats for a fighter card based on level and rarity
function generateRandomStats(playerLevel, rarity) {
  const baseStats = getPlayerBaseStatsForLevel(playerLevel);
  const rarityMult = getRarityMultiplier(rarity);
  
  // Randomize stats within +/- 20% range for some variety
  const variation = (val) => val * (0.8 + rand() * 0.4);
  
  return {
    maxHp: Math.round(variation(baseStats.maxHp * rarityMult)),
    atk: Math.round(variation(baseStats.atk * rarityMult) * 10) / 10,
    def: Math.round(variation(baseStats.def * rarityMult) * 10) / 10,
    speed: Math.round(variation(baseStats.speed * rarityMult)),
    mana: Math.round(variation(baseStats.maxMana * rarityMult)),
    critChance: Math.min(1, variation(baseStats.critChance * rarityMult)),
  };
}

// Generate a random fighter card
export function generateFighterCard(playerLevel, cardId) {
  const rarity = weightedRandom(getRarityWeights(playerLevel));
  const availableLoadouts = getAvailableLoadouts(playerLevel);
  
  if (availableLoadouts.length === 0) {
    console.warn('[FighterCards] No loadouts available at level', playerLevel);
    return null;
  }
  
  const loadout = availableLoadouts[randi(0, availableLoadouts.length - 1)];
  // CRITICAL: Use loadout's role, NOT a random role - keeps AI behavior aligned and intentional
  const role = loadout.role || 'dps'; // Use loadout's defined role, default to dps if undefined
  const stats = generateRandomStats(playerLevel, rarity);
  
  // Calculate card value (gold) based on rarity and level
  const rarityValue = { common: 50, uncommon: 150, rare: 500, epic: 2000, legendary: 10000 };
  const value = Math.round((rarityValue[rarity] || 100) * (1 + (playerLevel - 1) * 0.2));
  
  // Calculate power rating (1-5 stars) - based on rarity + level scaling
  const baseRating = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  const rating = Math.min(5, baseRating[rarity] + Math.floor((playerLevel - 1) / 10));
  
  // Generate rarity-matched items (copy loadout items and apply rarity)
  const rarityItems = {};
  if (loadout.armor) {
    Object.entries(loadout.armor).forEach(([slot, item]) => {
      rarityItems[slot] = {
        ...item,
        rarity: rarity
      };
    });
  }
  
  if (loadout.weapon) {
    rarityItems.weapon = {
      ...loadout.weapon,
      rarity: rarity
    };
  }

  return {
    id: cardId,
    loadoutId: loadout.id,
    name: loadout.name || 'Unknown Fighter',
    fighterImage: loadout.fighterImage || 'assets/ui/placeholder.png',
    level: playerLevel,
    rarity: rarity,
    role: role,
    rating: rating,
    value: value,
    stats: stats,
    items: rarityItems,
    abilities: loadout.abilities || [],
    combo: loadout.combo || {},
    acquiredTime: Date.now()
  };
}

// Add a card to player's inventory
export function addFighterCard(state, card) {
  if (!state.fighterCardInventory) {
    state.fighterCardInventory = { cards: [], nextCardId: 1 };
  }
  
  if (state.fighterCardInventory.cards.length >= state.fighterCardInventory.maxCards) {
    console.warn('[FighterCards] Inventory full!');
    return false;
  }
  
  state.fighterCardInventory.cards.push(card);
  return true;
}

// Get all cards from inventory
export function getCollectedCards(state) {
  return state.fighterCardInventory?.cards || [];
}

// Find card by ID
export function getCardById(state, cardId) {
  return state.fighterCardInventory?.cards?.find(c => c.id === cardId);
}

// Remove card from inventory (by ID)
export function removeCard(state, cardId) {
  if (!state.fighterCardInventory) return false;
  const idx = state.fighterCardInventory.cards.findIndex(c => c.id === cardId);
  if (idx >= 0) {
    state.fighterCardInventory.cards.splice(idx, 1);
    return true;
  }
  return false;
}

// Get cards filtered by role
export function getCardsByRole(state, role) {
  return getCollectedCards(state).filter(c => c.role === role);
}

// Get cards filtered by rarity
export function getCardsByRarity(state, rarity) {
  return getCollectedCards(state).filter(c => c.rarity === rarity);
}

// Sort cards
export function sortCards(cards, sortBy = 'rarity') {
  const sorted = [...cards];
  
  const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  
  switch (sortBy) {
    case 'rarity':
      return sorted.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
    case 'level':
      return sorted.sort((a, b) => b.level - a.level);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

// Assign a fighter card to a slot
export function assignCardToSlot(state, slotId, cardId) {
  const card = getCardById(state, cardId);
  if (!card) return false;
  
  // Find slot in either guards or allies
  let slot = state.slotSystem.guards.find(s => s.id === slotId);
  if (!slot) {
    slot = state.slotSystem.allies.find(s => s.id === slotId);
  }
  
  if (!slot) return false;
  
  // ROLE VALIDATION: Card role must match slot role (for less complexity)
  // Only same role cards go in role-specific slots
  const cardRole = (card.role || '').toLowerCase();
  const slotRole = (slot.role || '').toLowerCase();
  
  // Allow: same role, card is flex (compatible with any slot), or slot is flex
  const rolesCompatible = cardRole === slotRole || cardRole === 'flex' || slotRole === 'flex';
  
  if (!rolesCompatible) {
    console.warn('[FighterCards] Role mismatch - card:', cardRole, 'slot:', slotRole);
    return false;
  }
  
  slot.loadoutId = card.loadoutId;
  slot.level = card.level;
  return true;
}

export default {
  generateFighterCard,
  addFighterCard,
  getCollectedCards,
  getCardById,
  removeCard,
  getCardsByRole,
  getCardsByRarity,
  sortCards,
  assignCardToSlot,
  CARD_RARITIES,
  FIGHTER_ROLES
};
