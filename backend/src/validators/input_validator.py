"""Input-size validation applied at every HTTP boundary that accepts text."""

from __future__ import annotations

from fastapi import HTTPException

from src.constants.input_constants import MAX_QUESTION_CHARS


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
