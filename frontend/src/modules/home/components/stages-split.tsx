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
import { formatMs } from "@/utils/format";

interface StagesSplitProps {
  rows: HistoryRow[] | undefined;
}

const chartConfig = {
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

  const baselineRunsCounted = (rows ?? []).filter((r) => r.baseline).length;
  const baselineSucceeded = (rows ?? []).filter(
    (r) => r.baseline?.status === "success",
  ).length;

  return (
    <Reveal as="div" className="rounded-[10px] border border-border bg-[var(--bg-elev)] p-5 lg:p-6 space-y-5">
      <div className="space-y-1">
        <p className="label-mono">latency by stage</p>
        <p className="font-mono text-[11px] text-[var(--ink-dim)]">
          optimized · per-stage latency · across {rows?.length ?? 0} runs
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
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-[var(--ink-muted)]">Solution</span>
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
            dataKey="optimized"
            fill="var(--color-optimized)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ChartContainer>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/70">
        {stages.map((s) => (
          <div
            key={s.key}
            className="rounded-md border border-border bg-[var(--bg)] p-3"
          >
            <p className="label-mono mb-2">{s.label}</p>
            <p className="num-s text-foreground tabular-nums">
              {formatMs(s.optimized)}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
              optimized · across all runs
            </p>
          </div>
        ))}
      </div>

      <p className="font-mono text-[11px] text-[var(--ink-dim)] pt-2 border-t border-border/70">
        baseline: {baselineSucceeded} / {baselineRunsCounted} runs succeeded ·
        per-stage timings omitted
      </p>
    </Reveal>
  );
}
