# OrbRPG 3D Editor - Development Guide

## Architecture Overview

The OrbRPG 3D Editor follows a clean **MVC (Model-View-Controller)** architecture:

```
┌─────────────────────────────────────┐
│          Main.java                  │  Application Entry Point
│      (JavaFX Application)           │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│       MainWindow.java               │  Controller & View Container
│    (Menu, Layout, File Dialog)      │
└────────────┬────────────────────────┘
             │
    ┌────────┼────────┬──────────┐
    ▼        ▼        ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Property│ │Viewport│ │Inspector│ │Scene3D │
│ Panel  │ │ Panel  │ │ Panel   │ │ Model  │
│ (View) │ │ (View) │ │ (View)  │ │(Model) │
└────────┘ └────────┘ └────────┘ └────────┘
```

## Code Patterns & Examples

### 1. JavaFX Component Creation

**Pattern**: Create component in dedicated class, return container

```java
public class MyPanel {
    private VBox pane;
    
    public MyPanel() {
        this.pane = new VBox(spacing);
        this.pane.setStyle("-fx-background-color: #111;");
        setupControls();
    }
    
    private void setupControls() {
        // Create and add UI controls
        Label label = new Label("Title");
        label.setStyle("-fx-text-fill: #d4af37;");
        pane.getChildren().add(label);
    }
    
    public VBox getPane() {
        return pane;
    }
}
```

**Usage in MainWindow**:
```java
MyPanel panel = new MyPanel();
root.setLeft(panel.getPane());
```

### 2. Event Handling

**Pattern**: Private handler methods called from UI elements

```java
private void handleLoadModel() {
    FileChooser fileChooser = new FileChooser();
    fileChooser.getExtensionFilters().add(
        new FileChooser.ExtensionFilter("3D Models", "*.glb", "*.gltf")
    );
    
    File file = fileChooser.showOpenDialog(null);
    if (file != null) {
        try {
            scene3d.loadModel(file);
            inspectorPanel.setModelInfo(file.getName(), file.length());
            updateStatus("Loaded: " + file.getName());
        } catch (Exception ex) {
            showError("Load Failed", ex.getMessage());
        }
    }
}
```

### 3. Styling Pattern

**Consistent Color Scheme**:
```java
// Background colors
"-fx-background-color: #1a1a1a"   // Main background
"-fx-background-color: #111"       // Panels
"-fx-background-color: #0a0a0a"   // Dark panels

// Text colors
"-fx-text-fill: #fff"              // Primary text
"-fx-text-fill: #aaa"              // Secondary text
"-fx-text-fill: #d4af37"           // Accent (gold)

// Border colors
"-fx-border-color: #333"           // Subtle borders
"-fx-border-color: #d4af37"        // Accent borders
```

**Applied to Control**:
```java
Label label = new Label("Title");
label.setStyle(
    "-fx-font-size: 14;" +
    "-fx-font-weight: bold;" +
    "-fx-text-fill: #d4af37;"
);
```

### 4. Animation Loop Pattern (Scene3D)

```java
public class Scene3D {
    private AnimationTimer animationTimer;
    
    private void setupRendering() {
        animationTimer = new AnimationTimer() {
            @Override
            public void handle(long now) {
                render();  // Called ~60 times per second
            }
        };
        animationTimer.start();
    }
    
    private void render() {
        // Clear canvas
        gc.setFill(Color.web("#1a1a1a"));
        gc.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());
        
        // Draw content
        drawGrid();
        drawModel();
        
        // Update animation state
        if (animating) {
            rotationY += 0.5f;
        }
    }
}
```

### 5. File Utilities Pattern

```java
// Get model file
File modelFile = FileUtils.getLastModelPath();

// Check validity
if (FileUtils.isValidModelFormat(file)) {
    // Process file
}

// Get metadata
FileUtils.FileMetadata meta = FileUtils.getFileMetadata(file);
System.out.println(meta.toString());  // "file.glb (GLB, 1.25 MB)"

// Save preference
FileUtils.saveLastModelPath(file);
```

### 6. Canvas Drawing Pattern

```java
private void drawGrid() {
    GraphicsContext gc = canvas.getGraphicsContext2D();
    
    // Set style
    gc.setStroke(Color.web("#333"));
    gc.setLineWidth(0.5);
    
    // Draw grid
    for (int i = -10; i <= 10; i++) {
        gc.strokeLine(
            centerX + i * gridSize, centerY - 500,
            centerX + i * gridSize, centerY + 500
        );
    }
    
    // Draw center point
    gc.setStroke(Color.web("#d4af37"));
    gc.setLineWidth(2);
    gc.strokeLine(centerX - 10, centerY, centerX + 10, centerY);
}
```

## Working with Models (Phase 2)

### Model Loading Implementation Template

```java
public void loadModel(File file) throws Exception {
    // Validate input
    if (!file.exists()) {
        throw new IllegalArgumentException("File not found");
    }
    
    String ext = FileUtils.getFileExtension(file);
    if (!ext.equals("glb") && !ext.equals("gltf")) {
        throw new IllegalArgumentException("Unsupported format");
    }
    
    // Parse model (choose library approach)
    // Option 1: AssimpJ
    // Importer importer = new Importer();
    // AiScene aiScene = importer.readFile(file.getAbsolutePath());
    // AiMesh[] meshes = aiScene.getMeshes();
    
    // Option 2: Custom JSON parser
    // JsonObject gltf = parseGLTF(file);
    // extractMeshData(gltf);
    
    // Store reference
    this.loadedModel = file;
    this.loadedModelName = file.getName();
    
    // Notify listeners
    onModelLoaded();
}
```

### Mesh Rendering Pattern (Canvas)

```java
private void drawLoadedModel() {
    // Get model bounds
    double[] bounds = calculateModelBounds();
    
    // Transform to screen space
    double screenX = canvas.getWidth() / 2;
    double screenY = canvas.getHeight() / 2;
    
    // Draw each mesh
    for (Mesh mesh : model.getMeshes()) {
        for (Face face : mesh.getFaces()) {
            // Project vertices to 2D
            double[] v1 = projectVertex(face.v1);
            double[] v2 = projectVertex(face.v2);
            double[] v3 = projectVertex(face.v3);
            
            // Draw triangle with material color
            drawTriangle(v1, v2, v3, face.material);
        }
    }
    
    // Draw wireframe if enabled
    if (wireframeMode) {
        drawWireframe();
    }
}
```

## Menu System Extension

### Adding New Menu Items

```java
// In MainWindow.createMenuBar()
Menu editMenu = new Menu("Edit");

MenuItem duplicate = new MenuItem("Duplicate Model");
duplicate.setOnAction(e -> handleDuplicate());

MenuItem settings = new MenuItem("Settings");
settings.setOnAction(e -> showSettings());

editMenu.getItems().addAll(duplicate, new SeparatorMenuItem(), settings);
menuBar.getMenus().add(editMenu);
```

## Properties Panel Customization

### Adding New Controls

```java
// In PropertyPanel.setupControls()
// Add camera controls
Label cameraLabel = new Label("Camera");
cameraLabel.setStyle("-fx-text-fill: #d4af37;");

Slider zoomSlider = new Slider(0.1, 10, 1);
zoomSlider.valueProperty().addListener((obs, old, newVal) -> {
    scene3d.setZoom(newVal.doubleValue());
});

pane.getChildren().addAll(cameraLabel, zoomSlider);
```

## Inspector Panel Updates

### Display Model Statistics

```java
// In InspectorPanel.setModelInfo()
public void setModelStatistics(ModelStats stats) {
    StringBuilder info = new StringBuilder();
    info.append("Vertices: ").append(stats.vertexCount).append("\n");
    info.append("Faces: ").append(stats.faceCount).append("\n");
    info.append("Materials: ").append(stats.materialCount).append("\n");
    info.append("Bounds: ").append(stats.boundsString).append("\n");
    
    modelInfoArea.setText(info.toString());
}
```

## Error Handling Pattern

```java
private void handleLoadModel() {
    try {
        File file = fileChooser.showOpenDialog(null);
        if (file != null) {
            scene3d.loadModel(file);
            updateStatus("Success: " + file.getName());
        }
    } catch (FileNotFoundException ex) {
        updateStatus("File not found");
        showError("Load Error", "Could not find file: " + ex.getMessage());
    } catch (IOException ex) {
        updateStatus("IO Error");
        showError("Load Error", "Error reading file: " + ex.getMessage());
    } catch (Exception ex) {
        updateStatus("Unknown error");
        showError("Error", ex.getMessage());
        ex.printStackTrace();
    }
}

private void showError(String title, String message) {
    Alert alert = new Alert(Alert.AlertType.ERROR);
    alert.setTitle(title);
    alert.setContentText(message);
    alert.showAndWait();
}
```

## Testing Patterns

### Unit Test Example

```java
import org.junit.Test;
import static org.junit.Assert.*;

public class FileUtilsTest {
    @Test
    public void testValidModelFormat() {
        File validGLB = new File("test.glb");
        assertTrue(FileUtils.isValidModelFormat(validGLB));
        
        File invalidFile = new File("test.txt");
        assertFalse(FileUtils.isValidModelFormat(invalidFile));
    }
    
    @Test
    public void testHumanReadableFileSize() {
        assertEquals("1.00 KB", FileUtils.getHumanReadableFileSize(1024));
        assertEquals("1.00 MB", FileUtils.getHumanReadableFileSize(1024 * 1024));
    }
}
```

## Performance Optimization

### Canvas Rendering Performance

```java
// Good: Cache computation
private double gridX, gridY, gridSize;

private void precomputeGrid() {
    gridX = canvas.getWidth() / 2;
    gridY = canvas.getHeight() / 2;
    gridSize = 50;
}

private void drawGrid() {
    // Use cached values
    for (int i = -10; i <= 10; i++) {
        gc.strokeLine(gridX + i * gridSize, ...);
    }
}

// Avoid: Expensive operations in render()
// DON'T: String concatenation in every frame
// DON'T: Large object allocation per frame
```

### Memory Management

```java
public void cleanup() {
    // Stop animation loop
    if (animationTimer != null) {
        animationTimer.stop();
    }
    
    // Clear large objects
    loadedModel = null;
    canvas = null;
    gc = null;
}
```

## Extending with Custom Formats

### Adding Support for New File Type

```java
// 1. Update FileUtils.isValidModelFormat()
if (name.endsWith(".obj") || name.endsWith(".fbx")) {
    return true;
}

// 2. Update Scene3D.loadModel()
if (ext.equals("obj")) {
    loadOBJModel(file);
} else if (ext.equals("fbx")) {
    loadFBXModel(file);
}

// 3. Implement loader
private void loadOBJModel(File file) throws Exception {
    // Parse OBJ format
    // OBJ format: simple text-based format
    // v x y z       - vertex
    // f v1 v2 v3    - face
}
```

## Debugging Tips

### Enable Debug Logging

```java
// In Scene3D.render()
System.out.println("FPS: " + calculateFPS());
System.out.println("Rotation: " + rotationY);
System.out.println("Model: " + loadedModelName);

// In file operations
System.out.println("Loading: " + file.getAbsolutePath());
System.out.println("File size: " + file.length());
System.out.println("Format: " + FileUtils.getFileExtension(file));
```

### Performance Profiling

```bash
# Run with profiler
mvn javafx:run -Djava.util.logging.config.file=logging.properties

# Monitor memory usage
jvisualvm --pid <PID>
```

## Git Workflow

```bash
# Feature branch for Phase 2
git checkout -b feature/model-loading

# Commit changes
git add src/
git commit -m "Implement glTF model loading with AssimpJ"

# Push to remote
git push origin feature/model-loading

# Create pull request for review
```

## Next Development Phase

**Phase 2 Priority Tasks**:
1. Choose and integrate model loading library (AssimpJ recommended)
2. Implement mesh rendering in Scene3D
3. Add camera controls (mouse/keyboard)
4. Display model statistics in InspectorPanel
5. Implement basic export functionality

**Estimated Timeline**: 3-5 development sessions

---

**For Questions**: Refer to source code comments and JavaFX documentation
