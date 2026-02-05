# Immediate Fixes: Import Error + State Access

## Error 1: `auditHpDelta is not exported`

**✅ Already Fixed** in game.js line 15:

```javascript
import { 
  initHpAuditSystem, 
  auditHpChange,        // ✅ Correct (was auditHpDelta)
  auditHeal, 
  auditDamage, 
  auditSetHp, 
  getHpAuditReport,     // ✅ Correct (was getHpAuditLog)
  clearHpAuditLog, 
  enableHpAudit, 
  detectUntrackedHpChange 
} from "./hp-audit.js";
```

**If you're still seeing the import error:**
1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Restart the dev server if you're running one

The imports match the actual exports from hp-audit.js exactly.

---

## Error 2: `state is not defined` in console

**✅ Already Fixed** - State is exposed as `window.state` in main.js line 23.

### How to Access state in Console

Use **`window.state`** (not just `state`):

```javascript
window.state.enemies?.length   // ✅ This will work
window.state.sites?.length     // ✅ This will work
```

### Why the Error Happened

Console scripts need the full path because they run in a different scope than the module that created `state`. The code says `window.state = state;` so you must use `window.` prefix.

---

## Phase 1 Stage A Discovery (Fixed)

Now you can run this in console:

```javascript
(() => {
  const s = window.state;  // ✅ Use window.state not state
  const enemies = s.enemies || [];
  const candidates = {
    'sites': s.sites,
    'world?.sites': s.world?.sites,
    'emperor?.crowns': s.emperor?.crowns,
    'emperor?.flags': s.emperor?.flags,
    'teams': s.teams
  };
  const found = Object.entries(candidates)
    .filter(([k,v]) => Array.isArray(v) && v.length)
    .map(([k,v]) => ({ path: k, count: v.length }));
  console.table(found);
})();
```

### Quick Verification

Run this first to confirm state is accessible:

```javascript
window.state?.player?.pos      // Should show a coordinate object
window.state?.enemies?.length  // Should show a number
window.state?.sites?.length    // Should show a number
```

If all three return values (not undefined), state is accessible and diagnostics can run.

---

## Next: Run Phase 1 Stage A

Report back what `console.table(found)` shows. It will tell us the exact structure names we need for Phase 1 Stage B.

