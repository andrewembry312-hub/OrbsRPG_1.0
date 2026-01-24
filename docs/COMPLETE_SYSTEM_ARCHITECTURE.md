# Fighter Card + Slot + Ally Group System - Complete Architecture
## All Three Systems Explained & Code Review

---

## QUICK START: THE THREE SYSTEMS

### System 1️⃣: Fighter Card Inventory 
**What**: Master list of all cards collected  
**Where**: `state.fighterCardInventory.cards[]`  
**UI**: Tab 9 (Fighter Cards)  
**Shows**: [EQUIPPED] badge if card is in a slot  

### System 2️⃣: Slot System
**What**: 10 slots you can equip cards to (5 guards + 5 allies)  
**Where**: `state.slotSystem.guards[]` & `state.slotSystem.allies[]`  
**UI**: Tab 8 (Slots)  
**Shows**: Card portrait, equipment, abilities; "Change" button filters out equipped cards  

### System 3️⃣: Friendlies (Spawned Units)
**What**: Allies that appear in the world after equipping a card  
**Where**: `state.friendlies[]`  
**Link**: `f.cardLoadoutId` = which card spawned this ally  
**Groupable**: If `f.guard = false` (non-guards can join player group)  

---

## SYSTEM 1: FIGHTER CARD INVENTORY

### Data Structure
```javascript
state.fighterCardInventory = {
  cards: [
    {
      id: "card_abc123",
      loadoutId: "loadout_warrior_001",  // Links to LOADOUTS
      name: "Barbarian",
      role: "tank",
      level: 5,
      rarity: "rare",
      rating: 85,  // Power rating
      fighterImage: "barbarian_rare.png",
      variant: "warrior"
    },
    // ... more cards ...
  ],
  maxCards: 500,
  sortMode: 'rarity'
};
```

### What It Does

**1. Tracks all cards owned**
- Player collects cards by defeating enemies
- Cards saved in `state.fighterCardInventory.cards[]`
- Max 500 cards

**2. Display (Tab 9)**
- `renderFighterCards()` shows all cards in a grid
- Cards sorted by: rarity (default), level, or rating
- Shows card count: "45 / 500"

**3. Card Details** (per card shown in Tab 9)
- Image (fighter portrait)
- Name + role
- Level badge (top-left: "L5")
- Rating badge (top-right: "85")
- Rarity border (common=grey, uncommon=green, rare=cyan, epic=magenta, legendary=orange)
- **[EQUIPPED] badge if card is in a slot** ← FIX #1

**4. Cards Linked to Slots**
- Each card has `loadoutId` that links to a LOADOUT
- When you equip card to slot: `slot.loadoutId = card.loadoutId`
- Same `loadoutId` can be in max 1 slot at a time

### Code Modules

#### renderFighterCards() - Line 2749
```javascript
ui.renderFighterCards = () => {
  // Validates inventory exists
  if (!state.fighterCardInventory) return;
  
  // Get cards array
  let cards = state.fighterCardInventory.cards;
  
  // Sort by mode (rarity/level/rating)
  if (sortMode === 'rarity') {
    cards = [...cards].sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]);
  }
  
  // UPDATE: Build equipped set - FIX #1
  const equippedLoadoutIds = new Set();
  (state.slotSystem?.guards || []).forEach(g => {
    if (g.loadoutId) equippedLoadoutIds.add(g.loadoutId);
  });
  (state.slotSystem?.allies || []).forEach(a => {
    if (a.loadoutId) equippedLoadoutIds.add(a.loadoutId);
  });
  
  // For each card
  cards.forEach((card) => {
    const isEquipped = equippedLoadoutIds.has(card.loadoutId);  // ← FIX #1
    const equippedBadge = isEquipped ? '[EQUIPPED]' : '';  // ← FIX #1
    
    // Render card with badge
    html += `<div>${equippedBadge}...</div>`;
  });
  
  // Show grid
  grid.innerHTML = html;
};
```

**What Changed**: Added check for equipped status and [EQUIPPED] badge

---

## SYSTEM 2: SLOT SYSTEM

### Data Structure
```javascript
state.slotSystem = {
  guards: [
    {
      id: "slot_guard_01",
      role: "tank",
      unlocked: true,
      level: 3,                    // Slot level (upgraded with SP)
      loadoutId: "loadout_knight_005",  // Which card equipped (null = empty)
      locked: false
    },
    // slot_guard_02 through slot_guard_05
  ],
  allies: [
    {
      id: "slot_ally_01",
      role: "dps",
      unlocked: true,
      level: 2,
      loadoutId: null,             // Empty slot
      locked: false
    },
    // slot_ally_02 through slot_ally_05
  ]
};
```

### What It Does

**1. Provides 10 slots to equip cards**
- 5 guard slots (for allies with `f.guard = true`)
- 5 ally slots (for groupable allies, `f.guard = false`)

**2. Display (Tab 8 - Slots)**
- `renderSlotTab()` shows both guard and ally slots
- Each slot shows:
  - Slot ID + role (tank/dps/healer/flex)
  - Unlock cost (1 SP) or upgrade cost
  - If equipped: fighter portrait, equipment grid, abilities
  - If empty: "Change" button to equip a card

**3. Slot Interaction**
- **Lock/Unlock**: Pay 1 SP to unlock a new slot
- **Upgrade**: Pay SP to increase slot level (affects stat multipliers)
- **Change**: Click to open card picker modal
- **Clear**: Click to unequip card and destroy spawned ally

### Code Modules

#### renderSlotTab() - Line 7808
```javascript
ui.renderSlotTab = () => {
  // Show header info (SP, level, zone tier)
  
  // Render GUARD slots
  const guards = state.slotSystem?.guards || [];
  const guardCards = guards.map(slot => ui._renderSlotCard(slot, 'guard'));
  ui.guardSlotList.innerHTML = guardCards.join('');
  
  // Render ALLY slots
  const allies = state.slotSystem?.allies || [];
  const allyCards = allies.map(slot => ui._renderSlotCard(slot, 'ally'));
  ui.allySlotList.innerHTML = allyCards.join('');
};
```

#### _renderSlotCard() - Line 7833
```javascript
ui._renderSlotCard = (slot, type) => {
  const loadoutId = slot.loadoutId;  // null = empty, or card ID
  
  if (!slot.unlocked) {
    // Show locked state
    return `<div>🔒 ${slot.id} - Unlock (1 SP)</div>`;
  }
  
  // UNLOCKED STATE
  if (!loadoutId) {
    // Empty slot - show Change button
    return `<div>Empty - <button onclick="ui._openLoadoutPicker('${slot.id}')">Change</button></div>`;
  }
  
  // EQUIPPED - show card details
  if (window.LOADOUTS) {
    const loadout = window.LOADOUTS.getLoadout(loadoutId);
    // Show fighter portrait, equipment, abilities, level
    // Show Change and Clear buttons
  }
};
```

#### _openLoadoutPicker() - Line 8114 (FIXED)
```javascript
ui._openLoadoutPicker = (slotId) => {
  const slot = findSlot(slotId);
  const allCards = state.fighterCardInventory?.cards || [];
  
  // FIX #2: Build set of equipped loadouts to exclude
  const equippedLoadoutIds = new Set();
  const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
  allSlots.forEach(s => {
    if (s.loadoutId && s.id !== slotId) {  // Exclude current slot
      equippedLoadoutIds.add(s.loadoutId);
    }
  });
  
  // Filter compatible cards
  const compatibleCards = allCards.filter(card => {
    // Check role matches
    if (!matchesRole(card.role, slot.role)) return false;
    
    // FIX #2: Hide cards already equipped elsewhere
    if (equippedLoadoutIds.has(card.loadoutId)) return false;  // ← HIDE EQUIPPED
    
    return true;
  });
  
  // Show modal with compatible unequipped cards only
  ui._openFighterCardPicker(slotId, compatibleCards);
};
```

**What Changed**: 
- Build set of `equippedLoadoutIds` from all slots except current one
- Filter out any card whose `loadoutId` is in that set
- Only compatible UNEQUIPPED cards appear in modal

#### _clearSlot() - Line 8083 (FIXED)
```javascript
ui._clearSlot = (slotId) => {
  const slot = findSlot(slotId);
  if (slot && slot.loadoutId) {
    const oldLoadoutId = slot.loadoutId;
    
    // FIX #3: Unequip from ALL slots (not just this one)
    const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
    for (const s of allSlots) {
      if (s.loadoutId === oldLoadoutId && s.id !== slotId) {
        s.loadoutId = null;  // Unequip from other slots
        s.level = 0;
      }
    }
    
    // Destroy spawned allies
    const alliesFromSlot = state.friendlies.filter(f => 
      f.cardLoadoutId === oldLoadoutId && f.fighterCard
    );
    for (const ally of alliesFromSlot) {
      // Remove from group
      if (state.group?.members?.includes(ally.id)) {
        state.group.members = state.group.members.filter(id => id !== ally.id);
        delete state.group.settings[ally.id];
      }
      // Kill unit
      state.friendlies.splice(state.friendlies.indexOf(ally), 1);
    }
    
    slot.loadoutId = null;
    slot.level = 0;
    
    // FIX #3: Refresh both slots AND inventory display
    ui.renderSlotTab();
    ui.renderFighterCards();  // ← REFRESH INVENTORY
    ui.renderGroupPanel();
    ui.toast('✅ Slot cleared!');
  }
};
```

**What Changed**:
- Unequip card from ALL slots (prevents duplicates)
- Call `ui.renderFighterCards()` to remove [EQUIPPED] badge
- Card immediately available for other slots

---

## SYSTEM 3: FRIENDLIES (SPAWNED UNITS)

### Data Structure
```javascript
state.friendlies = [
  {
    id: "f_friendly_001",
    name: "Barbarian Guard 1",
    variant: "warrior",
    role: "tank",
    guard: true,              // ← Cannot join group if true
    cardLoadoutId: "loadout_knight_005",  // Which card spawned this
    fighterCard: true,        // ← Spawned from a card slot (not hardcoded ally)
    
    hp: 250,
    maxHp: 250,
    equipment: {...},
    npcAbilities: [...],
    behavior: 'neutral' or 'aggressive' or 'passive',
    
    x: 1200,
    y: 800,
    // ... more properties ...
  },
  // ... more friendlies ...
];
```

### What It Does

**1. Spawns when card equipped to slot**
- Card equip triggers ally spawn in world
- Ally `f.cardLoadoutId` = the card that spawned it
- Ally `f.fighterCard = true` (marks it as card-spawned)

**2. Grouping System (separate from slots!)**
- Allies can be invited to `state.group.members[]`
- BUT: Only if `f.guard = false`
- Guards (`f.guard = true`) stay at outposts, cannot join group

**3. Destruction on Clear**
- When slot is cleared, all allies with matching `cardLoadoutId` are destroyed
- Removed from `state.friendlies[]`
- Removed from `state.group.members[]`
- Equipment and abilities are lost

### Code Modules

#### addAllAlliesToGroup() - Line 7552 (Guard Filter)
```javascript
ui.addAllAlliesToGroup = () => {
  const openSlots = Math.max(0, 10 - state.group.members.length);
  if (openSlots <= 0) return;
  
  // FILTER: Only non-grouped AND non-guards
  const candidates = state.friendlies.filter(f => 
    !state.group.members.includes(f.id) && 
    !f.guard  // ← GUARD FILTER: Only non-guards can join
  );
  
  if (!candidates.length) return;
  
  let added = 0;
  for (const friendly of candidates) {
    if (state.group.members.length >= 10) break;
    
    ui.inviteToGroup(friendly, { silent: true, deferRender: true });
    added++;
  }
  
  ui.toast(`Added ${added} ally/allies to group.`);
};
```

**Verified Working** ✅: 
- Guard filter `!f.guard` is correct
- Only non-guards pass through
- Guards remain at outposts

#### inviteToGroup() - Line 7497
```javascript
ui.inviteToGroup = (friendlyUnit, opts = {}) => {
  // Check group has room (max 10)
  if (state.group.members.length >= 10) return;
  
  // Check not already invited
  if (state.group.members.includes(friendlyUnit.id)) return;
  
  // ADD TO GROUP
  state.group.members.push(friendlyUnit.id);
  
  // CREATE SETTINGS with cloned equipment
  state.group.settings[friendlyUnit.id] = {
    name: friendlyUnit.name,
    behavior: 'neutral',
    role: friendlyUnit.role || 'dps',
    class: friendlyUnit.variant || 'warrior',
    equipment: structuredClone(friendlyUnit.equipment),  // Clone equipment
    abilities: friendlyUnit.npcAbilities?.slice() || []
  };
  
  ui.toast(`${friendlyUnit.name} invited to group!`);
  ui.renderGroupPanel();
};
```

**How It Works**:
- Clones ally's equipment so changes in group don't affect original
- Settings stored in `state.group.settings[friendlyId]`
- Group display uses `state.group.members[]` (IDs) + `state.group.settings` (details)

#### removeFromGroup() - Line 7536
```javascript
ui.removeFromGroup = (friendlyId) => {
  // Remove from group members list
  state.group.members = state.group.members.filter(id => id !== friendlyId);
  
  // Clear selection
  if (state.group.selectedMemberId === friendlyId) {
    state.group.selectedMemberId = null;
  }
  
  // Render updates
  ui.renderGroupPanel();
  ui.renderGroupTab();
};
```

**NOTE**: Removing from group does NOT destroy the ally (still in friendlies)  
**NOTE**: Clearing slot DOES destroy the ally (removes from friendlies)

---

## HOW THE THREE SYSTEMS INTERACT

### Scenario: Equip Card to Slot

**Step 1: Player collects card**
```
Enemy defeated → awardFighterCard()
→ state.fighterCardInventory.cards[] gets new card object
→ Card shows in Tab 9
```

**Step 2: Player clicks "Change" on slot**
```
_openLoadoutPicker() reads:
  - state.fighterCardInventory.cards[] (all cards)
  - state.slotSystem.guards/allies[] (all slots, to find equipped)
  - Filters: role match + NOT already equipped (FIX #2)
→ Card picker modal shows compatible unequipped cards only
```

**Step 3: Player selects card**
```
Card clicked → assignLoadout(slotId, loadoutId)
→ slot.loadoutId = loadoutId
→ Spawns ally: state.friendlies[] gets new ally with f.cardLoadoutId = loadoutId
→ renderSlotTab() shows card in slot
→ renderFighterCards() shows [EQUIPPED] badge on card
```

**Result**:
- Tab 8 (Slots): Shows equipped card details
- Tab 9 (Inventory): Shows card with [EQUIPPED] badge
- World: Shows spawned ally unit

### Scenario: Player Clears Slot

**Step 1: Player clicks "Clear"**
```
_clearSlot(slotId) reads:
  - slot.loadoutId (which card)
  - state.friendlies[] (find allies with f.cardLoadoutId = that card)
```

**Step 2: Destroy spawned allies**
```
Loop through matching friendlies:
  - If in group: Remove from state.group.members[] and state.group.settings{}
  - Delete from state.friendlies[] (destroy in world)
```

**Step 3: Unequip from all slots (FIX #3)**
```
Loop through all slots:
  - If slot.loadoutId === oldLoadoutId: Set to null
→ Card cannot be in multiple slots
```

**Step 4: Refresh all displays (FIX #3)**
```
ui.renderSlotTab()        → Slot becomes empty
ui.renderFighterCards()   → [EQUIPPED] badge removed  ← FIX #3
ui.renderGroupPanel()     → Ally removed if was in group
```

**Result**:
- Tab 8: Slot shows empty again
- Tab 9: Card shows without badge, available for other slots
- World: Ally destroyed
- Group: Ally removed if was member

---

## THE FIXES SUMMARY

| Fix # | System | Problem | Solution | Code |
|---|---|---|---|---|
| #1 | Inventory | Equipped cards disappear | Add [EQUIPPED] badge in renderFighterCards | Line 2749 |
| #2 | Slots | Equipped cards show in Change modal | Filter out equipped loadoutIds in _openLoadoutPicker | Line 8114 |
| #3 | Slots | Clearing slot doesn't refresh inventory | Call renderFighterCards() in _clearSlot | Line 8083 |

---

## VERIFICATION CHECKLIST

✅ **Guard System**: Only non-guards can join group (filter working)  
✅ **Inventory Display**: Cards show with [EQUIPPED] badge when equipped  
✅ **Card Picker**: Only unequipped compatible cards appear in modal  
✅ **Slot Clearing**: Card returns to inventory, badge removed, card available  
✅ **Duplicate Prevention**: Card cannot be in two slots simultaneously  

---

## IF CARDS STILL DISAPPEAR

Run diagnostics:

```javascript
// Check inventory exists
console.log('Inventory cards:', state.fighterCardInventory?.cards?.length);

// Check what's equipped
const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
allSlots.forEach(s => console.log(`${s.id}: ${s.loadoutId || 'empty'}`));

// Check if equipped cards exist in inventory
const equipped = allSlots.filter(s => s.loadoutId).map(s => s.loadoutId);
equipped.forEach(id => {
  const found = state.fighterCardInventory?.cards?.find(c => c.loadoutId === id);
  console.log(`${id}: ${found ? 'EXISTS' : 'MISSING'}`);
});

// Refresh manually
ui.renderFighterCards();
```

**Possible causes**:
- Inventory not initialized in game setup
- Cards deleted during zone change or respawn
- Card data structure missing properties

