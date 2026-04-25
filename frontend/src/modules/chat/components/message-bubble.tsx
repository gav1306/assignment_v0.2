"use client";

import type { UIMessage } from "ai";

import {
  getMessageText,
  parseAssistantText,
} from "@/modules/chat/utils/parse-assistant-text";

export function MessageBubble({ message }: { message: UIMessage }) {
  const text = getMessageText(message);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap break-words">
          {text}
        </div>
      </div>
    );
  }

  const parsed = parseAssistantText(text);
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-3 text-sm space-y-2">
        {parsed.before && (
          <p className="whitespace-pre-wrap break-words">{parsed.before}</p>
        )}
        {parsed.sql && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:underline select-none">
              How I answered (SQL)
            </summary>
            <pre className="mt-2 bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
              {parsed.sql}
            </pre>
          </details>
        )}
        {parsed.after && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {parsed.after}
          </p>
        )}
      </div>
    </div>
  );
}
