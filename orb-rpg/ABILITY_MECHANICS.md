# Ability Mechanics Reference

**Last Updated**: January 18, 2026  
**Focus**: Detailed mechanics explanation for all abilities

---

## 🔮 Shadow Veil (Arcane Arts - Arcane Intellect Unlock)

**Category**: Utility / Stealth  
**Cost**: 20 Mana  
**Cooldown**: 15.0 seconds  
**Cast Time**: 0.5 seconds  
**Range**: Self AoE (radius 16)  
**Duration**: 5 seconds (when active)

### Mechanic Description

**What It Does**:
- Grants **Stealth** buff to caster and nearby allies
- While stealthed: +100% crit chance (guaranteed crits on all attacks)
- Makes units invisible to enemies (cannot be targeted, enemies don't aggro)

**When It Breaks**:
- Breaks immediately if you **take damage** (from any source)
- Breaks immediately if you **deal damage** (attack, ability, projectile hits)
- Breaking means the Stealth buff is removed and units become visible again

**Cooldown Behavior**:
- After Stealth breaks (from damage or expiration), there's a **1-second internal cooldown**
- During this 1-second window, you CANNOT re-cast Shadow Veil
- After 1 second of not taking/dealing damage, you can cast again

### Tactical Use Cases

**Offense**: 
- Use to approach enemies unseen → break stealth with guaranteed-crit attack for burst damage
- 1-second "recharge" means you can re-stealth if they don't chase

**Defense**:
- Use when low HP to become invisible → enemies can't target you
- Run away invisible → if they don't catch you in 1s, you can re-stealth as you escape

**Setup**:
- Stealth then wait 1s → guaranteed crit next hit → back to stealth for escape
- Example rotation: Stealth (5s) → Attack (break) → Wait 1s → Stealth (5s) → etc.

### Visual Indicators

- **When Cast**: Purple particle effect around caster, slight shimmer
- **While Active**: Unit has faint purple/dark aura, semi-transparent appearance
- **When Breaking**: Brief red "break" effect + visible pop as unit materializes
- **UI Buff**: "Stealth" buff icon shows remaining duration (5s countdown)

### Interaction with Other Systems

- **Invisibility**: Enemies cannot see stealthed units (no targeting, no lines of sight)
- **Crit Calculation**: +100% crit chance = all attacks critically strike while active
- **Damage Type**: Breaking from dealt damage means your attack will still hit (but breaks stealth after)
- **AoE Coverage**: Buff applies to all units in radius 16 (self + nearby allies within 16 units)

### Mechanics Summary

| Aspect | Detail |
|--------|--------|
| **Effect** | Invisibility + Guaranteed Crits |
| **Break Condition** | Any damage taken OR dealt |
| **Recast Cooldown** | 1 second after break (no re-cast during this window) |
| **Crit Bonus** | +100% crit chance (+all crits guaranteed) |
| **Visibility** | Enemies cannot target/see stealthed units |
| **Sound** | Enemies hear stealth break (red sparkle + sound) |
| **Duration Active** | 5 seconds (until damage or cooldown triggers) |

---

## 🛡️ Ward Barrier (Healing Staff)

**Category**: Defense / Shield  
**Cost**: 22 Mana  
**Cooldown**: 10.0 seconds  
**Cast Time**: 0.4 seconds  
**Range**: Self AoE (radius 160)  
**Buff Duration**: 8 seconds

### Mechanic Description

Applies a protective **shield** to caster and nearby allies. Shield absorbs incoming damage before health is reduced.

### Key Facts

- Shield amount: Scaled by Defense stat (160% scaling)
- Shield cap: Limited to caster's max HP (or 320 for NPCs)
- Duration: Applies buff for 8 seconds
- Allies: All units within 160 units get full shield value
- Stacking: Multiple shield sources stack (additively)

---

## ❤️‍🩹 Heal Burst (Healing Staff)

**Category**: Healing / Emergency Response  
**Cost**: 18 Mana  
**Cooldown**: 7.5 seconds  
**Cast Time**: 0.3 seconds  
**Range**: Self AoE (radius 160)  
**Effect Duration**: Instant heal + 6 second regen

### Mechanic Description

**Instant Effect**: Heals caster and nearby allies for high amount  
**Secondary Effect**: Applies 6-second regeneration that ticks every 1 second

### Scaling

- Healing: 200% of Healing Power
- Regen per tick: (healing amount / 6) per second
- Example at +50 healing power: ~100 HP instantly + ~16.7 HP/s for 6s

---

## 🔥 [Add More Abilities Here as Needed]

Format above can be applied to any ability. Use this for:
- Damage abilities (spell damage scaling, hits per cast, DoT mechanics)
- CC abilities (stun duration, stack caps, immunity interactions)
- Movement abilities (dash distance, cooldown, collision behavior)
- Support abilities (range, effect radius, buff/debuff mechanics)

---

## 📝 How to Document New Abilities

Use this template:

```markdown
## [Ability Name]

**Category**: [Type]  
**Cost**: [Mana Cost]  
**Cooldown**: [Seconds]  
**Cast Time**: [Seconds]  
**Range**: [Distance or Self]  

### Mechanic Description

[One sentence summary]

[Detailed explanation of what happens when cast]

### Key Mechanics

- [Mechanic 1]
- [Mechanic 2]
- [Mechanic 3]

### Scaling

- [Stat 1]: [Formula/percentage]
- [Stat 2]: [Formula/percentage]

### Examples

[Concrete example with numbers]
```

---

**Next Steps**: Document remaining 70+ abilities using template above
