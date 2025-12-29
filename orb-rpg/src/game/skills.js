import { clamp } from "../engine/util.js";

// Extended ability details for UI display with targeting types
export const ABILITIES = {
  // SHARED: DESTRUCTION STAFF (5) — all heroes
  'arc_bolt': { id:'arc_bolt', type:'active', name:'Arc Bolt', category:'Weapons - Destruction Staff', targetType:'projectile', mana:6, cd:1.1, castTime:0.3, range:35, radius:0, target:'Single Enemy', desc:'Precise single-target bolt.', details:'Fires a fast arcane bolt for sharp single-target damage.', scaling:'Magic Power: 120%' },
  'chain_light': { id:'chain_light', type:'active', name:'Chain Zap', category:'Weapons - Destruction Staff', targetType:'projectile', mana:16, cd:4.8, castTime:0.4, range:30, radius:0, target:'Enemy (Chains 5)', desc:'Forked lightning jumps between foes.', details:'Chains to up to 5 enemies with reduced damage per jump. Applies Shock DoT and Slow to each target.', scaling:'Magic Power: 140%', dots:['shock'], buffs:['slow'] },
  'meteor_slam': { id:'meteor_slam', type:'active', name:'Meteor Slam', category:'Weapons - Destruction Staff', targetType:'ground', mana:28, cd:10.0, castTime:1.2, range:45, radius:12, target:'Ground AoE', desc:'Call down a meteor volley.', details:'Large targeted AoE impact. High damage, longer cast.', scaling:'Magic Power: 220%, Radius 12m' },
  'piercing_lance': { id:'piercing_lance', type:'active', name:'Piercing Lance', category:'Weapons - Destruction Staff', targetType:'projectile', mana:18, cd:6.4, castTime:0.5, range:40, radius:0, target:'Line Pierce', desc:'Linear piercing shot.', details:'Fires a lance that pierces all enemies in a line.', scaling:'Magic Power: 180%' },
  'gravity_well': { id:'gravity_well', type:'active', name:'Gravity Well', category:'Weapons - Destruction Staff', targetType:'ground', mana:30, cd:14.0, castTime:1.5, range:32, radius:15, target:'Ground AoE', desc:'Pull foes into a damaging well.', details:'Creates a pull field that damages over time, applying Slow and Curse to trapped enemies. Friendly damage color shows purple.', scaling:'Magic Power: 190%, Radius 15m', buffs:['slow','curse'] },

  // SHARED: HEALING STAFF (5) — all heroes
  'heal_burst': { id:'heal_burst', type:'active', name:'Heal Burst', category:'Weapons - Healing Staff', targetType:'area', mana:18, cd:7.5, castTime:0.3, range:0, radius:20, target:'Self Area', desc:'Instant burst heal + regen.', details:'Heals you and nearby allies, then applies a short regen.', scaling:'Healing Power: 200%' },
  'ward_barrier': { id:'ward_barrier', type:'active', name:'Ward Barrier', category:'Weapons - Healing Staff', targetType:'area', mana:22, cd:10.0, castTime:0.4, range:0, radius:18, target:'Self Area', desc:'Shield allies around you.', details:'Applies a strong shield to you and nearby allies.', scaling:'Defense: 160%' },
  'renewal_field': { id:'renewal_field', type:'active', name:'Renewal Field', category:'Weapons - Healing Staff', targetType:'area', mana:20, cd:12.0, castTime:0.5, range:0, radius:22, target:'Self Area', desc:'HoT aura around you.', details:'Creates a healing field around you that ticks several times.', scaling:'Healing Power: 150%' },
  'cleanse_wave': { id:'cleanse_wave', type:'active', name:'Cleanse Wave', category:'Weapons - Healing Staff', targetType:'area', mana:14, cd:9.0, castTime:0.25, range:0, radius:18, target:'Self Area', desc:'Light heal + cleanse pulse.', details:'Small heal and minor shield, intended as a quick cleanse.', scaling:'Healing Power: 120%' },
  'beacon_of_light': { id:'beacon_of_light', type:'active', name:'Beacon of Light', category:'Weapons - Healing Staff', targetType:'ground', mana:24, cd:11.0, castTime:0.6, range:32, radius:16, target:'Ground AoE', desc:'Ground HoT beacon.', details:'Place a beacon that heals allies in an area over time.', scaling:'Healing Power: 170%' },

  // SHARED: MELEE WEAPONS (5) — all heroes
  'slash': { id:'slash', type:'active', name:'Slash', category:'Weapons - Melee', targetType:'melee', mana:2, cd:0.22, castTime:0.1, range:12, radius:0, target:'Melee Arc', desc:'Quick melee swipe.', details:'Spammy short-arc attack in front of you.', scaling:'Attack Power: 80%' },
  'blade_storm': { id:'blade_storm', type:'active', name:'Blade Storm', category:'Weapons - Melee', targetType:'area', mana:22, cd:9.5, castTime:0.4, range:0, radius:18, target:'Self AoE', desc:'Spin and shred around you.', details:'3s spinning storm hitting nearby enemies repeatedly.', scaling:'Attack Power: 150%' },
  'cleave': { id:'cleave', type:'active', name:'Cleave', category:'Weapons - Melee', targetType:'melee', mana:10, cd:3.5, castTime:0.25, range:14, radius:0, target:'Wide Arc', desc:'Heavy frontal cleave.', details:'Wide arc strike that hits multiple targets for solid damage.', scaling:'Attack Power: 130%' },
  'leap_strike': { id:'leap_strike', type:'active', name:'Leap Strike', category:'Weapons - Melee', targetType:'ground', mana:14, cd:6.5, castTime:0.3, range:26, radius:12, target:'Ground Leap', desc:'Leap to target and slam.', details:'Leap to cursor and deal AoE damage on impact. Applies Bleed, Slow, and Stun debuffs.', scaling:'Attack Power: 140%', dots:['bleed'], buffs:['slow','stun'] },
  'warcry': { id:'warcry', type:'active', name:'Warcry', category:'Weapons - Melee', targetType:'area', mana:12, cd:8.0, castTime:0.2, range:0, radius:18, target:'Self Shout', desc:'Rallying shout.', details:'Minor damage pulse + grants temp shield and stamina.', scaling:'Attack Power: 60%, Shield Bonus' },

  // HERO: MAGE (5) - includes healing abilities
  'mage_divine_touch': { id:'mage_divine_touch', type:'active', name:'Divine Touch', category:'Mage - Exclusive', targetType:'target', mana:16, cd:4.5, castTime:0.4, range:40, radius:0, target:'Single Ally', desc:'Targeted powerful heal.', details:'Heals target ally for high amount plus applies HoT for 6s. Grants Healing Empowerment buff (+25% healing power, 10s).', scaling:'Healing Power: 240%', buffs:['healing_empowerment'] },
  'mage_sacred_ground': { id:'mage_sacred_ground', type:'active', name:'Sacred Ground', category:'Mage - Exclusive', targetType:'ground', mana:22, cd:12.0, castTime:0.8, range:35, radius:18, target:'Ground DoT', desc:'Consecrated damage field.', details:'Creates sacred ground that burns enemies over 6s (no healing). Grants Blessed buff (+10% all stats, 8s) to allies in the area.', scaling:'Magic Power: 170%, Radius 18m', buffs:['blessed'] },
  'mage_radiant_aura': { id:'mage_radiant_aura', type:'active', name:'Radiant Aura', category:'Mage - Exclusive', targetType:'area', mana:18, cd:8.0, castTime:0.5, range:0, radius:24, target:'Self AoE', desc:'Radiant shield pulse.', details:'Applies a shielding pulse around you and nearby allies and grants Radiance buff (+15% speed, +10% crit, 12s). No healing.', scaling:'Defense: 140%', buffs:['radiance'] },
  'mage_arcane_missiles': { id:'mage_arcane_missiles', type:'active', name:'Arcane Missiles', category:'Mage - Exclusive', targetType:'projectile', mana:14, cd:5.5, castTime:0.3, range:32, radius:0, target:'Enemy', desc:'Homing arcane missiles.', details:'Fires 5 homing missiles. Applies Arcane Burn DoT (3s, magic damage) and Silence debuff to targets.', scaling:'Magic Power: 110% per missile', dots:['arcane_burn'], buffs:['silence'] },
  'mage_time_warp': { id:'mage_time_warp', type:'active', name:'Time Warp', category:'Mage - Exclusive', targetType:'area', mana:20, cd:18.0, castTime:0.6, range:0, radius:18, target:'Self AoE Buff', desc:'Warp cooldowns.', details:'Reduces current cooldowns by 40%. Grants Temporal Flux buff (+30% CDR, +20% cast speed, 8s).', scaling:'CDR + Speed', buffs:['temporal_flux'] },

  // HERO: KNIGHT (5)
  'knight_shield_wall': { id:'knight_shield_wall', type:'active', name:'Shield Wall', category:'Knight - Exclusive', targetType:'area', mana:16, cd:9.0, castTime:0.35, range:0, radius:18, target:'Self AoE', desc:'Big shields for party.', details:'Large shield to you + nearby allies (no heal).', scaling:'Defense: 180%' },
  'knight_justice_strike': { id:'knight_justice_strike', type:'active', name:'Justice Strike', category:'Knight - Exclusive', targetType:'melee', mana:8, cd:3.0, castTime:0.2, range:14, radius:0, target:'Melee', desc:'Heavy single swing.', details:'Powerful melee hit with bonus vs nearest target.', scaling:'Attack Power: 150%' },
  'knight_taunt': { id:'knight_taunt', type:'active', name:'Royal Taunt', category:'Knight - Exclusive', targetType:'area', mana:10, cd:8.0, castTime:0.25, range:0, radius:20, target:'Self AoE', desc:'Force foes to you.', details:'Damages nearby enemies slightly and applies Vulnerability debuff (+50% damage taken). Gains shield to tank hits.', scaling:'Attack Power: 80% + Shield', buffs:['vulnerability'] },
  'knight_rally': { id:'knight_rally', type:'active', name:'Knight Rally', category:'Knight - Exclusive', targetType:'area', mana:12, cd:10.0, castTime:0.35, range:0, radius:22, target:'Self AoE', desc:'Inspire allies.', details:'Heals allies around and grants small shield.', scaling:'Healing Power: 140%' },
  'knight_banner': { id:'knight_banner', type:'active', name:'Banner of Valor', category:'Knight - Exclusive', targetType:'ground', mana:18, cd:14.0, castTime:0.6, range:30, radius:16, target:'Ground AoE', desc:'Place a rally banner.', details:'Plants a banner that inspires allies with Vigor (no heal).', scaling:'Buff' },

  // HERO: WARRIOR (5)
  'warrior_life_leech': { id:'warrior_life_leech', type:'active', name:'Life Leech', category:'Warrior - Exclusive', targetType:'melee', mana:8, cd:4.0, castTime:0.2, range:12, radius:0, target:'Melee', desc:'Melee strike that heals you.', details:'Deals damage and heals for a portion dealt.', scaling:'Attack Power: 120%' },
  'warrior_fortitude': { id:'warrior_fortitude', type:'active', name:'Fortitude', category:'Warrior - Exclusive', targetType:'area', mana:15, cd:8.0, castTime:0.5, range:0, radius:20, target:'Self AoE', desc:'Armor up party.', details:'Applies a defensive buff (implemented as shield) to allies.', scaling:'Defense: 120%' },
  'warrior_berserk': { id:'warrior_berserk', type:'active', name:'Berserk', category:'Warrior - Exclusive', targetType:'area', mana:12, cd:11.0, castTime:0.3, range:0, radius:0, target:'Self Buff', desc:'Short burst of power.', details:'Boosts stamina and trims cooldowns slightly (no heal).', scaling:'Self Buff' },
  'warrior_cleave': { id:'warrior_cleave', type:'active', name:'Rending Cleave', category:'Warrior - Exclusive', targetType:'melee', mana:9, cd:4.2, castTime:0.25, range:14, radius:0, target:'Wide Arc', desc:'Wide heavy cleave.', details:'Strong frontal cleave with high damage. Applies Bleed DoT and Weakness debuff to reduce enemy damage.', scaling:'Attack Power: 145%', dots:['bleed'], buffs:['weakness'] },
  'warrior_charge': { id:'warrior_charge', type:'active', name:'Shoulder Charge', category:'Warrior - Exclusive', targetType:'ground', mana:10, cd:7.0, castTime:0.2, range:26, radius:10, target:'Line/Impact', desc:'Dash and smash.', details:'Rush toward cursor and deal AoE on arrival.', scaling:'Attack Power: 130%' },

  // HERO: TANK (5)
  'tank_ground_slam': { id:'tank_ground_slam', type:'active', name:'Ground Slam', category:'Tank - Exclusive', targetType:'area', mana:12, cd:6.5, castTime:0.35, range:0, radius:20, target:'Self AoE', desc:'Crushing ground slam.', details:'Damages and briefly slows foes (slow is thematic).', scaling:'Attack Power: 120%' },
  'tank_iron_skin': { id:'tank_iron_skin', type:'active', name:'Iron Skin', category:'Tank - Exclusive', targetType:'area', mana:14, cd:10.0, castTime:0.3, range:0, radius:0, target:'Self Buff', desc:'Fortify yourself.', details:'Large personal shield and small self-heal.', scaling:'Defense: 200%' },
  'tank_bodyguard': { id:'tank_bodyguard', type:'active', name:'Bodyguard', category:'Tank - Exclusive', targetType:'area', mana:16, cd:11.0, castTime:0.35, range:0, radius:22, target:'Self AoE', desc:'Protect allies.', details:'Shields allies around you (no heal).', scaling:'Defense' },
  'tank_anchor': { id:'tank_anchor', type:'active', name:'Anchor Stance', category:'Tank - Exclusive', targetType:'area', mana:10, cd:9.0, castTime:0.25, range:0, radius:18, target:'Self AoE', desc:'Root yourself to hold line.', details:'Damages and Stuns nearby enemies. Applies shield to yourself and nearby allies.', scaling:'Defense + Small Damage', buffs:['stun'] },
  'tank_seismic_wave': { id:'tank_seismic_wave', type:'active', name:'Seismic Wave', category:'Tank - Exclusive', targetType:'projectile', mana:13, cd:7.5, castTime:0.3, range:30, radius:0, target:'Line Shock', desc:'Send a ground wave.', details:'Linear shockwave that damages enemies in a line.', scaling:'Attack Power: 125%' },

  // PASSIVE ABILITIES (unchanged)
  'bulwark': { id:'bulwark', type:'passive', name:'Bulwark Training', category:'Passive - Defense', desc:'Better block and stamina regen.', details:'Increases block effectiveness by 8% and stamina regen by 6/s.', buffs:{blockEff:0.08, stamRegen:6} },
  'arcane_focus': { id:'arcane_focus', type:'passive', name:'Arcane Focus', category:'Passive - Magic', desc:'Mana regen + cooldown reduction.', details:'+1.2 mana/s, +10 max mana, 6% CDR.', buffs:{manaRegen:1.2, cdr:0.06, maxMana:10} },
  'predator': { id:'predator', type:'passive', name:'Predator Instinct', category:'Passive - Damage', desc:'Crit and attack boost.', details:'Adds 5% crit chance and +1.2 attack.', buffs:{critChance:0.05, atk:1.2} },
  'vital_soul': { id:'vital_soul', type:'passive', name:'Vital Soul', category:'Passive - Survival', desc:'HP and regen boost.', details:'Grants +20 max HP and 0.8 HP/s regen.', buffs:{maxHp:20, hpRegen:0.8} },
  'siphon': { id:'siphon', type:'passive', name:'Siphon', category:'Passive - Damage', desc:'Lifesteal.', details:'6% of damage dealt heals you.', buffs:{lifesteal:0.06} },
};

// Ability categories - Weapons are shared, Hero categories are unique
export const ABILITY_CATEGORIES = [
  // SHARED WEAPON CATEGORIES (5 each)
  { id: 'weapons-destruction', name: '🔥 Weapons - Destruction Staff', filter: a => a.category === 'Weapons - Destruction Staff' },
  { id: 'weapons-healing', name: '💚 Weapons - Healing Staff', filter: a => a.category === 'Weapons - Healing Staff' },
  { id: 'weapons-melee', name: '⚔️ Weapons - Melee', filter: a => a.category === 'Weapons - Melee' },

  // HERO CATEGORIES (5 each)
  { id: 'mage-exclusive', name: '🌟 Mage - Exclusive', filter: a => a.category === 'Mage - Exclusive' },
  { id: 'knight-exclusive', name: '🛡️ Knight - Exclusive', filter: a => a.category === 'Knight - Exclusive' },
  { id: 'warrior-exclusive', name: '⚔️ Warrior - Exclusive', filter: a => a.category === 'Warrior - Exclusive' },
  { id: 'tank-exclusive', name: '🏔️ Tank - Exclusive', filter: a => a.category === 'Tank - Exclusive' },
];

// Comprehensive Buff Registry
export const BUFF_REGISTRY = {
  // COMBAT BUFFS
  'healing_empowerment': { name:'Healing Empowerment', desc:'Increases healing power by 25%', duration:10, stats:{healingPower:0.25} },
  'blessed': { name:'Blessed', desc:'Increases all stats by 10%', duration:8, stats:{allStats:0.10} },
  'radiance': { name:'Radiance', desc:'+15% speed, +10% crit chance', duration:12, stats:{speed:0.15, critChance:0.10} },
  'temporal_flux': { name:'Temporal Flux', desc:'+30% CDR, +20% cast speed', duration:8, stats:{cdr:0.30, castSpeed:0.20} },
  'berserker_rage': { name:'Berserker Rage', desc:'+40% attack, -20% defense', duration:6, stats:{atk:0.40, def:-0.20} },
  'iron_will': { name:'Iron Will', desc:'+50% defense, immune to CC', duration:5, stats:{def:0.50, ccImmune:true} },
  'swift_strikes': { name:'Swift Strikes', desc:'+25% attack speed, +15% movement speed', duration:8, stats:{atkSpeed:0.25, speed:0.15} },
  'arcane_power': { name:'Arcane Power', desc:'+30% magic damage, +15% mana regen', duration:10, stats:{magicDmg:0.30, manaRegen:0.15} },
  'battle_fury': { name:'Battle Fury', desc:'+20% all damage, +10% crit mult', duration:7, stats:{allDamage:0.20, critMult:0.10} },
  'guardian_stance': { name:'Guardian Stance', desc:'+35% defense, +25% block effectiveness', duration:8, stats:{def:0.35, blockEff:0.25} },
  'frozen': { name:'Frozen', desc:'Unable to move briefly', duration:2.2, stats:{speed:-1.0, rooted:true, stunned:true}, debuff:true },
  'shocked': { name:'Shocked', desc:'+15% damage taken, -10% speed', duration:4.0, stats:{damageTaken:0.15, speed:-0.10}, debuff:true },
  
  // SUSTAIN BUFFS
  'regeneration': { name:'Regeneration', desc:'Restores HP over time', duration:8, ticks:{hp:5, interval:1.0} },
  'mana_surge': { name:'Mana Surge', desc:'Restores mana over time', duration:6, ticks:{mana:8, interval:1.0} },
  'vigor': { name:'Vigor', desc:'+15% max HP, +8 HP/s regen', duration:12, stats:{maxHp:0.15, hpRegen:8} },
  'spirit': { name:'Spirit', desc:'+20% max mana, +5 mana/s regen', duration:12, stats:{maxMana:0.20, manaRegen:5} },
  'endurance': { name:'Endurance', desc:'+25% max stamina, +12 stam/s regen', duration:10, stats:{maxStam:0.25, stamRegen:12} },
  'fortified': { name:'Fortified', desc:'+300 shield, +20% shield effectiveness', duration:8, stats:{shield:300, shieldEff:0.20} },
  'lifesteal_boost': { name:'Lifesteal Surge', desc:'+15% lifesteal', duration:10, stats:{lifesteal:0.15} },
  
  // MOBILITY BUFFS
  'haste': { name:'Haste', desc:'+30% movement speed', duration:5, stats:{speed:0.30} },
  'sprint': { name:'Sprint', desc:'+50% movement speed, -10% defense', duration:4, stats:{speed:0.50, def:-0.10} },
  'slow': { name:'Slow', desc:'-40% movement speed', duration:3, stats:{speed:-0.40}, debuff:true },
  'root': { name:'Root', desc:'Cannot move', duration:2, stats:{speed:-1.0, rooted:true}, debuff:true },
  'flight': { name:'Flight', desc:'+100% movement speed, immune to ground effects', duration:6, stats:{speed:1.0, flying:true} },
  
  // UTILITY BUFFS
  'focus': { name:'Focus', desc:'+20% CDR, -50% mana costs', duration:8, stats:{cdr:0.20, manaCostReduction:0.50} },
  'clarity': { name:'Clarity', desc:'Immune to silence, +25% mana regen', duration:10, stats:{silenceImmune:true, manaRegen:0.25} },
  'stealth': { name:'Stealth', desc:'Invisible to enemies, +50% crit chance', duration:5, stats:{invisible:true, critChance:0.50} },
  'divine_shield': { name:'Divine Shield', desc:'Immune to damage and CC', duration:3, stats:{invulnerable:true, ccImmune:true} },
  'lucky': { name:'Lucky', desc:'+25% crit chance, +50% crit multiplier', duration:10, stats:{critChance:0.25, critMult:0.50} },
  'berserk': { name:'Berserk', desc:'+50% attack, +30% speed, -30% defense', duration:8, stats:{atk:0.50, speed:0.30, def:-0.30} },
  
  // DEBUFFS - Crowd Control (low stack caps, higher duration)
  'slow': { name:'Slow', desc:'-30% movement speed', duration:6, stats:{speed:-0.30}, debuff:true, maxStacks:4 },
  'root': { name:'Root', desc:'Cannot move', duration:3, stats:{rooted:true}, debuff:true, maxStacks:2 },
  'silence': { name:'Silence', desc:'Cannot cast spells', duration:4, stats:{silenced:true}, debuff:true, maxStacks:3 },
  'stun': { name:'Stun', desc:'Cannot move or act', duration:2, stats:{stunned:true, speed:-1.0}, debuff:true, maxStacks:2 },
  
  // DEBUFFS - Stat Reductions (medium stack caps)
  'poison': { name:'Poison', desc:'Takes nature damage over time', duration:10, ticks:{damage:15, interval:1.0, type:'nature'}, debuff:true },
  'bleed': { name:'Bleed', desc:'Takes physical damage over time', duration:6, ticks:{damage:20, interval:1.0, type:'physical'}, debuff:true },
  'burn': { name:'Burn', desc:'Takes fire damage over time', duration:8, ticks:{damage:18, interval:1.0, type:'fire'}, debuff:true },
  'arcane_burn': { name:'Arcane Burn', desc:'Takes arcane damage over time', duration:3, ticks:{damage:25, interval:0.5, type:'arcane'}, debuff:true, maxStacks:6 },
  'weakness': { name:'Weakness', desc:'-40% attack damage', duration:8, stats:{atk:-0.40}, debuff:true, maxStacks:3 },
  'vulnerability': { name:'Vulnerability', desc:'+50% damage taken', duration:6, stats:{damageTaken:0.50}, debuff:true, maxStacks:3 },
  
  // DEBUFFS - Hard Penalties (low stack caps, longer duration)
  'curse': { name:'Curse', desc:'-30% all stats, takes shadow damage over time', duration:12, stats:{allStats:-0.30}, ticks:{damage:10, interval:1.5, type:'shadow'}, debuff:true, maxStacks:2 },
};

// DoT Registry (for abilities that apply damage over time)
export const DOT_REGISTRY = {
  'arcane_burn': { name:'Arcane Burn', damage:25, interval:0.5, duration:3, type:'arcane', maxStacks:6 },
  'poison': { name:'Poison', damage:15, interval:1.0, duration:10, type:'nature', maxStacks:4 },
  'bleed': { name:'Bleed', damage:20, interval:1.0, duration:6, type:'physical', maxStacks:5 },
  'burn': { name:'Burn', damage:18, interval:1.0, duration:8, type:'fire', maxStacks:5 },
  'curse': { name:'Curse', damage:10, interval:1.5, duration:12, type:'shadow', maxStacks:2 },
  'freeze': { name:'Freeze', damage:12, interval:1.2, duration:5, type:'ice', maxStacks:2, buffId:'frozen' },
  'shock': { name:'Shock', damage:10, interval:0.8, duration:6, type:'lightning', maxStacks:3, buffId:'shocked' },
};

// Targeting type descriptions
export const TARGET_TYPE_INFO = {
  'area': { name: 'Area', icon: '◯', desc: 'Cast on self, affects area around you' },
  'ground': { name: 'Ground', icon: '※', desc: 'Cast where your mouse is, affects that area' },
  'melee': { name: 'Melee', icon: '⚔', desc: 'Close range attack in front of you' },
  'projectile': { name: 'Projectile', icon: '→', desc: 'Fired projectile in target direction' },
  'passive': { name: 'Passive', icon: '✦', desc: 'Always active ability' }
};

// Legacy SKILLS array for backward compatibility
export const SKILLS = Object.values(ABILITIES);

export function getSkillById(id){ return ABILITIES[id] || null; }
export function getAbilityById(id){ return ABILITIES[id] || null; }

export function defaultAbilitySlots(){ return [null, null, null, null, null]; } // No default abilities - must be selected first

export function defaultPassives(get){ return [get('bulwark'), get('siphon')]; }

export function clampCdr(cdr){ return clamp(cdr,0,0.45); }
