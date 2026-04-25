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

from src.llm_client import OpenRouterLLMClient, build_default_llm_client
from src.schema import DEFAULT_TABLE, SchemaContext, load_schema
from src.types import (
    AnswerGenerationOutput,
    PipelineOutput,
    SQLExecutionOutput,
    SQLGenerationOutput,
    SQLValidationOutput,
)
from src.validator import validate as validate_sql


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BASE_DIR / "data" / "gaming_mental_health.sqlite"

EXECUTION_ROW_FETCH_LIMIT = 100

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

    def run(self, question: str, request_id: str | None = None) -> PipelineOutput:
        start = time.perf_counter()

        sql_gen_output = self.llm.generate_sql(question, self.schema.to_prompt_dict())
        unanswerable_signal = _looks_unanswerable(sql_gen_output.sql)

        validation_output = self._validate(sql_gen_output.sql)

        if unanswerable_signal:
            executable_sql = None
        else:
            executable_sql = (
                validation_output.validated_sql if validation_output.is_valid else None
            )

        execution_output = self.executor.run(executable_sql)
        answer_output = self.llm.generate_answer(
            question, executable_sql, execution_output.rows
        )

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
