"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { RelativeTime } from "@/modules/history/components/relative-time";
import { RunDetail } from "@/modules/history/components/run-detail";
import { StatusBadge } from "@/modules/history/components/status-badge";
import type { HistoryRow } from "@/types";
import {
  formatMs,
  formatTokens,
  isTokensUntracked,
  UNTRACKED_LABEL,
} from "@/utils/format";

interface SideStatProps {
  variant: "baseline" | "optimized";
  status: string | undefined;
  ms: number | null;
  tokens: number | null;
  tokensUntracked?: boolean;
}

function SideStat({
  variant,
  status,
  ms,
  tokens,
  tokensUntracked,
}: SideStatProps) {
  const isOptimized = variant === "optimized";
  return (
    <div className="text-left sm:text-right space-y-1.5 min-w-0">
      <div className="flex items-center justify-start sm:justify-end gap-1.5">
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full shrink-0",
            isOptimized
              ? "bg-[var(--accent-mint)] shadow-[0_0_6px_var(--accent-glow)]"
              : "bg-[var(--baseline)]",
          )}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
          {isOptimized ? "solution" : "baseline"}
        </span>
      </div>
      <StatusBadge status={status} />
      {ms !== null ? (
        <p className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
          {formatMs(ms)} ·{" "}
          {tokensUntracked ? (
            <span className="text-[var(--ink-dim)] italic">
              {UNTRACKED_LABEL}
            </span>
          ) : tokens !== null ? (
            `${formatTokens(tokens)}t`
          ) : (
            "—"
          )}
        </p>
      ) : null}
    </div>
  );
}

export function HistoryRowCard({ row }: { row: HistoryRow }) {
  const [expanded, setExpanded] = useState(false);
  const b = row.baseline;
  const o = row.optimized;
  const bMs = b?.timings.total_ms ?? 0;
  const oMs = o?.timings.total_ms ?? 0;
  const bTokens = b?.total_llm_stats.total_tokens ?? 0;
  const oTokens = o?.total_llm_stats.total_tokens ?? 0;
  const baselineTokensUntracked = b
    ? isTokensUntracked(b.total_llm_stats, b.timings)
    : false;
  const optimizedTokensUntracked = o
    ? isTokensUntracked(o.total_llm_stats, o.timings)
    : false;

  return (
    <div className="rounded-[10px] border border-border bg-[var(--bg-elev)] overflow-hidden ease-expo-out transition-colors hover:border-[var(--line-strong)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[14px] leading-snug break-words text-foreground">
              {row.question}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[var(--ink-dim)]">
              <RelativeTime iso={row.created_at} />
              <span>·</span>
              <span>{row.id.slice(0, 8)}</span>
              <span
                className={cn(
                  "ml-auto sm:ml-2 transition-transform ease-expo-out duration-200",
                  expanded ? "rotate-90 text-foreground" : "",
                )}
              >
                ›
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:gap-5 sm:shrink-0 pt-3 sm:pt-0 border-t border-border/60 sm:border-t-0">
            <SideStat
              variant="baseline"
              status={b?.status}
              ms={b ? bMs : null}
              tokens={b ? bTokens : null}
              tokensUntracked={baselineTokensUntracked}
            />
            <SideStat
              variant="optimized"
              status={o?.status}
              ms={o ? oMs : null}
              tokens={o ? oTokens : null}
              tokensUntracked={optimizedTokensUntracked}
            />
          </div>
        </div>

      </button>

      {expanded ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-4 border-t border-border/70">
            <RunDetail pipeline="baseline" output={b} />
            <RunDetail pipeline="optimized" output={o} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
