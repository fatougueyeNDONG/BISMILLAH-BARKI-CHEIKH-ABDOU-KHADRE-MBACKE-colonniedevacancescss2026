"""Liste tables et colonnes (information_schema) pour la base du .env."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
url = os.getenv("DATABASE_URL")
if not url:
    print("DATABASE_URL manquant", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    eng = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 20})
    q = text(
        """
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
        """
    )
    with eng.connect() as c:
        db = c.execute(text("SELECT current_database()")).scalar()
        print(f"Base: {db}\n")
        rows = c.execute(q).fetchall()
    by_table: dict[str, list] = {}
    for table_name, col_name, dtype, nullable, default in rows:
        by_table.setdefault(table_name, []).append((col_name, dtype, nullable, default))

    for t in sorted(by_table.keys()):
        print(f"## {t}")
        for col_name, dtype, nullable, default in by_table[t]:
            null = "NULL" if nullable == "YES" else "NOT NULL"
            d = f" default {default}" if default else ""
            print(f"  - {col_name}: {dtype}, {null}{d}")
        print()


if __name__ == "__main__":
    main()
