from __future__ import annotations

import json
import os
import threading
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

_THIS_DIR = Path(__file__).resolve().parent
load_dotenv(_THIS_DIR.parent / ".env")

_init_lock = threading.Lock()


class FirebaseNotConfiguredError(Exception):
    pass


def _resolve_credentials_path(raw: str) -> str | None:
    if not raw:
        return None
    p = Path(raw)
    if not p.is_absolute():
        p = _THIS_DIR.parent / p
    return str(p) if p.exists() else None


def ensure_firebase_app() -> None:
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass

    with _init_lock:
        try:
            firebase_admin.get_app()
            return
        except ValueError:
            pass

        raw_json = os.environ.get("FIREBASE_CREDENTIALS", "").strip()
        if raw_json:
            firebase_admin.initialize_app(credentials.Certificate(json.loads(raw_json)))
            return

        cred_path_raw = os.environ.get("FIREBASE_CREDENTIALS_PATH", "").strip()
        resolved = _resolve_credentials_path(cred_path_raw)
        if resolved:
            firebase_admin.initialize_app(credentials.Certificate(resolved))
            return

        raise FirebaseNotConfiguredError(
            "Set FIREBASE_CREDENTIALS (JSON string) or FIREBASE_CREDENTIALS_PATH (path to JSON file)."
        )


def get_db():
    ensure_firebase_app()
    return firestore.client()
