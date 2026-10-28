from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

_DATA_DIR = Path(os.environ.get("DATA_DIR", "") or Path(__file__).parent.parent / "data")
_PROFILE_PATH = _DATA_DIR / "profile-store.json"

HEDGE_WORDS = [
    "maybe", "perhaps", "possibly", "probably", "likely", "seemingly",
    "apparently", "presumably", "arguably", "supposedly", "allegedly",
    "somewhat", "fairly", "rather", "quite", "sort of", "kind of",
    "i think", "i believe", "i feel", "it seems", "it appears",
]

_HEDGE_PATTERNS = [re.compile(r"\b" + re.escape(h) + r"\b", re.IGNORECASE) for h in HEDGE_WORDS]


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\b[a-zA-Z']+\b", text.lower())


def _count_matches(text: str, pattern: re.Pattern) -> int:
    return len(pattern.findall(text))


def create_empty_profile() -> dict:
    return {
        "requests": 0,
        "totalWords": 0,
        "totalSentences": 0,
        "longSentenceCount": 0,
        "commaSpliceSignals": 0,
        "repeatedPunctuationSignals": 0,
        "missingTerminalPunctuationSignals": 0,
        "doubleSpaceSignals": 0,
        "contractionCount": 0,
        "firstPersonCount": 0,
        "hedgeCounts": {},
        "updatedAt": None,
    }


def analyze_writing_signals(text: str) -> dict:
    trimmed = str(text or "").strip()
    sentence_parts = [s.strip() for s in re.split(r"(?<=[.!?])\s+", trimmed) if s.strip()]
    sentences = sentence_parts if sentence_parts else ([trimmed] if trimmed else [])
    words = _tokenize(trimmed)
    word_count = len(words)

    sentence_word_counts = [len(_tokenize(s)) for s in sentences if _tokenize(s)]
    long_sentence_count = sum(1 for n in sentence_word_counts if n >= 30)

    comma_splice_signals = len(re.findall(
        r"\b[^.!?\n]{6,},\s+[a-z]+\s+(?:i|you|we|they|he|she|it)\b", trimmed, re.IGNORECASE
    ))
    repeated_punctuation_signals = len(re.findall(r"[!?]{2,}|\.{4,}", trimmed))
    double_space_signals = len(re.findall(r" {2,}", trimmed))

    missing_terminal = 0
    for s in sentences:
        if len(_tokenize(s)) >= 7 and not re.search(r"[.!?]$", s):
            missing_terminal += 1

    contraction_count = len(re.findall(r"\b\w+'(?:t|s|m|re|ve|ll|d)\b", trimmed, re.IGNORECASE))
    first_person_count = len(re.findall(r"\b(i|me|my|mine|we|our|ours|us)\b", trimmed, re.IGNORECASE))

    hedge_counts: dict[str, int] = {}
    for hedge, pattern in zip(HEDGE_WORDS, _HEDGE_PATTERNS):
        c = _count_matches(trimmed, pattern)
        if c > 0:
            hedge_counts[hedge] = c

    return {
        "wordCount": word_count,
        "sentenceCount": len(sentences),
        "longSentenceCount": long_sentence_count,
        "commaSpliceSignals": comma_splice_signals,
        "repeatedPunctuationSignals": repeated_punctuation_signals,
        "missingTerminalPunctuationSignals": missing_terminal,
        "doubleSpaceSignals": double_space_signals,
        "contractionCount": contraction_count,
        "firstPersonCount": first_person_count,
        "hedgeCounts": hedge_counts,
    }


def merge_profile(profile: dict, signals: dict) -> dict:
    next_p = {**(profile or create_empty_profile())}
    next_p["requests"] = next_p.get("requests", 0) + 1
    next_p["totalWords"] = next_p.get("totalWords", 0) + signals.get("wordCount", 0)
    next_p["totalSentences"] = next_p.get("totalSentences", 0) + signals.get("sentenceCount", 0)
    next_p["longSentenceCount"] = next_p.get("longSentenceCount", 0) + signals.get("longSentenceCount", 0)
    next_p["commaSpliceSignals"] = next_p.get("commaSpliceSignals", 0) + signals.get("commaSpliceSignals", 0)
    next_p["repeatedPunctuationSignals"] = next_p.get("repeatedPunctuationSignals", 0) + signals.get("repeatedPunctuationSignals", 0)
    next_p["missingTerminalPunctuationSignals"] = next_p.get("missingTerminalPunctuationSignals", 0) + signals.get("missingTerminalPunctuationSignals", 0)
    next_p["doubleSpaceSignals"] = next_p.get("doubleSpaceSignals", 0) + signals.get("doubleSpaceSignals", 0)
    next_p["contractionCount"] = next_p.get("contractionCount", 0) + signals.get("contractionCount", 0)
    next_p["firstPersonCount"] = next_p.get("firstPersonCount", 0) + signals.get("firstPersonCount", 0)
    next_p["updatedAt"] = datetime.now(timezone.utc).isoformat()

    hedge = {**next_p.get("hedgeCounts", {})}
    for term, count in (signals.get("hedgeCounts") or {}).items():
        hedge[term] = hedge.get(term, 0) + count
    next_p["hedgeCounts"] = hedge
    return next_p


def summarize_profile(profile: dict) -> dict:
    p = profile or create_empty_profile()
    total_sentences = max(p.get("totalSentences", 0), 1)
    total_words = max(p.get("totalWords", 0), 1)

    sorted_hedges = sorted(
        (p.get("hedgeCounts") or {}).items(), key=lambda x: x[1], reverse=True
    )[:3]

    return {
        "requests": p.get("requests", 0),
        "avgSentenceLength": round(p.get("totalWords", 0) / total_sentences, 1),
        "longSentenceRate": round(p.get("longSentenceCount", 0) / total_sentences, 3),
        "contractionRate": round(p.get("contractionCount", 0) / total_words, 3),
        "firstPersonRate": round(p.get("firstPersonCount", 0) / total_words, 3),
        "commaSpliceSignals": p.get("commaSpliceSignals", 0),
        "repeatedPunctuationSignals": p.get("repeatedPunctuationSignals", 0),
        "missingTerminalPunctuationSignals": p.get("missingTerminalPunctuationSignals", 0),
        "doubleSpaceSignals": p.get("doubleSpaceSignals", 0),
        "topHedges": [{"term": t, "count": c} for t, c in sorted_hedges],
        "updatedAt": p.get("updatedAt"),
    }


def _ensure_data_dir() -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)


async def read_profile_store() -> dict:
    try:
        return json.loads(_PROFILE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


async def append_profile(user_id: str, summary: str, signals: dict) -> dict:
    _ensure_data_dir()
    store = await read_profile_store()
    prev = store.get(user_id) or {"notes": [], "profile": create_empty_profile(), "updatedAt": None}
    notes = prev.get("notes") or []
    notes.append({"at": datetime.now(timezone.utc).isoformat(), "summary": summary})
    if len(notes) > 40:
        notes = notes[-40:]
    prev["notes"] = notes
    prev["profile"] = merge_profile(prev.get("profile") or create_empty_profile(), signals or analyze_writing_signals(""))
    prev["updatedAt"] = datetime.now(timezone.utc).isoformat()
    store[user_id] = prev
    _PROFILE_PATH.write_text(json.dumps(store, indent=2), encoding="utf-8")
    return summarize_profile(prev["profile"])


async def append_user_draft(user_id: str, text: str) -> None:
    _ensure_data_dir()
    store = await read_profile_store()
    prev = store.get(user_id) or {"notes": [], "profile": create_empty_profile(), "updatedAt": None}
    drafts = prev.get("drafts") or []
    trimmed = str(text or "").strip()[:12000]
    if not trimmed:
        return
    import random, string
    rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    drafts.append({
        "id": f"user-draft:{int(datetime.now(timezone.utc).timestamp() * 1000)}:{rand_suffix}",
        "source": "user-draft-history",
        "text": trimmed,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })
    prev["drafts"] = drafts[-25:]
    prev["updatedAt"] = datetime.now(timezone.utc).isoformat()
    store[user_id] = prev
    _PROFILE_PATH.write_text(json.dumps(store, indent=2), encoding="utf-8")


async def apply_dismiss(user_id: str, event: dict) -> dict:
    _ensure_data_dir()
    store = await read_profile_store()
    prev = store.get(user_id) or {"notes": [], "profile": create_empty_profile(), "updatedAt": None}
    notes = prev.get("notes") or []
    title = str(event.get("title") or "item")[:200]
    notes.append({"at": datetime.now(timezone.utc).isoformat(), "summary": f"dismissed suggestion: {title}"})
    if len(notes) > 40:
        notes = notes[-40:]
    prev["notes"] = notes
    prev["updatedAt"] = datetime.now(timezone.utc).isoformat()
    store[user_id] = prev
    _PROFILE_PATH.write_text(json.dumps(store, indent=2), encoding="utf-8")
    return summarize_profile(prev.get("profile") or create_empty_profile())
