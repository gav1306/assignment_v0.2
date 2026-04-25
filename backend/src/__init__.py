"""Top-level package init.

Loads `backend/.env` exactly once at import time so any entry point (FastAPI,
benchmarking scripts, tests) sees `OPENROUTER_API_KEY` and friends without
having to import dotenv themselves. The path is resolved from `__file__` so
it loads correctly regardless of the caller's working directory.
"""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv


_BACKEND_ENV = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_BACKEND_ENV)
