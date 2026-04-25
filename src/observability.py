"""Structured JSON logging built on stdlib `logging`.

Every log record renders as one JSON line on stderr with reserved metadata
(level, logger, msg, exception) plus any `extra={...}` fields provided by the
caller. No third-party dependencies — production observability without bloat.

Configuration is opt-in: call `configure_logging()` once from the application
entry point (CLI, FastAPI startup, tests). Until then, library code that uses
`get_logger()` follows Python's default behavior — silent unless the host
application has its own handler attached.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from typing import Any


DEFAULT_LOG_LEVEL = "INFO"
LOG_LEVEL_ENV = "LOG_LEVEL"


_RESERVED_LOG_RECORD_FIELDS: frozenset[str] = frozenset(
    {
        "args", "asctime", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelname", "levelno", "lineno", "module", "msecs",
        "message", "msg", "name", "pathname", "process", "processName",
        "relativeCreated", "stack_info", "thread", "threadName", "taskName",
    }
)


class JsonFormatter(logging.Formatter):
    """Renders a LogRecord as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        for key, value in record.__dict__.items():
            if key in _RESERVED_LOG_RECORD_FIELDS or key.startswith("_"):
                continue
            payload[key] = value
        return json.dumps(payload, default=str)


_configured = False


def configure_logging(level: str | None = None) -> None:
    """Install the JSON formatter on the root logger. Idempotent."""

    global _configured
    if _configured:
        return

    target_level = (level or os.getenv(LOG_LEVEL_ENV) or DEFAULT_LOG_LEVEL).upper()

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(target_level)

    _configured = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
