"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  unanswerable: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  invalid_sql: "bg-red-500/15 text-red-700 dark:text-red-300",
  error: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <Badge variant="outline">—</Badge>;
  return <Badge className={STATUS_VARIANTS[status] ?? ""}>{status}</Badge>;
}
