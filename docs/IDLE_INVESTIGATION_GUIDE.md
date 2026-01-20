# AI Idle Behavior Investigation Guide

**Purpose:** Systematic approach to finding AI systems causing units to appear idle or frozen  
**Focus:** Speed bugs, state traps, pathfinding stalls, cooldown locks  
**Philosophy:** Improve systems while respecting design intent

---

## 🔍 What "Idle" Looks Like

### Visual Signs
- Unit standing still, not moving toward combat
- Unit facing target but not advancing
- Unit moving very slowly (speed = 0 or 30 instead of 110-140)
- Unit starts moving, then suddenly stops
- Unit attacking from wrong distance (too far away, range failing)

### From Log Analysis
- **ENEMY_ATTACK_OUT_OF_RANGE** events (units far from targets)
- **Zero damage** dealt by units (attacks never landing)
- **No movement logs** (target selected but no "moving to target")
- **No ability logs** (AI Behavior shows "cast-prio" but no abilities fire)

---

## 🎯 Speed Bug Investigation

### Where Speed Can Break

#### 1. **Speed Calculation Broken**
**Symptom:** Speed always 0 or stuck at one value  
**Search for:** 
```
speed = ...
unit.speed = ...
moveSpeed =
currentSpeed
```
**Common Bugs:**
- `speed = distance * 0.5` (should be `distance * 1.0` or time-based calculation)
- `speed = manaPool / 10` (unrelated calculation)
- `speed = 0` hardcoded somewhere
- Speed calculation inside loop that overwrites each frame

#### 2. **Speed State Mismatch**
**Symptom:** State says ACTIVE_DEFENSE but speed is 0  
**Check:**
```javascript
// BAD - speed never updated when state changes
if(guard.state === 'IDLE_DEFENSE') { guard.speed = 0; }
// Good state change but speed forgotten
guard.state = 'ACTIVE_DEFENSE';
// Speed stays 0! Should be:
guard.speed = 110;
```

#### 3. **Speed Overrides**
**Symptom:** Speed set to correct value, then overridden elsewhere  
**Search for:** Multiple locations setting `unit.speed =`  
**Common Patterns:**
- Speed set in update(), then overridden in render()
- Speed set by movement system, then reset by state machine
- Speed multiplied by factor (0.5, 0.25) causing slowdown

#### 4. **Speed Cap Bug**
**Symptom:** Speed capped incorrectly (e.g., capped at 30 instead of 140)  
**Check:**
```javascript
// BAD
unit.speed = Math.min(unit.speed, 30);  // Should be 140!

// BAD - using wrong variable
unit.speed = Math.min(unit.speed, maxFollowSpeed);  // = 30 instead of maxSprintSpeed

// GOOD
unit.speed = Math.min(unit.speed, 140);
```

#### 5. **Speed Precision Issues**
**Symptom:** Speed calculation returns float that gets truncated  
**Example:**
```javascript
// Might return 0.0001 which gets treated as 0
unit.speed = baseSpeed * deltaTime / elapsedTime;
```

### Speed Investigation Checklist
- [ ] Search codebase for all locations setting `speed =`
- [ ] Verify each speed assignment is correct
- [ ] Check if speed is being reset/overwritten multiple times
- [ ] Validate speed cap value (should be 140)
- [ ] Log speed changes with context
- [ ] Verify idle state gets speed = 0, active state gets speed >= 110

---

## 🔴 State Machine Traps

### The Problem
Units can get stuck in states that prevent action.

### State IDLE_DEFENSE Trap
```javascript
// GOOD - transitions to ACTIVE when threat detected
if(state === 'IDLE_DEFENSE' && threatDetected) {
    state = 'ACTIVE_DEFENSE';
    speed = 110;
}

// BAD - extra condition prevents transition
if(state === 'IDLE_DEFENSE' && threatDetected && someOtherCheck) {
    // If someOtherCheck = false, never leaves IDLE!
    state = 'ACTIVE_DEFENSE';
}
```

### State ACTIVE_DEFENSE Trap
```javascript
// GOOD - stays active while target exists
if(state === 'ACTIVE_DEFENSE' && targetExists) {
    speed = 110;
}

// BAD - extra conditions trap unit
if(state === 'ACTIVE_DEFENSE' && targetExists && distanceOK && manaOK) {
    speed = 110;
    // If any condition false, speed stays previous value!
}
```

### State Transition Checklist
- [ ] Each state has clear entry condition
- [ ] Each state has clear exit condition
- [ ] State transitions not blocked by contradictory conditions
- [ ] Speed updated when entering new state
- [ ] Speed not reset when exiting state (carry forward)
- [ ] Log every state transition with reason

---

## 🛑 Pathfinding Stalls

### The Root Problem
If `moveWithAvoidance()` fails or returns current position, unit doesn't move.

### Common Pathfinding Failures

#### Failure #1: Destination Unreachable
```javascript
// moveWithAvoidance() checks if destination reachable
let newPos = moveWithAvoidance(unit, targetPos, obstacles);
// If unreachable, returns current position unchanged
// Unit appears frozen!

// FIX: If position unchanged 2+ frames, move directly
if(newPos === unit.pos && attempts > 2) {
    unit.pos = moveDirect(unit, targetPos, unit.speed);
}
```

#### Failure #2: Obstacle Too Aggressive
```javascript
// Obstacles list includes areas that should be passable
// Angular sampling fails all 24 directions
// Unit can't find path

// CHECK: Is obstacle count too high? (>50 obstacles = slow)
// Are obstacles sized correctly?
// Are obstacle boundaries overlapping player/NPC positions?
```

#### Failure #3: Angular Sampling Incomplete
```javascript
// If angular sampling only tries 4 directions instead of 24
// Might miss valid paths
// LOG: "Trying [angle]° direction... blocked"
// Should show 24 attempts per frame
```

### Pathfinding Investigation Checklist
- [ ] Log every `moveWithAvoidance()` call with input/output
- [ ] Track if position changes each frame
- [ ] Count obstacles in scene
- [ ] Validate obstacle positions (not overlapping walkable areas)
- [ ] Add fallback: if stuck 2+ seconds, use direct path
- [ ] Log failed pathfinding attempts with angle details

---

## ⚠️ Targeting Stalls

### Problem: Target Never Found
```javascript
// BAD - if nearestEnemyTo returns null, unit idles
let target = nearestEnemyTo(unit);
unit.move(target.pos);  // ERROR: target is null, movement fails!

// GOOD - handle null case
let target = nearestEnemyTo(unit);
if(!target) {
    // No target found, move to default position
    target = defaultHoldPosition;
}
unit.move(target.pos);
```

### Problem: Distance Check Kills Engagement
```javascript
// BAD - distance check too strict
if(distance > 30 && distance < 280) {
    // Move to target
}
// If distance = 281, unit stops moving!

// GOOD - allow some buffer
if(distance < 300) {  // Allow 20-unit buffer
    // Move to target
}
```

### Problem: Retargeting Loop
```javascript
// BAD - constantly reconsidering targets
update() {
    let target = nearestEnemyTo(unit);
    if(target !== unit.target) {
        unit.target = target;  // Retarget every frame!
        unit.speed = 0;  // Interrupt movement
    }
}

// GOOD - commitment timer
update() {
    if(Date.now() - unit.targetChangeTime > 1500) {  // 1.5s commitment
        let newTarget = nearestEnemyTo(unit);
        if(newTarget !== unit.target) {
            unit.target = newTarget;
            unit.targetChangeTime = Date.now();
        }
    }
}
```

### Targeting Investigation Checklist
- [ ] Log all target selections with reasons
- [ ] Verify null targets handled
- [ ] Check distance calculation formula (correct units?)
- [ ] Validate distance thresholds (not too strict)
- [ ] Verify commitment timers (1.5s+ before retargeting)
- [ ] Log failed target acquisitions

---

## 🔒 Cooldown & Recovery Traps

### Problem: Cooldown Prevents All Action
```javascript
// BAD - unit frozen during entire cooldown
if(ability.cooldown > 0) {
    unit.speed = 0;  // Can't move while cooldown active!
}

// GOOD - cooldown only prevents ability, not movement
if(ability.cooldown > 0) {
    // Still move, just can't cast ability
}
```

### Problem: Recovery Lockout Too Long
```javascript
// BAD - 2-second lockout after casting
castAbility() {
    unit.recovery_lockout = 2000;  // 2 seconds!
    unit.speed = 0;  // Frozen for 2 seconds
}

// GOOD - 0.3-0.5s lockout
castAbility() {
    unit.recovery_lockout = 300;  // 0.3 seconds
    unit.speed = 110;  // Can still move during recovery
}
```

### Problem: Mana Check Blocking
```javascript
// BAD - if no mana, unit frozen
if(unit.mana < 50) {
    unit.speed = 0;  // Idle until mana regenerates!
}

// GOOD - low mana just prevents ability, not movement
if(unit.mana < 50) {
    // Unit continues moving, just can't cast
    // Melee attacks still work
}
```

### Cooldown Investigation Checklist
- [ ] Verify movement allowed during ability cooldown
- [ ] Check recovery lockout duration (0.3-0.5s max)
- [ ] Validate mana checks don't block movement
- [ ] Verify cooldown doesn't reset unexpectedly
- [ ] Log ability attempts with cooldown status
- [ ] Add timeout: if unit idle 3+ seconds, reduce cooldowns by 50%

---

## 📊 Logging Strategy

### Add These Logs to Spot Idle Bugs

#### 1. Speed Tracking
```javascript
// Every frame
console.log(`[${unit.name}] speed=${unit.speed}, state=${unit.state}, target=${unit.target?.name || 'none'}`);
```

#### 2. State Transitions
```javascript
// On state change
console.log(`[${unit.name}] STATE: ${oldState} → ${newState} (reason: ${reason})`);
```

#### 3. Movement Attempts
```javascript
// When requesting movement
console.log(`[${unit.name}] MOVE: from [${unit.x},${unit.y}] to [${targetX},${targetY}] at speed ${unit.speed}`);

// After movement
console.log(`[${unit.name}] MOVED: from [${unit.x},${unit.y}] to [${newX},${newY}] (distance=${dist})`);
```

#### 4. Target Selection
```javascript
// On target acquisition
console.log(`[${unit.name}] TARGET: found ${target.name} at distance ${dist}`);

// On null target
console.log(`[${unit.name}] TARGET: none found (checked ${checkCount} positions)`);
```

#### 5. Ability Casting
```javascript
// On ability attempt
console.log(`[${unit.name}] ABILITY: attempting ${ability.name} (cooldown=${cooldown}ms, mana=${unit.mana}/${unit.maxMana})`);

// On cast success/fail
console.log(`[${unit.name}] ABILITY: ${ability.name} ${success ? 'CAST' : 'FAILED'} (${reason})`);
```

---

## 🛠️ Enhancement Opportunities

### Design-Compliant Improvements

#### Improvement #1: Smoother Speed Transitions
**Current:** Speed jumps 0→30→60→110→140  
**Better:** Smooth transitions with same end result  
```javascript
// Instead of instant jumps
unit.speed = 110;

// Smooth transition
unit.targetSpeed = 110;
unit.speed = Math.min(unit.speed + 15, unit.targetSpeed);
```

#### Improvement #2: Faster State Transitions
**Current:** 0.75s return delay, 1.0s commitment timer  
**Consider:** Reduce to 0.5s for snappier response  
- Still prevents thrashing (prevents rapid retargeting)
- But feels more reactive

#### Improvement #3: Better Fallback Pathfinding
**Current:** If pathfinding fails, unit stuck  
**Better:** Fallback to direct movement if stuck >2s  
```javascript
if(unitStuck > 2000) {
    // Try direct path instead
    unit.move(directPath);
}
```

#### Improvement #4: Distance Buffer
**Current:** Exact range check (30 units)  
**Better:** Add 5-unit buffer  
```javascript
// Instead of
if(distance > 30) { fail }

// Try
if(distance > 35) { fail }  // 5-unit buffer
```

#### Improvement #5: AI Logging
**Current:** Only 32 AI events in 330s (logging gap)  
**Better:** Log all AI decisions  
```javascript
// Log every important decision
logAI(`${unit.name}: ${decision}`);
```

---

## 🎬 Investigation Workflow

### Step 1: Check Logs
1. Look for units with 0 damage dealt
2. Look for ENEMY_ATTACK_OUT_OF_RANGE events
3. Look for speed values in debug logs
4. Count AI events (should be 100+, not 32)

### Step 2: Identify Pattern
- **Pattern A:** Speed stuck at 0 → Speed bug
- **Pattern B:** Far from target but attacking → Pathfinding/targeting bug  
- **Pattern C:** Cast-prio but no ability logs → Cooldown/recovery trap
- **Pattern D:** State changes but no movement → State/speed mismatch

### Step 3: Search Code
- Find the section causing pattern
- Add logging to confirm hypothesis
- Implement fix

### Step 4: Test & Verify
- Run game with enhanced logging
- Check if units now behave correctly
- Verify damage dealt increases
- Verify ENEMY_ATTACK_OUT_OF_RANGE count decreases

---

## ✅ Verification Checklist

Before declaring fix complete:

- [ ] Speed values logged and reasonable (0, 30, 60, 110, 140)
- [ ] State transitions logged with reasons
- [ ] Movement commands succeed (position changes each frame)
- [ ] Targets found and committed to (not constantly switching)
- [ ] Abilities casting (ability logs appearing, not just cast-prio)
- [ ] Combat range checks passing (HITS not OUT_OF_RANGE)
- [ ] Enemy damage increased (most units dealing >0 damage)
- [ ] No silent failures (all important operations logged)

---

## 📝 Design Intent Preservation

### What NOT to Change
- ❌ Don't remove threat detection (aggro system design)
- ❌ Don't change basic speed values (design intent: 0/30/60/110/140)
- ❌ Don't remove commitment timers entirely (prevents thrashing)
- ❌ Don't break formation system (design intent: 5-guard formations)

### What IS OK to Change
- ✅ Fix bugs in speed calculation
- ✅ Optimize state transitions (faster response, same outcome)
- ✅ Add logging (no gameplay change)
- ✅ Add fallbacks for edge cases
- ✅ Increase commitment timeout slightly (0.75s → 0.5s)
- ✅ Add distance buffers (30u → 35u)
- ✅ Improve pathfinding algorithm (same result, better performance)

---

**Next Steps:** Use this guide to investigate each batch, focus on finding idle-causing bugs, and implement design-compliant fixes.

