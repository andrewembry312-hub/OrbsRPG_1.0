export function initCanvas(id){
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');

  function resize(){
    // Set canvas size to match window dimensions (CSS pixels)
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    
    // Update canvas logical size to fill viewport
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // CSS size matches display
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
  }
  
  addEventListener('resize', resize);
  // Also handle orientation changes on mobile
  addEventListener('orientationchange', () => { setTimeout(resize, 150); });
  resize();

  return { canvas, ctx, resize };
}
