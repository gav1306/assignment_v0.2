"""Optimized LLM client wrapping the OpenRouter SDK with reliability + observability primitives.

Differences from the frozen baseline (services/baseline/llm_baseline_service.py):
- Uses max_completion_tokens (the SDK's deprecated max_tokens cap of 240
  starves reasoning models like gpt-5-nano and forces content=None on every
  call).
- Records token usage from res.usage on every call (assignment hard
  requirement).
- Raises a domain-specific EmptyContentError on missing content so callers
  can degrade gracefully instead of crashing the pipeline.
- Per-call timeout via timeout_ms.
- Network retries delegated to the SDK's RetryConfig (transient connection
  errors, exponential backoff). Empty-content errors are NOT retried since
  same params will not help.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any

from openrouter.components.chatrequest import Reasoning
from openrouter.utils.retries import BackoffStrategy, RetryConfig

from src.constants.llm_constants import (
    DEFAULT_MAX_COMPLETION_TOKENS_ANSWER,
    DEFAULT_MAX_COMPLETION_TOKENS_SQL,
    DEFAULT_MODEL,
    DEFAULT_REASONING_EFFORT_ANSWER,
    DEFAULT_REASONING_EFFORT_SQL,
    DEFAULT_RETRY_EXPONENT,
    DEFAULT_RETRY_INITIAL_MS,
    DEFAULT_RETRY_MAX_ELAPSED_MS,
    DEFAULT_RETRY_MAX_MS,
    DEFAULT_TIMEOUT_MS,
    ENV_MAX_TOKENS_ANSWER,
    ENV_MAX_TOKENS_SQL,
    ENV_OPENROUTER_API_KEY,
    ENV_OPENROUTER_MODEL,
    ENV_TIMEOUT_MS,
)
from src.models.pipeline_models import AnswerGenerationOutput, SQLGenerationOutput


logger = logging.getLogger(__name__)


class LLMClientError(Exception):
    """Base exception for LLM client failures."""


class EmptyContentError(LLMClientError):
    """LLM call returned no usable text content.

    Typically caused by the reasoning model exhausting its budget on hidden
    reasoning tokens before producing visible output, or the provider
    truncating the response. Caller should treat as 'unanswerable' for this
    turn rather than retry with identical parameters.
    """


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        logger.warning("Ignoring non-integer %s=%r; using default %d", name, raw, default)
        return default


class OpenRouterLLMClient:
    """LLM client using the OpenRouter SDK for chat completions."""

    provider_name = "openrouter"

    def __init__(
        self,
        api_key: str,
        model: str | None = None,
        *,
        timeout_ms: int | None = None,
        max_tokens_sql: int | None = None,
        max_tokens_answer: int | None = None,
    ) -> None:
        try:
            from openrouter import OpenRouter
        except ModuleNotFoundError as exc:
            raise RuntimeError("Missing dependency: install 'openrouter'.") from exc

        self.model = model or os.getenv(ENV_OPENROUTER_MODEL, DEFAULT_MODEL)
        self._client = OpenRouter(api_key=api_key)
        self._stats = self._fresh_stats()

        self._timeout_ms = timeout_ms if timeout_ms is not None else _env_int(
            ENV_TIMEOUT_MS, DEFAULT_TIMEOUT_MS
        )
        self._max_tokens_sql = max_tokens_sql if max_tokens_sql is not None else _env_int(
            ENV_MAX_TOKENS_SQL, DEFAULT_MAX_COMPLETION_TOKENS_SQL
        )
        self._max_tokens_answer = max_tokens_answer if max_tokens_answer is not None else _env_int(
            ENV_MAX_TOKENS_ANSWER, DEFAULT_MAX_COMPLETION_TOKENS_ANSWER
        )

        self._retry_config = RetryConfig(
            strategy="backoff",
            backoff=BackoffStrategy(
                initial_interval=DEFAULT_RETRY_INITIAL_MS,
                max_interval=DEFAULT_RETRY_MAX_MS,
                exponent=DEFAULT_RETRY_EXPONENT,
                max_elapsed_time=DEFAULT_RETRY_MAX_ELAPSED_MS,
            ),
            retry_connection_errors=True,
        )

    @staticmethod
    def _fresh_stats() -> dict[str, int]:
        return {"llm_calls": 0, "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    def _record_usage(self, response: Any) -> None:
        self._stats["llm_calls"] += 1
        usage = getattr(response, "usage", None)
        if usage is None:
            return
        self._stats["prompt_tokens"] += int(getattr(usage, "prompt_tokens", 0) or 0)
        self._stats["completion_tokens"] += int(getattr(usage, "completion_tokens", 0) or 0)
        self._stats["total_tokens"] += int(getattr(usage, "total_tokens", 0) or 0)

    def chat_raw(
        self,
        messages: list[dict[str, str]],
        temperature: float,
        max_completion_tokens: int,
        *,
        reasoning_effort: str | None = None,
    ) -> str:
        """Public chat helper used by chat_rewriter_service for one-shot rewrites."""
        kwargs: dict[str, Any] = dict(
            messages=messages,
            model=self.model,
            temperature=temperature,
            max_completion_tokens=max_completion_tokens,
            timeout_ms=self._timeout_ms,
            retries=self._retry_config,
            stream=False,
        )
        if reasoning_effort:
            kwargs["reasoning"] = Reasoning(effort=reasoning_effort)

        response = self._client.chat.send(**kwargs)

        self._record_usage(response)

        choices = getattr(response, "choices", None) or []
        if not choices:
            raise EmptyContentError("OpenRouter response contained no choices")

        first_choice = choices[0]
        message = getattr(first_choice, "message", None)
        content = getattr(message, "content", None)
        if not isinstance(content, str) or not content.strip():
            finish_reason = getattr(first_choice, "finish_reason", None)
            raise EmptyContentError(
                f"OpenRouter returned no text content (finish_reason={finish_reason!r}, "
                f"max_completion_tokens={max_completion_tokens})"
            )

        return content.strip()

    _SQL_STATEMENT_KEYWORDS: tuple[str, ...] = (
        "select", "with",
        "delete", "update", "insert", "drop", "create", "alter",
        "pragma", "attach", "detach", "truncate", "replace", "merge",
    )

    # Match a SQL keyword at a word boundary so `SELECT\n`, `SELECT(`, `SELECT *`
    # all match: anything where the keyword is followed by non-word.
    _SQL_KEYWORD_PATTERN = re.compile(
        r"\b(?:" + "|".join(_SQL_STATEMENT_KEYWORDS) + r")\b",
        re.IGNORECASE,
    )

    @classmethod
    def _extract_sql(cls, text: str) -> str | None:
        candidate = text.strip()

        # Strip markdown code fences (```sql ... ``` or ``` ... ```).
        if candidate.startswith("```"):
            candidate = candidate.split("\n", 1)[-1]
            if candidate.endswith("```"):
                candidate = candidate[:-3]
            candidate = candidate.strip()

        # JSON object form: {"sql": "..."}
        if candidate.startswith("{") and candidate.endswith("}"):
            try:
                parsed = json.loads(candidate)
                sql = parsed.get("sql")
                if isinstance(sql, str) and sql.strip():
                    return sql.strip()
            except json.JSONDecodeError:
                pass

        # Find the first SQL keyword on a word boundary. We accept DML/DDL too;
        # the validator rejects unsafe operations downstream so the pipeline
        # can return status='invalid_sql' instead of refusing at the LLM layer.
        match = cls._SQL_KEYWORD_PATTERN.search(candidate)
        if match:
            return candidate[match.start():].strip()
        return None

    def generate_sql(self, question: str, context: dict) -> SQLGenerationOutput:
        table_name = context.get("table", "the_table")
        system_prompt = (
            "You are a SQL generator for a SQLite analytics database.\n"
            "Use ONLY the columns listed in the provided schema context. "
            "Do NOT substitute unrelated columns when a concept is missing.\n"
            f"Every SELECT MUST read from the dataset table `{table_name}` "
            "(directly or via a CTE that reads from it). NEVER emit a "
            "constant-only SELECT such as `SELECT 'hi' AS msg` or "
            "`SELECT 'answer' AS x LIMIT 1` — those bypass the dataset and "
            "fabricate rows.\n"
            "Use the cannot_answer sentinel below in any of these cases:\n"
            "  • the input is conversational (greetings, small talk, thanks)\n"
            "  • the input is a meta-question about you, the assistant, or "
            "this tool ('who are you?', 'what can you do?', 'help')\n"
            "  • the question requires concepts or fields NOT in the schema "
            "(e.g., zodiac sign, astrology, weather, location)\n"
            "Emit EXACTLY this SQL and nothing else for those cases:\n"
            f"    SELECT 'cannot_answer' AS reason FROM {table_name} LIMIT 0\n"
            "Otherwise, generate the SQL that answers the question.\n"
            "Return ONLY the SQL statement. No commentary, no markdown, no "
            "explanation.\n"
            "For DML/DDL operations (DELETE, UPDATE, INSERT, etc.), still emit "
            "the SQL. A downstream validator handles safety."
        )
        user_prompt = (
            f"Schema:\n{json.dumps(context, ensure_ascii=True)}\n\n"
            f"Question: {question}\n\n"
            "Output: a single SQL statement."
        )

        start = time.perf_counter()
        error: str | None = None
        sql: str | None = None

        try:
            text = self.chat_raw(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
                max_completion_tokens=self._max_tokens_sql,
                reasoning_effort=DEFAULT_REASONING_EFFORT_SQL,
            )
            sql = self._extract_sql(text)
            if sql is None:
                error = "sql_extraction_failed: model returned no parseable SELECT"
        except EmptyContentError as exc:
            error = f"empty_content: {exc}"
        except Exception as exc:
            error = str(exc)

        timing_ms = (time.perf_counter() - start) * 1000
        llm_stats = self.pop_stats()
        llm_stats["model"] = self.model

        return SQLGenerationOutput(
            sql=sql,
            timing_ms=timing_ms,
            llm_stats=llm_stats,
            error=error,
        )

    def generate_answer(
        self,
        question: str,
        sql: str | None,
        rows: list[dict[str, Any]],
        *,
        cannot_answer: bool = False,
    ) -> AnswerGenerationOutput:
        # The SQL prompt instructs the model to emit a `cannot_answer` sentinel
        # SELECT for conversational/out-of-scope inputs. The pipeline detects
        # the sentinel upstream and signals it via `cannot_answer=True` so the
        # answer step can return a tailored conversational reply.
        if cannot_answer:
            return AnswerGenerationOutput(
                answer=(
                    "I'm a query assistant for the gaming-mental-health survey "
                    "dataset. I can't answer that from the data — try asking "
                    "about anxiety, depression, addiction, age groups, gender, "
                    "hours played, or related survey fields."
                ),
                timing_ms=0.0,
                llm_stats={**self._fresh_stats(), "model": self.model},
                error=None,
            )
        if not sql:
            return AnswerGenerationOutput(
                answer=(
                    "I cannot answer this with the available table and schema. "
                    "Please rephrase using known survey fields."
                ),
                timing_ms=0.0,
                llm_stats={**self._fresh_stats(), "model": self.model},
                error=None,
            )
        if not rows:
            return AnswerGenerationOutput(
                answer="Query executed, but no rows were returned.",
                timing_ms=0.0,
                llm_stats={**self._fresh_stats(), "model": self.model},
                error=None,
            )

        system_prompt = (
            "You are a concise analytics assistant. "
            "Use only the provided SQL results. Do not invent data."
        )
        user_prompt = (
            f"Question:\n{question}\n\nSQL:\n{sql}\n\n"
            f"Rows (JSON):\n{json.dumps(rows[:30], ensure_ascii=True)}\n\n"
            "Write a concise answer in plain English."
        )

        start = time.perf_counter()
        error: str | None = None
        answer = ""

        try:
            answer = self.chat_raw(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_completion_tokens=self._max_tokens_answer,
                reasoning_effort=DEFAULT_REASONING_EFFORT_ANSWER,
            )
        except EmptyContentError as exc:
            error = f"empty_content: {exc}"
            answer = "I cannot answer this question right now (the model returned no content)."
        except Exception as exc:
            error = str(exc)
            answer = f"Error generating answer: {error}"

        timing_ms = (time.perf_counter() - start) * 1000
        llm_stats = self.pop_stats()
        llm_stats["model"] = self.model

        return AnswerGenerationOutput(
            answer=answer,
            timing_ms=timing_ms,
            llm_stats=llm_stats,
            error=error,
        )

    def pop_stats(self) -> dict[str, Any]:
        snapshot = dict(self._stats)
        self._stats = self._fresh_stats()
        return snapshot


def build_default_llm_client() -> OpenRouterLLMClient:
    api_key = os.getenv(ENV_OPENROUTER_API_KEY, "").strip()
    if not api_key:
        raise RuntimeError(f"{ENV_OPENROUTER_API_KEY} is required.")
    return OpenRouterLLMClient(api_key=api_key)
