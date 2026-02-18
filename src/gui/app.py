"""TrackerApp: main application class composed from mixin modules."""

import os
import tkinter as tk
from tkinter import messagebox, filedialog

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import read_tracker
from gui.constants import PAD_INNER
from gui.list_tab import ListTabMixin
from gui.detail_tab import DetailTabMixin
from gui.summary_tab import SummaryTabMixin
from gui.actions_tab import ActionsMixin
from gui.referrals import ReferralsMixin
from gui.templates import TemplatesMixin
from gui.popups import PopupsMixin
from gui.kanban_tab import KanbanMixin
from gui.analytics_tab import AnalyticsMixin
from gui.chat_tab import ChatMixin


class TrackerApp(ListTabMixin, DetailTabMixin, SummaryTabMixin, ActionsMixin,
                 ReferralsMixin, TemplatesMixin, PopupsMixin, KanbanMixin,
                 AnalyticsMixin, ChatMixin):

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
        self._refresh_list()
        self._clear_detail()
