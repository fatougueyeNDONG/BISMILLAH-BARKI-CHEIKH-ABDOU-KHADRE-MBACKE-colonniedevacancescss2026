"""resequence rang_dans_liste without touching roles/status

Revision ID: 0006_resequence_rang_dans_liste
Revises: 0004_user_must_change_password
Create Date: 2026-03-30 00:00:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "0006_resequence_rang_dans_liste"
down_revision = "0004_user_must_change_password"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Compat: certains environnements ont encore la colonne `rang`.
    # On la renomme en `rang_dans_liste` si nécessaire.
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'demandes' AND column_name = 'rang'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'demandes' AND column_name = 'rang_dans_liste'
          ) THEN
            ALTER TABLE demandes RENAME COLUMN rang TO rang_dans_liste;
          END IF;
        END $$;
        """
    )

    # Recalcule les rangs par liste selon l'ordre chronologique.
    # Ne touche ni aux statuts, ni aux liens parent/enfant, ni au titulaire.
    op.execute(
        """
        WITH reseq AS (
          SELECT
            d.id,
            ROW_NUMBER() OVER (
              PARTITION BY d.liste_id
              ORDER BY d.date_inscription ASC, d.id ASC
            ) AS new_rang
          FROM demandes d
        )
        UPDATE demandes d
        SET rang_dans_liste = reseq.new_rang
        FROM reseq
        WHERE d.id = reseq.id
        """
    )


def downgrade() -> None:
    # Opération non réversible: les anciens rangs ne sont pas conservés.
    pass
