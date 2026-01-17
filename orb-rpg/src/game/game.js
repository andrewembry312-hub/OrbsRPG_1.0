import { clamp, rand, randi, cssVar, saveJson, loadJson } from "../engine/util.js";
import { INV_SIZE, LOOT_TTL, ARMOR_SLOTS, SLOT_LABEL, DEFAULT_BINDS } from "./constants.js";
import { pickRarity, rarityClass, rarityTier } from "./rarity.js";
import { xpForNext } from "./progression.js";
import { SKILLS, getSkillById, getAbilityById, DOT_REGISTRY, BUFF_REGISTRY, defaultAbilitySlots, defaultPassives, loadLoadout } from "./skills.js";
import { initSites, playerHome, getHomeForTeam, getFriendlyFlags, getFlagsForTeam, getNonPlayerFlags, updateCapture, updateWallDamage, updateFlagHealth, spawnGuardsForSite, enemiesNearSite, findNearestEnemyTeamAtSite } from "./world.js";
import { META_LOADOUTS } from "./loadouts.js";
import { LEVEL_CONFIG, getZoneForPosition, scaleAllyToPlayerLevel } from "./leveling.js";
import * as LoadoutRegistry from "./loadout-registry.js";

// Enemy / spawn tuning
const MAX_DEFENDERS_PER_TEAM = 10; // non-guard fighters per team (excludes guards)
const MAX_KNIGHTS_PER_TEAM = 10; // cap knights per team on map
const MAX_ENEMIES = 50; // overall hard cap (tight to avoid runaway spawns)
const SPAWN_ACTIVATE_DIST = 220; // player proximity to activate spawns from a site (unused for main spawns now)
const DEFEND_RADIUS = 80; // how close to home the enemy will defend/patrol
const CHASE_DISTANCE = 160; // how close the player must be for an enemy to chase
const CHASE_FROM_HOME_MAX = 220; // max distance from home an enemy will pursue before returning
const RETURN_THRESHOLD = 260; // if farther than this from home, force return

// Hard reset: completely reinitialize all game state properties (called before initGame on new game)
export function hardResetGameState(state){
  try{ console.log('[RESET] Hard reset - clearing all game state'); }catch(e){}
  
  if(!state || !state.player) return; // Safety check
  
  // Initialize combat log for debugging
  if(!state.combatLog) state.combatLog = [];
  
  // Initialize comprehensive AI behavior tracking
  if(!state.aiBehaviorLog) state.aiBehaviorLog = [];
  
  // Reset progression to level 1
  state.progression = { level:1, xp:0, statPoints:1, spends:{vit:0,int:0,str:0,def:0,agi:0} };
  
  // Reset player hp, mana, stamina (position will be set in initGame after sites exist)
  const baseHp = state.basePlayer?.maxHp || 120;
  const baseMana = state.basePlayer?.maxMana || 70;
  const baseStam = state.basePlayer?.maxStam || 100;
  state.player.hp = baseHp;
  state.player.mana = baseMana;
  state.player.stam = baseStam;
  state.player.shield = 0;
  state.player.dead = false;
  state.player.respawnT = 0;
  state.player.buffs = [];
  state.player.dots = [];
  state.player.cd = [0,0,0,0,0];
  state.player.gold = 500;
  state.player.passives = defaultPassives(getSkillById);
  
  // IMPORTANT: Reset ability slots (loadouts persist in localStorage separately)
  state.abilitySlots = defaultAbilitySlots(); // Empty slots
  state.heroAbilitySlots = { 
    mage:defaultAbilitySlots(), 
    warrior:defaultAbilitySlots(), 
    knight:defaultAbilitySlots(), 
    warden:defaultAbilitySlots() 
  };
  
  // Reset hero equipment
  state.heroEquip = { 
    mage: Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null])),
    warrior: Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null])),
    knight: Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null])),
    warden: Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null]))
  };
  state.player.equip = Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null]));
  state.player.equipment = { weapon: structuredClone(META_LOADOUTS.HEALER.weapon) };
  state.player.potion = null;
  
  // Reset UI state
  state.showInventory = false;
  state.showSkills = false;
  state.showLevel = false;
  state.inMenu = false;
  state.showMarketplace = false;
  state.paused = false;
  state.campaignEnded = false;
  state.selectedIndex = -1;
  state.selectedEquipSlot = null;
  state.groupMemberInventoryMode = null;
  
  // Reset collections
  state.sites = [];
  state.dungeons = [];
  state.enemies = [];
  state.friendlies = [];
  state.creatures = [];
  state.projectiles = [];
  state.loot = [];
  state.inventory = [];

  // Stable entity id sequence (used for _id assignment on spawn)
  state.nextEntityId = 0;
  
  // Expose item generation functions for console commands
  state._itemGen = {
    makeWeapon,
    makeArmor,
    makePotion
  };
  
  // Expose buff application function for console commands
  state._applyBuff = applyBuffTo;
  
  state.effects = state.effects || {};
  state.effects.heals = [];
  state.effects.wells = [];
  state.effects.storms = [];
  state.effects.slashes = [];
  state.effects.flashes = [];
  state.effects.leapIndicators = [];
  state.effects.bolts = [];
  
  // Reset group system
  state.group = {
    members: [],
    selectedMemberId: null,
    settings: {}
  };
  
  // Reset party system
  state.party = {
    macroState: 'stack',
    macroLockUntil: 0,
    burstUntil: 0,
    blackboard: {
      stackPoint: { x: 0, y: 0 },
      focusTargetId: null,
      focusTargetUntil: 0,
      chaseAllowed: false,
      spreadRadius: 72,
      leashRadius: 210
    }
  };
  
  // Reset campaign
  state.campaign = { playerPoints:0, enemyPoints:0, targetPoints:250, time:0 };
}

function ensureEntityId(state, ent, opts={}){
  if(!ent) return null;
  if(ent._id !== undefined && ent._id !== null && String(ent._id) !== '') return ent._id;

  // Prefer an existing explicit id if present (friendlies/group members already have one)
  if(ent.id !== undefined && ent.id !== null && String(ent.id) !== ''){
    ent._id = String(ent.id);
    return ent._id;
  }

  const kind = opts.kind || ent.kind || 'unit';
  const team = opts.team || ent.team || (kind === 'friendly' ? 'player' : 'enemy');
  state.nextEntityId = (state.nextEntityId || 0) + 1;
  ent._id = `${team}:${kind}:${state.nextEntityId}`;
  return ent._id;
}

export async function initGame(state){
  try{ console.log('initGame: starting'); }catch(e){}
  
  // Initialize combat log for debugging
  if(!state.combatLog) state.combatLog = [];
  
  // Initialize comprehensive AI behavior tracking
  if(!state.aiBehaviorLog) state.aiBehaviorLog = [];
  
  // ALWAYS clear ability slots on new game - simple and explicit
  state.abilitySlots = [null, null, null, null, null];
  console.log('[INIT] Ability slots cleared:', state.abilitySlots);
  
  // Reset group and transient collections to avoid carryover from previous runs
  try{
    state.group.members.length = 0;
    state.group.selectedMemberId = null;
    state.group.settings = {};
    // Clear transient entities; sites/terrain reset in initSites
    state.friendlies.length = 0;
    state.enemies.length = 0;
    state.projectiles.length = 0;
    state.loot.length = 0;
    state.creatures.length = 0;
  }catch{}
  initSites(state);
  const hb=playerHome(state);
  state.player.x=hb.x; state.player.y=hb.y;
  const st=currentStats(state);

  // Spawn neutral creatures and unique boss
  spawnCreatures(state);
  spawnBossCreature(state);
  
  // NEW PROGRESSION SYSTEM:
  // Player starts SOLO and must build team through progression (levels 2, 3, 4, 5, etc.)
  // AI teams start with FULL rosters to create immediate competition
  
  // Player starts with 0 allies (recruit via PROGRESSION.recruitAlly)
  // AI teams start with FULL teams (10 fighters each at their bases)
  console.log('[INIT] Spawning AI team forces...');
  seedTeamForces(state, 'teamA', MAX_DEFENDERS_PER_TEAM); // 10 fighters
  seedTeamForces(state, 'teamB', MAX_DEFENDERS_PER_TEAM); // 10 fighters
  seedTeamForces(state, 'teamC', MAX_DEFENDERS_PER_TEAM); // 10 fighters
  
  // Spawn 5 guards at each AI team's base (instant defense)
  console.log('[INIT] Spawning AI team guards...');
  const teamABase = state.sites.find(s => s.id === 'team_a_base');
  const teamBBase = state.sites.find(s => s.id === 'team_b_base');
  const teamCBase = state.sites.find(s => s.id === 'team_c_base');
  
  if(teamABase && spawnGuardsForSite) spawnGuardsForSite(state, teamABase, 5);
  if(teamBBase && spawnGuardsForSite) spawnGuardsForSite(state, teamBBase, 5);
  if(teamCBase && spawnGuardsForSite) spawnGuardsForSite(state, teamCBase, 5);
  
  console.log('[INIT] AI teams initialized with full rosters + guards');
  
  // Initialize walking sound
  if(!state.sounds) state.sounds = {};
  if(!state.sounds.walking){
    state.sounds.walking = new Audio('assets/sounds/Walking_in_grass.wav');
    state.sounds.walking.loop = true;
    state.sounds.walking.volume = 0.3;
  }
  if(!state.sounds.meleeAttack){
    state.sounds.meleeAttack = new Audio('assets/sounds/melee_sword_attacks.wav');
    state.sounds.meleeAttack.volume = 0.4;
  }
  if(!state.sounds.staffAttack){
    state.sounds.staffAttack = new Audio('assets/sounds/magic_staffs_attacks.mp3');
    state.sounds.staffAttack.volume = 0.3;
  }
  if(!state.sounds.meteorSlam){
    state.sounds.meteorSlam = new Audio('assets/sounds/Meteor_Slam.wav');
    state.sounds.meteorSlam.volume = 0.5;
  }
  if(!state.sounds.magicalRockSpell){
    state.sounds.magicalRockSpell = new Audio('assets/sounds/magical-rock-spell.mp3');
    state.sounds.magicalRockSpell.volume = 0.45;
  }
  if(!state.sounds.elementalImpact){
    state.sounds.elementalImpact = new Audio('assets/sounds/elemental-magic-spell-impact-outgoing-228342.mp3');
    state.sounds.elementalImpact.volume = 0.5;
  }
  if(!state.sounds.magicalRockSpellAlt){
    state.sounds.magicalRockSpellAlt = new Audio('assets/sounds/magical-rock-spell-190273.mp3');
    state.sounds.magicalRockSpellAlt.volume = 0.45;
  }
  if(!state.sounds.magicalWhooshFast){
    state.sounds.magicalWhooshFast = new Audio('assets/sounds/magical-whoosh-355988.mp3');
    state.sounds.magicalWhooshFast.volume = 0.5;
  }
  if(!state.sounds.bufferSpell){
    state.sounds.bufferSpell = new Audio('assets/sounds/buffer-spell-88994.mp3');
    state.sounds.bufferSpell.volume = 0.5;
  }
  if(!state.sounds.castingMagic1){
    state.sounds.castingMagic1 = new Audio('assets/sounds/casting-magic-1-382382.mp3');
    state.sounds.castingMagic1.volume = 0.5;
  }
  if(!state.sounds.castingMagic2){
    state.sounds.castingMagic2 = new Audio('assets/sounds/casting-magic-2-382383.mp3');
    state.sounds.castingMagic2.volume = 0.5;
  }
  if(!state.sounds.castingMagic3){
    state.sounds.castingMagic3 = new Audio('assets/sounds/casting-magic-3-382381.mp3');
    state.sounds.castingMagic3.volume = 0.5;
  }
  if(!state.sounds.castingMagic4){
    state.sounds.castingMagic4 = new Audio('assets/sounds/casting-magic-4-382380.mp3');
    state.sounds.castingMagic4.volume = 0.5;
  }
  if(!state.sounds.castingMagic5){
    state.sounds.castingMagic5 = new Audio('assets/sounds/casting-magic-5-382378.mp3');
    state.sounds.castingMagic5.volume = 0.5;
  }
  if(!state.sounds.enchantedCast){
    state.sounds.enchantedCast = new Audio('assets/sounds/enchanted-spell-casting-229208.mp3');
    state.sounds.enchantedCast.volume = 0.5;
  }
  if(!state.sounds.magicalSpellCast){
    state.sounds.magicalSpellCast = new Audio('assets/sounds/magical-spell-cast-190272.mp3');
    state.sounds.magicalSpellCast.volume = 0.5;
  }
  if(!state.sounds.magicalWhooshAlt){
    state.sounds.magicalWhooshAlt = new Audio('assets/sounds/magical-whoosh-148459.mp3');
    state.sounds.magicalWhooshAlt.volume = 0.5;
  }
  if(!state.sounds.magicSpell353606){
    state.sounds.magicSpell353606 = new Audio('assets/sounds/magic-spell-353606.mp3');
    state.sounds.magicSpell353606.volume = 0.5;
  }
  if(!state.sounds.treeBurn){
    state.sounds.treeBurn = new Audio('assets/sounds/tree-falls-and-burns-down-100283.mp3');
    state.sounds.treeBurn.volume = 0.55;
  }
  if(!state.sounds.healingSpell1){
    state.sounds.healingSpell1 = new Audio('assets/sounds/Healing spell 1.mp3');
    state.sounds.healingSpell1.volume = 0.5;
  }
  if(!state.sounds.magicSpell6005){
    state.sounds.magicSpell6005 = new Audio('assets/sounds/magic-spell-6005.mp3');
    state.sounds.magicSpell6005.volume = 0.5;
  }
  if(!state.sounds.magicSpell333896){
    state.sounds.magicSpell333896 = new Audio('assets/sounds/magic-spell-333896.mp3');
    state.sounds.magicSpell333896.volume = 0.5;
  }
  if(!state.sounds.mainMenuMusic){
    state.sounds.mainMenuMusic = new Audio('assets/sounds/Main Menu Music.mp3');
    state.sounds.mainMenuMusic.loop = true;
    state.sounds.mainMenuMusic.volume = 0.4;
  }
  if(!state.sounds.goblinAttack){
    state.sounds.goblinAttack = new Audio('assets/sounds/goblin attack.mp3');
    state.sounds.goblinAttack.volume = 0.35;
  }
  if(!state.sounds.wolfAttack){
    state.sounds.wolfAttack = new Audio('assets/sounds/Wolf attack.mp3');
    state.sounds.wolfAttack.volume = 0.35;
  }
  if(!state.sounds.potionPickup){
    state.sounds.potionPickup = new Audio('assets/sounds/Potion Pick up.mp3');
    state.sounds.potionPickup.volume = 0.5;
  }
  if(!state.sounds.lootPickup){
    state.sounds.lootPickup = new Audio('assets/sounds/Loot pick up sound.mp3');
    state.sounds.lootPickup.volume = 0.5;
  }
  if(!state.sounds.levelUp){
    state.sounds.levelUp = new Audio('assets/sounds/Level Up Sound.mp3');
    state.sounds.levelUp.volume = 0.6;
  }
  if(!state.sounds.killCounter){
    state.sounds.killCounter = new Audio('assets/sounds/kill counter sound.wav');
    state.sounds.killCounter.volume = 0.5;
  }
  if(!state.sounds.bombNotification){
    state.sounds.bombNotification = new Audio('assets/sounds/bomb notification.mp3');
    state.sounds.bombNotification.volume = 0.6;
  }
  if(!state.sounds.gameNonCombatMusic){
    state.sounds.gameNonCombatMusic = new Audio('assets/sounds/Main Game non attack music.mp3');
    state.sounds.gameNonCombatMusic.loop = true;
    state.sounds.gameNonCombatMusic.volume = 0.35;
  }
  if(!state.sounds.gameCombatMusic){
    state.sounds.gameCombatMusic = new Audio('assets/sounds/Main game Attack Music.mp3');
    state.sounds.gameCombatMusic.loop = true;
    state.sounds.gameCombatMusic.volume = 0.4;
  }
  if(!state.sounds.emperorAttackMusic){
    state.sounds.emperorAttackMusic = new Audio('assets/sounds/Emporer Attack Music.mp3');
    state.sounds.emperorAttackMusic.loop = true;
    state.sounds.emperorAttackMusic.volume = 0.42;
  }
  if(!state.sounds.fireDamage){
    state.sounds.fireDamage = new Audio('assets/sounds/fire-457848.mp3');
    state.sounds.fireDamage.volume = 0.6;
  }
  
  // Initialize combat music tracker with timestamp (reset to 0 to start in non-combat)
  if(typeof state.lastDamageTakenTimestamp === 'undefined'){
    state.lastDamageTakenTimestamp = 0;
  }
  if(typeof state.lastCombatTime === 'undefined'){
    state.lastCombatTime = 0;
  }
  if(typeof state.inCombatMode === 'undefined'){
    state.inCombatMode = false;
  }
  if(typeof state._combatTrack === 'undefined'){
    state._combatTrack = null;
  }
  
  console.log('[MUSIC] Combat music system initialized:', {
    lastDamage: state.lastDamageTakenTimestamp,
    lastCombat: state.lastCombatTime,
    inCombat: state.inCombatMode,
    combatMusicLoaded: !!state.sounds.gameCombatMusic,
    nonCombatMusicLoaded: !!state.sounds.gameNonCombatMusic
  });
  
  // Store utility functions in state to avoid circular imports
  state._npcUtils = {
    applyClassToUnit,
    npcInitAbilities,
    spawnEnemyAt,
    spawnFriendlyAt
  };
  
  // Expose loadout system for console testing
  state._loadouts = LoadoutRegistry;
  window.LOADOUTS = LoadoutRegistry;
  
  // Slot system helper functions
  window.SLOTS = {
    // Get slot unlock cost (always 1 SP)
    getUnlockCost: (slotId) => {
      if (!state.slotSystem) {
        console.error('❌ Slot system not initialized! Hard refresh required (Ctrl+F5)');
        return null;
      }
      return state.slotSystem.unlockCost;
    },
    
    // Get slot upgrade cost (base + scaling based on current level)
    getUpgradeCost: (slotId) => {
      if (!state.slotSystem) {
        console.error('❌ Slot system not initialized! Hard refresh required (Ctrl+F5)');
        return null;
      }
      const slot = findSlot(state, slotId);
      if (!slot) return null;
      
      // Cost = base + (slot.level * scaling)
      const base = state.slotSystem.upgradeCostBase;
      const scaling = state.slotSystem.upgradeCostScaling;
      const cost = Math.ceil(base + (slot.level * scaling));
      return cost;
    },
    
    // Unlock a slot (costs 1 SP)
    unlockSlot: (slotId) => {
      if (!state.slotSystem) {
        console.error('❌ Slot system not initialized! Hard refresh required (Ctrl+F5)');
        return false;
      }
      if (!state.progression.skillPoints) state.progression.skillPoints = 0;
      
      const slot = findSlot(state, slotId);
      if (!slot) {
        console.log(`❌ Slot ${slotId} not found!`);
        return false;
      }
      
      if (slot.unlocked) {
        console.log(`❌ Slot ${slotId} already unlocked!`);
        return false;
      }
      
      const cost = window.SLOTS.getUnlockCost(slotId);
      if (state.progression.skillPoints < cost) {
        console.log(`❌ Not enough skill points! Need ${cost}, have ${state.progression.skillPoints}`);
        return false;
      }
      
      // Spend SP and unlock slot
      state.progression.skillPoints -= cost;
      slot.unlocked = true;
      console.log(`✅ Unlocked ${slotId}! (${state.progression.skillPoints} SP remaining)`);
      
      // Mirror to AI teams instantly
      mirrorSlotToAI(state, slotId, 'unlock');
      
      // If guard slot and player owns any flags, spawn guards
      if (slotId.startsWith('guard_')) {
        const playerFlags = state.sites.filter(s => s.owner === 'player' && s.id?.startsWith('site_'));
        if (playerFlags.length > 0) {
          console.log(`🛡️ Guard slot unlocked! Spawning guards at ${playerFlags.length} player-owned flags...`);
          playerFlags.forEach(flag => {
            // Spawn one guard at each owned flag (respects slot limits)
            if (typeof spawnGuardsForSite === 'function') {
              spawnGuardsForSite(state, flag, 1);
            }
          });
        }
      }
      
      // Update UI if available
      if (state.ui && state.ui.renderSlotTab) {
        state.ui.renderSlotTab();
      }
      
      return true;
    },
    
    // Upgrade slot level (costs base + scaling SP)
    upgradeSlot: (slotId) => {
      const slot = findSlot(state, slotId);
      if (!slot) {
        console.log(`❌ Slot ${slotId} not found!`);
        return false;
      }
      
      if (!slot.unlocked) {
        console.log(`❌ Slot ${slotId} not unlocked yet!`);
        return false;
      }
      
      const cost = window.SLOTS.getUpgradeCost(slotId);
      if (state.progression.skillPoints < cost) {
        console.log(`❌ Not enough skill points! Need ${cost}, have ${state.progression.skillPoints}`);
        return false;
      }
      
      // Spend SP and upgrade slot
      state.progression.skillPoints -= cost;
      slot.level += 1;
      console.log(`✅ Upgraded ${slotId} to level ${slot.level}! (${state.progression.skillPoints} SP remaining)`);
      
      // Mirror to AI teams instantly
      mirrorSlotToAI(state, slotId, 'upgrade');
      
      // Update UI if available
      if (state.ui && state.ui.renderSlotTab) {
        state.ui.renderSlotTab();
      }
      
      // If guard slot and flag owned, respawn guard at new level
      if (slotId.startsWith('guard_')) {
        respawnGuardsForSlot(state, slotId);
      }
      
      // If ally slot and ally exists, level up the ally
      if (slotId.startsWith('ally_')) {
        levelUpAllyForSlot(state, slotId);
      }
      
      return true;
    },
    
    // Assign loadout to slot (free, out of combat only)
    assignLoadout: (slotId, loadoutId) => {
      const slot = findSlot(state, slotId);
      if (!slot) {
        console.log(`❌ Slot ${slotId} not found!`);
        return false;
      }
      
      if (!slot.unlocked) {
        console.log(`❌ Slot ${slotId} not unlocked yet!`);
        return false;
      }
      
      const loadout = LOADOUTS.getLoadout(loadoutId);
      if (!loadout) {
        console.log(`❌ Loadout ${loadoutId} not found!`);
        return false;
      }
      
      // Check role compatibility (flex slots can use any role)
      if (slot.role !== 'flex' && loadout.role !== slot.role) {
        console.log(`❌ Loadout role (${loadout.role}) doesn't match slot role (${slot.role})!`);
        return false;
      }
      
      slot.loadoutId = loadoutId;
      console.log(`✅ Assigned ${loadout.name} to ${slotId}`);
      
      // Mirror to AI teams
      mirrorSlotToAI(state, slotId, 'loadout', loadoutId);
      
      // Update UI if available
      if (state.ui && state.ui.renderSlotTab) {
        state.ui.renderSlotTab();
      }
      
      return true;
    },
    
    // View all slots
    viewSlots: () => {
      // Auto-initialize missing fields for backwards compatibility
      if (!state.progression.skillPoints) state.progression.skillPoints = 0;
      if (!state.progression.totalSkillPoints) state.progression.totalSkillPoints = 0;
      if (!state.zoneConfig.zoneTier) state.zoneConfig.zoneTier = 1;
      if (!state.slotSystem) {
        console.error('❌ Slot system not initialized! Hard refresh required (Ctrl+F5)');
        return;
      }
      
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    SLOT SYSTEM STATUS                     ║
╠═══════════════════════════════════════════════════════════╣
║ Skill Points: ${state.progression.skillPoints.toString().padEnd(44)} ║
║ Player Level: ${state.progression.level.toString().padEnd(44)} ║
║ Zone Tier: ${state.zoneConfig.zoneTier.toString().padEnd(47)} ║
╠═══════════════════════════════════════════════════════════╣
║                        GUARD SLOTS                        ║
╠═══════════════════════════════════════════════════════════╣`);
      
      state.slotSystem.guards.forEach(slot => {
        const status = slot.unlocked ? `Lvl ${slot.level}` : 'LOCKED';
        const loadout = slot.loadoutId ? LOADOUTS.getLoadout(slot.loadoutId)?.name : 'None';
        console.log(`║ ${slot.id.padEnd(16)} ${status.padEnd(8)} ${loadout.padEnd(24)} ║`);
      });
      
      console.log(`╠═══════════════════════════════════════════════════════════╣
║                        ALLY SLOTS                         ║
╠═══════════════════════════════════════════════════════════╣`);
      
      state.slotSystem.allies.forEach(slot => {
        const status = slot.unlocked ? `Lvl ${slot.level}` : 'LOCKED';
        const loadout = slot.loadoutId ? LOADOUTS.getLoadout(slot.loadoutId)?.name : 'None';
        console.log(`║ ${slot.id.padEnd(16)} ${status.padEnd(8)} ${loadout.padEnd(24)} ║`);
      });
      
      console.log(`╚═══════════════════════════════════════════════════════════╝`);
    },
    
    // Quick unlock + level + assign workflow
    quickSetup: (slotId, loadoutId, targetLevel = 1) => {
      // Unlock if needed
      const slot = findSlot(state, slotId);
      if (!slot.unlocked) {
        if (!window.SLOTS.unlockSlot(slotId)) return false;
      }
      
      // Upgrade to target level
      while (slot.level < targetLevel) {
        if (!window.SLOTS.upgradeSlot(slotId)) break;
      }
      
      // Assign loadout
      if (loadoutId) {
        return window.SLOTS.assignLoadout(slotId, loadoutId);
      }
      
      return true;
    },
    
    // Unlock all slots for testing (gives free SP if needed)
    unlockAllSlots: () => {
      const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
      const lockedCount = allSlots.filter(s => !s.unlocked).length;
      
      // Give enough SP to unlock all
      if (state.progression.skillPoints < lockedCount) {
        const needed = lockedCount - state.progression.skillPoints;
        state.progression.skillPoints += needed;
        console.log(`💎 Added ${needed} SP for unlocking (total: ${state.progression.skillPoints})`);
      }
      
      // Unlock all slots
      let unlocked = 0;
      allSlots.forEach(slot => {
        if (!slot.unlocked) {
          if (window.SLOTS.unlockSlot(slot.id)) unlocked++;
        }
      });
      
      console.log(`✅ Unlocked ${unlocked} slots! All 15 slots now available.`);
      return true;
    }
  };
  
  // Expose progression testing helpers
  window.PROGRESSION = {
    // View current zone info
    zoneInfo: () => {
      const zone = state.zoneConfig.zones[state.zoneConfig.currentZone - 1];
      console.log(`
╔═══════════════════════════════════════╗
║         ZONE INFORMATION              ║
╠═══════════════════════════════════════╣
║ Zone: ${zone.name.padEnd(31)} ║
║ Level Range: ${zone.minLevel}-${zone.maxLevel}${' '.repeat(23)} ║
║ Boss Level: ${zone.bossLevel}${' '.repeat(25)} ║
║ Boss Active: ${state.zoneConfig.bossActive ? 'YES' : 'NO'}${' '.repeat(22)} ║
║ Zone Complete: ${state.zoneConfig.zoneComplete ? 'YES' : 'NO'}${' '.repeat(20)} ║
╠═══════════════════════════════════════╣
║ Zone Tier: ${state.zoneConfig.zoneTier}${' '.repeat(26)} ║
║ Player Level: ${state.progression.level}${' '.repeat(23)} ║
║ Skill Points: ${state.progression.skillPoints}${' '.repeat(23)} ║
╚═══════════════════════════════════════╝
      `);
      return zone;
    },
    
    // Spawn boss manually (for testing)
    spawnBoss: () => {
      if (state.zoneConfig.bossActive) {
        console.log('❌ Boss already active!');
        return null;
      }
      spawnZoneBoss(state);
      return state.zoneConfig.bossEntity;
    },
    
    // Advance zone manually (for testing)
    nextZone: () => {
      if (!state.zoneConfig.zoneComplete) {
        console.log('⚠️ Zone not complete - forcing advancement anyway');
      }
      advanceToNextZone(state);
    }
  };
  
  // Initialize console error logger for debugging
  initConsoleErrorLogger(state);
  
  // Initialize UI with current stats
  if(state.ui && state.ui.renderHud){
    const stats = currentStats(state);
    state.ui.renderHud(stats);
  }
}

export function currentStats(state){
  const base={...state.basePlayer};
  
  // Apply permanent stat bonuses from leveling (flat bonuses)
  if(state.progression?.baseStats) {
    base.maxHp += state.progression.baseStats.maxHp || 0;
    base.maxMana += state.progression.baseStats.maxMana || 0;
    base.maxStam += state.progression.baseStats.maxStam || 0;
  }
  
  // Apply level scaling to base stats (MMO-style progression)
  const playerLevel = state.progression?.level || 1;
  if (playerLevel > 1) {
    const levelMult = 1 + (playerLevel - 1) * 0.08; // 8% growth per level
    base.maxHp = Math.round(base.maxHp * levelMult);
    base.maxMana = Math.round(base.maxMana * levelMult);
    base.maxStam = Math.round(base.maxStam * levelMult);
    base.hpRegen = Number((base.hpRegen * levelMult).toFixed(2));
    base.manaRegen = Number((base.manaRegen * levelMult).toFixed(2));
    base.stamRegen = Math.round(base.stamRegen * levelMult);
    base.atk = Math.round(base.atk * levelMult);
    base.def = Math.round(base.def * levelMult);
  }
  
  applySpends(state, base);
  applyAllArmor(state, base);
  
  // Apply all selected passives (they are always active once selected)
  for(const p of state.player.passives){
    if(p?.type==='passive' && p.buffs){
      applyBuffs(base, p.buffs, true); // Passive ability buffs use percentages
    }
  }
  
  // apply active buffs on player
  try{
    if(state.player.buffs && state.player.buffs.length){
      for(const b of state.player.buffs){
            const meta = BUFF_REGISTRY[b.id];
        if(meta && meta.stats) applyBuffs(base, meta.stats, true); // Ability buffs use percentages
      }
    }
  }catch{}
  base.cdr=clamp(base.cdr,0,0.45);
  base.blockBase=clamp(base.blockBase,0,base.blockCap);
  base.critChance=clamp(base.critChance,0,0.75);
  base.critMult=Math.max(1.2, base.critMult);
  // Emperor bonus when player's team is emperor
  if(state.emperorTeam === 'player'){
    base.maxHp *= 3;
    base.maxMana *= 3;
    base.maxStam *= 3;
    base.cdr = clamp(base.cdr + 0.5, 0, 0.95); // 50% cooldown reduction (abilities half cooldown)
  }
  return base;
}

function applySpends(state, st){
  const s=state.progression.spends;
  st.maxHp += (s.vit??0)*14;
  st.hpRegen += (s.vit??0)*0.10;
  st.maxMana += (s.int??0)*12;
  st.manaRegen += (s.int??0)*0.18;
  st.cdr += (s.int??0)*0.006;
  st.atk += (s.str??0)*1.1;
  st.critMult += (s.str??0)*0.02;
  st.def += (s.def??0)*1.1;
  st.speed += (s.agi??0)*6;
  st.maxStam += (s.agi??0)*8;
  st.stamRegen += (s.agi??0)*1.2;
}

// Apply buffs with percentage handling (for ability buffs only)
function applyBuffs(st, buffs, isPercentage = true){
  for(const [k,v] of Object.entries(buffs)){
    // Special handling for percentage-based multiplicative stats (ONLY for ability buffs)
    if(k === 'allStats' && isPercentage){
      // Apply percentage to all major stats
      const mult = 1 + v;
      st.maxHp = Math.round(st.maxHp * mult);
      st.maxMana = Math.round(st.maxMana * mult);
      st.maxStam = Math.round(st.maxStam * mult);
      st.atk = Math.round(st.atk * mult);
      st.def = Math.round(st.def * mult);
      st.hpRegen = Number((st.hpRegen * mult).toFixed(2));
      st.manaRegen = Number((st.manaRegen * mult).toFixed(2));
      st.stamRegen = Math.round(st.stamRegen * mult);
    }
    // Percentage-based attack/defense (e.g., atk:0.40 = +40%) - ONLY for ability buffs
    else if((k === 'atk' || k === 'def') && isPercentage && Math.abs(v) < 10){
      st[k] = Math.round(st[k] * (1 + v));
    }
    // Percentage-based speed (e.g., speed:0.30 = +30%) - ONLY for ability buffs
    else if(k === 'speed' && isPercentage && Math.abs(v) < 10){
      st[k] = Math.round(st[k] * (1 + v));
    }
    // Percentage-based regen (e.g., manaRegen:0.15 = +15%) - ONLY for ability buffs
    else if((k === 'hpRegen' || k === 'manaRegen') && isPercentage && Math.abs(v) < 10){
      st[k] = Number((st[k] * (1 + v)).toFixed(2));
    }
    // Percentage-based max stats (e.g., maxHp:0.15 = +15%) - ONLY for ability buffs
    else if((k === 'maxHp' || k === 'maxMana' || k === 'maxStam') && isPercentage && Math.abs(v) < 10){
      st[k] = Math.round(st[k] * (1 + v));
    }
    // Percentage-based stamina regen - ONLY for ability buffs
    else if(k === 'stamRegen' && isPercentage && Math.abs(v) < 100){
      st[k] = Math.round(st[k] * (1 + v));
    }
    // Percentage-based damage stats - ONLY for ability buffs
    else if((k === 'magicDmg' || k === 'allDamage') && isPercentage && Math.abs(v) < 10){
      st.magicDmg = (st.magicDmg ?? 1.0) * (1 + v);
      if(k === 'allDamage') st.atk = Math.round(st.atk * (1 + v));
    }
    // Percentage-based attack speed - ONLY for ability buffs
    else if(k === 'atkSpeed' && isPercentage){
      st.atkSpeed = (st.atkSpeed ?? 1.0) * (1 + v);
    }
    // Percentage-based cast speed - ONLY for ability buffs
    else if(k === 'castSpeed' && isPercentage){
      st.castSpeed = (st.castSpeed ?? 1.0) * (1 + v);
    }
    // Percentage-based damage taken (debuff) - ONLY for ability buffs
    else if(k === 'damageTaken' && isPercentage){
      st.damageTaken = (st.damageTaken ?? 1.0) * (1 + v);
    }
    // Percentage-based healing power - ONLY for ability buffs
    else if(k === 'healingPower' && isPercentage){
      st.healingPower = (st.healingPower ?? 1.0) * (1 + v);
    }
    // Percentage-based mana cost reduction - always additive
    else if(k === 'manaCostReduction'){
      st.manaCostReduction = (st.manaCostReduction ?? 0) + v;
    }
    // Percentage-based shield effectiveness - ONLY for ability buffs
    else if(k === 'shieldEff' && isPercentage){
      st.shieldEff = (st.shieldEff ?? 1.0) * (1 + v);
    }
    // Additive stats (CDR, crit, block, lifesteal) - always flat addition
    else if(k==='cdr') st.cdr+=v;
    else if(k==='blockEff') st.blockBase+=v;
    else if(k==='lifesteal') st.lifesteal=(st.lifesteal??0)+v;
    else if(k==='shieldGain') st.shieldGain=(st.shieldGain??0)+v;
    else if(k==='critChance') st.critChance=(st.critChance??0)+v;
    else if(k==='critMult') st.critMult=(st.critMult??1.5)+v;
    else if(k==='shield') {
      // Shield buff should NOT be in stats (would apply every frame)
      // Only apply once when buff is first added
      if(!isPercentage) st.shield=(st.shield??0)+v;
    }
    // Boolean flags (immunity, cc, etc.) - always direct assignment
    else if(k === 'ccImmune' || k === 'invulnerable' || k === 'invisible' || k === 'silenceImmune' || k === 'flying' || k === 'rooted' || k === 'stunned' || k === 'silenced'){
      st[k] = v;
    }
    // Everything else as flat addition
    else st[k]=(st[k]??0)+v;
  }
}

function applyAllArmor(state, st){
  for(const slot of ARMOR_SLOTS){
    const it=state.player.equip[slot];
    if(it?.kind==='armor') applyBuffs(st, it.buffs, false); // Equipment stats are ALWAYS flat, never percentage
  }
}

function describeBuffs(buffs){
  const parts=[];
  for(const [k,v] of Object.entries(buffs)){
    const sign=v>=0?'+':'';
    if(k==='maxHp') parts.push(`${sign}${Math.round(v)} Max HP`);
    else if(k==='hpRegen') parts.push(`${sign}${v.toFixed(1)} HP Regen`);
    else if(k==='maxMana') parts.push(`${sign}${Math.round(v)} Max Mana`);
    else if(k==='manaRegen') parts.push(`${sign}${v.toFixed(1)} Mana Regen`);
    else if(k==='maxStam') parts.push(`${sign}${Math.round(v)} Max Stam`);
    else if(k==='stamRegen') parts.push(`${sign}${v.toFixed(1)} Stam Regen`);
    else if(k==='atk') parts.push(`${sign}${v.toFixed(1)} ATK`);
    else if(k==='def') parts.push(`${sign}${v.toFixed(1)} DEF`);
    else if(k==='speed') parts.push(`${sign}${Math.round(v)} Speed`);
    else if(k==='critChance') parts.push(`${sign}${Math.round(v*100)}% Crit`);
    else if(k==='critMult') parts.push(`${sign}${v.toFixed(2)} Crit Mult`);
    else if(k==='cdr') parts.push(`${sign}${Math.round(v*100)}% CDR`);
    else if(k==='blockEff') parts.push(`${sign}${Math.round(v*100)}% Block`);
    else if(k==='lifesteal') parts.push(`${sign}${Math.round(v*100)}% Lifesteal`);
    else if(k==='res_fire') parts.push(`${sign}${Math.round(v*100)}% Fire Resist`);
    else if(k==='res_ice') parts.push(`${sign}${Math.round(v*100)}% Ice Resist`);
    else if(k==='res_lightning') parts.push(`${sign}${Math.round(v*100)}% Lightning Resist`);
    else if(k==='res_poison') parts.push(`${sign}${Math.round(v*100)}% Poison Resist`);
    else if(k==='res_bleed') parts.push(`${sign}${Math.round(v*100)}% Bleed Resist`);
    else parts.push(`${k} ${sign}${v}`);
  }
  return parts.join(', ');
}

// Elemental + affix helpers for loot generation
const ELEMENTAL_TYPES = [
  { key:'fire', dotId:'burn' },
  { key:'poison', dotId:'poison' },
  { key:'bleed', dotId:'bleed' },
  { key:'ice', dotId:'freeze' },
  { key:'lightning', dotId:'shock' }
];

const RESIST_KEYS = ['res_fire','res_ice','res_lightning','res_poison','res_bleed'];

function rarityAffixRules(rarityKey){
  switch(rarityKey){
    case 'uncommon': return { statRange:[1,3], statScale:0.55, resRange:[0,0], elemRange:[0,0], elemScale:0 };
    case 'rare': return { statRange:[1,3], statScale:0.75, resRange:[1,1], elemRange:[1,1], elemScale:0.75 };
    case 'epic': return { statRange:[1,4], statScale:0.95, resRange:[1,1], elemRange:[1,1], elemScale:0.95 };
    case 'legend': return { statRange:[1,5], statScale:1.25, resRange:[1,2], elemRange:[1,2], elemScale:1.25 };
    default: return { statRange:[0,0], statScale:0, resRange:[0,0], elemRange:[0,0], elemScale:0 };
  }
}

function rollStatBuff(statScale){
  const pool=[
    {key:'atk', base:3}, {key:'def', base:2.2}, {key:'speed', base:6}, {key:'maxHp', base:18}, {key:'maxMana', base:16},
    {key:'manaRegen', base:0.9}, {key:'hpRegen', base:0.8}, {key:'critChance', base:0.012}, {key:'critMult', base:0.05}, {key:'cdr', base:0.018},
    {key:'lifesteal', base:0.02}, {key:'blockEff', base:0.02}, {key:'maxStam', base:16}, {key:'stamRegen', base:2.4}
  ];
  const pick = pool[randi(0, pool.length-1)];
  const variance = 0.8 + Math.random()*0.4; // 0.8 - 1.2
  const val = pick.base * statScale * variance;
  return { [pick.key]: Number(val.toFixed(pick.key.includes('chance')||pick.key.includes('cdr') ? 3 : 2)) };
}

function rollResistBuff(resScale){
  const key = RESIST_KEYS[randi(0, RESIST_KEYS.length-1)];
  const variance = 0.8 + Math.random()*0.4;
  const base = 0.10; // 10% base resist before scaling
  return { [key]: Number((base * resScale * variance).toFixed(3)) };
}

function mergeBuffSets(...sets){
  const out={};
  for(const s of sets){ if(!s) continue; for(const [k,v] of Object.entries(s)){ out[k]=(out[k]??0)+v; } }
  return out;
}

function rollCount([min,max]){ return min>=max ? min : randi(min, max); }

function buildElementalEffects(rarity){
  const rules = rarityAffixRules(rarity.key);
  const count = rollCount(rules.elemRange);
  const effects=[];
  for(let i=0;i<count;i++){
    const e = ELEMENTAL_TYPES[randi(0, ELEMENTAL_TYPES.length-1)];
    const chanceBase = 0.20 + 0.08*rules.elemScale;
    const chance = chanceBase + Math.random()*0.08;
    const power = (0.8 + Math.random()*0.4) * (rules.elemScale || 1);
    effects.push({ type:e.key, dotId:e.dotId, chance: Number(chance.toFixed(3)), powerMult: Number(power.toFixed(3)) });
  }
  return effects;
}

function makePotion(type, rarity, itemLevel = 1){
  const t=rarityTier(rarity);
  if(type==='hp'){
    const pct=0.28+t*0.05;
    return {id:Math.random().toString(16).slice(2),kind:'potion',type:'hp',rarity,
      itemLevel,
      name:`${rarity.name} Health Potion`,
      desc:`Restores <b>${Math.round(pct*100)}%</b> of Max HP. (Level ${itemLevel})`,
      data:{pct}
    };
  }
  const pct=0.34+t*0.05;
  return {id:Math.random().toString(16).slice(2),kind:'potion',type:'mana',rarity,
    itemLevel,
    name:`${rarity.name} Mana Potion`,
    desc:`Restores <b>${Math.round(pct*100)}%</b> of Max Mana. (Level ${itemLevel})`,
    data:{pct}
  };
}

function scaled(v,t,m=1){ return v + t*m; }

// Scale item stat value by item level and rarity
function scaleStatForItemLevel(baseStat, itemLevel, rarity) {
  const levelMult = 1 + (itemLevel - 1) * 0.12; // 12% per level
  const rarityMult = 1 + rarityTier(rarity) * 0.25; // 25% per rarity tier
  return baseStat * levelMult * rarityMult;
}

function makeArmor(slot, rarity, itemLevel = 1){
  const t=rarityTier(rarity);
  const POOLS = {
    helm: [
      {name:'Mind Helm', buffs:{maxMana: scaled(8,t,5), manaRegen: scaled(0.4,t,0.2)}},
      {name:'Guard Helm', buffs:{def: scaled(2,t,1.2), blockEff: scaled(0.03,t,0.02)}},
      {name:'Hunter Hood', buffs:{critChance: scaled(0.02,t,0.012), speed: scaled(4,t,2)}},
    ],
    shoulders: [
      {name:'Ward Pauldrons', buffs:{shieldGain: scaled(4,t,2), def: scaled(2,t,1)}},
      {name:'Swift Shoulders', buffs:{speed: scaled(6,t,3), maxStam: scaled(6,t,5)}},
      {name:'Rage Spikes', buffs:{atk: scaled(1.4,t,1.0), critMult: scaled(0.04,t,0.02)}},
    ],
    chest: [
      {name:'Iron Plate', buffs:{def: scaled(5,t,2.2), maxHp: scaled(10,t,7), speed: -scaled(4,t,2)}},
      {name:'Mage Robe', buffs:{maxMana: scaled(14,t,7), cdr: scaled(0.03,t,0.02)}},
      {name:'Berserker Harness', buffs:{atk: scaled(3,t,2), lifesteal: scaled(0.02,t,0.01), def: -scaled(0.6,t,0.3)}},
    ],
    hands: [
      {name:'Quick Gloves', buffs:{speed: scaled(4,t,2), critChance: scaled(0.01,t,0.01)}},
      {name:'Heavy Gauntlets', buffs:{atk: scaled(1.8,t,1.2), def: scaled(1,t,0.8)}},
      {name:'Arcane Wraps', buffs:{manaRegen: scaled(0.8,t,0.3), maxMana: scaled(6,t,5)}},
    ],
    belt: [
      {name:'Stamina Belt', buffs:{maxStam: scaled(10,t,8), stamRegen: scaled(1.2,t,0.6)}},
      {name:'Ward Sash', buffs:{cdr: scaled(0.02,t,0.02), manaRegen: scaled(0.4,t,0.2)}},
      {name:'Guardian Belt', buffs:{def: scaled(2,t,1.3), maxHp: scaled(8,t,5)}},
    ],
    legs: [
      {name:'Legguards', buffs:{def: scaled(3,t,1.6), maxHp: scaled(8,t,6)}},
      {name:'Strider Pants', buffs:{speed: scaled(8,t,4), maxStam: scaled(8,t,6)}},
      {name:'Battlemage Legs', buffs:{maxMana: scaled(10,t,6), cdr: scaled(0.02,t,0.02)}},
    ],
    feet: [
      {name:'Sprint Boots', buffs:{speed: scaled(10,t,5), stamRegen: scaled(1.6,t,0.8)}},
      {name:'Stone Boots', buffs:{def: scaled(2,t,1.4), blockEff: scaled(0.02,t,0.02), speed: -scaled(2,t,1)}},
      {name:'Lucky Boots', buffs:{critChance: scaled(0.02,t,0.012), maxStam: scaled(6,t,5)}},
    ],
    neck: [
      {name:'Charm of Focus', buffs:{maxMana: scaled(10,t,6), manaRegen: scaled(0.8,t,0.4)}},
      {name:'Charm of Vitality', buffs:{maxHp: scaled(18,t,8), hpRegen: scaled(0.6,t,0.3)}},
      {name:'Charm of Fortune', buffs:{critChance: scaled(0.02,t,0.012), goldFind: scaled(0.05,t,0.03)}},
    ],
    accessory1: [
      {name:'Signet Ring of Power', buffs:{atk: scaled(2.2,t,1.4), critChance: scaled(0.012,t,0.008)}},
      {name:'Ward Ring', buffs:{def: scaled(2.0,t,1.1), blockEff: scaled(0.02,t,0.012)}},
      {name:'Haste Ring', buffs:{speed: scaled(6,t,3), cdr: scaled(0.012,t,0.01)}},
    ],
    accessory2: [
      {name:'Bracelet of Flow', buffs:{manaRegen: scaled(0.9,t,0.4), cdr: scaled(0.015,t,0.01)}},
      {name:'Bracelet of Vigor', buffs:{maxStam: scaled(14,t,9), stamRegen: scaled(2.0,t,1.2)}},
      {name:'Bracelet of Leech', buffs:{lifesteal: scaled(0.02,t,0.01), atk: scaled(1.4,t,0.9)}},
    ],
  };
  const pool = POOLS[slot] || POOLS.helm; // fallback to prevent undefined
  const pick = pool[randi(0, pool.length-1)];
  const rules = rarityAffixRules(rarity.key);
  let extraBuffs={};
  const statCount = rollCount(rules.statRange);
  for(let i=0;i<statCount;i++) extraBuffs = mergeBuffSets(extraBuffs, rollStatBuff(rules.statScale));
  let resistBuffs={};
  const resCount = rollCount(rules.resRange);
  for(let i=0;i<resCount;i++) resistBuffs = mergeBuffSets(resistBuffs, rollResistBuff(Math.max(0.7, rules.statScale||0.0)));
  let mergedBuffs = mergeBuffSets(pick.buffs, extraBuffs, resistBuffs);
  
  // Scale all stats by item level
  const scaledBuffs = {};
  for(const [key, value] of Object.entries(mergedBuffs)) {
    const scaled = scaleStatForItemLevel(value, itemLevel, rarity);
    scaledBuffs[key] = key.includes('chance') || key.includes('cdr') || key.includes('res_') || key.includes('lifesteal') || key.includes('blockEff') 
      ? Number(scaled.toFixed(3)) 
      : key.includes('Regen') || key.includes('Mult') 
      ? Number(scaled.toFixed(2)) 
      : Math.round(scaled);
  }
  
  return {
    id:Math.random().toString(16).slice(2),
    kind:'armor',
    slot,
    rarity,
    itemLevel,
    name:`${rarity.name} ${SLOT_LABEL[slot]}: ${pick.name}`,
    desc:`Level ${itemLevel} ${SLOT_LABEL[slot]} armor. Buffs: ${describeBuffs(scaledBuffs)}`,
    buffs:scaledBuffs
  };
}

function describeElementals(effects){
  if(!effects || !effects.length) return '';
  return effects.map(e=> `${Math.round(e.chance*100)}% on-hit ${e.type} (${e.dotId})`).join('; ');
}

function makeWeapon(kind, rarity, itemLevel = 1){
  const t = rarityTier(rarity);
  const templates={
    'Destruction Staff': { buffs:{atk:3+t*1.6, maxMana:14+t*6, manaRegen:0.8+t*0.45} },
    'Healing Staff': { buffs:{maxMana:16+t*7, manaRegen:1.1+t*0.55, cdr:0.04+t*0.008} },
    'Axe': { buffs:{atk:4+t*3, critChance:0.02+t*0.01} },
    'Sword': { buffs:{atk:3+t*2.4, speed:4+t*2} },
    'Dagger': { buffs:{atk:2.4+t*1.6, speed:6+t*2.2, critChance:0.03+t*0.012} },
    'Greatsword': { buffs:{atk:5+t*3.5, def:2+t*1.4, speed:-4} }
  };
  const tpl=templates[kind] || templates['Sword'];
  const rules = rarityAffixRules(rarity.key);
  let extraBuffs={};
  const statCount = rollCount(rules.statRange);
  for(let i=0;i<statCount;i++) extraBuffs = mergeBuffSets(extraBuffs, rollStatBuff(rules.statScale));
  let buffs = mergeBuffSets(tpl.buffs, extraBuffs);
  
  // Scale all stats by item level
  const scaledBuffs = {};
  for(const [key, value] of Object.entries(buffs)) {
    const scaled = scaleStatForItemLevel(value, itemLevel, rarity);
    scaledBuffs[key] = key.includes('chance') || key.includes('cdr') || key.includes('res_') || key.includes('lifesteal') || key.includes('blockEff') 
      ? Number(scaled.toFixed(3)) 
      : key.includes('Regen') || key.includes('Mult') 
      ? Number(scaled.toFixed(2)) 
      : Math.round(scaled);
  }
  
  const elementalEffects = buildElementalEffects(rarity);
  const elemText = elementalEffects.length ? ` Elemental: ${describeElementals(elementalEffects)}` : '';
  return {
    id:Math.random().toString(16).slice(2),
    kind:'weapon', slot:'weapon',
    rarity,
    itemLevel,
    weaponType: kind,
    name:`${rarity.name} ${kind}`,
    desc:`Level ${itemLevel} ${kind} weapon. Buffs: ${describeBuffs(scaledBuffs)}${elemText}`,
    buffs:scaledBuffs,
    elementalEffects
  };
}

function makeLootDrop(x,y,item,gold=0){
  return {x,y,r:12,item,gold,timeLeft:LOOT_TTL};
}

function spawnLootAt(state, x,y){
  const rarity=pickRarity();
  const roll=Math.random();
  const gold=randi(3,12); // random gold drop
  const playerLevel = state.progression?.level || 1;
  const itemLevel = Math.max(1, playerLevel + randi(-2, 2)); // ±2 level variance
  
  if(roll<0.40){
    const armorSlots = ARMOR_SLOTS.filter(s=>s!=='weapon');
    const slot=armorSlots[randi(0,armorSlots.length-1)];
    return makeLootDrop(x,y,makeArmor(slot,rarity,itemLevel),gold);
  }
  if(roll<0.65){
    const weaponKinds=['Destruction Staff','Healing Staff','Axe','Sword','Dagger','Greatsword'];
    const kind=weaponKinds[randi(0,weaponKinds.length-1)];
    return makeLootDrop(x,y,makeWeapon(kind, rarity,itemLevel),gold);
  }
  if(roll<0.82) return makeLootDrop(x,y,makePotion('hp',rarity,itemLevel),gold);
  return makeLootDrop(x,y,makePotion('mana',rarity,itemLevel),gold);
}

function addToInventory(state, item, gold=0){
  // Add gold if included
  if(gold > 0){
    state.player.gold += gold;
    state.ui.renderInventory?.();
  }
  // Potions stack: check if same potion type already exists
  if(item.kind === 'potion'){
    const existing = state.inventory.find(i => i.kind === 'potion' && i.type === item.type && i.rarity.key === item.rarity.key);
    if(existing){
      existing.count = (existing.count || 1) + 1;
      const goldMsg = gold > 0 ? ` +${gold} gold` : '';
      const color = item.rarity?.color || '#fff';
      state.ui.toast(`<span style="color:${color}"><b>${item.name}</b></span> added to inventory (x${existing.count})${goldMsg}`);
      return;
    }
  }
  // Unlimited inventory: always accept the item
  item.count = item.count || 1;
  state.inventory.push(item);
  const goldMsg = gold > 0 ? ` +${gold} gold` : '';
  const color = item.rarity?.color || '#fff';
  state.ui.toast(`<span style="color:${color}"><b>${item.name}</b></span> added to inventory${goldMsg}`);
}

function playLootPickup(state){
  if(state.sounds?.lootPickup){
    const audio = state.sounds.lootPickup.cloneNode();
    audio.volume = state.sounds.lootPickup.volume;
    audio.play().catch(() => {});
  }
}

function pickupNearestLoot(state){
  let best=-1, bestD=Infinity;
  for(let i=0;i<state.loot.length;i++){
    const l=state.loot[i];
    const d=Math.hypot(l.x-state.player.x,l.y-state.player.y);
    if(d<bestD){bestD=d; best=i;}
  }
  if(best===-1 || bestD>72){ state.ui.toast('No loot nearby.'); return; }
  const l=state.loot[best];
  state.loot.splice(best,1);
  addToInventory(state, l.item, l.gold || 0);
  playLootPickup(state);
  state.ui.renderInventory?.();
}

function dropItemToWorld(state, item){
  state.loot.push(makeLootDrop(state.player.x+rand(-26,26), state.player.y+rand(-26,26), item));
}

function isDown(state, action){
  return state.input.keysDown.has(state.binds[action]);
}

function getMoveVector(state){
  let x=0,y=0;
  if(isDown(state,'moveUp')) y-=1;
  if(isDown(state,'moveDown')) y+=1;
  if(isDown(state,'moveLeft')) x-=1;
  if(isDown(state,'moveRight')) x+=1;
  return {x,y};
}

function siteAllowsPassage(site, entity, state){
  // Check if this is a captured flag with health (collision enabled)
  if(site.id && site.id.startsWith('site_') && site.owner && site.health > 0){
    // Determine entity team: player, friendly allies, or enemy
    let entityTeam;
    if(entity === state.player){
      entityTeam = 'player';
    } else if(state.friendlies.includes(entity)){
      entityTeam = 'player'; // Friendlies are on player's team
    } else {
      entityTeam = entity.team || null;
    }
    // Allow allies to pass through their own flag
    if(entityTeam === site.owner) return true;
    
    // Check if trying to cross through a wall
    if(site.wall && site.wall.sides){
      // Determine which side of the wall the entity is crossing
      const dx = entity.x - site.x;
      const dy = entity.y - site.y;
      const angle = Math.atan2(dy, dx);
      const normalizedAngle = ((angle + Math.PI * 2) % (Math.PI * 2)); // 0 to 2π
      
      // Map angle to wall side: 0=East, 1=South, 2=West, 3=North
      // Angles: East (0), South (π/2), West (π), North (3π/2)
      let sideIdx;
      if(normalizedAngle < Math.PI / 4 || normalizedAngle >= 7 * Math.PI / 4){
        sideIdx = 0; // East/Right
      } else if(normalizedAngle < 3 * Math.PI / 4){
        sideIdx = 1; // South/Bottom
      } else if(normalizedAngle < 5 * Math.PI / 4){
        sideIdx = 2; // West/Left
      } else {
        sideIdx = 3; // North/Top
      }
      
      const side = site.wall.sides[sideIdx];
      // If this specific wall side is destroyed, allow passage
      if(side && side.destroyed){
        return true;
      }
    }
    
    // Block enemies from passing through intact walls
    return false;
  }
  // No walls or destroyed flags - allow all passage
  return true;
}

function rollCrit(st){ return Math.random()<st.critChance; }

function applyWeaponElementals(state, target){
  const weapon = state?.player?.equip?.weapon;
  if(!weapon || !weapon.elementalEffects || !weapon.elementalEffects.length) return;
  for(const eff of weapon.elementalEffects){
    if(Math.random() <= (eff.chance || 0)){
      applyDotTo(target, eff.dotId, { powerMult: eff.powerMult || 1 });
    }
  }
}

function notePlayerHpGain(state, gained, cause, extra={}){
  if(!state || !state.player) return;
  const amt = Number(gained);
  if(!Number.isFinite(amt) || amt <= 0) return;
  state._playerHpAccountedGain = (state._playerHpAccountedGain || 0) + amt;
  state._playerHpAccountedSources = state._playerHpAccountedSources || [];
  state._playerHpAccountedSources.push({
    time: (state.campaign?.time || 0).toFixed(2),
    cause: String(cause || 'unknown'),
    gained: +amt.toFixed(2),
    ...extra
  });
  if(state._playerHpAccountedSources.length > 10) state._playerHpAccountedSources.shift();
}

function applyDamageToEnemy(e,dmg,st,state,fromPlayer=false){
  const crit=rollCrit(st||{critChance:0});
  const final=crit?(dmg*(st?.critMult||1.5)):dmg;
  
  const hpBefore = e.hp;
  e.hp-=final;
  e.hp = Math.max(0, e.hp); // Clamp to 0 minimum
  
  // Track damage dealt and received
  e._damageReceived = (e._damageReceived || 0) + final;
  if(fromPlayer){
    state.player._damageDealt = (state.player._damageDealt || 0) + final;
  }
  
  // Log enemy damage (1% sample rate)
  if(state?.debugLog && Math.random() < 0.01){
    state.debugLog.push({
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'ENEMY_DAMAGE',
      enemy: e.name || e.variant,
      role: e.role || 'unknown',
      damage: final.toFixed(1),
      crit: crit,
      hpBefore: hpBefore.toFixed(1),
      hpAfter: e.hp.toFixed(1),
      fromPlayer: fromPlayer
    });
  }
  
  // spawn floating damage number above target only when player deals damage
  if(fromPlayer){
    try{
      state.effects.damageNums.push({ x:e.x, y:e.y - (e.r||12) - 8, vy:-22, amt:Math.round(final), life:0.9, crit });
    }catch(err){}
    applyWeaponElementals(state, e);
  }
  return {crit,dealt:final};
}

function getWorldMouse(state){
  const m = state.input.mouse;
  const cam = state.camera || { x:0, y:0, zoom:1 };
  const wx = (m.x - state.engine.canvas.width/2) / (cam.zoom||1) + cam.x;
  const wy = (m.y - state.engine.canvas.height/2) / (cam.zoom||1) + cam.y;
  return { x: wx, y: wy };
}

function lifestealFrom(state, dealt, st){
  const ls = Number(st?.lifesteal ?? 0);
  const dealtNum = Number(dealt);
  if(!Number.isFinite(ls) || ls <= 0) return;
  if(!Number.isFinite(dealtNum) || dealtNum <= 0) {
    // Rare long-run edge case: some damage events can yield undefined dealt.
    if(state?.debugLog && !state._warnedBadLifestealDealt){
      state._warnedBadLifestealDealt = true;
      logDebug(state, 'DAMAGE', 'Skipping lifesteal due to invalid damageDealt', {
        type: 'LIFESTEAL_SKIP',
        dealt,
        lifesteal: ls,
        hasPlayer: !!state.player,
        maxHp: st?.maxHp
      });
    }
    return;
  }

  const heal = dealtNum * ls;
  if(!Number.isFinite(heal) || heal <= 0) return;
  if(!state?.player) return;

  const hpBefore = Number(state.player.hp || 0);

  const maxHp = Number(st?.maxHp);
  state.player.hp = clamp((state.player.hp || 0) + heal, 0, Number.isFinite(maxHp) ? maxHp : (state.player.maxHp || 999999));

  const hpAfter = Number(state.player.hp || 0);
  const gained = Math.max(0, hpAfter - hpBefore);
  if(gained > 0){
    notePlayerHpGain(state, gained, 'lifesteal', {
      sourceAbilityId: null,
      lifesteal: ls,
      damageDealt: dealtNum
    });
  }

  // Log lifesteal healing (defensive formatting)
  const hpNow = Number(state.player.hp);
  logPlayerEvent(state, 'HEAL', {
    source: 'lifesteal',
    amount: Number.isFinite(heal) ? heal.toFixed(1) : String(heal),
    lifestealPercent: Number.isFinite(ls) ? (ls * 100).toFixed(1) + '%' : String(ls),
    damageDealt: dealtNum.toFixed(1),
    newHP: Number.isFinite(hpNow) ? hpNow.toFixed(1) : String(hpNow),
    maxHP: st?.maxHp
  });
}

function applyDamageToPlayer(state, raw, st, attacker=null){
  const hpBefore = state.player.hp;
  const shieldBefore = state.player.shield;
  
  // Log every damage attempt
  logDebug(state, 'DAMAGE', 'Damage attempt to player', {
    rawDamage: raw,
    currentShield: state.player.shield,
    currentHP: state.player.hp,
    blocking: state.input.mouse.rDown,
    stamina: state.player.stam
  });
  
  console.log('%c[DAMAGE TO PLAYER]', 'color: #f44; font-weight: bold;');
  console.log('  Raw damage:', raw.toFixed(1));
  console.log('  Current shield:', state.player.shield.toFixed(1), '(source:', state.player._lastShieldSource || 'unknown', ')');
  console.log('  Current HP:', state.player.hp.toFixed(1), '/', st.maxHp.toFixed(1));
  console.log('  Block active:', state.input.mouse.rDown ? 'YES' : 'NO', '| Stamina:', state.player.stam.toFixed(1));
  
  let dmg = raw;
  let shieldDamage = 0;
  let postShieldDamage = 0;
  let blockedAmount = 0;
  let defReduced = 0;
  
  // Track damage received
  state.player._damageReceived = (state.player._damageReceived || 0) + raw;
  
  // STEP 1: Shield absorbs 100% of damage first (if present)
  if(state.player.shield > 0){
    const absorbed = Math.min(state.player.shield, dmg);
    state.player.shield -= absorbed;
    shieldDamage = absorbed;
    dmg -= absorbed;
    console.log('  [STEP 1 - SHIELD] Absorbed:', absorbed.toFixed(1), '| Shield remaining:', state.player.shield.toFixed(1));
    
    // Log shield loss
    logPlayerEvent(state, 'SHIELD_LOST', {
      amount: absorbed,
      before: shieldBefore,
      after: state.player.shield
    });
  } else {
    console.log('  [STEP 1 - SHIELD] No shield active');
  }
  
  // STEP 2: Blocking reduces remaining damage by 50% (only uses stamina when damage is actually blocked)
  const blocking = state.input.mouse.rDown && state.player.stam > 0;
  if(blocking && dmg > 0){
    const preBlockDmg = dmg;
    dmg *= (1 - st.blockBase); // Reduce by blockBase% (typically 50%)
    blockedAmount = preBlockDmg - dmg;
    
    // Consume stamina proportional to blocked damage (0.5 stamina per point blocked, minimum 5)
    const stamCost = Math.max(5, blockedAmount * 0.5);
    state.player.stam = Math.max(0, state.player.stam - stamCost);
    console.log('  [STEP 2 - BLOCK] Block %:', (st.blockBase * 100).toFixed(0) + '%', '| Blocked:', blockedAmount.toFixed(1));
    console.log('    Stamina cost:', stamCost.toFixed(1), '| Stamina remaining:', state.player.stam.toFixed(1));
  } else if(dmg > 0){
    console.log('  [STEP 2 - BLOCK] Not blocking (no stam or not holding RMB)');
  }
  
  // STEP 3: Apply defense formula to remaining damage
  const preDefDmg = dmg;
  dmg = dmg * (100 / (100 + st.def));
  defReduced = preDefDmg - dmg;
  console.log('  [STEP 3 - DEFENSE] Defense:', st.def.toFixed(1), '| Reduced by:', defReduced.toFixed(1));
  
  // STEP 4: Subtract from HP
  if(dmg > 0){
    state.player.hp -= dmg;
    // Clamp HP to minimum 0 (never go negative)
    state.player.hp = Math.max(0, state.player.hp);
    const hpAfter = state.player.hp;
    console.log('  [STEP 4 - HP DAMAGE] Before:', hpBefore.toFixed(1), '| Damage:', dmg.toFixed(1), '| After:', hpAfter.toFixed(1));
    console.log('%c[DAMAGE SUMMARY] Raw: ' + raw.toFixed(1) + ' → Shield: ' + shieldDamage.toFixed(1) + ' → Final HP loss: ' + dmg.toFixed(1), 'color: #f44; font-weight: bold;');
    
    // Track damage taken timestamp for combat music (use Date.now() for reliable timing)
    state.lastDamageTakenTimestamp = Date.now();
    
    // Track damage dealt by attacker
    if(attacker){
      attacker._damageDealt = (attacker._damageDealt || 0) + dmg;
    }
    
    // Log damage taken to player event log
    logPlayerEvent(state, 'DAMAGE_TAKEN', {
      raw,
      shieldAbsorbed: shieldDamage,
      blocked: blockedAmount,
      defReduced,
      hpLoss: dmg,
      hpBefore,
      hpAfter
    });
    
    // Enhanced combat log for damage mitigation analysis
    if(state.debugLog && Math.random() < 0.03){
      state.debugLog.push({
        time: (state.campaign?.time || 0).toFixed(2),
        type: 'DAMAGE_MITIGATION',
        target: 'Player',
        attacker: attacker ? (attacker.name || attacker.variant || 'unknown') : 'unknown',
        rawDamage: raw.toFixed(1),
        shieldMitigated: shieldDamage.toFixed(1),
        blockMitigated: blockedAmount.toFixed(1),
        defMitigated: defReduced.toFixed(1),
        finalDamage: dmg.toFixed(1),
        mitigationPercent: ((1 - dmg/raw) * 100).toFixed(1),
        hpPercent: ((hpAfter / st.maxHp) * 100).toFixed(1)
      });
    }
    
    // Log to combat log (even if damage was absorbed by shield)
    if(state.combatLog){
      state.combatLog.push({
        time: (state.campaign?.time || 0).toFixed(2),
        type: 'DAMAGE',
        target: 'Player',
        raw: raw.toFixed(2),
        shieldAbsorbed: shieldDamage.toFixed(2),
        blocked: blockedAmount.toFixed(2),
        defReduced: defReduced.toFixed(2),
        hpLoss: dmg.toFixed(2),
        hpBefore: hpBefore.toFixed(2),
        hpAfter: hpAfter.toFixed(2)
      });
    }
  } else {
    console.log('  [STEP 4 - HP DAMAGE] No HP damage (fully mitigated)');
    
    // Log shield-only damage to combat log
    if(state.combatLog && shieldDamage > 0){
      state.combatLog.push({
        time: (state.campaign?.time || 0).toFixed(2),
        type: 'SHIELD_DAMAGE',
        target: 'Player',
        raw: raw.toFixed(2),
        shieldAbsorbed: shieldDamage.toFixed(2),
        blocked: blockedAmount.toFixed(2),
        defReduced: defReduced.toFixed(2),
        hpLoss: 0,
        hpBefore: hpBefore.toFixed(2),
        hpAfter: hpBefore.toFixed(2)
      });
    }
  }
}

// Generic shield-first damage for any entity (player, friendly, enemy, creature)
function applyShieldedDamage(state, entity, amount, attacker=null){
  if(!entity || amount<=0) return;
  // respect invulnerability buffs
  try{
    if(entity.buffs && entity.buffs.some(b=>BUFF_REGISTRY?.[b.id]?.stats?.invulnerable)) return;
  }catch{}
  
  let remain = amount;
  
  // BLOCKING: Reduce damage by 50% if entity is blocking and has stamina
  // Only applies to guards who have blocking capability
  if(entity.blocking && entity.stam > 0){
    const blockReduction = remain * 0.5; // 50% damage reduction
    const stamDrain = Math.max(5, blockReduction * 0.5); // 0.5 stamina per point blocked, minimum 5
    
    // Only block if we have enough stamina
    if(entity.stam >= stamDrain){
      remain -= blockReduction;
      entity.stam -= stamDrain;
      entity.stam = Math.max(0, entity.stam);
      
      // Log block event (10% sample rate)
      if(state?.debugLog && Math.random() < 0.1){
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'BLOCK_DAMAGE_REDUCED',
          blocker: entity.name || entity.variant || 'unknown',
          blockerRole: entity.guardRole || entity.role || 'unknown',
          damageBlocked: blockReduction.toFixed(1),
          staminaCost: stamDrain.toFixed(1),
          staminaAfter: entity.stam.toFixed(1),
          remainingDamage: remain.toFixed(1)
        });
      }
    } else {
      // Not enough stamina - block failed
      entity.blocking = false;
      
      if(state?.debugLog && Math.random() < 0.05){
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'BLOCK_FAILED_NO_STAMINA',
          blocker: entity.name || entity.variant || 'unknown',
          stamina: entity.stam.toFixed(1),
          requiredStamina: stamDrain.toFixed(1)
        });
      }
    }
  }
  
  // Shield absorbs remaining damage first
  if(entity.shield>0){
    const used = Math.min(entity.shield, remain);
    entity.shield -= used;
    remain -= used;
  }
  if(remain<=0) return;
  const maxHp = entity===state.player ? currentStats(state).maxHp : entity.maxHp || 9999;
  entity.hp = clamp((entity.hp||0) - remain, 0, maxHp);
  
  // Track last damage time for guard blocking system
  if(entity.guard){
    entity._lastDamagedAt = state.campaign?.time || 0;
  }
  
  // Track damage dealt and received
  entity._damageReceived = (entity._damageReceived || 0) + amount;
  if(attacker){
    attacker._damageDealt = (attacker._damageDealt || 0) + amount;
  }
  
  // Log shielded damage events for debugging
  if(state?.debugLog && Math.random() < 0.02 && amount > 0){
    const shieldUsed = Math.min((entity.shield || 0) + remain, amount);
    const isFriendly = state?.friendlies?.includes(entity);
    const isEnemy = state?.enemies?.includes(entity);
    const timeVal = state.campaign?.time ?? 0;
    state.debugLog.push({
      time: timeVal.toFixed(2),
      type: 'SHIELDED_DAMAGE',
      attacker: attacker ? (attacker.name || attacker.variant || 'unknown') : 'unknown',
      target: entity.name || entity.variant || 'unknown',
      targetType: isFriendly ? 'friendly' : (isEnemy ? 'enemy' : 'unknown'),
      shieldBefore: ((entity.shield || 0) + shieldUsed).toFixed(1),
      shieldAfter: (entity.shield || 0).toFixed(1),
      hpLoss: remain.toFixed(1),
      totalDamage: amount.toFixed(1),
      targetHP: Math.round(entity.hp || 0)
    });
  }
}

const ELEMENT_COLORS = { fire:'#ff9a3c', shock:'#6ec0ff', poison:'#5fd86b', ice:'#c4e6ff', arcane:'#c16bff' };
const FRIENDLY_DMG_COLOR = '#9b7bff';
const ENEMY_DMG_COLOR = '#e55959';
const HEAL_COLOR = '#ffd760';
const SHIELD_COLOR = '#ffb347';

function inferElementFromProjectileOpts(opts){
  if(!opts) return null;
  if(opts.element) return opts.element;
  if(opts.dotId === 'burn') return 'fire';
  if(opts.dotId === 'poison') return 'poison';
  if(opts.buffId === 'silence') return 'arcane';
  return null;
}

function colorForProjectile(opts, fromPlayer){
  const el = inferElementFromProjectileOpts(opts);
  if(el && ELEMENT_COLORS[el]) return ELEMENT_COLORS[el];
  if(opts && opts.kind === 'heal') return HEAL_COLOR;
  if(opts && opts.shield) return SHIELD_COLOR;
  return fromPlayer ? FRIENDLY_DMG_COLOR : ENEMY_DMG_COLOR;
}

const degToRad = (d)=>d*Math.PI/180;
const MELEE_ARC_CAPS = {
  common: degToRad(120),
  uncommon: degToRad(160),
  rare: degToRad(210),
  epic: degToRad(270),
  legend: Math.PI*2,
  legendary: Math.PI*2
};

function normalizedRarityKey(k){
  if(k==='legendary') return 'legend';
  return k || 'common';
}

function weaponRarityKey(state){
  const key = state?.player?.equip?.weapon?.rarity?.key;
  return normalizedRarityKey(key);
}

function meleeArcCap(state){
  const key = weaponRarityKey(state);
  return MELEE_ARC_CAPS[key] || MELEE_ARC_CAPS.common;
}

function randomMeleeArc(baseArc, state){
  const cap = meleeArcCap(state);
  const minArc = Math.min(cap, baseArc*0.9);
  const span = Math.max(0, cap - minArc);
  return minArc + Math.random()*span;
}

function meleeRangeForWeapon(baseRange, state){
  const weapon = state?.player?.equip?.weapon;
  const tier = rarityTier(weapon?.rarity || { key: weaponRarityKey(state) });
  const scale = 1 + tier*0.08; // modest growth per rarity tier
  const jitter = 0.94 + Math.random()*0.12;
  return baseRange * scale * jitter;
}

function weaponElementForColor(weapon){
  if(!weapon?.elementalEffects || !weapon.elementalEffects.length) return null;
  const t = weapon.elementalEffects[0].type;
  if(t==='lightning') return 'shock';
  if(t==='bleed') return null; // bleed visuals fall back to default damage color
  return t;
}

function meleeSlashColor(base, state){
  // honor precomputed color if supplied (e.g., enemy/friendly attacks)
  if(base.color) return base.color;
  const weapon = base.weapon || state?.player?.equip?.weapon;
  const element = weaponElementForColor(weapon);
  const col = colorForProjectile({ element, dotId: base.dotId, kind: base.kind }, true);
  // tint by team if provided
  if(!col && base.team){
    if(base.team === 'enemy') return cssVar('--enemy') || FRIENDLY_DMG_COLOR;
    if(base.team === 'player') return cssVar('--player') || FRIENDLY_DMG_COLOR;
  }
  return col || FRIENDLY_DMG_COLOR;
}

function pushSlashEffect(state, base){
  const arc = randomMeleeArc(base.arc, state);
  const range = meleeRangeForWeapon(base.range, state);
  const color = meleeSlashColor(base, state);
  const slash = { ...base, arc, range, color, x: base.x, y: base.y };
  state.effects.slashes.push(slash);
  return slash;
}

// Play positioned sound with distance-based volume falloff
function playPositionalSound(state, soundName, x, y, maxHearDistance = 600, baseVolume = 0.4){
  if(!state.sounds || !state.sounds[soundName]) return;
  const playerDist = Math.hypot(x - state.player.x, y - state.player.y);
  if(playerDist > maxHearDistance) return; // Too far, don't play
  
  // Calculate volume based on distance (closer = louder)
  const volumeFactor = 1 - (playerDist / maxHearDistance);
  const volume = baseVolume * Math.max(0, volumeFactor);
  
  if(volume <= 0) return;
  
  // Clone the audio to allow overlapping plays
  const audio = state.sounds[soundName].cloneNode();
  audio.volume = volume;
  audio.play().catch(e => {}); // Silently fail if can't play
}

// Throttled positional fire sound for damaged outposts
function playOutpostFireSound(state, site){
  if(!state.sounds?.fireDamage) return;
  if(!site || !site.maxHealth) return;
  // Don't play fire sound if site is destroyed
  if(site.damageState === 'destroyed' || site.health <= 0) return;
  const pct = site.health / site.maxHealth;
  if(pct > 0.70) return;
  const now = Date.now();
  if(site._lastFireSound && now - site._lastFireSound < 4000) return;
  
  const playerDist = Math.hypot(site.x - state.player.x, site.y - state.player.y);
  const maxHearDistance = 900;
  if(playerDist > maxHearDistance) return;
  
  // Calculate volume based on distance
  const volumeFactor = 1 - (playerDist / maxHearDistance);
  const volume = 0.6 * Math.max(0, volumeFactor);
  if(volume <= 0) return;
  
  // Clone audio and track it for this site so we can stop it later
  const audio = state.sounds.fireDamage.cloneNode();
  audio.volume = volume;
  audio.play().catch(e => {});
  
  // Store the active audio instance so we can stop it immediately when captured
  site._activeFireAudio = audio;
  site._lastFireSound = now;
}

function stopOutpostFireSound(state, site){
  if(!site) return;
  // Stop the actively playing fire sound for this site immediately
  if(site._activeFireAudio){
    try{
      site._activeFireAudio.pause();
      site._activeFireAudio.currentTime = 0;
      site._activeFireAudio = null;
    }catch(e){}
  }
  site._lastFireSound = 0; // Reset timer to prevent future sounds
}

function spawnProjectile(state, x,y,angle,speed,r,dmg,pierce=0, fromPlayer=true, opts={}){
  // Play staff attack sound at projectile spawn location
  if(fromPlayer){
    playPositionalSound(state, 'staffAttack', x, y, 600, 0.3);
  }
  
  const p = {x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r,dmg,pierce,life:1.35, fromPlayer};
  if(opts.dotId) p.dotId = opts.dotId;
  if(opts.buffId) p.buffId = opts.buffId;
  // source attribution for applied-effect auditing
  if(opts.sourceAbilityId || opts.abilityId || opts.ability) p.sourceAbilityId = opts.sourceAbilityId ?? opts.abilityId ?? opts.ability;
  if(opts.sourceKind) p.sourceKind = opts.sourceKind;
  if(opts.sourceType) p.sourceType = opts.sourceType;
  if(opts.team) p.team = opts.team;
  if(opts.shooter) p.shooter = opts.shooter; // Track who fired this projectile
  if(opts.sourceCasterId) p.sourceCasterId = opts.sourceCasterId;
  if(opts.sourceCasterName) p.sourceCasterName = opts.sourceCasterName;
  if(opts.shooter && !p.sourceCasterId) p.sourceCasterId = opts.shooter.id || opts.shooter._id;
  if(opts.shooter && !p.sourceCasterName) p.sourceCasterName = opts.shooter.name || opts.shooter.variant;
  const col = colorForProjectile(opts, fromPlayer);
  if(col) p.color = col;
  if(opts.element) p.element = opts.element;
  if(opts.maxRange){
    p.maxRange = opts.maxRange;
    p.startX = x;
    p.startY = y;
  }
  state.projectiles.push(p);
}

function awardXP(state, amount){
  // Apply diminishing returns if player is over-leveled for current zone
  const currentZone = state.zoneConfig.zones[state.zoneConfig.currentZone - 1];
  let xpMult = 1.0;
  if (currentZone && state.progression.level > currentZone.maxLevel) {
    // Player is over-leveled for this zone - apply diminishing returns
    const levelsOver = state.progression.level - currentZone.maxLevel;
    if (levelsOver >= 3) {
      xpMult = 0.05; // 95% reduction if 3+ levels over cap
    } else if (levelsOver === 2) {
      xpMult = 0.25; // 75% reduction if 2 levels over
    } else if (levelsOver === 1) {
      xpMult = 0.50; // 50% reduction if 1 level over
    }
    amount = Math.floor(amount * xpMult);
    if (amount > 0) {
      console.log(`[XP] Over-leveled for zone (${state.progression.level} > ${currentZone.maxLevel}). XP reduced by ${Math.floor((1-xpMult)*100)}%`);
    } else {
      console.log(`[XP] Too over-leveled for zone. No XP gained.`);
      return; // No XP if reduced to 0
    }
  }
  
  state.progression.xp += amount;
  console.log(`[XP] Awarded ${amount} XP. Total: ${state.progression.xp}/${xpForNext(state.progression.level)}`);
  let leveled=false;
  let newLevel = state.progression.level;
  let bonusMsg = ''; // Declare outside the loop
  
  while(state.progression.xp >= xpForNext(state.progression.level)){
    state.progression.xp -= xpForNext(state.progression.level);
    state.progression.level += 1;
    newLevel = state.progression.level;
    state.progression.statPoints += 2; // Always 2 stat points per level
    
    // Award 1 skill point per level (slot system)
    state.progression.skillPoints += 1;
    state.progression.totalSkillPoints += 1;
    
    // PERMANENT STAT INCREASES PER LEVEL (RPG best practice)
    if(!state.progression.baseStats) {
      state.progression.baseStats = {maxHp: 0, maxMana: 0, maxStam: 0};
    }
    state.progression.baseStats.maxHp += 10;  // +10 HP per level
    state.progression.baseStats.maxMana += 5;  // +5 Mana per level
    state.progression.baseStats.maxStam += 5;  // +5 Stamina per level
    
    leveled=true;
    
    // Update zone tier (every 5 levels)
    state.zoneConfig.zoneTier = Math.floor(state.progression.level / 5) + 1;
    
    bonusMsg += ` +1 Skill Point (${state.progression.skillPoints} total)`;
    
    // Milestone rewards (ESO/WoW style)
    
    // Every 5 levels: bonus gold + zone tier increase
    if (newLevel % 5 === 0) {
      const goldBonus = newLevel * 25;
      state.player.gold += goldBonus;
      bonusMsg += ` +${goldBonus} gold! Zone Tier ${state.zoneConfig.zoneTier}`;
    }
    
    // Special milestones
    if (newLevel === 50) bonusMsg += ' 🏆 MAX LEVEL REACHED! 🏆';
    // TODO: Future milestones when systems are implemented:
    // if (newLevel === 10) bonusMsg += ' New zones unlocked!';
    // if (newLevel === 25) bonusMsg += ' Elite content unlocked!';
  }
  
  if(leveled){
    const msg = `<b>Level up!</b> Level <b>${newLevel}</b> (+2 stat points)${bonusMsg ? '<br>' + bonusMsg : ''}`;
    state.ui.toast(msg);
    // Show large level-up animation
    if (state.ui && state.ui.showLevelUp) {
      state.ui.showLevelUp(newLevel);
    }
    // Update HUD to refresh XP bar
    if (state.ui && state.ui.renderHud) {
      state.ui.renderHud(currentStats(state));
    }
    saveJson('orb_rpg_mod_prog', state.progression);
  }
}

function killEnemy(state, index, fromPlayer=true){
  const e=state.enemies[index];
  // Close unit inspection if this was the selected unit
  if(state.selectedUnit && state.selectedUnit.unit===e){
    try{ state.ui.hideUnitPanel?.(); }catch{}
  }
  
  // Check if this is the zone boss
  if (e.boss && state.zoneConfig.bossActive && state.zoneConfig.bossEntity === e) {
    handleZoneBossDefeat(state);
  }
  
  // Track kills for player
  if(fromPlayer){
    awardXP(state, e.xp);
    state.player.kills = (state.player.kills || 0) + 1;
    
    // Play kill sound
    if(state.sounds?.killCounter){
      const audio = state.sounds.killCounter.cloneNode();
      audio.volume = 0.5;
      audio.play().catch(e => {});
    }
    
    // Check for bomb (multikill within time window)
    if(!state._bombTimer) state._bombTimer = 0;
    if(!state._bombCount) state._bombCount = 0;
    
    const now = performance.now();
    if(now - state._bombTimer < 3000){
      // Within 3 second window - increment bomb count
      state._bombCount++;
    } else {
      // New bomb sequence
      state._bombCount = 1;
    }
    state._bombTimer = now;
    
    // Show bomb notification if 3+ kills in window
    if(state._bombCount >= 3){
      if(state._bombCount > (state.player.biggestBomb || 0)){
        state.player.biggestBomb = state._bombCount;
      }
      if(state.ui && state.ui.showBomb){
        state.ui.showBomb(state._bombCount);
      }
    }
  }
  
  // Dungeon enemies do not respawn; boss guarantees legendary drop
  if(e.dungeonId){
    if(e.boss){
      // create a guaranteed legendary for the dungeon boss
      const item = makeLegendaryItem(state);
      // if we saved a world position prior to entering, drop loot there so it's pickup-able in the main world
      if(state._savedWorld){
        const sx = state._savedWorld.px || state.player.x; const sy = state._savedWorld.py || state.player.y;
        state.loot.push(makeLootDrop(sx, sy, item));
        state.ui.toast(`<b>Dungeon Boss</b> dropped a Legendary at your return location.`);
      } else {
        // fallback: add to inventory directly
        addToInventory(state, item);
        state.ui.toast(`<b>Dungeon Boss</b> added a Legendary to your inventory.`);
      }
    } else {
      // small chance for minor loot still
      if(Math.random()<0.55) state.loot.push(spawnLootAt(state, e.x, e.y));
      else state.player.gold += randi(1,3);
    }
    // no respawn for dungeon mobs
    state.enemies.splice(index,1);
    // if boss died, exit dungeon
    if(e.boss && e.dungeonId) exitDungeon(state);
    return;
  }
  if(Math.random()<0.85) state.loot.push(spawnLootAt(state, e.x, e.y));
  else state.player.gold += randi(1,4);
  // If this was a guard, schedule a guard respawn for its home site after 30s
  if(e.guard && e.homeSiteId){
    const site = state.sites.find(s=>s.id===e.homeSiteId);
    if(site) site.guardRespawns.push(30.0);
  } else {
    // enqueue a delayed respawn for fighters/knights at nearest owned site to where they died
    state.enemyRespawns.push({ timeLeft: rand(5,9), team: e.team, x: e.x, y: e.y });
  }
  state.enemies.splice(index,1);
}

function enemyTemplate(t){
  // Base stats only - no time scaling to avoid compounding with level/class multipliers
  // Level scaling is handled in applyClassToUnit
  return { speed:90, maxHp:50, contactDmg:12, xp:10 };
}

export function applyClassToUnit(unit, cls){
  const base = { maxHp: unit.maxHp||50, speed: unit.speed||90, contactDmg: unit.contactDmg||8 };
  let f = { hp:1.0, spd:1.0, dmg:1.0 };
  if(cls==='mage') f = { hp:0.9, spd:1.06, dmg:0.95 };
  else if(cls==='warrior') f = { hp:1.15, spd:1.0, dmg:1.10 };
  else if(cls==='knight') f = { hp:1.45, spd:0.86, dmg:1.0 };
  else if(cls==='warden') f = { hp:1.85, spd:0.72, dmg:0.85 };
  unit.maxHp = Math.round(base.maxHp * f.hp);
  unit.hp = unit.maxHp;
  unit.speed = Math.round(base.speed * f.spd);
  unit.contactDmg = Math.round((base.contactDmg||unit.dmg||10) * f.dmg);
  // scale by level if present
  if(unit.level && unit.level>1){
    const L = unit.level;
    const hpMult = 1 + (L-1)*0.12;
    const dmgMult = 1 + (L-1)*0.10;
    unit.maxHp = Math.round(unit.maxHp * hpMult);
    unit.hp = unit.maxHp;
    unit.contactDmg = Math.round(unit.contactDmg * dmgMult);
  }
}

const COMMON_RARITY = { key:'common', tier: 1, name: 'Common', color: '#c8c8c8' };
const UNCOMMON_RARITY = { key:'uncommon', tier: 2, name: 'Uncommon', color: '#8fd' };
const RARE_RARITY = { key:'rare', tier: 3, name: 'Rare', color: '#9cf' };
const EPIC_RARITY = { key:'epic', tier: 4, name: 'Epic', color: '#c9f' };
const LEGENDARY_RARITY = { key:'legend', tier: 5, name: 'Legendary', color: '#f9c' };

function rarityMult(r){
  const t = r?.tier || 1;
  return 1 + (t-1)*0.35;
}

function makeArmorItem(slot, rarity, buffs, name){
  // Use lowercase slot for image path matching (e.g., 'legs.png' not 'Legs.png')
  const displayName = SLOT_LABEL[slot] || (slot.charAt(0).toUpperCase() + slot.slice(1));
  return { kind:'armor', slot, rarity, name: name || `${rarity.name} ${displayName}`, desc:`${rarity.name} ${slot}`, buffs };
}

function roleArmorSet(role, rarity){
  const m = rarityMult(rarity);
  if(role==='mage'){
    return {
      helm: makeArmorItem('helm', rarity, { maxMana: Math.round(10*m), manaRegen: +(0.6*m).toFixed(2) }),
      shoulders: makeArmorItem('shoulders', rarity, { maxMana: Math.round(8*m), cdr: +(0.02*m).toFixed(2) }),
      chest: makeArmorItem('chest', rarity, { maxHp: Math.round(14*m), def: Math.round(3*m) }),
      hands: makeArmorItem('hands', rarity, { atk: Math.round(3*m), manaRegen: +(0.4*m).toFixed(2) }),
      belt: makeArmorItem('belt', rarity, { maxMana: Math.round(6*m) }),
      legs: makeArmorItem('legs', rarity, { maxHp: Math.round(10*m), def: Math.round(2*m) }),
      feet: makeArmorItem('feet', rarity, { speed: Math.round(6*m), def: Math.round(1*m) }),
      neck: makeArmorItem('neck', rarity, { maxMana: Math.round(10*m) }),
      accessory1: makeArmorItem('accessory1', rarity, { maxMana: Math.round(8*m) }),
      accessory2: makeArmorItem('accessory2', rarity, { manaRegen: +(0.5*m).toFixed(2) }),
    };
  }
  if(role==='tank'){
    return {
      helm: makeArmorItem('helm', rarity, { maxHp: Math.round(18*m), def: Math.round(4*m) }),
      shoulders: makeArmorItem('shoulders', rarity, { maxHp: Math.round(14*m), def: Math.round(3*m) }),
      chest: makeArmorItem('chest', rarity, { maxHp: Math.round(26*m), def: Math.round(6*m) }),
      hands: makeArmorItem('hands', rarity, { def: Math.round(3*m) }),
      belt: makeArmorItem('belt', rarity, { maxHp: Math.round(12*m), def: Math.round(2*m) }),
      legs: makeArmorItem('legs', rarity, { maxHp: Math.round(18*m), def: Math.round(3*m) }),
      feet: makeArmorItem('feet', rarity, { def: Math.round(2*m) }),
      neck: makeArmorItem('neck', rarity, { maxHp: Math.round(12*m) }),
      accessory1: makeArmorItem('accessory1', rarity, { def: Math.round(3*m) }),
      accessory2: makeArmorItem('accessory2', rarity, { shieldCap: Math.round(40*m) }),
    };
  }
  // warrior/knight => dps/brace
  return {
    helm: makeArmorItem('helm', rarity, { maxHp: Math.round(10*m), critChance: +(0.03*m).toFixed(2) }),
    shoulders: makeArmorItem('shoulders', rarity, { atk: Math.round(3*m) }),
    chest: makeArmorItem('chest', rarity, { maxHp: Math.round(16*m), def: Math.round(3*m) }),
    hands: makeArmorItem('hands', rarity, { atk: Math.round(4*m) }),
    belt: makeArmorItem('belt', rarity, { maxHp: Math.round(8*m) }),
    legs: makeArmorItem('legs', rarity, { maxHp: Math.round(12*m), def: Math.round(2*m) }),
    feet: makeArmorItem('feet', rarity, { speed: Math.round(6*m) }),
    neck: makeArmorItem('neck', rarity, { maxHp: Math.round(8*m), maxMana: Math.round(6*m) }),
    accessory1: makeArmorItem('accessory1', rarity, { critChance: +(0.02*m).toFixed(2), critMult: +(0.05*m).toFixed(2) }),
    accessory2: makeArmorItem('accessory2', rarity, { atk: Math.round(3*m) }),
  };
}

function assignNpcEquipment(unit, role){
  const rarity = unit.level>=13 ? LEGENDARY_RARITY : unit.level>=10 ? EPIC_RARITY : unit.level>=7 ? RARE_RARITY : unit.level>=4 ? UNCOMMON_RARITY : COMMON_RARITY;
  unit.equipment = unit.equipment || {};
  // weapon from class loadout - use the weapon already assigned if available, otherwise get from loadout
  if(!unit.equipment.weapon){
    const loadout = CLASS_LOADOUTS[role] || CLASS_LOADOUTS.warrior;
    if(loadout.weapons && Array.isArray(loadout.weapons)){
      const weaponChoice = loadout.weapons[randi(0, loadout.weapons.length - 1)];
      unit.equipment.weapon = structuredClone(weaponChoice);
    } else if(loadout.weapon){
      unit.equipment.weapon = structuredClone(loadout.weapon);
    }
  }
  // fill armor
  const set = roleArmorSet(role, rarity);
  for(const [slot,item] of Object.entries(set)) unit.equipment[slot] = item;
  unit._rarityTier = rarity.tier;
}

const CLASS_LOADOUTS = META_LOADOUTS; // Use the comprehensive loadouts from loadouts.js

const ABILITY_META = {
  // Light attacks (filler - low cost, spammable)
  light_attack: { range: 60, cost:0, cd:0.4, dmg:5, type:'melee', arc:0.9, filler:true },
  staff_light: { range: 280, cost:2, cd:0.65, dmg:4, type:'projectile', speed:420, pierce:0, filler:true },
  
  // Regular abilities
  arc_bolt: { range: 280, cost:10, cd:3.5, dmg:12, type:'projectile', speed:420, pierce:0, element:'shock', role:{mage:1.0,dps:0.6} },
  piercing_lance: { range: 320, cost:16, cd:6.0, dmg:16, type:'projectile', speed:540, pierce:2, element:'arcane', role:{mage:1.0,dps:0.8} },
  chain_light: { range: 260, cost:18, cd:5.5, dmg:10, type:'projectile', speed:420, pierce:1, element:'shock', role:{mage:0.9,dps:0.7} },
  // Tactical AoE kit (used heavily by guards)
  // kind:'aoe' makes these cast via npcCastSupportAbility() without being treated as ally-targeted support.
  gravity_well: { range: 170, cost:30, cd:14.0, type:'projectile', kind:'aoe', role:{mage:1.0,dps:0.9} },
  meteor_slam: { range: 240, cost:28, cd:10.0, type:'projectile', kind:'aoe', role:{mage:1.0,dps:0.9} },
  shoulder_charge: { range: 135, cost:10, cd:7.0, type:'melee', kind:'aoe', role:{tank:0.7,dps:1.0} },
  slash: { range: 70, cost:4, cd:1.0, dmg:7, type:'melee', arc:1.1 },
  cleave: { range: 90, cost:10, cd:3.2, dmg:14, type:'melee', arc:1.5 },
  heal_burst: { range: 160, cost:18, cd:7.5, type:'support', kind:'heal', role:{mage:1.0,tank:0.7,dps:0.6} },
  ward_barrier: { range: 160, cost:22, cd:10.0, type:'support', kind:'shield', role:{mage:1.0,tank:1.0,dps:0.6} },
  cleanse_wave: { range: 140, cost:14, cd:9.0, type:'support', kind:'heal', role:{mage:0.9,tank:0.8,dps:0.6} },
  renewal_field: { range: 180, cost:20, cd:12.0, type:'support', kind:'heal', role:{mage:1.0,tank:0.7,dps:0.6} },
  beacon_of_light: { range: 200, cost:24, cd:11.0, type:'support', kind:'heal', role:{mage:1.0,tank:0.7,dps:0.6} },
  warcry: { range: 120, cost:12, cd:8.0, type:'support', kind:'shield', role:{mage:0.7,tank:1.0,dps:0.8} },
  mage_divine_touch: { range: 220, cost:16, cd:4.5, type:'support', kind:'heal', role:{mage:1.2,tank:0.8,dps:0.6} },
  mage_sacred_ground: { range: 200, cost:22, cd:12.0, type:'projectile', dmg:18, element:'fire', role:{mage:1.0,dps:0.8} },
  mage_radiant_aura: { range: 170, cost:18, cd:8.0, type:'support', kind:'shield', role:{mage:1.0,tank:0.8,dps:0.6} },
  mage_arcane_missiles: { range: 240, cost:14, cd:5.5, dmg:12, type:'projectile', speed:420, pierce:0, element:'arcane', role:{mage:1.0,dps:0.7} },
  knight_shield_wall: { range: 170, cost:16, cd:9.0, type:'support', kind:'shield', role:{mage:0.7,tank:1.2,dps:0.8} },
  knight_rally: { range: 170, cost:12, cd:10.0, type:'support', kind:'heal', role:{mage:0.8,tank:1.1,dps:0.8} },
  knight_taunt: { range: 140, cost:10, cd:8.0, type:'support', kind:'shield', role:{mage:0.6,tank:1.2,dps:0.8} },
  warrior_fortitude: { range: 150, cost:15, cd:8.0, type:'support', kind:'shield', role:{mage:0.6,tank:1.0,dps:1.0} },
  tank_iron_skin: { range: 120, cost:14, cd:10.0, type:'support', kind:'shield', role:{mage:0.5,tank:1.2,dps:0.6} },
  tank_bodyguard: { range: 180, cost:16, cd:11.0, type:'support', kind:'shield', role:{mage:0.7,tank:1.2,dps:0.7} },
  tank_anchor: { range: 150, cost:10, cd:9.0, type:'support', kind:'shield', role:{mage:0.6,tank:1.2,dps:0.7} },
  tank_seismic_wave: { range: 260, cost:13, cd:7.5, dmg:18, type:'projectile', speed:400, pierce:0, element:'shock', role:{mage:0.7,tank:1.0,dps:0.9} },
  knight_justice_strike: { range: 95, cost:8, cd:3.0, dmg:18, type:'melee', arc:1.0, role:{mage:0.5,tank:1.0,dps:1.0} },
  warrior_cleave: { range: 96, cost:9, cd:4.2, dmg:20, type:'melee', arc:1.5, role:{mage:0.6,tank:0.9,dps:1.1} },
  warrior_life_leech: { range: 82, cost:8, cd:4.0, dmg:16, type:'melee', arc:1.1, role:{mage:0.6,tank:0.9,dps:1.1} }
};

function npcHealPulse(state, cx, cy, radius, amount, caster=null, sourceAbilityId=null){
  const st = currentStats(state);
  const isEnemyCaster = caster && state.enemies.includes(caster);
  
  const healOne = (ent, mult=1)=>{
    if(!ent) return;
    const maxHp = ent===state.player ? st.maxHp : ent.maxHp || st.maxHp;
    const healAmt = amount * mult;
    const oldHP = ent.hp || 0;
    ent.hp = clamp((ent.hp||0) + healAmt, 0, maxHp);
    const gained = Math.max(0, (ent.hp || 0) - oldHP);
    
    // Audit: log applied heal per target
    if(gained > 0 && sourceAbilityId){
      logEffectApplied(state, {
        sourceAbilityId,
        effectId: sourceAbilityId + '_heal',
        targetId: ent.id || ent._id || null,
        effectType: 'heal',
        amount: gained
      });
    }
    
    // Log player healing from NPC abilities
    if(ent === state.player){
      const casterName = caster ? (caster.name || caster.variant || 'Unknown') : 'Unknown';
      if(gained > 0){
        notePlayerHpGain(state, gained, 'ally_ability', {
          sourceAbilityId: sourceAbilityId || null,
          caster: casterName
        });
      }
      logPlayerEvent(state, 'HEAL', {
        source: 'ally_ability',
        caster: casterName,
        ability: sourceAbilityId || undefined,
        amount: healAmt.toFixed(1),
        oldHP: oldHP.toFixed(1),
        newHP: ent.hp.toFixed(1),
        maxHP: maxHp
      });
    }
    
    // Track healing done
    if(caster && caster._healingDone !== undefined){
      caster._healingDone = (caster._healingDone || 0) + healAmt;
    }
  };
  
  if(isEnemyCaster){
    // Enemy caster - heal other enemies
    for(const e of state.enemies){
      if(e.dead || e.hp <= 0) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if(d <= radius) healOne(e, e === caster ? 1 : 0.9);
    }
  } else {
    // Friendly caster - heal player and friendlies within radius
    const playerDist = Math.hypot(state.player.x - cx, state.player.y - cy);
    if(playerDist <= radius){
      healOne(state.player, 1);
    }
    for(const f of state.friendlies){ if(f.respawnT>0) continue; const d=Math.hypot(f.x-cx,f.y-cy); if(d<=radius) healOne(f, 0.9); }
  }
  
  // Visual flash for heal cast
  state.effects.flashes.push({ x: cx, y: cy, r: radius, life: 0.5, color: '#ffd760' });
}

function npcShieldPulse(state, caster, cx, cy, radius, amount, selfBoost=1){
  // Visual flash for shield cast
  const isEnemyCaster = caster && state.enemies.includes(caster);
  const flashColor = isEnemyCaster ? '#6ec0ff' : '#ffb347';
  state.effects.flashes.push({ x: cx, y: cy, r: radius, life: 0.5, color: flashColor });
  
  const casterName = caster.name || caster.variant || 'Unknown';
  const sourceAbilityId = arguments[7] || null;
  const applyShield = (ent, mult=1)=>{
    if(!ent) return;
    // Shield cap is player's max HP (or 320 for NPCs)
    const cap = ent.shieldCap || ent.maxShield || (ent===state.player ? currentStats(state).maxHp : 320);
    const shieldGain = amount * mult;
    const before = ent.shield || 0;
    ent.shield = clamp((ent.shield||0) + shieldGain, 0, cap);
    const after = ent.shield;
    const gained = Math.max(0, after - before);
    
    // Audit: log applied shield per target
    if(gained > 0 && sourceAbilityId){
      logEffectApplied(state, {
        sourceAbilityId,
        effectId: sourceAbilityId + '_shield',
        targetId: ent.id || ent._id || null,
        effectType: 'shield',
        amount: gained
      });
    }
    // Track shield source
    if(ent === state.player){
      const distance = Math.round(Math.hypot(caster.x - state.player.x, caster.y - state.player.y));
      ent._lastShieldSource = casterName + ' (ability)';
      console.log('%c[SHIELD GAIN] +' + shieldGain.toFixed(1) + ' from ' + casterName + ' at ' + distance + ' pixels', 'color: #6cf; font-weight: bold;');
      logPlayerEvent(state, 'SHIELD_GAINED', {
        amount: shieldGain,
        before,
        after,
        source: `ally:${casterName}`,
        distance,
        radius
      });
      logDebug(state, 'SHIELD', 'Shield from ally ability', { 
        caster: casterName, 
        amount: shieldGain, 
        before, 
        after,
        distance,
        radius
      });
    }
    // Track healing/shield provided by caster
    if(caster._shieldProvided !== undefined){
      caster._shieldProvided = (caster._shieldProvided || 0) + shieldGain;
    }
  };
  
  if(isEnemyCaster){
    // Enemy caster - shield other enemies
    for(const e of state.enemies){
      if(e.dead || e.hp <= 0) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if(d <= radius) applyShield(e, e === caster ? selfBoost : 0.6);
    }
  } else {
    // Friendly caster - shield player and friendlies within radius
    applyShield(caster, selfBoost);
    const playerDist = Math.hypot(state.player.x - cx, state.player.y - cy);
    if(playerDist <= radius){
      applyShield(state.player, 1);
    }
    for(const f of state.friendlies){ if(f.respawnT>0) continue; const d=Math.hypot(f.x-cx,f.y-cy); if(d<=radius) applyShield(f, 0.6); }
  }
}

function npcDirectHeal(state, target, amount, caster=null, sourceAbilityId=null){
  if(!target) return;
  const st = currentStats(state);
  const maxHp = target===state.player ? st.maxHp : target.maxHp || st.maxHp;
  const before = Number(target.hp || 0);
  target.hp = clamp((target.hp||0) + amount, 0, maxHp);
  const gained = Math.max(0, Number(target.hp || 0) - before);
  
  // Audit: log direct heal application
  if(gained > 0 && sourceAbilityId){
    logEffectApplied(state, {
      sourceAbilityId,
      effectId: sourceAbilityId + '_heal',
      targetId: target.id || target._id || null,
      effectType: 'heal',
      amount: gained
    });
  }
  
  if(target === state.player && gained > 0){
    const casterName = caster ? (caster.name || caster.variant || 'Unknown') : 'Unknown';
    notePlayerHpGain(state, gained, 'direct_heal', {
      sourceAbilityId: sourceAbilityId || null,
      caster: casterName
    });
  }
}

function npcAreaDamage(state, caster, cx, cy, radius, dmg, opts={}){
  const isEnemyCaster = state.enemies.includes(caster);
  const targets = isEnemyCaster
    ? [state.player, ...(state.friendlies||[]).filter(f=>f && f.respawnT<=0)]
    : (state.enemies||[]);
  const sourceAbilityId = opts.sourceAbilityId || null;

  for(let i=targets.length-1; i>=0; i--){
    const t = targets[i];
    if(!t || t.dead || t.hp === undefined || t.hp <= 0) continue;
    const d = Math.hypot((t.x||0)-cx, (t.y||0)-cy);
    if(d > radius) continue;

    if(isEnemyCaster){
      // Damage player/friendlies directly
      const maxHp = (t===state.player) ? currentStats(state).maxHp : (t.maxHp || currentStats(state).maxHp);
      t.hp = clamp((t.hp||0) - dmg, 0, maxHp);
    } else {
      // Damage enemies and allow kill handling
      t.hp -= dmg;
      if(t.hp <= 0){
        const enemyIndex = (state.enemies||[]).indexOf(t);
        if(enemyIndex >= 0) killEnemy(state, enemyIndex, true);
      }
    }
    
    // Audit: log applied damage per target
    if(sourceAbilityId){
      logEffectApplied(state, {
        sourceAbilityId,
        effectId: sourceAbilityId + '_damage',
        targetId: t.id || t._id || null,
        effectType: 'damage',
        amount: dmg
      });
    }
  }
}

function npcCastSupportAbility(state, u, id, target){
  const isEnemyCaster = state.enemies.includes(u);
  const kind = isEnemyCaster ? 'enemy' : 'friendly';

  // Step 2 (Guard Ball): If this is a guard AoE cast, prefer the ball focus position
  // so the squad lands AoE at the same spot. Only use focusPos when it matches
  // the current targetId to avoid unintentionally re-targeting.
  const targetId = target ? (target.id ?? target._id ?? null) : null;
  const ballId = (u && u.guardFlagId) ? `${kind}:${u.guardFlagId}` : null;
  const ball = ballId ? (state.guardBalls?.[ballId] || null) : null;
  const focusPos = (ball && ball.focusPos && Number.isFinite(ball.focusPos.x) && Number.isFinite(ball.focusPos.y)
    && (!targetId || String(ball.focusTargetId) === String(targetId)))
    ? ball.focusPos
    : null;
  
  switch(id){
    case 'meteor_slam':{
      const x = focusPos ? focusPos.x : (target ? (target.x||u.x) : u.x);
      const y = focusPos ? focusPos.y : (target ? (target.y||u.y) : u.y);
      const radius = 115;
      const dmg = 24 + (u.atk||10)*1.15;

      if(focusPos && state.debugLog){
        logDebug(state, 'GUARD_BALL', 'AoE cast targeted at ball focus position', {
          type:'GUARD_BALL_AOE_TARGET',
          ballId,
          ability: id,
          casterId: getStableUnitLogId(state, u, kind),
          focusTargetId: ball?.focusTargetId ?? null,
          x,
          y
        });
      }

      npcAreaDamage(state, u, x, y, radius, dmg, {sourceAbilityId: 'meteor_slam'});
      if(state.effects && state.effects.flashes) state.effects.flashes.push({ x, y, r: radius, life: 0.9, color: '#ff9a3c' });
      if(state.effects && state.effects.slashes) state.effects.slashes.push({ x, y, range: radius, arc: Math.PI*2, dir: 0, t: 0.12, color: '#ff4500' });

      logEffect(state, 'aoe_damage', 'meteor_slam', u, kind, 'aoe');
      if(typeof playPositionalSound === 'function') playPositionalSound(state, 'meteorSlam', x, y, 700, 0.5);
      return true;
    }
    case 'gravity_well':{
      const x = focusPos ? focusPos.x : (target ? (target.x||u.x) : u.x);
      const y = focusPos ? focusPos.y : (target ? (target.y||u.y) : u.y);
      const r = 150;

      if(focusPos && state.debugLog){
        logDebug(state, 'GUARD_BALL', 'AoE cast targeted at ball focus position', {
          type:'GUARD_BALL_AOE_TARGET',
          ballId,
          ability: id,
          casterId: getStableUnitLogId(state, u, kind),
          focusTargetId: ball?.focusTargetId ?? null,
          x,
          y
        });
      }

      state.effects.wells.push({
        x,
        y,
        r,
        timeLeft: 3.6,
        tick: 0.5,
        tickLeft: 0.5,
        dmgPerTick: 6 + (u.atk||10)*0.35,
        pull: 98,
        color: (kind === 'enemy') ? '#c07070' : '#9b7bff',
        team: kind,
        sourceAbilityId: id,
        sourceKind: kind,
        sourceType: 'npc_ability',
        sourceCasterId: getStableUnitLogId(state, u, kind),
        sourceCasterName: u.name || u.variant || kind
      });
      if(state.effects && state.effects.flashes) state.effects.flashes.push({ x, y, r, life: 0.6, color: (kind === 'enemy') ? '#c07070' : '#9b7bff' });
      logEffect(state, 'aoe_dot', 'gravity_well', u, kind, 'aoe');
      if(typeof playPositionalSound === 'function') playPositionalSound(state, 'magicalRockSpellAlt', x, y, 650, 0.45);
      return true;
    }
    case 'heal_burst':{
      const amt = 22 + (u.maxHp||90)*0.12;
      npcHealPulse(state, u.x, u.y, 150, amt, u, 'heal_burst');
      logEffect(state, 'heal', 'heal_burst', u, kind, 'aoe');
      return true;
    }
    case 'ward_barrier':{
      const shield = 32 + (u.def||8)*1.0;
      npcShieldPulse(state, u, u.x, u.y, 90, shield, 1, 'ward_barrier');
      logEffect(state, 'shield', 'ward_barrier', u, kind, 'aoe');
      return true;
    }
    case 'cleanse_wave':{
      const heal = 14 + (u.maxHp||90)*0.06;
      const shield = 20 + (u.def||6)*0.9;
      npcHealPulse(state, u.x, u.y, 150, heal, u, 'cleanse_wave');
      npcShieldPulse(state, u, u.x, u.y, 80, shield, 1, 'cleanse_wave');
      logEffect(state, 'heal+shield', 'cleanse_wave', u, kind, 'aoe');
      return true;
    }
    case 'renewal_field':{
      const amt = 4 + (u.maxHp||90)*0.01;
      const isEnemyCaster = state.enemies.includes(u);
      const targets = isEnemyCaster ? state.enemies.filter(e=>!e.dead && e.hp>0) : [state.player, ...state.friendlies.filter(f=>f.respawnT<=0)];
      console.log('[HOT CREATE] renewal_field', 'amt:', amt, 'duration: 5s', 'targets:', targets.length, 'isEnemy:', isEnemyCaster);
      // Add to combat log if player is affected
      if(state.combatLog && targets.includes(state.player)){
        state.combatLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'HOT_CREATE',
          ability: 'renewal_field',
          caster: u.name || u.variant || (isEnemyCaster ? 'Enemy' : 'Ally'),
          targets: targets.length,
          healPerTick: amt.toFixed(2),
          duration: 5.0,
          isEnemyCaster
        });
      }
      state.effects.heals.push({
        t:5.0,
        tick:0.8,
        tl:0.8,
        amt,
        beacon:{x:u.x,y:u.y,r:150},
        targets,
        sourceAbilityId: 'renewal_field',
        sourceType: 'npc_ability',
        sourceCaster: u.name || u.variant || (isEnemyCaster ? 'Enemy' : 'Ally')
      });
      logEffect(state, 'hot', 'renewal_field', u, kind, targets.length);
      return true;
    }
    case 'beacon_of_light':{
      const amt = 6 + (u.maxHp||90)*0.012;
      const isEnemyCaster = state.enemies.includes(u);
      const targets = isEnemyCaster ? state.enemies.filter(e=>!e.dead && e.hp>0) : [state.player, ...state.friendlies.filter(f=>f.respawnT<=0)];
      console.log('[HOT CREATE] beacon_of_light', 'amt:', amt, 'duration: 6s', 'targets:', targets.length, 'isEnemy:', isEnemyCaster);
      // Add to combat log if player is affected
      if(state.combatLog && targets.includes(state.player)){
        state.combatLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'HOT_CREATE',
          ability: 'beacon_of_light',
          caster: u.name || u.variant || (isEnemyCaster ? 'Enemy' : 'Ally'),
          targets: targets.length,
          healPerTick: amt.toFixed(2),
          duration: 6.0,
          isEnemyCaster
        });
      }
      state.effects.heals.push({
        t:6.0,
        tick:1.0,
        tl:1.0,
        amt,
        beacon:{x:u.x,y:u.y,r:170},
        targets,
        sourceAbilityId: 'beacon_of_light',
        sourceType: 'npc_ability',
        sourceCaster: u.name || u.variant || (isEnemyCaster ? 'Enemy' : 'Ally')
      });
      logEffect(state, 'hot', 'beacon_of_light', u, kind, targets.length);
      return true;
    }
    case 'mage_divine_touch':{
      const tgt = target || state.player;
      npcDirectHeal(state, tgt, 26 + (u.maxHp||90)*0.18, u, 'mage_divine_touch');
      logEffect(state, 'heal', 'mage_divine_touch', u, kind, 1);
      return true;
    }
    case 'mage_radiant_aura':{
      const shield = 26 + (u.def||10)*1.0;
      npcShieldPulse(state, u, u.x, u.y, 90, shield, 1, 'mage_radiant_aura');
      logEffect(state, 'shield', 'mage_radiant_aura', u, kind, 'aoe');
      return true;
    }
    case 'warcry':{
      const shield = 18 + (u.def||6)*0.8;
      npcShieldPulse(state, u, u.x, u.y, 80, shield, 1, 'warcry');
      logEffect(state, 'shield', 'warcry', u, kind, 'aoe');
      return true;
    }
    case 'knight_shield_wall':{
      const shield = 34 + (u.def||9)*1.1;
      npcShieldPulse(state, u, u.x, u.y, 100, shield, 1, 'knight_shield_wall');
      npcHealPulse(state, u.x, u.y, 180, 10 + (u.maxHp||90)*0.04, u, 'knight_shield_wall');
      logEffect(state, 'shield+heal', 'knight_shield_wall', u, kind, 'aoe');
      return true;
    }
    case 'knight_rally':{
      npcHealPulse(state, u.x, u.y, 180, 12 + (u.maxHp||90)*0.03, u, 'knight_rally');
      npcShieldPulse(state, u, u.x, u.y, 100, 18 + (u.def||8)*0.8, 1, 'knight_rally');
      logEffect(state, 'heal+shield', 'knight_rally', u, kind, 'aoe');
      return true;
    }
    case 'knight_taunt':{
      npcShieldPulse(state, u, u.x, u.y, 80, 16 + (u.def||8)*0.7, 1, 'knight_taunt');
      logEffect(state, 'shield', 'knight_taunt', u, kind, 'aoe');
      return true;
    }
    case 'warrior_fortitude':{
      npcShieldPulse(state, u, u.x, u.y, 90, 22 + (u.def||8)*0.9, 1, 'warrior_fortitude');
      logEffect(state, 'shield', 'warrior_fortitude', u, kind, 'aoe');
      return true;
    }
    case 'tank_iron_skin':{
      const cap = u.shieldCap || u.maxShield || 320;
      const before = u.shield || 0;
      const shieldGain = 50 + (u.def||10)*1.2;
      u.shield = clamp(before + shieldGain, 0, cap);
      const gained = Math.max(0, u.shield - before);
      if(gained > 0){
        logEffectApplied(state, {
          sourceAbilityId: 'tank_iron_skin',
          effectId: 'tank_iron_skin_shield',
          targetId: u.id || u._id || null,
          effectType: 'shield',
          amount: gained
        });
      }
      logEffect(state, 'shield', 'tank_iron_skin', u, kind, 1);
      return true;
    }
    case 'tank_bodyguard':{
      npcShieldPulse(state, u, u.x, u.y, 100, 24 + (u.def||10)*1.0, 1, 'tank_bodyguard');
      logEffect(state, 'shield', 'tank_bodyguard', u, kind, 'aoe');
      return true;
    }
    case 'tank_anchor':{
      npcShieldPulse(state, u, u.x, u.y, 90, 20 + (u.def||9)*0.9, 1, 'tank_anchor');
      logEffect(state, 'shield', 'tank_anchor', u, kind, 'aoe');
      return true;
    }
    case 'shoulder_charge':{
      // Dash toward target or forward, deal AoE on arrival
      let tx = focusPos ? focusPos.x : (target ? target.x : u.x + Math.cos(u.dir||0)*90);
      let ty = focusPos ? focusPos.y : (target ? target.y : u.y + Math.sin(u.dir||0)*90);

      if(focusPos && state.debugLog){
        logDebug(state, 'GUARD_BALL', 'AoE cast targeted at ball focus position', {
          type:'GUARD_BALL_AOE_TARGET',
          ballId,
          ability: id,
          casterId: getStableUnitLogId(state, u, kind),
          focusTargetId: ball?.focusTargetId ?? null,
          x: tx,
          y: ty
        });
      }

      const dx = tx - u.x;
      const dy = ty - u.y;
      const dist = Math.hypot(dx, dy);
      const maxDist = 120;
      const actualDist = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);
      u.x = clamp(u.x + Math.cos(angle) * actualDist, 0, state.mapWidth || state.engine.canvas.width);
      u.y = clamp(u.y + Math.sin(angle) * actualDist, 0, state.mapHeight || state.engine.canvas.height);
      // AoE damage and stun at new position
      npcAreaDamage(state, u, u.x, u.y, 90, 14 + (u.atk||10)*1.1, {sourceAbilityId: 'shoulder_charge'});
      if(state.effects && state.effects.flashes) {
        state.effects.flashes.push({ x: u.x, y: u.y, r: 90, life: 0.7, color: '#9b7bff' });
      }
      logEffect(state, 'aoe_charge', 'shoulder_charge', u, kind, 'aoe');
      return true;
    }
    default:
      return false;
  }
}

export function npcInitAbilities(u){
  const opts = arguments.length > 1 && arguments[1] ? arguments[1] : undefined;
  const source = opts?.source || 'npcInitAbilities';
  const state = opts?.state;
  const force = !!opts?.force;

  // If this unit's kit is locked, don't allow re-inits to wipe it unless explicitly forced.
  if(u?.npcLoadoutLocked && !force){
    if(state?.debugLog) state.debugLog.push({
      category: 'LOADOUT',
      message: 'NPC loadout locked (skip reinit)',
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'NPC_LOADOUT_LOCKED',
      source,
      unit: u.name || u.id || u._id || u.variant || 'npc',
      variant: u.variant,
      guard: !!u.guard,
      loadoutId: u.npcLoadoutId || null,
      abilities: Array.isArray(u.npcAbilities) ? u.npcAbilities.slice() : null
    });
    return;
  }

  // Guards get a deterministic loadout that is safe to re-run.
  if(u?.guard){
    npcInitGuardAbilities(u, { state, source, force });
    return;
  }

  const variant = u.variant || 'warrior';
  const loadout = CLASS_LOADOUTS[variant] || CLASS_LOADOUTS.warrior;
  
  // Ensure equipment object exists
  u.equipment = u.equipment || {};
  
  // Handle weapon selection
  if(loadout.weapons && Array.isArray(loadout.weapons)){
    // Multiple weapons available - pick one randomly
    const weaponChoice = loadout.weapons[randi(0, loadout.weapons.length - 1)];
    u.equipment.weapon = structuredClone(weaponChoice);
    u.weaponType = weaponChoice.weaponType;
  } else if(loadout.weapon){
    // Single weapon defined
    u.equipment.weapon = structuredClone(loadout.weapon);
    u.weaponType = loadout.weapon.weaponType;
  } else {
    // Fallback: ensure EVERY unit gets a default weapon
    const COMMON_RARITY = { key:'common', tier: 1, name: 'Common', color: '#c8c8c8' };
    u.equipment.weapon = { kind:'weapon', slot:'weapon', weaponType:'Sword', rarity:COMMON_RARITY, name:'Common Sword', buffs:{atk:5} };
    u.weaponType = 'Sword';
  }
  
  // Handle ability selection based on weapon type (for warrior/DPS with dual loadouts)
  let abilities = loadout.abilities;
  if(variant === 'warrior' && loadout.abilitiesMagic && loadout.abilitiesMelee){
    // Warrior: choose abilities based on weapon type
    const isDestructionStaff = u.weaponType === 'Destruction Staff';
    abilities = isDestructionStaff ? loadout.abilitiesMagic : loadout.abilitiesMelee;
  }
  
  // Ensure armor slots are filled
  assignNpcEquipment(u, variant);
  
  // Assign abilities
  u.npcAbilities = abilities ? abilities.slice(0,5) : ['slash','cleave','slash','cleave','slash'];
  // Avoid wiping cooldown arrays during mid-match refreshes; npcUpdateAbilities derives readiness from _cdUntil.
  if(!Array.isArray(u.npcCd) || u.npcCd.length !== 5) u.npcCd = [0,0,0,0,0];
  u.maxMana = u.maxMana || 60;
  u.mana = u.mana || u.maxMana;
  const baseManaRegen = { mage: 7.5, warrior: 5.0, knight: 5.5, tank: 5.0 };
  u.manaRegen = u.manaRegen || baseManaRegen[variant] || 5.5;
  
  // Assign an explicit party role for AI behavior
  if(!u.role){
    u.role = (variant==='mage') ? 'HEALER' : 'DPS';
  }
  
  // Debug log to verify loadouts for all variants
  console.log(`${variant} spawned: weapon=${u.weaponType}, role=${u.role}, abilities=`, u.npcAbilities);

  if(state?.debugLog) state.debugLog.push({
    category: 'LOADOUT',
    message: 'NPC abilities assigned',
    time: (state.campaign?.time || 0).toFixed(2),
    type: 'NPC_ABILITY_ASSIGN',
    source,
    unit: u.name || u.id || u._id || variant,
    variant,
    guard: false,
    abilities: Array.isArray(u.npcAbilities) ? u.npcAbilities.slice() : null
  });

  // Extra: capture spawn-time loadout snapshot (what template + what is actually slotted)
  if(state?.debugLog && isSpawnSource(source)){
    logSpawnLoadoutSnapshot(state, u, source);
  }
}

function isSpawnSource(source){
  if(!source) return false;
  const s = String(source);
  return s.includes('spawn') || s.includes('Spawn');
}

function logSpawnLoadoutSnapshot(state, u, source){
  const isEnemy = !!(state?.enemies && state.enemies.includes(u));
  const isFriendly = !!(state?.friendlies && state.friendlies.includes(u));
  const kind = isEnemy ? 'enemy' : (isFriendly ? 'friendly' : 'unknown');

  // Ensure a stable per-unit id exists immediately at spawn so logs can be correlated.
  if(u && !u._abilityLogId){
    const stable = (u.id ?? u._id);
    if(stable !== undefined && stable !== null && String(stable) !== ''){
      u._abilityLogId = String(stable);
    } else {
      state._abilityLogSeq = (state._abilityLogSeq || 0) + 1;
      u._abilityLogId = `${kind}_npc_${state._abilityLogSeq}`;
    }
  }

  const slots = Array.isArray(u.npcAbilities) ? u.npcAbilities.slice(0, 5) : [];
  while(slots.length < 5) slots.push(null);

  const missingSkills = [];
  const missingMeta = [];
  const emptySlots = [];
  for(let i=0; i<slots.length; i++){
    const id = slots[i];
    if(!id){ emptySlots.push(i+1); continue; }
    if(!getAbilityById(id)) missingSkills.push(id);
    if(!ABILITY_META[id]) missingMeta.push(id);
  }

  state.debugLog.push({
    category: 'LOADOUT',
    message: 'Fighter spawn loadout',
    time: (state.campaign?.time || 0).toFixed(2),
    type: 'FIGHTER_SPAWN_LOADOUT',
    source,
    unit: u.name || u.id || u._id || u.variant || 'npc',
    id: u?._abilityLogId || u.id || u._id || null,
    kind,
    guard: !!u.guard,
    guardRole: u.guardRole || null,
    variant: u.variant || null,
    role: u.role || null,
    weaponType: u.weaponType || (u.equipment?.weapon?.weaponType || null),
    loadoutId: u.npcLoadoutId || null,
    locked: !!u.npcLoadoutLocked,
    slots,
    emptySlots: emptySlots.length ? emptySlots : null,
    missingSkills: missingSkills.length ? missingSkills : null,
    missingMeta: missingMeta.length ? missingMeta : null
  });
}

function npcInitGuardAbilities(u, opts={}){
  const state = opts?.state;
  const source = opts?.source || 'npcInitGuardAbilities';

  // Guard composition is already decided at spawn; keep it stable.
  const variant = u.variant || (String(u.guardRole||'').toUpperCase()==='HEALER' ? 'mage' : 'warrior');
  const isHealer = (variant === 'mage');

  u.equipment = u.equipment || {};

  if(isHealer){
    const loadout = CLASS_LOADOUTS.mage || CLASS_LOADOUTS.HEALER || CLASS_LOADOUTS.warrior;
    u.equipment.weapon = structuredClone(loadout.weapon);
    u.weaponType = loadout.weapon.weaponType;
    assignNpcEquipment(u, 'mage');
    u.npcAbilities = (loadout.abilities || []).slice(0,5);
    if(!Array.isArray(u.npcCd) || u.npcCd.length !== 5) u.npcCd = [0,0,0,0,0];
    if(!u.role) u.role = 'HEALER';
    u.guardRole = u.guardRole || 'HEALER';
    u.npcLoadoutId = u.npcLoadoutId || 'guard_mage_healer';
    u.npcLoadoutLocked = true;
  } else {
    const loadout = CLASS_LOADOUTS.warrior || CLASS_LOADOUTS.DPS || CLASS_LOADOUTS.mage;

    // Prefer a preselected weaponType (guards are often forced to use Destruction Staff).
    const preferred = u.weaponType || 'Destruction Staff';
    let weaponChoice = null;
    if(Array.isArray(loadout.weapons)) weaponChoice = loadout.weapons.find(w=>w.weaponType===preferred) || null;
    if(!weaponChoice && Array.isArray(loadout.weapons) && loadout.weapons.length){
      weaponChoice = loadout.weapons[0];
    }
    if(weaponChoice){
      u.equipment.weapon = structuredClone(weaponChoice);
      u.weaponType = weaponChoice.weaponType;
    }

    // Guard warrior DPS kit: keep it deterministic and purpose-built for guard-ball tactics.
    // Slots:
    // 1) gravity_well
    // 2) meteor_slam
    // 3) shoulder_charge
    // 4) warrior_life_leech
    // 5) warrior_fortitude
    const finalAbilities = ['gravity_well','meteor_slam','shoulder_charge','warrior_life_leech','warrior_fortitude'];
    assignNpcEquipment(u, 'warrior');
    u.npcAbilities = finalAbilities;
    if(!Array.isArray(u.npcCd) || u.npcCd.length !== 5) u.npcCd = [0,0,0,0,0];
    if(!u.role) u.role = 'DPS';
    u.guardRole = u.guardRole || 'DPS';
    u.npcLoadoutId = u.npcLoadoutId || 'guard_warrior_dps';
    u.npcLoadoutLocked = true;
  }

  if(state?.debugLog) state.debugLog.push({
    category: 'LOADOUT',
    message: 'NPC abilities assigned',
    time: (state.campaign?.time || 0).toFixed(2),
    type: 'NPC_ABILITY_ASSIGN',
    source,
    unit: u.name || u.id || u._id || variant,
    variant,
    guard: true,
    loadoutId: u.npcLoadoutId || null,
    abilities: Array.isArray(u.npcAbilities) ? u.npcAbilities.slice() : null
  });

  if(state?.debugLog && isSpawnSource(source)){
    logSpawnLoadoutSnapshot(state, u, source);
  }
}

function getStableUnitLogId(state, u, kind){
  if(!u) return null;
  if(!u._abilityLogId){
    const stable = (u.id ?? u._id);
    if(stable !== undefined && stable !== null && String(stable) !== ''){
      u._abilityLogId = String(stable);
    } else {
      state._abilityLogSeq = (state._abilityLogSeq || 0) + 1;
      u._abilityLogId = `${kind}_npc_${state._abilityLogSeq}`;
    }
  }
  return u._abilityLogId;
}

function getOrCreateGuardBall(state, ballId, now){
  if(!state.guardBalls) state.guardBalls = {};
  let ball = state.guardBalls[ballId];
  if(!ball){
    ball = {
      ballId,
      createdAt: now,
      focusTargetId: null,
      focusPos: null,
      focusUntil: 0,
      lastFocusPosAt: 0,
      burstUntil: 0,
      resetUntil: 0,
      lastBurstAt: 0,
      // Step 4: weave gate (shared throttling for non-burst tactical casts)
      weaveUntil: 0,
      lastWeaveAt: 0,
      lastWeaveAbilityId: null,
      lastWeaveCasterId: null,
      lastWeaveTargetId: null,

      // Step 5: healer H1/H2 coordination gates (shared per guard-ball)
      healerHealUntil: 0,
      healerShieldUntil: 0,
      healerCleanseUntil: 0,
      leaderId: null,
      focusScore: null
    };
    state.guardBalls[ballId] = ball;
    if(state.debugLog) logDebug(state, 'GUARD_BALL', 'Guard ball created', { type:'GUARD_BALL_INIT', ballId });
  }
  return ball;
}

function electGuardBallLeader(state, ball, kind, guards, now){
  if(!Array.isArray(guards) || guards.length === 0) return null;
  const dps = guards.filter(g => String(g.guardRole || g.role || 'DPS').toUpperCase() !== 'HEALER');
  const pool = dps.length ? dps : guards;

  let best = null;
  let bestKey = null;
  for(const g of pool){
    const key = getStableUnitLogId(state, g, kind);
    if(key === null || key === undefined) continue;
    if(best === null || String(key) < String(bestKey)){
      best = g;
      bestKey = key;
    }
  }
  const leaderId = bestKey ? String(bestKey) : null;
  if(leaderId && ball.leaderId !== leaderId){
    ball.leaderId = leaderId;
    if(state.debugLog) logDebug(state, 'GUARD_BALL', 'Guard ball leader elected', { type:'GUARD_BALL_LEADER', ballId: ball.ballId, leaderId });
  }
  return leaderId;
}

function scoreGuardBallTarget(state, kind, guardSite, spawnX, spawnY, candidate, geo){
  if(!candidate) return -Infinity;
  const now = state.campaign?.time || 0;
  const FLAG_RADIUS = geo?.FLAG_RADIUS ?? 50;
  const DEFENSE_ENTER = geo?.DEFENSE_ENTER ?? (FLAG_RADIUS + 100);
  const LEASH_HARD_STOP = geo?.LEASH_HARD_STOP ?? 350;

  const distFromSpawn = Math.hypot((candidate.x||0) - (spawnX||0), (candidate.y||0) - (spawnY||0));
  if(distFromSpawn > LEASH_HARD_STOP) return -Infinity;

  const distFromFlag = guardSite ? Math.hypot((candidate.x||0) - guardSite.x, (candidate.y||0) - guardSite.y) : Infinity;
  const distToCenter = Math.hypot((candidate.x||0) - (spawnX||0), (candidate.y||0) - (spawnY||0));

  let score = 0;
  if(distFromFlag <= FLAG_RADIUS) score += 100;
  else if(distFromFlag <= DEFENSE_ENTER) score += 80;

  // Low HP bonus (0..40)
  if(candidate.hp !== undefined && candidate.maxHp){
    const frac = Math.max(0, Math.min(1, 1 - (candidate.hp / candidate.maxHp)));
    score += frac * 40;
  }

  // Healer bonus
  const role = String(candidate.role || '').toUpperCase();
  const variant = String(candidate.variant || '').toLowerCase();
  if(role === 'HEALER' || variant === 'mage') score += 25;

  // Closer is better (0..20)
  score += Math.max(0, 20 - (distToCenter / 12));

  // Near leash edge penalty
  if(distFromSpawn >= LEASH_HARD_STOP * 0.9) score -= 50;

  // Bonus for actively attacking guards (if tracking exists)
  if(candidate.attacked && candidate._hostTarget?.guard && (candidate._hostTarget?.homeSiteId || candidate._hostTarget?.guardFlagId) === (guardSite?.id || null)){
    score += 50;
  }

  // Soft penalty if we haven't seen them recently (if system tracks it)
  if(candidate._lastSeenAt !== undefined){
    const unseen = now - candidate._lastSeenAt;
    if(unseen > 1.0) score -= 30;
  }

  return score;
}

function npcUpdateAbilities(state, u, dt, kind){
  if(u.respawnT>0) return;
  if(!u.npcAbilities || !u.npcCd) return;
  // Authoritative cooldown tracking: absolute ready-times per ability.
  // This prevents cooldown drift from dt anomalies and prevents accidental npcCd resets from breaking gating.
  const now = state.campaign?.time || 0;
  if(!u._cdUntil) u._cdUntil = {};
  for(let i=0; i<u.npcAbilities.length; i++){
    const id = u.npcAbilities[i];
    const until = u._cdUntil[id] || 0;
    u.npcCd[i] = Math.max(0, until - now);
  }
  // Check if AI debug is enabled for this unit's kind
  const debugAI = (kind === 'friendly' && state.options?.showDebugAI) ||
                  (kind === 'enemy' && state.options?.showDebugAIEnemies);
  const recordAI = (action, extra={})=>{
    // Only show abilities in AI debug, not light attacks
    if(debugAI && action !== 'light_attack' && action !== 'filler'){
      state.debugAiEvents = state.debugAiEvents || [];
      state.debugAiEvents.push({ t: state.campaign?.time||0, unit: u.name||u.variant||'npc', id: u.id||u._id, kind, action, ...extra });
      if(state.debugAiEvents.length > 32) state.debugAiEvents.shift();
    }
    
    // Track ability usage for logs (when enabled)
    const shouldTrack = (kind === 'friendly' && state.ui?.trackFriendlyAbilities?.checked) || 
                       (kind === 'enemy' && state.ui?.trackEnemyAbilities?.checked);
    if(shouldTrack && (action === 'cast' || action === 'cast-prio') && extra.ability){
      state.abilityLog = state.abilityLog || {};
      const ability = extra.ability;
      const baseRole = (extra.role || u.role || u.variant || 'unknown');
      const guardRole = String(u.guardRole || '').toUpperCase();
      // Make it explicit in logs when the caster is a guard.
      // This prevents guard casts from being mixed into generic DPS/HEALER buckets.
      const role = u.guard
        ? `GUARD_${guardRole || String(baseRole).toUpperCase()}`
        : baseRole;
      
      if(!state.abilityLog[ability]){
        state.abilityLog[ability] = {
          kind: kind,
          count: 0,
          byRole: {},
          byCaster: {},
          // Historical field: previously this tracked global time between casts across ALL units.
          // Keep it for now but don't rely on it for "cooldown enforcement".
          lastCastTime: 0,
          avgCooldown: 0,
          expectedCd: ABILITY_META[ability]?.cd || 0
        };
      }

      // Track per-caster cooldown intervals (this reflects actual per-unit cooldown enforcement)
      // Ensure each unit has a stable unique id for logging; otherwise per-caster stats can be
      // corrupted by multiple NPCs sharing the same variant/name.
      if(!u._abilityLogId){
        const stable = (u.id ?? u._id);
        if(stable !== undefined && stable !== null && String(stable) !== ''){
          u._abilityLogId = String(stable);
        } else {
          state._abilityLogSeq = (state._abilityLogSeq || 0) + 1;
          u._abilityLogId = `${kind}_npc_${state._abilityLogSeq}`;
        }
      }
      const casterKey = `${kind}:${u._abilityLogId}`;
      const currentTime = state.campaign?.time || 0;
      const casterStats = state.abilityLog[ability].byCaster[casterKey] || {
        count: 0,
        lastCastTime: 0,
        sumIntervals: 0,
        intervalCount: 0,
        minInterval: Infinity
      };

      if(casterStats.lastCastTime > 0){
        const interval = currentTime - casterStats.lastCastTime;
        if(interval > 0){
          casterStats.sumIntervals += interval;
          casterStats.intervalCount += 1;
          casterStats.minInterval = Math.min(casterStats.minInterval, interval);
        }
      }
      casterStats.lastCastTime = currentTime;
      casterStats.count += 1;
      state.abilityLog[ability].byCaster[casterKey] = casterStats;
      
      // Track cooldown between casts
      const timeSinceLastCast = currentTime - state.abilityLog[ability].lastCastTime;
      if(state.abilityLog[ability].lastCastTime > 0 && timeSinceLastCast > 0){
        // Rolling average of actual cooldowns observed
        const count = state.abilityLog[ability].count || 1;
        state.abilityLog[ability].avgCooldown = ((state.abilityLog[ability].avgCooldown * count) + timeSinceLastCast) / (count + 1);
      }
      state.abilityLog[ability].lastCastTime = currentTime;
      
      state.abilityLog[ability].count++;
      state.abilityLog[ability].byRole[role] = (state.abilityLog[ability].byRole[role] || 0) + 1;
    }
  };

  const fromPlayer = (kind === 'friendly');

  // target selection with short lock stickiness
  const hostileCreatures = [];
  if(kind==='friendly'){
    for(const c of state.creatures||[]){
      // Skip creatures that don't match current context
      if(state.inDungeon){
        if(c.dungeonId !== state.inDungeon) continue;
      } else {
        if(c.dungeonId) continue;
      }
      const tgt = c.target;
      const hostile = c.attacked && (tgt===state.player || state.friendlies.includes(tgt) || tgt===u);
      if(hostile) hostileCreatures.push(c);
    }
  } else if(kind==='enemy'){
    for(const c of state.creatures||[]){
      // Skip creatures that don't match current context
      if(state.inDungeon){
        if(c.dungeonId !== state.inDungeon) continue;
      } else {
        if(c.dungeonId) continue;
      }
      const tgt = c.target;
      const hostile = c.attacked && (tgt===state.player || state.friendlies.includes(tgt) || tgt===u);
      if(hostile) hostileCreatures.push(c);
    }
  }
  const candidates = kind==='enemy'
    ? [state.player, ...state.friendlies.filter(f=>f.respawnT<=0), ...hostileCreatures]
    : [...state.enemies, ...hostileCreatures];
  let target = null, bestD = Infinity;
  if(u._lockUntil && u._lockUntil > now && u._lockId){
    target = candidates.find(c => (c.id||c._id) === u._lockId);
  }
  if(!target){
    for(const c of candidates){ const d=Math.hypot((c.x||0)-u.x,(c.y||0)-u.y); if(d<bestD){bestD=d; target=c;} }
    if(target){ u._lockId = target.id||target._id||null; u._lockUntil = now + 1.5; }
  } else {
    bestD = Math.hypot((target.x||0)-u.x,(target.y||0)-u.y);
  }
  if(!target) return;

  const isStaff = (u.weaponType||'').toLowerCase().includes('staff');
  const roleKey = (u.variant==='mage') ? 'mage' : (u.variant==='warden' ? 'warden' : 'dps');
  let role = u.role || (u.variant==='mage' ? 'HEALER' : (u.variant==='warden' ? 'TANK' : 'DPS'));
  if(typeof role === 'string') role = role.toUpperCase();
  // Allies = same team as this NPC (enemies heal enemies, friendlies heal player/friendlies)
  const allies = kind === 'enemy' 
    ? state.enemies.filter(e=>!e.dead && e.hp>0)
    : [state.player, ...state.friendlies.filter(f=>f.respawnT<=0), u];
  let lowestAlly = null, lowestAllyHp = 1, lowestDist = Infinity;
  for(const ally of allies){
    if(!ally || ally.hp===undefined) continue;
    const maxHp = ally===state.player ? currentStats(state).maxHp : ally.maxHp || currentStats(state).maxHp;
    const hpPct = clamp((ally.hp||0)/Math.max(1, maxHp), 0, 1);
    if(hpPct < lowestAllyHp){
      lowestAllyHp = hpPct;
      lowestAlly = ally;
      lowestDist = Math.hypot((ally.x||0)-u.x, (ally.y||0)-u.y);
    }
  }

  // Party context for role behaviors
  ensurePartyState(state);
  const bb = state.party.blackboard;
  const focusTarget = bb.focusTargetId ? (state.enemies||[]).find(e=> (e.id||e._id)===bb.focusTargetId && !e.dead && e.hp>0) : null;

  // ═══════════════════════════════════════════════════════════════════════════════
  // GUARD TACTICAL ABILITY PRIORITIES (Elite Combat AI)
  // ═══════════════════════════════════════════════════════════════════════════════
  if(u.guard){
    const TACTICAL_IDS = new Set(['gravity_well','meteor_slam','shoulder_charge']);
    const KITE_AFTER_BURST = 2.4;
    const KITE_AFTER_FAIL = 2.2;
    const TACTICAL_MANA_BUFFER = 6;
    const TACTICAL_RESERVE = 30;
    const RECOVERY_MIN_MANA = 45; // Don't exit recovery until we have this much mana
    const LIGHT_ATTACK_COST = 0; // Light attacks are free
    
    // Recovery state: check if unit is kiting/recovering
    const inRecovery = (u._guardKiteUntil || 0) > now;
    const recoveryReason = inRecovery ? (u._guardManaStarveAbility ? 'mana_starve' : 'post_burst') : null;
    
    // BLOCK DURING COMBAT: Guards use blocking reactively when under threat
    // Only block if:
    // 1. Recently damaged (within last 0.8 seconds)
    // 2. Have stamina available (guards get stamina if not initialized)
    // 3. Enemies nearby (within melee range ~80 units)
    if(!u.stam) u.stam = 100; // Initialize stamina for guards
    if(!u.maxStam) u.maxStam = 100;
    
    u.blocking = false; // Reset each frame
    
    // Track last damage time for reactive blocking
    // Initialize to -999 so guards who never took damage won't block
    if(!u._lastDamagedAt) u._lastDamagedAt = -999;
    
    // Activate blocking if recently damaged (0.8s window) and have stamina
    if((now - u._lastDamagedAt < 0.8) && u.stam > 20){
      // Check if enemies are in melee range (80 units) to justify blocking
      const nearbyEnemyCount = (state.enemies || []).filter(e => {
        if(e.dead || e.hp <= 0 || e.respawnT > 0) return false;
        const dist = Math.hypot(e.x - u.x, e.y - u.y);
        return dist <= 80;
      }).length;
      
      if(nearbyEnemyCount > 0){
        u.blocking = true;
        
        // Log block activation (1% sample rate)
        if(state.debugLog && Math.random() < 0.01){
          const timeSinceDamage = now - u._lastDamagedAt;
          state.debugLog.push({
            time: now.toFixed(2),
            type: 'GUARD_BLOCK_ACTIVE',
            guard: u.name || u.variant,
            role: u.guardRole || 'DPS',
            reason: 'reactive_defense',
            timeSinceDamage: timeSinceDamage.toFixed(2),
            stamina: u.stam.toFixed(1),
            nearbyEnemies: nearbyEnemyCount
          });
        }
      }
    }
    
    const tryCast = (id)=>{ 
      const i=u.npcAbilities.indexOf(id); 
      const hasCd = i>=0 && u.npcCd[i] === 0;
      const cost = ABILITY_META[id]?.cost||0;
      const hasMana = u.mana >= cost;
      
      // RECOVERY LOCKOUT: Block all expensive abilities during recovery
      // Only allow light attacks (cost=0) and movement during recovery phase
      if(inRecovery && cost > LIGHT_ATTACK_COST){
        return -1; // Hard lockout - don't even check mana
      }
      
      // Mana reserve: don't drop below TACTICAL_RESERVE unless in burst window
      const inBurstWindow = now < (ball.burstUntil || 0);
      if(hasCd && hasMana && TACTICAL_IDS.has(id) && !inBurstWindow && (u.mana - cost) < TACTICAL_RESERVE){
        return -1;
      }

      // If we can't afford a tactical outside recovery, enter recovery mode
      if(hasCd && !hasMana && TACTICAL_IDS.has(id) && !inRecovery){
        u._guardManaStarveAt = now;
        u._guardManaStarveAbility = id;
        u._guardKiteUntil = Math.max(u._guardKiteUntil || 0, now + KITE_AFTER_FAIL);
        if(state.debugLog && Math.random() < 0.05){
          logDebug(state, 'GUARD_BALL', 'Guard entering recovery (mana starved)', {
            type: 'GUARD_RECOVERY_ENTER',
            reason: 'mana_starve',
            ability: id,
            kiteUntil: +u._guardKiteUntil.toFixed(2),
            mana: Math.round(u.mana ?? 0),
            required: cost
          });
        }
      }
      return (hasCd && hasMana) ? i : -1; 
    };
    const getEntityId = (ent)=> ent ? (ent.id || ent._id) : null;
    const guardSiteId = u.guardFlagId || u.homeSiteId || u.siteId;
    const guardSite = guardSiteId ? (state.sites||[]).find(s => s.id === guardSiteId) : null;

    // If guard squad has a shared target, prefer it so tacticals synchronize.
    if(guardSite && guardSite._sharedTargetUntil > now && guardSite._sharedTargetId){
      const shared = candidates.find(c => (c.id||c._id) === guardSite._sharedTargetId);
      if(shared){
        target = shared;
        bestD = Math.hypot((target.x||0)-u.x,(target.y||0)-u.y);
      }
    }

    const targetId = getEntityId(target);
    const targetHpPct = (target && target.maxHp) ? (target.hp / target.maxHp) : 1.0;
    const dist = bestD;
    const guardRole = String(u.guardRole || role || 'DPS').toUpperCase();
    
    // COOLDOWN-AWARE RECOVERY EXIT: Don't exit recovery until combo abilities are ready
    // Check if any primary tactical is off cooldown AND we have enough mana
    if(inRecovery && u.mana >= RECOVERY_MIN_MANA){
      let anyTacticalReady = false;
      for(const tacId of TACTICAL_IDS){
        const idx = u.npcAbilities.indexOf(tacId);
        if(idx >= 0 && u.npcCd[idx] === 0){
          anyTacticalReady = true;
          break;
        }
      }
      if(anyTacticalReady){
        u._guardKiteUntil = 0; // Exit recovery cleanly
        if(state.debugLog && Math.random() < 0.1){
          logDebug(state, 'GUARD_BALL', 'Guard exiting recovery (combo ready)', {
            type: 'GUARD_RECOVERY_EXIT',
            mana: Math.round(u.mana ?? 0),
            reason: 'tactical_ready'
          });
        }
      }
    }

    // Step 4: Weave gate (shared per guard-ball)
    // - Outside of the ball's burst window, prevent repeated tactical casts back-to-back.
    // - Does NOT apply to the explicit synchronized combo stages (handled separately below).
    const siteKey = u.guardFlagId || u.homeSiteId || u.siteId || (guardSite?.id || null) || 'unknown';
    const ballId = `${kind}:${siteKey}`;
    const ball = getOrCreateGuardBall(state, ballId, now);
    const inBurstWindow = now < (ball.burstUntil || 0);
    const WEAVE_GAP = 0.90;
    const isWeaveLocked = (!inBurstWindow) && now < (ball.weaveUntil || 0);

    const noteWeaveLock = (abilityId)=>{
      ball.weaveUntil = now + WEAVE_GAP;
      ball.lastWeaveAt = now;
      ball.lastWeaveAbilityId = abilityId;
      ball.lastWeaveCasterId = getStableUnitLogId(state, u, kind);
      ball.lastWeaveTargetId = targetId;

      // Throttle debug spam
      if(state.debugLog && (!ball._lastWeaveLogAt || (now - ball._lastWeaveLogAt) >= 0.6)){
        ball._lastWeaveLogAt = now;
        logDebug(state, 'GUARD_BALL', 'Weave lock set after tactical cast', {
          type: 'GUARD_BALL_WEAVE_LOCK',
          ballId,
          ability: abilityId,
          casterId: ball.lastWeaveCasterId,
          targetId: targetId ?? null,
          weaveUntil: +ball.weaveUntil.toFixed(2),
          burstUntil: ball.burstUntil ? +ball.burstUntil.toFixed(2) : 0
        });
      }
    };

    // GUARD DPS: Synchronized tactical combo: gravity_well → meteor_slam → shoulder_charge
    if(guardRole !== 'HEALER' && guardSite && targetId){
      guardSite._guardCombo = guardSite._guardCombo || null;

      const comboExpired = !guardSite._guardCombo || (guardSite._guardCombo.until || 0) <= now;
      const comboWrongTarget = guardSite._guardCombo && guardSite._guardCombo.targetId !== targetId;
      // Start combo more often; in practice targets are frequently <45% by the time guards engage.
      const shouldStartCombo = dist <= 240 && targetHpPct >= 0.15;
      const startGateOk = (guardSite._guardComboStartUntil || 0) <= now;

      if((comboExpired || comboWrongTarget) && shouldStartCombo && startGateOk){
        const group = (kind === 'enemy' ? (state.enemies||[]) : (state.friendlies||[]))
          .filter(g => g && g.guard && (g.guardFlagId || g.homeSiteId || g.siteId) === guardSite.id && g.respawnT <= 0 && String(g.guardRole || g.role || 'DPS').toUpperCase() !== 'HEALER');

        // Deterministic leader selection: lowest string id
        let leader = group[0] || u;
        for(const g of group){
          const gid = String(getEntityId(g) || '');
          const lid = String(getEntityId(leader) || '');
          if(lid === '' || (gid !== '' && gid < lid)) leader = g;
        }

        guardSite._guardCombo = {
          targetId,
          stage: 'GRAVITY',
          stageUntil: now + 1.2,
          until: now + 6.0,
          leaderId: getEntityId(leader),
          squadSize: group.length || 1,
          meteorCast: {},
          chargeCast: false,
          chargerId: null
        };

        // Prevent immediate restarts if gravity isn't available (keeps behavior stable).
        guardSite._guardComboStartUntil = now + 3.0;

        if(state.debugLog){
          state.debugLog.push({
            time: now.toFixed(2),
            type: 'GUARD_COMBO',
            site: guardSite.id,
            stage: 'GRAVITY',
            target: target.name || target.variant || String(targetId)
          });
        }
      }

      const combo = guardSite._guardCombo;
      if(combo && combo.targetId === targetId && combo.until > now){
        // Stage 1: One leader casts gravity_well to set up the combo
        if(combo.stage === 'GRAVITY'){
          if(getEntityId(u) === combo.leaderId && dist <= 140){
            const idx = tryCast('gravity_well');
            if(idx !== -1){
              const abilityId = u.npcAbilities[idx];
              const cdValue = ABILITY_META[abilityId]?.cd || 0;
              const costValue = ABILITY_META[abilityId]?.cost || 0;
              u._cdUntil[abilityId] = now + cdValue;
              for(let i=0; i<u.npcAbilities.length; i++){
                if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
              }
              u.mana -= costValue;
              npcCastSupportAbility(state, u, abilityId, target);
              recordAI('cast-prio',{role:'GUARD_DPS',ability:abilityId,reason:'combo_gravity'});

              // Burst happened: kite window to regen mana/cds.
              u._guardLastTacticalCastAt = now;
              u._guardKiteUntil = Math.max(u._guardKiteUntil || 0, now + KITE_AFTER_BURST);

              combo.stage = 'METEOR';
              combo.stageUntil = now + 0.65;
              combo.meteorCast = {};
              if(state.debugLog){
                state.debugLog.push({ time: now.toFixed(2), type:'GUARD_COMBO', site: guardSite.id, stage:'METEOR', target: target.name || target.variant || String(targetId) });
              }
              return;
            }
          }
          // If gravity isn't available quickly, proceed anyway (still want meteor burst).
          if(now >= combo.stageUntil){
            combo.stage = 'METEOR';
            combo.stageUntil = now + 0.65;
            combo.meteorCast = {};
            if(state.debugLog){
              state.debugLog.push({ time: now.toFixed(2), type:'GUARD_COMBO', site: guardSite.id, stage:'METEOR', target: target.name || target.variant || String(targetId), note:'gravity_skipped' });
            }
          }
        }

        // Stage 2: All DPS guards dump meteor_slam in a tight time window
        if(combo.stage === 'METEOR'){
          const uid = getEntityId(u);
          const meteorRange = (ABILITY_META['meteor_slam']?.range || 100);
          if(uid && !combo.meteorCast[uid] && dist <= meteorRange){
            const idx = tryCast('meteor_slam');
            if(idx !== -1){
              const abilityId = u.npcAbilities[idx];
              const cdValue = ABILITY_META[abilityId]?.cd || 0;
              const costValue = ABILITY_META[abilityId]?.cost || 0;
              u._cdUntil[abilityId] = now + cdValue;
              for(let i=0; i<u.npcAbilities.length; i++){
                if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
              }
              u.mana -= costValue;
              npcCastSupportAbility(state, u, abilityId, target);
              recordAI('cast-prio',{role:'GUARD_DPS',ability:abilityId,reason:'combo_meteor'});
              combo.meteorCast[uid] = now;

              u._guardLastTacticalCastAt = now;
              u._guardKiteUntil = Math.max(u._guardKiteUntil || 0, now + KITE_AFTER_BURST);
              return;
            }
          }

          const meteorCount = combo.meteorCast ? Object.keys(combo.meteorCast).length : 0;
          if(now >= combo.stageUntil || meteorCount >= (combo.squadSize || 1)){
            // Choose a charger (closest DPS) for the finisher
            const group = (kind === 'enemy' ? (state.enemies||[]) : (state.friendlies||[]))
              .filter(g => g && g.guard && (g.guardFlagId || g.homeSiteId || g.siteId) === guardSite.id && g.respawnT <= 0 && String(g.guardRole || g.role || 'DPS').toUpperCase() !== 'HEALER');
            let charger = group[0] || u;
            let best = Infinity;
            for(const g of group){
              const d = Math.hypot((target.x||0)-g.x, (target.y||0)-g.y);
              if(d < best){ best = d; charger = g; }
            }
            combo.chargerId = getEntityId(charger);
            combo.stage = 'CHARGE';
            combo.stageUntil = now + 0.85;
            combo.chargeCast = false;
            if(state.debugLog){
              state.debugLog.push({ time: now.toFixed(2), type:'GUARD_COMBO', site: guardSite.id, stage:'CHARGE', target: target.name || target.variant || String(targetId) });
            }
          }
        }

        // Stage 3: One guard shoulder-charges as a finisher
        if(combo.stage === 'CHARGE'){
          if(!combo.chargeCast && getEntityId(u) === combo.chargerId && dist <= 130){
            const idx = tryCast('shoulder_charge');
            if(idx !== -1){
              const abilityId = u.npcAbilities[idx];
              const cdValue = ABILITY_META[abilityId]?.cd || 0;
              const costValue = ABILITY_META[abilityId]?.cost || 0;
              u._cdUntil[abilityId] = now + cdValue;
              for(let i=0; i<u.npcAbilities.length; i++){
                if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
              }
              u.mana -= costValue;
              npcCastSupportAbility(state, u, abilityId, target);
              recordAI('cast-prio',{role:'GUARD_DPS',ability:abilityId,reason:'combo_charge'});

              u._guardLastTacticalCastAt = now;
              u._guardKiteUntil = Math.max(u._guardKiteUntil || 0, now + KITE_AFTER_BURST);
              combo.chargeCast = true;
              combo.stage = 'COOLDOWN';
              combo.until = now + 6.0;
              if(state.debugLog){
                state.debugLog.push({ time: now.toFixed(2), type:'GUARD_COMBO', site: guardSite.id, stage:'COOLDOWN', target: target.name || target.variant || String(targetId) });
              }
              return;
            }
          }
          if(now >= combo.stageUntil){
            combo.stage = 'COOLDOWN';
            combo.until = now + 4.0;
          }
        }
      }

      // Fallback: if combo isn't active, still cast tacticals with priority.
      // This prevents guards from only using cheap filler abilities.
      const comboActive = guardSite._guardCombo && guardSite._guardCombo.targetId === targetId && guardSite._guardCombo.until > now && guardSite._guardCombo.stage !== 'COOLDOWN';
      const tacticalGateOk = (u._guardTacticalUntil || 0) <= now;
      if(!comboActive && tacticalGateOk && !isWeaveLocked){
        const castAbilityById = (abilityId)=>{
          const idx = tryCast(abilityId);
          if(idx === -1) return false;
          const cdValue = ABILITY_META[abilityId]?.cd || 0;
          const costValue = ABILITY_META[abilityId]?.cost || 0;
          u._cdUntil[abilityId] = now + cdValue;
          for(let i=0; i<u.npcAbilities.length; i++){
            if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
          }
          u.mana -= costValue;
          npcCastSupportAbility(state, u, abilityId, target);
          recordAI('cast-prio',{role:'GUARD_DPS',ability:abilityId,reason:'tactical_fallback'});
          // Small internal lock to avoid multi-casting in the same instant across branches
          u._guardTacticalUntil = now + 0.25;
          noteWeaveLock(abilityId);

          u._guardLastTacticalCastAt = now;
          u._guardKiteUntil = Math.max(u._guardKiteUntil || 0, now + KITE_AFTER_BURST);
          return true;
        };

        // Priority order for maximum burst value
        // 1) Gravity well if in reasonable range (setup)
        if(dist <= 170 && castAbilityById('gravity_well')) return;
        // 2) Meteor slam when in damage range
        const meteorRange = (ABILITY_META['meteor_slam']?.range || 100);
        if(dist <= meteorRange && castAbilityById('meteor_slam')) return;
        // 3) Shoulder charge as a finisher/engage
        if(dist <= 135 && castAbilityById('shoulder_charge')) return;
      } else if(!comboActive && tacticalGateOk && isWeaveLocked){
        // Optional debug sample: show when weave gate prevents tacticals.
        if(state.debugLog && Math.random() < 0.02){
          logDebug(state, 'GUARD_BALL', 'Weave gate blocked tactical cast', {
            type: 'GUARD_BALL_WEAVE_BLOCK',
            ballId,
            leaderId: ball.leaderId ?? null,
            casterId: getStableUnitLogId(state, u, kind),
            targetId: targetId ?? null,
            lockedByAbility: ball.lastWeaveAbilityId ?? null,
            weaveUntil: ball.weaveUntil ? +ball.weaveUntil.toFixed(2) : 0,
            now: +now.toFixed(2)
          });
        }
      }
    }
    
    // HEALER GUARDS: Proactive healing and shields
    if(role === 'HEALER'){
      // Step 5: deterministic H1/H2 policies for guard-ball healers
      const selfId = getStableUnitLogId(state, u, kind);
      const healerPool = (kind === 'enemy' ? (state.enemies||[]) : (state.friendlies||[]))
        .filter(g => g && g.guard && String(g.guardRole || g.role || '').toUpperCase() === 'HEALER')
        .filter(g => {
          const gSiteKey = g.guardFlagId || g.homeSiteId || g.siteId || null;
          return String(gSiteKey || '') === String(siteKey || '');
        })
        .filter(g => {
          // alive-ish
          if(g.respawnT !== undefined) return g.respawnT <= 0;
          if(g.dead !== undefined) return !g.dead && (g.hp === undefined || g.hp > 0);
          return true;
        });

      healerPool.sort((a,b)=>{
        const aId = String(getStableUnitLogId(state, a, kind) || '');
        const bId = String(getStableUnitLogId(state, b, kind) || '');
        return aId.localeCompare(bId);
      });

      let healerPolicy = 'H2';
      if(selfId){
        const idx = healerPool.findIndex(h => String(getStableUnitLogId(state, h, kind) || '') === String(selfId));
        if(idx === 0) healerPolicy = 'H1';
        else healerPolicy = 'H2';
      }
      u._guardHealerPolicy = healerPolicy;

      const healGateOk = now >= (ball.healerHealUntil || 0);
      const shieldGateOk = now >= (ball.healerShieldUntil || 0);
      const cleanseGateOk = now >= (ball.healerCleanseUntil || 0);

      const castGuardHealer = (abilityId, castTarget, gateKind, reason)=>{
        if(gateKind === 'heal' && !healGateOk) return false;
        if(gateKind === 'shield' && !shieldGateOk) return false;
        if(gateKind === 'cleanse' && !cleanseGateOk) return false;

        const idx = tryCast(abilityId);
        if(idx === -1) return false;
        const cdValue = ABILITY_META[abilityId]?.cd || 0;
        const costValue = ABILITY_META[abilityId]?.cost || 0;
        u._cdUntil[abilityId] = now + cdValue;
        for(let i=0; i<u.npcAbilities.length; i++){
          if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
        }
        u.mana -= costValue;
        npcCastSupportAbility(state, u, abilityId, castTarget || u);
        recordAI('cast-prio', { role:'GUARD_HEALER', ability: abilityId, reason, policy: healerPolicy });

        // Debug proof (exportable): show policy + shared gate timing.
        if(state.debugLog){
          const minTick = 0.25;
          if(!ball._lastHealerPolicyLogAt || (now - ball._lastHealerPolicyLogAt) >= minTick){
            ball._lastHealerPolicyLogAt = now;
            logDebug(state, 'GUARD_BALL', 'Guard healer cast (policy)', {
              type: 'GUARD_HEALER_POLICY_CAST',
              ballId,
              policy: healerPolicy,
              gateKind,
              reason,
              ability: abilityId,
              casterId: selfId,
              targetId: (castTarget ? (castTarget.id || castTarget._id) : null),
              healUntil: ball.healerHealUntil ? +ball.healerHealUntil.toFixed(2) : 0,
              shieldUntil: ball.healerShieldUntil ? +ball.healerShieldUntil.toFixed(2) : 0,
              cleanseUntil: ball.healerCleanseUntil ? +ball.healerCleanseUntil.toFixed(2) : 0
            });
          }
        }

        if(gateKind === 'heal') ball.healerHealUntil = now + 0.60;
        if(gateKind === 'shield') ball.healerShieldUntil = now + 1.10;
        if(gateKind === 'cleanse') ball.healerCleanseUntil = now + 0.90;
        return true;
      };

      // quick scan for dots/pressure near the healer
      let dottedAllies = 0;
      let woundedNearby = 0;
      for(const ally of allies){
        if(!ally || ally.hp === undefined) continue;
        const d = Math.hypot((ally.x||0)-u.x, (ally.y||0)-u.y);
        if(d > 170) continue;
        const maxHp = ally===state.player ? currentStats(state).maxHp : ally.maxHp || currentStats(state).maxHp;
        const hpPct = clamp((ally.hp||0)/Math.max(1, maxHp), 0, 1);
        if(hpPct < 0.75) woundedNearby++;
        if(Array.isArray(ally.dots) && ally.dots.length > 0) dottedAllies++;
      }

      // H1: primary healer (emergency heals + occasional cleanse)
      if(healerPolicy === 'H1'){
        if(lowestAlly && lowestAllyHp < 0.55 && lowestDist <= 190){
          if(castGuardHealer('mage_divine_touch', lowestAlly, 'heal', 'H1_emergency_heal')) return;
          if(castGuardHealer('heal_burst', u, 'heal', 'H1_emergency_heal')) return;
        }

        // stabilize multi-wound
        if(woundedNearby >= 3){
          if(castGuardHealer('heal_burst', u, 'heal', 'H1_aoe_stabilize')) return;
        }

        // light cleanse support when pressure exists
        if(dottedAllies >= 1){
          if(castGuardHealer('cleanse_wave', u, 'cleanse', 'H1_cleanse_support')) return;
        }

        // mitigation during (or right before) burst windows
        if(target && dist <= 300){
          if(inBurstWindow){
            if(castGuardHealer('ward_barrier', u, 'shield', 'H1_burst_mitigation')) return;
          }
          if(lowestAlly && lowestAllyHp < 0.90){
            if(castGuardHealer('ward_barrier', u, 'shield', 'H1_shield_topoff')) return;
          }
        }
      }
      // H2: secondary healer (shields/auras + backup heal)
      else {
        if(target && dist <= 320){
          if(castGuardHealer('mage_radiant_aura', u, 'shield', 'H2_aura')) return;
          if(castGuardHealer('ward_barrier', u, 'shield', 'H2_barrier')) return;
        }

        // heavier cleanse only when multiple allies are dotted
        if(dottedAllies >= 2){
          if(castGuardHealer('cleanse_wave', u, 'cleanse', 'H2_cleanse')) return;
        }

        // backup emergency heal (stricter than H1)
        if(lowestAlly && lowestAllyHp < 0.40 && lowestDist <= 190){
          if(castGuardHealer('mage_divine_touch', lowestAlly, 'heal', 'H2_emergency_backup')) return;
          if(castGuardHealer('heal_burst', u, 'heal', 'H2_emergency_backup')) return;
        }
      }
    }
  }

  // Healer priority: emergency save, then AoE stabilize, then pre-burst mitigation
  if(role==='HEALER'){
    const HEALER_EMERGENCY_RESERVE = 22; // Reserve mana for critical heals
    const HEALER_CRITICAL_HP = 0.35; // HP threshold for emergency override
    
    const tryCast = (id)=>{ 
      const i=u.npcAbilities.indexOf(id); 
      // Require cooldown to be FULLY at 0 (not just <=0.5s) to prevent spam
      const hasCd = i>=0 && u.npcCd[i] === 0;
      const cost = ABILITY_META[id]?.cost||0;
      const hasMana = u.mana >= cost;
      
      // HEALER EMERGENCY RESERVE: Don't spend below reserve unless ally is critical
      const wouldDropBelowReserve = hasMana && (u.mana - cost) < HEALER_EMERGENCY_RESERVE;
      const anyCriticalAlly = lowestAlly && lowestAllyHp < HEALER_CRITICAL_HP;
      
      if(wouldDropBelowReserve && !anyCriticalAlly){
        return -1; // Preserve reserve for emergencies
      }
      
      return (hasCd && hasMana) ? i : -1;
    };
    if(lowestAlly && lowestAllyHp < 0.40){
      let idx = tryCast('mage_divine_touch'); if(idx===-1) idx = tryCast('heal_burst');
      if(idx!==-1){ 
        const abilityId = u.npcAbilities[idx];
        const cdValue = ABILITY_META[abilityId]?.cd || 0;
        const costValue = ABILITY_META[abilityId]?.cost || 0;
        u._cdUntil[abilityId] = now + cdValue;
        
        // Set cooldown for ALL slots containing this ability (fix duplicate ability spam)
        for(let i=0; i<u.npcAbilities.length; i++){
          if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
        }
        u.mana -= costValue;
        npcCastSupportAbility(state,u,abilityId,lowestAlly);
        recordAI('cast-prio',{role,ability:abilityId});
        return;
      }
    }
    // multiple allies low: use AoE heals
    const wounded = allies.filter(a=>a && a.hp!==undefined && (a.hp / Math.max(1, (a.maxHp||currentStats(state).maxHp))) < 0.75 && Math.hypot((a.x||0)-u.x,(a.y||0)-u.y) <= 160);
    if(wounded.length >= 3){
      let idx = tryCast('heal_burst'); if(idx===-1) idx = tryCast('beacon_of_light');
      if(idx!==-1){
        const abilityId = u.npcAbilities[idx];
        const cdValue = ABILITY_META[abilityId]?.cd || 0;
        const costValue = ABILITY_META[abilityId]?.cost || 0;
        u._cdUntil[abilityId] = now + cdValue;
        // Set cooldown for ALL duplicate slots
        for(let i=0; i<u.npcAbilities.length; i++){
          if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
        }
        u.mana -= costValue;
        npcCastSupportAbility(state,u,abilityId,u);
        recordAI('cast-prio',{role,ability:abilityId});
        return;
      }
    }
    // pre-burst mitigation
    if(state.party.macroState==='burst'){
      const idx = tryCast('ward_barrier');
      if(idx!==-1){
        const cdValue = ABILITY_META['ward_barrier']?.cd || 0;
        const costValue = ABILITY_META['ward_barrier']?.cost || 0;
        u._cdUntil['ward_barrier'] = now + cdValue;
        // Set cooldown for ALL duplicate slots
        for(let i=0; i<u.npcAbilities.length; i++){
          if(u.npcAbilities[i] === 'ward_barrier') u.npcCd[i] = cdValue;
        }
        u.mana -= costValue;
        npcCastSupportAbility(state,u,'ward_barrier',u);
        recordAI('cast-prio',{role,ability:'ward_barrier'});
        return;
      }
    }
  }

  // Tank priority: peel healer, stop capture, burst CC on focus
  if(role==='TANK'){
    const healer = allies.find(a=> a && (a.role==='HEALER' || a===state.player && false));
    const tryCast = (id)=>{ const i=u.npcAbilities.indexOf(id); return (i>=0 && u.npcCd[i] === 0 && u.mana >= (ABILITY_META[id]?.cost||0)) ? i : -1; };
    if(healer){
      const threat = (state.enemies||[]).find(e=>!e.dead && e.hp>0 && Math.hypot((e.x||0)-(healer.x||0),(e.y||0)-(healer.y||0)) <= 140);
      if(threat){
        let idx = tryCast('knight_taunt'); if(idx===-1) idx = tryCast('warcry'); if(idx===-1) idx = tryCast('knight_shield_wall');
        if(idx!==-1){
          const abilityId = u.npcAbilities[idx];
          const cdValue = ABILITY_META[abilityId]?.cd || 0;
          const costValue = ABILITY_META[abilityId]?.cost || 0;
          u._cdUntil[abilityId] = now + cdValue;
          // Set cooldown for ALL duplicate slots
          for(let i=0; i<u.npcAbilities.length; i++){
            if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
          }
          u.mana -= costValue;
          npcCastSupportAbility(state,u,abilityId,u);
          recordAI('cast-prio',{role,ability:abilityId});
          return;
        }
      }
    }
    // burst CC on focus target
    if(state.party.macroState==='burst' && focusTarget){
      let idx = tryCast('knight_taunt'); if(idx===-1) idx = tryCast('warcry');
      if(idx!==-1){
        const abilityId = u.npcAbilities[idx];
        const cdValue = ABILITY_META[abilityId]?.cd || 0;
        const costValue = ABILITY_META[abilityId]?.cost || 0;
        u._cdUntil[abilityId] = now + cdValue;
        // Set cooldown for ALL duplicate slots
        for(let i=0; i<u.npcAbilities.length; i++){
          if(u.npcAbilities[i] === abilityId) u.npcCd[i] = cdValue;
        }
        u.mana -= costValue;
        npcCastSupportAbility(state,u,abilityId,u);
        recordAI('cast-prio',{role,ability:abilityId});
        return;
      }
    }
  }

  // DPS ROTATION SYSTEM: Maintain buffs 100%, then damage abilities by priority, weave light attacks
  if(role==='DPS'){
    const DPS_RECOVERY_THRESHOLD = 20; // Enter recovery below this mana
    const DPS_RECOVERY_EXIT = 35; // Exit recovery when mana reaches this
    
    // Check if in recovery mode
    if(!u._dpsRecoveryUntil) u._dpsRecoveryUntil = 0;
    const inDpsRecovery = now < u._dpsRecoveryUntil;
    
    // Enter recovery if mana too low
    if(!inDpsRecovery && u.mana < DPS_RECOVERY_THRESHOLD){
      u._dpsRecoveryUntil = now + 3.0; // Force 3s recovery
      if(state.debugLog && Math.random() < 0.1){
        logDebug(state, 'DPS_RECOVERY', 'Entering recovery mode', {
          type: 'DPS_RECOVERY_ENTER',
          mana: Math.round(u.mana),
          until: +u._dpsRecoveryUntil.toFixed(2)
        });
      }
    }
    
    // Exit recovery if mana recovered
    if(inDpsRecovery && u.mana >= DPS_RECOVERY_EXIT){
      u._dpsRecoveryUntil = 0;
      if(state.debugLog && Math.random() < 0.1){
        logDebug(state, 'DPS_RECOVERY', 'Exiting recovery mode', {
          type: 'DPS_RECOVERY_EXIT',
          mana: Math.round(u.mana)
        });
      }
    }
    
    const tryCast = (id)=>{ 
      // Block expensive abilities during recovery
      const cost = ABILITY_META[id]?.cost||0;
      if(inDpsRecovery && cost > 0) return -1;
      
      const i=u.npcAbilities.indexOf(id); 
      return (i>=0 && u.npcCd[i] === 0 && u.mana >= cost) ? i : -1; 
    };
    
    // PRIORITY 1: Maintain buff uptime (recast when < 3s remaining) - but don't return, continue to damage rotation
    if(!u._buffTimers) u._buffTimers = {};
    let buffCasted = false;
    for(let i=0;i<u.npcAbilities.length;i++){
      const id = u.npcAbilities[i];
      const meta = ABILITY_META[id];
      if(meta && (meta.kind === 'buff' || meta.kind === 'shield') && meta.type === 'support'){
        const timeLeft = u._buffTimers[id] || 0;
        if(timeLeft < 3.0){
          const idx = tryCast(id);
          if(idx !== -1){
            // Set cooldown for ALL duplicate slots
            for(let i=0; i<u.npcAbilities.length; i++){
              if(u.npcAbilities[i] === id) u.npcCd[i] = meta.cd;
            }
            u._cdUntil[id] = now + meta.cd;
            u.mana -= meta.cost;
            npcCastSupportAbility(state, u, id, u);
            u._buffTimers[id] = 12.0; // Assume 12s duration
            recordAI('cast-prio', {role, ability:id, reason:'buff_maintain'});
            buffCasted = true;
            return; // Return immediately after casting buff to prevent double-casting
          }
        }
      }
    }
    
    // If we just casted a buff, still try to use damage abilities (don't return yet)
    // PRIORITY 2: Use damage abilities in rotation (prioritize high damage, prefer off-cooldown)
    if(!buffCasted){
      const damageAbilities = [];
      for(let i=0;i<u.npcAbilities.length;i++){
        const id = u.npcAbilities[i];
        const meta = ABILITY_META[id];
        if(meta && !meta.filler && meta.dmg){
          const cost = meta.cost || 0;
          const hasMana = u.mana >= cost;
          const hasCd = u.npcCd[i] === 0; // Require exactly 0, not <=0
          
          // Log mana starvation for damage abilities (2% sample)
          if(hasCd && !hasMana && state.debugLog && Math.random() < 0.02){
            state.debugLog.push({
              time: (state.campaign?.time || 0).toFixed(2),
              type: 'MANA_STARVATION',
              unit: u.name || u.variant,
              ability: id,
              required: cost,
              current: Math.round(u.mana ?? 0),
              reason: 'damage_rotation'
            });
          }
          
          if(hasCd && hasMana){
            const inRange = bestD <= (meta.range || 100);
            if(!isStaff && meta.type==='projectile') continue; // Skip staff abilities for melee
            if(inRange) damageAbilities.push({id, meta, idx:i});
          }
        }
      }
      
      // Sort by cost (use low-cost abilities more frequently for weaving)
      damageAbilities.sort((a,b) => (a.meta.cost||0) - (b.meta.cost||0));
      
      if(damageAbilities.length > 0){
        const chosen = damageAbilities[0];
        // Set cooldown for ALL duplicate slots
        for(let i=0; i<u.npcAbilities.length; i++){
          if(u.npcAbilities[i] === chosen.id) u.npcCd[i] = chosen.meta.cd;
        }
        u._cdUntil[chosen.id] = now + chosen.meta.cd;
        u.mana -= chosen.meta.cost;
        const ang = Math.atan2(target.y-u.y, target.x-u.x);
        
        if(chosen.meta.type === 'projectile'){
          let aimAng = ang;
          if(target.vx || target.vy){
            const leadX = target.x + (target.vx||0)*0.25;
            const leadY = target.y + (target.vy||0)*0.25;
            aimAng = Math.atan2(leadY - u.y, leadX - u.x);
          }
          spawnProjectile(state, u.x, u.y, aimAng, chosen.meta.speed||420, 5, chosen.meta.dmg, chosen.meta.pierce||0, fromPlayer);
        } else if(chosen.meta.type === 'melee'){
          const range = chosen.meta.range;
          const arc = chosen.meta.arc || 1.2;
          const targets = kind==='enemy' ? [state.player, ...state.friendlies] : state.enemies;
          
          const slashColor = kind==='enemy' ? 'rgba(229, 89, 89, 0.6)' : 'rgba(186, 150, 255, 0.6)';
          state.effects.slashes.push({t:0.12, arc, range, dir:ang, x:u.x, y:u.y, color:slashColor, dmg:chosen.meta.dmg});
          
          for(let ei=targets.length-1; ei>=0; ei--){
            const e=targets[ei];
            const dx=e.x-u.x, dy=e.y-u.y; const d=Math.hypot(dx,dy); if(d>range) continue;
            const ea=Math.atan2(dy,dx); let diff=Math.abs(ea-ang); diff=Math.min(diff, Math.PI*2-diff);
            if(diff<=arc/2 && e.hp!==undefined){ e.hp-=chosen.meta.dmg; }
          }
        }
        
        recordAI('cast', {ability:chosen.id, dmg:chosen.meta.dmg, dist:Math.round(bestD), mana:Math.round(u.mana)});
        return;
      }
    }
  }

  // Decay buff timers for DPS
  if(u._buffTimers){
    for(const id in u._buffTimers){
      u._buffTimers[id] = Math.max(0, u._buffTimers[id] - dt);
    }
  }

  // score abilities
  let bestIdx = -1, bestScore = -Infinity, bestSupportTarget=null;
  for(let i=0;i<u.npcAbilities.length;i++){
    const id = u.npcAbilities[i];
    const cdReady = u.npcCd[i] === 0;
    const meta = ABILITY_META[id];
    if(!cdReady || !meta) continue;
    if(u.mana < meta.cost){
      // Log mana starvation (sampled to avoid spam)
      if(debugAI && state.debugLog && Math.random() < 0.01){
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'MANA_STARVED',
          unit: u.name || u.variant,
          kind,
          ability: id,
          required: meta.cost,
          current: Math.round(u.mana),
          max: u.maxMana || 60
        });
      }
      continue;
    }
    if(!isStaff && meta.type==='projectile') continue; // melee only weapon can't cast staffs
    const isSupport = meta.kind === 'heal' || meta.kind === 'shield' || meta.kind === 'buff' || meta.type === 'support';
    let distScore = 0;
    let targetForAbility = target;
    if(isSupport){
      if(!lowestAlly) continue;
      const rangeUse = meta.range || 160;
      distScore = 1 - Math.min(1, (lowestDist||9999) / rangeUse);
      if(distScore < 0.05) continue;
      targetForAbility = lowestAlly;
    } else {
      distScore = 1 - Math.min(1, bestD / (meta.range||100));
      if(distScore < 0.05) continue;
    }
    const roleW = meta.role?.[roleKey] ?? 0.6;
    const manaPressure = u.mana / Math.max(1, u.maxMana||60);
    const manaPenalty = (meta.cost/30) * (manaPressure < 0.25 ? 1.2 : 0.8);
    const supportBonus = isSupport ? Math.max(0, (1-lowestAllyHp)*2.5) : 0;
    const dmgBonus = !isSupport ? 0.5 : 0; // Bonus for damage abilities
    const score = roleW*1.5 + distScore*2.0 + (meta.type==='melee'?0.4:0) + dmgBonus - manaPenalty + supportBonus;
    if(score > bestScore){ bestScore = score; bestIdx = i; bestSupportTarget = isSupport ? targetForAbility : target; }
  }

  if(bestIdx !== -1 && bestScore > -0.5){
    const id = u.npcAbilities[bestIdx];
    const meta = ABILITY_META[id];
    const chosenTarget = (meta.kind || meta.type==='support') ? (bestSupportTarget || lowestAlly || target) : target;
    const ang = Math.atan2((chosenTarget?.y||target.y)-u.y, (chosenTarget?.x||target.x)-u.x);
    if(meta.type==='support' || meta.kind){
      const handled = npcCastSupportAbility(state, u, id, chosenTarget);
      if(!handled){
        if(debugAI){ console.log('[NPC AI] support cast not implemented', id); }
      } else {
        u._cdUntil[id] = now + meta.cd;
        u.mana -= meta.cost; 
        u.npcCd[bestIdx] = meta.cd;
        recordAI('cast', { ability:id, score:Number(bestScore.toFixed(2)), dist:Math.round(bestD), mana:Math.round(u.mana), target:u._lockId||target.id||'?' });
        return; // Return only on successful cast
      }
    }
    else if(meta.type==='projectile'){
      u._cdUntil[id] = now + meta.cd;
      u.mana -= meta.cost; u.npcCd[bestIdx] = meta.cd;
      let aimAng = ang;
      if(target.vx || target.vy){
        const leadX = target.x + (target.vx||0)*0.25;
        const leadY = target.y + (target.vy||0)*0.25;
        aimAng = Math.atan2(leadY - u.y, leadX - u.x);
      }
      spawnProjectile(state, u.x, u.y, aimAng, meta.speed||420, 5, meta.dmg, meta.pierce||0, fromPlayer, { shooter: u, sourceAbilityId: id, sourceKind: kind, sourceType: 'npc_ability' });
      recordAI('cast', { ability:id, score:Number(bestScore.toFixed(2)), dist:Math.round(bestD), mana:Math.round(u.mana), target:u._lockId||target.id||'?' });
      return; // CRITICAL: Return after projectile cast to respect cooldown
    } else {
      u._cdUntil[id] = now + meta.cd;
      u.mana -= meta.cost; u.npcCd[bestIdx] = meta.cd;
      // Melee attack with visual slash effect
      const range = meta.range;
      const arc = meta.arc || 1.2;
      const targets = kind==='enemy' ? [state.player, ...state.friendlies] : state.enemies;
      
      // Create visual slash effect
      const slashColor = kind==='enemy' ? 'rgba(229, 89, 89, 0.6)' : 'rgba(186, 150, 255, 0.6)';
      state.effects.slashes.push({
        t: 0.12,
        arc,
        range,
        dir: ang,
        x: u.x,
        y: u.y,
        color: slashColor,
        dmg: meta.dmg
      });
      
      // Apply damage to targets in arc
      for(let ei=targets.length-1; ei>=0; ei--){
        const e=targets[ei];
        const dx=e.x-u.x, dy=e.y-u.y; const d=Math.hypot(dx,dy); if(d>range) continue;
        const ea=Math.atan2(dy,dx); let diff=Math.abs(ea-ang); diff=Math.min(diff, Math.PI*2-diff);
        if(diff<=arc/2 && e.hp!==undefined){ 
          e.hp-=meta.dmg; 
          // Track damage dealt and received
          e._damageReceived = (e._damageReceived || 0) + meta.dmg;
          u._damageDealt = (u._damageDealt || 0) + meta.dmg;
        }
      }
    }
    recordAI('cast', { ability:id, score:Number(bestScore.toFixed(2)), dist:Math.round(bestD), mana:Math.round(u.mana), target:u._lockId||target.id||'?' });
    return; // CRITICAL: Return after melee cast to respect cooldown
  }

  // LIGHT ATTACK WEAVING: When no abilities available, use light attack as filler
  if(!u._lastLightAttack) u._lastLightAttack = 0;
  const timeSinceLastLight = (state.campaign?.time || 0) - u._lastLightAttack;
  const lightAttackCd = 1.0; // 1 second cooldown for all light attacks
  
  if(timeSinceLastLight >= lightAttackCd && bestD <= (isStaff ? 280 : 80)){
    u._lastLightAttack = state.campaign?.time || 0;
    const ang = Math.atan2(target.y - u.y, target.x - u.x);
    
    if(isStaff){
      // Staff light attack (projectile)
      spawnProjectile(state, u.x, u.y, ang, 420, 4, 4, 0, fromPlayer);
      recordAI('light_attack', {type:'staff', dist:Math.round(bestD)});
    } else {
      // Melee light attack
      const range = 70;
      const arc = 0.9;
      const targets = kind==='enemy' ? [state.player, ...state.friendlies] : state.enemies;
      const slashColor = kind==='enemy' ? 'rgba(229, 89, 89, 0.4)' : 'rgba(186, 150, 255, 0.4)';
      
      state.effects.slashes.push({t:0.1, arc, range, dir:ang, x:u.x, y:u.y, color:slashColor, dmg:5});
      
      let hitCount = 0;
      for(let ei=targets.length-1; ei>=0; ei--){
        const e=targets[ei];
        const dx=e.x-u.x, dy=e.y-u.y; const d=Math.hypot(dx,dy); if(d>range) continue;
        const ea=Math.atan2(dy,dx); let diff=Math.abs(ea-ang); diff=Math.min(diff, Math.PI*2-diff);
        if(diff<=arc/2 && e.hp!==undefined){ 
          applyShieldedDamage(state, e, 5, u);
          hitCount++;
        }
      }
      recordAI('light_attack', {type:'melee', dist:Math.round(bestD), hits:hitCount});
    }
    return;
  }

  // filler ranged light for staff users when not casting
  if(!u._lastLightAttack) u._lastLightAttack = 0;
  const timeSinceLastFiller = (state.campaign?.time || 0) - u._lastLightAttack;
  if(isStaff && bestD<=340 && u.hitCd<=0 && timeSinceLastFiller >= lightAttackCd){
    u._lastLightAttack = state.campaign?.time || 0;
    u.hitCd = 0.65;
    const ang = Math.atan2(target.y - u.y, target.x - u.x);
    spawnProjectile(state, u.x, u.y, ang, 420, 5, Math.max(8, u.dmg||8), 0, fromPlayer);
    recordAI('filler', { ability:'staff_light', dist:Math.round(bestD), mana:Math.round(u.mana), target:u._lockId||target.id||'?' });
  }
}

function spawnEnemyAt(state, x,y, t, opts={}){
  // Use current zone's level range for all enemies
  let level;
  if (opts.level) {
    level = opts.level; // Explicitly set level (for bosses, respawns, etc.)
  } else {
    // Get current zone configuration
    const currentZone = state.zoneConfig.zones[state.zoneConfig.currentZone - 1];
    if (currentZone) {
      // Spawn enemies within zone level range with ±2 variance
      const zoneAvg = Math.floor((currentZone.minLevel + currentZone.maxLevel) / 2);
      const variance = randi(-2, 2);
      level = Math.max(currentZone.minLevel, Math.min(currentZone.maxLevel, zoneAvg + variance));
    } else {
      // Fallback to level 1 if zone not found
      level = 1;
    }
  }
  const eT=enemyTemplate(t);
  // boost initial speed for spawned enemies to ensure they move immediately
  const baseSpeed = opts.level ? 90 : eT.speed; // level 1 enemies get faster base speed
  const e = {x,y,r:13,maxHp:eT.maxHp,hp:eT.maxHp,mana:40,maxMana:40,speed:baseSpeed,contactDmg:eT.contactDmg,hitCd:0, xp:eT.xp, attacked:false, buffs:[], dots:[]};
  if(opts.homeSiteId) e.homeSiteId = opts.homeSiteId;
  if(opts.spawnTargetSiteId) e.spawnTargetSiteId = opts.spawnTargetSiteId;
  if(opts.team) e.team = opts.team;
  // enforce knight cap per team: if this is flagged as a knight spawn, ensure we don't exceed MAX_KNIGHTS_PER_TEAM
  if(opts.knight){
    const team = opts.team || (opts.homeSiteId && state.sites.find(ss=>ss.id===opts.homeSiteId)?.owner);
    if(team){
      const currentKnights = state.enemies.filter(x=>x.team===team && x.knight).length;
      if(currentKnights >= MAX_KNIGHTS_PER_TEAM) return null;
    }
    e.knight = true;
  }
  else if(opts.homeSiteId){ const s=state.sites.find(ss=>ss.id===opts.homeSiteId); e.team = s?.owner ?? 'teamA'; }

  // global caps: block spawn if overall enemy count is excessive
  const totalEnemies = state.enemies.length;
  if(totalEnemies >= MAX_ENEMIES) return null;
  // enforce per-team defender cap for non-guard enemies
  const teamForCap = opts.team || (opts.homeSiteId && state.sites.find(ss=>ss.id===opts.homeSiteId)?.owner) || null;
  if(teamForCap && !e.guard && !e.knight){
    const currentDefenders = state.enemies.filter(x=>x.team===teamForCap && !x.guard).length;
    if(currentDefenders >= MAX_DEFENDERS_PER_TEAM) return null;
  }
  // pick a visual variant for this enemy (knights/bosses get matching look)
  const VARS = ['warrior','mage','knight','warden'];
  if(opts.variant) e.variant = opts.variant;
  else if(e.boss) e.variant = 'warden';
  else if(e.knight) e.variant = 'knight';
  else e.variant = VARS[randi(0, VARS.length-1)];
  // Set level FIRST, then apply class - applyClassToUnit scales based on level
  e.level = Math.max(1, level);
  applyClassToUnit(e, e.variant);
  ensureEntityId(state, e, { kind:'enemy', team: e.team || opts.team });
  npcInitAbilities(e, { state, source: 'spawnEnemy' });
  state.enemies.push(e);
  return e;
}

// --- Creatures (neutral wildlife) ---
const CREATURE_TYPES = [
  { key:'goblin',  name:'Goblin',  color:'#3d7a2d', r:11, hp:50,  speed:75,  dmg:7,  agro:90,  variant:'goblin' },
  { key:'wolf',    name:'Wolf',    color:'#888',    r:11, hp:55,  speed:95,  dmg:8,  agro:120, variant:'wolf' },
  { key:'bear',    name:'Bear',    color:'#8b5a35', r:16, hp:140, speed:65,  dmg:12, agro:110, variant:'bear' },
];

const CREATURE_NAMES = {
  goblin: ['Grok', 'Zag', 'Blurt', 'Snix', 'Kogg', 'Varg', 'Spitz', 'Norg'],
  wolf: ['Fang', 'Grey', 'Ember', 'Storm', 'Shadow', 'Swift', 'Howler', 'Snarl'],
  bear: ['Granite', 'Claw', 'Grizzly', 'Brutus', 'Forge', 'Oak', 'Thunder', 'Boulder'],
};

function spawnCreatures(state){
  const worldW = state.mapWidth || state.engine.canvas.width;
  const worldH = state.mapHeight || state.engine.canvas.height;
  
  // Spawn goblins and bears normally
  for(const ct of CREATURE_TYPES.filter(c => c.key !== 'wolf')){
    const count = ct.key === 'bear' ? 4 : 6;
    for(let i=0;i<count;i++){
      spawnCreatureAt(state, rand(40, worldW-40), rand(40, worldH-40), ct);
    }
  }
  
  // Spawn wolves in packs of 5
  const wolfType = CREATURE_TYPES.find(c => c.key === 'wolf');
  const numPacks = 3;
  for(let p=0;p<numPacks;p++){
    const packCenterX = rand(80, worldW-80);
    const packCenterY = rand(80, worldH-80);
    for(let w=0;w<5;w++){
      const angle = (w/5) * Math.PI * 2;
      const dist = 20 + Math.random() * 10;
      const x = packCenterX + Math.cos(angle) * dist;
      const y = packCenterY + Math.sin(angle) * dist;
      const wolf = spawnCreatureAt(state, x, y, wolfType);
      if(wolf) wolf.packId = p; // mark wolf as part of pack
    }
  }
}

function spawnCreatureAt(state, x, y, type){
  const names = CREATURE_NAMES[type.key] || [];
  const name = names[Math.floor(Math.random() * names.length)];
  
  // Level scaling: creatures match current zone level range ±1 for variety
  const currentZone = state.zoneConfig.zones[state.zoneConfig.currentZone - 1];
  let creatureLevel = 1;
  if (currentZone) {
    const zoneAvg = Math.floor((currentZone.minLevel + currentZone.maxLevel) / 2);
    creatureLevel = Math.max(1, zoneAvg + randi(-1, 1));
  }
  
  // Apply level scaling to creature stats (8% per level, same as player)
  const levelMult = 1 + (creatureLevel - 1) * 0.08;
  const scaledHp = Math.round(type.hp * levelMult);
  const scaledDmg = Math.round(type.dmg * levelMult);
  
  const creature = {
    x, y,
    r: type.r,
    level: creatureLevel,  // Add level property
    maxHp: scaledHp,       // Scale HP by level
    hp: scaledHp,
    speed: type.speed,
    contactDmg: scaledDmg,  // Scale damage by level
    color: type.color,
    key: type.key,
    variant: type.variant,
    name: name,
    agro_range: type.agro,
    attacked: false,
    hitCd: 0,
    wander: { t: rand(0.5, 2.0), ang: Math.random() * Math.PI * 2 },
    target: null,
    pack_id: undefined
  };
  state.creatures.push(creature);
  return creature;
}

function spawnBossCreature(state){
  // ensure only one boss exists
  const existing = state.creatures.find(c=>c && c.boss);
  if(existing) return;
  const worldW = state.mapWidth || state.engine.canvas.width;
  const worldH = state.mapHeight || state.engine.canvas.height;
  const x = rand(80, worldW-80);
  const y = rand(80, worldH-80);
  
  // Boss level: player level + 5 for challenge
  const playerLevel = state.progression?.level || 1;
  const bossLevel = playerLevel + 5;
  const levelMult = 1 + (bossLevel - 1) * 0.08;
  const bossHp = Math.round(520 * levelMult);
  const bossDmg = Math.round(16 * levelMult);
  
  // Randomly select a boss icon
  const bossIconNames = ['archmage', 'balrogath', 'bloodfang', 'gorothar', 'malakir', 'tarrasque', 'venomQueen', 'vorrak', 'zalthor'];
  const randomIcon = bossIconNames[Math.floor(Math.random() * bossIconNames.length)];
  
  state.creatures.push({ 
    x, y, 
    r: 24, 
    level: bossLevel,
    maxHp: bossHp, 
    hp: bossHp, 
    speed: 72, 
    contactDmg: bossDmg, 
    color: cssVar('--legend'), 
    key:'boss', 
    name: 'World Boss',
    boss:true, 
    bossIcon: randomIcon,
    attacked:false, 
    hitCd: 0, 
    wander:{ t: rand(0.5,1.6), ang: Math.random()*Math.PI*2 }, 
    target:null 
  });
}

function killCreature(state, index){
  const c = state.creatures[index];
  if(!c) return;
  // boss always drops a legendary; normal creatures have a standard loot chance
  if(c.boss){
    const item = makeLegendaryItem(state);
    state.loot.push(makeLootDrop(c.x, c.y, item));
    // schedule respawn after 5 minutes
    state.bossRespawnT = 5 * 60;
  } else {
    if(Math.random() < 0.45) state.loot.push(spawnLootAt(state, c.x, c.y));
    else state.player.gold += randi(1,3);
  }
  state.creatures.splice(index,1);
}

function applyDamageToCreature(c, dmg, state){
  const hpBefore = c.hp;
  c.hp -= dmg;
  c.hp = Math.max(0, c.hp); // Clamp to 0 minimum
  c.attacked = true;
  
  // Track damage received by creature
  c._damageReceived = (c._damageReceived || 0) + dmg;
  
  // Log creature damage for debugging (2% sample rate)
  if(state?.debugLog && Math.random() < 0.02){
    state.debugLog.push({
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'CREATURE_DAMAGE',
      creature: c.key || 'unknown',
      boss: c.boss || false,
      damage: dmg.toFixed(1),
      hpBefore: hpBefore.toFixed(1),
      hpAfter: c.hp.toFixed(1),
      willDie: c.hp <= 0
    });
  }
  
  if(c.hp <= 0) return true;
  return false;
}

function spawnEnemies(state, dt){
  // Disable continuous spawning; fighters now only respawn from the initial roster.
  return;
}

function nearestEnemyTo(state, x,y, range){
  let best=null, bestD=Infinity, idx=-1;
  for(let i=0;i<state.enemies.length;i++){
    const e=state.enemies[i];
    const d=Math.hypot(e.x-x,e.y-y);
    if(d<bestD){bestD=d; best=e; idx=i;}
  }
  if(!best || bestD>range) return {e:null, idx:-1, d:bestD};
  return {e:best, idx, d:bestD};
}

// Move an entity toward (tx,ty) while avoiding static obstacles (trees, mountains, walls)
// and nearby units. Uses simple angular sampling to find an unblocked heading.
function moveWithAvoidance(entity, tx, ty, state, dt, opts={}){
  const speed = (entity.speed||60);
  const wantX = tx, wantY = ty;
  let dx = wantX - entity.x, dy = wantY - entity.y;
  const dist = Math.hypot(dx,dy);
  if(dist < 1e-4) return;
  const maxMove = speed * dt * (opts.slowFactor||1);
  
  // desired angle
  const baseAng = Math.atan2(dy,dx);
  const tryAngles = [0,15, -15, 30, -30, 45, -45, 60, -60, 90, -90, 120, -120, 150, -150, 180].map(a=>baseAng + a*(Math.PI/180));
  const entityIsFriendly = state.friendlies.includes(entity);
  for(const ang of tryAngles){
    const step = Math.min(maxMove, dist);
    let mvx = Math.cos(ang)*step;
    let mvy = Math.sin(ang)*step;
    let nx = entity.x + mvx;
    let ny = entity.y + mvy;
    let blockedBy = null;
    // apply soft separation so friendlies don't stack while remaining non-blocking
    if(entityIsFriendly){
      let sepX = 0, sepY = 0;
      for(const f of state.friendlies){
        if(f===entity) continue;
        if(f.respawnT>0) continue;
        const d = Math.hypot(nx - f.x, ny - f.y);
        const desired = (entity.r + f.r + 10);
        if(d < desired && d > 1e-3){
          const push = (desired - d) / desired;
          sepX += (nx - f.x) / d * push;
          sepY += (ny - f.y) / d * push;
        }
      }
      // gently keep spacing from the player anchor as well
      const pd = Math.hypot(nx - state.player.x, ny - state.player.y);
      const desiredP = (entity.r + state.player.r + 12);
      if(pd < desiredP && pd > 1e-3){
        const push = (desiredP - pd) / desiredP;
        sepX += (nx - state.player.x) / pd * push;
        sepY += (ny - state.player.y) / pd * push;
      }
      const sepMag = Math.hypot(sepX, sepY);
      if(sepMag>0){
        const push = Math.min(step*0.45, 26*dt);
        nx += (sepX/sepMag) * push;
        ny += (sepY/sepMag) * push;
      }
    }
    // check collisions with trees, mountains, rocks (all use same overlap buffer as trees)
    // Allow fighters to pass through environment objects if stuck for too long (not making progress for 2 seconds)
    // But force collision back on after 4 seconds total to prevent permanent passthrough
    const ignoreEnvironment = (entity._stuckT || 0) > 2.0 && (entity._stuckT || 0) < 4.0;
    let blocked=false;
    if(!ignoreEnvironment){
      for(const t of state.trees||[]){ if(Math.hypot(nx - t.x, ny - t.y) <= (entity.r + t.r + 2)) { blocked=true; blockedBy = {x:t.x,y:t.y}; break; } }
    }
    if(blocked){
      // slide along obstacle tangent to avoid getting pinned
      if(blockedBy && !ignoreEnvironment){
        const dx = nx - blockedBy.x;
        const dy = ny - blockedBy.y;
        const len = Math.hypot(dx, dy) || 1;
        const tx1 = (-dy/len), ty1 = (dx/len);
        const tx2 = (dy/len), ty2 = (-dx/len);
        const slideStep = Math.max(6, Math.min(step*0.6, 30));
        const trySlide = (sx, sy)=>{
          const snx = entity.x + sx*slideStep;
          const sny = entity.y + sy*slideStep;
          let sBlocked=false;
          for(const t of state.trees||[]){ if(Math.hypot(snx - t.x, sny - t.y) <= (entity.r + t.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked) for(const mc of state.mountainCircles||[]){ if(Math.hypot(snx - mc.x, sny - mc.y) <= (entity.r + mc.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked) for(const rc of state.rockCircles||[]){ if(Math.hypot(snx - rc.x, sny - rc.y) <= (entity.r + rc.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked) for(const wc of state.waterCircles||[]){ if(Math.hypot(snx - wc.x, sny - wc.y) <= (entity.r + wc.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked) for(const dc of state.decorativeCircles||[]){ if(Math.hypot(snx - dc.x, sny - dc.y) <= (entity.r + dc.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked){
            // Check flag collision during slide
            for(const s of state.sites){
              if(s.id && s.id.startsWith('site_') && s.owner && s.health > 0){
                // Determine entity team
                let entityTeam;
                if(entity === state.player){
                  entityTeam = 'player';
                } else if(state.friendlies.includes(entity)){
                  entityTeam = 'player'; // Friendlies are on player's team
                } else {
                  entityTeam = entity.team || null;
                }
                if(entityTeam !== s.owner){
                  const dist = Math.hypot(snx - s.x, sny - s.y);
                  if(dist <= (entity.r + s.r + 2)){ sBlocked=true; break; }
                }
              }
            }
          }
          if(!sBlocked){
            for(const s of state.sites){
              if(!s.wall) continue;
              const halfW = s.wall.r;
              const isInsideX = snx >= s.x - halfW && snx <= s.x + halfW;
              const isInsideY = sny >= s.y - halfW && sny <= s.y + halfW;
              const wasInsideX = entity.x >= s.x - halfW && entity.x <= s.x + halfW;
              const wasInsideY = entity.y >= s.y - halfW && entity.y <= s.y + halfW;
              if((isInsideX && isInsideY) !== (wasInsideX && wasInsideY)){
                if(!siteAllowsPassage(s, entity, state)) { sBlocked=true; break; }
              }
            }
          }
          if(!sBlocked){ entity.x = snx; entity.y = sny; entity._stuckT = 0; return true; }
          return false;
        };
        if(trySlide(tx1, ty1) || trySlide(tx2, ty2)) continue;
      }
      continue;
    }
    if(!ignoreEnvironment){
      for(const mc of state.mountainCircles||[]){ if(Math.hypot(nx - mc.x, ny - mc.y) <= (entity.r + mc.r + 2)) { blocked=true; blockedBy = {x:mc.x,y:mc.y}; break; } }
      if(blocked) continue;
      for(const rc of state.rockCircles||[]){ if(Math.hypot(nx - rc.x, ny - rc.y) <= (entity.r + rc.r + 2)) { blocked=true; blockedBy = {x:rc.x,y:rc.y}; break; } }
      if(blocked) continue;
      for(const wc of state.waterCircles||[]){ if(Math.hypot(nx - wc.x, ny - wc.y) <= (entity.r + wc.r + 2)) { blocked=true; blockedBy = {x:wc.x,y:wc.y}; break; } }
      if(blocked) continue;
      for(const dc of state.decorativeCircles||[]){ if(Math.hypot(nx - dc.x, ny - dc.y) <= (entity.r + dc.r + 2)) { blocked=true; blockedBy = {x:dc.x,y:dc.y}; break; } }
      if(blocked) continue;
    }
    // captured flags with health act as collision obstacles for enemies
    for(const s of state.sites){
      if(s.id && s.id.startsWith('site_') && s.owner && s.health > 0){
        // Determine entity team
        let entityTeam;
        if(entity === state.player){
          entityTeam = 'player';
        } else if(state.friendlies.includes(entity)){
          entityTeam = 'player'; // Friendlies are on player's team
        } else {
          entityTeam = entity.team || null;
        }
        // Only block if entity is not on the same team as flag owner
        if(entityTeam !== s.owner){
          const dist = Math.hypot(nx - s.x, ny - s.y);
          if(dist <= (entity.r + s.r + 2)){
            blocked = true;
            blockedBy = {x: s.x, y: s.y};
            break;
          }
        }
      }
    }
    if(blocked) continue;
    // walls: don't pass through other's walls unless allowed
    for(const s of state.sites){ 
      if(s.wall){ 
        const halfW = s.wall.r;
        // Check if trying to cross wall boundary
        const isInsideX = nx >= s.x - halfW && nx <= s.x + halfW;
        const isInsideY = ny >= s.y - halfW && ny <= s.y + halfW;
        const wasInsideX = entity.x >= s.x - halfW && entity.x <= s.x + halfW;
        const wasInsideY = entity.y >= s.y - halfW && entity.y <= s.y + halfW;
        
        // Block movement if trying to cross boundary without permission
        if((isInsideX && isInsideY) !== (wasInsideX && wasInsideY)) {
          if(!siteAllowsPassage(s, entity, state)) { blocked=true; blockedBy = {x:s.x,y:s.y}; break; }
        }
      } 
    }
    if(blocked) continue;
    // separation: avoid getting too close to other moving units
    for(const e of state.enemies){ if(e===entity) continue; if(Math.hypot(nx - e.x, ny - e.y) <= (entity.r + e.r + 6)) { blocked=true; break; } }
    if(blocked) continue;
    for(const f of state.friendlies){
      if(f===entity) continue;
      if(f.respawnT>0) continue;
      // Allow friendly units to overlap with each other (no collision blocking)
      if(entityIsFriendly) continue;
      if(Math.hypot(nx - f.x, ny - f.y) <= (entity.r + f.r + 6)) { blocked=true; break; }
    }
    if(blocked) continue;
    // ok to move - check if making progress toward goal
    const oldX = entity.x, oldY = entity.y;
    entity.x = nx; entity.y = ny;
    
    // Track distance to goal - if making ANY progress, reset stuck timer
    const newDist = Math.hypot(wantX - nx, wantY - ny);
    const prevDist = entity._lastDistToGoal;
    entity._lastDistToGoal = newDist;
    
    // Reset stuck timer if: making progress OR in combat (hitCd active) OR very close to goal
    const inCombat = entity.hitCd && entity.hitCd > 0;
    const atGoal = newDist < 20;
    
    if(inCombat || atGoal || (prevDist !== undefined && newDist < prevDist - 0.1)){
      entity._stuckT = 0; // Making progress or legitimately stopped
    } else if(prevDist !== undefined){
      entity._stuckT = (entity._stuckT || 0) + dt; // Not making progress and not fighting
      // Force reset after 4 seconds to prevent permanent passthrough
      if(entity._stuckT > 4.0){
        entity._stuckT = 0;
      }
    }
    return;
  }
  // all sampled angles blocked: apply small jitter nudge after short stuck time to escape corners/trees
  entity._stuckT = (entity._stuckT||0) + dt;
  if(entity._stuckT > 0.25){
    const jitterAng = baseAng + (Math.random()>0.5?1:-1)*(Math.PI*0.65 + Math.random()*0.55);
    const mv = Math.min(maxMove*0.75 + 10, 42*dt + 8);
    const nx = entity.x + Math.cos(jitterAng)*mv;
    const ny = entity.y + Math.sin(jitterAng)*mv;
    let blocked=false;
    // If stuck for >2s, ignore environment collision to escape (but auto-revert after 4s total)
    const ignoreEnvironment = entity._stuckT > 2.0 && entity._stuckT < 4.0;
    if(!ignoreEnvironment){
      for(const t of state.trees||[]){ if(Math.hypot(nx - t.x, ny - t.y) <= (entity.r + t.r + 2)) { blocked=true; break; } }
      if(!blocked) for(const mc of state.mountainCircles||[]){ if(Math.hypot(nx - mc.x, ny - mc.y) <= (entity.r + mc.r + 2)) { blocked=true; break; } }
      if(!blocked) for(const rc of state.rockCircles||[]){ if(Math.hypot(nx - rc.x, ny - rc.y) <= (entity.r + rc.r + 2)) { blocked=true; break; } }
      if(!blocked) for(const wc of state.waterCircles||[]){ if(Math.hypot(nx - wc.x, ny - wc.y) <= (entity.r + wc.r + 2)) { blocked=true; break; } }
      if(!blocked) for(const dc of state.decorativeCircles||[]){ if(Math.hypot(nx - dc.x, ny - dc.y) <= (entity.r + dc.r + 2)) { blocked=true; break; } }
    }
    if(!blocked){
      // Check flag collision during jitter
      for(const s of state.sites){
        if(s.id && s.id.startsWith('site_') && s.owner && s.health > 0){
          const entityTeam = entity === state.player ? 'player' : (entity.team || null);
          if(entityTeam !== s.owner){
            const dist = Math.hypot(nx - s.x, ny - s.y);
            if(dist <= (entity.r + s.r + 2)){ blocked=true; break; }
          }
        }
      }
    }
    if(!blocked){
      for(const s of state.sites){
        if(!s.wall) continue;
        const halfW = s.wall.r;
        const isInsideX = nx >= s.x - halfW && nx <= s.x + halfW;
        const isInsideY = ny >= s.y - halfW && ny <= s.y + halfW;
        const wasInsideX = entity.x >= s.x - halfW && entity.x <= s.x + halfW;
        const wasInsideY = entity.y >= s.y - halfW && entity.y <= s.y + halfW;
        if((isInsideX && isInsideY) !== (wasInsideX && wasInsideY)){
          if(!siteAllowsPassage(s, entity, state)) { blocked=true; break; }
        }
      }
    }
    if(!blocked){ entity.x = nx; entity.y = ny; entity._stuckT = 0; }
  }
  // otherwise stay put (prevents tunneling through rocks/mountains)
  return;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED ROLE-BASED AI DECISION SYSTEM
// Used by both friendlies and enemies for consistent behavior
// ═══════════════════════════════════════════════════════════════════════════════
function getRoleBasedDecision(unit, state, near, nearCreature, nearCreatureD, closestObjective, wallTarget, role, AGGRO_RANGE){
  let tx = null, ty = null, decision = 'idle', targetInfo = '';
  
  if(role === 'TANK'){
    // TANK PRIORITY: Move to objectives > Attack walls in range > Attack nearby enemies
    
    // EXCEPTION: Attack walls when in range (highest priority)
    if(wallTarget){
      const distToWall = Math.hypot(unit.x - wallTarget.x, unit.y - wallTarget.y);
      if(distToWall <= 150){
        tx = wallTarget.x;
        ty = wallTarget.y;
        decision = 'attack_wall';
        targetInfo = `${wallTarget.site.name || wallTarget.site.id} wall`;
      }
    }
    
    // Move to closest objective when not attacking walls
    if(decision === 'idle' && closestObjective){
      tx = closestObjective.x;
      ty = closestObjective.y;
      decision = 'capture_objective';
      targetInfo = closestObjective.name || closestObjective.id;
    }
    
    // Fallback: Attack nearby enemies
    if(decision === 'idle' && near.e && near.d <= AGGRO_RANGE * 0.8){
      tx = near.e.x;
      ty = near.e.y;
      decision = 'attack_enemy';
      targetInfo = `${near.e.name || near.e.variant} (defensive)`;
    }
  }
  else if(role === 'DPS'){
    // DPS PRIORITY: Enemies > Creatures > Objectives
    // HYSTERESIS: Sticky zones prevent rapid decision flipping
    
    const currentlyAttacking = (unit._lastDecision === 'attack_enemy');
    const aggroThreshold = currentlyAttacking ? AGGRO_RANGE * 1.15 : AGGRO_RANGE * 0.85;
    
    if(near.e && near.d <= aggroThreshold){
      tx = near.e.x;
      ty = near.e.y;
      decision = 'attack_enemy';
      targetInfo = near.e.name || near.e.variant || 'Unknown';
    } else if(nearCreature && nearCreatureD <= AGGRO_RANGE){
      tx = nearCreature.x;
      ty = nearCreature.y;
      decision = 'attack_creature';
      targetInfo = 'Creature';
    } else if(wallTarget){
      tx = wallTarget.x;
      ty = wallTarget.y;
      decision = 'attack_objective';
      targetInfo = wallTarget.site.name || wallTarget.site.id;
    } else if(closestObjective){
      tx = closestObjective.x;
      ty = closestObjective.y;
      decision = 'capture_objective';
      targetInfo = closestObjective.name || closestObjective.id;
    }
  }
  else if(role === 'HEALER'){
    // HEALER PRIORITY: Stay near allies (cached position to reduce recalculation)
    
    // Cache cluster center calculation (only recalc every 1 second)
    const now = state.campaign?.time || 0;
    if(!unit._clusterCacheTime || now - unit._clusterCacheTime > 1.0){
      let allyX = 0, allyY = 0, allyCount = 0;
      
      // Get allies based on unit type (friendly vs enemy)
      const isFriendly = state.friendlies.includes(unit);
      const allies = isFriendly ? state.friendlies : state.enemies;
      const player = isFriendly ? state.player : null;
      
      for(const f of allies){
        if(f === unit) continue;
        if(isFriendly && f.respawnT > 0) continue;
        if(!isFriendly && (f.dead || f.hp <= 0)) continue;
        allyX += f.x;
        allyY += f.y;
        allyCount++;
      }
      
      if(player && !player.dead){
        allyX += player.x;
        allyY += player.y;
        allyCount++;
      }
      
      if(allyCount > 0){
        allyX /= allyCount;
        allyY /= allyCount;
        
        // Add jitter to prevent stacking
        const healerID = unit.id || unit._id || 0;
        const jitterAngle = (healerID * 2.4) % (Math.PI * 2);
        const jitterDist = 25 + (healerID % 20);
        unit._cachedClusterX = allyX + Math.cos(jitterAngle) * jitterDist;
        unit._cachedClusterY = allyY + Math.sin(jitterAngle) * jitterDist;
        unit._cachedAllyCount = allyCount;
      } else {
        unit._cachedClusterX = null;
        unit._cachedAllyCount = 0;
      }
      unit._clusterCacheTime = now;
    }
    
    // Use cached cluster position
    if(unit._cachedClusterX !== null && unit._cachedClusterX !== undefined){
      const distToCluster = Math.hypot(unit.x - unit._cachedClusterX, unit.y - unit._cachedClusterY);
      
      // HYSTERESIS: Different thresholds for moving vs staying
      const isCurrentlyMoving = (unit._lastDecision === 'support_allies');
      const moveThreshold = isCurrentlyMoving ? 120 : 160;
      
      if(distToCluster > moveThreshold){
        tx = unit._cachedClusterX;
        ty = unit._cachedClusterY;
        decision = 'support_allies';
        targetInfo = `Allied cluster (${unit._cachedAllyCount} units)`;
      } else if(near.e && near.d <= AGGRO_RANGE * 0.6 && distToCluster <= 100){
        // Only attack when very safe and very close to allies
        tx = near.e.x;
        ty = near.e.y;
        decision = 'attack_enemy';
        targetInfo = `${near.e.name || near.e.variant} (safe)`;
      } else if(closestObjective && !near.e){
        tx = closestObjective.x;
        ty = closestObjective.y;
        decision = 'capture_objective';
        targetInfo = closestObjective.name || closestObjective.id;
      } else {
        // Stay in position
        tx = unit._cachedClusterX;
        ty = unit._cachedClusterY;
        decision = 'support_allies';
        targetInfo = 'Maintaining position';
      }
    } else {
      // No allies - move to objective cautiously
      if(closestObjective){
        tx = closestObjective.x;
        ty = closestObjective.y;
        decision = 'capture_objective';
        targetInfo = closestObjective.name || closestObjective.id;
      }
    }
  }
  
  return {tx, ty, decision, targetInfo};
}

function spawnFriendlyAt(state, site, forceVariant=null){
  // Safety check: Ensure site has valid coordinates
  if(!site || site.x === undefined || site.y === undefined){
    console.error('[SPAWN ERROR] Cannot spawn friendly - invalid site:', site);
    return null;
  }
  
  const VARS = ['warrior','mage','knight','warden'];
  const v = forceVariant || VARS[randi(0, VARS.length-1)];
  const nameOptions = { warrior: 'Warrior', mage: 'Mage', knight: 'Knight', warden: 'Warden' };
  
  // Get player level for ally scaling
  const playerLevel = state.progression?.level || 1;
  
  const f = {
    id: `f_${Date.now()}_${randi(0, 99999)}`, // Unique ID for group tracking
    name: `${nameOptions[v]} ${randi(1, 999)}`, // Generate a name like "Warrior 42"
    x: site.x + rand(-28,28),
    y: site.y + rand(-28,28),
    r: 12,
    hp: 55,
    maxHp: 55,
    speed: 110,
    dmg: 8,
    hitCd: 0,
    // DON'T set siteId for regular allies - they should always seek objectives
    // Only guards/garrison should have site association
    respawnT: 0,
    variant: v,
    role: (v==='mage' ? 'HEALER' : (v==='warden' || v==='knight' ? 'TANK' : 'DPS')),
    behavior: 'neutral', // default behavior for all friendlies
    buffs: [],
    dots: [],
    level: playerLevel // Allies match player level
  };

  // Ensure stable _id exists for logs/AI targeting
  ensureEntityId(state, f, { kind:'friendly', team: 'player' });
  
  // Get class modifiers for ally scaling
  const classModifiers = {
    hp: v==='mage' ? 0.9 : v==='warrior' ? 1.15 : v==='knight' ? 1.45 : v==='warden' ? 1.85 : 1.0,
    dmg: v==='mage' ? 0.95 : v==='warrior' ? 1.10 : v==='knight' ? 1.0 : v==='warden' ? 0.85 : 1.0,
    speed: v==='mage' ? 1.06 : v==='warrior' ? 1.0 : v==='knight' ? 0.86 : v==='warden' ? 0.72 : 1.0
  };
  
  // Apply MMO-style ally scaling based on player level
  const scaledStats = scaleAllyToPlayerLevel(
    { maxHp: 55, contactDmg: 8, speed: 110 },
    playerLevel,
    classModifiers
  );
  
  f.maxHp = scaledStats.maxHp;
  f.hp = f.maxHp;
  f.speed = scaledStats.speed;
  f.dmg = scaledStats.contactDmg;
  f.contactDmg = scaledStats.contactDmg;
  
  npcInitAbilities(f, { state, source: 'spawnFriendly' });
  state.friendlies.push(f);
  
  // Log friendly spawn
  if(state.debugLog){
    state.debugLog.push({
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'FRIENDLY_SPAWN',
      variant: v,
      site: site.name || site.id || 'unknown',
      hp: f.maxHp,
      damage: f.dmg,
      level: playerLevel
    });
  }
  
  return f;
}

function ensureBaseFriendlies(state, opts={}){
  const home = playerHome(state);
  if(!home || home.owner!=='player') return;
  const desired = 10; // fixed roster cap (non-guards)
  const alive = state.friendlies.filter(a=>a.siteId===home.id && a.respawnT<=0 && !a.guard).length;
  const pending = (home.guardRespawns && home.guardRespawns.length) ? home.guardRespawns.length : 0;
  const need = Math.max(0, desired - alive - pending);
  if(opts.initial && need>0){
    // Ensure variety: spawn at least one healer mage
    spawnFriendlyAt(state, home, 'mage');
    // Spawn remaining with variety
    const roles = ['warrior','knight','warden','mage'];
    for(let i=1;i<need;i++){
      const role = roles[i % roles.length];
      spawnFriendlyAt(state, home, role);
    }
  } else {
    for(let i=0;i<need;i++) spawnFriendlyAt(state, home);
  }
}

function seedTeamForces(state, team, count){
  const home = getHomeForTeam(state, team);
  if(!home) return;
  for(let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2;
    const dist = rand(32, 110);
    spawnEnemyAt(state, home.x + Math.cos(ang)*dist, home.y + Math.sin(ang)*dist, state.campaign.time, { homeSiteId: home.id, team });
  }
}

function updateFriendlySpawns(state, dt){
  // Disabled automatic spawning; roster is fixed and only respawns.
  return;
}

function updateFriendlies(state, dt){
  const DEBUG_AI = false; // Set to true to enable AI debug logging
  for(let i=state.friendlies.length-1;i>=0;i--){
    const a=state.friendlies[i];
    if(a.respawnT>0){
      a.respawnT-=dt;
      const flag=state.sites.find(s=>s.id===a.siteId);
      if(a.respawnT<=0){
        // Determine respawn location based on garrison assignment or normal flag
        let respawnSite = null;
        if(a.garrisonSiteId){
          // Garrisoned - respawn at garrison location if still player-owned
          respawnSite = state.sites.find(s => s.id === a.garrisonSiteId && s.owner === 'player');
          if(!respawnSite){
            // Garrison site lost, clear assignment and use normal respawn
            delete a.garrisonSiteId;
          }
        }
        
        // If no garrison or garrison lost, use normal flag respawn
        if(!respawnSite){
          respawnSite = flag && flag.owner === 'player' ? flag : null;
        }
        
        // Final fallback: respawn at home base if no player-owned flags available
        if(!respawnSite){
          const homeBase = state.sites.find(s => s.name === 'Home Base' || s.id === 'site_0');
          if(homeBase){
            respawnSite = homeBase;
          }
        }
        
        if(respawnSite){
          // Safety check: Ensure respawn site has valid coordinates
          if(respawnSite.x === undefined || respawnSite.y === undefined){
            console.error('[RESPAWN ERROR] Respawn site has invalid coordinates:', respawnSite);
            state.friendlies.splice(i,1); // Remove unit if can't respawn
            continue;
          }
          
          a.hp=a.maxHp;
          a.dead=false;
          a.siteId = respawnSite.id; // Update siteId to respawn location
          
          // if site defines fixed guard positions, respawn into an available fixed slot
          if(respawnSite._guardPositions && a.guard){
            // find an unoccupied position
            let pos=null;
            for(const p of respawnSite._guardPositions){
              const occ = state.friendlies.find(f=>f.siteId===respawnSite.id && f.respawnT<=0 && Math.hypot(f.x-p.x,f.y-p.y)<=8);
              if(!occ){ pos=p; break; }
            }
            if(!pos) pos = respawnSite._guardPositions[0];
            a._spawnX = pos.x; a._spawnY = pos.y; a.x = pos.x; a.y = pos.y;
          } else {
            a.x = respawnSite.x + rand(-28,28);
            a.y = respawnSite.y + rand(-28,28);
          }
          
          // Notify respawn for all allies, showing location
          const isGroupMember = state.group && state.group.members && state.group.members.includes(a.id);
          const allyType = a.guard ? 'Guard' : (isGroupMember ? 'Group Member' : 'Ally');
          console.log(`[${allyType.toUpperCase()}] ${a.name} respawned at ${respawnSite.name}`);
          state.ui?.toast(`✅ <b>${a.name}</b> respawned at <b>${respawnSite.name}</b>.`);
        } else {
          state.friendlies.splice(i,1);
        }
      }
      continue;
    }
    a.hitCd=Math.max(0,a.hitCd-dt);
    const manaRegen = a.manaRegen ?? Math.max(4, (a.maxMana||60)*0.10);
    a.mana = clamp((a.mana||0) + manaRegen*dt, 0, a.maxMana||60);
    const flag=state.sites.find(s=>s.id===a.siteId);
    
    // Check if this is a group member (should follow player)
    const isGroupMember = state.group && state.group.members && state.group.members.includes(a.id);
    const groupSettings = isGroupMember ? state.group.settings[a.id] : null;
    
    const near=nearestEnemyTo(state, a.x,a.y, 240);
    // consider hostile creatures that are attacking us or allies
    let nearCreature=null, nearCreatureD=Infinity;
    for(const c of state.creatures){
      // Skip creatures that don't match current context
      if(state.inDungeon){
        if(c.dungeonId !== state.inDungeon) continue;
      } else {
        if(c.dungeonId) continue;
      }
      if(!c.attacked) continue;
      const isHostile = c.target===state.player || state.friendlies.includes(c.target) || c.target===a;
      if(!isHostile) continue;
      const d = Math.hypot(c.x - a.x, c.y - a.y);
      if(d < nearCreatureD){ nearCreatureD=d; nearCreature=c; }
    }
    let tx=a.x, ty=a.y;
    
    if(isGroupMember){
      // PRIORITY OVERRIDE: If garrisoned, skip normal group behavior and defend flag
      if(a.garrisonSiteId){
        const garrisonSite = state.sites.find(s => s.id === a.garrisonSiteId);
        if(!garrisonSite || garrisonSite.owner !== 'player'){
          delete a.garrisonSiteId;
        } else {
          // Use garrison defense logic (same as non-group garrison members)
          if(!a._garrisonX || !a._garrisonY){
            const garrisonedUnits = state.friendlies.filter(f => f.garrisonSiteId === a.garrisonSiteId);
            const unitsWithSlots = garrisonedUnits.filter(f => f._garrisonSlot !== undefined);
            if(a._garrisonSlot === undefined){
              const usedSlots = new Set(unitsWithSlots.map(f => f._garrisonSlot));
              let slot = 0;
              while(usedSlots.has(slot)) slot++;
              a._garrisonSlot = slot;
            }
            const totalSlots = Math.max(garrisonedUnits.length, 8);
            const angle = (a._garrisonSlot / totalSlots) * Math.PI * 2;
            const spreadRadius = 70;
            a._garrisonX = garrisonSite.x + Math.cos(angle) * spreadRadius;
            a._garrisonY = garrisonSite.y + Math.sin(angle) * spreadRadius;
          }
          const GARRISON_DEFEND_RADIUS = 150;
          const GARRISON_LEASH_RADIUS = 180;
          const distToPost = Math.hypot(a.x - a._garrisonX, a.y - a._garrisonY);
          if(near.e && near.d <= GARRISON_DEFEND_RADIUS){
            const enemyDistToPost = Math.hypot(near.e.x - a._garrisonX, near.e.y - a._garrisonY);
            if(enemyDistToPost <= GARRISON_LEASH_RADIUS && distToPost < GARRISON_LEASH_RADIUS){
              a.speed = 120;
              tx = near.e.x;
              ty = near.e.y;
            } else {
              a.speed = 110;
              tx = a._garrisonX;
              ty = a._garrisonY;
            }
          } else if(distToPost > 8){
            a.speed = 100;
            tx = a._garrisonX;
            ty = a._garrisonY;
          } else {
            a.speed = 0;
          }
          // Garrison logic complete - tx, ty, speed are set for movement below
        } // close else block
      } // close if(a.garrisonSiteId)
      
      // Normal group behavior (only if NOT garrisoned)
      if(!a.garrisonSiteId){
        ensurePartyState(state);
        const party = state.party;
        const bb = party.blackboard;
        const macro = party.macroState;
        const memberIndex = state.group.members.indexOf(a.id);
        const totalMembers = state.group.members.length;
        const angle = (memberIndex / Math.max(1, totalMembers)) * Math.PI * 2;
        const spread = bb.spreadRadius + (memberIndex % 3) * 10;
        const anchorX = bb.stackPoint.x;
        const anchorY = bb.stackPoint.y;
        const desiredX = anchorX + Math.cos(angle) * spread;
        const desiredY = anchorY + Math.sin(angle) * spread;
        const distAnchor = Math.hypot(a.x - anchorX, a.y - anchorY);
        const leash = bb.leashRadius || 210;
        const behavior = groupSettings?.behavior || 'group';
        // Determine role (from settings, unit, or variant)
        let role = (groupSettings && groupSettings.role) || a.role || (a.variant==='mage' ? 'HEALER' : (a.variant==='warden'||a.variant==='knight' ? 'TANK' : 'DPS'));
        if(typeof role === 'string') role = role.toUpperCase();
        const now = state.campaign.time || 0;

      // Target selection with short hysteresis
      let target = null;
      if(a._lockUntil && a._lockUntil > now){
        target = state.enemies.find(e => (e.id||e._id) === a._lockId && !e.dead && e.hp>0) || null;
      }
      if(!target && bb.chaseAllowed){
        if(bb.focusTargetId){
          target = state.enemies.find(e => (e.id||e._id) === bb.focusTargetId && !e.dead && e.hp>0) || null;
        }
        const aggroRange = behavior === 'aggressive' ? 190 : 130;
        if(!target && near.e && near.d <= aggroRange){
          target = near.e;
        }
        if(!target && nearCreature && nearCreatureD <= aggroRange){
          target = nearCreature;
        }
      }
      if(target){
        a._lockId = target.id || target._id || null;
        a._lockUntil = now + 1.5;
      } else if(a._lockUntil && a._lockUntil <= now){
        a._lockId = null;
      }

      // Role-specific target prioritization
      let roleTarget = target;
      if(role === 'WARDEN'){
        // Warden: Prioritize nearby outposts to destroy FIRST, then in-range enemies
        let nearbyOutpost = null, bestOutpostDist = Infinity;
        const OUTPOST_RANGE = 200;
        for(const s of state.sites){
          if(!s.id || !s.id.startsWith('site_')) continue;
          if(s.owner === 'player' || !s.owner) continue;
          const distToOutpost = Math.hypot(s.x - a.x, s.y - a.y);
          if(distToOutpost <= OUTPOST_RANGE && distToOutpost < bestOutpostDist){
            bestOutpostDist = distToOutpost;
            nearbyOutpost = s;
          }
        }
        // If there's a nearby outpost with health, prioritize it over enemies
        if(nearbyOutpost && nearbyOutpost.health && nearbyOutpost.health > 0){
          roleTarget = null; // Will target outpost in movement logic below
        }
      } else if(role === 'HEALER'){
        // Healer: Focus on healing group, only light attacks to in-range targets AFTER healing
        // Don't chase distant targets - use ability system instead
        if(target && Math.hypot(target.x - anchorX, target.y - anchorY) > 150){
          roleTarget = null; // Too far, stay with group to heal
        }
      } else if(role === 'FIGHTER'){
        // Fighter: Only attack in-range threats, no chasing beyond range
        if(target && Math.hypot(target.x - a.x, target.y - a.y) > 130){
          roleTarget = null; // Target too far, don't chase
        }
      }
      // DPS will attack any in-range target, then outposts - no special logic needed here

      // Healer stays anchored: reduce leash; Tank can step forward; DPS follows macro
      const roleLeash = role==='HEALER' ? Math.min(leash, 180) : (role==='TANK' ? leash+30 : leash);
      const chaseAllowed = (role==='HEALER' ? false : bb.chaseAllowed) && distAnchor <= roleLeash * 1.35;
      const macroStack = macro === 'stack' || !chaseAllowed;

      // HARDCODED PRIORITY #1: ALWAYS follow the player in formation unless far outside leash
      if(distAnchor > roleLeash * 1.1){
        // Way too far from player - ALWAYS come back, ignore everything else
        tx = anchorX; ty = anchorY;
        a.speed = distAnchor > roleLeash * 1.5 ? 165 : 140;
      } else if(macroStack || !roleTarget){
        // If very far from leader, ignore formation and go straight to leader to catch up
        if(distAnchor > roleLeash * 0.9){
          tx = anchorX; ty = anchorY;
          a.speed = distAnchor > roleLeash * 1.2 ? 165 : 135;
        } else {
          // Role-based formation offsets: Tank slightly ahead, Healer slightly inside WITH SPREAD
          let offX=0, offY=0;
          const focus = bb.focusTargetId ? state.enemies.find(e => (e.id||e._id)===bb.focusTargetId && !e.dead && e.hp>0) : null;
          const faceAng = focus ? Math.atan2(focus.y - anchorY, focus.x - anchorX) : 0;
          if(role==='TANK'){ offX += Math.cos(faceAng) * 22; offY += Math.sin(faceAng) * 22; }
          if(role==='HEALER'){ 
            const toCenterX = anchorX - desiredX, toCenterY = anchorY - desiredY; 
            const len=Math.hypot(toCenterX,toCenterY)||1; 
            // Increased to 20 to prevent mages from stacking
            offX += (toCenterX/len)*20; 
            offY += (toCenterY/len)*20; 
          }
          tx = desiredX + offX; ty = desiredY + offY;
          const distDesired = Math.hypot(a.x - desiredX, a.y - desiredY);
          if(distDesired > 40) a.speed = 120;
          else if(distDesired > 12) a.speed = 80;
          else { a.speed = 40; }
        }
      } else {
        const distTargetAnchor = Math.hypot(roleTarget.x - anchorX, roleTarget.y - anchorY);
        const allowFarChase = macro === 'burst';
        if(!allowFarChase && distTargetAnchor > roleLeash * 1.4){
          tx = anchorX; ty = anchorY; a.speed = 140;
        } else {
          tx = roleTarget.x; ty = roleTarget.y;
          a.speed = distAnchor > roleLeash ? 135 : 120;
        }
      }

      // Tank peel: if healer is threatened nearby, override roleTarget to attacker
      if(role==='TANK'){
        const healer = state.friendlies.find(f=>f && f.respawnT<=0 && (state.group?.members||[]).includes(f.id) && (f.role==='HEALER' || f.variant==='mage'));
        if(healer){
          const attacker = state.enemies.find(e=>!e.dead && e.hp>0 && Math.hypot(e.x - healer.x, e.y - healer.y) <= 140);
          if(attacker){ roleTarget = attacker; }
        }
      }
      
      // Group outpost targeting: Only target outposts that are already in range (fallback when no enemies)
      if(!target && !macroStack){
        let nearbyOutpost = null, bestOutpostDist = Infinity;
        const OUTPOST_RANGE = 200; // Only consider outposts already close by
        for(const s of state.sites){
          if(!s.id || !s.id.startsWith('site_')) continue;
          if(s.owner === 'player' || !s.owner) continue; // Skip player/neutral flags
          const distToOutpost = Math.hypot(s.x - a.x, s.y - a.y);
          if(distToOutpost <= OUTPOST_RANGE && distToOutpost < bestOutpostDist){
            bestOutpostDist = distToOutpost;
            nearbyOutpost = s;
          }
        }
        if(nearbyOutpost){
          // Only attack if health is 0 (collision destroyed), otherwise maintain formation
          if(nearbyOutpost.health && nearbyOutpost.health > 0){
            // Still has collision - don't break formation to attack, stay in formation
            // tx/ty already set to formation position
          } else {
            // Collision destroyed - assist with capture
            tx = nearbyOutpost.x; ty = nearbyOutpost.y;
            a.speed = 100;
          }
        }
      }
      
      } // close if(!a.garrisonSiteId) - normal group behavior block
    } // close if(isGroupMember)
    else if(a.guard){
      // ═══════════════════════════════════════════════════════════════════════════════
      // STABLE GUARD BALL GROUP AI - Flag Defense with Formation Slots
      // ═══════════════════════════════════════════════════════════════════════════════
      
      const guardSite = a.homeSiteId ? state.sites.find(s => s.id === a.homeSiteId) : null;
      const spawnX = (a._spawnX !== undefined) ? a._spawnX : a.x;
      const spawnY = (a._spawnY !== undefined) ? a._spawnY : a.y;
      const now = state.campaign?.time || 0;
      
      // ─────────────────────────────────────────────────────────────────────────────
      // LOCKED DEFENSE GEOMETRY
      // ─────────────────────────────────────────────────────────────────────────────
      const FLAG_RADIUS = guardSite ? guardSite.r : 50;
      const DEFENSE_ENTER = FLAG_RADIUS + 100;  // 150 total
      const DEFENSE_EXIT = DEFENSE_ENTER + 30;  // 180 (hysteresis band)
      const AGGRO_RANGE = 280;  // Increased from 220 for more aggressive engagement
      const LEASH_RETREAT = 320; // Increased from 260 to chase deeper
      const LEASH_HARD_STOP = 350; // Increased from 280 for extended pursuit
      
      // ─────────────────────────────────────────────────────────────────────────────
      // COMMIT TIMERS (Prevent Thrashing)
      // ─────────────────────────────────────────────────────────────────────────────
      const TARGET_COMMIT = 1.5;
      const MOVEMENT_COMMIT = 1.0;
      const FORMATION_UPDATE = 0.75;
      const MACRO_TICK = 0.75;
      
      // Initialize guard state
      if(!a._guardState) a._guardState = 'IDLE_DEFENSE';
      if(!a._lastMacroTick) a._lastMacroTick = 0;
      if(!a._lastFormationUpdate) a._lastFormationUpdate = 0;
      if(!a._targetCommitUntil) a._targetCommitUntil = 0;
      if(!a._movementCommitUntil) a._movementCommitUntil = 0;
      if(!a._defenseActiveSince) a._defenseActiveSince = 0;
      if(!a._preFightBuffsTriggered) a._preFightBuffsTriggered = false;
      
      // ─────────────────────────────────────────────────────────────────────────────
      // FORMATION SLOT ASSIGNMENT (Stable, Anchor-Based)
      // ─────────────────────────────────────────────────────────────────────────────
      const allGuards = state.friendlies.filter(f =>
        f.guard && f.homeSiteId === a.homeSiteId && f.respawnT <= 0
      );
      if(!a._formationSlot || now - a._lastFormationUpdate >= FORMATION_UPDATE){
        // Assign slots based on guard index and role
        const dpsGuards = allGuards.filter(g => g.guardRole !== 'HEALER');
        const healerGuards = allGuards.filter(g => g.guardRole === 'HEALER');
        
        // Assign formation slots (relative to flag spawn) - TIGHTER for ball group cohesion
        if(a.guardRole === 'HEALER'){
          const healerIndex = healerGuards.indexOf(a);
          if(healerIndex === 0) a._formationSlot = { offsetX: -35, offsetY: -45 }; // Rear-left (tighter)
          else if(healerIndex === 1) a._formationSlot = { offsetX: 35, offsetY: -45 }; // Rear-right (tighter)
          else a._formationSlot = { offsetX: 0, offsetY: -45 }; // Rear-center fallback
        } else {
          const dpsIndex = dpsGuards.indexOf(a);
          if(dpsIndex === 0) a._formationSlot = { offsetX: 0, offsetY: 25 };    // Front-center (LEADER)
          else if(dpsIndex === 1) a._formationSlot = { offsetX: -30, offsetY: 15 }; // Front-left (tighter)
          else if(dpsIndex === 2) a._formationSlot = { offsetX: 30, offsetY: 15 };  // Front-right (tighter)
          else a._formationSlot = { offsetX: 0, offsetY: 0 }; // Center fallback
        }
        
        a._lastFormationUpdate = now;
      }
      
      // Calculate stable slot position (relative to flag spawn anchor)
      const slotX = spawnX + a._formationSlot.offsetX;
      const slotY = spawnY + a._formationSlot.offsetY;
      const distFromSlot = Math.hypot(a.x - slotX, a.y - slotY);
      const distFromSpawn = Math.hypot(a.x - spawnX, a.y - spawnY);

      // ─────────────────────────────────────────────────────────────────────────────
      // SHARED GUARD BALL STATE (LOG-ONLY STEP)
      // - Creates per-ball state
      // - Elects a leader
      // - Leader computes/logs focus target + focusPos (does NOT affect current AI yet)
      // ─────────────────────────────────────────────────────────────────────────────
      {
        const kind = 'friendly';
        const siteKey = a.guardFlagId || a.homeSiteId || a.siteId || (guardSite?.id || null) || 'unknown';
        const ballId = `${kind}:${siteKey}`;
        const ball = getOrCreateGuardBall(state, ballId, now);
        const leaderId = electGuardBallLeader(state, ball, kind, allGuards, now);
        const selfId = getStableUnitLogId(state, a, kind);

        // Only leader selects focus, throttled
        const FOCUS_TICK = 0.75;
        if(selfId && leaderId && selfId === leaderId && (!ball._lastFocusTickAt || (now - ball._lastFocusTickAt) >= FOCUS_TICK)){
          ball._lastFocusTickAt = now;

          const geo = { FLAG_RADIUS, DEFENSE_ENTER, LEASH_HARD_STOP };
          const current = ball.focusTargetId ? state.enemies.find(e => (e.id||e._id) === ball.focusTargetId && !e.dead && e.hp > 0) : null;
          const currentScore = current ? scoreGuardBallTarget(state, kind, guardSite, spawnX, spawnY, current, geo) : -Infinity;

          let best = null;
          let bestScore = -Infinity;
          for(const cand of state.enemies){
            if(!cand || cand.dead || cand.hp <= 0) continue;
            const s = scoreGuardBallTarget(state, kind, guardSite, spawnX, spawnY, cand, geo);
            if(s > bestScore){ bestScore = s; best = cand; }
          }

          const bestValid = !!best && bestScore !== -Infinity && Number.isFinite(bestScore);
          const currentValid = !!current && currentScore !== -Infinity && Number.isFinite(currentScore);

          // Step 3: burst/reset timers
          const BURST_LOCK = 2.25;   // seconds to commit to a focus target (prevents thrashing)
          const RESELECT_MIN = 0.60; // minimum time between target switches
          const RESET_GRACE = 1.00;  // seconds with no valid targets before clearing focus

          // If there are no valid targets in range/leash, arm a reset and eventually clear focus.
          if(!bestValid){
            if(ball.focusTargetId){
              if(!ball.resetUntil || ball.resetUntil <= 0){
                ball.resetUntil = now + RESET_GRACE;
                if(state.debugLog) logDebug(state, 'GUARD_BALL', 'Ball reset armed (no valid targets)', {
                  type:'GUARD_BALL_RESET_ARM',
                  ballId,
                  leaderId,
                  resetAt: +ball.resetUntil.toFixed(2)
                });
              } else if(now >= ball.resetUntil){
                if(state.debugLog) logDebug(state, 'GUARD_BALL', 'Ball focus reset (no valid targets)', {
                  type:'GUARD_BALL_RESET',
                  ballId,
                  leaderId,
                  prevFocusTargetId: ball.focusTargetId
                });
                ball.focusTargetId = null;
                ball.focusPos = null;
                ball.focusScore = null;
                ball.focusUntil = 0;
                ball.burstUntil = 0;
                ball.lastFocusPosAt = 0;
                ball.resetUntil = 0;
              }
            }
          } else {
            // Clear any pending reset once we have valid targets again
            ball.resetUntil = 0;

            const allowReselect = now >= (ball.focusUntil || 0);
            const burstLocked = currentValid && now < (ball.burstUntil || 0);
            const shouldSwitch = !currentValid || (!burstLocked && bestScore >= currentScore * 1.3);

            if(allowReselect && shouldSwitch){
              const prevId = ball.focusTargetId;
              {
                let id = best.id || best._id;
                if(id === undefined || id === null || String(id) === ''){
                  // Friendly guard balls focus enemies; ensure enemy has a stable id.
                  id = ensureEntityId(state, best, { team: 'enemy', kind: 'enemy' });
                }
                ball.focusTargetId = id;
              }
              ball.focusScore = bestScore;

              // short reselect gate + longer burst commit window
              ball.focusUntil = now + RESELECT_MIN;
              ball.burstUntil = now + BURST_LOCK;
              ball.lastBurstAt = now;

              ball.focusPos = { x: best.x, y: best.y };
              ball.lastFocusPosAt = now;

              if(state.debugLog) logDebug(state, 'GUARD_BALL', 'Ball focus target selected', {
                type:'GUARD_BALL_FOCUS',
                ballId,
                leaderId,
                focusTarget: best.name || best.variant || 'target',
                focusTargetId: ball.focusTargetId ?? null,
                prevFocusTargetId: prevId,
                score: +bestScore.toFixed(1),
                burstUntil: +ball.burstUntil.toFixed(2)
              });
            } else if(ball.focusTargetId && currentValid && (now - (ball.lastFocusPosAt||0) >= 0.4)){
              // Snapshot focusPos from the CURRENT focused target (not the best candidate)
              ball.focusPos = { x: current.x, y: current.y };
              ball.lastFocusPosAt = now;
            }
          }

          // Focus heartbeat: makes sure debug exports include focus info even when focus never changes.
          const HEARTBEAT_TICK = 3.0;
          if(state.debugLog && ball.focusTargetId && (!ball._lastFocusHeartbeatAt || (now - ball._lastFocusHeartbeatAt) >= HEARTBEAT_TICK)){
            ball._lastFocusHeartbeatAt = now;
            const fp = ball.focusPos;
            logDebug(state, 'GUARD_BALL', 'Ball focus heartbeat', {
              type:'GUARD_BALL_FOCUS_HEARTBEAT',
              ballId,
              leaderId,
              focusTargetId: ball.focusTargetId,
              x: fp && Number.isFinite(fp.x) ? +fp.x.toFixed(2) : null,
              y: fp && Number.isFinite(fp.y) ? +fp.y.toFixed(2) : null,
              score: Number.isFinite(ball.focusScore) ? +ball.focusScore.toFixed(1) : null
            });
          }
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────────────
      // TARGET SELECTION WITH COMMIT TIMER
      // ─────────────────────────────────────────────────────────────────────────────
      let priorityTarget = null, targetPriority = 0, targetDist = Infinity;
      
      // Check if we should commit to existing target
      if(a._committedTarget && now < a._targetCommitUntil){
        const committed = state.enemies.find(e => 
          (e.id || e._id) === a._committedTarget && !e.dead && e.hp > 0
        );
        if(committed){
          const distToCommitted = Math.hypot(committed.x - a.x, committed.y - a.y);
          const distCommittedFromSpawn = Math.hypot(committed.x - spawnX, committed.y - spawnY);
          
          // Only keep commitment if target is still in leash and reasonably close
          if(distCommittedFromSpawn <= LEASH_HARD_STOP && distToCommitted <= AGGRO_RANGE + 60){
            priorityTarget = committed;
            targetDist = distToCommitted;
            targetPriority = 100; // Override scoring, we're committed
          }
        }
      }
      
      // If no committed target or commitment expired, find new target
      if(!priorityTarget && now - a._lastMacroTick >= MACRO_TICK){
        a._lastMacroTick = now;
        
        for(const e of state.enemies){
          if(e.dead || e.hp <= 0) continue;
          const distToEnemy = Math.hypot(e.x - a.x, e.y - a.y);
          const distEnemyFromFlag = guardSite ? Math.hypot(e.x - guardSite.x, e.y - guardSite.y) : Infinity;
          const distEnemyFromSpawn = Math.hypot(e.x - spawnX, e.y - spawnY);
          
          // Skip if enemy beyond leash
          if(distEnemyFromSpawn > LEASH_HARD_STOP) continue;
          
          let priority = 0;
          // Zone-based priority scoring
          if(distEnemyFromFlag <= FLAG_RADIUS) priority = 100;           // Sacred ground
          else if(distEnemyFromFlag <= DEFENSE_ENTER) priority = 80;    // Defense zone
          else if(distToEnemy <= AGGRO_RANGE) priority = 60;             // Aggro range
          
          // Bonus for attacking guards
          if(e.attacked && e._hostTarget?.guard && e._hostTarget?.homeSiteId === a.homeSiteId){
            priority += 50;
          }
          
          // Select highest priority, closest if tied
          if(priority > targetPriority || (priority === targetPriority && distToEnemy < targetDist)){
            targetPriority = priority;
            targetDist = distToEnemy;
            priorityTarget = e;
          }
        }
        
        // Commit to new target and broadcast to squad for focus fire
        if(priorityTarget){
          a._committedTarget = priorityTarget.id || priorityTarget._id;
          a._targetCommitUntil = now + TARGET_COMMIT;
          
          // FOCUS FIRE: Broadcast primary target to all guards at this site
          if(guardSite){
            guardSite._sharedTarget = priorityTarget;
            guardSite._sharedTargetId = priorityTarget.id || priorityTarget._id;
            guardSite._sharedTargetUntil = now + TARGET_COMMIT;
          }
        }
      }
      
      // FOCUS FIRE: If no personal target, check if squad has shared target
      if(!priorityTarget && guardSite && guardSite._sharedTargetUntil > now){
        const sharedTarget = state.enemies.find(e => 
          (e.id || e._id) === guardSite._sharedTargetId && !e.dead && e.hp > 0
        );
        if(sharedTarget){
          const distToShared = Math.hypot(sharedTarget.x - a.x, sharedTarget.y - a.y);
          const distSharedFromSpawn = Math.hypot(sharedTarget.x - spawnX, sharedTarget.y - spawnY);
          
          // Join focus fire if target is in leash range
          if(distSharedFromSpawn <= LEASH_HARD_STOP){
            priorityTarget = sharedTarget;
            targetDist = distToShared;
            targetPriority = 90; // High priority for focus fire
          }
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────────────
      // GUARD STATE MACHINE (3 States Only)
      // ─────────────────────────────────────────────────────────────────────────────
      const hasDefenseThreat = priorityTarget && (
        targetPriority >= 80 || // Inside defense zone or flag radius
        (targetDist <= AGGRO_RANGE && targetPriority >= 60) // Changed from DEFENSE_ENTER to AGGRO_RANGE (220)
      );
      
      const shouldReturnToPost = distFromSpawn > LEASH_RETREAT || (
        a._guardState === 'RETURN_TO_POST' && distFromSlot > 25
      );
      
      // STATE TRANSITIONS
      if(a._guardState === 'IDLE_DEFENSE'){
        if(hasDefenseThreat){
          a._guardState = 'ACTIVE_DEFENSE';
          a._defenseActiveSince = now;
          a._preFightBuffsTriggered = false; // Reset buff trigger
        } else if(shouldReturnToPost){
          a._guardState = 'RETURN_TO_POST';
        }
      }
      else if(a._guardState === 'ACTIVE_DEFENSE'){
        // Exit to idle only if no threat for 0.75s (fast re-engagement)
        const noThreatDuration = hasDefenseThreat ? 0 : (now - a._defenseActiveSince);
        if(noThreatDuration >= 0.75 && !hasDefenseThreat){
          a._guardState = 'IDLE_DEFENSE';
        } else if(shouldReturnToPost){
          a._guardState = 'RETURN_TO_POST';
        }
      }
      else if(a._guardState === 'RETURN_TO_POST'){
        if(hasDefenseThreat && distFromSpawn <= LEASH_RETREAT){
          a._guardState = 'ACTIVE_DEFENSE';
          a._defenseActiveSince = now;
        } else if(distFromSlot <= 25 && !hasDefenseThreat){
          a._guardState = 'IDLE_DEFENSE';
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────────────
      // STATE EXECUTION
      // ─────────────────────────────────────────────────────────────────────────────
      
      if(a._guardState === 'ACTIVE_DEFENSE' && priorityTarget){
        // ═══ ACTIVE DEFENSE STATE ═══
        a.attacked = true;
        const isHealer = (a.guardRole === 'HEALER');
        
        // PRE-FIGHT BUFFS (Trigger at aggro range, once per engagement)
        if(!a._preFightBuffsTriggered && targetDist <= AGGRO_RANGE){
          // Mark as triggered for this engagement
          a._preFightBuffsTriggered = true;
          
          // Queue pre-fight shield abilities (healers trigger ward_barrier + radiant_aura)
          if(isHealer && a.npcAbilities && a.npcCd){
            const wardIdx = a.npcAbilities.indexOf('ward_barrier');
            const auraIdx = a.npcAbilities.indexOf('radiant_aura');
            if(wardIdx >= 0 && a.npcCd[wardIdx] === 0) a.npcCd[wardIdx] = 0.1; // Trigger ASAP
            if(auraIdx >= 0 && a.npcCd[auraIdx] === 0) a.npcCd[auraIdx] = 0.1;
          }
        }
        
        // ROLE-SPECIFIC COMBAT POSITIONING
        if(isHealer){
          // Healers: Maintain safe distance behind DPS line
          const HEALER_MIN_DIST = 110;
          const HEALER_MAX_DIST = 190;
          const HEALER_OPTIMAL = 140;
          
          if(targetDist < HEALER_MIN_DIST){
            // Too close - retreat toward slot position
            const angle = Math.atan2(a.y - priorityTarget.y, a.x - priorityTarget.x);
            tx = a.x + Math.cos(angle) * 60;
            ty = a.y + Math.sin(angle) * 60;
            a.speed = 90;
          } else if(targetDist > HEALER_MAX_DIST){
            // Too far - advance to maintain heal range
            tx = priorityTarget.x;
            ty = priorityTarget.y;
            a.speed = 75;
          } else {
            // Good range - stay at slot, minimal movement
            tx = slotX;
            ty = slotY;
            a.speed = 40;
          }
        } else {
          // DPS: Aggressive engagement but within leash
          const kiteUntil = (a._guardKiteUntil || 0);
          if(kiteUntil > now){
            // Hard post-burst kite window: stop chasing, buy time for mana + cooldown alignment.
            const retreatAngle = Math.atan2(a.y - priorityTarget.y, a.x - priorityTarget.x);
            if(targetDist < 110){
              tx = a.x + Math.cos(retreatAngle) * 90;
              ty = a.y + Math.sin(retreatAngle) * 90;
              a.speed = 145;
            } else {
              tx = slotX;
              ty = slotY;
              a.speed = (distFromSlot > 14) ? 130 : 55;
            }
          } else {
            a.speed = 130;
            tx = priorityTarget.x;
            ty = priorityTarget.y;
          }
        }
      }
      else if(a._guardState === 'RETURN_TO_POST'){
        // ═══ RETURN TO POST STATE ═══
        a.attacked = false;
        tx = slotX;
        ty = slotY;
        a.speed = 110;

        // Snap to slot when very close
        if(distFromSlot <= 8){
          a.x = slotX;
          a.y = slotY;
          a.speed = 0;
        }
      }
      else {
        // ═══ IDLE DEFENSE STATE ═══
        a.attacked = false;
        tx = slotX;
        ty = slotY;

        // Gentle drift toward slot
        if(distFromSlot > 10){
          a.speed = 30;
        } else {
          a.speed = 0;
          a.x = slotX;
          a.y = slotY;
        }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // MOVEMENT EXECUTION (match enemy guard behavior)
      // ─────────────────────────────────────────────────────────────────────────────
      const cc = getCcState(a);
      if(a.speed > 0){
        const slowFactor = (a.inWater ? 0.45 : 1.0) * ((cc.rooted||cc.stunned) ? 0 : Math.max(0, 1 + cc.speedMod));
        if(slowFactor>0) moveWithAvoidance(a, tx, ty, state, dt, { slowFactor });
      }
    } else {
      // non-guard friendlies: check for garrison assignment first
      if(a.garrisonSiteId){
        // Garrisoned friendly - defend assigned flag
        const garrisonSite = state.sites.find(s => s.id === a.garrisonSiteId);
        
        // If garrison site no longer exists or isn't player-owned, clear assignment
        if(!garrisonSite || garrisonSite.owner !== 'player'){
          delete a.garrisonSiteId;
        } else {
          // Initialize garrison position if not set (spread units around flag)
          if(!a._garrisonX || !a._garrisonY){
            // Get all garrisoned units at this site (including this one)
            const garrisonedUnits = state.friendlies.filter(f => f.garrisonSiteId === a.garrisonSiteId);
            
            // Assign slots if not already assigned
            const unitsWithSlots = garrisonedUnits.filter(f => f._garrisonSlot !== undefined);
            if(a._garrisonSlot === undefined){
              // Find first available slot
              const usedSlots = new Set(unitsWithSlots.map(f => f._garrisonSlot));
              let slot = 0;
              while(usedSlots.has(slot)) slot++;
              a._garrisonSlot = slot;
            }
            
            // Calculate position based on slot number
            const totalSlots = Math.max(garrisonedUnits.length, 8); // Support up to 8 positions
            const angle = (a._garrisonSlot / totalSlots) * Math.PI * 2;
            const spreadRadius = 70; // Fixed radius for consistency
            a._garrisonX = garrisonSite.x + Math.cos(angle) * spreadRadius;
            a._garrisonY = garrisonSite.y + Math.sin(angle) * spreadRadius;
          }
          
          const GARRISON_DEFEND_RADIUS = 150; // Detection range for enemies
          const GARRISON_LEASH_RADIUS = 180; // Maximum chase distance
          const distToPost = Math.hypot(a.x - a._garrisonX, a.y - a._garrisonY);
          
          // Check for enemies near the garrison
          if(near.e && near.d <= GARRISON_DEFEND_RADIUS){
            const enemyDistToFlag = Math.hypot(near.e.x - garrisonSite.x, near.e.y - garrisonSite.y);
            const enemyDistToPost = Math.hypot(near.e.x - a._garrisonX, near.e.y - a._garrisonY);
            
            // Only chase if enemy is within leash radius from our post
            if(enemyDistToPost <= GARRISON_LEASH_RADIUS && distToPost < GARRISON_LEASH_RADIUS){
              // Enemy is within defensive zone - engage
              a.speed = 120;
              tx = near.e.x;
              ty = near.e.y;
            } else {
              // Enemy too far or we're beyond leash - return to post
              a.speed = 110;
              tx = a._garrisonX;
              ty = a._garrisonY;
            }
          } else if(distToPost > 8){
            // No enemy nearby - return to defensive position
            a.speed = 100;
            tx = a._garrisonX;
            ty = a._garrisonY;
          } else {
            // Idle at post
            a.speed = 0;
            tx = a.x;
            ty = a.y;
          }
        }
      } else {
        // Non-garrisoned friendlies: ROLE-BASED TARGETING PRIORITIES
        const behavior = a.behavior || 'neutral';
        const role = (a.role || 'DPS').toUpperCase();
        const AGGRO_RANGE = behavior === 'aggressive' ? 140 : 80;
        
        // Find ALL capturable flags and sort by distance
        let allFlags = [];
        for(const s of state.sites){ 
          if(s.id.startsWith('site_')){
            const d=Math.hypot(s.x - a.x, s.y - a.y);
            allFlags.push({site: s, dist: d});
          }
        }
        allFlags.sort((a, b) => a.dist - b.dist); // Sort by distance
        
        // Find closest objective flag (enemy/neutral owned)
        let objectiveFlags = [];
        for(const flagData of allFlags){
          const s = flagData.site;
          if(!s.owner || s.owner !== 'player'){
            objectiveFlags.push(flagData);
          }
        }
        const closestObjective = objectiveFlags.length > 0 ? objectiveFlags[0].site : null;
        
        // Check for walls to attack at closest objective
        let wallTarget = null;
        if(closestObjective && closestObjective.wall && closestObjective.wall.sides){
          const intactWalls = closestObjective.wall.sides.filter(s => s && !s.destroyed);
          if(intactWalls.length > 0){
            // Find nearest wall side
            let bestIdx = -1, bestD = Infinity;
            for(let si = 0; si < 4; si++){
              const side = closestObjective.wall.sides[si];
              if(!side || side.destroyed) continue;
              const midAng = (si + 0.5) * (Math.PI/2);
              const px = closestObjective.x + Math.cos(midAng) * closestObjective.wall.r * 0.92;
              const py = closestObjective.y + Math.sin(midAng) * closestObjective.wall.r * 0.92;
              const d = Math.hypot(px - a.x, py - a.y);
              if(d < bestD){ bestD = d; bestIdx = si; }
            }
            if(bestIdx !== -1){
              const midAng = (bestIdx + 0.5) * (Math.PI/2);
              wallTarget = {
                x: closestObjective.x + Math.cos(midAng) * closestObjective.wall.r * 0.92,
                y: closestObjective.y + Math.sin(midAng) * closestObjective.wall.r * 0.92,
                site: closestObjective,
                side: bestIdx
              };
            }
          }
        }
        
        // ROLE-BASED PRIORITY SYSTEM
        let decision = 'idle';
        let targetInfo = '';
        
        // Clear garrison idle targets (tx=a.x, ty=a.y from garrison AI)
        // Only reset if targeting current position (idle state carryover)
        if(tx === a.x && ty === a.y){
          tx = null;
          ty = null;
        }
        
        if(role === 'TANK'){
          // TANK PRIORITY: Move to objectives > Attack walls in range > Stay near allies when threatened
          
          // Debug: Log tank AI activation (temporary)
          if(state.debugLog && Math.random() < 0.15){
            state.debugLog.push({
              time: (state.campaign?.time || 0).toFixed(2),
              type: 'TANK_AI_START',
              tank: a.name || a.variant,
              position: {x: Math.round(a.x), y: Math.round(a.y)},
              closestObjective: closestObjective ? (closestObjective.name || closestObjective.id) : 'NULL',
              closestObjectivePos: closestObjective ? {x: Math.round(closestObjective.x), y: Math.round(closestObjective.y)} : null,
              wallTarget: wallTarget ? 'YES' : 'NO',
              initialDecision: decision
            });
          }
          
          // EXCEPTION: Attack walls when in range (highest priority)
          if(wallTarget){
            const distToWall = Math.hypot(a.x - wallTarget.x, a.y - wallTarget.y);
            if(distToWall <= 150){
              tx = wallTarget.x;
              ty = wallTarget.y;
              decision = 'attack_wall';
              targetInfo = `${wallTarget.site.name || wallTarget.site.id} wall`;
            }
          }
          
          // Move to closest objective when not attacking walls
          if(decision === 'idle' && closestObjective){
            tx = closestObjective.x;
            ty = closestObjective.y;
            decision = 'capture_objective';
            targetInfo = closestObjective.name || closestObjective.id;
            
            // Debug: Log tank movement decision
            if(state.debugLog && Math.random() < 0.05){
              state.debugLog.push({
                time: (state.campaign?.time || 0).toFixed(2),
                type: 'TANK_DECISION',
                tank: a.name || a.variant,
                decision: decision,
                target: targetInfo,
                hasPosition: a.x !== undefined && a.x !== null
              });
            }
            
            // Debug: Log objective targeting
            if(state.debugLog && Math.random() < 0.1){
              state.debugLog.push({
                time: (state.campaign?.time || 0).toFixed(2),
                type: 'TANK_OBJECTIVE_SET',
                tank: a.name || a.variant,
                objective: closestObjective.name || closestObjective.id,
                objectivePos: {x: Math.round(closestObjective.x), y: Math.round(closestObjective.y)},
                tankPos: {x: Math.round(a.x), y: Math.round(a.y)},
                distance: Math.round(Math.hypot(closestObjective.x - a.x, closestObjective.y - a.y))
              });
            }
          }
          
          // Fallback: Attack nearby enemies
          if(decision === 'idle' && near.e && near.d <= AGGRO_RANGE * 0.8){
            tx = near.e.x;
            ty = near.e.y;
            decision = 'attack_enemy';
            targetInfo = `${near.e.name || near.e.variant} (defensive)`;
          }
        }
        else if(role === 'DPS'){
          // DPS PRIORITY: Enemies > Creatures > Objectives
          // HYSTERESIS: Sticky zones prevent rapid decision flipping
          
          const currentlyAttacking = (a._lastDecision === 'attack_enemy');
          const aggroThreshold = currentlyAttacking ? AGGRO_RANGE * 1.15 : AGGRO_RANGE * 0.85; // 253 disengage / 187 engage
          
          if(near.e && near.d <= aggroThreshold){
            tx = near.e.x;
            ty = near.e.y;
            decision = 'attack_enemy';
            targetInfo = near.e.name || near.e.variant || 'Unknown';
          } else if(nearCreature && nearCreatureD <= AGGRO_RANGE){
            tx = nearCreature.x;
            ty = nearCreature.y;
            decision = 'attack_creature';
            targetInfo = 'Creature';
          } else if(wallTarget){
            tx = wallTarget.x;
            ty = wallTarget.y;
            decision = 'attack_objective';
            targetInfo = wallTarget.site.name || wallTarget.site.id;
          } else if(closestObjective){
            tx = closestObjective.x;
            ty = closestObjective.y;
            decision = 'capture_objective';
            targetInfo = closestObjective.name || closestObjective.id;
          }
        }
        else if(role === 'HEALER'){
          // HEALER PRIORITY: Stay near allies (cached position to reduce recalculation)
          
          // Cache cluster center calculation (only recalc every 1 second)
          const now = state.campaign?.time || 0;
          if(!a._clusterCacheTime || now - a._clusterCacheTime > 1.0){
            let allyX = 0, allyY = 0, allyCount = 0;
            for(const f of state.friendlies){
              if(f === a || f.respawnT > 0) continue;
              allyX += f.x;
              allyY += f.y;
              allyCount++;
            }
            if(state.player && !state.player.dead){
              allyX += state.player.x;
              allyY += state.player.y;
              allyCount++;
            }
            
            if(allyCount > 0){
              allyX /= allyCount;
              allyY /= allyCount;
              
              // Add jitter to prevent stacking
              const healerID = a.id || a._id || 0;
              const jitterAngle = (healerID * 2.4) % (Math.PI * 2);
              const jitterDist = 25 + (healerID % 20);
              a._cachedClusterX = allyX + Math.cos(jitterAngle) * jitterDist;
              a._cachedClusterY = allyY + Math.sin(jitterAngle) * jitterDist;
              a._cachedAllyCount = allyCount;
            } else {
              a._cachedClusterX = null;
              a._cachedAllyCount = 0;
            }
            a._clusterCacheTime = now;
          }
          
          // Use cached cluster position
          if(a._cachedClusterX !== null && a._cachedClusterX !== undefined){
            const distToCluster = Math.hypot(a.x - a._cachedClusterX, a.y - a._cachedClusterY);
            
            // HYSTERESIS: Different thresholds for moving vs staying
            const isCurrentlyMoving = (a._lastDecision === 'support_allies');
            const moveThreshold = isCurrentlyMoving ? 120 : 160; // 120 to stop, 160 to start
            
            if(distToCluster > moveThreshold){
              tx = a._cachedClusterX;
              ty = a._cachedClusterY;
              decision = 'support_allies';
              targetInfo = `Allied cluster (${a._cachedAllyCount} units)`;
            } else if(near.e && near.d <= AGGRO_RANGE * 0.6 && distToCluster <= 100){
              // Only attack when very safe and very close to allies
              tx = near.e.x;
              ty = near.e.y;
              decision = 'attack_enemy';
              targetInfo = `${near.e.name || near.e.variant} (safe)`;
            } else if(closestObjective && !near.e){
              tx = closestObjective.x;
              ty = closestObjective.y;
              decision = 'capture_objective';
              targetInfo = closestObjective.name || closestObjective.id;
            } else {
              // Stay in position
              tx = a._cachedClusterX;
              ty = a._cachedClusterY;
              decision = 'support_allies';
              targetInfo = 'Maintaining position';
            }
          } else {
            // No allies - move to objective cautiously
            if(closestObjective){
              tx = closestObjective.x;
              ty = closestObjective.y;
              decision = 'capture_objective';
              targetInfo = closestObjective.name || closestObjective.id;
            }
          }
        }
        else {
          // DEFAULT (no role): Standard behavior
          if(near.e && near.d <= AGGRO_RANGE){
            tx = near.e.x;
            ty = near.e.y;
            decision = 'attack_enemy';
            targetInfo = near.e.name || near.e.variant || 'Unknown';
          } else if(nearCreature && nearCreatureD <= AGGRO_RANGE){
            tx = nearCreature.x;
            ty = nearCreature.y;
            decision = 'attack_creature';
            targetInfo = 'Creature';
          } else if(closestObjective){
            tx = closestObjective.x;
            ty = closestObjective.y;
            decision = 'capture_objective';
            targetInfo = closestObjective.name || closestObjective.id;
          }
        }
        
        // Fallback: Follow allies or patrol base (NEVER stand idle)
        if(!tx && !ty){
          // SAFEGUARD: Find nearest ally to follow (healers should stick with group)
          let nearestAlly = null;
          let nearestAllyDist = Infinity;
          
          for(const f of state.friendlies){
            if(f === a || f.respawnT > 0) continue;
            const dist = Math.hypot(f.x - a.x, f.y - a.y);
            if(dist < nearestAllyDist && dist > 50){ // Must be >50 units away to follow
              nearestAllyDist = dist;
              nearestAlly = f;
            }
          }
          
          // Check player too
          if(state.player && !state.player.dead){
            const distToPlayer = Math.hypot(state.player.x - a.x, state.player.y - a.y);
            if(distToPlayer < nearestAllyDist && distToPlayer > 50){
              nearestAllyDist = distToPlayer;
              nearestAlly = state.player;
            }
          }
          
          if(nearestAlly){
            // Follow nearest ally
            tx = nearestAlly.x;
            ty = nearestAlly.y;
            decision = 'support_allies';
            targetInfo = nearestAlly.name || nearestAlly.variant || 'Ally';
          } else {
            // No allies to follow - patrol around base instead of standing still
            const playerBase = state.sites.find(s => s.id === 'player_base');
            if(playerBase){
              const distToBase = Math.hypot(playerBase.x - a.x, playerBase.y - a.y);
              
              // If already at base (< 80 units), patrol around it
              if(distToBase < 80){
                const patrolAngle = (state.campaign.time * 0.3 + (a.id || 0)) % (Math.PI * 2);
                const patrolRadius = 60 + ((a.id || 0) % 40);
                tx = playerBase.x + Math.cos(patrolAngle) * patrolRadius;
                ty = playerBase.y + Math.sin(patrolAngle) * patrolRadius;
                decision = 'patrol_base';
                targetInfo = 'Patrolling base';
              } else {
                // Return to base if far away
                tx = playerBase.x;
                ty = playerBase.y;
                decision = 'return_base';
                targetInfo = 'Player Base';
              }
            }
          }
        }
        
        // SAFEGUARD: Prevent targeting current position (infinite loop fix)
        // Only apply wander behavior if no meaningful decision was made
        if(tx && ty && (!decision || decision === 'idle' || decision === 'wander')){
          const distToTarget = Math.hypot(tx - a.x, ty - a.y);
          
          // Debug safeguard trigger
          if(state.debugLog && Math.random() < 0.15 && role === 'TANK'){
            state.debugLog.push({
              time: (state.campaign?.time || 0).toFixed(2),
              type: 'TANK_SAFEGUARD_CHECK',
              tank: a.name || a.variant,
              decision: decision,
              distToTarget: Math.round(distToTarget),
              willTrigger: distToTarget < 20,
              targetPos: {x: Math.round(tx), y: Math.round(ty)},
              tankPos: {x: Math.round(a.x), y: Math.round(a.y)}
            });
          }
          
          if(distToTarget < 20){
            // Too close to target - pick a new patrol destination
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDist = 80 + Math.random() * 60;
            tx = a.x + Math.cos(randomAngle) * randomDist;
            ty = a.y + Math.sin(randomAngle) * randomDist;
            decision = 'wander';
            targetInfo = 'Wandering';
          }
        }
        
        // Track decision changes for AI behavior analysis
        logAIBehavior(state, a, 'decision_change', {
          newDecision: decision,
          target: targetInfo,
          targetPos: tx && ty ? { x: Math.round(tx), y: Math.round(ty) } : null,
          distance: tx && ty ? Math.round(Math.hypot(tx - a.x, ty - a.y)) : 0
        });
        
        // Check for stuck/looping behavior (position tracking)
        logAIBehavior(state, a, 'position_check', {
          isMoving: (tx !== a.x || ty !== a.y),
          decision: decision
        });
        
        // Store last decision on unit for hysteresis checks (used by distance thresholds)
        a._lastDecision = decision;
        
        // Debug logging for role-based decisions (5% sample rate)
        if(state.debugLog && Math.random() < 0.05){
          state.debugLog.push({
            time: (state.campaign?.time || 0).toFixed(2),
            type: 'FRIENDLY_ROLE_TARGET',
            friendly: a.name || a.variant,
            role: role,
            decision: decision,
            target: targetInfo,
            distance: tx && ty ? Math.round(Math.hypot(tx - a.x, ty - a.y)) : 0,
            hp: Math.round(a.hp || 0),
            mana: Math.round(a.mana || 0),
            speed: a.speed
          });
        }
        
        // set speed for non-guards
        a.speed = 110;
      }
    }
    
    const cc = getCcState(a);
    const waterFactor = a.inWater ? 0.45 : 1.0;
    const ccFactor = (cc.rooted || cc.stunned) ? 0 : Math.max(0, 1 + cc.speedMod);
    const slowFactor = waterFactor * ccFactor;

    // move friendlies using avoidance helper for better navigation (both guards and non-guards)
    if(a.speed > 0 && slowFactor>0) moveWithAvoidance(a, tx, ty, state, dt, { slowFactor });
    
    // water flag
    a.inWater = false; for(const w of state.waters||[]){ if(Math.hypot(a.x-w.x,a.y-w.y) <= w.r){ a.inWater=true; break; } }

    // idle soft spacing so friendlies don't remain stacked when not moving
    // Guards use formation slots; skip extra spacing to match enemy guard cohesion.
    if(!a.guard && state.friendlies.length>1){
      let sepX = 0, sepY = 0;
      for(const other of state.friendlies){
        if(other===a) continue;
        if(other.respawnT>0) continue;
        const d = Math.hypot(a.x - other.x, a.y - other.y);
        const desired = a.r + other.r + 10;
        if(d < desired && d > 1e-3){
          const push = (desired - d) / desired;
          sepX += (a.x - other.x) / d * push;
          sepY += (a.y - other.y) / d * push;
        }
      }
      const pd = Math.hypot(a.x - state.player.x, a.y - state.player.y);
      const desiredP = a.r + state.player.r + 12;
      if(pd < desiredP && pd > 1e-3){
        const push = (desiredP - pd) / desiredP;
        sepX += (a.x - state.player.x) / pd * push;
        sepY += (a.y - state.player.y) / pd * push;
      }
      const sepMag = Math.hypot(sepX, sepY);
      if(sepMag>0){
        const pushStep = Math.min(32*dt, 10);
        a.x += (sepX/sepMag) * pushStep;
        a.y += (sepY/sepMag) * pushStep;
      }
    }

    // simple ability casting for friendlies (skip if silenced/stunned)
    if(!cc.stunned && !cc.silenced) npcUpdateAbilities(state, a, dt, 'friendly');

    // contact attack: attempt to hit nearby enemies
    let contactTarget = near.e;
    if(isGroupMember && a._lockId){
      const locked = state.enemies.find(e => (e.id||e._id) === a._lockId && !e.dead && e.hp>0);
      if(locked) contactTarget = locked;
    }
    // allow hostile creature to override contact target if closer
    if(nearCreature && (!contactTarget || nearCreatureD < (contactTarget? Math.hypot(contactTarget.x-a.x, contactTarget.y-a.y):Infinity))) contactTarget = nearCreature;

    if(contactTarget && !cc.stunned){
      const d = Math.hypot(contactTarget.x - a.x, contactTarget.y - a.y);
      const hitDist=a.r+(contactTarget.r||12)+6;
      const hasStaff = (a.weaponType||'').toLowerCase().includes('staff');
      // ranged light attack for staff users when outside melee range
      if(hasStaff && d>hitDist && d<=320 && a.hitCd<=0){
        a.hitCd = 0.70;
        const ang = Math.atan2(contactTarget.y - a.y, contactTarget.x - a.x);
        const proj = spawnProjectile(state, a.x, a.y, ang, 420, 5, Math.max(8, a.dmg*0.95), 0, true);
        
        // Tag projectile with shooter for damage tracking
        if(proj) proj.shooter = a;
        
        // Log friendly ranged attack (3% sample rate)
        if(state.debugLog && Math.random() < 0.03){
          state.debugLog.push({
            time: (state.campaign?.time || 0).toFixed(2),
            type: 'FRIENDLY_RANGED_ATTACK',
            attacker: a.name || a.variant,
            attackerRole: a.role || 'unknown',
            target: contactTarget.name || contactTarget.variant || 'creature',
            targetType: state.enemies.includes(contactTarget) ? 'enemy' : 'creature',
            damage: Math.max(8, a.dmg*0.95),
            distance: d.toFixed(1)
          });
        }
      }
      else if(d<=hitDist && a.hitCd<=0){
        a.hitCd=0.55;
        
        // Log friendly contact attack (5% sample rate)
        if(state.debugLog && Math.random() < 0.05){
          state.debugLog.push({
            time: (state.campaign?.time || 0).toFixed(2),
            type: 'FRIENDLY_CONTACT_ATTACK',
            attacker: a.name || a.variant,
            attackerRole: a.role || 'unknown',
            target: contactTarget.name || contactTarget.variant || 'creature',
            targetType: state.enemies.includes(contactTarget) ? 'enemy' : 'creature',
            damage: a.dmg,
            distance: d.toFixed(1)
          });
        }
        
        const stLite = { critChance: 0, critMult: 1 };
        const res = applyDamageToEnemy(contactTarget, a.dmg, stLite, state);
        
        // Track damage dealt by friendly
        a._damageDealt = (a._damageDealt || 0) + (res?.dealt || a.dmg);
        
        if(contactTarget.hp<=0){
          const idx = state.enemies.indexOf(contactTarget);
          if(idx>=0) killEnemy(state, idx, false); // Friendly melee kill, not player
        }
      }
    }
    // incidental collisions with creatures: friendlies can aggro creatures if they hit them
    for(let ci=state.creatures.length-1; ci>=0; ci--){
      const c = state.creatures[ci];
      // Skip creatures that don't match current context
      if(state.inDungeon){
        if(c.dungeonId !== state.inDungeon) continue;
      } else {
        if(c.dungeonId) continue;
      }
      const d = Math.hypot(c.x - a.x, c.y - a.y);
      const hitDist = a.r + (c.r||12) + 4;
      if(d <= hitDist && a.hitCd<=0){
        a.hitCd = 0.55;
        const dead = applyDamageToCreature(c, a.dmg, state);
        
        // Track friendly damage to creature
        a._damageDealt = (a._damageDealt || 0) + a.dmg;
        
        c.target = a;
        if(dead) killCreature(state, ci);
      }
    }
    // Note: Removed siteId-based deletion check - non-group allies no longer use siteId
    // They always seek next objective instead of being tied to one flag
  }
}

function nearestTargetSiteForTeam(state, team){
  const playerOwned = state.sites.filter(s => s.owner==='player' && s.id.startsWith('site_'));
  if(playerOwned.length===0) return null;
  const eh = getHomeForTeam(state, team) || state.sites.find(s=>s.id.endsWith('_base'));
  if(!eh) return playerOwned[0];
  let best=null, bestD=Infinity;
  for(const s of playerOwned){
    const d=Math.hypot(s.x-eh.x, s.y-eh.y);
    if(d<bestD){bestD=d; best=s;}
  }
  return best;
}

function killFriendly(state, idx, scheduleRespawn=true){
  const f = state.friendlies[idx];
  if(!f) return;
  // Close unit inspection if this was the selected unit
  if(state.selectedUnit && state.selectedUnit.unit===f){
    try{ state.ui.hideUnitPanel?.(); }catch{}
  }
  
  // Check if this friendly is a group member
  const isGroupMember = state.group && state.group.members && state.group.members.includes(f.id);
  
  if(isGroupMember){
    // Group members respawn at nearest player-owned flag and rejoin player
    const nearestFlag = findNearestPlayerFlag(state, state.player.x, state.player.y);
    if(nearestFlag){
      f.respawnT = 8.0; // 8 second respawn time for group members
      f.siteId = nearestFlag.id; // Respawn at this flag
      console.log(`[GROUP] ${f.name} will respawn at ${nearestFlag.name} in 8s`);
      state.ui?.toast(`⚠️ <b>${f.name}</b> died. Respawning at <b>${nearestFlag.name}</b> in 8s.`);
      // Don't remove from friendlies array - just set respawn timer
      return;
    } else {
      // No player-owned flag found - remove from group
      console.log(`[GROUP] ${f.name} died with no respawn point. Removing from group.`);
      state.ui?.toast(`⚠️ <b>${f.name}</b> died. No respawn location available.`);
      state.group.members = state.group.members.filter(id => id !== f.id);
      delete state.group.settings[f.id];
    }
  }
  
  // Standard friendly respawn logic for non-group members
  if(scheduleRespawn){
    if(f.guard && f.siteId){
      const site = state.sites.find(s=>s.id===f.siteId);
      if(site){
        site.guardRespawns.push(30.0);
        console.log(`[GUARD] ${f.name} at ${site.name} died. Respawning in 30s.`);
        state.ui?.toast(`⚠️ Guard <b>${f.name}</b> at <b>${site.name}</b> died. Respawning in 30s.`);
      }
      state.friendlies.splice(idx,1);
    } else {
      const nearestFlag = findNearestPlayerFlag(state, f.x||state.player.x, f.y||state.player.y);
      if(nearestFlag){
        f.respawnT = 8.0;
        // DON'T set siteId for non-guard, non-garrison allies - they should always seek next objective
        // f.siteId = nearestFlag.id; // REMOVED - causes allies to stay at flags
        f.dead = true;
        console.log(`[ALLY] ${f.name} died. Will respawn at ${nearestFlag.name} in 8s.`);
        state.ui?.toast(`⚠️ <b>${f.name}</b> fell in battle. Respawning at <b>${nearestFlag.name}</b> in 8s.`);
        return;
      }
      state.friendlies.splice(idx,1);
    }
  } else {
    state.ui?.toast(`⚠️ <b>${f.name}</b> defeated.`);
    state.friendlies.splice(idx,1);
  }
}

// Helper to find nearest player-owned flag
function findNearestPlayerFlag(state, x, y){
  let nearest = null;
  let bestD = Infinity;
  for(const s of state.sites){
    if(s.owner === 'player' && (s.id.startsWith('site_') || s.id.endsWith('_base'))){
      const d = Math.hypot(s.x - x, s.y - y);
      if(d < bestD){ bestD = d; nearest = s; }
    }
  }
  return nearest;
}

// Check if a team should attack another team based on emperor status
// EMPEROR ALLIANCE SYSTEM:
// - When NO emperor: teams attack each other normally (teamA vs teamB vs teamC)
// - When emperor exists: ALL non-emperor teams become ALLIES and only attack the emperor team
// - Emperor team attacks all other teams (now all allied against them)
function shouldAttackTeam(attackerTeam, targetTeam, state){
  // No emperor: normal team vs team combat
  if(!state.emperorTeam) return attackerTeam !== targetTeam;
  
  // Emperor attacks anyone who isn't emperor
  if(state.emperorTeam === attackerTeam) return targetTeam !== attackerTeam;
  
  // Non-emperor teams ONLY attack the emperor team (they're allied with each other)
  return targetTeam === state.emperorTeam;
}

function updateEnemies(state, dt){
  const st=currentStats(state);
  const ENEMY_AGGRO_DIST = 90; // distance at which an enemy will engage nearby hostiles before going to flag
  for(let i=state.enemies.length-1;i>=0;i--){
    const e=state.enemies[i];
    // when inside a dungeon, only process dungeon enemies for that dungeon
    if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
    e.hitCd=Math.max(0,e.hitCd-dt);
    const manaRegen = e.manaRegen ?? Math.max(3, (e.maxMana||40)*0.08);
    e.mana = clamp((e.mana||0) + manaRegen*dt, 0, e.maxMana||40);
    
    // Stamina regeneration for guards (who have blocking capability)
    if(e.guard && e.maxStam){
      const stamRegen = 18; // Same as player base stamina regen
      e.stam = clamp((e.stam||0) + stamRegen*dt, 0, e.maxStam);
    }

    // detect if enemy currently in water (slows and disables melee contact)
    e.inWater = false;
    for(const w of state.waters||[]){ if(Math.hypot(e.x-w.x,e.y-w.y) <= w.r){ e.inWater=true; break; } }

    // resolve home/target sites (skip for dungeon enemies - they only attack the player)
    let home = null;
    let spawnTarget = null;
    if(!e.dungeonId){
      home = e.homeSiteId ? state.sites.find(s=>s.id===e.homeSiteId) : (e.team ? getHomeForTeam(state, e.team) : null);
      if(e.homeSiteId && home && home.owner!==e.team){
        // if home lost, redirect to the nearest capturable flag (do NOT target bases)
        let bestFlag=null, bestD=Infinity;
        for(const s of state.sites){ if(s.id && s.id.startsWith && s.id.startsWith('site_') && s.owner !== e.team){ const d=Math.hypot(s.x - e.x, s.y - e.y); if(d<bestD){ bestD=d; bestFlag=s; } } }
        if(bestFlag) e.spawnTargetSiteId = bestFlag.id; else e.spawnTargetSiteId = null;
      }
      spawnTarget = e.spawnTargetSiteId ? state.sites.find(s=>s.id===e.spawnTargetSiteId) : null;
      // if no explicit spawn target, pick nearest site not owned by the enemy's team
      if(!spawnTarget){
        let best=null, bestD=Infinity;
        for(const s of state.sites){
          // only consider flag sites for attack targets
          if(!s.id || !s.id.startsWith || !s.id.startsWith('site_')) continue;
          if(s.owner !== e.team){
            const d=Math.hypot(s.x - e.x, s.y - e.y);
            if(d<bestD){ bestD=d; best=s; }
          }
        }
        if(best){ e.spawnTargetSiteId = best.id; spawnTarget = best; }
      }

      // Hard enforce: always chase the nearest capturable flag/outpost
      {
        let best=null, bestD=Infinity;
        for(const s of state.sites){
          if(!s.id || !s.id.startsWith || !s.id.startsWith('site_')) continue;
          if(s.owner === e.team) continue;
          const d = Math.hypot(s.x - e.x, s.y - e.y);
          if(d < bestD){ bestD = d; best = s; }
        }
        if(best && (!spawnTarget || spawnTarget.id !== best.id)){
          spawnTarget = best;
          e.spawnTargetSiteId = best.id;
        }
      }
    } else {
      // ensure dungeon enemies have no world capture targets
      e.homeSiteId = null; e.spawnTargetSiteId = null; e.team = null;
    }

    // determine goal position
    let tx, ty;
    
    // COORDINATED GUARD AI - Aggressive flag defense with ball group tactics
    if(e.guard){
      // ═══════════════════════════════════════════════════════════════════════════════
      // ENEMY GUARD BALL GROUP AI - Phase 1 System (matches friendly guards)
      // ═══════════════════════════════════════════════════════════════════════════════
      
      const guardSite = e.homeSiteId ? state.sites.find(s => s.id === e.homeSiteId) : null;
      const spawnX = (e._spawnX !== undefined) ? e._spawnX : e.x;
      const spawnY = (e._spawnY !== undefined) ? e._spawnY : e.y;
      const now = state.campaign?.time || 0;
      
      // ─────────────────────────────────────────────────────────────────────────────
      // LOCKED DEFENSE GEOMETRY (matches friendly guards)
      // ─────────────────────────────────────────────────────────────────────────────
      const FLAG_RADIUS = guardSite ? guardSite.r : 50;
      const DEFENSE_ENTER = FLAG_RADIUS + 100;  // 150 total
      const DEFENSE_EXIT = DEFENSE_ENTER + 30;  // 180 (hysteresis band)
      const AGGRO_RANGE = 280;  // Increased from 220 for more aggressive engagement
      const LEASH_RETREAT = 320; // Increased from 260 to chase deeper
      const LEASH_HARD_STOP = 350; // Increased from 280 for extended pursuit
      
      // ─────────────────────────────────────────────────────────────────────────────
      // COMMIT TIMERS (Prevent Thrashing)
      // ─────────────────────────────────────────────────────────────────────────────
      const TARGET_COMMIT = 1.5;
      const MOVEMENT_COMMIT = 1.0;
      const FORMATION_UPDATE = 0.75;
      const MACRO_TICK = 0.75;
      
      // Initialize guard state
      if(!e._guardState) e._guardState = 'IDLE_DEFENSE';
      if(!e._lastMacroTick) e._lastMacroTick = 0;
      if(!e._lastFormationUpdate) e._lastFormationUpdate = 0;
      if(!e._targetCommitUntil) e._targetCommitUntil = 0;
      if(!e._movementCommitUntil) e._movementCommitUntil = 0;
      if(!e._defenseActiveSince) e._defenseActiveSince = 0;
      if(!e._preFightBuffsTriggered) e._preFightBuffsTriggered = false;
      
      // ─────────────────────────────────────────────────────────────────────────────
      // FORMATION SLOT ASSIGNMENT (Stable, Anchor-Based)
      // ─────────────────────────────────────────────────────────────────────────────
      const allGuards = state.enemies.filter(en =>
        en.guard && en.homeSiteId === e.homeSiteId && (!en.dead && en.hp > 0)
      );
      if(!e._formationSlot || now - e._lastFormationUpdate >= FORMATION_UPDATE){
        // Assign slots based on guard index and role
        const dpsGuards = allGuards.filter(g => g.guardRole !== 'HEALER');
        const healerGuards = allGuards.filter(g => g.guardRole === 'HEALER');
        
        // Assign formation slots (relative to flag spawn) - TIGHTER for ball group cohesion
        if(e.guardRole === 'HEALER'){
          const healerIndex = healerGuards.indexOf(e);
          if(healerIndex === 0) e._formationSlot = { offsetX: -35, offsetY: -45 }; // Rear-left (tighter)
          else if(healerIndex === 1) e._formationSlot = { offsetX: 35, offsetY: -45 }; // Rear-right (tighter)
          else e._formationSlot = { offsetX: 0, offsetY: -45 }; // Rear-center fallback
        } else {
          const dpsIndex = dpsGuards.indexOf(e);
          if(dpsIndex === 0) e._formationSlot = { offsetX: 0, offsetY: 25 };    // Front-center (LEADER)
          else if(dpsIndex === 1) e._formationSlot = { offsetX: -30, offsetY: 15 }; // Front-left (tighter)
          else if(dpsIndex === 2) e._formationSlot = { offsetX: 30, offsetY: 15 };  // Front-right (tighter)
          else e._formationSlot = { offsetX: 0, offsetY: 0 }; // Center fallback
        }
        
        e._lastFormationUpdate = now;
      }
      
      // Calculate stable slot position (relative to flag spawn anchor)
      const slotX = spawnX + e._formationSlot.offsetX;
      const slotY = spawnY + e._formationSlot.offsetY;
      const distFromSlot = Math.hypot(e.x - slotX, e.y - slotY);
      const distFromSpawn = Math.hypot(e.x - spawnX, e.y - spawnY);

      // ─────────────────────────────────────────────────────────────────────────────
      // SHARED GUARD BALL STATE (LOG-ONLY STEP)
      // ─────────────────────────────────────────────────────────────────────────────
      {
        const kind = 'enemy';
        const siteKey = e.guardFlagId || e.homeSiteId || e.siteId || (guardSite?.id || null) || 'unknown';
        const ballId = `${kind}:${siteKey}`;
        const ball = getOrCreateGuardBall(state, ballId, now);
        const leaderId = electGuardBallLeader(state, ball, kind, allGuards, now);
        const selfId = getStableUnitLogId(state, e, kind);

        const FOCUS_TICK = 0.75;
        if(selfId && leaderId && selfId === leaderId && (!ball._lastFocusTickAt || (now - ball._lastFocusTickAt) >= FOCUS_TICK)){
          ball._lastFocusTickAt = now;

          const geo = { FLAG_RADIUS, DEFENSE_ENTER, LEASH_HARD_STOP };
          const currentId = ball.focusTargetId;
          let current = null;
          if(currentId){
            if((state.player?.id || state.player?._id) === currentId && !state.player.dead && state.player.hp > 0) current = state.player;
            else current = state.friendlies.find(f => (f.id||f._id) === currentId && f.respawnT <= 0);
          }
          const currentScore = current ? scoreGuardBallTarget(state, kind, guardSite, spawnX, spawnY, current, geo) : -Infinity;

          let best = null;
          let bestScore = -Infinity;
          const candidates = [];
          if(state.player && !state.player.dead && state.player.hp > 0) candidates.push(state.player);
          for(const f of state.friendlies){
            if(f && f.respawnT <= 0) candidates.push(f);
          }
          for(const cand of candidates){
            const s = scoreGuardBallTarget(state, kind, guardSite, spawnX, spawnY, cand, geo);
            if(s > bestScore){ bestScore = s; best = cand; }
          }

          const bestValid = !!best && bestScore !== -Infinity && Number.isFinite(bestScore);
          const currentValid = !!current && currentScore !== -Infinity && Number.isFinite(currentScore);

          // Step 3: burst/reset timers
          const BURST_LOCK = 2.25;
          const RESELECT_MIN = 0.60;
          const RESET_GRACE = 1.00;

          if(!bestValid){
            if(ball.focusTargetId){
              if(!ball.resetUntil || ball.resetUntil <= 0){
                ball.resetUntil = now + RESET_GRACE;
                if(state.debugLog) logDebug(state, 'GUARD_BALL', 'Ball reset armed (no valid targets)', {
                  type:'GUARD_BALL_RESET_ARM',
                  ballId,
                  leaderId,
                  resetAt: +ball.resetUntil.toFixed(2)
                });
              } else if(now >= ball.resetUntil){
                if(state.debugLog) logDebug(state, 'GUARD_BALL', 'Ball focus reset (no valid targets)', {
                  type:'GUARD_BALL_RESET',
                  ballId,
                  leaderId,
                  prevFocusTargetId: ball.focusTargetId
                });
                ball.focusTargetId = null;
                ball.focusPos = null;
                ball.focusScore = null;
                ball.focusUntil = 0;
                ball.burstUntil = 0;
                ball.lastFocusPosAt = 0;
                ball.resetUntil = 0;
              }
            }
          } else {
            ball.resetUntil = 0;

            const allowReselect = now >= (ball.focusUntil || 0);
            const burstLocked = currentValid && now < (ball.burstUntil || 0);
            const shouldSwitch = !currentValid || (!burstLocked && bestScore >= currentScore * 1.3);

            if(allowReselect && shouldSwitch){
              const prevId = ball.focusTargetId;
              {
                let id = best.id || best._id;
                if(id === undefined || id === null || String(id) === ''){
                  // Enemy guard balls focus player/friendlies; ensure target has a stable id.
                  const kind = (best === state.player) ? 'player' : 'friendly';
                  id = ensureEntityId(state, best, { team: 'player', kind });
                }
                ball.focusTargetId = id;
              }
              ball.focusScore = bestScore;
              ball.focusUntil = now + RESELECT_MIN;
              ball.burstUntil = now + BURST_LOCK;
              ball.lastBurstAt = now;
              ball.focusPos = { x: best.x, y: best.y };
              ball.lastFocusPosAt = now;
              if(state.debugLog) logDebug(state, 'GUARD_BALL', 'Ball focus target selected', {
                type:'GUARD_BALL_FOCUS',
                ballId,
                leaderId,
                focusTarget: best.name || best.variant || (best === state.player ? 'Player' : 'target'),
                focusTargetId: ball.focusTargetId ?? null,
                prevFocusTargetId: prevId,
                score: +bestScore.toFixed(1),
                burstUntil: +ball.burstUntil.toFixed(2)
              });
            } else if(ball.focusTargetId && currentValid && (now - (ball.lastFocusPosAt||0) >= 0.4)){
              ball.focusPos = { x: current.x, y: current.y };
              ball.lastFocusPosAt = now;
            }
          }

          // Focus heartbeat: makes sure debug exports include focus info even when focus never changes.
          const HEARTBEAT_TICK = 3.0;
          if(state.debugLog && ball.focusTargetId && (!ball._lastFocusHeartbeatAt || (now - ball._lastFocusHeartbeatAt) >= HEARTBEAT_TICK)){
            ball._lastFocusHeartbeatAt = now;
            const fp = ball.focusPos;
            logDebug(state, 'GUARD_BALL', 'Ball focus heartbeat', {
              type:'GUARD_BALL_FOCUS_HEARTBEAT',
              ballId,
              leaderId,
              focusTargetId: ball.focusTargetId,
              x: fp && Number.isFinite(fp.x) ? +fp.x.toFixed(2) : null,
              y: fp && Number.isFinite(fp.y) ? +fp.y.toFixed(2) : null,
              score: Number.isFinite(ball.focusScore) ? +ball.focusScore.toFixed(1) : null
            });
          }
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────────────
      // TARGET SELECTION WITH COMMIT TIMER
      // ─────────────────────────────────────────────────────────────────────────────
      let priorityTarget = null, targetPriority = 0, targetDist = Infinity;
      
      // Check if we should commit to existing target
      if(e._committedTarget && now < e._targetCommitUntil){
        // Look for committed target in player or friendlies
        let committed = null;
        if(!state.player.dead && state.player.hp > 0 && 
           (state.player.id || state.player._id) === e._committedTarget){
          committed = state.player;
        } else {
          committed = state.friendlies.find(f => 
            (f.id || f._id) === e._committedTarget && f.respawnT <= 0
          );
        }
        
        if(committed){
          const distToCommitted = Math.hypot(committed.x - e.x, committed.y - e.y);
          const distCommittedFromSpawn = Math.hypot(committed.x - spawnX, committed.y - spawnY);
          
          // Only keep commitment if target is still in leash and reasonably close
          if(distCommittedFromSpawn <= LEASH_HARD_STOP && distToCommitted <= AGGRO_RANGE + 60){
            priorityTarget = committed;
            targetDist = distToCommitted;
            targetPriority = 100; // Override scoring, we're committed
          }
        }
      }
      
      // If no committed target or commitment expired, find new target
      if(!priorityTarget && now - e._lastMacroTick >= MACRO_TICK){
        e._lastMacroTick = now;
        
        // Check player
        if(!state.player.dead && state.player.hp > 0){
          const distToPlayer = Math.hypot(state.player.x - e.x, state.player.y - e.y);
          const distPlayerFromFlag = guardSite ? Math.hypot(state.player.x - guardSite.x, state.player.y - guardSite.y) : Infinity;
          const distPlayerFromSpawn = Math.hypot(state.player.x - spawnX, state.player.y - spawnY);
          
          // Skip if player beyond leash
          if(distPlayerFromSpawn <= LEASH_HARD_STOP){
            let priority = 0;
            // Zone-based priority scoring
            if(distPlayerFromFlag <= FLAG_RADIUS) priority = 100;           // Sacred ground
            else if(distPlayerFromFlag <= DEFENSE_ENTER) priority = 80;    // Defense zone
            else if(distToPlayer <= AGGRO_RANGE) priority = 60;             // Aggro range
            
            if(priority > targetPriority || (priority === targetPriority && distToPlayer < targetDist)){
              targetPriority = priority;
              targetDist = distToPlayer;
              priorityTarget = state.player;
            }
          }
        }
        
        // Check friendlies
        for(const f of state.friendlies){
          if(f.respawnT > 0) continue;
          const distToFriendly = Math.hypot(f.x - e.x, f.y - e.y);
          const distFriendlyFromFlag = guardSite ? Math.hypot(f.x - guardSite.x, f.y - guardSite.y) : Infinity;
          const distFriendlyFromSpawn = Math.hypot(f.x - spawnX, f.y - spawnY);
          
          // Skip if friendly beyond leash
          if(distFriendlyFromSpawn > LEASH_HARD_STOP) continue;
          
          let priority = 0;
          // Zone-based priority scoring
          if(distFriendlyFromFlag <= FLAG_RADIUS) priority = 100;           // Sacred ground
          else if(distFriendlyFromFlag <= DEFENSE_ENTER) priority = 80;    // Defense zone
          else if(distToFriendly <= AGGRO_RANGE) priority = 60;             // Aggro range
          
          // Bonus for attacking guards
          if(f.attacked && f._hostTarget?.guard && f._hostTarget?.homeSiteId === e.homeSiteId){
            priority += 50;
          }
          
          // Select highest priority, closest if tied
          if(priority > targetPriority || (priority === targetPriority && distToFriendly < targetDist)){
            targetPriority = priority;
            targetDist = distToFriendly;
            priorityTarget = f;
          }
        }
        
        // Commit to new target and broadcast to squad for focus fire
        if(priorityTarget){
          e._committedTarget = priorityTarget.id || priorityTarget._id;
          e._targetCommitUntil = now + TARGET_COMMIT;
          
          // FOCUS FIRE: Broadcast primary target to all guards at this site
          if(guardSite){
            guardSite._sharedTarget = priorityTarget;
            guardSite._sharedTargetId = priorityTarget.id || priorityTarget._id;
            guardSite._sharedTargetUntil = now + TARGET_COMMIT;
          }
        }
      }
      
      // FOCUS FIRE: If no personal target, check if squad has shared target
      if(!priorityTarget && guardSite && guardSite._sharedTargetUntil > now){
        // Look for shared target in player or friendlies
        let sharedTarget = null;
        if(!state.player.dead && state.player.hp > 0 && 
           (state.player.id || state.player._id) === guardSite._sharedTargetId){
          sharedTarget = state.player;
        } else {
          sharedTarget = state.friendlies.find(f => 
            (f.id || f._id) === guardSite._sharedTargetId && f.respawnT <= 0
          );
        }
        
        if(sharedTarget){
          const distToShared = Math.hypot(sharedTarget.x - e.x, sharedTarget.y - e.y);
          const distSharedFromSpawn = Math.hypot(sharedTarget.x - spawnX, sharedTarget.y - spawnY);
          
          // Join focus fire if target is in leash range
          if(distSharedFromSpawn <= LEASH_HARD_STOP){
            priorityTarget = sharedTarget;
            targetDist = distToShared;
            targetPriority = 90; // High priority for focus fire
          }
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────────────
      // GUARD STATE MACHINE (3 States Only)
      // ─────────────────────────────────────────────────────────────────────────────
      const hasDefenseThreat = priorityTarget && (
        targetPriority >= 80 || // Inside defense zone or flag radius
        (targetDist <= AGGRO_RANGE && targetPriority >= 60)
      );
      
      const shouldReturnToPost = distFromSpawn > LEASH_RETREAT || (
        e._guardState === 'RETURN_TO_POST' && distFromSlot > 25
      );
      
      // STATE TRANSITIONS
      if(e._guardState === 'IDLE_DEFENSE'){
        if(hasDefenseThreat){
          e._guardState = 'ACTIVE_DEFENSE';
          e._defenseActiveSince = now;
          e._preFightBuffsTriggered = false; // Reset buff trigger
        } else if(shouldReturnToPost){
          e._guardState = 'RETURN_TO_POST';
        }
      }
      else if(e._guardState === 'ACTIVE_DEFENSE'){
        // Exit to idle only if no threat for 0.75s (fast re-engagement)
        const noThreatDuration = hasDefenseThreat ? 0 : (now - e._defenseActiveSince);
        if(noThreatDuration >= 0.75 && !hasDefenseThreat){
          e._guardState = 'IDLE_DEFENSE';
        } else if(shouldReturnToPost){
          e._guardState = 'RETURN_TO_POST';
        }
      }
      else if(e._guardState === 'RETURN_TO_POST'){
        if(hasDefenseThreat && distFromSpawn <= LEASH_RETREAT){
          e._guardState = 'ACTIVE_DEFENSE';
          e._defenseActiveSince = now;
        } else if(distFromSlot <= 25 && !hasDefenseThreat){
          e._guardState = 'IDLE_DEFENSE';
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────────────
      // STATE EXECUTION
      // ─────────────────────────────────────────────────────────────────────────────
      
      if(e._guardState === 'ACTIVE_DEFENSE' && priorityTarget){
        // ═══ ACTIVE DEFENSE STATE ═══
        e.attacked = true;
        const isHealer = (e.guardRole === 'HEALER');
        
        // PRE-FIGHT BUFFS (Trigger at aggro range, once per engagement)
        if(!e._preFightBuffsTriggered && targetDist <= AGGRO_RANGE){
          // Mark as triggered for this engagement
          e._preFightBuffsTriggered = true;
          
          // Queue pre-fight shield abilities (healers trigger ward_barrier + radiant_aura)
          if(isHealer && e.npcAbilities && e.npcCd){
            const wardIdx = e.npcAbilities.indexOf('ward_barrier');
            const auraIdx = e.npcAbilities.indexOf('radiant_aura');
            if(wardIdx >= 0 && e.npcCd[wardIdx] === 0) e.npcCd[wardIdx] = 0.1; // Trigger ASAP
            if(auraIdx >= 0 && e.npcCd[auraIdx] === 0) e.npcCd[auraIdx] = 0.1;
          }
        }
        
        // ROLE-SPECIFIC COMBAT POSITIONING
        if(isHealer){
          // Healers: Maintain safe distance behind DPS line
          const HEALER_MIN_DIST = 110;
          const HEALER_MAX_DIST = 190;
          const HEALER_OPTIMAL = 140;
          
          if(targetDist < HEALER_MIN_DIST){
            // Too close - retreat toward slot position
            const angle = Math.atan2(e.y - priorityTarget.y, e.x - priorityTarget.x);
            tx = e.x + Math.cos(angle) * 60;
            ty = e.y + Math.sin(angle) * 60;
            e.speed = 90;
          } else if(targetDist > HEALER_MAX_DIST){
            // Too far - advance to maintain heal range
            tx = priorityTarget.x;
            ty = priorityTarget.y;
            e.speed = 75;
          } else {
            // Good range - stay at slot, minimal movement
            tx = slotX;
            ty = slotY;
            e.speed = 40;
          }
        } else {
          // DPS/TANK guards: Aggressive direct engagement
          tx = priorityTarget.x;
          ty = priorityTarget.y;
          e.speed = 130;
        }
      }
      else if(e._guardState === 'RETURN_TO_POST'){
        // ═══ RETURN TO POST STATE ═══
        e.attacked = false;
        tx = slotX;
        ty = slotY;
        e.speed = 110;
        
        // Snap to slot when very close
        if(distFromSlot <= 8){
          e.x = slotX;
          e.y = slotY;
          e.speed = 0;
        }
      }
      else {
        // ═══ IDLE DEFENSE STATE ═══
        e.attacked = false;
        tx = slotX;
        ty = slotY;
        
        // Gentle drift toward slot
        if(distFromSlot > 10){
          e.speed = 30;
        } else {
          e.speed = 0;
          e.x = slotX;
          e.y = slotY;
        }
      }
      
      // ─────────────────────────────────────────────────────────────────────────────
      // MOVEMENT EXECUTION
      // ─────────────────────────────────────────────────────────────────────────────
      const cc = getCcState(e);
      if(e.speed > 0){
        const slowFactor = (e.inWater ? 0.45 : 1.0) * ((cc.rooted||cc.stunned) ? 0 : Math.max(0, 1 + cc.speedMod));
        if(slowFactor>0) moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });
      }
      
      // Guards handled - skip normal enemy AI pathfinding but continue to combat
      // (continue removed so guards can execute attack code below)
    }
    
    // NON-GUARD ENEMY AI - Uses same role-based system as friendly AI
    if(!e.guard) {
      // Find nearest enemy (player or friendlies)
      const near = {e: null, d: Infinity};
      if(!state.player.dead){
        const d = Math.hypot(state.player.x - e.x, state.player.y - e.y);
        if(d < near.d){ near.d = d; near.e = state.player; }
      }
      for(const f of state.friendlies){
        if(f.respawnT > 0) continue;
        const d = Math.hypot(f.x - e.x, f.y - e.y);
        if(d < near.d){ near.d = d; near.e = f; }
      }
      
      // Find hostile creatures (same as friendly AI)
      let nearCreature = null, nearCreatureD = Infinity;
      for(const c of state.creatures){
        // Skip creatures that don't match current context
        if(state.inDungeon){
          if(c.dungeonId !== state.inDungeon) continue;
        } else {
          if(c.dungeonId) continue;
        }
        if(!c.attacked) continue;
        const isHostile = state.enemies.includes(c.target) || c.target === e;
        if(!isHostile) continue;
        const d = Math.hypot(c.x - e.x, c.y - e.y);
        if(d < nearCreatureD){ nearCreatureD = d; nearCreature = c; }
      }
      
      // Find ALL capturable flags and sort by distance (same as friendly AI)
      let allFlags = [];
      for(const s of state.sites){
        if(s.id && s.id.startsWith && s.id.startsWith('site_')){
          const d = Math.hypot(s.x - e.x, s.y - e.y);
          allFlags.push({site: s, dist: d});
        }
      }
      allFlags.sort((a, b) => a.dist - b.dist);
      
      // Find closest objective flag (not owned by this enemy's team)
      let objectiveFlags = [];
      for(const flagData of allFlags){
        const s = flagData.site;
        if(s.owner !== e.team){
          objectiveFlags.push(flagData);
        }
      }
      const closestObjective = objectiveFlags.length > 0 ? objectiveFlags[0].site : null;
      
      // Check for walls to attack at closest objective (same as friendly AI)
      let wallTarget = null;
      if(closestObjective && closestObjective.wall && closestObjective.wall.sides){
        const intactWalls = closestObjective.wall.sides.filter(s => s && !s.destroyed);
        if(intactWalls.length > 0){
          let bestIdx = -1, bestD = Infinity;
          for(let si = 0; si < 4; si++){
            const side = closestObjective.wall.sides[si];
            if(!side || side.destroyed) continue;
            const midAng = (si + 0.5) * (Math.PI/2);
            const px = closestObjective.x + Math.cos(midAng) * closestObjective.wall.r * 0.92;
            const py = closestObjective.y + Math.sin(midAng) * closestObjective.wall.r * 0.92;
            const d = Math.hypot(px - e.x, py - e.y);
            if(d < bestD){ bestD = d; bestIdx = si; }
          }
          if(bestIdx !== -1){
            const midAng = (bestIdx + 0.5) * (Math.PI/2);
            wallTarget = {
              x: closestObjective.x + Math.cos(midAng) * closestObjective.wall.r * 0.92,
              y: closestObjective.y + Math.sin(midAng) * closestObjective.wall.r * 0.92,
              site: closestObjective,
              side: bestIdx
            };
          }
        }
      }
      
      // Determine enemy role
      const role = (e.role || (e.variant === 'mage' ? 'HEALER' : (e.variant === 'warden' || e.variant === 'knight' ? 'TANK' : 'DPS'))).toUpperCase();
      
      // Use shared role-based AI decision system (same as friendly AI)
      const AGGRO_RANGE = 80; // Base aggro range for enemies (matches friendly behavior)
      const aiDecision = getRoleBasedDecision(e, state, near, nearCreature, nearCreatureD, closestObjective, wallTarget, role, AGGRO_RANGE);
      
      tx = aiDecision.tx;
      ty = aiDecision.ty;
      const decision = aiDecision.decision;
      const targetInfo = aiDecision.targetInfo;
      
      // Set attacked flag if engaging enemies
      if(decision === 'attack_enemy' || decision === 'attack_wall' || decision === 'attack_creature'){
        e.attacked = true;
      }
      
      // Store last decision for hysteresis
      e._lastDecision = decision;
      
      // Debug logging (matches friendly AI format)
      if(state.debugLog && Math.random() < 0.05){
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'ENEMY_ROLE_TARGET',
          enemy: e.name || e.variant,
          role: role,
          decision: decision,
          target: targetInfo,
          distance: tx && ty ? Math.round(Math.hypot(tx - e.x, ty - e.y)) : 0,
          hp: Math.round(e.hp || 0),
          mana: Math.round(e.mana || 0),
          speed: e.speed
        });
      }
      
      // Fallback: if no decision made, idle at current position
      if(!tx || !ty){
        tx = e.x;
        ty = e.y;
      }
    } // End of non-guard enemy AI block

    const cc = getCcState(e);
    // move towards target using avoidance helper (includes trees/mountains/walls and unit separation)
    if(e.speed > 0){
      const slowFactor = (e.inWater ? 0.45 : 1.0) * ((cc.rooted||cc.stunned) ? 0 : Math.max(0, 1 + cc.speedMod));
      if(slowFactor>0) moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });
    }

    // contact attack: attempt to hit nearest hostile (player, friendly, enemy of other teams, or hostile creature)
    if(e.hitCd<=0 && !(getCcState(e).stunned)){
      let bestTarget = null, bestD = Infinity, bestType = null;
      // player
      if(!state.player.dead){ const d=Math.hypot(state.player.x - e.x, state.player.y - e.y); if(d < bestD){ bestD = d; bestTarget = state.player; bestType='player'; } }
      // friendlies
      for(const f of state.friendlies){ if(f.respawnT>0) continue; const d=Math.hypot(f.x - e.x, f.y - e.y); if(d < bestD){ bestD = d; bestTarget = f; bestType='friendly'; } }
      // other-team enemies (only if emperor rules allow it)
      for(const other of state.enemies){ if(other===e) continue; if(!other.team || !e.team) continue; if(other.team === e.team) continue; if(!shouldAttackTeam(e.team, other.team, state)) continue; const d=Math.hypot(other.x - e.x, other.y - e.y); if(d < bestD){ bestD = d; bestTarget = other; bestType='enemy'; } }
      // hostile creatures (attacked and targeting an enemy/friendly/player)
      for(const c of state.creatures){
        // Skip creatures that don't match current context
        if(state.inDungeon){
          if(c.dungeonId !== state.inDungeon) continue;
        } else {
          if(c.dungeonId) continue;
        }
        if(!c.attacked) continue;
        const tgt = c.target;
        const hostile = tgt===state.player || state.friendlies.includes(tgt) || tgt===e;
        if(!hostile) continue;
        const d = Math.hypot(c.x - e.x, c.y - e.y);
        if(d < bestD){ bestD = d; bestTarget = c; bestType='creature'; }
      }

      if(bestTarget){
        const hitDist = e.r + (bestTarget.r || 12) + 4;
        if(bestD <= hitDist && !e.inWater){
          e.hitCd = 0.65;
          e.attacked = true;
          
          // Log successful contact attack
          if(state.debugLog && Math.random() < 0.05){
            state.debugLog.push({
              time: (state.campaign?.time || 0).toFixed(2),
              type: 'ENEMY_CONTACT_ATTACK',
              attacker: e.name || e.variant,
              attackerRole: e.role || 'unknown',
              target: bestTarget.name || bestTarget.variant || bestType,
              targetType: bestType,
              distance: Math.round(bestD),
              damage: e.contactDmg,
              targetHP: Math.round(bestTarget.hp || 0)
            });
          }
          
          if(bestType === 'player'){
            applyDamageToPlayer(state, e.contactDmg, st, e);
          } else if(bestType === 'friendly'){
            applyShieldedDamage(state, bestTarget, e.contactDmg, e);
            if(bestTarget.hp<=0){ killFriendly(state, state.friendlies.indexOf(bestTarget), true); }
          } else if(bestType === 'enemy'){
            // damage other enemy and kill if needed
            const stLite = { critChance: 0, critMult: 1 };
            const res = applyDamageToEnemy(bestTarget, e.contactDmg, stLite, state);
            // Track damage dealt by this enemy
            e._damageDealt = (e._damageDealt || 0) + (res?.dealt || e.contactDmg);
            if(bestTarget.hp<=0){
              const tgtIdx = state.enemies.findIndex(x=>x===bestTarget);
              if(tgtIdx!==-1) killEnemy(state, tgtIdx, false); // Enemy killed by enemy, not player
            }
          } else if(bestType === 'creature'){
            const dead = applyDamageToCreature(bestTarget, e.contactDmg, state);
            e._damageDealt = (e._damageDealt || 0) + e.contactDmg;
            bestTarget.target = e;
            if(dead){ const ci = state.creatures.indexOf(bestTarget); if(ci!==-1) killCreature(state, ci); }
          }
          // incidental collision: damage creatures and aggro them to this enemy
          for(let ci=state.creatures.length-1; ci>=0; ci--){
            const c = state.creatures[ci];
            // Skip creatures that don't match current context
            if(state.inDungeon){
              if(c.dungeonId !== state.inDungeon) continue;
            } else {
              if(c.dungeonId) continue;
            }
            const dc = Math.hypot(c.x - e.x, c.y - e.y);
            const cdst = e.r + (c.r||12) + 4;
            if(dc <= cdst && !e.inWater){
              const dead = applyDamageToCreature(c, e.contactDmg, state);
              e._damageDealt = (e._damageDealt || 0) + e.contactDmg;
              c.target = e;
              if(dead) killCreature(state, ci);
            }
          }
        } else {
          // Log when target is out of melee range
          if(state.debugLog && Math.random() < 0.01){
            state.debugLog.push({
              time: (state.campaign?.time || 0).toFixed(2),
              type: 'ENEMY_ATTACK_OUT_OF_RANGE',
              attacker: e.name || e.variant,
              target: bestTarget.name || bestTarget.variant || bestType,
              distance: Math.round(bestD),
              requiredRange: Math.round(hitDist),
              inWater: e.inWater
            });
          }
        }
      }
    } else {
      // Log when attack blocked by cooldown or CC
      if(state.debugLog && Math.random() < 0.005){
        const cc = getCcState(e);
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'ENEMY_ATTACK_BLOCKED',
          attacker: e.name || e.variant,
          reason: cc.stunned ? 'stunned' : (e.hitCd > 0 ? 'cooldown' : 'unknown'),
          cooldownRemaining: e.hitCd.toFixed(2)
        });
      }
    }

    // simple ability casting for enemies (respect silence/stun)
    const cc2 = getCcState(e);
    
    // Track ability attempt for debugging
    const attemptedAbility = e._lastAbilityAttempt || null;
    if(!cc2.stunned && !cc2.silenced) npcUpdateAbilities(state, e, dt, 'enemy');

    // passive auto-level catch-up to player progression over time (no faction tech to avoid compounding)
    const targetLevel = Math.max(1, Math.floor(state.campaign.time/60) + 1);
    if(e.level < targetLevel){
      const prev = e.level||1;
      const hpRatio = e.hp / (e.maxHp || 1); // Preserve HP ratio
      
      // Manually scale stats by level increase without re-applying class multipliers
      const levelDiff = targetLevel - prev;
      const hpMult = Math.pow(1.12, levelDiff); // 12% per level
      const dmgMult = Math.pow(1.10, levelDiff); // 10% per level
      
      e.level = targetLevel;
      e.maxHp = Math.round(e.maxHp * hpMult);
      e.contactDmg = Math.round(e.contactDmg * dmgMult);
      e.hp = Math.max(1, Math.round(e.maxHp * hpRatio)); // Restore HP ratio
      
      npcInitAbilities(e, { state, source: 'enemyLevelUp' });
      state.ui.toast?.(`<span class="neg">Enemy (${e.team||'AI'}) leveled up to <b>${e.level}</b>.</span>`);
    }

    // Upgrade armor rarity when team tech increases
    const expectedTier = (state.factionTech?.[e.team]) || 1;
    if((e._rarityTier||1) < expectedTier){
      const role = e.variant || 'warrior';
      const rarity = getRarityByTier(expectedTier);
      const set = roleArmorSet(role, rarity);
      e.equipment = e.equipment || {};
      for(const [slot,item] of Object.entries(set)) e.equipment[slot] = item;
      e._rarityTier = expectedTier;
      state.ui.toast?.(`<span class="neg">Enemy (${e.team||'AI'}) armor improved to <b>${rarity.name}</b>.</span>`);
    }

    if(e.hp<=0) killEnemy(state, i, false); // Level scaling damage is not from player
  }
}

function updateLootTTL(state, dt){
  for(let i=state.loot.length-1;i>=0;i--){
    state.loot[i].timeLeft -= dt;
    if(state.loot[i].timeLeft<=0) state.loot.splice(i,1);
  }
}

function updateCampaignPoints(state, dt){
  if(state.campaignEnded) return;
  const playerFlags=getFriendlyFlags(state).length;
  const enemyFlags=getNonPlayerFlags(state).length;
  const PPS=1.2;
  state.campaign.playerPoints += playerFlags*PPS*dt;
  state.campaign.enemyPoints += enemyFlags*PPS*dt;
  // Per-team points tracking for rubberband logic
  const teamAFlags = getFlagsForTeam(state, 'teamA').length;
  const teamBFlags = getFlagsForTeam(state, 'teamB').length;
  const teamCFlags = getFlagsForTeam(state, 'teamC').length;
  state.teamPoints.player = (state.teamPoints.player||0) + playerFlags*PPS*dt;
  state.teamPoints.teamA = (state.teamPoints.teamA||0) + teamAFlags*PPS*dt;
  state.teamPoints.teamB = (state.teamPoints.teamB||0) + teamBFlags*PPS*dt;
  state.teamPoints.teamC = (state.teamPoints.teamC||0) + teamCFlags*PPS*dt;
  // Campaign progress tracked by points but campaign DOES NOT end early by points.
  // Economy: accrue faction gold for held flags over time
  const GOLD_PER_FLAG_PER_SEC = 3.0;
  // Player gold drip
  state.factionGold.player = (state.factionGold.player||0) + playerFlags*GOLD_PER_FLAG_PER_SEC*dt;
  // AI team gold drip
  const teams = ['teamA','teamB','teamC'];
  for(const team of teams){
    const flags = getFlagsForTeam(state, team).length;
    state.factionGold[team] = (state.factionGold[team]||0) + flags*GOLD_PER_FLAG_PER_SEC*dt;
  }
  // Auto tech upgrades when enough gold is banked
  const COST_PER_TIER = 1200;
  for(const key of ['player','teamA','teamB','teamC']){
    while((state.factionGold[key]||0) >= COST_PER_TIER && (state.factionTech[key]||1) < 5){
      state.factionGold[key] -= COST_PER_TIER;
      state.factionTech[key] = (state.factionTech[key]||1) + 1;
      // Optional: toast for player only
      if(key==='player') state.ui.toast(`<b>Squad technology advanced</b> to Tier ${state.factionTech[key]}.`);
    }
  }

  // Rubberband assistance: award gold every 60 seconds to trailing teams (shorter for testing)
  const cfg = state.rubberband || { gapThreshold:60, closeThreshold:30, baseTickGold:250, interval:60, nonLastScale:0.6, maxAssistPerTeam:10000 };
  const now = state.campaign.time||0;
  const teamKeys = ['player','teamA','teamB','teamC'];
  // Determine leader and last place by points
  const pts = {
    player: state.teamPoints.player||0,
    teamA: state.teamPoints.teamA||0,
    teamB: state.teamPoints.teamB||0,
    teamC: state.teamPoints.teamC||0
  };
  let leaderKey = 'player', leaderPts = pts.player;
  for(const k of teamKeys){ if(pts[k] > leaderPts){ leaderPts = pts[k]; leaderKey = k; } }
  let lastKey = 'player', lastPts = pts.player;
  for(const k of teamKeys){ if(pts[k] < lastPts){ lastPts = pts[k]; lastKey = k; } }
  for(const k of teamKeys){
    if(k===leaderKey) continue;
    const gap = leaderPts - pts[k];
    if(gap >= cfg.gapThreshold){
      const next = (state.rubberbandNext?.[k])||0;
      const awarded = (state.rubberbandAwarded?.[k])||0;
      if(now >= next && awarded < cfg.maxAssistPerTeam){
        // Scale bonus: last place gets full amount, others reduced
        const scale = (k===lastKey) ? 1.0 : (cfg.nonLastScale||0.6);
        const amt = Math.round((cfg.baseTickGold||250) * scale);
        state.factionGold[k] = (state.factionGold[k]||0) + amt;
        state.rubberbandAwarded[k] = awarded + amt;
        state.rubberbandNext[k] = now + (cfg.interval||60);
        // Notify
        const color = k==='player' ? '#6cf' : '#f66';
        state.ui.toast?.(`<span style="color:${color}"><b>${k}</b></span> received assistance: +${amt} gold`);
      }
    } else if(gap <= cfg.closeThreshold){
      // If close to leader, delay next tick further to avoid oscillation
      state.rubberbandNext[k] = Math.max(state.rubberbandNext[k]||0, now + (cfg.interval||60));
    }
  }
}

function die(state){
  if(state.player.dead) return;
  state.player.dead=true;
  state.player.respawnT=2.0;
  // Set all resources to 0 when dead
  state.player.hp = 0;
  state.player.mana = 0;
  state.player.stam = 0;
  state.player.shield = 0;
  state.ui.toast('<span class="neg"><b>You died.</b></span> Respawning at nearest captured flag...');
}

function respawn(state){
  const flags = getFriendlyFlags(state);
  // Choose nearest owned flag; fallback to home base if none
  const px = state.player.x||0, py = state.player.y||0;
  let hb = null; let bestD = Infinity;
  for(const f of flags){ const d = Math.hypot(f.x-px, f.y-py); if(d < bestD){ bestD = d; hb = f; } }
  if(!hb) hb = playerHome(state) || flags[0];
  const st=currentStats(state);
  state.player.x=hb.x; state.player.y=hb.y;
  const oldHP = state.player.hp;
  state.player.hp=st.maxHp; state.player.mana=st.maxMana; state.player.stam=st.maxStam;
  const gained = Math.max(0, st.maxHp - oldHP);
  if(gained > 0) notePlayerHpGain(state, gained, 'respawn', {});
  
  logPlayerEvent(state, 'HEAL', {
    source: 'respawn',
    amount: (st.maxHp - oldHP).toFixed(1),
    oldHP: oldHP.toFixed(1),
    newHP: st.maxHp,
    maxHP: st.maxHp
  });
  
  state.player.shield=0;
  state.player.dead=false;
  state.ui.toast(`Respawned at <b>${hb.name||'flag'}</b>.`);
}

function tryCastSlot(state, idx){
  if(state.player.dead || state.campaignEnded) return;
  const sk=getAbilityById(state.abilitySlots[idx]);
  if(!sk || sk.type!=='active') return;
  const weaponType = (state.player.equip?.weapon?.weaponType || '').toLowerCase();
  const isStaff = weaponType.includes('staff');
  const isDestructionStaff = weaponType.includes('destruction staff');
  const isHealingStaff = weaponType.includes('healing staff');
  
  // Log ability usage with weapon type for debugging
  console.log(`[ABILITY] ${sk.id} | WeaponType: "${weaponType || 'none'}" | Category: "${sk.category || 'none'}"`);
  
  // Weapon requirement checks
  if(sk.category && sk.category.includes('Healing Staff') && !isHealingStaff){
    state.ui.toast('Equip a Healing Staff to cast this.');
    return;
  }
  if(sk.category && sk.category.includes('Destruction Staff') && !isDestructionStaff){
    state.ui.toast('Equip a Destruction Staff to use this.');
    return;
  }
  // NOTE: Hero-exclusive abilities (Warrior/Mage/Knight/Tank) are restricted by UI
  // They can only be slotted by the matching hero class, so no runtime check needed here
  if(sk.targetType === 'projectile' && !isDestructionStaff){
    state.ui.toast('Ranged abilities require a Destruction Staff.');
    return;
  }
  if(state.player.cd[idx]>0) return;
  const st=currentStats(state);
  if(state.player.mana<sk.mana){ state.ui.toast('<span class="neg">Not enough mana.</span>'); return; }
  state.player.mana -= sk.mana;
  state.player.cd[idx]=sk.cd*(1-st.cdr);
  const wm = getWorldMouse(state);
  const a=Math.atan2(wm.y-state.player.y, wm.x-state.player.x);

  // Attribution for applied-effect auditing (buffs/dots should record which ability caused them)
  const effectSourceBase = {
    state,
    sourceAbilityId: sk.id,
    abilityId: sk.id,
    sourceType: 'ability',
    sourceKind: 'player',
    sourceCaster: state.player,
    sourceCasterId: state.player.id || state.player._id || null,
    sourceCasterName: state.player.name || 'Player',
    casterId: state.player.id || state.player._id || null,
    casterName: state.player.name || 'Player'
  };

  // Track player ability usage for cast-vs-applied auditing
  state.abilityLog = state.abilityLog || {};
  if(!state.abilityLog[sk.id]){
    state.abilityLog[sk.id] = {
      kind: 'player',
      count: 0,
      byRole: {},
      byCaster: {},
      lastCastTime: 0,
      avgCooldown: 0,
      expectedCd: ABILITY_META[sk.id]?.cd || 0
    };
  }
  {
    const currentTime = state.campaign?.time || 0;
    const playerLogId = String(state.player.id ?? state.player._id ?? 'player');
    const casterKey = `player:${playerLogId}`;
    const casterStats = state.abilityLog[sk.id].byCaster[casterKey] || {
      count: 0,
      lastCastTime: 0,
      sumIntervals: 0,
      intervalCount: 0,
      minInterval: Infinity
    };
    if(casterStats.lastCastTime > 0){
      const interval = currentTime - casterStats.lastCastTime;
      if(interval > 0){
        casterStats.sumIntervals += interval;
        casterStats.intervalCount += 1;
        casterStats.minInterval = Math.min(casterStats.minInterval, interval);
      }
    }
    casterStats.lastCastTime = currentTime;
    casterStats.count += 1;
    state.abilityLog[sk.id].byCaster[casterKey] = casterStats;

    const timeSinceLastCast = currentTime - state.abilityLog[sk.id].lastCastTime;
    if(state.abilityLog[sk.id].lastCastTime > 0 && timeSinceLastCast > 0){
      const count = state.abilityLog[sk.id].count || 1;
      state.abilityLog[sk.id].avgCooldown = ((state.abilityLog[sk.id].avgCooldown * count) + timeSinceLastCast) / (count + 1);
    }
    state.abilityLog[sk.id].lastCastTime = currentTime;

    const role = String(state.player.heroClass || state.player.role || state.player.class || 'PLAYER');
    state.abilityLog[sk.id].count++;
    state.abilityLog[sk.id].byRole[role] = (state.abilityLog[sk.id].byRole[role] || 0) + 1;
  }

  // auto-targeting helpers
  const findLowestHealthAlly = (range, excludePlayer=false) => {
    let best = excludePlayer ? null : state.player;
    let bestHp = excludePlayer ? Infinity : state.player.hp / currentStats(state).maxHp;
    for(const f of state.friendlies){
      if(f.respawnT>0) continue;
      const d = Math.hypot(f.x-state.player.x, f.y-state.player.y);
      if(d > range) continue;
      const hpRatio = f.hp / (f.maxHp || 1);
      if(hpRatio < bestHp){ bestHp = hpRatio; best = f; }
    }
    return best;
  };
  
  const findClosestEnemy = (range) => {
    let best = null;
    let bestD = range + 1;
    for(let i=0; i<state.enemies.length; i++){
      const e = state.enemies[i];
      if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
      const d = Math.hypot(e.x-state.player.x, e.y-state.player.y);
      if(d < bestD){ bestD = d; best = e; }
    }
    return best;
  };

  // helpers
  const areaDamage = (cx,cy,radius,dmg,dotId=null,buffId=null)=>{
    for(let i=state.enemies.length-1;i>=0;i--){
      const e=state.enemies[i];
      if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
      if(Math.hypot(e.x-cx,e.y-cy)<=radius){
        const res=applyDamageToEnemy(e,dmg,st,state,true);
        lifestealFrom(state,res.dealt,st);
        if(dotId) applyDotTo(e, dotId, effectSourceBase);
        if(buffId) applyBuffTo(e, buffId, effectSourceBase);
        if(e.hp<=0) killEnemy(state,i,true);
      }
    }
  };
  const healSelf = (amount)=>{ 
    const oldHP = state.player.hp;
    state.player.hp = clamp(state.player.hp + amount, 0, st.maxHp);
    const gained = Math.max(0, state.player.hp - oldHP);
    if(gained > 0) notePlayerHpGain(state, gained, 'ability_heal', {sourceAbilityId: sk?.id || null});
    
    logPlayerEvent(state, 'HEAL', {
      source: 'ability_heal',
      amount: amount.toFixed(1),
      oldHP: oldHP.toFixed(1),
      newHP: state.player.hp.toFixed(1),
      maxHP: st.maxHp
    });
  };
  const healAlliesAround = (cx,cy,radius,amount)=>{
    const oldHP = state.player.hp;
    healSelf(amount);
    
    // Note: healSelf already logs, so no need to log again
    
    for(const f of state.friendlies){ if(f.respawnT>0) continue; if(Math.hypot(f.x-cx,f.y-cy)<=radius){ f.hp = clamp(f.hp + amount, 0, f.maxHp||80); } }
  };
  const shieldAlliesAround = (cx,cy,radius,amount)=>{
    state.player.shield = clamp(state.player.shield + amount, 0, 420);
    for(const f of state.friendlies){ if(f.respawnT>0) continue; if(Math.hypot(f.x-cx,f.y-cy)<=radius){ f.shield = clamp((f.shield||0)+amount*0.6,0,320); } }
  };
  const reduceCooldowns = (pct)=>{ for(let i=0;i<state.player.cd.length;i++){ state.player.cd[i] = Math.max(0, state.player.cd[i] - pct*state.player.cd[i]); } };
  const applyBuffSelf = (buffId)=>{ try{ applyBuffTo(state.player, buffId, effectSourceBase); }catch{} };
  const applyBuffAlliesAround = (cx,cy,radius,buffId)=>{
    applyBuffSelf(buffId);
    for(const f of state.friendlies){ if(f.respawnT>0) continue; if(Math.hypot(f.x-cx,f.y-cy)<=radius){ try{ applyBuffTo(f, buffId, effectSourceBase); }catch{} } }
  };

  // --- ability effects ---
  switch(sk.id){
    // Destruction Staff
    case 'arc_bolt':{
      playPositionalSound(state, 'castingMagic1', state.player.x, state.player.y, 650, 0.5);
      spawnProjectile(state, state.player.x,state.player.y,a,460,5,14+st.atk*1.0,0,true,{ dotId:'shock', team:'player', element:'shock', maxRange:300, shooter: state.player, sourceAbilityId: sk.id, sourceKind: 'player', sourceType: 'ability_projectile' });
      const vx = Math.cos(a)*460, vy = Math.sin(a)*460;
      state.effects.bolts.push({ x: state.player.x + Math.cos(a)*12, y: state.player.y + Math.sin(a)*12, vx, vy, life: 0.9 });
      break;
    }
    case 'chain_light':{
      let hits=0, last=null;
      playPositionalSound(state, 'magicSpell333896', state.player.x, state.player.y, 650, 0.5);
      for(let hop=0; hop<5; hop++){
        let best=-1, bestD=999999;
        const ox=last?last.x:state.player.x;
        const oy=last?last.y:state.player.y;
        for(let i=0;i<state.enemies.length;i++){
          const e=state.enemies[i];
          if(last && e===last) continue;
          const d=Math.hypot(e.x-ox, e.y-oy);
          if(d<bestD){bestD=d; best=i;}
        }
        if(best===-1 || bestD>220) break;
        const e=state.enemies[best];
        const dmg=(14+st.atk*0.9)*(1-hop*0.12);
        const res=applyDamageToEnemy(e,dmg,st,state,true);
        lifestealFrom(state,res.dealt,st);
        applyDotTo(e,'shock', effectSourceBase);
        applyBuffTo(e,'slow', effectSourceBase);
        if(e.hp<=0) killEnemy(state,best,true);
        last=e; hits++;
      }
      state.ui.toast(`Chain Zap (${hits} hits)`);
      break;
    }
    case 'meteor_slam':{
      // Cast at mouse location with max range limit
      const maxRange = 400;
      const dx = wm.x - state.player.x;
      const dy = wm.y - state.player.y;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxRange);
      const angle = Math.atan2(dy, dx);
      const x = state.player.x + Math.cos(angle) * clampedDist;
      const y = state.player.y + Math.sin(angle) * clampedDist;
      const radius=115,dmg=24+st.atk*1.15;
      areaDamage(x,y,radius,dmg,'burn','slow');
      state.effects.flashes.push({ x, y, r: radius, life: 0.9, color: '#ff9a3c' });
      state.effects.slashes.push({ x, y, range: radius, arc: Math.PI*2, dir: 0, t: 0, color: '#ff4500' });
      logEffect(state, 'aoe_damage', 'meteor_slam', state.player, 'player', 'aoe');
      playPositionalSound(state, 'meteorSlam', x, y, 700, 0.5);
      state.ui.toast('Meteor Slam');
      break;
    }
    case 'piercing_lance':{
      playPositionalSound(state, 'magicSpell6005', state.player.x, state.player.y, 650, 0.45);
      spawnProjectile(state, state.player.x,state.player.y,a,560,6,20+st.atk*1.3,3,true,{ dotId:'bleed', team:'player', element:'arcane', maxRange:350, shooter: state.player, sourceAbilityId: sk.id, sourceKind: 'player', sourceType: 'ability_projectile' });
      logEffect(state, 'piercing_projectile', 'piercing_lance', state.player, 'player', 1);
      state.ui.toast('Piercing Lance');
      break;
    }
    case 'gravity_well':{
      // Auto-target closest enemy in range
      const target = findClosestEnemy(350);
      const x = target ? target.x : wm.x;
      const y = target ? target.y : wm.y;
      state.effects.wells.push({
        x,
        y,
        r: 150,
        timeLeft: 3.6,
        tick: 0.5,
        tickLeft: 0.5,
        dmgPerTick: 6 + st.atk*0.35,
        pull: 98,
        color: '#9b7bff',
        team: 'player',
        sourceAbilityId: sk.id,
        sourceKind: 'player',
        sourceType: 'ability',
        sourceCasterId: effectSourceBase.sourceCasterId,
        sourceCasterName: effectSourceBase.sourceCasterName
      });
      state.effects.flashes.push({ x, y, r: 150, life: 0.6, color: '#9b7bff' });
      logEffect(state, 'aoe_dot', 'gravity_well', state.player, 'player', 'aoe');
      playPositionalSound(state, 'magicalRockSpellAlt', x, y, 650, 0.45);
      state.ui.toast('Gravity Well');
      break;
    }

    // Healing Staff
    case 'heal_burst':{
      const instant = 18 + st.maxHp*0.10;
      healAlliesAround(state.player.x,state.player.y,120,instant);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 120, life: 0.5, color: '#ffd760' });
      state.effects.heals.push({t:4.0,tick:0.5,tl:0.5,amt:(2.0 + st.maxHp*0.012)});
      applyBuffAlliesAround(state.player.x,state.player.y,120,'regeneration');
      playPositionalSound(state, 'healingSpell1', state.player.x, state.player.y, 600, 0.5);
      state.ui.toast(`Heal Burst: +${Math.round(instant)} HP`);
      break;
    }
    case 'ward_barrier':{
      const amount=32+st.atk*1.05 + (st.shieldGain??0);
      shieldAlliesAround(state.player.x,state.player.y,140,amount);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 140, life: 0.6, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x,state.player.y,140,'fortified');
      playPositionalSound(state, 'bufferSpell', state.player.x, state.player.y, 650, 0.5);
      state.ui.toast(`Ward Barrier: +${Math.round(amount)} shield`);
      break;
    }
    case 'renewal_field':{
      // Apply a regen to self and nearby allies via periodic heals
      const amt = 4 + st.maxHp*0.01;
      state.effects.heals.push({t:5.0,tick:0.7,tl:0.7,amt:amt, targets:[state.player, ...state.friendlies.filter(f=>f.respawnT<=0)]});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 140, life: 0.6, color: '#ffd760' });
      applyBuffAlliesAround(state.player.x,state.player.y,140,'regeneration');
      playPositionalSound(state, 'castingMagic4', state.player.x, state.player.y, 650, 0.45);
      state.ui.toast('Renewal Field active');
      break;
    }
    case 'cleanse_wave':{
      const amt = 12 + st.maxHp*0.04;
      healAlliesAround(state.player.x,state.player.y,120,amt);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 120, life: 0.6, color: '#ffd760' });
      const shield = 18 + st.def*0.8;
      shieldAlliesAround(state.player.x,state.player.y,120,shield);
      applyBuffAlliesAround(state.player.x,state.player.y,120,'clarity');
      playPositionalSound(state, 'healingSpell1', state.player.x, state.player.y, 600, 0.45);
      state.ui.toast('Cleanse Wave');
      break;
    }
    case 'beacon_of_light':{
      const radius=140, amt=10 + st.maxHp*0.025;
      // auto-target lowest health ally in extended range
      const target = findLowestHealthAlly(200);
      const castX = target ? target.x : wm.x;
      const castY = target ? target.y : wm.y;
      // immediate pulse + rolling regen
      healAlliesAround(castX,castY,radius,amt);
      state.effects.heals.push({t:6.0,tick:1.0,tl:1.0,amt:amt*0.5, beacon:{x:castX,y:castY,r:radius}});
      state.effects.flashes.push({ x: castX, y: castY, r: radius, life: 0.6, color: '#ffd760' });
      applyBuffAlliesAround(castX,castY,radius,'regeneration');
      playPositionalSound(state, 'enchantedCast', castX, castY, 650, 0.5);
      state.ui.toast('Beacon of Light placed');
      break;
    }

    // Melee Weapons
    case 'slash':{
      const slash = pushSlashEffect(state, {t:0.12,arc:1.15,range:64,dmg:6+st.atk*0.75,dir:a, team:'player', sourceAbilityId: sk.id, sourceKind:'player', sourceType:'ability', sourceCasterId: effectSourceBase.sourceCasterId, sourceCasterName: effectSourceBase.sourceCasterName});
      logEffect(state, 'melee_slash', 'slash', state.player, 'player', 1);
      playPositionalSound(state, 'meleeAttack', state.player.x, state.player.y, 500, 0.35);
      break;
    }
    case 'blade_storm':{
      playPositionalSound(state, 'meleeAttack', state.player.x, state.player.y, 500, 0.4);
      state.effects.storms.push({
        t: 2.6,
        tick: 0.25,
        tl: 0.25,
        r: 120,
        dmg: 4 + st.atk*0.45,
        dotId: 'bleed',
        team: 'player',
        sourceAbilityId: sk.id,
        sourceKind: 'player',
        sourceType: 'ability',
        sourceCasterId: effectSourceBase.sourceCasterId,
        sourceCasterName: effectSourceBase.sourceCasterName
      });
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 120, life: 0.5, color: '#9b7bff' });
      logEffect(state, 'aoe_storm', 'blade_storm', state.player, 'player', 'aoe');
      state.ui.toast('Blade Storm');
      break;
    }
    case 'cleave':{
      pushSlashEffect(state, {t:0.18,arc:1.6,range:86,dmg:10+st.atk*1.1, dotId:'bleed',dir:a, team:'player', sourceAbilityId: sk.id, sourceKind:'player', sourceType:'ability', sourceCasterId: effectSourceBase.sourceCasterId, sourceCasterName: effectSourceBase.sourceCasterName});
      logEffect(state, 'melee_cleave', 'cleave', state.player, 'player', 1);
      playPositionalSound(state, 'meleeAttack', state.player.x, state.player.y, 500, 0.35);
      break;
    }
    case 'leap_strike':{
      const dist = Math.min(260, Math.hypot(wm.x-state.player.x, wm.y-state.player.y));
      const ax = Math.cos(a), ay = Math.sin(a);
      state.player.x = clamp(state.player.x + ax*dist, 0, state.engine.canvas.width);
      state.player.y = clamp(state.player.y + ay*dist, 0, state.engine.canvas.height);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 110, life: 0.7, color: '#9b7bff' });
      // Leap strike applies bleed, slow, and adds stun for more CC
      const enemiesToHit = state.enemies.filter(e => Math.hypot(e.x-state.player.x, e.y-state.player.y) <= 110);
      for(const e of enemiesToHit){
        applyDotTo(e, 'bleed', effectSourceBase);
        applyBuffTo(e, 'slow', effectSourceBase);
        applyBuffTo(e, 'stun', effectSourceBase);
        const dmg = 16+st.atk*1.2;
        applyDamageToEnemy(e, dmg, currentStats(state), state, true);
      }
      logEffect(state, 'aoe_leap', 'leap_strike', state.player, 'player', enemiesToHit.length);
      playPositionalSound(state, 'magicalWhooshFast', state.player.x, state.player.y, 650, 0.5);
      state.ui.toast('Leap Strike');
      break;
    }
    case 'warcry':{
      areaDamage(state.player.x,state.player.y,90,4+st.atk*0.4);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 90, life: 0.6, color: '#9b7bff' });
      shieldAlliesAround(state.player.x,state.player.y,120,20+st.def*0.8);
      state.player.stam = clamp(state.player.stam + 25, 0, st.maxStam);
      applyBuffAlliesAround(state.player.x,state.player.y,120,'swift_strikes');
      playPositionalSound(state, 'castingMagic2', state.player.x, state.player.y, 650, 0.5);
      break;
    }

    // Mage
    case 'mage_divine_touch':{
      // Targeted heal with HoT
      const instant = 25 + st.maxHp*0.12;
      if(state.selectedUnit && state.selectedUnit.unit && state.selectedUnit.unit.hp > 0){
        const target = state.selectedUnit.unit;
        if(state.selectedUnit.type === 'player'){
          healSelf(instant);
        } else if(state.selectedUnit.type === 'friendly'){
          target.hp = Math.min(target.hp + instant, target.maxHp);
        }
        // Apply HoT
        state.effects.heals.push({t:4.0,tick:0.8,tl:0.8,amt:3+st.maxHp*0.015, targets:[target]});
        applyBuffSelf('healing_empowerment');
        playPositionalSound(state, 'healingSpell1', state.player.x, state.player.y, 600, 0.5);
        state.ui.toast(`Divine Touch: +${Math.round(instant)} HP`);
      } else {
        healSelf(instant);
        state.effects.heals.push({t:4.0,tick:0.8,tl:0.8,amt:3+st.maxHp*0.015, targets:[state.player]});
        applyBuffSelf('healing_empowerment');
        playPositionalSound(state, 'healingSpell1', state.player.x, state.player.y, 600, 0.5);
        state.ui.toast(`Divine Touch (self): +${Math.round(instant)} HP`);
      }
      break;
    }
    case 'mage_sacred_ground':{
      // Offensive consecration: deals damage over time in the area (no healing)
      // Auto-target closest enemy in range
      const target = findClosestEnemy(300);
      const x = target ? target.x : wm.x;
      const y = target ? target.y : wm.y;
      const radius = 140;
      const dmgTick = 10 + st.atk*0.65;
      state.effects.wells.push({
        x,
        y,
        r: radius,
        timeLeft: 6.0,
        tick: 0.8,
        tickLeft: 0.8,
        dmgPerTick: dmgTick,
        pull: 0,
        color: '#ffb347',
        team: 'player',
        sourceAbilityId: sk.id,
        sourceKind: 'player',
        sourceType: 'ability',
        sourceCasterId: effectSourceBase.sourceCasterId,
        sourceCasterName: effectSourceBase.sourceCasterName
      });
      state.effects.flashes.push({ x, y, r: radius, life: 0.6, color: '#ffb347' });
      applyBuffAlliesAround(x, y, radius, 'blessed');
      playPositionalSound(state, 'elementalImpact', x, y, 700, 0.55);
      state.ui.toast('Sacred Ground sears foes');
      break;
    }
    case 'mage_radiant_aura':{
      // Radiant barrier: grants shields and speed, no direct healing
      const radius = 150;
      const shield = 24 + st.def*0.9;
      shieldAlliesAround(state.player.x,state.player.y,radius,shield);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: radius, life: 0.5, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x, state.player.y, radius, 'radiance');
      playPositionalSound(state, 'enchantedCast', state.player.x, state.player.y, 650, 0.5);
      state.ui.toast('Radiant Aura shields allies');
      break;
    }
    case 'mage_arcane_missiles':{
      // Projectile with DoT and Silence debuff
      const spread = 0.15;
      const baseDmg = 12+st.atk*0.9;
      [-spread,0,spread].forEach(off=>{
        spawnProjectile(state, state.player.x, state.player.y, a+off, 480, 5, baseDmg, 0, true, { dotId: 'arcane_burn', buffId: 'silence', team: 'player', element:'arcane', maxRange:280, shooter: state.player, sourceAbilityId: sk.id, sourceKind: 'player', sourceType: 'ability_projectile' });
      });
      playPositionalSound(state, 'magicalSpellCast', state.player.x, state.player.y, 700, 0.5);
      state.ui.toast('Arcane Missiles');
      break;
    }
    case 'mage_time_warp':{
      // Cooldown reduction
      reduceCooldowns(0.45);
      applyBuffSelf('temporal_flux');
      state.player.cd[idx] *= 0.6;
      playPositionalSound(state, 'castingMagic5', state.player.x, state.player.y, 650, 0.5);
      state.ui.toast('Time Warp');
      break;
    }

    // Knight
    case 'knight_shield_wall':{
      shieldAlliesAround(state.player.x,state.player.y,150,40+st.def*1.2);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 150, life: 0.6, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x,state.player.y,150,'guardian_stance');
      playPositionalSound(state, 'bufferSpell', state.player.x, state.player.y, 650, 0.5);
      break;
    }
    case 'knight_justice_strike':{
      const slash = pushSlashEffect(state, {t:0.16,arc:1.0,range:92,dmg:18+st.atk*1.4, dotId:'bleed',dir:a, team:'player', sourceAbilityId: sk.id, sourceKind:'player', sourceType:'ability', sourceCasterId: effectSourceBase.sourceCasterId, sourceCasterName: effectSourceBase.sourceCasterName});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 92, life: 0.5, color: slash.color });
      playPositionalSound(state, 'meleeAttack', state.player.x, state.player.y, 500, 0.4);
      break;
    }
    case 'knight_taunt':{
      areaDamage(state.player.x,state.player.y,110,8+st.atk*0.7,null,'vulnerability');
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 110, life: 0.6, color: '#9b7bff' });
      shieldAlliesAround(state.player.x,state.player.y,110,26+st.def*0.9);
      applyBuffSelf('iron_will');
      playPositionalSound(state, 'castingMagic3', state.player.x, state.player.y, 650, 0.5);
      break;
    }
    case 'knight_rally':{
      healAlliesAround(state.player.x,state.player.y,150,16+st.maxHp*0.04);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 150, life: 0.6, color: '#ffd760' });
      shieldAlliesAround(state.player.x,state.player.y,150,18+st.def*0.7);
      applyBuffAlliesAround(state.player.x,state.player.y,150,'battle_fury');
      playPositionalSound(state, 'castingMagic4', state.player.x, state.player.y, 650, 0.5);
      break;
    }
    case 'knight_banner':{
      state.effects.flashes.push({ x: wm.x, y: wm.y, r: 140, life: 0.7, color: '#ffb347' });
      applyBuffAlliesAround(wm.x,wm.y,140,'vigor');
      playPositionalSound(state, 'magicSpell353606', wm.x, wm.y, 700, 0.5);
      break;
    }

    // Warrior
    case 'warrior_life_leech':{
      const slash = pushSlashEffect(state, {t:0.16,arc:1.0,range:82,dmg:16+st.atk*1.2, leech:true, dotId:'bleed',dir:a, team:'player', sourceAbilityId: sk.id, sourceKind:'player', sourceType:'ability', sourceCasterId: effectSourceBase.sourceCasterId, sourceCasterName: effectSourceBase.sourceCasterName});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 82, life: 0.5, color: slash.color });
      playPositionalSound(state, 'meleeAttack', state.player.x, state.player.y, 500, 0.4);
      break;
    }
    case 'warrior_fortitude':{
      shieldAlliesAround(state.player.x,state.player.y,140,24+st.def*1.0);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 140, life: 0.5, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x,state.player.y,140,'fortified');
      playPositionalSound(state, 'castingMagic2', state.player.x, state.player.y, 650, 0.5);
      break;
    }
    case 'warrior_berserk':{
      state.player.stam = clamp(state.player.stam + 35, 0, st.maxStam);
      reduceCooldowns(0.18);
      applyBuffSelf('berserk');
      playPositionalSound(state, 'magicalWhooshFast', state.player.x, state.player.y, 650, 0.5);
      break;
    }
    case 'warrior_cleave':{
      const slash = pushSlashEffect(state, {t:0.20,arc:1.7,range:92,dmg:20+st.atk*1.35, dotId:'bleed', buffId:'weakness',dir:a, team:'player', sourceAbilityId: sk.id, sourceKind:'player', sourceType:'ability', sourceCasterId: effectSourceBase.sourceCasterId, sourceCasterName: effectSourceBase.sourceCasterName});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 92, life: 0.6, color: slash.color });
      playPositionalSound(state, 'meleeAttack', state.player.x, state.player.y, 500, 0.4);
      break;
    }
    case 'warrior_charge':{
      // Calculate distance to mouse
      const dx = wm.x - state.player.x;
      const dy = wm.y - state.player.y;
      const distToMouse = Math.hypot(dx, dy);
      const maxChargeDist = 240;
      
      // Charge toward mouse, capped at max distance
      const actualDist = Math.min(distToMouse, maxChargeDist);
      const angle = Math.atan2(dy, dx);
      const newX = state.player.x + Math.cos(angle) * actualDist;
      const newY = state.player.y + Math.sin(angle) * actualDist;
      
      // Clamp to map bounds
      state.player.x = clamp(newX, 0, state.mapWidth || state.engine.canvas.width);
      state.player.y = clamp(newY, 0, state.mapHeight || state.engine.canvas.height);
      
      areaDamage(state.player.x,state.player.y,90,14+st.atk*1.1,'bleed','stun');
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 90, life: 0.7, color: '#9b7bff' });
      state.effects.slashes.push({ x: state.player.x, y: state.player.y, range: 90, arc: Math.PI*2, dir: angle, t: 0, color: '#9b7bff' });
      applyBuffSelf('haste');
      playPositionalSound(state, 'magicalWhooshAlt', state.player.x, state.player.y, 700, 0.5);
      break;
    }

    // Tank
    case 'tank_ground_slam':{
      areaDamage(state.player.x,state.player.y,120,14+st.atk*1.0,'burn','slow');
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 120, life: 0.7, color: '#ff9a3c' });
      playPositionalSound(state, 'treeBurn', state.player.x, state.player.y, 750, 0.6);
      break;
    }
    case 'tank_iron_skin':{
      shieldAlliesAround(state.player.x,state.player.y,0,44+st.def*1.3);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 20, life: 0.5, color: '#ffb347' });
      healSelf(8+st.maxHp*0.02);
      applyBuffSelf('iron_will');
      playPositionalSound(state, 'castingMagic1', state.player.x, state.player.y, 600, 0.45);
      break;
    }
    case 'tank_bodyguard':{
      shieldAlliesAround(state.player.x,state.player.y,160,28+st.def*1.0);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 160, life: 0.6, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x,state.player.y,160,'guardian_stance');
      playPositionalSound(state, 'bufferSpell', state.player.x, state.player.y, 650, 0.5);
      break;
    }
    case 'tank_anchor':{
      areaDamage(state.player.x,state.player.y,90,8+st.atk*0.6,null,'stun');
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 90, life: 0.6, color: '#9b7bff' });
      shieldAlliesAround(state.player.x,state.player.y,120,26+st.def*0.9);
      applyBuffAlliesAround(state.player.x,state.player.y,120,'guardian_stance');
      playPositionalSound(state, 'magicalRockSpell', state.player.x, state.player.y, 650, 0.5);
      break;
    }
    case 'tank_seismic_wave':{
      spawnProjectile(state, state.player.x,state.player.y,a,420,6,18+st.atk*1.05,2,true,{ dotId:'shock', team:'player', element:'shock', maxRange:320, shooter: state.player, sourceAbilityId: sk.id, sourceKind: 'player', sourceType: 'ability_projectile' });
      playPositionalSound(state, 'magicalRockSpell', state.player.x, state.player.y, 650, 0.5);
      break;
    }

    default:
      state.ui.toast(`Cast ${sk.name}`);
  }
}

function updateHeals(state, dt){
  const st=currentStats(state);
  
  // LOG: Track active HOTs
  if(state.effects.heals.length > 0 && Math.random() < 0.1){
    console.log('[HOT STATUS]', state.effects.heals.length, 'active heals, player hp:', state.player.hp.toFixed(2));
  }
  
  for(let i=state.effects.heals.length-1;i>=0;i--){
    const h=state.effects.heals[i];
    h.t-=dt; h.tl-=dt;
    if(h.tl<=0){
      h.tl+=h.tick;
      const targets = h.targets ? (Array.isArray(h.targets)?h.targets:[h.targets]) : [state.player];
      
      // LOG: Track HOT tick
      const playerInTargets = targets.includes(state.player);
      if(playerInTargets){
        console.log('[HOT TICK]', 'amt:', h.amt, 'duration left:', h.t.toFixed(2), 'targets:', targets.length, 'beacon:', !!h.beacon);
      }
      
      if(h.beacon){
        const {x,y,r} = h.beacon;
        for(const t of targets){ 
          // Skip dead, removed, respawning units, or units at 0 HP
          if(!t || t.dead || t.hp === undefined || t.hp <= 0) continue;
          if(t === state.player && state.player.dead) continue;
          if(t !== state.player && t.respawnT && t.respawnT > 0) continue;
          
          if(Math.hypot((t.x||state.player.x)-x,(t.y||state.player.y)-y)<=r){ 
            const maxHp = t===state.player ? st.maxHp : (t.maxHp || st.maxHp); 
            const hpBefore = t.hp;
            t.hp = clamp(t.hp + h.amt, 0, maxHp); 
            const gained = t.hp - hpBefore;
            
            // LOG: Track healing to player
            if(t === state.player && gained > 0){
              notePlayerHpGain(state, gained, 'hot_tick', {
                sourceAbilityId: h.sourceAbilityId || null,
                sourceType: h.sourceType || null,
                sourceCaster: h.sourceCaster || null
              });
              console.log('[HOT HEAL PLAYER]', '+' + gained.toFixed(2), 'hp:', hpBefore.toFixed(2), '->', t.hp.toFixed(2), 'amt:', h.amt);
              // Add to combat log
              if(state.combatLog){
                state.combatLog.push({
                  time: (state.campaign?.time || 0).toFixed(2),
                  type: 'HOT_TICK',
                  target: 'Player',
                  gained: gained.toFixed(2),
                  hpBefore: hpBefore.toFixed(2),
                  hpAfter: t.hp.toFixed(2),
                  healAmount: h.amt.toFixed(2),
                  timeLeft: h.t.toFixed(2)
                });
              }
            }
            
            // Debug excessive healing
            if(gained > 50){
              console.warn('[HEAL OVER TIME] Large heal:', gained.toFixed(2), 'to', t.name || t.variant, 'amt:', h.amt, 'tick:', h.tick);
            }
          } 
        }
      } else {
        for(const t of targets){ 
          // Skip dead, removed, respawning units, or units at 0 HP
          if(!t || t.dead || t.hp === undefined || t.hp <= 0) continue;
          if(t === state.player && state.player.dead) continue;
          if(t !== state.player && t.respawnT && t.respawnT > 0) continue;
          
          const maxHp = t===state.player ? st.maxHp : (t.maxHp || st.maxHp); 
          const hpBefore = t.hp;
          t.hp = clamp(t.hp + h.amt, 0, maxHp);
          const gained = t.hp - hpBefore;
          
          // LOG: Track healing to player
          if(t === state.player && gained > 0){
            notePlayerHpGain(state, gained, 'hot_tick', {
              sourceAbilityId: h.sourceAbilityId || null,
              sourceType: h.sourceType || null,
              sourceCaster: h.sourceCaster || null
            });
            console.log('[HOT HEAL PLAYER]', '+' + gained.toFixed(2), 'hp:', hpBefore.toFixed(2), '->', t.hp.toFixed(2), 'amt:', h.amt);
            // Add to combat log
            if(state.combatLog){
              state.combatLog.push({
                time: (state.campaign?.time || 0).toFixed(2),
                type: 'HOT_TICK',
                target: 'Player',
                gained: gained.toFixed(2),
                hpBefore: hpBefore.toFixed(2),
                hpAfter: t.hp.toFixed(2),
                healAmount: h.amt.toFixed(2),
                timeLeft: h.t.toFixed(2)
              });
            }
          }
          
          // Debug excessive healing
          if(gained > 50){
            console.warn('[HEAL OVER TIME] Large heal:', gained.toFixed(2), 'to', t.name || t.variant, 'amt:', h.amt, 'tick:', h.tick);
          }
        }
      }
    }
    if(h.t<=0){
      // LOG: HOT expired
      if(h.targets && h.targets.includes(state.player)){
        console.log('[HOT EXPIRED] duration was:', (5.0 + h.t).toFixed(2), 'seconds');
        // Add to combat log
        if(state.combatLog){
          state.combatLog.push({
            time: (state.campaign?.time || 0).toFixed(2),
            type: 'HOT_EXPIRED',
            target: 'Player'
          });
        }
      }
      state.effects.heals.splice(i,1);
    }
  }
}

function updateSlashes(state, dt){
  if(state.effects.slashes.length===0) return;
  const st=currentStats(state);
  const wm = getWorldMouse(state);
  for(let i=state.effects.slashes.length-1;i>=0;i--){
    const s=state.effects.slashes[i];
    s.t-=dt;
    if(s.t<=0){ state.effects.slashes.splice(i,1); continue; }
    
    // Use slash origin position (x,y) if available, otherwise default to player position
    const originX = s.x !== undefined ? s.x : state.player.x;
    const originY = s.y !== undefined ? s.y : state.player.y;
    const isPlayerSlash = (s.x === undefined || (s.x === state.player.x && s.y === state.player.y));
    
    const ang = (typeof s.dir === 'number') ? s.dir : Math.atan2(wm.y-originY, wm.x-originX);
    
    // Only apply damage if this is a player slash (team check)
    if(isPlayerSlash || s.team === 'player'){
      for(let ei=state.enemies.length-1; ei>=0; ei--){
        const e=state.enemies[ei];
        if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
        const dx=e.x-originX, dy=e.y-originY;
        const d=Math.hypot(dx,dy);
        if(d>s.range) continue;
        const ea=Math.atan2(dy,dx);
        let diff=Math.abs(ea-ang);
        diff=Math.min(diff, Math.PI*2-diff);
        if(diff<=s.arc/2){
          const res=applyDamageToEnemy(e,s.dmg,st,state,true);
          lifestealFrom(state, res?.dealt, st);
          if(s.leech){ 
            const dealtNum = Number(res?.dealt);
            if(!Number.isFinite(dealtNum) || dealtNum <= 0) continue;
            const leechHeal = dealtNum * 0.5;
            const oldHP = state.player.hp;
            state.player.hp = clamp(state.player.hp + leechHeal, 0, st.maxHp);
            const gained = Math.max(0, state.player.hp - oldHP);
            if(gained > 0) notePlayerHpGain(state, gained, 'ability_leech', {sourceAbilityId: s.sourceAbilityId || null});
            
            logPlayerEvent(state, 'HEAL', {
              source: 'leech',
              amount: leechHeal.toFixed(1),
              damageDealt: dealtNum.toFixed(1),
              oldHP: oldHP.toFixed(1),
              newHP: state.player.hp.toFixed(1),
              maxHP: st.maxHp
            });
          }
          const effectOpts = {
            state,
            sourceAbilityId: s.sourceAbilityId || null,
            abilityId: s.sourceAbilityId || null,
            sourceType: s.sourceType || 'slash',
            sourceKind: s.sourceKind || s.team || null,
            sourceCasterId: s.sourceCasterId || null,
            sourceCasterName: s.sourceCasterName || null,
            casterId: s.sourceCasterId || null,
            casterName: s.sourceCasterName || null
          };

          if(s.dotId){
            applyDotTo(e, s.dotId, effectOpts);
          }
          if(s.buffId){
            applyBuffTo(e, s.buffId, effectOpts);
          }
          if(e.hp<=0) killEnemy(state, ei, true);
        }
      }
      // player melee can damage enemy-owned sites
      for(let si=state.sites.length-1; si>=0; si--){
        const site = state.sites[si];
        if(!site.id.startsWith('site_')) continue; // only capturable flags
        if(site.owner === 'player' || !site.owner) continue; // don't damage own or neutral flags
        const dx=site.x-originX, dy=site.y-originY;
        const d=Math.hypot(dx,dy);
        if(d>s.range) continue;
        const sa=Math.atan2(dy,dx);
        let diff=Math.abs(sa-ang);
        diff=Math.min(diff, Math.PI*2-diff);
        if(diff<=s.arc/2){
          if(!site.health) site.health = site.maxHealth || 500;
          site.health = clamp(site.health - s.dmg, 0, site.maxHealth);
          site._lastDamageTime = Date.now();
          // Update damage state
          const healthPct = site.health / site.maxHealth;
          if(site.health <= 0){
            site.damageState = 'destroyed';
            site.owner = null;
            site.prog = 0;
            delete site._captureTeam;
            stopOutpostFireSound(state, site);
          } else if(healthPct <= 0.70){
            site.damageState = 'damaged';
          } else {
            site.damageState = 'undamaged';
          }
          if(healthPct <= 0.70) playOutpostFireSound(state, site);
        }
      }
    }
  }
}

function updateStorms(state, dt){
  const st=currentStats(state);
  for(let i=state.effects.storms.length-1;i>=0;i--){
    const s=state.effects.storms[i];
    s.t-=dt; s.tl-=dt;
    if(s.tl<=0){
      s.tl+=s.tick;
      for(let ei=state.enemies.length-1; ei>=0; ei--){
        const e=state.enemies[ei];
        if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
        if(Math.hypot(e.x-state.player.x,e.y-state.player.y)<=s.r){
          const res=applyDamageToEnemy(e,s.dmg,st,state,true);
          lifestealFrom(state,res.dealt,st);
          if(s.dotId){
            const effectOpts = {
              state,
              sourceAbilityId: s.sourceAbilityId || null,
              abilityId: s.sourceAbilityId || null,
              sourceType: s.sourceType || 'storm',
              sourceKind: s.sourceKind || s.team || null,
              sourceCasterId: s.sourceCasterId || null,
              sourceCasterName: s.sourceCasterName || null,
              casterId: s.sourceCasterId || null,
              casterName: s.sourceCasterName || null
            };
            applyDotTo(e, s.dotId, effectOpts);
          }
          if(e.hp<=0) killEnemy(state, ei, true);
        }
      }
    }
    if(s.t<=0) state.effects.storms.splice(i,1);
  }
}

function updateWells(state, dt){
  for(let wi=state.effects.wells.length-1; wi>=0; wi--){
    const w=state.effects.wells[wi];
    w.timeLeft-=dt; w.tickLeft-=dt;

    const affectsPlayerSide = (w.team === 'enemy');
    if(affectsPlayerSide){
      const targets = [state.player, ...(state.friendlies||[]).filter(f=>f && f.respawnT<=0)];
      for(const t of targets){
        if(!t || t.hp === undefined || t.hp <= 0) continue;
        const dx=w.x-(t.x||0), dy=w.y-(t.y||0);
        const dist=Math.hypot(dx,dy)||1;
        if(dist<=w.r){
          t.x = clamp((t.x||0) + (dx/dist)*w.pull*dt, 0, state.mapWidth || state.engine.canvas.width);
          t.y = clamp((t.y||0) + (dy/dist)*w.pull*dt, 0, state.mapHeight || state.engine.canvas.height);
        }
      }
    } else {
      for(let i=state.enemies.length-1;i>=0;i--){
        const e=state.enemies[i];
        if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
        const dx=w.x-e.x, dy=w.y-e.y;
        const dist=Math.hypot(dx,dy)||1;
        if(dist<=w.r){
          e.x += (dx/dist)*w.pull*dt;
          e.y += (dy/dist)*w.pull*dt;
        }
      }
    }

    if(w.tickLeft<=0){
      w.tickLeft+=w.tick;
      if(affectsPlayerSide){
        const targets = [state.player, ...(state.friendlies||[]).filter(f=>f && f.respawnT<=0)];
        for(const t of targets){
          if(!t || t.hp === undefined || t.hp <= 0) continue;
          if(Math.hypot((t.x||0)-w.x, (t.y||0)-w.y)<=w.r){
            const maxHp = (t===state.player) ? currentStats(state).maxHp : (t.maxHp || currentStats(state).maxHp);
            const before = t.hp || 0;
            t.hp = clamp(before - w.dmgPerTick, 0, maxHp);
            const actualDmg = before - t.hp;
            // Audit: log well tick damage
            if(actualDmg > 0 && w.sourceAbilityId){
              logEffectApplied(state, {
                sourceAbilityId: w.sourceAbilityId,
                effectId: w.sourceAbilityId + '_dot_tick',
                targetId: t.id || t._id || null,
                effectType: 'damage',
                amount: actualDmg
              });
            }
          }
        }
      } else {
        const stNow=currentStats(state);
        for(let i=state.enemies.length-1;i>=0;i--){
          const e=state.enemies[i];
          if(Math.hypot(e.x-w.x, e.y-w.y)<=w.r){
            const before = e.hp || 0;
            const res=applyDamageToEnemy(e,w.dmgPerTick,stNow,state,true);
            lifestealFrom(state,res.dealt,stNow);
            const actualDmg = before - (e.hp || 0);
            // Audit: log well tick damage
            if(actualDmg > 0 && w.sourceAbilityId){
              logEffectApplied(state, {
                sourceAbilityId: w.sourceAbilityId,
                effectId: w.sourceAbilityId + '_dot_tick',
                targetId: e.id || e._id || null,
                effectType: 'damage',
                amount: actualDmg
              });
            }
            const effectOpts = {
              state,
              sourceAbilityId: w.sourceAbilityId || null,
              abilityId: w.sourceAbilityId || null,
              sourceType: w.sourceType || 'well',
              sourceKind: w.sourceKind || w.team || null,
              sourceCasterId: w.sourceCasterId || null,
              sourceCasterName: w.sourceCasterName || null,
              casterId: w.sourceCasterId || null,
              casterName: w.sourceCasterName || null
            };
            applyBuffTo(e,'slow', effectOpts);
            applyBuffTo(e,'curse', effectOpts);
            if(e.hp<=0) killEnemy(state,i,true);
          }
        }
      }
    }

    if(w.timeLeft<=0) state.effects.wells.splice(wi,1);
  }
}

function updateProjectiles(state, dt){
  const st=currentStats(state);
  for(let pi=state.projectiles.length-1; pi>=0; pi--){
    const p=state.projectiles[pi];
    p.life-=dt;
    p.x += p.vx*dt;
    p.y += p.vy*dt;
    const worldW = state.mapWidth || state.engine.canvas.width;
    const worldH = state.mapHeight || state.engine.canvas.height;
    // Check max range
    if(p.maxRange && p.startX !== undefined && p.startY !== undefined){
      const distFromStart = Math.hypot(p.x - p.startX, p.y - p.startY);
      if(distFromStart > p.maxRange){
        state.projectiles.splice(pi,1);
        continue;
      }
    }
    if(p.life<=0 || p.x<-80 || p.y<-80 || p.x>worldW+80 || p.y>worldH+80){
      state.projectiles.splice(pi,1);
      continue;
    }

    // Check terrain collision
    let hitTerrain = false;
    for(const t of state.trees || []){
      if(Math.hypot(p.x - t.x, p.y - t.y) <= (p.r + t.r)){ hitTerrain = true; break; }
    }
    if(!hitTerrain){
      for(const t of state.borderTrees || []){
        if(Math.hypot(p.x - t.x, p.y - t.y) <= (p.r + t.r)){ hitTerrain = true; break; }
      }
    }
    if(!hitTerrain){
      for(const mc of state.mountainCircles || []){
        if(Math.hypot(p.x - mc.x, p.y - mc.y) <= (p.r + mc.r)){ hitTerrain = true; break; }
      }
    }
    if(!hitTerrain){
      for(const rc of state.rockCircles || []){
        if(Math.hypot(p.x - rc.x, p.y - rc.y) <= (p.r + rc.r)){ hitTerrain = true; break; }
      }
    }
    if(!hitTerrain){
      for(const dc of state.decorativeCircles || []){
        if(Math.hypot(p.x - dc.x, p.y - dc.y) <= (p.r + dc.r)){ hitTerrain = true; break; }
      }
    }
    if(!hitTerrain){
      for(const m of state.mountains || []){
        for(const peak of m.peaks || []){
          if(Math.hypot(p.x - peak.x, p.y - peak.y) <= (p.r + peak.r)){ hitTerrain = true; break; }
        }
        if(hitTerrain) break;
      }
    }
    if(!hitTerrain){
      for(const m of state.borderMountains || []){
        for(const peak of m.peaks || []){
          if(Math.hypot(p.x - peak.x, p.y - peak.y) <= (p.r + peak.r)){ hitTerrain = true; break; }
        }
        if(hitTerrain) break;
      }
    }
    if(hitTerrain){
      state.projectiles.splice(pi,1);
      continue;
    }

    if(p.fromPlayer){
      for(let ei=state.enemies.length-1; ei>=0; ei--){
        const e=state.enemies[ei];
        if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
        if(Math.hypot(p.x-e.x,p.y-e.y)<=e.r+p.r){
          const res=applyDamageToEnemy(e,p.dmg,st,state,true);
          lifestealFrom(state,res.dealt,st);
          
          // Track damage dealt by friendly projectile shooter
          if(p.shooter && p.shooter !== state.player){
            p.shooter._damageDealt = (p.shooter._damageDealt || 0) + (res?.dealt || p.dmg);
          }
          
          // Apply on-hit dot/buff if provided (and attribute applications to the source ability)
          if(p.dotId || p.buffId){
            const effectOpts = {
              state,
              sourceAbilityId: p.sourceAbilityId || null,
              sourceType: p.sourceType || 'projectile',
              sourceKind: p.sourceKind || (p.team || (p.fromPlayer ? 'player' : 'enemy')),
              sourceCasterId: p.sourceCasterId || (p.shooter?.id ?? p.shooter?._id) || null,
              sourceCasterName: p.sourceCasterName || (p.shooter?.name ?? p.shooter?.variant) || null,
              sourceCaster: p.shooter || null,
              casterId: p.sourceCasterId || (p.shooter?.id ?? p.shooter?._id) || null,
              casterName: p.sourceCasterName || (p.shooter?.name ?? p.shooter?.variant) || null,
              abilityId: p.sourceAbilityId || null
            };
            if(p.dotId) applyDotTo(e, p.dotId, effectOpts);
            if(p.buffId) applyBuffTo(e, p.buffId, effectOpts);
          }
          if(e.hp<=0) killEnemy(state, ei, true);
          if(p.pierce>0) p.pierce-=1;
          else state.projectiles.splice(pi,1);
          break;
        }
      }
      // player projectiles can damage enemy-owned sites
      for(let si=state.sites.length-1; si>=0; si--){
        const s = state.sites[si];
        if(!s.id.startsWith('site_')) continue; // only capturable flags
        if(s.owner === 'player' || !s.owner) continue; // don't damage own or neutral flags
        if(Math.hypot(p.x-s.x, p.y-s.y) <= s.r + p.r){
          if(!s.health) s.health = s.maxHealth || 500;
          s.health = clamp(s.health - p.dmg, 0, s.maxHealth);
          s._lastDamageTime = Date.now();
          // Update damage state
          const healthPct = s.health / s.maxHealth;
          if(s.health <= 0){
            s.damageState = 'destroyed';
            s.owner = null;
            s.prog = 0;
            delete s._captureTeam;
            stopOutpostFireSound(state, s);
          } else if(healthPct <= 0.70){
            s.damageState = 'damaged';
          } else {
            s.damageState = 'undamaged';
          }
          if(healthPct <= 0.70) playOutpostFireSound(state, s);
          if(p.pierce>0) p.pierce-=1;
          else { state.projectiles.splice(pi,1); break; }
        }
      }
      // player projectiles can hit creatures (neutral)
      for(let ci=state.creatures.length-1; ci>=0; ci--){
        const c = state.creatures[ci];
        // Skip creatures that don't match current context
        if(state.inDungeon){
          if(c.dungeonId !== state.inDungeon) continue;
        } else {
          if(c.dungeonId) continue;
        }
        if(Math.hypot(p.x-c.x, p.y-c.y) <= (c.r||12) + p.r){
          const dead = applyDamageToCreature(c, p.dmg, state);
          
          // Track damage dealt by friendly projectile shooter
          if(p.shooter && p.shooter !== state.player){
            p.shooter._damageDealt = (p.shooter._damageDealt || 0) + p.dmg;
          }
          
          c.target = state.player;
          if(dead) killCreature(state, ci);
          if(p.pierce>0) p.pierce-=1; else { state.projectiles.splice(pi,1); break; }
        }
      }
    } else {
      // enemy or non-player projectiles can hit friendlies and player
      for(let fi=state.friendlies.length-1; fi>=0; fi--){
        const f = state.friendlies[fi];
        if(f.respawnT>0) continue;
        if(Math.hypot(p.x-f.x, p.y-f.y) <= f.r + p.r){
          applyShieldedDamage(state, f, p.dmg, p.shooter);
          if(p.dotId || p.buffId){
            const effectOpts = {
              state,
              sourceAbilityId: p.sourceAbilityId || null,
              sourceType: p.sourceType || 'projectile',
              sourceKind: p.sourceKind || (p.team || (p.fromPlayer ? 'player' : 'enemy')),
              sourceCasterId: p.sourceCasterId || (p.shooter?.id ?? p.shooter?._id) || null,
              sourceCasterName: p.sourceCasterName || (p.shooter?.name ?? p.shooter?.variant) || null,
              sourceCaster: p.shooter || null,
              casterId: p.sourceCasterId || (p.shooter?.id ?? p.shooter?._id) || null,
              casterName: p.sourceCasterName || (p.shooter?.name ?? p.shooter?.variant) || null,
              abilityId: p.sourceAbilityId || null
            };
            if(p.dotId) applyDotTo(f, p.dotId, effectOpts);
            if(p.buffId) applyBuffTo(f, p.buffId, effectOpts);
          }
          if(f.hp<=0){ killFriendly(state, fi, true); }
          state.projectiles.splice(pi,1);
          break;
        }
      }
      if(pi>=state.projectiles.length) continue; // removed by friendly hit
      if(!state.player.dead && Math.hypot(p.x-state.player.x,p.y-state.player.y)<=state.player.r+p.r){
        applyDamageToPlayer(state, p.dmg, st, p.shooter);
        if(p.dotId || p.buffId){
          const effectOpts = {
            state,
            sourceAbilityId: p.sourceAbilityId || null,
            sourceType: p.sourceType || 'projectile',
            sourceKind: p.sourceKind || (p.team || (p.fromPlayer ? 'player' : 'enemy')),
            sourceCasterId: p.sourceCasterId || (p.shooter?.id ?? p.shooter?._id) || null,
            sourceCasterName: p.sourceCasterName || (p.shooter?.name ?? p.shooter?.variant) || null,
            sourceCaster: p.shooter || null,
            casterId: p.sourceCasterId || (p.shooter?.id ?? p.shooter?._id) || null,
            casterName: p.sourceCasterName || (p.shooter?.name ?? p.shooter?.variant) || null,
            abilityId: p.sourceAbilityId || null
          };
          if(p.dotId) applyDotTo(state.player, p.dotId, effectOpts);
          if(p.buffId) applyBuffTo(state.player, p.buffId, effectOpts);
        }
        state.projectiles.splice(pi,1);
      }
    }
  }
}

function updateBolts(state, dt){
  if(!state.effects.bolts) return;
  for(let i=state.effects.bolts.length-1;i>=0;i--){
    const b=state.effects.bolts[i];
    b.life -= dt; if(b.life<=0){ state.effects.bolts.splice(i,1); continue; }
    b.x += (b.vx||0)*dt; b.y += (b.vy||0)*dt;
  }
}

function updateFlashes(state, dt){
  if(!state.effects.flashes) return;
  for(let i=state.effects.flashes.length-1;i>=0;i--){
    const f=state.effects.flashes[i];
    f.life -= dt; if(f.life<=0) state.effects.flashes.splice(i,1);
  }
}

function updateDots(state, dt){
  const st = currentStats(state);
  const typeToResist = { fire:'res_fire', ice:'res_ice', lightning:'res_lightning', nature:'res_poison', poison:'res_poison', physical:'res_bleed', shadow:'res_shadow', arcane:'res_arcane' };
  const getResistPct = (unit, type)=>{
    const key = typeToResist[type];
    if(!key) return 0;
    let val = 0;
    if(unit === state.player) val = st[key] || 0;
    else val = (unit?.resists?.[key]) || (unit?.[key]) || 0;
    return clamp(val, -0.8, 0.8);
  };
  const process = (unit)=>{
    if(!unit || !unit.dots || unit.dots.length===0) return;
    // Stop processing DoTs if unit is dead or has 0 HP
    if(unit === state.player && state.player.hp <= 0) return;
    for(let di=unit.dots.length-1; di>=0; di--){
      const d = unit.dots[di];
      d.t = Math.max(0, d.t - dt);
      d.tl = (d.tl ?? 1.0) - dt;
      if(d.tl <= 0){
        // apply tick
        const base = d.damage || (DOT_REGISTRY[d.id]?.damage) || 0;
        const type = d.type || DOT_REGISTRY[d.id]?.type;
        const resist = getResistPct(unit, type);
        const dmg = base * (1 - resist) * (d.stacks || 1);
        if(dmg>0){
          if(unit === state.player){
            applyDamageToPlayer(state, dmg, st, d.source);
          } else if(state.enemies.includes(unit)){
            // Check if DoT was applied by player or player's projectile/ability
            const fromPlayer = d.source === state.player || (d.sourceKind === 'player');
            const res = applyDamageToEnemy(unit, dmg, st, state, fromPlayer);
            if(unit.hp <= 0){ const idx = state.enemies.indexOf(unit); if(idx!==-1) killEnemy(state, idx, fromPlayer); }
          } else if(state.friendlies.includes(unit)){
            applyShieldedDamage(state, unit, dmg);
            if(unit.hp <= 0){ unit.dead = true; unit.respawnT = 10; }
          }
        }
        d.tl = DOT_REGISTRY[d.id]?.interval || 1.0;
      }
      if(d.t <= 0) unit.dots.splice(di,1);
    }
  };
  process(state.player);
  for(const e of state.enemies) process(e);
  for(const f of state.friendlies){ if(f.respawnT<=0) process(f); }
}

function applyBuffTo(entity, buffId, opts={}){
  const meta = BUFF_REGISTRY && BUFF_REGISTRY[buffId];
  if(!meta) return;
  entity.buffs = entity.buffs || [];
  const existing = entity.buffs.find(b=>b.id===buffId);
  const prevStacks = existing ? (existing.stacks||1) : 0;
  const cap = meta.maxStacks || 5;
  const isRefresh = !!existing;
  if(existing){
    existing.t = meta.duration || 5.0;
    existing.tl = (meta.ticks?.interval) || 1.0;
    const nextStacks = (existing.stacks||1)+1;
    existing.stacks = Math.min(cap, nextStacks);
  } else {
    entity.buffs.push({ id: buffId, t: meta.duration || 5.0, tl: (meta.ticks?.interval) || 1.0, stacks:1 });
  }

  // Applied-effect audit event (prefer explicit state, otherwise fall back to window.state)
  const auditState = opts.state || window.state;
  const sourceAbilityId = opts.sourceAbilityId ?? opts.abilityId ?? opts.ability ?? null;
  if(auditState){
    const targetKind = (entity === auditState?.player)
      ? 'player'
      : (auditState?.enemies?.includes(entity) ? 'enemy' : (auditState?.friendlies?.includes(entity) ? 'friendly' : null));
    let targetId = entity?.id ?? entity?._id ?? null;
    if((targetId === null || targetId === undefined || String(targetId) === '') && entity){
      // Guarantee stable ids for audit logs; some transient/spawned entities may not have ids yet.
      const team = (targetKind === 'enemy') ? 'enemy' : 'player';
      const kind = (targetKind === 'enemy') ? 'enemy' : (targetKind === 'friendly' ? 'friendly' : (targetKind === 'player' ? 'player' : 'unit'));
      targetId = ensureEntityId(auditState, entity, { team, kind });
    }
    logEffectApplied(auditState, {
      event: 'EFFECT_APPLIED',
      effectKind: 'buff',
      effectId: buffId,
      effectName: meta.name || buffId,
      action: isRefresh ? ((prevStacks > 0 && (existing?.stacks||1) > prevStacks) ? 'stack' : 'refresh') : 'apply',
      stacks: existing ? (existing.stacks||1) : 1,
      duration: meta.duration || 5.0,
      sourceAbilityId,
      sourceType: opts.sourceType || 'ability',
      sourceKind: opts.sourceKind || null,
      casterId: opts.casterId || opts.sourceCasterId || (opts.sourceCaster?.id ?? opts.sourceCaster?._id) || null,
      casterName: opts.casterName || (opts.sourceCaster?.name ?? opts.sourceCaster?.variant) || null,
      targetId: (targetId === null || targetId === undefined || String(targetId) === '') ? null : String(targetId),
      targetName: entity.name || entity.variant || null,
      targetKind
    });
  }

  // immediate shield gain when a buff carries a shield stat so the HUD reflects it
  // Check both meta.shield and meta.stats.shield for backward compatibility
  const shieldValue = meta.shield ?? meta.stats?.shield;
  if(typeof shieldValue === 'number'){
    const cap = entity.shieldCap || entity.maxShield || 420;
    const stacks = existing ? existing.stacks : 1;
    const gainStacks = Math.max(1, stacks - prevStacks);
    const gain = shieldValue * gainStacks;
    const before = entity.shield || 0;
    entity.shield = clamp((entity.shield||0) + gain, 0, cap);
    const after = entity.shield;
    
    // Log shield gain for player
    if(entity === window.state?.player){
      console.log('%c[SHIELD GAIN] +' + gain.toFixed(1) + ' from buff: ' + buffId, 'color: #6cf; font-weight: bold;');
      logDebug(window.state, 'SHIELD', 'Shield gained from buff', { buffId, gain, before, after, stacks });
      logPlayerEvent(window.state, 'SHIELD_GAINED', {
        amount: gain,
        before,
        after,
        source: `buff:${buffId}`
      });
    }
  }
  
  // Log buff application for player
  if(entity === window.state?.player){
    logPlayerEvent(window.state, 'BUFF_APPLIED', {
      buffName: meta.name || buffId,
      buffId,
      duration: meta.duration || 5.0,
      stacks: existing ? existing.stacks : 1
    });
  }
}

function applyDotTo(entity, dotId, opts={}){
  const meta = DOT_REGISTRY && DOT_REGISTRY[dotId];
  if(!meta || !entity) return;
  entity.dots = entity.dots || [];
  const duration = opts.duration || meta.duration || 6.0;
  const interval = meta.interval || 1.0;
  const cap = meta.maxStacks || 5;
  const damage = (meta.damage || 0) * (opts.powerMult || 1);
  const type = meta.type;
  const buffId = opts.buffId || meta.buffId;
  const existing = entity.dots.find(d=>d.id===dotId);
  const isRefresh = !!existing;
  if(existing){
    existing.t = duration;
    existing.tl = interval;
    existing.damage = damage || meta.damage;
    existing.type = type;
    const next = (existing.stacks||1)+1;
    existing.stacks = Math.min(cap, next);
  }
  else entity.dots.push({ id: dotId, t: duration, tl: interval, damage: damage || meta.damage, type, stacks:1 });

  // Applied-effect audit event
  const auditState = opts.state || window.state;
  const sourceAbilityId = opts.sourceAbilityId ?? opts.abilityId ?? opts.ability ?? null;
  if(auditState){
    const targetKind = (entity === auditState?.player)
      ? 'player'
      : (auditState?.enemies?.includes(entity) ? 'enemy' : (auditState?.friendlies?.includes(entity) ? 'friendly' : null));
    let targetId = entity?.id ?? entity?._id ?? null;
    if((targetId === null || targetId === undefined || String(targetId) === '') && entity){
      const team = (targetKind === 'enemy') ? 'enemy' : 'player';
      const kind = (targetKind === 'enemy') ? 'enemy' : (targetKind === 'friendly' ? 'friendly' : (targetKind === 'player' ? 'player' : 'unit'));
      targetId = ensureEntityId(auditState, entity, { team, kind });
    }
    logEffectApplied(auditState, {
      event: 'EFFECT_APPLIED',
      effectKind: 'dot',
      effectId: dotId,
      effectName: meta.name || dotId,
      action: isRefresh ? ((existing?.stacks||1) > 1 ? 'stack' : 'refresh') : 'apply',
      stacks: existing ? (existing.stacks||1) : 1,
      duration,
      interval,
      damage: damage || meta.damage || 0,
      dotType: type || null,
      sourceAbilityId,
      sourceType: opts.sourceType || 'ability',
      sourceKind: opts.sourceKind || null,
      casterId: opts.casterId || opts.sourceCasterId || (opts.sourceCaster?.id ?? opts.sourceCaster?._id) || null,
      casterName: opts.casterName || (opts.sourceCaster?.name ?? opts.sourceCaster?.variant) || null,
      targetId: (targetId === null || targetId === undefined || String(targetId) === '') ? null : String(targetId),
      targetName: entity.name || entity.variant || null,
      targetKind
    });
  }

  if(buffId) applyBuffTo(entity, buffId, opts);
}

function getCcState(unit){
  const res = { speedMod:0, rooted:false, stunned:false, silenced:false };
  if(!unit || !unit.buffs) return res;
  for(const b of unit.buffs){
    const meta = BUFF_REGISTRY?.[b.id];
    const stats = meta?.stats;
    if(!stats) continue;
    if(stats.ccImmune) return { speedMod:0, rooted:false, stunned:false, silenced:false };
    if(typeof stats.speed === 'number') res.speedMod += stats.speed;
    if(stats.rooted) res.rooted = true;
    if(stats.stunned) res.stunned = true;
    if(stats.silenced) res.silenced = true;
  }
  // rooted/stunned override speed
  if(res.stunned) res.rooted = true;
  return res;
}

function updateBuffs(state, dt){
  const tickBuffs = (unit)=>{
    if(!unit || !unit.buffs || unit.buffs.length===0) return;
    // Don't process buff ticks on dead player
    if(unit === state.player && state.player.dead) return;
    
    for(let bi=unit.buffs.length-1; bi>=0; bi--){
      const b = unit.buffs[bi];
      const meta = BUFF_REGISTRY?.[b.id];
      const interval = meta?.ticks?.interval ?? 0;
      
      // Only decrement timer if not infinite duration (like emperor_power)
      if(b.duration !== Infinity && b.t !== Infinity){
        b.t = Math.max(0, (b.t ?? 0) - dt);
      }
      
      if(interval>0){ b.tl = (b.tl ?? interval) - dt; if(b.tl<=0){
        // process tick effects
        const hp = meta?.ticks?.hp ?? 0;
        const mana = meta?.ticks?.mana ?? 0;
        const dmg = meta?.ticks?.damage ?? 0;
        
        // HP ticks: positive = healing, negative = damage (treat as damage to respect shields/resistances)
        if(hp>0){ 
          const oldHP = unit.hp;
          unit.hp = clamp((unit.hp ?? 0) + hp, 0, unit.maxHp ?? 9999);
          
          // Log buff healing for player
          if(unit === state.player){
            logPlayerEvent(state, 'HEAL', {
              source: 'buff_tick',
              buffName: b.id,
              amount: hp.toFixed(1),
              oldHP: oldHP.toFixed(1),
              newHP: unit.hp.toFixed(1),
              maxHP: unit.maxHp
            });
          }
        } else if(hp<0){
          // Negative HP should be treated as damage (go through damage system)
          const absDmg = Math.abs(hp);
          if(unit === state.player){
            const st = currentStats(state);
            applyDamageToPlayer(state, absDmg, st, buff.source);
          } else if(state.enemies.includes(unit)){
            const st = currentStats(state);
            const res = applyDamageToEnemy(unit, absDmg, st, state, false);
            if(unit.hp<=0){ const idx = state.enemies.indexOf(unit); if(idx!==-1) killEnemy(state, idx, true); }
          } else if(state.friendlies.includes(unit)){
            applyShieldedDamage(state, unit, absDmg);
            if(unit.hp<=0){ unit.dead = true; unit.respawnT = 10; }
          }
        }
        
        if(mana!==0){ unit.mana = clamp((unit.mana ?? 0) + mana, 0, unit.maxMana ?? 9999); }
        if(dmg>0){
          if(state.enemies.includes(unit)){
            const st = currentStats(state);
            const res = applyDamageToEnemy(unit, dmg, st, state, true);
            if(unit.hp<=0){ const idx = state.enemies.indexOf(unit); if(idx!==-1) killEnemy(state, idx, true); }
          } else if(state.friendlies.includes(unit)) {
            applyShieldedDamage(state, unit, dmg);
            if(unit.hp<=0){ unit.dead = true; unit.respawnT = 10; }
          }
        }
        b.tl = interval;
      } }
      if((b.t ?? 0) <= 0) unit.buffs.splice(bi,1);
    }
  };
  tickBuffs(state.player);
  for(const e of state.enemies) tickBuffs(e);
  for(const f of state.friendlies){ if(f.respawnT<=0) tickBuffs(f); }
}

function updateDamageNums(state, dt){
  const arr = state.effects.damageNums;
  if(!arr || arr.length===0) return;
  for(let i=arr.length-1;i>=0;i--){
    const d=arr[i];
    d.life -= dt;
    d.y += (d.vy||-18)*dt;
    if(d.life<=0) arr.splice(i,1);
  }
}

function makeLegendaryItem(state){
  const rarity = { key:'legend', name:'Legendary', color: cssVar('--legend') };
  const slot = ARMOR_SLOTS[randi(0, ARMOR_SLOTS.length-1)];
  // If weapon slot selected, create a legendary weapon instead of armor
  if(slot === 'weapon'){
    const WEAPON_TYPES = ['Destruction Staff', 'Healing Staff', 'Axe', 'Sword', 'Dagger', 'Greatsword'];
    const weaponType = WEAPON_TYPES[randi(0, WEAPON_TYPES.length-1)];
    return makeWeapon(weaponType, rarity);
  }
  return makeArmor(slot, rarity);
}

function awardCampaignLegendary(state){
  const item = makeLegendaryItem(state);
  // always add legendary to inventory (unlimited storage)
  state.inventory.push(item);
  state.ui.toast(`<b>Campaign Reward:</b> You received a <b class="${rarityClass(item.rarity.key)}">${item.name}</b>`);
}

// Dungeon utilities
function spawnDungeonEnemies(state, dungeon){
  // Spawn 10 dungeon creatures + 1 boss creature at dungeon location
  const cx = dungeon.x, cy = dungeon.y;
  
  // Use existing CREATURE_TYPES for dungeon spawns (goblins, wolves, bears)
  const dungeonCreatureTypes = CREATURE_TYPES.filter(ct => ct); // All creature types
  
  // Spawn 10 regular dungeon creatures (hostile wildlife)
  for(let i=0;i<10;i++){
    const ang = Math.random()*Math.PI*2; 
    const dist = 20 + Math.random()*80;
    const ct = dungeonCreatureTypes[randi(0, dungeonCreatureTypes.length-1)];
    
    // Create creature with dungeon-scaled stats (tougher than world creatures)
    const creature = { 
      x: cx + Math.cos(ang)*dist, 
      y: cy + Math.sin(ang)*dist, 
      r: ct.r || 12, 
      key: ct.key,
      name: ct.name,
      color: ct.color || '#8b4513',
      maxHp: Math.floor(ct.hp * 1.3),  // 30% tougher than world creatures
      hp: Math.floor(ct.hp * 1.3), 
      speed: ct.speed || 70, 
      contactDmg: ct.dmg + 3, // +3 damage in dungeons
      hitCd: 0, 
      xp: 15, 
      attacked: false,
      agro_range: ct.agro || 110,
      dungeonId: dungeon.id,
      variant: ct.variant || ct.key,
      wander: { t: 1.0, ang: Math.random()*Math.PI*2 }
    };
    
    state.creatures.push(creature);
  }
  
  // Spawn dungeon boss creature (much tougher bear-type)
  const bearType = CREATURE_TYPES.find(ct => ct.key === 'bear') || CREATURE_TYPES[0];
  
  // Randomly select a boss icon for dungeon boss
  const bossIconNames = ['archmage', 'balrogath', 'bloodfang', 'gorothar', 'malakir', 'tarrasque', 'venomQueen', 'vorrak', 'zalthor'];
  const randomIcon = bossIconNames[Math.floor(Math.random() * bossIconNames.length)];
  
  const boss = { 
    x: cx, 
    y: cy, 
    r: 26, 
    key: 'boss_bear',
    name: 'Dungeon Boss',
    color: '#8b0000',
    maxHp: 620, 
    hp: 620, 
    speed: 50, 
    contactDmg: 22, 
    hitCd: 0, 
    xp: 120, 
    attacked: false,
    agro_range: 150,
    boss: true, 
    bossIcon: randomIcon,
    dungeonId: dungeon.id,
    variant: 'bear',
    wander: { t: 1.0, ang: Math.random()*Math.PI*2 }
  };
  
  state.creatures.push(boss);
  console.log('[DUNGEON] Spawned 10 creatures + 1 boss creature at', dungeon.name);
}

function enterDungeon(state, dungeon){
  if(!dungeon || dungeon.cleared) return;
  // save world player/camera position
  state._savedWorld = { px: state.player.x, py: state.player.y, cam: { x: state.camera.x, y: state.camera.y, zoom: state.camera.zoom } };
  
  // Save group member positions and bring them into dungeon
  state._savedGroupPositions = [];
  if(state.group && state.group.members){
    for(const memberId of state.group.members){
      const ally = state.friendlies.find(f => f.id === memberId && f.respawnT <= 0);
      if(ally){
        state._savedGroupPositions.push({ id: memberId, x: ally.x, y: ally.y });
        // Teleport group member to dungeon with player (spread in small circle)
        const ang = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 30;
        ally.x = dungeon.x + Math.cos(ang) * dist;
        ally.y = dungeon.y + Math.sin(ang) * dist;
      }
    }
  }
  
  // move player to dungeon center and mark dungeon active
  state.player.x = dungeon.x; state.player.y = dungeon.y;
  state.camera.x = dungeon.x; state.camera.y = dungeon.y;
  // ensure overlays are closed and game is unpaused so dungeon logic runs
  state.mapOpen = false; state.showInventory = false; state.showSkills = false; state.showLevel = false; state.inMenu = false; state.paused = false;
  state.inDungeon = dungeon.id;
  if(state.ui){ state.ui.invOverlay && state.ui.invOverlay.classList && state.ui.invOverlay.classList.remove('show'); state.ui.skillsOverlay && state.ui.skillsOverlay.classList && state.ui.skillsOverlay.classList.remove('show'); state.ui.mapOverlay && state.ui.mapOverlay.classList && state.ui.mapOverlay.classList.remove('show'); }
  const memberCount = state._savedGroupPositions.length;
  state.ui.toast(`<b>Entered</b> ${dungeon.name}${memberCount > 0 ? ` with ${memberCount} ${memberCount === 1 ? 'ally' : 'allies'}` : ''}`);
  spawnDungeonEnemies(state, dungeon);
}

function exitDungeon(state){
  const id = state.inDungeon;
  if(!id) return;
  const dungeon = state.dungeons.find(d=>d.id===id);
  if(dungeon) dungeon.cleared = true;
  // Remove any remaining dungeon creatures
  for(let i=state.creatures.length-1;i>=0;i--){ 
    if(state.creatures[i].dungeonId === id) state.creatures.splice(i,1); 
  }
  // Also remove any dungeon enemies (in case there are any legacy ones)
  for(let i=state.enemies.length-1;i>=0;i--){ 
    if(state.enemies[i].dungeonId === id) state.enemies.splice(i,1); 
  }
  // restore player position and camera
  if(state._savedWorld){ state.player.x = state._savedWorld.px; state.player.y = state._savedWorld.py; state.camera.x = state._savedWorld.cam.x; state.camera.y = state._savedWorld.cam.y; state.camera.zoom = state._savedWorld.cam.zoom; }
  
  // Restore group member positions
  if(state._savedGroupPositions){
    for(const saved of state._savedGroupPositions){
      const ally = state.friendlies.find(f => f.id === saved.id);
      if(ally){
        ally.x = saved.x;
        ally.y = saved.y;
      }
    }
    state._savedGroupPositions = [];
  }
  
  state.inDungeon = false;
  state.ui.toast('Dungeon cleared.');
}

function fireLightOrHeavy(state, heldMs){
  if(state.player.dead || state.campaignEnded) return;
  // do not allow attacks while in UI or map
  if(state.showInventory || state.inMenu || state.mapOpen) return;

  const weaponType = (state.player.equip?.weapon?.weaponType || '').toLowerCase();
  const hasWeapon = !!state.player.equip?.weapon;
  const isStaff = weaponType.includes('staff');

  const st = currentStats(state);
  const m = state.input.mouse;
  const now = performance.now();
  const cdMs = 1000; // 1 second cooldown for all light attacks
  if(now - (m.lastShot||0) < cdMs) return;
  m.lastShot = now;

  const heavyMs = 380;
  const isHeavy = heldMs >= heavyMs;
  const wm = getWorldMouse(state);
  const a = Math.atan2(wm.y-state.player.y, wm.x-state.player.x);

  if(isStaff){
    if(state.player.inWater){ state.ui.toast('<span class="neg">Cannot attack while in water.</span>'); return; }
    if(isHeavy){
      const manaCost=8;
      if(state.player.mana<manaCost){ state.ui.toast('<span class="neg">Not enough mana for heavy.</span>'); return; }
      state.player.mana -= manaCost;
      spawnProjectile(state, state.player.x,state.player.y,a,390,7, 16+st.atk*1.2, 1, true);
    } else {
      spawnProjectile(state, state.player.x,state.player.y,a,560,4, 6+st.atk*0.6, 0, true);
    }
    return;
  }

  // Melee (any non-staff weapon or unarmed)
  const unarmed = !hasWeapon;
  let base;
  if(unarmed){
    base = isHeavy
      ? { t:0.22, arc:1.25, range:70, dmg:6 + st.atk*0.45 }
      : { t:0.16, arc:1.05, range:60, dmg:3 + st.atk*0.30 };
  } else {
    base = isHeavy
      ? { t:0.22, arc:1.6, range:95, dmg:14 + st.atk*1.0 }
      : { t:0.16, arc:1.3, range:85, dmg:8 + st.atk*0.7 };
  }
  // Align the slash to current mouse direction
  base.dir = a;
  base.team = 'player';
  base.weapon = state.player.equip?.weapon;
  base.x = state.player.x;
  base.y = state.player.y;
  pushSlashEffect(state, base);
}

// Helper to determine what interaction prompt should be shown
export function getInteractionPrompt(state){
  if(!state.player || state.player.dead) return null;
  
  // Check for dungeon entry
  if(state.dungeons){
    for(const d of state.dungeons){
      const dd = Math.hypot(state.player.x - d.x, state.player.y - d.y);
      if(dd <= Math.max(72, d.r+20) && !d.cleared){
        return { text: 'Enter Dungeon', action: 'dungeon' };
      }
    }
  }
  
  // Check for marketplace access (home base or captured flag)
  const homeBase = playerHome(state);
  if(homeBase){
    const dist = Math.hypot(state.player.x - homeBase.x, state.player.y - homeBase.y);
    if(dist <= 120){
      return { text: 'to Open Base Menu', action: 'base' };
    }
  }
  
  // Check captured flag sites
  if(state.sites){
    for(const s of state.sites){
      if(s.owner === 'player' && s.id && s.id.startsWith('site_')){
        const dist = Math.hypot(state.player.x - s.x, state.player.y - s.y);
        if(dist <= 80){
          return { text: 'to Open Base Menu', action: 'base' };
        }
      }
    }
  }
  
  // Check for nearby loot
  if(state.loot){
    for(const item of state.loot){
      if(!item || !item.x || !item.y) continue;
      const dist = Math.hypot(state.player.x - item.x, state.player.y - item.y);
      if(dist <= 36){ // pickup radius
        return { text: 'Pick Up Loot', action: 'pickup' };
      }
    }
  }
  
  return null;
}

export function handleHotkeys(state, dt){
  // track hold time for heavy
  const m=state.input.mouse;
  if(m.lDown) m.lHeldMs += dt*1000;

  // ESC menu: close any open overlays first, otherwise toggle menu
  const escDown = state.input.keysDown.has(state.binds.menu);
  if(escDown && !state._escLatch){
    state._escLatch = true;
    // Close weapon preview if open
    const weaponPreview = document.getElementById('weaponPreview');
    if(weaponPreview && weaponPreview.style.display === 'flex'){
      weaponPreview.style.display = 'none';
    } else {
      // Check if any UI is open (including menu)
      const anyUiOpen = state.showInventory || state.showSkills || state.showLevel || state.mapOpen || state.showMarketplace || state.showBaseActions || state.showGarrison || state.showSaves || state.selectedUnit;
      const menuOpen = state.inMenu;
      
      if(anyUiOpen){
        // Close active UI first (not the menu)
        state.showInventory = false; 
        state.showSkills = false; 
        state.showLevel = false; 
        state.mapOpen = false; 
        state.showMarketplace = false;
        state.showBaseActions = false;
        state.showGarrison = false;
        state.showSaves = false;
        if(state.ui) { 
          state.ui.invOverlay.classList.remove('show'); 
          state.ui.mapOverlay && state.ui.mapOverlay.classList && state.ui.mapOverlay.classList.remove('show'); 
          state.ui.marketplaceOverlay && state.ui.marketplaceOverlay.classList && state.ui.marketplaceOverlay.classList.remove('show');
          state.ui.baseActionsOverlay && state.ui.baseActionsOverlay.classList && state.ui.baseActionsOverlay.classList.remove('show');
          state.ui.garrisonOverlay && state.ui.garrisonOverlay.classList && state.ui.garrisonOverlay.classList.remove('show');
          state.ui.saveOverlay && state.ui.saveOverlay.classList && state.ui.saveOverlay.classList.remove('show');
          // Close unit inspection panel if open
          if(state.selectedUnit){
            state.ui.unitInspectionPanel.style.display = 'none';
            state.ui.unitInspectionContent.style.display = 'none';
            state.selectedUnit = null;
          }
        }
        if(!state.campaignEnded) state.paused = false;
      } else if(menuOpen){
        // If only menu is open, close it
        state.ui.escOverlay.classList.remove('show');
        state.inMenu = false;
        if(!state.campaignEnded) state.paused = false;
      } else {
        // Nothing is open, open the menu
        state.ui.toggleMenu(true);
      }
    }
  }
  if(!escDown) state._escLatch=false;

  // Inventory
  const invDown = state.input.keysDown.has(state.binds.inventory);
  if(invDown && !state._invLatch && !state.inMenu){
    state._invLatch=true;
    state.ui.toggleInventory(!state.showInventory);
  }
  if(!invDown) state._invLatch=false;

  // Loadout 1 (default: [)
  const loadout1Down = state.input.keysDown.has(state.binds.loadout1);
  if(loadout1Down && !state._loadout1Latch && !state.inMenu && !state.showInventory){
    state._loadout1Latch = true;
    const heroClass = state.player.class || 'warrior';
    if(loadLoadout(state, heroClass, 0)){
      state.ui.toast('✅ Loaded Loadout 1');
      state.ui.renderAbilityBar();
    } else {
      state.ui.toast('⚠️ Loadout 1 is empty');
    }
  }
  if(!loadout1Down) state._loadout1Latch = false;

  // Loadout 2 (default: ])
  const loadout2Down = state.input.keysDown.has(state.binds.loadout2);
  if(loadout2Down && !state._loadout2Latch && !state.inMenu && !state.showInventory){
    state._loadout2Latch = true;
    const heroClass = state.player.class || 'warrior';
    if(loadLoadout(state, heroClass, 1)){
      state.ui.toast('✅ Loaded Loadout 2');
      state.ui.renderAbilityBar();
    } else {
      state.ui.toast('⚠️ Loadout 2 is empty');
    }
  }
  if(!loadout2Down) state._loadout2Latch = false;

  // Loadout 3 (default: \)
  const loadout3Down = state.input.keysDown.has(state.binds.loadout3);
  if(loadout3Down && !state._loadout3Latch && !state.inMenu && !state.showInventory){
    state._loadout3Latch = true;
    const heroClass = state.player.class || 'warrior';
    if(loadLoadout(state, heroClass, 2)){
      state.ui.toast('✅ Loaded Loadout 3');
      state.ui.renderAbilityBar();
    } else {
      state.ui.toast('⚠️ Loadout 3 is empty');
    }
  }
  if(!loadout3Down) state._loadout3Latch = false;

  // Download Logs (default: ` backtick) - works anytime, not just in menu
  const downloadLogsDown = state.input.keysDown.has(state.binds.downloadLogs);
  if(downloadLogsDown && !state._downloadLogsLatch){
    state._downloadLogsLatch = true;
    // Trigger the download logs button click
    if(state.ui && state.ui.btnDownloadAllLogs){
      console.log('📥 Hotkey pressed: Downloading logs...');
      state.ui.btnDownloadAllLogs.click();
    } else {
      console.warn('⚠️ Download logs button not found');
    }
  }
  if(!downloadLogsDown) state._downloadLogsLatch = false;

  // Tab navigation keybinds (optional - unassigned by default)
  // Tab 0: Inventory
  if(state.binds.tabInventory && state.binds.tabInventory !== ''){
    const tabInvDown = state.input.keysDown.has(state.binds.tabInventory);
    if(tabInvDown && !state._tabInvLatch && !state.inMenu){
      state._tabInvLatch = true;
      state.ui.toggleInventory(true);
      // Switch to inventory tab (0)
      setTimeout(() => {
        const btn = document.querySelector('.tab-btn[data-tab="0"]');
        if(btn) btn.click();
      }, 10);
    }
    if(!tabInvDown) state._tabInvLatch = false;
  }
  
  // Tab 1: Skills
  if(state.binds.tabSkills && state.binds.tabSkills !== ''){
    const tabSkillsDown = state.input.keysDown.has(state.binds.tabSkills);
    if(tabSkillsDown && !state._tabSkillsLatch && !state.inMenu){
      state._tabSkillsLatch = true;
      state.ui.toggleInventory(true);
      setTimeout(() => {
        const btn = document.querySelector('.tab-btn[data-tab="1"]');
        if(btn) btn.click();
      }, 10);
    }
    if(!tabSkillsDown) state._tabSkillsLatch = false;
  }
  
  // Tab 2: Level
  if(state.binds.tabLevel && state.binds.tabLevel !== ''){
    const tabLevelDown = state.input.keysDown.has(state.binds.tabLevel);
    if(tabLevelDown && !state._tabLevelLatch && !state.inMenu){
      state._tabLevelLatch = true;
      state.ui.toggleInventory(true);
      setTimeout(() => {
        const btn = document.querySelector('.tab-btn[data-tab="2"]');
        if(btn) btn.click();
      }, 10);
    }
    if(!tabLevelDown) state._tabLevelLatch = false;
  }
  
  // Tab 3: Buffs
  if(state.binds.tabBuffs && state.binds.tabBuffs !== ''){
    const tabBuffsDown = state.input.keysDown.has(state.binds.tabBuffs);
    if(tabBuffsDown && !state._tabBuffsLatch && !state.inMenu){
      state._tabBuffsLatch = true;
      state.ui.toggleInventory(true);
      setTimeout(() => {
        const btn = document.querySelector('.tab-btn[data-tab="3"]');
        if(btn) btn.click();
      }, 10);
    }
    if(!tabBuffsDown) state._tabBuffsLatch = false;
  }
  
  // Tab 4: Group
  if(state.binds.tabGroup && state.binds.tabGroup !== ''){
    const tabGroupDown = state.input.keysDown.has(state.binds.tabGroup);
    if(tabGroupDown && !state._tabGroupLatch && !state.inMenu){
      state._tabGroupLatch = true;
      state.ui.toggleInventory(true);
      setTimeout(() => {
        const btn = document.querySelector('.tab-btn[data-tab="4"]');
        if(btn) btn.click();
      }, 10);
    }
    if(!tabGroupDown) state._tabGroupLatch = false;
  }
  
  // Tab 5: Allies
  if(state.binds.tabAllies && state.binds.tabAllies !== ''){
    const tabAlliesDown = state.input.keysDown.has(state.binds.tabAllies);
    if(tabAlliesDown && !state._tabAlliesLatch && !state.inMenu){
      state._tabAlliesLatch = true;
      state.ui.toggleInventory(true);
      setTimeout(() => {
        const btn = document.querySelector('.tab-btn[data-tab="5"]');
        if(btn) btn.click();
      }, 10);
    }
    if(!tabAlliesDown) state._tabAlliesLatch = false;
  }
  
  // Tab 7: Campaign
  if(state.binds.tabCampaign && state.binds.tabCampaign !== ''){
    const tabCampaignDown = state.input.keysDown.has(state.binds.tabCampaign);
    if(tabCampaignDown && !state._tabCampaignLatch && !state.inMenu){
      state._tabCampaignLatch = true;
      state.ui.toggleInventory(true);
      setTimeout(() => {
        const btn = document.querySelector('.tab-btn[data-tab="7"]');
        if(btn) btn.click();
      }, 10);
    }
    if(!tabCampaignDown) state._tabCampaignLatch = false;
  }

  // E key for selling/buying items when marketplace is open
  const eDown = state.input.keysDown.has('KeyE');
  if(eDown && !state._eLatch && state.showMarketplace){
    state._eLatch = true;
    
    // Try to buy the selected shop item first
    const shopItem = state._marketSelectedShopItem;
    if(shopItem){
      const affordable = state.player.gold >= shopItem.price;
      if(!affordable){
        state.ui.toast('Not enough gold!');
      } else {
        const it = shopItem.item;
        // Purchase item
        state.player.gold -= shopItem.price;
        
        // Services apply immediately
        if(it.kind === 'service'){
          if(it.serviceId === 'squad_armor' && typeof window.applySquadArmorUpgrade === 'function'){
            window.applySquadArmorUpgrade(state);
            state.marketCosts.squadArmor = Math.round((state.marketCosts.squadArmor||1000) * 1.3);
          } else if(it.serviceId === 'squad_level' && typeof window.applySquadLevelUpgrade === 'function'){
            window.applySquadLevelUpgrade(state);
            state.marketCosts.squadLevel = Math.round((state.marketCosts.squadLevel||800) * 1.25);
          }
        } else {
          // Add to inventory
          const itemCopy = JSON.parse(JSON.stringify(it));
          itemCopy.count = itemCopy.count || 1;
          if(itemCopy.kind === 'potion'){
            const existing = state.inventory.find(i => i.kind === 'potion' && i.type === itemCopy.type && i.rarity.key === itemCopy.rarity.key);
            if(existing){
              existing.count = (existing.count || 1) + 1;
            } else {
              state.inventory.push(itemCopy);
            }
          } else {
            state.inventory.push(itemCopy);
          }
        }
        
        const color = it.rarity?.color || '#fff';
        const formatGold = (g) => `${g}<span class="gold-icon">💰</span>`;
        state.ui.toast(`<span style="color:${color}"><b>${it.name}</b></span> added to inventory for ${formatGold(shopItem.price)}`);
        state.ui.updateGoldDisplay();
        state.ui.renderShop();
        state.ui.renderSellItems();
        state.ui.renderInventory?.();
      }
    } else {
      // Try to sell the last clicked/hovered item
      const item = state._marketSelectedItem;
      if(item){
        // Check if equipped
        const isEquipped = item.slot && state.equipped && state.equipped[item.slot] === item;
        if(isEquipped){
          state.ui.toast('Unequip this item before selling!');
        } else {
          const invIdx = state.inventory.indexOf(item);
          if(invIdx !== -1){
            const sellVal = item.rarity?.sellValue || 5;
            state.player.gold += sellVal;
            const color = item.rarity?.color || '#fff';
            
            if(item.count && item.count > 1){
              item.count--;
              state.ui.toast(`<span style="color:${color}"><b>${item.name}</b></span> sold for ${sellVal}g (${item.count} remaining)`);
            } else {
              state.inventory.splice(invIdx, 1);
              state.ui.toast(`<span style="color:${color}"><b>${item.name}</b></span> sold for ${sellVal}g`);
            }
            
            state.ui.updateGoldDisplay();
            state.ui.renderSellItems();
            state.ui.renderInventory?.();
          }
        }
      }
    }
  }
  if(!eDown) state._eLatch = false;

  // Interact (dungeons, loot, marketplace)
  const pickDown = state.input.keysDown.has(state.binds.interact);
  if(pickDown && !state._pickLatch && !state.inMenu && !state.showInventory && !state.showSkills && !state.showLevel && !state.showMarketplace){
    state._pickLatch=true;
    let interacted = false;
    
    // Priority 1: Check for dungeon entry
    if(state.dungeons){
      for(const d of state.dungeons){ 
        const dd = Math.hypot(state.player.x-d.x, state.player.y-d.y); 
        if(dd <= Math.max(72, d.r+20) && !d.cleared){ 
          enterDungeon(state, d); 
          interacted = true; 
          break; 
        } 
      }
    }
    
    // Priority 2: Check for marketplace access (home base or captured flag)
    if(!interacted){
      const homeBase = playerHome(state);
      let canAccess = false;
      
      if(homeBase){
        const dist = Math.hypot(state.player.x - homeBase.x, state.player.y - homeBase.y);
        if(dist <= 120){
          canAccess = true;
        }
      }
      
      // Also check if at captured flag site
      if(!canAccess){
        for(const s of state.sites){
          if(s.owner === 'player' && s.id && s.id.startsWith('site_')){
            const dist = Math.hypot(state.player.x - s.x, state.player.y - s.y);
            if(dist <= 80){
              canAccess = true;
              break;
            }
          }
        }
      }
      
      if(canAccess){
        state.ui.toggleBaseActions(true);
        interacted = true;
      }
    }
    
    // Priority 3: Pick up loot
    if(!interacted) pickupNearestLoot(state);
  }
  if(!pickDown) state._pickLatch=false;

  // Abilities
  for(let i=0;i<5;i++){
    const down = state.input.keysDown.has(state.binds['abil'+(i+1)]);
    const latchKey = '_aLatch'+i;
    if(down && !state[latchKey] && !state.paused){
      state[latchKey]=true;
      tryCastSlot(state, i);
    }
    if(!down) state[latchKey]=false;
  }

  // Potion use (only when NOT in inventory)
  const potionDown = state.input.keysDown.has(state.binds.potion);
  if(potionDown && !state._potionLatch && !state.paused && !state.inMenu && !state.showInventory && state.player.potion && !state.player.dead){
    state._potionLatch = true;
    const potion = state.player.potion;
    const st = currentStats(state);
    
    // Play potion pickup sound
    if(state.sounds?.potionPickup){
      const audio = state.sounds.potionPickup.cloneNode();
      audio.volume = 0.5;
      audio.play().catch(e => {});
    }
    
    // Check if potion has data.pct (old format) or buffs (new format)
    if(potion.data && potion.data.pct){
      // Old format with data.pct
      if(potion.type === 'hp'){
        const heal = Math.round(st.maxHp * potion.data.pct);
        const oldHP = state.player.hp;
        state.player.hp = clamp(state.player.hp + heal, 0, st.maxHp);
        const gained = Math.max(0, state.player.hp - oldHP);
        if(gained > 0) notePlayerHpGain(state, gained, 'potion', {potionName: potion.name});
        state.ui.toast(`Used <b class="${rarityClass(potion.rarity.key)}">${potion.name}</b>: +${heal} HP`);
        
        // Log potion healing
        logPlayerEvent(state, 'HEAL', {
          source: 'potion',
          potionName: potion.name,
          amount: heal,
          newHP: state.player.hp.toFixed(1),
          maxHP: st.maxHp
        });
      } else {
        const gain = Math.round(st.maxMana * potion.data.pct);
        state.player.mana = clamp(state.player.mana + gain, 0, st.maxMana);
        state.ui.toast(`Used <b class="${rarityClass(potion.rarity.key)}">${potion.name}</b>: +${gain} Mana`);
      }
    } else if(potion.buffs){
      // New format with buffs (instant heal/mana restore)
      if(potion.type === 'hp' && potion.buffs.hpRegen){
        const heal = potion.buffs.hpRegen * 20; // Convert regen to instant heal
        const oldHP = state.player.hp;
        state.player.hp = clamp(state.player.hp + heal, 0, st.maxHp);
        const gained = Math.max(0, state.player.hp - oldHP);
        if(gained > 0) notePlayerHpGain(state, gained, 'potion', {potionName: potion.name});
        state.ui.toast(`Used <b class="${rarityClass(potion.rarity.key)}">${potion.name}</b>: +${heal} HP`);
        
        // Log potion healing
        logPlayerEvent(state, 'HEAL', {
          source: 'potion',
          potionName: potion.name,
          amount: heal,
          newHP: state.player.hp.toFixed(1),
          maxHP: st.maxHp
        });
      } else if(potion.type === 'mana' && potion.buffs.manaRegen){
        const gain = potion.buffs.manaRegen * 20; // Convert regen to instant mana
        state.player.mana = clamp(state.player.mana + gain, 0, st.maxMana);
        state.ui.toast(`Used <b class="${rarityClass(potion.rarity.key)}">${potion.name}</b>: +${gain} Mana`);
      }
    }
    
    potion.count = (potion.count || 1) - 1;
    if(potion.count <= 0){
      state.player.potion = null;
    }
    state.ui.renderAbilityBar();
  }
  if(!potionDown) state._potionLatch = false;

  // Group auto-invite all allies (default key 8)
  const groupInviteAllDown = state.input.keysDown.has(state.binds.groupInviteAll);
  if(groupInviteAllDown && !state._groupInviteLatch && !state.paused && !state.inMenu){
    state._groupInviteLatch = true;
    if(state.ui && typeof state.ui.addAllAlliesToGroup === 'function'){
      state.ui.addAllAlliesToGroup();
    }
  }
  if(!groupInviteAllDown) state._groupInviteLatch = false;

  // Group auto-disband (default key 9)
  const groupDisbandDown = state.input.keysDown.has(state.binds.groupDisband);
  if(groupDisbandDown && !state._groupDisbandLatch && !state.paused && !state.inMenu){
    state._groupDisbandLatch = true;
    if(state.ui && typeof state.ui.disbandGroup === 'function'){
      state.ui.disbandGroup();
    }
  }
  if(!groupDisbandDown) state._groupDisbandLatch = false;

  // Inventory Q drop (when in inventory)
  if(potionDown && state.showInventory && !state._invQDropLatch){
    state._invQDropLatch = true;
    if(state.selectedIndex >= 0 && state.selectedIndex < state.inventory.length){
      const item = state.inventory[state.selectedIndex];
      state.inventory.splice(state.selectedIndex, 1);
      state.selectedIndex = -1; state.selectedEquipSlot = null;
      state.loot.push({x: state.player.x, y: state.player.y, r: 12, item, timeLeft: 30.0});
      state.ui.toast(`Dropped: <b class="${rarityClass(item.rarity.key)}">${item.name}</b>`);
      state.ui.renderInventory();
    }
  }
  if(!potionDown) state._invQDropLatch = false;

  // Mouse release light/heavy: we detect release edge by lDown going false and _mouseLatch true
  if(m.lDown && !state._mouseLatch){
    state._mouseLatch=true;
  }
  if(!m.lDown && state._mouseLatch){
    state._mouseLatch=false;
    const held=m.lHeldMs;
    m.lHeldMs=0;
    fireLightOrHeavy(state, held);
  }

  // Map toggle (M)
  const mapKey = state.input.keysDown.has('KeyM');
  if(mapKey && !state._mapLatch){ state._mapLatch = true; state.mapOpen = !state.mapOpen; state.paused = state.mapOpen; }
  if(!mapKey) state._mapLatch = false;

  // Save manager (F5 key)
  const saveKey = state.input.keysDown.has('F5');
  if(saveKey && !state._saveLatch && !state.inMenu && !state.showInventory){
    state._saveLatch = true;
    if(state.ui && state.ui.toggleSaves){
      state.ui.toggleSaves(true);
    }
  }
  if(!saveKey) state._saveLatch = false;

  // Inventory hotkeys when inventory is open: E = equip/use selected, Q = drop selected
  const eKey = state.input.keysDown.has('KeyE');
  if(eKey && !state._equipLatch && state.showInventory && !state.inMenu){
    state._equipLatch = true;
    if(state.ui && state.ui.equipSelected) state.ui.equipSelected();
  }
  if(!eKey) state._equipLatch = false;

  const qKey = state.input.keysDown.has('KeyQ');
  if(qKey && !state._dropInvLatch && state.showInventory && !state.inMenu){
    state._dropInvLatch = true;
    if(state.selectedIndex>=0 && state.selectedIndex < state.inventory.length){
      const it = state.inventory.splice(state.selectedIndex,1)[0];
      dropItemToWorld(state, it);
      state.selectedIndex = -1; state.selectedEquipSlot = null;
      state.ui.renderInventory();
    }
  }
  if(!qKey) state._dropInvLatch = false;

  // Helper: Calculate item overall rating
  function calculateItemRating(item){
    if(!item || !item.buffs) return 0;
    let rating = 0;
    const buffs = item.buffs;
    if(buffs.atk) rating += buffs.atk * 2;
    if(buffs.def) rating += buffs.def * 2;
    if(buffs.maxHp) rating += buffs.maxHp * 0.5;
    if(buffs.maxMana) rating += buffs.maxMana * 0.3;
    if(buffs.maxStam) rating += buffs.maxStam * 0.3;
    if(buffs.speed) rating += buffs.speed * 3;
    if(buffs.hpRegen) rating += buffs.hpRegen * 10;
    if(buffs.manaRegen) rating += buffs.manaRegen * 10;
    if(buffs.stamRegen) rating += buffs.stamRegen * 8;
    if(buffs.cdr) rating += buffs.cdr * 100;
    if(buffs.critChance) rating += buffs.critChance * 80;
    if(buffs.critMult) rating += buffs.critMult * 50;
    const rarityBonus = { common: 0, uncommon: 10, rare: 30, epic: 60, legend: 120 };
    rating += rarityBonus[item.rarity?.key || 'common'] || 0;
    return Math.round(rating);
  }

  // Weapon Preview (P key) when inventory is open
  const pKey = state.input.keysDown.has('KeyP');
  if(pKey && !state._previewLatch && state.showInventory && !state.inMenu){
    state._previewLatch = true;
    const previewOverlay = document.getElementById('weaponPreview');
    const previewImage = document.getElementById('weaponPreviewImage');
    const previewTitle = document.getElementById('weaponPreviewTitle');
    const previewError = document.getElementById('weaponPreviewError');
    const previewStats = document.getElementById('weaponPreviewStats');
    const previewStatsContent = document.getElementById('weaponPreviewStatsContent');
    
    if(previewOverlay){
      // Toggle preview if already open
      if(previewOverlay.style.display === 'flex'){
        previewOverlay.style.display = 'none';
      } else {
        // Get selected item
        const selectedItem = (state.selectedIndex>=0 && state.selectedIndex<state.inventory.length)
          ? state.inventory[state.selectedIndex]
          : (state.selectedEquipSlot && state.player.equip ? state.player.equip[state.selectedEquipSlot] : null);
        
        if(selectedItem && (selectedItem.kind === 'weapon' || selectedItem.kind === 'armor' || selectedItem.kind === 'potion')){
          // Use the same image mapping as inventory (from ui.js getItemImage function)
          const imagePath = state.ui.getItemImage ? state.ui.getItemImage(selectedItem) : null;
          
          // Build stats display with full details
          let statsHtml = '';
          
          // Overall rating at the top
          const rating = calculateItemRating(selectedItem);
          statsHtml += `<div style="color:#d4af37; font-weight:bold; margin-bottom:12px; font-size:16px; text-align:center; background:rgba(212,175,55,0.15); padding:8px; border-radius:6px;">⭐ Overall Rating: ${rating}</div>`;
          
          // Weapon type and slot
          statsHtml += `<div style="color:#d4af37; margin-bottom:10px; font-size:15px; border-bottom:1px solid rgba(212,175,55,0.3); padding-bottom:6px;">`;
          statsHtml += `<div><b>Type:</b> ${selectedItem.weaponType || 'Weapon'}</div>`;
          statsHtml += `<div><b>Slot:</b> ${selectedItem.slot || 'Weapon'}</div>`;
          statsHtml += `<div><b>Rarity:</b> <span style="color:${selectedItem.rarity?.color || '#fff'}">${selectedItem.rarity?.name || 'Common'}</span></div>`;
          statsHtml += `</div>`;
          
          // Description if available
          if(selectedItem.desc){
            statsHtml += `<div style="color:#ccc; font-style:italic; margin-bottom:12px; font-size:13px;">${selectedItem.desc}</div>`;
          }
          
          // Stats section
          if(selectedItem.buffs && Object.keys(selectedItem.buffs).length > 0){
            statsHtml += `<div style="color:#4a9eff; font-weight:bold; margin-bottom:8px; font-size:15px;">Bonuses:</div>`;
            const buffs = selectedItem.buffs;
            if(buffs.atk) statsHtml += `<div style="margin-bottom:4px;">⚔️ <b>Attack:</b> <span style="color:#6f6">+${Math.round(buffs.atk)}</span></div>`;
            if(buffs.def) statsHtml += `<div style="margin-bottom:4px;">🛡️ <b>Defense:</b> <span style="color:#6f6">+${Math.round(buffs.def)}</span></div>`;
            if(buffs.maxHp) statsHtml += `<div style="margin-bottom:4px;">❤️ <b>Max HP:</b> <span style="color:#6f6">+${Math.round(buffs.maxHp)}</span></div>`;
            if(buffs.maxMana) statsHtml += `<div style="margin-bottom:4px;">💧 <b>Max Mana:</b> <span style="color:#6f6">+${Math.round(buffs.maxMana)}</span></div>`;
            if(buffs.maxStam) statsHtml += `<div style="margin-bottom:4px;">⚡ <b>Max Stamina:</b> <span style="color:#6f6">+${Math.round(buffs.maxStam)}</span></div>`;
            if(buffs.speed) statsHtml += `<div style="margin-bottom:4px;">🏃 <b>Speed:</b> <span style="color:#6f6">+${Math.round(buffs.speed)}</span></div>`;
            if(buffs.hpRegen) statsHtml += `<div style="margin-bottom:4px;">💚 <b>HP Regen:</b> <span style="color:#6f6">+${Math.round(buffs.hpRegen)}/sec</span></div>`;
            if(buffs.manaRegen) statsHtml += `<div style="margin-bottom:4px;">💙 <b>Mana Regen:</b> <span style="color:#6f6">+${Math.round(buffs.manaRegen)}/sec</span></div>`;
            if(buffs.stamRegen) statsHtml += `<div style="margin-bottom:4px;">⚡ <b>Stamina Regen:</b> <span style="color:#6f6">+${Math.round(buffs.stamRegen)}/sec</span></div>`;
            if(buffs.cdr) statsHtml += `<div style="margin-bottom:4px;">⏱️ <b>Cooldown Reduction:</b> <span style="color:#6f6">+${Math.round(buffs.cdr*100)}%</span></div>`;
            if(buffs.critChance) statsHtml += `<div style="margin-bottom:4px;">💥 <b>Crit Chance:</b> <span style="color:#6f6">+${Math.round(buffs.critChance*100)}%</span></div>`;
            if(buffs.critMult) statsHtml += `<div style="margin-bottom:4px;">💢 <b>Crit Multiplier:</b> <span style="color:#6f6">×${buffs.critMult.toFixed(1)}</span></div>`;
          }
          
          // Elemental effects if available
          if(selectedItem.elementalEffects && selectedItem.elementalEffects.length > 0){
            statsHtml += `<div style="color:#f6a; font-weight:bold; margin-top:12px; margin-bottom:8px; font-size:15px;">Special Effects:</div>`;
            selectedItem.elementalEffects.forEach(effect => {
              const chance = ((effect.chance || 0) * 100).toFixed(0);
              statsHtml += `<div style="margin-bottom:4px; color:#fc6;">✨ ${chance}% chance: <b>${effect.type}</b> on hit</div>`;
            });
          }
          
          // Try to load the image if path exists
          if(imagePath){
            const testImg = new Image();
            testImg.onload = () => {
              previewImage.src = imagePath;
              previewImage.style.display = 'block';
              previewError.style.display = 'none';
              previewTitle.textContent = selectedItem.name;
              previewTitle.className = rarityClass(selectedItem.rarity.key);
              if(previewStats && statsHtml){
                previewStatsContent.innerHTML = statsHtml;
                previewStats.style.display = 'block';
              } else if(previewStats){
                previewStats.style.display = 'none';
              }
              previewOverlay.style.display = 'flex';
            };
            testImg.onerror = () => {
              previewImage.style.display = 'none';
              previewError.style.display = 'block';
              previewTitle.textContent = selectedItem.name;
              previewTitle.className = rarityClass(selectedItem.rarity.key);
              if(previewStats && statsHtml){
                previewStatsContent.innerHTML = statsHtml;
                previewStats.style.display = 'block';
              } else if(previewStats){
                previewStats.style.display = 'none';
              }
              previewOverlay.style.display = 'flex';
            };
            testImg.src = imagePath;
          } else {
            // No image mapping available for this item
            previewImage.style.display = 'none';
            previewError.style.display = 'block';
            previewTitle.textContent = selectedItem.name;
            previewTitle.className = rarityClass(selectedItem.rarity?.key || 'common');
            if(previewStats && statsHtml){
              previewStatsContent.innerHTML = statsHtml;
              previewStats.style.display = 'block';
            } else if(previewStats){
              previewStats.style.display = 'none';
            }
            previewOverlay.style.display = 'flex';
          }
        }
      }
    }
  }
  if(!pKey) state._previewLatch = false;

  // Toggle HUD visibility (default: B)
  const hudToggleDown = state.input.keysDown.has(state.binds.toggleHud);
  if(hudToggleDown && !state._uiHideLatch){ state._uiHideLatch = true; state.uiHidden = !state.uiHidden; }
  if(!hudToggleDown) state._uiHideLatch = false;

  // Use interact bind (often KeyF) for dungeon entry only. Fast travel is map-only.
  const fKey = state.input.keysDown.has(state.binds.interact);
  if(fKey && !state._fastLatch && !state.inMenu && !state._pickLatch){
    state._fastLatch = true;
    // if player is near a dungeon, enter it
    if(state.dungeons){
      let near=null;
      for(const d of state.dungeons){ const dd = Math.hypot(state.player.x-d.x, state.player.y-d.y); if(dd <= Math.max(72, d.r+20) && !d.cleared){ near = d; break; } }
      if(near){ enterDungeon(state, near); }
      else {
        // Inform player that fast travel must be done via the map
        // Do not perform world fast-travel from a keypress.
        // (Map fast-travel handled via clicking on the full map overlay.)
      }
    }
  }
  if(!fKey) state._fastLatch = false;

  // Handle unit click inspection (left click on enemies/friendlies/creatures)
  if(m.lDown && !state._unitClickLatch){
    state._unitClickLatch = true;
    const cam = state.camera || { x:0, y:0, zoom:1 };
    const c = state.engine.canvas;
    const wx = (m.x - c.width/2) / (cam.zoom||1) + cam.x;
    const wy = (m.y - c.height/2) / (cam.zoom||1) + cam.y;
    // check click on enemies
    let clicked = null;
    for(const e of state.enemies){ if(Math.hypot(e.x - wx, e.y - wy) <= (e.r||13) + 6){ clicked = { unit: e, type: 'enemy' }; break; } }
    // check friendlies
    if(!clicked) for(const f of state.friendlies){ if(f.respawnT>0) continue; if(Math.hypot(f.x - wx, f.y - wy) <= (f.r||12) + 6){ clicked = { unit: f, type: 'friendly' }; break; } }
    // check creatures
    if(!clicked) for(const c of state.creatures){ 
      // Skip creatures that don't match current context
      if(state.inDungeon){
        if(c.dungeonId !== state.inDungeon) continue;
      } else {
        if(c.dungeonId) continue;
      }
      if(Math.hypot(c.x - wx, c.y - wy) <= (c.r||12) + 6){ clicked = { unit: c, type: 'creature' }; break; } 
    }
    if(clicked){
      state.selectedUnit = clicked;
      state.ui.showUnitInspection(clicked);
      // Auto-close UI panels to give focus to the target
      try{ state.ui.toggleInventory(false); }catch{}
      try{ state.ui.toggleMenu(false); }catch{}
    }
  }
  if(!m.lDown) state._unitClickLatch = false;
  if(state.mapOpen){
    if(state.input.keysDown.has('Equal') || state.input.keysDown.has('NumpadAdd')) state.mapView.zoom = Math.min(1.0, state.mapView.zoom + dt*0.4);
    if(state.input.keysDown.has('Minus') || state.input.keysDown.has('NumpadSubtract')) state.mapView.zoom = Math.max(0.05, state.mapView.zoom - dt*0.4);
    const panSpeed = 450 * (1/state.mapView.zoom) * dt;
    if(state.input.keysDown.has('ArrowLeft')) state.mapView.x = Math.max(0, state.mapView.x - panSpeed);
    if(state.input.keysDown.has('ArrowRight')) state.mapView.x = Math.min(state.mapWidth, state.mapView.x + panSpeed);
    if(state.input.keysDown.has('ArrowUp')) state.mapView.y = Math.max(0, state.mapView.y - panSpeed);
    if(state.input.keysDown.has('ArrowDown')) state.mapView.y = Math.min(state.mapHeight, state.mapView.y + panSpeed);

    // Map click fast-travel: on mouse click while map open, attempt to fast-travel to a player-captured flag/base
    if(m.lDown && !state._mapClickLatch){
      state._mapClickLatch = true;
      const mx = state.input.mouse.x; const my = state.input.mouse.y;
      // compute same overlay rect as drawFullMap
      const canvas = state.engine.canvas;
      const w = Math.min(canvas.width*0.9, state.mapWidth*0.6);
      const h = Math.min(canvas.height*0.9, state.mapHeight*0.6);
      const x = (canvas.width-w)/2, y = (canvas.height-h)/2;
      if(mx>=x && mx<=x+w && my>=y && my<=y+h){
        const mapW = state.mapWidth||canvas.width, mapH = state.mapHeight||canvas.height;
        const scale = Math.min(w/mapW, h/mapH);
        const wx = (mx - x)/scale; const wy = (my - y)/scale;
        // find nearest site within threshold
        let best=null, bestD=Infinity;
        for(const s of state.sites){ const sx = s.x*scale + x; const sy = s.y*scale + y; const d = Math.hypot(mx - sx, my - sy); if(d < bestD){ bestD=d; best=s; } }
        if(best && bestD <= 18){
          // only allow fast travel to player-owned sites (flags or bases)
          if(best.owner==='player'){
            state.player.x = best.x + 8; state.player.y = best.y + 8;
            state.camera.x = state.player.x; state.camera.y = state.player.y;
            state.mapOpen = false; state.paused = false;
            state.ui.toggleHud(true);
            state.ui.toast(`Fast-traveled to <b>${best.name}</b>.`);
          } else {
            state.ui.toast('Fast travel requires that site to be captured.');
          }
        }
      }
    }
    if(!m.lDown) state._mapClickLatch = false;
  }
}

// ===== GROUP AI SYSTEM =====
function ensurePartyState(state){
  if(!state.party){
    state.party = {
      macroState: 'stack',
      macroLockUntil: 0,
      burstUntil: 0,
      blackboard: {
        stackPoint: { x: state.player?.x || 0, y: state.player?.y || 0 },
        focusTargetId: null,
        focusTargetUntil: 0,
        chaseAllowed: false,
        spreadRadius: 72,
        leashRadius: 210
      }
    };
  }
  if(!state.party.blackboard.stackPoint) state.party.blackboard.stackPoint = { x: state.player?.x || 0, y: state.player?.y || 0 };
}

function scoreEnemyForFocus(state, enemy, anchor){
  if(!enemy || enemy.dead || enemy.hp<=0) return -1;
  const d = Math.hypot(enemy.x - anchor.x, enemy.y - anchor.y);
  const hpPct = enemy.hp / (enemy.maxHp || Math.max(1, enemy.hp));
  let score = 1000 - d*0.8 - hpPct*120;
  for(const s of state.sites||[]){
    if(s.owner==='player'){
      const ds = Math.hypot(enemy.x - s.x, enemy.y - s.y);
      if(ds <= (s.r||120) + 50){ score += 140; break; }
    }
  }
  return score;
}

function pickPartyFocus(state, anchor){
  let best=null, bestScore=-Infinity;
  for(const e of state.enemies||[]){
    const score = scoreEnemyForFocus(state, e, anchor);
    if(score > bestScore){ bestScore = score; best = e; }
  }
  return best;
}

function updatePartyCoordinator(state, dt){
  ensurePartyState(state);
  const party = state.party;
  const bb = party.blackboard;
  const time = state.campaign.time || 0;
  const anchor = bb.stackPoint;
  anchor.x = state.player.x;
  anchor.y = state.player.y;

  const focus = pickPartyFocus(state, anchor);
  if(focus){
    bb.focusTargetId = focus.id || focus._id || null;
    bb.focusTargetUntil = time + 2.5;
  } else if(bb.focusTargetUntil < time){
    bb.focusTargetId = null;
  }

  let nextMacro = party.macroState || 'stack';
  const hpPct = state.player.dead ? 0 : state.player.hp / Math.max(1, state.player.maxHp);
  
  // In dungeons, filter to dungeon enemies only; otherwise use all enemies near player
  const enemiesNear = state.inDungeon 
    ? state.enemies.filter(e=>!e.dead && e.hp>0 && e.dungeonId === state.inDungeon && Math.hypot(e.x-anchor.x, e.y-anchor.y) <= 260)
    : state.enemies.filter(e=>!e.dead && e.hp>0 && Math.hypot(e.x-anchor.x, e.y-anchor.y) <= 260);
  
  const wantsReset = hpPct < 0.32;
  
  // In dungeons, always be aggressive unless player health is critical
  const inDungeon = !!state.inDungeon;

  if(party.macroLockUntil && party.macroLockUntil > time){
    nextMacro = party.macroState;
  } else {
    if(wantsReset){
      nextMacro = 'stack';
    } else if(inDungeon && enemiesNear.length > 0){
      // In dungeons, always engage enemies
      nextMacro = focus ? 'engage' : 'engage';
    } else if(focus && party.burstUntil > time){
      nextMacro = 'burst';
    } else if(focus && enemiesNear.length>0){
      nextMacro = 'engage';
    } else {
      nextMacro = 'stack';
    }
  }

  if(nextMacro !== party.macroState){
    // Log macro state change
    if(state.debugLog){
      state.debugLog.push({
        time: (state.campaign?.time || 0).toFixed(2),
        type: 'PARTY_MACRO_CHANGE',
        previousState: party.macroState,
        newState: nextMacro,
        reason: wantsReset ? 'low_hp' : (focus ? 'has_focus' : 'auto'),
        playerHP: `${Math.round(hpPct*100)}%`
      });
    }
    party.macroState = nextMacro;
    party.macroLockUntil = time + 1.25;
    if(nextMacro === 'burst' && focus) party.burstUntil = time + 2.6;
  }

  bb.chaseAllowed = party.macroState === 'engage' || party.macroState === 'burst';
}

export function updateGame(state, dt){
  if(state.paused) return;
  
  // Auto-save every 60 seconds
  state.autoSaveTimer = (state.autoSaveTimer || 0) + dt;
  if(state.autoSaveTimer >= 60){
    state.autoSaveTimer = 0;
    try{ if(state.ui && typeof state.ui.autoSave === 'function'){ state.ui.autoSave(); } }catch(e){ console.error('Auto-save error:', e); }
  }

  // If for some reason `state.inDungeon` wasn't set but dungeon enemies exist,
  // restore the dungeon active flag so the game update runs the dungeon loop.
  if(!state.inDungeon){
    const some = (state.enemies || []).find(e => e && e.dungeonId);
    if(some){ state.inDungeon = some.dungeonId; state._autoDungeonFix = true; }
  }

  // (world mouse is computed only when needed) — do not mutate `state.input.mouse` here

  state.campaign.time += dt;
  const st=currentStats(state);

  // Periodic shield value check (every 5 seconds)
  if(!state._lastShieldCheck) state._lastShieldCheck = 0;
  state._lastShieldCheck += dt;
  if(state._lastShieldCheck >= 5){
    state._lastShieldCheck = 0;
    if(state.player.shield > 0){
      logDebug(state, 'SHIELD', 'Periodic shield check', {
        shieldValue: state.player.shield,
        shieldSource: state.player._lastShieldSource || 'unknown',
        nearbyAllies: state.friendlies.filter(f => {
          const d = Math.hypot(f.x - state.player.x, f.y - state.player.y);
          return d <= 200 && !f.dead && f.respawnT <= 0;
        }).length,
        nearbyEnemies: state.enemies.filter(e => {
          const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
          return d <= 200 && !e.dead;
        }).length
      });
    }
  }

  if(!state.player.dead){
    const hpBefore = state.player.hp;
    state.player.hp=clamp(state.player.hp+st.hpRegen*dt,0,st.maxHp);
    const hpAfter = state.player.hp;
    
    // Track HP changes for detecting unexplained jumps
    if(!state._lastLoggedHP) state._lastLoggedHP = hpBefore;
    if(!state._hpSnapshotTimer) state._hpSnapshotTimer = 0;
    
    state._hpSnapshotTimer += dt;
    
    // Log periodic HP snapshots every 2 seconds to track HP over time
    if(state._hpSnapshotTimer >= 2.0){
      state._hpSnapshotTimer = 0;
      logPlayerEvent(state, 'HP_SNAPSHOT', {
        hp: state.player.hp.toFixed(1),
        maxHP: st.maxHp,
        shield: state.player.shield.toFixed(1),
        inCombat: state.inCombatMode || false,
        regenRate: st.hpRegen.toFixed(2)
      });
    }
    
    // Log passive HP regen if significant
    if(hpAfter > hpBefore && hpAfter - hpBefore > 0.1){
      logPlayerEvent(state, 'HEAL', {
        source: 'passive_regen',
        amount: (hpAfter - hpBefore).toFixed(2),
        regenRate: st.hpRegen.toFixed(2) + '/sec',
        oldHP: hpBefore.toFixed(1),
        newHP: hpAfter.toFixed(1),
        maxHP: st.maxHp
      });
    }
    
    // Detect unexplained HP jumps (more than expected from regen)
    const accountedGain = Number(state._playerHpAccountedGain || 0);
    const accountedSources = Array.isArray(state._playerHpAccountedSources) ? state._playerHpAccountedSources.slice(-6) : [];
    const expectedHPChange = (st.hpRegen * dt) + accountedGain;
    const actualHPChange = hpAfter - state._lastLoggedHP;
    const unexplainedChange = actualHPChange - expectedHPChange;
    
    // If HP jumped significantly more than regen would explain, log it
    if(unexplainedChange > 5){
      console.error('%c[UNEXPLAINED HP JUMP]', 'color: #f0f; font-weight: bold;', 
        'HP jumped by', actualHPChange.toFixed(1), 
        'but regen only accounts for', expectedHPChange.toFixed(1),
        'UNEXPLAINED:', unexplainedChange.toFixed(1));
      
      logPlayerEvent(state, 'UNEXPLAINED_HP_JUMP', {
        hpBefore: state._lastLoggedHP.toFixed(1),
        hpAfter: hpAfter.toFixed(1),
        actualChange: actualHPChange.toFixed(1),
        expectedRegen: (st.hpRegen * dt).toFixed(1),
        accountedGain: accountedGain.toFixed(2),
        unexplained: unexplainedChange.toFixed(1),
        regenRate: st.hpRegen.toFixed(2),
        accountedSources
      });
    }
    
    state._lastLoggedHP = hpAfter;

    // Reset accounted (non-regen) healing for the next frame's detector window.
    state._playerHpAccountedGain = 0;
    state._playerHpAccountedSources = [];
    
    // Debug excessive regen
    if(st.hpRegen > 50){
      console.warn('[HP REGEN] Unusually high HP regen:', st.hpRegen, 'dt:', dt, 'heal amount:', (st.hpRegen*dt).toFixed(2));
    }
    if(hpAfter - hpBefore > 10){
      console.warn('[HP REGEN] Large HP gain in one frame:', (hpAfter - hpBefore).toFixed(2), 'hpRegen:', st.hpRegen);
    }
    
    state.player.mana=clamp(state.player.mana+st.manaRegen*dt,0,st.maxMana);
  }

  // Auto-pickup loot if enabled
  if(state.options.autoPickup && !state.player.dead){
    for(let i = state.loot.length - 1; i >= 0; i--){
      const l = state.loot[i];
      const d = Math.hypot(l.x - state.player.x, l.y - state.player.y);
      if(d <= 36){ // pickup radius
        state.loot.splice(i, 1);
        addToInventory(state, l.item, l.gold || 0);
        playLootPickup(state);
        state.ui.renderInventory?.();
      }
    }
  }

  // cooldowns
  for(let i=0;i<state.player.cd.length;i++) state.player.cd[i]=Math.max(0,state.player.cd[i]-dt);

  if(state.fastTravelCooldown > 0) state.fastTravelCooldown = Math.max(0, state.fastTravelCooldown - dt);

  // stamina / sprint / block
  const sprinting = state.input.keysDown.has(state.binds.sprint) && state.player.stam>0 && !state.input.mouse.rDown && !state.player.dead;
  const blocking = state.input.mouse.rDown && !state.player.dead;

  // Regenerate stamina when not sprinting
  if(!sprinting && !state.player.dead){
    state.player.stam=clamp(state.player.stam+st.stamRegen*dt,0,st.maxStam);
  }
  
  // Consume stamina while sprinting
  if(sprinting){
    state.player.stam=Math.max(0, state.player.stam - st.sprintStamDrain*dt);
  }
  
  // Block only consumes stamina when actually blocking damage (handled in applyDamageToPlayer)
  // No passive drain while holding block

  // Garrison assignment hotkeys (1-6 for flags, 7 for unassign all) - no confirmation needed
  const capturableSites = state.sites
    .filter(s => s && s.id && s.id.startsWith('site_'))
    .sort((a,b) => a.id.localeCompare(b.id));
  for(let flagNum = 1; flagNum <= 6; flagNum++){
    const bindKey = `garrisonFlag${flagNum}`;
    if(state.input.keysDown.has(state.binds[bindKey])){
      const targetSite = capturableSites[flagNum - 1];
      if(targetSite && targetSite.owner === 'player'){
        // Assign directly without confirmation
        for(const friendly of state.friendlies){
          if(friendly && !friendly.dead && friendly.respawnT <= 0){
            // Skip if this friendly is in a group
            if(state.group && state.group.members && state.group.members.includes(friendly.id)) continue;
            // Assign to garrison
            friendly.garrisonSiteId = targetSite.id;
            // Reset garrison position so it recalculates
            delete friendly._garrisonX;
            delete friendly._garrisonY;
            delete friendly._garrisonSlot;
          }
        }
        state.ui?.toast(`Assigned allies to ${targetSite.name || `Flag ${flagNum}`}`);
      } else {
        state.ui?.toast(`No captured flag mapped to hotkey ${flagNum}.`);
      }
      // Consume the keypress (mark it as used this frame)
      state.input.keysDown.delete(state.binds[bindKey]);
    }
  }

  // Unassign all garrison assignments (hotkey 7) - no confirmation needed
  if(state.input.keysDown.has(state.binds.garrisonUnassignAll)){
    for(const friendly of state.friendlies){
      if(friendly && !friendly.dead && friendly.respawnT <= 0){
        delete friendly.garrisonSiteId;
        delete friendly._garrisonX;
        delete friendly._garrisonY;
        delete friendly._garrisonSlot;
      }
    }
    state.ui?.toast('All garrison assignments cleared.');
    // Consume the keypress
    state.input.keysDown.delete(state.binds.garrisonUnassignAll);
  }

  // move
  if(!state.player.dead){
    const mv=getMoveVector(state);
    let vx=mv.x, vy=mv.y;
    const mag=Math.hypot(vx,vy);
    const isMoving = mag > 0;
    
    // Handle walking sound
    if(state.sounds?.walking){
      if(isMoving && state.sounds.walking.paused){
        state.sounds.walking.play().catch(e => console.warn('Walking sound play failed:', e));
      } else if(!isMoving && !state.sounds.walking.paused){
        state.sounds.walking.pause();
      }
      
      // Speed up sound when sprinting
      if(isMoving){
        state.sounds.walking.playbackRate = sprinting ? 1.6 : 1.0;
      }
    }
    
    if(mag>0){ vx/=mag; vy/=mag; }
    let speed=st.speed;
    if(sprinting) speed*=st.sprintMult;
    if(blocking) speed*=0.55;
    // water slows movement
    let willBeInWater=false;
    // compute tentative position using base speed to detect water, then re-evaluate speed if needed
    let proposedX = state.player.x + vx*speed*dt;
    let proposedY = state.player.y + vy*speed*dt;
    // collision with trees
    let blocked=false;
    for(const t of state.trees || []){
      if(Math.hypot(proposedX - t.x, proposedY - t.y) <= (state.player.r + t.r + 2)) { blocked=true; break; }
    }
    if(!blocked){
      // collision with mountains
      for(const m of state.mountains || []){
        if(Math.hypot(proposedX - m.x, proposedY - m.y) <= (state.player.r + m.r + 2)) { blocked=true; break; }
      }
    }
    if(!blocked){
      // collision with mountain circles
      for(const mc of state.mountainCircles || []){
        if(Math.hypot(proposedX - mc.x, proposedY - mc.y) <= (state.player.r + mc.r + 2)) { blocked=true; break; }
      }
    }
    if(!blocked){
      // collision with rocks
      for(const rc of state.rockCircles || []){
        if(Math.hypot(proposedX - rc.x, proposedY - rc.y) <= (state.player.r + rc.r + 2)) { blocked=true; break; }
      }
    }
    if(!blocked){
      // collision with decorative objects (trees, ponds, crystals, etc)
      for(const dc of state.decorativeCircles || []){
        if(Math.hypot(proposedX - dc.x, proposedY - dc.y) <= (state.player.r + dc.r + 2)) { blocked=true; break; }
      }
    }
    // check water presence (using water circles from lakes and rivers)
    for(const wc of state.waterCircles || []){
      if(Math.hypot(proposedX - wc.x, proposedY - wc.y) <= wc.r){ willBeInWater=true; break; }
    }
    // if moving into water, reduce speed and recompute proposed position
    if(willBeInWater){ speed *= 0.45; proposedX = state.player.x + vx*speed*dt; proposedY = state.player.y + vy*speed*dt; }
    if(!blocked){
      // enforce walls/gates: if movement would place player inside a wall ring, check gate
      let allowPass=true;
      for(const s of state.sites){ if(s.wall){ const d=Math.hypot(proposedX - s.x, proposedY - s.y); if(d <= s.wall.r && d >= s.r){ // in wall area
        if(!siteAllowsPassage(s, state.player, state)){ allowPass=false; break; }
          } } }
      if(allowPass){
        const bounds = state.playableBounds || {minX:0, minY:0, maxX:state.mapWidth, maxY:state.mapHeight};
        state.player.x = clamp(proposedX, bounds.minX, bounds.maxX);
        state.player.y = clamp(proposedY, bounds.minY, bounds.maxY);
        // apply water slow if moving into water
        if(willBeInWater) { state.player.inWater = true; }
        else { state.player.inWater = false; }
        if(state.player.inWater){ state.player.x = clamp(state.player.x, bounds.minX, bounds.maxX); state.player.y = clamp(state.player.y, bounds.minY, bounds.maxY); }
      }
    }
    // if already standing in water but moving out
    if(!willBeInWater && state.player.inWater){
      // check current position against water circles
      let stillIn=false; for(const wc of state.waterCircles||[]){ if(Math.hypot(state.player.x-wc.x,state.player.y-wc.y)<=wc.r){ stillIn=true; break; } }
      if(!stillIn) state.player.inWater=false;
    }
    // update camera to follow player and clamp to world
    const cam = state.camera;
   
     // Apply camera mode: Free View vs Follow Character
     const cameraMode = state.options?.cameraMode || 'follow';
     if(cameraMode === 'follow'){
       // Follow Character: always center on player
       cam.x = state.player.x;
       cam.y = state.player.y;
     } else if(cameraMode === 'freeview') {
         // Free View: only move camera when player approaches viewport edge
         const halfW = state.engine.canvas.width/2 / (cam.zoom||1);
         const halfH = state.engine.canvas.height/2 / (cam.zoom||1);

         // Dead zone: only move camera if player is outside this region
         const deadZone = 60; // pixels from viewport edge
         const leftEdge = cam.x - halfW + deadZone;
         const rightEdge = cam.x + halfW - deadZone;
         const topEdge = cam.y - halfH + deadZone;
         const bottomEdge = cam.y + halfH - deadZone; // fix: symmetric dead zone on bottom edge

         // Move camera only if player exits dead zone
         if(state.player.x < leftEdge) cam.x = state.player.x - deadZone;
         if(state.player.x > rightEdge) cam.x = state.player.x + deadZone;
         if(state.player.y < topEdge) cam.y = state.player.y - deadZone;
         if(state.player.y > bottomEdge) cam.y = state.player.y + deadZone;
     } else {
        // Classic Edge Scroll: camera moves only when player hits strict viewport edges (no dead zone)
        const halfW = state.engine.canvas.width/2 / (cam.zoom||1);
        const halfH = state.engine.canvas.height/2 / (cam.zoom||1);
        const leftEdge = cam.x - halfW;
        const rightEdge = cam.x + halfW;
        const topEdge = cam.y - halfH;
        const bottomEdge = cam.y + halfH;

        if(state.player.x < leftEdge) cam.x = state.player.x;
        if(state.player.x > rightEdge) cam.x = state.player.x;
        if(state.player.y < topEdge) cam.y = state.player.y;
        if(state.player.y > bottomEdge) cam.y = state.player.y;
     }
   
    const halfW = state.engine.canvas.width/2 / (cam.zoom||1);
    const halfH = state.engine.canvas.height/2 / (cam.zoom||1);
    cam.x = clamp(cam.x, halfW, (state.mapWidth || state.engine.canvas.width) - halfW);
    cam.y = clamp(cam.y, halfH, (state.mapHeight || state.engine.canvas.height) - halfH);
  }

  // Guard Progression System - Time-based upgrades
  function updateGuardProgression(state, dt){
    const UPGRADE_INTERVAL = 300; // 5 minutes in seconds
    const RARITY_PROGRESSION = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    
    for(const site of state.sites){
      // Only track progression for owned flags (not bases)
      if(!site.owner || (site.id && site.id.endsWith('_base'))) continue;
      if(!site.guardProgression) continue;
      
      const prog = site.guardProgression;
      
      // Increment time held
      prog.timeHeld += dt;
      
      // Check for gear upgrade (every 5 minutes)
      const currentRarityIndex = RARITY_PROGRESSION.indexOf(prog.gearRarity);
      const nextRarityIndex = currentRarityIndex + 1;
      
      if(nextRarityIndex < RARITY_PROGRESSION.length){
        const timeForNextUpgrade = (currentRarityIndex + 1) * UPGRADE_INTERVAL;
        
        if(prog.timeHeld >= timeForNextUpgrade && prog.timeHeld - dt < timeForNextUpgrade){
          // UPGRADE GEAR RARITY
          prog.gearRarity = RARITY_PROGRESSION[nextRarityIndex];
          prog.lastUpgrade = prog.timeHeld;
          
          const RARITIES = {
            common: { key:'common', tier: 1, name: 'Common', color: '#c8c8c8' },
            uncommon: { key:'uncommon', tier: 2, name: 'Uncommon', color: '#8fd' },
            rare: { key:'rare', tier: 3, name: 'Rare', color: '#9cf' },
            epic: { key:'epic', tier: 4, name: 'Epic', color: '#c9f' },
            legendary: { key:'legend', tier: 5, name: 'Legendary', color: '#f9c' }
          };
          
          const newRarity = RARITIES[prog.gearRarity];
          
          // Apply upgrade to all living guards at this site
          const guards = site.owner === 'player' 
            ? state.friendlies.filter(f => f.guard && f.homeSiteId === site.id)
            : state.enemies.filter(e => e.guard && e.homeSiteId === site.id);
          
          for(const guard of guards){
            // Update guard level tracking in progression
            if(guard.guardIndex !== undefined){
              prog.levels[guard.guardIndex] = guard.level || 1;
            }
            
            // REGENERATE ALL EQUIPMENT with new rarity tier
            // This gives guards properly stat-scaled equipment
            if(guard.variant){
              // Use assignNpcEquipment to get full armor set at new rarity
              const oldHp = guard.hp;
              const oldMaxHp = guard.maxHp;
              const hpPct = oldMaxHp > 0 ? (oldHp / oldMaxHp) : 1;
              
              // Reassign equipment at new rarity level (tied to guard level for scaling)
              assignNpcEquipment(guard, guard.variant);
              
              // Update weapon rarity specifically
              if(guard.equipment && guard.equipment.weapon){
                guard.equipment.weapon.rarity = newRarity;
              }
              
              // Recalculate stats with new equipment
              applyClassToUnit(guard, guard.variant);
              
              // Preserve HP percentage
              guard.hp = Math.floor(guard.maxHp * hpPct);
              
              console.log(`[Guard Upgrade] ${guard.name} equipped with ${newRarity.name} gear (HP: ${guard.hp}/${guard.maxHp})`);
            }
          }
          
          if(site.owner === 'player'){
            state.ui.toast(`<b>${site.name}</b> guards upgraded to <span style="color:${getRarityColor(prog.gearRarity)}">${prog.gearRarity.toUpperCase()}</span> gear!`);
          }
          
          console.log(`[Guard Progression] ${site.name} guards upgraded to ${prog.gearRarity} gear after ${Math.floor(prog.timeHeld/60)}m`);
        }
      }
      
      // UPDATE GUARD LEVELS in progression tracking
      const guards = site.owner === 'player' 
        ? state.friendlies.filter(f => f.guard && f.homeSiteId === site.id)
        : state.enemies.filter(e => e.guard && e.homeSiteId === site.id);
      
      for(const guard of guards){
        if(guard.guardIndex !== undefined && guard.level){
          prog.levels[guard.guardIndex] = guard.level;
        }
      }
    }
  }
  
  function getRarityColor(rarity){
    const colors = {
      common: '#c8c8c8',
      uncommon: '#8fd',
      rare: '#9cf',
      epic: '#c9f',
      legendary: '#f9c'
    };
    return colors[rarity] || '#fff';
  }

  // If player entered a dungeon, run a focused dungeon update loop and skip world spawn/capture logic
  if(state.inDungeon){
    updatePartyCoordinator(state, dt);
    updateFriendlies(state, dt);
    updateEnemies(state, dt);
    updateDots(state, dt);
    updateBuffs(state, dt);
    updateHeals(state, dt);
    updateSlashes(state, dt);
    updateStorms(state, dt);
    updateWells(state, dt);
    updateProjectiles(state, dt);
    updateBolts(state, dt);
    updateFlashes(state, dt);
    updateLootTTL(state, dt);
    updateDamageNums(state, dt);
    if(!state.player.dead && state.player.hp<=0){ 
      state.player.dead = true;
      die(state);
    }
    if(state.player.dead){ 
      state.player.respawnT -= dt; 
      // Keep all bars at 0 during death
      state.player.hp = 0;
      state.player.mana = 0;
      state.player.stam = 0;
      state.player.shield = 0;
      if(state.player.respawnT<=0) respawn(state); 
    }
    return;
  }

  updateCapture(state, dt);
  
  // UPDATE WALL DAMAGE - All units can damage walls through contact
  updateWallDamage(state, dt);
  
  // Play fire sounds for damaged outposts (from wall or flag damage)
  for(const site of state.sites){
    if(!site.id || !site.id.startsWith('site_')) continue;
    if(!site.owner || site.health <= 0) continue;
    
    // Check if any walls are damaged (below 70% health)
    let anyWallDamaged = false;
    if(site.wall && site.wall.sides){
      for(const side of site.wall.sides){
        if(side && !side.destroyed && side.hp / side.maxHp <= 0.70){
          anyWallDamaged = true;
          break;
        }
      }
    }
    
    // Play fire sound if walls or flag are damaged
    const flagHealthPct = site.health / (site.maxHealth || 500);
    if(anyWallDamaged || flagHealthPct <= 0.70){
      playOutpostFireSound(state, site);
    } else {
      stopOutpostFireSound(state, site);
    }
  }
  
  // UPDATE FLAG HEALTH - Enemies can damage flags
  updateFlagHealth(state, dt);
  
  // UPDATE GUARD PROGRESSION - Time-based gear upgrades
  updateGuardProgression(state, dt);
  
  // handle site capture reactions: if site was just captured, redirect team defenders
  for(const s of state.sites){
    if(s._justCaptured){
      const team = s._justCaptured;
      // remove existing guards of the previous owner at this site
      for(let fi=state.friendlies.length-1; fi>=0; fi--){
        const f = state.friendlies[fi];
        if(f.guard && f.siteId===s.id && s.owner!=='player') state.friendlies.splice(fi,1);
      }
      for(let ei=state.enemies.length-1; ei>=0; ei--){
        const e = state.enemies[ei];
        if(e.guard && e.homeSiteId===s.id && s.owner==='player') state.enemies.splice(ei,1);
      }
      // reset pending guard respawns now that ownership changed
      if(s.guardRespawns) s.guardRespawns.length = 0;
      // spawn guards already handled in world, now redirect up to MAX_DEFENDERS_PER_TEAM defenders
      const defenders = state.enemies.filter(e=>e.team===team && !e.guard && e.homeSiteId===getHomeForTeam(state,team)?.id);
      // find next target (nearest flag site not owned by team)
      let target=null, bestD=Infinity;
      for(const cand of state.sites){
        if(!cand.id || !cand.id.startsWith || !cand.id.startsWith('site_')) continue;
        if(cand.owner!==team){ const d=Math.hypot(cand.x - getHomeForTeam(state,team).x, cand.y - getHomeForTeam(state,team).y); if(d<bestD){bestD=d; target=cand;} }
      }
      for(let i=0;i<Math.min(defenders.length, MAX_DEFENDERS_PER_TEAM); i++){
        defenders[i].spawnTargetSiteId = target ? target.id : null;
      }
      s._justCaptured = false;
    }
  }
  // Emperor check: if any team controls ALL capture flags, they become emperor
  checkEmperorStatus(state);
  updateFriendlySpawns(state, dt);
  updatePartyCoordinator(state, dt);
  updateFriendlies(state, dt);

  // Gate opening: gates open for the owner of the site to allow easy passage
  for(const s of state.sites){
    if(s.wall){
      s.wall.gateOpen = false; // No gates in new system
    }
  }
  for(const s of state.sites){ if(s.wall && s.wall.sides){
    for(const side of s.wall.sides){
      if(side.hp < side.maxHp){
        const last = side.lastDamaged || 0;
        if((state.campaign.time - last) >= (s.wall.repairCooldown || 5.0)){
          // repair rate: restore maxHp over ~6 seconds
          const rate = side.maxHp / 6.0;
          side.hp = Math.min(side.maxHp, side.hp + rate*dt);
          if(side.destroyed && side.hp > 0){ side.destroyed = false; state.ui.toast(`Wall side repaired at <b>${s.name}</b>.`); }
        }
      }
    }
  } }

  for(const s of state.sites){
    const d = Math.hypot(state.player.x - s.x, state.player.y - s.y);
    s.spawnActive = d <= SPAWN_ACTIVATE_DIST;
    // Check if player is near a captured flag for marketplace access
    const nearMarketplace = d <= 80 && s.owner === 'player' && s.id && s.id.startsWith('site_');
    if(nearMarketplace && !state.marketplaceNearby){
      state.marketplaceNearby = true;
      if(state.ui && state.ui.showMarketplaceHint){
        state.ui.showMarketplaceHint(true);
      }
    } else if(!nearMarketplace && state.marketplaceNearby){
      state.marketplaceNearby = false;
      if(state.ui && state.ui.showMarketplaceHint){
        state.ui.showMarketplaceHint(false);
      }
    }
    // enqueue reinforcement requests when site is under attack
    // Reinforcements disabled to keep fighter count fixed
  }

  spawnEnemies(state, dt);
  updateEnemies(state, dt);

  // process guard respawns attached to sites
  for(const s of state.sites){
    if(!s.guardRespawns || s.guardRespawns.length===0) continue;
    for(let gi=s.guardRespawns.length-1; gi>=0; gi--){
      s.guardRespawns[gi] -= dt;
      if(s.guardRespawns[gi] <= 0){
        // respawn one guard
        spawnGuardsForSite(state, s, 1);
        s.guardRespawns.splice(gi,1);
      }
    }

      // Reinforcements disabled: no new squads beyond initial roster + respawns
  }

  // process enemy respawn queue
  if(state.enemyRespawns && state.enemyRespawns.length>0){
    for(let ri=state.enemyRespawns.length-1; ri>=0; ri--){
      const r = state.enemyRespawns[ri];
      r.timeLeft -= dt;
      if(r.timeLeft <= 0){
        const team = r.team;
        const currentDefenders = state.enemies.filter(e=>e.team===team && !e.guard).length;
        if(currentDefenders < MAX_DEFENDERS_PER_TEAM){
          // choose nearest owned site to death position; fallback to home base
          const sources = state.sites.filter(s=>s.owner===team);
          let src = null; let bestD = Infinity;
          for(const s of sources){
            const d = Math.hypot((r.x||0)-s.x, (r.y||0)-s.y);
            if(d < bestD){ bestD = d; src = s; }
          }
          if(!src) src = getHomeForTeam(state, team);
          if(src){
            const ang = Math.random()*Math.PI*2;
            const dist = rand(90,160);
            const opts = { homeSiteId: src.id, team };
            if(src.id && src.id.endsWith && src.id.endsWith('_base')) opts.knight = true;
            spawnEnemyAt(state, src.x+Math.cos(ang)*dist, src.y+Math.sin(ang)*dist, state.campaign.time, opts);
          }
        }
        state.enemyRespawns.splice(ri,1);
      }
    }
  }

  updateHeals(state, dt);
  updateDots(state, dt);
  updateBuffs(state, dt);
  updateSlashes(state, dt);
  updateStorms(state, dt);
  updateWells(state, dt);
  updateProjectiles(state, dt);
  updateBolts(state, dt);
  updateFlashes(state, dt);
  updateDamageNums(state, dt);

  updateLootTTL(state, dt);
  updateCampaignPoints(state, dt);

  // update creatures (world only)
  updateCreatures(state, dt);
  
  // Music management: detect combat based on nearby enemies, not just damage
  if(state.sounds?.gameCombatMusic && state.sounds?.gameNonCombatMusic){
    const emperorActive = state.emperorTeam === 'player';
    const combatTrack = (emperorActive && state.sounds.emperorAttackMusic) ? state.sounds.emperorAttackMusic : state.sounds.gameCombatMusic;
    const COMBAT_DISTANCE = 250; // Enemy within this distance = combat
    const COMBAT_LINGER_TIME = 15000; // Stay in combat for 15 seconds after last enemy/damage
    
    // ALWAYS in combat during dungeons
    const inDungeon = !!state.inDungeon;
    
    // Check if any enemies are nearby (only matters outside dungeons)
    let enemiesNearby = false;
    if(!inDungeon){
      const playerPos = { x: state.player.x, y: state.player.y };
      for(const e of state.enemies){
        const dist = Math.hypot(e.x - playerPos.x, e.y - playerPos.y);
        if(dist < COMBAT_DISTANCE){
          enemiesNearby = true;
          break;
        }
      }
    }
    
    // Update last combat time if in dungeon, enemies nearby, or damage taken recently
    if(inDungeon || enemiesNearby || Date.now() - (state.lastDamageTakenTimestamp || 0) < 3000){
      state.lastCombatTime = Date.now();
    }
    
    const timeSinceLastCombat = Date.now() - (state.lastCombatTime || 0);
    const shouldBeInCombat = inDungeon || timeSinceLastCombat < COMBAT_LINGER_TIME;
    
    // Only switch music mode when state actually changes
    if(shouldBeInCombat && !state.inCombatMode){
      // Entering combat: stop non-combat, restart combat music (emperor overrides track)
      console.log('[COMBAT MUSIC] Entering combat mode - inDungeon:', inDungeon, 'enemies nearby:', enemiesNearby, 'emperorActive:', emperorActive);
      state.inCombatMode = true;
      state._combatTrack = emperorActive ? 'emperor' : 'combat';
      if(!state.sounds.gameNonCombatMusic.paused){
        state.sounds.gameNonCombatMusic.pause();
      }
      if(state.sounds.gameCombatMusic && !state.sounds.gameCombatMusic.paused){
        state.sounds.gameCombatMusic.pause();
      }
      if(state.sounds.emperorAttackMusic && !state.sounds.emperorAttackMusic.paused){
        state.sounds.emperorAttackMusic.pause();
      }
      combatTrack.currentTime = 0;
      combatTrack.play().catch(e => console.warn('Combat music play failed:', e));
    } else if(shouldBeInCombat && state.inCombatMode){
      // Switch combat track if emperor status changes while still in combat
      const desired = emperorActive ? 'emperor' : 'combat';
      if(state._combatTrack !== desired){
        if(state.sounds.gameCombatMusic && !state.sounds.gameCombatMusic.paused){
          state.sounds.gameCombatMusic.pause();
        }
        if(state.sounds.emperorAttackMusic && !state.sounds.emperorAttackMusic.paused){
          state.sounds.emperorAttackMusic.pause();
        }
        combatTrack.currentTime = 0;
        combatTrack.play().catch(e => console.warn('Combat music play failed:', e));
        state._combatTrack = desired;
      }
    } else if(!shouldBeInCombat && state.inCombatMode){
      // Exiting combat: stop combat tracks, restart non-combat music
      console.log('[COMBAT MUSIC] Exiting combat mode, returning to non-combat');
      state.inCombatMode = false;
      state._combatTrack = null;
      if(state.sounds.gameCombatMusic && !state.sounds.gameCombatMusic.paused){
        state.sounds.gameCombatMusic.pause();
      }
      if(state.sounds.emperorAttackMusic && !state.sounds.emperorAttackMusic.paused){
        state.sounds.emperorAttackMusic.pause();
      }
      state.sounds.gameNonCombatMusic.currentTime = 0;
      state.sounds.gameNonCombatMusic.play().catch(e => console.warn('Non-combat music play failed:', e));
    }
  }

  // Emperor victory check: when a team controls ALL capture flags simultaneously
  checkEmperorVictory(state);

  if(!state.player.dead && state.player.hp<=0){
    state.player.hp=0;
    die(state);
  }
  if(state.player.dead){
    state.player.respawnT -= dt;
    if(state.player.respawnT<=0) respawn(state);
  }
}

function updateCreatures(state, dt){
  // boss respawn countdown
  if(state.bossRespawnT && state.bossRespawnT > 0){
    state.bossRespawnT = Math.max(0, state.bossRespawnT - dt);
    if(state.bossRespawnT <= 0){ spawnBossCreature(state); }
  }
  for(let i=state.creatures.length-1;i>=0;i--){
    const c = state.creatures[i];
    
    // Skip creatures that don't match current context (dungeon vs world)
    // If in dungeon: only update creatures with matching dungeonId
    // If in world: only update creatures without dungeonId
    if(state.inDungeon){
      if(c.dungeonId !== state.inDungeon) continue;
    } else {
      if(c.dungeonId) continue;
    }
    
    // CRITICAL: Check if creature died (hp <= 0) and kill it
    if(c.hp <= 0){
      if(state.debugLog){
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'CREATURE_DEATH',
          creature: c.key || 'unknown',
          boss: c.boss || false,
          hp: c.hp.toFixed(1),
          damageReceived: (c._damageReceived || 0).toFixed(1)
        });
      }
      killCreature(state, i);
      continue;
    }
    
    // update hit cooldown
    c.hitCd = Math.max(0, (c.hitCd || 0) - dt);
    
    // simple wander
    c.wander = c.wander || { t: 1.0, ang: Math.random()*Math.PI*2 };
    c.wander.t -= dt;
    if(c.wander.t <= 0){ c.wander.t = rand(0.6, 2.2); c.wander.ang = Math.random()*Math.PI*2; }
    let tx = c.x + Math.cos(c.wander.ang) * 80;
    let ty = c.y + Math.sin(c.wander.ang) * 80;
    
    // check proximity aggro: if hostile nearby (player/friendlies/enemies), aggro toward them
    const agro_dist = c.agro_range || 90;
    let nearest = null, nearestD = Infinity;
    // check player
    if(!state.player.dead){ const d = Math.hypot(state.player.x - c.x, state.player.y - c.y); if(d < nearestD && d <= agro_dist){ nearestD = d; nearest = state.player; } }
    // check friendlies
    for(const f of state.friendlies){ if(f.respawnT>0) continue; const d = Math.hypot(f.x - c.x, f.y - c.y); if(d < nearestD && d <= agro_dist){ nearestD = d; nearest = f; } }
    // check enemies
    for(const e of state.enemies){ const d = Math.hypot(e.x - c.x, e.y - c.y); if(d < nearestD && d <= agro_dist){ nearestD = d; nearest = e; } }
    
    // if aggroed by proximity or already attacking, chase target
    if(nearest && (c.attacked || nearest)){ 
      c.target = nearest;
      c.attacked = true;
      
      // Calculate stopping distance (attack range + small buffer)
      const stopDist = (c.r||12) + (nearest.r||14) + 8;
      const distToTarget = Math.hypot(nearest.x - c.x, nearest.y - c.y);
      
      // Only move toward target if beyond stopping distance
      if(distToTarget > stopDist){
        tx = nearest.x;
        ty = nearest.y;
      } else {
        // Within attack range - hold position, don't stack on target
        tx = c.x;
        ty = c.y;
      }
      
      // Log creature AI state (0.5% sample rate)
      if(state.debugLog && Math.random() < 0.005){
        state.debugLog.push({
          time: (state.campaign?.time || 0).toFixed(2),
          type: 'CREATURE_AI_STATE',
          creature: c.key || 'unknown',
          boss: c.boss || false,
          hp: Math.round(c.hp),
          target: c.target.name || c.target.variant || (c.target === state.player ? 'Player' : 'unknown'),
          distance: Math.round(distToTarget),
          hitCd: (c.hitCd || 0).toFixed(2),
          attacked: c.attacked
        });
      }
    }
    
    const slowFactor = c.inWater ? 0.45 : 1.0;
    moveWithAvoidance(c, tx, ty, state, dt, { slowFactor });
    
    // contact retaliate if aggroed (with cooldown check)
    if(c.attacked && c.target && c.hitCd <= 0){
      const d = Math.hypot((c.target.x||0) - c.x, (c.target.y||0) - c.y);
      const hitDist = (c.r||12) + (c.target.r||14) + 4;
      if(d <= hitDist){
        c.hitCd = 0.65; // Same cooldown as enemies
        
        // Log creature attack (2% sample rate)
        if(state.debugLog && Math.random() < 0.02){
          state.debugLog.push({
            time: (state.campaign?.time || 0).toFixed(2),
            type: 'CREATURE_ATTACK',
            creature: c.key || 'unknown',
            boss: c.boss || false,
            target: c.target.name || c.target.variant || (c.target === state.player ? 'Player' : 'unknown'),
            damage: c.contactDmg || 6,
            distance: d.toFixed(1)
          });
        }
        
        // Play creature attack sound based on type
        if(c.key === 'goblin'){
          playPositionalSound(state, 'goblinAttack', c.x, c.y, 500, 0.35);
        } else if(c.key === 'wolf'){
          playPositionalSound(state, 'wolfAttack', c.x, c.y, 500, 0.35);
        }
        
        if(c.target === state.player){ applyDamageToPlayer(state, c.contactDmg||6, currentStats(state), c); }
        // friendlies/enemies take direct damage
        else {
          // try friendly list
          const fi = state.friendlies.indexOf(c.target);
          if(fi !== -1){
            const f = state.friendlies[fi];
            applyShieldedDamage(state, f, c.contactDmg||6);
            if(f.hp<=0) killFriendly(state, fi, true);
          }
          else {
            const ei = state.enemies.indexOf(c.target);
            if(ei!==-1){
              const e = state.enemies[ei];
              applyShieldedDamage(state, e, c.contactDmg||6);
              if(e.hp<=0) killEnemy(state, ei, false);
            }
          }
        }
      }
    }
  }
}

// Minimal save (menu button calls these via ui)
export function exportSave(state){
  // Clean enemies - remove circular references like _hostTarget
  const cleanEnemies = state.enemies.map(e => {
    const clean = {...e};
    delete clean._hostTarget; // Remove circular reference
    delete clean.target; // Remove any object references
    return clean;
  });
  
  // Clean friendlies - remove circular references
  const cleanFriendlies = state.friendlies.map(f => {
    const clean = {...f};
    delete clean._hostTarget;
    delete clean.target;
    return clean;
  });
  
  return {
    player:{
      x:state.player.x,y:state.player.y,hp:state.player.hp,mana:state.player.mana,stam:state.player.stam,shield:state.player.shield,gold:state.player.gold,
      equip:state.player.equip,
      passives:state.player.passives.map(p=>p?.id ?? null),
      cd:state.player.cd
    },
    sites:state.sites, enemies:cleanEnemies, friendlies:cleanFriendlies, loot:state.loot, inventory:state.inventory,
    abilitySlots:state.abilitySlots, options:state.options, binds:state.binds, progression:state.progression, campaign:state.campaign,
    factionGold: state.factionGold, factionTech: state.factionTech, marketCosts: state.marketCosts,
    teamPoints: state.teamPoints, rubberband: state.rubberband, rubberbandNext: state.rubberbandNext, rubberbandAwarded: state.rubberbandAwarded,
    group: { members: state.group.members, settings: state.group.settings }
  };
}

export function importSave(state, s){
  state.player.x=s.player?.x ?? state.engine.canvas.width/2;
  state.player.y=s.player?.y ?? state.engine.canvas.height/2;
  state.player.hp=s.player?.hp ?? state.basePlayer.maxHp;
  state.player.mana=s.player?.mana ?? state.basePlayer.maxMana;
  state.player.stam=s.player?.stam ?? state.basePlayer.maxStam;
  state.player.shield=s.player?.shield ?? 0;
  state.player.gold=s.player?.gold ?? 0;
  state.player.equip=s.player?.equip ?? state.player.equip;
  state.player.potion=s.player?.potion ?? null;
  state.player.cd=s.player?.cd ?? [0,0,0,0,0];
  // restore faction economy
  state.factionGold = s.factionGold ?? state.factionGold ?? { player:0, teamA:0, teamB:0, teamC:0 };
  state.factionTech = s.factionTech ?? state.factionTech ?? { player:1, teamA:1, teamB:1, teamC:1 };
  // restore marketplace dynamic costs
  state.marketCosts = s.marketCosts ?? state.marketCosts ?? { squadArmor: 1000, squadLevel: 800 };
  // restore team points and rubberband
  state.teamPoints = s.teamPoints ?? state.teamPoints ?? { player:0, teamA:0, teamB:0, teamC:0 };
  state.rubberband = s.rubberband ?? state.rubberband ?? { gapThreshold: 60, closeThreshold: 30, baseTickGold: 250, interval: 300, nonLastScale: 0.6, maxAssistPerTeam: 10000 };
  state.rubberbandNext = s.rubberbandNext ?? state.rubberbandNext ?? { player:0, teamA:0, teamB:0, teamC:0 };
  state.rubberbandAwarded = s.rubberbandAwarded ?? state.rubberbandAwarded ?? { player:0, teamA:0, teamB:0, teamC:0 };

  state.abilitySlots=s.abilitySlots ?? state.abilitySlots;
  const pIds=s.player?.passives ?? [null,null];
  state.player.passives=pIds.map(id=>id?getSkillById(id):null);

  // Only import world/entity arrays if the save actually contains them (protect against empty/corrupt saves)
  if(Array.isArray(s.sites) && s.sites.length>0){ state.sites.length=0; s.sites.forEach(x=>state.sites.push(x)); }
  if(Array.isArray(s.enemies) && s.enemies.length>0){
    state.enemies.length=0;
    s.enemies.forEach(e=>{
      ensureEntityId(state, e, { kind:'enemy', team: e.team || 'enemy' });
      state.enemies.push(e);
    });
  }
  if(Array.isArray(s.friendlies) && s.friendlies.length>0){ 
    state.friendlies.length=0; 
    s.friendlies.forEach(a=>{
  if(s.group){ 
    state.group.members = s.group.members || [];
    state.group.settings = s.group.settings || {};
  }
      if(!a.id) a.id = `f_${Date.now()}_${randi(0, 99999)}`; // Add ID if missing
      ensureEntityId(state, a, { kind:'friendly', team: 'player' });
      // Reinitialize abilities to ensure latest loadouts (healer mages, etc)
      if(a.variant) {
        npcInitAbilities(a, { state, source: 'importSave' });
        console.log(`Reinitialized ${a.variant} with abilities:`, a.npcAbilities, 'weapon:', a.weaponType);
      }
      state.friendlies.push(a);
    });
  }
  if(Array.isArray(s.loot) && s.loot.length>0){ state.loot.length=0; s.loot.forEach(l=>state.loot.push({...l, timeLeft: typeof l.timeLeft==='number'?l.timeLeft:LOOT_TTL })); }
  if(Array.isArray(s.inventory) && s.inventory.length>0){ state.inventory.length=0; s.inventory.forEach(i=>state.inventory.push(i)); }

  state.options=s.options ?? state.options;
  state.binds=s.binds ?? state.binds;

  if(s.progression){ Object.assign(state.progression, s.progression); saveJson('orb_rpg_mod_prog', state.progression); }
  if(s.campaign){ Object.assign(state.campaign, s.campaign); saveJson('orb_rpg_mod_campaign', state.campaign); }

  saveJson('orb_rpg_mod_opts', state.options);
  saveJson('orb_rpg_mod_binds', state.binds);

  const st=currentStats(state);
  state.player.hp=clamp(state.player.hp,0,st.maxHp);
  state.player.mana=clamp(state.player.mana,0,st.maxMana);
  state.player.stam=clamp(state.player.stam,0,st.maxStam);

  state.campaignEnded=false;
  state.ui.hideEnd();
  state.paused=false;

  state.ui.renderAbilityBar();
}

// ═══════════════════════════════════════════════════════════════
// SLOT SYSTEM HELPERS
// ═══════════════════════════════════════════════════════════════

// Find a slot by ID
function findSlot(state, slotId) {
  let slot = state.slotSystem.guards.find(s => s.id === slotId);
  if (slot) return slot;
  return state.slotSystem.allies.find(s => s.id === slotId);
}

// Mirror slot changes to AI teams (instant synchronization)
function mirrorSlotToAI(state, slotId, action, data = null) {
  const playerSlot = findSlot(state, slotId);
  if (!playerSlot) return;
  
  const isGuard = slotId.startsWith('guard_');
  const teams = ['teamA', 'teamB', 'teamC'];
  
  teams.forEach(teamName => {
    const aiTeam = state.slotSystem.aiTeams[teamName];
    if (!aiTeam) return;
    
    const slotArray = isGuard ? aiTeam.guards : aiTeam.allies;
    
    // Find or create AI slot
    let aiSlot = slotArray.find(s => s.id === slotId);
    if (!aiSlot) {
      // Create mirrored slot
      aiSlot = {
        id: slotId,
        role: playerSlot.role,
        unlocked: false,
        level: 0,
        loadoutId: null
      };
      slotArray.push(aiSlot);
    }
    
    // Apply action
    switch (action) {
      case 'unlock':
        aiSlot.unlocked = true;
        break;
      case 'upgrade':
        aiSlot.level = playerSlot.level;
        break;
      case 'loadout':
        aiSlot.loadoutId = data;
        break;
    }
  });
  
  console.log(`[SLOT] Mirrored ${action} for ${slotId} to AI teams`);
}

// Respawn guards for a specific slot at player-owned flags
function respawnGuardsForSlot(state, slotId) {
  const slot = findSlot(state, slotId);
  if (!slot || !slot.unlocked || !slot.loadoutId) return;
  
  // Find all player-owned flags
  const playerFlags = state.sites.filter(s => s.owner === 'player' && s.type === 'capture');
  
  playerFlags.forEach(flag => {
    // Find guards at this flag with this slot ID
    const guardsAtFlag = state.friendlies.filter(f => 
      f.guard && 
      f.slotId === slotId && 
      Math.hypot(f.x - flag.x, f.y - flag.y) < 150
    );
    
    // Update their level
    guardsAtFlag.forEach(guard => {
      guard.level = slot.level;
      // Recalculate stats based on new level
      const stats = friendlyStatsForLevel(guard.level);
      Object.assign(guard, stats);
      guard.hp = guard.maxHp;
      guard.mana = guard.maxMana;
    });
  });
}

// Level up allies for a specific slot
function levelUpAllyForSlot(state, slotId) {
  const slot = findSlot(state, slotId);
  if (!slot || !slot.unlocked) return;
  
  // Find allies with this slot ID
  const alliesForSlot = state.friendlies.filter(f => !f.guard && f.slotId === slotId);
  
  alliesForSlot.forEach(ally => {
    ally.level = slot.level;
    // Recalculate stats based on new level
    const stats = friendlyStatsForLevel(ally.level);
    Object.assign(ally, stats);
    ally.hp = Math.min(ally.hp, ally.maxHp); // Keep current HP if not over new max
    ally.mana = Math.min(ally.mana, ally.maxMana);
  });
}

// ═══════════════════════════════════════════════════════════════
// ZONE BOSS SYSTEM
// ═══════════════════════════════════════════════════════════════

// Check if any team controls ALL capture flags and award Emperor status
// Spawn zone boss when player achieves Emperor status
function spawnZoneBoss(state) {
  const currentZone = state.zoneConfig.zones[state.zoneConfig.currentZone - 1];
  if (!currentZone) return;
  
  // Spawn boss near center of map
  const centerX = (state.mapWidth || state.engine.canvas.width) / 2;
  const centerY = (state.mapHeight || state.engine.canvas.height) / 2;
  
  // Add some randomness to spawn position
  const spawnX = centerX + randi(-200, 200);
  const spawnY = centerY + randi(-200, 200);
  
  // Create boss enemy at zone boss level
  const boss = spawnEnemyAt(state, spawnX, spawnY, state.campaign.time, {
    level: currentZone.bossLevel,
    team: 'boss', // Special boss team
    variant: 'warden' // Boss appearance
  });
  
  if (boss) {
    boss.boss = true;
    boss.name = `${currentZone.name} Champion`;
    boss.maxHp = boss.maxHp * 5; // 5x HP for boss
    boss.hp = boss.maxHp;
    boss.contactDmg = boss.contactDmg * 2; // 2x damage
    boss.xp = boss.xp * 10; // 10x XP reward
    
    // Randomly select a boss icon
    const bossIconNames = ['archmage', 'balrogath', 'bloodfang', 'gorothar', 'malakir', 'tarrasque', 'venomQueen', 'vorrak', 'zalthor'];
    boss.bossIcon = bossIconNames[Math.floor(Math.random() * bossIconNames.length)];
    
    state.zoneConfig.bossActive = true;
    state.zoneConfig.bossEntity = boss;
    
    // Big notification
    state.ui.toast(`<b>⚔️ ZONE BOSS AWAKENED! ⚔️</b><br><b>${boss.name}</b> has appeared!<br>Level ${currentZone.bossLevel} - Defeat to advance!`, 8000);
    console.log(`%c[BOSS] ${boss.name} spawned at level ${currentZone.bossLevel}`, 'color: #ff0000; font-weight: bold; font-size: 14px');
  }
}

// Handle zone boss defeat and zone advancement
function handleZoneBossDefeat(state) {
  const currentZone = state.zoneConfig.zones[state.zoneConfig.currentZone - 1];
  if (!currentZone) return;
  
  // Mark zone complete
  state.zoneConfig.bossActive = false;
  state.zoneConfig.bossEntity = null;
  state.zoneConfig.zoneComplete = true;
  
  // Big victory notification
  state.ui.toast(`<b>🏆 ZONE COMPLETE! 🏆</b><br><b>${currentZone.name}</b> conquered!<br>Preparing next zone...`, 8000);
  console.log(`%c[ZONE] ${currentZone.name} COMPLETE!`, 'color: #00ff00; font-weight: bold; font-size: 16px');
  
  // Auto-level player to zone max if below
  if (state.progression.level < currentZone.maxLevel) {
    const levelsGained = currentZone.maxLevel - state.progression.level;
    state.progression.level = currentZone.maxLevel;
    state.progression.statPoints += levelsGained * 2;
    state.ui.toast(`<b>Level boost!</b> Reached level ${currentZone.maxLevel} (+${levelsGained * 2} stat points)`, 6000);
  }
  
  // Advance to next zone after 5 seconds
  setTimeout(() => {
    advanceToNextZone(state);
  }, 5000);
}

// Advance to the next zone
function advanceToNextZone(state) {
  const nextZoneIndex = state.zoneConfig.currentZone; // currentZone is 1-indexed
  const nextZone = state.zoneConfig.zones[nextZoneIndex];
  
  if (!nextZone) {
    // No more zones - game complete!
    state.ui.toast(`<b>🎉 GAME COMPLETE! 🎉</b><br>All zones conquered!<br>You are the ultimate champion!`, 10000);
    console.log(`%c[GAME] ALL ZONES COMPLETE!`, 'color: #ffd700; font-weight: bold; font-size: 20px');
    return;
  }
  
  // Advance zone
  state.zoneConfig.currentZone += 1;
  state.zoneConfig.maxZone = Math.max(state.zoneConfig.maxZone, state.zoneConfig.currentZone);
  state.zoneConfig.zoneComplete = false;
  
  // Reset emperor status
  state.emperorTeam = null;
  removeEmperorEffect(state);
  
  // Reset all flags to neutral
  for (const site of state.sites) {
    if (site.id && site.id.startsWith('site_')) {
      site.owner = null;
      site.health = site.maxHealth || 100;
    }
  }
  
  // Clear all enemies
  state.enemies = [];
  
  // Respawn player and allies at spawn point
  const centerX = (state.mapWidth || state.engine.canvas.width) / 2;
  const centerY = (state.mapHeight || state.engine.canvas.height) / 2;
  state.player.x = centerX;
  state.player.y = centerY;
  state.player.hp = currentStats(state).maxHp;
  state.player.mana = currentStats(state).maxMana;
  state.player.stam = currentStats(state).maxStam;
  
  // Respawn allies near player
  for (const ally of state.friendlies) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 30;
    ally.x = state.player.x + Math.cos(angle) * dist;
    ally.y = state.player.y + Math.sin(angle) * dist;
    const allyStats = npcGetCurrentStats(ally, state);
    ally.hp = allyStats.maxHp;
    ally.mana = allyStats.maxMana;
    ally.stam = allyStats.maxStam;
  }
  
  // Big zone announcement
  state.ui.toast(`<b>⚔️ ${nextZone.name.toUpperCase()} ⚔️</b><br>Levels ${nextZone.minLevel}-${nextZone.maxLevel}<br>Capture all flags to summon the boss!`, 8000);
  console.log(`%c[ZONE] Entered ${nextZone.name} (Levels ${nextZone.minLevel}-${nextZone.maxLevel})`, 'color: #00ffff; font-weight: bold; font-size: 16px');
}

function checkEmperorStatus(state){
  const flagSites = state.sites.filter(s => s.id && s.id.startsWith('site_'));
  if(flagSites.length === 0) return; // No flags to control
  
  // Count flags owned by each team
  const playerFlags = flagSites.filter(s => s.owner === 'player').length;
  const teamAFlags = flagSites.filter(s => s.owner === 'teamA').length;
  const teamBFlags = flagSites.filter(s => s.owner === 'teamB').length;
  const teamCFlags = flagSites.filter(s => s.owner === 'teamC').length;
  
  const totalFlags = flagSites.length;
  let newEmperorTeam = null;
  
  // Check if any team controls all flags
  if(playerFlags === totalFlags) newEmperorTeam = 'player';
  else if(teamAFlags === totalFlags) newEmperorTeam = 'teamA';
  else if(teamBFlags === totalFlags) newEmperorTeam = 'teamB';
  else if(teamCFlags === totalFlags) newEmperorTeam = 'teamC';
  
  const previousEmperor = state.emperorTeam;
  state.emperorTeam = newEmperorTeam;
  
  // If emperor status changed, handle transitions
  if(newEmperorTeam && previousEmperor !== newEmperorTeam){
    // New emperor crowned
    console.log(`%c[EMPEROR] ${newEmperorTeam} CROWNED! Controls ${totalFlags}/${totalFlags} flags`, 'color: #ffd700; font-weight: bold; font-size: 14px');
    // logDebugEvent(state, `EMPEROR_CROWNED: ${newEmperorTeam} now controls ALL ${totalFlags} flags`);
    
    if(newEmperorTeam === 'player'){
      state.ui.toast(`<b>⚜️ POWER OF THE EMPEROR! ⚜️</b><br>All ${totalFlags} flags controlled!<br>🔱 All enemy teams are now ALLIED against you!`);
      console.log('%c[EMPEROR] Player received emperor buff: +3x HP/Mana/Stamina, +50% CDR', 'color: #ffd700');
      // logDebugEvent(state, `EMPEROR_BUFF_APPLIED: Player gains emperor power (+3x resources, +50% CDR)`);
      addEmperorEffect(state); // Add visible effect to player
      
      // BOSS SPAWN: Spawn zone boss when player achieves Emperor status
      if (!state.zoneConfig.bossActive && !state.zoneConfig.zoneComplete) {
        spawnZoneBoss(state);
      }
    }
    state.emperorSince = state.campaign.time;
  } else if(!newEmperorTeam && previousEmperor){
    // Emperor dethroned (lost ALL flags)
    console.log(`%c[EMPEROR] ${previousEmperor} DETHRONED - No longer controls all flags`, 'color: #ff6b6b; font-weight: bold');
    // logDebugEvent(state, `EMPEROR_DETHRONED: ${previousEmperor} lost control of all flags`);
    
    if(previousEmperor === 'player'){
      state.ui.toast('⚔️ <b>DETHRONED!</b> Enemy captured a flag. Emperor power removed.');
      removeEmperorEffect(state); // Remove effect from player
    }
  }
}

// Check for victory condition: time-based (10 min) or when emperor team has no flags left
function checkEmperorVictory(state){
  // Victory 1: Emperor team lost ALL flags (when flag count reaches ZERO)
  if(state.emperorTeam && state.emperorTeam === 'player'){
    const playerFlags = state.sites.filter(s => s.owner === 'player' && s.id.startsWith('site_')).length;
    const totalFlags = state.sites.filter(s => s.id && s.id.startsWith('site_')).length;
    
    // Only remove emperor when player has ZERO flags (lost ALL flags)
    if(playerFlags === 0 && !state.campaignEnded){
      console.log(`%c[EMPEROR] Player DETHRONED - Lost ALL flags (${playerFlags}/${totalFlags})`, 'color: #ff6b6b; font-weight: bold');
      logDebugEvent(state, `EMPEROR_LOST: Player had ${playerFlags}/${totalFlags} flags - DETHRONED`);
      state.ui.toast(`<b>DETHRONED!</b> You lost ALL ${totalFlags} flags. Emperor power removed.`);
      removeEmperorEffect(state);
      state.emperorTeam = null;
    } else if(playerFlags < totalFlags && playerFlags > 0){
      // Player still has some flags - emperor power persists
      console.log(`%c[EMPEROR] Emperor power persists - Holding ${playerFlags}/${totalFlags} flags`, 'color: #ffd700');
    }
  }
  
  // Victory 2: 10-minute time limit (campaign time reaches limit without emperor victory)
  // For now, we'll let emperor reign indefinitely. Can add a time limit later if needed.
  // const CAMPAIGN_LIMIT = 10*60;
  // if(state.campaign.time >= CAMPAIGN_LIMIT && !state.campaignEnded){...}
}

// Add the Emperor effect to player's active effects
function addEmperorEffect(state){
  // Add emperor effect if not already present
  if(!state.player.buffs) state.player.buffs = [];
  const hasEmperor = state.player.buffs.some(b => b.id === 'emperor_power');
  if(!hasEmperor){
    state.player.buffs.push({
      id: 'emperor_power',
      name: 'Power of the Emperor',
      duration: Infinity,
      applied: state.campaign.time,
      icon: '🔱',
      t: Infinity // Ensure timer never decrements
    });
    console.log(`%c[BUFF] Emperor power added to player.buffs (${state.player.buffs.length} total active effects)`, 'color: #4a9eff');
    // Restore player to full health/mana/stamina when becoming emperor
    const st = currentStats(state);
    const oldHP = state.player.hp;
    state.player.hp = st.maxHp;
    state.player.mana = st.maxMana;
    state.player.stam = st.maxStam;
    console.log(`[EMPEROR] Fully healed: HP ${oldHP.toFixed(0)} → ${st.maxHp.toFixed(0)}`);
    // Show big screen notification
    if(state.ui?.showEmperor){
      state.ui.showEmperor();
    }
    // Force UI updates to show the new buff
    if(state.ui?.renderInventory) state.ui.renderInventory();
    if(state.ui?.renderLevel) state.ui.renderLevel();
    if(state.ui?.updateBuffIconsHUD) state.ui.updateBuffIconsHUD();
  }
}

// Remove Emperor effect from player's active effects
function removeEmperorEffect(state){
  if(!state.player.buffs) return;
  const hadEmperor = state.player.buffs.some(b => b.id === 'emperor_power');
  state.player.buffs = state.player.buffs.filter(b => b.id !== 'emperor_power');
  
  if(hadEmperor){
    console.log(`%c[BUFF] Emperor power removed from player.buffs (${state.player.buffs.length} remaining effects)`, 'color: #ff6b6b');
  }
  
  // Force UI updates to remove the buff from display
  if(state.ui?.renderInventory) state.ui.renderInventory();
  if(state.ui?.renderLevel) state.ui.renderLevel();
  if(state.ui?.updateBuffIconsHUD) state.ui.updateBuffIconsHUD();
}

// Global function used by marketplace to upgrade allies
window.applySquadUpgrade = function(state){
  const tierUp = ()=>{
    state.factionTech.player = Math.min(5, (state.factionTech.player||1) + 1);
  };
  tierUp();
  for(const f of state.friendlies){
    if(f.respawnT>0) continue;
    f.level = Math.min(12, (f.level||1) + 1);
    applyClassToUnit(f, f.variant||'warrior');
    npcInitAbilities(f, { state, source: 'applySquadUpgrade' });
  }
  // Refresh inventory/equipment UI if open
  state.ui.renderInventory?.();
};

function getRarityByTier(tier){
  if(tier>=5) return LEGENDARY_RARITY;
  if(tier>=4) return EPIC_RARITY;
  if(tier>=3) return RARE_RARITY;
  if(tier>=2) return UNCOMMON_RARITY;
  return COMMON_RARITY;
}

// Upgrade only squad armor rarity tier (does not change levels)
window.applySquadArmorUpgrade = function(state){
  const current = state.factionTech.player || 1;
  state.factionTech.player = Math.min(5, current + 1);
  const rarity = getRarityByTier(state.factionTech.player);
  for(const f of state.friendlies){
    if(f.respawnT>0) continue;
    const role = f.variant || 'warrior';
    const set = roleArmorSet(role, rarity);
    f.equipment = f.equipment || {};
    for(const [slot,item] of Object.entries(set)) f.equipment[slot] = item;
  }
  state.ui.toast(`Squad armor upgraded to <b>${rarity.name}</b>.`);
  state.ui.renderInventory?.();
};

// Upgrade only squad levels by +1 (keeps gear)
window.applySquadLevelUpgrade = function(state){
  for(const f of state.friendlies){
    if(f.respawnT>0) continue;
    f.level = (f.level||1) + 1;
    applyClassToUnit(f, f.variant||'warrior');
    // keep existing equipment; abilities re-init to keep CDs sane
    npcInitAbilities(f, { state, source: 'applySquadLevelUpgrade' });
  }
  state.ui.toast(`Squad levels increased by <b>+1</b>.`);
};

// TEST FUNCTION: Toggle emperor buff directly (for debugging)
window.testEmperorBuff = function(){
  // Get state from window._gameState
  const state = window._gameState;
  
  if(!state) {
    console.error('❌ State not found at window._gameState. Make sure the game is loaded and running.');
    return;
  }
  
  if(!state.player || !state.ui) {
    console.error('❌ Player or UI not available');
    return;
  }
  
  // Check if already has emperor buff
  if(!state.player.buffs) state.player.buffs = [];
  const hasEmperor = state.player.buffs.some(b => b.id === 'emperor_power');
  
  if(hasEmperor){
    // Remove it
    state.player.buffs = state.player.buffs.filter(b => b.id !== 'emperor_power');
    state.ui.toast('Emperor buff REMOVED');
    console.log('%c✓ Emperor buff removed', 'color: red; font-size: 14px; font-weight: bold;');
  } else {
    // Add it
    state.player.buffs.push({
      id: 'emperor_power',
      name: 'Power of the Emperor',
      duration: Infinity,
      applied: state.campaign.time,
      icon: '🔱'
    });
    const st = currentStats(state);
    const oldHP = state.player.hp;
    state.player.hp = st.maxHp;
    state.player.mana = st.maxMana;
    state.player.stam = st.maxStam;
    
    // Log the emperor heal
    logPlayerEvent(state, 'HEAL', {
      source: 'emperor_buff_debug',
      amount: (st.maxHp - oldHP).toFixed(1),
      oldHP: oldHP.toFixed(1),
      newHP: st.maxHp,
      maxHP: st.maxHp
    });
    
    state.ui.toast('✅ Emperor buff ADDED - Check all 3 locations!');
    console.log('%c✓ Emperor buff added to state.player.buffs:', 'color: gold; font-size: 14px; font-weight: bold;', state.player.buffs);
  }
  
  // DEBUG: Test buildActiveEffectIcons directly
  console.log('%c=== DEBUG ICONS ===', 'color: purple; font-weight: bold;');
  if(typeof buildActiveEffectIcons === 'function') {
    const icons = buildActiveEffectIcons(state);
    console.log('%cbuilldActiveEffectIcons() returned:', 'color: blue;', icons);
    console.log('%cIcon count:', 'color: blue;', icons.length);
    if(icons.length > 0) {
      console.log('%cFirst icon HTML:', 'color: blue;', icons[0].html);
    }
  } else {
    console.error('❌ buildActiveEffectIcons is not a function!');
  }
  
  // DEBUG: Check DOM elements exist
  console.log('%c=== DEBUG DOM ELEMENTS ===', 'color: purple; font-weight: bold;');
  const buffHud = document.getElementById('buffIconsHud');
  console.log('%cbuffIconsHud element exists:', 'color: blue;', !!buffHud);
  if(buffHud) {
    console.log('  - Display:', buffHud.style.display);
    console.log('  - Visibility:', window.getComputedStyle(buffHud).visibility);
    console.log('  - Current HTML:', buffHud.innerHTML);
  }
  
  const levelEffects = document.getElementById('levelEffectsList');
  console.log('%clevelEffectsList element exists:', 'color: blue;', !!levelEffects);
  if(levelEffects) {
    console.log('  - Display:', levelEffects.style.display);
    console.log('  - Current HTML:', levelEffects.innerHTML.substring(0, 100));
  }
  
  // Force ALL UI updates
  console.log('%c=== CALLING UI UPDATES ===', 'color: purple; font-weight: bold;');
  if(state.ui?.renderInventory) { 
    console.log('Calling renderInventory()'); 
    state.ui.renderInventory(); 
  }
  if(state.ui?.renderLevel) { 
    console.log('Calling renderLevel()'); 
    state.ui.renderLevel(); 
  }
  if(state.ui?.updateBuffIconsHUD) { 
    console.log('Calling updateBuffIconsHUD()'); 
    state.ui.updateBuffIconsHUD(); 
  }
  if(state.ui?.renderHud) { 
    console.log('Calling renderHud()'); 
    state.ui.renderHud(currentStats(state)); 
  }
  
  // DEBUG: Check DOM after updates
  console.log('%c=== AFTER UI UPDATES ===', 'color: purple; font-weight: bold;');
  if(buffHud) {
    console.log('%cbuffIconsHud HTML after update:', 'color: green;', buffHud.innerHTML);
  }
  if(levelEffects) {
    console.log('%clevelEffectsList HTML after update:', 'color: green;', levelEffects.innerHTML.substring(0, 200));
  }
};

// ================== LOGGING SYSTEM ==================
// Captures player events for debugging
export function initGameLogging(state){
  // Initialize player event log (detailed tracking of everything affecting player)
  if(!state.playerLog) state.playerLog = [];

  // Initialize applied-effects audit log (buff/dot applications tied to source abilities)
  if(!state.effectApplyLog) state.effectApplyLog = [];
}

// Log player events (damage, healing, shields, buffs, etc.)
function logPlayerEvent(state, type, data){
  if(!state.playerLog) state.playerLog = [];
  
  const event = {
    time: (state.campaign?.time || 0).toFixed(2),
    timestamp: Date.now(),
    type,
    ...data
  };
  
  state.playerLog.push(event);
  
  // Keep only last 2000 events to prevent memory bloat
  if(state.playerLog.length > 2000){
    state.playerLog.shift();
  }
}

// Log effect casts (buffs, shields, heals) from all sources
function logEffect(state, effectType, ability, caster, kind, targets = 1){
  if(!state.effectLog) state.effectLog = [];
  
  const event = {
    time: (state.campaign?.time || 0).toFixed(2),
    timestamp: Date.now(),
    effectType,  // 'buff', 'shield', 'heal', 'hot'
    ability,
    caster: caster.name || caster.variant || kind,
    casterId: caster.id || caster._id,
    kind,  // 'friendly', 'enemy', 'player'
    targets
  };
  
  state.effectLog.push(event);
  
  // Keep only last 2000 events
  if(state.effectLog.length > 2000){
    state.effectLog.shift();
  }
}

// Log applied effects (buffs/dots) with precise IDs and attribution.
// This is the audit stream used to compare "ability casts" vs "effects actually applied".
function logEffectApplied(state, data){
  if(!state) return;
  if(!state.effectApplyLog) state.effectApplyLog = [];

  const evt = {
    time: (state.campaign?.time || 0).toFixed(2),
    timestamp: Date.now(),
    ...data
  };

  state.effectApplyLog.push(evt);

  // Keep only last 6000 events (more than cast log because this is per-target)
  if(state.effectApplyLog.length > 6000){
    state.effectApplyLog.shift();
  }
}

function logDebug(state, category, message, data = {}){
  if(!state.debugLog) state.debugLog = [];
  
  const event = {
    time: (state.campaign?.time || 0).toFixed(2),
    timestamp: Date.now(),
    category,
    message,
    ...data
  };
  
  state.debugLog.push(event);
  
  // Keep only last 2000 events to prevent memory bloat
  if(state.debugLog.length > 2000){
    state.debugLog.shift();
  }
}

// ================== COMPREHENSIVE AI BEHAVIOR TRACKING ==================
// Tracks AI decision changes, target switches, behavior changes, and position loops
function logAIBehavior(state, unit, eventType, data = {}){
  if(!state.aiBehaviorLog) state.aiBehaviorLog = [];
  
  const unitId = unit.id || unit._id;
  const unitName = unit.name || unit.variant || 'unknown';
  const kind = unit.team === 'player' ? 'friendly' : 'enemy';
  const now = state.campaign?.time || 0;
  
  // Track previous state for change detection
  if(!unit._aiState) unit._aiState = {
    lastDecision: null,
    lastTarget: null,
    lastBehavior: null,
    lastPosition: { x: unit.x, y: unit.y, time: now },
    positionHistory: [],
    decisionChangeCount: 0,
    targetChangeCount: 0,
    stuckWarnings: 0,
    lastCheckTime: 0  // For throttling stuck loop checks
  };
  
  const aiState = unit._aiState;
  let shouldLog = false;
  let eventData = {
    time: now.toFixed(2),
    timestamp: Date.now(),
    unitId,
    unitName,
    kind,
    team: unit.team,
    role: unit.role || unit.guardRole || 'DPS',
    behavior: unit.behavior || 'neutral',
    eventType,
    position: { x: Math.round(unit.x), y: Math.round(unit.y) },
    hp: unit.hp ? Math.round(unit.hp) : 0,
    ...data
  };
  
  // DECISION CHANGE TRACKING (with 2s commit duration to prevent thrashing)
  if(eventType === 'decision_change'){
    // DECISION COMMIT DURATION: Force minimum 2s commitment to decisions
    // This prevents rapid flip-flopping between states
    const timeSinceLastChange = now - (aiState._lastDecisionChange || 0);
    const isEmergency = data.emergency || false; // Allow instant override for emergencies
    const minCommitTime = isEmergency ? 0 : 2.0; // 2 second minimum commitment
    const canChange = timeSinceLastChange >= minCommitTime;
    
    if(data.newDecision !== aiState.lastDecision){
      if(canChange){
        aiState.lastDecision = data.newDecision;
        aiState.decisionChangeCount++;
        aiState._lastDecisionChange = now;
        
        // Only log decision changes once every 0.5 seconds (max 2 per second)
        const timeSinceLastLog = now - (aiState._lastDecisionLog || 0);
        if(timeSinceLastLog >= 0.5){
          shouldLog = true;
          aiState._lastDecisionLog = now;
        }
        
        // Warn if decision thrashing (changing too frequently)
        if(aiState.decisionChangeCount > 30 && now - (aiState._lastDecisionWarn || 0) > 15){
          eventData.warning = 'DECISION_THRASHING';
          eventData.changeCount = aiState.decisionChangeCount;
          aiState._lastDecisionWarn = now;
          shouldLog = true; // Always log warnings
        }
      } else {
        // Decision blocked by commit duration - log for debugging if needed
        if(state.options?.showDebugAI && Math.random() < 0.01){
          eventData.blocked = true;
          eventData.timeRemaining = (minCommitTime - timeSinceLastChange).toFixed(2);
          shouldLog = true;
        }
      }
    }
  }
  
  // TARGET CHANGE TRACKING
  else if(eventType === 'target_change'){
    const newTargetId = data.newTarget ? (data.newTarget.id || data.newTarget._id) : null;
    if(newTargetId !== aiState.lastTarget){
      aiState.lastTarget = newTargetId;
      aiState.targetChangeCount++;
      shouldLog = true;
      
      // Add target details
      if(data.newTarget){
        eventData.targetName = data.newTarget.name || data.newTarget.variant || 'unknown';
        eventData.targetHP = data.newTarget.hp ? Math.round(data.newTarget.hp) : 0;
        eventData.targetDist = data.distance ? Math.round(data.distance) : null;
      }
      
      // Warn if target thrashing
      if(aiState.targetChangeCount > 15 && now - (aiState._lastTargetWarn || 0) > 10){
        eventData.warning = 'TARGET_THRASHING';
        eventData.changeCount = aiState.targetChangeCount;
        aiState._lastTargetWarn = now;
      }
    }
  }
  
  // BEHAVIOR CHANGE TRACKING (aggressive ↔ neutral)
  else if(eventType === 'behavior_change'){
    if(data.newBehavior !== aiState.lastBehavior){
      aiState.lastBehavior = data.newBehavior;
      shouldLog = true;
      eventData.oldBehavior = data.oldBehavior;
    }
  }
  
  // POSITION LOOP DETECTION (stuck detection)
  else if(eventType === 'position_check'){
    // Track position every ~2 seconds
    const timeSinceLastCheck = now - aiState.lastPosition.time;
    if(timeSinceLastCheck >= 2.0){
      const distMoved = Math.hypot(unit.x - aiState.lastPosition.x, unit.y - aiState.lastPosition.y);
      
      // Store position in history
      aiState.positionHistory.push({
        x: unit.x,
        y: unit.y,
        time: now,
        distMoved
      });
      
      // Keep only last 10 positions
      if(aiState.positionHistory.length > 10){
        aiState.positionHistory.shift();
      }
      
      // Check for stuck loop (minimal movement over time) - throttle to every 3s
      if(aiState.positionHistory.length >= 5 && now - aiState.lastCheckTime >= 3.0){
        const last5 = aiState.positionHistory.slice(-5);
        const totalDist = last5.reduce((sum, p) => sum + (p.distMoved || 0), 0);
        const avgDist = totalDist / 5;
        
        // If average movement < 20 units over 10 seconds while trying to move, likely stuck
        // Using 20 units as threshold - higher values catch wandering behavior as "stuck"
        if(avgDist < 20 && data.isMoving){
          shouldLog = true;
          aiState.stuckWarnings++;
          eventData.warning = 'STUCK_LOOP_DETECTED';
          eventData.avgMovement = avgDist.toFixed(1);
          eventData.stuckCount = aiState.stuckWarnings;
          eventData.positionHistory = last5.map(p => `(${Math.round(p.x)},${Math.round(p.y)})`);
        }
        aiState.lastCheckTime = now;
      }
      
      aiState.lastPosition = { x: unit.x, y: unit.y, time: now };
    }
  }
  
  // PRIORITY CHANGE TRACKING
  else if(eventType === 'priority_shift'){
    shouldLog = true;
  }
  
  // COMBAT ENGAGEMENT TRACKING (throttled to prevent spam)
  else if(eventType === 'combat_engage' || eventType === 'combat_disengage'){
    // Only log combat engage once per second to prevent spam (50 events/sec fills buffer in 10s)
    const timeSinceLastLog = now - (aiState._lastCombatLog || 0);
    if(timeSinceLastLog >= 1.0){
      shouldLog = true;
      aiState._lastCombatLog = now;
    }
  }
  
  // Log event if it's significant
  if(shouldLog){
    state.aiBehaviorLog.push(eventData);
    
    // Keep only last 500 events to prevent memory bloat
    if(state.aiBehaviorLog.length > 500){
      state.aiBehaviorLog.shift();
    }
  }
}


// Download player event log
export function downloadPlayerLog(state){
  try{
    if(!state.playerLog || state.playerLog.length === 0){
      alert('No player events logged yet. Play for a bit and try again.');
      return;
    }
    
    let log = 'Player Event Log\n';
    log += '='.repeat(120) + '\n';
    log += `Generated: ${new Date().toLocaleString()}\n`;
    log += `Total Events: ${state.playerLog.length}\n`;
    log += `Game Time: ${Math.floor(state.campaign?.time || 0)}s\n`;
    log += `Player Level: ${state.progression?.level || 1}\n`;
    log += `Player HP: ${Math.round(state.player.hp)}/${Math.round(currentStats(state).maxHp)}\n`;
    log += `Player Shield: ${Math.round(state.player.shield)}\n\n`;
    
    // Keep only last 1000 events
    const events = state.playerLog.slice(-1000);
    
    for(const evt of events){
      const time = `[${evt.time}s]`.padEnd(10);
      
      if(evt.type === 'DAMAGE_TAKEN'){
        log += `${time} DAMAGE: ${evt.raw.toFixed(1)} raw → Shield: -${(evt.shieldAbsorbed || 0).toFixed(1)} → Block: -${(evt.blocked || 0).toFixed(1)} → Def: -${(evt.defReduced || 0).toFixed(1)} → HP: -${evt.hpLoss.toFixed(1)} (${evt.hpBefore.toFixed(1)} → ${evt.hpAfter.toFixed(1)})\n`;
      }
      else if(evt.type === 'HEAL_RECEIVED'){
        log += `${time} HEAL: +${evt.amount.toFixed(1)} HP from ${evt.source} (${evt.hpBefore.toFixed(1)} → ${evt.hpAfter.toFixed(1)})\n`;
      }
      else if(evt.type === 'SHIELD_GAINED'){
        const distInfo = evt.distance !== undefined ? ` (range: ${evt.distance}/${evt.radius})` : '';
        log += `${time} SHIELD: +${evt.amount.toFixed(1)} from ${evt.source}${distInfo} (${evt.before.toFixed(1)} → ${evt.after.toFixed(1)})\n`;
      }
      else if(evt.type === 'SHIELD_LOST'){
        log += `${time} SHIELD: -${evt.amount.toFixed(1)} absorbed damage (${evt.before.toFixed(1)} → ${evt.after.toFixed(1)})\n`;
      }
      else if(evt.type === 'BUFF_APPLIED'){
        log += `${time} BUFF: ${evt.buffName} applied (duration: ${evt.duration}s, stacks: ${evt.stacks})\n`;
      }
      else if(evt.type === 'BUFF_EXPIRED'){
        log += `${time} BUFF: ${evt.buffName} expired\n`;
      }
      else if(evt.type === 'REGEN'){
        log += `${time} REGEN: +${evt.amount.toFixed(1)} ${evt.stat} (${evt.before.toFixed(1)} → ${evt.after.toFixed(1)})\n`;
      }
      else if(evt.type === 'STAT_CHANGE'){
        log += `${time} STATS: ${evt.stat} changed from ${evt.before.toFixed(1)} to ${evt.after.toFixed(1)} (reason: ${evt.reason})\n`;
      }
      else if(evt.type === 'ABILITY_CAST'){
        log += `${time} CAST: ${evt.ability} (cost: ${evt.cost} mana)\n`;
      }
    }
    
    log += '\n' + '='.repeat(120) + '\n';
    log += 'END OF PLAYER LOG\n';
    
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log(`[LOG] Downloaded player log with ${events.length} events`);
  }catch(e){
    console.error('[LOG] Failed to download player log:', e);
    alert('Failed to download player log');
  }
}

export function downloadCombatLog(state){
  try{
    if(!state.combatLog || state.combatLog.length === 0){
      alert('No combat events logged yet. Play for a bit and try again.');
      return;
    }
    
    let log = 'Combat Event Log\n';
    log += '='.repeat(100) + '\n';
    log += `Generated: ${new Date().toLocaleString()}\n`;
    log += `Total Events: ${state.combatLog.length}\n`;
    log += `Game Time: ${Math.floor(state.campaign?.time || 0)}s\n\n`;
    
    // Keep only last 1000 events to prevent huge files
    const events = state.combatLog.slice(-1000);
    
    for(const evt of events){
      const time = `[${evt.time}s]`.padEnd(12);
      
      if(evt.type === 'DAMAGE'){
        log += `${time} DAMAGE: ${evt.target} took ${evt.hpLoss} HP (raw: ${evt.raw}, shield: ${evt.shieldAbsorbed}, block: ${evt.blocked}, def: ${evt.defReduced}) | HP: ${evt.hpBefore} → ${evt.hpAfter}\n`;
      }
      else if(evt.type === 'SHIELD_DAMAGE'){
        log += `${time} SHIELD ONLY: ${evt.target} blocked ${evt.shieldAbsorbed} damage (raw: ${evt.raw}) | Shield absorbed all damage\n`;
      }
      else if(evt.type === 'HOT_CREATE'){
        log += `${time} HOT START: ${evt.ability} by ${evt.caster} (${evt.healPerTick}/tick for ${evt.duration}s, ${evt.targets} targets, enemy=${evt.isEnemyCaster})\n`;
      }
      else if(evt.type === 'HOT_TICK'){
        log += `${time} HOT HEAL: ${evt.target} +${evt.gained} HP (${evt.hpBefore} -> ${evt.hpAfter}, ${evt.timeLeft}s left)\n`;
      }
      else if(evt.type === 'HOT_EXPIRED'){
        log += `${time} HOT END: ${evt.target} heal-over-time expired\n`;
      }
    }
    
    log += '\n' + '='.repeat(100) + '\n';
    log += 'END OF LOG\n';
    
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combat-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log(`[LOG] Downloaded combat log with ${events.length} events`);
  }catch(e){
    console.error('[LOG] Failed to download combat log:', e);
    alert('Failed to download combat log');
  }
}

// Console Error Logger - captures console errors for debugging
export function initConsoleErrorLogger(state){
  if(!state.consoleErrors) state.consoleErrors = [];
  
  const originalError = console.error;
  console.error = function(...args){
    // Call original console.error
    originalError.apply(console, args);
    
    // Store the error with timestamp
    state.consoleErrors.push({
      timestamp: new Date().toISOString(),
      message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
    });
    
    // Keep only last 500 errors to avoid memory bloat
    if(state.consoleErrors.length > 500){
      state.consoleErrors.shift();
    }
  };
}

export function downloadErrorLog(state){
  if(!state.consoleErrors || state.consoleErrors.length === 0){
    alert('No error logs available');
    return;
  }
  
  try{
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '-');
    const filename = `console-errors_${date}_${time}.log`;
    
    // Create error log content
    let logContent = `Console Error Log\n`;
    logContent += `Generated: ${new Date().toISOString()}\n`;
    logContent += `Total Errors: ${state.consoleErrors.length}\n`;
    logContent += `${'='.repeat(80)}\n\n`;
    
    // Add each error with timestamp
    for(const err of state.consoleErrors){
      logContent += `[${err.timestamp}]\n`;
      logContent += `${err.message}\n`;
      logContent += `${'-'.repeat(80)}\n`;
    }
    
    // Create and download the file
    const dataBlob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`[LOG] Downloaded ${state.consoleErrors.length} errors to ${filename}`);
  }catch(e){
    console.error('[LOG] Failed to download error log:', e);
    alert('Failed to download error log');
  }
}

export function downloadDebugLog(state){
  if(!state.debugLog || state.debugLog.length === 0){
    console.warn('No debug events logged yet');
    return;
  }

  let txt = 'Debug Diagnostic Log\n';
  txt += '='.repeat(120) + '\n';
  txt += `Generated: ${new Date().toLocaleString()}\n`;
  txt += `Total Events: ${state.debugLog.length}\n`;
  txt += `Game Time: ${Math.floor(state.campaign?.time || 0)}s\n\n`;
  
  txt += 'CURRENT STATE:\n';
  txt += `  Player Level: ${state.progression?.level || 1}\n`;
  txt += `  Player HP: ${Math.round(state.player.hp)}/${Math.round(currentStats(state).maxHp)}\n`;
  txt += `  Player Mana: ${Math.round(state.player.mana)}/${Math.round(currentStats(state).maxMana)}\n`;
  txt += `  Player Stamina: ${Math.round(state.player.stam)}/${Math.round(currentStats(state).maxStam)}\n`;
  txt += `  Player Shield: ${Math.round(state.player.shield)} (cap: ${Math.round(currentStats(state).maxHp)})\n`;
  txt += `  Base Player MaxMana: ${state.basePlayer.maxMana}\n`;
  txt += `  Stat Spends: ${JSON.stringify(state.progression.spends)}\n\n`;

  // Keep last 1000 events
  const events = state.debugLog.slice(-1000);

  // Group by category for easier reading (fall back to type)
  const categories = {};
  for(const ev of events){
    const catKey = (ev.category || (ev.type ? String(ev.type) : 'UNCATEGORIZED'));
    if(!categories[catKey]) categories[catKey] = [];
    categories[catKey].push(ev);
  }

  for(const [cat, evs] of Object.entries(categories)){
    txt += `\n${'='.repeat(40)} ${cat} ${'='.repeat(40)}\n`;
    for(const ev of evs){
      const time = `[${ev.time}s]`.padEnd(10);
      const msg = (ev.message || ev.type || '').toString();
      const data = Object.entries(ev)
        .filter(([k]) => k !== 'time' && k !== 'timestamp' && k !== 'category' && k !== 'message')
        .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
        .join(', ');
      txt += `${time} ${msg}${data ? ' | ' + data : ''}\n`;
    }
  }

  txt += '\n' + '='.repeat(120) + '\n';
  txt += 'END OF DEBUG LOG\n';

  const blob = new Blob([txt], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debug-log-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Download AI behavior tracking log
export function downloadAIBehaviorLog(state){
  if(!state.aiBehaviorLog || state.aiBehaviorLog.length === 0){
    alert('No AI behavior events logged yet. Play for a bit and try again.');
    return;
  }

  let txt = 'AI Behavior Tracking Log\n';
  txt += '='.repeat(120) + '\n';
  txt += `Generated: ${new Date().toLocaleString()}\n`;
  txt += `Total Events: ${state.aiBehaviorLog.length}\n`;
  txt += `Game Time: ${Math.floor(state.campaign?.time || 0)}s\n\n`;
  
  txt += 'This log tracks:\n';
  txt += '  • Decision changes (when AI switches between actions)\n';
  txt += '  • Target changes (when AI switches targets)\n';
  txt += '  • Behavior changes (aggressive ↔ neutral)\n';
  txt += '  • Position loops (stuck detection)\n';
  txt += '  • Combat engagement/disengagement\n\n';

  // Group by unit for easier reading
  const unitEvents = {};
  for(const ev of state.aiBehaviorLog){
    const key = `${ev.unitName} (${ev.kind})`;
    if(!unitEvents[key]) unitEvents[key] = [];
    unitEvents[key].push(ev);
  }

  for(const [unitName, events] of Object.entries(unitEvents)){
    txt += `\n${'='.repeat(50)} ${unitName} ${'='.repeat(50)}\n`;
    txt += `Total Events: ${events.length}\n`;
    txt += `Role: ${events[0].role}\n`;
    txt += `Team: ${events[0].team}\n\n`;
    
    for(const ev of events){
      const time = `[${ev.time}s]`.padEnd(10);
      let msg = `${time} ${ev.eventType.toUpperCase()}`;
      
      if(ev.eventType === 'decision_change'){
        msg += ` → ${ev.newDecision} (target: ${ev.target || 'none'}, dist: ${ev.distance || 0})`;
      } else if(ev.eventType === 'target_change'){
        msg += ` → ${ev.targetName || 'none'} (HP: ${ev.targetHP || 0}, dist: ${ev.targetDist || 0})`;
      } else if(ev.eventType === 'behavior_change'){
        msg += ` → ${ev.oldBehavior} → ${ev.behavior}`;
      } else if(ev.eventType === 'combat_engage'){
        msg += ` → ${ev.target} (HP: ${ev.targetHP}, dist: ${ev.distance}, priority: ${ev.priority || 'N/A'})`;
      } else if(ev.eventType === 'combat_disengage'){
        msg += ` → ${ev.reason || 'unknown'}`;
      }
      
      if(ev.warning){
        msg += ` ⚠️ ${ev.warning}`;
        if(ev.changeCount) msg += ` (${ev.changeCount} changes)`;
        if(ev.stuckCount) msg += ` (${ev.stuckCount} stuck warnings)`;
        if(ev.avgMovement) msg += ` (avg movement: ${ev.avgMovement})`;
      }
      
      txt += msg + '\n';
    }
  }

  txt += '\n' + '='.repeat(120) + '\n';
  txt += 'END OF AI BEHAVIOR LOG\n';

  const blob = new Blob([txt], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-behavior-log-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Expose player log download as console command
window.downloadPlayerLog = function(){
  const state = window.state;
  if(!state){
    console.error('❌ State not found. Make sure the game is loaded.');
    return;
  }
  downloadPlayerLog(state);
};

// Expose combat log download as console command
window.downloadCombatLog = function(){
  const state = window.state;
  if(!state){
    console.error('❌ State not found. Make sure the game is loaded.');
    return;
  }
  downloadCombatLog(state);
};

// Expose debug log download as console command
window.downloadDebugLog = function(){
  const state = window.state;
  if(!state){
    console.error('❌ State not found. Make sure the game is loaded.');
    return;
  }
  downloadDebugLog(state);
};

// Expose AI behavior log download as console command
window.downloadAIBehaviorLog = function(){
  const state = window.state;
  if(!state){
    console.error('❌ State not found. Make sure the game is loaded.');
    return;
  }
  downloadAIBehaviorLog(state);
};

console.log('💾 Player logging enabled. Use window.downloadPlayerLog() to download detailed player event log.');
console.log('⚔️ Combat logging available. Use window.downloadCombatLog() to download combat event log.');
console.log('🔧 Debug logging available. Use window.downloadDebugLog() to download diagnostic log.');
console.log('🤖 AI behavior tracking enabled. Use window.downloadAIBehaviorLog() to download AI behavior analysis.');