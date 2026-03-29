"""Paramètres runtime (équivalent app_settings) : stockage fichier JSON, sans table PostgreSQL."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

def _path() -> Path:
    base = Path(__file__).resolve().parents[2] / "data"
    base.mkdir(parents=True, exist_ok=True)
    return base / "runtime_settings.json"


def read_settings() -> dict[str, Any]:
    p = _path()
    if not p.exists():
        return {}
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def merge_with_defaults(defaults: dict[str, Any]) -> dict[str, Any]:
    return {**defaults, **read_settings()}


def write_settings(payload: dict[str, Any]) -> None:
    p = _path()
    p.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def get_max_enfants_par_parent(default: int) -> int:
    data = read_settings()
    val = data.get("maxEnfantsParParent", default)
    try:
        if val is None:
            return 999_999
        n = int(val)
        return n if n > 0 else default
    except Exception:
        return default
