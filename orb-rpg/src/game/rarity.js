import { cssVar, randi } from "../engine/util.js";

export const RARITIES=[
  {key:'common',name:'Common',color:cssVar('--common'),weight:60},
  {key:'uncommon',name:'Uncommon',color:cssVar('--uncommon'),weight:25},
  {key:'rare',name:'Rare',color:cssVar('--rare'),weight:10},
  {key:'epic',name:'Epic',color:cssVar('--epic'),weight:4},
  {key:'legend',name:'Legendary',color:cssVar('--legend'),weight:1},
];

export function rarityClass(key){
  if(key==='common') return 'rarCommon';
  if(key==='uncommon') return 'rarUncommon';
  if(key==='rare') return 'rarRare';
  if(key==='epic') return 'rarEpic';
  return 'rarLegend';
}

export function rarityTier(r){ return Math.max(0, RARITIES.findIndex(x=>x.key===r.key)); }

export function pickRarity(){
  const total=RARITIES.reduce((s,r)=>s+r.weight,0);
  let roll=Math.random()*total;
  for(const r of RARITIES){ roll-=r.weight; if(roll<=0) return r; }
  return RARITIES[0];
}

export function randomArmorSlot(ARMOR_SLOTS){
  return ARMOR_SLOTS[randi(0, ARMOR_SLOTS.length-1)];
}
