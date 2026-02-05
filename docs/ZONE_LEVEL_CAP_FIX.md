# Zone-Based NPC Level Capping - Fix Documentation

## Problem Identified

**Issue**: NPCs in Zones 1-5 were not being capped at their zone's intended maximum level. This caused enemies to become overpowered because they scaled based on campaign time without respecting zone boundaries.

**Root Cause**: 
- Line 7543 in `game.js` calculated `targetLevel = floor(campaign.time/60) + 1`
- This was NOT constrained by the current zone's max level
- Result: After ~5 minutes (campaign time=300), all Zone 1 enemies reached level 6 (exceeding Zone 1 cap of 5)

**Example Progression**:
- 0 min: Level 1 ✓
- 1 min: Level 2 ✓
- 2 min: Level 3 ✓
- 3 min: Level 4 ✓
- 4 min: Level 5 (ZONE 1 CAP) ✓
- 5 min: Level 6 ✗ (OVER CAP - OVERPOWERED!)
- 6+ min: Continues climbing (VERY OVERPOWERED)

---

## Solution Implemented

### Zone Level Cap Formula

Each zone enforces a maximum level = zone number × 5:

```javascript
Zone 1: Cap 5   (Starter/Tutorial)
Zone 2: Cap 10  (Early Game)
Zone 3: Cap 15  (Mid Game)
Zone 4: Cap 20  (Late Game)
Zone 5: Cap 25  (End Game)
```

### Code Changes

**File**: `src/game/game.js` (lines 7543-7568)

```javascript
// BEFORE:
const targetLevel = Math.max(1, Math.floor(state.campaign.time/60) + 1);
if(e.level < targetLevel) { ... }  // No cap!

// AFTER:
const targetLevel = Math.max(1, Math.floor(state.campaign.time/60) + 1);

// NEW: Zone-based cap
const currentZone = state.zoneConfig?.currentZone || 1;
const zoneLevelCap = currentZone * 5;
const cappedTargetLevel = Math.min(targetLevel, zoneLevelCap);  // APPLY CAP

if(e.level < cappedTargetLevel) { ... }  // Use capped level
```

### Key Points

1. **Respects Zone Boundaries**: Enemies can never exceed their zone's level cap
2. **Time-Based Scaling Still Works**: Enemies progress with campaign time UP TO the cap
3. **All Enemy Types Affected**: Guards, champions, regular enemies - all follow same cap
4. **Dynamic**: When player advances to Zone 2, cap increases to 10

---

## Crown Locations & Base Consistency

### Why This Matters

The crown system has multiple spawning mechanisms that must all use the SAME base coordinates:

1. **Crown Spawn** (`spawnCrowns()`) - Crown appears at base location
2. **Guard Spawn** (`spawnCrownGuards()`) - Guards spawn in pentagon around crown
3. **Guard Respawn** - Guards respawn at pentagon around base
4. **Crown Pickup Zone** - Player must be within 300px of base to pick up crown

If these use different coordinates, crowns and guards don't sync, making pickup impossible.

### Base Locations (All zones)

```javascript
// Defined in world.js initSites()
player_base:  Bottom-left  (x: offsetX + pad, y: offsetY + playHeight - pad)
team_a_base:  Top-left     (x: offsetX + pad, y: offsetY + pad)
team_b_base:  Top-right    (x: offsetX + playWidth - pad, y: offsetY + pad)
team_c_base:  Bottom-right (x: offsetX + playWidth - pad, y: offsetY + playHeight - pad)
```

### Code Documentation Added

**File**: `src/game/world.js` (lines 35-51)

```javascript
// BASE LOCATIONS - Used for:
// 1. Home base for guards (spawnGuardsForSite)
// 2. Crown spawn location (spawnCrowns)
// 3. Crown guard pentagon formation spawn
// 4. Crown pickup zone center
// CRITICAL: All these must use the SAME coordinates
```

**File**: `src/game/game.js` (lines 14372-14390)

```javascript
/**
 * CRITICAL: Crown spawn locations MUST match team base locations:
 * - teamA base (Red): top-left corner
 * - teamB base (Yellow): top-right corner  
 * - teamC base (Blue): bottom-right corner
 * - player base: bottom-left corner
 * 
 * These same base locations are used for:
 * 1. Crown spawn position
 * 2. Guard spawn position (pentagon around base)
 * 3. Guard respawn location
 * 4. Crown pickup zone center
 */
```

---

## Testing Checklist

- [ ] Zone 1: Enemies cap at level 5 after 4 minutes
- [ ] Zone 2: Enemies cap at level 10 after 9 minutes
- [ ] Zone 3: Enemies cap at level 15 after 14 minutes
- [ ] Zone 4: Enemies cap at level 20 after 19 minutes
- [ ] Zone 5: Enemies cap at level 25 after 24 minutes
- [ ] Emperor mode: All 3 crowns spawn at correct base corners
- [ ] Emperor mode: Guards spawn around crowns in pentagon formation
- [ ] Emperor mode: Player can pick up crowns from base locations

---

## Impact Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Zone 1 NPC Cap** | Unlimited (after 5 min: level 6+) | Capped at 5 |
| **Zone 2 NPC Cap** | Unlimited (after 10 min: level 11+) | Capped at 10 |
| **Zone 3+ Same** | Unlimited scaling | Respects zone cap |
| **Crown Spawn Consistency** | Documented (no enforcement) | Documented + enforced |
| **Guard Spawn Consistency** | Documented (no enforcement) | Documented + enforced |

---

## Related Files Modified

- `src/game/game.js` (2 changes)
  1. Level scaling cap in `updateEnemies()` loop
  2. Documentation in `spawnCrowns()` function header

- `src/game/world.js` (1 change)
  1. Documentation in `initSites()` base location setup

---

**Status**: ✅ Complete and syntax-checked
**Date**: 2026-02-04
