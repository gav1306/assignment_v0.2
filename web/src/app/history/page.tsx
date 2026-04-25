"use client";

import { useCallback, useEffect, useState } from "react";

import { RunDetail } from "@/components/run-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchHistory, type HistoryRow } from "@/lib/api";
import {
  deltaIsImprovement,
  formatDeltaPct,
  formatMs,
  formatTokens,
} from "@/lib/format";
import { formatRelativeTime } from "@/lib/relative-time";

const STATUS_VARIANTS: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  unanswerable: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  invalid_sql: "bg-red-500/15 text-red-700 dark:text-red-300",
  error: "bg-red-500/15 text-red-700 dark:text-red-300",
};

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <Badge variant="outline">—</Badge>;
  return <Badge className={STATUS_VARIANTS[status] ?? ""}>{status}</Badge>;
}

// Renders ISO timestamp deterministically during SSR, then swaps to a relative
// label ("5 min ago") after mount. Without this, formatRelativeTime() reads
// Date.now() during render and the SSR/CSR strings disagree -> hydration error.
function RelativeTime({ iso }: { iso: string }) {
  const fallback = iso.slice(0, 16).replace("T", " ");
  const [label, setLabel] = useState<string>(fallback);

  useEffect(() => {
    setLabel(formatRelativeTime(iso));
    const id = setInterval(() => setLabel(formatRelativeTime(iso)), 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return <span suppressHydrationWarning>{label}</span>;
}

function HistoryRowCard({ row }: { row: HistoryRow }) {
  const [expanded, setExpanded] = useState(false);
  const b = row.baseline;
  const o = row.optimized;
  const bMs = b?.timings.total_ms ?? 0;
  const oMs = o?.timings.total_ms ?? 0;
  const bTokens = b?.total_llm_stats.total_tokens ?? 0;
  const oTokens = o?.total_llm_stats.total_tokens ?? 0;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 hover:bg-accent/40 transition-colors rounded-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium leading-tight break-words">
              {row.question}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <RelativeTime iso={row.created_at} />
              <span className="font-mono">{row.id.slice(0, 8)}…</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs shrink-0">
            <div className="text-right space-y-1">
              <p className="text-muted-foreground uppercase tracking-wide">
                Baseline
              </p>
              <StatusBadge status={b?.status} />
              {b && (
                <p className="text-muted-foreground">
                  {formatMs(bMs)} · {formatTokens(bTokens)}t
                </p>
              )}
            </div>
            <div className="text-right space-y-1">
              <p className="text-muted-foreground uppercase tracking-wide">
                Optimized
              </p>
              <StatusBadge status={o?.status} />
              {o && (
                <p className="text-muted-foreground">
                  {formatMs(oMs)} · {formatTokens(oTokens)}t
                </p>
              )}
            </div>
          </div>
        </div>

        {b && o && (
          <div className="mt-3 flex gap-4 text-xs">
            <span
              className={`font-mono ${
                deltaIsImprovement("latency", bMs, oMs)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              latency {formatDeltaPct(bMs, oMs)}
            </span>
            <span
              className={`font-mono ${
                deltaIsImprovement("tokens", bTokens, oTokens)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              tokens {formatDeltaPct(bTokens, oTokens)}
            </span>
          </div>
        )}
      </button>

      {expanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <RunDetail pipeline="baseline" output={b} />
            <RunDetail pipeline="optimized" output={o} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistory(100);
      setRows(data);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : String(exc));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to load history: {error}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Is the FastAPI backend running on port 8000?
            </p>
          </CardContent>
        </Card>
      )}

      {!rows && !error && (
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
