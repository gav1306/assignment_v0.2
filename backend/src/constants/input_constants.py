"""Input-size guards applied at the HTTP boundary.

Defense against pathological prompts blowing the LLM token budget. Not a
security boundary on its own (the SQL validator + read-only SQLite handle that),
just a cheap input-hygiene check.
"""

from __future__ import annotations


MAX_QUESTION_CHARS: int = 2000
