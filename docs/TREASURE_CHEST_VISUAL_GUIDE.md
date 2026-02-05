# Treasure Chest System - Visual Guide

## What You'll See On Screen

### Treasure Chest Appearance

```
        💎 CHEST
           ↓
    ┌──────────────┐
    │   GLOW       │ ← Gold aura (semi-transparent)
    │   EFFECT     │   Radius: ~25px
    ├──────────────┤
    │     🟨       │ ← Gold chest body
    │   ╭───────╮  │   Solid gold (#FFD700)
    │   │       │  │
    ├───┤  LID  ├──┤ ← Orange curved lid (#FFA500)
    │   │       │  │
    │   ╰───────╯  │
    │     [🔒]     │ ← Brown lock detail (#8B4513)
    │              │
    └──────────────┘
         ↑
      20px radius
      60px pickup distance
```

---

## Map Layout Example

```
                    TEAM A BASE
                    (Player Team)
                        ▲
                        │
                    ┌───┴───┐
                    │       │
        ┌─────────────────────────────┐
        │                             │
     💎 │  CHEST 1                    │  CHEST 2 💎
        │                             │
   TEAM C│                             │ TEAM B
   BASE  │                             │ BASE
        │                             │
        │      PLAYER   💎            │
        │      (You)  CHEST 3         │
        │                             │
        │                             │
     💎 │  CHEST 4        💎 CHEST 5  │
        │                             │
        └─────────────────────────────┘
        
Legend:
  💎 = Treasure Chest
  ▼  = Base Location
  •  = Chest spawned away from bases (200px+ safety zone)
```

---

## Collection Sequence

### Step 1: Spotting a Chest
```
        You                  Chest
        🚶                   💎
        
        Distance: 200px away
        Status: Too far to collect
```

### Step 2: Approaching
```
        You      Distance      Chest
        🚶 ─────────85px─────── 💎
        
        Getting closer!
        Status: Not yet...
```

### Step 3: Pickup Range (60px)
```
        You      Distance      Chest
        🚶 ─────────45px─────── 💎 ← CLOSE ENOUGH!
        
        Automatic collection triggered!
```

### Step 4: Collection Effect
```
        You
        🚶
        
        ✨ COLLECTION EFFECT:
        ├─ Chest disappears
        ├─ Card generated
        ├─ Toast message: "🎉 Treasure Chest! Received: [Fighter Name]"
        ├─ Card added to inventory
        └─ Respawn timer starts (3 minutes)
```

### Step 5: Respawn Cycle
```
        Respawn Timer:
        ⏱️  0-60s   [=         ] 33%
        ⏱️ 60-120s  [======    ] 66%
        ⏱️ 120-180s [=========] 99%
        
        After 180 seconds:
        💎 NEW CHEST SPAWNS at random location
```

---

## Card Generation Visual

### What Card You Get

```
When you collect a chest:

┌─────────────────────────────────────┐
│         FIGHTER CARD GENERATED      │
├─────────────────────────────────────┤
│                                     │
│   Card Name: ________               │
│   ↓ (Matches your player level)     │
│                                     │
│   Level: [Your Current Level]       │
│   Rarity: [Random, 1⭐ to 5⭐]      │
│   Type: [DPS/Tank/Healer]           │
│                                     │
│   ✅ ADDED TO INVENTORY             │
│                                     │
└─────────────────────────────────────┘

Example at Level 5:
  → Ragnar the Cleaver (Level 5) ⭐⭐ UNCOMMON
  
Example at Level 15:
  → Ember the Pyromancer (Level 15) ⭐⭐⭐ RARE
  
Example at Level 50:
  → Frost the Cryomancer (Level 50) ⭐⭐⭐⭐ EPIC
```

---

## Respawn Timeline

### Visual Timeline (3 Minutes)

```
Collection happens at time 0:00

0:00 ─ Chest destroyed
   │
   │   🔄 Respawn timer starts
   │
1:00 ─ ⏱️  Timer at 1 minute (33% complete)
   │   
   │   💎 New location being calculated...
   │
2:00 ─ ⏱️  Timer at 2 minutes (66% complete)
   │
   │   🎲 Randomizing chest position...
   │
3:00 ─ ⏱️  Timer complete! (100%)
   │
   └─► 💎 NEW CHEST APPEARS at random location
       
       Cycle repeats...
```

---

## Pickup Radius Visual

### How Close You Need to Be

```
Top-Down View of Chest:

                  60px radius (pickup distance)
                  
                     Outer Circle
                   /             \
                  |       💎       |  ← You must be within
                  |     CHEST      |     this circle to
                   \             /      collect
                     \_________/
                     
                  20px inner radius
                  (visual size)

        🚶 ← You              💎 ← Chest
        
        If distance between you and chest < 60px:
        → Instant automatic collection!
```

---

## System State Diagram

### State Flow

```
                          ┌─────────────────┐
                          │  GAME STARTUP   │
                          └────────┬────────┘
                                   │
                                   ↓
                   ┌───────────────────────────────┐
                   │  initTreasureChests(state)    │
                   │  • Create chest array         │
                   │  • Set configuration          │
                   │  • Spawn 5 initial chests     │
                   └───────┬───────────────────────┘
                           │
                    ┌──────┴──────┐
                    ↓             ↓
              [5 Chests Exist]   
                    │
                    │ GAME RUNNING (Each Frame)
                    ↓
       ┌────────────────────────────┐
       │ updateTreasureChests()     │
       │ • Check player distance    │
       │ • Update respawn timer     │
       │ • Detect collections       │
       └────┬───────────────────────┘
            │
            ├─ Player < 60px away from chest?
            │         │
            │    YES  ↓
            │     ┌───────────────────────┐
            │     │ collectTreasureChest()│
            │     │ • Generate card       │
            │     │ • Add to inventory    │
            │     │ • Show notification   │
            │     │ • Start respawn timer │
            │     └───┬───────────────────┘
            │         │
            │         ↓
            │    Respawn Timer
            │    Running (0-180s)
            │         │
            │    180s elapsed?
            │         │
            │    YES  ↓
            │    ┌─────────────────────┐
            │    │ spawnRandomChest()  │
            │    │ • Pick safe spot    │
            │    │ • Create new chest  │
            │    │ • Reset timer       │
            │    └──────┬──────────────┘
            │           │
            ├───────────┘
            │
            └─ NO: Continue monitoring
                  (return to start of loop)
```

---

## Rendering Sequence

### What Gets Drawn Each Frame

```
render() function called every frame:

1. Clear screen
   ├─ Black background
   
2. Draw world
   ├─ Grass, terrain
   
3. Draw enemies
   ├─ Monster sprites
   ├─ Health bars
   
4. Draw friendly units
   ├─ Your fighters
   ├─ Allies
   
5. Draw loot
   ├─ Item drops (small triangles)
   
6. Draw TREASURE CHESTS  ← YOU ARE HERE
   ├─ Gold glow
   ├─ Chest body
   ├─ Chest lid
   ├─ Lock detail
   ├─ Text label
   
7. Draw crowns
   ├─ Emperor mode items
   
8. Draw UI overlay
   ├─ Health bar
   ├─ Mana bar
   ├─ Minimap
   ├─ Inventory
```

---

## Collision Detection

### Distance Calculation

```
Player Position:  (100, 150)
Chest Position:   (110, 165)

Distance Formula:
  d = √[(x₂-x₁)² + (y₂-y₁)²]
  d = √[(110-100)² + (165-150)²]
  d = √[10² + 15²]
  d = √[100 + 225]
  d = √325
  d ≈ 18 pixels

Pickup Radius: 60 pixels

Is 18 < 60? YES → COLLECT! ✅
```

---

## Game Balance Impact

### Card Collection Rate Comparison

```
BEFORE (Level-ups only):

Hour 1:    █████ 10 cards (from 10 level-ups)
Hour 2:    ███   6 cards (leveling slows down)
Hour 3:    ██    4 cards (higher levels take longer)

Total: ~20 cards/hour average


AFTER (Level-ups + Treasure Chests):

Hour 1:    ██████████████████ 40 cards
           + ██ (20 from chests)

Hour 2:    ████████████       20 cards
           + ██ (20 from chests)

Hour 3:    ████████           8 cards
           + ██ (20 from chests)

Total: ~130+ cards/hour average (6x faster!)
```

---

## Chest Respawn Example Timeline

### Real-Time Example

```
3:45 PM - Player collects first chest
          → Card: "Ragnar the Cleaver" (Level 5)
          → Respawn timer starts

3:46 PM - Timer: 1:00 elapsed (1 minute / 3 total)
          → Chest not ready yet

3:47 PM - Timer: 2:00 elapsed (2 minutes / 3 total)
          → Getting close to respawn

3:48 PM - Timer: 3:00 elapsed (3 minutes / 3 total) ✅
          → NEW CHEST APPEARS!
          → Location: (450, 620) - different spot
          → Player can collect again

3:49 PM - Player walks to new chest location
          → Collision detected!
          → Collection triggered
          → Card: "Kaelen Stormbreaker" (Level 5)
          → New respawn timer starts

3:52 PM - New chest respawns (after 3 more minutes)
          → And so on...
```

---

## Configuration Visualization

### How Changes Affect Gameplay

```
Standard Configuration:
  5 Chests ────┐
               ├─→ Every 3 minutes, 1 new card
  3 Min Respawn┘

Faster Respawn (2 Min):
  5 Chests ────┐
               ├─→ More frequent cards (60/hour)
  2 Min Respawn┘

More Chests (10):
  10 Chests ───┐
               ├─→ 2 cards every 3 minutes
  3 Min Respawn┘

Both Changes (10 chests, 2 min):
  10 Chests ───┐
               ├─→ Very fast card generation
  2 Min Respawn┘   (~200 cards/hour!)
```

---

## Summary: The Complete Picture

```
┌────────────────────────────────────────────────────────┐
│         TREASURE CHEST SYSTEM OVERVIEW                │
├────────────────────────────────────────────────────────┤
│                                                        │
│  SPAWN:     5 golden chests at random map locations  │
│             (away from bases for safety)             │
│                                                        │
│  COLLECT:   Walk within 60px → automatic pickup      │
│             → Free fighter card generated             │
│             → Card added to inventory                │
│             → Toast notification shown              │
│                                                        │
│  RESPAWN:   3-minute timer after collection          │
│             → New chest spawns at different location │
│             → Always maintains 5 active chests       │
│                                                        │
│  CARDS:     Level matches your current level        │
│             Rarity determined by chance system      │
│             Any fighter type possible               │
│                                                        │
│  EFFECT:    3-4x faster card collection rate        │
│             Better fighter variety early            │
│             Incentivizes exploration                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

**That's the complete visual guide to how Treasure Chests work in your game!**

Use this to understand the system, or show it to others to explain the feature.
