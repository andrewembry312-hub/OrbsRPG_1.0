import { initCanvas } from "./engine/canvas.js";
import { initInput } from "./engine/input.js";
import { startLoop } from "./engine/loop.js";
import { createState } from "./game/state.js";
import { buildUI } from "./game/ui.js";
import { initGame, handleHotkeys, updateGame, importSave, hardResetGameState } from "./game/game.js";
import { showCharSelect } from "./game/charselect.js";
import { render } from "./game/render.js";
import "./loadMapInit.js"; // Initialize map loader helper

const engine = initCanvas("c");
const input = initInput(engine.canvas);

// Create state (ui filled after build)
let state = createState(engine, input, null);
let ui; // Will be initialized after all imports complete

// Initialize UI after all modules are loaded
async function initializeApp() {
  ui = buildUI(state);
  state.ui = ui;
  setupEventHandlers();
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
  startLoop((dt)=>{
    try{ handleHotkeys(state, dt); }catch(e){ console.error('hotkeys',e); showFatalError('Error in handleHotkeys', e); }
    try{ updateGame(state, dt); }catch(e){ console.error('update',e); showFatalError('Error in updateGame', e); }
    try{ render(state); }catch(e){ console.error('render',e); showFatalError('Error in render', e); }
    try{ ui.renderHud(state); }catch(e){ console.error('renderHud',e); }
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
        try{ 
          hardResetGameState(state); // Hard reset ALL game state first
          await initGame(state); 
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
          await initGame(state); 
        }catch(err){ console.error('initGame error',err); ui.toast(`Error initializing: ${err && err.message?err.message:err}`); showFatalError('initGame failed', err); return; }
        // Now import the loaded save data to overwrite initialized state
        importSave(state, saveData);
        ui.toggleSaves(false);
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
