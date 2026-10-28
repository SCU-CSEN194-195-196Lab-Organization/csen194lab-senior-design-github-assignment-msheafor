from __future__ import annotations
import re

_VERB_LIKE = set(
    "is are was were am be been being have has had do does did go went come came get got "
    "make made take took see saw know knew think thought say said want need like love hate "
    "run ran walk walked talk talked watch watched read write wrote work worked live lived "
    "play played help helped look looked feel felt seem seemed become became leave left keep "
    "kept start started stop stopped end ended begin began grow grew turn turned move moved "
    "open opened close closed use used try tried".split()
)

_COORDINATOR = set("and or but nor yet so for".split())

_WHIMSICAL_PASSAGE = re.compile(
    r"\b(?:purple|invisible|silent|angry|happy)\s+\w+\s+(?:negotiate|whisper|calculate|debate|sing|dance)\b",
    re.IGNORECASE,
)


def is_serial_noun_list(segment: str) -> bool:
    m = re.search(
        r"\b([a-z]{3,})\s+([a-z]{3,})\s+([a-z]{3,})\s+and\s+([a-z]{3,})\b",
        str(segment),
        re.IGNORECASE,
    )
    if not m or "," in segment:
        return False
    words = [m.group(i).lower() for i in range(1, 5)]
    return not any(w in _COORDINATOR or w in _VERB_LIKE for w in words)


def is_semantically_unusual_but_valid(text: str) -> bool:
    t = str(text or "")
    if not _WHIMSICAL_PASSAGE.search(t):
        return False
    if len(t) > 600:
        return False
    return True


def whimsical_passage_match_count(text: str) -> int:
    return len(_WHIMSICAL_PASSAGE.findall(str(text or "")))
