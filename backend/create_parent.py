from __future__ import annotations

import argparse

from fastapi import HTTPException
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.enums import UserRole
from app.models.models import User
from app.services.users import create_user_superadmin


def main() -> None:
    parser = argparse.ArgumentParser(description="Créer un compte PARENT (ligne de commande).")
    parser.add_argument("--matricule", required=True, help="Matricule de connexion (login parent)")
    parser.add_argument("--password", required=True, help="Mot de passe")
    parser.add_argument("--prenom", required=True)
    parser.add_argument("--nom", required=True)
    parser.add_argument("--service", required=True, help="Nom du service (créé si absent)")
    parser.add_argument("--site-code", default=None, help="Code ou nom d’agence/site (optionnel, doit exister si renseigné)")
    parser.add_argument("--email", default=None, help="E-mail du parent (fiche Parent)")
    parser.add_argument("--telephone", default="-")
    parser.add_argument("--nin", default="-")
    parser.add_argument("--genre", default="-")
    parser.add_argument("--adresse", default="-")
    parser.add_argument(
        "--name",
        default=None,
        help="Nom affiché sur le compte User (défaut: « prénom nom »)",
    )
    args = parser.parse_args()

    mat = str(args.matricule).strip()[:191]
    if not mat:
        raise SystemExit("Matricule invalide.")

    display = (args.name or f"{args.prenom} {args.nom}").strip()[:191]
    if not display:
        raise SystemExit("Nom d’affichage invalide.")

    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(User.matricule == mat)).scalars().first()
        if existing:
            raise SystemExit(f"Un utilisateur avec le matricule « {mat} » existe déjà (id={existing.id}). Arrêt.")

        parent_payload = {
            "prenom": args.prenom,
            "nom": args.nom,
            "service": args.service,
            "site_code": args.site_code,
            "telephone": args.telephone,
            "nin": args.nin,
            "genre": args.genre,
            "adresse": args.adresse,
        }
        try:
            user = create_user_superadmin(
                db=db,
                role=UserRole.PARENT,
                name=display,
                password=args.password,
                email=args.email,
                matricule=mat,
                parent_payload=parent_payload,
            )
            db.commit()
        except HTTPException as e:
            raise SystemExit(str(e.detail)) from None

        print(f"PARENT créé: user_id={user.id}, matricule={user.matricule}, nom={display}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
