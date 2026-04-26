"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquareDashed } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { Reveal } from "@/components/comparison/reveal";
import { SectionHead } from "@/components/comparison/section-head";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "@/modules/chat/components/message-bubble";
import { useChatPipeline } from "@/modules/chat/hooks/use-chat-pipeline";
import { SAMPLE_FOLLOWUPS } from "@/modules/chat/utils/const";
import { QuestionSchema, type QuestionForm } from "@/utils/schemas";

export function ChatPage() {
  const { messages, sendMessage, status, error } = useChatPipeline();

  const form = useForm<QuestionForm>({
    resolver: zodResolver(QuestionSchema),
    defaultValues: { question: "" },
    mode: "onSubmit",
  });

  const inputValue = useWatch({ control: form.control, name: "question" });
  const isStreaming = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    form.reset({ question: "" });
    void sendMessage({ text: trimmed });
  }

  return (
    <div className="flex flex-col gap-[56px]">
      <Reveal as="section" className="pt-2 space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-dim)]">
          §00 · multi-turn · contextual
        </p>
        <h1 className="text-[44px] sm:text-[48px] leading-[0.98] tracking-[-0.03em] font-medium">
          Multi-turn <span className="text-[var(--accent-mint)]">chat</span>.
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--ink-muted)]">
          Ask follow-up questions in natural language. Each turn rewrites the
          message into a standalone question using prior context, then runs the
          optimized pipeline. Click &ldquo;how I answered&rdquo; on any reply to
          see the SQL.
        </p>
      </Reveal>

      <section className="space-y-5">
        <SectionHead
          num="01"
          title="Conversation"
          caption={isStreaming ? "streaming" : `${messages.length} messages`}
        />

        <div className="rounded-[10px] border border-border bg-[var(--bg-elev)] p-5 space-y-3 min-h-[280px]">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
              <MessageSquareDashed
                aria-hidden
                strokeWidth={1.25}
                className="h-10 w-10 text-[var(--ink-dim)]"
              />
              <p className="font-mono text-[12px] text-[var(--ink-dim)]">
                No messages yet. Try a sample below or type your own question.
              </p>
            </div>
          ) : null}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isStreaming ? (
            <div className="flex justify-start">
              <div className="rounded-[10px] bg-[var(--bg)] border border-border px-4 py-2.5 text-[12px]">
                <span className="font-mono text-[var(--ink-muted)]">
                  thinking
                </span>
                <span className="font-mono text-[var(--ink-muted)] inline-flex ml-1">
                  <span className="animate-pulse">.</span>
                  <span
                    className="animate-pulse"
                    style={{ animationDelay: "120ms" }}
                  >
                    .
                  </span>
                  <span
                    className="animate-pulse"
                    style={{ animationDelay: "240ms" }}
                  >
                    .
                  </span>
                </span>
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="font-mono text-[11px] text-[var(--bad)]">
              {error.message}
            </p>
          ) : null}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => submit(values.question))}
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
                        placeholder={
                          messages.length === 0
                            ? "Ask a question to start the conversation…"
                            : "Ask a follow-up…"
                        }
                        disabled={isStreaming}
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
                disabled={isStreaming || !inputValue.trim()}
                className="h-10 rounded-[8px] px-4 font-mono text-[12px] uppercase tracking-[0.06em]"
              >
                Send
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
          <span className="label-mono">sample turn flow</span>
          {SAMPLE_FOLLOWUPS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => submit(sample)}
              disabled={isStreaming}
              className="rounded-full border border-border bg-[var(--bg-elev)] px-3 py-1 text-[11px] text-[var(--ink-muted)] hover:bg-[var(--bg-elev-2)] hover:text-foreground hover:border-[var(--line-strong)] disabled:opacity-50 transition-colors ease-expo-out"
            >
              {sample}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
