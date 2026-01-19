# Creature Logging Update

## Overview
Added comprehensive creature interaction logging to diagnose why creatures aren't dealing visible damage and why certain abilities don't work on them.

## New Logging Events

### 1. Creature Damage from Wells/Abilities
**Type:** `damage_from_well`  
**Location:** `updateWells()` function (line ~8330)

Logs whenever a creature takes damage from a well/AOE ability:
```javascript
{
  t: game_time,
  type: 'damage_from_well',
  creatureId: string,
  wellId: well_id,
  ability: ability_name,
  damage: dmg_amount,
  oldHp: creature_hp_before,
  newHp: creature_hp_after,
  wellX: well_position_x,
  wellY: well_position_y,
  wellRadius: well_radius,
  creatureX: creature_x,
  creatureY: creature_y,
  distance: distance_to_well
}
```

### 2. Creature Aggro/Targeting
**Type:** `creature_aggro`  
**Location:** `updateCreatures()` function (line ~11380)

Logs when a creature gets in range and aggros on a target:
```javascript
{
  t: game_time,
  type: 'creature_aggro',
  creatureId: string,
  creatureKey: creature_type,
  creatureType: 'boss' | 'creature',
  targetType: 'player' | 'friendly' | 'enemy',
  targetName: target_name,
  distance: distance_to_target,
  creatureX: creature_x,
  creatureY: creature_y,
  targetX: target_x,
  targetY: target_y
}
```

### 3. Creature Attack
**Type:** `creature_attack`  
**Location:** `updateCreatures()` function (line ~11420)

Logs when a creature attacks its target:
```javascript
{
  t: game_time,
  type: 'creature_attack',
  creatureId: string,
  creatureKey: creature_type,
  creatureType: 'boss' | 'creature',
  targetType: 'player' | 'friendly' | 'enemy',
  targetName: target_name,
  damage: attack_damage,
  distance: distance_to_target,
  creatureX: creature_x,
  creatureY: creature_y,
  targetX: target_x,
  targetY: target_y
}
```

## Data Storage
All creature interactions are stored in:
```javascript
state.creatureInteractions = []
```

This array persists throughout the game session and can be exported in the game logs.

## How to Review Logs

1. Play a test game with creatures present
2. Hard refresh browser (Ctrl+Shift+R) to pick up cache v=20260118h
3. Encounter creatures and let them attack/interact
4. Export game logs at end of session
5. Search for "creature_" entries in logs to see all interactions

## Diagnostic Questions This Helps Answer

1. **Are creatures spawning?** - Check for creature_aggro events
2. **Do creatures get in range?** - Check distance values in creature_aggro
3. **Do creatures attack?** - Check for creature_attack events with damage > 0
4. **Do abilities hit creatures?** - Check for damage_from_well with distance ≤ wellRadius
5. **Are creatures taking damage?** - Check newHp < oldHp in damage events
6. **Why is damage missing?** - Compare wellRadius vs distance to see if in range

## Files Modified

- `/src/game/game.js` - Added logging at 3 key points
- `/orb-rpg/src/game/game.js` - Backup copy with identical changes
- `index.html` - Cache buster updated to v=20260118h

## Next Steps

1. Hard refresh browser
2. Run test game with creatures
3. Review creatureInteractions array in exported logs
4. Debug based on what events appear/don't appear
