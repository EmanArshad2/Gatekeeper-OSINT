import logging
from datetime import datetime, timezone
from app.core.correlation.parser import context_parser
logger = logging.getLogger(__name__)
class CorrelationEngine:
    def correlate(
        self,
        text,
        wallets
    ):
        try:
            entities = context_parser.parse(
                text
            )
            telegram_users = entities.get(
                "telegram_users",
                []
            )
            emails = entities.get(
                "emails",
                []
            )
            websites = entities.get(
                "websites",
                []
            )
            phones = entities.get(
                "phones",
                []
            )
            correlations = []
            #
            # Wallet -> Entity relationships
            #
            for wallet in wallets:
                wallet_address = wallet.get(
                    "address"
                )
                confidence = 0
                linked_entities = []
                if telegram_users:
                    confidence += 20
                    linked_entities.extend(
                        telegram_users
                    )
                if emails:
                    confidence += 20
                    linked_entities.extend(
                        emails
                    )
                if websites:
                    confidence += 15
                    linked_entities.extend(
                        websites
                    )
                if phones:
                    confidence += 15
                    linked_entities.extend(
                        phones
                    )
                if linked_entities:
                    correlations.append(
                        {
                            "wallet":
                                wallet_address,
                            "entities":
                                linked_entities,
                            "confidence":
                                min(
                                    confidence,
                                    100
                                ),
                            "relationship":
                                "wallet_entity_link"
                        }
                    )
            #
            # Suspicion scoring
            #
            risk_flags = []
            if wallets and telegram_users:
                risk_flags.append(
                    "WALLET_TELEGRAM_ASSOCIATION"
                )
            if wallets and emails:
                risk_flags.append(
                    "WALLET_EMAIL_ASSOCIATION"
                )
            if websites and wallets:
                risk_flags.append(
                    "WALLET_DOMAIN_ASSOCIATION"
                )
            result = {
                "wallets":
                    wallets,
                "telegram_users":
                    telegram_users,
                "emails":
                    emails,
                "websites":
                    websites,
                "phones":
                    phones,
                "correlations":
                    correlations,
                "risk_flags":
                    risk_flags,
                "entity_count":
                    len(
                        telegram_users
                        +
                        emails
                        +
                        websites
                        +
                        phones
                    ),
                "generated_at":
                    datetime.now(
                        timezone.utc
                    ).isoformat()
            }
            logger.info(
                "Correlation completed: %s entities, %s wallets",
                result["entity_count"],
                len(wallets)
            )
            return result
        except Exception as e:
            logger.exception(
                "Correlation engine failed: %s",
                e
            )
            return {
                "wallets":
                    wallets,
                "telegram_users": [],
                "emails": [],
                "websites": [],
                "phones": [],
                "correlations": [],
                "risk_flags": [],
                "entity_count": 0
            }
correlation_engine = CorrelationEngine()