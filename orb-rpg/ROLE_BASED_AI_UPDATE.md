# Role-Based AI Targeting System

**Date**: January 5, 2026  
**Status**: ✅ IMPLEMENTED

---

## 🎯 SYSTEM OVERVIEW

Implemented role-based targeting priorities for both **friendly allies** and **enemy NPCs** to create tactical depth and strategic team composition benefits.

---

## ⚔️ ROLE PRIORITIES

### **TANK Roles (Warden, Knight)**

**Targeting Priority:**
1. **Attack walls/objectives** even during combat (push objectives under pressure)
2. **Peel for healers** - defend allied mages from nearby attackers (within 100 units)
3. **Attack enemies** when no objectives/healers need protection

**Strategy:**
- Tanks are durable frontliners who pressure objectives and protect squishies
- During combat, tanks break walls while DPS handles enemies → coordinated sieges
- Automatically switches to healer defense when mages are threatened

---

### **DPS Roles (Warrior, Archer)**

**Targeting Priority:**
1. **Kill enemies first** - eliminate threats before objectives
2. **Attack walls/objectives** only when area is clear (no nearby enemies)

**Strategy:**
- DPS clears threats efficiently then assists with objectives
- Prevents retaliation by eliminating enemies before pushing objectives
- Focuses fire on hostiles for maximum damage output

---

### **HEALER Roles (Mage)**

**Targeting Priority:**
1. **Stay near allied cluster** (within 120 units) for healing range
2. **Attack enemies** only when safe (close to allies, within 80 units, not healing)
3. **Capture objectives** only when very safe (no threats, near allies)

**Strategy:**
- Healers **never solo push walls** - they support from protected positions
- Prioritizes positioning for consistent healing uptime
- Only engages in combat when protected by nearby allies

---

## 📊 TACTICAL BENEFITS

### **Coordinated Sieges**
- **Tanks** break walls during combat
- **DPS** focuses enemies simultaneously
- **Result:** Faster objective captures with threat elimination

### **Protected Healers**
- **Healers** stay in back near allies
- **Tanks** automatically peel for threatened healers
- **Result:** Consistent healing uptime, fewer healer deaths

### **Threat Elimination**
- **DPS** clears retaliation threats before objectives
- **Tanks** push objectives during combat
- **Result:** Safer captures, reduced counterattacks

### **Role Synergy**
- Meaningful team composition strategy
- Each role contributes uniquely to combat
- Tactical depth in battles and base assaults

---

## 🔍 DEBUG LOGGING

### **Friendly Role Decisions**
```
FRIENDLY_ROLE_TARGET:
- friendly: Unit name
- role: TANK/DPS/HEALER
- decision: attack_walls_combat, peel_healer, attack_enemy, support_position, etc.
- target: Target name/description
- distance: Distance to target
```

**Sample Rate:** 5% to avoid log spam

### **Enemy Role Decisions**
```
ENEMY_ROLE_TARGET:
- enemy: Unit name
- role: TANK/DPS/HEALER
- decision: tank_walls_combat, dps_attack_host, healer_support_position, etc.
- target: Target name
- targetType: player/friendly/enemy
- distance: Distance to target (when applicable)
```

**Sample Rate:** 2% to avoid log spam

---

## 💻 IMPLEMENTATION DETAILS

### **Friendly AI (Non-Group, Non-Guard)**
**Location:** `game.js` - `updateFriendlies()` function

**Key Features:**
- Checks for walls at nearest objective flag
- Tank-specific logic: walls > healer peel > enemies
- DPS-specific logic: enemies > walls (when safe)
- Healer-specific logic: stay near allies > enemies (when safe) > never walls
- Debug logging for role decisions

### **Enemy AI (Non-Guard)**
**Location:** `game.js` - `updateEnemies()` function

**Key Features:**
- Tank enemies attack walls even when player/friendlies nearby
- DPS enemies focus hostiles first
- Healer enemies maintain support positions near allied clusters
- Integrates with existing outpost focus system
- Debug logging for role decisions

---

## 📝 DOCUMENTATION UPDATES

### **Help Tab**
Added new section: **"⚔️ Role-Based Targeting Priorities"**
- Tank role priorities and strategy
- DPS role priorities and strategy  
- Healer role priorities and strategy
- Tactical benefits explanation

**Location:** Inventory → Help tab (Tab 6)

---

## ✅ TESTING CHECKLIST

- [ ] Tanks attack walls during combat (friendly & enemy)
- [ ] Tanks peel for healers when threatened (friendly)
- [ ] DPS prioritizes enemies over walls
- [ ] Healers stay near allied cluster
- [ ] Healers don't solo push walls
- [ ] Debug logs show role decisions (FRIENDLY_ROLE_TARGET, ENEMY_ROLE_TARGET)
- [ ] Wall damage works with tank targeting
- [ ] No performance issues from role checks

---

## 🎮 GAMEPLAY IMPACT

**Before:** All units had same targeting logic - enemies > objectives

**After:** 
- Tanks push objectives aggressively (even in combat)
- DPS clears threats first (safer captures)
- Healers support safely (protected positioning)
- Team composition matters strategically
- Combat has meaningful role differentiation

---

**Implementation Complete** ✅  
Role-based targeting active for friendlies and enemies.
