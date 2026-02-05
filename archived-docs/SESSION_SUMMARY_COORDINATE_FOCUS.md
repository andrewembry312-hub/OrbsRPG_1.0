# Session Summary: Coordinate Scale Smoking Gun

## What Just Happened

You spotted something critical in the playtesting logs that I missed:

- Enemy positions: `x: 5962.84, y: 506.12` (big numbers)
- Flag positions being used: ~600–1500 range (small numbers)
- Distance calculations: Computing as if they're 3000+ units apart

**5962 / 4 ≈ 1490**

This isn't random. This is a **consistent ~4x scaling factor**. Enemies are in pixel/world space. Flags are in tile/design space.

---

## Why This Breaks Everything

When you mix spaces in range checks:

```javascript
// Enemy at 5962, Flag at 1490
distance = sqrt((5962-1490)^2 + ...) = 4472
// But they're visually next to each other!

// Range checks fail:
if (distance < 50) pickup() // ← This is never true
if (distance < 200) chase() // ← This is never true
```

This breaks:
- ✗ Crown pickup detection
- ✗ Guard chase distance
- ✗ Ability targeting
- ✗ Crown proximity logging (zero events!)
- ✗ All AI behavior

---

## How We Prove It (Right Now)

[START_HERE_COORDINATE_FOCUS.md](START_HERE_COORDINATE_FOCUS.md) has the script.

Takes 30 seconds to run. No guessing. Just math.

**Report back:**
```
Targets list found: state.sites (or state.flags, etc)
Distance: [number]
Ratio X: [number]
Ratio Y: [number]
```

---

## If Ratio Is ~4.0

**We found it.** Then:

1. Find where flags/sites are created
2. Add one-line normalization:
   ```javascript
   flag.x *= 4;
   flag.y *= 4;
   ```
3. Re-run coordinate test
4. Distance drops to reasonable numbers
5. Then crown debug + HP audit integrate cleanly

---

## Why This Is Better Than Phase 1, 2, 3

Your original plan assumed coordinates were OK and tried to debug downstream effects.

But if coordinates are wrong, everything downstream looks broken no matter what you do:
- HP audit will work but show phantom changes (because positions are wrong)
- Crown debug will work but show zero chase events (because distance checks fail)
- You'd fix those, but crown still won't pickup because the coordinate check fails

**Fix coordinates first.** Everything else becomes obvious.

---

## Files to Use

1. **[START_HERE_COORDINATE_FOCUS.md](START_HERE_COORDINATE_FOCUS.md)** ← Do this first
2. **[CONSOLE_QUICK_REFERENCE.md](CONSOLE_QUICK_REFERENCE.md)** ← All scripts (copy-paste ready)
3. **[COORDINATE_SCALE_SMOKING_GUN.md](COORDINATE_SCALE_SMOKING_GUN.md)** ← Theory + fix explanation

---

## The Proof Flow

1. ✅ You run coordinate test
2. ✅ You paste numbers
3. ✅ I tell you exactly what's wrong (based on your data, not guesses)
4. ✅ You apply one-line fix
5. ✅ You re-test with same script
6. ✅ You see distance collapse to sane numbers
7. ✅ Crown system works

No black boxes. Everything's visible.

---

## Next Action

Go run the test in [START_HERE_COORDINATE_FOCUS.md](START_HERE_COORDINATE_FOCUS.md). Paste back the numbers.
