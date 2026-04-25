"""Streaming-layer constants: SSE media type, chat chunking, rewrite prompt."""

from __future__ import annotations


SSE_MEDIA_TYPE: str = "text/event-stream"
TEXT_STREAM_MEDIA_TYPE: str = "text/plain"

STREAM_CHUNK_CHARS: int = 24
STREAM_CHUNK_DELAY_S: float = 0.015

REWRITE_SYSTEM_PROMPT: str = (
    "You rewrite the latest user message into a self-contained, standalone "
    "question that does not depend on prior conversation. Resolve all "
    "pronouns and references using the conversation history. Output ONLY the "
    "rewritten question. No commentary, no quotes, no markdown."
)
