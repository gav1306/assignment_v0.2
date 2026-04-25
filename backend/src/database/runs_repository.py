"""SQLite-backed history of pipeline runs.

Each row holds the full PipelineOutput for both the baseline and optimized
pipelines under a shared run_id, written incrementally as each pipeline
finishes. The frontend issues both /run/baseline and /run/optimized with the
same run_id; whichever finishes first inserts the row and the other updates
its column.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal


_BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH: Path = _BACKEND_ROOT / "data" / "runs.sqlite"

PipelineKind = Literal["baseline", "optimized"]


_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    created_at TEXT NOT NULL,
    baseline_json TEXT,
    optimized_json TEXT
);
CREATE INDEX IF NOT EXISTS runs_created_at_idx ON runs(created_at DESC);
"""


def _connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path = DEFAULT_DB_PATH) -> None:
    with _connect(db_path) as conn:
        conn.executescript(_SCHEMA)


def _serialize_pipeline_output(output: Any) -> str:
    if is_dataclass(output):
        return json.dumps(asdict(output), default=str)
    return json.dumps(output, default=str)


def save_run(
    run_id: str,
    question: str,
    pipeline: PipelineKind,
    output: Any,
    db_path: Path = DEFAULT_DB_PATH,
) -> None:
    """Upsert a single pipeline's result into the run row."""

    column = "baseline_json" if pipeline == "baseline" else "optimized_json"
    payload = _serialize_pipeline_output(output)
    created_at = datetime.now(timezone.utc).isoformat()

    sql = (
        "INSERT INTO runs (id, question, created_at, "
        f"{column}) VALUES (?, ?, ?, ?) "
        f"ON CONFLICT(id) DO UPDATE SET {column} = excluded.{column}"
    )

    with _connect(db_path) as conn:
        conn.execute(sql, (run_id, question, created_at, payload))


def list_runs(limit: int = 50, db_path: Path = DEFAULT_DB_PATH) -> list[dict]:
    with _connect(db_path) as conn:
        cur = conn.execute(
            "SELECT id, question, created_at, baseline_json, optimized_json "
            "FROM runs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        return [_row_to_dict(row) for row in cur.fetchall()]


def get_run(run_id: str, db_path: Path = DEFAULT_DB_PATH) -> dict | None:
    with _connect(db_path) as conn:
        cur = conn.execute(
            "SELECT id, question, created_at, baseline_json, optimized_json "
            "FROM runs WHERE id = ?",
            (run_id,),
        )
        row = cur.fetchone()
        return _row_to_dict(row) if row else None


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "question": row["question"],
        "created_at": row["created_at"],
        "baseline": json.loads(row["baseline_json"]) if row["baseline_json"] else None,
        "optimized": json.loads(row["optimized_json"]) if row["optimized_json"] else None,
    }
