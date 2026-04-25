"use client";

import { Fragment } from "react";

import { Reveal } from "@/components/comparison/reveal";
import { cn } from "@/lib/utils";

type Node = {
  id: string;
  kind: "input" | "llm" | "db" | "work" | "output";
  title: string;
  sub: string;
  /** Highlight the node as new vs the baseline. */
  isNew?: boolean;
};

export const PIPELINE_NODES: Node[] = [
  { id: "prompt", kind: "input", title: "Prompt", sub: "user · NL question" },
  {
    id: "rewrite",
    kind: "work",
    title: "Rewrite",
    sub: "standalone · multi-turn",
    isNew: true,
  },
  { id: "sql_gen", kind: "llm", title: "SQL Gen", sub: "schema-aware" },
  {
    id: "validate",
    kind: "work",
    title: "Validate",
    sub: "AST · allowlist",
    isNew: true,
  },
  { id: "execute", kind: "db", title: "Execute", sub: "SQLite · read-only" },
  { id: "answer", kind: "llm", title: "Answer", sub: "rows → grounded" },
];

const KIND_LABEL: Record<Node["kind"], string> = {
  input: "input",
  llm: "llm",
  db: "db",
  work: "work",
  output: "output",
};

const KIND_COLOR: Record<Node["kind"], string> = {
  input: "text-[var(--ink-dim)]",
  llm: "text-[var(--kind-llm)]",
  db: "text-[var(--kind-db)]",
  work: "text-[var(--ink-dim)]",
  output: "text-[var(--ink-dim)]",
};

function PipelineNode({ node, index }: { node: Node; index: number }) {
  return (
    <Reveal delayMs={index * 50} className="flex-1 min-w-[120px]">
      <div
        className={cn(
          "group relative h-[110px] rounded-[10px] border bg-[var(--bg)] px-3.5 py-3 ease-expo-out transition-all hover:-translate-y-0.5",
          node.isNew
            ? "border-[var(--accent-mint)]/30 bg-[linear-gradient(to_bottom,oklch(0.88_0.15_165_/_0.05),transparent_60%)] hover:border-[var(--accent-mint)]/60 hover:shadow-[0_0_0_4px_var(--accent-glow)]"
            : "border-border hover:border-[var(--line-strong)]",
        )}
      >
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.06em]",
            KIND_COLOR[node.kind],
          )}
        >
          {KIND_LABEL[node.kind]}
        </span>
        <p className="text-[12px] font-medium text-foreground mt-1">
          {node.title}
        </p>
        <p className="font-mono text-[10px] text-[var(--ink-dim)] mt-1 leading-relaxed">
          {node.sub}
        </p>
        {node.isNew ? (
          <span className="absolute top-2 right-2 inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent-mint)] shadow-[0_0_8px_var(--accent-glow)]" />
        ) : null}
      </div>
    </Reveal>
  );
}

function Arrow({ horizontal = true }: { horizontal?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 font-mono text-[12px] text-[var(--ink-dim)] flex items-center justify-center",
        horizontal ? "self-center" : "rotate-90",
      )}
    >
      →
    </span>
  );
}

export function PipelineDiagram() {
  return (
    <div className="rounded-[10px] border border-border bg-[var(--bg-elev)] p-6 lg:p-8 space-y-6">
      <div className="hidden lg:flex items-stretch gap-2">
        {PIPELINE_NODES.map((node, idx) => (
          <Fragment key={node.id}>
            <PipelineNode node={node} index={idx} />
            {idx < PIPELINE_NODES.length - 1 ? <Arrow /> : null}
          </Fragment>
        ))}
      </div>

      <div className="lg:hidden grid grid-cols-2 gap-2">
        {PIPELINE_NODES.map((node, idx) => (
          <PipelineNode key={node.id} node={node} index={idx} />
        ))}
      </div>

      <div className="border-t border-dashed border-border pt-5">
        <p className="label-mono mb-3">observability</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Structured JSON logs",
            "Per-stage SSE events",
            "Per-stage timings",
            "Token accounting",
            "Run history (SQLite)",
          ].map((label) => (
            <span
              key={label}
              className="rounded-full border border-border bg-[var(--bg)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <span className="label-mono">legend</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--kind-llm)]" />
          LLM
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--kind-db)]" />
          DB
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-mint)] shadow-[0_0_8px_var(--accent-glow)]" />
          new vs baseline
        </span>
      </div>
    </div>
  );
}
