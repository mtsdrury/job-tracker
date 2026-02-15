"""TemplatesMixin: message template CRUD, generation, and draft popup."""

import json
import os
import sys
import tkinter as tk
from tkinter import messagebox

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from gui.constants import (
    MAX_TEMPLATES, TEMPLATES_FILENAME, TONE_OPTIONS,
    CONNECTION_TEMPLATES, DEFAULT_CONNECTION_LINE,
)


class TemplatesMixin:

    def _templates_path(self):
        """Return absolute path to message_templates.json next to the launcher."""
        if getattr(sys, "frozen", False):
            base = os.path.dirname(sys.executable)
        else:
            # Go up from src/gui/ to the project root
            base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        return os.path.join(base, TEMPLATES_FILENAME)

    def _load_templates(self):
        """Read templates from JSON. Returns [] if missing or corrupt."""
        path = self._templates_path()
        if not os.path.exists(path):
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("templates", [])
        except (json.JSONDecodeError, OSError, KeyError):
            return []

    def _save_templates(self, templates):
        """Write template list to JSON file."""
        path = self._templates_path()
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"templates": templates}, f, indent=2, ensure_ascii=False)

    def _generate_template_body(self, tone, connection):
        """Build a template string with {first_name}, {company}, {role} placeholders."""
        conn_text = CONNECTION_TEMPLATES.get(connection, "")
        if not conn_text:
            conn_text = connection if connection else DEFAULT_CONNECTION_LINE

        if tone == "Casual":
            return (
                "Hi {first_name}, I hope you're doing well! "
                f"{conn_text}. "
                "I came across the {role} role at {company} and it really "
                "stood out to me. How has your experience been? "
                "If you are open to it, I would greatly appreciate a referral."
            )
        elif tone == "Professional":
            return (
                "Dear {first_name}, I hope this message finds you well. "
                f"{conn_text}. "
                "I recently came across the {role} position at {company} "
                "and believe it aligns well with my background. "
                "I would welcome the chance to hear about your experience there. "
                "If you are open to it, I would be grateful for a referral."
            )
        else:  # Friendly Professional
            return (
                "Hi {first_name}, I hope you're doing well! "
                f"{conn_text}. "
                "I recently came across the {role} role at {company} "
                "and it caught my attention. "
                "I would love to hear about your experience there. "
                "If you are open to it, I would really appreciate a referral."
            )

    def _fill_template(self, body, first_name, company, role):
        """Replace {first_name}, {company}, {role} placeholders in body."""
        return body.replace("{first_name}", first_name).replace(
            "{company}", company
        ).replace("{role}", role)

    def _create_template_popup(self, callback=None):
        """Open a popup for creating and saving a new message template.

        callback: optional function called with the saved template dict.
        """
        templates = self._load_templates()
        if len(templates) >= MAX_TEMPLATES:
            messagebox.showwarning(
                "Template limit",
                f"You already have {MAX_TEMPLATES} templates. "
                "Delete one before creating a new one.",
            )
            return

        dlg = tk.Toplevel(self.root)
        dlg.title("Create Message Template")
        dlg.transient(self.root)

        w, h = 560, 460
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(440, 380)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        # Template Name
        ttk.Label(body, text="Template Name:").grid(
            row=0, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        name_entry = ttk.Entry(body, width=30)
        name_entry.grid(row=0, column=1, columnspan=2, sticky="ew", pady=(0, 6))
        name_entry.focus_set()

        # Tone
        ttk.Label(body, text="Tone:").grid(
            row=1, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        tone_combo = ttk.Combobox(
            body, values=TONE_OPTIONS, state="readonly", width=22,
        )
        tone_combo.set("Casual")
        tone_combo.grid(row=1, column=1, columnspan=2, sticky="w", pady=(0, 6))

        # Connection
        ttk.Label(body, text="Connection:").grid(
            row=2, column=0, sticky="e", padx=(0, 8), pady=(0, 6),
        )
        conn_combo = ttk.Combobox(
            body, values=["GT", "UCLA", ""], width=22,
        )
        conn_combo.grid(row=2, column=1, sticky="w", pady=(0, 6))

        # Generate Preview button
        gen_btn = ttk.Button(
            body, text="Generate Preview",
            bootstyle="info", padding=(10, 3),
        )
        gen_btn.grid(row=2, column=2, sticky="e", padx=(6, 0), pady=(0, 6))

        body.columnconfigure(1, weight=1)

        # Text widget for template body
        text_kw = dict(
            bg=str(self.colors.inputbg),
            fg=str(self.colors.inputfg),
            insertbackground=str(self.colors.inputfg),
            selectbackground=str(self.colors.selectbg),
            selectforeground=str(self.colors.selectfg),
            relief="flat", borderwidth=2,
        )
        text_widget = tk.Text(
            body, wrap=tk.WORD, font=("", 10), height=10, **text_kw,
        )
        text_widget.grid(
            row=3, column=0, columnspan=3, sticky="nsew",
            pady=(4, 2),
        )
        body.rowconfigure(3, weight=1)

        # Hint label
        ttk.Label(
            body, text="Variables: {first_name}  {company}  {role}",
            font=("", 8), bootstyle="secondary",
        ).grid(row=4, column=0, columnspan=3, sticky="w", pady=(0, 6))

        def _generate():
            tone = tone_combo.get()
            connection = conn_combo.get().strip()
            preview = self._generate_template_body(tone, connection)
            text_widget.delete("1.0", END)
            text_widget.insert("1.0", preview)

        gen_btn.config(command=_generate)

        def _save_template():
            tname = name_entry.get().strip()
            if not tname:
                messagebox.showwarning(
                    "Name required", "Give this template a name.", parent=dlg,
                )
                return
            tbody = text_widget.get("1.0", END).strip()
            if not tbody:
                messagebox.showwarning(
                    "Empty template", "Generate or write a template first.", parent=dlg,
                )
                return

            current = self._load_templates()
            if any(t["name"] == tname for t in current):
                messagebox.showwarning(
                    "Duplicate name",
                    f"A template named '{tname}' already exists.",
                    parent=dlg,
                )
                return
            if len(current) >= MAX_TEMPLATES:
                messagebox.showwarning(
                    "Template limit",
                    f"Maximum {MAX_TEMPLATES} templates reached.",
                    parent=dlg,
                )
                return

            template = {
                "name": tname,
                "tone": tone_combo.get(),
                "connection": conn_combo.get().strip(),
                "body": tbody,
            }
            current.append(template)
            try:
                self._save_templates(current)
            except OSError as e:
                messagebox.showerror("Save failed", str(e), parent=dlg)
                return

            dlg.destroy()
            if callback:
                callback(template)

        # Buttons
        btn_frame = ttk.Frame(body)
        btn_frame.grid(row=5, column=0, columnspan=3, pady=(6, 0))
        ttk.Button(
            btn_frame, text="Save Template", command=_save_template,
            bootstyle="success", padding=(16, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(16, 4),
        ).pack(side=LEFT)

    def _open_draft_with_templates(self, first_name, company, role,
                                   referral_name, preselect=None):
        """Open the draft message popup with a template selector dropdown."""
        templates = self._load_templates()
        if not templates:
            return

        dlg = tk.Toplevel(self.root)
        dlg.title(f"Draft Message - {referral_name}")
        dlg.transient(self.root)

        w, h = 560, 380
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(440, 300)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        # Header
        ttk.Label(
            body, text=f"LinkedIn message for {referral_name}",
            font=("", 11, "bold"), bootstyle="info",
        ).pack(anchor="w", pady=(0, 8))

        # Template selector row
        selector_frame = ttk.Frame(body)
        selector_frame.pack(fill=X, pady=(0, 8))

        ttk.Label(selector_frame, text="Template:").pack(side=LEFT, padx=(0, 6))

        template_names = [t["name"] for t in templates]
        template_combo = ttk.Combobox(
            selector_frame, values=template_names, state="readonly", width=24,
        )
        template_combo.pack(side=LEFT, padx=(0, 6))

        # Text widget
        text_kw = dict(
            bg=str(self.colors.inputbg),
            fg=str(self.colors.inputfg),
            insertbackground=str(self.colors.inputfg),
            selectbackground=str(self.colors.selectbg),
            selectforeground=str(self.colors.selectfg),
            relief="flat", borderwidth=2,
        )
        text_widget = tk.Text(
            body, wrap=tk.WORD, font=("", 10), height=8, **text_kw,
        )
        text_widget.configure(state="disabled")
        text_widget.pack(fill=BOTH, expand=True, pady=(0, 8))

        def _apply_template(event=None):
            selected_name = template_combo.get()
            current = self._load_templates()
            match = next((t for t in current if t["name"] == selected_name), None)
            if not match:
                return
            filled = self._fill_template(
                match["body"], first_name, company, role,
            )
            text_widget.configure(state="normal")
            text_widget.delete("1.0", END)
            text_widget.insert("1.0", filled)
            text_widget.configure(state="disabled")

        template_combo.bind("<<ComboboxSelected>>", _apply_template)

        # Set initial selection
        initial = preselect if preselect in template_names else template_names[0]
        template_combo.set(initial)
        _apply_template()

        # New + Delete buttons in selector row
        def _on_new():
            current = self._load_templates()
            if len(current) >= MAX_TEMPLATES:
                messagebox.showwarning(
                    "Template limit",
                    f"Maximum {MAX_TEMPLATES} templates reached.",
                    parent=dlg,
                )
                return

            def _on_created(template):
                refreshed = self._load_templates()
                new_names = [t["name"] for t in refreshed]
                template_combo.configure(values=new_names)
                template_combo.set(template["name"])
                _apply_template()

            self._create_template_popup(callback=_on_created)

        ttk.Button(
            selector_frame, text="New", command=_on_new,
            bootstyle="success-outline", padding=(8, 2),
        ).pack(side=LEFT, padx=(0, 4))

        def _on_delete():
            selected_name = template_combo.get()
            if not selected_name:
                return
            if not messagebox.askyesno(
                "Delete template",
                f"Delete template '{selected_name}'?",
                parent=dlg,
            ):
                return

            current = self._load_templates()
            current = [t for t in current if t["name"] != selected_name]
            try:
                self._save_templates(current)
            except OSError as e:
                messagebox.showerror("Save failed", str(e), parent=dlg)
                return

            if not current:
                dlg.destroy()
                return

            new_names = [t["name"] for t in current]
            template_combo.configure(values=new_names)
            template_combo.set(new_names[0])
            _apply_template()

        ttk.Button(
            selector_frame, text="Delete", command=_on_delete,
            bootstyle="danger-outline", padding=(8, 2),
        ).pack(side=LEFT)

        # Bottom buttons
        btn_frame = ttk.Frame(body)
        btn_frame.pack(fill=X)

        copy_btn = ttk.Button(
            btn_frame, text="Copy to Clipboard",
            bootstyle="success", padding=(12, 4),
        )
        copy_btn.pack(side=LEFT, padx=(0, 6))

        def _copy():
            content = text_widget.get("1.0", END).strip()
            self.root.clipboard_clear()
            self.root.clipboard_append(content)
            copy_btn.config(text="Copied!")
            dlg.after(1500, lambda: copy_btn.config(text="Copy to Clipboard"))

        copy_btn.config(command=_copy)

        edit_btn = ttk.Button(
            btn_frame, text="Edit",
            bootstyle="info-outline", padding=(12, 4),
        )
        edit_btn.pack(side=LEFT, padx=(0, 6))

        def _toggle_edit():
            if text_widget.cget("state") == "disabled":
                text_widget.configure(state="normal")
                edit_btn.config(text="Lock")
            else:
                text_widget.configure(state="disabled")
                edit_btn.config(text="Edit")

        edit_btn.config(command=_toggle_edit)

        ttk.Button(
            btn_frame, text="Close", command=dlg.destroy,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=RIGHT)
