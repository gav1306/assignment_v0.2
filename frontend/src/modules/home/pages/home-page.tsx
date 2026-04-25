"use client";

import { CountUp } from "@/components/comparison/count-up";
import { Reveal } from "@/components/comparison/reveal";
import { SectionHead } from "@/components/comparison/section-head";
import {
  OPTIMIZATIONS,
  OptimizationCard,
} from "@/components/pipeline/optimization-card";
import {
  PIPELINE_NODES,
  PipelineDiagram,
} from "@/components/pipeline/pipeline-diagram";
import {
  MetricsPanel,
  MetricsPanelEmpty,
} from "@/modules/home/components/metrics-panel";
import { PipelineColumn } from "@/modules/home/components/pipeline-column";
import { QueriesSplit } from "@/modules/home/components/queries-split";
import { QueryInput } from "@/modules/home/components/query-input";
import { StagesSplit } from "@/modules/home/components/stages-split";
import { usePipelineStream } from "@/modules/home/hooks/use-pipeline-stream";
import { summarize } from "@/modules/home/utils/aggregate";
import { useConfig } from "@/modules/config/hooks/use-config";
import { useHistory } from "@/modules/history/hooks/use-history";
import { useRunStore } from "@/stores/run-store";
import { formatDeltaPct, formatTokens } from "@/utils/format";

export function HomePage() {
  const baseline = usePipelineStream("baseline");
  const optimized = usePipelineStream("optimized");
  const currentQuestion = useRunStore((s) => s.question);
  const startRun = useRunStore((s) => s.startRun);
  const { data: historyPage } = useHistory(50);
  const { data: config } = useConfig();
  const historyRows = historyPage?.runs;
  const summary = summarize(historyRows);
  const modelLabel = config?.model ? config.model.split("/").pop() : null;

  const isRunning =
    baseline.state === "streaming" ||
    baseline.state === "connecting" ||
    optimized.state === "streaming" ||
    optimized.state === "connecting";

  const hasFinal = Boolean(baseline.final && optimized.final);

  function onSubmit(question: string) {
    const { question: q, runId } = startRun(question);
    baseline.start(q, runId);
    optimized.start(q, runId);
  }

  const headlineLatencyDelta = summary
    ? formatDeltaPct(summary.baselineAvgMs, summary.optimizedAvgMs)
    : null;
  // Tokens are only comparable when *both* sides are tracked. Baseline always
  // reports 0 (preserved C4 bug), so in practice this is false until baseline
  // tracking is wired up — fall back to showing the optimized absolute avg.
  const headlineTokensComparable = Boolean(
    summary && summary.baselineAvgTokens > 0 && summary.optimizedAvgTokens > 0,
  );
  const headlineTokensDelta = headlineTokensComparable
    ? formatDeltaPct(summary!.baselineAvgTokens, summary!.optimizedAvgTokens)
    : null;

  return (
    <div className="flex flex-col gap-[72px]">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <Reveal as="section" className="pt-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-dim)] mb-5">
          §00 · benchmark · live
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-12 items-end">
          <div>
            <h1 className="text-[44px] sm:text-[56px] leading-[0.98] tracking-[-0.03em] font-medium max-w-[820px]">
              Baseline vs{" "}
              <span className="text-[var(--accent-mint)]">Solution</span>.
              <br />
              Side by side.
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
              A live A/B harness for an LLM-driven analytics pipeline. Type a
              natural-language question and watch both pipelines race; the
              optimized one streams stage events live, the frozen baseline
              reports on completion. Color is the spine of the comparison: gray
              on the left, mint on the right, every time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:gap-6 shrink-0">
            <div className="text-right">
              <p className="label-mono mb-1">Δ avg latency</p>
              <p
                className={
                  summary && headlineLatencyDelta
                    ? "num-l text-[var(--accent-mint)] tabular-nums"
                    : "num-l text-[var(--ink-dim)] tabular-nums"
                }
              >
                {summary && headlineLatencyDelta ? headlineLatencyDelta : "—"}
              </p>
              <p className="font-mono text-[11px] text-[var(--ink-dim)] mt-1">
                {summary ? (
                  <>
                    <CountUp value={summary.runs} /> runs
                  </>
                ) : (
                  "no runs yet"
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="label-mono mb-1">
                {headlineTokensComparable ? "Δ avg tokens" : "Avg tokens · opt"}
              </p>
              <p
                className={
                  headlineTokensComparable
                    ? "num-l text-[var(--accent-mint)] tabular-nums"
                    : summary
                      ? "num-l text-foreground tabular-nums"
                      : "num-l text-[var(--ink-dim)] tabular-nums"
                }
              >
                {headlineTokensComparable
                  ? headlineTokensDelta
                  : summary
                    ? formatTokens(summary.optimizedAvgTokens)
                    : "—"}
              </p>
              <p className="font-mono text-[11px] text-[var(--ink-dim)] mt-1">
                {summary && !headlineTokensComparable
                  ? "baseline untracked"
                  : (modelLabel ?? "—")}
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── 00 · Live race against the actual backend ─────────── */}
      <section className="space-y-6">
        <SectionHead
          num="00"
          title="Live race"
          caption={
            isRunning
              ? "streaming"
              : hasFinal
                ? "completed"
                : "awaiting prompt"
          }
        />

        <QueryInput
          disabled={isRunning}
          running={isRunning}
          onSubmit={onSubmit}
        />

        {currentQuestion ? (
          <Reveal>
            <div className="rounded-[10px] border border-border bg-[var(--bg-elev)] px-4 py-3 flex items-start gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-dim)] pt-0.5 shrink-0">
                Q
              </span>
              <p className="text-[14px] text-foreground break-words">
                {currentQuestion}
              </p>
            </div>
          </Reveal>
        ) : null}

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PipelineColumn pipeline="baseline" stream={baseline} />
          <PipelineColumn pipeline="optimized" stream={optimized} />
        </div>
      </section>

      {/* ── 01 · Headline metrics ─────────────────────────────── */}
      <section className="space-y-6">
        <SectionHead
          num="01"
          title="Headline metrics"
          caption={hasFinal ? "latest run" : "awaiting first run"}
        />
        {hasFinal ? (
          <MetricsPanel
            baseline={baseline.final!}
            optimized={optimized.final!}
          />
        ) : (
          <MetricsPanelEmpty summary={summary} />
        )}
      </section>

      {/* ── 02 · StagesSplit — aggregated per-stage ───────────── */}
      <section className="space-y-5">
        <SectionHead
          num="02"
          title="Per-stage breakdown"
          caption={
            summary ? `${summary.runs} runs · avg ms` : "no runs yet"
          }
        />
        <StagesSplit rows={historyRows} />
      </section>

      {/* ── 03 · QueriesSplit — recent runs ───────────────────── */}
      <section className="space-y-5">
        <SectionHead
          num="03"
          title="Per-query comparison"
          caption={summary ? "latest runs" : "no runs yet"}
        />
        <QueriesSplit rows={historyRows} />
      </section>

      {/* ── 04 · PipelineDiagram ──────────────────────────────── */}
      <section className="space-y-5">
        <SectionHead
          num="04"
          title="Optimized architecture"
          caption={`${PIPELINE_NODES.length} nodes · ${PIPELINE_NODES.filter((n) => n.isNew).length} new`}
        />
        <PipelineDiagram />
      </section>

      {/* ── 05 · Optimizations grid ───────────────────────────── */}
      <section className="space-y-5">
        <SectionHead
          num="05"
          title="What changed"
          caption={`${OPTIMIZATIONS.length} optimizations`}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPTIMIZATIONS.map((opt, idx) => (
            <OptimizationCard key={opt.id} opt={opt} index={idx} />
          ))}
        </div>
      </section>
    </div>
  );
}
