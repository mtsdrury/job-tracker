# Job Tracker

A lightweight job search tracker with a GUI and CLI, built around a single CSV file. No dependencies, no accounts, no databases.

## Why This Exists

Spreadsheets are the best job tracker for most people, but they get messy fast. Applications pile up, referral follow-ups slip through the cracks, and you lose track of what needs attention. This repo gives you a clean CSV template with sensible columns and two interfaces to keep it organized.

## Quick Start

### Option 1: Standalone .exe (no Python required)

1. Download `Job Tracker.exe` from the root of this repo or the [Releases](https://github.com/mtsdrury/job-tracker/releases) page
2. Double-click the .exe (it creates a blank `job_tracker.csv` on first run)

### Option 2: Run from source

```bash
git clone https://github.com/mtsdrury/job-tracker.git
cd job-tracker

# GUI (creates a blank job_tracker.csv on first run)
pip install ttkbootstrap
python src/gui.py

# CLI
python src/tracker.py --help
python src/tracker.py add --company "Acme Corp" --role "Data Scientist" --location "Los Angeles, CA"
python src/tracker.py list
```

## GUI

A modern tkinter interface (powered by [ttkbootstrap](https://ttkbootstrap.readthedocs.io/)) that stays open while you apply to jobs.

```bash
pip install ttkbootstrap
python src/gui.py
```

Features:
- **Tabbed layout:** Jobs list, Detail editor, and Summary dashboard in separate tabs.
- **Job list** with colored status tags and strikethrough for rejected/withdrawn jobs. Double-click to open details.
- **Filters:** filter by application status, referral status (Has Referral, Messaged, Submitted, etc.), or search by company/role/referral name.
- **Detail panel:** edit any field for the selected job and save back to CSV. Browse for cover letter files.
- **Referral management:** add referrals via a popup form with name, LinkedIn URL, connection, and status fields.
- **Incomplete fields indicator:** shows which fields are still empty so you can fill in gaps.
- **New Job / Remove:** add or remove jobs without touching the CSV directly. The New Job popup can auto-fill Company, Role, and Location from a pasted URL (uses schema.org JSON-LD when available).
- **Summary tab:** pipeline stats (status breakdown, referral counts, cover letters, recent activity).

The GUI auto-opens `job_tracker.csv` if it exists in the same directory (or one level up). Otherwise, use the "Open..." button to pick a file.

To change the theme, edit the `THEME` variable in `src/gui/constants.py`. Options include `darkly`, `superhero`, `cyborg`, `cosmo`, `litera`, and [more](https://ttkbootstrap.readthedocs.io/en/latest/themes/).

### Building the .exe

To build the standalone executable yourself:

```bash
pip install pyinstaller
src\packaging\build.bat
```

The output lands in `dist/Job Tracker.exe` and is automatically copied to the repo root.

## Column Reference

| Column | Description | Example |
|--------|-------------|---------|
| Company | Company name | Acme Corp |
| Role | Job title | Data Scientist |
| Location | City, state, or "Remote" | Los Angeles, CA |
| Job ID | Posting ID from the company's careers page | AC-2026-041 |
| Job URL | Link to the job posting | https://acme.com/jobs/41 |
| Resume Version | Which resume variant you sent | Data Scientist |
| Cover Letter Written | Whether you wrote one (Yes/No) | Yes |
| Cover Letter File | Filename of the cover letter | acme_ds_cover.docx |
| Date Applied | When you submitted (YYYY-MM-DD) | 2026-01-15 |
| Application Status | Current status (see below) | Applied |
| Referral Names | Semicolon-separated list of referral contacts | Jane Smith;Carlos Reyes |
| Referral LinkedIns | LinkedIn URLs for each referral | linkedin.com/in/janesmith |
| Referral Connections | How you know each referral | UCLA alum;GT classmate |
| Referral Statuses | Status of each referral outreach | Messaged;Submitted |
| Notes | Freeform notes, strategy, context | Phone screen scheduled 2/5 |

## Application Status Values

| Status | Meaning |
|--------|---------|
| Not Yet Applied | On your radar but not submitted yet |
| Applied | Application submitted |
| Interview | In the interview process |
| Offer | Received an offer |
| Rejected | Got a rejection |
| Withdrawn | You withdrew your application |

## CLI Reference

All commands use `python src/tracker.py <command>`. Use `-f path/to/file.csv` to point at a different CSV file.

### `add` -- Add a new job

```bash
# Minimal (just company and role)
python src/tracker.py add --company "TechStart" --role "ML Engineer"

# Full details
python src/tracker.py add \
  --company "TechStart" \
  --role "ML Engineer" \
  --location "Remote" \
  --job-url "https://techstart.io/jobs/42" \
  --resume "ML Builder" \
  --date-applied today \
  --notes "Found on LinkedIn, fast-growing startup"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--company` | Yes | Company name |
| `--role` | Yes | Job title |
| `--location` | No | Job location |
| `--job-id` | No | Posting ID |
| `--job-url` | No | Posting URL |
| `--resume` | No | Resume version used |
| `--cover-letter` | No | Cover letter filename (auto-sets Written to Yes) |
| `--date-applied` | No | Date applied (YYYY-MM-DD or "today") |
| `--status` | No | Status (default: Not Yet Applied; auto-set to Applied if date given) |
| `--referral` | No | Referral name(s), semicolon-separated |
| `--notes` | No | Notes |

### `update` -- Update a job's fields

```bash
# Update status by company name
python src/tracker.py update --company "TechStart" --status "Interview"

# Update by row number (useful for ambiguous company matches)
python src/tracker.py update --row 3 --date-applied today --status "Applied"

# Add a referral to an existing job
python src/tracker.py update --company "Acme" --referral "Jane Smith" --referral-status "Messaged"

# Update notes
python src/tracker.py update --company "TechStart" --notes "Onsite scheduled for March 1"
```

Identify the job with `--company` (case-insensitive substring match) or `--row` (1-based row number). If `--company` matches multiple rows, you'll be prompted to use `--row`.

### `list` -- List jobs

```bash
# List all jobs
python src/tracker.py list

# Filter by status
python src/tracker.py list --status "Applied"

# Filter by company
python src/tracker.py list --company "tech"
```

### `summary` -- Pipeline summary

```bash
python src/tracker.py summary
```

Prints:
- Status breakdown with a visual bar chart
- Resume version counts
- Referral statistics (jobs with referrals, messaged, submitted, hit rate)
- Cover letter count
- Applications this week and this month

### `report` -- Weekly report

```bash
# Last week
python src/tracker.py report

# Last 2 weeks
python src/tracker.py report --weeks 2
```

Prints:
- New applications in the period
- Pipeline snapshot
- Referral activity
- Auto-generated action items:
  - Stale applications (applied 21+ days ago with no status change)
  - Un-messaged referrals
  - Large "Not Yet Applied" backlogs

### `remove` -- Remove a job

```bash
# Remove by company (asks for confirmation)
python src/tracker.py remove --company "TechStart"

# Skip confirmation
python src/tracker.py remove --company "TechStart" -y

# Remove by row number
python src/tracker.py remove --row 4
```

## Job Search Strategy Tips

**Referral-first approach.** Before applying cold, search LinkedIn for alumni or connections at the company. A referral dramatically increases your odds of getting past the initial screen. Track referral outreach in the CSV so nothing falls through the cracks.

**Prioritize cover letters for top roles.** You don't need a cover letter for every application. Write one for roles you're genuinely excited about or where you have a specific angle to pitch. Use the "Cover Letter Written" column to track which jobs got one.

**Quality over quantity.** Five thoughtful, well-researched applications will outperform fifty spray-and-pray submissions. Spend time tailoring your resume and writing targeted cover letters for the roles that actually fit.

**Keep your pipeline clean.** Update statuses promptly after interviews, rejections, or withdrawals. Run `python src/tracker.py report` weekly to catch stale applications and un-followed-up referrals. A messy tracker defeats the purpose of having one.

## Contributing

Contributions are welcome. Open an issue or submit a pull request. Keep it simple: the goal is a zero-dependency, single-file CLI that anyone can use.

## License

[MIT](LICENSE)
