"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { RelativeTime } from "@/modules/history/components/relative-time";
import { RunDetail } from "@/modules/history/components/run-detail";
import { StatusBadge } from "@/modules/history/components/status-badge";
import type { HistoryRow } from "@/types";
import {
  deltaIsImprovement,
  formatDeltaPct,
  formatMs,
  formatTokens,
} from "@/utils/format";

export function HistoryRowCard({ row }: { row: HistoryRow }) {
  const [expanded, setExpanded] = useState(false);
  const b = row.baseline;
  const o = row.optimized;
  const bMs = b?.timings.total_ms ?? 0;
  const oMs = o?.timings.total_ms ?? 0;
  const bTokens = b?.total_llm_stats.total_tokens ?? 0;
  const oTokens = o?.total_llm_stats.total_tokens ?? 0;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 hover:bg-accent/40 transition-colors rounded-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium leading-tight break-words">
              {row.question}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <RelativeTime iso={row.created_at} />
              <span className="font-mono">{row.id.slice(0, 8)}…</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs shrink-0">
            <div className="text-right space-y-1">
              <p className="text-muted-foreground uppercase tracking-wide">
                Baseline
              </p>
              <StatusBadge status={b?.status} />
              {b && (
                <p className="text-muted-foreground">
                  {formatMs(bMs)} · {formatTokens(bTokens)}t
                </p>
              )}
            </div>
            <div className="text-right space-y-1">
              <p className="text-muted-foreground uppercase tracking-wide">
                Optimized
              </p>
              <StatusBadge status={o?.status} />
              {o && (
                <p className="text-muted-foreground">
                  {formatMs(oMs)} · {formatTokens(oTokens)}t
                </p>
              )}
            </div>
          </div>
        </div>

        {b && o && (
          <div className="mt-3 flex gap-4 text-xs">
            <span
              className={`font-mono ${
                deltaIsImprovement("latency", bMs, oMs)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              latency {formatDeltaPct(bMs, oMs)}
            </span>
            <span
              className={`font-mono ${
                deltaIsImprovement("tokens", bTokens, oTokens)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              tokens {formatDeltaPct(bTokens, oTokens)}
            </span>
          </div>
        )}
      </button>

      {expanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <RunDetail pipeline="baseline" output={b} />
            <RunDetail pipeline="optimized" output={o} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
