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
  onSubmit: (question: string) => void;
}

export function QueryInput({ disabled, onSubmit }: QueryInputProps) {
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
    <div className="flex flex-col gap-3">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-2"
          noValidate
        >
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Ask anything about the gaming/mental-health dataset..."
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={disabled || !currentValue.trim()}>
              Run A/B
            </Button>
          </div>
        </form>
      </Form>

      <div className="flex flex-wrap gap-2">
        <span className="text-muted-foreground text-xs uppercase tracking-wide self-center">
          Presets:
        </span>
        {PRESET_PROMPTS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => runPreset(preset)}
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
