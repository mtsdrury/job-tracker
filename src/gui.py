#!/usr/bin/env python3
"""
job-tracker GUI - A ttkbootstrap-powered interface for the job search tracker.

Stays open while you apply to jobs. Lets you quickly view, edit, and filter
your applications without opening the CSV directly.

Requires: pip install ttkbootstrap
Usage:    python gui.py   (or python.exe gui.py on WSL)
"""

import csv
import json
import os
import sys

try:
    import ttkbootstrap as ttk
except ImportError:
    print("ttkbootstrap is required. Install it with:")
    print("  pip install ttkbootstrap")
    sys.exit(1)

from tkinter import filedialog, messagebox

from gui import TrackerApp
from gui.constants import THEME, CONFIG_FILENAME
from tracker import FIELDNAMES


def _ask_for_csv(root, default_csv):
    """No CSV found on startup. Ask the user to browse or create a new one."""
    choice = messagebox.askyesnocancel(
        "No tracker file found",
        "No job_tracker.csv was found in this folder.\n\n"
        "Would you like to browse for an existing CSV?\n\n"
        'Click "Yes" to browse, "No" to create a new blank tracker, '
        'or "Cancel" to exit.',
        parent=root,
    )
    if choice is None:
        # Cancel - exit the app
        root.destroy()
        sys.exit(0)
    if choice:
        # Yes - browse for existing CSV
        path = filedialog.askopenfilename(
            title="Select your job tracker CSV",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
            parent=root,
        )
        return (path, False) if path else (None, False)
    # No - create a new blank tracker
    with open(default_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
    return (default_csv, True)


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
    else:
        # No CSV found - ask the user what to do
        path, created = _ask_for_csv(root, default_csv)
        if path:
            if created:
                from gui.setup_wizard import SetupWizard
                wizard = SetupWizard(root, root.style.colors)
                if wizard.result:
                    config_path = os.path.join(
                        os.path.dirname(path), CONFIG_FILENAME,
                    )
                    with open(config_path, "w", encoding="utf-8") as f:
                        json.dump(wizard.result, f, indent=2)
            app._load_file(path)

    root.mainloop()


if __name__ == "__main__":
    main()
