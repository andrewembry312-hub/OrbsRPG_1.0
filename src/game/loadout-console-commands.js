// Loadout Testing Console Commands
// Automatically loads and makes LOADOUT_TEST available in browser console

window.LOADOUT_TEST = {
  // Spawn one random fighter card for each rarity (for testing all rarities)
  spawnRandomAllRarities: async () => {
    try {
      // Load fighter card functions if not already loaded
      if (!window._generateFighterCard) {
        const module = await import('./fighter-cards.js');
        window._generateFighterCard = module.generateFighterCard;
      }
      
      const generateFighterCard = window._generateFighterCard;
      const state = window.state;
      const playerLevel = state.player?.level || state.progression?.level || 1;
      
      console.log('🎴 Creating one card for each rarity...');
      
      const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      let cardCount = 0;
      
      rarities.forEach(rarity => {
        // Generate a normal card
        const card = generateFighterCard(playerLevel, state.fighterCardInventory.nextCardId++);
        if (card) {
          // Override rarity to the specific one we want
          card.rarity = rarity;
          // Adjust rating to match rarity
          const baseRating = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
          card.rating = baseRating[rarity];
          
          // Add to inventory
          state.fighterCardInventory.cards.push(card);
          console.log('✅ ' + rarity);
          cardCount++;
        }
      });
      
      // Refresh UI
      if (window.ui?.renderFighterCards) {
        window.ui.renderFighterCards();
        console.log(`✅ Rendered ${cardCount} cards`);
      }
      
      return cardCount;
    } catch (err) {
      console.error('❌ Error spawning cards:', err);
    }
  },

  // View all available loadouts
  viewAll: () => {
    const loadouts = window.LOADOUTS.getAllLoadouts();
    console.table(loadouts.map(l => ({
      id: l.id,
      name: l.name,
      role: l.role,
      class: l.class,
      rarity: l.rarity || 'common',
      unlockLevel: l.unlockLevel,
      weaponType: l.weapon?.weaponType || 'None'
    })));
    console.log(`Total loadouts: ${loadouts.length}`);
    return loadouts;
  },

  // Change rarity of a specific loadout (temporary - not saved)
  setRarity: (loadoutId, rarity) => {
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (!validRarities.includes(rarity)) {
      console.error(`Invalid rarity! Use: ${validRarities.join(', ')}`);
      return false;
    }

    const loadout = window.LOADOUTS.getLoadout(loadoutId);
    if (!loadout) {
      console.error(`Loadout "${loadoutId}" not found!`);
      console.log('Available loadouts:', window.LOADOUTS.getAllLoadouts().map(l => l.id));
      return false;
    }

    loadout.rarity = rarity;
    console.log(`✅ Set ${loadout.name} to ${rarity.toUpperCase()} rarity`);
    console.log('🔄 Reopen fighter selection modal to see changes');
    return loadout;
  },

  // Set all loadouts to a specific rarity (for testing)
  setAllRarity: (rarity) => {
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (!validRarities.includes(rarity)) {
      console.error(`Invalid rarity! Use: ${validRarities.join(', ')}`);
      return false;
    }

    const loadouts = window.LOADOUTS.getAllLoadouts();
    loadouts.forEach(l => l.rarity = rarity);
    console.log(`✅ Set ALL ${loadouts.length} loadouts to ${rarity.toUpperCase()}`);
    console.log('🔄 Reopen fighter selection modal to see changes');
    return loadouts;
  },

  // Randomize rarities for all loadouts (for testing variety)
  randomizeRarities: () => {
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const loadouts = window.LOADOUTS.getAllLoadouts();
    
    loadouts.forEach(l => {
      l.rarity = rarities[Math.floor(Math.random() * rarities.length)];
    });

    console.log(`✅ Randomized rarities for ${loadouts.length} loadouts:`);
    console.table(loadouts.map(l => ({
      name: l.name,
      rarity: l.rarity,
      role: l.role
    })));
    console.log('🔄 Reopen fighter selection modal to see changes');
    return loadouts;
  },

  // Set rarities by role (DPS=common, Tank=epic, Healer=rare, etc.)
  setByRole: (dpsRarity = 'common', tankRarity = 'epic', healerRarity = 'rare') => {
    const loadouts = window.LOADOUTS.getAllLoadouts();
    
    loadouts.forEach(l => {
      if (l.role === 'dps') l.rarity = dpsRarity;
      else if (l.role === 'tank') l.rarity = tankRarity;
      else if (l.role === 'healer') l.rarity = healerRarity;
    });

    console.log(`✅ Set rarities by role:`);
    console.log(`  DPS → ${dpsRarity.toUpperCase()}`);
    console.log(`  Tank → ${tankRarity.toUpperCase()}`);
    console.log(`  Healer → ${healerRarity.toUpperCase()}`);
    console.table(loadouts.map(l => ({
      name: l.name,
      role: l.role,
      rarity: l.rarity
    })));
    console.log('🔄 Reopen fighter selection modal to see changes');
    return loadouts;
  },

  // Create a progression system where higher-level loadouts get higher rarities
  setByLevel: () => {
    const loadouts = window.LOADOUTS.getAllLoadouts();
    
    loadouts.forEach(l => {
      const level = l.unlockLevel || 1;
      if (level === 1) l.rarity = 'common';
      else if (level <= 3) l.rarity = 'uncommon';
      else if (level <= 5) l.rarity = 'rare';
      else if (level <= 7) l.rarity = 'epic';
      else l.rarity = 'legendary';
    });

    console.log(`✅ Set rarities based on unlock level:`);
    console.log('  Level 1: Common');
    console.log('  Level 2-3: Uncommon');
    console.log('  Level 4-5: Rare');
    console.log('  Level 6-7: Epic');
    console.log('  Level 8+: Legendary');
    console.table(loadouts.map(l => ({
      name: l.name,
      unlockLevel: l.unlockLevel,
      rarity: l.rarity
    })));
    console.log('🔄 Reopen fighter selection modal to see changes');
    return loadouts;
  },

  // Reset all rarities to common (default)
  resetAll: () => {
    const loadouts = window.LOADOUTS.getAllLoadouts();
    loadouts.forEach(l => l.rarity = 'common');
    console.log(`✅ Reset all ${loadouts.length} loadouts to COMMON rarity`);
    console.log('🔄 Reopen fighter selection modal to see changes');
    return loadouts;
  },

  // Test specific loadout's image paths
  testImages: (loadoutId) => {
    const loadout = window.LOADOUTS.getLoadout(loadoutId);
    if (!loadout) {
      console.error(`Loadout "${loadoutId}" not found!`);
      return false;
    }

    const rarity = loadout.rarity || 'common';
    const weaponType = loadout.weapon?.weaponType;
    const armor = loadout.armor || {};

    console.log(`📦 Image paths for: ${loadout.name} (${rarity})`);
    console.log('\n🗡️ WEAPON:');
    if (weaponType) {
      const weaponPath = `assets/items/${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${weaponType}.png`;
      console.log(`  ${weaponPath}`);
    } else {
      console.log('  No weapon assigned');
    }

    console.log('\n🛡️ ARMOR:');
    const armorSlots = ['helm', 'chest', 'shoulders', 'hands', 'belt', 'legs', 'feet', 'neck', 'accessory1', 'accessory2'];
    armorSlots.forEach(slot => {
      if (armor[slot]) {
        let slotDisplayName = slot;
        if (slot === 'accessory1' || slot === 'accessory2') slotDisplayName = 'bracelet';
        const armorPath = `assets/items/${rarity} ${slotDisplayName}.png`;
        console.log(`  ${slot}: ${armorPath}`);
      }
    });

    console.log('\n🔮 ABILITIES:');
    (loadout.abilities || []).forEach((abilityId, i) => {
      const ability = window.ABILITIES?.[abilityId];
      if (ability?.icon) {
        console.log(`  ${i + 1}. ${ability.name}: assets/skill icons/${ability.icon}`);
      } else {
        console.log(`  ${i + 1}. ${abilityId}: ❌ No icon defined`);
      }
    });

    return loadout;
  },

  // Show help for all commands
  help: () => {
    console.log(`✅ LOADOUT_TEST Commands Available:`);
    console.log(`  spawnRandomAllRarities() - Spawn 1 card of each rarity`);
    console.log(`  viewAll() - See all loadouts`);
    console.log(`  setRarity(loadoutId, rarity) - Set loadout rarity`);
    console.log(`  setAllRarity(rarity) - Set all loadouts to rarity`);
    console.log(`  randomizeRarities() - Random rarity for each loadout`);
    console.log(`  setByRole(dps, tank, healer) - Set by role`);
    console.log(`  setByLevel() - Set rarity based on unlock level`);
    console.log(`  resetAll() - Reset all to common`);
    console.log(`  testImages(loadoutId) - Test image paths for loadout`);
  }
};

console.log('✅ LOADOUT_TEST ready! Type: LOADOUT_TEST.spawnRandomAllRarities()');
