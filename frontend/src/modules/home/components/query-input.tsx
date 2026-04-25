"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PRESET_PROMPTS } from "@/modules/home/utils/prompts";
import { QuestionSchema, type QuestionForm } from "@/utils/schemas";

interface QueryInputProps {
  disabled?: boolean;
  running?: boolean;
  onSubmit: (question: string) => void;
}

export function QueryInput({ disabled, running, onSubmit }: QueryInputProps) {
  const form = useForm<QuestionForm>({
    resolver: zodResolver(QuestionSchema),
    defaultValues: { question: "" },
    mode: "onSubmit",
  });

  const currentValue = useWatch({ control: form.control, name: "question" });

  function submit(values: QuestionForm) {
    onSubmit(values.question);
    form.reset({ question: values.question });
  }

  function runPreset(preset: string) {
    if (disabled) return;
    form.setValue("question", preset, { shouldValidate: false });
    onSubmit(preset);
  }

  return (
    <div className="flex flex-col gap-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-2"
          noValidate
        >
          <div className="flex items-stretch gap-2 rounded-[10px] border border-input bg-[var(--bg-elev)] p-1.5 focus-within:border-[var(--accent-mint)]/50 focus-within:ring-2 focus-within:ring-[var(--accent-mint)]/20 transition-colors">
            <span className="self-center pl-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-dim)] hidden sm:inline">
              ›
            </span>
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Ask anything about the gaming/mental-health dataset…"
                      disabled={disabled}
                      className="h-10 border-0 bg-transparent text-[14px] focus-visible:ring-0 focus-visible:border-0 placeholder:text-[var(--ink-dim)]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="lg"
              disabled={disabled || !currentValue.trim()}
              className="h-10 rounded-[8px] px-4 font-mono text-[12px] uppercase tracking-[0.06em]"
            >
              {running ? "Running…" : "Run A/B"}
            </Button>
          </div>
          <FormField
            control={form.control}
            name="question"
            render={() => (
              <FormItem>
                <FormMessage className="font-mono text-[11px]" />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="label-mono">presets</span>
        {PRESET_PROMPTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => runPreset(preset)}
            disabled={disabled}
            className="rounded-full border border-border bg-[var(--bg-elev)] px-3 py-1 text-[11px] text-[var(--ink-muted)] hover:bg-[var(--bg-elev-2)] hover:text-foreground hover:border-[var(--line-strong)] disabled:opacity-50 transition-colors ease-expo-out"
          >
            {preset.length > 60 ? `${preset.slice(0, 60)}…` : preset}
          </button>
        ))}
      </div>
    </div>
  );
}
