# Ally Grouping System - Code Review & Issue Analysis

## HOW IT'S SUPPOSED TO WORK

### Three Separate Tracking Systems

```
state.friendlies[]          ← Master list of all ally objects (global)
    ├─ f.id                 ← Unique ID
    ├─ f.hp, f.maxHp       ← Health
    ├─ f.guard              ← Boolean: if true, this is a guard unit (stays at outpost)
    ├─ f.behavior           ← 'neutral', 'aggressive', 'passive'
    ├─ f.role               ← 'dps', 'tank', 'healer'
    ├─ f.variant            ← 'warrior', 'mage', 'warden', 'knight'
    ├─ f.equipment          ← { head, chest, legs, hands, feet, ... }
    └─ f.npcAbilities       ← Ability array

state.group.members[]       ← Array of friendly IDs that are IN the group
    └─ Contains: ["f_12345", "f_67890", ...] up to 10 members

state.group.settings{}      ← Settings for each grouped ally
    ├─ [f.id].name
    ├─ [f.id].behavior
    ├─ [f.id].role
    ├─ [f.id].class
    ├─ [f.id].equipment
    └─ [f.id].abilities

state.slotSystem.allies[]   ← Equipped slots for battle
    ├─ [slot].id            ← slot_01, slot_02, etc
    ├─ [slot].loadoutId     ← Currently equipped friendly ID or null
    ├─ [slot].level         ← Slot power level
    └─ [slot].unlocked
```

### The Card Flow

**Tab 5: ALLIES TAB** (`renderAlliesTab()`)
1. Reads from `state.friendlies[]` (unfiltered)
2. Shows ALL allies (guards, grouped, ungrouped)
3. Cards show badge: "In Group", "Guard", or "Ally"
4. Shows if ally is in `state.group.members[]`
5. Click "Invite" → calls `inviteToGroup()`

**When you click Invite:**
```javascript
ui.inviteToGroup(friendlyUnit) {
  state.group.members.push(friendlyUnit.id)  // Add to group
  state.group.settings[friendlyUnit.id] = {  // Create settings
    equipment: structuredClone(friendlyUnit.equipment),
    abilities: friendlyUnit.npcAbilities,
    ...
  }
}
```

**Tab 4: GROUP TAB** (`renderGroupTab()`)
1. Reads `state.group.members[]` (IDs only)
2. Looks up each ID in `state.friendlies[]`
3. Shows health, role, behavior
4. Shows "Remove" button per member

**Tab 3: SLOTS TAB** (`renderSlotTab()`)
1. Reads `state.slotSystem.allies[]` (equipped slots)
2. Each slot shows who's equipped or "Empty"
3. Click a card to equip into a slot
4. Equipping sets `slot.loadoutId = friendlyUnit.id`

---

## THE BUG YOU'RE SEEING

### Symptom
"Ally cards randomly unequip from slots but stay in group"

### Root Cause Analysis

There are **three possible break points**:

#### **BREAK POINT 1: The Guard Filter** 
**Code:** Line 7552 in ui.js
```javascript
const candidates = state.friendlies.filter(f => 
  !state.group.members.includes(f.id) && 
  !f.guard  // ← THIS LINE
);
```

**The Problem:**
- When you call `addAllAlliesToGroup()`, it filters out all guards
- But what if a guard had `f.guard = true` accidentally set, then cleared?
- Or what if an ally's `f.guard` flag is being toggled at the wrong time?

**Check:** 
```javascript
// In console when allys unequipping:
state.friendlies.forEach(f => console.log(f.id, f.name, 'guard:', f.guard));
```

#### **BREAK POINT 2: Slot-to-Group Sync**
**When an ally is removed from group:**
```javascript
ui.removeFromGroup = (friendlyId) => {
  state.group.members = state.group.members.filter(id => id !== friendlyId);
  // NOTE: Does NOT unequip the ally from slots!
  // If loadoutId still references the removed friend, the slot shows NOTHING
  // but the ally stays in state.friendlies[]
}
```

**This is the actual bug:**
- Remove ally from group → they're still in equipped slots
- Rendering sees `slot.loadoutId = "f_12345"` but the friendly isn't in group anymore
- Some code may be ignoring equipped allies that aren't in group

#### **BREAK POINT 3: renderSlotCard() Consistency**
**Code:** Line 7850+ in ui.js
```javascript
ui._renderSlotCard = (slot, type) => {
  const loadoutId = slot.loadoutId || null;
  const friendly = state.friendlies.find(f => f.id === loadoutId);
  
  if (!friendly) {
    // What happens here? Does it show empty slot?
    // Or does it show a broken card?
  }
}
```

---

## THE EXACT CODE SYSTEM

### 1. Add Ally to Group
```javascript
ui.inviteToGroup = (friendlyUnit, opts={})=>{
  const { silent=false, deferRender=false } = opts;
  
  // Check: Group has room (max 10)
  if(state.group.members.length >= 10){
    ui.toast(`Group full! Max 10 members.`);
    return;
  }
  
  // Check: Not already in group
  if(state.group.members.includes(friendlyUnit.id)){
    ui.toast(`${friendlyUnit.name} is already in the group.`);
    return;
  }
  
  // ADD TO GROUP
  state.group.members.push(friendlyUnit.id);
  
  // CREATE SETTINGS (used in battle)
  const baseEquip = friendlyUnit.equipment 
    ? structuredClone(friendlyUnit.equipment) 
    : Object.fromEntries(ARMOR_SLOTS.map(s=>[s,null]));
  
  const baseAbilities = friendlyUnit.npcAbilities 
    ? friendlyUnit.npcAbilities.slice() 
    : defaultAbilitySlots();
  
  const defaultRole = (friendlyUnit.role
    || (friendlyUnit.variant==='mage' ? 'healer' 
      : ((friendlyUnit.variant==='warden'||friendlyUnit.variant==='knight') ? 'tank' 
        : 'dps')));
  
  state.group.settings[friendlyUnit.id] = {
    name: friendlyUnit.name || 'Ally',
    behavior: 'neutral',
    role: defaultRole,
    class: friendlyUnit.variant || 'warrior',
    equipment: baseEquip,
    abilities: baseAbilities
  };
  
  // RENDER UI
  if(!deferRender){
    ui.renderGroupPanel();
    ui.renderGroupTab();
  }
};
```

### 2. Remove Ally from Group
```javascript
ui.removeFromGroup = (friendlyId)=>{
  // Remove from members list
  state.group.members = state.group.members.filter(id => id !== friendlyId);
  
  // Clear selection
  if(state.group.selectedMemberId === friendlyId) 
    state.group.selectedMemberId = null;
  
  // NOTE: Does NOT automatically unequip from slots
  // This may be the bug - should we clear slot.loadoutId here?
  
  // Clear details panel
  if(ui.groupMemberDetails) ui.groupMemberDetails.innerHTML = '';
  
  // Render
  ui.renderGroupPanel();
  ui.renderGroupTab();
};
```

### 3. Add ALL Allies to Group
```javascript
ui.addAllAlliesToGroup = ()=>{
  const openSlots = Math.max(0, 10 - state.group.members.length);
  if(openSlots <= 0){ ui.toast('Group full! Max 10 members.'); return; }
  
  // FILTER: Only non-grouped, non-guards
  const candidates = state.friendlies.filter(f => 
    !state.group.members.includes(f.id) && 
    !f.guard  // ← Guards must stay at outposts
  );
  
  if(!candidates.length){ ui.toast('No allies available to add.'); return; }
  
  let added = 0;
  for(const friendly of candidates){
    if(state.group.members.length >= 10) break;
    ensureFriendlyIdentity(friendly);
    ui.inviteToGroup(friendly, { silent:true, deferRender:true });
    added++;
  }
  
  ui.renderGroupPanel();
  ui.renderGroupTab();
  ui.toast(`Added ${added} alli${added===1?'y':'es'} to group.`);
};
```

### 4. Render Allies Tab (all allies)
```javascript
ui.renderAlliesTab = ()=>{
  if(!ui.allyList) return;
  
  // Get all living allies
  const allies = (state.friendlies||[]).filter(f=>f.respawnT<=0);
  
  if(allies.length===0){
    ui.allyList.innerHTML = '<div>No allies yet.</div>';
    return;
  }
  
  const cards=[];
  for(const f of allies){
    ensureFriendlyIdentity(f);
    
    // STATUS CHECK
    const inGroup = state.group.members.includes(f.id);
    const guard = !!f.guard;
    
    // Get settings
    const behavior = f.behavior || state.group.settings[f.id]?.behavior || 'neutral';
    const role = (f.role || state.group.settings[f.id]?.role || 'dps');
    const cls = f.variant || 'warrior';
    const hpPct = Math.round((f.hp/f.maxHp)*100);
    
    // Badge: What's the status?
    const badge = inGroup ? 'In Group' : (guard ? 'Guard' : 'Ally');
    
    // Show invite button only if NOT in group and NOT a guard
    const inviteBtn = (!inGroup && !guard) 
      ? `<button onclick="ui._inviteAlly('${f.id}');">Invite</button>` 
      : '';
    
    const card = `
      <div onclick="ui._selectAlly('${f.id}')">
        <div>${f.name} <span>${badge}</span></div>
        <div>${cls} • ${role} • ${behavior}</div>
        <div style="width:${hpPct}%;"></div>
        ${inviteBtn}
      </div>
    `;
    
    cards.push(card);
  }
  
  ui.allyList.innerHTML = cards.join('');
};
```

### 5. Render Group Tab (grouped allies only)
```javascript
ui.renderGroupTab = ()=>{
  if(!ui.groupMembersList) return;
  
  // Start with no members
  if(state.group.members.length === 0){
    ui.groupMembersList.innerHTML = 'No group members. Invite allies to get started.';
    return;
  }
  
  const list = [];
  
  // For each member ID in group
  for(const memberId of state.group.members){
    // Look up the actual friendly object
    const friendly = state.friendlies.find(f => f.id === memberId);
    // Look up the settings
    const settings = state.group.settings[memberId];
    
    // Safety check: both should exist
    if(!friendly || !settings) {
      console.log(`[GROUP] Missing friendly or settings for ${memberId}`);
      continue;  // SKIP THIS MEMBER
    }
    
    const healthPct = Math.round((friendly.hp / friendly.maxHp) * 100);
    const roleU = (settings.role||'dps').toUpperCase();
    
    const card = `
      <div onclick="ui._selectGroupMember('${memberId}')">
        <div>${settings.name} <span>${roleU}</span></div>
        <div>${friendly.hp}/${friendly.maxHp} HP | Role: ${roleU} | Behavior: ${settings.behavior}</div>
        <div style="width:${healthPct}%;"></div>
        <button onclick="ui.removeFromGroup('${memberId}');">Remove</button>
      </div>
    `;
    
    list.push(card);
  }
  
  ui.groupMembersList.innerHTML = list.join('');
};
```

---

## THE BUG DIAGNOSIS

Based on your symptom ("cards unequip but stay in group"), I believe:

**The problem is in removeFromGroup()** — it removes from group but **doesn't unequip from slots**.

### What's happening:

1. Ally is in group: ✅ `state.group.members` includes ID
2. Ally is equipped in slot: ✅ `slot.loadoutId = ID`
3. You click "Remove" from group tab
4. removeFromGroup() clears: `state.group.members.filter(...)`
5. **But slot.loadoutId is still pointing to that ally's ID**
6. Rendering code sees the loadoutId doesn't exist in group anymore
7. Slot renders as empty or broken
8. Friendly object still exists, so ally stays in allies tab

### The Fix:

When removing from group, **also unequip from all slots**:

```javascript
ui.removeFromGroup = (friendlyId)=>{
  // Remove from group
  state.group.members = state.group.members.filter(id => id !== friendlyId);
  
  // ALSO UNEQUIP FROM ALL SLOTS
  for(const slot of [...(state.slotSystem?.allies || [])]) {
    if(slot.loadoutId === friendlyId) {
      slot.loadoutId = null;  // Clear the slot
    }
  }
  
  // Clear selection
  if(state.group.selectedMemberId === friendlyId) 
    state.group.selectedMemberId = null;
  
  if(ui.groupMemberDetails) ui.groupMemberDetails.innerHTML = '';
  
  ui.renderGroupPanel();
  ui.renderGroupTab();
  ui.renderSlotTab();  // ALSO update slot display
};
```

---

## SUMMARY

| System | Location | Purpose |
|--------|----------|---------|
| `state.friendlies[]` | Master list | All allies (global) |
| `state.group.members[]` | Group list | IDs of grouped allies (max 10) |
| `state.group.settings{}` | Group config | Equipment/abilities per grouped ally |
| `state.slotSystem.allies[]` | Battle slots | Equipped allies for combat |

**The bug:** Removing from group doesn't clear equipped slots → cards orphaned
**The fix:** Clear slot.loadoutId when removing from group

