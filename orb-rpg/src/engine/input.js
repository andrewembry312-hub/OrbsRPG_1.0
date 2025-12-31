// Input module keeps *state* only. Game decides what to do with it.
export function initInput(canvas){
  const keysDown=new Set();
  const mouse={x:0,y:0,lDown:false,rDown:false,lHeldMs:0, lastShot:0};

  canvas.addEventListener('mousemove',e=>{mouse.x=e.clientX; mouse.y=e.clientY;});
  canvas.addEventListener('mousedown',e=>{
    if(e.button===0){ mouse.lDown=true; mouse.lHeldMs=0; }
    if(e.button===2){ mouse.rDown=true; }
  });
  canvas.addEventListener('mouseup',e=>{
    if(e.button===0){ mouse.lDown=false; }
    if(e.button===2){ mouse.rDown=false; }
  });
  canvas.oncontextmenu=()=>false;

  function isTypingIntoUi(ev){
    const t = ev.target;
    if(!t) return false;
    const tag = (t.tagName||'').toLowerCase();
    if(tag==='input' || tag==='textarea' || tag==='select') return true;
    // any contenteditable element
    if(t.isContentEditable) return true;
    // optional opt-out via attribute/class
    if(t.closest && (t.closest('[data-prevent-hotkeys]') || t.closest('.prevent-hotkeys'))) return true;
    return false;
  }

  addEventListener('keydown',e=>{ 
    if(isTypingIntoUi(e)) return; 
    if(e.code === 'F5'){ e.preventDefault(); }
    keysDown.add(e.code); 
  });
  addEventListener('keyup',e=>{ if(isTypingIntoUi(e)) return; keysDown.delete(e.code); });

  return { keysDown, mouse };
}
