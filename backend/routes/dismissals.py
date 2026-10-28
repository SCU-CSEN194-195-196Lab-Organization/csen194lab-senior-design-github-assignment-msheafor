from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth import CurrentUser, get_current_user
from firebase.init import get_db

router = APIRouter()

COLLECTION = "dismissals"


class DismissalBody(BaseModel):
    cardId: str
    category: Any = None
    reason: Any = None
    sources: list | None = None


@router.post("/dismissals")
async def dismissals_add(body: DismissalBody, user: CurrentUser = Depends(get_current_user)):
    if body.sources is not None and not isinstance(body.sources, list):
        return JSONResponse({"ok": False, "error": "invalid_sources"}, status_code=400)

    now = datetime.now(timezone.utc).isoformat()
    doc_id = f"{user.uid}_{body.cardId}_{uuid.uuid4().hex[:12]}"
    record: dict = {
        "userId": user.uid,
        "cardId": str(body.cardId).strip()[:200],
        "createdAt": now,
    }
    if body.category is not None:
        record["category"] = body.category
    if body.reason is not None:
        record["reason"] = body.reason
    if isinstance(body.sources, list):
        record["sources"] = body.sources

    try:
        get_db().collection(COLLECTION).document(doc_id).set(record)
        return {"ok": True, "id": doc_id}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)
