import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionHeadProps {
  num: string;
  title: ReactNode;
  caption?: ReactNode;
  className?: string;
}

export function SectionHead({
  num,
  title,
  caption,
  className,
}: SectionHeadProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-4 border-b border-border pb-4",
        className,
      )}
    >
      <div className="flex items-baseline gap-4 min-w-0">
        <span className="font-mono text-xs tracking-[0.06em] text-[var(--ink-dim)]">
          {num}
        </span>
        <h2 className="text-[22px] leading-tight font-medium tracking-[-0.01em] text-foreground">
          {title}
        </h2>
      </div>
      {caption ? (
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-dim)] shrink-0">
          {caption}
        </span>
      ) : null}
    </div>
  );
}
