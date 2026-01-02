# OrbRPG 3D Editor - Build & Development Guide

## Quick Start

### Prerequisites
- **Java Development Kit (JDK)**: Version 17 or higher
  - Download: https://adoptopenjdk.net/ (Temurin LTS recommended)
  - Verify: `java -version`
  
- **Maven**: Version 3.8 or higher
  - Download: https://maven.apache.org/download.cgi
  - Verify: `mvn -version`

### Build Steps

```bash
# Navigate to project directory
cd "C:\Users\Home\Downloads\orb-rpg-modular\OrbsRPG\orb-rpg\assets\3d assets\OrbRPG3DEditor"

# Clean and build
mvn clean install

# Run the application
mvn javafx:run
```

### Expected Output
```
[INFO] Building OrbRPG 3D Editor 0.1.0
[INFO] --------------------------------
[INFO] BUILD SUCCESS
```

Application window opens: **OrbRPG 3D Editor - Model Viewer & Creator**

## Project Structure

```
OrbRPG3DEditor/
├── src/main/java/com/orbrpg/
│   ├── Main.java                    # Application entry point
│   ├── scene/
│   │   └── Scene3D.java            # 3D viewport and rendering
│   ├── ui/
│   │   ├── MainWindow.java         # Main window layout & menus
│   │   ├── PropertyPanel.java      # Left panel (lighting, rotation)
│   │   ├── ViewportPanel.java      # Center panel (canvas)
│   │   └── InspectorPanel.java     # Right panel (statistics)
│   └── util/
│       ├── FileUtils.java          # File operations & asset management
│       └── ExportUtils.java        # Model export utilities
├── pom.xml                          # Maven build configuration
└── README.md                        # Project documentation
```

## IDE Setup

### IntelliJ IDEA (Recommended)
1. File → Open → Select OrbRPG3DEditor directory
2. Maven should auto-detect and configure
3. Run → Run 'Main' to start application
4. Configuration: Run → Edit Configurations → Add JavaFX VM options

### Eclipse
1. File → Import → Maven → Existing Maven Projects
2. Select OrbRPG3DEditor directory
3. Right-click project → Run As → Maven Build
4. Set goals: `javafx:run`

### VS Code
1. Install Extension Pack for Java (Microsoft)
2. Open project folder
3. F5 to debug (adjust launch.json if needed)
4. Terminal: `mvn javafx:run`

## Maven Build Configuration

Key plugins configured in pom.xml:

```xml
<!-- JavaFX Maven Plugin -->
<plugin>
    <groupId>org.openjfx</groupId>
    <artifactId>javafx-maven-plugin</artifactId>
    <version>0.0.8</version>
</plugin>

<!-- Shade Plugin (for fat JAR) -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-shade-plugin</artifactId>
    <version>3.5.0</version>
</plugin>
```

## Common Build Issues & Solutions

### Issue: "JavaFX modules not found"
**Solution**: Ensure Java 17+ is configured, verify JAVA_HOME environment variable

```bash
# Check Java version
java -version

# Set JAVA_HOME (Windows)
set JAVA_HOME=C:\Program Files\adoptopenjdk\jdk-17.0.x+y
```

### Issue: "Cannot resolve org.openjfx"
**Solution**: Maven not downloading dependencies. Try:

```bash
# Clear Maven cache
mvn clean
rm -rf ~/.m2/repository/org/openjfx

# Rebuild
mvn clean install
```

### Issue: "Compilation error with modules"
**Solution**: Verify pom.xml JavaFX version matches installed JDK

```bash
# Check available versions
mvn dependency:tree | grep javafx
```

## Development Workflow

### Phase 1 (Current): UI Framework ✓
- [x] Main window layout
- [x] Menu system (File, View, Help)
- [x] Property panel (lighting, rotation controls)
- [x] Viewport canvas
- [x] Inspector panel (model info)
- [x] File management utilities

**Status**: All core UI components created and functional

### Phase 2: Model Loading & Rendering
- [ ] glTF/GLB parser implementation (choose library)
- [ ] Mesh rendering in 3D space
- [ ] Material/texture support
- [ ] Camera controls (pan, zoom, rotate)
- [ ] Model statistics calculation
- [ ] Export functionality

**Next**: Implement AssimpJ or custom glTF parser in Scene3D.java

### Phase 3: Advanced Features
- [ ] Animation preview & playback
- [ ] Skeleton/rig visualization
- [ ] Advanced material editor
- [ ] Batch processing tools
- [ ] Plugin system for custom formats
- [ ] Real-time lighting editor

## Library Integration Guide

### For Model Loading (Phase 2)

#### Option 1: AssimpJ (Recommended)
```xml
<dependency>
    <groupId>org.assimp</groupId>
    <artifactId>assimp-java</artifactId>
    <version>5.0.0</version>
</dependency>
```

Implementation pattern:
```java
import assimp.Importer;
import assimp.postprocess.aiPostProcessSteps;

Importer importer = new Importer();
AiScene scene = importer.readFile(filePath, aiPostProcessSteps.aiProcess_Triangulate);
// Access meshes via scene.getMeshes()
```

#### Option 2: Custom glTF Parser (Lightweight)
Use Gson to parse glTF JSON structure:
```java
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

JsonObject gltf = JsonParser.parseReader(new FileReader(file)).getAsJsonObject();
// Navigate JSON structure to extract mesh data
```

#### Option 3: Babylon.js Export
Export models as glTF from Babylon.js sandbox, parse in Java

### Adding Dependencies

1. Add to pom.xml dependencies section
2. Run: `mvn dependency:resolve`
3. IDE will download and index

Example:
```xml
<dependency>
    <groupId>org.assimp</groupId>
    <artifactId>assimp-java</artifactId>
    <version>5.0.0</version>
</dependency>
```

## Running Tests

```bash
# Run all tests
mvn test

# Run specific test
mvn test -Dtest=MainWindowTest

# Run with coverage
mvn test jacoco:report
```

## Packaging for Distribution

### Create Executable JAR
```bash
mvn clean package
java -jar target/orbrpg-3d-editor-0.1.0.jar
```

### Create Fat JAR (with dependencies)
```bash
mvn clean shade:shade
java -jar target/orbrpg-3d-editor-0.1.0-jar-with-dependencies.jar
```

## Troubleshooting

### Application won't start
```bash
# Run with debug output
mvn javafx:run -X

# Check system JavaFX installation
javafxinfo
```

### Performance Issues
- Check Scene3D rendering loop (currently 60 FPS target)
- Reduce grid complexity if slow
- Monitor canvas size (1600x900 default)

### File not found errors
- Verify file paths use absolute paths
- Check character encoding (UTF-8 recommended)
- Test file permissions

## Development Tips

1. **Hot Reload**: Some IDEs support JavaFX hot reload, reduces restart time
2. **Debug Logging**: Scene3D uses System.out.println() - can be replaced with SLF4J
3. **Property Testing**: Adjust PropertyPanel slider ranges in PropertyPanel.java
4. **Theme Customization**: OrbRPG colors defined in component constructors

## Next Immediate Tasks

1. **In Scene3D.java**: Implement glTF/GLB loading
   - Add AssimpJ dependency (or choose alternative)
   - Parse model file format
   - Create mesh representation

2. **Update InspectorPanel.java**: Display actual model statistics
   - Vertex/face counts
   - Material information
   - Bounding box dimensions

3. **Add Camera Controls**: Implement mouse event handlers
   - Left drag: Rotate
   - Right drag: Pan
   - Scroll wheel: Zoom

## Resources

- **JavaFX Documentation**: https://gluonhq.com/products/javafx/
- **Assimp Library**: https://github.com/assimp/assimp
- **glTF Specification**: https://www.khronos.org/gltf/
- **OrbRPG Game Repo**: ../../../ (relative path to game files)

## Support

For issues or questions:
1. Check console output for detailed error messages
2. Verify all prerequisites installed correctly
3. Run `mvn clean install` to reset build state
4. Check existing test files for usage examples

---

**Last Updated**: 2024
**Project Status**: Phase 1 Complete - UI Framework Ready
**Next Milestone**: Phase 2 - Model Loading Implementation
