import type {
  HistoryRow,
  RunCompletedEvent,
  StoredPipelineOutput,
} from "@/types";

function liveFinalToStoredOutput(
  final: RunCompletedEvent,
): StoredPipelineOutput {
  return {
    status: final.status,
    question: final.question,
    request_id: final.run_id,
    sql: final.sql,
    rows: final.rows,
    answer: final.answer,
    timings: final.timings,
    total_llm_stats: final.total_llm_stats,
  };
}

export function stitchLiveRunIntoHistory(
  historyRows: HistoryRow[] | undefined,
  baselineFinal: RunCompletedEvent | null,
  optimizedFinal: RunCompletedEvent | null,
): HistoryRow[] | undefined {
  const liveRunId = optimizedFinal?.run_id ?? baselineFinal?.run_id ?? null;
  if (!liveRunId) return historyRows;
  const base = historyRows ?? [];
  if (base.some((r) => r.id === liveRunId)) return base;
  const liveRow: HistoryRow = {
    id: liveRunId,
    question: optimizedFinal?.question ?? baselineFinal?.question ?? "",
    created_at: new Date().toISOString(),
    baseline: baselineFinal ? liveFinalToStoredOutput(baselineFinal) : null,
    optimized: optimizedFinal ? liveFinalToStoredOutput(optimizedFinal) : null,
  };
  return [liveRow, ...base];
}
