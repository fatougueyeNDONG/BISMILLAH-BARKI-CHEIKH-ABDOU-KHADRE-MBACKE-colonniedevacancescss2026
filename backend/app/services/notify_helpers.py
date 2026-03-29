from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.models import User


def collect_admin_emails(db: Session) -> list[str]:
    rows = (
        db.query(User)
        .filter(User.is_active.is_(True))
        .filter(User.role.in_([UserRole.GESTIONNAIRE, UserRole.SUPER_ADMIN]))
        .filter(User.remember_token.isnot(None))
        .all()
    )
    return [u.remember_token for u in rows if u.remember_token and "@" in u.remember_token]
