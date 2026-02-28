// Mobile UI - Complete touch control system
import { isMobile } from "../engine/mobile.js";

// Force mobile mode flag (set from title screen toggle)
let forceMobileMode = false;
export function setForceMobile(val) { forceMobileMode = val; }
export function isMobileActive() { return forceMobileMode || isMobile(); }

// Create all mobile UI elements
export function createMobileUI(state) {
  const mobile = isMobileActive();
  console.log(`[MOBILE UI] createMobileUI called, isMobileActive=${mobile}, isMobile=${isMobile()}, forceMobile=${forceMobileMode}`);
  
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

  // Create attack/block buttons (bottom-right, 2 large buttons)
  createActionButtons(container, state);

  // Create ability buttons (vertical column on right side)
  createAbilityButtons(container, state);

  // Create secondary action buttons (interact, dodge - above attack/block)
  createSecondaryActions(container, state);
  
  // Create menu buttons (top-left corner)
  createMenuButtons(container, state);

  // Create ESC/close button (top-right corner)
  createCloseButton(container, state);

  // Create zoom controls (top-center)
  createZoomControls(container, state);
  
  return container;
}

// Attack + Block buttons (bottom-right corner, 2 large buttons side by side)
function createActionButtons(container, state) {
  console.log('[MOBILE UI] Creating attack/block buttons');
  const actionContainer = document.createElement('div');
  actionContainer.id = 'mobileActionButtons';
  actionContainer.className = 'mobile-action-container';

  const buttons = [
    { label: 'ATK', action: 'attack', color: '#ff6b6b', emoji: '⚔️' },
    { label: 'BLK', action: 'block', color: '#b56cff', emoji: '🛡️' }
  ];

  buttons.forEach(config => {
    const btn = document.createElement('button');
    btn.className = 'mobile-action-btn';
    btn.dataset.action = config.action;
    btn.innerHTML = `<span class="action-emoji">${config.emoji}</span><span class="action-label">${config.label}</span>`;
    btn.style.borderColor = config.color;
    btn.style.setProperty('--btn-color', config.color);

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (config.action === 'attack') {
        state.input.mouse.lDown = true;
        state.input.mouse.lHeldMs = 0;
      } else if (config.action === 'block') {
        state.input.mouse.rDown = true;
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
      }
      btn.classList.remove('active');
    });

    btn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      if (config.action === 'attack') state.input.mouse.lDown = false;
      else if (config.action === 'block') state.input.mouse.rDown = false;
      btn.classList.remove('active');
    });

    actionContainer.appendChild(btn);
  });

  container.appendChild(actionContainer);
  console.log('[MOBILE UI] Attack/Block buttons created (2 large buttons, bottom-right)');
}

// Secondary action buttons (Interact + Dodge, positioned above attack/block)
function createSecondaryActions(container, state) {
  const secContainer = document.createElement('div');
  secContainer.id = 'mobileSecondaryActions';
  secContainer.className = 'mobile-secondary-container';

  const buttons = [
    { label: 'Talk', key: 'KeyF', action: 'interact', color: '#4aa3ff', emoji: '💬' },
    { label: 'Dodge', key: 'Space', action: 'dodge', color: '#7dff9b', emoji: '💨' }
  ];

  buttons.forEach(config => {
    const btn = document.createElement('button');
    btn.className = 'mobile-secondary-btn';
    btn.dataset.action = config.action;
    btn.innerHTML = `<span class="action-emoji">${config.emoji}</span><span class="action-label">${config.label}</span>`;
    btn.style.borderColor = config.color;
    btn.style.setProperty('--btn-color', config.color);

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.input.keysDown.add(config.key);
      btn.classList.add('active');
    });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.input.keysDown.delete(config.key);
      btn.classList.remove('active');
    });

    btn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      state.input.keysDown.delete(config.key);
      btn.classList.remove('active');
    });

    secContainer.appendChild(btn);
  });

  container.appendChild(secContainer);
  console.log('[MOBILE UI] Secondary action buttons created (Interact + Dodge)');
}

// Ability buttons (vertical column on right side of screen)
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
  console.log('[MOBILE UI] Ability buttons created (vertical right-side bar, 6 buttons)');
}

// Menu buttons (top-left corner) - Inventory, Skills, Map, Level Up
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
  console.log('[MOBILE UI] Menu buttons created (4 buttons: Inventory/Map/Skills/LevelUp)');
}

// ESC/Close button (top-right corner) - acts as Escape key for closing overlays + opening menu
function createCloseButton(container, state) {
  const btn = document.createElement('button');
  btn.id = 'mobileEscBtn';
  btn.className = 'mobile-esc-btn';
  btn.innerHTML = '✕';
  btn.title = 'Close / Menu';

  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Simulate Escape key press
    state.input.keysDown.add(state.binds?.menu || 'Escape');
    btn.classList.add('active');
    setTimeout(() => {
      state.input.keysDown.delete(state.binds?.menu || 'Escape');
      btn.classList.remove('active');
    }, 100);
  });

  container.appendChild(btn);
  console.log('[MOBILE UI] ESC/Close button created (top-right)');
}

// Zoom controls (top-center) - zoom in / zoom out for mobile
function createZoomControls(container, state) {
  const zoomContainer = document.createElement('div');
  zoomContainer.id = 'mobileZoomControls';
  zoomContainer.className = 'mobile-zoom-container';

  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 1.8;
  const ZOOM_STEP = 0.15;

  const zoomOut = document.createElement('button');
  zoomOut.className = 'mobile-zoom-btn';
  zoomOut.textContent = '−';
  zoomOut.title = 'Zoom Out';
  zoomOut.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.camera) {
      state.camera.zoom = Math.max(MIN_ZOOM, (state.camera.zoom || 1) - ZOOM_STEP);
      updateZoomLabel();
    }
  });

  const zoomLabel = document.createElement('span');
  zoomLabel.className = 'mobile-zoom-label';
  zoomLabel.textContent = '100%';

  const zoomIn = document.createElement('button');
  zoomIn.className = 'mobile-zoom-btn';
  zoomIn.textContent = '+';
  zoomIn.title = 'Zoom In';
  zoomIn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.camera) {
      state.camera.zoom = Math.min(MAX_ZOOM, (state.camera.zoom || 1) + ZOOM_STEP);
      updateZoomLabel();
    }
  });

  function updateZoomLabel() {
    zoomLabel.textContent = Math.round((state.camera?.zoom || 1) * 100) + '%';
  }

  // Auto-update the label periodically
  setInterval(updateZoomLabel, 500);

  zoomContainer.appendChild(zoomOut);
  zoomContainer.appendChild(zoomLabel);
  zoomContainer.appendChild(zoomIn);
  container.appendChild(zoomContainer);
  console.log('[MOBILE UI] Zoom controls created (top-center: − / % / +)');
}

// Update ability cooldowns visually
export function updateMobileAbilityIcons(state) {
  if (!isMobileActive()) return;
  
  const buttons = document.querySelectorAll('.mobile-ability-btn');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
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
