"""Pydantic schemas for the AI SDK v5 chat transport.

The AI SDK sends both `parts` (v5) and a legacy `content` shape; the schema is
intentionally permissive (extra fields allowed) so we don't reject upstream
additions.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessagePart(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str
    text: str | None = None


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="allow")

    role: Literal["user", "assistant", "system"]
    parts: list[ChatMessagePart] | None = None
    content: str | None = None


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    messages: list[ChatMessage] = Field(default_factory=list)
    metadata: dict[str, Any] | None = None
