"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Reveal } from "@/components/comparison/reveal";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { aggregateStages } from "@/modules/home/utils/aggregate";
import type { HistoryRow } from "@/types";
import { formatDeltaPct, formatMs } from "@/utils/format";

interface StagesSplitProps {
  rows: HistoryRow[] | undefined;
}

const chartConfig = {
  baseline: {
    label: "Baseline",
    color: "var(--baseline)",
  },
  optimized: {
    label: "Solution",
    color: "var(--accent-mint)",
  },
} satisfies ChartConfig;

export function StagesSplit({ rows }: StagesSplitProps) {
  const stages = aggregateStages(rows);
  if (stages.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-border bg-[var(--bg-elev)] p-10 text-center">
        <p className="font-mono text-[12px] text-[var(--ink-muted)]">
          No runs yet. Trigger one above to populate per-stage timings.
        </p>
      </div>
    );
  }

  return (
    <Reveal as="div" className="rounded-[10px] border border-border bg-[var(--bg-elev)] p-5 lg:p-6 space-y-5">
      <div className="space-y-1">
        <p className="label-mono">avg latency by stage</p>
        <p className="font-mono text-[11px] text-[var(--ink-dim)]">
          aggregated from {rows?.length ?? 0} historical runs · lower is better
        </p>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-[16/8] max-h-[280px] w-full"
      >
        <BarChart data={stages} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v) => `${v}ms`}
            width={48}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-[var(--ink-muted)]">
                      {name === "baseline" ? "Baseline" : "Solution"}
                    </span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatMs(Number(value))}
                    </span>
                  </div>
                )}
                indicator="dot"
              />
            }
            cursor={{ fill: "var(--bg-elev-2)" }}
          />
          <Bar
            dataKey="baseline"
            fill="var(--color-baseline)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="optimized"
            fill="var(--color-optimized)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ChartContainer>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/70">
        {stages.map((s) => {
          const delta = formatDeltaPct(s.baseline, s.optimized);
          const improved = s.optimized < s.baseline;
          return (
            <div
              key={s.key}
              className="rounded-md border border-border bg-[var(--bg)] p-3"
            >
              <p className="label-mono mb-2">{s.label}</p>
              <div className="flex items-baseline justify-between gap-2">
                <span className="num-s text-foreground tabular-nums">
                  {formatMs(s.optimized)}
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-dim)] line-through tabular-nums">
                  {formatMs(s.baseline)}
                </span>
              </div>
              <p
                className="mt-1 font-mono text-[11px] tabular-nums"
                style={{
                  color: improved ? "var(--accent-mint)" : "var(--bad)",
                }}
              >
                {delta}
              </p>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}
