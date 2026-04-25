"""HTTP boundary constants: CORS defaults and shared response settings."""

from __future__ import annotations


DEFAULT_FRONTEND_ORIGINS: tuple[str, ...] = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
)

CORS_ALLOWED_METHODS: tuple[str, ...] = ("GET", "POST")
CORS_ALLOWED_HEADERS: tuple[str, ...] = ("*",)
CORS_EXPOSED_HEADERS: tuple[str, ...] = ("X-Run-Id",)

CORS_ALLOW_ORIGINS_ENV: str = "CORS_ALLOW_ORIGINS"
