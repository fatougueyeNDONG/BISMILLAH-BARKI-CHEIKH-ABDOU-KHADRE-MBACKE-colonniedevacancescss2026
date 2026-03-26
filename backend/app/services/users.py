from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.enums import ListeCode, LienParente, UserRole
from app.models.models import Parent, Service, Site, User
from app.security import hash_password


def _get_or_create_service(db: Session, nom: str) -> Service:
    svc = db.query(Service).filter(Service.nom == nom).first()
    if svc:
        return svc
    svc = Service(nom=nom, description=None)
    db.add(svc)
    db.flush()
    return svc


def _get_or_create_site(db: Session, site_code: str) -> Optional[Site]:
    # Pour rester flexible : si site_code est fourni mais qu’on ne connaît pas le nom,
    # on crée un site avec un nom identique au code.
    if not site_code:
        return None
    s = db.query(Site).filter(Site.code == site_code).first()
    if s:
        return s
    s = Site(nom=site_code, code=site_code, description=None)
    db.add(s)
    db.flush()
    return s


def create_user_superadmin(
    *,
    db: Session,
    role: UserRole,
    name: str,
    password: str,
    email: Optional[str] = None,
    matricule: Optional[str] = None,
    parent_payload: dict | None = None,
    must_change_password: bool = False,
) -> User:
    if role == UserRole.PARENT:
        if not matricule or not email is None and email == "":
            pass
        # Construit Parent à partir du payload dédié
        if not parent_payload:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payload parent requis.")
        prenom = parent_payload["prenom"]
        nom_parent = parent_payload["nom"]
        service_nom = parent_payload["service"]
        site_code = parent_payload.get("site_code")

        user = User(
            role=role,
            name=name,
            email=email,
            matricule=matricule,
            password_hash=hash_password(password),
            is_active=True,
            must_change_password=must_change_password,
        )
        db.add(user)
        db.flush()

        service = _get_or_create_service(db, service_nom)
        site = _get_or_create_site(db, site_code) if site_code else None
        parent = Parent(
            prenom=prenom,
            nom=nom_parent,
            matricule=matricule,
            email=email,
            telephone=None,
            genre=None,
            nin=None,
            adresse=None,
            service_id=service.id if service else None,
            site_id=site.id if site else None,
            user_id=user.id,
        )
        db.add(parent)
        db.flush()
        return user

    # Gestionnaire / Super admin : on ne crée pas un profil Parent
    if role in {UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN}:
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email requis pour ce rôle.")
        user = User(
            role=role,
            name=name,
            email=email,
            matricule=matricule,
            password_hash=hash_password(password),
            is_active=True,
            must_change_password=must_change_password,
        )
        db.add(user)
        db.flush()
        return user

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rôle non supporté.")


def set_user_active(db: Session, *, user_id: int, is_active: bool) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    user.is_active = is_active
    db.add(user)
    db.flush()
    return user


def update_user(
    db: Session,
    *,
    user_id: int,
    name: Optional[str],
    is_active: Optional[bool],
    email: Optional[str],
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    if name is not None:
        user.name = name
    if is_active is not None:
        user.is_active = is_active
    if email is not None:
        user.email = email
    db.flush()
    return user


def change_password_for_user(db: Session, *, user_id: int, new_password: str) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.flush()


def change_password_self(db: Session, *, user: User, old_password: str, new_password: str) -> None:
    from app.security import verify_password

    if not verify_password(old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mot de passe actuel incorrect.")
    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.flush()

