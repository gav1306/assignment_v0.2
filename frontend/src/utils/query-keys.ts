import { convertToString } from "@/utils/helpers";

export const historyQueryKeys = {
  all: ["history"] as const,
  list: <T, U>(limit: T, offset: U) =>
    [
      ...historyQueryKeys.all,
      "list",
      convertToString(limit),
      convertToString(offset),
    ] as const,
  detail: <T>(runId: T) =>
    [...historyQueryKeys.all, "detail", convertToString(runId)] as const,
};
