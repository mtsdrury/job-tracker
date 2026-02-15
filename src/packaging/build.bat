@echo off
cd /d "%~dp0\..\.."
echo Building Job Tracker...
echo.

python -m PyInstaller --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PyInstaller is not installed.
    echo Install it with: pip install pyinstaller
    echo.
    pause
    exit /b 1
)

python -m PyInstaller --onefile --windowed --name "Job Tracker" --add-data "src\tracker.py;." --add-data "src\gui;gui" src\gui.py

if errorlevel 1 (
    echo.
    echo ERROR: Build failed. Check the output above for details.
    echo.
    pause
    exit /b 1
)

copy "dist\Job Tracker.exe" "Job Tracker.exe" >nul 2>&1

echo.
echo Build succeeded! Output: Job Tracker.exe (also in dist\)
pause
