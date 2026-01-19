import { loadMapFromImage } from "./game/world.js";
import { getAssetPath } from "./config.js";
import { storageSet, STORAGE_KEYS } from "./engine/storage.js";

window.loadMainWorldTest = async function() {
  try {
    const state = window._gameState;
    if(!state) { console.error('Game state not available'); return; }
    console.log('Loading MainWorldTest...');
    await loadMapFromImage(state, getAssetPath('assets/maps/MainWorldTest.png'));
    console.log('✓ MainWorldTest loaded');
    // Store in storage so it persists through reload
    storageSet(STORAGE_KEYS.CUSTOM_MAP_PATH, getAssetPath('assets/maps/MainWorldTest.png'));
    console.log('Restarting...');
    setTimeout(() => location.reload(), 500);
  } catch(err) {
    console.error('Failed to load MainWorldTest:', err);
  }
};
