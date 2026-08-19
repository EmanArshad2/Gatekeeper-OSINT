"""
One-off migration script for Gatekeeper.
Includes:
- Phase 2 + Phase 2b evidence extraction changes
- Phase 5 investigation case tables
Run from the backend project root:
    python run_migration.py
Safe to re-run — uses IF NOT EXISTS guards.
"""
from sqlalchemy import text
from app.database.connection import engine
STATEMENTS = [
    # ============================================================
    # PHASE 2 + PHASE 2B
    # Evidence extraction enhancements
    # ============================================================
    """
    ALTER TABLE extractions
    ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1;
    """,
    """
    ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS page_number INTEGER DEFAULT 1;
    """,
    """
    ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS ocr_corrected BOOLEAN DEFAULT FALSE;
    """,
    # ============================================================
    # PHASE 5
    # Investigation Cases
    # ============================================================
    """
    CREATE TABLE IF NOT EXISTS cases (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description TEXT,
        status VARCHAR DEFAULT 'ACTIVE',
        analyst VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """,
    # ============================================================
    # PHASE 5
    # Case ↔ Wallet relationship
    # ============================================================
    """
    CREATE TABLE IF NOT EXISTS case_wallets (
        id SERIAL PRIMARY KEY,
        case_id INTEGER NOT NULL,
        wallet_id INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_case_wallets_case
            FOREIGN KEY (case_id)
            REFERENCES cases(id)
            ON DELETE CASCADE,
        CONSTRAINT fk_case_wallets_wallet
            FOREIGN KEY (wallet_id)
            REFERENCES wallets(id)
            ON DELETE CASCADE,
        CONSTRAINT uq_case_wallet
            UNIQUE (case_id, wallet_id)
    );
    """,
]
if __name__ == "__main__":
    print("=" * 60)
    print("GATEKEEPER DATABASE MIGRATION")
    print("=" * 60)
    with engine.begin() as connection:
        for index, statement in enumerate(STATEMENTS, start=1):
            clean_statement = " ".join(statement.split())
            print(f"\n[{index}/{len(STATEMENTS)}]")
            print(f"Running: {clean_statement}")
            connection.execute(text(statement))
    print("\n" + "=" * 60)
    print("Migration complete.")
    print("=" * 60)