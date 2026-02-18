"""LLM client module: Anthropic API integration for the chat tab.

Handles API key persistence, tool definitions, tool execution, system prompt
construction, and the chat loop. No tkinter imports -- this module is pure
backend logic so it can be tested independently.
"""

import json
import os
from datetime import datetime

from tracker import FIELDNAMES, VALID_STATUSES, write_tracker, parse_semicolons

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 2048
MAX_TOOL_ROUNDS = 10

CONFIG_DIR = os.path.join(os.path.expanduser("~"), ".job_tracker")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")

# Fields the LLM is allowed to update via update_job (excludes referral arrays
# since those have dedicated tools).
UPDATABLE_FIELDS = [
    "Company", "Role", "Location", "Job ID", "Job URL", "Date Posted",
    "Resume Version", "Cover Letter Written", "Cover Letter File",
    "Date Applied", "Application Status", "Notes",
]

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


# ---------------------------------------------------------------------------
# API key management
# ---------------------------------------------------------------------------

def load_api_key():
    """Load the API key from ~/.job_tracker/config.json. Returns '' if missing."""
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("anthropic_api_key", "")
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        return ""


def save_api_key(key):
    """Save the API key to ~/.job_tracker/config.json with restrictive perms."""
    os.makedirs(CONFIG_DIR, exist_ok=True)

    # Read existing config to preserve other keys
    existing = {}
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            existing = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    existing["anthropic_api_key"] = key

    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2)

    # Set owner-only permissions (no-op if it fails on Windows)
    try:
        os.chmod(CONFIG_FILE, 0o600)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Tool definitions (Anthropic JSON schema format)
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "add_job",
        "description": (
            "Add a new job to the tracker. Returns the row index of the new job."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "company": {
                    "type": "string",
                    "description": "Company name (required).",
                },
                "role": {
                    "type": "string",
                    "description": "Job title / role (required).",
                },
                "location": {
                    "type": "string",
                    "description": "Job location, e.g. 'Los Angeles, CA'.",
                },
                "job_url": {
                    "type": "string",
                    "description": "URL of the job posting.",
                },
                "job_id": {
                    "type": "string",
                    "description": "Job posting ID.",
                },
                "resume_version": {
                    "type": "string",
                    "description": "Resume version: 'Data Scientist', 'ML Builder', or 'Research Engineer'.",
                },
                "notes": {
                    "type": "string",
                    "description": "Notes about the role.",
                },
            },
            "required": ["company", "role"],
        },
    },
    {
        "name": "update_job",
        "description": (
            "Update fields on an existing job. Use row_index from the table. "
            "Cannot update referral fields -- use add_referral or update_referral_status instead."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "row_index": {
                    "type": "integer",
                    "description": "0-based row index of the job to update.",
                },
                "updates": {
                    "type": "object",
                    "description": (
                        "Dict of field_name -> new_value. Valid fields: "
                        + ", ".join(UPDATABLE_FIELDS) + "."
                    ),
                },
            },
            "required": ["row_index", "updates"],
        },
    },
    {
        "name": "add_referral",
        "description": (
            "Add a referral to a job. Appends to the semicolon-delimited referral arrays."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "row_index": {
                    "type": "integer",
                    "description": "0-based row index of the job.",
                },
                "name": {
                    "type": "string",
                    "description": "Referral's full name (required).",
                },
                "linkedin_url": {
                    "type": "string",
                    "description": "Referral's LinkedIn profile URL.",
                },
                "connection": {
                    "type": "string",
                    "description": "How you know them: 'GT', 'UCLA', or custom.",
                },
                "status": {
                    "type": "string",
                    "description": (
                        "Referral status. Valid: "
                        + ", ".join(REFERRAL_STATUS_OPTIONS) + "."
                    ),
                },
            },
            "required": ["row_index", "name"],
        },
    },
    {
        "name": "update_referral_status",
        "description": (
            "Update the status of a specific referral on a job."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "row_index": {
                    "type": "integer",
                    "description": "0-based row index of the job.",
                },
                "referral_index": {
                    "type": "integer",
                    "description": "0-based index of the referral within the job's referral list.",
                },
                "new_status": {
                    "type": "string",
                    "description": (
                        "New referral status. Valid: "
                        + ", ".join(REFERRAL_STATUS_OPTIONS) + "."
                    ),
                },
            },
            "required": ["row_index", "referral_index", "new_status"],
        },
    },
]


# ---------------------------------------------------------------------------
# System prompt builder
# ---------------------------------------------------------------------------

def build_system_prompt(rows):
    """Build the system prompt with the full CSV data as a readable table."""
    lines = [
        "You are an assistant integrated into a job application tracker. "
        "You can read and modify the user's job tracker CSV.",
        "",
        "RULES:",
        "- Be concise. Short answers unless the user asks for detail.",
        "- Do NOT change data unless the user explicitly asks you to.",
        "- After making changes, briefly confirm what you did.",
        "- When the user says a company name, match it case-insensitively.",
        "- If a request is ambiguous (multiple matches), ask for clarification.",
        "",
        f"Valid application statuses: {', '.join(VALID_STATUSES)}",
        f"Valid referral statuses: {', '.join(REFERRAL_STATUS_OPTIONS)}",
        "",
    ]

    if not rows:
        lines.append("The tracker is currently empty (no jobs loaded).")
    else:
        lines.append(f"Current tracker ({len(rows)} jobs):")
        lines.append("")
        # Build a readable indexed table
        for i, row in enumerate(rows):
            parts = [f"[{i}] {row.get('Company', '')} | {row.get('Role', '')}"]
            status = row.get("Application Status", "")
            if status:
                parts.append(f"Status: {status}")
            location = row.get("Location", "")
            if location:
                parts.append(f"Location: {location}")
            date = row.get("Date Applied", "")
            if date:
                parts.append(f"Applied: {date}")
            resume = row.get("Resume Version", "")
            if resume:
                parts.append(f"Resume: {resume}")
            cl = row.get("Cover Letter Written", "")
            if cl:
                parts.append(f"CL: {cl}")
            names = row.get("Referral Names", "")
            if names:
                statuses_str = row.get("Referral Statuses", "")
                connections = row.get("Referral Connections", "")
                parts.append(f"Referrals: {names}")
                if statuses_str:
                    parts.append(f"Referral Statuses: {statuses_str}")
                if connections:
                    parts.append(f"Referral Connections: {connections}")
            notes = row.get("Notes", "")
            if notes:
                parts.append(f"Notes: {notes}")
            job_url = row.get("Job URL", "")
            if job_url:
                parts.append(f"URL: {job_url}")
            job_id = row.get("Job ID", "")
            if job_id:
                parts.append(f"Job ID: {job_id}")

            lines.append(" | ".join(parts))

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tool executor
# ---------------------------------------------------------------------------

class ToolExecutor:
    """Executes tool calls from the LLM against the tracker data.

    Callbacks:
        get_rows() -> list[dict]: Return current rows list.
        get_csv_path() -> str: Return current CSV file path.
        on_data_changed(): Called after any mutation so the GUI can refresh.
    """

    def __init__(self, get_rows, get_csv_path, on_data_changed):
        self._get_rows = get_rows
        self._get_csv_path = get_csv_path
        self._on_data_changed = on_data_changed

    @property
    def rows(self):
        return self._get_rows()

    @property
    def csv_path(self):
        return self._get_csv_path()

    def execute(self, tool_name, tool_input):
        """Dispatch a tool call. Returns (result_str, is_error)."""
        dispatch = {
            "add_job": self._add_job,
            "update_job": self._update_job,
            "add_referral": self._add_referral,
            "update_referral_status": self._update_referral_status,
        }
        handler = dispatch.get(tool_name)
        if not handler:
            return f"Unknown tool: {tool_name}", True
        try:
            result = handler(tool_input)
            return result, False
        except Exception as e:
            return f"Error: {e}", True

    def _save(self):
        """Write current rows to CSV and notify GUI."""
        write_tracker(self.csv_path, self.rows)
        self._on_data_changed()

    def _add_job(self, inp):
        company = inp.get("company", "").strip()
        role = inp.get("role", "").strip()
        if not company or not role:
            return "Error: company and role are required."

        new_row = {field: "" for field in FIELDNAMES}
        new_row["Company"] = company
        new_row["Role"] = role
        new_row["Location"] = inp.get("location", "")
        new_row["Job URL"] = inp.get("job_url", "")
        new_row["Job ID"] = inp.get("job_id", "")
        new_row["Resume Version"] = inp.get("resume_version", "")
        new_row["Notes"] = inp.get("notes", "")
        new_row["Application Status"] = "Not Yet Applied"
        new_row["Cover Letter Written"] = "No"

        self.rows.append(new_row)
        self._save()
        idx = len(self.rows) - 1
        return f"Added job at row {idx}: {company} - {role}"

    def _update_job(self, inp):
        idx = inp.get("row_index")
        updates = inp.get("updates", {})

        if idx is None or not isinstance(idx, int):
            return "Error: row_index must be an integer."
        if idx < 0 or idx >= len(self.rows):
            return f"Error: row_index {idx} out of range (0-{len(self.rows) - 1})."
        if not updates:
            return "Error: updates dict is empty."

        row = self.rows[idx]
        changes = []

        for field, value in updates.items():
            if field not in UPDATABLE_FIELDS:
                return (
                    f"Error: '{field}' is not an updatable field. "
                    f"Valid: {', '.join(UPDATABLE_FIELDS)}"
                )
            if field == "Application Status" and value not in VALID_STATUSES:
                return (
                    f"Error: '{value}' is not a valid status. "
                    f"Valid: {', '.join(VALID_STATUSES)}"
                )
            old = row.get(field, "")
            row[field] = str(value)
            changes.append(f"{field}: '{old}' -> '{value}'")

        # Auto-set date if status changed to Applied and no date set
        if ("Application Status" in updates
                and updates["Application Status"] == "Applied"
                and not row.get("Date Applied", "").strip()):
            row["Date Applied"] = datetime.now().strftime("%Y-%m-%d")
            changes.append(f"Date Applied: auto-set to {row['Date Applied']}")

        self._save()
        company = row.get("Company", "")
        return f"Updated {company}: " + "; ".join(changes)

    def _add_referral(self, inp):
        idx = inp.get("row_index")
        name = inp.get("name", "").strip()

        if idx is None or not isinstance(idx, int):
            return "Error: row_index must be an integer."
        if idx < 0 or idx >= len(self.rows):
            return f"Error: row_index {idx} out of range (0-{len(self.rows) - 1})."
        if not name:
            return "Error: name is required."

        row = self.rows[idx]

        def append_field(field, value):
            existing = row.get(field, "").strip()
            if existing:
                row[field] = existing + "; " + value
            else:
                row[field] = value

        append_field("Referral Names", name)
        append_field("Referral LinkedIns", inp.get("linkedin_url", ""))
        append_field("Referral Connections", inp.get("connection", ""))

        status = inp.get("status", "Not yet messaged")
        if status and status.lower() != "not yet messaged":
            status = f"{status} {datetime.now().strftime('%Y-%m-%d')}"
        append_field("Referral Statuses", status)

        self._save()
        company = row.get("Company", "")
        return f"Added referral '{name}' to {company} (row {idx})."

    def _update_referral_status(self, inp):
        row_idx = inp.get("row_index")
        ref_idx = inp.get("referral_index")
        new_status = inp.get("new_status", "").strip()

        if row_idx is None or not isinstance(row_idx, int):
            return "Error: row_index must be an integer."
        if row_idx < 0 or row_idx >= len(self.rows):
            return f"Error: row_index {row_idx} out of range (0-{len(self.rows) - 1})."

        row = self.rows[row_idx]
        statuses = parse_semicolons(row.get("Referral Statuses", ""))
        names = parse_semicolons(row.get("Referral Names", ""))

        if ref_idx is None or not isinstance(ref_idx, int):
            return "Error: referral_index must be an integer."
        if ref_idx < 0 or ref_idx >= len(names):
            return f"Error: referral_index {ref_idx} out of range (0-{len(names) - 1})."

        # Pad statuses if needed
        while len(statuses) <= ref_idx:
            statuses.append("Not yet messaged")

        old_status = statuses[ref_idx]
        if new_status.lower() != "not yet messaged":
            new_status = f"{new_status} {datetime.now().strftime('%Y-%m-%d')}"
        statuses[ref_idx] = new_status

        row["Referral Statuses"] = "; ".join(statuses)
        self._save()

        ref_name = names[ref_idx] if ref_idx < len(names) else f"referral {ref_idx}"
        company = row.get("Company", "")
        return f"Updated {ref_name}'s status at {company}: '{old_status}' -> '{new_status}'"


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class ChatError(Exception):
    """User-friendly chat error with an optional suggestion."""
    def __init__(self, message, suggestion=""):
        super().__init__(message)
        self.suggestion = suggestion


# ---------------------------------------------------------------------------
# Chat function (called from background thread)
# ---------------------------------------------------------------------------

def chat(api_key, messages, rows, tool_executor):
    """Send messages to Claude and handle tool use loops.

    Args:
        api_key: Anthropic API key.
        messages: List of message dicts in Anthropic format.
        rows: Current tracker rows (for building system prompt).
        tool_executor: ToolExecutor instance.

    Returns:
        (assistant_text, tools_used) where tools_used is a list of
        dicts with keys: tool, input, result.

    Raises:
        ChatError on API or network errors.
    """
    try:
        import anthropic
    except ImportError:
        raise ChatError(
            "The 'anthropic' package is not installed.",
            suggestion="Run: pip install anthropic",
        )

    system_prompt = build_system_prompt(rows)

    try:
        client = anthropic.Anthropic(api_key=api_key)
    except Exception as e:
        raise ChatError(f"Failed to initialize API client: {e}")

    tools_used = []

    # Make a working copy of messages to avoid mutating the caller's list
    # during the tool-use loop
    working_messages = list(messages)

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system_prompt,
                messages=working_messages,
                tools=TOOLS,
            )
        except Exception as e:
            err_str = str(e).lower()
            if "authentication" in err_str or "api key" in err_str or "401" in err_str:
                raise ChatError(
                    "Invalid API key. Please update your key.",
                    suggestion="Click 'Set API Key' to enter a valid key.",
                )
            if "rate" in err_str and "limit" in err_str:
                raise ChatError(
                    "Rate limited by the API. Please wait a moment and try again."
                )
            if "overloaded" in err_str:
                raise ChatError(
                    "The API is currently overloaded. Please try again in a moment."
                )
            raise ChatError(f"API error: {e}")

        # Process response content blocks
        assistant_text_parts = []
        tool_use_blocks = []

        for block in response.content:
            if block.type == "text":
                assistant_text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_use_blocks.append(block)

        # If no tool use, we're done
        if response.stop_reason == "end_turn" or not tool_use_blocks:
            return "\n".join(assistant_text_parts), tools_used

        # Append assistant message with all content blocks to working messages
        working_messages.append({
            "role": "assistant",
            "content": response.content,
        })

        # Execute each tool and build tool results
        tool_results = []
        for tool_block in tool_use_blocks:
            result_str, is_error = tool_executor.execute(
                tool_block.name, tool_block.input
            )
            tools_used.append({
                "tool": tool_block.name,
                "input": tool_block.input,
                "result": result_str,
                "is_error": is_error,
            })
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_block.id,
                "content": result_str,
                "is_error": is_error,
            })

        # Send tool results back
        working_messages.append({
            "role": "user",
            "content": tool_results,
        })

    # Exhausted tool rounds
    return "\n".join(assistant_text_parts) if assistant_text_parts else (
        "I ran out of tool-use rounds. Please try a simpler request."
    ), tools_used
