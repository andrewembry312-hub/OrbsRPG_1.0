/**
 * HP CHANGE AUDIT PIPELINE
 * ========================
 * 
 * Centralized system for tracking all HP changes with full attribution:
 * - Reason code (heal_burst, divine_touch, damage, level_up, sync, etc)
 * - Source entity ID + ability ID (if applicable)
 * - Target ID
 * - Before/after values
 * - Direct set vs delta change
 * 
 * Prevents "phantom HP changes" and makes combat auditing possible.
 */

export function initHpAuditSystem(state) {
  if (!state.hpAudit) {
    state.hpAudit = {
      enabled: false,  // Toggle with debug options
      log: [],         // Event log
      maxEvents: 1000, // Keep last 1000 changes
      summary: {       // Quick stats
        totalHeals: 0,
        totalDamage: 0,
        phantomChanges: 0  // Changes without proper source
      }
    };
  }
}

/**
 * Central hub for HP changes - ALL HP modifications should use this
 * @param {object} target - Entity having HP changed (player, enemy, friendly, etc)
 * @param {number} delta - Change amount (positive = heal, negative = damage)
 * @param {string} reason - Why (heal_burst, divine_touch, warcry, damage, setMaxHp, syncStats, level_up, revive, etc)
 * @param {object} source - Source of change {entityId, abilityId}
 * @param {object} state - Game state (for audit logging)
 * @param {boolean} isDirect - True if setting HP directly, false if adding delta
 * @returns {object} Result of change {oldHp, newHp, clamped, delta}
 */
export function auditHpChange(target, delta, reason, source = {}, state = null, isDirect = false) {
  if (!target) return { error: 'No target' };
  
  const oldHp = target.hp || 0;
  const maxHp = target.maxHp || 999999;
  
  // Compute new HP
  let newHp;
  let actualDelta;
  if (isDirect) {
    newHp = Math.max(0, Math.min(delta, maxHp)); // delta is actual new HP
    actualDelta = newHp - oldHp;
  } else {
    newHp = Math.max(0, Math.min(oldHp + delta, maxHp)); // delta is change
    actualDelta = delta;
  }
  
  // Apply change
  target.hp = newHp;
  
  // Log to audit system
  if (state && state.hpAudit && state.hpAudit.enabled) {
    const auditEvent = {
      t: state.gameTime || 0,
      targetId: target.id || target._id || '?',
      targetType: target.type || (target === state.player ? 'player' : 'unknown'),
      reason,
      sourceId: source.entityId || '?',
      abilityId: source.abilityId || null,
      oldHp: oldHp,
      newHp: newHp,
      delta: actualDelta,
      maxHp: maxHp,
      isDirect: isDirect,
      clamped: actualDelta !== delta // True if the change was clamped
    };
    
    state.hpAudit.log.push(auditEvent);
    
    // Keep log bounded
    if (state.hpAudit.log.length > state.hpAudit.maxEvents) {
      state.hpAudit.log.shift();
    }
    
    // Update summary
    if (actualDelta > 0) {
      state.hpAudit.summary.totalHeals += actualDelta;
    } else if (actualDelta < 0) {
      state.hpAudit.summary.totalDamage += Math.abs(actualDelta);
    }
  }
  
  return {
    oldHp,
    newHp,
    clamped: actualDelta !== delta,
    delta: actualDelta,
    maxHp
  };
}

/**
 * Convenience wrapper: Heal entity
 */
export function auditHeal(target, amount, abilityId, state = null, sourceId = null) {
  return auditHpChange(target, amount, `heal_${abilityId || 'generic'}`, 
    { entityId: sourceId, abilityId }, state, false);
}

/**
 * Convenience wrapper: Damage entity
 */
export function auditDamage(target, amount, reason = 'damage', state = null, sourceId = null) {
  return auditHpChange(target, -Math.abs(amount), reason, 
    { entityId: sourceId }, state, false);
}

/**
 * Convenience wrapper: Set HP directly (respawn, level-up stat rebuild, etc)
 */
export function auditSetHp(target, newHp, reason, state = null) {
  return auditHpChange(target, newHp, reason, {}, state, true);
}

/**
 * Get HP audit summary for a specific entity
 */
export function getEntityHpAudit(state, entityId) {
  if (!state.hpAudit) return null;
  
  const events = state.hpAudit.log.filter(e => e.targetId === entityId);
  
  return {
    entityId,
    eventCount: events.length,
    totalHealsReceived: events.filter(e => e.delta > 0).reduce((sum, e) => sum + e.delta, 0),
    totalDamageReceived: events.filter(e => e.delta < 0).reduce((sum, e) => sum + Math.abs(e.delta), 0),
    events: events.slice(-10) // Last 10 events for this entity
  };
}

/**
 * Find phantom HP changes (large jumps without matching heal events)
 */
export function findPhantomHpChanges(state, threshold = 100) {
  if (!state.hpAudit) return [];
  
  const phantoms = [];
  const events = state.hpAudit.log;
  
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];
    
    // Same entity, same timeframe
    if (prev.targetId === curr.targetId && (curr.t - prev.t) < 0.1) {
      const gap = curr.oldHp - prev.newHp;
      
      // Large unexplained jump
      if (Math.abs(gap) > threshold) {
        phantoms.push({
          t: curr.t,
          entityId: curr.targetId,
          beforeEvent: prev,
          afterEvent: curr,
          unexplainedDelta: gap,
          explanation: gap > 0 ? 'HP increased without heal source' : 'HP decreased without damage source'
        });
      }
    }
  }
  
  return phantoms;
}

/**
 * Get HP audit report for debugging
 */
export function getHpAuditReport(state) {
  if (!state.hpAudit) return 'HP audit system not initialized';
  
  const { log, summary } = state.hpAudit;
  
  let report = `=== HP AUDIT REPORT ===\n`;
  report += `Total Events: ${log.length}\n`;
  report += `Total Heals: ${summary.totalHeals.toFixed(1)}\n`;
  report += `Total Damage: ${summary.totalDamage.toFixed(1)}\n`;
  report += `Phantom Changes: ${summary.phantomChanges}\n\n`;
  
  // Recent events
  report += `Recent Changes:\n`;
  for (const evt of log.slice(-10)) {
    const sign = evt.delta > 0 ? '+' : '';
    const source = evt.sourceId !== '?' ? ` from ${evt.sourceId}` : '';
    report += `  [${evt.t.toFixed(1)}s] ${evt.targetId} ${evt.reason}: ${sign}${evt.delta.toFixed(0)} (${evt.oldHp.toFixed(0)}→${evt.newHp.toFixed(0)})${source}\n`;
  }
  
  return report;
}

/**
 * Clear HP audit log
 */
export function clearHpAuditLog(state) {
  if (state.hpAudit) {
    state.hpAudit.log = [];
    state.hpAudit.summary = { totalHeals: 0, totalDamage: 0, phantomChanges: 0 };
  }
}

/**
 * Toggle HP audit on/off from console (self-initializing)
 * Usage: enableHpAudit(state, true); enableHpAudit(state, false);
 */
export function enableHpAudit(state, on = true) {
  initHpAuditSystem(state);
  state.hpAudit.enabled = on;
  if (on) {
    console.log('[HP AUDIT] Enabled - all HP changes will be tracked');
  } else {
    console.log('[HP AUDIT] Disabled');
  }
  return state.hpAudit;
}

/**
 * Guard function to detect untracked HP changes in a loop
 * Drop this in your main game loop to catch HP changes happening outside the audit pipeline
 * Usage: detectUntrackedHpChange(entity);
 */
export function detectUntrackedHpChange(entity) {
  if (entity._lastAuditedHp != null && entity.hp !== entity._lastAuditedHp) {
    const change = entity.hp - entity._lastAuditedHp;
    console.warn('[HP AUDIT] UNTRACKED HP CHANGE', {
      id: entity.id || entity._id || '?',
      before: entity._lastAuditedHp,
      after: entity.hp,
      delta: change
    });
  }
  entity._lastAuditedHp = entity.hp;
}
