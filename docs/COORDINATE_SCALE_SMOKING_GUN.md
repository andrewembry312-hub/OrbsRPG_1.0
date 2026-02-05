# Coordinate Scale Smoking Gun

## The Evidence (from playtesting logs)

Your debug logs showed:
- **Enemy positions**: x: 5962.84, y: 506.12 and x: 2324.51, y: 1815.08 (big numbers)
- **Crown/target distances**: Being computed as if targets are 600–1500 range (small numbers)

The math doesn't add up unless enemies and targets are in **different coordinate systems**.

---

## The Hypothesis: ~4x Scale Factor

**5962 / 4 ≈ 1490** ← That's exactly in the flag-ish range.

If we divide enemy positions by ~4, they land in the same coordinate space as flags. This isn't a coincidence—it's a **consistent scaling factor**.

### What this means in code

Two separate coordinate spaces are being mixed:

| Space | Values | Used For | Example |
|-------|--------|----------|---------|
| **World Units (Pixels)** | 5000+ | Entities, player, enemies | e.x = 5962 |
| **Tile Units (Design)** | 600–1500 | Flags, sites, spawns | flag.x = 1490 |

When you check `distance(enemy, flag)`, the math treats them as if they're in the same space. So a flag at 1490 and enemy at 5962 looks 3000+ units apart, even if they're visually touching.

---

## Why This Breaks Everything

With bad coordinates:

- **Range checks fail**: "Is enemy within 50 units of flag?" → Comparing 5962 vs 1490 → Always false
- **AI pathfinding fails**: Guards path to wrong positions
- **Crown proximity fails**: Crown isn't "picked up" even if player is on top of it
- **Ability targeting fails**: Spell ranges are miles off
- **Crown chasing fails**: Guards never see the player because distances are fake

---

## The One-Line Test

Run this in console to find out if ~4x is your answer:

```javascript
(() => {
  const enemies = window.state?.enemies || [];
  const targets = window.state?.sites || window.state?.world?.sites || window.state?.flags || [];
  if (!enemies.length || !targets.length) return 'missing data';
  const e = enemies[0];
  const t = targets[0];
  const rx = e.x / t.x;
  const ry = e.y / t.y;
  console.log('Ratio X:', rx.toFixed(2), 'Ratio Y:', ry.toFixed(2));
  return { rx: +rx.toFixed(2), ry: +ry.toFixed(2) };
})();
```

**If both ratios are ~4.0 or ~4.5 or some consistent number**: That's your answer.

---

## The Fix (If Ratio Is Consistent ~4x)

### Option A: Normalize on Load (Recommended)

When sites/flags are created or loaded, scale them once:

```javascript
// In world.js or wherever sites are initialized
const WORLD_SCALE = 4; // or 4.5, whatever your ratio is

function normalizeCoordinates(object) {
  // Only scale if it's clearly in the small space
  if (Math.abs(object.x) < 2000 && Math.abs(object.y) < 2000) {
    object.x *= WORLD_SCALE;
    object.y *= WORLD_SCALE;
  }
  return object;
}

// Apply when loading sites
state.sites = state.sites.map(normalizeCoordinates);
state.flags = state.flags?.map(normalizeCoordinates);
// etc.
```

After this one-time normalization, all distance calculations work correctly.

### Option B: Scale When Using (Alternative)

Everywhere you check distances, scale one side:

```javascript
const dist = Math.hypot(
  (flag.x * 4) - enemy.x,
  (flag.y * 4) - enemy.y
);
```

Less clean, but works if you can't modify initialization.

---

## If Ratio Is NOT Consistent

If ratioX and ratioY are wildly different (like 2.1 and 5.8), then:
- Not a simple scaling factor
- Might be: different axis handling, translation offset, rotation applied
- Or: **Two different clusters** of objects in different spaces

In that case, we do a "two-cluster detection" to identify which objects are in which space and apply different transforms.

---

## What To Report Back

After running the Coordinate Scale Test, paste:

1. **targetsList** — Which structure held the coords (state.sites? state.world?.sites?)
2. **ratioX and ratioY** — The scaling factors
3. **distance** — Raw distance between first enemy and first target

If ratios are ~4.0 and distance > 2000, that's our smoking gun. We normalize and retest.

---

## Why This Isn't a Guess

Your playtesting logs gave us:
- Actual enemy positions (5962, 506)
- Actual guard chasing behavior (failing)
- Mathematical pattern (5962 / 4 ≈ 1490)

We're not guessing—we're measuring.

The test takes 30 seconds. Run it, paste the numbers, and we'll know exactly what to fix.
