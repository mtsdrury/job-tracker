"""TrackerApp: main application class composed from mixin modules."""

import json
import os
import re
import tkinter as tk
import urllib.parse
import webbrowser
from tkinter import messagebox, filedialog

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import read_tracker
from gui.constants import (
    PAD_INNER, CONFIG_FILENAME,
    DEFAULT_TONE_TEMPLATES, DEFAULT_CONNECTIONS, DEFAULT_CONNECTION_LINE,
    DEFAULT_ACTION_STATUSES, DEFAULT_STRATEGY_MODE, STRATEGY_TIMERS,
    STRATEGY_MODES, PATIENCE_PRESETS, DEFAULT_STALLED_DAYS,
)
from gui.list_tab import ListTabMixin
from gui.detail_tab import DetailTabMixin
from gui.summary_tab import SummaryTabMixin
from gui.actions_tab import ActionsMixin
from gui.action_wizard import ActionWizardMixin
from gui.referrals import ReferralsMixin
from gui.templates import TemplatesMixin
from gui.popups import PopupsMixin
from gui.pipeline import PipelineMixin
from gui.kanban_tab import KanbanMixin
from gui.analytics_tab import AnalyticsMixin
from gui.chat_tab import ChatMixin


class TrackerApp(ListTabMixin, DetailTabMixin, SummaryTabMixin, ActionsMixin,
                 ActionWizardMixin, ReferralsMixin, TemplatesMixin, PopupsMixin,
                 PipelineMixin, KanbanMixin, AnalyticsMixin, ChatMixin):

    def __init__(self, root):
        self.root = root

        # Theme colors for tk-only widgets (Text, Canvas)
        self.colors = self.root.style.colors

        self.csv_path = None
        self.rows = []
        self.filtered_indices = []
        self.selected_idx = None
        self._schools = []  # list of {"name": ..., "linkedin_id": ...}
        self._resume_versions = ["Data Scientist", "ML Builder", "Research Engineer"]
        self._connections = list(DEFAULT_CONNECTIONS)
        self._default_connection_line = DEFAULT_CONNECTION_LINE
        self._tone_templates = list(DEFAULT_TONE_TEMPLATES)
        self._action_statuses = list(DEFAULT_ACTION_STATUSES)
        self._strategy_mode = DEFAULT_STRATEGY_MODE
        self._stalled_days = DEFAULT_STALLED_DAYS

        self.field_widgets = {}

        self._build_ui()

    # -------------------------------------------------------------------
    # UI construction
    # -------------------------------------------------------------------
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
        ttk.Button(
            top, text="Schools", command=self._manage_schools,
            bootstyle="secondary-outline",
        ).pack(side=RIGHT, padx=(0, 6))
        ttk.Button(
            top, text="Resumes", command=self._manage_resume_versions,
            bootstyle="secondary-outline",
        ).pack(side=RIGHT, padx=(0, 6))
        ttk.Button(
            top, text="Actions", command=self._manage_action_statuses,
            bootstyle="secondary-outline",
        ).pack(side=RIGHT, padx=(0, 6))
        ttk.Button(
            top, text="Strategy", command=self._manage_strategy,
            bootstyle="secondary-outline",
        ).pack(side=RIGHT, padx=(0, 6))
        ttk.Button(
            top, text="Templates", command=self._manage_templates,
            bootstyle="secondary-outline",
        ).pack(side=RIGHT, padx=(0, 6))

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

        # Tab 3: Actions
        self.tab_actions = ttk.Frame(self.notebook, padding=6)
        self.notebook.add(self.tab_actions, text="  Actions  ")

        # Tab 4: Summary
        self.tab_summary = ttk.Frame(self.notebook, padding=6)
        self.notebook.add(self.tab_summary, text="  Analytics  ")

        # Tab 5: Chat
        self.tab_chat = ttk.Frame(self.notebook, padding=6)
        self.notebook.add(self.tab_chat, text="  Chat  ")

        self._build_list_tab()
        self._build_detail_tab()
        self._build_actions_tab()
        self._build_summary_tab()
        self._build_chat_tab()

        # Refresh summary when its tab is selected
        self.notebook.bind("<<NotebookTabChanged>>", self._on_tab_changed)

        # Global mousewheel handler (routes to active tab's canvas)
        self.root.bind_all("<MouseWheel>", self._on_mousewheel)
        self.root.bind_all("<Button-4>", self._on_mousewheel)
        self.root.bind_all("<Button-5>", self._on_mousewheel)

    def _on_mousewheel(self, event):
        """Route mousewheel events to the active tab's scrollable canvas."""
        current_tab = self.notebook.index(self.notebook.select())
        if current_tab == 0 and getattr(self, '_current_view', 'list') == 'kanban':
            self._on_kanban_mousewheel(event)
            return
        if current_tab == 1:
            canvas = self.detail_canvas
        elif current_tab == 2:
            canvas = self.actions_canvas
        elif current_tab == 3:
            canvas = self.summary_canvas
        else:
            return

        if event.num == 4:
            canvas.yview_scroll(-3, "units")
        elif event.num == 5:
            canvas.yview_scroll(3, "units")
        else:
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    # -------------------------------------------------------------------
    # Tab switching
    # -------------------------------------------------------------------
    def _on_tab_changed(self, event):
        current = self.notebook.index(self.notebook.select())
        if current == 2:  # Actions tab
            self._refresh_actions()
        elif current == 3:  # Summary tab
            self._refresh_summary()


    def _on_double_click(self, event):
        """Double-click a job in the list to open it in the detail tab."""
        tree = event.widget
        sel = tree.selection()
        if not sel:
            return
        idx = int(sel[0])
        self.selected_idx = idx
        self._load_detail(self.rows[idx])
        self.notebook.select(self.tab_detail)

    def _open_selected(self):
        """Button: open the selected job in the detail tab."""
        result = self._get_selection()
        if not result:
            messagebox.showwarning("No selection", "Select a job first.")
            return
        _tree, iid = result
        idx = int(iid)
        self.selected_idx = idx
        self._load_detail(self.rows[idx])
        self.notebook.select(self.tab_detail)

    # -------------------------------------------------------------------
    # File operations
    # -------------------------------------------------------------------
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
        self._load_config()
        self._refresh_list()
        self._clear_detail()

    # -------------------------------------------------------------------
    # Config (schools, etc.) - stored as JSON next to the CSV
    # -------------------------------------------------------------------
    def _config_path(self):
        if not self.csv_path:
            return None
        return os.path.join(os.path.dirname(self.csv_path), CONFIG_FILENAME)

    def _load_config(self):
        path = self._config_path()
        if not path or not os.path.exists(path):
            self._schools = []
            self._resume_versions = ["Data Scientist", "ML Builder", "Research Engineer"]
            self._connections = list(DEFAULT_CONNECTIONS)
            self._default_connection_line = DEFAULT_CONNECTION_LINE
            self._tone_templates = list(DEFAULT_TONE_TEMPLATES)
            self._action_statuses = list(DEFAULT_ACTION_STATUSES)
            self._strategy_mode = DEFAULT_STRATEGY_MODE
            self._stalled_days = DEFAULT_STALLED_DAYS
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._schools = data.get("schools", [])
            saved_versions = data.get("resume_versions")
            if saved_versions:
                self._resume_versions = saved_versions
            saved_connections = data.get("connections")
            if saved_connections is not None:
                self._connections = saved_connections
            else:
                self._connections = list(DEFAULT_CONNECTIONS)
            self._default_connection_line = data.get(
                "default_connection_line", DEFAULT_CONNECTION_LINE,
            )
            saved_templates = data.get("tone_templates")
            if saved_templates:
                self._tone_templates = saved_templates
            else:
                self._tone_templates = list(DEFAULT_TONE_TEMPLATES)
            saved_action_statuses = data.get("action_statuses")
            if saved_action_statuses is not None:
                self._action_statuses = saved_action_statuses
            else:
                self._action_statuses = list(DEFAULT_ACTION_STATUSES)
            saved_strategy = data.get("strategy_mode")
            if saved_strategy in STRATEGY_TIMERS:
                self._strategy_mode = saved_strategy
            else:
                self._strategy_mode = DEFAULT_STRATEGY_MODE
            self._stalled_days = data.get("stalled_days", DEFAULT_STALLED_DAYS)
        except (json.JSONDecodeError, OSError):
            self._schools = []
            self._resume_versions = ["Data Scientist", "ML Builder", "Research Engineer"]
            self._connections = list(DEFAULT_CONNECTIONS)
            self._default_connection_line = DEFAULT_CONNECTION_LINE
            self._tone_templates = list(DEFAULT_TONE_TEMPLATES)
            self._action_statuses = list(DEFAULT_ACTION_STATUSES)
            self._strategy_mode = DEFAULT_STRATEGY_MODE
            self._stalled_days = DEFAULT_STALLED_DAYS
        self._update_resume_combo()
        self._update_action_status_combo()

    def _save_config(self):
        path = self._config_path()
        if not path:
            return
        data = {
            "schools": self._schools,
            "resume_versions": self._resume_versions,
            "connections": self._connections,
            "default_connection_line": self._default_connection_line,
            "tone_templates": self._tone_templates,
            "action_statuses": self._action_statuses,
            "strategy_mode": self._strategy_mode,
            "stalled_days": self._stalled_days,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def _update_resume_combo(self):
        """Refresh the Resume Version combobox values from config."""
        w = self.field_widgets.get("Resume Version")
        if w and isinstance(w, ttk.Combobox):
            w["values"] = self._resume_versions + [""]

    def _update_action_status_combo(self):
        """Refresh the Action Status combobox values from config."""
        w = self.field_widgets.get("Action Status")
        if w and isinstance(w, ttk.Combobox):
            w["values"] = self._action_statuses + [""]

    @property
    def _follow_up_days(self):
        """Number of days before a referral outreach triggers a follow-up nudge."""
        return self._stalled_days

    # -------------------------------------------------------------------
    # LinkedIn alumni search
    # -------------------------------------------------------------------
    def _open_alumni_search(self, company):
        """Open LinkedIn people search filtered to configured school alumni.

        Uses the schoolFilter URL parameter with numeric school entity IDs.
        Falls back to a generic people search if no schools are configured.
        """
        query = urllib.parse.quote(company)
        ids = [s["linkedin_id"] for s in self._schools if s.get("linkedin_id")]
        if not ids:
            webbrowser.open(
                f"https://www.linkedin.com/search/results/people/?company={query}",
            )
            return
        # schoolFilter format: ["id1","id2"] URL-encoded
        filter_value = "[" + ",".join(f'"{i}"' for i in ids) + "]"
        encoded_filter = urllib.parse.quote(filter_value, safe="")
        webbrowser.open(
            f"https://www.linkedin.com/search/results/people/"
            f"?company={query}&schoolFilter={encoded_filter}",
        )

    # -------------------------------------------------------------------
    # Schools management popup
    # -------------------------------------------------------------------
    def _manage_schools(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Your Schools")
        dlg.grab_set()

        w, h = 620, 580
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(440, 420)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text="Schools",
            font=("", 13, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text="LinkedIn search results will be filtered to alumni of these schools.",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(0, 8))

        # Scrollable school list
        list_frame = ttk.Frame(body)
        list_frame.pack(fill=BOTH, expand=True, pady=(0, 8))

        def _rebuild_list():
            for child in list_frame.winfo_children():
                child.destroy()
            if not self._schools:
                ttk.Label(
                    list_frame, text="No schools added yet.",
                    bootstyle="secondary", font=("", 9),
                ).pack(anchor="w", pady=4)
                return
            for i, school in enumerate(self._schools):
                row = ttk.Frame(list_frame)
                row.pack(fill=X, pady=(0, 4))
                ttk.Label(
                    row, text=school["name"], font=("", 10, "bold"),
                ).pack(side=LEFT)
                ttk.Label(
                    row, text=f"  (ID: {school.get('linkedin_id', '?')})",
                    bootstyle="secondary", font=("", 9),
                ).pack(side=LEFT)
                ttk.Button(
                    row, text="x", bootstyle="danger-outline",
                    padding=(4, 0),
                    command=lambda idx=i: _remove(idx),
                ).pack(side=RIGHT)
                ttk.Separator(list_frame).pack(fill=X, pady=(0, 2))

        def _remove(idx):
            self._schools.pop(idx)
            self._save_config()
            _rebuild_list()

        _rebuild_list()

        # Add school form
        ttk.Separator(body).pack(fill=X, pady=(0, 8))
        ttk.Label(
            body, text="Add a school", font=("", 10, "bold"),
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text=(
                "To find a school's ID: search people on LinkedIn, add the school "
                "under Education filters, then paste the resulting URL below."
            ),
            bootstyle="secondary", font=("", 9), wraplength=500,
        ).pack(anchor="w", pady=(0, 6))

        add_grid = ttk.Frame(body)
        add_grid.pack(fill=X)
        add_grid.columnconfigure(1, weight=1)

        ttk.Label(add_grid, text="Name:").grid(
            row=0, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        name_entry = ttk.Entry(add_grid, width=30)
        name_entry.grid(row=0, column=1, sticky="ew", pady=(0, 4))
        name_entry.focus_set()

        ttk.Label(add_grid, text="URL or ID:").grid(
            row=1, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        id_entry = ttk.Entry(add_grid, width=30)
        id_entry.grid(row=1, column=1, sticky="ew", pady=(0, 4))

        ttk.Label(
            add_grid,
            text="Paste a LinkedIn search URL with schoolFilter, or a numeric ID",
            bootstyle="secondary", font=("", 8),
        ).grid(row=2, column=1, sticky="w")

        def _extract_school_id(raw):
            """Extract a school ID from a LinkedIn URL or bare numeric ID."""
            raw = raw.strip()
            # Bare numeric ID
            if raw.isdigit():
                return raw
            # URL with schoolFilter parameter
            decoded = urllib.parse.unquote(raw)
            if "schoolFilter" in decoded:
                match = re.search(r'schoolFilter=\[?"?(\d+)"?', decoded)
                if match:
                    return match.group(1)
            return None

        def _add():
            name = name_entry.get().strip()
            raw_id = id_entry.get().strip()
            if not name or not raw_id:
                messagebox.showwarning(
                    "Required",
                    "Both name and URL/ID are required.",
                    parent=dlg,
                )
                return
            school_id = _extract_school_id(raw_id)
            if not school_id:
                messagebox.showwarning(
                    "Invalid",
                    "Could not extract a school ID.\n\n"
                    "Paste a LinkedIn search URL that has a schoolFilter "
                    "parameter, or enter the numeric ID directly.",
                    parent=dlg,
                )
                return
            self._schools.append({"name": name, "linkedin_id": school_id})
            self._save_config()
            name_entry.delete(0, END)
            id_entry.delete(0, END)
            _rebuild_list()

        def _open_linkedin_search():
            webbrowser.open(
                "https://www.linkedin.com/search/results/people/",
            )

        btn_row = ttk.Frame(body)
        btn_row.pack(fill=X, pady=(8, 0))
        ttk.Button(
            btn_row, text="Add School", command=_add,
            bootstyle="success", padding=(12, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_row, text="Open LinkedIn Search",
            command=_open_linkedin_search,
            bootstyle="info-outline", padding=(12, 4),
        ).pack(side=LEFT)
        ttk.Button(
            btn_row, text="Close", command=dlg.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=RIGHT)

        name_entry.bind("<Return>", lambda e: id_entry.focus_set())
        id_entry.bind("<Return>", lambda e: _add())

    # -------------------------------------------------------------------
    # Strategy management popup
    # -------------------------------------------------------------------
    def _manage_strategy(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Job Search Strategy")
        dlg.grab_set()

        w, h = 520, 380
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(420, 320)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text="Job Search Strategy",
            font=("", 13, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text="Choose how you handle referral outreach. "
                 "This affects when jobs are flagged as stalled.",
            bootstyle="secondary", font=("", 9), wraplength=480,
        ).pack(anchor="w", pady=(0, 12))

        # Strategy mode
        ttk.Label(
            body, text="Strategy Mode",
            font=("", 11, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 6))

        selected_mode = [self._strategy_mode]
        mode_btns = {}
        mode_frame = ttk.Frame(body)
        mode_frame.pack(fill=X, pady=(0, 16))

        def _select_mode(key):
            selected_mode[0] = key
            for k, b in mode_btns.items():
                b.configure(
                    bootstyle="info" if k == key else "secondary-outline",
                )

        for key, info in STRATEGY_MODES.items():
            btn = ttk.Button(
                mode_frame,
                text=f"{info['label']}\n{info['description']}",
                bootstyle="info" if key == selected_mode[0] else "secondary-outline",
                padding=(16, 10),
                command=lambda k=key: _select_mode(k),
            )
            btn.pack(side=LEFT, padx=(0, 8))
            mode_btns[key] = btn

        # Patience preset
        ttk.Label(
            body, text="Stalled Threshold",
            font=("", 11, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text="Days without a response before a job is flagged as stalled.",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(0, 6))

        selected_days = [self._stalled_days]
        patience_btns = {}
        patience_frame = ttk.Frame(body)
        patience_frame.pack(fill=X, pady=(0, 16))

        def _select_days(days):
            selected_days[0] = days
            for d, b in patience_btns.items():
                b.configure(
                    bootstyle="info" if d == days else "secondary-outline",
                )

        for preset in PATIENCE_PRESETS:
            is_sel = preset["days"] == selected_days[0]
            btn = ttk.Button(
                patience_frame,
                text=preset["label"],
                bootstyle="info" if is_sel else "secondary-outline",
                padding=(16, 8),
                command=lambda p=preset: _select_days(p["days"]),
            )
            btn.pack(side=LEFT, padx=(0, 8))
            patience_btns[preset["days"]] = btn

        # Save / Close
        btn_row = ttk.Frame(body)
        btn_row.pack(fill=X, pady=(8, 0))

        def _save():
            self._strategy_mode = selected_mode[0]
            self._stalled_days = selected_days[0]
            self._save_config()
            dlg.destroy()
            self._refresh_actions()

        ttk.Button(
            btn_row, text="Save", command=_save,
            bootstyle="success", padding=(14, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_row, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=LEFT)

    # -------------------------------------------------------------------
    # Resume versions management popup
    # -------------------------------------------------------------------
    def _manage_resume_versions(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Resume Versions")
        dlg.grab_set()

        w, h = 500, 460
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(340, 300)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text="Resume Versions",
            font=("", 13, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text="Tip: name each one after the job title it targets "
                 "(e.g. \"Data Scientist\", \"ML Engineer\"). "
                 "These appear in the Resume Version dropdown and pipeline step.",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(0, 8))

        # Scrollable list
        list_frame = ttk.Frame(body)
        list_frame.pack(fill=BOTH, expand=True, pady=(0, 8))

        def _rebuild_list():
            for child in list_frame.winfo_children():
                child.destroy()
            if not self._resume_versions:
                ttk.Label(
                    list_frame, text="No resume versions added yet.",
                    bootstyle="secondary", font=("", 9),
                ).pack(anchor="w", pady=4)
                return
            for i, version in enumerate(self._resume_versions):
                row = ttk.Frame(list_frame)
                row.pack(fill=X, pady=(0, 4))
                ttk.Label(
                    row, text=version, font=("", 10, "bold"),
                ).pack(side=LEFT)
                ttk.Button(
                    row, text="x", bootstyle="danger-outline",
                    padding=(4, 0),
                    command=lambda idx=i: _remove(idx),
                ).pack(side=RIGHT)
                ttk.Separator(list_frame).pack(fill=X, pady=(0, 2))

        def _remove(idx):
            self._resume_versions.pop(idx)
            self._save_config()
            self._update_resume_combo()
            _rebuild_list()

        _rebuild_list()

        # Add form
        ttk.Separator(body).pack(fill=X, pady=(0, 8))
        ttk.Label(
            body, text="Add a version", font=("", 10, "bold"),
        ).pack(anchor="w", pady=(0, 4))

        add_row = ttk.Frame(body)
        add_row.pack(fill=X)
        add_row.columnconfigure(0, weight=1)

        version_entry = ttk.Entry(add_row, width=30)
        version_entry.grid(row=0, column=0, sticky="ew", padx=(0, 6))
        version_entry.focus_set()

        def _add():
            name = version_entry.get().strip()
            if not name:
                return
            if name in self._resume_versions:
                messagebox.showwarning(
                    "Duplicate",
                    f'"{name}" already exists.',
                    parent=dlg,
                )
                return
            self._resume_versions.append(name)
            self._save_config()
            self._update_resume_combo()
            version_entry.delete(0, END)
            _rebuild_list()

        ttk.Button(
            add_row, text="Add", command=_add,
            bootstyle="success", padding=(12, 4),
        ).grid(row=0, column=1)

        btn_row = ttk.Frame(body)
        btn_row.pack(fill=X, pady=(8, 0))
        ttk.Button(
            btn_row, text="Close", command=dlg.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=RIGHT)

        version_entry.bind("<Return>", lambda e: _add())

    # -------------------------------------------------------------------
    # Action statuses management popup
    # -------------------------------------------------------------------
    def _manage_action_statuses(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Action Statuses")
        dlg.grab_set()

        w, h = 500, 540
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(340, 380)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text="Action Statuses",
            font=("", 13, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text="These appear in the Action Status dropdown on the Detail and Actions tabs.",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(0, 8))

        # Scrollable list
        list_frame = ttk.Frame(body)
        list_frame.pack(fill=BOTH, expand=True, pady=(0, 8))

        def _rebuild_list():
            for child in list_frame.winfo_children():
                child.destroy()
            if not self._action_statuses:
                ttk.Label(
                    list_frame, text="No action statuses added yet.",
                    bootstyle="secondary", font=("", 9),
                ).pack(anchor="w", pady=4)
                return
            for i, status in enumerate(self._action_statuses):
                row = ttk.Frame(list_frame)
                row.pack(fill=X, pady=(0, 4))
                ttk.Label(
                    row, text=status, font=("", 10, "bold"),
                ).pack(side=LEFT)
                # Up/down reorder buttons
                if i > 0:
                    ttk.Button(
                        row, text="\u25b2", bootstyle="secondary-outline",
                        padding=(4, 0),
                        command=lambda idx=i: _move(idx, -1),
                    ).pack(side=RIGHT, padx=(2, 0))
                if i < len(self._action_statuses) - 1:
                    ttk.Button(
                        row, text="\u25bc", bootstyle="secondary-outline",
                        padding=(4, 0),
                        command=lambda idx=i: _move(idx, 1),
                    ).pack(side=RIGHT, padx=(2, 0))
                ttk.Button(
                    row, text="x", bootstyle="danger-outline",
                    padding=(4, 0),
                    command=lambda idx=i: _remove(idx),
                ).pack(side=RIGHT)
                ttk.Separator(list_frame).pack(fill=X, pady=(0, 2))

        def _remove(idx):
            self._action_statuses.pop(idx)
            self._save_config()
            self._update_action_status_combo()
            _rebuild_list()

        def _move(idx, direction):
            new_idx = idx + direction
            if 0 <= new_idx < len(self._action_statuses):
                lst = self._action_statuses
                lst[idx], lst[new_idx] = lst[new_idx], lst[idx]
                self._save_config()
                self._update_action_status_combo()
                _rebuild_list()

        _rebuild_list()

        # Add form
        ttk.Separator(body).pack(fill=X, pady=(0, 8))
        ttk.Label(
            body, text="Add a status", font=("", 10, "bold"),
        ).pack(anchor="w", pady=(0, 4))

        add_row = ttk.Frame(body)
        add_row.pack(fill=X)
        add_row.columnconfigure(0, weight=1)

        status_entry = ttk.Entry(add_row, width=30)
        status_entry.grid(row=0, column=0, sticky="ew", padx=(0, 6))
        status_entry.focus_set()

        def _add():
            name = status_entry.get().strip()
            if not name:
                return
            if name in self._action_statuses:
                messagebox.showwarning(
                    "Duplicate",
                    f'"{name}" already exists.',
                    parent=dlg,
                )
                return
            self._action_statuses.append(name)
            self._save_config()
            self._update_action_status_combo()
            status_entry.delete(0, END)
            _rebuild_list()

        ttk.Button(
            add_row, text="Add", command=_add,
            bootstyle="success", padding=(12, 4),
        ).grid(row=0, column=1)

        btn_row = ttk.Frame(body)
        btn_row.pack(fill=X, pady=(8, 0))
        ttk.Button(
            btn_row, text="Close", command=dlg.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=RIGHT)

        status_entry.bind("<Return>", lambda e: _add())

    # -------------------------------------------------------------------
    # Templates management popup (connections + tone templates)
    # -------------------------------------------------------------------
    def _manage_templates(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Message Templates")
        dlg.grab_set()

        w, h = 680, 640
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(500, 480)

        # Scrollable body
        outer = ttk.Frame(dlg)
        outer.pack(fill=BOTH, expand=True)
        canvas = tk.Canvas(
            outer, highlightthickness=0,
            bg=str(self.colors.bg),
        )
        scrollbar = ttk.Scrollbar(outer, orient=VERTICAL, command=canvas.yview)
        body = ttk.Frame(canvas, padding=16)
        body.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all")),
        )
        canvas.create_window((0, 0), window=body, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side=LEFT, fill=BOTH, expand=True)
        scrollbar.pack(side=RIGHT, fill=Y)

        def _on_wheel(event):
            if event.num == 4:
                canvas.yview_scroll(-3, "units")
            elif event.num == 5:
                canvas.yview_scroll(3, "units")
            else:
                canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        canvas.bind_all("<MouseWheel>", _on_wheel)
        canvas.bind_all("<Button-4>", _on_wheel)
        canvas.bind_all("<Button-5>", _on_wheel)

        def _restore_wheel():
            canvas.unbind_all("<MouseWheel>")
            canvas.unbind_all("<Button-4>")
            canvas.unbind_all("<Button-5>")
            self.root.bind_all("<MouseWheel>", self._on_mousewheel)
            self.root.bind_all("<Button-4>", self._on_mousewheel)
            self.root.bind_all("<Button-5>", self._on_mousewheel)

        dlg.protocol("WM_DELETE_WINDOW", lambda: (_restore_wheel(), dlg.destroy()))

        # ---- Section 1: Connections ----
        ttk.Label(
            body, text="Connections",
            font=("", 13, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text="Connection labels and lines used in message templates.",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(0, 8))

        conn_list_frame = ttk.Frame(body)
        conn_list_frame.pack(fill=X, pady=(0, 8))

        def _rebuild_conn_list():
            for child in conn_list_frame.winfo_children():
                child.destroy()
            if not self._connections:
                ttk.Label(
                    conn_list_frame, text="No connections added yet.",
                    bootstyle="secondary", font=("", 9),
                ).pack(anchor="w", pady=4)
                return
            for i, conn in enumerate(self._connections):
                row = ttk.Frame(conn_list_frame)
                row.pack(fill=X, pady=(0, 4))
                ttk.Label(
                    row, text=conn["label"], font=("", 10, "bold"), width=8,
                ).pack(side=LEFT)
                ttk.Label(
                    row, text=conn["line"],
                    bootstyle="secondary", font=("", 9),
                ).pack(side=LEFT, fill=X, expand=True, padx=(8, 0))
                ttk.Button(
                    row, text="x", bootstyle="danger-outline",
                    padding=(4, 0),
                    command=lambda idx=i: _remove_conn(idx),
                ).pack(side=RIGHT, padx=(4, 0))
                ttk.Button(
                    row, text="Edit", bootstyle="info-outline",
                    padding=(4, 0),
                    command=lambda idx=i: _edit_conn(idx),
                ).pack(side=RIGHT)
                ttk.Separator(conn_list_frame).pack(fill=X, pady=(0, 2))

        def _remove_conn(idx):
            self._connections.pop(idx)
            self._save_config()
            _rebuild_conn_list()

        def _edit_conn(idx):
            """Replace the connection row with inline entry fields."""
            conn = self._connections[idx]
            # Find the row frame for this index (skip Separators)
            rows = [c for c in conn_list_frame.winfo_children()
                    if isinstance(c, ttk.Frame)]
            if idx >= len(rows):
                return
            row = rows[idx]
            for child in row.winfo_children():
                child.destroy()

            label_entry = ttk.Entry(row, width=10)
            label_entry.pack(side=LEFT)
            label_entry.insert(0, conn["label"])

            line_entry = ttk.Entry(row, width=40)
            line_entry.pack(side=LEFT, fill=X, expand=True, padx=(8, 0))
            line_entry.insert(0, conn["line"])

            def _save_edit():
                new_label = label_entry.get().strip()
                new_line = line_entry.get().strip()
                if not new_label or not new_line:
                    return
                self._connections[idx] = {"label": new_label, "line": new_line}
                self._save_config()
                _rebuild_conn_list()

            ttk.Button(
                row, text="Cancel", bootstyle="secondary-outline",
                padding=(4, 0), command=_rebuild_conn_list,
            ).pack(side=RIGHT, padx=(4, 0))
            ttk.Button(
                row, text="Save", bootstyle="success",
                padding=(4, 0), command=_save_edit,
            ).pack(side=RIGHT)

            label_entry.focus_set()
            line_entry.bind("<Return>", lambda e: _save_edit())

        _rebuild_conn_list()

        # Add connection form
        add_conn_frame = ttk.Frame(body)
        add_conn_frame.pack(fill=X, pady=(0, 4))
        add_conn_frame.columnconfigure(1, weight=1)

        ttk.Label(add_conn_frame, text="Label:").grid(
            row=0, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        conn_label_entry = ttk.Entry(add_conn_frame, width=10)
        conn_label_entry.grid(row=0, column=1, sticky="w", pady=(0, 4))

        ttk.Label(add_conn_frame, text="Line:").grid(
            row=1, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        conn_line_entry = ttk.Entry(add_conn_frame, width=50)
        conn_line_entry.grid(row=1, column=1, sticky="ew", pady=(0, 4))

        def _add_conn():
            label = conn_label_entry.get().strip()
            line = conn_line_entry.get().strip()
            if not label or not line:
                messagebox.showwarning(
                    "Required", "Both label and line are required.", parent=dlg,
                )
                return
            self._connections.append({"label": label, "line": line})
            self._save_config()
            conn_label_entry.delete(0, END)
            conn_line_entry.delete(0, END)
            _rebuild_conn_list()

        ttk.Button(
            add_conn_frame, text="Add Connection", command=_add_conn,
            bootstyle="success", padding=(10, 3),
        ).grid(row=2, column=1, sticky="w", pady=(2, 0))

        # Default connection line
        ttk.Separator(body).pack(fill=X, pady=(8, 8))
        def_conn_frame = ttk.Frame(body)
        def_conn_frame.pack(fill=X, pady=(0, 4))
        def_conn_frame.columnconfigure(1, weight=1)

        ttk.Label(
            def_conn_frame, text="Default line:",
            font=("", 9, "bold"),
        ).grid(row=0, column=0, sticky="e", padx=(0, 6))
        def_conn_entry = ttk.Entry(def_conn_frame, width=50)
        def_conn_entry.grid(row=0, column=1, sticky="ew")
        def_conn_entry.insert(0, self._default_connection_line)

        ttk.Label(
            def_conn_frame,
            text="Used when no connection label is selected.",
            bootstyle="secondary", font=("", 8),
        ).grid(row=1, column=1, sticky="w", pady=(2, 0))

        def _save_default_conn(event=None):
            self._default_connection_line = def_conn_entry.get().strip()
            self._save_config()

        def_conn_entry.bind("<FocusOut>", _save_default_conn)
        def_conn_entry.bind("<Return>", _save_default_conn)

        # ---- Section 2: Tone Templates ----
        ttk.Separator(body).pack(fill=X, pady=(12, 8))
        ttk.Label(
            body, text="Tone Templates",
            font=("", 13, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text="Message templates shown in the Draft Message popup. "
                 "Placeholders: {first_name}, {company}, {role}, {connection}",
            bootstyle="secondary", font=("", 9), wraplength=560,
        ).pack(anchor="w", pady=(0, 8))

        tone_list_frame = ttk.Frame(body)
        tone_list_frame.pack(fill=X, pady=(0, 8))

        def _rebuild_tone_list():
            for child in tone_list_frame.winfo_children():
                child.destroy()
            if not self._tone_templates:
                ttk.Label(
                    tone_list_frame, text="No tone templates added yet.",
                    bootstyle="secondary", font=("", 9),
                ).pack(anchor="w", pady=4)
                return
            for i, tmpl in enumerate(self._tone_templates):
                row = ttk.Frame(tone_list_frame)
                row.pack(fill=X, pady=(0, 4))
                ttk.Label(
                    row, text=tmpl["name"], font=("", 10, "bold"), width=20,
                    anchor="w",
                ).pack(side=LEFT)
                preview = tmpl["body"][:60] + "..." if len(tmpl["body"]) > 60 else tmpl["body"]
                ttk.Label(
                    row, text=preview,
                    bootstyle="secondary", font=("", 8),
                ).pack(side=LEFT, fill=X, expand=True, padx=(8, 0))
                ttk.Button(
                    row, text="Edit", bootstyle="info-outline",
                    padding=(6, 0),
                    command=lambda idx=i: _edit_tone(idx),
                ).pack(side=RIGHT, padx=(4, 0))
                ttk.Button(
                    row, text="x", bootstyle="danger-outline",
                    padding=(4, 0),
                    command=lambda idx=i: _remove_tone(idx),
                ).pack(side=RIGHT)
                ttk.Separator(tone_list_frame).pack(fill=X, pady=(0, 2))

        def _remove_tone(idx):
            self._tone_templates.pop(idx)
            self._save_config()
            _rebuild_tone_list()

        def _edit_tone(idx):
            _open_tone_editor(idx)

        def _open_tone_editor(idx=None):
            """Open a sub-dialog to add or edit a tone template."""
            editing = idx is not None
            sub = tk.Toplevel(dlg)
            sub.title("Edit Template" if editing else "Add Template")
            sub.transient(dlg)
            sub.grab_set()

            sw, sh = 500, 350
            dx = dlg.winfo_rootx() + (dlg.winfo_width() - sw) // 2
            dy = dlg.winfo_rooty() + (dlg.winfo_height() - sh) // 2
            sub.geometry(f"{sw}x{sh}+{dx}+{dy}")
            sub.minsize(400, 300)

            sub_body = ttk.Frame(sub, padding=16)
            sub_body.pack(fill=BOTH, expand=True)

            ttk.Label(sub_body, text="Name:").pack(anchor="w", pady=(0, 4))
            name_entry = ttk.Entry(sub_body, width=30)
            name_entry.pack(fill=X, pady=(0, 8))
            name_entry.focus_set()

            ttk.Label(sub_body, text="Body:").pack(anchor="w", pady=(0, 4))
            text_kw = dict(
                bg=str(self.colors.inputbg),
                fg=str(self.colors.inputfg),
                insertbackground=str(self.colors.inputfg),
                selectbackground=str(self.colors.selectbg),
                selectforeground=str(self.colors.selectfg),
                relief="flat", borderwidth=2,
            )
            body_text = tk.Text(
                sub_body, wrap=tk.WORD, font=("", 10), height=8, **text_kw,
            )
            body_text.pack(fill=BOTH, expand=True, pady=(0, 4))

            ttk.Label(
                sub_body,
                text="Placeholders: {first_name}, {company}, {role}, {connection}",
                bootstyle="secondary", font=("", 8),
            ).pack(anchor="w", pady=(0, 8))

            if editing:
                tmpl = self._tone_templates[idx]
                name_entry.insert(0, tmpl["name"])
                body_text.insert("1.0", tmpl["body"])

            def _save_tone():
                name = name_entry.get().strip()
                content = body_text.get("1.0", END).strip()
                if not name or not content:
                    messagebox.showwarning(
                        "Required", "Both name and body are required.", parent=sub,
                    )
                    return
                # Check for duplicate names (excluding current if editing)
                for j, t in enumerate(self._tone_templates):
                    if t["name"] == name and j != (idx if editing else -1):
                        messagebox.showwarning(
                            "Duplicate",
                            f'A template named "{name}" already exists.',
                            parent=sub,
                        )
                        return
                if editing:
                    self._tone_templates[idx] = {"name": name, "body": content}
                else:
                    self._tone_templates.append({"name": name, "body": content})
                self._save_config()
                _rebuild_tone_list()
                sub.destroy()

            btn_row = ttk.Frame(sub_body)
            btn_row.pack(fill=X)
            ttk.Button(
                btn_row, text="Save", command=_save_tone,
                bootstyle="success", padding=(12, 4),
            ).pack(side=LEFT, padx=(0, 6))
            ttk.Button(
                btn_row, text="Cancel", command=sub.destroy,
                bootstyle="secondary", padding=(12, 4),
            ).pack(side=LEFT)

        _rebuild_tone_list()

        ttk.Button(
            body, text="Add Template", command=lambda: _open_tone_editor(),
            bootstyle="success", padding=(10, 3),
        ).pack(anchor="w", pady=(0, 8))

        # Close button at the bottom
        ttk.Separator(body).pack(fill=X, pady=(8, 8))
        ttk.Button(
            body, text="Close",
            command=lambda: (_restore_wheel(), dlg.destroy()),
            bootstyle="secondary", padding=(12, 4),
        ).pack(anchor="e")
