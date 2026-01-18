// Path configuration for GitHub Pages deployment
// Automatically detects if running on GitHub Pages or locally
export const BASE_PATH = (function() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  // GitHub Pages detection
  if (hostname.includes('github.io')) {
    // Extract repository name from path (e.g., "/OrbsRPG_1.0/" or "/OrbsRPG_1.0/index.html")
    const match = pathname.match(/^\/([^\/]+)/);
    return match ? `/${match[1]}/` : '/';
  }
  
  // Local development or custom domain
  return '/';
})();

// Helper function to get asset paths
export function getAssetPath(relativePath) {
  // Remove leading ./ or / if present
  const cleanPath = relativePath.replace(/^\.?\//, '');
  return BASE_PATH + cleanPath;
}
