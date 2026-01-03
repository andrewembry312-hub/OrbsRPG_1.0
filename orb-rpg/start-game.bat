@echo off
REM Orb RPG Game Launcher - Starts local server and opens the game automatically

setlocal enabledelayedexpansion

REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Kill any existing servers on port 8000
echo Checking for existing servers on port 8000...
netstat -aon | findstr ":8000.*LISTENING" > nul 2>&1
if %errorlevel% equ 0 (
    echo Stopping existing server...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000.*LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 1 /nobreak >nul
)

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
    echo Opening browser in 3 seconds...
    start /b python -m http.server 8000
    timeout /t 3 /nobreak >nul
    REM Add timestamp to force reload
    start http://localhost:8000?t=%time::=-%
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
    echo Opening browser in 3 seconds...
    timeout /t 3 /nobreak >nul
    REM Add timestamp to force reload
    start http://localhost:8000?t=%time::=-%
    npx http-server -p 8000 -c-1 --no-cache
    exit /b
)

REM No server found, open file directly
echo.
echo WARNING: Python and Node.js not found.
echo Opening game offline (some features may not work)...
timeout /t 2 /nobreak >nul
start "" "%cd%\index.html"
pause

