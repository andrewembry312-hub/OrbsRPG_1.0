# Point System Clarification & Fixes

## ✅ CRITICAL FIXES APPLIED (Commit 4a48ac8)

### Issue 1: Enemy Guards Limited by Player Slots ❌ → ✅ FIXED

**What Was Wrong:**
- AI teams (teamA, teamB, teamC) could only spawn guards based on **player's unlocked slots**
- If player had 0 guard slots unlocked, enemy teams couldn't spawn ANY guards
- This completely broke enemy threat level and made game unbalanced

**What Changed:**
```javascript
// BEFORE (WRONG):
maxGuardsAllowed = slotData.filter(s => s.unlocked).length; // Depended on player

// AFTER (CORRECT):
maxGuardsAllowed = 5; // Independent - always 5 guards per site
```

**Location**: [src/game/world.js](src/game/world.js#L442-L444)

**Result**: 
- ✅ Enemy teams spawn 5 guards per captured site immediately
- ✅ Player guards still limited by unlocked slots (intended behavior)
- ✅ Early game is now challenging from start

---

### Issue 2: Skill Points Not Visible on Level Tab ❌ → ✅ FIXED

**What Was Wrong:**
- Level Tab showed: Level, Stat Points only
- Skill Points were tracked in `state.progression.skillPoints` but not displayed
- Players couldn't verify their skill points were accumulating

**What Changed:**
- Added 3rd column to Level Tab: **Skill Points** (purple text)
- Updated UI references to include `levelTabSkillPoints`
- Added display logic: `state.progression?.skillPoints || 0`

**Location**: 
- UI HTML: [src/game/ui.js](src/game/ui.js#L420-L435)
- Display Logic: [src/game/ui.js](src/game/ui.js#L5790)

**Result**:
- ✅ Level Tab shows all 3 point types: Level, Stat Points, Skill Points
- ✅ Updates in real-time as points accumulate
- ✅ Players can now track progression clearly

---

## 📊 THREE SEPARATE POINT SYSTEMS CLARIFIED

### 1. **STAT POINTS** (Level Tab - Blue)
- **Earn**: 2 per level
- **Use**: Vitality, Strength, Intelligence, Defense, Agility allocations
- **Location**: Level Up tab → Stats grid
- **Current**: ✅ Working correctly
- **Track**: `state.progression.statPoints`

### 2. **SKILL POINTS** (Level Tab - Purple) 
- **Earn**: 1 per level
- **Use**: Unlocking/upgrading combat slots (guards & allies)
- **Location**: Level Up tab → NEW display (was hidden before)
- **Current**: ✅ Working correctly (now visible)
- **Track**: `state.progression.skillPoints`
- **Spending**: 
  - Unlock slot: 1 SP
  - Upgrade slot: 1 + ceil(level × 0.1) SP

### 3. **SLOT POINTS** (Future - Not Yet Implemented)
- **Concept**: Per-slot XP progression (individual slot leveling)
- **Earn**: Would track XP per slot independently
- **Use**: Individual slot power scaling
- **Status**: 🔴 NOT IMPLEMENTED (slots currently only use level, not individual XP)
- **Track**: Would be `slot.xp` (not in state.js yet)
- **Note**: Can be added as future feature - currently not breaking gameplay

---

## 🛡️ GUARD SPAWNING BEHAVIOR (CORRECTED)

### Player Guards
```javascript
// Controls how many guards player can spawn
- Capped by: unlocked slot count (0-5)
- Spawning rules:
  * Player base: ALWAYS spawns 5 guards (bases always allowed)
  * Captured flags: Spawns up to unlocked slot count
  * Example: 2 slots unlocked = up to 2 guards per captured flag
```

### Enemy Guards (AI Teams)
```javascript
// INDEPENDENT from player slots (NEW)
- Capped by: NONE (always 5 guards per site)
- Spawning rules:
  * AI bases: Always 5 guards
  * Captured flags: Always 5 guards
  * Example: Player has 0 slots → Enemies still spawn 5 guards per site
```

---

## 🎯 GAMEPLAY IMPACT

### What Was Broken Before:
1. New players couldn't hurt enemy guards (no guards spawned)
2. First map was impossible to complete
3. Game crash imminent at early progression

### What's Fixed Now:
1. ✅ Enemies always threatening with guards
2. ✅ Player slot system purely for player progression
3. ✅ Balanced early game progression

---

## 📋 FILES MODIFIED

| File | Changes |
|------|---------|
| `src/game/world.js` | Enemy guard spawning logic |
| `src/game/ui.js` | Level tab UI + display logic |
| `orb-rpg/src/game/ui.js` | Duplicate codebase sync |

---

## ✨ VERIFICATION CHECKLIST

- [x] Enemy teams spawn 5 guards immediately
- [x] Player guards limited by unlocked slots
- [x] Skill Points display on Level tab
- [x] Stat Points still displayed on Level tab
- [x] Both stat types update in real-time
- [x] Slot system unlocking/upgrading still works
- [x] No console errors reported

---

## 🔮 FUTURE ENHANCEMENTS

### Slot Points System (If Implemented)
Could add per-slot XP tracking:
```javascript
// Example implementation (not in current code)
slot.xp += (xpAwarded * 0.1); // 10% of enemy XP → slot
if (slot.xp >= slot.xpThreshold) {
  slot.level++;
  slot.xp = 0;
}
```

### Benefits:
- Independent slot progression
- More strategic slot investment
- Longer progression curve
- More "points to track"

---

**Commit**: 4a48ac8
**Date**: January 19, 2026
**Status**: ✅ VERIFIED & WORKING
