# Console Commands & Debug Tools

Quick reference for helpful browser console commands. Press **F12** to open the developer console.

---

## 🎒 Inventory & Items

### `giveAllItems()`
Adds every item type at every rarity to your inventory for testing.
- **Returns:** Number of items added (82 total)
- **Includes:** 
  - 30 weapons (6 types × 5 rarities)
  - 50 armor pieces (10 slots × 5 rarities)
  - 2 potions (HP & Mana)

```javascript
giveAllItems()
// ✓ Added 82 items to inventory (30 weapons, 50 armor, 2 potions)
```

### `giveAllBuffs()`
Applies every positive buff to the player for testing.
- **Returns:** Number of buffs applied (27 total)
- **Includes:** Combat buffs, sustain buffs, mobility buffs, utility buffs, emperor power
- **Note:** Only positive effects, no debuffs

```javascript
giveAllBuffs()
// ✓ Applied 27 buffs to player!
// All positive buffs are now active (including Emperor Power).
```

### `giveAllEffects()`
Applies ALL effects (buffs AND debuffs) to the player.
- **Returns:** Number of effects applied (40 total)
- **Includes:** All buffs (including emperor power) + all debuffs (poison, stun, slow, etc.)
- **⚠️ WARNING:** Includes negative effects for testing purposes

```javascript
giveAllEffects()
// ✓ Applied 40 effects (buffs + debuffs) to player!
// WARNING: This includes debuffs like stun, root, and poison for testing purposes.
// Includes Emperor Power: +3x HP/Mana/Stamina, 50% CDR
```

---

## 🗺️ Map & World

### `loadCustomMap(imageUrl)`
Load a custom map image as the game background.
- **Param:** `imageUrl` - URL or path to image file
- **Note:** Restart game after loading to see changes

```javascript
loadCustomMap('path/to/your/map.png')
// ✓ Map loaded. Restart the game to see changes.
```

---

## 🔍 Game State Access

### `state`
Access the entire game state object.

```javascript
// View player stats
state.player

// View current HP/Mana
state.player.hp
state.player.mana

// View equipped items
state.player.equip

// View inventory
state.inventory

// View all enemies
state.enemies

// View all friendlies
state.friendlies

// View all sites/flags
state.sites

// View current stats (with all buffs applied)
state.currentStats
```

---

## 💰 Player Modifications

### Gold
```javascript
// Add gold
state.player.gold += 10000

// Set specific amount
state.player.gold = 99999
```

### Health & Mana
```javascript
// Heal to full
state.player.hp = state.currentStats.maxHp

// Restore mana
state.player.mana = state.currentStats.maxMana

// Add shield
state.player.shield += 100
```

### Experience & Level
```javascript
// Add XP
state.progression.xp += 1000

// Check current level
state.progression.level

// Check total XP
state.progression.xp
```

---

## 🎮 Item Generation

### Manual Item Creation
```javascript
// Rarities
const rarities = {
  common: {key:'common', name:'Common', color:'var(--common)'},
  uncommon: {key:'uncommon', name:'Uncommon', color:'var(--uncommon)'},
  rare: {key:'rare', name:'Rare', color:'var(--rare)'},
  epic: {key:'epic', name:'Epic', color:'var(--epic)'},
  legendary: {key:'legend', name:'Legendary', color:'var(--legend)'}  // Note: key is 'legend' not 'legendary'
}

// Create specific weapon
const sword = state._itemGen.makeWeapon('Sword', rarities.legendary, 1)
state.inventory.push(sword)
state.ui.updateInventory()

// Weapon types: 'Destruction Staff', 'Healing Staff', 'Axe', 'Sword', 'Dagger', 'Greatsword'
```

### Weapon Requirements for Abilities
Different abilities have different weapon requirements:

**Weapon-Specific:**
- **Destruction Staff abilities** - Require Destruction Staff equipped
- **Healing Staff abilities** - Require Healing Staff equipped
- **Melee weapon abilities** - Work with any melee weapon (Sword, Axe, Dagger, Greatsword)

**Hero-Specific (No weapon requirement):**
- **Warrior abilities** - Only available to Warrior hero, work with ANY weapon
- **Mage abilities** - Only available to Mage hero, work with ANY weapon
- **Knight abilities** - Only available to Knight hero, work with ANY weapon
- **Tank abilities** - Only available to Tank hero, work with ANY weapon

Hero-exclusive abilities are filtered by the UI and can only be slotted by the matching hero class.

### Create Armor
```javascript
// Create specific armor piece
const helm = state._itemGen.makeArmor('helm', rarities.epic, 1)
state.inventory.push(helm)
state.ui.updateInventory()

// Armor slots: 'helm', 'chest', 'shoulders', 'hands', 'belt', 'legs', 'feet', 'neck', 'accessory1', 'accessory2'
```

### Create Potions
```javascript
// Create HP potion
const hpPotion = state._itemGen.makePotion('hp', rarities.rare, 1)
state.inventory.push(hpPotion)

// Create Mana potion
const manaPotion = state._itemGen.makePotion('mana', rarities.rare, 1)
state.inventory.push(manaPotion)

state.ui.updateInventory()
```

---

## � Emperor Power
### Quick Command
```javascript
state._applyBuff(state.player, 'emperor_power')
```
### What is Emperor Power?
A special permanent buff granted when your team controls **ALL capture flags** on the map.

### Emperor Power Buffs:
- **×3 Max HP** (tripled health pool)
- **×3 Max Mana** (tripled mana pool)
- **×3 Max Stamina** (tripled stamina pool)
- **+50% Cooldown Reduction** (all abilities have half cooldown)
- **Permanent** (infinite duration, shown as ∞)
- **Fully heals** HP, Mana, and Stamina when first activated

### How to Get Emperor Power:
1. Capture ALL flags on the map (all 6 capturable sites)
2. Emperor Power automatically activates when condition is met
3. Shows golden "EMPEROR!" notification on screen
4. Appears in buff bar with 🔱 icon and ∞ timer

### How to Lose Emperor Power:
- Lose control of ANY flag (no longer controlling all flags)
- Effect is removed immediately when dethroned

### Manual Activation (Testing):
```javascript
// Add emperor power manually
state._applyBuff(state.player, 'emperor_power')

// Or use giveAllBuffs() which includes it
giveAllBuffs()
```

### Check Emperor Status:
```javascript
// Check if player team is emperor
state.emperorTeam === 'player'  // true if emperor

// Check if player has emperor buff
state.player.buffs.some(b => b.id === 'emperor_power')
```

---

## �📊 Debug Information
### Download Logs Hotkey
Press **` (backtick)** while in the ESC menu to quickly download all selected logs.
- Opens ESC menu → Settings → Download Logs section
- Downloads all logs that have their checkboxes enabled
- Can be rebound in Settings → Keybinds
### View Logs
```javascript
// Combat log
state.combatLog

// Debug log (game events)
state.debugLog

// Player event log
state.playerLog

// Damage report
state.damageReport

// Effect log
state.effectLog

// Ability usage log
state.abilityLog
```

### XP Debug
```javascript
// View XP progression details
window.xpDebug
```

---

## 🎯 Quick Cheats

### God Mode (Max Stats)
```javascript
// Set to max HP
state.player.hp = 9999

// Infinite gold
state.player.gold = 999999

// Max level items
for(let i = 0; i < 10; i++) {
  const item = state._itemGen.makeWeapon('Greatsword', {key:'legendary', name:'Legendary', color:'var(--legendary)'}, 50)
  state.inventory.push(item)
}
state.ui.updateInventory()
```

### Clear Inventory
```javascript
state.inventory = []
state.ui.updateInventory()
```

### Teleport Player
```javascript
// Teleport to coordinates
state.player.x = 1000
state.player.y = 1000
```

---

## 🛠️ UI Access

### UI Elements
```javascript
// Access UI system
state.ui

// Update displays manually
state.ui.updateInventory()
state.ui.updateGoldDisplay()
state.ui.updateHealth()

// Show toast notification
state.ui.toast('Custom message here!')
```

---

## 🔊 Audio Control

### Music & Sounds
```javascript
// Stop all sounds
Object.values(state.sounds).forEach(sound => {
  if(sound && sound.pause) sound.pause()
})

// Adjust volume
state.sounds.gameCombatMusic.volume = 0.2
state.sounds.gameNonCombatMusic.volume = 0.2
```

---

## 📝 Notes

- **Refresh UI**: After modifying inventory, call `state.ui.updateInventory()`
- **Save Changes**: Console changes are temporary and won't persist across game restarts
- **Performance**: Avoid spamming commands too quickly to prevent lag
- **Item Level**: Third parameter in item generation (default: 1, max: ~50)

---

## ⚠️ Common Issues

### Inventory Not Updating?
```javascript
state.ui.updateInventory()
```

### Gold Display Wrong?
```javascript
state.ui.updateGoldDisplay()
```

### Need to Reset?
Refresh the page (F5) to restart the game with default state.

---

**Last Updated:** January 5, 2026
