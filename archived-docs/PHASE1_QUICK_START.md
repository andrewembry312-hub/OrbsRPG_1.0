# PHASE 1: Structure Discovery + Coordinate Sanity Check

## FIRST: Discover What Actually Exists

Don't assume `state.flags` exists. Paste this first to see what you actually have:

```javascript
(() => {
  const enemies = state.enemies || [];
  
  // Check all possible locations for target lists
  const candidates = {
    'state.flags': state.flags,
    'state.world?.flags': state.world?.flags,
    'state.world?.sites': state.world?.sites,
    'state.sites': state.sites,
    'state.emperor?.sites': state.emperor?.sites,
    'state.emperor?.crowns': state.emperor?.crowns,
    'state.guardSites': state.guardSites
  };
  
  // Filter to only ones that exist and are arrays with content
  const found = Object.entries(candidates)
    .filter(([k, v]) => Array.isArray(v) && v.length)
    .map(([k, v]) => ({
      path: k,
      count: v.length,
      sample: {
        hasX: v[0]?.x !== undefined,
        hasY: v[0]?.y !== undefined,
        hasId: v[0]?.id !== undefined || v[0]?._id !== undefined,
        type: v[0]?.type || v[0]?.entityType || 'unknown',
        sampleX: (v[0]?.x ?? 'N/A'),
        sampleY: (v[0]?.y ?? 'N/A')
      }
    }));
  
  console.log('=== STRUCTURE DISCOVERY ===');
  console.log('Enemies found:', enemies.length);
  console.log('Potential target lists:');
  console.table(found);
  
  return { enemiesCount: enemies.length, foundLists: found };
})();
```

**What you'll see:**

```
Enemies found: 15

Potential target lists:
path                    count  sampleX   sampleY   hasX  hasY
─────────────────────────────────────────────────────
state.sites             7      719.38    820.56    true  true
state.world?.flags      7      715.12    825.44    true  true
state.emperor?.crowns   3      null      null      false false
```

**This tells you:**
- ✅ Which structure actually has coordinates
- ✅ How many objects in each
- ✅ A sample position to compare against your enemies

---

## SECOND: Run Coordinate Sanity Check (Using Discovered Structure)

Once you know which structure to use (probably `state.sites` or `state.world?.sites`), paste this:

```javascript
(() => {
  const enemies = state.enemies || [];
  const targets = state.sites || state.world?.sites || state.flags || [];  // Use your discovered path
  
  if (!enemies.length || !targets.length) {
    return { error: 'Missing enemies or targets', enemiesLen: enemies.length, targetsLen: targets.length };
  }
  
  const e0 = enemies[0];
  const t0 = targets[0];
  
  // Calculate distance
  const dET = Math.hypot((t0?.x??0) - (e0?.x??0), (t0?.y??0) - (e0?.y??0));
  
  // Calculate ranges
  function rangeStats(list) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const o of list) {
      const x = o?.x ?? 0, y = o?.y ?? 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX: +minX.toFixed(0), maxX: +maxX.toFixed(0), minY: +minY.toFixed(0), maxY: +maxY.toFixed(0) };
  }
  
  const enemyRange = rangeStats(enemies);
  const targetRange = rangeStats(targets);
  
  console.log('=== COORDINATE SANITY CHECK ===');
  console.log('Enemy 0:', { x: +(e0?.x??0).toFixed(1), y: +(e0?.y??0).toFixed(1) });
  console.log('Target 0:', { x: +(t0?.x??0).toFixed(1), y: +(t0?.y??0).toFixed(1) });
  console.log('Distance:', +(dET.toFixed(1)));
  console.log('');
  console.log('Ranges:');
  console.table({
    'Enemies': { ...enemyRange, count: enemies.length },
    'Targets': { ...targetRange, count: targets.length }
  });
  
  console.log('');
  if (dET > 1000) {
    console.warn('⚠️ MISMATCH DETECTED - Distance is', dET.toFixed(0));
    console.warn('Enemy X range:', enemyRange.minX, '-', enemyRange.maxX);
    console.warn('Target X range:', targetRange.minX, '-', targetRange.maxX);
    if (enemyRange.maxX > 3000 && targetRange.maxX < 1500) {
      console.warn('→ Enemies appear to be in larger space than targets');
    } else if (targetRange.maxX > 3000 && enemyRange.maxX < 1500) {
      console.warn('→ Targets appear to be in larger space than enemies');
    }
  } else if (dET < 10) {
    console.log('✅ Distance looks reasonable');
  } else {
    console.log('✅ Coordinates look reasonable');
  }
  
  return { distance: +dET.toFixed(1), enemyRange, targetRange };
})();
```

---

## What to Report Back

**Run both scripts and paste:**

1. The output table from the **Structure Discovery** script (the "Potential target lists" table)
2. The `distance` number from the **Coordinate Sanity Check**
3. The ranges table from the **Coordinate Sanity Check**

**Example of what you'd paste:**

```
=== STRUCTURE DISCOVERY ===
Found: state.sites (7 items), state.world?.sites (7 items)

Distance: 45.6

Ranges:
Enemies: minX 3800, maxX 4200
Targets: minX 700, maxX 1500
```

From that I can tell you exactly what's wrong and how to fix it.

---

## Why Two Scripts?

- **Script 1** answers: "What do I actually have in this codebase?"
- **Script 2** answers: "Are they in the same coordinate space?"

Together they prove whether the issue is:
- ✅ No mismatch (coordinates fine, move to Phase 2)
- ❌ Space mismatch (which space is wrong, here's the fix)
- ⚠️ Ambiguous (need more data points)

Run them in order. Report both outputs.

