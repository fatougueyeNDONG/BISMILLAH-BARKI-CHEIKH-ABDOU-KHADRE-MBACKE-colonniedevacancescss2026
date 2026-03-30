from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import DemandeStatut, ListeCode, UserRole
from app.models.models import DemandeInscription, Enfant, Parent, User
from app.schemas.inscriptions import (
    DemandeOut,
    DesistementRequestIn,
    InscriptionCreateIn,
    TitulaireUpdateIn,
    TransparenceInscriptionOut,
)
from app.services.inscriptions import (
    TELEPHONE_DEJA_UTILISE_DETAIL,
    cancel_desistement,
    create_inscription_for_parent_user,
    ensure_listes_exist,
    reinscrire_desiste,
    request_desistement,
    set_titulaire,
)
from app.services.email import send_email, uniq_emails
from app.services.notify_helpers import collect_admin_emails
from app.services.email_templates import (
    body_desistement_requested,
    body_inscription,
    body_inscription_admin_notify,
    body_titulaire,
    subject_desistement,
    subject_inscription,
    subject_inscription_admin_notify,
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
    try:
        demande = create_inscription_for_parent_user(
            db=db,
            user=user,
            parent_prenom=payload.parent.prenom,
            parent_nom=payload.parent.nom,
            parent_matricule=payload.parent.matricule,
            parent_service_nom=payload.parent.service,
            parent_email=payload.parent.email,
            parent_telephone=payload.parent.telephone,
            parent_site_code=payload.parent.site_code,
            enfant_prenom=payload.enfant.prenom,
            enfant_nom=payload.enfant.nom,
            enfant_date_naissance=payload.enfant.date_naissance,
            enfant_sexe=payload.enfant.sexe,
            enfant_lien_parente=payload.enfant.lien_parente,
        )
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raw = str(getattr(e, "orig", e) or e).lower()
        if "telephone" in raw or "parents_telephone" in raw:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=TELEPHONE_DEJA_UTILISE_DETAIL,
            ) from None
        raise
    db.refresh(demande)
    out = _to_demande_out(db, demande)

    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    parent_email = parent.email if parent else None
    admin_emails = collect_admin_emails(db)

    enfant_label = f"{payload.enfant.prenom} {payload.enfant.nom}"
    subject_parent = subject_inscription(payload.parent.matricule, enfant_label)
    body_parent = body_inscription(
        parent_matricule=payload.parent.matricule,
        enfant_prenom=payload.enfant.prenom,
        enfant_nom=payload.enfant.nom,
        liste=out.liste_code,
        rang=out.rang_dans_liste,
        date=out.date_inscription,
    )
    to_parent = uniq_emails([parent_email])
    if to_parent:
        background.add_task(send_email, to=to_parent, subject=subject_parent, body=body_parent)

    to_admins = uniq_emails(admin_emails)
    if to_admins:
        subject_admin = subject_inscription_admin_notify(payload.parent.matricule, enfant_label)
        body_admin = body_inscription_admin_notify(
            parent_matricule=payload.parent.matricule,
            parent_prenom=payload.parent.prenom,
            parent_nom=payload.parent.nom,
            enfant_prenom=payload.enfant.prenom,
            enfant_nom=payload.enfant.nom,
            liste=out.liste_code,
            rang=out.rang_dans_liste,
            date=out.date_inscription,
        )
        background.add_task(send_email, to=to_admins, subject=subject_admin, body=body_admin)

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


_LISTE_ORDRE: dict[ListeCode, int] = {
    ListeCode.PRINCIPALE: 0,
    ListeCode.ATTENTE_N1: 1,
    ListeCode.ATTENTE_N2: 2,
}


@router.get("/inscriptions-transparence", response_model=list[TransparenceInscriptionOut])
def list_inscriptions_transparence(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
) -> list[TransparenceInscriptionOut]:
    """Toutes les demandes d'inscription (listes), en consultation — parent authentifié."""
    _ = user
    ensure_listes_exist(db)
    demandes = (
        db.query(DemandeInscription)
        .options(
            joinedload(DemandeInscription.enfant).joinedload(Enfant.parent),
            joinedload(DemandeInscription.liste),
        )
        .all()
    )

    def _cle_tri(d: DemandeInscription) -> tuple[int, int, int]:
        code = d.liste.code
        return (_LISTE_ORDRE.get(code, 99), d.rang_dans_liste, d.id)

    demandes_tri = sorted(demandes, key=_cle_tri)
    rows: list[TransparenceInscriptionOut] = []
    for d in demandes_tri:
        e = d.enfant
        p = e.parent
        liste = d.liste
        d_ins = d.date_inscription
        if isinstance(d_ins, datetime):
            when = d_ins if d_ins.tzinfo else d_ins.replace(tzinfo=timezone.utc)
        else:
            when = datetime.combine(d_ins, datetime.min.time(), tzinfo=timezone.utc)
        rows.append(
            TransparenceInscriptionOut(
                demande_id=d.id,
                liste_code=liste.code.value,
                rang_dans_liste=d.rang_dans_liste,
                date_inscription=when,
                statut_demande=d.statut.value,
                parent_matricule=p.matricule,
                parent_prenom=p.prenom,
                parent_nom=p.nom,
                parent_service=p.service_text,
                enfant_prenom=e.prenom,
                enfant_nom=e.nom,
                enfant_date_naissance=e.date_naissance,
                enfant_sexe=e.sexe.value,
                enfant_lien_parente=e.lien_parente.value,
                enfant_is_titulaire=e.is_titulaire,
            )
        )
    return rows


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
        admin_emails = collect_admin_emails(db)
        to = uniq_emails(([parent.email] if parent.email else []) + admin_emails)
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
        admin_emails = collect_admin_emails(db)
        to = uniq_emails(([parent.email] if parent.email else []) + admin_emails)
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


@router.post("/desistement/{demande_id}/annuler")
def annuler_desistement(
    demande_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
):
    cancel_desistement(db=db, user=user, demande_id=demande_id)
    db.commit()
    return {"ok": True}


@router.post("/desistement/{demande_id}/reinscrire", response_model=DemandeOut)
def reinscrire_enfant_desiste(
    demande_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.PARENT)),
):
    demande = reinscrire_desiste(db=db, user=user, demande_id=demande_id)
    db.commit()
    db.refresh(demande)
    return _to_demande_out(db, demande)


def _to_demande_out(db: Session, demande: DemandeInscription) -> DemandeOut:
    db.refresh(demande)
    enfant = demande.enfant
    liste = demande.liste
    d_ins = demande.date_inscription
    if isinstance(d_ins, datetime):
        when = d_ins
    else:
        when = datetime.combine(d_ins, datetime.min.time(), tzinfo=timezone.utc)
    return DemandeOut(
        id=demande.id,
        liste_code=liste.code.value,
        rang_dans_liste=demande.rang_dans_liste,
        date_inscription=when,
        statut=demande.statut.value,
        non_validation_reason=demande.non_validation_reason or None,
        is_selection_finale=(demande.statut == DemandeStatut.RETENUE),
        enfant_id=enfant.id,
        enfant_prenom=enfant.prenom,
        enfant_nom=enfant.nom,
        enfant_date_naissance=enfant.date_naissance,
        enfant_sexe=enfant.sexe.value,
        enfant_lien_parente=enfant.lien_parente.value,
        enfant_is_titulaire=enfant.is_titulaire,
    )

