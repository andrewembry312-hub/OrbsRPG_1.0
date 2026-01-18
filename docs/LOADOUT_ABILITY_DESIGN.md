# Fighter Loadout Ability Design

**Design Philosophy:**
- Each fighter has 5 unique, bound abilities
- Abilities create intentional tactical combos
- Diverse strategies across all fighters
- No duplicate abilities within a single loadout

---

## DPS LOADOUTS (8 Fighters)

### 1. **Ragnar the Cleaver** (warrior_melee_basic)
**Role:** Greatsword AoE Berserker  
**Tactical Identity:** Heavy cleaving with burst windows  
**Combo Strategy:** Cleave spam → Meteor to group → Shoulder charge to chase  
**Abilities:**
1. `slash` - Basic melee filler (0.22s CD)
2. `warrior_cleave` - Heavy cleave with bleed (4.2s CD)
3. `cleave` - Wide arc AoE (3.5s CD)
4. `meteor_slam` - Ground AoE burst (10s CD)
5. `shoulder_charge` - Gap closer/escape (7s CD)

---

### 2. **Ember the Pyromancer** (mage_destruction_basic)
**Role:** Fire Mage with AoE + Chain Lightning  
**Tactical Identity:** Ranged burst caster with multi-target pressure  
**Combo Strategy:** Arc bolt filler → Chain for multi-target → Pierce for execute  
**Abilities:**
1. `arc_bolt` - Cheap single target (1.1s CD, 6 mana)
2. `chain_light` - Multi-target chains (4.8s CD)
3. `piercing_lance` - Line pierce (6.4s CD)
4. `meteor_slam` - AoE nuke (10s CD)
5. `gravity_well` - CC + DoT zone (14s CD)

---

### 3. **Vex Shadowblade** (rogue_shadow_basic)
**Role:** Dagger Assassin - High mobility, high crit  
**Tactical Identity:** In-and-out assassin with mobility spells  
**Combo Strategy:** Shoulder charge in → Blade storm burst → Leap out if needed  
**Abilities:**
1. `slash` - Fast melee spam (0.22s CD)
2. `cleave` - AoE damage (3.5s CD)
3. `shoulder_charge` - Engage tool (7s CD)
4. `blade_storm` - AoE spin damage (9.5s CD)
5. `leap_strike` - Execute + escape (6.5s CD)

---

### 4. **Grom Ironfist** (warrior_axe_fury)
**Role:** Axe Berserker - Relentless fury  
**Tactical Identity:** Sustained cleaving with life leech  
**Combo Strategy:** Life leech for sustain → Cleaves for AoE → Warcry for shield  
**Abilities:**
1. `slash` - Filler attacks (0.22s CD)
2. `warrior_cleave` - Heavy cleave + bleed (4.2s CD)
3. `cleave` - Wide arc (3.5s CD)
4. `warrior_life_leech` - Sustain attack (4s CD)
5. `warcry` - Shield + stamina boost (8s CD)

---

### 5. **Battlemage Arcane** (battlemage_arcane)
**Role:** Hybrid Caster - Magic damage specialist  
**Tactical Identity:** Arcane missiles spam with mage utility  
**Combo Strategy:** Missiles spam → Time Warp for CDR → Radiant Aura for buffs  
**Abilities:**
1. `arc_bolt` - Filler (1.1s CD)
2. `chain_light` - Multi-target (4.8s CD)
3. `mage_arcane_missiles` - Homing missiles (5.5s CD)
4. `mage_time_warp` - CDR burst (18s CD)
5. `mage_radiant_aura` - Shield + speed buff (8s CD)

---

### 6. **Lyra Swiftarrow** (ranger_bow_sniper)
**Role:** Precision Ranger - Rapid volleys  
**Tactical Identity:** Hit-and-run with kiting tools  
**Combo Strategy:** Slash spam → Leap away when pressured → Gravity well to zone  
**Abilities:**
1. `slash` - Fast attacks (0.22s CD)
2. `cleave` - AoE sweep (3.5s CD)
3. `leap_strike` - Escape tool (6.5s CD)
4. `gravity_well` - CC zone (14s CD)
5. `warrior_fortitude` - Party shields (8s CD)

---

### 7. **Frost Control Mage** (mage_frost_control)
**Role:** Control Mage - Kiting specialist  
**Tactical Identity:** Kite with slows and CC  
**Combo Strategy:** Arc spam → Gravity well to lock → Pierce for burst  
**Abilities:**
1. `arc_bolt` - Cheap spam (1.1s CD)
2. `piercing_lance` - Line damage (6.4s CD)
3. `chain_light` - Multi-target (4.8s CD)
4. `gravity_well` - CC zone (14s CD)
5. `mage_sacred_ground` - Damage field (12s CD)

---

### 8. **Advanced Warrior** (warrior_magic_advanced)
**Role:** Hybrid Fighter - Staff + Buffs  
**Tactical Identity:** Magic damage with team buffs  
**Combo Strategy:** Chain spam → Pierce for burst → Radiant Aura for team  
**Abilities:**
1. `chain_light` - Multi-target (4.8s CD)
2. `piercing_lance` - Line pierce (6.4s CD)
3. `arc_bolt` - Filler (1.1s CD)
4. `meteor_slam` - AoE nuke (10s CD)
5. `mage_radiant_aura` - Team shield + buffs (8s CD)

---

## TANK LOADOUTS (8 Fighters)

### 9. **Aldric the Stalwart** (knight_basic)
**Role:** Classic Knight Tank  
**Tactical Identity:** Taunt + Shield Wall rotation  
**Combo Strategy:** Taunt for aggro → Shield Wall for defense → Rally for healing  
**Abilities:**
1. `knight_taunt` - Force aggro + vulnerability (8s CD)
2. `knight_shield_wall` - Big shields (9s CD)
3. `slash` - Filler damage (0.22s CD)
4. `knight_rally` - Ally heal + shield (10s CD)
5. `tank_iron_skin` - Personal tank cooldown (10s CD)

---

### 10. **Gareth Ironwall** (warden_advanced)
**Role:** Heavy Warden - Anchor specialist  
**Tactical Identity:** Root tank with Iron Skin  
**Combo Strategy:** Anchor to lock down → Iron Skin for defense → Bodyguard for team  
**Abilities:**
1. `tank_anchor` - Stun enemies + shield (9s CD)
2. `tank_iron_skin` - Personal defense (10s CD)
3. `slash` - Filler (0.22s CD)
4. `tank_bodyguard` - Team shields (11s CD)
5. `tank_ground_slam` - AoE damage + slow (6.5s CD)

---

### 11. **Seraphina Lightbringer** (paladin_holy)
**Role:** Holy Paladin - Self-heal tank  
**Tactical Identity:** Tank with self-sustain  
**Combo Strategy:** Taunt for aggro → Heal for sustain → Shield Wall for defense  
**Abilities:**
1. `knight_taunt` - Aggro tool (8s CD)
2. `heal_burst` - Self-heal (7.5s CD)
3. `slash` - Filler (0.22s CD)
4. `knight_shield_wall` - Big shields (9s CD)
5. `knight_rally` - Team support (10s CD)

---

### 12. **Boulder the Unbreakable** (guardian_stone)
**Role:** Maximum Defense Guardian  
**Tactical Identity:** Immovable fortress  
**Combo Strategy:** Iron Skin → Anchor → Bodyguard for maximum mitigation  
**Abilities:**
1. `tank_iron_skin` - Personal tank (10s CD)
2. `tank_anchor` - Lock down position (9s CD)
3. `slash` - Filler (0.22s CD)
4. `tank_bodyguard` - Team protection (11s CD)
5. `tank_seismic_wave` - Ranged poke (7.5s CD)

---

### 13. **Marcus the Sentinel** (sentinel_defensive)
**Role:** Defensive Specialist  
**Tactical Identity:** Shield Wall stacking  
**Combo Strategy:** Double Shield Wall uptime → Taunt for control  
**Abilities:**
1. `knight_shield_wall` - Primary defense (9s CD)
2. `knight_taunt` - Aggro control (8s CD)
3. `slash` - Filler (0.22s CD)
4. `knight_rally` - Team heal (10s CD)
5. `ward_barrier` - Extra shields (10s CD)

---

### 14. **Drogan Bloodrage** (berserker_tank)
**Role:** Aggressive Tank  
**Tactical Identity:** Offensive tank with cleaves  
**Combo Strategy:** Cleave for damage → Iron Skin for defense → Anchor to lock  
**Abilities:**
1. `slash` - Filler (0.22s CD)
2. `tank_anchor` - CC + shield (9s CD)
3. `cleave` - AoE damage (3.5s CD)
4. `tank_iron_skin` - Tank cooldown (10s CD)
5. `warrior_cleave` - Heavy cleave + bleed (4.2s CD)

---

### 15. **Thaddeus the Just** (crusader_holy)
**Role:** Holy Crusader - Layered defense  
**Tactical Identity:** Multiple defensive cooldowns  
**Combo Strategy:** Rotate Iron Skin + Shield Wall for 100% uptime  
**Abilities:**
1. `knight_taunt` - Aggro (8s CD)
2. `knight_shield_wall` - Defense (9s CD)
3. `slash` - Filler (0.22s CD)
4. `tank_iron_skin` - Tank (10s CD)
5. `knight_rally` - Team heal (10s CD)

---

### 16. **Titan the Fortress** (fortress_immovable)
**Role:** Ultimate Fortress  
**Tactical Identity:** Maximum defense stacking  
**Combo Strategy:** Iron Skin + Anchor + Bodyguard + Shield Wall = unstoppable  
**Abilities:**
1. `tank_iron_skin` - Personal defense (10s CD)
2. `tank_anchor` - CC + shield (9s CD)
3. `slash` - Filler (0.22s CD)
4. `tank_bodyguard` - Team shields (11s CD)
5. `knight_shield_wall` - Extra defense (9s CD)

---

## HEALER LOADOUTS (9 Fighters)

### 17. **Aria the Lightweaver** (mage_healer_basic)
**Role:** Light Mage Healer - Reactive  
**Tactical Identity:** Burst healing specialist  
**Combo Strategy:** Arc filler → Heal Burst on demand → Divine Touch for single target  
**Abilities:**
1. `heal_burst` - AoE heal (7.5s CD)
2. `arc_bolt` - Damage filler (1.1s CD)
3. `mage_divine_touch` - Single target heal (4.5s CD)
4. `ward_barrier` - Shields (10s CD)
5. `cleanse_wave` - Cleanse + light heal (9s CD)

---

### 18. **Father Benedict** (priest_basic)
**Role:** Holy Priest - Emergency healer  
**Tactical Identity:** Multiple heal bursts  
**Combo Strategy:** Spam heals when needed, arc filler when safe  
**Abilities:**
1. `heal_burst` - Primary heal (7.5s CD)
2. `arc_bolt` - Filler (1.1s CD)
3. `mage_divine_touch` - Targeted heal (4.5s CD)
4. `ward_barrier` - Shields (10s CD)
5. `beacon_of_light` - Ground HoT (11s CD)

---

### 19. **Willow Earthsong** (shaman_nature)
**Role:** Nature Shaman - Shield specialist  
**Tactical Identity:** Preventive shields  
**Combo Strategy:** Radiant Aura shields → Ward Barrier → Heals as backup  
**Abilities:**
1. `heal_burst` - Reactive heal (7.5s CD)
2. `mage_radiant_aura` - Shield pulse + buffs (8s CD)
3. `arc_bolt` - Filler (1.1s CD)
4. `ward_barrier` - Extra shields (10s CD)
5. `cleanse_wave` - Cleanse tool (9s CD)

---

### 20. **Celeste the Oracle** (oracle_divine)
**Role:** Divine Oracle - Preventive healer  
**Tactical Identity:** Pre-shield before damage  
**Combo Strategy:** Ward + Radiant Aura before fights → Heals after  
**Abilities:**
1. `ward_barrier` - Preventive shields (10s CD)
2. `heal_burst` - Reactive heal (7.5s CD)
3. `mage_radiant_aura` - Shield + buffs (8s CD)
4. `arc_bolt` - Filler (1.1s CD)
5. `mage_divine_touch` - Targeted heal (4.5s CD)

---

### 21. **Rowan Greenleaf** (druid_restoration)
**Role:** Restoration Druid - HoT specialist  
**Tactical Identity:** Heal over time focus  
**Combo Strategy:** Renewal Field for HoT → Heals for burst → Radiant Aura for shields  
**Abilities:**
1. `heal_burst` - Burst heal (7.5s CD)
2. `renewal_field` - HoT aura (12s CD)
3. `mage_radiant_aura` - Shields (8s CD)
4. `arc_bolt` - Filler (1.1s CD)
5. `ward_barrier` - Extra shields (10s CD)

---

### 22. **Morgana Battlepriest** (cleric_war)
**Role:** War Cleric - Hybrid damage/heal  
**Tactical Identity:** Offensive healer  
**Combo Strategy:** Chain Lightning for damage → Heals when needed  
**Abilities:**
1. `heal_burst` - Heal (7.5s CD)
2. `arc_bolt` - Filler (1.1s CD)
3. `chain_light` - Damage spell (4.8s CD)
4. `mage_radiant_aura` - Shields + buffs (8s CD)
5. `ward_barrier` - Shields (10s CD)

---

### 23. **Templar Holy** (templar_holy)
**Role:** Holy Templar - Group shields  
**Tactical Identity:** Mass shield specialist  
**Combo Strategy:** Radiant Aura + Ward Barrier for max shields → Heals as backup  
**Abilities:**
1. `mage_radiant_aura` - Shield pulse (8s CD)
2. `heal_burst` - Heal (7.5s CD)
3. `ward_barrier` - Shields (10s CD)
4. `arc_bolt` - Filler (1.1s CD)
5. `mage_divine_touch` - Targeted heal (4.5s CD)

---

### 24. **Luna Starwhisper** (mystic_ethereal)
**Role:** Ethereal Mystic - Mana efficient  
**Tactical Identity:** High mana regen, spam heals  
**Combo Strategy:** Pure healing focus, no damage  
**Abilities:**
1. `heal_burst` - Primary heal (7.5s CD)
2. `arc_bolt` - Filler (1.1s CD)
3. `mage_divine_touch` - Single target (4.5s CD)
4. `ward_barrier` - Shields (10s CD)
5. `renewal_field` - HoT field (12s CD)

---

### 25. **Guard Mage Healer** (guard_mage_healer)
**Role:** Guard Formation Healer  
**Tactical Identity:** Pre-fight shields, reactive heals  
**Combo Strategy:** Ward + Radiant before combat → Heals during  
**Abilities:**
1. `ward_barrier` - Pre-fight shields (10s CD)
2. `mage_radiant_aura` - AoE shields (8s CD)
3. `heal_burst` - Reactive heal (7.5s CD)
4. `arc_bolt` - Filler (1.1s CD)
5. `mage_divine_touch` - Targeted heal (4.5s CD)

---

### 26. **Guard Warrior DPS** (guard_warrior_dps)
**Role:** Guard Formation DPS  
**Tactical Identity:** Coordinated AoE burst  
**Combo Strategy:** Gravity → Meteor → Charge in formation  
**Abilities:**
1. `gravity_well` - Pull enemies (14s CD)
2. `meteor_slam` - AoE burst (10s CD)
3. `shoulder_charge` - Engage (7s CD)
4. `slash` - Filler (0.22s CD)
5. `cleave` - AoE (3.5s CD)

---

## KEY DESIGN PRINCIPLES

1. **No Duplicate Abilities** - Each loadout has 5 unique abilities
2. **Tactical Combos** - Abilities synergize for specific playstyles
3. **Role Identity** - DPS deals damage, Tanks control + tank, Healers support
4. **Varied Strategies** - No two fighters play the same way
5. **Bound to Card** - Abilities cannot be swapped (like gear)
6. **Intentional Design** - Every ability choice serves the tactical identity

---

**Updated:** January 9, 2026
