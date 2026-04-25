"""Schema introspection + SQL validation constants."""

from __future__ import annotations


DEFAULT_TABLE: str = "gaming_mental_health"

# Sampling bounds keep introspection fast on a 10M-row table.
SAMPLE_ROW_LIMIT: int = 10_000
MAX_DISTINCT_VALUES: int = 50

DEFAULT_ROW_LIMIT: int = 1000
