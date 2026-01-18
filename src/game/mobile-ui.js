// Mobile UI - Complete touch control system
import { isMobile } from "../engine/mobile.js";

// Create all mobile UI elements
export function createMobileUI(state) {
  const mobile = isMobile();
  console.log(`[MOBILE UI] createMobileUI called, isMobile=${mobile}, window.innerWidth=${window.innerWidth}, userAgent=${navigator.userAgent.substring(0, 50)}`);
  
  if (!mobile) {
    console.log('[MOBILE UI] Not mobile, skipping mobile UI creation');
    return;
  }

  // Remove any existing mobile UI
  const existing = document.getElementById('mobileUIContainer');
  if (existing) {
    console.log('[MOBILE UI] Removing existing mobile UI container');
    existing.remove();
  }

  // Create main container - add to HTML (not body) so it's not affected by body scale transform
  const container = document.createElement('div');
  container.id = 'mobileUIContainer';
  document.documentElement.appendChild(container);
  console.log('[MOBILE UI] Mobile UI container created and added to documentElement');

  // Create action buttons (A/B/X/Y style)
  createActionButtons(container, state);
  
  // Create ability buttons (top bar)
  createAbilityButtons(container, state);
  
  // Create menu buttons (top-left corner)
  createMenuButtons(container, state);
  
  return container;
}

// Action buttons (bottom-right) - A/B/X/Y style for attack, dodge, block, interact
function createActionButtons(container, state) {
  console.log('[MOBILE UI] Creating action buttons');
  const actionContainer = document.createElement('div');
  actionContainer.id = 'mobileActionButtons';
  actionContainer.className = 'mobile-action-container';
  
  // Button configuration: [label, key, color, position]
  const buttons = [
    { label: 'A', key: null, action: 'attack', color: '#ff6b6b', emoji: '⚔️', top: '50%', left: '85%' }, // Attack (mouse)
    { label: 'B', key: 'KeyF', action: 'interact', color: '#4aa3ff', emoji: '💬', top: '20%', left: '60%' }, // Interact
    { label: 'X', key: null, action: 'block', color: '#b56cff', emoji: '🛡️', top: '80%', left: '60%' }, // Block (right mouse)
    { label: 'Y', key: 'Space', action: 'dodge', color: '#7dff9b', emoji: '💨', top: '50%', left: '35%' } // Dodge/Dash
  ];

  buttons.forEach(config => {
    const btn = document.createElement('button');
    btn.className = 'mobile-action-btn';
    btn.dataset.action = config.action;
    btn.innerHTML = `<span class="action-emoji">${config.emoji}</span><span class="action-label">${config.label}</span>`;
    btn.style.top = config.top;
    btn.style.left = config.left;
    btn.style.borderColor = config.color;
    btn.style.setProperty('--btn-color', config.color);

    // Touch handlers
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (config.action === 'attack') {
        state.input.mouse.lDown = true;
        state.input.mouse.lHeldMs = 0;
      } else if (config.action === 'block') {
        state.input.mouse.rDown = true;
      } else if (config.key) {
        state.input.keysDown.add(config.key);
      }
      
      btn.classList.add('active');
    });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (config.action === 'attack') {
        state.input.mouse.lDown = false;
      } else if (config.action === 'block') {
        state.input.mouse.rDown = false;
      } else if (config.key) {
        state.input.keysDown.delete(config.key);
      }
      
      btn.classList.remove('active');
    });

    actionContainer.appendChild(btn);
  });

  container.appendChild(actionContainer);
  console.log('[MOBILE UI] Action buttons created and appended (4 buttons: A/B/X/Y)');
}

// Ability buttons (horizontal bar at top)
function createAbilityButtons(container, state) {
  const abilityContainer = document.createElement('div');
  abilityContainer.id = 'mobileAbilityBar';
  abilityContainer.className = 'mobile-ability-bar';

  // Abilities Q, E, R, T, G + Potion C
  const abilities = [
    { label: '1', key: 'KeyQ', slot: 0 },
    { label: '2', key: 'KeyE', slot: 1 },
    { label: '3', key: 'KeyR', slot: 2 },
    { label: '4', key: 'KeyT', slot: 3 },
    { label: '5', key: 'KeyG', slot: 4 },
    { label: '🧪', key: 'KeyC', slot: 'potion', color: '#ff6b6b' }
  ];

  abilities.forEach(config => {
    const btn = document.createElement('button');
    btn.className = 'mobile-ability-btn';
    btn.dataset.key = config.key;
    btn.dataset.slot = config.slot;
    btn.textContent = config.label;
    if (config.color) btn.style.borderColor = config.color;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      state.input.keysDown.add(config.key);
      btn.classList.add('active');
      
      setTimeout(() => {
        state.input.keysDown.delete(config.key);
        btn.classList.remove('active');
      }, 150);
    });

    abilityContainer.appendChild(btn);
  });

  container.appendChild(abilityContainer);
  console.log('[MOBILE UI] Ability buttons created and appended (6 buttons: abilities + potion)');
}

// Menu buttons (top-left corner) - Inventory, Skills, Map, etc.
function createMenuButtons(container, state) {
  const menuContainer = document.createElement('div');
  menuContainer.id = 'mobileMenuButtons';
  menuContainer.className = 'mobile-menu-buttons';

  const menus = [
    { label: '🎒', key: 'KeyI', title: 'Inventory' },
    { label: '🗺️', key: 'KeyM', title: 'Map' },
    { label: '⚡', key: 'KeyK', title: 'Skills' },
    { label: '⬆️', key: 'KeyL', title: 'Level Up' }
  ];

  menus.forEach(config => {
    const btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.textContent = config.label;
    btn.title = config.title;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      state.input.keysDown.add(config.key);
      
      setTimeout(() => {
        state.input.keysDown.delete(config.key);
      }, 100);
    });

    menuContainer.appendChild(btn);
  });

  container.appendChild(menuContainer);
  console.log('[MOBILE UI] Menu buttons created and appended (4 buttons: I/M/K/L)');
}

// Update ability cooldowns
export function updateMobileAbilityIcons(state) {
  if (!isMobile()) return;
  
  const buttons = document.querySelectorAll('.mobile-ability-btn');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    const key = btn.dataset.key;
    const slot = btn.dataset.slot;
    
    // Check cooldown based on ability slot
    if (slot !== 'potion' && state.player?.abilities) {
      const ability = state.player.abilities[parseInt(slot)];
      if (ability) {
        const cooldown = state.cooldowns?.[ability] || 0;
        
        if (cooldown > 0) {
          btn.classList.add('on-cooldown');
          btn.style.opacity = '0.4';
        } else {
          btn.classList.remove('on-cooldown');
          btn.style.opacity = '1';
        }
      }
    }
  });
}
