"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StageEvent, StageName, StageStatus } from "@/types";
import { STAGE_LABELS } from "@/types";
import { formatMs, formatTokens } from "@/utils/format";

interface StageCardProps {
  stage: StageName;
  event: StageEvent | null;
  expectedRunning?: boolean;
}

const STATUS_VARIANTS: Record<StageStatus, string> = {
  running: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  failed: "bg-red-500/15 text-red-700 dark:text-red-300",
  skipped: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

function StatusPill({ status }: { status: StageStatus | "pending" }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        pending
      </Badge>
    );
  }
  return <Badge className={STATUS_VARIANTS[status]}>{status}</Badge>;
}

function PayloadView({
  stage,
  payload,
}: {
  stage: StageName;
  payload: Record<string, unknown>;
}) {
  if (stage === "sql_generation" || stage === "sql_validation") {
    const sql = (payload.sql ?? payload.validated_sql) as string | undefined;
    const error = payload.error as string | undefined;
    return (
      <div className="space-y-2">
        {sql && (
          <pre className="bg-muted/50 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap break-words">
            {sql}
          </pre>
        )}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">
            error: {error}
          </p>
        )}
      </div>
    );
  }
  if (stage === "sql_execution") {
    const rowCount = payload.row_count as number | undefined;
    const error = payload.error as string | undefined;
    return (
      <div className="text-xs text-muted-foreground space-y-1">
        {typeof rowCount === "number" && <p>rows fetched: {rowCount}</p>}
        {error && (
          <p className="text-red-600 dark:text-red-400">error: {error}</p>
        )}
      </div>
    );
  }
  if (stage === "answer_generation") {
    const preview = payload.answer_preview as string | undefined;
    const error = payload.error as string | undefined;
    return (
      <div className="space-y-2">
        {preview && (
          <p className="text-xs whitespace-pre-wrap break-words">{preview}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">
            error: {error}
          </p>
        )}
      </div>
    );
  }
  return null;
}

export function StageCard({
  stage,
  event,
  expectedRunning = false,
}: StageCardProps) {
  const [expanded, setExpanded] = useState(false);

  const status: StageStatus | "pending" = event
    ? event.status
    : expectedRunning
      ? "running"
      : "pending";

  const elapsed = event?.elapsed_ms ?? 0;
  const tokens = event?.tokens_delta ?? 0;
  const hasPayload = event && Object.keys(event.payload || {}).length > 0;

  return (
    <Card className={status === "pending" ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            {STAGE_LABELS[stage]}
          </CardTitle>
          <StatusPill status={status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {event ? (
            <>
              <span>{formatMs(elapsed)}</span>
              {tokens > 0 && <span>{formatTokens(tokens)} tokens</span>}
            </>
          ) : status === "running" ? (
            <span className="animate-pulse">awaiting…</span>
          ) : (
            <span>—</span>
          )}
        </div>
      </CardHeader>
      {hasPayload && (
        <CardContent className="pt-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground hover:underline"
          >
            {expanded ? "hide details" : "show details"}
          </button>
          {expanded && (
            <div className="mt-2">
              <PayloadView stage={stage} payload={event!.payload} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
