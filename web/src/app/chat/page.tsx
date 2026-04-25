"use client";

import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const SAMPLE_FOLLOWUPS = [
  "What is the addiction level distribution by gender?",
  "What about males specifically?",
  "Can you sort by anxiety score instead?",
  "Now show only respondents under 25.",
];

interface ParsedAnswer {
  before: string;
  sql: string | null;
  after: string;
}

const SQL_FENCE_RE = /```sql\n([\s\S]*?)```/;

function parseAssistantText(text: string): ParsedAnswer {
  const match = text.match(SQL_FENCE_RE);
  if (!match) {
    return { before: text, sql: null, after: "" };
  }
  return {
    before: text.slice(0, match.index ?? 0).trimEnd(),
    sql: match[1].trim(),
    after: text.slice((match.index ?? 0) + match[0].length).trimStart(),
  };
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

function MessageBubble({ message }: { message: UIMessage }) {
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

export default function ChatPage() {
  const transport = useMemo(
    () => new TextStreamChatTransport({ api: "/api/chat" }),
    [],
  );
  // useId returns a hydration-stable string so useChat doesn't auto-generate
  // a different random id on server vs client (which mismatches on hydration).
  const chatId = useId();
  const { messages, sendMessage, status, error } = useChat({ transport, id: chatId });
  const [input, setInput] = useState("");

  const isStreaming = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    void sendMessage({ text: trimmed });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Multi-turn Chat</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask follow-up questions in natural language. Each turn rewrites the
          message into a standalone question using prior context, then runs
          the optimized pipeline. Click "How I answered" on any reply to see
          the SQL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Try a sample below or type your own question.
            </p>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground animate-pulse">
                thinking…
              </div>
            </div>
          )}
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {error.message}
            </p>
          )}
        </CardContent>
      </Card>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="flex gap-2"
      >
        <Input
          placeholder={
            messages.length === 0
              ? "Ask a question to start the conversation..."
              : "Ask a follow-up..."
          }
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isStreaming}
          className="flex-1"
        />
        <Button type="submit" disabled={isStreaming || !input.trim()}>
          Send
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <span className="text-muted-foreground text-xs uppercase tracking-wide self-center">
          Sample turn flow:
        </span>
        {SAMPLE_FOLLOWUPS.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => submit(sample)}
            disabled={isStreaming}
            className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
          >
            {sample}
          </button>
        ))}
      </div>
    </div>
  );
}
