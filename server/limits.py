"""Input-size limits for HTTP-boundary validation.

Centralized so all routes (SSE run endpoints + multi-turn chat) reject
oversized inputs identically. The cap is a defense against pathological
prompts blowing the LLM token budget — not a security boundary on its own
(the SQL validator + read-only SQLite connection do that), but a cheap
input-hygiene check at the API boundary.
"""

from __future__ import annotations

from fastapi import HTTPException


MAX_QUESTION_CHARS: int = 2000


def validate_question_length(question: str) -> None:
    """Raise HTTPException(400) if `question` exceeds MAX_QUESTION_CHARS."""
    if len(question) > MAX_QUESTION_CHARS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"question exceeds {MAX_QUESTION_CHARS}-character limit "
                f"(received {len(question)})"
            ),
        )
