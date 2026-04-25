"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonChart } from "@/modules/home/components/comparison-chart";
import type { RunCompletedEvent } from "@/types";
import {
  deltaIsImprovement,
  formatDeltaPct,
  formatMs,
  formatTokens,
} from "@/utils/format";

interface MetricsPanelProps {
  baseline: RunCompletedEvent;
  optimized: RunCompletedEvent;
}

interface MetricRowProps {
  label: string;
  baselineDisplay: string;
  optimizedDisplay: string;
  delta: string;
  improved: boolean;
}

function MetricRow({
  label,
  baselineDisplay,
  optimizedDisplay,
  delta,
  improved,
}: MetricRowProps) {
  return (
    <div className="grid grid-cols-4 gap-4 items-baseline py-2 border-b last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{baselineDisplay}</span>
      <span className="text-sm">{optimizedDisplay}</span>
      <span
        className={`text-xs font-mono ${
          improved
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {delta}
      </span>
    </div>
  );
}

export function MetricsPanel({ baseline, optimized }: MetricsPanelProps) {
  const bMs = baseline.timings.total_ms;
  const oMs = optimized.timings.total_ms;
  const bTokens = baseline.total_llm_stats.total_tokens;
  const oTokens = optimized.total_llm_stats.total_tokens;

  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B comparison</CardTitle>
        <p className="text-xs text-muted-foreground">
          Lower is better for both latency and tokens. Baseline often reports 0
          tokens because its token-counting logic is unimplemented (the C4 bug
          we deliberately preserved) — the call still happens, the cost just
          isn&apos;t tracked.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4 text-xs uppercase tracking-wide text-muted-foreground border-b pb-2">
          <span>Metric</span>
          <span>Baseline</span>
          <span>Optimized</span>
          <span>Delta</span>
        </div>

        <div>
          <MetricRow
            label="Status"
            baselineDisplay={baseline.status}
            optimizedDisplay={optimized.status}
            delta={baseline.status === optimized.status ? "—" : "different"}
            improved={
              optimized.status === "success" && baseline.status !== "success"
            }
          />
          <MetricRow
            label="Total latency"
            baselineDisplay={formatMs(bMs)}
            optimizedDisplay={formatMs(oMs)}
            delta={formatDeltaPct(bMs, oMs)}
            improved={deltaIsImprovement("latency", bMs, oMs)}
          />
          <MetricRow
            label="Total tokens"
            baselineDisplay={formatTokens(bTokens)}
            optimizedDisplay={formatTokens(oTokens)}
            delta={formatDeltaPct(bTokens, oTokens)}
            improved={deltaIsImprovement("tokens", bTokens, oTokens)}
          />
          <MetricRow
            label="LLM calls"
            baselineDisplay={String(baseline.total_llm_stats.llm_calls)}
            optimizedDisplay={String(optimized.total_llm_stats.llm_calls)}
            delta="—"
            improved={false}
          />
        </div>

        <ComparisonChart
          baselineMs={bMs}
          optimizedMs={oMs}
          baselineTokens={bTokens}
          optimizedTokens={oTokens}
        />
      </CardContent>
    </Card>
  );
}
