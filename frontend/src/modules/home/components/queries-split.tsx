"use client";

import { BarFill } from "@/components/comparison/bar-fill";
import { DeltaBadge } from "@/components/comparison/delta-badge";
import { Reveal } from "@/components/comparison/reveal";
import { aggregateQueries } from "@/modules/home/utils/aggregate";
import type { HistoryRow } from "@/types";
import {
  deltaIsImprovement,
  formatDeltaPct,
  formatMs,
} from "@/utils/format";

interface QueriesSplitProps {
  rows: HistoryRow[] | undefined;
}

export function QueriesSplit({ rows }: QueriesSplitProps) {
  const queries = aggregateQueries(rows, 6);
  if (queries.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-border bg-[var(--bg-elev)] p-10 text-center">
        <p className="font-mono text-[12px] text-[var(--ink-muted)]">
          No runs yet. Trigger one above to populate per-query comparisons.
        </p>
      </div>
    );
  }

  // shared scale across all queries for fair comparison
  const max =
    queries.reduce((m, q) => {
      const a = q.baselineMs ?? 0;
      const b = q.optimizedMs ?? 0;
      return Math.max(m, a, b);
    }, 0) || 1;

  return (
    <div className="rounded-[10px] border border-border bg-[var(--bg-elev)] overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-border bg-[var(--bg-elev-2)]/30">
        <span className="label-mono">question</span>
        <span className="label-mono text-right hidden sm:block">baseline</span>
        <span className="label-mono text-right">solution · Δ</span>
      </div>

      <ul className="divide-y divide-border">
        {queries.map((q, idx) => {
          const bMs = q.baselineMs ?? 0;
          const oMs = q.optimizedMs ?? 0;
          const delta = formatDeltaPct(bMs || 1, oMs);
          const improved = deltaIsImprovement("latency", bMs || 1, oMs);
          return (
            <Reveal key={q.id} delayMs={Math.min(idx * 40, 240)} as="li">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr] gap-4 px-5 py-4 ease-expo-out hover:bg-[var(--bg-elev-2)]/40 transition-colors">
                <p className="text-[13px] text-foreground leading-snug truncate">
                  {q.question}
                </p>

                <div className="space-y-1.5 sm:text-right">
                  <p className="num-s text-[var(--ink-muted)] tabular-nums">
                    {q.baselineMs !== null ? formatMs(bMs) : "—"}
                  </p>
                  <BarFill
                    target={bMs / max}
                    variant="baseline"
                    delayMs={idx * 40}
                  />
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="num-s text-foreground tabular-nums">
                      {q.optimizedMs !== null ? formatMs(oMs) : "—"}
                    </span>
                    {q.baselineMs !== null && q.optimizedMs !== null ? (
                      <DeltaBadge
                        value={delta}
                        improved={improved}
                        size="sm"
                      />
                    ) : null}
                  </div>
                  <BarFill
                    target={oMs / max}
                    variant="optimized"
                    delayMs={idx * 40 + 120}
                  />
                </div>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </div>
  );
}
