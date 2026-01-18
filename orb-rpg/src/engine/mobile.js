// Mobile detection and touch control system
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || (window.innerWidth <= 768);
}

export function initMobileControls(canvas, input) {
  if (!isMobile()) return null;

  const mobile = {
    joystick: { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 },
    actionButtons: new Map(), // A/B/X/Y buttons
    activeActionTouch: null,
    isBlocking: false,
    isSprinting: false
  };

  // Virtual joystick for movement
  let joystickTouch = null;
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    for (let touch of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Left bottom quarter = movement joystick
      if (x < canvas.width * 0.35 && y > canvas.height * 0.5) {
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
        const maxRadius = 50;
        if (distance > maxRadius) {
          mobile.joystick.dx = (dx / distance) * maxRadius;
          mobile.joystick.dy = (dy / distance) * maxRadius;
        } else {
          mobile.joystick.dx = dx;
          mobile.joystick.dy = dy;
        }
        
        // Convert to WASD input
        const threshold = 12;
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
        }
        
        // Enable sprint when joystick is pushed to edge
        if (distance > maxRadius * 0.8) {
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
        // Clear movement keys only
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

  // Draw base circle
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(startX, startY, 50, 0, Math.PI * 2);
  ctx.fill();

  // Draw outer ring
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#00aaff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(startX, startY, 50, 0, Math.PI * 2);
  ctx.stroke();

  // Draw stick
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#00aaff';
  ctx.beginPath();
  ctx.arc(currentX, currentY, 22, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw stick border
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(currentX, currentY, 22, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}
