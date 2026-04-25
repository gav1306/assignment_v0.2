"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DeltaBadge } from "@/components/comparison/delta-badge";

interface SplitCompareProps {
  delta?: { label?: string; value: string; improved?: boolean };
  children: ReactNode;
  className?: string;
  /** Stack vertically below this breakpoint instead of side-by-side. */
  stackBelow?: "md" | "lg";
}

export function SplitCompare({
  delta,
  children,
  className,
  stackBelow = "md",
}: SplitCompareProps) {
  const breakpointGrid =
    stackBelow === "lg"
      ? "grid-cols-1 lg:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2";
  const breakpointDivider =
    stackBelow === "lg" ? "lg:block" : "md:block";

  return (
    <div
      className={cn(
        "relative rounded-[10px] border border-border bg-[var(--bg-elev)] overflow-hidden",
        className,
      )}
    >
      <div className={cn("relative grid", breakpointGrid)}>
        {/* vertical center divider */}
        <div
          aria-hidden
          className={cn(
            "hidden absolute inset-y-0 left-1/2 w-px bg-border",
            breakpointDivider,
          )}
        />
        {children}
      </div>

      {delta ? (
        <DeltaBadge
          label={delta.label ?? "Δ"}
          value={delta.value}
          improved={delta.improved ?? true}
          floating
          size="md"
          className="top-3 z-10"
        />
      ) : null}
    </div>
  );
}

interface SideProps {
  variant: "baseline" | "optimized";
  tag: string;
  sub?: ReactNode;
  children: ReactNode;
  className?: string;
}

function Side({ variant, tag, sub, children, className }: SideProps) {
  const isOptimized = variant === "optimized";

  return (
    <div
      className={cn(
        "relative px-6 pt-12 pb-6 lg:px-7 lg:pt-14 lg:pb-7",
        isOptimized
          ? "bg-[linear-gradient(to_bottom,oklch(0.88_0.15_165_/_0.05),transparent_60%)] halo-mint-inset"
          : "bg-[linear-gradient(to_bottom,oklch(0.55_0.012_260_/_0.05),transparent_60%)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-5 min-w-0">
        <span
          className={cn(
            "inline-flex h-2 w-2 rounded-full shrink-0",
            isOptimized
              ? "bg-[var(--accent-mint)] shadow-[0_0_8px_var(--accent-glow)]"
              : "bg-[var(--baseline)]",
          )}
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-foreground shrink-0">
          {tag}
        </span>
        {sub ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-dim)] truncate min-w-0">
            · {sub}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

SplitCompare.Side = Side;
