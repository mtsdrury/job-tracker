"""PopupsMixin: new job, remove job, fetch results, and URL fetch logic."""

import threading
import tkinter as tk
from tkinter import messagebox

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import FIELDNAMES, write_tracker, fetch_job_details


class PopupsMixin:

    def _show_fetch_results(self, details, parent, apply_callback):
        """Show what was fetched and let the user pick which fields to apply.

        details: dict from fetch_job_details()
        parent: the parent window (dialog or root)
        apply_callback: called with a dict of only the checked fields
        """
        # Filter to fields that actually have values
        field_labels = {
            "company": "Company",
            "role": "Role",
            "location": "Location",
            "job_id": "Job ID",
            "date_posted": "Date Posted",
        }
        found = {k: v for k, v in details.items() if v and k in field_labels}

        if not found:
            messagebox.showinfo(
                "No data found",
                "Could not extract any job details from this URL.",
                parent=parent,
            )
            return

        dlg = tk.Toplevel(parent)
        dlg.title("Fetched Job Details")
        dlg.transient(parent)
        dlg.grab_set()
        dlg.attributes("-topmost", True)

        w, h = 420, 60 + len(found) * 40 + 50
        px = parent.winfo_rootx() + (parent.winfo_width() - w) // 2
        py = parent.winfo_rooty() + (parent.winfo_height() - h) // 2
        dlg.geometry(f"{w}x{h}+{px}+{py}")
        dlg.resizable(False, False)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text="Check the fields you want to apply:",
            font=("", 10), bootstyle="secondary",
        ).pack(anchor="w", pady=(0, 8))

        checks = {}
        for key, value in found.items():
            var = tk.BooleanVar(value=True)
            cb = ttk.Checkbutton(
                body,
                text=f"{field_labels[key]}:  {value}",
                variable=var,
                bootstyle="round-toggle",
            )
            cb.pack(anchor="w", pady=2)
            checks[key] = var

        def _apply():
            selected = {k: details[k] for k, var in checks.items() if var.get()}
            dlg.destroy()
            if selected:
                apply_callback(selected)

        btn_frame = ttk.Frame(body)
        btn_frame.pack(pady=(12, 0))
        ttk.Button(
            btn_frame, text="Apply", command=_apply,
            bootstyle="success", padding=(16, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(16, 4),
        ).pack(side=LEFT)

    def _fetch_from_detail_url(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        url = self.field_widgets["Job URL"].get().strip()
        if not url:
            messagebox.showwarning("No URL", "Enter a URL in the Job URL field first.")
            return

        # Map fetch result keys to Detail tab field widgets
        widget_map = {
            "company": None,       # Company is in the header, not an editable field
            "role": None,          # Same for Role
            "location": "Location",
            "job_id": "Job ID",
            "date_posted": "Date Posted",
        }

        def _apply_fields(selected):
            for key, value in selected.items():
                field_name = widget_map.get(key)
                if not field_name:
                    continue
                widget = self.field_widgets.get(field_name)
                if widget:
                    widget.delete(0, END)
                    widget.insert(0, value)

        def _background():
            try:
                details = fetch_job_details(url)
            except Exception as e:
                self.root.after(0, lambda: messagebox.showwarning(
                    "Fetch failed",
                    f"Could not extract job details:\n{e}",
                ))
                return
            self.root.after(0, lambda: self._show_fetch_results(
                details, self.root, _apply_fields,
            ))

        threading.Thread(target=_background, daemon=True).start()

    def _new_job(self):
        if self.csv_path is None:
            messagebox.showwarning("No file", "Open a CSV file first.")
            return

        dlg = tk.Toplevel(self.root)
        dlg.title("New Job")
        dlg.transient(self.root)
        dlg.grab_set()

        # Size and center on parent window
        w, h = 480, 260
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(400, 240)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        # Row 0: URL + Fetch
        ttk.Label(body, text="URL:").grid(
            row=0, column=0, padx=(0, 8), pady=(0, 6), sticky="e",
        )
        url_frame = ttk.Frame(body)
        url_frame.grid(row=0, column=1, pady=(0, 6), sticky="ew")
        url_entry = ttk.Entry(url_frame, width=34)
        url_entry.pack(side=LEFT, fill=X, expand=True)
        url_entry.focus_set()

        fetch_btn = ttk.Button(url_frame, text="Fetch", bootstyle="info", padding=(8, 2))
        fetch_btn.pack(side=LEFT, padx=(6, 0))

        # Row 1: Company
        ttk.Label(body, text="Company:").grid(
            row=1, column=0, padx=(0, 8), pady=(0, 6), sticky="e",
        )
        company_entry = ttk.Entry(body, width=34)
        company_entry.grid(row=1, column=1, pady=(0, 6), sticky="ew")

        # Row 2: Role
        ttk.Label(body, text="Role:").grid(
            row=2, column=0, padx=(0, 8), pady=(0, 6), sticky="e",
        )
        role_entry = ttk.Entry(body, width=34)
        role_entry.grid(row=2, column=1, pady=(0, 6), sticky="ew")

        # Row 3: Location
        ttk.Label(body, text="Location:").grid(
            row=3, column=0, padx=(0, 8), pady=(0, 6), sticky="e",
        )
        location_entry = ttk.Entry(body, width=34)
        location_entry.grid(row=3, column=1, pady=(0, 6), sticky="ew")

        body.columnconfigure(1, weight=1)

        # Track fetched date_posted (not shown in form but saved with the row)
        _fetched_date_posted = ""

        # --- Fetch logic (threaded) ---
        def _do_fetch():
            raw_url = url_entry.get().strip()
            if not raw_url:
                messagebox.showwarning("No URL", "Paste a URL first.", parent=dlg)
                return

            fetch_btn.config(text="Fetching...", state="disabled")

            def _background():
                try:
                    details = fetch_job_details(raw_url)
                except Exception as e:
                    dlg.after(0, lambda: _on_fetch_error(str(e)))
                    return
                dlg.after(0, lambda: _on_fetch_done(details))

            def _on_fetch_done(details):
                fetch_btn.config(text="Fetch", state="normal")
                # Store date_posted from fetch for use when creating the row
                nonlocal _fetched_date_posted
                _fetched_date_posted = details.get("date_posted", "")
                entry_map = {
                    "company": company_entry,
                    "role": role_entry,
                    "location": location_entry,
                }

                def _apply_fields(selected):
                    for key, value in selected.items():
                        entry = entry_map.get(key)
                        if entry:
                            entry.delete(0, END)
                            entry.insert(0, value)

                self._show_fetch_results(details, dlg, _apply_fields)

            def _on_fetch_error(msg):
                fetch_btn.config(text="Fetch", state="normal")
                messagebox.showwarning(
                    "Fetch failed",
                    f"Could not extract job details:\n{msg}",
                    parent=dlg,
                )

            threading.Thread(target=_background, daemon=True).start()

        fetch_btn.config(command=_do_fetch)
        url_entry.bind("<Return>", lambda e: _do_fetch())

        # --- Add logic ---
        def _add():
            company = company_entry.get().strip()
            role = role_entry.get().strip()
            if not company or not role:
                messagebox.showwarning(
                    "Required", "Company and Role are required.", parent=dlg,
                )
                return
            new_row = {field: "" for field in FIELDNAMES}
            new_row["Company"] = company
            new_row["Role"] = role
            new_row["Location"] = location_entry.get().strip()
            new_row["Job URL"] = url_entry.get().strip()
            new_row["Date Posted"] = _fetched_date_posted
            new_row["Application Status"] = "Not Yet Applied"
            new_row["Cover Letter Written"] = "No"
            self.rows.append(new_row)
            try:
                write_tracker(self.csv_path, self.rows)
            except Exception as e:
                messagebox.showerror("Save failed", str(e), parent=dlg)
                self.rows.pop()
                return
            dlg.destroy()
            self._refresh_list()
            # Select and open the new job in pipeline mode
            new_idx = len(self.rows) - 1
            self.selected_idx = new_idx
            if str(new_idx) in self.tree.get_children():
                self.tree.selection_set(str(new_idx))
                self.tree.see(str(new_idx))
            self.notebook.select(self.tab_detail)
            self._start_pipeline(new_idx)

        ttk.Button(
            body, text="Add", command=_add,
            bootstyle="success", padding=(16, 4),
        ).grid(row=4, column=0, columnspan=2, pady=(12, 0))
        # Enter in company/role/location fields triggers Add
        company_entry.bind("<Return>", lambda e: _add())
        role_entry.bind("<Return>", lambda e: _add())
        location_entry.bind("<Return>", lambda e: _add())

    def _remove_job(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        idx = int(sel[0])
        row = self.rows[idx]
        company = row.get("Company", "")
        role = row.get("Role", "")

        if not messagebox.askyesno("Confirm removal", f"Remove {company} - {role}?"):
            return

        self.rows.pop(idx)
        try:
            write_tracker(self.csv_path, self.rows)
        except Exception as e:
            messagebox.showerror("Save failed", str(e))
            return

        self.selected_idx = None
        self._refresh_list()
        self._clear_detail()
