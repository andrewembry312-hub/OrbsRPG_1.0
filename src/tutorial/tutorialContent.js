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
    title: 'Welcome to Orb RPG',
    priority: true,
    autoTrigger: 'ON_GAME_START',
    steps: [
      {
        title: 'Welcome, Adventurer!',
        content: 'Orb RPG is an epic fantasy adventure where you explore dungeons, recruit allies, battle enemies, and become a legendary hero.',
        image: null,
        tips: ['This tutorial can be disabled at any time', 'You can access tutorials anytime from the Help menu', 'Each tutorial takes 1-3 minutes']
      },
      {
        title: 'Game Overview',
        content: 'Your journey consists of:\n• Exploring and fighting enemies\n• Collecting powerful loot\n• Building your team\n• Controlling outposts\n• Conquering dungeons',
        image: null,
        tips: ['Progress is saved automatically', 'You can pause anytime', 'Experiment without fear']
      },
      {
        title: 'Controls Quick Guide',
        content: 'WASD - Move around\nMouse - Look around\nLeft Click - Attack/Interact\nQ/E/R/T/F - Use Abilities\nTab - Inventory\nM - Map',
        image: null,
        tips: ['All keys are customizable in settings', 'Mobile support available', 'Gamepad compatible']
      },
      {
        title: 'Disable Tutorials?',
        content: 'You can disable tutorials at any time from the game settings. To re-enable them, go to Help → Enable Tutorials.\n\nReady to start?',
        image: null,
        tips: ['Tutorials auto-show at important moments', 'Skip any tutorial if you prefer', 'Progress is tracked'],
        showToggle: true // Show disable button here
      }
    ]
  },

  movement: {
    tier: 1,
    title: 'Movement & Navigation',
    autoTrigger: 'NONE', // Manual trigger only
    steps: [
      {
        title: 'Movement Basics',
        content: 'Use WASD keys to move around the world.\n• W - Forward\n• A - Left\n• S - Backward\n• D - Right',
        image: null,
        tips: ['You can move and look around simultaneously', 'Double-tap to sprint (if available)']
      },
      {
        title: 'Camera Control',
        content: 'Use your mouse to look around. The game uses first-person perspective so you can see everything ahead.',
        image: null,
        tips: ['Adjust mouse sensitivity in settings if needed']
      },
      {
        title: 'Interacting with Objects',
        content: 'Move near objects (NPCs, chests, portals) and left-click to interact. Yellow glowing objects are interactive.',
        image: null,
        tips: ['Look for the glow effect to know what\'s interactive']
      }
    ]
  },

  uiNavigation: {
    tier: 1,
    title: 'UI Navigation',
    autoTrigger: 'NONE',
    steps: [
      {
        title: 'Main Interface',
        content: 'Your main UI includes:\n• Health & Mana bars (top-left)\n• Ability bar (bottom-center)\n• Minimap (top-right)\n• Inventory (Tab key)',
        image: null,
        tips: ['All UI elements have tooltips - hover over them', 'UI is fully customizable']
      },
      {
        title: 'Opening Menus',
        content: 'ESC - Main Menu\nTab - Inventory\nC - Character Sheet\nG - Group Screen\nM - Map\nI - Help & Tutorials',
        image: null,
        tips: ['Menus pause the game when open', 'Can have multiple menus open']
      }
    ]
  },

  // ==================== TIER 2: CORE COMBAT ====================
  // Triggered: On first enemy encounter
  
  combatBasics: {
    tier: 2,
    title: 'Combat Fundamentals',
    priority: true,
    autoTrigger: 'ON_FIRST_ENEMY',
    steps: [
      {
        title: 'Starting a Fight',
        content: 'When enemies appear, your health bar becomes visible. Left-click on enemies to attack them with your basic weapon attack.',
        image: null,
        tips: ['You deal automatic damage when close to enemies', 'Keep distance if you\'re squishy', 'Position matters!']
      },
      {
        title: 'Taking Damage',
        content: 'Your health bar (top-left) shows your current HP. When you take damage, it decreases. If it reaches 0, you die and respawn at the last safe location.',
        image: null,
        tips: ['Red bar = health', 'Potions restore health (more on this later)', 'Some abilities heal you']
      },
      {
        title: 'Victory!',
        content: 'Defeat all enemies to win the encounter. You\'ll receive experience, loot, and potentially new equipment.',
        image: null,
        tips: ['Check your inventory for drops', 'Gold is your currency', 'Experience leads to leveling up']
      }
    ]
  },

  abilityIntro: {
    tier: 2,
    title: 'Abilities Explained',
    autoTrigger: 'ON_FIRST_ENEMY',
    steps: [
      {
        title: 'What Are Abilities?',
        content: 'Abilities are special powers that your character can use in combat. They\'re more powerful than basic attacks but cost resources (Mana or Stamina) and have cooldowns.',
        image: null,
        tips: ['Each ability has a unique effect', 'You can have up to 5 active abilities', 'Abilities define your playstyle']
      },
      {
        title: 'Using Abilities',
        content: 'Press Q, E, R, T, or F to activate your 5 ability slots.\n\nThe ability bar shows:\n• Ability icon\n• Cooldown timer\n• Current status (ready/cooldown)',
        image: null,
        tips: ['Abilities are listed left-to-right', 'When on cooldown, the ability is grayed out', 'Some abilities heal, some damage, some buff']
      },
      {
        title: 'Mana & Stamina',
        content: 'Most abilities cost Mana (blue) or Stamina (green). When you use an ability, the cost is deducted. When you run out of resources, you can\'t use that ability until it regenerates.',
        image: null,
        tips: ['Rest to regenerate quickly', 'Different abilities cost different amounts', 'Plan your ability usage carefully']
      },
      {
        title: 'Cooldowns',
        content: 'After using an ability, it enters "cooldown" - a wait period before you can use it again. This prevents spamming powerful abilities.',
        image: null,
        tips: ['Shorter cooldowns = spam more often', 'Longer cooldowns = bigger effect', 'Cooldown timer shows when ready']
      }
    ]
  },

  abilitySlots: {
    tier: 2,
    title: 'Ability Slot System',
    autoTrigger: 'ON_INVENTORY_OPEN',
    steps: [
      {
        title: 'Your Ability Slots',
        content: 'You have 5 ability slots (Q, E, R, T, F). Each slot holds one ability. Assign different abilities to each slot to customize your loadout.',
        image: null,
        tips: ['Start with basic abilities', 'Unlock more abilities as you level up', 'Different weapons provide different ability options']
      },
      {
        title: 'Changing Abilities',
        content: 'Open your Inventory (Tab), then navigate to the Skills tab. Click on an ability slot and select an ability to assign it. Different weapons may provide different abilities.',
        image: null,
        tips: ['You can swap anytime outside combat', 'Some abilities are locked until you level up', 'Experiment with different combinations']
      },
      {
        title: 'Ability Types',
        content: 'Abilities fall into categories:\n• DAMAGE - Deal harm to enemies\n• HEAL - Restore your/allies\' health\n• BUFF - Enhance your stats temporarily\n• DEBUFF - Weaken enemies\n• UTILITY - Special effects',
        image: null,
        tips: ['Balance your loadout', 'Most good builds have 3 damage, 1 heal, 1 utility']
      }
    ]
  },

  // ==================== TIER 3: LOOT & INVENTORY ====================
  // Triggered: On first loot drop
  
  lootSystem: {
    tier: 3,
    title: 'Loot & Rarity',
    priority: true,
    autoTrigger: 'ON_FIRST_LOOT',
    steps: [
      {
        title: 'What is Loot?',
        content: 'When you defeat enemies, they drop items called "loot". Loot includes:\n• Equipment (armor, weapons)\n• Consumables (potions, scrolls)\n• Materials (crafting components)\n• Currency (gold)',
        image: null,
        tips: ['Loot appears on the ground as glowing items', 'Click to pick up', 'Some items are more valuable than others']
      },
      {
        title: 'Rarity Tiers',
        content: 'Items have different rarity levels:\n🔵 COMMON - Basic items\n🟢 UNCOMMON - Better stats\n🔵 RARE - Good items\n🟣 EPIC - Great items\n🟡 LEGENDARY - Best items\n\nRarer = Better stats = More valuable',
        image: null,
        tips: ['Color indicates rarity at a glance', 'Compare items before deciding', 'Sell common items for gold']
      },
      {
        title: 'Item Stats',
        content: 'Each item shows:\n• Name & rarity color\n• Armor/Damage values\n• Special stats (Strength, Vitality, etc.)\n• Special properties (might grant abilities)',
        image: null,
        tips: ['Higher numbers = better', 'Look for stats that match your playstyle', 'Hover to see full description']
      },
      {
        title: 'Managing Loot',
        content: 'Your inventory has limited space. You can:\n• Keep useful items\n• Sell unwanted items for gold\n• Drop items to make space\n• Use items immediately',
        image: null,
        tips: ['Sell junk to merchants', 'Keep gear for future use', 'Some items are quest-related']
      }
    ]
  },

  inventory: {
    tier: 3,
    title: 'Inventory Management',
    autoTrigger: 'ON_INVENTORY_FULL',
    steps: [
      {
        title: 'Opening Your Inventory',
        content: 'Press TAB to open your inventory. This shows all items you\'re carrying, organized by category:\n• Equipment\n• Consumables\n• Materials\n• Quest Items',
        image: null,
        tips: ['Inventory is organized by tabs', 'Sort by name, rarity, or value']
      },
      {
        title: 'Carrying Capacity',
        content: 'You have a weight limit (shown at bottom of inventory). Heavy items take up more space. When full, you can\'t pick up more items until you make space.',
        image: null,
        tips: ['Sell heavy items you don\'t need', 'Use potions to free up space', 'Some items compress into stacks']
      },
      {
        title: 'Using Items',
        content: 'Right-click an item to use it:\n• Potions - Restore health/mana\n• Scrolls - Cast spells\n• Materials - Ingredients for crafting\n• Gear - Equip it',
        image: null,
        tips: ['Consumables disappear after use', 'Equipment can be used forever']
      },
      {
        title: 'Selling Items',
        content: 'Visit a merchant and click "Sell". Select items to sell and get gold in return. You can sell:\n• Duplicate gear\n• Items you don\'t need\n• Junk loot\n• Materials you don\'t want',
        image: null,
        tips: ['Rarer items sell for more', 'Check prices - don\'t undersell', 'Merchants are in towns']
      }
    ]
  },

  // ==================== TIER 4: EQUIPMENT SYSTEM ====================
  // Triggered: On first equipment pickup or level up
  
  equipmentSystem: {
    tier: 4,
    title: 'Equipment & Gear',
    priority: true,
    autoTrigger: 'ON_FIRST_EQUIPMENT',
    steps: [
      {
        title: 'Equipment Slots',
        content: 'Your character has equipment slots:\n• Head - Helmets, crowns\n• Chest - Armor\n• Hands - Gauntlets, bracers\n• Legs - Pants, leggings\n• Feet - Boots, shoes\n• Jewelry - Rings, amulets\n• Weapons - Left & Right hands',
        image: null,
        tips: ['Fill all slots for best stats', 'Different items have different bonuses', 'Dual-wielding possible']
      },
      {
        title: 'Comparing Gear',
        content: 'When looking at equipment, compare:\n• Armor rating (defense)\n• Damage (for weapons)\n• Special stats (Strength, Intelligence, etc.)\n• Special properties (grants abilities, buffs)',
        image: null,
        tips: ['Hover over items to see full stats', 'Green text = upgrade, Red text = downgrade', 'Higher level = generally better']
      },
      {
        title: 'Equipping Items',
        content: 'To equip an item:\n1. Open Inventory (Tab)\n2. Right-click an item\n3. Select "Equip"\n\nThe item moves to the equipment slot and you gain its bonuses immediately.',
        image: null,
        tips: ['Equip instantly = stat boost', 'Can swap anytime outside combat', 'Unequip to sell or store']
      },
      {
        title: 'Stat Bonuses',
        content: 'Equipment provides stat bonuses:\n🔴 STRENGTH - Melee damage, carrying capacity\n🔵 INTELLIGENCE - Magic damage, mana pool\n🟢 VITALITY - Health points, defense\n🟡 DEXTERITY - Attack speed, evasion\n⚫ CONSTITUTION - Stamina, endurance',
        image: null,
        tips: ['Stack same stats for bigger bonuses', 'Different classes benefit from different stats', 'Plan your gear strategy']
      }
    ]
  },

  // ==================== TIER 5: PROGRESSION ====================
  // Triggered: On first level up or XP gain
  
  progressionSystem: {
    tier: 5,
    title: 'Leveling & Progression',
    priority: true,
    autoTrigger: 'ON_FIRST_XP',
    steps: [
      {
        title: 'Experience Points (XP)',
        content: 'When you defeat enemies, complete quests, or achieve goals, you gain Experience Points (XP). XP is displayed in your character sheet.',
        image: null,
        tips: ['Stronger enemies give more XP', 'Quests give big XP rewards', 'Your XP bar shows progress to next level']
      },
      {
        title: 'Leveling Up',
        content: 'When you accumulate enough XP, you level up! Your stats increase and you may unlock:\n• New abilities\n• Better equipment slots\n• Skill points to allocate\n• New areas to explore',
        image: null,
        tips: ['You get a reward popup when leveling', 'Leveling makes you stronger', 'Unlocks are automatic']
      },
      {
        title: 'Stat Allocation',
        content: 'When you level up, you earn Stat Points. Allocate them to:\n• STRENGTH - Melee damage\n• INTELLIGENCE - Magic power\n• VITALITY - Health/Defense\n• DEXTERITY - Speed/Evasion\n• CONSTITUTION - Stamina',
        image: null,
        tips: ['Plan your build ahead', 'Different builds need different stats', 'Respec available for gold']
      },
      {
        title: 'Unlocking Content',
        content: 'As you level, you unlock:\n✓ New areas and dungeons\n✓ Advanced abilities\n✓ Group members\n✓ Outpost control\n✓ Market access\n\nCheck the progression guide for full list.',
        image: null,
        tips: ['Keep leveling to unlock everything', 'Each tier unlocks new gameplay', 'Plan progression carefully']
      }
    ]
  },

  // ==================== TIER 6: GROUPS & ALLIES ====================
  // Triggered: When player recruits first NPC or hits level milestone
  
  groupSystem: {
    tier: 6,
    title: 'Groups & Team Management',
    priority: true,
    autoTrigger: 'ON_RECRUIT_NPC',
    steps: [
      {
        title: 'What Are Groups?',
        content: 'A group is your team of allied NPCs that follow you and fight alongside you. You can recruit multiple members from different classes and coordinate them in battle.',
        image: null,
        tips: ['Groups make you stronger', 'Different members have different abilities', 'Up to 4 group members']
      },
      {
        title: 'Recruiting Members',
        content: 'Visit the recruitment hall or find NPCs in the world. Click "Recruit" to add them to your team. Each member has:\n• Class (Warrior, Mage, Ranger, Priest)\n• Level\n• Abilities\n• Personality',
        image: null,
        tips: ['Look for balanced team composition', 'High-level members are stronger', 'Each class fills different roles']
      },
      {
        title: 'Team Composition',
        content: 'Build a balanced team:\n🗡️ TANK - High armor, holds aggro\n🔥 DPS - High damage, fragile\n🏹 RANGED - Distance attacker\n💚 HEALER - Restores health\n\nGoal: 1 tank, 2 DPS, 1 healer',
        image: null,
        tips: ['Balance is key', 'Different encounters need different teams', 'Experiment']
      },
      {
        title: 'Group Inventory',
        content: 'Your group shares an inventory. Items picked up are shared, making more space available. You can distribute items:\n• Give equipment to members\n• Share potions\n• Organize materials',
        image: null,
        tips: ['Shared inventory = more space', 'Equip members with best gear', 'Share potions among group']
      }
    ]
  },

  abilityAssignment: {
    tier: 6,
    title: 'Managing Group Abilities',
    autoTrigger: 'ON_RECRUIT_NPC',
    steps: [
      {
        title: 'Assigning Abilities',
        content: 'Each group member has ability slots just like you. Open the group screen and click on a member to assign their abilities:\n1. Click member portrait\n2. Click ability slot\n3. Select ability to assign',
        image: null,
        tips: ['Each member has different available abilities', 'Assign based on their class', 'Can change anytime']
      },
      {
        title: 'Ability Strategy',
        content: 'Different roles need different abilities:\n\nTANK: Defensive, taunt, group shields\nDPS: Damage, burst, position control\nHEALER: Healing, buffs, cleanse\nRANGED: Distance damage, crowd control',
        image: null,
        tips: ['Match abilities to roles', 'Synergize abilities', 'Test different loadouts']
      },
      {
        title: 'Member Leveling',
        content: 'Group members gain XP and level up alongside you. As they level:\n• Stats increase\n• New abilities unlock\n• Equipment improves\n\nKeep members well-equipped for best performance.',
        image: null,
        tips: ['Share best gear', 'All members benefit from your stat bonuses', 'Level up strategically']
      }
    ]
  },

  // ==================== TIER 7: BUFFS & DEBUFFS ====================
  // Triggered: On first buff applied or debuff taken
  
  buffsDebuffs: {
    tier: 7,
    title: 'Buffs & Debuffs Explained',
    priority: true,
    autoTrigger: 'ON_FIRST_BUFF',
    steps: [
      {
        title: 'What Are Buffs?',
        content: 'Buffs are temporary enhancements that improve your stats or abilities:\n• Increased damage\n• Damage resistance\n• Faster attack speed\n• Healing over time\n• Protection shields\n\nThey last for a duration, then disappear.',
        image: null,
        tips: ['Buffs are beneficial', 'Multiple buffs can stack', 'They show in your buff bar']
      },
      {
        title: 'What Are Debuffs?',
        content: 'Debuffs are temporary penalties from enemies:\n• Reduced damage\n• Slower movement\n• Damage over time\n• Reduced defense\n• Silenced (can\'t use abilities)\n\nDebuffs hurt you and should be removed when possible.',
        image: null,
        tips: ['Debuffs are harmful', 'Some debuffs are stronger than others', 'Cleanse removes debuffs']
      },
      {
        title: 'Buff/Debuff Icons',
        content: 'Above your character and enemies, you\'ll see small icons:\n\n🟢 Green icons = Buffs (good)\n🔴 Red icons = Debuffs (bad)\n\nHover over icons to see what they do and how long they last.',
        image: null,
        tips: ['Icons show all active effects', 'Duration timer below each icon', 'Can have up to 10 active']
      },
      {
        title: 'Managing Effects',
        content: 'To maximize buffs and minimize debuffs:\n1. Keep important buffs active\n2. Cleanse harmful debuffs\n3. Stack beneficial buffs\n4. Time buffs before big fights\n5. Use immunity abilities for debuffs',
        image: null,
        tips: ['Cleanse removes debuffs instantly', 'Some abilities provide immunity', 'Plan buff timing']
      }
    ]
  },

  // ==================== TIER 8: OUTPOSTS ====================
  // Triggered: When player reaches outpost control level/area
  
  outpostSystem: {
    tier: 8,
    title: 'Outposts & Territory',
    priority: true,
    autoTrigger: 'ON_REACH_OUTPOST_AREA',
    steps: [
      {
        title: 'What Are Outposts?',
        content: 'Outposts are strategic locations across the map. You can:\n• Capture neutral outposts\n• Defend your territory\n• Gather resources\n• Build defenses\n• Fight for control with other players\n\nEach outpost is marked on your map.',
        image: null,
        tips: ['More outposts = more power', 'Outposts generate resources over time', 'Enemies try to capture them']
      },
      {
        title: 'Capturing Outposts',
        content: 'To capture a neutral outpost:\n1. Travel to its location\n2. Defeat all enemies\n3. Interact with the flag\n4. Hold the flag until captured\n\nOnce captured, the outpost becomes yours.',
        image: null,
        tips: ['Defending the flag takes time', 'Enemies can interrupt capture', 'Bring allies for easier capture']
      },
      {
        title: 'Defending Territory',
        content: 'Deploy guards at your outposts to defend them:\n1. Open outpost menu\n2. Click "Deploy Guards"\n3. Station guards at the flag\n4. Guards fight enemies automatically\n\nStronger guards = better defense.',
        image: null,
        tips: ['Guards cost resources', 'Multiple guards = stronger defense', 'Guards level up over time']
      },
      {
        title: 'Resource Generation',
        content: 'Your outposts generate:\n💰 Gold - Currency\n⚡ Mana Crystals - For abilities\n📦 Materials - For crafting\n\nMore outposts = more resources = faster progress.',
        image: null,
        tips: ['Resources accumulate over time', 'Collect them regularly', 'More outposts = exponential growth']
      }
    ]
  },

  // ==================== TIER 9: DUNGEONS ====================
  // Triggered: When player reaches dungeon area
  
  dungeonIntro: {
    tier: 9,
    title: 'Dungeons & Challenges',
    priority: true,
    autoTrigger: 'ON_REACH_DUNGEON',
    steps: [
      {
        title: 'What Are Dungeons?',
        content: 'Dungeons are challenging instanced areas with:\n• Waves of powerful enemies\n• Boss encounters\n• Special mechanics\n• Epic loot rewards\n• One-time plays\n\nDungeons require strategy and teamwork to complete.',
        image: null,
        tips: ['Prepare before entering', 'Bring full group', 'Bosses have special abilities']
      },
      {
        title: 'Difficulty Levels',
        content: 'Dungeons come in difficulties:\n🟢 EASY - Tutorial, good for learning\n🔵 NORMAL - Balanced challenge\n🟣 HARD - Demanding, good rewards\n🔴 EXTREME - Hardcore challenge\n\nHigher difficulty = Better loot',
        image: null,
        tips: ['Start easy and work up', 'Gear-check before hard mode', 'Extreme requires skill']
      },
      {
        title: 'Mechanics & Bosses',
        content: 'Each dungeon has unique mechanics:\n• Enemies with special abilities\n• Environmental hazards\n• Boss special moves\n• Phases and patterns\n\nLearn mechanics to counter them.',
        image: null,
        tips: ['Observe boss patterns', 'Dodge telegraphed attacks', 'Interrupt big abilities']
      },
      {
        title: 'Completing Dungeons',
        content: 'Complete a dungeon by:\n1. Defeat all enemy waves\n2. Beat the final boss\n3. Collect loot\n4. Exit or continue\n\nFirst clear = best rewards. Can replay for more loot.',
        image: null,
        tips: ['Coordination is key', 'Use consumables', 'Bosses drop best loot']
      }
    ]
  },

  // ==================== TIER 10: MARKET & TRADING ====================
  // Triggered: When player reaches market/town area
  
  market: {
    tier: 10,
    title: 'Market & Trading',
    autoTrigger: 'ON_REACH_MARKET',
    steps: [
      {
        title: 'What Is the Market?',
        content: 'The market is where you buy and sell items with merchants:\n• Sell unwanted items for gold\n• Buy equipment & consumables\n• Trade materials\n• Commission items\n\nMerchants appear in towns and outposts.',
        image: null,
        tips: ['Merchants have different inventories', 'Prices vary by merchant', 'Compare before buying']
      },
      {
        title: 'Selling Items',
        content: 'To sell:\n1. Open merchant\n2. Click "Sell"\n3. Select items to sell\n4. Confirm transaction\n\nYou receive gold immediately. Sell:\n• Duplicate gear\n• Items you don\'t need\n• Materials you won\'t use\n• Junk loot',
        image: null,
        tips: ['Rare items sell for more', 'Prices are fair', 'Get gold for everything']
      },
      {
        title: 'Buying Items',
        content: 'To buy:\n1. Open merchant\n2. Browse inventory\n3. Click item\n4. Select quantity\n5. Confirm purchase\n\nSpend gold to get equipment, potions, and materials.',
        image: null,
        tips: ['Merchants restock daily', 'High-level merchants sell better items', 'Save gold for important purchases']
      },
      {
        title: 'Player Trading',
        content: 'Advanced feature: Trade with other players\n1. Invite player to trade\n2. Place items in trade window\n3. Both confirm\n4. Items exchange\n\nCan trade gear, materials, or negotiate prices.',
        image: null,
        tips: ['Trading requires trust', 'Both must agree', 'Good way to get specific items']
      }
    ]
  },

  // ==================== TIER 11: GUARDS SYSTEM ====================
  // Triggered: When guard slot unlocks
  
  guardSystem: {
    tier: 11,
    title: 'Guards System',
    priority: true,
    autoTrigger: 'ON_GUARD_SLOT_UNLOCK',
    steps: [
      {
        title: 'What Are Guards?',
        content: 'Guards are specialized NPCs that:\n• Defend your outposts automatically\n• Fight enemies without your control\n• Have unique roles and abilities\n• Can be customized and upgraded\n• Work independently\n\nGuards are different from your group members.',
        image: null,
        tips: ['Guards defend territory', 'Group members follow you', 'Can use both together']
      },
      {
        title: 'Deploying Guards',
        content: 'To deploy guards at an outpost:\n1. Visit your outpost\n2. Open outpost menu\n3. Click "Deploy Guards"\n4. Select guards to station\n5. They defend automatically\n\nGuards stationed earn XP and level up.',
        image: null,
        tips: ['Strong guards = better defense', 'Multiple guards work together', 'Upgrade guards for more power']
      },
      {
        title: 'Guard Abilities',
        content: 'Guard types:\n🗡️ WARRIOR GUARD - Tank role, high armor\n🔥 MAGE GUARD - Damage role, spells\n🏹 RANGER GUARD - DPS role, ranged\n💚 PRIEST GUARD - Healer role, support\n\nEach guard fights using their abilities automatically.',
        image: null,
        tips: ['Balance guard composition', 'Different guards counter different enemies', 'Level up guards']
      },
      {
        title: 'Guard Formation',
        content: 'Guards work in formation:\n• FORMATION LEADER - Commands group\n• DPS GUARDS - Deal damage\n• SUPPORT GUARDS - Healing/buffs\n\nLeader coordinates tactics automatically. Strong leaders = better tactics.',
        image: null,
        tips: ['Formation auto-manages', 'Leaders improve defense significantly', 'Observe guard tactics']
      }
    ]
  },

  // ==================== TIER 12: ADVANCED TIPS ====================
  // Triggered: Scattered throughout gameplay based on progress
  
  combatTactics: {
    tier: 12,
    title: 'Combat Tactics',
    autoTrigger: 'NONE',
    steps: [
      {
        title: 'Positioning Matters',
        content: 'Combat positioning:\n• Stay behind tanks\n• Ranged units away from melee\n• Healer in safe spot\n• Group together for buffs\n• Spread for AoE avoidance\n\nGood positioning = winning fights',
        image: null,
        tips: ['Observe enemy formation', 'Flank weak enemies', 'Protect healers']
      },
      {
        title: 'Ability Rotation',
        content: 'Optimize combat:\n1. Use strong abilities first\n2. Keep buffs active\n3. Time cooldowns\n4. Manage resources\n5. Use utilities when needed\n\nSmooth rotation = consistent damage',
        image: null,
        tips: ['Plan your rotation', 'Adapt to situation', 'Cancel animations efficiently']
      },
      {
        title: 'Resource Management',
        content: 'Manage your mana/stamina:\n• Don\'t waste on weak enemies\n• Save for bosses\n• Use mana potions strategically\n• Level up for more resources\n• Regen gear helps\n\nGood management = never out of resources',
        image: null,
        tips: ['Check resource bar', 'Plan big fights', 'Use potions wisely']
      },
      {
        title: 'Reading Enemies',
        content: 'Learn enemy patterns:\n• Watch boss telegraphs\n• Memorize attack patterns\n• Counter their abilities\n• Exploit weaknesses\n• Time your counters\n\nKnowledge = strategy',
        image: null,
        tips: ['First clear = learning', 'Repeat fights to master', 'Observe carefully']
      }
    ]
  },

  farmingGuide: {
    tier: 12,
    title: 'Farming & Efficiency',
    autoTrigger: 'NONE',
    steps: [
      {
        title: 'What to Farm',
        content: 'Best things to farm for resources:\n💰 Gold - Merchants & selling\n⚡ Mana - Crystals from outposts\n📦 Materials - Dungeons & enemies\n✨ Gear - Bosses & dungeons\n🔑 XP - Any enemy, bosses best',
        image: null,
        tips: ['Different content gives different rewards', 'Plan your farming route', 'Use efficiency bonuses']
      },
      {
        title: 'Efficient Farming',
        content: 'Farm efficiently:\n1. Clear areas quickly\n2. Collect all loot\n3. Sell immediately\n4. Regroup & repeat\n5. Track your rates\n\nSpeed = more resources per hour',
        image: null,
        tips: ['Practice makes faster', 'Optimize route', 'Kill enemies quickly']
      }
    ]
  },

  // ==================== FIGHTER CARDS SYSTEM ====================
  // Triggered: Early in game progression
  
  fighterCards: {
    tier: 2,
    title: 'Fighter Cards System',
    priority: false,
    autoTrigger: 'ON_FIRST_LEVEL_UP',
    steps: [
      {
        title: '🎴 Fighter Cards Explained',
        content: 'Fighter Cards are your most powerful allies! Each time you level up, you receive a new random fighter card.\n\nThese cards represent recruit-able NPCs that join your team to fight alongside you.\n\n• Different classes (DPS, Tank, Healer)\n• Various rarity tiers\n• Unique equipment & abilities',
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

  cardsTab: {
    tier: 2,
    title: 'Cards Tab Tutorial',
    autoTrigger: 'NONE',
    steps: [
      {
        title: '🎴 The Cards Tab',
        content: 'The Cards Tab shows all your collected fighter cards in one place.\n\nEach card displays:\n• Card name at the bottom\n• Power rating (top right) - 0-100 scale\n• Level indicator (top left) - Shows L1, L2, etc\n• Rarity-colored border\n• Card image in center',
        image: null,
        tips: ['Click a card to see full preview', 'Cards are sorted by rarity', 'Power rating is your reference'],
        autoShowTab: 'cards',
        autoScroll: true
      },
      {
        title: 'Previewing Cards',
        content: 'Click any card to open the full preview modal.\n\nThe preview shows:\n• Large card image\n• All stats clearly displayed\n• Assigned abilities\n• Equipment loadout\n• Role and specialization',
        image: null,
        tips: ['Press P to open/close preview', 'ESC also closes', 'Study cards before deploying']
      }
    ]
  },

  slots: {
    tier: 2,
    title: 'Slots Tab - Deploying Cards',
    autoTrigger: 'NONE',
    steps: [
      {
        title: '🔷 The Slots Tab',
        content: 'The Slots Tab is where you deploy your fighter cards into battle!\n\nYou have multiple slot types:\n• Main Slots - Your primary team members\n• Guard Slots - Defensive positions\n• Support Slots - Healing & buffs\n\nAssign cards to slots by clicking "Change" button.',
        image: null,
        tips: ['Different slot types need different roles', 'Match roles to slot types', 'You can swap cards anytime'],
        autoShowTab: 'slots',
        autoScroll: true
      },
      {
        title: 'Role Assignments',
        content: 'Each fighter card has a role that determines where they fight best:\n\n• DPS - Attack slots (primary damage)\n• Tank - Guard slots (take damage)\n• Healer - Support slots (heal team)\n• Flex - Can adapt to any role\n\nMatching roles to slots = stronger team!',
        image: null,
        tips: ['Read card roles carefully', 'Don\'t put tanks in DPS slots', 'Healers keep your team alive']
      },
      {
        title: 'Changing Cards',
        content: 'To assign a card to a slot:\n\n1. Click the "Change" button on any slot\n2. A selection dialog appears\n3. Choose your fighter card\n4. The card is now active!\n\nYou can change cards anytime, even during exploration.',
        image: null,
        tips: ['Switch cards for different battles', 'Some cards are better vs bosses', 'Experiment to find best teams']
      }
    ]
  },

  inventory: {
    tier: 2,
    title: 'Inventory & Items',
    autoTrigger: 'NONE',
    steps: [
      {
        title: '🎒 The Inventory Tab',
        content: 'The Inventory Tab shows all your equipment and items.\n\nLeft side: Your hero with equipped gear\nMiddle: Stats and details\nRight side: All items you\'ve collected\n\nPress P on any item for a full preview!',
        image: null,
        tips: ['Double-click to equip quickly', 'Better gear = stronger stats', 'Keep your best items equipped'],
        autoShowTab: 'inventory',
        autoScroll: true
      },
      {
        title: 'Finding Loot',
        content: 'Loot appears from:\n\n• Defeated enemies (auto-collected)\n• Treasure chests (in dungeons)\n• Merchants (buy with gold)\n• Boss drops (very powerful!)\n• Ground pickups (items in world)\n\nKeep exploring to find better gear!',
        image: null,
        tips: ['Color = rarity (gold = rare)', 'Higher level = better stats', 'Equip as you go']
      }
    ]
  },

  groupTab: {
    tier: 2,
    title: 'Group Tab - Team Management',
    autoTrigger: 'NONE',
    steps: [
      {
        title: '👥 The Group Tab',
        content: 'The Group Tab shows you your entire team:\n\n• Your hero (main character)\n• Active allies/fighters\n• Their stats and status\n• Team composition overview\n\nThis is your squad - keep them alive!',
        image: null,
        tips: ['Balanced teams are strongest', 'Match roles to challenges', 'Level your team evenly'],
        autoShowTab: 'group',
        autoScroll: true
      },
      {
        title: 'Team Composition',
        content: 'Build teams with balance:\n\n• At least 1 DPS (damage)\n• At least 1 Tank (defense)\n• 1+ Healer (survival)\n• Flex slots (adaptability)\n\nGood composition = victory!',
        image: null,
        tips: ['Don\'t run all DPS', 'Healers save lives', 'Tanks protect your hero']
      }
    ]
  },

  alliesTab: {
    tier: 2,
    title: 'Allies Tab - NPC Roster',
    autoTrigger: 'NONE',
    steps: [
      {
        title: '🤝 The Allies Tab',
        content: 'The Allies Tab shows all NPCs and recruited allies.\n\n• View all your recruits\n• See their experience & level\n• Check individual stats\n• Manage your roster\n\nHire more allies to expand options!',
        image: null,
        tips: ['More allies = more flexibility', 'Different personalities available', 'Build your dream team'],
        autoShowTab: 'allies',
        autoScroll: true
      }
    ]
  },

  campaignTab: {
    tier: 2,
    title: 'Campaign Tab - World Overview',
    autoTrigger: 'NONE',
    steps: [
      {
        title: '🗺️ The Campaign Tab',
        content: 'The Campaign Tab shows:\n\n• Current campaign progress\n• Territory control (yours vs enemies)\n• Point standings\n• Victory conditions\n• Key objectives\n\nWin by controlling the most territory!',
        image: null,
        tips: ['Points accumulate over time', 'Capture and hold bases', 'Read the objective carefully'],
        autoShowTab: 'campaign',
        autoScroll: true
      },
      {
        title: 'Campaign Strategy',
        content: 'To win the campaign:\n\n1. Capture neutral bases\n2. Defend your territory\n3. Expand strategically\n4. Watch enemy movements\n5. Reach the point target\n\nTiming and tactics matter!',
        image: null,
        tips: ['Don\'t overextend', 'Support your teammates', 'Plan ahead']
      }
    ]
  },

  outpostMarket: {
    tier: 3,
    title: 'Outpost Market',
    autoTrigger: 'ON_REACH_OUTPOST_AREA',
    steps: [
      {
        title: '🏪 The Outpost Market',
        content: 'When you reach an outpost, you can open the Market!\n\nThe Market offers:\n• Unique items for sale\n• Prices vary by rarity\n• Limited stock\n• Restocks periodically\n\nBuy gear here to gear up faster!',
        image: null,
        tips: ['Markets are in safe zones', 'Gold = power', 'Compare prices', 'Save for rare items']
      },
      {
        title: 'Shopping at Markets',
        content: 'Click an item to:\n\n1. See full details & stats\n2. Check current price\n3. Buy with your gold\n4. Item added to inventory\n\nGood for gearing up quickly before tough battles!',
        image: null,
        tips: ['Check all markets', 'Different items at each', 'Negotiate isn\'t possible - fixed prices']
      }
    ]
  },

  garrison: {
    tier: 3,
    title: 'Garrison Management',
    autoTrigger: 'ON_REACH_OUTPOST_AREA',
    steps: [
      {
        title: '🏰 The Garrison',
        content: 'At outposts with Garrison buttons, you can:\n\n• Station guards to defend\n• Upgrade defenses\n• Manage stationed forces\n• View garrison status\n• Call reinforcements\n\nGarrison = home base defense!',
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
export const TRIGGER_MAPPING = {
  'ON_GAME_START': 'welcome',
  'ON_FIRST_ENEMY': ['combatBasics', 'abilityIntro'],
  'ON_FIRST_LOOT': 'lootSystem',
  'ON_FIRST_EQUIPMENT': 'equipmentSystem',
  'ON_FIRST_XP': 'progressionSystem',
  'ON_FIRST_LEVEL_UP': 'fighterCards',
  'ON_INVENTORY_OPEN': 'abilitySlots',
  'ON_INVENTORY_FULL': 'inventory',
  'ON_RECRUIT_NPC': ['groupSystem', 'abilityAssignment'],
  'ON_FIRST_BUFF': 'buffsDebuffs',
  'ON_REACH_OUTPOST_AREA': ['outpostMarket', 'garrison'],
  'ON_REACH_DUNGEON': 'dungeonIntro',
  'ON_REACH_MARKET': 'market',
  'ON_GUARD_SLOT_UNLOCK': 'guardSystem'
};
