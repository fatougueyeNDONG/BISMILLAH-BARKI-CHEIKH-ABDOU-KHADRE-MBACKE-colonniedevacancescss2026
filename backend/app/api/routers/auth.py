from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.models import Parent, User
from app.schemas.auth import (
    AdminLoginRequest,
    ChangePasswordIn,
    FirstLoginChangePasswordIn,
    ParentLoginRequest,
    TokenResponse,
)
from app.security import create_access_token, hash_password, verify_password
from app.services import admin_must_change_store
from app.services.users import change_password_self

router = APIRouter(prefix="/auth", tags=["auth"])
DEFAULT_PARENT_PASSWORD = "Passer123"


def _must_change_password(user: User) -> bool:
    if user.role == UserRole.PARENT:
        return verify_password(DEFAULT_PARENT_PASSWORD, user.password)
    return admin_must_change_store.get_flag(user.id)


def _resolve_admin_login_user(db: Session, login: str) -> User | None:
    login = login.strip()
    if not login:
        return None
    return (
        db.query(User)
        .filter(
            or_(
                User.matricule == login,
                User.remember_token == login,
            )
        )
        .first()
    )


@router.post("/login-parent", response_model=TokenResponse)
def login_parent(payload: ParentLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.matricule == payload.matricule).first()
    if not user or user.role != UserRole.PARENT or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Matricule ou mot de passe incorrect.")
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Matricule ou mot de passe incorrect.")
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token, must_change_password=_must_change_password(user))


@router.post("/login-admin", response_model=TokenResponse)
def login_admin(payload: AdminLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = _resolve_admin_login_user(db, payload.email)
    if not user or user.role not in {UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN} or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect.")
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect.")
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token, must_change_password=_must_change_password(user))


@router.post("/change-password")
def change_password(
    payload: ChangePasswordIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, bool]:
    change_password_self(db, user=user, old_password=payload.old_password, new_password=payload.new_password)
    db.commit()
    return {"ok": True}


@router.post("/change-password-first-login")
def change_password_first_login(
    payload: FirstLoginChangePasswordIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, bool]:
    if user.role not in {UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint reserve aux comptes administrateurs.",
        )
    if not admin_must_change_store.get_flag(user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun changement de mot de passe obligatoire n'est requis.",
        )
    user.password = hash_password(payload.new_password)
    admin_must_change_store.clear_flag(user.id)
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contact = None
    if user.role in {UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN}:
        contact = user.remember_token if user.remember_token and "@" in user.remember_token else None
    payload = {
        "id": user.id,
        "role": user.role.value,
        "name": user.name,
        "email": contact,
        "matricule": user.matricule,
    }
    if user.role == UserRole.PARENT:
        parent = db.query(Parent).filter(Parent.user_id == user.id).first()
        payload["parent"] = {
            "prenom": parent.prenom if parent else None,
            "nom": parent.nom if parent else None,
            "matricule": parent.matricule if parent else user.matricule,
            "service": parent.service_text if parent else None,
        }
    return payload
