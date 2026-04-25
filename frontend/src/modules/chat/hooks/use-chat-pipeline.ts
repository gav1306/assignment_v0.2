"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useId, useMemo } from "react";

import { CHAT_API_URL } from "@/modules/chat/utils/constants";

export function useChatPipeline() {
  const transport = useMemo(
    () => new TextStreamChatTransport({ api: CHAT_API_URL }),
    [],
  );
  const chatId = useId();
  return useChat({ transport, id: chatId });
}
