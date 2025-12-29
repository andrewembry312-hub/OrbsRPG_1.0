export function initCanvas(id){
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');

  function resize(){
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  addEventListener('resize', resize);
  resize();

  return { canvas, ctx, resize };
}
