"use client";

import { CountUp } from "@/components/comparison/count-up";
import { DeltaBadge } from "@/components/comparison/delta-badge";
import { Reveal } from "@/components/comparison/reveal";
import { SplitCompare } from "@/components/comparison/split-compare";
import type { BenchmarkSummary } from "@/modules/home/utils/aggregate";
import type { RunCompletedEvent } from "@/types";
import { isTokensUntracked, UNTRACKED_LABEL } from "@/utils/format";

const DASH = "—";

interface MetricsPanelProps {
  baseline: RunCompletedEvent;
  optimized: RunCompletedEvent;
}

interface CellProps {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}

function Cell({ label, value, muted = false }: CellProps) {
  return (
    <div>
      <p className="label-mono mb-1">{label}</p>
      <p
        className={
          muted ? "num-m text-[var(--ink-dim)]" : "num-m text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

interface OptimizedSideProps {
  ms: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  calls: number;
  status: string;
  tokensUntracked: boolean;
}

function OptimizedSide({
  ms,
  promptTokens,
  completionTokens,
  totalTokens,
  calls,
  status,
  tokensUntracked,
}: OptimizedSideProps) {
  return (
    <SplitCompare.Side
      variant="optimized"
      tag="Solution"
      sub="optimized pipeline"
    >
      <div className="space-y-5">
        <div>
          <p className="label-mono mb-2">Latency</p>
          <p className="num-xl text-foreground">
            <CountUp value={ms} />
            <span className="text-[var(--ink-dim)] text-base font-mono ml-2">
              ms
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/60">
          <Cell
            label="Prompt tokens"
            value={
              tokensUntracked ? (
                <span className="italic text-[var(--ink-dim)]">
                  {UNTRACKED_LABEL}
                </span>
              ) : (
                <CountUp value={promptTokens} />
              )
            }
          />
          <Cell
            label="Completion tokens"
            value={
              tokensUntracked ? (
                <span className="italic text-[var(--ink-dim)]">
                  {UNTRACKED_LABEL}
                </span>
              ) : (
                <CountUp value={completionTokens} />
              )
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/60">
          <Cell
            label="Total tokens"
            value={
              tokensUntracked ? (
                <span className="italic text-[var(--ink-dim)] text-sm">
                  {UNTRACKED_LABEL}
                </span>
              ) : (
                <CountUp value={totalTokens} />
              )
            }
          />
          <Cell label="LLM calls" value={<CountUp value={calls} />} />
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

interface BaselineSideProps {
  ms: number | null;
  status: string | null;
  tokensUntracked: boolean;
  totalTokens: number | null;
  calls: number | null;
}

function BaselineSide({
  ms,
  status,
  tokensUntracked,
  totalTokens,
  calls,
}: BaselineSideProps) {
  const failed = status !== null && status !== "success";
  const stateLabel = status === null ? "awaiting" : failed ? "failed" : "success";

  return (
    <SplitCompare.Side
      variant="baseline"
      tag="Baseline"
      sub="reference pipeline"
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-mono mb-2">Latency</p>
            <p className="num-xl text-[var(--ink-dim)]">
              {ms !== null ? <CountUp value={ms} /> : DASH}
              <span className="text-[var(--ink-dim)] text-base font-mono ml-2">
                ms
              </span>
            </p>
          </div>
          <DeltaBadge
            value={stateLabel}
            intent="neutral"
            size="sm"
            className="mt-7"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/60">
          <Cell
            label="Tokens"
            value={
              tokensUntracked ? (
                <span className="italic text-[var(--ink-dim)] text-sm">
                  {UNTRACKED_LABEL}
                </span>
              ) : totalTokens !== null ? (
                <CountUp value={totalTokens} />
              ) : (
                DASH
              )
            }
            muted
          />
          <Cell
            label="LLM calls"
            value={calls !== null ? <CountUp value={calls} /> : DASH}
            muted
          />
          <div>
            <p className="label-mono mb-1">Status</p>
            <p className="num-s text-[var(--ink-dim)] capitalize">
              {status === null ? "awaiting" : status.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>
    </SplitCompare.Side>
  );
}

export function MetricsPanel({ baseline, optimized }: MetricsPanelProps) {
  const optimizedTokensUntracked = isTokensUntracked(
    optimized.total_llm_stats,
    optimized.timings,
  );
  const baselineTokensUntracked = isTokensUntracked(
    baseline.total_llm_stats,
    baseline.timings,
  );

  return (
    <Reveal as="section" className="space-y-4">
      <SplitCompare>
        <BaselineSide
          ms={baseline.timings.total_ms}
          status={baseline.status}
          tokensUntracked={baselineTokensUntracked}
          totalTokens={baseline.total_llm_stats.total_tokens}
          calls={baseline.total_llm_stats.llm_calls}
        />
        <OptimizedSide
          ms={optimized.timings.total_ms}
          promptTokens={optimized.total_llm_stats.prompt_tokens}
          completionTokens={optimized.total_llm_stats.completion_tokens}
          totalTokens={optimized.total_llm_stats.total_tokens}
          calls={optimized.total_llm_stats.llm_calls}
          status={optimized.status}
          tokensUntracked={optimizedTokensUntracked}
        />
      </SplitCompare>

      <p className="text-xs text-[var(--ink-muted)] leading-relaxed max-w-3xl">
        Solution numbers in mint. Baseline is shown for context only; it never
        completes a successful run because of the preserved C1 bug, so
        per-pipeline numbers are not directly comparable.
      </p>
    </Reveal>
  );
}

interface MetricsPanelEmptyProps {
  summary: BenchmarkSummary | null;
}

function PlaceholderSide({
  variant,
}: {
  variant: "baseline" | "optimized";
}) {
  const isOptimized = variant === "optimized";
  return (
    <SplitCompare.Side
      variant={variant}
      tag={isOptimized ? "Solution" : "Baseline"}
      sub="awaiting first run"
    >
      <div className="space-y-5">
        <div>
          <p className="label-mono mb-2">Latency</p>
          <p className="num-xl text-[var(--ink-dim)]">
            {DASH}
            <span className="text-[var(--ink-dim)] text-base font-mono ml-2">
              ms
            </span>
          </p>
        </div>

        {isOptimized ? (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <Cell label="Prompt tokens" value={DASH} />
            <Cell label="Completion tokens" value={DASH} />
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/60">
          <Cell label={isOptimized ? "Total tokens" : "Tokens"} value={DASH} muted={!isOptimized} />
          <Cell label="LLM calls" value={DASH} muted={!isOptimized} />
          <div>
            <p className="label-mono mb-1">Status</p>
            <p className="num-s text-[var(--ink-dim)]">awaiting</p>
          </div>
        </div>
      </div>
    </SplitCompare.Side>
  );
}

export function MetricsPanelEmpty({ summary }: MetricsPanelEmptyProps) {
  return (
    <Reveal as="section" className="space-y-4">
      <SplitCompare>
        <PlaceholderSide variant="baseline" />
        <PlaceholderSide variant="optimized" />
      </SplitCompare>

      <p className="text-xs text-[var(--ink-muted)] leading-relaxed max-w-3xl">
        {summary
          ? "Submit a new question to populate this card. Historical aggregates (success rate, p50, p95, token split) live in §02 below."
          : "No completed runs yet. Submit a question above and the latest-run snapshot will fill in here."}
      </p>
    </Reveal>
  );
}
