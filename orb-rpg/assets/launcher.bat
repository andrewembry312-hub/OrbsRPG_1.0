@echo off
REM Navigate without using the full path with spaces
pushd "%~dp0"
cd ..
cd "3d assets"
cd OrbRPG3DEditor

echo Launching OrbRPG 3D Editor...
call run-editor.bat

popd
