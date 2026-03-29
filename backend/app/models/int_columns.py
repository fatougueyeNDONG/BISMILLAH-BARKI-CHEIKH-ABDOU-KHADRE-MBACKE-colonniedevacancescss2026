"""Types SQLAlchemy : entiers en base <-> enums Python (logique métier inchangée)."""
from __future__ import annotations

from enum import Enum
from typing import Any, Type

from sqlalchemy import Integer
from sqlalchemy.types import TypeDecorator

from app.models.enums import DemandeStatut, LienParente, ListeCode, Sexe, UserRole

USER_ROLE_TO_INT: dict[UserRole, int] = {
    UserRole.PARENT: 0,
    UserRole.GESTIONNAIRE: 1,
    UserRole.SUPER_ADMIN: 2,
}
INT_TO_USER_ROLE: dict[int, UserRole] = {v: k for k, v in USER_ROLE_TO_INT.items()}

DEMANDE_STATUT_TO_INT: dict[DemandeStatut, int] = {
    DemandeStatut.SOUMISE: 0,
    DemandeStatut.RETENUE: 1,
    DemandeStatut.NON_VALIDEE: 2,
    DemandeStatut.DESISTEE: 3,
}
INT_TO_DEMANDE_STATUT: dict[int, DemandeStatut] = {v: k for k, v in DEMANDE_STATUT_TO_INT.items()}

LISTE_CODE_TO_INT: dict[ListeCode, int] = {
    ListeCode.PRINCIPALE: 0,
    ListeCode.ATTENTE_N1: 1,
    ListeCode.ATTENTE_N2: 2,
}
INT_TO_LISTE_CODE: dict[int, ListeCode] = {v: k for k, v in LISTE_CODE_TO_INT.items()}

SEXE_TO_INT: dict[Sexe, int] = {Sexe.M: 0, Sexe.F: 1}
INT_TO_SEXE: dict[int, Sexe] = {v: k for k, v in SEXE_TO_INT.items()}

LIEN_TO_INT: dict[LienParente, int] = {
    LienParente.PERE: 0,
    LienParente.MERE: 1,
    LienParente.TUTEUR_LEGAL: 2,
    LienParente.AUTRE: 3,
}
INT_TO_LIEN: dict[int, LienParente] = {v: k for k, v in LIEN_TO_INT.items()}


class IntEnumType(TypeDecorator):
    """Entier PostgreSQL ↔ Enum Python."""

    impl = Integer
    cache_ok = True

    def __init__(self, enum_class: Type[Enum], forward: dict[Any, int]):
        super().__init__()
        self._enum_class = enum_class
        self._forward = forward
        self._backward = {int(v): k for k, v in forward.items()}

    def process_bind_param(self, value: Any, dialect: Any) -> int | None:
        if value is None:
            return None
        if isinstance(value, self._enum_class):
            return int(self._forward[value])
        return int(value)

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return None
        iv = int(value)
        if iv in self._backward:
            return self._backward[iv]
        return list(self._enum_class)[0]
