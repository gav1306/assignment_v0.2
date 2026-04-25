"use client";

import {
  fetchEventSource,
  type EventSourceMessage,
} from "@microsoft/fetch-event-source";
import { useCallback, useEffect, useRef, useState } from "react";

import { SseEventSchema } from "@/utils/schemas";
import type {
  PipelineKind,
  RunCompletedEvent,
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

// Thrown to break out of fetchEventSource once we've seen a terminal event.
class StreamFinishedError extends Error {
  constructor(public reason: "completed" | "error") {
    super(reason);
  }
}

export function usePipelineStream(pipeline: PipelineKind): PipelineStream {
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [final, setFinal] = useState<RunCompletedEvent | null>(null);
  const [state, setState] = useState<StreamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const start = useCallback(
    (question: string, runId: string) => {
      ctrlRef.current?.abort();
      setEvents([]);
      setFinal(null);
      setError(null);
      setState("connecting");

      const url =
        `${API_BASE}/run/${pipeline}` +
        `?q=${encodeURIComponent(question)}` +
        `&run_id=${encodeURIComponent(runId)}`;

      const ctrl = new AbortController();
      ctrlRef.current = ctrl;

      fetchEventSource(url, {
        signal: ctrl.signal,
        openWhenHidden: true,
        onopen: async (response) => {
          if (!response.ok) {
            throw new Error(`stream open failed: ${response.status}`);
          }
          setState("streaming");
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
          const data = parsed.data;

          if (data.type === "stage") {
            setEvents((prev) => [...prev, data]);
          } else if (data.type === "run_completed") {
            setFinal(data);
            setState("completed");
            throw new StreamFinishedError("completed");
          } else if (data.type === "error") {
            setError(data.error);
            setState("error");
            throw new StreamFinishedError("error");
          }
        },
        onerror: (err) => {
          if (err instanceof StreamFinishedError) throw err;
          setState((prev) => (prev === "completed" ? prev : "error"));
          setError(err instanceof Error ? err.message : String(err));
          throw err;
        },
      }).catch((err) => {
        if (err instanceof StreamFinishedError) return;
        if (ctrl.signal.aborted) return;
        if (process.env.NODE_ENV !== "production") {
          console.error("[pipeline-stream]", err);
        }
      });
    },
    [pipeline],
  );

  const reset = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setEvents([]);
    setFinal(null);
    setError(null);
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      ctrlRef.current?.abort();
      ctrlRef.current = null;
    };
  }, []);

  return { state, events, final, error, start, reset };
}
