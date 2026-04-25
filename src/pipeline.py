"""Optimized analytics pipeline.

Differences from the frozen baseline (src/pipeline_baseline.py):
- Schema context is loaded once at construction and injected into SQL generation
  so the LLM has real column names/types to work with (was empty `{}` before).
- Generated SQL is validated against an sqlglot AST instead of being trusted
  blindly. DML/DDL/PRAGMA, multi-statements, and references to unknown
  tables/columns are rejected before execution.
- The executor uses a read-only SQLite connection — defense in depth even though
  validation already excludes write operations.
- When SQL generation or validation fails, the pipeline short-circuits: the
  executor is skipped and the LLM client returns a deterministic
  "cannot answer" response without burning a second API call.
"""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

from src.events import EventSink, PipelineKind, StageEvent
from src.llm_client import OpenRouterLLMClient, build_default_llm_client
from src.observability import get_logger
from src.schema import DEFAULT_TABLE, SchemaContext, load_schema
from src.types import (
    AnswerGenerationOutput,
    PipelineOutput,
    SQLExecutionOutput,
    SQLGenerationOutput,
    SQLValidationOutput,
)
from src.validator import validate as validate_sql


logger = get_logger(__name__)


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BASE_DIR / "data" / "gaming_mental_health.sqlite"

EXECUTION_ROW_FETCH_LIMIT = 100

ANSWER_EVENT_PREVIEW_CHARS = 200

# Sentinel literal embedded by the SQL-generation prompt when the model determines
# the question cannot be answered with the available schema. Detected after
# generation so the pipeline can short-circuit to status='unanswerable' and
# return a deterministic "cannot answer" response without burning an extra LLM
# call on the answer stage.
UNANSWERABLE_SQL_MARKER = "'cannot_answer'"


def _looks_unanswerable(sql: str | None) -> bool:
    return bool(sql) and UNANSWERABLE_SQL_MARKER in sql.lower()


class SQLiteExecutor:
    """Read-only SQLite executor for the analytics dataset."""

    def __init__(self, db_path: str | Path = DEFAULT_DB_PATH) -> None:
        self.db_path = Path(db_path)

    def run(self, sql: str | None) -> SQLExecutionOutput:
        start = time.perf_counter()

        if sql is None:
            return SQLExecutionOutput(
                rows=[],
                row_count=0,
                timing_ms=(time.perf_counter() - start) * 1000,
                error=None,
            )

        try:
            uri = f"file:{self.db_path}?mode=ro"
            with sqlite3.connect(uri, uri=True) as conn:
                conn.row_factory = sqlite3.Row
                cur = conn.execute(sql)
                rows = [dict(r) for r in cur.fetchmany(EXECUTION_ROW_FETCH_LIMIT)]
            return SQLExecutionOutput(
                rows=rows,
                row_count=len(rows),
                timing_ms=(time.perf_counter() - start) * 1000,
                error=None,
            )
        except Exception as exc:
            return SQLExecutionOutput(
                rows=[],
                row_count=0,
                timing_ms=(time.perf_counter() - start) * 1000,
                error=str(exc),
            )


class AnalyticsPipeline:
    """End-to-end NL question -> SQL -> answer pipeline."""

    PIPELINE_KIND: PipelineKind = "optimized"

    def __init__(
        self,
        db_path: str | Path = DEFAULT_DB_PATH,
        llm_client: OpenRouterLLMClient | None = None,
        table: str = DEFAULT_TABLE,
    ) -> None:
        self.db_path = Path(db_path)
        self.llm = llm_client or build_default_llm_client()
        self.executor = SQLiteExecutor(self.db_path)
        self.schema: SchemaContext = load_schema(self.db_path, table)

    def run(
        self,
        question: str,
        request_id: str | None = None,
        *,
        event_sink: EventSink | None = None,
    ) -> PipelineOutput:
        start = time.perf_counter()

        sql_gen_output = self.llm.generate_sql(question, self.schema.to_prompt_dict())
        self._emit_sql_generation_event(sql_gen_output, event_sink, request_id)

        unanswerable_signal = _looks_unanswerable(sql_gen_output.sql)
        validation_output = self._validate(sql_gen_output.sql)
        self._emit_validation_event(validation_output, event_sink, request_id)

        if unanswerable_signal:
            executable_sql = None
        else:
            executable_sql = (
                validation_output.validated_sql if validation_output.is_valid else None
            )

        execution_output = self.executor.run(executable_sql)
        self._emit_execution_event(execution_output, executable_sql, event_sink, request_id)

        answer_output = self.llm.generate_answer(
            question, executable_sql, execution_output.rows
        )
        self._emit_answer_event(answer_output, event_sink, request_id)

        status = self._classify_status(
            sql_gen_output,
            validation_output,
            execution_output,
            executable_sql,
            unanswerable_signal=unanswerable_signal,
        )

        timings = {
            "sql_generation_ms": sql_gen_output.timing_ms,
            "sql_validation_ms": validation_output.timing_ms,
            "sql_execution_ms": execution_output.timing_ms,
            "answer_generation_ms": answer_output.timing_ms,
            "total_ms": (time.perf_counter() - start) * 1000,
        }

        total_llm_stats = self._aggregate_llm_stats(sql_gen_output, answer_output)

        logger.info(
            "pipeline_run_completed",
            extra={
                "request_id": request_id,
                "pipeline": self.PIPELINE_KIND,
                "status": status,
                "total_ms": timings["total_ms"],
                "total_tokens": total_llm_stats["total_tokens"],
                "llm_calls": total_llm_stats["llm_calls"],
            },
        )

        return PipelineOutput(
            status=status,
            question=question,
            request_id=request_id,
            sql_generation=sql_gen_output,
            sql_validation=validation_output,
            sql_execution=execution_output,
            answer_generation=answer_output,
            sql=executable_sql,
            rows=execution_output.rows,
            answer=answer_output.answer,
            timings=timings,
            total_llm_stats=total_llm_stats,
        )

    def _emit(
        self,
        sink: EventSink | None,
        event: StageEvent,
        request_id: str | None,
    ) -> None:
        logger.info(
            "stage_completed",
            extra={
                "request_id": request_id,
                "pipeline": event.pipeline,
                "stage": event.stage,
                "status": event.status,
                "elapsed_ms": event.elapsed_ms,
                "tokens_delta": event.tokens_delta,
            },
        )
        if sink is None:
            return
        try:
            sink(event)
        except Exception:
            logger.exception("event_sink_error", extra={"request_id": request_id})

    def _emit_sql_generation_event(
        self,
        output: SQLGenerationOutput,
        sink: EventSink | None,
        request_id: str | None,
    ) -> None:
        self._emit(
            sink,
            StageEvent(
                pipeline=self.PIPELINE_KIND,
                stage="sql_generation",
                status="failed" if output.error else "completed",
                elapsed_ms=output.timing_ms,
                tokens_delta=int(output.llm_stats.get("total_tokens", 0)),
                payload={"sql": output.sql, "error": output.error},
            ),
            request_id,
        )

    def _emit_validation_event(
        self,
        output: SQLValidationOutput,
        sink: EventSink | None,
        request_id: str | None,
    ) -> None:
        self._emit(
            sink,
            StageEvent(
                pipeline=self.PIPELINE_KIND,
                stage="sql_validation",
                status="completed" if output.is_valid else "failed",
                elapsed_ms=output.timing_ms,
                payload={
                    "is_valid": output.is_valid,
                    "validated_sql": output.validated_sql,
                    "error": output.error,
                },
            ),
            request_id,
        )

    def _emit_execution_event(
        self,
        output: SQLExecutionOutput,
        executable_sql: str | None,
        sink: EventSink | None,
        request_id: str | None,
    ) -> None:
        if executable_sql is None:
            status = "skipped"
        elif output.error:
            status = "failed"
        else:
            status = "completed"
        self._emit(
            sink,
            StageEvent(
                pipeline=self.PIPELINE_KIND,
                stage="sql_execution",
                status=status,
                elapsed_ms=output.timing_ms,
                payload={"row_count": output.row_count, "error": output.error},
            ),
            request_id,
        )

    def _emit_answer_event(
        self,
        output: AnswerGenerationOutput,
        sink: EventSink | None,
        request_id: str | None,
    ) -> None:
        preview = output.answer[:ANSWER_EVENT_PREVIEW_CHARS]
        self._emit(
            sink,
            StageEvent(
                pipeline=self.PIPELINE_KIND,
                stage="answer_generation",
                status="failed" if output.error else "completed",
                elapsed_ms=output.timing_ms,
                tokens_delta=int(output.llm_stats.get("total_tokens", 0)),
                payload={"answer_preview": preview, "error": output.error},
            ),
            request_id,
        )

    def _validate(self, sql: str | None) -> SQLValidationOutput:
        start = time.perf_counter()
        result = validate_sql(sql, self.schema)
        return SQLValidationOutput(
            is_valid=result.is_valid,
            validated_sql=result.validated_sql,
            error=result.error,
            timing_ms=(time.perf_counter() - start) * 1000,
        )

    @staticmethod
    def _classify_status(
        sql_gen: SQLGenerationOutput,
        validation: SQLValidationOutput,
        execution: SQLExecutionOutput,
        executable_sql: str | None,
        *,
        unanswerable_signal: bool = False,
    ) -> str:
        if executable_sql is None:
            if unanswerable_signal or sql_gen.sql is None:
                return "unanswerable"
            return "invalid_sql"
        if execution.error:
            return "error"
        return "success"

    @staticmethod
    def _aggregate_llm_stats(
        sql_gen: SQLGenerationOutput,
        answer: AnswerGenerationOutput,
    ) -> dict:
        return {
            "llm_calls": (
                sql_gen.llm_stats.get("llm_calls", 0)
                + answer.llm_stats.get("llm_calls", 0)
            ),
            "prompt_tokens": (
                sql_gen.llm_stats.get("prompt_tokens", 0)
                + answer.llm_stats.get("prompt_tokens", 0)
            ),
            "completion_tokens": (
                sql_gen.llm_stats.get("completion_tokens", 0)
                + answer.llm_stats.get("completion_tokens", 0)
            ),
            "total_tokens": (
                sql_gen.llm_stats.get("total_tokens", 0)
                + answer.llm_stats.get("total_tokens", 0)
            ),
            "model": sql_gen.llm_stats.get("model", "unknown"),
        }
