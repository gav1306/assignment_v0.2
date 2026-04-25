"""Read-only /config endpoint exposing runtime constants (e.g. configured model)
so the frontend can display them without hardcoding."""

from __future__ import annotations

import os

from fastapi import APIRouter

from src.constants.llm_constants import DEFAULT_MODEL, ENV_OPENROUTER_MODEL


router = APIRouter()


@router.get("/config")
def get_config() -> dict[str, str]:
    return {
        "model": os.getenv(ENV_OPENROUTER_MODEL, DEFAULT_MODEL),
    }
