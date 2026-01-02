package com.orbrpg.util;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Utility class for loading and processing 3D models
 * Supports glTF, GLB, OBJ, FBX and other formats via AssimpJ
 */
public class ModelLoader {

    /**
     * Model data container
     */
    public static class Model {
        public String name;
        public long fileSize;
        public String format;
        public int meshCount;
        public int vertexCount;
        public int faceCount;
        public int materialCount;
        public float[] bounds;  // [minX, minY, minZ, maxX, maxY, maxZ]

        public Model(String name) {
            this.name = name;
            this.bounds = new float[6];
        }

        @Override
        public String toString() {
            return String.format(
                "Model: %s\n" +
                "Format: %s\n" +
                "Meshes: %d\n" +
                "Vertices: %d\n" +
                "Faces: %d\n" +
                "Materials: %d",
                name, format, meshCount, vertexCount, faceCount, materialCount
            );
        }
    }

    /**
     * Load a 3D model from file using Gson JSON parser for glTF
     * 
     * Supported formats:
     * - glTF (.gltf) - Khronos standard (JSON-based)
     * - glTF Binary (.glb) - Khronos standard (Binary)
     * 
     * Phase 2 Implementation:
     * Uses pure Java with Gson to parse glTF format
     * No native library dependencies required
     */
    public static Model loadModel(File file) throws Exception {
        if (!file.exists()) {
            throw new IllegalArgumentException("File not found: " + file.getAbsolutePath());
        }

        String fileName = file.getName().toLowerCase();
        String format = getFormat(fileName);

        if (format == null) {
            throw new IllegalArgumentException("Unsupported format: " + fileName);
        }

        Model model = new Model(file.getName());
        model.fileSize = file.length();
        model.format = format;

        try {
            String extension = getExtension(file).toLowerCase();
            
            if (extension.equals("gltf")) {
                loadGltfModel(file, model);
            } else if (extension.equals("glb")) {
                loadGlbModel(file, model);
            } else {
                loadPreviewModel(file, model);
            }
            
            System.out.println("Phase 2B: Loaded " + format);
            System.out.println("File: " + file.getAbsolutePath());
            System.out.println("Size: " + FileUtils.getHumanReadableFileSize(model.fileSize));
            System.out.println(model.toString());

            return model;

        } catch (Exception e) {
            System.err.println("Error loading model: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to load model: " + e.getMessage(), e);
        }
    }
    
    /**
     * Phase 2B: Load glTF JSON model
     */
    private static void loadGltfModel(File file, Model model) throws Exception {
        String jsonContent = new String(java.nio.file.Files.readAllBytes(file.toPath()));
        JsonObject json = JsonParser.parseString(jsonContent).getAsJsonObject();
        
        if (json.has("asset")) {
            System.out.println("glTF Version: " + json.getAsJsonObject("asset").get("version"));
        }
        
        if (json.has("meshes")) {
            JsonArray meshes = json.getAsJsonArray("meshes");
            model.meshCount = meshes.size();
            
            for (int i = 0; i < meshes.size(); i++) {
                JsonObject mesh = meshes.get(i).getAsJsonObject();
                if (mesh.has("primitives")) {
                    JsonArray primitives = mesh.getAsJsonArray("primitives");
                    for (int j = 0; j < primitives.size(); j++) {
                        JsonObject primitive = primitives.get(j).getAsJsonObject();
                        if (primitive.has("attributes")) {
                            JsonObject attributes = primitive.getAsJsonObject("attributes");
                            if (attributes.has("POSITION")) {
                                int posAccessorIdx = attributes.get("POSITION").getAsInt();
                                int vertexCount = getAccessorCount(json, posAccessorIdx);
                                model.vertexCount += vertexCount;
                            }
                        }
                        if (primitive.has("indices")) {
                            int indicesAccessorIdx = primitive.get("indices").getAsInt();
                            int indexCount = getAccessorCount(json, indicesAccessorIdx);
                            model.faceCount += indexCount / 3;
                        }
                    }
                }
            }
        }
        
        if (json.has("materials")) {
            model.materialCount = json.getAsJsonArray("materials").size();
        }
        
        model.bounds[0] = -1.0f;
        model.bounds[1] = -1.0f;
        model.bounds[2] = -1.0f;
        model.bounds[3] = 1.0f;
        model.bounds[4] = 1.0f;
        model.bounds[5] = 1.0f;
    }
    
    /**
     * Phase 2B: Load glTF Binary model
     */
    private static void loadGlbModel(File file, Model model) throws Exception {
        byte[] data = java.nio.file.Files.readAllBytes(file.toPath());
        
        if (data.length < 28) {
            throw new Exception("Invalid GLB file: too small");
        }
        
        // GLB Header structure:
        // Bytes 0-3: Magic (0x46546c67 = "glTF")
        // Bytes 4-7: Version (2)
        // Bytes 8-11: Total file size
        // Bytes 12-15: Chunk 0 length
        // Bytes 16-19: Chunk 0 type (0x4E4F534A = "JSON")
        // Bytes 20+: JSON chunk data
        
        int magic = bytesToInt(data, 0);
        int version = bytesToInt(data, 4);
        int totalLength = bytesToInt(data, 8);
        int chunkLength = bytesToInt(data, 12);
        int chunkType = bytesToInt(data, 16);
        
        System.out.println("GLB: magic=0x" + Integer.toHexString(magic) + 
                         ", version=" + version + 
                         ", chunkLen=" + chunkLength + 
                         ", type=0x" + Integer.toHexString(chunkType));
        
        // Verify GLB magic number
        if (magic != 0x46546c67) {
            throw new Exception("Invalid GLB file: wrong magic number");
        }
        
        if (version != 2) {
            throw new Exception("Unsupported GLB version: " + version);
        }
        
        // Extract JSON from chunk (starts at byte 20)
        if (chunkLength <= 0 || chunkLength > data.length - 20) {
            throw new Exception("Invalid GLB chunk length: " + chunkLength);
        }
        
        String jsonContent = new String(data, 20, chunkLength).trim();
        
        // Remove null terminators
        jsonContent = jsonContent.replaceAll("\0+$", "");
        
        System.out.println("JSON chunk size: " + jsonContent.length());
        
        JsonObject json = JsonParser.parseString(jsonContent).getAsJsonObject();
        
        if (json.has("meshes")) {
            JsonArray meshes = json.getAsJsonArray("meshes");
            model.meshCount = meshes.size();
            
            for (int i = 0; i < meshes.size(); i++) {
                JsonObject mesh = meshes.get(i).getAsJsonObject();
                if (mesh.has("primitives")) {
                    JsonArray primitives = mesh.getAsJsonArray("primitives");
                    for (int j = 0; j < primitives.size(); j++) {
                        JsonObject primitive = primitives.get(j).getAsJsonObject();
                        if (primitive.has("attributes")) {
                            JsonObject attributes = primitive.getAsJsonObject("attributes");
                            if (attributes.has("POSITION")) {
                                int posAccessorIdx = attributes.get("POSITION").getAsInt();
                                model.vertexCount += getAccessorCount(json, posAccessorIdx);
                            }
                        }
                        if (primitive.has("indices")) {
                            int indicesAccessorIdx = primitive.get("indices").getAsInt();
                            int indexCount = getAccessorCount(json, indicesAccessorIdx);
                            model.faceCount += indexCount / 3;
                        }
                    }
                }
            }
        }
        
        if (json.has("materials")) {
            model.materialCount = json.getAsJsonArray("materials").size();
        }
        
        model.bounds[0] = -1.0f;
        model.bounds[1] = -1.0f;
        model.bounds[2] = -1.0f;
        model.bounds[3] = 1.0f;
        model.bounds[4] = 1.0f;
        model.bounds[5] = 1.0f;
    }
    
    /**
     * Phase 2B: Load preview for unsupported formats
     */
    private static void loadPreviewModel(File file, Model model) {
        try {
            String extension = getExtension(file).toLowerCase();
            
            if (extension.equals("obj")) {
                loadObjModel(file, model);
            } else {
                // Generic preview
                model.meshCount = 1;
                model.vertexCount = 0;
                model.faceCount = 0;
                model.materialCount = 1;
                System.out.println("Preview mode for format: " + extension);
            }
        } catch (Exception e) {
            System.err.println("Error in preview mode: " + e.getMessage());
            model.meshCount = 0;
            model.vertexCount = 0;
            model.faceCount = 0;
            model.materialCount = 0;
        }
        
        model.bounds[0] = -1.0f;
        model.bounds[1] = -1.0f;
        model.bounds[2] = -1.0f;
        model.bounds[3] = 1.0f;
        model.bounds[4] = 1.0f;
        model.bounds[5] = 1.0f;
    }
    
    /**
     * Load basic OBJ file (Wavefront format)
     */
    private static void loadObjModel(File file, Model model) throws Exception {
        java.util.List<String> lines = java.nio.file.Files.readAllLines(file.toPath());
        
        int vertexCount = 0;
        int faceCount = 0;
        int materialCount = 0;
        boolean hasMaterials = false;
        
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty() || line.startsWith("#")) continue;
            
            if (line.startsWith("v ")) {
                vertexCount++;
            } else if (line.startsWith("f ")) {
                faceCount++;
            } else if (line.startsWith("mtllib ")) {
                hasMaterials = true;
                materialCount++;
            } else if (line.startsWith("usemtl ")) {
                if (!hasMaterials) materialCount++;
                hasMaterials = true;
            }
        }
        
        model.meshCount = 1;
        model.vertexCount = vertexCount;
        model.faceCount = faceCount;
        model.materialCount = Math.max(1, materialCount);
        
        System.out.println("OBJ loaded: " + vertexCount + " vertices, " + faceCount + " faces");
    }
    
    /**
     * Helper: Get accessor count from glTF JSON
     */
    private static int getAccessorCount(JsonObject json, int accessorIdx) {
        try {
            JsonArray accessors = json.getAsJsonArray("accessors");
            if (accessorIdx >= 0 && accessorIdx < accessors.size()) {
                JsonObject accessor = accessors.get(accessorIdx).getAsJsonObject();
                return accessor.get("count").getAsInt();
            }
        } catch (Exception e) {
            System.err.println("Error getting accessor count: " + e.getMessage());
        }
        return 0;
    }
    
    /**
     * Helper: Convert 4 bytes to int (little-endian)
     */
    private static int bytesToInt(byte[] data, int offset) {
        return (data[offset] & 0xFF) |
               ((data[offset + 1] & 0xFF) << 8) |
               ((data[offset + 2] & 0xFF) << 16) |
               ((data[offset + 3] & 0xFF) << 24);
    }

    /**
     * Get file format from filename
     */
    public static String getFormat(String filename) {
        filename = filename.toLowerCase();
        
        if (filename.endsWith(".glb")) return "glTF Binary";
        if (filename.endsWith(".gltf")) return "glTF Text";
        if (filename.endsWith(".obj")) return "Wavefront OBJ (preview)";
        if (filename.endsWith(".fbx")) return "Autodesk FBX (preview)";
        if (filename.endsWith(".dae")) return "COLLADA (preview)";
        if (filename.endsWith(".stl")) return "STL (preview)";
        if (filename.endsWith(".ply")) return "PLY (preview)";
        if (filename.endsWith(".3ds")) return "3DS (preview)";
        if (filename.endsWith(".blend")) return "Blender (preview)";
        
        return null;
    }

    /**
     * Check if file format is supported
     */
    public static boolean isSupportedFormat(File file) {
        return getFormat(file.getName()) != null;
    }

    /**
     * List all supported file extensions
     */
    public static List<String> getSupportedExtensions() {
        List<String> extensions = new ArrayList<>();
        extensions.add("*.glb");
        extensions.add("*.gltf");
        extensions.add("*.obj");
        extensions.add("*.fbx");
        extensions.add("*.dae");
        extensions.add("*.stl");
        extensions.add("*.ply");
        extensions.add("*.3ds");
        extensions.add("*.blend");
        return extensions;
    }

    /**
     * Get file extension
     */
    public static String getExtension(File file) {
        String name = file.getName();
        int lastDot = name.lastIndexOf('.');
        if (lastDot > 0) {
            return name.substring(lastDot + 1).toLowerCase();
        }
        return "";
    }
}
