"use client";

import { useState } from "react";

import { MetricsPanel } from "@/components/metrics-panel";
import { PipelineColumn } from "@/components/pipeline-column";
import { QueryInput } from "@/components/query-input";
import { usePipelineStream } from "@/hooks/use-pipeline-stream";

function newRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function ComparePage() {
  const baseline = usePipelineStream("baseline");
  const optimized = usePipelineStream("optimized");
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);

  const isRunning =
    baseline.state === "streaming" ||
    baseline.state === "connecting" ||
    optimized.state === "streaming" ||
    optimized.state === "connecting";

  function onSubmit(question: string) {
    const runId = newRunId();
    setCurrentQuestion(question);
    baseline.start(question, runId);
    optimized.start(question, runId);
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
