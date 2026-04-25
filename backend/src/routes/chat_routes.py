"""HTTP route for /chat (multi-turn chat backed by the optimized pipeline)."""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from src.controllers.chat_controller import handle_chat


router = APIRouter()


@router.post("/chat")
async def chat(request: Request) -> StreamingResponse:
    body = await request.json()
    return await handle_chat(body)
