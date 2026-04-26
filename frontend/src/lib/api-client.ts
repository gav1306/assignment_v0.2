"use client";

import axios, { type AxiosError, type AxiosInstance } from "axios";
import type { ZodType } from "zod";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

interface FastApiErrorPayload {
  detail?: string | { msg?: string }[];
}

function extractErrorMessage(error: AxiosError<FastApiErrorPayload>): string {
  const data = error.response?.data;
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      const first = data.detail[0];
      if (first && typeof first === "object" && first.msg) return first.msg;
    }
  }
  if (error.response?.statusText) {
    return `${error.response.status} ${error.response.statusText}`;
  }
  return error.message || "Network error";
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<FastApiErrorPayload>) => {
    const message = extractErrorMessage(error);
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `[api] ${error.config?.method?.toUpperCase() ?? "?"} ${error.config?.url ?? "?"}: ${message}`,
      );
    }
    return Promise.reject(new Error(message));
  },
);

export function parseWith<T>(schema: ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`${label} response validation failed: ${result.error.message}`);
  }
  return result.data;
}
