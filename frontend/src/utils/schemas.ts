import { z } from "zod";

export const PipelineKindSchema = z.enum(["baseline", "optimized"]);

export const StageNameSchema = z.enum([
  "sql_generation",
  "sql_validation",
  "sql_execution",
  "answer_generation",
]);

export const StageStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const RunStatusSchema = z.enum([
  "success",
  "unanswerable",
  "invalid_sql",
  "error",
]);

export const StageEventSchema = z.object({
  type: z.literal("stage"),
  pipeline: PipelineKindSchema,
  stage: StageNameSchema,
  status: StageStatusSchema,
  elapsed_ms: z.number(),
  tokens_delta: z.number(),
  payload: z.record(z.string(), z.unknown()),
});

export const PipelineTimingsSchema = z.object({
  sql_generation_ms: z.number(),
  sql_validation_ms: z.number(),
  sql_execution_ms: z.number(),
  answer_generation_ms: z.number(),
  total_ms: z.number(),
});

export const LLMStatsSchema = z.object({
  llm_calls: z.number(),
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  model: z.string(),
});

export const RunCompletedEventSchema = z.object({
  type: z.literal("run_completed"),
  run_id: z.string(),
  pipeline: PipelineKindSchema,
  status: RunStatusSchema,
  question: z.string(),
  sql: z.string().nullable(),
  rows: z.array(z.record(z.string(), z.unknown())),
  answer: z.string(),
  timings: PipelineTimingsSchema,
  total_llm_stats: LLMStatsSchema,
});

export const ErrorSseEventSchema = z.object({
  type: z.literal("error"),
  pipeline: PipelineKindSchema,
  error: z.string(),
});

export const SseEventSchema = z.discriminatedUnion("type", [
  StageEventSchema,
  RunCompletedEventSchema,
  ErrorSseEventSchema,
]);

export const StoredPipelineOutputSchema = z.object({
  status: RunStatusSchema,
  question: z.string(),
  request_id: z.string().nullable(),
  sql: z.string().nullable(),
  rows: z.array(z.record(z.string(), z.unknown())),
  answer: z.string(),
  timings: PipelineTimingsSchema,
  total_llm_stats: LLMStatsSchema,
});

export const HistoryRowSchema = z.object({
  id: z.string(),
  question: z.string(),
  created_at: z.string(),
  baseline: StoredPipelineOutputSchema.nullable(),
  optimized: StoredPipelineOutputSchema.nullable(),
});

export const HistoryResponseSchema = z.object({
  runs: z.array(HistoryRowSchema),
});

// Form schemas (shared between QueryInput and the chat input).
export const QuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Ask a question to get started.")
    .max(500, "Keep it under 500 characters."),
});

export type QuestionForm = z.infer<typeof QuestionSchema>;

export const STAGE_ORDER: readonly z.infer<typeof StageNameSchema>[] = [
  "sql_generation",
  "sql_validation",
  "sql_execution",
  "answer_generation",
];

export const STAGE_LABELS: Record<
  z.infer<typeof StageNameSchema>,
  string
> = {
  sql_generation: "SQL Generation",
  sql_validation: "SQL Validation",
  sql_execution: "SQL Execution",
  answer_generation: "Answer Generation",
};
