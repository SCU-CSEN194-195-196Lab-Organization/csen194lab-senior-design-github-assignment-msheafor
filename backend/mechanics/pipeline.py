from __future__ import annotations
import re

from .issue_types import CONFIDENCE_MIN, make_card
from .heuristics import (
    obvious_spelling_grammar_heuristics,
    spell_dictionary_suggestions,
    heuristic_suggestions,
    collect_punctuation_mechanics,
    is_spellchecker_ready,
)
from .mechanics_detect import (
    is_semantically_unusual_but_valid,
    whimsical_passage_match_count,
    is_serial_noun_list,
)
from .format_utils import dedup_suggestion_titles
from .prioritize import prioritize_suggestions

__all__ = ["finalize_mechanics_suggestions", "is_spellchecker_ready"]

PASS_ORDER = [
    "spelling", "homophone", "apostrophe", "spacing", "capitalization",
    "punctuation", "grammar", "coherence", "repetition", "stretched_word", "style",
]

NAMED_ENTITIES = [
    (re.compile(r"\bnew york\b", re.I), "New York", 0.97),
    (re.compile(r"\bmicrosoft\b", re.I), "Microsoft", 0.97),
    (re.compile(r"\bacme corporation\b", re.I), "Acme Corporation", 0.95),
    (re.compile(r"\bsarah\b", re.I), "Sarah", 0.96),
    (re.compile(r"\bchicago\b", re.I), "Chicago", 0.96),
    (re.compile(r"\bparis\b", re.I), "Paris", 0.96),
    (re.compile(r"\blondon\b", re.I), "London", 0.96),
    (re.compile(r"\bcanada\b", re.I), "Canada", 0.96),
    (re.compile(r"\bmichael\b", re.I), "Michael", 0.95),
]


def _extract_quoted_from_title(s: str) -> str | None:
    m = re.search(r'["“]([^"”]{1,120})["”]', str(s or ""))
    return m.group(1).strip() if m else None


def find_span_for_phrase(phrase: str, content: str) -> dict | None:
    p = str(phrase or "").strip()
    if not p or not content:
        return None
    idx = content.lower().find(p.lower())
    if idx != -1:
        return {"start": idx, "end": idx + len(p)}
    parts = [w for w in re.sub(r"\s+", " ", p).split(" ") if w]
    if len(parts) > 1:
        escaped = r"\s+".join(re.escape(w) for w in parts)
        m = re.search(escaped, content, re.I)
        if m:
            return {"start": m.start(), "end": m.end()}
    if len(parts) == 1 and re.match(r"^\w+$", parts[0]):
        m = re.search(rf"\b{re.escape(parts[0])}\b", content, re.I)
        if m:
            return {"start": m.start(), "end": m.end()}
    return None


def _spans_overlap(a: dict, b: dict) -> bool:
    return a["start"] < b["end"] and b["start"] < a["end"]


def _attach_span(card: dict, content: str) -> dict:
    phrase = _extract_quoted_from_title(card.get("title", ""))
    if not phrase:
        return {**card, "span": None}
    return {**card, "span": find_span_for_phrase(phrase, content)}


def detect_named_entity_cards(text: str) -> list[dict]:
    t = str(text or "")
    out: list[dict] = []
    covered: list[dict] = []
    for pattern, fix, confidence in NAMED_ENTITIES:
        if confidence < CONFIDENCE_MIN:
            continue
        for m in pattern.finditer(t):
            raw = m.group(0)
            span = find_span_for_phrase(raw, t)
            if not span:
                continue
            if any(_spans_overlap(c, span) for c in covered):
                continue
            covered.append(span)
            out.append(make_card("capitalization", f"Capitalization: \"{raw}\"",
                                 f"Use the standard form **{fix}**.", fix, confidence))
    return out


def material_text_change(original: str, corrected: str) -> bool:
    a = re.sub(r"\s+", " ", str(original or "")).strip()
    b = re.sub(r"\s+", " ", str(corrected or "")).strip()
    if a == b:
        return False
    min_len = min(len(a), len(b))
    max_len = max(len(a), len(b))
    if max_len == 0:
        return False
    return (max_len - min_len) / max_len > 0.02 or a.lower() != b.lower()


def apply_pre_punctuation_corrections(text: str, cards: list[dict]) -> str:
    out = str(text or "")
    applicable = [
        c for c in cards
        if (c.get("confidence") or 1) >= CONFIDENCE_MIN
        and c.get("micro_edit")
        and c.get("issueType") in {"spelling", "apostrophe", "spacing", "homophone"}
    ]
    for c in applicable:
        phrase = _extract_quoted_from_title(c.get("title", ""))
        if not phrase:
            continue
        escaped = re.escape(phrase)
        if re.search(rf"\b{escaped}\b", out, re.I):
            out = re.sub(rf"\b{escaped}\b", c["micro_edit"], out, count=1, flags=re.I)
    return out


def filter_by_confidence(cards: list[dict], min_conf: float = CONFIDENCE_MIN) -> list[dict]:
    return [c for c in cards if (c.get("confidence") or 0.9) >= min_conf]


def dedupe_overlapping_spans(cards: list[dict], content: str) -> list[dict]:
    with_span = sorted(
        [_attach_span(c, content) for c in cards],
        key=lambda c: -(c.get("confidence") or 0),
    )
    kept: list[dict] = []
    for card in with_span:
        if not card.get("span"):
            kept.append(card)
            continue
        if any(k.get("span") and _spans_overlap(k["span"], card["span"]) for k in kept):
            continue
        kept.append(card)
    return [{k: v for k, v in c.items() if k != "span"} for c in kept]


def suppress_punctuation_noise_near_run_on(cards: list[dict]) -> list[dict]:
    run_ons = [
        c for c in cards
        if c.get("issueType") == "punctuation"
        and re.search(r"run-on", c.get("title", ""), re.I)
        and (c.get("confidence") or 0) >= 0.88
    ]
    if not run_ons:
        return cards
    run_spans = [c["span"] for c in run_ons if c.get("span")]
    if not run_spans:
        return cards

    def keep(c: dict) -> bool:
        if c.get("issueType") != "punctuation" or re.search(r"run-on", c.get("title", ""), re.I):
            return True
        if (c.get("confidence") or 0) >= 0.9:
            return True
        if not c.get("span"):
            return True
        return not any(_spans_overlap(r, c["span"]) for r in run_spans)

    return [c for c in cards if keep(c)]


def _drop_redundant_capitalization(cards: list[dict], content: str) -> list[dict]:
    entity_cards = [
        c for c in cards
        if c.get("issueType") == "capitalization" and re.search(r"Capitalization:", c.get("title", ""), re.I)
    ]
    entity_spans = [_attach_span(c, content).get("span") for c in entity_cards]
    entity_spans = [s for s in entity_spans if s]

    def keep(c: dict) -> bool:
        if c.get("issueType") != "capitalization" or not entity_spans:
            return True
        span = _attach_span(c, content).get("span")
        if not span:
            return True
        return not any(
            e["start"] <= span["start"] and e["end"] >= span["end"]
            and (e["end"] - e["start"]) > (span["end"] - span["start"])
            for e in entity_spans
        )

    return [c for c in cards if keep(c)]


def _findings_by_issue_type(cards: list[dict], issue_type: str) -> list[dict]:
    return [c for c in cards if c.get("issueType") == issue_type]


def _sort_by_pass_order(cards: list[dict]) -> list[dict]:
    order = {t: i for i, t in enumerate(PASS_ORDER)}
    return sorted(cards, key=lambda c: (order.get(c.get("issueType", ""), 50), -(c.get("confidence") or 0)))


def collect_punctuation_only(text: str) -> list[dict]:
    return collect_punctuation_mechanics(text)


def assemble_mechanics_suggestions(text: str, coach_mode: str = "paused") -> list[dict]:
    original = str(text or "")
    if not original.strip():
        return []

    if is_semantically_unusual_but_valid(original):
        return []

    dict_max = 40 if coach_mode == "paused" else 12
    spell_dict = spell_dictionary_suggestions(original, max_cards=dict_max)
    obvious = obvious_spelling_grammar_heuristics(original)
    entities = detect_named_entity_cards(original)

    cards = [*spell_dict, *obvious, *entities]
    cards = filter_by_confidence(cards)
    cards = dedupe_overlapping_spans(cards, original)
    cards = _drop_redundant_capitalization(cards, original)

    pre_punct_types = {"spelling", "apostrophe", "spacing", "homophone"}
    corrected = apply_pre_punctuation_corrections(
        original, [c for c in cards if c.get("issueType") in pre_punct_types]
    )
    punct_text = corrected if material_text_change(original, corrected) else original

    style_and_coherence = [
        {
            **c,
            "issueType": c.get("issueType") or (
                "style" if c.get("type") in {"voice", "pattern"} else
                "coherence" if c.get("type") == "coherence" else "style"
            ),
            "confidence": c.get("confidence") or 0.85,
        }
        for c in heuristic_suggestions(original, coach_mode, include_punctuation=False)
        if (c.get("issueType") or c.get("type")) in {"style", "coherence", "voice", "pattern"}
    ]
    style_and_coherence = [
        c for c in style_and_coherence if c.get("issueType") in {"style", "coherence"}
    ]

    punctuation_findings = collect_punctuation_only(punct_text)
    punctuation = filter_by_confidence(punctuation_findings)

    cards = [*cards, *punctuation, *filter_by_confidence(style_and_coherence)]

    # attach spans for run-on suppression, then strip them
    with_spans = [_attach_span(c, original) for c in cards]
    cards_with_spans = dedupe_overlapping_spans(with_spans, original)
    cards_with_spans = [_attach_span(c, original) for c in cards_with_spans]
    cards_with_spans = suppress_punctuation_noise_near_run_on(cards_with_spans)
    cards_with_spans = filter_by_confidence(cards_with_spans)
    cards_with_spans = _sort_by_pass_order(cards_with_spans)

    return [
        {k: v for k, v in c.items() if k != "span"}
        for c in cards_with_spans
        if (c.get("confidence") or 0) >= CONFIDENCE_MIN
    ]


def finalize_mechanics_suggestions(text: str, coach_mode: str, max_count: int) -> list[dict]:
    raw = assemble_mechanics_suggestions(text, coach_mode)
    return prioritize_suggestions(dedup_suggestion_titles(raw), max_count)
