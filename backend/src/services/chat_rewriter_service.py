"""Standalone-question rewriter for multi-turn chat.

The latest user message in a multi-turn conversation often contains pronouns
or references that only make sense in context. The optimized SQL pipeline
expects a self-contained question, so we issue one cheap LLM call to rewrite
the latest turn into a standalone question before handing it to the pipeline.

First-turn questions are returned verbatim, saving an LLM call.
"""

from __future__ import annotations

from src.constants.llm_constants import DEFAULT_MAX_COMPLETION_TOKENS_REWRITE
from src.constants.stream_constants import REWRITE_SYSTEM_PROMPT
from src.services.llm_service import (
    EmptyContentError,
    OpenRouterLLMClient,
    build_default_llm_client,
)


_REWRITE_CLIENT: OpenRouterLLMClient | None = None


def get_rewriter_client() -> OpenRouterLLMClient:
    global _REWRITE_CLIENT
    if _REWRITE_CLIENT is None:
        _REWRITE_CLIENT = build_default_llm_client()
    return _REWRITE_CLIENT


def rewrite_to_standalone(history: list[tuple[str, str]]) -> str:
    """Return the latest user message rewritten to be self-contained.

    `history` is an ordered list of (role, text) tuples for both user and
    assistant turns. Returns the rewritten question, or the original latest
    user message if no rewrite is needed or the rewrite call returns nothing.
    """
    user_turns = [text for role, text in history if role == "user"]
    latest = user_turns[-1] if user_turns else ""
    if len(user_turns) <= 1:
        return latest

    transcript_lines = [f"{role}: {text}" for role, text in history[:-1]]
    transcript = "\n".join(transcript_lines)
    user_prompt = (
        f"Conversation so far:\n{transcript}\n\n"
        f"Latest user message: {latest}\n\n"
        "Rewrite the latest user message as a standalone question."
    )

    rewriter = get_rewriter_client()
    try:
        text = rewriter.chat_raw(
            messages=[
                {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            max_completion_tokens=DEFAULT_MAX_COMPLETION_TOKENS_REWRITE,
            reasoning_effort="low",
        )
        return text.strip().strip('"').strip("'")
    except EmptyContentError:
        return latest
