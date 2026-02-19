// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTION CODEX - Track discovered fighters, milestones, and rewards
// ═══════════════════════════════════════════════════════════════════════════════

import { LOADOUT_REGISTRY } from "./loadout-registry.js";
import { FACTIONS, getCollectionProgress, getTotalCollectionStats, getActiveFactionBonuses } from "./fighter-factions.js";

// ═════════════════════════════════════════════════════════════════════════════
// CODEX STATE MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Initialize codex state on the game state object
 * Call once at game start or when loading a save
 */
export function initCodex(state) {
  if (!state.codex) {
    state.codex = {
      discoveredIds: [],       // Array of loadoutBaseId strings the player has ever collected
      milestonesReached: [],   // Array of milestone IDs already claimed
      totalCardsEver: 0,       // Lifetime card count
      lastDiscovery: null,     // { id, name, time } of last new discovery
      duplicatesSold: 0,       // Total duplicates sold for gold
      legendariesFound: 0      // Total legendary cards ever obtained
    };
  }
  return state.codex;
}

/**
 * Record a newly acquired card in the codex
 * @returns {Object|null} Discovery info if this was a NEW unique fighter, null if duplicate
 */
export function recordCardAcquired(state, card) {
  const codex = initCodex(state);
  codex.totalCardsEver++;
  
  if (card.rarity === 'legendary') {
    codex.legendariesFound++;
  }
  
  const baseId = card.loadoutBaseId;
  if (!baseId) return null;
  
  // Check if this is a new discovery
  if (!codex.discoveredIds.includes(baseId)) {
    codex.discoveredIds.push(baseId);
    codex.lastDiscovery = {
      id: baseId,
      name: card.name,
      time: Date.now()
    };
    
    // Check for newly completed milestones
    const newMilestones = checkNewMilestones(state);
    
    return {
      isNew: true,
      fighterName: card.name,
      totalDiscovered: codex.discoveredIds.length,
      totalPossible: getTotalFighterCount(),
      newMilestones
    };
  }
  
  return null; // Was a duplicate
}

// ═════════════════════════════════════════════════════════════════════════════
// MILESTONE SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

const MILESTONES = [
  // Collection count milestones
  { id: 'collect_5',  type: 'count', threshold: 5,  reward: { gold: 500 },   title: 'Novice Collector',     desc: 'Discover 5 unique fighters' },
  { id: 'collect_10', type: 'count', threshold: 10, reward: { gold: 1500 },  title: 'Card Enthusiast',      desc: 'Discover 10 unique fighters' },
  { id: 'collect_20', type: 'count', threshold: 20, reward: { gold: 5000 },  title: 'Avid Collector',       desc: 'Discover 20 unique fighters' },
  { id: 'collect_30', type: 'count', threshold: 30, reward: { gold: 10000 }, title: 'Master Collector',     desc: 'Discover 30 unique fighters' },
  { id: 'collect_40', type: 'count', threshold: 40, reward: { gold: 20000 }, title: 'Grand Collector',      desc: 'Discover 40 unique fighters' },
  { id: 'collect_50', type: 'count', threshold: 50, reward: { gold: 50000 }, title: 'Legendary Collector',  desc: 'Discover 50 unique fighters' },
  { id: 'collect_all', type: 'count', threshold: 999, reward: { gold: 100000 }, title: 'The Completionist', desc: 'Discover ALL fighters!' },
  
  // Faction completion milestones
  { id: 'faction_shadow',    type: 'faction', factionId: 'shadow_guild',    reward: { gold: 3000 },  title: 'Shadow Master',     desc: 'Collect all Shadow Guild fighters' },
  { id: 'faction_elemental', type: 'faction', factionId: 'elemental_order', reward: { gold: 3000 },  title: 'Elemental Sage',    desc: 'Collect all Elemental Order fighters' },
  { id: 'faction_iron',      type: 'faction', factionId: 'iron_legion',     reward: { gold: 3000 },  title: 'Iron Commander',    desc: 'Collect all Iron Legion fighters' },
  { id: 'faction_nature',    type: 'faction', factionId: 'natures_keepers', reward: { gold: 3000 },  title: "Nature's Champion", desc: "Collect all Nature's Keepers fighters" },
  { id: 'faction_holy',      type: 'faction', factionId: 'holy_order',      reward: { gold: 3000 },  title: 'Holy Crusader',     desc: 'Collect all Holy Order fighters' },
  { id: 'faction_arcane',    type: 'faction', factionId: 'arcane_academy',  reward: { gold: 3000 },  title: 'Arcane Master',     desc: 'Collect all Arcane Academy fighters' },
  { id: 'faction_blood',     type: 'faction', factionId: 'blood_covenant',  reward: { gold: 3000 },  title: 'Blood Bound',       desc: 'Collect all Blood Covenant fighters' },
  { id: 'faction_dawn',      type: 'faction', factionId: 'dawn_sentinels',  reward: { gold: 3000 },  title: 'Dawn Commander',    desc: 'Collect all Dawn Sentinel fighters' },
  { id: 'faction_legendary', type: 'faction', factionId: 'legendary',       reward: { gold: 15000 }, title: 'Legend Among Legends', desc: 'Collect all Legendary Heroes' },
  
  // Role collection milestones
  { id: 'all_dps',    type: 'role', role: 'dps',    reward: { gold: 5000 }, title: 'Army of Blades',  desc: 'Collect all DPS fighters' },
  { id: 'all_tanks',  type: 'role', role: 'tank',   reward: { gold: 5000 }, title: 'Wall of Steel',   desc: 'Collect all Tank fighters' },
  { id: 'all_heals',  type: 'role', role: 'healer', reward: { gold: 5000 }, title: 'Circle of Life',  desc: 'Collect all Healer fighters' },
  
  // Special milestones
  { id: 'first_legendary',   type: 'special', check: 'legendary',    reward: { gold: 2000 }, title: 'Golden Touch',     desc: 'Obtain your first Legendary card' },
  { id: 'ten_duplicates',    type: 'special', check: 'duplicates10', reward: { gold: 1000 }, title: 'Deja Vu',          desc: 'Sell 10 duplicate cards' },
  { id: 'lifetime_100_cards', type: 'special', check: 'lifetime100', reward: { gold: 5000 }, title: 'Card Hoarder',     desc: 'Obtain 100 total cards (including duplicates)' },
];

/**
 * Check for newly completed milestones
 * @returns {Array} Newly completed milestones (not previously claimed)
 */
export function checkNewMilestones(state) {
  const codex = initCodex(state);
  const newlyCompleted = [];
  
  const discovered = codex.discoveredIds.length;
  const progress = getCollectionProgress(state);
  
  for (const milestone of MILESTONES) {
    // Skip already reached milestones
    if (codex.milestonesReached.includes(milestone.id)) continue;
    
    let isComplete = false;
    
    switch (milestone.type) {
      case 'count': {
        // Special case for "collect_all" — use actual total
        const threshold = milestone.threshold === 999 ? getTotalFighterCount() : milestone.threshold;
        isComplete = discovered >= threshold;
        break;
      }
      case 'faction': {
        const factionProgress = progress[milestone.factionId];
        isComplete = factionProgress && factionProgress.complete;
        break;
      }
      case 'role': {
        isComplete = checkRoleComplete(codex.discoveredIds, milestone.role);
        break;
      }
      case 'special': {
        if (milestone.check === 'legendary') isComplete = codex.legendariesFound >= 1;
        if (milestone.check === 'duplicates10') isComplete = codex.duplicatesSold >= 10;
        if (milestone.check === 'lifetime100') isComplete = codex.totalCardsEver >= 100;
        break;
      }
    }
    
    if (isComplete) {
      codex.milestonesReached.push(milestone.id);
      newlyCompleted.push(milestone);
    }
  }
  
  return newlyCompleted;
}

/**
 * Get all milestones with their current progress
 */
export function getMilestoneProgress(state) {
  const codex = initCodex(state);
  const discovered = codex.discoveredIds.length;
  const progress = getCollectionProgress(state);
  
  return MILESTONES.map(m => {
    let current = 0;
    let target = 0;
    
    switch (m.type) {
      case 'count':
        target = m.threshold === 999 ? getTotalFighterCount() : m.threshold;
        current = Math.min(discovered, target);
        break;
      case 'faction': {
        const fp = progress[m.factionId];
        target = fp ? fp.total : 0;
        current = fp ? fp.collected : 0;
        break;
      }
      case 'role':
        const roleFighters = Object.values(LOADOUT_REGISTRY).filter(l => !l.guardOnly && l.role === m.role);
        target = roleFighters.length;
        current = roleFighters.filter(l => codex.discoveredIds.includes(l.id)).length;
        break;
      case 'special':
        if (m.check === 'legendary') { current = codex.legendariesFound; target = 1; }
        if (m.check === 'duplicates10') { current = codex.duplicatesSold; target = 10; }
        if (m.check === 'lifetime100') { current = codex.totalCardsEver; target = 100; }
        break;
    }
    
    return {
      ...m,
      current,
      target,
      percent: target > 0 ? Math.round((current / target) * 100) : 0,
      claimed: codex.milestonesReached.includes(m.id)
    };
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// CODEX DISPLAY HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get the full codex data needed for rendering the UI
 */
export function getCodexData(state) {
  const codex = initCodex(state);
  const stats = getTotalCollectionStats(state);
  const progress = getCollectionProgress(state);
  const milestones = getMilestoneProgress(state);
  
  return {
    // Overview
    totalDiscovered: codex.discoveredIds.length,
    totalFighters: stats.totalFighters,
    completionPercent: stats.completionPercent,
    totalCardsEver: codex.totalCardsEver,
    legendariesFound: codex.legendariesFound,
    duplicatesSold: codex.duplicatesSold,
    
    // Faction breakdown
    factions: Object.entries(progress).map(([factionId, p]) => ({
      id: factionId,
      name: p.faction.name,
      icon: p.faction.icon,
      color: p.faction.color,
      bgColor: p.faction.bgColor,
      description: p.faction.description,
      lore: p.faction.lore,
      collected: p.collected,
      total: p.total,
      complete: p.complete,
      percent: p.total > 0 ? Math.round((p.collected / p.total) * 100) : 0,
      fighters: p.fighters,
      bonuses: p.faction.bonuses || []
    })),
    
    // Milestones
    milestones,
    milestonesCompleted: milestones.filter(m => m.claimed).length,
    milestonesTotal: milestones.length,
    
    // Last discovery
    lastDiscovery: codex.lastDiscovery
  };
}

/**
 * Record a duplicate sold (for milestone tracking)
 */
export function recordDuplicateSold(state) {
  const codex = initCodex(state);
  codex.duplicatesSold++;
  return checkNewMilestones(state);
}

// ═════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function getTotalFighterCount() {
  return Object.values(LOADOUT_REGISTRY).filter(l => !l.guardOnly).length;
}

function checkRoleComplete(discoveredIds, role) {
  const roleFighters = Object.values(LOADOUT_REGISTRY).filter(l => !l.guardOnly && l.role === role);
  return roleFighters.every(l => discoveredIds.includes(l.id));
}

export default {
  initCodex,
  recordCardAcquired,
  checkNewMilestones,
  getMilestoneProgress,
  getCodexData,
  recordDuplicateSold,
  MILESTONES
};
