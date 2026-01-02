package com.orbrpg.ui;

import javafx.geometry.Insets;
import javafx.scene.control.*;
import javafx.scene.layout.VBox;
import com.orbrpg.scene.Scene3D;

/**
 * Left side properties panel for model and scene properties
 */
public class PropertyPanel {
    private VBox pane;
    private Scene3D scene3d;
    private Slider lightingSlider;
    private Slider rotationSpeedSlider;
    private CheckBox showGridCheckBox;
    private CheckBox showLightsCheckBox;

    public PropertyPanel(Scene3D scene3d) {
        this.scene3d = scene3d;
        this.pane = new VBox(10);
        this.pane.setPadding(new Insets(15));
        this.pane.setStyle("-fx-background-color: #111; -fx-border-color: #333; -fx-text-fill: #fff;");
        this.pane.setPrefWidth(200);

        setupControls();
    }

    private void setupControls() {
        Label titleLabel = new Label("Properties");
        titleLabel.setStyle("-fx-font-size: 14; -fx-font-weight: bold; -fx-text-fill: #d4af37;");

        // Lighting control
        Label lightingLabel = new Label("Lighting Intensity:");
        lightingLabel.setStyle("-fx-text-fill: #aaa; -fx-font-size: 11;");
        lightingSlider = new Slider(0, 1.0, 0.7);
        lightingSlider.setStyle("-fx-control-inner-background: #333;");

        // Rotation speed
        Label rotationLabel = new Label("Rotation Speed:");
        rotationLabel.setStyle("-fx-text-fill: #aaa; -fx-font-size: 11;");
        rotationSpeedSlider = new Slider(0, 2.0, 1.0);
        rotationSpeedSlider.setStyle("-fx-control-inner-background: #333;");

        // Checkboxes
        showGridCheckBox = new CheckBox("Show Grid");
        showGridCheckBox.setSelected(true);
        showGridCheckBox.setStyle("-fx-text-fill: #aaa;");

        showLightsCheckBox = new CheckBox("Show Lights");
        showLightsCheckBox.setSelected(true);
        showLightsCheckBox.setStyle("-fx-text-fill: #aaa;");

        // Separator
        Separator separator = new Separator();
        separator.setStyle("-fx-text-fill: #333;");

        // Reset button
        Button resetButton = new Button("Reset All");
        resetButton.setStyle("-fx-padding: 8; -fx-font-size: 11; -fx-background-color: #d4af37; -fx-text-fill: #000;");
        resetButton.setOnAction(e -> resetProperties());

        pane.getChildren().addAll(
            titleLabel,
            new Separator(),
            lightingLabel,
            lightingSlider,
            rotationLabel,
            rotationSpeedSlider,
            separator,
            showGridCheckBox,
            showLightsCheckBox,
            new Separator(),
            resetButton
        );
    }

    private void resetProperties() {
        lightingSlider.setValue(0.7);
        rotationSpeedSlider.setValue(1.0);
        showGridCheckBox.setSelected(true);
        showLightsCheckBox.setSelected(true);
    }

    public VBox getPane() {
        return pane;
    }

    public double getLightingIntensity() {
        return lightingSlider.getValue();
    }

    public double getRotationSpeed() {
        return rotationSpeedSlider.getValue();
    }

    public boolean isGridShown() {
        return showGridCheckBox.isSelected();
    }

    public boolean areLightsShown() {
        return showLightsCheckBox.isSelected();
    }
}
