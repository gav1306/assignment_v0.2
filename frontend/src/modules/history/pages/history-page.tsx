"use client";

import { useState } from "react";
import ReactPaginate from "react-paginate";

import { Reveal } from "@/components/comparison/reveal";
import { SectionHead } from "@/components/comparison/section-head";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryRowCard } from "@/modules/history/components/history-row-card";
import {
  HISTORY_PAGE_SIZE,
  HISTORY_ROW_REVEAL_MAX_MS,
  HISTORY_ROW_REVEAL_STEP_MS,
} from "@/modules/history/utils/const";
import { useHistory } from "@/modules/history/hooks/use-history";

export function HistoryPage() {
  const [page, setPage] = useState(0);
  const offset = page * HISTORY_PAGE_SIZE;

  const {
    data: pageData,
    error,
    isPending,
    isFetching,
    refetch,
  } = useHistory(HISTORY_PAGE_SIZE, offset);

  const rows = pageData?.runs;
  const total = pageData?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + HISTORY_PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-[56px]">
      <Reveal as="section" className="pt-2 space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-dim)]">
          §00 · runs · log
        </p>
        <h1 className="text-[44px] sm:text-[48px] leading-[0.98] tracking-[-0.03em] font-medium">
          Run history.
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--ink-muted)]">
          Past A/B comparisons. Click a row to expand for the full SQL, answer,
          and stage timings on both pipelines.
        </p>
      </Reveal>

      <section className="space-y-5">
        <SectionHead
          num="01"
          title="Recent runs"
          caption={
            <span className="flex items-center gap-3">
              <span>
                {total > 0
                  ? `${showingFrom}–${showingTo} of ${total}`
                  : "—"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="font-mono text-[11px] uppercase tracking-[0.06em] h-7"
              >
                {isFetching ? "loading…" : "refresh"}
              </Button>
            </span>
          }
        />

        {error ? (
          <div className="rounded-[10px] border border-[var(--bad)]/40 bg-[var(--bad)]/5 p-4">
            <p className="font-mono text-[12px] text-[var(--bad)]">
              Failed to load history:{" "}
              {error instanceof Error ? error.message : String(error)}
            </p>
            <p className="font-mono text-[11px] text-[var(--ink-dim)] mt-1">
              Is the FastAPI backend running on port 8000?
            </p>
          </div>
        ) : null}

        {isPending && !error ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton
                key={idx}
                className="h-24 w-full rounded-[10px] bg-[var(--bg-elev)]"
              />
            ))}
          </div>
        ) : null}

        {rows && rows.length === 0 && !error ? (
          <div className="rounded-[10px] border border-dashed border-border bg-[var(--bg-elev)] p-10 text-center">
            <p className="font-mono text-[12px] text-[var(--ink-muted)]">
              No runs yet. Head to the Compare tab to start one.
            </p>
          </div>
        ) : null}

        {rows && rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <Reveal
                key={row.id}
                delayMs={Math.min(
                  idx * HISTORY_ROW_REVEAL_STEP_MS,
                  HISTORY_ROW_REVEAL_MAX_MS,
                )}
              >
                <HistoryRowCard row={row} />
              </Reveal>
            ))}
          </div>
        ) : null}

        {pageCount > 1 ? (
          <ReactPaginate
            pageCount={pageCount}
            forcePage={Math.min(page, pageCount - 1)}
            onPageChange={({ selected }) => setPage(selected)}
            marginPagesDisplayed={1}
            pageRangeDisplayed={3}
            previousLabel="‹ prev"
            nextLabel="next ›"
            breakLabel="…"
            disableInitialCallback
            containerClassName="flex flex-wrap items-center justify-center gap-1.5 pt-2"
            pageClassName="font-mono"
            pageLinkClassName="inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-[var(--bg-elev)] px-2.5 text-[12px] uppercase tracking-[0.06em] text-[var(--ink-muted)] ease-expo-out transition-colors hover:border-[var(--line-strong)] hover:text-foreground"
            activeClassName="z-10"
            activeLinkClassName="!border-[var(--accent-mint)]/60 !bg-[var(--accent-mint)]/10 !text-[var(--accent-mint)] shadow-[0_0_0_4px_var(--accent-glow)]"
            previousClassName="font-mono"
            previousLinkClassName="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-[var(--bg-elev)] px-3 text-[11px] uppercase tracking-[0.06em] text-[var(--ink-muted)] ease-expo-out transition-colors hover:border-[var(--line-strong)] hover:text-foreground"
            nextClassName="font-mono"
            nextLinkClassName="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-[var(--bg-elev)] px-3 text-[11px] uppercase tracking-[0.06em] text-[var(--ink-muted)] ease-expo-out transition-colors hover:border-[var(--line-strong)] hover:text-foreground"
            disabledClassName="opacity-40 pointer-events-none"
            breakClassName="font-mono"
            breakLinkClassName="inline-flex h-8 min-w-8 items-center justify-center px-2 text-[11px] text-[var(--ink-dim)]"
          />
        ) : null}
      </section>
    </div>
  );
}
