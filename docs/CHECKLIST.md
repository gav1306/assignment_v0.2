# Production Readiness Checklist

---

## Approach

- [x] **System works correctly end-to-end**

**What were the main challenges you identified?**

1. The starter code had a token limit too low, so the model used all of it for hidden thinking and returned nothing.
2. The SQL validator did not check anything, and the schema info was empty.
3. Token counting was missing.
4. The benchmark script crashed on the first run because of a small type mistake.
5. The model sometimes invented column names that did not exist.

**What was your approach?**

- Saved the original starter code into a `baseline` folder so I could compare it later without losing it.
- Fixed bugs in order: easy ones first, then the LLM client, then built the missing schema reader and SQL validator, then plugged them into the pipeline.
- Lowered the model's hidden thinking budget so real answers fit in the limit.
- Added a special signal (`cannot_answer`) so the model can clearly say when a question is out of scope instead of guessing.
- Kept streaming separate from the core pipeline so tests still work the same.
- Built a side by side view so users can see the old version and the new version run together.

---

## Observability

- [x] **Logging** (`backend/src/lib/observability.py`)
  - Each stage writes one JSON log line with the request id, stage name, status, time taken, and tokens used.

- [x] **Metrics**
  - Time taken for each stage (SQL generation, validation, execution, answer).
  - Token counts and number of LLM calls per run.
  - Average, median, and p95 latency from the comparison script.

- [x] **Tracing**
  - A `request_id` is attached to every log line and event, so logs from one run can be linked together.

---

## Validation & Quality Assurance

- [x] **SQL validation** (`backend/src/validators/sql_validator.py`)
  - Only read queries (`SELECT`, `WITH`, `UNION`) are allowed.
  - Write or schema changing operations like `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `PRAGMA` are blocked.
  - Every table and column used must exist in the database schema.
  - Queries that do not actually read from the dataset are rejected.
  - A `LIMIT 1000` is added if missing, to avoid huge result sets.
  - Multiple statements in one query are blocked.

- [x] **Answer quality**
  - The full schema is given to the model so it stops inventing column names.
  - When a question cannot be answered, the model returns a fixed signal and the system replies with one standard refusal.

- [x] **Result consistency**
  - The database is opened in read only mode.
  - Row count is capped to keep memory low.

- [x] **Error handling**
  - If the LLM returns nothing, the system treats it as unanswerable instead of crashing.
  - Network and server errors are retried automatically with backoff.
  - SQL parsing errors are caught and reported clearly.

---

## Maintainability

- [x] **Code organization**
  - Each module does one job: schema reading, SQL checking, logging, LLM calls, pipeline running.
  - Backend layers are split into routes, controllers, services, and validators.
  - The frozen baseline folder keeps the original code for comparison.

- [x] **Configuration**
  - Settings like API key, model name, token limits, and timeouts are read from environment variables.
  - Defaults are kept in one constants file.

- [x] **Error handling** (covered above).

- [x] **Documentation**
  - Every module has a short description at the top.
  - Setup and solution notes are in the `docs` folder.

---

## LLM Efficiency

- [x] **Token usage**
  - Hidden reasoning effort is set to low, which cuts wasted tokens and time roughly in half.
  - When a question is unanswerable, the second LLM call is skipped.
  - When SQL is missing or invalid, a fixed reply is used instead of calling the model again.
  - The schema is sent in a compact JSON format.

- [x] **Efficient requests**
  - Temperature is 0 for SQL (consistent output) and 0.2 for answers (slight variety).
  - One LLM client is shared across requests so connections stay warm.
  - Per call timeout of 30 seconds.

---

## Security & Threat Model

The pipeline takes free text questions from users, sends them through the LLM, and runs SQL on a database. Below is what it protects against and what it does not.

### Defenses already in place

**SQL injection and unsafe SQL**

- The SQL validator parses the query and blocks anything that is not a read query.
- Every table and column must exist in the schema.
- The database is opened read only, so even if a write got past the validator, the database would refuse it.
- A row limit is added to every query.

**LLM output handling**

- A clear signal is used when the model cannot answer, so it cannot fake an answer using unrelated columns.
- Empty or truncated responses are caught and turned into a clean refusal.
- SQL is extracted safely from JSON, markdown, or plain text replies.

**API boundary**

- Question length is capped at 2000 characters.
- CORS is restricted to allowed origins (localhost by default).
- Per call timeout limits the worst case time of one request.

### What a bad prompt can actually do

| Attack | Outcome |
| --- | --- |
| "Ignore previous instructions, DROP TABLE..." | Validator blocks it. |
| Inject SQL through natural language | Validator blocks any write or unknown table or column. |
| Reference unknown tables to leak data | Schema check and read only mode block it. |
| Force a refusal (denial of service style) | Refusal is fixed and cheap, no LLM call wasted. |
| Steal the system prompt | No secrets in it, low value. |
| Indirect injection via stored data | Not possible, dataset is static. |
| Make the answer sound off topic or rude | Possible but small risk. |

### Deliberately not implemented

- A regex check for "ignore previous instructions". Easy to bypass and adds no real value.
- A separate LLM call to detect prompt injection. Wastes tokens for a problem the validator already solves.
- Authentication, per user rate limits, and Redis quotas. Useful for a real product, not for a local assignment.
- A separate LLM judge to check if the answer matches the data. Listed as a future improvement.

---

## Testing

- [x] **Unit tests**: 39 tests, no network or API key needed. They run in 0.033 seconds.
  - Validator tests cover every accept and reject case.
  - Schema tests cover schema reading and caching.
  - Pipeline tests use a fake LLM to cover success and failure paths.

- [x] **Integration tests**
  - 5 public tests run against the real LLM API, all passing.

- [x] **Performance tests**
  - The benchmark script runs the full prompt set and reports average, median, and p95.
  - A comparison script runs both pipelines side by side and saves results to a JSON file.

- [x] **Edge case coverage**
  - Write operations, schema changes, and PRAGMA are all rejected.
  - Empty, None, or junk SQL is rejected cleanly.
  - Truncated LLM responses become a clean refusal.
  - Out of scope concepts hit the cannot answer path.
  - Multi statement and SQL injection attempts are blocked.

---

## Optional: Multi-Turn Conversation Support

- [x] **Intent detection for follow-ups**
  - The first message is sent as is. Later messages go through a rewriter that decides if context is needed.

- [x] **Context-aware SQL generation**
  - The rewriter reads the chat history and produces a standalone question that fills in pronouns and references. This standalone question is then sent to the pipeline.

- [x] **Context persistence**
  - The chat history is kept on the client. Each request includes the full history, so the server stays stateless. Each turn is also saved to a local SQLite database for the history page.

- [x] **Ambiguity resolution**
  - Pronouns and short follow ups like "What about males specifically?" are resolved by the rewriter using past messages.

**Approach summary:**

A separate chat endpoint accepts the chat history. The first turn skips the rewriter; later turns rewrite the question into a standalone form and run it through the optimized pipeline. The reply is streamed back as plain text containing the answer, the SQL used, and a short metrics line.

---

## Production Readiness Summary

**What makes your solution production-ready?**

- Each stage is logged and timed, so problems can be tracked down easily.
- Multiple layers of safety: SQL validator, read only database, row limits, and timeouts.
- All required outputs and tests are preserved and passing.
- Automatic retries and clear error handling for known failure cases.
- 39 unit tests and 5 integration tests lock in the behavior.
- A side by side view and a run history page help debug issues visually.

**Key improvements over baseline:**

| Area | Baseline | Optimized |
| --- | --- | --- |
| Public test pass rate | 0 out of 5 | 5 out of 5 |
| Comparison success rate | 0% | 91.7% |
| Token accounting | 0 (counter not wired) | Tracked per call |
| SQL validation | Always returned valid | Parses SQL, blocks writes, checks schema |
| Schema grounding | Empty | Full table, columns, sample values |
| Status classification | Errors all looked the same | Splits unanswerable, invalid SQL, error, success |
| Reasoning budget | All tokens used for hidden thinking | Capped, leaves room for output |
| Observability | None | Per stage events, logs, streaming, run history |

**Known limitations or future work:**

- No prompt caching yet. The schema is repeated in every prompt and could be cached for around 20 to 30% cost saving.
- The rewriter always runs after the first turn. It could be skipped when the question already stands alone.
- Latency is dominated by the reasoning model. A faster non reasoning model for SQL would likely cut response time roughly in half.
- No authentication, rate limits, or shared history storage. Fine for local use, not for a multi user deploy.
- The comparison script runs prompts one at a time. Could be run in parallel.
- The frontend is set up for development only and does not yet have a production build setup.

---

## Benchmark Results

Run with the comparison script against 12 prompts.

**Baseline (frozen original code):**

- Average latency: 8447 ms
- p50 latency: 9841 ms
- p95 latency: 11154 ms
- Success rate: 0.0% (every prompt failed due to the token limit bug)

**Optimized solution:**

- Average latency: 11004 ms
- p50 latency: 11328 ms
- p95 latency: 16336 ms
- Success rate: 91.7% (11 out of 12)

**LLM efficiency (optimized):**

- Average tokens per request: 1595
- Average LLM calls per request: 1.92

**Important context:** the baseline looks faster only because it fails on every prompt. The optimized pipeline takes 11 seconds per real success while the baseline takes 8.4 seconds per failure. The baseline's "0 tokens" is the broken counter, not real savings.

---

**Completed by:** Gayatri Patil
**Date:** 2026-04-26
**Time spent:** about 9 hours
