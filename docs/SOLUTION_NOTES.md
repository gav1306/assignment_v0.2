# Solution Notes

## What changed

### Critical bug fixes

| #   | File                                                                                       | Change                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `backend/src/services/llm_service.py`                                                      | Raised the token limit from 240 to 2048 so the model has room for both thinking and output.                                                                              |
| C1  | `backend/src/services/llm_service.py`                                                      | Set reasoning effort to low. Public tests went from random failures to 5 out of 5 in 33 seconds.                                                                         |
| C2  | `backend/src/services/llm_service.py`                                                      | Empty LLM responses now raise a clear error. The pipeline treats them as unanswerable instead of crashing.                                                               |
| C3  | `backend/src/services/pipeline_service.py`, `backend/src/validators/sql_validator.py`      | Replaced the empty SQL validator with a real one. It blocks writes, schema changes, multi statement queries, and unknown tables or columns. Adds a row limit if missing. |
| C4  | `backend/src/services/llm_service.py`                                                      | Added token counting using the response usage info.                                                                                                                      |
| C5  | `backend/scripts/benchmark.py`                                                             | Fixed a one line type mistake that crashed the script.                                                                                                                   |
| C6  | `backend/src/services/pipeline_service.py`                                                 | Status now clearly splits into unanswerable, invalid SQL, error, or success.                                                                                             |
| C7  | `backend/src/services/pipeline_service.py`, `backend/src/database/schema_introspection.py` | Schema (table, columns, sample values) is now passed into the SQL prompt. It used to be empty.                                                                           |

### New modules

- **`backend/src/database/schema_introspection.py`**: reads the database schema in read only mode and caches it.
- **`backend/src/validators/sql_validator.py`**: SQL validator using `sqlglot`. Returns a result with valid flag, cleaned up SQL, and error message.
- **`backend/src/models/event_models.py`**: simple stage event types for streaming progress out of the pipeline.
- **`backend/src/lib/observability.py`**: JSON logging using Python's standard logging. Opt in at startup.

### Pipeline changes

- Loads the schema once and reuses it for every SQL call.
- Added a clear signal for unanswerable questions. When the model returns this signal, the pipeline skips the rest and returns a fixed refusal. This stops the model from faking answers using unrelated columns.
- Database is opened read only as a second layer of safety.
- Stage events can be streamed out through a callback. Public tests pass nothing and behave the same as before.

### Frozen baseline preserved

- The original starter code is kept in a `baseline` folder with only the class names changed. Bugs are kept on purpose for honest comparison.

### Streaming layer

- A FastAPI server streams stage events to the browser using server sent events.
- Run history is saved in a small SQLite file and shown on a history page.
- A separate chat endpoint accepts the chat history, rewrites the latest message into a standalone question using context, and runs it through the pipeline.

### Frontend

- Built with Next.js, React, Tailwind, and shadcn/ui.
- **A/B Compare** page: query input runs both pipelines side by side and shows latency and token charts when both finish.
- **Run History** page: paginated list with click to expand details.
- **Chat** page: multi turn chat with each answer showing the SQL used in a collapsible block.

### Tests

- 39 unit tests added. They run in 33 ms with no network or API key.
- The provided public test file is unchanged. All 5 tests pass in 31 seconds.

### Tooling

- A new compare script runs both pipelines on the same prompts and saves results to JSON.
- Optional Dockerfile and entrypoint for hosted deploys. The entrypoint downloads the dataset on first boot if missing. Local development does not need Docker.

---

## Why

Each change maps to an item in `docs/ISSUES.md`:

- **C1 to C7** are the critical bug fixes listed above.
- **H1** schema reading is in `schema_introspection.py`.
- **H2** real SQL validator is in `sql_validator.py`.
- **H3** result validation is partly covered by the row limit.
- **H4** answer quality is protected by the unanswerable signal and the fixed refusal.
- **H5** observability is the JSON logging plus stage events plus streaming.
- **H6** retries and timeouts use the SDK's built in retry config and a 30 second timeout.
- **H7** read only database mode is enabled in the executor.
- **H8** uniform refusal is used across all unanswerable, invalid, or failed paths.
- **H9** unit tests are the 39 new tests.
- **H10** deliverables are this file, the checklist, the issues audit, and the setup guide.

---

## Measured impact

### Public test suite

|           | Before              | After      |
| --------- | ------------------- | ---------- |
| Pass rate | 0 out of 5          | 5 out of 5 |
| Time      | timed out or failed | 31 s       |

### Comparison script (12 prompts)

| Metric          | Baseline           | Optimized |
| --------------- | ------------------ | --------- |
| Success rate    | 0.0%               | 91.7%     |
| Average latency | 8447 ms            | 11004 ms  |
| p50 latency     | 9841 ms            | 11328 ms  |
| p95 latency     | 11154 ms           | 16336 ms  |
| Average tokens  | 0 (counter broken) | 1595      |
| Total LLM calls | 0 (counter broken) | 23        |

**How to read these numbers.** The baseline looks faster only because it fails on every prompt. Comparing 8.4 seconds per failure to 11 seconds per success is not a fair comparison. The "0 tokens" is the broken counter, not real savings.

### Unit tests

| Suite                   | Count  | Time        | Network |
| ----------------------- | ------ | ----------- | ------- |
| `test_validator.py`     | 23     | under 30 ms | no      |
| `test_schema.py`        | 7      | under 5 ms  | no      |
| `test_pipeline_unit.py` | 9      | under 5 ms  | no      |
| `test_public.py`        | 5      | 31 s        | yes     |
| **Total**               | **44** | 31.2 s      | mixed   |

### Reasoning effort tuning

Same prompt run 5 times, before and after setting reasoning effort to low:

|                    | Success rate | Median tokens | Median latency |
| ------------------ | ------------ | ------------- | -------------- |
| Without low effort | 3 out of 5   | about 2100    | about 13 s     |
| With low effort    | 5 out of 5   | 1666          | about 12 s     |

The reliability win is the main gain; token savings are a small bonus.

---

## Tradeoffs

- **Signal vs structured output.** A JSON schema response would be cleaner, but the prompt based signal is simpler and works today. Listed as a next step.
- **Chat uses the AI SDK, the rest does not.** The pipeline streams stage events, not chat tokens. Plain server sent events fit better there, while the AI SDK fits the chat page well.
- **Reasoning model is slow.** A faster non reasoning model for SQL would likely cut response time roughly in half. Not implemented to keep the change small.
- **No prompt caching.** Could save around 20 to 30% on tokens. Skipped to keep the code simple.
- **Docker is optional.** Local development does not need it.

---

## Next steps if I had another day

1. Prompt caching for the system prompt and schema. Easy 20% token saving.
2. Two model setup: a fast model for SQL, the reasoning model only for the final answer. Likely halves response time.
3. JSON schema response format for SQL, removing the need to extract SQL with regex.
4. Result shape checks before passing rows to the answer model.
