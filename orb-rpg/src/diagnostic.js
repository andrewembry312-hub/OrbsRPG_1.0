// Diagnostic module to test import chain
console.log('Testing import chain...');

try {
  console.log('1. Testing util.js import');
  import("./engine/util.js").then(() => console.log('✓ util.js loaded'));
} catch(e) { console.error('✗ util.js failed:', e.message); }

try {
  console.log('2. Testing constants.js import');
  import("./game/constants.js").then(() => console.log('✓ constants.js loaded'));
} catch(e) { console.error('✗ constants.js failed:', e.message); }

try {
  console.log('3. Testing skills.js import');
  import("./game/skills.js").then(() => console.log('✓ skills.js loaded'));
} catch(e) { console.error('✗ skills.js failed:', e.message); }

try {
  console.log('4. Testing world.js import');
  import("./game/world.js").then(() => console.log('✓ world.js loaded'));
} catch(e) { console.error('✗ world.js failed:', e.message); }

try {
  console.log('5. Testing game.js import');
  import("./game/game.js").then(() => console.log('✓ game.js loaded'));
} catch(e) { console.error('✗ game.js failed:', e.message); }

console.log('Diagnostic complete');
