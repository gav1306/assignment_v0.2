"""SSE orchestration for live pipeline execution.

Two endpoints (one per pipeline) let the frontend open both as parallel
EventSources and watch the runs race side-by-side.

The optimized pipeline streams stage events as they happen via the pipeline's
event_sink hook. The frozen baseline does NOT emit events (the codebase
preserves the original starter shape for honest A/B comparison), so the
baseline route synthesizes stage events from the final PipelineOutput timings
once the run completes. This visually shows the user that the baseline is a
black box compared to the observable optimized pipeline.
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator

from src.database.runs_repository import save_run
from src.lib.sse import format_sse
from src.models.event_models import StageEvent
from src.models.pipeline_models import PipelineOutput
from src.services.baseline.pipeline_baseline_service import get_baseline_pipeline
from src.services.pipeline_service import get_optimized_pipeline


def _completion_payload(run_id: str, pipeline_kind: str, result: PipelineOutput) -> dict:
    return {
        "type": "run_completed",
        "run_id": run_id,
        "pipeline": pipeline_kind,
        "status": result.status,
        "question": result.question,
        "sql": result.sql,
        "rows": result.rows,
        "answer": result.answer,
        "timings": result.timings,
        "total_llm_stats": result.total_llm_stats,
    }


def _synthesize_baseline_events(result: PipelineOutput) -> list[StageEvent]:
    """Build per-stage events from the baseline PipelineOutput in chronological order."""
    sql_gen = result.sql_generation
    validation = result.sql_validation
    execution = result.sql_execution
    answer = result.answer_generation

    return [
        StageEvent(
            pipeline="baseline",
            stage="sql_generation",
            status="failed" if sql_gen.error else "completed",
            elapsed_ms=sql_gen.timing_ms,
            tokens_delta=int(sql_gen.llm_stats.get("total_tokens", 0)),
            payload={"sql": sql_gen.sql, "error": sql_gen.error},
        ),
        StageEvent(
            pipeline="baseline",
            stage="sql_validation",
            status="completed" if validation.is_valid else "failed",
            elapsed_ms=validation.timing_ms,
            payload={
                "is_valid": validation.is_valid,
                "validated_sql": validation.validated_sql,
                "error": validation.error,
            },
        ),
        StageEvent(
            pipeline="baseline",
            stage="sql_execution",
            status=(
                "skipped" if result.sql is None
                else "failed" if execution.error
                else "completed"
            ),
            elapsed_ms=execution.timing_ms,
            payload={"row_count": execution.row_count, "error": execution.error},
        ),
        StageEvent(
            pipeline="baseline",
            stage="answer_generation",
            status="failed" if answer.error else "completed",
            elapsed_ms=answer.timing_ms,
            tokens_delta=int(answer.llm_stats.get("total_tokens", 0)),
            payload={"answer_preview": (answer.answer or "")[:200], "error": answer.error},
        ),
    ]


async def stream_optimized(question: str, run_id: str) -> AsyncIterator[str]:
    pipeline = get_optimized_pipeline()
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def sink(event: StageEvent) -> None:
        loop.call_soon_threadsafe(queue.put_nowait, ("stage", event))

    async def runner() -> None:
        try:
            result = await asyncio.to_thread(
                pipeline.run, question, run_id, event_sink=sink
            )
            await queue.put(("done", result))
        except Exception as exc:
            await queue.put(("error", exc))

    asyncio.create_task(runner())

    while True:
        kind, payload = await queue.get()
        if kind == "stage":
            yield format_sse({"type": "stage", **payload.to_dict()})
        elif kind == "done":
            result: PipelineOutput = payload
            try:
                await asyncio.to_thread(save_run, run_id, question, "optimized", result)
            except Exception:
                # Storage failure must not break the live stream.
                pass
            yield format_sse(_completion_payload(run_id, "optimized", result))
            return
        else:
            yield format_sse({"type": "error", "pipeline": "optimized", "error": str(payload)})
            return


async def stream_baseline(question: str, run_id: str) -> AsyncIterator[str]:
    pipeline = get_baseline_pipeline()

    yield format_sse(
        {
            "type": "stage",
            "pipeline": "baseline",
            "stage": "sql_generation",
            "status": "running",
            "elapsed_ms": 0,
            "tokens_delta": 0,
            "payload": {"note": "baseline is a black box; events are synthesized at completion"},
        }
    )

    try:
        result: PipelineOutput = await asyncio.to_thread(pipeline.run, question, run_id)
    except Exception as exc:
        yield format_sse({"type": "error", "pipeline": "baseline", "error": str(exc)})
        return

    for event in _synthesize_baseline_events(result):
        yield format_sse({"type": "stage", **event.to_dict()})

    try:
        await asyncio.to_thread(save_run, run_id, question, "baseline", result)
    except Exception:
        pass

    yield format_sse(_completion_payload(run_id, "baseline", result))
