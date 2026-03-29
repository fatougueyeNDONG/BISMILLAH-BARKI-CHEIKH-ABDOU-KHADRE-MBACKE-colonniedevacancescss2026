"""Flag changement mot de passe obligatoire pour admins (pas de colonne en base)."""
from __future__ import annotations

import json
from pathlib import Path


def _path() -> Path:
    base = Path(__file__).resolve().parents[2] / "data"
    base.mkdir(parents=True, exist_ok=True)
    return base / "admin_must_change_password.json"


def _load() -> dict[str, bool]:
    p = _path()
    if not p.exists():
        return {}
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        return {str(k): bool(v) for k, v in raw.items()}
    except Exception:
        return {}


def _save(data: dict[str, bool]) -> None:
    p = _path()
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def get_flag(user_id: int) -> bool:
    return _load().get(str(user_id), False)


def set_flag(user_id: int, value: bool) -> None:
    data = _load()
    data[str(user_id)] = value
    _save(data)


def clear_flag(user_id: int) -> None:
    data = _load()
    data.pop(str(user_id), None)
    _save(data)
