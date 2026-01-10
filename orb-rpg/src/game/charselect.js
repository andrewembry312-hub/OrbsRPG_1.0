export function showCharSelect(state, onPick, inGame=false){
  console.log('showCharSelect: creating overlay');
  const root = document.getElementById('ui-root');
  const el = document.createElement('div');
  el.id = 'charSelectOverlay';
  el.className = 'overlay show';
  el.style.cssText = 'display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.98); z-index:1000;';
  el.innerHTML = `
    <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; position:relative;">
      ${inGame ? '<div style="position:absolute; top:20px; right:20px;"><button id="btnClose" class="secondary" style="padding:8px 16px;">Close</button></div>' : ''}
      <div style="position:absolute; top:20px; left:20px; color:#fff; font-size:14px; opacity:0.7;">Press ESC to cancel</div>
      
      <h1 style="color:#d4af37; font-size:48px; font-weight:bold; margin:0 0 40px 0; text-shadow:0 0 20px rgba(212,175,55,0.5);">Select Your Hero</h1>
      
      <div style="display:flex; gap:40px; align-items:flex-start; justify-content:center; max-width:1600px; width:100%;">
        
        <!-- MAGE -->
        <div style="flex:1; max-width:350px; text-align:center; background:rgba(20,20,30,0.6); border:2px solid rgba(212,175,55,0.3); border-radius:12px; padding:24px; transition:all 0.3s; cursor:pointer;" onmouseover="this.style.borderColor='rgba(212,175,55,0.7)'; this.style.transform='translateY(-4px)';" onmouseout="this.style.borderColor='rgba(212,175,55,0.3)'; this.style.transform='translateY(0)';">
          <img src="assets/char/New Mage.png" style="width:280px; height:280px; object-fit:contain; margin-bottom:16px; filter:drop-shadow(0 0 20px rgba(100,150,255,0.4));"/>
          <div style="font-size:28px; font-weight:900; color:#d4af37; margin-bottom:8px;">MAGE</div>
          <div style="font-size:14px; color:#aaa; margin-bottom:16px; line-height:1.6;">High mana, ranged power.<br/>Healing & support specialist.</div>
          <div id="stats-mage" style="display:none; font-size:13px; color:#8cf; margin-bottom:16px; line-height:1.8; background:rgba(0,0,0,0.4); padding:12px; border-radius:6px; border:1px solid rgba(136,204,255,0.3);"></div>
          <div style="display:flex; gap:8px; justify-content:center;">
            <button data-id="mage" style="flex:1; padding:12px; font-size:14px; font-weight:bold;">SELECT</button>
            <button data-view="mage" class="secondary" style="padding:12px; font-size:14px;">STATS</button>
          </div>
        </div>
        
        <!-- WARRIOR -->
        <div style="flex:1; max-width:350px; text-align:center; background:rgba(20,20,30,0.6); border:2px solid rgba(212,175,55,0.3); border-radius:12px; padding:24px; transition:all 0.3s; cursor:pointer;" onmouseover="this.style.borderColor='rgba(212,175,55,0.7)'; this.style.transform='translateY(-4px)';" onmouseout="this.style.borderColor='rgba(212,175,55,0.3)'; this.style.transform='translateY(0)';">
          <img src="assets/char/New Warrior.png" style="width:280px; height:280px; object-fit:contain; margin-bottom:16px; filter:drop-shadow(0 0 20px rgba(255,100,100,0.4));"/>
          <div style="font-size:28px; font-weight:900; color:#d4af37; margin-bottom:8px;">WARRIOR</div>
          <div style="font-size:14px; color:#aaa; margin-bottom:16px; line-height:1.6;">Balanced fighter.<br/>Steady damage & versatility.</div>
          <div id="stats-warrior" style="display:none; font-size:13px; color:#f88; margin-bottom:16px; line-height:1.8; background:rgba(0,0,0,0.4); padding:12px; border-radius:6px; border:1px solid rgba(255,136,136,0.3);"></div>
          <div style="display:flex; gap:8px; justify-content:center;">
            <button data-id="warrior" style="flex:1; padding:12px; font-size:14px; font-weight:bold;">SELECT</button>
            <button data-view="warrior" class="secondary" style="padding:12px; font-size:14px;">STATS</button>
          </div>
        </div>
        
        <!-- KNIGHT -->
        <div style="flex:1; max-width:350px; text-align:center; background:rgba(20,20,30,0.6); border:2px solid rgba(212,175,55,0.3); border-radius:12px; padding:24px; transition:all 0.3s; cursor:pointer;" onmouseover="this.style.borderColor='rgba(212,175,55,0.7)'; this.style.transform='translateY(-4px)';" onmouseout="this.style.borderColor='rgba(212,175,55,0.3)'; this.style.transform='translateY(0)';">
          <img src="assets/char/New Knight.png" style="width:280px; height:280px; object-fit:contain; margin-bottom:16px; filter:drop-shadow(0 0 20px rgba(150,255,150,0.4));"/>
          <div style="font-size:28px; font-weight:900; color:#d4af37; margin-bottom:8px;">KNIGHT</div>
          <div style="font-size:14px; color:#aaa; margin-bottom:16px; line-height:1.6;">Tough defender.<br/>Good sustain & armor.</div>
          <div id="stats-knight" style="display:none; font-size:13px; color:#8f8; margin-bottom:16px; line-height:1.8; background:rgba(0,0,0,0.4); padding:12px; border-radius:6px; border:1px solid rgba(136,255,136,0.3);"></div>
          <div style="display:flex; gap:8px; justify-content:center;">
            <button data-id="knight" style="flex:1; padding:12px; font-size:14px; font-weight:bold;">SELECT</button>
            <button data-view="knight" class="secondary" style="padding:12px; font-size:14px;">STATS</button>
          </div>
        </div>
        
        <!-- WARDEN -->
        <div style="flex:1; max-width:350px; text-align:center; background:rgba(20,20,30,0.6); border:2px solid rgba(212,175,55,0.3); border-radius:12px; padding:24px; transition:all 0.3s; cursor:pointer;" onmouseover="this.style.borderColor='rgba(212,175,55,0.7)'; this.style.transform='translateY(-4px)';" onmouseout="this.style.borderColor='rgba(212,175,55,0.3)'; this.style.transform='translateY(0)';">
          <img src="assets/char/New Warden.png" style="width:280px; height:280px; object-fit:contain; margin-bottom:16px; filter:drop-shadow(0 0 20px rgba(255,200,100,0.4));"/>
          <div style="font-size:28px; font-weight:900; color:#d4af37; margin-bottom:8px;">WARDEN</div>
          <div style="font-size:14px; color:#aaa; margin-bottom:16px; line-height:1.6;">Massive HP.<br/>Ultimate defense & survival.</div>
          <div id="stats-warden" style="display:none; font-size:13px; color:#fc8; margin-bottom:16px; line-height:1.8; background:rgba(0,0,0,0.4); padding:12px; border-radius:6px; border:1px solid rgba(255,204,136,0.3);"></div>
          <div style="display:flex; gap:8px; justify-content:center;">
            <button data-id="warden" style="flex:1; padding:12px; font-size:14px; font-weight:bold;">SELECT</button>
            <button data-view="warden" class="secondary" style="padding:12px; font-size:14px;">STATS</button>
          </div>
        </div>
        
      </div>
      
      <div style="margin-top:40px; text-align:center; font-size:14px; color:#999; max-width:600px;">You can change equipment and skills later from the menu. Each class has unique abilities and playstyle.</div>
    </div>`;

  root.appendChild(el);

  function templateStats(id){
    const base = {...state.basePlayer};
    let mod = {};
    if(id==='mage') mod = { maxHp: Math.max(60, base.maxHp-20), maxMana: base.maxMana+80, atk: base.atk+2, speed: base.speed-5, manaRegen: base.manaRegen+1.8 };
    else if(id==='warrior') mod = { maxHp: base.maxHp+40, maxMana: base.maxMana, atk: base.atk+4, def: base.def+1, speed: base.speed-5 };
    else if(id==='knight') mod = { maxHp: base.maxHp+80, maxMana: base.maxMana-10, atk: base.atk+2, def: base.def+3, speed: base.speed-20 };
    else if(id==='warden') mod = { maxHp: base.maxHp+140, maxMana: base.maxMana-20, atk: Math.max(1, base.atk-2), def: base.def+5, speed: base.speed-35 };
    const show = {
      'Max HP': mod.maxHp ?? base.maxHp,
      'Max Mana': mod.maxMana ?? base.maxMana,
      'ATK': mod.atk ?? base.atk,
      'DEF': mod.def ?? base.def,
      'Speed': mod.speed ?? base.speed
    };
    return Object.entries(show).map(([k,v])=>`${k}: <b>${Math.round(v)}</b>`).join(' • ');
  }

  function applyTemplate(id){
    const base = {...state.basePlayer};
    let mod = {};
    if(id==='mage'){
      mod = { maxHp: Math.max(60, base.maxHp-20), maxMana: base.maxMana+80, atk: base.atk+2, speed: base.speed-5, manaRegen: base.manaRegen+1.8 };
    }else if(id==='warrior'){
      mod = { maxHp: base.maxHp+40, maxMana: base.maxMana, atk: base.atk+4, def: base.def+1, speed: base.speed-5 };
    }else if(id==='knight'){
      mod = { maxHp: base.maxHp+80, maxMana: base.maxMana-10, atk: base.atk+2, def: base.def+3, speed: base.speed-20 };
    }else if(id==='warden'){
      mod = { maxHp: base.maxHp+140, maxMana: base.maxMana-20, atk: Math.max(1, base.atk-2), def: base.def+5, speed: base.speed-35 };
    }

    for(const k in mod) base[k]=mod[k];
    state.basePlayer = base;
    state.player.hp = base.maxHp;
    state.player.mana = base.maxMana;
    state.player.stam = base.maxStam;
    state.player.class = id;
    state.currentHero = id; // Set current hero
  }

  el.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button[data-id]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    applyTemplate(id);
    el.remove();
    if(typeof onPick==='function'){
      try{ onPick(id); }catch(e){ console.error('charselect onPick error', e); }
    }
  });

  el.addEventListener('click', (ev)=>{
    const vb = ev.target.closest('button[data-view]');
    if(!vb) return;
    const id = vb.getAttribute('data-view');
    const statsEl = document.getElementById(`stats-${id}`);
    if(!statsEl) return;
    if(statsEl.style.display==='none'){
      statsEl.style.display='block';
      statsEl.innerHTML = templateStats(id);
      vb.textContent='Hide Stats';
    }else{
      statsEl.style.display='none';
      vb.textContent='View Stats';
    }
  });

  // Optional: close on ESC
  const onKey = (e)=>{ if(e.key==='Escape'){ try{ el.remove(); }catch{} window.removeEventListener('keydown', onKey); } };
  window.addEventListener('keydown', onKey);

  // Close button (if in-game)
  const closeBtn = el.querySelector('#btnClose');
  if(closeBtn){
    closeBtn.onclick = ()=>{ el.remove(); window.removeEventListener('keydown', onKey); };
  }

  // Ensure overlay removes when state is torn down
  return ()=>{ try{ el.remove(); }catch{} window.removeEventListener('keydown', onKey); };

}
