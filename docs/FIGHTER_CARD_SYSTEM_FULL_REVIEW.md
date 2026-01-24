# Fighter Card System - Complete Code Review
## What Should Work vs. What Is Broken

---

## OVERVIEW: THE SYSTEM ARCHITECTURE

The fighter card system has THREE SEPARATE SYSTEMS that must work together:

```
SYSTEM 1: FIGHTER CARD INVENTORY
  state.fighterCardInventory.cards[]  ← Master list of all cards owned
  ├─ id (unique)
  ├─ loadoutId (links to LOADOUTS)
  ├─ name, role, level, rarity, rating
  └─ fighterImage (asset path)
  
SYSTEM 2: SLOT SYSTEM
  state.slotSystem.guards[]           ← Guard slots (5 total)
  state.slotSystem.allies[]           ← Ally slots (5 total)
  ├─ id (slot_01, slot_02, etc)
  ├─ loadoutId (which card equipped, or null)
  ├─ level (slot level, not card level)
  ├─ role (tank, dps, healer, flex)
  └─ unlocked (boolean)
  
SYSTEM 3: FRIENDLIES (SPAWNED UNITS)
  state.friendlies[]                  ← Allies spawned in world
  ├─ id (unique, f_xxxxx)
  ├─ cardLoadoutId (which card spawned it)
  ├─ fighterCard (boolean, if true = spawned from card)
  ├─ name, hp, equipment, role
  └─ guard (boolean, if true = stays at outpost)
```

---

## WHAT SHOULD HAPPEN

### Scenario 1: Collecting Cards
1. ✅ Player defeats enemies → `awardFighterCard()` adds card to `state.fighterCardInventory.cards[]`
2. ✅ Card shows in **Tab 9 (Fighter Cards/Inventory)**
3. ✅ renderFighterCards() displays all cards, sorted by rarity/level
4. ✅ Cards NOT in any slot should be clickable in inventory

### Scenario 2: Equipping Card to Slot
1. ✅ Click "Change" button on guard/ally slot
2. ✅ Modal shows ONLY cards matching slot role
3. ✅ Select a card → `assignLoadout(slotId, loadoutId)` assigns it
4. ✅ Slot shows card details, image, level, role
5. ⚠️ **CRITICAL**: Card should be HIDDEN from "Change" UI if already equipped elsewhere
6. ⚠️ **CRITICAL**: Equipped cards should NOT show in inventory (Tab 9) OR show as [EQUIPPED]

### Scenario 3: Guard System
1. ✅ Friendlies with `f.guard = true` should NOT appear in invite list
2. ✅ `addAllAlliesToGroup()` filters `!f.guard`
3. ✅ Only non-guard allies can be invited to group
4. ✅ Guards stay at outpost protecting flags

---

## WHAT IS ACTUALLY BROKEN

### BUG #1: Cards Disappearing from Inventory
**Symptom**: "All fighter cards disappeared"
**Expected**: Cards should always be visible in Tab 9
**Actual**: Inventory shows 0 cards

**Possible Causes**:
- `state.fighterCardInventory.cards[]` is empty or undefined
- Cards are being deleted when slots clear
- Card inventory is reset on zone change/respawn

**Code to Check**:
```javascript
// Line 2757 in ui.js - renderFighterCards()
ui.renderFighterCards = () => {
  if (!state.fighterCardInventory) return;  // ← STOPS HERE if inventory doesn't exist
  let cards = state.fighterCardInventory.cards;  // ← USES THIS ARRAY
  if (!grid) return;
  // ... displays cards ...
};

// Line 8090 in ui.js - _clearSlot()
ui._clearSlot = (slotId) => {
  // ... this DESTROYS friendlies that were spawned from the slot
  // BUT SHOULD NOT delete the card from inventory
};
```

### BUG #2: Equipped Cards Show in "Change" UI
**Symptom**: Can select a card that's already equipped in another slot
**Expected**: Equipped cards should be greyed out or hidden from Change modal
**Actual**: All compatible cards show, no indicator which are equipped

**Code to Check**:
```javascript
// Line 8114 in ui.js - _openLoadoutPicker()
ui._openLoadoutPicker = (slotId) => {
  const compatibleCards = allCards.filter(card => {
    // Filters by ROLE only
    // Does NOT check if card is already equipped elsewhere
  });
  // ← THIS IS THE BUG: No filter for equipped cards
};

// Line 8167 in ui.js - _openFighterCardPicker()
ui._openFighterCardPicker = (slotId, cards) => {
  cards.forEach(card => {
    // Shows comparison badge for rating
    // But DOES NOT prevent selecting already-equipped card
  });
};
```

### BUG #3: Guard Filter May Not Work on All Allies
**Symptom**: Guards appearing in invite list despite `!f.guard` filter
**Expected**: Only non-guards should be invitable
**Actual**: Guards may still show or be invitable

**Code to Check**:
```javascript
// Line 7552 in ui.js - addAllAlliesToGroup()
const candidates = state.friendlies.filter(f => 
  !state.group.members.includes(f.id) && 
  !f.guard  // ← THIS FILTER
);

// Line 7711 in ui.js - renderAlliesTab()
const allies = (state.friendlies||[]).filter(f=>f.respawnT<=0);
// Shows ALL allies with badge
// Allies show "Guard", "In Group", or "Ally"
// But click "Invite" button only works on non-guards
```

### BUG #4: Slot System Not Synced with Card Inventory
**Symptom**: "No allies in slots but show in main list"
**Expected**: Cards assigned to slots should display in Tab 8 (Slots)
**Actual**: Slots empty even though cards exist

**Root Cause**: Likely these issues:
1. Slot loadoutId is null when it should have a value
2. Card inventory has cards but none are assigned to slots
3. Cards were unequipped (_clearSlot) but not re-added to inventory

---

## THE CODE MODULES - COMPLETE REVIEW

### MODULE 1: FIGHTER CARD INVENTORY DISPLAY (ui.js Lines 2749-2850)

```javascript
ui.renderFighterCards = () => {
  if (!state.fighterCardInventory) return;  // ← SAFETY CHECK 1
  
  const grid = document.getElementById('fighterCardsGrid');
  const countEl = document.getElementById('cardCount');
  
  if (!grid) return;  // ← SAFETY CHECK 2
  
  // GET CARDS FROM INVENTORY
  let cards = state.fighterCardInventory.cards;  // ← SOURCE OF TRUTH
  const maxSlots = 500;
  
  // SORT CARDS
  const sortMode = ui.currentCardSort || 'rarity';
  if (sortMode === 'rarity') {
    const rarityRank = {legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1};
    cards = [...cards].sort((a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0));
  }
  
  // UPDATE COUNT DISPLAY
  countEl.textContent = `${cards.length} / ${maxSlots}`;  // ← SHOWS HOW MANY
  
  // RENDER EACH CARD
  cards.forEach((card, idx) => {
    // Build HTML for card with:
    // - Image (card.fighterImage)
    // - Name (card.name)
    // - Rarity border (card.rarity)
    // - Level/Rating badges
    // - Click handler: ui._showFighterPreview(card.loadoutId)
  });
  
  // RENDER EMPTY SLOTS
  for (let i = cards.length; i < maxSlots; i++) {
    // Show empty slots up to 500
  }
};
```

**WHAT'S MISSING**: No check for `isEquipped`. Cards that are assigned to slots still show here.

**BROKEN BEHAVIOR**: 
- Cards disappear completely (cards array is empty)
- OR cards are shown but can be selected even when equipped

**FIX NEEDED**: Filter out equipped cards OR mark them [EQUIPPED]

---

### MODULE 2: SLOT RENDERING (ui.js Lines 7808-8080)

```javascript
ui.renderSlotTab = () => {
  if (!ui.guardSlotList || !ui.allySlotList) return;
  
  // UPDATE HEADER INFO (SP, level, zone tier)
  
  // RENDER GUARD SLOTS
  const guards = state.slotSystem?.guards || [];
  const guardCards = guards.map(slot => ui._renderSlotCard(slot, 'guard'));
  ui.guardSlotList.innerHTML = guardCards.join('');
  
  // RENDER ALLY SLOTS
  const allies = state.slotSystem?.allies || [];
  const allyCards = allies.map(slot => ui._renderSlotCard(slot, 'ally'));
  ui.allySlotList.innerHTML = allyCards.join('');
};

// Render individual slot
ui._renderSlotCard = (slot, type) => {
  const loadoutId = slot.loadoutId || null;  // ← KEY: What's equipped?
  
  if (!unlocked) {
    // Show locked state with unlock button (1 SP)
    return `<div>🔒 ${slot.id} - Unlock (1 SP)</div>`;
  }
  
  // UNLOCKED STATE
  if (loadoutId && window.LOADOUTS) {
    const loadout = window.LOADOUTS.getLoadout(loadoutId);
    // Shows: Fighter portrait, name, role, level, equipment, abilities
    // Has "Change" button to switch cards
    // Has "Clear" button to unequip
  } else {
    // No card equipped, shows empty state with "Change" button
  }
};
```

**WORKING**: Displays slot state correctly if `loadoutId` is set

**BROKEN**: 
- `loadoutId` is null when it should have a value
- Cards not being assigned to slots properly
- OR cards being cleared from slots when they shouldn't be

**FIX NEEDED**: Verify that cards are actually being assigned to slots

---

### MODULE 3: CHANGE CARD MODAL (ui.js Lines 8114-8450)

```javascript
// STEP 1: Player clicks "Change" button on slot
ui._openLoadoutPicker = (slotId) => {
  const slot = findSlot(slotId);
  const allCards = state.fighterCardInventory?.cards || [];  // ← GET ALL CARDS
  
  // FILTER BY ROLE ONLY
  const compatibleCards = allCards.filter(card => {
    const cardRole = card.role?.toLowerCase() || 'flex';
    const slotRole = slot.role.toLowerCase();
    
    if (slotRole === 'flex') return true;        // Flex accepts all
    if (slotRole === 'support' && cardRole === 'healer') return true;
    if (slotRole === 'elite' && (cardRole === 'tank' || cardRole === 'dps')) return true;
    
    return cardRole === slotRole;  // Exact match
  });
  
  // ← BUG IS HERE: No check for already-equipped cards
  // All compatible cards show, even if equipped elsewhere
  
  ui._openFighterCardPicker(slotId, compatibleCards);
};

// STEP 2: Show modal with card grid
ui._openFighterCardPicker = (slotId, cards) => {
  // Create modal with 5-column grid
  // For each card:
  //   - Show image
  //   - Show comparison badge (↑ Better / ↓ Weaker vs. current)
  //   - Click to equip
  
  cards.forEach(card => {
    // ← Check if card is equipped elsewhere
    const equippedCard = allCards.find(c => c.loadoutId === equippedLoadoutId);
    
    if (equippedCard) {
      // Show comparison badge
      // BUT DOES NOT DISABLE OR HIDE the card
    }
    
    cardEl.onclick = () => {
      window.SLOTS.assignLoadout(slotId, card.loadoutId);  // ← ASSIGNS CARD
      ui.renderSlotTab();
    };
  });
};
```

**BUG #1**: No filter for equipped cards
- Cards already assigned to OTHER slots still appear
- Player can click them again (may overwrite other slot)

**BUG #2**: Comparison badge doesn't prevent selection
- Badge shows ↑ Better or ↓ Weaker
- But player can still select a worse card

**FIX NEEDED**: 
```javascript
// Add filter BEFORE showing cards:
const equippedLoadoutIds = new Set();
(state.slotSystem?.guards || []).forEach(g => {
  if (g.loadoutId) equippedLoadoutIds.add(g.loadoutId);
});
(state.slotSystem?.allies || []).forEach(a => {
  if (a.loadoutId) equippedLoadoutIds.add(a.loadoutId);
});

const compatibleCards = allCards.filter(card => {
  // Keep existing role filter
  if (!matchesRole(card, slot)) return false;
  
  // NEW: Hide cards already equipped elsewhere
  if (equippedLoadoutIds.has(card.loadoutId)) return false;
  
  return true;
});
```

---

### MODULE 4: CLEAR SLOT ACTION (ui.js Lines 8083-8104)

```javascript
ui._clearSlot = (slotId) => {
  const slot = findSlot(slotId);
  
  if (slot && slot.loadoutId) {
    const oldLoadoutId = slot.loadoutId;
    
    // DESTROY spawned allies that were from this slot
    const alliesFromSlot = state.friendlies.filter(f => 
      f.cardLoadoutId === oldLoadoutId && f.fighterCard
    );
    
    for (const ally of alliesFromSlot) {
      // Remove from group
      state.group.members = state.group.members.filter(id => id !== ally.id);
      
      // Kill the unit
      const idx = state.friendlies.indexOf(ally);
      if (idx >= 0) {
        state.friendlies.splice(idx, 1);  // ← REMOVES FROM WORLD
      }
    }
    
    // Clear the slot
    slot.loadoutId = null;
    slot.level = 0;
    
    // ← MISSING: Does NOT remove card from inventory!
    // Card should still exist in state.fighterCardInventory.cards[]
  }
};
```

**CORRECT**: Removes allies from world but preserves card in inventory
**ISSUE**: May need to verify card still exists after this operation

---

### MODULE 5: GUARD SYSTEM & ALLY INVITE (ui.js Lines 7497-7570)

```javascript
// ADD ALL ALLIES TO GROUP
ui.addAllAlliesToGroup = () => {
  const openSlots = Math.max(0, 10 - state.group.members.length);
  if (openSlots <= 0) return;
  
  // FILTER: Only non-grouped, non-guards
  const candidates = state.friendlies.filter(f => 
    !state.group.members.includes(f.id) && 
    !f.guard  // ← GUARD FILTER - CORRECT
  );
  
  if (!candidates.length) {
    ui.toast('No allies available to add.');
    return;
  }
  
  // Add each candidate
  for (const friendly of candidates) {
    if (state.group.members.length >= 10) break;
    ui.inviteToGroup(friendly, { silent: true, deferRender: true });
  }
};

// INVITE SINGLE ALLY
ui.inviteToGroup = (friendlyUnit, opts = {}) => {
  // Check: Group has room
  if (state.group.members.length >= 10) return;
  
  // Check: Not already in group
  if (state.group.members.includes(friendlyUnit.id)) return;
  
  // ADD TO GROUP
  state.group.members.push(friendlyUnit.id);
  
  // CREATE SETTINGS with cloned equipment
  const baseEquip = structuredClone(friendlyUnit.equipment);
  state.group.settings[friendlyUnit.id] = {
    name: friendlyUnit.name,
    behavior: 'neutral',
    role: friendlyUnit.role || 'dps',
    class: friendlyUnit.variant || 'warrior',
    equipment: baseEquip,
    abilities: friendlyUnit.npcAbilities?.slice() || []
  };
};
```

**CORRECT**: Guard filter works - only non-guards can be invited
**NOTE**: This system is separate from fighter card slots - different UI/mechanics
**WORKS**: Guards (f.guard = true) cannot be invited to group

---

## DIAGNOSIS SUMMARY

### Cards Disappearing: THREE POSSIBLE ROOT CAUSES

#### Cause 1: Inventory Not Initialized
```javascript
// Check if this is set up in state initialization:
state.fighterCardInventory = {
  cards: [],           // ← Starts empty or not created?
  maxCards: 500,
  sortMode: 'rarity'
};

// If not initialized, renderFighterCards() returns early (line 2750)
if (!state.fighterCardInventory) return;
```

**Check Console**:
```javascript
console.log('Inventory:', state.fighterCardInventory?.cards?.length);
console.log('First card:', state.fighterCardInventory?.cards?.[0]);
```

#### Cause 2: Cards Deleted on Zone Change
```javascript
// In game.js, somewhere in zone transition:
// IF this happens, cards are lost:
state.fighterCardInventory.cards = [];  // ← BUG!

// OR if inventory is reset but old cards not migrated:
state = newGameState();  // ← New state doesn't copy cards from old state
```

#### Cause 3: Cards Are There But Not Rendered
```javascript
// Cards exist in array but renderFighterCards() not called
// OR rendered to wrong element
// OR element is hidden/deleted

// Check:
console.log('Cards in inventory:', state.fighterCardInventory.cards.length);
console.log('Grid element:', document.getElementById('fighterCardsGrid'));
console.log('Tab 9 visible:', document.getElementById('fighterCards')?.offsetParent);
```

---

## THE FIXES NEEDED

### FIX #1: Hide Equipped Cards from "Change" Modal
**Location**: ui.js line 8114 (_openLoadoutPicker)
**Change**: Add filter for already-equipped loadouts

```javascript
ui._openLoadoutPicker = (slotId) => {
  // ... existing code ...
  
  // NEW: Build set of equipped loadout IDs
  const equippedLoadoutIds = new Set();
  const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
  allSlots.forEach(s => {
    if (s.loadoutId && s.id !== slotId) {  // Exclude current slot
      equippedLoadoutIds.add(s.loadoutId);
    }
  });
  
  // MODIFIED: Filter out equipped cards
  const compatibleCards = allCards.filter(card => {
    // Role matching (existing logic)
    const cardRole = card.role?.toLowerCase() || 'flex';
    const slotRole = slot.role.toLowerCase();
    if (slotRole === 'flex') return true;
    // ... rest of role checks ...
    
    // NEW: Hide equipped cards
    if (equippedLoadoutIds.has(card.loadoutId)) return false;
    
    return true;
  });
};
```

### FIX #2: Mark Equipped Cards in Inventory
**Location**: ui.js line 2749 (renderFighterCards)
**Change**: Add [EQUIPPED] badge to cards that are assigned to slots

```javascript
ui.renderFighterCards = () => {
  // ... existing code ...
  
  // NEW: Build set of equipped loadout IDs
  const equippedLoadoutIds = new Set();
  (state.slotSystem?.guards || []).forEach(g => {
    if (g.loadoutId) equippedLoadoutIds.add(g.loadoutId);
  });
  (state.slotSystem?.allies || []).forEach(a => {
    if (a.loadoutId) equippedLoadoutIds.add(a.loadoutId);
  });
  
  cards.forEach((card, idx) => {
    const isEquipped = equippedLoadoutIds.has(card.loadoutId);
    
    // In the card HTML, add badge:
    const equippedBadge = isEquipped 
      ? '<div style="position:absolute; top:4px; right:4px; background:#2a4a6e; border:2px solid #4a8eff; color:#4a8eff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:3px;">[EQUIPPED]</div>'
      : '';
    
    html += `<div class="fighter-card-slot">${equippedBadge}...</div>`;
  });
};
```

### FIX #3: Fix Ally Unequip Issues
**Location**: ui.js line 8083 (_clearSlot)
**Change**: Also unequip ally from group if present

```javascript
ui._clearSlot = (slotId) => {
  const slot = (state.slotSystem?.guards || []).find(s => s.id === slotId) ||
               (state.slotSystem?.allies || []).find(s => s.id === slotId);
  
  if (slot && slot.loadoutId) {
    const oldLoadoutId = slot.loadoutId;
    
    // Destroy spawned allies
    const alliesFromSlot = state.friendlies.filter(f => 
      f.cardLoadoutId === oldLoadoutId && f.fighterCard
    );
    
    for (const ally of alliesFromSlot) {
      // NEW: Unequip from slots
      for (const s of [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])]) {
        if (s.loadoutId === oldLoadoutId) {
          s.loadoutId = null;
        }
      }
      
      // Remove from group
      if (state.group?.members?.includes(ally.id)) {
        state.group.members = state.group.members.filter(id => id !== ally.id);
        delete state.group.settings[ally.id];
      }
      
      // Kill unit
      const idx = state.friendlies.indexOf(ally);
      if (idx >= 0) state.friendlies.splice(idx, 1);
    }
    
    slot.loadoutId = null;
    slot.level = 0;
    
    ui.renderSlotTab();
    ui.renderGroupPanel();
    ui.toast('✅ Slot cleared! Ally destroyed.');
  }
};
```

### FIX #4: Verify Guard Filter on Invite
**Location**: ui.js line 7552 (addAllAlliesToGroup)
**Status**: ✅ ALREADY CORRECT
**Confirm**: Check console when clicking "Add All"

```javascript
// This is ALREADY CORRECT:
const candidates = state.friendlies.filter(f => 
  !state.group.members.includes(f.id) && 
  !f.guard  // ← This works, only non-guards pass through
);
```

---

## DIAGNOSTIC CONSOLE COMMANDS

Run these in browser console (F12 → Console tab):

```javascript
// Check 1: Do cards exist?
console.log('INVENTORY CHECK');
console.log('Total cards:', state.fighterCardInventory?.cards?.length ?? 'UNDEFINED');
if (state.fighterCardInventory?.cards?.length > 0) {
  console.log('First card:', state.fighterCardInventory.cards[0]);
  console.log('All card loadoutIds:', state.fighterCardInventory.cards.map(c => c.loadoutId));
}

// Check 2: What's equipped in slots?
console.log('\nSLOT CHECK');
const allSlots = [...(state.slotSystem?.guards || []), ...(state.slotSystem?.allies || [])];
allSlots.forEach(s => {
  console.log(`${s.id}: ${s.loadoutId ? 'HAS CARD' : 'EMPTY'}`);
});

// Check 3: Are equipped IDs matching cards?
console.log('\nEQUIPMENT MATCH CHECK');
const equippedIds = allSlots.filter(s => s.loadoutId).map(s => s.loadoutId);
equippedIds.forEach(id => {
  const card = state.fighterCardInventory?.cards?.find(c => c.loadoutId === id);
  console.log(`${id}: ${card ? '✅ FOUND IN INVENTORY' : '❌ NOT IN INVENTORY'}`);
});

// Check 4: Are any cards duplicated in slots?
console.log('\nDUPLICATE CHECK');
const equipped = allSlots.filter(s => s.loadoutId).map(s => s.loadoutId);
const dupes = equipped.filter((id, i) => equipped.indexOf(id) !== i);
console.log('Duplicates:', dupes.length ? dupes : 'None (good!)');

// Check 5: Render the tab and check
console.log('\nTRIGGER RENDER');
ui.renderFighterCards();
console.log('Grid element after render:', document.getElementById('fighterCardsGrid')?.innerHTML?.length, 'chars');
```

---

## EXPECTED BEHAVIOR AFTER FIXES

| Scenario | Before (Broken) | After (Fixed) |
|----------|---|---|
| Collect card | Shows in inventory OR disappears | ✅ Shows in inventory, always |
| Equip card to slot | Card still shows in inventory | ✅ Shows [EQUIPPED] badge |
| Click "Change" button | Equipped cards appear again | ✅ Equipped cards hidden |
| Clear slot | Ally destroyed, card gone | ✅ Card returns to inventory |
| Invite ally | May invite guards (blocked) | ✅ Only non-guards invitable |
| View slots | No cards showing | ✅ Shows equipped cards |
| Reequip old card | Not possible, card missing | ✅ Card available again |

---

## NEXT STEPS

1. **Run diagnostics** - Use console commands above
2. **Identify root cause** - Cards missing? Or not rendering?
3. **Apply fixes** - Implement FIX #1-3 above
4. **Verify** - Cards show, equipped cards hidden, guards blocked
5. **Test** - Equip/unequip/clear/invite sequence
