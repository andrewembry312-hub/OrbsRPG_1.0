# Loadout System 2.0 - Design Document

## Overview

A **unified loadout system** where all loadouts (allies, enemies, guards) are defined in a single registry file with built-in combos, unlock progression, and easy extensibility.

---

## Design Philosophy

### ✅ What We Want
- **Single source of truth** - All loadouts in one file
- **Easy to add new loadouts** - Just add a new entry to the registry
- **Balanced by design** - You control the abilities + combos
- **Player progression** - Unlock better loadouts as you level
- **Enemy scaling** - Enemies use same loadout pool (auto-balanced)
- **Simple UI** - Pick loadout from dropdown/grid

### ❌ What We Avoid
- Complex ability customization (hard to balance)
- Scattered loadout definitions across multiple files
- Manual combo creation for each unit
- Unbalanced enemy builds

---

## System Architecture

### File: `loadout-registry.js`

**Single file containing:**
1. All loadout definitions
2. Associated combo plans
3. Unlock requirements
4. Helper functions

### Loadout Structure

Each loadout includes:
```javascript
{
  id: 'warrior_melee_basic',           // Unique identifier
  name: 'Berserker',                    // Display name
  description: 'Melee warrior...',      // Tooltip description
  class: 'warrior',                     // warrior, mage, knight, warden
  role: 'dps',                          // dps, tank, healer
  unlockLevel: 1,                       // When player can use it
  guardOnly: false,                     // Only for guards?
  
  // Equipment
  weapon: { 
    weaponType: 'Greatsword', 
    buffs: { atk: 8 } 
  },
  
  // Abilities (5 slots)
  abilities: ['slash', 'warrior_cleave', 'slash', 'cleave', 'slash'],
  
  // Combo Plan (integrated)
  combo: {
    loadoutId: 'warrior_melee_basic',
    coordinationMode: 'individual',     // or 'ball_group' for guards
    
    burstPhase: {
      duration: 2.0,
      sequence: [
        { ability: 'warrior_cleave', weaveAfter: true },
        { ability: 'slash', weaveAfter: true }
      ],
      targeting: 'normal'
    },
    
    kitePhase: {
      duration: 2.5,
      allowedAbilities: ['slash'],
      purpose: 'Mana recovery, reposition'
    },
    
    sustainPhase: {
      useAbilities: ['slash', 'cleave'],
      exitCondition: 'burst_ready',
      purpose: 'Maintain pressure'
    }
  }
}
```

---

## Current Loadouts (Launch Set)

### DPS Loadouts

| ID | Name | Class | Unlock | Weapon | Description |
|----|------|-------|--------|--------|-------------|
| `warrior_melee_basic` | Berserker | Warrior | Level 1 | Greatsword | High damage cleave attacks |
| `mage_destruction_basic` | Pyromancer | Mage | Level 1 | Destruction Staff | Fire-based AoE damage |
| `warrior_magic_advanced` | Spellblade | Warrior | Level 5 | Destruction Staff | Hybrid warrior-mage |
| `guard_warrior_dps` | Guard Fighter | Warrior | Level 10 | Greatsword | **Guard Only** - Coordinated AoE burst |

### Tank Loadouts

| ID | Name | Class | Unlock | Weapon | Description |
|----|------|-------|--------|--------|-------------|
| `knight_basic` | Vanguard | Knight | Level 1 | Sword | Basic tank with taunt + shield wall |
| `warden_advanced` | Ironclad | Warden | Level 8 | Greatsword | Heavy tank with powerful defensives |

### Healer Loadouts

| ID | Name | Class | Unlock | Weapon | Description |
|----|------|-------|--------|--------|-------------|
| `mage_healer_basic` | Cleric | Mage | Level 1 | Healing Staff | Burst heals + reactive healing |
| `guard_mage_healer` | Guard Medic | Mage | Level 10 | Healing Staff | **Guard Only** - Pre-fight shields + ball group heals |

---

## Progression System

### Unlock Tiers

**Level 1 (Start)**
- Berserker (DPS)
- Pyromancer (DPS)
- Vanguard (Tank)
- Cleric (Healer)

**Level 5**
- Spellblade (DPS)

**Level 8**
- Ironclad (Tank)

**Level 10 (Guards Unlock)**
- Guard Fighter (DPS)
- Guard Medic (Healer)

### Future Additions (Easy to Add)

Just add new entries to `LOADOUT_REGISTRY`:

```javascript
  assassin_dps: {
    id: 'assassin_dps',
    name: 'Shadow Assassin',
    description: 'Stealth DPS with burst damage',
    class: 'warrior',
    role: 'dps',
    unlockLevel: 15, // Mid-game unlock
    
    weapon: { weaponType: 'Dagger', buffs: { atk: 10, critChance: 0.15 } },
    abilities: ['backstab', 'shadow_step', 'poison_blade', 'backstab', 'shadow_step'],
    
    combo: {
      // ... combo plan here
    }
  },
```

---

## UI Integration

### Group Tab - Loadout Selection

**Current UI:** Complex ability selector with drag-and-drop

**New UI:** Simple loadout picker

```
┌─────────────────────────────────────────┐
│  Ally: Marcus (Level 12 Warrior)        │
├─────────────────────────────────────────┤
│  Role: DPS ▼                            │
│                                          │
│  ┌─────────────────────────────────┐   │
│  │ [✓] Berserker (Lv 1)             │   │
│  │     Greatsword • Melee Cleave    │   │
│  │                                  │   │
│  │ [✓] Spellblade (Lv 5)            │   │
│  │     Destruction Staff • Hybrid   │   │
│  │                                  │   │
│  │ [🔒] Bladedancer (Lv 20)         │   │
│  │     Dual Wield • Fast Attacks    │   │
│  └─────────────────────────────────┘   │
│                                          │
│  [Select Loadout]                       │
└─────────────────────────────────────────┘
```

**Clicking loadout shows details:**
```
┌─────────────────────────────────────────┐
│  Spellblade                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  Warrior wielding destruction magic.    │
│  Hybrid DPS with ranged burst damage.   │
│                                          │
│  Weapon: Destruction Staff               │
│  Abilities:                              │
│   • Chain Lightning                      │
│   • Piercing Lance                       │
│   • Arc Bolt                             │
│                                          │
│  Combo: Burst → Kite → Sustain          │
│   Burst: Chain → Lance → Bolt            │
│   Kite: Ranged attacks while recovering  │
│                                          │
│  [Equip Loadout]  [Cancel]              │
└─────────────────────────────────────────┘
```

### Non-Group Allies (Same UI)

When you recruit a new ally from home base:
- Same loadout picker
- Locked loadouts show lock icon
- Tooltip explains unlock requirement

### Enemy AI

Enemies automatically pick from appropriate loadouts:
```javascript
// In spawnEnemyAt()
const enemyLevel = calculateEnemyLevel();
const role = pickRandomRole(); // dps, tank, or healer
const availableLoadouts = getLoadoutsByRole(role, enemyLevel);
const loadout = availableLoadouts[randi(0, availableLoadouts.length - 1)];
applyLoadout(enemy, loadout.id);
```

**Result:** Enemies scale naturally because they use same loadout pool!

---

## Adding New Loadouts (Developer Guide)

### Step 1: Define Loadout

Add to `LOADOUT_REGISTRY` in `loadout-registry.js`:

```javascript
  my_new_loadout: {
    id: 'my_new_loadout',
    name: 'Cool Name',
    description: 'What it does',
    class: 'warrior', // or mage, knight, warden
    role: 'dps', // or tank, healer
    unlockLevel: 12, // When unlocked
    
    weapon: { 
      weaponType: 'Axe', 
      buffs: { atk: 9, critChance: 0.1 } 
    },
    
    abilities: ['ability1', 'ability2', 'ability3', 'ability4', 'ability5'],
    
    combo: {
      // See "Combo Design" section below
    }
  },
```

### Step 2: Design Combo Plan

Three phases: **Burst → Kite → Sustain**

```javascript
combo: {
  loadoutId: 'my_new_loadout',
  coordinationMode: 'individual', // 'ball_group' for guards
  
  burstPhase: {
    duration: 2.0, // How long to burst (seconds)
    sequence: [
      { ability: 'big_damage_ability', weaveAfter: true },
      { ability: 'finisher_ability', weaveAfter: true }
    ],
    targeting: 'normal' // 'normal', 'focus', 'aoe'
  },
  
  kitePhase: {
    duration: 2.5, // Recovery time (seconds)
    allowedAbilities: ['cheap_filler'], // Low-cost abilities
    purpose: 'Mana recovery, wait for cooldowns'
  },
  
  sustainPhase: {
    useAbilities: ['spam_ability1', 'spam_ability2'],
    exitCondition: 'burst_ready', // When to go back to burst
    purpose: 'Maintain pressure while waiting'
  }
}
```

### Step 3: Test

```javascript
// Console
import('./src/game/loadout-registry.js').then(mod => {
  const ally = state.friendlies[0];
  mod.applyLoadout(ally, 'my_new_loadout');
  console.log('Loadout applied!');
});
```

**That's it!** The combo automatically integrates into the combat AI.

---

## Combo Design Guidelines

### DPS Combos
- **Burst Phase:** High damage abilities in sequence
- **Kite Phase:** 2-3 seconds to recover mana
- **Sustain Phase:** Spam efficient abilities

**Example: Burst Mage**
```javascript
burst: ['chain_light', 'piercing_lance', 'arc_bolt'] // Big spells
kite: ['arc_bolt'] // Light filler
sustain: ['arc_bolt', 'chain_light'] // Efficient spam
```

### Tank Combos
- **Burst Phase:** Taunt + defensive cooldowns
- **Kite Phase:** Light attacks to maintain threat
- **Sustain Phase:** Hold position, basic attacks

**Example: Knight Tank**
```javascript
burst: ['knight_taunt', 'knight_shield_wall'] // Get aggro + defend
kite: ['slash'] // Maintain threat
sustain: ['slash'] // Hold aggro
```

### Healer Combos
- **Burst Phase:** Pre-fight shields/buffs (or empty for reactive)
- **Kite Phase:** Light damage filler
- **Sustain Phase:** Reactive healing (cast on ally HP drop)

**Example: Reactive Healer**
```javascript
burst: [] // No offensive burst - reactive only
kite: ['arc_bolt'] // Damage when nothing to heal
sustain: ['heal_burst'] // Cast when ally < 70% HP
```

---

## Benefits of This System

### For You (Developer)
✅ **Easy to add loadouts** - Just edit one file  
✅ **Combos auto-integrate** - No manual wiring  
✅ **Balance control** - You design all builds  
✅ **Enemy scaling** - Uses same pool, auto-balanced  

### For Players
✅ **Clear progression** - Unlock better loadouts as you level  
✅ **Role diversity** - Multiple options per role  
✅ **Simple UI** - Pick from list instead of complex customization  
✅ **Tooltips** - Clear descriptions of what each loadout does  

### For Game Balance
✅ **Tested builds** - All loadouts are designed and tested  
✅ **No broken combos** - Players can't create OP builds  
✅ **Fair enemies** - Enemies use same balanced loadouts  
✅ **Smooth scaling** - Higher level = better loadouts, not random abilities  

---

## Migration Path

### Phase 1: Create Registry ✅
- Created `loadout-registry.js` with initial loadouts
- Added helper functions
- Added console commands for testing

### Phase 2: Update UI (Next Step)
- Simplify group tab to loadout picker
- Add loadout preview modal
- Show unlock status

### Phase 3: Apply to Game Systems
- Update `spawnFriendly()` to use loadouts
- Update `spawnEnemyAt()` to pick from loadout pool
- Remove old manual ability assignment

### Phase 4: Add More Loadouts
- Create 15-20 total loadouts
- Cover all level tiers (1, 5, 10, 15, 20, 30, 40, 50)
- Add variety within each role

---

## Future Enhancements

### Loadout Customization (Optional)
Allow minor tweaks to loadouts:
- Swap 1-2 abilities
- Change weapon (within same category)
- Adjust stat priorities

### Loadout Sets
Themed sets with bonuses:
- "Pyromancer Set" - All fire abilities, +fire damage
- "Shadowblade Set" - All stealth abilities, +crit

### Prestige Loadouts
Ultra-rare endgame loadouts:
- Unlock at max level
- Require special achievements
- Unique abilities not available elsewhere

---

## Example: Complete Loadout

```javascript
battlemage_advanced: {
  id: 'battlemage_advanced',
  name: 'Battlemage',
  description: 'Melee warrior enhanced with arcane magic. Uses greatsword for close combat while weaving destruction spells for burst damage.',
  class: 'warrior',
  role: 'dps',
  unlockLevel: 12,
  
  weapon: { 
    weaponType: 'Greatsword', 
    buffs: { atk: 10, manaRegen: 1 } 
  },
  
  abilities: [
    'warrior_cleave',  // Melee AoE
    'arc_bolt',         // Magic damage
    'slash',            // Filler
    'chain_light',      // Magic burst
    'cleave'            // Melee AoE
  ],
  
  combo: {
    loadoutId: 'battlemage_advanced',
    coordinationMode: 'individual',
    
    burstPhase: {
      duration: 2.5,
      sequence: [
        { ability: 'warrior_cleave', weaveAfter: true },  // Melee opener
        { ability: 'chain_light', weaveAfter: true },     // Magic follow-up
        { ability: 'arc_bolt', weaveAfter: true }         // Magic finisher
      ],
      targeting: 'normal'
    },
    
    kitePhase: {
      duration: 3.0,
      allowedAbilities: ['arc_bolt'], // Ranged magic while kiting
      purpose: 'Mana recovery, reposition with ranged attacks'
    },
    
    sustainPhase: {
      useAbilities: ['slash', 'cleave', 'arc_bolt'],
      exitCondition: 'burst_ready',
      purpose: 'Mix melee and magic for sustained DPS'
    }
  }
},
```

**Why this works:**
- Clear identity (melee + magic hybrid)
- Defined combo rotation (cleave → chain → bolt)
- Natural flow (burst → kite → sustain)
- Easy to understand and play
- Balanced by design (tested abilities + timing)

---

## Testing Checklist

### New Loadout Testing
- [ ] Can apply loadout via console
- [ ] Abilities execute in correct order
- [ ] Burst phase triggers properly
- [ ] Kite phase recovers mana
- [ ] Sustain phase maintains pressure
- [ ] Light attack weaving works
- [ ] Combo loops smoothly
- [ ] Mana doesn't starve completely
- [ ] DPS feels appropriate for unlock level

### UI Testing
- [ ] Loadout shows in picker
- [ ] Lock icon shows if under level
- [ ] Description is clear
- [ ] Weapon/abilities preview works
- [ ] Equip button applies loadout
- [ ] Changes persist after restart

---

**Last Updated:** January 8, 2026
