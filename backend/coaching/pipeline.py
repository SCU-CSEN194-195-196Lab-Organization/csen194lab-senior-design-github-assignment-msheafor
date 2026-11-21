from __future__ import annotations

import logging

from coaching.feedback_preferences import apply_feedback_preferences, feedback_preference_notes
from coaching.format import suggestions_to_feedback
from coaching.mechanics_client import get_mechanics_suggestions
from coaching.merge import merge_deterministic_and_coaching
from llm.client import coach_with_llm, resolve_llm_attempts
from user_profile.analyzer import (
    analyze_writing_signals,
    append_profile,
    append_user_draft,
    create_empty_profile,
    merge_profile,
    read_profile_store,
    summarize_profile,
)
from rag.retrieval import retrieve_for_coaching, retrieve_from_user_drafts

log = logging.getLogger(__name__)

RAG_TOP_K = 8
PAUSED_DET_MAX = 80
PAUSED_COACH_MAX = 30
PAUSED_TOTAL_MAX = 100
TYPING_DET_MAX = 30
TYPING_TOTAL_MAX = 30


def _filter_draft_history(drafts: list[dict], current_text: str) -> list[dict]:
    norm = " ".join(current_text.lower().split())
    if not norm:
        return drafts
    out = []
    for d in (drafts or []):
        t = " ".join(str(d.get("text") or "").lower().split())
        if not t or t == norm:
            continue
        shorter, longer = (t, norm) if len(t) < len(norm) else (norm, t)
        if longer.find(shorter) != -1 and len(shorter) / len(longer) > 0.88:
            continue
        out.append(d)
    return out


def _order_chunks_for_display(chunks: list[dict]) -> list[dict]:
    guides = [c for c in chunks if not str(c.get("id") or "").startswith("user-draft:")]
    drafts = [c for c in chunks if str(c.get("id") or "").startswith("user-draft:")]
    return (guides + drafts[:2])[:RAG_TOP_K]


async def run_coach(body: dict, meta: dict | None = None) -> dict:
    request_id = str((meta or {}).get("requestId") or "")

    text = body.get("text")
    if not isinstance(text, str):
        return {"error": "Missing text", "status": 400}

    user_id = str(body.get("userId") or "").strip()
    if not user_id or user_id.lower() == "anonymous":
        return {"error": "Missing stable userId", "status": 400}

    trimmed = text.strip()[:12000]
    if not trimmed:
        return {"error": "Empty text after trim", "status": 400}

    coach_mode = "typing" if body.get("coachMode") == "typing" else "paused"
    focus = [str(f) for f in body.get("focus") or [] if isinstance(f, str)]
    personalization = {
        "goals": str(body.get("goals") or "")[:300],
        "audience": str(body.get("audience") or "")[:200],
        "tonePreference": body.get("tonePreference") if body.get("tonePreference") in ("formal", "casual", "neutral") else "neutral",
    }
    feedback_preferences = body.get("feedbackPreferences") if isinstance(body.get("feedbackPreferences"), dict) else None

    store = await read_profile_store()
    signals = analyze_writing_signals(trimmed)
    existing_profile = (store.get(user_id) or {}).get("profile") or create_empty_profile()
    predicted_profile = summarize_profile(merge_profile(existing_profile, signals))

    det_cap = PAUSED_DET_MAX if coach_mode == "paused" else TYPING_DET_MAX
    mechanics_suggestions = await get_mechanics_suggestions(trimmed, coach_mode, user_id)

    coaching_suggestions: list[dict] = []
    model_used = None
    retrieved_sorted: list[dict] = []

    if coach_mode == "paused":
        try:
            global_retrieved = retrieve_for_coaching(trimmed, RAG_TOP_K)
        except Exception as exc:
            log.warning("[pipeline] RAG retrieval failed, continuing without knowledge base: %s", exc)
            global_retrieved = []

        user_drafts = _filter_draft_history((store.get(user_id) or {}).get("drafts") or [], trimmed)
        try:
            user_retrieved = retrieve_from_user_drafts(user_drafts, trimmed, top_k=2)
        except Exception as exc:
            log.warning("[pipeline] user draft retrieval failed: %s", exc)
            user_retrieved = []

        by_id: dict[str, dict] = {}
        for item in [*global_retrieved, *user_retrieved]:
            prev = by_id.get(item["id"])
            if not prev or item["score"] > prev["score"]:
                by_id[item["id"]] = item
        retrieved_sorted = sorted(by_id.values(), key=lambda x: x["score"], reverse=True)[:RAG_TOP_K]

        profile_notes = [
            *[(n.get("summary") or "") for n in (store.get(user_id) or {}).get("notes") or []],
            *feedback_preference_notes(feedback_preferences),
        ]

        attempts = resolve_llm_attempts()
        llm_cards: list[dict] = []
        for cfg in attempts:
            try:
                cards = await coach_with_llm(
                    text=trimmed,
                    retrieved=retrieved_sorted,
                    profile_notes=profile_notes,
                    profile_snapshot=predicted_profile,
                    cfg=cfg,
                    coach_mode=coach_mode,
                    focus=focus,
                    personalization=personalization,
                    feedback_preferences=feedback_preferences,
                )
                if cards:
                    llm_cards = cards
                    model_used = cfg["model"]
                    break
            except Exception as exc:
                log.error("[pipeline] LLM error (%s): %s", cfg.get("label"), exc)

        coaching_suggestions = llm_cards

    suggestions = merge_deterministic_and_coaching(
        mechanics_suggestions,
        coaching_suggestions,
        user_text=trimmed,
        det_max=det_cap,
        coach_max=PAUSED_COACH_MAX if coach_mode == "paused" else 0,
        total_max=PAUSED_TOTAL_MAX if coach_mode == "paused" else TYPING_TOTAL_MAX,
    )
    suggestions = apply_feedback_preferences(suggestions, feedback_preferences)

    top_retrieval_id = retrieved_sorted[0]["id"] if retrieved_sorted else None
    log.info(
        "[coach] requestId=%s mode=%s words=%d mechanics=%d coaching=%d merged=%d model=%s topChunk=%s",
        request_id, coach_mode, signals["wordCount"],
        len(mechanics_suggestions), len(coaching_suggestions), len(suggestions),
        model_used or "none", top_retrieval_id or "none",
    )

    try:
        profile_snapshot = await append_profile(
            user_id,
            f"mode={coach_mode}; words={signals['wordCount']}; topChunk={top_retrieval_id or 'none'}",
            signals,
        )
    except Exception:
        profile_snapshot = predicted_profile

    try:
        await append_user_draft(user_id, trimmed)
    except Exception:
        pass

    retrieved_chunks = _order_chunks_for_display(
        [{"id": r["id"], "score": r["score"], "text": r["text"], "source": r["metadata"].get("source", "")} for r in retrieved_sorted]
    )

    return {
        "status": 200,
        "payload": {
            "suggestions": suggestions,
            "cards": suggestions,
            "feedback": suggestions_to_feedback(suggestions),
            "source": "fastapi-coaching",
            "model": model_used,
            "userId": user_id,
            "personalization": personalization,
            "profileSnapshot": profile_snapshot,
            "retrievedChunks": retrieved_chunks,
            "vocabulary_pairs_saved": 0,
        },
    }
