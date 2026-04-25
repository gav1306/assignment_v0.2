"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/modules/history/components/status-badge";
import type { PipelineKind, StoredPipelineOutput } from "@/types";
import { formatMs, formatTokens } from "@/utils/format";

interface RunDetailProps {
  pipeline: PipelineKind;
  output: StoredPipelineOutput | null;
}

const PIPELINE_LABELS: Record<PipelineKind, string> = {
  baseline: "Baseline",
  optimized: "Solution",
};

export function RunDetail({ pipeline, output }: RunDetailProps) {
  const isOptimized = pipeline === "optimized";

  if (!output) {
    return (
      <div className="rounded-[10px] border border-dashed border-border bg-[var(--bg)] p-4 opacity-70">
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
          {PIPELINE_LABELS[pipeline]}
        </p>
        <p className="text-[12px] text-[var(--ink-muted)] mt-1">
          No data persisted for this pipeline.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[10px] border border-border bg-[var(--bg)] p-4 space-y-3",
        isOptimized
          ? "bg-[linear-gradient(to_bottom,oklch(0.88_0.15_165_/_0.04),transparent_60%)]"
          : "bg-[linear-gradient(to_bottom,oklch(0.55_0.012_260_/_0.04),transparent_60%)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              isOptimized
                ? "bg-[var(--accent-mint)] shadow-[0_0_6px_var(--accent-glow)]"
                : "bg-[var(--baseline)]",
            )}
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-foreground">
            {PIPELINE_LABELS[pipeline]}
          </span>
        </div>
        <StatusBadge status={output.status} />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-[var(--ink-muted)]">
        <span className="text-foreground tabular-nums">
          {formatMs(output.timings.total_ms)}
        </span>
        <span>·</span>
        <span>{formatTokens(output.total_llm_stats.total_tokens)} tok</span>
        <span>·</span>
        <span>{output.total_llm_stats.llm_calls} calls</span>
        <span>·</span>
        <span>{output.total_llm_stats.model}</span>
      </div>

      <div>
        <p className="label-mono mb-1.5">Answer</p>
        <p className="text-[12px] whitespace-pre-wrap break-words text-foreground leading-relaxed">
          {output.answer || "(no answer)"}
        </p>
      </div>

      {output.sql ? (
        <div>
          <p className="label-mono mb-1.5">SQL</p>
          <pre className="bg-[var(--bg-elev)] border border-border rounded-md p-2.5 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap break-words text-[var(--ink-muted)]">
            {output.sql}
          </pre>
        </div>
      ) : null}

      {output.rows.length > 0 ? (
        <details>
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)] hover:text-foreground transition-colors select-none">
            + {output.rows.length} row(s)
          </summary>
          <pre className="mt-2 bg-[var(--bg-elev)] border border-border rounded-md p-2.5 text-[11px] leading-relaxed font-mono overflow-x-auto text-[var(--ink-muted)]">
            {JSON.stringify(output.rows.slice(0, 20), null, 2)}
          </pre>
        </details>
      ) : null}

      <details>
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)] hover:text-foreground transition-colors select-none">
          + stage timings
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
          <span className="text-[var(--ink-dim)]">SQL gen</span>
          <span className="text-foreground tabular-nums text-right">
            {formatMs(output.timings.sql_generation_ms)}
          </span>
          <span className="text-[var(--ink-dim)]">Validation</span>
          <span className="text-foreground tabular-nums text-right">
            {formatMs(output.timings.sql_validation_ms)}
          </span>
          <span className="text-[var(--ink-dim)]">Execution</span>
          <span className="text-foreground tabular-nums text-right">
            {formatMs(output.timings.sql_execution_ms)}
          </span>
          <span className="text-[var(--ink-dim)]">Answer gen</span>
          <span className="text-foreground tabular-nums text-right">
            {formatMs(output.timings.answer_generation_ms)}
          </span>
        </div>
      </details>
    </div>
  );
}
