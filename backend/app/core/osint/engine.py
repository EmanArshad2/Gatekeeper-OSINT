import logging
from app.core.osint.providers import intelligence_provider
logger = logging.getLogger(__name__)
class OSINTEngine:
    def enrich(
        self,
        wallet
    ):
        try:
            intelligence = intelligence_provider.lookup_wallet(
                wallet
            )
            # Defensive .get() access with sensible defaults everywhere —
            # lookup_wallet()'s return schema shouldn't be able to crash
            # this pipeline stage just because a key is missing/renamed.
            wallet["entity_type"] = intelligence.get(
                "entity_type", "Wallet"
            )
            wallet["organization"] = intelligence.get("organization")
            wallet["country"] = intelligence.get("country")
            wallet["tags"] = intelligence.get("tags", [])
            # "labels" was being computed by the provider but previously
            # discarded here — now surfaced on the wallet too.
            wallet["labels"] = intelligence.get("labels", [])
            # The provider doesn't currently produce a dedicated "threats"
            # list — fall back to "labels" (which already carries
            # threat/behavior tags for known addresses) so investigators
            # still see something meaningful instead of nothing.
            wallet["threats"] = intelligence.get(
                "threats", intelligence.get("labels", [])
            )
            wallet["sources"] = intelligence.get("sources", [])
            wallet["osint_confidence"] = intelligence.get("confidence", 0)
            return wallet
        except Exception as e:
            logger.exception(
                "OSINT enrichment failed: %s",
                e
            )
            return wallet
osint_engine = OSINTEngine()