# 📚 Documentation & Project Start

## 📋 Documentation Structure

⚠️ **Documentation Reorganized (Jan 25, 2026)**: All docs moved to `/docs/` folder, session-specific docs archived to `/docs/archived-docs/`.

**Core Reference Docs** (in `/docs/`):
- [CROWN_GUARDS_QUICK_START.md](docs/CROWN_GUARDS_QUICK_START.md) - Crown Guard system overview
- [CROWN_GUARD_SYSTEM_COMPLETE.md](docs/CROWN_GUARD_SYSTEM_COMPLETE.md) - Complete system reference
- [CROWN_GUARD_CODE_REFERENCE.md](docs/CROWN_GUARD_CODE_REFERENCE.md) - Code locations
- [CROWN_GUARD_ARCHITECTURE_DIAGRAMS.md](docs/CROWN_GUARD_ARCHITECTURE_DIAGRAMS.md) - Architecture
- [CROWN_DEBUG_LOGGING_DESIGN.md](docs/CROWN_DEBUG_LOGGING_DESIGN.md) - Debug strategy
- [SNEAKY_BUGS_ROOT_CAUSE_ANALYSIS.md](docs/SNEAKY_BUGS_ROOT_CAUSE_ANALYSIS.md) - Known issues
- [EMPEROR_MODE_SESSION4_COMPLETE.md](docs/EMPEROR_MODE_SESSION4_COMPLETE.md) - Emperor Mode

See [docs/ARCHIVED_DOCS_README.md](docs/ARCHIVED_DOCS_README.md) for what's been archived and why.

---

# READY TO EXECUTE: Bulletproof Plan (Assumptions Eliminated)

## Status Update

Your concerns were 100% valid. The original plan had dangerous assumptions:
- ❌ Assumed `state.flags` exists (might be `state.sites` or elsewhere)
- ❌ Assumed function names matched (needed to verify)
- ❌ Assumed toggles auto-initialize (they don't—would crash)
- ❌ Assumed HP changes only happen at obvious places (they scatter)

**All fixed.** The new plan discovers what's actually there before testing.

---

## Files Created/Updated

✅ **game.js** - Imports updated to ALL actual exported functions
✅ **hp-audit.js** - Added `enableHpAudit()` toggle (self-initializing)
✅ **crown-debug.js** - Added `enableCrownDebug()` toggle (self-initializing)

✅ **PHASE1_QUICK_START.md** - Two-stage discovery:
  - Stage 1: Discover what structures actually exist
  - Stage 2: Test coordinates using the discovered structure

✅ **BULLETPROOF_INTEGRATION_GUIDE.md** - Exact locations + verification checklist

✅ **BULLETPROOF_PLAN_SUMMARY.md** - Overview of all fixes to assumptions

---

## Next Action (Right Now)

Open your game, load a level, then paste this into console:

```javascript
// STAGE 1: DISCOVER WHAT ACTUALLY EXISTS
(() => {
  const enemies = state.enemies || [];
  const candidates = {
    'state.flags': state.flags,
    'state.sites': state.sites,
    'state.world?.sites': state.world?.sites,
    'state.world?.flags': state.world?.flags,
    'state.emperor?.sites': state.emperor?.sites,
    'state.emperor?.crowns': state.emperor?.crowns
  };
  const found = Object.entries(candidates)
    .filter(([k,v]) => Array.isArray(v) && v.length)
    .map(([k,v]) => ({ path: k, count: v.length }));
  console.log('=== FOUND ===');
  console.table(found);
  return found;
})();
```

**Screenshot the table.** It tells you which structure to use.

Then run Stage 2 from **PHASE1_QUICK_START.md** (the distance check using your discovered structure).

---

## What You'll Know After This

- ✅ Which structure actually holds your targets (flags, sites, etc)
- ✅ Are coordinates in the same space or different?
- ✅ If different, which one is wrong?

Then I can tell you the exact fix.

---

## Why This Plan is Different

| Old Plan | New Plan |
|----------|----------|
| Assumes `state.flags` | Script discovers what you actually have |
| I claim "verified" | You run test and see output yourself |
| Toggles might crash | `enableHpAudit()` self-initializes |
| Hard to find phantom HP | `detectUntrackedHpChange()` guard catches it |

---

## All Documentation

- **BULLETPROOF_PLAN_SUMMARY.md** ← Read this first (overview)
- **PHASE1_QUICK_START.md** ← Run these two scripts
- **BULLETPROOF_INTEGRATION_GUIDE.md** ← Reference once Phase 1 is done

---

## Next Step

Run the Stage 1 discovery script above. Screenshot the table. Paste it here.

That one data point unblocks everything else.

