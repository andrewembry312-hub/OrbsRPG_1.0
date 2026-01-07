# Ability Reference

Generated from:
- UI registry: orb-rpg/src/game/skills.js (export const ABILITIES)
- Runtime meta: orb-rpg/src/game/game.js (const ABILITY_META)

Generated: 2026-01-07T01:11:25.397Z

## Summary

- UI abilities: **74**
- Runtime meta entries: **31**

Notes:
- Not every UI ability has a runtime meta entry (and vice versa).
- IDs like `shoulder_charge` may be UI/runtime aliases of a similarly named skill.

## Abilities (by category)

### Weapons - Destruction Staff

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| arc_bolt | Arc Bolt | active | Single Enemy | 6 | 1.10 | 0.30 | 35 | 0 | Precise single-target bolt. | dmg:12, rtType:projectile, elem:shock |
| arcane_mastery | Arcane Mastery | passive |  |  |  |  |  |  | Enhanced magic power. |  |
| chain_light | Chain Zap | active | Enemy (Chains 5) | 16 | 4.80 | 0.40 | 30 | 0 | Forked lightning jumps between foes. | dmg:10, rtType:projectile, elem:shock |
| elemental_focus | Elemental Focus | passive |  |  |  |  |  |  | Spell damage boost. |  |
| gravity_well | Gravity Well | active | Ground AoE | 30 | 14 | 1.50 | 32 | 15 | Pull foes into a damaging well. | kind:aoe, rtType:projectile |
| meteor_slam | Meteor Slam | active | Ground AoE | 28 | 10 | 1.20 | 45 | 12 | Call down a meteor volley. | kind:aoe, rtType:projectile |
| piercing_lance | Piercing Lance | active | Line Pierce | 18 | 6.40 | 0.50 | 40 | 0 | Linear piercing shot. | dmg:16, rtType:projectile, elem:arcane |

#### Weapons - Destruction Staff — details

- **Arc Bolt** (`arc_bolt`) — Precise single-target bolt.
  - Fires a fast arcane bolt for sharp single-target damage. | Scaling: Magic Power: 120% | Runtime: range:280, cost:10, cd:3.50, dmg:12
- **Arcane Mastery** (`arcane_mastery`) — Enhanced magic power.
  - +1.2 mana/s, +10 max mana, 6% CDR. Always active when selected.
- **Chain Zap** (`chain_light`) — Forked lightning jumps between foes.
  - Chains to up to 5 enemies with reduced damage per jump. Applies Shock DoT and Slow to each target. | Scaling: Magic Power: 140% | Buffs/Debuffs: slow | DoTs: shock | Runtime: range:260, cost:18, cd:5.50, dmg:10
- **Elemental Focus** (`elemental_focus`) — Spell damage boost.
  - +8% spell crit chance, +0.5 magic damage. Always active when selected.
- **Gravity Well** (`gravity_well`) — Pull foes into a damaging well.
  - Creates a pull field that damages over time, applying Slow and Curse to trapped enemies. Friendly damage color shows purple. | Scaling: Magic Power: 190%, Radius 15m | Buffs/Debuffs: slow, curse | Runtime: range:170, cost:30, cd:14, kind:aoe
- **Meteor Slam** (`meteor_slam`) — Call down a meteor volley.
  - Large targeted AoE impact. High damage, longer cast. | Scaling: Magic Power: 220%, Radius 12m | Runtime: range:240, cost:28, cd:10, kind:aoe
- **Piercing Lance** (`piercing_lance`) — Linear piercing shot.
  - Fires a lance that pierces all enemies in a line. | Scaling: Magic Power: 180% | Runtime: range:320, cost:16, cd:6, dmg:16

### Weapons - Healing Staff

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| beacon_of_light | Beacon of Light | active | Ground AoE | 24 | 11 | 0.60 | 32 | 16 | Ground HoT beacon. | kind:heal, rtType:support |
| blessed_healing | Blessed Healing | passive |  |  |  |  |  |  | Enhanced healing and survival. |  |
| cleanse_wave | Cleanse Wave | active | Self Area | 14 | 9 | 0.25 | 0 | 18 | Light heal + cleanse pulse. | kind:heal, rtType:support |
| heal_burst | Heal Burst | active | Self Area | 18 | 7.50 | 0.30 | 0 | 20 | Instant burst heal + regen. | kind:heal, rtType:support |
| renewal_field | Renewal Field | active | Self Area | 20 | 12 | 0.50 | 0 | 22 | HoT aura around you. | kind:heal, rtType:support |
| restorative_spirit | Restorative Spirit | passive |  |  |  |  |  |  | Improved sustain. |  |
| ward_barrier | Ward Barrier | active | Self Area | 22 | 10 | 0.40 | 0 | 18 | Shield allies around you. | kind:shield, rtType:support |

#### Weapons - Healing Staff — details

- **Beacon of Light** (`beacon_of_light`) — Ground HoT beacon.
  - Place a beacon that heals allies in an area over time. | Scaling: Healing Power: 170% | Runtime: range:200, cost:24, cd:11, kind:heal
- **Blessed Healing** (`blessed_healing`) — Enhanced healing and survival.
  - +20 max HP, +0.8 HP/s regen, +5% healing power. Always active when selected.
- **Cleanse Wave** (`cleanse_wave`) — Light heal + cleanse pulse.
  - Small heal and minor shield, intended as a quick cleanse. | Scaling: Healing Power: 120% | Runtime: range:140, cost:14, cd:9, kind:heal
- **Heal Burst** (`heal_burst`) — Instant burst heal + regen.
  - Heals you and nearby allies, then applies a short regen. | Scaling: Healing Power: 200% | Runtime: range:160, cost:18, cd:7.50, kind:heal
- **Renewal Field** (`renewal_field`) — HoT aura around you.
  - Creates a healing field around you that ticks several times. | Scaling: Healing Power: 150% | Runtime: range:180, cost:20, cd:12, kind:heal
- **Restorative Spirit** (`restorative_spirit`) — Improved sustain.
  - +15 max mana, +1.0 mana/s, +5% CDR. Always active when selected.
- **Ward Barrier** (`ward_barrier`) — Shield allies around you.
  - Applies a strong shield to you and nearby allies. | Scaling: Defense: 160% | Runtime: range:160, cost:22, cd:10, kind:shield

### Weapons - Melee

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| battle_fury | Battle Fury | passive |  |  |  |  |  |  | Offensive power. |  |
| blade_storm | Blade Storm | active | Self AoE | 22 | 9.50 | 0.40 | 0 | 18 | Spin and shred around you. |  |
| cleave | Cleave | active | Wide Arc | 10 | 3.50 | 0.25 | 14 | 0 | Heavy frontal cleave. | dmg:14, rtType:melee |
| leap_strike | Leap Strike | active | Ground Leap | 14 | 6.50 | 0.30 | 26 | 12 | Leap to target and slam. |  |
| slash | Slash | active | Melee Arc | 2 | 0.22 | 0.10 | 12 | 0 | Quick melee swipe. | dmg:7, rtType:melee |
| warcry | Warcry | active | Self Shout | 12 | 8 | 0.20 | 0 | 18 | Rallying shout. | kind:shield, rtType:support |
| weapon_mastery | Weapon Mastery | passive |  |  |  |  |  |  | Enhanced physical combat. |  |

#### Weapons - Melee — details

- **Battle Fury** (`battle_fury`) — Offensive power.
  - 6% lifesteal, +5% crit chance. Always active when selected.
- **Blade Storm** (`blade_storm`) — Spin and shred around you.
  - 3s spinning storm hitting nearby enemies repeatedly. | Scaling: Attack Power: 150%
- **Cleave** (`cleave`) — Heavy frontal cleave.
  - Wide arc strike that hits multiple targets for solid damage. | Scaling: Attack Power: 130% | Runtime: range:90, cost:10, cd:3.20, dmg:14
- **Leap Strike** (`leap_strike`) — Leap to target and slam.
  - Leap to cursor and deal AoE damage on impact. Applies Bleed, Slow, and Stun debuffs. | Scaling: Attack Power: 140% | Buffs/Debuffs: slow, stun | DoTs: bleed
- **Slash** (`slash`) — Quick melee swipe.
  - Spammy short-arc attack in front of you. | Scaling: Attack Power: 80% | Runtime: range:70, cost:4, cd:1, dmg:7
- **Warcry** (`warcry`) — Rallying shout.
  - Minor damage pulse + grants temp shield and stamina. | Scaling: Attack Power: 60%, Shield Bonus | Runtime: range:120, cost:12, cd:8, kind:shield
- **Weapon Mastery** (`weapon_mastery`) — Enhanced physical combat.
  - +8% block effectiveness, +6 stamina/s. Always active when selected.

### Mage - Exclusive

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| arcane_intellect | Arcane Intellect | passive |  |  |  |  |  |  | Mage combat mastery. |  |
| mage_arcane_missiles | Arcane Missiles | active | Enemy | 14 | 5.50 | 0.30 | 32 | 0 | Homing arcane missiles. | dmg:12, rtType:projectile, elem:arcane |
| mage_divine_touch | Divine Touch | active | Single Ally | 16 | 4.50 | 0.40 | 40 | 0 | Targeted powerful heal. | kind:heal, rtType:support |
| mage_radiant_aura | Radiant Aura | active | Self AoE | 18 | 8 | 0.50 | 0 | 24 | Radiant shield pulse. | kind:shield, rtType:support |
| mage_sacred_ground | Sacred Ground | active | Ground DoT | 22 | 12 | 0.80 | 35 | 18 | Consecrated damage field. | dmg:18, rtType:projectile, elem:fire |
| mage_time_warp | Time Warp | active | Self AoE Buff | 20 | 18 | 0.60 | 0 | 18 | Warp cooldowns. |  |

#### Mage - Exclusive — details

- **Arcane Intellect** (`arcane_intellect`) — Mage combat mastery.
  - +15 max mana, +1.5 mana/s, +10% magic damage. Always active when selected.
- **Arcane Missiles** (`mage_arcane_missiles`) — Homing arcane missiles.
  - Fires 5 homing missiles. Applies Arcane Burn DoT (3s, magic damage) and Silence debuff to targets. | Scaling: Magic Power: 110% per missile | Buffs/Debuffs: silence | DoTs: arcane_burn | Runtime: range:240, cost:14, cd:5.50, dmg:12
- **Divine Touch** (`mage_divine_touch`) — Targeted powerful heal.
  - Heals target ally for high amount plus applies HoT for 6s. Grants Healing Empowerment buff (+25% healing power, 10s). | Scaling: Healing Power: 240% | Buffs/Debuffs: healing_empowerment | Runtime: range:220, cost:16, cd:4.50, kind:heal
- **Radiant Aura** (`mage_radiant_aura`) — Radiant shield pulse.
  - Applies a shielding pulse around you and nearby allies and grants Radiance buff (+15% speed, +10% crit, 12s). No healing. | Scaling: Defense: 140% | Buffs/Debuffs: radiance | Runtime: range:170, cost:18, cd:8, kind:shield
- **Sacred Ground** (`mage_sacred_ground`) — Consecrated damage field.
  - Creates sacred ground that burns enemies over 6s (no healing). Grants Blessed buff (+10% all stats, 8s) to allies in the area. | Scaling: Magic Power: 170%, Radius 18m | Buffs/Debuffs: blessed | Runtime: range:200, cost:22, cd:12, dmg:18
- **Time Warp** (`mage_time_warp`) — Warp cooldowns.
  - Reduces current cooldowns by 40%. Grants Temporal Flux buff (+30% CDR, +20% cast speed, 8s). | Scaling: CDR + Speed | Buffs/Debuffs: temporal_flux

### Knight - Exclusive

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| knight_banner | Banner of Valor | active | Ground AoE | 18 | 14 | 0.60 | 30 | 16 | Place a rally banner. |  |
| knight_justice_strike | Justice Strike | active | Melee | 8 | 3 | 0.20 | 14 | 0 | Heavy single swing. | dmg:18, rtType:melee |
| knight_rally | Knight Rally | active | Self AoE | 12 | 10 | 0.35 | 0 | 22 | Inspire allies. | kind:heal, rtType:support |
| knight_taunt | Royal Taunt | active | Self AoE | 10 | 8 | 0.25 | 0 | 20 | Force foes to you. | kind:shield, rtType:support |
| knight_shield_wall | Shield Wall | active | Self AoE | 16 | 9 | 0.35 | 0 | 18 | Big shields for party. | kind:shield, rtType:support |
| shield_wall | Shield Wall | passive |  |  |  |  |  |  | Defensive mastery. |  |

#### Knight - Exclusive — details

- **Banner of Valor** (`knight_banner`) — Place a rally banner.
  - Plants a banner that inspires allies with Vigor (no heal). | Scaling: Buff
- **Justice Strike** (`knight_justice_strike`) — Heavy single swing.
  - Powerful melee hit with bonus vs nearest target. | Scaling: Attack Power: 150% | Runtime: range:95, cost:8, cd:3, dmg:18
- **Knight Rally** (`knight_rally`) — Inspire allies.
  - Heals allies around and grants small shield. | Scaling: Healing Power: 140% | Runtime: range:170, cost:12, cd:10, kind:heal
- **Royal Taunt** (`knight_taunt`) — Force foes to you.
  - Damages nearby enemies slightly and applies Vulnerability debuff (+50% damage taken). Gains shield to tank hits. | Scaling: Attack Power: 80% + Shield | Buffs/Debuffs: vulnerability | Runtime: range:140, cost:10, cd:8, kind:shield
- **Shield Wall** (`knight_shield_wall`) — Big shields for party.
  - Large shield to you + nearby allies (no heal). | Scaling: Defense: 180% | Runtime: range:170, cost:16, cd:9, kind:shield
- **Shield Wall** (`shield_wall`) — Defensive mastery.
  - +12% defense, +10% block effectiveness, +25 max HP. Always active when selected.

### Warrior - Exclusive

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| warrior_berserk | Berserk | active | Self Buff | 12 | 11 | 0.30 | 0 | 0 | Short burst of power. |  |
| combat_veteran | Combat Veteran | passive |  |  |  |  |  |  | Battle-hardened warrior. |  |
| warrior_fortitude | Fortitude | active | Self AoE | 15 | 8 | 0.50 | 0 | 20 | Armor up party. | kind:shield, rtType:support |
| warrior_life_leech | Life Leech | active | Melee | 8 | 4 | 0.20 | 12 | 0 | Melee strike that heals you. | dmg:16, rtType:melee |
| warrior_cleave | Rending Cleave | active | Wide Arc | 9 | 4.20 | 0.25 | 14 | 0 | Wide heavy cleave. | dmg:20, rtType:melee |
| warrior_charge | Shoulder Charge | active | Line/Impact | 10 | 7 | 0.20 | 26 | 10 | Dash and smash. |  |
| shoulder_charge | Shoulder Charge | active | Line/Impact | 10 | 7 | 0.20 | 26 | 10 | Dash and smash. | kind:aoe, rtType:melee |

#### Warrior - Exclusive — details

- **Berserk** (`warrior_berserk`) — Short burst of power.
  - Boosts stamina and trims cooldowns slightly (no heal). | Scaling: Self Buff
- **Combat Veteran** (`combat_veteran`) — Battle-hardened warrior.
  - +1.5 attack, +8% crit chance, +15 max HP. Always active when selected.
- **Fortitude** (`warrior_fortitude`) — Armor up party.
  - Applies a defensive buff (implemented as shield) to allies. | Scaling: Defense: 120% | Runtime: range:150, cost:15, cd:8, kind:shield
- **Life Leech** (`warrior_life_leech`) — Melee strike that heals you.
  - Deals damage and heals for a portion dealt. | Scaling: Attack Power: 120% | Runtime: range:82, cost:8, cd:4, dmg:16
- **Rending Cleave** (`warrior_cleave`) — Wide heavy cleave.
  - Strong frontal cleave with high damage. Applies Bleed DoT and Weakness debuff to reduce enemy damage. | Scaling: Attack Power: 145% | Buffs/Debuffs: weakness | DoTs: bleed | Runtime: range:96, cost:9, cd:4.20, dmg:20
- **Shoulder Charge** (`warrior_charge`) — Dash and smash.
  - Rush toward cursor and deal AoE on arrival. | Scaling: Attack Power: 130%
- **Shoulder Charge** (`shoulder_charge`) — Dash and smash.
  - Rush toward target and deal AoE on arrival. | Scaling: Attack Power: 130% | Runtime: range:135, cost:10, cd:7, kind:aoe

### Tank - Exclusive

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| tank_anchor | Anchor Stance | active | Self AoE | 10 | 9 | 0.25 | 0 | 18 | Root yourself to hold line. | kind:shield, rtType:support |
| tank_bodyguard | Bodyguard | active | Self AoE | 16 | 11 | 0.35 | 0 | 22 | Protect allies. | kind:shield, rtType:support |
| tank_ground_slam | Ground Slam | active | Self AoE | 12 | 6.50 | 0.35 | 0 | 20 | Crushing ground slam. |  |
| indomitable | Indomitable | passive |  |  |  |  |  |  | Unbreakable defender. |  |
| tank_iron_skin | Iron Skin | active | Self Buff | 14 | 10 | 0.30 | 0 | 0 | Fortify yourself. | kind:shield, rtType:support |
| tank_seismic_wave | Seismic Wave | active | Line Shock | 13 | 7.50 | 0.30 | 30 | 0 | Send a ground wave. | dmg:18, rtType:projectile, elem:shock |

#### Tank - Exclusive — details

- **Anchor Stance** (`tank_anchor`) — Root yourself to hold line.
  - Damages and Stuns nearby enemies. Applies shield to yourself and nearby allies. | Scaling: Defense + Small Damage | Buffs/Debuffs: stun | Runtime: range:150, cost:10, cd:9, kind:shield
- **Bodyguard** (`tank_bodyguard`) — Protect allies.
  - Shields allies around you (no heal). | Scaling: Defense | Runtime: range:180, cost:16, cd:11, kind:shield
- **Ground Slam** (`tank_ground_slam`) — Crushing ground slam.
  - Damages and briefly slows foes (slow is thematic). | Scaling: Attack Power: 120%
- **Indomitable** (`indomitable`) — Unbreakable defender.
  - +40 max HP, +1.2 HP/s, +15% defense. Always active when selected.
- **Iron Skin** (`tank_iron_skin`) — Fortify yourself.
  - Large personal shield and small self-heal. | Scaling: Defense: 200% | Runtime: range:120, cost:14, cd:10, kind:shield
- **Seismic Wave** (`tank_seismic_wave`) — Send a ground wave.
  - Linear shockwave that damages enemies in a line. | Scaling: Attack Power: 125% | Runtime: range:260, cost:13, cd:7.50, dmg:18

### Guild - Assault

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| assault_battle_cry | Battle Cry | active | Self AoE | 16 | 10 | 0.30 | 0 | 18 | Empower combat prowess. |  |
| assault_bloodlust | Bloodlust | active | Self AoE | 20 | 12 | 0.40 | 0 | 20 | Enter berserker state. |  |
| assault_fortune | Fortune's Favor | active | Self AoE | 18 | 15 | 0.50 | 0 | 20 | Enhance critical strikes. |  |
| assault_killer_instinct | Killer Instinct | passive |  |  |  |  |  |  | Enhanced offense. |  |
| assault_rampage | Rampage | active | Self AoE | 22 | 18 | 0.50 | 0 | 18 | Ultimate offensive buff. |  |
| assault_rapid_strikes | Rapid Strikes | active | Self AoE | 14 | 8 | 0.20 | 0 | 16 | Increase attack speed. |  |
| assault_war_veteran | War Veteran | passive |  |  |  |  |  |  | Seasoned warrior. |  |

#### Guild - Assault — details

- **Battle Cry** (`assault_battle_cry`) — Empower combat prowess.
  - Grants Battle Fury buff (+20% all damage, +10% crit mult, 7s) to allies. | Scaling: Buff Only | Buffs/Debuffs: battle_fury
- **Bloodlust** (`assault_bloodlust`) — Enter berserker state.
  - Grants Berserker Rage buff to you and nearby allies (+40% attack, -20% defense, 6s). | Scaling: Buff Only | Buffs/Debuffs: berserker_rage
- **Fortune's Favor** (`assault_fortune`) — Enhance critical strikes.
  - Grants Lucky buff (+25% crit chance, +50% crit multiplier, 10s) to allies. | Scaling: Buff Only | Buffs/Debuffs: lucky
- **Killer Instinct** (`assault_killer_instinct`) — Enhanced offense.
  - +8% attack speed, +15% movement speed, +5% all damage. Always active when selected.
- **Rampage** (`assault_rampage`) — Ultimate offensive buff.
  - Grants Berserk buff (+50% attack, +30% speed, -30% defense, 8s). High risk, high reward. | Scaling: Buff Only | Buffs/Debuffs: berserk
- **Rapid Strikes** (`assault_rapid_strikes`) — Increase attack speed.
  - Grants Swift Strikes buff (+25% attack speed, +15% movement speed, 8s). | Scaling: Buff Only | Buffs/Debuffs: swift_strikes
- **War Veteran** (`assault_war_veteran`) — Seasoned warrior.
  - +2.0 attack, +10% crit chance, +12% crit multiplier. Always active when selected.

### Guild - Support

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| support_defensive_stance | Defensive Stance | active | Self AoE | 16 | 12 | 0.30 | 0 | 18 | Enhanced blocking. |  |
| support_divine_protection | Divine Protection | active | Self AoE | 25 | 20 | 0.60 | 0 | 16 | Ultimate protection. |  |
| support_enduring_spirit | Enduring Spirit | active | Self AoE | 14 | 9 | 0.30 | 0 | 18 | Boost stamina. |  |
| support_fortify | Fortify | active | Self AoE | 20 | 11 | 0.40 | 0 | 20 | Massive shield. |  |
| support_iron_resolve | Iron Resolve | active | Self AoE | 18 | 10 | 0.40 | 0 | 20 | Unbreakable defense. |  |
| support_resilience | Resilience | passive |  |  |  |  |  |  | Enhanced endurance. |  |
| support_stalwart_defender | Stalwart Defender | passive |  |  |  |  |  |  | Defensive mastery. |  |

#### Guild - Support — details

- **Defensive Stance** (`support_defensive_stance`) — Enhanced blocking.
  - Grants Guardian Stance buff (+35% defense, +25% block effectiveness, 8s). | Scaling: Buff Only | Buffs/Debuffs: guardian_stance
- **Divine Protection** (`support_divine_protection`) — Ultimate protection.
  - Grants Divine Shield buff (Immune to damage and CC, 3s). Emergency use only. | Scaling: Buff Only | Buffs/Debuffs: divine_shield
- **Enduring Spirit** (`support_enduring_spirit`) — Boost stamina.
  - Grants Endurance buff (+25% max stamina, +12 stam/s regen, 10s) to allies. | Scaling: Buff Only | Buffs/Debuffs: endurance
- **Fortify** (`support_fortify`) — Massive shield.
  - Grants Fortified buff (+300 shield, +20% shield effectiveness, 8s) to allies. | Scaling: Buff Only | Buffs/Debuffs: fortified
- **Iron Resolve** (`support_iron_resolve`) — Unbreakable defense.
  - Grants Iron Will buff (+50% defense, immune to CC, 5s) to allies. | Scaling: Buff Only | Buffs/Debuffs: iron_will
- **Resilience** (`support_resilience`) — Enhanced endurance.
  - +20% max stamina, +10 stamina/s, +1.0 HP/s. Always active when selected.
- **Stalwart Defender** (`support_stalwart_defender`) — Defensive mastery.
  - +15% defense, +12% block effectiveness, +30 max HP. Always active when selected.

### Restoration

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| resto_life_bond | Life Bond | passive |  |  |  |  |  |  | Enhanced vitality. |  |
| resto_mana_affinity | Mana Affinity | passive |  |  |  |  |  |  | Enhanced mana flow. |  |
| resto_mana_flow | Mana Flow | active | Self AoE | 14 | 9 | 0.30 | 0 | 20 | Mana regeneration over time. |  |
| resto_rejuvenation | Rejuvenation | active | Self AoE | 16 | 10 | 0.40 | 0 | 20 | HP regeneration over time. |  |
| resto_spiritual_attunement | Spiritual Attunement | active | Self AoE | 16 | 11 | 0.40 | 0 | 18 | Max mana boost and regen. |  |
| resto_vampiric_aura | Vampiric Aura | active | Self AoE | 20 | 13 | 0.50 | 0 | 20 | Lifesteal boost. |  |
| resto_vitality | Vitality Surge | active | Self AoE | 18 | 12 | 0.40 | 0 | 18 | Max HP boost and regen. |  |

#### Restoration — details

- **Life Bond** (`resto_life_bond`) — Enhanced vitality.
  - +35 max HP, +1.5 HP/s, +8% lifesteal. Always active when selected.
- **Mana Affinity** (`resto_mana_affinity`) — Enhanced mana flow.
  - +20 max mana, +1.8 mana/s, +5% healing power. Always active when selected.
- **Mana Flow** (`resto_mana_flow`) — Mana regeneration over time.
  - Grants Mana Surge buff (Restores 8 mana per second, 6s) to allies. | Scaling: Buff Only | Buffs/Debuffs: mana_surge
- **Rejuvenation** (`resto_rejuvenation`) — HP regeneration over time.
  - Grants Regeneration buff (Restores 5 HP per second, 8s) to allies. | Scaling: Buff Only | Buffs/Debuffs: regeneration
- **Spiritual Attunement** (`resto_spiritual_attunement`) — Max mana boost and regen.
  - Grants Spirit buff (+20% max mana, +5 mana/s regen, 12s) to allies. | Scaling: Buff Only | Buffs/Debuffs: spirit
- **Vampiric Aura** (`resto_vampiric_aura`) — Lifesteal boost.
  - Grants Lifesteal Surge buff (+15% lifesteal, 10s) to allies. Damage heals you. | Scaling: Buff Only | Buffs/Debuffs: lifesteal_boost
- **Vitality Surge** (`resto_vitality`) — Max HP boost and regen.
  - Grants Vigor buff (+15% max HP, +8 HP/s regen, 12s) to allies. | Scaling: Buff Only | Buffs/Debuffs: vigor

### Arcane Arts

| Id | Name | Type | Target | Mana | CD | Cast | Range | Radius | Summary | Runtime |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| arcane_power_surge | Arcane Power | active | Self AoE | 18 | 13 | 0.40 | 0 | 20 | Magic damage boost. |  |
| arcane_scholar | Arcane Scholar | passive |  |  |  |  |  |  | Magical expertise. |  |
| arcane_concentration | Concentration | active | Self AoE | 18 | 12 | 0.40 | 0 | 20 | Reduce costs and cooldowns. |  |
| arcane_mental_clarity | Mental Clarity | active | Self AoE | 16 | 10 | 0.30 | 0 | 18 | Silence immunity and mana regen. |  |
| arcane_shadow_veil | Shadow Veil | active | Self AoE | 20 | 15 | 0.50 | 0 | 16 | Stealth and enhanced crits. |  |
| arcane_swiftness | Swiftness | active | Self AoE | 14 | 8 | 0.20 | 0 | 18 | Movement speed boost. |  |
| arcane_versatility | Versatility | passive |  |  |  |  |  |  | Adaptive mastery. |  |

#### Arcane Arts — details

- **Arcane Power** (`arcane_power_surge`) — Magic damage boost.
  - Grants Arcane Power buff (+30% magic damage, +15% mana regen, 10s) to allies. | Scaling: Buff Only | Buffs/Debuffs: arcane_power
- **Arcane Scholar** (`arcane_scholar`) — Magical expertise.
  - +8% CDR, +18 max mana, +1.2 mana/s. Always active when selected.
- **Concentration** (`arcane_concentration`) — Reduce costs and cooldowns.
  - Grants Focus buff (+20% CDR, -50% mana costs, 8s) to allies. Powerful utility. | Scaling: Buff Only | Buffs/Debuffs: focus
- **Mental Clarity** (`arcane_mental_clarity`) — Silence immunity and mana regen.
  - Grants Clarity buff (Immune to silence, +25% mana regen, 10s) to allies. | Scaling: Buff Only | Buffs/Debuffs: clarity
- **Shadow Veil** (`arcane_shadow_veil`) — Stealth and enhanced crits.
  - Grants Stealth buff (Invisible to enemies, +50% crit chance, 5s) to allies. Break on damage. | Scaling: Buff Only | Buffs/Debuffs: stealth
- **Swiftness** (`arcane_swiftness`) — Movement speed boost.
  - Grants Haste buff (+30% movement speed, 5s) to allies. Quick repositioning. | Scaling: Buff Only | Buffs/Debuffs: haste
- **Versatility** (`arcane_versatility`) — Adaptive mastery.
  - +6% all stats, +10% movement speed, +5% cast speed. Always active when selected.

---

## Player Achievement Tracking

### Kill Counter System

The game tracks your combat achievements in real-time, displayed in the bottom-right corner of the screen.

#### Kill Counter
- **Location**: Bottom-right panel with black background and gold border
- **Displays**:
  - **Kills**: Total number of enemies killed by the player
  - **Biggest Bomb**: Highest multikill streak achieved in a single session
- **Visual Style**: Gold text (#d4af37) on black background (85% opacity)

#### Attribution Rules
Kills only count when **you deal the final damage point** that executes the enemy. This means:

**Counts as Your Kill**:
- Direct melee attacks (Slash, Cleave)
- Your projectiles (Arc Bolt, Piercing Lance, etc.)
- Your area damage abilities (Gravity Well, Meteor Slam)
- Damage-over-time effects **you** applied (Bleed, Burn, Shock from your abilities)

**Does NOT Count as Your Kill**:
- Enemy-on-enemy damage (enemies fighting each other)
- Friendly/group member attacks
- Level scaling damage (automatic difficulty balancing)
- DoTs applied by other units (friendly or enemy casters)

#### Bomb Notifications
When you get 3 or more kills within a 3-second window, you trigger a **BOMB!** achievement:

- **Visual**: Center-screen popup notification (like level-up text)
  - "BOMB!" text in **purple** (#b565d8) with thick black text-shadow borders
  - Kill count in **gold** (#d4af37) with thick black text-shadow borders
- **Audio**: Special bomb notification sound plays
- **Tracking**: Your "Biggest Bomb" counter updates if this streak exceeds your previous record

#### Sound Effects
- **Kill Sound**: Plays on every confirmed player kill (`kill counter sound.wav` at 50% volume)
- **Bomb Sound**: Plays when bomb notification triggers (`bomb notification.mp3` at 60% volume)

#### Gameplay Tips
- Multikills reset the 3-second timer with each kill, allowing extended bomb streaks
- Area damage abilities (Gravity Well, Meteor Slam) are effective for bomb achievements
- DoTs can contribute to bombs if the tick lands the killing blow within the time window
- Guard blocking and enemy infighting do not interfere with your kill tracking
