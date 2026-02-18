"""TemplatesMixin: tone-based message generation and draft popup."""

import tkinter as tk
import webbrowser

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from gui.constants import (
    TONE_OPTIONS, CONNECTION_TEMPLATES, DEFAULT_CONNECTION_LINE,
)


class TemplatesMixin:

    def _generate_message(self, tone, connection):
        """Build a message with {first_name}, {company}, {role} placeholders."""
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
        elif tone == "Follow-up":
            return (
                "Hi {first_name}, I hope you're doing well! "
                "I wanted to follow up on my previous message about the "
                "{role} role at {company}. I am still very interested "
                "in the position and would love to connect if you have a "
                "chance. Thank you for your time!"
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

    def _fill_message(self, body, first_name, company, role):
        """Replace {first_name}, {company}, {role} placeholders in body."""
        return body.replace("{first_name}", first_name).replace(
            "{company}", company
        ).replace("{role}", role)

    def _open_draft_popup(self, first_name, company, role, referral_name,
                          connection="", default_tone=None, linkedin_url=""):
        """Open a draft message popup. Generates message from tone + connection."""
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

        # Header row with LinkedIn link
        header_frame = ttk.Frame(body)
        header_frame.pack(fill=X, pady=(0, 8))

        ttk.Label(
            header_frame, text=f"LinkedIn message for {referral_name}",
            font=("", 11, "bold"), bootstyle="info",
        ).pack(side=LEFT)

        # Tone + Connection row
        selector_frame = ttk.Frame(body)
        selector_frame.pack(fill=X, pady=(0, 8))

        ttk.Label(selector_frame, text="Tone:").pack(side=LEFT, padx=(0, 4))
        tone_combo = ttk.Combobox(
            selector_frame, values=TONE_OPTIONS, state="readonly", width=20,
        )
        tone_combo.pack(side=LEFT, padx=(0, 12))

        ttk.Label(selector_frame, text="Connection:").pack(side=LEFT, padx=(0, 4))
        conn_combo = ttk.Combobox(
            selector_frame, values=["GT", "UCLA", ""], width=14,
        )
        conn_combo.pack(side=LEFT)

        # Pre-fill connection from referral data
        if connection:
            conn_combo.set(connection)

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

        def _regenerate(event=None):
            tone = tone_combo.get()
            conn = conn_combo.get().strip()
            template = self._generate_message(tone, conn)
            filled = self._fill_message(template, first_name, company, role)
            text_widget.configure(state="normal")
            text_widget.delete("1.0", END)
            text_widget.insert("1.0", filled)
            text_widget.configure(state="disabled")

        tone_combo.bind("<<ComboboxSelected>>", _regenerate)
        conn_combo.bind("<<ComboboxSelected>>", _regenerate)
        conn_combo.bind("<Return>", _regenerate)
        conn_combo.bind("<FocusOut>", _regenerate)

        # Set initial tone and generate
        initial_tone = default_tone if default_tone in TONE_OPTIONS else "Casual"
        tone_combo.set(initial_tone)
        _regenerate()

        # Bottom buttons
        btn_frame = ttk.Frame(body)
        btn_frame.pack(fill=X)

        if linkedin_url:
            copy_open_btn = ttk.Button(
                btn_frame, text="Copy & Open Profile",
                bootstyle="success", padding=(12, 4),
            )
            copy_open_btn.pack(side=LEFT, padx=(0, 6))

            def _copy_and_open():
                content = text_widget.get("1.0", END).strip()
                self.root.clipboard_clear()
                self.root.clipboard_append(content)
                webbrowser.open(linkedin_url)
                copy_open_btn.config(text="Copied!")
                dlg.after(1500, lambda: copy_open_btn.config(text="Copy & Open Profile"))

            copy_open_btn.config(command=_copy_and_open)
        else:
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
