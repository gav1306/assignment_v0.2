"use client";

import { Reveal } from "@/components/comparison/reveal";
import type { Optimization } from "@/utils/const";
import { cn } from "@/lib/utils";

interface OptimizationCardProps {
  opt: Optimization;
  index: number;
}

export function OptimizationCard({ opt, index }: OptimizationCardProps) {
  return (
    <Reveal delayMs={(index % 2) * 60}>
      <article
        className={cn(
          "group relative rounded-[10px] border border-border bg-[var(--bg-elev)] p-5 ease-expo-out transition-colors",
          "hover:border-[var(--line-strong)] hover:bg-[var(--bg-elev-2)]/50",
        )}
      >
        <span
          aria-hidden
          className="absolute left-0 top-4 bottom-4 w-[2px] origin-bottom scale-y-0 bg-[var(--accent-mint)] ease-expo-out transition-transform duration-500 group-hover:scale-y-100"
        />
        <header className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[14px] font-medium text-foreground leading-snug">
            {opt.title}
          </h3>
          <span className="shrink-0 rounded-full border border-border bg-[var(--bg)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
            {opt.category}
          </span>
        </header>
        <p className="text-[13px] text-[var(--ink-muted)] leading-[1.55]">
          {opt.body}
        </p>
        <footer className="mt-4 pt-3 border-t border-border/70">
          <span className="font-mono text-[12px] text-[var(--accent-mint)]">
            {opt.impact}
          </span>
        </footer>
      </article>
    </Reveal>
  );
}
