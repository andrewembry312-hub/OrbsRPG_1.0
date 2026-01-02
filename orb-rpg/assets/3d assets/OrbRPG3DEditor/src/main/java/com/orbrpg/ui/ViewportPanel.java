package com.orbrpg.ui;

import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.layout.Priority;
import javafx.geometry.Pos;
import javafx.scene.canvas.Canvas;
import javafx.scene.control.SplitPane;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.awt.Desktop;
import java.net.URI;

/**
 * Central viewport for 3D model display
 * Split view: Left = Wireframe (JavaFX Canvas), Right = Browser Preview Button
 */
public class ViewportPanel {
    private SplitPane splitPane;
    private Canvas canvas;
    private File currentModelFile = null;
    private Label previewLabel;
    private Button previewButton;

    public ViewportPanel() {
        this.splitPane = new SplitPane();
        this.splitPane.setStyle("-fx-background-color: #1a1a1a; -fx-base: #1a1a1a;");
        this.splitPane.setDividerPositions(0.5);  // 50/50 split
        
        // Left: Canvas for wireframe
        StackPane leftPane = new StackPane();
        leftPane.setStyle("-fx-background-color: #1a1a1a;");
        this.canvas = new Canvas();  // No fixed size - will bind to parent
        this.canvas.setStyle("-fx-background-color: #1a1a1a;");
        leftPane.getChildren().add(canvas);
        // Keep canvas sized to pane so the grid centers correctly
        canvas.widthProperty().bind(leftPane.widthProperty());
        canvas.heightProperty().bind(leftPane.heightProperty());
        
        // Right: Preview controls
        VBox rightPane = new VBox(20);
        rightPane.setStyle("-fx-background-color: #1a1a1a; -fx-padding: 40px;");
        rightPane.setAlignment(Pos.CENTER);
        
        Label titleLabel = new Label("Browser Preview");
        titleLabel.setStyle("-fx-font-size: 18px; -fx-text-fill: #d4af37; -fx-font-weight: bold;");
        
        previewLabel = new Label("Load a model to preview");
        previewLabel.setStyle("-fx-font-size: 14px; -fx-text-fill: #888;");
        
        previewButton = new Button("Open in Browser");
        previewButton.setStyle("-fx-font-size: 16px; -fx-padding: 15px 30px; -fx-background-color: #d4af37; -fx-text-fill: #1a1a1a; -fx-font-weight: bold;");
        previewButton.setDisable(true);
        previewButton.setOnAction(e -> openBrowserPreview());
        
        Label infoLabel = new Label("Preview with full browser DevTools\nTests actual game rendering");
        infoLabel.setStyle("-fx-font-size: 12px; -fx-text-fill: #666; -fx-text-alignment: center;");
        
        rightPane.getChildren().addAll(titleLabel, previewLabel, previewButton, infoLabel);
        
        // Add to split pane
        this.splitPane.getItems().addAll(leftPane, rightPane);
    }

    private void openBrowserPreview() {
        if (currentModelFile == null) return;
        
        try {
            // Copy model to preview directory as temp file
            File previewDir = new File(".");
            File tempModel = new File(previewDir, "temp_preview_model.glb");
            Files.copy(currentModelFile.toPath(), tempModel.toPath(), StandardCopyOption.REPLACE_EXISTING);
            
            // Open preview.html in default browser
            File previewHtml = new File(previewDir, "preview.html");
            String url = previewHtml.toURI().toString() + "?model=temp_preview_model.glb";
            
            System.out.println("Opening browser preview: " + url);
            Desktop.getDesktop().browse(new URI(url));
            
        } catch (Exception e) {
            System.err.println("Failed to open browser preview: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public SplitPane getPane() {
        return splitPane;
    }

    public Canvas getCanvas() {
        return canvas;
    }
    
    public void loadModelInPreview(String filePath, String modelName, String format, int meshes, int materials) {
        try {
            currentModelFile = new File(filePath);
            
            // Update label and enable button
            previewLabel.setText(modelName + "\n" + meshes + " meshes, " + materials + " materials");
            previewButton.setDisable(false);
            
            System.out.println("✓ Model ready for browser preview: " + modelName);
            
        } catch (Exception e) {
            System.err.println("Failed to prepare preview: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
