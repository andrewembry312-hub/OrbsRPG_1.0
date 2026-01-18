export function initCanvas(id){
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');

  function resize(){
    // Set canvas size to match window dimensions
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    
    // Update canvas logical size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // Ensure canvas fills the viewport (handles zoom properly)
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
  }
  
  addEventListener('resize', resize);
  resize();

  return { canvas, ctx, resize };
}
