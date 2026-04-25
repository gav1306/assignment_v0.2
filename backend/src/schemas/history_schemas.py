"""Pydantic response schemas for /history and /runs/{run_id}."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RunRecord(BaseModel):
    id: str
    question: str
    created_at: str
    baseline: dict[str, Any] | None = None
    optimized: dict[str, Any] | None = None


class HistoryListResponse(BaseModel):
    runs: list[RunRecord] = Field(default_factory=list)
    total: int = 0
    limit: int = 50
    offset: int = 0
