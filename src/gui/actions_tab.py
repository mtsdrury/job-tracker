"""ActionsMixin: accordion-style action items tab with quick actions."""

import tkinter as tk
import urllib.parse
import webbrowser
from datetime import datetime
from tkinter import filedialog

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import parse_semicolons, write_tracker
from gui.constants import PAD_OUTER, PAD_SECTION, PAD_INNER
from gui.helpers import incomplete_fields, parse_referral_status

# Accent colors per action type
_COLORS = {
    "message_referral": "#f5b041",
    "followup_referral": "#f5b041",
    "find_referral": "#adb5bd",
    "write_cl": "#5dade2",
    "submit_app": "#58d68d",
    "fill_missing": "#adb5bd",
}

# Sort priority (lower = higher urgency)
_PRIORITY = {
    "message_referral": 1,
    "followup_referral": 2,
    "find_referral": 3,
    "write_cl": 4,
    "submit_app": 5,
    "fill_missing": 6,
}

# Outreach statuses that trigger follow-up after 3 days
_OUTREACH_STATUSES = ("connect request sent", "message sent", "emailed")


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

        # Header
        ttk.Label(
            self.actions_inner, text="Actions",
            font=("", 16, "bold"), bootstyle="primary",
        ).pack(anchor="w", padx=PAD_OUTER, pady=(PAD_OUTER, 4))

        self.actions_subtitle = ttk.Label(
            self.actions_inner, text="0 action items",
            font=("", 10), bootstyle="secondary",
        )
        self.actions_subtitle.pack(anchor="w", padx=PAD_OUTER, pady=(0, PAD_SECTION))

        # Container for action cards
        self.actions_cards_frame = ttk.Frame(self.actions_inner)
        self.actions_cards_frame.pack(
            fill=X, padx=PAD_OUTER, pady=(0, PAD_OUTER),
        )

        # Accordion state
        self._expanded_action_key = None
        self._action_details = {}  # key -> detail_frame

    # ------------------------------------------------------------------
    # Refresh
    # ------------------------------------------------------------------
    def _refresh_actions(self):
        """Clear and rebuild all action cards from current tracker data."""
        # Clear existing cards
        for w in self.actions_cards_frame.winfo_children():
            w.destroy()
        self._expanded_action_key = None
        self._action_details = {}

        if not self.rows:
            self.actions_subtitle.config(text="No jobs loaded")
            ttk.Label(
                self.actions_cards_frame,
                text="Open a CSV file to see action items.",
                bootstyle="secondary", font=("", 10),
            ).pack(anchor="w", pady=4)
            return

        today = datetime.now()
        items = []  # list of (action_type, title, subtitle, row_idx, detail_builder_args)

        for idx, row in enumerate(self.rows):
            status = row.get("Application Status", "Not Yet Applied").strip()
            if status in ("Applied", "Rejected", "Withdrawn"):
                continue

            company = row.get("Company", "")
            role = row.get("Role", "")
            ref_names = parse_semicolons(row.get("Referral Names", ""))
            ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
            ref_connections = parse_semicolons(row.get("Referral Connections", ""))

            # 1. Message referral (not yet messaged)
            for ri, name in enumerate(ref_names):
                raw = ref_statuses[ri].strip() if ri < len(ref_statuses) else ""
                base, _ = parse_referral_status(raw)
                if not base or "not yet" in base.lower():
                    conn = ref_connections[ri] if ri < len(ref_connections) else ""
                    items.append((
                        "message_referral",
                        f"Message referral: {name} at {company}",
                        role,
                        idx,
                        {"ref_idx": ri, "name": name, "company": company,
                         "conn": conn, "stat": "Not yet messaged"},
                    ))

            # 2. Follow up on referral (outreach stage, 3+ days since date)
            for ri, name in enumerate(ref_names):
                raw = ref_statuses[ri].strip() if ri < len(ref_statuses) else ""
                base, date_str = parse_referral_status(raw)
                if base.lower() in _OUTREACH_STATUSES:
                    show = True
                    if date_str:
                        try:
                            sent = datetime.strptime(date_str, "%Y-%m-%d")
                            if (today - sent).days < 3:
                                show = False
                        except ValueError:
                            pass
                    if show:
                        display_stat = raw
                        items.append((
                            "followup_referral",
                            f"Follow up with {name} at {company}",
                            role,
                            idx,
                            {"ref_idx": ri, "name": name, "company": company,
                             "stat": display_stat},
                        ))

            # 3. Find referral (Not Yet Applied, no referral names)
            if status == "Not Yet Applied" and not ref_names:
                items.append((
                    "find_referral",
                    f"Find referral: {company}",
                    role,
                    idx,
                    {"company": company, "role": role},
                ))

            # 4. Write cover letter (Not Yet Applied, no CL)
            if status == "Not Yet Applied":
                cl = row.get("Cover Letter Written", "").strip().lower()
                if cl != "yes":
                    job_url = row.get("Job URL", "").strip()
                    items.append((
                        "write_cl",
                        f"Write cover letter: {company}",
                        role,
                        idx,
                        {"company": company, "role": role, "job_url": job_url},
                    ))

            # 5. Submit application (has resume + CL, still Not Yet Applied)
            if status == "Not Yet Applied":
                rv = row.get("Resume Version", "").strip()
                cl = row.get("Cover Letter Written", "").strip().lower()
                if rv and cl == "yes":
                    job_url = row.get("Job URL", "").strip()
                    items.append((
                        "submit_app",
                        f"Submit application: {company}",
                        role,
                        idx,
                        {"company": company, "role": role,
                         "resume_version": rv, "job_url": job_url},
                    ))

            # 6. Fill missing info
            missing = incomplete_fields(row)
            # Filter out fields already covered by other action types
            if status == "Not Yet Applied":
                covered = {"Cover Letter", "Cover Letter Written",
                           "Referral Names", "Date Applied"}
                missing = [f for f in missing if f not in covered]
            if missing:
                items.append((
                    "fill_missing",
                    f"Fill missing info: {company}",
                    role,
                    idx,
                    {"company": company, "role": role, "missing": missing},
                ))

        # Sort by priority tier, then newest jobs first within each tier
        items.sort(key=lambda item: (_PRIORITY.get(item[0], 99), -item[3]))

        # Update subtitle
        count = len(items)
        if count == 0:
            self.actions_subtitle.config(text="No action items")
            ttk.Label(
                self.actions_cards_frame,
                text="No action items. You're on top of things!",
                bootstyle="success", font=("", 10),
            ).pack(anchor="w", pady=4)
            return
        self.actions_subtitle.config(
            text=f"{count} action item{'s' if count != 1 else ''}",
        )

        # Create cards
        for i, (action_type, title, subtitle, row_idx, extra) in enumerate(items):
            key = f"{action_type}_{row_idx}_{i}"
            self._create_action_card(
                self.actions_cards_frame, key, action_type,
                title, subtitle, row_idx, extra,
            )

    # ------------------------------------------------------------------
    # Card creation
    # ------------------------------------------------------------------
    def _create_action_card(self, parent, key, action_type, title, subtitle,
                            row_idx, extra):
        """Create a single accordion card with expand/collapse behavior."""
        color = _COLORS.get(action_type, "#adb5bd")
        card_bg = "#3a3f47"

        # Outer frame for spacing
        outer = tk.Frame(parent, bg=str(self.colors.bg))
        outer.pack(fill=X, pady=(0, PAD_INNER))

        # Card frame with colored border
        card = tk.Frame(
            outer, bg=card_bg, padx=12, pady=10,
            highlightbackground=color, highlightthickness=2,
        )
        card.pack(fill=X)

        # Title row (clickable)
        title_row = tk.Frame(card, bg=card_bg)
        title_row.pack(fill=X)

        title_lbl = tk.Label(
            title_row, text=title, font=("", 10, "bold"),
            bg=card_bg, fg="#ffffff", anchor="w",
        )
        title_lbl.pack(side=LEFT, fill=X, expand=True)

        chevron_lbl = tk.Label(
            title_row, text=">", font=("", 11, "bold"),
            bg=card_bg, fg="#6c757d", anchor="e", width=2,
        )
        chevron_lbl.pack(side=RIGHT)

        # Subtitle row
        subtitle_lbl = tk.Label(
            card, text=subtitle, font=("", 9),
            bg=card_bg, fg="#adb5bd", anchor="w",
        )
        subtitle_lbl.pack(fill=X, pady=(1, 0))

        # Detail frame (hidden by default)
        detail_frame = tk.Frame(card, bg=card_bg)
        self._action_details[key] = {
            "detail_frame": detail_frame,
            "chevron": chevron_lbl,
            "built": False,
            "action_type": action_type,
            "row_idx": row_idx,
            "extra": extra,
        }

        # Suppress activebackground on hover (Windows quirk), skip card for border
        self._suppress_active_actions(outer, skip=card)

        # Bind click to toggle
        def _toggle(event, k=key):
            self._toggle_action(k)

        for widget in (title_row, title_lbl, chevron_lbl, subtitle_lbl):
            widget.bind("<Button-1>", _toggle)
            widget.configure(cursor="hand2")

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
    # Accordion toggle
    # ------------------------------------------------------------------
    def _toggle_action(self, key):
        """Expand/collapse an action card. Only one open at a time."""
        # Collapse currently expanded card
        if self._expanded_action_key and self._expanded_action_key != key:
            prev = self._action_details.get(self._expanded_action_key)
            if prev:
                prev["detail_frame"].pack_forget()
                prev["chevron"].config(text=">")

        info = self._action_details.get(key)
        if not info:
            return

        detail_frame = info["detail_frame"]
        chevron = info["chevron"]

        if self._expanded_action_key == key:
            # Collapse
            detail_frame.pack_forget()
            chevron.config(text=">")
            self._expanded_action_key = None
        else:
            # Build detail content on first expand
            if not info["built"]:
                self._build_action_detail(
                    detail_frame, info["action_type"],
                    info["row_idx"], info["extra"],
                )
                info["built"] = True
            detail_frame.pack(fill=X, pady=(8, 0))
            chevron.config(text="v")
            self._expanded_action_key = key

    # ------------------------------------------------------------------
    # Detail builders per action type
    # ------------------------------------------------------------------
    def _build_action_detail(self, frame, action_type, row_idx, extra):
        """Populate the expanded detail area with context and buttons."""
        card_bg = "#3a3f47"
        sep_color = "#4a4f57"

        # Separator
        tk.Frame(frame, bg=sep_color, height=1).pack(fill=X, pady=(0, 8))

        if action_type == "message_referral":
            self._detail_message_referral(frame, card_bg, row_idx, extra)
        elif action_type == "followup_referral":
            self._detail_followup_referral(frame, card_bg, row_idx, extra)
        elif action_type == "write_cl":
            self._detail_write_cl(frame, card_bg, row_idx, extra)
        elif action_type == "find_referral":
            self._detail_find_referral(frame, card_bg, row_idx, extra)
        elif action_type == "submit_app":
            self._detail_submit_app(frame, card_bg, row_idx, extra)
        elif action_type == "fill_missing":
            self._detail_fill_missing(frame, card_bg, row_idx, extra)

    def _detail_message_referral(self, frame, bg, row_idx, extra):
        info_frame = tk.Frame(frame, bg=bg)
        info_frame.pack(fill=X)

        tk.Label(
            info_frame, text=f"Referral: {extra['name']}", font=("", 9),
            bg=bg, fg="#dee2e6", anchor="w",
        ).pack(anchor="w")
        conn_text = f"Connection: {extra['conn']}" if extra['conn'] else "Connection: (none)"
        tk.Label(
            info_frame, text=conn_text, font=("", 9),
            bg=bg, fg="#adb5bd", anchor="w",
        ).pack(anchor="w")
        tk.Label(
            info_frame, text=f"Status: {extra['stat']}", font=("", 9),
            bg=bg, fg="#adb5bd", anchor="w",
        ).pack(anchor="w")

        btn_frame = tk.Frame(frame, bg=bg)
        btn_frame.pack(fill=X, pady=(8, 0))

        draft_btn = ttk.Button(
            btn_frame, text="Draft Message",
            bootstyle="warning-outline", padding=(10, 3),
            command=lambda: self._action_draft_message(row_idx, extra["ref_idx"]),
        )
        draft_btn.pack(side=LEFT, padx=(0, 6))

        ttk.Button(
            btn_frame, text="Mark as Message Sent",
            bootstyle="success-outline", padding=(10, 3),
            command=lambda: self._action_mark_message_sent(row_idx, extra["ref_idx"]),
        ).pack(side=LEFT)

    def _detail_followup_referral(self, frame, bg, row_idx, extra):
        info_frame = tk.Frame(frame, bg=bg)
        info_frame.pack(fill=X)

        tk.Label(
            info_frame, text=f"Referral: {extra['name']}", font=("", 9),
            bg=bg, fg="#dee2e6", anchor="w",
        ).pack(anchor="w")
        tk.Label(
            info_frame, text=f"Current status: {extra['stat']}", font=("", 9),
            bg=bg, fg="#adb5bd", anchor="w",
        ).pack(anchor="w")

        btn_frame = tk.Frame(frame, bg=bg)
        btn_frame.pack(fill=X, pady=(8, 0))

        ttk.Button(
            btn_frame, text="Draft Follow-up",
            bootstyle="warning-outline", padding=(10, 3),
            command=lambda: self._action_draft_message(
                row_idx, extra["ref_idx"], tone="Follow-up",
            ),
        ).pack(side=LEFT, padx=(0, 6))

        ttk.Button(
            btn_frame, text="Search LinkedIn",
            bootstyle="info-outline", padding=(10, 3),
            command=lambda: self._action_search_linkedin(extra["company"]),
        ).pack(side=LEFT, padx=(0, 6))

        # Status update dropdown
        ttk.Label(
            btn_frame, text="Update status:", bootstyle="secondary",
        ).pack(side=LEFT, padx=(12, 4))

        status_combo = ttk.Combobox(
            btn_frame,
            values=[
                "Connect request sent", "Message sent", "Emailed",
                "Responded", "Resume sent", "Sharing internally",
                "Referral submitted",
            ],
            state="readonly", width=24,
        )
        status_combo.pack(side=LEFT, padx=(0, 4))

        def _update_status():
            new_stat = status_combo.get()
            if new_stat:
                today = datetime.now().strftime("%Y-%m-%d")
                self._action_update_referral_status(
                    row_idx, extra["ref_idx"], f"{new_stat} {today}",
                )

        ttk.Button(
            btn_frame, text="Set",
            bootstyle="info-outline", padding=(8, 3),
            command=_update_status,
        ).pack(side=LEFT)

    def _detail_write_cl(self, frame, bg, row_idx, extra):
        info_frame = tk.Frame(frame, bg=bg)
        info_frame.pack(fill=X)

        tk.Label(
            info_frame, text=f"Company: {extra['company']}", font=("", 9),
            bg=bg, fg="#dee2e6", anchor="w",
        ).pack(anchor="w")
        tk.Label(
            info_frame, text=f"Role: {extra['role']}", font=("", 9),
            bg=bg, fg="#adb5bd", anchor="w",
        ).pack(anchor="w")
        if extra["job_url"]:
            tk.Label(
                info_frame, text=f"URL: {extra['job_url']}", font=("", 9),
                bg=bg, fg="#5dade2", anchor="w",
            ).pack(anchor="w")

        btn_frame = tk.Frame(frame, bg=bg)
        btn_frame.pack(fill=X, pady=(8, 0))

        if extra["job_url"]:
            ttk.Button(
                btn_frame, text="Open Job Posting",
                bootstyle="info-outline", padding=(10, 3),
                command=lambda: self._action_open_url(extra["job_url"]),
            ).pack(side=LEFT, padx=(0, 6))

        ttk.Button(
            btn_frame, text="Browse CL File",
            bootstyle="success-outline", padding=(10, 3),
            command=lambda: self._action_browse_cl(row_idx),
        ).pack(side=LEFT)

    def _detail_find_referral(self, frame, bg, row_idx, extra):
        info_frame = tk.Frame(frame, bg=bg)
        info_frame.pack(fill=X)

        tk.Label(
            info_frame, text=f"Company: {extra['company']}", font=("", 9),
            bg=bg, fg="#dee2e6", anchor="w",
        ).pack(anchor="w")
        tk.Label(
            info_frame, text=f"Role: {extra['role']}", font=("", 9),
            bg=bg, fg="#adb5bd", anchor="w",
        ).pack(anchor="w")

        btn_frame = tk.Frame(frame, bg=bg)
        btn_frame.pack(fill=X, pady=(8, 0))

        ttk.Button(
            btn_frame, text="Search LinkedIn",
            bootstyle="info-outline", padding=(10, 3),
            command=lambda: self._action_search_linkedin(extra["company"]),
        ).pack(side=LEFT, padx=(0, 6))

        ttk.Button(
            btn_frame, text="Add Referral",
            bootstyle="success-outline", padding=(10, 3),
            command=lambda: self._action_add_referral(row_idx),
        ).pack(side=LEFT)

    def _detail_submit_app(self, frame, bg, row_idx, extra):
        info_frame = tk.Frame(frame, bg=bg)
        info_frame.pack(fill=X)

        tk.Label(
            info_frame, text=f"Company: {extra['company']}", font=("", 9),
            bg=bg, fg="#dee2e6", anchor="w",
        ).pack(anchor="w")
        tk.Label(
            info_frame, text=f"Role: {extra['role']}", font=("", 9),
            bg=bg, fg="#adb5bd", anchor="w",
        ).pack(anchor="w")
        tk.Label(
            info_frame, text=f"Resume: {extra['resume_version']}", font=("", 9),
            bg=bg, fg="#adb5bd", anchor="w",
        ).pack(anchor="w")

        btn_frame = tk.Frame(frame, bg=bg)
        btn_frame.pack(fill=X, pady=(8, 0))

        if extra["job_url"]:
            ttk.Button(
                btn_frame, text="Open Job Posting",
                bootstyle="info-outline", padding=(10, 3),
                command=lambda: self._action_open_url(extra["job_url"]),
            ).pack(side=LEFT, padx=(0, 6))

        ttk.Button(
            btn_frame, text="Mark as Applied",
            bootstyle="success-outline", padding=(10, 3),
            command=lambda: self._action_mark_applied(row_idx),
        ).pack(side=LEFT)

    def _detail_fill_missing(self, frame, bg, row_idx, extra):
        info_frame = tk.Frame(frame, bg=bg)
        info_frame.pack(fill=X)

        tk.Label(
            info_frame, text=f"Company: {extra['company']}", font=("", 9),
            bg=bg, fg="#dee2e6", anchor="w",
        ).pack(anchor="w")
        tk.Label(
            info_frame, text=f"Role: {extra['role']}", font=("", 9),
            bg=bg, fg="#adb5bd", anchor="w",
        ).pack(anchor="w")
        tk.Label(
            info_frame,
            text=f"Missing: {', '.join(extra['missing'])}",
            font=("", 9), bg=bg, fg="#f5b041", anchor="w",
        ).pack(anchor="w")

        btn_frame = tk.Frame(frame, bg=bg)
        btn_frame.pack(fill=X, pady=(8, 0))

        ttk.Button(
            btn_frame, text="Open in Detail",
            bootstyle="secondary-outline", padding=(10, 3),
            command=lambda: self._action_open_detail(row_idx),
        ).pack(side=LEFT)

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
        """Update a specific referral's status in the parallel arrays.

        The caller is responsible for including the date in new_status if needed.
        """
        row = self.rows[row_idx]
        statuses = parse_semicolons(row.get("Referral Statuses", ""))

        # Pad list if needed
        while len(statuses) <= ref_idx:
            statuses.append("")
        statuses[ref_idx] = new_status
        row["Referral Statuses"] = "; ".join(statuses)

        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        self._refresh_actions()
        self._refresh_list()

    def _action_search_linkedin(self, company):
        """Open LinkedIn people search for the company."""
        query = urllib.parse.quote(company)
        webbrowser.open(
            f"https://www.linkedin.com/search/results/people/?keywords={query}",
        )

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
