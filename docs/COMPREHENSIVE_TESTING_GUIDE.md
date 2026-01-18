# Complete Testing Guide - Phase 2

**Status**: ✅ **READY FOR TESTING**  
**Date**: January 18, 2026  
**Total Implementation**: 12 code changes + logging enhancements

---

## 🎯 What's New (Phase 2)

### 3 Additional Features Implemented

1. **NPC Movement Tracking** ✅
   - Sampled at 10% rate (logs every 10 seconds on average)
   - Tracks position delta to detect idle vs moving
   - Identifies when allies are stuck

2. **Respawn Confirmation Logging** ✅
   - GUARD_RESPAWNED events
   - ALLY_RESPAWNED events
   - Includes time dead and respawn location

3. **Boss Image Display Fixed** ✅
   - Fixed name mapping (lowercase → Capitalized)
   - Fixed key lookup in render.js
   - Boss icons now properly display in battle

---

## 🧪 COMPLETE TESTING PHASES

### Phase 1: Slot System (15 minutes)

**Goal**: Verify slot unlock system works correctly

**Steps**:
1. Start a new campaign
2. Check player has 1 slot unlocked
3. Reach level 2
   - [ ] Open slot menu
   - [ ] Verify unlock cost is 1 SP
   - [ ] Unlock slot 2
   - [ ] Confirm no "upgrade slot" option
4. Reach level 3 and repeat for slot 3

**Expected Results**:
- ✅ Each slot costs exactly 1 SP to unlock
- ✅ No upgrade/level system visible
- ✅ Progression is linear (slot 1 → slot 2 → slot 3)

**Log Check**:
- Look for any "upgrade" messages (should be none)
- Check debugLog doesn't have SLOT_UPGRADE events

---

### Phase 2: Shadow Veil Ability (15 minutes)

**Goal**: Verify shadow veil mechanics work correctly

**Steps**:
1. Recruit an ally and get near enemies
2. Cast Shadow Veil (50 SP)
   - [ ] Ally becomes invisible (enemies ignore)
   - [ ] Verify visual effect (purple shimmer)
3. While stealthed, attack an enemy
   - [ ] Damage should be dealt
   - [ ] Hit should be guaranteed crit (100%)
4. Verify stealth breaks
   - [ ] On damage taken: Let enemy hit ally (if they can hit invisible)
   - [ ] Stealth breaks immediately
5. Try to recast immediately
   - [ ] Should fail with cooldown message
   - [ ] Wait 1 second
   - [ ] Recast should succeed

**Expected Results**:
- ✅ +100% crit (all hits are critical)
- ✅ Stealth breaks on any damage
- ✅ 1-second recast cooldown after break
- ✅ Visual feedback clear

**Log Check**:
- Check buff logs show `critChance: 1.0`
- Verify all crit calculations during stealth period

---

### Phase 3: Unarmed Combat (15 minutes)

**Goal**: Verify unarmed damage reduction

**Steps**:
1. Equip no weapon (unarmed)
2. Attack a creature with light attack
   - [ ] Calculate expected damage: 1 + (attack stat × 0.08)
   - [ ] Verify actual damage matches
3. Attack with heavy attack
   - [ ] Calculate expected damage: 2 + (attack stat × 0.15)
   - [ ] Verify actual damage matches
4. Compare to weapon damage
   - [ ] Equip a sword
   - [ ] Weapon damage should be significantly higher
   - [ ] Weapon makes damage viable (unarmed should be inferior)

**Expected Results**:
- ✅ Light: ~1 + atk×0.08 (very low)
- ✅ Heavy: ~2 + atk×0.15 (low)
- ✅ Weapon: 2-3x higher damage
- ✅ Encourages weapon usage

**Log Check**:
- Monitor damage in combat logs
- Calculate damage formula to verify it's correct

---

### Phase 4: Guard Spawning (15 minutes)

**Goal**: Verify guards spawn correctly

**Steps**:
1. Capture an outpost (neutral flag)
   - [ ] 5 guards should appear
   - [ ] Should be 2 mages + 3 warriors
   - [ ] Check levels match slot progression
2. Download debug logs
   - [ ] Search for "GUARD_SPAWNED" events
   - [ ] Should have exactly 5 entries
   - [ ] Verify variant split (2 mage, 3 warrior)
3. Check formation
   - [ ] Guards form pentagon around flag
   - [ ] Positions consistent
   - [ ] Spacing reasonable (~50 units apart)

**Expected Results**:
- ✅ 5 guards per outpost
- ✅ 2 mages + 3 warriors composition
- ✅ Pentagon formation visible
- ✅ Correct levels in log

**Log Check**:
```json
{
  "type": "GUARD_SPAWNED",
  "count": 5,
  "composition": "2 mage + 3 warrior",
  "level": 2 (matches slot progression),
  "position": "Pentagon formation around flag"
}
```

---

### Phase 5: Guard Respawning (20 minutes)

**Goal**: Verify guard respawn mechanics

**Steps**:
1. Capture an outpost
2. Let enemies kill a guard
   - [ ] Guard should die and fall to ground
3. Download logs immediately
   - [ ] Search "GUARD_DIED"
   - [ ] Should show respawnTime: 30.0
4. Wait 30 seconds
   - [ ] Guard should reappear
   - [ ] Should be in correct formation position (not random)
5. Download logs again
   - [ ] Search "GUARD_RESPAWNED"
   - [ ] Should show respawn position matches formation
   - [ ] timeDead should be ~30.0

**Expected Results**:
- ✅ Guard dies and is removed
- ✅ Dies event logged with 30s timer
- ✅ Guard respawns after exactly 30s
- ✅ Respawns in formation position
- ✅ All positions consistent

**Log Check**:
```json
{
  "type": "GUARD_DIED",
  "respawnTime": 30.0,
  "position": "x: 450, y: 320"
}
{
  "type": "GUARD_RESPAWNED",
  "timeDead": 30.0,
  "position": "x: 450, y: 325 (similar to death position)"
}
```

---

### Phase 6: Ally Respawning (15 minutes)

**Goal**: Verify ally respawn mechanics

**Steps**:
1. Recruit an ally/group member
2. Move away from flags
3. Let enemy kill the ally
   - [ ] Ally should die
4. Download logs
   - [ ] Search "ALLY_DIED"
   - [ ] Should show respawnTime: 8.0
5. Move to nearest player-owned flag
   - [ ] Ally should respawn there within 8 seconds
6. Download logs again
   - [ ] Search "ALLY_RESPAWNED"
   - [ ] respawnSite should match nearest flag
   - [ ] timeDead should be ~8.0

**Expected Results**:
- ✅ Ally dies and respawns set
- ✅ Dies event shows 8s respawn timer
- ✅ Respawns at nearest player flag
- ✅ Rejoin group/support player
- ✅ All tracked in logs

**Log Check**:
```json
{
  "type": "ALLY_DIED",
  "respawnTime": 8.0,
  "position": "x: 250, y: 180"
}
{
  "type": "ALLY_RESPAWNED",
  "timeDead": 8.0,
  "position": "x: 220, y: 200 (at nearest flag)"
}
```

---

### Phase 7: Boss Display (10 minutes) - NEW

**Goal**: Verify boss image displays correctly in battle

**Steps**:
1. Enter dungeon/campaign boss battle
2. Boss should appear on screen with image
   - [ ] Boss icon displays above or on boss sprite
   - [ ] Image is correct for boss type
   - [ ] No missing image placeholder
3. Open developer console (F12 → Console)
   - [ ] No error messages about image loading
   - [ ] Should see "[Boss Icons] Loaded successfully"
4. Try multiple boss fights
   - [ ] Each boss should display its own icon
   - [ ] Icons should match boss name

**Expected Results**:
- ✅ Boss images display in battle
- ✅ No console errors
- ✅ Correct icon per boss type
- ✅ Icons visible at reasonable scale

**Log Check**:
- Console should show: `[Boss Icons] Loaded successfully`
- No "Failed to load boss icon" messages
- Check bossIcons object has entries with capitalized keys

---

### Phase 8: NPC Movement Tracking (20 minutes) - NEW

**Goal**: Verify ally movement is tracked correctly

**Steps**:
1. Recruit multiple allies
2. Send them to attack enemies
3. Download logs while they're moving
4. Search logs for "ALLY_MOVEMENT" events
   - [ ] Should see entries (sampled at 10%)
   - [ ] distance > 0 means moving
   - [ ] isIdle: false for moving units
5. Have allies stand still
   - [ ] Check next "ALLY_MOVEMENT" log
   - [ ] distance should be ~0
   - [ ] isIdle: true when standing

**Expected Results**:
- ✅ Movement events logged (10% sample)
- ✅ Position delta calculated correctly
- ✅ Idle detection working (<5 units = idle)
- ✅ All unit details tracked

**Log Check**:
```json
{
  "type": "ALLY_MOVEMENT",
  "distance": 45,
  "isIdle": false,
  "status": "moving"
}
{
  "type": "ALLY_MOVEMENT",
  "distance": 2,
  "isIdle": true,
  "status": "idle"
}
```

---

### Phase 9: Boss Image Distribution (15 minutes) - NEW

**Goal**: Verify all 9 boss types display correctly

**Steps**:
1. Fight/spawn different boss types:
   - [ ] Archmage
   - [ ] Balrogath
   - [ ] Bloodfang
   - [ ] Gorothar
   - [ ] Malakir
   - [ ] Tarrasque
   - [ ] Venom Queen
   - [ ] Vorrak
   - [ ] Zalthor
2. Each should display unique image
3. No two bosses should have same icon (except same type)

**Expected Results**:
- ✅ All 9 boss types have images
- ✅ Images are distinct
- ✅ Correct boss gets correct icon
- ✅ No fallback/default icons

**Log Check**:
- bossIcons object should have all 9 keys after loading
- No undefined entries

---

## 📊 Testing Summary Table

| Phase | Feature | Time | Priority | Status |
|-------|---------|------|----------|--------|
| 1 | Slot System | 15m | 🔴 Critical | ⏳ Test |
| 2 | Shadow Veil | 15m | 🔴 Critical | ⏳ Test |
| 3 | Unarmed Combat | 15m | 🟡 Important | ⏳ Test |
| 4 | Guard Spawning | 15m | 🔴 Critical | ⏳ Test |
| 5 | Guard Respawn | 20m | 🔴 Critical | ⏳ Test |
| 6 | Ally Respawn | 15m | 🔴 Critical | ⏳ Test |
| 7 | Boss Images | 10m | 🟡 Important | ⏳ Test |
| 8 | Movement Tracking | 20m | 🟢 Nice-to-have | ⏳ Test |
| 9 | Boss Distribution | 15m | 🟡 Important | ⏳ Test |
| **Total** | **9 Phases** | **140m** | - | **⏳ Ready** |

---

## ✅ Quick Checklist

Before you start testing:

- [ ] All code changes applied (use QUICK_VERIFICATION.md)
- [ ] Game loads without errors
- [ ] Console has no critical warnings
- [ ] Can create new campaign
- [ ] Can move/attack normally

### During Testing

- [ ] Keep F12 console open to watch for errors
- [ ] Document any failures
- [ ] Take screenshots of issues
- [ ] Note exact steps to reproduce problems

### Log Verification

For each phase:
1. **During gameplay**: Watch for log messages
2. **After gameplay**: Download logs
3. **Open in text editor**: Search for event types
4. **Verify data**: Check fields match expectations

---

## 🔍 Log Troubleshooting

**If logs not appearing**:
- Check `state.debugLog` exists in console
- Verify `Math.random() < rate` is passing
- Check if logging is disabled in settings

**If wrong data in logs**:
- Check timestamps are within campaign time
- Verify positions are reasonable (not 0,0)
- Check all required fields present

**If images not loading**:
- Open console: check for 404 errors
- Verify boss icons folder exists
- Check filenames are exact (case-sensitive)
- Clear browser cache if needed

---

## 🎮 Gameplay Notes

### For Better Testing

1. **Use Debug Mode**: If available, enables faster testing
2. **Clear Cache**: F5 or Ctrl+Shift+R to hard refresh
3. **Monitor Console**: Keep F12 open during play
4. **Save Often**: Backup saves between phases
5. **Document Issues**: Screenshot + note exact steps

### Commands to Try (if available)

```javascript
// In browser console (F12):
state.debugLog.length  // Count log entries
state.debugLog.filter(e => e.type === 'GUARD_SPAWNED').length  // Count specific type
state.friendlies  // List all allies/guards
```

---

## 📝 Test Report Template

```
## Test Results - [Date]

### Phase 1: Slot System
- [ ] Level 2 unlock: PASS/FAIL
- [ ] Cost is 1 SP: PASS/FAIL
- [ ] No upgrade option: PASS/FAIL
- Notes: _______________

### Phase 2: Shadow Veil
- [ ] Invisibility works: PASS/FAIL
- [ ] 100% crit confirmed: PASS/FAIL
- [ ] 1s cooldown working: PASS/FAIL
- Notes: _______________

### Phase [n]: [Feature]
- [ ] Test 1: PASS/FAIL
- [ ] Test 2: PASS/FAIL
- [ ] Test 3: PASS/FAIL
- Notes: _______________

## Summary
Total Phases: 9
Passed: ___/9
Failed: ___/9
Critical Issues: ___
```

---

## 🚀 Deployment Decision

### Ready to Deploy If:
- ✅ All 9 phases pass
- ✅ No critical failures
- ✅ Logs verify mechanics
- ✅ No console errors

### Hold Deployment If:
- ❌ Any critical phase fails
- ❌ Core mechanics broken
- ❌ Logs not capturing
- ❌ Crash/freeze issues

### Rollback If:
- Critical gameplay broken
- Save file corruption
- Network/login issues
- Multiple phases failing

---

**Status**: Ready for comprehensive testing  
**Expected Duration**: ~2-3 hours for all phases  
**Next Step**: Execute Phase 1 (Slot System testing)

Questions? Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for technical details.
