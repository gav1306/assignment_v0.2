"use client";

import { create } from "zustand";

function newRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

interface RunState {
  question: string | null;
  runId: string | null;
  startRun: (question: string) => { question: string; runId: string };
  reset: () => void;
}

export const useRunStore = create<RunState>((set) => ({
  question: null,
  runId: null,
  startRun: (question) => {
    const runId = newRunId();
    const trimmed = question.trim();
    set({ question: trimmed, runId });
    return { question: trimmed, runId };
  },
  reset: () => set({ question: null, runId: null }),
}));
