"""OpenRouter LLM client tunables. Override per env var documented inline."""

from __future__ import annotations


DEFAULT_MODEL: str = "openai/gpt-5-nano"

DEFAULT_MAX_COMPLETION_TOKENS_SQL: int = 2048
DEFAULT_MAX_COMPLETION_TOKENS_ANSWER: int = 800
DEFAULT_MAX_COMPLETION_TOKENS_REWRITE: int = 300
DEFAULT_TIMEOUT_MS: int = 30_000

# Reasoning effort caps the hidden-reasoning token budget for reasoning models
# like gpt-5-nano. "low" gives deterministic, fast output for translation-style
# tasks (SQL generation, summarization) and prevents the model from blowing the
# completion budget on reasoning before any visible output is emitted.
DEFAULT_REASONING_EFFORT_SQL: str = "low"
DEFAULT_REASONING_EFFORT_ANSWER: str = "low"

DEFAULT_RETRY_INITIAL_MS: int = 500
DEFAULT_RETRY_MAX_MS: int = 4_000
DEFAULT_RETRY_EXPONENT: float = 2.0
DEFAULT_RETRY_MAX_ELAPSED_MS: int = 20_000

ENV_OPENROUTER_API_KEY: str = "OPENROUTER_API_KEY"
ENV_OPENROUTER_MODEL: str = "OPENROUTER_MODEL"
ENV_TIMEOUT_MS: str = "OPENROUTER_TIMEOUT_MS"
ENV_MAX_TOKENS_SQL: str = "OPENROUTER_MAX_TOKENS_SQL"
ENV_MAX_TOKENS_ANSWER: str = "OPENROUTER_MAX_TOKENS_ANSWER"
