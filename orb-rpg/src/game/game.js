import { clamp, rand, randi, cssVar, saveJson } from "../engine/util.js";
import { INV_SIZE, LOOT_TTL, ARMOR_SLOTS, SLOT_LABEL, DEFAULT_BINDS } from "./constants.js";
import { pickRarity, rarityClass, rarityTier } from "./rarity.js";
import { xpForNext } from "./progression.js";
import { SKILLS, getSkillById, getAbilityById, DOT_REGISTRY, BUFF_REGISTRY } from "./skills.js";
import { initSites, playerHome, getHomeForTeam, getFriendlyFlags, getFlagsForTeam, getNonPlayerFlags, updateCapture, spawnGuardsForSite, enemiesNearSite, findNearestEnemyTeamAtSite } from "./world.js";
import { META_LOADOUTS } from "./loadouts.js";

// Enemy / spawn tuning
const MAX_DEFENDERS_PER_TEAM = 10; // non-guard fighters per team (excludes guards)
const MAX_KNIGHTS_PER_TEAM = 10; // cap knights per team on map
const MAX_ENEMIES = 50; // overall hard cap (tight to avoid runaway spawns)
const SPAWN_ACTIVATE_DIST = 220; // player proximity to activate spawns from a site (unused for main spawns now)
const DEFEND_RADIUS = 80; // how close to home the enemy will defend/patrol
const CHASE_DISTANCE = 160; // how close the player must be for an enemy to chase
const CHASE_FROM_HOME_MAX = 220; // max distance from home an enemy will pursue before returning
const RETURN_THRESHOLD = 260; // if farther than this from home, force return

export async function initGame(state){
  try{ console.log('initGame: starting'); }catch(e){}
  // Reset group and transient collections to avoid carryover from previous runs
  try{
    state.group.members.length = 0;
    state.group.selectedMemberId = null;
    state.group.settings = {};
    // Clear transient entities; sites/terrain reset in initSites
    state.friendlies.length = 0;
    state.enemies.length = 0;
    state.projectiles.length = 0;
    state.loot.length = 0;
    state.creatures.length = 0;
  }catch{}
  initSites(state);
  const hb=playerHome(state);
  state.player.x=hb.x; state.player.y=hb.y;
  const st=currentStats(state);

  // Spawn neutral creatures and unique boss
  spawnCreatures(state);
  spawnBossCreature(state);
  // Ensure starting allies at home base so the player always has a squad
  ensureBaseFriendlies(state, { initial:true });
  // Seed each AI team with a standing force
  seedTeamForces(state, 'teamA', 10);
  seedTeamForces(state, 'teamB', 10);
  seedTeamForces(state, 'teamC', 10);
}

export function currentStats(state){
  const base={...state.basePlayer};
  applySpends(state, base);
  applyAllArmor(state, base);
  for(const p of state.player.passives) if(p?.type==='passive') applyBuffs(base, p.buffs);
  // apply active buffs on player
  try{
    if(state.player.buffs && state.player.buffs.length){
      for(const b of state.player.buffs){
            const meta = BUFF_REGISTRY[b.id];
        if(meta && meta.stats) applyBuffs(base, meta.stats);
      }
    }
  }catch{}
  base.cdr=clamp(base.cdr,0,0.45);
  base.blockBase=clamp(base.blockBase,0,base.blockCap);
  base.critChance=clamp(base.critChance,0,0.75);
  base.critMult=Math.max(1.2, base.critMult);
  // Emperor bonus when player controls all bases
  if(state.emperor){
    base.maxHp += 60;
    base.hpRegen += 1.8;
    base.maxMana += 30;
    base.manaRegen += 1.2;
    base.atk += 6;
    base.cdr = clamp(base.cdr + 0.08, 0, 0.6);
    base.speed = Math.round(base.speed * 1.12);
  }
  return base;
}

function applySpends(state, st){
  const s=state.progression.spends;
  st.maxHp += (s.vit??0)*14;
  st.hpRegen += (s.vit??0)*0.10;
  st.maxMana += (s.int??0)*12;
  st.manaRegen += (s.int??0)*0.18;
  st.cdr += (s.int??0)*0.006;
  st.atk += (s.str??0)*1.1;
  st.critMult += (s.str??0)*0.02;
  st.def += (s.def??0)*1.1;
  st.speed += (s.agi??0)*6;
  st.maxStam += (s.agi??0)*8;
  st.stamRegen += (s.agi??0)*1.2;
}

function applyBuffs(st, buffs){
  for(const [k,v] of Object.entries(buffs)){
    if(k==='cdr') st.cdr+=v;
    else if(k==='blockEff') st.blockBase+=v;
    else if(k==='lifesteal') st.lifesteal=(st.lifesteal??0)+v;
    else if(k==='shieldGain') st.shieldGain=(st.shieldGain??0)+v;
    else st[k]=(st[k]??0)+v;
  }
}

function applyAllArmor(state, st){
  for(const slot of ARMOR_SLOTS){
    const it=state.player.equip[slot];
    if(it?.kind==='armor') applyBuffs(st, it.buffs);
  }
}

function describeBuffs(buffs){
  const parts=[];
  for(const [k,v] of Object.entries(buffs)){
    const sign=v>=0?'+':'';
    if(k==='maxHp') parts.push(`${sign}${Math.round(v)} Max HP`);
    else if(k==='hpRegen') parts.push(`${sign}${v.toFixed(1)} HP Regen`);
    else if(k==='maxMana') parts.push(`${sign}${Math.round(v)} Max Mana`);
    else if(k==='manaRegen') parts.push(`${sign}${v.toFixed(1)} Mana Regen`);
    else if(k==='maxStam') parts.push(`${sign}${Math.round(v)} Max Stam`);
    else if(k==='stamRegen') parts.push(`${sign}${v.toFixed(1)} Stam Regen`);
    else if(k==='atk') parts.push(`${sign}${v.toFixed(1)} ATK`);
    else if(k==='def') parts.push(`${sign}${v.toFixed(1)} DEF`);
    else if(k==='speed') parts.push(`${sign}${Math.round(v)} Speed`);
    else if(k==='critChance') parts.push(`${sign}${Math.round(v*100)}% Crit`);
    else if(k==='critMult') parts.push(`${sign}${v.toFixed(2)} Crit Mult`);
    else if(k==='cdr') parts.push(`${sign}${Math.round(v*100)}% CDR`);
    else if(k==='blockEff') parts.push(`${sign}${Math.round(v*100)}% Block`);
    else if(k==='lifesteal') parts.push(`${sign}${Math.round(v*100)}% Lifesteal`);
    else if(k==='res_fire') parts.push(`${sign}${Math.round(v*100)}% Fire Resist`);
    else if(k==='res_ice') parts.push(`${sign}${Math.round(v*100)}% Ice Resist`);
    else if(k==='res_lightning') parts.push(`${sign}${Math.round(v*100)}% Lightning Resist`);
    else if(k==='res_poison') parts.push(`${sign}${Math.round(v*100)}% Poison Resist`);
    else if(k==='res_bleed') parts.push(`${sign}${Math.round(v*100)}% Bleed Resist`);
    else parts.push(`${k} ${sign}${v}`);
  }
  return parts.join(', ');
}

// Elemental + affix helpers for loot generation
const ELEMENTAL_TYPES = [
  { key:'fire', dotId:'burn' },
  { key:'poison', dotId:'poison' },
  { key:'bleed', dotId:'bleed' },
  { key:'ice', dotId:'freeze' },
  { key:'lightning', dotId:'shock' }
];

const RESIST_KEYS = ['res_fire','res_ice','res_lightning','res_poison','res_bleed'];

function rarityAffixRules(rarityKey){
  switch(rarityKey){
    case 'uncommon': return { statRange:[1,3], statScale:0.55, resRange:[0,0], elemRange:[0,0], elemScale:0 };
    case 'rare': return { statRange:[1,3], statScale:0.75, resRange:[1,1], elemRange:[1,1], elemScale:0.75 };
    case 'epic': return { statRange:[1,4], statScale:0.95, resRange:[1,1], elemRange:[1,1], elemScale:0.95 };
    case 'legend': return { statRange:[1,5], statScale:1.25, resRange:[1,2], elemRange:[1,2], elemScale:1.25 };
    default: return { statRange:[0,0], statScale:0, resRange:[0,0], elemRange:[0,0], elemScale:0 };
  }
}

function rollStatBuff(statScale){
  const pool=[
    {key:'atk', base:3}, {key:'def', base:2.2}, {key:'speed', base:6}, {key:'maxHp', base:18}, {key:'maxMana', base:16},
    {key:'manaRegen', base:0.9}, {key:'hpRegen', base:0.8}, {key:'critChance', base:0.012}, {key:'critMult', base:0.05}, {key:'cdr', base:0.018},
    {key:'lifesteal', base:0.02}, {key:'blockEff', base:0.02}, {key:'maxStam', base:16}, {key:'stamRegen', base:2.4}
  ];
  const pick = pool[randi(0, pool.length-1)];
  const variance = 0.8 + Math.random()*0.4; // 0.8 - 1.2
  const val = pick.base * statScale * variance;
  return { [pick.key]: Number(val.toFixed(pick.key.includes('chance')||pick.key.includes('cdr') ? 3 : 2)) };
}

function rollResistBuff(resScale){
  const key = RESIST_KEYS[randi(0, RESIST_KEYS.length-1)];
  const variance = 0.8 + Math.random()*0.4;
  const base = 0.10; // 10% base resist before scaling
  return { [key]: Number((base * resScale * variance).toFixed(3)) };
}

function mergeBuffSets(...sets){
  const out={};
  for(const s of sets){ if(!s) continue; for(const [k,v] of Object.entries(s)){ out[k]=(out[k]??0)+v; } }
  return out;
}

function rollCount([min,max]){ return min>=max ? min : randi(min, max); }

function buildElementalEffects(rarity){
  const rules = rarityAffixRules(rarity.key);
  const count = rollCount(rules.elemRange);
  const effects=[];
  for(let i=0;i<count;i++){
    const e = ELEMENTAL_TYPES[randi(0, ELEMENTAL_TYPES.length-1)];
    const chanceBase = 0.20 + 0.08*rules.elemScale;
    const chance = chanceBase + Math.random()*0.08;
    const power = (0.8 + Math.random()*0.4) * (rules.elemScale || 1);
    effects.push({ type:e.key, dotId:e.dotId, chance: Number(chance.toFixed(3)), powerMult: Number(power.toFixed(3)) });
  }
  return effects;
}

function makePotion(type, rarity){
  const t=rarityTier(rarity);
  if(type==='hp'){
    const pct=0.28+t*0.05;
    return {id:Math.random().toString(16).slice(2),kind:'potion',type:'hp',rarity,
      name:`${rarity.name} Health Potion`,
      desc:`Restores <b>${Math.round(pct*100)}%</b> of Max HP.`,
      data:{pct}
    };
  }
  const pct=0.34+t*0.05;
  return {id:Math.random().toString(16).slice(2),kind:'potion',type:'mana',rarity,
    name:`${rarity.name} Mana Potion`,
    desc:`Restores <b>${Math.round(pct*100)}%</b> of Max Mana.`,
    data:{pct}
  };
}

function scaled(v,t,m=1){ return v + t*m; }

function makeArmor(slot, rarity){
  const t=rarityTier(rarity);
  const POOLS = {
    helm: [
      {name:'Mind Helm', buffs:{maxMana: scaled(8,t,5), manaRegen: scaled(0.4,t,0.2)}},
      {name:'Guard Helm', buffs:{def: scaled(2,t,1.2), blockEff: scaled(0.03,t,0.02)}},
      {name:'Hunter Hood', buffs:{critChance: scaled(0.02,t,0.012), speed: scaled(4,t,2)}},
    ],
    shoulders: [
      {name:'Ward Pauldrons', buffs:{shieldGain: scaled(4,t,2), def: scaled(2,t,1)}},
      {name:'Swift Shoulders', buffs:{speed: scaled(6,t,3), maxStam: scaled(6,t,5)}},
      {name:'Rage Spikes', buffs:{atk: scaled(1.4,t,1.0), critMult: scaled(0.04,t,0.02)}},
    ],
    chest: [
      {name:'Iron Plate', buffs:{def: scaled(5,t,2.2), maxHp: scaled(10,t,7), speed: -scaled(4,t,2)}},
      {name:'Mage Robe', buffs:{maxMana: scaled(14,t,7), cdr: scaled(0.03,t,0.02)}},
      {name:'Berserker Harness', buffs:{atk: scaled(3,t,2), lifesteal: scaled(0.02,t,0.01), def: -scaled(0.6,t,0.3)}},
    ],
    hands: [
      {name:'Quick Gloves', buffs:{speed: scaled(4,t,2), critChance: scaled(0.01,t,0.01)}},
      {name:'Heavy Gauntlets', buffs:{atk: scaled(1.8,t,1.2), def: scaled(1,t,0.8)}},
      {name:'Arcane Wraps', buffs:{manaRegen: scaled(0.8,t,0.3), maxMana: scaled(6,t,5)}},
    ],
    belt: [
      {name:'Stamina Belt', buffs:{maxStam: scaled(10,t,8), stamRegen: scaled(1.2,t,0.6)}},
      {name:'Ward Sash', buffs:{cdr: scaled(0.02,t,0.02), manaRegen: scaled(0.4,t,0.2)}},
      {name:'Guardian Belt', buffs:{def: scaled(2,t,1.3), maxHp: scaled(8,t,5)}},
    ],
    legs: [
      {name:'Legguards', buffs:{def: scaled(3,t,1.6), maxHp: scaled(8,t,6)}},
      {name:'Strider Pants', buffs:{speed: scaled(8,t,4), maxStam: scaled(8,t,6)}},
      {name:'Battlemage Legs', buffs:{maxMana: scaled(10,t,6), cdr: scaled(0.02,t,0.02)}},
    ],
    feet: [
      {name:'Sprint Boots', buffs:{speed: scaled(10,t,5), stamRegen: scaled(1.6,t,0.8)}},
      {name:'Stone Boots', buffs:{def: scaled(2,t,1.4), blockEff: scaled(0.02,t,0.02), speed: -scaled(2,t,1)}},
      {name:'Lucky Boots', buffs:{critChance: scaled(0.02,t,0.012), maxStam: scaled(6,t,5)}},
    ],
    neck: [
      {name:'Charm of Focus', buffs:{maxMana: scaled(10,t,6), manaRegen: scaled(0.8,t,0.4)}},
      {name:'Charm of Vitality', buffs:{maxHp: scaled(18,t,8), hpRegen: scaled(0.6,t,0.3)}},
      {name:'Charm of Fortune', buffs:{critChance: scaled(0.02,t,0.012), goldFind: scaled(0.05,t,0.03)}},
    ],
    accessory1: [
      {name:'Signet of Power', buffs:{atk: scaled(2.2,t,1.4), critChance: scaled(0.012,t,0.008)}},
      {name:'Band of Ward', buffs:{def: scaled(2.0,t,1.1), blockEff: scaled(0.02,t,0.012)}},
      {name:'Loop of Haste', buffs:{speed: scaled(6,t,3), cdr: scaled(0.012,t,0.01)}},
    ],
    accessory2: [
      {name:'Bracelet of Flow', buffs:{manaRegen: scaled(0.9,t,0.4), cdr: scaled(0.015,t,0.01)}},
      {name:'Bracelet of Vigor', buffs:{maxStam: scaled(14,t,9), stamRegen: scaled(2.0,t,1.2)}},
      {name:'Bracelet of Leech', buffs:{lifesteal: scaled(0.02,t,0.01), atk: scaled(1.4,t,0.9)}},
    ],
  };
  const pool = POOLS[slot] || POOLS.helm; // fallback to prevent undefined
  const pick = pool[randi(0, pool.length-1)];
  const rules = rarityAffixRules(rarity.key);
  let extraBuffs={};
  const statCount = rollCount(rules.statRange);
  for(let i=0;i<statCount;i++) extraBuffs = mergeBuffSets(extraBuffs, rollStatBuff(rules.statScale));
  let resistBuffs={};
  const resCount = rollCount(rules.resRange);
  for(let i=0;i<resCount;i++) resistBuffs = mergeBuffSets(resistBuffs, rollResistBuff(Math.max(0.7, rules.statScale||0.0)));
  const mergedBuffs = mergeBuffSets(pick.buffs, extraBuffs, resistBuffs);
  return {
    id:Math.random().toString(16).slice(2),
    kind:'armor',
    slot,
    rarity,
    name:`${rarity.name} ${SLOT_LABEL[slot]}: ${pick.name}`,
    desc:`${SLOT_LABEL[slot]} armor. Buffs: ${describeBuffs(mergedBuffs)}`,
    buffs:mergedBuffs
  };
}

function describeElementals(effects){
  if(!effects || !effects.length) return '';
  return effects.map(e=> `${Math.round(e.chance*100)}% on-hit ${e.type} (${e.dotId})`).join('; ');
}

function makeWeapon(kind, rarity){
  const t = rarityTier(rarity);
  const templates={
    'Destruction Staff': { buffs:{atk:3+t*1.6, maxMana:14+t*6, manaRegen:0.8+t*0.45} },
    'Healing Staff': { buffs:{maxMana:16+t*7, manaRegen:1.1+t*0.55, cdr:0.04+t*0.008} },
    'Axe': { buffs:{atk:4+t*3, critChance:0.02+t*0.01} },
    'Sword': { buffs:{atk:3+t*2.4, speed:4+t*2} },
    'Dagger': { buffs:{atk:2.4+t*1.6, speed:6+t*2.2, critChance:0.03+t*0.012} },
    'Greatsword': { buffs:{atk:5+t*3.5, def:2+t*1.4, speed:-4} }
  };
  const tpl=templates[kind] || templates['Sword'];
  const rules = rarityAffixRules(rarity.key);
  let extraBuffs={};
  const statCount = rollCount(rules.statRange);
  for(let i=0;i<statCount;i++) extraBuffs = mergeBuffSets(extraBuffs, rollStatBuff(rules.statScale));
  const buffs = mergeBuffSets(tpl.buffs, extraBuffs);
  const elementalEffects = buildElementalEffects(rarity);
  const elemText = elementalEffects.length ? ` Elemental: ${describeElementals(elementalEffects)}` : '';
  return {
    id:Math.random().toString(16).slice(2),
    kind:'weapon', slot:'weapon',
    rarity,
    weaponType: kind,
    name:`${rarity.name} ${kind}`,
    desc:`${kind} weapon. Buffs: ${describeBuffs(buffs)}${elemText}`,
    buffs,
    elementalEffects
  };
}

function makeLootDrop(x,y,item,gold=0){
  return {x,y,r:12,item,gold,timeLeft:LOOT_TTL};
}

function spawnLootAt(state, x,y){
  const rarity=pickRarity();
  const roll=Math.random();
  const gold=randi(3,12); // random gold drop
  if(roll<0.40){
    const armorSlots = ARMOR_SLOTS.filter(s=>s!=='weapon');
    const slot=armorSlots[randi(0,armorSlots.length-1)];
    return makeLootDrop(x,y,makeArmor(slot,rarity),gold);
  }
  if(roll<0.65){
    const weaponKinds=['Destruction Staff','Healing Staff','Axe','Sword','Dagger','Greatsword'];
    const kind=weaponKinds[randi(0,weaponKinds.length-1)];
    return makeLootDrop(x,y,makeWeapon(kind, rarity),gold);
  }
  if(roll<0.82) return makeLootDrop(x,y,makePotion('hp',rarity),gold);
  return makeLootDrop(x,y,makePotion('mana',rarity),gold);
}

function addToInventory(state, item, gold=0){
  // Add gold if included
  if(gold > 0){
    state.player.gold += gold;
    state.ui.renderInventory?.();
  }
  // Potions stack: check if same potion type already exists
  if(item.kind === 'potion'){
    const existing = state.inventory.find(i => i.kind === 'potion' && i.type === item.type && i.rarity.key === item.rarity.key);
    if(existing){
      existing.count = (existing.count || 1) + 1;
      const goldMsg = gold > 0 ? ` +${gold} gold` : '';
      const color = item.rarity?.color || '#fff';
      state.ui.toast(`<span style="color:${color}"><b>${item.name}</b></span> added to inventory (x${existing.count})${goldMsg}`);
      return;
    }
  }
  // Unlimited inventory: always accept the item
  item.count = item.count || 1;
  state.inventory.push(item);
  const goldMsg = gold > 0 ? ` +${gold} gold` : '';
  const color = item.rarity?.color || '#fff';
  state.ui.toast(`<span style="color:${color}"><b>${item.name}</b></span> added to inventory${goldMsg}`);
}

function pickupNearestLoot(state){
  let best=-1, bestD=Infinity;
  for(let i=0;i<state.loot.length;i++){
    const l=state.loot[i];
    const d=Math.hypot(l.x-state.player.x,l.y-state.player.y);
    if(d<bestD){bestD=d; best=i;}
  }
  if(best===-1 || bestD>72){ state.ui.toast('No loot nearby.'); return; }
  const l=state.loot[best];
  state.loot.splice(best,1);
  addToInventory(state, l.item, l.gold || 0);
  state.ui.renderInventory?.();
}

function dropItemToWorld(state, item){
  state.loot.push(makeLootDrop(state.player.x+rand(-26,26), state.player.y+rand(-26,26), item));
}

function isDown(state, action){
  return state.input.keysDown.has(state.binds[action]);
}

function getMoveVector(state){
  let x=0,y=0;
  if(isDown(state,'moveUp')) y-=1;
  if(isDown(state,'moveDown')) y+=1;
  if(isDown(state,'moveLeft')) x-=1;
  if(isDown(state,'moveRight')) x+=1;
  return {x,y};
}

function siteAllowsPassage(site, entity, state){
  // No walls - allow all passage
  return true;
}

function rollCrit(st){ return Math.random()<st.critChance; }

function applyWeaponElementals(state, target){
  const weapon = state?.player?.equip?.weapon;
  if(!weapon || !weapon.elementalEffects || !weapon.elementalEffects.length) return;
  for(const eff of weapon.elementalEffects){
    if(Math.random() <= (eff.chance || 0)){
      applyDotTo(target, eff.dotId, { powerMult: eff.powerMult || 1 });
    }
  }
}

function applyDamageToEnemy(e,dmg,st,state,fromPlayer=false){
  const crit=rollCrit(st||{critChance:0});
  const final=crit?(dmg*(st?.critMult||1.5)):dmg;
  e.hp-=final;
  // spawn floating damage number above target only when player deals damage
  if(fromPlayer){
    try{
      state.effects.damageNums.push({ x:e.x, y:e.y - (e.r||12) - 8, vy:-22, amt:Math.round(final), life:0.9, crit });
    }catch(err){}
    applyWeaponElementals(state, e);
  }
  return {crit,dealt:final};
}

function getWorldMouse(state){
  const m = state.input.mouse;
  const cam = state.camera || { x:0, y:0, zoom:1 };
  const wx = (m.x - state.engine.canvas.width/2) / (cam.zoom||1) + cam.x;
  const wy = (m.y - state.engine.canvas.height/2) / (cam.zoom||1) + cam.y;
  return { x: wx, y: wy };
}

function lifestealFrom(state, dealt, st){
  const ls=st.lifesteal??0;
  if(ls<=0 || dealt<=0) return;
  const heal=dealt*ls;
  state.player.hp=clamp(state.player.hp+heal,0,st.maxHp);
}

function applyDamageToPlayer(state, raw, st){
  let dmg=raw;
  const blocking = state.input.mouse.rDown && state.player.stam>0 && state.player.mana>0;
  if(blocking) dmg*=(1-st.blockBase);
  dmg = dmg*(100/(100+st.def));
  let remain=dmg;
  if(state.player.shield>0){
    const used=Math.min(state.player.shield,remain);
    state.player.shield-=used;
    remain-=used;
  }
  if(remain>0) state.player.hp-=remain;
}

// Generic shield-first damage for any entity (player, friendly, enemy, creature)
function applyShieldedDamage(state, entity, amount){
  if(!entity || amount<=0) return;
  // respect invulnerability buffs
  try{
    if(entity.buffs && entity.buffs.some(b=>BUFF_REGISTRY?.[b.id]?.stats?.invulnerable)) return;
  }catch{}
  let remain = amount;
  if(entity.shield>0){
    const used = Math.min(entity.shield, remain);
    entity.shield -= used;
    remain -= used;
  }
  if(remain<=0) return;
  const maxHp = entity===state.player ? currentStats(state).maxHp : entity.maxHp || 9999;
  entity.hp = clamp((entity.hp||0) - remain, 0, maxHp);
}

const ELEMENT_COLORS = { fire:'#ff9a3c', shock:'#6ec0ff', poison:'#5fd86b', ice:'#c4e6ff', arcane:'#c16bff' };
const FRIENDLY_DMG_COLOR = '#9b7bff';
const ENEMY_DMG_COLOR = '#e55959';
const HEAL_COLOR = '#ffd760';
const SHIELD_COLOR = '#ffb347';

function inferElementFromProjectileOpts(opts){
  if(!opts) return null;
  if(opts.element) return opts.element;
  if(opts.dotId === 'burn') return 'fire';
  if(opts.dotId === 'poison') return 'poison';
  if(opts.buffId === 'silence') return 'arcane';
  return null;
}

function colorForProjectile(opts, fromPlayer){
  const el = inferElementFromProjectileOpts(opts);
  if(el && ELEMENT_COLORS[el]) return ELEMENT_COLORS[el];
  if(opts && opts.kind === 'heal') return HEAL_COLOR;
  if(opts && opts.shield) return SHIELD_COLOR;
  return fromPlayer ? FRIENDLY_DMG_COLOR : ENEMY_DMG_COLOR;
}

const degToRad = (d)=>d*Math.PI/180;
const MELEE_ARC_CAPS = {
  common: degToRad(120),
  uncommon: degToRad(160),
  rare: degToRad(210),
  epic: degToRad(270),
  legend: Math.PI*2,
  legendary: Math.PI*2
};

function normalizedRarityKey(k){
  if(k==='legendary') return 'legend';
  return k || 'common';
}

function weaponRarityKey(state){
  const key = state?.player?.equip?.weapon?.rarity?.key;
  return normalizedRarityKey(key);
}

function meleeArcCap(state){
  const key = weaponRarityKey(state);
  return MELEE_ARC_CAPS[key] || MELEE_ARC_CAPS.common;
}

function randomMeleeArc(baseArc, state){
  const cap = meleeArcCap(state);
  const minArc = Math.min(cap, baseArc*0.9);
  const span = Math.max(0, cap - minArc);
  return minArc + Math.random()*span;
}

function meleeRangeForWeapon(baseRange, state){
  const weapon = state?.player?.equip?.weapon;
  const tier = rarityTier(weapon?.rarity || { key: weaponRarityKey(state) });
  const scale = 1 + tier*0.08; // modest growth per rarity tier
  const jitter = 0.94 + Math.random()*0.12;
  return baseRange * scale * jitter;
}

function weaponElementForColor(weapon){
  if(!weapon?.elementalEffects || !weapon.elementalEffects.length) return null;
  const t = weapon.elementalEffects[0].type;
  if(t==='lightning') return 'shock';
  if(t==='bleed') return null; // bleed visuals fall back to default damage color
  return t;
}

function meleeSlashColor(base, state){
  // honor precomputed color if supplied (e.g., enemy/friendly attacks)
  if(base.color) return base.color;
  const weapon = base.weapon || state?.player?.equip?.weapon;
  const element = weaponElementForColor(weapon);
  const col = colorForProjectile({ element, dotId: base.dotId, kind: base.kind }, true);
  // tint by team if provided
  if(!col && base.team){
    if(base.team === 'enemy') return cssVar('--enemy') || FRIENDLY_DMG_COLOR;
    if(base.team === 'player') return cssVar('--player') || FRIENDLY_DMG_COLOR;
  }
  return col || FRIENDLY_DMG_COLOR;
}

function pushSlashEffect(state, base){
  const arc = randomMeleeArc(base.arc, state);
  const range = meleeRangeForWeapon(base.range, state);
  const color = meleeSlashColor(base, state);
  const slash = { ...base, arc, range, color, x: base.x, y: base.y };
  state.effects.slashes.push(slash);
  return slash;
}

function spawnProjectile(state, x,y,angle,speed,r,dmg,pierce=0, fromPlayer=true, opts={}){
  const p = {x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r,dmg,pierce,life:1.35, fromPlayer};
  if(opts.dotId) p.dotId = opts.dotId;
  if(opts.team) p.team = opts.team;
  const col = colorForProjectile(opts, fromPlayer);
  if(col) p.color = col;
  if(opts.element) p.element = opts.element;
  if(opts.maxRange){
    p.maxRange = opts.maxRange;
    p.startX = x;
    p.startY = y;
  }
  state.projectiles.push(p);
}

function awardXP(state, amount){
  state.progression.xp += amount;
  let leveled=false;
  while(state.progression.xp >= xpForNext(state.progression.level)){
    state.progression.xp -= xpForNext(state.progression.level);
    state.progression.level += 1;
    state.progression.statPoints += 1;
    leveled=true;
  }
  if(leveled){
    state.ui.toast(`<b>Level up!</b> Level <b>${state.progression.level}</b>. (+2 stat points)`);
    saveJson('orb_rpg_mod_prog', state.progression);
  }
}

function killEnemy(state, index, fromPlayer=true){
  const e=state.enemies[index];
  // Close unit inspection if this was the selected unit
  if(state.selectedUnit && state.selectedUnit.unit===e){
    try{ state.ui.hideUnitPanel?.(); }catch{}
  }
  if(fromPlayer) awardXP(state, e.xp);
  // Dungeon enemies do not respawn; boss guarantees legendary drop
  if(e.dungeonId){
    if(e.boss){
      // create a guaranteed legendary for the dungeon boss
      const item = makeLegendaryItem(state);
      // if we saved a world position prior to entering, drop loot there so it's pickup-able in the main world
      if(state._savedWorld){
        const sx = state._savedWorld.px || state.player.x; const sy = state._savedWorld.py || state.player.y;
        state.loot.push(makeLootDrop(sx, sy, item));
        state.ui.toast(`<b>Dungeon Boss</b> dropped a Legendary at your return location.`);
      } else {
        // fallback: add to inventory directly
        addToInventory(state, item);
        state.ui.toast(`<b>Dungeon Boss</b> added a Legendary to your inventory.`);
      }
    } else {
      // small chance for minor loot still
      if(Math.random()<0.55) state.loot.push(spawnLootAt(state, e.x, e.y));
      else state.player.gold += randi(1,3);
    }
    // no respawn for dungeon mobs
    state.enemies.splice(index,1);
    // if boss died, exit dungeon
    if(e.boss && e.dungeonId) exitDungeon(state);
    return;
  }
  if(Math.random()<0.85) state.loot.push(spawnLootAt(state, e.x, e.y));
  else state.player.gold += randi(1,4);
  // If this was a guard, schedule a guard respawn for its home site after 30s
  if(e.guard && e.homeSiteId){
    const site = state.sites.find(s=>s.id===e.homeSiteId);
    if(site) site.guardRespawns.push(30.0);
  } else {
    // enqueue a delayed respawn for fighters/knights at nearest owned site to where they died
    state.enemyRespawns.push({ timeLeft: rand(5,9), team: e.team, x: e.x, y: e.y });
  }
  state.enemies.splice(index,1);
}

function enemyTemplate(t){
  return { speed:58+t*0.20, maxHp:26+t*0.35, contactDmg:10+t*0.10, xp:8+t*0.06 };
}

export function applyClassToUnit(unit, cls){
  const base = { maxHp: unit.maxHp||50, speed: unit.speed||90, contactDmg: unit.contactDmg||8 };
  let f = { hp:1.0, spd:1.0, dmg:1.0 };
  if(cls==='mage') f = { hp:0.9, spd:1.06, dmg:0.95 };
  else if(cls==='warrior') f = { hp:1.15, spd:1.0, dmg:1.10 };
  else if(cls==='knight') f = { hp:1.45, spd:0.86, dmg:1.0 };
  else if(cls==='tank') f = { hp:1.85, spd:0.72, dmg:0.85 };
  unit.maxHp = Math.round(base.maxHp * f.hp);
  unit.hp = unit.maxHp;
  unit.speed = Math.round(base.speed * f.spd);
  unit.contactDmg = Math.round((base.contactDmg||unit.dmg||10) * f.dmg);
  // scale by level if present
  if(unit.level && unit.level>1){
    const L = unit.level;
    const hpMult = 1 + (L-1)*0.12;
    const dmgMult = 1 + (L-1)*0.10;
    unit.maxHp = Math.round(unit.maxHp * hpMult);
    unit.hp = unit.maxHp;
    unit.contactDmg = Math.round(unit.contactDmg * dmgMult);
  }
}

const COMMON_RARITY = { key:'common', tier: 1, name: 'Common', color: '#c8c8c8' };
const UNCOMMON_RARITY = { key:'uncommon', tier: 2, name: 'Uncommon', color: '#8fd' };
const RARE_RARITY = { key:'rare', tier: 3, name: 'Rare', color: '#9cf' };
const EPIC_RARITY = { key:'epic', tier: 4, name: 'Epic', color: '#c9f' };
const LEGENDARY_RARITY = { key:'legendary', tier: 5, name: 'Legendary', color: '#f9c' };

function rarityMult(r){
  const t = r?.tier || 1;
  return 1 + (t-1)*0.35;
}

function makeArmorItem(slot, rarity, buffs, name){
  return { kind:'armor', slot, rarity, name: name || `${rarity.name} ${slot.charAt(0).toUpperCase()+slot.slice(1)}`, desc:`${rarity.name} ${slot}`, buffs };
}

function roleArmorSet(role, rarity){
  const m = rarityMult(rarity);
  if(role==='mage'){
    return {
      helm: makeArmorItem('helm', rarity, { maxMana: Math.round(10*m), manaRegen: +(0.6*m).toFixed(2) }),
      shoulders: makeArmorItem('shoulders', rarity, { maxMana: Math.round(8*m), cdr: +(0.02*m).toFixed(2) }),
      chest: makeArmorItem('chest', rarity, { maxHp: Math.round(14*m), def: Math.round(3*m) }),
      hands: makeArmorItem('hands', rarity, { atk: Math.round(3*m), manaRegen: +(0.4*m).toFixed(2) }),
      belt: makeArmorItem('belt', rarity, { maxMana: Math.round(6*m) }),
      legs: makeArmorItem('legs', rarity, { maxHp: Math.round(10*m), def: Math.round(2*m) }),
      feet: makeArmorItem('feet', rarity, { speed: Math.round(6*m), def: Math.round(1*m) }),
      neck: makeArmorItem('neck', rarity, { maxMana: Math.round(10*m) }),
      accessory1: makeArmorItem('accessory1', rarity, { maxMana: Math.round(8*m) }),
      accessory2: makeArmorItem('accessory2', rarity, { manaRegen: +(0.5*m).toFixed(2) }),
    };
  }
  if(role==='tank'){
    return {
      helm: makeArmorItem('helm', rarity, { maxHp: Math.round(18*m), def: Math.round(4*m) }),
      shoulders: makeArmorItem('shoulders', rarity, { maxHp: Math.round(14*m), def: Math.round(3*m) }),
      chest: makeArmorItem('chest', rarity, { maxHp: Math.round(26*m), def: Math.round(6*m) }),
      hands: makeArmorItem('hands', rarity, { def: Math.round(3*m) }),
      belt: makeArmorItem('belt', rarity, { maxHp: Math.round(12*m), def: Math.round(2*m) }),
      legs: makeArmorItem('legs', rarity, { maxHp: Math.round(18*m), def: Math.round(3*m) }),
      feet: makeArmorItem('feet', rarity, { def: Math.round(2*m) }),
      neck: makeArmorItem('neck', rarity, { maxHp: Math.round(12*m) }),
      accessory1: makeArmorItem('accessory1', rarity, { def: Math.round(3*m) }),
      accessory2: makeArmorItem('accessory2', rarity, { shieldCap: Math.round(40*m) }),
    };
  }
  // warrior/knight => dps/brace
  return {
    helm: makeArmorItem('helm', rarity, { maxHp: Math.round(10*m), critChance: +(0.03*m).toFixed(2) }),
    shoulders: makeArmorItem('shoulders', rarity, { atk: Math.round(3*m) }),
    chest: makeArmorItem('chest', rarity, { maxHp: Math.round(16*m), def: Math.round(3*m) }),
    hands: makeArmorItem('hands', rarity, { atk: Math.round(4*m) }),
    belt: makeArmorItem('belt', rarity, { maxHp: Math.round(8*m) }),
    legs: makeArmorItem('legs', rarity, { maxHp: Math.round(12*m), def: Math.round(2*m) }),
    feet: makeArmorItem('feet', rarity, { speed: Math.round(6*m) }),
    neck: makeArmorItem('neck', rarity, { maxHp: Math.round(8*m), maxMana: Math.round(6*m) }),
    accessory1: makeArmorItem('accessory1', rarity, { critChance: +(0.02*m).toFixed(2), critMult: +(0.05*m).toFixed(2) }),
    accessory2: makeArmorItem('accessory2', rarity, { atk: Math.round(3*m) }),
  };
}

function assignNpcEquipment(unit, role){
  const rarity = unit.level>=13 ? LEGENDARY_RARITY : unit.level>=10 ? EPIC_RARITY : unit.level>=7 ? RARE_RARITY : unit.level>=4 ? UNCOMMON_RARITY : COMMON_RARITY;
  unit.equipment = unit.equipment || {};
  // weapon from class loadout
  const loadout = CLASS_LOADOUTS[role] || CLASS_LOADOUTS.warrior;
  unit.equipment.weapon = structuredClone(loadout.weapon);
  // fill armor
  const set = roleArmorSet(role, rarity);
  for(const [slot,item] of Object.entries(set)) unit.equipment[slot] = item;
  unit._rarityTier = rarity.tier;
}

const CLASS_LOADOUTS = META_LOADOUTS; // Use the comprehensive loadouts from loadouts.js

const ABILITY_META = {
  arc_bolt: { range: 280, cost:10, cd:3.5, dmg:12, type:'projectile', speed:420, pierce:0, element:'shock', role:{mage:1.0,dps:0.6} },
  piercing_lance: { range: 320, cost:16, cd:6.0, dmg:16, type:'projectile', speed:540, pierce:2, element:'arcane', role:{mage:1.0,dps:0.8} },
  chain_light: { range: 260, cost:18, cd:5.5, dmg:10, type:'projectile', speed:420, pierce:1, element:'shock', role:{mage:0.9,dps:0.7} },
  slash: { range: 70, cost:4, cd:1.0, dmg:7, type:'melee', arc:1.1 },
  cleave: { range: 90, cost:10, cd:3.2, dmg:14, type:'melee', arc:1.5 },
  heal_burst: { range: 160, cost:18, cd:7.5, type:'support', kind:'heal', role:{mage:1.0,tank:0.7,dps:0.6} },
  ward_barrier: { range: 160, cost:22, cd:10.0, type:'support', kind:'shield', role:{mage:1.0,tank:1.0,dps:0.6} },
  cleanse_wave: { range: 140, cost:14, cd:9.0, type:'support', kind:'heal', role:{mage:0.9,tank:0.8,dps:0.6} },
  renewal_field: { range: 180, cost:20, cd:12.0, type:'support', kind:'heal', role:{mage:1.0,tank:0.7,dps:0.6} },
  beacon_of_light: { range: 200, cost:24, cd:11.0, type:'support', kind:'heal', role:{mage:1.0,tank:0.7,dps:0.6} },
  warcry: { range: 120, cost:12, cd:8.0, type:'support', kind:'shield', role:{mage:0.7,tank:1.0,dps:0.8} },
  mage_divine_touch: { range: 220, cost:16, cd:4.5, type:'support', kind:'heal', role:{mage:1.2,tank:0.8,dps:0.6} },
  mage_sacred_ground: { range: 200, cost:22, cd:12.0, type:'projectile', dmg:18, element:'fire', role:{mage:1.0,dps:0.8} },
  mage_radiant_aura: { range: 170, cost:18, cd:8.0, type:'support', kind:'shield', role:{mage:1.0,tank:0.8,dps:0.6} },
  mage_arcane_missiles: { range: 240, cost:14, cd:5.5, dmg:12, type:'projectile', speed:420, pierce:0, element:'arcane', role:{mage:1.0,dps:0.7} },
  knight_shield_wall: { range: 170, cost:16, cd:9.0, type:'support', kind:'shield', role:{mage:0.7,tank:1.2,dps:0.8} },
  knight_rally: { range: 170, cost:12, cd:10.0, type:'support', kind:'heal', role:{mage:0.8,tank:1.1,dps:0.8} },
  knight_taunt: { range: 140, cost:10, cd:8.0, type:'support', kind:'shield', role:{mage:0.6,tank:1.2,dps:0.8} },
  warrior_fortitude: { range: 150, cost:15, cd:8.0, type:'support', kind:'shield', role:{mage:0.6,tank:1.0,dps:1.0} },
  tank_iron_skin: { range: 120, cost:14, cd:10.0, type:'support', kind:'shield', role:{mage:0.5,tank:1.2,dps:0.6} },
  tank_bodyguard: { range: 180, cost:16, cd:11.0, type:'support', kind:'shield', role:{mage:0.7,tank:1.2,dps:0.7} },
  tank_anchor: { range: 150, cost:10, cd:9.0, type:'support', kind:'shield', role:{mage:0.6,tank:1.2,dps:0.7} },
  tank_seismic_wave: { range: 260, cost:13, cd:7.5, dmg:18, type:'projectile', speed:400, pierce:0, element:'shock', role:{mage:0.7,tank:1.0,dps:0.9} },
  knight_justice_strike: { range: 95, cost:8, cd:3.0, dmg:18, type:'melee', arc:1.0, role:{mage:0.5,tank:1.0,dps:1.0} },
  warrior_cleave: { range: 96, cost:9, cd:4.2, dmg:20, type:'melee', arc:1.5, role:{mage:0.6,tank:0.9,dps:1.1} },
  warrior_life_leech: { range: 82, cost:8, cd:4.0, dmg:16, type:'melee', arc:1.1, role:{mage:0.6,tank:0.9,dps:1.1} }
};

function npcHealPulse(state, cx, cy, radius, amount){
  const st = currentStats(state);
  const healOne = (ent, mult=1)=>{
    if(!ent) return;
    const maxHp = ent===state.player ? st.maxHp : ent.maxHp || st.maxHp;
    ent.hp = clamp((ent.hp||0) + amount*mult, 0, maxHp);
  };
  healOne(state.player, 1);
  for(const f of state.friendlies){ if(f.respawnT>0) continue; const d=Math.hypot(f.x-cx,f.y-cy); if(d<=radius) healOne(f, 0.9); }
  
  // Visual flash for heal cast
  state.effects.flashes.push({ x: cx, y: cy, r: radius, life: 0.5, color: '#ffd760' });
}

function npcShieldPulse(state, caster, cx, cy, radius, amount, selfBoost=1){
  // Visual flash for shield cast
  const isEnemy = state.enemies.includes(caster);
  const flashColor = isEnemy ? '#6ec0ff' : '#ffb347';
  state.effects.flashes.push({ x: cx, y: cy, r: radius, life: 0.5, color: flashColor });
  
  const applyShield = (ent, mult=1)=>{
    if(!ent) return;
    const cap = ent.shieldCap || ent.maxShield || (ent===state.player ? 420 : 320);
    ent.shield = clamp((ent.shield||0) + amount*mult, 0, cap);
  };
  applyShield(caster, selfBoost);
  applyShield(state.player, 1);
  for(const f of state.friendlies){ if(f.respawnT>0) continue; const d=Math.hypot(f.x-cx,f.y-cy); if(d<=radius) applyShield(f, 0.6); }
}

function npcDirectHeal(state, target, amount){
  if(!target) return;
  const st = currentStats(state);
  const maxHp = target===state.player ? st.maxHp : target.maxHp || st.maxHp;
  target.hp = clamp((target.hp||0) + amount, 0, maxHp);
}

function npcCastSupportAbility(state, u, id, target){
  switch(id){
    case 'heal_burst':{
      const amt = 22 + (u.maxHp||90)*0.12;
      npcHealPulse(state, u.x, u.y, 150, amt);
      return true;
    }
    case 'ward_barrier':{
      const shield = 32 + (u.def||8)*1.0;
      npcShieldPulse(state, u, u.x, u.y, 170, shield);
      return true;
    }
    case 'cleanse_wave':{
      const heal = 14 + (u.maxHp||90)*0.06;
      const shield = 20 + (u.def||6)*0.9;
      npcHealPulse(state, u.x, u.y, 150, heal);
      npcShieldPulse(state, u, u.x, u.y, 150, shield);
      return true;
    }
    case 'renewal_field':{
      const amt = 4 + (u.maxHp||90)*0.01;
      state.effects.heals.push({t:5.0,tick:0.8,tl:0.8,amt, beacon:{x:u.x,y:u.y,r:150}, targets:[state.player, ...state.friendlies.filter(f=>f.respawnT<=0)]});
      return true;
    }
    case 'beacon_of_light':{
      const amt = 6 + (u.maxHp||90)*0.012;
      state.effects.heals.push({t:6.0,tick:1.0,tl:1.0,amt, beacon:{x:u.x,y:u.y,r:170}, targets:[state.player, ...state.friendlies.filter(f=>f.respawnT<=0)]});
      return true;
    }
    case 'mage_divine_touch':{
      const tgt = target || state.player;
      npcDirectHeal(state, tgt, 26 + (u.maxHp||90)*0.18);
      return true;
    }
    case 'mage_radiant_aura':{
      const shield = 26 + (u.def||10)*1.0;
      npcShieldPulse(state, u, u.x, u.y, 170, shield);
      return true;
    }
    case 'warcry':{
      const shield = 18 + (u.def||6)*0.8;
      npcShieldPulse(state, u, u.x, u.y, 140, shield);
      return true;
    }
    case 'knight_shield_wall':{
      const shield = 34 + (u.def||9)*1.1;
      npcShieldPulse(state, u, u.x, u.y, 180, shield);
      npcHealPulse(state, u.x, u.y, 180, 10 + (u.maxHp||90)*0.04);
      return true;
    }
    case 'knight_rally':{
      npcHealPulse(state, u.x, u.y, 180, 12 + (u.maxHp||90)*0.03);
      npcShieldPulse(state, u, u.x, u.y, 180, 18 + (u.def||8)*0.8);
      return true;
    }
    case 'knight_taunt':{
      npcShieldPulse(state, u, u.x, u.y, 150, 16 + (u.def||8)*0.7);
      return true;
    }
    case 'warrior_fortitude':{
      npcShieldPulse(state, u, u.x, u.y, 170, 22 + (u.def||8)*0.9);
      return true;
    }
    case 'tank_iron_skin':{
      const cap = u.shieldCap || u.maxShield || 320;
      u.shield = clamp((u.shield||0) + 50 + (u.def||10)*1.2, 0, cap);
      return true;
    }
    case 'tank_bodyguard':{
      npcShieldPulse(state, u, u.x, u.y, 190, 24 + (u.def||10)*1.0);
      return true;
    }
    case 'tank_anchor':{
      npcShieldPulse(state, u, u.x, u.y, 170, 20 + (u.def||9)*0.9);
      return true;
    }
    default:
      return false;
  }
}

export function npcInitAbilities(u){
  const variant = u.variant || 'warrior';
  const loadout = CLASS_LOADOUTS[variant] || CLASS_LOADOUTS.warrior;
  
  // Ensure equipment object exists
  u.equipment = u.equipment || {};
  
  // Handle weapon selection
  if(loadout.weapons && Array.isArray(loadout.weapons)){
    // Multiple weapons available - pick one randomly
    const weaponChoice = loadout.weapons[randi(0, loadout.weapons.length - 1)];
    u.equipment.weapon = structuredClone(weaponChoice);
    u.weaponType = weaponChoice.weaponType;
  } else if(loadout.weapon){
    // Single weapon defined
    u.equipment.weapon = structuredClone(loadout.weapon);
    u.weaponType = loadout.weapon.weaponType;
  } else {
    // Fallback: ensure EVERY unit gets a default weapon
    const COMMON_RARITY = { key:'common', tier: 1, name: 'Common', color: '#c8c8c8' };
    u.equipment.weapon = { kind:'weapon', slot:'weapon', weaponType:'Sword', rarity:COMMON_RARITY, name:'Common Sword', buffs:{atk:5} };
    u.weaponType = 'Sword';
  }
  
  // Handle ability selection based on weapon type (for warrior/DPS with dual loadouts)
  let abilities = loadout.abilities;
  if(variant === 'warrior' && loadout.abilitiesMagic && loadout.abilitiesMelee){
    // Warrior: choose abilities based on weapon type
    const isDestructionStaff = u.weaponType === 'Destruction Staff';
    abilities = isDestructionStaff ? loadout.abilitiesMagic : loadout.abilitiesMelee;
  }
  
  // Ensure armor slots are filled
  assignNpcEquipment(u, variant);
  
  // Assign abilities
  u.npcAbilities = abilities ? abilities.slice(0,5) : ['slash','cleave','slash','cleave','slash'];
  u.npcCd = [0,0,0,0,0];
  u.maxMana = u.maxMana || 60;
  u.mana = u.mana || u.maxMana;
  const baseManaRegen = { mage: 7.5, warrior: 5.0, knight: 5.5, tank: 5.0 };
  u.manaRegen = u.manaRegen || baseManaRegen[variant] || 5.5;
  
  // Assign an explicit party role for AI behavior
  if(!u.role){
    u.role = (variant==='mage') ? 'HEALER' : ((variant==='tank'||variant==='knight') ? 'TANK' : 'DPS');
  }
  
  // Debug log to verify loadouts for all variants
  console.log(`${variant} spawned: weapon=${u.weaponType}, role=${u.role}, abilities=`, u.npcAbilities);
}

function npcUpdateAbilities(state, u, dt, kind){
  if(u.respawnT>0) return;
  if(!u.npcAbilities || !u.npcCd) return;
  for(let i=0;i<u.npcCd.length;i++) u.npcCd[i] = Math.max(0, (u.npcCd[i]||0) - dt);
  const debugAI = state.options?.showDebug || state.options?.showDebugAI;
  const recordAI = (action, extra={})=>{
    if(!debugAI) return;
    state.debugAiEvents = state.debugAiEvents || [];
    state.debugAiEvents.push({ t: state.campaign?.time||0, unit: u.name||u.variant||'npc', id: u.id||u._id, action, ...extra });
    if(state.debugAiEvents.length > 32) state.debugAiEvents.shift();
  };

  // target selection with short lock stickiness
  const now = state.campaign?.time || 0;
  const hostileCreatures = [];
  if(kind==='friendly'){
    for(const c of state.creatures||[]){
      const tgt = c.target;
      const hostile = c.attacked && (tgt===state.player || state.friendlies.includes(tgt) || tgt===u);
      if(hostile) hostileCreatures.push(c);
    }
  } else if(kind==='enemy'){
    for(const c of state.creatures||[]){
      const tgt = c.target;
      const hostile = c.attacked && (tgt===state.player || state.friendlies.includes(tgt) || tgt===u);
      if(hostile) hostileCreatures.push(c);
    }
  }
  const candidates = kind==='enemy'
    ? [state.player, ...state.friendlies.filter(f=>f.respawnT<=0), ...hostileCreatures]
    : [...state.enemies, ...hostileCreatures];
  let target = null, bestD = Infinity;
  if(u._lockUntil && u._lockUntil > now && u._lockId){
    target = candidates.find(c => (c.id||c._id) === u._lockId);
  }
  if(!target){
    for(const c of candidates){ const d=Math.hypot((c.x||0)-u.x,(c.y||0)-u.y); if(d<bestD){bestD=d; target=c;} }
    if(target){ u._lockId = target.id||target._id||null; u._lockUntil = now + 1.5; }
  } else {
    bestD = Math.hypot((target.x||0)-u.x,(target.y||0)-u.y);
  }
  if(!target) return;

  const isStaff = (u.weaponType||'').toLowerCase().includes('staff');
  const roleKey = (u.variant==='mage') ? 'mage' : (u.variant==='tank' ? 'tank' : 'dps');
  let role = u.role || (u.variant==='mage' ? 'HEALER' : (u.variant==='tank' ? 'TANK' : 'DPS'));
  if(typeof role === 'string') role = role.toUpperCase();
  const allies = [state.player, ...state.friendlies.filter(f=>f.respawnT<=0), u];
  let lowestAlly = null, lowestAllyHp = 1, lowestDist = Infinity;
  for(const ally of allies){
    if(!ally || ally.hp===undefined) continue;
    const maxHp = ally===state.player ? currentStats(state).maxHp : ally.maxHp || currentStats(state).maxHp;
    const hpPct = clamp((ally.hp||0)/Math.max(1, maxHp), 0, 1);
    if(hpPct < lowestAllyHp){
      lowestAllyHp = hpPct;
      lowestAlly = ally;
      lowestDist = Math.hypot((ally.x||0)-u.x, (ally.y||0)-u.y);
    }
  }

  // Party context for role behaviors
  ensurePartyState(state);
  const bb = state.party.blackboard;
  const focusTarget = bb.focusTargetId ? (state.enemies||[]).find(e=> (e.id||e._id)===bb.focusTargetId && !e.dead && e.hp>0) : null;

  // Healer priority: emergency save, then AoE stabilize, then pre-burst mitigation
  if(role==='HEALER'){
    const tryCast = (id)=>{ const i=u.npcAbilities.indexOf(id); return (i>=0 && u.npcCd[i]<=0 && u.mana >= (ABILITY_META[id]?.cost||0)) ? i : -1; };
    if(lowestAlly && lowestAllyHp < 0.40){
      let idx = tryCast('mage_divine_touch'); if(idx===-1) idx = tryCast('heal_burst');
      if(idx!==-1){ u.npcCd[idx]=ABILITY_META[u.npcAbilities[idx]].cd; u.mana-=ABILITY_META[u.npcAbilities[idx]].cost; npcCastSupportAbility(state,u,u.npcAbilities[idx],lowestAlly); recordAI('cast-prio',{role,ability:u.npcAbilities[idx]}); return; }
    }
    // multiple allies low: use AoE heals
    const wounded = allies.filter(a=>a && a.hp!==undefined && (a.hp / Math.max(1, (a.maxHp||currentStats(state).maxHp))) < 0.75 && Math.hypot((a.x||0)-u.x,(a.y||0)-u.y) <= 160);
    if(wounded.length >= 3){
      let idx = tryCast('heal_burst'); if(idx===-1) idx = tryCast('beacon_of_light'); if(idx!==-1){ u.npcCd[idx]=ABILITY_META[u.npcAbilities[idx]].cd; u.mana-=ABILITY_META[u.npcAbilities[idx]].cost; npcCastSupportAbility(state,u,u.npcAbilities[idx],u); recordAI('cast-prio',{role,ability:u.npcAbilities[idx]}); return; }
    }
    // pre-burst mitigation
    if(state.party.macroState==='burst'){
      const idx = tryCast('ward_barrier'); if(idx!==-1){ u.npcCd[idx]=ABILITY_META[u.npcAbilities[idx]].cd; u.mana-=ABILITY_META[u.npcAbilities[idx]].cost; npcCastSupportAbility(state,u,'ward_barrier',u); recordAI('cast-prio',{role,ability:'ward_barrier'}); return; }
    }
  }

  // Tank priority: peel healer, stop capture, burst CC on focus
  if(role==='TANK'){
    const healer = allies.find(a=> a && (a.role==='HEALER' || a===state.player && false));
    const tryCast = (id)=>{ const i=u.npcAbilities.indexOf(id); return (i>=0 && u.npcCd[i]<=0 && u.mana >= (ABILITY_META[id]?.cost||0)) ? i : -1; };
    if(healer){
      const threat = (state.enemies||[]).find(e=>!e.dead && e.hp>0 && Math.hypot((e.x||0)-(healer.x||0),(e.y||0)-(healer.y||0)) <= 140);
      if(threat){ let idx = tryCast('knight_taunt'); if(idx===-1) idx = tryCast('warcry'); if(idx===-1) idx = tryCast('knight_shield_wall'); if(idx!==-1){ u.npcCd[idx]=ABILITY_META[u.npcAbilities[idx]].cd; u.mana-=ABILITY_META[u.npcAbilities[idx]].cost; npcCastSupportAbility(state,u,u.npcAbilities[idx],u); recordAI('cast-prio',{role,ability:u.npcAbilities[idx]}); return; } }
    }
    // burst CC on focus target
    if(state.party.macroState==='burst' && focusTarget){ let idx = tryCast('knight_taunt'); if(idx===-1) idx = tryCast('warcry'); if(idx!==-1){ u.npcCd[idx]=ABILITY_META[u.npcAbilities[idx]].cd; u.mana-=ABILITY_META[u.npcAbilities[idx]].cost; npcCastSupportAbility(state,u,u.npcAbilities[idx],u); recordAI('cast-prio',{role,ability:u.npcAbilities[idx]}); return; } }
  }

  // score abilities
  let bestIdx = -1, bestScore = -Infinity, bestSupportTarget=null;
  for(let i=0;i<u.npcAbilities.length;i++){
    const id = u.npcAbilities[i];
    const cdReady = u.npcCd[i] <= 0;
    const meta = ABILITY_META[id];
    if(!cdReady || !meta) continue;
    if(u.mana < meta.cost) continue;
    if(!isStaff && meta.type==='projectile') continue; // melee only weapon can't cast staffs
    const isSupport = meta.kind === 'heal' || meta.kind === 'shield' || meta.kind === 'buff' || meta.type === 'support';
    let distScore = 0;
    let targetForAbility = target;
    if(isSupport){
      if(!lowestAlly) continue;
      const rangeUse = meta.range || 160;
      distScore = 1 - Math.min(1, (lowestDist||9999) / rangeUse);
      if(distScore < 0.05) continue;
      targetForAbility = lowestAlly;
    } else {
      distScore = 1 - Math.min(1, bestD / (meta.range||100));
      if(distScore < 0.05) continue;
    }
    const roleW = meta.role?.[roleKey] ?? 0.6;
    const manaPressure = u.mana / Math.max(1, u.maxMana||60);
    const manaPenalty = (meta.cost/30) * (manaPressure < 0.25 ? 1.2 : 0.8);
    const supportBonus = isSupport ? Math.max(0, (1-lowestAllyHp)*2.5) : 0;
    const dmgBonus = !isSupport ? 0.5 : 0; // Bonus for damage abilities
    const score = roleW*1.5 + distScore*2.0 + (meta.type==='melee'?0.4:0) + dmgBonus - manaPenalty + supportBonus;
    if(score > bestScore){ bestScore = score; bestIdx = i; bestSupportTarget = isSupport ? targetForAbility : target; }
  }

  const fromPlayer = (kind==='friendly');
  if(bestIdx !== -1 && bestScore > -0.5){
    const id = u.npcAbilities[bestIdx];
    const meta = ABILITY_META[id];
    const chosenTarget = (meta.kind || meta.type==='support') ? (bestSupportTarget || lowestAlly || target) : target;
    const ang = Math.atan2((chosenTarget?.y||target.y)-u.y, (chosenTarget?.x||target.x)-u.x);
    u.mana -= meta.cost; u.npcCd[bestIdx] = meta.cd;
    if(meta.type==='support' || meta.kind){
      const handled = npcCastSupportAbility(state, u, id, chosenTarget);
      if(!handled && debugAI){ console.log('[NPC AI] support cast fallback', id); }
    }
    else if(meta.type==='projectile'){
      let aimAng = ang;
      if(target.vx || target.vy){
        const leadX = target.x + (target.vx||0)*0.25;
        const leadY = target.y + (target.vy||0)*0.25;
        aimAng = Math.atan2(leadY - u.y, leadX - u.x);
      }
      spawnProjectile(state, u.x, u.y, aimAng, meta.speed||420, 5, meta.dmg, meta.pierce||0, fromPlayer);
    } else {
      // Melee attack with visual slash effect
      const range = meta.range;
      const arc = meta.arc || 1.2;
      const targets = kind==='enemy' ? [state.player, ...state.friendlies] : state.enemies;
      
      // Create visual slash effect
      const slashColor = kind==='enemy' ? 'rgba(229, 89, 89, 0.6)' : 'rgba(186, 150, 255, 0.6)';
      state.effects.slashes.push({
        t: 0.12,
        arc,
        range,
        dir: ang,
        x: u.x,
        y: u.y,
        color: slashColor,
        dmg: meta.dmg
      });
      
      // Apply damage to targets in arc
      for(let ei=targets.length-1; ei>=0; ei--){
        const e=targets[ei];
        const dx=e.x-u.x, dy=e.y-u.y; const d=Math.hypot(dx,dy); if(d>range) continue;
        const ea=Math.atan2(dy,dx); let diff=Math.abs(ea-ang); diff=Math.min(diff, Math.PI*2-diff);
        if(diff<=arc/2 && e.hp!==undefined){ e.hp-=meta.dmg; }
      }
    }
    if(debugAI){ console.log('[NPC AI] cast', id, 'score', bestScore.toFixed(2), 'target', u._lockId||target.id||'?'); }
    recordAI('cast', { ability:id, score:Number(bestScore.toFixed(2)), dist:Math.round(bestD), mana:Math.round(u.mana), target:u._lockId||target.id||'?' });
    return;
  }

  // filler ranged light for staff users when not casting
  if(isStaff && bestD<=340 && u.hitCd<=0){
    u.hitCd = 0.65;
    const ang = Math.atan2(target.y - u.y, target.x - u.x);
    spawnProjectile(state, u.x, u.y, ang, 420, 5, Math.max(8, u.dmg||8), 0, fromPlayer);
    recordAI('filler', { ability:'staff_light', dist:Math.round(bestD), mana:Math.round(u.mana), target:u._lockId||target.id||'?' });
  }
}

function spawnEnemyAt(state, x,y, t, opts={}){
  const level = opts.level || Math.floor(t/60) + 1;
  const eT=enemyTemplate(t);
  // boost initial speed for spawned enemies to ensure they move immediately
  const baseSpeed = opts.level ? 90 : eT.speed; // level 1 enemies get faster base speed
  const e = {x,y,r:13,maxHp:eT.maxHp,hp:eT.maxHp,mana:40,maxMana:40,speed:baseSpeed,contactDmg:eT.contactDmg,hitCd:0, xp:eT.xp, attacked:false, level, buffs:[], dots:[]};
  if(opts.homeSiteId) e.homeSiteId = opts.homeSiteId;
  if(opts.spawnTargetSiteId) e.spawnTargetSiteId = opts.spawnTargetSiteId;
  if(opts.team) e.team = opts.team;
  // enforce knight cap per team: if this is flagged as a knight spawn, ensure we don't exceed MAX_KNIGHTS_PER_TEAM
  if(opts.knight){
    const team = opts.team || (opts.homeSiteId && state.sites.find(ss=>ss.id===opts.homeSiteId)?.owner);
    if(team){
      const currentKnights = state.enemies.filter(x=>x.team===team && x.knight).length;
      if(currentKnights >= MAX_KNIGHTS_PER_TEAM) return null;
    }
    e.knight = true;
  }
  else if(opts.homeSiteId){ const s=state.sites.find(ss=>ss.id===opts.homeSiteId); e.team = s?.owner ?? 'teamA'; }

  // global caps: block spawn if overall enemy count is excessive
  const totalEnemies = state.enemies.length;
  if(totalEnemies >= MAX_ENEMIES) return null;
  // enforce per-team defender cap for non-guard enemies
  const teamForCap = opts.team || (opts.homeSiteId && state.sites.find(ss=>ss.id===opts.homeSiteId)?.owner) || null;
  if(teamForCap && !e.guard && !e.knight){
    const currentDefenders = state.enemies.filter(x=>x.team===teamForCap && !x.guard).length;
    if(currentDefenders >= MAX_DEFENDERS_PER_TEAM) return null;
  }
  // pick a visual variant for this enemy (knights/bosses get matching look)
  const VARS = ['warrior','mage','knight','tank'];
  if(opts.variant) e.variant = opts.variant;
  else if(e.boss) e.variant = 'tank';
  else if(e.knight) e.variant = 'knight';
  else e.variant = VARS[randi(0, VARS.length-1)];
  // normalize stats to class template for consistency
  applyClassToUnit(e, e.variant);
  e.level = Math.max(1, level);
  // scale rarity by faction tech if available
  if(e.team){
    const tier = (state.factionTech?.[e.team]||1);
    e.level = Math.max(e.level, tier*3); // tech loosely maps to level bracket
  }
  npcInitAbilities(e);
  state.enemies.push(e);
  return e;
}

// --- Creatures (neutral wildlife) ---
const CREATURE_TYPES = [
  { key:'goblin',  name:'Goblin',  color:'#3d7a2d', r:11, hp:50,  speed:75,  dmg:7,  agro:90,  variant:'goblin' },
  { key:'wolf',    name:'Wolf',    color:'#888',    r:11, hp:55,  speed:95,  dmg:8,  agro:120, variant:'wolf' },
  { key:'bear',    name:'Bear',    color:'#8b5a35', r:16, hp:140, speed:65,  dmg:12, agro:110, variant:'bear' },
];

const CREATURE_NAMES = {
  goblin: ['Grok', 'Zag', 'Blurt', 'Snix', 'Kogg', 'Varg', 'Spitz', 'Norg'],
  wolf: ['Fang', 'Grey', 'Ember', 'Storm', 'Shadow', 'Swift', 'Howler', 'Snarl'],
  bear: ['Granite', 'Claw', 'Grizzly', 'Brutus', 'Forge', 'Oak', 'Thunder', 'Boulder'],
};

function spawnCreatures(state){
  const worldW = state.mapWidth || state.engine.canvas.width;
  const worldH = state.mapHeight || state.engine.canvas.height;
  
  // Spawn goblins and bears normally
  for(const ct of CREATURE_TYPES.filter(c => c.key !== 'wolf')){
    const count = ct.key === 'bear' ? 4 : 6;
    for(let i=0;i<count;i++){
      spawnCreatureAt(state, rand(40, worldW-40), rand(40, worldH-40), ct);
    }
  }
  
  // Spawn wolves in packs of 5
  const wolfType = CREATURE_TYPES.find(c => c.key === 'wolf');
  const numPacks = 3;
  for(let p=0;p<numPacks;p++){
    const packCenterX = rand(80, worldW-80);
    const packCenterY = rand(80, worldH-80);
    for(let w=0;w<5;w++){
      const angle = (w/5) * Math.PI * 2;
      const dist = 20 + Math.random() * 10;
      const x = packCenterX + Math.cos(angle) * dist;
      const y = packCenterY + Math.sin(angle) * dist;
      const wolf = spawnCreatureAt(state, x, y, wolfType);
      if(wolf) wolf.packId = p; // mark wolf as part of pack
    }
  }
}

function spawnCreatureAt(state, x, y, type){
  const names = CREATURE_NAMES[type.key] || [];
  const name = names[Math.floor(Math.random() * names.length)];
  const creature = {
    x, y,
    r: type.r,
    maxHp: type.hp,
    hp: type.hp,
    speed: type.speed,
    contactDmg: type.dmg,
    color: type.color,
    key: type.key,
    variant: type.variant,
    name: name,
    agro_range: type.agro,
    attacked: false,
    hitCd: 0,
    wander: { t: rand(0.5, 2.0), ang: Math.random() * Math.PI * 2 },
    target: null,
    pack_id: undefined
  };
  state.creatures.push(creature);
  return creature;
}

function spawnBossCreature(state){
  // ensure only one boss exists
  const existing = state.creatures.find(c=>c && c.boss);
  if(existing) return;
  const worldW = state.mapWidth || state.engine.canvas.width;
  const worldH = state.mapHeight || state.engine.canvas.height;
  const x = rand(80, worldW-80);
  const y = rand(80, worldH-80);
  state.creatures.push({ x,y, r: 24, maxHp: 520, hp: 520, speed: 72, contactDmg: 16, color: cssVar('--legend'), key:'boss', boss:true, attacked:false, hitCd: 0, wander:{ t: rand(0.5,1.6), ang: Math.random()*Math.PI*2 }, target:null });
}

function killCreature(state, index){
  const c = state.creatures[index];
  if(!c) return;
  // boss always drops a legendary; normal creatures have a standard loot chance
  if(c.boss){
    const item = makeLegendaryItem(state);
    state.loot.push(makeLootDrop(c.x, c.y, item));
    // schedule respawn after 5 minutes
    state.bossRespawnT = 5 * 60;
  } else {
    if(Math.random() < 0.45) state.loot.push(spawnLootAt(state, c.x, c.y));
    else state.player.gold += randi(1,3);
  }
  state.creatures.splice(index,1);
}

function applyDamageToCreature(c, dmg, state){
  c.hp -= dmg;
  c.attacked = true;
  if(c.hp <= 0) return true;
  return false;
}

function spawnEnemies(state, dt){
  // Disable continuous spawning; fighters now only respawn from the initial roster.
  return;
}

function nearestEnemyTo(state, x,y, range){
  let best=null, bestD=Infinity, idx=-1;
  for(let i=0;i<state.enemies.length;i++){
    const e=state.enemies[i];
    const d=Math.hypot(e.x-x,e.y-y);
    if(d<bestD){bestD=d; best=e; idx=i;}
  }
  if(!best || bestD>range) return {e:null, idx:-1, d:bestD};
  return {e:best, idx, d:bestD};
}

// Move an entity toward (tx,ty) while avoiding static obstacles (trees, mountains, walls)
// and nearby units. Uses simple angular sampling to find an unblocked heading.
function moveWithAvoidance(entity, tx, ty, state, dt, opts={}){
  const speed = (entity.speed||60);
  const wantX = tx, wantY = ty;
  let dx = wantX - entity.x, dy = wantY - entity.y;
  const dist = Math.hypot(dx,dy);
  if(dist < 1e-4) return;
  const maxMove = speed * dt * (opts.slowFactor||1);
  // desired angle
  const baseAng = Math.atan2(dy,dx);
  const tryAngles = [0,15, -15, 30, -30, 45, -45, 60, -60, 90, -90, 120, -120, 150, -150, 180].map(a=>baseAng + a*(Math.PI/180));
  const entityIsFriendly = state.friendlies.includes(entity);
  for(const ang of tryAngles){
    const step = Math.min(maxMove, dist);
    let mvx = Math.cos(ang)*step;
    let mvy = Math.sin(ang)*step;
    let nx = entity.x + mvx;
    let ny = entity.y + mvy;
    let blockedBy = null;
    // apply soft separation so friendlies don't stack while remaining non-blocking
    if(entityIsFriendly){
      let sepX = 0, sepY = 0;
      for(const f of state.friendlies){
        if(f===entity) continue;
        if(f.respawnT>0) continue;
        const d = Math.hypot(nx - f.x, ny - f.y);
        const desired = (entity.r + f.r + 10);
        if(d < desired && d > 1e-3){
          const push = (desired - d) / desired;
          sepX += (nx - f.x) / d * push;
          sepY += (ny - f.y) / d * push;
        }
      }
      // gently keep spacing from the player anchor as well
      const pd = Math.hypot(nx - state.player.x, ny - state.player.y);
      const desiredP = (entity.r + state.player.r + 12);
      if(pd < desiredP && pd > 1e-3){
        const push = (desiredP - pd) / desiredP;
        sepX += (nx - state.player.x) / pd * push;
        sepY += (ny - state.player.y) / pd * push;
      }
      const sepMag = Math.hypot(sepX, sepY);
      if(sepMag>0){
        const push = Math.min(step*0.45, 26*dt);
        nx += (sepX/sepMag) * push;
        ny += (sepY/sepMag) * push;
      }
    }
    // check collisions with trees, mountains, rocks (all use same overlap buffer as trees)
    let blocked=false;
    for(const t of state.trees||[]){ if(Math.hypot(nx - t.x, ny - t.y) <= (entity.r + t.r + 2)) { blocked=true; blockedBy = {x:t.x,y:t.y}; break; } }
    if(blocked){
      // slide along obstacle tangent to avoid getting pinned
      if(blockedBy){
        const dx = nx - blockedBy.x;
        const dy = ny - blockedBy.y;
        const len = Math.hypot(dx, dy) || 1;
        const tx1 = (-dy/len), ty1 = (dx/len);
        const tx2 = (dy/len), ty2 = (-dx/len);
        const slideStep = Math.max(6, Math.min(step*0.6, 30));
        const trySlide = (sx, sy)=>{
          const snx = entity.x + sx*slideStep;
          const sny = entity.y + sy*slideStep;
          let sBlocked=false;
          for(const t of state.trees||[]){ if(Math.hypot(snx - t.x, sny - t.y) <= (entity.r + t.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked) for(const mc of state.mountainCircles||[]){ if(Math.hypot(snx - mc.x, sny - mc.y) <= (entity.r + mc.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked) for(const rc of state.rockCircles||[]){ if(Math.hypot(snx - rc.x, sny - rc.y) <= (entity.r + rc.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked) for(const wc of state.waterCircles||[]){ if(Math.hypot(snx - wc.x, sny - wc.y) <= (entity.r + wc.r + 2)) { sBlocked=true; break; } }
          if(!sBlocked){
            for(const s of state.sites){
              if(!s.wall) continue;
              const halfW = s.wall.r;
              const isInsideX = snx >= s.x - halfW && snx <= s.x + halfW;
              const isInsideY = sny >= s.y - halfW && sny <= s.y + halfW;
              const wasInsideX = entity.x >= s.x - halfW && entity.x <= s.x + halfW;
              const wasInsideY = entity.y >= s.y - halfW && entity.y <= s.y + halfW;
              if((isInsideX && isInsideY) !== (wasInsideX && wasInsideY)){
                if(!siteAllowsPassage(s, entity, state)) { sBlocked=true; break; }
              }
            }
          }
          if(!sBlocked){ entity.x = snx; entity.y = sny; entity._stuckT = 0; return true; }
          return false;
        };
        if(trySlide(tx1, ty1) || trySlide(tx2, ty2)) continue;
      }
      continue;
    }
    for(const mc of state.mountainCircles||[]){ if(Math.hypot(nx - mc.x, ny - mc.y) <= (entity.r + mc.r + 2)) { blocked=true; blockedBy = {x:mc.x,y:mc.y}; break; } }
    if(blocked) continue;
    for(const rc of state.rockCircles||[]){ if(Math.hypot(nx - rc.x, ny - rc.y) <= (entity.r + rc.r + 2)) { blocked=true; blockedBy = {x:rc.x,y:rc.y}; break; } }
    if(blocked) continue;
    for(const wc of state.waterCircles||[]){ if(Math.hypot(nx - wc.x, ny - wc.y) <= (entity.r + wc.r + 2)) { blocked=true; blockedBy = {x:wc.x,y:wc.y}; break; } }
    if(blocked) continue;
    // walls: don't pass through other's walls unless allowed
    for(const s of state.sites){ 
      if(s.wall){ 
        const halfW = s.wall.r;
        // Check if trying to cross wall boundary
        const isInsideX = nx >= s.x - halfW && nx <= s.x + halfW;
        const isInsideY = ny >= s.y - halfW && ny <= s.y + halfW;
        const wasInsideX = entity.x >= s.x - halfW && entity.x <= s.x + halfW;
        const wasInsideY = entity.y >= s.y - halfW && entity.y <= s.y + halfW;
        
        // Block movement if trying to cross boundary without permission
        if((isInsideX && isInsideY) !== (wasInsideX && wasInsideY)) {
          if(!siteAllowsPassage(s, entity, state)) { blocked=true; blockedBy = {x:s.x,y:s.y}; break; }
        }
      } 
    }
    if(blocked) continue;
    // separation: avoid getting too close to other moving units
    for(const e of state.enemies){ if(e===entity) continue; if(Math.hypot(nx - e.x, ny - e.y) <= (entity.r + e.r + 6)) { blocked=true; break; } }
    if(blocked) continue;
    for(const f of state.friendlies){
      if(f===entity) continue;
      if(f.respawnT>0) continue;
      // Allow friendly units to overlap with each other (no collision blocking)
      if(entityIsFriendly) continue;
      if(Math.hypot(nx - f.x, ny - f.y) <= (entity.r + f.r + 6)) { blocked=true; break; }
    }
    if(blocked) continue;
    // ok to move
    entity.x = nx; entity.y = ny;
    entity._stuckT = 0;
    return;
  }
  // all sampled angles blocked: apply small jitter nudge after short stuck time to escape corners/trees
  entity._stuckT = (entity._stuckT||0) + dt;
  if(entity._stuckT > 0.25){
    const jitterAng = baseAng + (Math.random()>0.5?1:-1)*(Math.PI*0.65 + Math.random()*0.55);
    const mv = Math.min(maxMove*0.75 + 10, 42*dt + 8);
    const nx = entity.x + Math.cos(jitterAng)*mv;
    const ny = entity.y + Math.sin(jitterAng)*mv;
    let blocked=false;
    for(const t of state.trees||[]){ if(Math.hypot(nx - t.x, ny - t.y) <= (entity.r + t.r + 2)) { blocked=true; break; } }
    if(!blocked) for(const mc of state.mountainCircles||[]){ if(Math.hypot(nx - mc.x, ny - mc.y) <= (entity.r + mc.r + 2)) { blocked=true; break; } }
    if(!blocked) for(const rc of state.rockCircles||[]){ if(Math.hypot(nx - rc.x, ny - rc.y) <= (entity.r + rc.r + 2)) { blocked=true; break; } }
    if(!blocked) for(const wc of state.waterCircles||[]){ if(Math.hypot(nx - wc.x, ny - wc.y) <= (entity.r + wc.r + 2)) { blocked=true; break; } }
    if(!blocked){
      for(const s of state.sites){
        if(!s.wall) continue;
        const halfW = s.wall.r;
        const isInsideX = nx >= s.x - halfW && nx <= s.x + halfW;
        const isInsideY = ny >= s.y - halfW && ny <= s.y + halfW;
        const wasInsideX = entity.x >= s.x - halfW && entity.x <= s.x + halfW;
        const wasInsideY = entity.y >= s.y - halfW && entity.y <= s.y + halfW;
        if((isInsideX && isInsideY) !== (wasInsideX && wasInsideY)){
          if(!siteAllowsPassage(s, entity, state)) { blocked=true; break; }
        }
      }
    }
    if(!blocked){ entity.x = nx; entity.y = ny; entity._stuckT = 0; }
  }
  // otherwise stay put (prevents tunneling through rocks/mountains)
  return;
}

function spawnFriendlyAt(state, site, forceVariant=null){
  const VARS = ['warrior','mage','knight','tank'];
  const v = forceVariant || VARS[randi(0, VARS.length-1)];
  const nameOptions = { warrior: 'Warrior', mage: 'Mage', knight: 'Knight', tank: 'Tank' };
  const f = {
    id: `f_${Date.now()}_${randi(0, 99999)}`, // Unique ID for group tracking
    name: `${nameOptions[v]} ${randi(1, 999)}`, // Generate a name like "Warrior 42"
    x: site.x + rand(-28,28),
    y: site.y + rand(-28,28),
    r: 12,
    hp: 55,
    maxHp: 55,
    speed: 110,
    dmg: 8,
    hitCd: 0,
    siteId: site.id,
    respawnT: 0,
    variant: v,
    role: (v==='mage' ? 'HEALER' : (v==='tank' || v==='knight' ? 'TANK' : 'DPS')),
    behavior: 'neutral', // default behavior for all friendlies
    buffs: [],
    dots: [],
    level: Math.max(1, state.progression?.level || 1)
  };
  // apply class template to friendly
  applyClassToUnit(f, v);
  // friendlies use 'dmg' for melee; ensure it's aligned
  f.dmg = f.contactDmg || f.dmg;
  npcInitAbilities(f);
  // boost gear tier to match player tech tier
  const playerTier = (state.factionTech?.player||1);
  f.level = Math.max(f.level, playerTier*3);
  // re-apply class scaling after level bump
  applyClassToUnit(f, v);
  state.friendlies.push(f);
}

function ensureBaseFriendlies(state, opts={}){
  const home = playerHome(state);
  if(!home || home.owner!=='player') return;
  const desired = 10; // fixed roster cap (non-guards)
  const alive = state.friendlies.filter(a=>a.siteId===home.id && a.respawnT<=0 && !a.guard).length;
  const pending = (home.guardRespawns && home.guardRespawns.length) ? home.guardRespawns.length : 0;
  const need = Math.max(0, desired - alive - pending);
  if(opts.initial && need>0){
    // Ensure variety: spawn at least one healer mage
    spawnFriendlyAt(state, home, 'mage');
    // Spawn remaining with variety
    const roles = ['warrior','knight','tank','mage'];
    for(let i=1;i<need;i++){
      const role = roles[i % roles.length];
      spawnFriendlyAt(state, home, role);
    }
  } else {
    for(let i=0;i<need;i++) spawnFriendlyAt(state, home);
  }
}

function seedTeamForces(state, team, count){
  const home = getHomeForTeam(state, team);
  if(!home) return;
  for(let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2;
    const dist = rand(32, 110);
    spawnEnemyAt(state, home.x + Math.cos(ang)*dist, home.y + Math.sin(ang)*dist, state.campaign.time, { homeSiteId: home.id, team });
  }
}

function updateFriendlySpawns(state, dt){
  // Disabled automatic spawning; roster is fixed and only respawns.
  return;
}

function updateFriendlies(state, dt){
  const DEBUG_AI = false; // Set to true to enable AI debug logging
  for(let i=state.friendlies.length-1;i>=0;i--){
    const a=state.friendlies[i];
    if(a.respawnT>0){
      a.respawnT-=dt;
      const flag=state.sites.find(s=>s.id===a.siteId);
      if(a.respawnT<=0){
        // Determine respawn location based on garrison assignment or normal flag
        let respawnSite = null;
        if(a.garrisonSiteId){
          // Garrisoned - respawn at garrison location if still player-owned
          respawnSite = state.sites.find(s => s.id === a.garrisonSiteId && s.owner === 'player');
          if(!respawnSite){
            // Garrison site lost, clear assignment and use normal respawn
            delete a.garrisonSiteId;
          }
        }
        
        // If no garrison or garrison lost, use normal flag respawn
        if(!respawnSite){
          respawnSite = flag && flag.owner === 'player' ? flag : null;
        }
        
        if(respawnSite){
          a.hp=a.maxHp;
          a.dead=false;
          a.siteId = respawnSite.id; // Update siteId to respawn location
          
          // if site defines fixed guard positions, respawn into an available fixed slot
          if(respawnSite._guardPositions && a.guard){
            // find an unoccupied position
            let pos=null;
            for(const p of respawnSite._guardPositions){
              const occ = state.friendlies.find(f=>f.siteId===respawnSite.id && f.respawnT<=0 && Math.hypot(f.x-p.x,f.y-p.y)<=8);
              if(!occ){ pos=p; break; }
            }
            if(!pos) pos = respawnSite._guardPositions[0];
            a._spawnX = pos.x; a._spawnY = pos.y; a.x = pos.x; a.y = pos.y;
          } else {
            a.x = respawnSite.x + rand(-28,28);
            a.y = respawnSite.y + rand(-28,28);
          }
          
          // If this is a group member that just respawned, notify
          const isGroupMember = state.group && state.group.members && state.group.members.includes(a.id);
          if(isGroupMember){
            console.log(`[GROUP] ${a.name} respawned at ${respawnSite.name}`);
            state.ui?.toast(`<b>${a.name}</b> has respawned!`);
          }
        } else {
          state.friendlies.splice(i,1);
        }
      }
      continue;
    }
    a.hitCd=Math.max(0,a.hitCd-dt);
    const manaRegen = a.manaRegen ?? Math.max(4, (a.maxMana||60)*0.10);
    a.mana = clamp((a.mana||0) + manaRegen*dt, 0, a.maxMana||60);
    const flag=state.sites.find(s=>s.id===a.siteId);
    
    // Check if this is a group member (should follow player)
    const isGroupMember = state.group && state.group.members && state.group.members.includes(a.id);
    const groupSettings = isGroupMember ? state.group.settings[a.id] : null;
    
    const near=nearestEnemyTo(state, a.x,a.y, 240);
    // consider hostile creatures that are attacking us or allies
    let nearCreature=null, nearCreatureD=Infinity;
    for(const c of state.creatures){
      if(!c.attacked) continue;
      const isHostile = c.target===state.player || state.friendlies.includes(c.target) || c.target===a;
      if(!isHostile) continue;
      const d = Math.hypot(c.x - a.x, c.y - a.y);
      if(d < nearCreatureD){ nearCreatureD=d; nearCreature=c; }
    }
    let tx=a.x, ty=a.y;
    
    if(isGroupMember){
      ensurePartyState(state);
      const party = state.party;
      const bb = party.blackboard;
      const macro = party.macroState;
      const memberIndex = state.group.members.indexOf(a.id);
      const totalMembers = state.group.members.length;
      const angle = (memberIndex / Math.max(1, totalMembers)) * Math.PI * 2;
      const spread = bb.spreadRadius + (memberIndex % 3) * 10;
      const anchorX = bb.stackPoint.x;
      const anchorY = bb.stackPoint.y;
      const desiredX = anchorX + Math.cos(angle) * spread;
      const desiredY = anchorY + Math.sin(angle) * spread;
      const distAnchor = Math.hypot(a.x - anchorX, a.y - anchorY);
      const leash = bb.leashRadius || 210;
      const behavior = groupSettings?.behavior || 'group';
      // Determine role (from settings, unit, or variant)
      let role = (groupSettings && groupSettings.role) || a.role || (a.variant==='mage' ? 'HEALER' : (a.variant==='tank'||a.variant==='knight' ? 'TANK' : 'DPS'));
      if(typeof role === 'string') role = role.toUpperCase();
      const now = state.campaign.time || 0;

      // Target selection with short hysteresis
      let target = null;
      if(a._lockUntil && a._lockUntil > now){
        target = state.enemies.find(e => (e.id||e._id) === a._lockId && !e.dead && e.hp>0) || null;
      }
      if(!target && bb.chaseAllowed){
        if(bb.focusTargetId){
          target = state.enemies.find(e => (e.id||e._id) === bb.focusTargetId && !e.dead && e.hp>0) || null;
        }
        const aggroRange = behavior === 'aggressive' ? 190 : 130;
        if(!target && near.e && near.d <= aggroRange){
          target = near.e;
        }
        if(!target && nearCreature && nearCreatureD <= aggroRange){
          target = nearCreature;
        }
      }
      if(target){
        a._lockId = target.id || target._id || null;
        a._lockUntil = now + 1.5;
      } else if(a._lockUntil && a._lockUntil <= now){
        a._lockId = null;
      }

      // Healer stays anchored: reduce leash; Tank can step forward; DPS follows macro
      const roleLeash = role==='HEALER' ? Math.min(leash, 180) : (role==='TANK' ? leash+30 : leash);
      const chaseAllowed = (role==='HEALER' ? false : bb.chaseAllowed) && distAnchor <= roleLeash * 1.35;
      const macroStack = macro === 'stack' || !chaseAllowed;

      if(macroStack || !target){
        // If very far from leader, ignore formation and go straight to leader to catch up
        if(distAnchor > roleLeash * 0.9){
          tx = anchorX; ty = anchorY;
          a.speed = distAnchor > roleLeash * 1.2 ? 165 : 135;
        } else {
          // Role-based formation offsets: Tank slightly ahead, Healer slightly inside
          let offX=0, offY=0;
          const focus = bb.focusTargetId ? state.enemies.find(e => (e.id||e._id)===bb.focusTargetId && !e.dead && e.hp>0) : null;
          const faceAng = focus ? Math.atan2(focus.y - anchorY, focus.x - anchorX) : 0;
          if(role==='TANK'){ offX += Math.cos(faceAng) * 22; offY += Math.sin(faceAng) * 22; }
          if(role==='HEALER'){ const toCenterX = anchorX - desiredX, toCenterY = anchorY - desiredY; const len=Math.hypot(toCenterX,toCenterY)||1; offX += (toCenterX/len)*16; offY += (toCenterY/len)*16; }
          tx = desiredX + offX; ty = desiredY + offY;
          const distDesired = Math.hypot(a.x - desiredX, a.y - desiredY);
          if(distDesired > 40) a.speed = 120;
          else if(distDesired > 12) a.speed = 80;
          else { a.speed = 40; }
        }
      } else {
        const distTargetAnchor = Math.hypot(target.x - anchorX, target.y - anchorY);
        const allowFarChase = macro === 'burst';
        if(!allowFarChase && distTargetAnchor > roleLeash * 1.4){
          tx = anchorX; ty = anchorY; a.speed = 140;
        } else {
          tx = target.x; ty = target.y;
          a.speed = distAnchor > roleLeash ? 135 : 120;
        }
      }

      // Tank peel: if healer is threatened nearby, override target to attacker
      if(role==='TANK'){
        const healer = state.friendlies.find(f=>f && f.respawnT<=0 && (state.group?.members||[]).includes(f.id) && (f.role==='HEALER' || f.variant==='mage'));
        if(healer){
          const attacker = state.enemies.find(e=>!e.dead && e.hp>0 && Math.hypot(e.x - healer.x, e.y - healer.y) <= 140);
          if(attacker){ tx = attacker.x; ty = attacker.y; a.speed = 135; }
        }
      }

    }
    else if(a.guard){
      // Guards: defend their site - chase enemies within range but don't chase beyond leash radius
      const spawnX = (a._spawnX!==undefined)?a._spawnX:a.x;
      const spawnY = (a._spawnY!==undefined)?a._spawnY:a.y;
      const distFromSpawn = Math.hypot(a.x - spawnX, a.y - spawnY);
      const GUARD_AGGRO_RANGE = 150; // Radius to detect and engage enemies
      const GUARD_LEASH_RADIUS = 180; // Maximum distance from spawn point before returning
      
      if(near.e && near.d <= GUARD_AGGRO_RANGE){
        // Enemy detected - check if chasing would exceed leash radius
        const distEnemyFromSpawn = Math.hypot(near.e.x - spawnX, near.e.y - spawnY);
        
        if(distEnemyFromSpawn <= GUARD_LEASH_RADIUS && distFromSpawn < GUARD_LEASH_RADIUS){
          // Enemy is within leash radius - pursue and attack
          a.attacked = true;
          a.speed = 120;
          tx = near.e.x;
          ty = near.e.y;
        } else {
          // Enemy is beyond leash radius or guard is too far - return to post
          a.attacked = false;
          a.speed = 120;
          tx = spawnX;
          ty = spawnY;
        }
      } else if(a.attacked || distFromSpawn > 6){
        // No enemy nearby or returning to spawn
        a.speed = 120;
        tx = spawnX;
        ty = spawnY;
        const dd = Math.hypot(tx - a.x, ty - a.y);
        if(dd <= 6){
          a.attacked = false;
          a.speed = 0;
          tx = a.x = spawnX;
          ty = a.y = spawnY;
        }
      } else {
        // Idle at spawn
        a.speed = 0;
        tx = a.x = spawnX;
        ty = a.y = spawnY;
      }
    } else {
      // non-guard friendlies: check for garrison assignment first
      if(a.garrisonSiteId){
        // Garrisoned friendly - defend assigned flag
        const garrisonSite = state.sites.find(s => s.id === a.garrisonSiteId);
        
        // If garrison site no longer exists or isn't player-owned, clear assignment
        if(!garrisonSite || garrisonSite.owner !== 'player'){
          delete a.garrisonSiteId;
        } else {
          // Initialize garrison position if not set (spread units around flag)
          if(!a._garrisonX || !a._garrisonY){
            // Get all garrisoned units at this site (including this one)
            const garrisonedUnits = state.friendlies.filter(f => f.garrisonSiteId === a.garrisonSiteId);
            
            // Assign slots if not already assigned
            const unitsWithSlots = garrisonedUnits.filter(f => f._garrisonSlot !== undefined);
            if(a._garrisonSlot === undefined){
              // Find first available slot
              const usedSlots = new Set(unitsWithSlots.map(f => f._garrisonSlot));
              let slot = 0;
              while(usedSlots.has(slot)) slot++;
              a._garrisonSlot = slot;
            }
            
            // Calculate position based on slot number
            const totalSlots = Math.max(garrisonedUnits.length, 8); // Support up to 8 positions
            const angle = (a._garrisonSlot / totalSlots) * Math.PI * 2;
            const spreadRadius = 70; // Fixed radius for consistency
            a._garrisonX = garrisonSite.x + Math.cos(angle) * spreadRadius;
            a._garrisonY = garrisonSite.y + Math.sin(angle) * spreadRadius;
          }
          
          const GARRISON_DEFEND_RADIUS = 150; // Detection range for enemies
          const GARRISON_LEASH_RADIUS = 180; // Maximum chase distance
          const distToPost = Math.hypot(a.x - a._garrisonX, a.y - a._garrisonY);
          
          // Check for enemies near the garrison
          if(near.e && near.d <= GARRISON_DEFEND_RADIUS){
            const enemyDistToFlag = Math.hypot(near.e.x - garrisonSite.x, near.e.y - garrisonSite.y);
            const enemyDistToPost = Math.hypot(near.e.x - a._garrisonX, near.e.y - a._garrisonY);
            
            // Only chase if enemy is within leash radius from our post
            if(enemyDistToPost <= GARRISON_LEASH_RADIUS && distToPost < GARRISON_LEASH_RADIUS){
              // Enemy is within defensive zone - engage
              a.speed = 120;
              tx = near.e.x;
              ty = near.e.y;
            } else {
              // Enemy too far or we're beyond leash - return to post
              a.speed = 110;
              tx = a._garrisonX;
              ty = a._garrisonY;
            }
          } else if(distToPost > 8){
            // No enemy nearby - return to defensive position
            a.speed = 100;
            tx = a._garrisonX;
            ty = a._garrisonY;
          } else {
            // Idle at post
            a.speed = 0;
            tx = a.x;
            ty = a.y;
          }
        }
      } else {
        // Non-garrisoned friendlies: behavior-aware objective handling
        const behavior = a.behavior || 'neutral';
        const AGGRO_RANGE = behavior === 'aggressive' ? 140 : 80;
        
        // find nearest enemy-held flag (primary objective)
        let targetFlag=null, bestD=Infinity;
        for(const s of state.sites){ 
          if(s.id.startsWith('site_') && s.owner && s.owner!=='player'){
            const d=Math.hypot(s.x - a.x, s.y - a.y);
            if(d<bestD){ bestD=d; targetFlag=s; }
          }
        }
        
        // Behavior: engage enemies more readily when aggressive
        if(near.e && near.d <= AGGRO_RANGE && (!targetFlag || near.d < Math.hypot(targetFlag.x-a.x, targetFlag.y-a.y))){
          tx = near.e.x; ty = near.e.y;
        } else if(nearCreature && nearCreatureD <= AGGRO_RANGE){
          tx = nearCreature.x; ty = nearCreature.y;
        } else if(targetFlag){
          // prioritize moving to enemy-held flag to capture
          tx = targetFlag.x; ty = targetFlag.y;
        } else {
          // no enemy flags found, return to home flag
          if(flag){ tx = flag.x; ty = flag.y; }
        }
        
        // set speed for non-guards
        a.speed = 110;
      }
    }
    
    const cc = getCcState(a);
    const waterFactor = a.inWater ? 0.45 : 1.0;
    const ccFactor = (cc.rooted || cc.stunned) ? 0 : Math.max(0, 1 + cc.speedMod);
    const slowFactor = waterFactor * ccFactor;

    // move friendlies using avoidance helper for better navigation (both guards and non-guards)
    if(a.speed > 0 && slowFactor>0) moveWithAvoidance(a, tx, ty, state, dt, { slowFactor });
    
    // water flag
    a.inWater = false; for(const w of state.waters||[]){ if(Math.hypot(a.x-w.x,a.y-w.y) <= w.r){ a.inWater=true; break; } }

    // idle soft spacing so friendlies don't remain stacked when not moving
    if(state.friendlies.length>1){
      let sepX = 0, sepY = 0;
      for(const other of state.friendlies){
        if(other===a) continue;
        if(other.respawnT>0) continue;
        const d = Math.hypot(a.x - other.x, a.y - other.y);
        const desired = a.r + other.r + 10;
        if(d < desired && d > 1e-3){
          const push = (desired - d) / desired;
          sepX += (a.x - other.x) / d * push;
          sepY += (a.y - other.y) / d * push;
        }
      }
      const pd = Math.hypot(a.x - state.player.x, a.y - state.player.y);
      const desiredP = a.r + state.player.r + 12;
      if(pd < desiredP && pd > 1e-3){
        const push = (desiredP - pd) / desiredP;
        sepX += (a.x - state.player.x) / pd * push;
        sepY += (a.y - state.player.y) / pd * push;
      }
      const sepMag = Math.hypot(sepX, sepY);
      if(sepMag>0){
        const pushStep = Math.min(32*dt, 10);
        a.x += (sepX/sepMag) * pushStep;
        a.y += (sepY/sepMag) * pushStep;
      }
    }

    // simple ability casting for friendlies (skip if silenced/stunned)
    if(!cc.stunned && !cc.silenced) npcUpdateAbilities(state, a, dt, 'friendly');

    // contact attack: attempt to hit nearby enemies
    let contactTarget = near.e;
    if(isGroupMember && a._lockId){
      const locked = state.enemies.find(e => (e.id||e._id) === a._lockId && !e.dead && e.hp>0);
      if(locked) contactTarget = locked;
    }
    // allow hostile creature to override contact target if closer
    if(nearCreature && (!contactTarget || nearCreatureD < (contactTarget? Math.hypot(contactTarget.x-a.x, contactTarget.y-a.y):Infinity))) contactTarget = nearCreature;

    if(contactTarget && !cc.stunned){
      const d = Math.hypot(contactTarget.x - a.x, contactTarget.y - a.y);
      const hitDist=a.r+(contactTarget.r||12)+6;
      const hasStaff = (a.weaponType||'').toLowerCase().includes('staff');
      // ranged light attack for staff users when outside melee range
      if(hasStaff && d>hitDist && d<=320 && a.hitCd<=0){
        a.hitCd = 0.70;
        const ang = Math.atan2(contactTarget.y - a.y, contactTarget.x - a.x);
        spawnProjectile(state, a.x, a.y, ang, 420, 5, Math.max(8, a.dmg*0.95), 0, true);
      }
      else if(d<=hitDist && a.hitCd<=0){
        a.hitCd=0.55;
        const stLite = { critChance: 0, critMult: 1 };
        const res = applyDamageToEnemy(contactTarget, a.dmg, stLite, state);
        if(contactTarget.hp<=0){
          const idx = state.enemies.indexOf(contactTarget);
          if(idx>=0) killEnemy(state, idx, false);
        }
      }
    }
    // incidental collisions with creatures: friendlies can aggro creatures if they hit them
    for(let ci=state.creatures.length-1; ci>=0; ci--){
      const c = state.creatures[ci];
      const d = Math.hypot(c.x - a.x, c.y - a.y);
      const hitDist = a.r + (c.r||12) + 4;
      if(d <= hitDist && a.hitCd<=0){
        a.hitCd = 0.55;
        const dead = applyDamageToCreature(c, a.dmg, state);
        c.target = a;
        if(dead) killCreature(state, ci);
      }
    }
    if(flag && flag.owner!=='player' && !isGroupMember){
      state.friendlies.splice(i,1);
    }
  }
}

function nearestTargetSiteForTeam(state, team){
  const playerOwned = state.sites.filter(s => s.owner==='player' && s.id.startsWith('site_'));
  if(playerOwned.length===0) return null;
  const eh = getHomeForTeam(state, team) || state.sites.find(s=>s.id.endsWith('_base'));
  if(!eh) return playerOwned[0];
  let best=null, bestD=Infinity;
  for(const s of playerOwned){
    const d=Math.hypot(s.x-eh.x, s.y-eh.y);
    if(d<bestD){bestD=d; best=s;}
  }
  return best;
}

function killFriendly(state, idx, scheduleRespawn=true){
  const f = state.friendlies[idx];
  if(!f) return;
  // Close unit inspection if this was the selected unit
  if(state.selectedUnit && state.selectedUnit.unit===f){
    try{ state.ui.hideUnitPanel?.(); }catch{}
  }
  
  // Check if this friendly is a group member
  const isGroupMember = state.group && state.group.members && state.group.members.includes(f.id);
  
  if(isGroupMember){
    // Group members respawn at nearest player-owned flag and rejoin player
    const nearestFlag = findNearestPlayerFlag(state, state.player.x, state.player.y);
    if(nearestFlag){
      f.respawnT = 8.0; // 8 second respawn time for group members
      f.siteId = nearestFlag.id; // Respawn at this flag
      console.log(`[GROUP] ${f.name} will respawn at ${nearestFlag.name} in 8s`);
      state.ui?.toast(`<b>${f.name}</b> will respawn at ${nearestFlag.name} in 8s.`);
      // Don't remove from friendlies array - just set respawn timer
      return;
    } else {
      // No player-owned flag found - remove from group
      console.log(`[GROUP] ${f.name} died with no respawn point. Removing from group.`);
      state.group.members = state.group.members.filter(id => id !== f.id);
      delete state.group.settings[f.id];
    }
  }
  
  // Standard friendly respawn logic for non-group members
  if(scheduleRespawn){
    if(f.guard && f.siteId){
      const site = state.sites.find(s=>s.id===f.siteId); if(site) site.guardRespawns.push(30.0);
      state.friendlies.splice(idx,1);
    } else {
      const nearestFlag = findNearestPlayerFlag(state, f.x||state.player.x, f.y||state.player.y);
      if(nearestFlag){
        f.respawnT = 8.0;
        f.siteId = nearestFlag.id;
        f.dead = true;
        return;
      }
      state.friendlies.splice(idx,1);
    }
  } else {
    state.friendlies.splice(idx,1);
  }
}

// Helper to find nearest player-owned flag
function findNearestPlayerFlag(state, x, y){
  let nearest = null;
  let bestD = Infinity;
  for(const s of state.sites){
    if(s.owner === 'player' && (s.id.startsWith('site_') || s.id.endsWith('_base'))){
      const d = Math.hypot(s.x - x, s.y - y);
      if(d < bestD){ bestD = d; nearest = s; }
    }
  }
  return nearest;
}

function updateEnemies(state, dt){
  const st=currentStats(state);
  const ENEMY_AGGRO_DIST = 90; // distance at which an enemy will engage nearby hostiles before going to flag
  for(let i=state.enemies.length-1;i>=0;i--){
    const e=state.enemies[i];
    // when inside a dungeon, only process dungeon enemies for that dungeon
    if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
    e.hitCd=Math.max(0,e.hitCd-dt);
    const manaRegen = e.manaRegen ?? Math.max(3, (e.maxMana||40)*0.08);
    e.mana = clamp((e.mana||0) + manaRegen*dt, 0, e.maxMana||40);

    // detect if enemy currently in water (slows and disables melee contact)
    e.inWater = false;
    for(const w of state.waters||[]){ if(Math.hypot(e.x-w.x,e.y-w.y) <= w.r){ e.inWater=true; break; } }

    // resolve home/target sites (skip for dungeon enemies - they only attack the player)
    let home = null;
    let spawnTarget = null;
    if(!e.dungeonId){
      home = e.homeSiteId ? state.sites.find(s=>s.id===e.homeSiteId) : (e.team ? getHomeForTeam(state, e.team) : null);
      if(e.homeSiteId && home && home.owner!==e.team){
        // if home lost, redirect to the nearest capturable flag (do NOT target bases)
        let bestFlag=null, bestD=Infinity;
        for(const s of state.sites){ if(s.id && s.id.startsWith && s.id.startsWith('site_') && s.owner !== e.team){ const d=Math.hypot(s.x - e.x, s.y - e.y); if(d<bestD){ bestD=d; bestFlag=s; } } }
        if(bestFlag) e.spawnTargetSiteId = bestFlag.id; else e.spawnTargetSiteId = null;
      }
      spawnTarget = e.spawnTargetSiteId ? state.sites.find(s=>s.id===e.spawnTargetSiteId) : null;
      // if no explicit spawn target, pick nearest site not owned by the enemy's team
      if(!spawnTarget){
        let best=null, bestD=Infinity;
        for(const s of state.sites){
          // only consider flag sites for attack targets
          if(!s.id || !s.id.startsWith || !s.id.startsWith('site_')) continue;
          if(s.owner !== e.team){
            const d=Math.hypot(s.x - e.x, s.y - e.y);
            if(d<bestD){ bestD=d; best=s; }
          }
        }
        if(best){ e.spawnTargetSiteId = best.id; spawnTarget = best; }
      }
    } else {
      // ensure dungeon enemies have no world capture targets
      e.homeSiteId = null; e.spawnTargetSiteId = null; e.team = null;
    }

    // determine goal position
    let tx, ty;
    
    // Guards defend their site
    if(e.guard){
      const guardSite = e.homeSiteId ? state.sites.find(s => s.id === e.homeSiteId) : null;
      if(guardSite){
        const spawnX = e.x; // Guard spawn position
        const spawnY = e.y;
        const distFromSpawn = Math.hypot(e.x - spawnX, e.y - spawnY);
        const GUARD_AGGRO_RANGE = 150;
        const GUARD_LEASH_RADIUS = 180;
        
        // Check for nearest hostile within aggro range
        let nearestHost = null, nearestHD = Infinity;
        if(!state.player.dead){ 
          const d = Math.hypot(state.player.x - e.x, state.player.y - e.y); 
          if(d < nearestHD && d <= GUARD_AGGRO_RANGE){ nearestHD = d; nearestHost = state.player; }
        }
        for(const f of state.friendlies){ 
          if(f.respawnT>0) continue; 
          const d=Math.hypot(f.x - e.x, f.y - e.y); 
          if(d < nearestHD && d <= GUARD_AGGRO_RANGE){ nearestHD = d; nearestHost = f; }
        }
        
        if(nearestHost){
          // Check if enemy is within leash radius from guard's spawn
          const hostDistFromSpawn = Math.hypot(nearestHost.x - spawnX, nearestHost.y - spawnY);
          if(hostDistFromSpawn <= GUARD_LEASH_RADIUS && distFromSpawn < GUARD_LEASH_RADIUS){
            // Chase enemy
            e.attacked = true;
            e._hostTarget = nearestHost;
            tx = nearestHost.x;
            ty = nearestHost.y;
          } else {
            // Return to post - enemy too far
            e.attacked = false;
            tx = spawnX;
            ty = spawnY;
          }
        } else if(e.attacked || distFromSpawn > 6){
          // Return to spawn
          tx = spawnX;
          ty = spawnY;
          const dd = Math.hypot(tx - e.x, ty - e.y);
          if(dd <= 6){
            e.attacked = false;
            e.speed = 0;
            continue; // Guard is idle at spawn
          }
        } else {
          // Idle at spawn
          e.speed = 0;
          continue;
        }
      }
    } else {
      const dp = Math.hypot(state.player.x - e.x, state.player.y - e.y);
      const dh = home ? Math.hypot(home.x - e.x, home.y - e.y) : Infinity;

      // check for nearest hostile (player, friendlies, or enemies of other teams)
      let nearestHost = null, nearestHD = Infinity, hostType = null;
      if(!state.player.dead){ const d = Math.hypot(state.player.x - e.x, state.player.y - e.y); if(d < nearestHD){ nearestHD = d; nearestHost = state.player; hostType='player'; } }
      for(const f of state.friendlies){ if(f.respawnT>0) continue; const d=Math.hypot(f.x - e.x, f.y - e.y); if(d < nearestHD){ nearestHD = d; nearestHost = f; hostType='friendly'; } }
      for(const other of state.enemies){ if(other===e) continue; if(!other.team || !e.team) continue; if(other.team === e.team) continue; const d = Math.hypot(other.x - e.x, other.y - e.y); if(d < nearestHD){ nearestHD = d; nearestHost = other; hostType='enemy'; } }

      const AGGRO_DIST = ENEMY_AGGRO_DIST;
      if(nearestHost && nearestHD <= AGGRO_DIST && !e.inWater){
        // prioritize attacking the nearest hostile
        tx = nearestHost.x; ty = nearestHost.y;
        e.attacked = true;
        e._hostTarget = nearestHost;
      } else if(spawnTarget){
        // If this enemy's spawn target is a site not owned by the enemy's team,
        // prefer to approach and attack the site's walls (nearest intact side).
        if(spawnTarget.owner && spawnTarget.owner !== e.team && spawnTarget.wall){
          // choose the nearest intact wall side and move to a point on the ring there
          let bestIdx = -1, bestD = Infinity;
          for(let si=0; si<4; si++){
            const side = spawnTarget.wall.sides && spawnTarget.wall.sides[si];
            if(!side || side.destroyed) continue;
            const midAng = (si + 0.5) * (Math.PI/2);
            const px = spawnTarget.x + Math.cos(midAng) * spawnTarget.wall.r * 0.92;
            const py = spawnTarget.y + Math.sin(midAng) * spawnTarget.wall.r * 0.92;
            const d = Math.hypot(px - e.x, py - e.y);
            if(d < bestD){ bestD = d; bestIdx = si; }
          }
          if(bestIdx === -1){
            const g = spawnTarget.wall.gateSide || 0;
            const midAng = (g + 0.5) * (Math.PI/2);
            tx = spawnTarget.x + Math.cos(midAng) * spawnTarget.wall.r * 0.92;
            ty = spawnTarget.y + Math.sin(midAng) * spawnTarget.wall.r * 0.92;
          } else {
            const midAng = (bestIdx + 0.5) * (Math.PI/2);
            tx = spawnTarget.x + Math.cos(midAng) * spawnTarget.wall.r * 0.92;
            ty = spawnTarget.y + Math.sin(midAng) * spawnTarget.wall.r * 0.92;
          }
        } else {
          const dxs = (spawnTarget.x - e.x); const dys = (spawnTarget.y - e.y);
          const dts = Math.hypot(dxs,dys) || 1;
          const approach = Math.max(spawnTarget.r - 18, spawnTarget.r * 0.6, 18);
          tx = spawnTarget.x - (dxs/dts) * approach;
          ty = spawnTarget.y - (dys/dts) * approach;
        }
      } else if(dp <= CHASE_DISTANCE && dh <= CHASE_FROM_HOME_MAX){
        // chase player but only if not too far from home
        tx = state.player.x; ty = state.player.y;
      } else if(home && dh > 12){
        // return to home
        tx = home.x; ty = home.y;
      } else {
        // patrol around home (stay near)
        if(home){ tx = home.x + Math.cos((e._patrolAngle||0))*DEFEND_RADIUS*0.45; ty = home.y + Math.sin((e._patrolAngle||0))*DEFEND_RADIUS*0.45; e._patrolAngle = (e._patrolAngle||0) + dt*0.6; }
        else { tx = state.player.x; ty = state.player.y; }
      }

      const cc = getCcState(e);
      // move towards target using avoidance helper (includes trees/mountains/walls and unit separation)
      if(e.speed > 0){
        const slowFactor = (e.inWater ? 0.45 : 1.0) * ((cc.rooted||cc.stunned) ? 0 : Math.max(0, 1 + cc.speedMod));
        if(slowFactor>0) moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });
      }
    }

    // contact attack: attempt to hit nearest hostile (player, friendly, enemy of other teams, or hostile creature)
    if(e.hitCd<=0 && !(getCcState(e).stunned)){
      let bestTarget = null, bestD = Infinity, bestType = null;
      // player
      if(!state.player.dead){ const d=Math.hypot(state.player.x - e.x, state.player.y - e.y); if(d < bestD){ bestD = d; bestTarget = state.player; bestType='player'; } }
      // friendlies
      for(const f of state.friendlies){ if(f.respawnT>0) continue; const d=Math.hypot(f.x - e.x, f.y - e.y); if(d < bestD){ bestD = d; bestTarget = f; bestType='friendly'; } }
      // other-team enemies
      for(const other of state.enemies){ if(other===e) continue; if(!other.team || !e.team) continue; if(other.team === e.team) continue; const d=Math.hypot(other.x - e.x, other.y - e.y); if(d < bestD){ bestD = d; bestTarget = other; bestType='enemy'; } }
      // hostile creatures (attacked and targeting an enemy/friendly/player)
      for(const c of state.creatures){
        if(!c.attacked) continue;
        const tgt = c.target;
        const hostile = tgt===state.player || state.friendlies.includes(tgt) || tgt===e;
        if(!hostile) continue;
        const d = Math.hypot(c.x - e.x, c.y - e.y);
        if(d < bestD){ bestD = d; bestTarget = c; bestType='creature'; }
      }

      if(bestTarget){
        const hitDist = e.r + (bestTarget.r || 12) + 4;
        if(bestD <= hitDist && !e.inWater){
          e.hitCd = 0.65;
          e.attacked = true;
          if(bestType === 'player'){
            applyDamageToPlayer(state, e.contactDmg, st);
          } else if(bestType === 'friendly'){
            applyShieldedDamage(state, bestTarget, e.contactDmg);
            if(bestTarget.hp<=0){ killFriendly(state, state.friendlies.indexOf(bestTarget), true); }
          } else if(bestType === 'enemy'){
            // damage other enemy and kill if needed
            const stLite = { critChance: 0, critMult: 1 };
            const res = applyDamageToEnemy(bestTarget, e.contactDmg, stLite, state);
            if(bestTarget.hp<=0){
              const tgtIdx = state.enemies.findIndex(x=>x===bestTarget);
              if(tgtIdx!==-1) killEnemy(state, tgtIdx, true);
            }
          } else if(bestType === 'creature'){
            const dead = applyDamageToCreature(bestTarget, e.contactDmg, state);
            bestTarget.target = e;
            if(dead){ const ci = state.creatures.indexOf(bestTarget); if(ci!==-1) killCreature(state, ci); }
          }
          // incidental collision: damage creatures and aggro them to this enemy
          for(let ci=state.creatures.length-1; ci>=0; ci--){
            const c = state.creatures[ci];
            const dc = Math.hypot(c.x - e.x, c.y - e.y);
            const cdst = e.r + (c.r||12) + 4;
            if(dc <= cdst && !e.inWater){
              const dead = applyDamageToCreature(c, e.contactDmg, state);
              c.target = e;
              if(dead) killCreature(state, ci);
            }
          }
        }
      }
    }

    // simple ability casting for enemies (respect silence/stun)
    const cc2 = getCcState(e);
    if(!cc2.stunned && !cc2.silenced) npcUpdateAbilities(state, e, dt, 'enemy');

    // passive auto-level catch-up to player progression over time
    const targetLevel = Math.max(1, Math.floor(state.campaign.time/60) + 1, (state.factionTech?.[e.team]||1)*3);
    if(e.level < targetLevel){
      const prev = e.level||1;
      const hpRatio = e.hp / (e.maxHp || 1); // Preserve HP ratio
      e.level = targetLevel;
      applyClassToUnit(e, e.variant);
      e.hp = Math.max(1, Math.round(e.maxHp * hpRatio)); // Restore HP ratio instead of full heal
      npcInitAbilities(e);
      state.ui.toast?.(`<span class="neg">Enemy (${e.team||'AI'}) leveled up to <b>${e.level}</b>.</span>`);
    }

    // Upgrade armor rarity when team tech increases
    const expectedTier = (state.factionTech?.[e.team]) || 1;
    if((e._rarityTier||1) < expectedTier){
      const role = e.variant || 'warrior';
      const rarity = getRarityByTier(expectedTier);
      const set = roleArmorSet(role, rarity);
      e.equipment = e.equipment || {};
      for(const [slot,item] of Object.entries(set)) e.equipment[slot] = item;
      e._rarityTier = expectedTier;
      state.ui.toast?.(`<span class="neg">Enemy (${e.team||'AI'}) armor improved to <b>${rarity.name}</b>.</span>`);
    }

    if(e.hp<=0) killEnemy(state, i, true);
  }
}

function updateLootTTL(state, dt){
  for(let i=state.loot.length-1;i>=0;i--){
    state.loot[i].timeLeft -= dt;
    if(state.loot[i].timeLeft<=0) state.loot.splice(i,1);
  }
}

function updateCampaignPoints(state, dt){
  if(state.campaignEnded) return;
  const playerFlags=getFriendlyFlags(state).length;
  const enemyFlags=getNonPlayerFlags(state).length;
  const PPS=1.2;
  state.campaign.playerPoints += playerFlags*PPS*dt;
  state.campaign.enemyPoints += enemyFlags*PPS*dt;
  // Per-team points tracking for rubberband logic
  const teamAFlags = getFlagsForTeam(state, 'teamA').length;
  const teamBFlags = getFlagsForTeam(state, 'teamB').length;
  const teamCFlags = getFlagsForTeam(state, 'teamC').length;
  state.teamPoints.player = (state.teamPoints.player||0) + playerFlags*PPS*dt;
  state.teamPoints.teamA = (state.teamPoints.teamA||0) + teamAFlags*PPS*dt;
  state.teamPoints.teamB = (state.teamPoints.teamB||0) + teamBFlags*PPS*dt;
  state.teamPoints.teamC = (state.teamPoints.teamC||0) + teamCFlags*PPS*dt;
  // Campaign progress tracked by points but campaign DOES NOT end early by points.
  // Economy: accrue faction gold for held flags over time
  const GOLD_PER_FLAG_PER_SEC = 3.0;
  // Player gold drip
  state.factionGold.player = (state.factionGold.player||0) + playerFlags*GOLD_PER_FLAG_PER_SEC*dt;
  // AI team gold drip
  const teams = ['teamA','teamB','teamC'];
  for(const team of teams){
    const flags = getFlagsForTeam(state, team).length;
    state.factionGold[team] = (state.factionGold[team]||0) + flags*GOLD_PER_FLAG_PER_SEC*dt;
  }
  // Auto tech upgrades when enough gold is banked
  const COST_PER_TIER = 1200;
  for(const key of ['player','teamA','teamB','teamC']){
    while((state.factionGold[key]||0) >= COST_PER_TIER && (state.factionTech[key]||1) < 5){
      state.factionGold[key] -= COST_PER_TIER;
      state.factionTech[key] = (state.factionTech[key]||1) + 1;
      // Optional: toast for player only
      if(key==='player') state.ui.toast(`<b>Squad technology advanced</b> to Tier ${state.factionTech[key]}.`);
    }
  }

  // Rubberband assistance: award gold every 60 seconds to trailing teams (shorter for testing)
  const cfg = state.rubberband || { gapThreshold:60, closeThreshold:30, baseTickGold:250, interval:60, nonLastScale:0.6, maxAssistPerTeam:10000 };
  const now = state.campaign.time||0;
  const teamKeys = ['player','teamA','teamB','teamC'];
  // Determine leader and last place by points
  const pts = {
    player: state.teamPoints.player||0,
    teamA: state.teamPoints.teamA||0,
    teamB: state.teamPoints.teamB||0,
    teamC: state.teamPoints.teamC||0
  };
  let leaderKey = 'player', leaderPts = pts.player;
  for(const k of teamKeys){ if(pts[k] > leaderPts){ leaderPts = pts[k]; leaderKey = k; } }
  let lastKey = 'player', lastPts = pts.player;
  for(const k of teamKeys){ if(pts[k] < lastPts){ lastPts = pts[k]; lastKey = k; } }
  for(const k of teamKeys){
    if(k===leaderKey) continue;
    const gap = leaderPts - pts[k];
    if(gap >= cfg.gapThreshold){
      const next = (state.rubberbandNext?.[k])||0;
      const awarded = (state.rubberbandAwarded?.[k])||0;
      if(now >= next && awarded < cfg.maxAssistPerTeam){
        // Scale bonus: last place gets full amount, others reduced
        const scale = (k===lastKey) ? 1.0 : (cfg.nonLastScale||0.6);
        const amt = Math.round((cfg.baseTickGold||250) * scale);
        state.factionGold[k] = (state.factionGold[k]||0) + amt;
        state.rubberbandAwarded[k] = awarded + amt;
        state.rubberbandNext[k] = now + (cfg.interval||60);
        // Notify
        const color = k==='player' ? '#6cf' : '#f66';
        state.ui.toast?.(`<span style="color:${color}"><b>${k}</b></span> received assistance: +${amt} gold`);
      }
    } else if(gap <= cfg.closeThreshold){
      // If close to leader, delay next tick further to avoid oscillation
      state.rubberbandNext[k] = Math.max(state.rubberbandNext[k]||0, now + (cfg.interval||60));
    }
  }
}

function die(state){
  if(state.player.dead) return;
  state.player.dead=true;
  state.player.respawnT=2.0;
  state.ui.toast('<span class="neg"><b>You died.</b></span> Respawning at nearest captured flag...');
}

function respawn(state){
  const flags = getFriendlyFlags(state);
  // Choose nearest owned flag; fallback to home base if none
  const px = state.player.x||0, py = state.player.y||0;
  let hb = null; let bestD = Infinity;
  for(const f of flags){ const d = Math.hypot(f.x-px, f.y-py); if(d < bestD){ bestD = d; hb = f; } }
  if(!hb) hb = playerHome(state) || flags[0];
  const st=currentStats(state);
  state.player.x=hb.x; state.player.y=hb.y;
  state.player.hp=st.maxHp; state.player.mana=st.maxMana; state.player.stam=st.maxStam;
  state.player.shield=0;
  state.player.dead=false;
  state.ui.toast(`Respawned at <b>${hb.name||'flag'}</b>.`);
}

function tryCastSlot(state, idx){
  if(state.player.dead || state.campaignEnded) return;
  const sk=getAbilityById(state.abilitySlots[idx]);
  if(!sk || sk.type!=='active') return;
  const weaponType = (state.player.equip?.weapon?.weaponType || '').toLowerCase();
  const isStaff = weaponType.includes('staff');
  if(sk.category && sk.category.includes('Healing Staff') && !weaponType.includes('healing staff')){
    state.ui.toast('Equip a Healing Staff to cast this.');
    return;
  }
  if(sk.category && sk.category.includes('Destruction Staff') && !isStaff){
    state.ui.toast('Equip a staff to use destruction spells.');
    return;
  }
  if(sk.targetType === 'projectile' && !isStaff){
    state.ui.toast('Ranged abilities require a staff equipped.');
    return;
  }
  if(state.player.cd[idx]>0) return;
  const st=currentStats(state);
  if(state.player.mana<sk.mana){ state.ui.toast('<span class="neg">Not enough mana.</span>'); return; }
  state.player.mana -= sk.mana;
  state.player.cd[idx]=sk.cd*(1-st.cdr);
  const wm = getWorldMouse(state);
  const a=Math.atan2(wm.y-state.player.y, wm.x-state.player.x);

  // auto-targeting helpers
  const findLowestHealthAlly = (range, excludePlayer=false) => {
    let best = excludePlayer ? null : state.player;
    let bestHp = excludePlayer ? Infinity : state.player.hp / currentStats(state).maxHp;
    for(const f of state.friendlies){
      if(f.respawnT>0) continue;
      const d = Math.hypot(f.x-state.player.x, f.y-state.player.y);
      if(d > range) continue;
      const hpRatio = f.hp / (f.maxHp || 1);
      if(hpRatio < bestHp){ bestHp = hpRatio; best = f; }
    }
    return best;
  };
  
  const findClosestEnemy = (range) => {
    let best = null;
    let bestD = range + 1;
    for(let i=0; i<state.enemies.length; i++){
      const e = state.enemies[i];
      if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
      const d = Math.hypot(e.x-state.player.x, e.y-state.player.y);
      if(d < bestD){ bestD = d; best = e; }
    }
    return best;
  };

  // helpers
  const areaDamage = (cx,cy,radius,dmg,dotId=null,buffId=null)=>{
    for(let i=state.enemies.length-1;i>=0;i--){
      const e=state.enemies[i];
      if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
      if(Math.hypot(e.x-cx,e.y-cy)<=radius){
        const res=applyDamageToEnemy(e,dmg,st,state,true);
        lifestealFrom(state,res.dealt,st);
        if(dotId) applyDotTo(e, dotId);
        if(buffId) applyBuffTo(e, buffId);
        if(e.hp<=0) killEnemy(state,i,true);
      }
    }
  };
  const healSelf = (amount)=>{ state.player.hp = clamp(state.player.hp + amount, 0, st.maxHp); };
  const healAlliesAround = (cx,cy,radius,amount)=>{
    healSelf(amount);
    for(const f of state.friendlies){ if(f.respawnT>0) continue; if(Math.hypot(f.x-cx,f.y-cy)<=radius){ f.hp = clamp(f.hp + amount, 0, f.maxHp||80); } }
  };
  const shieldAlliesAround = (cx,cy,radius,amount)=>{
    state.player.shield = clamp(state.player.shield + amount, 0, 420);
    for(const f of state.friendlies){ if(f.respawnT>0) continue; if(Math.hypot(f.x-cx,f.y-cy)<=radius){ f.shield = clamp((f.shield||0)+amount*0.6,0,320); } }
  };
  const reduceCooldowns = (pct)=>{ for(let i=0;i<state.player.cd.length;i++){ state.player.cd[i] = Math.max(0, state.player.cd[i] - pct*state.player.cd[i]); } };
  const applyBuffSelf = (buffId)=>{ try{ applyBuffTo(state.player, buffId); }catch{} };
  const applyBuffAlliesAround = (cx,cy,radius,buffId)=>{
    applyBuffSelf(buffId);
    for(const f of state.friendlies){ if(f.respawnT>0) continue; if(Math.hypot(f.x-cx,f.y-cy)<=radius){ try{ applyBuffTo(f, buffId); }catch{} } }
  };

  // --- ability effects ---
  switch(sk.id){
    // Destruction Staff
    case 'arc_bolt':{
      spawnProjectile(state, state.player.x,state.player.y,a,460,5,14+st.atk*1.0,0,true,{ dotId:'shock', team:'player', element:'shock', maxRange:300 });
      const vx = Math.cos(a)*460, vy = Math.sin(a)*460;
      state.effects.bolts.push({ x: state.player.x + Math.cos(a)*12, y: state.player.y + Math.sin(a)*12, vx, vy, life: 0.9 });
      break;
    }
    case 'chain_light':{
      let hits=0, last=null;
      for(let hop=0; hop<5; hop++){
        let best=-1, bestD=999999;
        const ox=last?last.x:state.player.x;
        const oy=last?last.y:state.player.y;
        for(let i=0;i<state.enemies.length;i++){
          const e=state.enemies[i];
          if(last && e===last) continue;
          const d=Math.hypot(e.x-ox, e.y-oy);
          if(d<bestD){bestD=d; best=i;}
        }
        if(best===-1 || bestD>220) break;
        const e=state.enemies[best];
        const dmg=(14+st.atk*0.9)*(1-hop*0.12);
        const res=applyDamageToEnemy(e,dmg,st,state,true);
        lifestealFrom(state,res.dealt,st);
        applyDotTo(e,'shock');
        applyBuffTo(e,'slow');
        if(e.hp<=0) killEnemy(state,best,true);
        last=e; hits++;
      }
      state.ui.toast(`Chain Zap (${hits} hits)`);
      break;
    }
    case 'meteor_slam':{
      // Auto-target closest enemy in range
      const target = findClosestEnemy(400);
      const x = target ? target.x : wm.x;
      const y = target ? target.y : wm.y;
      const radius=115,dmg=24+st.atk*1.15;
      areaDamage(x,y,radius,dmg,'burn','slow');
      state.effects.flashes.push({ x, y, r: radius, life: 0.9, color: '#ff9a3c' });
      state.effects.slashes.push({ x, y, range: radius, arc: Math.PI*2, dir: 0, t: 0, color: '#ff4500' });
      state.ui.toast('Meteor Slam');
      break;
    }
    case 'piercing_lance':{
      spawnProjectile(state, state.player.x,state.player.y,a,560,6,20+st.atk*1.3,3,true,{ dotId:'bleed', team:'player', element:'arcane', maxRange:350 });
      state.ui.toast('Piercing Lance');
      break;
    }
    case 'gravity_well':{
      // Auto-target closest enemy in range
      const target = findClosestEnemy(350);
      const x = target ? target.x : wm.x;
      const y = target ? target.y : wm.y;
      state.effects.wells.push({x,y,r:150,timeLeft:3.6,tick:0.5,tickLeft:0.5,dmgPerTick:6+st.atk*0.35,pull:98,color:'#9b7bff'});
      state.effects.flashes.push({ x, y, r: 150, life: 0.6, color: '#9b7bff' });
      state.ui.toast('Gravity Well');
      break;
    }

    // Healing Staff
    case 'heal_burst':{
      const instant = 18 + st.maxHp*0.10;
      healAlliesAround(state.player.x,state.player.y,120,instant);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 120, life: 0.5, color: '#ffd760' });
      state.effects.heals.push({t:4.0,tick:0.5,tl:0.5,amt:(2.0 + st.maxHp*0.012)});
      applyBuffAlliesAround(state.player.x,state.player.y,120,'regeneration');
      state.ui.toast(`Heal Burst: +${Math.round(instant)} HP`);
      break;
    }
    case 'ward_barrier':{
      const amount=32+st.atk*1.05 + (st.shieldGain??0);
      shieldAlliesAround(state.player.x,state.player.y,140,amount);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 140, life: 0.6, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x,state.player.y,140,'fortified');
      state.ui.toast(`Ward Barrier: +${Math.round(amount)} shield`);
      break;
    }
    case 'renewal_field':{
      // Apply a regen to self and nearby allies via periodic heals
      const amt = 4 + st.maxHp*0.01;
      state.effects.heals.push({t:5.0,tick:0.7,tl:0.7,amt:amt, targets:[state.player, ...state.friendlies.filter(f=>f.respawnT<=0)]});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 140, life: 0.6, color: '#ffd760' });
      applyBuffAlliesAround(state.player.x,state.player.y,140,'regeneration');
      state.ui.toast('Renewal Field active');
      break;
    }
    case 'cleanse_wave':{
      const amt = 12 + st.maxHp*0.04;
      healAlliesAround(state.player.x,state.player.y,120,amt);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 120, life: 0.6, color: '#ffd760' });
      const shield = 18 + st.def*0.8;
      shieldAlliesAround(state.player.x,state.player.y,120,shield);
      applyBuffAlliesAround(state.player.x,state.player.y,120,'clarity');
      state.ui.toast('Cleanse Wave');
      break;
    }
    case 'beacon_of_light':{
      const radius=140, amt=10 + st.maxHp*0.025;
      // auto-target lowest health ally in extended range
      const target = findLowestHealthAlly(200);
      const castX = target ? target.x : wm.x;
      const castY = target ? target.y : wm.y;
      // immediate pulse + rolling regen
      healAlliesAround(castX,castY,radius,amt);
      state.effects.heals.push({t:6.0,tick:1.0,tl:1.0,amt:amt*0.5, beacon:{x:castX,y:castY,r:radius}});
      state.effects.flashes.push({ x: castX, y: castY, r: radius, life: 0.6, color: '#ffd760' });
      applyBuffAlliesAround(castX,castY,radius,'regeneration');
      state.ui.toast('Beacon of Light placed');
      break;
    }

    // Melee Weapons
    case 'slash':{
      pushSlashEffect(state, {t:0.12,arc:1.15,range:64,dmg:6+st.atk*0.75,dir:a});
      break;
    }
    case 'blade_storm':{
      state.effects.storms.push({t:2.6, tick:0.25, tl:0.25, r:120, dmg:4+st.atk*0.45, dotId:'bleed'});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 120, life: 0.5, color: '#9b7bff' });
      state.ui.toast('Blade Storm');
      break;
    }
    case 'cleave':{
      pushSlashEffect(state, {t:0.18,arc:1.6,range:86,dmg:10+st.atk*1.1, dotId:'bleed',dir:a});
      break;
    }
    case 'leap_strike':{
      const dist = Math.min(260, Math.hypot(wm.x-state.player.x, wm.y-state.player.y));
      const ax = Math.cos(a), ay = Math.sin(a);
      state.player.x = clamp(state.player.x + ax*dist, 0, state.engine.canvas.width);
      state.player.y = clamp(state.player.y + ay*dist, 0, state.engine.canvas.height);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 110, life: 0.7, color: '#9b7bff' });
      // Leap strike applies bleed, slow, and adds stun for more CC
      const enemiesToHit = state.enemies.filter(e => Math.hypot(e.x-state.player.x, e.y-state.player.y) <= 110);
      for(const e of enemiesToHit){
        applyDotTo(e, 'bleed');
        applyBuffTo(e, 'slow');
        applyBuffTo(e, 'stun');
        const dmg = 16+st.atk*1.2;
        applyDamageToEnemy(e, dmg, currentStats(state), state, true);
      }
      state.ui.toast('Leap Strike');
      break;
    }
    case 'warcry':{
      areaDamage(state.player.x,state.player.y,90,4+st.atk*0.4);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 90, life: 0.6, color: '#9b7bff' });
      shieldAlliesAround(state.player.x,state.player.y,120,20+st.def*0.8);
      state.player.stam = clamp(state.player.stam + 25, 0, st.maxStam);
      applyBuffAlliesAround(state.player.x,state.player.y,120,'swift_strikes');
      break;
    }

    // Mage
    case 'mage_divine_touch':{
      // Targeted heal with HoT
      const instant = 25 + st.maxHp*0.12;
      if(state.selectedUnit && state.selectedUnit.unit && state.selectedUnit.unit.hp > 0){
        const target = state.selectedUnit.unit;
        if(state.selectedUnit.type === 'player'){
          healSelf(instant);
        } else if(state.selectedUnit.type === 'friendly'){
          target.hp = Math.min(target.hp + instant, target.maxHp);
        }
        // Apply HoT
        state.effects.heals.push({t:4.0,tick:0.8,tl:0.8,amt:3+st.maxHp*0.015, targets:[target]});
        applyBuffSelf('healing_empowerment');
        state.ui.toast(`Divine Touch: +${Math.round(instant)} HP`);
      } else {
        healSelf(instant);
        state.effects.heals.push({t:4.0,tick:0.8,tl:0.8,amt:3+st.maxHp*0.015, targets:[state.player]});
        applyBuffSelf('healing_empowerment');
        state.ui.toast(`Divine Touch (self): +${Math.round(instant)} HP`);
      }
      break;
    }
    case 'mage_sacred_ground':{
      // Offensive consecration: deals damage over time in the area (no healing)
      // Auto-target closest enemy in range
      const target = findClosestEnemy(300);
      const x = target ? target.x : wm.x;
      const y = target ? target.y : wm.y;
      const radius = 140;
      const dmgTick = 10 + st.atk*0.65;
      state.effects.wells.push({x,y,r:radius,timeLeft:6.0,tick:0.8,tickLeft:0.8,dmgPerTick:dmgTick,pull:0,color:'#ffb347'});
      state.effects.flashes.push({ x, y, r: radius, life: 0.6, color: '#ffb347' });
      applyBuffAlliesAround(x, y, radius, 'blessed');
      state.ui.toast('Sacred Ground sears foes');
      break;
    }
    case 'mage_radiant_aura':{
      // Radiant barrier: grants shields and speed, no direct healing
      const radius = 150;
      const shield = 24 + st.def*0.9;
      shieldAlliesAround(state.player.x,state.player.y,radius,shield);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: radius, life: 0.5, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x, state.player.y, radius, 'radiance');
      state.ui.toast('Radiant Aura shields allies');
      break;
    }
    case 'mage_arcane_missiles':{
      // Projectile with DoT and Silence debuff
      const spread = 0.15;
      const baseDmg = 12+st.atk*0.9;
      [-spread,0,spread].forEach(off=>{
        spawnProjectile(state, state.player.x, state.player.y, a+off, 480, 5, baseDmg, 0, true, { dotId: 'arcane_burn', buffId: 'silence', team: 'player', element:'arcane', maxRange:280 });
      });
      state.ui.toast('Arcane Missiles');
      break;
    }
    case 'mage_time_warp':{
      // Cooldown reduction
      reduceCooldowns(0.45);
      applyBuffSelf('temporal_flux');
      state.player.cd[idx] *= 0.6;
      state.ui.toast('Time Warp');
      break;
    }

    // Knight
    case 'knight_shield_wall':{
      shieldAlliesAround(state.player.x,state.player.y,150,40+st.def*1.2);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 150, life: 0.6, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x,state.player.y,150,'guardian_stance');
      break;
    }
    case 'knight_justice_strike':{
      const slash = pushSlashEffect(state, {t:0.16,arc:1.0,range:92,dmg:18+st.atk*1.4, dotId:'bleed',dir:a});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 92, life: 0.5, color: slash.color });
      break;
    }
    case 'knight_taunt':{
      areaDamage(state.player.x,state.player.y,110,8+st.atk*0.7,null,'vulnerability');
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 110, life: 0.6, color: '#9b7bff' });
      shieldAlliesAround(state.player.x,state.player.y,110,26+st.def*0.9);
      applyBuffSelf('iron_will');
      break;
    }
    case 'knight_rally':{
      healAlliesAround(state.player.x,state.player.y,150,16+st.maxHp*0.04);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 150, life: 0.6, color: '#ffd760' });
      shieldAlliesAround(state.player.x,state.player.y,150,18+st.def*0.7);
      applyBuffAlliesAround(state.player.x,state.player.y,150,'battle_fury');
      break;
    }
    case 'knight_banner':{
      state.effects.flashes.push({ x: wm.x, y: wm.y, r: 140, life: 0.7, color: '#ffb347' });
      applyBuffAlliesAround(wm.x,wm.y,140,'vigor');
      break;
    }

    // Warrior
    case 'warrior_life_leech':{
      const slash = pushSlashEffect(state, {t:0.16,arc:1.0,range:82,dmg:16+st.atk*1.2, leech:true, dotId:'bleed',dir:a});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 82, life: 0.5, color: slash.color });
      break;
    }
    case 'warrior_fortitude':{
      shieldAlliesAround(state.player.x,state.player.y,140,24+st.def*1.0);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 140, life: 0.5, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x,state.player.y,140,'fortified');
      break;
    }
    case 'warrior_berserk':{
      state.player.stam = clamp(state.player.stam + 35, 0, st.maxStam);
      reduceCooldowns(0.18);
      applyBuffSelf('berserk');
      break;
    }
    case 'warrior_cleave':{
      const slash = pushSlashEffect(state, {t:0.20,arc:1.7,range:92,dmg:20+st.atk*1.35, dotId:'bleed', buffId:'weakness',dir:a});
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 92, life: 0.6, color: slash.color });
      break;
    }
    case 'warrior_charge':{
      const chargeDist = 240;
      const ax = Math.cos(a), ay = Math.sin(a);
      state.player.x = clamp(state.player.x + ax*chargeDist, 0, state.engine.canvas.width);
      state.player.y = clamp(state.player.y + ay*chargeDist, 0, state.engine.canvas.height);
      areaDamage(state.player.x,state.player.y,90,14+st.atk*1.1,'bleed','stun');
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 90, life: 0.7, color: '#9b7bff' });
      state.effects.slashes.push({ x: state.player.x, y: state.player.y, range: 90, arc: Math.PI*2, dir: a, t: 0, color: '#9b7bff' });
      applyBuffSelf('haste');
      break;
    }

    // Tank
    case 'tank_ground_slam':{
      areaDamage(state.player.x,state.player.y,120,14+st.atk*1.0,'burn','slow');
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 120, life: 0.7, color: '#ff9a3c' });
      break;
    }
    case 'tank_iron_skin':{
      shieldAlliesAround(state.player.x,state.player.y,0,44+st.def*1.3);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 20, life: 0.5, color: '#ffb347' });
      healSelf(8+st.maxHp*0.02);
      applyBuffSelf('iron_will');
      break;
    }
    case 'tank_bodyguard':{
      shieldAlliesAround(state.player.x,state.player.y,160,28+st.def*1.0);
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 160, life: 0.6, color: '#ffb347' });
      applyBuffAlliesAround(state.player.x,state.player.y,160,'guardian_stance');
      break;
    }
    case 'tank_anchor':{
      areaDamage(state.player.x,state.player.y,90,8+st.atk*0.6,null,'stun');
      state.effects.flashes.push({ x: state.player.x, y: state.player.y, r: 90, life: 0.6, color: '#9b7bff' });
      shieldAlliesAround(state.player.x,state.player.y,120,26+st.def*0.9);
      applyBuffAlliesAround(state.player.x,state.player.y,120,'guardian_stance');
      break;
    }
    case 'tank_seismic_wave':{
      spawnProjectile(state, state.player.x,state.player.y,a,420,6,18+st.atk*1.05,2,true,{ dotId:'shock', team:'player', element:'shock', maxRange:320 });
      break;
    }

    default:
      state.ui.toast(`Cast ${sk.name}`);
  }
}

function updateHeals(state, dt){
  const st=currentStats(state);
  for(let i=state.effects.heals.length-1;i>=0;i--){
    const h=state.effects.heals[i];
    h.t-=dt; h.tl-=dt;
    if(h.tl<=0){
      h.tl+=h.tick;
      const targets = h.targets ? (Array.isArray(h.targets)?h.targets:[h.targets]) : [state.player];
      if(h.beacon){
        const {x,y,r} = h.beacon;
        for(const t of targets){ if(!t) continue; if(Math.hypot((t.x||state.player.x)-x,(t.y||state.player.y)-y)<=r){ const maxHp = t.maxHp || st.maxHp; t.hp = clamp(t.hp + h.amt, 0, maxHp); } }
      } else {
        for(const t of targets){ if(!t) continue; const maxHp = t.maxHp || st.maxHp; t.hp = clamp(t.hp + h.amt, 0, maxHp); }
      }
    }
    if(h.t<=0) state.effects.heals.splice(i,1);
  }
}

function updateSlashes(state, dt){
  if(state.effects.slashes.length===0) return;
  const st=currentStats(state);
  const wm = getWorldMouse(state);
  for(let i=state.effects.slashes.length-1;i>=0;i--){
    const s=state.effects.slashes[i];
    s.t-=dt;
    if(s.t<=0){ state.effects.slashes.splice(i,1); continue; }
    
    // Use slash origin position (x,y) if available, otherwise default to player position
    const originX = s.x !== undefined ? s.x : state.player.x;
    const originY = s.y !== undefined ? s.y : state.player.y;
    const isPlayerSlash = (s.x === undefined || (s.x === state.player.x && s.y === state.player.y));
    
    const ang = (typeof s.dir === 'number') ? s.dir : Math.atan2(wm.y-originY, wm.x-originX);
    
    // Only apply damage if this is a player slash (team check)
    if(isPlayerSlash || s.team === 'player'){
      for(let ei=state.enemies.length-1; ei>=0; ei--){
        const e=state.enemies[ei];
        if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
        const dx=e.x-originX, dy=e.y-originY;
        const d=Math.hypot(dx,dy);
        if(d>s.range) continue;
        const ea=Math.atan2(dy,dx);
        let diff=Math.abs(ea-ang);
        diff=Math.min(diff, Math.PI*2-diff);
        if(diff<=s.arc/2){
          const res=applyDamageToEnemy(e,s.dmg,st,state,true);
          lifestealFrom(state,res.dealt,st);
          if(s.leech){ state.player.hp = clamp(state.player.hp + res.dealt*0.5, 0, st.maxHp); }
          if(s.dotId) applyDotTo(e, s.dotId);
          if(e.hp<=0) killEnemy(state, ei, true);
        }
      }
    }
  }
}

function updateStorms(state, dt){
  const st=currentStats(state);
  for(let i=state.effects.storms.length-1;i>=0;i--){
    const s=state.effects.storms[i];
    s.t-=dt; s.tl-=dt;
    if(s.tl<=0){
      s.tl+=s.tick;
      for(let ei=state.enemies.length-1; ei>=0; ei--){
        const e=state.enemies[ei];
        if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
        if(Math.hypot(e.x-state.player.x,e.y-state.player.y)<=s.r){
          const res=applyDamageToEnemy(e,s.dmg,st,state,true);
          lifestealFrom(state,res.dealt,st);
          if(s.dotId) applyDotTo(e, s.dotId);
          if(e.hp<=0) killEnemy(state, ei, true);
        }
      }
    }
    if(s.t<=0) state.effects.storms.splice(i,1);
  }
}

function updateWells(state, dt){
  for(let wi=state.effects.wells.length-1; wi>=0; wi--){
    const w=state.effects.wells[wi];
    w.timeLeft-=dt; w.tickLeft-=dt;

    for(let i=state.enemies.length-1;i>=0;i--){
      const e=state.enemies[i];
      if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
      const dx=w.x-e.x, dy=w.y-e.y;
      const dist=Math.hypot(dx,dy)||1;
      if(dist<=w.r){
        e.x += (dx/dist)*w.pull*dt;
        e.y += (dy/dist)*w.pull*dt;
      }
    }

    if(w.tickLeft<=0){
      w.tickLeft+=w.tick;
      const stNow=currentStats(state);
      for(let i=state.enemies.length-1;i>=0;i--){
        const e=state.enemies[i];
        if(Math.hypot(e.x-w.x, e.y-w.y)<=w.r){
          const res=applyDamageToEnemy(e,w.dmgPerTick,stNow,state,true);
          lifestealFrom(state,res.dealt,stNow);
          applyBuffTo(e,'slow');
          applyBuffTo(e,'curse');
          if(e.hp<=0) killEnemy(state,i,true);
        }
      }
    }

    if(w.timeLeft<=0) state.effects.wells.splice(wi,1);
  }
}

function updateProjectiles(state, dt){
  const st=currentStats(state);
  for(let pi=state.projectiles.length-1; pi>=0; pi--){
    const p=state.projectiles[pi];
    p.life-=dt;
    p.x += p.vx*dt;
    p.y += p.vy*dt;
    const worldW = state.mapWidth || state.engine.canvas.width;
    const worldH = state.mapHeight || state.engine.canvas.height;
    // Check max range
    if(p.maxRange && p.startX !== undefined && p.startY !== undefined){
      const distFromStart = Math.hypot(p.x - p.startX, p.y - p.startY);
      if(distFromStart > p.maxRange){
        state.projectiles.splice(pi,1);
        continue;
      }
    }
    if(p.life<=0 || p.x<-80 || p.y<-80 || p.x>worldW+80 || p.y>worldH+80){
      state.projectiles.splice(pi,1);
      continue;
    }

    if(p.fromPlayer){
      for(let ei=state.enemies.length-1; ei>=0; ei--){
        const e=state.enemies[ei];
        if(state.inDungeon && e.dungeonId !== state.inDungeon) continue;
        if(Math.hypot(p.x-e.x,p.y-e.y)<=e.r+p.r){
          const res=applyDamageToEnemy(e,p.dmg,st,state,true);
          lifestealFrom(state,res.dealt,st);
          if(p.dotId) applyDotTo(e, p.dotId);
          if(e.hp<=0) killEnemy(state, ei, true);
          if(p.pierce>0) p.pierce-=1;
          else state.projectiles.splice(pi,1);
          break;
        }
      }
      // player projectiles can hit creatures (neutral)
      for(let ci=state.creatures.length-1; ci>=0; ci--){
        const c = state.creatures[ci];
        if(Math.hypot(p.x-c.x, p.y-c.y) <= (c.r||12) + p.r){
          const dead = applyDamageToCreature(c, p.dmg, state);
          c.target = state.player;
          if(dead) killCreature(state, ci);
          if(p.pierce>0) p.pierce-=1; else { state.projectiles.splice(pi,1); break; }
        }
      }
    } else {
      // enemy or non-player projectiles can hit friendlies and player
      for(let fi=state.friendlies.length-1; fi>=0; fi--){
        const f = state.friendlies[fi];
        if(f.respawnT>0) continue;
        if(Math.hypot(p.x-f.x, p.y-f.y) <= f.r + p.r){
          applyShieldedDamage(state, f, p.dmg);
          if(f.hp<=0){ killFriendly(state, fi, true); }
          state.projectiles.splice(pi,1);
          break;
        }
      }
      if(pi>=state.projectiles.length) continue; // removed by friendly hit
      if(!state.player.dead && Math.hypot(p.x-state.player.x,p.y-state.player.y)<=state.player.r+p.r){
        applyDamageToPlayer(state, p.dmg, st);
        // potential enemy projectile DoTs could be applied here similarly
        state.projectiles.splice(pi,1);
      }
    }
  }
}

function updateBolts(state, dt){
  if(!state.effects.bolts) return;
  for(let i=state.effects.bolts.length-1;i>=0;i--){
    const b=state.effects.bolts[i];
    b.life -= dt; if(b.life<=0){ state.effects.bolts.splice(i,1); continue; }
    b.x += (b.vx||0)*dt; b.y += (b.vy||0)*dt;
  }
}

function updateFlashes(state, dt){
  if(!state.effects.flashes) return;
  for(let i=state.effects.flashes.length-1;i>=0;i--){
    const f=state.effects.flashes[i];
    f.life -= dt; if(f.life<=0) state.effects.flashes.splice(i,1);
  }
}

function updateDots(state, dt){
  const st = currentStats(state);
  const typeToResist = { fire:'res_fire', ice:'res_ice', lightning:'res_lightning', nature:'res_poison', poison:'res_poison', physical:'res_bleed', shadow:'res_shadow', arcane:'res_arcane' };
  const getResistPct = (unit, type)=>{
    const key = typeToResist[type];
    if(!key) return 0;
    let val = 0;
    if(unit === state.player) val = st[key] || 0;
    else val = (unit?.resists?.[key]) || (unit?.[key]) || 0;
    return clamp(val, -0.8, 0.8);
  };
  const process = (unit)=>{
    if(!unit || !unit.dots || unit.dots.length===0) return;
    for(let di=unit.dots.length-1; di>=0; di--){
      const d = unit.dots[di];
      d.t = Math.max(0, d.t - dt);
      d.tl = (d.tl ?? 1.0) - dt;
      if(d.tl <= 0){
        // apply tick
        const base = d.damage || (DOT_REGISTRY[d.id]?.damage) || 0;
        const type = d.type || DOT_REGISTRY[d.id]?.type;
        const resist = getResistPct(unit, type);
        const dmg = base * (1 - resist) * (d.stacks || 1);
        if(dmg>0){
          if(unit === state.player){
            applyDamageToPlayer(state, dmg, st);
          } else if(state.enemies.includes(unit)){
            const res = applyDamageToEnemy(unit, dmg, st, state, true);
            if(unit.hp <= 0){ const idx = state.enemies.indexOf(unit); if(idx!==-1) killEnemy(state, idx, true); }
          } else if(state.friendlies.includes(unit)){
            applyShieldedDamage(state, unit, dmg);
            if(unit.hp <= 0){ unit.dead = true; unit.respawnT = 10; }
          }
        }
        d.tl = DOT_REGISTRY[d.id]?.interval || 1.0;
      }
      if(d.t <= 0) unit.dots.splice(di,1);
    }
  };
  process(state.player);
  for(const e of state.enemies) process(e);
  for(const f of state.friendlies){ if(f.respawnT<=0) process(f); }
}

function applyBuffTo(entity, buffId){
  const meta = BUFF_REGISTRY && BUFF_REGISTRY[buffId];
  if(!meta) return;
  entity.buffs = entity.buffs || [];
  const existing = entity.buffs.find(b=>b.id===buffId);
  const prevStacks = existing ? (existing.stacks||1) : 0;
  const cap = meta.maxStacks || 5;
  if(existing){
    existing.t = meta.duration || 5.0;
    existing.tl = (meta.ticks?.interval) || 1.0;
    const nextStacks = (existing.stacks||1)+1;
    existing.stacks = Math.min(cap, nextStacks);
  } else {
    entity.buffs.push({ id: buffId, t: meta.duration || 5.0, tl: (meta.ticks?.interval) || 1.0, stacks:1 });
  }

  // immediate shield gain when a buff carries a shield stat so the HUD reflects it
  if(meta.stats && typeof meta.stats.shield === 'number'){
    const cap = entity.shieldCap || entity.maxShield || 420;
    const stacks = existing ? existing.stacks : 1;
    const gainStacks = Math.max(1, stacks - prevStacks);
    const gain = meta.stats.shield * gainStacks;
    entity.shield = clamp((entity.shield||0) + gain, 0, cap);
  }
}

function applyDotTo(entity, dotId, opts={}){
  const meta = DOT_REGISTRY && DOT_REGISTRY[dotId];
  if(!meta || !entity) return;
  entity.dots = entity.dots || [];
  const duration = opts.duration || meta.duration || 6.0;
  const interval = meta.interval || 1.0;
  const cap = meta.maxStacks || 5;
  const damage = (meta.damage || 0) * (opts.powerMult || 1);
  const type = meta.type;
  const buffId = opts.buffId || meta.buffId;
  const existing = entity.dots.find(d=>d.id===dotId);
  if(existing){
    existing.t = duration;
    existing.tl = interval;
    existing.damage = damage || meta.damage;
    existing.type = type;
    const next = (existing.stacks||1)+1;
    existing.stacks = Math.min(cap, next);
  }
  else entity.dots.push({ id: dotId, t: duration, tl: interval, damage: damage || meta.damage, type, stacks:1 });
  if(buffId) applyBuffTo(entity, buffId);
}

function getCcState(unit){
  const res = { speedMod:0, rooted:false, stunned:false, silenced:false };
  if(!unit || !unit.buffs) return res;
  for(const b of unit.buffs){
    const meta = BUFF_REGISTRY?.[b.id];
    const stats = meta?.stats;
    if(!stats) continue;
    if(stats.ccImmune) return { speedMod:0, rooted:false, stunned:false, silenced:false };
    if(typeof stats.speed === 'number') res.speedMod += stats.speed;
    if(stats.rooted) res.rooted = true;
    if(stats.stunned) res.stunned = true;
    if(stats.silenced) res.silenced = true;
  }
  // rooted/stunned override speed
  if(res.stunned) res.rooted = true;
  return res;
}

function updateBuffs(state, dt){
  const tickBuffs = (unit)=>{
    if(!unit || !unit.buffs || unit.buffs.length===0) return;
    for(let bi=unit.buffs.length-1; bi>=0; bi--){
      const b = unit.buffs[bi];
      const meta = BUFF_REGISTRY?.[b.id];
      const interval = meta?.ticks?.interval ?? 0;
      b.t = Math.max(0, (b.t ?? 0) - dt);
      if(interval>0){ b.tl = (b.tl ?? interval) - dt; if(b.tl<=0){
        // process tick effects
        const hp = meta?.ticks?.hp ?? 0;
        const mana = meta?.ticks?.mana ?? 0;
        const dmg = meta?.ticks?.damage ?? 0;
        if(hp!==0){ unit.hp = clamp((unit.hp ?? 0) + hp, 0, unit.maxHp ?? 9999); }
        if(mana!==0){ unit.mana = clamp((unit.mana ?? 0) + mana, 0, unit.maxMana ?? 9999); }
        if(dmg>0){
          if(state.enemies.includes(unit)){
            const st = currentStats(state);
            const res = applyDamageToEnemy(unit, dmg, st, state, true);
            if(unit.hp<=0){ const idx = state.enemies.indexOf(unit); if(idx!==-1) killEnemy(state, idx, true); }
          } else if(state.friendlies.includes(unit)) {
            applyShieldedDamage(state, unit, dmg);
            if(unit.hp<=0){ unit.dead = true; unit.respawnT = 10; }
          }
        }
        b.tl = interval;
      } }
      if((b.t ?? 0) <= 0) unit.buffs.splice(bi,1);
    }
  };
  tickBuffs(state.player);
  for(const e of state.enemies) tickBuffs(e);
  for(const f of state.friendlies){ if(f.respawnT<=0) tickBuffs(f); }
}

function updateDamageNums(state, dt){
  const arr = state.effects.damageNums;
  if(!arr || arr.length===0) return;
  for(let i=arr.length-1;i>=0;i--){
    const d=arr[i];
    d.life -= dt;
    d.y += (d.vy||-18)*dt;
    if(d.life<=0) arr.splice(i,1);
  }
}

function makeLegendaryItem(state){
  const rarity = { key:'legend', name:'Legendary', color: cssVar('--legend') };
  const slot = ARMOR_SLOTS[randi(0, ARMOR_SLOTS.length-1)];
  return makeArmor(slot, rarity);
}

function awardCampaignLegendary(state){
  const item = makeLegendaryItem(state);
  // always add legendary to inventory (unlimited storage)
  state.inventory.push(item);
  state.ui.toast(`<b>Campaign Reward:</b> You received a <b class="${rarityClass(item.rarity.key)}">${item.name}</b>`);
}

// Dungeon utilities
function spawnDungeonEnemies(state, dungeon){
  // spawn 10 regular mobs + 1 boss at dungeon location
  const cx = dungeon.x, cy = dungeon.y;
  for(let i=0;i<10;i++){
    const ang = Math.random()*Math.PI*2; const dist = 20 + Math.random()*80;
    const VARS = ['warrior','mage','knight','tank'];
    const variant = VARS[randi(0, VARS.length-1)];
    const e = { x: cx + Math.cos(ang)*dist, y: cy + Math.sin(ang)*dist, r: 12, maxHp: 40, hp: 40, speed: 62, contactDmg: 8, hitCd:0, xp: 12, attacked:false, dungeonId: dungeon.id, team: null, homeSiteId: null, spawnTargetSiteId: null, variant };
    state.enemies.push(e);
  }
  // boss
  const boss = { x: cx, y: cy, r: 26, maxHp: 620, hp: 620, speed: 36, contactDmg: 22, hitCd:0, xp: 120, attacked:false, boss:true, dungeonId: dungeon.id, team: null, homeSiteId: null, spawnTargetSiteId: null, variant: 'tank' };
  state.enemies.push(boss);
}

function enterDungeon(state, dungeon){
  if(!dungeon || dungeon.cleared) return;
  // save world player/camera position
  state._savedWorld = { px: state.player.x, py: state.player.y, cam: { x: state.camera.x, y: state.camera.y, zoom: state.camera.zoom } };
  
  // Save group member positions and bring them into dungeon
  state._savedGroupPositions = [];
  if(state.group && state.group.members){
    for(const memberId of state.group.members){
      const ally = state.friendlies.find(f => f.id === memberId && f.respawnT <= 0);
      if(ally){
        state._savedGroupPositions.push({ id: memberId, x: ally.x, y: ally.y });
        // Teleport group member to dungeon with player (spread in small circle)
        const ang = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 30;
        ally.x = dungeon.x + Math.cos(ang) * dist;
        ally.y = dungeon.y + Math.sin(ang) * dist;
      }
    }
  }
  
  // move player to dungeon center and mark dungeon active
  state.player.x = dungeon.x; state.player.y = dungeon.y;
  state.camera.x = dungeon.x; state.camera.y = dungeon.y;
  // ensure overlays are closed and game is unpaused so dungeon logic runs
  state.mapOpen = false; state.showInventory = false; state.showSkills = false; state.showLevel = false; state.inMenu = false; state.paused = false;
  state.inDungeon = dungeon.id;
  if(state.ui){ state.ui.invOverlay && state.ui.invOverlay.classList && state.ui.invOverlay.classList.remove('show'); state.ui.skillsOverlay && state.ui.skillsOverlay.classList && state.ui.skillsOverlay.classList.remove('show'); state.ui.mapOverlay && state.ui.mapOverlay.classList && state.ui.mapOverlay.classList.remove('show'); }
  const memberCount = state._savedGroupPositions.length;
  state.ui.toast(`<b>Entered</b> ${dungeon.name}${memberCount > 0 ? ` with ${memberCount} ${memberCount === 1 ? 'ally' : 'allies'}` : ''}`);
  spawnDungeonEnemies(state, dungeon);
}

function exitDungeon(state){
  const id = state.inDungeon;
  if(!id) return;
  const dungeon = state.dungeons.find(d=>d.id===id);
  if(dungeon) dungeon.cleared = true;
  // remove any remaining dungeon enemies
  for(let i=state.enemies.length-1;i>=0;i--){ if(state.enemies[i].dungeonId === id) state.enemies.splice(i,1); }
  // restore player position and camera
  if(state._savedWorld){ state.player.x = state._savedWorld.px; state.player.y = state._savedWorld.py; state.camera.x = state._savedWorld.cam.x; state.camera.y = state._savedWorld.cam.y; state.camera.zoom = state._savedWorld.cam.zoom; }
  
  // Restore group member positions
  if(state._savedGroupPositions){
    for(const saved of state._savedGroupPositions){
      const ally = state.friendlies.find(f => f.id === saved.id);
      if(ally){
        ally.x = saved.x;
        ally.y = saved.y;
      }
    }
    state._savedGroupPositions = [];
  }
  
  state.inDungeon = false;
  state.ui.toast('Dungeon cleared.');
}

function fireLightOrHeavy(state, heldMs){
  if(state.player.dead || state.campaignEnded) return;
  // do not allow attacks while in UI or map
  if(state.showInventory || state.inMenu || state.mapOpen) return;

  const weaponType = (state.player.equip?.weapon?.weaponType || '').toLowerCase();
  const hasWeapon = !!state.player.equip?.weapon;
  const isStaff = weaponType.includes('staff');

  const st = currentStats(state);
  const m = state.input.mouse;
  const now = performance.now();
  const cdMs = isStaff ? 190 : 220;
  if(now - (m.lastShot||0) < cdMs) return;
  m.lastShot = now;

  const heavyMs = 380;
  const isHeavy = heldMs >= heavyMs;
  const wm = getWorldMouse(state);
  const a = Math.atan2(wm.y-state.player.y, wm.x-state.player.x);

  if(isStaff){
    if(state.player.inWater){ state.ui.toast('<span class="neg">Cannot attack while in water.</span>'); return; }
    if(isHeavy){
      const manaCost=8;
      if(state.player.mana<manaCost){ state.ui.toast('<span class="neg">Not enough mana for heavy.</span>'); return; }
      state.player.mana -= manaCost;
      spawnProjectile(state, state.player.x,state.player.y,a,390,7, 16+st.atk*1.2, 1, true);
    } else {
      spawnProjectile(state, state.player.x,state.player.y,a,560,4, 6+st.atk*0.6, 0, true);
    }
    return;
  }

  // Melee (any non-staff weapon or unarmed)
  const unarmed = !hasWeapon;
  let base;
  if(unarmed){
    base = isHeavy
      ? { t:0.22, arc:1.25, range:70, dmg:6 + st.atk*0.45 }
      : { t:0.16, arc:1.05, range:60, dmg:3 + st.atk*0.30 };
  } else {
    base = isHeavy
      ? { t:0.22, arc:1.6, range:95, dmg:14 + st.atk*1.0 }
      : { t:0.16, arc:1.3, range:85, dmg:8 + st.atk*0.7 };
  }
  // Align the slash to current mouse direction
  base.dir = a;
  base.team = 'player';
  base.weapon = state.player.equip?.weapon;
  base.x = state.player.x;
  base.y = state.player.y;
  pushSlashEffect(state, base);
}

// Helper to determine what interaction prompt should be shown
export function getInteractionPrompt(state){
  if(!state.player || state.player.dead) return null;
  
  // Check for dungeon entry
  if(state.dungeons){
    for(const d of state.dungeons){
      const dd = Math.hypot(state.player.x - d.x, state.player.y - d.y);
      if(dd <= Math.max(72, d.r+20) && !d.cleared){
        return { text: 'Enter Dungeon', action: 'dungeon' };
      }
    }
  }
  
  // Check for marketplace access (home base or captured flag)
  const homeBase = playerHome(state);
  if(homeBase){
    const dist = Math.hypot(state.player.x - homeBase.x, state.player.y - homeBase.y);
    if(dist <= 120){
      return { text: 'Access Base', action: 'base' };
    }
  }
  
  // Check captured flag sites
  if(state.sites){
    for(const s of state.sites){
      if(s.owner === 'player' && s.id && s.id.startsWith('site_')){
        const dist = Math.hypot(state.player.x - s.x, state.player.y - s.y);
        if(dist <= 80){
          return { text: 'Access Base', action: 'base' };
        }
      }
    }
  }
  
  // Check for nearby loot
  if(state.loot){
    for(const item of state.loot){
      if(!item || !item.x || !item.y) continue;
      const dist = Math.hypot(state.player.x - item.x, state.player.y - item.y);
      if(dist <= 36){ // pickup radius
        return { text: 'Pick Up Loot', action: 'pickup' };
      }
    }
  }
  
  return null;
}

export function handleHotkeys(state, dt){
  // track hold time for heavy
  const m=state.input.mouse;
  if(m.lDown) m.lHeldMs += dt*1000;

  // ESC menu: close any open overlays first, otherwise toggle menu
  const escDown = state.input.keysDown.has(state.binds.menu);
  if(escDown && !state._escLatch){
    state._escLatch = true;
    // if any overlay (including menu itself) is open, close them and DO NOT open menu
    const anyOverlay = state.showInventory || state.showSkills || state.showLevel || state.mapOpen || state.showMarketplace || state.showBaseActions || state.showGarrison || state.inMenu || state.selectedUnit;
    if(anyOverlay){
      state.showInventory = false; 
      state.showSkills = false; 
      state.showLevel = false; 
      state.mapOpen = false; 
      state.showMarketplace = false;
      state.showBaseActions = false;
      state.showGarrison = false;
      state.paused = false;
      if(state.ui) { 
        state.ui.invOverlay.classList.remove('show'); 
        state.ui.escOverlay.classList.remove('show');
        state.ui.mapOverlay && state.ui.mapOverlay.classList && state.ui.mapOverlay.classList.remove('show'); 
        state.ui.marketplaceOverlay && state.ui.marketplaceOverlay.classList && state.ui.marketplaceOverlay.classList.remove('show');
        state.ui.baseActionsOverlay && state.ui.baseActionsOverlay.classList && state.ui.baseActionsOverlay.classList.remove('show');
        state.ui.garrisonOverlay && state.ui.garrisonOverlay.classList && state.ui.garrisonOverlay.classList.remove('show');
        // Close unit inspection panel if open
        if(state.selectedUnit){
          state.ui.unitInspectionPanel.style.display = 'none';
          state.ui.unitInspectionContent.style.display = 'none';
          state.selectedUnit = null;
        }
      }
      state.inMenu = false;
    } else {
      // Only open menu if nothing is open
      state.ui.toggleMenu(true);
    }
  }
  if(!escDown) state._escLatch=false;

  // Inventory
  const invDown = state.input.keysDown.has(state.binds.inventory);
  if(invDown && !state._invLatch && !state.inMenu){
    state._invLatch=true;
    state.ui.toggleInventory(!state.showInventory);
  }
  if(!invDown) state._invLatch=false;

  // E key for selling items when marketplace is open
  const eDown = state.input.keysDown.has('KeyE');
  if(eDown && !state._eLatch && state.showMarketplace){
    state._eLatch = true;
    // Try to sell the last clicked/hovered item
    const item = state._marketSelectedItem;
    if(item){
      // Check if equipped
      const isEquipped = item.slot && state.equipped && state.equipped[item.slot] === item;
      if(isEquipped){
        state.ui.toast('Unequip this item before selling!');
      } else {
        const invIdx = state.inventory.indexOf(item);
        if(invIdx !== -1){
          const sellVal = item.rarity?.sellValue || 5;
          state.player.gold += sellVal;
          const color = item.rarity?.color || '#fff';
          
          if(item.count && item.count > 1){
            item.count--;
            state.ui.toast(`<span style="color:${color}"><b>${item.name}</b></span> sold for ${sellVal}g (${item.count} remaining)`);
          } else {
            state.inventory.splice(invIdx, 1);
            state.ui.toast(`<span style="color:${color}"><b>${item.name}</b></span> sold for ${sellVal}g`);
          }
          
          state.ui.updateGoldDisplay();
          state.ui.renderSellItems();
          state.ui.renderInventory?.();
        }
      }
    }
  }
  if(!eDown) state._eLatch = false;

  // Interact (dungeons, loot, marketplace)
  const pickDown = state.input.keysDown.has(state.binds.interact);
  if(pickDown && !state._pickLatch && !state.inMenu && !state.showInventory && !state.showSkills && !state.showLevel && !state.showMarketplace){
    state._pickLatch=true;
    let interacted = false;
    
    // Priority 1: Check for dungeon entry
    if(state.dungeons){
      for(const d of state.dungeons){ 
        const dd = Math.hypot(state.player.x-d.x, state.player.y-d.y); 
        if(dd <= Math.max(72, d.r+20) && !d.cleared){ 
          enterDungeon(state, d); 
          interacted = true; 
          break; 
        } 
      }
    }
    
    // Priority 2: Check for marketplace access (home base or captured flag)
    if(!interacted){
      const homeBase = playerHome(state);
      let canAccess = false;
      
      if(homeBase){
        const dist = Math.hypot(state.player.x - homeBase.x, state.player.y - homeBase.y);
        if(dist <= 120){
          canAccess = true;
        }
      }
      
      // Also check if at captured flag site
      if(!canAccess){
        for(const s of state.sites){
          if(s.owner === 'player' && s.id && s.id.startsWith('site_')){
            const dist = Math.hypot(state.player.x - s.x, state.player.y - s.y);
            if(dist <= 80){
              canAccess = true;
              break;
            }
          }
        }
      }
      
      if(canAccess){
        state.ui.toggleBaseActions(true);
        interacted = true;
      }
    }
    
    // Priority 3: Pick up loot
    if(!interacted) pickupNearestLoot(state);
  }
  if(!pickDown) state._pickLatch=false;

  // Abilities
  for(let i=0;i<5;i++){
    const down = state.input.keysDown.has(state.binds['abil'+(i+1)]);
    const latchKey = '_aLatch'+i;
    if(down && !state[latchKey] && !state.paused){
      state[latchKey]=true;
      tryCastSlot(state, i);
    }
    if(!down) state[latchKey]=false;
  }

  // Potion use (only when NOT in inventory)
  const potionDown = state.input.keysDown.has(state.binds.potion);
  if(potionDown && !state._potionLatch && !state.paused && !state.inMenu && !state.showInventory && state.player.potion){
    state._potionLatch = true;
    const potion = state.player.potion;
    const st = currentStats(state);
    
    // Check if potion has data.pct (old format) or buffs (new format)
    if(potion.data && potion.data.pct){
      // Old format with data.pct
      if(potion.type === 'hp'){
        const heal = Math.round(st.maxHp * potion.data.pct);
        state.player.hp = clamp(state.player.hp + heal, 0, st.maxHp);
        state.ui.toast(`Used <b class="${rarityClass(potion.rarity.key)}">${potion.name}</b>: +${heal} HP`);
      } else {
        const gain = Math.round(st.maxMana * potion.data.pct);
        state.player.mana = clamp(state.player.mana + gain, 0, st.maxMana);
        state.ui.toast(`Used <b class="${rarityClass(potion.rarity.key)}">${potion.name}</b>: +${gain} Mana`);
      }
    } else if(potion.buffs){
      // New format with buffs (instant heal/mana restore)
      if(potion.type === 'hp' && potion.buffs.hpRegen){
        const heal = potion.buffs.hpRegen * 20; // Convert regen to instant heal
        state.player.hp = clamp(state.player.hp + heal, 0, st.maxHp);
        state.ui.toast(`Used <b class="${rarityClass(potion.rarity.key)}">${potion.name}</b>: +${heal} HP`);
      } else if(potion.type === 'mana' && potion.buffs.manaRegen){
        const gain = potion.buffs.manaRegen * 20; // Convert regen to instant mana
        state.player.mana = clamp(state.player.mana + gain, 0, st.maxMana);
        state.ui.toast(`Used <b class="${rarityClass(potion.rarity.key)}">${potion.name}</b>: +${gain} Mana`);
      }
    }
    
    potion.count = (potion.count || 1) - 1;
    if(potion.count <= 0){
      state.player.potion = null;
    }
    state.ui.renderAbilityBar();
  }
  if(!potionDown) state._potionLatch = false;

  // Inventory Q drop (when in inventory)
  if(potionDown && state.showInventory && !state._invQDropLatch){
    state._invQDropLatch = true;
    if(state.selectedIndex >= 0 && state.selectedIndex < state.inventory.length){
      const item = state.inventory[state.selectedIndex];
      state.inventory.splice(state.selectedIndex, 1);
      state.selectedIndex = -1; state.selectedEquipSlot = null;
      state.loot.push({x: state.player.x, y: state.player.y, r: 12, item, timeLeft: 30.0});
      state.ui.toast(`Dropped: <b class="${rarityClass(item.rarity.key)}">${item.name}</b>`);
      state.ui.renderInventory();
    }
  }
  if(!potionDown) state._invQDropLatch = false;

  // Mouse release light/heavy: we detect release edge by lDown going false and _mouseLatch true
  if(m.lDown && !state._mouseLatch){
    state._mouseLatch=true;
  }
  if(!m.lDown && state._mouseLatch){
    state._mouseLatch=false;
    const held=m.lHeldMs;
    m.lHeldMs=0;
    fireLightOrHeavy(state, held);
  }

  // Map toggle (M)
  const mapKey = state.input.keysDown.has('KeyM');
  if(mapKey && !state._mapLatch){ state._mapLatch = true; state.mapOpen = !state.mapOpen; state.paused = state.mapOpen; }
  if(!mapKey) state._mapLatch = false;

  // Inventory hotkeys when inventory is open: E = equip/use selected, Q = drop selected
  const eKey = state.input.keysDown.has('KeyE');
  if(eKey && !state._equipLatch && state.showInventory && !state.inMenu){
    state._equipLatch = true;
    if(state.ui && state.ui.equipSelected) state.ui.equipSelected();
  }
  if(!eKey) state._equipLatch = false;

  const qKey = state.input.keysDown.has('KeyQ');
  if(qKey && !state._dropInvLatch && state.showInventory && !state.inMenu){
    state._dropInvLatch = true;
    if(state.selectedIndex>=0 && state.selectedIndex < state.inventory.length){
      const it = state.inventory.splice(state.selectedIndex,1)[0];
      dropItemToWorld(state, it);
      state.selectedIndex = -1; state.selectedEquipSlot = null;
      state.ui.renderInventory();
    }
  }
  if(!qKey) state._dropInvLatch = false;

  // Toggle HUD visibility with KeyB
  const bDown = state.input.keysDown.has('KeyB');
  if(bDown && !state._uiHideLatch){ state._uiHideLatch = true; state.uiHidden = !state.uiHidden; }
  if(!bDown) state._uiHideLatch = false;

  // Use interact bind (often KeyF) for dungeon entry only. Fast travel is map-only.
  const fKey = state.input.keysDown.has(state.binds.interact);
  if(fKey && !state._fastLatch && !state.inMenu && !state._pickLatch){
    state._fastLatch = true;
    // if player is near a dungeon, enter it
    if(state.dungeons){
      let near=null;
      for(const d of state.dungeons){ const dd = Math.hypot(state.player.x-d.x, state.player.y-d.y); if(dd <= Math.max(72, d.r+20) && !d.cleared){ near = d; break; } }
      if(near){ enterDungeon(state, near); }
      else {
        // Inform player that fast travel must be done via the map
        // Do not perform world fast-travel from a keypress.
        // (Map fast-travel handled via clicking on the full map overlay.)
      }
    }
  }
  if(!fKey) state._fastLatch = false;

  // Handle unit click inspection (left click on enemies/friendlies/creatures)
  if(m.lDown && !state._unitClickLatch){
    state._unitClickLatch = true;
    const cam = state.camera || { x:0, y:0, zoom:1 };
    const c = state.engine.canvas;
    const wx = (m.x - c.width/2) / (cam.zoom||1) + cam.x;
    const wy = (m.y - c.height/2) / (cam.zoom||1) + cam.y;
    // check click on enemies
    let clicked = null;
    for(const e of state.enemies){ if(Math.hypot(e.x - wx, e.y - wy) <= (e.r||13) + 6){ clicked = { unit: e, type: 'enemy' }; break; } }
    // check friendlies
    if(!clicked) for(const f of state.friendlies){ if(f.respawnT>0) continue; if(Math.hypot(f.x - wx, f.y - wy) <= (f.r||12) + 6){ clicked = { unit: f, type: 'friendly' }; break; } }
    // check creatures
    if(!clicked) for(const c of state.creatures){ if(Math.hypot(c.x - wx, c.y - wy) <= (c.r||12) + 6){ clicked = { unit: c, type: 'creature' }; break; } }
    if(clicked){
      state.selectedUnit = clicked;
      state.ui.showUnitInspection(clicked);
      // Auto-close UI panels to give focus to the target
      try{ state.ui.toggleInventory(false); }catch{}
      try{ state.ui.toggleMenu(false); }catch{}
    }
  }
  if(!m.lDown) state._unitClickLatch = false;
  if(state.mapOpen){
    if(state.input.keysDown.has('Equal') || state.input.keysDown.has('NumpadAdd')) state.mapView.zoom = Math.min(1.0, state.mapView.zoom + dt*0.4);
    if(state.input.keysDown.has('Minus') || state.input.keysDown.has('NumpadSubtract')) state.mapView.zoom = Math.max(0.05, state.mapView.zoom - dt*0.4);
    const panSpeed = 450 * (1/state.mapView.zoom) * dt;
    if(state.input.keysDown.has('ArrowLeft')) state.mapView.x = Math.max(0, state.mapView.x - panSpeed);
    if(state.input.keysDown.has('ArrowRight')) state.mapView.x = Math.min(state.mapWidth, state.mapView.x + panSpeed);
    if(state.input.keysDown.has('ArrowUp')) state.mapView.y = Math.max(0, state.mapView.y - panSpeed);
    if(state.input.keysDown.has('ArrowDown')) state.mapView.y = Math.min(state.mapHeight, state.mapView.y + panSpeed);

    // Map click fast-travel: on mouse click while map open, attempt to fast-travel to a player-captured flag/base
    if(m.lDown && !state._mapClickLatch){
      state._mapClickLatch = true;
      const mx = state.input.mouse.x; const my = state.input.mouse.y;
      // compute same overlay rect as drawFullMap
      const canvas = state.engine.canvas;
      const w = Math.min(canvas.width*0.9, state.mapWidth*0.6);
      const h = Math.min(canvas.height*0.9, state.mapHeight*0.6);
      const x = (canvas.width-w)/2, y = (canvas.height-h)/2;
      if(mx>=x && mx<=x+w && my>=y && my<=y+h){
        const mapW = state.mapWidth||canvas.width, mapH = state.mapHeight||canvas.height;
        const scale = Math.min(w/mapW, h/mapH);
        const wx = (mx - x)/scale; const wy = (my - y)/scale;
        // find nearest site within threshold
        let best=null, bestD=Infinity;
        for(const s of state.sites){ const sx = s.x*scale + x; const sy = s.y*scale + y; const d = Math.hypot(mx - sx, my - sy); if(d < bestD){ bestD=d; best=s; } }
        if(best && bestD <= 18){
          // only allow fast travel to player-owned sites (flags or bases)
          if(best.owner==='player'){
            state.player.x = best.x + 8; state.player.y = best.y + 8;
            state.camera.x = state.player.x; state.camera.y = state.player.y;
            state.mapOpen = false; state.paused = false;
            state.ui.toggleHud(true);
            state.ui.toast(`Fast-traveled to <b>${best.name}</b>.`);
          } else {
            state.ui.toast('Fast travel requires that site to be captured.');
          }
        }
      }
    }
    if(!m.lDown) state._mapClickLatch = false;
  }
}

// ===== GROUP AI SYSTEM =====
function ensurePartyState(state){
  if(!state.party){
    state.party = {
      macroState: 'stack',
      macroLockUntil: 0,
      burstUntil: 0,
      blackboard: {
        stackPoint: { x: state.player?.x || 0, y: state.player?.y || 0 },
        focusTargetId: null,
        focusTargetUntil: 0,
        chaseAllowed: false,
        spreadRadius: 72,
        leashRadius: 210
      }
    };
  }
  if(!state.party.blackboard.stackPoint) state.party.blackboard.stackPoint = { x: state.player?.x || 0, y: state.player?.y || 0 };
}

function scoreEnemyForFocus(state, enemy, anchor){
  if(!enemy || enemy.dead || enemy.hp<=0) return -1;
  const d = Math.hypot(enemy.x - anchor.x, enemy.y - anchor.y);
  const hpPct = enemy.hp / (enemy.maxHp || Math.max(1, enemy.hp));
  let score = 1000 - d*0.8 - hpPct*120;
  for(const s of state.sites||[]){
    if(s.owner==='player'){
      const ds = Math.hypot(enemy.x - s.x, enemy.y - s.y);
      if(ds <= (s.r||120) + 50){ score += 140; break; }
    }
  }
  return score;
}

function pickPartyFocus(state, anchor){
  let best=null, bestScore=-Infinity;
  for(const e of state.enemies||[]){
    const score = scoreEnemyForFocus(state, e, anchor);
    if(score > bestScore){ bestScore = score; best = e; }
  }
  return best;
}

function updatePartyCoordinator(state, dt){
  ensurePartyState(state);
  const party = state.party;
  const bb = party.blackboard;
  const time = state.campaign.time || 0;
  const anchor = bb.stackPoint;
  anchor.x = state.player.x;
  anchor.y = state.player.y;

  const focus = pickPartyFocus(state, anchor);
  if(focus){
    bb.focusTargetId = focus.id || focus._id || null;
    bb.focusTargetUntil = time + 2.5;
  } else if(bb.focusTargetUntil < time){
    bb.focusTargetId = null;
  }

  let nextMacro = party.macroState || 'stack';
  const hpPct = state.player.dead ? 0 : state.player.hp / Math.max(1, state.player.maxHp);
  
  // In dungeons, filter to dungeon enemies only; otherwise use all enemies near player
  const enemiesNear = state.inDungeon 
    ? state.enemies.filter(e=>!e.dead && e.hp>0 && e.dungeonId === state.inDungeon && Math.hypot(e.x-anchor.x, e.y-anchor.y) <= 260)
    : state.enemies.filter(e=>!e.dead && e.hp>0 && Math.hypot(e.x-anchor.x, e.y-anchor.y) <= 260);
  
  const wantsReset = hpPct < 0.32;
  
  // In dungeons, always be aggressive unless player health is critical
  const inDungeon = !!state.inDungeon;

  if(party.macroLockUntil && party.macroLockUntil > time){
    nextMacro = party.macroState;
  } else {
    if(wantsReset){
      nextMacro = 'stack';
    } else if(inDungeon && enemiesNear.length > 0){
      // In dungeons, always engage enemies
      nextMacro = focus ? 'engage' : 'engage';
    } else if(focus && party.burstUntil > time){
      nextMacro = 'burst';
    } else if(focus && enemiesNear.length>0){
      nextMacro = 'engage';
    } else {
      nextMacro = 'stack';
    }
  }

  if(nextMacro !== party.macroState){
    party.macroState = nextMacro;
    party.macroLockUntil = time + 1.25;
    if(nextMacro === 'burst' && focus) party.burstUntil = time + 2.6;
  }

  bb.chaseAllowed = party.macroState === 'engage' || party.macroState === 'burst';
}

export function updateGame(state, dt){
  if(state.paused) return;
  
  // Auto-save every 60 seconds
  state.autoSaveTimer = (state.autoSaveTimer || 0) + dt;
  if(state.autoSaveTimer >= 60){
    state.autoSaveTimer = 0;
    try{ if(state.ui && typeof state.ui.autoSave === 'function'){ state.ui.autoSave(); } }catch(e){ console.error('Auto-save error:', e); }
  }

  // If for some reason `state.inDungeon` wasn't set but dungeon enemies exist,
  // restore the dungeon active flag so the game update runs the dungeon loop.
  if(!state.inDungeon){
    const some = (state.enemies || []).find(e => e && e.dungeonId);
    if(some){ state.inDungeon = some.dungeonId; state._autoDungeonFix = true; }
  }

  // (world mouse is computed only when needed) — do not mutate `state.input.mouse` here

  state.campaign.time += dt;
  const st=currentStats(state);

  if(!state.player.dead){
    state.player.hp=clamp(state.player.hp+st.hpRegen*dt,0,st.maxHp);
    state.player.mana=clamp(state.player.mana+st.manaRegen*dt,0,st.maxMana);
  }

  // Auto-pickup loot if enabled
  if(state.options.autoPickup && !state.player.dead){
    for(let i = state.loot.length - 1; i >= 0; i--){
      const l = state.loot[i];
      const d = Math.hypot(l.x - state.player.x, l.y - state.player.y);
      if(d <= 36){ // pickup radius
        state.loot.splice(i, 1);
        addToInventory(state, l.item, l.gold || 0);
        state.ui.renderInventory?.();
      }
    }
  }

  // cooldowns
  for(let i=0;i<state.player.cd.length;i++) state.player.cd[i]=Math.max(0,state.player.cd[i]-dt);

  if(state.fastTravelCooldown > 0) state.fastTravelCooldown = Math.max(0, state.fastTravelCooldown - dt);

  // stamina / sprint / block
  const sprinting = state.input.keysDown.has(state.binds.sprint) && state.player.stam>0 && !state.input.mouse.rDown && !state.player.dead;
  const blocking = state.input.mouse.rDown && !state.player.dead;

  if(!sprinting && !blocking && !state.player.dead){
    state.player.stam=clamp(state.player.stam+st.stamRegen*dt,0,st.maxStam);
  }
  if(sprinting) state.player.stam=Math.max(0, state.player.stam - st.sprintStamDrain*dt);
  if(blocking){
    state.player.stam=Math.max(0, state.player.stam - st.blockStamDrain*dt);
    state.player.mana=Math.max(0, state.player.mana - 7.5*dt);
    if(state.player.stam<=0 || state.player.mana<=0) state.input.mouse.rDown=false;
  }

  // move
  if(!state.player.dead){
    const mv=getMoveVector(state);
    let vx=mv.x, vy=mv.y;
    const mag=Math.hypot(vx,vy);
    if(mag>0){ vx/=mag; vy/=mag; }
    let speed=st.speed;
    if(sprinting) speed*=st.sprintMult;
    if(blocking) speed*=0.55;
    // water slows movement
    let willBeInWater=false;
    // compute tentative position using base speed to detect water, then re-evaluate speed if needed
    let proposedX = state.player.x + vx*speed*dt;
    let proposedY = state.player.y + vy*speed*dt;
    // collision with trees
    let blocked=false;
    for(const t of state.trees || []){
      if(Math.hypot(proposedX - t.x, proposedY - t.y) <= (state.player.r + t.r + 2)) { blocked=true; break; }
    }
    // collision with mountains
    for(const m of state.mountains || []){
      if(Math.hypot(proposedX - m.x, proposedY - m.y) <= (state.player.r + m.r + 2)) { blocked=true; break; }
    }
    // check water presence (using water circles from lakes and rivers)
    for(const wc of state.waterCircles || []){
      if(Math.hypot(proposedX - wc.x, proposedY - wc.y) <= wc.r){ willBeInWater=true; break; }
    }
    // if moving into water, reduce speed and recompute proposed position
    if(willBeInWater){ speed *= 0.45; proposedX = state.player.x + vx*speed*dt; proposedY = state.player.y + vy*speed*dt; }
    if(!blocked){
      // enforce walls/gates: if movement would place player inside a wall ring, check gate
      let allowPass=true;
      for(const s of state.sites){ if(s.wall){ const d=Math.hypot(proposedX - s.x, proposedY - s.y); if(d <= s.wall.r && d >= s.r){ // in wall area
        if(!siteAllowsPassage(s, state.player, state)){ allowPass=false; break; }
          } } }
      if(allowPass){
        const bounds = state.playableBounds || {minX:0, minY:0, maxX:state.mapWidth, maxY:state.mapHeight};
        state.player.x = clamp(proposedX, bounds.minX, bounds.maxX);
        state.player.y = clamp(proposedY, bounds.minY, bounds.maxY);
        // apply water slow if moving into water
        if(willBeInWater) { state.player.inWater = true; }
        else { state.player.inWater = false; }
        if(state.player.inWater){ state.player.x = clamp(state.player.x, bounds.minX, bounds.maxX); state.player.y = clamp(state.player.y, bounds.minY, bounds.maxY); }
      }
    }
    // if already standing in water but moving out
    if(!willBeInWater && state.player.inWater){
      // check current position against water circles
      let stillIn=false; for(const wc of state.waterCircles||[]){ if(Math.hypot(state.player.x-wc.x,state.player.y-wc.y)<=wc.r){ stillIn=true; break; } }
      if(!stillIn) state.player.inWater=false;
    }
    // update camera to follow player and clamp to world
    const cam = state.camera;
   
     // Apply camera mode: Free View vs Follow Character
     const cameraMode = state.options?.cameraMode || 'follow';
     if(cameraMode === 'follow'){
       // Follow Character: always center on player
       cam.x = state.player.x;
       cam.y = state.player.y;
     } else if(cameraMode === 'freeview') {
         // Free View: only move camera when player approaches viewport edge
         const halfW = state.engine.canvas.width/2 / (cam.zoom||1);
         const halfH = state.engine.canvas.height/2 / (cam.zoom||1);

         // Dead zone: only move camera if player is outside this region
         const deadZone = 60; // pixels from viewport edge
         const leftEdge = cam.x - halfW + deadZone;
         const rightEdge = cam.x + halfW - deadZone;
         const topEdge = cam.y - halfH + deadZone;
         const bottomEdge = cam.y + halfH - deadZone; // fix: symmetric dead zone on bottom edge

         // Move camera only if player exits dead zone
         if(state.player.x < leftEdge) cam.x = state.player.x - deadZone;
         if(state.player.x > rightEdge) cam.x = state.player.x + deadZone;
         if(state.player.y < topEdge) cam.y = state.player.y - deadZone;
         if(state.player.y > bottomEdge) cam.y = state.player.y + deadZone;
     } else {
        // Classic Edge Scroll: camera moves only when player hits strict viewport edges (no dead zone)
        const halfW = state.engine.canvas.width/2 / (cam.zoom||1);
        const halfH = state.engine.canvas.height/2 / (cam.zoom||1);
        const leftEdge = cam.x - halfW;
        const rightEdge = cam.x + halfW;
        const topEdge = cam.y - halfH;
        const bottomEdge = cam.y + halfH;

        if(state.player.x < leftEdge) cam.x = state.player.x;
        if(state.player.x > rightEdge) cam.x = state.player.x;
        if(state.player.y < topEdge) cam.y = state.player.y;
        if(state.player.y > bottomEdge) cam.y = state.player.y;
     }
   
    const halfW = state.engine.canvas.width/2 / (cam.zoom||1);
    const halfH = state.engine.canvas.height/2 / (cam.zoom||1);
    cam.x = clamp(cam.x, halfW, (state.mapWidth || state.engine.canvas.width) - halfW);
    cam.y = clamp(cam.y, halfH, (state.mapHeight || state.engine.canvas.height) - halfH);
  }

  // If player entered a dungeon, run a focused dungeon update loop and skip world spawn/capture logic
  if(state.inDungeon){
    updatePartyCoordinator(state, dt);
    updateFriendlies(state, dt);
    updateEnemies(state, dt);
    updateDots(state, dt);
    updateBuffs(state, dt);
    updateHeals(state, dt);
    updateSlashes(state, dt);
    updateStorms(state, dt);
    updateWells(state, dt);
    updateProjectiles(state, dt);
    updateBolts(state, dt);
    updateFlashes(state, dt);
    updateLootTTL(state, dt);
    updateDamageNums(state, dt);
    if(!state.player.dead && state.player.hp<=0) die(state);
    if(state.player.dead){ state.player.respawnT -= dt; if(state.player.respawnT<=0) respawn(state); }
    return;
  }

  updateCapture(state, dt);
  // handle site capture reactions: if site was just captured, redirect team defenders
  for(const s of state.sites){
    if(s._justCaptured){
      const team = s._justCaptured;
      // remove existing guards of the previous owner at this site
      for(let fi=state.friendlies.length-1; fi>=0; fi--){
        const f = state.friendlies[fi];
        if(f.guard && f.siteId===s.id && s.owner!=='player') state.friendlies.splice(fi,1);
      }
      for(let ei=state.enemies.length-1; ei>=0; ei--){
        const e = state.enemies[ei];
        if(e.guard && e.homeSiteId===s.id && s.owner==='player') state.enemies.splice(ei,1);
      }
      // reset pending guard respawns now that ownership changed
      if(s.guardRespawns) s.guardRespawns.length = 0;
      // spawn guards already handled in world, now redirect up to MAX_DEFENDERS_PER_TEAM defenders
      const defenders = state.enemies.filter(e=>e.team===team && !e.guard && e.homeSiteId===getHomeForTeam(state,team)?.id);
      // find next target (nearest flag site not owned by team)
      let target=null, bestD=Infinity;
      for(const cand of state.sites){
        if(!cand.id || !cand.id.startsWith || !cand.id.startsWith('site_')) continue;
        if(cand.owner!==team){ const d=Math.hypot(cand.x - getHomeForTeam(state,team).x, cand.y - getHomeForTeam(state,team).y); if(d<bestD){bestD=d; target=cand;} }
      }
      for(let i=0;i<Math.min(defenders.length, MAX_DEFENDERS_PER_TEAM); i++){
        defenders[i].spawnTargetSiteId = target ? target.id : null;
      }
      s._justCaptured = false;
    }
  }
  // Emperor check: if player controls all base sites, grant emperor powers
  if(!state.emperor){
    const bases = state.sites.filter(s=>s.id.endsWith('_base'));
    if(bases.length>0 && bases.every(b=>b.owner==='player')){
      state.emperor = true;
      state.ui.toast('<b>You are the Emperor!</b> The crown grants blessing and power.');
      // ensure gates open for player's bases
      for(const b of bases){ if(b.wall) b.wall.gateOpen = true; }
    }
  }
  updateFriendlySpawns(state, dt);
  updatePartyCoordinator(state, dt);
  updateFriendlies(state, dt);

  // Gate opening: gates open for the owner of the site to allow easy passage
  for(const s of state.sites){
    if(s.wall){
      s.wall.gateOpen = false; // No gates in new system
    }
  }
  for(const s of state.sites){ if(s.wall && s.wall.sides){
    for(const side of s.wall.sides){
      if(side.hp < side.maxHp){
        const last = side.lastDamaged || 0;
        if((state.campaign.time - last) >= (s.wall.repairCooldown || 5.0)){
          // repair rate: restore maxHp over ~6 seconds
          const rate = side.maxHp / 6.0;
          side.hp = Math.min(side.maxHp, side.hp + rate*dt);
          if(side.destroyed && side.hp > 0){ side.destroyed = false; state.ui.toast(`Wall side repaired at <b>${s.name}</b>.`); }
        }
      }
    }
  } }

  for(const s of state.sites){
    const d = Math.hypot(state.player.x - s.x, state.player.y - s.y);
    s.spawnActive = d <= SPAWN_ACTIVATE_DIST;
    // Check if player is near a captured flag for marketplace access
    const nearMarketplace = d <= 80 && s.owner === 'player' && s.id && s.id.startsWith('site_');
    if(nearMarketplace && !state.marketplaceNearby){
      state.marketplaceNearby = true;
      if(state.ui && state.ui.showMarketplaceHint){
        state.ui.showMarketplaceHint(true);
      }
    } else if(!nearMarketplace && state.marketplaceNearby){
      state.marketplaceNearby = false;
      if(state.ui && state.ui.showMarketplaceHint){
        state.ui.showMarketplaceHint(false);
      }
    }
    // enqueue reinforcement requests when site is under attack
    // Reinforcements disabled to keep fighter count fixed
  }

  spawnEnemies(state, dt);
  updateEnemies(state, dt);

  // process guard respawns attached to sites
  for(const s of state.sites){
    if(!s.guardRespawns || s.guardRespawns.length===0) continue;
    for(let gi=s.guardRespawns.length-1; gi>=0; gi--){
      s.guardRespawns[gi] -= dt;
      if(s.guardRespawns[gi] <= 0){
        // respawn one guard
        spawnGuardsForSite(state, s, 1);
        s.guardRespawns.splice(gi,1);
      }
    }

      // Reinforcements disabled: no new squads beyond initial roster + respawns
  }

  // process enemy respawn queue
  if(state.enemyRespawns && state.enemyRespawns.length>0){
    for(let ri=state.enemyRespawns.length-1; ri>=0; ri--){
      const r = state.enemyRespawns[ri];
      r.timeLeft -= dt;
      if(r.timeLeft <= 0){
        const team = r.team;
        const currentDefenders = state.enemies.filter(e=>e.team===team && !e.guard).length;
        if(currentDefenders < MAX_DEFENDERS_PER_TEAM){
          // choose nearest owned site to death position; fallback to home base
          const sources = state.sites.filter(s=>s.owner===team);
          let src = null; let bestD = Infinity;
          for(const s of sources){
            const d = Math.hypot((r.x||0)-s.x, (r.y||0)-s.y);
            if(d < bestD){ bestD = d; src = s; }
          }
          if(!src) src = getHomeForTeam(state, team);
          if(src){
            const ang = Math.random()*Math.PI*2;
            const dist = rand(90,160);
            const opts = { homeSiteId: src.id, team };
            if(src.id && src.id.endsWith && src.id.endsWith('_base')) opts.knight = true;
            spawnEnemyAt(state, src.x+Math.cos(ang)*dist, src.y+Math.sin(ang)*dist, state.campaign.time, opts);
          }
        }
        state.enemyRespawns.splice(ri,1);
      }
    }
  }

  updateHeals(state, dt);
  updateDots(state, dt);
  updateBuffs(state, dt);
  updateSlashes(state, dt);
  updateStorms(state, dt);
  updateWells(state, dt);
  updateProjectiles(state, dt);
  updateBolts(state, dt);
  updateFlashes(state, dt);
  updateDamageNums(state, dt);

  updateLootTTL(state, dt);
  updateCampaignPoints(state, dt);

  // update creatures (world only)
  updateCreatures(state, dt);

  // Campaign time limit (10 minutes)
  const CAMPAIGN_LIMIT = 10*60;
  if(state.campaign.time >= CAMPAIGN_LIMIT && !state.campaignEnded){
    // Award end-of-campaign rewards (3 legendaries + 5000 gold) regardless of winner
    for(let i=0;i<3;i++){ awardCampaignLegendary(state); }
    state.player.gold += 5000;
    // determine winner by comparing player flags vs other teams for summary
    const playerFlags = getFriendlyFlags(state).length;
    const otherFlags = state.sites.filter(s=>s.owner && s.owner!=='player' && s.id.startsWith('site_')).length;
    const winner = playerFlags > otherFlags ? 'player' : 'enemy';
    state.ui.endCampaign(winner);
  }

  if(!state.player.dead && state.player.hp<=0){
    state.player.hp=0;
    die(state);
  }
  if(state.player.dead){
    state.player.respawnT -= dt;
    if(state.player.respawnT<=0) respawn(state);
  }
}

function updateCreatures(state, dt){
  // boss respawn countdown
  if(state.bossRespawnT && state.bossRespawnT > 0){
    state.bossRespawnT = Math.max(0, state.bossRespawnT - dt);
    if(state.bossRespawnT <= 0){ spawnBossCreature(state); }
  }
  for(let i=state.creatures.length-1;i>=0;i--){
    const c = state.creatures[i];
    // update hit cooldown
    c.hitCd = Math.max(0, (c.hitCd || 0) - dt);
    
    // simple wander
    c.wander = c.wander || { t: 1.0, ang: Math.random()*Math.PI*2 };
    c.wander.t -= dt;
    if(c.wander.t <= 0){ c.wander.t = rand(0.6, 2.2); c.wander.ang = Math.random()*Math.PI*2; }
    let tx = c.x + Math.cos(c.wander.ang) * 80;
    let ty = c.y + Math.sin(c.wander.ang) * 80;
    
    // check proximity aggro: if hostile nearby (player/friendlies/enemies), aggro toward them
    const agro_dist = c.agro_range || 90;
    let nearest = null, nearestD = Infinity;
    // check player
    if(!state.player.dead){ const d = Math.hypot(state.player.x - c.x, state.player.y - c.y); if(d < nearestD && d <= agro_dist){ nearestD = d; nearest = state.player; } }
    // check friendlies
    for(const f of state.friendlies){ if(f.respawnT>0) continue; const d = Math.hypot(f.x - c.x, f.y - c.y); if(d < nearestD && d <= agro_dist){ nearestD = d; nearest = f; } }
    // check enemies
    for(const e of state.enemies){ const d = Math.hypot(e.x - c.x, e.y - c.y); if(d < nearestD && d <= agro_dist){ nearestD = d; nearest = e; } }
    
    // if aggroed by proximity or already attacking, chase target
    if(nearest && (c.attacked || nearest)){ 
      c.target = nearest;
      c.attacked = true;
      tx = nearest.x;
      ty = nearest.y;
    }
    
    const slowFactor = c.inWater ? 0.45 : 1.0;
    moveWithAvoidance(c, tx, ty, state, dt, { slowFactor });
    
    // contact retaliate if aggroed (with cooldown check)
    if(c.attacked && c.target && c.hitCd <= 0){
      const d = Math.hypot((c.target.x||0) - c.x, (c.target.y||0) - c.y);
      const hitDist = (c.r||12) + (c.target.r||14) + 4;
      if(d <= hitDist){
        c.hitCd = 0.65; // Same cooldown as enemies
        if(c.target === state.player){ applyDamageToPlayer(state, c.contactDmg||6, currentStats(state)); }
        // friendlies/enemies take direct damage
        else {
          // try friendly list
          const fi = state.friendlies.indexOf(c.target);
          if(fi !== -1){
            const f = state.friendlies[fi];
            applyShieldedDamage(state, f, c.contactDmg||6);
            if(f.hp<=0) killFriendly(state, fi, true);
          }
          else {
            const ei = state.enemies.indexOf(c.target);
            if(ei!==-1){
              const e = state.enemies[ei];
              applyShieldedDamage(state, e, c.contactDmg||6);
              if(e.hp<=0) killEnemy(state, ei, false);
            }
          }
        }
      }
    }
  }
}

// Minimal save (menu button calls these via ui)
export function exportSave(state){
  return {
    player:{
      x:state.player.x,y:state.player.y,hp:state.player.hp,mana:state.player.mana,stam:state.player.stam,shield:state.player.shield,gold:state.player.gold,
      equip:state.player.equip,
      passives:state.player.passives.map(p=>p?.id ?? null),
      cd:state.player.cd
    },
    sites:state.sites, enemies:state.enemies, friendlies:state.friendlies, loot:state.loot, inventory:state.inventory,
    abilitySlots:state.abilitySlots, options:state.options, binds:state.binds, progression:state.progression, campaign:state.campaign,
    factionGold: state.factionGold, factionTech: state.factionTech, marketCosts: state.marketCosts,
    teamPoints: state.teamPoints, rubberband: state.rubberband, rubberbandNext: state.rubberbandNext, rubberbandAwarded: state.rubberbandAwarded,
    group: { members: state.group.members, settings: state.group.settings }
  };
}

export function importSave(state, s){
  state.player.x=s.player?.x ?? state.engine.canvas.width/2;
  state.player.y=s.player?.y ?? state.engine.canvas.height/2;
  state.player.hp=s.player?.hp ?? state.basePlayer.maxHp;
  state.player.mana=s.player?.mana ?? state.basePlayer.maxMana;
  state.player.stam=s.player?.stam ?? state.basePlayer.maxStam;
  state.player.shield=s.player?.shield ?? 0;
  state.player.gold=s.player?.gold ?? 0;
  state.player.equip=s.player?.equip ?? state.player.equip;
  state.player.potion=s.player?.potion ?? null;
  state.player.cd=s.player?.cd ?? [0,0,0,0,0];
  // restore faction economy
  state.factionGold = s.factionGold ?? state.factionGold ?? { player:0, teamA:0, teamB:0, teamC:0 };
  state.factionTech = s.factionTech ?? state.factionTech ?? { player:1, teamA:1, teamB:1, teamC:1 };
  // restore marketplace dynamic costs
  state.marketCosts = s.marketCosts ?? state.marketCosts ?? { squadArmor: 1000, squadLevel: 800 };
  // restore team points and rubberband
  state.teamPoints = s.teamPoints ?? state.teamPoints ?? { player:0, teamA:0, teamB:0, teamC:0 };
  state.rubberband = s.rubberband ?? state.rubberband ?? { gapThreshold: 60, closeThreshold: 30, baseTickGold: 250, interval: 300, nonLastScale: 0.6, maxAssistPerTeam: 10000 };
  state.rubberbandNext = s.rubberbandNext ?? state.rubberbandNext ?? { player:0, teamA:0, teamB:0, teamC:0 };
  state.rubberbandAwarded = s.rubberbandAwarded ?? state.rubberbandAwarded ?? { player:0, teamA:0, teamB:0, teamC:0 };

  state.abilitySlots=s.abilitySlots ?? state.abilitySlots;
  const pIds=s.player?.passives ?? [null,null];
  state.player.passives=pIds.map(id=>id?getSkillById(id):null);

  // Only import world/entity arrays if the save actually contains them (protect against empty/corrupt saves)
  if(Array.isArray(s.sites) && s.sites.length>0){ state.sites.length=0; s.sites.forEach(x=>state.sites.push(x)); }
  if(Array.isArray(s.enemies) && s.enemies.length>0){ state.enemies.length=0; s.enemies.forEach(e=>state.enemies.push(e)); }
  if(Array.isArray(s.friendlies) && s.friendlies.length>0){ 
    state.friendlies.length=0; 
    s.friendlies.forEach(a=>{
  if(s.group){ 
    state.group.members = s.group.members || [];
    state.group.settings = s.group.settings || {};
  }
      if(!a.id) a.id = `f_${Date.now()}_${randi(0, 99999)}`; // Add ID if missing
      // Reinitialize abilities to ensure latest loadouts (healer mages, etc)
      if(a.variant) {
        npcInitAbilities(a);
        console.log(`Reinitialized ${a.variant} with abilities:`, a.npcAbilities, 'weapon:', a.weaponType);
      }
      state.friendlies.push(a);
    });
  }
  if(Array.isArray(s.loot) && s.loot.length>0){ state.loot.length=0; s.loot.forEach(l=>state.loot.push({...l, timeLeft: typeof l.timeLeft==='number'?l.timeLeft:LOOT_TTL })); }
  if(Array.isArray(s.inventory) && s.inventory.length>0){ state.inventory.length=0; s.inventory.forEach(i=>state.inventory.push(i)); }

  state.options=s.options ?? state.options;
  state.binds=s.binds ?? state.binds;

  if(s.progression){ Object.assign(state.progression, s.progression); saveJson('orb_rpg_mod_prog', state.progression); }
  if(s.campaign){ Object.assign(state.campaign, s.campaign); saveJson('orb_rpg_mod_campaign', state.campaign); }

  saveJson('orb_rpg_mod_opts', state.options);
  saveJson('orb_rpg_mod_binds', state.binds);

  const st=currentStats(state);
  state.player.hp=clamp(state.player.hp,0,st.maxHp);
  state.player.mana=clamp(state.player.mana,0,st.maxMana);
  state.player.stam=clamp(state.player.stam,0,st.maxStam);

  state.campaignEnded=false;
  state.ui.hideEnd();
  state.paused=false;

  state.ui.renderAbilityBar();
}

// Global function used by marketplace to upgrade allies
window.applySquadUpgrade = function(state){
  const tierUp = ()=>{
    state.factionTech.player = Math.min(5, (state.factionTech.player||1) + 1);
  };
  tierUp();
  for(const f of state.friendlies){
    if(f.respawnT>0) continue;
    f.level = Math.min(12, (f.level||1) + 1);
    applyClassToUnit(f, f.variant||'warrior');
    npcInitAbilities(f);
  }
  // Refresh inventory/equipment UI if open
  state.ui.renderInventory?.();
};

function getRarityByTier(tier){
  if(tier>=5) return LEGENDARY_RARITY;
  if(tier>=4) return EPIC_RARITY;
  if(tier>=3) return RARE_RARITY;
  if(tier>=2) return UNCOMMON_RARITY;
  return COMMON_RARITY;
}

// Upgrade only squad armor rarity tier (does not change levels)
window.applySquadArmorUpgrade = function(state){
  const current = state.factionTech.player || 1;
  state.factionTech.player = Math.min(5, current + 1);
  const rarity = getRarityByTier(state.factionTech.player);
  for(const f of state.friendlies){
    if(f.respawnT>0) continue;
    const role = f.variant || 'warrior';
    const set = roleArmorSet(role, rarity);
    f.equipment = f.equipment || {};
    for(const [slot,item] of Object.entries(set)) f.equipment[slot] = item;
  }
  state.ui.toast(`Squad armor upgraded to <b>${rarity.name}</b>.`);
  state.ui.renderInventory?.();
};

// Upgrade only squad levels by +1 (keeps gear)
window.applySquadLevelUpgrade = function(state){
  for(const f of state.friendlies){
    if(f.respawnT>0) continue;
    f.level = (f.level||1) + 1;
    applyClassToUnit(f, f.variant||'warrior');
    // keep existing equipment; abilities re-init to keep CDs sane
    npcInitAbilities(f);
  }
  state.ui.toast(`Squad levels increased by <b>+1</b>.`);
};
