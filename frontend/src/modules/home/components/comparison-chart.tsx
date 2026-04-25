"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ComparisonChartProps {
  baselineMs: number;
  optimizedMs: number;
  baselineTokens: number;
  optimizedTokens: number;
}

export function ComparisonChart({
  baselineMs,
  optimizedMs,
  baselineTokens,
  optimizedTokens,
}: ComparisonChartProps) {
  const data = [
    {
      metric: "Latency (ms)",
      baseline: Math.round(baselineMs),
      optimized: Math.round(optimizedMs),
    },
    {
      metric: "Tokens",
      baseline: baselineTokens,
      optimized: optimizedTokens,
    },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--background)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="baseline" fill="#94a3b8" name="Baseline" />
          <Bar dataKey="optimized" fill="#10b981" name="Optimized" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
