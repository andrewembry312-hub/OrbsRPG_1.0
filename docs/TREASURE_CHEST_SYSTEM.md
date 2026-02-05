# Treasure Chest System Documentation

## Overview

The Treasure Chest System adds 5 randomly-spawned chests to the game map that provide free fighter card spins when collected. This incentivizes map exploration and accelerates card collection progression.

**Key Features:**
- ✅ **5 Chests** spawn at random locations on the playable map
- ✅ **Free Card Spin** granted on pickup (like leveling up)
- ✅ **Auto-Respawn** at random location 3 minutes (180 seconds) after collection
- ✅ **Visual Indicator** with golden chest sprite and label
- ✅ **Collision Detection** using player proximity (60px pickup radius)

---

## System Architecture

### 1. Initialization: `initTreasureChests(state)`

**Location:** `src/game/game.js` (after spawnCrowns)
**Called From:** `initGame()` line 218
**Purpose:** Set up treasure chest system on game startup

**Initialization Values:**
```javascript
state.treasureChests = []              // Array of chest objects
state.chestRespawnTimer = 0            // Time elapsed since last respawn
state.CHEST_RESPAWN_INTERVAL = 180     // 3 minutes in seconds
state.CHEST_COUNT = 5                  // Total chests to maintain
state.CHEST_PICKUP_RADIUS = 60         // Pickup detection radius in pixels
```

**Process:**
1. Check if treasure chest system already initialized (prevent re-init)
2. Set default configuration values
3. Spawn 5 initial chests via `spawnRandomChest()`
4. Log initialization status

---

### 2. Spawn: `spawnRandomChest(state)`

**Location:** `src/game/game.js`
**Called From:** `initTreasureChests()` and `updateTreasureChests()` respawn

**Process:**
1. **Bounds Check** - Verify playable bounds exist
2. **Random Location** - Generate X,Y within playable bounds
3. **Avoid Bases** - Run up to 30 attempts to spawn away from base sites (200px minimum)
4. **Create Chest Object:**
   ```javascript
   {
     id: string,                    // Unique chest ID
     x: number,                     // X coordinate
     y: number,                     // Y coordinate
     r: 20,                         // Visible radius (pixels)
     type: 'treasure_chest',        // Entity type
     collected: false,              // Collection flag
     spawnTime: number,             // Campaign time of spawn
     icon: '📦'                     // Unicode treasure chest
   }
   ```
5. **Add to State** - Push to `state.treasureChests` array
6. **Log Spawn** - Console output with coordinates

---

### 3. Update: `updateTreasureChests(state, dt)`

**Location:** `src/game/game.js`
**Called From:** `updateGame()` every frame
**Parameter:** `dt` = delta time in seconds

**Process Each Frame:**

#### Phase A: Pickup Detection
```javascript
for each chest in state.treasureChests:
  distance = hypot(player.x - chest.x, player.y - chest.y)
  if distance < CHEST_PICKUP_RADIUS (60px):
    → collectTreasureChest(state, chest)
    → remove from treasureChests array
```

#### Phase B: Respawn Timer
```javascript
state.chestRespawnTimer += dt
if chestRespawnTimer >= CHEST_RESPAWN_INTERVAL (180s):
  → Reset timer to 0
  → Calculate missingCount = CHEST_COUNT - current_chests
  → Spawn new chests to fill gaps
```

**Result:** Maintains constant 5 chests on map, automatically respawns after collection

---

### 4. Collection: `collectTreasureChest(state, chest)`

**Location:** `src/game/game.js`
**Called From:** `updateTreasureChests()` on pickup
**Triggers:** Fighter card generation and inventory addition

**Process:**
1. **Get Player Level** - `state.progression.level`
2. **Generate Card** - Call `generateFighterCard(playerLevel, cardId)`
   - Generates card at player's current level
   - Card rarity determined by level and random chance
3. **Add to Inventory** - Call `addFighterCard(state, card)`
   - Adds card to fighter card inventory
   - Updates UI and inventory count
4. **Show Toast** - Display popup: `🎉 Treasure Chest! Received: [Card Name]`
5. **Fancy Reveal** - Attempt to show card reveal animation (if available)
6. **Console Log** - Debug output with card name and rarity

**Card Generation:**
- Uses same system as level-up card spins
- Card level = player level (scales as you progress)
- Rarity determined by game's card probability system
- All fighter types possible (DPS, Tank, Healer)

---

### 5. Rendering: Treasure Chest Visuals

**Location:** `src/game/render.js` lines ~760-798
**Called From:** Main `render()` function
**Renders:** Golden treasure chest with label

**Visual Elements:**
```
Glow Effect
    ↓
  [Gold Circle with transparency]
    ↓
Chest Body (Gold Rectangle)
    ↓
  [#FFD700 filled rectangle]
    ↓
Chest Lid (Orange Arc)
    ↓
  [#FFA500 top half-circle]
    ↓
Lock Detail (Brown Rectangle)
    ↓
  [#8B4513 small lock icon]
    ↓
Label
    ↓
  [💎 CHEST - Text label above]
```

**Rendering Conditions:**
- Only renders if chest exists and not collected
- Only renders if in view (camera culling optimization)
- Dynamically positioned at chest.x, chest.y
- Uses world coordinates (camera transforms applied)

---

## Integration Points

### 1. Game Initialization (initGame)
```javascript
// Line 218 in game.js
export function initGame(state) {
  // ... other init code ...
  spawnCrowns(state);            // Crown system
  initTreasureChests(state);     // ← Chest system startup
  // ... rest of init ...
}
```

### 2. Game Update Loop (updateGame)
```javascript
// Line 11394 in game.js
function updateGame(state, dt) {
  // ... other updates ...
  updateEmperorGuideUI(state);
  updateFriendlySpawns(state, dt);
  updatePartyCoordinator(state, dt);
  updateFriendlies(state, dt);
  updateTreasureChests(state, dt);  // ← Chest system update every frame
  // ... rest of updates ...
}
```

### 3. Rendering (render)
```javascript
// Lines ~760-798 in render.js
export function render(state) {
  // ... setup and background ...
  
  // Loot rendering
  for(const l of state.loot) {
    drawLoot...
  }
  
  // Treasure chests rendering
  if(state.treasureChests && state.treasureChests.length > 0) {
    for(const chest of state.treasureChests) {
      // Draw golden chest sprite
    }
  }
  
  // Crowns and other entities...
}
```

### 4. Fighter Card System
- Uses `generateFighterCard(playerLevel, cardId)` from fighter-cards.js
- Uses `addFighterCard(state, card)` from fighter-cards.js
- Cards are treated identically to level-up card spins

---

## Testing

### Console Commands

**1. Test Chest System Status**
```javascript
testChestSystem()
```
**Output:**
```
═══════════════════════════════════════
  🎁 TREASURE CHEST SYSTEM STATUS
═══════════════════════════════════════
  Active Chests: 5 / 5
  Respawn Timer: 42.3s / 180s
  Pickup Radius: 60px

  📍 Chest Locations:
    Chest 1: (1024, 512) - 📏 385px away
    Chest 2: (256, 768) - 📏 642px away
    Chest 3: (768, 256) - ✅ IN RANGE
    Chest 4: (1280, 384) - 📏 512px away
    Chest 5: (512, 1024) - 📏 481px away

  ⏱️ Respawn Info:
    Next respawn in: 137s
    Respawns after: 3 minutes (180s)
═══════════════════════════════════════
```

**2. Spawn Test Chest**
```javascript
spawnTestChest()
```
**Output:**
```
[TEST] Spawned chest at (432, 689)
[TEST] Total chests: 6
```

**3. Teleport to Chest**
```javascript
teleportToChest(0)     // Teleport to first chest
teleportToChest(2)     // Teleport to third chest
```

---

## Game Balance

### Card Collection Rate

**Before Treasure Chests:**
- Card spins: 1 per level-up (1-2 minutes per level at high levels)
- Average rate: ~30-40 cards per hour

**After Treasure Chests:**
- 5 chests × 1 card every 3 minutes = 100 cards per hour bonus
- 5 level-ups = 5 cards
- **Total:** ~130-140 cards per hour (3-4x rate)

### Progression Impact
- **Early Game:** 5-10 additional cards in first 30 minutes (good diversity)
- **Mid Game:** 50+ extra cards per hour (accelerates fighter roster building)
- **Late Game:** Scales with player level (cards remain relevant)

### Difficulty Consideration
- Chests spawn away from bases (200px+ distance)
- Spawning in open areas may increase player vulnerability
- Incentivizes exploration but creates risk/reward situation
- Does NOT break game balance (only accelerates card progression)

---

## Data Structure Reference

### Chest Object
```javascript
{
  // Identification
  id: string,                    // "chest_1234567_abc123def456"
  type: 'treasure_chest',        // Always 'treasure_chest'
  
  // Position & Size
  x: number,                     // World X coordinate
  y: number,                     // World Y coordinate
  r: 20,                         // Visible radius (pixels)
  
  // State
  collected: boolean,            // true = already picked up this frame
  spawnTime: number,             // Campaign time when spawned
  
  // Visual
  icon: string                   // '📦' (unicode chest)
}
```

### State Variables
```javascript
state.treasureChests = []              // Array of chest objects
state.chestRespawnTimer = 0            // Current respawn timer (0-180s)
state.CHEST_RESPAWN_INTERVAL = 180     // Respawn interval in seconds
state.CHEST_COUNT = 5                  // Total chests to maintain
state.CHEST_PICKUP_RADIUS = 60         // Pickup radius in pixels
```

---

## Configuration & Customization

### To Change Number of Chests
```javascript
// In initTreasureChests()
state.CHEST_COUNT = 10;  // Change from 5 to 10
```

### To Change Respawn Timer
```javascript
// In initTreasureChests()
state.CHEST_RESPAWN_INTERVAL = 120;  // Change from 180s to 120s (2 minutes)
```

### To Change Pickup Radius
```javascript
// In initTreasureChests()
state.CHEST_PICKUP_RADIUS = 100;  // Change from 60px to 100px
```

### To Change Chest Visual
```javascript
// In render.js renderTreasureChests section, modify:
ctx.fillStyle = '#FFD700';  // Change chest body color
ctx.fillStyle = '#FFA500';  // Change chest lid color
ctx.fillStyle = '#8B4513';  // Change lock color
```

---

## Troubleshooting

### Chests Not Appearing
1. Check console: `testChestSystem()`
2. Verify playable bounds are set: `console.log(window.__gameState.playableBounds)`
3. Verify chests exist: `console.log(window.__gameState.treasureChests.length)`
4. Verify render.js includes chest rendering code

### Chests Not Spawning
1. Check initialization: Game must call `initTreasureChests(state)`
2. Check updateGame includes: `updateTreasureChests(state, dt)`
3. Check playable bounds exist before init

### Cards Not Generating
1. Verify fighter-cards.js loaded: `console.log(typeof generateFighterCard)`
2. Verify player level exists: `console.log(state.progression.level)`
3. Check console for errors in collectTreasureChest()

### Chests Not Respawning
1. Verify respawn timer running: `testChestSystem()` should show timer incrementing
2. Check spawnRandomChest() finding valid locations (attempt loop 30x)
3. Verify CHEST_RESPAWN_INTERVAL = 180 (not 0)

---

## Performance Impact

### Update Cost
- **Per Frame:** ~5 chests × distance check = ~10 float operations = <0.1ms
- **Per 180s:** ~5 spawn attempts = ~100 float operations = <1ms

### Render Cost
- **Per Frame:** ~5 chests × 1 circle + 1 rect + 1 text = ~0.5ms with camera culling
- **Culled:** 0ms if chests off-screen

### Memory Cost
- **Array:** 5 chest objects × ~200 bytes each = ~1KB
- **Negligible** compared to game state

---

## Future Enhancements

### Possible Additions
1. **Chest Types:**
   - Common Chest (1 card)
   - Rare Chest (2 cards)
   - Legendary Chest (3 cards + gold bonus)

2. **Smart Respawning:**
   - Avoid clustering chests too close together
   - Prefer locations far from player (more exploration incentive)
   - Terrain-aware spawning (avoid water, walls)

3. **Visual Effects:**
   - Animated open/close lid
   - Particle effect on collection
   - Sound effect on pickup
   - Floating "+1 Card" damage number

4. **Difficulty Scaling:**
   - Chests spawn fewer as game difficulty increases
   - OR spawn with guardian enemies nearby

5. **Themed Chests:**
   - Different colors/icons based on content
   - Boss-specific drops from chests
   - Team-colored chests for territory control

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial implementation - 5 chests, 3-min respawn, free card spins |

---

## Related Systems

- **Fighter Card System** - Cards generated by chests
- **Leveling System** - Player level determines card rarity
- **Loot System** - Uses same spawn patterns (avoid bases)
- **Crown System** - Emperor chests could provide special crowns (future)

---

## Files Modified

- `src/game/game.js` - Core chest functions, integration, test commands
- `src/game/render.js` - Chest visualization
- `docs/TREASURE_CHEST_SYSTEM.md` - This documentation

---

## Author Notes

The treasure chest system was designed to:
1. **Incentivize exploration** - Scattered randomly, rewarding players who wander
2. **Accelerate progression** - Increase card collection rate for better variety
3. **Minimize complexity** - Reuses fighter card generation system
4. **Scale gracefully** - Works from level 1 to level 100+
5. **Performance-friendly** - Minimal update/render costs

The system is intentionally simple and non-intrusive, designed to complement rather than compete with other progression systems.
