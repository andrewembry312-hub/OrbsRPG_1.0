export function startLoop(tick){
  let last=performance.now();
  function frame(now){
    const dt=Math.min(0.033,(now-last)/1000);
    last=now;
    tick(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
