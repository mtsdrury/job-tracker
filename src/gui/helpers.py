"""Helper functions for the GUI: completeness checks, filter logic, nudges."""

import re
from datetime import datetime

from tracker import parse_semicolons
from gui.constants import (
    COMPLETENESS_FIELDS, DATE_POSTED_WARNING_DAYS, DATE_POSTED_URGENT_DAYS,
    OUTREACH_STALE_DAYS,
)

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


def _nudge(text, urgency="normal", action=None, action_label=None, **params):
    """Build a structured nudge dict."""
    return {
        "text": text,
        "action": action,
        "action_label": action_label,
        "params": params,
        "urgency": urgency,
    }


def get_nudges(row, follow_up_days=5):
    """Return a list of structured nudge dicts for a job row.

    Each dict has: text, action (str|None), action_label (str|None),
    params (dict), urgency ("normal"|"warning"|"urgent").
    """
    nudges = []
    today = datetime.now()
    status = row.get("Application Status", "Not Yet Applied").strip()
    is_pre_app = status == "Not Yet Applied"
    company = row.get("Company", "")

    # 1. Referral not yet messaged
    ref_names = parse_semicolons(row.get("Referral Names", ""))
    ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
    for i, name in enumerate(ref_names):
        raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
        base, _ = parse_referral_status(raw)
        if not base or "not yet" in base.lower():
            nudges.append(_nudge(
                f"Referral not yet messaged: {name}",
                urgency="warning",
                action="draft_message",
                action_label="Draft Message",
                ref_idx=i,
            ))

    # 2. N days since outreach, no response (per-referral)
    outreach_dates = []
    for i, name in enumerate(ref_names):
        raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
        base, date_str = parse_referral_status(raw)
        if base.lower() in _OUTREACH_STATUSES and date_str:
            try:
                sent = datetime.strptime(date_str, "%Y-%m-%d")
                outreach_dates.append(sent)
                days = (today - sent).days
                if days >= follow_up_days:
                    urg = "urgent" if days >= follow_up_days + 4 else "warning"
                    nudges.append(_nudge(
                        f"{days}d since outreach to {name}",
                        urgency=urg,
                        action="move_to_ready",
                        action_label="Move to Ready",
                    ))
            except ValueError:
                pass

    # 3. Most recent referral outreach is 3+ days old (job-level)
    if outreach_dates:
        most_recent = max(outreach_dates)
        days_since = (today - most_recent).days
        if days_since >= OUTREACH_STALE_DAYS:
            nudges.append(_nudge(
                f"Last referral outreach was {days_since}d ago",
                urgency="warning",
            ))

    # 4. No referral found (pre-application only)
    if is_pre_app and not ref_names:
        nudges.append(_nudge(
            "No referral found yet",
            urgency="normal",
            action="search_linkedin",
            action_label="Search LinkedIn",
            company=company,
        ))

    # 5. Date Posted urgency (pre-application only)
    if is_pre_app:
        date_posted = row.get("Date Posted", "").strip()
        if date_posted:
            try:
                posted = datetime.strptime(date_posted, "%Y-%m-%d")
                days = (today - posted).days
                if days >= DATE_POSTED_URGENT_DAYS:
                    nudges.append(_nudge(
                        f"Posting is {days} days old, may close soon",
                        urgency="urgent",
                    ))
                elif days >= DATE_POSTED_WARNING_DAYS:
                    nudges.append(_nudge(
                        f"Posted {days} days ago",
                        urgency="warning",
                    ))
            except ValueError:
                pass

    # 6. Days since applied (post-application)
    if status in ("Applied", "Interview", "Offer"):
        date_str = row.get("Date Applied", "").strip()
        if date_str:
            try:
                applied = datetime.strptime(date_str, "%Y-%m-%d")
                days = (today - applied).days
                if days >= 14:
                    urg = "urgent" if days >= 28 else "warning"
                    nudges.append(_nudge(
                        f"{days} days since applied",
                        urgency=urg,
                    ))
            except ValueError:
                pass

    # 7. Interview stage marker
    if status == "Interview":
        nudges.append(_nudge("Interview stage", urgency="normal"))

    # 8. Missing fields
    missing = incomplete_fields(row)
    if missing:
        nudges.append(_nudge(
            "Missing: " + ", ".join(missing),
            urgency="normal",
        ))

    return nudges


def is_stalled(row, follow_up_days):
    """Check if a job qualifies for the stalled section.

    A job is stalled when:
    - Its action status is "Waiting on referral"
    - ALL referrals with outreach statuses have dates >= follow_up_days old
    """
    action = row.get("Action Status", "").strip()
    if action.lower() != "waiting on referral":
        return False

    ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
    if not ref_statuses:
        return False

    today = datetime.now()
    has_outreach = False

    for raw in ref_statuses:
        base, date_str = parse_referral_status(raw.strip())
        if base.lower() not in _OUTREACH_STATUSES:
            continue
        has_outreach = True
        if not date_str:
            return False
        try:
            sent = datetime.strptime(date_str, "%Y-%m-%d")
            if (today - sent).days < follow_up_days:
                return False
        except ValueError:
            return False

    return has_outreach
