import { convertToString } from "@/utils/helpers";
import type { PipelineKind } from "@/types";

export const pipelineStreamQueryKeys = {
  all: ["pipeline-stream"] as const,
  pipeline: (pipeline: PipelineKind) =>
    [...pipelineStreamQueryKeys.all, pipeline] as const,
  run: (pipeline: PipelineKind, runId: string) =>
    [
      ...pipelineStreamQueryKeys.pipeline(pipeline),
      "run",
      convertToString(runId),
    ] as const,
};
