"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  PipelineKind,
  RunCompletedEvent,
  StageEvent,
} from "@/lib/types";

export type StreamState = "idle" | "connecting" | "streaming" | "completed" | "error";

export interface PipelineStream {
  state: StreamState;
  events: StageEvent[];
  final: RunCompletedEvent | null;
  error: string | null;
  start: (question: string, runId: string) => void;
  reset: () => void;
}

export function usePipelineStream(pipeline: PipelineKind): PipelineStream {
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [final, setFinal] = useState<RunCompletedEvent | null>(null);
  const [state, setState] = useState<StreamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const start = useCallback(
    (question: string, runId: string) => {
      sourceRef.current?.close();
      setEvents([]);
      setFinal(null);
      setError(null);
      setState("connecting");

      const url =
        `/api/run/${pipeline}` +
        `?q=${encodeURIComponent(question)}` +
        `&run_id=${encodeURIComponent(runId)}`;

      const es = new EventSource(url);
      sourceRef.current = es;

      es.onopen = () => {
        setState((prev) => (prev === "connecting" ? "streaming" : prev));
      };

      es.onmessage = (msg) => {
        let data: unknown;
        try {
          data = JSON.parse(msg.data);
        } catch {
          return;
        }
        if (!data || typeof data !== "object" || !("type" in data)) return;

        const typed = data as { type: string };
        if (typed.type === "stage") {
          setEvents((prev) => [...prev, data as StageEvent]);
        } else if (typed.type === "run_completed") {
          setFinal(data as RunCompletedEvent);
          setState("completed");
          es.close();
          if (sourceRef.current === es) sourceRef.current = null;
        } else if (typed.type === "error") {
          const err = (data as { error?: string }).error ?? "stream error";
          setError(err);
          setState("error");
          es.close();
          if (sourceRef.current === es) sourceRef.current = null;
        }
      };

      es.onerror = () => {
        // EventSource auto-reconnects unless we close it. After run_completed
        // the server has already closed the connection so onerror also fires;
        // ignore it once we've reached a terminal state.
        if (sourceRef.current !== es) return;
        setState((prev) => (prev === "completed" ? prev : "error"));
        es.close();
        sourceRef.current = null;
      };
    },
    [pipeline],
  );

  const reset = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setEvents([]);
    setFinal(null);
    setError(null);
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, []);

  return { state, events, final, error, start, reset };
}
