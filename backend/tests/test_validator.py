"""Unit tests for the sqlglot AST-based SQL validator."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.constants.schema_constants import DEFAULT_ROW_LIMIT
from src.models.schema_models import ColumnInfo, SchemaContext
from src.validators.sql_validator import validate


def _build_schema() -> SchemaContext:
    return SchemaContext(
        table="analytics",
        columns=(
            ColumnInfo(name="id", type="INTEGER", nullable=False),
            ColumnInfo(name="name", type="TEXT", nullable=True),
            ColumnInfo(name="score", type="REAL", nullable=True),
            ColumnInfo(name="gender", type="TEXT", nullable=True),
        ),
        categorical_samples=(("gender", ("Female", "Male", "Other")),),
    )


class ValidatorAcceptanceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.schema = _build_schema()

    def test_plain_select_passes(self) -> None:
        result = validate("SELECT name FROM analytics", self.schema)
        self.assertTrue(result.is_valid, result.error)
        self.assertIsNone(result.error)

    def test_select_star_passes(self) -> None:
        result = validate("SELECT * FROM analytics", self.schema)
        self.assertTrue(result.is_valid)

    def test_aggregate_with_alias_used_in_having(self) -> None:
        sql = "SELECT gender, COUNT(*) AS n FROM analytics GROUP BY gender HAVING n > 100"
        result = validate(sql, self.schema)
        self.assertTrue(result.is_valid, result.error)

    def test_cte_allowed(self) -> None:
        sql = "WITH t AS (SELECT name FROM analytics) SELECT name FROM t"
        result = validate(sql, self.schema)
        self.assertTrue(result.is_valid, result.error)

    def test_subquery_allowed(self) -> None:
        sql = "SELECT * FROM (SELECT name FROM analytics) sub"
        result = validate(sql, self.schema)
        self.assertTrue(result.is_valid, result.error)

    def test_nested_cte_allowed(self) -> None:
        sql = (
            "WITH a AS (SELECT * FROM analytics), "
            "b AS (SELECT * FROM a) SELECT * FROM b"
        )
        result = validate(sql, self.schema)
        self.assertTrue(result.is_valid, result.error)

    def test_existing_limit_preserved(self) -> None:
        result = validate("SELECT name FROM analytics LIMIT 5", self.schema)
        self.assertTrue(result.is_valid)
        self.assertIn("LIMIT 5", (result.validated_sql or "").upper())

    def test_default_limit_injected_when_missing(self) -> None:
        result = validate("SELECT name FROM analytics", self.schema)
        self.assertTrue(result.is_valid)
        self.assertIn(f"LIMIT {DEFAULT_ROW_LIMIT}", result.validated_sql or "")


class ValidatorRejectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.schema = _build_schema()

    def test_delete_rejected(self) -> None:
        result = validate("DELETE FROM analytics", self.schema)
        self.assertFalse(result.is_valid)
        self.assertIn("Delete", result.error or "")

    def test_update_rejected(self) -> None:
        result = validate("UPDATE analytics SET name = 'x'", self.schema)
        self.assertFalse(result.is_valid)

    def test_insert_rejected(self) -> None:
        result = validate("INSERT INTO analytics (id) VALUES (1)", self.schema)
        self.assertFalse(result.is_valid)

    def test_drop_rejected(self) -> None:
        result = validate("DROP TABLE analytics", self.schema)
        self.assertFalse(result.is_valid)

    def test_create_rejected(self) -> None:
        result = validate("CREATE TABLE x (a INTEGER)", self.schema)
        self.assertFalse(result.is_valid)

    def test_alter_rejected(self) -> None:
        result = validate("ALTER TABLE analytics ADD COLUMN x INTEGER", self.schema)
        self.assertFalse(result.is_valid)

    def test_pragma_rejected(self) -> None:
        result = validate("PRAGMA table_info(analytics)", self.schema)
        self.assertFalse(result.is_valid)

    def test_attach_rejected(self) -> None:
        result = validate("ATTACH DATABASE 'evil.db' AS evil", self.schema)
        self.assertFalse(result.is_valid)

    def test_multi_statement_rejected(self) -> None:
        result = validate("SELECT 1; DROP TABLE analytics", self.schema)
        self.assertFalse(result.is_valid)

    def test_unknown_table_rejected(self) -> None:
        result = validate("SELECT * FROM users", self.schema)
        self.assertFalse(result.is_valid)
        self.assertIn("unknown_table", result.error or "")

    def test_unknown_column_rejected(self) -> None:
        result = validate("SELECT zodiac_sign FROM analytics", self.schema)
        self.assertFalse(result.is_valid)
        self.assertIn("unknown_column", result.error or "")

    def test_empty_string_rejected(self) -> None:
        result = validate("", self.schema)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.error, "no_sql_provided")

    def test_none_rejected(self) -> None:
        result = validate(None, self.schema)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.error, "no_sql_provided")

    def test_garbage_rejected(self) -> None:
        result = validate("this is not sql", self.schema)
        self.assertFalse(result.is_valid)

    def test_constant_only_select_rejected(self) -> None:
        # The model occasionally improvises a literal SELECT (e.g. for a
        # greeting) to satisfy the "return SQL" contract. The improvised
        # query has no FROM and bypasses the dataset entirely; reject it.
        result = validate("SELECT 'hello' AS msg LIMIT 1", self.schema)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.error, "no_table_reference")

    def test_cte_only_select_without_dataset_rejected(self) -> None:
        # A CTE that itself has no FROM is the same loophole one level deeper.
        sql = "WITH t AS (SELECT 1 AS x) SELECT * FROM t"
        result = validate(sql, self.schema)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.error, "no_table_reference")

    def test_cannot_answer_sentinel_passes(self) -> None:
        sql = "SELECT 'cannot_answer' AS reason FROM analytics LIMIT 0"
        result = validate(sql, self.schema)
        self.assertTrue(result.is_valid, result.error)

    def test_cte_with_unknown_inner_table_still_rejected(self) -> None:
        sql = "WITH t AS (SELECT * FROM users) SELECT * FROM t"
        result = validate(sql, self.schema)
        self.assertFalse(result.is_valid)
        self.assertIn("unknown_table", result.error or "")


if __name__ == "__main__":
    unittest.main()
