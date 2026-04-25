"use client";

import { cn } from "@/lib/utils";
import { StageCard } from "@/modules/home/components/stage-card";
import type { PipelineStream } from "@/modules/home/hooks/use-pipeline-stream";
import type {
  PipelineKind,
  RunStatus,
  StageEvent,
  StageName,
} from "@/types";
import { STAGE_ORDER } from "@/types";
import { formatMs, formatTokens } from "@/utils/format";

interface PipelineColumnProps {
  pipeline: PipelineKind;
  stream: PipelineStream;
}

const PIPELINE_LABELS: Record<PipelineKind, string> = {
  baseline: "Baseline",
  optimized: "Solution",
};

const PIPELINE_SUBS: Record<PipelineKind, string> = {
  baseline: "frozen starter (bugs intact)",
  optimized: "optimized · streaming",
};

type HeaderState = RunStatus | "running" | "idle";

const STATE_COLOR: Record<HeaderState, string> = {
  success: "text-[var(--accent-mint)]",
  unanswerable: "text-[var(--warn)]",
  invalid_sql: "text-[var(--bad)]",
  error: "text-[var(--bad)]",
  running: "text-[var(--ink)]",
  idle: "text-[var(--ink-dim)]",
};

function HeaderDot({ state }: { state: HeaderState }) {
  if (state === "running") {
    return (
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inset-0 rounded-full bg-foreground/70 animate-ping" />
        <span className="absolute inset-0 rounded-full bg-foreground/70" />
      </span>
    );
  }
  if (state === "idle") {
    return (
      <span className="inline-block h-2 w-2 rounded-full border border-[var(--ink-dim)]/60" />
    );
  }
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        state === "success"
          ? "bg-[var(--accent-mint)] shadow-[0_0_8px_var(--accent-glow)]"
          : state === "unanswerable"
            ? "bg-[var(--warn)]"
            : "bg-[var(--bad)]",
      )}
    />
  );
}

export function PipelineColumn({ pipeline, stream }: PipelineColumnProps) {
  const eventByStage = new Map<StageName, StageEvent>();
  for (const event of stream.events) {
    if (event.pipeline === pipeline) {
      eventByStage.set(event.stage, event);
    }
  }

  const lastReachedIndex = STAGE_ORDER.findIndex(
    (stage) => !eventByStage.has(stage),
  );
  const expectedRunningIndex = lastReachedIndex === -1 ? -1 : lastReachedIndex;

  const headerState: HeaderState =
    stream.state === "completed" && stream.final
      ? stream.final.status
      : stream.state === "streaming" || stream.state === "connecting"
        ? "running"
        : stream.state === "error"
          ? "error"
          : "idle";

  const headerLabel = headerState.replace("_", " ");
  const isOptimized = pipeline === "optimized";

  return (
    <section
      className={cn(
        "relative rounded-[10px] border border-border bg-[var(--bg-elev)] overflow-hidden flex flex-col",
        isOptimized
          ? "bg-[linear-gradient(to_bottom,oklch(0.88_0.15_165_/_0.04),transparent_40%)] halo-mint"
          : "bg-[linear-gradient(to_bottom,oklch(0.55_0.012_260_/_0.04),transparent_40%)]",
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border/70">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                isOptimized
                  ? "bg-[var(--accent-mint)] shadow-[0_0_8px_var(--accent-glow)]"
                  : "bg-[var(--baseline)]",
              )}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-foreground">
              {PIPELINE_LABELS[pipeline]}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-dim)] truncate">
              · {PIPELINE_SUBS[pipeline]}
            </span>
          </div>
          {stream.final ? (
            <div className="flex items-baseline gap-4 mt-3">
              <span className="num-l text-foreground tabular-nums">
                {formatMs(stream.final.timings.total_ms)}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
                {formatTokens(stream.final.total_llm_stats.total_tokens)} tok ·{" "}
                {stream.final.total_llm_stats.llm_calls} calls
              </span>
            </div>
          ) : (
            <p className="font-mono text-[11px] text-[var(--ink-dim)] mt-3">
              awaiting run…
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 shrink-0",
            STATE_COLOR[headerState],
          )}
        >
          <HeaderDot state={headerState} />
          <span className="font-mono text-[11px] uppercase tracking-[0.06em]">
            {headerLabel}
          </span>
        </div>
      </header>

      <ol className="space-y-2 p-4" aria-live="polite">
        {STAGE_ORDER.map((stage, index) => (
          <li key={stage}>
            <StageCard
              stage={stage}
              pipeline={pipeline}
              event={eventByStage.get(stage) ?? null}
              expectedRunning={
                stream.state !== "idle" &&
                stream.state !== "error" &&
                !eventByStage.has(stage) &&
                index === expectedRunningIndex
              }
              index={index}
            />
          </li>
        ))}
      </ol>

      {stream.error ? (
        <div className="px-5 pb-4">
          <p className="font-mono text-[11px] text-[var(--bad)]">
            stream error: {stream.error}
          </p>
        </div>
      ) : null}

      {stream.final ? (
        <div className="border-t border-border/70 p-5 space-y-3 bg-[var(--bg)]/40">
          <p className="label-mono">Final answer</p>
          <p className="text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">
            {stream.final.answer || "(no answer)"}
          </p>
          {stream.final.sql ? (
            <details className="group">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)] hover:text-foreground transition-colors select-none">
                + show SQL
              </summary>
              <pre className="mt-2 bg-[var(--bg)] border border-border rounded-md p-2.5 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap break-words text-[var(--ink-muted)]">
                {stream.final.sql}
              </pre>
            </details>
          ) : null}
          {stream.final.rows.length > 0 ? (
            <details>
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)] hover:text-foreground transition-colors select-none">
                + show {stream.final.rows.length} row(s)
              </summary>
              <pre className="mt-2 bg-[var(--bg)] border border-border rounded-md p-2.5 text-[11px] leading-relaxed font-mono overflow-x-auto text-[var(--ink-muted)]">
                {JSON.stringify(stream.final.rows.slice(0, 20), null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
