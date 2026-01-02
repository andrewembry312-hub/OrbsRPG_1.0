package com.orbrpg.scene;

import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.animation.AnimationTimer;
import com.orbrpg.util.ModelLoader;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * 3D Scene manager for OrbRPG 3D Editor
 * 
 * Responsible for:
 * - Managing 3D viewport and rendering
 * - Model loading and display
 * - Camera and view controls
 * - Lighting setup
 * - Auto-rotation animation
 * 
 * Current Implementation: Canvas-based with JavaFX
 * Future: Migrate to more advanced rendering engine if needed
 */
public class Scene3D {
    private Canvas canvas;
    private GraphicsContext gc;
    private AnimationTimer animationTimer;
    private boolean autoRotationEnabled = true;
    private float rotationY = 0;
    private String loadedModelName = null;
    
    // Phase 2C: Camera controls
    private double rotationX = 0;
    private double cameraZoom = 1.5;  // Closer default zoom for better detail visibility
    private double lastMouseX = 0;
    private double lastMouseY = 0;
    private boolean isDraggingLeft = false;
    private boolean isDraggingRight = false;
    private double panX = 0;
    private double panY = 0;
    
    // Phase 2D: 3D mesh data
    private List<float[]> vertices = new ArrayList<>();
    private List<int[]> faces = new ArrayList<>();
    private float[] modelBounds = {-1, -1, -1, 1, 1, 1};
    
    // Phase 3: Materials and per-mesh data
    private List<MeshGroup> meshGroups = new ArrayList<>();
    
        // Preview panel reference (optional)
        private com.orbrpg.ui.ViewportPanel viewportPanel = null;
    
    // Phase 4: Texture support
    private java.util.Map<String, javafx.scene.image.Image> loadedTextures = new java.util.HashMap<>();
    
    private static class MeshGroup {
        List<float[]> vertices = new ArrayList<>();
        List<int[]> faces = new ArrayList<>();
        List<float[]> uvs = new ArrayList<>();  // Phase 4: UV coordinates
        javafx.scene.paint.Color color = javafx.scene.paint.Color.web("#d4af37");
        javafx.scene.image.Image texture = null;  // Phase 4: Texture image
        String materialName = "default";
        int textureIndex = -1;  // Phase 4: Index to texture in glTF
    }

    public Scene3D(Canvas canvas) {
        this.canvas = canvas;
        this.gc = canvas.getGraphicsContext2D();
        setupRendering();
        setupCameraControls();
    }

        /**
         * Constructor with ViewportPanel reference for Three.js preview sync
         */
        public Scene3D(Canvas canvas, com.orbrpg.ui.ViewportPanel viewportPanel) {
            this(canvas);
            this.viewportPanel = viewportPanel;
        }

    private void setupCameraControls() {
        // Phase 2C: Mouse controls
        canvas.setOnMousePressed(e -> {
            lastMouseX = e.getX();
            lastMouseY = e.getY();
            if (e.isPrimaryButtonDown()) {
                isDraggingLeft = true;
                autoRotationEnabled = false;  // Disable auto-rotate during manual control
            }
            if (e.isSecondaryButtonDown()) {
                isDraggingRight = true;
            }
        });

        canvas.setOnMouseDragged(e -> {
            double deltaX = e.getX() - lastMouseX;
            double deltaY = e.getY() - lastMouseY;

            if (isDraggingLeft) {
                // Left drag: rotate view
                rotationY += deltaX * 0.5;
                rotationX += deltaY * 0.5;
            } else if (isDraggingRight) {
                // Right drag: pan view
                panX += deltaX;
                panY += deltaY;
            }

            lastMouseX = e.getX();
            lastMouseY = e.getY();
        });

        canvas.setOnMouseReleased(e -> {
            isDraggingLeft = false;
            isDraggingRight = false;
        });

        canvas.setOnScroll(e -> {
            // Scroll wheel: zoom (increased sensitivity for better control)
            double wheelDelta = e.getDeltaY();
            cameraZoom -= wheelDelta * 0.005;  // 5x more sensitive than before
            cameraZoom = Math.max(0.2, Math.min(15.0, cameraZoom));  // Extended zoom range
        });

        // Keyboard controls
        canvas.setOnKeyPressed(e -> {
            switch (e.getCode()) {
                case R:
                    resetView();
                    break;
                case SPACE:
                    toggleAutoRotation();
                    break;
                case UP:
                    rotationX -= 2;
                    autoRotationEnabled = false;
                    break;
                case DOWN:
                    rotationX += 2;
                    autoRotationEnabled = false;
                    break;
                case LEFT:
                    rotationY -= 2;
                    autoRotationEnabled = false;
                    break;
                case RIGHT:
                    rotationY += 2;
                    autoRotationEnabled = false;
                    break;
                case PLUS:
                case EQUALS:
                    cameraZoom -= 0.1;
                    break;
                case MINUS:
                    cameraZoom += 0.1;
                    break;
                default:
                    break;
            }
        });

        canvas.setFocusTraversable(true);
    }

    private void setupRendering() {
        // Initialize animation loop
        animationTimer = new AnimationTimer() {
            @Override
            public void handle(long now) {
                render();
            }
        };
        animationTimer.start();
    }

    public void loadModel(File file) throws Exception {
        if (!file.exists()) {
            throw new IllegalArgumentException("File not found: " + file.getAbsolutePath());
        }
        
        // Load model using ModelLoader (Phase 2)
        ModelLoader.Model loadedModel = ModelLoader.loadModel(file);
        
        this.loadedModelName = file.getName();
        this.modelBounds = loadedModel.bounds.clone();
        
        System.out.println("═══════════════════════════════════════");
        System.out.println("Model Loaded Successfully");
        System.out.println("═══════════════════════════════════════");
        System.out.println(loadedModel.toString());
        System.out.println("═══════════════════════════════════════");
        
        // Phase 2D: Load actual mesh geometry
        System.out.println("Loading mesh data from: " + file.getName());
        try {
            loadMeshData(file, loadedModel);
            System.out.println("✓ Mesh loaded: " + vertices.size() + " vertices, " + faces.size() + " faces");
        } catch (Exception e) {
            System.err.println("✗ Could not load mesh geometry: " + e.getMessage());
            e.printStackTrace();
            vertices.clear();
            faces.clear();
        }
    }
    
        /**
         * Sync loaded model to Three.js preview
         */
        private void syncToPreview(File file, ModelLoader.Model model) {
            if (viewportPanel == null) {
                return;  // No preview panel connected
            }
        
            try {
                String format = model.format != null ? model.format : "unknown";
                viewportPanel.loadModelInPreview(
                    file.getAbsolutePath(),
                    file.getName(),
                    format,
                    model.meshCount,
                    model.materialCount
                );
                System.out.println("✓ Preview synced: " + file.getName());
            } catch (Exception e) {
                System.err.println("✗ Failed to sync preview: " + e.getMessage());
            }
        }
    
    private void loadMeshData(File file, ModelLoader.Model model) throws Exception {
        String filename = file.getName().toLowerCase();
        System.out.println("Loading mesh for format: " + filename);
        
        if (filename.endsWith(".glb")) {
            System.out.println("Attempting to load GLB mesh data...");
            loadGlbMeshData(file);
        } else if (filename.endsWith(".obj")) {
            System.out.println("Attempting to load OBJ mesh data...");
            loadObjMeshData(file);
        } else {
            System.out.println("Unsupported format for mesh loading: " + filename);
        }
        
            // Sync with Three.js preview after mesh loads
            if (viewportPanel != null) {
                try {
                    syncToPreview(file, model);
                } catch (Exception e) {
                    System.err.println("✗ Could not sync preview: " + e.getMessage());
                }
            }
    }
    
    private void loadGlbMeshData(File file) throws Exception {
        byte[] data = java.nio.file.Files.readAllBytes(file.toPath());
        
        if (data.length < 28) return;
        
        // Parse GLB header: Find chunk offset and JSON content
        int jsonChunkLength = bytesToInt(data, 12);
        String jsonContent = new String(data, 20, jsonChunkLength).trim();
        jsonContent = jsonContent.replaceAll("\0+$", "");
        
        // Binary buffer starts after JSON chunk header (20) + JSON length
        int binaryChunkStart = 20 + jsonChunkLength;
        if (binaryChunkStart + 8 > data.length) return; // Not enough data
        
        // Parse binary chunk header: length at binaryChunkStart, type at binaryChunkStart+4
        int binaryChunkLength = bytesToInt(data, binaryChunkStart);
        int binaryChunkType = bytesToInt(data, binaryChunkStart + 4);
        int binaryDataStart = binaryChunkStart + 8; // After chunk header
        
        try {
            com.google.gson.JsonObject json = com.google.gson.JsonParser.parseString(jsonContent).getAsJsonObject();
            
            // Phase 4: Load images/textures from glTF
            java.util.Map<Integer, javafx.scene.image.Image> textures = new java.util.HashMap<>();
            if (json.has("images")) {
                com.google.gson.JsonArray images = json.getAsJsonArray("images");
                System.out.println("Found " + images.size() + " images");
                
                for (int imgIdx = 0; imgIdx < images.size(); imgIdx++) {
                    com.google.gson.JsonObject image = images.get(imgIdx).getAsJsonObject();
                    javafx.scene.image.Image loadedImg = null;
                    
                    if (image.has("uri")) {
                        String uri = image.get("uri").getAsString();
                        // Check if embedded base64
                        if (uri.startsWith("data:image")) {
                            try {
                                String[] parts = uri.split(",");
                                if (parts.length == 2) {
                                    byte[] imgData = java.util.Base64.getDecoder().decode(parts[1]);
                                    java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(imgData);
                                    loadedImg = new javafx.scene.image.Image(bais, 256, 256, true, true);  // Load with fixed size for performance
                                    System.out.println("  ✓ Loaded embedded texture " + imgIdx + " (" + imgData.length + " bytes)");
                                }
                            } catch (Exception e) {
                                System.err.println("  ✗ Failed to load embedded image " + imgIdx + ": " + e.getClass().getSimpleName() + " - " + e.getMessage());
                            }
                        } else {
                            // Try to load external file relative to model
                            try {
                                java.io.File textureFile = new java.io.File(file.getParent(), uri);
                                if (textureFile.exists()) {
                                    loadedImg = new javafx.scene.image.Image(new java.io.FileInputStream(textureFile), 256, 256, true, true);
                                    System.out.println("  ✓ Loaded external texture: " + uri);
                                } else {
                                    System.err.println("  ✗ Texture file not found: " + textureFile.getAbsolutePath());
                                }
                            } catch (Exception e) {
                                System.err.println("  ✗ Failed to load external image " + uri + ": " + e.getMessage());
                            }
                        }
                    } else {
                        System.err.println("  ✗ Image " + imgIdx + " has no URI");
                    }
                    
                    if (loadedImg != null) {
                        textures.put(imgIdx, loadedImg);
                    }
                }
            }
            
            // Phase 3: Load materials with colors
            java.util.Map<Integer, javafx.scene.paint.Color> materialColors = new java.util.HashMap<>();
            java.util.Map<Integer, Integer> materialTextures = new java.util.HashMap<>();  // Phase 4
            String[] materialNames = new String[10];
            
            if (json.has("materials")) {
                com.google.gson.JsonArray materials = json.getAsJsonArray("materials");
                System.out.println("Found " + materials.size() + " materials");
                
                // Predefined colors for variation - more vibrant
                String[] colorPresets = {"#FF4444", "#44FF44", "#4444FF", "#FFFF44", "#FF44FF", 
                                        "#44FFFF", "#FF8844", "#88FF44", "#4488FF", "#FF4488"};
                
                for (int m = 0; m < materials.size(); m++) {
                    com.google.gson.JsonObject material = materials.get(m).getAsJsonObject();
                    javafx.scene.paint.Color color = javafx.scene.paint.Color.web(colorPresets[m % colorPresets.length]);
                    
                    // Try to get material name
                    if (material.has("name")) {
                        materialNames[m] = material.get("name").getAsString();
                    }
                    
                    // Phase 4: Try to get texture from baseColorTexture
                    if (material.has("pbrMetallicRoughness")) {
                        com.google.gson.JsonObject pbr = material.getAsJsonObject("pbrMetallicRoughness");
                        
                        // Get texture index
                        if (pbr.has("baseColorTexture")) {
                            com.google.gson.JsonObject texInfo = pbr.getAsJsonObject("baseColorTexture");
                            if (texInfo.has("index")) {
                                int texIdx = texInfo.get("index").getAsInt();
                                materialTextures.put(m, texIdx);
                                System.out.println("  Material " + m + " uses texture " + texIdx);
                            }
                        }
                        
                        if (pbr.has("baseColorFactor")) {
                            com.google.gson.JsonArray colorArray = pbr.getAsJsonArray("baseColorFactor");
                            if (colorArray.size() >= 3) {
                                double r = colorArray.get(0).getAsDouble();
                                double g = colorArray.get(1).getAsDouble();
                                double b = colorArray.get(2).getAsDouble();
                                double a = colorArray.size() > 3 ? colorArray.get(3).getAsDouble() : 1.0;
                                color = new javafx.scene.paint.Color(r, g, b, a);
                            }
                        }
                    }
                    materialColors.put(m, color);
                    System.out.println("  Material " + m + ": " + color.toString());
                }
            } else {
                System.out.println("No materials found in glTF - using preset colors");
            }
            
            // Extract all meshes with per-mesh materials
            if (json.has("meshes")) {
                com.google.gson.JsonArray meshes = json.getAsJsonArray("meshes");
                com.google.gson.JsonArray accessors = json.getAsJsonArray("accessors");
                com.google.gson.JsonArray bufferViews = json.getAsJsonArray("bufferViews");
                
                System.out.println("Processing " + meshes.size() + " meshes");
                
                for (int meshIdx = 0; meshIdx < meshes.size(); meshIdx++) {
                    com.google.gson.JsonObject mesh = meshes.get(meshIdx).getAsJsonObject();
                    if (mesh.has("primitives")) {
                        com.google.gson.JsonArray primitives = mesh.getAsJsonArray("primitives");
                        
                        for (int primIdx = 0; primIdx < primitives.size(); primIdx++) {
                            com.google.gson.JsonObject primitive = primitives.get(primIdx).getAsJsonObject();
                            MeshGroup group = new MeshGroup();
                            
                            // Get material color and texture - with fallback to variation
                            // Get material color and texture - with fallback to variation
                            if (primitive.has("material")) {
                                int matIdx = primitive.get("material").getAsInt();
                                if (materialColors.containsKey(matIdx)) {
                                    group.color = materialColors.get(matIdx);
                                    if (materialNames[matIdx] != null) {
                                        group.materialName = materialNames[matIdx];
                                    }
                                }
                                // Phase 4: Assign texture if material has one
                                if (materialTextures.containsKey(matIdx)) {
                                    int texIdx = materialTextures.get(matIdx);
                                    if (textures.containsKey(texIdx)) {
                                        group.texture = textures.get(texIdx);
                                        group.textureIndex = texIdx;
                                        System.out.println("  Assigned texture " + texIdx + " to material " + matIdx);
                                    }
                                }
                            } else {
                                // Use mesh index as fallback color variation (vibrant)
                                String[] colorPresets = {"#FF4444", "#44FF44", "#4444FF", "#FFFF44", "#FF44FF", 
                                                        "#44FFFF", "#FF8844", "#88FF44", "#4488FF", "#FF4488"};
                                group.color = javafx.scene.paint.Color.web(colorPresets[meshIdx % colorPresets.length]);
                            }
                            
                            // Get position accessor index
                            if (primitive.has("attributes")) {
                                com.google.gson.JsonObject attributes = primitive.getAsJsonObject("attributes");
                                if (attributes.has("POSITION")) {
                                    int posAccessorIdx = attributes.get("POSITION").getAsInt();
                                    
                                    if (posAccessorIdx < accessors.size()) {
                                        com.google.gson.JsonObject accessor = accessors.get(posAccessorIdx).getAsJsonObject();
                                        int count = accessor.get("count").getAsInt();
                                        int bufferViewIdx = accessor.get("bufferView").getAsInt();
                                        int byteOffset = accessor.has("byteOffset") ? accessor.get("byteOffset").getAsInt() : 0;
                                        
                                        if (bufferViewIdx < bufferViews.size()) {
                                            com.google.gson.JsonObject bufferView = bufferViews.get(bufferViewIdx).getAsJsonObject();
                                            int bufferOffset = bufferView.get("byteOffset").getAsInt();
                                            int byteStride = bufferView.has("byteStride") ? bufferView.get("byteStride").getAsInt() : 12;
                                            
                                            // Read vertex positions from binary buffer
                                            int dataOffset = binaryDataStart + bufferOffset + byteOffset;
                                            int loadLimit = Math.min(count, 2000); // Limit per mesh for performance
                                            
                                            for (int i = 0; i < loadLimit; i++) {
                                                int pos = dataOffset + (i * byteStride);
                                                
                                                if (pos + 12 <= data.length) {
                                                    float x = bytesToFloat(data, pos);
                                                    float y = bytesToFloat(data, pos + 4);
                                                    float z = bytesToFloat(data, pos + 8);
                                                    group.vertices.add(new float[]{x, y, z});
                                                }
                                            }
                                            
                                            // Create wireframe faces
                                            if (group.vertices.size() > 2) {
                                                for (int i = 0; i < group.vertices.size() - 2; i += 3) {
                                                    group.faces.add(new int[]{i, i + 1});
                                                    group.faces.add(new int[]{i + 1, i + 2});
                                                    group.faces.add(new int[]{i + 2, i});
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            
                            if (!group.vertices.isEmpty()) {
                                meshGroups.add(group);
                                System.out.println("Mesh " + meshIdx + " primitive " + primIdx + ": " + 
                                                 group.vertices.size() + " vertices, color=" + group.color);
                            }
                        }
                    }
                }
            }
            
            System.out.println("✓ Phase 3: Loaded " + meshGroups.size() + " mesh groups with materials");
        } catch (Exception e) {
            System.err.println("Error parsing GLB mesh: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    // Helper: Convert 4 bytes to float (little-endian)
    private float bytesToFloat(byte[] data, int offset) {
        int bits = bytesToInt(data, offset);
        return Float.intBitsToFloat(bits);
    }
    
    private void loadObjMeshData(File file) throws Exception {
        java.util.List<String> lines = java.nio.file.Files.readAllLines(file.toPath());
        System.out.println("OBJ file has " + lines.size() + " lines");
        
        vertices.clear();
        faces.clear();
        
        int vertexCount = 0;
        int faceCount = 0;
        
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty() || line.startsWith("#")) continue;
            
            if (line.startsWith("v ")) {
                // Vertex line: v x y z
                try {
                    String[] parts = line.substring(2).trim().split("\\s+");
                    if (parts.length >= 3) {
                        float x = Float.parseFloat(parts[0]);
                        float y = Float.parseFloat(parts[1]);
                        float z = Float.parseFloat(parts[2]);
                        vertices.add(new float[]{x, y, z});
                        vertexCount++;
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing vertex: " + line);
                }
            } else if (line.startsWith("f ")) {
                // Face line: f v1 v2 v3 ...
                try {
                    String[] parts = line.substring(2).trim().split("\\s+");
                    if (parts.length >= 3) {
                        int[] face = new int[parts.length];
                        for (int i = 0; i < parts.length; i++) {
                            // Handle "v", "v/vt", "v/vt/vn" formats
                            String[] indices = parts[i].split("/");
                            face[i] = Integer.parseInt(indices[0]) - 1; // OBJ is 1-indexed
                        }
                        faces.add(face);
                        faceCount++;
                    }
                } catch (Exception e) {
                    System.err.println("Error parsing face: " + line);
                }
            }
        }
        
        System.out.println("OBJ mesh loaded: " + vertexCount + " vertices, " + faceCount + " faces");
    }
    
    private static int bytesToInt(byte[] data, int offset) {
        return (data[offset] & 0xFF) |
               ((data[offset + 1] & 0xFF) << 8) |
               ((data[offset + 2] & 0xFF) << 16) |
               ((data[offset + 3] & 0xFF) << 24);
    }

    private void render() {
        // Clear canvas with OrbRPG dark background
        gc.setFill(javafx.scene.paint.Color.web("#1a1a1a"));
        gc.fillRect(0, 0, canvas.getWidth(), canvas.getHeight());

        // Draw grid
        drawGrid();

        // Draw model if loaded
        if (loadedModelName != null) {
            drawLoadedModel();
        }

        // Update rotation if auto-rotation enabled
        if (autoRotationEnabled) {
            rotationY += 0.5f;
        }
    }

    private void drawGrid() {
        gc.setStroke(javafx.scene.paint.Color.web("#333"));
        gc.setLineWidth(0.5);
        
        double centerX = canvas.getWidth() / 2;
        double centerY = canvas.getHeight() / 2;
        double gridSize = 50;
        // Keep the grid within the visible canvas; shrink count if the view is smaller
        int maxLines = (int) Math.floor(Math.min(canvas.getWidth(), canvas.getHeight()) / (2 * gridSize)) - 1;
        int gridCount = Math.max(5, Math.min(10, maxLines));

        for (int i = -gridCount; i <= gridCount; i++) {
            // Vertical lines
            gc.strokeLine(centerX + i * gridSize, centerY - gridCount * gridSize, 
                         centerX + i * gridSize, centerY + gridCount * gridSize);
            // Horizontal lines
            gc.strokeLine(centerX - gridCount * gridSize, centerY + i * gridSize,
                         centerX + gridCount * gridSize, centerY + i * gridSize);
        }

        // Draw center origin
        gc.setStroke(javafx.scene.paint.Color.web("#d4af37"));
        gc.setLineWidth(2);
        gc.strokeLine(centerX - 10, centerY, centerX + 10, centerY);
        gc.strokeLine(centerX, centerY - 10, centerX, centerY + 10);
    }

    private void drawLoadedModel() {
        double centerX = canvas.getWidth() / 2;
        double centerY = canvas.getHeight() / 2;

        if (meshGroups.isEmpty() && vertices.isEmpty()) {
            // Fallback placeholder if no mesh data
            gc.setFill(javafx.scene.paint.Color.web("#d4af37"));
            double modelX = centerX + panX + Math.cos(Math.toRadians(rotationY)) * 30;
            double modelY = centerY + panY - 100 + Math.sin(Math.toRadians(rotationX)) * 30;
            gc.fillOval(modelX - 50, modelY - 50, 100, 100);
        } else if (!meshGroups.isEmpty()) {
            // Phase 3: Render all mesh groups with materials
            renderMeshGroups(centerX, centerY);
        } else {
            // Render legacy single mesh
            renderMesh(centerX, centerY);
        }

        // Draw model info
        gc.setFill(javafx.scene.paint.Color.web("#aaa"));
        gc.setFont(new javafx.scene.text.Font(12));
        int y = 20;
        gc.fillText("Model: " + loadedModelName, 10, y);
        y += 20;
        
        if (!meshGroups.isEmpty()) {
            int totalVerts = 0, totalFaces = 0;
            for (MeshGroup g : meshGroups) {
                totalVerts += g.vertices.size();
                totalFaces += g.faces.size();
            }
            gc.fillText("Meshes: " + meshGroups.size() + " | Vertices: " + totalVerts + " | Faces: " + totalFaces, 10, y);
        } else {
            gc.fillText("Vertices: " + vertices.size() + " Faces: " + faces.size(), 10, y);
        }
        
        y += 20;
        gc.fillText("Rotation: X=" + String.format("%.1f°", rotationX) + 
                   " Y=" + String.format("%.1f°", rotationY), 10, y);
        y += 20;
        gc.fillText("Zoom: " + String.format("%.2f", cameraZoom), 10, y);
        
        // Draw controls hint
        gc.setFill(javafx.scene.paint.Color.web("#666"));
        gc.setFont(new javafx.scene.text.Font(10));
        y += 30;
        gc.fillText("LMB Drag: Rotate | RMB Drag: Pan | Scroll: Zoom | R: Reset | Space: Toggle Auto-Rotate", 10, y);
    }
    
    private void renderMeshGroups(double centerX, double centerY) {
        // Calculate combined bounds
        float[] center = new float[3];
        float maxDist = 0;
        
        for (MeshGroup group : meshGroups) {
            for (float[] v : group.vertices) {
                center[0] += v[0];
                center[1] += v[1];
                center[2] += v[2];
            }
        }
        
        int totalVerts = 0;
        for (MeshGroup g : meshGroups) totalVerts += g.vertices.size();
        if (totalVerts > 0) {
            center[0] /= totalVerts;
            center[1] /= totalVerts;
            center[2] /= totalVerts;
        }
        
        // Calculate scale
        for (MeshGroup group : meshGroups) {
            for (float[] v : group.vertices) {
                float dist = (float)Math.sqrt((v[0]-center[0])*(v[0]-center[0]) + 
                                            (v[1]-center[1])*(v[1]-center[1]) + 
                                            (v[2]-center[2])*(v[2]-center[2]));
                maxDist = Math.max(maxDist, dist);
            }
        }
        if (maxDist < 0.01f) maxDist = 1.0f;
        float scale = (float)(80.0 / (maxDist * cameraZoom));
        
        // Render each mesh group with its material color or texture
        for (MeshGroup group : meshGroups) {
            // Use vibrant material colors
            gc.setStroke(group.color);
            gc.setLineWidth(2.0);  // Thicker lines for better visibility
            
            // Render wireframe edges
            for (int[] face : group.faces) {
                if (face.length >= 2) {
                    int idx1 = face[0];
                    int idx2 = face[1];
                    
                    if (idx1 < group.vertices.size() && idx2 < group.vertices.size()) {
                        float[] v1 = group.vertices.get(idx1);
                        float[] v2 = group.vertices.get(idx2);
                        
                        float[] rotated1 = rotatePoint(v1);
                        float[] rotated2 = rotatePoint(v2);
                        
                        double x1 = centerX + panX + (rotated1[0] - center[0]) * scale;
                        double y1 = centerY + panY - (rotated1[1] - center[1]) * scale;
                        double x2 = centerX + panX + (rotated2[0] - center[0]) * scale;
                        double y2 = centerY + panY - (rotated2[1] - center[1]) * scale;
                        
                        gc.strokeLine(x1, y1, x2, y2);
                    }
                }
            }
        }
    }
    
    // Phase 4: Render textured mesh group
    private void renderGroupWithTexture(MeshGroup group, double centerX, double centerY, float[] center, float scale) {
        if (group.texture == null) return;
        
        // Draw texture as overlay on mesh bounds
        if (group.vertices.size() < 3) return;
        
        double minX = Double.MAX_VALUE, maxX = -Double.MAX_VALUE;
        double minY = Double.MAX_VALUE, maxY = -Double.MAX_VALUE;
        
        for (float[] v : group.vertices) {
            float[] rotated = rotatePoint(v);
            double x = centerX + panX + (rotated[0] - center[0]) * scale;
            double y = centerY + panY - (rotated[1] - center[1]) * scale;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        
        double width = maxX - minX;
        double height = maxY - minY;
        
        if (width > 0 && height > 0) {
            javafx.scene.image.Image texture = group.texture;
            
            // Draw texture with higher visibility
            gc.setGlobalAlpha(0.8);  // More opaque for better visibility
            gc.drawImage(texture, minX, minY, width, height);
            gc.setGlobalAlpha(1.0);  // Reset alpha
            
            // Debug: Draw texture bounds outline
            gc.setStroke(javafx.scene.paint.Color.web("#FF00FF"));
            gc.setLineWidth(2);
            gc.strokeRect(minX, minY, width, height);
        }
    }
    
    private void renderMesh(double centerX, double centerY) {
        // Calculate model center and scale
        float[] center = calculateModelCenter();
        float maxDist = calculateModelScale();
        float scale = (float)(80.0 / (maxDist * cameraZoom));
        
        // Render wireframe
        gc.setStroke(javafx.scene.paint.Color.web("#d4af37"));
        gc.setLineWidth(1.0);
        
        for (int[] face : faces) {
            if (face.length >= 2) {
                // Draw face edges
                for (int i = 0; i < face.length; i++) {
                    int v1Idx = face[i];
                    int v2Idx = face[(i + 1) % face.length];
                    
                    if (v1Idx >= 0 && v1Idx < vertices.size() && 
                        v2Idx >= 0 && v2Idx < vertices.size()) {
                        
                        float[] v1 = vertices.get(v1Idx);
                        float[] v2 = vertices.get(v2Idx);
                        
                        // Apply rotations
                        float[] p1 = rotatePoint(v1);
                        float[] p2 = rotatePoint(v2);
                        
                        // Project to 2D
                        double x1 = centerX + panX + (p1[0] - center[0]) * scale;
                        double y1 = centerY + panY - (p1[1] - center[1]) * scale;
                        double x2 = centerX + panX + (p2[0] - center[0]) * scale;
                        double y2 = centerY + panY - (p2[1] - center[1]) * scale;
                        
                        gc.strokeLine(x1, y1, x2, y2);
                    }
                }
            }
        }
        
        // Draw vertices as small dots
        gc.setFill(javafx.scene.paint.Color.web("#aaffaa"));
        for (float[] vertex : vertices) {
            float[] p = rotatePoint(vertex);
            double x = centerX + panX + (p[0] - center[0]) * scale;
            double y = centerY + panY - (p[1] - center[1]) * scale;
            gc.fillOval(x - 2, y - 2, 4, 4);
        }
    }
    
    private float[] calculateModelCenter() {
        if (vertices.isEmpty()) return new float[]{0, 0, 0};
        
        float minX = Float.MAX_VALUE, maxX = -Float.MAX_VALUE;
        float minY = Float.MAX_VALUE, maxY = -Float.MAX_VALUE;
        float minZ = Float.MAX_VALUE, maxZ = -Float.MAX_VALUE;
        
        for (float[] v : vertices) {
            minX = Math.min(minX, v[0]);
            maxX = Math.max(maxX, v[0]);
            minY = Math.min(minY, v[1]);
            maxY = Math.max(maxY, v[1]);
            minZ = Math.min(minZ, v[2]);
            maxZ = Math.max(maxZ, v[2]);
        }
        
        return new float[]{
            (minX + maxX) / 2,
            (minY + maxY) / 2,
            (minZ + maxZ) / 2
        };
    }
    
    private float calculateModelScale() {
        if (vertices.isEmpty()) return 1.0f;
        
        float[] center = calculateModelCenter();
        float maxDist = 0;
        
        for (float[] v : vertices) {
            float dx = v[0] - center[0];
            float dy = v[1] - center[1];
            float dz = v[2] - center[2];
            float dist = (float)Math.sqrt(dx*dx + dy*dy + dz*dz);
            maxDist = Math.max(maxDist, dist);
        }
        
        return maxDist > 0 ? maxDist : 1.0f;
    }
    
    private float[] rotatePoint(float[] p) {
        // Apply X rotation
        double radX = Math.toRadians(rotationX);
        float y1 = (float)(p[1] * Math.cos(radX) - p[2] * Math.sin(radX));
        float z1 = (float)(p[1] * Math.sin(radX) + p[2] * Math.cos(radX));
        
        // Apply Y rotation
        double radY = Math.toRadians(rotationY);
        float x2 = (float)(p[0] * Math.cos(radY) + z1 * Math.sin(radY));
        float z2 = (float)(-p[0] * Math.sin(radY) + z1 * Math.cos(radY));
        
        return new float[]{x2, y1, z2};
    }

    public void resetView() {
        rotationY = 0;
        rotationX = 0;
        cameraZoom = 1.5;
        panX = 0;
        panY = 0;
        autoRotationEnabled = true;
        System.out.println("View reset - Camera controls ready");
    }

    public void toggleAutoRotation() {
        autoRotationEnabled = !autoRotationEnabled;
        System.out.println("Auto-rotation: " + (autoRotationEnabled ? "ON" : "OFF"));
    }

    public void cleanup() {
        if (animationTimer != null) {
            animationTimer.stop();
        }
    }

    // Getters
    public String getLoadedModelName() {
        return loadedModelName;
    }
    
    public int getMeshGroupCount() {
        return meshGroups.size();
    }

    public boolean isAutoRotationEnabled() {
        return autoRotationEnabled;
    }

    public float getRotationY() {
        return rotationY;
    }
}
