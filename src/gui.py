#!/usr/bin/env python3
"""
job-tracker GUI - A ttkbootstrap-powered interface for the job search tracker.

Stays open while you apply to jobs. Lets you quickly view, edit, and filter
your applications without opening the CSV directly.

Requires: pip install ttkbootstrap
Usage:    python gui.py   (or python.exe gui.py on WSL)
"""

import os
import sys

try:
    import ttkbootstrap as ttk
except ImportError:
    print("ttkbootstrap is required. Install it with:")
    print("  pip install ttkbootstrap")
    sys.exit(1)

from gui import TrackerApp
from gui.constants import THEME


def main():
    root = ttk.Window(
        title="Job Tracker",
        themename=THEME,
        size=(960, 700),
        minsize=(800, 550),
    )
    app = TrackerApp(root)

    if getattr(sys, 'frozen', False):
        script_dir = os.path.dirname(sys.executable)
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
    default_csv = os.path.join(script_dir, "job_tracker.csv")
    parent_csv = os.path.normpath(os.path.join(script_dir, "..", "job_tracker.csv"))
    # Check parent directory first (handles running from dist/)
    if os.path.exists(parent_csv):
        app._load_file(parent_csv)
    elif os.path.exists(default_csv):
        app._load_file(default_csv)

    root.mainloop()


if __name__ == "__main__":
    main()
