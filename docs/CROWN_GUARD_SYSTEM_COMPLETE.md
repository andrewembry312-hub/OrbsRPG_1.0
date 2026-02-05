# Crown Guard System - Complete Implementation

## Overview

Crown guards are 5 elite protectors spawned at each enemy team base when Emperor Mode is activated. They form a protective pentagon around their team's crown and prioritize protecting/chasing the crown over all other objectives.

## System Architecture

### 1. Crown Guard Loadout Types

Each guard has a **loadout type** that defines its role, priorities, and stat multipliers:

```javascript
CROWN_GUARD_LOADOUTS = {
  'tank': {
    priority: 1,        // Highest - shields crown
    role: 'TANK',
    class: 'warrior',
    name: 'Guard Leader',
    stats: { hpMult: 1.5, defMult: 1.3, spd: 0.9 }
  },
  'healer': {
    priority: 2,        // High - keeps team alive
    role: 'HEALER',
    class: 'mage',
    name: 'Archmage',
    stats: { hpMult: 0.9, manaMult: 1.4, spd: 0.95 }
  },
  'dps1', 'dps2', 'dps3': {
    priority: 3,        // Medium - hunt threats
    role: 'DPS',
    class: 'warrior'/'mage'
  }
}
```

### 2. Guard Data Structure

Each crown guard has these key properties:

```javascript
{
  // === LOADOUT SYSTEM ===
  loadoutType: 'tank',              // Which loadout (tank/healer/dps1/dps2/dps3)
  loadoutId: 'crown_guard_tank',    // Unique ID for NPC abilities
  crownGuardLoadout: { ... },       // Full loadout data
  guardPriority: 1,                 // 1=tank, 2=healer, 3=dps
  
  // === CROWN TRACKING ===
  crownTeam: 'teamA',               // Which team's crown to protect
  crownId: 'crown_abc123',          // The crown entity ID
  crownSiteId: 'team_a_base',       // The base site where crown spawns
  crownFormationIndex: 0,           // Position in pentagon (0-4)
  
  // === POSITION & BEHAVIOR ===
  lastCrownX/Y: 0,                  // Last known crown position
  crownChaseRange: 500,             // Chase if crown beyond this
  crownFollowRange: 150,            // Stay within this distance
  guardMode: 'protect',             // Modes: protect/chase/attack/heal
  
  // === VISUAL ===
  color: '#3498db',                 // Blue orb
  borderColor: '#000000',           // Black border
  imgPath: 'assets/fighter player cards/warrior.png'  // Fighter card image
}
```

## Priority-Based Behavior

### Priority 1: TANK (Guard Leader)
- **Position**: Stays closest to crown (80px follow range)
- **Behavior**: Intercepts nearby enemies (200px range)
- **Target**: Moves between crown and nearby threats
- **Stats**: +50% HP, +30% DEF, -10% SPD

### Priority 2: HEALER (Archmage)
- **Position**: Mid-range from crown (120px follow range)
- **Behavior**: Heals nearby hurt guards (< 75% HP)
- **Target**: Moves to hurt guards, otherwise near crown
- **Stats**: -10% HP, +40% Mana, -5% SPD

### Priority 3: DPS (Guard Knight/Battle Mage/Guard Captain)
- **Position**: Outer formation from crown (150px follow range)
- **Behavior**: Aggressively hunts enemies in 300px radius
- **Target**: Nearest enemy, otherwise returns to formation
- **Stats**: +25-35% DMG, +5-15% SPD

## Formation System

Guards maintain a **pentagon formation** around the crown:

```
        Guard 0 (Tank)
       /          \
      /            \
   Guard 4      Guard 1 (Healer)
   (DPS3)         |
                Crown
                /  \
          Guard 3  Guard 2
          (DPS2)   (DPS1)
```

- **Formation Radius**: 90 pixels
- **Angle Spacing**: 72 degrees between each guard
- **Dynamic Formation**: Adjusts as crown moves
- **Auto-Realignment**: Guards return to formation when threat clears

## Crown Chase Mechanics

When the crown moves beyond `crownChaseRange` (500px):

1. **Activation**: All guards switch to `guardMode = 'chase'`
2. **Targeting**: Guards target crown position directly
3. **Distance Tracking**: `lastCrownX/Y` updated every frame
4. **Priority Override**: All other targeting paused
5. **Return Trigger**: When crown within formation range again

## Spawning

### When Emperor Mode Starts
```javascript
unlockCrowns(state);
  └─> spawnCrownGuards(state, base, team) × 3 teams
      └─> Create 5 guards with loadout system
          - Spawn at pentagon formation around crown
          - Initialize abilities from loadout
          - Apply stat multipliers
          - Set crownTeam/crownId
```

### Respawn on Death
- Guards have 5-second respawn timer (`respawnTimer: 5`)
- When all 5 guards dead, respawn entire team
- Respawn location: Original pentagon formation at crown location

## Update Loop Integration

Each frame:

1. **updateCrownGuardAI()** called (game.js line 11258)
2. For each guard, calculate:
   - Distance to crown
   - Nearby enemies/hurt allies
   - Priority-specific targeting
3. Set `targetX/Y` based on priority and situation
4. Normal movement/combat system handles pathfinding to target

## Console Commands

```javascript
// Show all guards and their status
window.getCrownGuardStatus()

// Show loadout types and properties
window.getCrownGuardLoadouts()

// Visualize formation alignment
window.visualizeCrownGuardFormation()

// Test guard chase behavior
window.testCrownGuardChase()
```

### Example Output

```
═══════════════════════════════════════
👑 CROWN GUARD STATUS
═══════════════════════════════════════

🛡️ TEAMA TEAM GUARDS:
  👑 Crown: (1024, 768)
  Guards: 5/5
  ✓ [TANK] Guard Leader | HP: 200/200 | Pos: (1094, 768) | Dist to Crown: 70 | Mode: protect
  ✓ [HEALER] Archmage | HP: 180/180 | Pos: (1064, 830) | Dist to Crown: 72 | Mode: protect
  ✓ [DPS] Guard Knight | HP: 200/200 | Pos: (964, 830) | Dist to Crown: 72 | Mode: protect
  ✓ [DPS] Battle Mage | HP: 190/200 | Pos: (934, 768) | Dist to Crown: 90 | Mode: heal
  ✓ [DPS] Guard Captain | HP: 200/200 | Pos: (964, 706) | Dist to Crown: 72 | Mode: protect

🛡️ TEAMB TEAM GUARDS:
  ...
```

## Rendering

Guards render as **BLUE ORBS with BLACK BORDERS** and **FIGHTER CARD IMAGES**:

- **Size**: Boss-size (r=40, double normal)
- **Color**: #3498db (bright blue)
- **Border**: #000000 (black), 3px width
- **Image**: Fighter card overlay (warrior/mage based on class)
- **HP Bar**: Above orb, shows health percentage
- **Name Label**: Blue text showing loadout name

Updated in `render.js` to check for:
```javascript
if(e.crownGuard) {
  ec = e.color || '#3498db';  // Use custom color (blue)
}
if(e.crownGuard || e.boss) {
  ctx.strokeStyle = e.borderColor || '#000000';  // Black border
}
// Draw fighter card image for crown guards
if(e.crownGuard && e.imgPath) {
  // Render image inside blue orb
}
```

## Important Notes

### What Crown Guards DON'T Do
- ❌ Defend outposts or captured sites
- ❌ Have `homeSiteId` set
- ❌ Return to base when player leaves
- ❌ Participate in normal team objectives
- ❌ Have `spawnTargetSiteId` set

### What Crown Guards DO Do
- ✅ ONLY protect their team's crown
- ✅ Chase crown if it moves far away
- ✅ Maintain pentagon formation around crown
- ✅ Use priority-based AI (tank/healer/dps)
- ✅ Respawn when all killed
- ✅ Render as blue orbs with fighter card images

## File Locations

- **Spawn Logic**: `src/game/game.js` line 14151 (`spawnCrownGuards()`)
- **Update Logic**: `src/game/game.js` line 14325 (`updateCrownGuardAI()`)
- **Loadout Definitions**: `src/game/game.js` line 14150 (`CROWN_GUARD_LOADOUTS`)
- **Rendering**: `src/game/render.js` (enemy rendering with crownGuard check)
- **Console Commands**: `src/game/game.js` bottom (debug functions)

## Future Enhancements

- [ ] Crown guard leveling system (XP from combat)
- [ ] Special crown guard abilities (e.g., "Crown Barrier")
- [ ] Formation breaking when crown taken (scatter AI)
- [ ] Guard morale system (stronger when crown protected, weaker when crown taken)
- [ ] Crown guard skins/cosmetics based on team color

---

**Status**: ✅ COMPLETE  
**Last Updated**: 2026-01-25  
**System**: Emperor Mode - Phase 3
