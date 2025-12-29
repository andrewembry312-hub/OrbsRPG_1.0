export function showCharSelect(state, onPick, inGame=false){
  console.log('showCharSelect: creating overlay');
  const root = document.getElementById('ui-root');
  const el = document.createElement('div');
  el.id = 'charSelectOverlay';
  el.className = 'overlay show';
  try{ el.style.zIndex = '1000'; }catch{}
  el.innerHTML = `
    <div class="panel" style="max-width:760px">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="margin:0">Select Your Hero</h2>
        ${inGame ? '<button id="btnClose" class="secondary" style="padding:8px 12px;">Close</button>' : ''}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;justify-content:center">
        <div class="box" style="width:180px;text-align:center">
          <img src="assets/char/mage.svg" style="width:120px;height:120px"/>
          <div style="font-weight:900;margin-top:6px">Mage</div>
          <div class="small">High mana, ranged power.</div>
          <div class="small" id="stats-mage" style="display:none;margin-top:6px"></div>
          <div style="margin-top:8px;display:flex;gap:8px;justify-content:center"><button data-id="mage">Select</button><button data-view="mage" class="secondary">View Stats</button></div>
        </div>
        <div class="box" style="width:180px;text-align:center">
          <img src="assets/char/warrior.svg" style="width:120px;height:120px"/>
          <div style="font-weight:900;margin-top:6px">Warrior</div>
          <div class="small">Balanced fighter with steady damage.</div>
          <div class="small" id="stats-warrior" style="display:none;margin-top:6px"></div>
          <div style="margin-top:8px;display:flex;gap:8px;justify-content:center"><button data-id="warrior">Select</button><button data-view="warrior" class="secondary">View Stats</button></div>
        </div>
        <div class="box" style="width:180px;text-align:center">
          <img src="assets/char/knight.svg" style="width:120px;height:120px"/>
          <div style="font-weight:900;margin-top:6px">Knight</div>
          <div class="small">Tough defender, good sustain.</div>
          <div class="small" id="stats-knight" style="display:none;margin-top:6px"></div>
          <div style="margin-top:8px;display:flex;gap:8px;justify-content:center"><button data-id="knight">Select</button><button data-view="knight" class="secondary">View Stats</button></div>
        </div>
        <div class="box" style="width:180px;text-align:center">
          <img src="assets/char/tank.svg" style="width:120px;height:120px"/>
          <div style="font-weight:900;margin-top:6px">Tank</div>
          <div class="small">Massive HP and defense.</div>
          <div class="small" id="stats-tank" style="display:none;margin-top:6px"></div>
          <div style="margin-top:8px;display:flex;gap:8px;justify-content:center"><button data-id="tank">Select</button><button data-view="tank" class="secondary">View Stats</button></div>
        </div>
      </div>
      <div style="margin-top:12px;text-align:center" class="small">You can change equipment and skills later from the menu.</div>
    </div>`;

  root.appendChild(el);

  function templateStats(id){
    const base = {...state.basePlayer};
    let mod = {};
    if(id==='mage') mod = { maxHp: Math.max(60, base.maxHp-20), maxMana: base.maxMana+80, atk: base.atk+2, speed: base.speed-5, manaRegen: base.manaRegen+1.8 };
    else if(id==='warrior') mod = { maxHp: base.maxHp+40, maxMana: base.maxMana, atk: base.atk+4, def: base.def+1, speed: base.speed-5 };
    else if(id==='knight') mod = { maxHp: base.maxHp+80, maxMana: base.maxMana-10, atk: base.atk+2, def: base.def+3, speed: base.speed-20 };
    else if(id==='tank') mod = { maxHp: base.maxHp+140, maxMana: base.maxMana-20, atk: Math.max(1, base.atk-2), def: base.def+5, speed: base.speed-35 };
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
    }else if(id==='tank'){
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
