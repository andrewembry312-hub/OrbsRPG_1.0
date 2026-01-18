// Mobile UI enhancements - touch-friendly ability buttons
import { isMobile } from "../engine/mobile.js";

export function createMobileAbilityButtons(state) {
  if (!isMobile()) return;

  const container = document.createElement('div');
  container.id = 'mobileAbilityButtons';
  container.style.cssText = `
    position: fixed;
    bottom: 52px;
    right: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 200;
  `;

  // Create buttons for abilities 1-4
  for (let i = 1; i <= 4; i++) {
    const btn = document.createElement('button');
    btn.className = 'mobileAbilityBtn';
    btn.textContent = i;
    btn.dataset.slot = i;
    btn.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid rgba(212, 175, 55, 0.6);
      background: rgba(0, 0, 0, 0.85);
      color: #d4af37;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      cursor: pointer;
      transition: all 0.15s;
      padding: 0;
      margin: 0;
    `;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Trigger ability via keyboard simulation
      const keyMap = { 1: 'Digit1', 2: 'Digit2', 3: 'Digit3', 4: 'Digit4' };
      state.input.keysDown.add(keyMap[i]);
      
      // Visual feedback
      btn.style.transform = 'scale(0.9)';
      btn.style.borderColor = '#ffd700';
      
      setTimeout(() => {
        state.input.keysDown.delete(keyMap[i]);
        btn.style.transform = 'scale(1)';
        btn.style.borderColor = 'rgba(212, 175, 55, 0.6)';
      }, 200);
    });

    container.appendChild(btn);
  }

  // Add potion button (Q key)
  const potionBtn = document.createElement('button');
  potionBtn.className = 'mobileAbilityBtn';
  potionBtn.textContent = '🧪';
  potionBtn.style.cssText = `
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid rgba(255, 107, 107, 0.6);
    background: rgba(0, 0, 0, 0.85);
    color: #ff6b6b;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;
    margin: 0;
  `;

  potionBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    state.input.keysDown.add('KeyQ');
    potionBtn.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      state.input.keysDown.delete('KeyQ');
      potionBtn.style.transform = 'scale(1)';
    }, 200);
  });

  container.appendChild(potionBtn);

  document.body.appendChild(container);
  
  return container;
}

// Update ability button icons dynamically
export function updateMobileAbilityIcons(state) {
  if (!isMobile()) return;
  
  const container = document.getElementById('mobileAbilityButtons');
  if (!container) return;

  const abilities = state.player?.abilities || [];
  const buttons = container.querySelectorAll('.mobileAbilityBtn');
  
  buttons.forEach((btn, index) => {
    if (index < abilities.length) {
      const ability = abilities[index];
      const cooldown = state.cooldowns?.[ability] || 0;
      
      // Show cooldown overlay
      if (cooldown > 0) {
        btn.style.opacity = '0.5';
        btn.style.borderColor = '#666';
      } else {
        btn.style.opacity = '1';
        btn.style.borderColor = 'rgba(212, 175, 55, 0.6)';
      }
    }
  });
}
