# Crown Guard System - Design Review & Critique Response

## Part 1: The Performance Issue (Distance Checks Every Frame)

### WHERE IT HAPPENS (Lines 14375-14490 in game.js)

**The Expensive Loop:**

```javascript
// EVERY FRAME, for each team, for each guard:
for (const team of teams) {  // 3 iterations
  const allTeamGuards = guardIds.map(gid => state.enemies.find(e => e._id === gid))
                                 .filter(g => g && g.hp > 0);  // Linear search per team!
  
  for (const guard of allTeamGuards) {  // 5 iterations per team
    // LINE 14401: First expensive calc
    const distToCrown = Math.hypot(guard.x - crownX, guard.y - crownY);
    
    // LINE 14421-23: Filter all enemies by distance (EXPENSIVE)
    const nearbyEnemies = state.enemies.filter(e => {
      if (e._id === guard._id || e.team === team || e.hp <= 0) return false;
      // LINE 14423: This is sqrt calc per enemy per guard per frame!
      return Math.hypot(e.x - crownX, e.y - crownY) < 250;
    });
    
    // LINE 14456: Another distance calc
    const playerDist = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
    
    // LINE 14464: Filter all guards by HP (runs per guard!)
    const hurtGuards = allTeamGuards.filter(g => g.hp < g.maxHp * 0.5);
  }
}
```

**The Problem:**
- **3 teams × 5 guards × 60 FPS = 900 iterations/second**
- Each iteration runs 2-4 distance calculations
- + Array filters on ALL enemies (could be 50+)
- + Finding guards by ID via linear search
- **Total: ~2000-3000 expensive math ops per second**

### The Specific Bottlenecks (Lines 14401, 14423, 14456, 14464)

| Line | Operation | Cost | Frequency |
|------|-----------|------|-----------|
| 14401 | `Math.hypot(guard.x - crownX, ...)` | 1 sqrt | 15× per frame |
| 14423 | `Math.hypot(e.x - crownX, ...)` for 50 enemies | 50 sqrt | 15× per frame |
| 14456 | `Math.hypot(guard.x - player.x, ...)` | 1 sqrt | 15× per frame |
| 14464 | `.filter(g => g.hp < ...)` on 5 guards | Array ops | 30× per frame |
| 14383 | `.find(e => e._id === guardId)` per guard | Linear O(n) | 15× per frame |

**Total Per Frame: ~2500 operations for just 15 guards**

---

## Part 2: Your Design Critique - Response & Fixes

### Issue #1: "15 Guards Chasing" - Wording Confusion ✅

**You're Right:** The doc says "all 15 guards of that team" but there are only 5 per crown.

**What Actually Happens:**
- 3 crowns (teamA, teamB, teamC)
- Each crown has 5 guards (3 DPS + 2 Healer)
- Total = 15 guards across all teams
- **When you pick up teamA crown: ONLY 5 guards chase (teamA's 5)**
- The other 10 (teamB + teamC) stay put

**Fix:**
```javascript
// This is CORRECT behavior - only the crown's team chases
if (crown.carriedBy === 'player') {  // Line 14446
  guard.guardMode = 'chase';
  guard.targetX = crownX;  // Tracks player via crown.x/y
}
// Other teams never enter this state unless their crown is picked up
```

**Wording to Fix:**
OLD: "All 15 guards of that team should chase you"
NEW: "All 5 guards of that crown's team chase you. Other teams ignore you."

---

### Issue #2: Burst Damage Math - 405 Damage / 10s ✅✅

**You're Absolutely Right - This Is Unfair**

Current math:
- 3 DPS × Fireball Volley (3×45) = 135 damage per DPS
- 3 DPS = 405 total damage in ~3 seconds
- Happens every 10 seconds
- **Player has 200-300 HP**
- **This is 1.3x-2x the player's health in burst damage**

**Example:** Player with 250 HP:
```
t=0s:  Healthy (250 HP)
t=2s:  Takes 405 burst damage
t=3s:  Dead (-155 HP)
```

### Your Suggestions (Which Are Good):

#### Option A: Stagger Bursts ✅ BEST
```javascript
// Instead of all 3 DPS bursting at t=0,2,3:
// Stagger them across the 10-second window

DPS Guard 1: Bursts at t=0.0s
DPS Guard 2: Bursts at t=0.6s  
DPS Guard 3: Bursts at t=1.2s
Next cycle:  t=10.0s

// Result: 135 dmg → 135 dmg (0.6s later) → 135 dmg (1.2s later)
// Instead of: 405 damage in 1 frame
// Still totals 405/10s but spread across 1.2 seconds = DODGEABLE
```

**Code Change Required:**
```javascript
// In spawnCrownGuards(), add stagger index:
guard.burstStaggerOffset = (i % 3) * 0.6;  // DPS only

// In updateCrownGuardAI():
if (time % 10 >= loadout.burst.cooldown + guard.burstStaggerOffset) {
  // This guard's burst window
}
```

#### Option B: Make Volley Avoidable
- Add 0.4s windup animation
- Projectile speed (not instant hit)
- Narrow targeting (not point-blank)
- Player can move, block, or kite

#### Option C: Reduce Per-Hit Damage
- Instead of 3×45 = 135
- Use 3×30 = 90 per DPS
- Reduces burst from 405 → 270 (still significant, not instant-delete)

---

### Issue #3: No Leashing Breaks Map Pacing ✅✅✅

**You're Right - This Is a Real Problem**

Current code (lines 14476-14477):
```javascript
guard.spawnTargetSiteId = null;  // NO LEASHING
guard.homeSiteId = null;         // NO RESTRICTIONS
```

**What Happens:**
1. Pick up crown at teamA base
2. 5 guards chase you through choke points
3. You run to objectives
4. Guards swarm through (not respecting map flow)
5. You get trapped by guards + environmental pressure
6. Whole map becomes "never stop running"

### Better Compromise: Crown-Based Reset ✅

```javascript
// Add crown "abandoned state"
crown.lastTouchedTime = 0;
crown.dropTimeout = 6;  // 6 seconds to reset

// In updateCrownGuardAI():
if (crown.carriedBy === null) {
  // Crown is on the ground
  if (state.gameTime - crown.lastTouchedTime > crown.dropTimeout) {
    // Crown untouched for 6 seconds
    crown.abandoned = true;
    
    // Guards return to protection mode
    for (const guard of allTeamGuards) {
      guard.guardMode = 'protect';
      guard.abilityRotation = 'rest';
      guard.burstCooldown = 0;  // Reset cooldowns
      // Return to formation around crown
    }
  }
}
```

**Benefits:**
- Rewards dropping crown to reset guard pressure
- Prevents "guards follow you forever" problem
- Gives moment of relief to regroup
- Makes decisions matter (hold or drop?)

---

### Issue #4: Healing Balance - Immortal vs Useless ✅

**You're Right - This Is a Design Trap**

Current code (line 14464):
```javascript
const hurtGuards = allTeamGuards.filter(g => g.hp < g.maxHp * 0.5);

if (hurtGuards.length > 0 && guard.mana >= 90 && guard.burstCooldown <= 0) {
  // BURST HEAL - heals 60 HP to all 5 guards
}
```

**The Problem:**
- 2 healers, 5 guards total
- Each healer: 60 HP burst heal every 12 seconds = 120 HP total per cycle
- If guards have 220 HP and take 135 burst from DPS, healing might outheal
- OR healers are dead before burst goes off, and they do nothing

### Better: Healers Are Support, Not Solution ✅

```javascript
// Healers should:
// 1. Keep allies ALIVE, not healthy
// 2. Get punished for bad positioning
// 3. Enable DPS to stay in fight, not prevent damage entirely

// NEW HEALER LOGIC:
if (priority === 2) {  // HEALER
  // Only heal if ally would die (< 25% HP)
  const dyingGuards = allTeamGuards.filter(g => g.hp < g.maxHp * 0.25);
  
  if (dyingGuards.length > 0) {
    guard.abilityRotation = 'burst';  // Triage heal
    guard.mana -= loadout.burst.manaRequired;
    guard.burstCooldown = loadout.burst.cooldown;
    // Heal applied in damage system
  }
  
  // Healer positioning matters:
  // If healer > 300px from guards, healing effectiveness = 50%
  for (const ally of allTeamGuards) {
    const dist = Math.hypot(ally.x - guard.x, ally.y - guard.y);
    if (dist > 300) {
      ally.incomingHealing *= 0.5;  // Distant healing is weak
    }
  }
}
```

**Counter-Play for Player:**
- Kill the healer first (focus fire)
- Separate guards from healer (CC, knockback)
- Out-damage healing (DPS check)

---

### Issue #5: Performance Risk - 15 AI Units ✅

**You're Right - This Adds Up**

See Part 1 above. The fixes:

#### Fix A: Optimized Distance Checks
```javascript
// REPLACE sqrt with squared distance
const distToCrownSquared = (guard.x - crownX) ** 2 + (guard.y - crownY) ** 2;
const burstRangeSquared = 350 * 350;

if (distToCrownSquared < burstRangeSquared) {  // No sqrt!
  // In burst range
}

// For comparisons, compare squared values
if (distToCrownSquared < 250 * 250) { ... }
```

#### Fix B: Throttle Expensive Logic
```javascript
// Decision logic only every 200ms, not every frame (60fps = 16.6ms)
guard.lastDecisionTime ??= 0;
const timeSinceLastDecision = state.gameTime - guard.lastDecisionTime;

if (timeSinceLastDecision > 0.2) {  // Every 200ms
  // Run expensive filters, distance calcs
  const nearbyEnemies = state.enemies.filter(e => {
    return Math.hypot(e.x - crownX, e.y - crownY) < 250;
  });
  
  guard.cachedNearbyEnemies = nearbyEnemies;
  guard.lastDecisionTime = state.gameTime;
} else {
  // Use cached result from 200ms ago
  const nearbyEnemies = guard.cachedNearbyEnemies || [];
}

// Movement still updates every frame (smooth)
// targetX/Y is set every 200ms, but movement is interpolated every frame
```

#### Fix C: Pre-cache Guard Lists
```javascript
// Instead of finding guards by ID every frame:
// Pre-build team roster at spawn

state.emperor.teamRosters = {
  teamA: {
    all: [guard1, guard2, guard3, guard4, guard5],
    dps: [guard1, guard2, guard3],
    healers: [guard4, guard5]
  },
  // ... teamB, teamC
};

// Then instead of:
const allTeamGuards = guardIds.map(gid => state.enemies.find(...))

// Use:
const allTeamGuards = state.emperor.teamRosters[team].all;
```

---

### Issue #6: Image Rendering Glitches ✅

**The Code (render.js, lines 802-820):**

```javascript
// For crown guards with fighter card images, draw image overlay
if(e.crownGuard && e.imgPath){
  const img = loadCachedImage(state, e.imgPath);
  if(img){
    // Fit fighter card image inside the orb
    const iconSize = orbRadius * 1.8;
    ctx.save();
    ctx.globalAlpha = 1;
    // Draw circular clipping mask for image
    ctx.beginPath();
    ctx.arc(e.x, e.y, orbRadius, 0, Math.PI * 2);
    ctx.clip();
    
    // Draw image centered at orb
    ctx.drawImage(
      img,
      e.x - iconSize/2,
      e.y - iconSize/2,
      iconSize,
      iconSize
    );
    ctx.restore();
  }
}
```

**Common Issues:**
1. **Image not loaded** → Guard renders blank
2. **Path casing** → `Ember.png` vs `ember.png`
3. **Drawing order** → Orb draws AFTER image, covers it
4. **Scale issues** → iconSize calculation wrong

**Fix: Preload Images at Spawn**

```javascript
function spawnCrownGuards(state, base, team){
  // ... existing code ...
  
  // PRELOAD both images before spawning guards
  const imagePaths = [
    'assets/fighter player cards/Ember the Pyromancer.png',
    'assets/fighter player cards/Father Benedict.png'
  ];
  
  for (const path of imagePaths) {
    loadCachedImage(state, path);  // Preload into cache
  }
  
  // NOW spawn guards - images will be ready
  for(let i = 0; i < 5; i++){
    // ... guard creation ...
  }
}
```

---

## Part 3: Your Specific Suggestions - Implementation

### Suggestion #1: Stagger DPS Burst ✅

**Would Fix:** 405 → 135 + 135 + 135 (over 1.2s) = dodgeable

```javascript
// In spawnCrownGuards(), line ~14290:
guard.burstStaggerIndex = i % 3;  // 0, 1, 2 for DPS guards

// In updateCrownGuardAI(), line ~14475:
if (guard.loadoutType === 'dps') {
  const staggerDelay = guard.burstStaggerIndex * 0.6;
  const timeSinceBurstStart = state.gameTime % 10;
  
  if (timeSinceBurstStart >= staggerDelay && 
      timeSinceBurstStart < staggerDelay + 0.3 &&  // 300ms burst window
      guard.burstCooldown <= 0) {
    // This DPS's burst time
    guard.abilityRotation = 'burst';
    guard.mana -= loadout.burst.manaRequired;
    guard.burstCooldown = loadout.burst.cooldown;
  }
}
```

### Suggestion #2: Crown-Based Reset ✅

**Would Fix:** "Wherever you go, guards follow forever"

```javascript
// In spawnCrowns(), line 14093:
crown.lastTouchedTime = state.gameTime;
crown.resetTimeout = 6;  // 6 seconds

// In tryPickupCrowns(), when player picks up:
if(dist <= 150){
  crown.carriedBy = 'player';
  crown.lastTouchedTime = state.gameTime;  // Reset timer
}

// In updateCrownGuardAI(), new check:
if (crown.carriedBy === null) {
  const timeSinceDrop = state.gameTime - crown.lastTouchedTime;
  if (timeSinceDrop > crown.resetTimeout) {
    // Guards return to formation
    for (const guard of allTeamGuards) {
      guard.guardMode = 'protect';
      guard.abilityRotation = 'rest';
      guard.targetX = crownX;
      guard.targetY = crownY;
    }
  }
}
```

### Suggestion #3: Healer Punish (Spacing Matters) ✅

```javascript
// Healers have an effective range
const HEALER_EFFECTIVE_RANGE = 300;

// In damage system, when guard takes damage:
// If healer > 300px away, incoming healing is 50%
guard.healingMultiplier = 1.0;
for (const healer of teamHealers) {
  if (healer.guardRole === 'HEALER') {
    const dist = Math.hypot(healer.x - guard.x, healer.y - guard.y);
    if (dist > HEALER_EFFECTIVE_RANGE) {
      guard.healingMultiplier = 0.5;
      break;
    }
  }
}

// When healer casts heal:
const actualHealing = baseHealing * guard.healingMultiplier;
```

---

## Summary: What Needs Fixing RIGHT NOW

| Issue | Impact | Fix | Complexity |
|-------|--------|-----|-----------|
| Burst damage math (405 dmg spike) | Game balance | Stagger bursts | Medium |
| Performance (distance every frame) | FPS drops with more enemies | Cache + throttle | Medium |
| Guards never reset | Map becomes chase simulator | Crown timeout | Low |
| Healer too effective | DPS doesn't matter | Healing range penalty | Low |
| Distance checks per frame | Unnecessary overhead | Use squared distances | Low |
| Image render flicker | Polish | Preload images | Low |
| Doc wording (15 vs 5 guards) | Confusion | Update docs | Trivial |

---

## What Works Well (Don't Change)

- ✅ Loadout system is solid
- ✅ Protect vs Chase state machine is clean
- ✅ Debug commands are invaluable
- ✅ No leashing intent is right (just needs reset mechanic)
- ✅ Pentagon formation is elegant
- ✅ Mana-based rotation is good foundation

