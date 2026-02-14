@echo off
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

python -m PyInstaller --onefile --windowed --name "Job Tracker" --add-data "tracker.py;." gui.py

if errorlevel 1 (
    echo.
    echo ERROR: Build failed. Check the output above for details.
    echo.
    pause
    exit /b 1
)

copy "template\job_tracker.csv" "dist\job_tracker.csv" >nul 2>&1

echo.
echo Build succeeded! Output: dist\Job Tracker.exe
pause
