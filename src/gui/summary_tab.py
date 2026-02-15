"""SummaryTabMixin: pipeline dashboard, stats, and action items."""

import tkinter as tk
import tkinter.font as tkfont
from datetime import datetime, timedelta

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import VALID_STATUSES, parse_semicolons
from gui.constants import (
    PAD_OUTER, PAD_SECTION, PAD_INNER,
    STATUS_BOOTSTYLES, RESUME_BOOTSTYLES,
)


class SummaryTabMixin:

    def _build_summary_tab(self):
        bg_color = str(self.colors.bg)
        self.summary_canvas = tk.Canvas(
            self.tab_summary, bg=bg_color, highlightthickness=0, borderwidth=0,
        )
        summary_scroll = ttk.Scrollbar(
            self.tab_summary, orient=VERTICAL, command=self.summary_canvas.yview,
        )
        self.summary_inner = ttk.Frame(self.summary_canvas)

        self.summary_inner.bind(
            "<Configure>",
            lambda e: self.summary_canvas.configure(
                scrollregion=self.summary_canvas.bbox("all"),
            ),
        )
        self.summary_canvas_window = self.summary_canvas.create_window(
            (0, 0), window=self.summary_inner, anchor="nw",
        )
        self.summary_canvas.configure(yscrollcommand=summary_scroll.set)

        # Stretch inner frame to canvas width
        self.summary_canvas.bind(
            "<Configure>",
            lambda e: self.summary_canvas.itemconfig(
                self.summary_canvas_window, width=e.width,
            ),
        )

        self.summary_canvas.pack(side=LEFT, fill=BOTH, expand=True)
        summary_scroll.pack(side=RIGHT, fill=Y)

        # --- Header ---
        ttk.Label(
            self.summary_inner, text="Pipeline Summary",
            font=("", 16, "bold"), bootstyle="primary",
        ).pack(anchor="w", padx=PAD_OUTER, pady=(PAD_OUTER, 4))

        self.summary_subtitle = ttk.Label(
            self.summary_inner, text="0 jobs tracked",
            font=("", 10), bootstyle="secondary",
        )
        self.summary_subtitle.pack(anchor="w", padx=PAD_OUTER, pady=(0, PAD_SECTION))

        # --- Stat cards row ---
        cards_frame = ttk.Frame(self.summary_inner)
        cards_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))

        self.stat_cards = {}
        for i, status in enumerate(VALID_STATUSES):
            style = STATUS_BOOTSTYLES.get(status, "secondary")
            card = ttk.Labelframe(cards_frame, text="", bootstyle=style, padding=12)
            card.grid(
                row=0, column=i, sticky="nsew",
                padx=(0, PAD_INNER if i < len(VALID_STATUSES) - 1 else 0),
            )
            cards_frame.columnconfigure(i, weight=1)

            count_label = ttk.Label(
                card, text="0", font=("", 20, "bold"), bootstyle=style,
            )
            count_label.pack()
            ttk.Label(
                card, text=status, font=("", 9), bootstyle="secondary",
            ).pack()

            self.stat_cards[status] = count_label

        # --- Status Breakdown ---
        breakdown_frame = ttk.Labelframe(
            self.summary_inner, text="Status Breakdown", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        breakdown_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))
        breakdown_frame.columnconfigure(1, weight=1)

        self.status_bars = {}
        self.status_bar_labels = {}
        for i, status in enumerate(VALID_STATUSES):
            style = STATUS_BOOTSTYLES.get(status, "secondary")
            ttk.Label(
                breakdown_frame, text=status, width=18, anchor="w",
            ).grid(row=i, column=0, sticky="w", pady=2)

            bar = ttk.Progressbar(breakdown_frame, bootstyle=style, maximum=100)
            bar.grid(row=i, column=1, sticky="ew", padx=PAD_INNER, pady=2)

            lbl = ttk.Label(breakdown_frame, text="0 (0%)", width=10, anchor="e")
            lbl.grid(row=i, column=2, sticky="e", pady=2)

            self.status_bars[status] = bar
            self.status_bar_labels[status] = lbl

        # --- Two-column row: Resume Versions + Coverage ---
        two_col = ttk.Frame(self.summary_inner)
        two_col.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))
        two_col.columnconfigure(0, weight=1)
        two_col.columnconfigure(1, weight=1)

        # Resume Versions (left)
        self.resume_frame = ttk.Labelframe(
            two_col, text="Resume Versions", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        self.resume_frame.grid(row=0, column=0, sticky="nsew", padx=(0, PAD_INNER))

        # Coverage (right)
        coverage_frame = ttk.Labelframe(
            two_col, text="Coverage", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        coverage_frame.grid(row=0, column=1, sticky="nsew")
        coverage_frame.columnconfigure(1, weight=1)

        ttk.Label(coverage_frame, text="Referrals", anchor="w").grid(
            row=0, column=0, sticky="w", pady=2,
        )
        self.referral_bar = ttk.Progressbar(
            coverage_frame, bootstyle="success", maximum=100,
        )
        self.referral_bar.grid(row=0, column=1, sticky="ew", padx=PAD_INNER, pady=2)
        self.referral_bar_label = ttk.Label(
            coverage_frame, text="0/0", anchor="e",
        )
        self.referral_bar_label.grid(row=0, column=2, sticky="e", pady=2)

        ttk.Label(coverage_frame, text="Cover Letters", anchor="w").grid(
            row=1, column=0, sticky="w", pady=2,
        )
        self.cl_bar = ttk.Progressbar(
            coverage_frame, bootstyle="success", maximum=100,
        )
        self.cl_bar.grid(row=1, column=1, sticky="ew", padx=PAD_INNER, pady=2)
        self.cl_bar_label = ttk.Label(
            coverage_frame, text="0/0", anchor="e",
        )
        self.cl_bar_label.grid(row=1, column=2, sticky="e", pady=2)

        # --- Recent Activity ---
        activity_frame = ttk.Labelframe(
            self.summary_inner, text="Recent Activity", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        activity_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))

        self.activity_week_label = ttk.Label(
            activity_frame, text="This week: 0", font=("", 11),
        )
        self.activity_week_label.pack(side=LEFT, padx=(0, PAD_SECTION * 2))
        self.activity_month_label = ttk.Label(
            activity_frame, text="This month: 0", font=("", 11),
        )
        self.activity_month_label.pack(side=LEFT)

        # --- Action Items ---
        self.action_items_frame = ttk.Labelframe(
            self.summary_inner, text="Action Items", bootstyle="warning",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        self.action_items_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_OUTER))

    def _refresh_summary(self):
        """Regenerate and display summary stats via dashboard widgets."""
        if not self.rows:
            self.summary_subtitle.config(text="No jobs in the tracker")
            for status in VALID_STATUSES:
                self.stat_cards[status].config(text="0")
                self.status_bars[status].configure(value=0)
                self.status_bar_labels[status].config(text="0 (0%)")
            for w in self.resume_frame.winfo_children():
                w.destroy()
            self.referral_bar.configure(value=0)
            self.referral_bar_label.config(text="0/0")
            self.cl_bar.configure(value=0)
            self.cl_bar_label.config(text="0/0")
            self.activity_week_label.config(text="This week: 0")
            self.activity_month_label.config(text="This month: 0")
            for w in self.action_items_frame.winfo_children():
                w.destroy()
            return

        total = len(self.rows)
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        self.summary_subtitle.config(text=f"{total} jobs tracked")

        # Status counts
        status_counts = {s: 0 for s in VALID_STATUSES}
        for row in self.rows:
            st = row.get("Application Status", "Not Yet Applied")
            status_counts[st] = status_counts.get(st, 0) + 1

        for status in VALID_STATUSES:
            count = status_counts.get(status, 0)
            pct = count / total * 100 if total else 0
            self.stat_cards[status].config(text=str(count))
            self.status_bars[status].configure(value=pct)
            self.status_bar_labels[status].config(text=f"{count} ({pct:.0f}%)")

        # Resume versions
        resume_counts = {}
        for row in self.rows:
            rv = row.get("Resume Version", "").strip()
            if rv:
                resume_counts[rv] = resume_counts.get(rv, 0) + 1

        for w in self.resume_frame.winfo_children():
            w.destroy()

        for rv, count in sorted(resume_counts.items()):
            row_frame = ttk.Frame(self.resume_frame)
            row_frame.pack(fill=X, pady=2)
            ttk.Label(row_frame, text=rv, anchor="w").pack(side=LEFT)
            color = RESUME_BOOTSTYLES.get(rv, "primary")
            ttk.Label(
                row_frame, text=str(count), font=("", 10, "bold"), bootstyle=color,
            ).pack(side=RIGHT)

        # Referral + cover letter stats
        has_referral = sum(
            1 for r in self.rows if parse_semicolons(r.get("Referral Names", ""))
        )
        cl_count = sum(
            1 for r in self.rows
            if r.get("Cover Letter Written", "").lower() == "yes"
        )

        ref_pct = has_referral / total * 100 if total else 0
        cl_pct = cl_count / total * 100 if total else 0

        self.referral_bar.configure(value=ref_pct)
        self.referral_bar_label.config(text=f"{has_referral}/{total}")
        self.cl_bar.configure(value=cl_pct)
        self.cl_bar_label.config(text=f"{cl_count}/{total}")

        # Recent activity
        apps_week = 0
        apps_month = 0
        for row in self.rows:
            date_str = row.get("Date Applied", "").strip()
            if date_str:
                try:
                    d = datetime.strptime(date_str, "%Y-%m-%d")
                    if d >= week_ago:
                        apps_week += 1
                    if d >= month_ago:
                        apps_month += 1
                except ValueError:
                    pass

        self.activity_week_label.config(text=f"This week: {apps_week}")
        self.activity_month_label.config(text=f"This month: {apps_month}")

        self._rebuild_action_items()

    def _rebuild_action_items(self):
        """Build clickable action items from current tracker data."""
        for w in self.action_items_frame.winfo_children():
            w.destroy()

        items = []
        today = datetime.now()
        not_applied_count = 0

        for idx, row in enumerate(self.rows):
            status = row.get("Application Status", "Not Yet Applied").strip()
            company = row.get("Company", "")
            role = row.get("Role", "")

            # 1. Stale applications (Applied 21+ days ago)
            if status == "Applied":
                date_str = row.get("Date Applied", "").strip()
                if date_str:
                    try:
                        applied = datetime.strptime(date_str, "%Y-%m-%d")
                        days = (today - applied).days
                        if days >= 21:
                            items.append((
                                f"Follow up: {company} - {role} (applied {days} days ago)",
                                idx,
                            ))
                    except ValueError:
                        pass

            # 2. Un-messaged referrals
            ref_names = parse_semicolons(row.get("Referral Names", ""))
            ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
            for i, name in enumerate(ref_names):
                stat = ref_statuses[i].strip().lower() if i < len(ref_statuses) else ""
                if not stat or "not yet" in stat:
                    items.append((
                        f"Message referral: {name} at {company}",
                        idx,
                    ))

            # 3. Referrals waiting on response
            for i, name in enumerate(ref_names):
                stat = ref_statuses[i].strip().lower() if i < len(ref_statuses) else ""
                if stat in ("messaged", "connect request sent"):
                    items.append((
                        f"Follow up with {name} at {company}",
                        idx,
                    ))

            # 4. Missing cover letters (Not Yet Applied, no CL)
            if status == "Not Yet Applied":
                not_applied_count += 1
                cl = row.get("Cover Letter Written", "").strip().lower()
                if cl != "yes":
                    items.append((
                        f"Write cover letter: {company} - {role}",
                        idx,
                    ))

        # 5. Large backlog
        if not_applied_count > 3:
            items.append((
                f"Review backlog: {not_applied_count} jobs still Not Yet Applied",
                None,
            ))

        if not items:
            ttk.Label(
                self.action_items_frame,
                text="No action items. You're on top of things!",
                bootstyle="success", font=("", 10),
            ).pack(anchor="w", pady=2)
            return

        link_font = tkfont.Font(size=10, underline=True)
        for text, job_idx in items:
            if job_idx is not None:
                lbl = ttk.Label(
                    self.action_items_frame, text=f"\u2022 {text}",
                    font=link_font, bootstyle="warning", cursor="hand2",
                )
                lbl.pack(anchor="w", pady=2)
                lbl.bind(
                    "<Button-1>",
                    lambda e, i=job_idx: self._open_job_from_action(i),
                )
            else:
                ttk.Label(
                    self.action_items_frame, text=f"\u2022 {text}",
                    font=("", 10), bootstyle="secondary",
                ).pack(anchor="w", pady=2)

    def _open_job_from_action(self, idx):
        """Navigate to a job in the Detail tab from an action item click."""
        self.selected_idx = idx
        self._load_detail(self.rows[idx])
        self.notebook.select(self.tab_detail)
