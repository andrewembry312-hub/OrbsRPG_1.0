// ═══════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER IMAGE GENERATOR - Canvas-based placeholder portraits for fighters
// ═══════════════════════════════════════════════════════════════════════════════

import { LOADOUT_REGISTRY } from "./loadout-registry.js";
import { FACTIONS } from "./fighter-factions.js";
import { getAssetPath } from "../config.js";

// Cache generated placeholder data URLs to avoid regenerating
const placeholderCache = {};

// Role-based color schemes
const ROLE_COLORS = {
  dps:    { primary: '#DC2626', secondary: '#991B1B', accent: '#FCA5A5', icon: '⚔️', label: 'DPS' },
  tank:   { primary: '#2563EB', secondary: '#1E40AF', accent: '#93C5FD', icon: '🛡️', label: 'TANK' },
  healer: { primary: '#16A34A', secondary: '#166534', accent: '#86EFAC', icon: '💚', label: 'HEAL' },
  flex:   { primary: '#9333EA', secondary: '#6B21A8', accent: '#D8B4FE', icon: '✦',  label: 'FLEX' }
};

// Rarity border colors
const RARITY_GLOW = {
  common:    { color: '#9CA3AF', glow: 'rgba(156,163,175,0.3)' },
  uncommon:  { color: '#10B981', glow: 'rgba(16,185,129,0.4)' },
  rare:      { color: '#3B82F6', glow: 'rgba(59,130,246,0.5)' },
  epic:      { color: '#8B5CF6', glow: 'rgba(139,92,246,0.6)' },
  legendary: { color: '#F59E0B', glow: 'rgba(245,158,11,0.7)' }
};

/**
 * Generate a canvas-based placeholder image for a fighter
 * @param {Object} options
 * @param {string} options.name - Fighter name
 * @param {string} options.role - dps/tank/healer/flex
 * @param {string} options.faction - Faction ID (optional)
 * @param {string} options.rarity - Rarity tier (optional)
 * @param {number} options.width - Canvas width (default 240)
 * @param {number} options.height - Canvas height (default 320)
 * @returns {string} Data URL of the generated image
 */
export function generatePlaceholderImage(options = {}) {
  const {
    name = 'Unknown',
    role = 'dps',
    faction = null,
    rarity = 'common',
    width = 240,
    height = 320
  } = options;
  
  // Check cache
  const cacheKey = `${name}_${role}_${faction}_${rarity}_${width}x${height}`;
  if (placeholderCache[cacheKey]) return placeholderCache[cacheKey];
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  const roleColor = ROLE_COLORS[role] || ROLE_COLORS.dps;
  const rarityInfo = RARITY_GLOW[rarity] || RARITY_GLOW.common;
  const factionInfo = faction ? FACTIONS[faction] : null;
  
  // === Background gradient ===
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0a0a0a');
  bgGrad.addColorStop(0.3, factionInfo ? factionInfo.bgColor : '#111118');
  bgGrad.addColorStop(0.7, roleColor.secondary);
  bgGrad.addColorStop(1, '#050505');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);
  
  // === Diamond pattern overlay ===
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = roleColor.accent;
  ctx.lineWidth = 1;
  const spacing = 20;
  for (let i = -height; i < width + height; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + height, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + height, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  
  // === Large role icon silhouette (center) ===
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.font = `bold ${Math.floor(width * 0.6)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = roleColor.primary;
  ctx.fillText(roleColor.icon, width / 2, height * 0.42);
  ctx.restore();
  
  // === Faction emblem (top area) ===
  if (factionInfo) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.font = `${Math.floor(width * 0.35)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = factionInfo.color;
    ctx.fillText(factionInfo.icon, width / 2, height * 0.2);
    ctx.restore();
  }
  
  // === Initials circle (center) ===
  const initials = getInitials(name);
  const circleR = Math.floor(width * 0.18);
  const circleX = width / 2;
  const circleY = height * 0.4;
  
  // Circle background
  const circGrad = ctx.createRadialGradient(circleX, circleY, 0, circleX, circleY, circleR);
  circGrad.addColorStop(0, roleColor.primary);
  circGrad.addColorStop(1, roleColor.secondary);
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
  ctx.fillStyle = circGrad;
  ctx.fill();
  
  // Circle border
  ctx.lineWidth = 3;
  ctx.strokeStyle = rarityInfo.color;
  ctx.stroke();
  
  // Initials text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(circleR)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, circleX, circleY);
  
  // === Rarity glow ring ===
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR + 8, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = rarityInfo.color;
  ctx.shadowColor = rarityInfo.glow;
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.restore();
  
  // === Name banner (bottom area) ===
  const bannerY = height * 0.65;
  const bannerH = height * 0.12;
  
  // Banner background
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, bannerY, width, bannerH);
  
  // Banner top/bottom lines
  ctx.strokeStyle = rarityInfo.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, bannerY);
  ctx.lineTo(width * 0.9, bannerY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width * 0.1, bannerY + bannerH);
  ctx.lineTo(width * 0.9, bannerY + bannerH);
  ctx.stroke();
  
  // Name text (auto-size to fit)
  ctx.fillStyle = '#ffffff';
  let fontSize = Math.floor(width * 0.075);
  ctx.font = `bold ${fontSize}px Arial`;
  while (ctx.measureText(name).width > width * 0.85 && fontSize > 8) {
    fontSize--;
    ctx.font = `bold ${fontSize}px Arial`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, width / 2, bannerY + bannerH / 2);
  
  // === Role badge (below banner) ===
  const badgeY = bannerY + bannerH + height * 0.04;
  const badgeW = width * 0.3;
  const badgeH = height * 0.06;
  const badgeX = (width - badgeW) / 2;
  
  // Badge background
  ctx.fillStyle = roleColor.secondary;
  ctx.beginPath();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
  ctx.fill();
  ctx.strokeStyle = roleColor.accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
  ctx.stroke();
  
  // Badge text
  ctx.fillStyle = roleColor.accent;
  ctx.font = `bold ${Math.floor(height * 0.035)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(roleColor.label, width / 2, badgeY + badgeH / 2);
  
  // === Faction name (bottom) ===
  if (factionInfo) {
    ctx.fillStyle = factionInfo.color;
    ctx.globalAlpha = 0.7;
    ctx.font = `${Math.floor(height * 0.028)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${factionInfo.icon} ${factionInfo.name}`, width / 2, height * 0.9);
    ctx.globalAlpha = 1;
  }
  
  // === Corner decorations ===
  ctx.strokeStyle = rarityInfo.color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  const cornerSize = 15;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(4, cornerSize + 4);
  ctx.lineTo(4, 4);
  ctx.lineTo(cornerSize + 4, 4);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - cornerSize - 4, 4);
  ctx.lineTo(width - 4, 4);
  ctx.lineTo(width - 4, cornerSize + 4);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(4, height - cornerSize - 4);
  ctx.lineTo(4, height - 4);
  ctx.lineTo(cornerSize + 4, height - 4);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - cornerSize - 4, height - 4);
  ctx.lineTo(width - 4, height - 4);
  ctx.lineTo(width - 4, height - cornerSize - 4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  
  // Convert to data URL and cache
  const dataUrl = canvas.toDataURL('image/png');
  placeholderCache[cacheKey] = dataUrl;
  return dataUrl;
}

/**
 * Get the display image URL for a fighter card.
 * Returns real asset path if image exists, or generates a placeholder.
 * @param {Object} card - Fighter card object
 * @returns {string} Image URL (asset path or data URL)
 */
export function getFighterImageUrl(card) {
  if (!card) return '';
  
  const imageName = card.fighterImage || '';
  
  // If it's a real image (not a placeholder filename)
  if (imageName && !imageName.includes('placeholder')) {
    return getAssetPath(`assets/fighter player cards/${imageName}`);
  }
  
  // Generate placeholder
  const loadout = card.loadoutBaseId ? LOADOUT_REGISTRY[card.loadoutBaseId] : null;
  
  return generatePlaceholderImage({
    name: card.name || 'Unknown Fighter',
    role: card.role || loadout?.role || 'dps',
    faction: loadout?.faction || null,
    rarity: card.rarity || 'common'
  });
}

/**
 * Get image URL for a loadout (not a card instance)
 * @param {string} loadoutId - ID from LOADOUT_REGISTRY
 * @param {string} rarity - Optional rarity override
 * @returns {string} Image URL
 */
export function getLoadoutImageUrl(loadoutId, rarity = 'common') {
  const loadout = LOADOUT_REGISTRY[loadoutId];
  if (!loadout) return '';
  
  const imageName = loadout.fighterImage || '';
  
  if (imageName && !imageName.includes('placeholder')) {
    return getAssetPath(`assets/fighter player cards/${imageName}`);
  }
  
  return generatePlaceholderImage({
    name: loadout.name || 'Unknown',
    role: loadout.role || 'dps',
    faction: loadout.faction || null,
    rarity
  });
}

/**
 * Pregenerate all placeholder images for smooth UI
 */
export function pregeneratePlaceholders() {
  let count = 0;
  for (const [id, loadout] of Object.entries(LOADOUT_REGISTRY)) {
    if (loadout.guardOnly) continue;
    if (loadout.fighterImage && !loadout.fighterImage.includes('placeholder')) continue;
    
    // Pre-generate for each rarity the card could appear as
    for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary']) {
      generatePlaceholderImage({
        name: loadout.name || id,
        role: loadout.role || 'dps',
        faction: loadout.faction || null,
        rarity
      });
      count++;
    }
  }
  console.log(`[PlaceholderGen] Pre-generated ${count} placeholder images`);
}

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function getInitials(name) {
  if (!name) return '?';
  const words = name.split(/\s+/).filter(w => !['the', 'of', 'and'].includes(w.toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export default {
  generatePlaceholderImage,
  getFighterImageUrl,
  getLoadoutImageUrl,
  pregeneratePlaceholders
};
