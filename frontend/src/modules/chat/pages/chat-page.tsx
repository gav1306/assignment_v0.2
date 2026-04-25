"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SAMPLE_FOLLOWUPS } from "@/modules/chat/utils/constants";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Multi-turn Chat</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask follow-up questions in natural language. Each turn rewrites the
          message into a standalone question using prior context, then runs
          the optimized pipeline. Click &ldquo;How I answered&rdquo; on any
          reply to see the SQL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Try a sample below or type your own question.
            </p>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground animate-pulse">
                thinking…
              </div>
            </div>
          )}
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {error.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => submit(values.question))}
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
                      placeholder={
                        messages.length === 0
                          ? "Ask a question to start the conversation..."
                          : "Ask a follow-up..."
                      }
                      disabled={isStreaming}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isStreaming || !inputValue.trim()}
            >
              Send
            </Button>
          </div>
        </form>
      </Form>

      <div className="flex flex-wrap gap-2">
        <span className="text-muted-foreground text-xs uppercase tracking-wide self-center">
          Sample turn flow:
        </span>
        {SAMPLE_FOLLOWUPS.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => submit(sample)}
            disabled={isStreaming}
            className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
          >
            {sample}
          </button>
        ))}
      </div>
    </div>
  );
}
