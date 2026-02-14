# Job Tracker - Context for Claude Code

## What This Is

A CLI + GUI tool for tracking job applications, built around a single CSV file. Two interfaces into the same data:

- **`tracker.py`** — CLI for quick updates from the terminal (`add`, `update`, `list`, `summary`, `report`, `remove`).
- **`gui.py`** — tkinter GUI (ttkbootstrap "darkly" theme) for day-to-day use while applying to jobs.

Zero-dependency CLI (stdlib only). GUI requires `pip install ttkbootstrap`. No database, no accounts. The CSV is the source of truth.

## Architecture Decisions

- **CSV over SQLite.** Deliberate choice. The tracker holds ~25 rows. CSV is human-readable, Excel-compatible, git-diffable, and portable. SQLite would be over-engineering for this scale.
- **ttkbootstrap over raw tkinter.** Drop-in theme layer. `darkly` theme by default. Changeable via the `THEME` variable at the top of `gui.py`. All ttk widgets get modern styling; `tk.Text` and `tk.Canvas` are manually themed using `self.colors` from the ttkbootstrap style.
- **Shared code.** `gui.py` imports `FIELDNAMES`, `VALID_STATUSES`, `read_tracker`, `write_tracker`, `parse_semicolons` from `tracker.py`. The CLI functions were refactored to raise exceptions instead of `sys.exit(1)` so they're safe to import.

## File Structure

```
job-tracker/
  tracker.py          # CLI tool (zero dependencies)
  gui.py              # tkinter/ttkbootstrap GUI
  job_tracker.csv     # MacKenzie's live tracker (~24 jobs)
  job_tracker.csv.bak # Backup from CSV repair
  README.md           # Docs for both CLI and GUI
  LICENSE             # MIT
  template/           # Blank CSV template for new users
  examples/           # Example CSV with sample data (6 jobs)
```

## How to Run

```bash
# CLI (WSL python3 or Windows python.exe both work)
python tracker.py list
python tracker.py summary

# GUI (must use Windows Python since tkinter needs a display)
python.exe gui.py
```

ttkbootstrap is installed on Windows Python 3.14 (`python.exe`), not WSL Python.

## GUI Features (Current State)

**Three tabs:**
1. **Jobs tab** — Treeview list with colored status tags. Strikethrough font for Rejected/Withdrawn. Filter bar with: status dropdown, referral filter dropdown, company/role search, referral name search, "Hide closed" toggle switch.
2. **Detail tab** — Editable form for the selected job. Sections: Key Info, Cover Letter (with Browse button), Referrals (read-only display + Add Referral button), Notes. Incomplete fields bar shows missing fields with a warning icon. Save and Back to list buttons.
3. **Summary tab** — Auto-refreshes when selected. Pipeline stats: status breakdown with bar chart, resume version counts, referral stats, cover letter count, recent activity.

**Popups:**
- **New Job** — Company + Role fields. Auto-opens the new job in the Detail tab after creation.
- **Add Referral** — Name, LinkedIn URL, Connection (editable combobox: GT/UCLA), Status (readonly dropdown), Note. Modal to app (`grab_set`), stays on top, centered on parent window, resizable with min size. Note field appends to the job's Notes column as `[Name] note text`.

**Interactions:**
- Double-click a job in the list to open its Detail tab.
- Setting Date Applied auto-sets status to "Applied" if it was "Not Yet Applied".
- Browsing for a cover letter file auto-sets Cover Letter Written to "Yes".
- All saves write immediately to the CSV.

## GUI Preferences

- Popups should be **modal to the app** (`grab_set`) but not block other applications. User needs to copy/paste URLs from a browser while the popup is open.
- Popups should **stay on top** (`attributes("-topmost", True)`) and **center on the parent window**.
- Popups should be **resizable** with a reasonable minimum size, not locked.
- Status fields in popups should be **dropdown-only** (`state="readonly"`), not free-text.
- Connection field should be **editable** (user can type custom values beyond GT/UCLA).
- The GUI should feel like a **companion tool**, not a full spreadsheet replacement. Quick edits, not bulk data entry.

## CSV Format

15 columns. Semicolons separate multiple values in referral fields. See README.md for the full column reference.

Key referral columns: `Referral Names`, `Referral LinkedIns`, `Referral Connections`, `Referral Statuses` (all semicolon-delimited, parallel arrays).

## Known History

- **CSV repair:** Rows 16-24 (Hudson IT through Schneider) had malformed data with extra commas causing column misalignment. Fixed with a script; backup saved as `job_tracker.csv.bak`.
- **Blank popup bug:** Mixing `**pad` dict with explicit `pady` keyword caused silent TypeError. Fixed by using simple variables instead of dict unpacking.
- **Search not working:** `trace_add("write", ...)` on StringVar was unreliable. Switched to `<KeyRelease>` binding on Entry widgets.

## Referral Status Options (in Add Referral popup)

- Not yet messaged
- Connect request sent
- Messaged
- Emailed + connected
- Responded - sent resume
- Responded - sharing internally
- Referral submitted

## Valid Application Statuses

Not Yet Applied, Applied, Interview, Offer, Rejected, Withdrawn
