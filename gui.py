#!/usr/bin/env python3
"""
job-tracker GUI — A ttkbootstrap-powered interface for the job search tracker.

Stays open while you apply to jobs. Lets you quickly view, edit, and filter
your applications without opening the CSV directly.

Requires: pip install ttkbootstrap
Usage:    python gui.py   (or python.exe gui.py on WSL)
"""

import os
import sys
import threading
import tkinter as tk
import tkinter.font as tkfont
import webbrowser
from tkinter import messagebox, filedialog
from datetime import datetime, timedelta

try:
    import ttkbootstrap as ttk
    from ttkbootstrap.constants import *
except ImportError:
    print("ttkbootstrap is required. Install it with:")
    print("  pip install ttkbootstrap")
    sys.exit(1)

from tracker import (
    FIELDNAMES,
    VALID_STATUSES,
    read_tracker,
    write_tracker,
    parse_semicolons,
    fetch_job_details,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Helper: which fields are "incomplete" for a row
# ---------------------------------------------------------------------------
COMPLETENESS_FIELDS = [
    "Job URL",
    "Resume Version",
    "Cover Letter Written",
    "Date Applied",
    "Application Status",
    "Referral Names",
    "Notes",
]


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


# ---------------------------------------------------------------------------
# Referral filter logic
# ---------------------------------------------------------------------------
REFERRAL_FILTERS = [
    "All",
    "Has Referral",
    "No Referral",
    "Not Yet Messaged",
    "Messaged",
    "Submitted",
]


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


# ---------------------------------------------------------------------------
# Main application
# ---------------------------------------------------------------------------
class TrackerApp:
    def __init__(self, root):
        self.root = root

        # Theme colors for tk-only widgets (Text, Canvas)
        self.colors = self.root.style.colors

        self.csv_path = None
        self.rows = []
        self.filtered_indices = []
        self.selected_idx = None

        self.field_widgets = {}

        self._build_ui()

    # -----------------------------------------------------------------------
    # UI construction
    # -----------------------------------------------------------------------
    def _build_ui(self):
        # Top bar: file path + Open button
        top = ttk.Frame(self.root, padding=(10, 8))
        top.pack(fill=X)

        self.path_label = ttk.Label(
            top, text="No file loaded", bootstyle="secondary",
        )
        self.path_label.pack(side=LEFT, fill=X, expand=True)

        ttk.Button(
            top, text="Open...", command=self._open_file, bootstyle="outline",
        ).pack(side=RIGHT)

        # Separator between top bar and notebook
        ttk.Separator(self.root).pack(fill=X, padx=10)

        # Notebook (tabs)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=BOTH, expand=True, padx=10, pady=(PAD_INNER, 10))

        # Tab 1: Jobs list
        self.tab_list = ttk.Frame(self.notebook, padding=6)
        self.notebook.add(self.tab_list, text="  Jobs  ")

        # Tab 2: Job detail
        self.tab_detail = ttk.Frame(self.notebook, padding=6)
        self.notebook.add(self.tab_detail, text="  Detail  ")

        # Tab 3: Summary
        self.tab_summary = ttk.Frame(self.notebook, padding=6)
        self.notebook.add(self.tab_summary, text="  Summary  ")

        self._build_list_tab()
        self._build_detail_tab()
        self._build_summary_tab()

        # Refresh summary when its tab is selected
        self.notebook.bind("<<NotebookTabChanged>>", self._on_tab_changed)

        # Global mousewheel handler (routes to active tab's canvas)
        self.root.bind_all("<MouseWheel>", self._on_mousewheel)
        self.root.bind_all("<Button-4>", self._on_mousewheel)
        self.root.bind_all("<Button-5>", self._on_mousewheel)

    def _on_mousewheel(self, event):
        """Route mousewheel events to the active tab's scrollable canvas."""
        current_tab = self.notebook.index(self.notebook.select())
        if current_tab == 1:
            canvas = self.detail_canvas
        elif current_tab == 2:
            canvas = self.summary_canvas
        else:
            return

        if event.num == 4:
            canvas.yview_scroll(-3, "units")
        elif event.num == 5:
            canvas.yview_scroll(3, "units")
        else:
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    # ===================================================================
    # TAB 1: Jobs list
    # ===================================================================
    def _build_list_tab(self):
        # Filter bar in Labelframe
        filter_frame = ttk.Labelframe(
            self.tab_list, text="Filters", bootstyle="secondary",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        filter_frame.pack(fill=X, pady=(0, PAD_INNER))

        # Row 0: Status + Referral filter dropdowns
        ttk.Label(filter_frame, text="Status:").grid(row=0, column=0, sticky="w")
        self.status_filter = ttk.Combobox(
            filter_frame, values=["All"] + VALID_STATUSES, state="readonly", width=16,
        )
        self.status_filter.set("All")
        self.status_filter.grid(row=0, column=1, padx=(4, 16))
        self.status_filter.bind("<<ComboboxSelected>>", lambda e: self._refresh_list())

        ttk.Label(filter_frame, text="Referral:").grid(row=0, column=2, sticky="w")
        self.referral_filter = ttk.Combobox(
            filter_frame, values=REFERRAL_FILTERS, state="readonly", width=16,
        )
        self.referral_filter.set("All")
        self.referral_filter.grid(row=0, column=3, padx=(4, 0))
        self.referral_filter.bind("<<ComboboxSelected>>", lambda e: self._refresh_list())

        # Row 1: Search + Referral name search
        ttk.Label(filter_frame, text="Search:").grid(
            row=1, column=0, sticky="w", pady=(6, 0),
        )
        self.search_var = tk.StringVar()
        search_entry = ttk.Entry(filter_frame, textvariable=self.search_var, width=20)
        search_entry.grid(row=1, column=1, sticky="ew", pady=(6, 0), padx=(4, 16))
        search_entry.bind("<KeyRelease>", lambda e: self._refresh_list())

        ttk.Label(filter_frame, text="Find referral:").grid(
            row=1, column=2, sticky="w", pady=(6, 0),
        )
        self.referral_search_var = tk.StringVar()
        ref_search_entry = ttk.Entry(
            filter_frame, textvariable=self.referral_search_var, width=16,
        )
        ref_search_entry.grid(row=1, column=3, sticky="ew", pady=(6, 0), padx=(4, 0))
        ref_search_entry.bind("<KeyRelease>", lambda e: self._refresh_list())

        # Row 2: Hide closed toggle + Clear button
        self.hide_closed_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            filter_frame, text="Hide closed (Rejected / Withdrawn)",
            variable=self.hide_closed_var, command=self._refresh_list,
            bootstyle="round-toggle",
        ).grid(row=2, column=0, columnspan=3, sticky="w", pady=(6, 0))

        ttk.Button(
            filter_frame, text="Clear", command=self._clear_filters,
            bootstyle="secondary-outline",
        ).grid(row=2, column=3, sticky="e", pady=(6, 0), padx=(4, 0))

        # Treeview row height
        self.root.style.configure("Treeview", rowheight=28)

        # Job list treeview
        list_frame = ttk.Frame(self.tab_list)
        list_frame.pack(fill=BOTH, expand=True)

        columns = ("company", "role", "status", "date_applied")
        self.tree = ttk.Treeview(
            list_frame, columns=columns, show="headings", selectmode="browse",
        )
        self.tree.heading("company", text="Company")
        self.tree.heading("role", text="Role")
        self.tree.heading("status", text="Status")
        self.tree.heading("date_applied", text="Date Applied")
        self.tree.column("company", width=180, minwidth=100)
        self.tree.column("role", width=240, minwidth=120)
        self.tree.column("status", width=120, minwidth=80)
        self.tree.column("date_applied", width=100, minwidth=80)

        scrollbar = ttk.Scrollbar(
            list_frame, orient=VERTICAL, command=self.tree.yview,
        )
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side=LEFT, fill=BOTH, expand=True)
        scrollbar.pack(side=RIGHT, fill=Y)

        self.tree.bind("<Double-1>", self._on_double_click)

        # Configure tag colors and strikethrough for status
        default_font = tkfont.nametofont("TkDefaultFont")
        strike_font = tkfont.Font(**default_font.configure())
        strike_font.configure(overstrike=True)

        closed_statuses = {"Rejected", "Withdrawn"}
        for status, color in STATUS_COLORS.items():
            tag = status.replace(" ", "_")
            if status in closed_statuses:
                self.tree.tag_configure(tag, foreground=color, font=strike_font)
            else:
                self.tree.tag_configure(tag, foreground=color)

        # Status bar
        self.list_status_bar = ttk.Label(
            self.tab_list, text="", bootstyle="secondary", font=("", 9),
        )
        self.list_status_bar.pack(fill=X, padx=4, pady=(4, 0))

        # Bottom buttons
        btn_frame = ttk.Frame(self.tab_list, padding=(0, 8, 0, 0))
        btn_frame.pack(fill=X)

        ttk.Button(
            btn_frame, text="+ New Job", command=self._new_job,
            bootstyle="success",
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Remove", command=self._remove_job,
            bootstyle="danger-outline",
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Open Selected", command=self._open_selected,
            bootstyle="info-outline",
        ).pack(side=LEFT)

    def _clear_filters(self):
        self.status_filter.set("All")
        self.referral_filter.set("All")
        self.search_var.set("")
        self.referral_search_var.set("")
        self.hide_closed_var.set(False)
        self._refresh_list()

    # ===================================================================
    # TAB 2: Job detail
    # ===================================================================
    def _build_detail_tab(self):
        # Header with status badge
        self.header_frame = ttk.Frame(self.tab_detail)
        self.header_frame.pack(fill=X, padx=4, pady=(4, 2))

        self.detail_header = ttk.Label(
            self.header_frame, text="No job selected",
            bootstyle="primary", font=("", 14, "bold"), anchor="w",
        )
        self.detail_header.pack(side=LEFT)

        self.detail_status_badge = ttk.Label(
            self.header_frame, text="", font=("", 10),
        )
        self.detail_status_badge.pack(side=LEFT, padx=(12, 0))

        # Incomplete fields bar (right below header)
        self.incomplete_frame = ttk.Frame(self.tab_detail)
        self.incomplete_label = ttk.Label(
            self.incomplete_frame, text="",
            bootstyle="warning", font=("", 9), anchor="w",
            wraplength=700, justify=LEFT,
        )
        self.incomplete_label.pack(fill=X, padx=4)

        # Next step banner (below incomplete fields)
        self.next_step_frame = ttk.Frame(self.tab_detail)
        self.next_step_label = ttk.Label(
            self.next_step_frame, text="",
            bootstyle="info", font=("", 9), anchor="w",
        )
        self.next_step_label.pack(fill=X, padx=4)

        # Save + Back buttons (fixed at bottom, outside scroll area)
        btn_frame = ttk.Frame(self.tab_detail, padding=(PAD_INNER, PAD_INNER))
        btn_frame.pack(side=BOTTOM, fill=X)
        ttk.Separator(self.tab_detail).pack(side=BOTTOM, fill=X, padx=4)

        ttk.Button(
            btn_frame, text="Save", command=self._save_current,
            bootstyle="success", padding=(24, 6),
        ).pack(side=LEFT, padx=(0, 8))
        ttk.Button(
            btn_frame, text="Back to list",
            command=lambda: self.notebook.select(self.tab_list),
            bootstyle="secondary-outline", padding=(16, 6),
        ).pack(side=LEFT)

        # Scrollable detail form
        bg_color = str(self.colors.bg)
        self.detail_canvas = tk.Canvas(
            self.tab_detail, bg=bg_color, highlightthickness=0, borderwidth=0,
        )
        detail_scroll = ttk.Scrollbar(
            self.tab_detail, orient=VERTICAL, command=self.detail_canvas.yview,
        )
        self.detail_frame = ttk.Frame(self.detail_canvas)

        self.detail_frame.bind(
            "<Configure>",
            lambda e: self.detail_canvas.configure(
                scrollregion=self.detail_canvas.bbox("all"),
            ),
        )
        self.detail_canvas_window = self.detail_canvas.create_window(
            (0, 0), window=self.detail_frame, anchor="nw",
        )
        self.detail_canvas.configure(yscrollcommand=detail_scroll.set)

        # Stretch inner frame to canvas width
        self.detail_canvas.bind(
            "<Configure>",
            lambda e: self.detail_canvas.itemconfig(
                self.detail_canvas_window, width=e.width,
            ),
        )

        self.detail_canvas.pack(side=LEFT, fill=BOTH, expand=True, padx=(4, 0), pady=4)
        detail_scroll.pack(side=RIGHT, fill=Y, padx=(0, 4), pady=4)

        self._build_detail_fields()

    def _build_detail_fields(self):
        f = self.detail_frame

        # Text widget colors (for tk.Text, which isn't auto-themed)
        text_kw = dict(
            bg=str(self.colors.inputbg),
            fg=str(self.colors.inputfg),
            insertbackground=str(self.colors.inputfg),
            selectbackground=str(self.colors.selectbg),
            selectforeground=str(self.colors.selectfg),
            relief="flat", borderwidth=2,
        )

        def section_header(parent, text):
            """Create a section header label with a separator line underneath."""
            header = ttk.Label(
                parent, text=text, font=("", 11, "bold"), bootstyle="info",
            )
            header.pack(anchor="w", padx=8, pady=(8, 0))
            ttk.Separator(parent).pack(fill=X, padx=8, pady=(4, 8))

        def field_row(parent, label, r, widget_type="entry", values=None, width=50):
            ttk.Label(parent, text=label + ":", anchor="e", width=20).grid(
                row=r, column=0, sticky="ne", padx=(8, 6), pady=4,
            )
            if widget_type == "combo":
                w = ttk.Combobox(parent, values=values, state="readonly", width=width)
                w.grid(row=r, column=1, sticky="ew", padx=(0, 8), pady=4)
            elif widget_type == "text":
                w = tk.Text(
                    parent, width=width, height=5, wrap=tk.WORD, font=("", 10),
                    **text_kw,
                )
                w.grid(row=r, column=1, sticky="ew", padx=(0, 8), pady=4)
            else:
                w = ttk.Entry(parent, width=width)
                w.grid(row=r, column=1, sticky="ew", padx=(0, 8), pady=4)
            self.field_widgets[label] = w
            return r + 1

        # === 1. Referrals ===
        ref_frame = ttk.Frame(f)
        ref_frame.pack(fill=X, pady=(0, PAD_INNER))

        section_header(ref_frame, "Referrals")

        ref_btn_frame = ttk.Frame(ref_frame)
        ref_btn_frame.pack(anchor="w", padx=8, pady=(0, 4))
        ttk.Button(
            ref_btn_frame, text="+ Add Referral", command=self._add_referral_popup,
            bootstyle="success-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            ref_btn_frame, text="Edit Referral", command=self._edit_referral_popup,
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            ref_btn_frame, text="Draft Message", command=self._draft_message_popup,
            bootstyle="warning-outline", padding=(8, 2),
        ).pack(side=LEFT)

        # Column headers row (matches data row layout)
        ref_header_row = ttk.Frame(ref_frame)
        ref_header_row.pack(fill=X, padx=8)

        ttk.Label(
            ref_header_row, text="Name", font=("", 9, "bold"),
            bootstyle="secondary", anchor="w",
        ).pack(side=LEFT, expand=True, fill=X)
        ttk.Separator(ref_header_row, orient=VERTICAL).pack(
            side=LEFT, fill=Y, padx=6, pady=2,
        )
        ttk.Label(
            ref_header_row, text="Connection", font=("", 9, "bold"),
            bootstyle="secondary", anchor="w", width=12,
        ).pack(side=LEFT)
        ttk.Separator(ref_header_row, orient=VERTICAL).pack(
            side=LEFT, fill=Y, padx=6, pady=2,
        )
        ttk.Label(
            ref_header_row, text="Status", font=("", 9, "bold"),
            bootstyle="secondary", anchor="w",
        ).pack(side=LEFT, expand=True, fill=X)
        ttk.Separator(ref_header_row, orient=VERTICAL).pack(
            side=LEFT, fill=Y, padx=6, pady=2,
        )
        ttk.Label(
            ref_header_row, text="LinkedIn", font=("", 9, "bold"),
            bootstyle="secondary", anchor="w", width=10,
        ).pack(side=LEFT)

        ttk.Separator(ref_frame).pack(fill=X, padx=8, pady=(2, 0))

        # Data rows frame (rebuilt on refresh)
        self.referral_rows_frame = ttk.Frame(ref_frame)
        self.referral_rows_frame.pack(fill=X, padx=8, pady=(0, 8))

        # Track selected referral index
        self._selected_referral_idx = None

        # Hidden entries for raw referral data (used by save/load)
        for field in ("Referral Names", "Referral LinkedIns",
                       "Referral Connections", "Referral Statuses"):
            hidden = ttk.Entry(f)
            self.field_widgets[field] = hidden

        # === 2. Resume & Cover Letter ===
        rcl_frame = ttk.Frame(f)
        rcl_frame.pack(fill=X, pady=(0, PAD_INNER))

        section_header(rcl_frame, "Resume & Cover Letter")

        rcl_grid = ttk.Frame(rcl_frame)
        rcl_grid.pack(fill=X, padx=8, pady=(0, 8))
        rcl_grid.columnconfigure(1, weight=1)

        rcl_row = 0
        rcl_row = field_row(rcl_grid, "Resume Version", rcl_row, "combo", [
            "Data Scientist", "ML Builder", "Research Engineer", "",
        ])
        rcl_row = field_row(
            rcl_grid, "Cover Letter Written", rcl_row, "combo", ["Yes", "No", ""],
        )

        # Cover Letter File with Browse
        ttk.Label(rcl_grid, text="Cover Letter File:", anchor="e", width=20).grid(
            row=rcl_row, column=0, sticky="ne", padx=(8, 6), pady=4,
        )
        cl_frame = ttk.Frame(rcl_grid)
        cl_frame.grid(row=rcl_row, column=1, sticky="ew", padx=(0, 8), pady=4)
        cl_entry = ttk.Entry(cl_frame)
        cl_entry.pack(side=LEFT, fill=X, expand=True)
        ttk.Button(
            cl_frame, text="Browse",
            command=lambda: self._browse_file(cl_entry, "Cover Letter",
                                              [("Word documents", "*.docx"),
                                               ("Markdown", "*.md"),
                                               ("All files", "*.*")]),
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(6, 0))
        self.field_widgets["Cover Letter File"] = cl_entry

        # === 3. Application Info ===
        app_frame = ttk.Frame(f)
        app_frame.pack(fill=X, pady=(0, PAD_INNER))

        section_header(app_frame, "Application Info")

        app_grid = ttk.Frame(app_frame)
        app_grid.pack(fill=X, padx=8, pady=(0, 8))
        app_grid.columnconfigure(1, weight=1)

        row = 0
        row = field_row(app_grid, "Application Status", row, "combo", VALID_STATUSES)

        # Date Applied with Today button
        ttk.Label(app_grid, text="Date Applied:", anchor="e", width=20).grid(
            row=row, column=0, sticky="ne", padx=(8, 6), pady=4,
        )
        date_frame = ttk.Frame(app_grid)
        date_frame.grid(row=row, column=1, sticky="ew", padx=(0, 8), pady=4)
        self.date_entry = ttk.Entry(date_frame, width=14)
        self.date_entry.pack(side=LEFT)
        ttk.Button(
            date_frame, text="Today", command=self._set_today,
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(6, 0))
        self.field_widgets["Date Applied"] = self.date_entry
        row += 1

        row = field_row(app_grid, "Location", row)
        row = field_row(app_grid, "Job ID", row)

        # Job URL with Fetch button
        ttk.Label(app_grid, text="Job URL:", anchor="e", width=20).grid(
            row=row, column=0, sticky="ne", padx=(8, 6), pady=4,
        )
        url_frame = ttk.Frame(app_grid)
        url_frame.grid(row=row, column=1, sticky="ew", padx=(0, 8), pady=4)
        job_url_entry = ttk.Entry(url_frame, width=50)
        job_url_entry.pack(side=LEFT, fill=X, expand=True)
        ttk.Button(
            url_frame, text="Fetch", command=self._fetch_from_detail_url,
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(6, 0))
        self.field_widgets["Job URL"] = job_url_entry
        row += 1

        # === 4. Notes ===
        notes_frame = ttk.Frame(f)
        notes_frame.pack(fill=X, pady=(0, PAD_INNER))

        section_header(notes_frame, "Notes")

        notes_widget = tk.Text(
            notes_frame, width=50, height=5, wrap=tk.WORD, font=("", 10),
            **text_kw,
        )
        notes_widget.pack(fill=X, padx=8, pady=(0, 8))
        self.field_widgets["Notes"] = notes_widget

    # ===================================================================
    # TAB 3: Summary
    # ===================================================================
    def _build_summary_tab(self):
        bg_color = str(self.colors.bg)
        self.summary_canvas = tk.Canvas(
            self.tab_summary, bg=bg_color, highlightthickness=0, borderwidth=0,
        )
        summary_scroll = ttk.Scrollbar(
            self.tab_summary, orient=VERTICAL, command=self.summary_canvas.yview,
        )
        self.summary_inner = ttk.Frame(self.summary_canvas)

        self.summary_inner.bind(
            "<Configure>",
            lambda e: self.summary_canvas.configure(
                scrollregion=self.summary_canvas.bbox("all"),
            ),
        )
        self.summary_canvas_window = self.summary_canvas.create_window(
            (0, 0), window=self.summary_inner, anchor="nw",
        )
        self.summary_canvas.configure(yscrollcommand=summary_scroll.set)

        # Stretch inner frame to canvas width
        self.summary_canvas.bind(
            "<Configure>",
            lambda e: self.summary_canvas.itemconfig(
                self.summary_canvas_window, width=e.width,
            ),
        )

        self.summary_canvas.pack(side=LEFT, fill=BOTH, expand=True)
        summary_scroll.pack(side=RIGHT, fill=Y)

        # --- Header ---
        ttk.Label(
            self.summary_inner, text="Pipeline Summary",
            font=("", 16, "bold"), bootstyle="primary",
        ).pack(anchor="w", padx=PAD_OUTER, pady=(PAD_OUTER, 4))

        self.summary_subtitle = ttk.Label(
            self.summary_inner, text="0 jobs tracked",
            font=("", 10), bootstyle="secondary",
        )
        self.summary_subtitle.pack(anchor="w", padx=PAD_OUTER, pady=(0, PAD_SECTION))

        # --- Stat cards row ---
        cards_frame = ttk.Frame(self.summary_inner)
        cards_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))

        self.stat_cards = {}
        for i, status in enumerate(VALID_STATUSES):
            style = STATUS_BOOTSTYLES.get(status, "secondary")
            card = ttk.Labelframe(cards_frame, text="", bootstyle=style, padding=12)
            card.grid(
                row=0, column=i, sticky="nsew",
                padx=(0, PAD_INNER if i < len(VALID_STATUSES) - 1 else 0),
            )
            cards_frame.columnconfigure(i, weight=1)

            count_label = ttk.Label(
                card, text="0", font=("", 20, "bold"), bootstyle=style,
            )
            count_label.pack()
            ttk.Label(
                card, text=status, font=("", 9), bootstyle="secondary",
            ).pack()

            self.stat_cards[status] = count_label

        # --- Status Breakdown ---
        breakdown_frame = ttk.Labelframe(
            self.summary_inner, text="Status Breakdown", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        breakdown_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))
        breakdown_frame.columnconfigure(1, weight=1)

        self.status_bars = {}
        self.status_bar_labels = {}
        for i, status in enumerate(VALID_STATUSES):
            style = STATUS_BOOTSTYLES.get(status, "secondary")
            ttk.Label(
                breakdown_frame, text=status, width=18, anchor="w",
            ).grid(row=i, column=0, sticky="w", pady=2)

            bar = ttk.Progressbar(breakdown_frame, bootstyle=style, maximum=100)
            bar.grid(row=i, column=1, sticky="ew", padx=PAD_INNER, pady=2)

            lbl = ttk.Label(breakdown_frame, text="0 (0%)", width=10, anchor="e")
            lbl.grid(row=i, column=2, sticky="e", pady=2)

            self.status_bars[status] = bar
            self.status_bar_labels[status] = lbl

        # --- Two-column row: Resume Versions + Coverage ---
        two_col = ttk.Frame(self.summary_inner)
        two_col.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))
        two_col.columnconfigure(0, weight=1)
        two_col.columnconfigure(1, weight=1)

        # Resume Versions (left)
        self.resume_frame = ttk.Labelframe(
            two_col, text="Resume Versions", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        self.resume_frame.grid(row=0, column=0, sticky="nsew", padx=(0, PAD_INNER))

        # Coverage (right)
        coverage_frame = ttk.Labelframe(
            two_col, text="Coverage", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        coverage_frame.grid(row=0, column=1, sticky="nsew")
        coverage_frame.columnconfigure(1, weight=1)

        ttk.Label(coverage_frame, text="Referrals", anchor="w").grid(
            row=0, column=0, sticky="w", pady=2,
        )
        self.referral_bar = ttk.Progressbar(
            coverage_frame, bootstyle="success", maximum=100,
        )
        self.referral_bar.grid(row=0, column=1, sticky="ew", padx=PAD_INNER, pady=2)
        self.referral_bar_label = ttk.Label(
            coverage_frame, text="0/0", anchor="e",
        )
        self.referral_bar_label.grid(row=0, column=2, sticky="e", pady=2)

        ttk.Label(coverage_frame, text="Cover Letters", anchor="w").grid(
            row=1, column=0, sticky="w", pady=2,
        )
        self.cl_bar = ttk.Progressbar(
            coverage_frame, bootstyle="success", maximum=100,
        )
        self.cl_bar.grid(row=1, column=1, sticky="ew", padx=PAD_INNER, pady=2)
        self.cl_bar_label = ttk.Label(
            coverage_frame, text="0/0", anchor="e",
        )
        self.cl_bar_label.grid(row=1, column=2, sticky="e", pady=2)

        # --- Recent Activity ---
        activity_frame = ttk.Labelframe(
            self.summary_inner, text="Recent Activity", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        activity_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))

        self.activity_week_label = ttk.Label(
            activity_frame, text="This week: 0", font=("", 11),
        )
        self.activity_week_label.pack(side=LEFT, padx=(0, PAD_SECTION * 2))
        self.activity_month_label = ttk.Label(
            activity_frame, text="This month: 0", font=("", 11),
        )
        self.activity_month_label.pack(side=LEFT)

        # --- Action Items ---
        self.action_items_frame = ttk.Labelframe(
            self.summary_inner, text="Action Items", bootstyle="warning",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        self.action_items_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_OUTER))

    def _refresh_summary(self):
        """Regenerate and display summary stats via dashboard widgets."""
        if not self.rows:
            self.summary_subtitle.config(text="No jobs in the tracker")
            for status in VALID_STATUSES:
                self.stat_cards[status].config(text="0")
                self.status_bars[status].configure(value=0)
                self.status_bar_labels[status].config(text="0 (0%)")
            for w in self.resume_frame.winfo_children():
                w.destroy()
            self.referral_bar.configure(value=0)
            self.referral_bar_label.config(text="0/0")
            self.cl_bar.configure(value=0)
            self.cl_bar_label.config(text="0/0")
            self.activity_week_label.config(text="This week: 0")
            self.activity_month_label.config(text="This month: 0")
            for w in self.action_items_frame.winfo_children():
                w.destroy()
            return

        total = len(self.rows)
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        self.summary_subtitle.config(text=f"{total} jobs tracked")

        # Status counts
        status_counts = {s: 0 for s in VALID_STATUSES}
        for row in self.rows:
            st = row.get("Application Status", "Not Yet Applied")
            status_counts[st] = status_counts.get(st, 0) + 1

        for status in VALID_STATUSES:
            count = status_counts.get(status, 0)
            pct = count / total * 100 if total else 0
            self.stat_cards[status].config(text=str(count))
            self.status_bars[status].configure(value=pct)
            self.status_bar_labels[status].config(text=f"{count} ({pct:.0f}%)")

        # Resume versions
        resume_counts = {}
        for row in self.rows:
            rv = row.get("Resume Version", "").strip()
            if rv:
                resume_counts[rv] = resume_counts.get(rv, 0) + 1

        for w in self.resume_frame.winfo_children():
            w.destroy()

        for rv, count in sorted(resume_counts.items()):
            row_frame = ttk.Frame(self.resume_frame)
            row_frame.pack(fill=X, pady=2)
            ttk.Label(row_frame, text=rv, anchor="w").pack(side=LEFT)
            color = RESUME_BOOTSTYLES.get(rv, "primary")
            ttk.Label(
                row_frame, text=str(count), font=("", 10, "bold"), bootstyle=color,
            ).pack(side=RIGHT)

        # Referral + cover letter stats
        has_referral = sum(
            1 for r in self.rows if parse_semicolons(r.get("Referral Names", ""))
        )
        cl_count = sum(
            1 for r in self.rows
            if r.get("Cover Letter Written", "").lower() == "yes"
        )

        ref_pct = has_referral / total * 100 if total else 0
        cl_pct = cl_count / total * 100 if total else 0

        self.referral_bar.configure(value=ref_pct)
        self.referral_bar_label.config(text=f"{has_referral}/{total}")
        self.cl_bar.configure(value=cl_pct)
        self.cl_bar_label.config(text=f"{cl_count}/{total}")

        # Recent activity
        apps_week = 0
        apps_month = 0
        for row in self.rows:
            date_str = row.get("Date Applied", "").strip()
            if date_str:
                try:
                    d = datetime.strptime(date_str, "%Y-%m-%d")
                    if d >= week_ago:
                        apps_week += 1
                    if d >= month_ago:
                        apps_month += 1
                except ValueError:
                    pass

        self.activity_week_label.config(text=f"This week: {apps_week}")
        self.activity_month_label.config(text=f"This month: {apps_month}")

        self._rebuild_action_items()

    # -----------------------------------------------------------------------
    # Action items
    # -----------------------------------------------------------------------
    def _rebuild_action_items(self):
        """Build clickable action items from current tracker data."""
        for w in self.action_items_frame.winfo_children():
            w.destroy()

        items = []
        today = datetime.now()
        not_applied_count = 0

        for idx, row in enumerate(self.rows):
            status = row.get("Application Status", "Not Yet Applied").strip()
            company = row.get("Company", "")
            role = row.get("Role", "")

            # 1. Stale applications (Applied 21+ days ago)
            if status == "Applied":
                date_str = row.get("Date Applied", "").strip()
                if date_str:
                    try:
                        applied = datetime.strptime(date_str, "%Y-%m-%d")
                        days = (today - applied).days
                        if days >= 21:
                            items.append((
                                f"Follow up: {company} - {role} (applied {days} days ago)",
                                idx,
                            ))
                    except ValueError:
                        pass

            # 2. Un-messaged referrals
            ref_names = parse_semicolons(row.get("Referral Names", ""))
            ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
            for i, name in enumerate(ref_names):
                stat = ref_statuses[i].strip().lower() if i < len(ref_statuses) else ""
                if not stat or "not yet" in stat:
                    items.append((
                        f"Message referral: {name} at {company}",
                        idx,
                    ))

            # 3. Referrals waiting on response
            for i, name in enumerate(ref_names):
                stat = ref_statuses[i].strip().lower() if i < len(ref_statuses) else ""
                if stat in ("messaged", "connect request sent"):
                    items.append((
                        f"Follow up with {name} at {company}",
                        idx,
                    ))

            # 4. Missing cover letters (Not Yet Applied, no CL)
            if status == "Not Yet Applied":
                not_applied_count += 1
                cl = row.get("Cover Letter Written", "").strip().lower()
                if cl != "yes":
                    items.append((
                        f"Write cover letter: {company} - {role}",
                        idx,
                    ))

        # 5. Large backlog
        if not_applied_count > 3:
            items.append((
                f"Review backlog: {not_applied_count} jobs still Not Yet Applied",
                None,
            ))

        if not items:
            ttk.Label(
                self.action_items_frame,
                text="No action items. You're on top of things!",
                bootstyle="success", font=("", 10),
            ).pack(anchor="w", pady=2)
            return

        link_font = tkfont.Font(size=10, underline=True)

        for text, job_idx in items:
            if job_idx is not None:
                lbl = ttk.Label(
                    self.action_items_frame, text=f"\u2022 {text}",
                    font=link_font, bootstyle="warning", cursor="hand2",
                )
                lbl.pack(anchor="w", pady=2)
                lbl.bind(
                    "<Button-1>",
                    lambda e, i=job_idx: self._open_job_from_action(i),
                )
            else:
                ttk.Label(
                    self.action_items_frame, text=f"\u2022 {text}",
                    font=("", 10), bootstyle="secondary",
                ).pack(anchor="w", pady=2)

    def _open_job_from_action(self, idx):
        """Navigate to a job in the Detail tab from an action item click."""
        self.selected_idx = idx
        self._load_detail(self.rows[idx])
        self.notebook.select(self.tab_detail)

    # -----------------------------------------------------------------------
    # Tab switching
    # -----------------------------------------------------------------------
    def _on_tab_changed(self, event):
        current = self.notebook.index(self.notebook.select())
        if current == 2:  # Summary tab
            self._refresh_summary()

    def _on_double_click(self, event):
        """Double-click a job in the list to open it in the detail tab."""
        sel = self.tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        self.selected_idx = idx
        self._load_detail(self.rows[idx])
        self.notebook.select(self.tab_detail)

    def _open_selected(self):
        """Button: open the selected job in the detail tab."""
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("No selection", "Select a job first.")
            return
        idx = int(sel[0])
        self.selected_idx = idx
        self._load_detail(self.rows[idx])
        self.notebook.select(self.tab_detail)

    # -----------------------------------------------------------------------
    # File operations
    # -----------------------------------------------------------------------
    def _open_file(self):
        path = filedialog.askopenfilename(
            title="Open Job Tracker CSV",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
        )
        if not path:
            return
        self._load_file(path)

    def _load_file(self, path):
        try:
            self.rows = read_tracker(path)
        except FileNotFoundError as e:
            messagebox.showerror("Error", str(e))
            return

        self.csv_path = path
        basename = os.path.basename(path)
        self.path_label.config(text=f"{basename}  ({len(self.rows)} jobs)")
        self.root.title(f"Job Tracker - {basename}")
        self.selected_idx = None
        self._refresh_list()
        self._clear_detail()

    # -----------------------------------------------------------------------
    # List management
    # -----------------------------------------------------------------------
    def _refresh_list(self):
        self.tree.delete(*self.tree.get_children())
        self.filtered_indices = []

        status_f = self.status_filter.get()
        referral_f = self.referral_filter.get()
        search_q = self.search_var.get().strip().lower()
        ref_search_q = self.referral_search_var.get().strip().lower()
        hide_closed = self.hide_closed_var.get()

        for i, row in enumerate(self.rows):
            status = row.get("Application Status", "Not Yet Applied")

            if hide_closed and status in ("Rejected", "Withdrawn"):
                continue
            if status_f != "All" and status != status_f:
                continue
            if not matches_referral_filter(row, referral_f):
                continue
            if search_q:
                company = row.get("Company", "").lower()
                role = row.get("Role", "").lower()
                if search_q not in company and search_q not in role:
                    continue
            if ref_search_q:
                ref_names = row.get("Referral Names", "").lower()
                if ref_search_q not in ref_names:
                    continue

            self.filtered_indices.append(i)
            tag = status.replace(" ", "_")
            self.tree.insert(
                "", END, iid=str(i),
                values=(
                    row.get("Company", ""),
                    row.get("Role", ""),
                    status,
                    row.get("Date Applied", ""),
                ),
                tags=(tag,),
            )

        if self.selected_idx is not None and str(self.selected_idx) in self.tree.get_children():
            self.tree.selection_set(str(self.selected_idx))

        # Update status bar
        filtered = len(self.filtered_indices)
        total = len(self.rows)
        if filtered == total:
            self.list_status_bar.config(text=f"{total} jobs")
        else:
            self.list_status_bar.config(text=f"Showing {filtered} of {total} jobs")

    # -----------------------------------------------------------------------
    # Detail panel
    # -----------------------------------------------------------------------
    def _clear_detail(self):
        self.detail_header.config(text="No job selected")
        self.detail_status_badge.config(text="", bootstyle="secondary")
        self.selected_idx = None
        for label, widget in self.field_widgets.items():
            if isinstance(widget, tk.Text):
                widget.delete("1.0", END)
            elif isinstance(widget, ttk.Combobox):
                widget.set("")
            else:
                widget.delete(0, END)
        for w in self.referral_rows_frame.winfo_children():
            w.destroy()
        self._selected_referral_idx = None
        self.incomplete_frame.pack_forget()
        self.next_step_frame.pack_forget()

    def _load_detail(self, row):
        company = row.get("Company", "")
        role = row.get("Role", "")
        self.detail_header.config(text=f"{company}  -  {role}")

        # Update status badge
        status = row.get("Application Status", "Not Yet Applied")
        badge_style = STATUS_BOOTSTYLES.get(status, "secondary") + "-inverse"
        self.detail_status_badge.config(text=f" {status} ", bootstyle=badge_style)

        field_to_csv = {
            "Application Status": "Application Status",
            "Date Applied": "Date Applied",
            "Location": "Location",
            "Resume Version": "Resume Version",
            "Job ID": "Job ID",
            "Job URL": "Job URL",
            "Cover Letter Written": "Cover Letter Written",
            "Cover Letter File": "Cover Letter File",
            "Referral Names": "Referral Names",
            "Referral Statuses": "Referral Statuses",
            "Referral Connections": "Referral Connections",
            "Referral LinkedIns": "Referral LinkedIns",
            "Notes": "Notes",
        }

        for label, csv_field in field_to_csv.items():
            widget = self.field_widgets[label]
            value = row.get(csv_field, "")
            if isinstance(widget, tk.Text):
                widget.delete("1.0", END)
                widget.insert("1.0", value)
            elif isinstance(widget, ttk.Combobox):
                widget.set(value)
            else:
                widget.delete(0, END)
                widget.insert(0, value)

        self._refresh_referral_display(row)

        # Incomplete fields bar
        missing = incomplete_fields(row)
        if missing:
            self.incomplete_label.config(
                text="\u26a0  Missing: " + ", ".join(missing),
            )
            self.incomplete_frame.pack_forget()
            self.incomplete_frame.pack(
                fill=X, padx=4, pady=(0, 2),
                after=self.header_frame,
            )
        else:
            self.incomplete_frame.pack_forget()

        # Next step banner
        self._update_next_step_banner(row)

    def _set_today(self):
        self.date_entry.delete(0, END)
        self.date_entry.insert(0, datetime.now().strftime("%Y-%m-%d"))

    def _browse_file(self, entry_widget, title, filetypes):
        path = filedialog.askopenfilename(
            title=f"Select {title}", filetypes=filetypes,
        )
        if not path:
            return
        filename = os.path.basename(path)
        entry_widget.delete(0, END)
        entry_widget.insert(0, filename)
        if "Cover Letter" in title:
            self.field_widgets["Cover Letter Written"].set("Yes")

    def _refresh_referral_display(self, row):
        names = parse_semicolons(row.get("Referral Names", ""))
        connections = parse_semicolons(row.get("Referral Connections", ""))
        statuses = parse_semicolons(row.get("Referral Statuses", ""))
        linkedins = parse_semicolons(row.get("Referral LinkedIns", ""))

        # Clear existing rows
        for w in self.referral_rows_frame.winfo_children():
            w.destroy()
        self._selected_referral_idx = None

        if not names:
            ttk.Label(
                self.referral_rows_frame, text="No referrals yet.",
                bootstyle="secondary", font=("", 9),
            ).pack(anchor="w", pady=4)
            return

        link_font = tkfont.Font(size=9, underline=True)

        for i, name in enumerate(names):
            conn = connections[i] if i < len(connections) else ""
            stat = statuses[i] if i < len(statuses) else ""
            li_url = linkedins[i].strip() if i < len(linkedins) else ""

            row_frame = ttk.Frame(self.referral_rows_frame)
            row_frame.pack(fill=X, pady=1)

            name_lbl = ttk.Label(row_frame, text=name, anchor="w")
            name_lbl.pack(side=LEFT, expand=True, fill=X)

            ttk.Separator(row_frame, orient=VERTICAL).pack(
                side=LEFT, fill=Y, padx=6, pady=2,
            )
            conn_lbl = ttk.Label(row_frame, text=conn, anchor="w", width=12)
            conn_lbl.pack(side=LEFT)

            ttk.Separator(row_frame, orient=VERTICAL).pack(
                side=LEFT, fill=Y, padx=6, pady=2,
            )
            stat_lbl = ttk.Label(row_frame, text=stat, anchor="w")
            stat_lbl.pack(side=LEFT, expand=True, fill=X)

            # LinkedIn link (only if URL exists)
            if li_url:
                ttk.Separator(row_frame, orient=VERTICAL).pack(
                    side=LEFT, fill=Y, padx=6, pady=2,
                )
                li_lbl = ttk.Label(
                    row_frame, text="LinkedIn", font=link_font,
                    bootstyle="info", anchor="w", cursor="hand2", width=10,
                )
                li_lbl.pack(side=LEFT)
                li_lbl.bind("<Button-1>", lambda e, url=li_url: webbrowser.open(url))

            # Click to select this referral
            def _select(event, idx=i, frame=row_frame):
                # Deselect previous
                for child in self.referral_rows_frame.winfo_children():
                    child.configure(bootstyle="default")
                frame.configure(bootstyle="info")
                self._selected_referral_idx = idx

            selectable = [row_frame, name_lbl, conn_lbl, stat_lbl]
            for widget in selectable:
                widget.bind("<Button-1>", _select)
                widget.bind("<Double-1>", lambda e, idx=i: self._edit_referral_popup())

            # Add a thin separator between rows
            if i < len(names) - 1:
                ttk.Separator(self.referral_rows_frame).pack(fill=X, pady=1)

    # -----------------------------------------------------------------------
    # Next step banner
    # -----------------------------------------------------------------------
    def _update_next_step_banner(self, row):
        """Show a contextual 'next step' suggestion below the header area."""
        status = row.get("Application Status", "Not Yet Applied").strip()

        # Hide for closed statuses
        if status in ("Rejected", "Withdrawn"):
            self.next_step_frame.pack_forget()
            return

        # Check for un-messaged referral
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
        unmessaged_name = None
        for i, name in enumerate(ref_names):
            stat = ref_statuses[i].strip().lower() if i < len(ref_statuses) else ""
            if not stat or "not yet" in stat:
                unmessaged_name = name
                break

        next_text = None

        if unmessaged_name:
            next_text = f"\u27a4  Next: Message {unmessaged_name} on LinkedIn"
        elif status == "Not Yet Applied":
            cl = row.get("Cover Letter Written", "").strip().lower()
            rv = row.get("Resume Version", "").strip()
            if cl != "yes":
                next_text = "\u27a4  Next: Write cover letter"
            elif not rv:
                next_text = "\u27a4  Next: Choose resume version"
            else:
                next_text = "\u27a4  Next: Submit application"
        elif status == "Applied":
            date_str = row.get("Date Applied", "").strip()
            days_ago = None
            if date_str:
                try:
                    applied = datetime.strptime(date_str, "%Y-%m-%d")
                    days_ago = (datetime.now() - applied).days
                except ValueError:
                    pass
            if days_ago is not None and days_ago >= 21:
                next_text = "\u27a4  Next: Follow up on application"
            else:
                next_text = "\u27a4  Next: Waiting on response"
        elif status == "Interview":
            next_text = "\u27a4  Next: Prepare for interview"
        elif status == "Offer":
            next_text = "\u27a4  Next: Evaluate offer"

        if next_text:
            self.next_step_label.config(text=next_text)
            self.next_step_frame.pack_forget()
            # Pack after incomplete_frame if visible, else after header
            if self.incomplete_frame.winfo_manager():
                self.next_step_frame.pack(
                    fill=X, padx=4, pady=(0, 2),
                    after=self.incomplete_frame,
                )
            else:
                self.next_step_frame.pack(
                    fill=X, padx=4, pady=(0, 2),
                    after=self.header_frame,
                )
        else:
            self.next_step_frame.pack_forget()

    # -----------------------------------------------------------------------
    # Add referral popup
    # -----------------------------------------------------------------------
    REFERRAL_STATUS_OPTIONS = [
        "Not yet messaged",
        "Connect request sent",
        "Messaged",
        "Emailed + connected",
        "Responded - sent resume",
        "Responded - sharing internally",
        "Referral submitted",
    ]

    CONNECTION_OPTIONS = ["GT", "UCLA", ""]

    def _add_referral_popup(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        dlg = tk.Toplevel(self.root)
        dlg.title("Add Referral")
        dlg.transient(self.root)

        # Size and center on parent window
        w, h = 500, 360
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(400, 300)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        # Use a ttk.Frame inside the Toplevel for themed background
        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(body, text="Name:").grid(
            row=0, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        name_entry = ttk.Entry(body, width=32)
        name_entry.grid(row=0, column=1, sticky="ew", pady=(0, 6))
        name_entry.focus_set()

        ttk.Label(body, text="LinkedIn URL:").grid(
            row=1, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        li_entry = ttk.Entry(body, width=32)
        li_entry.grid(row=1, column=1, sticky="ew", pady=(0, 6))

        ttk.Label(body, text="Connection:").grid(
            row=2, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        conn_combo = ttk.Combobox(
            body, values=self.CONNECTION_OPTIONS, width=14,
        )
        conn_combo.grid(row=2, column=1, sticky="w", pady=(0, 6))

        ttk.Label(body, text="Status:").grid(
            row=3, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        status_combo = ttk.Combobox(
            body, values=self.REFERRAL_STATUS_OPTIONS, width=28,
            state="readonly",
        )
        status_combo.set("Not yet messaged")
        status_combo.grid(row=3, column=1, sticky="ew", pady=(0, 6))

        ttk.Label(body, text="Note:").grid(
            row=4, column=0, sticky="ne", padx=(0, 8), pady=(0, 6),
        )
        note_entry = ttk.Entry(body, width=32)
        note_entry.grid(row=4, column=1, sticky="ew", pady=(0, 6))

        body.columnconfigure(1, weight=1)

        def _add():
            name = name_entry.get().strip()
            if not name:
                messagebox.showwarning("Required", "Name is required.", parent=dlg)
                return

            row = self.rows[self.selected_idx]

            def append_field(field, value):
                existing = row.get(field, "").strip()
                if existing:
                    row[field] = existing + "; " + value
                else:
                    row[field] = value

            append_field("Referral Names", name)
            append_field("Referral LinkedIns", li_entry.get().strip())
            append_field("Referral Connections", conn_combo.get().strip())
            append_field("Referral Statuses", status_combo.get().strip())

            note = note_entry.get().strip()
            if note:
                existing_notes = row.get("Notes", "").strip()
                addition = f"[{name}] {note}"
                if existing_notes:
                    row["Notes"] = existing_notes + " " + addition
                else:
                    row["Notes"] = addition
                # Update Notes widget if it's loaded in the detail tab
                notes_widget = self.field_widgets.get("Notes")
                if notes_widget:
                    notes_widget.delete("1.0", END)
                    notes_widget.insert("1.0", row["Notes"])

            for field in ("Referral Names", "Referral LinkedIns",
                          "Referral Connections", "Referral Statuses"):
                w = self.field_widgets[field]
                w.delete(0, END)
                w.insert(0, row[field])

            try:
                write_tracker(self.csv_path, self.rows)
            except Exception as e:
                messagebox.showerror("Save failed", str(e), parent=dlg)
                return

            self._refresh_referral_display(row)
            self._refresh_list()

            missing = incomplete_fields(row)
            if missing:
                self.incomplete_label.config(
                    text="\u26a0  Missing: " + ", ".join(missing),
                )
                self.incomplete_frame.pack_forget()
                self.incomplete_frame.pack(
                    fill=X, padx=4, pady=(0, 2), after=self.header_frame,
                )
            else:
                self.incomplete_frame.pack_forget()

            dlg.destroy()

        btn_frame = ttk.Frame(body)
        btn_frame.grid(row=5, column=0, columnspan=2, pady=(12, 0))
        ttk.Button(
            btn_frame, text="Add", command=_add,
            bootstyle="success", padding=(16, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(16, 4),
        ).pack(side=LEFT)
        dlg.bind("<Return>", lambda e: _add())

    # -----------------------------------------------------------------------
    # Edit referral popup
    # -----------------------------------------------------------------------
    def _edit_referral_popup(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        if self._selected_referral_idx is None:
            messagebox.showwarning("No referral selected", "Click a referral to select it, then click Edit.")
            return

        ref_idx = self._selected_referral_idx
        row = self.rows[self.selected_idx]

        names = parse_semicolons(row.get("Referral Names", ""))
        linkedins = parse_semicolons(row.get("Referral LinkedIns", ""))
        connections = parse_semicolons(row.get("Referral Connections", ""))
        statuses = parse_semicolons(row.get("Referral Statuses", ""))

        cur_name = names[ref_idx] if ref_idx < len(names) else ""
        cur_li = linkedins[ref_idx] if ref_idx < len(linkedins) else ""
        cur_conn = connections[ref_idx] if ref_idx < len(connections) else ""
        cur_stat = statuses[ref_idx] if ref_idx < len(statuses) else ""

        dlg = tk.Toplevel(self.root)
        dlg.title(f"Edit Referral - {cur_name}")
        dlg.transient(self.root)

        w, h = 500, 320
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(400, 280)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(body, text="Name:").grid(
            row=0, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        name_entry = ttk.Entry(body, width=32)
        name_entry.grid(row=0, column=1, sticky="ew", pady=(0, 6))
        name_entry.insert(0, cur_name)
        name_entry.focus_set()

        ttk.Label(body, text="LinkedIn URL:").grid(
            row=1, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        li_entry = ttk.Entry(body, width=32)
        li_entry.grid(row=1, column=1, sticky="ew", pady=(0, 6))
        li_entry.insert(0, cur_li)

        ttk.Label(body, text="Connection:").grid(
            row=2, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        conn_combo = ttk.Combobox(
            body, values=self.CONNECTION_OPTIONS, width=14,
        )
        conn_combo.set(cur_conn)
        conn_combo.grid(row=2, column=1, sticky="w", pady=(0, 6))

        ttk.Label(body, text="Status:").grid(
            row=3, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        status_combo = ttk.Combobox(
            body, values=self.REFERRAL_STATUS_OPTIONS, width=28,
            state="readonly",
        )
        if cur_stat in self.REFERRAL_STATUS_OPTIONS:
            status_combo.set(cur_stat)
        else:
            status_combo.set(cur_stat if cur_stat else "Not yet messaged")
        status_combo.grid(row=3, column=1, sticky="ew", pady=(0, 6))

        body.columnconfigure(1, weight=1)

        def _save():
            name = name_entry.get().strip()
            if not name:
                messagebox.showwarning("Required", "Name is required.", parent=dlg)
                return

            # Pad lists to match ref_idx if needed
            while len(names) <= ref_idx:
                names.append("")
            while len(linkedins) <= ref_idx:
                linkedins.append("")
            while len(connections) <= ref_idx:
                connections.append("")
            while len(statuses) <= ref_idx:
                statuses.append("")

            names[ref_idx] = name
            linkedins[ref_idx] = li_entry.get().strip()
            connections[ref_idx] = conn_combo.get().strip()
            statuses[ref_idx] = status_combo.get().strip()

            row["Referral Names"] = "; ".join(names)
            row["Referral LinkedIns"] = "; ".join(linkedins)
            row["Referral Connections"] = "; ".join(connections)
            row["Referral Statuses"] = "; ".join(statuses)

            for field in ("Referral Names", "Referral LinkedIns",
                          "Referral Connections", "Referral Statuses"):
                widget = self.field_widgets[field]
                widget.delete(0, END)
                widget.insert(0, row[field])

            try:
                write_tracker(self.csv_path, self.rows)
            except Exception as e:
                messagebox.showerror("Save failed", str(e), parent=dlg)
                return

            self._refresh_referral_display(row)
            self._refresh_list()
            dlg.destroy()

        btn_frame = ttk.Frame(body)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=(12, 0))
        ttk.Button(
            btn_frame, text="Save", command=_save,
            bootstyle="success", padding=(16, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(16, 4),
        ).pack(side=LEFT)
        dlg.bind("<Return>", lambda e: _save())

    # -----------------------------------------------------------------------
    # Draft LinkedIn message popup
    # -----------------------------------------------------------------------
    def _draft_message_popup(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        if self._selected_referral_idx is None:
            messagebox.showwarning(
                "No referral selected",
                "Click a referral to select it, then click Draft Message.",
            )
            return

        ref_idx = self._selected_referral_idx
        row = self.rows[self.selected_idx]

        names = parse_semicolons(row.get("Referral Names", ""))
        connections = parse_semicolons(row.get("Referral Connections", ""))

        name = names[ref_idx] if ref_idx < len(names) else ""
        conn = connections[ref_idx] if ref_idx < len(connections) else ""
        first_name = name.split()[0] if name else "there"

        company = row.get("Company", "the company")
        role = row.get("Role", "the role")

        # Generate message based on connection type
        conn_lower = conn.strip().lower()
        if conn_lower == "gt":
            message = (
                f"Hi {first_name}, I hope you're doing well! "
                f"I am also a GT MS student, finishing up this June. "
                f"I came across the {role} role at {company} and it really "
                f"stood out to me. How has your experience been? "
                f"If you are open to it, I would greatly appreciate a referral."
            )
        elif conn_lower == "ucla":
            message = (
                f"Hi {first_name}, I hope you're doing well! "
                f"I am also a UCLA alum, finishing up my MS at Georgia Tech "
                f"this June. I came across the {role} role at {company} and "
                f"it really stood out to me. How has your experience been? "
                f"If you are open to it, I would greatly appreciate a referral."
            )
        else:
            message = (
                f"Hi {first_name}, I hope you're doing well! "
                f"I am finishing up my MS at Georgia Tech this June. "
                f"I came across the {role} role at {company} and it really "
                f"stood out to me. How has your experience been? "
                f"If you are open to it, I would greatly appreciate a referral."
            )

        # Build popup
        dlg = tk.Toplevel(self.root)
        dlg.title(f"Draft Message - {name}")
        dlg.transient(self.root)

        w, h = 520, 320
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(400, 260)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text=f"LinkedIn message for {name}",
            font=("", 11, "bold"), bootstyle="info",
        ).pack(anchor="w", pady=(0, 8))

        text_widget = tk.Text(
            body, wrap=tk.WORD, font=("", 10), height=8,
            bg=str(self.colors.inputbg),
            fg=str(self.colors.inputfg),
            insertbackground=str(self.colors.inputfg),
            selectbackground=str(self.colors.selectbg),
            selectforeground=str(self.colors.selectfg),
            relief="flat", borderwidth=2,
        )
        text_widget.insert("1.0", message)
        text_widget.configure(state="disabled")
        text_widget.pack(fill=BOTH, expand=True, pady=(0, 8))

        btn_frame = ttk.Frame(body)
        btn_frame.pack(fill=X)

        copy_btn = ttk.Button(
            btn_frame, text="Copy to Clipboard",
            bootstyle="success", padding=(12, 4),
        )
        copy_btn.pack(side=LEFT, padx=(0, 6))

        def _copy():
            content = text_widget.get("1.0", END).strip()
            self.root.clipboard_clear()
            self.root.clipboard_append(content)
            copy_btn.config(text="Copied!")
            dlg.after(1500, lambda: copy_btn.config(text="Copy to Clipboard"))

        copy_btn.config(command=_copy)

        edit_btn = ttk.Button(
            btn_frame, text="Edit",
            bootstyle="info-outline", padding=(12, 4),
        )
        edit_btn.pack(side=LEFT, padx=(0, 6))

        def _toggle_edit():
            if text_widget.cget("state") == "disabled":
                text_widget.configure(state="normal")
                edit_btn.config(text="Lock")
            else:
                text_widget.configure(state="disabled")
                edit_btn.config(text="Edit")

        edit_btn.config(command=_toggle_edit)

        ttk.Button(
            btn_frame, text="Close", command=dlg.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=RIGHT)

    # -----------------------------------------------------------------------
    # Fetch confirmation popup (shared by New Job + Detail tab)
    # -----------------------------------------------------------------------
    def _show_fetch_results(self, details, parent, apply_callback):
        """Show what was fetched and let the user pick which fields to apply.

        details: dict from fetch_job_details()
        parent: the parent window (dialog or root)
        apply_callback: called with a dict of only the checked fields
        """
        # Filter to fields that actually have values
        field_labels = {
            "company": "Company",
            "role": "Role",
            "location": "Location",
            "job_id": "Job ID",
        }
        found = {k: v for k, v in details.items() if v and k in field_labels}

        if not found:
            messagebox.showinfo(
                "No data found",
                "Could not extract any job details from this URL.",
                parent=parent,
            )
            return

        dlg = tk.Toplevel(parent)
        dlg.title("Fetched Job Details")
        dlg.transient(parent)
        dlg.grab_set()
        dlg.attributes("-topmost", True)

        w, h = 420, 60 + len(found) * 40 + 50
        px = parent.winfo_rootx() + (parent.winfo_width() - w) // 2
        py = parent.winfo_rooty() + (parent.winfo_height() - h) // 2
        dlg.geometry(f"{w}x{h}+{px}+{py}")
        dlg.resizable(False, False)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text="Check the fields you want to apply:",
            font=("", 10), bootstyle="secondary",
        ).pack(anchor="w", pady=(0, 8))

        checks = {}
        for key, value in found.items():
            var = tk.BooleanVar(value=True)
            cb = ttk.Checkbutton(
                body,
                text=f"{field_labels[key]}:  {value}",
                variable=var,
                bootstyle="round-toggle",
            )
            cb.pack(anchor="w", pady=2)
            checks[key] = var

        def _apply():
            selected = {k: details[k] for k, var in checks.items() if var.get()}
            dlg.destroy()
            if selected:
                apply_callback(selected)

        btn_frame = ttk.Frame(body)
        btn_frame.pack(pady=(12, 0))
        ttk.Button(
            btn_frame, text="Apply", command=_apply,
            bootstyle="success", padding=(16, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(16, 4),
        ).pack(side=LEFT)

    # -----------------------------------------------------------------------
    # Fetch from Detail tab's Job URL field
    # -----------------------------------------------------------------------
    def _fetch_from_detail_url(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        url = self.field_widgets["Job URL"].get().strip()
        if not url:
            messagebox.showwarning("No URL", "Enter a URL in the Job URL field first.")
            return

        # Map fetch result keys to Detail tab field widgets
        widget_map = {
            "company": None,       # Company is in the header, not an editable field
            "role": None,          # Same for Role
            "location": "Location",
            "job_id": "Job ID",
        }

        def _apply_fields(selected):
            for key, value in selected.items():
                field_name = widget_map.get(key)
                if not field_name:
                    continue
                widget = self.field_widgets.get(field_name)
                if widget:
                    widget.delete(0, END)
                    widget.insert(0, value)

        def _background():
            try:
                details = fetch_job_details(url)
            except Exception as e:
                self.root.after(0, lambda: messagebox.showwarning(
                    "Fetch failed",
                    f"Could not extract job details:\n{e}",
                ))
                return
            self.root.after(0, lambda: self._show_fetch_results(
                details, self.root, _apply_fields,
            ))

        threading.Thread(target=_background, daemon=True).start()

    # -----------------------------------------------------------------------
    # Save current job
    # -----------------------------------------------------------------------
    def _save_current(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        row = self.rows[self.selected_idx]

        date_val = self.field_widgets["Date Applied"].get().strip()
        if date_val:
            try:
                datetime.strptime(date_val, "%Y-%m-%d")
            except ValueError:
                messagebox.showerror(
                    "Invalid date",
                    f"'{date_val}' is not a valid date. Use YYYY-MM-DD.",
                )
                return

        field_to_csv = {
            "Application Status": "Application Status",
            "Date Applied": "Date Applied",
            "Location": "Location",
            "Resume Version": "Resume Version",
            "Job ID": "Job ID",
            "Job URL": "Job URL",
            "Cover Letter Written": "Cover Letter Written",
            "Cover Letter File": "Cover Letter File",
            "Referral Names": "Referral Names",
            "Referral Statuses": "Referral Statuses",
            "Referral Connections": "Referral Connections",
            "Referral LinkedIns": "Referral LinkedIns",
            "Notes": "Notes",
        }

        for label, csv_field in field_to_csv.items():
            widget = self.field_widgets[label]
            if isinstance(widget, tk.Text):
                row[csv_field] = widget.get("1.0", END).strip()
            elif isinstance(widget, ttk.Combobox):
                row[csv_field] = widget.get()
            else:
                row[csv_field] = widget.get().strip()

        if row["Date Applied"] and row["Application Status"] == "Not Yet Applied":
            row["Application Status"] = "Applied"
            self.field_widgets["Application Status"].set("Applied")

        try:
            write_tracker(self.csv_path, self.rows)
        except Exception as e:
            messagebox.showerror("Save failed", str(e))
            return

        self._refresh_list()
        self._load_detail(row)

    # -----------------------------------------------------------------------
    # New job dialog
    # -----------------------------------------------------------------------
    def _new_job(self):
        if self.csv_path is None:
            messagebox.showwarning("No file", "Open a CSV file first.")
            return

        dlg = tk.Toplevel(self.root)
        dlg.title("New Job")
        dlg.transient(self.root)
        dlg.grab_set()

        # Size and center on parent window
        w, h = 480, 260
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(400, 240)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        # Row 0: URL + Fetch
        ttk.Label(body, text="URL:").grid(
            row=0, column=0, padx=(0, 8), pady=(0, 6), sticky="e",
        )
        url_frame = ttk.Frame(body)
        url_frame.grid(row=0, column=1, pady=(0, 6), sticky="ew")
        url_entry = ttk.Entry(url_frame, width=34)
        url_entry.pack(side=LEFT, fill=X, expand=True)
        url_entry.focus_set()

        fetch_btn = ttk.Button(url_frame, text="Fetch", bootstyle="info", padding=(8, 2))
        fetch_btn.pack(side=LEFT, padx=(6, 0))

        # Row 1: Company
        ttk.Label(body, text="Company:").grid(
            row=1, column=0, padx=(0, 8), pady=(0, 6), sticky="e",
        )
        company_entry = ttk.Entry(body, width=34)
        company_entry.grid(row=1, column=1, pady=(0, 6), sticky="ew")

        # Row 2: Role
        ttk.Label(body, text="Role:").grid(
            row=2, column=0, padx=(0, 8), pady=(0, 6), sticky="e",
        )
        role_entry = ttk.Entry(body, width=34)
        role_entry.grid(row=2, column=1, pady=(0, 6), sticky="ew")

        # Row 3: Location
        ttk.Label(body, text="Location:").grid(
            row=3, column=0, padx=(0, 8), pady=(0, 6), sticky="e",
        )
        location_entry = ttk.Entry(body, width=34)
        location_entry.grid(row=3, column=1, pady=(0, 6), sticky="ew")

        body.columnconfigure(1, weight=1)

        # --- Fetch logic (threaded) ---
        def _do_fetch():
            raw_url = url_entry.get().strip()
            if not raw_url:
                messagebox.showwarning("No URL", "Paste a URL first.", parent=dlg)
                return

            fetch_btn.config(text="Fetching...", state="disabled")

            def _background():
                try:
                    details = fetch_job_details(raw_url)
                except Exception as e:
                    dlg.after(0, lambda: _on_fetch_error(str(e)))
                    return
                dlg.after(0, lambda: _on_fetch_done(details))

            def _on_fetch_done(details):
                fetch_btn.config(text="Fetch", state="normal")
                entry_map = {
                    "company": company_entry,
                    "role": role_entry,
                    "location": location_entry,
                }

                def _apply_fields(selected):
                    for key, value in selected.items():
                        entry = entry_map.get(key)
                        if entry:
                            entry.delete(0, END)
                            entry.insert(0, value)

                self._show_fetch_results(details, dlg, _apply_fields)

            def _on_fetch_error(msg):
                fetch_btn.config(text="Fetch", state="normal")
                messagebox.showwarning(
                    "Fetch failed",
                    f"Could not extract job details:\n{msg}",
                    parent=dlg,
                )

            threading.Thread(target=_background, daemon=True).start()

        fetch_btn.config(command=_do_fetch)
        url_entry.bind("<Return>", lambda e: _do_fetch())

        # --- Add logic ---
        def _add():
            company = company_entry.get().strip()
            role = role_entry.get().strip()
            if not company or not role:
                messagebox.showwarning(
                    "Required", "Company and Role are required.", parent=dlg,
                )
                return
            new_row = {field: "" for field in FIELDNAMES}
            new_row["Company"] = company
            new_row["Role"] = role
            new_row["Location"] = location_entry.get().strip()
            new_row["Job URL"] = url_entry.get().strip()
            new_row["Application Status"] = "Not Yet Applied"
            new_row["Cover Letter Written"] = "No"
            self.rows.append(new_row)
            try:
                write_tracker(self.csv_path, self.rows)
            except Exception as e:
                messagebox.showerror("Save failed", str(e), parent=dlg)
                self.rows.pop()
                return
            dlg.destroy()
            self._refresh_list()
            # Select and open the new job in detail tab
            new_idx = len(self.rows) - 1
            self.selected_idx = new_idx
            if str(new_idx) in self.tree.get_children():
                self.tree.selection_set(str(new_idx))
                self.tree.see(str(new_idx))
            self._load_detail(self.rows[new_idx])
            self.notebook.select(self.tab_detail)

        ttk.Button(
            body, text="Add", command=_add,
            bootstyle="success", padding=(16, 4),
        ).grid(row=4, column=0, columnspan=2, pady=(12, 0))
        # Enter in company/role/location fields triggers Add
        company_entry.bind("<Return>", lambda e: _add())
        role_entry.bind("<Return>", lambda e: _add())
        location_entry.bind("<Return>", lambda e: _add())

    # -----------------------------------------------------------------------
    # Remove job
    # -----------------------------------------------------------------------
    def _remove_job(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        idx = int(sel[0])
        row = self.rows[idx]
        company = row.get("Company", "")
        role = row.get("Role", "")

        if not messagebox.askyesno("Confirm removal", f"Remove {company} - {role}?"):
            return

        self.rows.pop(idx)
        try:
            write_tracker(self.csv_path, self.rows)
        except Exception as e:
            messagebox.showerror("Save failed", str(e))
            return

        self.selected_idx = None
        self._refresh_list()
        self._clear_detail()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    root = ttk.Window(
        title="Job Tracker",
        themename=THEME,
        size=(960, 700),
        minsize=(800, 550),
    )
    app = TrackerApp(root)

    if getattr(sys, 'frozen', False):
        script_dir = os.path.dirname(sys.executable)
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
    default_csv = os.path.join(script_dir, "job_tracker.csv")
    parent_csv = os.path.normpath(os.path.join(script_dir, "..", "job_tracker.csv"))
    # Check parent directory first (handles running from dist/)
    if os.path.exists(parent_csv):
        app._load_file(parent_csv)
    elif os.path.exists(default_csv):
        app._load_file(default_csv)

    root.mainloop()


if __name__ == "__main__":
    main()
