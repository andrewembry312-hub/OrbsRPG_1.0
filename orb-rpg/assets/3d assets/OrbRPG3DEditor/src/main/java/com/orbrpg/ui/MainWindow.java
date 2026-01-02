package com.orbrpg.ui;

import javafx.geometry.Insets;
import javafx.geometry.Orientation;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.VBox;
import javafx.stage.FileChooser;
import javafx.stage.Stage;
import com.orbrpg.scene.Scene3D;

import java.io.File;

/**
 * Main window for OrbRPG 3D Editor
 * 
 * Layout:
 * - Top: Menu bar with File, View, Help
 * - Left: Properties panel
 * - Center: 3D viewport
 * - Right: Inspector panel
 * - Bottom: Status bar
 * 
 * Color Scheme (OrbRPG style):
 * Background: #1a1a1a
 * Panels: #111
 * Accent: #d4af37 (gold)
 * Text: #fff
 */
public class MainWindow {
    private BorderPane root;
    private Scene3D scene3d;
    private PropertyPanel propertyPanel;
    private InspectorPanel inspectorPanel;
    private ViewportPanel viewportPanel;
    private Label statusLabel;
    private Label diagnosticLabel;
    private Label errorCountLabel;
    private int errorCount = 0;

    public Scene createScene() {
        root = new BorderPane();
        root.setStyle("-fx-base: #1a1a1a; -fx-control-inner-background: #111; -fx-text-fill: #fff;");
        
        // Ensure root pane doesn't expand beyond window
        root.setMaxHeight(Double.MAX_VALUE);
        root.setMaxWidth(Double.MAX_VALUE);

        // Top: Menu bar
        root.setTop(createMenuBar());

        // Center: 3D Viewport
        viewportPanel = new ViewportPanel();
        scene3d = new Scene3D(viewportPanel.getCanvas(), viewportPanel);
        root.setCenter(viewportPanel.getPane());

        // Left: Properties panel
        propertyPanel = new PropertyPanel(scene3d);
        root.setLeft(propertyPanel.getPane());

        // Right: Inspector panel
        inspectorPanel = new InspectorPanel();
        root.setRight(inspectorPanel.getPane());

        // Bottom: Status bar
        root.setBottom(createStatusBar());

        return new Scene(root);
    }

    private MenuBar createMenuBar() {
        MenuBar menuBar = new MenuBar();
        menuBar.setStyle("-fx-base: #1a1a1a; -fx-text-fill: #d4af37;");

        // File menu
        Menu fileMenu = new Menu("File");
        MenuItem loadModel = new MenuItem("Open Model...");
        loadModel.setOnAction(e -> handleLoadModel());
        MenuItem export = new MenuItem("Export Model...");
        export.setOnAction(e -> handleExportModel());
        MenuItem exit = new MenuItem("Exit");
        exit.setOnAction(e -> System.exit(0));
        fileMenu.getItems().addAll(loadModel, new SeparatorMenuItem(), export, new SeparatorMenuItem(), exit);

        // View menu
        Menu viewMenu = new Menu("View");
        MenuItem resetView = new MenuItem("Reset View");
        resetView.setOnAction(e -> scene3d.resetView());
        MenuItem toggleRotation = new MenuItem("Toggle Auto-Rotation");
        toggleRotation.setOnAction(e -> scene3d.toggleAutoRotation());
        viewMenu.getItems().addAll(resetView, toggleRotation);

        // Help menu
        Menu helpMenu = new Menu("Help");
        MenuItem about = new MenuItem("About OrbRPG 3D Editor");
        about.setOnAction(e -> showAbout());
        MenuItem controls = new MenuItem("Controls");
        controls.setOnAction(e -> showControls());
        helpMenu.getItems().addAll(about, new SeparatorMenuItem(), controls);

        menuBar.getMenus().addAll(fileMenu, viewMenu, helpMenu);
        return menuBar;
    }

    private HBox createStatusBar() {
        HBox statusBar = new HBox(10);
        statusBar.setPadding(new Insets(8));
        statusBar.setStyle("-fx-background-color: #111; -fx-border-color: #333; -fx-border-width: 1 0 0 0;");

        statusLabel = new Label("Ready");
        statusLabel.setStyle("-fx-text-fill: #d4af37; -fx-font-size: 11;");
        
        errorCountLabel = new Label("Errors: 0");
        errorCountLabel.setStyle("-fx-text-fill: #ff6666; -fx-font-size: 11;");
        
        diagnosticLabel = new Label("WebView: Initializing | THREE.js: Loading | Grid: OK");
        diagnosticLabel.setStyle("-fx-text-fill: #888; -fx-font-size: 10;");
        HBox.setHgrow(diagnosticLabel, Priority.ALWAYS);

        Label versionLabel = new Label("OrbRPG 3D Editor v0.1.0");
        versionLabel.setStyle("-fx-text-fill: #666; -fx-font-size: 10;");

        statusBar.getChildren().addAll(statusLabel, new Separator(Orientation.VERTICAL), 
                                       errorCountLabel, new Separator(Orientation.VERTICAL),
                                       diagnosticLabel, new Separator(Orientation.VERTICAL),
                                       versionLabel);
        return statusBar;
    }

    private void handleLoadModel() {
        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Open 3D Model");
        fileChooser.getExtensionFilters().addAll(
            new FileChooser.ExtensionFilter("3D Models (*.glb, *.gltf)", "*.glb", "*.gltf"),
            new FileChooser.ExtensionFilter("All Files", "*.*")
        );
        
        File file = fileChooser.showOpenDialog(null);
        if (file != null) {
            try {
                scene3d.loadModel(file);
                inspectorPanel.setModelInfo(file.getName(), file.length());
                updateStatus("Loaded: " + file.getName());
                updateDiagnostics("Grid: OK | Model: Loaded | Meshes: " + scene3d.getMeshGroupCount());
            } catch (Exception ex) {
                updateStatus("Error loading model: " + ex.getMessage());
                incrementErrorCount();
                showError("Failed to load model", ex.getMessage());
                updateDiagnostics("Grid: OK | Model: FAILED | Error: " + ex.getMessage());
            }
        }
    }

    private void handleExportModel() {
        updateStatus("Export feature coming in Phase 2");
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Export");
        alert.setHeaderText("Export Model");
        alert.setContentText("Export functionality will be available in Phase 2 of development");
        alert.showAndWait();
    }

    private void showAbout() {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("About OrbRPG 3D Editor");
        alert.setHeaderText("OrbRPG 3D Editor v0.1.0");
        alert.setContentText("A standalone 3D object viewer and editor for OrbRPG game assets.\n\n" +
                "Primary Goal: Independent testing and creation of 3D models\n" +
                "Export Format: glTF/GLB compatible with Three.js\n" +
                "UI Theme: Dark fantasy aesthetic matching OrbRPG");
        alert.showAndWait();
    }

    private void showControls() {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Controls");
        alert.setHeaderText("Keyboard & Mouse Controls");
        alert.setContentText(
            "Mouse Controls:\n" +
            "  Left Drag: Rotate view\n" +
            "  Right Drag: Pan view\n" +
            "  Scroll: Zoom\n\n" +
            "Keyboard Shortcuts:\n" +
            "  R: Reset view\n" +
            "  Space: Toggle auto-rotation\n" +
            "  A: Toggle lighting\n" +
            "  L: Load model\n" +
            "  E: Export model\n" +
            "  H: Show help"
        );
        alert.showAndWait();
    }

    private void showError(String title, String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle(title);
        alert.setContentText(message);
        alert.showAndWait();
    }

    public void updateStatus(String message) {
        if (statusLabel != null) {
            statusLabel.setText(message);
        }
    }
    
    public void updateDiagnostics(String message) {
        if (diagnosticLabel != null) {
            diagnosticLabel.setText(message);
        }
    }
    
    public void incrementErrorCount() {
        errorCount++;
        if (errorCountLabel != null) {
            errorCountLabel.setText("Errors: " + errorCount);
        }
    }
    
    public void resetErrorCount() {
        errorCount = 0;
        if (errorCountLabel != null) {
            errorCountLabel.setText("Errors: 0");
        }
    }
    
    public void loadModelAuto(File file) throws Exception {
        scene3d.loadModel(file);
        inspectorPanel.setModelInfo(file.getName(), file.length());
        updateStatus("Loaded: " + file.getName());
        updateDiagnostics("Grid: OK | Model: Auto-loaded | Meshes: " + scene3d.getMeshGroupCount());
    }

    public void shutdown() {
        if (scene3d != null) {
            scene3d.cleanup();
        }
        System.out.println("OrbRPG 3D Editor Closed");
    }
}
