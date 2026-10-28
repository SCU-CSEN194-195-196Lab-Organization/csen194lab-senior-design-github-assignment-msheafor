from __future__ import annotations

import re

ALLOWED_TYPES = {
    "pattern", "coherence", "clarity", "grammar", "punctuation", "voice",
    "spelling", "capitalization", "apostrophe", "homophone", "spacing",
    "repetition", "stretched_word", "style", "tone", "organization", "audience",
}

_CURLY_QUOTES = str.maketrans({"“": '"', "”": '"', "‘": "'", "’": "'"})


def _normalize(s: str) -> str:
    return str(s or "").lower().translate(_CURLY_QUOTES)


def extract_quoted_phrases(text: str, min_len: int = 3) -> list[str]:
    out = []
    for m in re.finditer(r'"([^"]+)"', str(text or "")):
        inner = m.group(1).strip()
        if len(inner) >= min_len:
            out.append(inner)
    for m in re.finditer(r'“([^”]+)”', str(text or "")):
        inner = m.group(1).strip()
        if len(inner) >= min_len:
            out.append(inner)
    return out


def drop_malformed(suggestions: list) -> list:
    if not isinstance(suggestions, list):
        return []
    return [s for s in suggestions if str(s.get("title") or "").strip() or str(s.get("body") or "").strip()]


def filter_quoted_evidence(suggestions: list, user_text: str) -> list:
    if not isinstance(suggestions, list):
        return []
    hay = _normalize(user_text)
    out = []
    for s in suggestions:
        blob = f"{s.get('title', '')} {s.get('body', '')}"
        phrases = extract_quoted_phrases(blob)
        if not phrases or all(_normalize(p) in hay for p in phrases):
            out.append(s)
    return out


def allow_known_types(suggestions: list) -> list:
    if not isinstance(suggestions, list):
        return []
    return [
        s for s in suggestions
        if str(s.get("issueType") or "").lower() in ALLOWED_TYPES
        or str(s.get("type") or "").lower() in ALLOWED_TYPES
    ]


def apply_deterministic_guardrails(suggestions: list, user_text: str = "") -> list:
    out = drop_malformed(suggestions)
    return allow_known_types(out)


def apply_coaching_guardrails(suggestions: list, user_text: str = "", max_count: int = 10) -> list:
    out = drop_malformed(suggestions)
    out = allow_known_types(out)
    out = filter_quoted_evidence(out, user_text)
    return out[:max_count] if max_count > 0 else out
