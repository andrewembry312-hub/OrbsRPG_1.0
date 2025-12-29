# NPC Behavior System - Complete Overhaul

**Date**: December 28, 2025  
**Status**: ✅ IMPLEMENTED

---

## 🎯 CHANGES SUMMARY

### **Phase 1: Core AI Fixes** ✅

#### **1. Fixed Frozen Group Members**
- **Issue**: Group members weren't moving - they stood frozen at spawn
- **Cause**: `speed = 0` when idle in formation
- **Fix**: Group members now always have minimum speed (30) for drift correction, 60 for fine-tuning, 110+ for following
- **Result**: Group members now smoothly follow player in circular formation

#### **2. Fixed Guard Combat**
- **Issue**: Guards weren't attacking enemies
- **Cause**: Early movement freeze (`a.x = spawnX`) prevented combat check
- **Fix**: Reordered logic to check enemies FIRST, then handle movement/return to spawn
- **Result**: Guards now actively chase and attack enemies within 120 units

#### **3. Removed Duplicate AI System**
- **Issue**: `updateGroupAI()` and `updateFriendlies()` both modified group members
- **Fix**: Removed `updateGroupAI()` call - all AI now handled in `updateFriendlies()`
- **Result**: Single source of truth for NPC behavior, no conflicts

---

### **Phase 2: Visual Feedback** ✅

#### **1. Behavior Button Highlighting**
- Added active state styling (blue background + border)
- Aggressive button lights up when active
- Neutral button lights up when active
- Initial state set based on current NPC behavior

#### **2. Real-time Updates**
- Button states update immediately on click
- Description text updates to match behavior
- Group tab syncs with inspection panel

---

### **Phase 3: Help Tab Documentation** ✅

#### **New Help Tab Added** (Tab 6 in Inventory UI)

**Sections Include:**

1. **🤖 NPC Types**
   - Guards (site defenders)
   - Group Members (player party)
   - Non-Group Allies (autonomous)

2. **⚡ Behavior System**
   - Aggressive behavior details
   - Neutral behavior details
   - Group vs Non-Group differences

3. **👥 Group System**
   - How to invite/manage members
   - Equipment and abilities
   - Formation mechanics

4. **⚔️ Combat Mechanics**
   - Aggro ranges by type/behavior
   - Chase limits
   - Respawn system
   - Buffs/debuffs

5. **🎮 Controls & UI**
   - Unit inspection
   - Behavior buttons
   - Group panel
   - Map navigation

6. **🏆 Campaign Objectives**
   - Victory conditions
   - Site types
   - Emperor bonus

7. **💡 Tips & Tricks**
   - Strategy recommendations
   - Early/late game tactics

---

## 📊 NPC BEHAVIOR SPECIFICATIONS

### **Guards** (Site Defenders)
```
Type: GUARD
Behavior: ALWAYS AGGRESSIVE (unchangeable)
Location: Fixed spawn positions at sites
Aggro Range: 120 units
Chase Limit: 140 units from spawn
Respawn: 10 seconds (if site player-owned)
Movement: Idle → Detect Enemy → Chase → Return to Spawn
```

### **Group Members** (Player Party)
```
Type: GROUP_MEMBER
Behavior: User-controlled (Aggressive/Neutral)
Formation: Circular, 60-100 unit radius from player
Aggro Range: 180 units (aggressive) / 90 units (neutral)
Chase Limit: None (follow player anywhere)
Respawn: 10 seconds at home base, rejoin formation
Movement: Follow Formation → Engage Enemy → Return to Formation
Speeds: 30 (idle), 60 (fine-tune), 110 (follow), 140 (sprint catch-up)
```

### **Non-Group Allies** (Autonomous)
```
Type: NON_GROUP_ALLY
Behavior: User-controlled (Aggressive/Neutral)
Objective: Capture enemy flags
Aggro Range: 140 units (aggressive) / 80 units (neutral)
Chase Limit: To enemy flag
Respawn: 10 seconds at home flag
Movement: Seek Flag → Engage Enemy (if in range) → Capture Flag
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### **Files Modified**
- `src/game/game.js` - Core AI logic fixes
- `src/game/ui.js` - Visual feedback + Help tab

### **Key Functions Updated**
- `updateFriendlies()` - All NPC AI logic (unified)
- `showUnitInspection()` - Button state initialization
- Behavior button handlers - Visual feedback on click
- Tab system - Added Help tab (index 5)

### **Debug Features Added**
- `DEBUG_AI` flag in `updateFriendlies()` - Set to `true` for console logging
- Logs: behavior, distances, enemy detection, speed settings

---

## ✅ TESTING CHECKLIST

- [x] Guards attack enemies within range
- [x] Guards return to spawn when enemies leave
- [x] Group members follow player in formation
- [x] Group members sprint to catch up when far
- [x] Aggressive group members engage distant enemies
- [x] Neutral group members stay close to formation
- [x] Behavior buttons show active state (blue highlight)
- [x] Button states persist across panel reopens
- [x] Help tab displays comprehensive documentation
- [x] All 3 NPC types have distinct behaviors
- [x] No more frozen/stuck NPCs

---

## 🎮 PLAYER EXPERIENCE IMPROVEMENTS

### **Before**
- ❌ Group members frozen at base
- ❌ Guards standing idle while enemies nearby
- ❌ No visual feedback on behavior buttons
- ❌ No documentation on how NPCs work
- ❌ Confusing duplicate AI systems

### **After**
- ✅ Group members actively follow and fight
- ✅ Guards aggressively defend sites
- ✅ Clear visual feedback (blue buttons)
- ✅ Comprehensive help documentation
- ✅ Clean, single AI system
- ✅ Smooth formation movement
- ✅ Distinct behaviors for each type

---

## 📝 USAGE GUIDE

### **Managing Group Members**
1. Find a non-guard ally (blue orb moving around)
2. Right-click → "Invite to Group"
3. Open Inventory → Group tab
4. Click member → Set role (DPS/Tank/Healer)
5. Set behavior (Aggressive or Neutral)
6. Click "Edit Equipment" to assign gear/abilities

### **Understanding Behaviors**
- **Aggressive**: Seeks combat, breaks formation (good for offense)
- **Neutral**: Stays close, defensive (good for protection)
- **Guards**: Always aggressive (can't change)

### **Viewing Help**
- Open Inventory (I key)
- Click "Help" tab
- Read comprehensive game mechanics guide

---

## 🐛 KNOWN LIMITATIONS

- Group member equipment doesn't affect stats yet (visual only)
- Healer role AI not fully implemented
- Tank role doesn't taunt enemies
- No visual indicators for NPC speed/state

---

## 🚀 FUTURE ENHANCEMENTS

1. NPC stat calculation from equipment
2. Advanced role-based AI (healer heal priority, tank taunts)
3. Formation patterns (line, wedge, scatter)
4. NPC level progression
5. Visual speed/state indicators (arrows, glows)
6. Command system (stay, attack, defend)

---

**Implementation Complete** ✅  
All requested features have been implemented and tested.
