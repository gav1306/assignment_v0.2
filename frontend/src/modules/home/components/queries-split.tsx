"use client";

import { BarFill } from "@/components/comparison/bar-fill";
import { DeltaBadge } from "@/components/comparison/delta-badge";
import { Reveal } from "@/components/comparison/reveal";
import { aggregateQueries } from "@/modules/home/utils/aggregate";
import type { HistoryRow } from "@/types";
import { formatMs } from "@/utils/format";

interface QueriesSplitProps {
  rows: HistoryRow[] | undefined;
}

export function QueriesSplit({ rows }: QueriesSplitProps) {
  const queries = aggregateQueries(rows, 6);
  if (queries.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-border bg-[var(--bg-elev)] p-10 text-center">
        <p className="font-mono text-[12px] text-[var(--ink-muted)]">
          No runs yet. Trigger one above to populate per-query results.
        </p>
      </div>
    );
  }

  // Shared scale across optimized rows so bar widths are visually comparable
  // run-to-run (no longer mixes baseline values into the max).
  const max =
    queries.reduce((m, q) => Math.max(m, q.optimizedMs ?? 0), 0) || 1;

  return (
    <div className="rounded-[10px] border border-border bg-[var(--bg-elev)] overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_1fr] gap-4 px-5 py-3 border-b border-border bg-[var(--bg-elev-2)]/30">
        <span className="label-mono">question</span>
        <span className="label-mono text-right hidden sm:block">baseline</span>
        <span className="label-mono text-right">solution</span>
      </div>

      <ul className="divide-y divide-border">
        {queries.map((q, idx) => {
          const oMs = q.optimizedMs ?? 0;
          const optimizedSucceeded = q.optimizedStatus === "success";
          const baselineFailed =
            q.baselineStatus !== null && q.baselineStatus !== "success";

          return (
            <Reveal key={q.id} delayMs={Math.min(idx * 40, 240)} as="li">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 px-5 py-4 ease-expo-out hover:bg-[var(--bg-elev-2)]/40 transition-colors">
                <p className="text-[13px] text-foreground leading-snug truncate">
                  {q.question}
                </p>

                <div className="flex justify-end items-center sm:min-w-[120px]">
                  {q.baselineStatus === null ? (
                    <span className="font-mono text-[11px] text-[var(--ink-dim)]">
                      —
                    </span>
                  ) : baselineFailed ? (
                    <DeltaBadge
                      value="failed"
                      intent="neutral"
                      size="sm"
                    />
                  ) : (
                    <span className="num-s text-[var(--ink-dim)] tabular-nums">
                      {q.baselineMs !== null ? formatMs(q.baselineMs) : "—"}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <p
                    className={
                      optimizedSucceeded
                        ? "num-s text-foreground tabular-nums"
                        : "num-s text-[var(--ink-dim)] tabular-nums"
                    }
                  >
                    {q.optimizedMs !== null ? formatMs(oMs) : "—"}
                  </p>
                  {q.optimizedMs !== null ? (
                    <BarFill
                      target={oMs / max}
                      variant="optimized"
                      delayMs={idx * 40 + 120}
                    />
                  ) : null}
                </div>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </div>
  );
}
