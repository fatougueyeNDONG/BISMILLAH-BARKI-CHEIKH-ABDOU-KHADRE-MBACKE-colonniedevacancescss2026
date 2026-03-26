from __future__ import annotations

import json
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.enums import DemandeStatut, LienParente, ListeCode
from app.models.models import AppSetting, DemandeInscription, Enfant, Liste, Parent, Service, User

SETTINGS_KEY = "runtime_settings"
DEFAULT_MAX_ENFANTS_PAR_PARENT = 2


def _validate_annee_naissance(d: date) -> None:
    annee = d.year
    if annee < 2012 or annee > 2019:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inscription rejetée : année de naissance invalide ({annee}). Doit être entre 2012 et 2019.",
        )


def _get_or_create_service(db: Session, nom: str) -> Service:
    svc = db.query(Service).filter(Service.nom == nom).first()
    if svc:
        return svc
    svc = Service(nom=nom, description=None)
    db.add(svc)
    db.flush()
    return svc


def ensure_listes_exist(db: Session) -> None:
    wanted = {
        ListeCode.PRINCIPALE: ("Liste principale", "Enfants titulaires (premiers enfants)."),
        ListeCode.ATTENTE_N1: ("Liste d’attente N°1", "Deuxièmes enfants (lien ≠ Autre)."),
        ListeCode.ATTENTE_N2: ("Liste d’attente N°2", "Deuxièmes enfants (lien = Autre)."),
    }
    existing = {l.code for l in db.query(Liste).all()}
    for code, (nom, desc) in wanted.items():
        if code not in existing:
            db.add(Liste(code=code, nom=nom, description=desc))
    db.flush()


def _next_rang_for_liste(db: Session, liste_id: int) -> int:
    # Empêche les collisions en concurrence via advisory lock transactionnel
    db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": int(liste_id)})
    current_max = db.query(func.coalesce(func.max(DemandeInscription.rang_dans_liste), 0)).filter(
        DemandeInscription.liste_id == liste_id
    ).scalar()
    return int(current_max) + 1


def _get_max_enfants_par_parent(db: Session) -> int:
    rec = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY).first()
    if not rec:
        return DEFAULT_MAX_ENFANTS_PAR_PARENT
    try:
        payload = json.loads(rec.value)
        val = payload.get("maxEnfantsParParent", DEFAULT_MAX_ENFANTS_PAR_PARENT)
        if val is None:
            return 999999
        max_val = int(val)
        return max_val if max_val > 0 else DEFAULT_MAX_ENFANTS_PAR_PARENT
    except Exception:
        return DEFAULT_MAX_ENFANTS_PAR_PARENT


def _compute_target_liste_code(*, parent_id: int, lien_parente: LienParente, is_first_child: bool) -> ListeCode:
    if is_first_child:
        if lien_parente == LienParente.AUTRE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inscription rejetée : pour le 1er enfant (titulaire), le lien de parenté ne peut pas être « Autre ».",
            )
        return ListeCode.PRINCIPALE

    # deuxième enfant
    return ListeCode.ATTENTE_N2 if lien_parente == LienParente.AUTRE else ListeCode.ATTENTE_N1


def create_inscription_for_parent_user(
    *,
    db: Session,
    user: User,
    parent_prenom: str,
    parent_nom: str,
    parent_matricule: str,
    parent_service_nom: str,
    enfant_prenom: str,
    enfant_nom: str,
    enfant_date_naissance: date,
    enfant_sexe,
    enfant_lien_parente: LienParente,
) -> DemandeInscription:
    if user.matricule is None or user.matricule != parent_matricule:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Matricule non autorisé.")

    _validate_annee_naissance(enfant_date_naissance)

    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    if parent is None:
        service = _get_or_create_service(db, parent_service_nom)
        parent = Parent(
            prenom=parent_prenom,
            nom=parent_nom,
            matricule=parent_matricule,
            email=None,
            telephone=None,
            genre=None,
            nin=None,
            adresse=None,
            service_id=service.id,
            site_id=None,
            user_id=user.id,
        )
        db.add(parent)
        db.flush()
    else:
        # Synchronisation minimale (sans poser de questions)
        parent.prenom = parent_prenom
        parent.nom = parent_nom
        parent.matricule = parent_matricule
        if parent.service_id is None:
            svc = _get_or_create_service(db, parent_service_nom)
            parent.service_id = svc.id

    max_enfants = _get_max_enfants_par_parent(db)
    # Limite dynamique pilotée par le super admin
    nb_enfants = db.query(func.count(Enfant.id)).filter(Enfant.parent_id == parent.id).scalar() or 0
    if nb_enfants >= max_enfants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inscription impossible : vous avez déjà inscrit {max_enfants} enfants (maximum autorisé).",
        )

    is_first_child = nb_enfants == 0
    target_code = _compute_target_liste_code(
        parent_id=parent.id, lien_parente=enfant_lien_parente, is_first_child=is_first_child
    )

    ensure_listes_exist(db)
    target_liste = db.query(Liste).filter(Liste.code == target_code).first()
    if not target_liste:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Liste non configurée.")

    enfant = Enfant(
        parent_id=parent.id,
        prenom=enfant_prenom,
        nom=enfant_nom,
        date_naissance=enfant_date_naissance,
        sexe=enfant_sexe,
        lien_parente=enfant_lien_parente,
        is_titulaire=is_first_child,
    )
    db.add(enfant)
    db.flush()

    rang = _next_rang_for_liste(db, target_liste.id)
    demande = DemandeInscription(
        enfant_id=enfant.id,
        liste_id=target_liste.id,
        rang_dans_liste=rang,
        date_inscription=datetime.now(timezone.utc),
        statut=DemandeStatut.SOUMISE,
        non_validation_reason=None,
        is_selection_finale=False,
        selected_by_user_id=None,
        selected_at=None,
    )
    db.add(demande)
    db.flush()

    return demande


def set_titulaire(*, db: Session, user: User, enfant_id_titulaire: int) -> None:
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent introuvable.")

    enfants = db.query(Enfant).filter(Enfant.parent_id == parent.id).all()
    if len(enfants) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucun enfant inscrit.")
    if len(enfants) == 1:
        # Le seul enfant reste titulaire
        enfants[0].is_titulaire = True
        return

    found = False
    for e in enfants:
        if e.id == enfant_id_titulaire:
            e.is_titulaire = True
            found = True
        else:
            e.is_titulaire = False
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enfant introuvable pour ce parent.")


def request_desistement(*, db: Session, user: User, demande_id: int, reason: str | None) -> None:
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent introuvable.")

    demande = (
        db.query(DemandeInscription)
        .join(Enfant, Enfant.id == DemandeInscription.enfant_id)
        .filter(DemandeInscription.id == demande_id, Enfant.parent_id == parent.id)
        .first()
    )
    if not demande:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable.")
    if demande.desistement is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Désistement déjà demandé.")

    from app.models.models import Desistement

    d = Desistement(
        demande_inscription_id=demande.id,
        validated=False,
        validated_by_user_id=None,
        validated_at=None,
        reason=reason,
    )
    db.add(d)
    db.flush()


def cancel_desistement(*, db: Session, user: User, demande_id: int) -> None:
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent introuvable.")

    demande = (
        db.query(DemandeInscription)
        .join(Enfant, Enfant.id == DemandeInscription.enfant_id)
        .filter(DemandeInscription.id == demande_id, Enfant.parent_id == parent.id)
        .first()
    )
    if not demande:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable.")

    if demande.desistement is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucun désistement à annuler.")

    if demande.desistement.validated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Annulation impossible : le gestionnaire/super administrateur a déjà validé le désistement. "
                "Veuillez contacter le gestionnaire."
            ),
        )

    db.delete(demande.desistement)
    db.flush()


def reinscrire_desiste(*, db: Session, user: User, demande_id: int) -> DemandeInscription:
    parent = db.query(Parent).filter(Parent.user_id == user.id).first()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent introuvable.")

    demande = (
        db.query(DemandeInscription)
        .join(Enfant, Enfant.id == DemandeInscription.enfant_id)
        .filter(DemandeInscription.id == demande_id, Enfant.parent_id == parent.id)
        .first()
    )
    if not demande:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable.")

    if demande.statut != DemandeStatut.DESISTEE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Réinscription impossible : seul un enfant désisté peut être réinscrit.",
        )

    if demande.desistement is None or not demande.desistement.validated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Réinscription impossible : le désistement n'est pas validé.",
        )

    # Respect strict de l'ordre d'arrivée : le rang devient le dernier + 1
    new_rang = _next_rang_for_liste(db, demande.liste_id)
    demande.rang_dans_liste = new_rang
    demande.statut = DemandeStatut.SOUMISE
    demande.non_validation_reason = None
    demande.is_selection_finale = False
    demande.selected_by_user_id = None
    demande.selected_at = None

    # On retire le désistement validé pour permettre un futur cycle normal.
    db.delete(demande.desistement)
    db.flush()
    return demande

