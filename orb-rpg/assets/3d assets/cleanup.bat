@echo off
REM Cleanup script - removes failed 3D viewer attempts
REM Keeps only: start.bat, server.js, offline-viewer.html, Warrior Test.glb

cd /d "%~dp0"

echo.
echo ================================================
echo  Cleanup: Removing failed viewer attempts
echo ================================================
echo.

setlocal enabledelayedexpansion

set /a count=0

REM List of files to delete
set files[1]=viewer-server.bat
set files[2]=viewer.bat
set files[3]=run-server.bat
set files[4]=start-viewer.bat
set files[5]=start-preview-server.bat
set files[6]=start-server-java.bat
set files[7]=start-http-server.bat
set files[8]=start-viewer.ps1
set files[9]=viewer.html
set files[10]=viewer-new.html
set files[11]=viewer-simple.html
set files[12]=babylon-viewer.html
set files[13]=simple-viewer.html
set files[14]=preview.html
set files[15]=index.html

echo Files to delete:
echo.

for /l %%i in (1,1,15) do (
    if defined files[%%i] (
        echo  [%%i] !files[%%i]!
        if exist "!files[%%i]!" (
            del /q "!files[%%i]!" 2>nul
            echo      ✓ Deleted
        ) else (
            echo      - Not found
        )
    )
)

echo.
echo ================================================
echo  Cleanup complete!
echo ================================================
echo.
echo Remaining files in this directory:
dir /b *.bat *.js *.html *.glb 2>nul
echo.
echo Ready to use: start.bat
echo.
pause
