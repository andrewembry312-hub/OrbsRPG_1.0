# Group System Testing Guide

## Quick Start
Since this is a modular ES6 project, you need to serve it via HTTP. Use one of these methods:

### Option 1: Live Server (VS Code Extension)
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` and select "Open with Live Server"
3. Game will open in browser at http://127.0.0.1:5500

### Option 2: Python (if installed)
```bash
cd orb-rpg
python -m http.server 8000
# OR
python3 -m http.server 8000
```
Then open: http://localhost:8000

### Option 3: Node.js (if installed)
```bash
cd orb-rpg
npx serve -p 8000
```
Then open: http://localhost:8000

## Testing the New Features

### 1. Test Group Panel Positioning
**Expected**: Group panel should appear in top-right corner, below the minimap (not top-left)
- Start game
- Invite a friendly to group
- Verify panel position is: **right: 10px, top: 140px**
- Panel should display under the minimap

### 2. Test Full Inventory UI for Group Members
**Steps**:
1. Click on a friendly unit (not an enemy)
2. Click "Invite to Group" in the unit panel
3. Open Menu (ESC) → click Inventory OR press I
4. Go to "Group" tab
5. Click on the group member
6. Click "Edit Equipment & Abilities"

**Expected**:
- Inventory overlay opens
- Header shows: "{Member Name} - Equipment" in blue color
- Portrait shows member's class icon
- Equipped items section shows member's current gear
- Inventory grid shows YOUR items (player's inventory)

### 3. Test Equipping Items to Group Members
**Steps**:
1. While in group member inventory mode (from step 2)
2. Click an armor or weapon item in inventory
3. Click "Use/Equip" button OR double-click the item

**Expected**:
- Item equips to the group member
- Toast message: "Equipped on {Member Name}: {Item Name}"
- Item disappears from inventory
- If member had item in that slot, it returns to player inventory
- Equipped list updates showing the new item

**Test Edge Cases**:
- Try equipping a potion → Should show error: "Group members cannot use potions directly"
- Equip multiple armor pieces to different slots
- Swap weapons - old weapon should return to inventory

### 4. Test Ability Management
**Steps**:
1. In group member inventory mode
2. Switch to "Skills" tab
3. Header should show: "{Member Name} - Abilities"
4. Click one of the 5 ability slots to select it
5. Click a category on the left (e.g., "Weapons - Melee")
6. Click an ability (e.g., "Slash")
7. Click "Assign to Slot X"

**Expected**:
- Ability assigns to the member's slot
- Toast: "{Ability Name} assigned to {Member Name} slot X"
- Ability slot updates to show the new ability
- Can assign different abilities to each of 5 slots

**Test Different Categories**:
- Weapons - Destruction Staff (shared)
- Weapons - Healing Staff (shared)
- Weapons - Melee (shared)
- Hero-specific abilities (Mage, Warrior, Knight, Tank)

### 5. Test Follow AI Behavior
**Steps**:
1. Invite 2-3 friendlies to group
2. Close inventory
3. Walk around the map

**Expected Formation**:
- Members follow in circular formation around player
- Each member at different angle: `angle = (index / total) * 2π`
- Distance varies: 60-100 units from player
- Members don't overlap or clump together

**Test Movement**:
- Walk slowly → members should follow smoothly
- Sprint far away → members should sprint (140 speed) to catch up
- Stop → members should idle near their formation positions
- Move near enemies → behavior determines engagement (see next test)

### 6. Test Behavior Settings
**Setup**: Have a group member in "Neutral" behavior

**Steps**:
1. Open Group tab
2. Select member
3. Click "AGGRESSIVE" button
4. Walk near enemies (within 180 units)

**Expected**:
- In **Aggressive** mode: Engages enemies within 180 units
- In **Neutral** mode: Only engages within 90 units
- Member attacks enemy, then returns to formation
- Button highlights show active behavior

**Visual Feedback**:
- Active behavior button has blue background: `rgba(122,162,255,0.3)`
- Inactive buttons are grey (secondary class)

### 7. Test Respawn System
**Steps**:
1. Have a group member in your party
2. Note the nearest player-owned flag
3. Let the group member die (low HP, attacked by enemies)

**Expected Death Behavior**:
- Toast: "{Member Name} will respawn at {Flag Name} in 8s"
- Member stays in group members list
- Health bar shows in group panel but greyed/empty
- Member does NOT disappear from group

**Expected Respawn Behavior** (after 8 seconds):
- Toast: "{Member Name} has respawned!"
- Member appears at the flag location
- HP restored to max
- Immediately starts following player again
- Joins formation as if nothing happened

**Edge Case**:
- Capture all flags, then lose them all while member is respawning
- Expected: Member removes from group (no respawn point)

### 8. Test Exit Group Member Mode
**Steps**:
1. Open group member equipment UI
2. Click the "X" close button

**Expected**:
- Inventory closes
- `state.groupMemberInventoryMode` set to `null`
- Group tab refreshes
- Next time you open inventory, it shows PLAYER's inventory (not member)

## Common Issues & Solutions

### Issue: Group panel still on left side
**Solution**: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Can't equip items to group member
**Check**:
- Is inventory overlay in group member mode? (header should be blue)
- Is the item already equipped on another hero?
- Are you trying to equip a potion? (not allowed)

### Issue: Abilities not assigning
**Check**:
- Did you select an ability slot first? (click slot to highlight it)
- Is the ability valid for this hero class?
- Check console for errors

### Issue: Members not following
**Check**:
- Are they actually in the group? (check Group tab)
- Are they alive? (check respawn timer)
- Are enemies nearby? (they may be fighting)
- Check behavior setting (Aggressive may engage distant enemies)

### Issue: Members die and don't respawn
**Check**:
- Do you own ANY flags? (check map)
- Wait full 8 seconds
- Check if nearest flag is still player-owned

## Console Debugging

Open browser console (F12) and check for these log messages:

### Group Invite:
```
[GROUP] Attempting to invite {Name} (ID: {id}), current members: {count}
[GROUP] Member added to group. New count: {count}
[GROUP] Settings created for: {id}
[GROUP] Invite complete. Total members: {count}
```

### Group Member Death:
```
[GROUP] {Name} will respawn at {FlagName} in 8s
```

### Group Member Respawn:
```
[GROUP] {Name} respawned at {FlagName}
```

### Behavior/Role Changes:
```
[GROUP] Setting role for {id} to {role}
[GROUP] Setting behavior for {id} to {behavior}
```

## Performance Notes

- Group system adds minimal overhead
- Follow AI uses existing `moveWithAvoidance` function
- Formation calculation is O(1) per member
- No performance impact with 10 group members

## Known Limitations

1. **Equipment Stats**: Currently, equipping items to group members updates their inventory but doesn't fully calculate stat bonuses (you can extend this later)

2. **Max Group Size**: Hard-coded to 10 members (can be changed in `inviteToGroup`)

3. **Formation Distance**: Fixed formula; could be made dynamic based on terrain

4. **AI Priorities**: Group members prioritize following over everything except combat

## Next Steps / Future Enhancements

- [ ] Add stat calculation for group member equipment
- [ ] Add group member stat display in UI
- [ ] Add formation patterns (line, wedge, scatter)
- [ ] Add group-wide buffs/commands
- [ ] Add experience/leveling for group members
- [ ] Add group member roles (tank pulls aggro, healer prioritizes healing)
- [ ] Add equipment comparison tooltip for group members
- [ ] Save/load group composition and equipment

## Summary

All features are implemented and ready to test:
✅ Group panel repositioned to top-right under minimap
✅ Full inventory UI for group members (same as player)
✅ Equipment transfer from player to group members
✅ Ability management for group members (5 slots)
✅ Persistent group membership on death
✅ 8-second respawn at nearest player flag
✅ Intelligent follow AI with circular formation
✅ Behavior-based combat (Aggressive/Neutral)
✅ Smooth formation maintenance
✅ Toast notifications for all group events
