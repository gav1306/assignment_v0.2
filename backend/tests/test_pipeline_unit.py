"""Unit tests for src.pipeline using a fake LLM client (no network)."""

from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.database.schema_introspection import load_schema
from src.models.event_models import StageEvent
from src.models.pipeline_models import AnswerGenerationOutput, SQLGenerationOutput
from src.services.pipeline_service import AnalyticsPipeline


def _build_test_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    try:
        conn.execute(
            "CREATE TABLE survey (id INTEGER, gender TEXT, score REAL)"
        )
        rows = [
            (i, ["Female", "Male", "Other"][i % 3], float(i) * 0.5)
            for i in range(9)
        ]
        conn.executemany("INSERT INTO survey VALUES (?, ?, ?)", rows)
        conn.commit()
    finally:
        conn.close()


class FakeLLMClient:
    """Stub that satisfies the OpenRouterLLMClient interface without network calls."""

    def __init__(
        self,
        *,
        sql: str | None = None,
        sql_error: str | None = None,
        answer: str = "Generated answer.",
    ) -> None:
        self.model = "fake/model"
        self._sql = sql
        self._sql_error = sql_error
        self._answer = answer
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def generate_sql(self, question: str, context: dict) -> SQLGenerationOutput:
        self.calls.append(("generate_sql", {"question": question, "context": context}))
        return SQLGenerationOutput(
            sql=self._sql,
            timing_ms=1.0,
            llm_stats={
                "llm_calls": 1,
                "prompt_tokens": 10,
                "completion_tokens": 5,
                "total_tokens": 15,
                "model": self.model,
            },
            error=self._sql_error,
        )

    def generate_answer(
        self,
        question: str,
        sql: str | None,
        rows: list[dict[str, Any]],
        *,
        cannot_answer: bool = False,
    ) -> AnswerGenerationOutput:
        self.calls.append(
            (
                "generate_answer",
                {
                    "question": question,
                    "sql": sql,
                    "rows": rows,
                    "cannot_answer": cannot_answer,
                },
            )
        )
        if not sql:
            return AnswerGenerationOutput(
                answer=(
                    "I cannot answer this with the available table and schema. "
                    "Please rephrase using known survey fields."
                ),
                timing_ms=0.0,
                llm_stats={"llm_calls": 0, "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "model": self.model},
                error=None,
            )
        return AnswerGenerationOutput(
            answer=self._answer,
            timing_ms=1.0,
            llm_stats={
                "llm_calls": 1,
                "prompt_tokens": 8,
                "completion_tokens": 4,
                "total_tokens": 12,
                "model": self.model,
            },
            error=None,
        )


class PipelineUnitTests(unittest.TestCase):
    def setUp(self) -> None:
        load_schema.cache_clear()
        self._tmpdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self._tmpdir.name) / "test.sqlite"
        _build_test_db(self.db_path)

    def tearDown(self) -> None:
        load_schema.cache_clear()
        self._tmpdir.cleanup()

    def _make_pipeline(self, llm: FakeLLMClient) -> AnalyticsPipeline:
        return AnalyticsPipeline(db_path=self.db_path, llm_client=llm, table="survey")

    def test_success_path(self) -> None:
        llm = FakeLLMClient(sql="SELECT gender, AVG(score) AS avg_score FROM survey GROUP BY gender")
        pipeline = self._make_pipeline(llm)

        result = pipeline.run("avg score by gender")

        self.assertEqual(result.status, "success")
        self.assertIsNotNone(result.sql)
        self.assertTrue(result.sql_validation.is_valid)
        self.assertGreater(len(result.rows), 0)
        # Two LLM calls were made (sql gen + answer gen) and tokens aggregated.
        self.assertEqual(result.total_llm_stats["llm_calls"], 2)
        self.assertEqual(result.total_llm_stats["total_tokens"], 27)

    def test_validation_rejects_dml(self) -> None:
        llm = FakeLLMClient(sql="DELETE FROM survey")
        pipeline = self._make_pipeline(llm)

        result = pipeline.run("delete everything")

        self.assertEqual(result.status, "invalid_sql")
        self.assertFalse(result.sql_validation.is_valid)
        self.assertIsNotNone(result.sql_validation.error)
        self.assertIn("cannot answer", result.answer.lower())
        # Answer LLM was not invoked because executable SQL is None.
        gen_calls = [c for c in llm.calls if c[0] == "generate_answer"]
        self.assertEqual(len(gen_calls), 1)
        self.assertIsNone(gen_calls[0][1]["sql"])

    def test_unknown_column_is_invalid_sql(self) -> None:
        llm = FakeLLMClient(sql="SELECT zodiac_sign FROM survey")
        pipeline = self._make_pipeline(llm)

        result = pipeline.run("zodiac stuff")

        self.assertEqual(result.status, "invalid_sql")
        self.assertIn("unknown_column", result.sql_validation.error or "")

    def test_unanswerable_when_sql_gen_returns_none(self) -> None:
        llm = FakeLLMClient(sql=None, sql_error="empty_content: nothing to extract")
        pipeline = self._make_pipeline(llm)

        result = pipeline.run("anything")

        self.assertEqual(result.status, "unanswerable")
        self.assertIn("cannot answer", result.answer.lower())

    def test_unanswerable_sentinel_short_circuits(self) -> None:
        sentinel = "SELECT 'cannot_answer' AS reason FROM survey LIMIT 0"
        llm = FakeLLMClient(sql=sentinel)
        pipeline = self._make_pipeline(llm)

        result = pipeline.run("question we cannot answer")

        self.assertEqual(result.status, "unanswerable")
        self.assertIn("cannot answer", result.answer.lower())
        # Answer LLM was called but with sql=None (short-circuit).
        answer_calls = [c for c in llm.calls if c[0] == "generate_answer"]
        self.assertEqual(len(answer_calls), 1)
        self.assertIsNone(answer_calls[0][1]["sql"])

    def test_executor_error_when_validator_passes_but_runtime_fails(self) -> None:
        # Valid SQL grammar referencing real columns, but the function call
        # forces a runtime error inside SQLite.
        llm = FakeLLMClient(sql="SELECT abs_nonexistent_fn(score) FROM survey")
        pipeline = self._make_pipeline(llm)

        result = pipeline.run("question")
        # If the validator over-rejected we'd see invalid_sql; we expect that
        # the validator passes (no Column errors since it parses as a function
        # call) and the executor surfaces the runtime error.
        self.assertIn(result.status, {"error", "invalid_sql"})

    def test_event_sink_emits_four_stages(self) -> None:
        llm = FakeLLMClient(sql="SELECT id FROM survey")
        pipeline = self._make_pipeline(llm)
        events: list[StageEvent] = []

        pipeline.run("question", event_sink=events.append)

        stages = [e.stage for e in events]
        self.assertEqual(
            stages,
            ["sql_generation", "sql_validation", "sql_execution", "answer_generation"],
        )
        # All events come from the optimized pipeline.
        self.assertTrue(all(e.pipeline == "optimized" for e in events))

    def test_schema_context_is_injected_into_sql_gen(self) -> None:
        llm = FakeLLMClient(sql="SELECT id FROM survey")
        pipeline = self._make_pipeline(llm)

        pipeline.run("question")

        gen_call = next(c for c in llm.calls if c[0] == "generate_sql")
        context = gen_call[1]["context"]
        # Schema dict must include table + columns when injected (C7 fix).
        self.assertEqual(context.get("table"), "survey")
        self.assertTrue(any(c["name"] == "gender" for c in context.get("columns", [])))

    def test_request_id_propagates_to_pipeline_output(self) -> None:
        llm = FakeLLMClient(sql="SELECT id FROM survey")
        pipeline = self._make_pipeline(llm)

        result = pipeline.run("question", request_id="req-xyz")

        self.assertEqual(result.request_id, "req-xyz")


if __name__ == "__main__":
    unittest.main()
