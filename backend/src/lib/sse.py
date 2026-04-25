"""Server-Sent Events helpers (vanilla text/event-stream, no third-party SSE lib)."""

from __future__ import annotations

import json
from typing import Any

from src.constants.stream_constants import SSE_MEDIA_TYPE


__all__ = ["SSE_MEDIA_TYPE", "format_sse"]


def format_sse(payload: dict[str, Any]) -> str:
    """Encode a JSON payload as an SSE message with a trailing blank line."""
    return f"data: {json.dumps(payload, default=str)}\n\n"
