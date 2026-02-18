"""Helper functions for the GUI: completeness checks, filter logic."""

import re

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
