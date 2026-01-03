@echo off
REM Orb RPG Game Launcher - Starts local server and opens the game automatically

setlocal enabledelayedexpansion

REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Verify we're in the right directory by checking for index.html
if not exist "index.html" (
    echo ERROR: index.html not found in current directory!
    echo Current directory: %cd%
    echo.
    echo Make sure start-game.bat is in the same folder as index.html
    pause
    exit /b 1
)

echo Orb RPG Game Launcher
echo =====================
echo Current directory: %cd%
echo.

REM Try Python first (most likely installed)
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python found. Starting server on http://localhost:8000
    echo.
    echo Opening browser in 4 seconds...
    start /b python -m http.server 8000
    timeout /t 4 /nobreak >nul
    start http://localhost:8000
    echo.
    echo Server is running. Close this window to stop the server.
    echo Press Ctrl+C to stop the server.
    python -m http.server 8000
    exit /b
)

REM Fallback to Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js found. Starting server on http://localhost:8000
    echo.
    echo Opening browser in 4 seconds...
    timeout /t 4 /nobreak >nul
    start http://localhost:8000
    npx http-server -p 8000 -c-1
    exit /b
)

REM No server found, open file directly
echo.
echo WARNING: Python and Node.js not found.
echo Opening game offline (some features may not work)...
timeout /t 2 /nobreak >nul
start "" "%cd%\index.html"
pause

