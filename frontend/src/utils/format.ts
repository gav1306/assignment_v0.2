export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return n.toString();
  return `${(n / 1000).toFixed(1)}k`;
}

// Kept for back-compat / future use. The home page no longer renders cross-
// pipeline deltas because the baseline pipeline never completes a successful
// run (preserved C1 bug), which makes the comparison misleading.
export function formatDeltaPct(baseline: number, optimized: number): string {
  if (baseline === 0) return "—";
  const delta = ((optimized - baseline) / baseline) * 100;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

export function deltaIsImprovement(
  metric: "latency" | "tokens",
  baseline: number,
  optimized: number,
): boolean {
  if (baseline === 0) return false;
  // Lower is better for both latency and tokens.
  return optimized < baseline;
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatTokenSplit(prompt: number, completion: number): string {
  return `${formatTokens(prompt)} / ${formatTokens(completion)}`;
}

export const UNTRACKED_LABEL = "untracked";

/**
 * A pipeline reports "untracked" tokens when its stages clearly ran (we have
 * non-zero timing for sql_generation) but `total_tokens` came back as 0. The
 * baseline pipeline always lands here because the preserved C4 bug never
 * increments `_stats` (so even `llm_calls` reads as 0; we cannot rely on it).
 */
export function isTokensUntracked(
  stats: { total_tokens: number },
  timings: { sql_generation_ms: number },
): boolean {
  return stats.total_tokens === 0 && timings.sql_generation_ms > 0;
}
