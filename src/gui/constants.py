"""GUI constants: theme, spacing, colors, and configuration values."""

# Action sort strategies (for Actions tab dropdown)
ACTION_SORT_OPTIONS = ["Closest to Done", "Referral First", "Time Sensitive"]

ACTION_PRIORITIES = {
    "Closest to Done": {
        "submit_app": 1,
        "followup_app": 2,
        "followup_referral": 3,
        "write_cl": 4,
        "message_referral": 5,
        "find_referral": 6,
        "fill_missing": 7,
    },
    "Referral First": {
        "message_referral": 1,
        "followup_referral": 2,
        "find_referral": 3,
        "write_cl": 4,
        "submit_app": 5,
        "followup_app": 6,
        "fill_missing": 7,
    },
    "Time Sensitive": {
        "followup_app": 1,
        "followup_referral": 2,
        "submit_app": 3,
        "message_referral": 4,
        "write_cl": 5,
        "find_referral": 6,
        "fill_missing": 7,
    },
}

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
}

# Bootstyles for status-themed widgets
STATUS_BOOTSTYLES = {
    "Not Yet Applied": "secondary",
    "Applied": "info",
    "Interview": "warning",
    "Offer": "success",
    "Rejected": "danger",
    "Withdrawn": "secondary",
}

# Resume version display colors
RESUME_BOOTSTYLES = {
    "Data Scientist": "info",
    "ML Builder": "success",
    "Research Engineer": "warning",
}

# Message drafting
TONE_OPTIONS = ["Casual", "Professional", "Friendly Professional", "Follow-up"]
CONNECTION_TEMPLATES = {
    "GT": "I am also a GT MS student, finishing up this June",
    "UCLA": "I am also a UCLA alum, finishing up my MS at Georgia Tech this June",
}
DEFAULT_CONNECTION_LINE = "I am finishing up my MS at Georgia Tech this June"

# Completeness check fields
COMPLETENESS_FIELDS = [
    "Job URL",
    "Resume Version",
    "Cover Letter Written",
    "Date Applied",
    "Application Status",
    "Referral Names",
    "Notes",
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

# Matplotlib chart theme (for dark background)
CHART_TEXT = "#dee2e6"
CHART_GRID = "#3a3f47"
CHART_ACCENT = "#5dade2"
