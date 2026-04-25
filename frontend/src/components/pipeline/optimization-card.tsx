"use client";

import { Reveal } from "@/components/comparison/reveal";
import { cn } from "@/lib/utils";

export type Optimization = {
  id: string;
  title: string;
  category: string;
  body: string;
  impact: string;
};

export const OPTIMIZATIONS: Optimization[] = [
  {
    id: "validator",
    title: "AST-based SQL validator",
    category: "Validation",
    body: "sqlglot parses every generated query before execution: SELECT-only, no DDL/DML, table allowlist enforced. The baseline executes whatever the LLM emits.",
    impact: "blocks unsafe SQL pre-execution",
  },
  {
    id: "schema_aware",
    title: "Schema-aware prompting",
    category: "Prompt",
    body: "The system prompt is built from live schema introspection (typed columns plus sample value distributions) so the model is constrained by the actual table shape instead of guessing.",
    impact: "fewer column hallucinations",
  },
  {
    id: "streaming",
    title: "Live SSE per stage",
    category: "Runtime",
    body: "The optimized pipeline emits an SSE frame for every stage transition (running → completed/failed/skipped) with elapsed_ms and token usage. The baseline is a black box — its events are synthesized after the run completes.",
    impact: "4 live stage frames per run",
  },
  {
    id: "token_tracking",
    title: "Token accounting fixed",
    category: "Observability",
    body: "Baseline reports 0 tokens because the counter was never wired up — the C4 bug we deliberately preserve. The optimized client reads usage off every response and aggregates per pipeline run.",
    impact: "honest per-run token bill",
  },
  {
    id: "sqlite_runner",
    title: "Read-only SQLite runner",
    category: "Runtime",
    body: "Schema introspection and query execution open SQLite in URI read-only mode (file:…?mode=ro). The baseline opens the DB read-write on every call.",
    impact: "no destructive blast radius",
  },
  {
    id: "retry_timeouts",
    title: "Bounded retries + timeouts",
    category: "Runtime",
    body: "The optimized LLM client has explicit timeouts and bounded exponential-backoff retries (capped elapsed time). The baseline relies on the SDK's defaults.",
    impact: "deterministic worst-case",
  },
  {
    id: "structured_logs",
    title: "Structured JSON logs",
    category: "Observability",
    body: "Every log record is a single-line JSON document on stderr (level, logger, msg, plus any extra fields). Easy to ship to a log pipeline; no print-debugging.",
    impact: "machine-parseable diagnostics",
  },
  {
    id: "answer_grounded",
    title: "Grounded answer step",
    category: "Prompt",
    body: "The answer-generation prompt is given the executed rows verbatim and is instructed to use only those rows — no extrapolation beyond what the SQL returned.",
    impact: "answers stay inside the data",
  },
];

interface OptimizationCardProps {
  opt: Optimization;
  index: number;
}

export function OptimizationCard({ opt, index }: OptimizationCardProps) {
  return (
    <Reveal delayMs={(index % 2) * 60}>
      <article
        className={cn(
          "group relative rounded-[10px] border border-border bg-[var(--bg-elev)] p-5 ease-expo-out transition-colors",
          "hover:border-[var(--line-strong)] hover:bg-[var(--bg-elev-2)]/50",
        )}
      >
        <span
          aria-hidden
          className="absolute left-0 top-4 bottom-4 w-[2px] origin-bottom scale-y-0 bg-[var(--accent-mint)] ease-expo-out transition-transform duration-500 group-hover:scale-y-100"
        />
        <header className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[14px] font-medium text-foreground leading-snug">
            {opt.title}
          </h3>
          <span className="shrink-0 rounded-full border border-border bg-[var(--bg)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
            {opt.category}
          </span>
        </header>
        <p className="text-[13px] text-[var(--ink-muted)] leading-[1.55]">
          {opt.body}
        </p>
        <footer className="mt-4 pt-3 border-t border-border/70">
          <span className="font-mono text-[12px] text-[var(--accent-mint)]">
            {opt.impact}
          </span>
        </footer>
      </article>
    </Reveal>
  );
}
