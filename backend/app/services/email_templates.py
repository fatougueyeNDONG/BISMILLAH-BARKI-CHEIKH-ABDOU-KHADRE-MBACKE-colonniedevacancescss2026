from __future__ import annotations

from datetime import datetime


def _dt(d: datetime | None) -> str:
    if not d:
        return ""
    return d.strftime("%Y-%m-%d %H:%M")


def subject_inscription(parent_matricule: str, enfant_nom: str) -> str:
    return f"Colonie 2026 — Confirmation inscription ({parent_matricule}) — {enfant_nom}"


def body_inscription(*, parent_matricule: str, enfant_prenom: str, enfant_nom: str, liste: str, rang: int, date: datetime):
    return (
        "Bonjour,\n\n"
        "Votre inscription a bien été enregistrée.\n\n"
        f"- Matricule: {parent_matricule}\n"
        f"- Enfant: {enfant_prenom} {enfant_nom}\n"
        f"- Liste: {liste}\n"
        f"- Rang: {rang}\n"
        f"- Date: {_dt(date)}\n\n"
        "Cordialement.\n"
    )


def subject_inscription_admin_notify(parent_matricule: str, enfant_nom: str) -> str:
    return f"Colonie 2026 — Nouvelle inscription (notification) — {parent_matricule} — {enfant_nom}"


def body_inscription_admin_notify(
    *,
    parent_matricule: str,
    parent_prenom: str,
    parent_nom: str,
    enfant_prenom: str,
    enfant_nom: str,
    liste: str,
    rang: int,
    date: datetime,
):
    """Message pour gestionnaires / super admins (ton informatif, pas « votre inscription »)."""
    return (
        "Bonjour,\n\n"
        "Un parent vient d’enregistrer une nouvelle inscription sur la plateforme Colonie 2026.\n\n"
        f"- Matricule parent: {parent_matricule}\n"
        f"- Parent: {parent_prenom} {parent_nom}\n"
        f"- Enfant: {enfant_prenom} {enfant_nom}\n"
        f"- Liste: {liste}\n"
        f"- Rang: {rang}\n"
        f"- Date d’enregistrement: {_dt(date)}\n\n"
        "Cordialement.\n"
    )


def subject_titulaire(parent_matricule: str) -> str:
    return f"Colonie 2026 — Changement de titulaire ({parent_matricule})"


def body_titulaire(*, parent_matricule: str, new_titulaire: str, old_titulaire: str | None):
    return (
        "Bonjour,\n\n"
        "Un changement de titulaire a été effectué.\n\n"
        f"- Matricule: {parent_matricule}\n"
        f"- Ancien titulaire: {old_titulaire or '—'}\n"
        f"- Nouveau titulaire: {new_titulaire}\n\n"
        "Cordialement.\n"
    )


def subject_selection(parent_matricule: str, enfant_nom: str) -> str:
    return f"Colonie 2026 — Mise à jour sélection finale ({parent_matricule}) — {enfant_nom}"


def body_selection(*, parent_matricule: str, enfant: str, selected: bool, when: datetime):
    return (
        "Bonjour,\n\n"
        "Mise à jour de la sélection finale.\n\n"
        f"- Matricule: {parent_matricule}\n"
        f"- Enfant: {enfant}\n"
        f"- Statut: {'VALIDÉ (partant)' if selected else 'REFUSÉ (non partant)'}\n"
        f"- Date: {_dt(when)}\n\n"
        "Cordialement.\n"
    )


def subject_transfer(parent_matricule: str, enfant_nom: str) -> str:
    return f"Colonie 2026 — Transfert de liste ({parent_matricule}) — {enfant_nom}"


def body_transfer(
    *,
    parent_matricule: str,
    enfant: str,
    from_liste: str,
    from_rang: int,
    to_liste: str,
    to_rang: int,
    reason: str | None,
    when: datetime,
):
    return (
        "Bonjour,\n\n"
        "Votre demande a été transférée vers une autre liste.\n\n"
        f"- Matricule: {parent_matricule}\n"
        f"- Enfant: {enfant}\n"
        f"- Ancienne liste: {from_liste} (rang {from_rang})\n"
        f"- Nouvelle liste: {to_liste} (rang {to_rang})\n"
        f"- Motif: {reason or '—'}\n"
        f"- Date: {_dt(when)}\n\n"
        "Cordialement.\n"
    )


def subject_desistement(parent_matricule: str, enfant_nom: str) -> str:
    return f"Colonie 2026 — Désistement ({parent_matricule}) — {enfant_nom}"


def body_desistement_requested(*, parent_matricule: str, enfant: str, when: datetime, reason: str | None):
    return (
        "Bonjour,\n\n"
        "Votre demande de désistement a bien été enregistrée.\n\n"
        f"- Matricule: {parent_matricule}\n"
        f"- Enfant: {enfant}\n"
        f"- Date: {_dt(when)}\n"
        f"- Motif: {reason or '—'}\n\n"
        "Cordialement.\n"
    )


def body_desistement_validated(*, parent_matricule: str, enfant: str, when: datetime):
    return (
        "Bonjour,\n\n"
        "Votre désistement a été validé. L’enfant ne fait plus partie de la liste finale.\n\n"
        f"- Matricule: {parent_matricule}\n"
        f"- Enfant: {enfant}\n"
        f"- Date: {_dt(when)}\n\n"
        "Cordialement.\n"
    )

