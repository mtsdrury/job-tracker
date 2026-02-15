"""ListTabMixin: job list tab with treeview, filters, and refresh logic."""

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
