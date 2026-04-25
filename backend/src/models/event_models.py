"""Typed pipeline-stage events for streaming and observability.

Emitted by AnalyticsPipeline.run() via its optional event_sink callback so the
SSE layer can forward them to a UI without coupling the pipeline to any
transport.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Literal


PipelineKind = Literal["baseline", "optimized"]
StageName = Literal[
    "sql_generation",
    "sql_validation",
    "sql_execution",
    "answer_generation",
]
StageStatus = Literal["completed", "failed", "skipped", "running"]


@dataclass(frozen=True)
class StageEvent:
    pipeline: PipelineKind
    stage: StageName
    status: StageStatus
    elapsed_ms: float
    tokens_delta: int = 0
    payload: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "pipeline": self.pipeline,
            "stage": self.stage,
            "status": self.status,
            "elapsed_ms": self.elapsed_ms,
            "tokens_delta": self.tokens_delta,
            "payload": dict(self.payload),
        }


EventSink = Callable[[StageEvent], None]
