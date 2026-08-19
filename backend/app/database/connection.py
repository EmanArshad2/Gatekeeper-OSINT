import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import (
    declarative_base,
    sessionmaker,
)
# =====================================================
# DATABASE CONFIGURATION
# =====================================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)
DATABASE_URL = os.getenv("DATABASE_URL")
print(
    "ENV FILE:",
    ENV_PATH,
)
print(
    "DATABASE:",
    DATABASE_URL,
)
if not DATABASE_URL:
    raise Exception(
        "DATABASE_URL not found. Check .env location."
    )
# =====================================================
# POSTGRESQL ENGINE
# =====================================================
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
)
# =====================================================
# SESSION
# =====================================================
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
# =====================================================
# BASE MODEL
# =====================================================
Base = declarative_base()
# =====================================================
# DATABASE DEPENDENCY
# =====================================================
def get_database():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
