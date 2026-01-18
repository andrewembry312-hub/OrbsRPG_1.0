# Game Event Logging System

**Last Updated**: January 18, 2026  
**Status**: ✅ COMPREHENSIVE AUDIT TRAIL IN PLACE

This document describes the enhanced logging system that tracks all critical game events for verification and debugging.

---

## 📊 Overview

The logging system captures detailed event data that is automatically downloaded with save files. This allows verification that game mechanics are functioning as designed.

### Key Features

- **Comprehensive Tracking**: Guards, NPCs, walls, flags, combat events
- **Automatic**: No manual configuration needed - all events logged by default
- **Downloadable**: Included in debug logs alongside save data
- **Audit Trail**: Timestamped records for every significant event

---

## 🛡️ GUARD EVENTS

### GUARD_SPAWNED

Logged when a guard unit is created at an outpost.

```json
{
  "time": "123.45",
  "type": "GUARD_SPAWNED",
  "team": "player|teamA|teamB|teamC",
  "guardName": "Mage Guard 1",
  "variant": "mage|warrior",
  "role": "HEALER|DPS",
  "level": 5,
  "maxHp": 85,
  "position": { "x": 450, "y": 320 },
  "site": "Outpost Beta",
  "sitePosition": { "x": 400, "y": 300 },
  "index": 0
}
```

**Use For**:
- Verify 5 guards spawn at outpost capture
- Confirm guard composition (2 mage, 3 warrior)
- Check guard levels match slot progression
- Validate pentagon formation positions

---

### GUARD_DIED

Logged when a guard unit is killed.

```json
{
  "time": "145.20",
  "type": "GUARD_DIED",
  "guardName": "Warrior Guard 2",
  "variant": "warrior",
  "role": "DPS",
  "level": 5,
  "maxHp": 85,
  "position": { "x": 480, "y": 350 },
  "site": "Outpost Beta",
  "respawnTime": 30.0,
  "respawnSite": "outpost_beta"
}
```

**Use For**:
- Confirm respawn timer (30 seconds for guards)
- Verify guard doesn't respawn immediately
- Check guard died at correct location
- Track guard casualty rates

---

### GUARD_RESPAWNED

Logged when a guard respawns at their home site.

```json
{
  "time": "175.20",
  "type": "GUARD_RESPAWNED",
  "guardName": "Warrior Guard 2",
  "variant": "warrior",
  "role": "DPS",
  "level": 5,
  "maxHp": 85,
  "position": { "x": 420, "y": 310 },
  "site": "Outpost Beta",
  "timeDead": 30.0
}
```

**Use For**:
- Verify guard respawns at correct site
- Confirm respawn position in formation
- Check respawn timer accuracy
- Track guard respawn cycles

---

## 👥 ALLY EVENTS

### ALLY_DIED

Logged when a recruited ally/group member dies.

```json
{
  "time": "152.00",
  "type": "ALLY_DIED",
  "allyName": "Ragnar the Cleaver",
  "variant": "warrior",
  "role": "FIGHTER|TANK|DPS",
  "level": 5,
  "maxHp": 120,
  "position": { "x": 250, "y": 180 },
  "respawnTime": 8.0,
  "respawnSite": "site_2"
}
```

**Use For**:
- Verify ally respawn timer (8 seconds for group members)
- Check respawn site selection
- Track ally survivability
- Confirm death positions

---

### ALLY_MOVEMENT (Sampled - 10%)

Logged when an ally moves (sampled at 10% rate to avoid log spam).

```json
{
  "time": "98.50",
  "type": "ALLY_MOVEMENT",
  "allyName": "Ember the Pyromancer",
  "position": { "x": 300, "y": 250 },
  "destination": { "x": 310, "y": 270 },
  "distance": 22,
  "role": "DPS",
  "behavioral_state": "chasing_enemy|formation|idle",
  "decision": "attack_enemy_safe|support_position|wander"
}
```

**Use For**:
- Verify allies are moving (not stuck)
- Check AI decision making
- Identify idle allies (distance = 0)
- Track formation cohesion

---

## 🏰 FLAG & WALL EVENTS

### FLAG_CAPTURED

Logged when a neutral flag is captured by any team.

```json
{
  "time": "234.50",
  "type": "FLAG_CAPTURED",
  "flag": "Outpost Alpha",
  "previousOwner": "neutral",
  "newOwner": "player",
  "playerUnits": 3,
  "captureTime": 15.0
}
```

**Use For**:
- Verify flag capture mechanics
- Check guard spawn after capture
- Confirm XP awarded (50 XP)
- Track flag ownership changes

---

### FLAG_RECAPTURED

Logged when an owned flag is flipped to a new team.

```json
{
  "time": "456.20",
  "type": "FLAG_RECAPTURED",
  "flag": "Outpost Alpha",
  "previousOwner": "player",
  "newOwner": "teamA",
  "playerUnits": 0,
  "captureTime": 20.0
}
```

**Use For**:
- Track contested flag control
- Verify guard destruction on loss
- Confirm XP awarded (75 XP for recapture)
- Monitor flag stability

---

### WALL_DAMAGE

Logged when any wall side takes damage (sampled at 5% rate).

```json
{
  "time": "300.15",
  "type": "WALL_DAMAGE",
  "site": "Outpost Beta",
  "side": "North",
  "attackers": 3,
  "attackerList": "Ragnar(FIGHTER,friendly), Player(PLAYER,player), Enemy Warrior(DPS,enemy)",
  "roleCounts": { "FIGHTER": 1, "PLAYER": 1, "DPS": 1 },
  "damage": 24.5,
  "hpBefore": 150,
  "hpAfter": 125,
  "hpPercent": 62
}
```

**Use For**:
- Verify wall damage calculation (8 HP per attacker per second)
- Check attacker detection
- Confirm role-based damage calculations
- Track siege progress

---

### WALL_DESTROYED

Logged when a wall side is completely destroyed.

```json
{
  "time": "420.30",
  "type": "WALL_DESTROYED",
  "site": "Outpost Beta",
  "side": "North",
  "attackers": 3,
  "destroyerList": "Ragnar(FIGHTER,friendly), Player(PLAYER,player), Enemy Warrior(DPS,enemy)",
  "destroyerRoles": { "FIGHTER": 1, "PLAYER": 1, "DPS": 1 },
  "remainingWalls": 3
}
```

**Use For**:
- Verify wall destruction timing
- Confirm remaining walls count
- Track siege completion
- Check destroyer attribution

---

## 🎯 COMBAT EVENTS

### WALL_DAMAGE (Already documented above)

Wall damage is the primary combat event tracked. Additional events can be added as needed for:
- Projectile hits
- Ability effects
- Player damage
- Enemy attacks

---

## 📥 DOWNLOADING LOGS

Logs are automatically included in the downloadable debug package:

1. **When to Download**:
   - At end of campaign
   - When verifying specific mechanics
   - For bug reporting

2. **File Format**:
   - JSON array of all events
   - Timestamped entries
   - Sortable by event type

3. **Example Export Structure**:
   ```json
   {
     "session": {
       "startTime": "2026-01-18T15:30:00Z",
       "endTime": "2026-01-18T16:45:00Z",
       "duration": 3900
     },
     "events": [
       { /* GUARD_SPAWNED event */ },
       { /* GUARD_DIED event */ },
       { /* WALL_DAMAGE event */ },
       /* ... more events ... */
     ]
   }
   ```

---

## ✅ VERIFICATION CHECKLIST

When testing, download logs and verify:

- [ ] **Guards at Outposts**
  - [x] 5 guards spawn per outpost
  - [x] Composition is 2 mage + 3 warrior
  - [x] Levels match slot progression
  - [x] Formation positions correct (pentagon)
  - [x] Respawn timer is 30 seconds

- [ ] **Allies/Groups**
  - [x] Respawn timer is 8 seconds
  - [x] Respawn site is correct
  - [x] Units are moving (check ALLY_MOVEMENT)
  - [x] No idle units stuck in one place

- [ ] **Flags**
  - [x] 5 guards spawn on capture
  - [x] Guards destroyed on loss
  - [x] XP awarded (50 neutral, 75 recapture)
  - [x] Wall resets on capture

- [ ] **Walls**
  - [x] Damage calculated correctly (8 HP/attacker/s)
  - [x] Destruction after 200 total HP loss
  - [x] Fire effects trigger at 70% health
  - [x] Gate can be used when wall intact

---

## 🔧 Adding New Log Events

To log a new event, use this pattern:

```javascript
if(state.debugLog){
  state.debugLog.push({
    time: (state.campaign?.time || 0).toFixed(2),
    type: 'EVENT_TYPE',
    // ... event-specific fields ...
  });
}
```

Place in relevant code sections:
- Guard spawn: world.js `spawnGuardsForSite()`
- Flag capture: world.js `updateCapture()`
- Wall damage: world.js `updateWallDamage()`
- Ally death: game.js `killFriendly()`
- Combat: game.js various attack functions

---

**System Status**: ✅ ACTIVE - All critical events logged automatically
