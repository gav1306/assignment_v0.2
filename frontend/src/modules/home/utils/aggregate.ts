import type { HistoryRow, StoredPipelineOutput } from "@/types";

export type StageKey =
  | "sql_generation_ms"
  | "sql_validation_ms"
  | "sql_execution_ms"
  | "answer_generation_ms";

export const STAGE_KEYS: readonly StageKey[] = [
  "sql_generation_ms",
  "sql_validation_ms",
  "sql_execution_ms",
  "answer_generation_ms",
] as const;

export const STAGE_DISPLAY: Record<StageKey, string> = {
  sql_generation_ms: "SQL gen",
  sql_validation_ms: "Validate",
  sql_execution_ms: "Execute",
  answer_generation_ms: "Answer",
};

export interface StageRow {
  key: StageKey;
  label: string;
  baseline: number;
  optimized: number;
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function aggregateStages(rows: HistoryRow[] | undefined): StageRow[] {
  if (!rows || rows.length === 0) return [];
  const baselineByStage: Record<StageKey, number[]> = {
    sql_generation_ms: [],
    sql_validation_ms: [],
    sql_execution_ms: [],
    answer_generation_ms: [],
  };
  const optimizedByStage: Record<StageKey, number[]> = {
    sql_generation_ms: [],
    sql_validation_ms: [],
    sql_execution_ms: [],
    answer_generation_ms: [],
  };

  for (const row of rows) {
    if (row.baseline) {
      for (const key of STAGE_KEYS) {
        baselineByStage[key].push(row.baseline.timings[key]);
      }
    }
    if (row.optimized) {
      for (const key of STAGE_KEYS) {
        optimizedByStage[key].push(row.optimized.timings[key]);
      }
    }
  }

  return STAGE_KEYS.map((key) => ({
    key,
    label: STAGE_DISPLAY[key],
    baseline: Math.round(avg(baselineByStage[key])),
    optimized: Math.round(avg(optimizedByStage[key])),
  }));
}

export interface QueryRow {
  id: string;
  question: string;
  baselineMs: number | null;
  optimizedMs: number | null;
  baselineTokens: number | null;
  optimizedTokens: number | null;
  baselineStatus: string | null;
  optimizedStatus: string | null;
}

export function aggregateQueries(
  rows: HistoryRow[] | undefined,
  limit = 6,
): QueryRow[] {
  if (!rows || rows.length === 0) return [];
  return rows.slice(0, limit).map((row) => ({
    id: row.id,
    question: row.question,
    baselineMs: row.baseline?.timings.total_ms ?? null,
    optimizedMs: row.optimized?.timings.total_ms ?? null,
    baselineTokens: row.baseline?.total_llm_stats.total_tokens ?? null,
    optimizedTokens: row.optimized?.total_llm_stats.total_tokens ?? null,
    baselineStatus: row.baseline?.status ?? null,
    optimizedStatus: row.optimized?.status ?? null,
  }));
}

export interface BenchmarkSummary {
  runs: number;
  baselineAvgMs: number;
  optimizedAvgMs: number;
  baselineAvgTokens: number;
  optimizedAvgTokens: number;
  baselineAvgCalls: number;
  optimizedAvgCalls: number;
  baselineSuccessPct: number;
  optimizedSuccessPct: number;
}

export function summarize(
  rows: HistoryRow[] | undefined,
): BenchmarkSummary | null {
  if (!rows || rows.length === 0) return null;
  const baselines: StoredPipelineOutput[] = rows
    .map((r) => r.baseline)
    .filter((x): x is StoredPipelineOutput => Boolean(x));
  const optimizeds: StoredPipelineOutput[] = rows
    .map((r) => r.optimized)
    .filter((x): x is StoredPipelineOutput => Boolean(x));

  const successPct = (xs: StoredPipelineOutput[]) =>
    xs.length === 0
      ? 0
      : (xs.filter((x) => x.status === "success").length / xs.length) * 100;

  return {
    runs: rows.length,
    baselineAvgMs: Math.round(avg(baselines.map((x) => x.timings.total_ms))),
    optimizedAvgMs: Math.round(avg(optimizeds.map((x) => x.timings.total_ms))),
    baselineAvgTokens: Math.round(
      avg(baselines.map((x) => x.total_llm_stats.total_tokens)),
    ),
    optimizedAvgTokens: Math.round(
      avg(optimizeds.map((x) => x.total_llm_stats.total_tokens)),
    ),
    baselineAvgCalls: Math.round(
      avg(baselines.map((x) => x.total_llm_stats.llm_calls)),
    ),
    optimizedAvgCalls: Math.round(
      avg(optimizeds.map((x) => x.total_llm_stats.llm_calls)),
    ),
    baselineSuccessPct: Math.round(successPct(baselines) * 10) / 10,
    optimizedSuccessPct: Math.round(successPct(optimizeds) * 10) / 10,
  };
}
