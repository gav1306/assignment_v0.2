"""Read-only history endpoints backed by SQLite (server.storage)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from server.storage import get_run, list_runs


router = APIRouter()


@router.get("/history")
def list_history(limit: int = Query(50, ge=1, le=500)) -> dict:
    return {"runs": list_runs(limit=limit)}


@router.get("/runs/{run_id}")
def fetch_run(run_id: str) -> dict:
    row = get_run(run_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"run_id {run_id!r} not found")
    return row
