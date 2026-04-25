"""Run baseline vs optimized pipelines on the same prompts and report side-by-side
latency, token usage, and success rate. Output is captured for SOLUTION_NOTES.md.

Usage:
    python3 scripts/compare_pipelines.py --runs 1
    python3 scripts/compare_pipelines.py --runs 1 --output benchmark_results.json
    python3 scripts/compare_pipelines.py --runs 1 --prompts tests/public_prompts.json
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.pipeline import AnalyticsPipeline
from src.pipeline_baseline import BaselineAnalyticsPipeline
from src.types import PipelineOutput


DEFAULT_PROMPTS_PATH = PROJECT_ROOT / "tests" / "public_prompts.json"
DEFAULT_RUNS = 1


@dataclass
class SampleResult:
    prompt: str
    status: str
    total_ms: float
    total_tokens: int
    llm_calls: int
    sql: str | None
    answer_preview: str
    error: str | None = None


@dataclass
class PipelineSummary:
    name: str
    samples: list[SampleResult] = field(default_factory=list)

    def add(self, sample: SampleResult) -> None:
        self.samples.append(sample)

    def aggregate(self) -> dict[str, float | int]:
        if not self.samples:
            return {}
        latencies = [s.total_ms for s in self.samples]
        tokens = [s.total_tokens for s in self.samples]
        successes = sum(1 for s in self.samples if s.status == "success")
        return {
            "samples": len(self.samples),
            "success_rate": round(successes / len(self.samples), 4),
            "avg_ms": round(statistics.fmean(latencies), 2),
            "p50_ms": round(_percentile(latencies, 50), 2),
            "p95_ms": round(_percentile(latencies, 95), 2),
            "avg_tokens": round(statistics.fmean(tokens), 1) if tokens else 0,
            "total_tokens": sum(tokens),
            "total_llm_calls": sum(s.llm_calls for s in self.samples),
        }


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    idx = min(len(s) - 1, max(0, int(round((pct / 100.0) * (len(s) - 1)))))
    return s[idx]


def _run_one(pipeline_name: str, pipeline, prompt: str) -> SampleResult:
    started = time.perf_counter()
    try:
        result: PipelineOutput = pipeline.run(prompt)
        return SampleResult(
            prompt=prompt,
            status=result.status,
            total_ms=result.timings["total_ms"],
            total_tokens=int(result.total_llm_stats.get("total_tokens", 0)),
            llm_calls=int(result.total_llm_stats.get("llm_calls", 0)),
            sql=result.sql,
            answer_preview=(result.answer or "")[:120],
            error=None,
        )
    except Exception as exc:
        elapsed = (time.perf_counter() - started) * 1000
        return SampleResult(
            prompt=prompt,
            status="exception",
            total_ms=elapsed,
            total_tokens=0,
            llm_calls=0,
            sql=None,
            answer_preview="",
            error=f"{type(exc).__name__}: {exc}",
        )


def _delta_pct(baseline: float, optimized: float) -> str:
    if baseline == 0:
        return "n/a"
    delta = (optimized - baseline) / baseline * 100
    sign = "+" if delta > 0 else ""
    return f"{sign}{delta:.1f}%"


def _print_summary(baseline: PipelineSummary, optimized: PipelineSummary) -> None:
    b = baseline.aggregate()
    o = optimized.aggregate()
    rows = [
        ("samples", b["samples"], o["samples"], "—"),
        ("success_rate", f"{b['success_rate'] * 100:.1f}%", f"{o['success_rate'] * 100:.1f}%", "—"),
        ("avg_ms", f"{b['avg_ms']:.0f}", f"{o['avg_ms']:.0f}", _delta_pct(b["avg_ms"], o["avg_ms"])),
        ("p50_ms", f"{b['p50_ms']:.0f}", f"{o['p50_ms']:.0f}", _delta_pct(b["p50_ms"], o["p50_ms"])),
        ("p95_ms", f"{b['p95_ms']:.0f}", f"{o['p95_ms']:.0f}", _delta_pct(b["p95_ms"], o["p95_ms"])),
        ("avg_tokens", f"{b['avg_tokens']:.0f}", f"{o['avg_tokens']:.0f}", _delta_pct(b["avg_tokens"], o["avg_tokens"])),
        ("total_tokens", b["total_tokens"], o["total_tokens"], "—"),
        ("total_llm_calls", b["total_llm_calls"], o["total_llm_calls"], "—"),
    ]
    print("\n=== Aggregate comparison ===")
    print(f"{'metric':16} {'baseline':>12} {'optimized':>12} {'delta':>10}")
    print("-" * 54)
    for name, bv, ov, delta in rows:
        print(f"{name:16} {str(bv):>12} {str(ov):>12} {delta:>10}")


def _print_per_prompt(baseline: PipelineSummary, optimized: PipelineSummary) -> None:
    print("\n=== Per-prompt detail ===")
    by_prompt_b = {s.prompt: s for s in baseline.samples}
    by_prompt_o = {s.prompt: s for s in optimized.samples}
    for prompt in by_prompt_b:
        b = by_prompt_b[prompt]
        o = by_prompt_o.get(prompt)
        print()
        print(f"Q: {prompt}")
        print(f"  baseline : status={b.status:13} {b.total_ms:7.0f}ms tokens={b.total_tokens:5}")
        if o is not None:
            print(f"  optimized: status={o.status:13} {o.total_ms:7.0f}ms tokens={o.total_tokens:5}")


def _build_report(baseline: PipelineSummary, optimized: PipelineSummary, runs: int, prompts_path: Path) -> dict:
    return {
        "runs": runs,
        "prompts_source": str(prompts_path.relative_to(PROJECT_ROOT)),
        "baseline": {
            "aggregate": baseline.aggregate(),
            "samples": [
                {
                    "prompt": s.prompt,
                    "status": s.status,
                    "total_ms": s.total_ms,
                    "total_tokens": s.total_tokens,
                    "llm_calls": s.llm_calls,
                    "sql": s.sql,
                    "answer_preview": s.answer_preview,
                    "error": s.error,
                }
                for s in baseline.samples
            ],
        },
        "optimized": {
            "aggregate": optimized.aggregate(),
            "samples": [
                {
                    "prompt": s.prompt,
                    "status": s.status,
                    "total_ms": s.total_ms,
                    "total_tokens": s.total_tokens,
                    "llm_calls": s.llm_calls,
                    "sql": s.sql,
                    "answer_preview": s.answer_preview,
                    "error": s.error,
                }
                for s in optimized.samples
            ],
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=DEFAULT_RUNS)
    parser.add_argument("--prompts", type=Path, default=DEFAULT_PROMPTS_PATH)
    parser.add_argument("--output", type=Path, default=None, help="Optional path to write JSON report.")
    args = parser.parse_args()

    prompts: list[str] = json.loads(args.prompts.read_text(encoding="utf-8"))
    print(f"Loaded {len(prompts)} prompts from {args.prompts}")
    print(f"Running {args.runs} repetition(s) per pipeline")

    print("\nInitializing pipelines...")
    baseline_pipeline = BaselineAnalyticsPipeline()
    optimized_pipeline = AnalyticsPipeline()

    baseline = PipelineSummary(name="baseline")
    optimized = PipelineSummary(name="optimized")

    total = args.runs * len(prompts)
    counter = 0
    for run_index in range(args.runs):
        for prompt in prompts:
            counter += 1
            print(f"\n[{counter}/{total}] {prompt[:70]}")

            sample = _run_one("baseline", baseline_pipeline, prompt)
            baseline.add(sample)
            print(f"  baseline : {sample.status:13} {sample.total_ms:7.0f}ms tokens={sample.total_tokens}")

            sample = _run_one("optimized", optimized_pipeline, prompt)
            optimized.add(sample)
            print(f"  optimized: {sample.status:13} {sample.total_ms:7.0f}ms tokens={sample.total_tokens}")

    _print_summary(baseline, optimized)
    _print_per_prompt(baseline, optimized)

    if args.output:
        report = _build_report(baseline, optimized, args.runs, args.prompts)
        args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nReport written to {args.output}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
