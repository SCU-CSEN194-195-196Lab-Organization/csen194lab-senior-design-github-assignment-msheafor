from __future__ import annotations
import re


def is_likely_gibberish_token(raw: str) -> bool:
    w = str(raw or "").lower()
    if len(w) < 4:
        return False
    if re.search(r"[0-9\[\]{}_@#|\\/-]", w):
        return True
    vowels = len(re.findall(r"[aeiouy]", w, re.IGNORECASE))
    if len(w) >= 5 and vowels / len(w) < 0.12:
        return True
    if re.search(r"[bcdfghjklmnpqrstvwxz]{4,}", w, re.IGNORECASE):
        return True
    if re.search(r"(.)\1{3,}", w):
        return True
    return False


def count_meaningful_tokens(text: str) -> dict:
    tokens = re.findall(r"\b[a-zA-Z]{3,}\b", str(text or ""))
    meaningful = sum(1 for t in tokens if not is_likely_gibberish_token(t))
    return {"total": len(tokens), "meaningful": meaningful}


def draft_looks_like_keyboard_mash(text: str) -> bool:
    result = count_meaningful_tokens(text)
    if result["total"] < 4:
        return False
    return result["meaningful"] / result["total"] < 0.4
