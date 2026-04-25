"""Server-Sent Events helpers (no third-party SSE library — vanilla text/event-stream)."""

from __future__ import annotations

import json
from typing import Any


SSE_MEDIA_TYPE = "text/event-stream"


def format_sse(payload: dict[str, Any]) -> str:
    """Encode a JSON payload as an SSE message with a trailing blank line."""
    return f"data: {json.dumps(payload, default=str)}\n\n"
