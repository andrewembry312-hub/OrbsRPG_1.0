# OrbRPG 3D Editor

## Project Overview
A standalone Java-based 3D object editor and viewer for the OrbRPG game project. This tool allows independent testing, creation, and iteration of 3D assets without depending on the main game environment.

## Design Intent

### Primary Goals
1. **Independent Development**: Build and test 3D models completely separate from the web-based game
2. **Rapid Iteration**: Quick testing and validation of 3D objects before export
3. **Game UI Consistency**: Match the dark fantasy aesthetic and UI design of OrbRPG
4. **Export Ready**: Export models in glTF/GLB format compatible with Three.js

### Architecture
- **JavaFX**: 3D rendering using JavaFX's built-in 3D capabilities
- **Model-View-Controller Pattern**: Separation of 3D scene, UI controls, and business logic
- **Asset Management**: Directory-based asset loading and organization
- **Real-time Editing**: Live preview of 3D objects with adjustable properties

### UI Design Philosophy
- Dark theme matching OrbRPG (dark grays, gold accents)
- Left panel: Properties/tools
- Center: 3D viewport with auto-rotating preview
- Right panel: Model inspector and export options
- Top bar: File operations and view controls

## Features (Planned)

### Phase 1: Basic Viewer
- [ ] Load and display glTF/GLB models
- [ ] Auto-rotation with mouse control
- [ ] Lighting adjustment
- [ ] Model information display
- [ ] Export metadata

### Phase 2: Basic Editor
- [ ] Model import/creation
- [ ] Transform tools (move, rotate, scale)
- [ ] Material editing
- [ ] Animation preview
- [ ] Model hierarchy view

### Phase 3: Advanced Features
- [ ] Batch processing
- [ ] LOD generation
- [ ] Texture preview
- [ ] Collision shape editing
- [ ] Export optimization

## Project Structure
```
OrbRPG3DEditor/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/orbrpg/
│   │   │       ├── Main.java
│   │   │       ├── ui/
│   │   │       │   ├── MainWindow.java
│   │   │       │   ├── ViewportPanel.java
│   │   │       │   ├── PropertyPanel.java
│   │   │       │   └── InspectorPanel.java
│   │   │       ├── scene/
│   │   │       │   ├── Scene3D.java
│   │   │       │   ├── ModelLoader.java
│   │   │       │   └── LightingManager.java
│   │   │       └── util/
│   │   │           ├── FileUtils.java
│   │   │           └── ExportUtils.java
│   │   └── resources/
│   │       ├── styles.css
│   │       ├── icons/
│   │       └── models/
│   └── test/
│       └── java/
├── pom.xml (Maven)
├── README.md
├── DESIGN.md
└── CHANGELOG.md
```

## Build Requirements
- Java 17+
- Maven 3.8+
- JavaFX SDK 21+

## Getting Started

### Setup
```bash
cd OrbRPG3DEditor
mvn clean install
mvn javafx:run
```

### First Use
1. Click File > Open Model
2. Navigate to `assets/3d char/` directory
3. Select a .glb file (e.g., Warrior Test.glb)
4. Model will load in the viewport with auto-rotation
5. Use mouse to rotate, scroll to zoom
6. Right panel shows model statistics

## Model Export Workflow

### From 3D Modeling Software (Blender, Maya, etc.)
1. Model → Export as glTF/GLB
2. Import into OrbRPG3DEditor
3. Preview and validate
4. Export with metadata to game assets folder
5. Test in web viewer

## Color Scheme (Matching OrbRPG)
- Background: #1a1a1a
- Panel: #111
- Accent: #d4af37 (gold)
- Text: #fff
- Secondary: #aaa
- Success: #4caf50
- Error: #f44336

## Keyboard Shortcuts
- `R`: Reset view
- `Space`: Toggle auto-rotation
- `A`: Toggle lighting
- `L`: Load model
- `E`: Export model
- `H`: Show help

## Dependencies
- JavaFX 21+ (3D rendering)
- Gson (JSON serialization)
- AssimpJ (optional, model loading)

## Known Limitations
- Initial release focuses on glTF/GLB format
- Animation preview TBD
- Batch processing deferred to Phase 3

## Future Integration
Models created and validated in this tool export to:
- `assets/3d char/` - Character models
- `assets/3d items/` - Weapon/equipment models
- `assets/3d effects/` - Particle/effect models
- Then loaded in web viewer via Three.js + GLTFLoader

## Notes for Developers
- Keep scene graph lightweight for performance
- Always preview at target resolution (1920x1080)
- Test exported models in web viewer before shipping
- Document custom extensions or metadata
- Maintain backward compatibility with older exports

## Contributing
1. Create feature branch from `develop`
2. Test thoroughly in standalone editor
3. Export test models to game
4. Verify in web viewer
5. Submit PR with test results

## License
Same as OrbRPG project
