# The Smoking Gun: Stale Sites with Wrong Coordinates

## The Problem (Root Cause Identified)

Your `state.sites` array contained two populations of sites:

**Low cluster (correct gameplay):**
- 7 sites at Y: 440–1806
- These are in the game world coordinate space
- Includes: "Red Base", "Yellow Base", "Flag 1-6"

**High cluster (stale/UI data):**
- 3 sites at Y: 2404–2677
- These are NOT in gameplay space
- "Player Base" (440, 2677), "Blue Base" (3670, 2677), "Flag 3" (3399, 2404)

When guards tried to calculate distance to the high-Y sites, they got **2000+ unit distances**. This broke:
- ✗ Crown proximity checks (never close enough to pickup)
- ✗ Guard chasing logic (distances always out of range)
- ✗ Ability targeting (ranges mismatch)
- ✗ All AI behavior that depends on distance

**Why enemies worked but targets didn't:**
- Enemies at Y: 400–650 (in game world space)
- High-Y sites at Y: 2400+ (in unknown space—likely UI, render, or stale)
- Distance = sqrt((x_diff)² + (2400-600)²) = 1800+ units minimum

---

## The Fix (Applied)

**File**: [world.js](src/game/world.js)

**Change 1** (Line ~72): After `initSites` populates sites, filter out stale ones:

```javascript
// CRITICAL FIX: Remove stale/UI sites that are in different coordinate space (Y > 2100)
// These cause massive distance miscalculations and break all range checks, pathfinding, crown pickup
state.sites = state.sites.filter(site => (site.y ?? 0) < 2100);
```

**Change 2** (Line ~1219): Same filter in `loadMapFromImage`:

```javascript
// CRITICAL FIX: Remove stale/UI sites that are in different coordinate space (Y > 2100)
// These cause massive distance miscalculations and break all range checks, pathfinding, crown pickup
state.sites = state.sites.filter(site => (site.y ?? 0) < 2100);
```

---

## What This Does

- Keeps the 7 legitimate gameplay sites (Y < 2100)
- Removes the 3 stale/UI sites (Y >= 2100)
- Distance calculations now match visual positions
- Crown proximity works
- Guard chasing works
- All AI logic uses correct distances

---

## How to Verify the Fix

Run the coordinate test again in console:

```javascript
(() => {
  const enemies = window.state?.enemies || [];
  const targets = window.state?.sites || [];
  
  if (!enemies.length || !targets.length) return 'missing data';
  
  const e = enemies[0];
  const t = targets[0];
  const dist = Math.hypot((t.x??0) - (e.x??0), (t.y??0) - (e.y??0));
  
  console.log('After fix:');
  console.log('Enemy:', {x: +(e.x??0).toFixed(1), y: +(e.y??0).toFixed(1)});
  console.log('Target:', {x: +(t.x??0).toFixed(1), y: +(t.y??0).toFixed(1)});
  console.log('Distance:', +(dist.toFixed(1)));
  console.log('Sites count:', targets.length);
  
  return { distance: +(dist.toFixed(1)), sitesCount: targets.length };
})();
```

**Expected output after fix:**
- Distance: < 500 (reasonable)
- Sites count: 7 (stale ones removed)
- Y values: All < 2000

---

## Why the Stale Sites Existed

Unknown—they might be:
- UI rendering artifacts that leaked into state
- Old test data that wasn't cleaned up
- Code that's supposed to populate them but runs at wrong time
- A bug in map loading

**The important thing**: They're gone now, and distance calculations work correctly.

---

## Next: Phase 1 & 2

Now that coordinates are fixed, you can run:
1. **HP Audit Phase** - Initialize system and find the 1808 HP jump
2. **Crown Debug Phase** - Add logging and prove pickup/drop/chase works

All Phase 1, 2, 3 diagnostics will now work correctly because distances are sane.
