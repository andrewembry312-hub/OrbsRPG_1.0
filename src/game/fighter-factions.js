// ═══════════════════════════════════════════════════════════════════════════════
// FIGHTER FACTION SYSTEM - Collection tracking, faction bonuses, and codex
// ═══════════════════════════════════════════════════════════════════════════════

import { LOADOUT_REGISTRY } from "./loadout-registry.js";

// ═════════════════════════════════════════════════════════════════════════════
// FACTION DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

export const FACTIONS = {
  shadow_guild: {
    id: 'shadow_guild',
    name: 'Shadow Guild',
    icon: '🗡️',
    color: '#8B5CF6',       // Purple
    bgColor: '#1a1025',
    description: 'Assassins, poisoners, and stealth specialists who strike from the darkness.',
    lore: 'An ancient guild of shadow operatives who trade in secrets and silent death. Their blades are coated in venom, and their loyalty is only to the highest bidder.',
    bonuses: [
      { count: 2, desc: '+5% Crit Chance for all Shadow Guild fighters', stat: 'critChance', value: 0.05 },
      { count: 3, desc: '+10% Attack Speed for all Shadow Guild fighters', stat: 'atkSpeed', value: 0.10 },
      { count: 5, desc: '+15% Crit Damage for all Shadow Guild fighters', stat: 'critMult', value: 0.15 }
    ]
  },
  elemental_order: {
    id: 'elemental_order',
    name: 'Elemental Order',
    icon: '🔥',
    color: '#F59E0B',       // Amber
    bgColor: '#1a1508',
    description: 'Masters of fire, ice, storm, and void who command the primal elements.',
    lore: 'The Elemental Order has existed since the dawn of magic. Each member attunes to a primal force, channeling raw elemental fury through ancient rites.',
    bonuses: [
      { count: 2, desc: '+8% Magic Damage for all Elemental Order fighters', stat: 'magicDmg', value: 0.08 },
      { count: 3, desc: '+15% Mana Regen for all Elemental Order fighters', stat: 'manaRegen', value: 0.15 },
      { count: 5, desc: '+12% AoE Damage for all Elemental Order fighters', stat: 'aoeDmg', value: 0.12 }
    ]
  },
  iron_legion: {
    id: 'iron_legion',
    name: 'Iron Legion',
    icon: '⚔️',
    color: '#EF4444',       // Red
    bgColor: '#1a0808',
    description: 'Berserkers, gladiators, and warriors who live and die by the blade.',
    lore: 'Forged in the crucible of endless war, the Iron Legion answers only to strength. Every scar tells a story, every battle a lesson in survival.',
    bonuses: [
      { count: 2, desc: '+6% Attack Power for all Iron Legion fighters', stat: 'atk', value: 0.06 },
      { count: 3, desc: '+10% Lifesteal for all Iron Legion fighters', stat: 'lifesteal', value: 0.10 },
      { count: 5, desc: '+20% Berserk Duration for all Iron Legion fighters', stat: 'buffDuration', value: 0.20 }
    ]
  },
  natures_keepers: {
    id: 'natures_keepers',
    name: "Nature's Keepers",
    icon: '🌿',
    color: '#10B981',       // Emerald
    bgColor: '#081a10',
    description: 'Druids, beast masters, and forest guardians who channel the power of nature.',
    lore: 'Sworn protectors of the wildlands, the Keepers commune with ancient tree spirits and wild beasts. Their magic is slow but relentless, like the growth of roots.',
    bonuses: [
      { count: 2, desc: '+10% Healing Power for all Nature\'s Keepers fighters', stat: 'healingPower', value: 0.10 },
      { count: 3, desc: '+15% Max HP for all Nature\'s Keepers fighters', stat: 'maxHp', value: 0.15 },
      { count: 5, desc: '+8% HP Regen for all Nature\'s Keepers fighters', stat: 'hpRegen', value: 0.08 }
    ]
  },
  holy_order: {
    id: 'holy_order',
    name: 'Holy Order',
    icon: '✨',
    color: '#F9DC5C',       // Gold
    bgColor: '#1a1a08',
    description: 'Paladins, divine champions, and holy avengers guided by sacred light.',
    lore: 'The Holy Order serves a higher calling, their armor gleaming with divine wards. They smite the unholy and shield the righteous with unshakeable faith.',
    bonuses: [
      { count: 2, desc: '+8% Defense for all Holy Order fighters', stat: 'def', value: 0.08 },
      { count: 3, desc: '+10% Shield Effectiveness for Holy Order fighters', stat: 'shieldEff', value: 0.10 },
      { count: 5, desc: '+15% All Stats for all Holy Order fighters', stat: 'allStats', value: 0.15 }
    ]
  },
  arcane_academy: {
    id: 'arcane_academy',
    name: 'Arcane Academy',
    icon: '📖',
    color: '#6366F1',       // Indigo
    bgColor: '#0d0d1a',
    description: 'Scholars, chronomancers, and enchantresses who master arcane knowledge.',
    lore: 'The Academy houses the greatest magical minds. Their libraries span dimensions, and their experiments push the boundaries of what\'s possible.',
    bonuses: [
      { count: 2, desc: '+10% CDR for all Arcane Academy fighters', stat: 'cdr', value: 0.10 },
      { count: 3, desc: '+15% Max Mana for all Arcane Academy fighters', stat: 'maxMana', value: 0.15 },
      { count: 5, desc: '+12% All Damage for all Arcane Academy fighters', stat: 'allDamage', value: 0.12 }
    ]
  },
  blood_covenant: {
    id: 'blood_covenant',
    name: 'Blood Covenant',
    icon: '🩸',
    color: '#DC2626',       // Deep Red
    bgColor: '#1a0505',
    description: 'Dark healers, vampiric priests, and life-draining specialists.',
    lore: 'The Blood Covenant walks the razor edge between life and death. They heal through forbidden blood magic, draining enemies to fuel their allies.',
    bonuses: [
      { count: 2, desc: '+10% Lifesteal for all Blood Covenant fighters', stat: 'lifesteal', value: 0.10 },
      { count: 3, desc: '+12% Healing Power for Blood Covenant fighters', stat: 'healingPower', value: 0.12 },
      { count: 5, desc: '+8% Vampiric Aura for all Blood Covenant fighters', stat: 'vampiric', value: 0.08 }
    ]
  },
  dawn_sentinels: {
    id: 'dawn_sentinels',
    name: 'Dawn Sentinels',
    icon: '🛡️',
    color: '#3B82F6',       // Blue
    bgColor: '#081020',
    description: 'Elite defenders, phalanx specialists, and battlefield medics.',
    lore: 'The Dawn Sentinels are the first line of defense against any threat. Their shield walls are legendary, and no ally falls while a Sentinel stands.',
    bonuses: [
      { count: 2, desc: '+10% Block Effectiveness for Dawn Sentinel fighters', stat: 'blockEff', value: 0.10 },
      { count: 3, desc: '+12% Defense for all Dawn Sentinel fighters', stat: 'def', value: 0.12 },
      { count: 5, desc: '+20% Shield Power for all Dawn Sentinel fighters', stat: 'shieldPower', value: 0.20 }
    ]
  },
  legendary: {
    id: 'legendary',
    name: 'Legendary Heroes',
    icon: '👑',
    color: '#FFD700',       // Gold
    bgColor: '#1a1500',
    description: 'The rarest and most powerful fighters in existence.',
    lore: 'Legends spoken of in whispers. These fighters have transcended mortal limits, each one a force that can shift the balance of entire wars.',
    bonuses: [
      { count: 2, desc: '+5% All Stats for all Legendary fighters', stat: 'allStats', value: 0.05 },
      { count: 3, desc: '+10% All Damage for all Legendary fighters', stat: 'allDamage', value: 0.10 },
      { count: 5, desc: '+15% Everything for all Legendary fighters', stat: 'allStats', value: 0.15 }
    ]
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// FACTION HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get all fighters belonging to a faction from the loadout registry
 */
export function getFactionFighters(factionId) {
  return Object.values(LOADOUT_REGISTRY).filter(l => l.faction === factionId && !l.guardOnly);
}

/**
 * Get faction info for a loadout ID
 */
export function getFighterFaction(loadoutId) {
  const loadout = LOADOUT_REGISTRY[loadoutId];
  if (!loadout || !loadout.faction) return null;
  return FACTIONS[loadout.faction] || null;
}

/**
 * Get collection progress for all factions based on collected cards
 * @param {Object} state - Game state with fighterCardInventory
 * @returns {Object} Map of factionId → { total, collected, unique, fighters[] }
 */
export function getCollectionProgress(state) {
  const cards = state.fighterCardInventory?.cards || [];
  
  // Get unique loadout base IDs from collected cards
  const collectedBaseIds = new Set(cards.map(c => c.loadoutBaseId));
  
  const progress = {};
  
  for (const [factionId, faction] of Object.entries(FACTIONS)) {
    const factionFighters = getFactionFighters(factionId);
    const collectedFighters = factionFighters.filter(f => collectedBaseIds.has(f.id));
    
    progress[factionId] = {
      factionId,
      faction,
      total: factionFighters.length,
      collected: collectedFighters.length,
      complete: collectedFighters.length >= factionFighters.length,
      fighters: factionFighters.map(f => ({
        id: f.id,
        name: f.name,
        role: f.role,
        class: f.class,
        unlockLevel: f.unlockLevel,
        description: f.description,
        collected: collectedBaseIds.has(f.id),
        cardCount: cards.filter(c => c.loadoutBaseId === f.id).length
      }))
    };
  }
  
  // Also include "original" fighters (no faction) as "Founding Champions"
  const originalFighters = Object.values(LOADOUT_REGISTRY).filter(l => !l.faction && !l.guardOnly);
  const collectedOriginals = originalFighters.filter(f => collectedBaseIds.has(f.id));
  progress['founding_champions'] = {
    factionId: 'founding_champions',
    faction: {
      id: 'founding_champions',
      name: 'Founding Champions',
      icon: '⭐',
      color: '#A78BFA',
      bgColor: '#120e1a',
      description: 'The original heroes who started it all.',
      lore: 'These were the first fighters to answer the call. Veterans of countless battles, their legacy echoes through every new generation.',
      bonuses: [
        { count: 5, desc: '+5% All Stats for all Founding Champions', stat: 'allStats', value: 0.05 },
        { count: 10, desc: '+8% All Damage for all Founding Champions', stat: 'allDamage', value: 0.08 },
        { count: 20, desc: '+12% Everything for all Founding Champions', stat: 'allStats', value: 0.12 }
      ]
    },
    total: originalFighters.length,
    collected: collectedOriginals.length,
    complete: collectedOriginals.length >= originalFighters.length,
    fighters: originalFighters.map(f => ({
      id: f.id,
      name: f.name,
      role: f.role,
      class: f.class,
      unlockLevel: f.unlockLevel || 1,
      description: f.description,
      collected: collectedBaseIds.has(f.id),
      cardCount: cards.filter(c => c.loadoutBaseId === f.id).length
    }))
  };
  
  return progress;
}

/**
 * Get total collection stats
 */
export function getTotalCollectionStats(state) {
  const progress = getCollectionProgress(state);
  let totalFighters = 0;
  let totalCollected = 0;
  let factionsComplete = 0;
  
  for (const p of Object.values(progress)) {
    totalFighters += p.total;
    totalCollected += p.collected;
    if (p.complete) factionsComplete++;
  }
  
  return {
    totalFighters,
    totalCollected,
    factionsComplete,
    totalFactions: Object.keys(progress).length,
    completionPercent: totalFighters > 0 ? Math.round((totalCollected / totalFighters) * 100) : 0
  };
}

/**
 * Get active faction bonuses based on deployed fighters
 * @param {Array} deployedCards - Array of card objects currently in slots
 * @returns {Object} Map of stat bonuses to apply
 */
export function getActiveFactionBonuses(deployedCards) {
  if (!deployedCards || deployedCards.length === 0) return {};
  
  // Count deployed fighters per faction
  const factionCounts = {};
  for (const card of deployedCards) {
    const loadout = LOADOUT_REGISTRY[card.loadoutBaseId];
    if (!loadout) continue;
    const factionId = loadout.faction || 'founding_champions';
    factionCounts[factionId] = (factionCounts[factionId] || 0) + 1;
  }
  
  // Calculate active bonuses
  const activeBonuses = {};
  const activeBonusList = [];
  
  for (const [factionId, count] of Object.entries(factionCounts)) {
    const faction = FACTIONS[factionId];
    if (!faction || !faction.bonuses) continue;
    
    for (const bonus of faction.bonuses) {
      if (count >= bonus.count) {
        activeBonuses[bonus.stat] = (activeBonuses[bonus.stat] || 0) + bonus.value;
        activeBonusList.push({
          faction: faction.name,
          icon: faction.icon,
          desc: bonus.desc,
          count: bonus.count,
          active: true
        });
      }
    }
  }
  
  return { bonuses: activeBonuses, list: activeBonusList };
}

/**
 * Get a formatted summary of collection for display
 */
export function getCollectionSummary(state) {
  const stats = getTotalCollectionStats(state);
  const progress = getCollectionProgress(state);
  
  return {
    headline: `${stats.totalCollected}/${stats.totalFighters} Fighters Collected (${stats.completionPercent}%)`,
    factionsComplete: `${stats.factionsComplete}/${stats.totalFactions} Factions Complete`,
    factions: Object.values(progress).map(p => ({
      name: p.faction.name,
      icon: p.faction.icon,
      color: p.faction.color,
      progress: `${p.collected}/${p.total}`,
      percent: p.total > 0 ? Math.round((p.collected / p.total) * 100) : 0,
      complete: p.complete
    }))
  };
}

export default {
  FACTIONS,
  getFactionFighters,
  getFighterFaction,
  getCollectionProgress,
  getTotalCollectionStats,
  getActiveFactionBonuses,
  getCollectionSummary
};
