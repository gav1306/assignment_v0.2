"""Immutable representations of a SQLite table's structure.

Populated by `database.schema_introspection.load_schema` and consumed by the
SQL validator + SQL-generation prompt builder.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ColumnInfo:
    name: str
    type: str
    nullable: bool


@dataclass(frozen=True)
class SchemaContext:
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
