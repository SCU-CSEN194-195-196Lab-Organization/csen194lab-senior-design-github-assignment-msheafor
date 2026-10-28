from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from auth import CurrentUser, get_current_user
from firebase.init import get_db

router = APIRouter()


@router.get("/preferences")
async def prefs_get(user: CurrentUser = Depends(get_current_user)):
    try:
        snap = get_db().collection("users").document(user.uid).get()
        data = snap.to_dict() or {} if snap.exists else {}
        return {"preferences": data.get("preferences", {})}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)


@router.put("/preferences")
async def prefs_put(body: dict, user: CurrentUser = Depends(get_current_user)):
    try:
        get_db().collection("users").document(user.uid).set({"preferences": body}, merge=True)
        return {"ok": True}
    except Exception:
        return JSONResponse({"ok": False, "error": "internal_error"}, status_code=500)
