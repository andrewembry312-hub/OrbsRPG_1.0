# GitHub Pages Deployment Fix

## Problem
The game was not compatible with GitHub Pages deployment because all asset paths used relative references (`assets/sounds/file.mp3`) which work locally but fail when the repository is served from a subdirectory (`/OrbsRPG_1.0/`).

## Solution
Implemented a BASE_PATH configuration system that automatically detects the deployment environment and adjusts asset paths accordingly.

### Changes Made

1. **Created `src/config.js`**:
   - Auto-detects GitHub Pages deployment (checks for `github.io` in hostname)
   - Extracts repository name from pathname
   - Provides `getAssetPath()` helper function to prepend BASE_PATH to all asset references
   - Local development: `BASE_PATH = '/'`
   - GitHub Pages: `BASE_PATH = '/OrbsRPG_1.0/'`

2. **Updated All Asset References**:
   - **src/game/game.js**: 30+ Audio() constructors
   - **src/game/render.js**: 32 image paths (sprites, icons, structures, environments)
   - **src/game/ui.js**: 100+ paths (UI images, buff icons, skill icons, item images, fighter cards)
   - **src/game/charselect.js**: 4 character selection images
   - **src/main.js**: Main menu music
   - **src/loadMapInit.js**: Map loading paths

3. **Path Wrapping Examples**:
   ```javascript
   // BEFORE:
   new Audio('assets/sounds/file.mp3')
   loadCachedImage(state, 'assets/char/sprite.svg')
   src="assets/ui/MainMenu.png"
   
   // AFTER:
   new Audio(getAssetPath('assets/sounds/file.mp3'))
   loadCachedImage(state, getAssetPath('assets/char/sprite.svg'))
   src="${getAssetPath('assets/ui/MainMenu.png')}"
   ```

## Testing

### Local Testing
- All assets load correctly from `localhost:8000/assets/`
- Game functions normally with no console errors

### GitHub Pages Testing
- Assets will now load from `andrewembry312-hub.github.io/OrbsRPG_1.0/assets/`
- Path resolution handled automatically by BASE_PATH detection
- No code changes needed between local and production

## Files Modified
- `src/config.js` (NEW)
- `src/game/game.js`
- `src/game/render.js`
- `src/game/ui.js`
- `src/game/charselect.js`
- `src/main.js`
- `src/loadMapInit.js`

## Total Changes
- **200+ asset path references** updated to use `getAssetPath()`
- **7 files** modified with BASE_PATH import
- **0 breaking changes** - fully backward compatible with local development

## Deployment Checklist
✅ Auto-detect GitHub Pages vs local environment
✅ All audio files wrapped
✅ All image files wrapped
✅ All sprite files wrapped
✅ All UI assets wrapped
✅ Fighter card images wrapped
✅ Skill/buff icons wrapped
✅ Environment textures wrapped
✅ Map files wrapped

## Next Steps
1. Commit these changes with message: "Add BASE_PATH system for GitHub Pages compatibility"
2. Push to GitHub repository
3. Verify game loads correctly at `https://andrewembry312-hub.github.io/OrbsRPG_1.0/`
4. Test all features (sounds, sprites, UI, dungeons) on GitHub Pages
