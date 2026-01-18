// Mobile detection and touch control system
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (window.innerWidth <= 768);
}

export function initMobileControls(canvas, input) {
  if (!isMobile()) return null;

  const mobile = {
    joystick: { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 },
    touchButtons: new Map(), // ability buttons
    lastTap: 0,
    doubleTapDelay: 300
  };

  // Virtual joystick for movement
  let joystickTouch = null;
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    for (let touch of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Left side = movement joystick
      if (x < canvas.width / 2) {
        if (!joystickTouch) {
          joystickTouch = touch.identifier;
          mobile.joystick.active = true;
          mobile.joystick.startX = x;
          mobile.joystick.startY = y;
          mobile.joystick.currentX = x;
          mobile.joystick.currentY = y;
        }
      }
      // Right side = attack/interact
      else {
        // Simulate mouse for abilities/attacks
        input.mouse.x = touch.clientX;
        input.mouse.y = touch.clientY;
        input.mouse.lDown = true;
        
        // Check for double tap (dash/dodge)
        const now = Date.now();
        if (now - mobile.lastTap < mobile.doubleTapDelay) {
          // Trigger dodge/dash ability
          input.keysDown.add('Space');
        }
        mobile.lastTap = now;
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
        const maxRadius = 60;
        if (distance > maxRadius) {
          mobile.joystick.dx = (dx / distance) * maxRadius;
          mobile.joystick.dy = (dy / distance) * maxRadius;
        } else {
          mobile.joystick.dx = dx;
          mobile.joystick.dy = dy;
        }
        
        // Convert to WASD input
        const threshold = 15;
        input.keysDown.clear();
        if (Math.abs(mobile.joystick.dx) > threshold || Math.abs(mobile.joystick.dy) > threshold) {
          if (mobile.joystick.dy < -threshold) input.keysDown.add('KeyW');
          if (mobile.joystick.dy > threshold) input.keysDown.add('KeyS');
          if (mobile.joystick.dx < -threshold) input.keysDown.add('KeyA');
          if (mobile.joystick.dx > threshold) input.keysDown.add('KeyD');
        }
      } else {
        // Update mouse position for right-side touches
        input.mouse.x = touch.clientX;
        input.mouse.y = touch.clientY;
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
        input.keysDown.clear();
      } else {
        input.mouse.lDown = false;
        input.keysDown.delete('Space');
      }
    }
  });

  canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    joystickTouch = null;
    mobile.joystick.active = false;
    mobile.joystick.dx = 0;
    mobile.joystick.dy = 0;
    input.keysDown.clear();
    input.mouse.lDown = false;
  });

  return mobile;
}

// Render virtual joystick overlay
export function renderMobileControls(ctx, mobile) {
  if (!mobile || !mobile.joystick.active) return;

  const { startX, startY, currentX, currentY } = mobile.joystick;

  // Draw base circle
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(startX, startY, 60, 0, Math.PI * 2);
  ctx.fill();

  // Draw stick
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#00aaff';
  ctx.beginPath();
  ctx.arc(currentX, currentY, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
