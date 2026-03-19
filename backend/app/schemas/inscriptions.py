from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import LienParente, Sexe


class ParentInfoIn(BaseModel):
    matricule: str = Field(min_length=1, max_length=50)
    prenom: str = Field(min_length=1, max_length=255)
    nom: str = Field(min_length=1, max_length=255)
    service: str = Field(min_length=1, max_length=255)


class EnfantCreateIn(BaseModel):
    prenom: str = Field(min_length=1, max_length=255)
    nom: str = Field(min_length=1, max_length=255)
    date_naissance: date
    sexe: Sexe
    lien_parente: LienParente


class InscriptionCreateIn(BaseModel):
    parent: ParentInfoIn
    enfant: EnfantCreateIn


class DemandeOut(BaseModel):
    id: int
    liste_code: str
    rang_dans_liste: int
    date_inscription: datetime
    statut: str
    non_validation_reason: Optional[str] = None
    is_selection_finale: bool

    enfant_id: int
    enfant_prenom: str
    enfant_nom: str
    enfant_date_naissance: date
    enfant_sexe: str
    enfant_lien_parente: str
    enfant_is_titulaire: bool

    class Config:
        from_attributes = True


class TitulaireUpdateIn(BaseModel):
    enfant_id_titulaire: int


class DesistementRequestIn(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=2000)

