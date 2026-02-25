"""GUI constants: theme, spacing, colors, and configuration values."""

# Default action statuses (user-configurable via config)
DEFAULT_ACTION_STATUSES = [
    "Find referral",
    "Message referral",
    "Waiting on referral",
    "Write cover letter",
    "Ready to apply",
    "Applied - waiting",
    "Prep for interview",
]

# Config file (stored next to the CSV)
CONFIG_FILENAME = "job_tracker_config.json"

# Theme (ttkbootstrap theme name)
THEME = "darkly"

# Spacing constants
PAD_OUTER = 20
PAD_SECTION = 16
PAD_INNER = 8

# Treeview tag colors (tuned for dark backgrounds)
STATUS_COLORS = {
    "Not Yet Applied": "#adb5bd",
    "Applied": "#5dade2",
    "Interview": "#f5b041",
    "Offer": "#58d68d",
    "Rejected": "#ec7063",
    "Withdrawn": "#aab7b8",
    "Closed": "#7f8c8d",
}

# Bootstyles for status-themed widgets
STATUS_BOOTSTYLES = {
    "Not Yet Applied": "secondary",
    "Applied": "info",
    "Interview": "warning",
    "Offer": "success",
    "Rejected": "danger",
    "Withdrawn": "secondary",
    "Closed": "secondary",
}

# Resume version display colors
RESUME_BOOTSTYLES = {
    "Data Scientist": "info",
    "ML Builder": "success",
    "Research Engineer": "warning",
}

# Message drafting defaults (overridden by config)
DEFAULT_TONE_TEMPLATES = [
    {
        "name": "Casual",
        "body": (
            "Hi {first_name}, I hope you're doing well! "
            "{connection}. "
            "I came across the {role} role at {company} and it really "
            "stood out to me. How has your experience been? "
            "If you are open to it, I would greatly appreciate a referral."
        ),
    },
    {
        "name": "Professional",
        "body": (
            "Dear {first_name}, I hope this message finds you well. "
            "{connection}. "
            "I recently came across the {role} position at {company} "
            "and believe it aligns well with my background. "
            "I would welcome the chance to hear about your experience there. "
            "If you are open to it, I would be grateful for a referral."
        ),
    },
    {
        "name": "Friendly Professional",
        "body": (
            "Hi {first_name}, I hope you're doing well! "
            "{connection}. "
            "I recently came across the {role} role at {company} "
            "and it caught my attention. "
            "I would love to hear about your experience there. "
            "If you are open to it, I would really appreciate a referral."
        ),
    },
    {
        "name": "Follow-up",
        "body": (
            "Hi {first_name}, I hope you're doing well! "
            "I wanted to follow up on my previous message about the "
            "{role} role at {company}. I am still very interested "
            "in the position and would love to connect if you have a "
            "chance. Thank you for your time!"
        ),
    },
]

DEFAULT_CONNECTIONS = [
    {"label": "GT", "line": "I am also a GT MS student, finishing up this June"},
    {"label": "UCLA", "line": "I am also a UCLA alum, finishing up my MS at Georgia Tech this June"},
]

DEFAULT_CONNECTION_LINE = "I am finishing up my MS at Georgia Tech this June"

# Completeness check fields
COMPLETENESS_FIELDS = [
    "Job URL",
    "Resume Version",
    "Cover Letter Written",
    "Referral Names",
]

# Kanban view constants
KANBAN_CARD_PAD = 6
KANBAN_CARD_MARGIN = 4
KANBAN_DRAG_THRESHOLD = 5

# Referral filter options
REFERRAL_FILTERS = [
    "All",
    "Has Referral",
    "No Referral",
    "Not Yet Messaged",
    "Contacted",
    "Submitted",
]

# Strategy mode (affects referral follow-up timer)
DEFAULT_STRATEGY_MODE = "referral"
STRATEGY_TIMERS = {"referral": 5, "speed": 3}

# Date Posted urgency thresholds (days)
DATE_POSTED_WARNING_DAYS = 5
DATE_POSTED_URGENT_DAYS = 21

# Referral outreach recency threshold (days)
OUTREACH_STALE_DAYS = 3

# Matplotlib chart theme (for dark background)
CHART_TEXT = "#dee2e6"
CHART_GRID = "#3a3f47"
CHART_ACCENT = "#5dade2"
