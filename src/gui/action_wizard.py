"""ActionWizardMixin: multi-step wizard popup for guided job actions."""

import tkinter as tk
import webbrowser
from datetime import datetime
from tkinter import filedialog

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import parse_semicolons, write_tracker
from gui.helpers import parse_referral_status

_DOT_RADIUS = 8
_DOT_SPACING = 120
_DOT_COLORS = {"done": "#58d68d", "current": "#5dade2", "upcoming": "#4a4f57"}

# Outreach statuses that trigger follow-up after N days
_OUTREACH_STATUSES = ("connect request sent", "message sent", "emailed")


class ActionWizardMixin:

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------
    def _open_action_wizard(self, row_idx):
        """Open the Take Action wizard for a job."""
        row = self.rows[row_idx]
        steps = self._wizard_build_steps(row)
        if not steps:
            return

        self._wizard_job_idx = row_idx
        self._wizard_steps = steps
        self._wizard_step_idx = 0
        # Track which referral indices have been handled in the message step
        self._wizard_messaged = set()
        # When a referral is added during the wizard, end with "wait" not "apply"
        self._wizard_ends_with_wait = False

        dlg = tk.Toplevel(self.root)
        dlg.title("Take Action")
        w, h = 640, 500
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(480, 360)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        self._wizard_dlg = dlg

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        # Header: Company - Role
        company = row.get("Company", "")
        role = row.get("Role", "")
        ttk.Label(
            body, text=f"{company}  -  {role}",
            font=("", 14, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))

        # Progress dots canvas
        canvas_w = _DOT_SPACING * (len(steps) - 1) + _DOT_RADIUS * 4 + 20
        self._wizard_canvas = tk.Canvas(
            body, height=50, width=max(canvas_w, 200),
            bg=str(self.colors.bg), highlightthickness=0,
        )
        self._wizard_canvas.pack(anchor="w", pady=(0, 12))

        # Content area (rebuilt per step)
        self._wizard_content = ttk.Frame(body)
        self._wizard_content.pack(fill=BOTH, expand=True, pady=(0, 8))

        # Exit link at bottom
        exit_lbl = ttk.Label(
            body, text="Exit wizard",
            bootstyle="secondary", font=("", 9, "underline"), cursor="hand2",
        )
        exit_lbl.pack(anchor="w")
        exit_lbl.bind("<Button-1>", lambda e: self._wizard_close())

        dlg.protocol("WM_DELETE_WINDOW", self._wizard_close)

        self._wizard_update_dots()
        self._wizard_show_step()

    # ------------------------------------------------------------------
    # Step determination
    # ------------------------------------------------------------------
    def _wizard_build_steps(self, row):
        """Analyze job data and return list of (step_id, label) tuples."""
        steps = []
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
        cl_written = row.get("Cover Letter Written", "").strip().lower() == "yes"
        action_status = row.get("Action Status", "").strip().lower()
        today = datetime.now()
        follow_up_days = self._follow_up_days

        has_referrals = len(ref_names) > 0
        unmessaged = []
        pending = []

        for i, name in enumerate(ref_names):
            raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
            base, date_str = parse_referral_status(raw)
            if not base or "not yet" in base.lower():
                unmessaged.append(i)
            elif base.lower() in _OUTREACH_STATUSES and date_str:
                try:
                    sent = datetime.strptime(date_str, "%Y-%m-%d")
                    days = (today - sent).days
                    if days >= follow_up_days:
                        pending.append(i)
                except ValueError:
                    pass

        # Always offer find_referral if no referrals OR action status says so
        if not has_referrals or "find referral" in action_status:
            steps.append(("find_referral", "Find Referral"))
        if unmessaged or "message referral" in action_status:
            steps.append(("message_referral", "Message"))
        if pending:
            steps.append(("follow_up", "Follow Up"))
        if not cl_written:
            steps.append(("cover_letter", "Cover Letter"))

        if getattr(self, "_wizard_ends_with_wait", False):
            steps.append(("wait_for_referral", "Wait"))
        else:
            steps.append(("apply", "Apply"))

        return steps

    # ------------------------------------------------------------------
    # Progress dots
    # ------------------------------------------------------------------
    def _wizard_update_dots(self):
        c = self._wizard_canvas
        c.delete("all")
        r = _DOT_RADIUS
        y = 25
        for i, (step_id, label) in enumerate(self._wizard_steps):
            x = 20 + i * _DOT_SPACING
            if i < self._wizard_step_idx:
                color = _DOT_COLORS["done"]
            elif i == self._wizard_step_idx:
                color = _DOT_COLORS["current"]
            else:
                color = _DOT_COLORS["upcoming"]

            if i > 0:
                prev_x = 20 + (i - 1) * _DOT_SPACING
                line_color = (
                    _DOT_COLORS["done"]
                    if i <= self._wizard_step_idx
                    else _DOT_COLORS["upcoming"]
                )
                c.create_line(
                    prev_x + r, y, x - r, y, fill=line_color, width=2,
                )

            c.create_oval(x - r, y - r, x + r, y + r, fill=color, outline="")
            if i < self._wizard_step_idx:
                c.create_text(
                    x, y, text="\u2713", fill="#ffffff", font=("", 9, "bold"),
                )
            c.create_text(
                x, y + r + 10, text=label, fill="#adb5bd", font=("", 8),
            )

    # ------------------------------------------------------------------
    # Step display
    # ------------------------------------------------------------------
    def _wizard_show_step(self):
        self._wizard_update_dots()
        for w in self._wizard_content.winfo_children():
            w.destroy()

        if self._wizard_step_idx >= len(self._wizard_steps):
            self._wizard_close()
            return

        step_id, _label = self._wizard_steps[self._wizard_step_idx]
        handler = {
            "find_referral": self._wizard_step_find_referral,
            "message_referral": self._wizard_step_message_referral,
            "follow_up": self._wizard_step_follow_up,
            "cover_letter": self._wizard_step_cover_letter,
            "apply": self._wizard_step_apply,
            "wait_for_referral": self._wizard_step_wait_for_referral,
        }.get(step_id)
        if handler:
            handler()

    def _wizard_advance(self):
        self._wizard_step_idx += 1
        self._wizard_show_step()

    def _wizard_close(self):
        if hasattr(self, "_wizard_dlg") and self._wizard_dlg:
            try:
                self._wizard_dlg.destroy()
            except tk.TclError:
                pass
            self._wizard_dlg = None
        self._refresh_actions()
        self._refresh_list()

    # ------------------------------------------------------------------
    # Helper: update action status in CSV
    # ------------------------------------------------------------------
    def _wizard_set_action_status(self, new_status):
        row = self.rows[self._wizard_job_idx]
        row["Action Status"] = new_status
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        if self.selected_idx == self._wizard_job_idx:
            w = self.field_widgets.get("Action Status")
            if w:
                w.set(new_status)

    # ------------------------------------------------------------------
    # Intermediate popup: mark referral communication status
    # ------------------------------------------------------------------
    _COMM_STATUSES = [
        "Connect request sent",
        "Message sent",
        "Emailed",
    ]

    def _wizard_mark_referral_status(self, ref_idx, on_done):
        """Show a small popup asking the user to mark how they contacted the referral.

        on_done(ref_idx) is called after saving or skipping.
        """
        row = self.rows[self._wizard_job_idx]
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        name = ref_names[ref_idx] if ref_idx < len(ref_names) else "Referral"

        dlg = tk.Toplevel(self.root)
        dlg.title("Update Referral Status")

        w, h = 440, 230
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(320, 160)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text=f"How did you contact {name}?",
            font=("", 11, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 10))

        combo = ttk.Combobox(
            body, values=self._COMM_STATUSES,
            state="readonly", width=26,
        )
        combo.set("Message sent")
        combo.pack(anchor="w", pady=(0, 12))

        def _save():
            chosen = combo.get().strip()
            if chosen:
                today_str = datetime.now().strftime("%Y-%m-%d")
                new_status = f"{chosen} {today_str}"
                ref_statuses = parse_semicolons(
                    row.get("Referral Statuses", ""),
                )
                while len(ref_statuses) <= ref_idx:
                    ref_statuses.append("")
                ref_statuses[ref_idx] = new_status
                row["Referral Statuses"] = "; ".join(ref_statuses)
                if self.csv_path:
                    write_tracker(self.csv_path, self.rows)
            dlg.destroy()
            on_done(ref_idx)

        def _skip():
            dlg.destroy()
            on_done(ref_idx)

        btn_row = ttk.Frame(body)
        btn_row.pack(fill=X)

        ttk.Button(
            btn_row, text="Save",
            bootstyle="success", padding=(14, 4),
            command=_save,
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Skip",
            bootstyle="secondary-outline", padding=(10, 4),
            command=_skip,
        ).pack(side=LEFT)

        dlg.protocol("WM_DELETE_WINDOW", _skip)

    # ------------------------------------------------------------------
    # Step: Find Referral
    # ------------------------------------------------------------------
    def _wizard_step_find_referral(self):
        f = self._wizard_content
        row = self.rows[self._wizard_job_idx]
        company = row.get("Company", "")

        ttk.Label(
            f, text=f"Do you know someone at {company}?",
            font=("", 12), bootstyle="light",
        ).pack(anchor="w", pady=(8, 4))

        # Context line for posting age
        date_posted = row.get("Date Posted", "").strip()
        if date_posted:
            try:
                posted = datetime.strptime(date_posted, "%Y-%m-%d")
                days = (datetime.now() - posted).days
                if days >= 21:
                    ttk.Label(
                        f,
                        text=f"Posted {days} days ago, may close soon",
                        bootstyle="danger", font=("", 9),
                    ).pack(anchor="w", pady=(0, 8))
                elif days >= 14:
                    ttk.Label(
                        f,
                        text=f"Posted {days} days ago, getting stale",
                        bootstyle="warning", font=("", 9),
                    ).pack(anchor="w", pady=(0, 8))
            except ValueError:
                pass

        # Show existing referrals so the user knows who they already have
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
        if ref_names:
            refs_frame = ttk.Frame(f)
            refs_frame.pack(fill=X, pady=(6, 4))
            ttk.Label(
                refs_frame, text="Current referrals:",
                font=("", 9, "bold"), bootstyle="secondary",
            ).pack(anchor="w", pady=(0, 4))
            for i, name in enumerate(ref_names):
                raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
                base, date_str = parse_referral_status(raw)
                status_text = base if base else "No status"
                if date_str:
                    status_text += f"  ({date_str})"
                ttk.Label(
                    refs_frame,
                    text=f"\u2022  {name}  -  {status_text}",
                    font=("", 9), bootstyle="secondary",
                ).pack(anchor="w", pady=(0, 2))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w", pady=(8, 0))

        ttk.Button(
            btn_row, text="Search LinkedIn",
            bootstyle="info-outline", padding=(12, 6),
            command=lambda: self._open_alumni_search(company),
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Add Referral",
            bootstyle="success", padding=(12, 6),
            command=self._wizard_add_referral,
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Skip",
            bootstyle="secondary-outline", padding=(12, 6),
            command=self._wizard_advance,
        ).pack(side=LEFT)

    def _wizard_add_referral(self):
        self.selected_idx = self._wizard_job_idx
        self._add_referral_popup(on_complete=self._wizard_on_referral_added)

    def _wizard_on_referral_added(self, success, name=None):
        if success:
            self._wizard_ends_with_wait = True
            self._wizard_set_action_status("Message referral")
            # Re-evaluate steps since we now have a referral
            row = self.rows[self._wizard_job_idx]
            new_steps = self._wizard_build_steps(row)
            self._wizard_steps = new_steps
            # Find the message_referral step and jump to it
            for i, (sid, _) in enumerate(new_steps):
                if sid == "message_referral":
                    self._wizard_step_idx = i
                    self._wizard_show_step()
                    return
            self._wizard_advance()

    # ------------------------------------------------------------------
    # Step: Message Referral
    # ------------------------------------------------------------------
    def _wizard_step_message_referral(self):
        f = self._wizard_content
        row = self.rows[self._wizard_job_idx]
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))

        unmessaged = []
        for i, name in enumerate(ref_names):
            raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
            base, _ = parse_referral_status(raw)
            if not base or "not yet" in base.lower():
                unmessaged.append((i, name))

        if not unmessaged:
            self._wizard_advance()
            return

        ttk.Label(
            f, text="Message your referrals",
            font=("", 12), bootstyle="light",
        ).pack(anchor="w", pady=(8, 8))

        for ref_idx, name in unmessaged:
            ref_row = ttk.Frame(f)
            ref_row.pack(fill=X, pady=(0, 6))

            ttk.Label(
                ref_row, text=f"{name}  -  not yet messaged",
                font=("", 10), bootstyle="secondary",
            ).pack(side=LEFT)

            ttk.Button(
                ref_row, text="Draft Message",
                bootstyle="warning-outline", padding=(8, 3),
                command=lambda ri=ref_idx: self._wizard_draft_message(ri),
            ).pack(side=RIGHT, padx=(6, 0))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w", pady=(12, 0))

        ttk.Button(
            btn_row, text="Skip",
            bootstyle="secondary-outline", padding=(12, 6),
            command=self._wizard_advance,
        ).pack(side=LEFT)

    def _wizard_draft_message(self, ref_idx):
        self.selected_idx = self._wizard_job_idx
        self._selected_referral_idx = ref_idx

        def _on_draft_close():
            # Ask user to mark the referral status before continuing
            self._wizard_mark_referral_status(ref_idx, self._wizard_after_message)

        self._draft_message_popup(on_close=_on_draft_close)

    def _wizard_after_message(self, ref_idx):
        """Called after the user marks (or skips) a referral's status post-draft."""
        self._wizard_messaged.add(ref_idx)
        row = self.rows[self._wizard_job_idx]
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
        still_unmessaged = []
        for i, name in enumerate(ref_names):
            raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
            base, _ = parse_referral_status(raw)
            if (not base or "not yet" in base.lower()) and i not in self._wizard_messaged:
                still_unmessaged.append(i)
        if not still_unmessaged:
            self._wizard_set_action_status("Waiting on referral")
            self._wizard_advance()
        else:
            self._wizard_show_step()

    # ------------------------------------------------------------------
    # Step: Follow Up
    # ------------------------------------------------------------------
    def _wizard_step_follow_up(self):
        f = self._wizard_content
        row = self.rows[self._wizard_job_idx]
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
        today = datetime.now()
        follow_up_days = self._follow_up_days

        pending = []
        for i, name in enumerate(ref_names):
            raw = ref_statuses[i].strip() if i < len(ref_statuses) else ""
            base, date_str = parse_referral_status(raw)
            if base.lower() in _OUTREACH_STATUSES and date_str:
                try:
                    sent = datetime.strptime(date_str, "%Y-%m-%d")
                    days = (today - sent).days
                    if days >= follow_up_days:
                        pending.append((i, name, days))
                except ValueError:
                    pass

        if not pending:
            self._wizard_advance()
            return

        ttk.Label(
            f, text="Follow up on referrals",
            font=("", 12), bootstyle="light",
        ).pack(anchor="w", pady=(8, 4))

        # Context about posting age
        date_posted = row.get("Date Posted", "").strip()
        if date_posted:
            try:
                posted = datetime.strptime(date_posted, "%Y-%m-%d")
                post_days = (today - posted).days
                if post_days >= 21:
                    ttk.Label(
                        f,
                        text=f"Posting is {post_days} days old, consider moving on",
                        bootstyle="danger", font=("", 9),
                    ).pack(anchor="w", pady=(0, 4))
            except ValueError:
                pass

        for ref_idx, name, days in pending:
            ref_row = ttk.Frame(f)
            ref_row.pack(fill=X, pady=(4, 4))

            ttk.Label(
                ref_row,
                text=f"{name}  -  {days}d since outreach, no response",
                font=("", 10), bootstyle="secondary",
            ).pack(side=LEFT)

            ttk.Button(
                ref_row, text="Send Follow-up",
                bootstyle="warning-outline", padding=(8, 3),
                command=lambda ri=ref_idx: self._wizard_send_followup(ri),
            ).pack(side=RIGHT, padx=(6, 0))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w", pady=(12, 0))

        ttk.Button(
            btn_row, text="Move to Ready",
            bootstyle="info-outline", padding=(12, 6),
            command=self._wizard_move_to_ready,
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Skip",
            bootstyle="secondary-outline", padding=(12, 6),
            command=self._wizard_advance,
        ).pack(side=LEFT)

    def _wizard_send_followup(self, ref_idx):
        self.selected_idx = self._wizard_job_idx
        self._selected_referral_idx = ref_idx

        def _on_followup_close():
            self._wizard_mark_referral_status(
                ref_idx, lambda ri: self._wizard_show_step(),
            )

        self._draft_message_popup(
            default_tone="Follow-up",
            on_close=_on_followup_close,
        )

    def _wizard_move_to_ready(self):
        self._wizard_set_action_status("Ready to apply")
        self._wizard_advance()

    # ------------------------------------------------------------------
    # Step: Cover Letter
    # ------------------------------------------------------------------
    def _wizard_step_cover_letter(self):
        f = self._wizard_content
        row = self.rows[self._wizard_job_idx]
        company = row.get("Company", "")
        role = row.get("Role", "")
        job_url = row.get("Job URL", "").strip()

        ttk.Label(
            f, text=f"Write a cover letter for {company}  -  {role}",
            font=("", 12), bootstyle="light",
        ).pack(anchor="w", pady=(8, 12))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w")

        if job_url:
            ttk.Button(
                btn_row, text="Open Job Posting",
                bootstyle="info-outline", padding=(12, 6),
                command=lambda: webbrowser.open(job_url),
            ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Browse CL File",
            bootstyle="success", padding=(12, 6),
            command=self._wizard_browse_cl,
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Skip",
            bootstyle="secondary-outline", padding=(12, 6),
            command=self._wizard_advance,
        ).pack(side=LEFT)

    def _wizard_browse_cl(self):
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
        row = self.rows[self._wizard_job_idx]
        row["Cover Letter Written"] = "Yes"
        row["Cover Letter File"] = filename
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        self._wizard_set_action_status("Ready to apply")
        self._wizard_advance()

    # ------------------------------------------------------------------
    # Step: Wait for Referral
    # ------------------------------------------------------------------
    def _wizard_step_wait_for_referral(self):
        f = self._wizard_content
        row = self.rows[self._wizard_job_idx]
        company = row.get("Company", "")

        ttk.Label(
            f, text="Wait for a response",
            font=("", 12, "bold"), bootstyle="info",
        ).pack(anchor="w", pady=(8, 4))

        ttk.Label(
            f,
            text=(
                f"You've reached out to your connection at {company}. "
                "Give them a few days to respond before applying."
            ),
            font=("", 10), bootstyle="secondary", wraplength=500,
        ).pack(anchor="w", pady=(4, 12))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w")

        ttk.Button(
            btn_row, text="Done",
            bootstyle="success", padding=(14, 6),
            command=self._wizard_finish_waiting,
        ).pack(side=LEFT)

    def _wizard_finish_waiting(self):
        self._wizard_set_action_status("Waiting on referral")
        self._wizard_close()

    # ------------------------------------------------------------------
    # Step: Apply
    # ------------------------------------------------------------------
    def _wizard_step_apply(self):
        f = self._wizard_content
        row = self.rows[self._wizard_job_idx]
        job_url = row.get("Job URL", "").strip()

        ttk.Label(
            f, text="Ready to apply!",
            font=("", 12, "bold"), bootstyle="success",
        ).pack(anchor="w", pady=(8, 12))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w")

        if job_url:
            ttk.Button(
                btn_row, text="Open Job Posting",
                bootstyle="info-outline", padding=(12, 6),
                command=lambda: webbrowser.open(job_url),
            ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Mark Applied",
            bootstyle="success", padding=(12, 6),
            command=self._wizard_mark_applied,
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Not ready yet",
            bootstyle="secondary-outline", padding=(12, 6),
            command=self._wizard_close,
        ).pack(side=LEFT)

    def _wizard_mark_applied(self):
        row = self.rows[self._wizard_job_idx]
        row["Application Status"] = "Applied"
        row["Date Applied"] = datetime.now().strftime("%Y-%m-%d")
        row["Action Status"] = "Applied - waiting"
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        self._wizard_close()
