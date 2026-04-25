"use client";

import { BarFill } from "@/components/comparison/bar-fill";
import { CountUp } from "@/components/comparison/count-up";
import { DeltaBadge } from "@/components/comparison/delta-badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  baselineValue: number;
  optimizedValue: number;
  formatNumber?: (n: number) => string;
  unit?: string;
  delta: string;
  improved: boolean;
  /** Lower-is-better (default true). Drives bar colors. */
  lowerIsBetter?: boolean;
  /** Render baseline value as the "untracked" label and hide its bar. */
  baselineUntracked?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  baselineValue,
  optimizedValue,
  formatNumber,
  unit,
  delta,
  improved,
  baselineUntracked = false,
  className,
}: MetricCardProps) {
  const max = Math.max(baselineValue, optimizedValue) || 1;
  const baselineTarget = baselineUntracked ? 0 : baselineValue / max;
  const optimizedTarget = optimizedValue / max;

  const baseLabel = formatNumber
    ? formatNumber(baselineValue)
    : Math.round(baselineValue).toLocaleString();

  return (
    <Card
      className={cn(
        "shadow-none border border-border rounded-[10px] gap-3 p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="label-mono truncate min-w-0">{label}</span>
        <DeltaBadge
          value={delta}
          improved={improved}
          size="sm"
          className="shrink-0"
        />
      </div>

      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="num-l text-foreground">
          <CountUp
            value={optimizedValue}
            decimals={
              optimizedValue < 100 && optimizedValue % 1 !== 0 ? 2 : 0
            }
          />
          {unit ? (
            <span className="text-[var(--ink-dim)] text-sm font-mono ml-1">
              {unit}
            </span>
          ) : null}
        </span>
        {baselineUntracked ? (
          <span className="num-s text-[var(--ink-dim)] italic font-normal">
            baseline untracked
          </span>
        ) : (
          <span className="num-s text-[var(--ink-dim)] line-through decoration-[var(--ink-dim)]/40">
            {baseLabel}
            {unit ? <span className="ml-0.5">{unit}</span> : null}
          </span>
        )}
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[var(--ink-dim)] w-3">
            b
          </span>
          <BarFill
            target={baselineTarget}
            variant="baseline"
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[var(--accent-mint)] w-3">
            o
          </span>
          <BarFill
            target={optimizedTarget}
            variant="optimized"
            delayMs={120}
            className="flex-1"
          />
        </div>
      </div>
    </Card>
  );
}
