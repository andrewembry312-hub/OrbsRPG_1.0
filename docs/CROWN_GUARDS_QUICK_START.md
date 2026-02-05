# Crown Guard System - Quick Start Guide

## TL;DR - What You Need to Know

✅ **Crown guards are NOW:**
- Blue orbs with black borders and fighter card images
- Using a **loadout type system** (tank, healer, dps1, dps2, dps3)
- Following the **crown instead of defending bases**
- Using **priority-based AI** (tank shields, healer heals, dps hunts)
- Spawning in a **pentagon formation** around their crown
- Chasing the crown if it moves > 500px away

---

## The Loadout Type System

Each of the 5 guards has a unique loadout type:

### Guard #1: TANK (Guard Leader)
```
Role: TANK | Priority: 1 (Highest)
Class: Warrior
Stats: +50% HP, +30% DEF, -10% SPD
Behavior: 
  • Stay closest to crown (80px away)
  • Intercept enemies within 200px of crown
  • Block threats before they reach crown
```

### Guard #2: HEALER (Archmage)
```
Role: HEALER | Priority: 2 (High)
Class: Mage
Stats: -10% HP, +40% Mana, -5% SPD
Behavior:
  • Stay mid-range from crown (120px away)
  • Find hurt allies (< 75% health)
  • Move to heal hurt guards
```

### Guards #3, #4, #5: DPS (Knight, Battle Mage, Captain)
```
Role: DPS | Priority: 3 (Medium)
Classes: Warrior/Mage (mixed)
Stats: +25-35% DMG, +5-15% SPD
Behavior:
  • Stay outer formation (150px away)
  • Hunt enemies in 300px radius
  • Attack threats threatening crown
  • Return to formation when no threats
```

---

## Pentagon Formation

Guards form a 5-point star around the crown:

```
        Guard 0 (TANK)
           /\
          /  \
         /    \
    Guard 4   Guard 1
   (DPS3)   (HEALER)
        \    /
         \  /
          \/
          (CROWN)
          /\
         /  \
      Guard 3  Guard 2
      (DPS2)   (DPS1)
```

**Formation Details:**
- Center: Crown position
- Radius: 90 pixels
- Spacing: 72 degrees between each guard
- **Updates every frame** as crown moves
- Automatically reforms when threats cleared

---

## Behavior Priorities

### Priority 1: TANK
"I will protect the crown at all costs"
```
Crown under threat? → Move to intercept
No threats? → Sit on crown (80px distance)
Crown moves? → Follow and reposition
```

### Priority 2: HEALER
"I will keep my team alive"
```
Teammate hurt? → Go heal them
All healthy? → Support from mid-range (120px)
Crown moves? → Follow and stay centered
```

### Priority 3: DPS (×3)
"I will hunt threats to the crown"
```
Enemy nearby? → Attack it
No enemies? → Maintain formation (150px)
Crown moves? → Follow and reposition
```

---

## Chase Behavior

When crown moves > 500px from spawn point:

1. ✅ Guard `guardMode` switches to "chase"
2. ✅ Guard ignores formation
3. ✅ Guard targets crown directly
4. ✅ All priorities still apply (tank closest, healer supports)
5. ✅ When crown back in range → Return to formation

---

## Visual Appearance

Crown guards render as:

```
  Blue Orb (r=40, boss size)
  │
  ├─ Color: #3498db (bright blue)
  ├─ Border: #000000 (black), 3px thick
  ├─ Image: Fighter card overlay
  │  └─ Warrior or Mage based on class
  ├─ Label: Guard name in blue text
  └─ HP Bar: Above orb, color-coded

Example: "Guard Leader (Elite)"
```

---

## How to Test

### 1. Start Emperor Mode
```javascript
// In console
window.activateEmperor()
// Or complete empire victory condition
```

### 2. Check Guard Status
```javascript
// In console
window.getCrownGuardStatus()

// Output:
// 🛡️ TEAMA TEAM GUARDS:
//   👑 Crown: (1024, 768)
//   Guards: 5/5
//   ✓ [TANK] Guard Leader | HP: 300/300 | Dist to Crown: 70 | Mode: protect
//   ✓ [HEALER] Archmage | HP: 162/162 | Dist to Crown: 120 | Mode: protect
//   ✓ [DPS] Guard Knight | HP: 260/260 | Dist to Crown: 90 | Mode: protect
//   ✓ [DPS] Battle Mage | HP: 250/250 | Dist to Crown: 90 | Mode: protect
//   ✓ [DPS] Guard Captain | HP: 270/270 | Dist to Crown: 90 | Mode: protect
```

### 3. View Formation
```javascript
// In console
window.visualizeCrownGuardFormation()

// Output:
// 🔷 CROWN GUARD FORMATION VISUALIZATION
// TEAMA Formation (Crown at 1024, 768):
//   Position 1: [TANK] Guard Leader - ✓ ALIGNED
//   Position 2: [HEALER] Archmage - ✓ ALIGNED
//   Position 3: [DPS] Guard Knight - ✓ ALIGNED
//   Position 4: [DPS] Battle Mage - ⚠ OFFSET 15px
//   Position 5: [DPS] Guard Captain - ✓ ALIGNED
```

### 4. Test Chase
```javascript
// In console
window.testCrownGuardChase()

// Moves crown to player position
// Watch guards chase it to player
// Formation should break and reform when they arrive
```

### 5. View Loadout Types
```javascript
// In console
window.getCrownGuardLoadouts()

// Output all loadout types and their properties
```

---

## Key Properties

### On Each Guard Object

```javascript
{
  // Crown System
  crownGuard: true,              // Mark as crown guard
  crownTeam: 'teamA',            // Which team
  crownId: 'crown_xyz',          // Crown entity ID
  crownSiteId: 'team_a_base',    // Base site
  
  // Loadout System
  loadoutType: 'tank',           // tank/healer/dps1/dps2/dps3
  loadoutId: 'crown_guard_tank', // Unique loadout
  guardPriority: 1,              // 1=tank, 2=healer, 3=dps
  
  // Formation
  crownFormationIndex: 0,        // Position 0-4
  crownFollowRange: 80,          // How close to stay (tank)
  
  // AI
  guardMode: 'protect',          // protect/chase/heal/attack
  lastCrownX: 1024,
  lastCrownY: 768,
  crownChaseRange: 500,          // Distance before chasing
  
  // Visual
  color: '#3498db',              // Blue
  borderColor: '#000000',        // Black border
  imgPath: '...fighter card...'  // Image overlay
}
```

---

## Common Scenarios

### Scenario 1: Crown at Base
```
Guards: In pentagon formation, protecting crown
Tank: 80px from crown
Healer: 120px from crown
DPS: 150px from crown
Mode: All "protect"
```

### Scenario 2: Crown Moves to Player
```
Distance: > 500px from spawn
Guards: Break formation, chase crown
All Guards: Head toward crown position
Mode: All switch to "chase"
```

### Scenario 3: Enemy Attacks Crown
```
Tank: Moves to intercept threat
Healer: Checks if anyone hurt
DPS: Hunt the enemy
Mode: Tank "protect" + intercept, DPS "attack"
```

### Scenario 4: Guard Gets Hurt
```
HP: Falls below 75% max
Healer: Notices hurt guard
Healer: Moves to heal
Other Guards: Maintain formation
Mode: Healer "heal"
```

---

## Console Commands Reference

| Command | Effect |
|---------|--------|
| `getCrownGuardStatus()` | Show all guards, HP, position, mode |
| `getCrownGuardLoadouts()` | Show loadout type definitions |
| `visualizeCrownGuardFormation()` | Check formation alignment |
| `testCrownGuardChase()` | Move crown to player for testing |

---

## What's Different From Regular Guards

| Aspect | Regular Guard | Crown Guard |
|--------|---------------|-----------|
| **Purpose** | Defend outpost | Protect crown |
| **Target** | Outpost site | Crown entity |
| **Behavior** | Static patrol → aggro → return | Dynamic formation → chase |
| **Loadout** | Fixed class (warrior/mage) | Loadout type system |
| **Priorities** | Defend objective | Priority-based (1/2/3) |
| **Formation** | None | Pentagon around crown |
| **Color** | Team color | Always blue |
| **Image** | Variant sprite | Fighter card image |
| **Properties** | `guard: true, homeSiteId: 'x'` | `crownGuard: true, crownSiteId: 'x'` |

---

## Files Modified

1. **src/game/game.js**
   - Added `CROWN_GUARD_LOADOUTS` definition
   - Enhanced `spawnCrownGuards()` with loadout system
   - Enhanced `updateCrownGuardAI()` with priority logic
   - Added console debug commands

2. **src/game/render.js**
   - Check for `crownGuard` flag for blue color
   - Render fighter card images
   - Draw black borders

---

## Next Steps (Optional Enhancements)

- [ ] Crown guard leveling/XP system
- [ ] Special "Crown Barrier" ultimate ability
- [ ] Morale system (stronger when crown safe)
- [ ] Guard scatter AI when crown taken
- [ ] Team-colored crown guard skins

---

## Getting Help

**Q: Guards not showing as blue?**  
A: Check `render.js` - ensure `crownGuard` check is in enemy rendering loop

**Q: Guards not chasing crown?**  
A: Run `getCrownGuardStatus()` and check `guardMode` and `distToCrown`

**Q: Formation not forming?**  
A: Run `visualizeCrownGuardFormation()` to see alignment

**Q: Loadout not applying?**  
A: Check console logs during spawn, should see loadout name printed

---

**System Status**: ✅ **LIVE AND WORKING**

Date: 2026-01-25  
Emperor Mode: Phase 3 - Crown Guard System  
Version: Complete with Loadout Type System

Enjoy your elite crown protectors! 👑🛡️
