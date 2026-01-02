// Quick script to inspect animations in GLB files
const path = require('path');

// Dynamically require Three.js from local node_modules
const THREE = require('./node_modules/three');
const { GLTFLoader } = require('./node_modules/three/examples/jsm/loaders/GLTFLoader.js');

const loader = new GLTFLoader();

// Load the model
const modelPath = path.join(__dirname, 'Warrior Test.glb');
const fileUrl = 'file:///' + modelPath.replace(/\\/g, '/');
console.log(`Loading model from: ${fileUrl}\n`);

loader.load(fileUrl, (gltf) => {
  console.log('=== MODEL LOADED ===\n');
  
  const scene = gltf.scene;
  const animations = gltf.animations;
  
  console.log(`Total animations: ${animations.length}\n`);
  
  if (animations.length === 0) {
    console.log('❌ No animations found in this model.');
  } else {
    console.log('✅ Available Animations:\n');
    animations.forEach((clip, idx) => {
      console.log(`  [${idx}] ${clip.name}`);
      console.log(`      Duration: ${clip.duration.toFixed(2)}s`);
      console.log(`      Tracks: ${clip.tracks.length}`);
      console.log('');
    });
  }
  
  // List bones/skeleton
  const skeleton = scene.getObjectByProperty('type', 'SkinnedMesh');
  if (skeleton && skeleton.skeleton) {
    console.log(`Skeleton bones: ${skeleton.skeleton.bones.length}`);
    console.log('Bone names:', skeleton.skeleton.bones.map(b => b.name).join(', '));
  }
  
  process.exit(0);
}, undefined, (err) => {
  console.error('Failed to load model:', err);
  process.exit(1);
});
