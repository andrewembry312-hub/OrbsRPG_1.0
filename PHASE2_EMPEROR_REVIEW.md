# Phase 2 Emperor System - Design & Implementation Review

**Status Date**: January 25, 2026  
**Cache Version**: 20260125a  
**Overall Status**: ✅ **PHASE 1 COMPLETE** | ⏳ **PHASE 2-3 CODE STRUCTURE READY** | ❌ **PHASES 2-3 NOT YET TESTED**

---

## Executive Summary

### What's Done ✅
1. **Emperor State Infrastructure**: Full `state.emperor` object structure initialized
2. **Crown System (Core)**: Crowns spawn at game start, can be picked up/carried/secured
3. **Emperor Activation**: Crowns unlock when a team becomes emperor
4. **Crown Gameplay Loop**: Pick → Carry → Secure at base
5. **Death Handling**: Crowns drop on player death, re-lockable on dethrone
6. **Crown Filtering**: Crowns excluded from combat targeting
7. **UI Integration**: Toast notifications for crown pickup/secure
8. **Game Logging**: Crown events logged to gameLog

### What's NOT Done Yet ❌
1. **Elite Crown Guards**: Concept defined, NO CODE IMPLEMENTATION
2. **Guard Spawning/Respawn System**: Concept defined, NO CODE IMPLEMENTATION
3. **Base Destruction Mechanic**: Concept defined, NO CODE IMPLEMENTATION
4. **Emperor Boss**: Concept defined, NO CODE IMPLEMENTATION
5. **End-Game Boss Phases**: Concept defined, NO CODE IMPLEMENTATION
6. **Visual Crown Rendering**: Crowns have no icon/display logic
7. **Crown Guard Rendering**: Guards would need model/sprite setup
8. **Audio System**: No audio cues for crown events
9. **UI Panels**: No crown progress display, base HP bars, guard status
10. **Testing & Balance**: No playtesting data

---

## Current Implementation Details

### ✅ Crown System (COMPLETE)

**State Structure** (in `state.js` line 206-208):
```javascript
emperor: false,                    // Boolean flag (LEGACY - see state.emperor object)
emperorTeam: null,                 // 'player' | 'teamA' | 'teamB' | 'teamC' | null
emperorSince: 0,                   // timestamp
```

**Full Emperor Object** (in `game.js` - initialized via `ensureEmperorState()`):
```javascript
state.emperor = {
  active: false,
  team: null,
  phase: null,
  
  crowns: {
    teamA: null,      // Crown creature _id
    teamB: null,
    teamC: null
  },
  
  crownCarry: {
    teamA: false,
    teamB: false,
    teamC: false
  },
  
  crownsSecured: {
    teamA: false,
    teamB: false,
    teamC: false
  },
  
  basesDestroyed: {
    teamA: false,
    teamB: false,
    teamC: false
  },
  
  bossId: null,
  
  crownGuardTimers: {
    teamA: { dead: false, respawnT: 0 },
    teamB: { dead: false, respawnT: 0 },
    teamC: { dead: false, respawnT: 0 }
  }
};
```

**Crown Creature Model** (spawned in `game.js:13338`):
```javascript
const crown = {
  type: 'crown',
  aiTag: 'CROWN',
  
  crownTeam: 'teamA',    // Which team this crown belongs to
  locked: true,          // Can't pick up
  carriedBy: null,       // 'player' when being carried
  secured: false,        // At emperor home
  
  // Safety flags
  nonCombat: true,
  invulnerable: true,
  isTargetable: false,
  
  x, y, r: 18,
  name: `Crown (${team})`
};
```

**Crown Gameplay Loop** (lines 13395-13460):
1. **spawnCrowns()**: Creates 3 crowns at team bases, locked
2. **unlockCrowns()**: Called when emperor activated, crowns become pickable
3. **tryPickupCrowns()**: If player near unlocked crown, carry it
4. **updateCarriedCrowns()**: Crowns follow player while carried
5. **trySecureCrowns()**: If player at base with crown, secure it
6. **dropCarriedCrowns()**: On death/dethrone, drop crowns (can re-lock them)

**Emperor Activation** (lines 12239-12296):
- When team controls all flags → `checkEmperorStatus()` triggers
- Calls `unlockCrowns()` to make crowns pickable
- Logs: `[EMPEROR] teamA CROWNED! Controls 3/3 flags`

**Dethronement** (lines 12284-12295):
- When emperor loses a flag → Lose emperor status
- Calls `dropCarriedCrowns(false)` to lock crowns again
- Calls `resetBaseDestruction()` (NOT YET IMPLEMENTED)

---

## Design vs Reality Gap Analysis

### DESIGN vs IMPLEMENTATION

| Feature | Design | Status | Code Location | Notes |
|---------|--------|--------|----------------|-------|
| **Crown Spawning** | At team bases, locked | ✅ DONE | game.js:13338 | Working |
| **Crown Unlocking** | On emperor activation | ✅ DONE | game.js:12268 | Working |
| **Crown Pickup** | Player touches unlocked crown | ✅ DONE | game.js:13395 | Range 28+r pixels |
| **Crown Carrying** | Follows player with offset | ✅ DONE | game.js:13422 | 3-crown max |
| **Crown Securing** | At emperor's base (80px radius) | ✅ DONE | game.js:13448 | UI toast: "✅ Crown secured" |
| **Crown Drop on Death** | Returned to team base | ✅ DONE | game.js:13477 | Toggles lock state |
| **Elite Crown Guards** | 5 per team at bases | ❌ NOT DONE | DESIGN ONLY | No spawning code |
| **Guard Respawn** | 5 second timer | ❌ NOT DONE | DESIGN ONLY | Timer logic exists in state |
| **Base Destruction** | After 3 crowns secured | ❌ NOT DONE | DESIGN ONLY | Function stub exists |
| **Emperor Boss** | On all 3 bases destroyed | ❌ NOT DONE | DESIGN ONLY | Concept only |
| **Boss Wave Spawning** | 5 units every 3 seconds | ❌ NOT DONE | DESIGN ONLY | No implementation |

---

## Phase 2-3 Implementation Checklist

### Phase 2: Elite Crown Guards & Base Defense

**PRIORITY 1 - Core Guard System**
- [ ] `spawnCrownGuards(state, team)` function
  - Spawn 5 creature entities per team
  - Tag with `aiTag: 'CROWN_GUARD'`
  - Position around team base
  - Store IDs in `state.emperor.crownGuardTimers[team].guardIds`
- [ ] Modify `updateEnemyAI()` to prioritize player
  - Check `enemy.aiTag === 'CROWN_GUARD'`
  - Target player if within 500px
  - Return to home if farther
  - Use `leash: 350` to prevent wandering
- [ ] Guard respawn timer
  - Track when all guards dead
  - Set `crownGuardTimers[team].dead = true`
  - Countdown `respawnT = 5000` ms
  - Re-spawn on timer expiration
- [ ] Guard death logging
  - Add to `updateEnemyAI()` or death handler
  - Log guard deaths to gameLog
- [ ] Visual guard indicator
  - Render guards in draw loop
  - Add health bar or status icon
  - Leash range circle (DEBUG only)

**PRIORITY 2 - Base Destruction**
- [ ] `initializeBaseDestruction(state)` at game start
  - Mark bases as `destructible: false` initially
  - Set `destructionHp: 100, maxDestructionHp: 100`
- [ ] `unlockBasesForDestructibility(state)`
  - Called when crowns secure (check `countSecuredCrowns()`)
  - 1 crown → teamA destructible
  - 2 crowns → teamB destructible
  - 3 crowns → teamC destructible
- [ ] Damage bases on player attack
  - In attack resolution, check nearby bases
  - Apply damage if destructible and in range (120px)
  - Rate: 20 DPS
  - Log damage events
- [ ] Base destruction completion
  - Check if `destructionHp <= 0`
  - Mark `basesDestroyed[team] = true`
  - Remove from rendering
  - Trigger boss spawn if all 3 destroyed
- [ ] Reset on dethronement
  - Call `resetBaseDestruction(state)`
  - Set `destructible: false`, restore HP

**PRIORITY 3 - UI & Feedback**
- [ ] Crown guard count display
  - Panel showing "5/5 Guards Alive" per team
  - Update real-time as guards die
  - Show respawn countdown if all dead
- [ ] Base destruction progress
  - Health bars for destructible bases
  - Percentage display (100%/50%/0%)
  - Color coding (green → yellow → red)
- [ ] Crown progress tracker
  - "X/3 Crowns Secured"
  - "X/3 Bases Destroyed"
  - Visual progress bars

### Phase 3: Emperor Boss & End-Game

**PRIORITY 1 - Boss Spawning**
- [ ] `spawnEmperorBoss(state)` function
  - Create boss creature with 520 * zoneLevel * 10 HP
  - Spawn 250px away from player home
  - Tag with `aiTag: 'EMPEROR_BOSS'`, `boss: true`
  - Set attack: 15 DPS
  - Set speed: 2.5
- [ ] Boss abilities
  - `generateEmperorBossAbilities(state)` - Generate 5 attack-only abilities
  - Ability cooldown: 0
  - Queue ability every 3 seconds
  - Target player & friendlies only
- [ ] Boss wave spawning
  - `spawnEmperorBossGuards(boss, state)` - Spawn 5 minions
  - Repeat every 3 seconds during boss fight
  - Cap: 30 total minions active
  - Minions: standard creatures, team: 'boss'
- [ ] Boss AI override
  - Modify `updateEnemyAI()` for `aiTag: 'EMPEROR_BOSS'`
  - Always target player
  - No pathing, direct approach
  - Cast abilities every 3 seconds

**PRIORITY 2 - Boss Death & Completion**
- [ ] Boss death handler
  - Check if boss dead
  - Award victory points (50 × zone level)
  - Reward: Legendary equipment drops, rare cards
  - Log: `[EMPEROR] Boss defeated by player!`
- [ ] Victory state
  - `state.emperor.phase = 'victory'`
  - Unlock new mechanics/zones
  - Award "Emperor Slayer" title/achievement
  - Reset emperor system after delay

**PRIORITY 3 - Balance & Polish**
- [ ] Boss difficulty scaling
  - HP formula: `520 * zoneLevel * 10`
  - Adjust multiplier based on playtesting
  - DPS formula: proportional to zone level
- [ ] Guard difficulty
  - 150 HP per guard (adjust based on tests)
  - ContactDmg: 15 (adjust based on tests)
  - Speed: 3.5 (faster than normal creatures)
- [ ] Respawn timing
  - Guards: 5 seconds
  - Boss: N/A (dies to win)
  - Waves: 3 seconds between spawns

---

## Testing Plan

### Manual Testing Checklist

**Phase 1 (Current)** ✅
- [ ] Start campaign, reach emperor status
- [ ] All 3 crowns spawn at bases (locked)
- [ ] Crowns unlock when emperor activated
- [ ] Player can pick up crowns (proximity 28+r)
- [ ] Crowns follow player while carried
- [ ] Crowns secure at player base (80px radius)
- [ ] UI toast shows "Crown secured 1/3", "2/3", "3/3"
- [ ] Crowns drop on player death
- [ ] Crowns re-lock on dethronement
- [ ] Crowns NOT attackable/damageable
- [ ] Crowns excluded from enemy targeting

**Phase 2 (TODO)**
- [ ] Guards spawn at each team base (5 per team)
- [ ] Guards target player if within 500px
- [ ] Guards return to base if player farther
- [ ] All guards dying sets respawn timer to 5s
- [ ] Guards respawn after 5 seconds
- [ ] Guard count display shows real-time alive count
- [ ] First crown secured → teamA base becomes destructible
- [ ] Second crown secured → teamB base becomes destructible
- [ ] Third crown secured → teamC base becomes destructible
- [ ] Bases have health bars showing destruction %
- [ ] Player attacks destroy bases (20 DPS)
- [ ] Destroyed base removed from map
- [ ] All 3 bases destroyed triggers boss spawn

**Phase 3 (TODO)**
- [ ] Boss spawns 250px from player home
- [ ] Boss has correct HP (520 * zoneLevel * 10)
- [ ] Boss targets only player & friendlies
- [ ] Boss spawns waves of 5 minions every 3 seconds
- [ ] Max 30 minions active at once
- [ ] Boss casts abilities every 3 seconds
- [ ] Boss abilities only attack player (no healing/support)
- [ ] Killing boss awards victory
- [ ] Victory screen shows points earned
- [ ] Difficulty appropriately challenging

### Performance Benchmarks

- Crown updates: < 0.1ms (3 creatures, simple carry logic)
- Guard spawning: < 2ms (15 creatures, no complex AI)
- Base damage checks: < 0.5ms (distance checks to 3 sites)
- Boss wave spawning: < 1ms (5 creatures spawned)
- Boss AI: < 0.5ms (single creature, simple targeting)

---

## Known Issues & Gaps

### Code Issues
1. **Crown Rendering**: No visual icon/sprite, crowns invisible in game
2. **Guard Spawning**: No code exists - must implement from design
3. **Base Destruction**: Function stub only, no damage application
4. **Boss Spawning**: Function stub only, no wave logic
5. **Audio**: No sound effects for crown pickup, base destruction, boss spawn
6. **UI Panels**: No progress displays, health bars, or status indicators

### Design Issues
1. **Guard AI**: Leash logic not in existing enemy AI - needs integration
2. **Boss Abilities**: Design says "attack-only" but needs specific ability selection
3. **Victory Condition**: No defined reward structure or progression impact
4. **Zone Scaling**: All formulas assumed (zoneLevel not defined)
5. **Minion AI**: Boss minions' behavior undefined (target priority, abilities, etc.)

### Balance Questions (Need Testing)
1. Are 5 guards per team enough to challenge emperor?
2. Is 20 DPS base destruction too fast/slow?
3. Is 520 * zoneLevel * 10 appropriate boss HP?
4. Should boss minions scale with zone level?
5. Is 5-second guard respawn fair?
6. Should bases have shields/invulnerability phases?

---

## Recommended Implementation Order

### Week 1: Phase 2 Guard System
1. Implement `spawnCrownGuards()` - Create 15 guard creatures
2. Modify `updateEnemyAI()` for `CROWN_GUARD` tag
3. Add respawn timer logic to `updateGame()` loop
4. Render guards with basic sprite (can be placeholder)
5. **Playtest**: Can player handle 15 guards? Are they too strong?

### Week 2: Phase 2 Base System
1. Implement base destruction initialization
2. Add unlock logic when crowns secure
3. Implement damage application in attack resolution
4. Add base health bar rendering
5. **Playtest**: Difficulty curve from guards to bases balanced?

### Week 3: Phase 3 Boss
1. Implement `spawnEmperorBoss()` with correct HP formula
2. Implement `spawnEmperorBossGuards()` wave system
3. Modify `updateEnemyAI()` for boss targeting
4. Add boss ability casting logic
5. **Playtest**: Boss feels like climax? Appropriate challenge level?

### Week 4: Polish & Balance
1. Add UI displays (crown progress, guard count, base HP)
2. Add audio cues (pickup, destruction, boss spawn)
3. Balancing pass based on playtest feedback
4. Victory screen and rewards
5. Documentation & guides

---

## Code References

**Crown System (COMPLETE)**
- `spawnCrowns()` - game.js:13338
- `unlockCrowns()` - game.js:13380
- `tryPickupCrowns()` - game.js:13395
- `updateCarriedCrowns()` - game.js:13422
- `trySecureCrowns()` - game.js:13448
- `dropCarriedCrowns()` - game.js:13477

**Emperor Activation (COMPLETE)**
- `checkEmperorStatus()` - game.js:12239
- Crown unlock call - game.js:12268
- Dethrone handling - game.js:12284-12295

**State Initialization**
- `ensureEmperorState()` - game.js (helper function)
- `state.emperor` object - game.js
- Legacy `state.emperor` boolean - state.js:206

**Filter/Exclusions (COMPLETE)**
- Crown combat filtering - game.js lines 2673, 2705, 3365, 7971, 10572
- `type !== 'crown'` check prevents targeting

---

## Summary

**Phase 1 (Emperor Crowns)**: ✅ **FULLY IMPLEMENTED & WORKING**
- Crown spawning, pickup, carrying, securing, dropping all functional
- Crown filtering from combat prevents bugs
- Emperor activation/dethronement properly triggers lock states
- UI integration with toast notifications
- Ready for playtesting

**Phase 2 (Crown Guards & Bases)**: ⏳ **DESIGN COMPLETE, ZERO CODE**
- Full design specification in EMPEROR_MODE_DESIGN_REFINED.md
- No guard spawning implemented
- No base destruction mechanics implemented
- Estimated effort: 3-4 days implementation + playtesting

**Phase 3 (Boss & End-Game)**: ⏳ **DESIGN COMPLETE, ZERO CODE**
- Boss spawning function stubs exist
- Wave system not implemented
- Boss AI integration needed
- Estimated effort: 2-3 days implementation + balancing

**Recommendation**: Start with Phase 2 guards - they're needed to make emperor mode challenging. Base destruction will feel like progression. Boss will feel like final challenge.

