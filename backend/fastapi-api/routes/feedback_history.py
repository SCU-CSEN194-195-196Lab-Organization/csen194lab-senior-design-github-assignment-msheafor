from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from auth import CurrentUser, get_current_user
from firebase.init import get_db
from pydantic import BaseModel

router = APIRouter()

COLLECTION = "feedback_history"
USERS_COLLECTION = "users"
MAX_DOC_ID_CHARS = 200
MAX_CARD_ID_CHARS = 200
MAX_TEXT_CHARS = 4000
MAX_FIX_OPTIONS = 8
VALID_DECISIONS = {"accepted", "declined"}
LAST_COACHED_FIELD = "lastCoachedAt"


def _trim(value: object, limit: int = MAX_TEXT_CHARS) -> str:
    return str(value or "").strip()[:limit]


def _owned_record(record_id: str, user_id: str) -> dict | None:
    snap = get_db().collection(COLLECTION).document(record_id).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    if data.get("userId") != user_id:
        return None
    return data


def _latest_rows(items: list[dict]) -> list[dict]:
    by_card: dict[str, dict] = {}
    for row in items:
        key = f"{row.get('docId', '')}::{row.get('cardId', '')}"
        prev = by_card.get(key)
        if not prev or str(row.get("updatedAt") or "") >= str(prev.get("updatedAt") or ""):
            by_card[key] = row
    return list(by_card.values())


def _compact_row(row: dict) -> dict:
    return {
        "category": _trim(row.get("category"), 120),
        "issue": _trim(row.get("issue"), 300),
        "why": _trim(row.get("why"), 300),
        "decision": _trim(row.get("decision"), 24).lower(),
    }


def build_feedback_preferences(user_id: str, limit: int = 40) -> dict:
    empty: dict = {"accepted": [], "declined": [], "categoryScores": {}}
    uid = _trim(user_id, 200)
    if not uid:
        return empty
    try:
        items: list[dict] = []
        for snap in get_db().collection(COLLECTION).where("userId", "==", uid).stream():
            items.append(snap.to_dict() or {})
        latest = _latest_rows(items)
        latest.sort(key=lambda r: str(r.get("updatedAt") or r.get("createdAt") or ""), reverse=True)

        accepted: list[dict] = []
        declined: list[dict] = []
        category_scores: dict[str, dict[str, int]] = {}

        for row in latest:
            decision = _trim(row.get("decision"), 24).lower()
            if decision not in VALID_DECISIONS:
                continue
            category = _trim(row.get("category"), 120).lower() or "coaching"
            bucket = category_scores.setdefault(category, {"accepted": 0, "declined": 0})
            bucket[decision] += 1
            compact = _compact_row({**row, "decision": decision})
            if decision == "accepted":
                accepted.append(compact)
            else:
                declined.append(compact)

        return {
            "accepted": accepted[:limit],
            "declined": declined[:limit],
            "categoryScores": category_scores,
        }
    except Exception:
        return empty


class FeedbackHistoryBody(BaseModel):
    docId: str
    cardId: str
    decision: str
    issue: str | None = None
    why: str | None = None
    category: str | None = None
    fixOptions: list | None = None


@router.post("/feedback-history")
async def feedback_history_add(body: FeedbackHistoryBody, user: CurrentUser = Depends(get_current_user)):
    doc_id = _trim(body.docId, MAX_DOC_ID_CHARS)
    card_id = _trim(body.cardId, MAX_CARD_ID_CHARS)
    issue = _trim(body.issue) if body.issue else ""
    why = _trim(body.why) if body.why else ""

    if not doc_id:
        return JSONResponse({"ok": False, "error": "missing_doc_id"}, status_code=400)
    if not card_id:
        return JSONResponse({"ok": False, "error": "missing_card_id"}, status_code=400)
    if not issue and not why:
        return JSONResponse({"ok": False, "error": "missing_feedback_fields"}, status_code=400)

    decision = _trim(body.decision, 24).lower()
    if decision not in VALID_DECISIONS:
        return JSONResponse({"ok": False, "error": "invalid_decision"}, status_code=400)

    if body.fixOptions is not None and not isinstance(body.fixOptions, list):
        return JSONResponse({"ok": False, "error": "invalid_fix_options"}, status_code=400)

    now = datetime.now(timezone.utc).isoformat()
    record_id = f"{user.uid}_{doc_id}_{card_id}"
    created_at = now
    try:
        existing = get_db().collection(COLLECTION).document(record_id).get()
        if existing.exists:
            created_at = str((existing.to_dict() or {}).get("createdAt") or now)
    except Exception:
        pass

    record: dict = {
        "id": record_id,
        "userId": user.uid,
        "docId": doc_id,
        "cardId": card_id,
        "decision": decision,
        "createdAt": created_at,
        "updatedAt": now,
    }
    if issue:
        record["issue"] = issue
    if why:
        record["why"] = why
    if body.category:
        record["category"] = _trim(body.category, 120)
    if isinstance(body.fixOptions, list):
        record["fixOptions"] = [_trim(i) for i in body.fixOptions if _trim(i)][:MAX_FIX_OPTIONS]

    try:
        get_db().collection(COLLECTION).document(record_id).set(record, merge=True)
        return {"ok": True, "id": record_id}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)


@router.get("/feedback-history")
async def feedback_history_list(
    docId: str | None = Query(default=None),
    decision: str | None = Query(default=None),
    user: CurrentUser = Depends(get_current_user),
):
    doc_id = _trim(docId, MAX_DOC_ID_CHARS) if docId else ""
    dec = _trim(decision, 24).lower() if decision else ""
    if dec and dec not in VALID_DECISIONS:
        return JSONResponse({"ok": False, "error": "invalid_decision"}, status_code=400)
    try:
        query = get_db().collection(COLLECTION).where("userId", "==", user.uid)
        if doc_id:
            query = query.where("docId", "==", doc_id)
        if dec:
            query = query.where("decision", "==", dec)
        items: list[dict] = []
        for snap in query.stream():
            data = snap.to_dict() or {}
            items.append({"id": data.get("id") or snap.id, **data})
        items = _latest_rows(items)
        items.sort(key=lambda r: str(r.get("updatedAt") or r.get("createdAt") or ""), reverse=True)
        return {"items": items}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)


@router.delete("/feedback-history/{record_id}")
async def feedback_history_delete(record_id: str, user: CurrentUser = Depends(get_current_user)):
    record_id = _trim(record_id, 400)
    if not record_id:
        return JSONResponse({"ok": False, "error": "missing_record_id"}, status_code=400)
    try:
        if not _owned_record(record_id, user.uid):
            return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)
        get_db().collection(COLLECTION).document(record_id).delete()
        return {"ok": True}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)


@router.get("/feedback-history/stats")
async def feedback_history_stats(user: CurrentUser = Depends(get_current_user)):
    try:
        all_rows: list[dict] = []
        for snap in get_db().collection(COLLECTION).where("userId", "==", user.uid).stream():
            data = snap.to_dict() or {}
            all_rows.append({"id": data.get("id") or snap.id, **data})
        latest = _latest_rows(all_rows)
        accepted_count = sum(1 for r in latest if r.get("decision") == "accepted")
        user_snap = get_db().collection(USERS_COLLECTION).document(user.uid).get()
        user_data = user_snap.to_dict() or {} if user_snap.exists else {}
        return {"acceptedCount": accepted_count, "lastCoachedAt": user_data.get(LAST_COACHED_FIELD)}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)


@router.post("/feedback-history/coach-session")
async def feedback_history_mark_coach_session(user: CurrentUser = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    try:
        get_db().collection(USERS_COLLECTION).document(user.uid).set(
            {"userId": user.uid, LAST_COACHED_FIELD: now, "updatedAt": now},
            merge=True,
        )
        return {"ok": True, "lastCoachedAt": now}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)
