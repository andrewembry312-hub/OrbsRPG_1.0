/**
 * TUTORIAL SYSTEM INTEGRATION
 * How to integrate the tutorial system into your main game
 */

import TutorialEngine from './tutorialEngine.js';
import TutorialUI from './tutorialUI.js';
import TutorialTriggers from './tutorialTriggers.js';

/**
 * Initialize tutorial system
 * Call this in your main.js after game initialization
 */
export function initializeTutorialSystem(state, game) {
  // Create UI first
  const ui = new TutorialUI(state);
  ui.initialize();

  // Create engine
  const tutorial = new TutorialEngine(state, ui);
  
  // Wire UI back to engine for close callback
  ui.setEngine(tutorial);

  // Create triggers
  const triggers = new TutorialTriggers(tutorial, state, game);
  triggers.registerAllTriggers();

  // Store in state for access
  state.tutorial = tutorial;
  state.tutorialUI = ui;
  state.tutorialTriggers = triggers;

  // Initialize tutorials
  tutorial.initialize();

  // Add to game loop for trigger checking
  state.tutorialUpdate = (now) => {
    triggers.update(now);
  };

  return { tutorial, ui, triggers };
}

/**
 * INTEGRATION INSTRUCTIONS
 * 
 * 1. In src/main.js, after creating the game state:
 * 
 *    import { initializeTutorialSystem } from './tutorial/tutorialSystem.js';
 *    
 *    const { tutorial, ui, triggers } = initializeTutorialSystem(state, game);
 * 
 * 
 * 2. In your main game loop (gameLoop() function), add:
 * 
 *    if (state.tutorialUpdate) {
 *      state.tutorialUpdate(now);
 *    }
 * 
 * 
 * 3. In your render/update functions, pause game when tutorial is active:
 * 
 *    if (state.tutorial && state.tutorial.isTutorialActive()) {
 *      return; // Skip game updates while tutorial is showing
 *    }
 * 
 * 
 * 4. Add a Help button to your UI that opens tutorials:
 * 
 *    document.getElementById('help-button').addEventListener('click', () => {
 *      state.tutorial.queueTutorial('welcome', true); // Show welcome
 *    });
 * 
 * 
 * 5. Add tutorial enable/disable toggle to settings:
 * 
 *    if (state.tutorial) {
 *      state.ui.tutorialToggle.addEventListener('change', (e) => {
 *        if (e.target.checked) {
 *          state.tutorial.enable();
 *        } else {
 *          state.tutorial.disable();
 *        }
 *      });
 *    }
 */

/**
 * IMPORTANT: Update these functions in game.js to track tutorial events
 */
export const REQUIRED_GAME_UPDATES = {
  /**
   * After player takes damage or combat starts
   */
  onEnemyEncountered: `
    state.hasEncounteredEnemy = true;
    if (state.tutorial) state.tutorial.checkTriggers();
  `,

  /**
   * After ability is cast
   */
  onAbilityCast: `
    state.hasUsedAbility = true;
    if (state.tutorial) state.tutorial.checkTriggers();
  `,

  /**
   * After loot drops
   */
  onLootDrop: `
    state.hasSeenLoot = true;
    if (state.tutorial) state.tutorial.checkTriggers();
  `,

  /**
   * After NPC is recruited
   */
  onNPCRecruited: `
    state.hasRecruitedNPC = true;
    if (state.tutorial) state.tutorial.checkTriggers();
  `,

  /**
   * After player levels up
   */
  onLevelUp: `
    state.hasLeveledUp = true;
    if (state.tutorial) state.tutorial.checkTriggers();
  `,

  /**
   * After entering outpost area
   */
  onOutpostArea: `
    state.hasReachedOutpost = true;
    if (state.tutorial) state.tutorial.checkTriggers();
  `,

  /**
   * After guard slot unlocks
   */
  onGuardUnlock: `
    state.guardSlotUnlocked = true;
    if (state.tutorial) state.tutorial.checkTriggers();
  `,

  /**
   * When player enters dungeon area
   */
  onDungeonArea: `
    state.hasReachedDungeon = true;
    if (state.tutorial) state.tutorial.checkTriggers();
  `
};

export default initializeTutorialSystem;
