"""SSE routes for /run/optimized and /run/baseline."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from src.constants.stream_constants import SSE_MEDIA_TYPE
from src.controllers.runs_controller import stream_baseline, stream_optimized
from src.validators.input_validator import validate_question_length


router = APIRouter()


@router.get("/run/optimized")
async def run_optimized(
    q: str = Query(..., description="Natural language question"),
    run_id: str = Query(default_factory=lambda: str(uuid4())),
):
    validate_question_length(q)
    return StreamingResponse(stream_optimized(q, run_id), media_type=SSE_MEDIA_TYPE)


@router.get("/run/baseline")
async def run_baseline(
    q: str = Query(..., description="Natural language question"),
    run_id: str = Query(default_factory=lambda: str(uuid4())),
):
    return StreamingResponse(stream_baseline(q, run_id), media_type=SSE_MEDIA_TYPE)
