"""Multi-turn chat endpoint backed by the optimized analytics pipeline.

The endpoint accepts the AI SDK v5 message shape:
    {messages: [{role: "user"|"assistant", parts: [{type: "text", text: "..."}]}]}

For multi-turn questions, the latest user message is rewritten into a standalone
question using prior context (one cheap LLM call). The optimized pipeline then
generates the SQL + answer. The response streams plain text so the frontend can
consume it via @ai-sdk/react's TextStreamChatTransport without us having to
re-implement the AI SDK Data Stream Protocol on the Python side.

The SQL used is appended to the streamed text as a fenced markdown block so the
UI can show "how I answered" inline.
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator
from uuid import uuid4

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from src.llm_client import EmptyContentError, OpenRouterLLMClient, build_default_llm_client
from src.pipeline import AnalyticsPipeline
from src.types import PipelineOutput

from server.limits import validate_question_length
from server.routes.runs import _get_optimized
from server.storage import save_run


router = APIRouter()


REWRITE_SYSTEM_PROMPT = (
    "You rewrite the latest user message into a self-contained, standalone "
    "question that does not depend on prior conversation. Resolve all "
    "pronouns and references using the conversation history. Output ONLY the "
    "rewritten question — no commentary, no quotes, no markdown."
)

STREAM_CHUNK_CHARS = 24
STREAM_CHUNK_DELAY_S = 0.015


_REWRITE_CLIENT: OpenRouterLLMClient | None = None


def _get_rewriter() -> OpenRouterLLMClient:
    global _REWRITE_CLIENT
    if _REWRITE_CLIENT is None:
        _REWRITE_CLIENT = build_default_llm_client()
    return _REWRITE_CLIENT


def _extract_text(message: dict) -> str:
    """Extract text from an AI SDK v5 message — supports both `parts` and the
    legacy `content` shape so we don't break if the client sends either form."""
    parts = message.get("parts")
    if isinstance(parts, list):
        chunks = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("type") == "text"]
        return "\n".join(c for c in chunks if c)
    content = message.get("content")
    if isinstance(content, str):
        return content
    return ""


def _normalize_history(messages: list[dict]) -> list[tuple[str, str]]:
    history: list[tuple[str, str]] = []
    for msg in messages:
        role = msg.get("role")
        if role not in ("user", "assistant"):
            continue
        text = _extract_text(msg)
        if text.strip():
            history.append((role, text.strip()))
    return history


def _rewrite_to_standalone(history: list[tuple[str, str]]) -> str:
    user_turns = [text for role, text in history if role == "user"]
    latest = user_turns[-1] if user_turns else ""
    # First-turn questions need no rewrite — saves an LLM call.
    if len(user_turns) <= 1:
        return latest

    transcript_lines = [f"{role}: {text}" for role, text in history[:-1]]
    transcript = "\n".join(transcript_lines)
    user_prompt = (
        f"Conversation so far:\n{transcript}\n\n"
        f"Latest user message: {latest}\n\n"
        "Rewrite the latest user message as a standalone question."
    )

    rewriter = _get_rewriter()
    try:
        text = rewriter._chat(  # noqa: SLF001 — internal helper used intentionally for one-shot rewrite
            messages=[
                {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            max_completion_tokens=300,
            reasoning_effort="low",
        )
        return text.strip().strip('"').strip("'")
    except EmptyContentError:
        return latest


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
        parts.append(f"\n\n_({ms} ms · {tokens} tokens · status: {result.status})_")
    return "".join(parts)


@router.post("/chat")
async def chat(request: Request) -> StreamingResponse:
    body = await request.json()
    messages = body.get("messages", [])
    if not isinstance(messages, list):
        messages = []

    history = _normalize_history(messages)

    # Reject oversized user turns at the API boundary before spending any LLM budget.
    for _, text in history:
        validate_question_length(text)

    # Off-thread: the rewrite + pipeline are sync, blocking I/O.
    standalone = await asyncio.to_thread(_rewrite_to_standalone, history)
    pipeline: AnalyticsPipeline = _get_optimized()
    run_id = body.get("id") or str(uuid4())

    result: PipelineOutput = await asyncio.to_thread(pipeline.run, standalone, run_id)

    # Persist for the history page.
    try:
        await asyncio.to_thread(save_run, run_id, standalone, "optimized", result)
    except Exception:
        pass

    body_text = _format_response_body(result, standalone)

    return StreamingResponse(
        _stream_text(body_text),
        media_type="text/plain",
        headers={"X-Run-Id": run_id},
    )
