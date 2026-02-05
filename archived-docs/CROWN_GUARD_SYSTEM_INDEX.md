# Crown Guard System - Documentation Index

## 📚 Complete Documentation Set

Your crown guard system is now **fully implemented and documented**. Here's what you need to know:

---

## 🚀 Start Here

### 1. **CROWN_GUARDS_QUICK_START.md** ⭐ START HERE
- TL;DR overview of the system
- Loadout types explained
- Pentagon formation visualization
- Quick console commands
- Testing scenarios
- **Read this first!**

### 2. **CROWN_GUARD_SYSTEM_COMPLETE.md**
- Comprehensive system overview
- Architecture explanation
- Loadout type system details
- Priority-based behavior
- Formation system
- Chase mechanics
- Spawning & respawning
- Console commands reference

### 3. **CROWN_GUARD_CODE_REFERENCE.md**
- Complete code snippets
- All key functions
- Data structure mapping
- Property explanations
- For developers/code review

### 4. **CROWN_GUARD_ARCHITECTURE_DIAGRAMS.md**
- ASCII diagrams of system
- Spawn flow diagram
- Pentagon formation geometry
- Update loop flow
- Priority decision tree
- Chase trigger mechanism
- Role matrix
- **Visual learners: Read this!**

### 5. **CROWN_GUARD_SETUP_COMPLETE.md**
- Implementation summary
- What was added
- Key features list
- Before/after comparison
- Next steps (optional enhancements)

---

## 📋 System Summary

### What Crown Guards Are

5 elite enemy protectors spawned at each team base during Emperor Mode:
- **Appearance**: Blue orbs with black borders and fighter card images
- **Purpose**: Protect their team's crown at all costs
- **Behavior**: Follow crown, maintain pentagon formation, chase if crown moves
- **Respawn**: 5 seconds after all killed

### The Loadout Type System

```
Guard #1 → TANK (Priority 1)      - Shield the crown
Guard #2 → HEALER (Priority 2)    - Keep team alive
Guards #3-5 → DPS (Priority 3)    - Hunt threats
```

Each loadout defines:
- Role & class
- Stat multipliers
- Behavior priorities
- Position in formation

### Key Features

✅ **Loadout Type System** - 5 unique loadout types with properties  
✅ **Priority-Based AI** - Tank shields, healer heals, DPS hunts  
✅ **Crown Tracking** - Know exactly which crown to protect  
✅ **Pentagon Formation** - Dynamic 90px formation around crown  
✅ **Chase Behavior** - Follow crown if it moves > 500px  
✅ **Blue Rendering** - Render as blue orbs with fighter images  
✅ **Console Commands** - Debug & test the system  

---

## 🔧 Technical Details

### Files Modified

1. **src/game/game.js**
   - `CROWN_GUARD_LOADOUTS` (loadout definitions)
   - `spawnCrownGuards()` (enhanced with loadout system)
   - `updateCrownGuardAI()` (enhanced with priority logic)
   - Console debug commands

2. **src/game/render.js**
   - Crown guard rendering check
   - Blue color & black border
   - Fighter card image overlay

### Guard Properties

Essential properties each crown guard has:

```
crownGuard: true              // Flag for rendering
crownTeam: 'teamA'            // Which team's crown
crownId: 'crown_xyz'          // Crown entity to protect
crownSiteId: 'team_a_base'    // Base site location
loadoutType: 'tank'           // Loadout type (tank/healer/dps1/dps2/dps3)
guardPriority: 1              // Priority level (1=tank, 2=healer, 3=dps)
crownFormationIndex: 0        // Position in pentagon (0-4)
guardMode: 'protect'          // Current mode (protect/chase/heal/attack)
```

### Data Flow

```
Emperor Mode Activated
  ↓
For each team:
  ↓
Spawn 5 guards with loadout types
  ├─ Tank at priority 1
  ├─ Healer at priority 2
  └─ 3× DPS at priority 3
  ↓
Every frame:
  ├─ Update crown position
  ├─ For each guard:
  │  ├─ Calculate distance to crown
  │  ├─ Read priority
  │  ├─ Make decision based on priority
  │  └─ Set target position
  └─ Normal movement system handles rest
```

---

## 🎮 Testing & Console Commands

### Quick Test Sequence

```javascript
// 1. Start emperor mode
window.activateEmperor()

// 2. Check guards spawned
window.getCrownGuardStatus()

// 3. View loadout types
window.getCrownGuardLoadouts()

// 4. Check formation alignment
window.visualizeCrownGuardFormation()

// 5. Test chase behavior
window.testCrownGuardChase()
```

### Expected Output

When you run `getCrownGuardStatus()`:

```
═══════════════════════════════════════════════════════════════════════════════
👑 CROWN GUARD STATUS
═══════════════════════════════════════════════════════════════════════════════

🛡️ TEAMA TEAM GUARDS:
  👑 Crown: (1024, 768)
  Guards: 5/5
  ✓ [TANK] Guard Leader | HP: 300/300 | Pos: (1094, 768) | Dist: 70 | Mode: protect
  ✓ [HEALER] Archmage | HP: 162/162 | Pos: (1064, 830) | Dist: 72 | Mode: protect
  ✓ [DPS] Guard Knight | HP: 260/260 | Pos: (964, 830) | Dist: 72 | Mode: protect
  ✓ [DPS] Battle Mage | HP: 250/250 | Pos: (934, 768) | Dist: 90 | Mode: protect
  ✓ [DPS] Guard Captain | HP: 270/270 | Pos: (964, 706) | Dist: 72 | Mode: protect
```

---

## 🎯 Priority-Based Behavior Quick Reference

### Priority 1: TANK (Guard Leader)
```
Job: Defend the crown
Behavior: Intercept threats
Position: 80px from crown (closest)
Stats: +50% HP, +30% DEF
```

### Priority 2: HEALER (Archmage)
```
Job: Keep team alive
Behavior: Heal hurt allies
Position: 120px from crown (mid-range)
Stats: +40% Mana (supports healing)
```

### Priority 3: DPS (×3 Guards)
```
Job: Hunt threats
Behavior: Attack enemies in range
Position: 150px from crown (outer)
Stats: +25-35% Damage, +5-15% Speed
```

---

## 📊 Pentagon Formation Reference

```
                Guard 0 (TANK)
                    ◯
                   ╱ ╲
                  ╱   ╲
    Guard 4       ╱     ╲       Guard 1
     (DPS3)      ◯       ◯      (HEALER)
                ╱         ╲
               ╱    ◯      ╲
              ╱   CROWN     ╲
             ◯               ◯
         Guard 3         Guard 2
          (DPS2)          (DPS1)

Formation Details:
- Center: Crown (moves dynamically)
- Radius: 90 pixels
- Spacing: 72° between guards
- Updates: Every frame as crown moves
- Resets: When threats clear
```

---

## 🌟 What Makes This System Special

### Before Implementation
- Guards had fixed hardcoded roles
- No loadout system
- No formation intelligence
- All guards behaved identically
- No priority-based decisions

### After Implementation
- **Loadout Type System**: Each of 5 guards has unique loadout
- **Priority-Based AI**: Tank shields, healer heals, DPS hunts
- **Crown Tracking**: Know exactly which crown/site to protect
- **Dynamic Formation**: Pentagon that updates every frame
- **Smart Behavior**: Decision making based on priorities and situation
- **Extensible**: Easy to add new loadouts or behaviors

---

## 🔍 Debugging Tips

### If guards don't appear blue
```javascript
// Check render.js - ensure this code exists:
if(e.crownGuard) {
  ec = e.color || '#3498db';  // Blue
}
```

### If guards not chasing crown
```javascript
// Check game.js - run this:
window.getCrownGuardStatus()
// Look for "Mode: chase" when crown far away
```

### If formation not aligned
```javascript
// Check formation:
window.visualizeCrownGuardFormation()
// Should show "✓ ALIGNED" for all guards
```

### If loadout not applied
```javascript
// Check console during spawn
// Should see message like:
// "[CROWN GUARDS] Spawned Guard Leader (Elite) for teamA - Loadout: tank, Priority: 1"
```

---

## 📖 Documentation Map

```
You are here → CROWN_GUARD_SYSTEM_INDEX.md (this file)

Quick Start?          → CROWN_GUARDS_QUICK_START.md
Need full details?    → CROWN_GUARD_SYSTEM_COMPLETE.md
Code snippets?        → CROWN_GUARD_CODE_REFERENCE.md
Visual diagrams?      → CROWN_GUARD_ARCHITECTURE_DIAGRAMS.md
Implementation info?  → CROWN_GUARD_SETUP_COMPLETE.md
```

---

## ✅ Implementation Checklist

- ✅ Loadout type system created (5 types)
- ✅ Spawn function enhanced with loadouts
- ✅ Update function enhanced with priorities
- ✅ Rendering enhanced for blue/border/images
- ✅ Pentagon formation implemented
- ✅ Chase behavior implemented
- ✅ Console debug commands added
- ✅ Documentation written
- ✅ Code comments added
- ✅ Ready for testing

---

## 🚀 Next Steps

1. **Test the system** (see CROWN_GUARDS_QUICK_START.md)
2. **Run console commands** to verify behavior
3. **Check formation** with visualizeCrownGuardFormation()
4. **Test chase** with testCrownGuardChase()
5. **Review logs** during crown guard spawn

---

## 📞 Quick Reference

| Need | Document |
|------|----------|
| TL;DR Overview | CROWN_GUARDS_QUICK_START.md |
| Full System Explanation | CROWN_GUARD_SYSTEM_COMPLETE.md |
| Code Examples | CROWN_GUARD_CODE_REFERENCE.md |
| Visual Diagrams | CROWN_GUARD_ARCHITECTURE_DIAGRAMS.md |
| What Changed | CROWN_GUARD_SETUP_COMPLETE.md |
| This Index | CROWN_GUARD_SYSTEM_INDEX.md |

---

## 📝 System Status

**Status**: ✅ **COMPLETE & READY TO TEST**

- **Implementation**: 100% Complete
- **Documentation**: 100% Complete
- **Testing**: Ready to test
- **Date**: 2026-01-25
- **System**: Emperor Mode - Phase 3: Crown Guard System

---

## 🎉 Summary

You now have:
- ✨ **Loadout Type System** with 5 unique guard types
- ✨ **Priority-Based AI** that makes intelligent decisions
- ✨ **Crown Tracking** that keeps guards focused on protection
- ✨ **Pentagon Formation** that dynamically updates
- ✨ **Chase Behavior** that follows crowns across the map
- ✨ **Complete Documentation** for understanding and debugging
- ✨ **Console Commands** for testing and monitoring

**Your crown guards are now elite protectors with personality and strategy!** 👑🛡️

---

Start with **CROWN_GUARDS_QUICK_START.md** for the best introduction.
