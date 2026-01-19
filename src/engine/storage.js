/**
 * Unified Storage Manager
 * Handles saves, loadouts, and settings across both local and domain versions
 * Uses localStorage as primary storage with consistent keys
 */

const STORAGE_VERSION = '1.0';
const STORAGE_PREFIX = 'orb_rpg_v2_'; // Changed from 'orb_rpg_mod_' to avoid conflicts

export const STORAGE_KEYS = {
  // Saves and loadouts
  SAVES: `${STORAGE_PREFIX}saves`,
  LOADOUTS: `${STORAGE_PREFIX}loadouts`,
  CAMPAIGN: `${STORAGE_PREFIX}campaign`,
  
  // Settings
  BINDS: `${STORAGE_PREFIX}binds`,
  OPTIONS: `${STORAGE_PREFIX}options`,
  MENU_BG: `${STORAGE_PREFIX}menu_bg`,
  CUSTOM_MAP_PATH: `${STORAGE_PREFIX}custom_map_path`,
  
  // Tutorial
  TUTORIAL_PROGRESS: `${STORAGE_PREFIX}tutorial_progress`,
  
  // Metadata
  VERSION: `${STORAGE_PREFIX}version`
};

/**
 * Initialize storage - migrate old keys if needed
 */
export function initializeStorage(){
  try {
    const currentVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    
    if(!currentVersion){
      // First time - set version
      localStorage.setItem(STORAGE_KEYS.VERSION, STORAGE_VERSION);
      migrateLegacyStorage();
    }
  } catch(e){
    console.error('[STORAGE] Initialization failed:', e);
  }
}

/**
 * Migrate data from old storage keys to new ones
 */
function migrateLegacyStorage(){
  const legacyKeys = {
    'orb_rpg_saves_mod': STORAGE_KEYS.SAVES,
    'orb_rpg_mod_loadouts': STORAGE_KEYS.LOADOUTS,
    'orb_rpg_mod_binds': STORAGE_KEYS.BINDS,
    'orb_rpg_menu_bg': STORAGE_KEYS.MENU_BG,
    'customMapPath': STORAGE_KEYS.CUSTOM_MAP_PATH,
    'tutorialProgress': STORAGE_KEYS.TUTORIAL_PROGRESS
  };
  
  for(const [oldKey, newKey] of Object.entries(legacyKeys)){
    try {
      const value = localStorage.getItem(oldKey);
      if(value && !localStorage.getItem(newKey)){
        localStorage.setItem(newKey, value);
        console.log(`[STORAGE] Migrated ${oldKey} → ${newKey}`);
      }
    } catch(e){
      console.warn(`[STORAGE] Migration of ${oldKey} failed:`, e);
    }
  }
}

/**
 * Save data to storage
 * @param {string} key - Storage key (use STORAGE_KEYS constants)
 * @param {*} data - Data to save (will be JSON stringified)
 * @returns {boolean} Success status
 */
export function storageSet(key, data){
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch(e){
    console.error(`[STORAGE] Failed to save to ${key}:`, e.message);
    
    // Handle quota exceeded
    if(e.name === 'QuotaExceededError'){
      console.error('[STORAGE] Storage quota exceeded! Consider deleting old saves.');
    }
    return false;
  }
}

/**
 * Load data from storage
 * @param {string} key - Storage key (use STORAGE_KEYS constants)
 * @returns {*} Parsed data or null if not found/invalid
 */
export function storageGet(key){
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch(e){
    console.error(`[STORAGE] Failed to load from ${key}:`, e.message);
    return null;
  }
}

/**
 * Remove data from storage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export function storageRemove(key){
  try {
    localStorage.removeItem(key);
    return true;
  } catch(e){
    console.error(`[STORAGE] Failed to remove ${key}:`, e);
    return false;
  }
}

/**
 * Clear all game data from storage (for hard reset)
 */
export function storageClear(){
  try {
    const keys = Object.values(STORAGE_KEYS);
    for(const key of keys){
      localStorage.removeItem(key);
    }
    console.log('[STORAGE] All storage cleared');
    return true;
  } catch(e){
    console.error('[STORAGE] Failed to clear storage:', e);
    return false;
  }
}

/**
 * Get storage statistics
 */
export function getStorageStats(){
  try {
    let totalSize = 0;
    const breakdown = {};
    
    for(const [key, storageKey] of Object.entries(STORAGE_KEYS)){
      const value = localStorage.getItem(storageKey);
      const size = value ? new Blob([value]).size : 0;
      totalSize += size;
      breakdown[key] = {
        key: storageKey,
        size: size,
        kilobytes: (size / 1024).toFixed(2)
      };
    }
    
    return {
      totalSize,
      totalKilobytes: (totalSize / 1024).toFixed(2),
      breakdown,
      availableEstimate: getStorageQuotaEstimate()
    };
  } catch(e){
    console.error('[STORAGE] Failed to get stats:', e);
    return null;
  }
}

/**
 * Estimate available storage (if API available)
 */
function getStorageQuotaEstimate(){
  if(navigator.storage && navigator.storage.estimate){
    return navigator.storage.estimate().then(estimate => ({
      usage: (estimate.usage / 1024 / 1024).toFixed(2) + ' MB',
      quota: (estimate.quota / 1024 / 1024).toFixed(2) + ' MB',
      percent: ((estimate.usage / estimate.quota) * 100).toFixed(1) + '%'
    })).catch(e => {
      console.warn('[STORAGE] Could not estimate quota:', e);
      return null;
    });
  }
  return null;
}

/**
 * Export all saves to JSON file (for backup)
 */
export function exportSavesAsFile(){
  try {
    const saves = storageGet(STORAGE_KEYS.SAVES) || [];
    const loadouts = storageGet(STORAGE_KEYS.LOADOUTS) || {};
    const backup = {
      version: STORAGE_VERSION,
      exported: new Date().toISOString(),
      saves,
      loadouts
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orb-rpg-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    return true;
  } catch(e){
    console.error('[STORAGE] Export failed:', e);
    return false;
  }
}

/**
 * Import saves from JSON file
 * @param {File} file - JSON file to import
 */
export async function importSavesFromFile(file){
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    
    if(!backup.version){
      console.error('[STORAGE] Invalid backup file format');
      return false;
    }
    
    if(backup.saves && Array.isArray(backup.saves)){
      storageSet(STORAGE_KEYS.SAVES, backup.saves);
    }
    if(backup.loadouts && typeof backup.loadouts === 'object'){
      storageSet(STORAGE_KEYS.LOADOUTS, backup.loadouts);
    }
    
    console.log('[STORAGE] Import complete:', backup.exported);
    return true;
  } catch(e){
    console.error('[STORAGE] Import failed:', e);
    return false;
  }
}

// Initialize on module load
initializeStorage();
