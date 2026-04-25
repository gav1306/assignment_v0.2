"""HTTP routes for /history and /runs/{run_id}."""

from __future__ import annotations

from fastapi import APIRouter, Query

from src.controllers.history_controller import get_history, get_run_detail


router = APIRouter()


@router.get("/history")
def list_history(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    return get_history(limit=limit, offset=offset)


@router.get("/runs/{run_id}")
def fetch_run(run_id: str) -> dict:
    return get_run_detail(run_id)
