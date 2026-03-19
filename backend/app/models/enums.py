from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    PARENT = "PARENT"
    GESTIONNAIRE = "GESTIONNAIRE"
    SUPER_ADMIN = "SUPER_ADMIN"


class Sexe(str, enum.Enum):
    M = "M"
    F = "F"


class LienParente(str, enum.Enum):
    PERE = "PERE"
    MERE = "MERE"
    TUTEUR_LEGAL = "TUTEUR_LEGAL"
    AUTRE = "AUTRE"


class ListeCode(str, enum.Enum):
    PRINCIPALE = "PRINCIPALE"
    ATTENTE_N1 = "ATTENTE_N1"
    ATTENTE_N2 = "ATTENTE_N2"


class DemandeStatut(str, enum.Enum):
    SOUMISE = "SOUMISE"
    RETENUE = "RETENUE"
    NON_VALIDEE = "NON_VALIDEE"
    DESISTEE = "DESISTEE"

