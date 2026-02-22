"""ListTabMixin: job list tab with treeview, kanban toggle, filters, and refresh logic."""

import tkinter as tk
import tkinter.font as tkfont

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import VALID_STATUSES
from gui.constants import PAD_SECTION, PAD_INNER, STATUS_COLORS, REFERRAL_FILTERS
from gui.helpers import matches_referral_filter


class ListTabMixin:

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
            filter_frame, text="Hide closed (Rejected / Withdrawn / Closed)",
            variable=self.hide_closed_var, command=self._refresh_list,
            bootstyle="round-toggle",
        ).grid(row=2, column=0, columnspan=3, sticky="w", pady=(6, 0))

        ttk.Button(
            filter_frame, text="Clear", command=self._clear_filters,
            bootstyle="secondary-outline",
        ).grid(row=2, column=3, sticky="e", pady=(6, 0), padx=(4, 0))

        # --- View toggle: List / Kanban ---
        toggle_frame = ttk.Frame(self.tab_list)
        toggle_frame.pack(fill=X, pady=(0, PAD_INNER))

        self._current_view = "list"
        self._list_btn = ttk.Button(
            toggle_frame, text="List", command=self._show_list_view,
            bootstyle="info", width=8,
        )
        self._list_btn.pack(side=LEFT, padx=(0, 2))
        self._kanban_btn = ttk.Button(
            toggle_frame, text="Kanban", command=self._show_kanban_view,
            bootstyle="info-outline", width=8,
        )
        self._kanban_btn.pack(side=LEFT)

        # --- View container ---
        self.view_container = ttk.Frame(self.tab_list)
        self.view_container.pack(fill=BOTH, expand=True)

        # List view frame (two treeviews with labels + separators)
        self.list_view_frame = ttk.Frame(self.view_container)
        self.list_view_frame.pack(fill=BOTH, expand=True)

        # Treeview row height
        self.root.style.configure("Treeview", rowheight=28)

        columns = ("company", "role", "status", "date_applied")
        col_config = {
            "company": {"text": "Company", "width": 180, "minwidth": 100},
            "role": {"text": "Role", "width": 240, "minwidth": 120},
            "status": {"text": "Status", "width": 120, "minwidth": 80},
            "date_applied": {"text": "Date Applied", "width": 100, "minwidth": 80},
        }

        # --- Active section: "In Progress" ---
        self._active_label = ttk.Label(
            self.list_view_frame, text="In Progress (0)",
            font=("", 10, "bold"), bootstyle="secondary",
        )
        self._active_label.pack(anchor="w", pady=(0, 2))
        ttk.Separator(self.list_view_frame).pack(fill=X, pady=(0, 4))

        self._active_tree = ttk.Treeview(
            self.list_view_frame, columns=columns,
            show="headings", selectmode="browse", height=1,
        )
        for col, cfg in col_config.items():
            self._active_tree.heading(col, text=cfg["text"])
            self._active_tree.column(col, width=cfg["width"], minwidth=cfg["minwidth"])
        self._active_tree.pack(fill=X)

        # --- Spacer between sections ---
        ttk.Frame(self.list_view_frame, height=16).pack(fill=X)

        # --- Inactive section: "Submitted / Closed" ---
        self._inactive_label = ttk.Label(
            self.list_view_frame, text="Submitted / Closed (0)",
            font=("", 10, "bold"), bootstyle="secondary",
        )
        self._inactive_label.pack(anchor="w", pady=(0, 2))
        ttk.Separator(self.list_view_frame).pack(fill=X, pady=(0, 4))

        inactive_frame = ttk.Frame(self.list_view_frame)
        inactive_frame.pack(fill=BOTH, expand=True)

        self._inactive_tree = ttk.Treeview(
            inactive_frame, columns=columns,
            show="", selectmode="browse",
        )
        for col, cfg in col_config.items():
            self._inactive_tree.column(col, width=cfg["width"], minwidth=cfg["minwidth"])

        inactive_scrollbar = ttk.Scrollbar(
            inactive_frame, orient=VERTICAL, command=self._inactive_tree.yview,
        )
        self._inactive_tree.configure(yscrollcommand=inactive_scrollbar.set)
        self._inactive_tree.pack(side=LEFT, fill=BOTH, expand=True)
        inactive_scrollbar.pack(side=RIGHT, fill=Y)

        # Bind events on both trees
        self._active_tree.bind("<Double-1>", self._on_double_click)
        self._inactive_tree.bind("<Double-1>", self._on_double_click)
        self._active_tree.bind("<<TreeviewSelect>>", lambda e: self._on_tree_select(self._active_tree))
        self._inactive_tree.bind("<<TreeviewSelect>>", lambda e: self._on_tree_select(self._inactive_tree))

        # Configure tag colors and strikethrough for status on both trees
        default_font = tkfont.nametofont("TkDefaultFont")
        strike_font = tkfont.Font(**default_font.configure())
        strike_font.configure(overstrike=True)

        closed_statuses = {"Rejected", "Withdrawn", "Closed"}
        for tree in (self._active_tree, self._inactive_tree):
            for status, color in STATUS_COLORS.items():
                tag = status.replace(" ", "_")
                if status in closed_statuses:
                    tree.tag_configure(tag, foreground=color, font=strike_font)
                else:
                    tree.tag_configure(tag, foreground=color)

        # Kanban view frame (built by KanbanMixin._build_kanban_view)
        self.kanban_view_frame = ttk.Frame(self.view_container)
        # Not packed by default; _show_kanban_view will pack it
        self._build_kanban_view()

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

    # ------------------------------------------------------------------
    # View toggle methods
    # ------------------------------------------------------------------
    def _show_list_view(self):
        """Switch to the list (treeview) view."""
        if self._current_view == "list":
            return
        self._current_view = "list"
        self.kanban_view_frame.pack_forget()
        self.list_view_frame.pack(fill=BOTH, expand=True)
        self._list_btn.configure(bootstyle="info")
        self._kanban_btn.configure(bootstyle="info-outline")
        self._refresh_list()

    def _show_kanban_view(self):
        """Switch to the kanban board view."""
        if self._current_view == "kanban":
            return
        self._current_view = "kanban"
        self.list_view_frame.pack_forget()
        self.kanban_view_frame.pack(fill=BOTH, expand=True)
        self._list_btn.configure(bootstyle="info-outline")
        self._kanban_btn.configure(bootstyle="info")
        self._refresh_kanban()

    # ------------------------------------------------------------------
    # Filters and refresh
    # ------------------------------------------------------------------
    def _clear_filters(self):
        self.status_filter.set("All")
        self.referral_filter.set("All")
        self.search_var.set("")
        self.referral_search_var.set("")
        self.hide_closed_var.set(False)
        self._refresh_list()

    # Statuses considered "in progress" (still need action)
    _ACTIVE_STATUSES = {"Not Yet Applied", "Interview", "Offer"}

    def _on_tree_select(self, source_tree):
        """When one tree gets a selection, clear the other."""
        other = (
            self._inactive_tree if source_tree is self._active_tree
            else self._active_tree
        )
        if source_tree.selection():
            for iid in other.selection():
                other.selection_remove(iid)

    def _get_selection(self):
        """Return (tree, iid) for whichever tree has a selection, or None."""
        sel = self._active_tree.selection()
        if sel:
            return self._active_tree, sel[0]
        sel = self._inactive_tree.selection()
        if sel:
            return self._inactive_tree, sel[0]
        return None

    def _refresh_list(self):
        self._active_tree.delete(*self._active_tree.get_children())
        self._inactive_tree.delete(*self._inactive_tree.get_children())
        self.filtered_indices = []

        status_f = self.status_filter.get()
        referral_f = self.referral_filter.get()
        search_q = self.search_var.get().strip().lower()
        ref_search_q = self.referral_search_var.get().strip().lower()
        hide_closed = self.hide_closed_var.get()

        active_rows = []   # (index, row, status)
        inactive_rows = []

        for i, row in enumerate(self.rows):
            status = row.get("Application Status", "Not Yet Applied")

            if hide_closed and status in ("Rejected", "Withdrawn", "Closed"):
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

            if status in self._ACTIVE_STATUSES:
                active_rows.append((i, row, status))
            else:
                inactive_rows.append((i, row, status))

        # Insert active rows
        for i, row, status in active_rows:
            self.filtered_indices.append(i)
            tag = status.replace(" ", "_")
            self._active_tree.insert(
                "", END, iid=str(i),
                values=(
                    row.get("Company", ""),
                    row.get("Role", ""),
                    status,
                    row.get("Date Applied", ""),
                ),
                tags=(tag,),
            )

        # Insert inactive rows
        for i, row, status in inactive_rows:
            self.filtered_indices.append(i)
            tag = status.replace(" ", "_")
            self._inactive_tree.insert(
                "", END, iid=str(i),
                values=(
                    row.get("Company", ""),
                    row.get("Role", ""),
                    status,
                    row.get("Date Applied", ""),
                ),
                tags=(tag,),
            )

        # Update section labels
        self._active_label.config(text=f"In Progress ({len(active_rows)})")
        self._inactive_label.config(text=f"Submitted / Closed ({len(inactive_rows)})")

        # Resize active tree to fit its rows (min 1 row so it stays visible)
        self._active_tree.config(height=max(1, len(active_rows)))

        # Restore selection on whichever tree contains the selected index
        if self.selected_idx is not None:
            sid = str(self.selected_idx)
            if sid in self._active_tree.get_children():
                self._active_tree.selection_set(sid)
            elif sid in self._inactive_tree.get_children():
                self._inactive_tree.selection_set(sid)

        # Update status bar
        filtered = len(self.filtered_indices)
        total = len(self.rows)
        if filtered == total:
            self.list_status_bar.config(text=f"{total} jobs")
        else:
            self.list_status_bar.config(text=f"Showing {filtered} of {total} jobs")

        # Keep kanban in sync when it's the active view
        if getattr(self, '_current_view', 'list') == 'kanban':
            self._refresh_kanban()
