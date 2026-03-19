from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.models import DemandeInscription, Enfant, Parent, User
from app.schemas.inscriptions import (
    DemandeOut,
    DesistementRequestIn,
    InscriptionCreateIn,
    TitulaireUpdateIn,
)
from app.services.inscriptions import create_inscription_for_parent_user, request_desistement, set_titulaire
from app.services.email import send_email, uniq_emails
from app.services.email_templates import (
    body_desistement_requested,
    body_inscription,
    body_titulaire,
    subject_desistement,
    subject_inscription,
    subject_titulaire,
)

router = APIRouter(prefix="/parent", tags=["parent"])


@router.post("/inscriptions", response_model=DemandeOut)
def creer_inscription(
    payload: InscriptionCreateIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
) -> DemandeOut:
    demande = create_inscription_for_parent_user(
        db=db,
        user=user,
        parent_prenom=payload.parent.prenom,
        parent_nom=payload.parent.nom,
        parent_matricule=payload.parent.matricule,
        parent_service_nom=payload.parent.service,
        enfant_prenom=payload.enfant.prenom,
        enfant_nom=payload.enfant.nom,
        enfant_date_naissance=payload.enfant.date_naissance,
        enfant_sexe=payload.enfant.sexe,
        enfant_lien_parente=payload.enfant.lien_parente,
    )
    db.commit()
    db.refresh(demande)
    out = _to_demande_out(db, demande)

    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    parent_email = parent.email if parent else None
    admins = db.query(User).filter(User.is_active.is_(True), User.email.isnot(None)).filter(
        User.role.in_([UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN])
    )
    admin_emails = [u.email for u in admins.all() if u.email]

    subject = subject_inscription(payload.parent.matricule, f"{payload.enfant.prenom} {payload.enfant.nom}")
    body = body_inscription(
        parent_matricule=payload.parent.matricule,
        enfant_prenom=payload.enfant.prenom,
        enfant_nom=payload.enfant.nom,
        liste=out.liste_code,
        rang=out.rang_dans_liste,
        date=out.date_inscription,
    )
    to = uniq_emails([parent_email] + admin_emails)
    background.add_task(send_email, to=to, subject=subject, body=body)

    return out


@router.get("/demandes", response_model=list[DemandeOut])
def mes_demandes(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
) -> list[DemandeOut]:
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    if not parent:
        return []
    demandes = (
        db.query(DemandeInscription)
        .join(Enfant, Enfant.id == DemandeInscription.enfant_id)
        .filter(Enfant.parent_id == parent.id)
        .order_by(DemandeInscription.date_inscription.asc())
        .all()
    )
    return [_to_demande_out(db, d) for d in demandes]


@router.post("/titulaire")
def definir_titulaire(
    payload: TitulaireUpdateIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
):
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    old = None
    new = None
    if parent:
        enfants = db.query(Enfant).filter(Enfant.parent_id == parent.id).all()
        for e in enfants:
            if e.is_titulaire:
                old = f"{e.prenom} {e.nom}"
            if e.id == payload.enfant_id_titulaire:
                new = f"{e.prenom} {e.nom}"

    set_titulaire(db=db, user=user, enfant_id_titulaire=payload.enfant_id_titulaire)
    db.commit()

    if parent and new:
        admins = db.query(User).filter(User.is_active.is_(True), User.email.isnot(None)).filter(
            User.role.in_([UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN])
        )
        admin_emails = [u.email for u in admins.all() if u.email]
        to = uniq_emails([parent.email] + admin_emails)
        background.add_task(
            send_email,
            to=to,
            subject=subject_titulaire(parent.matricule),
            body=body_titulaire(parent_matricule=parent.matricule, new_titulaire=new, old_titulaire=old),
        )
    return {"ok": True}


@router.post("/desistement/{demande_id}")
def demander_desistement(
    demande_id: int,
    payload: DesistementRequestIn,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
):
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    enfant_label = ""
    if parent:
        d = (
            db.query(DemandeInscription)
            .join(Enfant, Enfant.id == DemandeInscription.enfant_id)
            .filter(DemandeInscription.id == demande_id, Enfant.parent_id == parent.id)
            .first()
        )
        if d:
            enfant_label = f"{d.enfant.prenom} {d.enfant.nom}"

    request_desistement(db=db, user=user, demande_id=demande_id, reason=payload.reason)
    db.commit()

    if parent and enfant_label:
        admins = db.query(User).filter(User.is_active.is_(True), User.email.isnot(None)).filter(
            User.role.in_([UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN])
        )
        admin_emails = [u.email for u in admins.all() if u.email]
        to = uniq_emails([parent.email] + admin_emails)
        now = datetime.now(timezone.utc)
        background.add_task(
            send_email,
            to=to,
            subject=subject_desistement(parent.matricule, enfant_label),
            body=body_desistement_requested(
                parent_matricule=parent.matricule, enfant=enfant_label, when=now, reason=payload.reason
            ),
        )
    return {"ok": True}


def _to_demande_out(db: Session, demande: DemandeInscription) -> DemandeOut:
    db.refresh(demande)
    enfant = demande.enfant
    liste = demande.liste
    return DemandeOut(
        id=demande.id,
        liste_code=liste.code.value,
        rang_dans_liste=demande.rang_dans_liste,
        date_inscription=demande.date_inscription,
        statut=demande.statut.value,
        non_validation_reason=demande.non_validation_reason,
        is_selection_finale=demande.is_selection_finale,
        enfant_id=enfant.id,
        enfant_prenom=enfant.prenom,
        enfant_nom=enfant.nom,
        enfant_date_naissance=enfant.date_naissance,
        enfant_sexe=enfant.sexe.value,
        enfant_lien_parente=enfant.lien_parente.value,
        enfant_is_titulaire=enfant.is_titulaire,
    )

