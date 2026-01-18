# Enemy AI Refactor Plan

## Objective
Make enemy AI mirror friendly AI behavior:
- Non-guard enemies → Same role-based priorities as non-guard friendlies
- Guard enemies → Same Phase 1 ball group system as guard friendlies

## Current State
- Enemy AI: ~3780 lines of custom logic (lines 4226-8006)
- Friendly AI: ~900 lines with clean role-based system (lines 3045-3945)
- Different decision names, different priorities, different guard behaviors

## Implementation Strategy

### Phase 1: Create Shared AI Functions
Extract friendly AI role logic into reusable functions that both friendlies and enemies can call.

**Functions to create:**
1. `getRoleBasedDecision(unit, state, near, nearCreature, closestObjective, wallTarget, role, AGGRO_RANGE)`
   - Returns: `{tx, ty, decision, targetInfo}`
   - Handles TANK, DPS, HEALER priorities
   
2. `getGuardAIDecision(unit, state, dt, isEnemy)`
   - Returns: `{tx, ty, decision, targetInfo}`
   - Uses Phase 1 ball group logic for both friendlies and enemies

### Phase 2: Refactor Friendly AI
Replace inline role logic with function calls (lines 3677-3850).

### Phase 3: Refactor Enemy AI  
Replace custom enemy AI logic with shared functions (lines 4226-8006).

### Phase 4: Testing
- Verify guards behave identically (both form ball groups)
- Verify non-guards have same priorities (tanks attack walls, DPS chase enemies, healers stay back)
- Check decision logging shows matching decision names

## Expected Outcomes
- Enemy guards form ball groups like friendly guards
- Enemy tanks prioritize walls/objectives like friendly tanks
- Enemy DPS chase targets aggressively
- Enemy healers stay with allies
- Consistent AI behavior across teams
- Reduced code duplication (~3000 lines saved)
