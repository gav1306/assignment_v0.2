"use client";

import { apiClient, parseWith } from "@/lib/api-client";
import { HistoryResponseSchema, HistoryRowSchema } from "@/utils/schemas";
import type { HistoryRow } from "@/types";

export interface HistoryPage {
  runs: HistoryRow[];
  total: number;
  limit: number;
  offset: number;
}

export const historyApi = {
  async list(limit: number, offset = 0): Promise<HistoryPage> {
    const { data } = await apiClient.get<unknown>("/history", {
      params: { limit, offset },
    });
    return parseWith(HistoryResponseSchema, data, "history");
  },

  async get(runId: string): Promise<HistoryRow> {
    const { data } = await apiClient.get<unknown>(
      `/runs/${encodeURIComponent(runId)}`,
    );
    return parseWith(HistoryRowSchema, data, "run");
  },
};
