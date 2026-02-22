"""Helper functions for the GUI: completeness checks, filter logic, nudges."""

import re
from datetime import datetime

from tracker import parse_semicolons
from gui.constants import COMPLETENESS_FIELDS

_DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}$")


def parse_referral_status(status_str):
    """Parse a referral status string into (base_status, date_or_none).

    If the last 10 characters match YYYY-MM-DD, splits them off.
    Returns e.g. ("Message sent", "2026-02-15") or ("Not yet messaged", None).
    """
    s = status_str.strip()
    if len(s) >= 10 and _DATE_RE.search(s):
        date_part = s[-10:]
        base = s[:-10].strip()
        return (base, date_part) if base else (s, None)
    return (s, None)


def incomplete_fields(row):
    """Return list of field names that are empty or missing."""
    missing = []
    for f in COMPLETENESS_FIELDS:
        val = row.get(f, "").strip()
        if not val:
            missing.append(f)
        elif f == "Cover Letter Written" and val.lower() == "no":
            missing.append("Cover Letter")
    return missing


def matches_referral_filter(row, ref_filter):
    names = parse_semicolons(row.get("Referral Names", ""))
    statuses = parse_semicolons(row.get("Referral Statuses", ""))

    if ref_filter == "All":
        return True
    if ref_filter == "Has Referral":
        return len(names) > 0
    if ref_filter == "No Referral":
        return len(names) == 0
    if ref_filter == "Not Yet Messaged":
        if not names:
            return False
        if not statuses:
            return True
        for s in statuses:
            base, _ = parse_referral_status(s)
            if not base or "not yet" in base.lower():
                return True
        return False
    if ref_filter == "Contacted":
        for s in statuses:
            base, _ = parse_referral_status(s)
            if base and "not yet" not in base.lower():
                return True
        return False
    if ref_filter == "Submitted":
        for s in statuses:
            base, _ = parse_referral_status(s)
            if "submitted" in base.lower():
                return True
        return False
    return True


# Outreach statuses that trigger follow-up after 3 days
_OUTREACH_STATUSES = ("connect request sent", "message sent", "emailed")


def get_nudges(row):
    """Return a list of short contextual hint strings for a job row.

    Analyzes fields to generate subtle nudges like stale applications,
    unmessaged referrals, old postings, and missing fields.
    """
    nudges = []
    today = datetime.now()
    status = row.get("Application Status", "Not Yet Applied").strip()

    # 1. Days since applied (if Applied and stale)
    if status == "Applied":
        date_str = row.get("Date Applied", "").strip()
        if date_str:
            try:
                applied = datetime.strptime(date_str, "%Y-%m-%d")
                days = (today - applied).days
                if days >= 14:
                    nudges.append(f"{days} days since applied")
            except ValueError:
                pass

    # 2. Referral not yet messaged
    ref_names = parse_semicolons(row.get("Referral Names", ""))
    ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
    for i, name in enumerate(ref_names):
        raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
        base, _ = parse_referral_status(raw)
        if not base or "not yet" in base.lower():
            nudges.append(f"Referral not yet messaged: {name}")

    # 3. 3+ days since outreach (referral in outreach stage)
    for i, name in enumerate(ref_names):
        raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
        base, date_str = parse_referral_status(raw)
        if base.lower() in _OUTREACH_STATUSES and date_str:
            try:
                sent = datetime.strptime(date_str, "%Y-%m-%d")
                days = (today - sent).days
                if days >= 3:
                    nudges.append(f"{days}d since outreach to {name}")
            except ValueError:
                pass

    # 4. Posted X days ago (if date_posted is old)
    date_posted = row.get("Date Posted", "").strip()
    if date_posted:
        try:
            posted = datetime.strptime(date_posted, "%Y-%m-%d")
            days = (today - posted).days
            if days > 7:
                nudges.append(f"Posted {days} days ago")
        except ValueError:
            pass

    # 5. Missing fields
    missing = incomplete_fields(row)
    if missing:
        nudges.append("Missing: " + ", ".join(missing))

    return nudges
