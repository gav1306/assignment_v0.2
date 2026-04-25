"use client";

import { BarFill } from "@/components/comparison/bar-fill";
import { formatMs, formatTokens } from "@/utils/format";

interface ComparisonChartProps {
  baselineMs: number;
  optimizedMs: number;
  baselineTokens: number;
  optimizedTokens: number;
}

interface RowProps {
  label: string;
  baselineValue: number;
  optimizedValue: number;
  baselineDisplay: string;
  optimizedDisplay: string;
  delayMs: number;
}

function Row({
  label,
  baselineValue,
  optimizedValue,
  baselineDisplay,
  optimizedDisplay,
  delayMs,
}: RowProps) {
  const max = Math.max(baselineValue, optimizedValue) || 1;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-mono">{label}</span>
        <span className="font-mono text-[11px] text-[var(--ink-dim)]">
          lower = better
        </span>
      </div>

      <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
          baseline
        </span>
        <BarFill
          target={baselineValue / max}
          variant="baseline"
          delayMs={delayMs}
        />
        <span className="num-s text-[var(--ink-muted)]">
          {baselineDisplay}
        </span>
      </div>
      <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--accent-mint)]">
          optimized
        </span>
        <BarFill
          target={optimizedValue / max}
          variant="optimized"
          delayMs={delayMs + 120}
        />
        <span className="num-s text-foreground">{optimizedDisplay}</span>
      </div>
    </div>
  );
}

export function ComparisonChart({
  baselineMs,
  optimizedMs,
  baselineTokens,
  optimizedTokens,
}: ComparisonChartProps) {
  return (
    <div className="space-y-6">
      <Row
        label="Latency"
        baselineValue={baselineMs}
        optimizedValue={optimizedMs}
        baselineDisplay={formatMs(baselineMs)}
        optimizedDisplay={formatMs(optimizedMs)}
        delayMs={0}
      />
      <Row
        label="Tokens"
        baselineValue={baselineTokens}
        optimizedValue={optimizedTokens}
        baselineDisplay={`${formatTokens(baselineTokens)}t`}
        optimizedDisplay={`${formatTokens(optimizedTokens)}t`}
        delayMs={120}
      />
    </div>
  );
}
