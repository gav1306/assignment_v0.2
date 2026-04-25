"""Chat orchestration: rewrite -> run optimized pipeline -> persist -> format reply.

The endpoint streams plain text so the frontend can consume it via @ai-sdk/react's
TextStreamChatTransport without us having to re-implement the AI SDK Data Stream
Protocol on the Python side.

The SQL used is appended to the streamed text as a fenced markdown block so the
UI can show "how I answered" inline.
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator
from uuid import uuid4

from fastapi.responses import StreamingResponse

from src.constants.stream_constants import (
    STREAM_CHUNK_CHARS,
    STREAM_CHUNK_DELAY_S,
    TEXT_STREAM_MEDIA_TYPE,
)
from src.database.runs_repository import save_run
from src.helpers.chat_helpers import normalize_history
from src.models.pipeline_models import PipelineOutput
from src.services.chat_rewriter_service import rewrite_to_standalone
from src.services.pipeline_service import get_optimized_pipeline
from src.validators.input_validator import validate_question_length


async def _stream_text(text: str) -> AsyncIterator[str]:
    for i in range(0, len(text), STREAM_CHUNK_CHARS):
        yield text[i : i + STREAM_CHUNK_CHARS]
        await asyncio.sleep(STREAM_CHUNK_DELAY_S)


def _format_response_body(result: PipelineOutput, standalone_question: str) -> str:
    parts: list[str] = []
    if standalone_question and standalone_question != result.question:
        parts.append(f"_Interpreted as: {standalone_question}_\n\n")
    parts.append(result.answer or "(no answer)")
    if result.sql:
        parts.append(f"\n\n```sql\n{result.sql}\n```")
    if result.total_llm_stats.get("total_tokens", 0):
        tokens = result.total_llm_stats["total_tokens"]
        ms = round(result.timings["total_ms"])
        parts.append(f"\n\n_({ms} ms - {tokens} tokens - status: {result.status})_")
    return "".join(parts)


async def handle_chat(body: dict) -> StreamingResponse:
    messages = body.get("messages", [])
    if not isinstance(messages, list):
        messages = []

    history = normalize_history(messages)

    # Reject oversized user turns at the API boundary before spending any LLM budget.
    for _, text in history:
        validate_question_length(text)

    # The rewrite + pipeline are sync, blocking I/O; offload to a worker thread.
    standalone = await asyncio.to_thread(rewrite_to_standalone, history)
    pipeline = get_optimized_pipeline()
    run_id = body.get("id") or str(uuid4())

    result: PipelineOutput = await asyncio.to_thread(pipeline.run, standalone, run_id)

    try:
        await asyncio.to_thread(save_run, run_id, standalone, "optimized", result)
    except Exception:
        # Persistence failure must not block the chat reply.
        pass

    body_text = _format_response_body(result, standalone)

    return StreamingResponse(
        _stream_text(body_text),
        media_type=TEXT_STREAM_MEDIA_TYPE,
        headers={"X-Run-Id": run_id},
    )
