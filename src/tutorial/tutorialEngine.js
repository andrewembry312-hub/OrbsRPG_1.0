/**
 * COMPREHENSIVE INTERACTIVE TUTORIAL SYSTEM
 * Manages tutorial state, progression, triggers, and pause integration
 */

export class TutorialEngine {
  constructor(state, ui) {
    this.state = state;
    this.ui = ui;
    
    // Tutorial state
    this.enabled = true; // Enabled by default
    this.currentTutorial = null;
    this.currentStep = 0;
    this.isActive = false;
    this.wasGamePaused = false;
    
    // Completion tracking
    this.completedTutorials = new Set();
    this.seenTutorials = new Set();
    this.triggers = new Map(); // Tracks if trigger has fired
    
    // Tutorial queue
    this.tutorialQueue = [];
    this.autoTriggerEnabled = true;
    
    // Load from localStorage
    this.loadProgress();
  }

  /**
   * Initialize tutorial on game start
   */
  initialize() {
    console.log('[TUTORIAL ENGINE] Initialize called, enabled:', this.enabled);
    if (!this.enabled) return;
    
    // Clear tutorial progress for new game - always show welcome
    console.log('[TUTORIAL ENGINE] Clearing tutorial progress for new game');
    this.completedTutorials.clear();
    this.seenTutorials.clear();
    
    // Always show welcome on new game
    console.log('[TUTORIAL ENGINE] First launch, queueing welcome tutorial');
    this.queueTutorial('welcome', true); // priority
  }

  /**
   * Queue a tutorial to display
   * @param {string} tutorialId - Which tutorial to show
   * @param {boolean} priority - If true, shows immediately
   */
  queueTutorial(tutorialId, priority = false) {
    console.log('[TUTORIAL ENGINE] Queueing tutorial:', tutorialId, 'priority:', priority);
    if (!this.enabled || this.completedTutorials.has(tutorialId)) {
      console.log('[TUTORIAL ENGINE] Skipping - enabled:', this.enabled, 'completed:', this.completedTutorials.has(tutorialId));
      return;
    }
    
    if (priority) {
      this.tutorialQueue.unshift(tutorialId);
      this.showNextTutorial();
    } else {
      this.tutorialQueue.push(tutorialId);
    }
  }

  /**
   * Show the next tutorial in queue
   */
  showNextTutorial() {
    if (this.tutorialQueue.length === 0) {
      console.log('[TUTORIAL ENGINE] No tutorials in queue');
      return;
    }
    
    const tutorialId = this.tutorialQueue.shift();
    console.log('[TUTORIAL ENGINE] Showing next tutorial:', tutorialId);
    this.showTutorial(tutorialId);
  }

  /**
   * Display a specific tutorial
   */
  showTutorial(tutorialId) {
    console.log('[TUTORIAL ENGINE] showTutorial called:', tutorialId);
    if (!this.enabled) return;
    
    // Don't show if already completed
    if (this.completedTutorials.has(tutorialId)) {
      console.log('[TUTORIAL ENGINE] Tutorial already completed:', tutorialId);
      return;
    }
    
    this.currentTutorial = tutorialId;
    this.currentStep = 0;
    this.isActive = true;
    this.seenTutorials.add(tutorialId);
    
    console.log('[TUTORIAL ENGINE] About to pause game');
    // Pause game
    this.pauseGame();
    
    console.log('[TUTORIAL ENGINE] About to show UI, ui:', !!this.ui, 'showTutorial method:', !!(this.ui && this.ui.showTutorial));
    // Show tutorial UI
    if (this.ui && this.ui.showTutorial) {
      console.log('[TUTORIAL ENGINE] Calling ui.showTutorial');
      this.ui.showTutorial(tutorialId, 0);
    } else {
      console.error('[TUTORIAL ENGINE] UI or showTutorial method missing!');
    }
  }

  /**
   * Advance to next step in current tutorial
   */
  nextStep() {
    if (!this.currentTutorial) return;
    
    this.currentStep++;
    
    if (this.ui && this.ui.showTutorial) {
      this.ui.showTutorial(this.currentTutorial, this.currentStep);
    }
  }

  /**
   * Go back to previous step
   */
  previousStep() {
    if (!this.currentTutorial || this.currentStep === 0) return;
    
    this.currentStep--;
    
    if (this.ui && this.ui.showTutorial) {
      this.ui.showTutorial(this.currentTutorial, this.currentStep);
    }
  }

  /**
   * Close current tutorial
   */
  closeTutorial() {
    if (!this.currentTutorial) return;
    
    // Mark as completed
    this.completedTutorials.add(this.currentTutorial);
    
    // Resume game
    this.resumeGame();
    
    // Hide UI
    if (this.ui && this.ui.hideTutorial) {
      this.ui.hideTutorial();
    }
    
    this.currentTutorial = null;
    this.currentStep = 0;
    this.isActive = false;
    
    // Save progress
    this.saveProgress();
    
    // Show next in queue
    this.showNextTutorial();
  }

  /**
   * Pause game for tutorial
   */
  pauseGame() {
    if (this.state.paused) {
      this.wasGamePaused = true;
      return; // Already paused
    }
    
    this.wasGamePaused = false;
    this.state.paused = true; // Use state.paused, not state.gamePaused
    this.state.pauseReason = 'TUTORIAL';
  }

  /**
   * Resume game after tutorial
   */
  resumeGame() {
    if (this.wasGamePaused) {
      // Was already paused, don't resume
      return;
    }
    
    this.state.paused = false; // Use state.paused, not state.gamePaused
    this.state.pauseReason = null;
  }

  /**
   * Check if tutorial is currently showing
   */
  isTutorialActive() {
    return this.isActive;
  }

  /**
   * Disable tutorials entirely
   */
  disable() {
    this.enabled = false;
    this.saveProgress();
  }

  /**
   * Enable tutorials
   */
  enable() {
    this.enabled = true;
    this.saveProgress();
  }

  /**
   * Toggle tutorial system
   */
  toggle() {
    this.enabled = !this.enabled;
    this.saveProgress();
  }

  /**
   * Check if specific tutorial is completed
   */
  isCompleted(tutorialId) {
    return this.completedTutorials.has(tutorialId);
  }

  /**
   * Reset tutorial progress (for testing)
   */
  resetProgress() {
    this.completedTutorials.clear();
    this.seenTutorials.clear();
    this.triggers.clear();
    this.tutorialQueue = [];
    this.currentTutorial = null;
    this.currentStep = 0;
    this.isActive = false;
    this.saveProgress();
  }

  /**
   * Save progress to localStorage
   */
  saveProgress() {
    const progress = {
      enabled: this.enabled,
      completed: Array.from(this.completedTutorials),
      seen: Array.from(this.seenTutorials),
      triggers: Object.fromEntries(this.triggers),
      timestamp: Date.now()
    };
    localStorage.setItem('tutorialProgress', JSON.stringify(progress));
  }

  /**
   * Load progress from localStorage
   */
  loadProgress() {
    try {
      const saved = localStorage.getItem('tutorialProgress');
      if (!saved) return;
      
      const progress = JSON.parse(saved);
      this.enabled = progress.enabled !== false;
      this.completedTutorials = new Set(progress.completed || []);
      this.seenTutorials = new Set(progress.seen || []);
      this.triggers = new Map(Object.entries(progress.triggers || {}));
    } catch (e) {
      console.error('Failed to load tutorial progress:', e);
    }
  }

  /**
   * Register auto-trigger for tutorial
   * @param {string} triggerId - Unique trigger identifier
   * @param {string} tutorialId - Tutorial to show
   * @param {function} condition - Function that returns true when trigger should fire
   */
  registerTrigger(triggerId, tutorialId, condition) {
    this.triggers.set(triggerId, { tutorialId, condition, fired: false });
  }

  /**
   * Check all registered triggers
   */
  checkTriggers() {
    if (!this.autoTriggerEnabled || this.isActive) return;
    
    for (const [triggerId, trigger] of this.triggers) {
      if (trigger.fired || this.completedTutorials.has(trigger.tutorialId)) {
        continue; // Skip if already fired or tutorial completed
      }
      
      try {
        if (trigger.condition()) {
          trigger.fired = true;
          this.queueTutorial(trigger.tutorialId, true); // Priority
        }
      } catch (e) {
        console.error(`Trigger ${triggerId} failed:`, e);
      }
    }
  }

  /**
   * Get tutorial progress percentage
   */
  getProgress() {
    if (this.seenTutorials.size === 0) return 0;
    return Math.round((this.completedTutorials.size / this.seenTutorials.size) * 100);
  }

  /**
   * Get total tutorials available
   */
  getTotalTutorials() {
    return this.seenTutorials.size;
  }

  /**
   * Get completed tutorials count
   */
  getCompletedCount() {
    return this.completedTutorials.size;
  }
}

export default TutorialEngine;
