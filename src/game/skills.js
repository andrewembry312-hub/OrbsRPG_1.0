import { clamp } from "../engine/util.js";

// Extended ability details for UI display with targeting types
export const ABILITIES = {
  // SHARED: DESTRUCTION STAFF (5) — all heroes
  'arc_bolt': { id:'arc_bolt', type:'active', name:'Arc Bolt', category:'Weapons - Destruction Staff', targetType:'projectile', mana:6, cd:1.1, castTime:0.3, range:35, radius:0, target:'Single Enemy', desc:'Precise single-target bolt.', details:'Fires a fast arcane bolt for sharp single-target damage.', scaling:'Magic Power: 120%', icon:'Arc Bolt.png' },
  'chain_light': { id:'chain_light', type:'active', name:'Chain Zap', category:'Weapons - Destruction Staff', targetType:'projectile', mana:16, cd:4.8, castTime:0.4, range:30, radius:0, target:'Enemy (Chains 5)', desc:'Forked lightning jumps between foes.', details:'Chains to up to 5 enemies with reduced damage per jump. Applies Shock DoT and Slow to each target.', scaling:'Magic Power: 140%', dots:['shock'], buffs:['slow'], icon:'Chain Zap.png' },
  'meteor_slam': { id:'meteor_slam', type:'active', name:'Meteor Slam', category:'Weapons - Destruction Staff', targetType:'ground', mana:28, cd:10.0, castTime:1.2, range:45, radius:12, target:'Ground AoE', desc:'Call down a meteor volley.', details:'Large targeted AoE impact. High damage, longer cast.', scaling:'Magic Power: 220%, Radius 12m', icon:'Meteor Slam.png' },
  'piercing_lance': { id:'piercing_lance', type:'active', name:'Piercing Lance', category:'Weapons - Destruction Staff', targetType:'projectile', mana:18, cd:6.4, castTime:0.5, range:40, radius:0, target:'Line Pierce', desc:'Linear piercing shot.', details:'Fires a lance that pierces all enemies in a line.', scaling:'Magic Power: 180%', icon:'Piercing Lance.png' },
  'gravity_well': { id:'gravity_well', type:'active', name:'Gravity Well', category:'Weapons - Destruction Staff', targetType:'ground', mana:30, cd:14.0, castTime:1.5, range:32, radius:15, target:'Ground AoE', desc:'Pull foes into a damaging well.', details:'Creates a pull field that damages over time, applying Slow and Curse to trapped enemies. Friendly damage color shows purple.', scaling:'Magic Power: 190%, Radius 15m', buffs:['slow','curse'], icon:'Gravity Well.png' },

  // SHARED: HEALING STAFF (5) — all heroes
  'heal_burst': { id:'heal_burst', type:'active', name:'Heal Burst', category:'Weapons - Healing Staff', targetType:'area', mana:18, cd:7.5, castTime:0.3, range:0, radius:20, target:'Self Area', desc:'Instant burst heal + regen.', details:'Heals you and nearby allies, then applies a short regen.', scaling:'Healing Power: 200%', icon:'heal burst.png' },
  'ward_barrier': { id:'ward_barrier', type:'active', name:'Ward Barrier', category:'Weapons - Healing Staff', targetType:'area', mana:22, cd:10.0, castTime:0.4, range:0, radius:18, target:'Self Area', desc:'Shield allies around you.', details:'Applies a strong shield to you and nearby allies.', scaling:'Defense: 160%', icon:'Ward Barrier.png' },
  'renewal_field': { id:'renewal_field', type:'active', name:'Renewal Field', category:'Weapons - Healing Staff', targetType:'area', mana:20, cd:12.0, castTime:0.5, range:0, radius:22, target:'Self Area', desc:'HoT aura around you.', details:'Creates a healing field around you that ticks several times.', scaling:'Healing Power: 150%', icon:'Renewal Field.png' },
  'cleanse_wave': { id:'cleanse_wave', type:'active', name:'Cleanse Wave', category:'Weapons - Healing Staff', targetType:'area', mana:14, cd:9.0, castTime:0.25, range:0, radius:18, target:'Self Area', desc:'Light heal + cleanse pulse.', details:'Small heal and minor shield, intended as a quick cleanse.', scaling:'Healing Power: 120%', icon:'Blessed Healing.png' },
  'beacon_of_light': { id:'beacon_of_light', type:'active', name:'Beacon of Light', category:'Weapons - Healing Staff', targetType:'ground', mana:24, cd:11.0, castTime:0.6, range:32, radius:16, target:'Ground AoE', desc:'Ground HoT beacon.', details:'Place a beacon that heals allies in an area over time.', scaling:'Healing Power: 170%', icon:'Radiant Aura.png' },

  // SHARED: MELEE WEAPONS (5) — all heroes
  'slash': { id:'slash', type:'active', name:'Slash', category:'Weapons - Melee', targetType:'melee', mana:2, cd:0.22, castTime:0.1, range:12, radius:0, target:'Melee Arc', desc:'Quick melee swipe.', details:'Spammy short-arc attack in front of you.', scaling:'Attack Power: 80%', icon:'Cleave.png' },
  'blade_storm': { id:'blade_storm', type:'active', name:'Toxic Blade Storm', category:'Weapons - Melee', targetType:'area', mana:22, cd:9.5, castTime:0.4, range:0, radius:18, target:'Self AoE', desc:'Poisonous spinning blade storm.', details:'3s spinning storm hitting nearby enemies repeatedly, applying Poison DoT (nature damage over 10s).', scaling:'Attack Power: 150%', dots:['poison'], icon:'Toxic Blade Storm.png' },
  'cleave': { id:'cleave', type:'active', name:'Cleave', category:'Weapons - Melee', targetType:'melee', mana:10, cd:3.5, castTime:0.25, range:14, radius:0, target:'Wide Arc', desc:'Heavy frontal cleave.', details:'Wide arc strike that hits multiple targets for solid damage.', scaling:'Attack Power: 130%', icon:'Rending Cleave.png' },
  'leap_strike': { id:'leap_strike', type:'active', name:'Leap Strike', category:'Weapons - Melee', targetType:'ground', mana:14, cd:6.5, castTime:0.3, range:26, radius:12, target:'Ground Leap', desc:'Leap to target and slam.', details:'Leap to cursor and deal AoE damage on impact. Applies Bleed, Slow, and Stun debuffs.', scaling:'Attack Power: 140%', dots:['bleed'], buffs:['slow','stun'], icon:'Leap Strike.png' },
  'warcry': { id:'warcry', type:'active', name:'Warcry', category:'Weapons - Melee', targetType:'area', mana:12, cd:8.0, castTime:0.2, range:0, radius:18, target:'Self Shout', desc:'Rallying shout.', details:'Minor damage pulse + grants temp shield and stamina.', scaling:'Attack Power: 60%, Shield Bonus', icon:'Warcry.png' },

  // HERO: MAGE (5) - includes healing abilities
  'mage_divine_touch': { id:'mage_divine_touch', type:'active', name:'Divine Touch', category:'Mage - Exclusive', targetType:'target', mana:16, cd:4.5, castTime:0.4, range:40, radius:0, target:'Single Ally', desc:'Targeted powerful heal.', details:'Heals target ally for high amount plus applies HoT for 6s. Grants Healing Empowerment buff (+25% healing power, 10s).', scaling:'Healing Power: 240%', buffs:['healing_empowerment'], icon:'Divine Touch.png' },
  'mage_sacred_ground': { id:'mage_sacred_ground', type:'active', name:'Sacred Ground', category:'Mage - Exclusive', targetType:'ground', mana:22, cd:12.0, castTime:0.8, range:35, radius:18, target:'Ground DoT', desc:'Consecrated damage field.', details:'Creates sacred ground that burns enemies over 6s (no healing). Grants Blessed buff (+10% all stats, 8s) to allies in the area.', scaling:'Magic Power: 170%, Radius 18m', buffs:['blessed'], icon:'Sacred Ground.png' },
  'mage_radiant_aura': { id:'mage_radiant_aura', type:'active', name:'Radiant Aura', category:'Mage - Exclusive', targetType:'area', mana:18, cd:8.0, castTime:0.5, range:0, radius:24, target:'Self AoE', desc:'Radiant shield pulse.', details:'Applies a shielding pulse around you and nearby allies and grants Radiance buff (+15% speed, +10% crit, 12s). No healing.', scaling:'Defense: 140%', buffs:['radiance'], icon:'Battle Fury.png' },
  'mage_arcane_missiles': { id:'mage_arcane_missiles', type:'active', name:'Arcane Missiles', category:'Mage - Exclusive', targetType:'projectile', mana:14, cd:5.5, castTime:0.3, range:32, radius:0, target:'Enemy', desc:'Homing arcane missiles.', details:'Fires 5 homing missiles. Applies Arcane Burn DoT (3s, magic damage) and Silence debuff to targets.', scaling:'Magic Power: 110% per missile', dots:['arcane_burn'], buffs:['silence'], icon:'Arcane Missiles.png' },
  'mage_time_warp': { id:'mage_time_warp', type:'active', name:'Time Warp', category:'Mage - Exclusive', targetType:'area', mana:20, cd:18.0, castTime:0.6, range:0, radius:18, target:'Self AoE Buff', desc:'Warp cooldowns.', details:'Reduces current cooldowns by 40%. Grants Temporal Flux buff (+30% CDR, +20% cast speed, 8s).', scaling:'CDR + Speed', buffs:['temporal_flux'], icon:'Time Warp.png' },

  // HERO: KNIGHT (5)
  'knight_shield_wall': { id:'knight_shield_wall', type:'active', name:'Shield Wall', category:'Knight - Exclusive', targetType:'area', mana:16, cd:9.0, castTime:0.35, range:0, radius:18, target:'Self AoE', desc:'Big shields for party.', details:'Large shield to you + nearby allies (no heal).', scaling:'Defense: 180%', icon:'Shield Wall (Active).png' },
  'knight_justice_strike': { id:'knight_justice_strike', type:'active', name:'Justice Strike', category:'Knight - Exclusive', targetType:'melee', mana:8, cd:3.0, castTime:0.2, range:14, radius:0, target:'Melee', desc:'Heavy single swing.', details:'Powerful melee hit with bonus vs nearest target.', scaling:'Attack Power: 150%', icon:'Justice Strike.png' },
  'knight_taunt': { id:'knight_taunt', type:'active', name:'Royal Taunt', category:'Knight - Exclusive', targetType:'area', mana:10, cd:8.0, castTime:0.25, range:0, radius:20, target:'Self AoE', desc:'Force foes to you.', details:'Damages nearby enemies slightly and applies Vulnerability debuff (+50% damage taken). Gains shield to tank hits.', scaling:'Attack Power: 80% + Shield', buffs:['vulnerability'], icon:'Royal Taunt.png' },
  'knight_rally': { id:'knight_rally', type:'active', name:'Knight Rally', category:'Knight - Exclusive', targetType:'area', mana:12, cd:10.0, castTime:0.35, range:0, radius:22, target:'Self AoE', desc:'Inspire allies.', details:'Heals allies around and grants small shield.', scaling:'Healing Power: 140%', icon:'Knight Rally.png' },
  'knight_banner': { id:'knight_banner', type:'active', name:'Banner of Valor', category:'Knight - Exclusive', targetType:'ground', mana:18, cd:14.0, castTime:0.6, range:30, radius:16, target:'Ground AoE', desc:'Place a rally banner.', details:'Plants a banner that inspires allies with Vigor (no heal).', scaling:'Buff', icon:'Banner of Valor.png' },

  // HERO: WARRIOR (5)
  'warrior_life_leech': { id:'warrior_life_leech', type:'active', name:'Life Leech', category:'Warrior - Exclusive', targetType:'melee', mana:8, cd:4.0, castTime:0.2, range:12, radius:0, target:'Melee', desc:'Melee strike that heals you.', details:'Deals damage and heals for a portion dealt.', scaling:'Attack Power: 120%', icon:'Life Leech.png' },
  'warrior_fortitude': { id:'warrior_fortitude', type:'active', name:'Fortitude', category:'Warrior - Exclusive', targetType:'area', mana:15, cd:8.0, castTime:0.5, range:0, radius:20, target:'Self AoE', desc:'Armor up party.', details:'Applies a defensive buff (implemented as shield) to allies.', scaling:'Defense: 120%', icon:'Fortitude.png' },
  'warrior_berserk': { id:'warrior_berserk', type:'active', name:'Berserk', category:'Warrior - Exclusive', targetType:'area', mana:12, cd:11.0, castTime:0.3, range:0, radius:0, target:'Self Buff', desc:'Short burst of power.', details:'Boosts stamina and trims cooldowns slightly (no heal).', scaling:'Self Buff', icon:'Berserk.png' },
  'warrior_cleave': { id:'warrior_cleave', type:'active', name:'Rending Cleave', category:'Warrior - Exclusive', targetType:'melee', mana:9, cd:4.2, castTime:0.25, range:14, radius:0, target:'Wide Arc', desc:'Wide heavy cleave.', details:'Strong frontal cleave with high damage. Applies Bleed DoT and Weakness debuff to reduce enemy damage.', scaling:'Attack Power: 145%', dots:['bleed'], buffs:['weakness'], icon:'Rending Cleave.png' },
  'warrior_charge': { id:'warrior_charge', type:'active', name:'Shoulder Charge', category:'Warrior - Exclusive', targetType:'ground', mana:10, cd:7.0, castTime:0.2, range:26, radius:10, target:'Line/Impact', desc:'Dash and smash.', details:'Rush toward cursor and deal AoE on arrival.', scaling:'Attack Power: 130%', icon:'shoulder charge.png' },
  // Alias for NPC/guard tactical id used by AI/runtime.
  // (UI previously showed slot as empty because this id didn't exist in ABILITIES.)
  'shoulder_charge': { id:'shoulder_charge', type:'active', name:'Shoulder Charge', category:'Warrior - Exclusive', targetType:'ground', mana:10, cd:7.0, castTime:0.2, range:26, radius:10, target:'Line/Impact', desc:'Dash and smash.', details:'Rush toward target and deal AoE on arrival.', scaling:'Attack Power: 130%', icon:'shoulder charge.png' },

  // HERO: TANK (5)
  'tank_ground_slam': { id:'tank_ground_slam', type:'active', name:'Ground Slam', category:'Tank - Exclusive', targetType:'area', mana:12, cd:6.5, castTime:0.35, range:0, radius:20, target:'Self AoE', desc:'Crushing ground slam.', details:'Damages and briefly slows foes (slow is thematic).', scaling:'Attack Power: 120%', icon:'Ground Slam.png' },
  'tank_iron_skin': { id:'tank_iron_skin', type:'active', name:'Iron Skin', category:'Tank - Exclusive', targetType:'area', mana:14, cd:10.0, castTime:0.3, range:0, radius:0, target:'Self Buff', desc:'Fortify yourself.', details:'Large personal shield and small self-heal.', scaling:'Defense: 200%', icon:'Iron Skin.png' },
  'tank_bodyguard': { id:'tank_bodyguard', type:'active', name:'Bodyguard', category:'Tank - Exclusive', targetType:'area', mana:16, cd:11.0, castTime:0.35, range:0, radius:22, target:'Self AoE', desc:'Protect allies.', details:'Shields allies around you (no heal).', scaling:'Defense', icon:'Bodyguard.png' },
  'tank_anchor': { id:'tank_anchor', type:'active', name:'Anchor Stance', category:'Tank - Exclusive', targetType:'area', mana:10, cd:9.0, castTime:0.25, range:0, radius:18, target:'Self AoE', desc:'Root yourself to hold line.', details:'Damages and Stuns nearby enemies. Applies shield to yourself and nearby allies.', scaling:'Defense + Small Damage', buffs:['stun'], icon:'Anchor Stance.png' },
  'tank_seismic_wave': { id:'tank_seismic_wave', type:'active', name:'Seismic Wave', category:'Tank - Exclusive', targetType:'projectile', mana:13, cd:7.5, castTime:0.3, range:30, radius:0, target:'Line Shock', desc:'Send a ground wave.', details:'Linear shockwave that damages enemies in a line.', scaling:'Attack Power: 125%', icon:'Seismic Wave.png' },

  // GUILD - ASSAULT (Offensive Buffs) - 5 active + 2 passive
  'assault_bloodlust': { id:'assault_bloodlust', type:'active', name:'Bloodlust', category:'Guild - Assault', targetType:'area', mana:20, cd:12.0, castTime:0.4, range:0, radius:20, target:'Self AoE', desc:'Enter berserker state.', details:'Grants Berserker Rage buff to you and nearby allies (+40% attack, -20% defense, 6s).', scaling:'Buff Only', buffs:['berserker_rage'], icon:'Bloodlust.png' },
  'assault_battle_cry': { id:'assault_battle_cry', type:'active', name:'Battle Cry', category:'Guild - Assault', targetType:'area', mana:16, cd:10.0, castTime:0.3, range:0, radius:18, target:'Self AoE', desc:'Empower combat prowess.', details:'Grants Battle Fury buff (+20% all damage, +10% crit mult, 7s) to allies.', scaling:'Buff Only', buffs:['battle_fury'], icon:'Battle Cry.png' },
  'assault_rapid_strikes': { id:'assault_rapid_strikes', type:'active', name:'Rapid Strikes', category:'Guild - Assault', targetType:'area', mana:14, cd:8.0, castTime:0.2, range:0, radius:16, target:'Self AoE', desc:'Increase attack speed.', details:'Grants Swift Strikes buff (+25% attack speed, +15% movement speed, 8s).', scaling:'Buff Only', buffs:['swift_strikes'], icon:'Warcry.png' },
  'assault_fortune': { id:'assault_fortune', type:'active', name:'Fortune\'s Favor', category:'Guild - Assault', targetType:'area', mana:18, cd:15.0, castTime:0.5, range:0, radius:20, target:'Self AoE', desc:'Enhance critical strikes.', details:'Grants Lucky buff (+25% crit chance, +50% crit multiplier, 10s) to allies.', scaling:'Buff Only', buffs:['lucky'], icon:'Fortune\'s Favor.png' },
  'assault_rampage': { id:'assault_rampage', type:'active', name:'Rampage', category:'Guild - Assault', targetType:'area', mana:22, cd:18.0, castTime:0.5, range:0, radius:18, target:'Self AoE', desc:'Ultimate offensive buff.', details:'Grants Berserk buff (+50% attack, +30% speed, -30% defense, 8s). High risk, high reward.', scaling:'Buff Only', buffs:['berserk'], icon:'Berserk.png' },

  // GUILD - SUPPORT (Defensive Buffs) - 5 active + 2 passive
  'support_iron_resolve': { id:'support_iron_resolve', type:'active', name:'Iron Resolve', category:'Guild - Support', targetType:'area', mana:18, cd:10.0, castTime:0.4, range:0, radius:20, target:'Self AoE', desc:'Unbreakable defense.', details:'Grants Iron Will buff (+50% defense, immune to CC, 5s) to allies.', scaling:'Buff Only', buffs:['iron_will'], icon:'Iron Skin.png' },
  'support_defensive_stance': { id:'support_defensive_stance', type:'active', name:'Defensive Stance', category:'Guild - Support', targetType:'area', mana:16, cd:12.0, castTime:0.3, range:0, radius:18, target:'Self AoE', desc:'Enhanced blocking.', details:'Grants Guardian Stance buff (+35% defense, +25% block effectiveness, 8s).', scaling:'Buff Only', buffs:['guardian_stance'], icon:'Anchor Stance.png' },
  'support_fortify': { id:'support_fortify', type:'active', name:'Fortify', category:'Guild - Support', targetType:'area', mana:20, cd:11.0, castTime:0.4, range:0, radius:20, target:'Self AoE', desc:'Massive shield.', details:'Grants Fortified buff (+300 shield, +20% shield effectiveness, 8s) to allies.', scaling:'Buff Only', buffs:['fortified'], icon:'Fortitude.png' },
  'support_enduring_spirit': { id:'support_enduring_spirit', type:'active', name:'Enduring Spirit', category:'Guild - Support', targetType:'area', mana:14, cd:9.0, castTime:0.3, range:0, radius:18, target:'Self AoE', desc:'Boost stamina.', details:'Grants Endurance buff (+25% max stamina, +12 stam/s regen, 10s) to allies.', scaling:'Buff Only', buffs:['endurance'], icon:'Endurance.png' },
  'support_divine_protection': { id:'support_divine_protection', type:'active', name:'Divine Protection', category:'Guild - Support', targetType:'area', mana:25, cd:20.0, castTime:0.6, range:0, radius:16, target:'Self AoE', desc:'Ultimate protection.', details:'Grants Divine Shield buff (Immune to damage and CC, 3s). Emergency use only.', scaling:'Buff Only', buffs:['divine_shield'], icon:'Ward Barrier.png' },

  // RESTORATION (Sustain/Regen Buffs) - 5 active + 2 passive
  'resto_rejuvenation': { id:'resto_rejuvenation', type:'active', name:'Rejuvenation', category:'Restoration', targetType:'area', mana:16, cd:10.0, castTime:0.4, range:0, radius:20, target:'Self AoE', desc:'HP regeneration over time.', details:'Grants Regeneration buff (Restores 5 HP per second, 8s) to allies.', scaling:'Buff Only', buffs:['regeneration'], icon:'Renewal Field.png' },
  'resto_vitality': { id:'resto_vitality', type:'active', name:'Vitality Surge', category:'Restoration', targetType:'area', mana:18, cd:12.0, castTime:0.4, range:0, radius:18, target:'Self AoE', desc:'Max HP boost and regen.', details:'Grants Vigor buff (+15% max HP, +8 HP/s regen, 12s) to allies.', scaling:'Buff Only', buffs:['vigor'], icon:'heal burst.png' },
  'resto_mana_flow': { id:'resto_mana_flow', type:'active', name:'Mana Flow', category:'Restoration', targetType:'area', mana:14, cd:9.0, castTime:0.3, range:0, radius:20, target:'Self AoE', desc:'Mana regeneration over time.', details:'Grants Mana Surge buff (Restores 8 mana per second, 6s) to allies.', scaling:'Buff Only', buffs:['mana_surge'], icon:'Arcane Missiles.png' },
  'resto_spiritual_attunement': { id:'resto_spiritual_attunement', type:'active', name:'Spiritual Attunement', category:'Restoration', targetType:'area', mana:16, cd:11.0, castTime:0.4, range:0, radius:18, target:'Self AoE', desc:'Max mana boost and regen.', details:'Grants Spirit buff (+20% max mana, +5 mana/s regen, 12s) to allies.', scaling:'Buff Only', buffs:['spirit'], icon:'Spirit.png' },
  'resto_vampiric_aura': { id:'resto_vampiric_aura', type:'active', name:'Vampiric Aura', category:'Restoration', targetType:'area', mana:20, cd:13.0, castTime:0.5, range:0, radius:20, target:'Self AoE', desc:'Lifesteal boost.', details:'Grants Lifesteal Surge buff (+15% lifesteal, 10s) to allies. Damage heals you.', scaling:'Buff Only', buffs:['lifesteal_boost'], icon:'Life Leech.png' },

  // ARCANE ARTS (Utility Buffs) - 5 active + 2 passive
  'arcane_concentration': { id:'arcane_concentration', type:'active', name:'Concentration', category:'Arcane Arts', targetType:'area', mana:18, cd:12.0, castTime:0.4, range:0, radius:20, target:'Self AoE', desc:'Reduce costs and cooldowns.', details:'Grants Focus buff (+20% CDR, -50% mana costs, 8s) to allies. Powerful utility.', scaling:'Buff Only', buffs:['focus'], icon:'Arcane Intellect.png' },
  'arcane_mental_clarity': { id:'arcane_mental_clarity', type:'active', name:'Mental Clarity', category:'Arcane Arts', targetType:'area', mana:16, cd:10.0, castTime:0.3, range:0, radius:18, target:'Self AoE', desc:'Silence immunity and mana regen.', details:'Grants Clarity buff (Immune to silence, +25% mana regen, 10s) to allies.', scaling:'Buff Only', buffs:['clarity'], icon:'Divine Touch.png' },
  'arcane_shadow_veil': { id:'arcane_shadow_veil', type:'active', name:'Shadow Veil', category:'Arcane Arts', targetType:'area', mana:20, cd:15.0, castTime:0.5, range:0, radius:16, target:'Self AoE', desc:'Stealth and enhanced crits.', details:'Grants Stealth buff (Invisible to enemies, +50% crit chance, 5s) to allies. Break on damage.', scaling:'Buff Only', buffs:['stealth'], icon:'Blessed Healing.png' },
  'arcane_power_surge': { id:'arcane_power_surge', type:'active', name:'Arcane Power', category:'Arcane Arts', targetType:'area', mana:18, cd:13.0, castTime:0.4, range:0, radius:20, target:'Self AoE', desc:'Magic damage boost.', details:'Grants Arcane Power buff (+30% magic damage, +15% mana regen, 10s) to allies.', scaling:'Buff Only', buffs:['arcane_power'], icon:'Arc Bolt.png' },
  'arcane_swiftness': { id:'arcane_swiftness', type:'active', name:'Swiftness', category:'Arcane Arts', targetType:'area', mana:14, cd:8.0, castTime:0.2, range:0, radius:18, target:'Self AoE', desc:'Movement speed boost.', details:'Grants Haste buff (+30% movement speed, 5s) to allies. Quick repositioning.', scaling:'Buff Only', buffs:['haste'], icon:'Time Warp.png' },

  // PASSIVE ABILITIES - Each belongs to a skill category and provides ongoing benefits
  
  // Destruction Staff Passives
  'arcane_mastery': { id:'arcane_mastery', type:'passive', name:'Arcane Mastery', category:'Weapons - Destruction Staff', desc:'Enhanced magic power.', details:'+1.2 mana/s, +10 max mana, 6% CDR. Always active when selected.', buffs:{manaRegen:1.2, cdr:0.06, maxMana:10}, icon:'Arcane Mastery.png' },
  'elemental_focus': { id:'elemental_focus', type:'passive', name:'Elemental Focus', category:'Weapons - Destruction Staff', desc:'Spell damage boost.', details:'+8% spell crit chance, +0.5 magic damage. Always active when selected.', buffs:{critChance:0.08, atk:0.5}, icon:'Elemental Focus.png' },
  
  // Healing Staff Passives
  'blessed_healing': { id:'blessed_healing', type:'passive', name:'Blessed Healing', category:'Weapons - Healing Staff', desc:'Enhanced healing and survival.', details:'+20 max HP, +0.8 HP/s regen, +5% healing power. Always active when selected.', buffs:{maxHp:20, hpRegen:0.8, healingPower:0.05}, icon:'Blessed Healing.png' },
  'restorative_spirit': { id:'restorative_spirit', type:'passive', name:'Restorative Spirit', category:'Weapons - Healing Staff', desc:'Improved sustain.', details:'+15 max mana, +1.0 mana/s, +5% CDR. Always active when selected.', buffs:{maxMana:15, manaRegen:1.0, cdr:0.05}, icon:'Restorative Spirit.png' },
  
  // Melee Weapon Passives
  'weapon_mastery': { id:'weapon_mastery', type:'passive', name:'Weapon Mastery', category:'Weapons - Melee', desc:'Enhanced physical combat.', details:'+8% block effectiveness, +6 stamina/s. Always active when selected.', buffs:{blockEff:0.08, stamRegen:6}, icon:'Weapon Mastery.png' },
  'battle_fury': { id:'battle_fury', type:'passive', name:'Battle Fury', category:'Weapons - Melee', desc:'Offensive power.', details:'6% lifesteal, +5% crit chance. Always active when selected.', buffs:{lifesteal:0.06, critChance:0.05}, icon:'Battle Fury.png' },
  
  // Mage Exclusive Passives
  'arcane_intellect': { id:'arcane_intellect', type:'passive', name:'Arcane Intellect', category:'Mage - Exclusive', desc:'Mage combat mastery.', details:'+15 max mana, +1.5 mana/s, +10% magic damage. Always active when selected.', buffs:{maxMana:15, manaRegen:1.5, magicDmg:0.10}, icon:'Arcane Intellect.png' },
  
  // Knight Exclusive Passives
  'shield_wall': { id:'shield_wall', type:'passive', name:'Shield Wall', category:'Knight - Exclusive', desc:'Defensive mastery.', details:'+12% defense, +10% block effectiveness, +25 max HP. Always active when selected.', buffs:{def:0.12, blockEff:0.10, maxHp:25}, icon:'Shield Wall passive.png' },
  
  // Warrior Exclusive Passives
  'combat_veteran': { id:'combat_veteran', type:'passive', name:'Combat Veteran', category:'Warrior - Exclusive', desc:'Battle-hardened warrior.', details:'+1.5 attack, +8% crit chance, +15 max HP. Always active when selected.', buffs:{atk:1.5, critChance:0.08, maxHp:15}, icon:'Combat Veteran.png' },
  
  // Tank/Warden Exclusive Passives
  'indomitable': { id:'indomitable', type:'passive', name:'Indomitable', category:'Tank - Exclusive', desc:'Unbreakable defender.', details:'+40 max HP, +1.2 HP/s, +15% defense. Always active when selected.', buffs:{maxHp:40, hpRegen:1.2, def:0.15}, icon:'Indomitable.png' },
  
  // Guild - Assault Passives
  'assault_war_veteran': { id:'assault_war_veteran', type:'passive', name:'War Veteran', category:'Guild - Assault', desc:'Seasoned warrior.', details:'+2.0 attack, +10% crit chance, +12% crit multiplier. Always active when selected.', buffs:{atk:2.0, critChance:0.10, critMult:0.12}, icon:'Combat Veteran.png' },
  'assault_killer_instinct': { id:'assault_killer_instinct', type:'passive', name:'Killer Instinct', category:'Guild - Assault', desc:'Enhanced offense.', details:'+8% attack speed, +15% movement speed, +5% all damage. Always active when selected.', buffs:{atkSpeed:0.08, speed:0.15, allDamage:0.05}, icon:'Bloodlust.png' },
  
  // Guild - Support Passives
  'support_stalwart_defender': { id:'support_stalwart_defender', type:'passive', name:'Stalwart Defender', category:'Guild - Support', desc:'Defensive mastery.', details:'+15% defense, +12% block effectiveness, +30 max HP. Always active when selected.', buffs:{def:0.15, blockEff:0.12, maxHp:30}, icon:'Shield Wall (Active).png' },
  'support_resilience': { id:'support_resilience', type:'passive', name:'Resilience', category:'Guild - Support', desc:'Enhanced endurance.', details:'+20% max stamina, +10 stamina/s, +1.0 HP/s. Always active when selected.', buffs:{maxStam:0.20, stamRegen:10, hpRegen:1.0}, icon:'Endurance.png' },
  
  // Restoration Passives
  'resto_life_bond': { id:'resto_life_bond', type:'passive', name:'Life Bond', category:'Restoration', desc:'Enhanced vitality.', details:'+35 max HP, +1.5 HP/s, +8% lifesteal. Always active when selected.', buffs:{maxHp:35, hpRegen:1.5, lifesteal:0.08}, icon:'heal burst.png' },
  'resto_mana_affinity': { id:'resto_mana_affinity', type:'passive', name:'Mana Affinity', category:'Restoration', desc:'Enhanced mana flow.', details:'+20 max mana, +1.8 mana/s, +5% healing power. Always active when selected.', buffs:{maxMana:20, manaRegen:1.8, healingPower:0.05}, icon:'Spirit.png' },
  
  // Arcane Arts Passives
  'arcane_scholar': { id:'arcane_scholar', type:'passive', name:'Arcane Scholar', category:'Arcane Arts', desc:'Magical expertise.', details:'+8% CDR, +18 max mana, +1.2 mana/s. Always active when selected.', buffs:{cdr:0.08, maxMana:18, manaRegen:1.2}, icon:'Arcane Mastery.png' },
  'arcane_versatility': { id:'arcane_versatility', type:'passive', name:'Versatility', category:'Arcane Arts', desc:'Adaptive mastery.', details:'+6% all stats, +10% movement speed, +5% cast speed. Always active when selected.', buffs:{allStats:0.06, speed:0.10, castSpeed:0.05}, icon:'Elemental Focus.png' },
};

// Ability categories - Weapons are shared, Hero categories are unique
export const ABILITY_CATEGORIES = [
  // SHARED WEAPON CATEGORIES (5 active + 2 passive each)
  { id: 'weapons-destruction', name: '🔥 Weapons - Destruction Staff', filter: a => a.category === 'Weapons - Destruction Staff' },
  { id: 'weapons-healing', name: '💚 Weapons - Healing Staff', filter: a => a.category === 'Weapons - Healing Staff' },
  { id: 'weapons-melee', name: '⚔️ Weapons - Melee', filter: a => a.category === 'Weapons - Melee' },

  // HERO CATEGORIES (5 active + 1 passive each)
  { id: 'mage-exclusive', name: '🌟 Mage - Exclusive', filter: a => a.category === 'Mage - Exclusive' },
  { id: 'knight-exclusive', name: '🛡️ Knight - Exclusive', filter: a => a.category === 'Knight - Exclusive' },
  { id: 'warrior-exclusive', name: '⚔️ Warrior - Exclusive', filter: a => a.category === 'Warrior - Exclusive' },
  { id: 'tank-exclusive', name: '🏔️ Tank - Exclusive', filter: a => a.category === 'Tank - Exclusive' },
  
  // UNIVERSAL SKILL LINES (5 active + 2 passive each) - Available to all heroes
  { id: 'guild-assault', name: '⚔️ Guild - Assault', filter: a => a.category === 'Guild - Assault' },
  { id: 'guild-support', name: '🛡️ Guild - Support', filter: a => a.category === 'Guild - Support' },
  { id: 'restoration', name: '💚 Restoration', filter: a => a.category === 'Restoration' },
  { id: 'arcane-arts', name: '✨ Arcane Arts', filter: a => a.category === 'Arcane Arts' },
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
  'fortified': { name:'Fortified', desc:'+300 shield, +20% shield effectiveness', duration:8, stats:{shieldEff:0.20}, shield:300 },
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
  
  // EMPEROR POWER - Special permanent buff
  'emperor_power': { name:'Power of the Emperor', desc:'Control all flags: +3x HP/Mana/Stamina, +50% CDR', duration:Infinity, stats:{maxHp:2.0, maxMana:2.0, maxStam:2.0, cdr:0.50} },
  
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

export function defaultPassives(get){ return []; } // Start with no passives - must equip weapon and select them

export function clampCdr(cdr){ return clamp(cdr,0,0.45); }

// Loadout management functions
export function saveLoadout(state, heroClass, slotIndex, name) {
  if (!state.abilityLoadouts[heroClass]) return false;
  if (slotIndex < 0 || slotIndex > 2) return false;
  state.abilityLoadouts[heroClass][slotIndex] = {
    name: name || `Loadout ${slotIndex + 1}`,
    slots: [...state.abilitySlots]
  };
  try {
    localStorage.setItem('orb_rpg_mod_loadouts', JSON.stringify(state.abilityLoadouts));
    return true;
  } catch(e) {
    console.warn('[LOADOUT] Save failed:', e.message);
    return false;
  }
}

export function loadLoadout(state, heroClass, slotIndex) {
  if (!state.abilityLoadouts[heroClass]) return false;
  if (slotIndex < 0 || slotIndex > 2) return false;
  const loadout = state.abilityLoadouts[heroClass][slotIndex];
  if (!loadout || !loadout.slots) return false;
  state.abilitySlots = [...loadout.slots];
  return true;
}
