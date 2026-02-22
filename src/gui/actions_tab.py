"""ActionsMixin: grouped-by-action-status tab with inline status changes and nudges."""

import tkinter as tk
import webbrowser
from datetime import datetime
from tkinter import filedialog

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import parse_semicolons, write_tracker
from gui.constants import PAD_OUTER, PAD_SECTION, PAD_INNER
from gui.helpers import get_nudges


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

        # Container for grouped action cards
        self.actions_cards_frame = ttk.Frame(self.actions_inner)
        self.actions_cards_frame.pack(
            fill=X, padx=PAD_OUTER, pady=(0, PAD_OUTER),
        )

    # ------------------------------------------------------------------
    # Refresh
    # ------------------------------------------------------------------
    def _refresh_actions(self):
        """Clear and rebuild all action cards grouped by action status."""
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

        # Group rows by action status, skip Applied/Rejected/Withdrawn
        groups = {}  # action_status -> list of (row_idx, row)
        no_status = []  # (row_idx, row) for jobs with no action status

        for idx, row in enumerate(self.rows):
            app_status = row.get("Application Status", "Not Yet Applied").strip()
            if app_status in ("Applied", "Interview", "Offer",
                              "Rejected", "Withdrawn", "Closed"):
                continue
            action_status = row.get("Action Status", "").strip()
            if action_status:
                groups.setdefault(action_status, []).append((idx, row))
            else:
                no_status.append((idx, row))

        # Count total jobs with an action status
        total_with_status = sum(len(v) for v in groups.values())
        total_shown = total_with_status + len(no_status)

        if total_shown == 0:
            self.actions_subtitle.config(text="No active jobs")
            ttk.Label(
                self.actions_cards_frame,
                text="No active jobs to show.",
                bootstyle="secondary", font=("", 10),
            ).pack(anchor="w", pady=4)
            return

        self.actions_subtitle.config(
            text=f"{total_with_status} job{'s' if total_with_status != 1 else ''} "
                 f"with action status",
        )

        # Render groups in the order they appear in _action_statuses
        for status in self._action_statuses:
            if status not in groups:
                continue
            job_list = groups[status]
            self._render_action_group(
                self.actions_cards_frame, status, job_list,
            )

        # Render any action statuses not in the config list (edge case)
        for status, job_list in groups.items():
            if status not in self._action_statuses:
                self._render_action_group(
                    self.actions_cards_frame, status, job_list,
                )

        # "No status set" section at the bottom
        if no_status:
            self._render_action_group(
                self.actions_cards_frame, "No status set", no_status,
                is_no_status=True,
            )

    # ------------------------------------------------------------------
    # Render a group of jobs under a section header
    # ------------------------------------------------------------------
    def _render_action_group(self, parent, status_label, job_list,
                             is_no_status=False):
        """Create a section header + job cards for a group."""
        count = len(job_list)

        # Section header
        header_frame = ttk.Frame(parent)
        header_frame.pack(fill=X, pady=(PAD_SECTION, 4))

        style = "secondary" if is_no_status else "info"
        ttk.Label(
            header_frame,
            text=f"{status_label}  ({count})",
            font=("", 12, "bold"), bootstyle=style,
        ).pack(side=LEFT)

        ttk.Separator(parent).pack(fill=X, pady=(2, 6))

        # Job cards
        for row_idx, row in job_list:
            self._render_job_card(parent, row_idx, row)

    # ------------------------------------------------------------------
    # Render a single job card
    # ------------------------------------------------------------------
    def _render_job_card(self, parent, row_idx, row):
        """Create a card for a single job with status dropdown and nudges."""
        card_bg = "#3a3f47"

        company = row.get("Company", "")
        role = row.get("Role", "")
        current_action = row.get("Action Status", "").strip()

        # Outer frame for spacing
        outer = tk.Frame(parent, bg=str(self.colors.bg))
        outer.pack(fill=X, pady=(0, PAD_INNER))

        # Card frame with subtle border
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

        # Inline action status dropdown
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
            # Update detail tab if this job is selected
            if self.selected_idx == idx:
                w = self.field_widgets.get("Action Status")
                if w:
                    w.set(new_status)
            self._refresh_actions()

        combo.bind("<<ComboboxSelected>>", _on_status_change)

        ttk.Label(
            top_row, text="Action:", bootstyle="secondary", font=("", 9),
        ).pack(side=RIGHT)

        # Nudge labels
        nudges = get_nudges(row)
        if nudges:
            nudge_frame = tk.Frame(card, bg=card_bg)
            nudge_frame.pack(fill=X, pady=(4, 0))
            for nudge_text in nudges:
                tk.Label(
                    nudge_frame, text=f"\u2022 {nudge_text}",
                    font=("", 9), bg=card_bg, fg="#adb5bd", anchor="w",
                ).pack(anchor="w")

        # Button row
        btn_frame = tk.Frame(card, bg=card_bg)
        btn_frame.pack(fill=X, pady=(6, 0))

        ttk.Button(
            btn_frame, text="Open Detail",
            bootstyle="secondary-outline", padding=(8, 2),
            command=lambda idx=row_idx: self._action_open_detail(idx),
        ).pack(side=LEFT, padx=(0, 6))

        # Context-specific buttons based on action status
        action_lower = current_action.lower()

        job_url = row.get("Job URL", "").strip()
        ref_names = parse_semicolons(row.get("Referral Names", ""))

        if "find referral" in action_lower:
            ttk.Button(
                btn_frame, text="Search LinkedIn",
                bootstyle="info-outline", padding=(8, 2),
                command=lambda: self._action_search_linkedin(company),
            ).pack(side=LEFT, padx=(0, 6))
            ttk.Button(
                btn_frame, text="Add Referral",
                bootstyle="success-outline", padding=(8, 2),
                command=lambda idx=row_idx: self._action_add_referral(idx),
            ).pack(side=LEFT, padx=(0, 6))

        elif "message referral" in action_lower:
            if ref_names:
                ttk.Button(
                    btn_frame, text="Draft Message",
                    bootstyle="warning-outline", padding=(8, 2),
                    command=lambda idx=row_idx: self._action_draft_message(idx, 0),
                ).pack(side=LEFT, padx=(0, 6))

        elif "write cover letter" in action_lower:
            if job_url:
                ttk.Button(
                    btn_frame, text="Open Job Posting",
                    bootstyle="info-outline", padding=(8, 2),
                    command=lambda: self._action_open_url(job_url),
                ).pack(side=LEFT, padx=(0, 6))
            ttk.Button(
                btn_frame, text="Browse CL File",
                bootstyle="success-outline", padding=(8, 2),
                command=lambda idx=row_idx: self._action_browse_cl(idx),
            ).pack(side=LEFT, padx=(0, 6))

        elif "ready to apply" in action_lower:
            if job_url:
                ttk.Button(
                    btn_frame, text="Open Job Posting",
                    bootstyle="info-outline", padding=(8, 2),
                    command=lambda: self._action_open_url(job_url),
                ).pack(side=LEFT, padx=(0, 6))
            ttk.Button(
                btn_frame, text="Mark Applied",
                bootstyle="success-outline", padding=(8, 2),
                command=lambda idx=row_idx: self._action_mark_applied(idx),
            ).pack(side=LEFT, padx=(0, 6))

        elif "follow up" in action_lower:
            if job_url:
                ttk.Button(
                    btn_frame, text="Open Job Posting",
                    bootstyle="info-outline", padding=(8, 2),
                    command=lambda: self._action_open_url(job_url),
                ).pack(side=LEFT, padx=(0, 6))

        elif "interview" in action_lower:
            if job_url:
                ttk.Button(
                    btn_frame, text="Open Job Posting",
                    bootstyle="info-outline", padding=(8, 2),
                    command=lambda: self._action_open_url(job_url),
                ).pack(side=LEFT, padx=(0, 6))

        else:
            # Generic: show Search LinkedIn if no referral, Draft Message if has referral
            if ref_names:
                ttk.Button(
                    btn_frame, text="Draft Message",
                    bootstyle="warning-outline", padding=(8, 2),
                    command=lambda idx=row_idx: self._action_draft_message(idx, 0),
                ).pack(side=LEFT, padx=(0, 6))
            else:
                ttk.Button(
                    btn_frame, text="Search LinkedIn",
                    bootstyle="info-outline", padding=(8, 2),
                    command=lambda: self._action_search_linkedin(company),
                ).pack(side=LEFT, padx=(0, 6))

        # Suppress activebackground on hover (Windows quirk), skip card for border
        self._suppress_active_actions(outer, skip=card)

    def _suppress_active_actions(self, widget, skip=None):
        """Set highlightthickness=0 on all widgets except skip, suppress activebackground."""
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

    # ------------------------------------------------------------------
    # Quick action handlers
    # ------------------------------------------------------------------
    def _action_open_url(self, url):
        if url:
            webbrowser.open(url)

    def _action_browse_cl(self, row_idx):
        """Open file dialog, set CL Written=Yes, save CSV, refresh."""
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
        """Set status=Applied + date=today, save CSV, refresh."""
        row = self.rows[row_idx]
        row["Application Status"] = "Applied"
        row["Date Applied"] = datetime.now().strftime("%Y-%m-%d")
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        self._refresh_actions()
        self._refresh_list()

    def _action_mark_message_sent(self, row_idx, ref_idx):
        """Update referral status to 'Message sent YYYY-MM-DD', save CSV, refresh."""
        today = datetime.now().strftime("%Y-%m-%d")
        self._action_update_referral_status(row_idx, ref_idx, f"Message sent {today}")

    def _action_update_referral_status(self, row_idx, ref_idx, new_status):
        """Update a specific referral's status in the parallel arrays."""
        row = self.rows[row_idx]
        statuses = parse_semicolons(row.get("Referral Statuses", ""))
        while len(statuses) <= ref_idx:
            statuses.append("")
        statuses[ref_idx] = new_status
        row["Referral Statuses"] = "; ".join(statuses)
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        self._refresh_actions()
        self._refresh_list()

    def _action_search_linkedin(self, company):
        """Open LinkedIn alumni search for the company."""
        self._open_alumni_search(company)

    def _action_add_referral(self, row_idx):
        """Open the Add Referral popup for this job."""
        self.selected_idx = row_idx
        self._add_referral_popup()

    def _action_draft_message(self, row_idx, ref_idx, tone=None):
        """Open the Draft Message popup for this referral."""
        self.selected_idx = row_idx
        self._selected_referral_idx = ref_idx
        self._draft_message_popup(default_tone=tone)

    def _action_open_detail(self, row_idx):
        """Navigate to the Detail tab for this job."""
        self.selected_idx = row_idx
        self._load_detail(self.rows[row_idx])
        self.notebook.select(self.tab_detail)
