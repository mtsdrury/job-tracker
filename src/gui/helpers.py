"""Helper functions for the GUI: completeness checks, filter logic."""

from tracker import parse_semicolons
from gui.constants import COMPLETENESS_FIELDS


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
            if not s or "not yet" in s.lower():
                return True
        return False
    if ref_filter == "Messaged":
        for s in statuses:
            if "messaged" in s.lower():
                return True
        return False
    if ref_filter == "Submitted":
        for s in statuses:
            if "submitted" in s.lower():
                return True
        return False
    return True
