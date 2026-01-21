import { saveJson, loadJson, clamp } from "../engine/util.js";
import { storageGet, storageSet, STORAGE_KEYS, exportSavesAsFile, importSavesFromFile } from "../engine/storage.js";
import { DEFAULT_BINDS, ACTION_LABELS, INV_SIZE, ARMOR_SLOTS, SLOT_LABEL } from "./constants.js";
import { rarityClass } from "./rarity.js";
import { currentStats, exportSave, importSave, applyClassToUnit, downloadErrorLog, downloadCombatLog, downloadPlayerLog, downloadDebugLog, downloadAIBehaviorLog, initConsoleErrorLogger } from "./game.js";
import { LEVEL_CONFIG, getItemLevelColor } from "./leveling.js";
import { xpForNext } from "./progression.js";
import { SKILLS, getSkillById, ABILITIES, ABILITY_CATEGORIES, TARGET_TYPE_INFO, BUFF_REGISTRY, DOT_REGISTRY, defaultAbilitySlots, saveLoadout, loadLoadout } from "./skills.js";
import { showCharSelect } from "./charselect.js";
import { spawnGuardsForSite } from "./world.js";
import { getAssetPath } from "../config.js";

// Expose ABILITIES to window for console commands
window.ABILITIES = ABILITIES;

export function buildUI(state){
  const root=document.getElementById('ui-root');
  root.innerHTML = `
    <!-- Main Menu Overlay -->
    <div id="mainMenu" class="overlay show" style="background: url('" + getAssetPath('assets/ui/MainMenu.png') + "') center center/105% auto no-repeat #000;">
      <div class="panel" style="width:min(560px,92vw); background: rgba(0,0,0,0.65); border:2px solid rgba(212,175,55,0.5); box-shadow:0 0 24px rgba(212,175,55,0.25);">
        <h2 style="margin:0 0 20px 0; text-align:center; color:#e9d27b; letter-spacing:4px; font-size:72px; font-weight:900; text-shadow:0 6px 16px rgba(212,175,55,0.9), -3px -3px 10px rgba(0,0,0,0.95), 3px 3px 10px rgba(212,175,55,0.5), 0 0 25px rgba(212,175,55,0.7); transform:perspective(800px) rotateX(-5deg) rotateZ(1deg); -webkit-text-fill-color:#f4e4a6; -webkit-text-stroke:2px rgba(212,175,55,0.6); filter:drop-shadow(3px 3px 6px rgba(0,0,0,0.8)) drop-shadow(0 0 12px rgba(212,175,55,0.6)) drop-shadow(0 0 20px rgba(212,175,55,0.3));">ELDENS ORBS</h2>
        
        <div class="box" style="background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
          <div class="row" style="align-items:center; gap:10px">
            <div class="small" style="width:120px; color:#e3c86c; font-weight:700; letter-spacing:0.3px;">Hero Name</div>
            <input id="heroNameInput" type="text" placeholder="Hero" style="flex:1; padding:10px 12px; background:#080808; color:#f6dc87; border:1px solid rgba(212,175,55,0.6); border-radius:8px; font-weight:700; letter-spacing:0.4px; box-shadow:inset 0 0 8px rgba(212,175,55,0.15);"/>
          </div>
          <div class="btnRow" style="margin-top:12px; background:rgba(0,0,0,0.85); border:2px solid rgba(212,175,55,0.65); border-radius:12px; padding:12px; gap:12px; box-shadow:0 0 18px rgba(212,175,55,0.2);">
            <button id="btnNewGame" style="flex:1; padding:12px 14px; background:#050505; color:#e7c76c; border:2px solid rgba(212,175,55,0.85); border-radius:8px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">New Game</button>
            <button id="btnLoadGame" class="secondary" style="flex:1; padding:12px 14px; background:#0a0a0a; color:#f5d878; border:2px solid rgba(212,175,55,0.7); border-radius:8px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">Load Game</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Manager Overlay -->
    <div id="saveOverlay" class="overlay">
      <div class="panel" style="width:min(760px,92vw); background: rgba(0,0,0,0.65); border:2px solid rgba(212,175,55,0.5); box-shadow:0 0 24px rgba(212,175,55,0.25);">
        <div class="row">
          <h2 style="margin:0; color:#e9d27b; letter-spacing:1px; text-shadow:0 0 12px rgba(212,175,55,0.55);">Save Manager</h2>
          <div class="btnRow" style="margin:0; background:rgba(0,0,0,0.85); border:2px solid rgba(212,175,55,0.65); border-radius:12px; padding:12px; gap:12px; box-shadow:0 0 18px rgba(212,175,55,0.2);">
            <button id="saveClose" class="secondary" style="padding:12px 14px; background:#0a0a0a; color:#f5d878; border:2px solid rgba(212,175,55,0.7); border-radius:8px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">Close</button>
          </div>
        </div>
        <div class="grid2" style="margin-top:10px">
          <div class="box" style="background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div class="small" style="color:#e3c86c; font-weight:700; letter-spacing:0.3px;">Existing Saves</div>
            <div id="saveList" style="margin-top:8px; max-height:360px; overflow:auto"></div>
          </div>
          <div class="box" style="background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div class="small" style="color:#e3c86c; font-weight:700; letter-spacing:0.3px;">Selected</div>
            <div id="selSaveMeta" class="small" style="margin-top:6px; line-height:1.5; color:#d4b896;">None</div>
            <div style="margin-top:12px" class="row" style="gap:8px">
              <input id="saveNameInput" type="text" placeholder="Hero" style="flex:1; padding:10px 12px; background:#080808; color:#f6dc87; border:1px solid rgba(212,175,55,0.6); border-radius:8px; font-weight:700; letter-spacing:0.4px; box-shadow:inset 0 0 8px rgba(212,175,55,0.15);"/>
            </div>
            <div class="btnRow" style="margin-top:12px; background:rgba(0,0,0,0.85); border:2px solid rgba(212,175,55,0.65); border-radius:12px; padding:12px; gap:12px; box-shadow:0 0 18px rgba(212,175,55,0.2);">
              <button id="btnLoadSelected" style="flex:1; padding:12px 14px; background:#050505; color:#e7c76c; border:2px solid rgba(212,175,55,0.85); border-radius:8px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">Load Selected</button>
              <button id="btnOverwriteSelected" class="secondary" style="flex:1; padding:12px 14px; background:#0a0a0a; color:#f5d878; border:2px solid rgba(212,175,55,0.7); border-radius:8px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">Overwrite Selected</button>
              <button id="btnDeleteSelected" class="danger" style="flex:1; padding:12px 14px; background:#3d0000; color:#ff6b6b; border:2px solid rgba(255,107,107,0.7); border-radius:8px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">Delete Selected</button>
              <button id="btnSaveNew" style="flex:1; padding:12px 14px; background:#050505; color:#e7c76c; border:2px solid rgba(212,175,55,0.85); border-radius:8px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">Save New</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="hud" id="hud" style="margin-top:100px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-size:12px; color:rgba(255,255,255,0.6);">Press <strong>B</strong> to toggle HUD</div>
        <button id="btnCloseHUD" style="background:none; border:none; color:rgba(255,255,255,0.6); cursor:pointer; font-size:18px; padding:0; width:24px; height:24px; display:flex; align-items:center; justify-content:center;" title="Toggle HUD (Press B)">✕</button>
      </div>
      <div class="row">
        <div class="pill">Campaign</div>
        <div class="pill">Enemies <span id="enemyCount">0</span></div>
        <div class="pill">Friendlies <span id="allyCount">0</span></div>
      </div>

      <div class="row" style="margin-top:8px">
        <div class="pill">Player Pts <span id="pPts">0</span></div>
        <div class="pill">Enemy Pts <span id="ePts">0</span></div>
        <div class="pill">Target <span id="targetPts">250</span></div>
      </div>

      <div class="row" style="margin-top:8px">
        <div class="pill">Lv <span id="lvl">1</span></div>
        <div class="pill">SP <span id="spText">0</span></div>
      </div>

      <div class="hint" id="hintText"></div>
    </div>

    <div id="toast" class="toast"></div>

    <!-- AI Event Feed (debug) - stacked bottom-left -->
    <div id="aiFeed" style="position:fixed; left:10px; bottom:220px; max-width:320px; max-height:140px; overflow-y:auto; background:rgba(10,10,10,0.85); border:1px solid rgba(122,162,255,0.4); color:#ccc; font-size:10px; padding:6px; border-radius:4px; z-index:180; display:none;"></div>

    <!-- Ability Cast Display - stacked below AI feed -->
    <div id="abilityCastDisplay" style="position: fixed; bottom: 10px; left: 10px; width: 240px; max-height: 200px; background: rgba(0,0,0,0.85); border: 1px solid rgba(252,198,102,0.5); border-radius: 4px; padding: 6px; font-family: monospace; font-size: 10px; color: #aaf; overflow-y: auto; z-index: 179; display: none; box-shadow: 0 0 8px rgba(0,0,0,0.6);">
      <div style="color: #d4af37; font-weight: bold; margin-bottom: 4px; font-size: 9px;">Recent Casts</div>
      <div id="abilityCastList" style="max-height: 180px; overflow-y: auto;"></div>
    </div>

    <!-- Compact bottom bar shown when HUD is hidden -->
    <div id="bottomBar" class="bottomBar" style="display:none;">
      <div style="display:flex;gap:10px;align-items:center;justify-content:center;">
        <div style="width:260px">
          <div class="small">HP <span id="b_hpText"></span></div>
          <div class="bar"><div id="b_hpFill" class="fill" style="background:var(--hp);width:100%"></div></div>
        </div>
        <div style="width:200px">
          <div class="small">Mana <span id="b_manaText"></span></div>
          <div class="bar"><div id="b_manaFill" class="fill" style="background:var(--mana);width:100%"></div></div>
        </div>
        <div style="width:200px">
          <div class="small">Stamina <span id="b_stamText"></span></div>
          <div class="bar"><div id="b_stamFill" class="fill" style="background:var(--stam);width:100%"></div></div>
        </div>
      </div>
    </div>

    <!-- Ability Tooltip -->
    <div id="abilTooltip" style="position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:rgba(10,10,20,0.95); border:2px solid rgba(122,162,255,0.5); border-radius:8px; padding:12px 16px; max-width:420px; display:none; z-index:200; pointer-events:none">
      <div id="abilTooltipContent" class="small" style="line-height:1.6; color:#fff"></div>
    </div>

    <div class="abilBar" id="abilBar"></div>

    <!-- Active Buff/Debuff Icons HUD -->
    <div id="buffIconsHud" class="buffIconsHud"></div>

    <!-- Active Buff/Debuff Icons HUD -->
    <div id="buffIconsHud" class="buffIconsHud"></div>

    <!-- Player Stats UI (Top-Left Corner) -->
    <div id="statsContainer" style="position:fixed; top:10px; left:10px; z-index:200; display:flex; gap:8px; align-items:stretch; background:rgba(0,0,0,0.75); border:2px solid rgba(212,175,55,0.5); border-radius:8px; padding:8px; box-shadow:0 4px 12px rgba(0,0,0,0.6);">
      <!-- Hero Portrait Circle with Level Badge Overlay -->
      <div style="position:relative; flex-shrink:0;">
        <div id="heroPortrait" style="width:64px; height:64px; border-radius:50%; overflow:hidden; border:3px solid rgba(212,175,55,0.8); box-shadow:0 0 12px rgba(212,175,55,0.4); background:#000;">
          <img id="heroPortraitImg" src="" style="width:100%; height:100%; object-fit:cover; display:none;" />
        </div>
        
        <!-- Level Badge - Bottom Right Corner of Portrait -->
        <div id="levelBadge" style="position:absolute; bottom:-2px; right:-2px; width:25px; height:25px;">
          <svg width="25" height="25" viewBox="0 0 50 50" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#ffed4e;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#d4af37;stop-opacity:1" />
              </linearGradient>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
                <stop offset="70%" style="stop-color:#0f0f1e;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
              </radialGradient>
            </defs>
            <circle cx="25" cy="25" r="23" fill="url(#goldGradient)" stroke="#fff" stroke-width="1" opacity="0.9"/>
            <circle cx="25" cy="25" r="19" fill="url(#centerGlow)" stroke="#d4af37" stroke-width="1.5"/>
          </svg>
          <div id="levelNumber" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:9px; font-weight:bold; color:#ffd700; text-shadow: 0 0 4px rgba(255,215,0,0.8), 0 1px 2px rgba(0,0,0,0.9); font-family: 'Arial Black', sans-serif;">1</div>
        </div>
      </div>
      
      <!-- Vertical Stat Bars (Extended) -->
      <div style="flex:1; display:flex; flex-direction:column; gap:0; min-width:200px;">
        <!-- HP Bar with Shield Overlay -->
        <div style="position:relative; height:14px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2); border-radius:2px;">
          <div id="hpFill" style="position:absolute; top:0; left:0; height:100%; background:#d32f2f; transition:width 0.2s; z-index:1;"></div>
          <div id="shieldFill" style="position:absolute; top:0; left:0; height:100%; width:0%; background:rgba(100,181,246,0.85); transition:width 0.2s; pointer-events:none; z-index:2;"></div>
          <div id="hpText" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:11px; font-weight:bold; text-shadow:0 0 3px #000, 0 0 2px #000; pointer-events:none; white-space:nowrap; z-index:3;"></div>
        </div>
        
        <!-- Mana Bar -->
        <div style="position:relative; height:14px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2); border-top:none; border-radius:0;">
          <div id="manaFill" style="position:absolute; top:0; left:0; height:100%; background:#1976d2; transition:width 0.2s;"></div>
          <div id="manaText" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:11px; font-weight:bold; text-shadow:0 0 3px #000, 0 0 2px #000; pointer-events:none; white-space:nowrap;"></div>
        </div>
        
        <!-- Stamina Bar -->
        <div style="position:relative; height:14px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2); border-top:none; border-radius:0;">
          <div id="stamFill" style="position:absolute; top:0; left:0; height:100%; background:#388e3c; transition:width 0.2s;"></div>
          <div id="stamText" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:11px; font-weight:bold; text-shadow:0 0 3px #000, 0 0 2px #000; pointer-events:none; white-space:nowrap;"></div>
        </div>
        
        <!-- XP Bar -->
        <div style="position:relative; height:14px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2); border-top:none; border-radius:0 0 2px 2px;">
          <div id="xpFill" style="position:absolute; top:0; left:0; height:100%; background:#f57c00; transition:width 0.2s;"></div>
          <div id="xpText" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:11px; font-weight:bold; text-shadow:0 0 3px #000, 0 0 2px #000; pointer-events:none; white-space:nowrap;"></div>
        </div>
      </div>
    </div>
    
    <!-- Hint text below stats display -->
    <div id="statsHintText" style="position:fixed; top:100px; left:10px; z-index:199; max-width:320px; font-size:11px; color:#ccc; background:rgba(0,0,0,0.7); padding:6px 10px; border-radius:4px; border:1px solid rgba(212,175,55,0.3); display:none;"></div>
    
    <!-- Level Up Notification -->
    <div id="levelUpNotification" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:5000; display:none; text-align:center; pointer-events:none;">
      <div id="levelUpText" style="font-size:120px; font-weight:900; color:#d4af37; text-shadow:0 0 40px rgba(212,175,55,0.8); opacity:0;">LEVEL UP!</div>
      <div id="levelUpNumber" style="font-size:96px; font-weight:bold; color:#4a9eff; text-shadow:0 0 30px rgba(74,158,255,0.8); margin-top:-30px; opacity:0;">50</div>
    </div>

    <!-- Bomb Notification (Killstreak) -->
    <div id="bombNotification" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:5000; display:none; text-align:center; pointer-events:none;">
      <div id="bombText" style="font-size:120px; font-weight:900; color:#b565d8; text-shadow:-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 0 40px rgba(181,101,216,0.8); opacity:0;">BOMB!</div>
      <div id="bombNumber" style="font-size:96px; font-weight:bold; color:#d4af37; text-shadow:-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 0 30px rgba(212,175,55,0.8); margin-top:-30px; opacity:0;">10</div>
    </div>

    <!-- Emperor Notification -->
    <div id="emperorNotification" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:5000; display:none; text-align:center; pointer-events:none;">
      <div id="emperorText" style="font-size:120px; font-weight:900; color:#ffd700; text-shadow:0 0 50px rgba(255,215,0,1); opacity:0; font-style:italic;">EMPEROR!</div>
      <div id="emperorSubtext" style="font-size:64px; font-weight:bold; color:#b8941f; text-shadow:0 0 30px rgba(184,148,31,0.8); margin-top:-20px; opacity:0;">🔱</div>
    </div>

    <!-- Fighter Card Reveal Overlay -->
    <div id="cardRevealOverlay" style="position:fixed; top:0; left:0; width:100%; height:100%; z-index:4999; display:none !important; background:rgba(0,0,0,0.9); pointer-events:none; align-items:center; justify-content:center;">
      <div style="text-align:center;">
        <!-- Cycling cards animation -->
        <div id="cardRevealCycle" style="margin-bottom:30px; min-height:320px; display:flex; align-items:center; justify-content:center;">
          <div id="cyclingCardImage" style="width:180px; height:240px; background:rgba(212,175,55,0.2); border:3px solid #d4af37; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; color:#d4af37;">Loading...</div>
        </div>
        <!-- Final card reveal -->
        <div id="finalCardDisplay" style="margin-top:20px; display:none;">
          <div style="font-size:24px; font-weight:bold; color:#ffd700; margin-bottom:10px;">🎴 NEW FIGHTER CARD 🎴</div>
          <div id="finalCardName" style="font-size:20px; color:#d4af37; margin-bottom:5px;"></div>
          <div id="finalCardStats" style="font-size:14px; color:#6cf; line-height:1.8;"></div>
        </div>
      </div>
    </div>

    <!-- Kill Counter (bottom right) -->
    <div id="killCounter" style="position:fixed; bottom:20px; right:20px; z-index:100; background:rgba(0,0,0,0.85); border:3px solid #d4af37; border-radius:8px; padding:12px 20px; min-width:180px; pointer-events:none;">
      <div style="font-size:14px; font-weight:bold; color:#d4af37; margin-bottom:6px; text-align:center;">⚔️ KILL COUNTER ⚔️</div>
      <div style="font-size:24px; font-weight:900; color:#d4af37; text-align:center; text-shadow:0 0 10px rgba(212,175,55,0.6);" id="killCounterValue">0</div>
      <div style="font-size:12px; font-weight:bold; color:#b565d8; margin-top:8px; text-align:center; border-top:1px solid rgba(212,175,55,0.3); padding-top:6px;">💣 BIGGEST BOMB</div>
      <div style="font-size:18px; font-weight:900; color:#b565d8; text-align:center; text-shadow:0 0 8px rgba(181,101,216,0.6);" id="biggestBombValue">0</div>
    </div>

    <!-- Inventory / Tabbed UI -->
    <div id="invOverlay" class="overlay">
      <div class="panel">
        <div class="row">
          <h2 style="margin:0; color:#d4af37; text-shadow:0 0 12px rgba(212,175,55,0.4);">Character Panel</h2>
          <div class="btnRow" style="margin:0">
            <button id="invClose" class="secondary">Close</button>
          </div>
        </div>
        <!-- Tab buttons -->
        <div style="display:flex; gap:6px; border-bottom:1px solid #d4af37; margin-top:10px; padding-bottom:8px;">
          <button class="tab-btn active" data-tab="0" style="flex:1; padding:10px; background:rgba(212,175,55,0.3); border:1px solid #d4af37; color:#d4af37; border-radius:3px; cursor:pointer; font-size:14px; font-weight:bold;">🎒 Inventory</button>
          <button class="tab-btn" data-tab="1" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">⚔️ Skills ⚔️</button>
          <button class="tab-btn" data-tab="2" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">📈 Level Up</button>
          <button class="tab-btn" data-tab="8" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">🔷 Slots</button>
          <button class="tab-btn" data-tab="9" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">🎴 Cards</button>
          <button class="tab-btn" data-tab="4" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">👥 Group</button>
          <button class="tab-btn" data-tab="5" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">🤝 Allies</button>
          <button class="tab-btn" data-tab="7" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">🗺️ Campaign</button>
          <button class="tab-btn" data-tab="3" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">Buffs/Debuffs</button>
          <button class="tab-btn" data-tab="6" style="flex:1; padding:10px; background:transparent; border:1px solid rgba(212,175,55,0.3); color:#b8941f; border-radius:3px; cursor:pointer; font-size:14px;">Help</button>
        </div>

        <!-- Tab 0: Inventory -->
        <div class="tab-content" data-tab="0" style="margin-top:10px; display:block;">
          <div class="invFullGrid">
            <!-- LEFT: Equipment circle around hero -->
            <div class="box invLeft" style="border-color:#d4af37; height:650px;">
              <div class="row" style="justify-content:space-between; align-items:center;">
                <div>
                  <div class="pill">Gold <span id="gold">0</span></div>
                  <button id="btnSelectHero" style="width:100%; margin-top:6px; padding:6px 10px; font-size:11px; font-weight:900; border-radius:8px">Select Character</button>
                </div>
                <div class="small">Hero: <span id="heroClassName">Warrior</span> • Lv <span id="heroLevel">1</span></div>
              </div>
              <div id="equipCircle" class="equipCircle">
                <img id="heroPortrait" src="${getAssetPath('assets/char/warrior.svg')}" alt="Hero" class="heroLarge"/>
              </div>
              <div id="equipExtras" class="equipExtras" style="display:flex; justify-content:space-evenly; align-items:center;"></div>
              <div id="weaponSlot" class="weaponSlot" style="text-align:center;"></div>
              <div class="btnRow" style="margin-top:10px">
              </div>
            </div>
            <!-- STATS: selected item and stats -->
            <div class="box invStats" style="border-color:#d4af37; height:650px;">
              <div style="margin-top:12px" class="small">Selected Item</div>
              <div id="selName" style="font-weight:900;margin-top:2px">None</div>
              <div id="selDesc" class="small" style="margin-top:6px; line-height:1.35">Click an item.</div>

              <div style="margin-top:12px" class="small">Stats</div>
              <table class="statTable" id="statsTable"></table>

              <div class="box" style="margin-top:10px; border-color:#d4af37;">
                <div class="pill" style="border-color:#d4af37; color:#d4af37;">Armor Rating: <span id="invArmorStars" style="font-size:32px; font-weight:normal;">☆☆☆☆☆</span> <span id="invArmorText">0/5</span></div>
              </div>
            </div>

            <!-- RIGHT: Inventory grid -->
            <div id="invRight" class="box invRight" style="border-color:#d4af37; height:650px;">
              <div class="invRightHeader">
                <div class="row">
                  <div class="small">Inventory</div>
                  <div class="small">Click to inspect • Double-click to equip</div>
                </div>
                <div class="row" style="margin-top:6px; align-items:center; gap:8px;">
                  <div class="small" style="white-space:nowrap;">Filter:</div>
                  <select id="invFilterDropdown" style="flex:1; padding:4px 8px; background:rgba(0,0,0,0.5); border:1px solid #d4af37; color:#d4af37; border-radius:4px; font-size:11px; cursor:pointer;">
                    <option value="all">Show All</option>
                    <option value="weapon">All Weapons</option>
                    <option value="sword">Swords</option>
                    <option value="axe">Axes</option>
                    <option value="dagger">Daggers</option>
                    <option value="greatsword">Greatswords</option>
                    <option value="healing-staff">Healing Staffs</option>
                    <option value="destruction-staff">Destruction Staffs</option>
                    <option value="armor">All Armor</option>
                    <option value="helm">Helms</option>
                    <option value="chest">Chest Armor</option>
                    <option value="legs">Leg Armor</option>
                    <option value="feet">Boots</option>
                    <option value="hands">Gloves</option>
                    <option value="belt">Belts</option>
                    <option value="shoulders">Shoulders</option>
                    <option value="neck">Necklaces</option>
                    <option value="accessory">Accessories</option>
                    <option value="potion">Potions</option>
                  </select>
                  <label style="display:flex; align-items:center; gap:4px; white-space:nowrap; cursor:pointer; font-size:11px; padding:4px 8px; background:rgba(76,175,80,0.15); border:1px solid rgba(76,175,80,0.3); border-radius:4px;">
                    <input type="checkbox" id="invBestOnlyCheckbox" style="cursor:pointer; width:14px; height:14px;"/>
                    <span style="color:#4caf50;">↑ Best Only</span>
                  </label>
                </div>
                <div class="btnRow">
                  <button id="useEquipBtn">Equip</button>
                  <button id="dropBtn" class="secondary">Drop</button>
                  <button id="dropAllBtn" class="danger">Drop All</button>
                </div>
              </div>
              <!-- Inventory Tooltip -->
              <div id="invTooltip" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(10,10,20,0.95); border:2px solid rgba(212,175,55,0.6); border-radius:8px; padding:12px 16px; max-width:420px; display:none; z-index:250; pointer-events:none">
                <div id="invTooltipContent" class="small" style="line-height:1.6; color:#fff"></div>
              </div>
              <div id="invGrid" class="invGrid"></div>
            </div>
          </div>
        </div>

        <!-- Fullscreen Weapon Preview Overlay -->
        <div id="weaponPreview" class="overlay" style="display:none; background:rgba(0,0,0,0.95); z-index:9999; cursor:pointer;">
          <div style="position:absolute; top:20px; right:20px; color:#fff; font-size:14px; opacity:0.7;">Press P or ESC to close</div>
          <div style="display:flex; align-items:center; justify-content:center; width:100%; height:100%; flex-direction:column; padding:40px; position:relative;">
            <div id="weaponPreviewTitle" style="color:#d4af37; font-size:24px; font-weight:bold; margin-bottom:20px; text-align:center;"></div>
            <img id="weaponPreviewImage" style="width:600px; height:600px; object-fit:contain; border-radius:8px; box-shadow:0 0 40px rgba(212,175,55,0.3);" />
            <div id="weaponPreviewError" style="display:none; color:#ff6666; font-size:18px; margin-top:20px;">No preview available for this item</div>
            <div id="weaponPreviewStats" style="position:absolute; bottom:40px; right:40px; background:rgba(20,20,20,0.95); border:2px solid rgba(212,175,55,0.6); border-radius:8px; padding:16px; max-width:25%; min-width:260px; display:none; max-height:70vh; overflow-y:auto;">
              <div style="font-size:14px; font-weight:bold; color:#d4af37; margin-bottom:8px;">Item Details</div>
              <div id="weaponPreviewStatsContent" style="font-size:13px; line-height:1.8; color:#fff;"></div>
            </div>
          </div>
        </div>

        <!-- Tab 1: Skills -->
        <div class="tab-content" data-tab="1" style="margin-top:10px; display:none;">
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; height:calc(100vh - 200px);">
            <!-- Column 1: Loadouts -->
            <div class="box" style="padding:8px; border-color:#ffd700; overflow-y:auto;">
              <div id="loadoutsList" style="display:flex; flex-direction:column; gap:8px;">
                <!-- Loadouts will be populated by JS -->
              </div>
            </div>
            
            <!-- Column 2: Categories -->
            <div class="box" style="padding:8px; border-color:#d4af37; overflow-y:auto;">
              <div id="skillCategories" style="display:flex; flex-direction:column; justify-content:space-evenly; height:100%;">
                <!-- Categories will be populated by JS -->
              </div>
            </div>
            
            <!-- Column 3: Abilities -->
            <div class="box" style="padding:0; border-color:#d4af37; overflow:hidden; display:flex; flex-direction:column;">
              <!-- Frozen header with ability slots -->
              <div style="flex-shrink:0; padding:8px; border-bottom:1px solid #d4af37; background:rgba(0,0,0,0.5);">
                <div class="small" style="font-weight:bold; margin-bottom:8px; color:#d4af37;">Active Ability Slots</div>
                <div id="skillSlots" style="display:flex; gap:8px; flex-wrap:wrap;"></div>
              </div>
              
              <!-- Scrollable ability details -->
              <div class="tab-scroll" style="flex:1; overflow-y:auto; padding:8px;">
                <div style="margin-bottom:12px;">
                  <div class="small" style="font-weight:bold; margin-bottom:8px; color:#d4af37;">Selected Ability</div>
                  <div id="abilityDetails" style="font-size:12px; line-height:1.5; color:#ccc;">
                    <div style="color:#999; padding:8px;">Select an ability to view details</div>
                  </div>
                </div>
                
                <div style="margin-top:12px; border-top:1px solid rgba(212,175,55,0.2); padding-top:12px;">
                  <div class="small" style="font-weight:bold; margin-bottom:8px; color:#d4af37;">Passive Abilities</div>
                  <div id="passiveList" style="display:flex; flex-direction:column; gap:6px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Level Up -->
        <div class="tab-content" data-tab="2" style="margin-top:10px; display:none;">
          <div style="display:flex; gap:12px; height:calc(100vh - 240px);">
            <!-- Left side: XP Progression Panel -->
            <div class="box" style="border-color:#d4af37; width:48%; font-size:13px; display:flex; flex-direction:column;">
              <div style="font-size:16px; font-weight:bold; color:#d4af37; margin-bottom:12px; text-align:center;">⭐ LEVEL PROGRESSION ⭐</div>
              
              <!-- Level Display with Circle -->
              <div style="display:flex; justify-content:center; margin-bottom:16px;">
                <div style="position:relative; width:80px; height:80px;">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <defs>
                      <linearGradient id="levelGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#ffed4e;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#d4af37;stop-opacity:1" />
                      </linearGradient>
                      <radialGradient id="levelCenterGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:#2a2a3e;stop-opacity:1" />
                        <stop offset="70%" style="stop-color:#1a1a2e;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
                      </radialGradient>
                    </defs>
                    <circle cx="40" cy="40" r="37" fill="url(#levelGoldGradient)" stroke="#fff" stroke-width="1.5" opacity="0.9"/>
                    <circle cx="40" cy="40" r="31" fill="url(#levelCenterGlow)" stroke="#d4af37" stroke-width="2"/>
                  </svg>
                  <div id="levelTabLevelNum" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:28px; font-weight:900; color:#ffd700; text-shadow: 0 0 12px rgba(255,215,0,0.8), 0 2px 6px rgba(0,0,0,0.9);">1</div>
                </div>
              </div>
              
              <!-- XP Progress Bar -->
              <div style="margin-bottom:20px; padding:0 20px;">
                <div style="font-size:12px; color:#d4af37; margin-bottom:6px; text-align:center; font-weight:600;">EXPERIENCE TO NEXT LEVEL</div>
                <div style="position:relative; width:100%; height:24px; background:linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%); border:2px solid #3a3a3a; border-radius:12px; box-shadow:inset 0 2px 6px rgba(0,0,0,0.6), 0 1px 3px rgba(255,215,0,0.2); overflow:hidden;">
                  <div id="levelTabXpFill" style="height:100%; width:0%; background:linear-gradient(180deg, #ffed4e 0%, #ffd700 30%, #d4af37 70%, #b8941f 100%); box-shadow: 0 0 12px rgba(255,215,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3); transition: width 0.4s ease-out;"></div>
                </div>
                <div id="levelTabXpText" style="font-size:11px; color:#888; text-align:center; margin-top:4px;">0 / 100 XP</div>
              </div>
              
              <!-- Level Info Grid (3-column: Level, Stat Points, Skill Points) -->
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; padding:0 20px; margin-bottom:16px;">
                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; border:1px solid #3a3a3a;">
                  <div style="font-size:11px; color:#888; margin-bottom:4px;">CURRENT LEVEL</div>
                  <div id="levelTabCurrentLevel" style="font-size:20px; font-weight:bold; color:#d4af37;">1</div>
                </div>
                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; border:1px solid #3a3a3a;">
                  <div style="font-size:11px; color:#888; margin-bottom:4px;">STAT POINTS</div>
                  <div id="levelTabStatPoints" style="font-size:20px; font-weight:bold; color:#4a9eff;">0</div>
                </div>
                <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; border:1px solid #3a3a3a;">
                  <div style="font-size:11px; color:#888; margin-bottom:4px;">SKILL POINTS</div>
                  <div id="levelTabSkillPoints" style="font-size:20px; font-weight:bold; color:#b56cff;">0</div>
                </div>
              </div>
              
              <!-- Level Milestones -->
              <div style="flex:1; padding:0 20px; overflow-y:auto;">
                <div style="font-size:13px; font-weight:bold; color:#d4af37; margin-bottom:8px;">📊 LEVEL MILESTONES</div>
                <div style="font-size:11px; color:#ccc; line-height:1.6;">
                  <div style="margin-bottom:8px; padding:8px; background:rgba(255,215,0,0.1); border-left:3px solid #ffd700; border-radius:3px;">
                    <b style="color:#ffd700;">Every Level:</b> +2 Stat Points
                  </div>
                  <div style="margin-bottom:8px; padding:8px; background:rgba(255,215,0,0.1); border-left:3px solid #ffd700; border-radius:3px;">
                    <b style="color:#ffd700;">Every 5 Levels:</b> Bonus Gold (Level × 25)
                  </div>
                  <div style="margin-bottom:8px; padding:8px; background:rgba(181,108,255,0.1); border-left:3px solid #b56cff; border-radius:3px;">
                    <b style="color:#b56cff;">Level 50:</b> MAX LEVEL REACHED! 🏆
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Right side: Compact stats panel -->
            <div class="box" style="border-color:#d4af37; width:50%; font-size:13px; display:flex; flex-direction:column;">
              <!-- Row 1: Header with Name/Role/Hero and Armor Rating -->
              <div id="levelHeaderRow" style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:6px; border-bottom:1px solid #d4af37; margin-bottom:8px;">
                <div>
                  <div id="levelCharName" style="font-size:15px; font-weight:bold; color:#d4af37;">Player Name</div>
                  <div id="levelCharRole" style="font-size:12px; color:#b8941f; margin-top:2px;">Role • Hero</div>
                </div>
                <div id="levelArmorRating" style="text-align:right;">
                  <div style="font-size:12px; color:#b8941f;">Armor Rating</div>
                  <div style="font-size:32px; font-weight:normal; color:#d4af37;"><span id="levelArmorStars">☆☆☆☆☆</span></div>
                </div>
              </div>

              <!-- Row 2: HP, Mana, Stamina HORIZONTAL with Bars AND +/- Controls -->
              <div id="levelResourcesRow" style="padding-bottom:8px; border-bottom:1px solid #d4af37; margin-bottom:8px;">
                <!-- Unspent Points -->
                <div id="levelPointsDisplay" style="font-size:13px; color:#d4af37; margin-bottom:10px; text-align:center; font-weight:bold;">
                  Available Stat Points: <span id="lvlPts" style="font-size:16px; color:#4a9eff;">0</span>
                </div>
                
                <!-- All 5 Stats in compact 2-row grid -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; padding:0 8px; margin-bottom:8px;">
                  <!-- VIT (Vitality) - HP -->
                  <div style="display:flex; flex-direction:column; align-items:center; gap:3px; background:rgba(255,85,85,0.1); padding:6px; border-radius:4px; border:1px solid rgba(255,85,85,0.3);">
                    <div style="font-size:10px; color:#f88; font-weight:bold;">VITALITY</div>
                    <div style="font-size:11px; color:#f55;">+HP/Regen</div>
                    <div style="display:flex; gap:4px; align-items:center; margin-top:2px;">
                      <button id="hpDec" class="secondary" style="border-color:#f55; color:#f55; padding:2px 6px; font-size:11px; min-width:24px;">◀</button>
                      <div id="hpSpend" style="width:28px; text-align:center; color:#f55; font-weight:bold; font-size:14px;">0</div>
                      <button id="hpInc" style="border-color:#f55; background:rgba(255,85,85,0.2); color:#f55; padding:2px 6px; font-size:11px; min-width:24px;">▶</button>
                    </div>
                  </div>
                  
                  <!-- INT (Intelligence) - Mana -->
                  <div style="display:flex; flex-direction:column; align-items:center; gap:3px; background:rgba(85,170,255,0.1); padding:6px; border-radius:4px; border:1px solid rgba(85,170,255,0.3);">
                    <div style="font-size:10px; color:#7cf; font-weight:bold;">INTELLIGENCE</div>
                    <div style="font-size:11px; color:#5af;">+Mana/CDR</div>
                    <div style="display:flex; gap:4px; align-items:center; margin-top:2px;">
                      <button id="manaDec" class="secondary" style="border-color:#5af; color:#5af; padding:2px 6px; font-size:11px; min-width:24px;">◀</button>
                      <div id="manaSpend" style="width:28px; text-align:center; color:#5af; font-weight:bold; font-size:14px;">0</div>
                      <button id="manaInc" style="border-color:#5af; background:rgba(85,170,255,0.2); color:#5af; padding:2px 6px; font-size:11px; min-width:24px;">▶</button>
                    </div>
                  </div>
                  
                  <!-- STR (Strength) - Attack -->
                  <div style="display:flex; flex-direction:column; align-items:center; gap:3px; background:rgba(255,150,50,0.1); padding:6px; border-radius:4px; border:1px solid rgba(255,150,50,0.3);">
                    <div style="font-size:10px; color:#fb7; font-weight:bold;">STRENGTH</div>
                    <div style="font-size:11px; color:#f96;">+Attack/Crit</div>
                    <div style="display:flex; gap:4px; align-items:center; margin-top:2px;">
                      <button id="strDec" class="secondary" style="border-color:#f96; color:#f96; padding:2px 6px; font-size:11px; min-width:24px;">◀</button>
                      <div id="strSpend" style="width:28px; text-align:center; color:#f96; font-weight:bold; font-size:14px;">0</div>
                      <button id="strInc" style="border-color:#f96; background:rgba(255,150,50,0.2); color:#f96; padding:2px 6px; font-size:11px; min-width:24px;">▶</button>
                    </div>
                  </div>
                  
                  <!-- DEF (Defense) -->
                  <div style="display:flex; flex-direction:column; align-items:center; gap:3px; background:rgba(150,150,150,0.1); padding:6px; border-radius:4px; border:1px solid rgba(150,150,150,0.3);">
                    <div style="font-size:10px; color:#ccc; font-weight:bold;">DEFENSE</div>
                    <div style="font-size:11px; color:#aaa;">+Defense</div>
                    <div style="display:flex; gap:4px; align-items:center; margin-top:2px;">
                      <button id="defDec" class="secondary" style="border-color:#aaa; color:#aaa; padding:2px 6px; font-size:11px; min-width:24px;">◀</button>
                      <div id="defSpend" style="width:28px; text-align:center; color:#aaa; font-weight:bold; font-size:14px;">0</div>
                      <button id="defInc" style="border-color:#aaa; background:rgba(150,150,150,0.2); color:#aaa; padding:2px 6px; font-size:11px; min-width:24px;">▶</button>
                    </div>
                  </div>
                  
                  <!-- AGI (Agility) - Speed/Stamina -->
                  <div style="display:flex; flex-direction:column; align-items:center; gap:3px; background:rgba(85,255,85,0.1); padding:6px; border-radius:4px; border:1px solid rgba(85,255,85,0.3);">
                    <div style="font-size:10px; color:#7f7; font-weight:bold;">AGILITY</div>
                    <div style="font-size:11px; color:#5f5;">+Speed/Stam</div>
                    <div style="display:flex; gap:4px; align-items:center; margin-top:2px;">
                      <button id="stamDec" class="secondary" style="border-color:#5f5; color:#5f5; padding:2px 6px; font-size:11px; min-width:24px;">◀</button>
                      <div id="stamSpend" style="width:28px; text-align:center; color:#5f5; font-weight:bold; font-size:14px;">0</div>
                      <button id="stamInc" style="border-color:#5f5; background:rgba(85,255,85,0.2); color:#5f5; padding:2px 6px; font-size:11px; min-width:24px;">▶</button>
                    </div>
                  </div>
                </div>
                
                <!-- Current Resources Display (HP/Mana/Stamina bars) -->
                <div style="display:flex; justify-content:space-between; gap:8px; padding:0 12px; margin-bottom:8px;">
                  <div style="flex:1;">
                    <div style="font-size:10px; color:#f55; margin-bottom:2px;">HP: <span id="levelHpValue">0/0</span></div>
                    <div style="width:100%; height:6px; background:rgba(0,0,0,0.5); border:1px solid #f55; border-radius:2px; overflow:hidden;">
                      <div id="levelHpBar" style="height:100%; background:#f55; width:100%;"></div>
                    </div>
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:10px; color:#5af; margin-bottom:2px;">Mana: <span id="levelManaValue">0/0</span></div>
                    <div style="width:100%; height:6px; background:rgba(0,0,0,0.5); border:1px solid #5af; border-radius:2px; overflow:hidden;">
                      <div id="levelManaBar" style="height:100%; background:#5af; width:100%;"></div>
                    </div>
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:10px; color:#5f5; margin-bottom:2px;">Stam: <span id="levelStamValue">0/0</span></div>
                    <div style="width:100%; height:6px; background:rgba(0,0,0,0.5); border:1px solid #5f5; border-radius:2px; overflow:hidden;">
                      <div id="levelStamBar" style="height:100%; background:#5f5; width:100%;"></div>
                    </div>
                  </div>
                </div>

                <!-- Switch Button Row -->
                <div style="display:flex; gap:6px; margin-top:8px; justify-content:center;">
                  <button id="levelSwitchToPlayer" style="border-color:#d4af37; background:rgba(212,175,55,0.1); color:#d4af37; padding:5px 14px; font-size:12px; display:none;">Switch to Player</button>
                </div>
              </div>

              <!-- Row 3: Stats List -->
              <div id="levelStatsRow" style="padding-bottom:8px; border-bottom:1px solid #d4af37; margin-bottom:8px;">
                <div style="font-size:12px; font-weight:bold; color:#d4af37; margin-bottom:6px;">STATS</div>
                <div id="levelStatsList" style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:12px; color:#ccc;"></div>
              </div>

              <!-- Row 4: Active Effects -->
              <div id="levelEffectsRow" style="flex:1; display:flex; flex-direction:column; overflow-y:auto;">
                <div style="font-size:12px; font-weight:bold; color:#d4af37; margin-bottom:6px;">ACTIVE EFFECTS</div>
                <div id="levelEffectsList" style="display:flex; flex-direction:column; min-height:24px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Ability System (Buffs/Debuffs) -->
        <div class="tab-content" data-tab="3" style="margin-top:10px; display:none;">
          <div class="box tab-scroll" style="overflow:auto; border-color:#d4af37;">
            <h3 style="margin:0 0 10px 0; color:#d4af37;">Buff & Debuff System</h3>
            <div class="small" style="margin-bottom:12px; color:#b8941f;">Comprehensive list of all buffs and debuffs in the game. These can be applied by abilities, items, and environmental effects.</div>

            <div style="margin-bottom:12px;">
              <div class="small" style="font-weight:bold; color:#d4af37; margin-bottom:6px;">Active Effects (Player)</div>
              <div id="activeEffectsIcons" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;"></div>
            </div>
            
            <div style="margin-bottom:16px;">
              <div style="font-weight:bold; color:#d4af37; margin-bottom:8px;">⚡ Combat Buffs</div>
              <div id="combatBuffsList" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:8px; font-size:11px;"></div>
            </div>

            <div style="margin-bottom:16px;">
              <div style="font-weight:bold; color:#d4af37; margin-bottom:8px;">💚 Sustain & Healing Buffs</div>
              <div id="sustainBuffsList" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:8px; font-size:11px;"></div>
            </div>

            <div style="margin-bottom:16px;">
              <div style="font-weight:bold; color:#d4af37; margin-bottom:8px;">🏃 Mobility Buffs</div>
              <div id="mobilityBuffsList" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:8px; font-size:11px;"></div>
            </div>

            <div style="margin-bottom:16px;">
              <div style="font-weight:bold; color:#d4af37; margin-bottom:8px;">✨ Utility Buffs</div>
              <div id="utilityBuffsList" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:8px; font-size:11px;"></div>
            </div>

            <div style="margin-bottom:16px;">
              <div style="font-weight:bold; color:#c44; margin-bottom:8px;">☠️ Debuffs & DoTs</div>
              <div id="debuffsList" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:8px; font-size:11px;"></div>
            </div>
          </div>
        </div>

        <!-- Tab 4: Group -->
        <div class="tab-content" data-tab="4" style="margin-top:10px; display:none;">
          <div class="grid2">
            <!-- Left: Group Members List -->
            <div class="box" style="padding:0; overflow:hidden; display:flex; flex-direction:column; border-color:#d4af37;">
              <div class="small" style="padding:8px; border-bottom:1px solid #d4af37; background:rgba(0,0,0,0.3); font-weight:bold; color:#d4af37;">Group Members (<span id="groupMemberCount">0</span>/10)</div>
              <div id="groupMembersList" class="tab-scroll" style="flex:1 1 auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:8px; padding:8px;">
                <div class="small" style="padding:12px; color:#b8941f;">No group members yet. Invite allies with "Invite to Group" button.</div>
              </div>
            </div>
            
            <!-- Right: Member Details & Settings -->
            <div class="box tab-scroll" style="overflow:auto; border-color:#d4af37;">
              <div class="small" style="font-weight:bold; margin-bottom:8px; color:#d4af37;">Member Settings</div>
              <div id="groupMemberDetails" style="font-size:12px; line-height:1.5;">
                <div class="small" style="color:#b8941f; padding:8px;">Select a group member to manage.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 5: Allies (all spawned friendlies) -->
        <div class="tab-content" data-tab="5" style="margin-top:10px; display:none;">
          <div class="grid2">
            <!-- Left: Allies List -->
            <div class="box" style="padding:0; overflow:hidden; border-color:#d4af37;">
              <div class="small" style="padding:8px; border-bottom:1px solid #d4af37; background:rgba(0,0,0,0.3); font-weight:bold; color:#d4af37;">All Allies (<span id="allyTabCount">0</span>)</div>
              <div id="allyList" class="tab-scroll" style="display:flex; flex-direction:column;">
                <div class="small" style="padding:12px; color:#b8941f;">No allies yet.</div>
              </div>
            </div>

            <!-- Right: Ally Details & Actions -->
            <div class="box" style="border-color:#d4af37;">
              <div class="small" style="font-weight:bold; margin-bottom:8px; color:#d4af37;">Ally Details</div>
              <div id="allyDetails" style="font-size:12px; line-height:1.5;">
                <div class="small" style="color:#b8941f; padding:8px;">Select any ally to manage or invite to group.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 6: Help -->
        <div class="tab-content" data-tab="6" style="margin-top:10px; display:none;">
          <div class="box" style="max-height:580px; overflow-y:auto; border-color:#d4af37;">
            <h3 style="margin:0 0 12px 0; color:#d4af37;">📖 Game Mechanics Guide</h3>
            
            <!-- NPC Types -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #d4af37; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#d4af37; margin-bottom:8px;">🤖 NPC Types</div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">🛡️ Guards (Elite Site Defenders)</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  • <b>Purpose:</b> Defend flags using coordinated tactical combos<br>
                  • <b>Behavior:</b> Advanced AI with burst windows and recovery phases<br>
                  • <b>Squad Composition:</b> 3 DPS + 2 Healers per site (5 total)<br>
                  • <b>Formation:</b> DPS triangle (front) + Healers (rear support)<br>
                  • <b>Coordination:</b> Guards synchronize abilities on shared targets<br>
                  • <b>Combo System:</b> Gravity Well → Meteor Slam → Shoulder Charge<br>
                  • <b>Mana Management:</b> Burst → Recovery → Re-engage when ready<br>
                  • <b>Respawn:</b> 10 seconds if site remains player-controlled<br>
                  • <b>Cannot be invited to group</b> (site-bound tactical units)<br>
                  • <b>Visual:</b> Blue orbs coordinating at static positions<br><br>
                  <i style="color:#6cf;">💡 Guards are elite defenders that work as a coordinated team, not individual fighters. Watch for their synchronized combo chains!</i>
                </div>
              </div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">👥 Group Members (Player Party)</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  • <b>Purpose:</b> Fight alongside you as a party (max 10 members)<br>
                  • <b>Behavior:</b> User-controlled (Aggressive or Neutral)<br>
                  • <b>Formation:</b> Follow player in circular formation (60-100 unit radius)<br>
                  • <b>Movement:</b> Rotate around player, sprint if >200 units away<br>
                  • <b>Roles:</b> DPS (damage), Tank (defense), Healer (support)<br>
                  • <b>Equipment:</b> Can equip gear and assign abilities in Group tab<br>
                  • <b>Invite:</b> Right-click any non-guard ally → "Invite to Group"<br>
                  • <b>Visual:</b> Blue orbs following you in formation
                </div>
              </div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">⚔️ Non-Group Allies (Autonomous Fighters)</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  • <b>Purpose:</b> Capture enemy flags autonomously<br>
                  • <b>Behavior:</b> User-controlled (Aggressive or Neutral)<br>
                  • <b>Movement:</b> Seek nearest enemy flag, return to home base if none<br>
                  • <b>Can be invited to group</b> to convert to party member<br>
                  • <b>Spawn:</b> 3 per player-controlled flag (auto-spawn every 1.2s)<br>
                  • <b>Visual:</b> Blue orbs moving between flags
                </div>
              </div>
            </div>

            <!-- Behaviors -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #f94; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#f94; margin-bottom:8px;">⚡ Behavior System</div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">🔴 Aggressive Behavior</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  <b>Group Members:</b><br>
                  • Break formation to engage enemies within ~180 units<br>
                  • Actively seek combat opportunities<br>
                  • Return to formation when no enemies nearby<br><br>
                  <b>Non-Group Allies:</b><br>
                  • Detour from flag capture to fight enemies (~140 unit range)<br>
                  • More combat-focused, engage enemies more often<br>
                  • Still prioritize objectives but willing to fight en route
                </div>
              </div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">🔵 Neutral Behavior</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  <b>Group Members:</b><br>
                  • Stay closer to formation position<br>
                  • Only engage enemies within ~90 units<br>
                  • Prioritize protecting player over seeking combat<br><br>
                  <b>Non-Group Allies:</b><br>
                  • Focus on flag capture objectives<br>
                  • Only fight nearby threats (~80 unit range)<br>
                  • Ignore distant enemies unless blocking path to objective
                </div>
              </div>
              
              <div style="font-size:11px; line-height:1.6; color:#aaf; margin-top:8px;">
                💡 <b>Tip:</b> Use Aggressive for offense, Neutral for defense. Guards use advanced tactical AI (always coordinated).
              </div>
            </div>

            <!-- Guard Tactical System -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #d4af37; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#d4af37; margin-bottom:8px;">🛡️⚔️ Guard Tactical System (Elite AI)</div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">🎯 Squad Coordination</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  • <b>Formation:</b> 3 DPS (front triangle) + 2 Healers (rear support)<br>
                  • <b>Focus Target:</b> All guards attack the same enemy (synchronized)<br>
                  • <b>Shared AoE Position:</b> Guards dump area attacks at same location<br>
                  • <b>Healer Policies:</b> H1 (primary healer) handles emergencies, H2 (secondary) provides shields/auras<br>
                  • <b>Role Assignment:</b> Each guard has specific combat role (DPS/HEALER) that determines behavior
                </div>
              </div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">💥 Combo Chain (Burst Phase)</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  <b>Stage 1 - Initiation:</b> Leader casts <b>Gravity Well</b> (pulls + DoT)<br>
                  <b>Stage 2 - Burst:</b> All DPS cast <b>Meteor Slam</b> at same spot (synchronized AoE)<br>
                  <b>Stage 3 - Finisher:</b> Closest DPS executes <b>Shoulder Charge</b> (gap closer + AoE)<br>
                  <b>Cooldown:</b> 6s between combo chains (allows mana recovery)<br><br>
                  <i style="color:#fc6;">⚡ Watch for guards clustering their abilities - that's a coordinated burst!</i>
                </div>
              </div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">🔋 Mana Management & Recovery</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  • <b>Tactical Reserve:</b> Guards keep 30 mana minimum outside burst windows<br>
                  • <b>Recovery Mode:</b> When low on mana, guards enter recovery (light attacks only)<br>
                  • <b>Exit Condition:</b> Guards resume combos when mana ≥45 AND abilities are off cooldown<br>
                  • <b>Healer Reserve:</b> Healers keep 22 mana for emergency heals (override on ally critical HP)<br>
                  • <b>DPS Recovery:</b> DPS units rest at 20 mana, resume at 35 mana<br><br>
                  <i style="color:#6cf;">💡 Guards pace themselves - recovery phases are intentional, not bugs!</i>
                </div>
              </div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">🎭 Healer Role Policies</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  <b>H1 (Primary Healer):</b><br>
                  • Emergency heals when ally &lt;55% HP (mage_divine_touch, heal_burst)<br>
                  • AoE stabilize when 3+ wounded allies (heal_burst)<br>
                  • Cleanse wave when 2+ allies have DoTs<br>
                  • Shields when ally &lt;90% HP (ward_barrier)<br><br>
                  
                  <b>H2 (Secondary Healer):</b><br>
                  • Shields and auras (mage_radiant_aura, ward_barrier)<br>
                  • Cleanse when 2+ dotted allies<br>
                  • Backup emergency heals only when H1 can't handle it<br>
                  • Focus on preventative mitigation over reactive healing
                </div>
              </div>
              
              <div style="font-size:11px; line-height:1.6; color:#ffd; margin-top:8px; padding:8px; background:rgba(255,215,0,0.1); border-radius:3px;">
                🏆 <b>Strategic Tip:</b> Guard squads excel at holding defensive positions. They burst down threats, then recover safely behind their formation. Don't expect constant aggression - their strength is coordinated, rhythmic combat cycles.
              </div>
            </div>

            <!-- Group System -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #6f9; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#6f9; margin-bottom:8px;">👥 Group System</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Inviting Members:</b><br>
                • Right-click any non-guard ally → Select "Invite to Group"<br>
                • Max 10 members in party<br>
                • Members follow you in circular formation<br><br>
                
                <b>Managing Members:</b><br>
                • Open Inventory → Group Tab<br>
                • Click member to view/edit settings<br>
                • Set Role: DPS (damage), Tank (aggro/defense), Healer (support)<br>
                • Set Behavior: Aggressive (seek combat) or Neutral (defensive)<br>
                • Remove members with "Remove" button<br><br>
                
                <b>Equipment & Abilities:</b><br>
                • Click "Edit Equipment & Abilities" for member<br>
                • Equip armor/weapons from shared inventory<br>
                • Assign abilities to 5 slots (same as player)<br><br>
                
                <b>Formation Mechanics:</b><br>
                • Members orbit player at 60-100 unit radius<br>
                • Position based on join order (prevents overlap)<br>
                • Sprint to catch up if player moves far away (>200 units)<br>
                • Fine-tune position when close to formation point
              </div>
            </div>

            <!-- Role Behaviors -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #cf9; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#cf9; margin-bottom:8px;">🎭 Role Behaviors (Party AI)</div>
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Tank (front lip):</b><br>
                • Position: Slightly ahead of the stack; rarely roams.<br>
                • Peel Priority: If healer is pressured, immediately taunt/CC and body-block attackers.<br>
                • Objective Stop: Interrupt capture attempts on nearby points.<br>
                • Burst Setup: During burst window, hard CC the focus target; apply debuffs and control clumps.<br>
                • Survival: If low HP, use defensives and step back to stack edge (don’t kite away).<br>
                • Avoid: Don’t chase kiters far or waste CC into immunity.<br><br>

                <b>Healer (anchor):</b><br>
                • Position: Inside the stack; never leaves — out-of-position allies may miss heals.<br>
                • Emergencies: Self-safety first; use immunity/defensives early when focused.<br>
                • Saves: Burst heal + shield on critical ally (self > player > other healer > tank > lowest DPS).<br>
                • Stabilize: Use AoE heals for multiple allies and keep HoTs rolling; cleanse CC immediately on self/other healer.<br>
                • Pre-burst: During burst/clump pressure, apply mitigation aura and shields.<br>
                • Avoid: Don’t chase to heal overextended allies; don’t overspend mitigation on reckless DPS.<br><br>

                <b>DPS (execution):</b><br>
                • Position: Middle of the stack, slightly behind the tank line.<br>
                • Burst: Follow coordinator focus; during burst, dump damage/finishers; maintain clump bombs when 3+ targets.<br>
                • Outside Burst: Maintain pressure with DoTs/spammables on focus/highest threat on objective.<br>
                • Peel (assigned only): Apply CC/slow/knockback on healer’s attacker then return to stack.<br>
                • Override Rules: Stop captures; avoid tunneling unkillable focus target; help if healer is hard-focused.<br>
                • Avoid: Don’t over-chase far from objective/stack; don’t blow bombs outside burst unless wipe call.
              </div>
            </div>

            <!-- Level Progression System -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #ffd700; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#ffd700; margin-bottom:8px;">📊 Level Progression System</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc; margin-bottom:10px;">
                <b style="color:#ffd700;">XP & Leveling:</b><br>
                • Max Level: <b>50</b><br>
                • XP required grows exponentially: <b>Level<sup>1.8</sup> × 100</b><br>
                • Every level: +2 Stat Points (100 points total at max)<br>
                • Every 5 levels: Bonus Gold (Level × 25)<br>
                • Level 50: MAX LEVEL achievement with trophy reward<br><br>
                
                <b style="color:#ffd700;">Item Level System:</b><br>
                • Items scale with your current level (±2 variance)<br>
                • Rarity affects base stats (1.0x-3.0x multiplier)<br>
                • Item level = your level ± random 0-2<br>
                • Stat values scale by rarity: Grey → Green → Blue → Purple → Orange<br><br>
                
                <b style="color:#ffd700;">Enemy Scaling:</b><br>
                • Enemies spawn 5-30% above/below your level based on zone<br>
                • Stat growth: 15% per level above player baseline<br>
                • 5 zone tiers: Starter (1-10) → Lowland (8-20) → Midland (18-32) → Highland (30-42) → Endgame (40-50)<br><br>
                
                <b style="color:#ffd700;">Ally Scaling:</b><br>
                • Group members scale to 85% of player power<br>
                • Non-group allies match player level automatically<br>
                • Guards scale based on flag progression (every 2-3 captures)<br>
                • Allies gain stat points every 5 levels (same as player)<br>
              </div>
            </div>

            <!-- Future Milestone Ideas -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #9f9; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#9f9; margin-bottom:8px;">💡 Future Milestone Ideas</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Currently Implemented (Working):</b><br>
                • Every level: +2 Stat Points<br>
                • Every 5 levels: Bonus Gold<br>
                • Level 50: MAX LEVEL REACHED<br><br>
                
                <b>Suggested Future Milestones:</b><br>
                • <b>Level 10:</b> New zones unlocked (requires zone unlock system)<br>
                • <b>Level 25:</b> Elite content unlocked (requires elite tier system)<br>
                • <b>Level 30:</b> Skill mastery perks unlocked (requires perk system)<br>
                • <b>Level 40:</b> Endgame dungeons available (requires dungeon system)<br>
              </div>
            </div>

            <!-- Combat Mechanics -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #f66; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#f66; margin-bottom:8px;">⚔️ Combat Mechanics</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Targeting Ranges (detection distance):</b><br>
                • Guards: Coordinated focus (shared target system)<br>
                • Group Aggressive: ~180 units<br>
                • Group Neutral: ~90 units<br>
                • Non-Group Aggressive: ~140 units<br>
                • Non-Group Neutral: ~80 units<br><br>
                
                <b>Guard Defense Zones:</b><br>
                • Formation Slots: 5 fixed positions around flag spawn<br>
                • Defense Zone: 150 unit radius from flag<br>
                • Max Chase Distance: 260 units (then return to post)<br>
                • Hard Leash: 280 units (forced return)<br><br>
                
                <b>Ability Cooldowns:</b><br>
                • Guards respect combo timing (no spam)<br>
                • Recovery lockout prevents mana starvation<br>
                • Light attacks allowed during recovery<br>
                • Cooldown-aware re-engagement (wait for abilities)<br><br>
                
                <b>Respawn System:</b><br>
                • Guards: 10 seconds, respawn at site if player-owned<br>
                • Group Members: 10 seconds, respawn at home base and rejoin formation<br>
                • Non-Group: 10 seconds, respawn at home flag<br>
                • Lose site = lose defenders permanently<br><br>
                
                <b>Buffs & Effects:</b><br>
                • NPCs can receive all player buffs/debuffs<br>
                • Healers cast heals on low HP allies automatically<br>
                • Tanks use defensive abilities when threatened<br>
                • Guards coordinate shields before combat (proactive defense)<br>
                • See Buffs/Debuffs tab for full list
              </div>
            </div>

            <!-- Player Achievement Tracking -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #d4af37; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#d4af37; margin-bottom:8px;">🏅 Player Achievement Tracking</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Kill Counter (Bottom-Right HUD):</b><br>
                • <b>Kills:</b> Total enemies killed by YOU (only your killing blows count)<br>
                • <b>Biggest Bomb:</b> Highest multikill streak in current session<br>
                • Only counts when <b>you deal the final damage</b> that kills the enemy<br><br>
                
                <b>What Counts as Your Kill:</b><br>
                • ✅ Your melee attacks (Slash, Cleave)<br>
                • ✅ Your projectiles (Arc Bolt, Piercing Lance)<br>
                • ✅ Your area abilities (Gravity Well, Meteor Slam)<br>
                • ✅ DoTs YOU applied (Bleed, Burn, Shock from your abilities)<br><br>
                
                <b>What Does NOT Count:</b><br>
                • ❌ Enemy-on-enemy damage (enemies fighting each other)<br>
                • ❌ Group member attacks (your allies' kills)<br>
                • ❌ Guard attacks (site defender kills)<br>
                • ❌ DoTs from other units (friendly/enemy casters)<br><br>
                
                <b>BOMB! Achievement:</b><br>
                • Get <b>3+ kills within 3 seconds</b> to trigger a BOMB!<br>
                • Visual: Purple "BOMB!" notification with kill count (center screen)<br>
                • Audio: Special bomb sound effect plays<br>
                • Each kill resets the 3-second timer, allowing extended streaks<br>
                • Best for: Area damage abilities (Gravity Well, Meteor Slam, Blade Storm)<br><br>
                
                <b>Sound Effects:</b><br>
                • Kill sound plays on every confirmed player kill<br>
                • Bomb sound plays when bomb notification triggers<br>
              </div>
            </div>

            <!-- Controls -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #fa4; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#fa4; margin-bottom:8px;">🎮 Controls & UI</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Unit Inspection:</b><br>
                • Right-click any NPC to open inspection panel<br>
                • Shows: HP, Damage, Speed, Level, Active Effects<br>
                • For allies: Behavior buttons (Aggressive/Neutral)<br>
                • For allies: "Invite to Group" button (if not in group)<br><br>
                
                <b>Behavior Buttons:</b><br>
                • Click Aggressive or Neutral to change ally behavior<br>
                • Active button shows blue highlight<br>
                • Guards cannot change behavior (always aggressive)<br>
                • Group members sync behavior in Group tab<br><br>
                
                <b>Group Panel (Top-Right):</b><br>
                • Shows all group member health bars<br>
                • Displays member count (X/10)<br>
                • Live updates during combat<br><br>
                
                <b>Map (M key):</b><br>
                • View entire world layout<br>
                • See all sites and their owners (color-coded)<br>
                • Fast travel to player-owned sites by clicking
              </div>
            </div>

            <!-- Campaign Info -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #c6f; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#c6f; margin-bottom:8px;">🏆 Campaign Objectives</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Victory Conditions:</b><br>
                • Capture and hold flags to earn points<br>
                • First to reach target points (default 250) wins<br>
                • Control more flags than enemies for faster scoring<br>
                • Control ALL bases to become Emperor (+buffs!)<br><br>
                
                <b>Site Types:</b><br>
                • Flags (site_X): Worth points, spawn 3 defenders when held<br>
                • Bases (X_base): Team HQ, spawn defenders and knights<br>
                • Capture by standing near enemy flag for ~3 seconds<br><br>
                
                <b>Emperor Bonus:</b><br>
                • Control all base sites to unlock Emperor powers<br>
                • +60 HP, +30 Mana, +6 ATK, +8% CDR, +12% Speed<br>
                • +1.8 HP Regen, +1.2 Mana Regen<br>
                • All gates open for you
              </div>
            </div>

            <!-- Leveling System -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #9cf; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#9cf; margin-bottom:8px;">📊 Leveling & Progression System</div>
              
              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">👤 Player Leveling</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  • Level up manually in the <b>Level Up</b> tab<br>
                  • Spend attribute points on: Strength, Intelligence, Vitality, etc.<br>
                  • No automatic leveling - full control over build<br>
                  • Earn XP from combat and objectives
                </div>
              </div>

              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">🤝 Friendly (Ally) Leveling</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  <b>Initial Level:</b><br>
                  • New friendlies spawn at <b>Tier × 3</b> minimum level<br>
                  • Tier is your faction's Equipment Tier (1-5)<br>
                  • Example: Tier 3 → allies spawn at level 9+<br><br>
                  
                  <b>Level Increases:</b><br>
                  • <b>Manual Upgrade:</b> Purchase "Increase Squad Level" at Marketplace<br>
                  &nbsp;&nbsp;→ Costs 800 gold (increases 25% each purchase)<br>
                  &nbsp;&nbsp;→ Gives +1 level to ALL living allies instantly<br>
                  • <b>Equipment Tier Upgrade:</b> When you upgrade equipment tier, new minimum level = new Tier × 3<br>
                  &nbsp;&nbsp;→ Example: Upgrade from Tier 2 to Tier 3 → min level jumps from 6 to 9<br><br>
                  
                  <b>Limitations:</b><br>
                  • Friendlies do NOT auto-level over time<br>
                  • Only level up via marketplace purchase or tier upgrades<br>
                  • Dead allies don't receive marketplace level boosts (only living)<br>
                  • No individual leveling - all allies level together
                </div>
              </div>

              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">⚔️ Enemy Leveling (Auto-Scaling)</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  <b>Automatic Scaling Formula:</b><br>
                  Enemy Level = <b>MAX</b> of:<br>
                  &nbsp;&nbsp;1. <b>Time-Based:</b> (Campaign Time ÷ 60) + 1<br>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ Example: After 5 minutes → level 6<br>
                  &nbsp;&nbsp;2. <b>Tier-Based:</b> Enemy Faction Tier × 3<br>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ Example: Tier 4 → level 12<br><br>
                  
                  <b>Level-Up Behavior:</b><br>
                  • Enemies check for level-ups every game tick<br>
                  • When targetLevel > currentLevel, they level up instantly<br>
                  • <b>HP is preserved</b> during level-up (ratio-based, not full heal)<br>
                  • Stats, armor, and abilities update to new level<br><br>
                  
                  <b>Equipment Upgrades:</b><br>
                  • When enemy faction tier increases, armor rarity improves<br>
                  • Tier 1 → Common, Tier 2 → Uncommon, Tier 3 → Rare, etc.<br>
                  • Automatic upgrade applies to all enemies of that faction<br><br>
                  
                  <b>Why Enemies Scale:</b><br>
                  • Prevents early game steamroll<br>
                  • Ensures late campaign remains challenging<br>
                  • Catch-up mechanic for losing factions (they get gold assistance)
                </div>
              </div>

              <div style="margin-bottom:10px;">
                <div style="font-weight:bold; color:#fff; margin-bottom:4px;">🏭 Equipment Tier System</div>
                <div style="font-size:11px; line-height:1.6; color:#ccc;">
                  <b>Tier Progression (1-5):</b><br>
                  • Tier 1: Common (★☆☆☆☆) - Starting gear<br>
                  • Tier 2: Uncommon (★★☆☆☆) - Early upgrade<br>
                  • Tier 3: Rare (★★★☆☆) - Mid-game<br>
                  • Tier 4: Epic (★★★★☆) - Late-game<br>
                  • Tier 5: Legendary (★★★★★) - Max power<br><br>
                  
                  <div style="text-align:left; margin:12px 0;">
                    <img src="${getAssetPath('assets/items/Sword progression from common to legendary.png')}" alt="Sword Progression" style="max-width:24%; height:auto; border-radius:4px; border:1px solid rgba(255,255,255,0.2);"/>
                    <div style="font-size:10px; color:#999; margin-top:4px;">Visual progression from Common to Legendary tier</div>
                  </div>
                  
                  <b>Tier Upgrades (Automatic):</b><br>
                  • Each faction (player, Crimson Legion, etc.) has independent tier<br>
                  • Upgrades cost gold (spent automatically by AI, manually by player)<br>
                  • When faction earns enough gold, tier increases automatically<br>
                  • Upgrading tier improves ALL units' equipment in that faction<br><br>
                  
                  <b>Player Tier Upgrade:</b><br>
                  • Purchase "Squad Armor Upgrade" at Marketplace<br>
                  • OR tier upgrades automatically when player faction has enough gold<br>
                  • Costs increase per tier (Tier 2 costs more than Tier 1)<br>
                  • Affects player AND all friendlies
                </div>
              </div>

              <div style="font-size:11px; line-height:1.6; color:#aaf; margin-top:8px;">
                💡 <b>Summary:</b><br>
                • <b>Player:</b> Manual leveling via Level Up tab<br>
                • <b>Friendlies:</b> Level via marketplace purchase OR tier upgrades (min = Tier × 3)<br>
                • <b>Enemies:</b> Auto-scale based on time AND their faction tier (max of both formulas)<br>
                • <b>Balance Tip:</b> Keep buying squad level upgrades to stay ahead of enemy scaling!
              </div>
            </div>

            <!-- Guard Progression System -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #4bf; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#4bf; margin-bottom:8px;">🛡️ Guard Progression System</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Flag Guard Composition:</b><br>
                • Each flag spawns <b>5 coordinated guards</b> in a pentagon formation (70 units from flag)<br>
                • <b>2 Mage Healers:</b> Stay at 100-unit range, kite when pressured, prioritize healing<br>
                • <b>1 Warrior DPS:</b> High damage melee fighter<br>
                • <b>1 Knight DPS:</b> Balanced melee damage dealer<br>
                • <b>1 Tank DPS:</b> Defensive bruiser with survivability<br><br>
                
                <b>Coordinated Ball Group AI:</b><br>
                • <b>Priority 100:</b> Enemies within flag radius (highest threat)<br>
                • <b>Priority 80:</b> Enemies in inner defense zone (flag radius + 80 units)<br>
                • <b>Priority 60:</b> Enemies in aggro range (220 units from flag)<br>
                • DPS Guards: 70% chase target, 30% maintain group cohesion<br>
                • Healers: Optimal positioning at 100 units, defensive kiting behavior<br>
                • All guards work as coordinated team to defend flag<br><br>
                
                <b>Time-Based Gear Progression:</b><br>
                • Guards upgrade gear every <b>5 minutes</b> of continuous flag ownership<br>
                • Progression: Common → Uncommon → Rare → Epic → Legendary<br>
                • Higher rarity = better stats, damage, and survivability<br>
                • <b>Level progression:</b> Guards gain levels over time and preserve them through upgrades<br>
                • <b>HP preservation:</b> Guard HP% is maintained during gear upgrades (not full heal)<br>
                • Track progress in Campaign tab (shows current rarity and countdown to next upgrade)<br><br>
                
                <b>Flag Capture Impact:</b><br>
                • When flag is captured, ALL guards are destroyed instantly<br>
                • Progression resets: Timer = 0, Rarity = Common, Levels = [1,1,1,1,1]<br>
                • New owner spawns fresh level 1 guards with common gear<br>
                • Must rebuild progression from scratch<br><br>
                
                <b>Strategic Importance:</b><br>
                • Long-held flags become extremely difficult to capture (legendary guards)<br>
                • Early pressure prevents enemy flags from scaling up<br>
                • View all guard stats in Campaign tab: levels, HP%, gear rarity, time held
              </div>
            </div>

            <!-- Inventory & UI Features -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #fb7; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#fb7; margin-bottom:8px;">🎒 Inventory & UI Features</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Inventory Hover Tooltips:</b><br>
                • Hover mouse over any inventory item to see detailed stats<br>
                • Displays: Attack, Defense, HP, Mana, Speed, Cooldown Reduction<br>
                • Shows all buffs/debuffs granted by the item<br>
                • Shows special effects (healing over time, damage over time, etc.)<br>
                • Tooltip appears at bottom of inventory panel<br><br>
                
                <b>Weapon Preview (P Key):</b><br>
                • Press <b>P</b> while in inventory to preview the selected weapon in fullscreen<br>
                • Shows high-resolution weapon image if available<br>
                • Works for all weapon types and rarities<br>
                • Press P or ESC to close the preview<br>
                • Click anywhere on the preview to close it<br>
                • Non-weapon items will show "No preview available"<br><br>
                
                <b>Interaction Prompts:</b><br>
                • Center-screen prompts show when near interactable objects<br>
                • <b>"Press F to Open Base Menu":</b> Appears near your base (120 unit range)<br>
                • <b>Other prompts:</b> Flag captures, gate interactions, etc.<br>
                • Prompts sync with your keybind settings (shows current key assignment)<br>
                • White text with black outline for clear visibility<br><br>
                
                <b>Base Menu:</b><br>
                • Press F when near your base to open build/upgrade menu<br>
                • Purchase squad upgrades, equipment tiers, and more<br>
                • Access marketplace for buying/selling items<br><br>
                
                <b>Ability Bar Tooltips:</b><br>
                • Hover over ability icons to see skill details<br>
                • Shows: Cooldown, mana cost, damage/healing, effects<br>
                • Appears below ability bar for easy reference
              </div>
            </div>

            <!-- Campaign Tab Features -->
            <div style="margin-bottom:16px; padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #c6f; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#c6f; margin-bottom:8px;">📊 Campaign Tab Features</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                <b>Guard Progression Tracking:</b><br>
                • Campaign tab shows detailed stats for all player-owned flags<br>
                • Each flag displays:<br>
                &nbsp;&nbsp;→ Flag name and time held (minutes:seconds)<br>
                &nbsp;&nbsp;→ Current gear rarity (color-coded: grey/green/blue/purple/orange)<br>
                &nbsp;&nbsp;→ Countdown to next upgrade (seconds remaining)<br>
                &nbsp;&nbsp;→ Full list of all 5 guards with class, level, and HP%<br><br>
                
                <b>Guard Status Display:</b><br>
                • <b>Guard Class/Role:</b> Shows Mage-Healer, Warrior-DPS, Knight-DPS, Tank-DPS<br>
                • <b>Level:</b> Current guard level (increases over time)<br>
                • <b>HP%:</b> Color-coded health (green >60%, yellow >30%, red ≤30%)<br>
                • <b>Defeated:</b> Shows "💀 DEFEATED" if guard is currently dead<br><br>
                
                <b>Faction Status:</b><br>
                • View all faction scores, gold, and equipment tiers<br>
                • See which faction is winning the campaign<br>
                • Track active flag captures in real-time<br><br>
                
                <b>Strategic Use:</b><br>
                • Monitor your weakest flags (low guard HP% or low gear)<br>
                • Identify which flags are close to upgrading<br>
                • Plan defense priorities based on guard status
              </div>
            </div>

            <!-- Tips & Tricks -->
            <div style="padding:12px; background:rgba(0,0,0,0.2); border-left:3px solid #ff6; border-radius:3px;">
              <div style="font-weight:bold; font-size:14px; color:#ff6; margin-bottom:8px;">💡 Tips & Tricks</div>
              
              <div style="font-size:11px; line-height:1.6; color:#ccc;">
                • <b>Early Game:</b> Invite strongest allies to group immediately for protection<br>
                • <b>Aggressive Groups:</b> Good for offense - they'll clear enemies ahead of you<br>
                • <b>Neutral Groups:</b> Good for defense - they stay close and guard you<br>
                • <b>Mixed Behaviors:</b> Set front-line (tanks) to Aggressive, back-line (healers) to Neutral<br>
                • <b>Flag Capture:</b> Let non-group allies do the work while group protects you<br>
                • <b>Guard Defense:</b> 5 coordinated guards defend each flag - legendary guards are extremely powerful<br>
                • <b>Pressure Enemy Flags:</b> Attack enemy flags early before their guards upgrade to higher rarities<br>
                • <b>Hold Flags Long:</b> Longer ownership = stronger guards = harder for enemies to recapture<br>
                • <b>Check Campaign Tab:</b> Monitor guard HP% and gear progression on all your flags<br>
                • <b>Respawn Strategy:</b> If ally dies, they respawn at home - plan routes accordingly<br>
                • <b>Equipment:</b> Share best gear with group members for stronger party<br>
                • <b>Fast Travel:</b> Use Map (M) to teleport between your sites quickly<br>
                • <b>Hover for Info:</b> Hover over inventory items and abilities to see detailed stats<br>
                • <b>Weapon Preview:</b> Press P in inventory to view fullscreen weapon images<br>
                • <b>Emperor Rush:</b> Capture all bases ASAP for massive power spike
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 7: Campaign -->
        <div class="tab-content" data-tab="7" style="margin-top:10px; display:none;">
          <!-- Compact Leader/Last banner -->
          <div class="box" style="border-color:#d4af37;">
            <div id="campaignHeader" class="small" style="line-height:1.6; color:#d4af37;"></div>
          </div>
          <div class="grid2">
            <!-- Left: Team Metrics -->
            <div class="box tab-scroll" style="overflow:auto; border-color:#d4af37;">
              <div class="small" style="font-weight:bold; margin-bottom:8px; color:#d4af37;">Faction Status</div>
              <div id="campaignTeams" class="small" style="line-height:1.6"></div>
            </div>
            <!-- Right: Active Captures -->
            <div class="box tab-scroll" style="overflow:auto; border-color:#d4af37; height:550px;">
              <div class="small" style="font-weight:bold; margin-bottom:8px; color:#d4af37;">Active Captures</div>
              <div id="campaignCaptures" class="small" style="line-height:1.6"></div>
            </div>
          </div>
        </div>

        <!-- Tab 8: Slots -->
        <div class="tab-content" data-tab="8" style="margin-top:10px; display:none;">
          <!-- Header: SP & Zone Info -->
          <div class="box" style="border-color:#d4af37; background:rgba(0,0,0,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:16px; font-weight:bold; color:#d4af37;">🔷 Slot Management</div>
                <div class="small" style="color:#ccc; margin-top:2px;">Unlock and upgrade guard & ally slots</div>
              </div>
              <div style="text-align:right;">
                <div class="small" style="color:#b8941f;">
                  Level <span id="slotPlayerLevel">1</span> • Zone <span id="slotZoneTier">1</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Guards & Allies Side-by-Side -->
          <div class="grid2" style="margin-top:10px;">
            <!-- Left: Guard Slots Section -->
            <div class="box" style="border-color:#d4af37; height:550px; display:flex; flex-direction:column;">
              <div style="font-weight:bold; font-size:14px; color:#d4af37; margin-bottom:8px;">
                🛡️ GUARD SLOTS (5) - Elite Site Defenders
              </div>
              <div class="small" style="color:#ccc; margin-bottom:12px;">Guards defend flags with coordinated combos. Site-bound tactical units.</div>
              <div id="guardSlotList" style="display:flex; flex-direction:column; gap:8px; flex:1; overflow-y:auto;"></div>
            </div>

            <!-- Right: Ally Slots Section -->
            <div class="box" style="border-color:#d4af37; height:550px; display:flex; flex-direction:column;">
              <div style="font-weight:bold; font-size:14px; color:#d4af37; margin-bottom:8px;">
                👥 ALLY SLOTS (10) - Mobile Squad
              </div>
              <div class="small" style="color:#ccc; margin-bottom:12px;">Allies auto-capture flags or join your group. Flexible fighters.</div>
              <div id="allySlotList" style="display:flex; flex-direction:column; gap:8px; flex:1; overflow-y:auto;"></div>
            </div>
          </div>
        </div>

        <!-- Tab 9: Fighter Cards Collection -->
        <div class="tab-content" data-tab="9" style="margin-top:10px; display:none;">
          <div class="box" style="border-color:#d4af37; background:rgba(0,0,0,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:16px; font-weight:bold; color:#d4af37;">🎴 Fighter Cards</div>
                <div class="small" style="color:#ccc; margin-top:2px;">Collect fighters to upgrade your army</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:14px; color:#6cf;">
                  Cards: <span id="cardCount">0</span>
                </div>
              </div>
            </div>
            <!-- Sort buttons -->
            <div style="margin-top:12px; display:flex; gap:6px;">
              <button id="sortCardsByRarity" style="flex:1; padding:6px; background:#d4af37; color:#000; border:none; border-radius:3px; cursor:pointer; font-size:12px; font-weight:bold;">Sort by Rarity</button>
              <button id="sortCardsByLevel" style="flex:1; padding:6px; background:rgba(212,175,55,0.5); color:#d4af37; border:none; border-radius:3px; cursor:pointer; font-size:12px;">Sort by Level</button>
              <button id="sortCardsByRating" style="flex:1; padding:6px; background:rgba(212,175,55,0.5); color:#d4af37; border:none; border-radius:3px; cursor:pointer; font-size:12px;">Sort by Rating</button>
            </div>
          </div>

          <!-- Fighter Cards Grid -->
          <div id="fighterCardsGrid" style="margin-top:12px; display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px; padding:10px; background:rgba(0,0,0,0.3); border-radius:6px; min-height:600px; max-height:700px; overflow-y:auto;">
            <!-- Cards rendered here -->
          </div>
        </div>
      </div>
    </div>

    <!-- Remove old separate overlays: Skills and Level overlays are now tabs -->

    <div id="escOverlay" class="overlay">
      <div class="panel" style="width:min(760px,92vw); background:rgba(0,0,0,0.65); border:2px solid rgba(212,175,55,0.5); box-shadow:0 0 24px rgba(212,175,55,0.25);">
        <!-- Main Menu Screen -->
        <div id="escMenuMain">
          <h2 style="color:#d4af37; text-shadow:0 0 12px rgba(212,175,55,0.4);">Menu</h2>
          <div class="box" style="background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div class="btnRow" style="display:flex; flex-direction:column; gap:10px; align-items:stretch;">
              <button id="btnResume" style="font-size:18px; padding:14px;">Resume Game</button>
              <button id="btnSave" style="font-size:18px; padding:14px;">Save Game</button>
              <button id="btnLoad" style="font-size:18px; padding:14px;">Load Game</button>
              <button id="btnOptions" style="font-size:18px; padding:14px;">Options</button>
              <button id="btnExitToMenu" class="secondary" style="font-size:18px; padding:14px;">Exit to Main Menu</button>
            </div>
            <div class="small" style="margin-top:12px; text-align:center;">Save/Load uses browser localStorage.</div>
          </div>
        </div>

        <!-- Options Submenu Screen -->
        <div id="escMenuOptions" style="display:none">
          <div class="row" style="align-items:center; margin-bottom:12px;">
            <button id="btnBackToMenu" class="secondary">← Back</button>
            <h2 style="margin:0; flex:1; text-align:center; color:#d4af37; text-shadow:0 0 12px rgba(212,175,55,0.4);">Options</h2>
            <div style="width:80px;"></div> <!-- Spacer for centering -->
          </div>
          
          <div class="box" style="background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div style="font-weight:900; color:#d4af37;">Gameplay</div>
            <div style="margin-top:10px" class="row">
              <label class="small"><input id="optShowAim" type="checkbox" checked/> Show aim line</label>
            </div>
            <div style="margin-top:8px">
              <label class="small"><input id="optAutoPickup" type="checkbox"/> Auto-pickup loot when walked over</label>
            </div>
            <div style="margin-top:10px">
              <label class="small"><b>Camera Mode:</b></label>
              <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <label class="small"><input type="radio" id="optCameraFollowChar" name="cameraMode" value="follow"/> Follow Character</label>
                <label class="small"><input type="radio" id="optCameraFreeView" name="cameraMode" value="freeview"/> Free View (Dead Zone)</label>
                <label class="small"><input type="radio" id="optCameraEdgeStrict" name="cameraMode" value="edge_strict"/> Classic Edge Scroll</label>
              </div>
            </div>
          </div>

          <div class="box" style="margin-top:12px; background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div style="font-weight:900; margin-bottom:8px; color:#d4af37;">🖥️ Display</div>
            <div class="small" style="line-height:1.5; color:#ccc;">
              If the UI appears too large or small, adjust your browser zoom in settings.<br>
              <b>Zoom:</b> <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">+</kbd> (in) or <kbd class="kbd">Ctrl</kbd> + <kbd class="kbd">-</kbd> (out)
            </div>
          </div>

          <div class="box" style="margin-top:12px; background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div class="small" style="font-weight:900; color:#d4af37;">Keybinds</div>
            <div id="bindList"></div>

            <div class="btnRow">
              <button id="btnApplyOpts">Apply Options</button>
              <button id="btnResetBinds" class="secondary">Reset Keybinds</button>
            </div>

            <div id="rebindHint" class="small" style="margin-top:8px; display:none">
              Press a key now to rebind, or press Esc to cancel.
            </div>
          </div>

          <div class="box" style="margin-top:12px; background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div class="small" style="font-weight:900; color:#d4af37;">Debug</div>
            <div style="padding:8px; background:rgba(0,0,0,0.3); border-radius:4px;">
              <div style="margin-bottom:12px;">
                <div class="small" style="font-weight:900; color:#d4af37; margin-bottom:10px;">Download Logs</div>
                
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                  <input type="checkbox" id="enablePlayerLog" checked style="cursor:pointer;">
                  <span class="small" style="color:#6cf;">Player Event Log</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:8px; color:#888; font-size:10px;">All events affecting player: damage, healing, shields, buffs, regen, stat changes</div>
                
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                  <input type="checkbox" id="enableCombatLog" checked style="cursor:pointer;">
                  <span class="small" style="color:#f90;">Combat Event Log</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:8px; color:#888; font-size:10px;">Timestamped combat events: damage, healing, HOT effects</div>
                
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                  <input type="checkbox" id="enableDebugLog" checked style="cursor:pointer;">
                  <span class="small" style="color:#9f9;">Debug Diagnostic Log</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:8px; color:#888; font-size:10px;">Technical diagnostics: stat calculations, shield mechanics, system debugging</div>
                
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                  <input type="checkbox" id="enableDamageLog" checked style="cursor:pointer;">
                  <span class="small" style="color:#f66;">Damage/Healing Report</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:8px; color:#888; font-size:10px;">Summary of damage dealt/received, healing done, shields provided by each fighter</div>
                
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                  <input type="checkbox" id="enableAbilityLog" checked style="cursor:pointer;">
                  <span class="small" style="color:#c9f;">Ability Usage Log</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:8px; color:#888; font-size:10px;">Track how often each ability is cast by role/class with average cooldowns for AI tuning</div>
                
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                  <input type="checkbox" id="enableEffectLog" checked style="cursor:pointer;">
                  <span class="small" style="color:#6cf;">Effect Cast Log</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:8px; color:#888; font-size:10px;">Track all buffs, shields, heals, and HOTs cast by friendlies and enemies</div>
                
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                  <input type="checkbox" id="enableAIBehaviorLog" checked style="cursor:pointer;">
                  <span class="small" style="color:#fc6;">AI Behavior Tracking</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:8px; color:#888; font-size:10px;">Track AI decision changes, target switches, behavior changes, and stuck loops</div>
                
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px; cursor:pointer;">
                  <input type="checkbox" id="enableConsoleLog" checked style="cursor:pointer;">
                  <span class="small" style="color:#fa3;">Console Errors</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:12px; color:#888; font-size:10px;">JavaScript errors and warnings from browser console</div>
                
                <button id="btnDownloadAllLogs" style="width:100%; margin-top:4px; font-weight:bold; background:linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color:#000;">Download All Enabled Logs</button>
                <div class="small" style="margin-top:6px; color:#888; font-size:10px;">Downloads all checked logs as separate files with one click.</div>
              </div>
              
              <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(212,175,55,0.2);">
                <div class="small" style="font-weight:900; color:#d4af37; margin-bottom:6px;">Guard Performance Options</div>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:8px; cursor:pointer;">
                  <input type="checkbox" id="enableGuardBallLogging" checked style="cursor:pointer;">
                  <span class="small" style="color:#9cf;">Guard Ball Logging</span>
                </label>
                <div class="small" style="margin-left:22px; margin-bottom:12px; color:#888; font-size:10px;">⚠️ <b>Performance Impact</b>: Calculates guard focus targeting coordination. <b>Disable to improve FPS</b> in large guard battles. Enable for performance debugging.</div>
              </div>
              
              <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(212,175,55,0.2);">
                <div class="small" style="font-weight:900; color:#d4af37; margin-bottom:6px;">Ability Tracking Options</div>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer;">
                  <input type="checkbox" id="trackFriendlyAbilities" checked style="cursor:pointer;">
                  <span class="small" style="color:#6cf;">Track Friendly Abilities</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:8px; cursor:pointer;">
                  <input type="checkbox" id="trackEnemyAbilities" checked style="cursor:pointer;">
                  <span class="small" style="color:#f66;">Track Enemy Abilities</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer;">
                  <input type="checkbox" id="showAbilityDisplay" checked style="cursor:pointer;">
                  <span class="small" style="color:#fc6;">Show Ability Cast Display</span>
                </label>
                <div class="small" style="margin-top:6px; color:#888; font-size:10px;"><b>Visual only</b> - Control tracking toggles for Ability Usage Log, toggle display to show/hide corner overlay. No performance impact.</div>
              </div>
              
              <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(212,175,55,0.2);">
                <div class="small" style="font-weight:900; color:#d4af37; margin-bottom:6px;">AI Behavior Display (Debug)</div>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer;">
                  <input type="checkbox" id="optShowDebugAI" checked style="cursor:pointer;">
                  <span class="small" style="color:#6bff6b;">Show Friendly AI Behavior</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:8px; cursor:pointer;">
                  <input type="checkbox" id="optShowDebugAIEnemies" style="cursor:pointer;">
                  <span class="small" style="color:#ff6b6b;">Show Enemy AI Behavior</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer;">
                  <input type="checkbox" id="optShowAbilityDisplay" checked style="cursor:pointer;">
                  <span class="small" style="color:#ffc86b;">Show Ability Casts (Overlay)</span>
                </label>
                <div class="small" style="margin-top:6px; color:#888; font-size:10px;">Real-time on-screen overlays at bottom-left. Shows AI decision changes and ability executions. No logging - only visual debug info.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ability Cast Display (Corner Overlay) -->
    <div id="abilityCastDisplay" style="position: fixed; bottom: 20px; left: 20px; width: 280px; max-height: 300px; background: rgba(0,0,0,0.85); border: 2px solid rgba(252,198,102,0.5); border-radius: 6px; padding: 8px; font-family: monospace; font-size: 11px; color: #aaf; overflow-y: auto; z-index: 1000; display: none; box-shadow: 0 0 10px rgba(0,0,0,0.8);">
      <div style="color: #d4af37; font-weight: bold; margin-bottom: 6px;">Recent Ability Casts</div>
      <div id="abilityCastList" style="max-height: 260px; overflow-y: auto;"></div>
    </div>

    <!-- Marketplace Overlay -->
    <div id="marketplaceOverlay" class="overlay">
      <div class="panel" style="width:min(96vw,1400px); height:90vh; display:flex; flex-direction:column; background:rgba(0,0,0,0.65); border:2px solid rgba(212,175,55,0.5); box-shadow:0 0 24px rgba(212,175,55,0.25);">
        <div class="row" style="position:relative; align-items:center; margin-bottom:10px; flex-shrink:0">
          <div id="marketConfirm" class="small" style="position:absolute; left:0; top:0; min-height:18px; font-weight:900; background:transparent; padding:0; margin:0; pointer-events:none;"></div>
          <h2 style="margin:0; flex:1; text-align:center; color:#d4af37; text-shadow:0 0 12px rgba(212,175,55,0.4);">🏪 Marketplace</h2>
          <button id="btnCloseMarket" class="secondary">Close</button>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; flex:1; overflow:hidden">
          <!-- Left: Shop (Buy) -->
          <div class="box" style="display:flex; flex-direction:column; overflow:hidden; background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div style="margin-bottom:8px; flex-shrink:0">
              <div class="small" style="font-weight:900; margin-bottom:4px; color:#d4af37;">🛒 Buy Items</div>
              <div class="small" style="color:#aaa">Unlimited stock available!</div>
            </div>
            <div id="marketInspect" class="small" style="margin-bottom:10px; line-height:1.4; min-height:60px; padding:8px; background:rgba(0,0,0,0.2); border-radius:4px; flex-shrink:0">
              Select an item to view its stats.
            </div>
            <div id="shopItems" class="invGrid" style="flex:1; overflow-y:auto; gap:8px"></div>
          </div>
          
          <!-- Right: Player Inventory (Sell) -->
          <div class="box" style="display:flex; flex-direction:column; overflow:hidden; background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div style="margin-bottom:8px; flex-shrink:0; display:flex; justify-content:space-between; align-items:center">
              <div>
                <div class="small" style="font-weight:900; margin-bottom:4px; color:#d4af37;">💰 Your Gold: <span id="marketGold" style="color:#ffd700; font-weight:900;">0</span></div>
                <div class="small" style="color:#aaa">📦 Sell Items (Press E or Double-Click)</div>
              </div>
              <button id="btnSellAll" class="secondary" style="height:fit-content; padding:6px 12px; font-size:12px">Sell All</button>
            </div>
            <div id="sellInspect" class="small" style="margin-bottom:10px; line-height:1.4; min-height:60px; padding:8px; background:rgba(0,0,0,0.2); border-radius:4px; flex-shrink:0">
              Click an item to view stats and sell value.
            </div>
            <div id="sellItems" class="invGrid" style="flex:1; overflow-y:auto; gap:8px"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Base Actions Choice Menu -->
    <div id="baseActionsOverlay" class="overlay">
      <div class="panel" style="width:min(500px,92vw); background:rgba(0,0,0,0.65); border:2px solid rgba(212,175,55,0.5); box-shadow:0 0 24px rgba(212,175,55,0.25);">
        <h2 style="text-align:center; color:#d4af37; text-shadow:0 0 12px rgba(212,175,55,0.4);">🏰 Base Actions</h2>
        <div class="box" style="margin-top:10px; background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
          <div class="small" style="margin-bottom:12px; text-align:center; color:#aaa">What would you like to do?</div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <button id="btnOpenMarketplace" style="padding:20px; font-size:18px; background:rgba(255,215,0,0.2); border:2px solid rgba(255,215,0,0.4); color:#fff; cursor:pointer; border-radius:6px;">
              🏪 Open Marketplace
              <div style="font-size:12px; color:#aaa; margin-top:4px;">Buy weapons, armor, and potions</div>
            </button>
            <button id="btnOpenGarrison" style="padding:20px; font-size:18px; background:rgba(75,107,200,0.2); border:2px solid rgba(75,107,200,0.4); color:#fff; cursor:pointer; border-radius:6px;">
              ⚔️ Garrison Management
              <div style="font-size:12px; color:#aaa; margin-top:4px;">Command and assign your allies</div>
            </button>
          </div>
          <button id="btnCloseBaseActions" class="secondary" style="margin-top:12px; width:100%;">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Garrison Management Overlay -->
    <div id="garrisonOverlay" class="overlay">
      <div class="panel" style="width:min(800px,92vw); background:rgba(0,0,0,0.65); border:2px solid rgba(212,175,55,0.5); box-shadow:0 0 24px rgba(212,175,55,0.25);">
        <div class="row" style="align-items:center;">
          <h2 style="margin:0; flex:1; text-align:center; color:#d4af37; text-shadow:0 0 12px rgba(212,175,55,0.4);">⚔️ Garrison Management</h2>
          <button id="btnCloseGarrison" class="secondary">Close</button>
        </div>
        <div class="box" style="margin-top:10px; background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
          <div class="small" style="font-weight:900; margin-bottom:8px; color:#d4af37;">Base Defense Management</div>
          <div class="small" style="margin-bottom:12px; color:#aaa">Assign allies to defend your bases and captured flags permanently. They will stay there and respawn at the location.</div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div class="small" style="font-weight:900;">Locations</div>
            <button id="btnCancelAllGarrison" style="padding:4px 12px; font-size:11px; background:rgba(255,85,85,0.2); border:1px solid rgba(255,85,85,0.4); color:#f55; cursor:pointer; border-radius:3px;">Cancel All Assignments</button>
          </div>
          <div id="garrisonLocationList" style="max-height:200px; overflow-y:auto; margin-bottom:16px; border:1px solid rgba(255,255,255,0.1); padding:8px; background:rgba(0,0,0,0.2);">
            <!-- Locations with garrison counts -->
          </div>
          
          <div style="border-top:2px solid rgba(255,255,255,0.1); padding-top:16px;">
            <div class="small" style="font-weight:900; margin-bottom:8px;">All Allies (<span id="garrisonAllyCount">0</span>)</div>
            <div id="garrisonDetailList" style="max-height:320px; overflow-y:auto;">
              <!-- Individual ally cards -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- End -->
    <div id="endOverlay" class="overlay">
      <div class="panel" style="width:min(560px,92vw); background:rgba(0,0,0,0.65); border:2px solid rgba(212,175,55,0.5); box-shadow:0 0 24px rgba(212,175,55,0.25);">
        <h2 id="endTitle" style="color:#d4af37; text-shadow:0 0 12px rgba(212,175,55,0.4);">Campaign Complete</h2>
        <div class="box" style="background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
          <div class="small" id="endText">You won.</div>
          <div class="box" style="margin-top:10px; background:rgba(5,5,5,0.75); border:2px solid rgba(212,175,55,0.35); box-shadow:0 0 12px rgba(212,175,55,0.18);">
            <div class="small" style="font-weight:900; color:#d4af37;">Rewards</div>
            <ul id="endRewards" class="small" style="margin-top:6px"></ul>
          </div>
          <div class="btnRow" style="margin-top:10px">
            <button id="btnNextCampaign">Start Next Campaign</button>
            <button id="btnRestart" class="secondary">Restart (Reset Loot)</button>
            <button id="btnOpenInv2" class="secondary">Inventory</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Unit Inspection Panel (non-blocking, no overlay dim) -->
    <div id="unitInspectionPanel" style="position:fixed; inset:0; pointer-events:none; background:transparent; display:none;">
      <div class="panel" id="unitInspectionContent" style="position:fixed; width:280px; pointer-events:auto; background:rgba(0,0,0,0.92); border:2px solid rgba(212,175,55,0.6); box-shadow:0 0 18px rgba(212,175,55,0.3); padding:10px; left:10px; top:195px; z-index:150; display:none;">
        <div class="row" style="justify-content:space-between; align-items:center">
          <h3 id="unitName" style="margin:0; color:#d4af37;">Unit</h3>
          <button id="closeUnitPanel" style="background:none; border:1px solid rgba(255,255,255,0.2); color:#fff; padding:4px 8px; cursor:pointer; font-size:12px;">Close</button>
        </div>
        <div class="small" id="unitTeam" style="margin-top:6px; color:#aaa"></div>
        <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:8px;">
          <div class="small" style="font-weight:bold">Stats</div>
          <table class="small" style="margin-top:6px; width:100%;">
            <tr><td>HP</td><td id="unitHP" style="text-align:right">0/0</td></tr>
            <tr><td>DMG</td><td id="unitDMG" style="text-align:right">0</td></tr>
            <tr><td>Speed</td><td id="unitSpeed" style="text-align:right">0</td></tr>
            <tr><td>Lvl</td><td id="unitLevel" style="text-align:right">1</td></tr>
          </table>
        </div>
        <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:8px;">
          <div class="small" style="font-weight:bold">Active Abilities</div>
          <div id="unitAbilities" class="small effectPills" style="margin-top:6px; line-height:1.4">None</div>
        </div>
        <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:8px;">
          <div class="small" style="font-weight:bold">Active Effects</div>
          <div id="unitEffects" class="small effectPills" style="margin-top:6px; line-height:1.4">None</div>
        </div>
        <div id="allyControlPanel" style="display:none; margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:8px;">
          <div class="small" style="font-weight:bold">Behavior</div>
          <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
            <button id="btnAllyAggressive" class="secondary" style="flex:1; font-size:10px; padding:4px;">Aggressive</button>
            <button id="btnAllyNeutral" class="secondary" style="flex:1; font-size:10px; padding:4px;">Neutral</button>
          </div>
          <div id="allyBehaviorDesc" class="small" style="margin-top:6px; color:#999; line-height:1.35;">
            <b>Non-Group Allies:</b> Aggressive detours to fight; Neutral focuses on objectives and only fights nearby threats.
          </div>
          <button id="btnEditTarget" style="width:100%; margin-top:6px; padding:6px; font-size:10px;" class="secondary">Edit (requires group)</button>
          <button id="btnInviteToGroup" style="width:100%; margin-top:6px; padding:6px; font-size:10px;">Invite to Group</button>
        </div>
      </div>
    </div>

    <!-- Group Display Panel (top-right under minimap, shows group member health) -->
    <div id="groupPanel" style="position:fixed; right:10px; top:140px; background:rgba(20,20,20,0.8); border:1px solid rgba(122,162,255,0.3); border-radius:4px; padding:8px; z-index:150; display:none; pointer-events:auto; min-width:200px; max-width:220px;">
      <div class="small" style="font-weight:bold; color:rgba(255,255,255,0.8); margin-bottom:6px;">Group (<span id="groupPanelCount">0</span>)</div>
      <div id="groupPanelList" style="display:flex; flex-direction:column; gap:6px; font-size:11px;"></div>
    </div>
  `;

  const ui = bindUI(state);
  state.ui = ui;
  try{ window.ui = ui; }catch{}
  // Debug: expose XP elements
  try{ 
    window.xpDebug = { 
      xpText: ui.xpText, 
      xpFill: ui.xpFill, 
      levelNumber: ui.levelNumber,
      xpContainer: document.getElementById('xpContainer')
    };
    console.log('XP Debug:', {
      xpText: ui.xpText ? 'Found' : 'NULL',
      xpFill: ui.xpFill ? 'Found' : 'NULL',
      levelNumber: ui.levelNumber ? 'Found' : 'NULL',
      xpContainer: document.getElementById('xpContainer') ? 'Found' : 'NULL'
    });
  }catch(e){ console.error('XP debug setup failed', e); }
  ui.renderAbilityBar();
  ui.renderInventory();
  return ui;
}

function bindUI(state){
  const $ = (id)=>document.getElementById(id);
  const ui={
      mainMenu: $('mainMenu'), heroNameInput: $('heroNameInput'), btnNewGame: $('btnNewGame'), btnLoadGame: $('btnLoadGame'),
      saveOverlay: $('saveOverlay'), saveClose: $('saveClose'), saveList: $('saveList'), selSaveMeta: $('selSaveMeta'), saveNameInput: $('saveNameInput'), btnLoadSelected: $('btnLoadSelected'), btnOverwriteSelected: $('btnOverwriteSelected'), btnDeleteSelected: $('btnDeleteSelected'), btnSaveNew: $('btnSaveNew'),
    enemyCount:$('enemyCount'),
    allyCount:$('allyCount'),
    pPts:$('pPts'),
    ePts:$('ePts'),
    targetPts:$('targetPts'),
    gold:$('gold'),
    lvl:$('lvl'),
    spText:$('spText'),
    hpFill:$('hpFill'), manaFill:$('manaFill'), stamFill:$('stamFill'), shieldFill:$('shieldFill'), xpFill:$('xpFill'),
    hpText:$('hpText'), manaText:$('manaText'), stamText:$('stamText'), xpText:$('xpText'),
    heroPortrait:$('heroPortrait'), heroPortraitImg:$('heroPortraitImg'),
    hintText:$('hintText'),
    hud:$('hud'),
    bottomBar:$('bottomBar'),
    b_hpFill:$('b_hpFill'), b_manaFill:$('b_manaFill'), b_stamFill:$('b_stamFill'),
    b_hpText:$('b_hpText'), b_manaText:$('b_manaText'), b_stamText:$('b_stamText'),
    b_hpFill:$('b_hpFill'), b_manaFill:$('b_manaFill'), b_stamFill:$('b_stamFill'),
    b_hpText:$('b_hpText'), b_manaText:$('b_manaText'), b_stamText:$('b_stamText'),
    levelNumber:$('levelNumber'),
    levelTabLevelNum:$('levelTabLevelNum'), levelTabXpFill:$('levelTabXpFill'), levelTabXpText:$('levelTabXpText'),
    levelTabCurrentLevel:$('levelTabCurrentLevel'), levelTabStatPoints:$('levelTabStatPoints'), levelTabSkillPoints:$('levelTabSkillPoints'),
    levelUpNotification:$('levelUpNotification'), levelUpText:$('levelUpText'), levelUpNumber:$('levelUpNumber'),
    bombNotification:$('bombNotification'), bombText:$('bombText'), bombNumber:$('bombNumber'),
    killCounterValue:$('killCounterValue'), biggestBombValue:$('biggestBombValue'),
    emperorNotification:$('emperorNotification'), emperorText:$('emperorText'), emperorSubtext:$('emperorSubtext'),
    toastEl:$('toast'),
    abilBar:$('abilBar'),
    buffIconsHud:$('buffIconsHud'),
    invOverlay:$('invOverlay'),
    invGrid:$('invGrid'),
    invClose:$('invClose'),
    skillSlots:$('skillSlots'),
    skillCategories:$('skillCategories'),
    loadoutsList:$('loadoutsList'),
    abilityDetails:$('abilityDetails'),
    passiveList:$('passiveList'),
    combatBuffsList:$('combatBuffsList'),
    sustainBuffsList:$('sustainBuffsList'),
    mobilityBuffsList:$('mobilityBuffsList'),
    utilityBuffsList:$('utilityBuffsList'),
    debuffsList:$('debuffsList'),
    activeEffectsIcons:$('activeEffectsIcons'),
    selName:$('selName'),
    selDesc:$('selDesc'),
    statsTable:$('statsTable'),
    useEquipBtn:$('useEquipBtn'),
    dropBtn:$('dropBtn'),
    dropAllBtn:$('dropAllBtn'),
    equipCircle:$('equipCircle'), equipExtras:$('equipExtras'), weaponSlot:$('weaponSlot'),
    escOverlay:$('escOverlay'),
    escMenuMain:$('escMenuMain'),
    escMenuOptions:$('escMenuOptions'),
    btnSelectHero:$('btnSelectHero'),
    btnResume:$('btnResume'),
    btnSave:$('btnSave'),
    btnLoad:$('btnLoad'),
    btnOptions:$('btnOptions'),
    btnBackToMenu:$('btnBackToMenu'),
    btnApplyOpts:$('btnApplyOpts'),
    btnResetBinds:$('btnResetBinds'),
    trackFriendlyAbilities:$('trackFriendlyAbilities'),
    trackEnemyAbilities:$('trackEnemyAbilities'),
    showAbilityDisplay:$('showAbilityDisplay'),
    enablePlayerLog:$('enablePlayerLog'),
    enableCombatLog:$('enableCombatLog'),
    enableDebugLog:$('enableDebugLog'),
    enableDamageLog:$('enableDamageLog'),
    enableAbilityLog:$('enableAbilityLog'),
    enableEffectLog:$('enableEffectLog'),
    enableAIBehaviorLog:$('enableAIBehaviorLog'),
    enableConsoleLog:$('enableConsoleLog'),
    enableGuardBallLogging:$('enableGuardBallLogging'),
    btnDownloadAllLogs:$('btnDownloadAllLogs'),
    optShowAim:$('optShowAim'),
    optShowDebugAI:$('optShowDebugAI'),
    optShowDebugAIEnemies:$('optShowDebugAIEnemies'),
    optShowAbilityDisplay:$('optShowAbilityDisplay'),
    optCameraFreeView:$('optCameraFreeView'),
      optCameraFollowChar:$('optCameraFollowChar'),
      optCameraEdgeStrict:$('optCameraEdgeStrict'),
    bindList:$('bindList'),
    rebindHint:$('rebindHint'),
    baseActionsOverlay:$('baseActionsOverlay'),
    btnOpenMarketplace:$('btnOpenMarketplace'),
    btnOpenGarrison:$('btnOpenGarrison'),
    btnCloseBaseActions:$('btnCloseBaseActions'),
    marketplaceOverlay:$('marketplaceOverlay'),
    marketConfirm:$('marketConfirm'),
    marketInspect:$('marketInspect'),
    sellInspect:$('sellInspect'),
    btnCloseMarket:$('btnCloseMarket'),
    shopItems:$('shopItems'),
    sellItems:$('sellItems'),
    marketGold:$('marketGold'),
    garrisonOverlay:$('garrisonOverlay'),
    btnCloseGarrison:$('btnCloseGarrison'),
    garrisonLocationList:$('garrisonLocationList'),
    garrisonDetailList:$('garrisonDetailList'),
    garrisonAllyCount:$('garrisonAllyCount'),
    btnCancelAllGarrison:$('btnCancelAllGarrison'),
    btnCancelAllGarrison:$('btnCancelAllGarrison'),
    optAutoPickup:$('optAutoPickup'),
    endOverlay:$('endOverlay'),
    endTitle:$('endTitle'),
    endText:$('endText'),
    btnRestart:$('btnRestart'),
    btnOpenInv2:$('btnOpenInv2'),
    invArmorStars:$('invArmorStars'), invArmorText:$('invArmorText'),
    lvlPts:$('lvlPts'),
    hpInc:$('hpInc'), hpDec:$('hpDec'), manaInc:$('manaInc'), manaDec:$('manaDec'), stamInc:$('stamInc'), stamDec:$('stamDec'),
    strInc:$('strInc'), strDec:$('strDec'), defInc:$('defInc'), defDec:$('defDec'),
    hpSpend:$('hpSpend'), manaSpend:$('manaSpend'), stamSpend:$('stamSpend'), strSpend:$('strSpend'), defSpend:$('defSpend'),
    levelSwitchToPlayer:$('levelSwitchToPlayer'),
    levelCharName:$('levelCharName'), levelCharRole:$('levelCharRole'), levelArmorRating:$('levelArmorRating'),
    levelArmorStars:$('levelArmorStars'),
    levelHpValue:$('levelHpValue'), levelManaValue:$('levelManaValue'), levelStamValue:$('levelStamValue'),
    levelHpBar:$('levelHpBar'), levelManaBar:$('levelManaBar'), levelStamBar:$('levelStamBar'),
    levelStatsList:$('levelStatsList'), levelEffectsList:$('levelEffectsList'),
    levelPointsDisplay:$('levelPointsDisplay'),
    heroPortrait:$('heroPortrait'), heroClassName:$('heroClassName'), heroLevel:$('heroLevel'),
    unitInspectionPanel: $('unitInspectionPanel'), unitInspectionContent: $('unitInspectionContent'), closeUnitPanel: $('closeUnitPanel'),
    unitName: $('unitName'), unitTeam: $('unitTeam'), unitHP: $('unitHP'), unitDMG: $('unitDMG'), unitSpeed: $('unitSpeed'), unitLevel: $('unitLevel'),
    unitAbilities: $('unitAbilities'),
    unitEffects: $('unitEffects'),
    allyControlPanel: $('allyControlPanel'), btnAllyAggressive: $('btnAllyAggressive'), btnAllyNeutral: $('btnAllyNeutral'), allyBehaviorDesc: $('allyBehaviorDesc'), btnEditTarget: $('btnEditTarget'), btnInviteToGroup: $('btnInviteToGroup'),
    // Group UI elements
    groupPanel: $('groupPanel'), groupPanelCount: $('groupPanelCount'), groupPanelList: $('groupPanelList'),
    groupMemberCount: $('groupMemberCount'), groupMembersList: $('groupMembersList'), groupMemberDetails: $('groupMemberDetails'),
    allyList: $('allyList'), allyDetails: $('allyDetails'), allyTabCount: $('allyTabCount'),
    // Slot UI elements
    slotSP: $('slotSP'), slotPlayerLevel: $('slotPlayerLevel'), slotZoneTier: $('slotZoneTier'),
    guardSlotList: $('guardSlotList'), allySlotList: $('allySlotList'),
    invRight: $('invRight')
  };
  // Helper to get item image path
  const getItemImage = (item) => {
    return getItemIcon(item); // Use the new comprehensive icon mapping
  };
  // Expose getItemImage for use in other modules (e.g., weapon preview)
  ui.getItemImage = getItemImage;

  // Sticky header shadow on inventory scroll
  ui._bindInvRightScroll = ()=>{
    if(!ui.invRight || ui._invRightBound) return;
    const updateShadow = ()=>{
      try{
        const scrolled = (ui.invRight.scrollTop||0) > 0;
        ui.invRight.classList.toggle('scrolled', scrolled);
      }catch{}
    };
    ui.invRight.addEventListener('scroll', updateShadow);
    ui._invRightBound = true;
    updateShadow();
  };

  ui.targetPts.textContent = state.campaign.targetPoints;

  // Weapon preview overlay click-to-close
  const weaponPreview = document.getElementById('weaponPreview');
  if(weaponPreview){
    weaponPreview.addEventListener('click', (e) => {
      // Close preview when clicking the overlay (not the image)
      if(e.target === weaponPreview || e.target.id === 'weaponPreviewTitle'){
        weaponPreview.style.display = 'none';
      }
    });
  }

  // HUD close button handler
  const btnCloseHUD = document.getElementById('btnCloseHUD');
  if(btnCloseHUD){
    btnCloseHUD.addEventListener('click', ()=>{
      ui.toggleHud(false);
    });
    // Add hover effect
    btnCloseHUD.addEventListener('mouseover', ()=>{
      btnCloseHUD.style.color = 'rgba(255,255,255,1)';
    });
    btnCloseHUD.addEventListener('mouseout', ()=>{
      btnCloseHUD.style.color = 'rgba(255,255,255,0.6)';
    });
  }

  // Debug: Check if market tab elements exist
  console.log('Market tab elements check:', {
    marketTabShop: !!ui.marketTabShop,
    marketTabAllies: !!ui.marketTabAllies,
    allyLocationList: !!ui.allyLocationList,
    allyDetailList: !!ui.allyDetailList
  });

  const goldIcon = '<span class="gold-icon">💰</span>';
  const formatGold = (amt)=>`${goldIcon}<span class="gold-amount">${Math.max(0, Math.floor(amt||0))}</span>`;
  ui.updateGoldDisplay = ()=>{
    if(ui.gold) ui.gold.innerHTML = formatGold(state.player.gold);
    if(ui.marketGold) ui.marketGold.innerHTML = formatGold(state.player.gold);
  };

  ui.updateInventorySelection = ()=>{
    const isGroupMemberMode = state.groupMemberInventoryMode;
    const equipSet = isGroupMemberMode ? state.group.settings[state.groupMemberInventoryMode]?.equipment : state.player.equip;

    // Highlight inventory grid selection without rebuilding DOM
    if(ui.invGrid){
      const children = ui.invGrid.children || [];
      for(let j=0;j<children.length;j++){
        const el = children[j];
        if(!el || !el.style) continue;
        el.style.outline = (j === state.selectedIndex) ? '2px solid rgba(122,162,255,.55)' : 'none';
      }
    }

    // Update selected details (inventory item or equipped item)
    const selectedItem = (state.selectedIndex>=0 && state.selectedIndex<state.inventory.length)
      ? state.inventory[state.selectedIndex]
      : (state.selectedEquipSlot && equipSet ? equipSet[state.selectedEquipSlot] : null);

    if(selectedItem){
      const equipTag = state.selectedEquipSlot ? ' (Equipped)' : '';
      ui.selName.textContent=`${selectedItem.name}${equipTag}`;
      ui.selName.className=rarityClass(selectedItem.rarity.key);
      const countText = selectedItem.kind === 'potion' ? ` (x${selectedItem.count || 1})` : '';
      ui.selDesc.innerHTML=selectedItem.desc + countText + `<br/><span class="small">Rarity: <b class="${rarityClass(selectedItem.rarity.key)}">${selectedItem.rarity.name}</b></span>`;
    } else {
      ui.selName.textContent='None';
      ui.selName.className='';
      ui.selDesc.textContent='Click an item.';
    }

    ui.renderStats();
  };

  // --- Save manager helpers ---
  function listSaves(){ try{ return storageGet(STORAGE_KEYS.SAVES) || []; }catch{ return []; } }
  function writeSaves(arr){ try{ storageSet(STORAGE_KEYS.SAVES, arr); return true; }catch(e){ console.warn('[SAVE] Storage full or unavailable:', e.message); return false; } }
  function saveNew(name){ 
    try{
      const data=exportSave(state); 
      if(!data || !data.player){ console.error('Invalid save data'); return false; }
      const id=Date.now(); 
      const created=new Date().toISOString(); 
      const arr=listSaves(); 
      arr.push({id,name,created,data}); 
      return writeSaves(arr);
    }catch(e){ 
      console.error('Save failed:', e); 
      return false; 
    }
  }
  function overwrite(id){ 
    try{
      const data=exportSave(state);
      if(!data || !data.player){ console.error('Invalid save data'); return false; }
      const arr=listSaves(); 
      const idx=arr.findIndex(s=>s.id===id); 
      if(idx!==-1){ 
        arr[idx].data=data; 
        arr[idx].created=new Date().toISOString(); 
        return writeSaves(arr);
      }
      return false;
    }catch(e){ 
      console.error('Overwrite failed:', e); 
      return false; 
    }
  }
  function delSave(id){ const arr=listSaves().filter(s=>s.id!==id); return writeSaves(arr); }
  
  // Auto-save functions
  function getAutoSaveId(){ return 'AUTO_SAVE_SLOT'; }
  function autoSave(){
    try{
      const id = getAutoSaveId();
      const data = exportSave(state);
      if(!data || !data.player){ 
        console.error('[AUTO-SAVE] Invalid save data');
        return;
      }
      const created = new Date().toISOString();
      const name = `Auto Save - ${state.player?.name || 'Hero'}`;
      const arr = listSaves();
      const existing = arr.findIndex(s => s.id === id);
      if(existing !== -1){
        arr[existing] = {id, name, created, data};
      } else {
        arr.push({id, name, created, data});
      }
      if(writeSaves(arr)){
        console.log('[AUTO-SAVE] Success at', created);
      } else {
        console.error('[AUTO-SAVE] Failed to write');
      }
    } catch(e){ console.error('Auto save failed:', e); }
  }
  
  function renderSaveList(){ const arr=listSaves(); ui.saveList.innerHTML=''; let selectedId = ui._selectedSaveId; for(const s of arr){ const row=document.createElement('div'); row.className='slot'; row.style.display='flex'; row.style.alignItems='center'; row.style.justifyContent='space-between'; row.style.gap='8px'; row.innerHTML = `<div><b>${s.name||'Unnamed'}</b><div class="small">${s.created}</div></div><div class="small">ID ${s.id}</div>`; row.onclick=()=>{ ui._selectedSaveId=s.id; ui.selSaveMeta.innerHTML = `<b>${s.name||'Unnamed'}</b><br/>${s.created}<br/>ID ${s.id}`; }; if(selectedId===s.id) row.style.outline='2px solid rgba(122,162,255,.7)'; ui.saveList.appendChild(row); } }

  // Helper to make default save name (Hero — local date/time)
  function defaultSaveName(){
    const nm = state.player?.name || 'Hero';
    try{
      return `${nm} — ${new Date().toLocaleString()}`;
    }catch{ return `${nm} — ${new Date().toISOString()}`; }
  }
  // Save overlay toggle: track visibility for ESC handling and pause state
  ui.toggleSaves = (on)=>{
    state.showSaves = !!on;
    ui.saveOverlay.classList.toggle('show', !!on);
    if(on){
      renderSaveList();
      ui.saveNameInput.value = defaultSaveName();
      state.paused = true;
    } else {
      if(!state.showInventory && !state.inMenu && !state.campaignEnded) state.paused=false;
    }
  };
  ui.saveClose.onclick=()=>ui.toggleSaves(false);
  ui.btnSaveNew.onclick=()=>{ 
    const nm = ui.saveNameInput.value || state.player.name || 'Hero'; 
    if(saveNew(nm)){ 
      renderSaveList(); 
      ui.toast('✓ Game saved successfully!');
    } else {
      ui.toast('✗ Save failed! Check console.');
    }
  };
  ui.btnOverwriteSelected.onclick=()=>{ 
    const id=ui._selectedSaveId; 
    if(!id){ ui.toast('Select a save.'); return; } 
    if(overwrite(id)){ 
      renderSaveList(); 
      ui.toast('✓ Save overwritten!');
    } else {
      ui.toast('✗ Overwrite failed!');
    }
  };
  ui.btnDeleteSelected.onclick=()=>{ const id=ui._selectedSaveId; if(!id){ ui.toast('Select a save.'); return; } delSave(id); ui._selectedSaveId=null; ui.selSaveMeta.textContent='None'; renderSaveList(); ui.toast('Deleted.'); };
  ui.btnLoadSelected.onclick=()=>{ const id=ui._selectedSaveId; if(!id){ ui.toast('Select a save.'); return; } const s=listSaves().find(x=>x.id===id); if(!s){ ui.toast('Missing save.'); return; } try{ if(typeof ui.onLoadGame==='function'){ ui.onLoadGame(s.data); } }catch(e){ ui.toast('Load failed.'); } };

  // Hide all game UI until a game starts
  ui.setGameUIVisible = (on)=>{
    try{ ui.hud.style.display = on ? 'block' : 'none'; }catch{}
    try{ ui.bottomBar.style.display = on ? (state.uiHidden?'block':'none') : 'none'; }catch{}
    try{ ui.abilBar.style.display = on ? 'flex' : 'none'; }catch{}
    try{ ui.buffIconsHud.style.display = on ? 'flex' : 'none'; }catch{}
    // ensure overlays are hidden
    try{ ui.invOverlay.classList.remove('show'); ui.escOverlay.classList.remove('show'); ui.endOverlay.classList.remove('show'); }catch{}
  };
  ui.setGameUIVisible(false);

  // Main menu helpers and handlers
  ui.hideMainMenu = ()=> ui.mainMenu.classList.remove('show');
  // Main menu background: use default path; you can override via storage if needed
  try{
    const initBg = storageGet(STORAGE_KEYS.MENU_BG) || getAssetPath('assets/ui/MainMenu.png');
    ui.mainMenu.style.background = `url('${initBg}') center center/105% auto no-repeat #000`;
  }catch(e){}

  // Start and Load buttons (bind immediately, not inside toast)
  ui.btnNewGame.onclick=()=>{
    const nm = ui.heroNameInput.value?.trim() || 'Hero';
    state.player.name = nm;
    // Stop main menu music
    if(state.sounds?.mainMenuMusic && !state.sounds.mainMenuMusic.paused){
      state.sounds.mainMenuMusic.pause();
      state.sounds.mainMenuMusic.currentTime = 0;
    }
    ui.hideMainMenu();
    if(typeof ui.onNewGame==='function'){
      ui.onNewGame(nm);
    } else {
      console.warn('ui.onNewGame not set');
    }
  };
  ui.btnLoadGame.onclick=()=>{ 
    ui.toggleSaves(true); 
  };

  // Toast utility
  ui.toast = (msg, ms=2700)=>{
    ui.toastEl.innerHTML = msg;
    ui.toastEl.classList.add('show');
    clearTimeout(ui.toast._t);
    ui.toast._t = setTimeout(()=>ui.toastEl.classList.remove('show'), ms);
  };
  
  // Level up notification with fade animation
  ui.showLevelUp = (level)=>{
    const notification = ui.levelUpNotification;
    const textEl = ui.levelUpText;
    const numberEl = ui.levelUpNumber;
    
    if(!notification) return;
    
    // Play level up sound
    if(state.sounds?.levelUp){
      const audio = state.sounds.levelUp.cloneNode();
      audio.volume = 0.6;
      audio.play().catch(e => {});
    }
    
    // Reset animation
    notification.style.display = 'block';
    textEl.style.opacity = '0';
    numberEl.style.opacity = '0';
    textEl.textContent = 'LEVEL UP!';
    numberEl.textContent = level;
    
    // Use requestAnimationFrame for smooth fade in
    requestAnimationFrame(() => {
      // Fade in: 0-0.3s
      textEl.style.transition = 'opacity 0.3s ease-in';
      numberEl.style.transition = 'opacity 0.3s ease-in';
      textEl.style.opacity = '1';
      numberEl.style.opacity = '1';
      
      // Fade out: starts at 2.7s, ends at 3s
      setTimeout(() => {
        textEl.style.transition = 'opacity 0.3s ease-out';
        numberEl.style.transition = 'opacity 0.3s ease-out';
        textEl.style.opacity = '0';
        numberEl.style.opacity = '0';
      }, 2700);
      
      // Hide after animation
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    });
  };

  // Bomb notification with fade animation (similar to level up)
  ui.showBomb = (killCount)=>{
    const notification = ui.bombNotification;
    const textEl = ui.bombText;
    const numberEl = ui.bombNumber;
    
    if(!notification) return;
    
    // Play bomb sound
    if(state.sounds?.bombNotification){
      const audio = state.sounds.bombNotification.cloneNode();
      audio.volume = 0.6;
      audio.play().catch(e => {});
    }
    
    // Reset animation
    notification.style.display = 'block';
    textEl.style.opacity = '0';
    numberEl.style.opacity = '0';
    textEl.textContent = 'BOMB!';
    numberEl.textContent = killCount;
    
    // Use requestAnimationFrame for smooth fade in
    requestAnimationFrame(() => {
      // Fade in: 0-0.3s
      textEl.style.transition = 'opacity 0.3s ease-in';
      numberEl.style.transition = 'opacity 0.3s ease-in';
      textEl.style.opacity = '1';
      numberEl.style.opacity = '1';
      
      // Fade out: starts at 2.7s, ends at 3s
      setTimeout(() => {
        textEl.style.transition = 'opacity 0.3s ease-out';
        numberEl.style.transition = 'opacity 0.3s ease-out';
        textEl.style.opacity = '0';
        numberEl.style.opacity = '0';
      }, 2700);
      
      // Hide after animation
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    });
  };

  // Emperor notification with fade animation (same as level up)
  ui.showEmperor = ()=>{
    const notification = ui.emperorNotification;
    const textEl = ui.emperorText;
    const subtextEl = ui.emperorSubtext;
    
    if(!notification) return;
    
    // Play level up sound (same as level up for consistency)
    if(state.sounds?.levelUp){
      const audio = state.sounds.levelUp.cloneNode();
      audio.volume = 0.7;
      audio.play().catch(e => {});
    }
    
    // Reset animation
    notification.style.display = 'block';
    textEl.style.opacity = '0';
    subtextEl.style.opacity = '0';
    textEl.textContent = 'EMPEROR!';
    subtextEl.textContent = '🔱';
    
    // Use requestAnimationFrame for smooth fade in
    requestAnimationFrame(() => {
      // Fade in: 0-0.3s
      textEl.style.transition = 'opacity 0.3s ease-in';
      subtextEl.style.transition = 'opacity 0.3s ease-in';
      textEl.style.opacity = '1';
      subtextEl.style.opacity = '1';
      
      // Fade out: starts at 2.7s, ends at 3s
      setTimeout(() => {
        textEl.style.transition = 'opacity 0.3s ease-out';
        subtextEl.style.transition = 'opacity 0.3s ease-out';
        textEl.style.opacity = '0';
        subtextEl.style.opacity = '0';
      }, 2700);
      
      // Hide after animation
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    });
  };

  // Fighter Card Reveal Animation (2 second cycling + final reveal)
  ui.showFighterCardReveal = (card) => {
    const overlay = document.getElementById('cardRevealOverlay');
    const cycleDiv = document.getElementById('cardRevealCycle');
    const cyclingImg = document.getElementById('cyclingCardImage');
    const finalDisplay = document.getElementById('finalCardDisplay');
    const finalName = document.getElementById('finalCardName');
    const finalStats = document.getElementById('finalCardStats');
    
    if (!overlay) return;
    
    // Only show if actually in a campaign (not in menu or main game world)
    if (!state.campaign || state.inMenu || !state.player) {
      overlay.style.display = 'none';
      return;
    }
    
    // Pause game
    const wasPaused = state.paused;
    state.paused = true;
    
    overlay.style.setProperty('display', 'flex', 'important');
    overlay.style.pointerEvents = 'auto';
    cycleDiv.style.display = 'block';
    finalDisplay.style.display = 'none';
    
    // Use same card format everywhere
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const rarityColors = {common: '#888', uncommon: '#0a0', rare: '#0aa', epic: '#a0a', legendary: '#fa0'};
    
    // Cycle through random cards for 2 seconds with rolling sound
    const cardNames = ['Fire Mage', 'Ice Knight', 'Dark Ranger', 'Holy Paladin', 'Storm Druid', 'Shadow Assassin', 'Void Sorcerer', 'Nature Warden'];
    let cycleCount = 0;
    
    // Play rolling sound: light attack at 200% speed
    if (state.sounds?.meleeAttack) {
      try {
        const rollSound = new Audio(state.sounds.meleeAttack.src);
        rollSound.playbackRate = 2.0;
        rollSound.volume = 0.4;
        rollSound.play().catch(e => {});
      } catch (e) {}
    }
    
    const cycleInterval = setInterval(() => {
      const randomCard = cardNames[Math.floor(Math.random() * cardNames.length)];
      const randomRarity = rarities[Math.floor(Math.random() * rarities.length)];
      const randomRarityColor = rarityColors[randomRarity];
      cyclingImg.innerHTML = `
        <div style="
          background: rgba(212,175,55,0.2);
          border: 2px solid ${randomRarityColor};
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          aspect-ratio: 120/160;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: white;
        ">
          <div style="font-size: 10px; color: ${randomRarityColor}; font-weight: bold; margin-bottom: 4px;">${randomRarity.toUpperCase()}</div>
          <div style="font-size: 14px; font-weight: bold; color: #d4af37; word-break: break-word; margin-bottom: 6px;">${randomCard}</div>
          <div style="font-size: 9px; color: #ffd700;">✦ Rolling...</div>
        </div>
      `;
      cycleCount++;
    }, 200);
    
    // Stop cycling and show final card after 2 seconds
    setTimeout(() => {
      clearInterval(cycleInterval);
      cycleDiv.style.display = 'none';
      finalDisplay.style.display = 'block';
      
      const rarityColor = rarityColors[card.rarity];
      const rarityBgOpacity = {common: 0.1, uncommon: 0.15, rare: 0.2, epic: 0.25, legendary: 0.3};
      const ratingStars = '★'.repeat(card.rating) + '☆'.repeat(5 - card.rating);
      
      finalStats.innerHTML = `
        <div style="
          background: rgba(212,175,55,${rarityBgOpacity[card.rarity]});
          border: 2px solid ${rarityColor};
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          aspect-ratio: 120/160;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: white;
          margin: 0 auto;
        ">
          <div style="font-size: 10px; color: ${rarityColor}; font-weight: bold; margin-bottom: 4px;">${card.rarity.toUpperCase()}</div>
          <div style="font-size: 9px; color: #6cf; margin-bottom: 4px;">L${card.level}</div>
          <div style="font-size: 11px; font-weight: bold; color: #d4af37; margin-bottom: 6px; word-break: break-word;">${card.name}</div>
          <div style="font-size: 8px; color: #ccc;">Role: ${card.role}</div>
          <div style="font-size: 9px; color: #ffd700; margin-top: 4px;">${ratingStars}</div>
        </div>
      `;
      
      finalName.textContent = '';
      
      // Play level up sound
      if (state.sounds?.levelUp) {
        try {
          state.sounds.levelUp.currentTime = 0;
          state.sounds.levelUp.play().catch(e => {});
        } catch (e) {}
      }
      
      // Auto-hide after 2 more seconds
      setTimeout(() => {
        overlay.style.setProperty('display', 'none', 'important');
        overlay.style.pointerEvents = 'none';
        // Unpause game
        state.paused = wasPaused;
      }, 2000);
    }, 2000);
  };

  // Render fighter cards inventory
  ui.renderFighterCards = () => {
    if (!state.fighterCardInventory) return;
    
    const grid = document.getElementById('fighterCardsGrid');
    const countEl = document.getElementById('cardCount');
    
    if (!grid) return;
    
    let cards = state.fighterCardInventory.cards;
    const maxSlots = 500;
    
    // Sort cards based on current sort mode
    const sortMode = ui.currentCardSort || 'rarity';
    if (sortMode === 'rarity') {
      const rarityRank = {legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1};
      cards = [...cards].sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));
    } else if (sortMode === 'level') {
      cards = [...cards].sort((a, b) => b.level - a.level);
    } else if (sortMode === 'rating') {
      cards = [...cards].sort((a, b) => b.rating - a.rating);
    }
    
    countEl.textContent = `${cards.length} / ${maxSlots}`;
    
    const rarityColors = {common: '#888', uncommon: '#0a0', rare: '#0aa', epic: '#a0a', legendary: '#fa0'};
    const rarityBgOpacity = {common: 0.1, uncommon: 0.15, rare: 0.2, epic: 0.25, legendary: 0.3};
    
    // Build slots - filled cards first, then empty slots
    let html = '';
    
    // Render filled cards - using exact format from Change button picker
    cards.forEach((card, idx) => {
      const rarityColors = {common: '#888', uncommon: '#0a0', rare: '#0aa', epic: '#a0a', legendary: '#fa0'};
      const rarityColor = rarityColors[card.rarity] || '#888';
      const rarityBgOpacity = {common: 0.1, uncommon: 0.15, rare: 0.2, epic: 0.25, legendary: 0.3};
      
      html += `
        <div class="fighter-card-slot" style="
          background: rgba(212,175,55,${rarityBgOpacity[card.rarity]});
          border: 2px solid ${rarityColor};
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          aspect-ratio: 120/160;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 15px ${rarityColor}';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" onclick="ui._showFighterPreview('${card.loadoutId}')">
          <div style="font-size: 10px; color: ${rarityColor}; font-weight: bold; margin-bottom: 4px;">${card.rarity.toUpperCase()}</div>
          <div style="font-size: 9px; color: #6cf; margin-bottom: 4px;">L${card.level}</div>
          <div style="font-size: 11px; font-weight: bold; color: #d4af37; margin-bottom: 6px; word-break: break-word;">${card.name}</div>
          <div style="font-size: 8px; color: #ccc;">Role: ${card.role}</div>
          <div style="font-size: 9px; color: #ffd700; margin-top: 4px;">${'★'.repeat(card.rating)}${'☆'.repeat(5 - card.rating)}</div>
        </div>
      `;
    });
    
    // Render empty slots - same size/format as filled cards
    for (let i = cards.length; i < maxSlots; i++) {
      html += `
        <div class="fighter-card-slot-empty" style="
          background: rgba(50,50,60,0.3);
          border: 2px dashed #666;
          border-radius: 6px;
          padding: 8px;
          text-align: center;
          cursor: not-allowed;
          opacity: 0.5;
          aspect-ratio: 120/160;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #555;
          font-size: 24px;
        ">
          ∅
        </div>
      `;
    }
    
    grid.innerHTML = html;
  };

  // Apply Options button: persist toggles (including AI debug)
  if(ui.btnApplyOpts){
    ui.btnApplyOpts.onclick = ()=>{
      state.options.showAim = !!ui.optShowAim?.checked;
      if(ui.optShowDebugAI) state.options.showDebugAI = !!ui.optShowDebugAI.checked;
      state.options.autoPickup = !!ui.optAutoPickup?.checked;
      // camera mode
      try{
        if(ui.optCameraFollowChar?.checked) state.options.cameraMode = 'follow';
        else if(ui.optCameraFreeView?.checked) state.options.cameraMode = 'freeview';
        else if(ui.optCameraEdgeStrict?.checked) state.options.cameraMode = 'edge_strict';
      }catch{}
      try{ saveJson('orb_rpg_mod_opts', state.options); }catch{}
      ui.toast('Options applied');
    };
  }

  // Tooltip helpers for buff icons (HUD + Tab)
  ui._ensureBuffTooltip = ()=>{
    if(ui.buffTooltipEl) return;
    try{
      const root = document.getElementById('ui-root');
      const tip = document.createElement('div');
      tip.id = 'buffTooltip';
      tip.className = 'buffTooltip';
      root.appendChild(tip);
      ui.buffTooltipEl = tip;
    }catch{}
  };
  ui.showBuffTooltip = (title, desc, targetEl)=>{
    ui._ensureBuffTooltip();
    const tip = ui.buffTooltipEl; if(!tip) return;
    tip.innerHTML = `<div class="title">${title}</div>${desc?`<div class="sub">${desc}</div>`:''}`;
    tip.style.display = 'block';
    // position above target
    try{
      const rect = targetEl.getBoundingClientRect();
      const tw = Math.min(280, tip.offsetWidth || 200);
      const th = tip.offsetHeight || 32;
      let left = rect.left + rect.width/2 - tw/2;
      let top = rect.top - th - 10;
      const vw = window.innerWidth, vh = window.innerHeight;
      if(left < 8) left = 8; if(left + tw > vw - 8) left = vw - tw - 8;
      if(top < 8) top = rect.bottom + 10; // fallback below if not enough space
      tip.style.left = `${Math.round(left)}px`;
      tip.style.top = `${Math.round(top)}px`;
    }catch{}
  };
  ui.hideBuffTooltip = ()=>{ try{ if(ui.buffTooltipEl) ui.buffTooltipEl.style.display='none'; }catch{} };

  function setupBuffTooltipHandlers(container){
    if(!container) return;
    container.addEventListener('mouseover', (e)=>{
      const icon = e.target.closest && e.target.closest('.buffIcon');
      if(!icon) return;
      const title = icon.getAttribute('data-title') || 'Effect';
      const desc = icon.getAttribute('data-desc') || '';
      ui.showBuffTooltip(title, desc, icon);
    });
    container.addEventListener('mousemove', (e)=>{
      const icon = e.target.closest && e.target.closest('.buffIcon');
      if(!icon){ ui.hideBuffTooltip(); return; }
      if(!ui.buffTooltipEl || ui.buffTooltipEl.style.display!=='block') return;
      ui.showBuffTooltip(icon.getAttribute('data-title')||'Effect', icon.getAttribute('data-desc')||'', icon);
    });
    container.addEventListener('mouseleave', ()=>{ ui.hideBuffTooltip(); });
    container.addEventListener('mouseout', (e)=>{
      const toEl = e.relatedTarget;
      // If leaving to outside the container, hide the tooltip
      if(!container.contains(toEl)) ui.hideBuffTooltip();
    });
  }
  setupBuffTooltipHandlers(document.getElementById('buffIconsHud'));
  setupBuffTooltipHandlers(document.getElementById('activeEffectsIcons'));

  ui.toggleInventory = (on)=>{
    state.showInventory=on;
    ui.invOverlay.classList.toggle('show',on);
    if(on){
      state.paused=true; state.selectedIndex=-1; state.selectedEquipSlot=null;
      ui.updateGoldDisplay();
      ui.renderInventory(); ui.renderSkills(); ui.renderLevel(); ui.renderBuffSystem(); ui.renderCampaignTab?.();
      ui._bindInvRightScroll();
      // refresh Campaign tab metrics periodically while inventory is open
      clearInterval(ui._campaignTick);
      ui._campaignTick = setInterval(()=>{ try{ ui.renderCampaignTab?.(); }catch(e){} }, 1500);
    }
    else if(!state.inMenu && !state.campaignEnded) state.paused=false;
    if(!on){ clearInterval(ui._campaignTick); ui._campaignTick = null; }
  };

  // Render Campaign tab contents (team gold, points, flags, avg level, armor rarity)
  ui.renderCampaignTab = ()=>{
    console.log('%c🔔 CAMPAIGN TAB RENDERING - Team Names Updated! ' + new Date().toLocaleTimeString(), 'background: #0f0; color: #000; font-size: 16px; padding: 5px;');
    
    const teams = [
      { key:'player', name:'⭐ Kingdom of Light ⭐', color:'#6cf' },
      { key:'teamA', name:'🔴 Crimson Legion', color:'#f66' },
      { key:'teamB', name:'🟡 Golden Covenant', color:'#fc6' },
      { key:'teamC', name:'🔵 Azure Order', color:'#6af' }
    ];
    const toStars=(tier)=>{
      const t = Math.max(1, Math.min(5, tier||1));
      return '★'.repeat(t) + '☆'.repeat(5-t);
    };
    const getRarityName = (tier) => {
      if(tier === 1) return 'Common';
      if(tier === 2) return 'Uncommon';
      if(tier === 3) return 'Rare';
      if(tier === 4) return 'Epic';
      if(tier === 5) return 'Legendary';
      return 'Common';
    };
    // compute leader/last and assistance eligibility
    const now = state.campaign?.time || 0;
    const cfg = state.rubberband || { gapThreshold:60, closeThreshold:30, baseTickGold:250, interval:300, nonLastScale:0.6, maxAssistPerTeam:10000 };
    const pts = {
      player: state.teamPoints?.player||0,
      teamA: state.teamPoints?.teamA||0,
      teamB: state.teamPoints?.teamB||0,
      teamC: state.teamPoints?.teamC||0
    };
    let leaderKey = 'player', leaderPts = pts.player;
    for(const k of ['player','teamA','teamB','teamC']){ if(pts[k] > leaderPts){ leaderPts = pts[k]; leaderKey = k; } }
    let lastKey = 'player', lastPts = pts.player;
    for(const k of ['player','teamA','teamB','teamC']){ if(pts[k] < lastPts){ lastPts = pts[k]; lastKey = k; } }

    const teamLines=[];
    for(const t of teams){
      const gold = Math.floor((state.factionGold?.[t.key])||0);
      const points = Math.floor((state.teamPoints?.[t.key])||0);
      const flags = (t.key==='player') ? state.sites.filter(s=>s.owner==='player' && s.id.startsWith('site_')).length : state.sites.filter(s=>s.owner===t.key && s.id.startsWith('site_')).length;
      const tier = (state.factionTech?.[t.key])||1;
      const rarityName = getRarityName(tier);
      const enemies = state.enemies.filter(e=>e.team===t.key);
      const avgLevel = enemies.length ? Math.round(enemies.reduce((a,e)=>a+(e.level||1),0)/enemies.length) : 1;
      const gap = (t.key===leaderKey) ? 0 : Math.max(0, leaderPts - (pts[t.key]||0));
      const eligible = t.key!==leaderKey && gap >= (cfg.gapThreshold||60);
      const next = Math.max(0, Math.ceil(((state.rubberbandNext?.[t.key]||0) - now)/60));
      const awarded = Math.floor(state.rubberbandAwarded?.[t.key]||0);
      const assistStr = eligible
        ? `<br><span style="font-size:11px; color:#9f6">↑ Assistance Active</span> • Next Gold Boost: <b>${next}min</b> • Total Assisted: <b>${awarded}g</b>`
        : `<br><span style="font-size:11px; color:#888">No Assistance (${gap < 60 ? 'too close to leader' : 'is leading'})</span>`;
      teamLines.push(`<div style="margin-bottom:8px; font-size:13px; line-height:1.6;"><span style="color:${t.color}; font-weight:900; font-size:14px;">${t.name}</span><br>Gold: <b>${gold}</b> • Points: <b>${points}</b> • Flags: <b>${flags}</b> • Avg Lvl: <b>${avgLevel}</b><br>Equipment: <span style="color:#c9f; font-weight:bold;">${rarityName}</span> ${toStars(tier)} (Tier ${tier})${assistStr}</div>`);
    }
    const capLines=[];
    const getTeamName = (teamKey) => {
      const team = teams.find(t => t.key === teamKey);
      return team ? team.name : teamKey;
    };
    for(const s of state.sites){
      if(!s.id || !s.id.startsWith('site_')) continue;
      if(s._captureTeam){
        const teamName = getTeamName(s._captureTeam);
        capLines.push(`<div style="font-size:12px; margin-bottom:4px;"><b>${s.name}</b> capturing by <span style="color:#f66">${teamName}</span> • Progress: <b>${(Math.round((s.prog||0)*100))}%</b></div>`);
      } else if(s.owner && s.owner!=='player' && s.underAttack){
        const ownerName = getTeamName(s.owner);
        capLines.push(`<div style="font-size:12px; margin-bottom:4px;"><b>${s.name}</b> under attack • Owner: <span style="color:#f66">${ownerName}</span></div>`);
      } else if(s.owner==='player' && s.underAttack){
        capLines.push(`<div style="font-size:12px; margin-bottom:4px;"><b>${s.name}</b> under attack • Owner: <span style="color:#6cf">Kingdom of Light</span></div>`);
      }
    }
    const teamsEl = document.getElementById('campaignTeams');
    const capsEl = document.getElementById('campaignCaptures');
    if(teamsEl) teamsEl.innerHTML = teamLines.join('');
    if(capsEl) capsEl.innerHTML = capLines.length ? capLines.join('') : '<div style="color:#888; font-size:12px;">No active captures.</div>';
    
    // Helper for rarity colors
    const getRarityColor = (rarity) => {
      const colors = {
        common: '#c8c8c8',
        uncommon: '#8fd',
        rare: '#9cf',
        epic: '#c9f',
        legendary: '#f9c'
      };
      return colors[rarity] || '#fff';
    };
    
    // GUARD STATS DISPLAY
    const guardStatsLines = [];
    guardStatsLines.push('<div style="margin-top:16px; padding-top:12px; border-top:1px solid rgba(212,175,55,0.3);">');
    guardStatsLines.push('<div style="font-weight:bold; font-size:14px; color:#d4af37; margin-bottom:8px;">⚔️ Guard Progression</div>');
    
    const playerFlags = state.sites.filter(s => s.owner === 'player' && s.id && s.id.startsWith('site_'));
    
    if(playerFlags.length === 0){
      guardStatsLines.push('<div style="color:#888; font-size:12px;">No flags captured. Capture a flag to deploy guards.</div>');
    } else {
      for(const site of playerFlags){
        const prog = site.guardProgression || { timeHeld: 0, gearRarity: 'common', levels: [1,1,1,1,1] };
        const guards = state.friendlies.filter(f => f.guard && f.homeSiteId === site.id && f.respawnT <= 0);
        const timeHeldMin = Math.floor(prog.timeHeld / 60);
        const timeHeldSec = Math.floor(prog.timeHeld % 60);
        
        // Next upgrade calculation
        const RARITY_PROGRESSION = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const currentIdx = RARITY_PROGRESSION.indexOf(prog.gearRarity);
        const nextRarity = currentIdx < RARITY_PROGRESSION.length - 1 ? RARITY_PROGRESSION[currentIdx + 1] : null;
        const timeForNext = (currentIdx + 1) * 300; // 5 min intervals
        const timeUntilUpgrade = nextRarity ? Math.max(0, timeForNext - prog.timeHeld) : 0;
        const minUntilUpgrade = Math.floor(timeUntilUpgrade / 60);
        const secUntilUpgrade = Math.floor(timeUntilUpgrade % 60);
        
        const rarityColor = getRarityColor(prog.gearRarity);
        const composition = ['Mage Healer', 'Mage Healer', 'Warrior DPS', 'Knight DPS', 'Warden DPS'];
        
        guardStatsLines.push(`<div style="margin-bottom:12px; padding:8px; background:rgba(0,0,0,0.3); border-left:3px solid #d4af37; font-size:12px; line-height:1.5;">`);
        guardStatsLines.push(`<div style="font-weight:bold; font-size:13px; color:#fff; margin-bottom:4px;">📍 ${site.name}</div>`);
        guardStatsLines.push(`<div style="color:#aaa;">⏱️ Time Held: <b>${timeHeldMin}m ${timeHeldSec}s</b></div>`);
        guardStatsLines.push(`<div style="color:#aaa;">🛡️ Current Gear: <span style="color:${rarityColor}; font-weight:bold;">${prog.gearRarity.toUpperCase()}</span></div>`);
        
        if(nextRarity){
          const nextColor = getRarityColor(nextRarity);
          guardStatsLines.push(`<div style="color:#9f6; font-size:11px;">⬆️ Next Upgrade: <span style="color:${nextColor}; font-weight:bold;">${nextRarity.toUpperCase()}</span> in <b>${minUntilUpgrade}m ${secUntilUpgrade}s</b></div>`);
        } else {
          guardStatsLines.push(`<div style="color:#f9c; font-size:11px;">⭐ MAX GEAR TIER (LEGENDARY)</div>`);
        }
        
        guardStatsLines.push(`<div style="margin-top:6px; color:#aaa; font-weight:bold;">⚔️ Guards (${guards.length}/5):</div>`);
        
        if(guards.length === 0){
          guardStatsLines.push(`<div style="color:#f66; font-size:11px; margin-left:8px;">⚠️ All guards defeated - will respawn</div>`);
        } else {
          for(let i = 0; i < 5; i++){
            const guard = guards.find(g => g.guardIndex === i);
            const guardClass = composition[i];
            const level = guard ? guard.level : (prog.levels[i] || 1);
            
            if(guard){
              const hpPct = Math.round((guard.hp / guard.maxHp) * 100);
              const hpColor = hpPct > 66 ? '#6f6' : hpPct > 33 ? '#fc6' : '#f66';
              guardStatsLines.push(`<div style="margin-left:8px; font-size:11px;"><span style="color:#6cf;">${guardClass}</span> <b>Level ${level}</b> - HP: <span style="color:${hpColor}; font-weight:bold;">${hpPct}%</span> <span style="color:#888">(${guard.hp}/${guard.maxHp})</span></div>`);
            } else {
              guardStatsLines.push(`<div style="margin-left:8px; font-size:11px; color:#888;">${guardClass} <b>Level ${level}</b> - <span style="color:#f66">💀 Defeated</span></div>`);
            }
          }
        }
        
        guardStatsLines.push(`</div>`);
      }
    }
    
    guardStatsLines.push('</div>');
    
    // EMPEROR STATUS DISPLAY (only show when player is emperor)
    if(state.emperorTeam === 'player'){
      const emperorStatsLines = [];
      emperorStatsLines.push('<div style="margin-top:16px; padding:12px; border:2px solid #ffd700; border-radius:6px; background:linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,193,7,0.05) 100%); box-shadow: 0 0 20px rgba(255,215,0,0.3), inset 0 0 15px rgba(255,215,0,0.1);">');
      emperorStatsLines.push('<div style="font-weight:bold; font-size:16px; color:#ffd700; margin-bottom:8px; text-shadow: 0 0 10px rgba(255,215,0,0.6); font-style:italic;">👑 POWER OF THE EMPEROR 👑</div>');
      emperorStatsLines.push('<div style="font-size:12px; line-height:1.8; color:#f0e68c;">');
      emperorStatsLines.push('<div style="margin-bottom:6px;"><b style="color:#ffd700;">🔱 Divine Bonuses Applied:</b></div>');
      emperorStatsLines.push('<div style="margin-left:12px; color:#ffeb3b;">• <b>HP:</b> Tripled (3x multiplier)</div>');
      emperorStatsLines.push('<div style="margin-left:12px; color:#ffeb3b;">• <b>Mana:</b> Tripled (3x multiplier)</div>');
      emperorStatsLines.push('<div style="margin-left:12px; color:#ffeb3b;">• <b>Stamina:</b> Tripled (3x multiplier)</div>');
      emperorStatsLines.push('<div style="margin-left:12px; color:#ffeb3b;">• <b>Ability Cooldowns:</b> 50% Reduction (abilities cast 2x faster)</div>');
      emperorStatsLines.push('<div style="margin-top:8px; margin-bottom:6px;"><b style="color:#ffd700;">⚔️ Strategic Advantage:</b></div>');
      emperorStatsLines.push('<div style="margin-left:12px; color:#ffeb3b;">• All enemy teams are now <span style="color:#6cf; font-weight:bold;">ALLIED</span> with each other</div>');
      emperorStatsLines.push('<div style="margin-left:12px; color:#ffeb3b;">• Enemies only attack YOUR TEAM and your flags</div>');
      emperorStatsLines.push('<div style="margin-left:12px; color:#ffeb3b;">• Emperor status lost if you lose ALL flags</div>');
      emperorStatsLines.push('<div style="margin-top:8px;"><b style="color:#ffd700;">🎖️ Victory:</b> Defend your throne!</div>');
      emperorStatsLines.push('</div></div>');
      if(teamsEl){
        teamsEl.innerHTML += emperorStatsLines.join('');
      }
    }
    
    // Append guard stats to team display
    if(teamsEl){
      teamsEl.innerHTML += guardStatsLines.join('');
    }
  };

  ui.toggleBaseActions = (on)=>{
    state.showBaseActions = on;
    ui.baseActionsOverlay.classList.toggle('show', on);
    if(on){
      state.paused = true;
    } else {
      if(!state.showInventory && !state.inMenu && !state.campaignEnded && !state.showMarketplace && !state.showGarrison) state.paused = false;
    }
  };

  ui.toggleMarketplace = (on)=>{
    state.showMarketplace=on;
    ui.marketplaceOverlay.classList.toggle('show',on);
    if(on){
      state.paused=true;
      ui.updateGoldDisplay();
      if(ui.marketConfirm) ui.marketConfirm.innerHTML='';
      if(ui.marketInspect) ui.marketInspect.innerHTML='Select an item to view its stats.';
      if(ui.sellInspect) ui.sellInspect.innerHTML='Click an item to view stats and sell value.';
      ui.renderShop();
      ui.renderSellItems();
    } else {
      if(!state.showInventory && !state.inMenu && !state.campaignEnded && !state.showGarrison && !state.showBaseActions) state.paused=false;
    }
  };
  
  ui.toggleGarrison = (on)=>{
    state.showGarrison = on;
    ui.garrisonOverlay.classList.toggle('show', on);
    if(on){
      state.paused = true;
      try {
        ui.renderGarrison();
      } catch(err) {
        console.error('[toggleGarrison] renderGarrison error:', err);
      }
    } else {
      if(!state.showInventory && !state.inMenu && !state.campaignEnded && !state.showMarketplace && !state.showBaseActions) state.paused = false;
    }
  };
  
  ui.renderGarrison = ()=>{
    try {
      if(!ui.garrisonLocationList || !ui.garrisonDetailList) {
        console.error('Garrison UI elements not found!');
        return;
      }
    
      // Collect all player-owned sites (home + captured flags)
      const sites = [];
      const homeBase = state.sites?.find(s => s.id === 'player_home');
      if(homeBase) sites.push({ ...homeBase, name: 'Home Base', isHome: true });
      
      if(state.sites){
        for(const s of state.sites){
          if(s.owner === 'player' && s.id && s.id.startsWith('site_') && s !== homeBase){
            sites.push({ ...s, name: s.name || 'Captured Flag', isHome: false });
          }
        }
      }
      
      // Render location list showing garrison assignments
      if(sites.length === 0){
        ui.garrisonLocationList.innerHTML = '<div class="small" style="color:#999; padding:12px; text-align:center;">No bases or flags captured yet.</div>';
      } else {
        let locHtml = '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
        for(const site of sites){
          const garrisoned = (state.friendlies || []).filter(f => f.garrisonSiteId === site.id);
          const nearby = (state.friendlies || []).filter(f => !f.dead && !f.garrisonSiteId && Math.hypot(f.x - site.x, f.y - site.y) <= 100);
          const available = (state.friendlies || []).filter(f => !f.dead && !f.garrisonSiteId && !f.guard);
          locHtml += `
            <div style="flex:1; min-width:140px; padding:8px; background:rgba(75,107,200,0.15); border:1px solid rgba(75,107,200,0.3); border-radius:4px;">
              <div style="font-weight:bold; font-size:12px; color:#fff;">${site.isHome ? '🏠' : '🚩'} ${site.name}</div>
              <div style="font-size:10px; color:#6af; margin-top:2px;">⚔️ Garrisoned: ${garrisoned.length}</div>
              <div style="font-size:10px; color:#aaa;">📍 Nearby: ${nearby.length}</div>
              ${available.length > 0 ? `
                <button class="assign-all-btn" data-site-id="${site.id}" data-site-name="${site.name}"
                        style="margin-top:6px; width:100%; padding:4px; font-size:10px; background:rgba(75,200,107,0.2); border:1px solid rgba(75,200,107,0.4); color:#7fa; cursor:pointer; border-radius:3px;">
                  📋 Assign All (${available.length})
                </button>
              ` : ''}
            </div>
          `;
        }
        locHtml += '</div>';
        ui.garrisonLocationList.innerHTML = locHtml;
        
        // Add click handlers for assign all buttons
        const assignAllBtns = ui.garrisonLocationList.querySelectorAll('.assign-all-btn');
        assignAllBtns.forEach(btn => {
          btn.onclick = ()=>{
            const siteId = btn.dataset.siteId;
            const siteName = btn.dataset.siteName;
            const available = (state.friendlies || []).filter(f => !f.dead && !f.garrisonSiteId && !f.guard);
            
            let count = 0;
            for(const ally of available){
              ally.garrisonSiteId = siteId;
              // Clear old garrison position to force recalculation
              delete ally._garrisonX;
              delete ally._garrisonY;
              delete ally._garrisonSlot;
              count++;
            }
            
            ui.toast(`Assigned ${count} allies to garrison ${siteName}`);
            ui.renderGarrison();
          };
        });
      }
      
      // Setup cancel all button
      if(ui.btnCancelAllGarrison){
        ui.btnCancelAllGarrison.onclick = ()=>{
          let count = 0;
          for(const f of state.friendlies || []){
            if(f.garrisonSiteId){
              delete f.garrisonSiteId;
              count++;
            }
          }
          ui.toast(`Cancelled ${count} garrison assignments`);
          ui.renderGarrison();
        };
      }
      
      // Render individual ally list
      const allies = (state.friendlies || []).filter(f => !f.dead && !f.guard);
      if(ui.garrisonAllyCount) ui.garrisonAllyCount.textContent = allies.length;
      
      if(allies.length === 0){
        ui.garrisonDetailList.innerHTML = '<div class="small" style="color:#999; padding:20px; text-align:center;">No allies recruited yet.</div>';
        return;
      }
      
      let allyHtml = '';
      for(let i = 0; i < allies.length; i++){
        const ally = allies[i];
        const allyName = ally.name || `Fighter ${i+1}`;
        const className = ally.class || 'Warrior';
        const level = ally.level || 1;
        const hp = Math.round(ally.hp || 0);
        const maxHp = Math.round(ally.maxHp || 100);
        const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
        
        // Determine status
        let status = 'Roaming';
        let statusColor = '#999';
        if(ally.garrisonSiteId){
          const garrisonSite = sites.find(s => s.id === ally.garrisonSiteId);
          if(garrisonSite){
            status = `⚔️ Garrisoned at ${garrisonSite.name}`;
            statusColor = '#6af';
          } else {
            // Site no longer exists or not player-owned
            delete ally.garrisonSiteId;
            status = 'Roaming';
          }
        } else {
          for(const site of sites){
            const dist = Math.hypot(ally.x - site.x, ally.y - site.y);
            if(dist <= 100){
              status = `📍 Near ${site.name}`;
              statusColor = '#aaa';
              break;
            }
          }
        }
        
        allyHtml += `
          <div class="box" style="margin-bottom:8px; padding:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div>
                <div style="font-weight:bold; font-size:13px; color:var(--player);">${allyName}</div>
                <div style="font-size:11px; color:#aaa;">Lvl ${level} ${className}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px; color:${statusColor};">${status}</div>
                <div style="font-size:11px; color:${hpPct > 50 ? '#5f5' : hpPct > 25 ? '#fa5' : '#f55'};">HP: ${hp}/${maxHp}</div>
              </div>
            </div>
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
        `;
        
        // If garrisoned, show cancel button
        if(ally.garrisonSiteId){
          allyHtml += `
            <button class="cancel-garrison-btn" data-ally-idx="${i}"
                    style="flex:1; padding:4px 8px; font-size:10px; background:rgba(255,85,85,0.2); border:1px solid rgba(255,85,85,0.4); color:#f55; cursor:pointer; border-radius:3px;">
              ✕ Cancel Garrison
            </button>
          `;
        } else {
          // Show "Garrison at" buttons for each location
          for(const site of sites){
            allyHtml += `
              <button class="garrison-ally-btn" data-ally-idx="${i}" data-site-id="${site.id}" data-site-name="${site.name}"
                      style="flex:1; min-width:80px; padding:4px 8px; font-size:10px; background:rgba(75,107,200,0.2); border:1px solid rgba(75,107,200,0.4); color:#7af; cursor:pointer; border-radius:3px;">
                ⚔️ ${site.isHome ? '🏠' : '🚩'} ${site.name}
              </button>
            `;
          }
        }
        
        allyHtml += `
            </div>
          </div>
        `;
      }
      
      ui.garrisonDetailList.innerHTML = allyHtml;
      
      // Add click handlers for garrison buttons
      const garrisonBtns = ui.garrisonDetailList.querySelectorAll('.garrison-ally-btn');
      garrisonBtns.forEach(btn => {
        btn.onclick = ()=>{
          const idx = parseInt(btn.dataset.allyIdx);
          const siteId = btn.dataset.siteId;
          const siteName = btn.dataset.siteName;
          const ally = allies[idx];
          
          if(ally){
            ally.garrisonSiteId = siteId;
            // Clear old garrison position to force recalculation
            delete ally._garrisonX;
            delete ally._garrisonY;
            delete ally._garrisonSlot;
            ui.toast(`${ally.name || 'Ally'} assigned to garrison ${siteName}`);
            ui.renderGarrison();
          }
        };
      });
      
      // Add click handlers for cancel garrison buttons
      const cancelBtns = ui.garrisonDetailList.querySelectorAll('.cancel-garrison-btn');
      cancelBtns.forEach(btn => {
        btn.onclick = ()=>{
          const idx = parseInt(btn.dataset.allyIdx);
          const ally = allies[idx];
          
          if(ally){
            delete ally.garrisonSiteId;
            ui.toast(`${ally.name || 'Ally'} garrison cancelled`);
            ui.renderGarrison();
          }
        };
      });
    } catch(err) {
      console.error('[renderGarrison] Error:', err);
      if(ui.garrisonLocationList) ui.garrisonLocationList.innerHTML = '<div class="small" style="color:#f55; padding:20px;">Error: ' + err.message + '</div>';
      if(ui.garrisonDetailList) ui.garrisonDetailList.innerHTML = '';
    }
  };

  ui.showMarketplaceHint = (show)=>{
    // Could add a visual hint here when player is near marketplace
    // For now, this is a placeholder for future hint UI
  };

  ui.renderShop = ()=>{
    const formatBuffs = (buffs)=>{
      if(!buffs || Object.keys(buffs).length===0) return 'No bonuses';
      return Object.entries(buffs).map(([k,v])=>`${k}: ${typeof v==='number'? (Math.abs(v)<1? (v>0?'+':'')+(v*100).toFixed(1)+'%' : (v>0?'+':'')+v) : v}`).join(', ');
    };
    const formatElementals = (item)=>{
      if(!item.elementalEffects || !item.elementalEffects.length) return '';
      return item.elementalEffects.map(e=>`${Math.round((e.chance||0)*100)}% ${e.type} on-hit`).join(' | ');
    };
    const RARITIES = [{key:'common',name:'Common',color:'var(--common)',weight:60}];
    const commonRarity = RARITIES[0];
    
    // Create shop inventory: potions + starter gear (all unlimited)
    const shopItems = [
      // Potions (unlimited stock)
      {item: {kind:'potion', type:'hp', rarity:commonRarity, name:'Health Potion', desc:'Restores HP over time', buffs:{hpRegen:15}, count:1}, price:20, stock:'unlimited'},
      {item: {kind:'potion', type:'mana', rarity:commonRarity, name:'Mana Potion', desc:'Restores Mana over time', buffs:{manaRegen:12}, count:1}, price:20, stock:'unlimited'},
      // Common armor (unlimited stock)
      {item: {kind:'armor', slot:'helm', rarity:commonRarity, name:'Common Helm', desc:'Basic head protection', buffs:{maxHp:8, def:2}}, price:50, stock:'unlimited'},
      {item: {kind:'armor', slot:'shoulders', rarity:commonRarity, name:'Common Shoulders', desc:'Basic shoulder armor', buffs:{maxHp:6, def:1}}, price:45, stock:'unlimited'},
      {item: {kind:'armor', slot:'chest', rarity:commonRarity, name:'Common Chestplate', desc:'Basic chest armor', buffs:{maxHp:12, def:3}}, price:60, stock:'unlimited'},
      {item: {kind:'armor', slot:'hands', rarity:commonRarity, name:'Common Gloves', desc:'Basic hand protection', buffs:{atk:2, def:1}}, price:40, stock:'unlimited'},
      {item: {kind:'armor', slot:'belt', rarity:commonRarity, name:'Common Belt', desc:'Basic belt', buffs:{maxHp:5, def:1}}, price:35, stock:'unlimited'},
      {item: {kind:'armor', slot:'legs', rarity:commonRarity, name:'Common Legs', desc:'Basic leg armor', buffs:{maxHp:10, def:2}}, price:50, stock:'unlimited'},
      {item: {kind:'armor', slot:'feet', rarity:commonRarity, name:'Common Boots', desc:'Basic footwear', buffs:{speed:5, def:1}}, price:40, stock:'unlimited'},
      {item: {kind:'armor', slot:'neck', rarity:commonRarity, name:'Common Necklace', desc:'Simple necklace', buffs:{maxHp:6, maxMana:6}}, price:45, stock:'unlimited'},
      {item: {kind:'armor', slot:'accessory1', rarity:commonRarity, name:'Common Ring', desc:'Simple ring', buffs:{maxMana:8}}, price:35, stock:'unlimited'},
      {item: {kind:'armor', slot:'accessory2', rarity:commonRarity, name:'Common Bracelet', desc:'Simple bracelet', buffs:{atk:2, maxMana:4}}, price:35, stock:'unlimited'},
      // Common weapons (unlimited stock)
      {item: {kind:'weapon', slot:'weapon', weaponType:'Sword', rarity:commonRarity, name:'Common Sword', desc:'Basic sword', buffs:{atk:5}}, price:55, stock:'unlimited'},
      {item: {kind:'weapon', slot:'weapon', weaponType:'Axe', rarity:commonRarity, name:'Common Axe', desc:'Basic axe', buffs:{atk:6, speed:-3}}, price:55, stock:'unlimited'},
      {item: {kind:'weapon', slot:'weapon', weaponType:'Greatsword', rarity:commonRarity, name:'Common Great Sword', desc:'Large two-handed sword', buffs:{atk:8, def:2, speed:-2}}, price:65, stock:'unlimited'},
      {item: {kind:'weapon', slot:'weapon', weaponType:'Dagger', rarity:commonRarity, name:'Common Dagger', desc:'Basic dagger', buffs:{atk:3, speed:8}}, price:50, stock:'unlimited'},
      {item: {kind:'weapon', slot:'weapon', weaponType:'Destruction Staff', rarity:commonRarity, name:'Common Destruction Staff', desc:'Basic caster staff', buffs:{atk:3, maxMana:12, manaRegen:0.8}}, price:70, stock:'unlimited'},
      {item: {kind:'weapon', slot:'weapon', weaponType:'Healing Staff', rarity:commonRarity, name:'Common Healing Staff', desc:'Basic healing staff', buffs:{maxMana:14, manaRegen:1.0, cdr:0.03}}, price:70, stock:'unlimited'},
      // Separate Squad Services
      {item: {kind:'service', serviceId:'squad_armor', slot:'none', rarity:commonRarity, name:'Upgrade Squad Armor Tier', desc:'Increase allies’ armor rarity by one tier', buffs:{}}, price: state.marketCosts?.squadArmor ?? 1000, stock:'unlimited'},
      {item: {kind:'service', serviceId:'squad_level', slot:'none', rarity:commonRarity, name:'Increase Squad Level', desc:'Increase all allies’ level by +1', buffs:{}}, price: state.marketCosts?.squadLevel ?? 800, stock:'unlimited'},
    ];

    ui.shopItems.innerHTML = '';
    
    // Tooltip helpers for market items
    const marketTooltip = document.getElementById('invTooltip');
    const showMarketTooltip = (html, evt, parentElement) => {
      if(!marketTooltip || !evt) return;
      marketTooltip.innerHTML = html;
      marketTooltip.style.display = 'block';
      marketTooltip.style.visibility = 'hidden';
      marketTooltip.style.transform = 'none';
      marketTooltip.style.bottom = 'auto';
      
      const parentRect = (parentElement || ui.shopItems).getBoundingClientRect();
      const tooltipRect = marketTooltip.getBoundingClientRect();
      const scrollY = (parentElement || ui.shopItems).scrollTop || 0;
      const cursorX = evt.clientX - parentRect.left;
      const cursorY = evt.clientY - parentRect.top + scrollY;
      const margin = 14;
      
      // Prefer right of cursor; if overflow, flip to left
      let left = cursorX + margin;
      if(left + tooltipRect.width > parentRect.width - 4){
        left = cursorX - tooltipRect.width - margin;
      }
      // Prefer below cursor; if overflow, flip above
      let top = cursorY + margin;
      if(top + tooltipRect.height > parentRect.height + scrollY - 4){
        top = cursorY - tooltipRect.height - margin;
      }
      // Clamp within panel bounds
      left = Math.max(8, Math.min(left, parentRect.width - tooltipRect.width - 8));
      top = Math.max(scrollY + 4, Math.min(top, scrollY + parentRect.height - tooltipRect.height - 4));
      marketTooltip.style.top = `${top}px`;
      marketTooltip.style.left = `${left}px`;
      marketTooltip.style.visibility = 'visible';
    };
    const hideMarketTooltip = () => {
      if(marketTooltip) marketTooltip.style.display = 'none';
    };
    
    shopItems.forEach((shopItem, idx)=>{
      const it = shopItem.item;
      const canBuy = true; // All items are unlimited
      const affordable = state.player.gold >= shopItem.price;
      
      const div = document.createElement('div');
      div.className = 'slot';
      div.style.cssText = 'position:relative; cursor:pointer; opacity:' + (affordable ? '1' : '0.5') + '; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4px;';
      
      const stockText = '∞'; // All unlimited
      const imgPath = getItemImage(it);
      const imageHtml = imgPath ? `<img src="${imgPath}" alt="${it.name}" style="width:100%; height:100%; object-fit:contain; position:absolute; top:0; left:0;"/>` : '';
      
      div.innerHTML = `
        ${imageHtml}
        <div style="position:absolute; bottom:2px; left:2px; right:2px; background:rgba(0,0,0,0.85); padding:2px; border-radius:2px; pointer-events:none">
          <div class="small" style="font-size:9px; font-weight:900; color:var(--common); text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${it.name}</div>
          <div class="small" style="font-size:8px; color:var(--epic); font-weight:900; text-align:center">${formatGold(shopItem.price)}</div>
        </div>
      `;
      
      // Add hover tooltip for shop items
      div.addEventListener('mouseenter', (evt) => {
        const color = it.rarity?.color || '#fff';
        let html = `<div style="font-weight:900; color:${color}; margin-bottom:4px">${it.name}</div>`;
        html += `<div style="color:#aaa; margin-bottom:8px">${it.desc || ''}</div>`;
        
        if(it.buffs && Object.keys(it.buffs).length > 0){
          const buffsText = Object.entries(it.buffs).map(([k,v])=>{
            let displayVal;
            if(typeof v === 'number'){
              if(Math.abs(v) < 1){
                displayVal = (v>0?'+':'')+(v*100).toFixed(0)+'%';
              } else {
                displayVal = (v>0?'+':'')+Math.round(v);
              }
            } else {
              displayVal = v;
            }
            return `<span style="color:var(--common)">${displayVal} ${k}</span>`;
          }).join(' • ');
          html += `<div style="margin-bottom:8px">${buffsText}</div>`;
        }
        
        if(it.elementalEffects && it.elementalEffects.length > 0){
          const elemsText = it.elementalEffects.map(e=>`${Math.round((e.chance||0)*100)}% ${e.type} on-hit`).join(' | ');
          html += `<div style="color:var(--rare); margin-bottom:8px">${elemsText}</div>`;
        }
        
        if(it.slot && it.slot !== 'none'){
          html += `<div style="color:#999; margin-top:8px">Slot: ${it.slot}</div>`;
        }
        
        if(it.kind === 'weapon' && it.weaponType){
          html += `<div style="color:#999">Type: ${it.weaponType}</div>`;
        }
        
        html += `<div style="color:var(--epic); font-weight:bold; margin-top:8px">💰 Price: ${formatGold(shopItem.price)}</div>`;
        
        if(!affordable){
          html += `<div style="color:#f66; margin-top:4px; font-size:11px">⚠️ Not enough gold</div>`;
        }
        
        showMarketTooltip(html, evt, ui.shopItems);
      });
      div.addEventListener('mouseleave', hideMarketTooltip);
      
      const updateInspect = ()=>{
        if(!ui.marketInspect) return;
        const color = it.rarity?.color || '#fff';
        const buffsText = formatBuffs(it.buffs);
        const elems = formatElementals(it);
        const affordableMsg = affordable ? '<br><span style="color:#4a9eff; font-size:11px; margin-top:4px; display:inline-block">Press E or Double-Click to Purchase | Right-Click for Multiple</span>' : '<div style="color:#f66; margin-top:4px; font-size:11px">⚠️ Not enough gold</div>';
        ui.marketInspect.innerHTML = `<span style="color:${color}; font-weight:900">${it.name}</span><br>${it.desc || ''}<br>${buffsText}${elems? '<br>'+elems : ''}${affordableMsg}`;
      };
      
      div.onmouseenter = () => {
        updateInspect();
        // Track this as the selected shop item for E key purchase
        state._marketSelectedShopItem = shopItem;
        state._marketSelectedShopIndex = idx;
      };
      
      // Right-click to buy multiples - show quantity selector bubble
      div.oncontextmenu = (e) => {
        e.preventDefault();
        if(!affordable){
          ui.toast('Not enough gold!');
          return;
        }
        
        const maxAffordable = Math.floor(state.player.gold / shopItem.price);
        
        // Create or get existing quantity selector bubble
        let bubble = document.getElementById('qtyBubble');
        if(!bubble){
          bubble = document.createElement('div');
          bubble.id = 'qtyBubble';
          bubble.style.cssText = 'position:fixed; background:rgba(10,10,20,0.98); border:2px solid rgba(212,175,55,0.8); border-radius:10px; padding:14px 16px; z-index:9999; box-shadow:0 4px 20px rgba(0,0,0,0.7); min-width:220px;';
          document.body.appendChild(bubble);
        }
        
        // Position at mouse
        bubble.style.left = `${e.clientX + 10}px`;
        bubble.style.top = `${e.clientY + 10}px`;
        bubble.style.display = 'block';
        
        // Build bubble content
        const color = it.rarity?.color || '#fff';
        const quantities = [1, 5, 10, 25, 50, maxAffordable].filter((q, i, arr) => q > 0 && q <= maxAffordable && arr.indexOf(q) === i).sort((a,b) => a-b);
        
        bubble.innerHTML = `
          <div style="color:#e9d27b; font-weight:700; font-size:13px; margin-bottom:10px; text-align:center;">
            Buy <span style="color:${color}">${it.name}</span>
          </div>
          <div style="color:#d4b896; font-size:11px; margin-bottom:12px; line-height:1.5;">
            Price: ${formatGold(shopItem.price)} each<br>
            Max affordable: <b>${maxAffordable}</b><br>
            Your gold: ${formatGold(state.player.gold)}
          </div>
          <div style="display:grid; grid-template-columns:repeat(${quantities.length <= 4 ? quantities.length : 3}, 1fr); gap:8px;">
            ${quantities.map(qty => {
              const totalCost = shopItem.price * qty;
              return `<button class="qtyBtn" data-qty="${qty}" style="padding:10px 12px; background:#050505; color:#e7c76c; border:2px solid rgba(212,175,55,0.7); border-radius:6px; font-weight:700; cursor:pointer; font-size:12px; transition:all 0.2s;">
                ${qty === maxAffordable ? 'Max' : qty}<br>
                <span style="font-size:10px; color:#d4b896;">${formatGold(totalCost)}</span>
              </button>`;
            }).join('')}
          </div>
          <button id="qtyCancel" style="width:100%; margin-top:12px; padding:8px; background:#1a1a1a; color:#ccc; border:1px solid #555; border-radius:6px; cursor:pointer; font-size:11px;">Cancel</button>
        `;
        
        // Handle quantity button clicks
        const qtyButtons = bubble.querySelectorAll('.qtyBtn');
        qtyButtons.forEach(btn => {
          btn.onmouseover = () => { btn.style.background = '#1a1a00'; btn.style.borderColor = 'rgba(212,175,55,0.95)'; };
          btn.onmouseout = () => { btn.style.background = '#050505'; btn.style.borderColor = 'rgba(212,175,55,0.7)'; };
          btn.onclick = () => {
            const quantity = parseInt(btn.dataset.qty);
            const totalCost = shopItem.price * quantity;
            state.player.gold -= totalCost;
            
            // Add items to inventory
            for(let i = 0; i < quantity; i++){
              const itemCopy = JSON.parse(JSON.stringify(it));
              itemCopy.count = itemCopy.count || 1;
              
              if(itemCopy.kind === 'potion'){
                const existing = state.inventory.find(inv => inv.kind === 'potion' && inv.type === itemCopy.type && inv.rarity.key === itemCopy.rarity.key);
                if(existing){
                  existing.count = (existing.count || 1) + 1;
                } else {
                  state.inventory.push(itemCopy);
                }
              } else {
                // Non-potions don't stack - add each separately
                state.inventory.push(itemCopy);
              }
            }
            
            ui.toast(`<span style="color:${color}"><b>${it.name}</b></span> x${quantity} purchased for ${formatGold(totalCost)}`);
            if(ui.marketConfirm){
              ui.marketConfirm.innerHTML = `<span style="color:${color}"><b>${it.name}</b></span> x${quantity} purchased`;
              clearTimeout(ui.marketConfirm._t);
              ui.marketConfirm._t = setTimeout(()=>{ if(ui.marketConfirm) ui.marketConfirm.innerHTML=''; }, 2600);
            }
            updateInspect();
            ui.updateGoldDisplay();
            ui.renderShop();
            ui.renderSellItems();
            ui.renderInventory?.();
            bubble.style.display = 'none';
          };
        });
        
        // Handle cancel
        document.getElementById('qtyCancel').onclick = () => {
          bubble.style.display = 'none';
        };
        
        // Close bubble on click outside
        const closeOnClickOutside = (evt) => {
          if(!bubble.contains(evt.target)){
            bubble.style.display = 'none';
            document.removeEventListener('click', closeOnClickOutside);
          }
        };
        setTimeout(() => document.addEventListener('click', closeOnClickOutside), 100);
      };
      
      div.onclick = ()=>{
        // Select item and update inspect panel
        state._marketSelectedShopItem = shopItem;
        state._marketSelectedShopIndex = idx;
        updateInspect();
        
        // Double-click detection
        const now = Date.now();
        const clickKey = `shop-${idx}`;
        if(state._lastShopClick && state._lastShopClick.key === clickKey && now - state._lastShopClick.time < 300){
          // Double-clicked - purchase the item
          if(!affordable){
            ui.toast('Not enough gold!');
            return;
          }
          
          // Purchase item
          state.player.gold -= shopItem.price;
          
          // Services apply immediately
          if(it.kind === 'service'){
            if(it.serviceId === 'squad_armor' && typeof window.applySquadArmorUpgrade === 'function'){
              window.applySquadArmorUpgrade(state);
              // increase future cost
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
          ui.toast(`<span style="color:${color}"><b>${it.name}</b></span> added to inventory for ${formatGold(shopItem.price)}`);
          if(ui.marketConfirm){
            ui.marketConfirm.innerHTML = `<span style="color:${color}"><b>${it.name}</b></span> purchased`;
            clearTimeout(ui.marketConfirm._t);
            ui.marketConfirm._t = setTimeout(()=>{ if(ui.marketConfirm) ui.marketConfirm.innerHTML=''; }, 2600);
          }
          updateInspect();
          ui.updateGoldDisplay();
          ui.renderShop();
          ui.renderSellItems();
          ui.renderInventory?.();
          state._lastShopClick = null; // Reset double-click
        } else {
          // Single click - just track it for double-click detection
          state._lastShopClick = { key: clickKey, time: now };
        }
      };
      ui.shopItems.appendChild(div);
    });
  };

  // Render sell items (player inventory for selling)
  ui.renderSellItems = ()=>{
    if(!ui.sellItems) return;
    ui.sellItems.innerHTML = '';
    
    const formatBuffs = (buffs)=>{
      if(!buffs || Object.keys(buffs).length===0) return 'No bonuses';
      return Object.entries(buffs).map(([k,v])=>`${k}: ${typeof v==='number'? (Math.abs(v)<1? (v>0?'+':'')+(v*100).toFixed(1)+'%' : (v>0?'+':'')+v) : v}`).join(', ');
    };
    const formatElementals = (item)=>{
      if(!item.elementalEffects || !item.elementalEffects.length) return '';
      return item.elementalEffects.map(e=>`${Math.round((e.chance||0)*100)}% ${e.type} on-hit`).join(' | ');
    };
    
    const maxSlots = 500;
    
    for(let i=0; i<maxSlots; i++){
      const slot = document.createElement('div');
      slot.className = 'slot';
      
      if(i < state.inventory.length){
        const item = state.inventory[i];
        const isEquipped = item.slot && state.equipped && state.equipped[item.slot] === item;
        
        const imgPath = getItemImage(item);
        const stackCountHtml = (item.kind === 'potion' && item.count > 1) ? `<div style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.85); padding:2px 4px; border-radius:3px; font-size:11px; color:#fff; font-weight:900; pointer-events:none;">${item.count}</div>` : '';
        if(imgPath){
          slot.innerHTML = `<img src="${imgPath}" alt="${item.name}" style="width:100%; height:100%; object-fit:contain; pointer-events:none;"/>${stackCountHtml}`;
        } else {
          slot.innerHTML = invSlotLabel(item) + stackCountHtml;
        }
        slot.style.borderColor = item.rarity.color;
        slot.style.color = item.rarity.color;
        slot.style.cursor = 'pointer';
        slot.style.position = 'relative';
        
        if(isEquipped){
          slot.style.opacity = '0.5';
          slot.title = 'Equipped - Unequip to sell';
        }
        
        // Store item reference on the slot element
        slot._itemRef = item;
        slot._itemIndex = i;
        slot._isEquipped = isEquipped;
        
        let lastClickTime = 0;
        
        slot.addEventListener('mouseenter', function(){
          if(!ui.sellInspect) return;
          const currentItem = this._itemRef;
          const itemCount = currentItem.count || 1;
          const color = currentItem.rarity?.color || '#fff';
          const countText = itemCount > 1 ? ` (x${itemCount})` : '';
          const equippedText = this._isEquipped ? ' <span style="color:#4a9eff; font-size:10px">[EQUIPPED]</span>' : '';
          const buffsText = formatBuffs(currentItem.buffs);
          const elems = formatElementals(currentItem);
          const sellVal = currentItem.rarity?.sellValue || 5;
          const totalSell = sellVal * itemCount;
          const equipMsg = this._isEquipped ? '<br><span style="color:#f66; font-size:11px">⚠️ Unequip this item before selling</span>' : '<br><span style="color:#4a9eff; font-size:11px; margin-top:4px; display:inline-block">Press E or Double-Click to Sell</span>';
          ui.sellInspect.innerHTML = `<span style="color:${color}; font-weight:900">${currentItem.name}${countText}${equippedText}</span><br>${currentItem.desc || ''}<br>${buffsText}${elems? '<br>'+elems : ''}<br><br><span style="color:var(--epic); font-weight:900">💰 Sell Value: ${totalSell}g</span>${itemCount > 1 ? ` <span style="color:#999">(${sellVal}g each)</span>` : ''}${equipMsg}`;
          
          state._marketSelectedSellIndex = this._itemIndex;
          state._marketSelectedItem = this._itemRef;
        });
        
        slot.addEventListener('click', function(){
          const currentItem = this._itemRef;
          const currentIsEquipped = this._isEquipped;
          
          // Update inspect
          if(ui.sellInspect){
            const itemCount = currentItem.count || 1;
            const color = currentItem.rarity?.color || '#fff';
            const countText = itemCount > 1 ? ` (x${itemCount})` : '';
            const equippedText = currentIsEquipped ? ' <span style="color:#4a9eff; font-size:10px">[EQUIPPED]</span>' : '';
            const buffsText = formatBuffs(currentItem.buffs);
            const elems = formatElementals(currentItem);
            const sellVal = currentItem.rarity?.sellValue || 5;
            const totalSell = sellVal * itemCount;
            const equipMsg = currentIsEquipped ? '<br><span style="color:#f66; font-size:11px">⚠️ Unequip this item before selling</span>' : '<br><span style="color:#4a9eff; font-size:11px; margin-top:4px; display:inline-block">Press E or Double-Click to Sell</span>';
            ui.sellInspect.innerHTML = `<span style="color:${color}; font-weight:900">${currentItem.name}${countText}${equippedText}</span><br>${currentItem.desc || ''}<br>${buffsText}${elems? '<br>'+elems : ''}<br><br><span style="color:var(--epic); font-weight:900">💰 Sell Value: ${totalSell}g</span>${itemCount > 1 ? ` <span style="color:#999">(${sellVal}g each)</span>` : ''}${equipMsg}`;
          }
          
          state._marketSelectedSellIndex = this._itemIndex;
          state._marketSelectedItem = this._itemRef;
          
          // Double-click detection
          const now = Date.now();
          if(now - lastClickTime < 300){
            // Sell the item
            if(currentIsEquipped){
              state.ui.toast('Unequip this item before selling!');
              return;
            }
            
            const invIdx = state.inventory.indexOf(currentItem);
            if(invIdx === -1) return;
            
            const sellVal = currentItem.rarity?.sellValue || 5;
            state.player.gold += sellVal;
            const color = currentItem.rarity?.color || '#fff';
            
            if(currentItem.count && currentItem.count > 1){
              currentItem.count--;
              state.ui.toast(`<span style="color:${color}"><b>${currentItem.name}</b></span> sold for ${sellVal}g (${currentItem.count} remaining)`);
            } else {
              state.inventory.splice(invIdx, 1);
              state.ui.toast(`<span style="color:${color}"><b>${currentItem.name}</b></span> sold for ${sellVal}g`);
            }
            
            state.ui.updateGoldDisplay();
            state.ui.renderSellItems();
            state.ui.renderInventory?.();
            if(state.selectedIndex === invIdx) state.selectedIndex = -1;
          }
          lastClickTime = now;
        });
        
      } else {
        // Empty slot
        slot.addEventListener('click', function(){
          if(ui.sellInspect) ui.sellInspect.innerHTML = 'Click an item to view stats and sell value.';
          state._marketSelectedSellIndex = undefined;
          state._marketSelectedItem = undefined;
        });
      }
      
      ui.sellItems.appendChild(slot);
    }
  };

  ui.btnCloseMarket.onclick = () => ui.toggleMarketplace(false);
  
  ui.btnSellAll = document.getElementById('btnSellAll');
  ui.btnSellAll.onclick = ()=>{
    // Sell all non-equipped items
    let totalGold = 0;
    let itemsSold = 0;
    const itemsToRemove = [];
    
    for(let i = state.inventory.length - 1; i >= 0; i--){
      const item = state.inventory[i];
      const isEquipped = item.slot && state.equipped && state.equipped[item.slot] === item;
      
      if(!isEquipped){
        const sellVal = item.rarity?.sellValue || 5;
        const count = item.count || 1;
        totalGold += sellVal * count;
        itemsSold += count;
        itemsToRemove.push(i);
      }
    }
    
    if(itemsSold === 0){
      ui.toast('No items to sell! (All items are equipped)');
      return;
    }
    
    // Remove items from inventory
    for(const idx of itemsToRemove){
      state.inventory.splice(idx, 1);
    }
    
    state.player.gold += totalGold;
    ui.toast(`<span style="color:var(--epic); font-weight:900">Sold ${itemsSold} item${itemsSold > 1 ? 's' : ''} for ${totalGold}g!</span>`);
    ui.updateGoldDisplay();
    ui.renderSellItems();
    ui.renderInventory?.();
    if(state.selectedIndex >= 0) state.selectedIndex = -1;
  };
  
  // Base Actions menu handlers
  ui.btnOpenMarketplace.onclick = () => {
    ui.toggleBaseActions(false);
    ui.toggleMarketplace(true);
  };
  ui.btnOpenGarrison.onclick = () => {
    ui.toggleBaseActions(false);
    ui.toggleGarrison(true);
  };
  ui.btnCloseBaseActions.onclick = () => ui.toggleBaseActions(false);
  
  // Garrison overlay handlers
  ui.btnCloseGarrison.onclick = () => ui.toggleGarrison(false);

  ui.btnSelectHero.onclick = ()=>{
    if(state.groupMemberInventoryMode){
      ui.toast('Switch class from the Group/Allies tab while editing a member.');
      return;
    }
    console.log('[btnSelectHero] clicked, current class:', state.player.class);
    // Save current hero's ability slots and equipment before switching
    const currentClass = state.player.class || 'warrior';
    state.heroAbilitySlots[currentClass] = [...state.abilitySlots];
    state.heroEquip[currentClass] = {...state.player.equip};
    
    // Show character select overlay
    console.log('[btnSelectHero] calling showCharSelect');
    showCharSelect(state, (chosenClass)=>{
      console.log('[btnSelectHero] hero selected:', chosenClass);
      // Load the chosen hero's saved ability slots and equipment
      state.abilitySlots = [...(state.heroAbilitySlots[chosenClass] || [])];
      state.player.equip = {...(state.heroEquip[chosenClass] || Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null])))};
      state.currentHero = chosenClass;
      ui.renderAbilityBar();
      ui.renderSkills();
      ui.renderInventory();
      ui.toast(`Switched to <b>${chosenClass.charAt(0).toUpperCase()+chosenClass.slice(1)}</b>`);
    }, true);
  };

  ui.toggleHud = (visible)=>{
    ui.hud.style.display = visible ? 'block' : 'none';
    ui.bottomBar.style.display = visible ? 'none' : 'block';
  };

  ui.toggleMenu = (on)=>{
    state.inMenu=on;
    ui.escOverlay.classList.toggle('show',on);
    if(on){
      // Always show main menu when opening, hide options
      ui.escMenuMain.style.display = 'block';
      ui.escMenuOptions.style.display = 'none';
      
      state.paused=true;
      ui.optShowAim.checked=state.options.showAim;
      if(ui.optShowDebugAI) ui.optShowDebugAI.checked = !!state.options.showDebugAI;
      if(ui.optShowDebugAIEnemies) ui.optShowDebugAIEnemies.checked = !!state.options.showDebugAIEnemies;
      ui.optAutoPickup.checked=state.options.autoPickup || false;
      const cameraMode = state.options.cameraMode || 'follow';
        ui.optCameraFollowChar.checked = cameraMode === 'follow';
        ui.optCameraFreeView.checked = cameraMode === 'freeview';
        if(ui.optCameraEdgeStrict) ui.optCameraEdgeStrict.checked = cameraMode === 'edge_strict';
      ui.renderBindList();
    } else if(!state.showInventory && !state.campaignEnded) state.paused=false;
  };

  // Show/hide inventory overlay and wire Campaign tab refresh
  ui.toggleInventory = (on)=>{
    state.showInventory = !!on;
    ui.invOverlay.classList.toggle('show', !!on);
    if(on){
      state.paused = true;
      // Default to Inventory tab (by id)
      activateTab(0);
      // Render Campaign header and set periodic refresh while open
      ui.renderCampaignTab?.();
      if(ui._campaignTimer) clearInterval(ui._campaignTimer);
      ui._campaignTimer = setInterval(()=>{ try{ ui.renderCampaignTab?.(); }catch{} }, 1500);
    } else {
      if(ui._campaignTimer){ clearInterval(ui._campaignTimer); ui._campaignTimer = null; }
      if(!state.campaignEnded) state.paused = false;
    }
  };

  // Render Campaign tab: leader/last banner, team metrics, captures summary
  ui.renderCampaignTab = ()=>{
    const headerEl = document.getElementById('campaignHeader');
    const teamsEl = document.getElementById('campaignTeams');
    const capsEl = document.getElementById('campaignCaptures');
    if(!headerEl || !teamsEl || !capsEl) return;

    const teamNames = {
      player: '⭐ Kingdom of Light',
      teamA: '🔴 Crimson Legion',
      teamB: '🟡 Golden Covenant',
      teamC: '🔵 Azure Order'
    };

    const teams = ['player','teamA','teamB','teamC'];
    const pts = {
      player: state.teamPoints?.player || 0,
      teamA: state.teamPoints?.teamA || 0,
      teamB: state.teamPoints?.teamB || 0,
      teamC: state.teamPoints?.teamC || 0,
    };
    const entries = teams.map(k=>({k, v: pts[k]}));
    const leader = entries.reduce((a,b)=> b.v > a.v ? b : a, entries[0]);
    const last = entries.reduce((a,b)=> b.v < a.v ? b : a, entries[0]);
    const gap = Math.max(0, Math.round(leader.v - last.v));

    const cfg = state.rubberband || {};
    const nextMap = state.rubberbandNext || {};
    const awardedMap = state.rubberbandAwarded || {};
    const campaignTime = state.campaign?.time || 0;
    const timeMin = Math.floor(campaignTime / 60);
    const timeSec = Math.floor(campaignTime % 60);
    const timeStr = `${timeMin}:${timeSec.toString().padStart(2, '0')}`;
    
    const lastNext = Math.max(0, (nextMap[last.k]||0) - campaignTime);
    const lastETAmin = Math.ceil(lastNext/60);
    const eligible = gap >= (cfg.gapThreshold||50);
    const lastAwarded = Math.round(awardedMap[last.k]||0);
    
    // Check if campaign has actually started (any team has points or multiple teams exist)
    const totalPoints = entries.reduce((sum, e) => sum + e.v, 0);
    const hasCompetition = totalPoints > 0 || gap > 0;

    if (hasCompetition) {
      const nextGoldAmount = cfg.baseTickGold || 250;
      headerEl.innerHTML = `
        <div style="font-size:14px; margin-bottom:4px;"><b>Campaign Time:</b> ${timeStr}</div>
        <div style="font-size:13px;"><b>Leader:</b> ${teamNames[leader.k]} • <b>${Math.round(leader.v)}</b> pts</div>
        <div style="font-size:13px;"><b>Last Place:</b> ${teamNames[last.k]} • <b>${Math.round(last.v)}</b> pts (gap: ${gap})</div>
        <div style="font-size:13px;"><b>Catch-Up Assistance:</b> ${eligible ? `<span style="color:#8f9">✓ Active</span> • Next <b>+${nextGoldAmount}g</b> in ${lastETAmin} min • Already given: <b>${lastAwarded}g</b>` : `<span style="color:#f99">✗ Disabled</span> (${gap < 50 ? 'teams too close' : 'leading team'})`}</div>
      `;
    } else {
      headerEl.innerHTML = `
        <div style="font-size:14px; color:#888;"><b>Campaign Time:</b> ${timeStr}</div>
        <div style="font-size:13px; color:#888;">No competition yet - capture flags to start earning points!</div>
      `;
    }

    // Team metrics lines
    const sites = state.sites || [];
    const countFlags = (owner)=> sites.filter(s=> s.owner===owner).length;

    const avgLevelFor = (owner)=>{
      if(owner==='player'){
        const pool = [state.player?.level||1, ...((state.friendlies||[]).filter(f=>f.respawnT<=0).map(f=>f.level||1))];
        const sum = pool.reduce((a,b)=>a+b,0); return Math.round(sum/Math.max(1,pool.length));
      } else {
        const pool = (state.enemies||[]).filter(e=>e.team===owner).map(e=>e.level||1);
        const sum = pool.reduce((a,b)=>a+b,0); return Math.round(sum/Math.max(1,pool.length));
      }
    };

    const avgArmorTierFor = (owner)=>{
      const tierForUnit = (u)=>{
        const eq = u.equip || {};
        let total=0, count=0;
        for(const val of Object.values(eq)){
          if(val && typeof val._rarityTier === 'number'){ total += val._rarityTier; count++; }
        }
        return count ? (total/count) : (owner==='player' ? ((state.factionTech||1)-1) : 0);
      };
      const list = owner==='player' ? [state.player, ...(state.friendlies||[]).filter(f=>f.respawnT<=0)] : (state.enemies||[]).filter(e=>e.team===owner);
      if(!list.length) return 0;
      const sum = list.reduce((a,u)=> a + (tierForUnit(u)||0), 0);
      return Math.round(sum / list.length);
    };

    const goldFor = (owner)=> owner==='player' ? (state.factionGold||0) : 0;

    const teamLines = teams.map(k=>{
      const stars = avgArmorTierFor(k);
      const starStr = stars>0 ? ('★'.repeat(Math.min(5,stars))) : '—';
      return `<b style="font-size:14px;">${teamNames[k]}</b>: Gold ${goldFor(k)} • Pts ${Math.round(pts[k])} • Flags ${countFlags(k)} • Avg Lv ${avgLevelFor(k)} • Armor ${starStr}`;
    });
    
    // Helper for rarity colors
    const getRarityColor = (rarity) => {
      const colors = {
        common: '#c8c8c8',
        uncommon: '#8fd',
        rare: '#9cf',
        epic: '#c9f',
        legendary: '#f9c'
      };
      return colors[rarity] || '#fff';
    };
    
    // GUARD PROGRESSION STATS
    const guardStatsLines = [];
    guardStatsLines.push('<div style="margin-top:16px; padding-top:12px; border-top:1px solid rgba(212,175,55,0.3);">');
    guardStatsLines.push('<div style="font-weight:bold; font-size:14px; color:#d4af37; margin-bottom:8px;">⚔️ Guard Progression</div>');
    
    const playerFlags = sites.filter(s => s.owner === 'player' && s.id && s.id.startsWith('site_'));
    
    if(playerFlags.length === 0){
      guardStatsLines.push('<div style="color:#888; font-size:12px;">No flags captured. Capture a flag to deploy guards.</div>');
    } else {
      for(const site of playerFlags){
        const prog = site.guardProgression || { timeHeld: 0, gearRarity: 'common', levels: [1,1,1,1,1] };
        const guards = state.friendlies.filter(f => f.guard && f.homeSiteId === site.id && f.respawnT <= 0);
        const timeHeldMin = Math.floor(prog.timeHeld / 60);
        const timeHeldSec = Math.floor(prog.timeHeld % 60);
        
        // Next upgrade calculation
        const RARITY_PROGRESSION = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const currentIdx = RARITY_PROGRESSION.indexOf(prog.gearRarity);
        const nextRarity = currentIdx < RARITY_PROGRESSION.length - 1 ? RARITY_PROGRESSION[currentIdx + 1] : null;
        const timeForNext = (currentIdx + 1) * 300; // 5 min intervals
        const timeUntilUpgrade = nextRarity ? Math.max(0, timeForNext - prog.timeHeld) : 0;
        const minUntilUpgrade = Math.floor(timeUntilUpgrade / 60);
        const secUntilUpgrade = Math.floor(timeUntilUpgrade % 60);
        
        const rarityColor = getRarityColor(prog.gearRarity);
        const composition = ['Mage Healer', 'Mage Healer', 'Warrior DPS', 'Knight DPS', 'Warden DPS'];
        
        guardStatsLines.push(`<div style="margin-bottom:12px; padding:8px; background:rgba(0,0,0,0.3); border-left:3px solid #d4af37; font-size:12px; line-height:1.5;">`);
        guardStatsLines.push(`<div style="font-weight:bold; font-size:13px; color:#fff; margin-bottom:4px;">📍 ${site.name}</div>`);
        guardStatsLines.push(`<div style="color:#aaa;">⏱️ Time Held: <b>${timeHeldMin}m ${timeHeldSec}s</b></div>`);
        guardStatsLines.push(`<div style="color:#aaa;">🛡️ Current Gear: <span style="color:${rarityColor}; font-weight:bold;">${prog.gearRarity.toUpperCase()}</span></div>`);
        
        if(nextRarity){
          const nextColor = getRarityColor(nextRarity);
          guardStatsLines.push(`<div style="color:#9f6; font-size:11px;">⬆️ Next Upgrade: <span style="color:${nextColor}; font-weight:bold;">${nextRarity.toUpperCase()}</span> in <b>${minUntilUpgrade}m ${secUntilUpgrade}s</b></div>`);
        } else {
          guardStatsLines.push(`<div style="color:#f9c; font-size:11px;">⭐ MAX GEAR TIER (LEGENDARY)</div>`);
        }
        
        guardStatsLines.push(`<div style="margin-top:6px; color:#aaa; font-weight:bold;">⚔️ Guards (${guards.length}/5):</div>`);
        
        if(guards.length === 0){
          guardStatsLines.push(`<div style="color:#f66; font-size:11px; margin-left:8px;">⚠️ All guards defeated - will respawn</div>`);
        } else {
          for(let i = 0; i < 5; i++){
            const guard = guards.find(g => g.guardIndex === i);
            const guardClass = composition[i];
            const level = guard ? guard.level : (prog.levels[i] || 1);
            
            if(guard){
              const hpPct = Math.round((guard.hp / guard.maxHp) * 100);
              const hpColor = hpPct > 66 ? '#6f6' : hpPct > 33 ? '#fc6' : '#f66';
              guardStatsLines.push(`<div style="margin-left:8px; font-size:11px;"><span style="color:#6cf;">${guardClass}</span> <b>Level ${level}</b> - HP: <span style="color:${hpColor}; font-weight:bold;">${hpPct}%</span> <span style="color:#888">(${guard.hp}/${guard.maxHp})</span></div>`);
            } else {
              guardStatsLines.push(`<div style="margin-left:8px; font-size:11px; color:#888;">${guardClass} <b>Level ${level}</b> - <span style="color:#f66">💀 Defeated</span></div>`);
            }
          }
        }
        
        guardStatsLines.push(`</div>`);
      }
    }
    
    guardStatsLines.push('</div>');
    
    // Captures summary with Emperor info on right side
    const owners = ['player','teamA','teamB','teamC','neutral'];
    const capLines = owners.map(o=> `${teamNames[o] || o.toUpperCase()}: ${countFlags(o)}`);
    let capsContent = capLines.map(l=>`<div>${l}</div>`).join('');
    
    // EMPEROR STATUS DISPLAY on the right side
    if(state.emperorTeam === 'player'){
      const emperorStatsLines = [];
      emperorStatsLines.push('<div style="margin-top:12px; padding:12px; border:2px solid #ffd700; border-radius:6px; background:linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,193,7,0.05) 100%); box-shadow: 0 0 20px rgba(255,215,0,0.3), inset 0 0 15px rgba(255,215,0,0.1);">');
      emperorStatsLines.push('<div style="font-weight:bold; font-size:14px; color:#ffd700; margin-bottom:6px; text-shadow: 0 0 10px rgba(255,215,0,0.6); font-style:italic;">👑 EMPEROR 👑</div>');
      emperorStatsLines.push('<div style="font-size:11px; line-height:1.6; color:#f0e68c;">');
      emperorStatsLines.push('<div style="margin-bottom:4px;"><b style="color:#ffeb3b;">🔱 Bonuses:</b></div>');
      emperorStatsLines.push('<div style="margin-left:8px; color:#ffeb3b; font-size:10px;">• HP/Mana/Stam x3</div>');
      emperorStatsLines.push('<div style="margin-left:8px; color:#ffeb3b; font-size:10px;">• Cooldowns -50%</div>');
      emperorStatsLines.push('<div style="margin-left:8px; color:#ffeb3b; font-size:10px;">• Enemies Allied</div>');
      emperorStatsLines.push('</div></div>');
      capsContent += emperorStatsLines.join('');
    }
    
    teamsEl.innerHTML = teamLines.map(l=>`<div style="margin-bottom:6px;">${l}</div>`).join('') + guardStatsLines.join('');
    capsEl.innerHTML = capsContent;
  };

  ui.endCampaign = (winner)=>{
    state.campaignEnded=true;
    state.paused=true;
    ui.endTitle.textContent = winner==='player' ? 'You Won the Campaign' : 'You Lost the Campaign';
    ui.endText.textContent = winner==='player'
      ? 'You held the flags long enough to win.'
      : 'Enemies scored faster. Retake flags earlier and hold them.';
    // Populate rewards (UI only; items/gold granted by game.js)
    const list = document.getElementById('endRewards');
    if(list){
      list.innerHTML = '';
      for(let i=0;i<3;i++){ const li=document.createElement('li'); li.textContent='Legendary Item'; list.appendChild(li); }
      const li = document.createElement('li'); li.textContent='5000 Gold'; list.appendChild(li);
    }
    ui.endOverlay.classList.add('show');
  };

  ui.hideEnd = ()=> ui.endOverlay.classList.remove('show');

  // Helper: explain ally behavior based on group status
  const setAllyBehaviorDesc = (unit)=>{
    if(!ui.allyBehaviorDesc || !unit) return;
    const inGroup = state.group?.members?.includes(unit.id);
    if(inGroup){
      ui.allyBehaviorDesc.innerHTML = '<b>Group Member:</b> Aggressive breaks formation to engage enemies within ~180; Neutral stays closer (~90) and guards the player.';
    } else {
      ui.allyBehaviorDesc.innerHTML = '<b>Non-Group Ally:</b> Aggressive detours to fight; Neutral focuses on capturing flags and only fights nearby threats.';
    }
    ui.allyBehaviorDesc.style.display = 'block';
  };

  ui.showUnitInspection = (clicked)=>{
    const u = clicked.unit;
    const type = clicked.type;
    state.selectedUnit = {unit: u, type}; // Store reference for live updates
    // Set panel visibility
    ui.unitInspectionPanel.style.display = 'block';
    ui.unitInspectionContent.style.display = 'block';
    // Populate data
    ui.unitName.textContent = u.name || (type === 'enemy' ? 'Enemy' : type === 'friendly' ? 'Ally' : 'Creature');
    if(type === 'enemy'){
      const heroType = (u.variant || 'warrior').charAt(0).toUpperCase() + (u.variant || 'warrior').slice(1);
      const role = (u.role || (u.variant === 'mage' ? 'HEALER' : (u.variant === 'warden' || u.variant === 'knight' ? 'TANK' : 'DPS'))).toUpperCase();
      ui.unitTeam.textContent = `Enemy Unit • Type: ${heroType} • Role: ${role} • Team: ${u.team || 'Unknown'}`;
      ui.unitLevel.textContent = (u.level || 1);
      ui.allyControlPanel.style.display = 'none';
      if(ui.allyBehaviorDesc) ui.allyBehaviorDesc.style.display = 'none';
      if(ui.btnEditTarget) ui.btnEditTarget.style.display = 'none';
    } else if(type === 'friendly'){
      const heroType = (u.variant || 'warrior').charAt(0).toUpperCase() + (u.variant || 'warrior').slice(1);
      const role = (u.role || (state.group.settings[u.id]?.role) || 'dps').toUpperCase();
      ui.unitTeam.textContent = `Allied Unit • Type: ${heroType} • Role: ${role}`;
      ui.unitLevel.textContent = (u.level || 1);
      ui.allyControlPanel.style.display = 'block';
      setAllyBehaviorDesc(u);
      if(ui.btnEditTarget){
        if(u.guard){
          ui.btnEditTarget.style.display = 'none';
        } else {
          const inGroup = state.group.members.includes(u.id);
          ui.btnEditTarget.style.display = 'block';
          ui.btnEditTarget.disabled = !inGroup;
          ui.btnEditTarget.classList.toggle('secondary', !inGroup);
          ui.btnEditTarget.textContent = inGroup ? 'Edit Equipment & Abilities' : 'Invite to group to edit';
        }
      }
      // Update Invite/Kick button based on group membership
      if(ui.btnInviteToGroup){
        // Hide invite/kick button for guards (they can't join groups)
        if(u.guard){
          ui.btnInviteToGroup.style.display = 'none';
        } else {
          ui.btnInviteToGroup.style.display = '';
          const inGroup = state.group.members.includes(u.id);
          ui.btnInviteToGroup.textContent = inGroup ? 'Kick from Group' : 'Invite to Group';
          ui.btnInviteToGroup.classList.toggle('secondary', inGroup);
        }
      }
      // Set button visual states based on current behavior
      const currentBehavior = u.behavior || 'neutral';
      if(currentBehavior === 'aggressive'){
        ui.btnAllyAggressive.classList.remove('secondary');
        ui.btnAllyAggressive.style.background = 'rgba(122,162,255,0.3)';
        ui.btnAllyAggressive.style.borderColor = 'rgba(122,162,255,0.6)';
        ui.btnAllyNeutral.classList.add('secondary');
        ui.btnAllyNeutral.style.background = '';
        ui.btnAllyNeutral.style.borderColor = '';
      } else {
        ui.btnAllyNeutral.classList.remove('secondary');
        ui.btnAllyNeutral.style.background = 'rgba(122,162,255,0.3)';
        ui.btnAllyNeutral.style.borderColor = 'rgba(122,162,255,0.6)';
        ui.btnAllyAggressive.classList.add('secondary');
        ui.btnAllyAggressive.style.background = '';
        ui.btnAllyAggressive.style.borderColor = '';
      }
    } else {
      ui.unitTeam.textContent = `Neutral Creature`;
      ui.unitLevel.textContent = '—';
      ui.allyControlPanel.style.display = 'none';
      if(ui.allyBehaviorDesc) ui.allyBehaviorDesc.style.display = 'none';
      if(ui.btnEditTarget) ui.btnEditTarget.style.display = 'none';
    }
    ui.unitHP.textContent = `${Math.round(u.hp || 0)}/${Math.round(u.maxHp || 100)}`;
    ui.unitDMG.textContent = Math.round((u.contactDmg || u.dmg || 0));
    ui.unitSpeed.textContent = Math.round(u.speed || 0);
    
    // Auto-close after 5 seconds unless hovering
    if(ui._unitInspectionTimer) clearTimeout(ui._unitInspectionTimer);
    ui._unitInspectionTimer = setTimeout(()=>{
      if(ui.closeUnitPanel && ui.closeUnitPanel.onclick) ui.closeUnitPanel.onclick();
    }, 5000);
    
    // Clear existing hover listeners to avoid duplicates
    if(!ui._unitInspectionHoverBound){
      ui._unitInspectionHoverBound = true;
      ui.unitInspectionContent.addEventListener('mouseenter', ()=>{
        if(ui._unitInspectionTimer) clearTimeout(ui._unitInspectionTimer);
      });
      ui.unitInspectionContent.addEventListener('mouseleave', ()=>{
        ui._unitInspectionTimer = setTimeout(()=>{
          if(ui.closeUnitPanel && ui.closeUnitPanel.onclick) ui.closeUnitPanel.onclick();
        }, 5000);
      });
    }
  };

  // Ally behavior and group buttons
  if(ui.btnAllyAggressive){
    ui.btnAllyAggressive.onclick = ()=>{
      if(!state.selectedUnit || state.selectedUnit.type !== 'friendly') return;
      const friendly = state.selectedUnit.unit;
      friendly.behavior = 'aggressive';
      // Also update group settings if in group
      if(state.group.settings[friendly.id]){
        state.group.settings[friendly.id].behavior = 'aggressive';
        ui.renderGroupTab(); // Refresh group tab to show updated behavior
      }
      // Visual feedback: highlight active button
      ui.btnAllyAggressive.classList.remove('secondary');
      ui.btnAllyAggressive.style.background = 'rgba(122,162,255,0.3)';
      ui.btnAllyAggressive.style.borderColor = 'rgba(122,162,255,0.6)';
      ui.btnAllyNeutral.classList.add('secondary');
      ui.btnAllyNeutral.style.background = '';
      ui.btnAllyNeutral.style.borderColor = '';
      setAllyBehaviorDesc(friendly);
      ui.toast(`${friendly.name} is now <b>Aggressive</b>`);
    };
  }

  if(ui.btnAllyNeutral){
    ui.btnAllyNeutral.onclick = ()=>{
      if(!state.selectedUnit || state.selectedUnit.type !== 'friendly') return;
      const friendly = state.selectedUnit.unit;
      friendly.behavior = 'neutral';
      // Also update group settings if in group
      if(state.group.settings[friendly.id]){
        state.group.settings[friendly.id].behavior = 'neutral';
        ui.renderGroupTab(); // Refresh group tab to show updated behavior
      }
      // Visual feedback: highlight active button
      ui.btnAllyNeutral.classList.remove('secondary');
      ui.btnAllyNeutral.style.background = 'rgba(122,162,255,0.3)';
      ui.btnAllyNeutral.style.borderColor = 'rgba(122,162,255,0.6)';
      ui.btnAllyAggressive.classList.add('secondary');
      ui.btnAllyAggressive.style.background = '';
      ui.btnAllyAggressive.style.borderColor = '';
      setAllyBehaviorDesc(friendly);
      ui.toast(`${friendly.name} is now <b>Neutral</b>`);
    };
  }

  if(ui.btnInviteToGroup){
    ui.btnInviteToGroup.onclick = ()=>{
      if(!state.selectedUnit || state.selectedUnit.type !== 'friendly') return;
      const friendly = state.selectedUnit.unit;
      if(!friendly) { console.warn('[GROUP] Cannot invite/kick: no unit'); return; }
      
      // Guards cannot join groups
      if(friendly.guard){
        ui.toast(`Guards cannot join your group - they defend flags.`);
        return;
      }
      
      if(!friendly.id){
        try{
          // Assign a stable ID and name if missing
          friendly.id = `f_${Date.now()}_${Math.floor(Math.random()*100000)}`;
          if(!friendly.name){ const base = friendly.variant||'ally'; friendly.name = `${String(base).charAt(0).toUpperCase()+String(base).slice(1)} ${Math.floor(Math.random()*999)+1}`; }
        }catch(e){ console.warn('[GROUP] Failed to assign id/name', e); }
      }
      
      const inGroup = state.group.members.includes(friendly.id);
      
      if(inGroup){
        // Kick from group
        ui.removeFromGroup(friendly.id);
        ui.toast(`${friendly.name || 'Ally'} removed from group.`);
        // Update buttons
        ui.btnInviteToGroup.textContent = 'Invite to Group';
        ui.btnInviteToGroup.classList.remove('secondary');
        if(ui.btnEditTarget){
          ui.btnEditTarget.disabled = true;
          ui.btnEditTarget.classList.add('secondary');
          ui.btnEditTarget.textContent = 'Invite to group to edit';
        }
      } else {
        // Invite to group
        ui.inviteToGroup(friendly);
        // Update buttons
        ui.btnInviteToGroup.textContent = 'Kick from Group';
        ui.btnInviteToGroup.classList.add('secondary');
        if(ui.btnEditTarget){
          ui.btnEditTarget.disabled = false;
          ui.btnEditTarget.classList.remove('secondary');
          ui.btnEditTarget.textContent = 'Edit Equipment & Abilities';
          ui.btnEditTarget.style.display = 'block';
        }
      }
    };
  }

  if(ui.btnEditTarget){
    ui.btnEditTarget.onclick = ()=>{
      if(!state.selectedUnit || state.selectedUnit.type !== 'friendly') return;
      const friendly = state.selectedUnit.unit;
      if(!friendly) return;
      ensureFriendlyIdentity(friendly);
      const fid = friendly.id;
      if(!state.group.members.includes(fid)){
        ui.toast('Invite this ally to the group to edit their gear.');
        return;
      }
      ui._editAllyEquipment(fid);
    };
  }

  ui.updateUnitInspection = ()=>{
    if(!state.selectedUnit) return;
    const {unit, type} = state.selectedUnit;
    // Check if unit is still alive
    if(unit.hp <= 0 || unit.respawnT > 0 || unit.dead){
      ui.closeUnitPanel.onclick(); // Auto-close if dead
      return;
    }
    // Update live stats
    ui.unitHP.textContent = `${Math.round(unit.hp || 0)}/${Math.round(unit.maxHp || 100)}`;
    ui.unitDMG.textContent = Math.round((unit.contactDmg || unit.dmg || 0));
    ui.unitSpeed.textContent = Math.round(unit.speed || 0);
    if(type === 'friendly') setAllyBehaviorDesc(unit);
    if(ui.btnEditTarget){
      if(type === 'friendly'){
        const inGroup = state.group.members.includes(unit.id);
        ui.btnEditTarget.style.display = 'block';
        ui.btnEditTarget.disabled = !inGroup;
        ui.btnEditTarget.classList.toggle('secondary', !inGroup);
        ui.btnEditTarget.textContent = inGroup ? 'Edit Equipment & Abilities' : 'Invite to group to edit';
      } else {
        ui.btnEditTarget.style.display = 'none';
      }
    }
    // Update Invite/Kick button
    if(ui.btnInviteToGroup && type === 'friendly'){
      const inGroup = state.group.members.includes(unit.id);
      ui.btnInviteToGroup.textContent = inGroup ? 'Kick from Group' : 'Invite to Group';
      ui.btnInviteToGroup.classList.toggle('secondary', inGroup);
    }

    // Update active abilities (from npcAbilities)
    const abilityList = [];
    try{
      if(unit.npcAbilities && unit.npcAbilities.length){
        for(const ab of unit.npcAbilities){
          if(!ab || !ab.id) continue;
          const meta = ABILITY_META?.[ab.id];
          if(!meta) continue;
          
          const name = (ab.id||'').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const cooldownRemaining = Math.max(0, (ab.usedAt || 0) + (meta.cd || 0) - (state.campaign?.time || 0));
          const cdText = cooldownRemaining > 0 ? `${cooldownRemaining.toFixed(1)}s CD` : 'Ready';
          const cdClass = cooldownRemaining > 0 ? 'ability-cooldown' : 'ability-ready';
          
          abilityList.push({ name, cdText, cdClass, cd: meta.cd || 0 });
        }
      }
    }catch(e){
      console.error('Failed to build ability list:', e);
    }
    
    // Render abilities
    const abilityPill = (name, cdText, cdClass)=>{
      return `<span class="ability-pill ${cdClass}"><span class="ability-icon">⚔</span><span class="ability-text"><span class="ability-label">${name}</span><span class="ability-sub">${cdText}</span></span></span>`;
    };
    const abilityHtml = abilityList.map(a => abilityPill(a.name, a.cdText, a.cdClass)).join('');
    if(ui.unitAbilities){
      ui.unitAbilities.innerHTML = abilityHtml || '<span style="color:#888">None</span>';
    }

    // Update active effects (HoTs detected from global heals + unit dots/buffs)
    const hotEffects = [];
    const dotEffects = [];
    const buffEffects = [];
    try{
      for(const h of state.effects.heals||[]){
        // direct target list
        if(h.targets && h.targets.includes(unit)){
          const tl = Math.max(0, h.t);
          const tick = h.tick || h.tl || 1.0;
          const amt = h.amt || 0;
          hotEffects.push({ name:'HoT', amt:Math.round(amt), tick, tl:tl, stacks:h.stacks||1 });
        }
        // beacon area check
        if(h.beacon){
          const d = Math.hypot(unit.x - h.beacon.x, unit.y - h.beacon.y);
          if(d <= (h.beacon.r||0)){
            const tl = Math.max(0, h.t);
            const tick = h.tick || h.tl || 1.0;
            const amt = h.amt || 0;
            hotEffects.push({ name:'HoT (Beacon)', amt:Math.round(amt), tick, tl:tl, stacks:h.stacks||1 });
          }
        }
      }
    }catch{}
    // Add DoTs from unit
    try{
      if(unit.dots && unit.dots.length){
        for(const d of unit.dots){
          const name = DOT_REGISTRY?.[d.id]?.name || (d.id||'DoT').replace(/_/g,' ');
          const tl = Math.max(0, d.t);
          const tick = d.tl ?? DOT_REGISTRY?.[d.id]?.interval ?? 1.0;
          const dmg = d.damage ?? DOT_REGISTRY?.[d.id]?.damage ?? 0;
          dotEffects.push({ name:`${name}`, dmg:Math.round(dmg), tick, tl, stacks:d.stacks||1 });
        }
      }
    }catch{}
    // Add Buffs from unit
    try{
      if(unit.buffs && unit.buffs.length){
        for(const b of unit.buffs){
          const name = BUFF_REGISTRY?.[b.id]?.name || (b.id||'Buff').replace(/_/g,' ');
          const tl = Math.max(0, b.t ?? b.duration ?? 0);
          buffEffects.push({ name, tl, stacks:b.stacks||1 });
        }
      }
    }catch{}
    // Render compact pills with icons and stacks
    const pill = (type, label, sub, stacks=1)=>{
      const cls = type==='hot'?'hot':type==='dot'?'dot':'buff';
      const icon = type==='hot'?'✚':type==='dot'?'☠':'★';
      const stackHtml = stacks>1 ? `<span class="effect-stack">x${stacks}</span>` : '';
      return `<span class="effect-pill ${cls}"><span class="effect-icon">${icon}</span><span class="effect-text"><span class="effect-label">${label}${stackHtml}</span><span class="effect-sub">${sub}</span></span></span>`;
    };
    const parts = [];
    for(const h of hotEffects){ parts.push(pill('hot', h.name || 'HoT', `+${Math.round(h.amt)} / ${h.tick.toFixed(1)}s • ${h.tl.toFixed(1)}s`, h.stacks||1)); }
    for(const d of dotEffects){ parts.push(pill('dot', d.name || 'DoT', `-${Math.round(d.dmg)} / ${d.tick.toFixed(1)}s • ${d.tl.toFixed(1)}s`, d.stacks||1)); }
    for(const b of buffEffects){ parts.push(pill('buff', b.name || 'Buff', `${b.tl.toFixed(1)}s`, b.stacks||1)); }
    ui.unitEffects.innerHTML = parts.length ? parts.join('') : '<span style="color:#888">None</span>';
  };

  ui.closeUnitPanel.onclick = ()=>{ ui.unitInspectionPanel.style.display = 'none'; ui.unitInspectionContent.style.display = 'none'; state.selectedUnit = null; };

  // Hide unit inspection panel (called when selected unit dies)
  ui.hideUnitPanel = ()=>{ 
    ui.unitInspectionPanel.style.display = 'none'; 
    ui.unitInspectionContent.style.display = 'none'; 
    state.selectedUnit = null; 
  };

  ui.renderHud = (st)=>{
    ui.enemyCount.textContent = state.enemies.length;
    ui.allyCount.textContent = state.friendlies.filter(a=>a.respawnT<=0).length;
    ui.pPts.textContent = Math.floor(state.campaign.playerPoints);
    ui.ePts.textContent = Math.floor(state.campaign.enemyPoints);
    ui.lvl.textContent = state.progression.level;
    ui.spText.textContent = state.progression.statPoints;
    
    // Update XP progress bar and level badge
    try {
      const xpMax = xpForNext(state.progression.level);
      const xpPercent = xpMax > 0 ? (state.progression.xp / xpMax) * 100 : 0;
      if(ui.xpFill) {
        ui.xpFill.style.width = `${Math.min(100, xpPercent)}%`;
      }
      if(ui.xpText) {
        ui.xpText.textContent = `${Math.floor(state.progression.xp)} / ${xpMax}`;
      }
      if(ui.levelNumber) {
        ui.levelNumber.textContent = state.progression.level;
      }
    } catch(e) {
      console.error('XP UI update error:', e);
    }
    
    // Update stats text with current/max values (fix NaN)
    const hp = Math.round(state.player.hp || 0);
    const maxHp = Math.round(st.maxHp || 100);
    const mana = Math.round(state.player.mana || 0);
    const maxMana = Math.round(st.maxMana || 100);
    const stam = Math.round(state.player.stam || 0);
    const maxStam = Math.round(st.maxStam || 100);
    const shield = Math.round(state.player.shield || 0);
    const xp = Math.round(state.progression.xp || 0);
    const xpNext = Math.round(xpForNext(state.progression.level || 1));
    
    // Debug mana display if fallback is used
    if(st.maxMana === undefined || st.maxMana === 0){
      console.warn('[UI] maxMana fallback triggered! st.maxMana:', st.maxMana, 'Using fallback: 100');
      logDebug(state, 'MANA', 'UI fallback triggered', { 
        stMaxMana: st.maxMana, 
        fallbackUsed: true,
        basePlayerMaxMana: state.basePlayer?.maxMana 
      });
    }
    
    ui.hpText.textContent = `${hp}/${maxHp}`;
    ui.manaText.textContent = `${mana}/${maxMana}`;
    ui.stamText.textContent = `${stam}/${maxStam}`;
    ui.xpText.textContent = `${xp}/${xpNext}`;
    ui.updateGoldDisplay();
    
    // Update kill counter display
    if(ui.killCounterValue){
      ui.killCounterValue.textContent = state.player.kills || 0;
    }
    if(ui.biggestBombValue){
      ui.biggestBombValue.textContent = state.player.biggestBomb || 0;
    }

    // Update bar widths
    ui.hpFill.style.width = `${clamp(hp/maxHp,0,1)*100}%`;
    ui.manaFill.style.width = `${clamp(mana/maxMana,0,1)*100}%`;
    ui.stamFill.style.width = `${clamp(stam/maxStam,0,1)*100}%`;
    // Shield bar should fill 100% when at max shield (cap=maxHP)
    const shieldPercent = clamp(shield/maxHp,0,1)*100;
    ui.shieldFill.style.width = `${shieldPercent}%`;
    ui.xpFill.style.width = `${clamp(xp/xpNext,0,1)*100}%`;
    
    // Update hero portrait based on class
    const classPortraits = {
      'warden': getAssetPath('assets/char/Warden Player head.png'),
      'mage': getAssetPath('assets/char/mage player head.png'),
      'knight': getAssetPath('assets/char/knight player head.png'),
      'warrior': getAssetPath('assets/char/Warior Player head.png')
    };
    const className = (state.player.className || 'warrior').toLowerCase();
    const portraitSrc = classPortraits[className] || classPortraits['warrior'];
    if(ui.heroPortraitImg.src !== portraitSrc){
      ui.heroPortraitImg.src = portraitSrc;
      ui.heroPortraitImg.style.display = 'block';
    }

    // Update buff icons HUD (above abilities)
    try { ui.updateBuffIconsHUD?.(); } catch(e) { console.error('updateBuffIconsHUD error:', e); }

    ui.hintText.innerHTML =
      `Move <span class="kbd">${nice(state.binds.moveUp)}</span><span class="kbd">${nice(state.binds.moveLeft)}</span><span class="kbd">${nice(state.binds.moveDown)}</span><span class="kbd">${nice(state.binds.moveRight)}</span>
       | Pick up <span class="kbd">${nice(state.binds.pickup)}</span>
       | Sprint <span class="kbd">${nice(state.binds.sprint)}</span>
       | Inventory <span class="kbd">${nice(state.binds.inventory)}</span>
       | Menu <span class="kbd">${nice(state.binds.menu)}</span>
       | Save <span class="kbd">F5</span><br/>
       Light <span class="kbd">LMB</span> | Heavy <span class="kbd">Hold LMB</span> | Block <span class="kbd">Hold RMB</span>`;
  };

  // Shared icon mapping for buffs/debuffs/skills/items (PNG overrides, otherwise emoji fallback)
  const ICON_IMAGES = {
    // Buff icons
    temporal_flux: getAssetPath('assets/Buff icons/Temporal Flux.PNG'),
    arcane_power: getAssetPath('assets/Buff icons/Arcane Power.PNG'),
    arcane_burn: getAssetPath('assets/Buff icons/Arcane Burn.png'),
    battle_fury: getAssetPath('assets/Buff icons/Battle Fury.PNG'),
    berserker_rage: getAssetPath('assets/Buff icons/Berserker Rage.PNG'),
    berserk: getAssetPath('assets/Buff icons/Berserker.PNG'),
    blessed: getAssetPath('assets/Buff icons/Blessed.PNG'),
    bleed: getAssetPath('assets/Buff icons/Bleed.png'),
    burn: getAssetPath('assets/Buff icons/burn.PNG'),
    clarity: getAssetPath('assets/Buff icons/clarity.PNG'),
    curse: getAssetPath('assets/Buff icons/curse.PNG'),
    divine_shield: getAssetPath('assets/Buff icons/devine shield.PNG'),
    flight: getAssetPath('assets/Buff icons/flight.png'),
    fortified: getAssetPath('assets/Buff icons/fortified.PNG'),
    guardian_stance: getAssetPath('assets/Buff icons/Guardian Stance.PNG'),
    haste: getAssetPath('assets/Buff icons/haste.PNG'),
    healing_empowerment: getAssetPath('assets/Buff icons/Healing Empowerment.PNG'),
    iron_will: getAssetPath('assets/Buff icons/Iron Will.PNG'),
    lucky: getAssetPath('assets/Buff icons/lucky.PNG'),
    mana_surge: getAssetPath('assets/Buff icons/mana surge.PNG'),
    poison: getAssetPath('assets/Buff icons/Poison.png'),
    radiance: getAssetPath('assets/Buff icons/Radiance.PNG'),
    regeneration: getAssetPath('assets/Buff icons/Regeneration.PNG'),
    root: getAssetPath('assets/Buff icons/root.PNG'),
    slow: getAssetPath('assets/Buff icons/slow.PNG'),
    sprint: getAssetPath('assets/Buff icons/sprint.png'),
    stealth: getAssetPath('assets/Buff icons/Stealth.png'),
    swift_strikes: getAssetPath('assets/Buff icons/Swift Strikes.PNG'),
    vigor: getAssetPath('assets/Buff icons/vigor.PNG'),
    // Skill icons
    arc_bolt: getAssetPath('assets/skill icons/Arc Bolt.png'),
    chain_light: getAssetPath('assets/skill icons/Chain Zap.png'),
    meteor_slam: getAssetPath('assets/skill icons/Meteor Slam.png'),
    piercing_lance: getAssetPath('assets/skill icons/Piercing Lance.png'),
    gravity_well: getAssetPath('assets/skill icons/Gravity Well.png'),
    warrior_cleave: getAssetPath('assets/skill icons/Rending Cleave.png'),
    warrior_life_leech: getAssetPath('assets/skill icons/Life Leech.png'),
    warrior_charge: getAssetPath('assets/skill icons/shoulder charge.png'),
    shoulder_charge: getAssetPath('assets/skill icons/shoulder charge.png'),
    warrior_fortitude: getAssetPath('assets/skill icons/Fortitude.png'),
    warrior_berserk: getAssetPath('assets/skill icons/Berserk.png'),
    mage_healing_burst: getAssetPath('assets/skill icons/heal burst.png'),
    renewal_field: getAssetPath('assets/skill icons/Renewal Field.png'),
    endurance: getAssetPath('assets/skill icons/Endurance.png'),
    spirit: getAssetPath('assets/skill icons/Spirit.png'),
    knight_shield_wall: getAssetPath('assets/skill icons/Ward Barrier.png')
  };

  // Item icon mapping - maps rarity + item type to PNG
  const ITEM_ICON_MAP = {
    // Weapons - Axes
    'common_axe': getAssetPath('assets/items/Common Axe.png'),
    'uncommon_axe': getAssetPath('assets/items/Uncommon Axe.png'),
    'rare_axe': getAssetPath('assets/items/Rare Axe.png'),
    'epic_axe': getAssetPath('assets/items/Epic Axe.png'),
    'legendary_axe': getAssetPath('assets/items/Legendary Axe.png'),
    // Weapons - Swords
    'common_sword': getAssetPath('assets/items/Common Sword.png'),
    'uncommon_sword': getAssetPath('assets/items/Uncommon Sword.png'),
    'rare_sword': getAssetPath('assets/items/Rare Sword.png'),
    'epic_sword': getAssetPath('assets/items/Epic Sword.png'),
    'legendary_sword': getAssetPath('assets/items/Legendary sword.png'),
    // Weapons - Daggers
    'common_dagger': getAssetPath('assets/items/Common Dagger.png'),
    'uncommon_dagger': getAssetPath('assets/items/Uncommon Dagger.png'),
    'rare_dagger': getAssetPath('assets/items/Rare Dagger.png'),
    'epic_dagger': getAssetPath('assets/items/Epic Dagger.png'),
    'legendary_dagger': getAssetPath('assets/items/Legendary Dagger.png'),
    // Weapons - Great Swords
    'common_greatsword': getAssetPath('assets/items/Common Great Sword.png'),
    'uncommon_greatsword': getAssetPath('assets/items/Uncommon Great Sword.png'),
    'rare_greatsword': getAssetPath('assets/items/Rare Great Sword.png'),
    'epic_greatsword': getAssetPath('assets/items/Epic Great Sword.png'),
    'legendary_greatsword': getAssetPath('assets/items/Legendary Great Sword.png'),
    // Weapons - Destruction Staffs
    'common_destruction_staff': getAssetPath('assets/items/Common Destruction Staff.png'),
    'uncommon_destruction_staff': getAssetPath('assets/items/Uncommon Destruction Staff.png'),
    'rare_destruction_staff': getAssetPath('assets/items/Rare Destruction Staff.png'),
    'epic_destruction_staff': getAssetPath('assets/items/Epic Destruction Staff.png'),
    'legendary_destruction_staff': getAssetPath('assets/items/Legendary Destruction Staff.png'),
    // Weapons - Healing Staffs
    'common_healing_staff': getAssetPath('assets/items/Common Healing Staff.png'),
    'uncommon_healing_staff': getAssetPath('assets/items/Uncommon Healing Staff.png'),
    'rare_healing_staff': getAssetPath('assets/items/Rare Healing Staff.png'),
    'epic_healing_staff': getAssetPath('assets/items/Epic Healing Staff.png'),
    'legendary_healing_staff': getAssetPath('assets/items/Legendary Healing Staff.png'),
    // Armor - Helms
    'common_helm': getAssetPath('assets/items/Common Helm.png'),
    'uncommon_helm': getAssetPath('assets/items/Uncommon Helm.png'),
    'rare_helm': getAssetPath('assets/items/Rare Helm.png'),
    'epic_helm': getAssetPath('assets/items/Epic Helm.png'),
    'legendary_helm': getAssetPath('assets/items/Legendary Helm.png'),
    // Armor - Chest
    'common_chest': getAssetPath('assets/items/Common Chest.png'),
    'uncommon_chest': getAssetPath('assets/items/Uncommon Chest.png'),
    'rare_chest': getAssetPath('assets/items/Rare Chest.png'),
    'epic_chest': getAssetPath('assets/items/Epic Chest.png'),
    'legendary_chest': getAssetPath('assets/items/Legendary Chest.png'),
    // Armor - Shoulders
    'common_shoulders': getAssetPath('assets/items/common shoulders.png'),
    'uncommon_shoulders': getAssetPath('assets/items/uncommon shoulders.png'),
    'rare_shoulders': getAssetPath('assets/items/Rare Shoulders.png'),
    'epic_shoulders': getAssetPath('assets/items/epic shoulders.png'),
    'legendary_shoulders': getAssetPath('assets/items/legendary shoulders.png'),
    // Armor - Hands
    'common_hands': getAssetPath('assets/items/common hands.png'),
    'uncommon_hands': getAssetPath('assets/items/uncommon hands.png'),
    'rare_hands': getAssetPath('assets/items/rare hands.png'),
    'epic_hands': getAssetPath('assets/items/epic hands.png'),
    'legendary_hands': getAssetPath('assets/items/legendary hands.png'),
    // Armor - Legs
    'common_legs': getAssetPath('assets/items/common legs.png'),
    'uncommon_legs': getAssetPath('assets/items/uncommon legs.png'),
    'rare_legs': getAssetPath('assets/items/rare legs.png'),
    'epic_legs': getAssetPath('assets/items/epic legs.png'),
    'legendary_legs': getAssetPath('assets/items/legendary legs.png'),
    // Armor - Feet
    'common_feet': getAssetPath('assets/items/common feet.png'),
    'uncommon_feet': getAssetPath('assets/items/uncommon feet.png'),
    'rare_feet': getAssetPath('assets/items/rare feet.png'),
    'epic_feet': getAssetPath('assets/items/epic feet.png'),
    'legendary_feet': getAssetPath('assets/items/legendary feet.png'),
    // Armor - Belts
    'common_belt': getAssetPath('assets/items/common belt.png'),
    'uncommon_belt': getAssetPath('assets/items/uncommon belt.png'),
    'rare_belt': getAssetPath('assets/items/rare belt.png'),
    'epic_belt': getAssetPath('assets/items/epic belt.png'),
    'legendary_belt': getAssetPath('assets/items/legendary belt.png'),
    // Armor - Bracelets
    'common_bracelet': getAssetPath('assets/items/common bracelet.png'),
    'uncommon_bracelet': getAssetPath('assets/items/uncommon bracelet.png'),
    'rare_bracelet': getAssetPath('assets/items/rare bracelet.png'),
    'epic_bracelet': getAssetPath('assets/items/epic bracelet.png'),
    'legendary_bracelet': getAssetPath('assets/items/legendary bracelet.png'),
    // Armor - Rings
    'common_ring': getAssetPath('assets/items/common ring.png'),
    'uncommon_ring': getAssetPath('assets/items/uncommon ring.png'),
    'rare_ring': getAssetPath('assets/items/rare ring.png'),
    'epic_ring': getAssetPath('assets/items/epic ring.png'),
    'legendary_ring': getAssetPath('assets/items/legendary ring.png'),
    // Armor - Necklaces (slot is 'neck')
    'common_neck': getAssetPath('assets/items/common necklace.png'),
    'uncommon_neck': getAssetPath('assets/items/uncommon necklace.png'),
    'rare_neck': getAssetPath('assets/items/rare necklace.png'),
    'epic_neck': getAssetPath('assets/items/epic necklace.png'),
    'legendary_neck': getAssetPath('assets/items/legendary necklace.png'),
    // Potions
    'hp_potion': getAssetPath('assets/items/HP Potion.png'),
    'mana_potion': getAssetPath('assets/items/Mana Potion.png')
  };

  // Helper to get item icon from item object
  function getItemIcon(item){
    if(!item) return null;
    
    // Handle potions
    if(item.kind === 'potion'){
      if(item.name?.toLowerCase().includes('health') || item.name?.toLowerCase().includes('hp')){
        return ITEM_ICON_MAP['hp_potion'];
      }
      if(item.name?.toLowerCase().includes('mana')){
        return ITEM_ICON_MAP['mana_potion'];
      }
      return null;
    }
    
    // Handle weapons and armor
    let rarity = (item.rarity?.key || 'common').toLowerCase();
    // Map 'legend' to 'legendary' for image filenames (ITEM_ICON_MAP uses 'legendary_' prefix)
    if(rarity === 'legend') rarity = 'legendary';
    let itemType = '';
    
    if(item.kind === 'weapon' && item.weaponType){
      // Normalize weapon type (e.g., "Great Sword" -> "greatsword", "Healing Staff" -> "healing_staff")
      itemType = item.weaponType.toLowerCase().replace(/\s+/g, '_');
    } else if(item.kind === 'armor' && item.slot){
      // For armor, use the slot (helm, chest, legs, etc.)
      // Special handling for accessories
      if(item.slot === 'accessory1' || item.slot === 'accessory2'){
        // Determine if it's a ring, bracelet, or necklace from the name
        if(item.name?.toLowerCase().includes('ring')){
          itemType = 'ring';
        } else if(item.name?.toLowerCase().includes('bracelet')){
          itemType = 'bracelet';
        } else if(item.name?.toLowerCase().includes('necklace')){
          itemType = 'necklace';
        }
      } else {
        itemType = item.slot;
      }
    }
    
    if(!itemType) return null;
    
    const key = `${rarity}_${itemType}`;
    const result = ITEM_ICON_MAP[key] || null;
    
    // Debug logging for uncommon helm (Hunter Hood)
    if(item.name?.includes('Hunter Hood')){
      console.log('[DEBUG Hunter Hood]', 'name:', item.name, 'kind:', item.kind, 'slot:', item.slot, 'rarity.key:', item.rarity?.key, 'itemType:', itemType, 'key:', key, 'mapResult:', result);
    }
    
    return result;
  }

  const ICON_FALLBACKS = {
    // Debuffs / DoTs
    poison:'☠', bleed:'🩸', burn:'🔥', arcane_burn:'✴', freeze:'❄', shock:'⚡', curse:'☠', weakness:'🪶', vulnerability:'🎯', slow:'🐌', root:'⛓', silence:'🔇', stun:'💫',
    // Buffs
    healing_empowerment:'✚', blessed:'✦', radiance:'☀', temporal_flux:'⏳', berserker_rage:'🗡', iron_will:'🛡', swift_strikes:'➤', arcane_power:'✷', battle_fury:'⚔', guardian_stance:'🛡',
    regeneration:'✚', mana_surge:'💧', vigor:'♥', spirit:'🔮', endurance:'⚡', fortified:'🛡', lifesteal_boost:'🩹',
    haste:'🏃', sprint:'🏃', flight:'🕊', focus:'🎯', clarity:'💡', stealth:'👁', divine_shield:'✨', lucky:'🍀',
    // Special
    emperor_power:'🔱',
    // Passives
    bulwark:'🛡', arcane_focus:'🔮', predator:'🐺', vital_soul:'♥', siphon:'🩹'
  };

  function renderEffectIcon(id, meta, isDebuff){
    const src = ICON_IMAGES[id];
    if(src){
      const alt = meta?.name || id;
      return `<img src="${src}" alt="${alt}" style="width:100%; height:100%; object-fit:cover; border-radius:3px;" />`;
    }
    const fallback = ICON_FALLBACKS[id] || (isDebuff ? '☠' : '★');
    return `<span style="font-size:20px;">${fallback}</span>`;
  }

  // Build item tooltip HTML
  function buildItemTooltip(item){
    if(!item) return '';
    
    let html = `<div style="font-weight:900; font-size:14px; color:${item.rarity.color}; margin-bottom:8px;">${item.name}</div>`;
    
    // Item level
    if(item.itemLevel){
      html += `<div style="font-size:11px; color:#6af; margin-bottom:6px;"><b>Item Level:</b> ${item.itemLevel}</div>`;
    }
    
    // Kind and slot
    if(item.kind === 'weapon'){
      html += `<div style="font-size:11px; color:#999; margin-bottom:6px;"><b>Type:</b> Weapon</div>`;
    } else if(item.kind === 'armor'){
      const slotName = SLOT_LABEL[item.slot] || item.slot;
      html += `<div style="font-size:11px; color:#999; margin-bottom:6px;"><b>Slot:</b> ${slotName}</div>`;
    }
    
    // Description
    html += `<div style="font-size:11px; color:#ccc; margin-bottom:8px; line-height:1.4;">${item.desc || ''}</div>`;
    
    // Stats from buffs
    if(item.buffs && Object.keys(item.buffs).length > 0){
      html += `<div style="font-weight:bold; color:#d4af37; font-size:10px; margin-bottom:4px;">Stats</div>`;
      html += `<div style="font-size:11px; color:#6f9; line-height:1.6;">`;
      for(const [stat, value] of Object.entries(item.buffs)){
        let statName = stat;
        let displayValue = value;
        
        // Format stat names
        if(stat === 'maxHp') statName = 'Max HP';
        else if(stat === 'maxMana') statName = 'Max Mana';
        else if(stat === 'maxStam') statName = 'Max Stamina';
        else if(stat === 'hpRegen') statName = 'HP Regen';
        else if(stat === 'manaRegen') statName = 'Mana Regen';
        else if(stat === 'stamRegen') statName = 'Stamina Regen';
        else if(stat === 'atk') statName = 'Attack';
        else if(stat === 'def') statName = 'Defense';
        else if(stat === 'speed') statName = 'Speed';
        else if(stat === 'critChance') { statName = 'Crit Chance'; displayValue = `${Math.round(value*100)}%`; }
        else if(stat === 'critMult') statName = 'Crit Multiplier';
        else if(stat === 'cdr') { statName = 'Cooldown Reduction'; displayValue = `${Math.round(value*100)}%`; }
        else if(stat === 'blockEff') { statName = 'Block Effectiveness'; displayValue = `${Math.round(value*100)}%`; }
        else if(stat === 'lifesteal') { statName = 'Lifesteal'; displayValue = `${Math.round(value*100)}%`; }
        
        const sign = value > 0 ? '+' : '';
        html += `<div>${sign}${displayValue} ${statName}</div>`;
      }
      html += `</div>`;
    }
    
    // Rarity
    html += `<div style="font-size:10px; color:#888; margin-top:6px;"><b>Rarity:</b> <span style="color:${item.rarity.color};">${item.rarity.name}</span></div>`;
    
    return html;
  }

  // Build active effect icons list for HUD and tab
  function buildActiveEffectIcons(state){
    const list = [];
    // Passives (permanent)
    try{
      for(const p of state.player.passives||[]){ if(!p) continue; const meta=null; const icon=renderEffectIcon(p.id, meta, false); const title=`${p.name}`; const desc=`${p.details||p.desc||''}`; list.push({ html:`<div class="buffIcon passive" data-title="${title}" data-desc="${desc}">${icon}</div>` }); }
    }catch{}
    // Buffs
    try{
      for(const b of state.player.buffs||[]){ const meta=BUFF_REGISTRY[b.id]; const deb=!!meta?.debuff; const icon=renderEffectIcon(b.id, meta, deb); const title=`${b.name||meta?.name||b.id}`; const desc=b.id==='emperor_power'?'Permanent: +3x HP, Mana, Stamina, 50% Cooldown Reduction':`${deb?'Debuff':'Buff'} — ${meta?.desc||''}`; const timer=b.duration===Infinity||b.id==='emperor_power'?'∞':(b.t||0).toFixed(1)+'s'; const stack=(b.stacks||1)>1?`<span class="stack">x${b.stacks||1}</span>`:''; list.push({ html:`<div class="buffIcon ${deb?'debuff':'buff'}" data-title="${title}" data-desc="${desc}">${icon}<span class="timer">${timer}</span>${stack}</div>` }); }
    }catch{}
    // DoTs (on player)
    try{
      for(const d of state.player.dots||[]){ const meta=DOT_REGISTRY[d.id]; const icon=renderEffectIcon(d.id, meta, true); const title=`${meta?.name||d.id}`; const desc=`DoT — ${Math.round(d.damage||meta?.damage||0)} per ${(meta?.interval||d.tl||1.0)}s`; const timer=(d.t||0).toFixed(1)+'s'; const stack=(d.stacks||1)>1?`<span class="stack">x${d.stacks||1}</span>`:''; list.push({ html:`<div class="buffIcon debuff" data-title="${title}" data-desc="${desc}">${icon}<span class="timer">${timer}</span>${stack}</div>` }); }
    }catch{}
    return list;
  }

  // HUD updater for buff icons
  ui.updateBuffIconsHUD = ()=>{
    if(!ui.buffIconsHud) return;
    const icons = buildActiveEffectIcons(state);
    ui.buffIconsHud.innerHTML = icons.map(i=>i.html).join('');
    // Hide container if no icons to avoid showing an empty bar
    ui.buffIconsHud.style.display = icons.length ? 'flex' : 'none';
    // Reposition to sit directly above bottomStats
    ui._positionBuffIconsHUD();
  };

  // AI behavior feed (uses state.debugAiBehavior from AI logic)
  ui.updateAiFeed = ()=>{
    const el = document.getElementById('aiFeed');
    if(!el) return;
    // Check both friendly and enemy filters
    const showFriendly = state.options?.showDebugAI === true;
    const showEnemy = state.options?.showDebugAIEnemies === true;
    if(!showFriendly && !showEnemy){ el.style.display='none'; return; }
    const events = state.debugAiBehavior || [];
    if(!events.length){ el.style.display='none'; return; }
    el.style.display='block';
    // Filter by friendly/enemy option
    const filtered = events.filter(ev => (ev.kind === 'friendly' && showFriendly) || (ev.kind === 'enemy' && showEnemy));
    const recent = filtered.slice(-10);
    el.innerHTML = '<div style="color:#d4af37;font-weight:bold;margin-bottom:4px;font-size:9px;">AI Priority State</div>' + recent.map(ev=>{
      const t = Math.round((ev.t||0)*10)/10;
      const nm = (ev.unit||'npc');
      const behavior = ev.behavior||'unknown';
      const detail = ev.detail ? ` → ${ev.detail}` : '';
      const color = ev.kind === 'enemy' ? '#ff6b6b' : '#6bff6b';
      
      // Color code by behavior type
      let behaviorColor = '#999';
      if(behavior === 'state') behaviorColor = '#ffc86b'; // Current state
      else if(behavior === 'priority_change') behaviorColor = '#64b5f6'; // Priority changed
      
      return `<div><span style="color:#6cf">${t}s</span> <b style="color:${color}">${nm}</b> <span style="color:${behaviorColor}">${behavior}</span>${detail}</div>`;
    }).join('');
  };

  // Position buff icons above ability bar
  ui._positionBuffIconsHUD = ()=>{
    try{
      if(!ui.buffIconsHud) return;
      // Fixed position above ability bar
      ui.buffIconsHud.style.bottom = '120px';
    }catch{}
  };

  // Keep position in sync on resize
  try{ window.addEventListener('resize', ()=>ui._positionBuffIconsHUD()); }catch{}

  // update compact bottom bar (shown when main HUD is hidden)
  ui._renderBottomBar = ()=>{
    const st = currentStats(state);
    ui.b_hpText.textContent = `${Math.round(state.player.hp)}/${Math.round(st.maxHp)}`;
    ui.b_manaText.textContent = `${Math.round(state.player.mana)}/${Math.round(st.maxMana)}`;
    ui.b_stamText.textContent = `${Math.round(state.player.stam)}/${Math.round(st.maxStam)}`;
    ui.b_hpFill.style.width = `${clamp(state.player.hp/st.maxHp,0,1)*100}%`;
    ui.b_manaFill.style.width = `${clamp(state.player.mana/st.maxMana,0,1)*100}%`;
    ui.b_stamFill.style.width = `${clamp(state.player.stam/st.maxStam,0,1)*100}%`;
  };

  ui.renderAbilityBar = ()=>{
    ui.abilBar.innerHTML='';
    
    const tooltip = document.getElementById('abilTooltip');
    const tooltipContent = document.getElementById('abilTooltipContent');
    
    const showTooltip = (html)=>{
      if(tooltip && tooltipContent){
        tooltipContent.innerHTML = html;
        tooltip.style.display = 'block';
      }
    };
    const hideTooltip = ()=>{
      if(tooltip) tooltip.style.display = 'none';
    };
    
    // Potion slot (left of abilities)
    const potionEl = document.createElement('div');
    potionEl.className = 'abilSlot';
    potionEl.style.position = 'relative';
    potionEl.style.padding = '0';
    const potion = state.player.potion;
    const potionIcon = potion ? getItemIcon(potion) : null;
    
    potionEl.innerHTML = potionIcon
      ? `<img src="${potionIcon}" style="width:100%; height:100%; object-fit:contain; pointer-events:none; position:absolute; top:0; left:0;" />
         <div class="abilKey" style="position:absolute; top:4px; left:4px; text-shadow:0 0 4px rgba(0,0,0,0.9);">${nice(state.binds['potion'])}</div>
         <div class="abilName" style="position:absolute; bottom:16px; left:0; right:0; text-align:center; text-shadow:0 0 4px rgba(0,0,0,0.9);">${potion.name}</div>
         <div class="abilMeta" style="position:absolute; bottom:2px; left:0; right:0; text-align:center; font-size:9px; text-shadow:0 0 4px rgba(0,0,0,0.9);">x${potion.count || 1}</div>
         <div class="cdOverlay" id="cdOvPotion"></div>`
      : `<div class="abilKey">${nice(state.binds['potion'])}</div>
         <div class="abilName">No Potion</div>
         <div class="abilMeta">Equip from Inventory</div>
         <div class="cdOverlay" id="cdOvPotion"></div>`;
    
    if(potion){
      potionEl.addEventListener('mouseenter', ()=>{
        const buffsText = potion.buffs ? Object.entries(potion.buffs).map(([k,v])=>`<span style="color:var(--common)">+${typeof v==='number'? (Math.abs(v)<1? (v*100).toFixed(0)+'%' : v) : v} ${k}</span>`).join(', ') : '';
        showTooltip(`<div style="font-weight:900; color:${potion.rarity?.color || '#fff'}; margin-bottom:4px">${potion.name}</div><div style="color:#aaa; margin-bottom:8px">${potion.desc || 'Restores health or mana over time'}</div>${buffsText ? `<div>${buffsText}</div>` : ''}<div style="color:#999; margin-top:8px">Quantity: ${potion.count || 1}</div>`);
      });
      potionEl.addEventListener('mouseleave', hideTooltip);
    }
    
    ui.abilBar.appendChild(potionEl);
    
    for(let i=0;i<5;i++){
      const sk=getSkillById(state.abilitySlots[i]);
      const el=document.createElement('div');
      el.className='abilSlot';
      el.style.position='relative';
      el.style.padding='0';
      
      // Get icon from ABILITIES object (same as skills tab)
      const ability = sk ? ABILITIES[sk.id] : null;
      const iconSrc = ability?.icon ? getAssetPath(`assets/skill icons/${ability.icon}`) : null;
      
      el.innerHTML = iconSrc
        ? `<img src="${iconSrc}" style="width:100%; height:100%; object-fit:contain; pointer-events:none; position:absolute; top:0; left:0;" />
           <div class="abilKey" style="position:absolute; top:4px; left:4px; text-shadow:0 0 4px rgba(0,0,0,0.9);">${nice(state.binds['abil'+(i+1)])}</div>
           <div class="abilName" style="position:absolute; bottom:16px; left:0; right:0; text-align:center; text-shadow:0 0 4px rgba(0,0,0,0.9);">${sk.name}</div>
           <div class="abilMeta" style="position:absolute; bottom:2px; left:0; right:0; text-align:center; font-size:9px; text-shadow:0 0 4px rgba(0,0,0,0.9);">${`Mana ${sk.mana}, CD ${sk.cd}s`}</div>
           <div class="cdOverlay" id="cdOv${i}"></div>
           <div class="cdText" id="cdTx${i}"></div>`
        : `<div class="abilKey">${nice(state.binds['abil'+(i+1)])}</div>
           <div class="abilName">${sk?sk.name:'None'}</div>
           <div class="abilMeta">${sk?`Mana ${sk.mana}, CD ${sk.cd}s`:'Assign via Skills (I)'}</div>
           <div class="cdOverlay" id="cdOv${i}"></div>
           <div class="cdText" id="cdTx${i}"></div>`;
      
      if(sk){
        el.addEventListener('mouseenter', ()=>{
          const color = sk.category?.includes('Exclusive') ? 'var(--epic)' : sk.category?.includes('Weapons') ? 'var(--rare)' : 'var(--uncommon)';
          let html = `<div style="font-weight:900; color:${color}; margin-bottom:4px">${sk.name}</div>`;
          html += `<div style="color:#aaa; margin-bottom:8px">${sk.desc || ''}</div>`;
          html += `<div style="margin-bottom:8px">${sk.details || ''}</div>`;
          
          const stats = [];
          if(sk.mana) stats.push(`<span style="color:var(--mana)">💧 ${sk.mana} Mana</span>`);
          if(sk.cd) stats.push(`<span style="color:var(--uncommon)">⏱️ ${sk.cd}s CD</span>`);
          if(sk.range) stats.push(`<span style="color:#aaa">📏 ${sk.range}m Range</span>`);
          if(sk.radius) stats.push(`<span style="color:#aaa">💥 ${sk.radius}m Radius</span>`);
          if(sk.castTime) stats.push(`<span style="color:#aaa">⚡ ${sk.castTime}s Cast</span>`);
          if(stats.length > 0) html += `<div style="margin-bottom:8px">${stats.join(' • ')}</div>`;
          
          if(sk.scaling) html += `<div style="color:var(--common); margin-bottom:4px">${sk.scaling}</div>`;
          if(sk.target) html += `<div style="color:#999">Target: ${sk.target}</div>`;
          
          const extras = [];
          if(sk.dots && sk.dots.length > 0) extras.push(`<span style="color:#f66">DoTs: ${sk.dots.join(', ')}</span>`);
          if(sk.buffs && sk.buffs.length > 0) extras.push(`<span style="color:var(--rare)">Buffs: ${sk.buffs.join(', ')}</span>`);
          if(extras.length > 0) html += `<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1)">${extras.join(' • ')}</div>`;
          
          showTooltip(html);
        });
        el.addEventListener('mouseleave', hideTooltip);
      }
      
      ui.abilBar.appendChild(el);
    }
  };

  ui.renderCooldowns = ()=>{
    for(let i=0;i<5;i++){
      const cd=state.player.cd[i];
      const ov=document.getElementById('cdOv'+i);
      const tx=document.getElementById('cdTx'+i);
      if(!ov||!tx) continue;
      if(cd>0){ ov.style.display='block'; tx.style.display='block'; tx.textContent=cd.toFixed(1); }
      else { ov.style.display='none'; tx.style.display='none'; }
    }
  };

  ui.renderEquippedList = ()=>{
    const isGroupMemberMode = state.groupMemberInventoryMode;
    const equipTarget = isGroupMemberMode ? state.group.settings[isGroupMemberMode]?.equipment : state.player.equip;
    if(!equipTarget || !ui.equipCircle) return;

    // Reset containers
    const heroCls = isGroupMemberMode ? (state.friendlies.find(f=>f.id===isGroupMemberMode)?.variant||'warrior') : (state.player.class||'warrior');
    const heroImgMap = { warrior: 'New Warrior.png', mage: 'New Mage.png', knight: 'New Knight.png', warden: 'New Warden.png' };
    const heroImg = heroImgMap[heroCls] || `${heroCls}.svg`;
    ui.equipCircle.innerHTML = `<img id="heroPortrait" src="${getAssetPath('assets/char/' + heroImg)}" alt="Hero" class="heroLarge"/>`;
    ui.equipExtras.innerHTML = '';
    ui.weaponSlot.innerHTML = '';

    // Circle layout: helm at top, 3 slots on left, 3 slots on right
    const circleSlots = ['helm','chest','belt','legs','shoulders','hands','feet'];
    const angles = [-90, -150, 180, 150, -30, 0, 30]; // helm top, 3 left, 3 right
    const circleRect = ui.equipCircle.getBoundingClientRect();
    const radius = Math.max(200, Math.min(circleRect.width, circleRect.height)/2 - 25); // Increased radius to push slots outward
    const centerX = (ui.equipCircle.clientWidth || 480)/2;
    const centerY = (ui.equipCircle.clientHeight || 480)/2;
    circleSlots.forEach((slot, idx)=>{
      const it = equipTarget[slot];
      const a = angles[idx] * Math.PI/180;
      let x = centerX + radius * Math.cos(a) - 35; // slot size 70
      let y = centerY + radius * Math.sin(a) - 35;
      // Clamp to container to avoid going off-UI
      const maxX = (ui.equipCircle.clientWidth || 480) - 70;
      const maxY = (ui.equipCircle.clientHeight || 480) - 70;
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));
      const el = document.createElement('div');
      el.className = 'equipSlot' + (state.selectedEquipSlot === slot ? ' active' : '');
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
      el.title = SLOT_LABEL[slot];
      const imgPath = it ? getItemImage(it) : null;
      if(it && imgPath){
        el.innerHTML = `<img src="${imgPath}" alt="${it.name}" style="width:100%; height:100%; object-fit:contain; border-radius:4px;"/>`;
      } else if(it){
        el.innerHTML = `<div style="text-align:center"><div style="color:${it.rarity.color}">${SLOT_LABEL[slot]}</div><div class="${rarityClass(it.rarity.key)}" style="font-size:10px">${it.name}</div></div>`;
      } else {
        el.innerHTML = `<div style="text-align:center"><div>${SLOT_LABEL[slot]}</div><div class="small" style="color:#aaa">None</div></div>`;
      }
      el.onclick = ()=>{
        const now = performance.now ? performance.now() : Date.now();
        const key = `equip-${slot}`;
        const last = ui._lastInvClick;
        if(last && last.key === key && now - last.t < 350){ state.selectedEquipSlot = slot; state.selectedIndex=-1; ui.equipSelected && ui.equipSelected(); ui._lastInvClick=null; return; }
        ui._lastInvClick = { key, t: now };
        state.selectedEquipSlot = it ? slot : null; state.selectedIndex=-1; ui.updateInventorySelection();
      };
      
      // Add tooltip on hover
      if(it){
        el.onmouseenter = (e) => {
          const tooltipHtml = buildItemTooltip(it);
          ui.showBuffTooltip('', tooltipHtml, e.target);
        };
        el.onmouseleave = () => {
          ui.hideBuffTooltip();
        };
      }
      
      ui.equipCircle.appendChild(el);
    });

    // All slots right-aligned in one row: Weapon | Neck | Ring | Potion
    // Using flexbox for even spacing
    const allSlots = [
      { key: 'weapon', item: equipTarget['weapon'] },
      { key: 'neck', item: equipTarget['neck'] },
      { key: 'accessory1', item: equipTarget['accessory1'] },
      { key: 'potion', item: state.player.potion }
    ];
    
    allSlots.forEach(({ key, item })=>{
      const el = document.createElement('div');
      el.className = 'equipSlot' + (state.selectedEquipSlot === key ? ' active' : '');
      el.style.position = 'relative';
      el.title = SLOT_LABEL[key];
      
      // Special handling for potion slot
      if(key === 'potion'){
        const potionIcon = item ? getItemIcon(item) : null;
        if(item && potionIcon){
          el.innerHTML = `<img src="${potionIcon}" alt="${item.name}" style="width:100%; height:100%; object-fit:contain; border-radius:4px;"/>
                          <div style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.7); padding:2px 4px; border-radius:3px; font-size:10px; color:#fff;">x${item.count || 1}</div>`;
        } else if(item){
          el.innerHTML = `<div style="text-align:center"><div style="color:${item.rarity?.color || '#fff'}">${SLOT_LABEL[key]}</div><div class="${rarityClass(item.rarity?.key || 'common')}" style="font-size:10px">${item.name}</div></div>`;
        } else {
          el.innerHTML = `<div style="text-align:center"><div>${SLOT_LABEL[key]}</div><div class="small" style="color:#aaa">None</div></div>`;
        }
      } else {
        // Normal equipment handling
        const imgPath = item ? getItemImage(item) : null;
        if(item && imgPath){
          el.innerHTML = `<img src="${imgPath}" alt="${item.name}" style="width:100%; height:100%; object-fit:contain; border-radius:4px;"/>`;
        } else if(item){
          el.innerHTML = `<div style="text-align:center"><div style="color:${item.rarity.color}">${SLOT_LABEL[key]}</div><div class="${rarityClass(item.rarity.key)}" style="font-size:10px">${item.name}</div></div>`;
        } else {
          el.innerHTML = `<div style="text-align:center"><div>${SLOT_LABEL[key]}</div><div class="small" style="color:#aaa">None</div></div>`;
        }
      }
      
      el.onclick = ()=>{
        const now = performance.now ? performance.now() : Date.now();
        const clickKey = `equip-${key}`;
        const last = ui._lastInvClick;
        if(last && last.key === clickKey && now - last.t < 350){ state.selectedEquipSlot = key; state.selectedIndex=-1; ui.equipSelected && ui.equipSelected(); ui._lastInvClick=null; return; }
        ui._lastInvClick = { key: clickKey, t: now };
        state.selectedEquipSlot = item ? key : null; state.selectedIndex=-1; ui.updateInventorySelection();
      };
      
      // Add tooltip on hover
      if(item){
        el.onmouseenter = (e) => {
          const tooltipHtml = buildItemTooltip(item);
          ui.showBuffTooltip('', tooltipHtml, e.target);
        };
        el.onmouseleave = () => {
          ui.hideBuffTooltip();
        };
      }
      
      ui.equipExtras.appendChild(el);
    });
  };

  function invSlotLabel(it){
    if(it.kind==='armor') return it.slot.toUpperCase();
    if(it.kind==='weapon') return 'WEAPON';
    if(it.kind==='potion') return `${it.type==='hp' ? 'HP' : 'MANA'} x${it.count || 1}`;
    return it.type==='hp' ? 'HP' : 'MANA';
  }

  // Check if an item is equipped on another hero (not current hero)
  function isEquippedOnOtherHero(item){
    const currentClass = state.currentHero || 'warrior';
    if(item.kind !== 'armor' && item.kind !== 'weapon') return false;
    for(const [heroClass, equip] of Object.entries(state.heroEquip)){
      if(heroClass === currentClass) continue; // skip current hero
      if(equip[item.slot] === item) return true; // item is equipped on another hero
    }
    return false;
  }

  // Calculate item overall rating (no decimals)
  function calculateItemRating(item){
    if(!item || !item.buffs) return 0;
    let rating = 0;
    const buffs = item.buffs;
    // Weight different stats
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
    // Add rarity bonus
    const rarityBonus = { common: 0, uncommon: 10, rare: 30, epic: 60, legend: 120 };
    rating += rarityBonus[item.rarity?.key || 'common'] || 0;
    return Math.round(rating);
  }

  // Compare item to currently equipped item of same slot
  function compareItemToEquipped(item, equip){
    if(!item || !item.slot || !equip) return 0;
    const equipped = equip[item.slot];
    if(!equipped) return 1; // Better than nothing
    const itemRating = calculateItemRating(item);
    const equippedRating = calculateItemRating(equipped);
    if(itemRating > equippedRating) return 1; // Better
    if(itemRating < equippedRating) return -1; // Worse
    return 0; // Same
  }

  ui.renderInventory = ()=>{
    // Determine if we're showing player inventory or group member inventory
    const isGroupMemberMode = state.groupMemberInventoryMode;
    let targetUnit = null;
    let targetSettings = null;
    
    if(isGroupMemberMode){
      targetUnit = state.friendlies.find(f => f.id === isGroupMemberMode);
      targetSettings = state.group.settings[isGroupMemberMode];
      if(!targetUnit || !targetSettings){
        // Exit group member mode if unit not found
        state.groupMemberInventoryMode = null;
        ui.toggleInventory(false);
        return;
      }
    }
    const equip = isGroupMemberMode ? targetSettings?.equipment : state.player.equip;
    ui.updateGoldDisplay();
    
    // Display mode header and add a small switch button when editing a member
    if(ui.heroClassName){
      if(isGroupMemberMode){
        ui.heroClassName.textContent = `${targetSettings.name} - Equipment`;
        ui.heroClassName.style.color = '#4a9eff';
        // Insert or update a small switch button next to the header
        try{
          const headerEl = ui.heroClassName.parentElement;
          if(headerEl){
            let backBtn = headerEl.querySelector('#invSwitchToPlayer');
            if(!backBtn){ backBtn = document.createElement('button'); backBtn.id='invSwitchToPlayer'; backBtn.className='secondary'; backBtn.style.marginLeft='8px'; backBtn.style.padding='4px 8px'; backBtn.style.fontSize='11px'; headerEl.appendChild(backBtn); }
            backBtn.textContent = 'Switch to Player';
            backBtn.onclick = ()=>{ state.groupMemberInventoryMode = null; ui.renderInventory(); ui.renderSkills(); ui.renderLevel(); };
            if(ui.btnSelectHero){ ui.btnSelectHero.textContent = 'Select Character (player only)'; ui.btnSelectHero.disabled = true; ui.btnSelectHero.classList.add('secondary'); }
          }
        }catch{}
      } else {
        ui.heroClassName.textContent = (state.player.class || 'warrior').replace(/^./, c=>c.toUpperCase());
        ui.heroClassName.style.color = '#fff';
        try{
          const headerEl = ui.heroClassName.parentElement;
          const backBtn = headerEl && headerEl.querySelector('#invSwitchToPlayer');
          if(backBtn) backBtn.remove();
          if(ui.btnSelectHero){ ui.btnSelectHero.textContent = 'Select Character'; ui.btnSelectHero.disabled = false; ui.btnSelectHero.classList.remove('secondary'); }
        }catch{}
      }
    }
    
    // update inventory armor rating stars (5/5 only if all equipped armor is Legendary)
    try{
      const slots = ARMOR_SLOTS.filter(s=>s!=='weapon');
      let score=0, total=slots.length, allLegend=true;
      const equipSet = equip || {};
      for(const s of slots){
        const it=equipSet[s];
        if(!it){ allLegend=false; continue; }
        const k = it.rarity?.key || 'common';
        if(k!=='legend') allLegend=false;
        const w = k==='legend'?1 : k==='epic'?0.6 : k==='rare'?0.4 : k==='uncommon'?0.2 : 0.1;
        score += w;
      }
      const stars = allLegend ? 5 : Math.max(0, Math.floor(5 * (score/Math.max(1,total))));
      const starStr = '★★★★★'.slice(0,stars) + '☆☆☆☆☆'.slice(stars);
      if(ui.invArmorStars) ui.invArmorStars.textContent = starStr;
      if(ui.invArmorText) ui.invArmorText.textContent = `${stars}/5`;
    }catch(e){}
    
    // hero portrait
    try{
      const cls = isGroupMemberMode ? (targetUnit.variant || 'warrior') : (state.player.class || 'warrior');
      // Use PNG for all hero classes (newer images)
      const heroImgMap = { warrior: 'New Warrior.png', mage: 'New Mage.png', knight: 'New Knight.png', warden: 'New Warden.png' };
      ui.heroPortrait.src = getAssetPath(`assets/char/${heroImgMap[cls] || cls + '.svg'}`);
      if(!isGroupMemberMode){
        ui.heroClassName.textContent = cls.charAt(0).toUpperCase()+cls.slice(1);
        ui.heroClassName.style.color = '#fff';
        ui.heroLevel.textContent = state.progression.level || 1;
      } else {
        // For group members, show their level (currently they don't level up, so show player level as reference)
        ui.heroLevel.textContent = targetUnit.level || state.progression.level || 1;
      }
    }catch(e){}
    
    ui.renderEquippedList();
    ui.invGrid.innerHTML='';
    
    // Get filter selection
    const filterDropdown = document.getElementById('invFilterDropdown');
    const filterValue = filterDropdown ? filterDropdown.value : 'all';
    
    // Get best-only checkbox
    const bestOnlyCheckbox = document.getElementById('invBestOnlyCheckbox');
    const bestOnlyEnabled = bestOnlyCheckbox ? bestOnlyCheckbox.checked : false;
    
    // Filter inventory based on selection
    let filteredInventory = state.inventory;
    if(filterValue !== 'all'){
      filteredInventory = state.inventory.filter(item => {
        // Broad categories
        if(filterValue === 'weapon') return item.kind === 'weapon';
        if(filterValue === 'armor') return item.kind === 'armor';
        if(filterValue === 'potion') return item.kind === 'potion';
        
        // Specific weapon types
        if(filterValue === 'sword') return item.kind === 'weapon' && item.weaponType === 'Sword';
        if(filterValue === 'axe') return item.kind === 'weapon' && item.weaponType === 'Axe';
        if(filterValue === 'dagger') return item.kind === 'weapon' && item.weaponType === 'Dagger';
        if(filterValue === 'greatsword') return item.kind === 'weapon' && item.weaponType === 'Greatsword';
        if(filterValue === 'healing-staff') return item.kind === 'weapon' && item.weaponType === 'Healing Staff';
        if(filterValue === 'destruction-staff') return item.kind === 'weapon' && item.weaponType === 'Destruction Staff';
        
        // Specific armor slots (matching ARMOR_SLOTS from constants.js)
        if(filterValue === 'helm') return item.kind === 'armor' && item.slot === 'helm';
        if(filterValue === 'chest') return item.kind === 'armor' && item.slot === 'chest';
        if(filterValue === 'legs') return item.kind === 'armor' && item.slot === 'legs';
        if(filterValue === 'feet') return item.kind === 'armor' && item.slot === 'feet';
        if(filterValue === 'hands') return item.kind === 'armor' && item.slot === 'hands';
        if(filterValue === 'belt') return item.kind === 'armor' && item.slot === 'belt';
        if(filterValue === 'shoulders') return item.kind === 'armor' && item.slot === 'shoulders';
        if(filterValue === 'neck') return item.kind === 'armor' && item.slot === 'neck';
        if(filterValue === 'accessory') return item.kind === 'armor' && (item.slot === 'accessory1' || item.slot === 'accessory2');
        
        return true;
      });
    }
    
    // Apply "Best Items Only" filter if enabled
    if(bestOnlyEnabled){
      if(equip){
        filteredInventory = filteredInventory.filter(item => {
          // Only show items that have a slot (weapons/armor) and are better than equipped
          if(item.kind === 'weapon' || item.kind === 'armor'){
            const comparison = compareItemToEquipped(item, equip);
            return comparison === 1; // Only show items better than equipped (green arrow)
          }
          // Skip non-equipable items when best-only is enabled
          return false;
        });
      }
    }
    
    const invTooltip = document.getElementById('invTooltip');
    const showInvTooltip = (html, evt)=>{
      if(!invTooltip || !evt) return;
      invTooltip.innerHTML = html;
      invTooltip.style.display = 'block';
      invTooltip.style.visibility = 'hidden';
      invTooltip.style.transform = 'none';
      invTooltip.style.bottom = 'auto';
      const parentRect = ui.invRight.getBoundingClientRect();
      const tooltipRect = invTooltip.getBoundingClientRect();
      const scrollY = ui.invRight.scrollTop || 0;
      const cursorX = evt.clientX - parentRect.left;
      const cursorY = evt.clientY - parentRect.top + scrollY;
      const margin = 14;
      // Prefer right of cursor; if overflow, flip to left
      let left = cursorX + margin;
      if(left + tooltipRect.width > parentRect.width - 4){
        left = cursorX - tooltipRect.width - margin;
      }
      // Prefer below cursor; if overflow, flip above
      let top = cursorY + margin;
      if(top + tooltipRect.height > parentRect.height + scrollY - 4){
        top = cursorY - tooltipRect.height - margin;
      }
      // Clamp within panel bounds
      left = Math.max(8, Math.min(left, parentRect.width - tooltipRect.width - 8));
      top = Math.max(scrollY + 4, Math.min(top, scrollY + parentRect.height - tooltipRect.height - 4));
      invTooltip.style.top = `${top}px`;
      invTooltip.style.left = `${left}px`;
      invTooltip.style.visibility = 'visible';
    };
    const hideInvTooltip = ()=>{
      if(invTooltip) invTooltip.style.display = 'none';
    };
    
    const maxSlots = Math.max(500, filteredInventory.length);
    for(let i=0;i<maxSlots;i++){
      const slot=document.createElement('div');
      slot.className='slot';
      if(i<filteredInventory.length){
        const it=filteredInventory[i];
        const originalIndex = state.inventory.indexOf(it);
        const equippedOnOther = isEquippedOnOtherHero(it);
        const imgPath = getItemImage(it);
        const stackCountHtml = (it.kind === 'potion' && it.count > 1) ? `<div style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.85); padding:2px 4px; border-radius:3px; font-size:11px; color:#fff; font-weight:900; pointer-events:none;">${it.count}</div>` : '';
        if(imgPath){
          slot.innerHTML = `<img src="${imgPath}" alt="${it.name}" style="width:100%; height:100%; object-fit:contain; pointer-events:none;"/>${stackCountHtml}`;
        } else {
          slot.innerHTML = invSlotLabel(it) + stackCountHtml;
        }
        slot.style.borderColor=it.rarity.color;
        slot.style.color=it.rarity.color;
        slot.style.position='relative';
        
        // Add comparison arrow for equipment items
        if((it.kind === 'armor' || it.kind === 'weapon') && it.slot && !equippedOnOther){
          const comparison = compareItemToEquipped(it, equip);
          if(comparison !== 0){
            const arrow = document.createElement('div');
            arrow.style.position = 'absolute';
            arrow.style.top = '2px';
            arrow.style.right = '2px';
            arrow.style.fontSize = '16px';
            arrow.style.fontWeight = 'bold';
            arrow.style.pointerEvents = 'none';
            arrow.style.textShadow = '0 0 3px rgba(0,0,0,0.9)';
            if(comparison > 0){
              arrow.textContent = '▲';
              arrow.style.color = '#0f0';
            } else {
              arrow.textContent = '▼';
              arrow.style.color = '#f00';
            }
            slot.style.position = 'relative';
            slot.appendChild(arrow);
          }
        }
        
        if(equippedOnOther){
          slot.style.opacity = '0.5';
          slot.title = 'Equipped on another hero';
          slot.style.cursor = 'not-allowed';
        }
        if(originalIndex===state.selectedIndex && !equippedOnOther) slot.style.outline='2px solid rgba(122,162,255,.55)';
        
        // Add hover tooltip
        slot.addEventListener('mouseenter', (evt)=>{
          const color = it.rarity?.color || '#fff';
          const countText = it.count > 1 ? ` (x${it.count})` : '';
          let html = `<div style="font-weight:900; color:${color}; margin-bottom:4px">${it.name}${countText}</div>`;
          html += `<div style="color:#aaa; margin-bottom:8px">${it.desc || ''}</div>`;
          
          // Add item level and level requirement
          if(it.itemLevel){
            const playerLevel = state.progression?.level || 1;
            const reqMet = playerLevel >= it.itemLevel;
            const levelColor = reqMet ? '#4a9eff' : '#ff6b6b';
            html += `<div style="color:${levelColor}; margin-bottom:8px; font-size:11px">📊 Item Level: <b>${it.itemLevel}</b> ${!reqMet ? '(⚠️ Level requirement not met)' : ''}</div>`;
          }
          
          // Add overall rating for equipment
          if((it.kind === 'armor' || it.kind === 'weapon') && it.buffs){
            const rating = calculateItemRating(it);
            html += `<div style="color:#d4af37; font-weight:bold; margin-bottom:8px">⭐ Overall Rating: ${rating}</div>`;
          }
          
          if(it.buffs && Object.keys(it.buffs).length > 0){
            const buffsText = Object.entries(it.buffs).map(([k,v])=>{
              let displayVal;
              if(typeof v === 'number'){
                if(Math.abs(v) < 1){
                  // Percentage stats
                  displayVal = (v>0?'+':'')+(v*100).toFixed(0)+'%';
                } else {
                  // Whole number stats - no decimals
                  displayVal = (v>0?'+':'')+Math.round(v);
                }
              } else {
                displayVal = v;
              }
              return `<span style="color:var(--common)">${displayVal} ${k}</span>`;
            }).join(' • ');
            html += `<div style="margin-bottom:8px">${buffsText}</div>`;
          }
          
          if(it.elementalEffects && it.elementalEffects.length > 0){
            const elemsText = it.elementalEffects.map(e=>`${Math.round((e.chance||0)*100)}% ${e.type} on-hit`).join(' | ');
            html += `<div style="color:var(--rare); margin-bottom:8px">${elemsText}</div>`;
          }
          
          if(it.slot){
            html += `<div style="color:#999; margin-top:8px">Slot: ${it.slot}</div>`;
          }
          
          if(it.kind === 'weapon' && it.weaponType){
            html += `<div style="color:#999">Type: ${it.weaponType}</div>`;
          }
          
          const equippedText = equippedOnOther ? '<br><span style="color:#f66; font-size:11px">⚠️ Equipped on another hero</span>' : '';
          html += equippedText;
          
          // Add preview hint for weapons and potions
          if(it.kind === 'weapon' || it.kind === 'potion'){
            html += '<div style="color:#4a9eff; font-size:11px; margin-top:8px; opacity:0.8">💡 Press P for Item Preview</div>';
          }
          
          showInvTooltip(html, evt);
        });
        slot.addEventListener('mousemove', (evt)=>{
          showInvTooltip(invTooltip.innerHTML || '', evt);
        });
        slot.addEventListener('mouseleave', hideInvTooltip);
        
        if(!equippedOnOther){
          slot.onclick=()=>{
            const now = performance.now ? performance.now() : Date.now();
            const key = `inv-${originalIndex}`;
            const last = ui._lastInvClick;
            if(last && last.key === key && now - last.t < 350){
              state.selectedIndex=originalIndex; state.selectedEquipSlot=null; ui.equipSelected && ui.equipSelected(); ui._lastInvClick=null; return;
            }
            ui._lastInvClick = { key, t: now };
            state.selectedIndex=originalIndex; state.selectedEquipSlot=null; ui.updateInventorySelection();
          };
        }
      } else {
        slot.onclick=()=>{ state.selectedIndex=-1; state.selectedEquipSlot=null; ui.updateInventorySelection(); };
        slot.addEventListener('mouseenter', hideInvTooltip);
      }
      ui.invGrid.appendChild(slot);
    }
    ui.updateInventorySelection();
  };

  ui.renderStats = ()=>{
    const st=currentStats(state);
    const isGroupMemberMode = state.groupMemberInventoryMode;
    const equipSet = isGroupMemberMode ? state.group.settings[isGroupMemberMode]?.equipment : state.player.equip;
    const selectedItem = state.selectedIndex>=0 && state.selectedIndex<state.inventory.length
      ? state.inventory[state.selectedIndex]
      : (state.selectedEquipSlot && equipSet ? equipSet[state.selectedEquipSlot] : null);
    const it = selectedItem;
    const isEquip = it && (it.kind==='armor' || it.kind==='weapon');
    const isEquipped = isEquip && equipSet && equipSet[it.slot] === it;
    const isArmor = isEquip && it.kind === 'armor';
    
    // Calculate delta if armor is unequipped
    let deltas = null;
    if(isEquip && !isEquipped && it.buffs){
      const testSt = {...st};
      // Simulate removing currently equipped armor in this slot (if any)
      const currentEquip = equipSet?.[it.slot];
      if(currentEquip?.buffs) { for(const [k,v] of Object.entries(currentEquip.buffs)) testSt[k] = (testSt[k]??0) - v; }
      // Simulate adding this armor
      for(const [k,v] of Object.entries(it.buffs)) testSt[k] = (testSt[k]??0) + v;
      deltas = { before: st, after: testSt };
    }
    
    const rows=[
      ['Max HP', st.maxHp], ['HP Regen', st.hpRegen.toFixed(1)],
      ['Max Mana', st.maxMana], ['Mana Regen', st.manaRegen.toFixed(1)],
      ['Max Stam', st.maxStam], ['Stam Regen', st.stamRegen.toFixed(1)],
      ['ATK', st.atk.toFixed(1)], ['DEF', st.def.toFixed(1)],
      ['Speed', Math.round(st.speed)],
      ['Crit %', Math.round(st.critChance*100)+'%'],
      ['Crit Mult', st.critMult.toFixed(2)],
      ['CDR', Math.round(st.cdr*100)+'%'],
      ['Block', Math.round(st.blockBase*100)+'%'],
      ['Lifesteal', Math.round((st.lifesteal??0)*100)+'%'],
    ];
    ui.statsTable.innerHTML='';
    
    // Show item level if present
    if(it && it.itemLevel){
      const levelRow = document.createElement('tr');
      const td1 = document.createElement('td'); td1.textContent = 'Item Level'; td1.style.fontWeight = 'bold'; td1.style.color = '#6af';
      const td2 = document.createElement('td'); td2.textContent = it.itemLevel; td2.style.color = '#6af';
      levelRow.appendChild(td1); levelRow.appendChild(td2);
      ui.statsTable.appendChild(levelRow);
    }
    
    for(const [k,v] of rows){
      const tr=document.createElement('tr');
      const td1=document.createElement('td'); td1.textContent=k;
      const td2=document.createElement('td');
      
      // Show delta if comparing unequipped armor
      if(deltas && isArmor){
        let actualKey = null;
        if(k === 'Max HP') actualKey = 'maxHp';
        else if(k === 'HP Regen') actualKey = 'hpRegen';
        else if(k === 'Max Mana') actualKey = 'maxMana';
        else if(k === 'Mana Regen') actualKey = 'manaRegen';
        else if(k === 'Max Stam') actualKey = 'maxStam';
        else if(k === 'Stam Regen') actualKey = 'stamRegen';
        else if(k === 'ATK') actualKey = 'atk';
        else if(k === 'DEF') actualKey = 'def';
        else if(k === 'Speed') actualKey = 'speed';
        else if(k === 'Crit %') actualKey = 'critChance';
        else if(k === 'Crit Mult') actualKey = 'critMult';
        else if(k === 'CDR') actualKey = 'cdr';
        else if(k === 'Block') actualKey = 'blockBase';
        else if(k === 'Lifesteal') actualKey = 'lifesteal';
        
        if(actualKey){
          const after = deltas.after[actualKey];
          const before = deltas.before[actualKey];
          const diff = after - before;
          const color = diff > 0 ? '#6F9' : diff < 0 ? '#F66' : '#999';
          const sign = diff > 0 ? '+' : '';
          
          let diffDisplay = '';
          if(actualKey === 'lifesteal') diffDisplay = isNaN(after) ? '0%' : Math.round((after??0)*100)+'%';
          else if(actualKey === 'critChance') diffDisplay = Math.round(after*100)+'%';
          else if(actualKey === 'cdr') diffDisplay = Math.round(after*100)+'%';
          else if(actualKey === 'blockBase') diffDisplay = Math.round(after*100)+'%';
          else if(actualKey.includes('Regen')) diffDisplay = after.toFixed(1);
          else if(actualKey === 'atk' || actualKey === 'def') diffDisplay = after.toFixed(1);
          else diffDisplay = Math.round(after);
          
          const diffAmount = actualKey.includes('Regen') || actualKey === 'atk' || actualKey === 'def' ? Math.abs(diff).toFixed(1) : Math.round(Math.abs(diff));
          td2.innerHTML = `<span style="color: #999;">${v}</span> <span style="color: ${color};">${sign}${diff !== 0 ? diffAmount : ''} → ${diffDisplay}</span>`;
        } else {
          td2.textContent = v;
        }
      } else {
        td2.textContent = v;
      }
      
      tr.appendChild(td1); tr.appendChild(td2);
      ui.statsTable.appendChild(tr);
    }
    
    // Show armor buff details if equipped armor is selected
    if(isEquipped && it.buffs && Object.keys(it.buffs).length > 0){
      const buffRow = document.createElement('tr');
      const td1 = document.createElement('td'); td1.textContent = 'Armor Buffs'; td1.style.fontWeight = 'bold';
      const td2 = document.createElement('td');
      const buffParts = [];
      for(const [k,v] of Object.entries(it.buffs)){
        const sign = v >= 0 ? '+' : '';
        if(k === 'maxHp') buffParts.push(`${sign}${Math.round(v)} HP`);
        else if(k === 'atk') buffParts.push(`${sign}${v.toFixed(1)} ATK`);
        else if(k === 'def') buffParts.push(`${sign}${v.toFixed(1)} DEF`);
        else if(k === 'speed') buffParts.push(`${sign}${Math.round(v)} Speed`);
        else buffParts.push(`${sign}${v.toFixed(2)} ${k}`);
      }
      td2.innerHTML = buffParts.join(', ');
      buffRow.appendChild(td1); buffRow.appendChild(td2);
      ui.statsTable.appendChild(buffRow);
    }
  };

  ui.invClose.onclick=()=>{
    // Exit group member mode when closing inventory
    if(state.groupMemberInventoryMode){
      state.groupMemberInventoryMode = null;
      ui.renderGroupTab(); // Refresh group tab
    }
    ui.toggleInventory(false);
  };

  // Tabbed interface
  function activateTab(tabId){
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tc => tc.style.display = 'none');
    tabButtons.forEach(tb => { 
      tb.classList.remove('active'); 
      tb.style.background='transparent'; 
      tb.style.borderColor='rgba(212,175,55,0.3)'; 
      tb.style.color='#b8941f'; 
      tb.style.fontWeight='normal';
    });
    const targetContent = document.querySelector(`.tab-content[data-tab="${tabId}"]`);
    const targetButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if(targetContent) targetContent.style.display = 'block';
    if(targetButton){ 
      targetButton.classList.add('active'); 
      targetButton.style.background='rgba(212,175,55,0.3)'; 
      targetButton.style.borderColor='#d4af37'; 
      targetButton.style.color='#d4af37'; 
      targetButton.style.fontWeight='bold';
    }
    if(tabId === 0){ ui.renderInventory(); }
    else if(tabId === 1){ ui.renderSkills(); }
    else if(tabId === 2){ ui.renderLevel(); }
    else if(tabId === 3){ ui.renderBuffSystem(); }
    else if(tabId === 4){ ui.renderGroupTab(); }
    else if(tabId === 5){ ui.renderAlliesTab(); }
    else if(tabId === 7){ ui.renderCampaignTab(); }
    else if(tabId === 8){ ui.renderSlotTab(); }
    else if(tabId === 9){ ui.renderFighterCards(); }
  }
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => { btn.onclick = () => activateTab(Number(btn.getAttribute('data-tab'))); });

  // Fighter cards sort button handlers
  const sortRarityBtn = document.getElementById('sortCardsByRarity');
  const sortLevelBtn = document.getElementById('sortCardsByLevel');
  const sortRatingBtn = document.getElementById('sortCardsByRating');
  
  if(sortRarityBtn) sortRarityBtn.onclick = () => { 
    ui.currentCardSort = 'rarity'; 
    ui.renderFighterCards(); 
  };
  if(sortLevelBtn) sortLevelBtn.onclick = () => { 
    ui.currentCardSort = 'level'; 
    ui.renderFighterCards(); 
  };
  if(sortRatingBtn) sortRatingBtn.onclick = () => { 
    ui.currentCardSort = 'rating'; 
    ui.renderFighterCards(); 
  };

  // Show/hide main HUD while keeping bottom stats visible
  ui.toggleHud = (on)=>{
    try{ ui.hud.style.display = on ? 'block' : 'none'; }catch(e){}
  };

  ui.renderSkills = ()=>{
    if(!ui._selectedCategory) ui._selectedCategory = 'weapons-damage';
    
    // Check if we're in group member mode
    const isGroupMemberMode = state.groupMemberInventoryMode;
    let abilitySlots = state.abilitySlots;
    let memberName = '';
    
    if(isGroupMemberMode){
      const friendly = state.friendlies.find(f => f.id === isGroupMemberMode);
      const settings = state.group.settings[isGroupMemberMode];
      if(!friendly || !settings){
        state.groupMemberInventoryMode = null;
        ui.toggleInventory(false);
        return;
      }
      abilitySlots = friendly.npcAbilities || [null, null, null, null, null];
      memberName = settings.name;
    }
    
    // Render ability slots at top
    ui.skillSlots.innerHTML='';
    if(isGroupMemberMode){
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.gap = '8px';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '8px';
      header.style.color = '#4a9eff';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = `${memberName} - Abilities`;
      header.appendChild(titleSpan);
      const backBtn = document.createElement('button');
      backBtn.className = 'secondary';
      backBtn.textContent = 'Switch to Player';
      backBtn.style.padding = '4px 8px';
      backBtn.style.fontSize = '11px';
      backBtn.onclick = ()=>{ state.groupMemberInventoryMode = null; ui.renderSkills(); ui.renderInventory(); };
      header.appendChild(backBtn);
      ui.skillSlots.appendChild(header);
    }
    
    const slotsContainer = document.createElement('div');
    slotsContainer.style.display = 'flex';
    slotsContainer.style.gap = '8px';
    slotsContainer.style.flexWrap = 'wrap';
    
    for(let i=0;i<5;i++){
      const skId = abilitySlots[i];
      const sk = getSkillById(skId);
      const ability = ABILITIES[skId];
      // Build icon path dynamically from ability.icon property
      const iconSrc = ability?.icon ? getAssetPath(`assets/skill icons/${ability.icon}`) : null;
      const slotEl = document.createElement('div');
      slotEl.className = 'slot';
      slotEl.style.minWidth = '110px';
      slotEl.style.flexGrow = '1';
      slotEl.style.position = 'relative';
      slotEl.style.padding = '0';
      slotEl.innerHTML = iconSrc 
        ? `<img src="${iconSrc}" style="width:100%; height:100%; object-fit:contain; pointer-events:none; position:absolute; top:0; left:0;" onerror="this.style.display='none';" />
           <div style="position:absolute; bottom:20px; left:0; right:0; text-align:center; font-weight:900; font-size:11px; text-shadow:0 0 4px rgba(0,0,0,0.9);">Slot ${i+1}</div>
           <div style="position:absolute; bottom:6px; left:0; right:0; text-align:center; font-size:10px; color:#4a9eff; text-shadow:0 0 4px rgba(0,0,0,0.9);">${sk ? sk.name : '—'}</div>`
        : `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-weight:900; font-size:11px;">Slot ${i+1}</div>
           <div style="position:absolute; bottom:6px; left:0; right:0; text-align:center; font-size:10px; color:#4a9eff;">${sk ? sk.name : '—'}</div>`;
      slotEl.style.cursor = sk ? 'help' : 'default';
      slotEl.style.background = 'transparent';
      slotEl.style.border = '1px solid rgba(255,255,255,0.1)';
      
      // Add tooltip on hover if ability is slotted
      if(sk){
        const ability = ABILITIES[skId];
        if(ability){
          slotEl.onmouseenter = (e) => {
            // ESO-style tooltip
            let tooltipText = `<div style="font-weight:900; font-size:14px; color:#4a9eff; margin-bottom:8px;">${ability.name}</div>`;
            
            if(ability.type === 'active'){
              // Target/Range/Cost section
              const targetInfo = ability.targetType && TARGET_TYPE_INFO[ability.targetType] 
                ? TARGET_TYPE_INFO[ability.targetType].name 
                : (ability.target || 'Self');
              
              tooltipText += `<div style="font-size:11px; color:#999; margin-bottom:8px; line-height:1.8;">`;
              tooltipText += `<div><b>Target:</b> ${targetInfo}</div>`;
              if(ability.range > 0) tooltipText += `<div><b>Range:</b> ${ability.range}m</div>`;
              tooltipText += `<div><b>Cost:</b> ${ability.mana} Mana</div>`;
              tooltipText += `</div>`;
              
              // Skill Description section
              tooltipText += `<div style="margin-bottom:8px;">`;
              tooltipText += `<div style="font-weight:bold; color:#d4af37; font-size:10px; margin-bottom:4px;">Skill Description</div>`;
              tooltipText += `<div style="font-size:11px; color:#ccc; line-height:1.4;">${ability.details || ability.desc}</div>`;
              tooltipText += `</div>`;
              
              // Additional stats
              tooltipText += `<div style="font-size:10px; color:#888;">`;
              tooltipText += `Cooldown: ${ability.cd}s`;
              if(ability.castTime) tooltipText += ` | Cast Time: ${ability.castTime.toFixed(1)}s`;
              if(ability.radius > 0) tooltipText += ` | Radius: ${ability.radius}m`;
              tooltipText += `</div>`;
              
              if(ability.scaling){
                tooltipText += `<div style="font-size:10px; color:#8f9; margin-top:6px;"><b>Scaling:</b> ${ability.scaling}</div>`;
              }
            } else {
              // Passive ability
              tooltipText += `<div style="font-size:11px; color:#ccc; margin-bottom:6px;">${ability.details || ability.desc}</div>`;
            }
            
            ui.showBuffTooltip('', tooltipText, e.target);
          };
          slotEl.onmouseleave = () => {
            ui.hideBuffTooltip();
          };
        }
      }
      
      slotsContainer.appendChild(slotEl);
    }
    ui.skillSlots.appendChild(slotsContainer);
    
    // Render categories on LEFT SIDE with icon placeholders
    ui.skillCategories.innerHTML = '';
    for(const cat of ABILITY_CATEGORIES){
      const catBtn = document.createElement('button');
      catBtn.style.width = '100%';
      catBtn.style.padding = '12px 12px';
      catBtn.style.display = 'flex';
      catBtn.style.alignItems = 'center';
      catBtn.style.justifyContent = 'space-between';
      catBtn.style.gap = '10px';
      catBtn.style.border = 'none';
      catBtn.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      catBtn.style.background = ui._selectedCategory === cat.id ? 'rgba(122,162,255,0.15)' : 'transparent';
      catBtn.style.color = ui._selectedCategory === cat.id ? '#4a9eff' : '#aaa';
      catBtn.style.cursor = 'pointer';
      catBtn.style.fontSize = '14px';
      catBtn.style.fontWeight = 'bold';
      catBtn.style.transition = 'all 0.2s';
      
      // Icon placeholder (50x50 box on the left)
      const iconPlaceholder = document.createElement('div');
      iconPlaceholder.style.width = '50px';
      iconPlaceholder.style.height = '50px';
      iconPlaceholder.style.border = '2px solid rgba(255,255,255,0.2)';
      iconPlaceholder.style.borderRadius = '4px';
      iconPlaceholder.style.background = 'rgba(0,0,0,0.3)';
      iconPlaceholder.style.display = 'flex';
      iconPlaceholder.style.alignItems = 'center';
      iconPlaceholder.style.justifyContent = 'center';
      iconPlaceholder.style.fontSize = '24px';
      iconPlaceholder.style.flexShrink = '0';
      iconPlaceholder.textContent = cat.name.split(' ')[0]; // Show emoji from category name
      
      // Text label (right-aligned)
      const label = document.createElement('span');
      label.style.flex = '1';
      label.style.textAlign = 'right';
      label.textContent = cat.name.split(' ').slice(1).join(' '); // Text without emoji
      
      catBtn.appendChild(iconPlaceholder);
      catBtn.appendChild(label);
      
      catBtn.onclick = () => {
        ui._selectedCategory = cat.id;
        ui._selectedAbility = null;
        ui.renderSkills();
      };
      ui.skillCategories.appendChild(catBtn);
    }
    
    // Find the selected category and get abilities
    const selectedCat = ABILITY_CATEGORIES.find(c => c.id === ui._selectedCategory);
    const abilitiesInCategory = selectedCat 
      ? Object.values(ABILITIES).filter(selectedCat.filter)
      : [];
    
    // Show list of abilities in selected category with full stats and buttons
      let listHtml = `<div style="margin-bottom:12px;"><div class="small" style="font-weight:bold; color:#4a9eff; margin-bottom:8px;">${selectedCat ? selectedCat.name : 'Abilities'}</div>`;
      
      // Filter to only show ACTIVE abilities in abilityDetails
      const activeAbilities = abilitiesInCategory.filter(a => a.type === 'active');
      
      if(activeAbilities.length === 0){
        listHtml += `<div style="color:#666; padding:8px; text-align:center;">No active abilities in this category</div>`;
      } else {
        for(const ability of activeAbilities){
          const emojiIcon = ability.type === 'passive' ? '✦' : (ability.targetType ? TARGET_TYPE_INFO[ability.targetType]?.icon || '→' : '→');
          // Build icon path dynamically from ability.icon property
          const iconSrc = ability.icon ? getAssetPath(`assets/skill icons/${ability.icon}`) : null;
          const iconHtml = iconSrc ? `<img src="${iconSrc}" style="width:80px; height:80px; border-radius:6px; border:2px solid #d4af37; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span style="font-size:48px; display:none;">${emojiIcon}</span>` : `<span style="font-size:48px;">${emojiIcon}</span>`;
          
          // Check which slots have this ability assigned
          const assignedSlots = [];
          for(let i=0; i<5; i++){
            if(abilitySlots[i] === ability.id) assignedSlots.push(i);
          }
          
          listHtml += `<div class="ability-card" data-ability-id="${ability.id}" style="padding:10px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); margin-bottom:8px; border-radius:4px; display:grid; grid-template-columns:80px 1fr; gap:10px; align-items:start;">`;
          
          // Icon column
          listHtml += `<div style="width:80px; height:80px; display:flex; align-items:center; justify-content:center;">${iconHtml}</div>`;
          
          // Content column
          listHtml += `<div>`;
          
          // Title and description
          listHtml += `<div style="font-weight:900; font-size:13px; color:#4a9eff; margin-bottom:6px;">${ability.name}</div>`;
          
          if(ability.type === 'active'){
            // ESO-style target/range/cost info
            const targetInfo = ability.targetType && TARGET_TYPE_INFO[ability.targetType] 
              ? TARGET_TYPE_INFO[ability.targetType].name 
              : (ability.target || 'Self');
            
            listHtml += `<div style="font-size:10px; color:#999; margin-bottom:6px; line-height:1.6;">`;
            listHtml += `<div><b>Target:</b> ${targetInfo}</div>`;
            if(ability.range > 0) listHtml += `<div><b>Range:</b> ${ability.range}m</div>`;
            if(ability.radius > 0) listHtml += `<div><b>Radius:</b> ${ability.radius}m</div>`;
            listHtml += `<div><b>Cost:</b> ${ability.mana} Mana</div>`;
            listHtml += `</div>`;
          }
          
          // Description (labeled as "Skill Description")
          listHtml += `<div style="font-size:11px; color:#ccc; margin-bottom:8px; line-height:1.5;">`;
          listHtml += `<div style="font-weight:bold; color:#d4af37; font-size:10px; margin-bottom:2px;">Skill Description</div>`;
          listHtml += `${ability.details || ability.desc}`;
          listHtml += `</div>`;
          
          if(ability.type === 'active'){
            // Show cooldown and cast time
            listHtml += `<div style="font-size:10px; color:#888; margin-bottom:6px;">`;
            listHtml += `Cooldown: ${ability.cd}s`;
            if(ability.castTime) listHtml += ` | Cast Time: ${ability.castTime.toFixed(1)}s`;
            listHtml += `</div>`;
            
            if(ability.scaling){
              listHtml += `<div style="font-size:10px; color:#8f9; margin-bottom:6px;"><b>Scaling:</b> ${ability.scaling}</div>`;
            }
            
            // Assign/Remove buttons
            listHtml += `<div style="display:flex; gap:4px; flex-wrap:wrap;">`;
            for(let i=0; i<5; i++){
              const isAssigned = assignedSlots.includes(i);
              const btnStyle = isAssigned 
                ? 'background:rgba(255,100,100,0.2); border:1px solid rgba(255,100,100,0.5); color:#ff6666;' 
                : 'background:rgba(122,162,255,0.2); border:1px solid rgba(122,162,255,0.4); color:#4a9eff;';
              const btnText = isAssigned ? `✕ ${i+1}` : `${i+1}`;
              listHtml += `<button class="assign-slot-btn" data-ability="${ability.id}" data-slot="${i}" data-assigned="${isAssigned}" style="flex:1; min-width:45px; padding:5px; ${btnStyle} cursor:pointer; border-radius:3px; font-size:10px; font-weight:bold;">${btnText}</button>`;
            }
            listHtml += `</div>`;
            
          } else if(ability.type === 'passive'){
            listHtml += `<div style="font-size:10px; color:#8f9; margin-bottom:4px;"><b>Type:</b> Passive Ability</div>`;
            if(ability.buffs){
              listHtml += `<div style="color:#f99; font-size:10px;">`;
              for(const [key, val] of Object.entries(ability.buffs)){
                listHtml += `<div>+${val} ${key}</div>`;
              }
              listHtml += `</div>`;
            }
          }
          
          listHtml += `</div>`; // close content column
          listHtml += `</div>`; // close grid container
        }
      }
      listHtml += `</div>`;
      ui.abilityDetails.innerHTML = listHtml;
      
      // Wire assign/remove slot buttons
      setTimeout(() => {
        document.querySelectorAll('.assign-slot-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const abilityId = btn.getAttribute('data-ability');
            const slotIndex = parseInt(btn.getAttribute('data-slot'));
            const isAssigned = btn.getAttribute('data-assigned') === 'true';
            const ability = ABILITIES[abilityId];
            const isGroupMemberMode = state.groupMemberInventoryMode;
            
            if(isGroupMemberMode){
              const friendly = state.friendlies.find(f => f.id === isGroupMemberMode);
              const settings = state.group.settings[isGroupMemberMode];
              if(friendly && settings){
                if(!friendly.npcAbilities) friendly.npcAbilities = [null, null, null, null, null];
                
                if(isAssigned){
                  friendly.npcAbilities[slotIndex] = null;
                  settings.abilities = [...friendly.npcAbilities];
                  ui.toast(`<b>${ability.name}</b> removed from ${settings.name} slot ${slotIndex+1}`);
                } else {
                  // PREVENT DUPLICATES: Remove this ability from all other slots first
                  for(let j = 0; j < friendly.npcAbilities.length; j++) {
                    if(friendly.npcAbilities[j] === abilityId) {
                      friendly.npcAbilities[j] = null;
                    }
                  }
                  // Now assign to the selected slot
                  friendly.npcAbilities[slotIndex] = abilityId;
                  settings.abilities = [...friendly.npcAbilities];
                  ui.toast(`<b>${ability.name}</b> assigned to ${settings.name} slot ${slotIndex+1}`);
                }
              }
            } else {
              if(isAssigned){
                state.abilitySlots[slotIndex] = null;
                ui.renderAbilityBar();
                ui.toast(`<b>${ability.name}</b> removed from slot ${slotIndex+1}`);
              } else {
                // PREVENT DUPLICATES: Remove this ability from all other slots first
                for(let j = 0; j < state.abilitySlots.length; j++) {
                  if(state.abilitySlots[j] === abilityId) {
                    state.abilitySlots[j] = null;
                  }
                }
                // Now assign to the selected slot
                state.abilitySlots[slotIndex] = abilityId;
                ui.renderAbilityBar();
                ui.toast(`<b>${ability.name}</b> assigned to slot ${slotIndex+1}`);
              }
            }
            
            ui.renderSkills();
          };
        });
      }, 0);
    
    // Render passives list at bottom
    ui.passiveList.innerHTML = '';
    
    // Get player's selected passives
    const activePassiveIds = (state.player.passives || []).map(p => p?.id).filter(Boolean);
    
    // Get passives from selected category (filter from abilitiesInCategory)
    const passives = abilitiesInCategory.filter(a => a.type === 'passive');
    
    for(const pass of passives){
      const isSelected = activePassiveIds.includes(pass.id);
      
      const passEl = document.createElement('div');
      passEl.style.padding = '8px';
      passEl.style.background = isSelected ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.2)';
      passEl.style.borderLeft = isSelected ? '3px solid #d4af37' : '3px solid rgba(212,175,55,0.3)';
      passEl.style.marginBottom = '6px';
      passEl.style.borderRadius = '3px';
      passEl.style.cursor = 'pointer';
      
      let html = `<div style="font-weight:900; color:#d4af37; font-size:12px;">✦ ${pass.name}</div>`;
      html += `<div style="font-size:11px; color:#ccc; margin-top:4px;">${pass.details || pass.desc}</div>`;
      
      // Show buff values
      if(pass.buffs){
        html += `<div style="font-size:10px; color:#8f9; margin-top:4px; font-weight:bold;">`;
        for(const [key, val] of Object.entries(pass.buffs)){
          const displayVal = val < 1 && val > -1 ? `${(val * 100).toFixed(0)}%` : `+${val}`;
          html += `${displayVal} ${key}  `;
        }
        html += `</div>`;
      }
      
      // Show status
      if(isSelected){
        html += `<div style="font-size:9px; color:#8f9; margin-top:4px; font-weight:bold;">✓ ACTIVE - Benefits applied continuously</div>`;
      } else {
        html += `<div style="font-size:9px; color:#888; margin-top:4px; font-style:italic;">Click to activate this passive</div>`;
      }
      
      passEl.innerHTML = html;
      passEl.onmouseover = () => passEl.style.background = isSelected ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.1)';
      passEl.onmouseout = () => passEl.style.background = isSelected ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.2)';
      passEl.onclick = () => {
        // Toggle passive selection
        const idx = state.player.passives.findIndex(p => p?.id === pass.id);
        if(idx >= 0){
          state.player.passives.splice(idx, 1);
          ui.toast(`<b>${pass.name}</b> deactivated`);
        } else {
          state.player.passives.push(pass);
          ui.toast(`<b>${pass.name}</b> activated - benefits are now active!`);
        }
        ui.renderSkills();
        ui.renderLevel(); // Update all active effects displays
        ui.updateBuffIconsHUD(); // Update HUD
      };
      ui.passiveList.appendChild(passEl);
    }

    // Render loadouts section (simple vertical layout)
    if(!isGroupMemberMode && ui.loadoutsList){
      ui.loadoutsList.innerHTML = '';
      const heroClass = state.currentHero || 'warrior';
      const loadouts = state.abilityLoadouts?.[heroClass] || [];
      
      for(let i = 0; i < 3; i++){
        const loadout = loadouts[i] || { name: `Loadout ${i+1}`, slots: null };
        const hasLoadout = loadout.slots && loadout.slots.length > 0;
        
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.gap = '6px';
        div.style.padding = '8px';
        div.style.background = 'rgba(0,0,0,0.3)';
        div.style.border = '1px solid rgba(255,215,0,0.3)';
        div.style.borderRadius = '3px';
        
        // Loadout name
        const nameDiv = document.createElement('div');
        nameDiv.style.fontSize = '12px';
        nameDiv.style.fontWeight = 'bold';
        nameDiv.style.color = '#ffd700';
        nameDiv.textContent = loadout.name;
        div.appendChild(nameDiv);
        
        // Buttons row
        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '4px';
        
        // Load button
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.style.flex = '1';
        loadBtn.style.padding = '4px 6px';
        loadBtn.style.fontSize = '10px';
        loadBtn.style.background = hasLoadout ? 'rgba(122,162,255,0.2)' : 'rgba(100,100,100,0.2)';
        loadBtn.style.border = hasLoadout ? '1px solid rgba(122,162,255,0.4)' : '1px solid rgba(100,100,100,0.3)';
        loadBtn.style.color = hasLoadout ? '#7aa2ff' : '#888';
        loadBtn.style.borderRadius = '2px';
        loadBtn.style.cursor = hasLoadout ? 'pointer' : 'default';
        loadBtn.disabled = !hasLoadout;
        loadBtn.onclick = (e) => {
          e.stopPropagation();
          if(hasLoadout){
            if(loadLoadout(state, heroClass, i)){
              ui.renderAbilityBar();
              ui.renderSkills();
              ui.toast(`<b>${loadout.name}</b> loaded!`);
            }
          }
        };
        btnRow.appendChild(loadBtn);
        
        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.style.flex = '1';
        saveBtn.style.padding = '4px 6px';
        saveBtn.style.fontSize = '10px';
        saveBtn.style.background = 'rgba(255,215,0,0.2)';
        saveBtn.style.border = '1px solid rgba(255,215,0,0.4)';
        saveBtn.style.color = '#ffd700';
        saveBtn.style.borderRadius = '2px';
        saveBtn.style.cursor = 'pointer';
        saveBtn.onclick = (e) => {
          e.stopPropagation();
          if(saveLoadout(state, heroClass, i, loadout.name)){
            ui.toast(`<b>${loadout.name}</b> saved!`);
            ui.renderSkills();
          } else {
            ui.toast('Failed to save loadout');
          }
        };
        btnRow.appendChild(saveBtn);
        
        // Delete button
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.style.flex = '1';
        delBtn.style.padding = '4px 6px';
        delBtn.style.fontSize = '10px';
        delBtn.style.background = hasLoadout ? 'rgba(244,67,54,0.2)' : 'rgba(100,100,100,0.2)';
        delBtn.style.border = hasLoadout ? '1px solid rgba(244,67,54,0.4)' : '1px solid rgba(100,100,100,0.3)';
        delBtn.style.color = hasLoadout ? '#f44336' : '#888';
        delBtn.style.borderRadius = '2px';
        delBtn.style.cursor = hasLoadout ? 'pointer' : 'default';
        delBtn.disabled = !hasLoadout;
        delBtn.onclick = (e) => {
          e.stopPropagation();
          if(hasLoadout){
            if(confirm(`Delete "${loadout.name}"?`)){
              state.abilityLoadouts[heroClass][i] = { name: `Loadout ${i+1}`, slots: null };
              try {
                storageSet(STORAGE_KEYS.LOADOUTS, state.abilityLoadouts);
                ui.toast(`<b>${loadout.name}</b> deleted!`);
                ui.renderSkills();
              } catch(err) {
                console.warn('[LOADOUT] Failed to delete:', err);
              }
            }
          }
        };
        btnRow.appendChild(delBtn);
        
        div.appendChild(btnRow);
        ui.loadoutsList.appendChild(div);
      }
    }
  };

  ui.toggleLevel = (on)=>{
    state.showLevel = on;
    ui.invOverlay.classList.toggle('show', on);
    if(on){ state.paused=true; ui.renderLevel(); }
    else { if(!state.showInventory && !state.inMenu && !state.campaignEnded) state.paused=false; }
  };

  ui.renderLevel = ()=>{
    const isGroupMemberMode = state.groupMemberInventoryMode;
    const memberId = isGroupMemberMode;
    const settings = isGroupMemberMode ? state.group.settings[memberId] : null;
    const friendly = isGroupMemberMode ? state.friendlies.find(f => f.id === memberId) : null;
    
    let stats, name, role, hero, level, hp, maxHp, mana, maxMana, stam, maxStam, armor, buffs;
    
    if(isGroupMemberMode && friendly){
      // Show friendly's stats
      name = settings?.name || friendly.name || 'Friendly';
      role = friendly.role || 'DPS';
      hero = friendly.variant || 'warrior';
      level = friendly.level || 1;
      hp = Math.round(friendly.hp || 0);
      maxHp = Math.round(friendly.maxHp || 100);
      mana = Math.round(friendly.mana || 0);
      maxMana = Math.round(friendly.maxMana || 60);
      stam = 0; // Friendlies don't have stamina
      maxStam = 0;
      
      // Calculate friendly's armor and stats
      armor = 0;
      stats = {
        atk: friendly.contactDmg || friendly.dmg || 8,
        def: friendly.def || 0,
        speed: friendly.speed || 100,
        critChance: 0,
        critMult: 1.5,
        manaRegen: friendly.manaRegen || 5,
        hpRegen: friendly.hpRegen || 0,
        cdr: 0
      };
      
      // Apply equipment stats
      if(friendly.equipment){
        for(const slot in friendly.equipment){
          const item = friendly.equipment[slot];
          if(item?.buffs){
            for(const [key, val] of Object.entries(item.buffs)){
              if(key === 'def') armor += val;
              else if(stats.hasOwnProperty(key)) stats[key] = (stats[key] || 0) + val;
            }
          }
        }
      }
      
      buffs = friendly.buffs || [];
      
      // Hide level up controls for friendlies
      if(ui.levelPointsDisplay) ui.levelPointsDisplay.style.display = 'none';
      if(ui.hpInc) ui.hpInc.style.display = 'none';
      if(ui.hpDec) ui.hpDec.style.display = 'none';
      if(ui.hpSpend) ui.hpSpend.style.display = 'none';
      if(ui.manaInc) ui.manaInc.style.display = 'none';
      if(ui.manaDec) ui.manaDec.style.display = 'none';
      if(ui.manaSpend) ui.manaSpend.style.display = 'none';
      if(ui.stamInc) ui.stamInc.style.display = 'none';
      if(ui.stamDec) ui.stamDec.style.display = 'none';
      if(ui.stamSpend) ui.stamSpend.style.display = 'none';
      if(ui.levelSwitchToPlayer){
        ui.levelSwitchToPlayer.style.display = 'inline-block';
        ui.levelSwitchToPlayer.onclick = ()=>{ state.groupMemberInventoryMode=null; ui.renderLevel(); ui.renderInventory(); ui.renderSkills(); };
      }
      
    } else {
      // Show player's stats
      stats = currentStats(state);
      name = state.player.name || 'Hero';
      role = 'Player';
      hero = state.currentHero || 'warrior';
      level = state.progression?.level || 1;
      hp = Math.round(state.player.hp || 0);
      maxHp = Math.round(stats.maxHp || 100);
      mana = Math.round(state.player.mana || 0);
      maxMana = Math.round(stats.maxMana || 60);
      stam = Math.round(state.player.stam || 0);
      maxStam = Math.round(stats.maxStam || 100);
      armor = Math.round(stats.def || 0);
      buffs = state.player.buffs || [];
      
      // Show level up controls for player
      if(ui.levelPointsDisplay) ui.levelPointsDisplay.style.display = 'block';
      if(ui.hpInc) ui.hpInc.style.display = 'inline-block';
      if(ui.hpDec) ui.hpDec.style.display = 'inline-block';
      if(ui.hpSpend) ui.hpSpend.style.display = 'block';
      if(ui.manaInc) ui.manaInc.style.display = 'inline-block';
      if(ui.manaDec) ui.manaDec.style.display = 'inline-block';
      if(ui.manaSpend) ui.manaSpend.style.display = 'block';
      if(ui.strInc) ui.strInc.style.display = 'inline-block';
      if(ui.strDec) ui.strDec.style.display = 'inline-block';
      if(ui.strSpend) ui.strSpend.style.display = 'block';
      if(ui.defInc) ui.defInc.style.display = 'inline-block';
      if(ui.defDec) ui.defDec.style.display = 'inline-block';
      if(ui.defSpend) ui.defSpend.style.display = 'block';
      if(ui.stamInc) ui.stamInc.style.display = 'inline-block';
      if(ui.stamDec) ui.stamDec.style.display = 'inline-block';
      if(ui.stamSpend) ui.stamSpend.style.display = 'block';
      if(ui.levelSwitchToPlayer) ui.levelSwitchToPlayer.style.display = 'none';
      
      // Update level up point allocations
      const sp = state.progression.statPoints|0;
      if(ui.lvlPts) ui.lvlPts.textContent = sp;
      if(ui.hpSpend) ui.hpSpend.textContent = (state.progression.spends.vit|0);
      if(ui.manaSpend) ui.manaSpend.textContent = (state.progression.spends.int|0);
      if(ui.strSpend) ui.strSpend.textContent = (state.progression.spends.str|0);
      if(ui.defSpend) ui.defSpend.textContent = (state.progression.spends.def|0);
      if(ui.stamSpend) ui.stamSpend.textContent = (state.progression.spends.agi|0);
    }
    
    // Update header
    if(ui.levelCharName) ui.levelCharName.textContent = name;
    if(ui.levelCharRole){
      const heroName = hero.charAt(0).toUpperCase() + hero.slice(1);
      ui.levelCharRole.textContent = `${role} • ${heroName} • Lvl ${level}`;
    }
    
    // Update XP progression display (only for player)
    if(!isGroupMemberMode){
      const currentXP = state.progression?.xp || 0;
      const xpMax = xpForNext(level);
      const xpPercent = xpMax > 0 ? (currentXP / xpMax) * 100 : 0;
      
      if(ui.levelTabLevelNum) ui.levelTabLevelNum.textContent = level;
      if(ui.levelTabXpFill) ui.levelTabXpFill.style.width = `${Math.min(100, xpPercent)}%`;
      if(ui.levelTabXpText) ui.levelTabXpText.textContent = `${Math.floor(currentXP)} / ${xpMax} XP`;
      if(ui.levelTabCurrentLevel) ui.levelTabCurrentLevel.textContent = level;
      if(ui.levelTabStatPoints) ui.levelTabStatPoints.textContent = state.progression?.statPoints || 0;
      if(ui.levelTabSkillPoints) ui.levelTabSkillPoints.textContent = state.progression?.skillPoints || 0;
    }
    
    // Calculate armor star rating (0-5 stars based on def value)
    const armorTier = Math.min(5, Math.max(0, Math.floor(armor / 10)));
    const starsFilled = '★'.repeat(armorTier);
    const starsEmpty = '☆'.repeat(5 - armorTier);
    if(ui.levelArmorStars) ui.levelArmorStars.textContent = starsFilled + starsEmpty;
    
    // Update resource bars
    const hpPct = maxHp > 0 ? (hp / maxHp * 100) : 0;
    const manaPct = maxMana > 0 ? (mana / maxMana * 100) : 0;
    const stamPct = maxStam > 0 ? (stam / maxStam * 100) : 0;
    
    if(ui.levelHpValue) ui.levelHpValue.textContent = `${hp}/${maxHp}`;
    if(ui.levelManaValue) ui.levelManaValue.textContent = `${mana}/${maxMana}`;
    if(ui.levelStamValue) ui.levelStamValue.textContent = maxStam > 0 ? `${stam}/${maxStam}` : 'N/A';
    
    if(ui.levelHpBar) ui.levelHpBar.style.width = `${hpPct}%`;
    if(ui.levelManaBar) ui.levelManaBar.style.width = `${manaPct}%`;
    if(ui.levelStamBar) ui.levelStamBar.style.width = `${stamPct}%`;
    
    // Update stats list
    if(ui.levelStatsList){
      const statEntries = [
        { label: 'Attack', value: stats.atk?.toFixed(1) || '0' },
        { label: 'Defense', value: armor },
        { label: 'Speed', value: Math.round(stats.speed || 0) },
        { label: 'Crit Chance', value: `${Math.round((stats.critChance || 0) * 100)}%` },
        { label: 'Crit Mult', value: stats.critMult?.toFixed(2) || '1.5' },
        { label: 'CDR', value: `${Math.round((stats.cdr || 0) * 100)}%` },
        { label: 'HP Regen', value: stats.hpRegen?.toFixed(1) || '0' },
        { label: 'Mana Regen', value: stats.manaRegen?.toFixed(1) || '0' }
      ];
      
      ui.levelStatsList.innerHTML = statEntries.map(s => 
        `<div style="padding:1px 0;">
          <span style="color:#b8941f;">${s.label}:</span> <span style="color:#d4af37; font-weight:bold;">${s.value}</span>
        </div>`
      ).join('');
    }
    
    // Update active effects - use same rendering as buff icons system
    if(ui.levelEffectsList){
      const effectsList = [];
      
      // Add passives (only for player) - ALWAYS SHOW WHEN SELECTED
      if(!state.groupMemberInventoryMode){
        try{
          for(const p of state.player.passives||[]){
            if(!p) continue;
            const icon = renderEffectIcon(p.id, null, false);
            const title = `${p.name} (Passive)`;
            // Show buff values in description
            let buffDesc = '';
            if(p.buffs){
              const buffParts = [];
              for(const [key, val] of Object.entries(p.buffs)){
                const displayVal = val < 1 && val > -1 ? `${(val * 100).toFixed(0)}%` : `+${val}`;
                buffParts.push(`${displayVal} ${key}`);
              }
              buffDesc = buffParts.join(', ');
            }
            effectsList.push(`
              <div style="display:flex; gap:8px; align-items:center; padding:4px; background:rgba(212,175,55,0.15); border-left:2px solid #d4af37; border-radius:2px; margin-bottom:4px;">
                <span style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:18px;">✦</span>
                <div style="flex:1;">
                  <div style="font-weight:bold; color:#d4af37; font-size:11px;">${title} <span style="color:#8f9; font-size:9px;">✓</span></div>
                  <div style="color:#8f9; font-size:10px;">${buffDesc}</div>
                </div>
              </div>
            `);
          }
        }catch(e){ console.error('Error rendering passives:', e); }
      }
      
      // Add buffs
      try{
        for(const b of buffs){ 
          const meta = BUFF_REGISTRY[b.id]; 
          const deb = !!meta?.debuff; 
          const icon = renderEffectIcon(b.id, meta, deb); 
          const title = `${b.name||meta?.name||b.id}`; 
          const desc = `${b.description||meta?.desc||''}`; 
          // Handle infinity duration (for permanent effects like emperor_power)
          const timerDisplay = b.duration === Infinity ? '∞' : (b.t||0).toFixed(1)+'s';
          const stack = (b.stacks||1)>1?` x${b.stacks||1}`:''; 
          // Use gold colors for emperor_power, otherwise use normal buff/debuff colors
          const isEmperor = b.id === 'emperor_power';
          const borderColor = isEmperor ? '#ffd700' : (deb ? '#c44' : '#4a4');
          const bgColor = isEmperor ? 'rgba(255,215,0,0.1)' : (deb ? 'rgba(200,70,70,0.1)' : 'rgba(70,170,70,0.1)');
          const textColor = isEmperor ? '#ffd700' : (deb ? '#c66' : '#6c6');
          effectsList.push(`
            <div style="display:flex; gap:8px; align-items:center; padding:4px; background:${bgColor}; border-left:2px solid ${borderColor}; border-radius:2px; margin-bottom:4px;">
              <span style="width:32px; height:32px; display:flex; align-items:center; justify-content:center;">${icon}</span>
              <div style="flex:1;">
                <div style="font-weight:bold; color:${textColor}; font-size:11px;">${title}${stack} <span style="color:#999; font-size:10px;">(${timerDisplay})</span></div>
                <div style="color:#999; font-size:10px;">${desc}</div>
              </div>
            </div>
          `); 
        }
      }catch(e){ console.error('Error rendering buffs:', e); }
      
      // Add DoTs (only for player)
      if(!state.groupMemberInventoryMode){
        try{
          for(const d of state.player.dots||[]){ 
            const meta = DOT_REGISTRY[d.id]; 
            const icon = renderEffectIcon(d.id, meta, true); 
            const title = `${meta?.name||d.id}`; 
            const desc = `${Math.round(d.damage||meta?.damage||0)} damage per ${(meta?.interval||d.tl||1.0)}s`; 
            const timer = (d.t||0).toFixed(1)+'s'; 
            const stack = (d.stacks||1)>1?` x${d.stacks||1}`:''; 
            effectsList.push(`
              <div style="display:flex; gap:8px; align-items:center; padding:4px; background:rgba(200,70,70,0.1); border-left:2px solid #c44; border-radius:2px; margin-bottom:4px;">
                <span style="width:32px; height:32px; display:flex; align-items:center; justify-content:center;">${icon}</span>
                <div style="flex:1;">
                  <div style="font-weight:bold; color:#c66; font-size:11px;">${title}${stack} <span style="color:#999; font-size:10px;">(${timer})</span></div>
                  <div style="color:#999; font-size:10px;">${desc}</div>
                </div>
              </div>
            `); 
          }
        }catch{}
      }
      
      // Add HOT effects (heal-over-time from state.effects.heals)
      if(!state.groupMemberInventoryMode){
        try{
          for(const h of state.effects.heals||[]){
            // Only show HOTs affecting the player
            const targets = h.targets ? (Array.isArray(h.targets) ? h.targets : [h.targets]) : [state.player];
            if(!targets.includes(state.player)) continue;
            
            const icon = '💚'; // Green heart emoji for healing
            const title = h.beacon ? 'Healing Field' : 'Heal Over Time';
            const desc = `+${h.amt.toFixed(1)} HP every ${h.tick.toFixed(1)}s`;
            const timer = (h.t||0).toFixed(1)+'s';
            effectsList.push(`
              <div style="display:flex; gap:8px; align-items:center; padding:4px; background:rgba(70,200,70,0.1); border-left:2px solid #4c4; border-radius:2px; margin-bottom:4px;">
                <span style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:20px;">${icon}</span>
                <div style="flex:1;">
                  <div style="font-weight:bold; color:#6c6; font-size:11px;">${title} <span style="color:#999; font-size:10px;">(${timer})</span></div>
                  <div style="color:#999; font-size:10px;">${desc}</div>
                </div>
              </div>
            `);
          }
        }catch(e){ console.error('Error rendering HOTs:', e); }
      }
      
      if(effectsList.length === 0){
        ui.levelEffectsList.innerHTML = '<div style="color:#999; font-size:10px;">No active effects</div>';
      } else {
        ui.levelEffectsList.innerHTML = effectsList.join('');
      }
    }
  };

  function trySpend(key, delta){
    const spends = state.progression.spends;
    const current = spends[key]|0;
    if(delta>0){ if(state.progression.statPoints<=0) return; spends[key]=current+1; state.progression.statPoints-=1; }
    else { if(current<=0) return; spends[key]=current-1; state.progression.statPoints+=1; }
    // Auto-apply: save immediately and update player stats
    saveJson('orb_rpg_mod_prog', state.progression);
    const st = currentStats(state);
    state.player.hp = clamp(state.player.hp, 0, st.maxHp);
    state.player.mana = clamp(state.player.mana, 0, st.maxMana);
    state.player.stam = clamp(state.player.stam, 0, st.maxStam);
    ui.renderLevel(); ui.renderInventory();
  }
  ui.hpInc.onclick=()=>trySpend('vit', +1);
  ui.hpDec.onclick=()=>trySpend('vit', -1);
  ui.manaInc.onclick=()=>trySpend('int', +1);
  ui.manaDec.onclick=()=>trySpend('int', -1);
  ui.strInc.onclick=()=>trySpend('str', +1);
  ui.strDec.onclick=()=>trySpend('str', -1);
  ui.defInc.onclick=()=>trySpend('def', +1);
  ui.defDec.onclick=()=>trySpend('def', -1);
  ui.stamInc.onclick=()=>trySpend('agi', +1);
  ui.stamDec.onclick=()=>trySpend('agi', -1);

  ui.renderBuffSystem = ()=>{
    // Render Active Effects icons within the Buff/Debuff tab
    const renderActiveIcons = ()=>{
      if(!ui.activeEffectsIcons) return;
      const icons = buildActiveEffectIcons(state);
      ui.activeEffectsIcons.innerHTML = icons.map(i=>i.html).join('');
    };
    const renderBuffCard = (id, buff) => {
      const dur = buff.duration ? `${buff.duration}s` : 'Permanent';
      const statsList = buff.stats ? Object.entries(buff.stats).map(([k,v])=>`${k}: ${v>=0?'+':''}${typeof v==='number'&&!Number.isInteger(v)?v.toFixed(2):v}`).join(', ') : '';
      const ticksList = buff.ticks ? `${buff.ticks.damage?'Dmg':'HP/Mana'}: ${buff.ticks.damage||buff.ticks.hp||buff.ticks.mana} every ${buff.ticks.interval}s` : '';
      const typeColor = buff.debuff ? '#c44' : '#4a4';
      const iconSrc = ICON_IMAGES[id];
      const iconHtml = iconSrc ? `<img src="${iconSrc}" style="width:64px; height:64px; border-radius:6px; object-fit:cover; border:2px solid ${typeColor};" />` : `<span style="font-size:40px;">${ICON_FALLBACKS[id] || (buff.debuff ? '☠' : '★')}</span>`;
      return `<div style="background:rgba(0,0,0,0.3); padding:8px; border-left:3px solid ${typeColor}; border-radius:3px; display:grid; grid-template-columns:64px 1fr; gap:8px; align-items:center;">
        <div style="width:64px; height:64px; display:flex; align-items:center; justify-content:center;">${iconHtml}</div>
        <div>
          <div style="font-weight:bold; color:${typeColor};">${buff.name}</div>
          <div style="font-size:10px; color:#999; margin-top:2px;">Duration: ${dur}</div>
          <div style="margin-top:4px; color:#ccc;">${buff.desc}</div>
          ${statsList ? `<div style="margin-top:4px; font-size:10px; color:#aaf;">${statsList}</div>` : ''}
          ${ticksList ? `<div style="margin-top:2px; font-size:10px; color:#f94;">${ticksList}</div>` : ''}
        </div>
      </div>`;
    };

    const combatBuffs = ['healing_empowerment','blessed','radiance','temporal_flux','berserker_rage','iron_will','swift_strikes','arcane_power','battle_fury','guardian_stance'];
    const sustainBuffs = ['regeneration','mana_surge','vigor','spirit','endurance','fortified','lifesteal_boost'];
    const mobilityBuffs = ['haste','sprint','slow','root','flight'];
    const utilityBuffs = ['focus','clarity','stealth','divine_shield','lucky','berserk'];
    const debuffs = ['poison','bleed','burn','arcane_burn','curse','weakness','vulnerability','silence','stun'];

    ui.combatBuffsList.innerHTML = combatBuffs.map(id => renderBuffCard(id, BUFF_REGISTRY[id])).join('');
    ui.sustainBuffsList.innerHTML = sustainBuffs.map(id => renderBuffCard(id, BUFF_REGISTRY[id])).join('');
    ui.mobilityBuffsList.innerHTML = mobilityBuffs.map(id => renderBuffCard(id, BUFF_REGISTRY[id])).join('');
    ui.utilityBuffsList.innerHTML = utilityBuffs.map(id => renderBuffCard(id, BUFF_REGISTRY[id])).join('');
    ui.debuffsList.innerHTML = debuffs.map(id => renderBuffCard(id, BUFF_REGISTRY[id])).join('');
    renderActiveIcons();
  };

  ui.equipSelected = ()=>{
    const isGroupMemberMode = state.groupMemberInventoryMode;
    const memberId = isGroupMemberMode;
    const settings = isGroupMemberMode ? state.group.settings[memberId] : null;
    const friendly = isGroupMemberMode ? state.friendlies.find(f => f.id === memberId) : null;
    const equipTarget = isGroupMemberMode ? settings?.equipment : state.player.equip;

    if(isGroupMemberMode && (!settings || !friendly || !equipTarget)){
      ui.toast('Group member not found.');
      state.selectedIndex = -1; state.selectedEquipSlot = null;
      return;
    }

    // Unequip currently selected equipped slot
    if(state.selectedEquipSlot){
      const slot = state.selectedEquipSlot;
      const equippedItem = equipTarget?.[slot];
      if(!equippedItem){ state.selectedEquipSlot=null; return; }
      equipTarget[slot] = null;
      state.inventory.push(equippedItem);
      state.selectedEquipSlot = null;
      state.selectedIndex = -1;
      if(!isGroupMemberMode){
        const currentClass = state.currentHero || 'warrior';
        state.heroEquip[currentClass] = {...state.player.equip};
      }
      ui.toast(`Unequipped: <b class="${rarityClass(equippedItem.rarity.key)}">${equippedItem.name}</b>`);
      ui.renderInventory();
      if(isGroupMemberMode) ui.renderGroupTab();
      return;
    }

    if(state.selectedIndex<0 || state.selectedIndex>=state.inventory.length) return;
    const item = state.inventory[state.selectedIndex];
    state.selectedEquipSlot = null;
    
    // Don't allow equipping items that are already on another hero
    if(!isGroupMemberMode && isEquippedOnOtherHero(item)){
      ui.toast(`Cannot equip: <b>${item.name}</b> is equipped on another hero.`);
      return;
    }
    
    const st = currentStats(state);
    if(item.kind==='potion'){
      if(isGroupMemberMode){
        ui.toast('Group members cannot use potions.');
        return;
      }
      // Equip potion to ability bar slot
      const prev = state.player.potion;
      state.player.potion = item;
      state.inventory.splice(state.selectedIndex,1);
      state.selectedIndex = -1;
      if(prev) state.inventory.push(prev);
      ui.toast(`Equipped to Potion Slot: <b class="${rarityClass(item.rarity.key)}">${item.name}</b> (x${item.count || 1}) - Use with [${nice(state.binds['potion'])}]`);
      ui.renderInventory();
      ui.renderAbilityBar();
      return;
    }

    if(item.kind==='armor' || item.kind==='weapon'){
      const slot = item.slot;
      
      // Check item level requirement - player must be at least item level to equip
      const itemLevel = item.itemLevel || 1;
      const playerLevel = state.progression?.level || 1;
      
      if(!isGroupMemberMode && itemLevel > playerLevel){
        ui.toast(`Cannot equip: <b>${item.name}</b> requires level ${itemLevel} (you are level ${playerLevel})`);
        return;
      }
      
      if(isGroupMemberMode){
        const prev = equipTarget[slot];
        equipTarget[slot] = item;
        state.inventory.splice(state.selectedIndex,1);
        state.selectedIndex = -1;
        if(prev) state.inventory.push(prev);
        ui.toast(`Equipped on ${settings.name}: <b class="${rarityClass(item.rarity.key)}">${item.name}</b>`);
        ui.renderInventory();
        ui.renderGroupTab();
      } else {
        const prev = equipTarget[slot];
        equipTarget[slot] = item;
        // Save to hero-specific equip
        const currentClass = state.currentHero || 'warrior';
        state.heroEquip[currentClass] = {...state.player.equip};
        state.inventory.splice(state.selectedIndex,1);
        state.selectedIndex = -1;
        if(prev) state.inventory.push(prev);
        ui.toast(`Equipped: <b class="${rarityClass(item.rarity.key)}">${item.name}</b>`);
        const st2 = currentStats(state);
        state.player.hp = clamp(state.player.hp,0,st2.maxHp);
        state.player.mana = clamp(state.player.mana,0,st2.maxMana);
        state.player.stam = clamp(state.player.stam,0,st2.maxStam);
        ui.renderInventory();
      }
    }
  };

  ui.useEquipBtn.onclick = ()=>{ ui.equipSelected(); };

  ui.dropBtn.onclick=()=>{
    if(state.selectedIndex<0 || state.selectedIndex>=state.inventory.length) return;
    const item=state.inventory[state.selectedIndex];
    state.inventory.splice(state.selectedIndex,1);
    state.selectedIndex=-1; state.selectedEquipSlot=null;
    state.loot.push({x:state.player.x, y:state.player.y, r:12, item, timeLeft:30.0});
    ui.toast(`Dropped: <b class="${rarityClass(item.rarity.key)}">${item.name}</b>`);
    ui.renderInventory();
  };

  ui.dropAllBtn.onclick=()=>{
    if(state.inventory.length===0){ ui.toast('Inventory is empty.'); return; }
    const count=state.inventory.length;
    while(state.inventory.length){
      const it=state.inventory.pop();
      state.loot.push({x:state.player.x, y:state.player.y, r:12, item:it, timeLeft:30.0});
    }
    state.selectedIndex=-1; state.selectedEquipSlot=null;
    ui.toast(`Dropped all items (${count}).`);
    ui.renderInventory();
  };

  // Inventory filter dropdown
  const invFilterDropdown = document.getElementById('invFilterDropdown');
  if(invFilterDropdown){
    invFilterDropdown.addEventListener('change', ()=>{
      ui.renderInventory();
    });
  }

  // Best items only checkbox
  const invBestOnlyCheckbox = document.getElementById('invBestOnlyCheckbox');
  if(invBestOnlyCheckbox){
    invBestOnlyCheckbox.addEventListener('change', ()=>{
      ui.renderInventory();
    });
  }

  // Menu buttons
  ui.btnResume.onclick=()=>ui.toggleMenu(false);
  
  // Options submenu navigation
  ui.btnOptions.onclick=()=>{
    ui.escMenuMain.style.display = 'none';
    ui.escMenuOptions.style.display = 'block';
  };
  
  ui.btnBackToMenu.onclick=()=>{
    ui.escMenuOptions.style.display = 'none';
    ui.escMenuMain.style.display = 'block';
  };

  // Apply options instantly when toggled so they take effect without needing the button
  const persistOpts = ()=>saveJson('orb_rpg_mod_opts', state.options);
  if(ui.optShowAim){
    ui.optShowAim.addEventListener('change', ()=>{
      state.options.showAim = !!ui.optShowAim.checked;
      persistOpts();
    });
  }
  if(ui.optAutoPickup){
    ui.optAutoPickup.addEventListener('change', ()=>{
      state.options.autoPickup = !!ui.optAutoPickup.checked;
      persistOpts();
    });
  }
  if(ui.optShowDebugAI){
    ui.optShowDebugAI.addEventListener('change', ()=>{
      state.options.showDebugAI = !!ui.optShowDebugAI.checked;
      persistOpts();
    });
  }
  if(ui.optShowDebugAIEnemies){
    ui.optShowDebugAIEnemies.addEventListener('change', ()=>{
      state.options.showDebugAIEnemies = !!ui.optShowDebugAIEnemies.checked;
      persistOpts();
    });
  }
  if(ui.optShowAbilityDisplay){
    ui.optShowAbilityDisplay.addEventListener('change', ()=>{
      state.options.showAbilityDisplay = !!ui.optShowAbilityDisplay.checked;
      persistOpts();
    });
  }

  ui.btnApplyOpts.onclick=()=>{
    state.options.showAim = !!ui.optShowAim.checked;
    state.options.showDebug = !!ui.optShowDebug.checked;
    state.options.showDebugAI = !!ui.optShowDebugAI?.checked;
    state.options.showDebugAIEnemies = !!ui.optShowDebugAIEnemies?.checked;
    state.options.showAbilityDisplay = !!ui.optShowAbilityDisplay?.checked;
    state.options.autoPickup = !!ui.optAutoPickup.checked;
      state.options.cameraMode = document.querySelector('input[name="cameraMode"]:checked')?.value || 'follow';
    saveJson('orb_rpg_mod_opts', state.options);
    ui.toast('Options applied.');
  };

  // Apply camera mode instantly on radio change and snap when switching to follow
  if(!ui._cameraModeBound){
    const bindCameraModeChange = ()=>{
      const sel = document.querySelector('input[name="cameraMode"]:checked')?.value;
      if(!sel) return;
      state.options.cameraMode = sel;
      saveJson('orb_rpg_mod_opts', state.options);
      if(sel === 'follow'){
        // Snap camera to player immediately to make change obvious
        state.camera.x = state.player.x;
        state.camera.y = state.player.y;
      }
      ui.toast(`Camera mode: ${sel === 'follow' ? 'Follow Character' : sel === 'freeview' ? 'Free View (Dead Zone)' : 'Classic Edge Scroll'}`);
    };
    if(ui.optCameraFreeView){ ui.optCameraFreeView.addEventListener('change', bindCameraModeChange); }
    if(ui.optCameraFollowChar){ ui.optCameraFollowChar.addEventListener('change', bindCameraModeChange); }
    if(ui.optCameraEdgeStrict){ ui.optCameraEdgeStrict.addEventListener('change', bindCameraModeChange); }
    ui._cameraModeBound = true;
  }

  ui.btnResetBinds.onclick=()=>{
    state.binds = structuredClone(DEFAULT_BINDS);
    saveJson('orb_rpg_mod_binds', state.binds);
    ui.rebindHint.style.display='none';
    state.rebindAction=null;
    ui.renderBindList();
    ui.renderAbilityBar();
    ui.toast('Keybinds reset.');
  };

  ui.btnDownloadAllLogs.onclick=()=>{
    try{
      let count = 0;
      const logs = [];
      
      if(ui.enablePlayerLog.checked){
        downloadPlayerLog(state);
        logs.push('Player');
        count++;
      }
      
      if(ui.enableCombatLog.checked){
        downloadCombatLog(state);
        logs.push('Combat');
        count++;
      }
      
      if(ui.enableDebugLog.checked){
        downloadDebugLog(state);
        logs.push('Debug');
        count++;
      }
      
      if(ui.enableAIBehaviorLog.checked){
        downloadAIBehaviorLog(state);
        logs.push('AI Behavior');
        count++;
      }
      
      if(ui.enableDamageLog.checked){
        // Generate damage log
        let report = 'Damage & Healing Report\n';
        report += '='.repeat(70) + '\n';
        report += `Generated: ${new Date().toLocaleString()}\n`;
        report += `Game Time: ${Math.floor(state.campaign?.time || 0)}s\n\n`;
        
        const fighters = [state.player, ...state.friendlies, ...state.enemies].filter(f=>f && !f.dead);
        
        report += 'DAMAGE DEALT:\n';
        report += '-'.repeat(70) + '\n';
        const byDamage = fighters.slice().sort((a,b)=>(b._damageDealt||0)-(a._damageDealt||0));
        for(const f of byDamage){
          const name = f===state.player ? 'PLAYER' : (f.name||f.variant||'Unknown');
          const team = state.friendlies.includes(f) ? 'Ally' : (state.enemies.includes(f) ? 'Enemy' : 'Player');
          report += `  ${name.padEnd(25)} [${team.padEnd(6)}] ${Math.round(f._damageDealt||0)}\n`;
        }
        
        report += '\nDAMAGE RECEIVED:\n';
        report += '-'.repeat(70) + '\n';
        const byReceived = fighters.slice().sort((a,b)=>(b._damageReceived||0)-(a._damageReceived||0));
        for(const f of byReceived){
          const name = f===state.player ? 'PLAYER' : (f.name||f.variant||'Unknown');
          const team = state.friendlies.includes(f) ? 'Ally' : (state.enemies.includes(f) ? 'Enemy' : 'Player');
          report += `  ${name.padEnd(25)} [${team.padEnd(6)}] ${Math.round(f._damageReceived||0)}\n`;
        }
        
        report += '\nHEALING DONE:\n';
        report += '-'.repeat(70) + '\n';
        const byHealing = fighters.slice().sort((a,b)=>(b._healingDone||0)-(a._healingDone||0));
        for(const f of byHealing){
          if((f._healingDone||0)===0) continue;
          const name = f===state.player ? 'PLAYER' : (f.name||f.variant||'Unknown');
          const team = state.friendlies.includes(f) ? 'Ally' : (state.enemies.includes(f) ? 'Enemy' : 'Player');
          report += `  ${name.padEnd(25)} [${team.padEnd(6)}] ${Math.round(f._healingDone||0)}\n`;
        }
        
        report += '\nSHIELDS PROVIDED:\n';
        report += '-'.repeat(70) + '\n';
        const byShield = fighters.slice().sort((a,b)=>(b._shieldProvided||0)-(a._shieldProvided||0));
        for(const f of byShield){
          if((f._shieldProvided||0)===0) continue;
          const name = f===state.player ? 'PLAYER' : (f.name||f.variant||'Unknown');
          const team = state.friendlies.includes(f) ? 'Ally' : (state.enemies.includes(f) ? 'Enemy' : 'Player');
          report += `  ${name.padEnd(25)} [${team.padEnd(6)}] ${Math.round(f._shieldProvided||0)}\n`;
        }
        
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `damage-report-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        logs.push('Damage');
        count++;
      }
      
      if(ui.enableAbilityLog.checked){
        // Generate ability log (copy from btnDownloadAbilityLog handler)
        const byAbility = state.abilityLog || {};
        let friendlyCount = 0;
        let enemyCount = 0;
        
        let log = 'Ability Usage Log\n';
        log += '='.repeat(70) + '\n';
        log += `Generated: ${new Date().toLocaleString()}\n`;
        log += `Game Time: ${Math.floor(state.campaign?.time || 0)}s\n\n`;
        
        log += 'FRIENDLY ABILITIES:\n';
        log += '-'.repeat(70) + '\n';
        for(const [ability, data] of Object.entries(byAbility)){
          if(data.kind !== 'friendly') continue;
          friendlyCount++;
          const roleStats = Object.entries(data.byRole).map(([role, count]) => `${role}:${count}`).join(', ');
          const casterEntries = Object.values(data.byCaster || {});
          const casterCount = casterEntries.length;
          let intervalSum = 0;
          let intervalN = 0;
          let minInterval = Infinity;
          for(const c of casterEntries){
            intervalSum += (c.sumIntervals || 0);
            intervalN += (c.intervalCount || 0);
            if(typeof c.minInterval === 'number') minInterval = Math.min(minInterval, c.minInterval);
          }
          const perCasterAvg = intervalN > 0 ? (intervalSum / intervalN) : 0;
          const cdInfo = data.expectedCd > 0
            ? ` | CD: ${data.expectedCd.toFixed(1)}s (actual/per-caster: ${perCasterAvg.toFixed(1)}s, casters: ${casterCount}${minInterval < Infinity ? `, min: ${minInterval.toFixed(2)}s` : ''})`
            : '';
          log += `${ability.padEnd(30)} Total: ${data.count.toString().padStart(5)} | ${roleStats}${cdInfo}\n`;
        }
        
        log += '\nENEMY ABILITIES:\n';
        log += '-'.repeat(70) + '\n';
        for(const [ability, data] of Object.entries(byAbility)){
          if(data.kind !== 'enemy') continue;
          enemyCount++;
          const roleStats = Object.entries(data.byRole).map(([role, count]) => `${role}:${count}`).join(', ');
          const casterEntries = Object.values(data.byCaster || {});
          const casterCount = casterEntries.length;
          let intervalSum = 0;
          let intervalN = 0;
          let minInterval = Infinity;
          for(const c of casterEntries){
            intervalSum += (c.sumIntervals || 0);
            intervalN += (c.intervalCount || 0);
            if(typeof c.minInterval === 'number') minInterval = Math.min(minInterval, c.minInterval);
          }
          const perCasterAvg = intervalN > 0 ? (intervalSum / intervalN) : 0;
          const cdInfo = data.expectedCd > 0
            ? ` | CD: ${data.expectedCd.toFixed(1)}s (actual/per-caster: ${perCasterAvg.toFixed(1)}s, casters: ${casterCount}${minInterval < Infinity ? `, min: ${minInterval.toFixed(2)}s` : ''})`
            : '';
          log += `${ability.padEnd(30)} Total: ${data.count.toString().padStart(5)} | ${roleStats}${cdInfo}\n`;
        }
        
        const blob = new Blob([log], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ability-usage-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        logs.push('Ability');
        count++;
      }
      
      if(ui.enableEffectLog.checked){
        // Generate effect log
        const effects = state.effectLog || [];
        const applied = state.effectApplyLog || [];
        let log = 'Effect Cast Log\n';
        log += '='.repeat(70) + '\n';
        log += `Generated: ${new Date().toLocaleString()}\n`;
        log += `Total Effects: ${effects.length}\n`;
        log += `Total Applied Effects: ${applied.length}\n`;
        log += `Game Time: ${Math.floor(state.campaign?.time || 0)}s\n\n`;

        // Quick validation helpers
        log += 'VALIDATION (APPLIED EFFECTS ATTRIBUTION):\n';
        log += '-'.repeat(70) + '\n';
        const missingSource = applied.filter(e => !e || !e.sourceAbilityId || e.sourceAbilityId === 'UNKNOWN_SOURCE');
        const missingEffectId = applied.filter(e => !e || !e.effectId);
        const missingTargetId = applied.filter(e => !e || !e.targetId);
        log += `Missing sourceAbilityId: ${missingSource.length}\n`;
        log += `Missing effectId:       ${missingEffectId.length}\n`;
        log += `Missing targetId:       ${missingTargetId.length}\n`;
        if(missingSource.length){
          log += '\nTop missing-source samples (first 12):\n';
          for(const evt of missingSource.slice(0, 12)){
            const ek = `${evt.effectKind || '?'}:${evt.effectId || '?'}`;
            const tgt = `${evt.targetKind || '?'}:${evt.targetName || evt.targetId || '?'}`;
            const caster = `${evt.sourceKind || evt.kind || '?'}:${evt.casterName || evt.casterId || '?'}`;
            log += `  t=${evt.time} ${ek.padEnd(18)} target=${tgt.padEnd(22)} caster=${caster}\n`;
          }
        }
        if(missingEffectId.length){
          log += '\nTop missing-effectId samples (first 12):\n';
          for(const evt of missingEffectId.slice(0, 12)){
            const ek = `${evt.effectKind || '?'}:${evt.effectId || '?'}`;
            const tgt = `${evt.targetKind || '?'}:${evt.targetName || evt.targetId || '?'}`;
            const src = `${evt.sourceKind || evt.kind || '?'}:${evt.sourceAbilityId || '?'}`;
            log += `  t=${evt.time} ${ek.padEnd(18)} target=${tgt.padEnd(22)} source=${src}\n`;
          }
        }
        if(missingTargetId.length){
          log += '\nTop missing-targetId samples (first 12):\n';
          for(const evt of missingTargetId.slice(0, 12)){
            const ek = `${evt.effectKind || '?'}:${evt.effectId || '?'}`;
            const tgt = `${evt.targetKind || '?'}:${evt.targetName || evt.targetId || '?'}`;
            const src = `${evt.sourceKind || evt.kind || '?'}:${evt.sourceAbilityId || '?'}`;
            log += `  t=${evt.time} ${ek.padEnd(18)} target=${tgt.padEnd(22)} source=${src}\n`;
          }
        }
        log += '\n';
        
        // Group by effect type
        const byType = {};
        for(const evt of effects){
          const key = `${evt.kind}|${evt.effectType}`;
          if(!byType[key]) byType[key] = [];
          byType[key].push(evt);
        }
        
        log += 'FRIENDLY EFFECTS:\n';
        log += '-'.repeat(70) + '\n';
        for(const [key, evts] of Object.entries(byType)){
          if(!key.startsWith('friendly|')) continue;
          const type = key.split('|')[1];
          const byAbility = {};
          for(const evt of evts){
            byAbility[evt.ability] = (byAbility[evt.ability] || 0) + 1;
          }
          log += `  ${type.toUpperCase()}:\n`;
          for(const [ability, count] of Object.entries(byAbility)){
            log += `    ${ability.padEnd(35)} ${count.toString().padStart(5)} casts\n`;
          }
        }
        
        log += '\nENEMY EFFECTS:\n';
        log += '-'.repeat(70) + '\n';
        for(const [key, evts] of Object.entries(byType)){
          if(!key.startsWith('enemy|')) continue;
          const type = key.split('|')[1];
          const byAbility = {};
          for(const evt of evts){
            byAbility[evt.ability] = (byAbility[evt.ability] || 0) + 1;
          }
          log += `  ${type.toUpperCase()}:\n`;
          for(const [ability, count] of Object.entries(byAbility)){
            log += `    ${ability.padEnd(35)} ${count.toString().padStart(5)} casts\n`;
          }
        }

        // ================= Applied Effects Audit =================
        log += '\nAPPLIED EFFECTS (AUDIT):\n';
        log += '-'.repeat(70) + '\n';
        log += 'Counts are per-target applications (more granular than cast logs).\n\n';

        // Group applied by sourceKind then by sourceAbilityId then by (effectKind|effectId)
        const appliedBySourceKind = {};
        for(const evt of applied){
          const sourceKind = evt.sourceKind || 'unknown';
          if(!appliedBySourceKind[sourceKind]) appliedBySourceKind[sourceKind] = [];
          appliedBySourceKind[sourceKind].push(evt);
        }

        const summarizeApplied = (evts)=>{
          const byAbility = {};
          for(const evt of evts){
            const ability = evt.sourceAbilityId || 'UNKNOWN_SOURCE';
            if(!byAbility[ability]) byAbility[ability] = {};
            const k = `${evt.effectKind || 'effect'}|${evt.effectId || 'unknown'}`;
            byAbility[ability][k] = (byAbility[ability][k] || 0) + 1;
          }
          return byAbility;
        };

        for(const [sourceKind, evts] of Object.entries(appliedBySourceKind)){
          log += `${String(sourceKind).toUpperCase()} APPLIED EFFECTS:\n`;
          const byAbility = summarizeApplied(evts);
          const abilities = Object.keys(byAbility).sort((a,b)=>{
            const ta = Object.values(byAbility[a]).reduce((s,n)=>s+n,0);
            const tb = Object.values(byAbility[b]).reduce((s,n)=>s+n,0);
            return tb - ta;
          });
          for(const ability of abilities){
            const effectsMap = byAbility[ability];
            const total = Object.values(effectsMap).reduce((s,n)=>s+n,0);
            log += `  ${ability.padEnd(30)} totalApplied: ${String(total).padStart(5)}\n`;
            const top = Object.entries(effectsMap)
              .sort((a,b)=>b[1]-a[1])
              .slice(0, 12);
            for(const [ekey, count] of top){
              const [kind, id] = ekey.split('|');
              log += `    ${(kind + ':' + id).padEnd(35)} ${String(count).padStart(5)}\n`;
            }
          }
          log += '\n';
        }

        // ================= Cast vs Applied Comparison =================
        log += 'CAST VS APPLIED (BY ABILITY):\n';
        log += '-'.repeat(70) + '\n';
        const castCounts = {};
        const abilityLog = state.abilityLog || {};
        for(const [ability, data] of Object.entries(abilityLog)){
          castCounts[ability] = data?.count || 0;
        }
        const appliedCounts = {};
        for(const evt of applied){
          const a = evt.sourceAbilityId || 'UNKNOWN_SOURCE';
          appliedCounts[a] = (appliedCounts[a] || 0) + 1;
        }
        const allAbilities = Array.from(new Set([...Object.keys(castCounts), ...Object.keys(appliedCounts)])).sort();
        for(const ability of allAbilities){
          const casts = castCounts[ability] || 0;
          const apps = appliedCounts[ability] || 0;
          const ratio = casts > 0 ? (apps / casts) : 0;
          log += `${ability.padEnd(30)} casts: ${String(casts).padStart(5)} | applied: ${String(apps).padStart(6)} | applied/cast: ${ratio.toFixed(2)}\n`;
        }
        
        const blob = new Blob([log], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `effect-log-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        logs.push('Effect');
        count++;
      }
      
      if(ui.enableConsoleLog.checked){
        // Generate console error log
        let errorLog = 'Console Errors Log\n';
        errorLog += '='.repeat(70) + '\n';
        errorLog += `Generated: ${new Date().toLocaleString()}\n`;
        errorLog += `Total Errors: ${(state.consoleErrors||[]).length}\n\n`;
        
        for(const err of (state.consoleErrors||[])){
          errorLog += `[${err.time}] ${err.type}: ${err.message}\n`;
          if(err.stack) errorLog += `  Stack: ${err.stack}\n`;
          errorLog += '\n';
        }
        
        const blob = new Blob([errorLog], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console-errors_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.log`;
        a.click();
        URL.revokeObjectURL(url);
        logs.push('Console');
        count++;
      }
      
      if(count === 0){
        ui.toast('No logs enabled - check at least one log type');
      } else {
        ui.toast(`Downloaded ${count} log${count>1?'s':''}: ${logs.join(', ')}`);
      }
    }catch(e){
      console.error('Error downloading logs:', e);
      ui.toast('Failed to download logs');
    }
  };

  // Open Save Manager from ESC menu Save
  ui.btnSave.onclick=()=>{ ui.toggleMenu(false); ui.toggleSaves(true); ui.saveNameInput.value = defaultSaveName(); };

  // Open Save Manager from ESC menu Load
  ui.btnLoad.onclick=()=>{ ui.toggleMenu(false); ui.toggleSaves(true); };

  ui.btnRestart.onclick=()=>{
    // super simple reset
    state.enemies.length=0; state.friendlies.length=0; state.projectiles.length=0; state.loot.length=0; state.inventory.length=0;
    for(const s of ARMOR_SLOTS) state.player.equip[s]=null;
    state.player.gold=0; state.player.shield=0;
    state.campaign.playerPoints=0; state.campaign.enemyPoints=0; state.campaign.time=0;
    state.campaignEnded=false;
    ui.hideEnd();
    ui.toggleMenu(false);
    ui.toggleInventory(false);
    state.paused=false;
    ui.toast('Campaign restarted.');
  };

  // Start next campaign (preserve loot/stats; reset timer/points only)
  const btnNextCampaign = document.getElementById('btnNextCampaign');
  if(btnNextCampaign){
    btnNextCampaign.onclick=()=>{
      // Reset campaign timer and points
      state.campaign.time = 0;
      state.campaign.playerPoints = 0;
      state.campaign.enemyPoints = 0;
      state.campaignEnded = false;
      
      // Respawn player at home base
      const homeBase = state.sites.find(s => s.id === 'home_player');
      if(homeBase){
        state.player.x = homeBase.x;
        state.player.y = homeBase.y;
        const st = currentStats(state);
        state.player.hp = st.maxHp;
        state.player.mana = st.maxMana;
        state.player.stam = st.maxStam;
        state.player.shield = 0;
        state.player.dead = false;
      }
      
      // Reset all captured flags to neutral and reset guard progression
      for(const site of state.sites){
        if(site.id && site.id.startsWith('site_')){
          site.owner = null;
          // Reset guard progression for fresh start
          site.guardProgression = null;
          site.guardRespawns = [];
        }
      }
      
      // Clear all enemies and friendlies (including guards)
      state.enemies.length = 0;
      state.friendlies.length = 0;
      
      // Clear projectiles and temporary effects
      state.projectiles.length = 0;
      state.effects.flashes.length = 0;
      state.effects.slashes.length = 0;
      state.effects.wells.length = 0;
      state.effects.heals.length = 0;
      
      // Respawn all friendlies at player home base using proper spawning function
      // This ensures they scale correctly with the player's current level
      if(homeBase && state.group.members.length > 0){
        for(const memberId of state.group.members){
          const settings = state.group.settings[memberId];
          if(settings && state._npcUtils && state._npcUtils.spawnFriendlyAt){
            // Use spawnFriendlyAt to ensure proper scaling based on player level
            const ally = state._npcUtils.spawnFriendlyAt(state, homeBase, settings.class || 'warrior');
            // Override ID and equipment to match saved group member
            if(ally){
              ally.id = memberId;
              ally.equip = settings.equipment || {};
            }
          }
        }
      }
      
      // Respawn enemies at their home bases (scale with player level for balanced gameplay)
      for(const site of state.sites){
        if(site.id && site.id.startsWith('home_') && site.id !== 'home_player'){
          const team = site.owner || 'teamA';
          // Spawn 5 enemies per home base, scaling with player level
          for(let i = 0; i < 5; i++){
            const angle = (i / 5) * Math.PI * 2;
            const dist = 80 + Math.random() * 40;
            // Use zone-based leveling if available, or fall back to player level
            if(state._npcUtils && state._npcUtils.spawnEnemyAt){
              state._npcUtils.spawnEnemyAt(state, 
                site.x + Math.cos(angle) * dist,
                site.y + Math.sin(angle) * dist,
                0, { homeSiteId: site.id, team: team });
            }
          }
        }
      }
      
      // Spawn guards for all flags (both player and AI owned)
      for(const site of state.sites){
        if(site.id && site.id.startsWith('site_') && site.owner){
          spawnGuardsForSite(state, site, 5);
        }
      }
      
      ui.endOverlay.classList.remove('show');
      state.paused = false;
      ui.toast('Next campaign started! Map reset, loot and levels persist.');
    };
  }

  ui.btnOpenInv2.onclick=()=>ui.toggleInventory(true);

  // Exit to Main Menu from ESC overlay
  // Add button wiring if present in markup (we'll add button in overlay below)
  const btnExitToMenu = document.getElementById('btnExitToMenu');
  if(btnExitToMenu){
    btnExitToMenu.onclick=()=>{
      // Auto-save before exiting
      try{ autoSave(); }catch(e){ console.error('Exit auto-save failed:', e); }
      
      // CLEAR ABILITY SLOTS when exiting to menu - prevents slots from persisting
      state.abilitySlots = [null, null, null, null, null];
      console.log('[EXIT] Ability slots cleared on exit to main menu');
      
      // Hide in-game UI and show main menu
      ui.toggleMenu(false);
      ui.setGameUIVisible(false);
      // Hide any other overlays that might be open (save/inv/end)
      try{ ui.saveOverlay.classList.remove('show'); ui.invOverlay.classList.remove('show'); ui.endOverlay.classList.remove('show'); }catch{}
      ui.mainMenu.classList.add('show');
      state.paused=true;
      
      // Stop game music and start main menu music
      if(state.sounds?.gameNonCombatMusic && !state.sounds.gameNonCombatMusic.paused){
        state.sounds.gameNonCombatMusic.pause();
      }
      if(state.sounds?.gameCombatMusic && !state.sounds.gameCombatMusic.paused){
        state.sounds.gameCombatMusic.pause();
      }
      if(state.sounds?.mainMenuMusic && state.sounds.mainMenuMusic.paused){
        state.sounds.mainMenuMusic.play().catch(e => console.warn('Main menu music play failed:', e));
      }
      
      ui.toast('Returned to Main Menu');
    };
  }

  // Keybind rebinding (simple)
  ui.renderBindList = ()=>{
    ui.bindList.innerHTML='';
    for(const act of Object.keys(DEFAULT_BINDS)){
      const row=document.createElement('div');
      row.className='bindRow';
      row.innerHTML = `
        <div>
          <div style="font-weight:900">${ACTION_LABELS[act]}</div>
          <div class="small">Current: <span class="kbd">${nice(state.binds[act])}</span></div>
        </div>
      `;
      const btn=document.createElement('button');
      btn.className='secondary';
      btn.textContent='Rebind';
      btn.onclick=()=>{
        state.rebindAction=act;
        ui.rebindHint.style.display='block';
        ui.toast(`Rebinding: <b>${ACTION_LABELS[act]}</b>`);
      };
      row.appendChild(btn);
      ui.bindList.appendChild(row);
    }
  };

  addEventListener('keydown', (e)=>{
    if(!state.rebindAction) return;
    if(e.code==='Escape'){
      state.rebindAction=null;
      ui.rebindHint.style.display='none';
      ui.toast('Rebind cancelled.');
      return;
    }
    const newCode=e.code;
    const old=state.binds[state.rebindAction];
    for(const [act,code] of Object.entries(state.binds)){
      if(code===newCode) state.binds[act]=old;
    }
    state.binds[state.rebindAction]=newCode;
    saveJson('orb_rpg_mod_binds', state.binds);
    state.rebindAction=null;
    ui.rebindHint.style.display='none';
    ui.renderBindList();
    ui.renderAbilityBar();
    ui.toast('Rebound.');
  });

  ui.renderBindList();
  
  // ===== GROUP SYSTEM FUNCTIONS =====
  
  // Add friendly to group
  ui.inviteToGroup = (friendlyUnit, opts={})=>{
    const { silent=false, deferRender=false } = opts;
    console.log(`[GROUP] Attempting to invite ${friendlyUnit.name} (ID: ${friendlyUnit.id}), current members:`, state.group.members.length);
    if(state.group.members.length >= 10){
      ui.toast(`Group full! Max 10 members.`);
      console.log('[GROUP] Group full, cannot invite');
      return;
    }
    if(state.group.members.includes(friendlyUnit.id)){
      ui.toast(`${friendlyUnit.name} is already in the group.`);
      console.log('[GROUP] Member already in group');
      return;
    }
    state.group.members.push(friendlyUnit.id);
    console.log('[GROUP] Member added to group. New count:', state.group.members.length);
    const baseEquip = friendlyUnit.equipment ? structuredClone(friendlyUnit.equipment) : Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null]));
    const baseAbilities = friendlyUnit.npcAbilities ? friendlyUnit.npcAbilities.slice() : defaultAbilitySlots();
    // Default role should reflect the ally's class/role, not always DPS
    const defaultRole = (friendlyUnit.role
      || (friendlyUnit.variant==='mage' ? 'healer' : ((friendlyUnit.variant==='warden'||friendlyUnit.variant==='knight') ? 'tank' : 'dps')));
    state.group.settings[friendlyUnit.id] = {
      name: friendlyUnit.name || 'Ally',
      behavior: 'neutral', // neutral is default
      role: defaultRole, // dps/tank/healer (lowercase for UI)
      class: friendlyUnit.variant || 'warrior',
      equipment: baseEquip,
      abilities: baseAbilities
    };
    console.log('[GROUP] Settings role assigned:', defaultRole, 'variant:', friendlyUnit.variant);
    console.log('[GROUP] Settings created for:', friendlyUnit.id);
    if(!silent) ui.toast(`<b>${friendlyUnit.name}</b> invited to group!`);
    if(!deferRender){
      ui.renderGroupPanel();
      ui.renderGroupTab(); // Update the group tab to show new member
    }
    console.log('[GROUP] Invite complete. Total members:', state.group.members.length);
  };
  
  // Remove friendly from group
  ui.removeFromGroup = (friendlyId)=>{
    console.log('[GROUP] Removing member:', friendlyId);
    state.group.members = state.group.members.filter(id => id !== friendlyId);
    // Preserve settings so re-adding retains gear/abilities
    if(state.group.selectedMemberId === friendlyId) state.group.selectedMemberId = null;
    ui.groupMemberDetails.innerHTML = ''; // Clear details panel
    ui.renderGroupPanel();
    ui.renderGroupTab();
    console.log('[GROUP] Member removed. Remaining:', state.group.members.length);
  };

  function ensureFriendlyIdentity(f){
    if(!f.id){ f.id = `f_${Date.now()}_${Math.floor(Math.random()*100000)}`; }
    if(!f.name){ const base = f.variant||'Ally'; f.name = `${String(base).charAt(0).toUpperCase()+String(base).slice(1)} ${Math.floor(Math.random()*999)+1}`; }
  }

  ui.addAllAlliesToGroup = ()=>{
    const openSlots = Math.max(0, 10 - state.group.members.length);
    if(openSlots <= 0){ ui.toast('Group full! Max 10 members.'); return; }
    const candidates = state.friendlies.filter(f => !state.group.members.includes(f.id));
    if(!candidates.length){ ui.toast('No allies available to add.'); return; }
    let added = 0;
    for(const friendly of candidates){
      if(state.group.members.length >= 10) break;
      ensureFriendlyIdentity(friendly);
      ui.inviteToGroup(friendly, { silent:true, deferRender:true });
      added++;
    }
    ui.renderGroupPanel();
    ui.renderGroupTab();
    ui.toast(`Added ${added} alli${added===1?'y':'es'} to group.`);
  };

  ui.disbandGroup = ()=>{
    const had = state.group.members.length;
    state.group.members = [];
    state.group.selectedMemberId = null;
    if(ui.groupMemberDetails) ui.groupMemberDetails.innerHTML = '';
    ui.renderGroupPanel();
    ui.renderGroupTab();
    ui.toast(had ? `Disbanded group (${had}).` : 'Group is already empty.');
  };

  ui._inviteAlly = (friendlyId)=>{
    const friendly = state.friendlies.find(f=>f.id===friendlyId);
    if(!friendly){ ui.toast('Ally not found'); return; }
    ensureFriendlyIdentity(friendly);
    ui.inviteToGroup(friendly);
    ui.renderAlliesTab();
  };

  ui._setAllyBehavior = (friendlyId, behavior)=>{
    const friendly = state.friendlies.find(f=>f.id===friendlyId);
    if(!friendly) return;
    friendly.behavior = behavior;
    if(state.group.settings[friendlyId]) state.group.settings[friendlyId].behavior = behavior;
    ui.renderAlliesTab();
    if(state.group.members.includes(friendlyId)) ui.renderGroupTab();
    ui._selectAlly(friendlyId);
  };

  ui._setAllyRole = (friendlyId, role)=>{
    const friendly = state.friendlies.find(f=>f.id===friendlyId);
    if(!friendly) return;
    friendly.role = role;
    if(state.group.settings[friendlyId]) state.group.settings[friendlyId].role = role;
    ui.renderAlliesTab();
    if(state.group.members.includes(friendlyId)) ui.renderGroupTab();
    ui._selectAlly(friendlyId);
  };

  ui._setAllyClass = (friendlyId, cls)=>{
    const friendly = state.friendlies.find(f=>f.id===friendlyId);
    if(!friendly) return;
    ensureFriendlyIdentity(friendly);
    friendly.variant = cls;
    try{ applyClassToUnit(friendly, cls); }catch{}
    if(state.group.settings[friendlyId]) state.group.settings[friendlyId].class = cls;
    ui.renderAlliesTab();
    if(state.group.members.includes(friendlyId)) ui.renderGroupTab();
    ui._selectAlly(friendlyId);
  };

  ui._editAllyEquipment = (friendlyId)=>{
    if(!state.group.members.includes(friendlyId)){
      ui.toast('Invite this ally to the group to edit equipment & abilities.');
      return;
    }
    ui._selectGroupMember(friendlyId);
    ui._editGroupMemberEquipment(friendlyId);
  };

  ui._selectAlly = (friendlyId)=>{
    if(!ui.allyDetails) return;
    const friendly = state.friendlies.find(f=>f.id===friendlyId);
    if(!friendly){ ui.allyDetails.innerHTML='<div class="small" style="color:#888;">Ally not found.</div>'; return; }
    ensureFriendlyIdentity(friendly);
    state._selectedAllyId = friendlyId;
    const inGroup = state.group.members.includes(friendlyId);
    const settings = state.group.settings[friendlyId];
    const behavior = friendly.behavior || settings?.behavior || 'neutral';
    const role = (friendly.role || settings?.role || 'dps');
    const cls = friendly.variant || settings?.class || 'warrior';
    const guard = !!friendly.guard;
    const hpPct = Math.round((friendly.hp/friendly.maxHp)*100);
    const roleOptions = ['dps','tank','healer'];
    const behaviorOptions = ['aggressive','neutral'];
    let html = `
      <div style="margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div style="font-weight:bold; color:#fff;">${friendly.name}</div>
        ${inGroup ? '<span class="pill" style="background:rgba(122,162,255,0.3); border:1px solid rgba(122,162,255,0.6);">In Group</span>' : ''}
        ${guard ? '<span class="pill" style="background:rgba(255,180,120,0.25); border:1px solid rgba(255,180,120,0.6);">Guard</span>' : ''}
      </div>
      <div class="small" style="color:#aaa; margin-bottom:8px;">${hpPct}% HP • Class: ${cls} • Role: ${(role||'dps').toUpperCase()} • Behavior: ${behavior}</div>
      <div style="margin-bottom:10px;">
        <input type="text" id="allyNameInput" value="${friendly.name}" style="width:100%; padding:6px; font-size:12px;" placeholder="Ally name" />
      </div>
      <div style="margin-bottom:10px;">
        <div class="small" style="font-weight:bold; margin-bottom:6px;">Class</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${['warrior','mage','knight','warden'].map(c=>{
            const active = cls===c;
            const clsBtn = active ? '' : 'secondary';
            const bg = active ? 'background:rgba(122,162,255,0.3);' : '';
            const label = c.charAt(0).toUpperCase()+c.slice(1);
            return `<button class="${clsBtn}" style="flex:1; padding:6px; font-size:11px; ${bg}" onclick="ui._setAllyClass('${friendlyId}','${c}')">${label}</button>`;
          }).join('')}
        </div>
      </div>
      <div style="margin-bottom:10px;">
        <div class="small" style="font-weight:bold; margin-bottom:6px;">Role</div>
        <div style="display:flex; gap:6px;">
          ${roleOptions.map(r=>{
            const active = r===role;
            const clsBtn = active ? '' : 'secondary';
            const bg = active ? 'background:rgba(122,162,255,0.3);' : '';
            return `<button class="${clsBtn}" style="flex:1; padding:6px; font-size:11px; ${bg}" onclick="ui._setAllyRole('${friendlyId}','${r}')">${r.toUpperCase()}</button>`;
          }).join('')}
        </div>
      </div>
      <div style="margin-bottom:10px;">
        <div class="small" style="font-weight:bold; margin-bottom:6px;">Behavior</div>
        <div style="display:flex; gap:6px;">
          ${behaviorOptions.map(b=>{
            const active = b===behavior;
            const clsBtn = active ? '' : 'secondary';
            const bg = active ? 'background:rgba(122,162,255,0.3);' : '';
            return `<button class="${clsBtn}" style="flex:1; padding:6px; font-size:11px; ${bg}" onclick="ui._setAllyBehavior('${friendlyId}','${b}')">${b.toUpperCase()}</button>`;
          }).join('')}
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:10px; display:flex; flex-direction:column; gap:6px;">
        <button style="width:100%; padding:8px;" ${guard ? 'disabled class="secondary"' : ''} onclick="ui._inviteAlly('${friendlyId}')">${guard ? 'Guards cannot join' : (inGroup ? 'Already in Group' : 'Invite to Group')}</button>
        <button style="width:100%; padding:8px;" onclick="ui._editAllyEquipment('${friendlyId}')" ${inGroup ? '' : 'class="secondary"'}>${inGroup ? 'Edit Equipment & Abilities' : 'Edit (requires group invite)'}</button>
      </div>
    `;
    ui.allyDetails.innerHTML = html;

    // wire name input
    setTimeout(()=>{
      const inp = document.getElementById('allyNameInput');
      if(inp){
        inp.addEventListener('input', (e)=>{
          const nm = e.target.value.trim();
          if(!nm) return;
          friendly.name = nm;
          if(state.group.settings[friendlyId]) state.group.settings[friendlyId].name = nm;
          ui.renderAlliesTab();
          if(state.group.members.includes(friendlyId)) ui.renderGroupTab();
        });
      }
    },0);
  };

  ui.renderAlliesTab = ()=>{
    if(!ui.allyList) return;
    const allies = (state.friendlies||[]).filter(f=>f.respawnT<=0);
    if(allies.length===0){
      ui.allyList.innerHTML = '<div class="small" style="padding:12px; color:#888;">No allies yet.</div>';
      if(ui.allyTabCount) ui.allyTabCount.textContent = '0';
      ui.allyDetails.innerHTML = '<div class="small" style="color:#999; padding:8px;">Select any ally to manage or invite to group.</div>';
      return;
    }
    const cards=[];
    for(const f of allies){
      ensureFriendlyIdentity(f);
      const inGroup = state.group.members.includes(f.id);
      const guard = !!f.guard;
      const behavior = f.behavior || state.group.settings[f.id]?.behavior || 'neutral';
      const role = (f.role || state.group.settings[f.id]?.role || 'dps');
      const cls = f.variant || 'warrior';
      const hpPct = Math.round((f.hp/f.maxHp)*100);
      const badge = inGroup ? 'In Group' : (guard ? 'Guard' : 'Ally');
      const inviteBtn = (!inGroup && !guard) ? `<button class="secondary" style="padding:4px 8px; font-size:10px;" onclick="ui._inviteAlly('${f.id}'); event.stopPropagation();">Invite</button>` : '';
      const roleU = (role||'dps').toUpperCase();
      const roleCol = roleU==='HEALER' ? 'rgba(99,200,255,0.25)' : roleU==='TANK' ? 'rgba(255,200,120,0.25)' : 'rgba(200,160,255,0.25)';
      const roleBorder = roleU==='HEALER' ? 'rgba(99,200,255,0.6)' : roleU==='TANK' ? 'rgba(255,200,120,0.6)' : 'rgba(200,160,255,0.6)';
      const card = `
        <div class="box" style="padding:8px; margin:6px; cursor:pointer; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08);" onclick="ui._selectAlly('${f.id}')">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div>
              <div style="font-weight:bold; color:#fff;">${f.name}</div>
              <div class="small" style="color:#aaa;">${cls} • ${roleU} • ${behavior}</div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">${inviteBtn}
              <span class="pill" style="background:${roleCol}; border:1px solid ${roleBorder};">${roleU}</span>
              <span class="pill" style="background:rgba(122,162,255,0.2); border:1px solid rgba(122,162,255,0.4);">${badge}</span>
            </div>
          </div>
          <div style="width:100%; height:6px; background:rgba(0,0,0,0.5); border-radius:2px; margin-top:6px; overflow:hidden;">
            <div style="height:100%; background:rgb(76,175,80); width:${hpPct}%;"></div>
          </div>
        </div>
      `;
      cards.push(card);
    }
    ui.allyList.innerHTML = cards.join('');
    if(ui.allyTabCount) ui.allyTabCount.textContent = allies.length.toString();
  };
  
  // Render group members list in group tab
  ui.renderGroupTab = ()=>{
    if(!ui.groupMembersList) return;
    console.log('[GROUP] Rendering group tab. Members:', state.group.members.length, state.group.members);
    const actionsHtml = `
      <div class="group-actions">
        <button onclick="ui.addAllAlliesToGroup()">Add all allies to group</button>
        <button class="danger" onclick="ui.disbandGroup()">Disband group</button>
      </div>`;
    if(state.group.members.length === 0){
      ui.groupMembersList.innerHTML = actionsHtml + '<div class="small" style="padding:12px; color:#888;">No group members. Invite allies to get started.</div>';
      ui.groupMemberCount.textContent = '0';
      console.log('[GROUP] No members to display');
      return;
    }
    const list = [];
    for(const memberId of state.group.members){
      const friendly = state.friendlies.find(f => f.id === memberId);
      const settings = state.group.settings[memberId];
      console.log(`[GROUP] Processing member ${memberId}: friendly=${friendly?.name}, settings=${settings?.name}`);
      if(!friendly || !settings) {
        console.log(`[GROUP] Skipping ${memberId} - missing friendly or settings`);
        continue;
      }
      const healthPct = Math.round((friendly.hp / friendly.maxHp) * 100);
      const roleU = (settings.role||'dps').toUpperCase();
      const roleCol = roleU==='HEALER' ? 'rgba(99,200,255,0.25)' : roleU==='TANK' ? 'rgba(255,200,120,0.25)' : 'rgba(200,160,255,0.25)';
      const roleBorder = roleU==='HEALER' ? 'rgba(99,200,255,0.6)' : roleU==='TANK' ? 'rgba(255,200,120,0.6)' : 'rgba(200,160,255,0.6)';
      const html = `
        <div class="box group-card" style="padding:8px; margin:0; cursor:pointer; background:rgba(122,162,255,0.1); border:1px solid rgba(122,162,255,0.2)" onclick="ui._selectGroupMember('${memberId}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:bold; color:#fff; display:flex; align-items:center; gap:6px;">
              <span>${settings.name}</span>
              <span class="pill" style="background:${roleCol}; border:1px solid ${roleBorder};">${roleU}</span>
            </div>
            <button class="secondary" style="padding:4px 8px; font-size:10px;" onclick="ui.removeFromGroup('${memberId}'); event.stopPropagation();">Remove</button>
          </div>
          <div class="small" style="margin-top:4px; color:#aaa;">${friendly.hp.toFixed(0)}/${friendly.maxHp.toFixed(0)} HP | Role: ${roleU} | Behavior: ${settings.behavior}</div>
          <div style="width:100%; height:6px; background:rgba(0,0,0,0.5); border-radius:2px; margin-top:4px; overflow:hidden;">
            <div style="height:100%; background:rgb(76,175,80); width:${healthPct}%;"></div>
          </div>
        </div>
      `;
      list.push(html);
    }
    ui.groupMembersList.innerHTML = actionsHtml + list.join('');
    ui.groupMemberCount.textContent = state.group.members.length.toString();
    console.log('[GROUP] Rendered', list.length, 'members in group tab');
  };

  // Render slot management tab
  ui.renderSlotTab = () => {
    if (!ui.guardSlotList || !ui.allySlotList) return;
    
    // Update header info
    const sp = state.progression?.skillPoints || 0;
    const level = state.level || 1;
    const zoneTier = state.zoneConfig?.zoneTier || 1;
    
    if (ui.slotSP) ui.slotSP.textContent = sp.toString();
    if (ui.slotPlayerLevel) ui.slotPlayerLevel.textContent = level.toString();
    if (ui.slotZoneTier) ui.slotZoneTier.textContent = zoneTier.toString();
    
    // Render guard slots
    const guards = state.slotSystem?.guards || [];
    const guardCards = guards.map(slot => ui._renderSlotCard(slot, 'guard'));
    ui.guardSlotList.innerHTML = guardCards.join('');
    
    // Render ally slots
    const allies = state.slotSystem?.allies || [];
    const allyCards = allies.map(slot => ui._renderSlotCard(slot, 'ally'));
    ui.allySlotList.innerHTML = allyCards.join('');
    
    // Attach hover events for loadout tooltips
    ui._attachSlotTooltips();
  };

  // Render individual slot card
  ui._renderSlotCard = (slot, type) => {
    const unlocked = slot.unlocked;
    const level = slot.level || 0;
    const loadoutId = slot.loadoutId || null;
    const sp = state.progression?.skillPoints || 0;
    
    // Role styling
    const roleColors = {
      tank: { bg: 'rgba(255,200,120,0.15)', border: 'rgba(255,200,120,0.5)', text: '#ffc878' },
      dps: { bg: 'rgba(255,100,100,0.15)', border: 'rgba(255,100,100,0.5)', text: '#ff6464' },
      support: { bg: 'rgba(99,200,255,0.15)', border: 'rgba(99,200,255,0.5)', text: '#63c8ff' },
      healer: { bg: 'rgba(99,200,255,0.15)', border: 'rgba(99,200,255,0.5)', text: '#63c8ff' },
      flex: { bg: 'rgba(200,160,255,0.15)', border: 'rgba(200,160,255,0.5)', text: '#c8a0ff' },
      elite: { bg: 'rgba(212,175,55,0.15)', border: 'rgba(212,175,55,0.5)', text: '#d4af37' }
    };
    const roleStyle = roleColors[slot.role] || roleColors.flex;
    
    // Loadout info
    let loadoutName = 'None';
    let loadoutInfo = '';
    if (loadoutId && window.LOADOUTS) {
      const loadout = window.LOADOUTS.getLoadout(loadoutId);
      if (loadout) {
        loadoutName = loadout.name;
        const weapon = loadout.weapon?.name || 'No weapon';
        const abilities = loadout.abilities?.map(a => a.name || 'Unknown').join(', ') || 'No abilities';
        loadoutInfo = `<div class="small" style="color:#999; margin-top:2px;">${weapon} • ${abilities}</div>`;
      }
    }
    
    // Locked state
    if (!unlocked) {
      const unlockCost = 1; // Always 1 SP to unlock
      const canAfford = sp >= unlockCost;
      const btnStyle = canAfford ? '' : 'opacity:0.5; cursor:not-allowed;';
      
      return `
        <div class="box" style="padding:10px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:bold; color:#666;">🔒 ${slot.id}</div>
              <div class="small" style="color:#888;">${slot.role.toUpperCase()} • Locked</div>
            </div>
            <button class="secondary" style="padding:6px 12px; font-size:11px; ${btnStyle}" onclick="ui._unlockSlot('${slot.id}')" ${!canAfford ? 'disabled' : ''}>
              Unlock (${unlockCost} SP)
            </button>
          </div>
        </div>
      `;
    }
    
    // Unlocked state
    const upgradeCost = Math.ceil(1 + (level * 0.1));
    const canAffordUpgrade = sp >= upgradeCost;
    const upgradeBtnStyle = canAffordUpgrade ? '' : 'opacity:0.5; cursor:not-allowed;';
    
    // Get full loadout details for portrait and tooltip
    let loadoutData = null;
    if (loadoutId && window.LOADOUTS) {
      loadoutData = window.LOADOUTS.getLoadout(loadoutId);
    }
    
    // Build equipment display for slot cards (weapon + armor)
    const buildEquipmentDisplay = () => {
      if (!loadoutData) return '';
      
      const loadoutRarity = loadoutData.rarity || 'common';
      const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      
      let html = '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; padding:6px; background:rgba(0,0,0,0.3); border-radius:4px; max-width:340px;">';
      html += '<div style="width:100%; color:#888; font-size:10px; margin-bottom:4px;">Equipment:</div>';
      
      // Weapon icon
      if (loadoutData.weapon) {
        const weaponType = loadoutData.weapon.weaponType;
        const weaponImagePath = getAssetPath(`assets/items/${capitalize(loadoutRarity)} ${weaponType}.png`);
        html += `
          <div style="
            width: 32px;
            height: 32px;
            background: rgba(40,40,50,0.9);
            border: 2px solid ${roleStyle.border};
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: help;
            overflow: hidden;
          " title="Weapon: ${weaponType}">
            <img src="${weaponImagePath}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.innerHTML='⚔';" alt="${weaponType}" />
          </div>
        `;
      }
      
      // Armor icons
      if (loadoutData.armor) {
        const armorSlots = ['helm', 'chest', 'shoulders', 'hands', 'belt', 'legs', 'feet', 'neck', 'accessory1', 'accessory2'];
        armorSlots.forEach(slotName => {
          const armorPiece = loadoutData.armor[slotName];
          if (!armorPiece) return;
          const armorType = armorPiece.armorType || 'Unknown';
          
          const slotDisplayName = slotName === 'accessory1' || slotName === 'accessory2' ? 'bracelet' : slotName;
          const imagePath = getAssetPath(`assets/items/${loadoutRarity} ${slotDisplayName}.png`);
          
          html += `
            <div style="
              width: 32px;
              height: 32px;
              background: rgba(40,40,50,0.9);
              border: 1px solid ${roleStyle.border};
              border-radius: 3px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: help;
              overflow: hidden;
            " title="${slotName}: ${armorType}">
              <img src="${imagePath}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.innerHTML='${slotName.charAt(0).toUpperCase()}';" alt="${slotName}" />
            </div>
          `;
        });
      }
      
      html += '</div>';
      return html;
    };
    
    return `
      <div class="box slot-card" data-slot-id="${slot.id}" style="padding:10px; background:${roleStyle.bg}; border:1px solid ${roleStyle.border}; position:relative;">
        <div style="display:flex; gap:10px;">
          
          <!-- Fighter Portrait -->
          <div style="
            width: 80px;
            height: 80px;
            flex-shrink: 0;
            background: linear-gradient(135deg, #333 0%, #222 100%);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 10px;
            border: 2px solid ${roleStyle.border};
            overflow: hidden;
            ${loadoutData ? 'cursor: pointer;' : ''}
            transition: all 0.2s;
          " ${loadoutData ? `onclick="event.stopPropagation(); ui._showFighterPreview('${loadoutId}')" onmouseover="this.style.transform='scale(1.05)'; this.style.borderColor='#d4af37';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='${roleStyle.border}';" title="Click to view full fighter details"` : ''}>
            ${loadoutData && loadoutData.fighterImage && !loadoutData.fighterImage.includes('placeholder') ? 
              `<img src="${getAssetPath('assets/fighter player cards/' + loadoutData.fighterImage)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='${loadoutData.name || 'Fighter'}';" alt="${loadoutData.name}"/>` :
              loadoutData ? loadoutData.name || 'Fighter' : '?'
            }
            ${loadoutData && level > 0 ? `<div style="position:absolute; top:4px; left:4px; width:28px; height:28px; border-radius:50%; background:#1a1a1a; border:2px solid #d4af37; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:bold; color:#d4af37; box-shadow:0 2px 4px rgba(0,0,0,0.8);">${level}</div>` : ''}
          </div>
          
          <!-- Slot Info -->
          <div style="flex: 1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <div>
                <div style="font-weight:bold; color:${roleStyle.text}; font-size:13px;">✓ ${slot.id}</div>
                <div class="small" style="color:#ccc; font-size:11px;">${slot.role.toUpperCase()} • Level ${level}</div>
                <div class="small" style="font-weight:bold; color:#d4af37; margin-top:4px; font-size:11px;">
                  ${loadoutName}
                  ${loadoutData?.weapon ? `<br><span style="color:#8cf; font-size:10px;">⚔ ${loadoutData.weapon.weaponType}</span>` : ''}
                </div>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="secondary" style="padding:6px 10px; font-size:11px;" onclick="ui._openLoadoutPicker('${slot.id}')">
                  🎴 Change
                </button>
              </div>
            </div>
            
            <!-- Equipment Row -->
            ${buildEquipmentDisplay()}
            
            <!-- Abilities Row -->
            ${loadoutData?.abilities ? `
              <div style="display:flex; gap:4px; margin-top:8px; padding:6px; background:rgba(0,0,0,0.3); border-radius:4px;">
                <div style="color:#888; font-size:10px; margin-right:4px; align-self:center;">Abilities:</div>
                ${loadoutData.abilities.slice(0, 5).map((abilityId, i) => {
                  const ABILITIES = window.ABILITIES || {};
                  const skillData = ABILITIES[abilityId];
                  const iconPath = skillData?.icon ? getAssetPath(`assets/skill icons/${skillData.icon}`) : '';
                  const abilityName = skillData?.name || abilityId;
                  const fallbackNum = i + 1;
                  return `
                    <div style="
                      position: relative;
                      width: 32px;
                      height: 32px;
                      background: rgba(40,40,50,0.8);
                      border: 1px solid ${roleStyle.border};
                      border-radius: 4px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      cursor: pointer;
                    " title="${abilityName}" onclick="event.stopPropagation(); ui._showFighterPreview('${loadoutId}')">
                      <img src="${iconPath}" style="width: 28px; height: 28px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                      <span style="color:#666;font-size:12px;display:none;">${fallbackNum}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  };

  // Unlock slot action
  ui._unlockSlot = (slotId) => {
    if (window.SLOTS && window.SLOTS.unlockSlot) {
      const result = window.SLOTS.unlockSlot(slotId);
      if (result) {
        ui.renderSlotTab();
        ui.toast('✅ Slot unlocked!');
      }
    }
  };

  // Upgrade slot action
  ui._upgradeSlot = (slotId) => {
    if (window.SLOTS && window.SLOTS.upgradeSlot) {
      const result = window.SLOTS.upgradeSlot(slotId);
      if (result) {
        ui.renderSlotTab();
        ui.toast('✅ Slot upgraded!');
      }
    }
  };

  // Open loadout picker modal (FIGHTER CARD UI)
  ui._openLoadoutPicker = (slotId) => {
    console.log('[LOADOUT PICKER] Opening for slot:', slotId);
    
    // Find the slot to get its role
    const slot = (state.slotSystem?.guards || []).find(s => s.id === slotId) ||
                 (state.slotSystem?.allies || []).find(s => s.id === slotId);
    
    console.log('[LOADOUT PICKER] Found slot:', slot);
    
    if (!slot) {
      console.error('[LOADOUT PICKER] Slot not found:', slotId);
      ui.toast('❌ Slot not found');
      return;
    }
    
    // Get fighter cards from inventory that match this slot's role
    const allCards = state.fighterCardInventory?.cards || [];
    console.log('[FIGHTER CARDS] Total in inventory:', allCards.length);
    
    const compatibleCards = allCards.filter(card => {
      const cardRole = card.role?.toLowerCase() || 'flex';
      const slotRole = slot.role.toLowerCase();
      
      // Flex slots accept any role
      if (slotRole === 'flex') return true;
      
      // Support = healer
      if (slotRole === 'support' && cardRole === 'healer') return true;
      if (slotRole === 'healer' && cardRole === 'support') return true;
      
      // Elite accepts tank/dps
      if (slotRole === 'elite' && (cardRole === 'tank' || cardRole === 'dps')) return true;
      
      // Exact match
      return cardRole === slotRole;
    });
    
    console.log('[FIGHTER CARDS] Compatible cards:', compatibleCards.length);
    
    if (compatibleCards.length === 0) {
      console.warn('[FIGHTER CARDS] No compatible cards in inventory for role:', slot.role);
      ui.toast('ℹ️ No fighter cards available for this slot role. Collect more cards!');
      return;
    }
    
    // Use the existing loadout picker but with cards from inventory
    ui._openFighterCardPicker(slotId, compatibleCards);
  };

  // Close loadout picker
  // Close loadout picker
  ui._closeLoadoutPicker = (event) => {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('loadoutPickerModal');
    if (modal) {
      modal.remove();
      // Remove ESC key listener
      if (ui._loadoutPickerEscHandler) {
        window.removeEventListener('keydown', ui._loadoutPickerEscHandler);
        ui._loadoutPickerEscHandler = null;
      }
    }
  };

  // Open fighter card picker (from inventory)
  ui._openFighterCardPicker = (slotId, cards) => {
    console.log('[CARD PICKER] Opening with', cards.length, 'cards for slot:', slotId);
    
    if (!cards || cards.length === 0) {
      ui.toast('ℹ️ No fighter cards available');
      return;
    }
    
    const slot = (state.slotSystem?.guards || []).find(s => s.id === slotId) ||
                 (state.slotSystem?.allies || []).find(s => s.id === slotId);
    
    if (!slot) {
      ui.toast('❌ Slot not found');
      return;
    }
    
    // Create modal for cards grid
    const modalDiv = document.createElement('div');
    modalDiv.id = 'fighterCardPickerModal';
    modalDiv.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.95); z-index: 9998;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(5px); cursor: pointer;
    `;
    
    const containerDiv = document.createElement('div');
    containerDiv.style.cssText = `
      background: rgba(20,20,30,0.95); border: 3px solid #d4af37;
      border-radius: 12px; padding: 24px; max-width: 1200px;
      max-height: 85vh; overflow-y: auto; cursor: default;
      box-shadow: 0 0 30px rgba(212,175,55,0.4);
    `;
    
    // Header
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #d4af37;
    `;
    
    const titleDiv = document.createElement('div');
    titleDiv.innerHTML = `
      <div style="font-size: 18px; font-weight: bold; color: #d4af37;">🎴 Select Fighter Card</div>
      <div class="small" style="color: #999; margin-top: 4px;">Slot: <span style="color: #6cf;">${slot.id}</span> • Role: <span style="color: #d4af37;">${slot.role.toUpperCase()}</span></div>
    `;
    headerDiv.appendChild(titleDiv);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
      padding: 8px 16px; background: rgba(200,50,50,0.8); color: #fff;
      border: 1px solid #ff6464; border-radius: 4px; cursor: pointer;
      font-weight: bold;
    `;
    closeBtn.onclick = () => ui._closeFighterCardPicker();
    headerDiv.appendChild(closeBtn);
    
    // Cards grid
    const gridDiv = document.createElement('div');
    gridDiv.style.cssText = `
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    `;
    
    // Add cards to grid
    cards.forEach(card => {
      const cardEl = document.createElement('div');
      const rarityColors = {common: '#888', uncommon: '#0a0', rare: '#0aa', epic: '#a0a', legendary: '#fa0'};
      const rarityColor = rarityColors[card.rarity] || '#888';
      const rarityBg = {common: 0.1, uncommon: 0.15, rare: 0.2, epic: 0.25, legendary: 0.3};
      
      cardEl.style.cssText = `
        background: rgba(212,175,55,${rarityBg[card.rarity]});
        border: 2px solid ${rarityColor};
        border-radius: 6px;
        padding: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      `;
      
      cardEl.onmouseover = () => {
        cardEl.style.transform = 'scale(1.05)';
        cardEl.style.boxShadow = `0 0 15px ${rarityColor}`;
      };
      cardEl.onmouseout = () => {
        cardEl.style.transform = 'scale(1)';
        cardEl.style.boxShadow = 'none';
      };
      
      cardEl.onclick = () => {
        // Assign this card's loadout to the slot
        if (window.SLOTS && window.SLOTS.assignLoadout && card.loadoutId) {
          const result = window.SLOTS.assignLoadout(slotId, card.loadoutId);
          if (result) {
            ui._closeFighterCardPicker();
            ui.renderSlotTab();
            ui.toast(`✅ Card assigned: ${card.name}`);
          }
        }
      };
      
      cardEl.innerHTML = `
        <div style="font-size: 10px; color: ${rarityColor}; font-weight: bold; margin-bottom: 4px;">${card.rarity.toUpperCase()}</div>
        <div style="font-size: 9px; color: #6cf; margin-bottom: 4px;">L${card.level}</div>
        <div style="font-size: 11px; font-weight: bold; color: #d4af37; margin-bottom: 6px; word-break: break-word;">${card.name}</div>
        <div style="font-size: 8px; color: #ccc;">Role: ${card.role}</div>
        <div style="font-size: 9px; color: #ffd700; margin-top: 4px;">${'★'.repeat(card.rating)}${'☆'.repeat(5 - card.rating)}</div>
      `;
      
      gridDiv.appendChild(cardEl);
    });
    
    containerDiv.appendChild(headerDiv);
    containerDiv.appendChild(gridDiv);
    
    modalDiv.appendChild(containerDiv);
    modalDiv.onclick = (e) => {
      if (e.target === modalDiv) ui._closeFighterCardPicker();
    };
    
    document.body.appendChild(modalDiv);
    
    // ESC key to close
    ui._cardPickerEscHandler = (e) => {
      if (e.key === 'Escape') ui._closeFighterCardPicker();
    };
    window.addEventListener('keydown', ui._cardPickerEscHandler);
  };
  
  ui._closeFighterCardPicker = () => {
    const modal = document.getElementById('fighterCardPickerModal');
    if (modal) {
      modal.remove();
      if (ui._cardPickerEscHandler) {
        window.removeEventListener('keydown', ui._cardPickerEscHandler);
        ui._cardPickerEscHandler = null;
      }
    }
  };

  // Assign loadout to slot
  ui._assignLoadout = (slotId, loadoutId) => {
    if (window.SLOTS && window.SLOTS.assignLoadout) {
      const result = window.SLOTS.assignLoadout(slotId, loadoutId);
      if (result) {
        ui._closeLoadoutPicker();
        ui.renderSlotTab();
        ui.toast('✅ Loadout assigned!');
      }
    }
  };

  // Show comprehensive fighter preview (full screen - redesigned layout)
  ui._showFighterPreview = (loadoutId) => {
    const LOADOUTS = window.LOADOUTS;
    const ABILITIES = window.ABILITIES || {};
    
    if (!LOADOUTS) {
      console.error('[PREVIEW] LOADOUTS not available');
      return;
    }

    const loadout = LOADOUTS.getLoadout(loadoutId);
    if (!loadout) {
      console.error('[PREVIEW] Loadout not found:', loadoutId);
      return;
    }

    // Get rarity info
    const rarity = loadout.rarity || 'common';
    const rarityColors = {
      common: '#aaa',
      uncommon: '#1eff00',
      rare: '#0070dd',
      epic: '#a335ee',
      legendary: '#ff8000'
    };
    const rarityColor = rarityColors[rarity] || rarityColors.common;
    const rarityName = rarity.charAt(0).toUpperCase() + rarity.slice(1);

    // Rarity multiplier for stats
    const rarityMultipliers = {
      common: 1,
      uncommon: 1.2,
      rare: 1.5,
      epic: 2,
      legendary: 3
    };
    const mult = rarityMultipliers[rarity] || 1;

    // Calculate ALL combat stats from equipment
    let totalAtk = 0, totalDef = 0, totalMaxHp = 0, totalMaxMana = 0;
    let totalCritChance = 0, totalSpeed = 0, totalLifeSteal = 0, totalCDR = 0;
    let totalHpRegen = 0, totalManaRegen = 0, totalStamRegen = 0, totalMaxStam = 0;
    let totalBlock = 0, totalCritMult = 0;
    
    // Weapon stats
    if (loadout.weapon?.buffs) {
      const buffs = loadout.weapon.buffs;
      totalAtk += Math.floor((buffs.atk || 0) * mult);
      totalCritChance += (buffs.critChance || 0);
      totalSpeed += (buffs.spd || buffs.speed || 0);
      totalManaRegen += (buffs.manaRegen || 0);
      totalHpRegen += (buffs.hpRegen || 0);
    }

    // Armor stats
    if (loadout.armor) {
      Object.values(loadout.armor).forEach(piece => {
        if (piece?.buffs) {
          const buffs = piece.buffs;
          totalDef += Math.floor((buffs.def || 0) * mult);
          totalMaxHp += Math.floor((buffs.maxHp || 0) * mult);
          totalMaxMana += Math.floor((buffs.maxMana || 0) * mult);
          totalMaxStam += Math.floor((buffs.maxStam || buffs.maxStamina || 0) * mult);
          totalCritChance += (buffs.critChance || 0);
          totalSpeed += (buffs.spd || buffs.speed || 0);
          totalHpRegen += (buffs.hpRegen || 0);
          totalManaRegen += (buffs.manaRegen || 0);
          totalStamRegen += (buffs.stamRegen || buffs.staminaRegen || 0);
          totalLifeSteal += (buffs.lifeSteal || buffs.lifesteal || 0);
          totalCDR += (buffs.cdr || buffs.cooldownReduction || 0);
          totalBlock += (buffs.block || 0);
          totalCritMult += (buffs.critMult || buffs.critMultiplier || 0);
        }
      });
    }

    // Build left column items (weapon + armor pieces 1-5)
    const buildLeftItems = () => {
      let html = '';
      
      // Weapon first
      if (loadout.weapon) {
        const weaponType = loadout.weapon.weaponType || 'Unknown';
        const weaponImagePath = `assets/items/${rarity} ${weaponType}.png`;
        const attackBonus = Math.floor((loadout.weapon.buffs?.atk || 0) * mult);
        
        html += `
          <div style="
            width: 80px;
            height: 80px;
            background: rgba(0,0,0,0.9);
            border: 3px solid ${rarityColor};
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
            box-shadow: 0 4px 12px rgba(0,0,0,0.8);
          " title="${weaponType}: +${attackBonus} ATK">
            <img src="${weaponImagePath}" style="width: 90%; height: 90%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=font-size:40px;>⚔</span>';" />
            <div style="position: absolute; bottom: 2px; right: 4px; background: rgba(0,0,0,0.8); color: #fff; font-size: 10px; font-weight: bold; padding: 2px 4px; border-radius: 3px;">+${attackBonus}</div>
          </div>
        `;
      }

      // Armor pieces (first 5: helm, chest, shoulders, hands, belt)
      if (loadout.armor) {
        const leftSlots = ['helm', 'chest', 'shoulders', 'hands', 'belt'];
        leftSlots.forEach(slotName => {
          const piece = loadout.armor[slotName];
          if (!piece) return;
          
          const slotDisplayName = slotName === 'neck' ? 'necklace' : slotName;
          const imagePath = `assets/items/${rarity} ${slotDisplayName}.png`;
          
          html += `
            <div style="
              width: 80px;
              height: 80px;
              background: rgba(0,0,0,0.9);
              border: 3px solid ${rarityColor}80;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.8);
            " title="${slotName}">
              <img src="${imagePath}" style="width: 90%; height: 90%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=font-size:24px;>${slotName.charAt(0).toUpperCase()}</span>';" />
            </div>
          `;
        });
      }

      return html;
    };

    // Build right column items (armor pieces 6-10)
    const buildRightItems = () => {
      let html = '';
      
      if (loadout.armor) {
        const rightSlots = ['legs', 'feet', 'neck', 'accessory1', 'accessory2'];
        rightSlots.forEach(slotName => {
          const piece = loadout.armor[slotName];
          if (!piece) return;
          
          let slotDisplayName = slotName;
          if (slotName === 'accessory1' || slotName === 'accessory2') slotDisplayName = 'bracelet';
          if (slotName === 'neck') slotDisplayName = 'necklace';
          const imagePath = `assets/items/${rarity} ${slotDisplayName}.png`;
          
          html += `
            <div style="
              width: 80px;
              height: 80px;
              background: rgba(0,0,0,0.9);
              border: 3px solid ${rarityColor}80;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.8);
            " title="${slotName}">
              <img src="${imagePath}" style="width: 90%; height: 90%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=font-size:24px;>${slotName.charAt(0).toUpperCase()}</span>';" />
            </div>
          `;
        });
      }

      return html;
    };

    // Build abilities row for bottom border
    const buildBottomAbilities = () => {
      let html = '';
      
      if (loadout.abilities && loadout.abilities.length > 0) {
        const uniqueAbilities = [...new Set(loadout.abilities)];
        uniqueAbilities.slice(0, 5).forEach((abilityId, index) => {
          const ability = ABILITIES[abilityId];
          if (ability) {
            const iconPath = ability.icon ? `assets/skill icons/${ability.icon}` : '';
            const cooldown = ability.cd || 0;
            const manaCost = ability.mana || 0;
            
            html += `
              <div style="
                width: 80px;
                height: 80px;
                background: rgba(0,0,0,0.9);
                border: 3px solid ${rarityColor};
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
                box-shadow: 0 4px 12px rgba(0,0,0,0.8);
              " title="${ability.name}&#10;Mana: ${manaCost} | CD: ${cooldown}s">
                <img src="${iconPath}" style="width: 90%; height: 90%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=font-size:24px;color:#666;>${index + 1}</span>';" />
                <div style="position: absolute; bottom: 2px; left: 4px; background: rgba(0,0,0,0.8); color: #4af; font-size: 9px; font-weight: bold; padding: 2px 4px; border-radius: 3px;">${manaCost}💧</div>
                <div style="position: absolute; bottom: 2px; right: 4px; background: rgba(0,0,0,0.8); color: #fa8; font-size: 9px; font-weight: bold; padding: 2px 4px; border-radius: 3px;">${cooldown}s</div>
              </div>
            `;
          }
        });
      }
      
      return html;
    };

    const critMultDisplay = totalCritMult > 0 ? totalCritMult.toFixed(2) : '1.70';
    const blockDisplay = totalBlock > 0 ? totalBlock : 50;

    // Build creative fighter lore/strategy box
    const buildFighterLore = () => {
      const roleStrategies = {
        tank: {
          title: '🛡️ FRONTLINE DEFENDER',
          style: 'Masters of protection and battlefield control',
          strengths: ['High survivability', 'Crowd control', 'Threat generation'],
          playstyle: 'Engage first, lock down enemies, protect allies from harm'
        },
        dps: {
          title: '⚔️ DAMAGE DEALER',
          style: 'Elite warriors focused on devastating offense',
          strengths: ['High damage output', 'Burst windows', 'Target elimination'],
          playstyle: 'Focus priority targets, maximize burst damage, maintain pressure'
        },
        healer: {
          title: '💚 TEAM SUSTAINER',
          style: 'Vital support keeping allies alive',
          strengths: ['Emergency healing', 'Shielding', 'Debuff cleansing'],
          playstyle: 'Monitor health bars, shield before damage, cleanse debuffs quickly'
        }
      };
      
      const roleInfo = roleStrategies[loadout.role] || roleStrategies.dps;
      const characterDesc = loadout.description || `A skilled ${loadout.class} specialized in ${loadout.role} combat.`;
      
      // Count ability types for combo info
      const uniqueAbilities = [...new Set(loadout.abilities)];
      const slotCounts = {};
      loadout.abilities.forEach(abilityId => {
        slotCounts[abilityId] = (slotCounts[abilityId] || 0) + 1;
      });
      
      const multiSlotted = Object.entries(slotCounts).filter(([id, count]) => count > 1);
      
      return `
        <div style="
          position: absolute;
          left: -460px;
          top: 50%;
          transform: translateY(-50%);
          width: 380px;
          background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(20,20,20,0.95));
          border: 3px solid ${rarityColor};
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 0 40px ${rarityColor}60;
          z-index: 5;
        ">
          <div style="
            font-size: 18px;
            font-weight: bold;
            color: ${rarityColor};
            margin-bottom: 12px;
            text-align: center;
            border-bottom: 2px solid ${rarityColor};
            padding-bottom: 8px;
          ">
            ${roleInfo.title}
          </div>
          
          <div style="color: #ccc; font-size: 13px; line-height: 1.6; margin-bottom: 16px; font-style: italic; text-align: center;">
            "${characterDesc}"
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="color: #d4af37; font-size: 12px; font-weight: bold; margin-bottom: 8px;">✨ FIGHTING STYLE</div>
            <div style="color: #aaa; font-size: 11px; line-height: 1.5;">${roleInfo.style}</div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="color: #d4af37; font-size: 12px; font-weight: bold; margin-bottom: 8px;">💪 STRENGTHS</div>
            ${roleInfo.strengths.map(s => `<div style="color: #8f8; font-size: 11px; margin-bottom: 4px;">• ${s}</div>`).join('')}
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="color: #d4af37; font-size: 12px; font-weight: bold; margin-bottom: 8px;">🎯 COMBAT TACTICS</div>
            <div style="color: #8cf; font-size: 11px; line-height: 1.5;">${roleInfo.playstyle}</div>
          </div>
          
          ${multiSlotted.length > 0 ? `
            <div style="
              background: rgba(212,175,55,0.1);
              border: 1px solid ${rarityColor}40;
              border-radius: 6px;
              padding: 10px;
              margin-top: 12px;
            ">
              <div style="color: #d4af37; font-size: 11px; font-weight: bold; margin-bottom: 6px;">⚡ COMBO SYSTEM</div>
              <div style="color: #fa8; font-size: 10px; line-height: 1.4;">
                ${multiSlotted.length} ${multiSlotted.length === 1 ? 'ability' : 'abilities'} multi-slotted for reduced cooldown!
              </div>
            </div>
          ` : ''}
          
          <div style="
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid ${rarityColor}40;
            color: #888;
            font-size: 10px;
            text-align: center;
          ">
            ${uniqueAbilities.length} unique abilities • ${loadout.abilities.length} total slots
          </div>
        </div>
      `;
    };

    // Build modal with new layout: name at top (no overlap), centered side panels, larger stats
    const modalHtml = `
      <div id="fighterPreviewModal" class="overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        
        <!-- Close Button (Top Right) -->
        <button style="
          position: fixed;
          top: 20px;
          right: 20px;
          width: 48px;
          height: 48px;
          background: rgba(40,40,40,0.9);
          border: 2px solid ${rarityColor};
          border-radius: 50%;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " onclick="ui._closeFighterPreview()" onmouseover="this.style.background='rgba(60,60,60,0.9)'; this.style.transform='scale(1.1)';" onmouseout="this.style.background='rgba(40,40,40,0.9)'; this.style.transform='scale(1)';" title="Close (ESC)">
          ✕
        </button>
        
        <!-- Main Content Container -->
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        ">
          
          <!-- Dramatic Fighter Name (At Top Border - No Overlap) -->
          <div style="
            font-size: 48px;
            font-weight: 900;
            color: ${rarityColor};
            text-shadow: 0 0 20px ${rarityColor}, 0 0 40px ${rarityColor}, 0 4px 8px rgba(0,0,0,0.8);
            text-align: center;
            letter-spacing: 4px;
            text-transform: uppercase;
            border: 4px solid ${rarityColor};
            padding: 16px 48px;
            background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(20,20,20,0.95));
            border-radius: 16px;
            box-shadow: 0 0 40px ${rarityColor}80, inset 0 0 20px ${rarityColor}20;
            margin-bottom: 0;
            white-space: nowrap;
          ">
            ${loadout.name}
          </div>
          
          <!-- Main Fighter Display Area with Side Panels -->
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          
            <!-- Fighter Lore Box (Left Side - Centered) -->
            ${buildFighterLore()}
            
            <!-- Left Items Column (overlapping left border) -->
            <div style="
              position: absolute;
              left: -40px;
              top: 50%;
              transform: translateY(-50%);
              display: flex;
              flex-direction: column;
              gap: 8px;
              z-index: 10;
            ">
              ${buildLeftItems()}
            </div>
            
            <!-- Fighter Image Center -->
            <div style="
              width: 600px;
              height: 600px;
              border: 6px solid ${rarityColor};
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 0 60px ${rarityColor}60, inset 0 0 40px rgba(0,0,0,0.5);
              background: linear-gradient(135deg, #1a1a1a, #0a0a0a);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            ">
              <img 
                src="${getAssetPath('assets/fighter player cards/' + (loadout.fighterImage || 'default.png'))}" 
                style="
                  max-width: 100%;
                  max-height: 100%;
                  object-fit: contain;
                "
                onerror="this.style.display='none'; this.parentElement.innerHTML+='<div style=color:#666;font-size:72px;>👤</div>';"
              />
            </div>
            
            <!-- Right Items Column (overlapping right border) -->
            <div style="
              position: absolute;
              right: -40px;
              top: 50%;
              transform: translateY(-50%);
              display: flex;
              flex-direction: column;
              gap: 8px;
              z-index: 10;
            ">
              ${buildRightItems()}
            </div>
            
            <!-- Bottom Abilities Row (overlapping bottom border) -->
            <div style="
              position: absolute;
              bottom: -40px;
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              gap: 8px;
              z-index: 10;
            ">
              ${buildBottomAbilities()}
            </div>
          </div>
          
          <!-- All Stats in White Text (Right Side - Centered, No Scrollbar) -->
          <div style="
            position: absolute;
            right: -460px;
            top: 50%;
            transform: translateY(-50%);
            width: 380px;
            background: rgba(0,0,0,0.95);
            border: 3px solid ${rarityColor};
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 0 40px ${rarityColor}60;
            display: flex;
            flex-direction: column;
            z-index: 5;
          ">
            <div style="
              color: #fff;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 16px;
              text-align: center;
              border-bottom: 2px solid ${rarityColor};
              padding-bottom: 8px;
            ">
              ⚔️ STATISTICS ⚔️
            </div>
            
            <div style="color: #fff; font-size: 14px;">
              <div style="margin-bottom: 18px;">
                <div style="color: ${rarityColor}; font-size: 15px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid ${rarityColor}60; padding-bottom: 6px;">⚔️ OFFENSE</div>
                <div style="margin-bottom: 8px;"><b>⚔ Attack:</b> +${totalAtk}</div>
                <div style="margin-bottom: 8px;"><b>🎯 Crit Chance:</b> ${totalCritChance}%</div>
                <div style="margin-bottom: 8px;"><b>💥 Crit Mult:</b> ${critMultDisplay}</div>
                <div style="margin-bottom: 8px;"><b>🩸 Lifesteal:</b> ${totalLifeSteal}%</div>
              </div>
              
              <div style="margin-bottom: 18px;">
                <div style="color: ${rarityColor}; font-size: 15px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid ${rarityColor}60; padding-bottom: 6px;">🛡️ DEFENSE</div>
                <div style="margin-bottom: 8px;"><b>🛡 Defense:</b> +${totalDef}</div>
                <div style="margin-bottom: 8px;"><b>❤ Max HP:</b> +${totalMaxHp}</div>
                <div style="margin-bottom: 8px;"><b>💓 HP Regen:</b> ${totalHpRegen.toFixed(1)}/s</div>
                <div style="margin-bottom: 8px;"><b>🛡 Block:</b> ${blockDisplay}%</div>
              </div>
              
              <div style="margin-bottom: 18px;">
                <div style="color: ${rarityColor}; font-size: 15px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid ${rarityColor}60; padding-bottom: 6px;">💧 RESOURCES</div>
                <div style="margin-bottom: 8px;"><b>💧 Max Mana:</b> +${totalMaxMana}</div>
                <div style="margin-bottom: 8px;"><b>💦 Mana Regen:</b> ${totalManaRegen.toFixed(1)}/s</div>
                <div style="margin-bottom: 8px;"><b>🏃 Max Stamina:</b> +${totalMaxStam}</div>
                <div style="margin-bottom: 8px;"><b>⚡ Stam Regen:</b> ${totalStamRegen.toFixed(1)}/s</div>
              </div>
              
              <div style="margin-bottom: 18px;">
                <div style="color: ${rarityColor}; font-size: 15px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid ${rarityColor}60; padding-bottom: 6px;">⚡ UTILITY</div>
                <div style="margin-bottom: 8px;"><b>⚡ Speed:</b> +${totalSpeed}</div>
                <div style="margin-bottom: 8px;"><b>⏱ CDR:</b> ${totalCDR}%</div>
              </div>
              
              <div style="
                background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(0,0,0,0.4));
                border: 2px solid ${rarityColor};
                border-radius: 8px;
                padding: 12px;
                text-align: center;
                margin-top: auto;
              ">
                <div style="color: ${rarityColor}; font-size: 16px; font-weight: bold; margin-bottom: 4px;">⭐ ${rarityName.toUpperCase()}</div>
                <div style="color: #fff; font-size: 12px;">Stats Multiplier: ×${mult}</div>
                <div style="color: #888; font-size: 11px; margin-top: 4px;">${loadout.class}</div>
              </div>
            </div>
          </div>
          
          <!-- Role & Class Badge -->
          <div style="
            position: absolute;
            top: -50px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 16px;
            font-weight: bold;
            color: #FFD700;
            background: linear-gradient(135deg, ${rarityColor}, ${rarityColor}cc);
            padding: 8px 24px;
            border-radius: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            letter-spacing: 2px;
            z-index: 15;
          ">
            ${loadout.role.toUpperCase()} • ${loadout.class.toUpperCase()}
          </div>
          </div>
        </div>
      </div>
    `;

    // Inject modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add ESC listener
    ui._fighterPreviewEscHandler = (e) => {
      if (e.key === 'Escape') {
        ui._closeFighterPreview();
      }
    };
    window.addEventListener('keydown', ui._fighterPreviewEscHandler);

    // Add click-outside-to-close listener
    ui._fighterPreviewClickHandler = (e) => {
      const modal = document.getElementById('fighterPreviewModal');
      if (modal && e.target === modal) {
        ui._closeFighterPreview();
      }
    };
    const modal = document.getElementById('fighterPreviewModal');
    if (modal) {
      modal.addEventListener('click', ui._fighterPreviewClickHandler);
    }
  };

  // Close fighter preview
  ui._closeFighterPreview = () => {
    const modal = document.getElementById('fighterPreviewModal');
    if (modal) {
      modal.remove();
      if (ui._fighterPreviewEscHandler) {
        window.removeEventListener('keydown', ui._fighterPreviewEscHandler);
        ui._fighterPreviewEscHandler = null;
      }
    }
  };
  
  // Attach hover tooltips to slot cards
  ui._attachSlotTooltips = () => {
    const slotCards = document.querySelectorAll('.slot-card');
    
    slotCards.forEach(card => {
      const slotId = card.dataset.slotId;
      if (!slotId) return;
      
      // Find the slot
      const slot = (state.slotSystem?.guards || []).find(s => s.id === slotId) ||
                   (state.slotSystem?.allies || []).find(s => s.id === slotId);
      
      if (!slot || !slot.loadoutId) return;
      
      // Get loadout data
      const loadout = window.LOADOUTS?.getLoadout(slot.loadoutId);
      if (!loadout) return;
      
      // Create tooltip on mouseenter
      card.addEventListener('mouseenter', (e) => {
        const tooltip = ui._createLoadoutTooltip(loadout, slot);
        document.body.appendChild(tooltip);
        card._tooltip = tooltip;
      });
      
      // Update tooltip position on mousemove
      card.addEventListener('mousemove', (e) => {
        if (card._tooltip) {
          card._tooltip.style.left = (e.clientX + 15) + 'px';
          card._tooltip.style.top = (e.clientY + 15) + 'px';
        }
      });
      
      // Remove tooltip on mouseleave
      card.addEventListener('mouseleave', () => {
        if (card._tooltip) {
          card._tooltip.remove();
          card._tooltip = null;
        }
      });
    });
  };
  
  // Create detailed loadout tooltip
  ui._createLoadoutTooltip = (loadout, slot) => {
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: fixed;
      background: linear-gradient(135deg, rgba(20,20,20,0.98) 0%, rgba(10,10,10,0.98) 100%);
      border: 2px solid #d4af37;
      border-radius: 8px;
      padding: 12px;
      min-width: 280px;
      max-width: 350px;
      z-index: 100000;
      pointer-events: none;
      box-shadow: 0 8px 32px rgba(0,0,0,0.8);
    `;
    
    const roleColor = slot.role === 'tank' ? '#ff8c00' : 
                      slot.role === 'dps' ? '#ff4444' :
                      slot.role === 'healer' ? '#44ff44' : '#aa44ff';
    
    // Build abilities list
    const abilities = [];
    if (loadout.ability1) abilities.push(loadout.ability1);
    if (loadout.ability2) abilities.push(loadout.ability2);
    if (loadout.ability3) abilities.push(loadout.ability3);
    if (loadout.ability4) abilities.push(loadout.ability4);
    
    const abilityHTML = abilities.map(a => `
      <div style="margin-bottom: 6px; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 3px;">
        <div style="font-weight: bold; color: #6cf; font-size: 11px;">${a.name}</div>
        <div style="color: #999; font-size: 10px;">${a.description || 'No description'}</div>
        ${a.cooldown ? `<div style="color: #888; font-size: 9px;">Cooldown: ${a.cooldown}s</div>` : ''}
      </div>
    `).join('');
    
    // Build combo plan
    const comboHTML = loadout.combo ? `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-weight: bold; color: #ff8c00; font-size: 11px; margin-bottom: 4px;">Combo Plan:</div>
        <div style="color: #ccc; font-size: 10px; line-height: 1.4;">${loadout.combo}</div>
      </div>
    ` : '';
    
    // Build stats
    const stats = loadout.stats || {};
    const statsHTML = stats.maxHP || stats.baseDamage || stats.defense ? `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="font-weight: bold; color: #6cf; font-size: 11px; margin-bottom: 4px;">Base Stats:</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 10px;">
          ${stats.maxHP ? `<div style="color: #44ff44;">HP: ${stats.maxHP}</div>` : ''}
          ${stats.baseDamage ? `<div style="color: #ff4444;">DMG: ${stats.baseDamage}</div>` : ''}
          ${stats.defense ? `<div style="color: #ff8c00;">DEF: ${stats.defense}</div>` : ''}
          ${stats.critChance ? `<div style="color: #ffff44;">CRIT: ${(stats.critChance * 100).toFixed(0)}%</div>` : ''}
        </div>
      </div>
    ` : '';
    
    tooltip.innerHTML = `
      <!-- Header -->
      <div style="margin-bottom: 8px;">
        <div style="font-size: 14px; font-weight: bold; color: #d4af37;">${loadout.name}</div>
        <div style="font-size: 10px; color: ${roleColor};">${slot.role.toUpperCase()} • Level ${slot.level || 0}</div>
      </div>
      
      <!-- Weapon -->
      <div style="margin-bottom: 8px; padding: 4px; background: rgba(212,175,55,0.1); border-radius: 3px;">
        <div style="font-size: 10px; color: #d4af37;">⚔ ${loadout.weapon?.name || loadout.weapon || 'Unarmed'}</div>
      </div>
      
      <!-- Abilities -->
      <div style="margin-bottom: 4px;">
        <div style="font-weight: bold; color: #fff; font-size: 11px; margin-bottom: 4px;">Abilities:</div>
        ${abilityHTML}
      </div>
      
      ${comboHTML}
      ${statsHTML}
    `;
    
    return tooltip;
  };
  
  // Select group member for detailed management
  ui._selectGroupMember = (memberId)=>{
    if(!ui.groupMemberDetails) {
      console.log('[GROUP] groupMemberDetails element not found');
      return;
    }
    console.log(`[GROUP] Selecting member ${memberId}`);
    state.group.selectedMemberId = memberId;
    const friendly = state.friendlies.find(f => f.id === memberId);
    const settings = state.group.settings[memberId];
    console.log('[GROUP] Found friendly:', friendly?.name, 'Settings:', settings?.name);
    if(!friendly || !settings){
      ui.groupMemberDetails.innerHTML = '<div class="small" style="color:#888;">Member not found.</div>';
      console.log('[GROUP] Member or settings not found, showing error');
      return;
    }
    
    const roleOptions = ['dps', 'tank', 'healer'];
    const behaviorOptions = ['aggressive', 'neutral'];
    
    let html = `
      <div style="margin-bottom:12px;">
        <div class="small" style="font-weight:bold; margin-bottom:6px;">Member: ${settings.name}</div>
        <input type="text" id="groupMemberNameInput" value="${settings.name}" style="width:100%; padding:6px; margin-bottom:8px; font-size:12px;" placeholder="Member name"/>
      </div>
      
      <div style="margin-bottom:12px;">
        <div class="small" style="font-weight:bold; margin-bottom:6px;">Class</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${['warrior','mage','knight','warden'].map(c=>{
            const active = (friendly.variant||'warrior')===c;
            const cls = active ? '' : 'secondary';
            const bg = active ? 'background:rgba(122,162,255,0.3);' : '';
            const label = c.charAt(0).toUpperCase()+c.slice(1);
            return `<button class="${cls}" style="flex:1; padding:6px; font-size:11px; ${bg}" onclick="ui._setGroupMemberClass('${memberId}','${c}')">${label}</button>`;
          }).join('')}
        </div>
        <div class="small" style="margin-top:6px; color:#999;">Changing class updates stats; gear/abilities are kept.</div>
      </div>
      
      <div style="margin-bottom:12px;">
        <div class="small" style="font-weight:bold; margin-bottom:6px;">Role</div>
        <div style="display:flex; gap:6px;">
          ${roleOptions.map(r => {
            const active = r === settings.role;
            const cls = active ? '' : 'secondary';
            const bg = active ? 'background:rgba(122,162,255,0.3);' : '';
            return `<button class="${cls}" style="flex:1; padding:6px; font-size:11px; ${bg}" onclick="ui._setGroupMemberRole('${memberId}', '${r}');">${r.toUpperCase()}</button>`;
          }).join('')}
        </div>
      </div>
      
      <div style="margin-bottom:12px;">
        <div class="small" style="font-weight:bold; margin-bottom:6px;">Behavior</div>
        <div style="display:flex; gap:6px;">
          ${behaviorOptions.map(b => {
            const active = b === settings.behavior;
            const cls = active ? '' : 'secondary';
            const bg = active ? 'background:rgba(122,162,255,0.3);' : '';
            return `<button class="${cls}" style="flex:1; padding:6px; font-size:11px; ${bg}" onclick="ui._setGroupMemberBehavior('${memberId}', '${b}');">${b.toUpperCase()}</button>`;
          }).join('')}
        </div>
        <div class="small" style="margin-top:8px; color:#999; line-height:1.4">
          <div><b>Group Allies:</b> <span style="color:#aaf">Aggressive</span> will break formation to engage enemies within ~180 units; <span style="color:#aaf">Neutral</span> stays closer and only engages nearby threats (~90 units).</div>
          <div><b>Non-Group Allies:</b> <span style="color:#aaf">Aggressive</span> seeks combat more often and detours to fight; <span style="color:#aaf">Neutral</span> prioritizes capturing enemy flags and only fights if blocking the path.</div>
        </div>
      </div>
      
      <div style="margin-bottom:12px;">
        <div class="small" style="font-weight:bold; margin-bottom:6px;">Load Saved Abilities</div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          ${['warrior','mage','knight','warden'].map(heroClass => {
            const loadouts = state.abilityLoadouts[heroClass] || [];
            const saved = loadouts.filter(lo => lo && lo.slots && lo.name).map((lo, idx) => `<div style="font-size:10px; padding:4px 6px; background:rgba(122,162,255,0.2); border:1px solid rgba(122,162,255,0.3); border-radius:3px; cursor:pointer; transition:all 0.15s; font-weight:500;" onmouseover="this.style.background='rgba(122,162,255,0.35)'; this.style.borderColor='rgba(122,162,255,0.5)';" onmouseout="this.style.background='rgba(122,162,255,0.2)'; this.style.borderColor='rgba(122,162,255,0.3)';" onmousedown="this.style.transform='scale(0.96)';" onmouseup="this.style.transform='scale(1)';" onclick="ui._loadGroupMemberLoadout('${memberId}', '${heroClass}', ${idx})">${heroClass}: ${lo.name}</div>`).join('');
            return saved ? saved : '';
          }).join('')}
        </div>
        ${state.abilityLoadouts.warrior?.some(lo => lo?.slots) ? '' : '<div class="small" style="margin-top:4px; color:#999;">No saved loadouts. Create one in Inventory > Skills.</div>'}
      </div>
      
      <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
        <button style="width:100%; padding:8px;" onclick="ui._editGroupMemberEquipment('${memberId}');">Edit Equipment & Abilities</button>
      </div>
    `;
    ui.groupMemberDetails.innerHTML = html;
    console.log('[GROUP] Member settings panel rendered');
    
    // Wire up name input to save changes
    setTimeout(() => {
      const nameInput = document.getElementById('groupMemberNameInput');
      if(nameInput){
        nameInput.addEventListener('input', (e) => {
          const newName = e.target.value.trim();
          if(newName && state.group.settings[memberId]){
            state.group.settings[memberId].name = newName;
            // Update friendly unit name too
            const friendly = state.friendlies.find(f => f.id === memberId);
            if(friendly) friendly.name = newName;
            // Refresh group panel to show new name
            ui.renderGroupPanel();
            ui.renderGroupTab();
          }
        });
      }
    }, 0);
  };
  
  ui._setGroupMemberRole = (memberId, role)=>{
    const friendly = state.friendlies.find(f => f.id === memberId);
    if(!friendly) return;
    console.log(`[GROUP] Setting role for ${memberId} to ${role}`);
    // Save current name from input before refreshing
    const nameInput = document.getElementById('groupMemberNameInput');
    if(nameInput && nameInput.value.trim() && state.group.settings[memberId]){
      state.group.settings[memberId].name = nameInput.value.trim();
      friendly.name = nameInput.value.trim();
    }
    if(state.group.settings[memberId]) state.group.settings[memberId].role = role;
    ui.renderGroupTab();
    ui._selectGroupMember(memberId); // Refresh panel highlighting
  };
  
  ui._setGroupMemberBehavior = (memberId, behavior)=>{
    const friendly = state.friendlies.find(f => f.id === memberId);
    if(!friendly) return;
    console.log(`[GROUP] Setting behavior for ${memberId} to ${behavior}`);
    // Save current name from input before refreshing
    const nameInput = document.getElementById('groupMemberNameInput');
    if(nameInput && nameInput.value.trim() && state.group.settings[memberId]){
      state.group.settings[memberId].name = nameInput.value.trim();
      friendly.name = nameInput.value.trim();
    }
    friendly.behavior = behavior;
    if(state.group.settings[memberId]) state.group.settings[memberId].behavior = behavior;
    ui.renderGroupTab();
    ui._selectGroupMember(memberId); // Refresh panel highlighting
  };

  ui._loadGroupMemberLoadout = (memberId, heroClass, slotIndex)=>{
    const friendly = state.friendlies.find(f => f.id === memberId);
    if(!friendly) return;

    // Don't allow overwriting locked NPC kits (guards are locked by default).
    if(friendly.npcLoadoutLocked || friendly.guard){
      ui.toast('This unit\'s loadout is locked and cannot be overwritten.');
      return;
    }

    const loadouts = state.abilityLoadouts[heroClass];
    if(!loadouts || slotIndex < 0 || slotIndex >= loadouts.length) return;
    const loadout = loadouts[slotIndex];
    if(!loadout || !loadout.slots) return;
    
    // Change their variant to match the loadout class if needed
    if(friendly.variant !== heroClass){
      friendly.variant = heroClass;
      // Apply class stats
      if(state._npcUtils?.applyClassToUnit) state._npcUtils.applyClassToUnit(friendly, heroClass);
    }
    
    // Load the abilities
    friendly.npcAbilities = [...loadout.slots];
    friendly.npcCd = [0, 0, 0, 0, 0];

    if(state.debugLog) state.debugLog.push({
      category: 'LOADOUT',
      message: 'UI applied group member loadout',
      time: (state.campaign?.time || 0).toFixed(2),
      type: 'NPC_ABILITY_ASSIGN',
      source: 'ui._loadGroupMemberLoadout',
      unit: friendly.name || friendly.id,
      variant: friendly.variant,
      guard: !!friendly.guard,
      loadoutId: friendly.npcLoadoutId || null,
      abilities: friendly.npcAbilities.slice()
    });
    
    ui.toast(`<b>${friendly.name}</b> loaded <b>${loadout.name}</b> (${heroClass})`);
    ui._selectGroupMember(memberId); // Refresh the panel
  };

  ui._setGroupMemberClass = (memberId, cls)=>{
    const friendly = state.friendlies.find(f => f.id === memberId);
    if(!friendly) return;
    // Save typed name first
    const nameInput = document.getElementById('groupMemberNameInput');
    if(nameInput && nameInput.value.trim() && state.group.settings[memberId]){
      state.group.settings[memberId].name = nameInput.value.trim();
      friendly.name = nameInput.value.trim();
    }
    // Apply class template without wiping equipment/abilities
    friendly.variant = cls;
    try{ applyClassToUnit(friendly, cls); }catch{}
    if(state.group.settings[memberId]) state.group.settings[memberId].class = cls;
    ui.renderGroupTab();
    ui._selectGroupMember(memberId);
  };
  
  ui._editGroupMemberEquipment = (memberId)=>{
    // Open inventory overlay in "group member mode" to show full equipment/abilities UI
    state.groupMemberInventoryMode = memberId;
    ui.toggleInventory(true);
    // Switch to inventory tab
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tc => tc.style.display = 'none');
    tabButtons.forEach(tb => { tb.style.background='transparent'; tb.style.borderColor='rgba(255,255,255,0.1)'; tb.style.color='#aaa'; });
    tabContents[0].style.display = 'block';
    tabButtons[0].style.background='rgba(122,162,255,0.2)';
    tabButtons[0].style.borderColor='rgba(122,162,255,0.4)';
    tabButtons[0].style.color='#fff';
    ui.renderInventory(); // Will detect groupMemberInventoryMode
  };
  
  // Render group panel (top-left health display)
  ui.renderGroupPanel = ()=>{
    if(!ui.groupPanel || !state.group.members.length){
      if(ui.groupPanel) ui.groupPanel.style.display = 'none';
      return;
    }
    ui.groupPanel.style.display = 'block';
    const members = [];
    for(const memberId of state.group.members){
      const friendly = state.friendlies.find(f => f.id === memberId);
      const settings = state.group.settings[memberId];
      if(!friendly || !settings) continue;
      const healthPct = Math.round((friendly.hp / friendly.maxHp) * 100);
      const hp = `${Math.round(friendly.hp)}/${Math.round(friendly.maxHp)}`;
      members.push(`
        <div style="margin-bottom:6px; padding:6px; background:rgba(0,0,0,0.3); border-radius:3px; border-left:3px solid rgba(122,162,255,0.5);">
          <div class="small" style="color:#fff; font-weight:bold;">${settings.name}</div>
          <div style="width:100%; height:4px; background:rgba(0,0,0,0.5); border-radius:2px; margin:4px 0; overflow:hidden;">
            <div style="height:100%; background:rgb(76,175,80); width:${healthPct}%;"></div>
          </div>
          <div class="small" style="color:#aaa; font-size:10px;">${hp}</div>
        </div>
      `);
    }
    ui.groupPanelList.innerHTML = members.join('');
    ui.groupPanelCount.textContent = state.group.members.length.toString();
  };
  
  // Export auto-save function to ui object
  ui.autoSave = autoSave;

  return ui;
}

function nice(code){
  if(!code) return '';
  if(code.startsWith('Key')) return code.slice(3);
  if(code.startsWith('Digit')) return code.slice(5);
  if(code==='ShiftLeft') return 'Left Shift';
  if(code==='ShiftRight') return 'Right Shift';
  if(code==='Escape') return 'Esc';
  return code;
}
