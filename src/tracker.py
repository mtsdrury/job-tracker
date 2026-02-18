#!/usr/bin/env python3
"""
job-tracker CLI — A simple command-line tool for managing your job search.

Tracks applications, referrals, cover letters, and statuses in a single CSV file.
No dependencies beyond the Python standard library.
"""

import argparse
import csv
import json
import os
import re
import shutil
import sys
import tempfile
import urllib.request
from datetime import datetime, timedelta

FIELDNAMES = [
    "Company",
    "Role",
    "Location",
    "Job ID",
    "Job URL",
    "Resume Version",
    "Cover Letter Written",
    "Cover Letter File",
    "Date Applied",
    "Application Status",
    "Referral Names",
    "Referral LinkedIns",
    "Referral Connections",
    "Referral Statuses",
    "Notes",
]

VALID_STATUSES = [
    "Not Yet Applied",
    "Applied",
    "Interview",
    "Offer",
    "Rejected",
    "Withdrawn",
]

DEFAULT_FILE = "job_tracker.csv"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def resolve_path(args_file):
    """Return the CSV file path, using the --file flag or the default."""
    return args_file if args_file else DEFAULT_FILE


def read_tracker(path):
    """Read the CSV and return a list of dicts.

    Raises FileNotFoundError if the file does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def write_tracker(path, rows):
    """Atomically write rows back to the CSV (write to temp, then rename)."""
    dir_name = os.path.dirname(os.path.abspath(path))
    fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".csv")
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES, quoting=csv.QUOTE_MINIMAL)
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
        shutil.move(tmp_path, path)
    except Exception:
        os.unlink(tmp_path)
        raise


def parse_date(value):
    """Parse a date string. Accepts YYYY-MM-DD or 'today'.

    Raises ValueError if the format is invalid.
    """
    if value.lower() == "today":
        return datetime.now().strftime("%Y-%m-%d")
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return value
    except ValueError:
        raise ValueError(f"Invalid date format '{value}'. Use YYYY-MM-DD or 'today'.")


def parse_semicolons(value):
    """Split a semicolon-delimited string into a list, stripping whitespace."""
    if not value:
        return []
    return [item.strip() for item in value.split(";") if item.strip()]


def fetch_job_details(url):
    """Fetch a job posting URL and extract Company, Role, Location, Job ID.

    Looks for schema.org/JobPosting JSON-LD first, then falls back to parsing
    the <title> tag. Returns a dict with keys: company, role, location, job_id,
    job_url. Missing fields are empty strings.

    Raises RuntimeError on network or parse errors.
    """
    result = {
        "company": "",
        "role": "",
        "location": "",
        "job_id": "",
        "job_url": url,
    }

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (job-tracker/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        raise RuntimeError(f"Could not fetch URL: {e}")

    # --- Try JSON-LD (schema.org/JobPosting) ---
    ld_blocks = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.DOTALL | re.IGNORECASE,
    )

    def find_job_posting(obj):
        """Recursively search for a JobPosting object in parsed JSON-LD."""
        if isinstance(obj, dict):
            t = obj.get("@type", "")
            if isinstance(t, list):
                types = t
            else:
                types = [t]
            if "JobPosting" in types:
                return obj
            # Check @graph arrays
            for value in obj.values():
                found = find_job_posting(value)
                if found:
                    return found
        elif isinstance(obj, list):
            for item in obj:
                found = find_job_posting(item)
                if found:
                    return found
        return None

    posting = None
    for block in ld_blocks:
        try:
            data = json.loads(block)
        except (json.JSONDecodeError, ValueError):
            continue
        posting = find_job_posting(data)
        if posting:
            break

    if posting:
        result["role"] = posting.get("title", "")

        # hiringOrganization can be a dict or a string
        org = posting.get("hiringOrganization", "")
        if isinstance(org, dict):
            result["company"] = org.get("name", "")
        elif isinstance(org, str):
            result["company"] = org

        # jobLocation can be a dict, a list of dicts, or nested
        loc = posting.get("jobLocation", "")
        if isinstance(loc, list) and loc:
            loc = loc[0]
        if isinstance(loc, dict):
            addr = loc.get("address", loc)
            if isinstance(addr, dict):
                parts = []
                city = addr.get("addressLocality", "")
                region = addr.get("addressRegion", "")
                if city:
                    parts.append(city)
                if region:
                    parts.append(region)
                result["location"] = ", ".join(parts) if parts else ""
            elif isinstance(addr, str):
                result["location"] = addr

        # identifier can hold job ID
        ident = posting.get("identifier", "")
        if isinstance(ident, dict):
            result["job_id"] = str(ident.get("value", ""))
        elif isinstance(ident, str):
            result["job_id"] = ident

        return result

    # --- Fallback: parse <title> tag ---
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL | re.IGNORECASE)
    if title_match:
        title_text = title_match.group(1).strip()
        # Clean HTML entities
        title_text = title_text.replace("&amp;", "&").replace("&#x27;", "'")
        title_text = title_text.replace("&quot;", '"').replace("&#39;", "'")
        title_text = re.sub(r"&[^;]+;", "", title_text)

        # Common patterns: "Role - Company", "Role at Company", "Role | Company"
        for sep in [" - ", " at ", " | ", " — "]:
            if sep in title_text:
                parts = title_text.split(sep, 1)
                result["role"] = parts[0].strip()
                result["company"] = parts[1].strip()
                break

    return result


def match_company(rows, company_query):
    """Find rows matching a company name (case-insensitive substring).

    Returns (matches, indices) where indices are 1-based row numbers.
    """
    matches = []
    indices = []
    query = company_query.lower()
    for i, row in enumerate(rows):
        if query in row.get("Company", "").lower():
            matches.append(row)
            indices.append(i + 1)
    return matches, indices


def find_single_row(rows, company, row_num):
    """Resolve a single row from --company or --row. Exits on ambiguity."""
    if row_num is not None:
        idx = row_num - 1
        if idx < 0 or idx >= len(rows):
            print(f"Error: Row {row_num} is out of range (1-{len(rows)}).")
            sys.exit(1)
        return idx, rows[idx]

    if not company:
        print("Error: Provide --company or --row to identify the job.")
        sys.exit(1)

    matches, indices = match_company(rows, company)
    if len(matches) == 0:
        print(f"No jobs found matching '{company}'.")
        sys.exit(1)
    elif len(matches) > 1:
        print(f"Multiple matches for '{company}':")
        for idx, m in zip(indices, matches):
            print(f"  Row {idx}: {m['Company']} — {m['Role']}")
        print("Use --row to specify which one.")
        sys.exit(1)
    return indices[0] - 1, matches[0]


def truncate(text, width):
    """Truncate text to a given width, adding '...' if needed."""
    if len(text) <= width:
        return text
    return text[: width - 3] + "..."


def bar_chart(label, count, total, bar_width=20):
    """Return a single-line Unicode bar chart string."""
    frac = count / total if total > 0 else 0
    filled = round(frac * bar_width)
    bar = "\u2588" * filled + "\u2591" * (bar_width - filled)
    return f"  {label:<18} {bar} {count}"


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_add(args):
    path = resolve_path(args.file)

    # If file doesn't exist, create it with headers
    if not os.path.exists(path):
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES, quoting=csv.QUOTE_MINIMAL)
            writer.writeheader()

    rows = read_tracker(path)

    date_applied = ""
    status = args.status or "Not Yet Applied"
    if args.date_applied:
        date_applied = parse_date(args.date_applied)
        if status == "Not Yet Applied":
            status = "Applied"

    if status not in VALID_STATUSES:
        print(f"Error: Invalid status '{status}'. Valid: {', '.join(VALID_STATUSES)}")
        sys.exit(1)

    new_row = {field: "" for field in FIELDNAMES}
    new_row["Company"] = args.company
    new_row["Role"] = args.role
    new_row["Location"] = args.location or ""
    new_row["Job ID"] = args.job_id or ""
    new_row["Job URL"] = args.job_url or ""
    new_row["Resume Version"] = args.resume or ""
    new_row["Cover Letter Written"] = "Yes" if args.cover_letter else "No"
    new_row["Cover Letter File"] = args.cover_letter or ""
    new_row["Date Applied"] = date_applied
    new_row["Application Status"] = status
    new_row["Referral Names"] = args.referral or ""
    new_row["Notes"] = args.notes or ""

    rows.append(new_row)
    write_tracker(path, rows)
    print(f"Added: {args.company} — {args.role} [{status}]")


def cmd_update(args):
    path = resolve_path(args.file)
    rows = read_tracker(path)
    idx, row = find_single_row(rows, args.company, args.row)

    updated = []

    if args.status:
        if args.status not in VALID_STATUSES:
            print(f"Error: Invalid status '{args.status}'. Valid: {', '.join(VALID_STATUSES)}")
            sys.exit(1)
        row["Application Status"] = args.status
        updated.append(f"Status -> {args.status}")

    if args.date_applied:
        row["Date Applied"] = parse_date(args.date_applied)
        updated.append(f"Date Applied -> {row['Date Applied']}")

    if args.cover_letter:
        row["Cover Letter Written"] = "Yes"
        row["Cover Letter File"] = args.cover_letter
        updated.append(f"Cover Letter -> {args.cover_letter}")

    if args.referral:
        existing = parse_semicolons(row.get("Referral Names", ""))
        new_names = parse_semicolons(args.referral)
        combined = existing + new_names
        row["Referral Names"] = ";".join(combined)
        updated.append(f"Referrals -> {row['Referral Names']}")

    if args.referral_status:
        row["Referral Statuses"] = args.referral_status
        updated.append(f"Referral Statuses -> {args.referral_status}")

    if args.notes:
        row["Notes"] = args.notes
        updated.append(f"Notes -> {truncate(args.notes, 40)}")

    if args.role:
        row["Role"] = args.role
        updated.append(f"Role -> {args.role}")

    if args.location:
        row["Location"] = args.location
        updated.append(f"Location -> {args.location}")

    if args.job_url:
        row["Job URL"] = args.job_url
        updated.append(f"Job URL -> {truncate(args.job_url, 40)}")

    if args.resume:
        row["Resume Version"] = args.resume
        updated.append(f"Resume -> {args.resume}")

    if not updated:
        print("Nothing to update. Use flags like --status, --date-applied, --notes, etc.")
        return

    rows[idx] = row
    write_tracker(path, rows)
    print(f"Updated {row['Company']} — {row['Role']}:")
    for change in updated:
        print(f"  {change}")


def cmd_list(args):
    path = resolve_path(args.file)
    rows = read_tracker(path)

    if not rows:
        print("No jobs in the tracker.")
        return

    # Filter
    filtered = rows
    if args.status:
        filtered = [r for r in filtered if r.get("Application Status", "").lower() == args.status.lower()]
    if args.company:
        query = args.company.lower()
        filtered = [r for r in filtered if query in r.get("Company", "").lower()]

    if not filtered:
        print("No jobs match the filter.")
        return

    # Print table
    header = f"{'#':<4} {'Company':<22} {'Role':<28} {'Status':<18} {'Date':<12}"
    print(header)
    print("-" * len(header))
    for i, row in enumerate(filtered):
        # Find original row number
        original_idx = rows.index(row) + 1
        company = truncate(row.get("Company", ""), 20)
        role = truncate(row.get("Role", ""), 26)
        status = row.get("Application Status", "")
        date = row.get("Date Applied", "")
        print(f"{original_idx:<4} {company:<22} {role:<28} {status:<18} {date:<12}")

    print(f"\n{len(filtered)} job(s) shown.")


def cmd_summary(args):
    path = resolve_path(args.file)
    rows = read_tracker(path)

    if not rows:
        print("No jobs in the tracker.")
        return

    total = len(rows)
    today = datetime.now()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Status breakdown
    status_counts = {}
    for s in VALID_STATUSES:
        status_counts[s] = 0
    for row in rows:
        st = row.get("Application Status", "Not Yet Applied")
        status_counts[st] = status_counts.get(st, 0) + 1

    print(f"Pipeline Summary ({total} total jobs)")
    print("=" * 50)
    print("\nStatus Breakdown:")
    for status in VALID_STATUSES:
        count = status_counts.get(status, 0)
        if count > 0 or status in ("Not Yet Applied", "Applied", "Interview"):
            print(bar_chart(status, count, total))

    # Resume version counts
    resume_counts = {}
    for row in rows:
        rv = row.get("Resume Version", "").strip()
        if rv:
            resume_counts[rv] = resume_counts.get(rv, 0) + 1
    if resume_counts:
        print("\nResume Versions:")
        for rv, count in sorted(resume_counts.items()):
            print(f"  {rv}: {count}")

    # Referral stats
    has_referral = 0
    referral_contacted = 0
    referral_submitted = 0
    for row in rows:
        names = parse_semicolons(row.get("Referral Names", ""))
        statuses = parse_semicolons(row.get("Referral Statuses", ""))
        if names:
            has_referral += 1
        for rs in statuses:
            rs_lower = rs.strip().lower()
            # Strip trailing date (YYYY-MM-DD) if present
            base = rs_lower
            if len(rs_lower) >= 10 and re.match(r"\d{4}-\d{2}-\d{2}$", rs_lower[-10:]):
                base = rs_lower[:-10].strip()
            if base and "not yet" not in base:
                referral_contacted += 1
            if "submitted" in base:
                referral_submitted += 1

    print(f"\nReferrals:")
    print(f"  Jobs with referrals: {has_referral}/{total}")
    if has_referral > 0:
        print(f"  Referrals contacted: {referral_contacted}")
        print(f"  Referrals submitted: {referral_submitted}")
        hit_rate = has_referral / total * 100
        print(f"  Referral hit rate:   {hit_rate:.0f}%")

    # Cover letters
    cl_count = sum(1 for r in rows if r.get("Cover Letter Written", "").lower() == "yes")
    print(f"\nCover Letters: {cl_count}/{total}")

    # Recent activity
    apps_this_week = 0
    apps_this_month = 0
    for row in rows:
        date_str = row.get("Date Applied", "").strip()
        if date_str:
            try:
                d = datetime.strptime(date_str, "%Y-%m-%d")
                if d >= week_ago:
                    apps_this_week += 1
                if d >= month_ago:
                    apps_this_month += 1
            except ValueError:
                pass

    print(f"\nRecent Activity:")
    print(f"  Applications this week:  {apps_this_week}")
    print(f"  Applications this month: {apps_this_month}")


def cmd_report(args):
    path = resolve_path(args.file)
    rows = read_tracker(path)

    if not rows:
        print("No jobs in the tracker.")
        return

    weeks = args.weeks or 1
    today = datetime.now()
    cutoff = today - timedelta(weeks=weeks)
    stale_days = 21

    print(f"Weekly Report (last {weeks} week{'s' if weeks > 1 else ''})")
    print("=" * 50)

    # New applications in the period
    new_apps = []
    for row in rows:
        date_str = row.get("Date Applied", "").strip()
        if date_str:
            try:
                d = datetime.strptime(date_str, "%Y-%m-%d")
                if d >= cutoff:
                    new_apps.append(row)
            except ValueError:
                pass

    print(f"\nNew Applications: {len(new_apps)}")
    for app in new_apps:
        print(f"  {app['Company']} — {app['Role']} ({app.get('Date Applied', '')})")

    # Pipeline snapshot
    print("\nPipeline Snapshot:")
    status_counts = {}
    for row in rows:
        st = row.get("Application Status", "Not Yet Applied")
        status_counts[st] = status_counts.get(st, 0) + 1
    for status in VALID_STATUSES:
        count = status_counts.get(status, 0)
        if count > 0:
            print(f"  {status}: {count}")

    # Referral activity
    print("\nReferral Activity:")
    referral_jobs = [r for r in rows if parse_semicolons(r.get("Referral Names", ""))]
    if referral_jobs:
        for rj in referral_jobs:
            names = parse_semicolons(rj.get("Referral Names", ""))
            statuses = parse_semicolons(rj.get("Referral Statuses", ""))
            status_str = ", ".join(f"{n} ({s})" for n, s in zip(names, statuses)) if statuses else ", ".join(names)
            print(f"  {rj['Company']}: {status_str}")
    else:
        print("  No referrals tracked yet.")

    # Action items
    print("\nAction Items:")
    action_items = []

    # Stale "Applied" (no update in 3+ weeks)
    for row in rows:
        if row.get("Application Status", "") == "Applied":
            date_str = row.get("Date Applied", "").strip()
            if date_str:
                try:
                    d = datetime.strptime(date_str, "%Y-%m-%d")
                    days_old = (today - d).days
                    if days_old >= stale_days:
                        action_items.append(
                            f"Follow up: {row['Company']} — {row['Role']} "
                            f"(applied {days_old} days ago)"
                        )
                except ValueError:
                    pass

    # Un-messaged referrals
    for row in rows:
        names = parse_semicolons(row.get("Referral Names", ""))
        statuses = parse_semicolons(row.get("Referral Statuses", ""))
        for i, name in enumerate(names):
            status = statuses[i].lower() if i < len(statuses) else ""
            if "not yet" in status or not status:
                action_items.append(
                    f"Message referral: {name} at {row['Company']}"
                )

    # Jobs still "Not Yet Applied" with no notes about waiting
    not_applied = [r for r in rows if r.get("Application Status", "") == "Not Yet Applied"]
    if len(not_applied) > 3:
        action_items.append(
            f"Review backlog: {len(not_applied)} jobs still marked 'Not Yet Applied'"
        )

    if action_items:
        for item in action_items:
            print(f"  - {item}")
    else:
        print("  No action items. You're on top of things!")


def cmd_remove(args):
    path = resolve_path(args.file)
    rows = read_tracker(path)
    idx, row = find_single_row(rows, args.company, args.row)

    print(f"Remove: {row['Company']} — {row['Role']} [{row.get('Application Status', '')}]")

    if not args.yes:
        confirm = input("Are you sure? (y/N): ").strip().lower()
        if confirm != "y":
            print("Cancelled.")
            return

    rows.pop(idx)
    write_tracker(path, rows)
    print("Removed.")


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def build_parser():
    parser = argparse.ArgumentParser(
        prog="tracker",
        description="A simple CLI for managing your job search tracker.",
    )
    parser.add_argument(
        "-f", "--file",
        help=f"Path to CSV file (default: {DEFAULT_FILE})",
        default=None,
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # add
    p_add = subparsers.add_parser("add", help="Add a new job to the tracker")
    p_add.add_argument("--company", required=True, help="Company name")
    p_add.add_argument("--role", required=True, help="Job title / role")
    p_add.add_argument("--location", help="Job location (e.g. 'Los Angeles, CA')")
    p_add.add_argument("--job-id", help="Job posting ID")
    p_add.add_argument("--job-url", help="URL of the job posting")
    p_add.add_argument("--resume", help="Resume version used (e.g. 'Data Scientist')")
    p_add.add_argument("--cover-letter", help="Cover letter filename (sets 'Written' to Yes)")
    p_add.add_argument("--date-applied", help="Date applied (YYYY-MM-DD or 'today')")
    p_add.add_argument("--status", help="Application status (default: Not Yet Applied)")
    p_add.add_argument("--referral", help="Referral name(s), semicolon-separated")
    p_add.add_argument("--notes", help="Notes about the role")

    # update
    p_update = subparsers.add_parser("update", help="Update a job's fields")
    p_update.add_argument("--company", help="Company name (case-insensitive substring match)")
    p_update.add_argument("--row", type=int, help="Row number (1-based)")
    p_update.add_argument("--status", help="New application status")
    p_update.add_argument("--date-applied", help="Date applied (YYYY-MM-DD or 'today')")
    p_update.add_argument("--cover-letter", help="Cover letter filename")
    p_update.add_argument("--referral", help="Add referral name(s), semicolon-separated")
    p_update.add_argument("--referral-status", help="Update referral statuses (semicolon-separated)")
    p_update.add_argument("--notes", help="Replace notes")
    p_update.add_argument("--role", help="Update role/title")
    p_update.add_argument("--location", help="Update location")
    p_update.add_argument("--job-url", help="Update job URL")
    p_update.add_argument("--resume", help="Update resume version")

    # list
    p_list = subparsers.add_parser("list", help="List jobs (with optional filters)")
    p_list.add_argument("--status", help="Filter by application status")
    p_list.add_argument("--company", help="Filter by company name")

    # summary
    subparsers.add_parser("summary", help="Print pipeline summary with stats")

    # report
    p_report = subparsers.add_parser("report", help="Generate a weekly report")
    p_report.add_argument("--weeks", type=int, default=1, help="Number of weeks to look back (default: 1)")

    # remove
    p_remove = subparsers.add_parser("remove", help="Remove a job from the tracker")
    p_remove.add_argument("--company", help="Company name (case-insensitive substring match)")
    p_remove.add_argument("--row", type=int, help="Row number (1-based)")
    p_remove.add_argument("-y", "--yes", action="store_true", help="Skip confirmation prompt")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "add": cmd_add,
        "update": cmd_update,
        "list": cmd_list,
        "summary": cmd_summary,
        "report": cmd_report,
        "remove": cmd_remove,
    }

    try:
        commands[args.command](args)
    except (FileNotFoundError, ValueError) as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
