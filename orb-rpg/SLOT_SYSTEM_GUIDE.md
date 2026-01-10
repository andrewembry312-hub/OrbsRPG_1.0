# Slot System - Complete Design & Implementation Guide

## 🎯 System Overview

**Core Philosophy:**
- **Slots are the investment** (permanent progression)
- **Loadouts are the doctrine** (behavior, swappable)
- **No heroes** (avoid attachment/balance issues)
- **Instant AI mirroring** (world responds to player growth)

---

## 📊 Slot Structure

### Guards (5 Slots - Site-Bound Defenders)
1. **guard_tank** - Frontline defender (role: tank)
2. **guard_dps** - Damage dealer (role: dps)
3. **guard_support** - Healer/buffer (role: healer)
4. **guard_flex** - Player's choice (role: flex)
5. **guard_elite** - Late-game specialist (role: flex)

### Allies (10 Slots - Mobile Squad)
1-3. **ally_dps_1/2/3** - Burst/Sustained/AoE specialists (role: dps)
4-6. **ally_healer_1/2/3** - Burst heal/HoT/Cleanse builds (role: healer)
7-8. **ally_tank_1/2** - Frontline protection (role: tank)
9-10. **ally_flex_1/2** - Adapt to situation (role: flex)

---

## 💎 Skill Point Economy

### Earning
- **1 Skill Point per level** (infinite progression)
- Track: `state.progression.skillPoints` (spendable)
- Track: `state.progression.totalSkillPoints` (lifetime total)

### Costs
- **Unlock Slot**: 1 SP (flat cost)
- **Upgrade Slot**: Base 1 SP + (slot.level × 0.1 SP) rounded up
  - Level 0→1: 1 SP
  - Level 1→2: 2 SP  
  - Level 5→6: 2 SP
  - Level 10→11: 2 SP
  - Level 20→21: 3 SP

**Design Notes:**
- Slots can exceed player level (specialization encouraged)
- Rising costs create meaningful choices
- Prevents "max everything" instant gratification
- Rewards long-term investment

---

## 🔧 Progression Flow

### 1. Unlock Slot (1 SP)
```javascript
SLOTS.unlockSlot('guard_tank')
// ✅ Unlocked guard_tank! (5 SP remaining)
// [SLOT] Mirrored unlock for guard_tank to AI teams
```

### 2. Assign Loadout (Free, Out of Combat)
```javascript
SLOTS.assignLoadout('guard_tank', 'knight_basic')
// ✅ Assigned Vanguard Tank to guard_tank
// [SLOT] Mirrored loadout for guard_tank to AI teams
```

### 3. Upgrade Slot Level (1+ SP)
```javascript
SLOTS.upgradeSlot('guard_tank')
// ✅ Upgraded guard_tank to level 5! (3 SP remaining)
// [SLOT] Mirrored upgrade for guard_tank to AI teams
```

### 4. Unit Spawns/Updates
**Guards:** Auto-spawn when flag captured + slot unlocked  
**Allies:** Spawn when slot unlocked (up to slot level)

---

## 🎮 Console Commands Reference

### View All Slots
```javascript
SLOTS.viewSlots()
```
Shows:
- Current skill points
- Player level & zone tier
- All 15 slots with status (locked/level)
- Assigned loadouts

### Unlock + Upgrade + Assign (Quick Setup)
```javascript
// Unlock, upgrade to level 5, and assign loadout
SLOTS.quickSetup('guard_tank', 'knight_basic', 5)

// Unlock and upgrade only (no loadout)
SLOTS.quickSetup('ally_dps_1', null, 3)
```

### Manual Operations
```javascript
// Check costs
SLOTS.getUnlockCost('guard_tank')        // Returns: 1
SLOTS.getUpgradeCost('guard_tank')       // Returns: 1-3 depending on level

// Individual operations
SLOTS.unlockSlot('guard_dps')
SLOTS.assignLoadout('guard_dps', 'warrior_melee_basic')
SLOTS.upgradeSlot('guard_dps')
```

### Zone & Progression Info
```javascript
PROGRESSION.zoneInfo()  // View zone tier, level, SP
PROGRESSION.spawnBoss() // Manual boss spawn
PROGRESSION.nextZone()  // Force zone advancement
```

---

## 🏗️ Loadout Integration

### Role Compatibility
- **Tank slots**: Only accept tank loadouts
- **DPS slots**: Only accept dps loadouts
- **Healer slots**: Only accept healer loadouts
- **Flex slots**: Accept any role

### Available Loadouts (Current)
```javascript
// DPS Loadouts
warrior_melee_basic      // Berserker - melee burst
warrior_ranged_basic     // Archer - ranged DPS
mage_destruction_basic   // Pyromancer - AoE destruction
rogue_shadow_basic       // Assassin - stealth burst

// Tank Loadouts
knight_basic             // Vanguard - frontline defender
warden_basic             // Guardian - defensive tank

// Healer Loadouts
mage_healer_basic        // Cleric - burst healing
priest_basic             // Holy Priest - HoT healer
```

**View all available:**
```javascript
console.table(LOADOUTS.getAvailableLoadouts(state.progression.level))
```

---

## 🤖 AI Mirroring System

**Instant Synchronization:**
- When player unlocks slot → AI teams unlock same slot
- When player upgrades slot → AI teams upgrade to same level
- When player assigns loadout → AI teams use same loadout

**Why Instant?**
- World scales with player immediately
- No artificial delays or hidden timers
- Clear cause-and-effect relationship
- Maintains challenge throughout progression

**Teams Affected:**
- Team A (red)
- Team B (blue)  
- Team C (yellow)

---

## 🌍 Zone Tier System

**Tier Calculation:**
```
Zone Tier = Math.floor(Player Level / 5) + 1
```

**Examples:**
- Level 1-4: Tier 1
- Level 5-9: Tier 2
- Level 10-14: Tier 3
- Level 15-19: Tier 4
- Level 20+: Tier 5+

**Tier Effects (Future Implementation):**
- **Tier 1-2**: Basic AI behaviors
- **Tier 3**: Enemies kite after burst
- **Tier 4**: Enemy healers cleanse intelligently  
- **Tier 5**: Enemy groups counter-focus guards
- **Tier 6+**: Advanced coordination, fake retreats, interrupt combos

---

## 📈 Example Progression Path

### Early Game (Levels 1-5)
```javascript
// Level 1: Start game, 0 SP
// Level 2: 1 SP - unlock first guard slot
SLOTS.unlockSlot('guard_tank')
SLOTS.assignLoadout('guard_tank', 'knight_basic')

// Level 3: 1 SP - unlock first ally slot
SLOTS.unlockSlot('ally_dps_1')
SLOTS.assignLoadout('ally_dps_1', 'warrior_melee_basic')

// Level 4: 1 SP - upgrade guard tank
SLOTS.upgradeSlot('guard_tank') // Now level 2

// Level 5: 1 SP - unlock second ally
SLOTS.unlockSlot('ally_healer_1')
SLOTS.assignLoadout('ally_healer_1', 'mage_healer_basic')
// Zone Tier 2 achieved! +125 gold bonus
```

### Mid Game (Levels 6-10)
```javascript
// Focus on leveling core slots vs unlocking new ones
// Specialist strategy: Level guard_tank to 8-10
// Generalist strategy: Unlock more slots at level 1-2
```

### Late Game (Levels 15+)
```javascript
// All slots unlocked, choose specialization:
// - Elite guard squad (high-level guards)
// - Balanced army (moderate levels across all)
// - Specialist squads (max 3-4 slots, others minimal)
```

---

## 🎨 Future UI Vision

### Slot Management Screen
**Location:** New tab in character panel (Allies/Group/Skills/Inventory)

**Layout:**
```
╔══════════════════════════════════════════╗
║         SLOT MANAGEMENT                  ║
║  Skill Points: 12        Level: 18       ║
╠══════════════════════════════════════════╣
║  GUARD SLOTS (5)                         ║
║  [Unlocked Lvl 5] guard_tank             ║
║    Loadout: Vanguard Tank                ║
║    [Upgrade 2 SP] [Change Loadout]       ║
║                                          ║
║  [🔒 LOCKED] guard_dps                   ║
║    [Unlock 1 SP]                         ║
╠══════════════════════════════════════════╣
║  ALLY SLOTS (10)                         ║
║  [Unlocked Lvl 3] ally_dps_1             ║
║    Loadout: Berserker                    ║
║    [Upgrade 1 SP] [Change Loadout]       ║
╚══════════════════════════════════════════╝
```

**Loadout Browser Modal:**
- Filter by role (Tank/DPS/Healer/All)
- Show weapon type, abilities, combo plan
- Preview card with description
- Click to assign (free out of combat)

---

## 🐛 Testing Scenarios

### Test 1: Basic Unlock Flow
```javascript
// Start game
SLOTS.viewSlots()           // All locked, 0 SP

// Level up
state.progression.xp += 1000 // Gain level 2, 1 SP

// Unlock slot
SLOTS.unlockSlot('guard_tank')
SLOTS.assignLoadout('guard_tank', 'knight_basic')

// Verify guard spawns at captured flags
```

### Test 2: Slot Leveling
```javascript
// Unlock and level guard
SLOTS.unlockSlot('guard_dps')
SLOTS.assignLoadout('guard_dps', 'warrior_melee_basic')

// Upgrade multiple times
for (let i = 0; i < 5; i++) {
  state.progression.xp += 1000 // Gain SP
  SLOTS.upgradeSlot('guard_dps')
}

// Verify guard stats increase
```

### Test 3: AI Mirroring
```javascript
// Player unlocks slot
SLOTS.unlockSlot('ally_tank_1')
SLOTS.assignLoadout('ally_tank_1', 'knight_basic')
SLOTS.upgradeSlot('ally_tank_1')

// Check AI teams
console.log(state.slotSystem.aiTeams.teamA.allies)
// Should show matching slot at same level
```

### Test 4: Role Restriction
```javascript
// Try to assign wrong role
SLOTS.unlockSlot('guard_tank')           // Tank slot
SLOTS.assignLoadout('guard_tank', 'warrior_melee_basic') // DPS loadout
// ❌ Loadout role (dps) doesn't match slot role (tank)!

// Flex slot accepts any
SLOTS.unlockSlot('guard_flex')
SLOTS.assignLoadout('guard_flex', 'warrior_melee_basic') // ✅ Works
```

### Test 5: Cost Scaling
```javascript
// Level slot to 10 and check costs
for (let i = 0; i < 10; i++) {
  const cost = SLOTS.getUpgradeCost('ally_dps_1')
  console.log(`Upgrade ${i} → ${i+1}: ${cost} SP`)
  state.progression.skillPoints += cost
  SLOTS.upgradeSlot('ally_dps_1')
}
// Verify costs increase gradually
```

---

## 🔮 System Benefits

### Player Experience
✅ Meaningful choices (can't max everything instantly)  
✅ Long-term progression (slots exceed player level)  
✅ Experimentation (loadouts free to change)  
✅ Specialization rewarded (focus builds are strong)

### Design Cleanliness
✅ No hero attachment issues  
✅ Predictable AI behavior (loadout doctrines)  
✅ Scalable balance (role-locked slots)  
✅ Clear progression path (unlock → assign → upgrade)

### Technical Benefits
✅ Instant AI mirroring (no async issues)  
✅ Loadouts decouple from units (swappable)  
✅ Role system enforces composition  
✅ Cost scaling prevents exploits

---

## 📝 Developer Notes

### State Structure
```javascript
state.progression.skillPoints        // Current spendable SP
state.progression.totalSkillPoints   // Lifetime total earned

state.slotSystem.guards[]            // 5 guard slot objects
state.slotSystem.allies[]            // 10 ally slot objects
state.slotSystem.aiTeams.teamA/B/C   // Mirrored AI slots

state.zoneConfig.zoneTier            // Current tier (level/5 + 1)
```

### Slot Object Schema
```javascript
{
  id: 'guard_tank',        // Unique identifier
  role: 'tank',            // tank|dps|healer|flex
  unlocked: false,         // Has player unlocked this?
  level: 0,                // Current slot level (0 = locked)
  loadoutId: null          // Assigned loadout ID (null = none)
}
```

### Key Functions
```javascript
findSlot(state, slotId)                    // Get slot by ID
mirrorSlotToAI(state, slotId, action, data) // Sync to AI teams
respawnGuardsForSlot(state, slotId)        // Update guard levels
levelUpAllyForSlot(state, slotId)          // Update ally levels
```

---

**Last Updated:** January 8, 2026  
**System Status:** Core implementation complete, UI pending
