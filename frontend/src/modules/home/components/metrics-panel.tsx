"use client";

import { CountUp } from "@/components/comparison/count-up";
import { DeltaBadge } from "@/components/comparison/delta-badge";
import { MetricCard } from "@/components/comparison/metric-card";
import { Reveal } from "@/components/comparison/reveal";
import { SplitCompare } from "@/components/comparison/split-compare";
import type { BenchmarkSummary } from "@/modules/home/utils/aggregate";
import type { RunCompletedEvent } from "@/types";
import {
  deltaIsImprovement,
  formatDeltaPct,
  formatMs,
  formatTokens,
  isTokensUntracked,
  UNTRACKED_LABEL,
} from "@/utils/format";

const DASH = "—";

interface MetricsPanelProps {
  baseline: RunCompletedEvent;
  optimized: RunCompletedEvent;
}

function HeadlineSide({
  variant,
  ms,
  tokens,
  calls,
  status,
  tokensUntracked,
}: {
  variant: "baseline" | "optimized";
  ms: number;
  tokens: number;
  calls: number;
  status: string;
  tokensUntracked: boolean;
}) {
  return (
    <SplitCompare.Side
      variant={variant}
      tag={variant === "optimized" ? "Solution" : "Baseline"}
      sub={variant === "optimized" ? "optimized pipeline" : "reference pipeline"}
    >
      <div className="space-y-5">
        <div>
          <p className="label-mono mb-2">Total latency</p>
          <p
            className={
              variant === "optimized"
                ? "num-xl text-foreground"
                : "num-xl text-[var(--baseline)]"
            }
          >
            <CountUp value={ms} />
            <span className="text-[var(--ink-dim)] text-base font-mono ml-2">
              ms
            </span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/60">
          <div>
            <p className="label-mono mb-1">Tokens</p>
            {tokensUntracked ? (
              <p className="num-s text-[var(--ink-dim)] italic">
                {UNTRACKED_LABEL}
              </p>
            ) : (
              <p className="num-m text-foreground">
                <CountUp value={tokens} />
              </p>
            )}
          </div>
          <div>
            <p className="label-mono mb-1">LLM calls</p>
            <p className="num-m text-foreground">
              <CountUp value={calls} />
            </p>
          </div>
          <div>
            <p className="label-mono mb-1">Status</p>
            <p className="num-s text-foreground capitalize">
              {status.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>
    </SplitCompare.Side>
  );
}

export function MetricsPanel({ baseline, optimized }: MetricsPanelProps) {
  const bMs = baseline.timings.total_ms;
  const oMs = optimized.timings.total_ms;
  const bTokens = baseline.total_llm_stats.total_tokens;
  const oTokens = optimized.total_llm_stats.total_tokens;
  const bCalls = baseline.total_llm_stats.llm_calls;
  const oCalls = optimized.total_llm_stats.llm_calls;
  const baselineTokensUntracked = isTokensUntracked(
    baseline.total_llm_stats,
    baseline.timings,
  );
  const optimizedTokensUntracked = isTokensUntracked(
    optimized.total_llm_stats,
    optimized.timings,
  );
  const tokensComparable =
    !baselineTokensUntracked && !optimizedTokensUntracked;

  const latencyDelta = formatDeltaPct(bMs, oMs);
  const latencyImproved = deltaIsImprovement("latency", bMs, oMs);
  const tokensDelta = tokensComparable
    ? formatDeltaPct(bTokens, oTokens)
    : DASH;
  const tokensImproved = tokensComparable
    ? deltaIsImprovement("tokens", bTokens, oTokens)
    : true;

  return (
    <Reveal as="section" className="space-y-6">
      <SplitCompare
        delta={{
          label: "Δ latency",
          value: latencyDelta,
          improved: latencyImproved,
        }}
      >
        <HeadlineSide
          variant="baseline"
          ms={bMs}
          tokens={bTokens}
          calls={bCalls}
          status={baseline.status}
          tokensUntracked={baselineTokensUntracked}
        />
        <HeadlineSide
          variant="optimized"
          ms={oMs}
          tokens={oTokens}
          calls={oCalls}
          status={optimized.status}
          tokensUntracked={optimizedTokensUntracked}
        />
      </SplitCompare>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Avg latency"
          baselineValue={bMs}
          optimizedValue={oMs}
          formatNumber={formatMs}
          delta={latencyDelta}
          improved={latencyImproved}
        />
        <MetricCard
          label="Total tokens"
          baselineValue={bTokens}
          optimizedValue={oTokens}
          formatNumber={(n) => `${formatTokens(n)}`}
          delta={tokensDelta}
          improved={tokensImproved}
          baselineUntracked={baselineTokensUntracked}
        />
        <MetricCard
          label="LLM calls"
          baselineValue={bCalls}
          optimizedValue={oCalls}
          delta={
            bCalls === oCalls
              ? "—"
              : oCalls < bCalls
                ? `-${bCalls - oCalls}`
                : `+${oCalls - bCalls}`
          }
          improved={oCalls <= bCalls}
        />
        <MetricCard
          label="Answer length"
          baselineValue={baseline.answer.length}
          optimizedValue={optimized.answer.length}
          delta={formatDeltaPct(
            baseline.answer.length || 1,
            optimized.answer.length,
          )}
          improved={
            optimized.answer.length >= (baseline.answer.length || 0)
          }
        />
      </div>

      <p className="text-xs text-[var(--ink-muted)] leading-relaxed max-w-3xl">
        Lower is better for both latency and tokens. The baseline pipeline
        does not implement token counting (the C4 bug preserved from the
        starter for honest A/B comparison) — the LLM calls still happen, the
        usage just isn&apos;t tracked, so percentage deltas against tokens
        aren&apos;t meaningful for now.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {tokensComparable ? (
          <DeltaBadge
            label="Δ tokens"
            value={tokensDelta}
            improved={tokensImproved}
            size="md"
          />
        ) : (
          <TokensSummaryPill optimized={oTokens} />
        )}
      </div>
    </Reveal>
  );
}

interface EmptySideProps {
  variant: "baseline" | "optimized";
  ms: number | null;
  tokens: number | null;
  calls: number | null;
  runs: number | null;
  tokensUntracked?: boolean;
}

function EmptySide({
  variant,
  ms,
  tokens,
  calls,
  runs,
  tokensUntracked,
}: EmptySideProps) {
  const sub =
    runs !== null
      ? `${runs} historical runs · avg`
      : variant === "optimized"
        ? "awaiting first run"
        : "awaiting first run";

  return (
    <SplitCompare.Side
      variant={variant}
      tag={variant === "optimized" ? "Solution" : "Baseline"}
      sub={sub}
    >
      <div className="space-y-5">
        <div>
          <p className="label-mono mb-2">
            {ms !== null ? "Avg latency" : "Total latency"}
          </p>
          <p
            className={
              ms !== null
                ? variant === "optimized"
                  ? "num-xl text-foreground"
                  : "num-xl text-[var(--baseline)]"
                : "num-xl text-[var(--ink-dim)]"
            }
          >
            {ms !== null ? <CountUp value={ms} /> : DASH}
            <span className="text-[var(--ink-dim)] text-base font-mono ml-2">
              ms
            </span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/60">
          <div>
            <p className="label-mono mb-1">Tokens</p>
            {tokensUntracked ? (
              <p className="num-s text-[var(--ink-dim)] italic">
                {UNTRACKED_LABEL}
              </p>
            ) : (
              <p
                className={
                  tokens !== null
                    ? "num-m text-foreground"
                    : "num-m text-[var(--ink-dim)]"
                }
              >
                {tokens !== null ? <CountUp value={tokens} /> : DASH}
              </p>
            )}
          </div>
          <div>
            <p className="label-mono mb-1">LLM calls</p>
            <p
              className={
                calls !== null
                  ? "num-m text-foreground"
                  : "num-m text-[var(--ink-dim)]"
              }
            >
              {calls !== null ? <CountUp value={calls} /> : DASH}
            </p>
          </div>
          <div>
            <p className="label-mono mb-1">Status</p>
            <p className="num-s text-[var(--ink-dim)]">awaiting</p>
          </div>
        </div>
      </div>
    </SplitCompare.Side>
  );
}

interface MetricsPanelEmptyProps {
  summary: BenchmarkSummary | null;
}

export function MetricsPanelEmpty({ summary }: MetricsPanelEmptyProps) {
  const bMs = summary?.baselineAvgMs ?? null;
  const oMs = summary?.optimizedAvgMs ?? null;
  const bTokens = summary?.baselineAvgTokens ?? null;
  const oTokens = summary?.optimizedAvgTokens ?? null;
  const bCalls = summary?.baselineAvgCalls ?? null;
  const oCalls = summary?.optimizedAvgCalls ?? null;
  const runs = summary?.runs ?? null;

  const hasLatency = bMs !== null && oMs !== null && bMs > 0;
  const latencyDelta = hasLatency ? formatDeltaPct(bMs!, oMs!) : DASH;
  const latencyImproved = hasLatency
    ? deltaIsImprovement("latency", bMs!, oMs!)
    : true;

  // Tokens are "untracked" when the baseline made LLM calls but reported 0
  // tokens (the preserved C4 bug). For the historical aggregate we use the
  // average call count > 0 as the same signal: at least one run made a call
  // yet baseline aggregated 0 tokens.
  const baselineTokensUntracked =
    bTokens === 0 && (bCalls ?? 0) > 0;
  const optimizedTokensUntracked =
    oTokens === 0 && (oCalls ?? 0) > 0;
  const hasTokens =
    bTokens !== null &&
    oTokens !== null &&
    bTokens > 0 &&
    !baselineTokensUntracked &&
    !optimizedTokensUntracked;
  const tokensDelta = hasTokens ? formatDeltaPct(bTokens!, oTokens!) : DASH;
  const tokensImproved = hasTokens
    ? deltaIsImprovement("tokens", bTokens!, oTokens!)
    : true;

  const hasCalls = bCalls !== null && oCalls !== null;
  const callsDelta = hasCalls
    ? bCalls === oCalls
      ? DASH
      : oCalls! < bCalls!
        ? `-${bCalls! - oCalls!}`
        : `+${oCalls! - bCalls!}`
    : DASH;
  const callsImproved = hasCalls ? oCalls! <= bCalls! : true;

  return (
    <Reveal as="section" className="space-y-6">
      <SplitCompare
        delta={
          hasLatency
            ? {
                label: "Δ avg latency",
                value: latencyDelta,
                improved: latencyImproved,
              }
            : undefined
        }
      >
        <EmptySide
          variant="baseline"
          ms={bMs}
          tokens={bTokens}
          calls={bCalls}
          runs={runs}
          tokensUntracked={baselineTokensUntracked}
        />
        <EmptySide
          variant="optimized"
          ms={oMs}
          tokens={oTokens}
          calls={oCalls}
          runs={runs}
          tokensUntracked={optimizedTokensUntracked}
        />
      </SplitCompare>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EmptyMetricCard
          label="Avg latency"
          value={oMs}
          formatNumber={formatMs}
          delta={latencyDelta}
          improved={latencyImproved}
        />
        <EmptyMetricCard
          label="Total tokens"
          value={oTokens}
          formatNumber={(n) => formatTokens(n)}
          delta={tokensDelta}
          improved={tokensImproved}
        />
        <EmptyMetricCard
          label="LLM calls"
          value={oCalls}
          delta={callsDelta}
          improved={callsImproved}
        />
        <EmptyMetricCard
          label="Answer length"
          value={null}
          delta={DASH}
          improved
        />
      </div>

      <p className="text-xs text-[var(--ink-muted)] leading-relaxed max-w-3xl">
        {summary
          ? `Aggregated across ${summary.runs} historical runs. Submit a query above and the latest-run snapshot will replace these averages once both pipelines finish.`
          : "No completed runs yet. Submit a query above — once both pipelines finish, headline metrics fill in here."}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {hasTokens ? (
          <DeltaBadge
            label="Δ tokens"
            value={tokensDelta}
            improved={tokensImproved}
            size="md"
          />
        ) : oTokens !== null ? (
          <TokensSummaryPill optimized={oTokens} />
        ) : null}
      </div>
    </Reveal>
  );
}

interface EmptyMetricCardProps {
  label: string;
  value: number | null;
  formatNumber?: (n: number) => string;
  delta: string;
  improved: boolean;
}

function EmptyMetricCard({
  label,
  value,
  formatNumber,
  delta,
  improved,
}: EmptyMetricCardProps) {
  const display =
    value !== null
      ? formatNumber
        ? formatNumber(value)
        : Math.round(value).toLocaleString()
      : DASH;

  return (
    <div className="rounded-[10px] border border-dashed border-border bg-[var(--bg-elev)] p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span className="label-mono truncate min-w-0">{label}</span>
        <DeltaBadge
          value={delta}
          improved={improved}
          size="sm"
          className="shrink-0"
        />
      </div>
      <p
        className={
          value !== null
            ? "num-l text-foreground tabular-nums"
            : "num-l text-[var(--ink-dim)] tabular-nums"
        }
      >
        {display}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
        {value !== null ? "historical avg" : "awaiting first run"}
      </p>
    </div>
  );
}

function TokensSummaryPill({ optimized }: { optimized: number }) {
  return (
    <span className="inline-flex items-stretch h-7 rounded-full border border-border bg-[var(--bg-elev)] overflow-hidden font-mono text-[11px]">
      <span className="flex items-center gap-1.5 px-3 border-r border-border">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-mint)] shadow-[0_0_6px_var(--accent-glow)]" />
        <span className="uppercase tracking-[0.06em] text-[var(--ink-dim)]">
          opt tokens
        </span>
        <span className="tabular-nums text-foreground">
          {formatTokens(optimized)}
        </span>
      </span>
      <span className="flex items-center gap-1.5 px-3">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--baseline)]" />
        <span className="uppercase tracking-[0.06em] text-[var(--ink-dim)]">
          baseline
        </span>
        <span className="text-[var(--ink-dim)]">untracked</span>
      </span>
    </span>
  );
}
