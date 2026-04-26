"use client";

import {
  experimental_streamedQuery as streamedQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchEventSource,
  type EventSourceMessage,
} from "@microsoft/fetch-event-source";
import { useCallback, useMemo, useState } from "react";

import { pipelineStreamQueryKeys } from "@/modules/home/utils/query-keys";
import { SseEventSchema } from "@/utils/schemas";
import type {
  PipelineKind,
  RunCompletedEvent,
  SseEvent,
  StageEvent,
} from "@/types";

export type StreamState =
  | "idle"
  | "connecting"
  | "streaming"
  | "completed"
  | "error";

export interface PipelineStream {
  state: StreamState;
  events: StageEvent[];
  final: RunCompletedEvent | null;
  error: string | null;
  start: (question: string, runId: string) => void;
  reset: () => void;
}

interface ActiveRun {
  question: string;
  runId: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

// Wrap fetchEventSource as a pull-based async iterator so we can hand it to
// TanStack's experimental_streamedQuery. The internal AbortController is
// linked to the query's signal AND aborted locally once a terminal SSE event
// arrives; without that, the connection would stay open after run_completed.
async function* createPipelineSseStream(
  url: string,
  parentSignal: AbortSignal,
): AsyncGenerator<SseEvent> {
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (parentSignal.aborted) controller.abort();
  else parentSignal.addEventListener("abort", onParentAbort, { once: true });

  const buffer: SseEvent[] = [];
  let finished = false;
  let failure: unknown = null;
  let wake: (() => void) | null = null;

  const wakeUp = () => {
    const resolve = wake;
    wake = null;
    resolve?.();
  };

  const streamPromise = fetchEventSource(url, {
    signal: controller.signal,
    openWhenHidden: true,
    onopen: async (response) => {
      if (!response.ok) {
        throw new Error(`stream open failed: ${response.status}`);
      }
    },
    onmessage: (msg: EventSourceMessage) => {
      if (!msg.data) return;
      let raw: unknown;
      try {
        raw = JSON.parse(msg.data);
      } catch {
        return;
      }
      const parsed = SseEventSchema.safeParse(raw);
      if (!parsed.success) return;
      buffer.push(parsed.data);
      if (
        parsed.data.type === "run_completed" ||
        parsed.data.type === "error"
      ) {
        finished = true;
        controller.abort();
      }
      wakeUp();
    },
    onclose: () => {
      finished = true;
      wakeUp();
    },
    onerror: (err) => {
      failure = err;
      finished = true;
      wakeUp();
      throw err;
    },
  }).catch((err) => {
    if (controller.signal.aborted) return;
    if (!failure) failure = err;
    finished = true;
    wakeUp();
  });

  try {
    while (true) {
      while (buffer.length) yield buffer.shift()!;
      if (failure) throw failure;
      if (finished) return;
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }
  } finally {
    parentSignal.removeEventListener("abort", onParentAbort);
    controller.abort();
    await streamPromise;
  }
}

export function usePipelineStream(pipeline: PipelineKind): PipelineStream {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ActiveRun | null>(null);

  const query = useQuery<SseEvent[]>({
    queryKey: active
      ? pipelineStreamQueryKeys.run(pipeline, active.runId)
      : pipelineStreamQueryKeys.pipeline(pipeline),
    queryFn: streamedQuery<SseEvent>({
      streamFn: ({ signal }) => {
        if (!active) return (async function* () {})();
        const url =
          `${API_BASE}/run/${pipeline}` +
          `?q=${encodeURIComponent(active.question)}` +
          `&run_id=${encodeURIComponent(active.runId)}`;
        return createPipelineSseStream(url, signal);
      },
    }),
    enabled: Boolean(active),
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const data = query.data;

  const events = useMemo<StageEvent[]>(
    () =>
      (data ?? []).filter((e): e is StageEvent => e.type === "stage"),
    [data],
  );

  const final = useMemo<RunCompletedEvent | null>(
    () =>
      (data ?? []).find(
        (e): e is RunCompletedEvent => e.type === "run_completed",
      ) ?? null,
    [data],
  );

  const errorEventMessage = useMemo<string | null>(() => {
    const evt = (data ?? []).find((e) => e.type === "error");
    return evt && evt.type === "error" ? evt.error : null;
  }, [data]);

  const start = useCallback((question: string, runId: string) => {
    queryClient.cancelQueries({
      queryKey: pipelineStreamQueryKeys.pipeline(pipeline),
    });
    setActive({ question, runId });
  }, [pipeline, queryClient]);

  const reset = useCallback(() => {
    setActive(null);
    queryClient.removeQueries({
      queryKey: pipelineStreamQueryKeys.pipeline(pipeline),
    });
  }, [pipeline, queryClient]);

  let state: StreamState;
  let error: string | null = null;
  if (!active) {
    state = "idle";
  } else if (final) {
    state = "completed";
  } else if (errorEventMessage) {
    state = "error";
    error = errorEventMessage;
  } else if (query.isError) {
    state = "error";
    error =
      query.error instanceof Error
        ? query.error.message
        : String(query.error);
  } else if (query.fetchStatus === "fetching") {
    state = (data?.length ?? 0) > 0 ? "streaming" : "connecting";
  } else {
    state = "idle";
  }

  return { state, events, final, error, start, reset };
}
