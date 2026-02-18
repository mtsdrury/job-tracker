"""AnalyticsMixin: embedded Matplotlib charts and Pandas-driven analytics."""

import tkinter as tk
from datetime import datetime

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import VALID_STATUSES, parse_semicolons
from gui.constants import (
    PAD_OUTER, PAD_SECTION, PAD_INNER,
    STATUS_COLORS, CHART_TEXT, CHART_GRID, CHART_ACCENT,
)

# Pipeline stages in funnel order (top to bottom)
_FUNNEL_STAGES = ["Not Yet Applied", "Applied", "Interview", "Offer"]
_TERMINAL_STAGES = ["Rejected", "Withdrawn"]


class AnalyticsMixin:

    def _build_analytics_tab(self):
        """Build scrollable container with placeholder frames for each chart."""
        bg_color = str(self.colors.bg)
        self.analytics_canvas = tk.Canvas(
            self.tab_analytics, bg=bg_color, highlightthickness=0, borderwidth=0,
        )
        analytics_scroll = ttk.Scrollbar(
            self.tab_analytics, orient=VERTICAL, command=self.analytics_canvas.yview,
        )
        self.analytics_inner = ttk.Frame(self.analytics_canvas)

        self.analytics_inner.bind(
            "<Configure>",
            lambda e: self.analytics_canvas.configure(
                scrollregion=self.analytics_canvas.bbox("all"),
            ),
        )
        self.analytics_canvas_window = self.analytics_canvas.create_window(
            (0, 0), window=self.analytics_inner, anchor="nw",
        )
        self.analytics_canvas.configure(yscrollcommand=analytics_scroll.set)

        self.analytics_canvas.bind(
            "<Configure>",
            lambda e: self.analytics_canvas.itemconfig(
                self.analytics_canvas_window, width=e.width,
            ),
        )

        self.analytics_canvas.pack(side=LEFT, fill=BOTH, expand=True)
        analytics_scroll.pack(side=RIGHT, fill=Y)

        # Header
        ttk.Label(
            self.analytics_inner, text="Analytics",
            font=("", 16, "bold"), bootstyle="primary",
        ).pack(anchor="w", padx=PAD_OUTER, pady=(PAD_OUTER, 4))

        self.analytics_subtitle = ttk.Label(
            self.analytics_inner, text="",
            font=("", 10), bootstyle="secondary",
        )
        self.analytics_subtitle.pack(anchor="w", padx=PAD_OUTER, pady=(0, PAD_SECTION))

        # Summary stats frame
        self.stats_frame = ttk.Labelframe(
            self.analytics_inner, text="Key Metrics", bootstyle="info",
            padding=(PAD_SECTION, PAD_INNER, PAD_SECTION, PAD_INNER),
        )
        self.stats_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))

        # Chart containers
        self.funnel_frame = ttk.Labelframe(
            self.analytics_inner, text="Application Funnel", bootstyle="info",
            padding=PAD_INNER,
        )
        self.funnel_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))

        self.referral_frame = ttk.Labelframe(
            self.analytics_inner, text="Referral Impact", bootstyle="info",
            padding=PAD_INNER,
        )
        self.referral_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))

        self.resume_perf_frame = ttk.Labelframe(
            self.analytics_inner, text="Resume Version Performance", bootstyle="info",
            padding=PAD_INNER,
        )
        self.resume_perf_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_SECTION))

        self.timeline_frame = ttk.Labelframe(
            self.analytics_inner, text="Application Timeline", bootstyle="info",
            padding=PAD_INNER,
        )
        self.timeline_frame.pack(fill=X, padx=PAD_OUTER, pady=(0, PAD_OUTER))

        self._mpl_loaded = False

    # ------------------------------------------------------------------
    # Refresh orchestrator
    # ------------------------------------------------------------------
    def _refresh_analytics(self):
        """Rebuild all analytics charts from current data."""
        if not self._mpl_loaded:
            self._lazy_import_matplotlib()
            self._mpl_loaded = True

        if not self.rows:
            self.analytics_subtitle.config(text="No jobs in the tracker")
            self._draw_empty_state(self.stats_frame, "No data to analyze")
            self._draw_empty_state(self.funnel_frame, "No jobs tracked yet")
            self._draw_empty_state(
                self.referral_frame,
                "Need jobs both with and without referrals to compare",
            )
            self._draw_empty_state(
                self.resume_perf_frame, "No resume versions assigned yet",
            )
            self._draw_empty_state(
                self.timeline_frame, "No applications submitted yet",
            )
            return

        df = self._build_analytics_df()
        self.analytics_subtitle.config(text=f"Analyzing {len(df)} jobs")

        self._draw_summary_stats(df)
        self._draw_funnel_chart(df)
        self._draw_referral_impact(df)
        self._draw_resume_performance(df)
        self._draw_timeline(df)

    # ------------------------------------------------------------------
    # Lazy matplotlib import
    # ------------------------------------------------------------------
    def _lazy_import_matplotlib(self):
        """Import matplotlib on first use to avoid startup delay."""
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib.figure import Figure
        from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

        self._plt = plt
        self._Figure = Figure
        self._FigureCanvasTkAgg = FigureCanvasTkAgg

    # ------------------------------------------------------------------
    # DataFrame construction
    # ------------------------------------------------------------------
    def _build_analytics_df(self):
        """Convert self.rows to a Pandas DataFrame with typed columns."""
        import pandas as pd

        df = pd.DataFrame(self.rows)

        # Parse dates
        df["date_applied"] = pd.to_datetime(
            df["Date Applied"], format="%Y-%m-%d", errors="coerce",
        )

        # Boolean referral column
        df["has_referral"] = df["Referral Names"].apply(
            lambda x: len(parse_semicolons(x)) > 0,
        )

        # Status with fallback
        df["status"] = df["Application Status"].fillna("Not Yet Applied").replace(
            "", "Not Yet Applied",
        )

        # Resume version (cleaned)
        df["resume_version"] = df["Resume Version"].fillna("").str.strip()

        # Status rank for ordering
        rank_map = {s: i for i, s in enumerate(VALID_STATUSES)}
        df["status_rank"] = df["status"].map(rank_map).fillna(len(VALID_STATUSES))

        return df

    # ------------------------------------------------------------------
    # Chart helpers
    # ------------------------------------------------------------------
    def _create_chart_figure(self, figsize=(8, 3.5)):
        """Return (Figure, Axes) pre-styled for dark theme."""
        bg_color = str(self.colors.bg)
        fig = self._Figure(figsize=figsize, facecolor=bg_color, dpi=100)
        ax = fig.add_subplot(111)
        ax.set_facecolor(bg_color)
        ax.tick_params(colors=CHART_TEXT, which="both")
        ax.xaxis.label.set_color(CHART_TEXT)
        ax.yaxis.label.set_color(CHART_TEXT)
        ax.title.set_color(CHART_TEXT)
        for spine in ax.spines.values():
            spine.set_color(CHART_GRID)
        ax.grid(axis="x", color=CHART_GRID, linewidth=0.5, alpha=0.5)
        return fig, ax

    def _embed_figure(self, fig, parent_frame):
        """Clear frame and embed a matplotlib Figure as a tkinter widget."""
        for w in parent_frame.winfo_children():
            w.destroy()

        canvas = self._FigureCanvasTkAgg(fig, master=parent_frame)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=BOTH, expand=True)
        self._plt.close(fig)

    def _draw_empty_state(self, parent_frame, message):
        """Show a centered 'not enough data' label in the frame."""
        for w in parent_frame.winfo_children():
            w.destroy()
        ttk.Label(
            parent_frame, text=message,
            font=("", 11), bootstyle="secondary", anchor="center",
        ).pack(fill=X, pady=PAD_SECTION)

    # ------------------------------------------------------------------
    # Summary stats (text cards)
    # ------------------------------------------------------------------
    def _draw_summary_stats(self, df):
        """Render key metric cards above the charts."""
        for w in self.stats_frame.winfo_children():
            w.destroy()

        row_frame = ttk.Frame(self.stats_frame)
        row_frame.pack(fill=X)

        status_counts = df["status"].value_counts()
        applied_total = 0
        for s in VALID_STATUSES:
            if s != "Not Yet Applied":
                applied_total += status_counts.get(s, 0)

        interview_count = status_counts.get("Interview", 0)
        offer_count = status_counts.get("Offer", 0)

        # Interview conversion rate
        if applied_total > 0:
            interview_rate = interview_count / applied_total * 100
            interview_text = f"{interview_rate:.0f}%"
        else:
            interview_text = "N/A"

        self._add_stat_card(
            row_frame, "Interview Rate",
            interview_text,
            f"{interview_count} of {applied_total} applied",
            0,
        )

        # Referral comparison
        ref_jobs = df[df["has_referral"]]
        no_ref_jobs = df[~df["has_referral"]]

        ref_applied = ref_jobs[ref_jobs["status"] != "Not Yet Applied"]
        no_ref_applied = no_ref_jobs[no_ref_jobs["status"] != "Not Yet Applied"]

        ref_interview = len(ref_applied[ref_applied["status"].isin(["Interview", "Offer"])])
        no_ref_interview = len(no_ref_applied[no_ref_applied["status"].isin(["Interview", "Offer"])])

        ref_rate = (ref_interview / len(ref_applied) * 100) if len(ref_applied) > 0 else 0
        no_ref_rate = (no_ref_interview / len(no_ref_applied) * 100) if len(no_ref_applied) > 0 else 0

        if len(ref_applied) > 0 and len(no_ref_applied) > 0:
            diff = ref_rate - no_ref_rate
            sign = "+" if diff >= 0 else ""
            referral_text = f"{sign}{diff:.0f}pp"
            referral_sub = f"Referral: {ref_rate:.0f}% vs {no_ref_rate:.0f}%"
        elif len(ref_applied) > 0:
            referral_text = f"{ref_rate:.0f}%"
            referral_sub = "Referral interview rate (no baseline)"
        else:
            referral_text = "N/A"
            referral_sub = "No referral data yet"

        self._add_stat_card(row_frame, "Referral Advantage", referral_text, referral_sub, 1)

        # Timeline stats
        dates = df["date_applied"].dropna()
        if len(dates) > 0:
            first = dates.min().strftime("%b %d")
            last = dates.max().strftime("%b %d")
            days_active = max((dates.max() - dates.min()).days, 1)
            timeline_text = f"{len(dates)} apps"
            timeline_sub = f"{first} to {last} ({days_active} days)"
        else:
            timeline_text = "0 apps"
            timeline_sub = "No applications submitted"

        self._add_stat_card(row_frame, "Applications Sent", timeline_text, timeline_sub, 2)

        for i in range(3):
            row_frame.columnconfigure(i, weight=1)

    def _add_stat_card(self, parent, title, value, subtitle, col):
        """Add a single stat card to the grid."""
        card = ttk.Frame(parent)
        card.grid(
            row=0, column=col, sticky="nsew",
            padx=(0, PAD_INNER if col < 2 else 0), pady=PAD_INNER,
        )
        ttk.Label(
            card, text=title, font=("", 9), bootstyle="secondary",
        ).pack(anchor="w")
        ttk.Label(
            card, text=value, font=("", 18, "bold"), bootstyle="info",
        ).pack(anchor="w")
        ttk.Label(
            card, text=subtitle, font=("", 9), bootstyle="secondary",
        ).pack(anchor="w")

    # ------------------------------------------------------------------
    # Chart 1: Application Funnel
    # ------------------------------------------------------------------
    def _draw_funnel_chart(self, df):
        """Horizontal bar chart of pipeline stages with conversion %."""
        if len(df) == 0:
            self._draw_empty_state(self.funnel_frame, "No jobs tracked yet")
            return

        status_counts = df["status"].value_counts()

        # Funnel stages (top to bottom)
        stages = list(reversed(_FUNNEL_STAGES))
        counts = [status_counts.get(s, 0) for s in stages]
        colors = [STATUS_COLORS.get(s, CHART_ACCENT) for s in stages]

        # Terminal stages
        terminal_stages = []
        terminal_counts = []
        terminal_colors = []
        for s in _TERMINAL_STAGES:
            c = status_counts.get(s, 0)
            if c > 0:
                terminal_stages.append(s)
                terminal_counts.append(c)
                terminal_colors.append(STATUS_COLORS.get(s, CHART_ACCENT))

        total_bars = len(stages) + (1 if terminal_stages else 0) + (len(terminal_stages))
        fig_height = max(3, total_bars * 0.55 + 1)
        fig, ax = self._create_chart_figure(figsize=(8, fig_height))

        # Draw funnel bars
        y_positions = list(range(len(stages)))
        bars = ax.barh(y_positions, counts, color=colors, height=0.6, zorder=3)
        ax.set_yticks(y_positions)
        ax.set_yticklabels(stages)

        # Annotate counts and conversion %
        max_count = max(max(counts, default=1), 1)
        for i, (bar, count) in enumerate(zip(bars, counts)):
            ax.text(
                bar.get_width() + max_count * 0.02, bar.get_y() + bar.get_height() / 2,
                str(count), va="center", ha="left", color=CHART_TEXT,
                fontsize=10, fontweight="bold",
            )

        # Conversion % between adjacent funnel stages (from bottom to top)
        original_stages = _FUNNEL_STAGES
        original_counts = [status_counts.get(s, 0) for s in original_stages]
        for i in range(len(original_stages) - 1):
            prev_count = original_counts[i]
            next_count = original_counts[i + 1]
            if prev_count > 0:
                pct = next_count / prev_count * 100
                # Position between the two bars (reversed y-axis)
                y_idx_prev = len(stages) - 1 - i
                y_idx_next = len(stages) - 1 - (i + 1)
                mid_y = (y_idx_prev + y_idx_next) / 2
                ax.text(
                    max_count * 0.85, mid_y,
                    f"{pct:.0f}%",
                    va="center", ha="center", color=CHART_TEXT,
                    fontsize=9, fontstyle="italic", alpha=0.7,
                )

        # Draw terminal stages below a gap
        if terminal_stages:
            gap_y = -1
            ax.axhline(y=gap_y + 0.5, color=CHART_GRID, linewidth=1, linestyle="--", alpha=0.5)
            for j, (stage, count, color) in enumerate(
                zip(terminal_stages, terminal_counts, terminal_colors)
            ):
                y_pos = gap_y - j
                ax.barh(y_pos, count, color=color, height=0.6, alpha=0.6, zorder=3)
                ax.text(
                    count + max_count * 0.02, y_pos,
                    f"{count}  {stage}", va="center", ha="left",
                    color=CHART_TEXT, fontsize=9, alpha=0.7,
                )

            all_y = y_positions + [gap_y - j for j in range(len(terminal_stages))]
            all_labels = stages + [""] * len(terminal_stages)
            ax.set_yticks(all_y)
            ax.set_yticklabels(all_labels)

        ax.set_xlim(0, max_count * 1.3)
        ax.set_xlabel("Count")
        ax.grid(axis="y", visible=False)
        fig.tight_layout()
        self._embed_figure(fig, self.funnel_frame)

    # ------------------------------------------------------------------
    # Chart 2: Referral Impact
    # ------------------------------------------------------------------
    def _draw_referral_impact(self, df):
        """Grouped bar chart comparing outcomes for referral vs no-referral jobs."""
        ref_jobs = df[df["has_referral"]]
        no_ref_jobs = df[~df["has_referral"]]

        if len(ref_jobs) == 0 or len(no_ref_jobs) == 0:
            self._draw_empty_state(
                self.referral_frame,
                "Need jobs both with and without referrals to compare",
            )
            return

        # Compute rates for jobs that have been applied to
        def compute_rates(subset):
            applied = subset[subset["status"] != "Not Yet Applied"]
            total = len(applied)
            if total == 0:
                return 0, 0, total
            interview = len(applied[applied["status"].isin(["Interview", "Offer"])])
            offer = len(applied[applied["status"] == "Offer"])
            return interview / total * 100, offer / total * 100, total

        ref_int, ref_off, ref_n = compute_rates(ref_jobs)
        noref_int, noref_off, noref_n = compute_rates(no_ref_jobs)

        if ref_n == 0 and noref_n == 0:
            self._draw_empty_state(
                self.referral_frame,
                "No applications submitted yet to compare outcomes",
            )
            return

        fig, ax = self._create_chart_figure(figsize=(8, 3.5))

        import numpy as np
        x = np.arange(2)
        width = 0.3

        ref_color = "#58d68d"
        noref_color = "#adb5bd"

        bars1 = ax.bar(
            x - width / 2, [ref_int, ref_off], width,
            label=f"With Referral (n={ref_n})", color=ref_color, zorder=3,
        )
        bars2 = ax.bar(
            x + width / 2, [noref_int, noref_off], width,
            label=f"Without Referral (n={noref_n})", color=noref_color, zorder=3,
        )

        ax.set_xticks(x)
        ax.set_xticklabels(["Interview Rate", "Offer Rate"])
        ax.set_ylabel("Percentage")
        ax.set_ylim(0, max(ref_int, ref_off, noref_int, noref_off, 10) * 1.3)
        ax.grid(axis="y", color=CHART_GRID, linewidth=0.5, alpha=0.5)
        ax.grid(axis="x", visible=False)

        # Annotate bar values
        for bar in list(bars1) + list(bars2):
            height = bar.get_height()
            if height > 0:
                ax.text(
                    bar.get_x() + bar.get_width() / 2, height + 1,
                    f"{height:.0f}%", ha="center", va="bottom",
                    color=CHART_TEXT, fontsize=9, fontweight="bold",
                )

        legend = ax.legend(
            loc="upper right", facecolor=str(self.colors.bg),
            edgecolor=CHART_GRID, labelcolor=CHART_TEXT, fontsize=9,
        )

        fig.tight_layout()
        self._embed_figure(fig, self.referral_frame)

    # ------------------------------------------------------------------
    # Chart 3: Resume Version Performance
    # ------------------------------------------------------------------
    def _draw_resume_performance(self, df):
        """Stacked horizontal bar chart of status distribution per resume version."""
        versioned = df[df["resume_version"] != ""]
        if len(versioned) == 0:
            self._draw_empty_state(
                self.resume_perf_frame, "No resume versions assigned yet",
            )
            return

        versions = sorted(versioned["resume_version"].unique())
        statuses_to_show = [s for s in VALID_STATUSES if s in versioned["status"].values]

        if not statuses_to_show:
            statuses_to_show = VALID_STATUSES

        fig_height = max(2.5, len(versions) * 0.8 + 1)
        fig, ax = self._create_chart_figure(figsize=(8, fig_height))

        import numpy as np
        y_pos = np.arange(len(versions))

        left = np.zeros(len(versions))
        for status in statuses_to_show:
            counts = []
            for v in versions:
                mask = (versioned["resume_version"] == v) & (versioned["status"] == status)
                counts.append(mask.sum())
            counts = np.array(counts, dtype=float)
            color = STATUS_COLORS.get(status, CHART_ACCENT)
            ax.barh(
                y_pos, counts, left=left, height=0.5,
                label=status, color=color, zorder=3,
            )
            # Annotate non-zero segments
            for i, (c, l) in enumerate(zip(counts, left)):
                if c > 0:
                    ax.text(
                        l + c / 2, y_pos[i], str(int(c)),
                        va="center", ha="center", color="white",
                        fontsize=9, fontweight="bold",
                    )
            left += counts

        ax.set_yticks(y_pos)
        ax.set_yticklabels(versions)
        ax.set_xlabel("Count")
        ax.grid(axis="y", visible=False)

        # Totals at end of bars
        for i, total in enumerate(left):
            ax.text(
                total + 0.2, y_pos[i], f"  n={int(total)}",
                va="center", ha="left", color=CHART_TEXT, fontsize=9,
            )

        ax.set_xlim(0, max(left) * 1.25 if max(left) > 0 else 1)

        legend = ax.legend(
            loc="upper right", facecolor=str(self.colors.bg),
            edgecolor=CHART_GRID, labelcolor=CHART_TEXT, fontsize=8,
            ncol=min(len(statuses_to_show), 3),
        )

        fig.tight_layout()
        self._embed_figure(fig, self.resume_perf_frame)

    # ------------------------------------------------------------------
    # Chart 4: Application Timeline
    # ------------------------------------------------------------------
    def _draw_timeline(self, df):
        """Cumulative step-line chart of applications over time."""
        dated = df.dropna(subset=["date_applied"]).sort_values("date_applied")

        if len(dated) == 0:
            self._draw_empty_state(
                self.timeline_frame, "No applications submitted yet",
            )
            return

        import numpy as np

        dates = dated["date_applied"].values
        cumulative = np.arange(1, len(dates) + 1)

        fig, ax = self._create_chart_figure(figsize=(8, 3.5))

        ax.step(dates, cumulative, where="post", color=CHART_ACCENT, linewidth=2, zorder=3)
        ax.fill_between(
            dates, cumulative, step="post", color=CHART_ACCENT, alpha=0.15, zorder=2,
        )

        # Scatter points on each application
        ax.scatter(dates, cumulative, color=CHART_ACCENT, s=30, zorder=4)

        ax.set_ylabel("Cumulative Applications")
        ax.set_xlabel("Date")
        ax.grid(axis="y", color=CHART_GRID, linewidth=0.5, alpha=0.5)
        ax.grid(axis="x", visible=False)

        # Format x-axis dates
        fig.autofmt_xdate(rotation=30, ha="right")
        import matplotlib.dates as mdates
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))

        # Set y-axis to integers only
        ax.yaxis.set_major_locator(self._plt.MaxNLocator(integer=True))

        fig.tight_layout()
        self._embed_figure(fig, self.timeline_frame)
