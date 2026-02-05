# Console Quick Reference

Copy-paste these. No assumptions. All self-contained.

---

## IMPORTANT: Finding Game State

The console scripts need access to `state`. Depending on your setup, it might be:

**Try these in console to find it:**

```javascript
// Check common names
console.log('state:', typeof state);
console.log('gameState:', typeof gameState);
console.log('window.state:', typeof window.state);
console.log('window.gameState:', typeof window.gameState);

// If not global, it might be in a module. Check if there's a way to access it:
// (This depends on how your game loads—might be window.game?.state, etc)
```

Once you find where state lives, use that in the scripts below. If state is at `window.state`, use `window.state`. If it's at `gameState`, use `gameState`.

---

## ⚠️ COORDINATE SCALE TEST (Run This First!)

**This finds the smoking gun: if flags and enemies are in different coordinate scales.**

Paste this:

```javascript
(() => {
  const enemies = window.state?.enemies || [];
  const lists = [
    ['state.flags', window.state?.flags],
    ['state.sites', window.state?.sites],
    ['state.world?.flags', window.state?.world?.flags],
    ['state.world?.sites', window.state?.world?.sites],
    ['state.guardSites', window.state?.guardSites],
  ].filter(([k,v]) => Array.isArray(v) && v.length && v[0] && v[0].x != null && v[0].y != null);

  const targets = lists[0]?.[1] || [];
  if (!enemies.length || !targets.length) {
    return { error: 'missing enemies/targets', enemies: enemies.length, targets: targets.length, lists };
  }

  const e = enemies[0];
  const t = targets[0];

  const dx = (e.x ?? 0) - (t.x ?? 0);
  const dy = (e.y ?? 0) - (t.y ?? 0);
  const dist = Math.hypot(dx, dy);

  const rx = (t.x ? (e.x / t.x) : null);
  const ry = (t.y ? (e.y / t.y) : null);

  console.log('=== COORDINATE SCALE TEST ===');
  console.log('Targets list found:', lists[0][0]);
  console.log('Enemy 0:', { x: +(e.x??0).toFixed(1), y: +(e.y??0).toFixed(1) });
  console.log('Target 0:', { x: +(t.x??0).toFixed(1), y: +(t.y??0).toFixed(1) });
  console.log('Distance:', +(dist.toFixed(1)));
  console.log('Ratio X (enemy/target):', rx ? +(rx.toFixed(2)) : 'N/A');
  console.log('Ratio Y (enemy/target):', ry ? +(ry.toFixed(2)) : 'N/A');
  
  if (dist > 2000) {
    console.warn('⚠️ SCALE MISMATCH DETECTED: Distance is huge!');
    if ((rx?.toFixed(1) === '4.0' || rx?.toFixed(1) === '4') || (ry?.toFixed(1) === '4.0' || ry?.toFixed(1) === '4')) {
      console.log('🔴 SMOKING GUN: ~4x scaling factor found (enemies 4x larger coords than targets)');
    }
  } else {
    console.log('✅ Coordinates look reasonable');
  }

  return { 
    targetsList: lists[0][0],
    distance: +(dist.toFixed(1)),
    ratioX: rx ? +(rx.toFixed(2)) : null,
    ratioY: ry ? +(ry.toFixed(2)) : null
  };
})();
```

**Screenshot the output. Report back:**
- `targetsList` (which structure had the coords)
- `ratioX` and `ratioY` (the scaling factor)
- `distance` (how far apart they are)

**If ratio is ~4.0**: Flags/sites are in tile units, enemies in pixel units. Needs normalization.

---

## PHASE 1: STAGE A (Discover Structure)

Paste this to see what you actually have:

```javascript
(() => {
  const s = window.state;  // ✅ Use window.state not state
  const enemies = s?.enemies || [];
  const candidates = {
    'state.flags': s?.flags,
    'state.sites': s?.sites,
    'state.world?.sites': s?.world?.sites,
    'state.world?.flags': s?.world?.flags,
    'state.emperor?.sites': s?.emperor?.sites,
    'state.emperor?.crowns': s?.emperor?.crowns,
    'state.guardSites': s?.guardSites
  };
  const found = Object.entries(candidates)
    .filter(([k,v]) => Array.isArray(v) && v.length)
    .map(([k,v]) => ({
      path: k,
      count: v.length,
      hasCoords: v[0]?.x !== undefined && v[0]?.y !== undefined
    }));
  console.log('=== STRUCTURE DISCOVERY ===');
  console.log('Enemies found:', enemies.length);
  console.table(found);
  return found;
})();
```

**Screenshot the output table.** Pick the structure that has coordinates.

---

## PHASE 1: STAGE B (Test Coordinates)

Paste this (using the structure you discovered above):

```javascript
(() => {
  const s = window.state;  // ✅ Use window.state not state
  const enemies = s?.enemies || [];
  const targets = s?.sites || s?.world?.sites || s?.flags || [];
  
  if (!enemies.length || !targets.length) {
    return { error: 'Missing data', enemiesLen: enemies.length, targetsLen: targets.length };
  }
  
  const e0 = enemies[0];
  const t0 = targets[0];
  
  function rangeStats(list) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const o of list) {
      const x = o?.x ?? 0, y = o?.y ?? 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX: +minX.toFixed(0), maxX: +maxX.toFixed(0), minY: +minY.toFixed(0), maxY: +maxY.toFixed(0) };
  }
  
  const dist = Math.hypot((t0?.x??0) - (e0?.x??0), (t0?.y??0) - (e0?.y??0));
  const eRange = rangeStats(enemies);
  const tRange = rangeStats(targets);
  
  console.log('=== COORDINATE TEST ===');
  console.log('Enemy 0:', { x: +(e0?.x??0).toFixed(1), y: +(e0?.y??0).toFixed(1) });
  console.log('Target 0:', { x: +(t0?.x??0).toFixed(1), y: +(t0?.y??0).toFixed(1) });
  console.log('Distance:', +(dist.toFixed(1)));
  console.table({ 'Enemies': { ...eRange, count: enemies.length }, 'Targets': { ...tRange, count: targets.length } });
  console.log('Verdict:', dist > 1000 ? '⚠️ MISMATCH' : dist < 10 ? '✅ SAME OBJECT' : '✅ REASONABLE');
  
  return { distance: +dist.toFixed(1), enemyRange: eRange, targetRange: tRange };
})();
```

**Screenshot the output.** This tells us if coordinates match.

---

## PHASE 2: ENABLE HP AUDIT

```javascript
enableHpAudit(window.state, true);
```

Play for 10 seconds, then check:

```javascript
getHpAuditReport(window.state);
```

Look for:
- `summary.phantomChanges > 0` → HP changes happened outside audit
- `summary.largeJumps[0].delta = 1808` → Found the mystery HP
- `summary.largeJumps[0].reason` → The code that caused it

---

## PHASE 3: ENABLE CROWN DEBUG

```javascript
enableCrownDebug(window.state, true);
```

Pick up crown, hold 5 seconds, drop it. Then check:

```javascript
getCrownDebugReport(window.state);
```

Look for:
- `summary.totalEvents > 4` → System is logging
- `summary.eventTypes` includes: PICKUP, CHASE, ABILITY, DROP
- If any missing → That's where it breaks

---

## DISABLE (When Done)

```javascript
enableHpAudit(window.state, false);
enableCrownDebug(window.state, false);
```

---

## EXPORT FULL DATA (For Analysis)

```javascript
// Get everything at once
const fullDiag = {
  hp: getHpAuditReport(window.state),
  crown: getCrownDebugReport(window.state)
};

// Copy to clipboard or console
JSON.stringify(fullDiag, null, 2);
```

---

## All Self-Initializing

- `enableHpAudit(window.state, true)` → Creates state._hpAudit if needed
- `enableCrownDebug(window.state, true)` → Creates state._crownDebug if needed
- No "undefined" crashes, no missing state errors

---

## Troubleshooting

### "window.state is undefined"
The game state wasn't initialized yet. Try:
- Wait a few seconds after page load (game initializes asynchronously)
- Check browser console for JS errors (might be blocking initialization)
- Reload the page

### "enableHpAudit is not defined"
The imports in game.js didn't load. Either:
- Reload the page (clear cache if needed: Ctrl+Shift+R)
- Check if there are any console errors preventing game.js from loading
- Verify game.js imports are correct (no syntax errors)

### "No state or data returned"
Either:
- State exists but no enemies/sites found (game not started)
- Start a game and try again
- Or targets/enemies might be in a different structure than expected (run the Coordinate Scale Test first)

---

## Next Steps

1. **Run Coordinate Scale Test first** (finds if flags are scaled differently)
2. **If ratio ~4x**: That's the smoking gun. We normalize site/flag coordinates.
3. **Then run Phase 1 Stage A & B** (discover structure, test range)
4. **Paste these three values back**:
   - `targetsList` (which structure had coords)
   - `ratioX`, `ratioY` (scaling factor)
   - `distance` (distance between enemy and target)
5. If distance is still huge after knowing the ratio, we know it's not just scale—it's something else.

Everything else flows from that.


