# Crown Guard Elite System - Complete Redesign

## Overview
This is a comprehensive redesign of the crown guard system to create a fully-functioning, custom AI group that behaves like a coordinated ball group with burst/kite mechanics.

## Core Requirements

### Composition
- **5 Total Guards per Crown**
  - 3x DPS Guards (Ember the Pyromancer)
  - 2x Healer Guards (Father Benedict)

### Primary Behaviors

#### 1. Default State: Protect Crown at Base
- Guards are stationed around the crown in a pentagon formation
- Follow the crown when it moves but within base territory
- Attack any player who approaches the crown
- If guards damage player during crown defense: player gets combat flag

#### 2. Crown Pickup: Player Takes Crown
- **IMMEDIATE CHANGE**: All guards switch to chase player 100%
- Attack player who is carrying crown
- Burst ability rotation when player is in range
- Kite behavior when low on resources
- Coordinated focus fire on crown carrier

#### 3. Recapture: Crown Reaches Player Base
- If crown is carried to player base and secured there:
  - Guards attempt to enter player base
  - Break through defenses
  - One guard becomes "crown carrier" 
  - That guard picks up crown and carries it back to their base
  - Other guards protect the carrier
  
#### 4. Guard Carrying Crown
- Player must kill the crown carrier to recover crown
- When guard dies: crown drops at that location
- Player must carry it back to his own base
- Guards respawn and pursue player with crown again

## Loadout System

### Loadout 1: DPS (Ember the Pyromancer)
```
Name: Ember the Pyromancer
Role: Damage Dealer
Image: Ember the Pyromancer.png
Stats: High damage, moderate speed, low survivability
Abilities:
  - Burst Ability: Fireball Volley (3-hit combo, high mana cost)
  - Secondary: Flame Strike (lower cooldown, sustainable damage)
  - Resource: Mana pool for burst
Behavior:
  - Aggressive stance when crown is not carried
  - BURST MODE: Cast Fireball Volley on player (3 shots, 2s cast)
  - KITE MODE: Move to 300px range, cast Flame Strike on cooldown
  - Recharge mana for 5 seconds before next burst
  - Coordinate with other DPS for burst stacking
```

### Loadout 2: Healer (Father Benedict)
```
Name: Father Benedict
Role: Support/Healer
Image: Father Benedict.png
Stats: Moderate damage, moderate speed, high survivability
Abilities:
  - Burst Ability: Holy Light Cascade (heal all allies, high mana cost)
  - Secondary: Heal (single target, efficient mana cost)
  - Resource: Mana pool for burst
Behavior:
  - Protective stance around crown/other guards
  - BURST MODE: Cast Holy Light Cascade when any guard <50% HP
  - KITE MODE: Keep position at 250px range, cast single heals
  - Prioritize healing other healers and damaged tanks first
  - Help damage player if all guards are healthy
```

## AI Decision System

### State Machine
```
PROTECT_CROWN_STATE
├─ Crown not carried
├─ Guards in formation around crown
├─ Attack approaching player
└─ Transition to CHASE_STATE when crown picked up

CHASE_STATE
├─ Crown carried by player
├─ All guards target player
├─ Rotation: DPS burst → Kite → Recharge
├─ Healers rotate healing
└─ Transition to RECAPTURE_STATE if crown reaches player base

RECAPTURE_STATE
├─ Crown secured at player base
├─ Breach player base defenses
├─ Assign 1 guard as crown carrier
├─ Protect carrier while carrying back
└─ Transition to PROTECT_CROWN_STATE when crown returns to their base
```

### Ability Rotation (per 10-second cycle)

#### DPS Cycle (Ember)
```
Second 1-2: Move to within 350px of target
Second 2-3: BURST - Cast Fireball Volley (3 hits, depletes mana)
Second 4-8: KITE - Move out to 300px, cast Flame Strike (cooldown: 1.5s)
Second 9-10: RECHARGE - Stay back, regenerate mana for next burst
```

#### Healer Cycle (Father Benedict)
```
Continuous: Monitor all guards HP
- If any guard < 50% HP: BURST - Cast Holy Light Cascade
- If all guards > 80% HP: Assist DPS with single heals
- Maintain position at 250px from crown/target
- Move closer when healing needed, retreat to range when burst ready
```

## Crown Properties

### Crown Entity
```javascript
crown = {
  _id: "unique_id",           // REQUIRED: Unique crown ID
  x, y,                        // Current position
  r: 20,                       // Radius (size)
  team: "teamA",              // Which team's crown
  carriedBy: null,            // null, "player", or guard._id
  carriedByType: null,        // "player" or "guard"
  lastCarrier: null,          // Track who had it before
  secured: false,             // At player base (can't be taken automatically)
  secureSiteId: null,         // If secured, at which site
  respawnSiteId: base.id,     // Original spawn location (if not secured)
  speed: 0,                   // Moves with carrier
  // DO NOT USE:
  // - autoReturn (not implemented)
  // - returnTimer (not used)
}
```

### Guard Carrying Crown
```javascript
guard = {
  // ... all normal guard properties
  carriedCrown: true,         // Is carrying a crown
  carriedCrownTeam: "teamA",  // Which crown
  carriedCrownId: "crown_id", // Crown's unique ID
  carryDirection: "home",     // "home" = back to base, "defend" = stay put
  carryProtection: true,      // Other guards protect this one
  spd: 2.0,                   // Slightly slower when carrying
}
```

## Behavior Rules

### Rule 1: Never Auto-Return
- Crowns do NOT auto-return to any base
- Only movement: carrier moves it
- If guard dies carrying crown: crown drops and stays there
- Player or returning guards must manually retrieve/move it

### Rule 2: Dual Carrying System
- Only 2 entities can carry: Player or a single Guard
- Multiple guards cannot carry same crown
- When player dies with crown: crown drops, can be picked up by guards

### Rule 3: Burst Mechanics
- **Burst Window**: 2-3 seconds of high output ability
- **Recharge Period**: 5-7 seconds to regenerate resources
- **Coordination**: All DPS time bursts together for massive damage spike
- **Counter**: Player can see burst coming, prepare defenses

### Rule 4: Kite Ranges
- DPS guards maintain 300px range after burst
- Healers maintain 250px range normally, 200px when healing
- Tank would stay at 100px if we had one
- Ranges update based on ability cooldowns

### Rule 5: Guard Respawn
- If guard dies: respawns at crown location after 5 seconds
- Respawn location moves with crown if it's being carried
- Guards that respawn rejoin the chase immediately
- No respawn cap: guards always respawn to protect crown

### Rule 6: Crown Interference
- Player base guards cannot leave base to chase crown far away
- IF crown reaches player base: they activate recapture mode
- Recapture override: guards will breach, ignore normal leashing
- Once crown is recovered: return to base and reset

## Implementation Checklist

- [ ] Create 2 new loadouts (DPS and Healer only)
  - [ ] DPS: Ember the Pyromancer
  - [ ] Healer: Father Benedict
  
- [ ] Add crown _id system
  - [ ] Assign unique ID to each crown at creation
  - [ ] Guards track crown by ID not by siteId
  
- [ ] Remove site leashing
  - [ ] Guards don't respect spawnTargetSiteId when chasing crown
  - [ ] Recapture mode: override all movement restrictions
  
- [ ] Implement ability rotation system
  - [ ] DPS: Burst (Fireball) → Kite → Recharge cycle
  - [ ] Healer: Heal rotate → DPS assist → Burst ready
  
- [ ] Implement carry mechanics
  - [ ] Player picks up crown: guards all switch to CHASE_STATE
  - [ ] Guard picks up crown: player must kill to recover
  - [ ] Drop mechanics when carrier dies
  
- [ ] Implement recapture behavior
  - [ ] Detect when crown secured at player base
  - [ ] Activate breach mode for guards
  - [ ] Allow guards to carry crown back
  
- [ ] Update updateCrownGuardAI function
  - [ ] Remove pentagon formation when chasing
  - [ ] Add ability rotation logic
  - [ ] Add carry state handling
  
- [ ] Update rendering
  - [ ] Show crown carrier icon/visual effect
  - [ ] Show guard in BURST state differently
  - [ ] Show mana bars for guards
  
- [ ] Console debugging
  - [ ] getCrownGuardDetailedStatus() - full state info
  - [ ] getCrownState() - crown position, carrier, secured status
  - [ ] testCrownGuardBurst() - trigger burst ability

## Success Metrics

✅ Guards protect crown at base until picked up
✅ 100% focus on player when crown is carried
✅ Burst damage that can threaten player
✅ Kite to range and recharge like real ball group
✅ Guards can carry crown back to base
✅ No auto-return mechanics
✅ Proper collision with player base defenses
✅ Crown drops when carrier dies, stays dropped until moved
✅ 3 DPS + 2 Healer composition visible
✅ Coordinated behavior between guards
