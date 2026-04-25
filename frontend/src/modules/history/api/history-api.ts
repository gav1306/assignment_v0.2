"use client";

import { apiClient, parseWith } from "@/lib/api-client";
import { HistoryResponseSchema, HistoryRowSchema } from "@/utils/schemas";
import type { HistoryRow } from "@/types";

export const historyApi = {
  async list(limit: number): Promise<HistoryRow[]> {
    const { data } = await apiClient.get<unknown>("/history", {
      params: { limit },
    });
    return parseWith(HistoryResponseSchema, data, "history").runs;
  },

  async get(runId: string): Promise<HistoryRow> {
    const { data } = await apiClient.get<unknown>(
      `/runs/${encodeURIComponent(runId)}`,
    );
    return parseWith(HistoryRowSchema, data, "run");
  },
};
