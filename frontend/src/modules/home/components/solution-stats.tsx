"use client";

import { CountUp } from "@/components/comparison/count-up";
import { Reveal } from "@/components/comparison/reveal";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BenchmarkSummary } from "@/modules/home/utils/aggregate";
import { PUBLIC_TESTS_PASSING, PUBLIC_TESTS_TOTAL } from "@/utils/const";
import { formatMs, formatTokens } from "@/utils/format";

const DASH = "—";

interface SolutionStatsProps {
  summary: BenchmarkSummary | null;
}

interface TileProps {
  label: string;
  value: React.ReactNode;
  subtitle: string;
  accent?: boolean;
  delayMs?: number;
}

function Tile({ label, value, subtitle, accent = false, delayMs = 0 }: TileProps) {
  return (
    <Reveal delayMs={delayMs}>
      <Card className="shadow-none border border-border rounded-[10px] gap-2 p-5 h-full">
        <span className="label-mono">{label}</span>
        <p
          className={cn(
            "num-l tabular-nums",
            accent ? "text-[var(--accent-mint)]" : "text-foreground",
          )}
        >
          {value}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
          {subtitle}
        </p>
      </Card>
    </Reveal>
  );
}

export function SolutionStats({ summary }: SolutionStatsProps) {
  const runs = summary?.runs ?? null;
  const successPct = summary?.optimizedSuccessPct ?? null;
  const successfulRuns = summary?.optimizedSuccessfulRuns ?? null;
  const p50 = summary?.optimizedP50Ms ?? null;
  const p95 = summary?.optimizedP95Ms ?? null;
  const promptAvg = summary?.optimizedAvgPromptTokens ?? null;
  const completionAvg = summary?.optimizedAvgCompletionTokens ?? null;
  const callsSaved = summary?.shortCircuitSavedCalls ?? null;

  const acrossRunsLabel =
    runs !== null ? `optimized · across ${runs} runs` : "awaiting first run";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Tile
        label="Success rate"
        value={
          successPct !== null && runs !== null ? (
            <>
              <CountUp value={successPct} decimals={1} />
              <span className="text-[var(--ink-dim)] text-base font-mono ml-1">
                %
              </span>
            </>
          ) : (
            DASH
          )
        }
        subtitle={
          successfulRuns !== null && runs !== null
            ? `${successfulRuns} / ${runs} runs succeeded`
            : "awaiting first run"
        }
        accent
        delayMs={0}
      />
      <Tile
        label="Public tests"
        value={
          <>
            <CountUp value={PUBLIC_TESTS_PASSING} />
            <span className="text-[var(--ink-dim)] text-base font-mono ml-1">
              / {PUBLIC_TESTS_TOTAL}
            </span>
          </>
        }
        subtitle="tests/test_public.py"
        accent
        delayMs={60}
      />
      <Tile
        label="Calls saved"
        value={
          callsSaved !== null ? <CountUp value={callsSaved} /> : DASH
        }
        subtitle="unanswerable short-circuit"
        delayMs={120}
      />
      <Tile
        label="p50 latency"
        value={p50 !== null ? formatMs(p50) : DASH}
        subtitle={acrossRunsLabel}
        delayMs={180}
      />
      <Tile
        label="p95 latency"
        value={p95 !== null ? formatMs(p95) : DASH}
        subtitle={acrossRunsLabel}
        delayMs={240}
      />
      <Tile
        label="Token split"
        value={
          promptAvg !== null && completionAvg !== null ? (
            <>
              <span className="tabular-nums">{formatTokens(promptAvg)}</span>
              <span className="text-[var(--ink-dim)] text-base font-mono mx-1.5">
                /
              </span>
              <span className="tabular-nums">{formatTokens(completionAvg)}</span>
            </>
          ) : (
            DASH
          )
        }
        subtitle="prompt / completion · per run"
        delayMs={300}
      />
    </div>
  );
}
