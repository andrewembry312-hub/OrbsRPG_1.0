export function initCanvas(id){
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');

  function resize(){
    // When CSS rotates the page (portrait on mobile), swap width/height
    let displayWidth = window.innerWidth;
    let displayHeight = window.innerHeight;
    
    // Detect if CSS portrait-to-landscape rotation is active
    // (html element is rotated 90deg when portrait on mobile)
    const isPortraitRotated = window.matchMedia('(orientation: portrait) and (hover: none)').matches;
    if (isPortraitRotated) {
      // CSS rotates the html element, so swap dimensions
      displayWidth = window.innerHeight;
      displayHeight = window.innerWidth;
    }
    
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
