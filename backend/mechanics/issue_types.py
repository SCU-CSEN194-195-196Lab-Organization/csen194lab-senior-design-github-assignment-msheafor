from __future__ import annotations

CONFIDENCE_MIN = 0.8

ISSUE_TYPES = [
    "spelling",
    "capitalization",
    "punctuation",
    "apostrophe",
    "homophone",
    "spacing",
    "repetition",
    "stretched_word",
    "style",
    "coherence",
    "grammar",
]


def legacy_type_for(issue_type: str) -> str:
    match issue_type:
        case "punctuation":
            return "punctuation"
        case "coherence":
            return "coherence"
        case "style":
            return "voice"
        case "repetition" | "stretched_word":
            return "clarity"
        case _:
            return "grammar"


def make_card(
    issue_type: str,
    title: str,
    body: str,
    micro_edit: str | None = None,
    confidence: float = 0.9,
) -> dict:
    return {
        "issueType": issue_type,
        "type": legacy_type_for(issue_type),
        "title": title,
        "body": body,
        "micro_edit": micro_edit,
        "confidence": confidence,
    }
