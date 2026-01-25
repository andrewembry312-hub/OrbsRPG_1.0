# Crown System Architecture Diagram

## State Structure
```
state.emperor
├── active: boolean (emperor mode active?)
├── crowns: object
│   ├── teamA: { type: 'crown', team: 'teamA', x, y, r: 18, secured, carriedBy }
│   ├── teamB: { type: 'crown', team: 'teamB', x, y, r: 18, secured, carriedBy }
│   └── teamC: { type: 'crown', team: 'teamC', x, y, r: 18, secured, carriedBy }
└── crownGuards: object
    ├── teamA: [guardId1, guardId2, guardId3, guardId4, guardId5]
    ├── teamB: [guardId1, guardId2, guardId3, guardId4, guardId5]
    └── teamC: [guardId1, guardId2, guardId3, guardId4, guardId5]

state.enemies (includes crown guards)
├── Guard1 { crownGuard: true, team: 'teamA', homeSiteId, r: 24, maxHp: 120, variant: 'warrior', ... }
├── Guard2 { crownGuard: true, team: 'teamA', homeSiteId, r: 24, maxHp: 120, variant: 'mage', ... }
├── Guard3 { crownGuard: true, team: 'teamA', homeSiteId, r: 24, maxHp: 120, variant: 'warrior', ... }
├── Guard4 { crownGuard: true, team: 'teamA', homeSiteId, r: 24, maxHp: 120, variant: 'mage', ... }
└── Guard5 { crownGuard: true, team: 'teamA', homeSiteId, r: 24, maxHp: 120, variant: 'warrior', ... }
    (... and same for teamB and teamC bases)
```

## Game Flow Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│ GAME START                                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ spawnCrowns() - Line 13643       │
        │ Creates 3 crown ITEMS at bases   │
        │ State: emperor.crowns[teamX] = { │
        │   type: 'crown', team, x, y...   │
        │ }                                │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ GAME RUNNING                         │
        │ - Player captures all flags          │
        │ - checkEmperorStatus() checks        │
        │   if player controls all flags       │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ EMPEROR ACTIVATED                    │
        │ checkEmperorStatus() - Line 12577    │
        │ newEmperorTeam === 'player'          │
        │   ↓                                  │
        │ state.emperor.active = true          │
        │ unlockCrowns(state)                  │
        │ spawnZoneBoss(state)                 │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ unlockCrowns() - Line 13676          │
        │ For each team (A, B, C):             │
        │   ↓                                  │
        │ spawnCrownGuards(state, base, team)  │
        │   ↓                                  │
        │ Spawns 5 elite guards per base       │
        │ Stored in: emperor.crownGuards[team] │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ MAIN GAME LOOP - updateGame()        │
        │ Every frame (Line 11323):            │
        │   ├─ tryPickupCrowns()               │
        │   ├─ updateCarriedCrowns()           │
        │   ├─ trySecureCrowns()               │
        │   └─ updateCrownGuardRespawns()      │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ Player Must Defeat Guards            │
        │ ├─ Approach base                     │
        │ ├─ Combat with 5 elite guards        │
        │ ├─ Each guard: r=24, HP=120         │
        │ ├─ Variants: warrior/mage           │
        │ └─ All 5 reduced to HP=0 → dead     │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ tryPickupCrowns() - Line 13774      │
        │ Player near dead guards' crown       │
        │   ↓                                  │
        │ crown.carriedBy = 'player'           │
        │ Toast: "👑 Crown claimed (teamA)"   │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ updateCarriedCrowns() - Line 13801   │
        │ Crown follows player position        │
        │ crown.x = player.x + offset          │
        │ crown.y = player.y + offset          │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ Player Travels to Player Base        │
        │ ├─ Carrying crowns                   │
        │ ├─ Can carry multiple crowns         │
        │ └─ Reaching base triggers...         │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ trySecureCrowns() - Line 13833       │
        │ Player near base with crown          │
        │   ↓                                  │
        │ crown.secured = true                 │
        │ crown.carriedBy = null               │
        │ Toast: "✅ Crown secured (X) 1/3"   │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ Repeat for Other 2 Crowns            │
        │ ├─ Go to next enemy base             │
        │ ├─ Defeat 5 elite guards (new ones)  │
        │ ├─ Pickup crown                      │
        │ ├─ Carry to player base              │
        │ ├─ Secure crown (2/3, 3/3)           │
        │ └─ Continue...                       │
        └──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ VICTORY CONDITION MET                │
        │ countSecuredCrowns() === 3           │
        │   ↓                                  │
        │ Zone Advance / Victory Screen        │
        │ handleZoneBossDefeat() rewards       │
        └──────────────────────────────────────┘


┌──────────────────────────────────────────────────┐
│ GUARD RESPAWN CYCLE (Runs Every Frame)          │
├──────────────────────────────────────────────────┤
│ updateCrownGuardRespawns() - Line 13890          │
│                                                  │
│ For each team (A, B, C):                         │
│   ├─ Check state.emperor.crownGuards[team]      │
│   ├─ Count guards still alive (hp > 0)          │
│   └─ If livingGuards === 0:                      │
│       └─ spawnCrownGuards(state, base, team)    │
│           └─ New 5 guards spawn at base          │
│               └─ State: emperor.crownGuards[team] = [id1...id5]
└──────────────────────────────────────────────────┘
```

## Crown States

```
┌─────────────────────────────────────────────────────────┐
│ CROWN ITEM LIFECYCLE                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [AT BASE] ──game_start──> created by spawnCrowns()    │
│   ↓                                                    │
│ [AT BASE] ──emperor_activated──> guards spawn         │
│   ↓                                                    │
│ [AT BASE] ──guards_defeated──> pickupable             │
│   ↓                                                    │
│ [CARRIED] ──player_near_crown──> player carries it    │
│   ↓                                                    │
│ [CARRIED] ──follow_player──> updateCarriedCrowns()   │
│   ↓                                                    │
│ [CARRIED] ──reach_player_base──> secured             │
│   ↓                                                    │
│ [SECURED] ──all_3_secured──> VICTORY!                │
│                                                         │
│ [CARRIED] ──player_dies──> return to base             │
│   ↓                                                    │
│ [AT BASE] ──guards_respawn──> pickupable again        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Guard Spawning Pattern

```
Pentagon Formation (5 guards around base):

              Guard1 (TOP)
               / \
              /   \
             /     \
       Guard5       Guard2
        (SW)        (SE)
         /           \
        /             \
    BASE CENTER     
    (CROWN)
        \             /
         \           /
       Guard4       Guard3
        (NW)        (NE)
         \         /
          \       /
           \     /
             \ /
          
Angles: 72° apart in pentagon (360/5)
Position: offset = base.r + 70 pixels
Colors: Blue orbs (r=24, boss size)
Health: 120 HP each (elite)
Variants: warrior (3), mage (2)

All 5 DEAD → Automatic respawn
```

## Function Call Graph

```
checkEmperorStatus()
    └─> Player becomes emperor
        └─> state.emperor.active = true
            └─> unlockCrowns()
                └─> spawnCrownGuards(state, teamA_base, 'teamA')
                ├─> spawnCrownGuards(state, teamB_base, 'teamB')
                └─> spawnCrownGuards(state, teamC_base, 'teamC')
                    └─> Creates 5 guards per base

updateGame() [Main Loop]
    └─> tryPickupCrowns()      [Check player near crown]
    ├─> updateCarriedCrowns()   [Crown follows player]
    ├─> trySecureCrowns()       [Check player at base]
    └─> updateCrownGuardRespawns()  [Respawn dead guards]
        └─> Check all guards alive
            └─> If all dead: spawnCrownGuards()
```

## Key Data Structures

### Crown Item
```javascript
{
  type: 'crown',
  team: 'teamA',        // teamA/B/C
  x: 100,
  y: 200,
  r: 18,
  name: 'Crown (teamA)',
  secured: false,       // true when at player base
  carriedBy: null       // 'player' when carried, null otherwise
}
```

### Elite Crown Guard
```javascript
{
  x: 250,
  y: 250,
  r: 24,                // Boss size
  maxHp: 120,
  hp: 120,
  team: 'teamA',
  variant: 'warrior',   // or 'mage'
  guardRole: 'DPS',     // or 'HEALER'
  level: 5,
  crownGuard: true,     // Identifies as crown guard
  homeSiteId: 'team_a_base',
  guardIndex: 0,        // 0-4
  color: 'blue',        // Visual
  _spawnX: 250,
  _spawnY: 250
}
```

---

## Color Reference
- 🔵 **Blue Orbs** (r=24) = Elite Crown Guards
- 👑 **Crown Item** = Loot object at bases
- 🏰 **Enemy Base** = Where crown and guards start
- ✅ **Secured** = Crown brought to player base

---

**Diagram Complete** - Shows complete flow from game start to victory!
