"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryRowCard } from "@/modules/history/components/history-row-card";
import { useHistory } from "@/modules/history/hooks/use-history";

const HISTORY_LIMIT = 100;

export function HistoryPage() {
  const { data: rows, error, isPending, isFetching, refetch } =
    useHistory(HISTORY_LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Run History</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Past A/B comparisons. Click a row to expand for full SQL, answer,
            and stage timings on both pipelines.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load history:{" "}
              {error instanceof Error ? error.message : String(error)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Is the FastAPI backend running on port 8000?
            </p>
          </CardContent>
        </Card>
      )}

      {isPending && !error && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-24 w-full" />
          ))}
        </div>
      )}

      {rows && rows.length === 0 && !error && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No runs yet. Head to the Compare tab to start one.
          </CardContent>
        </Card>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => (
            <HistoryRowCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
