@echo off
setlocal enabledelayedexpansion

REM Clean
rmdir /s /q target\classes 2>nul
mkdir target\classes

REM Compile
echo Compiling...
javac -d target/classes ^
  -cp "C:/Users/Home/.m2/repository/org/openjfx/javafx-controls/21.0.1/javafx-controls-21.0.1.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-graphics/21.0.1/javafx-graphics-21.0.1.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-base/21.0.1/javafx-base-21.0.1.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-fxml/21.0.1/javafx-fxml-21.0.1.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-web/21.0.1/javafx-web-21.0.1.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-media/21.0.1/javafx-media-21.0.1.jar" ^
  src\main\java\com\orbrpg\*.java ^
  src\main\java\com\orbrpg\scene\*.java ^
  src\main\java\com\orbrpg\ui\*.java ^
  src\main\java\com\orbrpg\util\*.java

if %ERRORLEVEL% NEQ 0 (
    echo Compilation failed!
    pause
    exit /b 1
)

echo Compilation successful! Running...
timeout /t 1 >nul

REM Run
java --module-path "C:/Users/Home/.m2/repository/org/openjfx/javafx-controls/21.0.1/javafx-controls-21.0.1-win.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-graphics/21.0.1/javafx-graphics-21.0.1-win.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-base/21.0.1/javafx-base-21.0.1-win.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-fxml/21.0.1/javafx-fxml-21.0.1-win.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-web/21.0.1/javafx-web-21.0.1-win.jar;C:/Users/Home/.m2/repository/org/openjfx/javafx-media/21.0.1/javafx-media-21.0.1-win.jar" ^
  --add-modules javafx.controls,javafx.fxml,javafx.graphics,javafx.web,javafx.media ^
  -cp target\classes com.orbrpg.Main
