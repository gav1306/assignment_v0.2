"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/modules/history/components/status-badge";
import type { PipelineKind, StoredPipelineOutput } from "@/types";
import { formatMs, formatTokens } from "@/utils/format";

interface RunDetailProps {
  pipeline: PipelineKind;
  output: StoredPipelineOutput | null;
}

const PIPELINE_LABELS: Record<PipelineKind, string> = {
  baseline: "Baseline",
  optimized: "Optimized",
};

export function RunDetail({ pipeline, output }: RunDetailProps) {
  if (!output) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-sm">{PIPELINE_LABELS[pipeline]}</CardTitle>
          <p className="text-xs text-muted-foreground">
            No data persisted for this pipeline.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{PIPELINE_LABELS[pipeline]}</CardTitle>
          <StatusBadge status={output.status} />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{formatMs(output.timings.total_ms)} total</span>
          <span>
            {formatTokens(output.total_llm_stats.total_tokens)} tokens
          </span>
          <span>{output.total_llm_stats.llm_calls} LLM calls</span>
          <span>{output.total_llm_stats.model}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <p className="text-muted-foreground uppercase tracking-wide mb-1">
            Answer
          </p>
          <p className="whitespace-pre-wrap break-words">
            {output.answer || "(no answer)"}
          </p>
        </div>

        {output.sql && (
          <div>
            <p className="text-muted-foreground uppercase tracking-wide mb-1">
              SQL
            </p>
            <pre className="bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
              {output.sql}
            </pre>
          </div>
        )}

        {output.rows.length > 0 && (
          <details>
            <summary className="cursor-pointer text-muted-foreground hover:underline">
              {output.rows.length} row(s)
            </summary>
            <pre className="mt-2 bg-muted/50 rounded p-2 overflow-x-auto">
              {JSON.stringify(output.rows.slice(0, 20), null, 2)}
            </pre>
          </details>
        )}

        <details>
          <summary className="cursor-pointer text-muted-foreground hover:underline">
            stage timings
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
            <span>SQL gen:</span>
            <span>{formatMs(output.timings.sql_generation_ms)}</span>
            <span>Validation:</span>
            <span>{formatMs(output.timings.sql_validation_ms)}</span>
            <span>Execution:</span>
            <span>{formatMs(output.timings.sql_execution_ms)}</span>
            <span>Answer gen:</span>
            <span>{formatMs(output.timings.answer_generation_ms)}</span>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
