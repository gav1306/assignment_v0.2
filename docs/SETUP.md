# Local Setup

This guide assumes a fresh machine. It walks through every prerequisite, the dataset download, environment configuration, and the commands needed to run the backend, the frontend, and the test suites.

If anything is unclear, reach for `docs/CHECKLIST.md` (architecture and design decisions) or `docs/SOLUTION_NOTES.md` (what changed and why).

---

## 1. Prerequisites

You will need:

- **macOS, Linux, or WSL2 on Windows.** The instructions below assume a POSIX shell (`bash` or `zsh`).
- **Python 3.13 or newer**, installed by `uv` automatically on first sync.
- **Node.js 22 or newer** for the frontend.
- **pnpm** as the JavaScript package manager (this project uses pnpm only; do not use npm or yarn).
- **git** for cloning.
- A **Kaggle account** for downloading the dataset (free signup).
- An **OpenRouter account** for the LLM API key (free tier is enough for the test suite).

### Install `uv` (manages Python and the backend deps)

macOS:

```bash
brew install uv
```

Linux or WSL2:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify:

```bash
uv --version
```

### Install Node.js plus pnpm

If you do not have Node, install it via your platform package manager (`brew install node`, `apt install nodejs npm`, etc.) or via [nvm](https://github.com/nvm-sh/nvm). Then install pnpm:

```bash
npm install -g pnpm
pnpm --version
```

(npm is only used here as the bootstrap to install pnpm itself; you will not run `npm install` for this project.)

---

## 2. Clone the repository

```bash
git clone <repo-url> assignment_v0.2
cd assignment_v0.2
```

The repo has three top-level directories of interest:

- `backend/`: Python pipeline, FastAPI app, tests, scripts.
- `frontend/`: Next.js 16 app (A/B compare, history, multi-turn chat).
- `docs/`: this file plus `CHECKLIST.md`, `SOLUTION_NOTES.md`, and `ISSUES.md`.

---

## 3. Download the dataset (Kaggle)

The pipeline runs against a single SQLite table built from the Kaggle "Gaming and Mental Health" CSV (~160 MB, 10 million rows, 39 columns). The CSV is **not** committed to the repo.

1. Sign in at [Kaggle](https://www.kaggle.com/).
2. Open the dataset page: [Gaming and Mental Health](https://www.kaggle.com/datasets/sharmajicoder/gaming-and-mental-health?select=gaming_mental_health_10M_40features.csv).
3. Download `gaming_mental_health_10M_40features.csv`. Make sure all 39 columns are present; do not drop any during download or import.
4. Place the file at:

```
backend/data/gaming_mental_health_10M_40features.csv
```

Create the directory first if it does not exist:

```bash
mkdir -p backend/data
```

---

## 4. Backend setup

### 4.1 Install Python deps

From the repo root:

```bash
cd backend
uv sync
```

This installs Python 3.13 (if your system does not already have it) and every dependency pinned in `backend/uv.lock` into `backend/.venv`. No `pip install` step is needed.

### 4.2 Configure environment variables

Copy the example file and fill in the OpenRouter key:

```bash
cp .env.example .env
```

Open `backend/.env` in your editor. The committed `backend/.env.example` looks like this:

```
OPENROUTER_API_KEY=sk-or-v1-...

OPENROUTER_MODEL=openai/gpt-5-nano

OPENROUTER_TIMEOUT_MS=30000

OPENROUTER_MAX_TOKENS_SQL=2048

OPENROUTER_MAX_TOKENS_ANSWER=800

LOG_LEVEL=INFO

CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

To get an `OPENROUTER_API_KEY`:

1. Create an account at [openrouter.ai](https://openrouter.ai/).
2. Open account settings and create an API key.
3. Paste it into `backend/.env` in place of `sk-or-v1-...`.

The default `OPENROUTER_MODEL` (`openai/gpt-5-nano`) is on the free tier and is the model the test suite expects.

### 4.3 Build the SQLite database from the CSV

Still inside `backend/`:

```bash
uv run python scripts/gaming_csv_to_db.py
```

This streams the CSV in 50k-row chunks, infers column types, and writes `backend/data/gaming_mental_health.sqlite`. Expect a few minutes on a first run because the file is large. The script prints chunk-by-chunk progress and a final verification block (row count, column list, and a couple of sample distributions).

If the table already exists from a prior run, pass `--if-exists replace` to overwrite, or `--if-exists append` to add to it.

### 4.4 Run the public test suite

```bash
uv run python -m unittest discover -s tests -p "test_public.py"
```

Expected: 5 tests, all passing in roughly 30 to 40 seconds. These hit the real OpenRouter API; the `OPENROUTER_API_KEY` from `backend/.env` is required.

To run the full suite (44 tests; 39 are hermetic with no API key needed):

```bash
uv run python -m unittest discover -s tests
```

### 4.5 Run the FastAPI backend

```bash
uv run uvicorn src.main:app --reload --port 8000
```

This serves:

- `GET /run/optimized?q=&run_id=`: SSE stream of stage events from the optimized pipeline.
- `GET /run/baseline?q=&run_id=`: SSE stream from the frozen baseline (events synthesized at completion).
- `GET /history?limit=N`: JSON list of past runs.
- `GET /runs/{run_id}`: full detail for one run.
- `POST /chat`: multi-turn chat (AI SDK v5 message shape).
- `GET /config`: current model name (used by the frontend footer).
- `GET /health`: health probe.

Run history persists to `backend/data/runs.sqlite`, which is auto-created and gitignored.

### 4.6 Optional: benchmark scripts

```bash
# Assignment-provided benchmark (avg / p50 / p95)
uv run python scripts/benchmark.py --runs 3

# Side-by-side baseline vs optimized
uv run python scripts/compare_pipelines.py --runs 1 --output benchmark_results.json
```

The second command writes `benchmark_results.json` to the project root.

---

## 5. Frontend setup

Open a second terminal so the backend keeps running.

```bash
cd frontend
cp .env.example .env
```

`frontend/.env.example` contains a single line:

```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

Leave it as-is for local development. Then install deps and start the dev server:

```bash
pnpm install
pnpm dev
```

The app boots at [http://localhost:3000](http://localhost:3000).

Pages:

- `/`: A/B Compare. Type a question; the baseline and optimized pipelines stream side by side, then a metrics panel and a recharts comparison render once both finish.
- `/history`: paginated list of past runs with click-to-expand detail per row.
- `/chat`: multi-turn follow-up questions backed by the optimized pipeline. Each assistant reply has a collapsible "How I answered (SQL)" section.

The frontend rewrites `/api/:path*` to `${NEXT_PUBLIC_API_BASE}/:path*` (default `http://localhost:8000`) so EventSource is same-origin in dev.

---

## 6. Quick sanity checklist

Once both servers are up, walk through this short list to confirm everything is wired correctly:

1. Open `http://localhost:8000/health` in a browser; you should see `{"status":"ok"}`.
2. Open `http://localhost:3000`; the A/B compare page should render with the question input visible.
3. Submit a question like "What are the top 5 age groups by average addiction level?". Both pipeline columns should populate; the optimized side streams stage-by-stage, the baseline side fills in once at the end.
4. Visit `/history`; the run you just submitted should appear with both baseline and optimized blocks populated.
5. Visit `/chat`; ask a first question, then a pronoun-bearing follow-up like "What about males specifically?". The standalone-question rewrite plus the SQL fence should both appear in the assistant reply.

---

The persisted state lives in:

- `backend/data/gaming_mental_health.sqlite` (the dataset; reusable across runs).
- `backend/data/runs.sqlite` (run history; safe to delete to reset history).

Neither is committed; both are gitignored.
