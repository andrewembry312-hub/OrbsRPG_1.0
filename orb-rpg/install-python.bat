@echo off
REM Python 3.12 Installation Script for OrbRPG
REM This script downloads and installs Python with PATH configuration

setlocal enabledelayedexpansion

echo.
echo ======================================
echo Python 3.12 Installer for OrbRPG
echo ======================================
echo.

REM Check if Python already exists
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Python is already installed!
    python --version
    echo.
    echo Skipping installation.
    goto :http_server
)

REM Download Python installer
echo Downloading Python 3.12 installer...
echo (This may take 1-2 minutes)
echo.

cd %TEMP%
powershell -NoProfile -Command "& {(New-Object System.Net.ServicePointManager).SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe' -OutFile 'python-3.12.0-amd64.exe' -MaximumRedirection 3}" 2>nul

if not exist python-3.12.0-amd64.exe (
    echo.
    echo [ERROR] Failed to download Python installer
    echo Please manually install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo.
echo Starting Python installer...
echo Please check these options in the installer:
echo   ✓ [Add Python 3.12 to PATH]
echo   ✓ [Install pip]
echo   ✓ [Install tcl/tk]
echo.
echo Click "Install Now" or "Customize installation" then click Install
echo.
pause

REM Run installer
python-3.12.0-amd64.exe

REM Verify installation
echo.
echo Verifying Python installation...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Python installation failed or PATH not updated
    echo Please restart your terminal and try again
    pause
    exit /b 1
)

python --version
echo.
echo [SUCCESS] Python installed!
echo.

:http_server
REM Now set up HTTP server
echo.
echo ======================================
echo Setting up 3D Preview HTTP Server
echo ======================================
echo.

cd /d "c:\Users\Home\Downloads\orb-rpg-modular\OrbsRPG\orb-rpg\assets\3d assets"

echo.
echo Starting HTTP server on port 8080...
echo.
echo When you see "Serving HTTP on ...", open your browser to:
echo   http://localhost:8080/viewer-simple.html?model=Warrior%%20Test.glb
echo.
echo Press Ctrl+C to stop the server
echo.
pause

python -m http.server 8080 --directory "."

:end
pause
