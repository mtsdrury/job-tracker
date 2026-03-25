# Job Tracker - Feature Breakdown

A referral-first job search companion. In this job market, applying cold rarely works. You need to find someone at the company, reach out, build a connection, and get a referral before you apply. This app is built around that workflow.

---

## 1. Data Layer

The foundation everything else sits on. No database, no accounts. A single CSV file is the source of truth.

### 1.1 CSV Storage
- 17-column CSV format (Company, Role, Location, Job ID, Job URL, Date Posted, Resume Version, Cover Letter Written/File, Date Applied, Application Status, Action Status, Referral Names/LinkedIns/Connections/Statuses, Notes)
- Semicolon-delimited parallel arrays for multi-referral support (names, URLs, connections, and statuses stay in sync by index)
- Atomic writes on every save (no "unsaved changes" state)
- Human-readable, Excel-compatible, git-diffable

### 1.2 Config Persistence
- JSON config file (`job_tracker_config.json`) stored next to the CSV
- Stores all user-specific settings: schools, resume versions, connections, default connection line, tone templates, action statuses, strategy mode, stalled threshold
- Loaded on file open, saved on any change
- Falls back to hardcoded defaults (`constants.py`) if config is missing or corrupt

**Depends on:** Nothing. Everything else depends on this.

---

## 2. Configuration & Onboarding

How users set up the app to match their situation. Runs once on first launch, editable anytime after via the toolbar.

### 2.1 First-Run Setup Wizard
A 6-step modal wizard with progress dots that collects everything the app needs to be useful:

1. **Schools** - Name + LinkedIn school ID (extracted from search URLs or entered as a numeric ID). Used to filter LinkedIn searches to alumni.
2. **Resume Versions** - User-named labels (e.g. "Data Scientist", "ML Engineer"). Appear in dropdowns throughout the app.
3. **Connections** - Auto-generated from schools (e.g. "I am also a GT student"). Defines how you introduce yourself to referrals from each network. Includes a default line for cold outreach.
4. **Message Templates** - Pre-filled outreach templates with placeholders (`{first_name}`, `{company}`, `{role}`, `{connection}`). Editable with live preview using sample data.
5. **Strategy** - Referral-first vs. Speed-first mode, plus stalled threshold (3/5/7 days).
6. **Action Statuses** - Reorderable list of workflow steps (e.g. "Find referral", "Message referral", "Write cover letter", "Ready to apply").

### 2.2 Toolbar Config Management
Post-setup editing of all the same settings, accessible from the top bar at any time:

- **Schools popup** - Add/remove schools with LinkedIn IDs
- **Resume Versions popup** - Add/remove version labels
- **Action Statuses popup** - Add/remove/reorder workflow steps
- **Strategy popup** - Toggle strategy mode + adjust stalled threshold
- **Templates popup** - Connections CRUD (with inline editing) + tone template CRUD (with sub-dialog editor)

All changes persist to the config JSON immediately.

**Depends on:** 1.2 Config Persistence

---

## 3. Job Management

Core CRUD operations for tracking jobs through the pipeline.

### 3.1 Add Job
- New Job popup (Company + Role, minimal friction)
- Auto-sets status to "Not Yet Applied" and Cover Letter Written to "No"
- Auto-opens the new job in the Detail tab after creation
- Optionally launches the Pipeline Wizard (3.5) for guided setup

### 3.2 Job Detail Form
- Editable fields for all 17 CSV columns
- Resume Version and Action Status dropdowns populated from config
- Cover Letter Browse button (file picker, auto-sets "Written" to "Yes")
- Date Applied auto-sets status to "Applied" if it was "Not Yet Applied"
- Save + Back to list navigation

### 3.3 Remove Job
- Confirmation dialog before deletion
- Removes the row from CSV

### 3.4 Job URL Fetching
- Scrape a job posting URL for structured data (company, role, location, job ID, date posted)
- Schema.org/JobPosting JSON-LD parsing with `<title>` tag fallback
- Checkbox UI to select which extracted fields to apply
- Works from both the New Job popup and the Detail tab

### 3.5 New Job Pipeline Wizard
Inline wizard in the Detail tab for freshly added jobs. Guides through the referral-first workflow step by step:

1. Job Added (confirm details)
2. Referral (find and add one)
3. Message (draft and send outreach)
4. Resume (select version)
5. Done

Progress dots track completion. Exits into the normal Detail form when finished.

**Depends on:** 1.1 CSV Storage, 2.1/2.2 for resume versions and action statuses

---

## 4. Referral Workflow

The heart of the app. Everything here supports finding, contacting, and tracking referrals.

### 4.1 Referral Management
- Display referrals per job (name, connection type, status, LinkedIn link)
- Add Referral popup: name, LinkedIn URL, connection type (editable combobox from config), status (readonly dropdown), note
- Edit referral status
- Auto-append today's date to status on outreach (e.g. "Message sent 2026-02-15")
- LinkedIn name auto-fetch from profile URL (background thread)
- Note field appends to the job's Notes column as `[Name] note text`

### 4.2 LinkedIn Alumni Search
- Opens LinkedIn people search filtered to configured school alumni
- Uses `schoolFilter` URL parameter with numeric school entity IDs from config
- Scoped to the current job's company name
- Falls back to generic company people search if no schools configured

### 4.3 Message Drafting
- Draft Message popup per referral
- Tone selector (from configured templates: Casual, Professional, Friendly Professional, Follow-up, or user-created)
- Connection selector (from configured connections: GT, UCLA, LinkedIn 1st, or user-created)
- Placeholder substitution: `{first_name}`, `{company}`, `{role}`, `{connection}`
- Live regeneration when tone or connection changes
- Copy-ready output for pasting into LinkedIn

### 4.4 Referral Status Tracking
8 statuses forming a progression:
1. Not yet messaged
2. Connect request sent
3. Message sent
4. Emailed
5. Responded
6. Resume sent
7. Sharing internally
8. Referral submitted

Date is embedded in the status string (e.g. "Message sent 2026-02-15") and used by the nudge engine (4.5) and stalled detection (4.6) to calculate time elapsed.

### 4.5 Nudge Engine
Computes per-job nudges based on current state. Each nudge has text, urgency level (normal/warning/urgent), and an optional action button:

| Condition | Urgency | Action |
|---|---|---|
| Referral not yet messaged | Warning | Draft Message |
| N days since outreach, no response | Warning/Urgent (threshold + 4d) | Move to Ready |
| Last referral outreach 3+ days old | Warning | - |
| No referral found (pre-app only) | Normal | Search LinkedIn |
| Posting 5+ days old (pre-app only) | Warning | - |
| Posting 21+ days old (pre-app only) | Urgent | - |
| 14+ days since applied | Warning | - |
| 28+ days since applied | Urgent | - |
| Interview stage | Normal | - |
| Missing fields (URL, resume, CL, referral) | Normal | - |

### 4.6 Stalled Detection
A job is stalled when:
- Its action status is "Waiting on referral"
- ALL referrals with outreach statuses have dates older than the configured threshold

Stalled threshold is configurable (3/5/7 days) via Strategy settings. Stalled jobs are surfaced prominently in the Actions tab.

**Depends on:** 1.1 CSV Storage, 2.1/2.2 for schools, connections, and templates

---

## 5. Views & Navigation

Different ways to see and interact with your job pipeline.

### 5.1 Jobs List View
- Treeview with colored status tags per row
- Strikethrough font for Rejected/Withdrawn/Closed
- Multi-filter bar:
  - Status dropdown (All + 7 statuses)
  - Referral filter (All / Has Referral / No Referral / Not Yet Messaged / Contacted / Submitted)
  - Company/role text search
  - Referral name search
- "Hide closed" toggle (Rejected/Withdrawn/Closed)
- Clear filters button
- Double-click to open in Detail tab

### 5.2 Kanban Board View
- Toggle between list and kanban on the Jobs tab
- One column per application status with colored header dots
- Drag-and-drop cards between columns to change status
- Cards show company, role, and referral summary
- Auto-saves status changes to CSV
- Respects the same filters as the list view

### 5.3 Actions Tab - Pre-Application
- Cards grouped by action status (Find referral, Message referral, Write cover letter, etc.)
- Chevron-expandable detail panels per card
- Urgency-colored nudges from the nudge engine (4.5)
- "Take Action" button launches the Action Wizard (5.5)
- Stalled section for jobs past the threshold (4.6)

### 5.4 Actions Tab - Post-Application
- Flat list of applied/interview/offer jobs
- Inline status dropdown per row (Applied / Interview / Offer / Rejected / Withdrawn)
- Direct CSV save on dropdown change
- Minimal design: company/role label + dropdown, nothing more

### 5.5 Action Wizard
Multi-step modal wizard (separate from the Pipeline Wizard in 3.5) for taking the next action on an existing job:

- Dynamically builds steps based on current job state
- Steps can include: find referral, message referral, choose resume, apply, wait for response
- Drafts messages, adds referrals, updates statuses within the wizard flow
- Progress dots showing current step
- Tracks which referrals have been handled during this wizard session

### 5.6 Analytics Dashboard
Embedded in the Summary/Analytics tab. Auto-refreshes when the tab is selected.

- **Key Metrics** - Text stat cards (total jobs, applied count, referral rate, etc.)
- **Referral Impact** - Matplotlib chart showing referral vs. no-referral outcomes
- **Resume Version Performance** - Chart comparing how each resume version performs
- **Application Timeline** - Chart of applications over time
- Graceful fallback if matplotlib/pandas not installed (charts just don't render)

### 5.7 Completeness Tracking
- Per-job check for: Job URL, Resume Version, Cover Letter, Referral Names
- Warning bar in Detail tab ("Missing: Cover Letter, Referral Names")
- Surfaced as nudges in the Actions tab

**Depends on:** 1.1 CSV Storage, 4.5 Nudge Engine (for Actions tab), 4.6 Stalled Detection

---

## 6. AI Integration

Natural language interface to the tracker.

### 6.1 Chat Tab
- Embedded chat UI with scrollable message history
- Styled message types: user (blue bold), assistant, system (gray italic), error (red), tool actions (green)
- Enter to send, Shift+Enter for newline
- "Thinking..." indicator while waiting for response

### 6.2 LLM Client
- Powered by Claude Haiku (`claude-haiku-4-5`) via the Anthropic API
- System prompt built dynamically from current CSV data (full indexed table of all jobs)
- Agentic tool use loop (up to 10 rounds):
  - `add_job` - Add a new job to the tracker
  - `update_job` - Update any non-referral field on a job
  - `add_referral` - Add a referral to a job
  - `update_referral_status` - Update a specific referral's status
- Background threading (GUI never freezes)
- Auto-refreshes the GUI after any data mutation

### 6.3 API Key Management
- Modal dialog to enter/update the Anthropic API key
- Stored locally in `~/.job_tracker/config.json` (separate from the tracker config)
- Owner-only file permissions (`chmod 600`)
- Lazy-loaded on first chat send
- Auth error detection prompts re-entry

**Depends on:** 1.1 CSV Storage (tool executor reads/writes CSV), `anthropic` Python package (optional, chat tab degrades without it)

---

## 7. CLI

Standalone command-line interface. Zero dependencies beyond the Python standard library.

### 7.1 Commands
- `add` - Add a new job (interactive prompts)
- `update` - Update fields on an existing job by row index
- `list` - List jobs with optional status/company filters
- `summary` - Pipeline summary (status counts, referral stats, cover letter counts)
- `report` - Detailed multi-section report
- `remove` - Remove a job by row index (with confirmation)

### 7.2 Shared Utilities
Functions imported by both CLI and GUI:
- `read_tracker(path)` / `write_tracker(path, rows)` - CSV I/O
- `parse_semicolons(value)` - Split semicolon-delimited fields into lists
- `fetch_job_details(url)` - Scrape job posting for structured data
- `fetch_linkedin_name(url)` - Extract name from LinkedIn profile URL
- `FIELDNAMES`, `VALID_STATUSES` - Canonical column names and status values

**Depends on:** 1.1 CSV Storage. No GUI dependencies.

---

## 8. Packaging & Distribution

### 8.1 Standalone Executable
- PyInstaller build script (`build.bat`) + spec file
- Produces `Job Tracker.exe` for Windows
- No Python installation required for end users
- Double-click to run

**Depends on:** Everything above gets bundled into the executable.

---

## Dependency Graph (Simplified)

```
1. Data Layer
   |
   +-- 2. Configuration & Onboarding
   |      |
   +------+-- 3. Job Management
   |      |      |
   +------+------+-- 4. Referral Workflow
   |                    |
   +--------------------+-- 5. Views & Navigation
   |
   +-- 6. AI Integration (optional)
   |
   +-- 7. CLI (independent of GUI)
   |
   +-- 8. Packaging (bundles everything)
```
