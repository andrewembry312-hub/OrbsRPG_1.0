#!/usr/bin/env pwsh

$JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot"
$MAVEN_HOME = "C:\Tools\apache-maven-3.9.5"
$M2_REPO = "$env:USERPROFILE\.m2\repository"

# Build classpath with all dependencies
$CLASSPATH = "target\classes"

# Add all JAR files from target/classes if they exist
$jars = @(
    "$M2_REPO\org\openjfx\javafx-controls\21.0.1\javafx-controls-21.0.1.jar",
    "$M2_REPO\org\openjfx\javafx-controls\21.0.1\javafx-controls-21.0.1-win.jar",
    "$M2_REPO\org\openjfx\javafx-graphics\21.0.1\javafx-graphics-21.0.1.jar",
    "$M2_REPO\org\openjfx\javafx-graphics\21.0.1\javafx-graphics-21.0.1-win.jar",
    "$M2_REPO\org\openjfx\javafx-base\21.0.1\javafx-base-21.0.1.jar",
    "$M2_REPO\org\openjfx\javafx-fxml\21.0.1\javafx-fxml-21.0.1.jar",
    "$M2_REPO\org\openjfx\javafx-fxml\21.0.1\javafx-fxml-21.0.1-win.jar",
    "$M2_REPO\org\openjfx\javafx-media\21.0.1\javafx-media-21.0.1.jar",
    "$M2_REPO\org\openjfx\javafx-media\21.0.1\javafx-media-21.0.1-win.jar",
    "$M2_REPO\org\openjfx\javafx-web\21.0.1\javafx-web-21.0.1.jar",
    "$M2_REPO\org\openjfx\javafx-web\21.0.1\javafx-web-21.0.1-win.jar",
    "$M2_REPO\com\google\code\gson\gson\2.10.1\gson-2.10.1.jar",
    "$M2_REPO\org\slf4j\slf4j-api\2.0.5\slf4j-api-2.0.5.jar",
    "$M2_REPO\org\slf4j\slf4j-simple\2.0.5\slf4j-simple-2.0.5.jar"
)

foreach ($jar in $jars) {
    if (Test-Path $jar) {
        $CLASSPATH += ";$jar"
    }
}

# Run the application
Write-Host "OrbRPG 3D Editor - Phase 2B/2C (glTF Loading + Camera Controls)"
Write-Host "================================================================"

& "$JAVA_HOME\bin\java" `
    -cp $CLASSPATH `
    -Djava.library.path="." `
    com.orbrpg.Main
