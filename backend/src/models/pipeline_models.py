"""Domain dataclasses for the analytics pipeline input/output contract."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PipelineInput:
    question: str
    request_id: str | None = None


@dataclass
class SQLGenerationOutput:
    """Output from the SQL-generation stage.

    For multi-LLM-call solutions (chain-of-thought, planning, refinement),
    populate intermediate_outputs with per-call detail; llm_stats remains the
    aggregate used by efficiency scoring.
    """

    sql: str | None
    timing_ms: float
    llm_stats: dict[str, Any]
    intermediate_outputs: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None


@dataclass
class SQLValidationOutput:
    is_valid: bool
    validated_sql: str | None
    error: str | None = None
    timing_ms: float = 0.0


@dataclass
class SQLExecutionOutput:
    rows: list[dict[str, Any]]
    row_count: int
    timing_ms: float
    error: str | None = None


@dataclass
class AnswerGenerationOutput:
    """Output from the answer-generation stage. Same intermediate-vs-aggregate
    pattern as SQLGenerationOutput."""

    answer: str
    timing_ms: float
    llm_stats: dict[str, Any]
    intermediate_outputs: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None


@dataclass
class PipelineOutput:
    """Full result of AnalyticsPipeline.run().

    `status` is one of: "success" | "unanswerable" | "invalid_sql" | "error".
    """

    status: str
    question: str
    request_id: str | None

    sql_generation: SQLGenerationOutput
    sql_validation: SQLValidationOutput
    sql_execution: SQLExecutionOutput
    answer_generation: AnswerGenerationOutput

    sql: str | None = None
    rows: list[dict[str, Any]] = field(default_factory=list)
    answer: str = ""

    timings: dict[str, float] = field(default_factory=dict)
    total_llm_stats: dict[str, Any] = field(default_factory=dict)
