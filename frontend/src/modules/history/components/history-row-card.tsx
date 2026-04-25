"use client";

import { useState } from "react";

import { DeltaBadge } from "@/components/comparison/delta-badge";
import { cn } from "@/lib/utils";
import { RelativeTime } from "@/modules/history/components/relative-time";
import { RunDetail } from "@/modules/history/components/run-detail";
import { StatusBadge } from "@/modules/history/components/status-badge";
import type { HistoryRow } from "@/types";
import {
  deltaIsImprovement,
  formatDeltaPct,
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
    <div className="text-right space-y-1.5">
      <div className="flex items-center justify-end gap-1.5">
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
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
  const tokensComparable = !baselineTokensUntracked && !optimizedTokensUntracked;

  return (
    <div className="rounded-[10px] border border-border bg-[var(--bg-elev)] overflow-hidden ease-expo-out transition-colors hover:border-[var(--line-strong)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-5"
      >
        <div className="flex items-start justify-between gap-6">
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
          <div className="grid grid-cols-2 gap-5 shrink-0">
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

        {b && o ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DeltaBadge
              label="Δ latency"
              value={formatDeltaPct(bMs, oMs)}
              improved={deltaIsImprovement("latency", bMs, oMs)}
              size="sm"
            />
            {tokensComparable ? (
              <DeltaBadge
                label="Δ tokens"
                value={formatDeltaPct(bTokens, oTokens)}
                improved={deltaIsImprovement("tokens", bTokens, oTokens)}
                size="sm"
              />
            ) : !optimizedTokensUntracked && oTokens > 0 ? (
              <span
                title={`baseline ${UNTRACKED_LABEL} — comparable Δ unavailable`}
                className="inline-flex items-center gap-1.5 h-6 rounded-full border border-[var(--accent-mint)]/30 bg-[var(--accent-mint)]/10 px-2.5 font-mono text-[11px] text-[var(--accent-mint)]"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-mint)] shadow-[0_0_6px_var(--accent-glow)]" />
                <span className="uppercase tracking-[0.06em] text-[var(--ink-dim)]">
                  tokens
                </span>
                <span className="tabular-nums">{formatTokens(oTokens)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 h-6 rounded-full border border-border bg-[var(--bg-elev)] px-2.5 font-mono text-[11px] text-[var(--ink-dim)]">
                <span className="uppercase tracking-[0.06em]">tokens</span>
                <span className="italic">{UNTRACKED_LABEL}</span>
              </span>
            )}
          </div>
        ) : null}
      </button>

      {expanded ? (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-4 border-t border-border/70">
            <RunDetail pipeline="baseline" output={b} />
            <RunDetail pipeline="optimized" output={o} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
