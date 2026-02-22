"""KanbanMixin: kanban board view for the Jobs tab with drag-and-drop."""

import tkinter as tk
from datetime import date

import ttkbootstrap as ttk
from ttkbootstrap.constants import *

from tracker import VALID_STATUSES, write_tracker
from gui.constants import (
    STATUS_COLORS, KANBAN_CARD_PAD, KANBAN_CARD_MARGIN, KANBAN_DRAG_THRESHOLD,
)
from gui.helpers import matches_referral_filter


class KanbanMixin:

    def _build_kanban_view(self):
        """Build the kanban columns inside self.kanban_view_frame."""
        self._kanban_columns = {}  # status -> dict with header, canvas, inner, frame
        self._kanban_drag_data = {}  # drag state

        # Column background: slightly lighter than app bg for visual separation
        self._kanban_col_bg = "#2b2f36"
        col_bg = self._kanban_col_bg

        for status in VALID_STATUSES:
            col_frame = tk.Frame(self.kanban_view_frame, bg=col_bg)
            col_frame.pack(side=LEFT, fill=BOTH, expand=True, padx=(0, 3))

            # Header: status name + count, with colored dot
            color = STATUS_COLORS.get(status, "#adb5bd")
            header_frame = tk.Frame(col_frame, bg=col_bg, padx=6, pady=6)
            header_frame.pack(fill=X)

            dot = tk.Canvas(header_frame, width=8, height=8, bg=col_bg, highlightthickness=0)
            dot.create_oval(1, 1, 7, 7, fill=color, outline=color)
            dot.pack(side=LEFT, padx=(0, 5))

            header = tk.Label(
                header_frame, text=f"{status} (0)",
                font=("", 9, "bold"), bg=col_bg, fg="#dee2e6", anchor="w",
            )
            header.pack(side=LEFT)

            # Scrollable canvas for cards
            canvas = tk.Canvas(
                col_frame, highlightthickness=0,
                bg=col_bg, bd=0,
            )
            canvas.pack(fill=BOTH, expand=True, padx=0, pady=(0, 4))

            inner_frame = tk.Frame(canvas, bg=col_bg)
            canvas_window = canvas.create_window(
                (0, 0), window=inner_frame, anchor="nw",
            )

            # Resize inner frame to match canvas width
            def _on_canvas_configure(event, c=canvas, cw=canvas_window):
                c.itemconfig(cw, width=event.width)
            canvas.bind("<Configure>", _on_canvas_configure)

            # Update scroll region when inner frame changes
            def _on_frame_configure(event, c=canvas):
                c.configure(scrollregion=c.bbox("all"))
            inner_frame.bind("<Configure>", _on_frame_configure)

            self._kanban_columns[status] = {
                "frame": col_frame,
                "header": header,
                "canvas": canvas,
                "inner": inner_frame,
                "color": color,
            }

    def _refresh_kanban(self):
        """Clear and rebuild all kanban cards from self.rows with filters."""
        # Read current filters
        status_f = self.status_filter.get()
        referral_f = self.referral_filter.get()
        search_q = self.search_var.get().strip().lower()
        ref_search_q = self.referral_search_var.get().strip().lower()
        hide_closed = self.hide_closed_var.get()

        # Clear all column cards
        for col_data in self._kanban_columns.values():
            for widget in col_data["inner"].winfo_children():
                widget.destroy()

        # Track counts per status
        counts = {s: 0 for s in VALID_STATUSES}

        for i, row in enumerate(self.rows):
            status = row.get("Application Status", "Not Yet Applied")

            # Apply filters (same logic as _refresh_list)
            if hide_closed and status in ("Rejected", "Withdrawn", "Closed"):
                continue
            if status_f != "All" and status != status_f:
                continue
            if not matches_referral_filter(row, referral_f):
                continue
            if search_q:
                company = row.get("Company", "").lower()
                role = row.get("Role", "").lower()
                if search_q not in company and search_q not in role:
                    continue
            if ref_search_q:
                ref_names = row.get("Referral Names", "").lower()
                if ref_search_q not in ref_names:
                    continue

            col_data = self._kanban_columns.get(status)
            if not col_data:
                continue

            self._create_kanban_card(col_data["inner"], row, i)
            counts[status] += 1

        # Update header counts
        for status, col_data in self._kanban_columns.items():
            col_data["header"].config(text=f"{status} ({counts[status]})")

        # Hide/show Rejected, Withdrawn, and Closed columns
        for closed_status in ("Rejected", "Withdrawn", "Closed"):
            col_data = self._kanban_columns[closed_status]
            if hide_closed:
                col_data["frame"].pack_forget()
            else:
                # Re-pack if not already visible
                if not col_data["frame"].winfo_ismapped():
                    col_data["frame"].pack(side=LEFT, fill=BOTH, expand=True, padx=(0, 2))

    def _create_kanban_card(self, parent, row_data, row_idx):
        """Create a single job card in the kanban column."""
        status = row_data.get("Application Status", "Not Yet Applied")
        color = STATUS_COLORS.get(status, "#adb5bd")
        card_bg = "#3a3f47"

        # Outer wrapper for spacing
        card = tk.Frame(parent, bg=self._kanban_col_bg)
        card.pack(fill=X, padx=KANBAN_CARD_MARGIN, pady=(KANBAN_CARD_MARGIN + 2, 0))

        # Card body with status-colored border via highlightbackground
        body = tk.Frame(
            card, bg=card_bg, padx=10, pady=8,
            highlightbackground=color, highlightthickness=2,
        )
        body.pack(fill=X)

        # Company name (bold, white)
        company = row_data.get("Company", "Unknown")
        company_lbl = tk.Label(
            body, text=company, font=("", 10, "bold"),
            bg=card_bg, fg="#ffffff", anchor="w",
        )
        company_lbl.pack(fill=X)

        # Role (lighter secondary, wraps to fit card width dynamically)
        role = row_data.get("Role", "")
        role_lbl = tk.Label(
            body, text=role, font=("", 9),
            bg=card_bg, fg="#adb5bd", anchor="w",
            justify=LEFT,
        )
        role_lbl.pack(fill=X, pady=(1, 0))

        def _update_wraplength(event, lbl=role_lbl):
            lbl.configure(wraplength=event.width - 4)
        body.bind("<Configure>", _update_wraplength)

        # Bottom row: date + badges
        bottom = tk.Frame(body, bg=card_bg)
        bottom.pack(fill=X, pady=(6, 0))

        date_applied = row_data.get("Date Applied", "")
        if date_applied:
            date_lbl = tk.Label(
                bottom, text=date_applied, font=("", 8),
                bg=card_bg, fg="#6c757d", anchor="w",
            )
            date_lbl.pack(side=LEFT)

        # Cover Letter badge (pill style)
        cl_written = row_data.get("Cover Letter Written", "").lower()
        if cl_written == "yes":
            cl_badge = tk.Label(
                bottom, text=" CL ", font=("", 7, "bold"),
                bg="#1a4d2e", fg="#58d68d", padx=4, pady=1,
                relief="flat",
            )
            cl_badge.pack(side=RIGHT, padx=(3, 0))

        # Referral badge (pill style)
        has_referral = bool(row_data.get("Referral Names", "").strip())
        if has_referral:
            ref_badge = tk.Label(
                bottom, text=" R ", font=("", 7, "bold"),
                bg="#1a3a4d", fg="#5dade2", padx=4, pady=1,
                relief="flat",
            )
            ref_badge.pack(side=RIGHT, padx=(3, 0))

        # Suppress tkinter's activebackground on mouse-over (Windows quirk).
        # Skip the body frame so its highlightthickness (the colored border) is preserved.
        def _suppress_active(widget, skip=None):
            if widget is not skip:
                widget.configure(highlightthickness=0)
            try:
                widget.configure(
                    activebackground=widget.cget("bg"),
                    activeforeground=widget.cget("fg"),
                )
            except tk.TclError:
                pass
            for child in widget.winfo_children():
                _suppress_active(child, skip=skip)

        _suppress_active(card, skip=body)

        # Bind events to all widgets in the card recursively
        self._kanban_bind_card(card, row_idx)

    def _kanban_bind_card(self, widget, row_idx):
        """Recursively bind double-click and drag events to a card and its children."""
        widget.bind("<Double-1>", lambda e, idx=row_idx: self._kanban_open_detail(idx))
        widget.bind("<ButtonPress-1>", lambda e, idx=row_idx: self._kanban_drag_start(e, idx))
        widget.bind("<B1-Motion>", self._kanban_drag_motion)
        widget.bind("<ButtonRelease-1>", self._kanban_drag_end)
        for child in widget.winfo_children():
            self._kanban_bind_card(child, row_idx)

    # ------------------------------------------------------------------
    # Double-click to open detail
    # ------------------------------------------------------------------
    def _kanban_open_detail(self, row_idx):
        """Open a kanban card in the Detail tab."""
        self.selected_idx = row_idx
        self._load_detail(self.rows[row_idx])
        self.notebook.select(self.tab_detail)

    # ------------------------------------------------------------------
    # Drag and drop
    # ------------------------------------------------------------------
    def _kanban_drag_start(self, event, row_idx):
        """Record the drag start position and row index."""
        self._kanban_drag_data = {
            "row_idx": row_idx,
            "start_x": event.x_root,
            "start_y": event.y_root,
            "dragging": False,
            "ghost": None,
        }

    def _kanban_drag_motion(self, event):
        """Handle drag motion: create ghost window after threshold, highlight target."""
        data = self._kanban_drag_data
        if not data:
            return

        dx = abs(event.x_root - data.get("start_x", 0))
        dy = abs(event.y_root - data.get("start_y", 0))

        if not data.get("dragging"):
            if dx < KANBAN_DRAG_THRESHOLD and dy < KANBAN_DRAG_THRESHOLD:
                return
            # Start dragging: create ghost window
            data["dragging"] = True
            row = self.rows[data["row_idx"]]
            ghost = tk.Toplevel(self.root)
            ghost.overrideredirect(True)
            ghost.attributes("-alpha", 0.7)
            ghost.attributes("-topmost", True)
            ghost_label = tk.Label(
                ghost,
                text=f"{row.get('Company', '')} - {row.get('Role', '')}",
                font=("", 9, "bold"), bg="#3a3f47", fg="white",
                padx=10, pady=6,
            )
            ghost_label.pack()
            data["ghost"] = ghost

        # Move ghost to cursor position
        ghost = data.get("ghost")
        if ghost:
            ghost.geometry(f"+{event.x_root + 10}+{event.y_root + 10}")

        # Highlight target column
        self._kanban_highlight_column(event.x_root, event.y_root)

    def _kanban_drag_end(self, event):
        """Handle drag release: update status if dropped on a different column."""
        data = self._kanban_drag_data
        if not data:
            return

        # Destroy ghost
        ghost = data.get("ghost")
        if ghost:
            ghost.destroy()

        # Clear all column highlights
        self._kanban_clear_highlights()

        if not data.get("dragging"):
            self._kanban_drag_data = {}
            return

        # Find target column
        target_status = self._kanban_column_at(event.x_root, event.y_root)
        row_idx = data["row_idx"]
        current_status = self.rows[row_idx].get("Application Status", "Not Yet Applied")

        self._kanban_drag_data = {}

        if target_status is None or target_status == current_status:
            return

        # Update status
        self.rows[row_idx]["Application Status"] = target_status

        # Auto-set Date Applied when moving to "Applied" with no date
        if target_status == "Applied" and not self.rows[row_idx].get("Date Applied", "").strip():
            self.rows[row_idx]["Date Applied"] = date.today().strftime("%Y-%m-%d")

        # Write to CSV
        if self.csv_path:
            write_tracker(self.csv_path, self.rows)

        # Refresh both views
        self._refresh_list()

    def _kanban_column_at(self, x_root, y_root):
        """Return the status name of the kanban column at the given screen coordinates."""
        for status, col_data in self._kanban_columns.items():
            frame = col_data["frame"]
            if not frame.winfo_ismapped():
                continue
            fx = frame.winfo_rootx()
            fy = frame.winfo_rooty()
            fw = frame.winfo_width()
            fh = frame.winfo_height()
            if fx <= x_root <= fx + fw and fy <= y_root <= fy + fh:
                return status
        return None

    def _kanban_highlight_column(self, x_root, y_root):
        """Highlight the column header under the cursor during drag."""
        target = self._kanban_column_at(x_root, y_root)
        col_bg = self._kanban_col_bg
        highlight_bg = "#3d4450"
        for status, col_data in self._kanban_columns.items():
            header = col_data["header"]
            header_frame = header.master
            bg = highlight_bg if status == target else col_bg
            header.configure(bg=bg)
            header_frame.configure(bg=bg)
            for child in header_frame.winfo_children():
                try:
                    child.configure(bg=bg)
                except tk.TclError:
                    pass

    def _kanban_clear_highlights(self):
        """Reset all column headers to default style."""
        col_bg = self._kanban_col_bg
        for col_data in self._kanban_columns.values():
            header = col_data["header"]
            header_frame = header.master
            header.configure(bg=col_bg)
            header_frame.configure(bg=col_bg)
            for child in header_frame.winfo_children():
                try:
                    child.configure(bg=col_bg)
                except tk.TclError:
                    pass

    # ------------------------------------------------------------------
    # Mousewheel routing for kanban columns
    # ------------------------------------------------------------------
    def _on_kanban_mousewheel(self, event):
        """Route mousewheel to the kanban column canvas under the cursor."""
        x_root = event.x_root
        y_root = event.y_root
        for col_data in self._kanban_columns.values():
            canvas = col_data["canvas"]
            if not canvas.winfo_ismapped():
                continue
            cx = canvas.winfo_rootx()
            cy = canvas.winfo_rooty()
            cw = canvas.winfo_width()
            ch = canvas.winfo_height()
            if cx <= x_root <= cx + cw and cy <= y_root <= cy + ch:
                if event.num == 4:
                    canvas.yview_scroll(-3, "units")
                elif event.num == 5:
                    canvas.yview_scroll(3, "units")
                else:
                    canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
                return
