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
  return Object.values(loadouts).filter(l => !l.guardOnly && (!l.unlockLevel || l.unlockLevel <= playerLevel));
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
        kind: 'armor',
        slot: slot,
        name: item.name || `${item.armorType} ${slot}`,
        desc: item.desc || `${item.armorType} armor for ${slot}`,
        rarity: rarity,
        itemLevel: playerLevel
      };
    });
  }
  
  if (loadout.weapon) {
    rarityItems.weapon = {
      ...loadout.weapon,
      kind: 'weapon',
      slot: 'weapon',
      name: loadout.weapon.name || `${loadout.weapon.weaponType}`,
      desc: loadout.weapon.desc || `${loadout.weapon.weaponType} weapon`,
      rarity: rarity,
      itemLevel: playerLevel
    };
  }

  return {
    id: cardId,
    loadoutId: cardId,  // Unique ID for this card instance - allows multiple cards of same fighter
    loadoutBaseId: loadout.id,  // Reference to the fighter template (e.g., "knight_warrior")
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

// ═════════════════════════════════════════════════════════════════════════════
// CARD PACK SYSTEM - Multi-card acquisition
// ═════════════════════════════════════════════════════════════════════════════

// Card pack definitions
export const CARD_PACKS = {
  basic_pack: {
    id: 'basic_pack',
    name: 'Basic Pack',
    description: '3 random fighter cards',
    cardCount: 3,
    cost: 500,
    icon: '📦',
    rarityBoost: 0       // No boost
  },
  premium_pack: {
    id: 'premium_pack',
    name: 'Premium Pack',
    description: '5 cards with guaranteed Rare+',
    cardCount: 5,
    cost: 2000,
    icon: '🎁',
    rarityBoost: 1,       // Shift rarity table up by 1 tier
    guaranteedMinRarity: 'rare'
  },
  legendary_pack: {
    id: 'legendary_pack',
    name: 'Legendary Pack',
    description: '3 cards with guaranteed Epic+ and 1 Legendary',
    cardCount: 3,
    cost: 8000,
    icon: '👑',
    rarityBoost: 2,
    guaranteedMinRarity: 'epic',
    guaranteedLegendary: 1
  },
  faction_pack: {
    id: 'faction_pack',
    name: 'Faction Pack',
    description: '4 cards from a specific faction',
    cardCount: 4,
    cost: 3000,
    icon: '🏰',
    rarityBoost: 0,
    factionLocked: true   // Will only produce cards from chosen faction
  }
};

/**
 * Open a card pack and generate cards
 * @param {Object} state - Game state
 * @param {string} packId - Pack type ID
 * @param {Object} options - { factionId: optional faction filter }
 * @returns {Array|null} Array of generated cards, or null on failure
 */
export function openCardPack(state, packId, options = {}) {
  const pack = CARD_PACKS[packId];
  if (!pack) {
    console.warn('[FighterCards] Unknown pack:', packId);
    return null;
  }
  
  const playerLevel = state.progression?.level || 1;
  const cards = [];
  
  for (let i = 0; i < pack.cardCount; i++) {
    let card;
    
    if (pack.factionLocked && options.factionId) {
      card = generateFactionCard(playerLevel, state.fighterCardInventory.nextCardId++, options.factionId);
    } else {
      card = generateFighterCard(playerLevel, state.fighterCardInventory.nextCardId++);
    }
    
    if (!card) continue;
    
    // Apply rarity boost — shift rarity up
    if (pack.rarityBoost && pack.rarityBoost > 0) {
      const rarityIdx = CARD_RARITIES.indexOf(card.rarity);
      const boostedIdx = Math.min(rarityIdx + pack.rarityBoost, CARD_RARITIES.length - 1);
      card.rarity = CARD_RARITIES[boostedIdx];
    }
    
    // Enforce minimum rarity
    if (pack.guaranteedMinRarity) {
      const minIdx = CARD_RARITIES.indexOf(pack.guaranteedMinRarity);
      const cardIdx = CARD_RARITIES.indexOf(card.rarity);
      if (cardIdx < minIdx) {
        card.rarity = pack.guaranteedMinRarity;
      }
    }
    
    // Force legendary for guaranteed legendary slots
    if (pack.guaranteedLegendary && i < pack.guaranteedLegendary) {
      card.rarity = 'legendary';
      card.rating = 5;
    }
    
    cards.push(card);
  }
  
  return cards;
}

/**
 * Generate a card from a specific faction
 */
export function generateFactionCard(playerLevel, cardId, factionId) {
  const availableLoadouts = Object.values(LOADOUT_REGISTRY).filter(l => 
    !l.guardOnly && 
    l.faction === factionId && 
    (!l.unlockLevel || l.unlockLevel <= playerLevel)
  );
  
  if (availableLoadouts.length === 0) {
    // Fall back to any available loadout
    return generateFighterCard(playerLevel, cardId);
  }
  
  const rarity = weightedRandom(getRarityWeights(playerLevel));
  const loadout = availableLoadouts[randi(0, availableLoadouts.length - 1)];
  const role = loadout.role || 'dps';
  const stats = generateRandomStats(playerLevel, rarity);
  
  const rarityValue = { common: 50, uncommon: 150, rare: 500, epic: 2000, legendary: 10000 };
  const value = Math.round((rarityValue[rarity] || 100) * (1 + (playerLevel - 1) * 0.2));
  const baseRating = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  const rating = Math.min(5, baseRating[rarity] + Math.floor((playerLevel - 1) / 10));
  
  const rarityItems = {};
  if (loadout.armor) {
    Object.entries(loadout.armor).forEach(([slot, item]) => {
      rarityItems[slot] = {
        ...item, kind: 'armor', slot, name: item.name || `${item.armorType} ${slot}`,
        desc: item.desc || `${item.armorType} armor for ${slot}`, rarity, itemLevel: playerLevel
      };
    });
  }
  if (loadout.weapon) {
    rarityItems.weapon = {
      ...loadout.weapon, kind: 'weapon', slot: 'weapon',
      name: loadout.weapon.name || `${loadout.weapon.weaponType}`,
      desc: loadout.weapon.desc || `${loadout.weapon.weaponType} weapon`, rarity, itemLevel: playerLevel
    };
  }
  
  return {
    id: cardId, loadoutId: cardId, loadoutBaseId: loadout.id,
    name: loadout.name || 'Unknown Fighter',
    fighterImage: loadout.fighterImage || 'assets/ui/placeholder.png',
    level: playerLevel, rarity, role, rating, value, stats, items: rarityItems,
    abilities: loadout.abilities || [], combo: loadout.combo || {},
    acquiredTime: Date.now()
  };
}

/**
 * Generate a guaranteed new (undiscovered) card if possible
 * @param {Object} state - Game state
 * @returns {Object|null} Card for an undiscovered fighter, or random if all discovered
 */
export function generateNewDiscoveryCard(state) {
  const playerLevel = state.progression?.level || 1;
  const discoveredIds = state.codex?.discoveredIds || [];
  
  // Find loadouts the player hasn't discovered yet
  const undiscovered = Object.values(LOADOUT_REGISTRY).filter(l =>
    !l.guardOnly &&
    (!l.unlockLevel || l.unlockLevel <= playerLevel) &&
    !discoveredIds.includes(l.id)
  );
  
  if (undiscovered.length === 0) {
    // All discovered — give a random card
    return generateFighterCard(playerLevel, state.fighterCardInventory.nextCardId++);
  }
  
  // Pick random undiscovered loadout, generate card with it
  const loadout = undiscovered[randi(0, undiscovered.length - 1)];
  const rarity = weightedRandom(getRarityWeights(playerLevel));
  const role = loadout.role || 'dps';
  const stats = generateRandomStats(playerLevel, rarity);
  
  const rarityValue = { common: 50, uncommon: 150, rare: 500, epic: 2000, legendary: 10000 };
  const value = Math.round((rarityValue[rarity] || 100) * (1 + (playerLevel - 1) * 0.2));
  const baseRating = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  const rating = Math.min(5, baseRating[rarity] + Math.floor((playerLevel - 1) / 10));
  
  const cardId = state.fighterCardInventory.nextCardId++;
  
  const rarityItems = {};
  if (loadout.armor) {
    Object.entries(loadout.armor).forEach(([slot, item]) => {
      rarityItems[slot] = {
        ...item, kind: 'armor', slot, name: item.name || `${item.armorType} ${slot}`,
        desc: item.desc || `${item.armorType} armor for ${slot}`, rarity, itemLevel: playerLevel
      };
    });
  }
  if (loadout.weapon) {
    rarityItems.weapon = {
      ...loadout.weapon, kind: 'weapon', slot: 'weapon',
      name: loadout.weapon.name || `${loadout.weapon.weaponType}`,
      desc: loadout.weapon.desc || `${loadout.weapon.weaponType} weapon`, rarity, itemLevel: playerLevel
    };
  }
  
  return {
    id: cardId, loadoutId: cardId, loadoutBaseId: loadout.id,
    name: loadout.name || 'Unknown Fighter',
    fighterImage: loadout.fighterImage || 'assets/ui/placeholder.png',
    level: playerLevel, rarity, role, rating, value, stats, items: rarityItems,
    abilities: loadout.abilities || [], combo: loadout.combo || {},
    acquiredTime: Date.now()
  };
}

/**
 * Sell a duplicate card for gold
 * @returns {number} Gold received, or 0 on failure
 */
export function sellCard(state, cardId) {
  const card = getCardById(state, cardId);
  if (!card) return 0;
  
  // Can't sell cards that are in active slots
  const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
  const inSlot = allSlots.some(s => s.loadoutId === card.loadoutId);
  if (inSlot) {
    console.warn('[FighterCards] Cannot sell card in active slot');
    return 0;
  }
  
  const goldAmount = card.value || 100;
  removeCard(state, cardId);
  
  return goldAmount;
}

/**
 * Get card acquisition sources description (for UI display)
 */
export function getCardSources() {
  return [
    { icon: '⬆️', name: 'Level Up', desc: 'Earn a fighter card every time you level up' },
    { icon: '🏆', name: 'Boss Defeat', desc: 'Defeat zone bosses for legendary card chances' },
    { icon: '📦', name: 'Card Packs', desc: 'Purchase packs from the marketplace for multiple cards' },
    { icon: '🗺️', name: 'Zone Completion', desc: 'Clear all enemies in a zone for a bonus card' },
    { icon: '💎', name: 'Treasure Chests', desc: 'Find hidden chests in the world for free cards' },
    { icon: '🎯', name: 'Daily Login', desc: 'Receive a card each day you play' }
  ];
}

export default {
  generateFighterCard,
  generateFactionCard,
  generateNewDiscoveryCard,
  addFighterCard,
  getCollectedCards,
  getCardById,
  removeCard,
  getCardsByRole,
  getCardsByRarity,
  sortCards,
  assignCardToSlot,
  sellCard,
  openCardPack,
  getCardSources,
  CARD_RARITIES,
  CARD_PACKS,
  FIGHTER_ROLES
};
