"""FastAPI app for the analytics-pipeline A/B comparison harness."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.observability import configure_logging

from server.routes import chat, history, runs
from server.storage import init_db


_DEFAULT_FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def _allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOW_ORIGINS")
    if not raw:
        return list(_DEFAULT_FRONTEND_ORIGINS)
    return [o.strip() for o in raw.split(",") if o.strip()]


def create_app() -> FastAPI:
    configure_logging()
    init_db()

    app = FastAPI(
        title="Analytics Pipeline Comparison",
        version="0.1.0",
        description=(
            "Side-by-side A/B comparison of baseline and optimized analytics "
            "pipelines via Server-Sent Events."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
        expose_headers=["X-Run-Id"],
    )

    app.include_router(runs.router, tags=["runs"])
    app.include_router(history.router, tags=["history"])
    app.include_router(chat.router, tags=["chat"])

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
