"""Read-only SQLite executor for the analytics dataset.

The executor uses a `mode=ro` URI connection so DML/DDL is rejected even if
the validator missed it. The validator already strips unsafe operations; this
is defense in depth.
"""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

from src.constants.pipeline_constants import (
    DEFAULT_DB_PATH,
    EXECUTION_ROW_FETCH_LIMIT,
)
from src.models.pipeline_models import SQLExecutionOutput


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
