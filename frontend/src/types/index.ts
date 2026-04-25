import type { z } from "zod";

import type {
  ErrorSseEventSchema,
  HistoryRowSchema,
  LLMStatsSchema,
  PipelineKindSchema,
  PipelineTimingsSchema,
  RunCompletedEventSchema,
  RunStatusSchema,
  SseEventSchema,
  StageEventSchema,
  StageNameSchema,
  StageStatusSchema,
  StoredPipelineOutputSchema,
} from "@/utils/schemas";

export { STAGE_LABELS, STAGE_ORDER } from "@/utils/schemas";

export type PipelineKind = z.infer<typeof PipelineKindSchema>;
export type StageName = z.infer<typeof StageNameSchema>;
export type StageStatus = z.infer<typeof StageStatusSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export type StageEvent = z.infer<typeof StageEventSchema>;
export type PipelineTimings = z.infer<typeof PipelineTimingsSchema>;
export type LLMStats = z.infer<typeof LLMStatsSchema>;
export type RunCompletedEvent = z.infer<typeof RunCompletedEventSchema>;
export type ErrorSseEvent = z.infer<typeof ErrorSseEventSchema>;
export type SseEvent = z.infer<typeof SseEventSchema>;
export type StoredPipelineOutput = z.infer<typeof StoredPipelineOutputSchema>;
export type HistoryRow = z.infer<typeof HistoryRowSchema>;
