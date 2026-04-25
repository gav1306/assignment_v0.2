"""SQLite schema introspection for grounding LLM SQL generation.

Loads column metadata via PRAGMA and samples low-cardinality TEXT columns so
the LLM has concrete categorical values to reference (e.g. gender values,
addiction buckets) instead of guessing. Cached per (db_path, table) since the
underlying schema does not change at runtime.
"""

from __future__ import annotations

import sqlite3
from functools import lru_cache
from pathlib import Path

from src.constants.schema_constants import (
    DEFAULT_TABLE,
    MAX_DISTINCT_VALUES,
    SAMPLE_ROW_LIMIT,
)
from src.models.schema_models import ColumnInfo, SchemaContext, SchemaError


def _connect_readonly(db_path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)


def _load_columns(conn: sqlite3.Connection, table: str) -> tuple[ColumnInfo, ...]:
    cur = conn.execute(f'PRAGMA table_info("{table}")')
    rows = cur.fetchall()
    return tuple(
        ColumnInfo(name=row[1], type=(row[2] or "TEXT").upper(), nullable=not bool(row[3]))
        for row in rows
    )


def _sample_categoricals(
    conn: sqlite3.Connection,
    table: str,
    columns: tuple[ColumnInfo, ...],
) -> tuple[tuple[str, tuple[str, ...]], ...]:
    text_columns = [c for c in columns if c.type == "TEXT"]
    samples: list[tuple[str, tuple[str, ...]]] = []

    for column in text_columns:
        cur = conn.execute(
            f'SELECT DISTINCT "{column.name}" '
            f'FROM (SELECT "{column.name}" FROM "{table}" LIMIT ?)',
            (SAMPLE_ROW_LIMIT,),
        )
        values = [row[0] for row in cur.fetchall() if row[0] is not None]
        if 0 < len(values) <= MAX_DISTINCT_VALUES:
            samples.append((column.name, tuple(str(v) for v in values)))

    return tuple(samples)


@lru_cache(maxsize=4)
def load_schema(db_path: str | Path, table: str = DEFAULT_TABLE) -> SchemaContext:
    resolved = Path(db_path)
    if not resolved.exists():
        raise SchemaError(f"Database not found: {resolved}")

    with _connect_readonly(resolved) as conn:
        columns = _load_columns(conn, table)
        if not columns:
            raise SchemaError(f"Table {table!r} not found in {resolved}")
        categorical_samples = _sample_categoricals(conn, table, columns)

    return SchemaContext(table=table, columns=columns, categorical_samples=categorical_samples)
