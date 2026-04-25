"use client";

import { useQuery } from "@tanstack/react-query";

import { historyApi } from "@/modules/history/api/history-api";

export const historyKeys = {
  all: ["history"] as const,
  list: (limit: number, offset = 0) =>
    [...historyKeys.all, "list", limit, offset] as const,
  detail: (runId: string) => [...historyKeys.all, "detail", runId] as const,
};

export function useHistory(limit: number, offset = 0) {
  return useQuery({
    queryKey: historyKeys.list(limit, offset),
    queryFn: () => historyApi.list(limit, offset),
    placeholderData: (prev) => prev,
  });
}

export function useRunDetail(runId: string | null) {
  return useQuery({
    queryKey: runId ? historyKeys.detail(runId) : historyKeys.all,
    queryFn: () => {
      if (!runId) throw new Error("runId is required");
      return historyApi.get(runId);
    },
    enabled: Boolean(runId),
  });
}
