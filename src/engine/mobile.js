// Mobile detection and touch control system
export function isMobile() {
  const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const widthCheck = window.innerWidth <= 768;
  const touchCheck = () => {
    try {
      document.createEvent('TouchEvent');
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const result = userAgentCheck || widthCheck || (touchCheck && window.matchMedia('(hover: none)').matches);
  
  // Log detection result for debugging
  if (!window._mobileDetectionLogged) {
    console.log(`[MOBILE DETECTION] UserAgent: ${userAgentCheck}, Width: ${widthCheck} (${window.innerWidth}px), Touch: ${touchCheck()}, Result: ${result}`);
    window._mobileDetectionLogged = true;
  }
  
  return result;
}

// Try to lock screen to landscape orientation
export function lockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {
        console.log('[MOBILE] Orientation lock not supported by browser');
      });
    }
  } catch(e) { /* not supported */ }
}

// Request fullscreen + lock orientation (must be called from a user gesture)
function requestFullscreenLandscape() {
  const el = document.documentElement;
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (rfs) {
    rfs.call(el).then(() => {
      lockLandscape();
      console.log('[MOBILE] Entered fullscreen + landscape lock');
    }).catch(() => {
      console.log('[MOBILE] Fullscreen request denied');
    });
  }
}

export function initMobileControls(canvas, input, force = false) {
  if (!force && !isMobile()) return null;

  console.log('[MOBILE] Initializing mobile touch controls (joystick)');
  lockLandscape();

  // On first touch, try to go fullscreen + lock landscape
  let fullscreenRequested = false;
  const tryFullscreen = () => {
    if (!fullscreenRequested) {
      fullscreenRequested = true;
      requestFullscreenLandscape();
      document.removeEventListener('touchstart', tryFullscreen);
    }
  };
  document.addEventListener('touchstart', tryFullscreen, { once: true });

  const mobile = {
    joystick: { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 },
    actionButtons: new Map(),
    activeActionTouch: null,
    isBlocking: false,
    isSprinting: false
  };

  // Virtual joystick for movement — entire left 45% of screen, any Y position
  let joystickTouch = null;
  const JOYSTICK_RADIUS = 70; // larger radius for bigger thumb area
  
  // Track last movement direction for player facing on mobile
  mobile.lastMoveAngle = null;
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    for (let touch of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Left 45% of screen = movement joystick (any Y position)
      if (x < rect.width * 0.45) {
        if (!joystickTouch) {
          joystickTouch = touch.identifier;
          mobile.joystick.active = true;
          mobile.joystick.startX = x;
          mobile.joystick.startY = y;
          mobile.joystick.currentX = x;
          mobile.joystick.currentY = y;
        }
      }
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    for (let touch of e.changedTouches) {
      if (touch.identifier === joystickTouch) {
        const rect = canvas.getBoundingClientRect();
        mobile.joystick.currentX = touch.clientX - rect.left;
        mobile.joystick.currentY = touch.clientY - rect.top;
        
        // Calculate direction vector
        const dx = mobile.joystick.currentX - mobile.joystick.startX;
        const dy = mobile.joystick.currentY - mobile.joystick.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normalize and clamp to max radius
        if (distance > JOYSTICK_RADIUS) {
          mobile.joystick.dx = (dx / distance) * JOYSTICK_RADIUS;
          mobile.joystick.dy = (dy / distance) * JOYSTICK_RADIUS;
        } else {
          mobile.joystick.dx = dx;
          mobile.joystick.dy = dy;
        }
        
        // Convert to WASD input
        const threshold = 15;
        // Clear only movement keys
        input.keysDown.delete('KeyW');
        input.keysDown.delete('KeyS');
        input.keysDown.delete('KeyA');
        input.keysDown.delete('KeyD');
        
        if (Math.abs(mobile.joystick.dx) > threshold || Math.abs(mobile.joystick.dy) > threshold) {
          if (mobile.joystick.dy < -threshold) input.keysDown.add('KeyW');
          if (mobile.joystick.dy > threshold) input.keysDown.add('KeyS');
          if (mobile.joystick.dx < -threshold) input.keysDown.add('KeyA');
          if (mobile.joystick.dx > threshold) input.keysDown.add('KeyD');
          
          // Track movement angle for player facing
          mobile.lastMoveAngle = Math.atan2(mobile.joystick.dy, mobile.joystick.dx);
          
          // Update mouse position so player aims in movement direction
          // Place a virtual aim point ahead of the screen center in the joystick direction
          const aimDist = 200; // pixels ahead of center
          const normDx = mobile.joystick.dx / Math.max(1, Math.sqrt(mobile.joystick.dx*mobile.joystick.dx + mobile.joystick.dy*mobile.joystick.dy));
          const normDy = mobile.joystick.dy / Math.max(1, Math.sqrt(mobile.joystick.dx*mobile.joystick.dx + mobile.joystick.dy*mobile.joystick.dy));
          input.mouse.x = canvas.width / 2 + normDx * aimDist;
          input.mouse.y = canvas.height / 2 + normDy * aimDist;
        }
        
        // Enable sprint when joystick is pushed to edge
        if (distance > JOYSTICK_RADIUS * 0.8) {
          if (!mobile.isSprinting) {
            input.keysDown.add('ShiftLeft');
            mobile.isSprinting = true;
          }
        } else {
          if (mobile.isSprinting) {
            input.keysDown.delete('ShiftLeft');
            mobile.isSprinting = false;
          }
        }
      }
    }
  });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    
    for (let touch of e.changedTouches) {
      if (touch.identifier === joystickTouch) {
        joystickTouch = null;
        mobile.joystick.active = false;
        mobile.joystick.dx = 0;
        mobile.joystick.dy = 0;
        input.keysDown.delete('KeyW');
        input.keysDown.delete('KeyS');
        input.keysDown.delete('KeyA');
        input.keysDown.delete('KeyD');
        input.keysDown.delete('ShiftLeft');
        mobile.isSprinting = false;
      }
    }
  });

  canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    joystickTouch = null;
    mobile.joystick.active = false;
    mobile.joystick.dx = 0;
    mobile.joystick.dy = 0;
    input.keysDown.delete('KeyW');
    input.keysDown.delete('KeyS');
    input.keysDown.delete('KeyA');
    input.keysDown.delete('KeyD');
    input.keysDown.delete('ShiftLeft');
    mobile.isSprinting = false;
  });

  return mobile;
}

// Render virtual joystick overlay
export function renderMobileControls(ctx, mobile) {
  if (!mobile || !mobile.joystick.active) return;

  const { startX, startY, currentX, currentY } = mobile.joystick;
  const baseR = 70;
  const stickR = 30;

  // Draw base circle
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(startX, startY, baseR, 0, Math.PI * 2);
  ctx.fill();

  // Draw outer ring
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(startX, startY, baseR, 0, Math.PI * 2);
  ctx.stroke();

  // Draw stick
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#00aaff';
  ctx.beginPath();
  ctx.arc(currentX, currentY, stickR, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw stick border
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(currentX, currentY, stickR, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}
