from __future__ import annotations

import logging
import os

from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth

from firebase.init import ensure_firebase_app

log = logging.getLogger(__name__)


class CurrentUser:
    def __init__(self, uid: str, email: str | None, name: str | None):
        self.uid = uid
        self.email = email
        self.name = name


async def get_current_user(authorization: str = Header(...)) -> CurrentUser:
    # Dev bypass — never enabled in production
    if os.environ.get("APP_AUTH_BYPASS", "0").strip() in ("1", "true", "yes"):
        debug_uid = os.environ.get("APP_DEBUG_USER", "dev-user-id").strip()
        return CurrentUser(uid=debug_uid, email=None, name=None)

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization: Bearer <token> required")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty Bearer token")

    try:
        ensure_firebase_app()
        decoded = firebase_auth.verify_id_token(token)
    except Exception as exc:
        log.warning("verify_id_token failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return CurrentUser(
        uid=decoded["uid"],
        email=decoded.get("email"),
        name=decoded.get("name"),
    )
