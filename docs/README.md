# Senior Full Stack Engineer (GenAI-Labs) Take-Home Assignment

## Timebox
Plan for **4-6 hours**.

## Goal
Optimize a baseline LLM-driven analytics pipeline for a single-table SQL dataset while preserving output quality.

Key metrics include **end-to-end response time** from prompt ingest to final answer, **resources consumed** (tokens), and **quality of the output**.

## Current Status

**This codebase is a starting point for the assignment and is not yet fully functional.** Several core components require implementation to make the pipeline production-ready:

- Token counting infrastructure (skeleton provided in `src/llm_client.py`, actual counting logic needs implementation)
- SQL validation and quality checks
- Result validation and answer quality verification
- Comprehensive observability (logging, metrics, tracing)
- Edge case handling and error recovery

The baseline pipeline will run, but key functionality—particularly around validation, observability, and efficiency optimizations—remains incomplete. See `Assignment Tasks` below and `CHECKLIST.md` for specific implementation requirements.

## What You Get
- Baseline Python pipeline with stages:
  - SQL generation (real LLM call)
  - SQL validation
  - SQL execution
  - Answer generation (real LLM call)
- Single SQLite table with gaming and mental health survey data
- Public tests and benchmark script
- OpenRouter integration via [OpenRouter Python SDK](https://pypi.org/project/openrouter/)
- Configurable model (default: `openai/gpt-5-nano`, override via `OPENROUTER_MODEL`)

## Assignment Tasks

1. **Make the system production-ready.** What does production-ready mean to you? Demonstrate whatever you consider essential.

2. **Ensure the system can generate accurate SQL queries.** The baseline may not work correctly out of the box. Identify what's missing and implement what's needed for reliable SQL generation.

3. **Maintain or improve answer correctness.** The system should handle edge cases gracefully.

4. **Design appropriate observability for this analytics pipeline.** Implement tracing, metrics, and logging as you see fit for production use.

5. **Implement a validation framework to ensure answer quality.** Consider SQL validation, result validation, and answer quality checks. (Hint: think about what SQL validation means in the context of an analytics pipeline.)

6. **Consider efficiency.** Optimize end-to-end latency, token usage, and efficient LLM requests while preserving quality.

## Hard Requirements
1. Do not modify existing public tests in `tests/test_public.py`.
2. Public tests must pass.
3. Keep the project runnable locally with standard Python.
4. Output contract: `AnalyticsPipeline.run()` must return a `PipelineOutput` instance, with each stage producing outputs that conform to the type schemas in `src/types.py`. This enables automated evaluation; submissions that deviate from it cannot be graded correctly.
5. Token counting must be implemented. The baseline includes a skeleton for tracking LLM usage statistics in `src/llm_client.py`, but you must implement the actual token counting. This is required for the efficiency evaluation to work.

## Production Readiness Requirements

Your submission **must include** a completed `CHECKLIST.md` file documenting your design decisions and implementation approach across all relevant areas.

## Requirements

- **Python:** 3.13+ (managed by [uv](https://docs.astral.sh/uv/) — installed automatically on first `uv sync`)
- **Dependencies:** `openrouter`, `pandas`, `sqlglot`, `fastapi`, `uvicorn`, `python-dotenv` (declared in `backend/pyproject.toml`, pinned in `backend/uv.lock`)

## Setup

### Data Setup

The dataset (~160MB) is not included in this repository. Download it before running the pipeline:

1. Go to [Kaggle - Gaming and Mental Health](https://www.kaggle.com/datasets/sharmajicoder/gaming-and-mental-health?select=gaming_mental_health_10M_40features.csv)
2. Download `gaming_mental_health_10M_40features.csv` (select this file from the dataset)
3. Place the file in the `data/` directory
4. **Important:** Ensure you download and use all 39 columns—do not drop any columns during download or import

The Kaggle page provides a more detailed description of the dataset, including column definitions and data sources.

Install [uv](https://docs.astral.sh/uv/getting-started/installation/) (`brew install uv` on macOS), then from `backend/`:

```bash
uv sync                                                  # installs Python 3.13+ and all deps into .venv
uv run python scripts/gaming_csv_to_db.py
uv run python -m unittest discover -s tests -p "test_public.py"
```

### OpenRouter Setup

This project uses [OpenRouter](https://openrouter.ai/) to access LLMs for SQL generation and answer synthesis. OpenRouter provides a unified API for many models across providers. It offers a **free tier** that lets you use certain models at no cost, which is sufficient for this assignment.

To get started:

1. **Create an account** at [openrouter.ai](https://openrouter.ai/)
2. **Create an API key** in your account settings
3. **Set the API key** in your environment (or copy `backend/.env.example` → `backend/.env` and fill it in):

```bash
set OPENROUTER_API_KEY=<your_key>
```

On Linux/macOS: `export OPENROUTER_API_KEY=<your_key>`

## Benchmark
Run:

```bash
uv run python scripts/benchmark.py --runs 3
```

This prints baseline-style latency stats (`avg`, `p50`, `p95`) and success rate.

**Reference metrics** (baseline on reference hardware): avg ~2900ms, p50 ~2500ms, p95 ~4700ms, ~600 tokens/request. 

### Compare baseline vs optimized

A side-by-side harness runs both `BaselineAnalyticsPipeline` (frozen original code) and `AnalyticsPipeline` (optimized) over the public prompt set and reports per-prompt + aggregate metrics:

```bash
uv run python scripts/compare_pipelines.py --runs 1 --output benchmark_results.json
```

Used to produce the numbers in `SOLUTION_NOTES.md`. The assignment's own `scripts/benchmark.py` is untouched in scope (only the `result["status"]` → `result.status` C5 fix).

## Running the full-stack app (optional UI)

In addition to the Python pipeline, this submission ships a FastAPI streaming layer + a Next.js A/B compare UI that runs both pipelines simultaneously and visualizes the optimization wins live. **Not required for grading** — the public tests and benchmark run against `src/pipeline.py` directly. The UI is for demonstration / debugging.

### Prerequisites

- Node.js 22+ and npm (for the frontend)
- Everything from the Python setup above (data + API key)

### Start the backend

```bash
export OPENROUTER_API_KEY=<your_key>          # or `set -a && source backend/.env && set +a`
uv run uvicorn server.main:app --reload --port 8000
```

This serves:
- `GET  /run/optimized?q=&run_id=` — SSE stage events from the optimized pipeline
- `GET  /run/baseline?q=&run_id=`  — SSE stage events from the frozen baseline (synthesized at completion)
- `GET  /history?limit=N`          — JSON list of past runs
- `GET  /runs/{run_id}`            — full detail for one run
- `POST /chat`                     — multi-turn chat (AI SDK v5 message shape, streams text + fenced SQL)
- `GET  /health`                   — health probe

Run history persists to `data/runs.sqlite` (auto-created, gitignored).

### Start the frontend

In a second terminal:

```bash
cd web
npm install         # first time only
npm run dev         # http://localhost:3000
```

Pages:
- `/`         — A/B Compare. Type a question; both pipelines stream side-by-side. Final metrics panel + recharts comparison once both finish.
- `/history`  — past runs with click-to-expand detail.
- `/chat`     — multi-turn follow-up questions backed by the optimized pipeline. Each assistant reply has a collapsible "How I answered (SQL)" section.

The frontend rewrites `/api/:path*` → `${NEXT_PUBLIC_API_BASE}/:path*` (default `http://localhost:8000`) so EventSource is same-origin in dev.

### Run the unit tests

39 hermetic tests (no network, no API key required) live alongside the public tests:

```bash
python3 -m unittest discover -s tests              # all 44 (5 public + 39 unit)
python3 -m unittest discover -s tests -p "test_*.py" -v
```

The grader's exact command stays scoped to `test_public.py` only:

```bash
python3 -m unittest discover -s tests -p "test_public.py"
```

## Deliverables
1. Updated source code
2. Added tests (if any)
3. Completed `CHECKLIST.md` with all sections addressed
4. Short engineering note (`SOLUTION_NOTES.md`) with:
   - What you changed
   - Why you changed it
   - Measured impact (before/after benchmark numbers)
   - Tradeoffs and next steps

## Optional Part: Multi-Turn Conversation Support

This is an **optional** part for candidates who want to demonstrate additional capabilities. It is **not required** for a complete submission, but may contribute to bonus evaluation.

### The Problem

The current pipeline handles single, isolated questions. In real-world scenarios, users often ask follow-up questions that reference previous context:

- "What is the addiction level distribution by gender?"
- Follow-up: "What about males specifically?"
- Follow-up: "Can you explain the highest value?"
- Follow-up: "Now sort by anxiety score instead"

### Implementation Guidelines

- You may implement this however you see fit: extend the existing pipeline, add new modules, or integrate directly into the LLM client.
- No skeleton code or boilerplate is provided - design the solution architecture yourself.
- If implemented, document your approach in `CHECKLIST.md` under a "Follow-Up Questions" section.

## General Notes
- The baseline intentionally leaves room for substantial optimization.
- Hidden evaluation includes paraphrased prompts and edge/failure cases.
- Public tests are integration tests and require a valid `OPENROUTER_API_KEY`.
- Think beyond the obvious optimizations - the challenge tests your engineering judgment, not just your ability to follow a checklist.