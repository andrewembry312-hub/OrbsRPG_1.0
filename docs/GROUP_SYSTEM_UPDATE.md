# Group System - Major Update

## Summary
Implemented a comprehensive group management system with full inventory/equipment UI, persistent group membership, respawn mechanics, and intelligent follow AI.

## Features Implemented

### 1. UI Repositioning
- **Group Panel**: Moved from top-left to top-right under minimap
  - Position: `right: 10px, top: 140px`
  - Now has `pointer-events: auto` for better interactivity
  - Displays group member health bars and status

### 2. Full-Featured Inventory System for Group Members
- **Equipment Management**: 
  - Opens the same inventory UI as the player when clicking "Edit Equipment & Abilities"
  - Shows group member's equipped items in all armor slots
  - Displays group member's portrait and class
  - Header shows "{Member Name} - Equipment" in blue
  
- **Item Transfer**:
  - Players can equip items from their inventory to group members
  - Double-click or click "Use/Equip" button to equip to selected group member
  - Previously equipped items return to player inventory
  - Prevents equipping potions to group members (they can't use them)

- **Ability Management**:
  - Skills tab shows "{Member Name} - Abilities" when in group member mode
  - Full ability browser with all categories
  - Click ability slots to select, then choose abilities to assign
  - Supports all weapon abilities (Destruction Staff, Healing Staff, Melee) and hero-exclusive abilities
  - Changes save to both friendly.npcAbilities and settings.abilities

### 3. Persistent Group Membership
- **Death Handling**:
  - Group members no longer leave the group when they die
  - Remain in `state.group.members` array
  - Set to respawn at nearest player-owned flag
  
- **Respawn System**:
  - 8-second respawn timer for group members
  - Automatically finds nearest player-owned flag (sites or base)
  - Toast notification: "{Name} will respawn at {Flag Name} in 8s"
  - On respawn: "{Name} has respawned!" notification
  - If no player flag exists, removes from group

### 4. Intelligent Follow AI
- **Formation System**:
  - Group members follow player in circular formation
  - Distance varies by member index: `60 + (index % 3) * 20` units
  - Angle calculated: `(index / totalMembers) * 2π` for even spacing
  
- **Behavior Modes**:
  - **Aggressive**: Engages enemies within 180 units
  - **Neutral**: Engages enemies within 90 units
  
- **Movement Logic**:
  - Sprints (140 speed) when >200 units from player
  - Normal follow (110 speed) when catching up
  - Idles when within 30 units of target position
  - Attacks enemies based on behavior setting
  
- **Smart Positioning**:
  - Avoids overlapping with offset distances
  - Uses `moveWithAvoidance` for smooth navigation
  - Maintains formation while engaging enemies

## Technical Changes

### Files Modified
1. **src/game/ui.js**:
   - Updated group panel positioning and styling
   - Modified `renderInventory()` to support `state.groupMemberInventoryMode`
   - Updated `renderEquippedList()` to show member equipment
   - Enhanced `equipSelected()` to equip items to group members
   - Updated `renderSkills()` to show member abilities
   - Modified ability assignment to support group members
   - Added cleanup in `invClose.onclick` to exit group member mode

2. **src/game/game.js**:
   - Updated `killFriendly()` to handle group member respawns
   - Added `findNearestPlayerFlag()` helper function
   - Completely rewrote `updateFriendlies()` AI logic:
     - Added group member detection
     - Implemented circular follow formation
     - Added behavior-based engagement ranges
     - Added sprint mechanic for catching up

### State Management
- `state.groupMemberInventoryMode`: Stores selected member ID when editing equipment
- Group members retain IDs after death via respawn timer
- Equipment stored in `state.group.settings[memberId].equipment`
- Abilities stored in both `friendly.npcAbilities` and `settings.abilities`

## Usage Instructions

### Managing Group Members
1. Select a friendly and click "Invite to Group"
2. Click a group member in the Group tab to see details
3. Click "Edit Equipment & Abilities" to open full inventory UI
4. In inventory mode:
   - **Inventory Tab**: Equip armor/weapons from your inventory
   - **Skills Tab**: Assign abilities to the member's 5 slots
   - Click "X" to close and return to normal mode

### Follow Behavior
- Group members automatically follow the player
- Set behavior to "Aggressive" for more combat engagement
- Set behavior to "Neutral" for defensive formation
- Members maintain offset positions to avoid clumping

### Respawn System
- When a group member dies, they respawn at the nearest player flag after 8 seconds
- They automatically rejoin the player's formation
- Removes from group only if no player flags exist

## Testing Checklist
- [x] Group panel appears under minimap (top-right)
- [ ] Invite friendly to group
- [ ] Edit equipment - equip items from player inventory
- [ ] Edit abilities - assign 5 abilities
- [ ] Test follow behavior (members follow in formation)
- [ ] Kill a group member - should respawn at nearest flag
- [ ] Change behavior (Aggressive vs Neutral) - test engagement range
- [ ] Close inventory and verify group tab updates

## Notes
- Group members use the same UI as the player for consistency
- All equipment changes are reversible (swaps back to inventory)
- Formation prevents overlap with varied distances
- Respawn system ensures persistent group membership
- AI seamlessly switches between follow and combat modes
