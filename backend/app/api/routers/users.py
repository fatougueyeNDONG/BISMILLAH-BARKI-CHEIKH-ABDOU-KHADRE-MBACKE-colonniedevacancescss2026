from __future__ import annotations

from typing import Any
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.models import Parent, User
from app.schemas.users import (
    AdminUserCreateIn,
    ParentUserCreateIn,
    ResetPasswordIn,
    UserOut,
    UserUpsertIn,
)
from app.services.users import (
    change_password_for_user,
    change_password_self,
    create_user_superadmin,
    set_user_active,
    update_user,
)
from app.schemas.auth import ChangePasswordIn
from app.security import verify_password
from app.models.models import Service  # noqa: F401
from pydantic import ValidationError
from app.services.email import send_email

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%*?-_"
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    users = (
        db.query(User)
        .order_by(User.id.asc())
        .all()
    )
    return [UserOut.model_validate(u) for u in users]


@router.post("", response_model=UserOut)
def create_user(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    role = payload.get("role")
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="role requis")

    # Front peut envoyer role en string (ex: "PARENT"). On normalise en enum.
    try:
        role_enum = UserRole(role) if isinstance(role, str) else role
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="role invalide") from e

    # Parent
    if role_enum == UserRole.PARENT:
        try:
            p = ParentUserCreateIn.model_validate(payload)
        except ValidationError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

        user = create_user_superadmin(
            db=db,
            role=UserRole.PARENT,
            name=p.name,
            password=p.password,
            email=str(p.email) if p.email else None,
            matricule=p.matricule,
            parent_payload={"prenom": p.prenom, "nom": p.nom, "service": p.service, "site_code": p.site_code},
        )
        return UserOut.model_validate(user)

    # Admin / gestionnaire / super admin (super admin aussi)
    try:
        a = AdminUserCreateIn.model_validate(payload)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    temp_password = _generate_temp_password()
    user = create_user_superadmin(
        db=db,
        role=a.role,
        name=a.name,
        password=temp_password,
        email=str(a.email) if a.email else None,
        matricule=a.matricule,
        parent_payload=None,
        must_change_password=True,
    )
    if user.email:
        send_email(
            to=[user.email],
            subject="Colonie 2026 — Vos identifiants temporaires",
            body=(
                "Bonjour,\n\n"
                f"Votre compte administrateur a été créé.\n"
                f"- Email: {user.email}\n"
                f"- Mot de passe temporaire: {temp_password}\n\n"
                "Lien de connexion: http://localhost:8080\n\n"
                "À la première connexion, vous serez obligé de changer ce mot de passe.\n"
                "Cordialement.\n"
            ),
        )
    return UserOut.model_validate(user)


@router.patch("/{user_id}", response_model=UserOut)
def upsert_user(
    user_id: int,
    payload: UserUpsertIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    user = update_user(
        db,
        user_id=user_id,
        name=payload.name,
        is_active=payload.is_active,
        email=payload.email,
    )
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    set_user_active(db, user_id=user_id, is_active=False)
    db.commit()
    return {"ok": True}


@router.post("/{user_id}/reset-password")
def reset_password_user(
    user_id: int,
    payload: ResetPasswordIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    change_password_for_user(db, user_id=user_id, new_password=payload.new_password)
    db.commit()
    return {"ok": True}


"""
L’endpoint de changement de mot de passe “changer mon mot de passe” est exposé
dans `app/api/routers/auth.py` via `POST /auth/change-password`.
"""

