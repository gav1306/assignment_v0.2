"use client";

import { MetricsPanel } from "@/modules/home/components/metrics-panel";
import { PipelineColumn } from "@/modules/home/components/pipeline-column";
import { QueryInput } from "@/modules/home/components/query-input";
import { usePipelineStream } from "@/modules/home/hooks/use-pipeline-stream";
import { useRunStore } from "@/stores/run-store";

export function HomePage() {
  const baseline = usePipelineStream("baseline");
  const optimized = usePipelineStream("optimized");
  const currentQuestion = useRunStore((s) => s.question);
  const startRun = useRunStore((s) => s.startRun);

  const isRunning =
    baseline.state === "streaming" ||
    baseline.state === "connecting" ||
    optimized.state === "streaming" ||
    optimized.state === "connecting";

  function onSubmit(question: string) {
    const { question: q, runId } = startRun(question);
    baseline.start(q, runId);
    optimized.start(q, runId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">A/B Compare</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Type a natural-language question and watch both pipelines race —
          the optimized pipeline streams stage events live, the frozen
          baseline reports its stages on completion.
        </p>
      </div>

      <QueryInput disabled={isRunning} onSubmit={onSubmit} />

      {currentQuestion && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Question:</span>{" "}
          {currentQuestion}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PipelineColumn pipeline="baseline" stream={baseline} />
        <PipelineColumn pipeline="optimized" stream={optimized} />
      </div>

      {baseline.final && optimized.final && (
        <MetricsPanel baseline={baseline.final} optimized={optimized.final} />
      )}
    </div>
  );
}
