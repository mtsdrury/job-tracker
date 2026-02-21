"""PipelineMixin: guided new-job setup wizard shown inline in the Detail tab."""

import tkinter as tk

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import write_tracker

_STEPS = ["Job Added", "Referral", "Message", "Resume", "Done"]
_DOT_RADIUS = 8
_DOT_SPACING = 120
_DOT_COLORS = {"done": "#58d68d", "current": "#5dade2", "upcoming": "#4a4f57"}


class PipelineMixin:

    # ------------------------------------------------------------------
    # Public entry / exit
    # ------------------------------------------------------------------
    def _start_pipeline(self, job_idx):
        """Enter pipeline mode for a newly added job."""
        self._pipeline_active = True
        self._pipeline_step = 0
        self._pipeline_job_idx = job_idx
        self._pipeline_referral_added = False
        self._pipeline_referral_name = None
        self._pipeline_frame = None

        self._hide_detail_form()
        self._build_pipeline_frame()
        self._show_pipeline_step(0)

    def _end_pipeline(self):
        """Exit pipeline mode and show the normal detail form."""
        self._pipeline_active = False
        if self._pipeline_frame:
            self._pipeline_frame.pack_forget()
            self._pipeline_frame.destroy()
            self._pipeline_frame = None
        self._show_detail_form()
        self.selected_idx = self._pipeline_job_idx
        self._load_detail(self.rows[self._pipeline_job_idx])

    # ------------------------------------------------------------------
    # Pipeline UI skeleton
    # ------------------------------------------------------------------
    def _build_pipeline_frame(self):
        self._pipeline_frame = ttk.Frame(self.tab_detail, padding=12)
        self._pipeline_frame.pack(fill=BOTH, expand=True)

        # Company + Role header
        row = self.rows[self._pipeline_job_idx]
        company = row.get("Company", "")
        role = row.get("Role", "")
        ttk.Label(
            self._pipeline_frame, text=f"{company}  -  {role}",
            font=("", 14, "bold"), bootstyle="primary",
        ).pack(anchor="w", pady=(0, 4))

        # Progress dots canvas
        canvas_w = _DOT_SPACING * (len(_STEPS) - 1) + _DOT_RADIUS * 4 + 20
        self._pipeline_canvas = tk.Canvas(
            self._pipeline_frame, height=50, width=canvas_w,
            bg=str(self.colors.bg), highlightthickness=0,
        )
        self._pipeline_canvas.pack(anchor="w", pady=(0, 12))
        self._update_progress_dots()

        # Content area (rebuilt per step)
        self._pipeline_content = ttk.Frame(self._pipeline_frame)
        self._pipeline_content.pack(fill=BOTH, expand=True, pady=(0, 8))

        # Exit link at bottom
        exit_lbl = ttk.Label(
            self._pipeline_frame, text="Exit to full form",
            bootstyle="secondary", font=("", 9, "underline"), cursor="hand2",
        )
        exit_lbl.pack(anchor="w")
        exit_lbl.bind("<Button-1>", lambda e: self._end_pipeline())

    def _update_progress_dots(self):
        c = self._pipeline_canvas
        c.delete("all")
        r = _DOT_RADIUS
        y = 25
        for i, label in enumerate(_STEPS):
            x = 20 + i * _DOT_SPACING
            if i < self._pipeline_step:
                color = _DOT_COLORS["done"]
            elif i == self._pipeline_step:
                color = _DOT_COLORS["current"]
            else:
                color = _DOT_COLORS["upcoming"]

            # Connecting line to previous dot
            if i > 0:
                prev_x = 20 + (i - 1) * _DOT_SPACING
                line_color = _DOT_COLORS["done"] if i <= self._pipeline_step else _DOT_COLORS["upcoming"]
                c.create_line(prev_x + r, y, x - r, y, fill=line_color, width=2)

            c.create_oval(x - r, y - r, x + r, y + r, fill=color, outline="")
            # Checkmark for completed steps
            if i < self._pipeline_step:
                c.create_text(x, y, text="\u2713", fill="#ffffff", font=("", 9, "bold"))
            c.create_text(x, y + r + 10, text=label, fill="#adb5bd", font=("", 8))

    # ------------------------------------------------------------------
    # Step display
    # ------------------------------------------------------------------
    def _show_pipeline_step(self, step):
        self._pipeline_step = step
        self._update_progress_dots()

        # Clear content area
        for w in self._pipeline_content.winfo_children():
            w.destroy()

        if step == 0:
            self._pipeline_step_added()
        elif step == 1:
            self._pipeline_step_find_referral()
        elif step == 2:
            self._pipeline_step_draft_message()
        elif step == 3:
            self._pipeline_step_resume()
        elif step == 4:
            self._pipeline_step_done()

    def _pipeline_advance(self):
        next_step = self._pipeline_step + 1
        # Skip step 2 (draft message) if no referral was added
        if next_step == 2 and not self._pipeline_referral_added:
            next_step = 3
        self._show_pipeline_step(next_step)

    # ------------------------------------------------------------------
    # Step 0: Job Added (auto-advance)
    # ------------------------------------------------------------------
    def _pipeline_step_added(self):
        f = self._pipeline_content
        ttk.Label(
            f, text="\u2713  Job added to tracker!",
            font=("", 12, "bold"), bootstyle="success",
        ).pack(anchor="w", pady=(8, 4))
        ttk.Label(
            f, text="Let's set it up...",
            bootstyle="secondary", font=("", 10),
        ).pack(anchor="w")
        self.root.after(800, self._pipeline_advance)

    # ------------------------------------------------------------------
    # Step 1: Find a Referral
    # ------------------------------------------------------------------
    def _pipeline_step_find_referral(self):
        f = self._pipeline_content
        row = self.rows[self._pipeline_job_idx]
        company = row.get("Company", "")

        ttk.Label(
            f, text=f"Do you know someone at {company}?",
            font=("", 12), bootstyle="light",
        ).pack(anchor="w", pady=(8, 12))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w")

        ttk.Button(
            btn_row, text="Search LinkedIn",
            bootstyle="info-outline", padding=(12, 6),
            command=lambda: self._pipeline_search_linkedin(company),
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Add Referral",
            bootstyle="success", padding=(12, 6),
            command=self._pipeline_add_referral,
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Skip",
            bootstyle="secondary-outline", padding=(12, 6),
            command=self._pipeline_advance,
        ).pack(side=LEFT)

    def _pipeline_search_linkedin(self, company):
        self._open_alumni_search(company)

    def _pipeline_add_referral(self):
        self.selected_idx = self._pipeline_job_idx
        self._add_referral_popup(on_complete=self._pipeline_on_referral_complete)

    def _pipeline_on_referral_complete(self, success, name=None):
        if success:
            self._pipeline_referral_added = True
            self._pipeline_referral_name = name
            self._pipeline_advance()

    # ------------------------------------------------------------------
    # Step 2: Draft a Message (only if referral was added)
    # ------------------------------------------------------------------
    def _pipeline_step_draft_message(self):
        f = self._pipeline_content
        name = self._pipeline_referral_name or "your referral"

        ttk.Label(
            f, text=f"Draft a message to {name}?",
            font=("", 12), bootstyle="light",
        ).pack(anchor="w", pady=(8, 12))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w")

        ttk.Button(
            btn_row, text="Draft Message",
            bootstyle="warning", padding=(12, 6),
            command=self._pipeline_open_draft,
        ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Skip",
            bootstyle="secondary-outline", padding=(12, 6),
            command=self._pipeline_advance,
        ).pack(side=LEFT)

    def _pipeline_open_draft(self):
        self.selected_idx = self._pipeline_job_idx
        # Select the most recently added referral
        from tracker import parse_semicolons
        row = self.rows[self._pipeline_job_idx]
        names = parse_semicolons(row.get("Referral Names", ""))
        if names:
            self._selected_referral_idx = len(names) - 1
        self._draft_message_popup(on_close=self._pipeline_advance)

    # ------------------------------------------------------------------
    # Step 3: Pick a Resume
    # ------------------------------------------------------------------
    def _pipeline_step_resume(self):
        f = self._pipeline_content

        ttk.Label(
            f, text="Which resume version for this role?",
            font=("", 12), bootstyle="light",
        ).pack(anchor="w", pady=(8, 12))

        btn_row = ttk.Frame(f)
        btn_row.pack(anchor="w")

        for version in self._resume_versions:
            ttk.Button(
                btn_row, text=version,
                bootstyle="info-outline", padding=(12, 6),
                command=lambda v=version: self._pipeline_set_resume(v),
            ).pack(side=LEFT, padx=(0, 8))

        ttk.Button(
            btn_row, text="Skip",
            bootstyle="secondary-outline", padding=(12, 6),
            command=self._pipeline_advance,
        ).pack(side=LEFT)

    def _pipeline_set_resume(self, version):
        row = self.rows[self._pipeline_job_idx]
        row["Resume Version"] = version
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)
        self._refresh_list()
        self._pipeline_advance()

    # ------------------------------------------------------------------
    # Step 4: Done (auto-transition)
    # ------------------------------------------------------------------
    def _pipeline_step_done(self):
        f = self._pipeline_content
        ttk.Label(
            f, text="\u2713  All set! Opening full details...",
            font=("", 12, "bold"), bootstyle="success",
        ).pack(anchor="w", pady=(8, 4))
        self.root.after(600, self._end_pipeline)
