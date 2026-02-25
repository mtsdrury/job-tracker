"""DetailTabMixin: job detail form, save, browse, next-step banner."""

import os
import tkinter as tk
import webbrowser
from tkinter import messagebox, filedialog
from datetime import date, datetime

import ttkbootstrap as ttk
from ttkbootstrap.constants import *
from ttkbootstrap.dialogs import Querybox

from tracker import VALID_STATUSES, write_tracker, parse_semicolons
from gui.constants import PAD_INNER, STATUS_BOOTSTYLES
from gui.helpers import incomplete_fields


class DetailTabMixin:

    def _build_detail_tab(self):
        # Header with status badge
        self.header_frame = ttk.Frame(self.tab_detail)
        self.header_frame.pack(fill=X, padx=4, pady=(4, 2))

        self.detail_header = ttk.Label(
            self.header_frame, text="No job selected",
            bootstyle="primary", font=("", 14, "bold"), anchor="w",
        )
        self.detail_header.pack(side=LEFT)

        self.detail_status_badge = ttk.Label(
            self.header_frame, text="", font=("", 10),
        )
        self.detail_status_badge.pack(side=LEFT, padx=(12, 0))

        # Incomplete fields bar (right below header)
        self.incomplete_frame = ttk.Frame(self.tab_detail)
        self.incomplete_label = ttk.Label(
            self.incomplete_frame, text="",
            bootstyle="warning", font=("", 9), anchor="w",
            wraplength=700, justify=LEFT,
        )
        self.incomplete_label.pack(fill=X, padx=4)

        # Next step banner (below incomplete fields)
        self.next_step_frame = ttk.Frame(self.tab_detail)
        self.next_step_label = ttk.Label(
            self.next_step_frame, text="",
            bootstyle="info", font=("", 9), anchor="w",
        )
        self.next_step_label.pack(fill=X, padx=4)

        # Save + Back buttons (fixed at bottom, outside scroll area)
        self._detail_btn_frame = ttk.Frame(self.tab_detail, padding=(PAD_INNER, PAD_INNER))
        self._detail_btn_frame.pack(side=BOTTOM, fill=X)
        self._detail_separator = ttk.Separator(self.tab_detail)
        self._detail_separator.pack(side=BOTTOM, fill=X, padx=4)

        ttk.Button(
            self._detail_btn_frame, text="Save", command=self._save_current,
            bootstyle="success", padding=(24, 6),
        ).pack(side=LEFT, padx=(0, 8))
        ttk.Button(
            self._detail_btn_frame, text="Back to list",
            command=lambda: self.notebook.select(self.tab_list),
            bootstyle="secondary-outline", padding=(16, 6),
        ).pack(side=LEFT)
        ttk.Button(
            self._detail_btn_frame, text="Withdrawn",
            command=lambda: self._mark_job_status("Withdrawn"),
            bootstyle="danger-outline", padding=(16, 6),
        ).pack(side=RIGHT)
        ttk.Button(
            self._detail_btn_frame, text="Rejected",
            command=lambda: self._mark_job_status("Rejected"),
            bootstyle="danger-outline", padding=(16, 6),
        ).pack(side=RIGHT, padx=(0, 8))
        ttk.Button(
            self._detail_btn_frame, text="Job Closed",
            command=lambda: self._mark_job_status("Closed"),
            bootstyle="danger-outline", padding=(16, 6),
        ).pack(side=RIGHT, padx=(0, 8))

        # Scrollable detail form
        bg_color = str(self.colors.bg)
        self.detail_canvas = tk.Canvas(
            self.tab_detail, bg=bg_color, highlightthickness=0, borderwidth=0,
        )
        self._detail_scrollbar = ttk.Scrollbar(
            self.tab_detail, orient=VERTICAL, command=self.detail_canvas.yview,
        )
        self.detail_frame = ttk.Frame(self.detail_canvas)

        self.detail_frame.bind(
            "<Configure>",
            lambda e: self.detail_canvas.configure(
                scrollregion=self.detail_canvas.bbox("all"),
            ),
        )
        self.detail_canvas_window = self.detail_canvas.create_window(
            (0, 0), window=self.detail_frame, anchor="nw",
        )
        self.detail_canvas.configure(yscrollcommand=self._detail_scrollbar.set)

        # Stretch inner frame to canvas width
        self.detail_canvas.bind(
            "<Configure>",
            lambda e: self.detail_canvas.itemconfig(
                self.detail_canvas_window, width=e.width,
            ),
        )

        self.detail_canvas.pack(side=LEFT, fill=BOTH, expand=True, padx=(4, 0), pady=4)
        self._detail_scrollbar.pack(side=RIGHT, fill=Y, padx=(0, 4), pady=4)

        self._build_detail_fields()

    def _build_detail_fields(self):
        f = self.detail_frame

        # Text widget colors (for tk.Text, which isn't auto-themed)
        text_kw = dict(
            bg=str(self.colors.inputbg),
            fg=str(self.colors.inputfg),
            insertbackground=str(self.colors.inputfg),
            selectbackground=str(self.colors.selectbg),
            selectforeground=str(self.colors.selectfg),
            relief="flat", borderwidth=2,
        )

        def section_header(parent, text):
            """Create a section header label with a separator line underneath."""
            header = ttk.Label(
                parent, text=text, font=("", 11, "bold"), bootstyle="info",
            )
            header.pack(anchor="w", padx=8, pady=(8, 0))
            ttk.Separator(parent).pack(fill=X, padx=8, pady=(4, 8))

        def field_row(parent, label, r, widget_type="entry", values=None, width=50):
            ttk.Label(parent, text=label + ":", anchor="e", width=20).grid(
                row=r, column=0, sticky="ne", padx=(8, 6), pady=4,
            )
            if widget_type == "combo":
                w = ttk.Combobox(parent, values=values, state="readonly", width=width)
                w.grid(row=r, column=1, sticky="ew", padx=(0, 8), pady=4)
            elif widget_type == "text":
                w = tk.Text(
                    parent, width=width, height=5, wrap=tk.WORD, font=("", 10),
                    **text_kw,
                )
                w.grid(row=r, column=1, sticky="ew", padx=(0, 8), pady=4)
            else:
                w = ttk.Entry(parent, width=width)
                w.grid(row=r, column=1, sticky="ew", padx=(0, 8), pady=4)
            self.field_widgets[label] = w
            return r + 1

        # === 1. Referrals ===
        ref_frame = ttk.Frame(f)
        ref_frame.pack(fill=X, pady=(0, PAD_INNER))

        section_header(ref_frame, "Referrals")

        ref_btn_frame = ttk.Frame(ref_frame)
        ref_btn_frame.pack(anchor="w", padx=8, pady=(0, 4))
        ttk.Button(
            ref_btn_frame, text="+ Add Referral", command=self._add_referral_popup,
            bootstyle="success-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            ref_btn_frame, text="Edit Referral", command=self._edit_referral_popup,
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            ref_btn_frame, text="Draft Message", command=self._draft_message_popup,
            bootstyle="warning-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            ref_btn_frame, text="Search LinkedIn",
            command=self._search_linkedin_for_referral,
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT)

        # Column headers row (matches data row layout)
        ref_header_row = ttk.Frame(ref_frame)
        ref_header_row.pack(fill=X, padx=8)

        ttk.Label(
            ref_header_row, text="Name", font=("", 9, "bold"),
            bootstyle="secondary", anchor="w",
        ).pack(side=LEFT, expand=True, fill=X)
        ttk.Separator(ref_header_row, orient=VERTICAL).pack(
            side=LEFT, fill=Y, padx=6, pady=2,
        )
        ttk.Label(
            ref_header_row, text="Connection", font=("", 9, "bold"),
            bootstyle="secondary", anchor="w", width=12,
        ).pack(side=LEFT)
        ttk.Separator(ref_header_row, orient=VERTICAL).pack(
            side=LEFT, fill=Y, padx=6, pady=2,
        )
        ttk.Label(
            ref_header_row, text="Status", font=("", 9, "bold"),
            bootstyle="secondary", anchor="w",
        ).pack(side=LEFT, expand=True, fill=X)
        ttk.Separator(ref_header_row, orient=VERTICAL).pack(
            side=LEFT, fill=Y, padx=6, pady=2,
        )
        ttk.Label(
            ref_header_row, text="LinkedIn", font=("", 9, "bold"),
            bootstyle="secondary", anchor="w", width=10,
        ).pack(side=LEFT)

        ttk.Separator(ref_frame).pack(fill=X, padx=8, pady=(2, 0))

        # Data rows frame (rebuilt on refresh)
        self.referral_rows_frame = ttk.Frame(ref_frame)
        self.referral_rows_frame.pack(fill=X, padx=8, pady=(0, 8))

        # Track selected referral index
        self._selected_referral_idx = None

        # Hidden entries for raw referral data (used by save/load)
        for field in ("Referral Names", "Referral LinkedIns",
                       "Referral Connections", "Referral Statuses"):
            hidden = ttk.Entry(f)
            self.field_widgets[field] = hidden

        # === 2. Resume & Cover Letter ===
        rcl_frame = ttk.Frame(f)
        rcl_frame.pack(fill=X, pady=(0, PAD_INNER))

        section_header(rcl_frame, "Resume & Cover Letter")

        rcl_grid = ttk.Frame(rcl_frame)
        rcl_grid.pack(fill=X, padx=8, pady=(0, 8))
        rcl_grid.columnconfigure(1, weight=1)

        rcl_row = 0
        rcl_row = field_row(rcl_grid, "Resume Version", rcl_row, "combo",
                            self._resume_versions + [""])
        rcl_row = field_row(
            rcl_grid, "Cover Letter Written", rcl_row, "combo", ["Yes", "No", ""],
        )

        # Cover Letter File with Browse
        ttk.Label(rcl_grid, text="Cover Letter File:", anchor="e", width=20).grid(
            row=rcl_row, column=0, sticky="ne", padx=(8, 6), pady=4,
        )
        cl_frame = ttk.Frame(rcl_grid)
        cl_frame.grid(row=rcl_row, column=1, sticky="ew", padx=(0, 8), pady=4)
        cl_entry = ttk.Entry(cl_frame)
        cl_entry.pack(side=LEFT, fill=X, expand=True)
        ttk.Button(
            cl_frame, text="Browse",
            command=lambda: self._browse_file(cl_entry, "Cover Letter",
                                              [("Word documents", "*.docx"),
                                               ("Markdown", "*.md"),
                                               ("All files", "*.*")]),
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(6, 0))
        self.field_widgets["Cover Letter File"] = cl_entry

        # === 3. Application Info ===
        app_frame = ttk.Frame(f)
        app_frame.pack(fill=X, pady=(0, PAD_INNER))

        section_header(app_frame, "Application Info")

        app_grid = ttk.Frame(app_frame)
        app_grid.pack(fill=X, padx=8, pady=(0, 8))
        app_grid.columnconfigure(1, weight=1)

        row = 0
        row = field_row(app_grid, "Application Status", row, "combo", VALID_STATUSES)
        row = field_row(app_grid, "Action Status", row, "combo",
                        self._action_statuses + [""])

        # Date Applied with Today button
        ttk.Label(app_grid, text="Date Applied:", anchor="e", width=20).grid(
            row=row, column=0, sticky="ne", padx=(8, 6), pady=4,
        )
        date_frame = ttk.Frame(app_grid)
        date_frame.grid(row=row, column=1, sticky="ew", padx=(0, 8), pady=4)
        self.date_entry = ttk.Entry(date_frame, width=14)
        self.date_entry.pack(side=LEFT)
        ttk.Button(
            date_frame, text="Today", command=self._set_today,
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(6, 0))
        self.field_widgets["Date Applied"] = self.date_entry
        row += 1

        # Date Posted with calendar button
        ttk.Label(app_grid, text="Date Posted:", anchor="e", width=20).grid(
            row=row, column=0, sticky="ne", padx=(8, 6), pady=4,
        )
        dp_frame = ttk.Frame(app_grid)
        dp_frame.grid(row=row, column=1, sticky="ew", padx=(0, 8), pady=4)
        dp_entry = ttk.Entry(dp_frame, width=14)
        dp_entry.pack(side=LEFT)
        ttk.Button(
            dp_frame, text="\U0001f4c5",
            command=lambda: self._pick_date(dp_entry),
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(6, 0))
        self.field_widgets["Date Posted"] = dp_entry
        row += 1

        row = field_row(app_grid, "Location", row)
        row = field_row(app_grid, "Job ID", row)

        # Job URL with Fetch button
        ttk.Label(app_grid, text="Job URL:", anchor="e", width=20).grid(
            row=row, column=0, sticky="ne", padx=(8, 6), pady=4,
        )
        url_frame = ttk.Frame(app_grid)
        url_frame.grid(row=row, column=1, sticky="ew", padx=(0, 8), pady=4)
        job_url_entry = ttk.Entry(url_frame, width=50)
        job_url_entry.pack(side=LEFT, fill=X, expand=True)
        ttk.Button(
            url_frame, text="Fetch", command=self._fetch_from_detail_url,
            bootstyle="info-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(6, 0))
        self.field_widgets["Job URL"] = job_url_entry
        row += 1

        # Apply button
        ttk.Button(
            app_frame, text="Apply", command=self._go_apply,
            bootstyle="success", padding=(16, 4),
        ).pack(pady=(4, 8))

        # === 4. Notes ===
        notes_frame = ttk.Frame(f)
        notes_frame.pack(fill=X, pady=(0, PAD_INNER))

        section_header(notes_frame, "Notes")

        notes_widget = tk.Text(
            notes_frame, width=50, height=5, wrap=tk.WORD, font=("", 10),
            **text_kw,
        )
        notes_widget.pack(fill=X, padx=8, pady=(0, 8))
        self.field_widgets["Notes"] = notes_widget

    def _hide_detail_form(self):
        """Hide the normal detail form widgets to make room for the pipeline."""
        self.header_frame.pack_forget()
        self.incomplete_frame.pack_forget()
        self.next_step_frame.pack_forget()
        self.detail_canvas.pack_forget()
        self._detail_scrollbar.pack_forget()
        self._detail_btn_frame.pack_forget()
        self._detail_separator.pack_forget()

    def _show_detail_form(self):
        """Re-pack the normal detail form widgets in the correct order."""
        self.header_frame.pack(fill=X, padx=4, pady=(4, 2))
        # incomplete_frame and next_step_frame are packed dynamically by _load_detail
        self._detail_btn_frame.pack(side=BOTTOM, fill=X)
        self._detail_separator.pack(side=BOTTOM, fill=X, padx=4)
        self.detail_canvas.pack(side=LEFT, fill=BOTH, expand=True, padx=(4, 0), pady=4)
        self._detail_scrollbar.pack(side=RIGHT, fill=Y, padx=(0, 4), pady=4)

    def _clear_detail(self):
        self.detail_header.config(text="No job selected")
        self.detail_status_badge.config(text="", bootstyle="secondary")
        self.selected_idx = None
        for label, widget in self.field_widgets.items():
            if isinstance(widget, tk.Text):
                widget.delete("1.0", END)
            elif isinstance(widget, ttk.Combobox):
                widget.set("")
            else:
                widget.delete(0, END)
        for w in self.referral_rows_frame.winfo_children():
            w.destroy()
        self._selected_referral_idx = None
        self.incomplete_frame.pack_forget()
        self.next_step_frame.pack_forget()

    def _load_detail(self, row):
        if getattr(self, "_pipeline_active", False):
            return
        company = row.get("Company", "")
        role = row.get("Role", "")
        self.detail_header.config(text=f"{company}  -  {role}")

        # Update status badge
        status = row.get("Application Status", "Not Yet Applied")
        badge_style = STATUS_BOOTSTYLES.get(status, "secondary") + "-inverse"
        self.detail_status_badge.config(text=f" {status} ", bootstyle=badge_style)

        field_to_csv = {
            "Application Status": "Application Status",
            "Action Status": "Action Status",
            "Date Applied": "Date Applied",
            "Date Posted": "Date Posted",
            "Location": "Location",
            "Resume Version": "Resume Version",
            "Job ID": "Job ID",
            "Job URL": "Job URL",
            "Cover Letter Written": "Cover Letter Written",
            "Cover Letter File": "Cover Letter File",
            "Referral Names": "Referral Names",
            "Referral Statuses": "Referral Statuses",
            "Referral Connections": "Referral Connections",
            "Referral LinkedIns": "Referral LinkedIns",
            "Notes": "Notes",
        }

        for label, csv_field in field_to_csv.items():
            widget = self.field_widgets[label]
            value = row.get(csv_field, "")
            if isinstance(widget, tk.Text):
                widget.delete("1.0", END)
                widget.insert("1.0", value)
            elif isinstance(widget, ttk.Combobox):
                widget.set(value)
            else:
                widget.delete(0, END)
                widget.insert(0, value)

        self._refresh_referral_display(row)

        # Incomplete fields bar
        missing = incomplete_fields(row)
        if missing:
            self.incomplete_label.config(
                text="\u26a0  Missing: " + ", ".join(missing),
            )
            self.incomplete_frame.pack_forget()
            self.incomplete_frame.pack(
                fill=X, padx=4, pady=(0, 2),
                after=self.header_frame,
            )
        else:
            self.incomplete_frame.pack_forget()

        # Next step banner
        self._update_next_step_banner(row)

    def _search_linkedin_for_referral(self):
        """Open LinkedIn alumni search for the current job's company."""
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return
        company = self.rows[self.selected_idx].get("Company", "").strip()
        if not company:
            messagebox.showwarning("No company", "This job has no company name.")
            return
        self._open_alumni_search(company)

    def _mark_job_status(self, status):
        """Mark the current job with the given status after confirmation."""
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return
        row = self.rows[self.selected_idx]
        company = row.get("Company", "")
        role = row.get("Role", "")
        if not messagebox.askyesno(
            status,
            f"Mark {company} - {role} as {status}?",
        ):
            return
        self.field_widgets["Application Status"].set(status)
        self._save_current()

    def _go_apply(self):
        """Open the job URL in a browser, then ask if they applied."""
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return
        url = self.field_widgets["Job URL"].get().strip()
        if not url:
            messagebox.showwarning("No URL", "This job has no URL set.")
            return
        webbrowser.open(url)

        # Ask on return
        self._pending_apply_check = True
        self.root.bind("<FocusIn>", self._on_return_from_apply, add=True)

    def _on_return_from_apply(self, event):
        """When the app regains focus after Apply, ask if they submitted."""
        if not getattr(self, "_pending_apply_check", False):
            return
        self._pending_apply_check = False
        self.root.unbind("<FocusIn>")

        if self.selected_idx is None:
            return

        applied = messagebox.askyesno(
            "Did you apply?",
            "Did you submit the application?",
        )
        if applied:
            today = datetime.now().strftime("%Y-%m-%d")
            self.field_widgets["Application Status"].set("Applied")
            self.date_entry.delete(0, END)
            self.date_entry.insert(0, today)
            self._save_current()

    def _set_today(self):
        self.date_entry.delete(0, END)
        self.date_entry.insert(0, datetime.now().strftime("%Y-%m-%d"))
        status_widget = self.field_widgets.get("Application Status")
        if status_widget and status_widget.get() == "Not Yet Applied":
            status_widget.set("Applied")

    def _pick_date(self, entry_widget):
        """Open a calendar popup and fill the entry with the chosen date."""
        current = entry_widget.get().strip()
        start = None
        if current:
            try:
                start = datetime.strptime(current, "%Y-%m-%d").date()
            except ValueError:
                pass
        chosen = Querybox.get_date(
            parent=self.root,
            title="Select date",
            startdate=start or date.today(),
        )
        if chosen:
            entry_widget.delete(0, END)
            entry_widget.insert(0, chosen.strftime("%Y-%m-%d"))

    def _browse_file(self, entry_widget, title, filetypes):
        path = filedialog.askopenfilename(
            title=f"Select {title}", filetypes=filetypes,
        )
        if not path:
            return
        filename = os.path.basename(path)
        entry_widget.delete(0, END)
        entry_widget.insert(0, filename)
        if "Cover Letter" in title:
            self.field_widgets["Cover Letter Written"].set("Yes")

    def _update_next_step_banner(self, row):
        """Show a contextual 'next step' suggestion below the header area."""
        status = row.get("Application Status", "Not Yet Applied").strip()

        # Hide for closed statuses
        if status in ("Rejected", "Withdrawn", "Closed"):
            self.next_step_frame.pack_forget()
            return

        # Check for un-messaged referral
        ref_names = parse_semicolons(row.get("Referral Names", ""))
        ref_statuses = parse_semicolons(row.get("Referral Statuses", ""))
        unmessaged_name = None
        for i, name in enumerate(ref_names):
            stat = ref_statuses[i].strip().lower() if i < len(ref_statuses) else ""
            if not stat or "not yet" in stat:
                unmessaged_name = name
                break

        next_text = None

        if unmessaged_name:
            next_text = f"\u27a4  Next: Message {unmessaged_name} on LinkedIn"
        elif status == "Not Yet Applied":
            cl = row.get("Cover Letter Written", "").strip().lower()
            rv = row.get("Resume Version", "").strip()
            if cl != "yes":
                next_text = "\u27a4  Next: Write cover letter"
            elif not rv:
                next_text = "\u27a4  Next: Choose resume version"
            else:
                next_text = "\u27a4  Next: Submit application"
        elif status == "Applied":
            date_str = row.get("Date Applied", "").strip()
            days_ago = None
            if date_str:
                try:
                    applied = datetime.strptime(date_str, "%Y-%m-%d")
                    days_ago = (datetime.now() - applied).days
                except ValueError:
                    pass
            if days_ago is not None and days_ago >= 21:
                next_text = "\u27a4  Next: Follow up on application"
            else:
                next_text = "\u27a4  Next: Waiting on response"
        elif status == "Interview":
            next_text = "\u27a4  Next: Prepare for interview"
        elif status == "Offer":
            next_text = "\u27a4  Next: Evaluate offer"

        if next_text:
            self.next_step_label.config(text=next_text)
            self.next_step_frame.pack_forget()
            # Pack after incomplete_frame if visible, else after header
            if self.incomplete_frame.winfo_manager():
                self.next_step_frame.pack(
                    fill=X, padx=4, pady=(0, 2),
                    after=self.incomplete_frame,
                )
            else:
                self.next_step_frame.pack(
                    fill=X, padx=4, pady=(0, 2),
                    after=self.header_frame,
                )
        else:
            self.next_step_frame.pack_forget()

    def _save_current(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        row = self.rows[self.selected_idx]

        date_val = self.field_widgets["Date Applied"].get().strip()
        if date_val:
            try:
                datetime.strptime(date_val, "%Y-%m-%d")
            except ValueError:
                messagebox.showerror(
                    "Invalid date",
                    f"'{date_val}' is not a valid date. Use YYYY-MM-DD.",
                )
                return

        field_to_csv = {
            "Application Status": "Application Status",
            "Action Status": "Action Status",
            "Date Applied": "Date Applied",
            "Date Posted": "Date Posted",
            "Location": "Location",
            "Resume Version": "Resume Version",
            "Job ID": "Job ID",
            "Job URL": "Job URL",
            "Cover Letter Written": "Cover Letter Written",
            "Cover Letter File": "Cover Letter File",
            "Referral Names": "Referral Names",
            "Referral Statuses": "Referral Statuses",
            "Referral Connections": "Referral Connections",
            "Referral LinkedIns": "Referral LinkedIns",
            "Notes": "Notes",
        }

        for label, csv_field in field_to_csv.items():
            widget = self.field_widgets[label]
            if isinstance(widget, tk.Text):
                row[csv_field] = widget.get("1.0", END).strip()
            elif isinstance(widget, ttk.Combobox):
                row[csv_field] = widget.get()
            else:
                row[csv_field] = widget.get().strip()

        if row["Date Applied"] and row["Application Status"] == "Not Yet Applied":
            row["Application Status"] = "Applied"
            self.field_widgets["Application Status"].set("Applied")

        try:
            write_tracker(self.csv_path, self.rows)
        except Exception as e:
            messagebox.showerror("Save failed", str(e))
            return

        self._refresh_list()
        self._load_detail(row)
