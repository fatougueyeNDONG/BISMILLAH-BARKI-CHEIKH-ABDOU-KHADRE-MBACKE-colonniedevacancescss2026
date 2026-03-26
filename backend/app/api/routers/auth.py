from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

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
from app.security import create_access_token, verify_password
from app.api.deps import get_current_user
from app.services.users import change_password_self
from app.security import hash_password

router = APIRouter(prefix="/auth", tags=["auth"])
DEFAULT_PARENT_PASSWORD = "Passer123"


@router.post("/login-parent", response_model=TokenResponse)
def login_parent(payload: ParentLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.matricule == payload.matricule).first()
    if not user or user.role != UserRole.PARENT or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Matricule ou mot de passe incorrect.")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Matricule ou mot de passe incorrect.")
    token = create_access_token(subject=str(user.id), role=user.role.value)
    # Flux parent inchangé: obligation uniquement si le parent est encore sur le mot de passe par défaut.
    must_change_password = verify_password(DEFAULT_PARENT_PASSWORD, user.password_hash)
    return TokenResponse(access_token=token, must_change_password=must_change_password)


@router.post("/login-admin", response_model=TokenResponse)
def login_admin(payload: AdminLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or user.role not in {UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN} or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect.")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect.")
    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token, must_change_password=user.must_change_password)


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
    if not user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun changement de mot de passe obligatoire n'est requis.",
        )
    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    payload = {
        "id": user.id,
        "role": user.role.value,
        "name": user.name,
        "email": user.email,
        "matricule": user.matricule,
    }
    if user.role == UserRole.PARENT:
        parent = db.query(Parent).filter(Parent.user_id == user.id).first()
        payload["parent"] = {
            "prenom": parent.prenom if parent else None,
            "nom": parent.nom if parent else None,
            "matricule": parent.matricule if parent else user.matricule,
            "service": parent.service.nom if parent and parent.service else None,
        }
    return payload

