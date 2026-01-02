@echo off
setlocal enabledelayedexpansion

set M2_REPO=%USERPROFILE%\.m2\repository
set MODULEPATH=%M2_REPO%\org\openjfx\javafx-controls\21.0.1
set MODULEPATH=%MODULEPATH%;%M2_REPO%\org\openjfx\javafx-graphics\21.0.1
set MODULEPATH=%MODULEPATH%;%M2_REPO%\org\openjfx\javafx-base\21.0.1
set MODULEPATH=%MODULEPATH%;%M2_REPO%\org\openjfx\javafx-fxml\21.0.1
set MODULEPATH=%MODULEPATH%;%M2_REPO%\org\openjfx\javafx-web\21.0.1

set CLASSPATH=%M2_REPO%\com\google\code\gson\gson\2.10.1\gson-2.10.1.jar
set CLASSPATH=%CLASSPATH%;%M2_REPO%\org\eclipse\jetty\jetty-server\11.0.18\jetty-server-11.0.18.jar
set CLASSPATH=%CLASSPATH%;%M2_REPO%\org\eclipse\jetty\jetty-http\11.0.18\jetty-http-11.0.18.jar
set CLASSPATH=%CLASSPATH%;%M2_REPO%\org\eclipse\jetty\jetty-util\11.0.18\jetty-util-11.0.18.jar
set CLASSPATH=%CLASSPATH%;%M2_REPO%\org\eclipse\jetty\jetty-io\11.0.18\jetty-io-11.0.18.jar
set CLASSPATH=%CLASSPATH%;%M2_REPO%\org\eclipse\jetty\jetty-servlet\11.0.18\jetty-servlet-11.0.18.jar
set CLASSPATH=%CLASSPATH%;%M2_REPO%\org\eclipse\jetty\jetty-servlets\11.0.18\jetty-servlets-11.0.18.jar
set CLASSPATH=%CLASSPATH%;%M2_REPO%\org\eclipse\jetty\jetty-security\11.0.18\jetty-security-11.0.18.jar
set CLASSPATH=%CLASSPATH%;%M2_REPO%\jakarta\servlet\jakarta.servlet-api\5.0.0\jakarta.servlet-api-5.0.0.jar

rmdir /s /q target 2>nul
mkdir target\classes

"C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot\bin\javac.exe" --module-path %MODULEPATH% --add-modules javafx.controls,javafx.fxml,javafx.graphics,javafx.web -cp %CLASSPATH% -d target/classes -sourcepath src/main/java src/main/java/com/orbrpg/Main.java src/main/java/com/orbrpg/scene/Scene3D.java src/main/java/com/orbrpg/ui/MainWindow.java src/main/java/com/orbrpg/ui/ViewportPanel.java src/main/java/com/orbrpg/ui/PropertyPanel.java src/main/java/com/orbrpg/ui/InspectorPanel.java src/main/java/com/orbrpg/util/ExportUtils.java src/main/java/com/orbrpg/util/FileUtils.java src/main/java/com/orbrpg/util/ModelLoader.java

echo Compilation complete!
