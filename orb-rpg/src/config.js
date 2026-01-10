// Base path configuration for GitHub Pages deployment
export const BASE_PATH = window.location.hostname.includes('github.io') ? '/orb-rpg' : '';
export const getAssetPath = (path) => `${BASE_PATH}/${path}`;
