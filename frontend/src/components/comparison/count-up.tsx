"use client";

import { useEffect, useRef, useState } from "react";

import { COUNT_UP_DEFAULT_DURATION_MS } from "@/components/comparison/utils/const";

interface CountUpProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({
  value,
  durationMs = COUNT_UP_DEFAULT_DURATION_MS,
  decimals = 0,
  suffix = "",
  prefix = "",
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  // Tracks the latest displayed value across renders so subsequent value
  // changes animate from where the last animation left off (a smooth tick)
  // rather than restarting from zero each time.
  const displayRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = displayRef.current;
    const to = value;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const current = from + (to - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  const formatted =
    decimals > 0
      ? display.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : Math.round(display).toLocaleString();

  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
