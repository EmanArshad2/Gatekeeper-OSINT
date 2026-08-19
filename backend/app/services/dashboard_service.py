# =====================================================
# Gatekeeper Dashboard Service
# Database Aggregation Layer
# =====================================================
import json
import logging
from datetime import datetime, timezone
from sqlalchemy import text
from app.database.connection import SessionLocal
logger = logging.getLogger("gatekeeper.dashboard")
# =====================================================
# HELPERS
# =====================================================
def serialize_datetime(value):
    """
    Convert a database datetime into an ISO string.
    """
    if not value:
        return None
    try:
        return value.isoformat()
    except Exception:
        return str(value)
def normalize_wallet_data(wallet_addresses):
    """
    Normalize Telegram wallet_addresses into:
    {
        "address": "...",
        "chain": "ETH"
    }
    Supports:
    [
        "0x123..."
    ]
    or:
    [
        {
            "address": "0x123...",
            "chain": "ETH"
        }
    ]
    or mixed lists.
    """
    if not wallet_addresses:
        return None, None
    # JSON column may arrive as a JSON string.
    if isinstance(wallet_addresses, str):
        try:
            wallet_addresses = json.loads(
                wallet_addresses
            )
        except Exception:
            return wallet_addresses, None
    if not isinstance(wallet_addresses, list):
        return None, None
    if not wallet_addresses:
        return None, None
    # -------------------------------------------------
    # Find the first valid wallet
    # -------------------------------------------------
    for wallet in wallet_addresses:
        # Object format
        if isinstance(wallet, dict):
            address = wallet.get("address")
            chain = wallet.get("chain")
            if address:
                return (
                    str(address),
                    str(chain) if chain else None,
                )
        # String format
        elif isinstance(wallet, str):
            wallet = wallet.strip()
            if wallet:
                return wallet, None
    return None, None
def normalize_keywords(keywords):
    """
    Ensure keywords always arrive at the frontend
    as a list of strings.
    """
    if not keywords:
        return []
    if isinstance(keywords, list):
        return [
            str(keyword)
            for keyword in keywords
            if keyword is not None
        ]
    if isinstance(keywords, str):
        try:
            parsed = json.loads(keywords)
            if isinstance(parsed, list):
                return [
                    str(keyword)
                    for keyword in parsed
                    if keyword is not None
                ]
        except Exception:
            pass
        return [keywords]
    return []
def normalize_chain(chain):
    """
    Normalize blockchain names for consistent
    frontend display and deduplication.
    """
    if not chain:
        return ""
    value = str(chain).strip().upper()
    aliases = {
        "ETHEREUM": "ETHEREUM",
        "ETH": "ETHEREUM",
        "ERC20": "ETHEREUM",
        "ERC-20": "ETHEREUM",
        "BITCOIN": "BITCOIN",
        "BTC": "BITCOIN",
        "TRON": "TRON",
        "TRX": "TRON",
        "TRC20": "TRON",
        "TRC-20": "TRON",
        "SOL": "SOLANA",
        "SOLANA": "SOLANA",
        "LTC": "LITECOIN",
        "LITECOIN": "LITECOIN",
        "XRP": "RIPPLE",
        "RIPPLE": "RIPPLE",
    }
    return aliases.get(
        value,
        value,
    )
def normalize_address(address):
    """
    Normalize wallet address for comparison.
    """
    if not address:
        return ""
    return str(address).strip().lower()
def calculate_risk_level(
    risk_score,
    existing_level=None,
    blacklisted=False,
):
    """
    Calculate a consistent risk level.
    """
    score = float(
        risk_score or 0
    )
    if blacklisted:
        return "CRITICAL"
    existing = (
        str(existing_level).upper()
        if existing_level
        else ""
    )
    if existing == "CRITICAL":
        return "CRITICAL"
    if existing == "HIGH":
        return "HIGH"
    if existing == "MEDIUM":
        return "MEDIUM"
    if existing == "LOW" and score < 40:
        return "LOW"
    if score >= 85:
        return "CRITICAL"
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"
def deduplicate_wallet_alerts(alerts):
    """
    Remove duplicate wallet alerts.
    A wallet is unique by:
        chain + address
    If duplicates exist, keep the highest-risk
    occurrence. If risk is equal, keep the latest
    occurrence.
    """
    unique = {}
    for alert in alerts:
        address = normalize_address(
            alert.get("address")
        )
        chain = normalize_chain(
            alert.get("chain")
        )
        if not address:
            continue
        key = (
            chain,
            address,
        )
        existing = unique.get(key)
        if existing is None:
            unique[key] = alert
            continue
        existing_score = float(
            existing.get("risk_score", 0)
            or 0
        )
        current_score = float(
            alert.get("risk_score", 0)
            or 0
        )
        # Higher risk wins.
        if current_score > existing_score:
            unique[key] = alert
        # If risk is equal, keep the newer record.
        elif current_score == existing_score:
            existing_time = (
                existing.get("time")
                or ""
            )
            current_time = (
                alert.get("time")
                or ""
            )
            if current_time > existing_time:
                unique[key] = alert
    return list(
        unique.values()
    )
def deduplicate_osint_feed(feed):
    """
    Remove duplicate OSINT events.
    Identical source + message + wallet + timestamp
    combinations are considered duplicates.
    """
    unique = []
    seen = set()
    for item in feed:
        source = str(
            item.get("source") or ""
        ).strip().lower()
        message = str(
            item.get("message") or ""
        ).strip().lower()
        address = normalize_address(
            item.get("address")
        )
        chain = normalize_chain(
            item.get("chain")
        )
        timestamp = str(
            item.get("time") or ""
        )
        key = (
            source,
            message,
            address,
            chain,
            timestamp,
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique
def sort_by_time(items):
    """
    Sort dashboard records newest first.
    """
    return sorted(
        items,
        key=lambda item: (
            item.get("time")
            or item.get("created_at")
            or ""
        ),
        reverse=True,
    )
# =====================================================
# MAIN DASHBOARD SERVICE
# =====================================================
def get_dashboard_data():
    db = SessionLocal()
    try:
        # =================================================
        # 1. TOTAL INVESTIGATIONS / CASES
        # =================================================
        investigations = 0
        try:
            result = db.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM cases
                    """
                )
            )
            investigations = int(
                result.scalar() or 0
            )
        except Exception as e:
            logger.warning(
                "Failed to count investigations: %s",
                e,
            )
        # =================================================
        # 2. TRACKED WALLETS
        # =================================================
        wallets = 0
        try:
            result = db.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM wallets
                    """
                )
            )
            wallets = int(
                result.scalar() or 0
            )
        except Exception as e:
            logger.warning(
                "Failed to count wallets: %s",
                e,
            )
        # =================================================
        # 3. HIGH-RISK WALLETS
        # =================================================
        high_risk = 0
        try:
            result = db.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM wallets
                    WHERE
                        risk_score >= 70
                        OR blacklisted = TRUE
                    """
                )
            )
            high_risk = int(
                result.scalar() or 0
            )
        except Exception as e:
            logger.warning(
                "Failed to count high-risk wallets: %s",
                e,
            )
        # =================================================
        # 4. OSINT CORRELATIONS
        #
        # Counts actual OSINT events containing
        # wallet intelligence.
        # =================================================
        osint_matches = 0
        telegram_matches = 0
        twitter_matches = 0
        try:
            telegram_matches = int(
                db.execute(
                    text(
                        """
                        SELECT COUNT(*)
                        FROM telegram_messages
                        WHERE
                            wallet_addresses IS NOT NULL
                            AND wallet_addresses::text
                                NOT IN (
                                    '[]',
                                    'null',
                                    ''
                                )
                        """
                    )
                ).scalar()
                or 0
            )
        except Exception as e:
            logger.warning(
                "Failed to count Telegram correlations: %s",
                e,
            )
        try:
            twitter_matches = int(
                db.execute(
                    text(
                        """
                        SELECT COUNT(*)
                        FROM tweets
                        WHERE wallet_count > 0
                        """
                    )
                ).scalar()
                or 0
            )
        except Exception as e:
            logger.warning(
                "Failed to count Twitter correlations: %s",
                e,
            )
        osint_matches = (
            telegram_matches
            + twitter_matches
        )
        # =================================================
        # 5. RECENT INVESTIGATIONS
        # =================================================
        recent_investigations = []
        try:
            result = db.execute(
                text(
                    """
                    SELECT
                        id,
                        name,
                        status,
                        created_at
                    FROM cases
                    ORDER BY created_at DESC
                    LIMIT 6
                    """
                )
            )
            for row in result.fetchall():
                recent_investigations.append(
                    {
                        "id": row.id,
                        "title": (
                            row.name
                            or
                            f"Investigation #{row.id}"
                        ),
                        "status": (
                            row.status
                            or "ACTIVE"
                        ),
                        "created_at":
                            serialize_datetime(
                                row.created_at
                            ),
                    }
                )
        except Exception as e:
            logger.warning(
                "Failed to load recent investigations: %s",
                e,
            )
        # =================================================
        # 6. PRIORITY WALLET ALERTS
        # =================================================
        wallet_alerts = []
        try:
            result = db.execute(
                text(
                    """
                    SELECT
                        address,
                        chain,
                        risk_score,
                        risk_level,
                        blacklisted,
                        created_at
                    FROM wallets
                    WHERE
                        risk_score >= 40
                        OR blacklisted = TRUE
                    ORDER BY
                        risk_score DESC,
                        created_at DESC
                    LIMIT 30
                    """
                )
            )
            for row in result.fetchall():
                risk_score = float(
                    row.risk_score or 0
                )
                blacklisted = bool(
                    row.blacklisted
                )
                risk_level = (
                    calculate_risk_level(
                        risk_score,
                        row.risk_level,
                        blacklisted,
                    )
                )
                wallet_alerts.append(
                    {
                        "address":
                            (
                                str(row.address)
                                if row.address
                                else ""
                            ),
                        "chain":
                            normalize_chain(
                                row.chain
                            ),
                        "risk_score":
                            risk_score,
                        "risk":
                            risk_level,
                        "blacklisted":
                            blacklisted,
                        "time":
                            serialize_datetime(
                                row.created_at
                            ),
                    }
                )
        except Exception as e:
            logger.warning(
                "Failed to load wallet alerts: %s",
                e,
            )
        # -------------------------------------------------
        # Deduplicate alerts.
        # -------------------------------------------------
        wallet_alerts = (
            deduplicate_wallet_alerts(
                wallet_alerts
            )
        )
        wallet_alerts = sorted(
            wallet_alerts,
            key=lambda item: (
                float(
                    item.get(
                        "risk_score",
                        0,
                    )
                    or 0
                ),
                item.get(
                    "time",
                    "",
                ),
            ),
            reverse=True,
        )
        wallet_alerts = (
            wallet_alerts[:6]
        )
        # =================================================
        # 7. OSINT INTELLIGENCE FEED
        #
        # Telegram + X/Twitter
        # =================================================
        osint_feed = []
        # =================================================
        # 7A. TELEGRAM
        # =================================================
        try:
            result = db.execute(
                text(
                    """
                    SELECT
                        channel_id,
                        username,
                        message,
                        keywords,
                        wallet_addresses,
                        risk_score,
                        risk_level,
                        created_at
                    FROM telegram_messages
                    ORDER BY created_at DESC
                    LIMIT 30
                    """
                )
            )
            for row in result.fetchall():
                # -----------------------------------------
                # Wallet normalization
                # -----------------------------------------
                first_address, first_chain = (
                    normalize_wallet_data(
                        row.wallet_addresses
                    )
                )
                # -----------------------------------------
                # Keyword normalization
                # -----------------------------------------
                keywords = (
                    normalize_keywords(
                        row.keywords
                    )
                )
                # -----------------------------------------
                # Risk
                # -----------------------------------------
                risk_score = float(
                    row.risk_score or 0
                )
                risk_level = (
                    calculate_risk_level(
                        risk_score,
                        row.risk_level,
                    )
                )
                # -----------------------------------------
                # Source
                # -----------------------------------------
                if row.channel_id:
                    source = (
                        f"Telegram "
                        f"{row.channel_id}"
                    )
                elif row.username:
                    source = (
                        f"Telegram "
                        f"@{row.username}"
                    )
                else:
                    source = "Telegram"
                # -----------------------------------------
                # Feed item
                # -----------------------------------------
                osint_feed.append(
                    {
                        "source": source,
                        "type": "telegram",
                        "message": (
                            row.message
                            or
                            "No intelligence message available."
                        ),
                        "risk":
                            str(
                                risk_level
                            ).upper(),
                        "risk_score":
                            risk_score,
                        # IMPORTANT:
                        # Always a string or None.
                        "address":
                            first_address,
                        "chain":
                            (
                                normalize_chain(
                                    first_chain
                                )
                                if first_chain
                                else None
                            ),
                        "keywords":
                            keywords,
                        "time":
                            serialize_datetime(
                                row.created_at
                            ),
                    }
                )
        except Exception as e:
            logger.warning(
                "Failed to load Telegram OSINT: %s",
                e,
            )
        # =================================================
        # 7B. X / TWITTER
        # =================================================
        try:
            result = db.execute(
                text(
                    """
                    SELECT
                        tweet_id,
                        author,
                        text,
                        media_url,
                        risk,
                        wallet_count,
                        created_at
                    FROM tweets
                    ORDER BY created_at DESC
                    LIMIT 30
                    """
                )
            )
            for row in result.fetchall():
                risk = str(
                    row.risk
                    or "MEDIUM"
                ).upper()
                # -----------------------------------------
                # Risk score
                # -----------------------------------------
                if risk == "CRITICAL":
                    risk_score = 90
                elif risk == "HIGH":
                    risk_score = 75
                elif risk == "MEDIUM":
                    risk_score = 50
                elif risk == "LOW":
                    risk_score = 20
                else:
                    risk_score = 0
                # -----------------------------------------
                # Source
                # -----------------------------------------
                if row.author:
                    source = (
                        f"@{row.author}"
                    )
                else:
                    source = "X/Twitter"
                # -----------------------------------------
                # Feed item
                # -----------------------------------------
                osint_feed.append(
                    {
                        "source": source,
                        "type": "X/Twitter",
                        "message": (
                            row.text
                            or
                            "No intelligence message available."
                        ),
                        "risk": risk,
                        "risk_score":
                            risk_score,
                        "address": None,
                        "chain": None,
                        "keywords": [],
                        "time":
                            serialize_datetime(
                                row.created_at
                            ),
                    }
                )
        except Exception as e:
            logger.warning(
                "Failed to load Twitter OSINT: %s",
                e,
            )
        # =================================================
        # 8. DEDUPLICATE + SORT OSINT FEED
        # =================================================
        osint_feed = (
            deduplicate_osint_feed(
                osint_feed
            )
        )
        osint_feed = sort_by_time(
            osint_feed
        )
        osint_feed = (
            osint_feed[:8]
        )
        # =================================================
        # 9. SYSTEM HEALTH
        # =================================================
        system = {
            "backend": "online",
            "database": "online",
            "ocr": "online",
            "graph": "sync",
        }
        # =================================================
        # 10. FINAL DASHBOARD PAYLOAD
        # =================================================
        return {
            "status": "OK",
            "updated_at":
                datetime.now(
                    timezone.utc
                ).isoformat(),
            "metrics": {
                "investigations":
                    investigations,
                "wallets":
                    wallets,
                "high_risk":
                    high_risk,
                "osint_matches":
                    osint_matches,
            },
            "investigations":
                recent_investigations,
            "wallet_alerts":
                wallet_alerts,
            "osint":
                osint_feed,
            "system":
                system,
        }
    # =====================================================
    # GLOBAL ERROR HANDLER
    # =====================================================
    except Exception as error:
        logger.exception(
            "Dashboard service error: %s",
            error,
        )
        return {
            "status": "ERROR",
            "message":
                str(error),
            "updated_at":
                datetime.now(
                    timezone.utc
                ).isoformat(),
            "metrics": {
                "investigations": 0,
                "wallets": 0,
                "high_risk": 0,
                "osint_matches": 0,
            },
            "investigations": [],
            "wallet_alerts": [],
            "osint": [],
            "system": {
                "backend": "online",
                "database": "error",
                "ocr": "offline",
                "graph": "unknown",
            },
        }
    finally:
        db.close()