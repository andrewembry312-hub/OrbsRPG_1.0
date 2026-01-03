# Buff & Debuff Usage Audit Report

**Generated:** $(new Date().toLocaleString())

## Executive Summary

- **Total Buffs/Debuffs:** 37 in BUFF_REGISTRY + 7 in DOT_REGISTRY = 44 total
- **Actively Used:** 26 (59%)
- **Completely Unused:** 18 (41%)

---

## ACTIVELY USED BUFFS/DEBUFFS (26/44)

### Combat Buffs (10/10) ✅ 100% Used
- ✅ **healing_empowerment** - Applied by: `mage_divine_touch`
- ✅ **blessed** - Applied by: `mage_sacred_ground`
- ✅ **radiance** - Applied by: `mage_radiant_aura`
- ✅ **temporal_flux** - Applied by: `mage_time_warp`
- ✅ **iron_will** - Applied by: `knight_taunt`, `tank_iron_skin`
- ✅ **swift_strikes** - Applied by: `warcry`
- ✅ **battle_fury** - Applied by: `knight_rally`
- ✅ **guardian_stance** - Applied by: `knight_shield_wall`, `tank_bodyguard`, `tank_anchor`
- ✅ **berserk** - Applied by: `warrior_berserk`
- ✅ **haste** - Applied by: `warrior_charge`

### Sustain Buffs (4/7) - 57% Used
- ✅ **regeneration** - Applied by: `heal_burst`, `renewal_field`, `beacon_of_light`
- ✅ **vigor** - Applied by: `knight_banner`
- ✅ **fortified** - Applied by: `ward_barrier`, `warrior_fortitude`
- ✅ **clarity** - Applied by: `cleanse_wave`

### Crowd Control Debuffs (3/4) - 75% Used
- ✅ **slow** - Applied by: `chain_light`, `leap_strike`, `meteor_slam`, `gravity_well`, `tank_ground_slam`
- ✅ **stun** - Applied by: `leap_strike`, `warrior_charge`, `tank_anchor`
- ✅ **silence** - Applied by: `mage_arcane_missiles`

### Stat Reduction Debuffs (3/6) - 50% Used
- ✅ **weakness** - Applied by: `warrior_cleave`
- ✅ **vulnerability** - Applied by: `knight_taunt`
- ✅ **curse** - Applied by: `gravity_well`

### DoTs (4/7) - 57% Used
- ✅ **shock** - Applied by: `arc_bolt`, `chain_light`, `tank_seismic_wave`
- ✅ **bleed** - Applied by: `leap_strike`, `cleave`, `warrior_life_leech`, `warrior_cleave`, `blade_storm`
- ✅ **burn** - Applied via: weapon elemental effects
- ✅ **arcane_burn** - Applied by: `mage_arcane_missiles`

---

## COMPLETELY UNUSED (18/44)

### Combat Buffs (1 unused)
❌ **arcane_power**
- **Effect:** +30% magic damage, +15% mana regen
- **Why Unused:** Defined in registry but never applied
- **Quick Fix:** Add to mage ultimate ability

### Sustain Buffs (3 unused)
❌ **mana_surge**
- **Effect:** Restores mana over time
- **Why Unused:** Only UI reference, never applied
- **Quick Fix:** Add to `cleanse_wave` or priest support ability

❌ **spirit**
- **Effect:** +20% max mana, +5 mana/s regen
- **Why Unused:** Only UI reference
- **Quick Fix:** Add to `renewal_field`

❌ **endurance**
- **Effect:** +25% max stamina, +12 stam/s regen
- **Why Unused:** Only UI reference
- **Quick Fix:** Add to `warcry`

❌ **lifesteal_boost**
- **Effect:** +15% lifesteal
- **Why Unused:** Only UI reference
- **Quick Fix:** Add to `warrior_life_leech` for synergy

### Mobility Buffs (3 unused)
❌ **sprint**
- **Effect:** +50% movement speed, -10% defense
- **Why Unused:** Defined but never applied
- **Suggested Use:** Dodge/escape ability for all classes

❌ **root**
- **Effect:** Cannot move
- **Why Unused:** Defined in both buff and debuff sections but never applied
- **Suggested Use:** Add to `gravity_well` or create nature entangle ability

❌ **flight**
- **Effect:** +100% movement speed, immune to ground effects
- **Why Unused:** Only definition exists
- **Suggested Use:** Environmental buff zones (wind zones, updrafts)

### Utility Buffs (4 unused)
❌ **focus**
- **Effect:** +20% CDR, -50% mana costs
- **Why Unused:** Only UI reference
- **Suggested Use:** Mage burst window ability (alternative to time_warp)

❌ **stealth**
- **Effect:** Invisible to enemies, +50% crit chance
- **Why Unused:** Only definition exists
- **Suggested Use:** Rogue/Assassin ultimate ability

❌ **divine_shield**
- **Effect:** Immune to damage and CC
- **Why Unused:** Only definition exists
- **Suggested Use:** Knight/Paladin panic button (3s immunity)

❌ **lucky**
- **Effect:** +25% crit chance, +50% crit mult
- **Why Unused:** Only UI reference
- **Suggested Use:** Proc on crit streaks or rare item bonus

### Special CC States (4 unused)
❌ **freeze** (DoT)
- **Effect:** Ice DoT that applies frozen buff
- **Why Unused:** System fully implemented but never spawns
- **Quick Fix:** Add ice weapons to elemental weapon pool
- **Note:** Already has buffId:'frozen' configured!

❌ **frozen** (buff)
- **Effect:** Unable to move briefly
- **Why Unused:** Linked to freeze DoT but freeze never applied
- **Quick Fix:** Same as freeze - just needs ice weapons

❌ **shocked** (buff)
- **Effect:** +15% damage taken, -10% speed
- **Why Unused:** Defined but never applied (shock DoT exists separately)
- **Suggested Use:** Apply on shock DoT tick for stacking damage bonus

❌ **poison** (DoT)
- **Effect:** Poison damage over time
- **Why Unused:** DoT exists but never applied
- **Quick Fix:** Add to weapon elemental effects pool

---

## IMPLEMENTATION PRIORITY

### 🔥 HIGH PRIORITY - Complete Existing Systems

**1. freeze/frozen System** (READY TO USE!)
- System is 100% implemented in code
- freeze DoT automatically applies frozen buff
- **Action Required:** Just add ice weapons to spawn pool
```javascript
{ key:'ice', dotId:'freeze' }  // Add to ELEMENTAL_TYPES
```

**2. Resource Buffs** (Easy Additions)
```javascript
// mana_surge
case 'cleanse_wave': applyBuffAlliesAround(x, y, 120, 'mana_surge');

// spirit
case 'renewal_field': applyBuffAlliesAround(x, y, 140, 'spirit');

// endurance
case 'warcry': applyBuffAlliesAround(x, y, 120, 'endurance');

// lifesteal_boost
case 'warrior_life_leech': applyBuffSelf('lifesteal_boost');
```

**3. arcane_power** (Mage DPS Buff)
```javascript
case 'mage_arcane_surge':
  applyBuffSelf('arcane_power');
  // +30% magic damage burst window
```

**4. poison DoT** (Weapon Elemental)
```javascript
{ key:'poison', dotId:'poison' }  // Add to weapon element pool
```

### ⚡ MEDIUM PRIORITY - New Core Abilities

**5. stealth** (Rogue/Assassin Ultimate)
```javascript
case 'assassin_vanish':
  applyBuffSelf('stealth');
  reduceCooldowns(0.25);
  // Invisible + 50% crit for ambush
```

**6. divine_shield** (Knight/Paladin Immunity)
```javascript
case 'knight_divine_protection':
  applyBuffSelf('divine_shield');
  healSelf(30);
  // 3s immunity, breaks on action
```

**7. sprint** (Universal Mobility)
```javascript
case 'evasive_roll':
  applyBuffSelf('sprint');
  // Quick dodge with defense penalty
```

**8. focus** (Mage Cooldown Burst)
```javascript
case 'mage_arcane_focus':
  applyBuffSelf('focus');
  // CDR + mana cost reduction for combos
```

**9. root** (CC Debuff)
```javascript
case 'nature_entangle':
  areaDamage(x, y, radius, dmg, null, 'root');
  // Enemies can't move but can still attack
```

### 🎮 LOW PRIORITY - Advanced Features

**10. flight** (Environmental Zones)
```javascript
// Add buff zones to maps
if(player.inWindZone) applyBuffTo(player, 'flight');
// Cross gaps, avoid ground effects
```

**11. lucky** (Crit Streak Mechanic)
```javascript
if(player.critStreak >= 5) applyBuffSelf('lucky');
// Snowball mechanic for crit builds
```

**12. shocked** (Shock DoT Synergy)
```javascript
// Apply on shock DoT tick
if(unit.hasDot('shock')) applyBuffTo(unit, 'shocked');
// Stacking damage vulnerability
```

---

## NEW ABILITY CATEGORY SUGGESTIONS

Based on the unused buffs/debuffs, here are potential new ability trees:

### 🗡️ **Fighters Guild** (Physical Combat)
- **Blade Dance** → applies `sprint` + `haste`
- **Blood Frenzy** → applies `lifesteal_boost` + `berserk`
- **Battle Trance** → applies `endurance` + `focus`

### 🔮 **Mages Guild** (Arcane Mastery)
- **Arcane Surge** → applies `arcane_power` + `focus`
- **Mana Font** → applies `mana_surge` + `spirit`
- **Time Stop** → applies `divine_shield` (self) + `root` (enemies)

### 🌿 **Nature Magic** (Elementals)
- **Ice Armor** → applies `freeze` aura around caster
- **Toxic Cloud** → applies `poison` DoT in area
- **Lightning Reflexes** → applies `shocked` debuff on attacker when hit

### 🎭 **Rogue/Assassin** (Stealth DPS)
- **Vanish** → applies `stealth` + `lucky`
- **Shadow Step** → applies `sprint` + removes roots
- **Coup de Grâce** → massive damage if `stealth` active

### ⚡ **Environmental Hazards**
- **Wind Zones** → applies `flight` (move fast, no ground DoTs)
- **Ice Patches** → applies `frozen` + `slow`
- **Thunder Storms** → applies `shocked` + shock DoT
- **Poison Gas** → applies `poison` DoT
- **Sacred Ground** → applies `divine_shield` in small radius

---

## BALANCING FRAMEWORK

To make ability power adjustments easy, create a centralized config:

```javascript
// In skills.js or new balancing.js
export const ABILITY_POWER_CONFIG = {
  // Damage multipliers by role
  roleMultipliers: {
    mage: { magic: 1.0, physical: 0.6 },
    warrior: { physical: 1.0, magic: 0.7 },
    tank: { physical: 0.8, magic: 0.6, healing: 1.2 },
    priest: { healing: 1.3, magic: 0.8 }
  },
  
  // Base damage values (reference)
  baseDamage: {
    light_attack: 5,
    slash: 7,
    cleave: 14,
    arc_bolt: 12,
    piercing_lance: 16
  },
  
  // Cooldown scaling
  cooldownMultiplier: 1.0,  // Global CDR adjustment
  
  // Resource costs
  resourceMultiplier: 1.0,  // Global cost adjustment
  
  // Buff durations
  buffDurationMultiplier: 1.0
};

// Apply multipliers in ability execution
function getAbilityDamage(abilityId, caster) {
  const base = ABILITY_POWER_CONFIG.baseDamage[abilityId];
  const role = caster.role || 'warrior';
  const meta = ABILITY_META[abilityId];
  const type = meta.type === 'projectile' ? 'magic' : 'physical';
  const mult = ABILITY_POWER_CONFIG.roleMultipliers[role]?.[type] || 1.0;
  return base * mult;
}
```

This allows quick rebalancing:
```javascript
// Increase all DPS damage by 10%
ABILITY_POWER_CONFIG.roleMultipliers.warrior.physical = 1.1;

// Reduce global cooldowns by 20%
ABILITY_POWER_CONFIG.cooldownMultiplier = 0.8;

// Make mana costs 50% higher (harder difficulty)
ABILITY_POWER_CONFIG.resourceMultiplier = 1.5;
```

---

## WEAPON ELEMENTAL SYSTEM (Needs Expansion)

Currently only fire/burn is active. The system supports:

```javascript
const ELEMENTAL_TYPES = [
  { key:'fire', dotId:'burn' },       // ✅ ACTIVE
  { key:'ice', dotId:'freeze' },      // ❌ READY but not spawning
  { key:'lightning', dotId:'shock' }, // ❌ READY but not spawning
  { key:'poison', dotId:'poison' },   // ❌ READY but not spawning
  { key:'bleed', dotId:'bleed' }      // ✅ ACTIVE (physical weapons)
];
```

**Fix:** Just add ice/lightning/poison weapons to spawn pools and they'll work instantly!

---

## TESTING CHECKLIST

When implementing new buffs/debuffs:

- [ ] Visual indicator (buff icon in HUD)
- [ ] Duration properly tracked
- [ ] Stacking behavior (if applicable)
- [ ] Stat modifiers applied correctly
- [ ] Tooltip shows accurate effect description
- [ ] Works with cleanse/dispel abilities
- [ ] Saves/loads properly
- [ ] Works on player, friendlies, and enemies
- [ ] Visual effects (particles, aura) if needed
- [ ] Sound effects on application/expiration

---

## NOTES

**Freeze/Frozen System:**
The freeze DoT already has `buffId:'frozen'` configured in DOT_REGISTRY. When a unit takes freeze DoT damage, the frozen buff is automatically applied, causing movement impairment. The entire system is implemented - it just needs ice weapons to actually spawn!

**Shocked vs shock:**
- `shock` = DoT that deals periodic lightning damage
- `shocked` = Buff that increases damage taken (+15%) and reduces speed (-10%)
- Currently only shock DoT is used; shocked buff is never applied
- **Suggestion:** Apply shocked buff when shock DoT ticks for synergy

**Root Duplication:**
`root` appears in both mobility buffs and CC debuffs sections. Should probably consolidate and use consistently as a debuff.

**Weapon Elementals:**
System is fully functional with fire/burn and bleed. Ice/lightning/poison are ready to use but need to be added to weapon spawn pools.

