import { initCanvas } from "./engine/canvas.js";
import { initInput } from "./engine/input.js";
import { startLoop } from "./engine/loop.js";
import { createState } from "./game/state.js";
import { buildUI } from "./game/ui.js";
import { initGame, handleHotkeys, updateGame, importSave, hardResetGameState, initGameLogging, currentStats } from "./game/game.js";
import { showCharSelect } from "./game/charselect.js";
import { render } from "./game/render.js";
import "./loadMapInit.js"; // Initialize map loader helper
import { getAssetPath } from "./config.js";

const engine = initCanvas("c");
const input = initInput(engine.canvas);

// Create state (ui filled after build)
let state = createState(engine, input, null);
let ui; // Will be initialized after all imports complete

// Expose state for debugging console commands
window.state = state;

// Console command to get all items for testing images
window.giveAllItems = function() {
  const rarities = [
    {key:'common', name:'Common', color:'var(--common)'},
    {key:'uncommon', name:'Uncommon', color:'var(--uncommon)'},
    {key:'rare', name:'Rare', color:'var(--rare)'},
    {key:'epic', name:'Epic', color:'var(--epic)'},
    {key:'legend', name:'Legendary', color:'var(--legend)'}  // Fixed: 'legend' not 'legendary'
  ];
  
  const weaponTypes = ['Destruction Staff', 'Healing Staff', 'Axe', 'Sword', 'Dagger', 'Greatsword'];
  const armorSlots = ['helm', 'chest', 'shoulders', 'hands', 'belt', 'legs', 'feet', 'neck', 'accessory1', 'accessory2'];
  
  let itemCount = 0;
  
  // Add one of each weapon at each rarity
  weaponTypes.forEach(weaponType => {
    rarities.forEach(rarity => {
      const item = state._itemGen.makeWeapon(weaponType, rarity, 1);
      state.inventory.push(item);
      itemCount++;
    });
  });
  
  // Add one of each armor slot at each rarity
  armorSlots.forEach(slot => {
    rarities.forEach(rarity => {
      const item = state._itemGen.makeArmor(slot, rarity, 1);
      state.inventory.push(item);
      itemCount++;
    });
  });
  
  // Add potions
  const potionItem = state._itemGen.makePotion('hp', rarities[2], 1);
  state.inventory.push(potionItem);
  const manaPotion = state._itemGen.makePotion('mana', rarities[2], 1);
  state.inventory.push(manaPotion);
  itemCount += 2;
  
  // Refresh inventory UI
  if(state.ui && state.ui.updateInventory){
    state.ui.updateInventory();
  }
  
  console.log(`✓ Added ${itemCount} items to inventory (${weaponTypes.length * rarities.length} weapons, ${armorSlots.length * rarities.length} armor, 2 potions)`);
  console.log('Check your inventory to verify all item images are displaying correctly!');
  return itemCount;
};

// Console command to apply all buffs to player
window.giveAllBuffs = function() {
  const buffIds = [
    // Combat Buffs
    'healing_empowerment', 'blessed', 'radiance', 'temporal_flux', 'berserker_rage',
    'iron_will', 'swift_strikes', 'arcane_power', 'battle_fury', 'guardian_stance',
    // Sustain Buffs
    'regeneration', 'mana_surge', 'vigor', 'spirit', 'endurance',
    'fortified', 'lifesteal_boost',
    // Mobility Buffs
    'haste', 'sprint', 'flight',
    // Utility Buffs
    'focus', 'clarity', 'stealth', 'divine_shield', 'lucky', 'berserk',
    // Special
    'emperor_power'
  ];
  
  let appliedCount = 0;
  buffIds.forEach(buffId => {
    if(state._applyBuff) {
      state._applyBuff(state.player, buffId);
      appliedCount++;
    }
  });
  
  console.log(`✓ Applied ${appliedCount} buffs to player!`);
  console.log('All positive buffs are now active (including Emperor Power). Check your character stats and buff bar!');
  return appliedCount;
};

// Console command to apply all effects (buffs + debuffs) to player
window.giveAllEffects = function() {
  const allEffectIds = [
    // Combat Buffs
    'healing_empowerment', 'blessed', 'radiance', 'temporal_flux', 'berserker_rage',
    'iron_will', 'swift_strikes', 'arcane_power', 'battle_fury', 'guardian_stance',
    // Sustain Buffs
    'regeneration', 'mana_surge', 'vigor', 'spirit', 'endurance',
    'fortified', 'lifesteal_boost',
    // Mobility Buffs
    'haste', 'sprint', 'flight',
    // Utility Buffs
    'focus', 'clarity', 'stealth', 'divine_shield', 'lucky', 'berserk',
    // Special
    'emperor_power',
    // Debuffs (for testing)
    'slow', 'root', 'silence', 'stun', 'poison', 'bleed', 'burn',
    'arcane_burn', 'weakness', 'vulnerability', 'curse', 'frozen', 'shocked'
  ];
  
  let appliedCount = 0;
  allEffectIds.forEach(effectId => {
    if(state._applyBuff) {
      state._applyBuff(state.player, effectId);
      appliedCount++;
    }
  });
  
  console.log(`✓ Applied ${appliedCount} effects (buffs + debuffs) to player!`);
  console.log('WARNING: This includes debuffs like stun, root, and poison for testing purposes.');
  console.log('Includes Emperor Power: +3x HP/Mana/Stamina, 50% CDR');
  return appliedCount;
};

// Initialize UI after all modules are loaded
async function initializeApp() {
  ui = buildUI(state);
  state.ui = ui;
  setupEventHandlers();
  
  // Start main menu music when app loads
  if(!state.sounds) state.sounds = {};
  if(!state.sounds.mainMenuMusic){
    state.sounds.mainMenuMusic = new Audio(getAssetPath('assets/sounds/Main Menu Music.mp3'));
    state.sounds.mainMenuMusic.loop = true;
    state.sounds.mainMenuMusic.volume = 0.4;
  }
  // Auto-play main menu music (may fail due to browser autoplay policy)
  state.sounds.mainMenuMusic.play().catch(e => {
    console.warn('Main menu music autoplay blocked. Click to start music.');
    // Add a one-time click listener to start music if autoplay is blocked
    const startMusic = () => {
      if(state.sounds.mainMenuMusic.paused){
        state.sounds.mainMenuMusic.play().catch(err => console.warn('Music play failed:', err));
      }
      document.removeEventListener('click', startMusic);
    };
    document.addEventListener('click', startMusic);
  });
}

// Track if game loop is running to prevent multiple loops
let gameLoopRunning = false;

// helper: show a visible runtime error overlay for debugging
function showFatalError(msg, err){
  if(state._fatalShown) return; state._fatalShown = true;
  try{
    const root = document.getElementById('ui-root');
    const ov = document.createElement('div');
    ov.id = 'fatalErrorOverlay';
    ov.className = 'overlay show';
    const stack = err && err.stack ? err.stack : String(err);
    ov.innerHTML = `
      <div class="panel" style="max-width:860px">
        <h2 style="color:#c33">Runtime Error</h2>
        <div class="box" style="white-space:pre-wrap; font-family:monospace; font-size:12px; max-height:320px; overflow:auto">${msg}\n\n${stack}</div>
        <div style="margin-top:8px" class="btnRow">
          <button id="fatalClose">Close</button>
        </div>
      </div>`;
    root.appendChild(ov);
    document.getElementById('fatalClose').addEventListener('click', ()=>ov.remove());
  }catch(e){ console.error('showFatalError failed',e); }
}

function startGameLoop(){
  if(gameLoopRunning){
    console.warn('Game loop already running, skipping duplicate start');
    return;
  }
  gameLoopRunning = true;
  
  // Initialize logging system
  initGameLogging(state);
  
  startLoop((dt)=>{
    try{ handleHotkeys(state, dt); }catch(e){ console.error('hotkeys',e); showFatalError('Error in handleHotkeys', e); }
    try{ updateGame(state, dt); }catch(e){ console.error('update',e); showFatalError('Error in updateGame', e); }
    try{ render(state); }catch(e){ console.error('render',e); showFatalError('Error in render', e); }
    try{ ui.renderHud(currentStats(state)); }catch(e){ console.error('renderHud',e); }
    try{ ui.renderCooldowns(); }catch(e){ console.error('renderCooldowns',e); }
    try{ ui.updateUnitInspection(); }catch(e){ console.error('updateUnitInspection',e); }
    try{ ui.updateBuffIconsHUD(); }catch(e){ console.error('updateBuffIconsHUD', e); }
    try{ ui.updateAiFeed && ui.updateAiFeed(); }catch(e){ console.error('updateAiFeed', e); }
    try{ ui.renderGroupPanel(); }catch(e){ console.error('renderGroupPanel', e); }
  });
}

// Setup event handlers
function setupEventHandlers(){
  // Wire main menu callbacks
  ui.onNewGame = async (heroName)=>{
    try{
      // proceed to character selection, then init game
      showCharSelect(state, async (chosen)=>{
        console.log('main: char selected ->', chosen);
        
        // Stop main menu music
        if(state.sounds?.mainMenuMusic && !state.sounds.mainMenuMusic.paused){
          state.sounds.mainMenuMusic.pause();
          state.sounds.mainMenuMusic.currentTime = 0;
        }
        
        try{ 
          hardResetGameState(state); // Hard reset ALL game state first
          await initGame(state); // This initializes the game music sounds
          
          // NOW start game non-combat music after sounds are initialized
          if(state.sounds?.gameNonCombatMusic){
            console.log('[MUSIC] Starting non-combat music after initGame');
            state.sounds.gameNonCombatMusic.currentTime = 0;
            state.sounds.gameNonCombatMusic.play().catch(e => console.warn('Game music play failed:', e));
          } else {
            console.warn('[MUSIC] gameNonCombatMusic not initialized!');
          }
          
        }catch(err){ console.error('initGame error',err); ui.toast(`Error initializing: ${err && err.message?err.message:err}`); showFatalError('initGame failed', err); return; }
        state.paused = false;
        ui.setGameUIVisible(true);
        startGameLoop();
      });
    }catch(err){ console.error('NewGame failed', err); showFatalError('New Game failed', err); }
  };

  ui.onLoadGame = (saveData)=>{
    try{
      // Initialize game first (like New Game), then import the loaded save
      (async ()=>{
        try{ 
          hardResetGameState(state); // Hard reset ALL game state first
          await initGame(state); // This initializes the game music sounds
        }catch(err){ console.error('initGame error',err); ui.toast(`Error initializing: ${err && err.message?err.message:err}`); showFatalError('initGame failed', err); return; }
        // Now import the loaded save data to overwrite initialized state
        importSave(state, saveData);
        ui.toggleSaves(false);
        
        // Stop main menu music and start game non-combat music AFTER initGame
        if(state.sounds?.mainMenuMusic && !state.sounds.mainMenuMusic.paused){
          state.sounds.mainMenuMusic.pause();
          state.sounds.mainMenuMusic.currentTime = 0;
        }
        if(state.sounds?.gameNonCombatMusic){
          console.log('[MUSIC] Starting non-combat music after loading save');
          state.sounds.gameNonCombatMusic.currentTime = 0;
          state.sounds.gameNonCombatMusic.play().catch(e => console.warn('Game music play failed:', e));
        } else {
          console.warn('[MUSIC] gameNonCombatMusic not initialized after load!');
        }
        
        ui.hideMainMenu();
        state.paused = false;
        ui.setGameUIVisible(true);
        startGameLoop();
      })();
    }catch(err){ console.error('LoadGame failed', err); showFatalError('Load Game failed', err); }
  };
}

// Start the app after all modules are ready
initializeApp();
