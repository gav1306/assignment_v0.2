"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient, parseWith } from "@/lib/api-client";
import { configQueryKeys } from "@/modules/config/utils/query-keys";
import { ConfigResponseSchema } from "@/utils/schemas";

export function useConfig() {
  return useQuery({
    queryKey: configQueryKeys.details(),
    queryFn: async () => {
      const { data } = await apiClient.get<unknown>("/config");
      return parseWith(ConfigResponseSchema, data, "config");
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
