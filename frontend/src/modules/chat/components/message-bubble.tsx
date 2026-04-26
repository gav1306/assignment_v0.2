"use client";

import type { UIMessage } from "ai";

import {
  getMessageText,
  parseAssistantText,
} from "@/modules/chat/utils/helper";

export function MessageBubble({ message }: { message: UIMessage }) {
  const text = getMessageText(message);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[10px] bg-[var(--accent-mint)]/12 border border-[var(--accent-mint)]/30 text-foreground px-4 py-2.5 text-[13px] whitespace-pre-wrap break-words shadow-[0_0_0_1px_var(--accent-glow)]">
          {text}
        </div>
      </div>
    );
  }

  const parsed = parseAssistantText(text);
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-[10px] bg-[var(--bg-elev)] border border-border px-4 py-3 text-[13px] space-y-2.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--baseline)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
            assistant
          </span>
        </div>
        {parsed.before ? (
          <p className="whitespace-pre-wrap break-words text-foreground leading-relaxed">
            {parsed.before}
          </p>
        ) : null}
        {parsed.sql ? (
          <details className="group">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)] hover:text-foreground transition-colors select-none">
              + how I answered (SQL)
            </summary>
            <pre className="mt-2 bg-[var(--bg)] border border-border rounded-md p-2.5 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap break-words text-[var(--ink-muted)]">
              {parsed.sql}
            </pre>
          </details>
        ) : null}
        {parsed.after ? (
          <p className="text-[12px] text-[var(--ink-muted)] whitespace-pre-wrap break-words">
            {parsed.after}
          </p>
        ) : null}
      </div>
    </div>
  );
}
