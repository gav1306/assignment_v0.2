"""FastAPI app for the analytics-pipeline A/B comparison harness."""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.constants.http_constants import (
    CORS_ALLOW_ORIGINS_ENV,
    CORS_ALLOWED_HEADERS,
    CORS_ALLOWED_METHODS,
    CORS_EXPOSED_HEADERS,
    DEFAULT_FRONTEND_ORIGINS,
)
from src.database.runs_repository import init_db
from src.lib.observability import configure_logging
from src.routes import chat_routes, history_routes, runs_routes


def _allowed_origins() -> list[str]:
    raw = os.getenv(CORS_ALLOW_ORIGINS_ENV)
    if not raw:
        return list(DEFAULT_FRONTEND_ORIGINS)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


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
        allow_methods=list(CORS_ALLOWED_METHODS),
        allow_headers=list(CORS_ALLOWED_HEADERS),
        expose_headers=list(CORS_EXPOSED_HEADERS),
    )

    app.include_router(runs_routes.router, tags=["runs"])
    app.include_router(history_routes.router, tags=["history"])
    app.include_router(chat_routes.router, tags=["chat"])

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
