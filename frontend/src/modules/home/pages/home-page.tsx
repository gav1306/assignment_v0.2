"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { CountUp } from "@/components/comparison/count-up";
import { Reveal } from "@/components/comparison/reveal";
import { SectionHead } from "@/components/comparison/section-head";
import { OptimizationCard } from "@/components/pipeline/optimization-card";
import { PipelineDiagram } from "@/components/pipeline/pipeline-diagram";
import {
  OPTIMIZATIONS,
  PIPELINE_NODES,
  PUBLIC_TESTS_PASSING,
  PUBLIC_TESTS_TOTAL,
} from "@/utils/const";
import {
  MetricsPanel,
  MetricsPanelEmpty,
} from "@/modules/home/components/metrics-panel";
import { PipelineColumn } from "@/modules/home/components/pipeline-column";
import { QueriesSplit } from "@/modules/home/components/queries-split";
import { QueryInput } from "@/modules/home/components/query-input";
import { SolutionStats } from "@/modules/home/components/solution-stats";
import { StagesSplit } from "@/modules/home/components/stages-split";
import { usePipelineStream } from "@/modules/home/hooks/use-pipeline-stream";
import { summarize } from "@/modules/home/utils/aggregate";
import { useConfig } from "@/modules/config/hooks/use-config";
import { useHistory } from "@/modules/history/hooks/use-history";
import { useRunStore } from "@/stores/run-store";
import { historyQueryKeys } from "@/utils/query-keys";

export function HomePage() {
  const queryClient = useQueryClient();
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

  // Refresh history (and the averages derived from it) once both pipelines
  // report the same run_id. Dedupe per run_id so re-renders don't refetch.
  const lastInvalidatedRunId = useRef<string | null>(null);
  const baselineRunId = baseline.final?.run_id ?? null;
  const optimizedRunId = optimized.final?.run_id ?? null;
  useEffect(() => {
    if (
      baselineRunId &&
      optimizedRunId &&
      baselineRunId === optimizedRunId &&
      lastInvalidatedRunId.current !== baselineRunId
    ) {
      lastInvalidatedRunId.current = baselineRunId;
      queryClient.invalidateQueries({ queryKey: historyQueryKeys.all });
    }
  }, [baselineRunId, optimizedRunId, queryClient]);

  function onSubmit(question: string) {
    const { question: q, runId } = startRun(question);
    baseline.start(q, runId);
    optimized.start(q, runId);
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <Reveal
        as="section"
        className="min-h-[calc(100vh-15rem)] flex flex-col"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--accent-mint)] mb-5 flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block h-[2px] w-8 bg-[var(--accent-mint)]"
          />
          10M-row dataset · production-grade rewrite
        </p>

        <div className="flex-1 flex items-center">
          <div className="grid w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-10 lg:gap-14 items-end">
            <div>
              <h1 className="text-[44px] sm:text-[64px] lg:text-[80px] leading-[0.98] tracking-[-0.03em] font-medium max-w-[760px]">
                Baseline vs
                <br />
                <span className="text-[var(--accent-mint)]">Solution.</span>
                <br />
                Side by side.
              </h1>
              <p className="mt-10 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
                Every metric below shows the reference baseline on the left
                and the optimized pipeline on the right. Measured on the
                10M-row gaming mental-health dataset.
              </p>
            </div>

            <div className="grid grid-cols-2 rounded-[12px] border border-border bg-[var(--bg-elev)] overflow-hidden divide-x divide-border shrink-0 self-end w-full max-w-[460px] lg:w-[460px]">
              <div className="p-5 sm:p-6">
                <p className="label-mono mb-3">Success rate</p>
                <p
                  className={
                    summary
                      ? "text-[44px] leading-none font-mono font-medium tracking-[-0.02em] text-[var(--accent-mint)] tabular-nums"
                      : "text-[44px] leading-none font-mono font-medium tracking-[-0.02em] text-[var(--ink-dim)] tabular-nums"
                  }
                >
                  {summary ? (
                    <>
                      <CountUp
                        value={summary.optimizedSuccessPct}
                        decimals={1}
                        durationMs={1400}
                      />
                      <span className="text-2xl text-[var(--ink-dim)] ml-1">
                        %
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="font-mono text-[10px] text-[var(--ink-muted)] mt-3 tabular-nums">
                  {summary ? (
                    <>
                      <CountUp value={summary.optimizedSuccessfulRuns} />
                      {" / "}
                      <CountUp value={summary.runs} /> runs succeeded
                    </>
                  ) : (
                    "no runs yet"
                  )}
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <p className="label-mono mb-3">Public tests</p>
                <p className="text-[44px] leading-none font-mono font-medium tracking-[-0.02em] text-[var(--accent-mint)] tabular-nums">
                  <CountUp value={PUBLIC_TESTS_PASSING} durationMs={1400} />
                  <span className="text-2xl text-[var(--ink-dim)] font-mono ml-1.5">
                    / {PUBLIC_TESTS_TOTAL}
                  </span>
                </p>
                <p className="font-mono text-[10px] text-[var(--ink-muted)] mt-3">
                  {modelLabel
                    ? `tests/test_public.py · ${modelLabel}`
                    : "tests/test_public.py"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* §00 · Live race */}
      <section className="space-y-6">
        <SectionHead
          num="00"
          title="Try it live — watch both pipelines race"
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

      {/* §01 · Headline metrics */}
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

      {/* §02 · Solution stats */}
      <section className="space-y-6">
        <SectionHead
          num="02"
          title="Solution stats"
          caption={
            summary ? `${summary.runs} runs · solution only` : "awaiting first run"
          }
        />
        <SolutionStats summary={summary} />
      </section>

      {/* §03 · Per-stage breakdown */}
      <section className="space-y-5">
        <SectionHead
          num="03"
          title="Per-stage breakdown"
          caption={summary ? `${summary.runs} runs` : "no runs yet"}
        />
        <StagesSplit rows={historyRows} />
      </section>

      {/* §04 · Per-query results */}
      <section className="space-y-5">
        <SectionHead
          num="04"
          title="Per-query results"
          caption={summary ? "latest runs" : "no runs yet"}
        />
        <QueriesSplit rows={historyRows} />
      </section>

      {/* §05 · Optimized architecture */}
      <section className="space-y-5">
        <SectionHead
          num="05"
          title="Optimized architecture"
          caption={`${PIPELINE_NODES.length} nodes · ${PIPELINE_NODES.filter((n) => n.isNew).length} new`}
        />
        <PipelineDiagram />
      </section>

      {/* §06 · What changed */}
      <section className="space-y-5">
        <SectionHead
          num="06"
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
