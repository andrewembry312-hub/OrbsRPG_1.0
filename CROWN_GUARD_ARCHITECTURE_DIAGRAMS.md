# Crown Guard System - Architecture Diagram

## System Overview

```
═══════════════════════════════════════════════════════════════════════════════
                        CROWN GUARD SYSTEM ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

                              EMPEROR MODE ACTIVE
                                      │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                TeamA Crown         TeamB Crown         TeamC Crown
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        │
        ╔═══════════════════════════════╩═══════════════════════════════════╗
        ║           SPAWN 5 ELITE GUARDS PER TEAM (15 TOTAL)               ║
        ╚═══════════════════════════════╦═══════════════════════════════════╝
                                        │
        ┌───────────────────────────────┼───────────────────────────────────┐
        │                               │                                   │
   LOADOUT TYPE           LOADOUT TYPE                           LOADOUT TYPE
   Guard #1              Guard #2                               Guards #3-5
       │                     │                                       │
   TANK PRIORITY        HEALER PRIORITY                          DPS PRIORITY
   (Priority 1)         (Priority 2)                             (Priority 3)
       │                     │                                       │
   Role: TANK           Role: HEALER                            Role: DPS
   Class: Warrior       Class: Mage                          Classes: Mixed
   +50% HP              -10% HP                                +25-35% DMG
   +30% DEF             +40% Mana                              +5-15% SPD
   -10% SPD             -5% SPD
   
   Stay: 80px           Stay: 120px                            Stay: 150px
   From Crown           From Crown                             From Crown
```

## Spawn Flow Diagram

```
═══════════════════════════════════════════════════════════════════════════════
                              SPAWN SEQUENCE
═══════════════════════════════════════════════════════════════════════════════

START: Emperor Mode Activated
  │
  ├─→ unlockCrowns(state)
  │     │
  │     └─→ For each team (A, B, C):
  │         │
  │         └─→ spawnCrownGuards(state, base, team)
  │             │
  │             ├─→ Clear old guards for this team
  │             │
  │             └─→ For guard index i = 0 to 4:
  │                 │
  │                 ├─→ Calculate pentagon position
  │                 │   • angle = (i * 72°) - 90°
  │                 │   • x = base.x + cos(angle) * offset
  │                 │   • y = base.y + sin(angle) * offset
  │                 │
  │                 ├─→ Get loadout type by index
  │                 │   • i=0 → 'tank'
  │                 │   • i=1 → 'healer'
  │                 │   • i=2 → 'dps1'
  │                 │   • i=3 → 'dps2'
  │                 │   • i=4 → 'dps3'
  │                 │
  │                 ├─→ Create guard object with:
  │                 │   • loadoutType, loadoutId
  │                 │   • crownTeam, crownId, crownSiteId
  │                 │   • guardPriority
  │                 │   • crownFormationIndex = i
  │                 │   • Blue color, black border, fighter image
  │                 │
  │                 ├─→ Apply loadout stats multipliers
  │                 │
  │                 ├─→ Initialize abilities from loadout
  │                 │
  │                 └─→ Push to state.enemies[]
  │
  └─→ All guards spawned and positioned
```

## Pentagon Formation Geometry

```
═══════════════════════════════════════════════════════════════════════════════
                         PENTAGON FORMATION LAYOUT
═══════════════════════════════════════════════════════════════════════════════

                              Formation Radius: 90px
                              Guard Spacing: 72° angle

                    ╱────────────────────────╲
                   ╱                          ╲
                  │                            │
                  │     Guard #0 (Tank)        │
                  │      80px distance         │
                  │                            │
                  │         ◯                  │
                  │        ╱ ╲                │
                  │       ╱   ╲               │
                  │      ╱     ╲              │
                  │     ╱       ╲             │
                  │    ╱         ╲            │
                  │   ╱           ╲           │
   Guard #4       │  ╱             ╲          │  Guard #1
   DPS3         │ ╱               ╲         │  Healer
   150px        │╱                 ╲        │  120px
   Distance     ────────○CROWN○─────────      Distance
   DPS2         │╲                 ╱        │
               │ ╲               ╱         │
               │  ╲             ╱          │
               │   ╲           ╱           │
               │    ╲         ╱            │
               │     ╲       ╱             │
               │      ╲     ╱              │
               │       ╲   ╱               │
               │        ╲ ╱                │
               │         ◯                  │
               │    Guard #3 (DPS1)        │
               │      150px distance        │
               │                            │
               │        Guard #2           │
               │      DPS (Battle Mage)    │
               │       150px distance       │
               │                            │
                  ╲          ◯              ╱
                   ╲                      ╱
                    ╲____────────────────╱

ANGLES:
  Guard #0 (Tank):          -90° (top)
  Guard #1 (Healer):        -18° (top-right)
  Guard #2 (DPS1):           54° (bottom-right)
  Guard #3 (DPS2):          126° (bottom-left)
  Guard #4 (DPS3):          198° (top-left)

FORMATION PROPERTIES:
  • Center: Crown position (moves dynamically)
  • Radius: 90px (maintained)
  • Alignment: Auto-corrects each frame
  • Reset: When threats clear
```

## Update Loop Flow

```
═══════════════════════════════════════════════════════════════════════════════
                           UPDATE CYCLE (Per Frame)
═══════════════════════════════════════════════════════════════════════════════

MAIN GAME LOOP
  │
  └─→ updateCrownGuardAI(state, dt)
      │
      └─→ For each team (A, B, C):
          │
          ├─→ Get crown position (crownX, crownY)
          │
          └─→ For each guard in team:
              │
              ├─→ Calculate distance to crown
              │   distToCrown = √((gx-cx)² + (gy-cy)²)
              │
              ├─→ Read guardPriority (1/2/3)
              │
              ├─→ IF priority === 1 (TANK):
              │   │
              │   ├─→ Set followRange = 80px
              │   ├─→ targetX = crownX, targetY = crownY
              │   │
              │   ├─→ Find nearby enemies (< 200px of crown)
              │   └─→ If enemies found:
              │       └─→ Target nearest enemy (intercept)
              │
              ├─→ ELSE IF priority === 2 (HEALER):
              │   │
              │   ├─→ Set followRange = 120px
              │   │
              │   ├─→ Find hurt guards (< 75% HP)
              │   ├─→ If hurt guards:
              │   │   └─→ Target nearest hurt guard (heal)
              │   └─→ Else:
              │       └─→ Target crown (protect)
              │
              └─→ ELSE (DPS priority === 3):
                  │
                  ├─→ Set followRange = 150px
                  │
                  ├─→ Find enemies in 300px radius
                  ├─→ If enemies:
                  │   └─→ Target nearest enemy (attack)
                  └─→ Else:
                      └─→ Calculate formation position
                          • formAngle = crownFormationIndex * 72°
                          • formDist = 90px
                          • Target crown + formation offset
              │
              └─→ If distToCrown > 500px:
                  └─→ Switch guardMode = "chase"
              
              └─→ Set targetX/Y based on behavior
                  └─→ Normal movement system handles pathfinding
```

## Priority Decision Tree

```
═══════════════════════════════════════════════════════════════════════════════
                        PRIORITY-BASED DECISION TREE
═══════════════════════════════════════════════════════════════════════════════

                            UPDATE GUARD AI
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
              Is Dead?                      Calculate Distance
                    │                       to Crown (distToCrown)
                    │ Yes                         │
                    └──→ SKIP                     │
                                                  │
                    ┌─────────────────────────────┴──────────────────────────┐
                    │                                                         │
            Read guardPriority                                          Any Threats?
                    │                                                 (Distance check)
        ┌───────────┼───────────┐                                         │
        │           │           │                              ┌──────────┴──────────┐
    Pri=1(TANK)   Pri=2(HEALER) Pri=3(DPS)                   │ Yes          │ No
        │           │           │                             │             │
        │           │           │                             │             │
        ▼           ▼           ▼                             ▼             ▼
    INTERCEPT    HEAL TEAM   HUNT ENEMIES            INTERCEPT         FORMATION
    THREATS         │            │                   THREATS           POSITION
        │           │            │                        │                │
        ├──→ Find   ├──→ Scan    ├──→ Scan              ├──→ Move to      ├──→ Calculate
        │   enemies │   for hurt │   enemies            │   threat        │   formation
        │   near    │   allies   │   in 300px           │                 │   angle
        │   crown   │   (75%HP)  │                      └──────┬──────────┘
        │   (200px) │            │                             │
        │   │       │            │                     ┌───────┴──────────┐
        │   ├──→    ├──→ Heal?   ├──→ Attack?          │                  │
        │   │ Yes   │ Yes        │ Yes                 │ Chase > 500px?   │
        │   │       │ │          │ │                   │ Yes              │
        │   │       │ │          │ │                   │ │                │
        │   │       └─┤──→       └─┤──→               └─┤──→              │
        │   │         TARGET      TARGET                │ Chase           │
        │   │         HURT        ENEMY                │ Mode             │
        │   │         GUARD                            │                  │
        │   │                                          └──────┬───────────┘
        │   │                                                  │
        │   └──────────────────────┬──────────────────────────┴──→ SET TARGET (X,Y)
        │                          │
        └──────────────────────────┴──→ NORMAL MOVEMENT SYSTEM
                                       • Pathfind to target
                                       • Move guard
                                       • Handle combat
```

## Crown Chase Trigger

```
═══════════════════════════════════════════════════════════════════════════════
                          CROWN CHASE MECHANISM
═══════════════════════════════════════════════════════════════════════════════

Crown at Base (< 500px from spawn)
                    │
                    ▼
        ┌───────────────────────┐
        │  Guard in Formation   │
        │  guardMode = protect  │
        │  Follow crownFollowRange
        └───────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
    Crown Moves              Crown Stays
    Player picks it up      at Base
        │                       │
        ▼                       ▼
  Distance > 500px?      Stay in Formation
        │
        │ YES
        │
        ▼
   ┌─────────────────────┐
   │ ALL GUARDS CHASE    │
   │ guardMode = chase   │
   │ Ignore formation    │
   │ Target: crownX/Y    │
   │ Priorities still:   │
   │ • Tank closest      │
   │ • Healer supports   │
   │ • DPS hunts threats │
   └─────────────────────┘
        │
        ▼
   Crown < 500px Distance
        │
        ▼
   ┌──────────────────┐
   │ RETURN TO        │
   │ FORMATION        │
   │ guardMode = prot │
   │ Follow formation │
   └──────────────────┘
```

## Guard Role Matrix

```
═══════════════════════════════════════════════════════════════════════════════
                    GUARD ROLE & BEHAVIOR MATRIX
═══════════════════════════════════════════════════════════════════════════════

┌─────────┬──────────┬──────────┬──────────┬──────────┬──────────────────┐
│ Guard   │ Priority │ Class    │ Role     │ Stats    │ Behavior         │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ #0      │ 1        │ Warrior  │ TANK     │ HP++     │ Shield crown     │
│ TANK    │ (1st)    │          │          │ DEF++    │ Intercept threats│
│         │          │          │          │ SPD--    │ 80px distance    │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ #1      │ 2        │ Mage     │ HEALER   │ HP--     │ Heal allies      │
│ HEALER  │ (2nd)    │          │          │ Mana++   │ Support formation│
│         │          │          │          │ SPD--    │ 120px distance   │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ #2      │ 3        │ Warrior  │ DPS      │ DMG++    │ Hunt enemies     │
│ DPS1    │ (3rd)    │          │          │ SPD++    │ 300px radius     │
│         │          │          │          │ DEF--    │ 150px distance   │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ #3      │ 3        │ Mage     │ DPS      │ DMG+     │ Hunt enemies     │
│ DPS2    │ (3rd)    │          │          │ SPD+     │ 300px radius     │
│         │          │          │          │ Mana++   │ 150px distance   │
├─────────┼──────────┼──────────┼──────────┼──────────┼──────────────────┤
│ #4      │ 3        │ Warrior  │ DPS      │ DMG+++   │ Hunt enemies     │
│ DPS3    │ (3rd)    │          │          │ SPD+++   │ 300px radius     │
│         │          │          │          │ DEF--    │ 150px distance   │
└─────────┴──────────┴──────────┴──────────┴──────────┴──────────────────┘

ATTACK RANGES:
  TANK:     200px threat intercept range
  HEALER:   (uses existing ally healing range)
  DPS:      300px enemy hunt range

FOLLOW DISTANCES (from crown):
  TANK:     80px  (closest, shields)
  HEALER:   120px (mid-range, supports)
  DPS:      150px (outer ring, hunts)
```

---

**System Complete** ✅  
All diagrams show the integrated crown guard system with loadout types and priorities.

