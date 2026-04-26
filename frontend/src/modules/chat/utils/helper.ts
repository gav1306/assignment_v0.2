import type { UIMessage } from "ai";

export interface ParsedAnswer {
  before: string;
  sql: string | null;
  after: string;
}

const SQL_FENCE_RE = /```sql\n([\s\S]*?)```/;

export function parseAssistantText(text: string): ParsedAnswer {
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

export function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}
