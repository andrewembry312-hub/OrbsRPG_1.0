# Quick Cheat Sheet: Diagnostic Functions

## Copy-Paste Ready (Phase 1)

### Test Coordinate Space in Console

```javascript
// Paste this line-by-line or all at once into browser console while game running

// Test 1: Single point sanity check
debugCoordSanity(state)

// Test 2: Magnitude ranges
debugCoordRanges(state)

// Test 3: Quick snapshot (combines both)
coordinateDiagnosticSnapshot(state)
```

**What the output means:**

```
dEE = 0, dFF = 0  ← Good (same object to itself)
dEF = 50-500      ← Good (reasonable distance between units)
dEF = 3000+       ← BAD! Coordinate space mismatch
```

---

## Copy-Paste Ready (Phase 2)

### Hook HP Audit

**In game.js, find and replace this pattern:**

```javascript
// OLD - all over the codebase:
target.hp += 25;
target.hp -= 50;

// NEW - one import at top, then:
auditHeal(state, target, 25, { abilityId: 'heal_burst', sourceId: healer.id });
auditDamage(state, target, 50, { abilityId: 'meteor', sourceId: caster.id });
```

**Test from console:**

```javascript
state._hpAudit.enabled = true;
// Play for 10 seconds
getHpAuditLog(state)   // See all events
getHpAuditByEntity(state)  // See per-entity totals
```

---

## Copy-Paste Ready (Phase 3)

### Hook Crown Debug

**In game.js, add imports:**
```javascript
import { logCrownState, logGuardCrownChase, logGuardAbilityTarget, getCrownDebugLog } from './crown-debug.js';
```

**Add these 4 calls:**

| Location | What | Code |
|----------|------|------|
| Crown pickup | After `carriedBy = ...` | `logCrownState(state, 'PICKUP');` |
| Crown drop | After `carriedBy = null` | `logCrownState(state, 'DROP');` |
| Guard chase detection | Inside `if (crownCarriedByPlayer) { ... }` | `logGuardCrownChase(state, e, 'CHASE');` |
| Ability override | Inside forced target block | `logGuardAbilityTarget(state, u, target, bestD);` |

**Test from console:**

```javascript
state._crownDebug.enabled = true;
// Pick up crown, hold it for 5 seconds, drop it
getCrownDebugLog(state)
```

---

## What "Success" Looks Like

### Phase 1 Success
```
dEF: 45.6
verdict: "coordinates look reasonable"
```

### Phase 1 Failure
```
dEF: 3251.4
verdict: "MISMATCH DETECTED"
```

### Phase 2 Success
```
summary: {
  totalHeals: 1450,
  totalDamage: 2890,
  phantomChanges: 0,
  largeJumps: []
}
```

### Phase 2 Failure
```
largeJumps: [
  { id: 'player', delta: 1808, reason: 'SET', t: 45.234 }
]
```

### Phase 3 Success
```
summary: {
  stateChanges: 2,      // pickup + drop
  chaseEvents: 3,       // 3 guards detected chase
  abilityEvents: 8      // guards targeting forced target
}
```

### Phase 3 Failure
```
summary: {
  stateChanges: 2,
  chaseEvents: 0,       // ← No chase detected!
  abilityEvents: 0      // ← No abilities targeted forced target!
}
```

---

## The Nuclear Option (Everything at Once)

If you want to see everything immediately:

```javascript
// Turn on all systems
state._hpAudit.enabled = true;
state._crownDebug.enabled = true;

// Play for 30 seconds

// Get all data
const fullDiag = {
  coords: debugCoordRanges(state),
  hp: getHpAuditLog(state),
  crown: getCrownDebugLog(state)
};

// Export to file or paste
JSON.stringify(fullDiag, null, 2);
```

---

## Troubleshooting

### Functions not found?
Make sure you imported them at the top of game.js:
```javascript
import { debugCoordSanity, debugCoordRanges } from './coordinate-sanity.js';
import { auditHpDelta, auditHeal, auditDamage, getHpAuditLog } from './hp-audit.js';
import { logCrownState, getCrownDebugLog } from './crown-debug.js';
```

### Getting `undefined`?
The modules might not be loaded yet. Try:
```javascript
console.log(typeof debugCoordSanity);  // Should be 'function'
```

### Console is spammy?
Reduce sample rate:
```javascript
state._crownDebug.sampleRate = 1.0;  // Only log once per second
state._hpAudit.max = 100;            // Keep only last 100 events
```

---

## Next Steps After Phase 1

1. Run coordinate diagnostic
2. Screenshot/paste the output in the chat
3. Tell me: "dEF is X, ranges are Y–Z"
4. I'll tell you exactly which pipeline is wrong and what to fix

Once coordinates are proven correct, Phase 2 and 3 will show you if HP and crown systems are working.

