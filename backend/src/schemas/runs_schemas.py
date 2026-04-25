"""Pydantic envelopes for SSE payloads emitted by the /run endpoints.

These do not validate the wire format (SSE is plain text); they document the
JSON shape the controller dumps into each event so frontend/backend stay in
sync.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class StageEventPayload(BaseModel):
    type: Literal["stage"] = "stage"
    pipeline: Literal["baseline", "optimized"]
    stage: str
    status: str
    elapsed_ms: float
    tokens_delta: int = 0
    payload: dict[str, Any] = Field(default_factory=dict)


class RunCompletionPayload(BaseModel):
    type: Literal["run_completed"] = "run_completed"
    run_id: str
    pipeline: Literal["baseline", "optimized"]
    status: str
    question: str
    sql: str | None = None
    rows: list[dict[str, Any]] = Field(default_factory=list)
    answer: str = ""
    timings: dict[str, float] = Field(default_factory=dict)
    total_llm_stats: dict[str, Any] = Field(default_factory=dict)


class StreamErrorPayload(BaseModel):
    type: Literal["error"] = "error"
    pipeline: Literal["baseline", "optimized"]
    error: str
