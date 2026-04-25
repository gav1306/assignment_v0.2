export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return n.toString();
  return `${(n / 1000).toFixed(1)}k`;
}

export function formatDeltaPct(baseline: number, optimized: number): string {
  if (baseline === 0) return "n/a";
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
