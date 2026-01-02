@echo off
cd /d "%~dp0"
echo Starting 3D Viewer...
echo.
node server.js
if errorlevel 1 (
    echo.
    echo ERROR: Node.js server failed
    echo Make sure Node.js is installed: https://nodejs.org
    echo.
    pause
)
