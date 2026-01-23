/**
 * TUTORIAL UI SYSTEM - FRESH IMPLEMENTATION
 * Simple, clean modal that actually works
 */

import { TUTORIAL_CONTENT } from './tutorialContent.js';

export class TutorialUI {
  constructor(state, engine = null) {
    this.state = state;
    this.engine = engine;
    this.modalElement = null;
    this.currentTutorialId = null;
    this.currentStep = 0;
    this._closing = false;
  }

  setEngine(engine) {
    this.engine = engine;
  }

  initialize() {
    this.createStyles();
    this.createModal();
  }

  createStyles() {
    if (document.getElementById('tutorial-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'tutorial-styles';
    style.textContent = `
      #tutorial-modal {
        display: flex !important;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 9999;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
      }

      #tutorial-modal:not(.active) {
        display: none !important;
      }

      #tutorial-modal.active {
        display: flex !important;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .tutorial-box {
        background: rgba(0, 0, 0, 0.95);
        border: 4px solid #FFD700;
        border-radius: 8px;
        width: 90%;
        max-width: 800px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 50px rgba(255, 215, 0, 0.6);
      }

      .tutorial-header {
        padding: 25px;
        border-bottom: 2px solid #FFD700;
        background: rgba(255, 215, 0, 0.05);
        flex-shrink: 0;
      }

      .tutorial-header h1 {
        margin: 0;
        color: #FFD700;
        font-size: 28px;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
      }

      .tutorial-content-area {
        flex: 1;
        overflow-y: auto;
        padding: 25px;
        color: #FFF;
      }

      .tutorial-content-area h2 {
        color: #FFD700;
        font-size: 22px;
        margin-top: 0;
        margin-bottom: 15px;
      }

      .tutorial-content-area p {
        font-size: 16px;
        line-height: 1.7;
        margin: 0 0 15px 0;
        white-space: pre-wrap;
      }

      .tutorial-tips {
        background: rgba(255, 215, 0, 0.1);
        border-left: 4px solid #FFD700;
        padding: 15px;
        margin: 15px 0;
        border-radius: 4px;
      }

      .tutorial-tips-title {
        color: #FFD700;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .tutorial-tips-item {
        color: #FFF;
        font-size: 14px;
        margin: 5px 0;
      }

      .tutorial-footer {
        padding: 20px 25px;
        border-top: 2px solid #FFD700;
        background: rgba(255, 215, 0, 0.02);
        flex-shrink: 0;
      }

      .tutorial-progress {
        text-align: center;
        color: #FFD700;
        font-size: 14px;
        margin-bottom: 15px;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(255, 215, 0, 0.2);
        border: 1px solid #FFD700;
        border-radius: 4px;
        overflow: hidden;
        margin-top: 8px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #FFD700, #FFA500);
        transition: width 0.3s ease;
      }

      .tutorial-buttons {
        display: flex;
        gap: 10px;
        justify-content: space-between;
        margin-top: 15px;
      }

      button.tut-btn {
        flex: 1;
        padding: 12px 20px;
        border: 2px solid #FFD700;
        background: rgba(255, 215, 0, 0.1);
        color: #FFD700;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.3s ease;
      }

      button.tut-btn:hover:not(:disabled) {
        background: rgba(255, 215, 0, 0.2);
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
      }

      button.tut-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      button.tut-btn.close {
        border-color: #FF6464;
        color: #FF6464;
        background: rgba(255, 100, 100, 0.1);
      }

      button.tut-btn.close:hover:not(:disabled) {
        background: rgba(255, 100, 100, 0.2);
        box-shadow: 0 0 15px rgba(255, 100, 100, 0.5);
      }

      button.tut-btn.primary {
        flex: 1.2;
      }
    `;
    document.head.appendChild(style);
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'tutorial-modal';
    modal.innerHTML = `
      <div class="tutorial-box">
        <div class="tutorial-header">
          <h1 id="tut-title">Tutorial</h1>
        </div>
        <div class="tutorial-content-area" id="tut-content"></div>
        <div class="tutorial-footer">
          <div class="tutorial-progress">
            <span id="tut-counter">Step 1 of 1</span>
            <div class="progress-bar">
              <div class="progress-fill" id="tut-progress" style="width: 0%;"></div>
            </div>
          </div>
          <div class="tutorial-buttons">
            <button class="tut-btn" id="tut-prev">← Previous</button>
            <button class="tut-btn close" id="tut-skip">Skip</button>
            <button class="tut-btn primary" id="tut-next">Next →</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.modalElement = modal;
    console.log('[TUTORIAL] Modal created:', modal);
    
    // Attach listeners
    document.getElementById('tut-next').addEventListener('click', () => this.nextStep());
    document.getElementById('tut-prev').addEventListener('click', () => this.previousStep());
    document.getElementById('tut-skip').addEventListener('click', () => this.closeTutorial());
  }

  showTutorial(tutorialId, stepIndex = 0) {
    if (!TUTORIAL_CONTENT[tutorialId]) {
      console.error(`Tutorial not found: ${tutorialId}`);
      return;
    }

    console.log('[TUTORIAL] Showing tutorial:', tutorialId, 'step:', stepIndex);

    this.currentTutorialId = tutorialId;
    this.currentStep = stepIndex;
    
    const tutorial = TUTORIAL_CONTENT[tutorialId];
    const step = tutorial.steps[stepIndex];
    const totalSteps = tutorial.steps.length;

    // Set title
    document.getElementById('tut-title').textContent = tutorial.title;

    // Set content
    const contentDiv = document.getElementById('tut-content');
    let html = `<h2>${step.title}</h2>`;
    html += `<p>${step.content}</p>`;
    
    if (step.tips) {
      html += `<div class="tutorial-tips">
        <div class="tutorial-tips-title">💡 Tips:</div>`;
      for (const tip of step.tips) {
        html += `<div class="tutorial-tips-item">→ ${tip}</div>`;
      }
      html += `</div>`;
    }

    // Add custom button if specified
    if (step.showButton && step.buttonAction) {
      const btnText = step.buttonText || 'Perform Action';
      html += `<button id="tut-custom-action" style="
        margin-top: 20px;
        padding: 12px 20px;
        background: #FFD700;
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
        width: 100%;
        transition: all 0.2s;
      " onmouseover="this.style.background='#FFF9E6'" onmouseout="this.style.background='#FFD700'">
        ${btnText}
      </button>`;
    }

    contentDiv.innerHTML = html;

    // Attach custom button action if needed
    if (step.showButton && step.buttonAction) {
      const btn = document.getElementById('tut-custom-action');
      if (btn) {
        btn.addEventListener('click', () => {
          // Execute the action (window function)
          if (window[step.buttonAction]) {
            console.log('[TUTORIAL] Executing action:', step.buttonAction);
            window[step.buttonAction]().then(() => {
              // Auto-advance after action completes
              setTimeout(() => {
                this.nextStep();
              }, 500);
            }).catch(err => {
              console.error('Action failed:', err);
            });
          }
        });
      }
    }

    // Auto-show tab if specified
    if (step.autoShowTab && this.state && this.state.ui) {
      console.log('[TUTORIAL] Auto-showing tab:', step.autoShowTab);
      // Find the tab button and click it
      setTimeout(() => {
        const tabBtn = document.querySelector(`button.tab-btn[data-tab]`);
        if (tabBtn) {
          // Determine which tab number
          const tabs = {
            'inventory': 0,
            'skills': 1,
            'levelup': 2,
            'buffs': 3,
            'group': 4,
            'allies': 5,
            'help': 6,
            'campaign': 7,
            'slots': 8,
            'cards': 9
          };
          const tabNum = tabs[step.autoShowTab];
          const btn = document.querySelector(`button.tab-btn[data-tab="${tabNum}"]`);
          if (btn) btn.click();
        }
      }, 300);
    }

    // Set progress
    document.getElementById('tut-counter').textContent = 
      `Step ${stepIndex + 1} of ${totalSteps}`;
    const progress = ((stepIndex + 1) / totalSteps) * 100;
    document.getElementById('tut-progress').style.width = `${progress}%`;

    // Update buttons
    document.getElementById('tut-prev').disabled = stepIndex === 0;
    const isLastStep = stepIndex === totalSteps - 1;
    document.getElementById('tut-next').textContent = 
      isLastStep ? 'Finish ✓' : 'Next →';

    // Show modal
    console.log('[TUTORIAL] Adding active class to modal');
    this.modalElement.classList.add('active');
    console.log('[TUTORIAL] Modal classes:', this.modalElement.className);
  }

  nextStep() {
    if (!this.currentTutorialId) return;
    const tutorial = TUTORIAL_CONTENT[this.currentTutorialId];
    const isLastStep = this.currentStep === tutorial.steps.length - 1;

    if (isLastStep) {
      this.closeTutorial();
    } else {
      this.showTutorial(this.currentTutorialId, this.currentStep + 1);
    }
  }

  previousStep() {
    if (!this.currentTutorialId || this.currentStep === 0) return;
    this.showTutorial(this.currentTutorialId, this.currentStep - 1);
  }

  closeTutorial() {
    this.modalElement.classList.remove('active');
    this.currentTutorialId = null;
    this.currentStep = 0;
    
    if (this.engine && this.engine.closeTutorial && !this._closing) {
      this._closing = true;
      this.engine.closeTutorial();
      this._closing = false;
    }
  }

  hideTutorial() {
    this._closing = true;
    this.closeTutorial();
    this._closing = false;
  }
}

export default TutorialUI;
