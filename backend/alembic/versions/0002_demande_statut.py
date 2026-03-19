"""Add demande statut and non-validation reason.

Revision ID: 0002_demande_statut
Revises: 0001_initial
Create Date: 2026-03-18
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_demande_statut"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    demande_statut = sa.Enum("SOUMISE", "RETENUE", "NON_VALIDEE", "DESISTEE", name="demande_statut")
    demande_statut.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "demandes_inscription",
        sa.Column("statut", demande_statut, nullable=False, server_default="SOUMISE"),
    )
    op.add_column(
        "demandes_inscription",
        sa.Column("non_validation_reason", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("demandes_inscription", "non_validation_reason")
    op.drop_column("demandes_inscription", "statut")
    op.execute("DROP TYPE IF EXISTS demande_statut")

