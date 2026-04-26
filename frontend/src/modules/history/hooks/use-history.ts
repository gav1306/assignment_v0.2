"use client";

import { useQuery } from "@tanstack/react-query";

import { historyApi } from "@/modules/history/api/history-api";
import { historyQueryKeys } from "@/utils/query-keys";

export function useHistory(limit: number, offset = 0) {
  return useQuery({
    queryKey: historyQueryKeys.list(limit, offset),
    queryFn: () => historyApi.list(limit, offset),
    placeholderData: (prev) => prev,
  });
}

export function useRunDetail(runId: string | null) {
  return useQuery({
    queryKey: runId ? historyQueryKeys.detail(runId) : historyQueryKeys.all,
    queryFn: () => {
      if (!runId) throw new Error("runId is required");
      return historyApi.get(runId);
    },
    enabled: Boolean(runId),
  });
}
