import { loadJson } from "../engine/util.js";
import { DEFAULT_BINDS, ARMOR_SLOTS, KEYBIND_VERSION } from "./constants.js";
import { defaultAbilitySlots, defaultPassives, getSkillById } from "./skills.js";
import { META_LOADOUTS } from "./loadouts.js";

export function createState(engine, input, ui){
  // options + binds + saves
  let options = loadJson('orb_rpg_mod_opts') ?? { showAim:true, showDebug:false, autoPickup:false };
  if(!options.hasOwnProperty('cameraMode')) options.cameraMode = 'follow';
  if(!options.hasOwnProperty('autoPickup')) options.autoPickup = false;
  // Developer mode (loaded from localStorage, default false)
  const devMode = localStorage.getItem('devMode') === 'true';
  
  // Load binds with version check - reset if version changed
  let savedBinds = loadJson('orb_rpg_mod_binds');
  let binds;
  if(savedBinds && savedBinds._version === KEYBIND_VERSION){
    binds = savedBinds;
  } else {
    binds = structuredClone(DEFAULT_BINDS);
    binds._version = KEYBIND_VERSION;
    localStorage.setItem('orb_rpg_mod_binds', JSON.stringify(binds));
  }

  // Always start fresh progression at level 1 (ignore saved progression for now)
  const progression = { level:1, xp:0, statPoints:1, spends:{vit:0,int:0,str:0,def:0,agi:0} };
  const campaign = loadJson('orb_rpg_mod_campaign') ?? { playerPoints:0, enemyPoints:0, targetPoints:250, time:0 };

  const basePlayer={
    maxHp:120,maxMana:70,maxStam:100,
    hpRegen:1.4,manaRegen:3.0,stamRegen:18,
    atk:6,def:2,speed:145,sprintMult:1.45,
    critChance:0.08,critMult:1.7,cdr:0,
    blockBase:0.50,blockCap:0.80,
    blockStamDrain:10,sprintStamDrain:26,
  };

  const player={
    x:engine.canvas.width/2,y:engine.canvas.height/2,r:14,
    hp:basePlayer.maxHp,mana:basePlayer.maxMana,stam:basePlayer.maxStam,
    name:'Hero',
    shield:0,gold:500,
    buffs:[], dots:[],
    equipment: { weapon: structuredClone(META_LOADOUTS.HEALER.weapon) },  // Start with HEALER weapon
    equip:Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null])), // will be swapped from heroEquip on hero switch
    potion:null,
    passives: defaultPassives(getSkillById),
    cd:[0,0,0,0,0],
    dead:false,
    respawnT:0
  };

  const state={
    engine,input,ui,
    options, binds,
    devMode,
    progression, campaign,
    basePlayer, player,
    currentHero: 'warrior', // track current hero class
    abilitySlots: defaultAbilitySlots(), // ALWAYS START EMPTY - new game always has empty ability slots
    heroAbilitySlots: { mage:defaultAbilitySlots(), warrior:defaultAbilitySlots(), knight:defaultAbilitySlots(), tank:defaultAbilitySlots() }, // Per-hero empty slots
    // ABILITY LOADOUTS: Persists across new games (loaded from localStorage, not reset)
    abilityLoadouts: (() => {
      const saved = loadJson('orb_rpg_mod_loadouts');
      if(saved) return saved; // Keep saved loadouts from previous games
      // Initialize with empty loadouts only if none exist
      return {
        mage: [{name:'Loadout 1', slots:null},{name:'Loadout 2', slots:null},{name:'Loadout 3', slots:null}],
        warrior: [{name:'Loadout 1', slots:null},{name:'Loadout 2', slots:null},{name:'Loadout 3', slots:null}],
        knight: [{name:'Loadout 1', slots:null},{name:'Loadout 2', slots:null},{name:'Loadout 3', slots:null}],
        tank: [{name:'Loadout 1', slots:null},{name:'Loadout 2', slots:null},{name:'Loadout 3', slots:null}]
      };
    })(),
    // Per-hero equipment storage (items equipped on each hero)
    heroEquip: { 
      mage: Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null])),
      warrior: Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null])),
      knight: Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null])),
      tank: Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null]))
    },
    // Group system (friendlies that follow/fight with player)
    group: {
      members: [], // array of friendly IDs that are in the group (max 10)
      selectedMemberId: null, // currently selected member in UI
      // Per-member settings: { [friendlyId]: { name, behavior (aggressive/neutral/group), role (dps/tank/healer), class, equipment, abilities } }
      settings: {}
    },
    // Party coordinator + blackboard for group AI
    party: {
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
    },
    paused:false,
    showInventory:false, showSkills:false, showLevel:false, inMenu:false, showMarketplace:false,
    campaignEnded:false,
    // world collections
    sites:[],
    dungeons:[],
    enemies:[],
    friendlies:[],
    creatures:[],
    projectiles:[],
    loot:[],
    inventory:[],
    selectedIndex:-1,
    selectedEquipSlot:null,
    // respawn queues
    enemyRespawns:[],
    reinforcements:[],
    bossRespawnT: 0,
    factionGold: { player: 0, teamA: 0, teamB: 0, teamC: 0 },
    factionTech: { player: 1, teamA: 1, teamB: 1, teamC: 1 },
    teamPoints: { player: 0, teamA: 0, teamB: 0, teamC: 0 },
    rubberband: { gapThreshold: 60, closeThreshold: 30, baseTickGold: 250, interval: 60, nonLastScale: 0.6, maxAssistPerTeam: 10000 },
    rubberbandNext: { player: 0, teamA: 0, teamB: 0, teamC: 0 },
    rubberbandAwarded: { player: 0, teamA: 0, teamB: 0, teamC: 0 },
    // Marketplace dynamic costs for squad upgrades
    marketCosts: { squadArmor: 1000, squadLevel: 800 },
    // world / camera
    mapWidth: 0,
    mapHeight: 0,
    camera: { x:0, y:0, zoom:1 },
    mapOpen: false,
    mapView: { x:0, y:0, zoom:0.18 },
    trees: [],
    waters: [],
    uiHidden: true,
    emperor: false,
    emperorTeam: null, // 'player', 'teamA', 'teamB', 'teamC', or null if no emperor
    emperorSince: 0, // timestamp when emperor was crowned
    fastTravelCooldown: 0,
    // effects
    effects:{ wells:[], heals:[], slashes:[], storms:[], bolts:[], flashes:[], damageNums:[] },
    rebindAction:null,
    friendlySpawnTimer:0,
    enemySpawnTimer:0,
    selectedUnit: null, // clicked unit (enemy/friendly/creature) for inspection
    autoSaveTimer: 0, // track time for auto-save every 60 seconds
    // Logging system
    gameLog: {
      enabled: false,
      events: [],
      startTime: 0,
      lastSaveTime: 0
    }
  };

  // Expose state globally for console map loading
  if(typeof window !== 'undefined') window._gameState = state;

  return state;
}
