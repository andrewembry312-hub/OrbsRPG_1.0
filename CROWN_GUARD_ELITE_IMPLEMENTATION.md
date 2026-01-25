# Crown Guard Elite System - Implementation Complete

## ✅ Implementation Summary

### UI Changes
- **emperorGuidePanel**: Moved from `right:10px; top:140px` to `left:10px; top:130px`
- **crownIconsHud**: Moved from `bottom:120px; right:20px` to `top:10px; left:280px`
- Both now aligned with minimap in top-left corner

### Loadout System (NEW)
Completely redesigned from 5-loadout system to 2-loadout elite system:

**Loadout 1: DPS (Ember the Pyromancer)**
- Role: Damage Dealer
- Image: `assets/fighter player cards/Ember the Pyromancer.png`
- Count: 3x guards per crown
- Priority: 3
- Stats: dmgMult 1.4, spd 1.1, manaMult 1.3, hpMult 0.95
- Burst Ability: Fireball Volley (3 hits × 45 dmg = 135 total, 100 mana)
- Sustained: Flame Strike (30 dmg, 25 mana, 1.5s cooldown)
- Burst Range: 350px | Kite Range: 300px | Burst Cooldown: 10s

**Loadout 2: Healer (Father Benedict)**
- Role: Support/Healer
- Image: `assets/fighter player cards/Father Benedict.png`
- Count: 2x guards per crown
- Priority: 2
- Stats: dmgMult 0.8, spd 1.0, manaMult 1.5, hpMult 1.1
- Burst Ability: Holy Light Cascade (60 HP all allies, 90 mana)
- Sustained: Heal (35 HP single target, 40 mana, 2.0s cooldown)
- Healing Threshold: 50% HP | Kite Range: 250px | Burst Cooldown: 12s

### Guard Composition per Crown
```
Total: 5 Guards
├── 3x DPS (Ember the Pyromancer)
└── 2x Healer (Father Benedict)
```

### Crown Guard Entity Properties

#### Visual & Identity
- `crownGuard: true` - Flag for rendering
- `color: '#3498db'` - Blue orb
- `borderColor: '#000000'` - Black border
- `borderWidth: 3` - Thick outline
- `r: 40` - Boss size (2x normal enemy)
- `imgPath: 'assets/fighter player cards/[name].png'` - Character image

#### Loadout & Role
- `loadoutType: 'dps' | 'healer'` - Which loadout
- `loadoutId: 'crown_guard_dps' | 'crown_guard_healer'`
- `guardRole: 'DPS' | 'HEALER'`
- `guardName: 'Ember the Pyromancer' | 'Father Benedict'`
- `crownGuardLoadout: {full loadout object}`

#### Crown Tracking
- `crownId: crown._id` - References crown by unique ID
- `crownTeam: 'teamA' | 'teamB' | 'teamC'` - Which team's crown
- `crownSiteId: base.id` - Original spawn location
- `lastCrownX/Y: position` - Last known position

#### AI State
- `guardMode: 'protect' | 'chase' | 'attack' | 'heal'`
- `abilityRotation: 'burst' | 'cast' | 'kite' | 'recharge' | 'rest'`
- `targetX/Y: position` - Movement target

#### Ability System
- `mana: 0-150` - Current mana pool
- `maxMana: 150` - Max mana for bursts
- `manaRegenRate: 20` - Mana/second when recharging
- `burstCooldown: 0-10` - Current cooldown timer
- `lastBurstTime: timestamp` - When last ability cast

#### Movement Constraints
- `spawnTargetSiteId: null` - NO SITE LEASHING
- `homeSiteId: null` - NO BASE RESTRICTION
- `crownFollowRange: varies` - Formation distance from crown
- `crownChaseRange: 500` - Chase if crown >500px away

### AI Behavior System

#### State 1: PROTECT CROWN (Not Carried)
```
DPS: Patrol formation around crown, attack nearby enemies
      └─ Formation Distance: 120px
      └─ Attack Range: 250px

Healer: Support position, keep guards healthy
        └─ Formation Distance: 150px
        └─ Heal Priority: < 50% HP guards
```

#### State 2: CHASE CROWN (Player Carries)
```
DPS Ability Rotation (every 10 seconds):
  1. Move to 350px burst range
  2. Cast Fireball Volley (2-3 second cast)
  3. Move to 300px kite range
  4. Cast Flame Strike repeatedly
  5. Recharge mana (mana < 100)
  6. Repeat

Healer Ability Rotation (every 12 seconds):
  1. Monitor all guards HP
  2. If anyone < 50% HP: Move in and Burst Heal
  3. Otherwise stay at 250px and heal as needed
  4. Recharge mana when full
  5. Repeat
```

#### Key Mechanics
- **No Site Leashing**: `spawnTargetSiteId = null` when chasing
- **Home Unrestricted**: `homeSiteId = null` (not defending anywhere)
- **Mana Regeneration**: Auto-regens to enable burst rotation
- **Burst Coordination**: All DPS burst together every 10s for damage spike
- **Kite Distance**: DPS maintains 300px, Healers 250px between bursts

### Crown Properties (NEW)

Each crown now has:
```javascript
crown = {
  _id: "uuid-string",          // UNIQUE ID for tracking
  x, y,                         // Current position
  team: "teamA",                // Which team
  type: "crown",                // Entity type
  r: 18,                        // Radius
  carriedBy: null,              // null, "player", or guard._id
  carriedByType: null,          // "player" or "guard"
  secured: false,               // At player base
  name: `Crown (${team})`
}
```

### Movement Behavior (NO AUTO-RETURN)
- Crowns do NOT auto-return to bases
- Only movement: manual carrier
- Player carries: guards chase
- Guard carries: player must kill to recover
- Drop on carrier death: crown stays dropped

### Console Debug Commands

#### 1. Activate System
```javascript
window.activateEmperorTest()
```
- Initializes Emperor Mode
- Spawns all 3 crowns
- Spawns 15 elite guards (5 per crown)
- Shows activation status in console

#### 2. View Guard Status
```javascript
window.getCrownGuardEliteStatus()
```
Output shows:
- Each team's crown position and carrier status
- Per-guard: HP/mana, mode, rotation, burst cooldown
- Current position and target position
- Distance to crown

#### 3. View Crown Status
```javascript
window.getCrownState()
```
Output shows:
- Each crown's position
- Whether secured at player base
- Who's carrying it
- Crown ID

#### 4. Test Burst Mechanics
```javascript
window.testCrownGuardBurst()
```
- Sets all DPS guards to BURST state
- Shows damage calculation (3 × 45 = 135)
- Explains full rotation cycle

### How It Works: Detailed Flow

#### Player Picks Up Crown
```
1. Player gets within 150px of crown
2. Crown.carriedBy = 'player'
3. updateCrownGuardAI() detects carriedBy === 'player'
4. All guards switch to guardMode = 'chase'
5. All guards set targetX/Y = crownX/Y (player position)
6. Movement system moves guards toward target
```

#### DPS Burst Cycle (10-second loop)
```
0s-2s:  Approach player: targetX/Y = player.x/y
2s-3s:  Cast Fireball Volley (3 hits, 45 dmg each = 135 total)
        Mana -= 100
3s-8s:  Kite out to 300px: targetX/Y = player.x/y + angle offset
        Cast Flame Strike repeatedly (25 mana, 30 dmg, 1.5s cooldown)
        Mana regenerates (20/second = 100 mana recovered)
8s-10s: Continue kiting, mana near max
10s:    Burst cooldown expires, repeat at step 0s
```

#### Healer Support Cycle (12-second loop)
```
Continuous: Monitor all guards for HP < 50%
Burst:     When any guard hurt AND mana >= 90
           Cast Holy Light Cascade (60 HP to all)
           Mana -= 90
           burstCooldown = 12s
Sustain:   While burst on cooldown, cast single heals as needed
Recharge:  Focus on mana regeneration when all guards healthy
```

#### No Site Leashing
```
Guard spawned at: base.x, base.y
Normally would: spawnTargetSiteId = base.id (defends base)

During CHASE:
- spawnTargetSiteId = null
- homeSiteId = null
- Ignores all base restrictions
- Follows crown wherever player takes it
- Will even chase into player base
```

### Spawning Specifics

**Pentagon Formation** (around crown at spawn)
```
Index 0: 0°   → DPS (Ember)
Index 1: 72°  → DPS (Ember)
Index 2: 144° → DPS (Ember)
Index 3: 216° → Healer (Father Benedict)
Index 4: 288° → Healer (Father Benedict)

All at 90px radius from crown, 120px formation distance from spawn
```

**Stats Applied**
- Base enemy stats + loadout multipliers
- DPS: 1.4x damage, 1.1x speed, 1.3x mana
- Healer: 0.8x damage, 1.0x speed, 1.5x mana, 1.1x HP
- All at Level 8 (stronger than normal enemies)
- Respawn: 5 seconds after death

### Files Modified

1. **src/game/ui.js**
   - emperorGuidePanel: `left:10px; top:130px`
   - crownIconsHud: `top:10px; left:280px`

2. **src/game/game.js**
   - CROWN_GUARD_LOADOUTS: Completely redesigned (2 loadouts)
   - spawnCrownGuards(): New 3 DPS + 2 Healer composition
   - updateCrownGuardAI(): Complete rewrite with burst/kite/recharge
   - New console commands: getCrownGuardEliteStatus(), getCrownState(), testCrownGuardBurst()

3. **Documentation**
   - CROWN_GUARD_SYSTEM_REDESIGN.md: Full design specification

### Testing Checklist

- [ ] Run `window.activateEmperorTest()` - Guards spawn
- [ ] Run `window.getCrownGuardEliteStatus()` - See all guard status
- [ ] Pick up a crown (get close to it) - All guards chase
- [ ] Watch guards burst → kite → recharge cycle
- [ ] Look for burst animation every 10 seconds
- [ ] Check kite distance maintained at 300px (DPS) / 250px (Healer)
- [ ] Healer should target low-HP guards when needed
- [ ] Guards ignore base boundaries when chasing
- [ ] Guards follow crown to player base without restriction
- [ ] Check images render correctly (Ember and Father Benedict)
- [ ] Verify blue color orbs with black borders

## Next Phase: Recapture System

Future implementation:
- [ ] Guard pickup crown when at player base
- [ ] Guard carries crown back to own base
- [ ] Protect carrier from player
- [ ] Drop crown on carrier death
- [ ] Crown drop stays at location (no auto-return)

