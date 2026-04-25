"""Pipeline-level constants: row limits, sentinels, default DB path."""

from __future__ import annotations

from pathlib import Path


_BACKEND_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_DB_PATH: Path = _BACKEND_ROOT / "data" / "gaming_mental_health.sqlite"

EXECUTION_ROW_FETCH_LIMIT: int = 100
ANSWER_EVENT_PREVIEW_CHARS: int = 200

# Sentinel literal embedded by the SQL-generation prompt when the model decides
# the question cannot be answered with the available schema. Detected after
# generation so the pipeline can short-circuit to status="unanswerable" and
# return a deterministic "cannot answer" response without burning an extra LLM
# call on the answer stage.
UNANSWERABLE_SQL_MARKER: str = "'cannot_answer'"
