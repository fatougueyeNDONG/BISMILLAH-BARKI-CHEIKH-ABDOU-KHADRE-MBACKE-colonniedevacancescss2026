from __future__ import annotations

import argparse

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.enums import UserRole
from app.models.models import User
from app.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser(description="Créer un compte GESTIONNAIRE (ligne de commande).")
    parser.add_argument("--email", required=True, help="E-mail de contact (rappel / remember_token)")
    parser.add_argument("--password", required=True, help="Mot de passe (au moins 8 caractères)")
    parser.add_argument("--name", default="Gestionnaire", help="Nom affiché")
    parser.add_argument("--matricule", default=None, help="Matricule de connexion (défaut: partie locale de l’e-mail)")
    args = parser.parse_args()

    mat = (args.matricule or args.email.split("@")[0]).strip()[:191]
    token = str(args.email).strip()[:100]

    db = SessionLocal()
    try:
        existing_mat = db.execute(select(User).where(User.matricule == mat)).scalars().first()
        if existing_mat:
            raise SystemExit(f"Un utilisateur avec le matricule « {mat} » existe déjà (id={existing_mat.id}). Arrêt.")

        user = User(
            role=UserRole.GESTIONNAIRE,
            matricule=mat,
            password=hash_password(args.password),
            name=args.name,
            is_active=True,
            remember_token=token,
        )
        db.add(user)
        db.commit()
        print(f"GESTIONNAIRE créé: id={user.id}, matricule={user.matricule}, contact={token}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
