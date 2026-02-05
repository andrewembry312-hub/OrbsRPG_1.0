/**
 * Coordinate Space Sanity Checker
 * 
 * Use this to prove/disprove coordinate space mismatch.
 * Call from browser console while game is running to get immediate proof.
 */

export function pos(o) {
  if (!o) return null;
  return { x: +(o.x ?? 0).toFixed(2), y: +(o.y ?? 0).toFixed(2) };
}

export function dist(a, b) {
  const ax = a?.x ?? 0, ay = a?.y ?? 0, bx = b?.x ?? 0, by = b?.y ?? 0;
  return Math.hypot(bx - ax, by - ay);
}

/**
 * Phase 1 Diagnostic: Is there a coordinate space mismatch?
 * 
 * What to look for:
 * - dEE and dFF should always be 0 (same object to itself)
 * - If dEF is 3000+, then EITHER enemy.x/y OR flag.x/y is in wrong space
 * 
 * Run from console: debugCoordSanity(state)
 */
export function debugCoordSanity(state) {
  const enemies = state.enemies || [];
  const flags = state.flags || state.world?.flags || state.world?.sites || [];
  
  const f0 = flags[0];
  const e0 = enemies[0];
  
  if (!e0 || !f0) {
    return {
      ok: false,
      reason: 'missing enemy or flag',
      e0: !!e0,
      f0: !!f0,
      enemyCount: enemies.length,
      flagCount: flags.length
    };
  }

  const dEF = dist(e0, f0);
  const dEE = dist(e0, e0);
  const dFF = dist(f0, f0);

  return {
    ok: true,
    e0_pos: pos(e0),
    f0_pos: pos(f0),
    dEF: +dEF.toFixed(2),
    dEE: +dEE.toFixed(2),
    dFF: +dFF.toFixed(2),
    verdict: dEF > 1000 ? 'MISMATCH DETECTED' : 'coordinates look reasonable',
    enemyHasScreenLike: (e0.sx != null || e0.sy != null),
    flagHasScreenLike: (f0.sx != null || f0.sy != null),
    e0_type: e0.type || e0.entityType || '?',
    f0_type: f0.type || f0.entityType || '?'
  };
}

/**
 * Phase 2 Diagnostic: Which group has different magnitude?
 * 
 * If enemies are 0–5000 but flags are 0–1500 (or vice versa),
 * you've found which pipeline is in the wrong space.
 * 
 * Run from console: debugCoordRanges(state)
 */
function rangeStats(list) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const o of list) {
    const x = o?.x ?? 0, y = o?.y ?? 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX: +minX.toFixed(2), maxX: +maxX.toFixed(2), minY: +minY.toFixed(2), maxY: +maxY.toFixed(2) };
}

export function debugCoordRanges(state) {
  const enemies = state.enemies || [];
  const flags = state.flags || state.world?.flags || state.world?.sites || [];
  const sites = state.sites || [];
  
  return {
    enemies: { count: enemies.length, ...rangeStats(enemies) },
    flags: { count: flags.length, ...rangeStats(flags) },
    sites: { count: sites.length, ...rangeStats(sites) },
    map: { w: state.mapW, h: state.mapH, tileSize: state.tileSize, camScale: state.camera?.scale },
    verdict: enemies.length > 0 && flags.length > 0 
      ? rangeStats(enemies).maxX < 2000 && rangeStats(flags).maxX > 3000 
        ? 'FLAGS IN DIFFERENT SPACE'
        : rangeStats(enemies).maxX > 3000 && rangeStats(flags).maxX < 2000
        ? 'ENEMIES IN DIFFERENT SPACE'
        : 'ranges similar (might be ok)'
      : 'need more entities'
  };
}

/**
 * Quick one-liner to paste into console and snapshot
 * 
 * Copy this entire block, paste into browser console while game is running:
 * 
 * (()=>{
 *   const result = { sanity: debugCoordSanity(state), ranges: debugCoordRanges(state) };
 *   console.table(result.sanity);
 *   console.table(result.ranges);
 *   return result;
 * })()
 */
export function coordinateDiagnosticSnapshot(state) {
  return {
    sanity: debugCoordSanity(state),
    ranges: debugCoordRanges(state),
    timestamp: new Date().toISOString(),
    gameTime: state.gameTime || 0
  };
}
