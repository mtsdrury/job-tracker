"""ChatMixin: LLM chat tab for natural language interaction with the tracker."""

import threading
import tkinter as tk

import ttkbootstrap as ttk
from ttkbootstrap.constants import *


class ChatMixin:

    def _build_chat_tab(self):
        """Build the Chat tab UI: header, message display, and input bar."""
        # ---- Header row ----
        header = ttk.Frame(self.tab_chat)
        header.pack(fill=X, pady=(0, 4))

        ttk.Label(
            header, text="Chat", font=("", 13, "bold"),
        ).pack(side=LEFT)

        ttk.Button(
            header, text="Set API Key", command=self._chat_api_key_dialog,
            bootstyle="outline", padding=(8, 2),
        ).pack(side=RIGHT)

        ttk.Label(
            header, text="claude-haiku-4-5", bootstyle="secondary",
            font=("", 9),
        ).pack(side=RIGHT, padx=(0, 8))

        # ---- Message display ----
        display_frame = ttk.Frame(self.tab_chat)
        display_frame.pack(fill=BOTH, expand=True)

        text_kw = dict(
            bg=str(self.colors.inputbg),
            fg=str(self.colors.inputfg),
            insertbackground=str(self.colors.inputfg),
            selectbackground=str(self.colors.selectbg),
            selectforeground=str(self.colors.selectfg),
            relief="flat", borderwidth=2,
        )

        scrollbar = ttk.Scrollbar(display_frame, orient=VERTICAL)
        scrollbar.pack(side=RIGHT, fill=Y)

        self._chat_display = tk.Text(
            display_frame, wrap=tk.WORD, font=("", 10), state="disabled",
            yscrollcommand=scrollbar.set, **text_kw,
        )
        self._chat_display.pack(fill=BOTH, expand=True)
        scrollbar.config(command=self._chat_display.yview)

        # Text tags for message styling
        self._chat_display.tag_configure(
            "user", foreground="#5dade2", font=("", 10, "bold"),
        )
        self._chat_display.tag_configure(
            "assistant", foreground=str(self.colors.inputfg),
        )
        self._chat_display.tag_configure(
            "system", foreground="#aab7b8", font=("", 9, "italic"),
        )
        self._chat_display.tag_configure(
            "error", foreground="#ec7063", font=("", 9, "italic"),
        )
        self._chat_display.tag_configure(
            "tool", foreground="#58d68d", font=("", 9),
        )

        # ---- Input bar ----
        input_frame = ttk.Frame(self.tab_chat)
        input_frame.pack(fill=X, pady=(4, 0))

        self._chat_input = tk.Text(
            input_frame, wrap=tk.WORD, font=("", 10), height=2, **text_kw,
        )
        self._chat_input.pack(side=LEFT, fill=BOTH, expand=True, padx=(0, 4))

        self._chat_send_btn = ttk.Button(
            input_frame, text="Send", command=self._chat_send,
            bootstyle="info", padding=(12, 4),
        )
        self._chat_send_btn.pack(side=RIGHT, fill=Y)

        # Enter sends, Shift+Enter inserts newline
        self._chat_input.bind("<Return>", self._chat_on_enter)
        self._chat_input.bind("<Shift-Return>", lambda e: None)  # default insert

        # ---- State ----
        self._chat_messages = []   # Anthropic-format conversation history
        self._chat_busy = False
        self._chat_api_key = None  # Lazy-loaded
        self._chat_tool_executor = None  # Lazy-loaded

        # Welcome message
        self._chat_append(
            "Welcome to the Job Tracker chat. Ask questions about your "
            "pipeline or request changes (e.g. \"mark Tinder as rejected\").\n",
            "system",
        )

    # ------------------------------------------------------------------
    # Message display helpers
    # ------------------------------------------------------------------

    def _chat_append(self, text, tag="assistant"):
        """Append text to the chat display with the given tag."""
        self._chat_display.configure(state="normal")
        self._chat_display.insert(tk.END, text + "\n", tag)
        self._chat_display.configure(state="disabled")
        self._chat_display.see(tk.END)

    def _chat_remove_last_line(self):
        """Remove the last non-empty line from the display."""
        self._chat_display.configure(state="normal")
        # Delete the last line (including its newline)
        self._chat_display.delete("end-2l linestart", "end-1c")
        self._chat_display.configure(state="disabled")

    # ------------------------------------------------------------------
    # Input handling
    # ------------------------------------------------------------------

    def _chat_on_enter(self, event):
        """Handle Enter key: send message (Shift+Enter handled separately)."""
        if event.state & 0x1:  # Shift held
            return  # Let default behavior insert newline
        self._chat_send()
        return "break"  # Prevent default newline insertion

    def _chat_send(self):
        """Send the user's message to the LLM."""
        if self._chat_busy:
            return

        text = self._chat_input.get("1.0", tk.END).strip()
        if not text:
            return

        # Check if CSV is loaded
        if not self.csv_path or not self.rows:
            self._chat_append(
                "Open a CSV file first (File > Open).", "error",
            )
            return

        # Ensure API key
        if self._chat_api_key is None:
            self._chat_api_key = self._chat_load_api_key()
        if not self._chat_api_key:
            self._chat_api_key_dialog()
            # Re-check after dialog
            if not self._chat_api_key:
                return

        # Clear input
        self._chat_input.delete("1.0", tk.END)

        # Show user message
        self._chat_append(f"You: {text}", "user")
        self._chat_append("Thinking...", "system")

        # Add to conversation history
        self._chat_messages.append({"role": "user", "content": text})

        # Disable send
        self._chat_busy = True
        self._chat_send_btn.configure(state="disabled")

        # Ensure tool executor exists
        if self._chat_tool_executor is None:
            self._chat_tool_executor = self._chat_create_tool_executor()

        # Run in background thread
        thread = threading.Thread(
            target=self._chat_worker,
            args=(self._chat_api_key, list(self._chat_messages), list(self.rows)),
            daemon=True,
        )
        thread.start()

    def _chat_worker(self, api_key, messages, rows):
        """Background thread: call the LLM and post results back to GUI."""
        try:
            from gui.llm_client import chat, ChatError
            assistant_text, tools_used = chat(
                api_key, messages, rows, self._chat_tool_executor,
            )
            # Schedule GUI update on main thread
            self.root.after(0, self._chat_on_response, assistant_text, tools_used)
        except Exception as e:
            error_msg = str(e)
            suggestion = getattr(e, "suggestion", "")
            self.root.after(0, self._chat_on_error, error_msg, suggestion)

    def _chat_on_response(self, text, tools_used):
        """Handle successful LLM response (main thread)."""
        # Remove "Thinking..."
        self._chat_remove_last_line()

        # Show tool actions
        for tool_info in tools_used:
            action = self._format_tool_action(tool_info)
            self._chat_append(action, "tool")

        # Show assistant response
        if text:
            self._chat_append(f"{text}\n", "assistant")

        # Add assistant text to conversation history
        self._chat_messages.append({"role": "assistant", "content": text})

        # Re-enable send
        self._chat_busy = False
        self._chat_send_btn.configure(state="normal")
        self._chat_input.focus_set()

    def _chat_on_error(self, error_msg, suggestion):
        """Handle LLM error (main thread)."""
        # Remove "Thinking..."
        self._chat_remove_last_line()

        # Remove the failed user message from history so they can retry
        if self._chat_messages and self._chat_messages[-1]["role"] == "user":
            self._chat_messages.pop()

        self._chat_append(f"Error: {error_msg}", "error")
        if suggestion:
            self._chat_append(suggestion, "system")

        # If auth error, prompt to re-enter key
        if "api key" in error_msg.lower() or "invalid" in error_msg.lower():
            self._chat_api_key = None

        # Re-enable send
        self._chat_busy = False
        self._chat_send_btn.configure(state="normal")
        self._chat_input.focus_set()

    def _format_tool_action(self, tool_info):
        """Format a tool use for display."""
        tool = tool_info["tool"]
        inp = tool_info["input"]
        result = tool_info["result"]

        if tool == "add_job":
            return f"  [+] Added: {inp.get('company', '')} - {inp.get('role', '')}"
        elif tool == "update_job":
            updates = inp.get("updates", {})
            fields = ", ".join(f"{k}={v}" for k, v in updates.items())
            return f"  [~] Updated row {inp.get('row_index', '?')}: {fields}"
        elif tool == "add_referral":
            return f"  [+] Referral: {inp.get('name', '')} (row {inp.get('row_index', '?')})"
        elif tool == "update_referral_status":
            return f"  [~] Referral status: {inp.get('new_status', '')} (row {inp.get('row_index', '?')})"
        else:
            return f"  [{tool}] {result}"

    # ------------------------------------------------------------------
    # API key dialog
    # ------------------------------------------------------------------

    def _chat_load_api_key(self):
        """Lazy-load API key from config file."""
        try:
            from gui.llm_client import load_api_key
            return load_api_key()
        except ImportError:
            return ""

    def _chat_api_key_dialog(self):
        """Show a modal dialog to enter/update the Anthropic API key."""
        dlg = tk.Toplevel(self.root)
        dlg.title("Set Anthropic API Key")

        w, h = 520, 210
        parent_x = self.root.winfo_rootx()
        parent_y = self.root.winfo_rooty()
        parent_w = self.root.winfo_width()
        parent_h = self.root.winfo_height()
        x = parent_x + (parent_w - w) // 2
        y = parent_y + (parent_h - h) // 2
        dlg.geometry(f"{w}x{h}+{x}+{y}")
        dlg.minsize(360, 140)

        dlg.grab_set()
        dlg.attributes("-topmost", True)

        body = ttk.Frame(dlg, padding=16)
        body.pack(fill=BOTH, expand=True)

        ttk.Label(
            body, text="Enter your Anthropic API key:",
            font=("", 10),
        ).pack(anchor="w", pady=(0, 6))

        key_entry = ttk.Entry(body, show="*", width=50)
        key_entry.pack(fill=X, pady=(0, 4))
        key_entry.focus_set()

        # Pre-fill existing key
        current = self._chat_api_key or self._chat_load_api_key()
        if current:
            key_entry.insert(0, current)

        hint = ttk.Label(
            body, text="Key is stored locally in ~/.job_tracker/config.json",
            bootstyle="secondary", font=("", 8),
        )
        hint.pack(anchor="w", pady=(0, 8))

        def _save():
            key = key_entry.get().strip()
            if not key:
                return
            try:
                from gui.llm_client import save_api_key
                save_api_key(key)
            except ImportError:
                pass
            self._chat_api_key = key
            dlg.destroy()

        btn_frame = ttk.Frame(body)
        btn_frame.pack(fill=X)
        ttk.Button(
            btn_frame, text="Save", command=_save,
            bootstyle="success", padding=(16, 4),
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            btn_frame, text="Cancel", command=dlg.destroy,
            bootstyle="secondary", padding=(16, 4),
        ).pack(side=LEFT)

        dlg.bind("<Return>", lambda e: _save())

    # ------------------------------------------------------------------
    # Tool executor setup
    # ------------------------------------------------------------------

    def _chat_create_tool_executor(self):
        """Create a ToolExecutor wired to the app's data and GUI refresh."""
        from gui.llm_client import ToolExecutor

        def on_data_changed():
            # Schedule GUI refresh on main thread
            self.root.after(0, self._chat_on_data_changed)

        return ToolExecutor(
            get_rows=lambda: self.rows,
            get_csv_path=lambda: self.csv_path,
            on_data_changed=on_data_changed,
        )

    def _chat_on_data_changed(self):
        """Refresh GUI after the LLM modified tracker data."""
        self._refresh_list()
        # Refresh detail if a job is selected
        if self.selected_idx is not None and self.selected_idx < len(self.rows):
            self._load_detail(self.rows[self.selected_idx])
