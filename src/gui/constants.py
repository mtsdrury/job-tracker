"""GUI constants: theme, spacing, colors, and configuration values."""

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

# Message template system
MAX_TEMPLATES = 10
TEMPLATES_FILENAME = "message_templates.json"
TONE_OPTIONS = ["Casual", "Professional", "Friendly Professional"]
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

# Referral filter options
REFERRAL_FILTERS = [
    "All",
    "Has Referral",
    "No Referral",
    "Not Yet Messaged",
    "Messaged",
    "Submitted",
]
