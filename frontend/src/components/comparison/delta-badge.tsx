import { cn } from "@/lib/utils";

interface DeltaBadgeProps {
  label?: string;
  value: string;
  improved?: boolean;
  size?: "sm" | "md" | "lg";
  floating?: boolean;
  className?: string;
  // "auto"   - colour by `improved` (mint when true, bad when false).
  // "neutral"- always render in grey regardless of `improved`. Used for
  //            informational pills like "failed" where we want to surface
  //            state without implying a comparison.
  intent?: "auto" | "neutral";
}

export function DeltaBadge({
  label,
  value,
  improved = true,
  size = "md",
  floating = false,
  className,
  intent = "auto",
}: DeltaBadgeProps) {
  const sizeClasses =
    size === "lg"
      ? "h-9 px-4 text-sm"
      : size === "sm"
        ? "h-6 px-2.5 text-[11px]"
        : "h-7 px-3 text-xs";

  const toneClasses =
    intent === "neutral"
      ? "bg-[var(--ink-dim)]/10 text-[var(--ink-dim)] border border-[var(--ink-dim)]/25"
      : improved
        ? "bg-[var(--accent-mint)]/10 text-[var(--accent-mint)] border border-[var(--accent-mint)]/30"
        : "bg-[var(--bad)]/10 text-[var(--bad)] border border-[var(--bad)]/30";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-mono whitespace-nowrap ease-expo-out",
        sizeClasses,
        toneClasses,
        floating &&
          "shadow-[0_0_0_4px_var(--bg)] backdrop-blur-[1px] absolute left-1/2 -translate-x-1/2",
        className,
      )}
    >
      {label ? (
        <span className="text-[var(--ink-dim)] uppercase tracking-[0.06em]">
          {label}
        </span>
      ) : null}
      <span>{value}</span>
    </span>
  );
}
