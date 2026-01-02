package com.orbrpg;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.stage.Stage;
import com.orbrpg.ui.MainWindow;

/**
 * Main entry point for OrbRPG 3D Editor
 * 
 * A standalone 3D object viewer and editor for creating and testing
 * 3D assets for the OrbRPG game project.
 * 
 * Design Intent:
 * - Independent from web-based game environment
 * - Rapid iteration and testing of 3D models
 * - Export to glTF/GLB format for use in Three.js
 * - Match OrbRPG's dark fantasy UI aesthetic
 */
public class Main extends Application {

    @Override
    public void start(Stage primaryStage) throws Exception {
        MainWindow mainWindow = new MainWindow();
        Scene scene = mainWindow.createScene();
        
        primaryStage.setTitle("OrbRPG 3D Editor - Model Viewer & Creator");
        primaryStage.setScene(scene);
        
        // Ensure minimum window size
        primaryStage.setMinWidth(800);
        primaryStage.setMinHeight(600);
        
        // Maximize window to fit screen (respects taskbar automatically)
        primaryStage.setMaximized(true);
        
        primaryStage.setOnCloseRequest(e -> mainWindow.shutdown());
        primaryStage.show();
        
        // Get actual dimensions after maximizing
        javafx.geometry.Rectangle2D screenBounds = javafx.stage.Screen.getPrimary().getVisualBounds();
        
        System.out.println("OrbRPG 3D Editor Started");
        System.out.println("Window: " + primaryStage.getWidth() + "x" + primaryStage.getHeight());
        System.out.println("Screen: " + screenBounds.getWidth() + "x" + screenBounds.getHeight());
        
        // Auto-load test model if it exists
        java.io.File testModel = new java.io.File(System.getProperty("user.dir"), "Warrior Test.glb");
        if (!testModel.exists()) {
            testModel = new java.io.File("C:/Users/Home/Downloads/orb-rpg-modular/OrbsRPG/orb-rpg/assets/3d assets/Warrior Test.glb");
        }
        if (testModel.exists()) {
            System.out.println("Auto-loading test model: " + testModel.getAbsolutePath());
            try {
                mainWindow.loadModelAuto(testModel);
            } catch (Exception e) {
                System.err.println("Failed to auto-load test model: " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            System.out.println("Test model not found at: " + testModel.getAbsolutePath());
        }
    }

    public static void main(String[] args) {
        launch(args);
    }
}
