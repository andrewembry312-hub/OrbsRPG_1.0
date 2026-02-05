/**
 * CROWN DEBUG SYSTEM v2 - COMPREHENSIVE 4-LAYER LOGGING
 * =====================================================
 * 
 * Layer A: Crown state timeline
 *   CROWN_SPAWNED, CROWN_PICKUP_ATTEMPT, CROWN_PICKED_UP, CROWN_DROPPED,
 *   CROWN_RESET, CROWN_CAPTURED, CROWN_CARRIER_CHANGED, CROWN_INVALID_STATE
 * 
 * Layer B: Guard state machine transitions
 *   GUARD_STATE_CHANGE (IDLE → ACQUIRE → CHASE → ENGAGE → ESCORT → RETURN_HOME → STUCK_RECOVERY)
 *   GUARD_ACTION_BLOCKED, GUARD_ABORT
 * 
 * Layer C: Target scoring & decision making
 *   LEADER_ELECTED, TARGET_SCORED, ACTION_RESOLVED
 * 
 * Layer D: Coordinate-space anomaly detection
 *   COORD_ANOMALY (automatic, low-noise, only on suspicious distance/ratio)
 * 
 * All events include: tick, correlationId, entityId, timestamp, reason
 */

export function initCrownDebugSystem(state) {
  if (!state.crownDebug) {
    state.crownDebug = {
      enabled: false,  // Toggle with options checkbox
      events: [],      // Event log
      maxEvents: 1000, // Increased to capture more context
      crowns: {},      // Track crown state by team
      guards: {},      // Track guard state by ID
      coordinateDiagnostic: null,  // One-time snapshot of coordinate space health
      matchId: generateMatchId(), // Unique session ID for correlation
      tick: 0, // Update each frame
    };
    
    // Check if UI checkbox exists and is checked - if so, enable debug logging
    if (state.ui?.enableCrownDebugLog?.checked) {
      state.crownDebug.enabled = true;
    }
    
    // Run coordinate diagnostics once on init
    runCoordinateDiagnostics(state);
  }
}

/**
 * Generate a unique match ID for log correlation
 */
function generateMatchId() {
  return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Find base site for a team (helper used by spawn logging)
 * Import: from game.js findTeamBaseSite
 */
function findTeamBaseSite(state, team) {
  if (!state?.sites) return null;
  return state.sites.find(s => s?.owner === team && s?.type === 'home');
}

/**
 * Create correlation context for all events
 */
function getCorrelationContext(state, entityId = null) {
  return {
    matchId: state.crownDebug?.matchId || 'unknown',
    tick: state.crownDebug?.tick || 0,
    gameTime: (state.gameTime || 0).toFixed(2),
    entityId: entityId || null,
  };
}

/**
 * Run coordinate space diagnostics to detect scale mismatches
 * GATED: Only declares mismatch when valid data exists
 */
function runCoordinateDiagnostics(state) {
  if (!state.crownDebug) return;
  
  const enemies = state.enemies || [];
  const sites = state.sites || [];
  const crownObj = state.emperor?.crowns || {};
  const crowns = Object.values(crownObj).filter(c => c);
  
  // Sample multiple entities with VALID coordinates only
  const sampleIndices = (arr) => {
    if (arr.length === 0) return [];
    if (arr.length === 1) return [0];
    return [0, Math.floor(arr.length / 2), arr.length - 1];
  };
  
  const enemySamples = sampleIndices(enemies).map(i => enemies[i]).filter(e => e && typeof e.x === 'number' && typeof e.y === 'number' && isFinite(e.x) && isFinite(e.y));
  const siteSamples = sampleIndices(sites).map(i => sites[i]).filter(s => s && typeof s.x === 'number' && typeof s.y === 'number' && isFinite(s.x) && isFinite(s.y));
  
  // GATE: If no valid samples, declare INCONCLUSIVE instead of mismatch
  if (enemySamples.length === 0 || siteSamples.length === 0) {
    state.crownDebug.coordinateDiagnostic = {
      timestamp: new Date().toISOString(),
      gameTime: state.gameTime || 0,
      health: 'INCONCLUSIVE',
      reason: `Insufficient valid samples to diagnose`,
      missingSamples: {
        enemies: enemySamples.length === 0,
        sites: siteSamples.length === 0,
        crowns: crowns.length === 0,
      },
      samples: {
        enemyCount: enemySamples.length,
        siteCount: siteSamples.length,
        totalEnemies: enemies.length,
        totalSites: sites.length,
        crownCount: crowns.length,
      },
      ratios: { avgX: 'N/A', avgY: 'N/A', stable: 'N/A' },
      distances: { avg: 'N/A', max: 'N/A' },
      sourceStructures: { enemies: 'state.enemies', sites: 'state.sites', crowns: 'state.emperor.crowns' },
      warnings: [],
      verdict: '⏳ Insufficient data - unable to diagnose coordinate space'
    };
    return;
  }
  
  let totalRatioX = 0, totalRatioY = 0, sampleCount = 0;
  let maxDistance = 0;
  let distances = [];
  
  for (const enemy of enemySamples) {
    for (const site of siteSamples) {
      const dx = enemy.x - site.x;
      const dy = enemy.y - site.y;
      const dist = Math.hypot(dx, dy);
      distances.push(dist);
      maxDistance = Math.max(maxDistance, dist);
      
      if (site.x !== 0 && site.y !== 0) {
        totalRatioX += enemy.x / site.x;
        totalRatioY += enemy.y / site.y;
        sampleCount++;
      }
    }
  }
  
  const avgRatioX = sampleCount > 0 ? totalRatioX / sampleCount : 0;
  const avgRatioY = sampleCount > 0 ? totalRatioY / sampleCount : 0;
  const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b) / distances.length : 0;
  
  let coordHealth = 'OK';
  let warnings = [];
  
  if (sampleCount > 0 && (Math.abs(avgRatioX - 1.0) > 0.2 || Math.abs(avgRatioY - 1.0) > 0.2)) {
    coordHealth = 'SCALE_MISMATCH';
    warnings.push(`Ratio deviation: X=${avgRatioX.toFixed(2)}, Y=${avgRatioY.toFixed(2)}`);
  }
  
  if (maxDistance > 5000) {
    coordHealth = 'INVALID_WORLD_SCALE';
    warnings.push(`Max distance: ${maxDistance.toFixed(0)} units`);
  }
  
  // Store diagnostic
  state.crownDebug.coordinateDiagnostic = {
    timestamp: new Date().toISOString(),
    gameTime: state.gameTime || 0,
    health: coordHealth,
    samples: {
      enemyCount: enemySamples.length,
      siteCount: siteSamples.length,
      crownCount: crowns.length,
    },
    ratios: {
      avgX: +(avgRatioX.toFixed(3)),
      avgY: +(avgRatioY.toFixed(3)),
      stable: Math.abs(avgRatioX - 1.0) < 0.2 && Math.abs(avgRatioY - 1.0) < 0.2,
    },
    distances: {
      avg: +(avgDistance.toFixed(1)),
      max: +(maxDistance.toFixed(1)),
    },
    sourceStructures: {
      enemies: 'state.enemies',
      sites: 'state.sites',
      crowns: 'state.emperor.crowns',
    },
    warnings: warnings,
    verdict: coordHealth === 'OK' ? 'Coordinates in same space' : `⚠️ ${coordHealth}`
  };
}

/**
 * Log crown system event
 * @param {object} state - Game state
 * @param {string} eventType - Event category (pickup, drop, chase, ability, etc)
 * @param {string} detail - Event description
 * @param {object} data - Additional context data
 */
export function logCrownEvent(state, eventType, detail, data = {}) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const event = {
    time: state.gameTime || 0,
    gameTime: state.gameTime || 0,
    tick: state.crownDebug?.tick || 0,
    type: eventType,
    message: detail,
    data: structuredClone(data)
  };
  
  state.crownDebug.events.push(event);
  
  // Keep events array bounded
  if (state.crownDebug.events.length > state.crownDebug.maxEvents) {
    state.crownDebug.events.shift();
  }
  
  // Console output if verbose
  if (state.crownDebug.verbose) {
    console.log(`[CROWN DEBUG] [${eventType}] ${detail}`, data);
  }
}

/**
 * Track crown pickup event
 */
export function logCrownPickup(state, team, playerKey) {
  logCrownEvent(state, 'CROWN_PICKUP', `Player picked up Crown ${team}`, {
    team,
    playerKey,
    playerPos: { x: state.player?.x || 0, y: state.player?.y || 0 }
  });
}

/**
 * Track crown drop event
 */
export function logCrownDrop(state, team, reason = 'unknown') {
  logCrownEvent(state, 'CROWN_DROP', `Crown ${team} dropped (${reason})`, {
    team,
    reason,
    playerPos: state.player ? { x: state.player.x, y: state.player.y } : null
  });
}

/**
 * Track crown secured event
 */
export function logCrownSecured(state, team, baseName) {
  logCrownEvent(state, 'CROWN_SECURED', `Crown ${team} secured at ${baseName}`, {
    team,
    baseName
  });
}

/**
 * Track guard chase activation
 */
export function logGuardChaseStart(state, guard, team) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const guardId = guard._id || guard.id;
  const guardName = guard.name || `Guard_${guardId}`;
  const isDps = (guard.guardRole === 'DPS') || (guard.loadoutType === 'dps');
  
  logCrownEvent(state, 'GUARD_CHASE_START', 
    `${guardName} (${isDps ? 'DPS' : 'HEALER'}) started chasing Crown ${team}`, {
    guardId,
    guardName,
    team,
    role: guard.guardRole || guard.loadoutType,
    isDps,
    guardPos: { x: guard.x, y: guard.y }
  });
}

/**
 * Track guard chase end
 */
export function logGuardChaseEnd(state, guard, team, reason = 'unknown') {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const guardId = guard._id || guard.id;
  const guardName = guard.name || `Guard_${guardId}`;
  
  logCrownEvent(state, 'GUARD_CHASE_END', 
    `${guardName} stopped chasing Crown ${team} (${reason})`, {
    guardId,
    guardName,
    team,
    reason,
    guardPos: { x: guard.x, y: guard.y }
  });
}

/**
 * Track guard forced target assignment
 */
export function logGuardForcedTarget(state, guard, target, team) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const guardId = guard._id || guard.id;
  const guardName = guard.name || `Guard_${guardId}`;
  const targetName = target?.name || 'player';
  const targetId = target?.id || target?._id || 'player';
  
  logCrownEvent(state, 'GUARD_FORCED_TARGET', 
    `${guardName} assigned forced target: ${targetName}`, {
    guardId,
    guardName,
    team,
    targetId,
    targetName,
    targetPos: target ? { x: target.x, y: target.y } : null,
    guardPos: { x: guard.x, y: guard.y },
    distance: target ? Math.hypot(target.x - guard.x, target.y - guard.y) : null
  });
}

/**
 * Track guard ability usage targeting validation
 */
export function logGuardAbilityTarget(state, guard, ability, targetChosen, wasForced) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const guardId = guard._id || guard.id;
  const guardName = guard.name || `Guard_${guardId}`;
  
  logCrownEvent(state, 'GUARD_ABILITY_CAST', 
    `${guardName} cast ${ability} targeting ${targetChosen?.name || 'unknown'}${wasForced ? ' (FORCED)' : ''}`, {
    guardId,
    guardName,
    ability,
    targetId: targetChosen?.id || targetChosen?._id,
    targetName: targetChosen?.name,
    wasForced,
    distance: targetChosen ? Math.hypot(targetChosen.x - guard.x, targetChosen.y - guard.y) : null
  });
}

/**
 * Track crown carrier position and status
 */
export function logCrownCarrierStatus(state, team, carriedBy, secured) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const status = secured ? 'SECURED' : (carriedBy ? 'CARRIED' : 'DROPPED');
  
  logCrownEvent(state, 'CROWN_STATUS', `Crown ${team}: ${status}`, {
    team,
    carriedBy,
    secured,
    playerPos: state.player ? { x: state.player.x, y: state.player.y } : null
  });
}

/**
 * Track game-wide status updates
 */
export function logGameStatus(state) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  // Count flags by owner
  const flagCounts = {};
  if (state.sites) {
    for (const site of state.sites) {
      if (site.id && site.id.startsWith('site_')) {
        flagCounts[site.owner || 'neutral'] = (flagCounts[site.owner || 'neutral'] || 0) + 1;
      }
    }
  }
  
  logCrownEvent(state, 'GAME_STATUS', 'Game status snapshot', {
    playerHp: state.player?.hp || 0,
    playerMaxHp: state.player?.maxHp || 0,
    enemyCount: (state.enemies || []).length,
    friendlyCount: (state.friendlies || []).length,
    flagCounts,
    emperorTeam: state.emperorTeam,
    crowns: state.emperor?.crowns ? Object.fromEntries(
      Object.entries(state.emperor.crowns).map(([team, crown]) => [
        team,
        {
          carriedBy: crown.carriedBy,
          secured: crown.secured,
          position: { x: crown.x || 0, y: crown.y || 0 }
        }
      ])
    ) : {}
  });
}

/**
 * Get formatted crown debug report
 */
export function getCrownDebugReport(state) {
  if (!state.crownDebug) return 'Crown debug system not initialized';
  
  const events = state.crownDebug.events || [];
  if (events.length === 0) return 'No crown debug events logged';
  
  let report = `=== CROWN DEBUG REPORT (${events.length} events) ===\n\n`;
  
  // Group by type
  const byType = {};
  for (const event of events) {
    if (!byType[event.type]) byType[event.type] = [];
    byType[event.type].push(event);
  }
  
  // Format each type
  for (const [type, typeEvents] of Object.entries(byType)) {
    report += `${type}: ${typeEvents.length} events\n`;
    for (const evt of typeEvents.slice(-3)) { // Show last 3 of each type
      report += `  [${evt.t.toFixed(1)}s] ${evt.detail}\n`;
    }
    report += '\n';
  }
  
  return report;
}

/**
 * Clear crown debug log
 */
export function clearCrownDebugLog(state) {
  if (state.crownDebug) {
    state.crownDebug.events = [];
  }
}

/**
 * Export crown debug log as text file with coordinate diagnostics
 */
export function exportCrownDebugLog(state) {
  if (!state.crownDebug) return null;
  
  // Format as text log like other logs
  let logText = 'Crown System Debug Log\n';
  logText += '='.repeat(70) + '\n';
  logText += `Generated: ${new Date().toLocaleString()}\n`;
  logText += `Game Time: ${(state.gameTime || 0).toFixed(1)}s\n`;
  logText += `Total Events: ${state.crownDebug.events.length}\n`;
  logText += `Status: ${state.crownDebug.enabled ? 'ENABLED' : 'DISABLED'}\n\n`;
  
  // Include coordinate diagnostic snapshot if available
  if (state.crownDebug.coordinateDiagnostic) {
    const diag = state.crownDebug.coordinateDiagnostic;
    logText += '--- COORDINATE SPACE DIAGNOSTIC ---\n';
    logText += `Health: ${diag.health}\n`;
    const avgX = typeof diag.ratios.avgX === 'number' ? diag.ratios.avgX.toFixed(3) : String(diag.ratios.avgX);
    const avgY = typeof diag.ratios.avgY === 'number' ? diag.ratios.avgY.toFixed(3) : String(diag.ratios.avgY);
    logText += `Ratios: X=${avgX}, Y=${avgY} (stable: ${diag.ratios.stable ? 'YES' : 'NO'})\n`;
    const avgDist = typeof diag.distances.avg === 'number' ? diag.distances.avg.toFixed(1) : String(diag.distances.avg);
    const maxDist = typeof diag.distances.max === 'number' ? diag.distances.max.toFixed(1) : String(diag.distances.max);
    logText += `Distances: avg=${avgDist}, max=${maxDist}\n`;
    logText += `Sources: enemies→state.enemies, sites→state.sites, crowns→state.emperor.crowns\n`;
    logText += `Verdict: ${diag.verdict}\n`;
    if (diag.warnings.length > 0) {
      logText += `Warnings:\n`;
      for (const warn of diag.warnings) {
        logText += `  • ${warn}\n`;
      }
    }
    logText += '\n';
  }
  
  // Group events by type
  const eventsByType = {};
  for (const event of state.crownDebug.events) {
    if (!eventsByType[event.type]) eventsByType[event.type] = [];
    eventsByType[event.type].push(event);
  }
  
  // Write events grouped by type with FULL DETAILS
  logText += '--- EVENTS ---\n';
  if (state.crownDebug.events.length === 0) {
    logText += '(No crown events recorded)\n';
  } else {
    for (const [type, events] of Object.entries(eventsByType)) {
      logText += `\n${type} (${events.length}):\n`;
      for (const event of events) {
        const time = event.time ? event.time.toFixed(2) : '?';
        logText += `  [${time}s] ${event.message}\n`;
        
        // Print all event data as JSON for full visibility
        if (event.data && Object.keys(event.data).length > 0) {
          logText += `      Data: ${JSON.stringify(event.data, null, 2).split('\n').join('\n      ')}\n`;
        }
      }
    }
  }
  
  // Add summary section
  logText += '\n--- SUMMARY ---\n';
  const pickupCount = (eventsByType['CROWN_PICKUP'] || []).length;
  const dropCount = (eventsByType['CROWN_DROP'] || []).length;
  const secureCount = (eventsByType['CROWN_SECURED'] || []).length;
  const respawnCount = (eventsByType['CROWN_RESPAWN'] || []).length;
  
  logText += `Pickups: ${pickupCount}\n`;
  logText += `Drops: ${dropCount}\n`;
  logText += `Secured: ${secureCount}\n`;
  logText += `Respawns: ${respawnCount}\n`;
  
  logText += '\n' + '='.repeat(70) + '\n';
  logText += `End of Crown Debug Log\n`;
  
  // Create and download as text file
  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crown-debug-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  
  return { timestamp: new Date().toISOString(), events: state.crownDebug.events };
}

/**
 * Toggle crown debug on/off from console (self-initializing)
 * Usage: enableCrownDebug(state, true); enableCrownDebug(state, false);
 */
export function enableCrownDebug(state, on = true) {
  initCrownDebugSystem(state);
  
  // Only log if state actually changed
  const wasEnabled = state.crownDebug.enabled;
  state.crownDebug.enabled = on;
  
  if (wasEnabled !== on) {
    if (on) {
      console.log('[CROWN DEBUG] Enabled - crown events will be logged');
    } else {
      console.log('[CROWN DEBUG] Disabled');
    }
  }
  return state.crownDebug;
}

// =====================================================
// LAYER B: GUARD STATE MACHINE & ACTION TRACKING
// =====================================================

/**
 * Log guard state transition (IDLE → ACQUIRE → CHASE → ENGAGE → ESCORT → RETURN_HOME → STUCK_RECOVERY → ABORT)
 * Tracks state changes for individual guards to debug stuck/thrashing behaviors
 */
export function logGuardStateTransition(state, guard, fromState, toState, reason = '', targetId = null) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const guardId = guard._id || guard.id;
  const guardName = guard.name || `Guard_${guardId}`;
  
  logCrownEvent(state, 'GUARD_STATE_CHANGE', 
    `${guardName}: ${fromState} → ${toState}${reason ? ` (${reason})` : ''}`, {
    guardId,
    guardName,
    prevState: fromState,
    newState: toState,
    reason,
    targetId,
    timeInPrevState: guard._stateStartTime ? (state.gameTime || 0) - guard._stateStartTime : null,
    guardPos: { x: guard.x, y: guard.y },
    ...getCorrelationContext(state, guardId),
  });
}

/**
 * Log action that was blocked/failed (cooldown, stunned, unreachable, etc.)
 */
export function logActionBlocked(state, guard, intendedAction, blockedReason, targetId = null) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const guardId = guard._id || guard.id;
  const guardName = guard.name || `Guard_${guardId}`;
  
  logCrownEvent(state, 'ACTION_BLOCKED', 
    `${guardName} blocked from ${intendedAction}: ${blockedReason}`, {
    guardId,
    guardName,
    intendedAction,
    blockedReason,
    targetId,
    guardPos: { x: guard.x, y: guard.y },
    ...getCorrelationContext(state, guardId),
  });
}

/**
 * Log action resolution with all attempts/candidates
 */
export function logActionResolution(state, guard, action, resolvedTargetId, failureReason = null) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const guardId = guard._id || guard.id;
  const guardName = guard.name || `Guard_${guardId}`;
  
  logCrownEvent(state, 'ACTION_RESOLVED', 
    failureReason 
      ? `${guardName} ${action} FAILED: ${failureReason}`
      : `${guardName} ${action} resolved to target ${resolvedTargetId}`, {
    guardId,
    guardName,
    action,
    resolvedTargetId,
    failureReason,
    guardPos: { x: guard.x, y: guard.y },
    ...getCorrelationContext(state, guardId),
  });
}

// =====================================================
// LAYER C: TARGET SCORING & LEADER ELECTION
// =====================================================

/**
 * Log leader election with decision reasoning
 * Tracks oscillations and why leaders change
 */
export function logLeaderElection(state, ballId, prevLeaderId, newLeaderId, topCandidates = [], reason = '', holdDuration = 0) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  // topCandidates format: [{id, name, score, components: {distance, threat, objective}}]
  const scoreBoard = topCandidates.slice(0, 3).map(c => 
    `${c.name}(${c.id}): ${c.score.toFixed(1)} [${Object.entries(c.components || {}).map(([k,v]) => `${k}:${v.toFixed(2)}`).join(' ')}]`
  ).join(' | ');
  
  logCrownEvent(state, 'LEADER_ELECTED', 
    `Ball ${ballId}: ${prevLeaderId || 'none'} → ${newLeaderId} | ${reason}`, {
    ballId,
    prevLeaderId,
    newLeaderId,
    reason,
    holdDuration, // How many ticks leader should stay before re-election
    topCandidates: topCandidates.slice(0, 3),
    scoreBoard,
    ...getCorrelationContext(state, ballId),
  });
}

/**
 * Log target scoring for a guard's decision
 * Shows why a target was chosen or filtered
 */
export function logTargetScored(state, guard, candidates = []) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  // candidates format: [{id, name, type, score, components, filteredOut, filterReason}]
  const guardId = guard._id || guard.id;
  const guardName = guard.name || `Guard_${guardId}`;
  const winner = candidates.find(c => !c.filteredOut) || candidates[0];
  const filtered = candidates.filter(c => c.filteredOut);
  
  logCrownEvent(state, 'TARGET_SCORED', 
    `${guardName} chose target ${winner?.name || 'unknown'}`, {
    guardId,
    guardName,
    winner: winner ? {
      id: winner.id,
      name: winner.name,
      type: winner.type, // 'crown', 'carrier', 'enemy', 'escort-point'
      score: winner.score.toFixed(2),
      components: winner.components,
    } : null,
    filtered: filtered.map(f => ({
      id: f.id,
      name: f.name,
      filterReason: f.filterReason, // e.g., 'stunned', 'out-of-range', 'line-of-sight-blocked'
    })),
    ...getCorrelationContext(state, guardId),
  });
}

// =====================================================
// LAYER A: CROWN STATE TIMELINE ENHANCEMENTS
// =====================================================

/**
 * Log crown spawned
 */
/**
 * COMPREHENSIVE CROWN SPAWN LOGGING
 * Logs crown with base details, distance check, and coordinate validation
 */
export function logCrownSpawned(state, team, crownId, crown, base) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const distance = base && crown ? Math.hypot(crown.x - base.x, crown.y - base.y) : null;
  
  logCrownEvent(state, 'CROWN_SPAWNED', 
    `Crown ${team} spawned: dist=${distance?.toFixed(1) || 'N/A'}px from base`, {
    team,
    crownId,
    crownRaw: { x: crown?.x, y: crown?.y, r: crown?.r },
    baseId: base?.id,
    baseName: base?.name,
    basePos: { x: base?.x, y: base?.y },
    distanceFromBase: distance ? +(distance.toFixed(1)) : null,
    sourceCollections: {
      crown: 'state.emperor.crowns[team]',
      base: 'findTeamBaseSite(state, team)',
    },
    ...getCorrelationContext(state, crownId),
  });
}

/**
 * BASE ASSIGNMENT SNAPSHOT
 * Called once per match during emperor init to validate team->base mapping
 */
export function logBaseAssignmentSnapshot(state) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const teams = ['teamA', 'teamB', 'teamC'];
  const assignments = [];
  
  for (const team of teams) {
    const base = findTeamBaseSite(state, team);
    const crown = state.emperor?.crowns?.[team];
    
    assignments.push({
      team,
      baseId: base?.id || null,
      baseName: base?.name || null,
      basePos: base ? { x: base.x, y: base.y } : null,
      crownId: crown?.id || null,
      crownPresent: !!crown,
      distanceSpawned: crown && base ? Math.hypot(crown.x - base.x, crown.y - base.y) : null,
    });
  }
  
  logCrownEvent(state, 'BASE_ASSIGNMENT_SNAPSHOT',
    `Team→Base→Crown mapping at match start`, {
    assignments,
    sitesTotal: (state.sites || []).length,
    sitesInGameSpace: (state.sites || []).filter(s => (s.y ?? 0) < 2100).length,
    crownsTotal: Object.keys(state.emperor?.crowns || {}).length,
    sourceCollections: {
      bases: 'state.sites',
      crowns: 'state.emperor.crowns',
    },
    ...getCorrelationContext(state),
  });
}

/**
 * Log crown carrier changed
 */
export function logCrownCarrierChanged(state, team, crownId, oldCarrier, newCarrier, reason = '') {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'CROWN_CARRIER_CHANGED', 
    `Crown ${team} carrier: ${oldCarrier || 'none'} → ${newCarrier} ${reason ? `(${reason})` : ''}`, {
    team,
    crownId,
    prevCarrier: oldCarrier,
    newCarrier,
    reason,
    ...getCorrelationContext(state, crownId),
  });
}

/**
 * Log crown invalid state (shouldn't happen, indicates bug)
 */
export function logCrownInvalidState(state, team, crownId, problem, currentState) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'CROWN_INVALID_STATE', `⚠️ Crown ${team}: ${problem}`, {
    team,
    crownId,
    problem,
    currentState,
    ...getCorrelationContext(state, crownId),
  });
}

// =====================================================
// CROWN PICKUP LOGGING - COMPREHENSIVE
// =====================================================

/**
 * Log every crown pickup attempt (not just success)
 * Call this when player is within ~150px of crown, BEFORE checking eligibility
 * This captures: why pickup happened, why it was blocked, what the calc showed
 */
export function logCrownPickupAttempt(state, team, crown, player, distance, pickupRadius) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const isEmperor = state.emperor?.active;
  const alreadyCarrying = state.emperor?.carriedCrowns?.length > 0;
  const crownCarriedBy = crown?.carriedBy;
  const crownLocked = crown?.secured;
  
  logCrownEvent(state, 'CROWN_PICKUP_ATTEMPT',
    `Player within range of ${team} crown (dist=${distance.toFixed(1)}px)`, {
    team,
    crownId: crown?.id,
    playerPos: { x: player?.x, y: player?.y },
    crownPos: { x: crown?.x, y: crown?.y },
    distance: +(distance.toFixed(1)),
    pickupRadius,
    withinRange: distance <= pickupRadius,
    eligibility: {
      isEmperorActive: isEmperor,
      playerCarryingMax: alreadyCarrying,
      crownCarriedBy: crownCarriedBy || 'none',
      crownLocked: crownLocked,
      canPickup: isEmperor && !alreadyCarrying && !crownCarriedBy && !crownLocked,
    },
    ...getCorrelationContext(state, player?.id),
  });
}

/**
 * Log when pickup was blocked (why didn't it succeed)
 */
export function logCrownPickupBlocked(state, team, crown, player, distance, reason) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'CROWN_PICKUP_BLOCKED',
    `Pickup blocked for ${team}: ${reason}`, {
    team,
    crownId: crown?.id,
    playerPos: { x: player?.x, y: player?.y },
    crownPos: { x: crown?.x, y: crown?.y },
    distance: distance ? +(distance.toFixed(1)) : null,
    blockedReason: reason,
    crownState: {
      carriedBy: crown?.carriedBy,
      secured: crown?.secured,
    },
    ...getCorrelationContext(state, player?.id),
  });
}

/**
 * COORDINATE SANITY CHECK when pickup fails
 * If player appears close on screen but distance calc says far, log it
 */
export function logCoordSanitySnapshot(state, player, crown, distCalc, context = '') {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'COORD_SANITY_SNAPSHOT',
    `⚠️ Sanity check: ${context}`, {
    playerWorldPos: { x: player?.x, y: player?.y },
    crownWorldPos: { x: crown?.x, y: crown?.y },
    distanceCalculated: +(distCalc.toFixed(1)),
    sourceCollections: {
      player: 'state.player',
      crown: 'state.emperor.crowns[team]',
    },
    context,
    checkTime: new Date().toISOString(),
    ...getCorrelationContext(state, player?.id),
  });
}

/**
 * CARRIED CROWN VALIDATION + INTEGRITY CHECKS
 * Enforces: carriedCrowns array matches crown.carriedBy, SECURED without PICKUP flagged
 */
export function validateCarriedCrownsArray(state) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const teams = ['teamA', 'teamB', 'teamC'];
  const crownsWithCarrier = [];
  const desyncDetails = [];
  const integrityViolations = [];
  
  for (const team of teams) {
    const crown = state.emperor?.crowns?.[team];
    if (crown?.carriedBy === 'player') {
      crownsWithCarrier.push(team);
      if (!state.emperor?.carriedCrowns?.includes(team)) {
        desyncDetails.push(`Crown ${team} has carriedBy='player' but NOT in array`);
      }
    }
    
    // CRITICAL: Check for SECURED without being carried (gameplay bug)
    if (crown?.secured && crown.carriedBy !== 'player') {
      integrityViolations.push(`Crown ${team} SECURED but carriedBy='${crown.carriedBy}' (should be 'player')`);
    }
  }
  
  if (state.emperor?.carriedCrowns) {
    for (const team of state.emperor.carriedCrowns) {
      const crown = state.emperor?.crowns?.[team];
      if (!crown || crown.carriedBy !== 'player') {
        desyncDetails.push(`Array has ${team} but crown.carriedBy='${crown?.carriedBy || 'null'}'`);
      }
    }
  }
  
  if (integrityViolations.length > 0) {
    logCrownEvent(state, 'CROWN_INTEGRITY_VIOLATION',
      `⚠️ CRITICAL: Crown state impossible: ${integrityViolations.join('; ')}`, {
      violations: integrityViolations,
      ...getCorrelationContext(state),
    });
  }
  
  if (desyncDetails.length > 0) {
    logCrownEvent(state, 'CROWN_CARRY_DESYNC',
      `⚠️ carriedCrowns array out of sync`, {
      arrayContents: state.emperor?.carriedCrowns || [],
      crownsByCarrier: crownsWithCarrier,
      desyncDetails,
      ...getCorrelationContext(state),
    });
    
    state.emperor.carriedCrowns = crownsWithCarrier;
    logCrownEvent(state, 'CROWN_CARRY_REBUILT',
      `Rebuilt carriedCrowns from crown objects`, {
      rebuilt: crownsWithCarrier,
      ...getCorrelationContext(state),
    });
  }
}

// =====================================================
// LAYER D: COORDINATE ANOMALY DETECTION
// =====================================================

/**
 * Log coordinate space anomaly (automatic, low-noise)
 * Only logs when distance is suspicious or ratio is off
 */
export function logCoordinateAnomaly(state, entityId, entityType, samplePos, targetPos, distance, ratioX, ratioY, reason = '') {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  // Only log if actually suspicious
  const isSuspicious = distance > 2000 || 
                       Math.abs(ratioX - 1.0) > 0.3 || 
                       Math.abs(ratioY - 1.0) > 0.3 ||
                       isNaN(distance) || 
                       isNaN(ratioX) || 
                       isNaN(ratioY);
  
  if (!isSuspicious) return;
  
  const verdict = distance > 2000 ? 'HUGE_DISTANCE' : 
                 (Math.abs(ratioX - 4.0) < 0.3 || Math.abs(ratioY - 4.0) < 0.3) ? 'SCALE_NEAR_4X' :
                 (isNaN(distance) || isNaN(ratioX) || isNaN(ratioY)) ? 'NaN_VALUES' :
                 'RATIO_OFF';
  
  logCrownEvent(state, 'COORD_ANOMALY', 
    `⚠️ ${entityType} to target: dist=${distance.toFixed(0)} ratio=(${ratioX.toFixed(2)},${ratioY.toFixed(2)}) [${verdict}]`, {
    entityId,
    entityType,
    entityPos: samplePos,
    targetPos,
    distance: distance.toFixed(1),
    ratioX: ratioX.toFixed(2),
    ratioY: ratioY.toFixed(2),
    verdict,
    reason,
    ...getCorrelationContext(state, entityId),
  });
}

// =====================================================
// NO-OP / FAILURE REASONS (explicit tracking)
// =====================================================

/**
 * Log when crown target was not found / invalid
 */
export function logNoCrownTarget(state, team, reason = '') {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'NO_CROWN_TARGET', `No crown target for ${team}: ${reason}`, {
    team,
    reason,
    ...getCorrelationContext(state),
  });
}

/**
 * Log when no valid site was found
 */
export function logNoValidSite(state, reason = '') {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'NO_VALID_SITE', `No valid site found: ${reason}`, {
    reason,
    sitesAvailable: (state.sites || []).length,
    sitesValid: (state.sites || []).filter(s => s && s.x != null && s.y != null).length,
    ...getCorrelationContext(state),
  });
}

/**
 * Log path finding failure
 */
export function logPathFail(state, entityId, reason = '') {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'PATH_FAIL', `Pathfinding failed: ${reason}`, {
    entityId,
    reason,
    ...getCorrelationContext(state, entityId),
  });
}

// ===== 6 CRITICAL GUARD LOGGING FUNCTIONS =====

/**
 * 1. CROWN_GUARDS_SPAWNED - Log when crown guards are spawned
 * Called once per crown at spawn time
 */
export function logCrownGuardsSpawned(state, team, guardIds = [], spawnPos = null, guardBasePos = null) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const crowns = state.emperor?.crowns || {};
  const crown = crowns[team];
  
  logCrownEvent(state, 'CROWN_GUARDS_SPAWNED',
    `Crown guards spawned for ${team}: ${guardIds.length} guards`,
    {
      team,
      guardIds: guardIds.slice(0, 5), // First 5 guard IDs
      guardCount: guardIds.length,
      crownPos: crown ? { x: crown.x, y: crown.y } : null,
      guardSpawnPos: spawnPos,
      guardBasePos: guardBasePos,
      ...getCorrelationContext(state),
    });
}

/**
 * 2. CROWN_GUARDS_ASSIGNED - Log initial guard group assignment
 * Called at match start or when guards assigned to crown
 */
export function logCrownGuardsAssigned(state, team, guardBallId, initialLeaderId, objective = 'PROTECT_CROWN') {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'CROWN_GUARDS_ASSIGNED',
    `Crown guards assigned: team=${team}, leader=${initialLeaderId}, obj=${objective}`,
    {
      team,
      guardBallId,
      initialLeaderId,
      objective,
      ...getCorrelationContext(state),
    });
}

/**
 * 3. GUARD_STATE_CHANGE - Log state machine transitions
 * Called whenever a guard changes state (IDLE → ACQUIRE → CHASE → etc)
 */
export function logGuardStateChange(state, guardId, fromState, toState, reason = '', timeInPrevState = 0, targetId = null) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  logCrownEvent(state, 'GUARD_STATE_CHANGE',
    `Guard ${guardId.slice(0, 8)}: ${fromState}→${toState} (${reason})`,
    {
      guardId,
      fromState,
      toState,
      reason,
      timeInPrevState: +(timeInPrevState.toFixed(2)),
      targetId: targetId || null,
      ...getCorrelationContext(state, guardId),
    });
}

/**
 * 4. TARGET_RESOLVED - Log target resolution with failure reasons
 * Called when guards try to find a target (crown, carrier, escort target, etc)
 */
export function logTargetResolved(state, guardId, desiredType, resolvedId = null, failReason = null) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const status = resolvedId ? 'SUCCESS' : 'FAILED';
  const message = resolvedId 
    ? `Guard ${guardId.slice(0, 8)} resolved ${desiredType}→${resolvedId.slice(0, 8)}`
    : `Guard ${guardId.slice(0, 8)} FAILED to resolve ${desiredType}: ${failReason}`;
  
  logCrownEvent(state, 'TARGET_RESOLVED',
    message,
    {
      guardId,
      desiredTargetType: desiredType,
      resolvedTargetId: resolvedId,
      status,
      failReason: failReason || null,
      failReasons: failReason ? [failReason] : [],
      ...getCorrelationContext(state, guardId),
    });
}

/**
 * 6. LEADER_ELECTED - Log leader election with hold duration and top candidates
 * Called when a new leader is elected, includes hold info to catch thrashing
 */
export function logLeaderElected(state, ballId, newLeaderId, prevLeaderId = null, holdDuration = 0, topCandidates = []) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const isThrashy = holdDuration < 0.5 && prevLeaderId !== null; // Rapid re-election
  const severity = isThrashy ? 'WARN' : 'INFO';
  
  logCrownEvent(state, 'LEADER_ELECTED',
    `${severity}: Ball ${ballId} new leader ${newLeaderId.slice(0, 8)} (held ${holdDuration.toFixed(2)}s)`,
    {
      ballId,
      newLeaderId,
      prevLeaderId: prevLeaderId || null,
      holdDuration: +(holdDuration.toFixed(2)),
      isThrashy: isThrashy,
      topCandidates: topCandidates.slice(0, 3).map(c => ({
        id: c.id ? c.id.slice(0, 8) : 'unknown',
        score: c.score || 0,
      })),
      ...getCorrelationContext(state, newLeaderId),
    });
}

/**
 * Detect leader election thrashing (too many changes in short time)
 * Called after each leader election to check if ball is unstable
 */
export function detectLeaderThrash(state, ballId) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  // Track leader changes per ball
  if (!state.crownDebug._leaderChangeHistory) state.crownDebug._leaderChangeHistory = {};
  if (!state.crownDebug._leaderChangeHistory[ballId]) state.crownDebug._leaderChangeHistory[ballId] = [];
  
  const now = state.gameTime || 0;
  const history = state.crownDebug._leaderChangeHistory[ballId];
  
  // Record this change
  history.push(now);
  
  // Keep only last 30 seconds of history
  while (history.length > 0 && history[0] < now - 30) {
    history.shift();
  }
  
  // Thrash = more than 2 changes in last 2 seconds
  const recentChanges = history.filter(t => t > now - 2);
  
  if (recentChanges.length > 2) {
    const severity = recentChanges.length > 5 ? 'CRITICAL' : 'WARN';
    logCrownEvent(state, 'LEADER_THRASH_DETECTED',
      `${severity}: Ball ${ballId} leader thrashing - ${recentChanges.length} changes in 2s`,
      {
        ballId,
        changeCount: recentChanges.length,
        timeWindow: 2,
        severity,
        allChangesInWindow: recentChanges.length,
        ...getCorrelationContext(state),
      });
  }
}

/**
 * Log guard assignment coverage for a crown
 * Prove each crown has N guards assigned
 */
export function logCrownGuardAssignmentCoverage(state, team, expectedCount = 5) {
  if (!state.crownDebug || !state.crownDebug.enabled) return;
  
  const crown = state.emperor?.crowns?.[team];
  if (!crown) return;
  
  const guardIds = state.emperor?.crownGuards?.[team] || [];
  const missingCount = Math.max(0, expectedCount - guardIds.length);
  const duplicates = [];
  
  // Check for duplicates in array
  const seen = new Set();
  for (const id of guardIds) {
    if (seen.has(id)) {
      duplicates.push(id);
    }
    seen.add(id);
  }
  
  logCrownEvent(state, 'CROWN_GUARD_ASSIGNMENT',
    `Crown ${team}: ${guardIds.length}/${expectedCount} guards assigned`,
    {
      team,
      crownId: crown._id,
      expectedGuardCount: expectedCount,
      assignedGuardIds: guardIds.slice(0, 5),
      actualCount: guardIds.length,
      missingCount: missingCount,
      duplicateGuardIds: duplicates,
      reason: 'spawn',
      ...getCorrelationContext(state),
    });
}
