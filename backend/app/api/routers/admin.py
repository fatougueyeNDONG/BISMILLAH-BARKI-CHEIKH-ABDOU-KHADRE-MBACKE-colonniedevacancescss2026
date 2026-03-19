from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import DemandeStatut, ListeCode, UserRole
from app.models.models import DemandeInscription, Desistement, Enfant, Liste, Parent, User
from app.services.email import send_email, uniq_emails
from app.services.email_templates import (
    body_desistement_validated,
    body_selection,
    body_transfer,
    subject_selection,
    subject_transfer,
)
from app.services.inscriptions import ensure_listes_exist

router = APIRouter(prefix="/admin", tags=["admin"])


class FinalSelectionIn(BaseModel):
    is_selection_finale: bool
    non_validation_reason: Optional[str] = Field(default=None, max_length=2000)


class TransferIn(BaseModel):
    to_liste_code: ListeCode
    reason: Optional[str] = Field(default=None, max_length=2000)


class DesistementValidateIn(BaseModel):
    validated: bool = True


class SwapRangIn(BaseModel):
    other_demande_id: int


@router.get("/listes/{liste_code}/demandes")
def list_demandes_par_liste(
    liste_code: ListeCode,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)),
):
    ensure_listes_exist(db)
    liste = db.query(Liste).filter(Liste.code == liste_code).first()
    if not liste:
        raise HTTPException(status_code=404, detail="Liste introuvable.")

    demandes = (
        db.query(DemandeInscription)
        .filter(DemandeInscription.liste_id == liste.id)
        .order_by(DemandeInscription.rang_dans_liste.asc())
        .all()
    )

    def _row(d: DemandeInscription):
        e = d.enfant
        p = e.parent
        return {
            "demande_id": d.id,
            "liste": liste.code.value,
            "rang": d.rang_dans_liste,
            "date_inscription": d.date_inscription,
            "statut": d.statut.value,
            "non_validation_reason": d.non_validation_reason,
            "selection_finale": d.is_selection_finale,
            "parent_matricule": p.matricule,
            "enfant": {
                "id": e.id,
                "prenom": e.prenom,
                "nom": e.nom,
                "date_naissance": e.date_naissance,
                "sexe": e.sexe.value,
                "lien_parente": e.lien_parente.value,
                "is_titulaire": e.is_titulaire,
            },
        }

    return [_row(d) for d in demandes]


@router.post("/demandes/{demande_id}/selection-finale")
def set_selection_finale(
    demande_id: int,
    payload: FinalSelectionIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)),
):
    demande = db.query(DemandeInscription).filter(DemandeInscription.id == demande_id).first()
    if not demande:
        raise HTTPException(status_code=404, detail="Demande introuvable.")

    if not payload.is_selection_finale and not (payload.non_validation_reason and payload.non_validation_reason.strip()):
        raise HTTPException(
            status_code=400,
            detail="Le motif est obligatoire quand l'action est NON (non validée).",
        )

    demande.is_selection_finale = payload.is_selection_finale
    demande.selected_by_user_id = user.id
    demande.selected_at = datetime.now(timezone.utc)
    if payload.is_selection_finale:
        demande.statut = DemandeStatut.RETENUE
        demande.non_validation_reason = None
    else:
        demande.statut = DemandeStatut.NON_VALIDEE
        demande.non_validation_reason = payload.non_validation_reason.strip() if payload.non_validation_reason else None
    db.commit()

    # Emails (parent + admins)
    enfant = demande.enfant
    parent = enfant.parent
    parent_email = parent.email
    admins = db.query(User).filter(User.is_active.is_(True), User.email.isnot(None)).filter(
        User.role.in_([UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN])
    )
    admin_emails = [u.email for u in admins.all() if u.email]
    to = uniq_emails([parent_email] + admin_emails)
    background.add_task(
        send_email,
        to=to,
        subject=subject_selection(parent.matricule, f"{enfant.prenom} {enfant.nom}"),
        body=body_selection(
            parent_matricule=parent.matricule,
            enfant=f"{enfant.prenom} {enfant.nom}",
            selected=payload.is_selection_finale,
            when=demande.selected_at or datetime.now(timezone.utc),
        ),
    )
    return {"ok": True}


def _next_rang_for_liste(db: Session, liste_id: int) -> int:
    db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": int(liste_id)})
    current_max = db.query(func.coalesce(func.max(DemandeInscription.rang_dans_liste), 0)).filter(
        DemandeInscription.liste_id == liste_id
    ).scalar()
    return int(current_max) + 1


@router.post("/demandes/{demande_id}/transferer")
def transferer_demande(
    demande_id: int,
    payload: TransferIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)),
):
    ensure_listes_exist(db)
    demande = db.query(DemandeInscription).filter(DemandeInscription.id == demande_id).first()
    if not demande:
        raise HTTPException(status_code=404, detail="Demande introuvable.")

    to_liste = db.query(Liste).filter(Liste.code == payload.to_liste_code).first()
    if not to_liste:
        raise HTTPException(status_code=404, detail="Liste cible introuvable.")

    # Transfert: on attribue un nouveau rang à la fin de la liste cible
    from_liste = demande.liste
    from_rang = demande.rang_dans_liste
    new_rang = _next_rang_for_liste(db, to_liste.id)
    demande.liste_id = to_liste.id
    demande.rang_dans_liste = new_rang
    db.commit()

    enfant = demande.enfant
    parent = enfant.parent
    admins = db.query(User).filter(User.is_active.is_(True), User.email.isnot(None)).filter(
        User.role.in_([UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN])
    )
    admin_emails = [u.email for u in admins.all() if u.email]
    to = uniq_emails([parent.email] + admin_emails)
    when = datetime.now(timezone.utc)
    background.add_task(
        send_email,
        to=to,
        subject=subject_transfer(parent.matricule, f"{enfant.prenom} {enfant.nom}"),
        body=body_transfer(
            parent_matricule=parent.matricule,
            enfant=f"{enfant.prenom} {enfant.nom}",
            from_liste=from_liste.code.value if from_liste else "",
            from_rang=from_rang,
            to_liste=to_liste.code.value,
            to_rang=new_rang,
            reason=payload.reason,
            when=when,
        ),
    )
    return {"ok": True, "to_liste": to_liste.code.value, "new_rang": new_rang}


@router.get("/stats", summary="Statistiques (gestionnaire / super admin)")
def stats_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)),
):
    ensure_listes_exist(db)

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_parents = db.query(func.count(Parent.id)).scalar() or 0
    total_enfants = db.query(func.count(Enfant.id)).scalar() or 0
    total_demandes = db.query(func.count(DemandeInscription.id)).scalar() or 0

    selected_total = db.query(func.count(DemandeInscription.id)).filter(DemandeInscription.is_selection_finale.is_(True)).scalar() or 0

    by_liste = (
        db.query(Liste.code, func.count(DemandeInscription.id))
        .filter(DemandeInscription.is_selection_finale.is_(True))
        .group_by(Liste.code)
        .all()
    )
    by_liste_map = {code.value: int(cnt) for code, cnt in by_liste}

    desistements_waiting = (
        db.query(func.count(Desistement.id))
        .filter(Desistement.validated.is_(False))
        .scalar()
        or 0
    )

    return {
        "total_users": int(total_users),
        "total_parents": int(total_parents),
        "total_enfants": int(total_enfants),
        "total_demandes": int(total_demandes),
        "selected_total": int(selected_total),
        "selected_by_liste": by_liste_map,
        "desistements_waiting": int(desistements_waiting),
    }


@router.post("/demandes/{demande_id}/swap-rang")
def swap_rang(
    demande_id: int,
    payload: SwapRangIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)),
):
    # Un échange de rang se fait uniquement à l’intérieur d’une même liste.
    d1 = db.query(DemandeInscription).filter(DemandeInscription.id == demande_id).first()
    d2 = db.query(DemandeInscription).filter(DemandeInscription.id == payload.other_demande_id).first()
    if not d1 or not d2:
        raise HTTPException(status_code=404, detail="Demandes introuvables.")
    if d1.liste_id != d2.liste_id:
        raise HTTPException(status_code=400, detail="Swap impossible : demandes dans des listes différentes.")

    db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": int(d1.liste_id)})
    rang1 = d1.rang_dans_liste
    rang2 = d2.rang_dans_liste

    # Sécurité contre la contrainte UNIQUE(liste_id, rang) pendant le swap.
    d1.rang_dans_liste = -999999
    db.flush()
    d2.rang_dans_liste = rang1
    d1.rang_dans_liste = rang2
    db.commit()

    return {"ok": True, "liste_id": d1.liste_id, "rang1": d2.rang_dans_liste, "rang2": d1.rang_dans_liste}


@router.get("/desistements/en-attente")
def desistements_en_attente(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)),
):
    desistements = (
        db.query(Desistement)
        .join(DemandeInscription, DemandeInscription.id == Desistement.demande_inscription_id)
        .filter(Desistement.validated.is_(False))
        .order_by(Desistement.requested_at.asc())
        .all()
    )

    out = []
    for d in desistements:
        demande = d.demande_inscription
        enfant = demande.enfant
        parent = enfant.parent
        out.append(
            {
                "desistement_id": d.id,
                "requested_at": d.requested_at,
                "reason": d.reason,
                "demande_id": demande.id,
                "parent_matricule": parent.matricule,
                "enfant": {"id": enfant.id, "prenom": enfant.prenom, "nom": enfant.nom},
            }
        )
    return out


@router.post("/desistements/{desistement_id}/valider")
def valider_desistement(
    desistement_id: int,
    payload: DesistementValidateIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN)),
):
    d = db.query(Desistement).filter(Desistement.id == desistement_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Désistement introuvable.")
    if d.validated:
        return {"ok": True}

    if payload.validated:
        d.validated = True
        d.validated_by_user_id = user.id
        d.validated_at = datetime.now(timezone.utc)

        demande = db.query(DemandeInscription).filter(DemandeInscription.id == d.demande_inscription_id).first()
        if demande:
            demande.is_selection_finale = False
            demande.selected_by_user_id = user.id
            demande.selected_at = datetime.now(timezone.utc)
            demande.statut = DemandeStatut.DESISTEE

    db.commit()

    # Email parent + admins (si validation)
    if payload.validated:
        demande = d.demande_inscription
        enfant = demande.enfant
        parent = enfant.parent
        admins = db.query(User).filter(User.is_active.is_(True), User.email.isnot(None)).filter(
            User.role.in_([UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN])
        )
        admin_emails = [u.email for u in admins.all() if u.email]
        to = uniq_emails([parent.email] + admin_emails)
        background.add_task(
            send_email,
            to=to,
            subject=f"Colonie 2026 — Désistement validé ({parent.matricule}) — {enfant.nom}",
            body=body_desistement_validated(
                parent_matricule=parent.matricule,
                enfant=f"{enfant.prenom} {enfant.nom}",
                when=d.validated_at or datetime.now(timezone.utc),
            ),
        )
    return {"ok": True}

