/**
 * Fighter Card Collection System
 * Manages card drops, inventory, leveling, and trading
 */

import { LOADOUTS } from './loadout-registry.js';

// Card rarity drop rates and prices
export const CARD_CONFIG = {
  dropRates: {
    common: 0.60,
    uncommon: 0.25,
    rare: 0.10,
    epic: 0.04,
    legendary: 0.01
  },
  baseDropChance: 0.05, // 5% base chance on enemy kill
  bossDropBonus: 0.95, // Bosses have 100% drop chance (5% + 95%)
  
  sellPrices: {
    common: 50,
    uncommon: 150,
    rare: 500,
    epic: 2000,
    legendary: 10000
  },
  
  // Fighter packs available in shop
  packs: {
    common: {
      name: 'Common Pack',
      price: 100,
      count: 3,
      guaranteedRarity: null, // All random
      description: '3 random fighter cards'
    },
    rare: {
      name: 'Rare Pack',
      price: 500,
      count: 3,
      guaranteedRarity: 'rare', // At least 1 rare+
      description: '3 cards, guaranteed 1 Rare or better'
    },
    epic: {
      name: 'Epic Pack',
      price: 2000,
      count: 3,
      guaranteedRarity: 'epic', // At least 1 epic+
      description: '3 cards, guaranteed 1 Epic or better'
    }
  },
  
  // XP required per level (exponential curve)
  xpPerLevel: (level) => Math.floor(100 * Math.pow(1.15, level - 1)),
  maxLevel: 50
};

/**
 * Roll a random rarity based on drop rates
 */
export function rollRarity(guaranteedMin = null) {
  const rates = CARD_CONFIG.dropRates;
  const roll = Math.random();
  
  // Build cumulative probability
  let cumulative = 0;
  const rarities = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  
  for (const rarity of rarities) {
    cumulative += rates[rarity];
    if (roll <= cumulative) {
      // If we have a guaranteed minimum, upgrade if needed
      if (guaranteedMin) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const rolledIndex = rarityOrder.indexOf(rarity);
        const minIndex = rarityOrder.indexOf(guaranteedMin);
        if (rolledIndex < minIndex) {
          return guaranteedMin;
        }
      }
      return rarity;
    }
  }
  
  return guaranteedMin || 'common';
}

/**
 * Roll a random loadout ID from registry
 */
export function rollLoadout() {
  const loadoutIds = Object.keys(LOADOUTS);
  return loadoutIds[Math.floor(Math.random() * loadoutIds.length)];
}

/**
 * Create a new fighter card
 */
export function createCard(state, loadoutId = null, rarity = null, level = 1) {
  const finalLoadoutId = loadoutId || rollLoadout();
  const loadout = LOADOUTS[finalLoadoutId];
  const finalRarity = rarity || loadout?.rarity || 'common';
  
  const card = {
    id: state.player.nextCardId++,
    loadoutId: finalLoadoutId,
    rarity: finalRarity,
    level: level,
    xp: 0,
    maxXp: CARD_CONFIG.xpPerLevel(level),
    acquired: Date.now(),
    totalKills: 0
  };
  
  return card;
}

/**
 * Give player starting cards (3 random commons)
 */
export function giveStartingCards(state) {
  console.log('[CARD SYSTEM] Giving starting cards...');
  
  for (let i = 0; i < 3; i++) {
    const loadoutId = rollLoadout();
    const card = createCard(state, loadoutId, 'common', 1);
    state.player.fighterCards.push(card);
    console.log('[CARD SYSTEM] Starting card:', LOADOUTS[loadoutId]?.name, '(Common)');
  }
}

/**
 * Try to drop a card from enemy death
 */
export function tryDropCard(state, enemy) {
  const isBoss = enemy.isBoss || enemy.hp > 500;
  const dropChance = CARD_CONFIG.baseDropChance + (isBoss ? CARD_CONFIG.bossDropBonus : 0);
  
  if (Math.random() < dropChance) {
    const rarity = rollRarity(isBoss ? 'rare' : null); // Bosses guarantee rare+
    const loadoutId = rollLoadout();
    const card = createCard(state, loadoutId, rarity, 1);
    
    state.player.fighterCards.push(card);
    
    const loadout = LOADOUTS[loadoutId];
    const rarityColors = {
      common: '#aaa',
      uncommon: '#1eff00',
      rare: '#0070dd',
      epic: '#a335ee',
      legendary: '#ff8000'
    };
    
    if (window.ui && window.ui.toast) {
      window.ui.toast(`🎴 ${loadout?.name || loadoutId} (${rarity.toUpperCase()})`, rarityColors[rarity]);
    }
    
    console.log('[CARD DROP]', loadout?.name, '-', rarity, 'Level 1');
    return card;
  }
  
  return null;
}

/**
 * Give XP to a card
 */
export function giveCardXP(card, xp) {
  if (!card || card.level >= CARD_CONFIG.maxLevel) return false;
  
  card.xp += xp;
  let leveledUp = false;
  
  // Check for level ups
  while (card.xp >= card.maxXp && card.level < CARD_CONFIG.maxLevel) {
    card.xp -= card.maxXp;
    card.level++;
    card.maxXp = CARD_CONFIG.xpPerLevel(card.level);
    leveledUp = true;
    
    console.log('[CARD LEVEL UP]', card.loadoutId, 'reached level', card.level);
  }
  
  return leveledUp;
}

/**
 * Give XP to equipped card when their unit gets a kill
 */
export function onUnitKill(state, unit) {
  // Find which card is equipped to this unit's slot
  if (!unit._slotId) return; // Unit not from a slot
  
  const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
  const slot = allSlots.find(s => s.id === unit._slotId);
  
  if (slot && slot.cardId) {
    const card = state.player.fighterCards.find(c => c.id === slot.cardId);
    if (card) {
      const xpGain = 10; // Base XP per kill
      card.totalKills++;
      
      const leveledUp = giveCardXP(card, xpGain);
      
      if (leveledUp && window.ui && window.ui.toast) {
        const loadout = LOADOUTS[card.loadoutId];
        window.ui.toast(`⬆ ${loadout?.name} → Level ${card.level}!`, '#d4af37');
      }
    }
  }
}

/**
 * Sell a card for gold
 */
export function sellCard(state, cardId) {
  const cardIndex = state.player.fighterCards.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return false;
  
  const card = state.player.fighterCards[cardIndex];
  
  // Can't sell equipped cards
  const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
  const isEquipped = allSlots.some(s => s.cardId === cardId);
  if (isEquipped) {
    if (window.ui && window.ui.toast) {
      window.ui.toast('❌ Cannot sell equipped card', '#f44');
    }
    return false;
  }
  
  const sellPrice = CARD_CONFIG.sellPrices[card.rarity] || 0;
  state.player.gold += sellPrice;
  state.player.fighterCards.splice(cardIndex, 1);
  
  const loadout = LOADOUTS[card.loadoutId];
  if (window.ui && window.ui.toast) {
    window.ui.toast(`💰 Sold ${loadout?.name} for ${sellPrice}g`, '#4f4');
  }
  
  console.log('[CARD SOLD]', loadout?.name, 'for', sellPrice, 'gold');
  return true;
}

/**
 * Buy a fighter pack
 */
export function buyPack(state, packType) {
  const pack = CARD_CONFIG.packs[packType];
  if (!pack) return null;
  
  if (state.player.gold < pack.price) {
    if (window.ui && window.ui.toast) {
      window.ui.toast('❌ Not enough gold', '#f44');
    }
    return null;
  }
  
  state.player.gold -= pack.price;
  
  const newCards = [];
  let guaranteedGiven = false;
  
  for (let i = 0; i < pack.count; i++) {
    // Last card gets the guarantee if not given yet
    const isLastCard = (i === pack.count - 1);
    const forceGuarantee = pack.guaranteedRarity && !guaranteedGiven && isLastCard;
    
    const rarity = forceGuarantee ? 
      rollRarity(pack.guaranteedRarity) : 
      rollRarity(i === 0 && pack.guaranteedRarity ? pack.guaranteedRarity : null);
    
    if (pack.guaranteedRarity && ['rare', 'epic', 'legendary'].includes(rarity)) {
      guaranteedGiven = true;
    }
    
    const loadoutId = rollLoadout();
    const card = createCard(state, loadoutId, rarity, 1);
    state.player.fighterCards.push(card);
    newCards.push(card);
  }
  
  console.log('[PACK OPENED]', pack.name, '- Got', newCards.length, 'cards');
  return newCards;
}

/**
 * Get card by ID
 */
export function getCard(state, cardId) {
  return state.player.fighterCards.find(c => c.id === cardId);
}

/**
 * Equip card to slot
 */
export function equipCard(state, slotId, cardId) {
  const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
  const slot = allSlots.find(s => s.id === slotId);
  
  if (!slot || !slot.unlocked) return false;
  
  const card = getCard(state, cardId);
  if (!card) return false;
  
  // Unequip from any other slot first
  allSlots.forEach(s => {
    if (s.cardId === cardId) s.cardId = null;
  });
  
  // Equip to this slot
  slot.cardId = cardId;
  
  console.log('[CARD EQUIPPED]', card.loadoutId, 'to', slotId);
  return true;
}

/**
 * Unequip card from slot
 */
export function unequipCard(state, slotId) {
  const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
  const slot = allSlots.find(s => s.id === slotId);
  
  if (!slot) return false;
  
  slot.cardId = null;
  console.log('[CARD UNEQUIPPED] from', slotId);
  return true;
}
