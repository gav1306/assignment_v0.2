"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  success:
    "bg-[var(--accent-mint)]/10 text-[var(--accent-mint)] border-[var(--accent-mint)]/30",
  unanswerable:
    "bg-[var(--warn)]/10 text-[var(--warn)] border-[var(--warn)]/30",
  invalid_sql: "bg-[var(--bad)]/10 text-[var(--bad)] border-[var(--bad)]/30",
  error: "bg-[var(--bad)]/10 text-[var(--bad)] border-[var(--bad)]/30",
};

export function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full border border-border px-2 h-5 text-[10px] font-mono uppercase tracking-[0.06em] text-[var(--ink-dim)]">
        —
      </span>
    );
  }
  const cls = STATUS_STYLES[status] ?? "border-border text-[var(--ink-muted)]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 h-5 text-[10px] font-mono uppercase tracking-[0.06em]",
        cls,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
