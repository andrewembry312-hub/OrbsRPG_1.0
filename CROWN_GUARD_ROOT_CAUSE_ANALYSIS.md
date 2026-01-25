# CROWN GUARD SYSTEM - ROOT CAUSE ANALYSIS
## Why Guards Don't Work (5-Why Deep Dive)

---

## **CRITICAL DISCOVERY: TWO CONFLICTING MOVEMENT SYSTEMS**

### **The Problem**
Crown guards are leashed to base and never follow the crown when picked up by player, despite AI code explicitly setting chase targets.

### **The Root Cause**
There are **TWO completely separate guard movement systems** that are in direct conflict:

1. **System A: updateCrownGuardAI()** (Line 14375+)
   - Location: Called at line 11258 in updateGame()
   - What it does: Sets `guard.targetX`, `guard.targetY`, `guard.guardMode`, `guard.abilityRotation`
   - Status: Running correctly, sets proper chase targets
   - **PROBLEM**: These variables are IGNORED by the actual movement code

2. **System B: updateEnemies() GUARD AI** (Line 6657-7250)
   - Location: Called at line 11257 in updateGame(), runs BEFORE updateCrownGuardAI()
   - What it does: **ACTUALLY MOVES THE GUARDS** using `tx`, `ty`, `e.speed`
   - Status: Sets guard movement but doesn't know about crown guards
   - **PROBLEM**: This is the REAL system. Crown guards are subject to it.

### **Why It Fails: Variable Mismatch**

**updateCrownGuardAI() writes to:**
```javascript
guard.targetX = crownX;          // Line 14407
guard.targetY = crownY;          // Line 14408
```

**updateEnemies() guard AI reads from:**
```javascript
const slotX = spawnX + e._formationSlot.offsetX;  // Line 6891
const slotY = spawnY + e._formationSlot.offsetY;  // Line 6892
tx = slotX;  // Line 7165 (IDLE state)
ty = slotY;  // Line 7166
```

**And finally moves with:**
```javascript
moveWithAvoidance(e, tx, ty, state, dt, { slowFactor });  // Line 7186
```

**CRITICAL ISSUE**: The guard AI system in updateEnemies() computes its OWN tx/ty targets and **NEVER READS** the `guard.targetX/Y` that updateCrownGuardAI() sets!

---

## **The Architecture Conflict**

### **Guard AI State Machine (updateEnemies, lines 6962-7170)**

The guard system has a hardcoded 3-state machine:

1. **IDLE_DEFENSE**: Guards stay at formation slots
   ```javascript
   tx = slotX;  ty = slotY;  e.speed = 0;  // Line 7165-7166
   ```

2. **ACTIVE_DEFENSE**: Guards attack nearby targets (within LEASH_HARD_STOP = 350px)
   ```javascript
   tx = priorityTarget.x;  ty = priorityTarget.y;  // Line 7121
   e.speed = 130;
   ```

3. **RETURN_TO_POST**: Guards return after chasing too far
   ```javascript
   tx = slotX;  ty = slotY;  e.speed = 110;  // Line 7147-7149
   ```

### **The Guard AI Target Selection (lines 6966-7050)**

Guards only target what the system finds:
- Players/friendlies within LEASH_HARD_STOP range (350px of spawn)
- Within vision ranges: FLAG_RADIUS (50px), DEFENSE_ENTER (150px), AGGRO_RANGE (280px)

**Critical Constraint**: Line 7025 enforces this:
```javascript
if(distPlayerFromSpawn <= LEASH_HARD_STOP){
  // Only chase if player is within 350px of spawn
}
```

### **Why Crown Guards Can't Chase Crown Carrier**

When player picks up crown and runs away:
1. Player moves beyond 350px from spawn
2. Guard's target selection system (line 7000-7050) excludes player (too far)
3. `priorityTarget` becomes `null`
4. Guard state reverts to IDLE_DEFENSE or RETURN_TO_POST
5. Guard goes back to slot position
6. `updateCrownGuardAI()` frantically sets `guard.targetX = crownX`, but nobody reads it
7. **Guards never leave base**

---

## **5-Why Analysis**

### **Why #1: Guards don't follow crown**
→ The guard AI system in updateEnemies() doesn't know about crown position

### **Why #2: updateCrownGuardAI() can't tell guards where to go**
→ It sets `guard.targetX/Y` but the movement code reads `tx/ty` instead (different variables)

### **Why #3: Two systems don't communicate**
→ Architectural flaw: Different developers/systems created separate AI without integration

### **Why #4: The guard AI is hardcoded for base defense**
→ LEASH_HARD_STOP enforces 350px radius limit, regardless of crown position

### **Why #5: System design is siloed**
→ Guards have dedicated AI (optimized for defense), crown guards need dynamic AI (optimized for pursuit)
→ These conflicting requirements were never resolved during design

---

## **Why It Looks Like It Should Work**

**Line 14257 (spawnCrownGuards):**
```javascript
// Set properties that Crown AI can use
guard.crownFollowRange = 500;
guard.crownId = crownId;
guard.crownTeam = team;
guard.guardMode = 'protect';  // <-- This property exists!
guard.abilityRotation = 'rest';
```

**BUT THESE PROPERTIES ARE NEVER USED** in the actual movement code!

The guard AI system (updateEnemies) doesn't check `guard.crownFollowRange` or `guard.crownId`. It only checks:
- `e.guard` (boolean flag)
- `e.homeSiteId` (which base this guards)
- Local state: `e._guardState`, `e._committedTarget`, etc.

---

## **The Missing Integration Points**

To make crown guards work, updateEnemies() needs to:

1. **Check if guard has crown**
   ```javascript
   if(e.crownId && crown.carriedBy === 'player'){
     // Use crown position, NOT formation slot
     const crownPos = getCrownPosition(state, e.crownId);
     // Override state machine for PURSUIT mode
   }
   ```

2. **Skip LEASH_HARD_STOP for crown guardians**
   ```javascript
   const shouldSkipLeash = e.crownId && crown && crown.carriedBy === 'player';
   if(distPlayerFromSpawn <= LEASH_HARD_STOP || shouldSkipLeash){
     // Can chase
   }
   ```

3. **Use crown-specific state machine**
   ```javascript
   if(e.crownGuard && crown){
     // Different state machine for crown pursuit
     // PROTECT -> CHASE -> BURST -> RECOVER
     // Not constrained by LEASH_HARD_STOP
   }
   ```

---

## **Additional Issues Found**

### **Issue 2: No Crown Possession System**
Crown object has NO `carriedBy` property to track who carries it.

**Missing mechanics:**
- `crown.carriedBy = 'player'` when picked up
- `crown.carriedBy = null` when dropped
- Crown position always follows carrier: `crown.x = carrier.x`

### **Issue 3: No Crown Drop on Player Death**
When player dies, crown doesn't drop at death location.

**Missing code path:**
- Player death → Check if carrying crown
- If yes: Drop crown at player's death location
- Crown becomes pickupable again

### **Issue 4: No Crown Recovery by Guards**
When crown is dropped, priority-2 guards should pick it up and return it.

**Missing mechanics:**
- Detect dropped crown
- Route nearest priority-2 guard to crown
- Guard picks up crown (sets `crown.carriedBy = guard._id`)
- Guard carries crown back to base
- Crown secured (respawns at base)

### **Issue 5: No Minimap Crown Display**
Crown location not visible on minimap.

**Missing rendering:**
- Add crown circle to minimap at `crown.x, crown.y`
- Color by team: Red A, Blue B, Green C
- Show crown state: STATIC, CARRIED, RETURNING

### **Issue 6: No Player Feedback**
Player doesn't know crown was picked up, dropped, or returned.

**Missing UI:**
- On-screen message: "Crown A picked up!"
- On drop: "Crown A dropped at player death!"
- On recovery: "Crown A being returned..."
- On secure: "Crown A returned home!"

---

## **Code Locations**

| Issue | Location | Lines | Status |
|-------|----------|-------|--------|
| Guard AI conflict | `updateEnemies()` | 6657-7250 | ✗ BROKEN |
| Crown AI | `updateCrownGuardAI()` | 14375-14540 | ✓ OK (but ignored) |
| Crown spawning | `spawnCrowns()` | 14091-14128 | ⚠ Incomplete |
| Guard spawning | `spawnCrownGuards()` | 14245-14370 | ⚠ Incomplete |
| Guard placement | Line 7155-7172 | Setting `e.x, e.y` | ✗ Not using crown data |
| Movement execution | Line 7186 | `moveWithAvoidance()` | ✗ Using tx/ty not target X/Y |
| Minimap rendering | `render.js` ~1372 | `drawMiniMap()` | ✗ NO CROWN RENDERED |

---

## **Why Simple Fixes Fail**

**What we tried:**
1. ✓ Set `guard.crownFollowRange` - ignored by movement system
2. ✓ Set `guard.guardMode = 'chase'` - ignored by state machine
3. ✓ Set `guard.targetX/Y` - VARIABLES NOT READ BY MOVEMENT CODE
4. ✗ Added AI behavior to updateCrownGuardAI() - System doesn't use its output

**What's needed:**
- Integration of crown data INTO the actual guard movement system
- Skip leash checks for crown guards when crown is carried
- Crown possession mechanic
- Crown recovery mechanic
- Visual feedback systems

---

## **Solution Strategy**

### **Phase 1: Fix Guard Movement (CRITICAL)**
Modify `updateEnemies()` guard AI (lines 6657-7250):
1. Check if guard has `crownId` assigned
2. If crown carried by player: Override state machine
3. Skip LEASH_HARD_STOP check, use `crownFollowRange` instead
4. Set `tx = crownX`, `ty = crownY` for chase state
5. Don't reset to formation slot while chasing

### **Phase 2: Implement Crown Possession**
Add to crown object:
1. `carriedBy` property (null, 'player', or guard._id)
2. Position always follows carrier
3. Drop on carrier death at death location

### **Phase 3: Implement Guard Recovery**
For priority-2 guards:
1. Detect when crown.carriedBy === null (dropped)
2. Route nearest priority-2 guard to crown location
3. Guard picks up: `crown.carriedBy = guard._id`
4. Guard targets base: `crown` follows guard to base
5. On arrival: Crown secured, respawn at base

### **Phase 4: Visual Feedback**
1. Render crown on minimap
2. Add on-screen state messages
3. Show crown status (carried/dropped/returning)

---

## **Severity Assessment**

| Issue | Impact | Severity | Depends On |
|-------|--------|----------|-----------|
| Guard leashing | Guards never leave base | 🔴 CRITICAL | Must fix first |
| Crown possession | Can't track crown state | 🔴 CRITICAL | Blocks recovery |
| Crown drop | No recovery possible | 🔴 CRITICAL | Blocks recovery |
| Guard recovery | No self-healing mechanic | 🔴 CRITICAL | Blocks complete loop |
| Minimap | No player visibility | 🟡 HIGH | Cosmetic only |
| Indicators | Player doesn't know status | 🟡 HIGH | Cosmetic only |

---

## **Test Cases**

After fix, must verify:

1. **Guard Movement**
   - [ ] Player picks up crown
   - [ ] Nearest guard immediately chases (not constrained to 350px)
   - [ ] Guard chases even if crown beyond 350px from spawn
   - [ ] Other guards follow in burst rotation

2. **Crown Drop**
   - [ ] Player dies with crown
   - [ ] Crown drops at death location
   - [ ] Crown object rendered at correct position
   - [ ] Crown not carried by anyone

3. **Crown Recovery**
   - [ ] Priority-2 guard detects dropped crown
   - [ ] Guard routes to crown location
   - [ ] Guard picks up crown (crown.carriedBy = guard._id)
   - [ ] Crown follows guard to base
   - [ ] On base arrival: crown.carriedBy = null (secured)

4. **Visual Feedback**
   - [ ] Crown visible on minimap
   - [ ] On-screen messages appear
   - [ ] Crown state changes display correctly

---

## **Recommended Implementation Order**

1. **FIRST**: Fix guard leashing (updateEnemies modification)
2. **SECOND**: Implement crown possession system
3. **THIRD**: Implement crown drop on death
4. **FOURTH**: Implement guard pickup/return
5. **FIFTH**: Add minimap crown rendering
6. **SIXTH**: Add state indicator UI

Each must be tested individually before moving to next.

---

## **Design Intent vs Current State**

**Design Intent:**
- Crown guards are elite raid unit protecting valuable crown
- If crown leaves base, guards immediately pursue (like raid protects raid flag)
- Guards kill crown carrier, crown drops at death
- Other guards recover crown and return it home
- Full visibility: player sees crown on map, knows when guards retrieve it

**Current State:**
- Crown guards are frozen at base (leashed)
- Guards never leave 350px radius despite explicit chase code
- Crown position invisible to movement system
- No guard recovery mechanic
- Player has no feedback on crown status

**Gap**: 100% - System completely non-functional

---

**Generated**: Crisis Analysis Phase
**Status**: Root cause identified, solutions mapped, ready for implementation
