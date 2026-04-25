"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import type {
  PipelineKind,
  StageEvent,
  StageName,
  StageStatus,
} from "@/types";
import { STAGE_LABELS } from "@/types";
import { formatMs, formatTokens } from "@/utils/format";

type DisplayStatus = StageStatus | "pending";

interface StageCardProps {
  stage: StageName;
  pipeline: PipelineKind;
  event: StageEvent | null;
  expectedRunning?: boolean;
  index: number;
}

const STAGE_KIND: Record<StageName, "llm" | "db" | "work"> = {
  sql_generation: "llm",
  sql_validation: "work",
  sql_execution: "db",
  answer_generation: "llm",
};

const STAGE_SUBLINE: Record<StageName, string> = {
  sql_generation: "schema-aware prompt → SQL",
  sql_validation: "AST + table allowlist",
  sql_execution: "SQLite · read-only",
  answer_generation: "rows → grounded answer",
};

function KindTag({ kind }: { kind: "llm" | "db" | "work" }) {
  if (kind === "work") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
        work
      </span>
    );
  }
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-[0.06em]"
      style={{
        color: kind === "llm" ? "var(--kind-llm)" : "var(--kind-db)",
      }}
    >
      {kind}
    </span>
  );
}

function StateDot({
  status,
  pipeline,
}: {
  status: DisplayStatus;
  pipeline: PipelineKind;
}) {
  if (status === "pending") {
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--ink-dim)]/60" />
    );
  }
  if (status === "running") {
    return (
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full",
          pipeline === "optimized"
            ? "bg-[var(--accent-mint)] animate-pulse-ring"
            : "bg-[var(--baseline)] animate-pulse-ring-neutral",
        )}
      />
    );
  }
  if (status === "completed") {
    return (
      <span
        className={cn(
          "inline-flex h-2.5 w-2.5 items-center justify-center rounded-full",
          pipeline === "optimized"
            ? "bg-[var(--accent-mint)]"
            : "bg-[var(--baseline)]",
        )}
      />
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--bad)]" />
    );
  }
  // skipped
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--ink-dim)]/40" />
  );
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
        {sql ? (
          <pre className="bg-[var(--bg)] border border-border rounded-md p-2.5 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap break-words text-[var(--ink-muted)]">
            {sql}
          </pre>
        ) : null}
        {error ? (
          <p className="text-[11px] font-mono text-[var(--bad)]">
            error: {error}
          </p>
        ) : null}
      </div>
    );
  }
  if (stage === "sql_execution") {
    const rowCount = payload.row_count as number | undefined;
    const error = payload.error as string | undefined;
    return (
      <div className="text-[11px] font-mono text-[var(--ink-muted)] space-y-1">
        {typeof rowCount === "number" ? (
          <p>rows fetched: {rowCount}</p>
        ) : null}
        {error ? <p className="text-[var(--bad)]">error: {error}</p> : null}
      </div>
    );
  }
  if (stage === "answer_generation") {
    const preview = payload.answer_preview as string | undefined;
    const error = payload.error as string | undefined;
    return (
      <div className="space-y-2">
        {preview ? (
          <p className="text-[12px] whitespace-pre-wrap break-words text-foreground">
            {preview}
          </p>
        ) : null}
        {error ? (
          <p className="text-[11px] font-mono text-[var(--bad)]">
            error: {error}
          </p>
        ) : null}
      </div>
    );
  }
  return null;
}

export function StageCard({
  stage,
  pipeline,
  event,
  expectedRunning = false,
  index,
}: StageCardProps) {
  const [expanded, setExpanded] = useState(false);

  const status: DisplayStatus = event
    ? event.status
    : expectedRunning
      ? "running"
      : "pending";

  const elapsed = event?.elapsed_ms ?? 0;
  const tokens = event?.tokens_delta ?? 0;
  const hasPayload = event && Object.keys(event.payload || {}).length > 0;
  const isError = status === "failed";
  const isOptimized = pipeline === "optimized";

  return (
    <div
      className={cn(
        "rounded-[10px] border bg-[var(--bg)] ease-expo-out transition-all",
        isError
          ? "border-[var(--bad)]/50 bg-[var(--bad)]/5"
          : status === "running"
            ? isOptimized
              ? "border-[var(--accent-mint)]/40 bg-[var(--bg-elev-2)]/60"
              : "border-[var(--baseline)]/50 bg-[var(--bg-elev-2)]/60"
            : "border-border",
        status === "pending" && "opacity-60",
      )}
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="pt-1">
              <StateDot status={status} pipeline={pipeline} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.06em] text-[var(--ink-dim)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <KindTag kind={STAGE_KIND[stage]} />
              </div>
              <p className="text-[13px] font-medium text-foreground mt-0.5">
                {STAGE_LABELS[stage]}
              </p>
              <p className="text-[11px] text-[var(--ink-dim)] font-mono mt-0.5 truncate">
                {STAGE_SUBLINE[stage]}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {event ? (
              <>
                <p className="num-s text-foreground tabular-nums">
                  {formatMs(elapsed)}
                </p>
                {tokens > 0 ? (
                  <p className="font-mono text-[10px] text-[var(--ink-dim)] mt-0.5">
                    {formatTokens(tokens)} tok
                  </p>
                ) : null}
              </>
            ) : status === "running" ? (
              <span className="font-mono text-[11px] text-[var(--ink-muted)] animate-pulse">
                running…
              </span>
            ) : (
              <span className="font-mono text-[11px] text-[var(--ink-dim)]">
                —
              </span>
            )}
          </div>
        </div>

        {hasPayload ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)] hover:text-foreground transition-colors"
            >
              {expanded ? "− hide details" : "+ show details"}
            </button>
            {expanded ? (
              <div className="mt-2">
                <PayloadView stage={stage} payload={event!.payload} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
