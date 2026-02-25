"""ActionsMixin: triage view, two-section actions tab with clean cards."""

import tkinter as tk
import webbrowser
from datetime import datetime
from tkinter import filedialog

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import parse_semicolons, write_tracker
from gui.constants import PAD_OUTER, PAD_SECTION, PAD_INNER
from gui.helpers import get_nudges

# Nudge urgency colors (for dark backgrounds)
_NUDGE_COLORS = {
    "normal": "#adb5bd",
    "warning": "#f5b041",
    "urgent": "#ec7063",
}

# Application statuses that qualify as "post-application"
_POST_APP_STATUSES = ("Applied", "Interview", "Offer")

# Dropdown options for post-application status changes
_POST_APP_DROPDOWN = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"]


class ActionsMixin:

    def _build_actions_tab(self):
        bg_color = str(self.colors.bg)
        self.actions_canvas = tk.Canvas(
            self.tab_actions, bg=bg_color, highlightthickness=0, borderwidth=0,
        )
        actions_scroll = ttk.Scrollbar(
            self.tab_actions, orient=VERTICAL, command=self.actions_canvas.yview,
        )
        self.actions_inner = ttk.Frame(self.actions_canvas)

        self.actions_inner.bind(
            "<Configure>",
            lambda e: self.actions_canvas.configure(
                scrollregion=self.actions_canvas.bbox("all"),
            ),
        )
        self.actions_canvas_window = self.actions_canvas.create_window(
            (0, 0), window=self.actions_inner, anchor="nw",
        )
        self.actions_canvas.configure(yscrollcommand=actions_scroll.set)

        # Stretch inner frame to canvas width
        self.actions_canvas.bind(
            "<Configure>",
            lambda e: self.actions_canvas.itemconfig(
                self.actions_canvas_window, width=e.width,
            ),
        )

        self.actions_canvas.pack(side=LEFT, fill=BOTH, expand=True)
        actions_scroll.pack(side=RIGHT, fill=Y)

        # Header row
        header_row = ttk.Frame(self.actions_inner)
        header_row.pack(fill=X, padx=PAD_OUTER, pady=(PAD_OUTER, 4))

        ttk.Label(
            header_row, text="Actions",
            font=("", 16, "bold"), bootstyle="primary",
        ).pack(side=LEFT)

        self.actions_subtitle = ttk.Label(
            self.actions_inner, text="0 jobs with actions",
            font=("", 10), bootstyle="secondary",
        )
        self.actions_subtitle.pack(anchor="w", padx=PAD_OUTER, pady=(0, PAD_SECTION))

        # Container for triage or main view cards
        self.actions_cards_frame = ttk.Frame(self.actions_inner)
        self.actions_cards_frame.pack(
            fill=X, padx=PAD_OUTER, pady=(0, PAD_OUTER),
        )

    # ------------------------------------------------------------------
    # Refresh
    # ------------------------------------------------------------------
    def _refresh_actions(self):
        """Clear and rebuild action cards. Shows triage if needed."""
        for w in self.actions_cards_frame.winfo_children():
            w.destroy()

        if not self.rows:
            self.actions_subtitle.config(text="No jobs loaded")
            ttk.Label(
                self.actions_cards_frame,
                text="Open a CSV file to see action items.",
                bootstyle="secondary", font=("", 10),
            ).pack(anchor="w", pady=4)
            return

        # Auto-assign "Applied - waiting" to applied jobs with no action status
        changed = False
        for row in self.rows:
            app_status = row.get("Application Status", "Not Yet Applied").strip()
            action_status = row.get("Action Status", "").strip()
            if app_status in _POST_APP_STATUSES and not action_status:
                row["Action Status"] = "Applied - waiting"
                changed = True
        if changed and self.csv_path:
            write_tracker(self.csv_path, self.rows)

        # Collect unapplied jobs that still have no action status
        triage_jobs = []
        for idx, row in enumerate(self.rows):
            app_status = row.get("Application Status", "Not Yet Applied").strip()
            action_status = row.get("Action Status", "").strip()
            if app_status in ("Rejected", "Withdrawn", "Closed"):
                continue
            if app_status == "Not Yet Applied" and not action_status:
                triage_jobs.append((idx, row))

        if triage_jobs:
            self._render_triage_view(triage_jobs)
            return

        self._render_main_view()

    # ------------------------------------------------------------------
    # Triage View
    # ------------------------------------------------------------------
    def _render_triage_view(self, triage_jobs):
        """Show the triage screen for jobs missing an action status."""
        f = self.actions_cards_frame

        self.actions_subtitle.config(
            text=f"{len(triage_jobs)} job{'s' if len(triage_jobs) != 1 else ''} need an action status",
        )

        ttk.Label(
            f, text="Set Actions",
            font=("", 14, "bold"), bootstyle="warning",
        ).pack(anchor="w", pady=(0, 2))

        ttk.Label(
            f,
            text="These jobs need an action status before they appear in your action list.",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(0, 12))

        # Store combobox references for the Done button
        combos = []

        for idx, row in triage_jobs:
            company = row.get("Company", "")
            role = row.get("Role", "")

            row_frame = ttk.Frame(f)
            row_frame.pack(fill=X, pady=(0, 6))

            ttk.Label(
                row_frame, text=f"{company}  -  {role}",
                font=("", 10, "bold"),
            ).pack(side=LEFT, fill=X, expand=True)

            combo = ttk.Combobox(
                row_frame, values=self._action_statuses,
                state="readonly", width=22,
            )
            combo.pack(side=RIGHT, padx=(8, 0))
            combos.append((idx, combo))

        ttk.Separator(f).pack(fill=X, pady=(12, 8))

        btn_row = ttk.Frame(f)
        btn_row.pack(fill=X)

        def _done():
            for idx, combo in combos:
                val = combo.get().strip()
                if val:
                    self.rows[idx]["Action Status"] = val
            if self.csv_path:
                write_tracker(self.csv_path, self.rows)
            self._refresh_actions()
            self._refresh_list()

        ttk.Button(
            btn_row, text="Done",
            bootstyle="success", padding=(16, 6),
            command=_done,
        ).pack(side=LEFT, padx=(0, 12))

        skip_lbl = ttk.Label(
            btn_row, text="Skip for now",
            bootstyle="secondary", font=("", 9, "underline"), cursor="hand2",
        )
        skip_lbl.pack(side=LEFT)
        skip_lbl.bind("<Button-1>", lambda e: self._render_main_view_forced())

    def _render_main_view_forced(self):
        """Skip triage and show the main view, including no-status jobs."""
        for w in self.actions_cards_frame.winfo_children():
            w.destroy()
        self._render_main_view()

    # ------------------------------------------------------------------
    # Main View
    # ------------------------------------------------------------------
    def _render_main_view(self):
        """Render the two-section main view: Pre-Application + Post-Application."""
        # Split rows into pre-application and post-application buckets
        pre_groups = {}
        pre_no_status = []
        post_groups = {}

        for idx, row in enumerate(self.rows):
            app_status = row.get("Application Status", "Not Yet Applied").strip()
            if app_status in ("Rejected", "Withdrawn", "Closed"):
                continue
            action_status = row.get("Action Status", "").strip()

            if app_status == "Not Yet Applied":
                if action_status:
                    pre_groups.setdefault(action_status, []).append((idx, row))
                else:
                    pre_no_status.append((idx, row))
            elif app_status in _POST_APP_STATUSES:
                key = action_status if action_status else "Applied - waiting"
                post_groups.setdefault(key, []).append((idx, row))

        pre_total = sum(len(v) for v in pre_groups.values()) + len(pre_no_status)
        post_total = sum(len(v) for v in post_groups.values())
        grand_total = pre_total + post_total

        if grand_total == 0:
            self.actions_subtitle.config(text="No active jobs")
            ttk.Label(
                self.actions_cards_frame,
                text="No active jobs to show.",
                bootstyle="secondary", font=("", 10),
            ).pack(anchor="w", pady=4)
            return

        self.actions_subtitle.config(
            text=f"{grand_total} active job{'s' if grand_total != 1 else ''}",
        )

        f = self.actions_cards_frame

        # Pre-Application section
        if pre_total > 0:
            self._render_section_header(
                f,
                f"Pre-Application ({pre_total})",
                "Jobs you haven't applied to yet",
                "warning",
            )
            self._render_pre_app_cards(f, pre_groups, pre_no_status)

        # Post-Application section
        if post_total > 0:
            self._render_section_header(
                f,
                f"Post-Application ({post_total})",
                "Jobs you've applied to or are interviewing for",
                "info",
            )
            self._render_post_app_cards(f, post_groups)

    # ------------------------------------------------------------------
    # Section header
    # ------------------------------------------------------------------
    def _render_section_header(self, parent, title, subtitle, bootstyle):
        frame = ttk.Frame(parent)
        frame.pack(fill=X, pady=(PAD_SECTION + 4, 2))

        ttk.Label(
            frame, text=title,
            font=("", 14, "bold"), bootstyle=bootstyle,
        ).pack(side=LEFT)

        ttk.Label(
            frame, text=subtitle,
            font=("", 9), bootstyle="secondary",
        ).pack(side=LEFT, padx=(12, 0))

        ttk.Separator(parent).pack(fill=X, pady=(4, 8))

    # ------------------------------------------------------------------
    # Pre-Application cards
    # ------------------------------------------------------------------
    def _render_pre_app_cards(self, parent, groups, no_status_list):
        # Ordered groups first
        for status in self._action_statuses:
            if status not in groups:
                continue
            self._render_action_group(parent, status, groups[status])

        # Groups not in config list
        for status, job_list in groups.items():
            if status not in self._action_statuses:
                self._render_action_group(parent, status, job_list)

        # No status set
        if no_status_list:
            self._render_action_group(
                parent, "No status set", no_status_list, is_no_status=True,
            )

    def _render_action_group(self, parent, status_label, job_list,
                             is_no_status=False):
        count = len(job_list)

        header_frame = ttk.Frame(parent)
        header_frame.pack(fill=X, pady=(PAD_SECTION, 4))

        style = "secondary" if is_no_status else "info"
        ttk.Label(
            header_frame,
            text=f"{status_label}  ({count})",
            font=("", 12, "bold"), bootstyle=style,
        ).pack(side=LEFT)

        ttk.Separator(parent).pack(fill=X, pady=(2, 6))

        for row_idx, row in job_list:
            self._render_pre_app_card(parent, row_idx, row)

    def _render_pre_app_card(self, parent, row_idx, row):
        """Pre-application card: action status dropdown + nudges + Take Action / Open Detail."""
        card_bg = "#3a3f47"
        company = row.get("Company", "")
        role = row.get("Role", "")
        current_action = row.get("Action Status", "").strip()

        outer = tk.Frame(parent, bg=str(self.colors.bg))
        outer.pack(fill=X, pady=(0, PAD_INNER))

        card = tk.Frame(
            outer, bg=card_bg, padx=12, pady=10,
            highlightbackground="#4a4f57", highlightthickness=1,
        )
        card.pack(fill=X)

        # Top row: company/role + action status dropdown
        top_row = tk.Frame(card, bg=card_bg)
        top_row.pack(fill=X)

        tk.Label(
            top_row, text=f"{company}  -  {role}",
            font=("", 10, "bold"), bg=card_bg, fg="#ffffff", anchor="w",
        ).pack(side=LEFT, fill=X, expand=True)

        combo = ttk.Combobox(
            top_row, values=self._action_statuses + [""],
            state="readonly", width=20,
        )
        combo.set(current_action)
        combo.pack(side=RIGHT, padx=(8, 0))

        def _on_status_change(event, idx=row_idx, cb=combo):
            new_status = cb.get()
            self.rows[idx]["Action Status"] = new_status
            if self.csv_path:
                write_tracker(self.csv_path, self.rows)
            if self.selected_idx == idx:
                w = self.field_widgets.get("Action Status")
                if w:
                    w.set(new_status)
            self._refresh_actions()

        combo.bind("<<ComboboxSelected>>", _on_status_change)

        ttk.Label(
            top_row, text="Action:", bootstyle="secondary", font=("", 9),
        ).pack(side=RIGHT)

        # Nudge rows (text only, no inline action buttons)
        nudges = get_nudges(row, follow_up_days=self._follow_up_days)
        if nudges:
            nudge_frame = tk.Frame(card, bg=card_bg)
            nudge_frame.pack(fill=X, pady=(4, 0))
            for nudge in nudges:
                color = _NUDGE_COLORS.get(nudge["urgency"], "#adb5bd")
                tk.Label(
                    nudge_frame, text=f"\u2022 {nudge['text']}",
                    font=("", 9), bg=card_bg, fg=color, anchor="w",
                ).pack(fill=X, pady=(1, 0))

        # Button row: Take Action + Open Detail
        btn_frame = tk.Frame(card, bg=card_bg)
        btn_frame.pack(fill=X, pady=(6, 0))

        ttk.Button(
            btn_frame, text="Take Action",
            bootstyle="info", padding=(10, 3),
            command=lambda idx=row_idx: self._open_action_wizard(idx),
        ).pack(side=LEFT, padx=(0, 6))

        ttk.Button(
            btn_frame, text="Open Detail",
            bootstyle="secondary-outline", padding=(8, 2),
            command=lambda idx=row_idx: self._action_open_detail(idx),
        ).pack(side=LEFT, padx=(0, 6))

        self._suppress_active_actions(outer, skip=card)

    # ------------------------------------------------------------------
    # Post-Application cards
    # ------------------------------------------------------------------
    def _render_post_app_cards(self, parent, groups):
        # Ordered groups first
        for status in self._action_statuses:
            if status not in groups:
                continue
            self._render_post_group(parent, status, groups[status])

        for status, job_list in groups.items():
            if status not in self._action_statuses:
                self._render_post_group(parent, status, job_list)

    def _render_post_group(self, parent, status_label, job_list):
        count = len(job_list)
        header_frame = ttk.Frame(parent)
        header_frame.pack(fill=X, pady=(PAD_SECTION, 4))

        ttk.Label(
            header_frame,
            text=f"{status_label}  ({count})",
            font=("", 12, "bold"), bootstyle="info",
        ).pack(side=LEFT)

        ttk.Separator(parent).pack(fill=X, pady=(2, 6))

        for row_idx, row in job_list:
            self._render_post_app_card(parent, row_idx, row)

    def _render_post_app_card(self, parent, row_idx, row):
        """Post-application card: application status dropdown + nudges + Open Detail."""
        card_bg = "#3a3f47"
        company = row.get("Company", "")
        role = row.get("Role", "")
        current_app_status = row.get("Application Status", "Applied").strip()

        outer = tk.Frame(parent, bg=str(self.colors.bg))
        outer.pack(fill=X, pady=(0, PAD_INNER))

        card = tk.Frame(
            outer, bg=card_bg, padx=12, pady=10,
            highlightbackground="#4a4f57", highlightthickness=1,
        )
        card.pack(fill=X)

        # Top row: company/role + application status dropdown
        top_row = tk.Frame(card, bg=card_bg)
        top_row.pack(fill=X)

        tk.Label(
            top_row, text=f"{company}  -  {role}",
            font=("", 10, "bold"), bg=card_bg, fg="#ffffff", anchor="w",
        ).pack(side=LEFT, fill=X, expand=True)

        combo = ttk.Combobox(
            top_row, values=_POST_APP_DROPDOWN,
            state="readonly", width=16,
        )
        combo.set(current_app_status)
        combo.pack(side=RIGHT, padx=(8, 0))

        def _on_app_status_change(event, idx=row_idx, cb=combo):
            new_status = cb.get()
            self.rows[idx]["Application Status"] = new_status
            if self.csv_path:
                write_tracker(self.csv_path, self.rows)
            if self.selected_idx == idx:
                w = self.field_widgets.get("Application Status")
                if w and isinstance(w, ttk.Combobox):
                    w.set(new_status)
            self._refresh_actions()
            self._refresh_list()

        combo.bind("<<ComboboxSelected>>", _on_app_status_change)

        ttk.Label(
            top_row, text="Status:", bootstyle="secondary", font=("", 9),
        ).pack(side=RIGHT)

        # Nudge rows (text only)
        nudges = get_nudges(row, follow_up_days=self._follow_up_days)
        if nudges:
            nudge_frame = tk.Frame(card, bg=card_bg)
            nudge_frame.pack(fill=X, pady=(4, 0))
            for nudge in nudges:
                color = _NUDGE_COLORS.get(nudge["urgency"], "#adb5bd")
                tk.Label(
                    nudge_frame, text=f"\u2022 {nudge['text']}",
                    font=("", 9), bg=card_bg, fg=color, anchor="w",
                ).pack(fill=X, pady=(1, 0))

        # Button row: just Open Detail
        btn_frame = tk.Frame(card, bg=card_bg)
        btn_frame.pack(fill=X, pady=(6, 0))

        ttk.Button(
            btn_frame, text="Open Detail",
            bootstyle="secondary-outline", padding=(8, 2),
            command=lambda idx=row_idx: self._action_open_detail(idx),
        ).pack(side=LEFT, padx=(0, 6))

        self._suppress_active_actions(outer, skip=card)

    # ------------------------------------------------------------------
    # Shared helpers
    # ------------------------------------------------------------------
    def _suppress_active_actions(self, widget, skip=None):
        if widget is not skip:
            try:
                widget.configure(highlightthickness=0)
            except tk.TclError:
                pass
        try:
            widget.configure(
                activebackground=widget.cget("bg"),
                activeforeground=widget.cget("fg"),
            )
        except tk.TclError:
            pass
        for child in widget.winfo_children():
            self._suppress_active_actions(child, skip=skip)

    def _action_open_detail(self, row_idx):
        self.selected_idx = row_idx
        self._load_detail(self.rows[row_idx])
        self.notebook.select(self.tab_detail)

    def _action_open_url(self, url):
        if url:
            webbrowser.open(url)

    def _action_browse_cl(self, row_idx):
        path = filedialog.askopenfilename(
            title="Select Cover Letter",
            filetypes=[
                ("Word documents", "*.docx"),
                ("Markdown", "*.md"),
                ("All files", "*.*"),
            ],
        )
        if not path:
            return
        import os
        filename = os.path.basename(path)
        row = self.rows[row_idx]
        row["Cover Letter Written"] = "Yes"
        row["Cover Letter File"] = filename
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        self._refresh_actions()
        self._refresh_list()

    def _action_mark_applied(self, row_idx):
        row = self.rows[row_idx]
        row["Application Status"] = "Applied"
        row["Date Applied"] = datetime.now().strftime("%Y-%m-%d")
        row["Action Status"] = "Applied - waiting"
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        self._refresh_actions()
        self._refresh_list()

    def _action_search_linkedin(self, company):
        self._open_alumni_search(company)

    def _action_add_referral(self, row_idx):
        self.selected_idx = row_idx
        self._add_referral_popup()

    def _action_draft_message(self, row_idx, ref_idx, tone=None):
        self.selected_idx = row_idx
        self._selected_referral_idx = ref_idx
        self._draft_message_popup(default_tone=tone)
