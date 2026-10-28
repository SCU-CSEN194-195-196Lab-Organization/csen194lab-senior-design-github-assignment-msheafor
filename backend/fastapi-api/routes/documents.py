from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import CurrentUser, get_current_user
from firebase.init import get_db

router = APIRouter()

COLLECTION = "documents"
MAX_CONTENT_CHARS = 200_000
MAX_TITLE_CHARS = 200


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _doc_ref(doc_id: str):
    return get_db().collection(COLLECTION).document(doc_id)


def _owned_doc(doc_id: str, user_id: str) -> dict | None:
    snap = _doc_ref(doc_id).get()
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    if data.get("userId") != user_id:
        return None
    return data


def _delete_feedback_for_doc(doc_id: str, user_id: str) -> None:
    db = get_db()
    for snap in (
        db.collection("feedback_history")
        .where("userId", "==", user_id)
        .where("docId", "==", doc_id)
        .stream()
    ):
        snap.reference.delete()


class CreateDocBody(BaseModel):
    title: str | None = None


class UpdateDocBody(BaseModel):
    title: str | None = None
    content: str | None = None


@router.get("/documents")
async def list_documents(user: CurrentUser = Depends(get_current_user)):
    try:
        items = []
        for snap in get_db().collection(COLLECTION).where("userId", "==", user.uid).stream():
            data = snap.to_dict() or {}
            items.append({
                "id": data.get("id") or snap.id,
                "title": data.get("title") or "Untitled",
                "updatedAt": data.get("updatedAt") or data.get("createdAt") or "",
            })
        items.sort(key=lambda d: str(d.get("updatedAt") or ""), reverse=True)
        return {"documents": items}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)


@router.post("/documents", status_code=201)
async def create_document(body: CreateDocBody, user: CurrentUser = Depends(get_current_user)):
    title_raw = body.title or ""
    title = title_raw.strip()[:MAX_TITLE_CHARS] if title_raw.strip() else "Untitled"
    doc_id = str(uuid.uuid4())
    now = _now_iso()
    record = {
        "id": doc_id,
        "userId": user.uid,
        "title": title,
        "content": "",
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        _doc_ref(doc_id).set(record)
        return record
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str, user: CurrentUser = Depends(get_current_user)):
    try:
        doc = _owned_doc(doc_id, user.uid)
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)
    if not doc:
        return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)
    return doc


@router.put("/documents/{doc_id}")
async def update_document(doc_id: str, body: UpdateDocBody, user: CurrentUser = Depends(get_current_user)):
    try:
        prev = _owned_doc(doc_id, user.uid)
        if not prev:
            return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)

        title = prev.get("title") or "Untitled"
        if body.title and body.title.strip():
            title = body.title.strip()[:MAX_TITLE_CHARS]

        content = prev.get("content", "")
        if body.content is not None:
            content = body.content[:MAX_CONTENT_CHARS]

        next_doc = {**prev, "title": title, "content": content, "updatedAt": _now_iso()}
        _doc_ref(doc_id).set(next_doc, merge=True)
        return next_doc
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: CurrentUser = Depends(get_current_user)):
    try:
        if not _owned_doc(doc_id, user.uid):
            return JSONResponse({"ok": False, "error": "not_found"}, status_code=404)
        _delete_feedback_for_doc(doc_id, user.uid)
        _doc_ref(doc_id).delete()
        return {"ok": True}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)
