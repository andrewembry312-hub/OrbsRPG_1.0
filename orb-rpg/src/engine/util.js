export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rand=(a,b)=>Math.random()*(b-a)+a;
export const randi=(a,b)=>Math.floor(rand(a,b+1));

export function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function cryptoId(){
  return Math.random().toString(16).slice(2)+Date.now().toString(16);
}

export function saveJson(k,o){ localStorage.setItem(k, JSON.stringify(o)); }
export function loadJson(k){
  try{ const raw=localStorage.getItem(k); return raw?JSON.parse(raw):null; }catch{ return null; }
}
