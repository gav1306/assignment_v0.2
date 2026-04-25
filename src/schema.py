"""SQLite schema introspection for grounding LLM SQL generation.

Loads column metadata via PRAGMA and samples low-cardinality TEXT columns so the
LLM has concrete categorical values to reference (e.g. gender values, addiction
buckets) instead of guessing. Cached per (db_path, table) — the underlying schema
does not change at runtime.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any


DEFAULT_TABLE = "gaming_mental_health"

# Sampling bounds — keep introspection fast on a 10M-row table.
SAMPLE_ROW_LIMIT = 10_000
MAX_DISTINCT_VALUES = 50


@dataclass(frozen=True)
class ColumnInfo:
    name: str
    type: str
    nullable: bool


@dataclass(frozen=True)
class SchemaContext:
    """Immutable snapshot of a single table's structure plus categorical hints."""

    table: str
    columns: tuple[ColumnInfo, ...]
    categorical_samples: tuple[tuple[str, tuple[str, ...]], ...]

    @property
    def column_names(self) -> tuple[str, ...]:
        return tuple(c.name for c in self.columns)

    def to_prompt_dict(self) -> dict[str, Any]:
        return {
            "table": self.table,
            "columns": [{"name": c.name, "type": c.type} for c in self.columns],
            "categorical_values": {col: list(values) for col, values in self.categorical_samples},
        }


class SchemaError(Exception):
    """Raised when schema introspection fails or the requested table is missing."""


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
