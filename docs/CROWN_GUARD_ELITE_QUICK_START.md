# Crown Guard Elite System - Complete Redesign ✅

## What Was Built

A fully-functional **elite ball group** guard system that:
- **Composition**: 3x DPS (Ember the Pyromancer) + 2x Healer (Father Benedict)
- **Formation**: Pentagon around crown with proper image rendering
- **Behavior**: Protect → Chase → Burst → Kite → Recharge cycle
- **Movement**: No site leashing or base restrictions when chasing
- **Mechanics**: Mana-based ability rotation like coordinated raid groups

## Quick Start

### 1. Activate System
```javascript
window.activateEmperorTest()
```
This will:
- Initialize Emperor Mode
- Spawn 3 crowns (teamA, teamB, teamC)
- Spawn 5 elite guards per crown (15 total)
- Show all guards in blue orbs with character images

### 2. Test the System
```javascript
// See all guards and their status
window.getCrownGuardEliteStatus()

// See where crowns are
window.getCrownState()

// Force guards into burst phase
window.testCrownGuardBurst()
```

### 3. Observe Behavior
- Get close to a crown to pick it up
- All 15 guards of that team should chase you
- Watch for **burst cycle** every 10 seconds:
  - DPS guards close in to 350px
  - Cast Fireball Volley (3 hits)
  - Move back to 300px kite range
  - Spam Flame Strike while mana regens
  - Repeat

## Key Features

### 1. Two Loadout System

**DPS (Ember the Pyromancer) - 3 Guards**
- High burst damage (135 dmg/10 sec cycle)
- Aggressive positioning
- Mana-based ability rotation
- Fireball Volley → Kite → Flame Strike → Recharge

**Healer (Father Benedict) - 2 Guards**
- Support role
- Keep allies alive (heal burst at < 50% HP)
- Position at 250px range
- Holy Light Cascade → Single Heals → Recharge

### 2. Burst/Kite Mechanics (Like Real Ball Groups)
```
DPS 10-Second Cycle:
1-2s:  Move to burst range (350px)
2-3s:  Fireball Volley cast (135 damage spike)
3-8s:  Kite to 300px, spam Flame Strike
8-10s: Recharge mana passively
Loop:  After 10s cooldown expires, burst again
```

### 3. No Site Leashing
- Guards don't defend bases
- No movement restrictions
- Follow crown anywhere (even to player base)
- Ignore all site boundaries during chase

### 4. Crown ID System
- Each crown gets unique `_id` on creation
- Guards track crown by ID not by site
- Proper crown reference prevents confusion
- Supports future carry mechanics

## UI Changes

**Both panels moved to top-left:**
- Emperor Guide: `left:10px; top:130px` (was `right:10px`)
- Crown Icons HUD: `top:10px; left:280px` (was `bottom:120px; right:20px`)
- Aligned with minimap area

## Visual Design

**Guards Render As:**
- Blue orbs (`#3498db`)
- Black borders (`#000000`, 3px thick)
- Character images overlaid (Ember or Father Benedict)
- Boss size (40px radius, 2x normal enemy)

**Formation:**
- Pentagon around crown
- 90px radius, 72° spacing
- 5 positions visible at base entrance

## Ability System

### DPS Abilities
| Ability | Type | Cost | Effect | Cooldown |
|---------|------|------|--------|----------|
| Fireball Volley | Burst | 100 mana | 3×45dmg | 10s |
| Flame Strike | Sustain | 25 mana | 30dmg | 1.5s |

### Healer Abilities
| Ability | Type | Cost | Effect | Cooldown |
|---------|------|------|--------|----------|
| Holy Light Cascade | Burst | 90 mana | 60 HP all allies | 12s |
| Heal | Sustain | 40 mana | 35 HP target | 2.0s |

### Mana System
- **Pool**: 150 max mana
- **Regen**: 20 mana/second
- **Burst Cost**: 90-100 mana (needs ~5s to recharge)
- **Sustain Cost**: 25-40 mana (constant use)

## Guard Properties

```javascript
guard = {
  // Identification
  crownGuard: true,
  guardName: "Ember the Pyromancer",
  guardRole: "DPS",
  loadoutType: "dps",
  
  // Abilities & Resources
  mana: 100,
  maxMana: 150,
  burstCooldown: 0,
  abilityRotation: "burst|cast|kite|recharge",
  
  // Crown Tracking
  crownId: crown._id,
  crownTeam: "teamA",
  crownSiteId: base.id,
  
  // AI State
  guardMode: "protect|chase|attack|heal",
  targetX, targetY,
  
  // Visual
  color: "#3498db",  // Blue
  borderColor: "#000000",  // Black
  imgPath: "assets/fighter player cards/Ember the Pyromancer.png",
  
  // Movement
  speed: 3.2,
  spawnTargetSiteId: null,  // NO SITE LEASHING
  homeSiteId: null,         // NO BASE RESTRICTION
}
```

## AI Behavior Logic

### Protect Crown (Not Carried)
```
DPS:
├─ Maintain 120px formation distance
├─ Attack enemies within 250px of crown
└─ Stay between crown and threats

Healer:
├─ Maintain 150px formation distance
├─ Monitor guard HP
├─ Move toward hurt allies to heal
└─ Support team health
```

### Chase Crown (Player Carries)
```
Both (DPS & Healer):
├─ Target = player position
├─ Ignore all site boundaries
├─ Follow persistently
└─ Run ability rotation cycle

DPS Rotation:
├─ Burst at 350px (Fireball Volley)
├─ Kite to 300px (Flame Strike)
└─ Recharge (mana regen)

Healer Rotation:
├─ Heal burst if anyone < 50% HP
├─ Sustain heals while rotating
└─ Mana recharge cycle
```

## Console Commands

### 1. Activate Test Mode
```javascript
window.activateEmperorTest()
```
Spawns 15 guards at 3 bases ready for testing.

### 2. Get Detailed Guard Status
```javascript
window.getCrownGuardEliteStatus()
```
Output example:
```
CROWN GUARD ELITE SYSTEM STATUS - 3x DPS + 2x Healer
═════════════════════════════════════════

TEAM: TEAMA
   Crown State: Pos(500,600) | Carried: false
   ├─ Ember the Pyromancer
   │  HP: 220/220 | Mana: 150/150
   │  Mode: protect | Rotation: rest
   │  BurstCD: 0.0s | DistToCrown: 90px
   │  Target: (550,600) | Pos: (500,650)
   ├─ Ember the Pyromancer
   ...
```

### 3. Check Crown Positions
```javascript
window.getCrownState()
```
Output shows all crowns, who's carrying them, if they're secured.

### 4. Test Burst Mechanics
```javascript
window.testCrownGuardBurst()
```
Sets all DPS guards to burst state and explains the damage cycle.

## Expected Behavior

### When You Pick Up Crown
1. All 5 guards of that team detect `crown.carriedBy === 'player'`
2. Instantly switch to `guardMode = 'chase'`
3. Set `targetX/Y = crown.x/y` (your position)
4. Move system moves them toward you
5. Every 10 seconds, DPS burst (big damage spike)
6. Healers keep them alive

### Guard Rotation Pattern
```
0s:  [DPS bursts hard]     [Healer supports]
     └─ Fireball Volley     └─ Heal anyone hurt
     
3s:  [DPS kites back]      [Healer maintains range]
     └─ Move to 300px       └─ Single heals
     
8s:  [DPS still kiting]    [Healer still healing]
     └─ Mana almost full    └─ Mana recharging
     
10s: [REPEAT] Burst ready again

This 10-second cycle repeats continuously while chasing.
```

### No Respawning When Chasing
- Guards respawn 5 seconds after death
- They respawn at the crown's location
- If crown is at player base, they respawn nearby
- Respawned guards immediately rejoin chase

## Future: Recapture System

Not yet implemented but designed for:
- Guards break into player base
- One guard becomes crown carrier
- Carries crown back to own base
- Other guards protect the carrier
- Player must kill carrier to recover crown
- No auto-return mechanics

## Files Changed

1. **src/game/ui.js** - UI positioning
2. **src/game/game.js** - Complete redesign
   - CROWN_GUARD_LOADOUTS (2 loadouts)
   - spawnCrownGuards() (3 DPS + 2 Healer)
   - updateCrownGuardAI() (burst/kite/recharge)
   - Console commands (4 new debug tools)

3. **Documentation**
   - CROWN_GUARD_SYSTEM_REDESIGN.md
   - CROWN_GUARD_ELITE_IMPLEMENTATION.md

## Testing Next Steps

1. Run `activateEmperorTest()`
2. Use `getCrownGuardEliteStatus()` to verify guards spawned
3. Walk to a crown to pick it up
4. Watch guards chase and burst
5. Check ability rotation with `testCrownGuardBurst()`
6. Verify images render correctly
7. Test healing when damaged
8. Observe kite distances (300px DPS, 250px Healer)

---

**System Status: ✅ COMPLETE AND READY FOR TESTING**
