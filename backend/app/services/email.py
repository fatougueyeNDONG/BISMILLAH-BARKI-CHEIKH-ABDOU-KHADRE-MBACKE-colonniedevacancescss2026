from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Iterable, Sequence

from app.core.config import get_settings


def _is_configured() -> bool:
    s = get_settings()
    return bool(s.smtp_host and s.smtp_from)


def send_email(*, to: Sequence[str], subject: str, body: str, html_body: str | None = None) -> None:
    """
    Envoi SMTP simple.
    - Si SMTP n'est pas configuré, on ne fait rien (no-op) pour ne pas casser l’API.
    """
    if not to:
        return
    if not _is_configured():
        return

    s = get_settings()
    msg = EmailMessage()
    msg["From"] = s.smtp_from
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    msg.set_content(body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=20) as smtp:
        smtp.ehlo()
        try:
            smtp.starttls()
            smtp.ehlo()
        except Exception:
            # Certains serveurs n'utilisent pas TLS sur ce port
            pass

        if s.smtp_username and s.smtp_password:
            smtp.login(s.smtp_username, s.smtp_password)

        smtp.send_message(msg)


def uniq_emails(emails: Iterable[str | None]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for e in emails:
        if not e:
            continue
        val = e.strip().lower()
        if not val or val in seen:
            continue
        seen.add(val)
        out.append(val)
    return out

