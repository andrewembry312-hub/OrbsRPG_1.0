package com.orbrpg.util;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.prefs.Preferences;

/**
 * Utility class for file operations and asset management
 */
public class FileUtils {
    private static final Preferences prefs = Preferences.userNodeForPackage(FileUtils.class);
    private static final String LAST_MODEL_PATH = "lastModelPath";
    private static final String LAST_EXPORT_PATH = "lastExportPath";

    /**
     * Get the default assets directory relative to workspace
     */
    public static File getAssetsDirectory() {
        String userHome = System.getProperty("user.home");
        Path assetsPath = Paths.get(userHome, "Downloads", "orb-rpg-modular", "OrbsRPG", "orb-rpg", "assets", "3d assets");
        return assetsPath.toFile();
    }

    /**
     * Get the character assets subdirectory
     */
    public static File getCharacterAssetsDirectory() {
        File assetsDir = getAssetsDirectory();
        return new File(assetsDir, "chars");
    }

    /**
     * Check if file is a valid 3D model format
     */
    public static boolean isValidModelFormat(File file) {
        if (!file.exists() || !file.isFile()) {
            return false;
        }
        String name = file.getName().toLowerCase();
        return name.endsWith(".glb") || name.endsWith(".gltf") || name.endsWith(".obj") || name.endsWith(".fbx");
    }

    /**
     * Get the file size in human-readable format
     */
    public static String getHumanReadableFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.2f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }

    /**
     * Save the last opened model path
     */
    public static void saveLastModelPath(File file) {
        if (file != null) {
            prefs.put(LAST_MODEL_PATH, file.getAbsolutePath());
        }
    }

    /**
     * Get the last opened model path
     */
    public static File getLastModelPath() {
        String path = prefs.get(LAST_MODEL_PATH, null);
        if (path != null) {
            File file = new File(path);
            if (file.exists()) {
                return file;
            }
        }
        return getCharacterAssetsDirectory();
    }

    /**
     * Save the last export path
     */
    public static void saveLastExportPath(File file) {
        if (file != null) {
            prefs.put(LAST_EXPORT_PATH, file.getAbsolutePath());
        }
    }

    /**
     * Get the last export path
     */
    public static File getLastExportPath() {
        String path = prefs.get(LAST_EXPORT_PATH, null);
        if (path != null) {
            File file = new File(path);
            if (file.exists() && file.isDirectory()) {
                return file;
            }
        }
        return getCharacterAssetsDirectory();
    }

    /**
     * List all valid 3D model files in a directory
     */
    public static List<File> listModelFiles(File directory) {
        List<File> models = new ArrayList<>();
        if (directory.exists() && directory.isDirectory()) {
            File[] files = directory.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (isValidModelFormat(file)) {
                        models.add(file);
                    }
                }
            }
        }
        return models;
    }

    /**
     * Get file metadata (size, extension, creation time)
     */
    public static FileMetadata getFileMetadata(File file) {
        try {
            Path path = file.toPath();
            long size = Files.size(path);
            String extension = getFileExtension(file);
            long lastModified = file.lastModified();
            
            return new FileMetadata(file.getName(), size, extension, lastModified);
        } catch (Exception e) {
            return new FileMetadata(file.getName(), 0, "", 0);
        }
    }

    /**
     * Get file extension without dot
     */
    public static String getFileExtension(File file) {
        String name = file.getName();
        int lastDot = name.lastIndexOf('.');
        if (lastDot > 0) {
            return name.substring(lastDot + 1).toLowerCase();
        }
        return "";
    }

    /**
     * Create directory if it doesn't exist
     */
    public static boolean ensureDirectoryExists(File directory) {
        if (!directory.exists()) {
            return directory.mkdirs();
        }
        return true;
    }

    /**
     * File metadata class
     */
    public static class FileMetadata {
        public final String name;
        public final long size;
        public final String extension;
        public final long lastModified;

        public FileMetadata(String name, long size, String extension, long lastModified) {
            this.name = name;
            this.size = size;
            this.extension = extension;
            this.lastModified = lastModified;
        }

        @Override
        public String toString() {
            return String.format("%s (%s, %s)", name, extension.toUpperCase(), 
                    FileUtils.getHumanReadableFileSize(size));
        }
    }
}
