"""Pure-function helpers for the AI SDK v5 chat transport.

Both `parts` (v5) and the legacy `content` shape are supported so the backend
does not break if the client sends either form.
"""

from __future__ import annotations


def extract_text(message: dict) -> str:
    parts = message.get("parts")
    if isinstance(parts, list):
        chunks = [
            part.get("text", "")
            for part in parts
            if isinstance(part, dict) and part.get("type") == "text"
        ]
        return "\n".join(chunk for chunk in chunks if chunk)
    content = message.get("content")
    if isinstance(content, str):
        return content
    return ""


def normalize_history(messages: list[dict]) -> list[tuple[str, str]]:
    """Reduce a list of AI SDK messages to ordered (role, text) tuples.

    Empty messages and unknown roles are dropped, so downstream code can
    safely assume every entry has both fields populated.
    """
    history: list[tuple[str, str]] = []
    for msg in messages:
        role = msg.get("role")
        if role not in ("user", "assistant"):
            continue
        text = extract_text(msg)
        if text.strip():
            history.append((role, text.strip()))
    return history
