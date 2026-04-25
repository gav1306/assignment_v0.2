"""Read-only history endpoints orchestration."""

from __future__ import annotations

from fastapi import HTTPException

from src.database.runs_repository import count_runs, get_run, list_runs


def get_history(limit: int, offset: int = 0) -> dict:
    return {
        "runs": list_runs(limit=limit, offset=offset),
        "total": count_runs(),
        "limit": limit,
        "offset": offset,
    }


def get_run_detail(run_id: str) -> dict:
    row = get_run(run_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"run_id {run_id!r} not found")
    return row
