"""SetupWizard: first-time setup wizard for new users."""

import random
import re
import tkinter as tk
import urllib.parse
import webbrowser
from tkinter import messagebox

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from gui.constants import (
    DEFAULT_TONE_TEMPLATES,
    DEFAULT_ACTION_STATUSES,
    STRATEGY_MODES,
    PATIENCE_PRESETS,
    DEFAULT_STALLED_DAYS,
    DEFAULT_STRATEGY_MODE,
)

_DOT_RADIUS = 8
_DOT_SPACING = 130
_DOT_COLORS = {"done": "#58d68d", "current": "#5dade2", "upcoming": "#4a4f57"}

_STEPS = [
    ("schools", "Schools", True),
    ("resumes", "Resumes", True),
    ("connections", "Connections", False),
    ("templates", "Templates", False),
    ("strategy", "Strategy", False),
    ("actions", "Actions", False),
]


class SetupWizard:
    """Modal setup wizard that runs before the main app loads.

    Usage:
        wizard = SetupWizard(root, root.style.colors)
        # blocks until the wizard window is closed
        if wizard.result:
            # save wizard.result as the config JSON
    """

    def __init__(self, parent, colors):
        self.result = None
        self._colors = colors
        self._step_idx = 0

        # Data collected by the wizard
        self._schools = []
        self._resume_versions = []
        self._connections = []
        self._connections_initialized = False
        self._default_connection_line = ""
        self._tone_templates = [dict(t) for t in DEFAULT_TONE_TEMPLATES]
        self._strategy_mode = DEFAULT_STRATEGY_MODE
        self._stalled_days = DEFAULT_STALLED_DAYS
        self._action_statuses = list(DEFAULT_ACTION_STATUSES)

        # Build the dialog
        dlg = tk.Toplevel(parent)
        dlg.title("Set Up Your Tracker")
        self._dlg = dlg

        w, h = 640, 520
        parent_x = parent.winfo_rootx()
        parent_y = parent.winfo_rooty()
        parent_w = parent.winfo_width()
        parent_h = parent.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(540, 440)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        # --- Header zone (fixed) ---
        ttk.Label(
            body, text="Set Up Your Tracker",
            font=("", 16, "bold"), bootstyle="primary",
        ).pack(anchor="w")
        ttk.Label(
            body,
            text="Configure a few settings so the tracker is ready to use.",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(2, 8))

        canvas_w = _DOT_SPACING * (len(_STEPS) - 1) + _DOT_RADIUS * 4 + 20
        self._canvas = tk.Canvas(
            body, height=50, width=max(canvas_w, 200),
            bg=str(colors.bg), highlightthickness=0,
        )
        self._canvas.pack(anchor="w", pady=(0, 4))
        ttk.Separator(body).pack(fill=X, pady=(0, 8))

        # --- Content zone (dynamic) ---
        self._content = ttk.Frame(body)
        self._content.pack(fill=BOTH, expand=True, pady=(0, 8))

        # --- Navigation zone (fixed) ---
        ttk.Separator(body).pack(fill=X, pady=(0, 8))
        nav = ttk.Frame(body)
        nav.pack(fill=X)

        cancel_lbl = ttk.Label(
            nav, text="Cancel",
            bootstyle="secondary", font=("", 9, "underline"), cursor="hand2",
        )
        cancel_lbl.pack(side=LEFT)
        cancel_lbl.bind("<Button-1>", lambda e: self._cancel())

        self._finish_btn = ttk.Button(
            nav, text="Finish", bootstyle="success", padding=(14, 4),
            command=self._finish,
        )
        self._next_btn = ttk.Button(
            nav, text="Next", bootstyle="info", padding=(14, 4),
            command=self._next,
        )
        self._skip_btn = ttk.Button(
            nav, text="Skip", bootstyle="secondary-outline", padding=(10, 4),
            command=self._skip,
        )
        self._back_btn = ttk.Button(
            nav, text="Back", bootstyle="secondary-outline", padding=(10, 4),
            command=self._back,
        )

        dlg.protocol("WM_DELETE_WINDOW", self._cancel)

        self._show_step()
        dlg.wait_window()

    # ------------------------------------------------------------------
    # Navigation
    # ------------------------------------------------------------------
    def _next(self):
        self._step_idx += 1
        self._show_step()

    def _skip(self):
        self._step_idx += 1
        self._show_step()

    def _back(self):
        if self._step_idx > 0:
            self._step_idx -= 1
            self._show_step()

    def _finish(self):
        self.result = {
            "schools": self._schools,
            "resume_versions": self._resume_versions,
            "connections": self._connections,
            "default_connection_line": self._default_connection_line,
            "tone_templates": self._tone_templates,
            "action_statuses": self._action_statuses,
            "strategy_mode": self._strategy_mode,
            "stalled_days": self._stalled_days,
        }
        self._dlg.destroy()

    def _cancel(self):
        if messagebox.askyesno(
            "Cancel Setup",
            "Are you sure you want to cancel?\n\n"
            "You can configure these settings later from the toolbar buttons.",
            parent=self._dlg,
        ):
            self.result = None
            self._dlg.destroy()

    # ------------------------------------------------------------------
    # Progress dots
    # ------------------------------------------------------------------
    def _update_dots(self):
        c = self._canvas
        c.delete("all")
        r = _DOT_RADIUS
        y = 25
        for i, (step_id, label, required) in enumerate(_STEPS):
            x = 20 + i * _DOT_SPACING
            if i < self._step_idx:
                color = _DOT_COLORS["done"]
            elif i == self._step_idx:
                color = _DOT_COLORS["current"]
            else:
                color = _DOT_COLORS["upcoming"]

            if i > 0:
                prev_x = 20 + (i - 1) * _DOT_SPACING
                line_color = (
                    _DOT_COLORS["done"]
                    if i <= self._step_idx
                    else _DOT_COLORS["upcoming"]
                )
                c.create_line(
                    prev_x + r, y, x - r, y, fill=line_color, width=2,
                )

            c.create_oval(x - r, y - r, x + r, y + r, fill=color, outline="")
            if i < self._step_idx:
                c.create_text(
                    x, y, text="\u2713", fill="#ffffff", font=("", 9, "bold"),
                )
            c.create_text(
                x, y + r + 10, text=label, fill="#adb5bd", font=("", 8),
            )

    # ------------------------------------------------------------------
    # Step display
    # ------------------------------------------------------------------
    def _show_step(self):
        self._update_dots()
        for w in self._content.winfo_children():
            w.destroy()

        step_id, title, required = _STEPS[self._step_idx]
        is_last = self._step_idx == len(_STEPS) - 1

        handler = {
            "schools": self._step_schools,
            "resumes": self._step_resumes,
            "connections": self._step_connections,
            "templates": self._step_templates,
            "strategy": self._step_strategy,
            "actions": self._step_actions,
        }[step_id]
        handler()

        # Update navigation buttons
        self._back_btn.pack_forget()
        self._skip_btn.pack_forget()
        self._next_btn.pack_forget()
        self._finish_btn.pack_forget()

        if is_last:
            self._finish_btn.pack(side=RIGHT)
        else:
            self._next_btn.pack(side=RIGHT)

        if not required:
            self._skip_btn.pack(side=RIGHT, padx=(0, 6))

        if self._step_idx > 0:
            self._back_btn.pack(side=RIGHT, padx=(0, 6))

        # Enable/disable Next based on required items
        self._update_nav_state()

    def _update_nav_state(self):
        """Enable Next/Finish only if required steps have at least 1 item."""
        _step_id, _title, required = _STEPS[self._step_idx]
        is_last = self._step_idx == len(_STEPS) - 1
        btn = self._finish_btn if is_last else self._next_btn

        if not required:
            btn.configure(state="normal")
            return

        if _step_id == "schools":
            has_items = len(self._schools) > 0
        elif _step_id == "resumes":
            has_items = len(self._resume_versions) > 0
        else:
            has_items = True

        btn.configure(state="normal" if has_items else "disabled")

    # ------------------------------------------------------------------
    # Step 1: Schools
    # ------------------------------------------------------------------
    def _step_schools(self):
        f = self._content

        ttk.Label(
            f, text="Your Schools",
            font=("", 13, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            f,
            text="Add the schools you attended. LinkedIn searches will be "
                 "filtered to alumni of these schools when looking for referrals.",
            bootstyle="secondary", font=("", 9), wraplength=580,
        ).pack(anchor="w", pady=(0, 8))

        # Scrollable list
        self._schools_list_frame = ttk.Frame(f)
        self._schools_list_frame.pack(fill=BOTH, expand=True, pady=(0, 8))
        self._rebuild_schools_list()

        # Add form
        ttk.Separator(f).pack(fill=X, pady=(0, 8))
        add_grid = ttk.Frame(f)
        add_grid.pack(fill=X)
        add_grid.columnconfigure(1, weight=1)

        ttk.Label(add_grid, text="Name:").grid(
            row=0, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        name_entry = ttk.Entry(add_grid, width=30)
        name_entry.grid(row=0, column=1, sticky="ew", pady=(0, 4))
        name_entry.focus_set()

        ttk.Label(add_grid, text="URL or ID:").grid(
            row=1, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        id_entry = ttk.Entry(add_grid, width=30)
        id_entry.grid(row=1, column=1, sticky="ew", pady=(0, 4))

        ttk.Label(add_grid, text="Status:").grid(
            row=2, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        status_combo = ttk.Combobox(
            add_grid, values=["Student", "Alum"],
            state="readonly", width=10,
        )
        status_combo.set("Student")
        status_combo.grid(row=2, column=1, sticky="w", pady=(0, 4))

        ttk.Label(
            add_grid,
            text="Paste a LinkedIn search URL with schoolFilter, or a numeric ID",
            bootstyle="secondary", font=("", 8),
        ).grid(row=3, column=1, sticky="w")

        def _add():
            name = name_entry.get().strip()
            raw_id = id_entry.get().strip()
            if not name or not raw_id:
                messagebox.showwarning(
                    "Required",
                    "Both name and URL/ID are required.",
                    parent=self._dlg,
                )
                return
            school_id = self._extract_school_id(raw_id)
            if not school_id:
                messagebox.showwarning(
                    "Invalid",
                    "Could not extract a school ID.\n\n"
                    "Paste a LinkedIn search URL that has a schoolFilter "
                    "parameter, or enter the numeric ID directly.",
                    parent=self._dlg,
                )
                return
            status = status_combo.get()
            self._schools.append({
                "name": name, "linkedin_id": school_id, "status": status,
            })
            name_entry.delete(0, END)
            id_entry.delete(0, END)
            status_combo.set("Student")
            name_entry.focus_set()
            self._rebuild_schools_list()
            self._update_nav_state()

        btn_row = ttk.Frame(f)
        btn_row.pack(fill=X, pady=(6, 0))
        ttk.Button(
            btn_row, text="Add School", command=_add,
            bootstyle="success", padding=(12, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_row, text="Find ID on LinkedIn",
            command=lambda: webbrowser.open(
                "https://www.linkedin.com/search/results/people/",
            ),
            bootstyle="info-outline", padding=(12, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_row, text="?",
            command=self._show_school_help,
            bootstyle="info", padding=(6, 4),
        ).pack(side=LEFT)

        name_entry.bind("<Return>", lambda e: id_entry.focus_set())
        id_entry.bind("<Return>", lambda e: status_combo.focus_set())
        status_combo.bind("<Return>", lambda e: _add())

    def _rebuild_schools_list(self):
        frame = self._schools_list_frame
        for child in frame.winfo_children():
            child.destroy()
        if not self._schools:
            ttk.Label(
                frame, text="No schools added yet.",
                bootstyle="secondary", font=("", 9),
            ).pack(anchor="w", pady=4)
            return
        for i, school in enumerate(self._schools):
            row = ttk.Frame(frame)
            row.pack(fill=X, pady=(0, 4))
            ttk.Label(
                row, text=school["name"], font=("", 10, "bold"),
            ).pack(side=LEFT)
            status_label = school.get("status", "Alum")
            ttk.Label(
                row,
                text=f"  ({status_label} \u00b7 ID: {school.get('linkedin_id', '?')})",
                bootstyle="secondary", font=("", 9),
            ).pack(side=LEFT)
            ttk.Button(
                row, text="x", bootstyle="danger-outline",
                padding=(4, 0),
                command=lambda idx=i: self._remove_school(idx),
            ).pack(side=RIGHT)
            ttk.Separator(frame).pack(fill=X, pady=(0, 2))

    def _remove_school(self, idx):
        self._schools.pop(idx)
        self._rebuild_schools_list()
        self._update_nav_state()

    @staticmethod
    def _extract_school_id(raw):
        """Extract a school ID from a LinkedIn URL or bare numeric ID."""
        raw = raw.strip()
        if raw.isdigit():
            return raw
        decoded = urllib.parse.unquote(raw)
        if "schoolFilter" in decoded:
            match = re.search(r'schoolFilter=\[?"?(\d+)"?', decoded)
            if match:
                return match.group(1)
        return None

    def _show_school_help(self):
        messagebox.showinfo(
            "How to find your school's LinkedIn ID",
            "1.  Click \"Open LinkedIn Search\" (or go to LinkedIn and "
            "search for anything, then click the People tab).\n\n"
            "2.  Click \"All Filters\".\n\n"
            "3.  Scroll down to \"Education\" and type your school's name. "
            "Select it from the dropdown.\n\n"
            "4.  Click \"Show results\".\n\n"
            "5.  Copy the full URL from your browser's address bar and "
            "paste it into the \"URL or ID\" field.\n\n"
            "The school ID will be extracted automatically from the URL.",
            parent=self._dlg,
        )

    # ------------------------------------------------------------------
    # Step 2: Resume Versions
    # ------------------------------------------------------------------
    def _step_resumes(self):
        f = self._content

        ttk.Label(
            f, text="Resume Versions",
            font=("", 13, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            f,
            text="Add the different versions of your resume. "
                 "Tip: name each one after the job title it targets "
                 "(e.g. \"Data Scientist\", \"ML Engineer\"). "
                 "These appear in the Resume Version dropdown when editing a job.",
            bootstyle="secondary", font=("", 9), wraplength=580,
        ).pack(anchor="w", pady=(0, 8))

        self._resumes_list_frame = ttk.Frame(f)
        self._resumes_list_frame.pack(fill=BOTH, expand=True, pady=(0, 8))
        self._rebuild_resumes_list()

        ttk.Separator(f).pack(fill=X, pady=(0, 8))
        add_row = ttk.Frame(f)
        add_row.pack(fill=X)
        add_row.columnconfigure(0, weight=1)

        version_entry = ttk.Entry(add_row, width=30)
        version_entry.grid(row=0, column=0, sticky="ew", padx=(0, 6))
        version_entry.focus_set()

        def _add():
            name = version_entry.get().strip()
            if not name:
                return
            if name in self._resume_versions:
                messagebox.showwarning(
                    "Duplicate",
                    f'"{name}" already exists.',
                    parent=self._dlg,
                )
                return
            self._resume_versions.append(name)
            version_entry.delete(0, END)
            version_entry.focus_set()
            self._rebuild_resumes_list()
            self._update_nav_state()

        ttk.Button(
            add_row, text="Add", command=_add,
            bootstyle="success", padding=(12, 4),
        ).grid(row=0, column=1)

        version_entry.bind("<Return>", lambda e: _add())

    def _rebuild_resumes_list(self):
        frame = self._resumes_list_frame
        for child in frame.winfo_children():
            child.destroy()
        if not self._resume_versions:
            ttk.Label(
                frame, text="No resume versions added yet.",
                bootstyle="secondary", font=("", 9),
            ).pack(anchor="w", pady=4)
            return
        for i, version in enumerate(self._resume_versions):
            row = ttk.Frame(frame)
            row.pack(fill=X, pady=(0, 4))
            ttk.Label(
                row, text=version, font=("", 10, "bold"),
            ).pack(side=LEFT)
            ttk.Button(
                row, text="x", bootstyle="danger-outline",
                padding=(4, 0),
                command=lambda idx=i: self._remove_resume(idx),
            ).pack(side=RIGHT)
            ttk.Separator(frame).pack(fill=X, pady=(0, 2))

    def _remove_resume(self, idx):
        self._resume_versions.pop(idx)
        self._rebuild_resumes_list()
        self._update_nav_state()

    # ------------------------------------------------------------------
    # Step 3: Connections
    # ------------------------------------------------------------------
    def _step_connections(self):
        f = self._content

        # Auto-generate connections from schools on first visit
        if not self._connections_initialized:
            self._connections_initialized = True
            for school in self._schools:
                name = school["name"]
                if school.get("status") == "Student":
                    line = f"I am a student at {name}"
                else:
                    line = f"I am also a {name} alum"
                self._connections.append({"label": name, "line": line})
            # Generic connection for existing LinkedIn connections
            self._connections.append({
                "label": "LinkedIn 1st",
                "line": "We're connected on LinkedIn and I wanted to reach out",
            })
            # Default line: generic cold opener for no shared connection
            self._default_connection_line = (
                "I came across your profile and wanted to reach out"
            )

        ttk.Label(
            f, text="Connections",
            font=("", 13, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            f,
            text="When drafting referral messages, the tracker inserts a "
                 "connection line based on how you know the person. "
                 "Edit these to match how you'd introduce yourself.",
            bootstyle="secondary", font=("", 9), wraplength=580,
        ).pack(anchor="w", pady=(0, 8))

        self._conn_list_frame = ttk.Frame(f)
        self._conn_list_frame.pack(fill=BOTH, expand=True, pady=(0, 8))
        self._rebuild_conn_list()

        # Add form
        add_frame = ttk.Frame(f)
        add_frame.pack(fill=X, pady=(0, 4))
        add_frame.columnconfigure(1, weight=1)

        ttk.Label(add_frame, text="Label:").grid(
            row=0, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        label_entry = ttk.Entry(add_frame, width=10)
        label_entry.grid(row=0, column=1, sticky="w", pady=(0, 4))

        ttk.Label(add_frame, text="Line:").grid(
            row=1, column=0, sticky="e", padx=(0, 6), pady=(0, 4),
        )
        line_entry = ttk.Entry(add_frame, width=50)
        line_entry.grid(row=1, column=1, sticky="ew", pady=(0, 4))

        def _add_conn():
            label = label_entry.get().strip()
            line = line_entry.get().strip()
            if not label or not line:
                messagebox.showwarning(
                    "Required", "Both label and line are required.",
                    parent=self._dlg,
                )
                return
            self._connections.append({"label": label, "line": line})
            label_entry.delete(0, END)
            line_entry.delete(0, END)
            label_entry.focus_set()
            self._rebuild_conn_list()

        ttk.Button(
            add_frame, text="Add Connection", command=_add_conn,
            bootstyle="success", padding=(10, 3),
        ).grid(row=2, column=1, sticky="w", pady=(2, 0))

        # Default connection line
        ttk.Separator(f).pack(fill=X, pady=(4, 4))
        def_frame = ttk.Frame(f)
        def_frame.pack(fill=X)
        def_frame.columnconfigure(1, weight=1)

        ttk.Label(
            def_frame, text="Default line:",
            font=("", 9, "bold"),
        ).grid(row=0, column=0, sticky="e", padx=(0, 6))
        self._def_conn_entry = ttk.Entry(def_frame, width=50)
        self._def_conn_entry.grid(row=0, column=1, sticky="ew")
        self._def_conn_entry.insert(0, self._default_connection_line)

        ttk.Label(
            def_frame,
            text="Used when no connection label is selected.",
            bootstyle="secondary", font=("", 8),
        ).grid(row=1, column=1, sticky="w", pady=(2, 0))

        self._def_conn_entry.bind(
            "<FocusOut>",
            lambda e: self._save_default_conn(),
        )

    def _rebuild_conn_list(self):
        frame = self._conn_list_frame
        for child in frame.winfo_children():
            child.destroy()
        if not self._connections:
            ttk.Label(
                frame, text="No connections added yet.",
                bootstyle="secondary", font=("", 9),
            ).pack(anchor="w", pady=4)
            return
        for i, conn in enumerate(self._connections):
            row = ttk.Frame(frame)
            row.pack(fill=X, pady=(0, 4))
            ttk.Label(
                row, text=conn["label"], font=("", 10, "bold"), width=8,
            ).pack(side=LEFT)
            ttk.Label(
                row, text=conn["line"],
                bootstyle="secondary", font=("", 9),
            ).pack(side=LEFT, fill=X, expand=True, padx=(8, 0))
            ttk.Button(
                row, text="x", bootstyle="danger-outline",
                padding=(4, 0),
                command=lambda idx=i: self._remove_conn(idx),
            ).pack(side=RIGHT, padx=(4, 0))
            ttk.Separator(frame).pack(fill=X, pady=(0, 2))

    def _remove_conn(self, idx):
        self._connections.pop(idx)
        self._rebuild_conn_list()

    def _save_default_conn(self):
        if hasattr(self, "_def_conn_entry"):
            self._default_connection_line = self._def_conn_entry.get().strip()

    # ------------------------------------------------------------------
    # Step 4: Message Templates
    # ------------------------------------------------------------------
    def _step_templates(self):
        f = self._content

        ttk.Label(
            f, text="Message Templates",
            font=("", 13, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            f,
            text="Templates for outreach messages to referrals. "
                 "Pre-filled with defaults you can edit or remove.",
            bootstyle="secondary", font=("", 9), wraplength=580,
        ).pack(anchor="w", pady=(0, 8))

        self._tmpl_list_frame = ttk.Frame(f)
        self._tmpl_list_frame.pack(fill=BOTH, expand=True, pady=(0, 8))
        self._rebuild_tmpl_list()

        ttk.Button(
            f, text="Add Template",
            command=lambda: self._open_template_editor(),
            bootstyle="success", padding=(10, 3),
        ).pack(anchor="w")

    def _rebuild_tmpl_list(self):
        frame = self._tmpl_list_frame
        for child in frame.winfo_children():
            child.destroy()
        if not self._tone_templates:
            ttk.Label(
                frame, text="No templates added yet.",
                bootstyle="secondary", font=("", 9),
            ).pack(anchor="w", pady=4)
            return
        for i, tmpl in enumerate(self._tone_templates):
            row = ttk.Frame(frame)
            row.pack(fill=X, pady=(0, 4))
            ttk.Label(
                row, text=tmpl["name"], font=("", 10, "bold"), width=20,
                anchor="w",
            ).pack(side=LEFT)
            preview = (
                tmpl["body"][:50] + "..."
                if len(tmpl["body"]) > 50
                else tmpl["body"]
            )
            ttk.Label(
                row, text=preview,
                bootstyle="secondary", font=("", 8),
            ).pack(side=LEFT, fill=X, expand=True, padx=(8, 0))
            ttk.Button(
                row, text="x", bootstyle="danger-outline",
                padding=(4, 0),
                command=lambda idx=i: self._remove_template(idx),
            ).pack(side=RIGHT)
            ttk.Button(
                row, text="Edit", bootstyle="info-outline",
                padding=(6, 0),
                command=lambda idx=i: self._open_template_editor(idx),
            ).pack(side=RIGHT, padx=(4, 0))
            ttk.Button(
                row, text="Preview", bootstyle="secondary-outline",
                padding=(6, 0),
                command=lambda idx=i: self._preview_template(
                    self._tone_templates[idx]["body"], self._dlg,
                ),
            ).pack(side=RIGHT, padx=(4, 0))
            ttk.Separator(frame).pack(fill=X, pady=(0, 2))

    def _remove_template(self, idx):
        self._tone_templates.pop(idx)
        self._rebuild_tmpl_list()

    def _preview_template(self, body, parent):
        """Show a sample preview of a template with placeholders filled in."""
        if not body:
            return
        conn = (
            self._connections[0]["line"]
            if self._connections
            else self._default_connection_line
        ) or "I came across your profile and wanted to reach out"
        samples = {
            "first_name": random.choice(["John", "Amanda", "Chris", "Sarah"]),
            "company": random.choice(["Acme Inc.", "Globex Corp.", "Initech", "Stark Industries"]),
            "role": random.choice(self._resume_versions) if self._resume_versions else "Data Scientist",
            "connection": conn,
        }
        filled = body
        bold_ranges = []
        for key, val in samples.items():
            placeholder = "{" + key + "}"
            start = 0
            while True:
                pos = filled.find(placeholder, start)
                if pos == -1:
                    break
                filled = filled[:pos] + val + filled[pos + len(placeholder):]
                bold_ranges.append((pos, pos + len(val)))
                start = pos + len(val)

        pw = tk.Toplevel(parent)
        pw.title("Preview")
        pw.transient(parent)
        pw.grab_set()
        pw.minsize(350, 200)
        pw_w, pw_h = 460, 300
        px = parent.winfo_rootx() + (parent.winfo_width() - pw_w) // 2
        py = parent.winfo_rooty() + (parent.winfo_height() - pw_h) // 2
        pw.geometry(f"{pw_w}x{pw_h}+{px}+{py}")

        pw_body = ttk.Frame(pw, padding=12)
        pw_body.pack(fill=BOTH, expand=True)

        ttk.Label(
            pw_body,
            text="Sample preview (placeholder values shown in bold)",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(0, 6))

        preview_text = tk.Text(
            pw_body, wrap=tk.WORD, font=("", 10), height=8,
            bg=str(self._colors.inputbg),
            fg=str(self._colors.inputfg),
            relief="flat", borderwidth=2,
        )
        preview_text.tag_configure("bold", font=("", 10, "bold"))
        preview_text.insert("1.0", filled)
        for start_pos, end_pos in bold_ranges:
            si = f"1.0+{start_pos}c"
            ei = f"1.0+{end_pos}c"
            preview_text.tag_add("bold", si, ei)
        preview_text.configure(state="disabled")
        preview_text.pack(fill=BOTH, expand=True, pady=(0, 8))

        ttk.Button(
            pw_body, text="Close", command=pw.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(anchor="e")

    def _open_template_editor(self, idx=None):
        """Open a sub-dialog to add or edit a tone template."""
        editing = idx is not None
        sub = tk.Toplevel(self._dlg)
        sub.title("Edit Template" if editing else "Add Template")
        sub.transient(self._dlg)
        sub.grab_set()

        sw, sh = 500, 350
        dx = self._dlg.winfo_rootx() + (self._dlg.winfo_width() - sw) // 2
        dy = self._dlg.winfo_rooty() + (self._dlg.winfo_height() - sh) // 2
        sub.geometry(f"{sw}x{sh}+{dx}+{dy}")
        sub.minsize(400, 300)

        sub_body = ttk.Frame(sub, padding=16)
        sub_body.pack(fill=BOTH, expand=True)

        ttk.Label(sub_body, text="Name:").pack(anchor="w", pady=(0, 4))
        name_entry = ttk.Entry(sub_body, width=30)
        name_entry.pack(fill=X, pady=(0, 8))
        name_entry.focus_set()

        ttk.Label(sub_body, text="Body:").pack(anchor="w", pady=(0, 4))
        text_kw = dict(
            bg=str(self._colors.inputbg),
            fg=str(self._colors.inputfg),
            insertbackground=str(self._colors.inputfg),
            selectbackground=str(self._colors.selectbg),
            selectforeground=str(self._colors.selectfg),
            relief="flat", borderwidth=2,
        )
        body_text = tk.Text(
            sub_body, wrap=tk.WORD, font=("", 10), height=8, **text_kw,
        )
        body_text.pack(fill=BOTH, expand=True, pady=(0, 4))

        ttk.Label(
            sub_body,
            text="Placeholders: {first_name}, {company}, {role}, {connection}",
            bootstyle="secondary", font=("", 8),
        ).pack(anchor="w", pady=(0, 8))

        if editing:
            tmpl = self._tone_templates[idx]
            name_entry.insert(0, tmpl["name"])
            body_text.insert("1.0", tmpl["body"])

        def _save():
            name = name_entry.get().strip()
            content = body_text.get("1.0", END).strip()
            if not name or not content:
                messagebox.showwarning(
                    "Required", "Both name and body are required.", parent=sub,
                )
                return
            for j, t in enumerate(self._tone_templates):
                if t["name"] == name and j != (idx if editing else -1):
                    messagebox.showwarning(
                        "Duplicate",
                        f'A template named "{name}" already exists.',
                        parent=sub,
                    )
                    return
            if editing:
                self._tone_templates[idx] = {"name": name, "body": content}
            else:
                self._tone_templates.append({"name": name, "body": content})
            self._rebuild_tmpl_list()
            sub.destroy()

        btn_row = ttk.Frame(sub_body)
        btn_row.pack(fill=X)
        ttk.Button(
            btn_row, text="Save", command=_save,
            bootstyle="success", padding=(12, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_row, text="Cancel", command=sub.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=LEFT)
        ttk.Button(
            btn_row, text="Preview", padding=(12, 4),
            bootstyle="info-outline",
            command=lambda: self._preview_template(
                body_text.get("1.0", END).strip(), sub,
            ),
        ).pack(side=RIGHT)

    # ------------------------------------------------------------------
    # Step 5: Strategy
    # ------------------------------------------------------------------
    def _step_strategy(self):
        f = self._content

        ttk.Label(
            f, text="Job Search Strategy",
            font=("", 13, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            f,
            text="Choose how you want to handle referral outreach. "
                 "This affects when jobs are flagged as stalled and "
                 "what the suggested next step is.",
            bootstyle="secondary", font=("", 9), wraplength=580,
        ).pack(anchor="w", pady=(0, 12))

        # --- Strategy mode toggle ---
        ttk.Label(
            f, text="Strategy Mode",
            font=("", 11, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 6))

        mode_frame = ttk.Frame(f)
        mode_frame.pack(fill=X, pady=(0, 16))

        self._strategy_btns = {}
        for key, info in STRATEGY_MODES.items():
            btn = ttk.Button(
                mode_frame,
                text=f"{info['label']}\n{info['description']}",
                bootstyle="info" if key == self._strategy_mode else "secondary-outline",
                padding=(16, 10),
                command=lambda k=key: self._select_strategy_mode(k),
            )
            btn.pack(side=LEFT, padx=(0, 8))
            self._strategy_btns[key] = btn

        # --- Patience preset ---
        ttk.Label(
            f, text="Stalled Threshold",
            font=("", 11, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            f,
            text="How many days without a response before a job is flagged as stalled?",
            bootstyle="secondary", font=("", 9),
        ).pack(anchor="w", pady=(0, 6))

        patience_frame = ttk.Frame(f)
        patience_frame.pack(fill=X, pady=(0, 8))

        self._patience_btns = {}
        for preset in PATIENCE_PRESETS:
            is_selected = preset["days"] == self._stalled_days
            btn = ttk.Button(
                patience_frame,
                text=preset["label"],
                bootstyle="info" if is_selected else "secondary-outline",
                padding=(16, 8),
                command=lambda p=preset: self._select_patience(p["days"]),
            )
            btn.pack(side=LEFT, padx=(0, 8))
            self._patience_btns[preset["days"]] = btn

    def _select_strategy_mode(self, mode):
        self._strategy_mode = mode
        for key, btn in self._strategy_btns.items():
            btn.configure(
                bootstyle="info" if key == mode else "secondary-outline",
            )

    def _select_patience(self, days):
        self._stalled_days = days
        for d, btn in self._patience_btns.items():
            btn.configure(
                bootstyle="info" if d == days else "secondary-outline",
            )

    # ------------------------------------------------------------------
    # Step 6: Action Statuses
    # ------------------------------------------------------------------
    def _step_actions(self):
        f = self._content

        ttk.Label(
            f, text="Action Statuses",
            font=("", 13, "bold"), bootstyle="light",
        ).pack(anchor="w", pady=(0, 4))
        ttk.Label(
            f,
            text="These statuses track what you need to do next for each job. "
                 "Pre-filled with defaults. You can reorder, add, or remove them.",
            bootstyle="secondary", font=("", 9), wraplength=580,
        ).pack(anchor="w", pady=(0, 8))

        self._actions_list_frame = ttk.Frame(f)
        self._actions_list_frame.pack(fill=BOTH, expand=True, pady=(0, 8))
        self._rebuild_actions_list()

        ttk.Separator(f).pack(fill=X, pady=(0, 8))
        add_row = ttk.Frame(f)
        add_row.pack(fill=X)
        add_row.columnconfigure(0, weight=1)

        status_entry = ttk.Entry(add_row, width=30)
        status_entry.grid(row=0, column=0, sticky="ew", padx=(0, 6))

        def _add():
            name = status_entry.get().strip()
            if not name:
                return
            if name in self._action_statuses:
                messagebox.showwarning(
                    "Duplicate",
                    f'"{name}" already exists.',
                    parent=self._dlg,
                )
                return
            self._action_statuses.append(name)
            status_entry.delete(0, END)
            status_entry.focus_set()
            self._rebuild_actions_list()

        ttk.Button(
            add_row, text="Add", command=_add,
            bootstyle="success", padding=(12, 4),
        ).grid(row=0, column=1)

        status_entry.bind("<Return>", lambda e: _add())

    def _rebuild_actions_list(self):
        frame = self._actions_list_frame
        for child in frame.winfo_children():
            child.destroy()
        if not self._action_statuses:
            ttk.Label(
                frame, text="No action statuses added yet.",
                bootstyle="secondary", font=("", 9),
            ).pack(anchor="w", pady=4)
            return
        for i, status in enumerate(self._action_statuses):
            row = ttk.Frame(frame)
            row.pack(fill=X, pady=(0, 4))
            ttk.Label(
                row, text=status, font=("", 10, "bold"),
            ).pack(side=LEFT)
            if i > 0:
                ttk.Button(
                    row, text="\u25b2", bootstyle="secondary-outline",
                    padding=(4, 0),
                    command=lambda idx=i: self._move_action(idx, -1),
                ).pack(side=RIGHT, padx=(2, 0))
            if i < len(self._action_statuses) - 1:
                ttk.Button(
                    row, text="\u25bc", bootstyle="secondary-outline",
                    padding=(4, 0),
                    command=lambda idx=i: self._move_action(idx, 1),
                ).pack(side=RIGHT, padx=(2, 0))
            ttk.Button(
                row, text="x", bootstyle="danger-outline",
                padding=(4, 0),
                command=lambda idx=i: self._remove_action(idx),
            ).pack(side=RIGHT)
            ttk.Separator(frame).pack(fill=X, pady=(0, 2))

    def _remove_action(self, idx):
        self._action_statuses.pop(idx)
        self._rebuild_actions_list()

    def _move_action(self, idx, direction):
        new_idx = idx + direction
        if 0 <= new_idx < len(self._action_statuses):
            lst = self._action_statuses
            lst[idx], lst[new_idx] = lst[new_idx], lst[idx]
            self._rebuild_actions_list()
