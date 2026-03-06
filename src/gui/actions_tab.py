"""ActionsMixin: triage view, two-section actions tab with clean cards."""

import tkinter as tk
import webbrowser
from datetime import datetime
from tkinter import filedialog, messagebox

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import parse_semicolons, write_tracker
from gui.constants import PAD_OUTER, PAD_SECTION, PAD_INNER, STRATEGY_MODES
from gui.helpers import get_nudges, parse_referral_status, is_stalled

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

        card_bg = "#3a3f47"

        for idx, row in triage_jobs:
            company = row.get("Company", "")
            role = row.get("Role", "")

            outer = tk.Frame(f, bg=str(self.colors.bg))
            outer.pack(fill=X, pady=(0, 6))

            card = tk.Frame(
                outer, bg=card_bg, padx=12, pady=8,
                highlightbackground="#4a4f57", highlightthickness=1,
            )
            card.pack(fill=X)

            top_row = tk.Frame(card, bg=card_bg)
            top_row.pack(fill=X)

            chevron = tk.Label(
                top_row, text="\u25b6", font=("", 10),
                bg=card_bg, fg="#adb5bd", cursor="hand2",
            )
            chevron.pack(side=LEFT, padx=(0, 6))

            title_lbl = tk.Label(
                top_row, text=f"{company}  -  {role}",
                font=("", 10, "bold"), bg=card_bg, fg="#ffffff",
                anchor="w", cursor="hand2",
            )
            title_lbl.pack(side=LEFT, fill=X, expand=True)

            combo = ttk.Combobox(
                top_row, values=self._action_statuses,
                state="readonly", width=22,
            )
            combo.pack(side=RIGHT, padx=(8, 0))
            combos.append((idx, combo))

            # Nudges (same as action cards, gives context for status choice)
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

            detail_panel = self._render_detail_panel(card, row, card_bg)
            toggle = lambda e, c=chevron, d=detail_panel: \
                self._toggle_detail(c, d)
            chevron.bind("<Button-1>", toggle)
            title_lbl.bind("<Button-1>", toggle)

            self._suppress_active_actions(outer, skip=card)

        ttk.Separator(f).pack(fill=X, pady=(12, 8))

        btn_row = ttk.Frame(f)
        btn_row.pack(fill=X)

        def _done():
            for idx, combo in combos:
                val = combo.get().strip()
                if not val:
                    continue
                if val == "Applied - waiting":
                    row = self.rows[idx]
                    company = row.get("Company", "")
                    role = row.get("Role", "")
                    today = datetime.now().strftime("%Y-%m-%d")
                    if not messagebox.askyesno(
                        "Mark as Applied?",
                        f"This will set {company} - {role} to Applied "
                        f"with today's date ({today}).\n\nContinue?",
                    ):
                        continue
                    row["Application Status"] = "Applied"
                    row["Date Applied"] = today
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

        # Extract stalled jobs from "Waiting on referral" group
        stalled_jobs = []
        waiting_key = "Waiting on referral"
        if waiting_key in pre_groups:
            remaining = []
            for idx, row in pre_groups[waiting_key]:
                if is_stalled(row, self._follow_up_days):
                    stalled_jobs.append((idx, row))
                else:
                    remaining.append((idx, row))
            if remaining:
                pre_groups[waiting_key] = remaining
            else:
                del pre_groups[waiting_key]

        pre_total = (
            sum(len(v) for v in pre_groups.values())
            + len(pre_no_status)
            + len(stalled_jobs)
        )
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

            # Stalled section (appears first within pre-application)
            if stalled_jobs:
                mode_info = STRATEGY_MODES.get(
                    self._strategy_mode, STRATEGY_MODES["referral"],
                )
                self._render_section_header(
                    f,
                    mode_info["stalled_message"],
                    mode_info["stalled_subtitle"],
                    "warning",
                )
                for row_idx, row in stalled_jobs:
                    self._render_pre_app_card(f, row_idx, row)

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

        # Top row: chevron + company/role + action status dropdown
        top_row = tk.Frame(card, bg=card_bg)
        top_row.pack(fill=X)

        chevron = tk.Label(
            top_row, text="\u25b6", font=("", 10),
            bg=card_bg, fg="#adb5bd", cursor="hand2",
        )
        chevron.pack(side=LEFT, padx=(0, 6))

        title_lbl = tk.Label(
            top_row, text=f"{company}  -  {role}",
            font=("", 10, "bold"), bg=card_bg, fg="#ffffff", anchor="w",
            cursor="hand2",
        )
        title_lbl.pack(side=LEFT, fill=X, expand=True)

        combo = ttk.Combobox(
            top_row, values=self._action_statuses + [""],
            state="readonly", width=20,
        )
        combo.set(current_action)
        combo.pack(side=RIGHT, padx=(8, 0))

        def _on_status_change(event, idx=row_idx, cb=combo, prev=current_action):
            new_status = cb.get()
            if new_status == "Applied - waiting":
                row = self.rows[idx]
                company = row.get("Company", "")
                role = row.get("Role", "")
                today = datetime.now().strftime("%Y-%m-%d")
                if not messagebox.askyesno(
                    "Mark as Applied?",
                    f"This will set {company} - {role} to Applied "
                    f"with today's date ({today}).\n\nContinue?",
                ):
                    cb.set(prev)
                    return
                row["Application Status"] = "Applied"
                row["Date Applied"] = today
            self.rows[idx]["Action Status"] = new_status
            if self.csv_path:
                write_tracker(self.csv_path, self.rows)
            if self.selected_idx == idx:
                w = self.field_widgets.get("Action Status")
                if w:
                    w.set(new_status)
            self._refresh_actions()
            if new_status == "Applied - waiting":
                self._refresh_list()

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

        # Expandable detail panel (starts hidden)
        detail_panel = self._render_detail_panel(card, row, card_bg)
        toggle = lambda e, c=chevron, d=detail_panel, b=btn_frame: \
            self._toggle_detail(c, d, b)
        chevron.bind("<Button-1>", toggle)
        title_lbl.bind("<Button-1>", toggle)

        self._suppress_active_actions(outer, skip=card)

    # ------------------------------------------------------------------
    # Post-Application cards
    # ------------------------------------------------------------------
    def _render_post_app_cards(self, parent, groups):
        for job_list in groups.values():
            for row_idx, row in job_list:
                self._render_post_app_card(parent, row_idx, row)

    def _render_post_app_card(self, parent, row_idx, row):
        """Post-application card: company/role label + status dropdown."""
        card_bg = "#3a3f47"
        company = row.get("Company", "")
        role = row.get("Role", "")
        current_app_status = row.get("Application Status", "Applied").strip()

        outer = tk.Frame(parent, bg=str(self.colors.bg))
        outer.pack(fill=X, pady=(0, PAD_INNER))

        card = tk.Frame(
            outer, bg=card_bg, padx=12, pady=8,
            highlightbackground="#4a4f57", highlightthickness=1,
        )
        card.pack(fill=X)

        tk.Label(
            card, text=f"{company}  -  {role}",
            font=("", 10, "bold"), bg=card_bg, fg="#ffffff", anchor="w",
        ).pack(side=LEFT, fill=X, expand=True)

        combo = ttk.Combobox(
            card, values=_POST_APP_DROPDOWN,
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
            card, text="Status:", bootstyle="secondary", font=("", 9),
        ).pack(side=RIGHT)

        self._suppress_active_actions(outer, skip=card)

    # ------------------------------------------------------------------
    # Expandable detail panel
    # ------------------------------------------------------------------
    def _render_detail_panel(self, card, row, card_bg):
        """Create an expandable detail panel for an action card (starts hidden)."""
        detail = tk.Frame(card, bg=card_bg)

        # Thin separator
        tk.Frame(detail, bg="#4a4f57", height=1).pack(fill=X, pady=(6, 4))

        secondary_fg = "#adb5bd"
        label_fg = "#dee2e6"

        # Referrals
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))

        if ref_names:
            tk.Label(
                detail, text="Referrals:", font=("", 9, "bold"),
                bg=card_bg, fg=label_fg, anchor="w",
            ).pack(fill=X)
            for i, name in enumerate(ref_names):
                status = ref_statuses[i].strip() if i < len(ref_statuses) else ""
                if not status:
                    status = "No status"
                base, date_str = parse_referral_status(status)
                # Color by recency
                if "not yet" in base.lower() or base == "No status":
                    s_color = "#f5b041"
                elif "submitted" in base.lower() or "sharing" in base.lower():
                    s_color = "#58d68d"
                else:
                    s_color = secondary_fg
                tk.Label(
                    detail, text=f"  {name}  -  {status}",
                    font=("", 9), bg=card_bg, fg=s_color, anchor="w",
                ).pack(fill=X)
        else:
            tk.Label(
                detail, text="No referrals yet",
                font=("", 9, "italic"), bg=card_bg, fg="#6c757d", anchor="w",
            ).pack(fill=X)

        # Location
        location = row.get("Location", "").strip()
        if location:
            tk.Label(
                detail, text=f"Location:  {location}",
                font=("", 9), bg=card_bg, fg=secondary_fg, anchor="w",
            ).pack(fill=X, pady=(2, 0))

        # Date Posted
        date_posted = row.get("Date Posted", "").strip()
        if date_posted:
            tk.Label(
                detail, text=f"Date Posted:  {date_posted}",
                font=("", 9), bg=card_bg, fg=secondary_fg, anchor="w",
            ).pack(fill=X, pady=(2, 0))

        # Job URL (clickable)
        job_url = row.get("Job URL", "").strip()
        if job_url:
            url_lbl = tk.Label(
                detail, text="Open posting",
                font=("", 9, "underline"), bg=card_bg, fg="#5dade2",
                anchor="w", cursor="hand2",
            )
            url_lbl.pack(fill=X, pady=(2, 0))
            url_lbl.bind("<Button-1>", lambda e, u=job_url: webbrowser.open(u))

        # Cover Letter
        cl_written = row.get("Cover Letter Written", "").strip()
        cl_file = row.get("Cover Letter File", "").strip()
        cl_text = None
        if cl_written.lower() == "yes":
            cl_text = f"Cover Letter:  Yes ({cl_file})" if cl_file else "Cover Letter:  Yes"
        elif cl_written.lower() == "no":
            cl_text = "Cover Letter:  No"
        if cl_text:
            tk.Label(
                detail, text=cl_text,
                font=("", 9), bg=card_bg, fg=secondary_fg, anchor="w",
            ).pack(fill=X, pady=(2, 0))

        # Notes (truncated)
        notes = row.get("Notes", "").strip()
        if notes:
            display = notes if len(notes) <= 150 else notes[:147] + "..."
            tk.Label(
                detail, text=f"Notes:  {display}",
                font=("", 9), bg=card_bg, fg=secondary_fg, anchor="w",
                wraplength=500, justify="left",
            ).pack(fill=X, pady=(2, 0))

        return detail

    def _toggle_detail(self, chevron_label, detail_frame, btn_frame=None):
        """Toggle visibility of a card's detail panel."""
        if detail_frame.winfo_manager():
            detail_frame.pack_forget()
            chevron_label.config(text="\u25b6")
        else:
            pack_opts = {"fill": X, "pady": (6, 0)}
            if btn_frame is not None:
                pack_opts["before"] = btn_frame
            detail_frame.pack(**pack_opts)
            chevron_label.config(text="\u25bc")
        self.actions_canvas.configure(
            scrollregion=self.actions_canvas.bbox("all"),
        )

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
