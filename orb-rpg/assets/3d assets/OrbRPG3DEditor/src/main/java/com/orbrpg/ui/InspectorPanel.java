package com.orbrpg.ui;

import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.VBox;

/**
 * Right side inspector panel showing model information and statistics
 */
public class InspectorPanel {
    private VBox pane;
    private Label modelNameLabel;
    private Label modelSizeLabel;
    private TextArea modelInfoArea;

    public InspectorPanel() {
        this.pane = new VBox(10);
        this.pane.setPadding(new Insets(15));
        this.pane.setStyle("-fx-background-color: #111; -fx-border-color: #333; -fx-text-fill: #fff;");
        this.pane.setPrefWidth(250);

        setupControls();
    }

    private void setupControls() {
        Label titleLabel = new Label("Inspector");
        titleLabel.setStyle("-fx-font-size: 14; -fx-font-weight: bold; -fx-text-fill: #d4af37;");

        Label modelLabel = new Label("Loaded Model:");
        modelLabel.setStyle("-fx-text-fill: #aaa; -fx-font-size: 11;");

        modelNameLabel = new Label("None");
        modelNameLabel.setStyle("-fx-text-fill: #fff; -fx-font-size: 12;");

        Label sizeLabel = new Label("File Size:");
        sizeLabel.setStyle("-fx-text-fill: #aaa; -fx-font-size: 11;");

        modelSizeLabel = new Label("0 KB");
        modelSizeLabel.setStyle("-fx-text-fill: #fff; -fx-font-size: 12;");

        Separator separator = new Separator();
        separator.setStyle("-fx-text-fill: #333;");

        Label infoLabel = new Label("Model Information:");
        infoLabel.setStyle("-fx-text-fill: #aaa; -fx-font-size: 11;");

        modelInfoArea = new TextArea();
        modelInfoArea.setEditable(false);
        modelInfoArea.setWrapText(true);
        modelInfoArea.setStyle("-fx-control-inner-background: #1a1a1a; -fx-text-fill: #aaa; -fx-font-family: monospace; -fx-font-size: 10;");
        modelInfoArea.setPrefRowCount(10);
        modelInfoArea.setText("No model loaded\n\nLoad a model using:\nFile > Open Model");

        // Export button
        Button exportButton = new Button("Export Model");
        exportButton.setStyle("-fx-padding: 8; -fx-font-size: 11; -fx-background-color: #d4af37; -fx-text-fill: #000;");
        exportButton.setOnAction(e -> handleExport());

        pane.getChildren().addAll(
            titleLabel,
            new Separator(),
            modelLabel,
            modelNameLabel,
            sizeLabel,
            modelSizeLabel,
            separator,
            infoLabel,
            modelInfoArea,
            new Separator(),
            exportButton
        );
    }

    private void handleExport() {
        System.out.println("Export functionality coming in Phase 2");
    }

    public void setModelInfo(String name, long sizeBytes) {
        modelNameLabel.setText(name);
        
        String sizeDisplay;
        if (sizeBytes < 1024) {
            sizeDisplay = sizeBytes + " B";
        } else if (sizeBytes < 1024 * 1024) {
            sizeDisplay = String.format("%.2f KB", sizeBytes / 1024.0);
        } else {
            sizeDisplay = String.format("%.2f MB", sizeBytes / (1024.0 * 1024.0));
        }
        modelSizeLabel.setText(sizeDisplay);

        // Update info
        String info = "Model: " + name + "\n" +
                     "Size: " + sizeDisplay + "\n" +
                     "Format: " + getFormat(name) + "\n" +
                     "Status: Loaded\n\n" +
                     "Tips:\n" +
                     "- Use properties panel to adjust view\n" +
                     "- Press R to reset view\n" +
                     "- Space to toggle rotation";
        modelInfoArea.setText(info);
    }

    private String getFormat(String filename) {
        if (filename.endsWith(".glb")) return "glTF Binary (.glb)";
        if (filename.endsWith(".gltf")) return "glTF Text (.gltf)";
        return "Unknown";
    }

    public VBox getPane() {
        return pane;
    }
}
