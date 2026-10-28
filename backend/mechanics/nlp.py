from __future__ import annotations
import re

HEDGE_WORDS = ["like", "basically", "literally", "honestly", "actually", "kind", "sort"]


def tokenize(text: str) -> list[str]:
    return [t for t in re.sub(r"[^a-z0-9\s']", " ", text.lower()).split() if t]


def count_matches(text: str, pattern: re.Pattern) -> int:
    return len(pattern.findall(str(text or "")))
