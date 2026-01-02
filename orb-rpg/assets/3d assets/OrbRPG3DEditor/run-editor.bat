@echo off
setlocal enabledelayedexpansion

set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot
set M2_REPO=%USERPROFILE%\.m2\repository
set MODULEPATH=!M2_REPO!\org\openjfx\javafx-controls\21.0.1
set MODULEPATH=!MODULEPATH!;!M2_REPO!\org\openjfx\javafx-graphics\21.0.1
set MODULEPATH=!MODULEPATH!;!M2_REPO!\org\openjfx\javafx-base\21.0.1
set MODULEPATH=!MODULEPATH!;!M2_REPO!\org\openjfx\javafx-fxml\21.0.1
set MODULEPATH=!MODULEPATH!;!M2_REPO!\org\openjfx\javafx-web\21.0.1
set MODULEPATH=!MODULEPATH!;!M2_REPO!\org\openjfx\javafx-media\21.0.1

set CLASSPATH=target\classes;!M2_REPO!\com\google\code\gson\gson\2.10.1\gson-2.10.1.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\eclipse\jetty\jetty-server\11.0.18\jetty-server-11.0.18.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\eclipse\jetty\jetty-http\11.0.18\jetty-http-11.0.18.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\eclipse\jetty\jetty-util\11.0.18\jetty-util-11.0.18.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\eclipse\jetty\jetty-io\11.0.18\jetty-io-11.0.18.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\eclipse\jetty\jetty-servlet\11.0.18\jetty-servlet-11.0.18.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\eclipse\jetty\jetty-servlets\11.0.18\jetty-servlets-11.0.18.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\eclipse\jetty\jetty-security\11.0.18\jetty-security-11.0.18.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\jakarta\servlet\jakarta.servlet-api\5.0.0\jakarta.servlet-api-5.0.0.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\slf4j\slf4j-api\2.0.5\slf4j-api-2.0.5.jar
set CLASSPATH=!CLASSPATH!;!M2_REPO!\org\slf4j\slf4j-simple\2.0.5\slf4j-simple-2.0.5.jar

echo OrbRPG 3D Editor - Phase 2B/2C
echo ===============================
echo Launching with glTF Loading and Camera Controls...
echo.

start "" /b /max "%JAVA_HOME%\bin\java" --module-path !MODULEPATH! --add-modules javafx.controls,javafx.fxml,javafx.graphics,javafx.web,javafx.media -cp !CLASSPATH! com.orbrpg.Main
