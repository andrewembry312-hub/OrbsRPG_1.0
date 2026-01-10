// Loadout Testing Console Commands
// Automatically loads and makes LOADOUT_TEST available in browser console

// Wait for LOADOUTS to be available
let loadAttempts = 0;
const initLoadoutCommands = () => {
  if (!window.LOADOUTS || !window.ABILITIES) {
    loadAttempts++;
    if (loadAttempts === 1) {
      console.log('⏳ Waiting for LOADOUTS and ABILITIES to load...');
    }
    if (loadAttempts > 50) { // Stop after 5 seconds (50 * 100ms)
      console.warn('⚠️ LOADOUT_TEST failed to load: LOADOUTS or ABILITIES not available');
      console.log('LOADOUTS available:', !!window.LOADOUTS);
      console.log('ABILITIES available:', !!window.ABILITIES);
      return;
    }
    setTimeout(initLoadoutCommands, 100);
    return;
  }
  
  if (loadAttempts > 0) {
    console.log('✅ LOADOUTS and ABILITIES loaded! LOADOUT_TEST ready.');
  }

  window.LOADOUT_TEST = {
  // View all loadouts with their rarities
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

  // Show progression system design suggestions
  help: () => {
    console.log(`
═══════════════════════════════════════════════════════════
  🎴 FIGHTER CARD PROGRESSION SYSTEM - Design Guide
═══════════════════════════════════════════════════════════

📊 CURRENT STATE:
  • 24 regular loadouts + 2 guard-only loadouts
  • All regular loadouts unlock at level 1
  • Each loadout has: role, class, weapon, armor, abilities
  • Rarity system: common, uncommon, rare, epic, legendary
  • Rarities affect weapon/armor stats (bonus damage/defense)

💡 PROGRESSION SYSTEM OPTIONS:

1️⃣ LEVEL-BASED UNLOCKS (Simple)
   • Fighters unlock as you level up
   • Example: Common at lvl 1, Uncommon at lvl 3, Rare at lvl 5
   • Command: LOADOUT_TEST.setByLevel()

2️⃣ RARITY DROPS (Loot-based)
   • Fighters drop from enemies/bosses
   • Higher rarities = rarer drops
   • Could use existing loot system
   • Pros: Exciting, replayable
   • Cons: Need drop tables, RNG frustration

3️⃣ SKILL POINT PURCHASE (Currency)
   • Spend skill points to unlock fighters
   • Higher rarity = higher cost
   • Example: Common=1 SP, Epic=5 SP
   • Pros: Player choice, deterministic
   • Cons: Competes with slot upgrades

4️⃣ ACHIEVEMENT-BASED (Quest-like)
   • Unlock fighters by completing tasks
   • Example: "Defeat 50 enemies with tank" unlocks rare tank
   • Pros: Engaging, teaches mechanics
   • Cons: Development time, tracking needed

5️⃣ HYBRID SYSTEM (Recommended)
   • Start with common fighters (level 1)
   • Higher rarities unlock at higher levels OR drop from bosses
   • Zone bosses drop specific fighter cards
   • Pros: Multiple progression paths
   • Cons: More complex

🎯 FIGHTER CARD LEVELING/RATING IDEAS:

Option A: Static Cards (Current)
  • Each fighter card has fixed stats based on rarity
  • Simple, predictable
  • Example: Epic Warrior = +60% stats always

Option B: Level-able Cards
  • Cards gain levels when used in combat
  • Level 1-10 progression per card
  • Higher level = better stats
  • Adds long-term progression
  • Example: Epic Warrior Lvl 5 = +80% stats

Option C: Star Rating System
  • Cards can be "upgraded" using resources
  • 1-5 star system
  • Higher stars = better stats/abilities
  • Example: 3★ Epic Warrior unlocks 6th ability slot

Option D: Infinite Rarity Variants (TCG-style)
  • Same fighter, multiple rarity versions exist
  • Collect them all for different builds
  • Example: "Common Berserker" vs "Legendary Berserker"
  • Pros: Infinite content, replayability
  • Cons: Inventory management, UI complexity

🔧 TESTING COMMANDS:

View all loadouts:
  LOADOUT_TEST.viewAll()

Set specific rarity:
  LOADOUT_TEST.setRarity('warrior_melee_basic', 'legendary')

Set all to epic:
  LOADOUT_TEST.setAllRarity('epic')

Randomize for variety:
  LOADOUT_TEST.randomizeRarities()

Set by role (DPS/Tank/Healer):
  LOADOUT_TEST.setByRole('rare', 'legendary', 'epic')

Level-based progression:
  LOADOUT_TEST.setByLevel()

Test image paths:
  LOADOUT_TEST.testImages('knight_basic')

Reset to defaults:
  LOADOUT_TEST.resetAll()

═══════════════════════════════════════════════════════════
    `);
    }
  };

  // Auto-run help on load
  console.log('✅ Loadout testing commands loaded!');
  console.log('Type LOADOUT_TEST.help() for progression system guide');
  console.log('Type LOADOUT_TEST.viewAll() to see all loadouts');
};

// Start initialization
initLoadoutCommands();
