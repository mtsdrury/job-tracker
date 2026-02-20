"""TrackerApp: main application class composed from mixin modules."""

import json
import os
import tkinter as tk
import urllib.parse
import webbrowser
from tkinter import messagebox, filedialog

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import read_tracker
from gui.constants import PAD_INNER, CONFIG_FILENAME
from gui.list_tab import ListTabMixin
from gui.detail_tab import DetailTabMixin
from gui.summary_tab import SummaryTabMixin
from gui.actions_tab import ActionsMixin
from gui.referrals import ReferralsMixin
from gui.templates import TemplatesMixin
from gui.popups import PopupsMixin
from gui.pipeline import PipelineMixin
from gui.kanban_tab import KanbanMixin
from gui.analytics_tab import AnalyticsMixin
from gui.chat_tab import ChatMixin


class TrackerApp(ListTabMixin, DetailTabMixin, SummaryTabMixin, ActionsMixin,
                 ReferralsMixin, TemplatesMixin, PopupsMixin, PipelineMixin,
                 KanbanMixin, AnalyticsMixin, ChatMixin):

    def __init__(self, root):
        self.root = root

        # Theme colors for tk-only widgets (Text, Canvas)
        self.colors = self.root.style.colors

        self.csv_path = None
        self.rows = []
        self.filtered_indices = []
        self.selected_idx = None
        self._schools = []  # list of {"name": ..., "linkedin_slug": ...}

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
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._schools = data.get("schools", [])
        except (json.JSONDecodeError, OSError):
            self._schools = []

    def _save_config(self):
        path = self._config_path()
        if not path:
            return
        data = {"schools": self._schools}
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    # -------------------------------------------------------------------
    # LinkedIn alumni search
    # -------------------------------------------------------------------
    def _open_alumni_search(self, company):
        """Open LinkedIn alumni searches for each configured school.

        Falls back to a generic people search if no schools are configured.
        """
        query = urllib.parse.quote(company)
        if not self._schools:
            webbrowser.open(
                f"https://www.linkedin.com/search/results/people/?keywords={query}",
            )
            return
        for school in self._schools:
            slug = school.get("linkedin_slug", "")
            if slug:
                webbrowser.open(
                    f"https://www.linkedin.com/school/{slug}/people/?keywords={query}",
                )

    # -------------------------------------------------------------------
    # Schools management popup
    # -------------------------------------------------------------------
    def _manage_schools(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Your Schools")
        dlg.transient(self.root)
        dlg.grab_set()

        w, h = 500, 420
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(400, 340)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text="Schools",
            font=("", 13, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            body,
            text="LinkedIn alumni search will open for each school listed here.",
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
                    row, text=f"  ({school['linkedin_slug']})",
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

        add_grid = ttk.Frame(body)
        add_grid.pack(fill=X)
        add_grid.columnconfigure(1, weight=1)

        ttk.Label(add_grid, text="Name:").grid(
            row=0, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        name_entry = ttk.Entry(add_grid, width=30)
        name_entry.grid(row=0, column=1, sticky="ew", pady=(0, 4))
        name_entry.focus_set()

        ttk.Label(add_grid, text="LinkedIn URL:").grid(
            row=1, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        url_entry = ttk.Entry(add_grid, width=30)
        url_entry.grid(row=1, column=1, sticky="ew", pady=(0, 4))

        ttk.Label(
            add_grid,
            text="e.g. https://www.linkedin.com/school/georgia-institute-of-technology/",
            bootstyle="secondary", font=("", 8),
        ).grid(row=2, column=1, sticky="w")

        def _extract_slug(url):
            """Extract the school slug from a LinkedIn school URL."""
            url = url.strip().rstrip("/")
            # Handle full URLs
            if "/school/" in url:
                return url.split("/school/")[-1].split("/")[0].split("?")[0]
            # Handle bare slugs
            return url

        def _add():
            name = name_entry.get().strip()
            raw_url = url_entry.get().strip()
            if not name or not raw_url:
                messagebox.showwarning(
                    "Required",
                    "Both name and LinkedIn URL are required.",
                    parent=dlg,
                )
                return
            slug = _extract_slug(raw_url)
            if not slug:
                messagebox.showwarning(
                    "Invalid URL",
                    "Could not extract a school slug from the URL.",
                    parent=dlg,
                )
                return
            self._schools.append({"name": name, "linkedin_slug": slug})
            self._save_config()
            name_entry.delete(0, END)
            url_entry.delete(0, END)
            _rebuild_list()

        btn_row = ttk.Frame(body)
        btn_row.pack(fill=X, pady=(8, 0))
        ttk.Button(
            btn_row, text="Add School", command=_add,
            bootstyle="success", padding=(12, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_row, text="Close", command=dlg.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=RIGHT)

        name_entry.bind("<Return>", lambda e: url_entry.focus_set())
        url_entry.bind("<Return>", lambda e: _add())
