"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageCard } from "@/components/stage-card";
import { formatMs, formatTokens } from "@/lib/format";
import type { PipelineStream } from "@/hooks/use-pipeline-stream";
import type { PipelineKind, RunStatus, StageEvent, StageName } from "@/lib/types";
import { STAGE_ORDER } from "@/lib/types";

interface PipelineColumnProps {
  pipeline: PipelineKind;
  stream: PipelineStream;
}

const PIPELINE_LABELS: Record<PipelineKind, string> = {
  baseline: "Baseline",
  optimized: "Optimized",
};

const PIPELINE_DESCRIPTIONS: Record<PipelineKind, string> = {
  baseline: "Frozen starter code (bugs intact). Stages reported on completion.",
  optimized: "Validated, schema-aware, observable. Stages stream as they happen.",
};

const RUN_STATUS_VARIANTS: Record<RunStatus | "running" | "idle", string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  unanswerable: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  invalid_sql: "bg-red-500/15 text-red-700 dark:text-red-300",
  error: "bg-red-500/15 text-red-700 dark:text-red-300",
  running: "bg-blue-500/15 text-blue-700 dark:text-blue-300 animate-pulse",
  idle: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

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

  const headerStatus =
    stream.state === "completed" && stream.final
      ? stream.final.status
      : stream.state === "streaming" || stream.state === "connecting"
        ? "running"
        : stream.state === "error"
          ? "error"
          : "idle";

  const headerLabel = headerStatus.replace("_", " ");

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{PIPELINE_LABELS[pipeline]}</CardTitle>
          <Badge className={RUN_STATUS_VARIANTS[headerStatus]}>{headerLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {PIPELINE_DESCRIPTIONS[pipeline]}
        </p>
        {stream.final && (
          <div className="flex gap-3 text-xs text-muted-foreground pt-1">
            <span>{formatMs(stream.final.timings.total_ms)}</span>
            <span>{formatTokens(stream.final.total_llm_stats.total_tokens)} tokens</span>
            <span>{stream.final.total_llm_stats.llm_calls} LLM calls</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-2">
        {STAGE_ORDER.map((stage, index) => (
          <StageCard
            key={stage}
            stage={stage}
            event={eventByStage.get(stage) ?? null}
            expectedRunning={
              stream.state !== "idle" &&
              stream.state !== "error" &&
              !eventByStage.has(stage) &&
              index === expectedRunningIndex
            }
          />
        ))}

        {stream.error && (
          <p className="text-xs text-red-600 dark:text-red-400 pt-2">
            stream error: {stream.error}
          </p>
        )}

        {stream.final && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Final answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap break-words">
                {stream.final.answer || "(no answer)"}
              </p>
              {stream.final.sql && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:underline">
                    show SQL
                  </summary>
                  <pre className="mt-2 bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
                    {stream.final.sql}
                  </pre>
                </details>
              )}
              {stream.final.rows.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:underline">
                    show {stream.final.rows.length} row(s)
                  </summary>
                  <pre className="mt-2 bg-background border rounded p-2 overflow-x-auto text-xs">
                    {JSON.stringify(stream.final.rows.slice(0, 20), null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

