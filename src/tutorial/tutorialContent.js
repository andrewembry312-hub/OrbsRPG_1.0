/**
 * COMPREHENSIVE TUTORIAL CONTENT
 * Organized by learning tier with detailed explanations, images, and progression
 * 
 * NOTE: Image paths are set to null. To add images later, set image: 'path/to/image.png'
 */

export const TUTORIAL_CONTENT = {
  // ==================== TIER 1: ABSOLUTE BASICS ====================
  // Triggered: On first game launch
  
  welcome: {
    tier: 1,
    title: 'Welcome to Orb RPG - Complete Guide',
    priority: true,
    autoTrigger: 'ON_GAME_START',
    steps: [
      {
        title: 'Welcome, Adventurer!',
        content: 'Orb RPG is an epic fantasy adventure where you explore, fight enemies, collect powerful loot, build teams, recruit allies, control territory, and become a legendary hero!',
        image: null,
        tips: ['Progress is auto-saved', 'You can pause anytime', 'Experiment without fear']
      },
      {
        title: 'Controls & Movement',
        content: 'Master the basics:\n\n?? WASD - Move (W=forward, A=left, S=back, D=right)\n??? Mouse - Look around\n?? Left Click - Attack enemies/Interact with objects\n?? Q/E/R/T/F - Use your 5 combat abilities\n?? Tab - Open Inventory\n??? M - Open Map\nC - Character Sheet\n\nAll keys are customizable in Settings!',
        image: null,
        tips: ['Double-tap direction to sprint', 'Look for yellow glowing interactive objects', 'Mobile & Gamepad support available']
      },
      {
        title: 'Combat Fundamentals',
        content: 'How combat works:\n\n1?? Left-click enemies to attack with your weapon\n2?? Press Q/E/R/T/F to use special ABILITIES\n3?? Abilities cost Mana (blue) or Stamina (green)\n4?? After using, abilities go on COOLDOWN (timed wait)\n5?? Defeat enemies to earn XP and loot\n\nAbilities = Special powers. Plan your loadout!\nStronger abilities = longer cooldowns.',
        image: null,
        tips: ['You have 5 ability slots to customize', 'Balance damage, healing, and defense', 'Position matters - stay behind tanks!']
      },
      {
        title: 'Loot & Equipment',
        content: 'When you defeat enemies, they drop LOOT:\n\n?? Rarity Colors:\n?? COMMON - Basic items\n?? UNCOMMON - Better stats\n?? RARE - Good items\n?? EPIC - Great items\n?? LEGENDARY - Best items\n\nEach item has STATS (Strength, Vitality, etc.). Equip the best gear in your equipment slots to boost your power!',
        image: null,
        tips: ['Rarer items = better stats', 'Sell junk loot for gold', 'Equip as you go']
      },
      {
        title: 'Leveling & Progression',
        content: 'As you defeat enemies and complete content:\n\n? You EARN EXPERIENCE (XP)\n?? Accumulate XP ? LEVEL UP\n?? Level up ? Get STAT POINTS & new unlocks\n\nAllocate Stat Points to:\n� STRENGTH - Melee damage\n� INTELLIGENCE - Magic power\n� VITALITY - Health & Defense\n� DEXTERITY - Speed & Evasion\n� CONSTITUTION - Stamina\n\nHigher level = stronger stats, new abilities, new areas!',
        image: null,
        tips: ['Plan your stat allocation', 'Different builds need different stats', 'You can respec for gold']
      },
      {
        title: 'Groups & Team Building',
        content: 'Recruit NPCs to join your TEAM:\n\n?? Build balanced groups:\n??? TANK - High armor, protects team\n?? DPS - High damage, fragile\n?? HEALER - Restores health\n?? UTILITY - Special support\n\nYour team fights WITH you! They level up, gain abilities, and can be customized. Good teams = winning battles!',
        image: null,
        tips: ['Balance is key', 'Each member has unique abilities', 'Equip your team with gear']
      },
      {
        title: 'Territory & Outposts',
        content: 'Capture OUTPOSTS to control the map:\n\n?? How it works:\n1. Travel to an outpost\n2. Defeat all enemies\n3. Interact with the flag\n4. Hold position to capture\n\n?? Your outposts generate:\n� GOLD - Currency for buying\n� RESOURCES - For crafting\n� POWER - For team upgrades\n\nMore outposts = More power!',
        image: null,
        tips: ['Deploy guards to defend territory', 'Enemies will try to capture your outposts', 'Territory control wins campaigns']
      },
      {
        title: 'Dungeons & Challenges',
        content: 'Enter DUNGEONS for epic challenges:\n\n?? Dungeons feature:\n� Waves of powerful enemies\n� Boss encounters\n� One-time completion rewards\n� Epic loot drops\n� Strategy & teamwork required\n\n?? Difficulty Levels:\n?? EASY - Learning\n?? NORMAL - Balanced\n?? HARD - Challenging\n?? EXTREME - Hardcore\n\nHigher difficulty = Better loot!',
        image: null,
        tips: ['Learn boss patterns', 'Use consumables wisely', 'Coordinate with your team']
      },
      {
        title: 'Fighter Cards System',
        content: '?? FIGHTER CARDS are your most powerful allies!\n\nEvery time you LEVEL UP, you receive a random fighter card:\n\n� Different classes (Tank, DPS, Healer)\n� Various rarities (Common to Legendary)\n� Unique abilities & equipment\n� Deploy to slots for team buffs\n\nCollect, deploy, and upgrade cards to build unstoppable teams!\n\nFirst card revealed after tutorial!',
        image: null,
        tips: ['Cards get stronger with levels', 'Rarity = power level', 'Collect all rarities!']
      },
      {
        title: 'Buffs & Debuffs Explained',
        content: 'During combat, temporary effects appear:\n\n?? BUFFS (Good):\n� Increased damage\n� Faster attack speed\n� Damage reduction\n� Healing over time\n� Protection shields\n\n?? DEBUFFS (Bad):\n� Reduced damage\n� Slowed movement\n� Damage over time\n� Silenced (no abilities)\n\nManage effects to maximize benefits!',
        image: null,
        tips: ['Buffs show as green icons', 'Debuffs show as red icons', 'Cleanse removes debuffs']
      },
      {
        title: 'Markets & Trading',
        content: 'Visit MERCHANTS to buy/sell:\n\n?? Selling:\n� Click merchant ? Sell\n� Select unwanted items\n� Get gold instantly\n\n??? Buying:\n� Click merchant ? Browse\n� Select items to purchase\n� Spend gold to acquire\n\n?? Trading:\n� Trade with other players\n� Exchange equipment & materials\n� Negotiate or fixed prices\n\nMerchants restock daily!',
        image: null,
        tips: ['Sell junk for gold', 'Buy gear between dungeons', 'Compare prices at different merchants']
      },
      {
        title: 'Combat Tactics & Tips',
        content: '?? Advanced Combat:\n\n?? POSITIONING:\n� Stay behind tanks\n� Ranged units away from melee\n� Healer in safe spot\n� Group for buffs, spread for AoE\n\n?? ABILITY ROTATION:\n� Use strong abilities first\n� Keep buffs active\n� Manage resource (mana/stamina)\n� Time cooldowns\n\n?? READING ENEMIES:\n� Watch boss animations\n� Learn attack patterns\n� Counter their abilities\n� Exploit weaknesses',
        image: null,
        tips: ['First dungeon = learning', 'Repeat to master patterns', 'Adapt strategy per boss']
      },
      {
        title: 'UI Overview',
        content: 'Your interface:\n\n?? Top-Left: Health & Mana bars\n?? Bottom-Center: Ability bar (Q/E/R/T/F)\n??? Top-Right: Minimap\n?? Press Tab: Inventory\n\nKey Screens:\n� C = Character Sheet\n� G = Group Management\n� M = World Map\n� ESC = Main Menu\n� I/H = Help & Tutorials\n\nHover over elements for tooltips!',
        image: null,
        tips: ['All UI is customizable', 'You can move/resize elements', 'Settings ? UI for options']
      },
      {
        title: 'Ready to Begin!',
        content: 'You now know the essentials of Orb RPG:\n\n? Combat & abilities\n? Loot & equipment\n? Leveling & progression\n? Teams & group management\n? Territory & outposts\n? Dungeons & challenges\n? Fighter cards\n? Markets & trading\n\nYou can disable tutorials anytime in Settings. Access them later via Help menu.\n\nGood luck, hero! ??',
        image: null,
        tips: ['Start small - defeat nearby enemies', 'Build your team gradually', 'Experiment with different builds'],
        showToggle: true
      }
    ]
  },

  movement: { tier: 1, title: 'DEPRECATED - See Welcome Tutorial', autoTrigger: 'NONE', steps: [{ title: 'Merged', content: 'This content has been consolidated into the Welcome tutorial.', image: null, tips: [] }] },

  uiNavigation: { tier: 1, title: 'DEPRECATED - See Welcome Tutorial', autoTrigger: 'NONE', steps: [{ title: 'Merged', content: 'This content has been consolidated into the Welcome tutorial.', image: null, tips: [] }] },

  combatBasics: { tier: 2, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  abilityIntro: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  abilitySlots: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 3: LOOT & INVENTORY ====================
  // Triggered: On first loot drop
  
  lootSystem: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  inventory: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 4: EQUIPMENT SYSTEM ====================
  // Triggered: On first equipment pickup or level up
  
  equipmentSystem: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 5: PROGRESSION ====================
  // Triggered: On first level up or XP gain
  
  progressionSystem: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 6: GROUPS & ALLIES ====================
  // Triggered: When player recruits first NPC or hits level milestone
  
  groupSystem: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  abilityAssignment: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 7: BUFFS & DEBUFFS ====================
  // Triggered: On first buff applied or debuff taken
  
  buffsDebuffs: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 8: OUTPOSTS ====================
  // Triggered: When player reaches outpost control level/area
  
  outpostSystem: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 9: DUNGEONS ====================
  // Triggered: When player reaches dungeon area
  
  dungeonIntro: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 10: MARKET & TRADING ====================
  // Triggered: When player reaches market/town area
  
  market: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 11: GUARDS SYSTEM ====================
  // Triggered: When guard slot unlocks
  
  guardSystem: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== TIER 12: ADVANCED TIPS ====================
  // Triggered: Scattered throughout gameplay based on progress
  
  combatTactics: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  farmingGuide: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  // ==================== FIGHTER CARDS SYSTEM ====================
  // Triggered: Early in game progression
  
  fighterCards: {
    tier: 2,
    title: 'Fighter Cards System',
    priority: false,
    autoTrigger: 'ON_FIRST_LEVEL_UP',
    steps: [
      {
        title: '?? Fighter Cards Explained',
        content: 'Fighter Cards are your most powerful allies! Each time you level up, you receive a new random fighter card.\n\nThese cards represent recruit-able NPCs that join your team to fight alongside you.\n\n� Different classes (DPS, Tank, Healer)\n� Various rarity tiers\n� Unique equipment & abilities',
        image: null,
        tips: ['Cards are powerful - build a strong team!', 'Rarity affects power', 'Collect them all!'],
        showButton: true,
        buttonText: 'Roll My First Card',
        buttonAction: 'triggerFreeCardRoll'
      },
      {
        title: 'Your First Card Roll',
        content: 'You just received your first fighter card! The animation shows:\n\n1. Random card images flash for 2 seconds\n2. Your new card reveals at full size\n3. Card name, level, and rarity display\n\nYou can now see your card in the Cards tab!',
        image: null,
        tips: ['Each level up gives a new card', 'Higher level = better cards', 'Collect all rarities!']
      }
    ]
  },

  cardsTab: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  slots: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  inventory: {
    tier: 2,
    title: 'Inventory & Items',
    autoTrigger: 'NONE',
    steps: [
      {
        title: '?? The Inventory Tab',
        content: 'The Inventory Tab shows all your equipment and items.\n\nLeft side: Your hero with equipped gear\nMiddle: Stats and details\nRight side: All items you\'ve collected\n\nPress P on any item for a full preview!',
        image: null,
        tips: ['Double-click to equip quickly', 'Better gear = stronger stats', 'Keep your best items equipped'],
        autoShowTab: 'inventory',
        autoScroll: true
      },
      {
        title: 'Finding Loot',
        content: 'Loot appears from:\n\n� Defeated enemies (auto-collected)\n� Treasure chests (in dungeons)\n� Merchants (buy with gold)\n� Boss drops (very powerful!)\n� Ground pickups (items in world)\n\nKeep exploring to find better gear!',
        image: null,
        tips: ['Color = rarity (gold = rare)', 'Higher level = better stats', 'Equip as you go']
      }
    ]
  },

  groupTab: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  alliesTab: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  campaignTab: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  outpostMarket: { tier: 0, title: 'DEPRECATED', autoTrigger: 'NONE', steps: [{ title: 'N/A', content: 'Merged into welcome.', image: null, tips: [] }] },

  garrison: {
    tier: 3,
    title: 'Garrison Management',
    autoTrigger: 'ON_REACH_OUTPOST_AREA',
    steps: [
      {
        title: '?? The Garrison',
        content: 'At outposts with Garrison buttons, you can:\n\n� Station guards to defend\n� Upgrade defenses\n� Manage stationed forces\n� View garrison status\n� Call reinforcements\n\nGarrison = home base defense!',
        image: null,
        tips: ['Garrison troops auto-defend', 'Upgrade regularly', 'Don\'t leave undefended']
      },
      {
        title: 'Garrison Strategy',
        content: 'Strategic garrison tips:\n\n1. Station strong units\n2. Upgrade defenses\n3. Keep supplies stocked\n4. Rotate troops\n5. Respond to threats\n\nGood garrison = territory stays yours!',
        image: null,
        tips: ['Defense is important', 'Don\'t ignore garrison', 'Balance offense & defense']
      }
    ]
  }
};

// Map of trigger conditions to tutorial IDs
// Most are now consolidated into the welcome tutorial
// Only active tutorials should be triggered
export const TRIGGER_MAPPING = {
  'ON_GAME_START': 'welcome',
  'ON_FIRST_LEVEL_UP': 'fighterCards'
  // All other tutorials consolidated into welcome
};
