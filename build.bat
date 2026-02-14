@echo off
echo Building Job Tracker...
python -m PyInstaller --onefile --windowed --name "Job Tracker" --add-data "tracker.py;." gui.py
echo Done! Check dist\ for the executable.
pause
