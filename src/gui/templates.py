"""TemplatesMixin: tone-based message generation and draft popup."""

import tkinter as tk
import webbrowser

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

class TemplatesMixin:

    def _generate_message(self, tone, connection):
        """Build a message with {first_name}, {company}, {role} placeholders."""
        # Look up tone template body by name
        template_body = ""
        for t in self._tone_templates:
            if t["name"] == tone:
                template_body = t["body"]
                break
        if not template_body:
            return ""

        # Resolve connection text from label
        conn_text = ""
        for c in self._connections:
            if c["label"] == connection:
                conn_text = c["line"]
                break
        if not conn_text:
            conn_text = connection if connection else self._default_connection_line

        # Replace {connection} placeholder; if template omits it, nothing changes
        return template_body.replace("{connection}", conn_text)

    def _fill_message(self, body, first_name, company, role):
        """Replace {first_name}, {company}, {role} placeholders in body."""
        return body.replace("{first_name}", first_name).replace(
            "{company}", company
        ).replace("{role}", role)

    def _open_draft_popup(self, first_name, company, role, referral_name,
                          connection="", default_tone=None, linkedin_url="",
                          on_close=None):
        """Open a draft message popup. Generates message from tone + connection."""
        dlg = tk.Toplevel(self.root)
        dlg.title(f"Draft Message - {referral_name}")

        w, h = 640, 540
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(480, 400)

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

        tone_names = [t["name"] for t in self._tone_templates]
        conn_labels = [c["label"] for c in self._connections] + [""]

        ttk.Label(selector_frame, text="Tone:").pack(side=LEFT, padx=(0, 4))
        tone_combo = ttk.Combobox(
            selector_frame, values=tone_names, state="readonly", width=20,
        )
        tone_combo.pack(side=LEFT, padx=(0, 12))

        ttk.Label(selector_frame, text="Connection:").pack(side=LEFT, padx=(0, 4))
        conn_combo = ttk.Combobox(
            selector_frame, values=conn_labels, width=14,
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
        first_tone = tone_names[0] if tone_names else ""
        initial_tone = default_tone if default_tone in tone_names else first_tone
        tone_combo.set(initial_tone)
        _regenerate()

        # Bottom buttons
        btn_frame = ttk.Frame(body)
        btn_frame.pack(fill=X)

        copy_btn = ttk.Button(
            btn_frame, text="Copy Message",
            bootstyle="success", padding=(12, 4),
        )
        copy_btn.pack(side=LEFT, padx=(0, 6))

        def _copy():
            content = text_widget.get("1.0", END).strip()
            self.root.clipboard_clear()
            self.root.clipboard_append(content)
            copy_btn.config(text="Copied!")
            dlg.after(1500, lambda: copy_btn.config(text="Copy Message"))

        copy_btn.config(command=_copy)

        if linkedin_url:
            ttk.Button(
                btn_frame, text="Open Profile",
                bootstyle="info", padding=(12, 4),
                command=lambda: webbrowser.open(linkedin_url),
            ).pack(side=LEFT, padx=(0, 6))

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

        def _close_dlg():
            dlg.destroy()
            if on_close:
                on_close()

        ttk.Button(
            btn_frame, text="Close", command=_close_dlg,
            bootstyle="secondary", padding=(12, 4),
        ).pack(side=RIGHT)
        dlg.protocol("WM_DELETE_WINDOW", _close_dlg)
