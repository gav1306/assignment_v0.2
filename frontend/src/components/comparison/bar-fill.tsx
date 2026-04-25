"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface BarFillProps {
  /** Final scale-x target between 0 and 1. */
  target: number;
  variant: "baseline" | "optimized";
  delayMs?: number;
  className?: string;
}

export function BarFill({
  target,
  variant,
  delayMs = 0,
  className,
}: BarFillProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [animate, setAnimate] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (animate) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setAnimate(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [animate]);

  const clamped = Math.max(0, Math.min(1, target));

  return (
    <div
      ref={ref}
      className={cn(
        "h-1.5 w-full rounded-full bg-[var(--bg-elev-2)] overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "h-full origin-left rounded-full ease-expo-out transition-transform",
          variant === "optimized"
            ? "bg-[var(--accent-mint)]"
            : "bg-[var(--baseline)]",
        )}
        style={{
          transform: `scaleX(${animate ? clamped : 0})`,
          transitionDuration: "1000ms",
          transitionDelay: `${delayMs}ms`,
          boxShadow:
            variant === "optimized" && animate
              ? `0 0 12px var(--accent-glow)`
              : undefined,
        }}
      />
    </div>
  );
}
