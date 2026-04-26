"use client";

import { Fragment } from "react";

import { Reveal } from "@/components/comparison/reveal";
import {
  PIPELINE_KIND_COLOR,
  PIPELINE_KIND_LABEL,
  PIPELINE_NODES,
  PIPELINE_OBSERVABILITY_FEATURES,
  type PipelineNodeSpec,
} from "@/utils/const";
import { cn } from "@/lib/utils";

function PipelineNode({
  node,
  index,
}: {
  node: PipelineNodeSpec;
  index: number;
}) {
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
            PIPELINE_KIND_COLOR[node.kind],
          )}
        >
          {PIPELINE_KIND_LABEL[node.kind]}
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
          {PIPELINE_OBSERVABILITY_FEATURES.map((label) => (
            <span
              key={label}
              className="rounded-full border border-border bg-(--bg) px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <span className="label-mono">legend</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-kind-llm" />
          LLM
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-kind-db" />
          DB
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-(--accent-mint) shadow-[0_0_8px_var(--accent-glow)]" />
          new vs baseline
        </span>
      </div>
    </div>
  );
}
