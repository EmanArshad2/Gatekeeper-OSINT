from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.database.connection import get_database
from app.database.models import (
    Wallet,
    TelegramMessage,
    Extraction,
    Media,
)
from app.core.osint.service import osint_service
router = APIRouter(
    prefix="/osint",
    tags=["OSINT"],
)
# ============================================================
# Helpers
# ============================================================
def safe_iso(value):
    if value is None:
        return None
    try:
        return value.isoformat()
    except Exception:
        return str(value)
def get_attr(obj, name, default=None):
    """
    Safely read optional model attributes.
    Keeps the API compatible with different TelegramMessage
    model versions.
    """
    try:
        return getattr(obj, name, default)
    except Exception:
        return default
def normalize_keywords(value):
    """
    Normalize keyword values into a clean lowercase list.
    Handles:
        ["BTC", "USDT"]
        ["btc", "usdt"]
        None
        strings
    """
    if not value:
        return []
    if isinstance(value, str):
        value = value.split(",")
    result = []
    for item in value:
        if item is None:
            continue
        item = str(item).strip().lower()
        if item and item not in result:
            result.append(item)
    return result
def keyword_matches_post(
    post,
    selected_keywords,
    keyword_mode="any",
):
    """
    Determine whether a post matches the selected frontend
    keywords.
    Matching is performed against:
    1. Stored detected keywords
    2. Message/OCR text
    keyword_mode:
        any -> at least one selected keyword matches
        all -> every selected keyword must match
    """
    if not selected_keywords:
        return True, []
    selected_keywords = normalize_keywords(
        selected_keywords
    )
    stored_keywords = normalize_keywords(
        post.get("keywords", [])
    )
    text = (
        post.get("raw_text")
        or post.get("text")
        or ""
    ).lower()
    searchable_text = (
        text
        + " "
        + " ".join(stored_keywords)
    ).lower()
    matched_keywords = []
    for keyword in selected_keywords:
        if keyword in searchable_text:
            matched_keywords.append(keyword)
    if keyword_mode == "all":
        matched = (
            len(matched_keywords)
            == len(selected_keywords)
        )
    else:
        # Default = ANY
        matched = len(matched_keywords) > 0
    return matched, matched_keywords
def normalize_wallets(
    db: Session,
    wallet_addresses,
):
    """
    Convert Telegram wallet_addresses into the unified
    frontend wallet format.
    """
    wallets = []
    for entry in wallet_addresses or []:
        if isinstance(entry, dict):
            address = entry.get("address")
            detected_chain = entry.get("chain")
        else:
            address = entry
            detected_chain = None
        if not address:
            continue
        wallet_row = (
            db.query(Wallet)
            .filter(
                Wallet.address == address
            )
            .first()
        )
        wallets.append(
            {
                "address": address,
                "chain": (
                    wallet_row.chain
                    if wallet_row
                    else detected_chain
                ),
                "risk_score": (
                    wallet_row.risk_score
                    if wallet_row
                    else 0
                ),
                "risk_level": (
                    wallet_row.risk_level
                    if wallet_row
                    else "LOW"
                ),
                "ocr_corrected": (
                    wallet_row.ocr_corrected
                    if wallet_row
                    else False
                ),
            }
        )
    return wallets
def telegram_source_url(
    username,
    message_id,
):
    """
    Generate a public Telegram message URL.
    """
    if not username or not message_id:
        return None
    username = str(username).lstrip("@")
    return (
        f"https://t.me/"
        f"{username}/"
        f"{message_id}"
    )
def telegram_post(
    db: Session,
    msg: TelegramMessage,
):
    """
    Convert one TelegramMessage DB row into the unified
    frontend OSINT post structure.
    """
    username = (
        get_attr(
            msg,
            "channel_username",
        )
        or get_attr(
            msg,
            "telegram_username",
        )
        or get_attr(
            msg,
            "username",
        )
    )
    channel_title = (
        get_attr(
            msg,
            "channel_title",
        )
        or get_attr(
            msg,
            "title",
        )
    )
    channel_id = get_attr(
        msg,
        "channel_id",
    )
    message_id = (
        get_attr(
            msg,
            "message_id",
        )
        or get_attr(
            msg,
            "telegram_message_id",
        )
        or get_attr(
            msg,
            "id",
        )
    )
    sender_name = (
        get_attr(
            msg,
            "sender_name",
        )
        or get_attr(
            msg,
            "author",
        )
        or get_attr(
            msg,
            "username",
        )
    )
    message_text = (
        get_attr(
            msg,
            "message",
        )
        or get_attr(
            msg,
            "text",
        )
        or ""
    )
    keywords = normalize_keywords(
        get_attr(
            msg,
            "keywords",
        )
        or []
    )
    wallet_addresses = (
        get_attr(
            msg,
            "wallet_addresses",
        )
        or []
    )
    wallets = normalize_wallets(
        db,
        wallet_addresses,
    )
    risk_score = (
        get_attr(
            msg,
            "risk_score",
        )
        or 0
    )
    risk_level = (
        get_attr(
            msg,
            "risk_level",
        )
        or (
            "HIGH"
            if risk_score >= 50
            else "MEDIUM"
            if risk_score >= 25
            else "LOW"
        )
    )
    media_present = bool(
        get_attr(
            msg,
            "media",
        )
        or get_attr(
            msg,
            "has_media",
        )
        or get_attr(
            msg,
            "media_type",
        )
    )
    source_url = (
        get_attr(
            msg,
            "source_url",
        )
        or telegram_source_url(
            username,
            message_id,
        )
    )
    created_at = get_attr(
        msg,
        "created_at",
    )
    original_timestamp = (
        get_attr(
            msg,
            "message_date",
        )
        or get_attr(
            msg,
            "telegram_timestamp",
        )
        or created_at
    )
    return {
        # ----------------------------------------------------
        # Core identity
        # ----------------------------------------------------
        "id": f"telegram-{msg.id}",
        "source_type": "telegram",
        "source": "Telegram",
        "type": "telegram",
        # ----------------------------------------------------
        # Source information
        # ----------------------------------------------------
        "author": sender_name,
        "channel_title": channel_title,
        "channel_username": (
            f"@{username}"
            if username
            and not str(
                username
            ).startswith("@")
            else username
        ),
        "channel_id": channel_id,
        "message_id": message_id,
        # ----------------------------------------------------
        # Public source
        # ----------------------------------------------------
        "is_public": bool(username),
        "source_url": source_url,
        "platform": "telegram",
        # ----------------------------------------------------
        # Time
        # ----------------------------------------------------
        "original_timestamp": safe_iso(
            original_timestamp
        ),
        "created_at": safe_iso(
            created_at
        ),
        # ----------------------------------------------------
        # Content
        # ----------------------------------------------------
        "raw_text": message_text,
        "text": message_text,
        # ----------------------------------------------------
        # Media
        # ----------------------------------------------------
        "has_media": media_present,
        "media_type": get_attr(
            msg,
            "media_type",
        ),
        "media_urls": (
            get_attr(
                msg,
                "media_urls",
            )
            or []
        ),
        # ----------------------------------------------------
        # Intelligence
        # ----------------------------------------------------
        "keywords": keywords,
        "wallets": wallets,
        "wallet_addresses": [
            wallet["address"]
            for wallet in wallets
        ],
        "wallet_count": len(
            wallets
        ),
        # ----------------------------------------------------
        # Risk
        # ----------------------------------------------------
        "risk_score": risk_score,
        "risk_level": risk_level,
        # ----------------------------------------------------
        # Frontend metadata
        # ----------------------------------------------------
        "metadata": {
            "channel_title": channel_title,
            "channel_username": username,
            "channel_id": channel_id,
            "message_id": message_id,
            "has_media": media_present,
            "is_public": bool(username),
        },
    }
# ============================================================
# Unified OSINT Intelligence Feed
# ============================================================
@router.get("/feed")
def osint_feed(
    db: Session = Depends(
        get_database
    ),
):
    events = []
    wallets = []
    # ========================================================
    # Wallet Intelligence
    # ========================================================
    wallet_records = (
        db.query(Wallet)
        .order_by(
            Wallet.created_at.desc()
        )
        .limit(50)
        .all()
    )
    for wallet in wallet_records:
        try:
            intel = osint_service.lookup(
                {
                    "address":
                        wallet.address,
                    "chain":
                        wallet.chain,
                    "risk_score":
                        wallet.risk_score or 0,
                    "risk_level":
                        wallet.risk_level
                        or "LOW",
                }
            )
            wallet_data = {
                "address":
                    wallet.address,
                "chain":
                    wallet.chain,
                "risk_score":
                    wallet.risk_score or 0,
                "risk_level":
                    wallet.risk_level
                    or "LOW",
                "entity_type":
                    "wallet",
                "organization":
                    None,
                "country":
                    None,
                "tags":
                    [],
                "labels":
                    wallet.labels or [],
                "sources":
                    ["Blockchain"],
                "balance":
                    wallet.balance or 0,
                "tx_count":
                    (
                        len(
                            wallet.transactions
                        )
                        if wallet.transactions
                        else 0
                    ),
            }
            wallet_data.update(
                intel
            )
            wallets.append(
                wallet_data
            )
            events.append(
                {
                    "source":
                        "Blockchain",
                    "type":
                        "wallet",
                    "title":
                        "Wallet Intelligence Update",
                    "message": (
                        f"{wallet.address[:12]}..."
                        f" detected on "
                        f"{wallet.chain}"
                    ),
                    "risk_score":
                        wallet.risk_score or 0,
                    "risk_level":
                        wallet.risk_level
                        or "LOW",
                    "time":
                        safe_iso(
                            wallet.created_at
                        ),
                }
            )
        except Exception as error:
            print(
                "Wallet OSINT Error:",
                error,
            )
    # ========================================================
    # Telegram Intelligence
    # ========================================================
    telegram_messages = (
        db.query(TelegramMessage)
        .order_by(
            TelegramMessage.created_at.desc()
        )
        .limit(100)
        .all()
    )
    for telegram in telegram_messages:
        post = telegram_post(
            db,
            telegram,
        )
        events.append(
            {
                "source":
                    "Telegram",
                "type":
                    "telegram",
                "title":
                    "Telegram OSINT Detection",
                "message":
                    post["raw_text"],
                "keywords":
                    post["keywords"],
                "wallet_addresses":
                    post[
                        "wallet_addresses"
                    ],
                "risk_score":
                    post["risk_score"],
                "risk_level":
                    post["risk_level"],
                "time":
                    post[
                        "original_timestamp"
                    ],
                "source_url":
                    post["source_url"],
                "channel_title":
                    post["channel_title"],
                "channel_username":
                    post[
                        "channel_username"
                    ],
                "message_id":
                    post["message_id"],
            }
        )
    # ========================================================
    # Sort latest first
    # ========================================================
    events.sort(
        key=lambda item:
            item.get("time") or "",
        reverse=True,
    )
    return {
        "status":
            "SUCCESS",
        "count":
            len(events),
        "wallets":
            wallets,
        "events":
            events,
    }
# ============================================================
# Unified OSINT Post Feed
#
# Frontend keyword filtering:
#
# /osint/posts?keywords=btc,usdt
#
# /osint/posts?keywords=btc,usdt&keyword_mode=any
#
# /osint/posts?keywords=btc,usdt&keyword_mode=all
#
# ============================================================
@router.get("/posts")
def osint_posts(
    source_type: str = Query(
        None,
        description=(
            "Filter by source: "
            "telegram, website, twitter, upload"
        ),
    ),
    keywords: str = Query(
        None,
        description=(
            "Comma-separated keywords selected "
            "from the frontend"
        ),
    ),
    keyword_mode: str = Query(
        "any",
        description=(
            "Keyword matching mode: "
            "any or all"
        ),
    ),
    risk_min: float = Query(
        0,
        ge=0,
        le=100,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        0,
        ge=0,
    ),
    db: Session = Depends(
        get_database
    ),
):
    # ========================================================
    # Normalize frontend keyword selection
    # ========================================================
    selected_keywords = []
    if keywords:
        selected_keywords = [
            keyword.strip().lower()
            for keyword
            in keywords.split(",")
            if keyword.strip()
        ]
    # Remove duplicates while preserving order
    selected_keywords = list(
        dict.fromkeys(
            selected_keywords
        )
    )
    # Validate mode
    keyword_mode = (
        keyword_mode or "any"
    ).lower()
    if keyword_mode not in (
        "any",
        "all",
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "keyword_mode must be "
                "'any' or 'all'"
            ),
        )
    posts = []
    # ========================================================
    # TELEGRAM
    # ========================================================
    if (
        source_type is None
        or source_type == "telegram"
    ):
        telegram_messages = (
            db.query(
                TelegramMessage
            )
            .order_by(
                TelegramMessage.created_at.desc()
            )
            .limit(500)
            .all()
        )
        for msg in telegram_messages:
            try:
                post = telegram_post(
                    db,
                    msg,
                )
                # --------------------------------------------
                # Keyword filtering
                # --------------------------------------------
                matches, matched_keywords = (
                    keyword_matches_post(
                        post,
                        selected_keywords,
                        keyword_mode,
                    )
                )
                if not matches:
                    continue
                post[
                    "matched_keywords"
                ] = matched_keywords
                posts.append(
                    post
                )
            except Exception as error:
                print(
                    "Telegram post formatting error:",
                    error,
                )
    # ========================================================
    # WEBSITE / TWITTER / UPLOAD
    # ========================================================
    if source_type in (
        None,
        "website",
        "twitter",
        "upload",
    ):
        query = (
            db.query(
                Extraction,
                Media,
            )
            .join(
                Media,
                Extraction.media_id
                == Media.id,
            )
        )
        if source_type:
            query = query.filter(
                Media.source_type
                == source_type
            )
        else:
            query = query.filter(
                Media.source_type.in_(
                    [
                        "website",
                        "twitter",
                        "upload",
                    ]
                )
            )
        rows = (
            query
            .order_by(
                Extraction.created_at.desc()
            )
            .limit(500)
            .all()
        )
        for extraction, media in rows:
            wallet_rows = (
                db.query(Wallet)
                .filter(
                    Wallet.extraction_id
                    == extraction.id
                )
                .all()
            )
            wallets = [
                {
                    "address":
                        wallet.address,
                    "chain":
                        wallet.chain,
                    "risk_score":
                        wallet.risk_score or 0,
                    "risk_level":
                        wallet.risk_level
                        or "LOW",
                    "ocr_corrected":
                        wallet.ocr_corrected
                        or False,
                }
                for wallet in wallet_rows
            ]
            risk_score = (
                extraction.highest_risk
                or 0
            )
            risk_level = (
                "HIGH"
                if risk_score >= 50
                else "MEDIUM"
                if risk_score >= 25
                else "LOW"
            )
            ocr_text = (
                extraction.ocr_text
                or ""
            )
            post = {
                "id":
                    f"extraction-{extraction.id}",
                "source_type":
                    media.source_type
                    or "upload",
                "source":
                    media.source_type
                    or "upload",
                "type":
                    media.source_type
                    or "upload",
                "author":
                    media.filename,
                "channel_title":
                    None,
                "channel_username":
                    None,
                "channel_id":
                    None,
                "message_id":
                    None,
                "is_public":
                    bool(
                        media.source_url
                    ),
                "platform":
                    media.source_type
                    or "upload",
                "original_timestamp":
                    safe_iso(
                        extraction.created_at
                    ),
                "created_at":
                    safe_iso(
                        extraction.created_at
                    ),
                "raw_text":
                    ocr_text,
                "text":
                    ocr_text,
                "media_urls":
                    [],
                "source_url":
                    media.source_url,
                "has_media":
                    True,
                "media_type":
                    None,
                "wallets":
                    wallets,
                "wallet_addresses": [
                    wallet["address"]
                    for wallet in wallets
                ],
                "wallet_count":
                    len(wallets),
                "risk_score":
                    risk_score,
                "risk_level":
                    risk_level,
                "keywords":
                    [],
                "page_count":
                    extraction.page_count,
                "metadata": {
                    "filename":
                        media.filename,
                    "source_url":
                        media.source_url,
                    "page_count":
                        extraction.page_count,
                },
            }
            # --------------------------------------------
            # Keyword filtering
            # --------------------------------------------
            matches, matched_keywords = (
                keyword_matches_post(
                    post,
                    selected_keywords,
                    keyword_mode,
                )
            )
            if not matches:
                continue
            post[
                "matched_keywords"
            ] = matched_keywords
            posts.append(
                post
            )
    # ========================================================
    # Risk Filter
    # ========================================================
    posts = [
        post
        for post in posts
        if (
            post.get(
                "risk_score"
            )
            or 0
        ) >= risk_min
    ]
    # ========================================================
    # Latest First
    # ========================================================
    posts.sort(
        key=lambda post:
            post.get(
                "original_timestamp"
            )
            or "",
        reverse=True,
    )
    # ========================================================
    # Pagination
    # ========================================================
    total = len(posts)
    page = posts[
        offset:
        offset + limit
    ]
    return {
        "status":
            "SUCCESS",
        "total":
            total,
        "count":
            len(page),
        "offset":
            offset,
        "limit":
            limit,
        "has_more":
            offset + limit < total,
        # Tell frontend what filter is active
        "filters": {
            "source_type":
                source_type,
            "keywords":
                selected_keywords,
            "keyword_mode":
                keyword_mode,
            "risk_min":
                risk_min,
        },
        "posts":
            page,
    }
# ============================================================
# Single Wallet OSINT Lookup
# ============================================================
@router.get("/{address}")
def wallet_osint(
    address: str,
    db: Session = Depends(
        get_database
    ),
):
    wallet = (
        db.query(Wallet)
        .filter(
            Wallet.address
            == address
        )
        .first()
    )
    if wallet is None:
        raise HTTPException(
            status_code=404,
            detail="Wallet not found",
        )
    return osint_service.lookup(
        {
            "address":
                wallet.address,
            "chain":
                wallet.chain,
            "risk_score":
                wallet.risk_score
                or 0,
            "risk_level":
                wallet.risk_level
                or "LOW",
        }
    )