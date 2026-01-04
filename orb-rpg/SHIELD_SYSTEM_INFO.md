# Shield System Information

## Shield Ability Ranges

All friendly shield abilities affect units within a **radius from the caster**:

| Ability | Range (radius) | Shield Amount | Cast By |
|---------|---------------|---------------|---------|
| `ward_barrier` | 170 | 32 + (def * 1.0) | Healers |
| `cleanse_wave` | 150 | 20 + (def * 0.9) | Healers |
| `mage_radiant_aura` | 170 | 26 + (def * 1.0) | Mages |
| `warcry` | 140 | 18 + (def * 0.8) | Warriors |
| `knight_shield_wall` | 180 | 34 + (def * 1.1) | Knights |
| `knight_rally` | 180 | 18 + (def * 0.8) | Knights |
| `knight_taunt` | 150 | 16 + (def * 0.7) | Knights |
| `warrior_fortitude` | 170 | 22 + (def * 0.9) | Warriors |
| `tank_bodyguard` | 190 | 24 + (def * 1.0) | Tanks |
| `tank_anchor` | 170 | 20 + (def * 0.9) | Tanks |

**Range Summary:**
- **Minimum Range:** 140 pixels (warcry)
- **Maximum Range:** 190 pixels (tank_bodyguard)
- **Most Common:** 170 pixels

## Why Allies Cast Shields Constantly

### DPS Role Behavior
DPS allies maintain shield buffs at **100% uptime**:

```javascript
// From game.js line 1825-1845
// PRIORITY 1: Maintain buff uptime (recast when < 3s remaining)
if(!u._buffTimers) u._buffTimers = {};
for(let i=0;i<u.npcAbilities.length;i++){
  const id = u.npcAbilities[i];
  const meta = ABILITY_META[id];
  if(meta && (meta.kind === 'buff' || meta.kind === 'shield') && meta.type === 'support'){
    const timeLeft = u._buffTimers[id] || 0;
    if(timeLeft < 3.0){
      // Cast shield ability
      u._buffTimers[id] = 12.0; // Assume 12s duration
    }
  }
}
```

**Result:** DPS allies recast shield abilities every **9-12 seconds** to maintain buff uptime.

### Healer Role Behavior
Healers cast shields in these scenarios:

1. **Emergency Save:** When any ally drops below 40% HP
2. **AoE Stabilize:** When 3+ allies are below 75% HP within 160 pixels
3. **Pre-Burst Mitigation:** During `macroState='burst'` combat phase

### Tank Role Behavior
Tanks cast shields when:

1. **Peeling Healer:** When enemy within 140 pixels of allied healer
2. **Burst Protection:** During `macroState='burst'` phase
3. **Threat Response:** When focus target is nearby

## Shield Cap System

- **Player Shield Cap:** 420
- **Ally/Enemy Shield Cap:** 320
- **Shield Formula:** `shield = clamp((current_shield + gain), 0, cap)`

## Visual Indicators

1. **Orange Ring:** Drawn around player when `state.player.shield > 0` (render.js line 636)
   - Radius: `player.r + 8`
   - Opacity: `0.4 + 0.3 * (shield / 420)`
   - Color: `#ffb347`

2. **Shield Bar Overlay:** Blue bar over HP bar (ui.js line 154)
   - Width: `shield / (maxHp * 1.5) * 100%`
   - Cap: Shield can be up to 1.5x max HP visually
   - Color: `rgba(100,181,246,0.85)`
   - Z-Index: 2 (above HP fill, below HP text)

## Why You See Constant Shield Spam

With 10+ allies on your team:
- Each ally recasts shields every 9-12 seconds
- If 5 allies have shield abilities, that's a shield cast every ~2 seconds
- Multiple allies can cast simultaneously
- Player is often within 140-190 pixel range of multiple allies
- **Result:** Player stays at 420 shield cap nearly 100% of the time

## Debugging Shield Visibility

Added debug logging in ui.js (line 3478):
```javascript
if(shield > 0){
  logDebug(state, 'SHIELD', 'Shield bar updated', { 
    shield, 
    maxHp, 
    shieldPercent: shieldPercent.toFixed(1)+'%', 
    width: ui.shieldFill.style.width 
  });
}
```

This logs every frame when shield > 0, showing:
- Current shield value
- Max HP
- Calculated shield bar percentage
- Actual CSS width applied

Use `downloadDebugLog()` to see if the shield bar width is being set correctly.

## Shield Bar HTML Structure

```html
<div style="position:relative; height:14px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2); border-radius:2px;">
  <div id="hpFill" style="...; z-index:1;"></div>      <!-- Red HP bar -->
  <div id="shieldFill" style="...; z-index:2;"></div>  <!-- Blue shield overlay -->
  <div id="hpText" style="...; z-index:3;"></div>      <!-- White text -->
</div>
```

**Layering:**
- Bottom (z-index:1): Red HP bar
- Middle (z-index:2): Blue shield overlay
- Top (z-index:3): HP text

The shield bar should be visible as a blue overlay when `width > 0%`.
