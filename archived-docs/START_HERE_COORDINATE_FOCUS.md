# Crown System Debug: The Smoking Gun (Coordinate Scale)

**TL;DR**: Your logs show the smoking gun—enemies at 5962, flags at ~1490. That's a **~4x scale mismatch**. Let's prove it in 30 seconds.

---

## What We Know (From Your Logs)

Your playtesting captured:
- Enemy positions: `x: 5962.84, y: 506.12`
- Flag distances being computed: as if flags are 600–1500 range
- Crown: Zero events despite fixes being in code

**Math doesn't add up.** 5962 / 4 ≈ 1490. Too perfect to be coincidence.

---

## Phase 0: The 30-Second Test

### 1. Start the game and load a level
### 2. Open browser console (F12 → Console)
### 3. Paste this ONE script:

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
    if ((rx && Math.abs(rx - 4.0) < 0.5) || (ry && Math.abs(ry - 4.0) < 0.5)) {
      console.log('🔴 SMOKING GUN: ~4x scaling factor found!');
    }
  } else if (dist < 500) {
    console.log('✅ Coordinates look reasonable (same space)');
  }

  return { 
    targetsList: lists[0][0],
    distance: +(dist.toFixed(1)),
    ratioX: rx ? +(rx.toFixed(2)) : null,
    ratioY: ry ? +(ry.toFixed(2)) : null
  };
})();
```

### 4. Screenshot the output

---

## What You'll See

### Scenario A: Ratio ~4.0, Distance > 2000

```
=== COORDINATE SCALE TEST ===
Targets list found: state.sites
Enemy 0: { x: 5962.8, y: 506.1 }
Target 0: { x: 1490.7, y: 126.5 }
Distance: 4478.9
Ratio X (enemy/target): 4.00
Ratio Y (enemy/target): 4.01

⚠️ SCALE MISMATCH DETECTED
🔴 SMOKING GUN: ~4x scaling factor found!
```

**This is it.** Enemies in pixel space, flags in tile space. 4x apart.

---

### Scenario B: Ratio Consistent But Different (e.g., 2.5, 6.0)

```
Ratio X: 2.50
Ratio Y: 6.00
Distance: 3842.1
```

**Not a simple scale factor.** Might be:
- Different coordinate systems entirely
- Rotation applied to one axis
- Or two separate object clusters

We'd need a different approach, but still fixable.

---

### Scenario C: Ratio Close to 1.0, Distance < 500

```
Ratio X: 1.02
Ratio Y: 0.98
Distance: 312.5
✅ Coordinates look reasonable
```

**No scale issue.** Coordinates are in the same space. Problem is elsewhere.

---

## If Ratio Is ~4.0: The Fix

Just one place needs normalization. [See COORDINATE_SCALE_SMOKING_GUN.md](COORDINATE_SCALE_SMOKING_GUN.md) for:
- Why this breaks everything
- Exactly where to add the fix
- One-line code change

---

## Next: Report Back

Paste these three values from your test output:

```
Targets list found: [your answer]
Distance: [your number]
Ratio X: [your number]
Ratio Y: [your number]
```

Once I see those, I'll tell you exactly what to fix.

**30 seconds to find the smoking gun.** Let's go.
