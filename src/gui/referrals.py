"""ReferralsMixin: referral display, add/edit popups, draft message dispatch."""

import threading
import tkinter as tk
import tkinter.font as tkfont
from tkinter import messagebox
import webbrowser

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import parse_semicolons, write_tracker, fetch_linkedin_name
from gui.helpers import incomplete_fields, parse_referral_status


class ReferralsMixin:

    REFERRAL_STATUS_OPTIONS = [
        "Not yet messaged",
        "Connect request sent",
        "Message sent",
        "Emailed",
        "Responded",
        "Resume sent",
        "Sharing internally",
        "Referral submitted",
    ]

    CONNECTION_OPTIONS = ["GT", "UCLA", ""]

    def _refresh_referral_display(self, row):
        names = parse_semicolons(row.get("Referral Names", ""))
        connections = parse_semicolons(row.get("Referral Connections", ""))
        statuses = parse_semicolons(row.get("Referral Statuses", ""))
        linkedins = parse_semicolons(row.get("Referral LinkedIns", ""))

        # Clear existing rows
        for w in self.referral_rows_frame.winfo_children():
            w.destroy()
        self._selected_referral_idx = None

        if not names:
            ttk.Label(
                self.referral_rows_frame, text="No referrals yet.",
                bootstyle="secondary", font=("", 9),
            ).pack(anchor="w", pady=4)
            return

        link_font = tkfont.Font(size=9, underline=True)

        for i, name in enumerate(names):
            conn = connections[i] if i < len(connections) else ""
            stat = statuses[i] if i < len(statuses) else ""
            li_url = linkedins[i].strip() if i < len(linkedins) else ""

            row_frame = ttk.Frame(self.referral_rows_frame)
            row_frame.pack(fill=X, pady=1)

            name_lbl = ttk.Label(row_frame, text=name, anchor="w")
            name_lbl.pack(side=LEFT, expand=True, fill=X)

            ttk.Separator(row_frame, orient=VERTICAL).pack(
                side=LEFT, fill=Y, padx=6, pady=2,
            )
            conn_lbl = ttk.Label(row_frame, text=conn, anchor="w", width=12)
            conn_lbl.pack(side=LEFT)

            ttk.Separator(row_frame, orient=VERTICAL).pack(
                side=LEFT, fill=Y, padx=6, pady=2,
            )
            stat_lbl = ttk.Label(row_frame, text=stat, anchor="w")
            stat_lbl.pack(side=LEFT, expand=True, fill=X)

            # LinkedIn link (only if URL exists)
            if li_url:
                ttk.Separator(row_frame, orient=VERTICAL).pack(
                    side=LEFT, fill=Y, padx=6, pady=2,
                )
                li_lbl = ttk.Label(
                    row_frame, text="LinkedIn", font=link_font,
                    bootstyle="info", anchor="w", cursor="hand2", width=10,
                )
                li_lbl.pack(side=LEFT)
                li_lbl.bind("<Button-1>", lambda e, url=li_url: webbrowser.open(url))

            # Click to select this referral
            def _select(event, idx=i, frame=row_frame):
                # Deselect previous
                for child in self.referral_rows_frame.winfo_children():
                    child.configure(bootstyle="default")
                frame.configure(bootstyle="info")
                self._selected_referral_idx = idx

            selectable = [row_frame, name_lbl, conn_lbl, stat_lbl]
            for widget in selectable:
                widget.bind("<Button-1>", _select)
                widget.bind("<Double-1>", lambda e, idx=i: self._edit_referral_popup())

            # Add a thin separator between rows
            if i < len(names) - 1:
                ttk.Separator(self.referral_rows_frame).pack(fill=X, pady=1)

    def _add_referral_popup(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        dlg = tk.Toplevel(self.root)
        dlg.title("Add Referral")
        dlg.transient(self.root)

        # Size and center on parent window
        w, h = 500, 360
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(400, 300)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        # Use a ttk.Frame inside the Toplevel for themed background
        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        # Row 0: LinkedIn URL + Fetch
        ttk.Label(body, text="LinkedIn URL:").grid(
            row=0, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        li_frame = ttk.Frame(body)
        li_frame.grid(row=0, column=1, sticky="ew", pady=(0, 6))
        li_entry = ttk.Entry(li_frame, width=28)
        li_entry.pack(side=LEFT, fill=X, expand=True)
        li_entry.focus_set()

        fetch_btn = ttk.Button(
            li_frame, text="Fetch", bootstyle="info", padding=(8, 2),
        )
        fetch_btn.pack(side=LEFT, padx=(6, 0))

        # Row 1: Name (auto-filled from fetch)
        ttk.Label(body, text="Name:").grid(
            row=1, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        name_entry = ttk.Entry(body, width=32)
        name_entry.grid(row=1, column=1, sticky="ew", pady=(0, 6))

        # Row 2: Connection
        ttk.Label(body, text="Connection:").grid(
            row=2, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        conn_combo = ttk.Combobox(
            body, values=self.CONNECTION_OPTIONS, width=14,
        )
        conn_combo.grid(row=2, column=1, sticky="w", pady=(0, 6))

        # Row 3: Status
        ttk.Label(body, text="Status:").grid(
            row=3, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        status_combo = ttk.Combobox(
            body, values=self.REFERRAL_STATUS_OPTIONS, width=28,
            state="readonly",
        )
        status_combo.set("Not yet messaged")
        status_combo.grid(row=3, column=1, sticky="ew", pady=(0, 6))

        # Row 4: Note
        ttk.Label(body, text="Note:").grid(
            row=4, column=0, sticky="ne", padx=(0, 8), pady=(0, 6),
        )
        note_entry = ttk.Entry(body, width=32)
        note_entry.grid(row=4, column=1, sticky="ew", pady=(0, 6))

        body.columnconfigure(1, weight=1)

        # --- LinkedIn fetch logic ---
        def _do_fetch():
            url = li_entry.get().strip()
            if not url:
                messagebox.showwarning("No URL", "Paste a LinkedIn URL first.", parent=dlg)
                return
            fetch_btn.config(text="Fetching...", state="disabled")

            def _background():
                try:
                    fetched_name = fetch_linkedin_name(url)
                except Exception:
                    fetched_name = ""
                dlg.after(0, lambda: _on_fetch_done(fetched_name))

            def _on_fetch_done(fetched_name):
                fetch_btn.config(text="Fetch", state="normal")
                if fetched_name:
                    name_entry.delete(0, END)
                    name_entry.insert(0, fetched_name)
                    name_entry.focus_set()
                else:
                    messagebox.showinfo(
                        "No name found",
                        "Could not extract a name from this URL. "
                        "You may need to enter it manually.",
                        parent=dlg,
                    )

            threading.Thread(target=_background, daemon=True).start()

        fetch_btn.config(command=_do_fetch)
        li_entry.bind("<Return>", lambda e: _do_fetch())

        def _add():
            name = name_entry.get().strip()
            if not name:
                messagebox.showwarning("Required", "Name is required.", parent=dlg)
                return

            row = self.rows[self.selected_idx]

            def append_field(field, value):
                existing = row.get(field, "").strip()
                if existing:
                    row[field] = existing + "; " + value
                else:
                    row[field] = value

            append_field("Referral Names", name)
            append_field("Referral LinkedIns", li_entry.get().strip())
            append_field("Referral Connections", conn_combo.get().strip())

            chosen_status = status_combo.get().strip()
            if chosen_status.lower() != "not yet messaged" and chosen_status:
                from datetime import datetime
                chosen_status = f"{chosen_status} {datetime.now().strftime('%Y-%m-%d')}"
            append_field("Referral Statuses", chosen_status)

            note = note_entry.get().strip()
            if note:
                existing_notes = row.get("Notes", "").strip()
                addition = f"[{name}] {note}"
                if existing_notes:
                    row["Notes"] = existing_notes + " " + addition
                else:
                    row["Notes"] = addition
                # Update Notes widget if it's loaded in the detail tab
                notes_widget = self.field_widgets.get("Notes")
                if notes_widget:
                    notes_widget.delete("1.0", END)
                    notes_widget.insert("1.0", row["Notes"])

            for field in ("Referral Names", "Referral LinkedIns",
                          "Referral Connections", "Referral Statuses"):
                w = self.field_widgets[field]
                w.delete(0, END)
                w.insert(0, row[field])

            try:
                write_tracker(self.csv_path, self.rows)
            except Exception as e:
                messagebox.showerror("Save failed", str(e), parent=dlg)
                return

            self._refresh_referral_display(row)
            self._refresh_list()

            missing = incomplete_fields(row)
            if missing:
                self.incomplete_label.config(
                    text="\u26a0  Missing: " + ", ".join(missing),
                )
                self.incomplete_frame.pack_forget()
                self.incomplete_frame.pack(
                    fill=X, padx=4, pady=(0, 2), after=self.header_frame,
                )
            else:
                self.incomplete_frame.pack_forget()

            dlg.destroy()

        btn_frame = ttk.Frame(body)
        btn_frame.grid(row=5, column=0, columnspan=2, pady=(12, 0))
        ttk.Button(
            btn_frame, text="Add", command=_add,
            bootstyle="success", padding=(16, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(16, 4),
        ).pack(side=LEFT)
        dlg.bind("<Return>", lambda e: _add())

    def _edit_referral_popup(self):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        if self._selected_referral_idx is None:
            messagebox.showwarning("No referral selected", "Click a referral to select it, then click Edit.")
            return

        ref_idx = self._selected_referral_idx
        row = self.rows[self.selected_idx]

        names = parse_semicolons(row.get("Referral Names", ""))
        linkedins = parse_semicolons(row.get("Referral LinkedIns", ""))
        connections = parse_semicolons(row.get("Referral Connections", ""))
        statuses = parse_semicolons(row.get("Referral Statuses", ""))

        cur_name = names[ref_idx] if ref_idx < len(names) else ""
        cur_li = linkedins[ref_idx] if ref_idx < len(linkedins) else ""
        cur_conn = connections[ref_idx] if ref_idx < len(connections) else ""
        cur_stat_raw = statuses[ref_idx] if ref_idx < len(statuses) else ""
        cur_base, cur_date = parse_referral_status(cur_stat_raw)

        dlg = tk.Toplevel(self.root)
        dlg.title(f"Edit Referral - {cur_name}")
        dlg.transient(self.root)

        w, h = 500, 320
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(400, 280)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(body, text="Name:").grid(
            row=0, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        name_entry = ttk.Entry(body, width=32)
        name_entry.grid(row=0, column=1, sticky="ew", pady=(0, 6))
        name_entry.insert(0, cur_name)
        name_entry.focus_set()

        ttk.Label(body, text="LinkedIn URL:").grid(
            row=1, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        li_entry = ttk.Entry(body, width=32)
        li_entry.grid(row=1, column=1, sticky="ew", pady=(0, 6))
        li_entry.insert(0, cur_li)

        ttk.Label(body, text="Connection:").grid(
            row=2, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        conn_combo = ttk.Combobox(
            body, values=self.CONNECTION_OPTIONS, width=14,
        )
        conn_combo.set(cur_conn)
        conn_combo.grid(row=2, column=1, sticky="w", pady=(0, 6))

        ttk.Label(body, text="Status:").grid(
            row=3, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        status_combo = ttk.Combobox(
            body, values=self.REFERRAL_STATUS_OPTIONS, width=28,
            state="readonly",
        )
        if cur_base in self.REFERRAL_STATUS_OPTIONS:
            status_combo.set(cur_base)
        else:
            status_combo.set(cur_base if cur_base else "Not yet messaged")
        status_combo.grid(row=3, column=1, sticky="ew", pady=(0, 6))

        body.columnconfigure(1, weight=1)

        def _save():
            name = name_entry.get().strip()
            if not name:
                messagebox.showwarning("Required", "Name is required.", parent=dlg)
                return

            # Pad lists to match ref_idx if needed
            while len(names) <= ref_idx:
                names.append("")
            while len(linkedins) <= ref_idx:
                linkedins.append("")
            while len(connections) <= ref_idx:
                connections.append("")
            while len(statuses) <= ref_idx:
                statuses.append("")

            names[ref_idx] = name
            linkedins[ref_idx] = li_entry.get().strip()
            connections[ref_idx] = conn_combo.get().strip()

            new_base = status_combo.get().strip()
            if new_base.lower() == "not yet messaged":
                statuses[ref_idx] = new_base
            elif new_base != cur_base:
                # Status changed: append today's date
                from datetime import datetime
                statuses[ref_idx] = f"{new_base} {datetime.now().strftime('%Y-%m-%d')}"
            else:
                # Same base status: keep original string (preserves existing date)
                statuses[ref_idx] = cur_stat_raw

            row["Referral Names"] = "; ".join(names)
            row["Referral LinkedIns"] = "; ".join(linkedins)
            row["Referral Connections"] = "; ".join(connections)
            row["Referral Statuses"] = "; ".join(statuses)

            for field in ("Referral Names", "Referral LinkedIns",
                          "Referral Connections", "Referral Statuses"):
                widget = self.field_widgets[field]
                widget.delete(0, END)
                widget.insert(0, row[field])

            try:
                write_tracker(self.csv_path, self.rows)
            except Exception as e:
                messagebox.showerror("Save failed", str(e), parent=dlg)
                return

            self._refresh_referral_display(row)
            self._refresh_list()
            dlg.destroy()

        btn_frame = ttk.Frame(body)
        btn_frame.grid(row=4, column=0, columnspan=2, pady=(12, 0))
        ttk.Button(
            btn_frame, text="Save", command=_save,
            bootstyle="success", padding=(16, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(16, 4),
        ).pack(side=LEFT)
        dlg.bind("<Return>", lambda e: _save())

    def _draft_message_popup(self, default_tone=None):
        if self.selected_idx is None:
            messagebox.showwarning("No selection", "Select a job first.")
            return

        if self._selected_referral_idx is None:
            messagebox.showwarning(
                "No referral selected",
                "Click a referral to select it, then click Draft Message.",
            )
            return

        ref_idx = self._selected_referral_idx
        row = self.rows[self.selected_idx]

        names = parse_semicolons(row.get("Referral Names", ""))
        connections = parse_semicolons(row.get("Referral Connections", ""))
        linkedins = parse_semicolons(row.get("Referral LinkedIns", ""))
        name = names[ref_idx] if ref_idx < len(names) else ""
        connection = connections[ref_idx] if ref_idx < len(connections) else ""
        li_url = linkedins[ref_idx].strip() if ref_idx < len(linkedins) else ""
        first_name = name.split()[0] if name else "there"
        company = row.get("Company", "the company")
        role = row.get("Role", "the role")

        self._open_draft_popup(
            first_name, company, role, name,
            connection=connection, default_tone=default_tone,
            linkedin_url=li_url,
        )
