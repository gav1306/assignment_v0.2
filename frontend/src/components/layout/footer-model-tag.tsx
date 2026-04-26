"use client";

import { useConfig } from "@/modules/config/hooks/use-config";

export function FooterModelTag() {
  const { data } = useConfig();
  const model = data?.model;
  return (
    <span>
      baseline vs optimized · {model ? model.split("/").pop() : "—"}
    </span>
  );
}
