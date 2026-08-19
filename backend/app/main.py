import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
# =====================================================
# API MODULES
# =====================================================
from app.api import (
    audit,
    cases,
    evidence,
    graph,
    history,
    investigation,
    keywords,
    notifications,
    osint,
    reports,
    risk_analysis,
    search,
    threat_intelligence,
    tweets,
    wallets,
)
from app.api.extraction import router as extraction_router
from app.api.health import router as health_router
from app.api.settings import router as settings_router
# =====================================================
# ROUTERS
# =====================================================
from app.routers import dashboard
from app.routers.collectors import router as collectors_router
# =====================================================
# DATABASE
# =====================================================
from app.database import models
from app.database.connection import Base, engine
from app.database.neo4j import close_neo4j
# =====================================================
# TELEGRAM COLLECTOR
# =====================================================
from app.core.telegram.collector import (
    start_collector,
    stop_collector,
)
# =====================================================
# LOGGING
# =====================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("gatekeeper")
# =====================================================
# PATHS
# =====================================================
BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
# Make sure the local media/evidence directory exists.
MEDIA_DIR.mkdir(
    parents=True,
    exist_ok=True,
)
# =====================================================
# APPLICATION LIFESPAN
# =====================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gatekeeper application lifecycle.
    Startup:
        - Initialize SQL database.
        - Start Telegram OSINT collector.
    Shutdown:
        - Stop Telegram collector.
        - Close Neo4j connection.
    """
    logger.info("==================================================")
    logger.info("Starting Gatekeeper...")
    logger.info("==================================================")
    telegram_task = None
    # =================================================
    # INITIALIZE SQL DATABASE
    # =================================================
    try:
        Base.metadata.create_all(
            bind=engine,
        )
        logger.info(
            "[DATABASE] SQL database initialized"
        )
    except Exception as error:
        logger.exception(
            "[DATABASE] Database initialization failed: %s",
            error,
        )
    # =================================================
    # START TELEGRAM OSINT COLLECTOR
    # =================================================
    try:
        logger.info(
            "[COLLECTOR:telegram] "
            "Starting automatic Telegram collector"
        )
        telegram_task = asyncio.create_task(
            start_collector()
        )
        logger.info(
            "[COLLECTOR:telegram] "
            "Collector task started automatically"
        )
    except Exception as error:
        logger.exception(
            "[COLLECTOR:telegram] "
            "Failed to start Telegram collector: %s",
            error,
        )
    # =================================================
    # APPLICATION RUNNING
    # =================================================
    logger.info("==================================================")
    logger.info("Gatekeeper is ONLINE")
    logger.info("==================================================")
    yield
    # =================================================
    # SHUTDOWN
    # =================================================
    logger.info("==================================================")
    logger.info("Shutting down Gatekeeper...")
    logger.info("==================================================")
    # =================================================
    # STOP TELEGRAM COLLECTOR
    # =================================================
    try:
        logger.info(
            "[COLLECTOR:telegram] "
            "Stopping Telegram collector"
        )
        await stop_collector()
        if telegram_task is not None:
            if not telegram_task.done():
                telegram_task.cancel()
            try:
                await telegram_task
            except asyncio.CancelledError:
                pass
        logger.info(
            "[COLLECTOR:telegram] "
            "Telegram collector stopped"
        )
    except Exception as error:
        logger.exception(
            "[COLLECTOR:telegram] "
            "Telegram shutdown failed: %s",
            error,
        )
    # =================================================
    # CLOSE NEO4J
    # =================================================
    try:
        close_neo4j()
        logger.info(
            "[DATABASE] Neo4j connection closed"
        )
    except Exception as error:
        logger.exception(
            "[DATABASE] Neo4j shutdown failed: %s",
            error,
        )
    # =================================================
    # SHUTDOWN COMPLETE
    # =================================================
    logger.info("==================================================")
    logger.info("Gatekeeper shutdown complete")
    logger.info("==================================================")
# =====================================================
# FASTAPI APPLICATION
# =====================================================
app = FastAPI(
    title="Gatekeeper",
    description=(
        "Crypto OSINT Investigation & "
        "Digital Evidence Platform"
    ),
    version="2.0.0",
    lifespan=lifespan,
)
# =====================================================
# CORS
# =====================================================
# Previously this only whitelisted localhost:3000 / 127.0.0.1:3000.
# Any frontend served from a different dev port (3001, a LAN IP, a
# Docker service name, an ngrok tunnel, etc.) was silently blocked by
# the browser — the request never even reached FastAPI's route
# handlers, which is exactly the "works in Swagger, not in the app"
# symptom (Swagger is same-origin against the backend, so it never hits
# CORS at all). EXTRA_CORS_ORIGINS lets you add your real frontend
# origin via env without editing code, e.g.:
#   EXTRA_CORS_ORIGINS=http://localhost:3001,http://192.168.1.20:3000
_extra_origins = [
    origin.strip()
    for origin in os.environ.get("EXTRA_CORS_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        *_extra_origins,
    ],
    allow_credentials=True,
    allow_methods=[
        "*",
    ],
    allow_headers=[
        "*",
    ],
)
# =====================================================
# LOCAL MEDIA / DIGITAL EVIDENCE
# =====================================================
"""
Serves locally stored media/evidence files.
Example:
backend/
├── main.py
├── media/
│   ├── image1.jpg
│   ├── image2.png
│   └── ...
└── app/
Browser URL:
http://127.0.0.1:8000/media/image1.jpg
"""
app.mount(
    "/media",
    StaticFiles(
        directory=str(MEDIA_DIR),
    ),
    name="media",
)
# =====================================================
# API ROUTES
# =====================================================
# -----------------------------------------------------
# Core
# -----------------------------------------------------
app.include_router(
    health_router,
    prefix="/api",
)
app.include_router(
    extraction_router,
    prefix="/api",
)
# -----------------------------------------------------
# Reports
# -----------------------------------------------------
app.include_router(
    reports.router,
    prefix="/api",
    tags=["Reports"],
)
# -----------------------------------------------------
# History
# -----------------------------------------------------
app.include_router(
    history.router,
    prefix="/api",
)
# -----------------------------------------------------
# Dashboard
# -----------------------------------------------------
app.include_router(
    dashboard.router,
    prefix="/api",
)
# -----------------------------------------------------
# Risk Analysis
# -----------------------------------------------------
app.include_router(
    risk_analysis.router,
    prefix="/api",
)
# -----------------------------------------------------
# Collectors
# -----------------------------------------------------
app.include_router(
    collectors_router,
    prefix="/api",
)
# -----------------------------------------------------
# Settings
# -----------------------------------------------------
app.include_router(
    settings_router,
    prefix="/api",
)
# -----------------------------------------------------
# Search
# -----------------------------------------------------
app.include_router(
    search.router,
    prefix="/api",
)
# -----------------------------------------------------
# Cases
# -----------------------------------------------------
app.include_router(
    cases.router,
    prefix="/api",
)
# -----------------------------------------------------
# Notifications
# -----------------------------------------------------
app.include_router(
    notifications.router,
    prefix="/api",
)
# -----------------------------------------------------
# Evidence
# -----------------------------------------------------
app.include_router(
    evidence.router,
    prefix="/api",
)
# -----------------------------------------------------
# Wallets
# -----------------------------------------------------
app.include_router(
    wallets.router,
    prefix="/api",
    tags=["Wallets"],
)
# -----------------------------------------------------
# Threat Intelligence
# -----------------------------------------------------
app.include_router(
    threat_intelligence.router,
    prefix="/api",
    tags=["Threat Intelligence"],
)
# -----------------------------------------------------
# Graph
# -----------------------------------------------------
app.include_router(
    graph.router,
    prefix="/api",
)
# -----------------------------------------------------
# OSINT
# -----------------------------------------------------
app.include_router(
    osint.router,
    prefix="/api",
)
# -----------------------------------------------------
# Investigations
# -----------------------------------------------------
app.include_router(
    investigation.router,
    prefix="/api",
)
# -----------------------------------------------------
# Tweets / X OSINT
# -----------------------------------------------------
app.include_router(
    tweets.router,
    prefix="/api",
)
# -----------------------------------------------------
# Audit
# -----------------------------------------------------
app.include_router(
    audit.router,
    prefix="/api",
)
# -----------------------------------------------------
# Keywords
# -----------------------------------------------------
app.include_router(
    keywords.router,
    prefix="/api",
)
# =====================================================
# ROOT
# =====================================================
@app.get("/")
def root():
    return {
        "system": "Gatekeeper v2",
        "status": "ONLINE",
        "version": "2.0.0",
        "modules": [
            "OCR",
            "QR Scanner",
            "Wallet Detection",
            "Risk Engine",
            "OSINT Correlation",
            "Neo4j Graph",
            "Digital Evidence",
            "X/Twitter Collection",
            "Investigation Engine",
        ],
        "endpoints": {
            "health": "/api/health",
            "tweets": "/api/tweets",
            "investigation": "/api/tweets/{tweet_id}/investigate",
            "evidence": "/api/evidence",
            "wallets": "/api/wallets",
            "media": "/media",
        },
    }