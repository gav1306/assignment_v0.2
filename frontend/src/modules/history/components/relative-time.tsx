"use client";

import { useSyncExternalStore } from "react";

import { RELATIVE_TIME_TICK_MS } from "@/modules/history/utils/const";
import { formatRelativeTime } from "@/modules/history/utils/relative-time";

function subscribeClock(notify: () => void) {
  const id = setInterval(notify, RELATIVE_TIME_TICK_MS);
  return () => clearInterval(id);
}

function useClientTick(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / RELATIVE_TIME_TICK_MS),
    () => null,
  );
}

export function RelativeTime({ iso }: { iso: string }) {
  const tick = useClientTick();
  const label =
    tick === null
      ? iso.slice(0, 16).replace("T", " ")
      : formatRelativeTime(iso);
  return <span suppressHydrationWarning>{label}</span>;
}
