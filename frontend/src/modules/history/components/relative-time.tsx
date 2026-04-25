"use client";

import { useSyncExternalStore } from "react";

import { formatRelativeTime } from "@/modules/history/utils/relative-time";

function subscribeClock(notify: () => void) {
  const id = setInterval(notify, 30_000);
  return () => clearInterval(id);
}

function useClientTick(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 30_000),
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
