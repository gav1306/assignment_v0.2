export type PipelineNodeSpec = {
  id: string;
  kind: "input" | "llm" | "db" | "work" | "output";
  title: string;
  sub: string;
  /** Highlight the node as new vs the baseline. */
  isNew?: boolean;
};

export const PIPELINE_NODES: PipelineNodeSpec[] = [
  { id: "prompt", kind: "input", title: "Prompt", sub: "user · NL question" },
  {
    id: "rewrite",
    kind: "work",
    title: "Rewrite",
    sub: "standalone · multi-turn",
    isNew: true,
  },
  { id: "sql_gen", kind: "llm", title: "SQL Gen", sub: "schema-aware" },
  {
    id: "validate",
    kind: "work",
    title: "Validate",
    sub: "AST · allowlist",
    isNew: true,
  },
  { id: "execute", kind: "db", title: "Execute", sub: "SQLite · read-only" },
  { id: "answer", kind: "llm", title: "Answer", sub: "rows → grounded" },
];

export const PIPELINE_KIND_LABEL: Record<PipelineNodeSpec["kind"], string> = {
  input: "input",
  llm: "llm",
  db: "db",
  work: "work",
  output: "output",
};

export const PIPELINE_KIND_COLOR: Record<PipelineNodeSpec["kind"], string> = {
  input: "text-[var(--ink-dim)]",
  llm: "text-[var(--kind-llm)]",
  db: "text-[var(--kind-db)]",
  work: "text-[var(--ink-dim)]",
  output: "text-[var(--ink-dim)]",
};

// Public test suite size (backend/tests/test_public.py). Surfaced as a static
// 5/5 badge on the home page; bump these together if the suite size changes.
export const PUBLIC_TESTS_TOTAL = 5;
export const PUBLIC_TESTS_PASSING = 5;

// The optimized pipeline normally issues two LLM calls per question (one for
// SQL generation, one for the answer). The unanswerable sentinel and the
// deterministic refusal both skip the answer call, so a run with fewer than
// this many calls counts as "short-circuited" in the dashboard.
export const PIPELINE_DEFAULT_LLM_CALLS = 2;

export const PIPELINE_OBSERVABILITY_FEATURES: readonly string[] = [
  "Structured JSON logs",
  "Per-stage SSE events",
  "Per-stage timings",
  "Token accounting",
  "Run history (SQLite)",
];

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
