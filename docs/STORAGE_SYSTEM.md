# Unified Storage System Documentation

## Overview

The game now uses a **unified storage management system** that handles saves, loadouts, settings, and tutorial progress consistently across both **local development** and **domain deployment**.

### Storage Location
All data is stored in **browser localStorage** using consistent, namespaced keys. This works identically on:
- ✅ Local file:// URLs (http://localhost, file:///)
- ✅ Domain URLs (https://example.com)
- ✅ Electron/Desktop apps (if localStorage is available)

## Storage Keys

The system uses a consistent prefix (`orb_rpg_v2_`) to organize all data:

| Category | Key | Purpose |
|----------|-----|---------|
| **Saves** | `orb_rpg_v2_saves` | Saved game files |
| **Loadouts** | `orb_rpg_v2_loadouts` | Ability loadouts per hero class |
| **Campaign** | `orb_rpg_v2_campaign` | Campaign progress (points, time) |
| **Binds** | `orb_rpg_v2_binds` | Keybindings |
| **Options** | `orb_rpg_v2_options` | Game options |
| **Menu BG** | `orb_rpg_v2_menu_bg` | Main menu background path |
| **Map Path** | `orb_rpg_v2_custom_map_path` | Custom map path |
| **Tutorial** | `orb_rpg_v2_tutorial_progress` | Tutorial completion status |
| **Version** | `orb_rpg_v2_version` | Storage version for migrations |

## API Usage

### Import the Storage Module

```javascript
import { 
  storageGet, 
  storageSet, 
  storageRemove, 
  STORAGE_KEYS,
  getStorageStats,
  exportSavesAsFile,
  importSavesFromFile,
  initializeStorage
} from "../engine/storage.js";
```

### Basic Operations

**Save Data:**
```javascript
storageSet(STORAGE_KEYS.LOADOUTS, loadoutData);
```

**Load Data:**
```javascript
const loadouts = storageGet(STORAGE_KEYS.LOADOUTS);
```

**Remove Data:**
```javascript
storageRemove(STORAGE_KEYS.SAVES);
```

**Check Storage Stats:**
```javascript
const stats = getStorageStats();
console.log(`Using ${stats.totalKilobytes} KB of storage`);
```

## Automatic Migration

When the game starts for the first time with the new system:
1. ✅ Detects old storage keys (`orb_rpg_mod_*`, `orb_rpg_*`)
2. ✅ Automatically migrates data to new keys
3. ✅ Preserves all existing saves, loadouts, and settings
4. ✅ Sets storage version to prevent duplicate migrations

**Migration Map:**
```
orb_rpg_saves_mod       → orb_rpg_v2_saves
orb_rpg_mod_loadouts    → orb_rpg_v2_loadouts
orb_rpg_mod_binds       → orb_rpg_v2_binds
orb_rpg_menu_bg         → orb_rpg_v2_menu_bg
customMapPath           → orb_rpg_v2_custom_map_path
tutorialProgress        → orb_rpg_v2_tutorial_progress
```

## Features

### Backup & Restore

**Export all saves and loadouts to a JSON file:**
```javascript
exportSavesAsFile();  // Downloads: orb-rpg-backup-{timestamp}.json
```

**Import from backup file:**
```javascript
const fileInput = document.querySelector('input[type="file"]');
await importSavesFromFile(fileInput.files[0]);
```

### Error Handling

The system gracefully handles:
- ❌ **Storage quota exceeded** - Logs warning, recommends deleting old saves
- ❌ **Invalid JSON data** - Returns null, prevents crashes
- ❌ **Missing storage keys** - Initializes with defaults
- ❌ **Cross-origin restrictions** - Works with proper CORS headers

### Debugging

**In browser console:**
```javascript
// Check all storage stats
window.getStorageStats?.()

// Export saves for inspection
window.exportSavesAsFile?.()

// Check a specific key
localStorage.getItem('orb_rpg_v2_saves')
```

## Domain Deployment Checklist

✅ **Before going live:**
1. Storage uses localStorage (works on any domain)
2. No file system paths are stored (only relative asset paths)
3. All URLs use `getAssetPath()` for consistency
4. Set proper `Cache-Control` headers for game files
5. Enable CORS if hosting on CDN

✅ **CORS Headers needed (if on CDN):**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

✅ **localStorage is domain-specific:**
- Saves from `http://localhost:3000` ≠ Saves from `https://example.com`
- Players need to start fresh or manually migrate (use backup/restore)

## Storage Limits

**Browser localStorage limits:**
- Chrome/Firefox/Safari: ~5-10 MB
- IE/Edge: ~10 MB
- Most games use 1-2 MB with typical saves

**Monitor with:**
```javascript
const stats = getStorageStats();
if (stats.totalKilobytes > 5000) {
  console.warn('Storage getting full, consider cleanup');
}
```

## Troubleshooting

### "Storage quota exceeded"
- Delete old saves (keep only recent ones)
- Use export/backup feature to archive old saves
- Clear browser cache if corrupted

### Saves not persisting
- Check if browser allows localStorage (some private modes disable it)
- Verify browser DevTools → Storage → LocalStorage shows data
- Check HTTPS/domain issues (localStorage doesn't work across domains)

### Cross-domain save transfer
Players can:
1. Export saves from old domain: `exportSavesAsFile()`
2. Navigate to new domain
3. Use "Import Saves" feature to restore

## Files Modified

1. **Created:** `src/engine/storage.js` - Unified storage API
2. **Modified:** `src/game/state.js` - Uses storage for loadouts, binds, campaign
3. **Modified:** `src/game/ui.js` - Uses storage for saves, menu BG
4. **Modified:** `src/game/skills.js` - Uses storage for loadouts
5. **Modified:** `src/tutorial/tutorialEngine.js` - Uses storage for tutorial progress
6. **Modified:** `src/loadMapInit.js` - Uses storage for custom map path

## Future Enhancements

Possible improvements (not implemented yet):
- IndexedDB for larger storage (50+ MB)
- Cloud sync (save backups to server)
- Cross-device sync
- Version-specific save compatibility checks
