from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from auth import CurrentUser, get_current_user
from firebase.init import get_db

router = APIRouter()


@router.get("/users/me")
async def users_me(user: CurrentUser = Depends(get_current_user)):
    try:
        db = get_db()
        ref = db.collection("users").document(user.uid)
        snap = ref.get()
        existing = snap.to_dict() or {} if snap.exists else {}

        now = datetime.now(timezone.utc).isoformat()
        patch: dict = {"userId": user.uid, "updatedAt": now}
        if user.email:
            patch["email"] = user.email
        if user.name:
            patch["displayName"] = user.name
        if not existing.get("createdAt"):
            patch["createdAt"] = now

        ref.set(patch, merge=True)
        return {"user": {**existing, **patch}}
    except Exception:
        return {"ok": False, "error": "internal_error"}, 500
