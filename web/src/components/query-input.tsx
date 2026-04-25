"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESET_PROMPTS } from "@/lib/prompts";

interface QueryInputProps {
  disabled?: boolean;
  onSubmit: (question: string) => void;
}

export function QueryInput({ disabled, onSubmit }: QueryInputProps) {
  const [value, setValue] = useState("");

  function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setValue(trimmed);
    onSubmit(trimmed);
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
        className="flex gap-2"
      >
        <Input
          placeholder="Ask anything about the gaming/mental-health dataset..."
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          className="flex-1"
        />
        <Button type="submit" disabled={disabled || !value.trim()}>
          Run A/B
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <span className="text-muted-foreground text-xs uppercase tracking-wide self-center">
          Presets:
        </span>
        {PRESET_PROMPTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setValue(preset);
              if (!disabled) submit(preset);
            }}
            disabled={disabled}
            className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
          >
            {preset.length > 60 ? `${preset.slice(0, 60)}…` : preset}
          </button>
        ))}
      </div>
    </div>
  );
}
