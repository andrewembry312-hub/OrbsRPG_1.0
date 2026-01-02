# OrbRPG 3D Editor - Integration Guide

## Overview

The OrbRPG 3D Editor is a **standalone application** designed to create and test 3D models independently from the main game. Once models are created and exported, they can be integrated into the web-based game.

## Project Relationship

```
OrbsRPG/orb-rpg/
├── assets/
│   ├── char/                          # Game character sprites (SVG)
│   ├── 3d assets/
│   │   ├── chars/                     # 3D character models (glTF/GLB)
│   │   │   ├── Warrior Test.glb       (example)
│   │   │   ├── Mage Test.glb
│   │   │   └── ...
│   │   └── OrbRPG3DEditor/            # Standalone Java project (THIS)
│   │       ├── src/
│   │       ├── pom.xml
│   │       └── BUILD.md
│   └── items/, sounds/, maps/, ui/, structure/
├── src/game/
│   ├── game.js                        # Main game logic
│   └── render.js                      # Rendering (currently SVG/Canvas)
└── index.html                         # Game entry point
```

## Workflow: Create → Export → Import

### Step 1: Create 3D Model in Java Editor

```bash
# Navigate to project
cd "assets/3d assets/OrbRPG3DEditor"

# Build and run
mvn clean javafx:run
```

1. Click File → Open Model
2. Select or create a .glb/.gltf model
3. Use Property Panel to adjust lighting/rotation
4. View statistics in Inspector Panel

### Step 2: Export Model

```
File → Export Model → Save as glb
Destination: assets/3d assets/chars/[CharacterName].glb
```

**Exported Files**:
- `Warrior.glb` - Binary model file (~500KB-2MB typically)
- `Warrior.json` (optional) - Metadata with statistics

### Step 3: Test in Game (Future - Phase 2+)

Once Three.js viewer is integrated:
1. Update game.js to load model: `assets/3d assets/chars/Warrior.glb`
2. Use Three.js GLTFLoader to display in game
3. Position model in viewport (inventory or character preview)

## Current Status

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Java Editor** | ✓ Complete (Phase 1) | `assets/3d assets/OrbRPG3DEditor/` | UI framework ready |
| **Model Loading** | ⏳ Phase 2 | `src/main/java/.../scene/Scene3D.java` | Needs library integration |
| **Model Export** | ⏳ Phase 2 | `src/main/java/.../util/ExportUtils.java` | Placeholder ready |
| **Game Integration** | ❌ Phase 3+ | `src/game/game.js` | Three.js viewer pending |
| **Character Preview** | ❌ Phase 3+ | `src/game/ui.js` | Requires Three.js setup |

## File Formats

### Input Formats (What Editor Accepts)
- `.glb` - glTF Binary (recommended, self-contained)
- `.gltf` - glTF Text (with separate texture files)

### Output Format (What Editor Exports)
- `.glb` - Binary format (recommended for web delivery)
  - Includes mesh data, materials, textures
  - Single file, easy to distribute
  - Supported by Three.js out-of-box

### Asset Organization

```
assets/3d assets/
├── chars/                    # Character models
│   ├── Warrior.glb
│   ├── Mage.glb
│   ├── Knight.glb
│   └── Warden.glb
├── items/                    # (Future) Equipment/weapon models
│   ├── sword.glb
│   ├── shield.glb
│   └── ...
├── effects/                  # (Future) Particle effect models
│   ├── fire_spell.glb
│   └── ...
└── OrbRPG3DEditor/           # Editor project (source, not runtime)
    ├── src/
    ├── pom.xml
    └── BUILD.md
```

## Integration Points

### 1. Inventory Preview (Near-term)

**Current Implementation**: PNG images in inventory
```javascript
// src/game/ui.js
const heroImgMap = {
    'warrior': 'assets/char/New Warrior.png',
    'mage': 'assets/char/New Mage.png',
    'knight': 'assets/char/New Night.png',
    'warden': 'assets/char/New Warden.png'
};
```

**Future Implementation**: 3D model preview
```javascript
// Phase 3+ : Replace with Three.js loader
const model3DMap = {
    'warrior': 'assets/3d assets/chars/Warrior.glb',
    'mage': 'assets/3d assets/chars/Mage.glb',
    'knight': 'assets/3d assets/chars/Knight.glb',
    'warden': 'assets/3d assets/chars/Warden.glb'
};

// Load and display using GLTFLoader
const loader = new THREE.GLTFLoader();
loader.load(model3DMap[classType], (gltf) => {
    scene.add(gltf.scene);
});
```

### 2. Character Selection Preview (Near-term)

**Current**: Card images in character select
**Future**: Rotating 3D model preview

```javascript
// In charselect.js (Phase 3+)
function create3DPreview(classType) {
    const canvas = document.createElement('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(...);
    const renderer = new THREE.WebGLRenderer({canvas});
    
    const loader = new THREE.GLTFLoader();
    loader.load(`assets/3d assets/chars/${classType}.glb`, (gltf) => {
        scene.add(gltf.scene);
        animate();
    });
}
```

### 3. Battle Arena (Long-term)

**Future**: Full 3D models during combat
- Load attacker/defender models
- Animate attacks and reactions
- Display damage numbers
- Show abilities/spell effects

## Build & Dependency Management

### Maven Configuration
```xml
<!-- In pom.xml, already configured -->
<dependency>
    <groupId>org.openjfx</groupId>
    <artifactId>javafx-controls</artifactId>
    <version>21.0.1</version>
</dependency>

<!-- Phase 2: Add for model loading -->
<!-- Choose one: AssimpJ or custom parser -->
```

### JavaFX Version
- **Minimum**: 21.0.0
- **Recommended**: Latest LTS
- **Compatibility**: Java 17+

## Development Timeline

### Phase 1: ✓ COMPLETE
- UI framework and panels
- File management
- Menu system
- Property controls

### Phase 2: IN PROGRESS (Estimated 2-3 weeks)
- glTF/GLB model loading
- Mesh rendering
- Camera controls
- Model statistics
- Basic export

**Deliverable**: Functional 3D viewer that can load and display models

### Phase 3: PLANNED (Estimated 2-4 weeks)
- Three.js integration in web game
- Inventory 3D preview
- Character selection preview
- Model animation support
- Advanced material editor

**Deliverable**: 3D models visible in game UI

### Phase 4: EXTENDED (Estimated 1-2 months)
- Battle arena 3D rendering
- Animation system
- Particle effects
- Equipment visualization
- Advanced editor features

**Deliverable**: Full 3D graphics throughout game

## Testing Workflow

### 1. Verify Java Build
```bash
mvn clean compile
# Should complete with no errors
```

### 2. Test UI Framework
```bash
mvn javafx:run
# Should open window with all panels visible
```

### 3. Test File Operations
```
File → Open Model
# Should show file chooser
# Select test model (if available)
```

### 4. Verify Properties Panel
```
In Properties Panel:
- Adjust lighting slider → see changes in viewport
- Adjust rotation speed → see rotation change
- Toggle rotation → animation starts/stops
```

### 5. Test Export (Phase 2+)
```
File → Export Model
# Should open save dialog
# Select location and save
```

## Troubleshooting Integration

### Issue: Models don't load in game
**Solution**: 
1. Verify glB file is valid: `mvn javafx:run` → File → Open Model
2. Check file path in JavaScript is correct
3. Verify Three.js GLTFLoader included in index.html

### Issue: Models appear but wrong position
**Solution**:
1. Adjust camera position in three.js loader
2. Check model scale (may need normalization)
3. Verify coordinate system (Y-up vs Z-up)

### Issue: Textures missing in game
**Solution**:
1. Use .glb format (embeds textures) not .gltf
2. Verify texture path is relative
3. Check browser console for 404 errors

### Issue: Performance too slow
**Solution**:
1. Reduce polygon count in model
2. Use LOD (Level of Detail) models
3. Compress textures
4. Profile with browser DevTools

## Asset Delivery

### Preparing Model for Web

1. **Optimize Geometry**
   - Target polygon count: 10k-100k vertices
   - Use normal maps for detail instead of geometry
   
2. **Compress File**
   ```bash
   # Use glTF binary (.glb) format
   # Typically 40-70% smaller than .gltf
   File Size Target: < 2MB per model
   ```

3. **Texture Optimization**
   ```
   Resolution: 1024x1024 or 2048x2048
   Format: JPEG for color, PNG for transparency
   Compression: Heavy (suitable for web)
   ```

4. **Export Settings**
   - Include metadata
   - Embed textures
   - Remove unnecessary data
   - Verify in Three.js before deployment

## Collaboration

### Workflow for Art/Code Teams

**Art Team** (3D Artists):
1. Create models in preferred 3D tool (Blender, 3ds Max, etc.)
2. Export to glTF format
3. Place in `assets/3d assets/chars/`
4. Update BUILD.md with model specifications

**Code Team** (Game Developers):
1. Update game loading paths
2. Implement Three.js integration
3. Test in different browsers
4. Optimize as needed

## Version Control

### What to Commit
```bash
# DO commit
- Source code (src/)
- Build configuration (pom.xml)
- Documentation (*.md)
- Small test models (< 5MB)

# DON'T commit
- Compiled class files (target/)
- Large source models (use releases)
- IDE configurations (.idea/, .vscode/)
- OS files (.DS_Store, Thumbs.db)
```

### Git Configuration
```bash
# Add to .gitignore
target/
.idea/
*.swp
*.class

# Add to .gitattributes (for binary models)
*.glb binary
*.gltf binary
```

## Future Enhancements

### Planned Features
- [ ] Animation editor
- [ ] Skeleton/rig viewer
- [ ] Material editor with preview
- [ ] Batch export tool
- [ ] Plugin system for formats
- [ ] Real-time collaboration (WebSockets)
- [ ] Model versioning system
- [ ] Performance profiler

### Long-term Vision
The 3D Editor can eventually become:
- **Asset Management System**: Centralized model library
- **Animation Studio**: Timeline-based animation editor
- **Particle System**: Visual effects designer
- **Pipeline Tool**: Automated optimization and export

## Resources

### Documentation
- [glTF Specification](https://www.khronos.org/gltf/)
- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [JavaFX 3D Graphics](https://docs.oracle.com/en/java/javase/21/docs/api/javafx.graphics/javafx/scene/shape/package-summary.html)

### Tools Reference
- **Blender**: Free 3D modeling (glTF export native)
- **Babylon.js Sandbox**: Web-based glTF viewer and debugger
- **glTF Validator**: Specification compliance checker
- **Three.js Editor**: Web-based 3D scene editor

### Integration Examples
- Three.js Model Loading: `/src/game/game.js` (when implemented)
- JavaFX Canvas: `/src/main/java/com/orbrpg/scene/Scene3D.java`
- File Management: `/src/main/java/com/orbrpg/util/FileUtils.java`

---

**Current Phase**: Phase 1 Complete - Java Editor Framework Ready
**Next Milestone**: Phase 2 - Model Loading Implementation
**Integration Target**: Phase 3 - Three.js Integration in Web Game

For technical questions, refer to:
- [BUILD.md](BUILD.md) - Build and compilation instructions
- [DEVELOPMENT.md](DEVELOPMENT.md) - Code patterns and architecture
- [README.md](README.md) - Project overview and features
